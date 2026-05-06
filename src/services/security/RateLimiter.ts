/**
 * Rate Limiting Service
 * 
 * Requirements: 107
 * Security Level: 🟡 HAUTE
 * 
 * In-memory rate limiter to prevent DDoS and brute force attacks
 */

export interface RateLimitOptions {
  windowMs: number;        // Time window in milliseconds
  maxRequests: number;     // Maximum requests per window
  skipSuccessfulRequests?: boolean;  // Don't count successful requests
  skipFailedRequests?: boolean;      // Don't count failed requests
  message?: string;        // Custom error message
  statusCode?: number;     // HTTP status code for rate limit exceeded
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
  totalHits: number;
  isRateLimited: boolean;
}

export interface RateLimitStore {
  [key: string]: {
    hits: number;
    startTime: number;
    lastRequest: number;
  };
}

export class RateLimiter {
  private store: RateLimitStore = {};
  private options: RateLimitOptions;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(options: Partial<RateLimitOptions> = {}) {
    this.options = {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,   // 100 requests per window
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      message: 'Too many requests, please try again later.',
      statusCode: 429,
      ...options,
    };

    // Start automatic cleanup
    this.startCleanup();
  }

  /**
   * Check if a key is rate limited
   */
  public check(key: string): RateLimitInfo {
    const now = Date.now();
    const windowStart = now - this.options.windowMs;
    
    const record = this.store[key];
    
    if (!record) {
      return this.createNewRecord(key, now);
    }

    // Reset if window has passed
    if (record.startTime < windowStart) {
      return this.resetRecord(key, now);
    }

    // Update last request time
    record.lastRequest = now;

    // Check if rate limit exceeded
    const isRateLimited = record.hits >= this.options.maxRequests;
    const remaining = Math.max(0, this.options.maxRequests - record.hits);
    const resetTime = record.startTime + this.options.windowMs;

    return {
      limit: this.options.maxRequests,
      remaining,
      resetTime,
      totalHits: record.hits,
      isRateLimited,
    };
  }

  /**
   * Increment hit count for a key
   */
  public increment(key: string, success?: boolean): RateLimitInfo {
    const info = this.check(key);
    
    // Skip increment if configured to skip successful/failed requests
    if (success === true && this.options.skipSuccessfulRequests) {
      return info;
    }
    if (success === false && this.options.skipFailedRequests) {
      return info;
    }

    const record = this.store[key];
    if (record) {
      record.hits++;
      record.lastRequest = Date.now();
    }

    return this.check(key);
  }

  /**
   * Reset rate limit for a key
   */
  public reset(key: string): void {
    delete this.store[key];
  }

  /**
   * Reset all rate limits
   */
  public resetAll(): void {
    this.store = {};
  }

  /**
   * Get all rate limit records
   */
  public getAll(): Record<string, RateLimitInfo> {
    const result: Record<string, RateLimitInfo> = {};
    
    for (const key of Object.keys(this.store)) {
      result[key] = this.check(key);
    }
    
    return result;
  }

  /**
   * Get keys that are currently rate limited
   */
  public getLimitedKeys(): string[] {
    return Object.keys(this.store).filter(key => {
      const info = this.check(key);
      return info.isRateLimited;
    });
  }

  /**
   * Middleware for Express/Fastify-style handlers
   */
  public middleware() {
    return (req: any, res: any, next: any) => {
      const key = this.getKey(req);
      const info = this.increment(key);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', info.limit);
      res.setHeader('X-RateLimit-Remaining', info.remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(info.resetTime / 1000));

      if (info.isRateLimited) {
        res.statusCode = this.options.statusCode!;
        res.setHeader('Retry-After', Math.ceil((info.resetTime - Date.now()) / 1000));
        res.end(this.options.message);
        return;
      }

      next();
    };
  }

  /**
   * Extract key from request
   */
  private getKey(req: any): string {
    // Try to get IP address
    const ip = req.ip || 
               req.connection?.remoteAddress || 
               req.socket?.remoteAddress ||
               req.headers?.['x-forwarded-for'] ||
               'unknown';
    
    // Use API key if available
    const apiKey = req.headers?.['x-api-key'] || req.headers?.['authorization'];
    
    return apiKey ? `api:${apiKey}` : `ip:${ip}`;
  }

  /**
   * Create new rate limit record
   */
  private createNewRecord(key: string, now: number): RateLimitInfo {
    this.store[key] = {
      hits: 1,
      startTime: now,
      lastRequest: now,
    };

    return {
      limit: this.options.maxRequests,
      remaining: this.options.maxRequests - 1,
      resetTime: now + this.options.windowMs,
      totalHits: 1,
      isRateLimited: false,
    };
  }

  /**
   * Reset existing rate limit record
   */
  private resetRecord(key: string, now: number): RateLimitInfo {
    this.store[key] = {
      hits: 1,
      startTime: now,
      lastRequest: now,
    };

    return {
      limit: this.options.maxRequests,
      remaining: this.options.maxRequests - 1,
      resetTime: now + this.options.windowMs,
      totalHits: 1,
      isRateLimited: false,
    };
  }

  /**
   * Start automatic cleanup of old records
   */
  private startCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.options.windowMs);
  }

  /**
   * Clean up expired records
   */
  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.options.windowMs;
    
    for (const [key, record] of Object.entries(this.store)) {
      if (record.startTime < windowStart) {
        delete this.store[key];
      }
    }
  }

  /**
   * Stop automatic cleanup
   */
  public stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

/**
 * Global rate limiter instances
 */
export const apiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  message: 'API rate limit exceeded. Please try again later.',
});

export const authRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  message: 'Too many authentication attempts. Please try again later.',
  skipSuccessfulRequests: true,
});

export const uploadRateLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10,
  message: 'Upload limit exceeded. Please try again later.',
});

/**
 * Create a custom rate limiter
 */
export function createRateLimiter(options: Partial<RateLimitOptions>): RateLimiter {
  return new RateLimiter(options);
}
