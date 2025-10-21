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
          .substring(0, 50000);

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
  private readonly timeout: number = 15000;

  async render(url: string): Promise<RenderResult> {
    try {
      const validation = await validateUrl(url);
      if (!validation.valid) {
        return {
          html: '',
          textContent: '',
          title: '',
          error: validation.error || 'Invalid URL',
        };
      }

      if (!this.browser) {
        this.browser = await chromium.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-dev-shm-usage',
          ],
        });
      }

      const context = await this.browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (compatible; ChatbotBuilder/1.0)',
      });

      const page = await context.newPage();
      this.activePage = page;

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

      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: this.timeout,
      });

      await page.waitForTimeout(2000);

      const html = await page.content();
      const title = await page.title();

      const textContent = await page.evaluate(() => {
        const scripts = document.querySelectorAll('script, style, noscript, iframe');
        scripts.forEach(el => el.remove());

        const main = document.querySelector('main, article, [role="main"]');
        const content = main ? main.textContent : document.body.textContent;
        
        return (content || '')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 50000);
      });

      await context.close();
      this.activePage = null;

      return {
        html,
        textContent: textContent || '',
        title: title || '',
      };
    } catch (error) {
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
