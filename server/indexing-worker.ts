import { storage } from "./storage";
import { crawlWebsite, calculateContentHash, normalizeUrl } from "./crawler";
import { chunkContent } from "./chunker";
import { embeddingService } from "./embedding";
import type { InsertKnowledgeChunk } from "@shared/schema";
import { db } from "./db";
import { urlCrawlMetadata } from "@shared/schema";

const POLL_INTERVAL_MS = 3000; // Check for new jobs every 3 seconds
const MAX_RETRY_COUNT = 3;
let isWorkerRunning = false;

// Process a single indexing task (URL or document)
async function processIndexingTask(taskId: string, jobId: string, chatbotId: string, sourceType: string, sourceUrl: string): Promise<void> {
  console.log(`[WORKER] Processing task ${taskId}: ${sourceType} - ${sourceUrl}`);
  
  try {
    await storage.updateIndexingTaskStatus(taskId, "processing");
    
    let content = "";
    let title = "";
    
    if (sourceType === "website") {
      // Crawl the website
      console.log(`[WORKER] Crawling URL: ${sourceUrl}`);
      const crawlResult = await crawlWebsite(sourceUrl);
      
      if (crawlResult.error) {
        throw new Error(crawlResult.error);
      }
      
      content = crawlResult.content || "";
      title = crawlResult.title || sourceUrl;
      
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
    }
    
  } catch (error) {
    console.error(`[WORKER] Error processing job ${jobId}:`, error);
    await storage.updateIndexingJobStatus(jobId, "failed", error instanceof Error ? error.message : String(error));
    
    const job = await storage.getIndexingJob(jobId);
    if (job) {
      await storage.updateChatbotIndexingStatus(job.chatbotId, "failed");
    }
  }
}

// Main worker loop
async function workerLoop(): Promise<void> {
  if (!isWorkerRunning) {
    return;
  }
  
  try {
    // Find pending jobs
    const pendingJobs = await db.query.indexingJobs.findMany({
      where: (jobs, { eq }) => eq(jobs.status, "pending"),
      limit: 5,
    });
    
    if (pendingJobs.length > 0) {
      console.log(`[WORKER] Found ${pendingJobs.length} pending indexing jobs`);
      
      // Process jobs one at a time (could be parallelized if needed)
      for (const job of pendingJobs) {
        await processIndexingJob(job.id);
      }
    }
  } catch (error) {
    console.error("[WORKER] Error in worker loop:", error);
  }
  
  // Schedule next iteration
  setTimeout(() => workerLoop(), POLL_INTERVAL_MS);
}

// Start the background worker
export function startIndexingWorker(): void {
  if (isWorkerRunning) {
    console.log("[WORKER] Indexing worker is already running");
    return;
  }
  
  console.log("[WORKER] Starting indexing worker...");
  isWorkerRunning = true;
  workerLoop();
  console.log("[WORKER] ✓ Indexing worker started");
}

// Stop the background worker (for graceful shutdown)
export function stopIndexingWorker(): void {
  console.log("[WORKER] Stopping indexing worker...");
  isWorkerRunning = false;
}
