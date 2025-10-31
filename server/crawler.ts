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

export function normalizeUrl(url: string): string {
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

function isPdfUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.pathname.toLowerCase().endsWith('.pdf');
  } catch {
    return false;
  }
}

function isCrawlableUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();
    
    // PDFs are now crawlable (we extract text from them)
    if (pathname.endsWith('.pdf')) {
      return true;
    }
    
    // Skip other non-HTML file extensions
    const nonCrawlableExtensions = [
      '.zip', '.rar', '.tar', '.gz', '.7z',
      '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.ico',
      '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm',
      '.mp3', '.wav', '.ogg', '.m4a',
      '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
      '.exe', '.dmg', '.apk', '.deb', '.rpm',
      '.css', '.js', '.json', '.xml', '.txt',
    ];
    
    for (const ext of nonCrawlableExtensions) {
      if (pathname.endsWith(ext)) {
        return false;
      }
    }
    
    return true;
  } catch {
    return false;
  }
}

async function extractPdfText(url: string): Promise<{ content: string; title: string; error?: string }> {
  try {
    console.log(`[PDF Extractor] Fetching PDF from: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ChatbotCrawler/1.0)',
      },
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      return {
        content: '',
        title: '',
        error: `Failed to fetch PDF: ${response.status} ${response.statusText}`,
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`[PDF Extractor] PDF downloaded, size: ${buffer.length} bytes`);

    // Dynamically import pdf-parse (CommonJS module)
    const pdfParseModule: any = await import('pdf-parse');
    const pdfParse = pdfParseModule.default || pdfParseModule;
    
    if (typeof pdfParse !== 'function') {
      throw new Error('pdf-parse module did not export a function');
    }
    
    const pdfData = await pdfParse(buffer);

    console.log(`[PDF Extractor] Text extracted: ${pdfData.text.length} characters`);

    // Get filename from URL as title
    const urlObj = new URL(url);
    const filename = urlObj.pathname.split('/').pop() || 'PDF Document';

    return {
      content: pdfData.text.trim(),
      title: filename.replace('.pdf', ''),
    };
  } catch (error: any) {
    console.error(`[PDF Extractor] Error extracting PDF:`, error);
    return {
      content: '',
      title: '',
      error: `Failed to extract PDF text: ${error.message}`,
    };
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
      
      // Skip non-crawlable URLs (images, videos, etc. - but PDFs are crawlable)
      if (!isCrawlableUrl(url)) {
        console.log(`[Crawler] Skipping non-crawlable URL: ${url}`);
        continue;
      }

      let result: { content: string; title: string; html?: string; error?: string };
      let renderedWith: 'static' | 'javascript' = 'static';

      // Check if this is a PDF file
      if (isPdfUrl(url)) {
        console.log(`[Crawler] Detected PDF: ${url}`);
        const pdfResult = await extractPdfText(url);
        result = {
          ...pdfResult,
          html: '', // PDFs don't have HTML
        };
        renderedWith = 'static'; // Mark as static since we didn't use JS rendering
      } else if (mode === 'javascript') {
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

// Calculate MD5 hash of content for change detection
export function calculateContentHash(content: string): string {
  const crypto = require('crypto');
  return crypto.createHash('md5').update(content).digest('hex');
}

// Check if URL content has changed by comparing hash
export async function hasUrlChanged(
  url: string,
  previousHash: string
): Promise<{ changed: boolean; newHash?: string; error?: string }> {
  try {
    const result = await crawlWebsite(url);
    
    if (result.error) {
      return { changed: false, error: result.error };
    }
    
    const newHash = calculateContentHash(result.content);
    return {
      changed: newHash !== previousHash,
      newHash,
    };
  } catch (error: any) {
    return { changed: false, error: error.message };
  }
}

export interface RefreshResult {
  url: string;
  changed: boolean;
  content?: string;
  title?: string;
  contentHash?: string;
  error?: string;
}

// Intelligently refresh URLs - only re-crawl if content has changed
export async function refreshWebsites(
  urls: string[],
  previousCrawlData?: Map<string, { hash: string; etag?: string; lastModified?: string }>
): Promise<RefreshResult[]> {
  const results: RefreshResult[] = [];
  
  for (const url of urls) {
    try {
      const previousData = previousCrawlData?.get(url);
      
      // If we have previous crawl data, check if content changed
      if (previousData) {
        const changeCheck = await hasUrlChanged(url, previousData.hash);
        
        if (changeCheck.error) {
          results.push({
            url,
            changed: false,
            error: changeCheck.error,
          });
          continue;
        }
        
        if (!changeCheck.changed) {
          // Content hasn't changed, skip re-crawling
          console.log(`[Refresh] No changes detected for ${url}`);
          results.push({
            url,
            changed: false,
          });
          continue;
        }
        
        console.log(`[Refresh] Changes detected for ${url}, re-crawling...`);
      }
      
      // Content changed or first time crawling - fetch fresh content
      const crawlResult = await crawlWebsite(url);
      
      if (crawlResult.error) {
        results.push({
          url,
          changed: true,
          error: crawlResult.error,
        });
        continue;
      }
      
      const contentHash = calculateContentHash(crawlResult.content);
      
      results.push({
        url,
        changed: true,
        content: crawlResult.content,
        title: crawlResult.title,
        contentHash,
      });
      
    } catch (error: any) {
      results.push({
        url,
        changed: false,
        error: error.message,
      });
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}
