/**
 * Wizard Logging Service
 * 
 * Provides structured logging for wizard operations with file persistence
 * and filtering capabilities.
 * 
 * Requirements: 13.7
 */

import type { LogEntry, LogFilter } from './types';
import { WizardError } from './types';
import { generateUniqueFilename } from './pathUtils';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Logger configuration
 */
export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  maxLogSize: number; // Maximum number of log entries in memory
  logDirectory?: string;
}

const DEFAULT_CONFIG: LoggerConfig = {
  level: 'info',
  enableConsole: true,
  enableFile: true,
  maxLogSize: 1000,
};

/**
 * Wizard Logger Service
 */
export class WizardLogger {
  private config: LoggerConfig;
  private logs: LogEntry[] = [];
  private logLevels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Log a debug message
   */
  debug(category: string, message: string, details?: Record<string, unknown>): void {
    this.log('debug', category, message, details);
  }

  /**
   * Log an info message
   */
  info(category: string, message: string, details?: Record<string, unknown>): void {
    this.log('info', category, message, details);
  }

  /**
   * Log a warning message
   */
  warn(category: string, message: string, details?: Record<string, unknown>): void {
    this.log('warn', category, message, details);
  }

  /**
   * Log an error message
   */
  error(
    category: string,
    message: string,
    error?: Error | WizardError,
    details?: Record<string, unknown>
  ): void {
    this.log('error', category, message, { ...details, error });
  }

  /**
   * Log a wizard error
   */
  logWizardError(error: WizardError, context?: Record<string, unknown>): void {
    this.error(
      error.category,
      error.message,
      error,
      {
        ...context,
        recoverable: error.recoverable,
        retryable: error.retryable,
        details: error.details,
      }
    );
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    category: string,
    message: string,
    details?: Record<string, unknown>
  ): void {
    // Check if this log level should be recorded
    if (this.logLevels[level] < this.logLevels[this.config.level]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      details,
      error: details?.error,
    };

    // Add to in-memory log
    this.logs.unshift(entry);

    // Trim log if too large
    if (this.logs.length > this.config.maxLogSize) {
      this.logs = this.logs.slice(0, this.config.maxLogSize);
    }

    // Console output
    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    // File output (in browser, we'll use localStorage as a fallback)
    if (this.config.enableFile) {
      this.persistLog(entry);
    }
  }

  /**
   * Log to console with appropriate formatting
   */
  private logToConsole(entry: LogEntry): void {
    // Suppress connection errors for optional services (Ollama/ComfyUI)
    // These are expected when services aren't installed/running
    if (entry.level === 'error' && entry.category === 'connection') {
      // Only show connection errors in debug mode
      if (this.config.level !== 'debug') {
        return;
      }
    }

    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.category}]`;
    const message = `${prefix} ${entry.message}`;

    switch (entry.level) {
      case 'debug':
        console.debug(message, entry.details);
        break;
      case 'info':
        console.info(message, entry.details);
        break;
      case 'warn':
        console.warn(message, entry.details);
        break;
      case 'error':
        console.error(message, entry.details, entry.error);
        break;
    }
  }

  /**
   * Persist log entry to storage
   * In browser environment, uses localStorage
   * In Node environment, would write to file
   */
  private persistLog(entry: LogEntry): void {
    try {
      // Get existing logs from storage
      const storageKey = 'wizard_logs';
      const existingLogs = this.getStoredLogs();

      // Add new entry
      existingLogs.unshift(entry);

      // Keep only recent logs (last 500)
      const trimmedLogs = existingLogs.slice(0, 500);

      // Save back to storage
      localStorage.setItem(storageKey, JSON.stringify(trimmedLogs));
    } catch (error) {
      // Silently fail if storage is not available
      console.warn('Failed to persist log entry:', error);
    }
  }

  /**
   * Get logs from storage
   */
  private getStoredLogs(): LogEntry[] {
    try {
      const storageKey = 'wizard_logs';
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Get all logs with optional filtering
   */
  getLogs(filter?: LogFilter): LogEntry[] {
    let filtered = [...this.logs];

    if (filter) {
      if (filter.level) {
        const minLevel = this.logLevels[filter.level];
        filtered = filtered.filter(
          (log) => this.logLevels[log.level] >= minLevel
        );
      }

      if (filter.category) {
        filtered = filtered.filter((log) => log.category === filter.category);
      }

      if (filter.startTime) {
        filtered = filtered.filter(
          (log) => new Date(log.timestamp) >= filter.startTime!
        );
      }

      if (filter.endTime) {
        filtered = filtered.filter(
          (log) => new Date(log.timestamp) <= filter.endTime!
        );
      }
    }

    return filtered;
  }

  /**
   * Get logs by category
   */
  getLogsByCategory(category: string): LogEntry[] {
    return this.logs.filter((log) => log.category === category);
  }

  /**
   * Get error logs only
   */
  getErrorLogs(): LogEntry[] {
    return this.logs.filter((log) => log.level === 'error');
  }

  /**
   * Clear all logs from memory
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Clear logs from storage
   */
  clearStoredLogs(): void {
    try {
      localStorage.removeItem('wizard_logs');
    } catch (error) {
      console.warn('Failed to clear stored logs:', error);
    }
  }

  /**
   * Export logs as JSON string
   */
  exportLogs(filter?: LogFilter): string {
    const logs = this.getLogs(filter);
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Export logs to file (browser download)
   */
  downloadLogs(filter?: LogFilter): void {
    const logs = this.exportLogs(filter);
    const blob = new Blob([logs], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const filename = generateUniqueFilename('wizard_logs', 'json');
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    
    URL.revokeObjectURL(url);
  }

  /**
   * Get log statistics
   */
  getStatistics(): {
    total: number;
    byLevel: Record<LogLevel, number>;
    byCategory: Record<string, number>;
  } {
    const stats = {
      total: this.logs.length,
      byLevel: {
        debug: 0,
        info: 0,
        warn: 0,
        error: 0,
      } as Record<LogLevel, number>,
      byCategory: {} as Record<string, number>,
    };

    this.logs.forEach((log) => {
      stats.byLevel[log.level]++;
      stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;
    });

    return stats;
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Get current log level
   */
  getLevel(): LogLevel {
    return this.config.level;
  }

  /**
   * Enable/disable console logging
   */
  setConsoleLogging(enabled: boolean): void {
    this.config.enableConsole = enabled;
  }

  /**
   * Enable/disable file logging
   */
  setFileLogging(enabled: boolean): void {
    this.config.enableFile = enabled;
  }
}

/**
 * Singleton logger instance
 */
let loggerInstance: WizardLogger | null = null;

/**
 * Get the singleton logger instance
 */
export function getLogger(): WizardLogger {
  if (!loggerInstance) {
    loggerInstance = new WizardLogger();
  }
  return loggerInstance;
}

/**
 * Create a new logger instance with custom configuration
 */
export function createLogger(config?: Partial<LoggerConfig>): WizardLogger {
  return new WizardLogger(config);
}

/**
 * Helper function to log wizard operations
 */
export function logWizardOperation(
  operation: string,
  status: 'started' | 'completed' | 'failed',
  details?: Record<string, unknown>
): void {
  const logger = getLogger();
  const message = `Wizard operation ${operation} ${status}`;

  if (status === 'failed') {
    logger.error('wizard', message, undefined, details);
  } else {
    logger.info('wizard', message, details);
  }
}

