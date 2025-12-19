import { db } from "./db";
import { chatbots, adminNotifications } from "@shared/schema";
import { storage } from "./storage";
import { eq, lte, and, or, inArray, isNull, sql } from "drizzle-orm";
import { Resend } from "resend";

const SCHEDULER_POLL_INTERVAL_MS = 60000; // Check every minute
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

let isSchedulerRunning = false;
let schedulerInterval: NodeJS.Timeout | null = null;

interface ScheduledChatbot {
  id: string;
  userId: string;
  name: string;
  websiteUrls: string[] | null;
  reindexScheduleMode: string;
  reindexScheduleDate: Date | null;
  nextScheduledReindexAt: Date | null;
}

export async function calculateNextReindexTime(
  mode: string,
  time: string,
  timezone: string,
  daysOfWeek: string[] | null,
  oneTimeDate: Date | null
): Promise<Date | null> {
  if (mode === "disabled") {
    return null;
  }
  
  const now = new Date();
  const [hours, minutes] = time.split(":").map(Number);
  
  if (mode === "once" && oneTimeDate) {
    const scheduled = new Date(oneTimeDate);
    scheduled.setHours(hours, minutes, 0, 0);
    return scheduled > now ? scheduled : null;
  }
  
  if (mode === "daily") {
    const next = new Date();
    next.setHours(hours, minutes, 0, 0);
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
    return next;
  }
  
  if (mode === "weekly" && daysOfWeek && daysOfWeek.length > 0) {
    const dayMap: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6
    };
    
    const targetDays = daysOfWeek.map(d => dayMap[d.toLowerCase()]).filter(d => d !== undefined).sort((a, b) => a - b);
    
    if (targetDays.length === 0) return null;
    
    const currentDay = now.getDay();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const targetTime = hours * 60 + minutes;
    
    for (const targetDay of targetDays) {
      const daysUntil = (targetDay - currentDay + 7) % 7;
      if (daysUntil === 0 && currentTime >= targetTime) continue;
      
      const next = new Date();
      next.setDate(now.getDate() + (daysUntil || 7));
      next.setHours(hours, minutes, 0, 0);
      return next;
    }
    
    const firstDay = targetDays[0];
    const daysUntil = (firstDay - currentDay + 7) % 7 || 7;
    const next = new Date();
    next.setDate(now.getDate() + daysUntil);
    next.setHours(hours, minutes, 0, 0);
    return next;
  }
  
  return null;
}

async function sendFailureEmailNotification(
  chatbotName: string,
  userId: string,
  errorMessage: string
): Promise<void> {
  if (!resend) {
    console.log("[SCHEDULER] Resend not configured, skipping email notification");
    return;
  }
  
  try {
    const user = await storage.getUser(userId);
    if (!user?.email) {
      console.log("[SCHEDULER] No email for user, skipping email notification");
      return;
    }
    
    await resend.emails.send({
      from: "BuildMyChatbot.AI <notifications@buildmychatbot.ai>",
      to: user.email,
      subject: `⚠️ Scheduled Reindex Failed for ${chatbotName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Scheduled Reindex Failed</h2>
          <p>The scheduled knowledge base refresh for your chatbot <strong>${chatbotName}</strong> has failed.</p>
          <p><strong>Error:</strong> ${errorMessage}</p>
          <p>Don't worry - your chatbot is still using its existing knowledge base and continues to work normally.</p>
          <p>To resolve this issue:</p>
          <ul>
            <li>Check that your website URLs are accessible</li>
            <li>Verify the website content is available</li>
            <li>Try a manual reindex from your dashboard</li>
          </ul>
          <p style="margin-top: 20px;">
            <a href="https://buildmychatbot.ai/dashboard" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Dashboard</a>
          </p>
          <p style="margin-top: 30px; color: #6b7280; font-size: 12px;">
            You're receiving this because you have scheduled reindexing enabled for your chatbot.
            You can disable this in your chatbot settings.
          </p>
        </div>
      `
    });
    
    console.log(`[SCHEDULER] Sent failure notification email to ${user.email}`);
  } catch (error) {
    console.error("[SCHEDULER] Failed to send email notification:", error);
  }
}

async function createInAppNotification(
  userId: string,
  chatbotId: string,
  type: "reindex_failed" | "reindex_success",
  title: string,
  message: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await storage.createAdminNotification({
      userId,
      chatbotId,
      type,
      title,
      message,
      metadata: metadata || null,
    });
    console.log(`[SCHEDULER] Created in-app notification for user ${userId}`);
  } catch (error) {
    console.error("[SCHEDULER] Failed to create in-app notification:", error);
  }
}

async function processScheduledReindex(chatbot: ScheduledChatbot): Promise<void> {
  console.log(`[SCHEDULER] Processing scheduled reindex for chatbot ${chatbot.id} (${chatbot.name})`);
  
  try {
    // Mark as running
    await db
      .update(chatbots)
      .set({
        lastReindexStatus: "running",
        lastScheduledReindexAt: new Date(),
      })
      .where(eq(chatbots.id, chatbot.id));
    
    if (!chatbot.websiteUrls || chatbot.websiteUrls.length === 0) {
      throw new Error("No website URLs configured for reindexing");
    }
    
    // Create indexing job - the indexing worker will process it asynchronously
    const indexingJob = await storage.createIndexingJob(chatbot.id, chatbot.websiteUrls.length);
    
    const tasks = chatbot.websiteUrls.map(url => ({
      jobId: indexingJob.id,
      chatbotId: chatbot.id,
      sourceType: "website" as const,
      sourceUrl: url,
    }));
    
    await storage.createIndexingTasks(tasks);
    
    console.log(`[SCHEDULER] Created indexing job ${indexingJob.id} for chatbot ${chatbot.id}`);
    
    // Update chatbot to show processing status
    await storage.updateChatbotIndexingStatus(chatbot.id, "processing", indexingJob.id);
    
    // Calculate and set next run time
    const fullChatbot = await storage.getChatbotById(chatbot.id);
    const reindexTime = fullChatbot?.reindexScheduleTime || "03:00";
    const reindexTimezone = fullChatbot?.reindexScheduleTimezone || "America/New_York";
    const reindexDays = fullChatbot?.reindexScheduleDaysOfWeek || ["monday"];
    
    const nextRun = await calculateNextReindexTime(
      chatbot.reindexScheduleMode,
      reindexTime,
      reindexTimezone,
      reindexDays,
      chatbot.reindexScheduleDate
    );
    
    if (nextRun) {
      await db
        .update(chatbots)
        .set({ nextScheduledReindexAt: nextRun })
        .where(eq(chatbots.id, chatbot.id));
      console.log(`[SCHEDULER] Next reindex scheduled for ${nextRun.toISOString()}`);
    } else if (chatbot.reindexScheduleMode === "once") {
      await db
        .update(chatbots)
        .set({ 
          reindexScheduleMode: "disabled",
          reindexScheduleEnabled: "false",
          nextScheduledReindexAt: null,
        })
        .where(eq(chatbots.id, chatbot.id));
      console.log(`[SCHEDULER] One-time reindex schedule disabled`);
    }
    
    // Note: The indexing worker will handle the actual processing.
    // The checkCompletedReindexJobs function monitors job completion and sends
    // failure notifications if needed.
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[SCHEDULER] Failed to trigger reindex for chatbot ${chatbot.id}:`, errorMessage);
    
    // Update status to failed since we couldn't even start the job
    await db
      .update(chatbots)
      .set({
        lastReindexStatus: "failed",
        lastReindexError: errorMessage,
        indexingStatus: "completed",
      })
      .where(eq(chatbots.id, chatbot.id));
    
    // Send failure notifications
    await createInAppNotification(
      chatbot.userId,
      chatbot.id,
      "reindex_failed",
      `Reindex Failed: ${chatbot.name}`,
      `The scheduled knowledge base refresh failed to start: ${errorMessage}. Your chatbot continues to use its existing knowledge base.`,
      { error: errorMessage }
    );
    
    await sendFailureEmailNotification(chatbot.name, chatbot.userId, errorMessage);
  }
}

// Check for recently completed scheduled reindex jobs and send notifications
async function checkCompletedReindexJobs(): Promise<void> {
  try {
    // Find chatbots with lastReindexStatus = "running" that have completed indexing
    const runningReindexes = await db
      .select({
        id: chatbots.id,
        userId: chatbots.userId,
        name: chatbots.name,
        indexingStatus: chatbots.indexingStatus,
        lastReindexStatus: chatbots.lastReindexStatus,
      })
      .from(chatbots)
      .where(eq(chatbots.lastReindexStatus, "running"))
      .limit(10);
    
    for (const chatbot of runningReindexes) {
      // Check if indexing has completed (status changed from "processing")
      if (chatbot.indexingStatus !== "processing") {
        const jobSuccess = chatbot.indexingStatus === "completed";
        
        if (jobSuccess) {
          // Mark reindex as successful
          await db
            .update(chatbots)
            .set({
              lastReindexStatus: "success",
              lastReindexError: null,
            })
            .where(eq(chatbots.id, chatbot.id));
          
          console.log(`[SCHEDULER] Scheduled reindex completed successfully for chatbot ${chatbot.id}`);
        } else {
          // Mark reindex as failed and send notifications
          const errorMessage = "Indexing job failed or was interrupted";
          
          await db
            .update(chatbots)
            .set({
              lastReindexStatus: "failed",
              lastReindexError: errorMessage,
            })
            .where(eq(chatbots.id, chatbot.id));
          
          // Send failure notifications
          await createInAppNotification(
            chatbot.userId,
            chatbot.id,
            "reindex_failed",
            `Reindex Failed: ${chatbot.name}`,
            `The scheduled knowledge base refresh failed: ${errorMessage}. Your chatbot continues to use its existing knowledge base.`,
            { error: errorMessage }
          );
          
          await sendFailureEmailNotification(chatbot.name, chatbot.userId, errorMessage);
          
          console.log(`[SCHEDULER] Scheduled reindex failed for chatbot ${chatbot.id}`);
        }
      }
    }
  } catch (error) {
    console.error("[SCHEDULER] Error checking completed reindex jobs:", error);
  }
}

async function checkScheduledReindexes(): Promise<void> {
  try {
    const now = new Date();
    
    const dueChatbots = await db
      .select({
        id: chatbots.id,
        userId: chatbots.userId,
        name: chatbots.name,
        websiteUrls: chatbots.websiteUrls,
        reindexScheduleMode: chatbots.reindexScheduleMode,
        reindexScheduleDate: chatbots.reindexScheduleDate,
        nextScheduledReindexAt: chatbots.nextScheduledReindexAt,
      })
      .from(chatbots)
      .where(and(
        eq(chatbots.reindexScheduleEnabled, "true"),
        inArray(chatbots.reindexScheduleMode, ["once", "daily", "weekly"]),
        lte(chatbots.nextScheduledReindexAt, now),
        or(
          isNull(chatbots.lastReindexStatus),
          eq(chatbots.lastReindexStatus, "success"),
          eq(chatbots.lastReindexStatus, "failed")
        )
      ))
      .limit(5);
    
    if (dueChatbots.length > 0) {
      console.log(`[SCHEDULER] Found ${dueChatbots.length} chatbot(s) due for reindexing`);
      
      for (const chatbot of dueChatbots) {
        await processScheduledReindex(chatbot as ScheduledChatbot);
      }
    }
  } catch (error) {
    console.error("[SCHEDULER] Error checking scheduled reindexes:", error);
  }
}

// Main scheduler polling function that runs both checks
async function runSchedulerChecks(): Promise<void> {
  await checkScheduledReindexes();
  await checkCompletedReindexJobs();
}

export function startReindexScheduler(): void {
  if (isSchedulerRunning) {
    console.log("[SCHEDULER] Reindex scheduler already running");
    return;
  }
  
  console.log("[SCHEDULER] Starting reindex scheduler...");
  isSchedulerRunning = true;
  
  // Run initial checks
  runSchedulerChecks();
  
  // Poll periodically
  schedulerInterval = setInterval(runSchedulerChecks, SCHEDULER_POLL_INTERVAL_MS);
  
  console.log(`[SCHEDULER] Reindex scheduler started (polling every ${SCHEDULER_POLL_INTERVAL_MS / 1000}s)`);
}

export function stopReindexScheduler(): void {
  if (!isSchedulerRunning) {
    console.log("[SCHEDULER] Reindex scheduler not running");
    return;
  }
  
  console.log("[SCHEDULER] Stopping reindex scheduler...");
  isSchedulerRunning = false;
  
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
  
  console.log("[SCHEDULER] Reindex scheduler stopped");
}

export function isReindexSchedulerRunning(): boolean {
  return isSchedulerRunning;
}
