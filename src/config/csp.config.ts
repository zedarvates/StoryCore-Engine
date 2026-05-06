/**
 * Content Security Policy Configuration
 * 
 * Requirements: 107
 * Security Level: 🟡 HAUTE
 * 
 * Comprehensive CSP configuration to prevent XSS attacks
 */

interface CSPDirectives {
  'default-src': string[];
  'script-src': string[];
  'style-src': string[];
  'img-src': string[];
  'font-src': string[];
  'connect-src': string[];
  'frame-src': string[];
  'object-src': string[];
  'base-uri': string[];
  'form-action': string[];
  'frame-ancestors': string[];
  'upgrade-insecure-requests': string[];
  'block-all-mixed-content': string[];
}

export interface CSPOptions {
  isProduction: boolean;
  allowedApiEndpoints?: string[];
  allowedCdnUrls?: string[];
  allowedWebSocketUrls?: string[];
  nonce?: string;
  reportUri?: string;
}

export class CSPConfig {
  private options: CSPOptions;
  private directives: CSPDirectives;

  constructor(options: CSPOptions) {
    this.options = options;
    this.directives = this.buildDirectives();
  }

  private buildDirectives(): CSPDirectives {
    const isProd = this.options.isProduction;
    
    return {
      'default-src': ["'self'"],
      'script-src': this.buildScriptSrc(isProd),
      'style-src': this.buildStyleSrc(isProd),
      'img-src': this.buildImgSrc(isProd),
      'font-src': this.buildFontSrc(isProd),
      'connect-src': this.buildConnectSrc(isProd),
      'frame-src': this.buildFrameSrc(isProd),
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      'upgrade-insecure-requests': isProd ? [] : [],
      'block-all-mixed-content': isProd ? [] : [],
    };
  }

  private buildScriptSrc(isProd: boolean): string[] {
    const base = ["'self'"];
    
    if (!isProd) {
      base.push("'unsafe-inline'", "'unsafe-eval'");
    }
    
    // Add trusted CDN sources
    base.push('https://cdn.jsdelivr.net', 'https://unpkg.com');
    
    // Add nonce if provided
    if (this.options.nonce) {
      base.push(`'nonce-${this.options.nonce}'`);
    }
    
    // Add strict dynamic for modern CSP
    if (isProd) {
      base.push("'strict-dynamic'");
    }
    
    return base;
  }

  private buildStyleSrc(isProd: boolean): string[] {
    const base = ["'self'"];
    
    if (!isProd) {
      base.push("'unsafe-inline'");
    }
    
    // Allow fonts from common CDNs
    base.push('https://fonts.googleapis.com');
    
    return base;
  }

  private buildImgSrc(isProd: boolean): string[] {
    const base = ["'self'", 'data:', 'blob:'];
    
    // Allow images from common sources
    base.push('https:', 'http:');
    
    // Add specific CDN URLs
    if (this.options.allowedCdnUrls) {
      base.push(...this.options.allowedCdnUrls);
    }
    
    return base;
  }

  private buildFontSrc(isProd: boolean): string[] {
    return [
      "'self'",
      'data:',
      'https://fonts.gstatic.com',
      'https://cdn.jsdelivr.net',
    ];
  }

  private buildConnectSrc(isProd: boolean): string[] {
    const base = ["'self'"];
    
    // Add API endpoints
    if (this.options.allowedApiEndpoints) {
      base.push(...this.options.allowedApiEndpoints);
    }
    
    // Add WebSocket URLs
    if (this.options.allowedWebSocketUrls) {
      base.push(...this.options.allowedWebSocketUrls);
    }
    
    // Add common API services
    if (!isProd) {
      base.push('http://localhost:*', 'ws://localhost:*');
    }
    
    // Add LLM API endpoints
    base.push('https://api.openai.com', 'https://api.anthropic.com');
    
    return base;
  }

  private buildFrameSrc(isProd: boolean): string[] {
    const base: string[] = [];
    
    if (!isProd) {
      base.push('http://localhost:*');
    }
    
    return base;
  }

  /**
   * Generate CSP header string
   */
  public getHeaderString(): string {
    const parts: string[] = [];
    
    for (const [key, values] of Object.entries(this.directives)) {
      if (values.length > 0) {
        parts.push(`${key} ${values.join(' ')}`);
      }
    }
    
    return parts.join('; ');
  }

  /**
   * Get CSP headers for Fastify response
   */
  public getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Security-Policy': this.getHeaderString(),
    };
    
    // Add report URI if configured
    if (this.options.reportUri) {
      headers['Content-Security-Policy-Report-Only'] = 
        `${this.getHeaderString()}; report-uri ${this.options.reportUri}`;
    }
    
    return headers;
  }

  /**
   * Validate CSP configuration
   */
  public validate(): boolean {
    try {
      const header = this.getHeaderString();
      
      // Basic validation
      if (!header.includes("'self'")) {
        console.warn('CSP warning: default-src does not include self');
      }
      
      if (this.options.isProduction) {
        if (header.includes("'unsafe-inline'")) {
          console.warn('CSP warning: unsafe-inline present in production');
        }
        if (header.includes("'unsafe-eval'")) {
          console.warn('CSP warning: unsafe-eval present in production');
        }
      }
      
      return true;
    } catch (error) {
      console.error('CSP validation failed:', error);
      return false;
    }
  }

  /**
   * Update CSP options dynamically
   */
  public updateOptions(newOptions: Partial<CSPOptions>): void {
    this.options = { ...this.options, ...newOptions };
    this.directives = this.buildDirectives();
  }
}

/**
 * Factory function to create CSP config
 */
export function createCSPConfig(options: Partial<CSPOptions> = {}): CSPConfig {
  const config: CSPOptions = {
    isProduction: process.env.NODE_ENV === 'production',
    allowedApiEndpoints: [
      'https://api.storycore.engine',
      'https://api.openai.com',
      'https://api.anthropic.com',
    ],
    allowedCdnUrls: [
      'https://cdn.jsdelivr.net',
      'https://unpkg.com',
      'https://fonts.gstatic.com',
    ],
    ...options,
  };
  
  return new CSPConfig(config);
}

/**
 * Default CSP configuration for production
 */
export const defaultCSPConfig = createCSPConfig({
  isProduction: true,
});

/**
 * Development CSP configuration
 */
export const developmentCSPConfig = createCSPConfig({
  isProduction: false,
});
