/**
 * Rate Limiting Service
 * 
 * Requirements: 104
 * Security Level: 🟡 HAUTE
 * 
 * Implements rate limiting for API endpoints to prevent:
 * - Brute force attacks
 * - DDoS attempts
 * - Resource exhaustion
 * - API abuse
 */

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: any) => string; // Custom key generator
  handler?: (req: any, res: any) => void; // Custom handler
  skip?: (req: any) => boolean; // Skip rate limiting
  onLimitReached?: (req: any, res: any) => void; // Callback when limit reached
}

export interface RateLimitStore {
  increment(key: string): Promise<{ totalHits: number; resetTime: number }>;
  decrement(key: string): Promise<void>;
  resetKey(key: string): Promise<void>;
  resetAll(): Promise<void>;
  get(key: string): Promise<{ totalHits: number; resetTime: number } | null>;
}

export class MemoryRateLimitStore implements RateLimitStore {
  private cache: Map<string, { hits: number; resetTime: number }>;

  constructor() {
    this.cache = new Map();
    this.startCleanup();
  }

  async increment(key: string): Promise<{ totalHits: number; resetTime: number }> {
    const now = Date.now();
    const record = this.cache.get(key);

    if (!record || now > record.resetTime) {
      const resetTime = now + 24 * 60 * 60 * 1000; // 24 hours
      this.cache.set(key, { hits: 1, resetTime });
      return { totalHits: 1, resetTime };
    }

    record.hits++;
    this.cache.set(key, record);
    return { totalHits: record.hits, resetTime: record.resetTime };
  }

  async decrement(key: string): Promise<void> {
    const record = this.cache.get(key);
    if (record && record.hits > 0) {
      record.hits--;
      this.cache.set(key, record);
    }
  }

  async resetKey(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async resetAll(): Promise<void> {
    this.cache.clear();
  }

  async get(key: string): Promise<{ totalHits: number; resetTime: number } | null> {
    const record = this.cache.get(key);
    if (!record) return null;
    return { totalHits: record.hits, resetTime: record.resetTime };
  }

  private startCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.cache.entries()) {
        if (now > record.resetTime) {
          this.cache.delete(key);
        }
      }
    }, 60 * 1000); // Cleanup every minute
  }
}

export class RateLimiter {
  private store: RateLimitStore;
  private defaultConfig: RateLimitConfig;
  private limits: Map<string, RateLimitConfig>;

  constructor(store?: RateLimitStore, defaultConfig?: RateLimitConfig) {
    this.store = store || new MemoryRateLimitStore();
    this.defaultConfig = defaultConfig || {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100, // 100 requests per window
    };
    this.limits = new Map();
  }

  /**
   * Create a rate limiter for a specific endpoint
   */
  create(config: RateLimitConfig): (req: any, res: any, next: any) => Promise<void> {
    return async (req: any, res: any, next: any) => {
      try {
        const key = this.generateKey(req, config);
        
        // Skip if configured
        if (config.skip && config.skip(req)) {
          return next();
        }

        const result = await this.store.increment(key);

        // Set rate limit headers
        this.setHeaders(res, result, config);

        // Check if limit exceeded
        if (result.totalHits > config.maxRequests) {
          if (config.onLimitReached) {
            config.onLimitReached(req, res);
          }

          return res.status(429).json({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
          });
        }

        next();
      } catch (error) {
        console.error('Rate limiter error:', error);
        next(); // Fail open - allow request if rate limiter fails
      }
    };
  }

  /**
   * Generate unique key for request
   */
  private generateKey(req: any, config: RateLimitConfig): string {
    if (config.keyGenerator) {
      return config.keyGenerator(req);
    }

    // Default: IP address + endpoint
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const endpoint = req.originalUrl || req.url || 'unknown';
    const method = req.method || 'GET';

    return `${ip}:${method}:${endpoint}`;
  }

  /**
   * Set rate limit headers
   */
  private setHeaders(res: any, result: { totalHits: number; resetTime: number }, config: RateLimitConfig): void {
    res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - result.totalHits).toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString());
    res.setHeader('Retry-After', Math.ceil((result.resetTime - Date.now()) / 1000).toString());
  }

  /**
   * Get rate limit info for a key
   */
  async getRateLimit(key: string): Promise<{ totalHits: number; resetTime: number } | null> {
    return this.store.get(key);
  }

  /**
   * Reset rate limit for a key
   */
  async resetRateLimit(key: string): Promise<void> {
    await this.store.resetKey(key);
  }
}

// Predefined rate limit configurations
export const RATE_LIMITS = {
  // Strict limits for authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts
  },

  // Moderate limits for API endpoints
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
  },

  // Generous limits for general endpoints
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 requests per 15 minutes
  },

  // Very strict for LLM endpoints (expensive)
  llm: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10, // 10 requests per hour
  },

  // Strict for file uploads
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5, // 5 uploads per hour
  },
} as const;

// Default rate limiter instance
export const rateLimiter = new RateLimiter();
