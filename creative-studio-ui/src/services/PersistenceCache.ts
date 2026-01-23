/**
 * PersistenceCache - Cache intelligent pour optimiser les performances
 *
 * Cache avec TTL et stratégie d'éviction LRU pour améliorer les performances
 * des opérations de persistance fréquentes
 */

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccess: number;
  size: number; // Taille approximative en octets
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  averageAccessTime: number;
  evictionCount: number;
}

export enum CacheStrategy {
  LRU = 'lru', // Least Recently Used
  LFU = 'lfu', // Least Frequently Used
  SIZE = 'size', // Based on size
  TTL = 'ttl' // Time-based
}

/**
 * Cache intelligent avec stratégies d'éviction configurables
 */
export class PersistenceCache {
  private static instance: PersistenceCache;
  private cache = new Map<string, CacheEntry>();
  private maxSize = 50 * 1024 * 1024; // 50MB max
  private currentSize = 0;
  private defaultTTL = 5 * 60 * 1000; // 5 minutes
  private strategy = CacheStrategy.LRU;

  // Statistiques
  private stats = {
    hits: 0,
    misses: 0,
    totalAccessTime: 0,
    evictionCount: 0
  };

  private constructor() {
    // Démarrage du nettoyage automatique
    this.startCleanupInterval();
  }

  static getInstance(): PersistenceCache {
    if (!PersistenceCache.instance) {
      PersistenceCache.instance = new PersistenceCache();
    }
    return PersistenceCache.instance;
  }

  /**
   * Récupère une entrée du cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Vérifier TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.currentSize -= entry.size;
      this.stats.misses++;
      return null;
    }

    // Mettre à jour les métriques d'accès
    entry.accessCount++;
    entry.lastAccess = Date.now();

    this.stats.hits++;

    const startTime = performance.now();
    const result = entry.data;
    this.stats.totalAccessTime += performance.now() - startTime;

    return result as T;
  }

  /**
   * Stocke une entrée dans le cache
   */
  set<T>(
    key: string,
    data: T,
    options: {
      ttl?: number;
      priority?: number;
    } = {}
  ): boolean {
    const { ttl = this.defaultTTL, priority = 0 } = options;

    // Calculer la taille approximative
    const size = this.calculateSize(data);

    // Vérifier si ça rentre dans le cache
    if (size > this.maxSize * 0.8) { // Si > 80% de la taille max, ne pas cacher
      return false;
    }

    // Éviction si nécessaire
    this.evictIfNeeded(size);

    // Créer l'entrée
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 1,
      lastAccess: Date.now(),
      size
    };

    // Stocker dans le cache
    this.cache.set(key, entry);
    this.currentSize += size;

    return true;
  }

  /**
   * Supprime une entrée du cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.cache.delete(key);
      this.currentSize -= entry.size;
      return true;
    }
    return false;
  }

  /**
   * Vérifie si une clé existe dans le cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Vérifier TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.currentSize -= entry.size;
      return false;
    }

    return true;
  }

  /**
   * Vide complètement le cache
   */
  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
  }

  /**
   * Obtient les statistiques du cache
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;
    const missRate = totalRequests > 0 ? (this.stats.misses / totalRequests) * 100 : 0;
    const averageAccessTime = this.stats.hits > 0 ? this.stats.totalAccessTime / this.stats.hits : 0;

    return {
      totalEntries: this.cache.size,
      totalSize: this.currentSize,
      hitRate,
      missRate,
      averageAccessTime,
      evictionCount: this.stats.evictionCount
    };
  }

  /**
   * Configure les paramètres du cache
   */
  configure(options: {
    maxSize?: number;
    defaultTTL?: number;
    strategy?: CacheStrategy;
  }): void {
    if (options.maxSize !== undefined) {
      this.maxSize = options.maxSize;
    }
    if (options.defaultTTL !== undefined) {
      this.defaultTTL = options.defaultTTL;
    }
    if (options.strategy !== undefined) {
      this.strategy = options.strategy;
    }
  }

  /**
   * Précharge des données fréquemment utilisées
   */
  async preload(keys: string[], loader: (key: string) => Promise<any>): Promise<void> {
    const preloadPromises = keys.map(async (key) => {
      if (!this.has(key)) {
        try {
          const data = await loader(key);
          this.set(key, data, { ttl: this.defaultTTL * 2 }); // TTL plus long pour les données préchargées
        } catch (error) {
          console.warn(`[PersistenceCache] Failed to preload ${key}:`, error);
        }
      }
    });

    await Promise.allSettled(preloadPromises);
  }

  /**
   * Exporte le contenu du cache (pour debug)
   */
  export(): Array<{ key: string; entry: CacheEntry }> {
    return Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      entry: { ...entry, data: '[DATA]' } // Ne pas exporter les données réelles
    }));
  }

  /**
   * Calcule la taille approximative d'un objet
   */
  private calculateSize(obj: any): number {
    const str = JSON.stringify(obj);
    return str ? str.length * 2 : 0; // Approximation: 2 octets par caractère
  }

  /**
   * Éviction selon la stratégie configurée
   */
  private evictIfNeeded(requiredSize: number): void {
    while (this.currentSize + requiredSize > this.maxSize && this.cache.size > 0) {
      let keyToEvict: string | null = null;

      switch (this.strategy) {
        case CacheStrategy.LRU:
          keyToEvict = this.findLRUKey();
          break;
        case CacheStrategy.LFU:
          keyToEvict = this.findLFUKey();
          break;
        case CacheStrategy.SIZE:
          keyToEvict = this.findLargestKey();
          break;
        case CacheStrategy.TTL:
          keyToEvict = this.findExpiredKey();
          break;
      }

      if (keyToEvict) {
        const entry = this.cache.get(keyToEvict);
        if (entry) {
          this.cache.delete(keyToEvict);
          this.currentSize -= entry.size;
          this.stats.evictionCount++;
        }
      } else {
        // Fallback: supprimer la première entrée
        const firstKey = this.cache.keys().next().value;
        if (firstKey) {
          const entry = this.cache.get(firstKey);
          if (entry) {
            this.cache.delete(firstKey);
            this.currentSize -= entry.size;
            this.stats.evictionCount++;
          }
        }
      }
    }
  }

  /**
   * Trouve la clé la moins récemment utilisée
   */
  private findLRUKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  /**
   * Trouve la clé la moins fréquemment utilisée
   */
  private findLFUKey(): string | null {
    let leastUsedKey: string | null = null;
    let leastUsedCount = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessCount < leastUsedCount) {
        leastUsedCount = entry.accessCount;
        leastUsedKey = key;
      }
    }

    return leastUsedKey;
  }

  /**
   * Trouve la clé avec la plus grande taille
   */
  private findLargestKey(): string | null {
    let largestKey: string | null = null;
    let largestSize = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.size > largestSize) {
        largestSize = entry.size;
        largestKey = key;
      }
    }

    return largestKey;
  }

  /**
   * Trouve une clé expirée
   */
  private findExpiredKey(): string | null {
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        return key;
      }
    }

    return null;
  }

  /**
   * Démarre l'intervalle de nettoyage automatique
   */
  private startCleanupInterval(): void {
    // Nettoyer les entrées expirées toutes les 5 minutes
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000);
  }

  /**
   * Nettoie les entrées expirées
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      const entry = this.cache.get(key);
      if (entry) {
        this.cache.delete(key);
        this.currentSize -= entry.size;
      }
    }

    if (expiredKeys.length > 0) {
    }
  }

  /**
   * Obtient les clés les plus fréquemment utilisées (pour préchargement)
   */
  getHotKeys(limit = 10): string[] {
    return Array.from(this.cache.entries())
      .sort(([,a], [,b]) => b.accessCount - a.accessCount)
      .slice(0, limit)
      .map(([key]) => key);
  }

  /**
   * Optimise le cache basé sur les patterns d'usage
   */
  optimize(): void {
    // Analyser les patterns d'usage et ajuster les stratégies
    const stats = this.getStats();

    // Si le taux de succès est faible, augmenter TTL
    if (stats.hitRate < 50) {
      this.defaultTTL *= 1.5;
    }

    // Si la taille est proche de la limite, changer de stratégie
    if (this.currentSize > this.maxSize * 0.8) {
      if (this.strategy === CacheStrategy.LRU) {
        this.strategy = CacheStrategy.SIZE;
      }
    }
  }
}

// Export de l'instance singleton
export const persistenceCache = PersistenceCache.getInstance();
