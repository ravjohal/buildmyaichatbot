import * as cheerio from 'cheerio';
import { chromium, Browser, Page } from 'playwright';

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
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ChatbotBuilder/1.0)',
        },
      });

      if (!response.ok) {
        return {
          html: '',
          textContent: '',
          title: '',
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const html = await response.text();
      const $ = cheerio.load(html);

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
        html,
        textContent: content,
        title,
      };
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
      if (!this.browser) {
        this.browser = await chromium.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
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
