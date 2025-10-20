import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertChatbotSchema, type ChatRequest, type ChatResponse, chatbots, conversations, conversationMessages, users } from "@shared/schema";
import { ZodError } from "zod";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { isAuthenticated } from "./replitAuth";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import { crawlMultipleWebsitesRecursive } from "./crawler";
import Stripe from "stripe";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const upload = multer({ storage: multer.memoryStorage() });

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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

  // Get chatbot configuration for public widget (no auth required)
  app.get("/api/public/chatbots/:id", async (req, res) => {
    try {
      // Get chatbot without userId check - this is for public widget embedding
      const chatbotResult = await db.select().from(chatbots).where(eq(chatbots.id, req.params.id)).limit(1);
      const chatbot = chatbotResult[0];
      
      if (!chatbot) {
        return res.status(404).json({ error: "Chatbot not found" });
      }
      
      // Return only public-facing configuration (exclude sensitive data like userId, websiteContent, documents)
      const publicConfig = {
        id: chatbot.id,
        name: chatbot.name,
        welcomeMessage: chatbot.welcomeMessage,
        primaryColor: chatbot.primaryColor,
        accentColor: chatbot.accentColor,
        logoUrl: chatbot.logoUrl,
        suggestedQuestions: chatbot.suggestedQuestions,
        supportPhoneNumber: chatbot.supportPhoneNumber,
        escalationMessage: chatbot.escalationMessage,
        systemPrompt: chatbot.systemPrompt,
      };
      
      res.json(publicConfig);
    } catch (error) {
      console.error("Error fetching public chatbot:", error);
      res.status(500).json({ error: "Failed to fetch chatbot" });
    }
  });

  // Create chatbot (protected)
  app.post("/api/chatbots", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertChatbotSchema.parse(req.body);
      
      // Check if free tier user already has a chatbot (limit: 1 chatbot for free tier)
      const user = await storage.getUser(userId);
      if (user && user.subscriptionTier !== "paid") {
        const existingChatbots = await storage.getAllChatbots(userId);
        if (existingChatbots.length >= 1) {
          return res.status(403).json({
            error: "Upgrade required",
            message: "Free tier is limited to 1 chatbot. Upgrade to Pro to create unlimited chatbots."
          });
        }
      }
      
      // Crawl websites if URLs are provided (recursive crawling)
      let websiteContent = "";
      if (validatedData.websiteUrls && validatedData.websiteUrls.length > 0) {
        console.log(`Recursively crawling ${validatedData.websiteUrls.length} website(s) (max depth: 2, max pages: 50 per site)...`);
        const crawlResults = await crawlMultipleWebsitesRecursive(validatedData.websiteUrls, {
          maxDepth: 2,
          maxPages: 50,
          sameDomainOnly: true,
        });
        
        console.log(`Successfully crawled ${crawlResults.filter(r => !r.error).length} pages`);
        
        // Combine all successfully crawled content
        websiteContent = crawlResults
          .filter(result => !result.error && result.content)
          .map(result => `URL: ${result.url}\nTitle: ${result.title || 'N/A'}\n\n${result.content}`)
          .join('\n\n---\n\n');
        
        // Log any errors
        crawlResults
          .filter(result => result.error)
          .forEach(result => {
            console.error(`Failed to crawl ${result.url}: ${result.error}`);
          });
      }
      
      const chatbot = await storage.createChatbot({
        ...validatedData,
        websiteContent,
      }, userId);
      
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
      
      // Check if user is trying to update Pro-only features (colors, logo)
      const isUpdatingProFeatures = validatedData.primaryColor || validatedData.accentColor || validatedData.logoUrl;
      
      if (isUpdatingProFeatures) {
        const user = await storage.getUser(userId);
        if (!user || user.subscriptionTier !== "paid") {
          return res.status(403).json({ 
            error: "Upgrade required",
            message: "Color and logo customization is only available on the Pro plan. Please upgrade to access this feature."
          });
        }
      }
      
      // If websiteUrls are being updated, re-crawl them or clear content
      let updateData = { ...validatedData };
      if (validatedData.websiteUrls !== undefined) {
        if (validatedData.websiteUrls.length > 0) {
          console.log(`Recursively re-crawling ${validatedData.websiteUrls.length} website(s) (max depth: 2, max pages: 50 per site)...`);
          const crawlResults = await crawlMultipleWebsitesRecursive(validatedData.websiteUrls, {
            maxDepth: 2,
            maxPages: 50,
            sameDomainOnly: true,
          });
          
          console.log(`Successfully crawled ${crawlResults.filter(r => !r.error).length} pages`);
          
          // Combine all successfully crawled content
          updateData.websiteContent = crawlResults
            .filter(result => !result.error && result.content)
            .map(result => `URL: ${result.url}\nTitle: ${result.title || 'N/A'}\n\n${result.content}`)
            .join('\n\n---\n\n');
          
          // Log any errors
          crawlResults
            .filter(result => result.error)
            .forEach(result => {
              console.error(`Failed to crawl ${result.url}: ${result.error}`);
            });
        } else {
          // Clear websiteContent when all URLs are removed
          updateData.websiteContent = '';
        }
      }
      
      const chatbot = await storage.updateChatbot(req.params.id, userId, updateData);
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

  // Update chatbot with uploaded logo URL (protected - Pro plan only)
  app.put("/api/chatbots/:id/logo", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Verify user has paid subscription for logo customization
      const user = await storage.getUser(userId);
      if (!user || user.subscriptionTier !== "paid") {
        return res.status(403).json({ 
          error: "Upgrade required",
          message: "Logo customization is only available on the Pro plan. Please upgrade to access this feature."
        });
      }
      
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
      const { chatbotId, message, conversationHistory, sessionId } = req.body as ChatRequest;

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

      // Check chatbot owner's subscription tier and enforce free tier limits
      const ownerResult = await db.select().from(users).where(eq(users.id, chatbot.userId)).limit(1);
      const owner = ownerResult[0];
      
      if (owner && owner.subscriptionTier === "free") {
        const currentQuestionCount = parseInt(chatbot.questionCount);
        if (currentQuestionCount >= 3) {
          return res.status(403).json({ 
            error: "Free tier limit reached",
            message: "This chatbot has reached its free tier limit of 3 questions. The owner needs to upgrade to Pro for unlimited questions."
          });
        }
      }

      // Find or create conversation for this session
      let conversation;
      if (sessionId) {
        const existingConv = await db.select().from(conversations)
          .where(eq(conversations.sessionId, sessionId))
          .limit(1);
        conversation = existingConv[0];
      }
      
      if (!conversation) {
        const newConv = await db.insert(conversations).values({
          chatbotId,
          sessionId: sessionId || `session-${Date.now()}`,
          messageCount: "0",
          wasEscalated: "false",
        }).returning();
        conversation = newConv[0];
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

      // Create the full prompt for the main response
      const fullPrompt = `${chatbot.systemPrompt}

Knowledge Base:
${knowledgeContext || "No specific knowledge base provided."}

Previous Conversation:
${conversationContext || "No previous conversation."}

User Question: ${message}

Please answer based on the knowledge base provided. If you cannot find the answer in the knowledge base, politely let the user know and suggest they contact support${chatbot.supportPhoneNumber ? ` at ${chatbot.supportPhoneNumber}` : ""}.`;

      // Call both Gemini AI requests in parallel for faster response
      const [mainResult, suggestionsResult] = await Promise.all([
        // Main response
        genAI.models.generateContent({
          model: "gemini-2.5-flash",
          contents: fullPrompt,
        }),
        // Suggested questions (run in parallel)
        genAI.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `Based on this conversation, suggest 3-5 relevant follow-up questions (each under 60 characters).

Knowledge Base Topics:
${knowledgeContext ? knowledgeContext.substring(0, 1500) : "General customer support"}

User's Question: ${message}

Generate 3-5 short, natural questions that would help the user learn more. Return only the questions, one per line, without numbering.`,
        }).catch(err => {
          console.error("Error generating suggested questions:", err);
          return null;
        })
      ]);

      const aiMessage = mainResult.text || "I apologize, but I couldn't generate a response.";
      
      let suggestedQuestions: string[] = [];
      if (suggestionsResult) {
        try {
          const suggestionsText = suggestionsResult.text || "";
          suggestedQuestions = suggestionsText
            .split('\n')
            .map(q => q.trim())
            .filter(q => q.length > 0 && q.length < 100)
            .slice(0, 5);
        } catch (error) {
          console.error("Error parsing suggested questions:", error);
        }
      }

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

      // Save both messages and update conversation in parallel for faster database operations
      const newMessageCount = (parseInt(conversation.messageCount) + 2).toString();
      await Promise.all([
        // Save user message
        db.insert(conversationMessages).values({
          conversationId: conversation.id,
          role: "user",
          content: message,
          wasEscalated: "false",
        }),
        // Save assistant message
        db.insert(conversationMessages).values({
          conversationId: conversation.id,
          role: "assistant",
          content: finalMessage,
          suggestedQuestions: suggestedQuestions.length > 0 ? suggestedQuestions : [],
          wasEscalated: shouldEscalate ? "true" : "false",
        }),
        // Update conversation metadata
        db.update(conversations)
          .set({
            messageCount: newMessageCount,
            lastMessageAt: new Date(),
            wasEscalated: shouldEscalate ? "true" : conversation.wasEscalated,
          })
          .where(eq(conversations.id, conversation.id)),
        // Increment chatbot question count (for free tier limit tracking)
        storage.incrementChatbotQuestionCount(chatbotId)
      ]);

      const chatResponse: ChatResponse = {
        message: finalMessage,
        shouldEscalate,
        suggestedQuestions,
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

  // Analytics routes (protected - only for chatbot owners with paid subscription)
  
  // Get analytics overview for a chatbot
  app.get("/api/chatbots/:id/analytics", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const chatbotId = req.params.id;

      // Verify user owns this chatbot
      const chatbot = await storage.getChatbot(chatbotId, userId);
      if (!chatbot) {
        return res.status(404).json({ error: "Chatbot not found" });
      }

      // Verify user has paid subscription for analytics access
      const user = await storage.getUser(userId);
      if (!user || user.subscriptionTier !== "paid") {
        return res.status(403).json({ 
          error: "Upgrade required",
          message: "Analytics are only available on the Pro plan. Please upgrade to access this feature."
        });
      }

      // Get all conversations for this chatbot
      const allConversations = await db.select()
        .from(conversations)
        .where(eq(conversations.chatbotId, chatbotId));

      // Calculate metrics
      const totalConversations = allConversations.length;
      const totalMessages = allConversations.reduce((sum, conv) => sum + parseInt(conv.messageCount), 0);
      const escalatedConversations = allConversations.filter(conv => conv.wasEscalated === "true").length;

      // Get recent conversations with message previews
      const recentConversations = await db.select()
        .from(conversations)
        .where(eq(conversations.chatbotId, chatbotId))
        .orderBy(sql`${conversations.lastMessageAt} DESC`)
        .limit(10);

      res.json({
        metrics: {
          totalConversations,
          totalMessages,
          escalatedConversations,
          escalationRate: totalConversations > 0 ? (escalatedConversations / totalConversations * 100).toFixed(1) : "0",
        },
        recentConversations,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Get conversation details with all messages - Pro plan only
  app.get("/api/conversations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversationId = req.params.id;

      // Get conversation
      const convResult = await db.select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);
      
      const conversation = convResult[0];
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Verify user owns the chatbot for this conversation
      const chatbot = await storage.getChatbot(conversation.chatbotId, userId);
      if (!chatbot) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Verify user has paid subscription for conversation access
      const user = await storage.getUser(userId);
      if (!user || user.subscriptionTier !== "paid") {
        return res.status(403).json({ 
          error: "Upgrade required",
          message: "Conversation details are only available on the Pro plan. Please upgrade to access this feature."
        });
      }

      // Get all messages for this conversation
      const messages = await db.select()
        .from(conversationMessages)
        .where(eq(conversationMessages.conversationId, conversationId))
        .orderBy(sql`${conversationMessages.createdAt} ASC`);

      res.json({
        conversation,
        messages,
      });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  // Get all conversations for a chatbot (with pagination) - Pro plan only
  app.get("/api/chatbots/:id/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const chatbotId = req.params.id;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      // Verify user owns this chatbot
      const chatbot = await storage.getChatbot(chatbotId, userId);
      if (!chatbot) {
        return res.status(404).json({ error: "Chatbot not found" });
      }

      // Verify user has paid subscription for analytics access
      const user = await storage.getUser(userId);
      if (!user || user.subscriptionTier !== "paid") {
        return res.status(403).json({ 
          error: "Upgrade required",
          message: "Conversation history is only available on the Pro plan. Please upgrade to access this feature."
        });
      }

      // Get conversations with pagination
      const conversationsList = await db.select()
        .from(conversations)
        .where(eq(conversations.chatbotId, chatbotId))
        .orderBy(sql`${conversations.lastMessageAt} DESC`)
        .limit(limit)
        .offset(offset);

      res.json(conversationsList);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Create Stripe subscription (protected)
  app.post("/api/create-subscription", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { billingCycle } = req.body;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if user already has an active subscription
      if (user.stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId, {
          expand: ['latest_invoice.payment_intent'],
        });
        
        if (subscription.status === 'active' || subscription.status === 'trialing') {
          const latestInvoice: any = subscription.latest_invoice;
          return res.json({
            subscriptionId: subscription.id,
            clientSecret: latestInvoice?.payment_intent?.client_secret,
          });
        }
      }

      // Create or retrieve Stripe customer
      let stripeCustomerId = user.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : undefined,
          metadata: {
            userId: user.id,
          },
        });
        stripeCustomerId = customer.id;
        await storage.updateStripeCustomerId(user.id, stripeCustomerId);
      }

      // Use pre-created Stripe price IDs from environment variables
      const priceId = billingCycle === "monthly" 
        ? process.env.STRIPE_MONTHLY_PRICE_ID
        : process.env.STRIPE_ANNUAL_PRICE_ID;

      if (!priceId) {
        throw new Error(`Missing Stripe price ID for ${billingCycle} billing cycle`);
      }

      // Create subscription using pre-created price
      const subscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{
          price: priceId,
        }],
        collection_method: 'charge_automatically',
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
          payment_method_types: ['card'],
        },
        expand: ['latest_invoice.payment_intent', 'pending_setup_intent'],
        metadata: {
          userId: user.id,
          billingCycle,
        },
      });

      // Store subscription ID
      await storage.updateStripeSubscriptionId(user.id, subscription.id);

      // Get the client secret from either payment_intent or pending_setup_intent
      let clientSecret: string | null = null;
      const latestInvoice = subscription.latest_invoice;
      const pendingSetupIntent = subscription.pending_setup_intent;
      
      console.log('Subscription details:', {
        subscriptionId: subscription.id,
        status: subscription.status,
        invoiceType: typeof latestInvoice,
        invoiceId: typeof latestInvoice === 'object' ? (latestInvoice as any)?.id : latestInvoice,
        hasPendingSetupIntent: !!pendingSetupIntent,
        pendingSetupIntentType: typeof pendingSetupIntent,
      });
      
      // Check for payment intent in the invoice (for immediate payment)
      if (typeof latestInvoice === 'string') {
        // Invoice wasn't expanded, fetch it manually
        const invoice: any = await stripe.invoices.retrieve(latestInvoice, {
          expand: ['payment_intent'],
        });
        const paymentIntent = invoice.payment_intent;
        if (typeof paymentIntent === 'object' && paymentIntent !== null) {
          clientSecret = paymentIntent.client_secret;
        }
      } else if (latestInvoice && typeof latestInvoice === 'object') {
        // Invoice was expanded
        const paymentIntent = (latestInvoice as any).payment_intent;
        if (typeof paymentIntent === 'object' && paymentIntent !== null) {
          clientSecret = paymentIntent.client_secret;
        }
      }

      // If no payment intent, check for pending setup intent (for trials or deferred payment)
      if (!clientSecret && pendingSetupIntent && typeof pendingSetupIntent === 'object') {
        clientSecret = (pendingSetupIntent as any).client_secret;
      }

      console.log('Client secret status:', {
        clientSecret: clientSecret ? 'present' : 'missing',
        source: clientSecret ? (pendingSetupIntent && typeof pendingSetupIntent === 'object' ? 'pending_setup_intent' : 'payment_intent') : 'none',
      });

      if (!clientSecret) {
        throw new Error('Failed to create payment intent. Please check your Stripe configuration.');
      }

      res.json({
        subscriptionId: subscription.id,
        clientSecret,
      });
    } catch (error: any) {
      console.error("Subscription creation error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // Stripe webhook handler for subscription updates
  app.post("/api/stripe-webhook", async (req, res) => {
    const sig = req.headers['stripe-signature'];
    
    if (!sig) {
      return res.status(400).send('No signature');
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET || ''
      );
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        
        if (userId && subscription.status === 'active') {
          // Update user to paid tier
          await db.update(users)
            .set({ subscriptionTier: 'paid' })
            .where(eq(users.id, userId));
        }
        break;
        
      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object as Stripe.Subscription;
        const deletedUserId = deletedSubscription.metadata?.userId;
        
        if (deletedUserId) {
          // Downgrade user to free tier
          await db.update(users)
            .set({ 
              subscriptionTier: 'free',
              stripeSubscriptionId: null,
            })
            .where(eq(users.id, deletedUserId));
        }
        break;

      case 'invoice.payment_succeeded':
        const invoice = event.data.object as Stripe.Invoice;
        const invoiceSubscription: any = invoice;
        if (invoiceSubscription.subscription && invoice.metadata?.userId) {
          // Ensure user is on paid tier
          await db.update(users)
            .set({ subscriptionTier: 'paid' })
            .where(eq(users.id, invoice.metadata.userId));
        }
        break;

      case 'invoice.payment_failed':
        const failedInvoice = event.data.object as Stripe.Invoice;
        console.error('Payment failed for invoice:', failedInvoice.id);
        break;
    }

    res.json({ received: true });
  });

  const httpServer = createServer(app);

  return httpServer;
}
