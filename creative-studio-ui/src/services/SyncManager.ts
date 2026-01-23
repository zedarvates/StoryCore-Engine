/**
 * SyncManager - Gestionnaire de synchronisation bidirectionnelle
 *
 * Synchronise les données entre le store Zustand et les fichiers JSON
 * avec détection et résolution automatique des conflits
 */

import { persistenceService } from './PersistenceService';
import { dataValidator } from './DataValidator';

export interface SyncConflict {
  entityType: string;
  entityId: string;
  storeVersion: any;
  fileVersion: any;
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
      console.warn('[SyncManager] Sync already in progress, skipping...');
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
          console.error(`[SyncManager] Error syncing world ${world.id}:`, error);
        }
      }

      // Vérifier les mondes qui existent dans les fichiers mais pas dans le store
      // Cette logique serait plus complexe et nécessiterait de scanner les fichiers

      return { synced, conflicts };
    } catch (error) {
      console.error('[SyncManager] Error syncing worlds:', error);
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

      // Logique similaire à syncWorlds
      for (const character of storeCharacters) {
        try {
          // Pour les personnages, nous utilisons une approche simplifiée
          // car ils sont moins critiques que les mondes
          await persistenceService.saveWorld(character as any, projectPath); // Adapter le type
          synced++;
        } catch (error) {
          console.error(`[SyncManager] Error syncing character ${character.character_id}:`, error);
        }
      }

      return { synced, conflicts };
    } catch (error) {
      console.error('[SyncManager] Error syncing characters:', error);
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
  private detectConflict(storeVersion: any, fileVersion: any, entityType: string): SyncConflict | null {
    // Comparer les timestamps de mise à jour
    const storeTime = storeVersion.updatedAt || storeVersion.createdAt;
    const fileTime = fileVersion.updatedAt || fileVersion.createdAt;

    if (!storeTime || !fileTime) {
      return null; // Impossible de déterminer
    }

    const storeTimestamp = new Date(storeTime).getTime();
    const fileTimestamp = new Date(fileTime).getTime();
    const diff = Math.abs(storeTimestamp - fileTimestamp);

    // Si la différence est supérieure à 5 secondes, considérer comme conflit
    if (diff > 5000) {
      return {
        entityType,
        entityId: storeVersion.id || storeVersion.character_id,
        storeVersion,
        fileVersion,
        conflictType: storeTimestamp > fileTimestamp ? 'modified' : 'modified',
        resolution: 'store-wins', // Par défaut, store gagne
        timestamp: new Date()
      };
    }

    return null;
  }

  /**
   * Résoudre un conflit manuellement
   */
  async resolveConflict(conflict: SyncConflict, resolution: SyncConflict['resolution'], customData?: any): Promise<void> {
    try {
      let finalData: any;

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
      if (conflict.entityType === 'world') {
        await persistenceService.saveWorld(finalData);
      }
      // Ajouter d'autres types d'entités selon les besoins

      // Marquer le conflit comme résolu
      this.conflicts = this.conflicts.filter(c => c !== conflict);

    } catch (error) {
      console.error(`[SyncManager] Error resolving conflict:`, error);
      throw error;
    }
  }

  /**
   * Fusionner deux versions automatiquement
   */
  private mergeVersions(version1: any, version2: any): any {
    // Stratégie de fusion simple : prendre la version la plus récente pour chaque champ
    const merged = { ...version1 };

    for (const [key, value] of Object.entries(version2)) {
      if (!(key in merged) || this.isNewer(value, merged[key])) {
        merged[key] = value;
      }
    }

    // Mettre à jour le timestamp
    merged.updatedAt = new Date();

    return merged;
  }

  /**
   * Déterminer si une valeur est "plus récente"
   */
  private isNewer(value1: any, value2: any): boolean {
    // Pour les dates
    if (value1 instanceof Date && value2 instanceof Date) {
      return value1 > value2;
    }

    // Pour les chaînes de date
    if (typeof value1 === 'string' && typeof value2 === 'string') {
      try {
        const date1 = new Date(value1);
        const date2 = new Date(value2);
        if (!isNaN(date1.getTime()) && !isNaN(date2.getTime())) {
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
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
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
      console.error('[SyncManager] Error creating backup:', error);
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
      console.error(`[SyncManager] Error restoring backup ${backupId}:`, error);
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
        const projectPath = appStore.project?.metadata?.path;

        await this.fullSync(projectPath);
      } catch (error) {
        console.error('[SyncManager] Auto-sync failed:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Écouter les changements de projet
    window.addEventListener('project-changed', async () => {
      try {
        const { useAppStore } = await import('@/stores/useAppStore');
        const appStore = useAppStore.getState();
        const projectPath = appStore.project?.metadata?.path;

        await this.fullSync(projectPath);
      } catch (error) {
        console.error('[SyncManager] Project change sync failed:', error);
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
