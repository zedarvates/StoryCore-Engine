// ============================================================================
// Character Storage Utilities
// ============================================================================
// Handles character JSON file operations and format mapping

import type { Character } from '../types/character';

/**
 * Map wizard form data to character JSON schema
 * Ensures compatibility with existing character JSON format
 */
export function mapWizardDataToCharacter(
  wizardData: Partial<Character>
): Character {
  // Generate UUID - use crypto.randomUUID if available, otherwise fallback
  let character_id = wizardData.character_id;
  if (!character_id) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      character_id = crypto.randomUUID();
    } else {
      // Fallback UUID generation
      character_id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }
  }

  return {
    character_id,
    name: wizardData.name || '',
    creation_method: wizardData.creation_method || 'wizard',
    creation_timestamp: wizardData.creation_timestamp || Date.now(),
    last_modified: Date.now(),
    version: wizardData.version || '1.0',

    visual_identity: {
      hair_color: wizardData.visual_identity?.hair_color || '',
      hair_style: wizardData.visual_identity?.hair_style || '',
      hair_length: wizardData.visual_identity?.hair_length || '',
      eye_color: wizardData.visual_identity?.eye_color || '',
      eye_shape: wizardData.visual_identity?.eye_shape || '',
      skin_tone: wizardData.visual_identity?.skin_tone || '',
      facial_structure: wizardData.visual_identity?.facial_structure || '',
      distinctive_features: wizardData.visual_identity?.distinctive_features || [],
      age_range: wizardData.visual_identity?.age_range || '',
      gender: wizardData.visual_identity?.gender || 'unspecified',
      height: wizardData.visual_identity?.height || '',
      build: wizardData.visual_identity?.build || '',
      posture: wizardData.visual_identity?.posture || '',
      clothing_style: wizardData.visual_identity?.clothing_style || '',
      color_palette: wizardData.visual_identity?.color_palette || [],
      reference_images: wizardData.visual_identity?.reference_images || [],
      reference_sheet_images: wizardData.visual_identity?.reference_sheet_images || [],
      generated_portrait: wizardData.visual_identity?.generated_portrait,
    },

    personality: {
      traits: wizardData.personality?.traits || [],
      values: wizardData.personality?.values || [],
      fears: wizardData.personality?.fears || [],
      desires: wizardData.personality?.desires || [],
      flaws: wizardData.personality?.flaws || [],
      strengths: wizardData.personality?.strengths || [],
      temperament: wizardData.personality?.temperament || '',
      communication_style: wizardData.personality?.communication_style || '',
    },

    background: {
      origin: wizardData.background?.origin || '',
      occupation: wizardData.background?.occupation || '',
      education: wizardData.background?.education || '',
      family: wizardData.background?.family || '',
      significant_events: wizardData.background?.significant_events || [],
      current_situation: wizardData.background?.current_situation || '',
      backstory: wizardData.background?.backstory || '',
    },

    relationships: wizardData.relationships || [],

    role: {
      archetype: wizardData.role?.archetype || '',
      narrative_function: wizardData.role?.narrative_function || '',
      character_arc: wizardData.role?.character_arc || '',
    },
    prompts: wizardData.prompts || [],
    material_color: wizardData.material_color,
  };
}

/**
 * Validate character data before saving
 */
export function validateCharacter(character: Partial<Character>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Required fields
  if (!character.name || character.name.trim() === '') {
    errors.push('Character name is required');
  }

  // We relaxed the validation slightly to allow partial saves during wizard entry
  // but for a "complete" character, archetype and age range are needed
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate character filename from UUID and name
 */
export function getCharacterFilename(character: Character): string {
  const sanitizedName = character.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  return `${sanitizedName}.json`;
}

/**
 * Get character file path (legacy support)
 */
export function getCharacterFilePath(character_id: string): string {
  return `characters/${character_id}.json`;
}

/**
 * Format character for JSON export
 * Ensures proper formatting and structure
 */
export function formatCharacterForExport(character: Character): string {
  return JSON.stringify(character, null, 2);
}

/**
 * Parse character from JSON string
 */
export function parseCharacterFromJSON(json: string): Character {
  try {
    const parsed = JSON.parse(json);

    // Validate required fields
    if (!parsed.character_id || !parsed.name) {
      throw new Error('Invalid character JSON: missing required fields');
    }

    return parsed as Character;
  } catch (error) {
    throw new Error(`Failed to parse character JSON: ${error}`);
  }
}

/**
 * Create a character summary for display in dropdowns
 */
export function getCharacterSummary(character: Character): string {
  const parts: string[] = [character.name];

  if (character.role?.archetype) {
    parts.push(character.role.archetype);
  }

  if (character.visual_identity?.age_range) {
    parts.push(character.visual_identity.age_range);
  }

  return parts.join(' • ');
}

/**
 * Filter characters for dropdown selection
 * Excludes the current character being edited
 */
export function filterCharactersForSelection(
  characters: Character[],
  excludeId?: string
): Character[] {
  return characters.filter((char) => char.character_id !== excludeId);
}

/**
 * Sort characters by name
 */
export function sortCharactersByName(characters: Character[]): Character[] {
  return [...characters].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Sort characters by creation date (newest first)
 */
export function sortCharactersByDate(characters: Character[]): Character[] {
  return [...characters].sort((a, b) => {
    return (b.creation_timestamp || 0) - (a.creation_timestamp || 0);
  });
}

/**
 * Group characters by archetype
 */
export function groupCharactersByArchetype(
  characters: Character[]
): Record<string, Character[]> {
  return characters.reduce((groups, character) => {
    const archetype = character.role?.archetype || 'Unspecified';
    if (!groups[archetype]) {
      groups[archetype] = [];
    }
    groups[archetype].push(character);
    return groups;
  }, {} as Record<string, Character[]>);
}

function getCharactersDir(projectId: string): string {
  // If it's an absolute path
  if (projectId.match(/^[a-zA-Z]:[\\/]/) || projectId.startsWith('/')) {
    const normalizedPath = projectId.replace(/\\/g, '/');
    return normalizedPath.endsWith('/') ? `${normalizedPath}characters` : `${normalizedPath}/characters`;
  }
  return `./projects/${projectId}/characters`;
}

// ============================================================================
// File System Operations
// ============================================================================

/**
 * Save result interface
 */
export interface SaveCharacterResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

/**
 * Saves a character to the project's characters directory
 * Creates a folder for each character with their name containing all resources
 * 
 * @param projectId - The project ID
 * @param characterId - The character UUID
 * @param characterData - The character data to save
 * @returns Promise<SaveCharacterResult>
 */
export async function saveCharacterToProject(
  projectId: string,
  characterId: string,
  characterData: Character
): Promise<SaveCharacterResult> {
  try {
    // Validate required fields
    if (!characterId) {
      return { success: false, error: 'Character ID is required' };
    }

    if (!characterData.name) {
      return { success: false, error: 'Character name is required' };
    }

    // Sanitize character name for folder name (remove special characters)
    const sanitizedName = characterData.name
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase()
      .substring(0, 50); // Limit length

    // Check if Electron API is available
    if (!window.electronAPI?.fs) {
      console.warn('[characterStorage] Electron API not available, falling back to localStorage');

      // Fallback: Save to localStorage
      const key = `project-${projectId}-characters`;
      const existingCharacters = JSON.parse(localStorage.getItem(key) || '{}');
      existingCharacters[characterId] = characterData;
      localStorage.setItem(key, JSON.stringify(existingCharacters));

      return {
        success: true,
        filePath: `localStorage://${projectId}/characters/${sanitizedName}/character.json`
      };
    }

    // Build file path with character's own folder
    const charactersDir = getCharactersDir(projectId);
    const characterFolder = `${charactersDir}/${sanitizedName}_${characterId.substring(0, 8)}`;
    const filePath = `${characterFolder}/${sanitizedName}.json`;

    // Ensure character's directory exists
    if (window.electronAPI.fs.mkdir) {
      await window.electronAPI.fs.mkdir(characterFolder, { recursive: true });
    }

    // Create JSON content
    const jsonData = JSON.stringify(characterData, null, 2);

    // Write file
    await window.electronAPI.fs.writeFile(filePath, jsonData);

    console.log(`[characterStorage] Character saved: ${filePath}`);

    // Create a README file in the character folder
    const readmeContent = `# ${characterData.name}\n\nCharacter ID: ${characterId}\nCreated: ${new Date(characterData.creation_timestamp).toLocaleString()}\n\n## Folder Structure\n- character.json: Main character data\n- images/: Character reference images\n- reference_sheets/: Character reference sheets\n`;
    
    try {
      await window.electronAPI.fs.writeFile(`${characterFolder}/README.md`, readmeContent);
    } catch (error) {
      console.warn('[characterStorage] Could not create README:', error);
    }

    // Create subdirectories for images
    try {
      await window.electronAPI.fs.mkdir(`${characterFolder}/images`, { recursive: true });
      await window.electronAPI.fs.mkdir(`${characterFolder}/reference_sheets`, { recursive: true });
    } catch (error) {
      console.warn('[characterStorage] Could not create image directories:', error);
    }

    return { success: true, filePath };
  } catch (error) {
    console.error('[characterStorage] Failed to save character:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Loads a character from a project file
 * Searches in character folders
 */
export async function loadCharacterFromProject(
  projectId: string,
  characterId: string
): Promise<Character | null> {
  try {
    if (!window.electronAPI?.fs) {
      // Fallback to localStorage
      const key = `project-${projectId}-characters`;
      const existingCharacters = JSON.parse(localStorage.getItem(key) || '{}');
      return existingCharacters[characterId] || null;
    }

    const charactersDir = getCharactersDir(projectId);

    // List all character folders
    const exists = await window.electronAPI.fs.exists(charactersDir);
    if (!exists) {
      return null;
    }

    const folders = await window.electronAPI.fs.readdir(charactersDir);

    // Read all files in the folder to find the character JSON
    for (const folder of folders) {
      if (characterId && typeof characterId === 'string' && folder.includes(characterId.substring(0, 8))) {
        const folderPath = `${charactersDir}/${folder}`;
        
        try {
          const folderFiles = await window.electronAPI.fs.readdir(folderPath);
          // Look for either character.json or [name]_character.json
          const characterFile = folderFiles.find(f => f === 'character.json' || f.endsWith('_character.json'));
          
          if (characterFile) {
            const filePath = `${folderPath}/${characterFile}`;
            const fileContent = await window.electronAPI.fs.readFile(filePath);
            const decoder = new TextDecoder();
            const jsonData = decoder.decode(fileContent);
            return JSON.parse(jsonData) as Character;
          }
        } catch (error) {
          console.warn(`[characterStorage] Could not read character from folder ${folder}:`, error);
        }
      }
    }

    return null;
  } catch (error) {
    console.error('[characterStorage] Failed to load character:', error);
    return null;
  }
}

/**
 * Lists all characters in a project
 * Searches through character folders
 */
export async function listCharactersInProject(
  projectId: string
): Promise<string[]> {
  try {
    if (!window.electronAPI?.fs) {
      // Fallback to localStorage
      const key = `project-${projectId}-characters`;
      const existingCharacters = JSON.parse(localStorage.getItem(key) || '{}');
      return Object.keys(existingCharacters);
    }

    const charactersDir = getCharactersDir(projectId);

    const exists = await window.electronAPI.fs.exists(charactersDir);
    if (!exists) {
      return [];
    }

    const folders = await window.electronAPI.fs.readdir(charactersDir);
    const characterIds: string[] = [];

    // Read character data from each folder
    for (const folder of folders) {
      const folderPath = `${charactersDir}/${folder}`;
      
      try {
        const folderFiles = await window.electronAPI.fs.readdir(folderPath);
        const characterFile = folderFiles.find(f => f === 'character.json' || f.endsWith('_character.json'));
        
        if (characterFile) {
          const filePath = `${folderPath}/${characterFile}`;
          const fileContent = await window.electronAPI.fs.readFile(filePath);
          const decoder = new TextDecoder();
          const jsonData = decoder.decode(fileContent);
          const character = JSON.parse(jsonData) as Character;
          characterIds.push(character.character_id);
        }
      } catch (error) {
        console.warn(`[characterStorage] Could not read character from folder ${folder}:`, error);
      }
    }

    return characterIds;
  } catch (error) {
    console.error('[characterStorage] Failed to list characters:', error);
    return [];
  }
}

/**
 * Deletes a character from the project
 * Removes the entire character folder
 */
export async function deleteCharacterFromProject(
  projectId: string,
  characterId: string
): Promise<boolean> {
  try {
    if (!window.electronAPI?.fs) {
      // Fallback to localStorage
      const key = `project-${projectId}-characters`;
      const existingCharacters = JSON.parse(localStorage.getItem(key) || '{}');
      delete existingCharacters[characterId];
      localStorage.setItem(key, JSON.stringify(existingCharacters));
      return true;
    }

    const charactersDir = getCharactersDir(projectId);

    // Find the character's folder
    const exists = await window.electronAPI.fs.exists(charactersDir);
    if (!exists) {
      return true;
    }

    const folders = await window.electronAPI.fs.readdir(charactersDir);

    // Find and delete the folder that contains this character ID
    for (const folder of folders) {
      if (folder.includes(characterId.substring(0, 8))) {
        const folderPath = `${charactersDir}/${folder}`;
        
        try {
          // Delete all files in the folder first
          const files = await window.electronAPI.fs.readdir(folderPath);
          for (const file of files) {
            try {
              await window.electronAPI.fs.unlink(`${folderPath}/${file}`);
            } catch (error) {
              console.warn(`[characterStorage] Could not delete file ${file}:`, error);
            }
          }

          // Try to delete subdirectories
          try {
            const subDirs = ['images', 'reference_sheets'];
            for (const subDir of subDirs) {
              const subDirPath = `${folderPath}/${subDir}`;
              const subDirExists = await window.electronAPI.fs.exists(subDirPath);
              if (subDirExists) {
                const subFiles = await window.electronAPI.fs.readdir(subDirPath);
                for (const subFile of subFiles) {
                  try {
                    await window.electronAPI.fs.unlink(`${subDirPath}/${subFile}`);
                  } catch (error) {
                    console.warn(`[characterStorage] Could not delete subfile ${subFile}:`, error);
                  }
                }
              }
            }
          } catch (error) {
            console.warn('[characterStorage] Could not clean subdirectories:', error);
          }

          console.log(`[characterStorage] Character folder deleted: ${folderPath}`);
          return true;
        } catch (error) {
          console.error(`[characterStorage] Error deleting character folder ${folderPath}:`, error);
        }
      }
    }

    return true;
  } catch (error) {
    console.error('[characterStorage] Failed to delete character:', error);
    return false;
  }
}

/**
 * Save an image to a character's folder
 * 
 * @param projectId - The project ID
 * @param characterId - The character UUID
 * @param characterName - The character name (for folder lookup)
 * @param imageData - The image data (base64 or blob)
 * @param imageType - Type of image ('reference' or 'reference_sheet')
 * @param fileName - Optional custom file name
 * @returns Promise with the saved file path
 */
export async function saveCharacterImage(
  projectId: string,
  characterId: string,
  characterName: string,
  imageData: string | Blob,
  imageType: 'reference' | 'reference_sheet',
  fileName?: string
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    if (!window.electronAPI?.fs) {
      console.warn('[characterStorage] Electron API not available for image saving');
      return { success: false, error: 'Electron API not available' };
    }

    // Sanitize character name for folder name
    const sanitizedName = characterName
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase()
      .substring(0, 50);

    const charactersDir = getCharactersDir(projectId);
    const characterFolder = `${charactersDir}/${sanitizedName}_${characterId.substring(0, 8)}`;
    const imageFolder = imageType === 'reference_sheet' ? 'reference_sheets' : 'images';
    const targetDir = `${characterFolder}/${imageFolder}`;

    // Ensure directory exists
    await window.electronAPI.fs.mkdir(targetDir, { recursive: true });

    // Generate file name if not provided
    const finalFileName = fileName || `${imageType}_${Date.now()}.png`;
    const filePath = `${targetDir}/${finalFileName}`;

    // Convert image data to buffer if needed
    let imageBuffer: string;
    if (typeof imageData === 'string') {
      // If it's a base64 string, remove the data URL prefix if present
      imageBuffer = imageData.replace(/^data:image\/\w+;base64,/, '');
    } else {
      // Convert Blob to base64
      const reader = new FileReader();
      imageBuffer = await new Promise((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).replace(/^data:image\/\w+;base64,/, ''));
        reader.onerror = reject;
        reader.readAsDataURL(imageData);
      });
    }

    // Write the file
    // Note: writeFile expects string or Buffer, so we need to convert base64 to Buffer
    const buffer = Buffer.from(imageBuffer, 'base64');
    await window.electronAPI.fs.writeFile(filePath, buffer);

    console.log(`[characterStorage] Image saved: ${filePath}`);
    return { success: true, filePath };
  } catch (error) {
    console.error('[characterStorage] Failed to save character image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
