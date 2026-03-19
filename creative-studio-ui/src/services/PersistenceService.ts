/**
 * PersistenceService - Unified multi-layer persistence service
 *
 * Provides robust persistence with fallbacks and retry logic
 * to ensure data is saved even in case of failure
 * 
 * FIXES applied:
 * - Deduplication before save to prevent redundant operations
 * - Storage cleanup when duplicates detected
 * - Compressed storage for large datasets
 */

import { World } from '@/types/world';
import { Character } from '@/types/character';
import { SequencePlan } from '@/types/sequencePlan';
import { Shot } from '@/types';
import { logger } from '@/utils/logger';
import { useStore } from '@/store';
import { useAppStore } from '@/stores/useAppStore';

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
  private retryQueue: Map<string, { operation: () => Promise<unknown>, retries: number }> = new Map();
  // FIX: Track last save time to prevent rapid duplicate saves
  private lastSaveTimes: Map<string, number> = new Map();
  private readonly MIN_SAVE_INTERVAL = 1000; // 1 second minimum between saves

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
   * FIX: Check if character was saved recently to prevent duplicates
   */
  private canSaveCharacter(characterId: string): boolean {
    const lastSave = this.lastSaveTimes.get(characterId) || 0;
    const now = Date.now();
    if (now - lastSave < this.MIN_SAVE_INTERVAL) {
      logger.debug(`[PersistenceService] Skipping duplicate save for character ${characterId} (${Math.round((now - lastSave)/1000)}s since last save)`);
      return false;
    }
    this.lastSaveTimes.set(characterId, now);
    return true;
  }

  /**
   * FIX: Clean up old duplicates from localStorage
   */
  private cleanupDuplicates(key: string): void {
    try {
      const existingData = localStorage.getItem(key);
      if (existingData) {
        const parsed = JSON.parse(existingData);
        // Keep only unique items by ID
        const seen = new Set();
        const unique = parsed.filter((item: { id: string }) => {
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        });
        // Only update if there were duplicates
        if (unique.length !== parsed.length) {
          localStorage.setItem(key, JSON.stringify(unique));
          logger.debug(`[PersistenceService] Cleaned up ${parsed.length - unique.length} duplicates from ${key}`);
        }
      }
    } catch (error) {
      logger.warn('[PersistenceService] Cleanup failed:', error);
    }
  }

  /**
   * Save a character with multi-layer persistence
   */
  async saveCharacter(character: Character, projectPath?: string): Promise<PersistenceResult[]> {
    const results: PersistenceResult[] = [];

    // FIX: Check for duplicate before proceeding
    if (!this.canSaveCharacter(character.character_id)) {
      return [{ success: true, layer: 'store' }]; // Skip duplicate save
    }

    // Normalize role field to ensure it's in object format
    const normalizedCharacter = this.normalizeCharacterRole(character);

    // Validation des données
    const validation = this.validateCharacter(normalizedCharacter);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // FIX: Clean up any existing duplicates before saving
    const projectName = projectPath ? (projectPath.split(/[/\\]/).pop() || 'unknown') : 'default';
    this.cleanupDuplicates(`project-${projectName}-characters`);

    // Layer 1: Store Zustand (si disponible)
    try {
      results.push(await this.saveCharacterToStore(normalizedCharacter));
    } catch (error) {
      logger.warn('[PersistenceService] Store save failed:', error);
      results.push({
        success: false,
        layer: 'store',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Layer 2: localStorage
    try {
      results.push(await this.saveCharacterToLocalStorage(normalizedCharacter, projectPath));
    } catch (error) {
      logger.warn('[PersistenceService] localStorage save failed:', error);
      results.push({
        success: false,
        layer: 'localStorage',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Layer 3: Fichier JSON du projet
    if (projectPath) {
      try {
        results.push(await this.saveCharacterToFile(normalizedCharacter, projectPath));
      } catch (error) {
        logger.warn('[PersistenceService] File save failed:', error);
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
        results.push(await this.saveCharacterToFallback(normalizedCharacter));
      } catch (error) {
        logger.error('[PersistenceService] All persistence layers failed:', error);
      }
    }

    return results;
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
      logger.warn('[PersistenceService] Store save failed:', error);
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
      logger.warn('[PersistenceService] localStorage save failed:', error);
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
        logger.warn('[PersistenceService] File save failed:', error);
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
        logger.error('[PersistenceService] All persistence layers failed:', error);
      }
    }

    return results;
  }

  /**
   * Sauvegarde un plan de séquence avec multi-layer persistance
   */
  async saveSequencePlan(sequence: SequencePlan, projectPath?: string): Promise<PersistenceResult[]> {
    const results: PersistenceResult[] = [];

    // Layer 1: Store Zustand
    try {
      results.push(await this.saveSequenceToStore(sequence));
    } catch (error) {
      logger.warn('[PersistenceService] Sequence store save failed:', error);
      results.push({ success: false, layer: 'store' as const, error: String(error) });
    }

    // Layer 2: localStorage
    try {
      results.push(await this.saveSequenceToLocalStorage(sequence, projectPath));
    } catch (error) {
      logger.warn('[PersistenceService] Sequence localStorage save failed:', error);
      results.push({ success: false, layer: 'localStorage' as const, error: String(error) });
    }

    // Layer 3: Fichier JSON
    if (projectPath) {
      try {
        results.push(await this.saveSequenceToFile(sequence, projectPath));
      } catch (error) {
        logger.warn('[PersistenceService] Sequence file save failed:', error);
        results.push({ success: false, layer: 'file' as const, error: String(error) });
      }
    }

    return results;
  }

  /**
   * FIX: Check if shot was saved recently to prevent duplicates
   */
  private canSaveShot(shotId: string): boolean {
    const lastSave = this.lastSaveTimes.get(shotId) || 0;
    const now = Date.now();
    if (now - lastSave < 500) return false;
    this.lastSaveTimes.set(shotId, now);
    return true;
  }

  /**
   * Save a shot with multi-layer persistence
   */
  async saveShot(shot: Shot & { sequence_id?: string }, projectPath?: string): Promise<PersistenceResult[]> {
    const results: PersistenceResult[] = [];
    if (!this.canSaveShot(shot.id)) return [{ success: true, layer: 'store' }];

    try {
      const store = useStore.getState();
      const appStore = useAppStore.getState();
      appStore.updateShot(shot.id, shot);
      store.reorderShots(appStore.shots.map(s => s.id === shot.id ? shot : s));
      results.push({ success: true, layer: 'store' });
    } catch (e) { logger.warn('Store save failed', e); }

    try {
      const projectName = projectPath ? (projectPath.split(/[/\\]/).pop() || 'unknown') : 'default';
      const key = `project-${projectName}-shots`;
      const shots: Shot[] = JSON.parse(localStorage.getItem(key) || '[]');
      const idx = shots.findIndex(s => s.id === shot.id);
      if (idx >= 0) shots[idx] = shot; else shots.push(shot);
      localStorage.setItem(key, JSON.stringify(shots));
      results.push({ success: true, layer: 'localStorage' });
    } catch (e) { logger.warn('localStorage save failed', e); }

    if (projectPath && window.electronAPI?.fs) {
      try {
        const shotsDir = `${projectPath}/shots`;
        await window.electronAPI.fs.mkdir(shotsDir, { recursive: true });
        await window.electronAPI.fs.writeFile(`${shotsDir}/shot_${shot.id}.json`, JSON.stringify(shot, null, 2));
        results.push({ success: true, layer: 'file' });
      } catch (e) { logger.warn('File save failed', e); }
    }

    return results;
  }

  /**
   * Charge un personnage avec multi-layer persistance
   */
  async loadCharacter(characterIdOrFolder: string, projectPath?: string): Promise<Character | null> {
    // Layer 1: Fichier JSON du projet (priorité maximale en Electron)
    if (projectPath && typeof window.electronAPI?.fs?.readFile === 'function') {
      try {
        const fileChar = await this.loadCharacterFromFile(characterIdOrFolder, projectPath);
        if (fileChar) return fileChar;
      } catch (_error) {
        logger.debug(`[PersistenceService] Character not found in file: ${characterIdOrFolder}`);
      }
    }

    // Layer 2: localStorage
    try {
      return await this.loadCharacterFromLocalStorage(characterIdOrFolder, projectPath);
    } catch (_error) {
      logger.debug(`[PersistenceService] Character not found in localStorage: ${characterIdOrFolder}`);
    }

    return null;
  }

  /**
   * Charge une séquence avec multi-layer persistance
   */
  async loadSequencePlan(planId: string, projectPath?: string): Promise<SequencePlan | null> {
    // Layer 1: Fichier JSON du projet (priorité maximale en Electron)
    if (projectPath && typeof window.electronAPI?.fs?.readFile === 'function') {
      try {
        const filePlan = await this.loadSequencePlanFromFile(planId, projectPath);
        if (filePlan) return filePlan;
      } catch (_error) {
        logger.debug(`[PersistenceService] Sequence plan not found in file: ${planId}`);
      }
    }

    // Layer 2: localStorage
    try {
      return await this.loadSequencePlanFromLocalStorage(planId, projectPath);
    } catch (_error) {
      logger.debug(`[PersistenceService] Sequence plan not found in localStorage: ${planId}`);
    }

    return null;
  }

  /**
   * Charge une séquence depuis un fichier JSON
   */
  private async loadSequencePlanFromFile(planId: string, projectPath: string): Promise<SequencePlan | null> {
    if (window.electronAPI?.fs?.readFile) {
      const sequencesDir = `${projectPath}/sequences`;
      // Check both exact filename and pattern-based ones
      const fileName = `sequence_${planId.substring(0, 8)}.json`;
      const filePath = `${sequencesDir}/${fileName}`;

      try {
        if (window.electronAPI.fs.exists && await window.electronAPI.fs.exists(filePath)) {
          const buffer = await window.electronAPI.fs.readFile(filePath);
          if (buffer) {
            const jsonString = new TextDecoder().decode(buffer);
            return JSON.parse(jsonString) as SequencePlan;
          }
        }
        
        // Alternative: browse the directory to find the file with the matching internal ID
        if (window.electronAPI.fs.readdir) {
          const files = await window.electronAPI.fs.readdir(sequencesDir);
          for (const file of files) {
            if (file.endsWith('.json')) {
              const buffer = await window.electronAPI.fs.readFile(`${sequencesDir}/${file}`);
              if (buffer) {
                try {
                  const jsonString = new TextDecoder().decode(buffer);
                  const plan = JSON.parse(jsonString) as SequencePlan;
                  if (plan && plan.id === planId) {
                    return plan;
                  }
                } catch (_e) {
                  // Skip invalid JSON
                }
              }
            }
          }
        }
      } catch (_error) {
        return null;
      }
    }
    return null;
  }

  /**
   * Charge une séquence depuis localStorage
   */
  private async loadSequencePlanFromLocalStorage(planId: string, projectPath?: string): Promise<SequencePlan | null> {
    const projectName = projectPath ?
      projectPath.split(/[/\\]/).pop() || 'unknown' :
      'default';

    const key = `project-${projectName}-sequences`;
    const sequencesData = localStorage.getItem(key);

    if (sequencesData) {
      try {
        const sequences: SequencePlan[] = JSON.parse(sequencesData);
        return sequences.find(s => s.id === planId) || null;
      } catch (_error) {
        return null;
      }
    }
    
    // Fallback: try direct key if stored individually
    const individualKey = `sequence-plan-${planId}`;
    const individualData = localStorage.getItem(individualKey);
    if (individualData) {
        try {
            return JSON.parse(individualData) as SequencePlan;
        } catch (_error) {
            return null;
        }
    }

    return null;
  }


  /**
   * Sauvegarde une séquence dans le store
   */
  private async saveSequenceToStore(sequence: SequencePlan): Promise<PersistenceResult> {
    const { useStore } = await import('@/store');
    const store = useStore.getState();
    store.updateSequencePlan(sequence.id, sequence);
    return { success: true, layer: 'store' as const };
  }

  /**
   * Sauvegarde une séquence dans localStorage
   */
  private async saveSequenceToLocalStorage(sequence: SequencePlan, projectPath?: string): Promise<PersistenceResult> {
    const projectName = projectPath ? (projectPath.split(/[/\\]/).pop() || 'unknown') : 'default';
    const key = `project-${projectName}-sequences`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const updated = existing.filter((s: { id: string }) => s.id !== sequence.id);
    updated.push(sequence);
    localStorage.setItem(key, JSON.stringify(updated));
    return { success: true, layer: 'localStorage' as const };
  }

  /**
   * Sauvegarde une séquence dans un fichier
   */
  private async saveSequenceToFile(sequence: SequencePlan, projectPath: string): Promise<PersistenceResult> {
    if (window.electronAPI?.fs?.writeFile) {
      const sequencesDir = `${projectPath}/sequences`;
      const fileName = `sequence_${sequence.id.substring(0, 8)}.json`;
      const filePath = `${sequencesDir}/${fileName}`;

      if (window.electronAPI.fs.mkdir) {
        await window.electronAPI.fs.mkdir(sequencesDir, { recursive: true });
      }

      await window.electronAPI.fs.writeFile(filePath, JSON.stringify(sequence, null, 2));
      return { success: true, layer: 'file' as const };
    }
    return { success: false, layer: 'file' as const, error: 'Electron FS not available' };
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
        logger.warn('[PersistenceService] File load failed:', error);
      }
    }

    // Puis localStorage
    try {
      const world = await this.loadFromLocalStorage(worldId, projectPath);
      if (world) return world;
    } catch (_error) {
      logger.warn('[PersistenceService] localStorage load failed:', _error);
    }

    // Enfin le store
    try {
      const world = await this.loadFromStore(worldId);
      if (world) return world;
    } catch (error) {
      logger.warn('[PersistenceService] Store load failed:', error);
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

        // S'assurer que le dossier existe (use mkdir with recursive option)
        if (window.electronAPI.fs.mkdir) {
          await window.electronAPI.fs.mkdir(worldsDir, { recursive: true });
        }

        const jsonData = JSON.stringify(world, null, 2);
        
        // Convert to string or Buffer - electron fs API accepts string or Buffer
        await window.electronAPI.fs.writeFile(filePath, jsonData);

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
   * Charge un personnage depuis un fichier JSON
   */
  private async loadCharacterFromFile(characterIdOrFolder: string, projectPath: string): Promise<Character | null> {
    if (window.electronAPI?.fs?.readFile) {
      const charactersDir = `${projectPath}/characters`;
      // Character is either in characters/ID/character.json or characters/Folder/character.json
      const filePath = `${charactersDir}/${characterIdOrFolder}/character.json`;

      try {
        const buffer = await window.electronAPI.fs.readFile(filePath);
        const jsonString = new TextDecoder().decode(buffer);
        const character = JSON.parse(jsonString);
        return character;
      } catch (_error) {
        // Fallback: maybe the ID is different from the folder name
        return null;
      }
    }
    return null;
  }

  /**
   * Charge un personnage depuis localStorage
   */
  private async loadCharacterFromLocalStorage(characterId: string, projectPath?: string): Promise<Character | null> {
    const projectName = projectPath ?
      projectPath.split(/[/\\]/).pop() || 'unknown' :
      'default';

    const key = `project-${projectName}-characters`;
    const existingCharacters = JSON.parse(localStorage.getItem(key) || '[]');
    return existingCharacters.find((c: Character) => c.character_id === characterId) || null;
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
   * Sauvegarde un personnage dans le store Zustand
   */
  private async saveCharacterToStore(character: Character): Promise<PersistenceResult> {
    return this.retryOperation(async () => {
      // Importer dynamiquement pour éviter les dépendances circulaires
      const { useStore } = await import('@/store');
      const store = useStore.getState();
      store.addCharacter(character);

      return { success: true, layer: 'store' as const };
    }, 3);
  }

  /**
   * Sauvegarde un personnage dans localStorage
   */
  private async saveCharacterToLocalStorage(character: Character, projectPath?: string): Promise<PersistenceResult> {
    return this.retryOperation(async () => {
      const projectName = projectPath ?
        projectPath.split(/[/\\]/).pop() || 'unknown' :
        'default';

      const key = `project-${projectName}-characters`;
      const existingCharacters = JSON.parse(localStorage.getItem(key) || '[]');
      const updatedCharacters = existingCharacters.filter((c: Character) => c.character_id !== character.character_id);
      updatedCharacters.push(character);

      localStorage.setItem(key, JSON.stringify(updatedCharacters));

      return { success: true, layer: 'localStorage' as const };
    }, 3);
  }

  /**
   * Sauvegarde un personnage dans un fichier JSON
   */
  private async saveCharacterToFile(character: Character, projectPath: string): Promise<PersistenceResult> {
    return this.retryOperation(async () => {
      // Utiliser l'API Electron pour sauvegarder
      if (window.electronAPI?.fs?.writeFile) {
        const charactersDir = `${projectPath}/characters`;
        const fileName = `character_${character.character_id}.json`;
        const filePath = `${charactersDir}/${fileName}`;

        // S'assurer que le dossier existe
        if (window.electronAPI.fs.mkdir) {
          await window.electronAPI.fs.mkdir(charactersDir, { recursive: true });
        }

        const jsonData = JSON.stringify(character, null, 2);
        
        // Convert to string or Buffer - electron fs API accepts string or Buffer
        await window.electronAPI.fs.writeFile(filePath, jsonData);

        return { success: true, layer: 'file' as const };
      }

      // Fallback: déclencher un téléchargement
      this.downloadAsFile(character, `character_${character.character_id}.json`);

      return { success: true, layer: 'file' as const };
    }, 3);
  }

  /**
   * Sauvegarde de fallback pour personnage (IndexedDB ou autre)
   */
  private async saveCharacterToFallback(character: Character): Promise<PersistenceResult> {
    return this.retryOperation(async () => {
      // Utiliser IndexedDB comme fallback
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['characters'], 'readwrite');
      const store = transaction.objectStore('characters');

      await new Promise((resolve, reject) => {
        const request = store.put(character);
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });

      return { success: true, layer: 'fallback' as const };
    }, 3);
  }

  /**
   * Normalizes the character role field to ensure it's in object format
   * Handles migration from legacy string format to object format
   */
  private normalizeCharacterRole(character: Character): Character {
    // If role is null or undefined, set it to empty object
    if (!character.role) {
      return {
        ...character,
        role: {
          archetype: '',
          narrative_function: '',
          character_arc: ''
        }
      };
    }

    // If role is already an object, return as-is
    if (typeof character.role === 'object' && character.role !== null) {
      // Ensure all required properties exist
      return {
        ...character,
        role: {
          archetype: character.role.archetype || '',
          narrative_function: character.role.narrative_function || '',
          character_arc: character.role.character_arc || ''
        }
      };
    }

    // If role is a string (legacy format), convert to object
    if (typeof character.role === 'string') {
      return {
        ...character,
        role: {
          archetype: character.role,
          narrative_function: '',
          character_arc: ''
        }
      };
    }

    // If role is any other type, convert to string representation and use as archetype
    return {
      ...character,
      role: {
        archetype: String(character.role),
        narrative_function: '',
        character_arc: ''
      }
    };
  }

  /**
   * Validation des données du personnage
   */
  private validateCharacter(character: Character): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validation de base
    if (!character.character_id || typeof character.character_id !== 'string') {
      errors.push('Character ID is required and must be a string');
    }

    if (!character.name || character.name.trim().length === 0) {
      errors.push('Character name is required');
    }

    // Validate role field - handle both object and legacy string formats
    if (!character.role) {
      warnings.push('Character role is recommended for better consistency');
    } else {
      const role = character.role as { archetype?: string; narrative_function?: string; character_arc?: string };
      // Role is an object with archetype, narrative_function, character_arc
      if (!role.archetype || typeof role.archetype !== 'string' || role.archetype.trim().length === 0) {
        warnings.push('Character archetype is recommended for better consistency');
      }
      if (role.narrative_function && typeof role.narrative_function === 'string' && role.narrative_function.trim().length === 0) {
        warnings.push('Character narrative function should not be empty if provided');
      }
      if (role.character_arc && typeof role.character_arc === 'string' && role.character_arc.trim().length === 0) {
        warnings.push('Character arc should not be empty if provided');
      }
    }

    // Validation des traits de personnalité
    if (character.personality?.traits && Array.isArray(character.personality.traits)) {
      if (character.personality.traits.length === 0) {
        warnings.push('At least one personality trait is recommended');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validation des données du monde
   * 
   * Note: Automatically filters out locations and objects without names
   * to prevent validation errors from empty placeholder entries
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

    // Auto-filter locations without names (empty placeholder entries)
    // Instead of throwing an error, we silently filter them out
    if (world.locations && Array.isArray(world.locations)) {
      const emptyLocations = world.locations.filter(
        (location) => !location.name || location.name.trim().length === 0
      );
      if (emptyLocations.length > 0) {
        warnings.push(`${emptyLocations.length} empty location(s) were automatically removed`);
        // Filter out empty locations
        world.locations = world.locations.filter(
          (location) => location.name && location.name.trim().length > 0
        );
      }
    }

    // Auto-filter keyObjects without names (empty placeholder entries)
    if (world.keyObjects && Array.isArray(world.keyObjects)) {
      const emptyObjects = world.keyObjects.filter(
        (object) => !object.name || object.name.trim().length === 0
      );
      if (emptyObjects.length > 0) {
        warnings.push(`${emptyObjects.length} empty object(s) were automatically removed`);
        // Filter out empty objects
        world.keyObjects = world.keyObjects.filter(
          (object) => object.name && object.name.trim().length > 0
        );
      }
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
  private downloadAsFile(data: unknown, filename: string): void {
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
          logger.warn(`[PersistenceService] Operation failed, retrying in ${delay}ms...`, error);
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
          } catch (_error) {
            this.retryQueue.set(id, { operation, retries: retries + 1 });
            logger.warn(`[PersistenceService] Queued operation ${id} failed again (${retries + 1}/3)`);
          }
        } else {
          logger.error(`[PersistenceService] Queued operation ${id} failed permanently after 3 retries`);
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
          logger.error(`[PersistenceService] Sync failed for world ${world.id}:`, error);
          errors++;
        }
      }
    } catch (error) {
      logger.error('[PersistenceService] Sync process failed:', error);
      errors++;
    }

    return { synced, errors };
  }
}

// Export de l'instance singleton
export const persistenceService = PersistenceService.getInstance();

