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

  // Utilisation
  activeUsers: number;
  totalProjects: number;
  totalEntities: number;
  sessionCount: number;

  // Stockage
  storageUsed: number;
  cacheHitRate: number;
  backupSuccessRate: number;

  // IA & Automatisation
  contextExtractionAccuracy: number;
  autoFillSuccessRate: number;
  wizardCompletionRate: number;
  llmResponseTime: number;

  // Persistance
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
  cooldown: number; // Minutes entre les alertes
  channels: ('console' | 'log' | 'notification')[];
}

/**
 * Service de métriques avec monitoring en temps réel
 */
export class MetricsService {
  private static instance: MetricsService;
  private metrics: Partial<SystemMetrics> = {};
  private history: Array<{ timestamp: Date; metrics: Partial<SystemMetrics> }> = [];
  private maxHistorySize = 1000; // Garder 1000 points de données
  private collectionInterval = 30000; // Collecte toutes les 30 secondes
  private intervalId?: NodeJS.Timeout;

  // Seuils d'alerte configurables
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
        description: 'Taux d\'erreur supérieur à 5%'
      },
      {
        name: 'slow_response_time',
        value: 5000,
        operator: '>',
        severity: 'medium',
        description: 'Temps de réponse moyen supérieur à 5 secondes'
      },
      {
        name: 'high_memory_usage',
        value: 500 * 1024 * 1024,
        operator: '>',
        severity: 'high',
        description: 'Utilisation mémoire supérieure à 500MB'
      },
      {
        name: 'low_cache_hit_rate',
        value: 50,
        operator: '<',
        severity: 'low',
        description: 'Taux de succès du cache inférieur à 50%'
      },
      {
        name: 'high_sync_conflicts',
        value: 10,
        operator: '>',
        severity: 'medium',
        description: 'Plus de 10 conflits de synchronisation'
      }
    ]
  };

  // État des alertes pour éviter les spams
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
   * Démarre la collecte automatique des métriques
   */
  private startMetricsCollection(): void {
    this.intervalId = setInterval(() => {
      this.collectMetrics();
      this.checkThresholds();
    }, this.collectionInterval);
  }

  /**
   * Collecte toutes les métriques du système
   */
  private async collectMetrics(): Promise<void> {
    const timestamp = new Date();

    try {
      // Métriques de performance système
      const systemMetrics = await this.collectSystemMetrics();

      // Métriques d'utilisation
      const usageMetrics = await this.collectUsageMetrics();

      // Métriques de stockage
      const storageMetrics = await this.collectStorageMetrics();

      // Métriques IA
      const aiMetrics = await this.collectAIMetrics();

      // Métriques de persistance
      const persistenceMetrics = await this.collectPersistenceMetrics();

      // Fusionner toutes les métriques
      const allMetrics: Partial<SystemMetrics> = {
        ...systemMetrics,
        ...usageMetrics,
        ...storageMetrics,
        ...aiMetrics,
        ...persistenceMetrics
      };

      // Stocker dans l'historique
      this.metrics = allMetrics;
      this.history.push({ timestamp, metrics: { ...allMetrics } });

      // Limiter la taille de l'historique
      if (this.history.length > this.maxHistorySize) {
        this.history = this.history.slice(-this.maxHistorySize);
      }

    } catch (error) {
      loggingService.error(LogCategory.SYSTEM, 'Failed to collect metrics', { error });
    }
  }

  /**
   * Collecte les métriques système (performance)
   */
  private async collectSystemMetrics(): Promise<Partial<SystemMetrics>> {
    const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;

    // Calculer le temps de réponse moyen depuis les logs
    const logStats = loggingService.getStats();
    const averageResponseTime = logStats.averageResponseTime;

    // Calculer le taux d'erreur
    const errorRate = logStats.errorRate;

    // Calculer le débit (requêtes par minute)
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
   * Vérifie les seuils d'alerte
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
   * Vérifie si un seuil est dépassé
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
   * Déclenche une alerte
   */
  private triggerAlert(threshold: MetricThreshold, value: number): void {
    const alertKey = `${threshold.name}_${threshold.operator}_${threshold.value}`;
    const lastAlert = this.alertCooldowns.get(alertKey);

    // Vérifier le cooldown
    if (lastAlert && Date.now() - lastAlert.getTime() < threshold.cooldown * 60 * 1000) {
      return; // En cooldown
    }

    // Créer le message d'alerte
    const alertMessage = `[ALERT] ${threshold.description} (Current: ${value}, Threshold: ${threshold.value})`;

    // Logger selon la sévérité
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

    // Envoyer aux canaux configurés
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

    // Mettre à jour le cooldown
    this.alertCooldowns.set(alertKey, new Date());
  }

  /**
   * Affiche une notification browser
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
   * Obtient les métriques actuelles
   */
  getCurrentMetrics(): Partial<SystemMetrics> {
    return { ...this.metrics };
  }

  /**
   * Obtient l'historique des métriques
   */
  getMetricsHistory(limit?: number): Array<{ timestamp: Date; metrics: Partial<SystemMetrics> }> {
    const history = [...this.history];
    if (limit) {
      return history.slice(-limit);
    }
    return history;
  }

  /**
   * Calcule les métriques sur une période
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

    // Calculer moyennes, min, max
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

    // Déterminer la tendance basée sur les dernières valeurs
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
   * Génère un rapport détaillé
   */
  generateReport(): string {
    const current = this.getCurrentMetrics();
    const summary = this.getMetricsSummary();

    let report = `# 📊 Rapport de Métriques - StoryCore\n\n`;
    report += `*Généré le ${new Date().toISOString()}*\n\n`;

    // Métriques actuelles
    report += `## 📈 Métriques Actuelles\n`;
    report += `- **Temps de réponse moyen** : ${current.averageResponseTime?.toFixed(2) || 'N/A'}ms\n`;
    report += `- **Débit** : ${current.throughput || 0} req/min\n`;
    report += `- **Taux d'erreur** : ${current.errorRate?.toFixed(2) || 'N/A'}%\n`;
    report += `- **Utilisation mémoire** : ${((current.memoryUsage || 0) / 1024 / 1024).toFixed(2)} MB\n`;
    report += `- **Temps d'activité** : ${this.formatUptime(current.uptime || 0)}\n\n`;

    // Résumé de tendance
    report += `## 📊 Analyse de Tendance\n`;
    report += `- **Tendance globale** : ${summary.trend === 'improving' ? '🔥 Amélioration' :
                                         summary.trend === 'degrading' ? '⚠️ Dégradation' : '✅ Stable'}\n`;
    report += `- **Erreur moyenne (1h)** : ${summary.average.errorRate?.toFixed(2) || 'N/A'}%\n`;
    report += `- **Réponse min/max (1h)** : ${summary.min.averageResponseTime?.toFixed(2) || 'N/A'}ms / ${summary.max.averageResponseTime?.toFixed(2) || 'N/A'}ms\n\n`;

    // Alertes actives
    const activeAlerts = this.getActiveAlerts();
    if (activeAlerts.length > 0) {
      report += `## 🚨 Alertes Actives\n`;
      activeAlerts.forEach(alert => {
        report += `- **${alert.severity.toUpperCase()}** : ${alert.description}\n`;
      });
      report += '\n';
    }

    // Recommandations
    report += `## 💡 Recommandations\n`;
    if ((current.errorRate || 0) > 5) {
      report += `- ⚠️ Taux d'erreur élevé : Vérifier les logs d'erreur\n`;
    }
    if ((current.averageResponseTime || 0) > 5000) {
      report += `- 🐌 Performance lente : Optimiser les requêtes ou ajouter du cache\n`;
    }
    if ((current.memoryUsage || 0) > 400 * 1024 * 1024) {
      report += `- 💾 Mémoire élevée : Vérifier les fuites mémoire\n`;
    }
    if ((current.cacheHitRate || 0) < 50) {
      report += `- 🎯 Cache inefficace : Ajuster la stratégie de cache\n`;
    }

    return report;
  }

  /**
   * Obtient les alertes actives
   */
  private getActiveAlerts(): Array<{ severity: string; description: string }> {
    const alerts: Array<{ severity: string; description: string }> = [];

    // Vérifier manuellement les seuils courants
    const metrics = this.metrics;

    if ((metrics.errorRate || 0) > 5) {
      alerts.push({ severity: 'high', description: 'Taux d\'erreur supérieur à 5%' });
    }
    if ((metrics.averageResponseTime || 0) > 5000) {
      alerts.push({ severity: 'medium', description: 'Temps de réponse supérieur à 5 secondes' });
    }
    if ((metrics.memoryUsage || 0) > 500 * 1024 * 1024) {
      alerts.push({ severity: 'high', description: 'Utilisation mémoire supérieure à 500MB' });
    }

    return alerts;
  }

  /**
   * Calcule le temps d'activité
   */
  private calculateUptime(): number {
    // Simplifié - devrait être tracké depuis le démarrage
    return Date.now() - (this.history[0]?.timestamp.getTime() || Date.now());
  }

  /**
   * Formate le temps d'activité
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
   * Configure les seuils d'alerte
   */
  configureAlerts(config: Partial<AlertConfig>): void {
    this.alertConfig = { ...this.alertConfig, ...config };
    loggingService.info(LogCategory.SYSTEM, 'Alert configuration updated', config);
  }

  /**
   * Arrête la collecte des métriques
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