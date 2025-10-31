import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertChatbotSchema, insertLeadSchema, type ChatRequest, type ChatResponse, chatbots, conversations, conversationMessages, users, leads, urlCrawlMetadata } from "@shared/schema";
import { ZodError } from "zod";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { isAuthenticated } from "./auth";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import { crawlMultipleWebsitesRecursive, refreshWebsites, calculateContentHash, normalizeUrl } from "./crawler";
import Stripe from "stripe";
import crypto from "crypto";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// Initialize Stripe only if the secret is available
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

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
    if (!req.isAuthenticated() || !req.user?.claims?.sub) {
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
      res.json(chatbots);
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
      
      // Check if free tier user already has a chatbot (limit: 1 chatbot for free tier)
      // Admins bypass all limits
      const user = await storage.getUser(userId);
      console.log("User tier:", user?.subscriptionTier, "Is admin:", user?.isAdmin);
      
      if (user && user.subscriptionTier !== "paid" && user.isAdmin !== "true") {
        const existingChatbots = await storage.getAllChatbots(userId);
        if (existingChatbots.length >= 1) {
          console.log("User hit free tier chatbot limit");
          return res.status(403).json({
            error: "Upgrade required",
            message: "Free tier is limited to 1 chatbot. Upgrade to Pro to create unlimited chatbots."
          });
        }
      }
      
      // Use pre-indexed content if available, otherwise crawl websites
      let websiteContent = validatedData.websiteContent || "";
      let crawlResults: any[] = [];
      
      if (websiteContent) {
        console.log("[CRAWLER] Using pre-indexed content from background job");
        console.log(`[CRAWLER] Content length: ${websiteContent.length} characters`);
        
        // If urlMetadata is provided from background indexing, use it
        if (validatedData.urlMetadata) {
          crawlResults = validatedData.urlMetadata;
          console.log(`[CRAWLER] Using ${crawlResults.length} URL metadata from background indexing`);
        }
      } else if (validatedData.websiteUrls && validatedData.websiteUrls.length > 0) {
        console.log(`[CRAWLER] No pre-indexed content - starting recursive crawl for ${validatedData.websiteUrls.length} website(s)`);
        console.log("[CRAWLER] URLs to crawl:", validatedData.websiteUrls);
        console.log("[CRAWLER] Checking Playwright availability...");
        
        try {
          const { chromium } = await import('playwright');
          console.log("[CRAWLER] ✓ Playwright module loaded successfully");
          console.log("[CRAWLER] Chromium executable:", chromium.executablePath());
        } catch (playwrightError) {
          console.error("[CRAWLER] ✗ Playwright not available:", playwrightError);
          console.error("[CRAWLER] Error details:", JSON.stringify(playwrightError, null, 2));
        }
        
        console.log("[CRAWLER] Starting crawl with options: maxDepth=2, maxPages=50, sameDomainOnly=true");
        
        try {
          crawlResults = await crawlMultipleWebsitesRecursive(validatedData.websiteUrls, {
            maxDepth: 2,
            maxPages: 50,
            sameDomainOnly: true,
          });
          
          const successCount = crawlResults.filter(r => !r.error).length;
          const errorCount = crawlResults.filter(r => r.error).length;
          console.log(`[CRAWLER] Crawl completed: ${successCount} successful, ${errorCount} failed`);
          
          // Combine all successfully crawled content
          websiteContent = crawlResults
            .filter(result => !result.error && result.content)
            .map(result => `URL: ${result.url}\nTitle: ${result.title || 'N/A'}\n\n${result.content}`)
            .join('\n\n---\n\n');
          
          console.log(`[CRAWLER] Total content length: ${websiteContent.length} characters`);
          
          // Log any errors
          crawlResults
            .filter(result => result.error)
            .forEach(result => {
              console.error(`[CRAWLER] Failed to crawl ${result.url}: ${result.error}`);
            });
        } catch (crawlError) {
          console.error("[CRAWLER] CRITICAL ERROR during crawl:", crawlError);
          console.error("[CRAWLER] Stack trace:", (crawlError as Error).stack);
          throw crawlError;
        }
      } else {
        console.log("[CRAWLER] No website URLs provided, skipping crawl");
      }
      
      console.log("Creating chatbot in database...");
      const chatbot = await storage.createChatbot({
        ...validatedData,
        websiteContent,
      }, userId);
      
      // Store initial crawl metadata for future refresh operations
      // Only store metadata for the root URLs (not all recursive results)
      if (validatedData.websiteUrls && validatedData.websiteUrls.length > 0 && crawlResults.length > 0) {
        try {
          const crawlMetadataRecords = [];
          for (const url of validatedData.websiteUrls) {
            // Normalize URL to match crawler's normalization
            const normalizedUrl = normalizeUrl(url);
            
            // Find this URL in the crawl results using normalized comparison
            const urlResult = crawlResults.find(r => normalizeUrl(r.url) === normalizedUrl);
            if (urlResult && !urlResult.error && urlResult.content) {
              const hash = calculateContentHash(urlResult.content);
              crawlMetadataRecords.push({
                chatbotId: chatbot.id,
                url: normalizedUrl, // Store normalized URL
                contentHash: hash,
                lastCrawledAt: new Date(),
              });
              console.log(`[CRAWLER] Storing metadata for ${normalizedUrl} with hash ${hash.substring(0, 8)}...`);
            } else {
              console.warn(`[CRAWLER] No matching crawl result found for ${url} (normalized: ${normalizedUrl})`);
            }
          }
          
          if (crawlMetadataRecords.length > 0) {
            await db.insert(urlCrawlMetadata).values(crawlMetadataRecords);
            console.log(`[CRAWLER] ✓ Successfully stored crawl metadata for ${crawlMetadataRecords.length} URLs`);
          } else {
            console.warn(`[CRAWLER] No metadata records to store - check URL normalization`);
          }
        } catch (metaError) {
          console.error("[CRAWLER] Failed to store crawl metadata:", metaError);
          // Don't fail the request if metadata storage fails
        }
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
      const validatedData = insertChatbotSchema.partial().parse(req.body);
      
      // Check if user is trying to update Pro-only features (colors, logo)
      // Admins bypass all restrictions
      const isUpdatingProFeatures = validatedData.primaryColor || validatedData.accentColor || validatedData.logoUrl;
      
      if (isUpdatingProFeatures) {
        const user = await storage.getUser(userId);
        if (!user || (user.subscriptionTier !== "paid" && user.isAdmin !== "true")) {
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

  // Refresh knowledge base on-demand (protected)
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
      
      // Get existing URL crawl metadata
      const existingMetadata = await db.select()
        .from(urlCrawlMetadata)
        .where(eq(urlCrawlMetadata.chatbotId, chatbotId));
      
      console.log(`[Refresh] Found ${existingMetadata.length} existing crawl metadata records`);
      
      // Create a map of previous crawl data for efficient lookup
      const previousCrawlData = new Map(
        existingMetadata.map(meta => [
          meta.url,
          { 
            hash: meta.contentHash,
            etag: meta.etag || undefined,
            lastModified: meta.lastModified || undefined
          }
        ])
      );
      
      // Refresh website URLs with intelligent change detection
      let updatedContent = chatbot.websiteContent || '';
      let changedCount = 0;
      let unchangedCount = 0;
      
      if (chatbot.websiteUrls && chatbot.websiteUrls.length > 0) {
        console.log(`[Refresh] Refreshing ${chatbot.websiteUrls.length} website URLs`);
        
        // Normalize URLs before refreshing to match stored metadata
        const normalizedUrls = chatbot.websiteUrls.map(url => normalizeUrl(url));
        
        const refreshResults = await refreshWebsites(normalizedUrls, previousCrawlData);
        
        // Count changes
        changedCount = refreshResults.filter(r => r.changed && !r.error).length;
        unchangedCount = refreshResults.filter(r => !r.changed).length;
        
        console.log(`[Refresh] Results: ${changedCount} changed, ${unchangedCount} unchanged`);
        
        // If any URLs changed, rebuild the website content
        if (changedCount > 0) {
          const changedUrls = refreshResults.filter(r => r.changed && r.content);
          
          // Build new content from changed URLs
          updatedContent = changedUrls
            .map(result => `URL: ${result.url}\nTitle: ${result.title || 'N/A'}\n\n${result.content}`)
            .join('\n\n---\n\n');
          
          // Update or insert crawl metadata for changed URLs
          for (const result of refreshResults) {
            if (result.changed && result.contentHash) {
              // Normalize result URL to match stored metadata
              const normalizedResultUrl = normalizeUrl(result.url);
              const existing = existingMetadata.find(m => m.url === normalizedResultUrl);
              
              if (existing) {
                // Update existing metadata
                await db.update(urlCrawlMetadata)
                  .set({
                    contentHash: result.contentHash,
                    lastCrawledAt: new Date(),
                  })
                  .where(eq(urlCrawlMetadata.id, existing.id));
                console.log(`[Refresh] Updated metadata for ${normalizedResultUrl}`);
              } else {
                // Insert new metadata (for newly added URLs)
                await db.insert(urlCrawlMetadata).values({
                  chatbotId: chatbotId,
                  url: normalizedResultUrl,
                  contentHash: result.contentHash,
                  lastCrawledAt: new Date(),
                });
                console.log(`[Refresh] Inserted new metadata for ${normalizedResultUrl}`);
              }
            }
          }
          
          // Update chatbot with new content and timestamp
          await db.update(chatbots)
            .set({
              websiteContent: updatedContent,
              lastKnowledgeUpdate: new Date(),
            })
            .where(eq(chatbots.id, chatbotId));
          
          // Clear Q&A cache since knowledge base has changed
          const clearedCount = await storage.clearChatbotCache(chatbotId);
          console.log(`[Refresh] Cleared ${clearedCount} cached Q&A entries due to knowledge base update`);
          
          console.log(`[Refresh] Knowledge base updated successfully`);
        } else {
          console.log(`[Refresh] No changes detected, knowledge base is up to date`);
        }
      }
      
      // Note: Documents are not refreshed unless new ones are uploaded via the edit page
      // This matches the requirement: "do not do a re-index of the documents unless a new document was uploaded"
      
      res.json({
        success: true,
        message: changedCount > 0 
          ? `Knowledge base refreshed successfully. ${changedCount} URL(s) updated.`
          : "Knowledge base is already up to date.",
        changedUrls: changedCount,
        unchangedUrls: unchangedCount,
        lastUpdate: new Date(),
      });
      
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

  // Update chatbot with uploaded logo URL (protected - Pro plan only)
  app.put("/api/chatbots/:id/logo", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
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

  // Upload and process documents (protected)
  app.post("/api/documents/upload", isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
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
          const pdfParse = (await import('pdf-parse')).default;
          
          if (typeof pdfParse !== 'function') {
            throw new Error('pdf-parse module did not export a valid function');
          }
          
          const pdfData = await pdfParse(file.buffer);
          extractedText = pdfData.text.trim();
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
      const storage = objectStorageService.getObjectEntityFile(objectPath);
      await storage.save(file.buffer, {
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

      // Check chatbot owner's subscription tier and enforce free tier limits
      // Admins bypass all limits
      const ownerResult = await db.select().from(users).where(eq(users.id, chatbot.userId)).limit(1);
      const owner = ownerResult[0];
      
      if (owner && owner.subscriptionTier === "free" && owner.isAdmin !== "true") {
        const currentQuestionCount = parseInt(chatbot.questionCount);
        if (currentQuestionCount >= 3) {
          // Return a friendly message when free tier limit is reached
          return res.json({ 
            message: "I apologize, but this chatbot has reached its free tier limit. The chatbot owner needs to upgrade to Pro for unlimited conversations.",
            shouldEscalate: false,
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
      
      // Check cache for existing answer
      const cachedAnswer = await storage.getCachedAnswer(chatbotId, questionHash);
      
      let aiMessage: string;
      let suggestedQuestions: string[] = [];
      
      if (cachedAnswer) {
        // Cache hit! Use cached answer
        console.log(`[CACHE HIT] Using cached answer for question hash: ${questionHash}`);
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

        aiMessage = mainResult.text || "I apologize, but I couldn't generate a response.";
        
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
        
        // Store in cache for future use (async, don't await)
        storage.createCacheEntry({
          chatbotId,
          question: normalizedQuestion,
          questionHash,
          answer: aiMessage,
          suggestedQuestions,
          lastUsedAt: new Date(),
        }).catch(err => {
          console.error("Error storing answer in cache:", err);
        });
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
      const userId = req.user.id;
      const chatbotId = req.params.id;

      // Verify user owns this chatbot
      const chatbot = await storage.getChatbot(chatbotId, userId);
      if (!chatbot) {
        return res.status(404).json({ error: "Chatbot not found" });
      }

      // Verify user has paid subscription for analytics access (or is admin)
      const user = await storage.getUser(userId);
      if (!user || (user.subscriptionTier !== "paid" && user.isAdmin !== "true")) {
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

      // Verify user has paid subscription for conversation access (admins bypass this check)
      const user = await storage.getUser(userId);
      if (!user || (user.subscriptionTier !== "paid" && user.isAdmin !== "true")) {
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
      const userId = req.user.id;
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

  // Submit lead capture form (public endpoint - no auth required)
  app.post("/api/leads", async (req, res) => {
    try {
      const validatedData = insertLeadSchema.parse(req.body);
      
      // Verify chatbot exists
      const chatbotResult = await db.select().from(chatbots).where(eq(chatbots.id, validatedData.chatbotId)).limit(1);
      if (!chatbotResult[0]) {
        return res.status(404).json({ error: "Chatbot not found" });
      }

      // Insert lead
      const newLead = await db.insert(leads).values(validatedData).returning();
      
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
      let subscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{
          price: priceId,
        }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
          payment_method_types: ['card'],
        },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          userId: user.id,
          billingCycle,
        },
      });

      // Store subscription ID
      await storage.updateStripeSubscriptionId(user.id, subscription.id);
      
      // Check if payment intent was created, if not, manually create one
      let latestInvoice = subscription.latest_invoice;
      if (typeof latestInvoice === 'object' && latestInvoice !== null) {
        const invoice = latestInvoice as any;
        
        // If invoice doesn't have a payment intent, create one manually
        if (!invoice.payment_intent && invoice.amount_due > 0) {
          console.log('Payment intent not found, creating one manually for invoice:', {
            invoiceId: invoice.id,
            amount: invoice.amount_due,
            status: invoice.status,
          });
          
          // Create a payment intent for this invoice
          const paymentIntent = await stripe.paymentIntents.create({
            amount: invoice.amount_due,
            currency: invoice.currency || 'usd',
            customer: stripeCustomerId,
            metadata: {
              invoiceId: invoice.id,
              subscriptionId: subscription.id,
              userId: user.id,
            },
            automatic_payment_methods: {
              enabled: true,
            },
          });
          
          console.log('Payment intent created manually:', {
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount,
            status: paymentIntent.status,
            clientSecret: paymentIntent.client_secret ? 'present' : 'missing',
          });
          
          // Update the invoice with the payment intent
          // Note: Stripe doesn't allow direct update, but we'll use the PI for frontend
          latestInvoice = {
            ...invoice,
            payment_intent: paymentIntent,
          };
        }
      }

      // Get the client secret from the payment intent
      let clientSecret: string | null = null;
      
      console.log('Subscription created:', {
        subscriptionId: subscription.id,
        status: subscription.status,
        latestInvoiceType: typeof latestInvoice,
        latestInvoiceId: typeof latestInvoice === 'object' ? (latestInvoice as any)?.id : latestInvoice,
      });
      
      // Extract payment intent from the expanded invoice
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

  // ===== ADMIN ROUTES =====
  
  // Get admin statistics
  app.get('/api/admin/stats', isAdmin, async (req: any, res) => {
    try {
      const totalUsers = await db.select({ count: sql<number>`count(*)::int` }).from(users);
      const totalChatbots = await db.select({ count: sql<number>`count(*)::int` }).from(chatbots);
      const totalConversations = await db.select({ count: sql<number>`count(*)::int` }).from(conversations);
      const totalMessages = await db.select({ count: sql<number>`count(*)::int` }).from(conversationMessages);
      const paidUsers = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(eq(users.subscriptionTier, 'paid'));
      
      res.json({
        totalUsers: totalUsers[0].count,
        totalChatbots: totalChatbots[0].count,
        totalConversations: totalConversations[0].count,
        totalMessages: totalMessages[0].count,
        paidUsers: paidUsers[0].count,
        freeUsers: totalUsers[0].count - paidUsers[0].count,
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

      if (!tier || !['free', 'paid'].includes(tier)) {
        return res.status(400).json({ error: "Invalid subscription tier. Must be 'free' or 'paid'" });
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
