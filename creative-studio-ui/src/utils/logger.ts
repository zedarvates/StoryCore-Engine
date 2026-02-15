/**
 * Production-safe logging utility for the frontend.
 * 
 * - debug/info logs are only shown in development mode
 * - warn/error logs are always shown (important for debugging in production)
 * 
 * Usage:
 * ```typescript
 * import { logger } from '@/utils/logger';
 * 
 * logger.debug('Processing data:', data);
 * logger.info('User logged in:', userId);
 * logger.warn('Deprecated API used');
 * logger.error('Failed to fetch:', error);
 * ```
 */

const isDevelopment = import.meta.env.DEV;

export const logger = {
  /**
   * Debug-level logging - only shown in development
   * Use for detailed debugging information
   */
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Info-level logging - only shown in development
   * Use for general informational messages
   */
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info('[INFO]', ...args);
    }
  },

  /**
   * Warning-level logging - always shown
   * Use for potentially problematic situations
   */
  warn: (...args: unknown[]) => {
    console.warn('[WARN]', ...args);
  },

  /**
   * Error-level logging - always shown
   * Use for error conditions and exceptions
   */
  error: (...args: unknown[]) => {
    console.error('[ERROR]', ...args);
  },

  /**
   * Log group start - only in development
   * Useful for grouping related log messages
   */
  group: (label: string) => {
    if (isDevelopment) {
      console.group(label);
    }
  },

  /**
   * Log group end - only in development
   */
  groupEnd: () => {
    if (isDevelopment) {
      console.groupEnd();
    }
  },

  /**
   * Time tracking start - only in development
   * Use for performance measurements
   */
  time: (label: string) => {
    if (isDevelopment) {
      console.time(label);
    }
  },

  /**
   * Time tracking end - only in development
   */
  timeEnd: (label: string) => {
    if (isDevelopment) {
      console.timeEnd(label);
    }
  },
};

export default logger;
