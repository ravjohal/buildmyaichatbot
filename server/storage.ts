import { type Chatbot, type InsertChatbot, chatbots } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getAllChatbots(): Promise<Chatbot[]>;
  getChatbot(id: string): Promise<Chatbot | undefined>;
  createChatbot(chatbot: InsertChatbot): Promise<Chatbot>;
  updateChatbot(id: string, chatbot: Partial<InsertChatbot>): Promise<Chatbot | undefined>;
  deleteChatbot(id: string): Promise<boolean>;
}

export class DbStorage implements IStorage {
  async getAllChatbots(): Promise<Chatbot[]> {
    return await db
      .select()
      .from(chatbots)
      .orderBy(desc(chatbots.createdAt));
  }

  async getChatbot(id: string): Promise<Chatbot | undefined> {
    const result = await db
      .select()
      .from(chatbots)
      .where(eq(chatbots.id, id))
      .limit(1);
    return result[0];
  }

  async createChatbot(insertChatbot: InsertChatbot): Promise<Chatbot> {
    const result = await db
      .insert(chatbots)
      .values(insertChatbot)
      .returning();
    return result[0];
  }

  async updateChatbot(id: string, updates: Partial<InsertChatbot>): Promise<Chatbot | undefined> {
    const result = await db
      .update(chatbots)
      .set(updates)
      .where(eq(chatbots.id, id))
      .returning();
    return result[0];
  }

  async deleteChatbot(id: string): Promise<boolean> {
    const result = await db
      .delete(chatbots)
      .where(eq(chatbots.id, id))
      .returning();
    return result.length > 0;
  }
}

export const storage = new DbStorage();
