import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./auth";
import { checkAndSendWeeklyReports } from "./emails/weekly-report-service";
import { storage } from "./storage";
import { securityHeaders } from "./securityHeaders";

const app = express();

// CRITICAL: Stripe webhook needs raw body for signature verification
// Apply express.raw() ONLY to the webhook endpoint BEFORE express.json()
app.use('/api/stripe-webhook', express.raw({ type: 'application/json' }));

// Apply JSON parsing to all other routes
app.use(express.json({ limit: '50mb' })); // Increased limit for large chatbot configurations
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Security headers middleware - applied early to all routes
app.use(securityHeaders);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Log startup environment information
  console.log("=== SERVER STARTUP ===");
  console.log("Environment:", process.env.NODE_ENV);
  console.log("Platform:", process.platform);
  console.log("Node version:", process.version);
  console.log("Port:", process.env.PORT || '5000');
  
  // Check Playwright availability
  console.log("\n=== PLAYWRIGHT AVAILABILITY CHECK ===");
  try {
    const { chromium } = await import('playwright');
    const { execSync } = await import('child_process');
    console.log("✓ Playwright module loaded successfully");
    console.log("  Default executable:", chromium.executablePath());
    
    // Check for system Chromium (Nix)
    let systemChromium: string | null = null;
    try {
      systemChromium = execSync('which chromium-browser || which chromium', { encoding: 'utf8' }).trim();
      if (systemChromium) {
        console.log("✓ System Chromium found:", systemChromium);
      }
    } catch {
      console.log("  System Chromium not found in PATH");
    }
    
    // Try to launch browser
    try {
      const executablePath = (process.env.NODE_ENV === 'production' && systemChromium) 
        ? systemChromium 
        : undefined;
      
      if (executablePath) {
        console.log("  Testing with system Chromium:", executablePath);
      } else {
        console.log("  Testing with Playwright Chromium");
      }
      
      const browser = await chromium.launch({ 
        executablePath: executablePath || undefined,
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
      });
      const version = await browser.version();
      console.log("✓ Chromium version:", version);
      await browser.close();
      console.log("✓ Playwright is FULLY OPERATIONAL");
    } catch (browserError) {
      console.error("✗ Chromium browser launch failed:", browserError);
      console.error("✗ Playwright module exists but browser is NOT functional");
    }
  } catch (importError) {
    console.error("✗ Playwright module NOT available");
    console.error("✗ Import error:", importError);
    console.error("✗ JavaScript SPA crawling will NOT work in production");
  }
  console.log("=== END PLAYWRIGHT CHECK ===\n");
  
  // Setup authentication middleware BEFORE routes
  await setupAuth(app);
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, async () => {
    log(`serving on port ${port}`);
    
    // Start weekly report scheduler
    // Check immediately on startup
    checkAndSendWeeklyReports(storage).catch((err: Error) => {
      console.error('[WeeklyReport] Error in initial check:', err);
    });
    
    // Then check every 6 hours
    const SIX_HOURS = 6 * 60 * 60 * 1000;
    setInterval(() => {
      checkAndSendWeeklyReports(storage).catch((err: Error) => {
        console.error('[WeeklyReport] Error in scheduled check:', err);
      });
    }, SIX_HOURS);
    
    log('Weekly report scheduler started (checks every 6 hours)');
    
    // Start background indexing worker
    const { startIndexingWorker } = await import('./indexing-worker');
    await startIndexingWorker();
    
    // Start scheduled reindexing scheduler
    const { startReindexScheduler } = await import('./reindex-scheduler');
    startReindexScheduler();
    log('Scheduled reindex scheduler started');
  });
})();
