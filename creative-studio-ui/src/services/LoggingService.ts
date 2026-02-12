/**
 * LoggingService - Service de logging complet pour StoryCore
 *
 * Fournit un système de logging avancé avec niveaux, catégories,
 * rotation automatique et monitoring des APIs
 */

// ============================================================================
// Types
// ============================================================================

export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  CRITICAL: 4
} as const;

export type LogLevel = typeof LogLevel[keyof typeof LogLevel];

export const LogCategory = {
  PERSISTENCE: 'persistence',
  API: 'api',
  SYNC: 'sync',
  MIGRATION: 'migration',
  UI: 'ui',
  LLM: 'llm',
  WIZARD: 'wizard',
  SYSTEM: 'system',
  PERFORMANCE: 'performance',
  SECURITY: 'security'
} as const;

export type LogCategory = typeof LogCategory[keyof typeof LogCategory];

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
  stackTrace?: string;
  performance?: {
    duration: number;
    memoryUsage?: number;
    cpuUsage?: number;
  };
}

export interface LogStats {
  totalLogs: number;
  logsByLevel: Record<LogLevel, number>;
  logsByCategory: Record<LogCategory, number>;
  errorRate: number;
  averageResponseTime: number;
  memoryUsage: number;
}

export interface LogFilter {
  level?: LogLevel;
  category?: LogCategory;
  startDate?: Date;
  endDate?: Date;
  searchTerm?: string;
  limit?: number;
}

export interface PerformanceMetrics {
  duration: number;
  memoryUsage?: number;
  cpuUsage?: number;
}

// ============================================================================
// Logging Service
// ============================================================================

export class LoggingService {
  private static instance: LoggingService;
  private logs: LogEntry[] = [];
  private maxLogs = 10000;
  private logLevel = LogLevel.INFO;
  private sessionId = this.generateSessionId();
  private performanceMarks: Map<string, number> = new Map();

  private constructor() {
    this.startLogRotation();
    this.setupGlobalErrorHandling();
    this.startPerformanceMonitoring();
  }

  static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  /**
   * Log un message avec niveau et catégorie
   */
  log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    data?: Record<string, unknown>,
    performance?: PerformanceMetrics
  ): void {
    if (level < this.logLevel) return;

    const logEntry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      level,
      category,
      message,
      data,
      sessionId: this.sessionId,
      performance
    };

    if (level >= LogLevel.ERROR) {
      logEntry.stackTrace = new Error().stack;
    }

    this.logs.push(logEntry);

    if (this.logs.length > this.maxLogs) {
      this.rotateLogs();
    }

    this.outputToConsole(logEntry);

    if (category === LogCategory.API || category === LogCategory.PERSISTENCE) {
      this.monitorOperation(logEntry);
    }
  }

  /**
   * Méthodes de commodité pour les différents niveaux
   */
  debug(category: LogCategory, message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, category, message, data);
  }

  info(category: LogCategory, message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, category, message, data);
  }

  warn(category: LogCategory, message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, category, message, data);
  }

  error(category: LogCategory, message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, category, message, data);
  }

  critical(category: LogCategory, message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.CRITICAL, category, message, data);
  }

  /**
   * Démarrer un chronomètre de performance
   */
  startTimer(operation: string): string {
    const timerId = `${operation}_${Date.now()}`;
    this.performanceMarks.set(timerId, performance.now());
    return timerId;
  }

  /**
   * Arrêter un chronomètre et logger la performance
   */
  endTimer(timerId: string, category: LogCategory, message: string, data?: Record<string, unknown>): void {
    const startTime = this.performanceMarks.get(timerId);
    if (!startTime) return;

    const duration = performance.now() - startTime;
    const memoryUsage = typeof performance !== 'undefined' && 'memory' in performance 
      ? (performance as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize 
      : undefined;

    this.performanceMarks.delete(timerId);

    this.log(LogLevel.INFO, category, message, data, {
      duration,
      memoryUsage
    });
  }

  /**
   * Logger une opération API avec monitoring
   */
  async logAPIOperation<T>(
    endpoint: string,
    method: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const timerId = this.startTimer(`api_${endpoint}_${method}`);

    try {
      this.debug(LogCategory.API, `API call started: ${method} ${endpoint}`);

      const result = await operation();

      this.endTimer(timerId, LogCategory.API, `API call completed: ${method} ${endpoint}`, {
        endpoint,
        method,
        status: 'success'
      });

      return result;
    } catch (error) {
      this.endTimer(timerId, LogCategory.API, `API call failed: ${method} ${endpoint}`, {
        endpoint,
        method,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  /**
   * Logger une opération de persistance
   */
  logPersistenceOperation(
    operation: string,
    entityType: string,
    entityId: string,
    layer: string,
    success: boolean,
    duration: number,
    error?: string
  ): void {
    const level = success ? LogLevel.DEBUG : LogLevel.ERROR;
    const message = success
      ? `Persistence ${operation} succeeded: ${entityType} ${entityId} (${layer})`
      : `Persistence ${operation} failed: ${entityType} ${entityId} (${layer}) - ${error}`;

    this.log(level, LogCategory.PERSISTENCE, message, {
      operation,
      entityType,
      entityId,
      layer,
      success,
      error
    }, { duration });
  }

  /**
   * Obtenir les logs filtrés
   */
  getLogs(filter?: LogFilter): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (filter) {
      if (filter.level !== undefined) {
        filteredLogs = filteredLogs.filter(log => log.level >= filter.level!);
      }

      if (filter.category) {
        filteredLogs = filteredLogs.filter(log => log.category === filter.category);
      }

      if (filter.startDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.startDate!);
      }

      if (filter.endDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= filter.endDate!);
      }

      if (filter.searchTerm) {
        const searchLower = filter.searchTerm.toLowerCase();
        filteredLogs = filteredLogs.filter(log =>
          log.message.toLowerCase().includes(searchLower) ||
          (log.data && JSON.stringify(log.data).toLowerCase().includes(searchLower))
        );
      }

      if (filter.limit) {
        filteredLogs = filteredLogs.slice(-filter.limit);
      }
    }

    return filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Obtenir les statistiques de logging
   */
  getStats(): LogStats {
    const logsByLevel = Object.values(LogLevel).reduce((acc: Record<number, number>, level) => {
      if (typeof level === 'number') {
        acc[level] = this.logs.filter(log => log.level === level).length;
      }
      return acc;
    }, {} as Record<number, number>);

    const logsByCategory = Object.values(LogCategory).reduce((acc, category) => {
      acc[category] = this.logs.filter(log => log.category === category).length;
      return acc;
    }, {} as Record<string, number>);

    const errorLogs = this.logs.filter(log => log.level >= LogLevel.ERROR).length;
    const totalLogs = this.logs.length;

    return {
      totalLogs,
      logsByLevel,
      logsByCategory,
      errorRate: totalLogs > 0 ? errorLogs / totalLogs : 0,
      averageResponseTime: 0,
      memoryUsage: 0
    };
  }

  /**
   * Logger une opération de sync
   */
  logSyncOperation(
    operation: string,
    entityType: string,
    entityId: string,
    success: boolean,
    duration: number,
    error?: string
  ): void {
    const level = success ? LogLevel.INFO : LogLevel.ERROR;
    const message = success
      ? `Sync ${operation} completed: ${entityType} ${entityId}`
      : `Sync ${operation} failed: ${entityType} ${entityId} - ${error}`;

    this.log(level, LogCategory.SYNC, message, {
      operation,
      entityType,
      entityId,
      success,
      error
    }, { duration });
  }

  /**
   * Logger une action utilisateur
   */
  logUserAction(action: string, details?: Record<string, unknown>): void {
    this.info(LogCategory.UI, `User action: ${action}`, details);
  }

  /**
   * Logger une erreur avec contexte
   */
  logError(error: Error, context?: Record<string, unknown>): void {
    this.error(LogCategory.SYSTEM, `Error: ${error.message}`, {
      error: error.message,
      stack: error.stack,
      ...context
    });
  }

  /**
   * Logger une migration
   */
  logMigration(fromVersion: string, toVersion: string, success: boolean, details?: Record<string, unknown>): void {
    const level = success ? LogLevel.INFO : LogLevel.ERROR;
    const message = success
      ? `Migration from ${fromVersion} to ${toVersion} completed`
      : `Migration from ${fromVersion} to ${toVersion} failed`;

    this.log(level, LogCategory.MIGRATION, message, {
      fromVersion,
      toVersion,
      success,
      ...details
    });
  }

  /**
   * Logger une action LLM
   */
  logLLMAction(action: string, details?: Record<string, unknown>): void {
    this.debug(LogCategory.LLM, `LLM action: ${action}`, details);
  }

  /**
   * Logger une action wizard
   */
  logWizardAction(action: string, details?: Record<string, unknown>): void {
    this.debug(LogCategory.WIZARD, `Wizard action: ${action}`, details);
  }

  // ============================================================================
  // Méthodes privées
  // ============================================================================

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
  }

  private startLogRotation(): void {
    // Implémentation basique de rotation
    setInterval(() => {
      if (this.logs.length > this.maxLogs * 0.8) {
        this.rotateLogs();
      }
    }, 60000);
  }

  private rotateLogs(): void {
    // Garder les 80% les plus récents
    const keepCount = Math.floor(this.maxLogs * 0.8);
    this.logs = this.logs.slice(-keepCount);
  }

  private setupGlobalErrorHandling(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.error(LogCategory.SYSTEM, `Unhandled error: ${event.message}`, {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.error(LogCategory.SYSTEM, `Unhandled promise rejection: ${event.reason}`, {
          reason: String(event.reason)
        });
      });
    }
  }

  private startPerformanceMonitoring(): void {
    // Monitoring basique des performances
  }

  private monitorOperation(logEntry: LogEntry): void {
    // Monitoring basique des opérations
  }

  private outputToConsole(logEntry: LogEntry): void {
    const levelNames: Record<number, string> = {
      [LogLevel.DEBUG]: 'DEBUG',
      [LogLevel.INFO]: 'INFO',
      [LogLevel.WARN]: 'WARN',
      [LogLevel.ERROR]: 'ERROR',
      [LogLevel.CRITICAL]: 'CRITICAL'
    };
    
    const prefix = `[${logEntry.category}] [${levelNames[logEntry.level]}]`;
    
    if (logEntry.level >= LogLevel.ERROR) {
      console.error(prefix, logEntry.message, logEntry);
    } else if (logEntry.level === LogLevel.WARN) {
      console.warn(prefix, logEntry.message, logEntry);
    } else {
      console.log(prefix, logEntry.message, logEntry.data ?? '');
    }
  }
}

export const loggingService = LoggingService.getInstance();
