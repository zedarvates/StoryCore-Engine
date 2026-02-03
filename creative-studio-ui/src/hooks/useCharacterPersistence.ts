// ============================================================================
// Character Persistence Hook
// ============================================================================
// Handles saving and loading characters to/from localStorage and JSON files
// Integrates with Zustand store for state management
// Implements schema validation, conflict resolution, and error handling
//
// Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
// ============================================================================

import { useCallback } from 'react';
import { useStore } from '../store';
import type { Character } from '../types/character';
import { toast } from '../utils/toast';

// ============================================================================
// Types
// ============================================================================

/**
 * Persistence error types for better error handling
 */
export const PersistenceErrorType = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  STORAGE_QUOTA_EXCEEDED: 'STORAGE_QUOTA_EXCEEDED',
  FILE_SYSTEM_ERROR: 'FILE_SYSTEM_ERROR',
  CORRUPTED_DATA: 'CORRUPTED_DATA',
  CONFLICT_ERROR: 'CONFLICT_ERROR',
} as const;

export type PersistenceErrorType = typeof PersistenceErrorType[keyof typeof PersistenceErrorType];

/**
 * Persistence error with detailed information
 */
export class PersistenceError extends Error {
  public type: PersistenceErrorType;
  public details?: any;
  constructor(
    type: PersistenceErrorType,
    message: string,
    details?: any
  ) {
    super(message);
    this.type = type;
    this.details = details;
    this.name = 'PersistenceError';
  }
}

/**
 * Character with persistence metadata
 */
interface PersistedCharacter extends Character {
  last_modified?: string;
  thumbnail_url?: string;
  tags?: string[];
  notes?: string;
  version_number?: number; // For concurrent modification detection
}

/**
 * Retry configuration
 */
interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
}

/**
 * Conflict resolution result
 */
export interface ConflictResolution {
  hasConflict: boolean;
  localCharacter?: PersistedCharacter;
  remoteCharacter?: PersistedCharacter;
  resolvedCharacter?: PersistedCharacter;
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
  // Fallback UUID generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Retry a function with exponential backoff
 * Requirements: 8.2
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
        console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`, error);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Retry failed');
}

/**
 * Handle localStorage quota exceeded error
 * Requirements: 8.1
 */
function handleQuotaExceeded(): void {
  toast.error(
    'Storage Quota Exceeded',
    'Your browser storage is full. Please export some characters to free up space, or clear old data.',
    10000
  );
  
  // Log storage usage for debugging
  if (typeof navigator !== 'undefined' && 'storage' in navigator && 'estimate' in navigator.storage) {
    navigator.storage.estimate().then((estimate) => {
      console.error('Storage quota exceeded:', {
        usage: estimate.usage,
        quota: estimate.quota,
        percentUsed: estimate.quota ? ((estimate.usage || 0) / estimate.quota * 100).toFixed(2) + '%' : 'unknown',
      });
    });
  }
}

/**
 * Handle file system errors
 * Requirements: 8.2
 */
function handleFileSystemError(error: Error, operation: string): void {
  console.error(`File system ${operation} error:`, error);
  
  toast.warning(
    'File System Error',
    `Failed to ${operation} character file. Data is saved in browser storage only.`,
    7000
  );
}

/**
 * Detect concurrent modifications by comparing version numbers
 * Requirements: 2.5
 */
function detectConcurrentModification(
  localChar: PersistedCharacter,
  remoteChar: PersistedCharacter
): boolean {
  // If both have version numbers, compare them
  if (localChar.version_number !== undefined && remoteChar.version_number !== undefined) {
    return localChar.version_number !== remoteChar.version_number;
  }

  // If version numbers are not available, compare timestamps
  const localTime = new Date(localChar.last_modified || localChar.creation_timestamp).getTime();
  const remoteTime = new Date(remoteChar.last_modified || remoteChar.creation_timestamp).getTime();

  // If timestamps are very close (within 1 second), consider it a concurrent modification
  const timeDiff = Math.abs(localTime - remoteTime);
  return timeDiff < 1000 && localTime !== remoteTime;
}

/**
 * Validates character data against schema
 * Requirements: 8.3
 */
function validateCharacterSchema(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required fields
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

  // Check nested objects
  if (!data.visual_identity || typeof data.visual_identity !== 'object') {
    errors.push('visual_identity is required and must be an object');
  }
  if (!data.personality || typeof data.personality !== 'object') {
    errors.push('personality is required and must be an object');
  }
  if (!data.background || typeof data.background !== 'object') {
    errors.push('background is required and must be an object');
  }
  if (!data.role || typeof data.role !== 'object') {
    errors.push('role is required and must be an object');
  }
  if (!Array.isArray(data.relationships)) {
    errors.push('relationships must be an array');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Resolves conflicts between two character versions by timestamp
 * Requirements: 8.5
 */
function resolveConflictByTimestamp(
  localChar: PersistedCharacter,
  remoteChar: PersistedCharacter
): PersistedCharacter {
  const localTime = new Date(localChar.last_modified || localChar.creation_timestamp).getTime();
  const remoteTime = new Date(remoteChar.last_modified || remoteChar.creation_timestamp).getTime();

  // Return the most recent version
  return localTime > remoteTime ? localChar : remoteChar;
}

// ============================================================================
// Character Persistence Hook
// ============================================================================

export function useCharacterPersistence() {
  // ============================================================================
  // Store Selectors - All hooks at top level
  // ============================================================================
  const addCharacter = useStore((state) => state.addCharacter);
  const updateCharacter = useStore((state) => state.updateCharacter);
  const deleteCharacter = useStore((state) => state.deleteCharacter);
  const getAllCharacters = useStore((state) => state.getAllCharacters);

  // ============================================================================
  // File System Operations - All useCallback hooks at top level
  // ============================================================================
  
  /**
   * Save character to JSON file via backend API
   * Requirements: 8.2, 8.3
   */
  const saveToFile = useCallback(
    async (character: PersistedCharacter): Promise<void> => {
      try {
        // Validate schema before saving (Requirement: 8.3)
        const validation = validateCharacterSchema(character);
        if (!validation.valid) {
          throw new PersistenceError(
            PersistenceErrorType.VALIDATION_ERROR,
            `Schema validation failed: ${validation.errors.join(', ')}`,
            { errors: validation.errors }
          );
        }

        // Try to save to file system via backend API with retry logic (Requirement: 8.2)
        await retryWithBackoff(async () => {
          const response = await fetch('/api/characters/save', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(character),
          });

          if (!response.ok) {
            throw new Error(`File save failed: ${response.statusText}`);
          }
        });
      } catch (error) {
        // Log error and show user-friendly message (Requirement: 8.2)
        handleFileSystemError(error as Error, 'save');
        throw new PersistenceError(
          PersistenceErrorType.FILE_SYSTEM_ERROR,
          'Failed to save character to file system',
          { originalError: error }
        );
      }
    },
    []
  );

  /**
   * Load character from JSON file via backend API
   * Requirements: 8.2
   */
  const loadFromFile = useCallback(
    async (character_id: string): Promise<PersistedCharacter | null> => {
      try {
        const response = await fetch(`/api/characters/${character_id}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            return null;
          }
          throw new Error(`File load failed: ${response.statusText}`);
        }

        const character = await response.json();

        // Validate loaded data (Requirement: 8.3)
        const validation = validateCharacterSchema(character);
        if (!validation.valid) {
          throw new PersistenceError(
            PersistenceErrorType.CORRUPTED_DATA,
            `Loaded character failed validation: ${validation.errors.join(', ')}`,
            { errors: validation.errors }
          );
        }

        return character;
      } catch (error) {
        console.warn('Failed to load character from file system:', error);
        return null;
      }
    },
    []
  );

  // ============================================================================
  // LocalStorage Operations - All useCallback hooks at top level
  // ============================================================================
  
  /**
   * Save character to localStorage
   * Requirements: 8.1
   */
  const saveToLocalStorage = useCallback(
    (character: PersistedCharacter): void => {
      try {
        // Save individual character
        localStorage.setItem(
          `character-${character.character_id}`,
          JSON.stringify(character)
        );

        // Update master list
        const allCharacterIds = JSON.parse(
          localStorage.getItem('character-ids') || '[]'
        ) as string[];
        
        if (!allCharacterIds.includes(character.character_id)) {
          allCharacterIds.push(character.character_id);
          localStorage.setItem('character-ids', JSON.stringify(allCharacterIds));
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          // Handle quota exceeded (Requirement: 8.1)
          handleQuotaExceeded();
          throw new PersistenceError(
            PersistenceErrorType.STORAGE_QUOTA_EXCEEDED,
            'localStorage quota exceeded. Please export some characters to free up space.',
            { originalError: error }
          );
        }
        throw error;
      }
    },
    []
  );

  /**
   * Load character from localStorage
   * Requirements: 8.1
   */
  const loadFromLocalStorage = useCallback(
    (character_id: string): PersistedCharacter | null => {
      try {
        const stored = localStorage.getItem(`character-${character_id}`);
        if (!stored) {
          return null;
        }

        const character = JSON.parse(stored);

        // Validate loaded data
        const validation = validateCharacterSchema(character);
        if (!validation.valid) {
          console.error(`Corrupted character data in localStorage: ${character_id}`, validation.errors);
          throw new PersistenceError(
            PersistenceErrorType.CORRUPTED_DATA,
            `Character data is corrupted: ${validation.errors.join(', ')}`,
            { characterId: character_id, errors: validation.errors }
          );
        }

        return character;
      } catch (error) {
        if (error instanceof PersistenceError) {
          throw error;
        }
        console.error('Failed to parse character from localStorage:', error);
        throw new PersistenceError(
          PersistenceErrorType.CORRUPTED_DATA,
          'Failed to parse character data',
          { characterId: character_id, originalError: error }
        );
      }
    },
    []
  );

  // ============================================================================
  // Main Persistence Operations - All useCallback hooks at top level
  // ============================================================================

  /**
   * Save a character with dual persistence and conflict resolution
   * Requirements: 8.1, 8.2, 8.3, 8.5
   */
  const saveCharacter = useCallback(
    async (characterData: Partial<Character>): Promise<Character> => {
      // Generate UUID if not provided
      const character_id = characterData.character_id || generateUUID();

      // Add persistence metadata
      const existingChar = loadFromLocalStorage(character_id);
      const currentVersionNumber = (existingChar as PersistedCharacter)?.version_number || 0;
      
      const character: PersistedCharacter = {
        character_id,
        name: characterData.name || '',
        creation_method: characterData.creation_method || 'wizard',
        creation_timestamp: characterData.creation_timestamp || new Date().toISOString(),
        version: characterData.version || '1.0',
        last_modified: new Date().toISOString(), // Add modification timestamp
        version_number: currentVersionNumber + 1, // Increment version for concurrent modification detection
        visual_identity: {
          hair_color: characterData.visual_identity?.hair_color || '',
          hair_style: characterData.visual_identity?.hair_style || '',
          hair_length: characterData.visual_identity?.hair_length || '',
          eye_color: characterData.visual_identity?.eye_color || '',
          eye_shape: characterData.visual_identity?.eye_shape || '',
          skin_tone: characterData.visual_identity?.skin_tone || '',
          facial_structure: characterData.visual_identity?.facial_structure || '',
          distinctive_features: characterData.visual_identity?.distinctive_features || [],
          age_range: characterData.visual_identity?.age_range || '',
          height: characterData.visual_identity?.height || '',
          build: characterData.visual_identity?.build || '',
          posture: characterData.visual_identity?.posture || '',
          clothing_style: characterData.visual_identity?.clothing_style || '',
          color_palette: characterData.visual_identity?.color_palette || [],
        },
        personality: {
          traits: characterData.personality?.traits || [],
          values: characterData.personality?.values || [],
          fears: characterData.personality?.fears || [],
          desires: characterData.personality?.desires || [],
          flaws: characterData.personality?.flaws || [],
          strengths: characterData.personality?.strengths || [],
          temperament: characterData.personality?.temperament || '',
          communication_style: characterData.personality?.communication_style || '',
        },
        background: {
          origin: characterData.background?.origin || '',
          occupation: characterData.background?.occupation || '',
          education: characterData.background?.education || '',
          family: characterData.background?.family || '',
          significant_events: characterData.background?.significant_events || [],
          current_situation: characterData.background?.current_situation || '',
        },
        relationships: characterData.relationships || [],
        role: {
          archetype: characterData.role?.archetype || '',
          narrative_function: characterData.role?.narrative_function || '',
          character_arc: characterData.role?.character_arc || '',
        },
        // Optional metadata
        thumbnail_url: (characterData as PersistedCharacter).thumbnail_url,
        tags: (characterData as PersistedCharacter).tags,
        notes: (characterData as PersistedCharacter).notes,
      };

      try {
        // Check for conflicts (Requirement: 8.5)
        const existingInLocalStorage = loadFromLocalStorage(character_id);
        let fileCharacter: PersistedCharacter | null = null;
        
        try {
          fileCharacter = await loadFromFile(character_id);
        } catch (error) {
          // File system not available, continue with localStorage only
        }

        // Resolve conflicts if both exist (Requirement: 8.5, 2.5)
        if (existingInLocalStorage && fileCharacter) {
          // Check for concurrent modifications
          const hasConcurrentModification = detectConcurrentModification(
            existingInLocalStorage,
            fileCharacter
          );

          if (hasConcurrentModification) {
            // Show conflict resolution dialog
            toast.warning(
              'Concurrent Modification Detected',
              `Character "${character.name}" has been modified in multiple places. Please resolve the conflict.`,
              10000
            );

            throw new PersistenceError(
              PersistenceErrorType.CONFLICT_ERROR,
              'Concurrent modification detected. Please resolve the conflict.',
              {
                localCharacter: existingInLocalStorage,
                remoteCharacter: fileCharacter,
                newCharacter: character,
              }
            );
          }

          // No concurrent modification, resolve by timestamp
          const resolved = resolveConflictByTimestamp(existingInLocalStorage, fileCharacter);
          
          // If the resolved version is newer than what we're trying to save, throw conflict error
          const resolvedTime = new Date(resolved.last_modified || resolved.creation_timestamp).getTime();
          const newTime = new Date(character.last_modified || character.creation_timestamp).getTime();
          
          if (resolvedTime > newTime) {
            throw new PersistenceError(
              PersistenceErrorType.CONFLICT_ERROR,
              'A newer version of this character exists',
              { existingCharacter: resolved, newCharacter: character }
            );
          }
        }

        // Update store first
        const existingCharacters = getAllCharacters();
        const characterIndex = existingCharacters.findIndex(
          (c) => c.character_id === character_id
        );

        if (characterIndex >= 0) {
          updateCharacter(character_id, character);
        } else {
          addCharacter(character);
        }

        // Save to localStorage (Requirement: 8.1)
        try {
          saveToLocalStorage(character);
        } catch (error) {
          if (error instanceof PersistenceError && 
              error.type === PersistenceErrorType.STORAGE_QUOTA_EXCEEDED) {
            // Try to save to file system as fallback
            console.warn('localStorage quota exceeded, attempting file system save');
            await saveToFile(character);
          } else {
            throw error;
          }
        }

        // Save to file system (Requirement: 8.2)
        try {
          await saveToFile(character);
        } catch (error) {
          // File system save failed, but localStorage succeeded
          console.warn('File system save failed, character saved to localStorage only');
        }

        return character;
      } catch (error) {
        if (error instanceof PersistenceError) {
          throw error;
        }
        console.error('Error saving character:', error);
        throw new PersistenceError(
          PersistenceErrorType.FILE_SYSTEM_ERROR,
          'Failed to save character',
          { originalError: error }
        );
      }
    },
    [addCharacter, updateCharacter, getAllCharacters, saveToLocalStorage, saveToFile, loadFromLocalStorage, loadFromFile]
  );

  /**
   * Load a character from localStorage or file system with conflict resolution
   * Requirements: 8.1, 8.2, 8.4, 8.5
   */
  const loadCharacter = useCallback(
    async (character_id: string): Promise<Character | null> => {
      try {
        // Try to load from both sources
        const localStorageChar = loadFromLocalStorage(character_id);
        let fileChar: PersistedCharacter | null = null;
        
        try {
          fileChar = await loadFromFile(character_id);
        } catch (error) {
          // File system not available, use localStorage only
        }

        // Resolve conflicts if both exist (Requirement: 8.5)
        let character: PersistedCharacter | null = null;
        
        if (localStorageChar && fileChar) {
          character = resolveConflictByTimestamp(localStorageChar, fileChar);
          
          // Save the resolved version to both locations
          try {
            saveToLocalStorage(character);
            await saveToFile(character);
          } catch (error) {
            console.warn('Failed to save resolved character:', error);
          }
        } else {
          character = localStorageChar || fileChar;
        }

        if (character) {
          // Add to store
          addCharacter(character);
          return character;
        }
        
        console.warn(`Character not found: ${character_id}`);
        return null;
      } catch (error) {
        if (error instanceof PersistenceError) {
          console.error('Persistence error loading character:', error.message, error.details);
          
          // For corrupted data, try to recover or skip
          if (error.type === PersistenceErrorType.CORRUPTED_DATA) {
            console.warn(`Skipping corrupted character: ${character_id}`);
            return null;
          }
        }
        console.error('Error loading character:', error);
        return null;
      }
    },
    [addCharacter, loadFromLocalStorage, loadFromFile, saveToLocalStorage, saveToFile]
  );

  /**
   * Load all characters from localStorage and file system
   * Requirements: 8.1, 8.2, 8.4
   */
  const loadAllCharacters = useCallback(async (): Promise<Character[]> => {
    try {
      const characterIds = JSON.parse(
        localStorage.getItem('character-ids') || '[]'
      ) as string[];
      
      const characters: Character[] = [];
      const errors: Array<{ id: string; error: any }> = [];
      
      for (const id of characterIds) {
        try {
          const character = await loadCharacter(id);
          if (character) {
            characters.push(character);
          }
        } catch (error) {
          errors.push({ id, error });
          console.error(`Failed to load character ${id}:`, error);
        }
      }

      // Log summary of errors
      if (errors.length > 0) {
        console.warn(
          `Failed to load ${errors.length} character(s). ` +
          `Successfully loaded ${characters.length} character(s).`
        );
      }

      return characters;
    } catch (error) {
      console.error('Error loading characters:', error);
      return [];
    }
  }, [loadCharacter]);

  /**
   * Delete a character from localStorage, file system, and store
   * Requirements: 8.1, 8.2
   */
  const removeCharacter = useCallback(
    async (character_id: string): Promise<void> => {
      try {
        // Remove from Zustand store
        deleteCharacter(character_id);

        // Remove from localStorage
        try {
          localStorage.removeItem(`character-${character_id}`);

          // Update character IDs list
          const characterIds = JSON.parse(
            localStorage.getItem('character-ids') || '[]'
          ) as string[];
          
          const updatedIds = characterIds.filter((id) => id !== character_id);
          localStorage.setItem('character-ids', JSON.stringify(updatedIds));
        } catch (error) {
          console.error('Failed to remove from localStorage:', error);
        }

        // Remove from file system
        try {
          const response = await fetch(`/api/characters/${character_id}`, {
            method: 'DELETE',
          });
          
          if (!response.ok) {
            console.warn(`Failed to delete character file: ${response.statusText}`);
          }
        } catch (error) {
          console.warn('Failed to delete character from file system:', error);
        }

      } catch (error) {
        console.error('Error deleting character:', error);
        throw new PersistenceError(
          PersistenceErrorType.FILE_SYSTEM_ERROR,
          'Failed to delete character',
          { originalError: error }
        );
      }
    },
    [deleteCharacter]
  );

  return {
    saveCharacter,
    loadCharacter,
    loadAllCharacters,
    removeCharacter,
  };
}
