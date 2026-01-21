/**
 * LoggingService - Service de logging complet pour StoryCore
 *
 * Fournit un système de logging avancé avec niveaux, catégories,
 * rotation automatique et monitoring des APIs
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

export enum LogCategory {
  PERSISTENCE = 'persistence',
  API = 'api',
  SYNC = 'sync',
  MIGRATION = 'migration',
  UI = 'ui',
  LLM = 'llm',
  WIZARD = 'wizard',
  SYSTEM = 'system',
  PERFORMANCE = 'performance',
  SECURITY = 'security'
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: any;
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

/**
 * Service de logging avancé avec monitoring intégré
 */
export class LoggingService {
  private static instance: LoggingService;
  private logs: LogEntry[] = [];
  private maxLogs = 10000; // Maximum de logs en mémoire
  private logLevel = LogLevel.INFO;
  private sessionId = this.generateSessionId();
  private performanceMarks: Map<string, number> = new Map();

  private constructor() {
    // Démarrer la rotation automatique des logs
    this.startLogRotation();

    // Capturer les erreurs non gérées
    this.setupGlobalErrorHandling();

    // Démarrer le monitoring des performances
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
    data?: any,
    performance?: { duration: number; memoryUsage?: number; cpuUsage?: number }
  ): void {
    // Vérifier le niveau de log
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

    // Ajouter le stack trace pour les erreurs
    if (level >= LogLevel.ERROR) {
      logEntry.stackTrace = new Error().stack;
    }

    // Ajouter à la mémoire
    this.logs.push(logEntry);

    // Rotation si nécessaire
    if (this.logs.length > this.maxLogs) {
      this.rotateLogs();
    }

    // Output console selon le niveau
    this.outputToConsole(logEntry);

    // Monitoring spécial pour certaines catégories
    if (category === LogCategory.API || category === LogCategory.PERSISTENCE) {
      this.monitorOperation(logEntry);
    }
  }

  /**
   * Méthodes de commodité pour les différents niveaux
   */
  debug(category: LogCategory, message: string, data?: any): void {
    this.log(LogLevel.DEBUG, category, message, data);
  }

  info(category: LogCategory, message: string, data?: any): void {
    this.log(LogLevel.INFO, category, message, data);
  }

  warn(category: LogCategory, message: string, data?: any): void {
    this.log(LogLevel.WARN, category, message, data);
  }

  error(category: LogCategory, message: string, data?: any): void {
    this.log(LogLevel.ERROR, category, message, data);
  }

  critical(category: LogCategory, message: string, data?: any): void {
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
  endTimer(timerId: string, category: LogCategory, message: string, data?: any): void {
    const startTime = this.performanceMarks.get(timerId);
    if (!startTime) return;

    const duration = performance.now() - startTime;
    const memoryUsage = (performance as any).memory?.usedJSHeapSize;

    this.performanceMarks.delete(timerId);

    this.log(LogLevel.INFO, category, message, data, {
      duration,
      memoryUsage
    });
  }

  /**
   * Logger une opération API avec monitoring
   */
  async logAPIOperation(
    endpoint: string,
    method: string,
    operation: () => Promise<any>
  ): Promise<any> {
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
          JSON.stringify(log.data).toLowerCase().includes(searchLower)
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
    const logsByLevel = Object.values(LogLevel).reduce((acc, level) => {
      if (typeof level === 'number') {
        acc[level] = this.logs.filter(log => log.level === level).length;
      }
      return acc;
    }, {} as Record<LogLevel, number>);

    const logsByCategory = Object.values(LogCategory).reduce((acc, category) => {
      acc[category] = this.logs.filter(log => log.category === category).length;
      return acc;
    }, {} as Record<LogCategory, number>);

    const errorLogs = this.logs.filter(log => log.level >= LogLevel.ERROR).length;
    const errorRate = this.logs.length > 0 ? (errorLogs / this.logs.length) * 100 : 0;

    const performanceLogs = this.logs.filter(log => log.performance);
    const averageResponseTime = performanceLogs.length > 0
      ? performanceLogs.reduce((sum, log) => sum + (log.performance?.duration || 0), 0) / performanceLogs.length
      : 0;

    const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;

    return {
      totalLogs: this.logs.length,
      logsByLevel,
      logsByCategory,
      errorRate,
      averageResponseTime,
      memoryUsage
    };
  }

  /**
   * Générer un rapport de santé du système
   */
  generateHealthReport(): string {
    const stats = this.getStats();
    const recentErrors = this.getLogs({
      level: LogLevel.ERROR,
      limit: 5
    });

    let report = '# Rapport de Santé - StoryCore\n\n';

    report += `## Statistiques générales\n`;
    report += `- **Total des logs** : ${stats.totalLogs}\n`;
    report += `- **Taux d'erreur** : ${stats.errorRate.toFixed(2)}%\n`;
    report += `- **Temps de réponse moyen** : ${stats.averageResponseTime.toFixed(2)}ms\n`;
    report += `- **Utilisation mémoire** : ${(stats.memoryUsage / 1024 / 1024).toFixed(2)} MB\n\n`;

    report += `## Logs par niveau\n`;
    Object.entries(stats.logsByLevel).forEach(([level, count]) => {
      const levelName = LogLevel[parseInt(level)];
      report += `- **${levelName}** : ${count}\n`;
    });
    report += '\n';

    report += `## Logs par catégorie\n`;
    Object.entries(stats.logsByCategory).forEach(([category, count]) => {
      report += `- **${category.toUpperCase()}** : ${count}\n`;
    });
    report += '\n';

    if (recentErrors.length > 0) {
      report += `## Erreurs récentes\n`;
      recentErrors.forEach((error, index) => {
        report += `${index + 1}. **[${error.category.toUpperCase()}]** ${error.message}\n`;
        if (error.data) {
          report += `   - Détails: ${JSON.stringify(error.data)}\n`;
        }
        report += `   - Timestamp: ${error.timestamp.toISOString()}\n\n`;
      });
    }

    report += `*Généré le ${new Date().toISOString()}*\n`;

    return report;
  }

  /**
   * Exporter les logs au format JSON
   */
  exportLogs(filter?: LogFilter): string {
    const logs = this.getLogs(filter);
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Nettoyer les anciens logs
   */
  cleanupOldLogs(maxAge: number = 7 * 24 * 60 * 60 * 1000): void { // 7 jours par défaut
    const cutoff = Date.now() - maxAge;
    const initialCount = this.logs.length;

    this.logs = this.logs.filter(log => log.timestamp.getTime() > cutoff);

    const removedCount = initialCount - this.logs.length;
    if (removedCount > 0) {
      this.info(LogCategory.SYSTEM, `Cleaned up ${removedCount} old log entries`);
    }
  }

  /**
   * Configurer le niveau de log
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
    this.info(LogCategory.SYSTEM, `Log level changed to ${LogLevel[level]}`);
  }

  /**
   * Configurer la taille maximale des logs
   */
  setMaxLogs(maxLogs: number): void {
    this.maxLogs = maxLogs;
    this.info(LogCategory.SYSTEM, `Max logs set to ${maxLogs}`);
  }

  /**
   * Rotation automatique des logs
   */
  private rotateLogs(): void {
    // Garder seulement les logs les plus récents
    const keepCount = Math.floor(this.maxLogs * 0.8); // Garder 80%
    this.logs = this.logs.slice(-keepCount);

    this.info(LogCategory.SYSTEM, `Log rotation completed, kept ${keepCount} recent entries`);
  }

  /**
   * Démarrer la rotation automatique
   */
  private startLogRotation(): void {
    // Rotation toutes les heures
    setInterval(() => {
      this.cleanupOldLogs();
    }, 60 * 60 * 1000); // 1 heure
  }

  /**
   * Configuration de la gestion globale des erreurs
   */
  private setupGlobalErrorHandling(): void {
    // Gestionnaire d'erreurs JavaScript non gérées
    window.addEventListener('error', (event) => {
      this.error(LogCategory.SYSTEM, `Uncaught JavaScript error: ${event.message}`, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    });

    // Gestionnaire de promesses rejetées non gérées
    window.addEventListener('unhandledrejection', (event) => {
      this.error(LogCategory.SYSTEM, `Unhandled promise rejection: ${event.reason}`, {
        reason: event.reason,
        promise: event.promise
      });
    });
  }

  /**
   * Monitoring des performances
   */
  private startPerformanceMonitoring(): void {
    // Monitorer l'utilisation mémoire toutes les 30 secondes
    setInterval(() => {
      const memoryUsage = (performance as any).memory?.usedJSHeapSize;
      if (memoryUsage) {
        this.debug(LogCategory.PERFORMANCE, `Memory usage: ${(memoryUsage / 1024 / 1024).toFixed(2)} MB`);
      }
    }, 30000);
  }

  /**
   * Monitoring des opérations critiques
   */
  private monitorOperation(logEntry: LogEntry): void {
    // Alertes pour les erreurs d'API répétées
    if (logEntry.level >= LogLevel.ERROR && logEntry.category === LogCategory.API) {
      const recentAPIErrors = this.logs.filter(log =>
        log.level >= LogLevel.ERROR &&
        log.category === LogCategory.API &&
        log.timestamp.getTime() > Date.now() - 60000 // Dernière minute
      );

      if (recentAPIErrors.length >= 5) {
        this.critical(LogCategory.API, 'High API error rate detected', {
          errorCount: recentAPIErrors.length,
          timeWindow: '1 minute'
        });
      }
    }

    // Alertes pour les échecs de persistance
    if (logEntry.level >= LogLevel.ERROR && logEntry.category === LogCategory.PERSISTENCE) {
      this.warn(LogCategory.PERSISTENCE, 'Persistence operation failed', logEntry.data);
    }
  }

  /**
   * Output vers la console selon le niveau
   */
  private outputToConsole(logEntry: LogEntry): void {
    const timestamp = logEntry.timestamp.toISOString();
    const levelName = LogLevel[logEntry.level];
    const categoryName = logEntry.category.toUpperCase();
    const message = `[${timestamp}] [${levelName}] [${categoryName}] ${logEntry.message}`;

    switch (logEntry.level) {
      case LogLevel.DEBUG:
        console.debug(message, logEntry.data);
        break;
      case LogLevel.INFO:
        console.info(message, logEntry.data);
        break;
      case LogLevel.WARN:
        console.warn(message, logEntry.data);
        break;
      case LogLevel.ERROR:
        console.error(message, logEntry.data);
        break;
      case LogLevel.CRITICAL:
        console.error(`🚨 CRITICAL: ${message}`, logEntry.data);
        break;
    }
  }

  /**
   * Générer un ID de session unique
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Générer un ID de log unique
   */
  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export de l'instance singleton
export const loggingService = LoggingService.getInstance();