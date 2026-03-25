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
  created_at: number; // timestamp in ms
  filename?: string;
}

/**
 * Image data for multi-view character sheets (front, left, right, back)
 */
export interface SheetImageData {
  id: string;
  url: string;
  panel: string;  // 'front', 'left', 'right', 'back'
  created_at: number; // timestamp in ms
  filename?: string;
}

export interface Character {
  character_id: string;
  name: string;
  creation_method: 'wizard' | 'auto_generated' | 'manual' | 'ai_vision';
  creation_timestamp: number; // timestamp in ms
  last_modified?: number; // timestamp in ms
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

  // Advanced Manga/Anime fields
  archetype?: string;
  goal?: string;
  flaw_sympathy?: string;
  daily_details?: {
    habits?: string[];
    diet?: string;
    clothing_style?: string;
    [key: string]: unknown;
  };
  
  // Associated prompts
  prompts?: string[];

  // 3D/Visualization settings
  material_color?: [number, number, number]; // RGB 0.0-1.0

  // AI Consistency tracking
  ai_coherence_data?: unknown;
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
  gender: Gender;
  height: string;
  build: string;
  posture: string;
  clothing_style: string;
  visual_style?: string; // e.g., 'manga', 'cinematic'
  ethnicity?: string;
  color_palette: string[];
  generated_portrait?: string; // Path to generated portrait image (relative to project or indexeddb://)

  // Reference images and sheets for multi-view generation
  reference_images: ReferenceImageData[];  // Generated reference images
  reference_sheet_images: SheetImageData[];  // Multi-view sheet images (front, left, right, back)
}

// Type definitions for Character properties
export type Gender = 'male' | 'female' | 'non-binary' | 'other' | 'unspecified';
export type CreationMethod = 'wizard' | 'auto_generated' | 'manual' | 'ai_vision';
export type RelationshipType = 'friend' | 'enemy' | 'family' | 'romantic' | 'professional' | 'neutral';
export type Archetype = 'hero' | 'villain' | 'mentor' | 'sidekick' | 'love_interest' | 'comic_relief' | 'anti_hero' | 'neutral';
export const NARRATIVE_FUNCTIONS = [
  'Protagonist',
  'Antagonist',
  'Rival',
  'Némésis',
  'Mentor',
  'Sidekick',
  'Ally',
  'Love Interest (Ideal)',
  'Love Interest (Partner)',
  'Love Interest (Maternal/Fraternal)',
  'Guardian',
  'Threshold Guardian',
  'Trickster',
  'Shapeshifter',
  'Shadow',
  'Herald',
  'Support',
  'Extra / Background Character',
] as const;
export type NarrativeFunction = typeof NARRATIVE_FUNCTIONS[number];
export type CharacterArc = 'positive' | 'negative' | 'flat' | 'tragic' | 'redemptive';

export interface Personality {
  traits: string[];
  values: string[];
  fears: string[];
  desires: string[];
  flaws: string[];
  strengths: string[];
  temperament: string;
  communication_style: string;
  goal?: string; // Narrative goal
  flaw_sympathy?: string; // Humanizing flaws
  daily_details?: {
    habits?: string[];
    diet?: string;
    clothing_style?: string;
    [key: string]: unknown;
  };
}

export interface Background {
  origin: string;
  occupation: string;
  education: string;
  family: string;
  significant_events: string[];
  current_situation: string;
  backstory: string;
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
    creation_timestamp: Date.now(),
    last_modified: Date.now(),
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
      gender: 'unspecified',
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
      backstory: '',
    },
    relationships: [],
    role: {
      archetype: '',
      narrative_function: '',
      character_arc: '',
    },
    prompts: [],
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
