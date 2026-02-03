/**
 * Logging Utility
 * 
 * Replaces console.log/warn/error with environment-aware logging.
 * Only logs in development mode, silent in production.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMessage {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: Date;
}

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development' || 
                     process.env.NODE_ENV === undefined;

// Buffer for log storage (could be used for log viewer)
const logBuffer: LogMessage[] = [];
const MAX_LOG_BUFFER = 100;

/**
 * Add log to buffer (for potential log viewer UI)
 */
const addToBuffer = (log: LogMessage) => {
  logBuffer.unshift(log);
  if (logBuffer.length > MAX_LOG_BUFFER) {
    logBuffer.pop();
  }
};

/**
 * Core logging function with environment check
 */
const log = (level: LogLevel, message: string, context?: Record<string, unknown>) => {
  // Only log in development mode
  if (!isDevelopment) {
    return;
  }

  const logEntry: LogMessage = {
    level,
    message,
    context,
    timestamp: new Date(),
  };

  addToBuffer(logEntry);

  // Console output with formatting
  const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  switch (level) {
    case 'debug':
      console.debug(`${prefix} ${message}`, context || '');
      break;
    case 'info':
      console.info(`${prefix} ${message}`, context || '');
      break;
    case 'warn':
      console.warn(`${prefix} ${message}`, context || '');
      break;
    case 'error':
      console.error(`${prefix} ${message}`, context || '');
      break;
  }
};

// Public API
export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => 
    log('debug', message, context),
  
  info: (message: string, context?: Record<string, unknown>) => 
    log('info', message, context),
  
  warn: (message: string, context?: Record<string, unknown>) => 
    log('warn', message, context),
  
  error: (message: string, error?: unknown, context?: Record<string, unknown>) => {
    const errorContext = error 
      ? { ...context, error: error instanceof Error ? error.message : String(error) }
      : context;
    log('error', message, errorContext);
  },

  // Get buffered logs (for debugging UI)
  getBuffer: () => logBuffer,
  
  // Clear log buffer
  clearBuffer: () => {
    logBuffer.length = 0;
  },
  
  // Check if in development mode
  isDev: () => isDevelopment,
};

export default logger;

