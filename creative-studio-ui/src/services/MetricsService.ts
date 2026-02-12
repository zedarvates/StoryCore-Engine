/**
 * MetricsService - Service de métriques et KPIs pour StoryCore
 *
 * Collecte, analyse et rapporte les métriques de performance et d'utilisation
 * du système pour optimiser les performances et détecter les problèmes
 */

import { loggingService, LogCategory } from './LoggingService';

export interface SystemMetrics {
  // Performance
  averageResponseTime: number;
  throughput: number;
  errorRate: number;
  uptime: number;
  memoryUsage: number;
  cpuUsage?: number;

  // Usage
  activeUsers: number;
  totalProjects: number;
  totalEntities: number;
  sessionCount: number;

  // Storage
  storageUsed: number;
  cacheHitRate: number;
  backupSuccessRate: number;

  // AI & Automation
  contextExtractionAccuracy: number;
  autoFillSuccessRate: number;
  wizardCompletionRate: number;
  llmResponseTime: number;

  // Persistence
  persistenceSuccessRate: number;
  syncConflictRate: number;
  migrationSuccessRate: number;

  // Cache
  cacheSize: number;
  cacheHitRate: number;
  cacheEvictionRate: number;
}

export interface MetricThreshold {
  name: string;
  value: number;
  operator: '>' | '<' | '>=' | '<=' | '==';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export interface AlertConfig {
  enabled: boolean;
  thresholds: MetricThreshold[];
  cooldown: number; // Minutes between alerts
  channels: ('console' | 'log' | 'notification')[];
}

/**
 * Metrics service with real-time monitoring
 */
export class MetricsService {
  private static instance: MetricsService;
  private metrics: Partial<SystemMetrics> = {};
  private history: Array<{ timestamp: Date; metrics: Partial<SystemMetrics> }> = [];
  private maxHistorySize = 1000; // Keep 1000 data points
  private collectionInterval = 30000; // Collect every 30 seconds
  private intervalId?: NodeJS.Timeout;

  // Configurable alert thresholds
  private alertConfig: AlertConfig = {
    enabled: true,
    cooldown: 5, // 5 minutes
    channels: ['console', 'log'],
    thresholds: [
      {
        name: 'high_error_rate',
        value: 5,
        operator: '>',
        severity: 'high',
        description: 'Error rate above 5%'
      },
      {
        name: 'slow_response_time',
        value: 5000,
        operator: '>',
        severity: 'medium',
        description: 'Average response time above 5 seconds'
      },
      {
        name: 'high_memory_usage',
        value: 500 * 1024 * 1024,
        operator: '>',
        severity: 'high',
        description: 'Memory usage above 500MB'
      },
      {
        name: 'low_cache_hit_rate',
        value: 50,
        operator: '<',
        severity: 'low',
        description: 'Cache hit rate below 50%'
      },
      {
        name: 'high_sync_conflicts',
        value: 10,
        operator: '>',
        severity: 'medium',
        description: 'More than 10 sync conflicts'
      }
    ]
  };

  // Alert state to avoid spam
  private alertCooldowns = new Map<string, Date>();

  private constructor() {
    this.startMetricsCollection();
  }

  static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  /**
   * Starts automatic metrics collection
   */
  private startMetricsCollection(): void {
    this.intervalId = setInterval(() => {
      this.collectMetrics();
      this.checkThresholds();
    }, this.collectionInterval);
  }

  /**
   * Collects all system metrics
   */
  private async collectMetrics(): Promise<void> {
    const timestamp = new Date();

    try {
      // System performance metrics
      const systemMetrics = await this.collectSystemMetrics();

      // Usage metrics
      const usageMetrics = await this.collectUsageMetrics();

      // Storage metrics
      const storageMetrics = await this.collectStorageMetrics();

      // AI metrics
      const aiMetrics = await this.collectAIMetrics();

      // Persistence metrics
      const persistenceMetrics = await this.collectPersistenceMetrics();

      // Fusionner toutes les métriques
      const allMetrics: Partial<SystemMetrics> = {
        ...systemMetrics,
        ...usageMetrics,
        ...storageMetrics,
        ...aiMetrics,
        ...persistenceMetrics
      };

      // Store in history
      this.metrics = allMetrics;
      this.history.push({ timestamp, metrics: { ...allMetrics } });

      // Limit history size
      if (this.history.length > this.maxHistorySize) {
        this.history = this.history.slice(-this.maxHistorySize);
      }

    } catch (error) {
      loggingService.error(LogCategory.SYSTEM, 'Failed to collect metrics', { error });
    }
  }

  /**
   * Collects system metrics (performance)
   */
  private async collectSystemMetrics(): Promise<Partial<SystemMetrics>> {
    const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;

    // Calculate average response time from logs
    const logStats = loggingService.getStats();
    const averageResponseTime = logStats.averageResponseTime;

    // Calculate error rate
    const errorRate = logStats.errorRate;

    // Calculate throughput (requests per minute)
    const recentLogs = loggingService.getLogs({
      startDate: new Date(Date.now() - 60000), // Dernière minute
      limit: 1000
    });
    const throughput = recentLogs.length;

    return {
      averageResponseTime,
      throughput,
      errorRate,
      memoryUsage,
      uptime: this.calculateUptime()
    };
  }

  /**
   * Collecte les métriques d'utilisation
   */
  private async collectUsageMetrics(): Promise<Partial<SystemMetrics>> {
    try {
      // Récupérer les données depuis le store
      const { useStore } = await import('@/store');
      const store = useStore.getState();

      const totalProjects = 1; // Simplifié - devrait compter les projets
      const totalEntities = (store.worlds?.length || 0) +
                           (store.characters?.length || 0) +
                           (store.shots?.length || 0);

      return {
        activeUsers: 1, // Simplifié - devrait track les utilisateurs actifs
        totalProjects,
        totalEntities,
        sessionCount: 1 // Simplifié
      };
    } catch (error) {
      return {};
    }
  }

  /**
   * Collecte les métriques de stockage
   */
  private async collectStorageMetrics(): Promise<Partial<SystemMetrics>> {
    try {
      // Calculer l'utilisation localStorage
      let storageUsed = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          storageUsed += localStorage[key].length + key.length;
        }
      }

      // Métriques du cache (si disponible)
      let cacheHitRate = 0;
      try {
        const { persistenceCache } = await import('./PersistenceCache');
        const cacheStats = persistenceCache.getStats();
        cacheHitRate = cacheStats.hitRate;
      } catch (error) {
        // Cache pas disponible
      }

      return {
        storageUsed,
        cacheHitRate,
        backupSuccessRate: 95 // Simplifié
      };
    } catch (error) {
      return {};
    }
  }

  /**
   * Collecte les métriques IA
   */
  private async collectAIMetrics(): Promise<Partial<SystemMetrics>> {
    // Ces métriques devraient être trackées pendant l'utilisation
    return {
      contextExtractionAccuracy: 85, // À implémenter
      autoFillSuccessRate: 90, // À implémenter
      wizardCompletionRate: 95, // À implémenter
      llmResponseTime: 2000 // À implémenter
    };
  }

  /**
   * Collecte les métriques de persistance
   */
  private async collectPersistenceMetrics(): Promise<Partial<SystemMetrics>> {
    try {
      // Analyser les logs de persistance récents
      const persistenceLogs = loggingService.getLogs({
        category: LogCategory.PERSISTENCE,
        startDate: new Date(Date.now() - 3600000), // Dernière heure
        limit: 100
      });

      const totalOperations = persistenceLogs.length;
      const successfulOperations = persistenceLogs.filter(log =>
        log.level === 1 // INFO level = success
      ).length;

      const persistenceSuccessRate = totalOperations > 0 ?
        (successfulOperations / totalOperations) * 100 : 100;

      return {
        persistenceSuccessRate,
        syncConflictRate: 2, // À implémenter avec SyncManager
        migrationSuccessRate: 98 // À implémenter avec MigrationService
      };
    } catch (error) {
      return {};
    }
  }

  /**
   * Checks alert thresholds
   */
  private checkThresholds(): void {
    if (!this.alertConfig.enabled) return;

    const currentMetrics = this.metrics;

    for (const threshold of this.alertConfig.thresholds) {
      const metricValue = (currentMetrics as any)[threshold.name.replace('_', '')] ||
                         (currentMetrics as any)[threshold.name];

      if (metricValue !== undefined && this.checkThreshold(threshold, metricValue)) {
        this.triggerAlert(threshold, metricValue);
      }
    }
  }

  /**
   * Checks if a threshold is exceeded
   */
  private checkThreshold(threshold: MetricThreshold, value: number): boolean {
    switch (threshold.operator) {
      case '>': return value > threshold.value;
      case '<': return value < threshold.value;
      case '>=': return value >= threshold.value;
      case '<=': return value <= threshold.value;
      case '==': return value === threshold.value;
      default: return false;
    }
  }

  /**
   * Triggers an alert
   */
  private triggerAlert(threshold: MetricThreshold, value: number): void {
    const alertKey = `${threshold.name}_${threshold.operator}_${threshold.value}`;
    const lastAlert = this.alertCooldowns.get(alertKey);

    // Check cooldown
    if (lastAlert && Date.now() - lastAlert.getTime() < threshold.cooldown * 60 * 1000) {
      return; // In cooldown
    }

    // Create alert message
    const alertMessage = `[ALERT] ${threshold.description} (Current: ${value}, Threshold: ${threshold.value})`;

    // Log according to severity
    switch (threshold.severity) {
      case 'low':
        loggingService.info(LogCategory.SYSTEM, alertMessage);
        break;
      case 'medium':
        loggingService.warn(LogCategory.SYSTEM, alertMessage);
        break;
      case 'high':
      case 'critical':
        loggingService.critical(LogCategory.SYSTEM, alertMessage);
        break;
    }

    // Send to configured channels
    for (const channel of this.alertConfig.channels) {
      switch (channel) {
        case 'console':
          console.warn(`🚨 ${alertMessage}`);
          break;
        case 'notification':
          this.showBrowserNotification(alertMessage, threshold.severity);
          break;
      }
    }

    // Update cooldown
    this.alertCooldowns.set(alertKey, new Date());
  }

  /**
   * Displays a browser notification
   */
  private showBrowserNotification(message: string, severity: string): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`StoryCore ${severity.toUpperCase()}`, {
        body: message,
        icon: '/favicon.ico',
        tag: 'storycore-alert'
      });
    }
  }

  /**
   * Gets current metrics
   */
  getCurrentMetrics(): Partial<SystemMetrics> {
    return { ...this.metrics };
  }

  /**
   * Gets metrics history
   */
  getMetricsHistory(limit?: number): Array<{ timestamp: Date; metrics: Partial<SystemMetrics> }> {
    const history = [...this.history];
    if (limit) {
      return history.slice(-limit);
    }
    return history;
  }

  /**
   * Calculates metrics over a period
   */
  getMetricsSummary(timeRange: number = 3600000): { // 1 heure par défaut
    average: Partial<SystemMetrics>;
    min: Partial<SystemMetrics>;
    max: Partial<SystemMetrics>;
    trend: 'improving' | 'degrading' | 'stable';
  } {
    const cutoff = Date.now() - timeRange;
    const relevantHistory = this.history.filter(entry => entry.timestamp.getTime() > cutoff);

    if (relevantHistory.length === 0) {
      return {
        average: {},
        min: {},
        max: {},
        trend: 'stable'
      };
    }

    // Calculate averages, min, max
    const metrics = Object.keys(relevantHistory[0].metrics) as Array<keyof SystemMetrics>;
    const summary = {
      average: {} as Partial<SystemMetrics>,
      min: {} as Partial<SystemMetrics>,
      max: {} as Partial<SystemMetrics>,
      trend: 'stable' as 'improving' | 'degrading' | 'stable'
    };

    for (const metric of metrics) {
      const values = relevantHistory.map(entry => (entry.metrics[metric] as number) || 0);
      const average = values.reduce((sum, val) => sum + val, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);

      (summary.average as any)[metric] = average;
      (summary.min as any)[metric] = min;
      (summary.max as any)[metric] = max;
    }

    // Determine trend based on latest values
    if (relevantHistory.length >= 2) {
      const recent = relevantHistory.slice(-10); // Dernières 10 mesures
      const older = relevantHistory.slice(-20, -10); // 10 mesures précédentes

      if (recent.length > 0 && older.length > 0) {
        const recentAvg = recent.reduce((sum, entry) => sum + (entry.metrics.errorRate || 0), 0) / recent.length;
        const olderAvg = older.reduce((sum, entry) => sum + (entry.metrics.errorRate || 0), 0) / older.length;

        if (recentAvg < olderAvg * 0.8) {
          summary.trend = 'improving';
        } else if (recentAvg > olderAvg * 1.2) {
          summary.trend = 'degrading';
        }
      }
    }

    return summary;
  }

  /**
   * Generates a detailed report
   */
  generateReport(): string {
    const current = this.getCurrentMetrics();
    const summary = this.getMetricsSummary();

    let report = `# 📊 Metrics Report - StoryCore\n\n`;
    report += `*Generated on ${new Date().toISOString()}*\n\n`;

    // Current metrics
    report += `## 📈 Current Metrics\n`;
    report += `- **Average response time** : ${current.averageResponseTime?.toFixed(2) || 'N/A'}ms\n`;
    report += `- **Throughput** : ${current.throughput || 0} req/min\n`;
    report += `- **Error rate** : ${current.errorRate?.toFixed(2) || 'N/A'}%\n`;
    report += `- **Memory usage** : ${((current.memoryUsage || 0) / 1024 / 1024).toFixed(2)} MB\n`;
    report += `- **Uptime** : ${this.formatUptime(current.uptime || 0)}\n\n`;

    // Trend summary
    report += `## 📊 Trend Analysis\n`;
    report += `- **Overall trend** : ${summary.trend === 'improving' ? '🔥 Improving' :
                                         summary.trend === 'degrading' ? '⚠️ Degrading' : '✅ Stable'}\n`;
    report += `- **Average error (1h)** : ${summary.average.errorRate?.toFixed(2) || 'N/A'}%\n`;
    report += `- **Response min/max (1h)** : ${summary.min.averageResponseTime?.toFixed(2) || 'N/A'}ms / ${summary.max.averageResponseTime?.toFixed(2) || 'N/A'}ms\n\n`;

    // Active alerts
    const activeAlerts = this.getActiveAlerts();
    if (activeAlerts.length > 0) {
      report += `## 🚨 Active Alerts\n`;
      activeAlerts.forEach(alert => {
        report += `- **${alert.severity.toUpperCase()}** : ${alert.description}\n`;
      });
      report += '\n';
    }

    // Recommendations
    report += `## 💡 Recommendations\n`;
    if ((current.errorRate || 0) > 5) {
      report += `- ⚠️ High error rate: Check error logs\n`;
    }
    if ((current.averageResponseTime || 0) > 5000) {
      report += `- 🐌 Slow performance: Optimize requests or add cache\n`;
    }
    if ((current.memoryUsage || 0) > 400 * 1024 * 1024) {
      report += `- 💾 High memory: Check for memory leaks\n`;
    }
    if ((current.cacheHitRate || 0) < 50) {
      report += `- 🎯 Ineffective cache: Adjust cache strategy\n`;
    }

    return report;
  }

  /**
   * Gets active alerts
   */
  private getActiveAlerts(): Array<{ severity: string; description: string }> {
    const alerts: Array<{ severity: string; description: string }> = [];

    // Manually check common thresholds
    const metrics = this.metrics;

    if ((metrics.errorRate || 0) > 5) {
      alerts.push({ severity: 'high', description: 'Error rate above 5%' });
    }
    if ((metrics.averageResponseTime || 0) > 5000) {
      alerts.push({ severity: 'medium', description: 'Response time above 5 seconds' });
    }
    if ((metrics.memoryUsage || 0) > 500 * 1024 * 1024) {
      alerts.push({ severity: 'high', description: 'Memory usage above 500MB' });
    }

    return alerts;
  }

  /**
   * Calculates uptime
   */
  private calculateUptime(): number {
    // Simplified - should be tracked from startup
    return Date.now() - (this.history[0]?.timestamp.getTime() || Date.now());
  }

  /**
   * Formats uptime
   */
  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}j ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Configures alert thresholds
   */
  configureAlerts(config: Partial<AlertConfig>): void {
    this.alertConfig = { ...this.alertConfig, ...config };
    loggingService.info(LogCategory.SYSTEM, 'Alert configuration updated', config);
  }

  /**
   * Stops metrics collection
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  /**
   * Redémarre la collecte des métriques
   */
  restart(): void {
    this.stop();
    this.startMetricsCollection();
  }

  /**
   * Exporte les métriques au format JSON
   */
  exportMetrics(): string {
    return JSON.stringify({
      current: this.metrics,
      history: this.history,
      alerts: this.alertConfig
    }, null, 2);
  }
}

// Export de l'instance singleton
export const metricsService = MetricsService.getInstance();
