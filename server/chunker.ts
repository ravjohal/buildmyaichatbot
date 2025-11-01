import crypto from 'crypto';

export interface ContentChunk {
  text: string;
  index: number;
  contentHash: string;
  metadata?: {
    title?: string;
    headings?: string[];
    keywords?: string[];
  };
}

/**
 * Split content into semantic chunks for efficient retrieval
 * Strategy: Split by paragraphs, combine small chunks, limit size
 */
export function chunkContent(
  content: string,
  options: {
    maxChunkSize?: number; // Max characters per chunk
    minChunkSize?: number; // Min characters per chunk
    overlap?: number; // Characters to overlap between chunks
    title?: string;
  } = {}
): ContentChunk[] {
  const {
    maxChunkSize = 1000, // ~200-250 words
    minChunkSize = 200,   // ~40-50 words
    overlap = 100,        // ~20 words overlap
    title,
  } = options;

  const chunks: ContentChunk[] = [];
  
  // Split content by double newlines (paragraphs)
  const paragraphs = content
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  if (paragraphs.length === 0) {
    return [];
  }

  let currentChunk = '';
  let chunkIndex = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    
    // If adding this paragraph would exceed max size
    if (currentChunk.length > 0 && (currentChunk.length + paragraph.length + 2) > maxChunkSize) {
      // Save current chunk
      if (currentChunk.length >= minChunkSize) {
        chunks.push(createChunk(currentChunk, chunkIndex, title));
        chunkIndex++;
        
        // Start new chunk with overlap from previous chunk
        const overlapText = currentChunk.slice(-overlap);
        currentChunk = overlapText + '\n\n' + paragraph;
      } else {
        // Current chunk too small, add paragraph anyway
        currentChunk += '\n\n' + paragraph;
      }
    } else {
      // Add paragraph to current chunk
      if (currentChunk.length === 0) {
        currentChunk = paragraph;
      } else {
        currentChunk += '\n\n' + paragraph;
      }
    }
  }

  // Add final chunk
  if (currentChunk.length >= minChunkSize) {
    chunks.push(createChunk(currentChunk, chunkIndex, title));
  } else if (chunks.length > 0) {
    // Merge small final chunk with last chunk
    const lastChunk = chunks[chunks.length - 1];
    lastChunk.text += '\n\n' + currentChunk;
    lastChunk.contentHash = calculateHash(lastChunk.text);
  } else if (currentChunk.length > 0) {
    // Only chunk and it's small - keep it anyway
    chunks.push(createChunk(currentChunk, chunkIndex, title));
  }

  return chunks;
}

/**
 * Create a chunk object with metadata
 */
function createChunk(text: string, index: number, title?: string): ContentChunk {
  const contentHash = calculateHash(text);
  const headings = extractHeadings(text);
  
  return {
    text,
    index,
    contentHash,
    metadata: {
      title,
      headings: headings.length > 0 ? headings : undefined,
    },
  };
}

/**
 * Calculate MD5 hash of content
 */
function calculateHash(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Extract markdown-style headings from text
 */
function extractHeadings(text: string): string[] {
  const headings: string[] = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    // Match markdown headings (# Header, ## Header, etc.)
    const match = line.match(/^#{1,6}\s+(.+)$/);
    if (match) {
      headings.push(match[1].trim());
    }
  }
  
  return headings;
}

/**
 * Chunk website content with URL-specific metadata
 */
export function chunkWebsiteContent(
  url: string,
  content: string,
  title?: string
): ContentChunk[] {
  return chunkContent(content, {
    title: title || url,
    maxChunkSize: 1000,
    minChunkSize: 200,
    overlap: 100,
  });
}

/**
 * Chunk document content with document-specific metadata
 */
export function chunkDocumentContent(
  documentName: string,
  content: string
): ContentChunk[] {
  return chunkContent(content, {
    title: documentName,
    maxChunkSize: 1000,
    minChunkSize: 200,
    overlap: 100,
  });
}
