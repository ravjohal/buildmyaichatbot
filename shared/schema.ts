import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, index, jsonb, vector, customType, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// Custom type for PostgreSQL tsvector
const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  password: varchar("password"), // For email/password auth (nullable for OAuth users)
  googleId: varchar("google_id").unique(), // For Google OAuth
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  subscriptionTier: varchar("subscription_tier", { enum: ["free", "starter", "business", "pro", "scale"] }).notNull().default("free"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  stripePriceId: varchar("stripe_price_id"), // Track which price plan they're on
  isAdmin: text("is_admin").notNull().default("false"),
  role: varchar("role", { enum: ["owner", "team_member"] }).notNull().default("owner"),
  parentUserId: varchar("parent_user_id").references((): any => users.id, { onDelete: "cascade" }),
  monthlyConversationCount: text("monthly_conversation_count").notNull().default("0"),
  conversationCountResetDate: timestamp("conversation_count_reset_date").defaultNow(),
  totalKnowledgeBaseSizeMB: text("total_knowledge_base_size_mb").notNull().default("0"),
  termsAcceptedAt: timestamp("terms_accepted_at"),
  privacyAcceptedAt: timestamp("privacy_accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type SubscriptionTier = "free" | "starter" | "business" | "pro" | "scale";

export const chatbots = pgTable("chatbots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  websiteUrls: text("website_urls").array().default(sql`ARRAY[]::text[]`),
  websiteContent: text("website_content"),
  documents: text("documents").array().default(sql`ARRAY[]::text[]`),
  documentContent: text("document_content"),
  documentMetadata: jsonb("document_metadata"),
  systemPrompt: text("system_prompt").notNull(),
  customInstructions: text("custom_instructions"), // User-defined rules and guidelines for AI behavior
  primaryColor: text("primary_color").notNull().default("#0EA5E9"),
  accentColor: text("accent_color").notNull().default("#0284C7"),
  logoUrl: text("logo_url"),
  welcomeMessage: text("welcome_message").notNull().default("Hello! How can I help you today?"),
  suggestedQuestions: text("suggested_questions").array().default(sql`ARRAY[]::text[]`),
  enableSuggestedQuestions: text("enable_suggested_questions").notNull().default("false"),
  supportPhoneNumber: text("support_phone_number"),
  escalationMessage: text("escalation_message").notNull().default("If you need more help, you can reach our team at {phone}."),
  questionCount: text("question_count").notNull().default("0"),
  // Feature 8: Lead Capture
  leadCaptureEnabled: text("lead_capture_enabled").notNull().default("false"),
  leadCaptureType: text("lead_capture_type").notNull().default("form"), // "form" or "external_link"
  leadCaptureExternalUrl: text("lead_capture_external_url"),
  leadCaptureFields: text("lead_capture_fields").array().default(sql`ARRAY['name', 'email']::text[]`),
  leadCaptureTitle: text("lead_capture_title").notNull().default("Get in Touch"),
  leadCaptureMessage: text("lead_capture_message").notNull().default("Leave your contact information and we'll get back to you."),
  leadCaptureTiming: text("lead_capture_timing").notNull().default("after_first_message"),
  leadCaptureMessageCount: text("lead_capture_message_count").notNull().default("1"),
  lastKnowledgeUpdate: timestamp("last_knowledge_update"),
  // Feature 9: Proactive Chat
  proactiveChatEnabled: text("proactive_chat_enabled").notNull().default("false"),
  proactiveChatDelay: text("proactive_chat_delay").notNull().default("5"), // seconds before popup
  proactiveChatMessage: text("proactive_chat_message").default("Hi! Need any help?"),
  proactiveChatTriggerUrls: text("proactive_chat_trigger_urls").array().default(sql`ARRAY[]::text[]`), // URL patterns for triggering
  // Live agent hours configuration
  liveAgentHoursEnabled: text("live_agent_hours_enabled").notNull().default("false"),
  liveAgentStartTime: text("live_agent_start_time").default("09:00"), // 24-hour format HH:MM
  liveAgentEndTime: text("live_agent_end_time").default("17:00"), // 24-hour format HH:MM
  liveAgentTimezone: text("live_agent_timezone").default("America/New_York"), // IANA timezone
  liveAgentDaysOfWeek: text("live_agent_days_of_week").array().default(sql`ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday']::text[]`),
  // Async indexing status
  indexingStatus: varchar("indexing_status", { enum: ["pending", "processing", "completed", "failed"] }).notNull().default("completed"),
  lastIndexingJobId: varchar("last_indexing_job_id"),
  // AI Model selection
  geminiModel: varchar("gemini_model", { enum: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-1.5-pro", "gemini-1.5-flash"] }).notNull().default("gemini-2.5-flash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertChatbotSchema = createInsertSchema(chatbots).omit({
  id: true,
  createdAt: true,
  userId: true, // userId will be added by the server from authenticated user
}).extend({
  name: z.string().min(1, "Chatbot name is required"),
  websiteUrls: z.array(z.string().url()).optional(),
  websiteContent: z.string().optional(),
  documents: z.array(z.string()).optional(),
  documentContent: z.string().optional(),
  systemPrompt: z.string().min(1, "System prompt is required"),
  customInstructions: z.string().optional(),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format"),
  accentColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format"),
  logoUrl: z.string().optional(),
  welcomeMessage: z.string().min(1, "Welcome message is required"),
  suggestedQuestions: z.array(z.string()).optional(),
  enableSuggestedQuestions: z.string().optional(),
  supportPhoneNumber: z.string().optional(),
  escalationMessage: z.string().min(1, "Escalation message is required"),
  leadCaptureEnabled: z.string().optional(),
  leadCaptureType: z.enum(["form", "external_link"]).optional(),
  leadCaptureExternalUrl: z.string().url().regex(/^https?:\/\//, "URL must start with http:// or https://").optional().or(z.literal("")),
  leadCaptureFields: z.array(z.string()).optional(),
  leadCaptureTitle: z.string().optional(),
  leadCaptureMessage: z.string().optional(),
  leadCaptureTiming: z.string().optional(),
  leadCaptureMessageCount: z.string().optional(),
  liveAgentHoursEnabled: z.string().optional(),
  liveAgentStartTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (use HH:MM)").optional(),
  liveAgentEndTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (use HH:MM)").optional(),
  liveAgentTimezone: z.string().optional(),
  liveAgentDaysOfWeek: z.array(z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"])).optional(),
  geminiModel: z.enum(["gemini-2.5-pro", "gemini-2.5-flash", "gemini-1.5-pro", "gemini-1.5-flash"]).optional(),
});

export type InsertChatbot = z.infer<typeof insertChatbotSchema>;
export type Chatbot = typeof chatbots.$inferSelect;

// Public chatbot type with runtime-computed AI questions (not stored in DB)
export type PublicChatbot = Chatbot & {
  aiGeneratedQuestions?: string[];
};

// Conversations table - tracks conversation sessions
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatbotId: varchar("chatbot_id").notNull().references(() => chatbots.id, { onDelete: "cascade" }),
  sessionId: varchar("session_id"), // For tracking widget sessions
  startedAt: timestamp("started_at").defaultNow().notNull(),
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
  messageCount: text("message_count").notNull().default("0"),
  wasEscalated: text("was_escalated").notNull().default("false"),
});

export type Conversation = typeof conversations.$inferSelect;

// Conversation messages table - stores individual messages
export const conversationMessages = pgTable("conversation_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: varchar("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  suggestedQuestions: text("suggested_questions").array().default(sql`ARRAY[]::text[]`),
  wasEscalated: text("was_escalated").notNull().default("false"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ConversationMessage = typeof conversationMessages.$inferSelect;

export const insertConversationMessageSchema = createInsertSchema(conversationMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertConversationMessage = z.infer<typeof insertConversationMessageSchema>;

// Chat message types (for real-time chat, not persisted directly)
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  suggestedQuestions?: string[];
  images?: Array<{
    url: string;
    altText?: string;
    caption?: string;
  }>;
}

export interface ChatRequest {
  chatbotId: string;
  message: string;
  conversationHistory: ChatMessage[];
  sessionId?: string; // Track widget sessions
}

export interface ChatResponse {
  message: string;
  shouldEscalate: boolean;
  suggestedQuestions?: string[];
  conversationId?: string;
}

// Leads table - stores captured lead information
export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatbotId: varchar("chatbot_id").notNull().references(() => chatbots.id, { onDelete: "cascade" }),
  conversationId: varchar("conversation_id").references(() => conversations.id, { onDelete: "set null" }),
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  message: text("message"),
  customFields: jsonb("custom_fields"),
  source: text("source").notNull().default("unknown"), // widget, direct_link, test, unknown
  sourceUrl: text("source_url"), // The referrer URL or page where lead was captured
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
});

export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;

// CRM Integrations - stores webhook configurations for sending leads to external CRMs
export const crmIntegrations = pgTable("crm_integrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatbotId: varchar("chatbot_id").notNull().references(() => chatbots.id, { onDelete: "cascade" }).unique(),
  enabled: text("enabled").notNull().default("false"), // "true" or "false"
  integrationType: text("integration_type").notNull().default("generic"), // "generic" or "hyphen"
  
  // Generic webhook fields (for any CRM via middleware)
  webhookUrl: text("webhook_url"),
  webhookMethod: text("webhook_method").notNull().default("POST"), // POST, PUT, PATCH
  authType: text("auth_type").notNull().default("none"), // none, bearer, api_key, basic
  authValue: text("auth_value"), // Encrypted auth token/key
  customHeaders: jsonb("custom_headers"), // Additional headers as JSON object
  fieldMapping: jsonb("field_mapping").notNull().default(sql`'{}'::jsonb`), // Maps lead fields to CRM fields
  
  // Hyphen CRM specific fields (for native integration)
  hyphenEndpoint: text("hyphen_endpoint"), // API_ENDPOINT from Hyphen
  hyphenBuilderId: text("hyphen_builder_id"), // HOMEBUILDER_ID
  hyphenUsername: text("hyphen_username"), // API_USERNAME
  hyphenApiKey: text("hyphen_api_key"), // API_KEY
  hyphenCommunityId: text("hyphen_community_id"), // Optional: default community ID
  hyphenSourceId: text("hyphen_source_id"), // Optional: default source ID
  hyphenGradeId: text("hyphen_grade_id"), // Optional: default grade ID
  hyphenInfluenceId: text("hyphen_influence_id"), // Optional: default influence ID
  hyphenContactMethodId: text("hyphen_contact_method_id"), // Optional: preferred contact method
  hyphenReference: text("hyphen_reference"), // Optional: reference field for ad tracking
  
  // Common fields
  retryEnabled: text("retry_enabled").notNull().default("true"),
  maxRetries: text("max_retries").notNull().default("3"),
  lastSyncedAt: timestamp("last_synced_at"),
  lastError: text("last_error"),
  successCount: text("success_count").notNull().default("0"),
  errorCount: text("error_count").notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCrmIntegrationSchema = createInsertSchema(crmIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastSyncedAt: true,
  lastError: true,
  successCount: true,
  errorCount: true,
}).refine(
  (data) => {
    // Strict numeric validation: must be all digits, no extra characters
    const isNumeric = /^\d+$/.test(data.maxRetries || "");
    if (!isNumeric) return false;
    const num = Number(data.maxRetries);
    return num >= 0 && num <= 10;
  },
  { message: "maxRetries must be a valid number between 0 and 10", path: ["maxRetries"] }
).refine(
  (data) => {
    // Generic type requires webhookUrl
    if (data.integrationType === "generic") {
      if (!data.webhookUrl) return false;
      try {
        new URL(data.webhookUrl);
        return true;
      } catch {
        return false;
      }
    }
    return true;
  },
  { message: "webhookUrl is required and must be a valid URL for generic integration", path: ["webhookUrl"] }
).refine(
  (data) => {
    // Hyphen type requires specific credentials
    if (data.integrationType === "hyphen") {
      return !!(data.hyphenEndpoint && data.hyphenBuilderId && data.hyphenUsername && data.hyphenApiKey);
    }
    return true;
  },
  { message: "Hyphen integration requires endpoint, builder ID, username, and API key", path: ["hyphenEndpoint"] }
);

export type CrmIntegration = typeof crmIntegrations.$inferSelect;
export type InsertCrmIntegration = z.infer<typeof insertCrmIntegrationSchema>;

// Keyword Alerts - configuration for monitoring specific keywords in conversations
export const keywordAlerts = pgTable("keyword_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatbotId: varchar("chatbot_id").notNull().references(() => chatbots.id, { onDelete: "cascade" }).unique(),
  enabled: text("enabled").notNull().default("false"), // "true" or "false"
  keywords: text("keywords").array().default(sql`ARRAY[]::text[]`), // List of keywords to monitor (case-insensitive)
  inAppNotifications: text("in_app_notifications").notNull().default("true"), // Show in-app notifications
  emailNotifications: text("email_notifications").notNull().default("false"), // Send email notifications
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertKeywordAlertSchema = createInsertSchema(keywordAlerts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type KeywordAlert = typeof keywordAlerts.$inferSelect;
export type InsertKeywordAlert = z.infer<typeof insertKeywordAlertSchema>;

// Keyword Alert Triggers - records when keywords are detected in conversations
export const keywordAlertTriggers = pgTable("keyword_alert_triggers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatbotId: varchar("chatbot_id").notNull().references(() => chatbots.id, { onDelete: "cascade" }),
  conversationId: varchar("conversation_id").references(() => conversations.id, { onDelete: "set null" }),
  keyword: text("keyword").notNull(), // The specific keyword that triggered the alert
  messageContent: text("message_content").notNull(), // The visitor message that contained the keyword
  visitorName: text("visitor_name"), // Name of visitor if available from lead capture
  visitorEmail: text("visitor_email"), // Email of visitor if available
  read: text("read").notNull().default("false"), // Whether the alert has been acknowledged
  triggeredAt: timestamp("triggered_at").defaultNow().notNull(),
});

export const insertKeywordAlertTriggerSchema = createInsertSchema(keywordAlertTriggers).omit({
  id: true,
  triggeredAt: true,
});

export type KeywordAlertTrigger = typeof keywordAlertTriggers.$inferSelect;
export type InsertKeywordAlertTrigger = z.infer<typeof insertKeywordAlertTriggerSchema>;

// URL Crawl Metadata - tracks when URLs were last crawled and their content hash for change detection
export const urlCrawlMetadata = pgTable("url_crawl_metadata", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatbotId: varchar("chatbot_id").notNull().references(() => chatbots.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  contentHash: text("content_hash").notNull(), // MD5 hash of crawled content
  lastCrawledAt: timestamp("last_crawled_at").defaultNow().notNull(),
  lastModified: text("last_modified"), // Store HTTP Last-Modified header if available
  etag: text("etag"), // Store HTTP ETag if available for efficient change detection
});

export type UrlCrawlMetadata = typeof urlCrawlMetadata.$inferSelect;
export type InsertUrlCrawlMetadata = typeof urlCrawlMetadata.$inferInsert;

// Q&A Cache - stores question-answer pairs to reduce LLM API calls
export const qaCache = pgTable("qa_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatbotId: varchar("chatbot_id").notNull().references(() => chatbots.id, { onDelete: "cascade" }),
  question: text("question").notNull(), // Normalized question for exact matching
  questionHash: text("question_hash").notNull(), // MD5 hash for fast lookups
  embedding: vector("embedding", { dimensions: 384 }), // Semantic embedding for similarity search
  answer: text("answer").notNull(),
  suggestedQuestions: text("suggested_questions").array().default(sql`ARRAY[]::text[]`),
  hitCount: text("hit_count").notNull().default("0"), // Track how many times this cache entry was used
  lastUsedAt: timestamp("last_used_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertQaCacheSchema = createInsertSchema(qaCache).omit({
  id: true,
  createdAt: true,
  hitCount: true,
});

export type QaCache = typeof qaCache.$inferSelect;
export type InsertQaCache = z.infer<typeof insertQaCacheSchema>;

// Manual Q&A Overrides - stores manually corrected/trained answers
export const manualQaOverrides = pgTable("manual_qa_overrides", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatbotId: varchar("chatbot_id").notNull().references(() => chatbots.id, { onDelete: "cascade" }),
  question: text("question").notNull(), // Normalized question
  questionHash: text("question_hash").notNull(), // MD5 hash for fast lookups
  embedding: vector("embedding", { dimensions: 384 }), // Semantic embedding for similarity search (same as cache)
  manualAnswer: text("manual_answer").notNull(), // Human-corrected answer
  originalAnswer: text("original_answer"), // Original AI answer (for reference)
  conversationId: varchar("conversation_id").references(() => conversations.id, { onDelete: "set null" }), // Link to source conversation
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "cascade" }), // User who created override
  useCount: text("use_count").notNull().default("0"), // Track how many times this override was used
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertManualQaOverrideSchema = createInsertSchema(manualQaOverrides).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  useCount: true,
});

export type ManualQaOverride = typeof manualQaOverrides.$inferSelect;
export type InsertManualQaOverride = z.infer<typeof insertManualQaOverrideSchema>;

// Conversation Satisfaction Ratings (Feature 3)
export const conversationRatings = pgTable("conversation_ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  rating: text("rating", { enum: ["1", "2", "3", "4", "5"] }).notNull(), // 1-5 stars
  feedback: text("feedback"), // Optional text feedback
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ConversationRating = typeof conversationRatings.$inferSelect;
export type InsertConversationRating = typeof conversationRatings.$inferInsert;

// Email Notification Settings (Feature 13)
export const emailNotificationSettings = pgTable("email_notification_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  enableNewLeadNotifications: text("enable_new_lead_notifications").notNull().default("true"),
  enableUnansweredQuestionNotifications: text("enable_unanswered_question_notifications").notNull().default("true"),
  unansweredThresholdMinutes: text("unanswered_threshold_minutes").notNull().default("30"), // Alert if no response within X minutes
  enableWeeklyReports: text("enable_weekly_reports").notNull().default("true"),
  lastWeeklyReportSent: timestamp("last_weekly_report_sent"),
  emailAddress: text("email_address"), // Custom email, defaults to user.email
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type EmailNotificationSettings = typeof emailNotificationSettings.$inferSelect;
export type InsertEmailNotificationSettings = typeof emailNotificationSettings.$inferInsert;

// Conversation Flow Builder (Feature 5)
export const conversationFlows = pgTable("conversation_flows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatbotId: varchar("chatbot_id").notNull().references(() => chatbots.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  isActive: text("is_active").notNull().default("false"),
  flowData: jsonb("flow_data").notNull(), // { nodes: [], edges: [] }
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ConversationFlow = typeof conversationFlows.$inferSelect;
export type InsertConversationFlow = typeof conversationFlows.$inferInsert;

// Knowledge Chunks - stores content in semantic chunks for efficient retrieval
export const knowledgeChunks = pgTable("knowledge_chunks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatbotId: varchar("chatbot_id").notNull().references(() => chatbots.id, { onDelete: "cascade" }),
  sourceType: varchar("source_type", { enum: ["website", "document"] }).notNull(),
  sourceUrl: text("source_url").notNull(), // URL or document path
  sourceTitle: text("source_title"), // Page title or document name
  chunkText: text("chunk_text").notNull(), // The actual chunk content
  chunkIndex: text("chunk_index").notNull(), // Position in source (0, 1, 2, ...)
  contentHash: text("content_hash").notNull(), // MD5 hash for change detection
  embedding: vector("embedding", { dimensions: 384 }), // Semantic embedding for retrieval
  searchVector: tsvector("search_vector"), // Full-text search vector for lexical retrieval
  metadata: jsonb("metadata"), // Additional info: { headings: [], keywords: [], etc. }
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertKnowledgeChunkSchema = createInsertSchema(knowledgeChunks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type KnowledgeChunk = typeof knowledgeChunks.$inferSelect;
export type InsertKnowledgeChunk = z.infer<typeof insertKnowledgeChunkSchema>;

// Chatbot Suggested Questions - AI-generated questions about website content
export const chatbotSuggestedQuestions = pgTable("chatbot_suggested_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatbotId: varchar("chatbot_id").notNull().references(() => chatbots.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  usageCount: text("usage_count").notNull().default("0"),
  isActive: text("is_active").notNull().default("true"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ChatbotSuggestedQuestion = typeof chatbotSuggestedQuestions.$inferSelect;
export type InsertChatbotSuggestedQuestion = typeof chatbotSuggestedQuestions.$inferInsert;

// Indexing Jobs - tracks async background indexing processes
export const indexingJobs = pgTable("indexing_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatbotId: varchar("chatbot_id").notNull().references(() => chatbots.id, { onDelete: "cascade" }),
  status: varchar("status", { enum: ["pending", "processing", "completed", "failed", "partial", "cancelled"] }).notNull().default("pending"),
  totalTasks: text("total_tasks").notNull().default("0"), // Total number of tasks (URLs + documents)
  completedTasks: text("completed_tasks").notNull().default("0"),
  failedTasks: text("failed_tasks").notNull().default("0"),
  cancelledTasks: text("cancelled_tasks").notNull().default("0"),
  errorMessage: text("error_message"), // Overall job error if completely failed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  cancelledAt: timestamp("cancelled_at"),
});

export type IndexingJob = typeof indexingJobs.$inferSelect;
export type InsertIndexingJob = typeof indexingJobs.$inferInsert;

// Indexing Tasks - individual tasks within an indexing job (one per URL or document)
export const indexingTasks = pgTable("indexing_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => indexingJobs.id, { onDelete: "cascade" }),
  chatbotId: varchar("chatbot_id").notNull().references(() => chatbots.id, { onDelete: "cascade" }),
  sourceType: varchar("source_type", { enum: ["website", "document"] }).notNull(),
  sourceUrl: text("source_url").notNull(), // URL or document path
  status: varchar("status", { enum: ["pending", "processing", "completed", "failed", "cancelled"] }).notNull().default("pending"),
  retryCount: text("retry_count").notNull().default("0"),
  chunksCreated: text("chunks_created").notNull().default("0"), // Number of chunks created from this source
  errorMessage: text("error_message"), // Error for this specific task
  createdAt: timestamp("created_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  cancelledAt: timestamp("cancelled_at"),
});

export type IndexingTask = typeof indexingTasks.$inferSelect;
export type InsertIndexingTask = typeof indexingTasks.$inferInsert;

// Password Reset Tokens - for forgot password functionality
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: text("used").notNull().default("false"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

// Live Agent Handoffs - tracks when visitors request human help
export const liveAgentHandoffs = pgTable("live_agent_handoffs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  chatbotId: varchar("chatbot_id").notNull().references(() => chatbots.id, { onDelete: "cascade" }),
  sessionId: varchar("session_id").notNull(),
  status: varchar("status", { enum: ["pending", "active", "resolved", "missed"] }).notNull().default("pending"),
  agentId: varchar("agent_id").references(() => users.id, { onDelete: "set null" }),
  visitorName: text("visitor_name"),
  visitorEmail: text("visitor_email"),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  acceptedAt: timestamp("accepted_at"),
  resolvedAt: timestamp("resolved_at"),
  resolutionNotes: text("resolution_notes"),
});

export const insertLiveAgentHandoffSchema = createInsertSchema(liveAgentHandoffs).omit({
  id: true,
  requestedAt: true,
});

export type LiveAgentHandoff = typeof liveAgentHandoffs.$inferSelect;
export type InsertLiveAgentHandoff = z.infer<typeof insertLiveAgentHandoffSchema>;

// Agent Messages - messages sent by agents during live chat
export const agentMessages = pgTable("agent_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  handoffId: varchar("handoff_id").notNull().references(() => liveAgentHandoffs.id, { onDelete: "cascade" }),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  agentId: varchar("agent_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAgentMessageSchema = createInsertSchema(agentMessages).omit({
  id: true,
  createdAt: true,
});

export type AgentMessage = typeof agentMessages.$inferSelect;
export type InsertAgentMessage = z.infer<typeof insertAgentMessageSchema>;

// Team Invitations - for inviting team members to act as agents
export const teamInvitations = pgTable("team_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invitedBy: varchar("invited_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  email: varchar("email").notNull(),
  role: varchar("role", { enum: ["team_member"] }).notNull().default("team_member"),
  token: varchar("token").notNull().unique(),
  status: varchar("status", { enum: ["pending", "accepted", "expired"] }).notNull().default("pending"),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTeamInvitationSchema = createInsertSchema(teamInvitations).omit({
  id: true,
  createdAt: true,
  token: true,
});

export type TeamInvitation = typeof teamInvitations.$inferSelect;
export type InsertTeamInvitation = z.infer<typeof insertTeamInvitationSchema>;

// Team Member Permissions - granular access control for team members
export const teamMemberPermissions = pgTable("team_member_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  canViewAnalytics: text("can_view_analytics").notNull().default("true"),
  canManageChatbots: text("can_manage_chatbots").notNull().default("false"),
  canRespondToChats: text("can_respond_to_chats").notNull().default("true"),
  canViewLeads: text("can_view_leads").notNull().default("true"),
  canManageTeam: text("can_manage_team").notNull().default("false"),
  canAccessSettings: text("can_access_settings").notNull().default("false"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTeamMemberPermissionsSchema = createInsertSchema(teamMemberPermissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type TeamMemberPermissions = typeof teamMemberPermissions.$inferSelect;
export type InsertTeamMemberPermissions = z.infer<typeof insertTeamMemberPermissionsSchema>;

// Team member limits by subscription tier
export const TEAM_MEMBER_LIMITS = {
  free: 0, // Free tier cannot have team members
  starter: 3,
  business: 10,
  pro: 10,
  scale: -1, // Unlimited (-1 means no limit)
} as const;

// Scraped Images - stores images extracted from knowledge base sources
export const scrapedImages = pgTable("scraped_images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatbotId: varchar("chatbot_id").notNull().references(() => chatbots.id, { onDelete: "cascade" }),
  sourceUrl: text("source_url").notNull(), // The page URL where image was found
  imageUrl: text("image_url").notNull(), // The actual image URL (absolute)
  altText: text("alt_text"), // Alt attribute from img tag
  caption: text("caption"), // Caption or surrounding text context
  embedding: vector("embedding", { dimensions: 384 }), // Semantic embedding for alt text/caption
  metadata: jsonb("metadata"), // Additional info: { width, height, format, etc. }
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertScrapedImageSchema = createInsertSchema(scrapedImages).omit({
  id: true,
  createdAt: true,
});

export type ScrapedImage = typeof scrapedImages.$inferSelect;
export type InsertScrapedImage = z.infer<typeof insertScrapedImageSchema>;

// Blog Posts - for marketing content
export const blogPosts = pgTable("blog_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  slug: varchar("slug").notNull().unique(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(),
  author: varchar("author").notNull().default("BuildMyChatbot.Ai Team"),
  publishedAt: timestamp("published_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  metaDescription: text("meta_description"),
  metaKeywords: text("meta_keywords"),
  readTimeMinutes: text("read_time_minutes").notNull().default("5"),
  published: boolean("published").notNull().default(false),
});

export const insertBlogPostSchema = createInsertSchema(blogPosts).omit({
  id: true,
});

export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
