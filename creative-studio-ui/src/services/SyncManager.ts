/**
 * SyncManager - Bidirectional synchronization manager
 *
 * Synchronizes data between Zustand store and JSON files
 * with automatic conflict detection and resolution
 */

import { persistenceService } from './PersistenceService';
import { logger } from '@/utils/logger';
import type { World } from '@/types/world';

export interface SyncConflict {
  entityType: string;
  entityId: string;
  storeVersion: unknown;
  fileVersion: unknown;
  conflictType: 'modified' | 'deleted' | 'created';
  resolution: 'store-wins' | 'file-wins' | 'merge' | 'manual';
  timestamp: Date;
}

export interface SyncResult {
  synced: number;
  conflicts: SyncConflict[];
  errors: string[];
  duration: number;
}

// Type guard function to check if value is a plain object
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Gestionnaire de synchronisation bidirectionnelle
 */
export class SyncManager {
  private static instance: SyncManager;
  private syncInProgress = false;
  private lastSyncTime: Date | null = null;
  private conflicts: SyncConflict[] = [];

  private constructor() {
    // Démarrer la synchronisation automatique
    this.startAutoSync();
  }

  static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  /**
   * Synchronisation complète bidirectionnelle
   */
  async fullSync(projectPath?: string): Promise<SyncResult> {
    if (this.syncInProgress) {
      logger.warn('[SyncManager] Sync already in progress, skipping...');
      return { synced: 0, conflicts: [], errors: ['Sync already in progress'], duration: 0 };
    }

    const startTime = Date.now();
    this.syncInProgress = true;

    try {

      const results = await Promise.allSettled([
        this.syncWorlds(projectPath),
        this.syncCharacters(projectPath),
        this.syncSequences(projectPath),
        this.syncScenes(projectPath),
        this.syncShots(projectPath),
      ]);

      const synced = results.reduce((acc, result) => {
        if (result.status === 'fulfilled') {
          return acc + result.value.synced;
        }
        return acc;
      }, 0);

      const allConflicts = results.flatMap(result =>
        result.status === 'fulfilled' ? result.value.conflicts : []
      );

      const errors = results.flatMap(result =>
        result.status === 'rejected' ? [result.reason?.message || 'Unknown error'] : []
      );

      const duration = Date.now() - startTime;


      this.lastSyncTime = new Date();
      this.conflicts.push(...allConflicts);

      return {
        synced,
        conflicts: allConflicts,
        errors,
        duration
      };

    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Synchronisation des mondes
   */
  private async syncWorlds(projectPath?: string): Promise<{ synced: number, conflicts: SyncConflict[] }> {
    try {
      // Importer dynamiquement pour éviter les dépendances circulaires
      const { useStore } = await import('@/store');
      const store = useStore.getState();

      const storeWorlds = store.worlds || [];
      let synced = 0;
      const conflicts: SyncConflict[] = [];

      for (const world of storeWorlds) {
        try {
          // Essayer de charger depuis le fichier
          const fileWorld = await persistenceService.loadWorld(world.id, projectPath);

          if (!fileWorld) {
            // Monde existe dans store mais pas dans fichier - sauvegarder
            await persistenceService.saveWorld(world, projectPath);
            synced++;
          } else {
            // Les deux existent - vérifier les conflits
            const conflict = this.detectConflict(world, fileWorld, 'world');
            if (conflict) {
              conflicts.push(conflict);
              // Résoudre automatiquement : store wins (plus récent)
              await persistenceService.saveWorld(world, projectPath);
            }
          }
        } catch (error) {
          logger.error(`[SyncManager] Error syncing world ${world.id}:`, error);
        }
      }

      // Vérifier les mondes qui existent dans les fichiers mais pas dans le store
      // Cette logique serait plus complexe et nécessiterait de scanner les fichiers

      return { synced, conflicts };
    } catch (error) {
      logger.error('[SyncManager] Error syncing worlds:', error);
      return { synced: 0, conflicts: [] };
    }
  }

  /**
   * Synchronisation des personnages
   */
  private async syncCharacters(projectPath?: string): Promise<{ synced: number, conflicts: SyncConflict[] }> {
    try {
      const { useStore } = await import('@/store');
      const store = useStore.getState();

      const storeCharacters = store.characters || [];
      let synced = 0;
      const conflicts: SyncConflict[] = [];

      // Synchroniser chaque personnage avec la méthode appropriée
      for (const character of storeCharacters) {
        try {
          // Utiliser saveCharacter au lieu de saveWorld
          await persistenceService.saveCharacter(character, projectPath);
          synced++;
        } catch (error) {
          logger.error(`[SyncManager] Error syncing character ${character.character_id}:`, error);
        }
      }

      return { synced, conflicts };
    } catch (error) {
      logger.error('[SyncManager] Error syncing characters:', error);
      return { synced: 0, conflicts: [] };
    }
  }

  /**
   * Synchronisation des séquences
   */
  private async syncSequences(projectPath?: string): Promise<{ synced: number, conflicts: SyncConflict[] }> {
    // Logique similaire pour les séquences
    return { synced: 0, conflicts: [] };
  }

  /**
   * Synchronisation des scènes
   */
  private async syncScenes(projectPath?: string): Promise<{ synced: number, conflicts: SyncConflict[] }> {
    // Logique similaire pour les scènes
    return { synced: 0, conflicts: [] };
  }

  /**
   * Synchronisation des plans
   */
  private async syncShots(projectPath?: string): Promise<{ synced: number, conflicts: SyncConflict[] }> {
    // Logique similaire pour les plans
    return { synced: 0, conflicts: [] };
  }

  /**
   * Détection de conflits entre versions
   */
  private detectConflict(storeVersion: unknown, fileVersion: unknown, entityType: string): SyncConflict | null {
    // Type guard to check if it's a valid object with timestamps
    if (!isObject(storeVersion) || !isObject(fileVersion)) {
      return null;
    }

    // Comparer les timestamps de mise à jour
    const storeTime = (storeVersion as Record<string, unknown>).updatedAt || (storeVersion as Record<string, unknown>).createdAt;
    const fileTime = (fileVersion as Record<string, unknown>).updatedAt || (fileVersion as Record<string, unknown>).createdAt;

    if (!storeTime || !fileTime) {
      return null; // Impossible de déterminer
    }

    const storeTimestamp = new Date(storeTime as string).getTime();
    const fileTimestamp = new Date(fileTime as string).getTime();
    const diff = Math.abs(storeTimestamp - fileTimestamp);

    // Si la différence est supérieure à 5 secondes, considérer comme conflit
    if (diff > 5000) {
      return {
        entityType,
        entityId: String((storeVersion as Record<string, unknown>).id || (storeVersion as Record<string, unknown>).character_id || ''),
        storeVersion,
        fileVersion,
        conflictType: 'modified',
        resolution: 'store-wins', // Par défaut, store gagne
        timestamp: new Date()
      };
    }

    return null;
  }

  /**
   * Résoudre un conflit manuellement
   */
  async resolveConflict(conflict: SyncConflict, resolution: SyncConflict['resolution'], customData?: unknown): Promise<void> {
    try {
      let finalData: unknown;

      switch (resolution) {
        case 'store-wins':
          finalData = conflict.storeVersion;
          break;
        case 'file-wins':
          finalData = conflict.fileVersion;
          break;
        case 'merge':
          finalData = this.mergeVersions(conflict.storeVersion, conflict.fileVersion);
          break;
        case 'manual':
          finalData = customData;
          break;
      }

      // Sauvegarder la version résolue
      if (conflict.entityType === 'world' && isObject(finalData)) {
        await persistenceService.saveWorld(finalData as unknown as World);
      }
      // Ajouter d'autres types d'entités selon les besoins

      // Marquer le conflit comme résolu
      this.conflicts = this.conflicts.filter(c => c !== conflict);

    } catch (error) {
      logger.error(`[SyncManager] Error resolving conflict:`, error);
      throw error;
    }
  }

  /**
   * Fusionner deux versions automatiquement
   */
  private mergeVersions(version1: unknown, version2: unknown): unknown {
    // Stratégie de fusion simple : prendre la version la plus récente pour chaque champ
    if (!isObject(version1)) {
      return version2;
    }
    const obj1 = version1 as Record<string, unknown>;
    const merged: Record<string, unknown> = { ...obj1 };

    if (isObject(version2)) {
      const obj2 = version2 as Record<string, unknown>;
      for (const [key, value] of Object.entries(obj2)) {
        if (!(key in merged) || this.isNewer(value, merged[key])) {
          merged[key] = value;
        }
      }
    }

    // Mettre à jour le timestamp
    merged.updatedAt = new Date();

    return merged;
  }

  /**
   * Déterminer si une valeur est "plus récente"
   */
  private isNewer(value1: unknown, value2: unknown): boolean {
    // Pour les dates
    if (value1 instanceof Date && value2 instanceof Date) {
      return value1 > value2;
    }

    // Pour les chaînes de date
    if (typeof value1 === 'string' && typeof value2 === 'string') {
      try {
        const date1 = new Date(value1);
        const date2 = new Date(value2);
        if (!Number.isNaN(date1.getTime()) && !Number.isNaN(date2.getTime())) {
          return date1 > date2;
        }
      } catch {
        // Pas des dates valides
      }
    }

    // Par défaut, considérer la première valeur comme plus récente
    return true;
  }

  /**
   * Créer un backup automatique
   */
  async createBackup(projectPath?: string): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
      const backupId = `backup-${timestamp}`;

      // Sauvegarder toutes les entités
      const { useStore } = await import('@/store');
      const store = useStore.getState();

      const backupData = {
        id: backupId,
        timestamp: new Date(),
        data: {
          worlds: store.worlds,
          characters: store.characters,
          project: store.project
        }
      };

      // Sauvegarder dans localStorage avec une clé spéciale
      const backupKey = `backup_${backupId}`;
      localStorage.setItem(backupKey, JSON.stringify(backupData));

      return backupId;
    } catch (error) {
      logger.error('[SyncManager] Error creating backup:', error);
      throw error;
    }
  }

  /**
   * Restaurer depuis un backup
   */
  async restoreFromBackup(backupId: string): Promise<void> {
    try {
      const backupKey = `backup_${backupId}`;
      const backupDataStr = localStorage.getItem(backupKey);

      if (!backupDataStr) {
        throw new Error(`Backup ${backupId} not found`);
      }

      const backupData = JSON.parse(backupDataStr);

      // Restaurer les données dans le store
      const { useStore } = await import('@/store');
      const store = useStore.getState();

      // Restaurer mondes
      for (const world of backupData.data.worlds || []) {
        await store.addWorld(world);
      }

      // Restaurer personnages
      for (const character of backupData.data.characters || []) {
        await store.addCharacter(character);
      }

    } catch (error) {
      logger.error(`[SyncManager] Error restoring backup ${backupId}:`, error);
      throw error;
    }
  }

  /**
   * Démarrer la synchronisation automatique
   */
  private startAutoSync(): void {
    // Synchroniser toutes les 5 minutes
    setInterval(async () => {
      try {
        // Obtenir le chemin du projet actuel
        const { useAppStore } = await import('@/stores/useAppStore');
        const appStore = useAppStore.getState();
        const projectPath = appStore.project?.metadata?.path as string | undefined;

        await this.fullSync(projectPath);
      } catch (error) {
        logger.error('[SyncManager] Auto-sync failed:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Écouter les changements de projet
    globalThis.addEventListener('project-changed', async () => {
      try {
        const { useAppStore } = await import('@/stores/useAppStore');
        const appStore = useAppStore.getState();
        const projectPath = appStore.project?.metadata?.path as string | undefined;

        await this.fullSync(projectPath);
      } catch (error) {
        logger.error('[SyncManager] Project change sync failed:', error);
      }
    });
  }

  /**
   * Obtenir l'état actuel de la synchronisation
   */
  getSyncStatus(): {
    inProgress: boolean;
    lastSyncTime: Date | null;
    conflictCount: number;
    recentConflicts: SyncConflict[];
  } {
    return {
      inProgress: this.syncInProgress,
      lastSyncTime: this.lastSyncTime,
      conflictCount: this.conflicts.length,
      recentConflicts: this.conflicts.slice(-5) // Derniers 5 conflits
    };
  }

  /**
   * Nettoyer les anciens conflits résolus
   */
  cleanupOldConflicts(maxAge: number = 24 * 60 * 60 * 1000): void { // 24h par défaut
    const cutoff = Date.now() - maxAge;
    this.conflicts = this.conflicts.filter(conflict => conflict.timestamp.getTime() > cutoff);
  }
}

// Export de l'instance singleton
export const syncManager = SyncManager.getInstance();



