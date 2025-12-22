import { Resend } from "resend";
import type { IStorage } from "../storage";
import { db } from "../db";
import { eq, and, gte, sql } from "drizzle-orm";
import { conversations, conversationMessages, leads, conversationRatings, chatbots, users, emailNotificationSettings } from "@shared/schema";

// Initialize Resend only if API key is available
let resend: Resend | null = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

interface WeeklyReportData {
  userId: string;
  userEmail: string;
  chatbotStats: {
    chatbotId: string;
    chatbotName: string;
    totalConversations: number;
    totalMessages: number;
    totalLeads: number;
    averageRating: number;
    ratingCount: number;
    topQuestions: { question: string; count: number }[];
  }[];
  weekStart: Date;
  weekEnd: Date;
}

/**
 * Generate analytics data for a user's chatbots for the past week
 */
async function generateWeeklyReportData(userId: string, storage: IStorage): Promise<WeeklyReportData | null> {
  const user = await storage.getUser(userId);
  if (!user) return null;

  const weekEnd = new Date();
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  // Get all user's chatbots
  const userChatbots = await db.select()
    .from(chatbots)
    .where(eq(chatbots.userId, userId));

  if (userChatbots.length === 0) return null;

  const chatbotStats = await Promise.all(
    userChatbots.map(async (chatbot) => {
      // Count conversations in the past week
      const conversationsData = await db.select({
        count: sql<number>`count(*)::int`,
      })
        .from(conversations)
        .where(
          and(
            eq(conversations.chatbotId, chatbot.id),
            gte(conversations.startedAt, weekStart)
          )
        );

      const totalConversations = conversationsData[0]?.count || 0;

      // Count messages in the past week
      const messagesData = await db.select({
        count: sql<number>`count(*)::int`,
      })
        .from(conversationMessages)
        .innerJoin(conversations, eq(conversationMessages.conversationId, conversations.id))
        .where(
          and(
            eq(conversations.chatbotId, chatbot.id),
            gte(conversationMessages.createdAt, weekStart)
          )
        );

      const totalMessages = messagesData[0]?.count || 0;

      // Count leads captured in the past week
      const leadsData = await db.select({
        count: sql<number>`count(*)::int`,
      })
        .from(leads)
        .where(
          and(
            eq(leads.chatbotId, chatbot.id),
            gte(leads.createdAt, weekStart)
          )
        );

      const totalLeads = leadsData[0]?.count || 0;

      // Calculate average rating
      const ratingsData = await db.select({
        avgRating: sql<number>`COALESCE(AVG(CAST(${conversationRatings.rating} AS INTEGER)), 0)`,
        count: sql<number>`count(*)::int`,
      })
        .from(conversationRatings)
        .innerJoin(conversations, eq(conversationRatings.conversationId, conversations.id))
        .where(
          and(
            eq(conversations.chatbotId, chatbot.id),
            gte(conversationRatings.createdAt, weekStart)
          )
        );

      const averageRating = Number(ratingsData[0]?.avgRating || 0);
      const ratingCount = ratingsData[0]?.count || 0;

      // Get top 5 most asked questions
      const topQuestionsData = await db.select({
        question: conversationMessages.content,
        count: sql<number>`count(*)::int`,
      })
        .from(conversationMessages)
        .innerJoin(conversations, eq(conversationMessages.conversationId, conversations.id))
        .where(
          and(
            eq(conversations.chatbotId, chatbot.id),
            eq(conversationMessages.role, "user"),
            gte(conversationMessages.createdAt, weekStart)
          )
        )
        .groupBy(conversationMessages.content)
        .orderBy(sql`count(*) DESC`)
        .limit(5);

      return {
        chatbotId: chatbot.id,
        chatbotName: chatbot.name,
        totalConversations,
        totalMessages,
        totalLeads,
        averageRating,
        ratingCount,
        topQuestions: topQuestionsData.map(q => ({
          question: q.question,
          count: q.count,
        })),
      };
    })
  );

  // Filter out chatbots with no activity
  const activeChatbotStats = chatbotStats.filter(
    stat => stat.totalConversations > 0 || stat.totalLeads > 0
  );

  if (activeChatbotStats.length === 0) return null;

  return {
    userId,
    userEmail: user.email,
    chatbotStats: activeChatbotStats,
    weekStart,
    weekEnd,
  };
}

/**
 * Generate HTML email for weekly report
 */
function generateWeeklyReportEmail(data: WeeklyReportData): string {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const totalConversations = data.chatbotStats.reduce((sum, s) => sum + s.totalConversations, 0);
  const totalLeads = data.chatbotStats.reduce((sum, s) => sum + s.totalLeads, 0);
  const totalMessages = data.chatbotStats.reduce((sum, s) => sum + s.totalMessages, 0);
  
  // Calculate overall average rating (weighted by number of ratings)
  const totalRatings = data.chatbotStats.reduce((sum, s) => sum + s.ratingCount, 0);
  const weightedRatingSum = data.chatbotStats.reduce((sum, s) => sum + (s.averageRating * s.ratingCount), 0);
  const overallAverageRating = totalRatings > 0 ? (weightedRatingSum / totalRatings) : 0;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Chatbot Performance Report</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px 24px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Weekly Performance Report</h1>
      <p style="margin: 8px 0 0 0; color: #e0e7ff; font-size: 14px;">${formatDate(data.weekStart)} - ${formatDate(data.weekEnd)}</p>
    </div>

    <!-- Summary Stats -->
    <div style="padding: 32px 24px; border-bottom: 1px solid #e5e7eb;">
      <h2 style="margin: 0 0 20px 0; color: #111827; font-size: 20px; font-weight: 600;">Overall Summary</h2>
      <div style="display: flex; flex-wrap: wrap; gap: 16px;">
        <div style="flex: 1; min-width: 140px; background-color: #f9fafb; padding: 16px; border-radius: 8px;">
          <div style="color: #6b7280; font-size: 13px; margin-bottom: 4px;">Conversations</div>
          <div style="color: #111827; font-size: 28px; font-weight: 700;">${totalConversations}</div>
        </div>
        <div style="flex: 1; min-width: 140px; background-color: #f9fafb; padding: 16px; border-radius: 8px;">
          <div style="color: #6b7280; font-size: 13px; margin-bottom: 4px;">Messages</div>
          <div style="color: #111827; font-size: 28px; font-weight: 700;">${totalMessages}</div>
        </div>
        <div style="flex: 1; min-width: 140px; background-color: #f9fafb; padding: 16px; border-radius: 8px;">
          <div style="color: #6b7280; font-size: 13px; margin-bottom: 4px;">Leads Captured</div>
          <div style="color: #10b981; font-size: 28px; font-weight: 700;">${totalLeads}</div>
        </div>
        ${totalRatings > 0 ? `
        <div style="flex: 1; min-width: 140px; background-color: #f9fafb; padding: 16px; border-radius: 8px;">
          <div style="color: #6b7280; font-size: 13px; margin-bottom: 4px;">Avg. Rating</div>
          <div style="color: #f59e0b; font-size: 28px; font-weight: 700;">${overallAverageRating.toFixed(1)} ⭐</div>
          <div style="color: #9ca3af; font-size: 12px; margin-top: 2px;">${totalRatings} ratings</div>
        </div>
        ` : ''}
      </div>
    </div>

    <!-- Chatbot Breakdown -->
    ${data.chatbotStats.map(chatbot => `
    <div style="padding: 24px; border-bottom: 1px solid #e5e7eb;">
      <h3 style="margin: 0 0 16px 0; color: #111827; font-size: 18px; font-weight: 600;">${chatbot.chatbotName}</h3>
      
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 16px;">
        <div style="background-color: #eff6ff; padding: 12px; border-radius: 6px; border-left: 3px solid #3b82f6;">
          <div style="color: #1e40af; font-size: 12px; margin-bottom: 4px;">Conversations</div>
          <div style="color: #1e3a8a; font-size: 24px; font-weight: 600;">${chatbot.totalConversations}</div>
        </div>
        <div style="background-color: #f0fdf4; padding: 12px; border-radius: 6px; border-left: 3px solid #10b981;">
          <div style="color: #065f46; font-size: 12px; margin-bottom: 4px;">Leads</div>
          <div style="color: #064e3b; font-size: 24px; font-weight: 600;">${chatbot.totalLeads}</div>
        </div>
      </div>

      ${chatbot.ratingCount > 0 ? `
      <div style="background-color: #fffbeb; padding: 12px; border-radius: 6px; border-left: 3px solid #f59e0b; margin-bottom: 16px;">
        <div style="color: #92400e; font-size: 12px; margin-bottom: 4px;">Customer Satisfaction</div>
        <div style="color: #78350f; font-size: 20px; font-weight: 600;">${chatbot.averageRating.toFixed(1)} ⭐ <span style="font-size: 14px; font-weight: normal; color: #a16207;">(${chatbot.ratingCount} ratings)</span></div>
      </div>
      ` : ''}

      ${chatbot.topQuestions.length > 0 ? `
      <div>
        <h4 style="margin: 0 0 12px 0; color: #374151; font-size: 14px; font-weight: 600;">Top Questions</h4>
        <ul style="margin: 0; padding: 0; list-style: none;">
          ${chatbot.topQuestions.map((q, idx) => `
          <li style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #4b5563; font-size: 14px;">
            <span style="display: inline-block; width: 24px; height: 24px; background-color: #e5e7eb; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 600; color: #6b7280; margin-right: 8px;">${idx + 1}</span>
            ${q.question.length > 80 ? q.question.substring(0, 80) + '...' : q.question}
            <span style="color: #9ca3af; font-size: 12px; margin-left: 8px;">(${q.count}x)</span>
          </li>
          `).join('')}
        </ul>
      </div>
      ` : ''}
    </div>
    `).join('')}

    <!-- Footer -->
    <div style="padding: 24px; text-align: center; background-color: #f9fafb;">
      <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">This is your weekly automated report</p>
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">To manage your notification preferences, visit your account settings</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Send weekly report email to a user
 */
export async function sendWeeklyReport(userId: string, storage: IStorage): Promise<boolean> {
  try {
    if (!resend) {
      console.warn('[WeeklyReport] Resend API key not configured, skipping email');
      return false;
    }

    const reportData = await generateWeeklyReportData(userId, storage);
    
    if (!reportData) {
      console.log(`[WeeklyReport] No activity for user ${userId}, skipping report`);
      return false;
    }

    // Get notification settings for custom email
    const settings = await storage.getEmailNotificationSettings(userId);
    let recipientEmail = settings?.emailAddress || reportData.userEmail;
    
    // Check for admin-configured custom email override
    recipientEmail = await storage.getNotificationEmailForUser(userId, 'weekly_report', recipientEmail);

    const htmlContent = generateWeeklyReportEmail(reportData);

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const { getUncachableResendClient } = await import('./resend-client');
    const { client, fromEmail } = await getUncachableResendClient();

    const result = await client.emails.send({
      from: fromEmail,
      to: recipientEmail,
      subject: `Weekly Report: ${formatDate(reportData.weekStart)} - ${formatDate(reportData.weekEnd)}`,
      html: htmlContent,
    });

    console.log(`[WeeklyReport] Sent weekly report to ${recipientEmail}:`, result);
    return true;
  } catch (error) {
    console.error(`[WeeklyReport] Error sending weekly report to user ${userId}:`, error);
    return false;
  }
}

/**
 * Check and send weekly reports for all users who need them
 */
export async function checkAndSendWeeklyReports(storage: IStorage): Promise<void> {
  try {
    console.log('[WeeklyReport] Checking for users who need weekly reports...');

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get all users with weekly reports enabled who haven't received one in the last week
    const usersNeedingReports = await db.select({
      userId: emailNotificationSettings.userId,
      lastReportSent: emailNotificationSettings.lastWeeklyReportSent,
    })
      .from(emailNotificationSettings)
      .where(eq(emailNotificationSettings.enableWeeklyReports, "true"));

    const usersToSend = usersNeedingReports.filter(user => {
      if (!user.lastReportSent) return true; // Never sent, send now
      return user.lastReportSent < oneWeekAgo; // Last sent more than a week ago
    });

    console.log(`[WeeklyReport] Found ${usersToSend.length} users needing weekly reports`);

    for (const user of usersToSend) {
      const sent = await sendWeeklyReport(user.userId, storage);
      
      if (sent) {
        // Update last sent timestamp
        await db.update(emailNotificationSettings)
          .set({ lastWeeklyReportSent: now })
          .where(eq(emailNotificationSettings.userId, user.userId));
        
        console.log(`[WeeklyReport] Successfully sent and updated timestamp for user ${user.userId}`);
      }
    }

    console.log('[WeeklyReport] Finished checking weekly reports');
  } catch (error) {
    console.error('[WeeklyReport] Error checking weekly reports:', error);
  }
}
