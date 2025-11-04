import { type Chatbot, type InsertChatbot, chatbots, users, type User, type UpsertUser, type QaCache, type InsertQaCache, qaCache, type ManualQaOverride, type InsertManualQaOverride, manualQaOverrides, type ConversationRating, type InsertConversationRating, conversationRatings, type EmailNotificationSettings, type InsertEmailNotificationSettings, emailNotificationSettings, type ConversationFlow, type InsertConversationFlow, conversationFlows, type KnowledgeChunk, type InsertKnowledgeChunk, knowledgeChunks, type IndexingJob, type InsertIndexingJob, indexingJobs, type IndexingTask, type InsertIndexingTask, indexingTasks, chatbotSuggestedQuestions } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateStripeCustomerId(userId: string, stripeCustomerId: string): Promise<User>;
  updateStripeSubscriptionId(userId: string, stripeSubscriptionId: string): Promise<User>;
  updateSubscriptionTier(userId: string, tier: "free" | "pro" | "scale"): Promise<User>;
  updateStripePriceId(userId: string, stripePriceId: string): Promise<User>;
  incrementMonthlyConversationCount(userId: string): Promise<User>;
  updateKnowledgeBaseSize(userId: string, sizeDeltaMB: number): Promise<User>;
  atomicCheckAndUpdateKnowledgeBaseSize(userId: string, sizeDeltaMB: number, limitMB: number): Promise<{ success: boolean; currentSizeMB: number; error?: string }>;
  
  // Chatbot operations (user-scoped)
  getAllChatbots(userId: string): Promise<Chatbot[]>;
  getChatbot(id: string, userId: string): Promise<Chatbot | undefined>;
  getChatbotById(id: string): Promise<Chatbot | undefined>; // System operation - no user scoping
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
  findSimilarManualOverride(chatbotId: string, embedding: number[], threshold?: number): Promise<ManualQaOverride | undefined>;
  
  // Conversation Rating operations (Feature 3)
  createConversationRating(rating: InsertConversationRating): Promise<ConversationRating>;
  getConversationRating(conversationId: string): Promise<ConversationRating | undefined>;
  getAverageRatingForChatbot(chatbotId: string): Promise<number>;
  
  // Email Notification Settings operations (Feature 13)
  getEmailNotificationSettings(userId: string): Promise<EmailNotificationSettings | undefined>;
  createEmailNotificationSettings(settings: InsertEmailNotificationSettings): Promise<EmailNotificationSettings>;
  updateEmailNotificationSettings(userId: string, settings: Partial<InsertEmailNotificationSettings>): Promise<EmailNotificationSettings | undefined>;
  
  // Conversation Flow operations (Feature 5)
  getConversationFlows(chatbotId: string): Promise<ConversationFlow[]>;
  getConversationFlow(id: string): Promise<ConversationFlow | undefined>;
  getActiveConversationFlow(chatbotId: string): Promise<ConversationFlow | undefined>;
  createConversationFlow(flow: InsertConversationFlow): Promise<ConversationFlow>;
  updateConversationFlow(id: string, updates: Partial<InsertConversationFlow>): Promise<ConversationFlow | undefined>;
  deleteConversationFlow(id: string): Promise<boolean>;
  
  // Knowledge Chunk operations (Phase 2)
  createKnowledgeChunks(chunks: InsertKnowledgeChunk[]): Promise<KnowledgeChunk[]>;
  getTopKRelevantChunks(chatbotId: string, questionEmbedding: number[], k?: number): Promise<KnowledgeChunk[]>;
  deleteChunksForChatbot(chatbotId: string): Promise<number>;
  deleteChunksForSource(chatbotId: string, sourceUrl: string): Promise<number>;
  countChunksForChatbot(chatbotId: string): Promise<number>;
  
  // Indexing Job operations (Async processing)
  createIndexingJob(chatbotId: string, totalTasks: number): Promise<IndexingJob>;
  getIndexingJob(jobId: string): Promise<IndexingJob | undefined>;
  getLatestIndexingJob(chatbotId: string): Promise<IndexingJob | undefined>;
  updateIndexingJobStatus(jobId: string, status: string, errorMessage?: string): Promise<void>;
  updateIndexingJobProgress(jobId: string, completedTasks: number, failedTasks: number): Promise<void>;
  completeIndexingJob(jobId: string): Promise<void>;
  
  // Indexing Task operations
  createIndexingTasks(tasks: InsertIndexingTask[]): Promise<IndexingTask[]>;
  getPendingIndexingTasks(jobId: string, limit?: number): Promise<IndexingTask[]>;
  updateIndexingTaskStatus(taskId: string, status: string, errorMessage?: string, chunksCreated?: number): Promise<void>;
  incrementTaskRetryCount(taskId: string): Promise<void>;
  getIndexingTasksForJob(jobId: string): Promise<IndexingTask[]>;
  
  // Chatbot indexing status operations
  updateChatbotIndexingStatus(chatbotId: string, status: string, jobId?: string): Promise<void>;
  
  // Chatbot Suggested Questions operations
  replaceSuggestedQuestions(chatbotId: string, questions: string[]): Promise<void>;
  getRandomSuggestedQuestions(chatbotId: string, count?: number): Promise<string[]>;
  incrementQuestionUsage(chatbotId: string, questionText: string): Promise<void>;
  
  // Knowledge Chunks operations
  getKnowledgeChunksForChatbot(chatbotId: string): Promise<Array<{
    id: string;
    chunkText: string;
    sourceUrl: string;
    sourceTitle: string | null;
    sourceType: "website" | "document";
  }>>;
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

  async updateStripePriceId(userId: string, stripePriceId: string): Promise<User> {
    const result = await db
      .update(users)
      .set({ stripePriceId, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  async updateSubscriptionTier(userId: string, tier: "free" | "pro" | "scale"): Promise<User> {
    const result = await db
      .update(users)
      .set({ subscriptionTier: tier, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  async incrementMonthlyConversationCount(userId: string): Promise<User> {
    // Get current user data
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (!userResult[0]) {
      throw new Error("User not found");
    }
    
    const user = userResult[0];
    const now = new Date();
    const resetDate = user.conversationCountResetDate ? new Date(user.conversationCountResetDate) : new Date(0);
    
    // Check if we need to reset the counter (new month)
    const shouldReset = 
      now.getMonth() !== resetDate.getMonth() || 
      now.getFullYear() !== resetDate.getFullYear();
    
    const newCount = shouldReset ? "1" : (parseInt(user.monthlyConversationCount || "0") + 1).toString();
    const newResetDate = shouldReset ? now : resetDate;
    
    const result = await db
      .update(users)
      .set({ 
        monthlyConversationCount: newCount,
        conversationCountResetDate: newResetDate,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    
    return result[0];
  }

  async updateKnowledgeBaseSize(userId: string, sizeDeltaMB: number): Promise<User> {
    // Get current size
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (!userResult[0]) {
      throw new Error("User not found");
    }
    
    const currentSize = parseFloat(userResult[0].totalKnowledgeBaseSizeMB || "0");
    const newSize = Math.max(0, currentSize + sizeDeltaMB).toFixed(2);
    
    const result = await db
      .update(users)
      .set({ 
        totalKnowledgeBaseSizeMB: newSize,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    
    return result[0];
  }
  
  async atomicCheckAndUpdateKnowledgeBaseSize(
    userId: string, 
    sizeDeltaMB: number, 
    limitMB: number
  ): Promise<{ success: boolean; currentSizeMB: number; error?: string }> {
    // Get current size
    const userResult = await db
      .select({ currentSize: users.totalKnowledgeBaseSizeMB })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (!userResult[0]) {
      return { success: false, currentSizeMB: 0, error: "User not found" };
    }
    
    const currentSize = parseFloat(userResult[0].currentSize || "0");
    const newSize = currentSize + sizeDeltaMB;
    
    // Check if update would exceed limit
    if (newSize > limitMB) {
      return { 
        success: false, 
        currentSizeMB: currentSize,
        error: `Would exceed limit of ${limitMB}MB (current: ${currentSize.toFixed(2)}MB, adding: ${sizeDeltaMB.toFixed(2)}MB)`
      };
    }
    
    // Atomic update using SQL - both check and update use database's current value
    const result = await db
      .update(users)
      .set({ 
        totalKnowledgeBaseSizeMB: sql`CAST(GREATEST(0, CAST(COALESCE(${users.totalKnowledgeBaseSizeMB}, '0') AS DECIMAL) + ${sizeDeltaMB}) AS VARCHAR)`,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(users.id, userId),
          // Only update if current size + delta <= limit (atomic check)
          sql`CAST(COALESCE(${users.totalKnowledgeBaseSizeMB}, '0') AS DECIMAL) + ${sizeDeltaMB} <= ${limitMB}`
        )
      )
      .returning({ newSize: users.totalKnowledgeBaseSizeMB });
    
    if (result.length === 0) {
      // Update failed - limit would be exceeded (race condition caught)
      return { 
        success: false, 
        currentSizeMB: currentSize,
        error: `Concurrent update detected: limit would be exceeded`
      };
    }
    
    return { 
      success: true, 
      currentSizeMB: parseFloat(result[0].newSize || "0")
    };
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
  
  async getChatbotById(id: string): Promise<Chatbot | undefined> {
    const result = await db
      .select()
      .from(chatbots)
      .where(eq(chatbots.id, id))
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

  async findSimilarManualOverride(
    chatbotId: string,
    questionEmbedding: number[],
    similarityThreshold: number = 0.85
  ): Promise<ManualQaOverride | undefined> {
    const embeddingStr = `[${questionEmbedding.join(",")}]`;
    const result = await db.execute<ManualQaOverride>(
      sql`
        SELECT *
        FROM ${manualQaOverrides}
        WHERE ${manualQaOverrides.chatbotId} = ${chatbotId}
          AND ${manualQaOverrides.embedding} IS NOT NULL
          AND 1 - (${manualQaOverrides.embedding} <=> ${embeddingStr}::vector) >= ${similarityThreshold}
        ORDER BY ${manualQaOverrides.embedding} <=> ${embeddingStr}::vector
        LIMIT 1
      `
    );
    return result.rows[0];
  }

  // Conversation Rating operations (Feature 3)
  async createConversationRating(rating: InsertConversationRating): Promise<ConversationRating> {
    const result = await db
      .insert(conversationRatings)
      .values(rating)
      .returning();
    return result[0];
  }

  async getConversationRating(conversationId: string): Promise<ConversationRating | undefined> {
    const result = await db
      .select()
      .from(conversationRatings)
      .where(eq(conversationRatings.conversationId, conversationId))
      .limit(1);
    return result[0];
  }

  async getAverageRatingForChatbot(chatbotId: string): Promise<number> {
    const result = await db.execute<{ avg: string }>(
      sql`
        SELECT AVG(CAST(rating AS INTEGER)) as avg
        FROM ${conversationRatings}
        JOIN conversations ON conversations.id = conversation_ratings.conversation_id
        WHERE conversations.chatbot_id = ${chatbotId}
      `
    );
    return result.rows[0]?.avg ? parseFloat(result.rows[0].avg) : 0;
  }

  // Email Notification Settings operations (Feature 13)
  async getEmailNotificationSettings(userId: string): Promise<EmailNotificationSettings | undefined> {
    const result = await db
      .select()
      .from(emailNotificationSettings)
      .where(eq(emailNotificationSettings.userId, userId))
      .limit(1);
    return result[0];
  }

  async createEmailNotificationSettings(settings: InsertEmailNotificationSettings): Promise<EmailNotificationSettings> {
    const result = await db
      .insert(emailNotificationSettings)
      .values(settings)
      .returning();
    return result[0];
  }

  async updateEmailNotificationSettings(userId: string, updates: Partial<InsertEmailNotificationSettings>): Promise<EmailNotificationSettings | undefined> {
    const result = await db
      .update(emailNotificationSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(emailNotificationSettings.userId, userId))
      .returning();
    return result[0];
  }

  // Conversation Flow operations (Feature 5)
  async getConversationFlows(chatbotId: string): Promise<ConversationFlow[]> {
    const result = await db
      .select()
      .from(conversationFlows)
      .where(eq(conversationFlows.chatbotId, chatbotId))
      .orderBy(desc(conversationFlows.updatedAt));
    return result;
  }

  async getConversationFlow(id: string): Promise<ConversationFlow | undefined> {
    const result = await db
      .select()
      .from(conversationFlows)
      .where(eq(conversationFlows.id, id))
      .limit(1);
    return result[0];
  }

  async getActiveConversationFlow(chatbotId: string): Promise<ConversationFlow | undefined> {
    const result = await db
      .select()
      .from(conversationFlows)
      .where(and(
        eq(conversationFlows.chatbotId, chatbotId),
        eq(conversationFlows.isActive, "true")
      ))
      .limit(1);
    return result[0];
  }

  async createConversationFlow(flow: InsertConversationFlow): Promise<ConversationFlow> {
    const result = await db
      .insert(conversationFlows)
      .values(flow)
      .returning();
    return result[0];
  }

  async updateConversationFlow(id: string, updates: Partial<InsertConversationFlow>): Promise<ConversationFlow | undefined> {
    const result = await db
      .update(conversationFlows)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(conversationFlows.id, id))
      .returning();
    return result[0];
  }

  async deleteConversationFlow(id: string): Promise<boolean> {
    const result = await db
      .delete(conversationFlows)
      .where(eq(conversationFlows.id, id))
      .returning();
    return result.length > 0;
  }

  // Knowledge Chunk operations (Phase 2)
  async createKnowledgeChunks(chunks: InsertKnowledgeChunk[]): Promise<KnowledgeChunk[]> {
    if (chunks.length === 0) {
      return [];
    }

    // Bulk insert chunks with embeddings
    const results: KnowledgeChunk[] = [];
    
    for (const chunk of chunks) {
      // Convert embedding array to pgvector format if present
      if (chunk.embedding && Array.isArray(chunk.embedding)) {
        const embeddingStr = `[${chunk.embedding.join(',')}]`;
        const metadataStr = chunk.metadata ? `'${JSON.stringify(chunk.metadata).replace(/'/g, "''")}'::jsonb` : 'NULL';
        
        const result = await db.execute(sql.raw(`
          INSERT INTO knowledge_chunks (
            chatbot_id, source_type, source_url, source_title, chunk_text, 
            chunk_index, content_hash, embedding, metadata, created_at, updated_at
          )
          VALUES (
            '${chunk.chatbotId}',
            '${chunk.sourceType}',
            '${chunk.sourceUrl.replace(/'/g, "''")}',
            ${chunk.sourceTitle ? `'${chunk.sourceTitle.replace(/'/g, "''")}'` : 'NULL'},
            '${chunk.chunkText.replace(/'/g, "''")}',
            '${chunk.chunkIndex}',
            '${chunk.contentHash}',
            '${embeddingStr}'::vector,
            ${metadataStr},
            NOW(),
            NOW()
          )
          RETURNING *
        `));
        
        if (result.rows[0]) {
          results.push(result.rows[0] as KnowledgeChunk);
        }
      } else {
        // No embedding - simple insert
        const result = await db
          .insert(knowledgeChunks)
          .values(chunk)
          .returning();
        results.push(result[0]);
      }
    }
    
    return results;
  }

  async getTopKRelevantChunks(
    chatbotId: string,
    questionEmbedding: number[],
    k: number = 8
  ): Promise<KnowledgeChunk[]> {
    const embeddingStr = `[${questionEmbedding.join(',')}]`;
    
    // Use cosine similarity to find most relevant chunks
    // Note: Using raw SQL here because Drizzle doesn't have native support for vector similarity operators
    const result = await db.execute(
      sql`
        SELECT 
          id,
          chatbot_id as "chatbotId",
          source_type as "sourceType",
          source_url as "sourceUrl",
          source_title as "sourceTitle",
          chunk_text as "chunkText",
          chunk_index as "chunkIndex",
          content_hash as "contentHash",
          embedding,
          metadata,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM ${knowledgeChunks}
        WHERE ${knowledgeChunks.chatbotId} = ${chatbotId}
          AND ${knowledgeChunks.embedding} IS NOT NULL
        ORDER BY ${knowledgeChunks.embedding} <=> ${embeddingStr}::vector
        LIMIT ${k}
      `
    );
    
    return result.rows as KnowledgeChunk[];
  }

  async deleteChunksForChatbot(chatbotId: string): Promise<number> {
    const result = await db
      .delete(knowledgeChunks)
      .where(eq(knowledgeChunks.chatbotId, chatbotId))
      .returning();
    return result.length;
  }

  async deleteChunksForSource(chatbotId: string, sourceUrl: string): Promise<number> {
    const result = await db
      .delete(knowledgeChunks)
      .where(
        and(
          eq(knowledgeChunks.chatbotId, chatbotId),
          eq(knowledgeChunks.sourceUrl, sourceUrl)
        )
      )
      .returning();
    return result.length;
  }

  async countChunksForChatbot(chatbotId: string): Promise<number> {
    const result = await db.execute<{ count: string }>(
      sql`SELECT COUNT(*) as count FROM ${knowledgeChunks} WHERE ${knowledgeChunks.chatbotId} = ${chatbotId}`
    );
    return parseInt(result.rows[0]?.count || '0');
  }

  // Indexing Job operations
  async createIndexingJob(chatbotId: string, totalTasks: number): Promise<IndexingJob> {
    const result = await db
      .insert(indexingJobs)
      .values({
        chatbotId,
        totalTasks: totalTasks.toString(),
        status: "pending",
      })
      .returning();
    return result[0];
  }

  async getIndexingJob(jobId: string): Promise<IndexingJob | undefined> {
    const result = await db
      .select()
      .from(indexingJobs)
      .where(eq(indexingJobs.id, jobId))
      .limit(1);
    return result[0];
  }

  async getLatestIndexingJob(chatbotId: string): Promise<IndexingJob | undefined> {
    const result = await db
      .select()
      .from(indexingJobs)
      .where(eq(indexingJobs.chatbotId, chatbotId))
      .orderBy(desc(indexingJobs.createdAt))
      .limit(1);
    return result[0];
  }

  async updateIndexingJobStatus(jobId: string, status: string, errorMessage?: string): Promise<void> {
    await db
      .update(indexingJobs)
      .set({ 
        status: status as any, 
        errorMessage,
        ...(status === "processing" && { startedAt: new Date() }),
        ...(["completed", "failed", "partial"].includes(status) && { completedAt: new Date() })
      })
      .where(eq(indexingJobs.id, jobId));
  }

  async updateIndexingJobProgress(jobId: string, completedTasks: number, failedTasks: number): Promise<void> {
    await db
      .update(indexingJobs)
      .set({
        completedTasks: completedTasks.toString(),
        failedTasks: failedTasks.toString(),
      })
      .where(eq(indexingJobs.id, jobId));
  }

  async completeIndexingJob(jobId: string): Promise<void> {
    const job = await this.getIndexingJob(jobId);
    if (!job) return;

    const totalTasks = parseInt(job.totalTasks);
    const completedTasks = parseInt(job.completedTasks);
    const failedTasks = parseInt(job.failedTasks);

    let status = "completed";
    if (completedTasks === 0 && failedTasks > 0) {
      status = "failed";
    } else if (failedTasks > 0 && completedTasks > 0) {
      status = "partial";
    }

    await this.updateIndexingJobStatus(jobId, status);
  }

  // Indexing Task operations
  async createIndexingTasks(tasks: InsertIndexingTask[]): Promise<IndexingTask[]> {
    if (tasks.length === 0) return [];
    const result = await db
      .insert(indexingTasks)
      .values(tasks)
      .returning();
    return result;
  }

  async getPendingIndexingTasks(jobId: string, limit: number = 100): Promise<IndexingTask[]> {
    return await db
      .select()
      .from(indexingTasks)
      .where(and(
        eq(indexingTasks.jobId, jobId),
        eq(indexingTasks.status, "pending")
      ))
      .limit(limit);
  }

  async updateIndexingTaskStatus(taskId: string, status: string, errorMessage?: string, chunksCreated?: number): Promise<void> {
    await db
      .update(indexingTasks)
      .set({
        status: status as any,
        errorMessage,
        ...(chunksCreated !== undefined && { chunksCreated: chunksCreated.toString() }),
        ...(status === "processing" && { startedAt: new Date() }),
        ...(["completed", "failed"].includes(status) && { completedAt: new Date() })
      })
      .where(eq(indexingTasks.id, taskId));
  }

  async incrementTaskRetryCount(taskId: string): Promise<void> {
    const task = await db
      .select({ retryCount: indexingTasks.retryCount })
      .from(indexingTasks)
      .where(eq(indexingTasks.id, taskId))
      .limit(1);
    
    if (task[0]) {
      const newCount = (parseInt(task[0].retryCount) + 1).toString();
      await db
        .update(indexingTasks)
        .set({ retryCount: newCount })
        .where(eq(indexingTasks.id, taskId));
    }
  }

  async getIndexingTasksForJob(jobId: string): Promise<IndexingTask[]> {
    return await db
      .select()
      .from(indexingTasks)
      .where(eq(indexingTasks.jobId, jobId))
      .orderBy(indexingTasks.createdAt);
  }

  // Chatbot indexing status operations
  async updateChatbotIndexingStatus(chatbotId: string, status: string, jobId?: string): Promise<void> {
    await db
      .update(chatbots)
      .set({
        indexingStatus: status as any,
        ...(jobId && { lastIndexingJobId: jobId })
      })
      .where(eq(chatbots.id, chatbotId));
  }

  // Admin Job Management operations
  async listAllIndexingJobs(options?: { status?: string; limit?: number }): Promise<IndexingJob[]> {
    const { status, limit = 100 } = options || {};
    
    let query = db
      .select()
      .from(indexingJobs)
      .orderBy(desc(indexingJobs.createdAt))
      .limit(limit);
    
    if (status) {
      query = query.where(eq(indexingJobs.status, status as any)) as any;
    }
    
    return await query;
  }

  async cancelIndexingJob(jobId: string): Promise<boolean> {
    const job = await this.getIndexingJob(jobId);
    if (!job) return false;
    
    // Only cancel if job is pending or processing
    if (!["pending", "processing"].includes(job.status)) {
      return false;
    }
    
    // Cancel all pending/processing tasks
    await db
      .update(indexingTasks)
      .set({ 
        status: "cancelled",
        cancelledAt: new Date()
      })
      .where(and(
        eq(indexingTasks.jobId, jobId),
        sql`${indexingTasks.status} IN ('pending', 'processing')`
      ));
    
    // Update job status
    await db
      .update(indexingJobs)
      .set({ 
        status: "cancelled",
        cancelledAt: new Date(),
        completedAt: new Date()
      })
      .where(eq(indexingJobs.id, jobId));
    
    // Update chatbot status
    await this.updateChatbotIndexingStatus(job.chatbotId, "failed");
    
    return true;
  }

  async retryIndexingJob(jobId: string): Promise<{ success: boolean; newJobId?: string }> {
    const job = await this.getIndexingJob(jobId);
    if (!job) return { success: false };
    
    // Only retry failed or partial jobs
    if (!["failed", "partial", "cancelled"].includes(job.status)) {
      return { success: false };
    }
    
    // Get all failed/cancelled tasks
    const failedTasks = await db
      .select()
      .from(indexingTasks)
      .where(and(
        eq(indexingTasks.jobId, jobId),
        sql`${indexingTasks.status} IN ('failed', 'cancelled')`
      ));
    
    if (failedTasks.length === 0) {
      return { success: false };
    }
    
    // Create new job
    const newJob = await this.createIndexingJob(job.chatbotId, failedTasks.length);
    
    // Create new tasks from failed ones
    const newTasks = failedTasks.map(task => ({
      jobId: newJob.id,
      chatbotId: task.chatbotId,
      sourceType: task.sourceType,
      sourceUrl: task.sourceUrl,
      status: "pending" as const,
    }));
    
    await this.createIndexingTasks(newTasks);
    
    // Update chatbot status
    await this.updateChatbotIndexingStatus(job.chatbotId, "pending", newJob.id);
    
    return { success: true, newJobId: newJob.id };
  }

  // Chatbot Suggested Questions operations
  async replaceSuggestedQuestions(chatbotId: string, questions: string[]): Promise<void> {
    // Use transaction to ensure delete and insert happen atomically
    await db.transaction(async (tx) => {
      // Delete all existing questions for this chatbot
      await tx
        .delete(chatbotSuggestedQuestions)
        .where(eq(chatbotSuggestedQuestions.chatbotId, chatbotId));
      
      // Insert new questions
      if (questions.length > 0) {
        await tx
          .insert(chatbotSuggestedQuestions)
          .values(
            questions.map(questionText => ({
              chatbotId,
              questionText,
              usageCount: "0",
              isActive: "true",
            }))
          );
      }
    });
  }

  async getRandomSuggestedQuestions(chatbotId: string, count: number = 3): Promise<string[]> {
    const result = await db
      .select({ questionText: chatbotSuggestedQuestions.questionText })
      .from(chatbotSuggestedQuestions)
      .where(and(
        eq(chatbotSuggestedQuestions.chatbotId, chatbotId),
        eq(chatbotSuggestedQuestions.isActive, "true")
      ))
      .orderBy(sql`RANDOM()`)
      .limit(count);
    
    return result.map(r => r.questionText);
  }

  async incrementQuestionUsage(chatbotId: string, questionText: string): Promise<void> {
    await db
      .update(chatbotSuggestedQuestions)
      .set({ 
        usageCount: sql`(CAST(${chatbotSuggestedQuestions.usageCount} AS INTEGER) + 1)::TEXT`
      })
      .where(and(
        eq(chatbotSuggestedQuestions.chatbotId, chatbotId),
        eq(chatbotSuggestedQuestions.questionText, questionText)
      ));
  }

  async getKnowledgeChunksForChatbot(chatbotId: string): Promise<Array<{
    id: string;
    chunkText: string;
    sourceUrl: string;
    sourceTitle: string | null;
    sourceType: "website" | "document";
  }>> {
    const result = await db
      .select({
        id: knowledgeChunks.id,
        chunkText: knowledgeChunks.chunkText,
        sourceUrl: knowledgeChunks.sourceUrl,
        sourceTitle: knowledgeChunks.sourceTitle,
        sourceType: knowledgeChunks.sourceType,
      })
      .from(knowledgeChunks)
      .where(eq(knowledgeChunks.chatbotId, chatbotId))
      .orderBy(knowledgeChunks.sourceUrl);
    
    return result;
  }
}

export const storage = new DbStorage();
