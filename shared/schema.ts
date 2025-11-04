import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, index, jsonb, vector, customType } from "drizzle-orm/pg-core";
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
  subscriptionTier: varchar("subscription_tier", { enum: ["free", "pro", "scale"] }).notNull().default("free"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  stripePriceId: varchar("stripe_price_id"), // Track which price plan they're on
  isAdmin: text("is_admin").notNull().default("false"),
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
export type SubscriptionTier = "free" | "pro" | "scale";

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
  primaryColor: text("primary_color").notNull().default("#0EA5E9"),
  accentColor: text("accent_color").notNull().default("#0284C7"),
  logoUrl: text("logo_url"),
  welcomeMessage: text("welcome_message").notNull().default("Hello! How can I help you today?"),
  suggestedQuestions: text("suggested_questions").array().default(sql`ARRAY[]::text[]`),
  enableSuggestedQuestions: text("enable_suggested_questions").notNull().default("false"),
  supportPhoneNumber: text("support_phone_number"),
  escalationMessage: text("escalation_message").notNull().default("If you need more help, you can reach our team at {phone}."),
  questionCount: text("question_count").notNull().default("0"),
  leadCaptureEnabled: text("lead_capture_enabled").notNull().default("false"),
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
  // Async indexing status
  indexingStatus: varchar("indexing_status", { enum: ["pending", "processing", "completed", "failed"] }).notNull().default("completed"),
  lastIndexingJobId: varchar("last_indexing_job_id"),
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
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format"),
  accentColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format"),
  logoUrl: z.string().optional(),
  welcomeMessage: z.string().min(1, "Welcome message is required"),
  suggestedQuestions: z.array(z.string()).optional(),
  enableSuggestedQuestions: z.string().optional(),
  supportPhoneNumber: z.string().optional(),
  escalationMessage: z.string().min(1, "Escalation message is required"),
  leadCaptureEnabled: z.string().optional(),
  leadCaptureFields: z.array(z.string()).optional(),
  leadCaptureTitle: z.string().optional(),
  leadCaptureMessage: z.string().optional(),
  leadCaptureTiming: z.string().optional(),
  leadCaptureMessageCount: z.string().optional(),
});

export type InsertChatbot = z.infer<typeof insertChatbotSchema>;
export type Chatbot = typeof chatbots.$inferSelect;

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
