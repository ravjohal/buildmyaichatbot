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
  websiteUrl: text("website_url"),
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
  websiteUrl: z.string().url().optional().or(z.literal("")),
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

// Chat message types (not persisted to database in MVP)
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface ChatRequest {
  chatbotId: string;
  message: string;
  conversationHistory: ChatMessage[];
}

export interface ChatResponse {
  message: string;
  shouldEscalate: boolean;
}
