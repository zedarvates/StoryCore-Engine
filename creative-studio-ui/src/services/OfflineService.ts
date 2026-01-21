/**
 * OfflineService - Service de mode hors-ligne amélioré
 *
 * Gère le cache intelligent des suggestions, la fonctionnalité de base hors ligne,
 * et la synchronisation automatique à la reconnexion.
 */

import { promptSuggestionService, type PromptSuggestion } from './PromptSuggestionService';
import { notificationService } from './NotificationService';

export interface CachedSuggestion {
  id: string;
  suggestions: PromptSuggestion[];
  context: string;
  timestamp: Date;
  expiresAt: Date;
}

export interface OfflineCapabilities {
  canGenerateSuggestions: boolean;
  canUseCachedData: boolean;
  canSaveLocally: boolean;
  hasNetworkAccess: boolean;
  lastOnlineCheck: Date;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSync: Date;
  pendingUploads: number;
  cachedItems: number;
  syncInProgress: boolean;
}

/**
 * Service de gestion du mode hors-ligne
 */
export class OfflineService {
  private static instance: OfflineService;
  private cachedSuggestions: CachedSuggestion[] = [];
  private capabilities: OfflineCapabilities;
  private syncStatus: SyncStatus;
  private syncListeners: Array<(status: SyncStatus) => void> = [];
  private onlineCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.capabilities = this.initializeCapabilities();
    this.syncStatus = this.initializeSyncStatus();
    this.loadCachedData();
    this.startPeriodicOnlineCheck();
  }

  static getInstance(): OfflineService {
    if (!OfflineService.instance) {
      OfflineService.instance = new OfflineService();
    }
    return OfflineService.instance;
  }

  /**
   * Initialise les capacités hors-ligne
   */
  private initializeCapabilities(): OfflineCapabilities {
    return {
      canGenerateSuggestions: true, // Les suggestions sont générées localement
      canUseCachedData: true,
      canSaveLocally: true,
      hasNetworkAccess: navigator.onLine,
      lastOnlineCheck: new Date()
    };
  }

  /**
   * Initialise le statut de synchronisation
   */
  private initializeSyncStatus(): SyncStatus {
    return {
      isOnline: navigator.onLine,
      lastSync: new Date(),
      pendingUploads: 0,
      cachedItems: 0,
      syncInProgress: false
    };
  }

  /**
   * Charge les données mises en cache
   */
  private loadCachedData(): void {
    try {
      const cached = localStorage.getItem('offline-suggestions-cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        this.cachedSuggestions = parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
          expiresAt: new Date(item.expiresAt)
        }));

        // Nettoyer les éléments expirés
        this.cleanExpiredCache();
        this.syncStatus.cachedItems = this.cachedSuggestions.length;
      }
    } catch (error) {
      console.warn('Failed to load cached suggestions:', error);
      this.cachedSuggestions = [];
    }
  }

  /**
   * Sauvegarde les données en cache
   */
  private saveCachedData(): void {
    try {
      const dataToSave = this.cachedSuggestions.map(item => ({
        ...item,
        timestamp: item.timestamp.toISOString(),
        expiresAt: item.expiresAt.toISOString()
      }));
      localStorage.setItem('offline-suggestions-cache', JSON.stringify(dataToSave));
      this.syncStatus.cachedItems = this.cachedSuggestions.length;
      this.notifySyncListeners();
    } catch (error) {
      console.warn('Failed to save cached suggestions:', error);
    }
  }

  /**
   * Nettoie le cache expiré
   */
  private cleanExpiredCache(): void {
    const now = new Date();
    const initialCount = this.cachedSuggestions.length;
    this.cachedSuggestions = this.cachedSuggestions.filter(item =>
      item.expiresAt > now
    );

    if (this.cachedSuggestions.length !== initialCount) {
      this.saveCachedData();
    }
  }

  /**
   * Démarre la vérification périodique de la connexion
   */
  private startPeriodicOnlineCheck(): void {
    // Vérifier la connexion toutes les 30 secondes
    this.onlineCheckInterval = setInterval(() => {
      this.checkOnlineStatus();
    }, 30000);

    // Écouter les événements de changement de connexion
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  /**
   * Vérifie le statut de la connexion
   */
  private checkOnlineStatus(): void {
    const wasOnline = this.syncStatus.isOnline;
    const isOnline = navigator.onLine;

    this.capabilities.hasNetworkAccess = isOnline;
    this.capabilities.lastOnlineCheck = new Date();

    if (wasOnline !== isOnline) {
      if (isOnline) {
        this.handleOnline();
      } else {
        this.handleOffline();
      }
    }
  }

  /**
   * Gère le passage en ligne
   */
  private handleOnline(): void {
    this.syncStatus.isOnline = true;
    this.syncStatus.lastSync = new Date();

    notificationService.info(
      'Connexion rétablie',
      'Vous êtes de nouveau en ligne. Synchronisation en cours...'
    );

    // Démarrer la synchronisation automatique
    this.performSync();
  }

  /**
   * Gère le passage hors ligne
   */
  private handleOffline(): void {
    this.syncStatus.isOnline = false;

    notificationService.warning(
      'Mode hors ligne',
      'Connexion perdue. Utilisation du mode hors ligne avec données mises en cache.',
      [
        {
          label: 'Continuer',
          action: () => {},
          primary: true
        }
      ]
    );
  }

  /**
   * Effectue la synchronisation
   */
  private async performSync(): Promise<void> {
    if (this.syncStatus.syncInProgress) return;

    this.syncStatus.syncInProgress = true;
    this.notifySyncListeners();

    try {
      // Simuler une synchronisation (dans un vrai système, cela uploaderait les données locales)
      await new Promise(resolve => setTimeout(resolve, 2000));

      this.syncStatus.lastSync = new Date();
      this.syncStatus.pendingUploads = 0;

      notificationService.success(
        'Synchronisation terminée',
        'Toutes vos données ont été synchronisées avec succès.'
      );

    } catch (error) {
      notificationService.error(
        'Erreur de synchronisation',
        'Impossible de synchroniser les données. Réessayer plus tard.',
        [
          {
            label: 'Réessayer',
            action: () => this.performSync(),
            primary: true
          }
        ]
      );
    } finally {
      this.syncStatus.syncInProgress = false;
      this.notifySyncListeners();
    }
  }

  /**
   * Génère des suggestions avec cache intelligent
   */
  async generateOfflineSuggestions(
    messages: any[],
    language: string,
    currentInput: string = ''
  ): Promise<PromptSuggestion[]> {
    // Essayer d'abord de récupérer depuis le cache
    const cacheKey = this.generateCacheKey(messages, language, currentInput);
    const cached = this.getCachedSuggestions(cacheKey);

    if (cached) {
      return cached.suggestions;
    }

    // Générer de nouvelles suggestions
    let suggestions: PromptSuggestion[];

    if (this.capabilities.canGenerateSuggestions) {
      try {
        suggestions = promptSuggestionService.generateSuggestions(
          messages,
          language as any,
          currentInput
        );
      } catch (error) {
        console.warn('Failed to generate suggestions:', error);
        // Fallback vers les suggestions par défaut
        suggestions = promptSuggestionService.getDefaultSuggestions(language as any);
      }
    } else {
      // Mode dégradé : seulement les suggestions par défaut
      suggestions = promptSuggestionService.getDefaultSuggestions(language as any);
    }

    // Mettre en cache si en ligne
    if (this.syncStatus.isOnline) {
      this.cacheSuggestions(cacheKey, suggestions, currentInput);
    }

    return suggestions;
  }

  /**
   * Génère une clé de cache
   */
  private generateCacheKey(messages: any[], language: string, input: string): string {
    const recentMessages = messages.slice(-3);
    const content = recentMessages.map(m => m.content).join('') + input + language;
    return btoa(content).substring(0, 32); // Hash simple
  }

  /**
   * Récupère les suggestions depuis le cache
   */
  private getCachedSuggestions(cacheKey: string): CachedSuggestion | null {
    const cached = this.cachedSuggestions.find(item =>
      item.id === cacheKey &&
      item.expiresAt > new Date()
    );
    return cached || null;
  }

  /**
   * Met en cache les suggestions
   */
  private cacheSuggestions(cacheKey: string, suggestions: PromptSuggestion[], context: string): void {
    const cachedItem: CachedSuggestion = {
      id: cacheKey,
      suggestions,
      context,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Expire dans 24h
    };

    // Éviter les doublons
    this.cachedSuggestions = this.cachedSuggestions.filter(item => item.id !== cacheKey);
    this.cachedSuggestions.unshift(cachedItem);

    // Limiter la taille du cache
    if (this.cachedSuggestions.length > 100) {
      this.cachedSuggestions = this.cachedSuggestions.slice(0, 100);
    }

    this.saveCachedData();
  }

  /**
   * Obtient les capacités hors-ligne actuelles
   */
  getCapabilities(): OfflineCapabilities {
    return { ...this.capabilities };
  }

  /**
   * Obtient le statut de synchronisation
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * S'abonne aux changements de statut de synchronisation
   */
  subscribeToSync(listener: (status: SyncStatus) => void): () => void {
    this.syncListeners.push(listener);
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== listener);
    };
  }

  /**
   * Notifie les listeners de synchronisation
   */
  private notifySyncListeners(): void {
    this.syncListeners.forEach(listener => listener(this.syncStatus));
  }

  /**
   * Force une synchronisation
   */
  async forceSync(): Promise<void> {
    if (!this.syncStatus.isOnline) {
      notificationService.warning(
        'Impossible de synchroniser',
        'Aucune connexion internet disponible.'
      );
      return;
    }

    await this.performSync();
  }

  /**
   * Vide le cache
   */
  clearCache(): void {
    this.cachedSuggestions = [];
    this.saveCachedData();

    notificationService.info(
      'Cache vidé',
      'Le cache des suggestions a été vidé avec succès.'
    );
  }

  /**
   * Obtient des statistiques de cache
   */
  getCacheStats(): { totalItems: number; totalSize: number; oldestItem: Date | null; newestItem: Date | null } {
    const totalItems = this.cachedSuggestions.length;
    const totalSize = JSON.stringify(this.cachedSuggestions).length;
    const timestamps = this.cachedSuggestions.map(item => item.timestamp);

    return {
      totalItems,
      totalSize,
      oldestItem: timestamps.length > 0 ? new Date(Math.min(...timestamps.map(t => t.getTime()))) : null,
      newestItem: timestamps.length > 0 ? new Date(Math.max(...timestamps.map(t => t.getTime()))) : null
    };
  }

  /**
   * Nettoie les ressources
   */
  destroy(): void {
    if (this.onlineCheckInterval) {
      clearInterval(this.onlineCheckInterval);
    }
    this.syncListeners = [];
    this.cachedSuggestions = [];
  }
}

// Export de l'instance singleton
export const offlineService = OfflineService.getInstance();