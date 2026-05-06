/**
 * Content Security Policy Configuration
 * 
 * Requirements: 102
 * Security Level: 🔴 CRITIQUE
 */

export const CSP_CONFIG = {
  // Production CSP
  production: {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'", // Required for some React patterns
      "'unsafe-eval'", // Required for development
      "https://cdn.jsdelivr.net",
      "https://cdnjs.cloudflare.com",
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for Tailwind, Radix UI
      "https://fonts.googleapis.com",
    ],
    'font-src': [
      "'self'",
      "https://fonts.gstatic.com",
    ],
    'img-src': [
      "'self'",
      "data:",
      "blob:",
      "https:",
    ],
    'connect-src': [
      "'self'",
      "https://api.openai.com",
      "https://api.anthropic.com",
      "ws://localhost:*",
      "http://localhost:*",
    ],
    'media-src': [
      "'self'",
      "data:",
      "blob:",
    ],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': [],
  },

  // Development CSP (more permissive)
  development: {
    'default-src': ["'self'", "http://localhost:*"],
    'script-src': [
      "'self'",
      "'unsafe-inline'",
      "'unsafe-eval'",
      "http://localhost:*",
      "ws://localhost:*",
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'",
    ],
    'font-src': [
      "'self'",
      "https://fonts.gstatic.com",
    ],
    'img-src': [
      "'self'",
      "data:",
      "blob:",
      "http://localhost:*",
    ],
    'connect-src': [
      "'self'",
      "http://localhost:*",
      "ws://localhost:*",
    ],
    'media-src': [
      "'self'",
      "data:",
      "blob:",
    ],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  },
} as const;

export type CSPConfig = typeof CSP_CONFIG.production;

/**
 * Generate CSP header string from config
 */
export function generateCSPHeader(config: CSPConfig): string {
  return Object.entries(config)
    .map(([key, values]) => {
      if (values.length === 0) return key;
      return `${key} ${values.join(' ')}`;
    })
    .join('; ');
}

/**
 * Get CSP config based on environment
 */
export function getCSPConfig(): CSPConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  return isProduction ? CSP_CONFIG.production : CSP_CONFIG.development;
}

/**
 * CSP Violation Report Handler
 */
export function handleCSPViolation(event: SecurityPolicyViolationEvent): void {
  console.error('CSP Violation:', {
    blockedURI: event.blockedURI,
    violatedDirective: event.violatedDirective,
    effectiveDirective: event.effectiveDirective,
    originalPolicy: event.originalPolicy,
    sourceFile: event.sourceFile,
    lineNumber: event.lineNumber,
    columnNumber: event.columnNumber,
  });

  // In production, send to logging endpoint
  if (process.env.NODE_ENV === 'production') {
    fetch('/api/security/csp-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cspReport: {
          blockedURI: event.blockedURI,
          violatedDirective: event.violatedDirective,
          documentURI: event.documentURI,
          referrer: event.referrer,
          statusCode: event.statusCode,
        },
        timestamp: new Date().toISOString(),
      }),
    }).catch((error) => {
      console.error('Failed to report CSP violation:', error);
    });
  }
}

/**
 * Initialize CSP monitoring
 */
export function initializeCSP(): void {
  // Add CSP violation listener
  document.addEventListener('securitypolicyviolation', handleCSPViolation);

  // Set CSP meta tag in production
  if (process.env.NODE_ENV === 'production') {
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = generateCSPHeader(CSP_CONFIG.production);
    document.head.appendChild(meta);
  }
}
