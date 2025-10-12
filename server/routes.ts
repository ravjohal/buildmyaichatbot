import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertChatbotSchema, type ChatRequest, type ChatResponse, chatbots } from "@shared/schema";
import { ZodError } from "zod";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { isAuthenticated } from "./replitAuth";
import { db } from "./db";
import { eq } from "drizzle-orm";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  // Get authenticated user (NOT protected - returns null if not authenticated)
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated() || !req.user?.claims?.sub) {
        return res.json(null); // Return null for unauthenticated users (200 OK)
      }
      
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get all chatbots (protected)
  app.get("/api/chatbots", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const chatbots = await storage.getAllChatbots(userId);
      res.json(chatbots);
    } catch (error) {
      console.error("Error fetching chatbots:", error);
      res.status(500).json({ error: "Failed to fetch chatbots" });
    }
  });

  // Get single chatbot (protected)
  app.get("/api/chatbots/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const chatbot = await storage.getChatbot(req.params.id, userId);
      if (!chatbot) {
        return res.status(404).json({ error: "Chatbot not found" });
      }
      res.json(chatbot);
    } catch (error) {
      console.error("Error fetching chatbot:", error);
      res.status(500).json({ error: "Failed to fetch chatbot" });
    }
  });

  // Create chatbot (protected)
  app.post("/api/chatbots", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertChatbotSchema.parse(req.body);
      const chatbot = await storage.createChatbot(validatedData, userId);
      res.status(201).json(chatbot);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error creating chatbot:", error);
      res.status(500).json({ error: "Failed to create chatbot" });
    }
  });

  // Update chatbot (protected)
  app.put("/api/chatbots/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertChatbotSchema.partial().parse(req.body);
      const chatbot = await storage.updateChatbot(req.params.id, userId, validatedData);
      if (!chatbot) {
        return res.status(404).json({ error: "Chatbot not found" });
      }
      res.json(chatbot);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error updating chatbot:", error);
      res.status(500).json({ error: "Failed to update chatbot" });
    }
  });

  // Delete chatbot (protected)
  app.delete("/api/chatbots/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const deleted = await storage.deleteChatbot(req.params.id, userId);
      if (!deleted) {
        return res.status(404).json({ error: "Chatbot not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting chatbot:", error);
      res.status(500).json({ error: "Failed to delete chatbot" });
    }
  });

  // Get upload URL for object entity (logo/document)
  app.post("/api/objects/upload", async (_req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Serve private objects (uploaded logos/documents)
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Update chatbot with uploaded logo URL (protected)
  app.put("/api/chatbots/:id/logo", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      if (!req.body.logoURL) {
        return res.status(400).json({ error: "logoURL is required" });
      }

      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(req.body.logoURL);

      const chatbot = await storage.updateChatbot(req.params.id, userId, { logoUrl: objectPath });
      if (!chatbot) {
        return res.status(404).json({ error: "Chatbot not found" });
      }

      res.json({ objectPath, chatbot });
    } catch (error) {
      console.error("Error updating chatbot logo:", error);
      res.status(500).json({ error: "Failed to update logo" });
    }
  });

  // Chat endpoint - handle conversation with Gemini AI (public for widget embedding)
  app.post("/api/chat", async (req, res) => {
    try {
      const { chatbotId, message, conversationHistory } = req.body as ChatRequest;

      if (!chatbotId || !message) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // For public chat widget, we need to get chatbot without userId check
      // This allows the widget to be embedded on any website
      const chatbotResult = await db.select().from(chatbots).where(eq(chatbots.id, chatbotId)).limit(1);
      const chatbot = chatbotResult[0];
      
      if (!chatbot) {
        return res.status(404).json({ error: "Chatbot not found" });
      }

      // Build knowledge base context
      let knowledgeContext = "";
      if (chatbot.websiteContent) {
        knowledgeContext += `Website Content:\n${chatbot.websiteContent}\n\n`;
      }
      if (chatbot.documents && chatbot.documents.length > 0) {
        knowledgeContext += `Documents:\n${chatbot.documents.join("\n")}\n\n`;
      }

      // Build conversation history for context
      const conversationContext = conversationHistory
        .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
        .join("\n");

      // Create the full prompt
      const fullPrompt = `${chatbot.systemPrompt}

Knowledge Base:
${knowledgeContext || "No specific knowledge base provided."}

Previous Conversation:
${conversationContext || "No previous conversation."}

User Question: ${message}

Please answer based on the knowledge base provided. If you cannot find the answer in the knowledge base, politely let the user know and suggest they contact support${chatbot.supportPhoneNumber ? ` at ${chatbot.supportPhoneNumber}` : ""}.`;

      // Call Gemini AI
      const result = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: fullPrompt,
      });
      const aiMessage = result.text || "I apologize, but I couldn't generate a response.";

      // Check if we should escalate (basic heuristic)
      const shouldEscalate =
        aiMessage.toLowerCase().includes("contact support") ||
        aiMessage.toLowerCase().includes("speak with") ||
        aiMessage.toLowerCase().includes("human representative") ||
        aiMessage.toLowerCase().includes("don't know") ||
        aiMessage.toLowerCase().includes("cannot find");

      let finalMessage = aiMessage;
      
      // If should escalate and phone number exists, add escalation message
      if (shouldEscalate && chatbot.supportPhoneNumber && chatbot.escalationMessage) {
        const escalationText = chatbot.escalationMessage.replace(
          "{phone}",
          chatbot.supportPhoneNumber
        );
        if (!finalMessage.includes(chatbot.supportPhoneNumber)) {
          finalMessage += `\n\n${escalationText}`;
        }
      }

      const chatResponse: ChatResponse = {
        message: finalMessage,
        shouldEscalate,
      };

      res.json(chatResponse);
    } catch (error) {
      console.error("Error in chat endpoint:", error);
      res.status(500).json({ 
        error: "Failed to process chat message",
        message: "I apologize, but I'm having trouble processing your request right now. Please try again later."
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
