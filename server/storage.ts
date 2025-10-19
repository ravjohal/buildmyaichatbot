import { type Chatbot, type InsertChatbot, chatbots, users, type User, type UpsertUser } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateStripeCustomerId(userId: string, stripeCustomerId: string): Promise<User>;
  updateStripeSubscriptionId(userId: string, stripeSubscriptionId: string): Promise<User>;
  updateSubscriptionTier(userId: string, tier: "free" | "paid"): Promise<User>;
  
  // Chatbot operations (user-scoped)
  getAllChatbots(userId: string): Promise<Chatbot[]>;
  getChatbot(id: string, userId: string): Promise<Chatbot | undefined>;
  createChatbot(chatbot: InsertChatbot, userId: string): Promise<Chatbot>;
  updateChatbot(id: string, userId: string, chatbot: Partial<InsertChatbot>): Promise<Chatbot | undefined>;
  deleteChatbot(id: string, userId: string): Promise<boolean>;
  incrementChatbotQuestionCount(chatbotId: string): Promise<void>;
}

export class DbStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return result[0];
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const result = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result[0];
  }

  async updateStripeCustomerId(userId: string, stripeCustomerId: string): Promise<User> {
    const result = await db
      .update(users)
      .set({ stripeCustomerId, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  async updateStripeSubscriptionId(userId: string, stripeSubscriptionId: string): Promise<User> {
    const result = await db
      .update(users)
      .set({ stripeSubscriptionId, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  async updateSubscriptionTier(userId: string, tier: "free" | "paid"): Promise<User> {
    const result = await db
      .update(users)
      .set({ subscriptionTier: tier, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  // Chatbot operations (user-scoped)
  async getAllChatbots(userId: string): Promise<Chatbot[]> {
    return await db
      .select()
      .from(chatbots)
      .where(eq(chatbots.userId, userId))
      .orderBy(desc(chatbots.createdAt));
  }

  async getChatbot(id: string, userId: string): Promise<Chatbot | undefined> {
    const result = await db
      .select()
      .from(chatbots)
      .where(and(eq(chatbots.id, id), eq(chatbots.userId, userId)))
      .limit(1);
    return result[0];
  }

  async createChatbot(insertChatbot: InsertChatbot, userId: string): Promise<Chatbot> {
    const result = await db
      .insert(chatbots)
      .values({ ...insertChatbot, userId })
      .returning();
    return result[0];
  }

  async updateChatbot(id: string, userId: string, updates: Partial<InsertChatbot>): Promise<Chatbot | undefined> {
    const result = await db
      .update(chatbots)
      .set(updates)
      .where(and(eq(chatbots.id, id), eq(chatbots.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteChatbot(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(chatbots)
      .where(and(eq(chatbots.id, id), eq(chatbots.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async incrementChatbotQuestionCount(chatbotId: string): Promise<void> {
    // Get current count
    const current = await db
      .select({ questionCount: chatbots.questionCount })
      .from(chatbots)
      .where(eq(chatbots.id, chatbotId))
      .limit(1);
    
    if (current[0]) {
      const newCount = (parseInt(current[0].questionCount) + 1).toString();
      await db
        .update(chatbots)
        .set({ questionCount: newCount })
        .where(eq(chatbots.id, chatbotId));
    }
  }
}

export const storage = new DbStorage();
