/**
 * Sprite Types for Animated Sprite System
 * 
 * Provides TypeScript types for the animated sprite system including:
 * - 8-direction orientation system
 * - Multi-style sprites (anime, cartoon, etc.)
 * - Frame-based animations
 * - Sprite metadata
 */

// ============================================================================
// Orientation Types (8-Direction System)
// ============================================================================

/**
 * 8-direction orientation for RPG-style sprite movement
 * N = North (up), S = South (down), E = East (right), W = West (left)
 */
export type SpriteOrientation = 
  | 'n'   // North (facing up)
  | 'ne'  // North-East
  | 'e'   // East (facing right)
  | 'se'  // South-East
  | 's'   // South (facing down)
  | 'sw'  // South-West
  | 'w'   // West (facing left)
  | 'nw'; // North-West

/**
 * All orientations as an array for iteration
 */
export const SPRITE_ORIENTATIONS: SpriteOrientation[] = [
  'n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'
];

/**
 * Orientation angles in degrees (0 = East, counter-clockwise)
 */
export const ORIENTATION_ANGLES: Record<SpriteOrientation, number> = {
  'e': 0,
  'ne': 45,
  'n': 90,
  'nw': 135,
  'w': 180,
  'sw': 225,
  's': 270,
  'se': 315
};

/**
 * Orientation vectors (normalized)
 */
export const ORIENTATION_VECTORS: Record<SpriteOrientation, { x: number; y: number }> = {
  'n': { x: 0, y: -1 },
  'ne': { x: 0.707, y: -0.707 },
  'e': { x: 1, y: 0 },
  'se': { x: 0.707, y: 0.707 },
  's': { x: 0, y: 1 },
  'sw': { x: -0.707, y: 0.707 },
  'w': { x: -1, y: 0 },
  'nw': { x: -0.707, y: -0.707 }
};

// ============================================================================
// Sprite Style Types
// ============================================================================

/**
 * Visual style of the sprite
 */
export type SpriteStyle = 
  | 'anime_japanese'   // Japanese anime style (shonen, shojo, seinen)
  | 'manhwa_korean'    // Korean webtoon style
  | 'manhua_chinese'   // Chinese comic style
  | 'cartoon_american' // Western cartoon style
  | 'chibi'            // Super-deformed cute style
  | 'pixel_art'        // Retro pixel art style
  | 'realistic'        // Semi-realistic style
  | 'custom';          // User-defined style

/**
 * Sub-categories for each style
 */
export type AnimeSubStyle = 'shonen' | 'shojo' | 'seinen' | 'isekai' | 'mecha';
export type CartoonSubStyle = 'classic' | 'modern' | 'retro' | 'calarts';

export interface SpriteStyleConfig {
  mainStyle: SpriteStyle;
  subStyle?: AnimeSubStyle | CartoonSubStyle | string;
  customStyleName?: string;
}

// ============================================================================
// Sprite Source Types
// ============================================================================

/**
 * Source type for the sprite image data
 */
export type SpriteSourceType = 'file' | 'url' | 'generated' | 'spritesheet';

/**
 * Sprite source configuration
 */
export interface SpriteSource {
  /** Type of source */
  type: SpriteSourceType;
  
  /** Local file path (for file type) */
  path?: string;
  
  /** Remote URL (for url type) */
  url?: string;
  
  /** Generation prompt (for generated type) */
  generatedPrompt?: string;
  
  /** Generation model used */
  generationModel?: string;
  
  /** Original filename */
  filename?: string;
  
  /** File size in bytes */
  fileSize?: number;
  
  /** MIME type */
  mimeType?: string;
}

// ============================================================================
// Frame Types
// ============================================================================

/**
 * Rectangle defining a region in a sprite sheet
 */
export interface SpriteRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Individual frame in an animation
 */
export interface SpriteFrame {
  /** Unique frame identifier */
  id: string;
  
  /** Region in the source image */
  sourceRect: SpriteRect;
  
  /** Duration of this frame in milliseconds */
  duration: number;
  
  /** Anchor point for positioning (0-1 normalized) */
  anchorPoint: { x: number; y: number };
  
  /** Optional hitbox for collision detection */
  hitBox?: SpriteRect;
  
  /** Optional events triggered at this frame */
  events?: SpriteFrameEvent[];
}

/**
 * Event triggered at a specific frame
 */
export interface SpriteFrameEvent {
  /** Event type */
  type: 'sound' | 'effect' | 'hit' | 'custom';
  
  /** Event name or identifier */
  name: string;
  
  /** Event data */
  data?: Record<string, unknown>;
  
  /** Frame offset within the frame duration */
  offset?: number;
}

// ============================================================================
// Animation Types
// ============================================================================

/**
 * Animation for a specific orientation
 */
export interface OrientedAnimation {
  /** Unique animation identifier */
  id: string;
  
  /** Animation name (walk, run, idle, etc.) */
  name: string;
  
  /** Orientation this animation is for */
  orientation: SpriteOrientation;
  
  /** Frames in this animation */
  frames: SpriteFrame[];
  
  /** Whether this animation loops */
  loop: boolean;
  
  /** Number of times to loop (-1 = infinite) */
  loopCount: number;
  
  /** Animation speed multiplier */
  speed: number;
  
  /** Total duration in milliseconds */
  totalDuration: number;
}

/**
 * Animation definition (without orientation-specific data)
 */
export interface AnimationDefinition {
  /** Animation name */
  name: string;
  
  /** Human-readable display name */
  displayName: string;
  
  /** Animation category */
  category: 'movement' | 'action' | 'reaction' | 'idle' | 'emote';
  
  /** Default duration in milliseconds */
  defaultDuration: number;
  
  /** Whether this animation loops by default */
  defaultLoop: boolean;
  
  /** Whether this animation should have all 8 orientations */
  hasAllOrientations: boolean;
  
  /** Priority for blending (higher = more important) */
  priority: number;
  
  /** Transitions to other animations */
  transitions?: AnimationTransition[];
}

/**
 * Transition between animations
 */
export interface AnimationTransition {
  /** Target animation name */
  toAnimation: string;
  
  /** Condition for transition */
  condition?: string;
  
  /** Blend duration in milliseconds */
  blendDuration: number;
  
  /** Exit time (0-1 normalized position in animation) */
  exitTime?: number;
}

/**
 * Common animation presets
 */
export const ANIMATION_PRESETS: AnimationDefinition[] = [
  {
    name: 'idle',
    displayName: 'Idle',
    category: 'idle',
    defaultDuration: 1000,
    defaultLoop: true,
    hasAllOrientations: true,
    priority: 0
  },
  {
    name: 'walk',
    displayName: 'Walk',
    category: 'movement',
    defaultDuration: 800,
    defaultLoop: true,
    hasAllOrientations: true,
    priority: 1
  },
  {
    name: 'run',
    displayName: 'Run',
    category: 'movement',
    defaultDuration: 400,
    defaultLoop: true,
    hasAllOrientations: true,
    priority: 2
  },
  {
    name: 'jump',
    displayName: 'Jump',
    category: 'action',
    defaultDuration: 600,
    defaultLoop: false,
    hasAllOrientations: true,
    priority: 3
  },
  {
    name: 'attack',
    displayName: 'Attack',
    category: 'action',
    defaultDuration: 400,
    defaultLoop: false,
    hasAllOrientations: true,
    priority: 4
  },
  {
    name: 'hurt',
    displayName: 'Hurt',
    category: 'reaction',
    defaultDuration: 300,
    defaultLoop: false,
    hasAllOrientations: false,
    priority: 5
  },
  {
    name: 'die',
    displayName: 'Death',
    category: 'action',
    defaultDuration: 1000,
    defaultLoop: false,
    hasAllOrientations: false,
    priority: 10
  }
];

// ============================================================================
// Sprite Types
// ============================================================================

/**
 * Complete animated sprite with multi-direction support
 */
export interface AnimatedSprite {
  /** Unique sprite identifier */
  id: string;
  
  /** Sprite name */
  name: string;
  
  /** Visual style configuration */
  style: SpriteStyleConfig;
  
  /** Image source configuration */
  source: SpriteSource;
  
  /** Sprite dimensions */
  width: number;
  height: number;
  
  /** Animations mapped by key: `${animationName}_${orientation}` */
  animations: Map<string, OrientedAnimation>;
  
  /** List of available animation names */
  animationList: string[];
  
  /** Currently active animation */
  activeAnimation?: string;
  
  /** Current orientation */
  currentOrientation: SpriteOrientation;
  
  /** Layer configuration */
  layers: SpriteLayer[];
  
  /** Metadata */
  metadata: SpriteMetadata;
  
  /** Thumbnail image URL */
  thumbnail?: string;
}

/**
 * Sprite layer for multi-layer sprites
 */
export interface SpriteLayer {
  /** Layer identifier */
  id: string;
  
  /** Layer name */
  name: string;
  
  /** Layer type */
  type: 'body' | 'clothing' | 'accessory' | 'hair' | 'eyes' | 'custom';
  
  /** Layer z-index */
  zIndex: number;
  
  /** Whether layer is visible */
  visible: boolean;
  
  /** Layer opacity */
  opacity: number;
  
  /** Layer blend mode */
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay' | 'custom';
  
  /** Layer-specific tint */
  tint?: string;
  
  /** Optional layer image override */
  sourceOverride?: SpriteSource;
}

/**
 * Sprite metadata
 */
export interface SpriteMetadata {
  /** Author name */
  author?: string;
  
  /** Creation timestamp */
  created: number;
  
  /** Last modified timestamp */
  modified: number;
  
  /** Version string */
  version: string;
  
  /** Tags for search/categorization */
  tags: string[];
  
  /** Description */
  description?: string;
  
  /** License information */
  license?: string;
  
  /** Custom properties */
  customProperties?: Record<string, unknown>;
}

// ============================================================================
// Sprite Sheet Types
// ============================================================================

/**
 * Sprite sheet layout configuration
 */
export interface SpriteSheetConfig {
  /** Number of columns in the sheet */
  columns: number;
  
  /** Number of rows in the sheet */
  rows: number;
  
  /** Frame width */
  frameWidth: number;
  
  /** Frame height */
  frameHeight: number;
  
  /** Horizontal spacing between frames */
  spacingX: number;
  
  /** Vertical spacing between frames */
  spacingY: number;
  
  /** Margin from sheet edges */
  margin: number;
  
  /** Animation definitions from sheet */
  animations: SpriteSheetAnimation[];
}

/**
 * Animation definition within a sprite sheet
 */
export interface SpriteSheetAnimation {
  /** Animation name */
  name: string;
  
  /** Starting row in sheet */
  startRow: number;
  
  /** Starting column in sheet */
  startColumn: number;
  
  /** Number of frames */
  frameCount: number;
  
  /** Orientation for this animation (if directional) */
  orientation?: SpriteOrientation;
  
  /** Frame duration in ms */
  frameDuration: number;
  
  /** Whether animation loops */
  loop: boolean;
}

// ============================================================================
// Sprite State Types
// ============================================================================

/**
 * Runtime state of a sprite instance
 */
export interface SpriteState {
  /** Sprite ID reference */
  spriteId: string;
  
  /** Current animation name */
  animation: string;
  
  /** Current orientation */
  orientation: SpriteOrientation;
  
  /** Current frame index */
  frameIndex: number;
  
  /** Animation time in milliseconds */
  animationTime: number;
  
  /** Whether animation is playing */
  isPlaying: boolean;
  
  /** Animation speed multiplier */
  speed: number;
  
  /** Loop count remaining (-1 = infinite) */
  loopRemaining: number;
  
  /** Last update timestamp */
  lastUpdate: number;
}

/**
 * Sprite transform for rendering
 */
export interface SpriteTransform {
  /** Position in world space */
  position: { x: number; y: number; z?: number };
  
  /** Scale (1 = 100%) */
  scale: { x: number; y: number };
  
  /** Rotation in degrees */
  rotation: number;
  
  /** Horizontal flip */
  flipH: boolean;
  
  /** Vertical flip */
  flipV: boolean;
  
  /** Opacity (0-1) */
  opacity: number;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Point in 2D space
 */
export interface Point2D {
  x: number;
  y: number;
}

/**
 * Point in 3D space
 */
export interface Point3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Rectangle with position
 */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Color with alpha
 */
export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert an angle in degrees to the nearest orientation
 */
export function angleToOrientation(angleDegrees: number): SpriteOrientation {
  // Normalize angle to 0-360
  const normalized = ((angleDegrees % 360) + 360) % 360;
  
  // Add 22.5 to center the ranges on each orientation
  const adjusted = (normalized + 22.5) % 360;
  
  // Calculate orientation index
  const index = Math.floor(adjusted / 45) % 8;
  
  // Map to orientation (starting from East, counter-clockwise)
  const orientationOrder: SpriteOrientation[] = ['e', 'ne', 'n', 'nw', 'w', 'sw', 's', 'se'];
  return orientationOrder[index];
}

/**
 * Convert movement direction to orientation
 * @param dx Movement in X
 * @param dy Movement in Y (positive = down in screen coordinates)
 */
export function movementToOrientation(dx: number, dy: number): SpriteOrientation {
  if (dx === 0 && dy === 0) return 's'; // Default to south if no movement
  
  const angle = Math.atan2(-dy, dx) * (180 / Math.PI); // Negative dy because screen Y is inverted
  return angleToOrientation(angle);
}

/**
 * Get the opposite orientation
 */
export function getOppositeOrientation(orientation: SpriteOrientation): SpriteOrientation {
  const opposites: Record<SpriteOrientation, SpriteOrientation> = {
    'n': 's',
    'ne': 'sw',
    'e': 'w',
    'se': 'nw',
    's': 'n',
    'sw': 'ne',
    'w': 'e',
    'nw': 'se'
  };
  return opposites[orientation];
}

/**
 * Check if an orientation is facing left (for sprite flipping)
 */
export function isOrientationFacingLeft(orientation: SpriteOrientation): boolean {
  return ['w', 'nw', 'sw'].includes(orientation);
}

/**
 * Get the mirrored orientation (for flipH optimization)
 */
export function getMirroredOrientation(orientation: SpriteOrientation): SpriteOrientation {
  const mirrors: Record<SpriteOrientation, SpriteOrientation> = {
    'n': 'n',
    'ne': 'nw',
    'e': 'w',
    'se': 'sw',
    's': 's',
    'sw': 'se',
    'w': 'e',
    'nw': 'ne'
  };
  return mirrors[orientation];
}

/**
 * Create a unique animation key from name and orientation
 */
export function createAnimationKey(animationName: string, orientation: SpriteOrientation): string {
  return `${animationName}_${orientation}`;
}

/**
 * Parse animation key into name and orientation
 */
export function parseAnimationKey(key: string): { name: string; orientation: SpriteOrientation } | null {
  const parts = key.split('_');
  if (parts.length !== 2) return null;
  
  const orientation = parts[1] as SpriteOrientation;
  if (!SPRITE_ORIENTATIONS.includes(orientation)) return null;
  
  return {
    name: parts[0],
    orientation
  };
}

/**
 * Create an empty sprite with default values
 */
export function createEmptySprite(id: string, name: string): AnimatedSprite {
  return {
    id,
    name,
    style: { mainStyle: 'anime_japanese' },
    source: { type: 'file' },
    width: 64,
    height: 64,
    animations: new Map(),
    animationList: [],
    currentOrientation: 's',
    layers: [],
    metadata: {
      created: Date.now(),
      modified: Date.now(),
      version: '1.0.0',
      tags: []
    }
  };
}

/**
 * Create a sprite frame with default values
 */
export function createSpriteFrame(
  rect: SpriteRect,
  duration: number = 100,
  anchorPoint: { x: number; y: number } = { x: 0.5, y: 1 }
): SpriteFrame {
  return {
    id: `frame_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    sourceRect: rect,
    duration,
    anchorPoint
  };
}