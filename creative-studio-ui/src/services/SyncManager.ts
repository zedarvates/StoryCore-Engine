/**
 * SyncManager - Bidirectional synchronization manager
 *
 * Synchronizes data between Zustand store and JSON files
 * with automatic conflict detection and resolution
 */
import { LegacyAny } from '@/types/legacy';


import { persistenceService } from './PersistenceService';
import { logger } from '@/utils/logger';
import type { World } from '@/types/world';
import type { Shot } from '@/types';
import type { Character } from '@/types/character';

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
        this.syncStories(projectPath),
        this.syncMeta(projectPath),
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
   * Synchronisation   * @param _projectPath 
   */
  private async syncWorlds(_projectPath?: string): Promise<{ synced: number, conflicts: SyncConflict[] }> {
    try {
      // Importer dynamiquement pour éviter les dépendances circulaires
      const { useStore } = await import('@/store');
      const store = useStore.getState();

      const storeWorlds = Array.isArray(store.worlds) ? store.worlds : [];
      let synced = 0;
      const conflicts: SyncConflict[] = [];

      for (const world of storeWorlds) {
        try {
          // Essayer de charger depuis le fichier
          const fileWorld = await persistenceService.loadWorld(world.id, _projectPath);

          if (!fileWorld) {
            // Monde existe dans store mais pas dans fichier - sauvegarder
            await persistenceService.saveWorld(world, _projectPath);
            logger.debug(`[SyncManager] World synced to file: ${world.id}`);
            synced++;
          } else {
            // Les deux existent - vérifier les conflits
            const conflict = this.detectConflict(world, fileWorld, 'world');
            if (conflict) {
              conflicts.push(conflict);
              // Résoudre automatiquement : store wins (plus récent)
              await persistenceService.saveWorld(world, _projectPath);
            }
          }
        } catch (error) {
          logger.error(`[SyncManager] Error syncing world ${world.id}:`, error);
        }
      }

      // FIX: Check for worlds that exist in files but not in the store
      if (_projectPath && window.electronAPI?.fs?.readdir) {
          const { persistenceService } = await import('./PersistenceService');
          const worldsDir = `${_projectPath}/worlds`;
          try {
              if (await window.electronAPI.fs.exists(worldsDir)) {
                  const files = await window.electronAPI.fs.readdir(worldsDir);
                  const worldFiles = files.filter((f: string) => f.startsWith('world_') && f.endsWith('.json'));
                  
                  const currentStoreWorlds = useStore.getState().worlds || [];
                  const worldPromises = worldFiles.map(async (file) => {
                    const worldId = file.replace('world_', '').replace('.json', '');
                    if (!currentStoreWorlds.some(w => w.id === worldId)) {
                        return await persistenceService.loadWorld(worldId, _projectPath);
                    }
                    return null;
                  });

                  const loadedWorlds = (await Promise.all(worldPromises)).filter((w): w is World => !!w);
                  loadedWorlds.forEach(world => {
                      if (world) {
                          store.addWorld(world);
                          synced++;
                      }
                  });
              }
          } catch (err) {
              logger.warn('[SyncManager] Failed to scan worlds directory:', err);
          }
      }

      return { synced, conflicts };
    } catch (error) {
      logger.error('[SyncManager] Error syncing worlds:', error);
      return { synced: 0, conflicts: [] };
    }
  }

  /**
   * Synchronisation   * @param _projectPath 
   */
  private async syncCharacters(_projectPath?: string): Promise<{ synced: number, conflicts: SyncConflict[] }> {
    try {
      const { useStore } = await import('@/store');
      const store = useStore.getState();

      const storeCharacters = Array.isArray(store.characters) ? store.characters : [];
      let synced = 0;
      const conflicts: SyncConflict[] = [];

      // Synchroniser chaque personnage avec la méthode appropriée
      for (const character of storeCharacters) {
        try {
          // Utiliser saveCharacter au lieu de saveWorld
          await persistenceService.saveCharacter(character, _projectPath);
          logger.debug(`[SyncManager] Character synced: ${character.character_id}`);
          synced++;
        } catch (error) {
          logger.error(`[SyncManager] Error syncing character ${character.character_id}:`, error);
        }
      }

      // FIX: Check for characters that exist in files but not in the store
      if (_projectPath && window.electronAPI?.fs?.readdir) {
          const { persistenceService } = await import('./PersistenceService');
          const charactersDir = `${_projectPath}/characters`;
          try {
              if (await window.electronAPI.fs.exists(charactersDir)) {
                  const items = await window.electronAPI.fs.readdir(charactersDir);
                  const currentStoreChars = useStore.getState().characters;
                  const charPromises = items.map(async (folder) => {
                      if (!currentStoreChars.some((c: Character) => c.character_id === folder || c.name === folder)) {
                          return await persistenceService.loadCharacter(folder, _projectPath);
                      }
                      return null;
                  });

                  const loadedChars = (await Promise.all(charPromises)).filter((c): c is Character => !!c);
                  loadedChars.forEach(char => {
                      if (char) {
                          store.addCharacter(char);
                          synced++;
                      }
                  });
              }
          } catch (err) {
              logger.warn('[SyncManager] Failed to scan characters directory:', err);
          }
      }

      return { synced, conflicts };
    } catch (error) {
      logger.error('[SyncManager] Error syncing characters:', error);
      return { synced: 0, conflicts: [] };
    }
  }

  /**
   * Synchronisation   * @param _projectPath 
   */
  private async syncSequences(_projectPath?: string): Promise<{ synced: number, conflicts: SyncConflict[] }> {
    try {
      const { useStore } = await import('@/store');
      const store = useStore.getState();

      const storeSequences = Array.isArray(store.sequencePlans) ? store.sequencePlans : [];
      let synced = 0;
      const conflicts: SyncConflict[] = [];

      // Synchroniser chaque séquence
      await Promise.all(storeSequences.map(async (sequence) => {
        try {
          await persistenceService.saveSequencePlan(sequence, _projectPath);
        } catch (error) {
          logger.error(`[SyncManager] Error syncing sequence ${sequence.id}:`, error);
        }
      }));

      // FIX: Check for sequences that exist in files but not in the store
      if (_projectPath && window.electronAPI?.fs?.readdir) {
          const sequencesDir = `${_projectPath}/sequences`;
          try {
              if (await window.electronAPI.fs.exists(sequencesDir)) {
                  const files = await window.electronAPI.fs.readdir(sequencesDir);
                  const sequenceFiles = files.filter((f: string) => f.startsWith('sequence_') && f.endsWith('.json'));
                  
                  const { useSequencePlanStore } = await import('@/stores/sequencePlanStore');

                  for (const file of sequenceFiles) {
                      const content = await window.electronAPI.fs.readFile(`${sequencesDir}/${file}`);
                      if (content) {
                          const plan = JSON.parse(new TextDecoder().decode(content)) as import('@/types/sequencePlan').SequencePlan;
                          // REFRESH: Get latest store state inside loop to avoid duplicates
                          const currentStoreSequences = useStore.getState().sequencePlans || [];
                          if (plan && !currentStoreSequences.some(s => s.id === plan.id)) {
                              // Add to main store
                              store.addSequencePlan(plan);
                              
                              // REFRESH: Also check sequence plan store
                              const currentSeqPlanStore = useSequencePlanStore.getState();
                              if (!currentSeqPlanStore.plans.some(p => p.id === plan.id)) {
                                  // We can use setState to push to useSequencePlanStore
                                  useSequencePlanStore.setState({
                                      plans: [...currentSeqPlanStore.plans, plan]
                                  });
                              }
                              
                              synced++;
                          }
                      }
                  }
              }
          } catch (err) {
              logger.warn('[SyncManager] Failed to scan sequences directory:', err);
          }
      }

      return { synced, conflicts };
    } catch (error) {
      logger.error('[SyncManager] Error syncing sequences:', error);
      return { synced: 0, conflicts: [] };
    }
  }

  /**
   * Synchronisation   * @param _projectPath 
   */
  private async syncScenes(_projectPath?: string): Promise<{ synced: number, conflicts: SyncConflict[] }> {
    // Logique similaire pour les scènes
    return { synced: 0, conflicts: [] };
  }

  private async syncShots(projectPath?: string): Promise<{ synced: number, conflicts: SyncConflict[] }> {
    if (!projectPath || !window.electronAPI?.fs?.readdir) return { synced: 0, conflicts: [] };

    try {
      const shotsDir = `${projectPath}/shots`;
      const exists = await window.electronAPI.fs.exists(shotsDir);
      if (!exists) return { synced: 0, conflicts: [] };

      const files = await window.electronAPI.fs.readdir(shotsDir);
      const shotFiles = files.filter((f: string) => f.startsWith('shot_') && f.endsWith('.json'));

      const shotPromises = shotFiles.map(async (file) => {
        try {
          const content = await window.electronAPI.fs.readFile(`${shotsDir}/${file}`);
          return JSON.parse(new TextDecoder().decode(content));
        } catch (err) {
          logger.error(`[SyncManager] Failed to read shot file ${file}:`, err);
          return null;
        }
      });
      const allShotData = (await Promise.all(shotPromises)).filter((s): s is Shot => !!s && typeof s.id === 'string');

      let synced = 0;
      const conflicts: SyncConflict[] = [];

      const { useAppStore } = await import('@/stores/useAppStore');
      const { useStore } = await import('@/store');

      const appStore = useAppStore.getState();
      const legacyStore = useStore.getState();
      
      const currentAppShots = appStore.shots;
      const currentLegacyShots = legacyStore.shots;
      
      const shotsToAddInApp: Shot[] = [];
      const shotsToUpdateInApp: Array<{id: string, updates: Partial<Shot>}> = [];
      const shotsToUpdateInLegacy: Shot[] = [...currentLegacyShots];
      let legacyChanged = false;

      for (const shotData of allShotData) {
        const existingInApp = currentAppShots.find((s: Shot) => s.id === shotData.id);
        const existingInLegacy = currentLegacyShots.find((s: Shot) => s.id === shotData.id);

        if (!existingInApp && !existingInLegacy) {
          logger.debug(`[SyncManager] New shot found in file: ${shotData.id}`);
          shotsToAddInApp.push(shotData);
          shotsToUpdateInLegacy.push(shotData);
          legacyChanged = true;
          synced++;
        } else {
          const conflict = this.detectConflict(existingInApp || existingInLegacy, shotData, 'shot');
          if (conflict) {
            conflicts.push(conflict);
          } else if (existingInApp && JSON.stringify(existingInApp) !== JSON.stringify(shotData)) {
            shotsToUpdateInApp.push({ id: shotData.id, updates: shotData });
            const legacyIdx = shotsToUpdateInLegacy.findIndex(s => s.id === shotData.id);
            if (legacyIdx !== -1) {
              shotsToUpdateInLegacy[legacyIdx] = shotData;
              legacyChanged = true;
            }
            synced++;
          }
        }
      }

      // Batch updates
      if (shotsToAddInApp.length > 0) {
        appStore.setShots([...currentAppShots, ...shotsToAddInApp]);
      }
      
      for (const update of shotsToUpdateInApp) {
        appStore.updateShot(update.id, update.updates);
      }
      
      if (legacyChanged) {
        legacyStore.reorderShots(shotsToUpdateInLegacy);
      }

      return { synced, conflicts };
    } catch (error) {
      logger.error(`[SyncManager] Error in syncShots:`, error);
      return { synced: 0, conflicts: [] };
    }
  }

  private async syncMeta(projectPath?: string): Promise<{ synced: number, conflicts: SyncConflict[] }> {
    if (!projectPath || !window.electronAPI?.fs?.readFile) return { synced: 0, conflicts: [] };
    
    try {
      const metaPath = `${projectPath}/project_metadata.json`;
      if (!(await window.electronAPI.fs.exists(metaPath))) return { synced: 0, conflicts: [] };
      
      const content = await window.electronAPI.fs.readFile(metaPath);
      const metaData = JSON.parse(new TextDecoder().decode(content));
      
      const { useAppStore } = await import('@/stores/useAppStore');
      const store = useAppStore.getState();
      
      if (store.project?.id === metaData.id && JSON.stringify(store.project) !== JSON.stringify(metaData)) {
        logger.debug('[SyncManager] Project metadata differs from file - potentially needs update');
        // Note: Project metadata sync is usually handled by ProjectService/AppStore load
      }
      
      return { synced: 1, conflicts: [] };
    } catch (error) {
      logger.error('[SyncManager] Error syncing metadata:', error);
      return { synced: 0, conflicts: [] };
    }
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
      } else if (conflict.entityType === 'character' && isObject(finalData)) {
        await persistenceService.saveCharacter(finalData as unknown as import('@/types/character').Character);
      } else if (conflict.entityType === 'sequencePlan' && isObject(finalData)) {
        await persistenceService.saveSequencePlan(finalData as unknown as import('@/types/sequencePlan').SequencePlan);
      } else if (conflict.entityType === 'shot' && isObject(finalData)) {
        await persistenceService.saveShot(finalData as unknown as import('@/types').Shot);
      }

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
  async createBackup(_projectPath?: string): Promise<string> {
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

  public async syncStories(projectPath?: string): Promise<{ synced: number, conflicts: SyncConflict[] }> {
    if (!projectPath || !window.electronAPI?.fs?.readdir) return { synced: 0, conflicts: [] };

    try {
      let synced = 0;
      const { useStore } = await import('@/store');
      const { loadStoryPartsFromDisk, markdownToStory, parseYAMLFrontmatter } = await import('@/utils/storyFileIO');
      const store = useStore.getState();

      // 1. Check for story/ directory (Modern multi-file format)
      const storyDir = `${projectPath}/story`;
      if (await window.electronAPI.fs.exists(storyDir)) {
          const parts = await loadStoryPartsFromDisk(projectPath);
          if (parts && parts.length > 0) {
              const indexFile = `${storyDir}/story-index.md`;
              let storyTitle = 'Story';
              if (await window.electronAPI.fs.exists(indexFile)) {
                  const content = await window.electronAPI.fs.readFile(indexFile);
                  const { metadata } = parseYAMLFrontmatter(new TextDecoder().decode(content));
                  storyTitle = metadata.title || storyTitle;
              }
              
              const storyId = 'main-story';
              if (!store.getAllStories().some(s => s.id === storyId)) {
                  store.addStory({
                      id: storyId,
                      title: storyTitle,
                      parts: parts,
                      content: parts.map(p => p.content).join('\n\n'),
                      summary: parts[0]?.summary || '',
                      genre: [],
                      tone: [],
                      length: 'medium',
                      charactersUsed: [],
                      locationsUsed: [],
                      createdAt: Date.now(),
                      updatedAt: Date.now(),
                      version: 1,
                      autoGeneratedElements: []
                  } as LegacyAny);
                  synced++;
              }
          }
      }

      // 2. Check for .md files in root (Standalone formats)
      const files = await window.electronAPI.fs.readdir(projectPath);
      const mdFiles = files.filter((f: string) => f.endsWith('.md') && f !== 'README.md' && f !== 'story.md');

      for (const file of mdFiles) {
          const content = await window.electronAPI.fs.readFile(`${projectPath}/${file}`);
          if (content) {
              const storyData = markdownToStory(new TextDecoder().decode(content));
              if (storyData && !store.getAllStories().some(s => s.id === storyData.id || s.title === storyData.title)) {
                  store.addStory(storyData);
                  synced++;
              }
          }
      }

      return { synced, conflicts: [] };
    } catch (error) {
      logger.error(`[SyncManager] Error in syncStories:`, error);
      return { synced: 0, conflicts: [] };
    }
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



