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

function isValidPublicUrl(urlString: string): { valid: boolean; error?: string } {
  try {
    const url = new URL(urlString);
    
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { valid: false, error: 'Only HTTP and HTTPS protocols are allowed' };
    }
    
    const hostname = url.hostname.toLowerCase();
    
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
      return { valid: false, error: 'Localhost URLs are not allowed' };
    }
    
    if (hostname.startsWith('10.') || 
        hostname.startsWith('192.168.') ||
        hostname.startsWith('172.16.') || hostname.startsWith('172.17.') || 
        hostname.startsWith('172.18.') || hostname.startsWith('172.19.') ||
        hostname.startsWith('172.20.') || hostname.startsWith('172.21.') ||
        hostname.startsWith('172.22.') || hostname.startsWith('172.23.') ||
        hostname.startsWith('172.24.') || hostname.startsWith('172.25.') ||
        hostname.startsWith('172.26.') || hostname.startsWith('172.27.') ||
        hostname.startsWith('172.28.') || hostname.startsWith('172.29.') ||
        hostname.startsWith('172.30.') || hostname.startsWith('172.31.')) {
      return { valid: false, error: 'Private IP addresses are not allowed' };
    }
    
    if (hostname === '169.254.169.254') {
      return { valid: false, error: 'Metadata endpoints are not allowed' };
    }
    
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

async function crawlWithRenderer(
  url: string,
  renderer: PageRenderer
): Promise<{ content: string; title: string; html: string; error?: string }> {
  const validation = isValidPublicUrl(url);
  if (!validation.valid) {
    return {
      content: '',
      title: '',
      html: '',
      error: validation.error || 'Invalid URL',
    };
  }

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
      
      if (absoluteUrl.protocol === 'http:' || absoluteUrl.protocol === 'https:') {
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

export async function crawlWebsiteRecursive(
  startUrl: string,
  options: RecursiveCrawlOptions = {}
): Promise<CrawlResult[]> {
  const {
    maxDepth = 2,
    maxPages = 50,
    sameDomainOnly = true,
    mode = 'auto',
    maxJsPages = 3,
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

        const contentTooShort = result.content.length < 1000;
        const shouldTryJs = contentTooShort && !result.error && jsPageCount < maxJsPages;

        if (shouldTryJs) {
          console.log(`Content too short (${result.content.length} chars), trying JavaScript rendering for ${url}`);
          
          if (!jsRenderer) {
            jsRenderer = new PlaywrightRenderer();
          }
          
          const jsResult = await crawlWithRenderer(url, jsRenderer);
          
          if (!jsResult.error && jsResult.content.length > result.content.length) {
            console.log(`JavaScript rendering yielded more content: ${jsResult.content.length} chars vs ${result.content.length} chars`);
            result = jsResult;
            renderedWith = 'javascript';
            jsPageCount++;
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
