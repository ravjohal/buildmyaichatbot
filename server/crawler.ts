import * as cheerio from 'cheerio';

export interface CrawlResult {
  url: string;
  content: string;
  title?: string;
  error?: string;
}

export interface RecursiveCrawlOptions {
  maxDepth?: number;
  maxPages?: number;
  sameDomainOnly?: boolean;
}

function isValidPublicUrl(urlString: string): { valid: boolean; error?: string } {
  try {
    const url = new URL(urlString);
    
    // Only allow HTTP and HTTPS protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { valid: false, error: 'Only HTTP and HTTPS protocols are allowed' };
    }
    
    // Block localhost and private IP ranges to prevent SSRF
    const hostname = url.hostname.toLowerCase();
    
    // Block localhost variations
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
      return { valid: false, error: 'Localhost URLs are not allowed' };
    }
    
    // Block private IP ranges (simplified check)
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
    
    // Block common metadata endpoints
    if (hostname === '169.254.169.254') {
      return { valid: false, error: 'Metadata endpoints are not allowed' };
    }
    
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

export async function crawlWebsite(url: string): Promise<CrawlResult & { html?: string }> {
  try {
    // Validate URL to prevent SSRF attacks
    const validation = isValidPublicUrl(url);
    if (!validation.valid) {
      return {
        url,
        content: '',
        error: validation.error || 'Invalid URL',
      };
    }
    
    // Fetch the webpage
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ChatbotBuilder/1.0)',
      },
    });

    if (!response.ok) {
      return {
        url,
        content: '',
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove script and style elements
    $('script, style, noscript, iframe').remove();

    // Extract title
    const title = $('title').text().trim() || $('h1').first().text().trim();

    // Extract main content - prioritize semantic HTML elements
    let content = '';
    
    // Try to find main content area
    const mainContent = $('main, article, [role="main"]').first();
    if (mainContent.length) {
      content = mainContent.text();
    } else {
      // Fallback to body content
      content = $('body').text();
    }

    // Clean up whitespace
    content = content
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 50000); // Limit to 50k characters to avoid token limits

    if (!content) {
      return {
        url,
        content: '',
        error: 'No content could be extracted from the page',
      };
    }

    return {
      url,
      content,
      title,
      html, // Return HTML for link extraction in recursive crawling
    };
  } catch (error) {
    return {
      url,
      content: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove trailing slash for consistency
    parsed.pathname = parsed.pathname.replace(/\/$/, '') || '/';
    // Remove hash
    parsed.hash = '';
    // Sort search params for consistency
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
      // Convert relative URLs to absolute
      const absoluteUrl = new URL(href, baseUrl);
      
      // Only include http/https links
      if (absoluteUrl.protocol === 'http:' || absoluteUrl.protocol === 'https:') {
        // Remove hash fragments
        absoluteUrl.hash = '';
        links.push(absoluteUrl.toString());
      }
    } catch {
      // Ignore invalid URLs
    }
  });
  
  return [...new Set(links)]; // Remove duplicates
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
  } = options;

  const visited = new Set<string>();
  const results: CrawlResult[] = [];
  const queue: { url: string; depth: number }[] = [{ url: normalizeUrl(startUrl), depth: 0 }];

  while (queue.length > 0 && results.length < maxPages) {
    const { url, depth } = queue.shift()!;

    // Skip if already visited
    if (visited.has(url)) continue;
    visited.add(url);

    // Skip if exceeded max depth
    if (depth > maxDepth) continue;

    // Crawl the page (returns HTML along with content)
    const result = await crawlWebsite(url);
    
    // Store result without HTML
    const { html, ...resultWithoutHtml } = result;
    results.push(resultWithoutHtml);

    // If successful and not at max depth, extract and queue links using the HTML we already fetched
    if (!result.error && result.html && depth < maxDepth) {
      const links = extractLinks(result.html, url);

      // Queue new links
      for (const link of links) {
        const normalizedLink = normalizeUrl(link);
        if (!visited.has(normalizedLink) && results.length < maxPages) {
          // Check if same domain if required
          if (!sameDomainOnly || isSameDomain(startUrl, normalizedLink)) {
            queue.push({ url: normalizedLink, depth: depth + 1 });
          }
        }
      }
    }

    // Add small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
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
