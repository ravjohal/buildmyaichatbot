/**
 * Performance Monitoring Utility
 * Tracks detailed timing metrics throughout the indexing pipeline
 */

export interface PerformanceMetrics {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private environment: string;
  private jobId: string;
  
  constructor(jobId: string) {
    this.jobId = jobId;
    this.environment = process.env.NODE_ENV || 'development';
  }
  
  /**
   * Start tracking an operation
   */
  start(operation: string, metadata?: Record<string, any>): void {
    const key = `${operation}-${Date.now()}`;
    this.metrics.set(key, {
      operation,
      startTime: Date.now(),
      metadata,
    });
    
    console.log(`[PERF-${this.environment.toUpperCase()}][${this.jobId}] ⏱ START: ${operation}`, metadata || '');
  }
  
  /**
   * End tracking an operation and log the duration
   */
  end(operation: string, metadata?: Record<string, any>): number {
    // Find the most recent start for this operation
    const entries = Array.from(this.metrics.entries());
    const match = entries
      .reverse()
      .find(([_, m]) => m.operation === operation && !m.endTime);
    
    if (!match) {
      console.warn(`[PERF-${this.environment.toUpperCase()}][${this.jobId}] ⚠ No start found for operation: ${operation}`);
      return 0;
    }
    
    const [key, metric] = match;
    const endTime = Date.now();
    const duration = endTime - metric.startTime;
    
    metric.endTime = endTime;
    metric.duration = duration;
    if (metadata) {
      metric.metadata = { ...metric.metadata, ...metadata };
    }
    
    const durationSec = (duration / 1000).toFixed(2);
    console.log(`[PERF-${this.environment.toUpperCase()}][${this.jobId}] ✓ END: ${operation} - ${durationSec}s`, metric.metadata || '');
    
    return duration;
  }
  
  /**
   * Track a single metric without start/end
   */
  track(operation: string, value: number, unit: string = 'ms', metadata?: Record<string, any>): void {
    console.log(`[PERF-${this.environment.toUpperCase()}][${this.jobId}] 📊 ${operation}: ${value}${unit}`, metadata || '');
  }
  
  /**
   * Get summary of all metrics
   */
  getSummary(): string {
    const completed = Array.from(this.metrics.values()).filter(m => m.endTime);
    
    if (completed.length === 0) {
      return 'No completed operations';
    }
    
    const summary = completed.map(m => {
      const durationSec = m.duration ? (m.duration / 1000).toFixed(2) : '?';
      return `  ${m.operation}: ${durationSec}s`;
    }).join('\n');
    
    const totalDuration = completed.reduce((sum, m) => sum + (m.duration || 0), 0);
    const totalSec = (totalDuration / 1000).toFixed(2);
    
    return `Performance Summary (${this.environment}):\n${summary}\n  TOTAL: ${totalSec}s`;
  }
}

/**
 * Environment-aware configuration
 * Optimized for production vs development
 */
export interface EnvironmentConfig {
  crawling: {
    maxDepth: number;
    maxPages: number;
    timeout: number;
    concurrency: number;
  };
  chunking: {
    batchSize: number;
  };
  embedding: {
    batchSize: number;
    concurrency: number;
    retryDelay: number;
  };
}

export function getEnvironmentConfig(): EnvironmentConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // Production: Optimize for reliability and cost-efficiency
    // Lower concurrency to reduce resource spikes
    // Higher timeouts to handle slower system Chromium
    return {
      crawling: {
        maxDepth: 2,
        maxPages: 150, // Reduced from 200 to prevent resource exhaustion
        timeout: 20000, // Increased from 15s to account for slower Chromium
        concurrency: 2, // Reduced from 3 to prevent CPU throttling
      },
      chunking: {
        batchSize: 50, // Process in smaller batches to reduce memory pressure
      },
      embedding: {
        batchSize: 10, // Smaller batches for API rate limiting
        concurrency: 3, // Conservative concurrency for API calls
        retryDelay: 2000, // Longer delay for production stability
      },
    };
  } else {
    // Development: Optimize for speed
    return {
      crawling: {
        maxDepth: 2,
        maxPages: 200,
        timeout: 15000,
        concurrency: 4, // Higher concurrency in dev
      },
      chunking: {
        batchSize: 100,
      },
      embedding: {
        batchSize: 20,
        concurrency: 5,
        retryDelay: 1000,
      },
    };
  }
}
