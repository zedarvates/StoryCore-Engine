// ============================================================================
// Character Persistence Hook (Optimized)
// ============================================================================
// Performance-optimized version with:
// - Debounced localStorage writes to reduce I/O operations
// - Batched file system operations for multiple saves
// - In-memory caching layer to reduce localStorage reads
// - Optimized conflict resolution with caching
// - Background sync for non-critical operations
//
// Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
// ============================================================================

import { useCallback, useRef, useEffect } from 'react';
import { useStore } from '../store';
import type { Character } from '../types/character';
import { toast } from './toast';
import {
  PersistenceError,
  PersistenceErrorType,
  type PersistedCharacter,
  type RetryConfig,
  type ConflictResolution,
} from './useCharacterPersistence';

// ============================================================================
// Configuration
// ============================================================================

/** Debounce delay for localStorage writes (ms) */
const LOCALSTORAGE_DEBOUNCE_DELAY = 500;

/** Batch delay for file system operations (ms) */
const FILE_SYSTEM_BATCH_DELAY = 1000;

/** Maximum batch size for file operations */
const MAX_BATCH_SIZE = 10;

/** Cache TTL in milliseconds (5 minutes) */
const CACHE_TTL = 5 * 60 * 1000;

/** Maximum cache size (number of characters) */
const MAX_CACHE_SIZE = 100;

// ============================================================================
// Types
// ============================================================================

/**
 * Cache entry with TTL
 */
interface CacheEntry {
  character: PersistedCharacter;
  timestamp: number;
}

/**
 * Pending save operation
 */
interface PendingSave {
  character: PersistedCharacter;
  resolve: (value: Character) => void;
  reject: (error: Error) => void;
}

/**
 * Batched file operation
 */
interface BatchedFileOperation {
  type: 'save' | 'delete';
  characterId: string;
  character?: PersistedCharacter;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate UUID
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Retry with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {
    maxAttempts: 3,
    delayMs: 1000,
    backoffMultiplier: 2,
  }
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < config.maxAttempts) {
        const delay = config.delayMs * Math.pow(config.backoffMultiplier, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * Validate character schema
 */
function validateCharacterSchema(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.character_id || typeof data.character_id !== 'string') {
    errors.push('character_id is required and must be a string');
  }
  if (!data.name || typeof data.name !== 'string') {
    errors.push('name is required and must be a string');
  }
  if (!data.creation_method || !['wizard', 'auto_generated', 'manual'].includes(data.creation_method)) {
    errors.push('creation_method must be one of: wizard, auto_generated, manual');
  }
  if (!data.creation_timestamp || typeof data.creation_timestamp !== 'string') {
    errors.push('creation_timestamp is required and must be a string');
  }
  if (!data.version || typeof data.version !== 'string') {
    errors.push('version is required and must be a string');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Resolve conflict by timestamp
 */
function resolveConflictByTimestamp(
  localChar: PersistedCharacter,
  remoteChar: PersistedCharacter
): PersistedCharacter {
  const localTime = new Date(localChar.last_modified || localChar.creation_timestamp).getTime();
  const remoteTime = new Date(remoteChar.last_modified || remoteChar.creation_timestamp).getTime();
  return localTime > remoteTime ? localChar : remoteChar;
}

// ============================================================================
// Optimized Character Persistence Hook
// ============================================================================

export function useCharacterPersistenceOptimized() {
  const addCharacter = useStore((state) => state.addCharacter);
  const updateCharacter = useStore((state) => state.updateCharacter);
  const deleteCharacter = useStore((state) => state.deleteCharacter);
  const getAllCharacters = useStore((state) => state.getAllCharacters);

  // ============================================================================
  // Cache Management
  // ============================================================================

  const cache = useRef<Map<string, CacheEntry>>(new Map());

  /**
   * Get character from cache
   */
  const getFromCache = useCallback((characterId: string): PersistedCharacter | null => {
    const entry = cache.current.get(characterId);
    if (!entry) return null;

    // Check if cache entry is still valid
    const now = Date.now();
    if (now - entry.timestamp > CACHE_TTL) {
      cache.current.delete(characterId);
      return null;
    }

    return entry.character;
  }, []);

  /**
   * Add character to cache
   */
  const addToCache = useCallback((character: PersistedCharacter): void => {
    // Enforce cache size limit (LRU eviction)
    if (cache.current.size >= MAX_CACHE_SIZE) {
      // Remove oldest entry
      const oldestKey = cache.current.keys().next().value;
      if (oldestKey) {
        cache.current.delete(oldestKey);
      }
    }

    cache.current.set(character.character_id, {
      character,
      timestamp: Date.now(),
    });
  }, []);

  /**
   * Remove character from cache
   */
  const removeFromCache = useCallback((characterId: string): void => {
    cache.current.delete(characterId);
  }, []);

  /**
   * Clear entire cache
   */
  const clearCache = useCallback((): void => {
    cache.current.clear();
  }, []);

  // ============================================================================
  // Debounced localStorage Operations
  // ============================================================================

  const pendingSaves = useRef<Map<string, PendingSave>>(new Map());
  const saveTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  /**
   * Save to localStorage with debouncing
   */
  const saveToLocalStorageDebounced = useCallback(
    (character: PersistedCharacter): Promise<void> => {
      return new Promise((resolve, reject) => {
        const characterId = character.character_id;

        // Clear existing timer
        const existingTimer = saveTimers.current.get(characterId);
        if (existingTimer) {
          clearTimeout(existingTimer);
        }

        // Store pending save
        const existingPending = pendingSaves.current.get(characterId);
        if (existingPending) {
          // Reject previous pending save (it will be superseded)
          existingPending.reject(new Error('Superseded by newer save'));
        }

        pendingSaves.current.set(characterId, {
          character,
          resolve: resolve as any,
          reject,
        });

        // Set new timer
        const timer = setTimeout(() => {
          const pending = pendingSaves.current.get(characterId);
          if (!pending) return;

          try {
            // Perform actual localStorage write
            localStorage.setItem(
              `character-${characterId}`,
              JSON.stringify(pending.character)
            );

            // Update master list
            const allCharacterIds = JSON.parse(
              localStorage.getItem('character-ids') || '[]'
            ) as string[];

            if (!allCharacterIds.includes(characterId)) {
              allCharacterIds.push(characterId);
              localStorage.setItem('character-ids', JSON.stringify(allCharacterIds));
            }

            // Update cache
            addToCache(pending.character);

            // Resolve promise
            pending.resolve(pending.character);
            pendingSaves.current.delete(characterId);
            saveTimers.current.delete(characterId);
          } catch (error) {
            if (error instanceof DOMException && error.name === 'QuotaExceededError') {
              toast.error(
                'Storage Quota Exceeded',
                'Your browser storage is full. Please export some characters.',
                10000
              );
              pending.reject(
                new PersistenceError(
                  PersistenceErrorType.STORAGE_QUOTA_EXCEEDED,
                  'localStorage quota exceeded',
                  { originalError: error }
                )
              );
            } else {
              pending.reject(error as Error);
            }
            pendingSaves.current.delete(characterId);
            saveTimers.current.delete(characterId);
          }
        }, LOCALSTORAGE_DEBOUNCE_DELAY);

        saveTimers.current.set(characterId, timer);
      });
    },
    [addToCache]
  );

  /**
   * Flush all pending localStorage saves immediately
   */
  const flushLocalStorageSaves = useCallback((): Promise<void[]> => {
    const promises: Promise<void>[] = [];

    // Clear all timers and execute saves immediately
    for (const [characterId, timer] of saveTimers.current.entries()) {
      clearTimeout(timer);
      const pending = pendingSaves.current.get(characterId);
      if (pending) {
        const promise = new Promise<void>((resolve, reject) => {
          try {
            localStorage.setItem(
              `character-${characterId}`,
              JSON.stringify(pending.character)
            );
            addToCache(pending.character);
            pending.resolve(pending.character);
            resolve();
          } catch (error) {
            pending.reject(error as Error);
            reject(error);
          }
        });
        promises.push(promise);
      }
    }

    pendingSaves.current.clear();
    saveTimers.current.clear();

    return Promise.all(promises);
  }, [addToCache]);

  // ============================================================================
  // Batched File System Operations
  // ============================================================================

  const fileOperationQueue = useRef<BatchedFileOperation[]>([]);
  const fileOperationTimer = useRef<NodeJS.Timeout | null>(null);

  /**
   * Process batched file operations
   */
  const processFileOperationBatch = useCallback(async (): Promise<void> => {
    if (fileOperationTimer.current) {
      clearTimeout(fileOperationTimer.current);
      fileOperationTimer.current = null;
    }

    if (fileOperationQueue.current.length === 0) {
      return;
    }

    const batch = fileOperationQueue.current.splice(0, MAX_BATCH_SIZE);

    try {
      // Send batch request to backend
      const response = await fetch('/api/characters/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ operations: batch }),
      });

      if (!response.ok) {
        console.warn('Batch file operation failed:', response.statusText);
      }
    } catch (error) {
      console.warn('Failed to process file operation batch:', error);
    }

    // If there are more operations, schedule another batch
    if (fileOperationQueue.current.length > 0) {
      fileOperationTimer.current = setTimeout(
        processFileOperationBatch,
        FILE_SYSTEM_BATCH_DELAY
      );
    }
  }, []);

  /**
   * Queue file operation for batching
   */
  const queueFileOperation = useCallback(
    (operation: BatchedFileOperation): void => {
      fileOperationQueue.current.push(operation);

      // Process immediately if batch is full
      if (fileOperationQueue.current.length >= MAX_BATCH_SIZE) {
        processFileOperationBatch();
        return;
      }

      // Schedule batch processing
      if (!fileOperationTimer.current) {
        fileOperationTimer.current = setTimeout(
          processFileOperationBatch,
          FILE_SYSTEM_BATCH_DELAY
        );
      }
    },
    [processFileOperationBatch]
  );

  /**
   * Flush all pending file operations immediately
   */
  const flushFileOperations = useCallback(async (): Promise<void> => {
    while (fileOperationQueue.current.length > 0) {
      await processFileOperationBatch();
    }
  }, [processFileOperationBatch]);

  // ============================================================================
  // Optimized Load Operations
  // ============================================================================

  /**
   * Load character from localStorage with caching
   */
  const loadFromLocalStorage = useCallback(
    (characterId: string): PersistedCharacter | null => {
      // Check cache first
      const cached = getFromCache(characterId);
      if (cached) {
        return cached;
      }

      try {
        const stored = localStorage.getItem(`character-${characterId}`);
        if (!stored) {
          return null;
        }

        const character = JSON.parse(stored);

        // Validate
        const validation = validateCharacterSchema(character);
        if (!validation.valid) {
          console.error(`Corrupted character data: ${characterId}`, validation.errors);
          return null;
        }

        // Add to cache
        addToCache(character);

        return character;
      } catch (error) {
        console.error('Failed to load character from localStorage:', error);
        return null;
      }
    },
    [getFromCache, addToCache]
  );

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Save character with optimized persistence
   */
  const saveCharacter = useCallback(
    async (characterData: Partial<Character>): Promise<Character> => {
      const character_id = characterData.character_id || generateUUID();

      // Get existing version number
      const existingChar = loadFromLocalStorage(character_id);
      const currentVersionNumber = (existingChar as PersistedCharacter)?.version_number || 0;

      // Create persisted character
      const character: PersistedCharacter = {
        character_id,
        name: characterData.name || '',
        creation_method: characterData.creation_method || 'wizard',
        creation_timestamp: characterData.creation_timestamp || new Date().toISOString(),
        version: characterData.version || '1.0',
        last_modified: new Date().toISOString(),
        version_number: currentVersionNumber + 1,
        visual_identity: characterData.visual_identity || {} as any,
        personality: characterData.personality || {} as any,
        background: characterData.background || {} as any,
        relationships: characterData.relationships || [],
        role: characterData.role || {} as any,
        thumbnail_url: (characterData as PersistedCharacter).thumbnail_url,
        tags: (characterData as PersistedCharacter).tags,
        notes: (characterData as PersistedCharacter).notes,
      };

      // Validate schema
      const validation = validateCharacterSchema(character);
      if (!validation.valid) {
        throw new PersistenceError(
          PersistenceErrorType.VALIDATION_ERROR,
          `Schema validation failed: ${validation.errors.join(', ')}`,
          { errors: validation.errors }
        );
      }

      // Update store
      const existingCharacters = getAllCharacters();
      const characterIndex = existingCharacters.findIndex(
        (c) => c.character_id === character_id
      );

      if (characterIndex >= 0) {
        updateCharacter(character_id, character);
      } else {
        addCharacter(character);
      }

      // Save to localStorage (debounced)
      await saveToLocalStorageDebounced(character);

      // Queue file system save (batched)
      queueFileOperation({
        type: 'save',
        characterId: character_id,
        character,
      });

      return character;
    },
    [
      loadFromLocalStorage,
      getAllCharacters,
      updateCharacter,
      addCharacter,
      saveToLocalStorageDebounced,
      queueFileOperation,
    ]
  );

  /**
   * Load character with caching
   */
  const loadCharacter = useCallback(
    async (characterId: string): Promise<Character | null> => {
      const character = loadFromLocalStorage(characterId);
      if (character) {
        addCharacter(character);
        return character;
      }
      return null;
    },
    [loadFromLocalStorage, addCharacter]
  );

  /**
   * Load all characters with caching
   */
  const loadAllCharacters = useCallback(async (): Promise<Character[]> => {
    try {
      const characterIds = JSON.parse(
        localStorage.getItem('character-ids') || '[]'
      ) as string[];

      const characters: Character[] = [];

      for (const id of characterIds) {
        const character = loadFromLocalStorage(id);
        if (character) {
          characters.push(character);
          addCharacter(character);
        }
      }

      return characters;
    } catch (error) {
      console.error('Error loading characters:', error);
      return [];
    }
  }, [loadFromLocalStorage, addCharacter]);

  /**
   * Delete character with batched file operations
   */
  const removeCharacter = useCallback(
    async (characterId: string): Promise<void> => {
      // Remove from store
      deleteCharacter(characterId);

      // Remove from cache
      removeFromCache(characterId);

      // Remove from localStorage
      try {
        localStorage.removeItem(`character-${characterId}`);

        const characterIds = JSON.parse(
          localStorage.getItem('character-ids') || '[]'
        ) as string[];

        const updatedIds = characterIds.filter((id) => id !== characterId);
        localStorage.setItem('character-ids', JSON.stringify(updatedIds));
      } catch (error) {
        console.error('Failed to remove from localStorage:', error);
      }

      // Queue file system delete (batched)
      queueFileOperation({
        type: 'delete',
        characterId,
      });
    },
    [deleteCharacter, removeFromCache, queueFileOperation]
  );

  // ============================================================================
  // Cleanup on Unmount
  // ============================================================================

  useEffect(() => {
    return () => {
      // Flush all pending operations on unmount
      flushLocalStorageSaves();
      flushFileOperations();
    };
  }, [flushLocalStorageSaves, flushFileOperations]);

  return {
    saveCharacter,
    loadCharacter,
    loadAllCharacters,
    removeCharacter,
    flushLocalStorageSaves,
    flushFileOperations,
    clearCache,
  };
}

