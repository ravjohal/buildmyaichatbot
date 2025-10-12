import { type Chatbot, type InsertChatbot } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Chatbot operations
  getAllChatbots(): Promise<Chatbot[]>;
  getChatbot(id: string): Promise<Chatbot | undefined>;
  createChatbot(chatbot: InsertChatbot): Promise<Chatbot>;
  updateChatbot(id: string, chatbot: Partial<InsertChatbot>): Promise<Chatbot | undefined>;
  deleteChatbot(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private chatbots: Map<string, Chatbot>;

  constructor() {
    this.chatbots = new Map();
  }

  async getAllChatbots(): Promise<Chatbot[]> {
    return Array.from(this.chatbots.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getChatbot(id: string): Promise<Chatbot | undefined> {
    return this.chatbots.get(id);
  }

  async createChatbot(insertChatbot: InsertChatbot): Promise<Chatbot> {
    const id = randomUUID();
    const chatbot: Chatbot = {
      ...insertChatbot,
      id,
      createdAt: new Date(),
      documents: insertChatbot.documents || [],
      suggestedQuestions: insertChatbot.suggestedQuestions || [],
    };
    this.chatbots.set(id, chatbot);
    return chatbot;
  }

  async updateChatbot(id: string, updates: Partial<InsertChatbot>): Promise<Chatbot | undefined> {
    const chatbot = this.chatbots.get(id);
    if (!chatbot) return undefined;

    const updated: Chatbot = { ...chatbot, ...updates };
    this.chatbots.set(id, updated);
    return updated;
  }

  async deleteChatbot(id: string): Promise<boolean> {
    return this.chatbots.delete(id);
  }
}

export const storage = new MemStorage();
