/**
 * CORS Configuration
 * 
 * Requirements: 108
 * Security Level: 🟡 HAUTE
 * 
 * Strict CORS configuration to prevent unauthorized cross-origin requests
 */

import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

interface CorsOptions {
  origin?: string | string[] | RegExp | ((origin: string, callback: (err: Error | null, origin?: string) => void) => void);
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
  preflightContinue?: boolean;
  optionsSuccessStatus?: number;
}

const isProduction = process.env.NODE_ENV === 'production';

// Production CORS configuration
const productionCorsOptions: CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://storycore.engine',
      'https://app.storycore.engine',
      'https://studio.storycore.engine',
    ];
    
    // Allow localhost for development
    if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      callback(null, true);
      return;
    }
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-CSRF-Token',
    'X-HTTP-Method-Override',
  ],
  exposedHeaders: [
    'Content-Length',
    'X-Request-ID',
    'X-Response-Time',
  ],
  credentials: true,
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// Development CORS configuration
const developmentCorsOptions: CorsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-CSRF-Token',
  ],
  exposedHeaders: [
    'Content-Length',
    'X-Request-ID',
  ],
  credentials: true,
  maxAge: 3600, // 1 hour
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// Strict CORS plugin
export const strictCorsPlugin: FastifyPluginAsync = async (fastify) => {
  const corsOptions = isProduction ? productionCorsOptions : developmentCorsOptions;
  
  // Register CORS with strict options
  await fastify.register(import('@fastify/cors'), {
    ...corsOptions,
    // Additional security headers
    preflight: true,
    hideOptionsRoute: false,
  });
  
  // Add security headers middleware
  fastify.addHook('onResponse', async (request, reply) => {
    // Prevent MIME type sniffing
    reply.header('X-Content-Type-Options', 'nosniff');
    
    // Enable XSS protection
    reply.header('X-XSS-Protection', '1; mode=block');
    
    // Prevent clickjacking
    reply.header('X-Frame-Options', 'DENY');
    
    // Strict transport security (only in production)
    if (isProduction) {
      reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    
    // Content Security Policy (basic)
    if (isProduction) {
      reply.header(
        'Content-Security-Policy',
        [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: https:",
          "font-src 'self' data:",
          "connect-src 'self' https://api.openai.com https://api.anthropic.com",
          "frame-ancestors 'none'",
          "form-action 'self'",
          "base-uri 'self'",
        ].join('; ')
      );
    }
    
    // Remove server identification
    reply.removeHeader('Server');
    reply.removeHeader('X-Powered-By');
  });
  
  // Log CORS violations
  fastify.addHook('onError', async (request, reply, error) => {
    if (error.message?.includes('CORS') || error.message?.includes('Not allowed by CORS')) {
      fastify.log.warn({
        msg: 'CORS violation detected',
        origin: request.headers.origin,
        url: request.url,
        method: request.method,
      });
    }
  });
};

// CORS validation middleware
export const validateCorsOrigin = (origin: string | undefined): boolean => {
  if (!origin) return false;
  
  const allowedOrigins = [
    'https://storycore.engine',
    'https://app.storycore.engine',
    'https://studio.storycore.engine',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
  ];
  
  return allowedOrigins.some((allowed) => {
    if (allowed.includes('*')) {
      const regex = new RegExp('^' + allowed.replace(/\*/g, '.*') + '$');
      return regex.test(origin);
    }
    return origin === allowed;
  });
};

// CORS preflight handler
export const handlePreflight = async (request: any, reply: any) => {
  const origin = request.headers.origin;
  
  if (!validateCorsOrigin(origin)) {
    reply.code(403);
    return { error: 'CORS origin not allowed' };
  }
  
  reply.header('Access-Control-Allow-Origin', origin);
  reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  reply.header('Access-Control-Allow-Credentials', 'true');
  reply.header('Access-Control-Max-Age', '86400');
  
  return { message: 'CORS preflight successful' };
};

export type { CorsOptions };
