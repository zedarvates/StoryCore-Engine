/**
 * Error Logging System
 * 
 * Enhanced error logging with file rotation, project-specific logs,
 * and comprehensive error tracking for wizard operations.
 * 
 * Requirements: 13.7
 */

import { WizardError } from './types';
import { getLogger, type WizardLogger } from './logger';
import { joinPath } from './pathUtils';

/**
 * Error log entry with enhanced metadata
 */
export interface ErrorLogEntry {
  timestamp: string;
  errorId: string;
  category: string;
  message: string;
  stack?: string;
  details?: Record<string, unknown>;
  recoverable: boolean;
  retryable: boolean;
  userMessage: string;
  context?: {
    projectPath?: string;
    wizardType?: string;
    operation?: string;
    userId?: string;
  };
}

/**
 * Log rotation configuration
 */
export interface LogRotationConfig {
  maxLogSizeBytes: number;
  maxLogFiles: number;
  rotateOnStartup: boolean;
}

/**
 * Error logger configuration
 */
export interface ErrorLoggerConfig {
  projectPath?: string;
  logDirectory: string;
  logFilePrefix: string;
  rotation: LogRotationConfig;
  includeStackTrace: boolean;
  includeSensitiveData: boolean;
}

/**
 * Default error logger configuration
 */
const DEFAULT_CONFIG: ErrorLoggerConfig = {
  logDirectory: 'logs',
  logFilePrefix: 'editor',
  rotation: {
    maxLogSizeBytes: 10 * 1024 * 1024, // 10 MB
    maxLogFiles: 5,
    rotateOnStartup: false,
  },
  includeStackTrace: true,
  includeSensitiveData: false,
};

/**
 * Error Logger Class
 * Manages error logging with file rotation and project-specific organization
 * 
 * Requirements: 13.7
 */
export class ErrorLogger {
  private config: ErrorLoggerConfig;
  private logger: WizardLogger;
  private errorLogs: ErrorLogEntry[] = [];
  private currentLogFile: string;

  constructor(config?: Partial<ErrorLoggerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = getLogger();
    this.currentLogFile = this.generateLogFilename();

    if (this.config.rotation.rotateOnStartup) {
      this.rotateLogsIfNeeded();
    }
  }

  /**
   * Log a wizard error with full context
   * 
   * @param error - WizardError instance
   * @param context - Additional context information
   * 
   * Requirements: 13.7
   */
  logError(
    error: WizardError,
    context?: {
      projectPath?: string;
      wizardType?: string;
      operation?: string;
      userId?: string;
    }
  ): void {
    const errorId = this.generateErrorId();
    const timestamp = new Date().toISOString();

    const entry: ErrorLogEntry = {
      timestamp,
      errorId,
      category: error.category,
      message: error.message,
      stack: this.config.includeStackTrace ? error.stack : undefined,
      details: this.sanitizeDetails(error.details),
      recoverable: error.recoverable,
      retryable: error.retryable,
      userMessage: error.getUserMessage(),
      context: context || {},
    };

    // Add to in-memory log
    this.errorLogs.unshift(entry);

    // Log to wizard logger
    this.logger.logWizardError(error, context);

    // Persist to file
    this.persistErrorLog(entry);

    // Check if rotation is needed
    this.rotateLogsIfNeeded();
  }

  /**
   * Log error to project-specific log file
   * Format: projects/{project_name}/logs/editor_{date}.log
   * 
   * @param entry - Error log entry
   * 
   * Requirements: 13.7
   */
  private persistErrorLog(entry: ErrorLogEntry): void {
    try {
      const logPath = this.getLogFilePath();
      const logLine = this.formatLogEntry(entry);

      // In browser environment, use localStorage with project-specific key
      const storageKey = this.getStorageKey();
      const existingLogs = this.getStoredErrorLogs(storageKey);

      existingLogs.unshift(entry);

      // Keep only recent errors (last 100 per project)
      const trimmedLogs = existingLogs.slice(0, 100);

      localStorage.setItem(storageKey, JSON.stringify(trimmedLogs));

      this.logger.debug('error-logger', 'Error logged to storage', {
        errorId: entry.errorId,
        logPath,
        storageKey,
      });
    } catch (error) {
      this.logger.warn('error-logger', 'Failed to persist error log', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get log file path for current project
   * 
   * @returns Log file path
   */
  private getLogFilePath(): string {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const filename = `${this.config.logFilePrefix}_${date}.log`;

    if (this.config.projectPath) {
      return joinPath(this.config.projectPath, this.config.logDirectory, filename);
    }

    return joinPath(this.config.logDirectory, filename);
  }

  /**
   * Get storage key for current project
   * 
   * @returns Storage key
   */
  private getStorageKey(): string {
    const date = new Date().toISOString().split('T')[0];
    const projectKey = this.config.projectPath
      ? this.config.projectPath.replace(/[^a-zA-Z0-9]/g, '_')
      : 'default';

    return `error_logs_${projectKey}_${date}`;
  }

  /**
   * Get stored error logs from localStorage
   * 
   * @param storageKey - Storage key
   * @returns Array of error log entries
   */
  private getStoredErrorLogs(storageKey: string): ErrorLogEntry[] {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Format error log entry for file output
   * 
   * @param entry - Error log entry
   * @returns Formatted log line
   */
  private formatLogEntry(entry: ErrorLogEntry): string {
    const parts = [
      `[${entry.timestamp}]`,
      `[${entry.errorId}]`,
      `[${entry.category.toUpperCase()}]`,
      entry.message,
    ];

    if (entry.context?.operation) {
      parts.push(`Operation: ${entry.context.operation}`);
    }

    if (entry.context?.wizardType) {
      parts.push(`Wizard: ${entry.context.wizardType}`);
    }

    if (entry.details) {
      parts.push(`Details: ${JSON.stringify(entry.details)}`);
    }

    if (entry.stack) {
      parts.push(`\nStack: ${entry.stack}`);
    }

    return parts.join(' ') + '\n';
  }

  /**
   * Generate unique error ID
   * 
   * @returns Error ID
   */
  private generateErrorId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `ERR_${timestamp}_${random}`;
  }

  /**
   * Generate log filename with date
   * 
   * @returns Log filename
   */
  private generateLogFilename(): string {
    const date = new Date().toISOString().split('T')[0];
    return `${this.config.logFilePrefix}_${date}.log`;
  }

  /**
   * Sanitize error details to remove sensitive data
   * 
   * @param details - Raw error details
   * @returns Sanitized details
   */
  private sanitizeDetails(details?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!details) {
      return undefined;
    }

    if (this.config.includeSensitiveData) {
      return details;
    }

    const sanitized: Record<string, unknown> = {};
    const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'credential'];

    for (const [key, value] of Object.entries(details)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveKeys.some((sk) => lowerKey.includes(sk));

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeDetails(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Rotate logs if size limit is exceeded
   * 
   * Requirements: 13.7
   */
  private rotateLogsIfNeeded(): void {
    try {
      const storageKey = this.getStorageKey();
      const logs = this.getStoredErrorLogs(storageKey);

      // Calculate approximate size (rough estimate)
      const approximateSize = JSON.stringify(logs).length;

      if (approximateSize > this.config.rotation.maxLogSizeBytes) {
        this.logger.info('error-logger', 'Rotating logs due to size limit', {
          approximateSize,
          maxSize: this.config.rotation.maxLogSizeBytes,
        });

        // Keep only the most recent logs (half of max)
        const trimmedLogs = logs.slice(0, Math.floor(logs.length / 2));
        localStorage.setItem(storageKey, JSON.stringify(trimmedLogs));

        // Archive old logs
        this.archiveOldLogs(logs.slice(Math.floor(logs.length / 2)));
      }
    } catch (error) {
      this.logger.warn('error-logger', 'Failed to rotate logs', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Archive old logs to separate storage
   * 
   * @param logs - Logs to archive
   */
  private archiveOldLogs(logs: ErrorLogEntry[]): void {
    try {
      const archiveKey = `${this.getStorageKey()}_archive_${Date.now()}`;
      localStorage.setItem(archiveKey, JSON.stringify(logs));

      this.logger.info('error-logger', 'Logs archived', {
        archiveKey,
        logCount: logs.length,
      });

      // Clean up old archives (keep only last N)
      this.cleanupOldArchives();
    } catch (error) {
      this.logger.warn('error-logger', 'Failed to archive logs', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Clean up old archived logs
   */
  private cleanupOldArchives(): void {
    try {
      const archiveKeys: string[] = [];

      // Find all archive keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('_archive_')) {
          archiveKeys.push(key);
        }
      }

      // Sort by timestamp (newest first)
      archiveKeys.sort((a, b) => {
        const timestampA = parseInt(a.split('_archive_')[1] || '0');
        const timestampB = parseInt(b.split('_archive_')[1] || '0');
        return timestampB - timestampA;
      });

      // Remove old archives beyond max count
      const toRemove = archiveKeys.slice(this.config.rotation.maxLogFiles);
      toRemove.forEach((key) => {
        localStorage.removeItem(key);
        this.logger.debug('error-logger', 'Removed old archive', { key });
      });

      if (toRemove.length > 0) {
        this.logger.info('error-logger', 'Cleaned up old archives', {
          removedCount: toRemove.length,
        });
      }
    } catch (error) {
      this.logger.warn('error-logger', 'Failed to cleanup old archives', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get all error logs with optional filtering
   * 
   * @param filter - Optional filter criteria
   * @returns Array of error log entries
   */
  getErrorLogs(filter?: {
    category?: string;
    startTime?: Date;
    endTime?: Date;
    recoverable?: boolean;
    retryable?: boolean;
  }): ErrorLogEntry[] {
    let filtered = [...this.errorLogs];

    if (filter) {
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

      if (filter.recoverable !== undefined) {
        filtered = filtered.filter((log) => log.recoverable === filter.recoverable);
      }

      if (filter.retryable !== undefined) {
        filtered = filtered.filter((log) => log.retryable === filter.retryable);
      }
    }

    return filtered;
  }

  /**
   * Get error log by ID
   * 
   * @param errorId - Error ID
   * @returns Error log entry or undefined
   */
  getErrorById(errorId: string): ErrorLogEntry | undefined {
    return this.errorLogs.find((log) => log.errorId === errorId);
  }

  /**
   * Get error statistics
   * 
   * @returns Error statistics
   */
  getStatistics(): {
    total: number;
    byCategory: Record<string, number>;
    recoverable: number;
    retryable: number;
  } {
    const stats = {
      total: this.errorLogs.length,
      byCategory: {} as Record<string, number>,
      recoverable: 0,
      retryable: 0,
    };

    this.errorLogs.forEach((log) => {
      stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;
      if (log.recoverable) stats.recoverable++;
      if (log.retryable) stats.retryable++;
    });

    return stats;
  }

  /**
   * Export error logs as JSON
   * 
   * @param filter - Optional filter criteria
   * @returns JSON string of error logs
   */
  exportLogs(filter?: Parameters<typeof this.getErrorLogs>[0]): string {
    const logs = this.getErrorLogs(filter);
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Download error logs as file
   * 
   * @param filter - Optional filter criteria
   */
  downloadLogs(filter?: Parameters<typeof this.getErrorLogs>[0]): void {
    const logs = this.exportLogs(filter);
    const blob = new Blob([logs], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const filename = this.generateLogFilename().replace('.log', '_errors.json');
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
  }

  /**
   * Clear error logs from memory
   */
  clearLogs(): void {
    this.errorLogs = [];
  }

  /**
   * Update configuration
   * 
   * @param config - Partial configuration update
   */
  updateConfig(config: Partial<ErrorLoggerConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('error-logger', 'Configuration updated', this.config);
  }

  /**
   * Get current configuration
   * 
   * @returns Current configuration
   */
  getConfig(): ErrorLoggerConfig {
    return { ...this.config };
  }
}

/**
 * Singleton error logger instance
 */
let errorLoggerInstance: ErrorLogger | null = null;

/**
 * Get the singleton error logger instance
 */
export function getErrorLogger(): ErrorLogger {
  if (!errorLoggerInstance) {
    errorLoggerInstance = new ErrorLogger();
  }
  return errorLoggerInstance;
}

/**
 * Create a new error logger instance
 */
export function createErrorLogger(config?: Partial<ErrorLoggerConfig>): ErrorLogger {
  return new ErrorLogger(config);
}

/**
 * Set the singleton error logger instance
 */
export function setErrorLogger(logger: ErrorLogger): void {
  errorLoggerInstance = logger;
}

/**
 * Log a wizard error using singleton logger
 * 
 * @param error - WizardError instance
 * @param context - Additional context
 * 
 * Requirements: 13.7
 */
export function logWizardError(
  error: WizardError,
  context?: Parameters<ErrorLogger['logError']>[1]
): void {
  const logger = getErrorLogger();
  logger.logError(error, context);
}

