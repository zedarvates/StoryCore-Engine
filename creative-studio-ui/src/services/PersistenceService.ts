/**
 * PersistenceService - Service unifié de persistance multi-couches
 *
 * Fournit une persistance robuste avec fallbacks et retry logic
 * pour garantir que les données sont sauvegardées même en cas de failure
 */

import { World } from '@/types/world';
import { Character } from '@/types/character';
import { loggingService } from './LoggingService';

export interface PersistenceResult {
  success: boolean;
  layer: 'store' | 'localStorage' | 'file' | 'fallback';
  error?: string;
  retryCount?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Service de persistance unifié avec multi-layer fallbacks
 */
export class PersistenceService {
  private static instance: PersistenceService;
  private retryQueue: Map<string, { operation: () => Promise<any>, retries: number }> = new Map();

  private constructor() {
    // Démarrer le processing de la queue de retry
    this.processRetryQueue();
  }

  static getInstance(): PersistenceService {
    if (!PersistenceService.instance) {
      PersistenceService.instance = new PersistenceService();
    }
    return PersistenceService.instance;
  }

  /**
   * Sauvegarde un monde avec multi-layer persistance
   */
  async saveWorld(world: World, projectPath?: string): Promise<PersistenceResult[]> {
    const results: PersistenceResult[] = [];

    // Validation des données
    const validation = this.validateWorld(world);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Layer 1: Store Zustand (si disponible)
    try {
      results.push(await this.saveToStore(world));
    } catch (error) {
      console.warn('[PersistenceService] Store save failed:', error);
      results.push({
        success: false,
        layer: 'store',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Layer 2: localStorage
    try {
      results.push(await this.saveToLocalStorage(world, projectPath));
    } catch (error) {
      console.warn('[PersistenceService] localStorage save failed:', error);
      results.push({
        success: false,
        layer: 'localStorage',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Layer 3: Fichier JSON du projet
    if (projectPath) {
      try {
        results.push(await this.saveToFile(world, projectPath));
      } catch (error) {
        console.warn('[PersistenceService] File save failed:', error);
        results.push({
          success: false,
          layer: 'file',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Si toutes les couches ont échoué, utiliser fallback
    const successfulLayers = results.filter(r => r.success);
    if (successfulLayers.length === 0) {
      try {
        results.push(await this.saveToFallback(world));
      } catch (error) {
        console.error('[PersistenceService] All persistence layers failed:', error);
      }
    }

    return results;
  }

  /**
   * Charge un monde depuis les différentes couches
   */
  async loadWorld(worldId: string, projectPath?: string): Promise<World | null> {
    // Essayer d'abord les fichiers du projet
    if (projectPath) {
      try {
        const world = await this.loadFromFile(worldId, projectPath);
        if (world) return world;
      } catch (error) {
        console.warn('[PersistenceService] File load failed:', error);
      }
    }

    // Puis localStorage
    try {
      const world = await this.loadFromLocalStorage(worldId, projectPath);
      if (world) return world;
    } catch (error) {
      console.warn('[PersistenceService] localStorage load failed:', error);
    }

    // Enfin le store
    try {
      const world = await this.loadFromStore(worldId);
      if (world) return world;
    } catch (error) {
      console.warn('[PersistenceService] Store load failed:', error);
    }

    return null;
  }

  /**
   * Sauvegarde dans le store Zustand
   */
  private async saveToStore(world: World): Promise<PersistenceResult> {
    return this.retryOperation(async () => {
      // Importer dynamiquement pour éviter les dépendances circulaires
      const { useStore } = await import('@/store');
      const store = useStore.getState();
      store.addWorld(world);

      return { success: true, layer: 'store' as const };
    }, 3);
  }

  /**
   * Sauvegarde dans localStorage
   */
  private async saveToLocalStorage(world: World, projectPath?: string): Promise<PersistenceResult> {
    return this.retryOperation(async () => {
      const projectName = projectPath ?
        projectPath.split(/[/\\]/).pop() || 'unknown' :
        'default';

      const key = `project-${projectName}-worlds`;
      const existingWorlds = JSON.parse(localStorage.getItem(key) || '[]');
      const updatedWorlds = existingWorlds.filter((w: World) => w.id !== world.id);
      updatedWorlds.push(world);

      localStorage.setItem(key, JSON.stringify(updatedWorlds));

      return { success: true, layer: 'localStorage' as const };
    }, 3);
  }

  /**
   * Sauvegarde dans un fichier JSON
   */
  private async saveToFile(world: World, projectPath: string): Promise<PersistenceResult> {
    return this.retryOperation(async () => {
      // Utiliser l'API Electron pour sauvegarder
      if (window.electronAPI?.fs?.writeFile) {
        const worldsDir = `${projectPath}/worlds`;
        const fileName = `world_${world.id}.json`;
        const filePath = `${worldsDir}/${fileName}`;

        // S'assurer que le dossier existe
        if (window.electronAPI.fs.ensureDir) {
          await window.electronAPI.fs.ensureDir(worldsDir);
        }

        const jsonData = JSON.stringify(world, null, 2);
        const encoder = new TextEncoder();
        const dataBuffer = Buffer.from(encoder.encode(jsonData));

        await window.electronAPI.fs.writeFile(filePath, dataBuffer);

        return { success: true, layer: 'file' as const };
      }

      // Fallback: déclencher un téléchargement
      this.downloadAsFile(world, `world_${world.id}.json`);

      return { success: true, layer: 'file' as const };
    }, 3);
  }

  /**
   * Sauvegarde de fallback (IndexedDB ou autre)
   */
  private async saveToFallback(world: World): Promise<PersistenceResult> {
    return this.retryOperation(async () => {
      // Utiliser IndexedDB comme fallback
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['worlds'], 'readwrite');
      const store = transaction.objectStore('worlds');

      await new Promise((resolve, reject) => {
        const request = store.put(world);
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });

      return { success: true, layer: 'fallback' as const };
    }, 3);
  }

  /**
   * Charge depuis un fichier JSON
   */
  private async loadFromFile(worldId: string, projectPath: string): Promise<World | null> {
    if (window.electronAPI?.fs?.readFile) {
      const worldsDir = `${projectPath}/worlds`;
      const fileName = `world_${worldId}.json`;
      const filePath = `${worldsDir}/${fileName}`;

      try {
        const buffer = await window.electronAPI.fs.readFile(filePath);
        const jsonString = new TextDecoder().decode(buffer);
        return JSON.parse(jsonString);
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  /**
   * Charge depuis localStorage
   */
  private async loadFromLocalStorage(worldId: string, projectPath?: string): Promise<World | null> {
    const projectName = projectPath ?
      projectPath.split(/[/\\]/).pop() || 'unknown' :
      'default';

    const key = `project-${projectName}-worlds`;
    const worldsData = localStorage.getItem(key);

    if (worldsData) {
      try {
        const worlds: World[] = JSON.parse(worldsData);
        return worlds.find(w => w.id === worldId) || null;
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  /**
   * Charge depuis le store
   */
  private async loadFromStore(worldId: string): Promise<World | null> {
    const { useStore } = await import('@/store');
    const store = useStore.getState();
    return store.getWorldById(worldId) || null;
  }

  /**
   * Validation des données du monde
   */
  private validateWorld(world: World): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validation de base
    if (!world.id || typeof world.id !== 'string') {
      errors.push('World ID is required and must be a string');
    }

    if (!world.name || world.name.trim().length === 0) {
      errors.push('World name is required');
    }

    if (!world.genre || !Array.isArray(world.genre) || world.genre.length === 0) {
      errors.push('At least one genre is required');
    }

    if (!world.timePeriod || world.timePeriod.trim().length === 0) {
      warnings.push('Time period is recommended for better world consistency');
    }

    // Validation des données complexes
    if (world.locations && Array.isArray(world.locations)) {
      world.locations.forEach((location, index) => {
        if (!location.name || location.name.trim().length === 0) {
          errors.push(`Location ${index + 1} must have a name`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Téléchargement d'un fichier comme fallback
   */
  private downloadAsFile(data: any, filename: string): void {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  /**
   * Ouvre la base IndexedDB
   */
  private async openIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('StoryCore_Persistence', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('worlds')) {
          db.createObjectStore('worlds', { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Retry logic avec exponential backoff
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt);
          console.warn(`[PersistenceService] Operation failed, retrying in ${delay}ms...`, error);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  /**
   * Traite la queue de retry en arrière-plan
   */
  private async processRetryQueue(): Promise<void> {
    setInterval(async () => {
      for (const [id, { operation, retries }] of this.retryQueue.entries()) {
        if (retries < 3) {
          try {
            await operation();
            this.retryQueue.delete(id);
            console.log(`[PersistenceService] Queued operation ${id} succeeded`);
          } catch (error) {
            this.retryQueue.set(id, { operation, retries: retries + 1 });
            console.warn(`[PersistenceService] Queued operation ${id} failed again (${retries + 1}/3)`);
          }
        } else {
          console.error(`[PersistenceService] Queued operation ${id} failed permanently after 3 retries`);
          this.retryQueue.delete(id);
        }
      }
    }, 30000); // Vérifier toutes les 30 secondes
  }

  /**
   * Synchronise les données entre les couches
   */
  async syncData(projectPath?: string): Promise<{ synced: number, errors: number }> {
    let synced = 0;
    let errors = 0;

    try {
      // Synchroniser les mondes
      const { useStore } = await import('@/store');
      const store = useStore.getState();
      const worlds = store.worlds;

      for (const world of worlds) {
        try {
          await this.saveWorld(world, projectPath);
          synced++;
        } catch (error) {
          console.error(`[PersistenceService] Sync failed for world ${world.id}:`, error);
          errors++;
        }
      }
    } catch (error) {
      console.error('[PersistenceService] Sync process failed:', error);
      errors++;
    }

    return { synced, errors };
  }
}

// Export de l'instance singleton
export const persistenceService = PersistenceService.getInstance();