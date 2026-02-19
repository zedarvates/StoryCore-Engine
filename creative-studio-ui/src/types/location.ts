/**
 * Location Types
 * 
 * Complete type definitions for the Locations feature with cube mapping support.
 * Integrates with World Building locations and provides 3D scene integration.
 * 
 * File: creative-studio-ui/src/types/location.ts
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * Location type enumeration with texture direction
 */
export type LocationType = 'exterior' | 'interior';

/**
 * Texture direction for cube rendering
 * Determines whether textures face inward (interior) or outward (exterior)
 */
export type TextureDirection = 'inward' | 'outward';

/**
 * Cube face enumeration
 */
export type CubeFace = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';

/**
 * Shot type for skybox generation
 */
export type ShotType = 'plan_sequence' | 'choc' | 'standard';

/**
 * Skybox type for exterior locations
 */
export type SkyboxType =
  | 'clear_day'
  | 'clear_night'
  | 'overcast'
  | 'sunset'
  | 'sunrise'
  | 'storm'
  | 'foggy'
  | 'custom';

/**
 * Weather condition for skybox
 */
export type WeatherCondition =
  | 'clear'
  | 'cloudy'
  | 'overcast'
  | 'rain'
  | 'storm'
  | 'fog'
  | 'snow';

/**
 * Cube face enumeration as array for iteration
 */
export const CUBE_FACES: CubeFace[] = ['front', 'back', 'left', 'right', 'top', 'bottom'];

// ============================================================================
// Cube Texture Types
// ============================================================================

/**
 * Individual cube face texture data
 */
export interface CubeFaceTexture {
  /** Unique identifier for this face */
  id: string;

  /** Which face this texture applies to */
  face: CubeFace;

  /** Path to the generated image file */
  image_path: string;

  /** Generation parameters used */
  generation_params: ImageGenerationParams;

  /** timestamp of generation in ms */
  generated_at: number;

  /** ComfyUI workflow URL if applicable */
  workflow_url?: string;
}

/**
 * Image generation parameters for cube face creation
 */
export interface ImageGenerationParams {
  /** Positive prompt used */
  prompt: string;

  /** Negative prompt used */
  negative_prompt?: string;

  /** Image dimensions */
  width: number;
  height: number;

  /** Generation steps */
  steps: number;

  /** CFG scale value */
  cfg_scale: number;

  /** Random seed used */
  seed: number;

  /** Model filename */
  model?: string;

  /** Sampler name */
  sampler?: string;

  /** Scheduler name */
  scheduler?: string;
}

/**
 * Cube texture mapping for 6-directional views
 * @see TextureOrientationRules for detailed orientation specifications
 */
export interface CubeTextureMapping {
  /** Front view image (looking toward positive Z in OpenGL convention) */
  front?: CubeFaceTexture;

  /** Back view image (looking toward negative Z) */
  back?: CubeFaceTexture;

  /** Left view image (looking toward negative X) */
  left?: CubeFaceTexture;

  /** Right view image (looking toward positive X) */
  right?: CubeFaceTexture;

  /** Top view image (bird's eye, looking toward positive Y) */
  top?: FaceTexture;

  /** Bottom view image (underground, looking toward negative Y) */
  bottom?: CubeFaceTexture;
}

/**
 * Generic face texture (simplified version)
 */
export interface FaceTexture {
  id: string;
  face: CubeFace;
  image_path: string;
  generated_at: number; // timestamp in ms
}

// ============================================================================
// Skybox Types
// ============================================================================

/**
 * Sky box configuration for exterior locations
 * Enhanced with shot-type-specific skybox options
 */
export interface SkyBoxConfig {
  /** Sky type: procedural, image-based, or none */
  type: 'procedural' | 'image_based' | 'none';

  /** Skybox preset type (for exterior locations) */
  skybox_type?: SkyboxType;

  /** Shot type for skybox generation strategy */
  shot_type?: ShotType;

  /** Sky color gradient (if procedural) */
  colors?: {
    top: string;
    horizon: string;
    bottom: string;
  };

  /** Reference to sky texture image */
  texture_path?: string;

  /** Sun/moon position for lighting (0-24 hours) */
  time_of_day?: number;

  /** Sun/moon position for lighting (3D coordinates) */
  light_position?: { x: number; y: number; z: number };

  /** Brightness multiplier (0.5 to 2.0) */
  intensity?: number;

  /** Weather condition */
  weather?: WeatherCondition;

  /** Custom prompt for AI-generated sky */
  custom_prompt?: string;

  /** Shot-type-specific requirements */
  shot_requirements?: {
    /** Full 360° continuity required */
    full_360_required?: boolean;
    /** Horizon line continuity priority */
    horizon_continuity?: boolean;
    /** Time-of-day preservation important */
    time_preservation?: boolean;
    /** Emphasis on dramatic lighting */
    dramatic_lighting?: boolean;
    /** Stylized or dramatic elements allowed */
    stylized_elements?: boolean;
  };
}

// ============================================================================
// Location Metadata Types
// ============================================================================

/**
 * Basic location metadata
 */
export interface LocationMetadata {
  /** Detailed description of the location */
  description: string;

  /** Atmospheric notes and mood */
  atmosphere: string;

  /** Significance of the location in the story/world */
  significance?: string;

  /** Time period or era */
  time_period?: string;

  /** Genre tags for categorization */
  genre_tags: string[];

  /** Color palette for consistent styling */
  color_palette?: string[];

  /** Key features or landmarks */
  key_features?: string[];

  /** Location address or specific spot */
  address?: string;

  /** Geographic or map coordinates */
  coordinates?: string;

  /** Owner or controlling entity */
  owner?: string;

  /** Primary purpose or function */
  purpose?: string;

  /** Hidden or restricted information */
  secrets?: string;

  /** Story importance level */
  importance?: 'high' | 'medium' | 'low';

  /** Accessibility for characters */
  accessibility?: 'public' | 'private' | 'restricted';

  /** Optional thumbnail path */
  thumbnail_path?: string;

  /** Optional tile image path for grid/tiled display */
  tile_image_path?: string;
}

/**
 * Snapshot of World Building location data for reference/sync
 */
export interface WorldLocationSnapshot {
  /** Original location ID from World Building */
  world_location_id: string;

  /** World ID this location belongs to */
  world_id: string;

  /** Original name from World Building */
  world_name: string;

  /** Original type from World Building */
  world_type: string;

  /** Original description */
  world_description: string;

  /** Original significance */
  significance?: string;

  /** Snapshot timestamp in ms */
  snapshot_at: number;
}

// ============================================================================
// Asset Placement Types
// ============================================================================

/**
 * Asset placed within the location environment
 */
export interface PlacedAsset {
  /** Unique identifier */
  id: string;

  /** Reference to asset in asset library */
  asset_id: string;

  /** 3D position coordinates */
  position: { x: number; y: number; z: number };

  /** Rotation angles in degrees */
  rotation: { x: number; y: number; z: number };

  /** Scale factor */
  scale: number;

  /** Whether asset is visible */
  visible: boolean;
}

// ============================================================================
// 3D Scene Types
// ============================================================================

/**
 * 3D Transform data for location placement
 */
export interface Transform3D {
  /** Position coordinates */
  position: { x: number; y: number; z: number };

  /** Rotation angles in degrees (Euler angles) */
  rotation: { x: number; y: number; z: number };

  /** Scale factors */
  scale: { x: number; y: number; z: number };
}

/**
 * Represents a location instance placed within a specific scene/shot
 * Multiple SceneLocation instances can reference the same base Location
 */
export interface SceneLocation {
  /** Unique instance ID */
  instance_id: string;

  /** Reference to base Location */
  location_id: string;

  /** Which shot/sequence this instance belongs to */
  parent_shot_id?: string;

  /** Transform in world space */
  transform: Transform3D;

  /** Override textures for this instance (optional) */
  texture_overrides?: Partial<CubeTextureMapping>;

  /** Instance-specific metadata */
  instance_metadata?: {
    name: string;
    notes?: string;
  };
}

// ============================================================================
// Core Location Type
// ============================================================================

/**
 * Represents a complete location entity with cube mapping support
 * Integrates with World Building locations (stored in worlds/world_*.json)
 */
export interface Location {
  /** Unique identifier for the enhanced location */
  location_id: string;

  /** Reference to World Building location (optional link) */
  world_location_id?: string;

  /** Reference to the world this location belongs to */
  world_id?: string;

  /** Display name of the location (synced from World Building if linked) */
  name: string;

  /** Creation method: wizard-guided, auto-generated, or manual */
  creation_method: 'wizard' | 'auto_generated' | 'manual';

  /** timestamp of creation in ms */
  creation_timestamp: number;

  /** timestamp of last modification in ms */
  last_modified?: number;

  /** Schema version for data migrations */
  version: string;

  /** Location type: exterior (with sky) or interior (enclosed) */
  location_type: LocationType;

  /** Texture direction for rendering */
  texture_direction: TextureDirection;

  /** Basic metadata and description (from World Building or custom) */
  metadata: LocationMetadata;

  /** Cube mapping data for 6-directional views */
  cube_textures: CubeTextureMapping;

  /** Associated prompts for location generation */
  prompts?: string[];

  /** Skybox configuration (for exterior locations) */
  skybox_config?: SkyBoxConfig;

  /** Environmental assets placed in the scene */
  placed_assets: PlacedAsset[];

  /** 3D scene transform when placed */
  scene_transform?: Transform3D;

  /** Whether this location was created from World Building wizard */
  is_world_derived: boolean;

  /** Original World Building data snapshot (if linked) */
  world_snapshot?: WorldLocationSnapshot;
}

// ============================================================================
// Helper Types for Wizards and Selection
// ============================================================================

/**
 * Location selection data for wizards
 */
export interface LocationSelectionData {
  selected_locations: LocationReference[];
  new_locations_to_create: LocationCreationRequest[];
}

/**
 * Simplified location reference for embedding in other entities
 */
export interface LocationReference {
  id: string;
  name: string;
  thumbnail_path?: string;
  /** Whether this location is interior (indoor) or exterior (outdoor) */
  location_type?: LocationType;
  /** Location category type */
  type?: 'city' | 'wilderness' | 'dungeon' | 'other';
  description?: string;
  coordinates?: { x: number; y: number };
}

/**
 * Request to create a new location
 */
export interface LocationCreationRequest {
  name: string;
  type: LocationType;
  description: string;
  atmosphere?: string;
  genre_tags?: string[];
  world_id?: string;
  world_location_id?: string;
}

/**
 * Cube preview data for UI display
 */
export interface CubePreviewData {
  location_id: string;
  faces: {
    [key in CubeFace]?: string;
  };
  is_loading: boolean;
  generation_progress: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Helper function to create empty location
 */
export function createEmptyLocation(): Partial<Location> {
  return {
    location_id: '',
    name: '',
    creation_method: 'manual',
    creation_timestamp: Date.now(),
    last_modified: Date.now(),
    version: '1.0',
    location_type: 'exterior',
    texture_direction: 'outward',
    metadata: {
      description: '',
      atmosphere: '',
      genre_tags: [],
      thumbnail_path: undefined,
      tile_image_path: undefined,
    },
    cube_textures: {},
    prompts: [],
    placed_assets: [],
    is_world_derived: false,
  };
}

/**
 * Check if location has minimum required data
 */
export function isLocationComplete(location: Partial<Location>): boolean {
  return !!(
    location.name &&
    location.metadata?.description &&
    location.cube_textures?.front?.image_path
  );
}

/**
 * Get default skybox configuration for a location type
 */
export function getDefaultSkyboxConfig(locationType: LocationType): SkyBoxConfig | undefined {
  if (locationType === 'interior') {
    return undefined;
  }

  return {
    type: 'procedural',
    skybox_type: 'clear_day',
    shot_type: 'standard',
    time_of_day: 12,
    intensity: 1.0,
    weather: 'clear',
    colors: {
      top: '#87CEEB',
      horizon: '#E0F6FF',
      bottom: '#FFFFFF',
    },
  };
}
