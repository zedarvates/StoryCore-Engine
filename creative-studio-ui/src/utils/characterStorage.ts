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
    creation_method: 'wizard',
    creation_timestamp: new Date().toISOString(),
    version: '1.0',

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
      gender: wizardData.visual_identity?.gender || '',
      height: wizardData.visual_identity?.height || '',
      build: wizardData.visual_identity?.build || '',
      posture: wizardData.visual_identity?.posture || '',
      clothing_style: wizardData.visual_identity?.clothing_style || '',
      color_palette: wizardData.visual_identity?.color_palette || [],
      reference_images: wizardData.visual_identity?.reference_images || [],
      reference_sheet_images: wizardData.visual_identity?.reference_sheet_images || [],
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
    },

    relationships: wizardData.relationships || [],

    role: {
      archetype: wizardData.role?.archetype || '',
      narrative_function: wizardData.role?.narrative_function || '',
      character_arc: wizardData.role?.character_arc || '',
    },
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

  if (!character.role?.archetype) {
    errors.push('Character archetype is required');
  }

  if (!character.visual_identity?.age_range) {
    errors.push('Age range is required');
  }

  // Validate relationships
  if (character.relationships) {
    character.relationships.forEach((rel, index) => {
      if (!rel.character_id) {
        errors.push(`Relationship ${index + 1}: Character ID is required`);
      }
      if (!rel.relationship_type) {
        errors.push(`Relationship ${index + 1}: Relationship type is required`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate character filename from UUID
 */
export function getCharacterFilename(character_id: string): string {
  return `${character_id}.json`;
}

/**
 * Get character file path
 */
export function getCharacterFilePath(character_id: string): string {
  return `characters/${getCharacterFilename(character_id)}`;
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
    const dateA = new Date(a.creation_timestamp).getTime();
    const dateB = new Date(b.creation_timestamp).getTime();
    return dateB - dateA;
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
