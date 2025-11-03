import { storage } from "./storage";
import { crawlWebsite, crawlMultipleWebsitesRecursive, calculateContentHash, normalizeUrl } from "./crawler";
import { chunkContent } from "./chunker";
import { embeddingService } from "./embedding";
import type { InsertKnowledgeChunk } from "@shared/schema";
import { db } from "./db";
import { urlCrawlMetadata, indexingJobs, indexingTasks } from "@shared/schema";
import { eq } from "drizzle-orm";

const POLL_INTERVAL_MS = 3000; // Check for new jobs every 3 seconds
const MAX_RETRY_COUNT = 3;
const HEARTBEAT_INTERVAL_MS = 30000; // Log heartbeat every 30 seconds
const JOB_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes max per job
let isWorkerRunning = false;
let lastHeartbeat = Date.now();
let heartbeatInterval: NodeJS.Timeout | null = null;
let totalJobsProcessed = 0;

// Health check for Playwright/Chromium availability
async function checkPlaywrightHealth(): Promise<{ available: boolean; error?: string }> {
  try {
    const { chromium } = await import('playwright');
    
    console.log('[WORKER-HEALTH] Testing Playwright/Chromium availability...');
    console.log('[WORKER-HEALTH] Environment:', process.env.NODE_ENV);
    console.log('[WORKER-HEALTH] Default Chromium path:', chromium.executablePath());
    
    // Try to find system Chromium
    if (process.env.NODE_ENV === 'production') {
      try {
        const { execSync } = await import('child_process');
        const chromiumPath = execSync('which chromium-browser || which chromium', { encoding: 'utf8' }).trim();
        console.log('[WORKER-HEALTH] System Chromium found:', chromiumPath);
      } catch (error) {
        console.warn('[WORKER-HEALTH] System Chromium not found, will use Playwright browser');
      }
    }
    
    // Try to launch browser for real health check
    const browser = await chromium.launch({
      headless: true,
      timeout: 10000,
    });
    await browser.close();
    
    console.log('[WORKER-HEALTH] ✓ Playwright/Chromium is operational');
    return { available: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[WORKER-HEALTH] ✗ Playwright/Chromium FAILED:', errorMsg);
    return { available: false, error: errorMsg };
  }
}

// Worker heartbeat logging
function logHeartbeat(): void {
  const uptime = Math.floor((Date.now() - lastHeartbeat) / 1000);
  console.log(`[WORKER-HEARTBEAT] Worker alive | Jobs processed: ${totalJobsProcessed} | Uptime: ${uptime}s`);
}

// Process a single indexing task (URL or document)
async function processIndexingTask(taskId: string, jobId: string, chatbotId: string, sourceType: string, sourceUrl: string): Promise<void> {
  console.log(`[WORKER] Processing task ${taskId}: ${sourceType} - ${sourceUrl}`);
  
  try {
    await storage.updateIndexingTaskStatus(taskId, "processing");
    
    let content = "";
    let title = "";
    
    if (sourceType === "website") {
      // Recursively crawl the website (max 2 levels deep, max 200 pages)
      console.log(`[WORKER] Recursively crawling website: ${sourceUrl} (max depth: 2, max pages: 200)`);
      const crawlResults = await crawlMultipleWebsitesRecursive([sourceUrl], {
        maxDepth: 2,
        maxPages: 200,
        sameDomainOnly: true,
      });
      
      // crawlResults is an array of crawled pages
      console.log(`[WORKER] Crawled ${crawlResults.length} pages from ${sourceUrl}`);
      
      if (crawlResults.length === 0) {
        throw new Error("No pages could be crawled from the website");
      }
      
      // Concatenate all page content with separators
      content = crawlResults
        .filter((page: any) => page.content && !page.error)
        .map((page: any) => `=== ${page.title || page.url} ===\n\n${page.content}`)
        .join('\n\n---\n\n');
      
      title = crawlResults[0]?.title || sourceUrl;
      
      if (!content || content.trim().length === 0) {
        throw new Error("All crawled pages were empty or had errors");
      }
      
      // Atomically check and update knowledge base size
      const chatbot = await storage.getChatbotById(chatbotId);
      if (chatbot) {
        const user = await storage.getUser(chatbot.userId);
        if (user && user.isAdmin !== "true") {
          const { TIER_LIMITS } = await import("@shared/pricing");
          const tier = user.subscriptionTier;
          const limits = TIER_LIMITS[tier];
          const contentSizeMB = Buffer.byteLength(content, 'utf8') / (1024 * 1024);
          
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
      const contentHash = calculateContentHash(content);
      
      try {
        await db.insert(urlCrawlMetadata).values({
          chatbotId,
          url: normalizedUrl,
          contentHash,
          lastCrawledAt: new Date(),
        });
        console.log(`[WORKER] Stored crawl metadata for ${normalizedUrl}`);
      } catch (metaError) {
        console.error(`[WORKER] Failed to store crawl metadata:`, metaError);
        // Don't fail the task if metadata storage fails
      }
    } else if (sourceType === "document") {
      // Documents are pre-processed during upload - text extraction happens client-side
      // The sourceUrl here is the object storage path for reference only
      // Document content should already be in the chatbot's documentContent field
      // Skip document processing in worker - mark as completed
      console.log(`[WORKER] Skipping document ${sourceUrl} - documents are pre-processed during upload`);
      await storage.updateIndexingTaskStatus(taskId, "completed", undefined, 0);
      return;
    }
    
    if (!content || content.trim().length === 0) {
      console.log(`[WORKER] No content to index for ${sourceUrl}, skipping chunking`);
      await storage.updateIndexingTaskStatus(taskId, "completed", undefined, 0);
      return;
    }
    
    // Chunk the content
    console.log(`[WORKER] Chunking content (${content.length} chars)...`);
    const contentChunks = chunkContent(content, { title });
    console.log(`[WORKER] Generated ${contentChunks.length} chunks`);
    
    if (contentChunks.length === 0) {
      console.log(`[WORKER] No chunks generated for ${sourceUrl}`);
      await storage.updateIndexingTaskStatus(taskId, "completed", undefined, 0);
      return;
    }
    
    // Generate embeddings and create knowledge chunks
    const chunksWithEmbeddings: InsertKnowledgeChunk[] = [];
    
    for (const chunk of contentChunks) {
      try {
        const embedding = await embeddingService.generateEmbedding(chunk.text);
        chunksWithEmbeddings.push({
          chatbotId,
          sourceType: sourceType as "website" | "document",
          sourceUrl,
          sourceTitle: title,
          chunkText: chunk.text,
          chunkIndex: chunk.index.toString(),
          contentHash: chunk.contentHash,
          embedding,
          metadata: chunk.metadata,
        });
      } catch (embError) {
        console.error(`[WORKER] Failed to generate embedding for chunk ${chunk.index}:`, embError);
        // Store chunk without embedding
        chunksWithEmbeddings.push({
          chatbotId,
          sourceType: sourceType as "website" | "document",
          sourceUrl,
          sourceTitle: title,
          chunkText: chunk.text,
          chunkIndex: chunk.index.toString(),
          contentHash: chunk.contentHash,
          metadata: chunk.metadata,
        });
      }
    }
    
    // Store chunks in database
    await storage.createKnowledgeChunks(chunksWithEmbeddings);
    console.log(`[WORKER] ✓ Stored ${chunksWithEmbeddings.length} chunks for ${sourceUrl}`);
    
    // Mark task as completed
    await storage.updateIndexingTaskStatus(taskId, "completed", undefined, chunksWithEmbeddings.length);
    
  } catch (error) {
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
  console.log(`[WORKER] Processing indexing job ${jobId}`);
  
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
    
    // Process each task sequentially
    let completedCount = 0;
    let failedCount = 0;
    let cancelledCount = 0;
    
    for (const task of tasks) {
      // Check if job has been cancelled
      const currentJob = await storage.getIndexingJob(jobId);
      if (currentJob?.status === "cancelled") {
        console.log(`[WORKER] Job ${jobId} has been cancelled, stopping processing`);
        break;
      }
      
      if (task.status === "pending") {
        await processIndexingTask(task.id, jobId, task.chatbotId, task.sourceType, task.sourceUrl);
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
    await storage.completeIndexingJob(jobId);
    
    // Update chatbot indexing status based on final job status
    const finalJob = await storage.getIndexingJob(jobId);
    if (finalJob) {
      await storage.updateChatbotIndexingStatus(job.chatbotId, finalJob.status);
      console.log(`[WORKER] ✓ Job ${jobId} completed with status: ${finalJob.status}`);
      totalJobsProcessed++;
    }
    
  } catch (error) {
    console.error(`[WORKER] ✗ Error processing job ${jobId}:`, error);
    console.error(`[WORKER] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
    await storage.updateIndexingJobStatus(jobId, "failed", error instanceof Error ? error.message : String(error));
    
    const job = await storage.getIndexingJob(jobId);
    if (job) {
      await storage.updateChatbotIndexingStatus(job.chatbotId, "failed");
    }
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

// Main worker loop
async function workerLoop(): Promise<void> {
  if (!isWorkerRunning) {
    console.log('[WORKER] Worker stopped, exiting loop');
    return;
  }
  
  try {
    // Find pending jobs
    const pendingJobs = await db.query.indexingJobs.findMany({
      where: (jobs, { eq }) => eq(jobs.status, "pending"),
      limit: 5,
    });
    
    if (pendingJobs.length > 0) {
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
  console.log("[WORKER] Poll interval:", POLL_INTERVAL_MS, "ms");
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
