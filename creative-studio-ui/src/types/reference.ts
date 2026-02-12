/**
 * Three-Level Reference System Types
 * 
 * Provides TypeScript types for the continuous creation feature's
 * reference system with three levels of inheritance:
 * - Master (Project-level)
 * - Sequence (Episode/Scene-level)
 * - Shot (Individual shot-level)
 */

// Re-export ReferenceImage from sequence-editor types
// Already exists in creative-studio-ui/src/sequence-editor/types/index.ts

/**
 * Reference image with weight for AI generation influence
 */
export interface ReferenceImage {
  id: string;
  url: string;
  weight: number;
  source: 'upload' | 'library' | 'character' | 'environment' | 'visual-style';
}

// ============================================================================
// Level 1: Master Reference Sheet (Project-Level)
// ============================================================================

/**
 * Master reference sheet at the project level containing all character,
 * location, and global style references
 */
export interface MasterReferenceSheet {
  /** Unique identifier for the master reference sheet */
  id: string;
  /** Reference to the parent project */
  projectId: string;
  /** All character appearance sheets in this project */
  characterSheets: CharacterAppearanceSheet[];
  /** All location appearance sheets in this project */
  locationSheets: LocationAppearanceSheet[];
  /** Project-wide style guidelines */
  styleSheet: GlobalStyleSheet;
  /** Creation timestamp */
  createdAt: Date;
  /** Last modification timestamp */
  updatedAt: Date;
}

/**
 * Character reference sheet for visual consistency across the project
 */
export interface CharacterAppearanceSheet {
  /** Unique identifier */
  id: string;
  /** Reference to the character entity */
  characterId: string;
  /** Display name of the character */
  characterName: string;
  /** Reference images showing different views and poses */
  appearanceImages: AppearanceImage[];
  /** Text guidelines for appearance (hair, clothing, accessories) */
  styleGuidelines: string[];
  /** Hex color codes for character-specific colors */
  colorPalette: string[];
  /** Proportion guidelines (e.g., anime, realistic, stylized) */
  proportions: string;
}

/**
 * Location reference sheet for environmental consistency
 */
export interface LocationAppearanceSheet {
  /** Unique identifier */
  id: string;
  /** Reference to the location entity */
  locationId: string;
  /** Display name of the location */
  locationName: string;
  /** Reference images for the location */
  referenceImages: ReferenceImage[];
  /** Environmental guidelines (lighting, atmosphere, props) */
  environmentalGuidelines: string[];
}

/**
 * Project-wide style guidelines for visual consistency
 */
export interface GlobalStyleSheet {
  /** Unique identifier */
  id: string;
  /** Name of the overall style */
  styleName: string;
  /** Art style classification (e.g., anime, photorealistic, watercolor) */
  artStyle: string;
  /** Primary color palette for the project */
  colorPalette: string[];
  /** Lighting style guidelines */
  lightingStyle: string;
  /** Composition guidelines */
  compositionGuidelines: string[];
  /** Mood board images */
  moodBoard: ReferenceImage[];
}

// ============================================================================
// Level 2: Sequence Reference Sheet (Episode/Scene-Level)
// ============================================================================

/**
 * Sequence-level reference sheet that inherits from master sheet
 */
export interface SequenceReferenceSheet {
  /** Unique identifier */
  id: string;
  /** Reference to the master sheet */
  masterSheetId: string;
  /** Reference to the sequence/episode */
  sequenceId: string;
  /** Character IDs inherited from master sheet */
  inheritedCharacters: string[];
  /** Location IDs inherited from master sheet */
  inheritedLocations: string[];
  /** Sequence-specific style modifications */
  sequenceStyle: SequenceStyle;
  /** References to previous episodes for continuity */
  episodeReferences: PreviousEpisodeReference[];
}

/**
 * Sequence-specific style configuration
 */
export interface SequenceStyle {
  /** Overrides to master style guidelines */
  styleOverrides: string[];
  /** Pacing style for the sequence */
  pacing: 'slow' | 'moderate' | 'fast';
  /** Transition types used in this sequence */
  transitions: TransitionType[];
  /** Color grading preset */
  colorGrading: string;
}

/**
 * Reference to previous episodes for continuity checking
 */
export interface PreviousEpisodeReference {
  /** Previous episode identifier */
  episodeId: string;
  /** Previous episode display name */
  episodeName: string;
  /** Shot IDs from previous episode to reference */
  referenceShotIds: string[];
  /** Notes about continuity requirements */
  continuityNotes: string[];
}

// ============================================================================
// Level 3: Shot Reference (Shot-Level)
// ============================================================================

/**
 * Shot-level reference with inheritance from master and sequence
 */
export interface ShotReference {
  /** Unique identifier */
  id: string;
  /** Reference to the shot entity */
  shotId: string;
  /** Reference to the parent sequence sheet */
  sequenceSheetId: string;
  /** Local reference images specific to this shot */
  localReferenceImages: ReferenceImage[];
  /** IDs of references inherited from master sheet */
  inheritedFromMaster: string[];
  /** IDs of references inherited from sequence sheet */
  inheritedFromSequence: string[];
  /** Overrides for consistency at shot level */
  consistencyOverrides: ConsistencyOverride[];
}

/**
 * Override for visual consistency rules
 */
export interface ConsistencyOverride {
  /** Unique identifier */
  id: string;
  /** Type of element being overridden */
  type: 'character' | 'location' | 'style';
  /** ID of the target element */
  targetId: string;
  /** Reason for the override */
  overrideReason: string;
  /** Optional reference image for the override */
  overrideImage?: ReferenceImage;
}

// ============================================================================
// Supporting Types
// ============================================================================

/**
 * Character appearance reference image
 */
export interface AppearanceImage {
  /** Unique identifier */
  id: string;
  /** Image URL or path */
  url: string;
  /** View angle/pose type */
  viewType: 'front' | 'side' | 'back' | 'full_body' | 'portrait';
  /** Description of the appearance */
  description: string;
  /** Optional style variant (e.g., casual, formal, battle) */
  styleVariant?: string;
}

/**
 * Transition type enumeration for sequence transitions
 */
export type TransitionType = 
  | 'cut'
  | 'dissolve'
  | 'fade'
  | 'wipe'
  | 'match_cut'
  | 'cross_dissolve';

// ============================================================================
// Type Guards and Utilities
// ============================================================================

/**
 * Type guard for checking if a transition type is valid
 */
export function isValidTransitionType(value: string): value is TransitionType {
  return [
    'cut',
    'dissolve',
    'fade',
    'wipe',
    'match_cut',
    'cross_dissolve'
  ].includes(value);
}

/**
 * Type guard for checking if a view type is valid
 */
export function isValidViewType(value: string): value is AppearanceImage['viewType'] {
  return ['front', 'side', 'back', 'full_body', 'portrait'].includes(value);
}

/**
 * Type guard for checking if a pacing value is valid
 */
export function isValidPacing(value: string): value is SequenceStyle['pacing'] {
  return ['slow', 'moderate', 'fast'].includes(value);
}
