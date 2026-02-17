import { logger } from '@/utils/logger';

/**
 * CacheService - Gestion du cache pour l'application
 * 
 * Fournit des fonctionnalités de mise en cache pour:
 * - Images et médias
 * - Données de projet
 * - Résultats d'API
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface CacheOptions {
  ttl?: number; // Time to live en millisecondes
  maxSize?: number; // Taille max du cache
}

export class CacheService {
  private static instance: CacheService;
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private maxEntries: number = 100;
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    logger.debug('[CacheService] Initialized');
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Définit une valeur dans le cache
   */
  set<T>(key: string, data: T, options?: CacheOptions): void {
    const ttl = options?.ttl ?? this.defaultTTL;
    const now = Date.now();
    
    // Nettoyer si trop d'entrées
    if (this.cache.size >= this.maxEntries) {
      this.cleanup();
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    });

    logger.debug(`[CacheService] Cached: ${key}`);
  }

  /**
   * Récupère une valeur du cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Vérifier expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      logger.debug(`[CacheService] Expired: ${key}`);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Vérifie si une clé existe et est valide
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Supprime une entrée du cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Vide tout le cache
   */
  clear(): void {
    this.cache.clear();
    logger.debug('[CacheService] Cache cleared');
  }

  /**
   * Nettoie les entrées expirées
   */
  private cleanup(): void {
    const now = Date.now();
    let deleted = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        deleted++;
      }
    }

    // Si toujours trop d'entrées, supprimer les plus anciennes
    if (this.cache.size >= this.maxEntries) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toDelete = entries.slice(0, Math.floor(this.maxEntries * 0.2));
      toDelete.forEach(([key]) => this.cache.delete(key));
      deleted += toDelete.length;
    }

    if (deleted > 0) {
      logger.debug(`[CacheService] Cleaned up ${deleted} entries`);
    }
  }

  /**
   * Récupère les statistiques du cache
   */
  getStats(): { size: number; hits: number; misses: number } {
    return {
      size: this.cache.size,
      hits: 0, // À implémenter avec tracking
      misses: 0,
    };
  }
}

// Export de l'instance singleton
export const cacheService = CacheService.getInstance();

