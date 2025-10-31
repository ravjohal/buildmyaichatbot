import { type Chatbot, type InsertChatbot, chatbots, users, type User, type UpsertUser, type QaCache, type InsertQaCache, qaCache } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

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
  
  // QA Cache operations
  getCachedAnswer(chatbotId: string, questionHash: string): Promise<QaCache | undefined>;
  createCacheEntry(cacheEntry: InsertQaCache): Promise<QaCache>;
  updateCacheHitCount(cacheId: string): Promise<void>;
  getCacheStats(chatbotId: string): Promise<{ totalEntries: number; totalHits: number }>;
  clearChatbotCache(chatbotId: string): Promise<number>;
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

  // QA Cache operations
  async getCachedAnswer(chatbotId: string, questionHash: string): Promise<QaCache | undefined> {
    const result = await db
      .select()
      .from(qaCache)
      .where(and(eq(qaCache.chatbotId, chatbotId), eq(qaCache.questionHash, questionHash)))
      .limit(1);
    return result[0];
  }

  async createCacheEntry(cacheEntry: InsertQaCache): Promise<QaCache> {
    const result = await db
      .insert(qaCache)
      .values(cacheEntry)
      .returning();
    return result[0];
  }

  async updateCacheHitCount(cacheId: string): Promise<void> {
    const current = await db
      .select({ hitCount: qaCache.hitCount })
      .from(qaCache)
      .where(eq(qaCache.id, cacheId))
      .limit(1);
    
    if (current[0]) {
      const newCount = (parseInt(current[0].hitCount) + 1).toString();
      await db
        .update(qaCache)
        .set({ 
          hitCount: newCount,
          lastUsedAt: new Date()
        })
        .where(eq(qaCache.id, cacheId));
    }
  }

  async getCacheStats(chatbotId: string): Promise<{ totalEntries: number; totalHits: number }> {
    const result = await db
      .select({
        totalEntries: sql<number>`count(*)`,
        totalHits: sql<number>`sum(cast(${qaCache.hitCount} as integer))`,
      })
      .from(qaCache)
      .where(eq(qaCache.chatbotId, chatbotId));
    
    return {
      totalEntries: Number(result[0]?.totalEntries || 0),
      totalHits: Number(result[0]?.totalHits || 0),
    };
  }

  async clearChatbotCache(chatbotId: string): Promise<number> {
    const result = await db
      .delete(qaCache)
      .where(eq(qaCache.chatbotId, chatbotId))
      .returning();
    return result.length;
  }
}

export const storage = new DbStorage();
