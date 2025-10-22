import * as cheerio from 'cheerio';
import { CheerioRenderer, PlaywrightRenderer, PageRenderer } from './renderers';

export interface CrawlResult {
  url: string;
  content: string;
  title?: string;
  error?: string;
  renderedWith?: 'static' | 'javascript';
}

export interface RecursiveCrawlOptions {
  maxDepth?: number;
  maxPages?: number;
  sameDomainOnly?: boolean;
  mode?: 'static' | 'javascript' | 'auto';
  maxJsPages?: number;
}

async function crawlWithRenderer(
  url: string,
  renderer: PageRenderer
): Promise<{ content: string; title: string; html: string; error?: string }> {
  const result = await renderer.render(url);
  
  if (result.error) {
    return {
      content: '',
      title: '',
      html: '',
      error: result.error,
    };
  }

  if (!result.textContent || result.textContent.length === 0) {
    return {
      content: '',
      title: result.title,
      html: result.html,
      error: 'No content could be extracted from the page',
    };
  }

  return {
    content: result.textContent,
    title: result.title,
    html: result.html,
  };
}

export async function crawlWebsite(url: string): Promise<CrawlResult & { html?: string }> {
  const staticRenderer = new CheerioRenderer();
  const result = await crawlWithRenderer(url, staticRenderer);
  
  return {
    url,
    content: result.content,
    title: result.title,
    html: result.html,
    error: result.error,
    renderedWith: 'static',
  };
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.pathname = parsed.pathname.replace(/\/$/, '') || '/';
    parsed.hash = '';
    parsed.searchParams.sort();
    return parsed.toString();
  } catch {
    return url;
  }
}

export async function crawlMultipleWebsites(urls: string[]): Promise<CrawlResult[]> {
  const results = await Promise.all(
    urls.map(url => crawlWebsite(url))
  );
  return results;
}

function extractLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const links: string[] = [];
  
  $('a[href]').each((_, element) => {
    const href = $(element).attr('href');
    if (!href) return;
    
    try {
      const absoluteUrl = new URL(href, baseUrl);
      
      // Only include HTTP(S) URLs that point to crawlable content
      if ((absoluteUrl.protocol === 'http:' || absoluteUrl.protocol === 'https:') && 
          isCrawlableUrl(absoluteUrl.toString())) {
        absoluteUrl.hash = '';
        links.push(absoluteUrl.toString());
      }
    } catch {
    }
  });
  
  return Array.from(new Set(links));
}

function isSameDomain(url1: string, url2: string): boolean {
  try {
    const domain1 = new URL(url1).hostname;
    const domain2 = new URL(url2).hostname;
    return domain1 === domain2;
  } catch {
    return false;
  }
}

function isCrawlableUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();
    
    // Skip non-HTML file extensions
    const nonHtmlExtensions = [
      '.pdf', '.zip', '.rar', '.tar', '.gz', '.7z',
      '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.ico',
      '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm',
      '.mp3', '.wav', '.ogg', '.m4a',
      '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
      '.exe', '.dmg', '.apk', '.deb', '.rpm',
      '.css', '.js', '.json', '.xml', '.txt',
    ];
    
    for (const ext of nonHtmlExtensions) {
      if (pathname.endsWith(ext)) {
        return false;
      }
    }
    
    return true;
  } catch {
    return false;
  }
}

export async function crawlWebsiteRecursive(
  startUrl: string,
  options: RecursiveCrawlOptions = {}
): Promise<CrawlResult[]> {
  const {
    maxDepth = 2,
    maxPages = 50,
    sameDomainOnly = true,
    mode = 'auto',
    maxJsPages = 20,
  } = options;

  const visited = new Set<string>();
  const results: CrawlResult[] = [];
  const queue: { url: string; depth: number }[] = [{ url: normalizeUrl(startUrl), depth: 0 }];

  const staticRenderer = new CheerioRenderer();
  let jsRenderer: PlaywrightRenderer | null = null;
  let jsPageCount = 0;

  try {
    while (queue.length > 0 && results.length < maxPages) {
      const { url, depth } = queue.shift()!;

      if (visited.has(url)) continue;
      visited.add(url);

      if (depth > maxDepth) continue;
      
      // Skip non-crawlable URLs (PDFs, images, etc.)
      if (!isCrawlableUrl(url)) {
        console.log(`[Crawler] Skipping non-HTML URL: ${url}`);
        continue;
      }

      let result: { content: string; title: string; html: string; error?: string };
      let renderedWith: 'static' | 'javascript' = 'static';

      if (mode === 'javascript') {
        if (!jsRenderer) {
          jsRenderer = new PlaywrightRenderer();
        }
        result = await crawlWithRenderer(url, jsRenderer);
        renderedWith = 'javascript';
        jsPageCount++;
      } else if (mode === 'static') {
        result = await crawlWithRenderer(url, staticRenderer);
        renderedWith = 'static';
      } else {
        result = await crawlWithRenderer(url, staticRenderer);
        renderedWith = 'static';

        console.log(`[Auto-detect] Static result for ${url}: content=${result.content.length} chars, error="${result.error}", jsPageCount=${jsPageCount}/${maxJsPages}`);

        const contentTooShort = result.content.length < 1000;
        const noContentExtracted = result.error === 'No content could be extracted from the page';
        const shouldTryJs = (contentTooShort || noContentExtracted) && jsPageCount < maxJsPages;

        console.log(`[Auto-detect] contentTooShort=${contentTooShort}, noContentExtracted=${noContentExtracted}, shouldTryJs=${shouldTryJs}`);

        if (shouldTryJs) {
          console.log(`Content extraction failed or too short (${result.content.length} chars), trying JavaScript rendering for ${url}`);
          
          try {
            if (!jsRenderer) {
              console.log(`[Auto-detect] Creating new PlaywrightRenderer...`);
              jsRenderer = new PlaywrightRenderer();
              console.log(`[Auto-detect] PlaywrightRenderer created successfully`);
            }
            
            console.log(`[Auto-detect] Calling crawlWithRenderer with Playwright...`);
            const jsResult = await crawlWithRenderer(url, jsRenderer);
            console.log(`[Auto-detect] Playwright result: content=${jsResult.content.length} chars, error="${jsResult.error}"`);
            
            if (!jsResult.error && jsResult.content.length > result.content.length) {
              console.log(`JavaScript rendering yielded more content: ${jsResult.content.length} chars vs ${result.content.length} chars`);
              result = jsResult;
              renderedWith = 'javascript';
              jsPageCount++;
            } else {
              console.log(`[Auto-detect] Playwright didn't improve results, keeping static result`);
            }
          } catch (jsError) {
            console.error(`[Auto-detect] Error during JavaScript rendering:`, jsError);
          }
        }
      }

      const { html, ...resultWithoutHtml } = result;
      results.push({
        url,
        ...resultWithoutHtml,
        renderedWith,
      });

      if (!result.error && result.html && depth < maxDepth) {
        const links = extractLinks(result.html, url);

        for (const link of links) {
          const normalizedLink = normalizeUrl(link);
          if (!visited.has(normalizedLink) && results.length < maxPages) {
            if (!sameDomainOnly || isSameDomain(startUrl, normalizedLink)) {
              queue.push({ url: normalizedLink, depth: depth + 1 });
            }
          }
        }
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } finally {
    if (jsRenderer) {
      await jsRenderer.close();
    }
  }

  return results;
}

export async function crawlMultipleWebsitesRecursive(
  urls: string[],
  options: RecursiveCrawlOptions = {}
): Promise<CrawlResult[]> {
  const allResults: CrawlResult[] = [];
  
  for (const url of urls) {
    const results = await crawlWebsiteRecursive(url, options);
    allResults.push(...results);
  }
  
  return allResults;
}
