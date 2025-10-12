import * as cheerio from 'cheerio';

export interface CrawlResult {
  url: string;
  content: string;
  title?: string;
  error?: string;
}

export async function crawlWebsite(url: string): Promise<CrawlResult> {
  try {
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
    };
  } catch (error) {
    return {
      url,
      content: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function crawlMultipleWebsites(urls: string[]): Promise<CrawlResult[]> {
  const results = await Promise.all(
    urls.map(url => crawlWebsite(url))
  );
  return results;
}
