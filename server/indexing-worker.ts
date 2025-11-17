import { storage } from "./storage";
import { crawlWebsite, crawlMultipleWebsitesRecursive, calculateContentHash, normalizeUrl } from "./crawler";
import { chunkContent } from "./chunker";
import { embeddingService } from "./embedding";
import type { InsertKnowledgeChunk } from "@shared/schema";
import { db } from "./db";
import { urlCrawlMetadata, indexingJobs, indexingTasks, knowledgeChunks, scrapedImages } from "@shared/schema";
import { eq } from "drizzle-orm";
import { GoogleGenAI } from "@google/genai";
import { PerformanceMonitor, getEnvironmentConfig } from "./performance-monitor";

const POLL_INTERVAL_MS = 3000; // Check for new jobs every 3 seconds
const MAX_RETRY_COUNT = 3;
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000; // Log heartbeat every 5 minutes
const JOB_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes max per job
const CANCELLATION_CHECK_INTERVAL_MS = 5000; // Check for cancellation every 5 seconds

let isWorkerRunning = false;
let lastHeartbeat = Date.now();
let heartbeatInterval: NodeJS.Timeout | null = null;
let totalJobsProcessed = 0;
let lastJobsProcessed = 0; // Track last count to detect activity

// In-memory map of cancelled jobs for immediate notification
const cancelledJobs = new Map<string, boolean>();

// Custom error for job cancellation
class CancelledError extends Error {
  constructor(jobId: string) {
    super(`Job ${jobId} was cancelled`);
    this.name = 'CancelledError';
  }
}

// Monitors job cancellation status with cached checks to reduce DB load
class CancellationMonitor {
  private jobId: string;
  private lastCheck: number = 0;
  private isCancelled: boolean = false;
  private checkInterval: number;
  
  constructor(jobId: string, checkInterval: number = CANCELLATION_CHECK_INTERVAL_MS) {
    this.jobId = jobId;
    this.checkInterval = checkInterval;
  }
  
  // Check if job has been cancelled (with throttling to reduce DB queries)
  async check(): Promise<void> {
    const now = Date.now();
    
    // First check in-memory flag for immediate notification
    if (cancelledJobs.has(this.jobId)) {
      console.log(`[WORKER] Job ${this.jobId} cancelled (in-memory flag detected)`);
      this.isCancelled = true;
      throw new CancelledError(this.jobId);
    }
    
    // Throttle database checks
    if (now - this.lastCheck < this.checkInterval) {
      if (this.isCancelled) {
        throw new CancelledError(this.jobId);
      }
      return;
    }
    
    // Check database for cancellation
    this.lastCheck = now;
    const job = await storage.getIndexingJob(this.jobId);
    
    if (job?.status === "cancelled") {
      console.log(`[WORKER] Job ${this.jobId} cancelled (database status detected)`);
      this.isCancelled = true;
      throw new CancelledError(this.jobId);
    }
  }
  
  // Get AbortSignal for integration with APIs that support it
  getAbortSignal(): AbortSignal {
    const controller = new AbortController();
    
    // Check for cancellation and abort if needed
    const checkCancellation = async () => {
      try {
        await this.check();
      } catch (error) {
        if (error instanceof CancelledError) {
          controller.abort(error.message);
        }
      }
    };
    
    // Start periodic checking
    const intervalId = setInterval(checkCancellation, this.checkInterval);
    
    // Clean up interval when aborted
    controller.signal.addEventListener('abort', () => {
      clearInterval(intervalId);
    });
    
    return controller.signal;
  }
}

// Health check for Playwright/Chromium availability
async function checkPlaywrightHealth(): Promise<{ available: boolean; error?: string }> {
  try {
    const { chromium } = await import('playwright');
    const { execSync } = await import('child_process');
    
    console.log('[WORKER-HEALTH] Testing Playwright/Chromium availability...');
    console.log('[WORKER-HEALTH] Environment:', process.env.NODE_ENV);
    console.log('[WORKER-HEALTH] Default Chromium path:', chromium.executablePath());
    
    // Check for system Chromium (Nix/system installation)
    let systemChromium: string | null = null;
    try {
      systemChromium = execSync('which chromium-browser || which chromium', { encoding: 'utf8' }).trim();
      if (systemChromium) {
        console.log('[WORKER-HEALTH] ✓ System Chromium found:', systemChromium);
      }
    } catch {
      console.log('[WORKER-HEALTH] System Chromium not found in PATH');
    }
    
    // Use system Chromium in production if available, otherwise use Playwright's bundled version
    const executablePath = (process.env.NODE_ENV === 'production' && systemChromium) 
      ? systemChromium 
      : undefined;
    
    if (executablePath) {
      console.log('[WORKER-HEALTH] Testing with system Chromium:', executablePath);
    } else {
      console.log('[WORKER-HEALTH] Testing with Playwright Chromium');
    }
    
    // Try to launch browser for real health check
    const browser = await chromium.launch({
      executablePath: executablePath || undefined,
      headless: true,
      timeout: 10000,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
    const version = await browser.version();
    console.log('[WORKER-HEALTH] ✓ Chromium version:', version);
    await browser.close();
    
    console.log('[WORKER-HEALTH] ✓ Playwright/Chromium is operational');
    return { available: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[WORKER-HEALTH] ✗ Playwright/Chromium FAILED:', errorMsg);
    return { available: false, error: errorMsg };
  }
}

// Worker heartbeat logging - only log if there's activity
function logHeartbeat(): void {
  // Only log if jobs were processed since last heartbeat
  if (totalJobsProcessed > lastJobsProcessed) {
    const uptime = Math.floor((Date.now() - lastHeartbeat) / 1000);
    const jobsSinceLastHeartbeat = totalJobsProcessed - lastJobsProcessed;
    console.log(`[WORKER-HEARTBEAT] Processed ${jobsSinceLastHeartbeat} job(s) | Total: ${totalJobsProcessed} | Uptime: ${uptime}s`);
    lastJobsProcessed = totalJobsProcessed;
  }
  // Silent when idle - no console spam
}

// Generate suggested questions using Gemini
async function generateSuggestedQuestions(chatbotId: string, geminiModel: string): Promise<string[]> {
  try {
    console.log(`[WORKER] Generating suggested questions for chatbot ${chatbotId}...`);
    
    // Get a larger sample of knowledge chunks to ensure comprehensive coverage
    // Sample up to 100 chunks from all indexed data for better diversity
    // Only select needed columns to avoid fetching massive embedding vectors
    const chunks = await db
      .select({
        chunkText: knowledgeChunks.chunkText,
        sourceTitle: knowledgeChunks.sourceTitle
      })
      .from(knowledgeChunks)
      .where(eq(knowledgeChunks.chatbotId, chatbotId))
      .limit(100);
    
    if (chunks.length === 0) {
      console.log(`[WORKER] No knowledge chunks available for chatbot ${chatbotId}, skipping question generation`);
      return [];
    }
    
    console.log(`[WORKER] Using ${chunks.length} knowledge chunks for question generation`);
    
    // Build a comprehensive summary of the content
    // Use more content (8000 chars) to generate better questions
    const contentSummary = chunks
      .map(chunk => chunk.chunkText)
      .join('\n\n')
      .substring(0, 8000);
    
    // Get source titles for context
    const sourceTitles = Array.from(new Set(chunks.map(chunk => chunk.sourceTitle).filter(Boolean)));
    
    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
    
    const prompt = `You are helping create suggested questions for a customer support chatbot based on website content.

Website Content Overview:
Sources: ${sourceTitles.length > 0 ? sourceTitles.join(', ') : 'Various pages'}
Total content chunks analyzed: ${chunks.length}

Content Sample:
${contentSummary}

Generate EXACTLY 20 frequently asked questions (FAQ-style) that visitors to this website might ask about the content, products, or services described above.

Requirements:
- Generate EXACTLY 20 questions
- Each question should be under 90 characters
- Questions should be diverse, covering different topics and intents from ALL the content
- Use natural, conversational language
- Avoid duplicates or very similar questions
- Do NOT generate follow-up questions - these should be standalone FAQs
- Focus on what customers would actually want to know
- Cover a broad range of topics from the content (don't focus on just one area)

Return ONLY a valid JSON array of EXACTLY 20 question strings, nothing else. Example format:
["Question 1?", "Question 2?", ..., "Question 20?"]`;

    console.log(`[LLM] ========== SUGGESTED QUESTIONS GENERATION (INDEXING) ==========`);
    console.log(`[LLM] Model: ${geminiModel}`);
    console.log(`[LLM] Chatbot ID: ${chatbotId}`);
    console.log(`[LLM] Prompt length: ${prompt.length} chars`);
    console.log(`[LLM] Prompt preview: ${prompt.substring(0, 500)}...`);
    
    const llmStart = Date.now();
    const result = await genAI.models.generateContent({
      model: geminiModel,
      contents: prompt,
    });
    const llmTime = Date.now() - llmStart;
    
    const responseText = result.text?.trim() || "";
    console.log(`[LLM] Generation complete in ${llmTime}ms`);
    console.log(`[LLM] Response length: ${responseText.length} chars`);
    console.log(`[LLM] Response preview: ${responseText.substring(0, 300)}...`);
    console.log(`[LLM] ========================================`);
    
    // Parse JSON response
    let questions: string[] = [];
    try {
      // Try to extract JSON array from response (in case it's wrapped in markdown)
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        questions = JSON.parse(responseText);
      }
      
      // Validate and filter questions
      questions = questions
        .filter(q => typeof q === 'string' && q.length > 0 && q.length <= 90)
        .slice(0, 20); // Limit to max 20 questions
        
      console.log(`[WORKER] Generated ${questions.length} suggested questions for chatbot ${chatbotId}`);
      return questions;
      
    } catch (parseError) {
      console.error(`[WORKER] Failed to parse Gemini response as JSON:`, parseError);
      console.error(`[WORKER] Raw response:`, responseText);
      return [];
    }
    
  } catch (error) {
    console.error(`[WORKER] Error generating suggested questions for chatbot ${chatbotId}:`, error);
    return [];
  }
}

// Process a single indexing task (URL or document)
async function processIndexingTask(taskId: string, jobId: string, chatbotId: string, sourceType: string, sourceUrl: string, monitor?: CancellationMonitor): Promise<void> {
  const perfMonitor = new PerformanceMonitor(jobId);
  const config = getEnvironmentConfig();
  
  console.log(`[WORKER] Processing task ${taskId}: ${sourceType} - ${sourceUrl}`);
  console.log(`[WORKER] Environment config:`, JSON.stringify(config, null, 2));
  
  perfMonitor.start('task-total', { taskId, sourceType, sourceUrl });
  
  try {
    await storage.updateIndexingTaskStatus(taskId, "processing");
    
    // Checkpoint: Check for cancellation before starting
    if (monitor) {
      await monitor.check();
    }
    
    let content = "";
    let title = "";
    
    if (sourceType === "website") {
      // Recursively crawl the website with environment-specific limits
      perfMonitor.start('crawling', { maxDepth: config.crawling.maxDepth, maxPages: config.crawling.maxPages });
      console.log(`[WORKER] Recursively crawling website: ${sourceUrl} (max depth: ${config.crawling.maxDepth}, max pages: ${config.crawling.maxPages})`);
      const crawlResults = await crawlMultipleWebsitesRecursive([sourceUrl], {
        maxDepth: config.crawling.maxDepth,
        maxPages: config.crawling.maxPages,
        sameDomainOnly: true,
      });
      perfMonitor.end('crawling', { pagesFound: crawlResults.length });
      
      // crawlResults is an array of crawled pages
      console.log(`[WORKER] Crawled ${crawlResults.length} pages from ${sourceUrl}`);
      
      // Checkpoint: Check for cancellation after crawling
      if (monitor) {
        await monitor.check();
      }
      
      if (crawlResults.length === 0) {
        throw new Error("No pages could be crawled from the website");
      }
      
      // Filter valid pages
      const validPages = crawlResults.filter((page: any) => page.content && !page.error);
      
      if (validPages.length === 0) {
        throw new Error("All crawled pages were empty or had errors");
      }
      
      // Calculate total content size for storage limit checking
      const totalContent = validPages.map((page: any) => page.content).join('\n\n');
      const contentSizeMB = Buffer.byteLength(totalContent, 'utf8') / (1024 * 1024);
      
      // Atomically check and update knowledge base size
      const chatbot = await storage.getChatbotById(chatbotId);
      if (chatbot) {
        const user = await storage.getUser(chatbot.userId);
        if (user && user.isAdmin !== "true") {
          const { TIER_LIMITS } = await import("@shared/pricing");
          const tier = user.subscriptionTier;
          const limits = TIER_LIMITS[tier];
          
          // Use atomic check-and-update to prevent race conditions
          const sizeCheckResult = await storage.atomicCheckAndUpdateKnowledgeBaseSize(
            chatbot.userId,
            contentSizeMB,
            limits.knowledgeBaseSizeMB
          );
          
          if (!sizeCheckResult.success) {
            throw new Error(`Storage limit exceeded: ${tier} tier allows ${limits.knowledgeBaseSizeMB}MB, currently using ${sizeCheckResult.currentSizeMB.toFixed(2)}MB`);
          }
          
          console.log(`[WORKER] Knowledge base size updated: ${sizeCheckResult.currentSizeMB.toFixed(2)}MB`);
        }
      }
      
      // Store crawl metadata for future refresh
      const normalizedUrl = normalizeUrl(sourceUrl);
      const totalContentHash = calculateContentHash(totalContent);
      
      try {
        await db.insert(urlCrawlMetadata).values({
          chatbotId,
          url: normalizedUrl,
          contentHash: totalContentHash,
          lastCrawledAt: new Date(),
        });
        console.log(`[WORKER] Stored crawl metadata for ${normalizedUrl}`);
      } catch (metaError) {
        console.error(`[WORKER] Failed to store crawl metadata:`, metaError);
        // Don't fail the task if metadata storage fails
      }
      
      // Process images from crawled pages
      perfMonitor.start('image-processing');
      const allImages: any[] = [];
      let totalImages = 0;
      
      for (const page of validPages) {
        if (page.images && page.images.length > 0) {
          console.log(`[WORKER] Found ${page.images.length} images on ${page.url}`);
          
          for (const img of page.images) {
            // Generate embedding from alt text and caption combined
            const imageText = [img.altText, img.caption].filter(Boolean).join(' ');
            let embedding = null;
            
            if (imageText) {
              try {
                embedding = await embeddingService.generateEmbedding(imageText);
              } catch (embError) {
                console.error(`[WORKER] Failed to generate embedding for image:`, embError);
              }
            }
            
            allImages.push({
              chatbotId,
              sourceUrl: page.url,
              imageUrl: img.url,
              altText: img.altText,
              caption: img.caption,
              embedding,
              metadata: {
                pageTitle: page.title,
              },
            });
            totalImages++;
          }
        }
      }
      
      // Store images in database
      if (allImages.length > 0) {
        try {
          await db.insert(scrapedImages).values(allImages);
          console.log(`[WORKER] ✓ Stored ${allImages.length} images from ${validPages.length} pages`);
        } catch (imgError) {
          console.error(`[WORKER] Failed to store images:`, imgError);
          // Don't fail the task if image storage fails
        }
      }
      perfMonitor.end('image-processing', { totalImages });
      
      // Process each page individually to preserve specific URLs
      // We'll collect all chunks first, then store them together
      perfMonitor.start('chunking-and-embedding', { totalPages: validPages.length });
      const allChunksWithEmbeddings: InsertKnowledgeChunk[] = [];
      let totalChunks = 0;
      let totalEmbeddings = 0;
      
      for (const page of validPages) {
        const pageContent = page.content;
        const pageUrl = page.url;
        const pageTitle = page.title || pageUrl;
        
        console.log(`[WORKER] Processing page: ${pageUrl} (${pageContent.length} chars)`);
        
        // Checkpoint: Check for cancellation per page
        if (monitor) {
          await monitor.check();
        }
        
        // Chunk this page's content
        perfMonitor.start('chunk-single-page');
        const pageChunks = chunkContent(pageContent, { title: pageTitle });
        perfMonitor.end('chunk-single-page', { chunks: pageChunks.length, url: pageUrl });
        totalChunks += pageChunks.length;
        console.log(`[WORKER] Generated ${pageChunks.length} chunks for ${pageUrl}`);
        
        // Generate embeddings for this page's chunks with TRUE concurrency limiting
        perfMonitor.start('embed-page-chunks');
        
        // Process chunks with actual concurrency control
        // Don't create all promises upfront - only create them when ready to process
        for (let i = 0; i < pageChunks.length; i += config.embedding.concurrency) {
          // Take a small batch based on concurrency limit
          const concurrentBatch = pageChunks.slice(i, i + config.embedding.concurrency);
          
          // Checkpoint: Check for cancellation per batch
          if (monitor) {
            await monitor.check();
          }
          
          // Now create and execute promises for this batch ONLY
          // This ensures we only have N concurrent embedding API calls at a time
          const batchResults = await Promise.all(
            concurrentBatch.map(async (chunk) => {
              try {
                const embedding = await embeddingService.generateEmbedding(chunk.text);
                totalEmbeddings++;
                return {
                  chatbotId,
                  sourceType: "website" as const,
                  sourceUrl: pageUrl,
                  sourceTitle: pageTitle,
                  chunkText: chunk.text,
                  chunkIndex: chunk.index.toString(),
                  contentHash: chunk.contentHash,
                  embedding,
                  metadata: chunk.metadata,
                };
              } catch (embError) {
                console.error(`[WORKER] Failed to generate embedding for chunk ${chunk.index} of ${pageUrl}:`, embError);
                // Store chunk without embedding
                return {
                  chatbotId,
                  sourceType: "website" as const,
                  sourceUrl: pageUrl,
                  sourceTitle: pageTitle,
                  chunkText: chunk.text,
                  chunkIndex: chunk.index.toString(),
                  contentHash: chunk.contentHash,
                  metadata: chunk.metadata,
                };
              }
            })
          );
          
          allChunksWithEmbeddings.push(...batchResults);
        }
        
        perfMonitor.end('embed-page-chunks', { chunks: pageChunks.length, embeddings: totalEmbeddings });
      }
      
      perfMonitor.end('chunking-and-embedding', { totalChunks, totalEmbeddings });
      
      // Store all chunks in database
      perfMonitor.start('database-storage');
      if (allChunksWithEmbeddings.length > 0) {
        await storage.createKnowledgeChunks(allChunksWithEmbeddings);
        console.log(`[WORKER] ✓ Stored ${allChunksWithEmbeddings.length} chunks from ${validPages.length} pages`);
      }
      perfMonitor.end('database-storage', { chunks: allChunksWithEmbeddings.length });
      
      // Mark task as completed
      perfMonitor.end('task-total', { totalChunks: allChunksWithEmbeddings.length, totalPages: validPages.length });
      console.log(perfMonitor.getSummary());
      
      await storage.updateIndexingTaskStatus(taskId, "completed", undefined, allChunksWithEmbeddings.length);
      return; // Exit early since we've already processed everything
    } else if (sourceType === "document") {
      // Documents are pre-processed during upload - text extraction happens client-side
      // The sourceUrl here is the object storage path for reference only
      // Document content should already be in the chatbot's documentContent field
      // Skip document processing in worker - mark as completed
      console.log(`[WORKER] Skipping document ${sourceUrl} - documents are pre-processed during upload`);
      await storage.updateIndexingTaskStatus(taskId, "completed", undefined, 0);
      return;
    } else {
      // Unknown source type
      throw new Error(`Unknown source type: ${sourceType}`);
    }
    
  } catch (error) {
    // Handle cancellation separately
    if (error instanceof CancelledError) {
      console.log(`[WORKER] Task ${taskId} cancelled during processing`);
      await storage.updateIndexingTaskStatus(taskId, "cancelled", "Task cancelled by user");
      throw error; // Re-throw so job knows it was cancelled
    }
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[WORKER] Task ${taskId} failed:`, errorMessage);
    
    // Check retry count
    const task = await storage.getIndexingTasksForJob(jobId);
    const currentTask = task.find(t => t.id === taskId);
    const retryCount = currentTask ? parseInt(currentTask.retryCount) : 0;
    
    if (retryCount < MAX_RETRY_COUNT) {
      console.log(`[WORKER] Will retry task ${taskId} (attempt ${retryCount + 1}/${MAX_RETRY_COUNT})`);
      await storage.incrementTaskRetryCount(taskId);
      await storage.updateIndexingTaskStatus(taskId, "pending", errorMessage);
    } else {
      console.error(`[WORKER] Task ${taskId} exceeded max retries, marking as failed`);
      await storage.updateIndexingTaskStatus(taskId, "failed", errorMessage);
    }
  }
}

// Process a single indexing job
async function processIndexingJob(jobId: string): Promise<void> {
  const perfMonitor = new PerformanceMonitor(jobId);
  const config = getEnvironmentConfig();
  
  console.log(`[WORKER] Processing indexing job ${jobId}`);
  console.log(`[WORKER] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[WORKER] Production config applied:`, JSON.stringify(config, null, 2));
  
  perfMonitor.start('job-total');
  
  // Create cancellation monitor for this job
  const monitor = new CancellationMonitor(jobId);
  
  try {
    const job = await storage.getIndexingJob(jobId);
    if (!job) {
      console.error(`[WORKER] Job ${jobId} not found`);
      return;
    }
    
    // Update job status to processing
    await storage.updateIndexingJobStatus(jobId, "processing");
    await storage.updateChatbotIndexingStatus(job.chatbotId, "processing", jobId);
    
    // Get all tasks for this job
    const tasks = await storage.getIndexingTasksForJob(jobId);
    console.log(`[WORKER] Job has ${tasks.length} tasks`);
    perfMonitor.track('total-tasks', tasks.length, ' tasks');
    
    // Process each task sequentially
    let completedCount = 0;
    let failedCount = 0;
    let cancelledCount = 0;
    
    for (const task of tasks) {
      // Check for cancellation using monitor
      try {
        await monitor.check();
      } catch (error) {
        if (error instanceof CancelledError) {
          console.log(`[WORKER] Job ${jobId} cancelled, marking remaining tasks as cancelled`);
          // Mark all remaining pending tasks as cancelled
          for (const remainingTask of tasks) {
            if (remainingTask.status === "pending") {
              await storage.updateIndexingTaskStatus(remainingTask.id, "cancelled", "Job was cancelled by user");
            }
          }
          throw error; // Re-throw to handle in outer catch
        }
        throw error;
      }
      
      if (task.status === "pending") {
        await processIndexingTask(task.id, jobId, task.chatbotId, task.sourceType, task.sourceUrl, monitor);
      }
      
      // Refresh task status
      const updatedTasks = await storage.getIndexingTasksForJob(jobId);
      completedCount = updatedTasks.filter(t => t.status === "completed").length;
      failedCount = updatedTasks.filter(t => t.status === "failed").length;
      cancelledCount = updatedTasks.filter(t => t.status === "cancelled").length;
      
      // Update job progress (including cancelled count)
      await db
        .update(indexingJobs)
        .set({
          completedTasks: completedCount.toString(),
          failedTasks: failedCount.toString(),
          cancelledTasks: cancelledCount.toString(),
        })
        .where(eq(indexingJobs.id, jobId));
      
      console.log(`[WORKER] Job progress: ${completedCount}/${tasks.length} completed, ${failedCount} failed, ${cancelledCount} cancelled`);
    }
    
    // Complete the job
    perfMonitor.start('job-completion');
    await storage.completeIndexingJob(jobId);
    perfMonitor.end('job-completion');
    
    // Generate and store suggested questions if job completed successfully
    const finalJob = await storage.getIndexingJob(jobId);
    if (finalJob && (finalJob.status === "completed" || finalJob.status === "partial")) {
      try {
        perfMonitor.start('suggested-questions');
        console.log(`[WORKER] Generating suggested questions for chatbot ${job.chatbotId}...`);
        
        // Fetch chatbot to get its selected Gemini model
        const chatbot = await storage.getChatbot(job.chatbotId);
        if (!chatbot) {
          console.error(`[WORKER] Chatbot ${job.chatbotId} not found, skipping question generation`);
          return;
        }
        
        const suggestedQuestions = await generateSuggestedQuestions(job.chatbotId, chatbot.geminiModel);
        
        if (suggestedQuestions.length > 0) {
          await storage.replaceSuggestedQuestions(job.chatbotId, suggestedQuestions);
          console.log(`[WORKER] ✓ Stored ${suggestedQuestions.length} suggested questions for chatbot ${job.chatbotId}`);
        } else {
          console.log(`[WORKER] No suggested questions generated for chatbot ${job.chatbotId}`);
        }
        perfMonitor.end('suggested-questions', { questionsGenerated: suggestedQuestions.length });
      } catch (questionError) {
        // Don't fail the job if question generation fails - it's a nice-to-have feature
        console.error(`[WORKER] Failed to generate suggested questions (non-critical):`, questionError);
        perfMonitor.end('suggested-questions', { error: true });
      }
    }
    
    // Update chatbot indexing status based on final job status
    if (finalJob) {
      await storage.updateChatbotIndexingStatus(job.chatbotId, finalJob.status);
      perfMonitor.end('job-total', { 
        status: finalJob.status,
        completedTasks: completedCount,
        failedTasks: failedCount,
        cancelledTasks: cancelledCount
      });
      
      console.log(`[WORKER] ✓ Job ${jobId} completed with status: ${finalJob.status}`);
      console.log(perfMonitor.getSummary());
      totalJobsProcessed++;
    }
    
  } catch (error) {
    // Handle cancellation differently from other errors
    if (error instanceof CancelledError) {
      console.log(`[WORKER] ✓ Job ${jobId} cancelled by user`);
      // Job status is already set to cancelled by the cancellation endpoint
      // Just update the chatbot status
      const job = await storage.getIndexingJob(jobId);
      if (job) {
        await storage.updateChatbotIndexingStatus(job.chatbotId, "cancelled");
      }
    } else {
      console.error(`[WORKER] ✗ Error processing job ${jobId}:`, error);
      console.error(`[WORKER] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
      await storage.updateIndexingJobStatus(jobId, "failed", error instanceof Error ? error.message : String(error));
      
      const job = await storage.getIndexingJob(jobId);
      if (job) {
        await storage.updateChatbotIndexingStatus(job.chatbotId, "failed");
      }
    }
  } finally {
    // Clean up in-memory cancellation flag
    clearCancellationFlag(jobId);
  }
}

// Process job with timeout protection
async function processIndexingJobWithTimeout(jobId: string): Promise<void> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Job ${jobId} timed out after ${JOB_TIMEOUT_MS / 1000 / 60} minutes`));
    }, JOB_TIMEOUT_MS);
  });
  
  try {
    await Promise.race([processIndexingJob(jobId), timeoutPromise]);
  } catch (error) {
    if (error instanceof Error && error.message.includes('timed out')) {
      console.error(`[WORKER] ✗ Job ${jobId} TIMED OUT - marking as failed`);
      await storage.updateIndexingJobStatus(jobId, "failed", error.message);
      const job = await storage.getIndexingJob(jobId);
      if (job) {
        await storage.updateChatbotIndexingStatus(job.chatbotId, "failed");
      }
    } else {
      throw error;
    }
  }
}

// Retry wrapper for database queries with connection error handling
async function retryDbQuery<T>(
  queryFn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await queryFn();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const isConnectionError = 
        errorMsg.includes('Connection terminated unexpectedly') ||
        errorMsg.includes('Connection closed') ||
        errorMsg.includes('socket hang up') ||
        errorMsg.includes('ECONNRESET');
      
      if (isConnectionError && attempt < maxRetries) {
        console.warn(`[WORKER] Database connection error (attempt ${attempt}/${maxRetries}), retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2; // Exponential backoff
      } else {
        if (isConnectionError) {
          console.error('[WORKER] Database connection failed after all retries');
        }
        throw error;
      }
    }
  }
  return null;
}

// Main worker loop
async function workerLoop(): Promise<void> {
  if (!isWorkerRunning) {
    console.log('[WORKER] Worker stopped, exiting loop');
    return;
  }
  
  try {
    // Find pending jobs with retry logic for connection failures
    const pendingJobs = await retryDbQuery(async () => {
      return await db.query.indexingJobs.findMany({
        where: (jobs, { eq }) => eq(jobs.status, "pending"),
        limit: 5,
      });
    });
    
    if (pendingJobs && pendingJobs.length > 0) {
      console.log(`[WORKER] Found ${pendingJobs.length} pending indexing job(s)`);
      
      // Process jobs one at a time with timeout protection
      for (const job of pendingJobs) {
        if (!isWorkerRunning) {
          console.log('[WORKER] Worker stopped during job processing');
          break;
        }
        await processIndexingJobWithTimeout(job.id);
      }
    }
  } catch (error) {
    console.error("[WORKER] ✗ Critical error in worker loop:", error);
    console.error("[WORKER] Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    
    // If it's a connection error, wait longer before retry
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (errorMsg.includes('Connection') || errorMsg.includes('ECONNRESET')) {
      console.log('[WORKER] Connection error detected, waiting 10s before next poll...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
  
  // Schedule next iteration
  if (isWorkerRunning) {
    setTimeout(() => workerLoop(), POLL_INTERVAL_MS);
  }
}

// Start the background worker
export async function startIndexingWorker(): Promise<void> {
  if (isWorkerRunning) {
    console.log("[WORKER] Indexing worker is already running");
    return;
  }
  
  console.log("[WORKER] ========================================");
  console.log("[WORKER] Starting indexing worker...");
  console.log("[WORKER] Environment:", process.env.NODE_ENV);
  console.log("[WORKER] Poll interval:", POLL_INTERVAL_MS / 1000, "seconds");
  console.log("[WORKER] Heartbeat interval:", HEARTBEAT_INTERVAL_MS / 1000 / 60, "minutes (only when active)");
  console.log("[WORKER] Job timeout:", JOB_TIMEOUT_MS / 1000 / 60, "minutes");
  console.log("[WORKER] ========================================");
  
  // Run health check for Playwright/Chromium
  const healthCheck = await checkPlaywrightHealth();
  if (!healthCheck.available) {
    console.error("[WORKER] ✗ CRITICAL: Playwright/Chromium is not available!");
    console.error("[WORKER] Error:", healthCheck.error);
    console.error("[WORKER] Indexing jobs requiring website crawling will fail!");
    console.error("[WORKER] Consider installing Chromium or checking Playwright installation");
    // Continue anyway - worker can still process document uploads
  }
  
  isWorkerRunning = true;
  lastHeartbeat = Date.now();
  
  // Start heartbeat logging
  heartbeatInterval = setInterval(logHeartbeat, HEARTBEAT_INTERVAL_MS);
  
  // Start the worker loop
  workerLoop();
  
  console.log("[WORKER] ✓ Indexing worker started successfully");
}

// Stop the background worker (for graceful shutdown)
export function stopIndexingWorker(): void {
  console.log("[WORKER] Stopping indexing worker...");
  isWorkerRunning = false;
  
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  
  console.log("[WORKER] ✓ Indexing worker stopped");
}

// Notify worker of job cancellation for immediate response
export function notifyJobCancellation(jobId: string): void {
  cancelledJobs.set(jobId, true);
  console.log(`[WORKER] In-memory cancellation flag set for job ${jobId}`);
}

// Clean up cancellation flag after job completes
function clearCancellationFlag(jobId: string): void {
  cancelledJobs.delete(jobId);
}
