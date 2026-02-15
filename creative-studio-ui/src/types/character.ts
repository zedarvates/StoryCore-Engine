// ============================================================================
// Character Types for Character Creation Wizard
// ============================================================================

/**
 * Image data for reference images (full body views)
 */
export interface ReferenceImageData {
  id: string;
  url: string;
  type: 'reference' | 'reference_sheet';
  panel?: string;
  created_at: string;
  filename?: string;
}

/**
 * Image data for multi-view character sheets (front, left, right, back)
 */
export interface SheetImageData {
  id: string;
  url: string;
  panel: string;  // 'front', 'left', 'right', 'back'
  created_at: string;
  filename?: string;
}

export interface Character {
  character_id: string;
  name: string;
  creation_method: 'wizard' | 'auto_generated' | 'manual';
  creation_timestamp: string;
  version: string;

  // Visual identity
  visual_identity: VisualIdentity;

  // Personality
  personality: Personality;

  // Background
  background: Background;

  // Relationships
  relationships: CharacterRelationship[];

  // Role in story
  role: Role;
}

export interface VisualIdentity {
  hair_color: string;
  hair_style: string;
  hair_length: string;
  eye_color: string;
  eye_shape: string;
  skin_tone: string;
  facial_structure: string;
  distinctive_features: string[];
  age_range: string;
  gender: string;
  height: string;
  build: string;
  posture: string;
  clothing_style: string;
  color_palette: string[];
  generated_portrait?: string; // Path to generated portrait image (relative to project or indexeddb://)

  // Reference images and sheets for multi-view generation
  reference_images: ReferenceImageData[];  // Generated reference images
  reference_sheet_images: SheetImageData[];  // Multi-view sheet images (front, left, right, back)
}

export interface Personality {
  traits: string[];
  values: string[];
  fears: string[];
  desires: string[];
  flaws: string[];
  strengths: string[];
  temperament: string;
  communication_style: string;
}

export interface Background {
  origin: string;
  occupation: string;
  education: string;
  family: string;
  significant_events: string[];
  current_situation: string;
}

export interface CharacterRelationship {
  character_id: string;
  character_name: string;
  relationship_type: string;
  description: string;
  dynamic: string;
}

export interface Role {
  archetype: string;
  narrative_function: string;
  character_arc: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

export function createEmptyCharacter(): Partial<Character> {
  return {
    character_id: '',
    name: '',
    creation_method: 'wizard',
    creation_timestamp: new Date().toISOString(),
    version: '1.0',
    visual_identity: {
      hair_color: '',
      hair_style: '',
      hair_length: '',
      eye_color: '',
      eye_shape: '',
      skin_tone: '',
      facial_structure: '',
      distinctive_features: [],
      age_range: '',
      gender: '',
      height: '',
      build: '',
      posture: '',
      clothing_style: '',
      color_palette: [],
      // Initialize reference images arrays (empty by default)
      reference_images: [],
      reference_sheet_images: [],
    },
    personality: {
      traits: [],
      values: [],
      fears: [],
      desires: [],
      flaws: [],
      strengths: [],
      temperament: '',
      communication_style: '',
    },
    background: {
      origin: '',
      occupation: '',
      education: '',
      family: '',
      significant_events: [],
      current_situation: '',
    },
    relationships: [],
    role: {
      archetype: '',
      narrative_function: '',
      character_arc: '',
    },
  };
}

export function isCharacterComplete(character: Partial<Character>): boolean {
  return !!(
    character.name &&
    character.role?.archetype &&
    character.visual_identity?.age_range &&
    character.visual_identity?.gender
  );
}
