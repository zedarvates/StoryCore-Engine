# 🧪 Phase 5 : Tests d'intégration et optimisation finale

## 📋 Vue d'ensemble de la Phase 5

### Objectifs de la Phase 5 :
1. **Tests automatisés complets** pour tous les nouveaux services
2. **Tests d'intégration** pour valider les interactions entre services
3. **Optimisations de performance** et monitoring avancé
4. **Documentation développeur** complète et mise à jour
5. **Validation de production** et déploiements sécurisés

---

## 🧪 1. Tests automatisés des services

### **Tests unitaires - PersistenceService**

```typescript
describe('PersistenceService', () => {
  let persistenceService: PersistenceService;

  beforeEach(() => {
    persistenceService = new PersistenceService();
    // Mock localStorage, Electron API, etc.
  });

  describe('saveWorld', () => {
    it('should save world to all layers successfully', async () => {
      const world: World = createMockWorld();
      const results = await persistenceService.saveWorld(world, '/test/project');

      expect(results).toHaveLength(3); // store, localStorage, file
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should fallback gracefully when layers fail', async () => {
      // Mock Electron API failure
      mockElectronAPIFailure();

      const world: World = createMockWorld();
      const results = await persistenceService.saveWorld(world);

      // Should still succeed with localStorage + fallback
      expect(results.some(r => r.success)).toBe(true);
    });

    it('should validate data before saving', async () => {
      const invalidWorld = { id: '', name: '' };

      await expect(
        persistenceService.saveWorld(invalidWorld as any)
      ).rejects.toThrow('Validation failed');
    });
  });

  describe('loadWorld', () => {
    it('should load from file layer first', async () => {
      const world = createMockWorld();
      await persistenceService.saveWorld(world, '/test/project');

      const loaded = await persistenceService.loadWorld(world.id, '/test/project');

      expect(loaded).toEqual(world);
    });
  });
});
```

### **Tests unitaires - ContextExtractor**

```typescript
describe('ContextExtractor', () => {
  let contextExtractor: ContextExtractor;

  beforeEach(() => {
    contextExtractor = ContextExtractor.getInstance();
  });

  describe('analyzeText', () => {
    it('should extract world context from natural language', () => {
      const text = "Create a dark fantasy world with dragons and magic";
      const context = contextExtractor.analyzeText(text);

      expect(context.worldContext).toBeDefined();
      expect(context.worldContext?.genre).toContain('fantasy');
      expect(context.worldContext?.tone).toContain('dark');
      expect(context.confidence).toBeGreaterThan(0.5);
    });

    it('should extract character context', () => {
      const text = "Create a brave hero named Arthur, aged 25, who is a knight";
      const context = contextExtractor.analyzeText(text);

      expect(context.characterContext?.name).toBe('Arthur');
      expect(context.characterContext?.age).toBe('25');
      expect(context.characterContext?.occupation).toBe('knight');
    });

    it('should calculate confidence accurately', () => {
      const detailedText = "Create a medieval fantasy world with dragons, magic, and knights in a dark atmosphere";
      const simpleText = "world";

      const detailedContext = contextExtractor.analyzeText(detailedText);
      const simpleContext = contextExtractor.analyzeText(simpleText);

      expect(detailedContext.confidence).toBeGreaterThan(simpleContext.confidence);
    });
  });
});
```

### **Tests d'intégration**

```typescript
describe('Integration Tests', () => {
  describe('Wizard Chat Flow', () => {
    it('should auto-fill world wizard from chat input', async () => {
      // Simulate user input
      const userInput = "world building: create a dark fantasy world with dragons";

      // Extract context
      const context = contextExtractor.analyzeText(userInput);

      // Auto-fill form
      const autoFillResult = formAutoFill.autoFillWorldForm(userInput);

      // Validate result
      expect(autoFillResult.success).toBe(true);
      expect(autoFillResult.filledFields).toContain('genre');
      expect(autoFillResult.filledFields).toContain('tone');

      // Save world
      const worldData = autoFillResult.data as World;
      const saveResults = await persistenceService.saveWorld(worldData);

      expect(saveResults.some(r => r.success)).toBe(true);
    });

    it('should handle complete wizard workflow', async () => {
      // 1. Chat input
      const input = "character creation: brave knight named Roland";

      // 2. Context extraction
      const context = contextExtractor.analyzeText(input);

      // 3. Form auto-fill
      const autoFill = formAutoFill.autoFillCharacterForm(input);

      // 4. Validation
      const validation = formAutoFill.validateAutoFilledData('character', autoFill.data);

      // 5. Persistence
      const characterData = autoFill.data as Character;
      const persistenceResults = await persistenceService.saveWorld(characterData as any);

      // 6. Sync verification
      const syncResults = await syncManager.fullSync('/test/project');

      expect(validation.isValid).toBe(true);
      expect(persistenceResults.some(r => r.success)).toBe(true);
      expect(syncResults.syncErrors).toBe(0);
    });
  });

  describe('Error Recovery', () => {
    it('should handle API failures gracefully', async () => {
      // Mock API failure
      mockAPIFailure('electron');

      const world = createMockWorld();
      const results = await persistenceService.saveWorld(world);

      // Should still succeed via fallback
      expect(results.some(r => r.success)).toBe(true);
      expect(results.some(r => r.layer === 'fallback')).toBe(true);
    });

    it('should recover from migration failures', async () => {
      // Mock migration failure
      mockMigrationFailure();

      const migrationResult = await migrationService.migrateAllData('/test/project');

      // Should have rollback available
      expect(migrationResult.rollbacks.length).toBeGreaterThan(0);

      // Retry should succeed
      const retryResult = await migrationService.retryFailedMigration('migration-test');
      expect(retryResult.success).toBe(true);
    });
  });
});
```

---

## ⚡ 2. Optimisations de performance

### **Optimisations du PersistenceService**

```typescript
// Cache intelligent avec TTL
class PersistenceCache {
  private cache = new Map<string, { data: any, timestamp: number, ttl: number }>();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set<T>(key: string, data: T, ttl = 300000): void { // 5 minutes default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
}

// Batch operations pour réduire les I/O
class BatchProcessor {
  private queue: Array<{ operation: () => Promise<any>, priority: number }> = [];
  private processing = false;

  async add(operation: () => Promise<any>, priority = 0): Promise<void> {
    this.queue.push({ operation, priority });
    this.queue.sort((a, b) => b.priority - a.priority); // High priority first

    if (!this.processing) {
      await this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const { operation } = this.queue.shift()!;
      try {
        await operation();
      } catch (error) {
        loggingService.error(LogCategory.PERSISTENCE, 'Batch operation failed', { error });
      }
    }

    this.processing = false;
  }
}
```

### **Optimisations du ContextExtractor**

```typescript
// Cache des analyses fréquentes
class ContextCache {
  private cache = new Map<string, { context: ExtractedContext, timestamp: number }>();
  private readonly CACHE_SIZE = 100;

  get(text: string): ExtractedContext | null {
    const hash = this.hashText(text);
    const entry = this.cache.get(hash);

    if (entry && Date.now() - entry.timestamp < 3600000) { // 1 hour
      return entry.context;
    }

    return null;
  }

  set(text: string, context: ExtractedContext): void {
    const hash = this.hashText(text);

    if (this.cache.size >= this.CACHE_SIZE) {
      // Remove oldest entry
      const oldestKey = Array.from(this.cache.entries())
        .sort(([,a], [,b]) => a.timestamp - b.timestamp)[0][0];
      this.cache.delete(oldestKey);
    }

    this.cache.set(hash, {
      context,
      timestamp: Date.now()
    });
  }

  private hashText(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }
}
```

---

## 📚 3. Documentation développeur

### **Guide d'intégration des services**

```markdown
# Guide d'intégration - StoryCore Services

## PersistenceService

### Utilisation de base
```typescript
import { persistenceService } from '@/services/PersistenceService';

// Sauvegarder un monde
const results = await persistenceService.saveWorld(world, projectPath);
const success = results.some(r => r.success);

// Charger un monde
const world = await persistenceService.loadWorld(worldId, projectPath);
```

### Gestion d'erreurs
```typescript
try {
  await persistenceService.saveWorld(world, projectPath);
} catch (error) {
  if (error.message.includes('Validation failed')) {
    // Gérer les erreurs de validation
    console.log('Données invalides:', error.message);
  } else {
    // Erreur de persistance - système de fallback actif
    console.log('Erreur de sauvegarde, fallback utilisé');
  }
}
```

## ContextExtractor

### Extraction de contexte
```typescript
import { contextExtractor } from '@/services/ContextExtractor';

const context = contextExtractor.analyzeText(userInput);

// Vérifier la confiance
if (context.confidence > 0.7) {
  // Contexte fiable
  const worldData = context.worldContext;
}
```

### Utilisation avec FormAutoFill
```typescript
import { formAutoFill } from '@/services/FormAutoFill';

const autoFillResult = formAutoFill.autoFillWorldForm(userInput);
if (autoFillResult.success) {
  // Pré-remplir le formulaire
  setFormData(autoFillResult.data);

  // Afficher les suggestions
  setSuggestions(autoFillResult.suggestions);
}
```

## LoggingService

### Logging structuré
```typescript
import { loggingService, LogCategory, LogLevel } from '@/services/LoggingService';

// Log avec chronométrage
const timerId = loggingService.startTimer('api-call');
try {
  const result = await apiCall();
  loggingService.endTimer(timerId, LogCategory.API, 'API call successful');
  return result;
} catch (error) {
  loggingService.endTimer(timerId, LogCategory.API, 'API call failed', { error });
  throw error;
}
```

### Génération de rapports
```typescript
// Rapport de santé système
const healthReport = loggingService.generateHealthReport();
console.log(healthReport);

// Statistiques détaillées
const stats = loggingService.getStats();
console.log('Error rate:', stats.errorRate);
```

## Recommandations d'architecture

### 1. Gestion d'état
- Utiliser Zustand pour l'état global
- PersistenceService pour la persistance
- SyncManager pour la synchronisation

### 2. Gestion d'erreurs
- Try/catch dans toutes les opérations async
- Logging systématique des erreurs
- Recovery automatique quand possible

### 3. Performance
- Cache intelligent pour les opérations fréquentes
- Batch processing pour les opérations groupées
- Lazy loading pour les composants lourds

### 4. Tests
- Tests unitaires pour chaque service
- Tests d'intégration pour les workflows complets
- Mocks pour les APIs externes
```

---

## 🚀 4. Déploiement et production

### **Configuration de production**

```typescript
// config/production.ts
export const productionConfig = {
  services: {
    persistence: {
      retryAttempts: 5,
      timeout: 30000,
      enableFallback: true
    },
    logging: {
      level: LogLevel.INFO,
      maxLogs: 50000,
      enableRemoteLogging: true
    },
    sync: {
      autoSyncInterval: 300000, // 5 minutes
      conflictResolution: 'store-wins'
    }
  },

  monitoring: {
    enableHealthChecks: true,
    healthCheckInterval: 60000, // 1 minute
    alertThresholds: {
      errorRate: 5, // 5% max
      responseTime: 5000, // 5 seconds max
      memoryUsage: 500 * 1024 * 1024 // 500MB max
    }
  }
};
```

### **Script de déploiement**

```bash
#!/bin/bash
# deploy.sh

echo "🚀 Starting StoryCore deployment..."

# Build application
npm run build

# Run tests
npm run test:integration

# Health checks
npm run health-check

# Backup current deployment
cp -r /var/www/storycore /var/www/storycore.backup

# Deploy new version
cp -r dist/* /var/www/storycore/

# Run migrations
npm run migrate:production

# Restart services
sudo systemctl restart storycore-api
sudo systemctl restart storycore-frontend

# Health verification
curl -f http://localhost/health || exit 1

echo "✅ Deployment completed successfully!"
```

### **Monitoring de production**

```typescript
// Monitoring avancé pour la production
class ProductionMonitor {
  private metrics = {
    uptime: 0,
    totalRequests: 0,
    errorCount: 0,
    averageResponseTime: 0,
    memoryUsage: 0,
    activeUsers: 0
  };

  startMonitoring(): void {
    // Métriques système
    setInterval(() => {
      this.metrics.memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;
      this.metrics.uptime = Date.now() - this.startTime;
    }, 30000);

    // Alertes automatiques
    setInterval(() => {
      this.checkThresholds();
    }, 60000);
  }

  private checkThresholds(): void {
    const errorRate = (this.metrics.errorCount / this.metrics.totalRequests) * 100;

    if (errorRate > 5) {
      this.alert('High error rate detected', { errorRate });
    }

    if (this.metrics.averageResponseTime > 5000) {
      this.alert('Slow response times detected', {
        averageResponseTime: this.metrics.averageResponseTime
      });
    }

    if (this.metrics.memoryUsage > 500 * 1024 * 1024) {
      this.alert('High memory usage detected', {
        memoryUsage: this.metrics.memoryUsage
      });
    }
  }

  private alert(message: string, data: any): void {
    loggingService.critical(LogCategory.SYSTEM, `PRODUCTION ALERT: ${message}`, data);

    // Envoyer notification (email, Slack, etc.)
    this.sendNotification(message, data);
  }

  private sendNotification(message: string, data: any): void {
    // Intégration avec services de notification
    console.log('📢 ALERT:', message, data);
  }
}
```

---

## 🎯 5. Métriques et KPIs

### **Tableau de bord des métriques**

```typescript
interface SystemMetrics {
  // Performance
  averageResponseTime: number;
  throughput: number;
  errorRate: number;
  uptime: number;

  // Utilisation
  activeUsers: number;
  totalProjects: number;
  totalEntities: number;

  // Stockage
  storageUsed: number;
  backupSuccessRate: number;

  // IA
  contextExtractionAccuracy: number;
  autoFillSuccessRate: number;
  wizardCompletionRate: number;
}

class MetricsDashboard {
  private metrics: SystemMetrics = {
    averageResponseTime: 0,
    throughput: 0,
    errorRate: 0,
    uptime: 99.9,
    activeUsers: 0,
    totalProjects: 0,
    totalEntities: 0,
    storageUsed: 0,
    backupSuccessRate: 100,
    contextExtractionAccuracy: 85,
    autoFillSuccessRate: 90,
    wizardCompletionRate: 95
  };

  updateMetrics(): void {
    // Collecter métriques depuis les services
    const loggingStats = loggingService.getStats();
    const persistenceStats = persistenceService.getStats();

    this.metrics.errorRate = loggingStats.errorRate;
    this.metrics.averageResponseTime = loggingStats.averageResponseTime;
    // ... autres métriques
  }

  generateReport(): string {
    return `
# 📊 StoryCore - Rapport de Métriques

## Performance Système
- ⏱️ Temps de réponse moyen: ${this.metrics.averageResponseTime.toFixed(2)}ms
- 📈 Débit: ${this.metrics.throughput} req/min
- ❌ Taux d'erreur: ${this.metrics.errorRate.toFixed(2)}%
- 🟢 Uptime: ${this.metrics.uptime}%

## Utilisation
- 👥 Utilisateurs actifs: ${this.metrics.activeUsers}
- 📁 Projets totaux: ${this.metrics.totalProjects}
- 📊 Entités totales: ${this.metrics.totalEntities}

## IA & Automatisation
- 🎯 Précision extraction contexte: ${this.metrics.contextExtractionAccuracy}%
- ✨ Taux succès auto-remplissage: ${this.metrics.autoFillSuccessRate}%
- 🧙 Taux completion wizards: ${this.metrics.wizardCompletionRate}%

## Stockage
- 💾 Stockage utilisé: ${(this.metrics.storageUsed / 1024 / 1024 / 1024).toFixed(2)}GB
- 🔄 Taux succès sauvegarde: ${this.metrics.backupSuccessRate}%

---
*Mis à jour: ${new Date().toISOString()}*
    `.trim();
  }
}
```

---

## ✅ Checklist de validation Phase 5

### **Tests automatisés**
- [ ] Tests unitaires pour tous les services
- [ ] Tests d'intégration des workflows complets
- [ ] Tests de performance et charge
- [ ] Tests de récupération d'erreur
- [ ] Coverage de code > 80%

### **Optimisations**
- [ ] Cache intelligent implémenté
- [ ] Batch processing opérationnel
- [ ] Lazy loading configuré
- [ ] Bundle splitting optimisé

### **Documentation**
- [ ] Guide développeur complet
- [ ] API documentation générée
- [ ] Exemples d'intégration
- [ ] Guide de déploiement

### **Production**
- [ ] Configuration production
- [ ] Script de déploiement automatisé
- [ ] Monitoring en temps réel
- [ ] Alertes automatiques configurées

### **Métriques**
- [ ] Tableau de bord opérationnel
- [ ] KPIs définis et trackés
- [ ] Rapports automatiques
- [ ] Seuils d'alerte configurés

---

*Phase 5 : Finalisation et optimisation de production*
*Date : 21/01/2026*
*Status : En cours d'implémentation*