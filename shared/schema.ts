import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
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

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const chatbots = pgTable("chatbots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  websiteUrls: text("website_urls").array().default(sql`ARRAY[]::text[]`),
  websiteContent: text("website_content"),
  documents: text("documents").array().default(sql`ARRAY[]::text[]`),
  systemPrompt: text("system_prompt").notNull(),
  primaryColor: text("primary_color").notNull().default("#0EA5E9"),
  accentColor: text("accent_color").notNull().default("#0284C7"),
  logoUrl: text("logo_url"),
  welcomeMessage: text("welcome_message").notNull().default("Hello! How can I help you today?"),
  suggestedQuestions: text("suggested_questions").array().default(sql`ARRAY[]::text[]`),
  supportPhoneNumber: text("support_phone_number"),
  escalationMessage: text("escalation_message").notNull().default("If you need more help, you can reach our team at {phone}."),
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
  systemPrompt: z.string().min(1, "System prompt is required"),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format"),
  accentColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format"),
  logoUrl: z.string().optional(),
  welcomeMessage: z.string().min(1, "Welcome message is required"),
  suggestedQuestions: z.array(z.string()).optional(),
  supportPhoneNumber: z.string().optional(),
  escalationMessage: z.string().min(1, "Escalation message is required"),
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
}
