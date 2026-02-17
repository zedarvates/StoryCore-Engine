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
import { useEditorStore } from '../stores/editorStore';
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
  public details?: unknown;
  constructor(
    type: PersistenceErrorType,
    message: string,
    details?: unknown
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
  const setCharacters = useStore((state) => state.setCharacters);

  // ============================================================================
  // File System Operations - All useCallback hooks at top level
  // ============================================================================

  /**
   * Save character to JSON file via File System Access API
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

        // Use File System Access API if available
        if ('showSaveFilePicker' in window) {
          const options = {
            suggestedName: `${character.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_character.json`,
            types: [
              {
                description: 'JSON Files',
                accept: { 'application/json': ['.json'] },
              },
            ],
          };

          const fileHandle = await (window as any).showSaveFilePicker(options);
          const writable = await fileHandle.createWritable();
          await writable.write(JSON.stringify(character, null, 2));
          await writable.close();
        } else {
          // Fallback: download file via anchor element
          const blob = new Blob([JSON.stringify(character, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${character.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_character.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      } catch (error) {
        // Check if user cancelled the save dialog - don't treat as error
        if ((error as Error).name === 'AbortError') {
          console.log('User cancelled file save');
          return;
        }

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
   * Save character directly to project directory via Electron API
   * This saves automatically without showing a file picker dialog
   * Requirements: 8.2, 8.3
   */
  const saveToProjectDirectory = useCallback(
    async (character: PersistedCharacter, projectPath: string): Promise<void> => {
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

        // Check if we're running in Electron environment
        if (window.electronAPI?.fs?.writeFile) {
          const charactersDir = `${projectPath}/characters`;
          const fileName = `character_${character.character_id}.json`;
          const filePath = `${charactersDir}/${fileName}`;

          // Ensure the characters directory exists
          if (window.electronAPI.fs.mkdir) {
            await window.electronAPI.fs.mkdir(charactersDir, { recursive: true });
          }

          const jsonData = JSON.stringify(character, null, 2);

          // Convert string to Uint8Array for browser compatibility
          const encoder = new TextEncoder();
          const dataBuffer = encoder.encode(jsonData);

          // Convert Uint8Array to string for writeFile (Node.js style)
          const dataString = new TextDecoder().decode(dataBuffer);
          await window.electronAPI.fs.writeFile(filePath, dataString);
          console.log(`[useCharacterPersistence] Character saved to: ${filePath}`);
        } else {
          // Fallback: use the file picker method
          console.warn('[useCharacterPersistence] Electron API not available, falling back to file picker');
          await saveToFile(character);
        }
      } catch (error) {
        console.error('[useCharacterPersistence] Failed to save character to project directory:', error);
        handleFileSystemError(error as Error, 'save');
        throw new PersistenceError(
          PersistenceErrorType.FILE_SYSTEM_ERROR,
          'Failed to save character to project directory',
          { originalError: error }
        );
      }
    },
    []
  );

  /**
   * Load all characters from project directory
   * Requirements: 8.2, 8.4
   */
  const loadCharactersFromProjectDirectory = useCallback(
    async (projectPath: string): Promise<PersistedCharacter[]> => {
      const characters: PersistedCharacter[] = [];

      try {
        // Check if we're running in Electron environment
        if (window.electronAPI?.fs?.readdir) {
          const charactersDir = `${projectPath}/characters`;

          // Check if directory exists
          try {
            const files = await window.electronAPI.fs.readdir(charactersDir);

            for (const file of files) {
              if (file.endsWith('.json') && file.startsWith('character_')) {
                try {
                  const filePath = `${charactersDir}/${file}`;
                  const buffer = await window.electronAPI.fs.readFile(filePath);
                  const content = new TextDecoder().decode(buffer);
                  const character = JSON.parse(content);

                  // Validate loaded data
                  const validation = validateCharacterSchema(character);
                  if (validation.valid) {
                    characters.push(character);
                  } else {
                    console.warn(`[useCharacterPersistence] Invalid character file: ${file}`, validation.errors);
                  }
                } catch (fileError) {
                  console.warn(`[useCharacterPersistence] Failed to load character file: ${file}`, fileError);
                }
              }
            }
          } catch (dirError) {
            // Directory doesn't exist yet, return empty array
            console.log('[useCharacterPersistence] Characters directory does not exist yet');
          }
        } else {
          console.warn('[useCharacterPersistence] Electron API not available for loading characters from directory');
        }
      } catch (error) {
        console.error('[useCharacterPersistence] Failed to load characters from project directory:', error);
      }

      return characters;
    },
    []
  );

  /**
   * Load character from JSON file via File System Access API
   * Requirements: 8.2
   */
  const loadFromFile = useCallback(
    async (): Promise<PersistedCharacter | null> => {
      try {
        // Use File System Access API if available
        // NOTE: showOpenFilePicker requires a user gesture (click event)
        // This function should only be called from explicit user actions
        if ('showOpenFilePicker' in window) {
          try {
            const options = {
              types: [
                {
                  description: 'JSON Files',
                  accept: { 'application/json': ['.json'] },
                },
              ],
              multiple: false,
            };

            const [fileHandle] = await (window as any).showOpenFilePicker(options);
            const file = await fileHandle.getFile();
            const content = await file.text();
            const character = JSON.parse(content);

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
          } catch (pickerError) {
            // User cancelled or gesture requirement not met
            // Fall through to fallback method
            console.warn('File System Access API not available or cancelled:', pickerError);
          }
        }

        // Fallback: use input element (works without user gesture requirement)
        return new Promise((resolve, reject) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.json,application/json';
          input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) {
              resolve(null);
              return;
            }
            try {
              const content = await file.text();
              const character = JSON.parse(content);
              const validation = validateCharacterSchema(character);
              if (!validation.valid) {
                throw new PersistenceError(
                  PersistenceErrorType.CORRUPTED_DATA,
                  `Loaded character failed validation: ${validation.errors.join(', ')}`,
                  { errors: validation.errors }
                );
              }
              resolve(character);
            } catch (err) {
              reject(err);
            }
          };
          // Create the click event properly
          const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true
          });
          input.dispatchEvent(clickEvent);
        });
      } catch (error) {
        // Check if user cancelled the open dialog - don't treat as error
        if ((error as Error).name === 'AbortError') {
          console.log('User cancelled file open');
          return null;
        }
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
   * Automatically saves to project directory if available
   * Requirements: 8.1, 8.2, 8.3, 8.5
   */
  const saveCharacter = useCallback(
    async (characterData: Partial<Character>): Promise<Character> => {
      // Get project path from editor store
      const projectPath = useEditorStore.getState().projectPath;

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
          gender: characterData.visual_identity?.gender || 'neutral',
          height: characterData.visual_identity?.height || '',
          build: characterData.visual_identity?.build || '',
          posture: characterData.visual_identity?.posture || '',
          clothing_style: characterData.visual_identity?.clothing_style || '',
          color_palette: characterData.visual_identity?.color_palette || [],
          reference_images: characterData.visual_identity?.reference_images || [],
          reference_sheet_images: characterData.visual_identity?.reference_sheet_images || [],
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
        prompts: characterData.prompts || [],
        // Optional metadata
        thumbnail_url: (characterData as PersistedCharacter).thumbnail_url,
        tags: (characterData as PersistedCharacter).tags,
        notes: (characterData as PersistedCharacter).notes,
      };

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

      // Save to project directory if projectPath is available (Requirement: 8.2)
      if (projectPath) {
        try {
          await saveToProjectDirectory(character, projectPath);
          console.log(`[useCharacterPersistence] Character saved to project directory: ${projectPath}`);
        } catch (error) {
          console.warn('[useCharacterPersistence] Project directory save failed, falling back to file picker:', error);
          // Fallback to file picker if project directory save fails
          try {
            await saveToFile(character);
          } catch (fileError) {
            console.warn('File picker save also failed:', fileError);
          }
        }
      } else {
        // No project path, use file picker
        console.log('[useCharacterPersistence] No project path available, using file picker');
        try {
          await saveToFile(character);
        } catch (error) {
          // File system save failed, but localStorage succeeded
          console.warn('File system save failed, character saved to localStorage only');
        }
      }

      return character;
    },
    [addCharacter, updateCharacter, getAllCharacters, saveToLocalStorage, saveToFile, saveToProjectDirectory, loadFromLocalStorage]
  );

  /**
   * Load a character from localStorage
   * Requirements: 8.1, 8.2, 8.4
   */
  const loadCharacter = useCallback(
    async (character_id: string): Promise<Character | null> => {
      try {
        const character = loadFromLocalStorage(character_id);

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
    [addCharacter, loadFromLocalStorage]
  );

  /**
   * Load all characters from localStorage
   * Requirements: 8.1, 8.2, 8.4
   */
  const loadAllCharacters = useCallback(async (): Promise<Character[]> => {
    try {
      const characterIds = JSON.parse(
        localStorage.getItem('character-ids') || '[]'
      ) as string[];

      const characters: Character[] = [];
      const errors: Array<{ id: string; error: unknown }> = [];

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
   * Load and sync characters when a project is loaded
   * This should be called after a project is loaded to ensure all characters
   * from the project directory are properly loaded into the store
   * Requirements: 8.2, 8.4
   */
  const loadAndSyncCharacters = useCallback(async (): Promise<{ loaded: number; errors: number }> => {
    const projectPath = useEditorStore.getState().projectPath;

    if (!projectPath) {
      console.log('[useCharacterPersistence] No project path available for loading characters');
      return { loaded: 0, errors: 0 };
    }

    let loaded = 0;
    let errors = 0;

    try {
      // First, load characters from project directory
      const projectCharacters = await loadCharactersFromProjectDirectory(projectPath);

      if (projectCharacters.length > 0) {
        // Use setCharacters to bulk set all characters at once (more efficient)
        const existingCharacters = getAllCharacters();
        const allCharacters = [...existingCharacters];

        for (const character of projectCharacters) {
          try {
            // Check if character already exists in store
            const existingIndex = allCharacters.findIndex(
              (c) => c.character_id === character.character_id
            );

            if (existingIndex >= 0) {
              // Update existing character
              allCharacters[existingIndex] = character;
            } else {
              // Add new character
              allCharacters.push(character);
            }

            // Also save to localStorage
            saveToLocalStorage(character);
            loaded++;
          } catch (error) {
            console.error(`[useCharacterPersistence] Failed to sync character ${character.character_id}:`, error);
            errors++;
          }
        }

        // Bulk update store with all characters
        setCharacters(allCharacters);

        console.log(`[useCharacterPersistence] Loaded and synced ${loaded} characters from project directory`);
      }

      // Also check localStorage for any characters not in project directory
      const characterIds = JSON.parse(
        localStorage.getItem('character-ids') || '[]'
      ) as string[];

      for (const id of characterIds) {
        try {
          // Check if character is already loaded from project directory
          const alreadyLoaded = projectCharacters.some((c) => c.character_id === id);
          if (!alreadyLoaded) {
            const character = loadFromLocalStorage(id);
            if (character) {
              const existingCharacters = getAllCharacters();
              const existingIndex = existingCharacters.findIndex(
                (c) => c.character_id === id
              );

              if (existingIndex >= 0) {
                // Update with localStorage version
                updateCharacter(id, character);
              } else {
                // Add new character from localStorage
                addCharacter(character);
              }
            }
          }
        } catch (error) {
          console.error(`[useCharacterPersistence] Failed to load character ${id} from localStorage:`, error);
        }
      }

      return { loaded, errors };
    } catch (error) {
      console.error('[useCharacterPersistence] Failed to load and sync characters:', error);
      return { loaded, errors };
    }
  }, [loadCharactersFromProjectDirectory, getAllCharacters, setCharacters, saveToLocalStorage, addCharacter, updateCharacter, loadFromLocalStorage]);

  /**
   * Delete a character from localStorage, file system, and store
   * Requirements: 8.1, 8.2
   */
  const removeCharacter = useCallback(
    async (character_id: string): Promise<void> => {
      try {
        // Get project path from editor store
        const projectPath = useEditorStore.getState().projectPath;

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

        // Remove from project directory if available
        if (projectPath && window.electronAPI?.fs?.unlink) {
          try {
            const filePath = `${projectPath}/characters/character_${character_id}.json`;
            await window.electronAPI.fs.unlink(filePath);
            console.log(`[useCharacterPersistence] Deleted character file: ${filePath}`);
          } catch (error) {
            console.warn('[useCharacterPersistence] Failed to delete character from project directory:', error);
          }
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

  /**
   * Sync characters from project directory to store
   * Loads all characters from the project's characters folder
   * Requirements: 8.2, 8.4
   */
  const syncCharactersFromProject = useCallback(
    async (): Promise<{ loaded: number; errors: number }> => {
      const projectPath = useEditorStore.getState().projectPath;

      if (!projectPath) {
        console.log('[useCharacterPersistence] No project path available for sync');
        return { loaded: 0, errors: 0 };
      }

      let loaded = 0;
      let errors = 0;

      try {
        const characters = await loadCharactersFromProjectDirectory(projectPath);

        for (const character of characters) {
          try {
            // Check if character already exists in store
            const existingCharacters = getAllCharacters();
            const existingIndex = existingCharacters.findIndex(
              (c) => c.character_id === character.character_id
            );

            if (existingIndex >= 0) {
              // Update existing character
              updateCharacter(character.character_id, character);
            } else {
              // Add new character
              addCharacter(character);
            }

            // Also save to localStorage
            saveToLocalStorage(character);

            loaded++;
          } catch (error) {
            console.error(`[useCharacterPersistence] Failed to sync character ${character.character_id}:`, error);
            errors++;
          }
        }

        if (loaded > 0) {
          toast.success(
            'Characters Synchronized',
            `Loaded ${loaded} character${loaded > 1 ? 's' : ''} from project directory`,
            3000
          );
        }

        return { loaded, errors };
      } catch (error) {
        console.error('[useCharacterPersistence] Failed to sync characters from project:', error);
        return { loaded, errors };
      }
    },
    [addCharacter, updateCharacter, getAllCharacters, loadCharactersFromProjectDirectory, saveToLocalStorage]
  );

  return {
    saveCharacter,
    loadCharacter,
    loadAllCharacters,
    loadAndSyncCharacters,
    removeCharacter,
    syncCharactersFromProject,
    saveToProjectDirectory,
    loadCharactersFromProjectDirectory,
  };
}




