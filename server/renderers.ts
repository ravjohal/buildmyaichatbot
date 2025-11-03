import * as cheerio from 'cheerio';
import { chromium, Browser, Page } from 'playwright';
import { validateUrl, shouldBlockRequest } from './ssrf-protection';

export interface RenderResult {
  html: string;
  textContent: string;
  title: string;
  error?: string;
}

export interface PageRenderer {
  render(url: string): Promise<RenderResult>;
  close?(): Promise<void>;
}

export class CheerioRenderer implements PageRenderer {
  async render(url: string): Promise<RenderResult> {
    console.log(`[CheerioRenderer] Attempting to render: ${url}`);
    try {
      const validation = await validateUrl(url);
      console.log(`[CheerioRenderer] Validation result for ${url}: ${JSON.stringify(validation)}`);
      if (!validation.valid) {
        return {
          html: '',
          textContent: '',
          title: '',
          error: validation.error || 'Invalid URL',
        };
      }

      let currentUrl = url;
      let redirectCount = 0;
      const maxRedirects = 5;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      try {
        let finalResponse: Response | null = null;

        while (redirectCount <= maxRedirects) {
          const response = await fetch(currentUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; ChatbotBuilder/1.0)',
            },
            redirect: 'manual',
            signal: controller.signal,
          });

          if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get('location');
            if (!location) break;

            const nextUrl = new URL(location, currentUrl).toString();
            const validation = await validateUrl(nextUrl);
            if (!validation.valid) {
              return {
                html: '',
                textContent: '',
                title: '',
                error: `Redirect blocked: ${validation.error}`,
              };
            }

            currentUrl = nextUrl;
            redirectCount++;
            continue;
          }

          finalResponse = response;
          break;
        }

        if (!finalResponse) {
          return {
            html: '',
            textContent: '',
            title: '',
            error: 'Too many redirects',
          };
        }

        clearTimeout(timeout);

        if (!finalResponse.ok) {
          return {
            html: '',
            textContent: '',
            title: '',
            error: `HTTP ${finalResponse.status}: ${finalResponse.statusText}`,
          };
        }

        const html = await finalResponse.text();
        const trimmedHtml = html.substring(0, 2000000);
        const $ = cheerio.load(trimmedHtml);

        $('script, style, noscript, iframe').remove();

        const title = $('title').text().trim() || $('h1').first().text().trim();

        let content = '';
        const mainContent = $('main, article, [role="main"]').first();
        if (mainContent.length) {
          content = mainContent.text();
        } else {
          content = $('body').text();
        }

        content = content
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 100000);

        return {
          html: trimmedHtml,
          textContent: content,
          title,
        };
      } catch (fetchError) {
        clearTimeout(timeout);
        return {
          html: '',
          textContent: '',
          title: '',
          error: fetchError instanceof Error ? fetchError.message : 'Fetch failed',
        };
      }
    } catch (error) {
      return {
        html: '',
        textContent: '',
        title: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export class PlaywrightRenderer implements PageRenderer {
  private browser: Browser | null = null;
  private activePage: Page | null = null;
  private readonly timeout: number = 30000; // Increased from 15s to 30s for slow sites

  async render(url: string): Promise<RenderResult> {
    console.log(`[PlaywrightRenderer] Starting render for: ${url}`);
    console.log(`[PlaywrightRenderer] Environment:`, process.env.NODE_ENV);
    console.log(`[PlaywrightRenderer] Platform:`, process.platform);
    console.log(`[PlaywrightRenderer] Architecture:`, process.arch);
    
    try {
      const validation = await validateUrl(url);
      console.log(`[PlaywrightRenderer] Validation result: ${JSON.stringify(validation)}`);
      if (!validation.valid) {
        return {
          html: '',
          textContent: '',
          title: '',
          error: validation.error || 'Invalid URL',
        };
      }

      if (!this.browser) {
        console.log(`[PlaywrightRenderer] Launching browser...`);
        console.log(`[PlaywrightRenderer] NODE_ENV:`, process.env.NODE_ENV);
        
        // In production on Replit, use system Chromium from Nix
        // In development, use Playwright's bundled browser
        let executablePath: string | undefined = undefined;
        
        if (process.env.NODE_ENV === 'production') {
          // Try to find system chromium from Nix
          try {
            const { execSync } = await import('child_process');
            // Replit's Nix provides chromium at these paths
            const chromiumPath = execSync('which chromium-browser || which chromium', { encoding: 'utf8' }).trim();
            if (chromiumPath) {
              executablePath = chromiumPath;
              console.log(`[PlaywrightRenderer] ✓ Found system Chromium:`, executablePath);
            } else {
              console.log(`[PlaywrightRenderer] ⚠ System Chromium not found via 'which'`);
              console.log(`[PlaywrightRenderer] ⚠ Ensure replit.nix includes: pkgs.chromium`);
            }
          } catch (error) {
            console.log(`[PlaywrightRenderer] ⚠ Error finding system Chromium:`, error);
          }
        }
        
        if (!executablePath) {
          console.log(`[PlaywrightRenderer] Using Playwright bundled Chromium`);
          console.log(`[PlaywrightRenderer] Default path:`, chromium.executablePath());
        }
        
        try {
          this.browser = await chromium.launch({
            executablePath: executablePath || undefined,
            headless: true,
            args: [
              '--no-sandbox',
              '--disable-dev-shm-usage',
              '--disable-gpu',
              '--disable-setuid-sandbox',
              '--no-zygote',
            ],
          });
          console.log(`[PlaywrightRenderer] ✓ Browser launched successfully`);
          console.log(`[PlaywrightRenderer] ✓ Browser version:`, await this.browser.version());
        } catch (launchError) {
          console.error(`[PlaywrightRenderer] ✗ FAILED TO LAUNCH BROWSER`);
          console.error(`[PlaywrightRenderer] Error:`, launchError);
          console.error(`[PlaywrightRenderer] Error type:`, launchError instanceof Error ? launchError.constructor.name : typeof launchError);
          console.error(`[PlaywrightRenderer] Stack:`, launchError instanceof Error ? launchError.stack : 'N/A');
          throw launchError;
        }
      }

      console.log(`[PlaywrightRenderer] Creating browser context...`);
      const context = await this.browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (compatible; ChatbotBuilder/1.0)',
      });

      const page = await context.newPage();
      this.activePage = page;
      console.log(`[PlaywrightRenderer] Page created, navigating to ${url}...`);

      await page.route('**/*', (route) => {
        const requestUrl = route.request().url();
        
        if (shouldBlockRequest(requestUrl)) {
          console.log(`Blocked request to: ${requestUrl}`);
          route.abort();
          return;
        }

        const resourceType = route.request().resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          route.abort();
        } else {
          route.continue();
        }
      });

      // Use 'domcontentloaded' instead of 'networkidle' to avoid timing out on sites with continuous network activity
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: this.timeout,
      });
      console.log(`[PlaywrightRenderer] Page loaded, waiting for JavaScript...`);

      // Give JS frameworks time to render (increased from 2s to 3s)
      await page.waitForTimeout(3000);

      const html = await page.content();
      const title = await page.title();
      console.log(`[PlaywrightRenderer] Got title: ${title}`);

      const textContent = await page.evaluate(() => {
        const scripts = document.querySelectorAll('script, style, noscript, iframe');
        scripts.forEach(el => el.remove());

        const main = document.querySelector('main, article, [role="main"]');
        const content = main ? main.textContent : document.body.textContent;
        
        return (content || '')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 100000);
      });

      console.log(`[PlaywrightRenderer] Extracted ${textContent.length} chars of content`);

      await context.close();
      this.activePage = null;

      return {
        html,
        textContent: textContent || '',
        title: title || '',
      };
    } catch (error) {
      console.error(`[PlaywrightRenderer] ✗ RENDER ERROR for ${url}`);
      console.error(`[PlaywrightRenderer] Error type:`, error instanceof Error ? error.constructor.name : typeof error);
      console.error(`[PlaywrightRenderer] Error message:`, error instanceof Error ? error.message : String(error));
      console.error(`[PlaywrightRenderer] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
      console.error(`[PlaywrightRenderer] Full error:`, JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      
      if (this.activePage) {
        try {
          await this.activePage.context().close();
        } catch {}
        this.activePage = null;
      }
      
      return {
        html: '',
        textContent: '',
        title: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async close(): Promise<void> {
    if (this.activePage) {
      try {
        await this.activePage.context().close();
      } catch {}
      this.activePage = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
