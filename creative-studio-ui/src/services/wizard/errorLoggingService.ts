/**
 * Error Logging Service
 * 
 * Comprehensive error logging for debugging wizard issues.
 * 
 * Requirements: 8.1, 8.2
 */

import type { AppError } from '../errorHandlingService';

export interface ErrorLogEntry {
  error: AppError;
  userAgent: string;
  url: string;
  timestamp: Date;
  sessionId: string;
  additionalContext?: Record<string, any>;
}

export interface ErrorLogFilter {
  severity?: AppError['severity'][];
  category?: AppError['category'][];
  startDate?: Date;
  endDate?: Date;
  searchTerm?: string;
}

/**
 * Error Logging Service
 */
export class ErrorLoggingService {
  private logs: ErrorLogEntry[] = [];
  private maxLogs: number = 500;
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.loadLogsFromStorage();
  }

  /**
   * Log an error
   */
  logError(error: AppError, additionalContext?: Record<string, any>): void {
    const entry: ErrorLogEntry = {
      error,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date(),
      sessionId: this.sessionId,
      additionalContext,
    };

    this.logs.unshift(entry);

    // Trim logs if too large
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Persist to storage
    this.saveLogsToStorage();

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`[Error Log] ${error.severity.toUpperCase()}`);
      console.error('Error:', error);
      console.groupEnd();
    }
  }

  /**
   * Get all logs
   */
  getLogs(): ErrorLogEntry[] {
    return [...this.logs];
  }

  /**
   * Get filtered logs
   */
  getFilteredLogs(filter: ErrorLogFilter): ErrorLogEntry[] {
    return this.logs.filter((entry) => {
      // Filter by severity
      if (filter.severity && !filter.severity.includes(entry.error.severity)) {
        return false;
      }

      // Filter by category
      if (filter.category && !filter.category.includes(entry.error.category)) {
        return false;
      }

      // Filter by date range
      if (filter.startDate && entry.timestamp < filter.startDate) {
        return false;
      }
      if (filter.endDate && entry.timestamp > filter.endDate) {
        return false;
      }

      // Filter by search term
      if (filter.searchTerm) {
        const searchLower = filter.searchTerm.toLowerCase();
        const matchesMessage = entry.error.message.toLowerCase().includes(searchLower);
        const matchesUserMessage = entry.error.userMessage
          .toLowerCase()
          .includes(searchLower);
        const matchesId = entry.error.id.toLowerCase().includes(searchLower);

        if (!matchesMessage && !matchesUserMessage && !matchesId) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Get logs by session
   */
  getLogsBySession(sessionId: string): ErrorLogEntry[] {
    return this.logs.filter((entry) => entry.sessionId === sessionId);
  }

  /**
   * Get current session logs
   */
  getCurrentSessionLogs(): ErrorLogEntry[] {
    return this.getLogsBySession(this.sessionId);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
    this.saveLogsToStorage();
  }

  /**
   * Clear logs older than specified days
   */
  clearOldLogs(days: number): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    this.logs = this.logs.filter((entry) => entry.timestamp >= cutoffDate);
    this.saveLogsToStorage();
  }

  /**
   * Export logs as JSON
   */
  exportLogs(filter?: ErrorLogFilter): string {
    const logsToExport = filter ? this.getFilteredLogs(filter) : this.logs;

    return JSON.stringify(
      {
        exportDate: new Date().toISOString(),
        sessionId: this.sessionId,
        totalLogs: logsToExport.length,
        logs: logsToExport.map((entry) => ({
          ...entry,
          timestamp: entry.timestamp.toISOString(),
        })),
      },
      null,
      2
    );
  }

  /**
   * Download logs as file
   */
  downloadLogs(filter?: ErrorLogFilter): void {
    const json = this.exportLogs(filter);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `error-logs-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Get error statistics
   */
  getStatistics(): {
    total: number;
    bySeverity: Record<AppError['severity'], number>;
    byCategory: Record<AppError['category'], number>;
    recentErrors: number;
  } {
    const bySeverity: Record<AppError['severity'], number> = {
      info: 0,
      warning: 0,
      error: 0,
      critical: 0,
    };

    const byCategory: Record<AppError['category'], number> = {
      network: 0,
      validation: 0,
      backend: 0,
      timeout: 0,
      unknown: 0,
    };

    // Count errors in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    let recentErrors = 0;

    this.logs.forEach((entry) => {
      bySeverity[entry.error.severity]++;
      byCategory[entry.error.category]++;

      if (entry.timestamp >= oneHourAgo) {
        recentErrors++;
      }
    });

    return {
      total: this.logs.length,
      bySeverity,
      byCategory,
      recentErrors,
    };
  }

  /**
   * Private: Generate session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Private: Save logs to storage
   */
  private saveLogsToStorage(): void {
    try {
      const data = {
        sessionId: this.sessionId,
        logs: this.logs.slice(0, 100).map((entry) => ({
          ...entry,
          timestamp: entry.timestamp.toISOString(),
        })),
      };

      localStorage.setItem('wizard-error-logs', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save error logs to storage:', error);
    }
  }

  /**
   * Private: Load logs from storage
   */
  private loadLogsFromStorage(): void {
    try {
      const stored = localStorage.getItem('wizard-error-logs');
      if (!stored) {
        return;
      }

      const data = JSON.parse(stored);
      
      // Restore logs with Date objects
      this.logs = data.logs.map((entry: any) => ({
        ...entry,
        timestamp: new Date(entry.timestamp),
      }));
    } catch (error) {
      console.error('Failed to load error logs from storage:', error);
      this.logs = [];
    }
  }
}

/**
 * Singleton instance
 */
let errorLoggingServiceInstance: ErrorLoggingService | null = null;

export function getErrorLoggingService(): ErrorLoggingService {
  if (!errorLoggingServiceInstance) {
    errorLoggingServiceInstance = new ErrorLoggingService();
  }
  return errorLoggingServiceInstance;
}
