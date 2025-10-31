import { type Chatbot, type InsertChatbot, chatbots, users, type User, type UpsertUser, type QaCache, type InsertQaCache, qaCache, type ManualQaOverride, type InsertManualQaOverride, manualQaOverrides } from "@shared/schema";
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
  findSimilarCachedAnswer(chatbotId: string, embedding: number[], threshold?: number): Promise<QaCache | undefined>;
  createCacheEntry(cacheEntry: InsertQaCache): Promise<QaCache>;
  updateCacheHitCount(cacheId: string): Promise<void>;
  getCacheStats(chatbotId: string): Promise<{ totalEntries: number; totalHits: number }>;
  clearChatbotCache(chatbotId: string): Promise<number>;
  
  // Manual Q&A Override operations
  getManualOverride(chatbotId: string, questionHash: string): Promise<ManualQaOverride | undefined>;
  getAllManualOverrides(chatbotId: string): Promise<ManualQaOverride[]>;
  createManualOverride(override: InsertManualQaOverride): Promise<ManualQaOverride>;
  updateManualOverride(id: string, manualAnswer: string): Promise<ManualQaOverride | undefined>;
  deleteManualOverride(id: string, userId: string): Promise<boolean>;
  incrementOverrideUseCount(id: string): Promise<void>;
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

  async findSimilarCachedAnswer(chatbotId: string, embedding: number[], threshold: number = 0.85): Promise<QaCache | undefined> {
    // Convert embedding array to PostgreSQL vector format: [0.1, 0.2, ...]
    const embeddingStr = `[${embedding.join(',')}]`;
    
    // Use pgvector's cosine distance operator (<=>)
    // Cosine distance = 1 - cosine similarity
    // So distance <= (1 - threshold) means similarity >= threshold
    const maxDistance = 1 - threshold;
    
    const result = await db
      .select()
      .from(qaCache)
      .where(
        and(
          eq(qaCache.chatbotId, chatbotId),
          sql`${qaCache.embedding} IS NOT NULL`,
          sql`${qaCache.embedding} <=> ${embeddingStr}::vector <= ${maxDistance}`
        )
      )
      .orderBy(sql`${qaCache.embedding} <=> ${embeddingStr}::vector`)
      .limit(1);
    
    return result[0];
  }

  async createCacheEntry(cacheEntry: InsertQaCache): Promise<QaCache> {
    // If embedding is provided as an array, convert it to pgvector format
    if (cacheEntry.embedding && Array.isArray(cacheEntry.embedding)) {
      const embeddingStr = `[${cacheEntry.embedding.join(',')}]`;
      
      // Build complete SQL statement with all values inline to avoid parameter mixing
      const suggestedQuestionsStr = cacheEntry.suggestedQuestions && cacheEntry.suggestedQuestions.length > 0
        ? `ARRAY[${cacheEntry.suggestedQuestions.map(q => `'${q.replace(/'/g, "''")}'`).join(',')}]::text[]`
        : 'ARRAY[]::text[]';
      
      const result = await db.execute(sql.raw(`
        INSERT INTO qa_cache (
          chatbot_id, question, question_hash, embedding, answer, 
          suggested_questions, hit_count, last_used_at, created_at
        )
        VALUES (
          '${cacheEntry.chatbotId}',
          '${cacheEntry.question.replace(/'/g, "''")}',
          '${cacheEntry.questionHash}',
          '${embeddingStr}'::vector,
          '${cacheEntry.answer.replace(/'/g, "''")}',
          ${suggestedQuestionsStr},
          '0',
          NOW(),
          NOW()
        )
        RETURNING *
      `));
      return result.rows[0] as QaCache;
    }
    
    // Fallback for null embedding or non-array (exact match only)
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

  // Manual Q&A Override operations
  async getManualOverride(chatbotId: string, questionHash: string): Promise<ManualQaOverride | undefined> {
    const result = await db
      .select()
      .from(manualQaOverrides)
      .where(
        and(
          eq(manualQaOverrides.chatbotId, chatbotId),
          eq(manualQaOverrides.questionHash, questionHash)
        )
      )
      .limit(1);
    return result[0];
  }

  async getAllManualOverrides(chatbotId: string): Promise<ManualQaOverride[]> {
    const result = await db
      .select()
      .from(manualQaOverrides)
      .where(eq(manualQaOverrides.chatbotId, chatbotId))
      .orderBy(desc(manualQaOverrides.createdAt));
    return result;
  }

  async createManualOverride(override: InsertManualQaOverride): Promise<ManualQaOverride> {
    const result = await db
      .insert(manualQaOverrides)
      .values(override)
      .returning();
    return result[0];
  }

  async updateManualOverride(id: string, manualAnswer: string): Promise<ManualQaOverride | undefined> {
    const result = await db
      .update(manualQaOverrides)
      .set({ 
        manualAnswer,
        updatedAt: new Date()
      })
      .where(eq(manualQaOverrides.id, id))
      .returning();
    return result[0];
  }

  async deleteManualOverride(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(manualQaOverrides)
      .where(
        and(
          eq(manualQaOverrides.id, id),
          eq(manualQaOverrides.createdBy, userId)
        )
      )
      .returning();
    return result.length > 0;
  }

  async incrementOverrideUseCount(id: string): Promise<void> {
    const current = await db
      .select({ useCount: manualQaOverrides.useCount })
      .from(manualQaOverrides)
      .where(eq(manualQaOverrides.id, id))
      .limit(1);
    
    if (current[0]) {
      const newCount = (parseInt(current[0].useCount) + 1).toString();
      await db
        .update(manualQaOverrides)
        .set({ useCount: newCount })
        .where(eq(manualQaOverrides.id, id));
    }
  }
}

export const storage = new DbStorage();
