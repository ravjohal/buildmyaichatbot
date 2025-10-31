import { pipeline, env } from '@xenova/transformers';

// Disable local model download in production (use cached models)
env.allowLocalModels = false;

// Singleton pattern for embedding model
class EmbeddingService {
  private static instance: EmbeddingService;
  private pipeline: any = null;
  private modelName = 'Xenova/all-MiniLM-L6-v2'; // 384-dimensional embeddings
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService();
    }
    return EmbeddingService.instance;
  }

  /**
   * Initialize the embedding model (lazy loading)
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        console.log(`[Embedding] Initializing model: ${this.modelName}`);
        this.pipeline = await pipeline('feature-extraction', this.modelName);
        this.isInitialized = true;
        console.log('[Embedding] Model initialized successfully');
      } catch (error) {
        console.error('[Embedding] Failed to initialize model:', error);
        this.initPromise = null;
        throw error;
      }
    })();

    return this.initPromise;
  }

  /**
   * Generate embedding vector for a text
   * @param text Input text to embed
   * @returns 384-dimensional embedding vector as array
   */
  public async generateEmbedding(text: string): Promise<number[]> {
    await this.initialize();

    try {
      // Generate embedding
      const output = await this.pipeline(text, {
        pooling: 'mean',
        normalize: true,
      });

      // Convert to array
      const embedding = Array.from(output.data) as number[];
      
      return embedding;
    } catch (error) {
      console.error('[Embedding] Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Normalize a question for consistent embedding
   * @param question Raw question text
   * @returns Normalized question
   */
  public normalizeQuestion(question: string): string {
    return question.trim().toLowerCase();
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param vec1 First vector
   * @param vec2 Second vector
   * @returns Similarity score (0-1, higher is more similar)
   */
  public cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    
    if (magnitude === 0) {
      return 0;
    }

    return dotProduct / magnitude;
  }
}

export const embeddingService = EmbeddingService.getInstance();
