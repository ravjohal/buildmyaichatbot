import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertChatbotSchema, insertLeadSchema, type ChatRequest, type ChatResponse, chatbots, conversations, conversationMessages, users, leads, urlCrawlMetadata, manualQaOverrides, conversationRatings, knowledgeChunks } from "@shared/schema";
import { ZodError } from "zod";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { isAuthenticated } from "./auth";
import { db } from "./db";
import { eq, sql, and, gte } from "drizzle-orm";
import { crawlMultipleWebsitesRecursive, refreshWebsites, calculateContentHash, normalizeUrl } from "./crawler";
import Stripe from "stripe";
import crypto from "crypto";
import { embeddingService } from "./embedding";
import { notificationService } from "./emails/notification-service";
import { TIER_LIMITS, canSendMessage } from "@shared/pricing";
import { notifyJobCancellation } from "./indexing-worker";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// Initialize Stripe - automatically use test or live keys based on environment
// REPLIT_DEPLOYMENT is set to "1" when published (production), undefined in development
const isProduction = process.env.REPLIT_DEPLOYMENT === "1";

// Choose the appropriate Stripe secret key based on environment
const stripeSecretKey = isProduction
  ? (process.env.STRIPE_LIVE_SECRET_KEY || process.env.STRIPE_SECRET_KEY)  // Production: use live keys
  : (process.env.STRIPE_TEST_SECRET_KEY || process.env.TESTING_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY);  // Development: use test keys

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

// Log which Stripe key is being used (only show first/last 4 chars for security)
if (stripeSecretKey) {
  const keyPrefix = stripeSecretKey.substring(0, 7); // sk_test or sk_live
  const mode = isProduction ? 'PRODUCTION (Live)' : 'DEVELOPMENT (Test)';
  console.log(`[Stripe] ${mode} mode - Key: ${keyPrefix}...${stripeSecretKey.slice(-4)}`);
  if (!isProduction && keyPrefix.includes('live')) {
    console.warn('[Stripe] WARNING: Using LIVE key in development mode!');
  }
  if (isProduction && keyPrefix.includes('test')) {
    console.warn('[Stripe] WARNING: Using TEST key in production mode!');
  }
} else {
  console.error('[Stripe] No Stripe secret key found! Set appropriate environment variables.');
}

// In-memory store for background indexing jobs
interface IndexingJob {
  id: string;
  userId: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: {
    totalUrls: number;
    processedUrls: number;
    currentUrl?: string;
  };
  result?: {
    websiteContent: string;
    urlMetadata: any[];
  };
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const indexingJobs = new Map<string, IndexingJob>();

// Clean up old jobs (older than 1 hour)
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [id, job] of indexingJobs.entries()) {
    if (job.updatedAt.getTime() < oneHourAgo) {
      indexingJobs.delete(id);
    }
  }
}, 5 * 60 * 1000); // Run every 5 minutes

// Middleware to check if user is an admin
const isAdmin = async (req: any, res: any, next: any) => {
  try {
    if (!req.isAuthenticated() || !req.user?.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    
    if (!user || user.isAdmin !== "true") {
      return res.status(403).json({ error: "Forbidden - Admin access required" });
    }
    
    next();
  } catch (error) {
    console.error("Error in isAdmin middleware:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Helper function to sanitize user data before sending to client
// SECURITY: Never expose password hashes or sensitive internal fields
const sanitizeUser = (user: any) => {
  if (!user) return null;
  const { password, googleId, ...safeUser } = user;
  return safeUser;
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Get authenticated user (NOT protected - returns null if not authenticated)
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated() || !req.user?.id) {
        return res.json(null); // Return null for unauthenticated users (200 OK)
      }
      
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      // SECURITY: Sanitize user data to remove password hash and sensitive fields
      res.json(sanitizeUser(user));
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get account details with subscription info (protected)
  app.get('/api/account', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      let subscriptionDetails = null;
      
      // If user has a Stripe subscription, fetch details from Stripe
      if (user.stripeSubscriptionId && stripe) {
        try {
          const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
          const product = subscription.items.data[0]?.price;
          
          subscriptionDetails = {
            id: subscription.id,
            status: subscription.status,
            currentPeriodStart: (subscription as any).current_period_start,
            currentPeriodEnd: (subscription as any).current_period_end,
            cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
            canceledAt: (subscription as any).canceled_at,
            billingCycle: product?.recurring?.interval || 'month',
            amount: product?.unit_amount ? product.unit_amount / 100 : 0,
            currency: product?.currency || 'usd',
          };
        } catch (error) {
          console.error("Error fetching Stripe subscription:", error);
          // Continue without subscription details if Stripe fails
        }
      }

      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        subscriptionTier: user.subscriptionTier,
        createdAt: user.createdAt,
        subscription: subscriptionDetails,
      });
    } catch (error) {
      console.error("Error fetching account details:", error);
      res.status(500).json({ error: "Failed to fetch account details" });
    }
  });

  // Create billing portal session (protected)
  app.post('/api/billing/portal', isAuthenticated, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ error: "Stripe is not configured" });
      }

      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || !user.stripeCustomerId) {
        return res.status(404).json({ error: "No billing account found" });
      }

      // Construct trusted return URL from server-known origin
      const baseUrl = process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`;
      const returnUrl = `${baseUrl}/account`;

      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: returnUrl,
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating billing portal session:", error);
      res.status(500).json({ error: "Failed to create billing portal session" });
    }
  });

  // Get all chatbots (protected)
  app.get("/api/chatbots", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const chatbots = await storage.getAllChatbots(userId);
      
      // Enrich chatbots with chunk count for display
      const chatbotsWithChunks = await Promise.all(
        chatbots.map(async (chatbot) => {
          const chunkCount = await storage.countChunksForChatbot(chatbot.id);
          return {
            ...chatbot,
            chunkCount,
          };
        })
      );
      
      res.json(chatbotsWithChunks);
    } catch (error) {
      console.error("Error fetching chatbots:", error);
      res.status(500).json({ error: "Failed to fetch chatbots" });
    }
  });

  // Get single chatbot (protected)
  app.get("/api/chatbots/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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

  // Get active indexing jobs for the current user
  app.get("/api/indexing/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Get all chatbots for the user
      const userChatbots = await storage.getAllChatbots(userId);
      const chatbotIds = userChatbots.map(c => c.id);
      
      if (chatbotIds.length === 0) {
        return res.json([]);
      }
      
      // Get active and recently completed indexing jobs for these chatbots
      // Include completed/failed jobs from the last 2 minutes so users can see final status
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      
      const activeJobs = await db.query.indexingJobs.findMany({
        where: (jobs, { inArray, or, eq, and: andOp, gte }) => 
          and(
            inArray(jobs.chatbotId, chatbotIds),
            or(
              eq(jobs.status, "pending"),
              eq(jobs.status, "processing"),
              // Include recently completed/failed jobs
              andOp(
                or(
                  eq(jobs.status, "completed"),
                  eq(jobs.status, "failed"),
                  eq(jobs.status, "partial")
                ),
                gte(jobs.completedAt, twoMinutesAgo)
              )
            )
          ),
        orderBy: (jobs, { desc }) => [desc(jobs.createdAt)],
      });
      
      // Enrich jobs with chatbot info and progress percentage
      const enrichedJobs = activeJobs.map(job => {
        const chatbot = userChatbots.find(c => c.id === job.chatbotId);
        const totalTasks = parseInt(job.totalTasks);
        const completedTasks = parseInt(job.completedTasks || "0");
        const failedTasks = parseInt(job.failedTasks || "0");
        const progressPercentage = totalTasks > 0 
          ? Math.round((completedTasks / totalTasks) * 100)
          : 0;
        
        return {
          jobId: job.id,
          chatbotId: job.chatbotId,
          chatbotName: chatbot?.name || "Unknown",
          status: job.status,
          totalTasks,
          completedTasks,
          failedTasks,
          progressPercentage,
          startedAt: job.startedAt,
        };
      });
      
      res.json(enrichedJobs);
    } catch (error) {
      console.error("Failed to fetch indexing status:", error);
      res.status(500).json({ error: "Failed to fetch indexing status" });
    }
  });

  // Get chatbot configuration for public widget (no auth required)
  app.get("/api/public/chatbots/:id", async (req, res) => {
    try {
      const perfStart = Date.now();
      
      // Get chatbot without userId check - this is for public widget embedding
      const chatbotResult = await db.select().from(chatbots).where(eq(chatbots.id, req.params.id)).limit(1);
      const chatbot = chatbotResult[0];
      
      if (!chatbot) {
        return res.status(404).json({ error: "Chatbot not found" });
      }
      
      // Fetch AI-generated suggested questions if enabled (to avoid separate API call from widget)
      let aiGeneratedQuestions: string[] = [];
      if (chatbot.enableSuggestedQuestions === "true") {
        const questionsStart = Date.now();
        aiGeneratedQuestions = await storage.getRandomSuggestedQuestions(chatbot.id, 20);
        const questionsTime = Date.now() - questionsStart;
        console.log(`[PERF] Public chatbot API - suggested questions fetch: ${questionsTime}ms`);
      }
      
      const totalTime = Date.now() - perfStart;
      console.log(`[PERF] Public chatbot API: total=${totalTime}ms (includes questions if enabled)`);
      
      // Return only public-facing configuration (exclude sensitive data like userId, websiteContent, documents)
      const publicConfig = {
        id: chatbot.id,
        name: chatbot.name,
        welcomeMessage: chatbot.welcomeMessage,
        primaryColor: chatbot.primaryColor,
        accentColor: chatbot.accentColor,
        logoUrl: chatbot.logoUrl,
        suggestedQuestions: chatbot.suggestedQuestions,
        aiGeneratedQuestions: aiGeneratedQuestions, // Include AI questions in initial response
        enableSuggestedQuestions: chatbot.enableSuggestedQuestions,
        supportPhoneNumber: chatbot.supportPhoneNumber,
        escalationMessage: chatbot.escalationMessage,
        systemPrompt: chatbot.systemPrompt,
        leadCaptureEnabled: chatbot.leadCaptureEnabled,
        leadCaptureFields: chatbot.leadCaptureFields,
        leadCaptureTitle: chatbot.leadCaptureTitle,
        leadCaptureMessage: chatbot.leadCaptureMessage,
        leadCaptureTiming: chatbot.leadCaptureTiming,
        leadCaptureMessageCount: chatbot.leadCaptureMessageCount,
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
      console.log("=== CHATBOT CREATION REQUEST STARTED ===");
      console.log("Environment:", process.env.NODE_ENV);
      console.log("User ID:", req.user?.claims?.sub);
      console.log("Request body keys:", Object.keys(req.body));
      
      const userId = req.user.id;
      const validatedData = insertChatbotSchema.parse(req.body);
      console.log("Data validated successfully");
      
      // Check tier-based chatbot limits (admins bypass all limits)
      const user = await storage.getUser(userId);
      console.log("User tier:", user?.subscriptionTier, "Is admin:", user?.isAdmin);
      
      if (user && user.isAdmin !== "true") {
        const tier = user.subscriptionTier;
        const limits = TIER_LIMITS[tier];
        
        // Check if user has reached their tier's chatbot limit
        if (limits.chatbots !== -1) { // -1 means unlimited
          const existingChatbots = await storage.getAllChatbots(userId);
          if (existingChatbots.length >= limits.chatbots) {
            const nextTier = tier === "free" ? "Pro" : "Scale";
            const nextLimit = tier === "free" ? "5 chatbots" : "unlimited chatbots";
            console.log(`User hit ${tier} tier chatbot limit (${limits.chatbots})`);
            return res.status(403).json({
              error: "Upgrade required",
              message: `${tier === "free" ? "Free" : "Pro"} tier is limited to ${limits.chatbots} chatbot${limits.chatbots === 1 ? "" : "s"}. Upgrade to ${nextTier} for ${nextLimit}.`
            });
          }
        }
      }
      
      // Create chatbot immediately
      console.log("Creating chatbot in database...");
      const chatbot = await storage.createChatbot({
        ...validatedData,
        websiteContent: "", // Will be populated by background indexing
      }, userId);
      
      // Process documents immediately (since text is already extracted during upload)
      // Only URLs need async processing since crawling is slow
      const hasDocuments = validatedData.documentContent && validatedData.documentContent.trim().length > 0;
      if (hasDocuments) {
        console.log(`[CHUNKS] Processing documents immediately (content already extracted)...`);
        try {
          const { chunkContent } = await import('./chunker');
          const { embeddingService } = await import('./embedding');
          
          // Split content into chunks
          const contentChunks = chunkContent(validatedData.documentContent!, {
            title: chatbot.name,
          });
          
          console.log(`[CHUNKS] Generated ${contentChunks.length} chunks from documents, generating embeddings...`);
          
          // Convert chunks with embeddings
          const chunksWithEmbeddings = await Promise.all(
            contentChunks.map(async (chunk) => {
              try {
                const embedding = await embeddingService.generateEmbedding(chunk.text);
                return {
                  chatbotId: chatbot.id,
                  sourceType: 'document' as const,
                  sourceUrl: validatedData.documents?.[0] || 'Uploaded Documents',
                  sourceTitle: validatedData.documents?.[0] || 'Documents',
                  chunkText: chunk.text,
                  chunkIndex: chunk.index.toString(),
                  contentHash: chunk.contentHash,
                  embedding,
                  metadata: chunk.metadata,
                };
              } catch (err) {
                console.error(`[CHUNKS] Failed to generate embedding for chunk ${chunk.index}:`, err);
                return {
                  chatbotId: chatbot.id,
                  sourceType: 'document' as const,
                  sourceUrl: validatedData.documents?.[0] || 'Uploaded Documents',
                  sourceTitle: validatedData.documents?.[0] || 'Documents',
                  chunkText: chunk.text,
                  chunkIndex: chunk.index.toString(),
                  contentHash: chunk.contentHash,
                  metadata: chunk.metadata,
                };
              }
            })
          );
          
          await storage.createKnowledgeChunks(chunksWithEmbeddings);
          console.log(`[CHUNKS] ✓ Stored ${chunksWithEmbeddings.length} chunks from documents`);
        } catch (chunkError) {
          console.error(`[CHUNKS] Failed to process documents:`, chunkError);
          // Don't fail chatbot creation
        }
      }
      
      // Create indexing job for async URL processing
      const hasWebsiteUrls = validatedData.websiteUrls && validatedData.websiteUrls.length > 0;
      
      if (hasWebsiteUrls) {
        const websiteUrls = validatedData.websiteUrls;
        const totalTasks = websiteUrls.length;
        
        console.log(`[INDEXING] Creating indexing job with ${totalTasks} URL tasks`);
        
        // Create indexing job
        const indexingJob = await storage.createIndexingJob(chatbot.id, totalTasks);
        
        // Create indexing tasks for URLs only
        const tasks = websiteUrls.map(url => ({
          jobId: indexingJob.id,
          chatbotId: chatbot.id,
          sourceType: "website" as const,
          sourceUrl: url,
        }));
        
        await storage.createIndexingTasks(tasks);
        
        // Update chatbot indexing status in database
        await storage.updateChatbotIndexingStatus(chatbot.id, "pending", indexingJob.id);
        
        // Update the chatbot object to reflect the pending status
        chatbot.indexingStatus = "pending";
        chatbot.lastIndexingJobId = indexingJob.id;
        
        console.log(`[INDEXING] ✓ Created indexing job ${indexingJob.id} with ${tasks.length} URL tasks`);
        console.log(`[INDEXING] Background worker will crawl URLs asynchronously`);
      } else {
        // No URLs to index, mark as completed
        await storage.updateChatbotIndexingStatus(chatbot.id, "completed");
        chatbot.indexingStatus = "completed";
        console.log("[INDEXING] No URLs to index, chatbot ready");
      }
      
      console.log("✓ Chatbot created successfully:", chatbot.id);
      console.log("=== CHATBOT CREATION REQUEST COMPLETED ===");
      res.status(201).json(chatbot);
    } catch (error) {
      if (error instanceof ZodError) {
        console.error("Validation error:", error.errors);
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("=== CHATBOT CREATION ERROR ===");
      console.error("Error type:", error instanceof Error ? error.constructor.name : typeof error);
      console.error("Error message:", error instanceof Error ? error.message : String(error));
      console.error("Stack trace:", error instanceof Error ? error.stack : "No stack trace available");
      console.error("Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      console.error("=== END ERROR ===");
      res.status(500).json({ error: "Failed to create chatbot" });
    }
  });

  // Update chatbot (protected)
  app.put("/api/chatbots/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const chatbotId = req.params.id;
      const validatedData = insertChatbotSchema.partial().parse(req.body);
      
      // Note: Custom colors and logo are available for all tiers per pricing structure
      // No tier restrictions needed here
      
      // Get existing chatbot to compare knowledge sources
      const existingChatbot = await storage.getChatbot(chatbotId, userId);
      if (!existingChatbot) {
        return res.status(404).json({ error: "Chatbot not found" });
      }
      
      // Check if knowledge sources have actually changed
      const urlsChanged = validatedData.websiteUrls !== undefined && 
        JSON.stringify(validatedData.websiteUrls?.sort()) !== JSON.stringify((existingChatbot.websiteUrls || []).sort());
      
      const documentsChanged = validatedData.documentContent !== undefined &&
        validatedData.documentContent !== existingChatbot.documentContent;
      
      // If websiteUrls have actually changed, re-crawl them or clear content
      let updateData = { ...validatedData };
      if (urlsChanged) {
        console.log(`[UPDATE] Knowledge sources changed - URLs modified`);
        if (validatedData.websiteUrls && validatedData.websiteUrls.length > 0) {
          console.log(`Recursively re-crawling ${validatedData.websiteUrls.length} website(s) (max depth: 2, max pages: 200 per site)...`);
          const crawlResults = await crawlMultipleWebsitesRecursive(validatedData.websiteUrls, {
            maxDepth: 2,
            maxPages: 200,
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
          
          // PHASE 2: Recreate knowledge chunks after knowledge base update
          const chatbotId = req.params.id;
          if (updateData.websiteContent && updateData.websiteContent.length > 0) {
            console.log(`[CHUNKS] Recreating knowledge chunks for chatbot ${chatbotId}...`);
            try {
              // Delete old chunks first
              const deletedCount = await storage.deleteChunksForChatbot(chatbotId);
              console.log(`[CHUNKS] Deleted ${deletedCount} old chunks`);
              
              const { chunkContent } = await import('./chunker');
              const { embeddingService } = await import('./embedding');
              
              // Get chatbot name for metadata
              const existingChatbot = await storage.getChatbot(chatbotId, userId);
              
              // Split content into chunks
              const contentChunks = chunkContent(updateData.websiteContent, {
                title: existingChatbot?.name || 'Chatbot',
              });
              
              console.log(`[CHUNKS] Generated ${contentChunks.length} chunks, generating embeddings...`);
              
              // Convert ContentChunk[] to InsertKnowledgeChunk[] with embeddings
              const chunksWithEmbeddings = await Promise.all(
                contentChunks.map(async (chunk) => {
                  try {
                    const embedding = await embeddingService.generateEmbedding(chunk.text);
                    return {
                      chatbotId,
                      sourceType: 'website' as const,
                      sourceUrl: validatedData.websiteUrls?.[0] || 'Multiple URLs',
                      sourceTitle: existingChatbot?.name || 'Chatbot',
                      chunkText: chunk.text,
                      chunkIndex: chunk.index.toString(),
                      contentHash: chunk.contentHash,
                      embedding,
                      metadata: chunk.metadata,
                    };
                  } catch (err) {
                    console.error(`[CHUNKS] Failed to generate embedding for chunk ${chunk.index}:`, err);
                    return {
                      chatbotId,
                      sourceType: 'website' as const,
                      sourceUrl: validatedData.websiteUrls?.[0] || 'Multiple URLs',
                      sourceTitle: existingChatbot?.name || 'Chatbot',
                      chunkText: chunk.text,
                      chunkIndex: chunk.index.toString(),
                      contentHash: chunk.contentHash,
                      metadata: chunk.metadata,
                    };
                  }
                })
              );
              
              // Store chunks in database
              const storedChunks = await storage.createKnowledgeChunks(chunksWithEmbeddings);
              console.log(`[CHUNKS] ✓ Stored ${storedChunks.length} new chunks with embeddings`);
            } catch (chunkError) {
              console.error(`[CHUNKS] Failed to recreate chunks:`, chunkError);
              // Don't fail update if chunking fails
            }
          } else {
            // Delete chunks if content was cleared
            const deletedCount = await storage.deleteChunksForChatbot(chatbotId);
            console.log(`[CHUNKS] Deleted ${deletedCount} chunks (content cleared)`);
          }
        } else {
          // Clear websiteContent when all URLs are removed
          updateData.websiteContent = '';
          
          // Delete all chunks for this chatbot
          const chatbotId = req.params.id;
          const deletedCount = await storage.deleteChunksForChatbot(chatbotId);
          console.log(`[CHUNKS] Deleted ${deletedCount} chunks (URLs removed)`);
        }
      }
      
      // Handle document content changes
      if (documentsChanged) {
        console.log(`[UPDATE] Knowledge sources changed - Documents modified`);
        
        // Delete old document chunks first
        await db.delete(knowledgeChunks)
          .where(and(
            eq(knowledgeChunks.chatbotId, chatbotId),
            eq(knowledgeChunks.sourceType, 'document')
          ));
        console.log(`[UPDATE] Deleted old document chunks`);
        
        // Create new chunks if document content exists
        if (validatedData.documentContent && validatedData.documentContent.trim()) {
          const { chunkContent } = await import('./chunker');
          const { embeddingService } = await import('./embedding');
          
          const contentChunks = chunkContent(validatedData.documentContent, {
            title: existingChatbot.name,
          });
          
          console.log(`[UPDATE] Generated ${contentChunks.length} document chunks`);
          
          const chunksWithEmbeddings = await Promise.all(
            contentChunks.map(async (chunk) => {
              try {
                const embedding = await embeddingService.generateEmbedding(chunk.text);
                return {
                  chatbotId,
                  sourceType: 'document' as const,
                  sourceUrl: 'Uploaded Document',
                  sourceTitle: existingChatbot.name,
                  chunkText: chunk.text,
                  chunkIndex: chunk.index.toString(),
                  contentHash: chunk.contentHash,
                  embedding,
                  metadata: chunk.metadata,
                };
              } catch (err) {
                console.error(`[UPDATE] Failed to generate embedding for document chunk ${chunk.index}:`, err);
                return {
                  chatbotId,
                  sourceType: 'document' as const,
                  sourceUrl: 'Uploaded Document',
                  sourceTitle: existingChatbot.name,
                  chunkText: chunk.text,
                  chunkIndex: chunk.index.toString(),
                  contentHash: chunk.contentHash,
                  metadata: chunk.metadata,
                };
              }
            })
          );
          
          await storage.createKnowledgeChunks(chunksWithEmbeddings);
          console.log(`[UPDATE] ✓ Stored ${chunksWithEmbeddings.length} document chunks`);
        }
        
        // Clear Q&A cache when documents change
        const clearedCache = await storage.clearChatbotCache(chatbotId);
        console.log(`[UPDATE] Cleared ${clearedCache} cached Q&A entries`);
      }
      
      // Only log if knowledge sources haven't changed
      if (!urlsChanged && !documentsChanged) {
        console.log(`[UPDATE] No knowledge source changes detected - skipping reindex`);
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

  // Refresh knowledge base on-demand (protected) - Force complete re-index via async job
  app.post("/api/chatbots/:id/refresh-knowledge", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const chatbotId = req.params.id;
      
      console.log(`[Refresh] Starting knowledge base refresh for chatbot ${chatbotId}`);
      
      // Get the chatbot
      const chatbot = await storage.getChatbot(chatbotId, userId);
      if (!chatbot) {
        return res.status(404).json({ error: "Chatbot not found" });
      }
      
      // Clear existing chunks and metadata to force complete re-index
      const deletedChunks = await storage.deleteChunksForChatbot(chatbotId);
      console.log(`[Refresh] Deleted ${deletedChunks} existing chunks`);
      
      // Delete existing URL crawl metadata
      await db.delete(urlCrawlMetadata).where(eq(urlCrawlMetadata.chatbotId, chatbotId));
      console.log(`[Refresh] Deleted crawl metadata`);
      
      // Clear Q&A cache since we're rebuilding knowledge base
      const clearedCache = await storage.clearChatbotCache(chatbotId);
      console.log(`[Refresh] Cleared ${clearedCache} cached Q&A entries`);
      
      // Create an indexing job for the website URLs (if any)
      if (chatbot.websiteUrls && chatbot.websiteUrls.length > 0) {
        const job = await storage.createIndexingJob(chatbotId, chatbot.websiteUrls.length);
        
        console.log(`[Refresh] Created indexing job ${job.id} with ${chatbot.websiteUrls.length} URLs`);
        
        // Create indexing tasks for each URL
        const tasks = chatbot.websiteUrls.map(url => ({
          jobId: job.id,
          chatbotId,
          sourceType: 'website' as const,
          sourceUrl: url,
          status: 'pending' as const,
        }));
        
        await storage.createIndexingTasks(tasks);
        
        // Update chatbot indexing status to pending
        await storage.updateChatbotIndexingStatus(chatbotId, "pending", job.id);
        
        console.log(`[Refresh] Created ${chatbot.websiteUrls.length} indexing tasks`);
        
        res.json({
          success: true,
          message: `Knowledge base refresh started. Indexing ${chatbot.websiteUrls.length} URL(s) in background.`,
          jobId: job.id,
          urlCount: chatbot.websiteUrls.length,
        });
      } else {
        // No URLs to refresh
        res.json({
          success: true,
          message: "No website URLs to refresh.",
          urlCount: 0,
        });
      }
      
    } catch (error) {
      console.error("Error refreshing knowledge base:", error);
      res.status(500).json({ error: "Failed to refresh knowledge base" });
    }
  });

  // Delete chatbot (protected)
  app.delete("/api/chatbots/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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

  // Update chatbot with uploaded logo URL (available for all tiers)
  app.put("/api/chatbots/:id/logo", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
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

  // Upload and process documents (protected)
  app.post("/api/documents/upload", isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const file = req.file;
      const allowedTypes = ['application/pdf', 'text/plain', 'text/markdown'];
      const allowedExtensions = ['.pdf', '.txt', '.md'];
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return res.status(400).json({ 
          error: `File too large. Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB.` 
        });
      }
      
      // Atomically check and update knowledge base size (admins bypass)
      const user = await storage.getUser(userId);
      if (user && user.isAdmin !== "true") {
        const tier = user.subscriptionTier;
        const limits = TIER_LIMITS[tier];
        const additionalSizeMB = file.size / (1024 * 1024); // Convert bytes to MB
        
        // Use atomic check-and-update to prevent race conditions
        const sizeCheckResult = await storage.atomicCheckAndUpdateKnowledgeBaseSize(
          userId, 
          additionalSizeMB, 
          limits.knowledgeBaseSizeMB
        );
        
        if (!sizeCheckResult.success) {
          const nextTier = tier === "free" ? "Pro (1GB)" : tier === "pro" ? "Scale (5GB)" : null;
          const upgradeMsg = nextTier ? ` Upgrade to ${nextTier} for more storage.` : "";
          return res.status(403).json({
            error: "Storage limit exceeded",
            message: `Your ${tier} tier allows ${limits.knowledgeBaseSizeMB}MB of knowledge base storage. You're currently using ${sizeCheckResult.currentSizeMB.toFixed(2)}MB.${upgradeMsg}`
          });
        }
        
        // Size has been atomically updated, continue with upload
        console.log(`[Document Upload] Knowledge base size updated: ${sizeCheckResult.currentSizeMB.toFixed(2)}MB`);
      }

      // Validate file type
      const fileExtension = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
      if (!allowedTypes.includes(file.mimetype) && !allowedExtensions.includes(fileExtension)) {
        return res.status(400).json({ 
          error: "Invalid file type. Only PDF, TXT, and MD files are supported." 
        });
      }

      console.log(`[Document Upload] Processing file: ${file.originalname} (${file.size} bytes)`);

      // Extract text based on file type
      let extractedText = '';
      let title = file.originalname.replace(/\.[^/.]+$/, ""); // Remove extension

      if (fileExtension === '.pdf') {
        // Extract text from PDF
        try {
          // Import pdf-parse (CommonJS module)
          // Handle both ESM and CommonJS module exports, including class constructors in production builds
          const pdfParseModule: any = await import('pdf-parse');
          
          // Default options for pdf-parse to prevent "Cannot read properties of undefined" errors
          const pdfOptions = { max: 0 }; // max: 0 means no page limit
          
          let pdfData;
          
          // Strategy 1: Try default export as function
          if (pdfParseModule.default && typeof pdfParseModule.default === 'function') {
            try {
              pdfData = await pdfParseModule.default(file.buffer, pdfOptions);
              console.log('[Document Upload] Used default export');
            } catch (error: any) {
              if (error.message && error.message.includes('cannot be invoked without')) {
                // It's a class constructor, skip to strategy 3
                console.log('[Document Upload] Default export is a class, trying alternative');
              } else {
                throw error;
              }
            }
          }
          
          // Strategy 2: Try module itself as function
          if (!pdfData && typeof pdfParseModule === 'function') {
            try {
              pdfData = await pdfParseModule(file.buffer, pdfOptions);
              console.log('[Document Upload] Used module itself');
            } catch (error: any) {
              if (!error.message || !error.message.includes('cannot be invoked without')) {
                throw error;
              }
              console.log('[Document Upload] Module is a class, trying alternative');
            }
          }
          
          // Strategy 3: Try named export PDFParse (common in some builds)
          if (!pdfData && pdfParseModule.PDFParse && typeof pdfParseModule.PDFParse === 'function') {
            try {
              pdfData = await pdfParseModule.PDFParse(file.buffer, pdfOptions);
              console.log('[Document Upload] Used named export PDFParse');
            } catch (error: any) {
              console.log('[Document Upload] Named export PDFParse failed, trying fallback');
            }
          }
          
          // Strategy 4: Handle class constructor exports (production builds)
          if (!pdfData) {
            const parse = pdfParseModule.default || pdfParseModule.PDFParse || pdfParseModule;
            
            if (typeof parse !== 'function') {
              console.error('[Document Upload] Module structure:', Object.keys(pdfParseModule));
              throw new Error('pdf-parse module did not export a callable function');
            }
            
            try {
              pdfData = await parse(file.buffer, pdfOptions);
              console.log('[Document Upload] Direct call succeeded');
            } catch (classError: any) {
              if (classError.message && classError.message.includes('cannot be invoked without')) {
                // It's a class constructor - try instantiating it with buffer and options
                console.log('[Document Upload] Detected class constructor, instantiating with arguments...');
                
                try {
                  // Try passing buffer and options to constructor (most common pattern)
                  const directInstance = new parse(file.buffer, pdfOptions);
                  // Check if it's a promise and await it
                  pdfData = directInstance && typeof directInstance.then === 'function' 
                    ? await directInstance 
                    : directInstance;
                  console.log('[Document Upload] Used constructor with buffer and options');
                  
                  // Handle case where instance has 'doc' property instead of 'text'
                  if (pdfData && !pdfData.text && pdfData.doc) {
                    console.log('[Document Upload] Instance has doc property, extracting text from doc');
                    console.log('[Document Upload] Doc structure:', typeof pdfData.doc === 'object' ? Object.keys(pdfData.doc) : typeof pdfData.doc);
                    
                    // The doc property might contain the parsed PDF structure
                    // Try to extract text from common locations
                    if (pdfData.doc.text) {
                      // Standard case: doc.text exists
                      pdfData = { text: pdfData.doc.text, numpages: pdfData.doc.numpages };
                    } else if (typeof pdfData.doc === 'string') {
                      // Edge case: doc itself is the text
                      pdfData = { text: pdfData.doc };
                    } else if (pdfData.doc && typeof pdfData.doc === 'object') {
                      // Deep inspection: look for text in nested properties
                      const textContent = pdfData.doc.Pages?.Text || 
                                         pdfData.doc.pages?.text || 
                                         pdfData.doc.content?.text ||
                                         pdfData.doc.data?.text ||
                                         pdfData.doc.result?.text;
                      
                      if (textContent) {
                        pdfData = { text: textContent };
                        console.log('[Document Upload] Found text in nested doc property');
                      } else {
                        // Last resort: try to stringify and search for text content
                        console.log('[Document Upload] Unable to locate text in doc, attempting deep search...');
                        const docStr = JSON.stringify(pdfData.doc);
                        console.log('[Document Upload] Doc preview:', docStr.substring(0, 200));
                        
                        // If doc contains any text-like content, it might be unusable
                        // Leave pdfData as-is and let the error handler below catch it
                      }
                    }
                  }
                } catch (instError: any) {
                  console.error('[Document Upload] Class instantiation failed:', instError.message);
                  throw instError;
                }
              } else {
                throw classError;
              }
            }
          }
          
          if (!pdfData || !pdfData.text) {
            console.error('[Document Upload] PDF data structure:', pdfData ? Object.keys(pdfData) : 'null');
            
            // Strategy 5: Try unpdf (modern pdf-parse replacement)
            console.log('[Document Upload] Trying unpdf as fallback...');
            
            try {
              const { extractText, getDocumentProxy } = await import('unpdf');
              const pdf = await getDocumentProxy(new Uint8Array(file.buffer));
              const { text } = await extractText(pdf, { mergePages: true });
              
              if (text && text.trim().length > 50) {
                console.log(`[Document Upload] unpdf extraction succeeded: ${text.length} chars`);
                extractedText = text.trim();
              } else {
                console.log('[Document Upload] unpdf returned insufficient text');
                throw new Error('unpdf returned insufficient text');
              }
            } catch (unpdfError: any) {
              console.error('[Document Upload] unpdf failed:', unpdfError.message);
              
              // Strategy 6 (LAST RESORT): Extract basic text using simple buffer scanning
              // This is a very basic fallback for when both pdf-parse and unpdf fail
              console.log('[Document Upload] All library strategies failed, attempting basic text extraction...');
            
              try {
                // Convert buffer to string and extract visible text
                const bufferStr = file.buffer.toString('utf-8', 0, Math.min(file.buffer.length, 1000000));
                
                // Very basic PDF text extraction - find text between stream markers
                const textMatches = bufferStr.match(/\((.*?)\)/g);
                
                if (textMatches && textMatches.length > 0) {
                  extractedText = textMatches
                    .map((m: string) => m.slice(1, -1)) // Remove parentheses
                    .filter((t: string) => t.length > 2 && /[a-zA-Z]/.test(t)) // Filter out junk
                    .join(' ')
                    .replace(/\\[nrt]/g, ' ') // Remove escape sequences
                    .replace(/\s+/g, ' ') // Normalize whitespace
                    .replace(/[^\x20-\x7E\n\r\t]/g, '') // Remove non-printable/control chars (keep only ASCII 32-126 + newlines/tabs)
                    .replace(/\0/g, '') // Remove null bytes
                    .trim();
                  
                  if (extractedText.length > 50) {
                    console.log(`[Document Upload] Basic extraction found ${extractedText.length} chars (sanitized)`);
                  } else {
                    throw new Error('Basic extraction yielded insufficient text');
                  }
                } else {
                  throw new Error('No text patterns found in PDF buffer');
                }
              } catch (basicError) {
                console.error('[Document Upload] Basic extraction also failed:', basicError);
                throw new Error('Failed to extract text from PDF - no text property found');
              }
            }
          } else {
            extractedText = pdfData.text.trim();
          }
          console.log(`[Document Upload] Extracted ${extractedText.length} characters from PDF`);
        } catch (error: any) {
          console.error("[Document Upload] PDF extraction error:", error);
          console.error("[Document Upload] Error stack:", error.stack);
          return res.status(500).json({ 
            error: "Failed to extract text from PDF: " + error.message 
          });
        }
      } else {
        // Text or Markdown file
        extractedText = file.buffer.toString('utf-8').trim();
        console.log(`[Document Upload] Read ${extractedText.length} characters from text file`);
      }

      if (!extractedText) {
        return res.status(400).json({ error: "Could not extract any text from the document" });
      }

      // Upload file to object storage
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath = objectStorageService.extractObjectPath(uploadURL);

      // Upload the file buffer directly to object storage
      const objectFile = objectStorageService.getObjectEntityFile(objectPath);
      await objectFile.save(file.buffer, {
        contentType: file.mimetype,
        metadata: {
          originalName: file.originalname,
          uploadedAt: new Date().toISOString(),
        },
      });

      console.log(`[Document Upload] Uploaded to object storage: ${objectPath}`);

      res.json({
        success: true,
        document: {
          path: objectPath,
          originalName: file.originalname,
          title: title,
          text: extractedText,
          size: file.size,
          type: fileExtension,
        },
      });

    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ error: "Failed to upload document" });
    }
  });

  // Start background indexing for URLs (protected)
  app.post("/api/indexing/start", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { urls } = req.body;

      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({ error: "At least one URL is required" });
      }

      // Generate unique job ID
      const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create job
      const job: IndexingJob = {
        id: jobId,
        userId,
        status: 'pending',
        progress: {
          totalUrls: urls.length,
          processedUrls: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      indexingJobs.set(jobId, job);

      // Start background indexing (don't await)
      (async () => {
        try {
          console.log(`[Indexing ${jobId}] Starting to index ${urls.length} URLs`);
          job.status = 'in_progress';
          job.updatedAt = new Date();

          // Crawl websites
          const crawlResult = await crawlMultipleWebsitesRecursive(urls);

          job.status = 'completed';
          job.result = {
            websiteContent: crawlResult.content,
            urlMetadata: crawlResult.urlMetadata,
          };
          job.progress.processedUrls = urls.length;
          job.updatedAt = new Date();

          console.log(`[Indexing ${jobId}] ✓ Completed successfully`);
        } catch (error: any) {
          console.error(`[Indexing ${jobId}] ✗ Failed:`, error);
          job.status = 'failed';
          job.error = error.message || 'Unknown error occurred during indexing';
          job.updatedAt = new Date();
        }
      })();

      res.json({
        jobId,
        status: job.status,
        progress: job.progress,
      });

    } catch (error) {
      console.error("Error starting indexing job:", error);
      res.status(500).json({ error: "Failed to start indexing" });
    }
  });

  // Get indexing job status (protected)
  app.get("/api/indexing/status/:jobId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { jobId } = req.params;

      const job = indexingJobs.get(jobId);

      if (!job) {
        return res.status(404).json({ error: "Indexing job not found" });
      }

      // Verify job belongs to user
      if (job.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      res.json({
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        result: job.result,
        error: job.error,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      });

    } catch (error) {
      console.error("Error fetching indexing status:", error);
      res.status(500).json({ error: "Failed to fetch indexing status" });
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

      // Check chatbot owner's subscription tier and enforce limits
      // Admins bypass all limits
      const ownerResult = await db.select().from(users).where(eq(users.id, chatbot.userId)).limit(1);
      const owner = ownerResult[0];
      
      if (owner && owner.isAdmin !== "true") {
        const tier = owner.subscriptionTier;
        
        // For free tier: use total question count (3 total questions ever)
        if (tier === "free") {
          const currentQuestionCount = parseInt(chatbot.questionCount);
          if (currentQuestionCount >= TIER_LIMITS.free.conversationsPerMonth) {
            return res.json({ 
              message: "I apologize, but this chatbot has reached its free tier limit. The chatbot owner needs to upgrade to continue.",
              shouldEscalate: false,
            });
          }
        } 
        // For pro/scale tiers: use monthly conversation count
        else {
          const monthlyCount = parseInt(owner.monthlyConversationCount || "0");
          if (!canSendMessage(tier, monthlyCount)) {
            const limit = TIER_LIMITS[tier].conversationsPerMonth;
            const nextTier = tier === "pro" ? "Scale" : null;
            const upgradeMsg = nextTier 
              ? ` The chatbot owner needs to upgrade to ${nextTier} for higher limits.`
              : " The chatbot owner has reached their monthly limit.";
            
            return res.json({ 
              message: `I apologize, but this chatbot has reached its ${tier === "pro" ? "Pro" : "Scale"} tier limit of ${limit.toLocaleString()} conversations this month.${upgradeMsg}`,
              shouldEscalate: false,
            });
          }
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
      if (chatbot.documentContent) {
        knowledgeContext += `Document Content:\n${chatbot.documentContent}\n\n`;
      }

      // Build conversation history for context
      const conversationContext = conversationHistory
        .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
        .join("\n");

      // Normalize question for caching (lowercase + trim)
      const normalizedQuestion = message.trim().toLowerCase();
      const questionHash = crypto.createHash('md5').update(normalizedQuestion).digest('hex');
      
      // 1. FIRST: Check for manual override (highest priority - human-corrected answers)
      console.log(`[MANUAL OVERRIDE CHECK] Looking for override with hash: ${questionHash} for question: "${normalizedQuestion}"`);
      
      // Generate embedding for semantic matching
      let questionEmbedding: number[] | null = null;
      try {
        questionEmbedding = await embeddingService.generateEmbedding(normalizedQuestion);
      } catch (error) {
        console.error("[EMBEDDING] Error generating embedding for override check:", error);
      }
      
      // Try exact match first
      let manualOverride = await storage.getManualOverride(chatbotId, questionHash);
      let overrideMatchType = "none";
      
      if (!manualOverride && questionEmbedding) {
        // No exact match, try semantic similarity
        manualOverride = await storage.findSimilarManualOverride(chatbotId, questionEmbedding, 0.85);
        if (manualOverride) {
          overrideMatchType = "semantic";
        }
      } else if (manualOverride) {
        overrideMatchType = "exact";
      }
      
      let aiMessage: string;
      let suggestedQuestions: string[] = [];
      
      if (manualOverride) {
        // Manual override found! Use human-trained answer
        console.log(`[MANUAL OVERRIDE ${overrideMatchType.toUpperCase()} HIT] Using manually trained answer for question: "${message.substring(0, 50)}..."`);
        aiMessage = manualOverride.manualAnswer;
        
        // Update use count asynchronously
        storage.incrementOverrideUseCount(manualOverride.id).catch(err => {
          console.error("Error updating override use count:", err);
        });
      } else {
        // 2. No manual override, check automated cache
        // (embedding already generated above for override check)
        
        // Check cache for existing answer
        // Strategy: Try exact match first (fast), then semantic match (slower but catches paraphrases)
        let cachedAnswer = await storage.getCachedAnswer(chatbotId, questionHash);
        let cacheType = "none";
        
        if (!cachedAnswer && questionEmbedding) {
          // No exact match, try semantic similarity (threshold: 0.85 = 85% similar)
          cachedAnswer = await storage.findSimilarCachedAnswer(chatbotId, questionEmbedding, 0.85);
          if (cachedAnswer) {
            cacheType = "semantic";
          }
        } else if (cachedAnswer) {
          cacheType = "exact";
        }
        
        if (cachedAnswer) {
          // Cache hit! Use cached answer
          console.log(`[CACHE ${cacheType.toUpperCase()} HIT] Using cached answer for question: "${message.substring(0, 50)}..."`);
          aiMessage = cachedAnswer.answer;
          suggestedQuestions = cachedAnswer.suggestedQuestions || [];
          
          // Update cache hit count asynchronously (don't await to keep response fast)
          storage.updateCacheHitCount(cachedAnswer.id).catch(err => {
            console.error("Error updating cache hit count:", err);
          });
        } else {
        // Cache miss - call LLM
        console.log(`[CACHE MISS] Calling LLM for question hash: ${questionHash}`);
        
        // Create the full prompt for the main response
        const fullPrompt = `${chatbot.systemPrompt}

Knowledge Base:
${knowledgeContext || "No specific knowledge base provided."}

Previous Conversation:
${conversationContext || "No previous conversation."}

User Question: ${message}

Please answer based on the knowledge base provided. If you cannot find the answer in the knowledge base, politely let the user know and suggest they contact support${chatbot.supportPhoneNumber ? ` at ${chatbot.supportPhoneNumber}` : ""}.`;

        // Call LLM for main response, and optionally for suggested questions in parallel
        console.log(`[LLM] ========== REGULAR CHAT REQUEST ==========`);
        console.log(`[LLM] Model: gemini-2.5-flash`);
        console.log(`[LLM] Main prompt length: ${fullPrompt.length} chars`);
        console.log(`[LLM] Main prompt preview: ${fullPrompt.substring(0, 500)}...`);
        
        const llmStart = Date.now();
        const requests = [
          // Main response
          genAI.models.generateContent({
            model: "gemini-2.5-flash",
            contents: fullPrompt,
          })
        ];
        
        // Only generate suggested questions if enabled
        if (chatbot.enableSuggestedQuestions === "true") {
          const suggestionsPrompt = `Based on this conversation, suggest 3 relevant follow-up questions (each under 60 characters).

Knowledge Base Topics:
${knowledgeContext ? knowledgeContext.substring(0, 1500) : "General customer support"}

User's Question: ${message}

Generate 3 short, natural questions that would help the user learn more. Return only the questions, one per line, without numbering.`;
          
          console.log(`[LLM] Suggestions prompt length: ${suggestionsPrompt.length} chars`);
          requests.push(
            genAI.models.generateContent({
              model: "gemini-2.5-flash",
              contents: suggestionsPrompt,
            }).catch(err => {
              console.error("[LLM] Error generating suggested questions:", err);
              return null;
            })
          );
        }
        
        const results = await Promise.all(requests);
        const mainResult = results[0];
        const suggestionsResult = results[1] || null;
        
        const llmTime = Date.now() - llmStart;
        console.log(`[LLM] Requests complete in ${llmTime}ms`);

        aiMessage = mainResult.text || "I apologize, but I couldn't generate a response.";
        console.log(`[LLM] Main response length: ${aiMessage.length} chars`);
        console.log(`[LLM] Main response preview: ${aiMessage.substring(0, 300)}...`);
        
        if (suggestionsResult) {
          try {
            const suggestionsText = suggestionsResult.text || "";
            suggestedQuestions = suggestionsText
              .split('\n')
              .map(q => q.trim())
              .filter(q => q.length > 0 && q.length < 100)
              .slice(0, 3);
          } catch (error) {
            console.error("Error parsing suggested questions:", error);
          }
        }
        
          // Store in cache for future use (async, don't await)
          storage.createCacheEntry({
            chatbotId,
            question: normalizedQuestion,
            questionHash,
            embedding: questionEmbedding || undefined,
            answer: aiMessage,
            suggestedQuestions,
            lastUsedAt: new Date(),
          }).catch(err => {
            console.error("Error storing answer in cache:", err);
          });
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
      
      // Increment monthly conversation count for pro/scale tiers
      if (owner && owner.isAdmin !== "true" && (owner.subscriptionTier === "pro" || owner.subscriptionTier === "scale")) {
        storage.incrementMonthlyConversationCount(owner.id).catch(err => {
          console.error("Error incrementing monthly conversation count:", err);
        });
      }

      const chatResponse: ChatResponse = {
        message: finalMessage,
        shouldEscalate,
        suggestedQuestions,
        conversationId: conversation.id,
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

  // Streaming chat endpoint - Server-Sent Events (SSE) for real-time responses
  app.post("/api/chat/stream", async (req, res) => {
    const perfStart = performance.now();
    const perfTimings: Record<string, number> = {};
    
    try {
      const { chatbotId, message, conversationHistory, sessionId } = req.body as ChatRequest;

      if (!chatbotId || !message) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

      // Get chatbot
      const dbStart = performance.now();
      const chatbotResult = await db.select().from(chatbots).where(eq(chatbots.id, chatbotId)).limit(1);
      const chatbot = chatbotResult[0];
      perfTimings.dbChatbotFetch = performance.now() - dbStart;
      
      if (!chatbot) {
        res.write(`data: ${JSON.stringify({ error: "Chatbot not found" })}\n\n`);
        return res.end();
      }

      // Check subscription tier limits
      const ownerStart = performance.now();
      const ownerResult = await db.select().from(users).where(eq(users.id, chatbot.userId)).limit(1);
      const owner = ownerResult[0];
      perfTimings.dbOwnerFetch = performance.now() - ownerStart;
      
      if (owner && owner.isAdmin !== "true") {
        const tier = owner.subscriptionTier;
        
        // For free tier: use total question count (3 total questions ever)
        if (tier === "free") {
          const currentQuestionCount = parseInt(chatbot.questionCount);
          if (currentQuestionCount >= TIER_LIMITS.free.conversationsPerMonth) {
            res.write(`data: ${JSON.stringify({ 
              type: "complete",
              message: "I apologize, but this chatbot has reached its free tier limit. The chatbot owner needs to upgrade to continue.",
              shouldEscalate: false,
            })}\n\n`);
            return res.end();
          }
        } 
        // For pro/scale tiers: use monthly conversation count
        else {
          const monthlyCount = parseInt(owner.monthlyConversationCount || "0");
          if (!canSendMessage(tier, monthlyCount)) {
            const limit = TIER_LIMITS[tier].conversationsPerMonth;
            const nextTier = tier === "pro" ? "Scale" : null;
            const upgradeMsg = nextTier 
              ? ` The chatbot owner needs to upgrade to ${nextTier} for higher limits.`
              : " The chatbot owner has reached their monthly limit.";
            
            res.write(`data: ${JSON.stringify({ 
              type: "complete",
              message: `I apologize, but this chatbot has reached its ${tier === "pro" ? "Pro" : "Scale"} tier limit of ${limit.toLocaleString()} conversations this month.${upgradeMsg}`,
              shouldEscalate: false,
            })}\n\n`);
            return res.end();
          }
        }
      }

      // Find or create conversation
      const conversationStart = performance.now();
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
      perfTimings.conversationLookup = performance.now() - conversationStart;

      // Build knowledge base context - USE CHUNK-BASED RETRIEVAL if available
      let knowledgeContext = "";
      let usingChunks = false;
      
      // Check if chunks are available for this chatbot
      const chunkCountStart = performance.now();
      const chunkCount = await storage.countChunksForChatbot(chatbotId);
      perfTimings.chunkCountQuery = performance.now() - chunkCountStart;
      
      if (chunkCount > 0) {
        // PHASE 2: Use chunk-based retrieval for efficient, targeted context
        console.log(`[STREAMING] Using chunk-based retrieval (${chunkCount} chunks available)`);
        usingChunks = true;
        // Chunks will be retrieved after we generate the question embedding
      } else {
        // FALLBACK: Use truncated full content (Phase 1 optimization)
        console.log(`[STREAMING] No chunks available, using truncated full content`);
        const MAX_KNOWLEDGE_SIZE = 8000;
        
        if (chatbot.websiteContent) {
          const websitePreview = chatbot.websiteContent.substring(0, MAX_KNOWLEDGE_SIZE / 2);
          knowledgeContext += `Website Content:\n${websitePreview}\n\n`;
        }
        if (chatbot.documentContent) {
          const docPreview = chatbot.documentContent.substring(0, MAX_KNOWLEDGE_SIZE / 2);
          knowledgeContext += `Document Content:\n${docPreview}\n\n`;
        }
      }

      // Build conversation history
      const conversationContext = conversationHistory
        .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
        .join("\n");

      // Normalize question for caching
      const normalizedQuestion = message.trim().toLowerCase();
      const questionHash = crypto.createHash('md5').update(normalizedQuestion).digest('hex');
      
      // Generate embedding once for all cache checks AND chunk retrieval
      let questionEmbedding: number[] | null = null;
      const embeddingStart = performance.now();
      try {
        questionEmbedding = await embeddingService.generateEmbedding(normalizedQuestion);
      } catch (error) {
        console.error("[EMBEDDING] Error generating embedding:", error);
      }
      perfTimings.embeddingGeneration = performance.now() - embeddingStart;
      
      // If using chunks, retrieve relevant chunks NOW (before cache checks)
      let chunksRetrievedSuccessfully = false;
      if (usingChunks && questionEmbedding) {
        const retrievalStart = performance.now();
        try {
          // Use hybrid retrieval (semantic + lexical) for better accuracy on specific terms
          // Dynamically scale chunks: use more chunks for comprehensive coverage
          const targetChunks = Math.min(chunkCount, 30);
          const relevantChunks = await storage.getHybridRelevantChunks(chatbotId, message, questionEmbedding, targetChunks);
          perfTimings.hybridRetrieval = performance.now() - retrievalStart;
          
          if (relevantChunks.length > 0) {
            console.log(`[STREAMING] Hybrid retrieval found ${relevantChunks.length} relevant chunks`);
            
            // Debug: Log chunk lengths
            relevantChunks.forEach((chunk, idx) => {
              console.log(`[STREAMING] Chunk ${idx + 1}: ${chunk.chunkText.length} chars - ${chunk.chunkText.substring(0, 80)}...`);
            });
            
            // Build context from relevant chunks with clear URL references
            knowledgeContext = relevantChunks
              .map((chunk, idx) => {
                const sourceUrl = chunk.sourceUrl || '';
                const sourceTitle = chunk.sourceTitle || 'Website';
                return `[Content from ${sourceUrl}]\nPage Title: ${sourceTitle}\n\n${chunk.chunkText}`;
              })
              .join('\n\n---\n\n');
            
            console.log(`[STREAMING] Knowledge context size: ${knowledgeContext.length} characters`);
            chunksRetrievedSuccessfully = true;
          } else {
            console.log(`[STREAMING] No relevant chunks found, falling back to truncated content`);
          }
        } catch (error) {
          console.error("[STREAMING] Error retrieving chunks:", error);
        }
      }
      
      // CRITICAL FALLBACK: If chunks weren't retrieved successfully (embedding failed, retrieval error, or no results)
      // ALWAYS rebuild truncated content to ensure LLM has knowledge context
      if (usingChunks && !chunksRetrievedSuccessfully) {
        console.log(`[STREAMING] Chunk retrieval failed or returned no results, falling back to truncated content`);
        const MAX_KNOWLEDGE_SIZE = 8000;
        
        // RESET knowledgeContext and rebuild from original content
        knowledgeContext = "";
        
        if (chatbot.websiteContent) {
          const websitePreview = chatbot.websiteContent.substring(0, MAX_KNOWLEDGE_SIZE / 2);
          knowledgeContext += `Website Content:\n${websitePreview}\n\n`;
        }
        if (chatbot.documentContent) {
          const docPreview = chatbot.documentContent.substring(0, MAX_KNOWLEDGE_SIZE / 2);
          knowledgeContext += `Document Content:\n${docPreview}\n\n`;
        }
        
        console.log(`[STREAMING] Fallback context size: ${knowledgeContext.length} characters`);
      }
      
      // Check manual override first
      const cacheStart = performance.now();
      let manualOverride = await storage.getManualOverride(chatbotId, questionHash);
      if (!manualOverride && questionEmbedding) {
        manualOverride = await storage.findSimilarManualOverride(chatbotId, questionEmbedding, 0.85);
      }
      perfTimings.manualOverrideCheck = performance.now() - cacheStart;
      
      let aiMessage: string;
      let suggestedQuestions: string[] = [];
      
      if (manualOverride) {
        // Manual override found - send immediately (no streaming needed)
        console.log(`[STREAMING] Manual override hit - sending cached answer`);
        aiMessage = manualOverride.manualAnswer;
        
        res.write(`data: ${JSON.stringify({ 
          type: "complete",
          message: aiMessage,
          shouldEscalate: false,
        })}\n\n`);
        
        storage.incrementOverrideUseCount(manualOverride.id).catch(() => {});
      } else {
        // Check automated cache
        const autoCacheStart = performance.now();
        let cachedAnswer = await storage.getCachedAnswer(chatbotId, questionHash);
        if (!cachedAnswer && questionEmbedding) {
          cachedAnswer = await storage.findSimilarCachedAnswer(chatbotId, questionEmbedding, 0.85);
        }
        perfTimings.automatedCacheCheck = performance.now() - autoCacheStart;
        
        if (cachedAnswer) {
          // Cache hit - send immediately
          console.log(`[STREAMING] Cache hit - sending cached answer`);
          aiMessage = cachedAnswer.answer;
          suggestedQuestions = cachedAnswer.suggestedQuestions || [];
          
          res.write(`data: ${JSON.stringify({ 
            type: "complete",
            message: aiMessage,
            shouldEscalate: false,
            suggestedQuestions,
          })}\n\n`);
          
          storage.updateCacheHitCount(cachedAnswer.id).catch(() => {});
        } else {
          // Cache miss - stream from LLM
          console.log(`[STREAMING] Cache miss - streaming from LLM`);
          
          const fullPrompt = `${chatbot.systemPrompt}

Knowledge Base:
${knowledgeContext || "No specific knowledge base provided."}

Previous Conversation:
${conversationContext || "No previous conversation."}

User Question: ${message}

IMPORTANT INSTRUCTIONS:
1. Answer based on the knowledge base provided above
2. When citing sources or directing users to more information, ALWAYS use the complete URL (e.g., https://example.com/page), NEVER say "Source" or "Source 1" or reference numbered sources
3. Keep responses concise and natural
4. If you cannot find the answer in the knowledge base, politely let the user know and suggest they contact support${chatbot.supportPhoneNumber ? ` at ${chatbot.supportPhoneNumber}` : ""}

CORRECT citation examples:
✓ "You can learn more at https://example.com/about-us"
✓ "Visit https://example.com/pricing for pricing details"
✓ "See the floor plans at https://example.com/floor-plans"

INCORRECT citation examples (NEVER do this):
✗ "You can find this in Source"
✗ "According to Source 1..."
✗ "See Source for more details"`;

          // Stream the main response
          const llmStart = performance.now();
          let fullResponse = "";
          try {
            console.log(`[LLM] ========== STREAMING REQUEST ==========`);
            console.log(`[LLM] Model: gemini-2.5-flash`);
            console.log(`[LLM] Prompt length: ${fullPrompt.length} chars`);
            console.log(`[LLM] Prompt preview: ${fullPrompt.substring(0, 500)}...`);
            console.log(`[LLM] Starting streaming...`);
            
            const stream = await genAI.models.generateContentStream({
              model: "gemini-2.5-flash",
              contents: fullPrompt,
            });

            let chunkCount = 0;
            for await (const chunk of stream) {
              const chunkText = chunk.text || "";
              if (chunkText) {
                chunkCount++;
                fullResponse += chunkText;
                // Send chunk to client
                res.write(`data: ${JSON.stringify({ 
                  type: "chunk",
                  content: chunkText,
                })}\n\n`);
              }
            }
            perfTimings.llmStreaming = performance.now() - llmStart;

            console.log(`[LLM] Streaming complete: ${chunkCount} chunks, ${perfTimings.llmStreaming.toFixed(2)}ms`);
            console.log(`[LLM] Response length: ${fullResponse.length} chars`);
            console.log(`[LLM] Response preview: ${fullResponse.substring(0, 300)}...`);
            console.log(`[LLM] ========================================`);

            aiMessage = fullResponse || "I apologize, but I couldn't generate a response.";
            
            // DISABLED: Follow-up question generation (redundant with 20 rotating AI questions from DB)
            // This was causing 11+ second delay after main response
            // The widget already shows rotating questions from aiGeneratedQuestions array
            // if (chatbot.enableSuggestedQuestions === "true") {
            //   ... generate 3 follow-up questions ...
            // }
            
            // Send completion event
            res.write(`data: ${JSON.stringify({ 
              type: "complete",
              suggestedQuestions,
            })}\n\n`);
            
            // Store in cache
            storage.createCacheEntry({
              chatbotId,
              question: normalizedQuestion,
              questionHash,
              embedding: questionEmbedding || undefined,
              answer: aiMessage,
              suggestedQuestions,
              lastUsedAt: new Date(),
            }).catch(err => console.error("Error caching:", err));
            
          } catch (streamError) {
            console.error("Streaming error:", streamError);
            res.write(`data: ${JSON.stringify({ 
              type: "error",
              message: "I apologize, but I encountered an error. Please try again."
            })}\n\n`);
            aiMessage = "I apologize, but I encountered an error. Please try again.";
          }
        }
      }

      // Check escalation
      const shouldEscalate =
        aiMessage.toLowerCase().includes("contact support") ||
        aiMessage.toLowerCase().includes("speak with") ||
        aiMessage.toLowerCase().includes("human representative") ||
        aiMessage.toLowerCase().includes("don't know") ||
        aiMessage.toLowerCase().includes("cannot find");

      let finalMessage = aiMessage;
      
      if (shouldEscalate && chatbot.supportPhoneNumber && chatbot.escalationMessage) {
        const escalationText = chatbot.escalationMessage.replace("{phone}", chatbot.supportPhoneNumber);
        if (!finalMessage.includes(chatbot.supportPhoneNumber)) {
          finalMessage += `\n\n${escalationText}`;
        }
      }

      // Save messages to database
      const dbSaveStart = performance.now();
      const newMessageCount = (parseInt(conversation.messageCount) + 2).toString();
      await Promise.all([
        db.insert(conversationMessages).values({
          conversationId: conversation.id,
          role: "user",
          content: message,
          wasEscalated: "false",
        }),
        db.insert(conversationMessages).values({
          conversationId: conversation.id,
          role: "assistant",
          content: finalMessage,
          suggestedQuestions: suggestedQuestions.length > 0 ? suggestedQuestions : [],
          wasEscalated: shouldEscalate ? "true" : "false",
        }),
        db.update(conversations)
          .set({
            messageCount: newMessageCount,
            lastMessageAt: new Date(),
            wasEscalated: shouldEscalate ? "true" : conversation.wasEscalated,
          })
          .where(eq(conversations.id, conversation.id)),
        storage.incrementChatbotQuestionCount(chatbotId)
      ]);
      perfTimings.dbSaveMessages = performance.now() - dbSaveStart;
      
      // Increment monthly conversation count for pro/scale tiers
      if (owner && owner.isAdmin !== "true" && (owner.subscriptionTier === "pro" || owner.subscriptionTier === "scale")) {
        storage.incrementMonthlyConversationCount(owner.id).catch(err => {
          console.error("Error incrementing monthly conversation count:", err);
        });
      }

      // Calculate total time and log performance breakdown
      const totalTime = performance.now() - perfStart;
      console.log(`[PERF-CHAT] ========== Performance Breakdown ==========`);
      console.log(`[PERF-CHAT] DB Chatbot Fetch: ${perfTimings.dbChatbotFetch?.toFixed(2)}ms`);
      console.log(`[PERF-CHAT] DB Owner Fetch: ${perfTimings.dbOwnerFetch?.toFixed(2)}ms`);
      console.log(`[PERF-CHAT] Conversation Lookup: ${perfTimings.conversationLookup?.toFixed(2)}ms`);
      console.log(`[PERF-CHAT] Chunk Count Query: ${perfTimings.chunkCountQuery?.toFixed(2)}ms`);
      console.log(`[PERF-CHAT] Embedding Generation: ${perfTimings.embeddingGeneration?.toFixed(2)}ms`);
      console.log(`[PERF-CHAT] Hybrid Retrieval: ${perfTimings.hybridRetrieval?.toFixed(2) || 'N/A'}ms`);
      console.log(`[PERF-CHAT] Manual Override Check: ${perfTimings.manualOverrideCheck?.toFixed(2)}ms`);
      console.log(`[PERF-CHAT] Automated Cache Check: ${perfTimings.automatedCacheCheck?.toFixed(2) || 'N/A'}ms`);
      console.log(`[PERF-CHAT] LLM Streaming: ${perfTimings.llmStreaming?.toFixed(2) || 'N/A'}ms`);
      console.log(`[PERF-CHAT] Suggested Questions Gen: ${perfTimings.suggestedQuestionsGen?.toFixed(2) || 'N/A'}ms`);
      console.log(`[PERF-CHAT] DB Save Messages: ${perfTimings.dbSaveMessages?.toFixed(2)}ms`);
      console.log(`[PERF-CHAT] TOTAL TIME: ${totalTime.toFixed(2)}ms`);
      console.log(`[PERF-CHAT] =========================================`);

      // Send final metadata
      res.write(`data: ${JSON.stringify({ 
        type: "metadata",
        conversationId: conversation.id,
        shouldEscalate,
      })}\n\n`);
      
      res.end();
    } catch (error) {
      console.error("Error in streaming chat:", error);
      res.write(`data: ${JSON.stringify({ 
        type: "error",
        message: "Failed to process chat message"
      })}\n\n`);
      res.end();
    }
  });

  // Get indexing status for a chatbot (protected)
  app.get("/api/chatbots/:id/indexing-status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const chatbotId = req.params.id;

      // Verify user owns this chatbot
      const chatbot = await storage.getChatbot(chatbotId, userId);
      if (!chatbot) {
        return res.status(404).json({ error: "Chatbot not found" });
      }

      // Get the latest indexing job if exists
      if (!chatbot.lastIndexingJobId) {
        return res.json({
          jobId: null,
          status: 'completed',
          totalTasks: 0,
          completedTasks: 0,
          currentUrl: null,
          error: null,
        });
      }

      const job = await storage.getIndexingJob(chatbot.lastIndexingJobId);
      if (!job) {
        return res.json({
          jobId: null,
          status: 'completed',
          totalTasks: 0,
          completedTasks: 0,
          currentUrl: null,
          error: null,
        });
      }

      const tasks = await storage.getIndexingTasksForJob(job.id);
      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      const failedTasks = tasks.filter(t => t.status === 'failed').length;
      const processingTask = tasks.find(t => t.status === 'processing');

      res.json({
        jobId: job.id,
        status: job.status,
        totalTasks: tasks.length,
        completedTasks: completedTasks,
        failedTasks: failedTasks,
        currentUrl: processingTask?.sourceUrl || null,
        error: job.errorMessage || null,
      });
    } catch (error) {
      console.error("Error fetching indexing status:", error);
      res.status(500).json({ error: "Failed to fetch indexing status" });
    }
  });

  // Analytics routes (protected - only for chatbot owners with paid subscription)
  
  // Get analytics overview for a chatbot
  app.get("/api/chatbots/:id/analytics", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const chatbotId = req.params.id;

      // Verify user owns this chatbot
      const chatbot = await storage.getChatbot(chatbotId, userId);
      if (!chatbot) {
        return res.status(404).json({ error: "Chatbot not found" });
      }

      // Verify user has Scale tier subscription for analytics access (or is admin)
      const user = await storage.getUser(userId);
      if (!user || (user.subscriptionTier !== "scale" && user.isAdmin !== "true")) {
        return res.status(403).json({ 
          error: "Upgrade required",
          message: "Analytics are only available on the Scale plan. Please upgrade to access this feature."
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

  // Clear Q&A cache for a chatbot
  app.delete("/api/chatbots/:id/cache", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const chatbotId = req.params.id;

      // Verify user owns this chatbot
      const chatbot = await storage.getChatbot(chatbotId, userId);
      if (!chatbot) {
        return res.status(404).json({ error: "Chatbot not found" });
      }

      // Clear the cache
      const deletedCount = await storage.clearChatbotCache(chatbotId);
      
      console.log(`[CACHE] Cleared ${deletedCount} cached entries for chatbot ${chatbotId}`);
      
      res.json({ 
        success: true,
        message: `Successfully cleared ${deletedCount} cached answer${deletedCount !== 1 ? 's' : ''}`,
        deletedCount
      });
    } catch (error) {
      console.error("Error clearing cache:", error);
      res.status(500).json({ error: "Failed to clear cache" });
    }
  });

  // Get conversation details with all messages - Pro plan only
  app.get("/api/conversations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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

      // Verify user has Scale tier subscription for conversation access (admins bypass this check)
      const user = await storage.getUser(userId);
      if (!user || (user.subscriptionTier !== "scale" && user.isAdmin !== "true")) {
        return res.status(403).json({ 
          error: "Upgrade required",
          message: "Conversation details are only available on the Scale plan. Please upgrade to access this feature."
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

  // Get suggested questions for a chatbot (public - for widget use)
  app.get("/api/chatbots/:id/suggested-questions", async (req, res) => {
    const perfStart = Date.now();
    try {
      const chatbotId = req.params.id;
      const count = parseInt(req.query.count as string) || 3;
      
      // Verify chatbot exists (no auth required - this is public for widget use)
      const chatbotLookupStart = Date.now();
      const chatbot = await storage.getChatbotById(chatbotId);
      const chatbotLookupTime = Date.now() - chatbotLookupStart;
      
      if (!chatbot) {
        return res.status(404).json({ error: "Chatbot not found" });
      }
      
      // Get suggested questions (allow up to 20 for rotation system)
      const questionsQueryStart = Date.now();
      const questions = await storage.getRandomSuggestedQuestions(chatbotId, Math.min(count, 20));
      const questionsQueryTime = Date.now() - questionsQueryStart;
      
      const totalTime = Date.now() - perfStart;
      console.log(`[PERF] Suggested questions API: total=${totalTime}ms (chatbot_lookup=${chatbotLookupTime}ms, questions_query=${questionsQueryTime}ms, count=${questions.length})`);
      
      res.json({ questions });
    } catch (error) {
      console.error("Error fetching suggested questions:", error);
      res.status(500).json({ error: "Failed to fetch suggested questions" });
    }
  });

  // Track suggested question usage (public - for widget use)
  app.post("/api/chatbots/:id/suggested-questions/track", async (req, res) => {
    try {
      const chatbotId = req.params.id;
      const { questionText } = req.body;
      
      if (!questionText) {
        return res.status(400).json({ error: "Question text is required" });
      }
      
      // Increment usage count (fire and forget - don't wait for completion)
      storage.incrementQuestionUsage(chatbotId, questionText).catch(err => {
        console.error("Failed to increment question usage:", err);
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking question usage:", error);
      res.status(500).json({ error: "Failed to track question usage" });
    }
  });

  // Get knowledge chunks for a chatbot (requires authentication)
  app.get("/api/chatbots/:id/knowledge-chunks", isAuthenticated, async (req: any, res) => {
    try {
      const chatbotId = req.params.id;
      const userId = req.user.id;
      
      // Verify chatbot exists and belongs to user
      const chatbot = await storage.getChatbot(chatbotId, userId);
      if (!chatbot) {
        return res.status(404).json({ error: "Chatbot not found" });
      }
      
      // Get knowledge chunks
      const chunks = await storage.getKnowledgeChunksForChatbot(chatbotId);
      
      res.json({ chunks });
    } catch (error) {
      console.error("Error fetching knowledge chunks:", error);
      res.status(500).json({ error: "Failed to fetch knowledge chunks" });
    }
  });

  // Get all conversations for a chatbot (with pagination) - Pro plan only
  app.get("/api/chatbots/:id/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const chatbotId = req.params.id;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      // Verify user owns this chatbot
      const chatbot = await storage.getChatbot(chatbotId, userId);
      if (!chatbot) {
        return res.status(404).json({ error: "Chatbot not found" });
      }

      // Verify user has Scale tier subscription for analytics access
      const user = await storage.getUser(userId);
      if (!user || user.subscriptionTier !== "scale") {
        return res.status(403).json({ 
          error: "Upgrade required",
          message: "Conversation history is only available on the Scale plan. Please upgrade to access this feature."
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

  // Get cache statistics for a chatbot (protected)
  app.get("/api/chatbots/:id/cache-stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const chatbotId = req.params.id;

      // Verify user owns this chatbot or is admin
      const user = await storage.getUser(userId);
      const chatbot = await storage.getChatbot(chatbotId, userId);
      
      if (!chatbot && (!user || user.isAdmin !== "true")) {
        return res.status(404).json({ error: "Chatbot not found" });
      }

      // Get cache statistics
      const cacheStats = await storage.getCacheStats(chatbotId);
      
      // Calculate cost savings (approximate)
      // Assuming: $0.0001 per LLM call saved (rough estimate)
      const estimatedCostSavings = (cacheStats.totalHits * 0.0001).toFixed(2);
      const cacheHitRate = cacheStats.totalEntries > 0 
        ? ((cacheStats.totalHits / (cacheStats.totalEntries + cacheStats.totalHits)) * 100).toFixed(1)
        : "0";

      res.json({
        totalCachedQuestions: cacheStats.totalEntries,
        totalCacheHits: cacheStats.totalHits,
        cacheHitRate: `${cacheHitRate}%`,
        estimatedCostSavings: `$${estimatedCostSavings}`,
      });
    } catch (error) {
      console.error("Error fetching cache stats:", error);
      res.status(500).json({ error: "Failed to fetch cache statistics" });
    }
  });

  // Get all manual Q&A overrides for a chatbot (protected)
  app.get("/api/chatbots/:id/manual-overrides", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const chatbotId = req.params.id;

      // Verify user owns this chatbot or is admin
      const user = await storage.getUser(userId);
      const chatbot = await storage.getChatbot(chatbotId, userId);
      
      if (!chatbot && (!user || user.isAdmin !== "true")) {
        return res.status(404).json({ error: "Chatbot not found" });
      }

      const overrides = await storage.getAllManualOverrides(chatbotId);
      res.json(overrides);
    } catch (error) {
      console.error("Error fetching manual overrides:", error);
      res.status(500).json({ error: "Failed to fetch manual overrides" });
    }
  });

  // Create a manual Q&A override (protected)
  app.post("/api/chatbots/:id/manual-overrides", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const chatbotId = req.params.id;
      const { question, manualAnswer, originalAnswer, conversationId } = req.body;

      if (!question || !manualAnswer) {
        return res.status(400).json({ error: "Question and manual answer are required" });
      }

      // Verify user owns this chatbot
      const chatbot = await storage.getChatbot(chatbotId, userId);
      if (!chatbot) {
        return res.status(404).json({ error: "Chatbot not found" });
      }

      // Normalize question and create hash
      const normalizedQuestion = question.toLowerCase().trim();
      const questionHash = crypto.createHash('md5').update(normalizedQuestion).digest('hex');

      // Generate embedding for semantic matching
      let embedding: number[] | undefined = undefined;
      try {
        embedding = await embeddingService.generateEmbedding(normalizedQuestion);
      } catch (error) {
        console.error("Error generating embedding for manual override, will use exact match only:", error);
      }

      // Create override
      const override = await storage.createManualOverride({
        chatbotId,
        question: normalizedQuestion,
        questionHash,
        embedding,
        manualAnswer,
        originalAnswer: originalAnswer || null,
        conversationId: conversationId || null,
        createdBy: userId,
      });

      console.log(`[MANUAL OVERRIDE CREATED] Chatbot: ${chatbotId}, Question: "${normalizedQuestion}"`);
      
      res.status(201).json(override);
    } catch (error) {
      console.error("Error creating manual override:", error);
      res.status(500).json({ error: "Failed to create manual override" });
    }
  });

  // Update a manual Q&A override (protected)
  app.put("/api/manual-overrides/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const overrideId = req.params.id;
      const { manualAnswer } = req.body;

      if (!manualAnswer) {
        return res.status(400).json({ error: "Manual answer is required" });
      }

      // Get the override first to verify ownership
      const overrides = await db.select().from(manualQaOverrides).where(eq(manualQaOverrides.id, overrideId)).limit(1);
      const override = overrides[0];

      if (!override) {
        return res.status(404).json({ error: "Override not found" });
      }

      // Verify user owns the chatbot this override belongs to
      const chatbot = await storage.getChatbot(override.chatbotId, userId);
      if (!chatbot) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const updatedOverride = await storage.updateManualOverride(overrideId, manualAnswer);
      res.json(updatedOverride);
    } catch (error) {
      console.error("Error updating manual override:", error);
      res.status(500).json({ error: "Failed to update manual override" });
    }
  });

  // Delete a manual Q&A override (protected)
  app.delete("/api/manual-overrides/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const overrideId = req.params.id;

      // Get the override first to verify ownership
      const overrides = await db.select().from(manualQaOverrides).where(eq(manualQaOverrides.id, overrideId)).limit(1);
      const override = overrides[0];

      if (!override) {
        return res.status(404).json({ error: "Override not found" });
      }

      // Verify user owns the chatbot this override belongs to
      const chatbot = await storage.getChatbot(override.chatbotId, userId);
      if (!chatbot) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const deleted = await storage.deleteManualOverride(overrideId, userId);
      
      if (deleted) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Override not found" });
      }
    } catch (error) {
      console.error("Error deleting manual override:", error);
      res.status(500).json({ error: "Failed to delete manual override" });
    }
  });

  // Submit lead capture form (public endpoint - no auth required)
  app.post("/api/leads", async (req, res) => {
    try {
      const validatedData = insertLeadSchema.parse(req.body);
      
      // Verify chatbot exists
      const chatbotResult = await db.select().from(chatbots).where(eq(chatbots.id, validatedData.chatbotId)).limit(1);
      if (!chatbotResult[0]) {
        return res.status(404).json({ error: "Chatbot not found" });
      }

      const chatbot = chatbotResult[0];

      // Insert lead
      const newLead = await db.insert(leads).values(validatedData).returning();
      
      // Feature 13: Send email notification for new lead
      try {
        const user = await storage.getUser(chatbot.userId);
        if (user) {
          const settings = await storage.getEmailNotificationSettings(user.id);
          
          if (settings && settings.enableNewLeadNotifications === "true") {
            const emailAddress = settings.emailAddress || user.email;
            
            // Build conversation URL
            const conversationUrl = validatedData.conversationId 
              ? `${process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000'}/analytics/${chatbot.id}?conversation=${validatedData.conversationId}`
              : `${process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000'}/analytics/${chatbot.id}`;

            await notificationService.sendNewLeadNotification(emailAddress, {
              chatbotName: chatbot.name,
              leadName: validatedData.name || undefined,
              leadEmail: validatedData.email || undefined,
              leadPhone: validatedData.phone || undefined,
              leadCompany: validatedData.company || undefined,
              leadMessage: validatedData.message || undefined,
              conversationUrl,
            });
          }
        }
      } catch (emailError) {
        // Don't fail lead submission if email fails
        console.error("Failed to send lead notification email:", emailError);
      }
      
      res.status(201).json(newLead[0]);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error submitting lead:", error);
      res.status(500).json({ error: "Failed to submit lead" });
    }
  });

  // Get all leads for a chatbot (protected - owner or admin only)
  app.get("/api/chatbots/:id/leads", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const chatbotId = req.params.id;

      // Verify user owns this chatbot or is admin
      const user = await storage.getUser(userId);
      const chatbot = await storage.getChatbot(chatbotId, userId);
      
      if (!chatbot && (!user || user.isAdmin !== "true")) {
        return res.status(404).json({ error: "Chatbot not found" });
      }

      // Get all leads for this chatbot
      const chatbotLeads = await db.select()
        .from(leads)
        .where(eq(leads.chatbotId, chatbotId))
        .orderBy(sql`${leads.createdAt} DESC`);

      res.json(chatbotLeads);
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  // Export leads to CSV (protected - owner or admin only)
  app.get("/api/chatbots/:id/leads/export", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const chatbotId = req.params.id;

      // Verify user owns this chatbot or is admin
      const user = await storage.getUser(userId);
      const chatbot = await storage.getChatbot(chatbotId, userId);
      
      if (!chatbot && (!user || user.isAdmin !== "true")) {
        return res.status(404).json({ error: "Chatbot not found" });
      }

      // Get all leads for this chatbot
      const chatbotLeads = await db.select()
        .from(leads)
        .where(eq(leads.chatbotId, chatbotId))
        .orderBy(sql`${leads.createdAt} DESC`);

      // Convert to CSV format
      const csvHeaders = "Name,Email,Phone,Company,Message,Created At\n";
      const csvRows = chatbotLeads.map(lead => {
        const formatField = (field: string | null | undefined) => {
          if (!field) return "";
          // Escape quotes and wrap in quotes if contains comma or quote
          if (field.includes(",") || field.includes('"') || field.includes("\n")) {
            return `"${field.replace(/"/g, '""')}"`;
          }
          return field;
        };
        
        return [
          formatField(lead.name),
          formatField(lead.email),
          formatField(lead.phone),
          formatField(lead.company),
          formatField(lead.message),
          lead.createdAt ? new Date(lead.createdAt).toISOString() : "",
        ].join(",");
      }).join("\n");

      const csv = csvHeaders + csvRows;

      // Set response headers for CSV download
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="leads-${chatbotId}-${Date.now()}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error("Error exporting leads:", error);
      res.status(500).json({ error: "Failed to export leads" });
    }
  });

  // Create Stripe subscription (protected)
  app.post("/api/create-subscription", isAuthenticated, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ error: "Stripe is not configured" });
      }

      const userId = req.user.id;
      const { billingCycle, tier } = req.body;
      
      // Validate inputs
      if (!billingCycle || !["monthly", "annual"].includes(billingCycle)) {
        return res.status(400).json({ error: "Invalid billing cycle. Must be 'monthly' or 'annual'" });
      }
      if (!tier || !["pro", "scale"].includes(tier)) {
        return res.status(400).json({ error: "Invalid tier. Must be 'pro' or 'scale'" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if user already has an active subscription
      if (user.stripeSubscriptionId) {
        try {
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
        } catch (err: any) {
          // Subscription doesn't exist (likely from different Stripe account)
          if (err.code === 'resource_missing') {
            console.log(`Stored subscription ID ${user.stripeSubscriptionId} not found - will create new subscription`);
            // Continue to create new subscription
          } else {
            throw err; // Re-throw other errors
          }
        }
      }

      // Create or retrieve Stripe customer
      // Handle case where stored customer ID is from a different Stripe account
      let stripeCustomerId = user.stripeCustomerId;
      
      // Verify the customer exists in current Stripe account
      if (stripeCustomerId) {
        try {
          await stripe.customers.retrieve(stripeCustomerId);
          console.log(`Using existing Stripe customer: ${stripeCustomerId}`);
        } catch (err: any) {
          // Customer doesn't exist (likely from different Stripe account)
          if (err.code === 'resource_missing') {
            console.log(`Stored customer ID ${stripeCustomerId} not found - creating new customer`);
            stripeCustomerId = null; // Force creation of new customer
          } else {
            throw err; // Re-throw other errors
          }
        }
      }
      
      // Create new customer if needed
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
        console.log(`Created new Stripe customer: ${stripeCustomerId}`);
      }

      // Map tier and billing cycle to correct Stripe price ID
      // Use test or live price IDs based on environment
      // Supports both "PRO" naming and standard naming for backward compatibility
      let priceId: string | undefined;
      
      if (tier === "pro") {
        if (billingCycle === "monthly") {
          priceId = isProduction
            ? (process.env.STRIPE_LIVE_PRO_MONTHLY_PRICE_ID || process.env.STRIPE_LIVE_MONTHLY_PRICE_ID || process.env.STRIPE_MONTHLY_PRICE_ID)
            : (process.env.STRIPE_TEST_PRO_MONTHLY_PRICE_ID || process.env.STRIPE_TEST_MONTHLY_PRICE_ID || process.env.STRIPE_MONTHLY_PRICE_ID);
        } else {
          priceId = isProduction
            ? (process.env.STRIPE_LIVE_PRO_ANNUAL_PRICE_ID || process.env.STRIPE_LIVE_ANNUAL_PRICE_ID || process.env.STRIPE_ANNUAL_PRICE_ID)
            : (process.env.STRIPE_TEST_PRO_ANNUAL_PRICE_ID || process.env.STRIPE_TEST_ANNUAL_PRICE_ID || process.env.STRIPE_ANNUAL_PRICE_ID);
        }
      } else if (tier === "scale") {
        if (billingCycle === "monthly") {
          priceId = isProduction
            ? (process.env.STRIPE_LIVE_SCALE_MONTHLY_PRICE_ID || process.env.STRIPE_SCALE_MONTHLY_PRICE_ID)
            : (process.env.STRIPE_TEST_SCALE_MONTHLY_PRICE_ID || process.env.STRIPE_SCALE_MONTHLY_PRICE_ID);
        } else {
          priceId = isProduction
            ? (process.env.STRIPE_LIVE_SCALE_ANNUAL_PRICE_ID || process.env.STRIPE_SCALE_ANNUAL_PRICE_ID)
            : (process.env.STRIPE_TEST_SCALE_ANNUAL_PRICE_ID || process.env.STRIPE_SCALE_ANNUAL_PRICE_ID);
        }
      }

      if (!priceId) {
        console.error(`Missing Stripe price ID for tier=${tier}, billingCycle=${billingCycle}`);
        return res.status(400).json({ 
          error: `Price ID not configured for ${tier} tier with ${billingCycle} billing. Please contact support.` 
        });
      }

      console.log(`Creating subscription: tier=${tier}, billingCycle=${billingCycle}, priceId=${priceId}`);

      // WORKAROUND: Create subscription without automatic payment intent creation
      // Then manually create and attach a PaymentIntent to the invoice
      let subscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{
          price: priceId,
        }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice'],
        metadata: {
          userId: user.id,
          billingCycle,
          tier,
        },
      });

      // Store subscription ID
      await storage.updateStripeSubscriptionId(user.id, subscription.id);
      
      // Get the latest invoice
      let latestInvoice = subscription.latest_invoice;
      
      // Manually create a PaymentIntent for the invoice if one doesn't exist
      if (typeof latestInvoice === 'object' && latestInvoice !== null) {
        const invoice = latestInvoice as any;
        
        // If no payment intent exists, create one manually
        if (!invoice.payment_intent && invoice.amount_due > 0) {
          console.log('Manually creating PaymentIntent for invoice:', {
            invoiceId: invoice.id,
            amount: invoice.amount_due,
            currency: invoice.currency,
          });
          
          const paymentIntent = await stripe.paymentIntents.create({
            amount: invoice.amount_due,
            currency: invoice.currency || 'usd',
            customer: stripeCustomerId,
            automatic_payment_methods: {
              enabled: true,
            },
            metadata: {
              invoiceId: invoice.id,
              subscriptionId: subscription.id,
              userId: user.id,
            },
          });
          
          console.log('PaymentIntent created:', {
            id: paymentIntent.id,
            clientSecret: paymentIntent.client_secret ? 'present' : 'missing',
          });
          
          // Update latestInvoice with the payment intent
          latestInvoice = {
            ...invoice,
            payment_intent: paymentIntent,
          };
        }
      }

      // Get the client secret from payment intent OR setup intent
      let clientSecret: string | null = null;
      
      console.log('Subscription created:', {
        subscriptionId: subscription.id,
        status: subscription.status,
        latestInvoiceType: typeof latestInvoice,
        latestInvoiceId: typeof latestInvoice === 'object' ? (latestInvoice as any)?.id : latestInvoice,
        pendingSetupIntentType: typeof subscription.pending_setup_intent,
      });
      
      // First, try to extract payment intent from the expanded invoice
      if (typeof latestInvoice === 'object' && latestInvoice !== null) {
        const invoice = latestInvoice as any;
        const paymentIntent = invoice.payment_intent;
        
        console.log('Invoice details:', {
          invoiceId: invoice.id,
          status: invoice.status,
          total: invoice.total,
          paymentIntentType: typeof paymentIntent,
          paymentIntentId: typeof paymentIntent === 'object' ? paymentIntent?.id : paymentIntent,
        });
        
        if (typeof paymentIntent === 'object' && paymentIntent !== null && paymentIntent.client_secret) {
          clientSecret = paymentIntent.client_secret;
        } else if (typeof paymentIntent === 'string') {
          // Payment intent wasn't expanded, retrieve it
          const pi = await stripe.paymentIntents.retrieve(paymentIntent);
          clientSecret = pi.client_secret;
        }
      } else if (typeof latestInvoice === 'string') {
        // Invoice wasn't expanded, fetch it with payment intent
        const invoice: any = await stripe.invoices.retrieve(latestInvoice, {
          expand: ['payment_intent'],
        });
        const paymentIntent = invoice.payment_intent;
        
        if (typeof paymentIntent === 'object' && paymentIntent !== null && paymentIntent.client_secret) {
          clientSecret = paymentIntent.client_secret;
        }
      }

      // If no payment intent, check for setup intent (for $0 invoices or trials)
      console.log('Checking for SetupIntent:', {
        hasClientSecret: !!clientSecret,
        hasPendingSetupIntent: !!subscription.pending_setup_intent,
        pendingSetupIntentValue: subscription.pending_setup_intent,
      });
      
      if (!clientSecret && subscription.pending_setup_intent) {
        const setupIntent = subscription.pending_setup_intent as any;
        console.log('Using SetupIntent instead:', {
          setupIntentId: typeof setupIntent === 'object' ? setupIntent?.id : setupIntent,
          setupIntentType: typeof setupIntent,
          clientSecretFound: typeof setupIntent === 'object' ? !!setupIntent?.client_secret : false,
          fullSetupIntent: JSON.stringify(setupIntent, null, 2),
        });
        
        if (typeof setupIntent === 'object' && setupIntent !== null && setupIntent.client_secret) {
          clientSecret = setupIntent.client_secret;
        } else if (typeof setupIntent === 'string') {
          const si = await stripe.setupIntents.retrieve(setupIntent);
          clientSecret = si.client_secret;
        }
      }

      console.log('Client secret extraction:', {
        clientSecret: clientSecret ? 'found' : 'missing',
        clientSecretPrefix: clientSecret ? clientSecret.substring(0, 7) + '...' : 'none',
      });

      if (!clientSecret) {
        // More detailed error logging
        console.error('Failed to extract client secret. Subscription object:', JSON.stringify({
          id: subscription.id,
          status: subscription.status,
          latest_invoice: typeof latestInvoice === 'object' ? { 
            id: (latestInvoice as any)?.id,
            status: (latestInvoice as any)?.status,
            payment_intent: (latestInvoice as any)?.payment_intent ? 'exists' : 'missing'
          } : latestInvoice,
          pending_setup_intent: subscription.pending_setup_intent ? 'exists' : 'missing',
        }, null, 2));
        throw new Error('Failed to create payment intent. The subscription was created but payment setup failed. Please contact support.');
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

  // Sync subscription status from Stripe
  app.post('/api/sync-subscription', isAuthenticated, async (req: any, res) => {
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe is not configured' });
    }

    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || !user.stripeSubscriptionId) {
        return res.status(404).json({ error: 'No subscription found' });
      }

      // Fetch subscription from Stripe
      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      
      console.log(`[Sync] Checking subscription ${subscription.id}: status=${subscription.status}`);

      // Update user tier based on subscription status
      if (subscription.status === 'active' || subscription.status === 'trialing') {
        const priceId = subscription.items.data[0]?.price.id;
        let tier: 'free' | 'pro' | 'scale' = 'free';
        
        // Determine tier from price ID (same logic as webhook)
        const proMonthlyTest = process.env.STRIPE_TEST_PRO_MONTHLY_PRICE_ID || process.env.STRIPE_TEST_MONTHLY_PRICE_ID || process.env.STRIPE_MONTHLY_PRICE_ID;
        const proMonthlyLive = process.env.STRIPE_LIVE_PRO_MONTHLY_PRICE_ID || process.env.STRIPE_LIVE_MONTHLY_PRICE_ID || process.env.STRIPE_MONTHLY_PRICE_ID;
        const proAnnualTest = process.env.STRIPE_TEST_PRO_ANNUAL_PRICE_ID || process.env.STRIPE_TEST_ANNUAL_PRICE_ID || process.env.STRIPE_ANNUAL_PRICE_ID;
        const proAnnualLive = process.env.STRIPE_LIVE_PRO_ANNUAL_PRICE_ID || process.env.STRIPE_LIVE_ANNUAL_PRICE_ID || process.env.STRIPE_ANNUAL_PRICE_ID;
        
        const scaleMonthlyTest = process.env.STRIPE_TEST_SCALE_MONTHLY_PRICE_ID || process.env.STRIPE_SCALE_MONTHLY_PRICE_ID;
        const scaleMonthlyLive = process.env.STRIPE_LIVE_SCALE_MONTHLY_PRICE_ID || process.env.STRIPE_SCALE_MONTHLY_PRICE_ID;
        const scaleAnnualTest = process.env.STRIPE_TEST_SCALE_ANNUAL_PRICE_ID || process.env.STRIPE_SCALE_ANNUAL_PRICE_ID;
        const scaleAnnualLive = process.env.STRIPE_LIVE_SCALE_ANNUAL_PRICE_ID || process.env.STRIPE_SCALE_ANNUAL_PRICE_ID;
        
        if (priceId === proMonthlyTest || priceId === proMonthlyLive || 
            priceId === proAnnualTest || priceId === proAnnualLive) {
          tier = 'pro';
        } else if (priceId === scaleMonthlyTest || priceId === scaleMonthlyLive || 
                   priceId === scaleAnnualTest || priceId === scaleAnnualLive) {
          tier = 'scale';
        }

        console.log(`[Sync] Updating user to ${tier} tier (priceId: ${priceId})`);
        
        await db.update(users)
          .set({ 
            subscriptionTier: tier,
            stripePriceId: priceId || null,
          })
          .where(eq(users.id, userId));
          
        res.json({ success: true, tier, status: subscription.status });
      } else {
        console.log(`[Sync] Subscription not active (status: ${subscription.status})`);
        res.json({ success: false, status: subscription.status, message: 'Subscription is not active' });
      }
    } catch (error: any) {
      console.error('[Sync] Error syncing subscription:', error);
      res.status(500).json({ error: 'Failed to sync subscription' });
    }
  });

  // ===== CONVERSATION RATING ENDPOINTS (Feature 3) =====
  
  // Submit a rating for a conversation
  app.post("/api/conversations/:id/rating", async (req, res) => {
    try {
      const { id: conversationId } = req.params;
      const { rating, feedback } = req.body;

      if (!rating || !["1", "2", "3", "4", "5"].includes(rating)) {
        return res.status(400).json({ error: "Invalid rating. Must be 1-5." });
      }

      // Check if conversation exists
      const conversation = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);

      if (!conversation[0]) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Check if rating already exists
      const existingRating = await storage.getConversationRating(conversationId);
      if (existingRating) {
        return res.status(400).json({ error: "Rating already submitted for this conversation" });
      }

      const newRating = await storage.createConversationRating({
        conversationId,
        rating,
        feedback: feedback || null,
      });

      res.status(201).json(newRating);
    } catch (error) {
      console.error("Error creating conversation rating:", error);
      res.status(500).json({ error: "Failed to create rating" });
    }
  });

  // Get average rating for a chatbot (Pro feature)
  app.get("/api/chatbots/:id/average-rating", isAuthenticated, async (req: any, res) => {
    try {
      const { id: chatbotId } = req.params;
      const userId = req.user.id;

      const chatbot = await storage.getChatbot(chatbotId, userId);
      if (!chatbot) {
        return res.status(404).json({ error: "Chatbot not found" });
      }

      const averageRating = await storage.getAverageRatingForChatbot(chatbotId);
      res.json({ averageRating });
    } catch (error) {
      console.error("Error fetching average rating:", error);
      res.status(500).json({ error: "Failed to fetch average rating" });
    }
  });

  // ===== EMAIL NOTIFICATION SETTINGS ENDPOINTS (Feature 13) =====
  
  // Get user's email notification settings
  app.get("/api/notification-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      let settings = await storage.getEmailNotificationSettings(userId);
      
      // Create default settings if none exist
      if (!settings) {
        settings = await storage.createEmailNotificationSettings({
          userId,
          enableNewLeadNotifications: "true",
          enableUnansweredQuestionNotifications: "true",
          unansweredThresholdMinutes: "30",
          enableWeeklyReports: "true",
          emailAddress: null,
        });
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Error fetching notification settings:", error);
      res.status(500).json({ error: "Failed to fetch notification settings" });
    }
  });

  // Update email notification settings
  app.put("/api/notification-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const updates = req.body;

      const settings = await storage.updateEmailNotificationSettings(userId, updates);
      if (!settings) {
        return res.status(404).json({ error: "Settings not found" });
      }

      res.json(settings);
    } catch (error) {
      console.error("Error updating notification settings:", error);
      res.status(500).json({ error: "Failed to update notification settings" });
    }
  });

  // Test weekly report endpoint (for testing purposes)
  app.post("/api/test-weekly-report", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { sendWeeklyReport } = await import("./emails/weekly-report-service");
      
      const sent = await sendWeeklyReport(userId, storage);
      
      if (sent) {
        res.json({ success: true, message: "Weekly report sent successfully" });
      } else {
        res.json({ success: false, message: "No activity to report or email service not configured" });
      }
    } catch (error) {
      console.error("Error sending test weekly report:", error);
      res.status(500).json({ error: "Failed to send weekly report" });
    }
  });

  // ===== CONVERSATION FLOW ENDPOINTS (Feature 5) =====
  
  // Get all flows for a chatbot
  app.get("/api/chatbots/:id/flows", isAuthenticated, async (req: any, res) => {
    try {
      const { id: chatbotId } = req.params;
      const userId = req.user.id;

      const chatbot = await storage.getChatbot(chatbotId, userId);
      if (!chatbot) {
        return res.status(404).json({ error: "Chatbot not found" });
      }

      const flows = await storage.getConversationFlows(chatbotId);
      res.json(flows);
    } catch (error) {
      console.error("Error fetching conversation flows:", error);
      res.status(500).json({ error: "Failed to fetch flows" });
    }
  });

  // Create a new conversation flow
  app.post("/api/chatbots/:id/flows", isAuthenticated, async (req: any, res) => {
    try {
      const { id: chatbotId } = req.params;
      const userId = req.user.id;
      const { name, description, flowData } = req.body;

      const chatbot = await storage.getChatbot(chatbotId, userId);
      if (!chatbot) {
        return res.status(404).json({ error: "Chatbot not found" });
      }

      if (!name || !flowData) {
        return res.status(400).json({ error: "Name and flow data are required" });
      }

      const flow = await storage.createConversationFlow({
        chatbotId,
        name,
        description: description || null,
        isActive: "false",
        flowData,
      });

      res.status(201).json(flow);
    } catch (error) {
      console.error("Error creating conversation flow:", error);
      res.status(500).json({ error: "Failed to create flow" });
    }
  });

  // Update a conversation flow
  app.put("/api/flows/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id: flowId } = req.params;
      const userId = req.user.id;
      const updates = req.body;

      const flow = await storage.getConversationFlow(flowId);
      if (!flow) {
        return res.status(404).json({ error: "Flow not found" });
      }

      // Verify user owns the chatbot
      const chatbot = await storage.getChatbot(flow.chatbotId, userId);
      if (!chatbot) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const updatedFlow = await storage.updateConversationFlow(flowId, updates);
      res.json(updatedFlow);
    } catch (error) {
      console.error("Error updating conversation flow:", error);
      res.status(500).json({ error: "Failed to update flow" });
    }
  });

  // Delete a conversation flow
  app.delete("/api/flows/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id: flowId } = req.params;
      const userId = req.user.id;

      const flow = await storage.getConversationFlow(flowId);
      if (!flow) {
        return res.status(404).json({ error: "Flow not found" });
      }

      // Verify user owns the chatbot
      const chatbot = await storage.getChatbot(flow.chatbotId, userId);
      if (!chatbot) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const deleted = await storage.deleteConversationFlow(flowId);
      if (!deleted) {
        return res.status(404).json({ error: "Flow not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation flow:", error);
      res.status(500).json({ error: "Failed to delete flow" });
    }
  });

  // ===== ADMIN ROUTES =====
  
  // Get admin statistics
  app.get('/api/admin/stats', isAdmin, async (req: any, res) => {
    try {
      const totalUsers = await db.select({ count: sql<number>`count(*)::int` }).from(users);
      const totalChatbots = await db.select({ count: sql<number>`count(*)::int` }).from(chatbots);
      const totalConversations = await db.select({ count: sql<number>`count(*)::int` }).from(conversations);
      const totalMessages = await db.select({ count: sql<number>`count(*)::int` }).from(conversationMessages);
      const freeUsers = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(eq(users.subscriptionTier, 'free'));
      const proUsers = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(eq(users.subscriptionTier, 'pro'));
      const scaleUsers = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(eq(users.subscriptionTier, 'scale'));
      
      res.json({
        totalUsers: totalUsers[0].count,
        totalChatbots: totalChatbots[0].count,
        totalConversations: totalConversations[0].count,
        totalMessages: totalMessages[0].count,
        freeUsers: freeUsers[0].count,
        proUsers: proUsers[0].count,
        scaleUsers: scaleUsers[0].count,
        paidUsers: proUsers[0].count + scaleUsers[0].count, // Combined for backwards compatibility
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ error: "Failed to fetch statistics" });
    }
  });

  // Get all users (admin only)
  app.get('/api/admin/users', isAdmin, async (req: any, res) => {
    try {
      const allUsers = await db.select().from(users).orderBy(sql`${users.createdAt} DESC`);
      // SECURITY: Sanitize all user data to remove sensitive fields
      const sanitizedUsers = allUsers.map(sanitizeUser);
      res.json(sanitizedUsers);
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Get all chatbots (admin only)
  app.get('/api/admin/chatbots', isAdmin, async (req: any, res) => {
    try {
      // Get all chatbots with user information
      const allChatbots = await db.select({
        id: chatbots.id,
        name: chatbots.name,
        userId: chatbots.userId,
        questionCount: chatbots.questionCount,
        createdAt: chatbots.createdAt,
        userEmail: users.email,
        userName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
        subscriptionTier: users.subscriptionTier,
      })
      .from(chatbots)
      .leftJoin(users, eq(chatbots.userId, users.id))
      .orderBy(sql`${chatbots.createdAt} DESC`);
      
      res.json(allChatbots);
    } catch (error) {
      console.error("Error fetching all chatbots:", error);
      res.status(500).json({ error: "Failed to fetch chatbots" });
    }
  });

  // Get all indexing jobs (admin only)
  app.get('/api/admin/indexing-jobs', isAdmin, async (req: any, res) => {
    try {
      const { status, limit } = req.query;
      const jobs = await storage.listAllIndexingJobs({
        status: status as string | undefined,
        limit: limit ? parseInt(limit as string) : 500, // Increased from 100 to 500
      });

      // Enrich with chatbot and user information
      const enrichedJobs = await Promise.all(jobs.map(async (job) => {
        const chatbot = await db.select({
          id: chatbots.id,
          name: chatbots.name,
          userId: chatbots.userId,
          userEmail: users.email,
          userName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
        })
        .from(chatbots)
        .leftJoin(users, eq(chatbots.userId, users.id))
        .where(eq(chatbots.id, job.chatbotId))
        .limit(1);

        return {
          ...job,
          chatbot: chatbot[0],
        };
      }));

      res.json(enrichedJobs);
    } catch (error) {
      console.error("Error fetching indexing jobs:", error);
      res.status(500).json({ error: "Failed to fetch indexing jobs" });
    }
  });

  // Get single indexing job details (admin only)
  app.get('/api/admin/indexing-jobs/:id', isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const job = await storage.getIndexingJob(id);
      
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      // Get tasks for this job
      const tasks = await storage.getIndexingTasksForJob(id);

      // Get chatbot info
      const chatbot = await db.select({
        id: chatbots.id,
        name: chatbots.name,
        userId: chatbots.userId,
        userEmail: users.email,
        userName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
      })
      .from(chatbots)
      .leftJoin(users, eq(chatbots.userId, users.id))
      .where(eq(chatbots.id, job.chatbotId))
      .limit(1);

      res.json({
        ...job,
        chatbot: chatbot[0],
        tasks,
      });
    } catch (error) {
      console.error("Error fetching job details:", error);
      res.status(500).json({ error: "Failed to fetch job details" });
    }
  });

  // Cancel an indexing job (admin only)
  app.post('/api/admin/indexing-jobs/:id/cancel', isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const success = await storage.cancelIndexingJob(id);
      
      if (!success) {
        return res.status(400).json({ error: "Job cannot be cancelled (not found or already completed)" });
      }

      // Notify worker immediately for fast cancellation
      notifyJobCancellation(id);

      res.json({ success: true, message: "Job cancelled successfully" });
    } catch (error) {
      console.error("Error cancelling job:", error);
      res.status(500).json({ error: "Failed to cancel job" });
    }
  });

  // Retry a failed indexing job (admin only)
  app.post('/api/admin/indexing-jobs/:id/retry', isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const result = await storage.retryIndexingJob(id);
      
      if (!result.success) {
        return res.status(400).json({ error: "Job cannot be retried (not found, no failed tasks, or invalid status)" });
      }

      res.json({ 
        success: true, 
        message: "Job retry initiated successfully",
        newJobId: result.newJobId,
      });
    } catch (error) {
      console.error("Error retrying job:", error);
      res.status(500).json({ error: "Failed to retry job" });
    }
  });

  // Toggle admin status for a user (admin only)
  app.post('/api/admin/users/:userId/toggle-admin', isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const currentUser = req.user;

      // Prevent admin from removing their own admin status
      if (currentUser.id === userId) {
        return res.status(400).json({ error: "You cannot modify your own admin status" });
      }

      // Get current user
      const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const user = userResult[0];

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Toggle admin status
      const newAdminStatus = user.isAdmin === "true" ? "false" : "true";
      await db.update(users)
        .set({ isAdmin: newAdminStatus })
        .where(eq(users.id, userId));

      res.json({ 
        success: true, 
        isAdmin: newAdminStatus,
        message: `User ${newAdminStatus === "true" ? "promoted to" : "removed from"} admin` 
      });
    } catch (error) {
      console.error("Error toggling admin status:", error);
      res.status(500).json({ error: "Failed to toggle admin status" });
    }
  });

  // Delete a user (admin only)
  app.delete('/api/admin/users/:userId', isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const currentUser = req.user;

      // Prevent admin from deleting themselves
      if (currentUser.id === userId) {
        return res.status(400).json({ error: "You cannot delete your own account" });
      }

      // Check if user exists
      const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!userResult[0]) {
        return res.status(404).json({ error: "User not found" });
      }

      // Delete user's chatbots first (cascade delete)
      await db.delete(chatbots).where(eq(chatbots.userId, userId));

      // Delete user's conversations
      const userChatbots = await db.select({ id: chatbots.id }).from(chatbots).where(eq(chatbots.userId, userId));
      const chatbotIds = userChatbots.map(c => c.id);
      
      if (chatbotIds.length > 0) {
        for (const chatbotId of chatbotIds) {
          await db.delete(conversationMessages).where(eq(conversationMessages.conversationId, 
            sql`(SELECT id FROM ${conversations} WHERE chatbot_id = ${chatbotId})`
          ));
          await db.delete(conversations).where(eq(conversations.chatbotId, chatbotId));
        }
      }

      // Delete the user
      await db.delete(users).where(eq(users.id, userId));

      res.json({ success: true, message: "User and all associated data deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Update user subscription tier (admin only)
  app.patch('/api/admin/users/:userId/subscription', isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { tier } = req.body;
      const currentUser = req.user;

      // Prevent admin from modifying their own subscription via admin panel
      // (They should use the normal subscription flow)
      if (currentUser.id === userId) {
        return res.status(400).json({ error: "You cannot modify your own subscription via admin panel. Use the account page instead." });
      }

      if (!tier || !['free', 'pro', 'scale'].includes(tier)) {
        return res.status(400).json({ error: "Invalid subscription tier. Must be 'free', 'pro', or 'scale'" });
      }

      // Check if user exists
      const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!userResult[0]) {
        return res.status(404).json({ error: "User not found" });
      }

      // Update subscription tier
      await db.update(users)
        .set({ subscriptionTier: tier })
        .where(eq(users.id, userId));

      res.json({ 
        success: true, 
        tier,
        message: `User subscription updated to ${tier} tier` 
      });
    } catch (error) {
      console.error("Error updating subscription:", error);
      res.status(500).json({ error: "Failed to update subscription" });
    }
  });

  // Stripe webhook handler for subscription updates
  app.post("/api/stripe-webhook", async (req, res) => {
    if (!stripe) {
      return res.status(503).send('Stripe is not configured');
    }

    const sig = req.headers['stripe-signature'];
    
    if (!sig) {
      return res.status(400).send('No signature');
    }

    let event;
    try {
      // Use test or live webhook secret based on environment
      const webhookSecret = isProduction
        ? (process.env.STRIPE_LIVE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET)
        : (process.env.STRIPE_TEST_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET);
      
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        webhookSecret || ''
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
        
        // Accept 'active', 'trialing', or 'incomplete' status (incomplete becomes active after payment)
        if (userId && (subscription.status === 'active' || subscription.status === 'trialing' || subscription.status === 'incomplete')) {
          // Determine tier from price ID
          const priceId = subscription.items.data[0]?.price.id;
          let tier: 'free' | 'pro' | 'scale' = 'free';
          
          // Map price IDs to tiers - check both test and live price IDs
          // Supports both "PRO" naming and standard naming for backward compatibility
          const proMonthlyTest = process.env.STRIPE_TEST_PRO_MONTHLY_PRICE_ID || process.env.STRIPE_TEST_MONTHLY_PRICE_ID || process.env.STRIPE_MONTHLY_PRICE_ID;
          const proMonthlyLive = process.env.STRIPE_LIVE_PRO_MONTHLY_PRICE_ID || process.env.STRIPE_LIVE_MONTHLY_PRICE_ID || process.env.STRIPE_MONTHLY_PRICE_ID;
          const proAnnualTest = process.env.STRIPE_TEST_PRO_ANNUAL_PRICE_ID || process.env.STRIPE_TEST_ANNUAL_PRICE_ID || process.env.STRIPE_ANNUAL_PRICE_ID;
          const proAnnualLive = process.env.STRIPE_LIVE_PRO_ANNUAL_PRICE_ID || process.env.STRIPE_LIVE_ANNUAL_PRICE_ID || process.env.STRIPE_ANNUAL_PRICE_ID;
          
          const scaleMonthlyTest = process.env.STRIPE_TEST_SCALE_MONTHLY_PRICE_ID || process.env.STRIPE_SCALE_MONTHLY_PRICE_ID;
          const scaleMonthlyLive = process.env.STRIPE_LIVE_SCALE_MONTHLY_PRICE_ID || process.env.STRIPE_SCALE_MONTHLY_PRICE_ID;
          const scaleAnnualTest = process.env.STRIPE_TEST_SCALE_ANNUAL_PRICE_ID || process.env.STRIPE_SCALE_ANNUAL_PRICE_ID;
          const scaleAnnualLive = process.env.STRIPE_LIVE_SCALE_ANNUAL_PRICE_ID || process.env.STRIPE_SCALE_ANNUAL_PRICE_ID;
          
          // Check if price ID matches Pro tier (either test or live)
          if (priceId === proMonthlyTest || priceId === proMonthlyLive || 
              priceId === proAnnualTest || priceId === proAnnualLive) {
            tier = 'pro';
            console.log(`[Webhook] Subscription assigned to Pro tier (priceId: ${priceId})`);
          } 
          // Check if price ID matches Scale tier (either test or live)
          else if (priceId === scaleMonthlyTest || priceId === scaleMonthlyLive || 
                   priceId === scaleAnnualTest || priceId === scaleAnnualLive) {
            tier = 'scale';
            console.log(`[Webhook] Subscription assigned to Scale tier (priceId: ${priceId})`);
          } 
          else {
            console.log(`[Webhook] Unknown price ID ${priceId}, defaulting to free tier`);
          }
          
          await db.update(users)
            .set({ 
              subscriptionTier: tier,
              stripePriceId: priceId || null,
            })
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
        const invoice = event.data.object as any; // Stripe Invoice type doesn't include subscription property
        const invoiceSubscriptionId = typeof invoice.subscription === 'string' 
          ? invoice.subscription 
          : invoice.subscription?.id;
        
        // Fallback: If payment succeeded, ensure user tier is updated
        if (invoiceSubscriptionId && stripe) {
          try {
            const invoiceSub = await stripe.subscriptions.retrieve(invoiceSubscriptionId);
            const invoiceUserId = invoiceSub.metadata?.userId;
            
            if (invoiceUserId && (invoiceSub.status === 'active' || invoiceSub.status === 'trialing')) {
              const priceId = invoiceSub.items.data[0]?.price.id;
              let tier: 'free' | 'pro' | 'scale' = 'free';
              
              // Map price IDs to tiers
              const proMonthlyTest = process.env.STRIPE_TEST_PRO_MONTHLY_PRICE_ID || process.env.STRIPE_TEST_MONTHLY_PRICE_ID || process.env.STRIPE_MONTHLY_PRICE_ID;
              const proMonthlyLive = process.env.STRIPE_LIVE_PRO_MONTHLY_PRICE_ID || process.env.STRIPE_LIVE_MONTHLY_PRICE_ID || process.env.STRIPE_MONTHLY_PRICE_ID;
              const proAnnualTest = process.env.STRIPE_TEST_PRO_ANNUAL_PRICE_ID || process.env.STRIPE_TEST_ANNUAL_PRICE_ID || process.env.STRIPE_ANNUAL_PRICE_ID;
              const proAnnualLive = process.env.STRIPE_LIVE_PRO_ANNUAL_PRICE_ID || process.env.STRIPE_LIVE_ANNUAL_PRICE_ID || process.env.STRIPE_ANNUAL_PRICE_ID;
              
              const scaleMonthlyTest = process.env.STRIPE_TEST_SCALE_MONTHLY_PRICE_ID || process.env.STRIPE_SCALE_MONTHLY_PRICE_ID;
              const scaleMonthlyLive = process.env.STRIPE_LIVE_SCALE_MONTHLY_PRICE_ID || process.env.STRIPE_SCALE_MONTHLY_PRICE_ID;
              const scaleAnnualTest = process.env.STRIPE_TEST_SCALE_ANNUAL_PRICE_ID || process.env.STRIPE_SCALE_ANNUAL_PRICE_ID;
              const scaleAnnualLive = process.env.STRIPE_LIVE_SCALE_ANNUAL_PRICE_ID || process.env.STRIPE_SCALE_ANNUAL_PRICE_ID;
              
              if (priceId === proMonthlyTest || priceId === proMonthlyLive || 
                  priceId === proAnnualTest || priceId === proAnnualLive) {
                tier = 'pro';
              } else if (priceId === scaleMonthlyTest || priceId === scaleMonthlyLive || 
                         priceId === scaleAnnualTest || priceId === scaleAnnualLive) {
                tier = 'scale';
              }
              
              // Ensure tier is updated (fallback in case subscription.created didn't run)
              await db.update(users)
                .set({ subscriptionTier: tier })
                .where(eq(users.id, invoiceUserId));
              
              console.log(`[Webhook] Payment succeeded - ensured user ${invoiceUserId} tier is ${tier}`);
            }
          } catch (error) {
            console.error('[Webhook] Error handling invoice.payment_succeeded:', error);
          }
        }
        break;

      case 'invoice.payment_failed':
        const failedInvoice = event.data.object as Stripe.Invoice;
        console.error('Payment failed for invoice:', failedInvoice.id);
        break;
    }

    res.json({ received: true });
  });

  // Get aggregate analytics overview (all chatbots)
  app.get("/api/analytics/overview", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const days = parseInt(req.query.days as string) || 7;
      
      const dateStart = new Date();
      dateStart.setDate(dateStart.getDate() - days);
      const dateEnd = new Date();

      // Get all user's chatbots
      const userChatbots = await db.select()
        .from(chatbots)
        .where(eq(chatbots.userId, userId));

      if (userChatbots.length === 0) {
        return res.json({
          chatbotStats: [],
          totalStats: {
            totalConversations: 0,
            totalMessages: 0,
            totalLeads: 0,
            averageRating: 0,
            ratingCount: 0,
          },
          dateStart,
          dateEnd,
        });
      }

      const chatbotStats = await Promise.all(
        userChatbots.map(async (chatbot) => {
          // Count conversations
          const conversationsData = await db.select({
            count: sql<number>`count(*)::int`,
          })
            .from(conversations)
            .where(
              and(
                eq(conversations.chatbotId, chatbot.id),
                gte(conversations.startedAt, dateStart)
              )
            );

          const totalConversations = conversationsData[0]?.count || 0;

          // Count messages
          const messagesData = await db.select({
            count: sql<number>`count(*)::int`,
          })
            .from(conversationMessages)
            .innerJoin(conversations, eq(conversationMessages.conversationId, conversations.id))
            .where(
              and(
                eq(conversations.chatbotId, chatbot.id),
                gte(conversationMessages.createdAt, dateStart)
              )
            );

          const totalMessages = messagesData[0]?.count || 0;

          // Count leads
          const leadsData = await db.select({
            count: sql<number>`count(*)::int`,
          })
            .from(leads)
            .where(
              and(
                eq(leads.chatbotId, chatbot.id),
                gte(leads.createdAt, dateStart)
              )
            );

          const totalLeads = leadsData[0]?.count || 0;

          // Calculate average rating
          const ratingsData = await db.select({
            avgRating: sql<number>`COALESCE(AVG(CAST(${conversationRatings.rating} AS INTEGER)), 0)`,
            count: sql<number>`count(*)::int`,
          })
            .from(conversationRatings)
            .innerJoin(conversations, eq(conversationRatings.conversationId, conversations.id))
            .where(
              and(
                eq(conversations.chatbotId, chatbot.id),
                gte(conversationRatings.createdAt, dateStart)
              )
            );

          const averageRating = Number(ratingsData[0]?.avgRating || 0);
          const ratingCount = ratingsData[0]?.count || 0;

          // Get top 5 most asked questions
          const topQuestionsData = await db.select({
            question: conversationMessages.content,
            count: sql<number>`count(*)::int`,
          })
            .from(conversationMessages)
            .innerJoin(conversations, eq(conversationMessages.conversationId, conversations.id))
            .where(
              and(
                eq(conversations.chatbotId, chatbot.id),
                eq(conversationMessages.role, "user"),
                gte(conversationMessages.createdAt, dateStart)
              )
            )
            .groupBy(conversationMessages.content)
            .orderBy(sql`count(*) DESC`)
            .limit(5);

          return {
            chatbotId: chatbot.id,
            chatbotName: chatbot.name,
            totalConversations,
            totalMessages,
            totalLeads,
            averageRating,
            ratingCount,
            topQuestions: topQuestionsData.map(q => ({
              question: q.question,
              count: q.count,
            })),
          };
        })
      );

      // Calculate totals
      const totalStats = {
        totalConversations: chatbotStats.reduce((sum, s) => sum + s.totalConversations, 0),
        totalMessages: chatbotStats.reduce((sum, s) => sum + s.totalMessages, 0),
        totalLeads: chatbotStats.reduce((sum, s) => sum + s.totalLeads, 0),
        ratingCount: chatbotStats.reduce((sum, s) => sum + s.ratingCount, 0),
        averageRating: 0,
      };

      // Calculate weighted average rating
      const weightedRatingSum = chatbotStats.reduce((sum, s) => sum + (s.averageRating * s.ratingCount), 0);
      totalStats.averageRating = totalStats.ratingCount > 0 ? weightedRatingSum / totalStats.ratingCount : 0;

      res.json({
        chatbotStats,
        totalStats,
        dateStart,
        dateEnd,
      });
    } catch (error) {
      console.error("Error fetching analytics overview:", error);
      res.status(500).json({ error: "Failed to fetch analytics overview" });
    }
  });

  // Generate on-demand analytics report (sends email immediately)
  app.post("/api/analytics/generate-report", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Import the sendWeeklyReport function dynamically
      const { sendWeeklyReport } = await import("./emails/weekly-report-service");
      
      const sent = await sendWeeklyReport(userId, storage);
      
      if (sent) {
        res.json({ 
          success: true, 
          message: "Analytics report has been sent to your email" 
        });
      } else {
        res.status(400).json({ 
          success: false,
          message: "No activity to report or email service not configured" 
        });
      }
    } catch (error) {
      console.error("Error generating on-demand report:", error);
      res.status(500).json({ 
        success: false,
        error: "Failed to generate report" 
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
