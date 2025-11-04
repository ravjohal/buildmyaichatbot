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
    maxChunkSize = 800,  // ~160-200 words (better for precise retrieval)
    minChunkSize = 200,   // ~40-50 words
    overlap = 100,        // ~20 words overlap
    title,
  } = options;

  const chunks: ContentChunk[] = [];
  
  // Split content by double newlines (paragraphs)
  let paragraphs = content
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  if (paragraphs.length === 0) {
    return [];
  }

  // Handle large paragraphs that need to be split further
  // This is common with PDF extractions that have poor formatting
  const processedParagraphs: string[] = [];
  for (const para of paragraphs) {
    if (para.length > maxChunkSize) {
      // Split by sentences first
      const sentences = para.split(/[.!?]+\s+/).filter(s => s.trim().length > 0);
      
      if (sentences.length > 1) {
        // If we have multiple sentences, use them as sub-paragraphs
        processedParagraphs.push(...sentences.map(s => s.trim() + '.'));
      } else {
        // No sentence breaks, split by character count as last resort
        for (let i = 0; i < para.length; i += maxChunkSize - overlap) {
          const chunk = para.substring(i, i + maxChunkSize);
          if (chunk.trim().length > 0) {
            processedParagraphs.push(chunk.trim());
          }
        }
      }
    } else {
      processedParagraphs.push(para);
    }
  }
  
  paragraphs = processedParagraphs;

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

  // Filter out low-quality/repetitive chunks
  const qualityChunks = chunks.filter(chunk => !isLowQualityChunk(chunk.text));
  
  // Re-index after filtering
  qualityChunks.forEach((chunk, idx) => {
    chunk.index = idx;
  });

  return qualityChunks;
}

/**
 * Detect if a chunk is low-quality/repetitive content that should be filtered
 */
function isLowQualityChunk(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  // Filter out chunks that are mostly form fields
  const formIndicators = [
    'confirm password',
    'i accept the terms of use',
    'privacy policy',
    'required fields',
    'submit',
  ];
  
  // Count how many form indicators appear
  const formIndicatorCount = formIndicators.filter(indicator => 
    lowerText.includes(indicator)
  ).length;
  
  // If chunk has 3+ form indicators and is relatively short, it's likely just a form
  if (formIndicatorCount >= 3 && text.length < 2000) {
    return true;
  }
  
  // Filter out very repetitive content (same phrase repeated many times)
  const words = text.split(/\s+/);
  if (words.length > 10) {
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    const uniqueRatio = uniqueWords.size / words.length;
    
    // If less than 30% unique words, it's very repetitive
    if (uniqueRatio < 0.3) {
      return true;
    }
  }
  
  return false;
}

/**
 * Create a chunk object with metadata
 */
function createChunk(text: string, index: number, title?: string): ContentChunk {
  const contentHash = calculateHash(text);
  const headings = extractHeadings(text);
  const keywords = extractKeywords(text);
  
  return {
    text,
    index,
    contentHash,
    metadata: {
      title,
      headings: headings.length > 0 ? headings : undefined,
      keywords: keywords.length > 0 ? keywords : undefined,
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
 * Extract important keywords from text for lexical search
 * Focuses on nouns, capitalized terms, and domain-specific words
 */
function extractKeywords(text: string): string[] {
  const keywords = new Set<string>();
  
  // Common stop words to ignore
  const stopWords = new Set([
    'the', 'is', 'at', 'which', 'on', 'and', 'or', 'to', 'for', 'of', 'in', 'a', 'an',
    'with', 'by', 'from', 'as', 'this', 'that', 'it', 'be', 'are', 'was', 'were',
    'will', 'would', 'should', 'could', 'may', 'might', 'can', 'have', 'has', 'had'
  ]);
  
  // Extract capitalized words (likely proper nouns or important terms)
  const capitalizedMatches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
  capitalizedMatches.forEach(word => {
    const clean = word.toLowerCase().trim();
    if (clean.length > 2 && !stopWords.has(clean)) {
      keywords.add(clean);
    }
  });
  
  // Extract words that appear in ALL CAPS (acronyms, important terms)
  const allCapsMatches = text.match(/\b[A-Z]{2,}\b/g) || [];
  allCapsMatches.forEach(word => {
    if (word.length >= 2) {
      keywords.add(word.toLowerCase());
    }
  });
  
  // Extract quoted terms (often important concepts)
  const quotedMatches = text.match(/"([^"]+)"/g) || [];
  quotedMatches.forEach(match => {
    const clean = match.replace(/"/g, '').toLowerCase().trim();
    if (clean.length > 2 && !stopWords.has(clean)) {
      keywords.add(clean);
    }
  });
  
  // Extract compound words and technical terms (hyphenated or multi-word)
  const compoundMatches = text.match(/\b[a-z]+-[a-z]+(?:-[a-z]+)*\b/gi) || [];
  compoundMatches.forEach(word => {
    const clean = word.toLowerCase().trim();
    if (clean.length > 3) {
      keywords.add(clean);
    }
  });
  
  // Extract potential domain-specific terms (longer words that aren't common)
  const words = text.match(/\b[a-z]{5,}\b/gi) || [];
  const wordFreq = new Map<string, number>();
  words.forEach(word => {
    const clean = word.toLowerCase().trim();
    if (!stopWords.has(clean)) {
      wordFreq.set(clean, (wordFreq.get(clean) || 0) + 1);
    }
  });
  
  // Add words that appear multiple times (likely important)
  wordFreq.forEach((count, word) => {
    if (count >= 2 && word.length > 4) {
      keywords.add(word);
    }
  });
  
  // Limit to top 20 keywords to avoid bloat
  return Array.from(keywords).slice(0, 20);
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
    maxChunkSize: 800,
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
    maxChunkSize: 800,
    minChunkSize: 200,
    overlap: 100,
  });
}
