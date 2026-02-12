/**
 * Sky System TypeScript Types
 * 
 * Type definitions for the 3D Sky Keyframe System
 */

// ============================================================================
// World Types
// ============================================================================

export type WorldType = 
  | 'earth'
  | 'mars'
  | 'titan'
  | 'venus'
  | 'exoplanet_earth_like'
  | 'exoplanet_hot_jupiter'
  | 'custom';

// ============================================================================
// Atmospheric Conditions
// ============================================================================

export interface GasComposition {
  N2: number;
  O2: number;
  CO2: number;
  CH4: number;
  Ar: number;
  H2: number;
  He: number;
  NH3: number;
  H2O: number;
  SO2: number;
  dust: number;
  custom?: Record<string, number>;
}

export interface AtmosphericConditions {
  pressure_pa: number;
  temperature_k: number;
  humidity: number;
  composition: GasComposition;
  rayleigh_scale_height: number;
  mie_scale_height: number;
  mie_asymmetry: number;
  aerosol_density: number;
  dust_storm_intensity: number;
  sky_tint: [number, number, number];
  haze_density: number;
  fog_density: number;
}

// ============================================================================
// Celestial Bodies
// ============================================================================

export interface CelestialPosition {
  azimuth: number;      // 0-360°, 0=North
  elevation: number;    // -90 to 90°, 0=horizon
  distance_au: number;  // Astronomical units
}

export interface SunParameters {
  position: CelestialPosition;
  color_temperature: number;  // Kelvin
  intensity: number;
  angular_diameter: number;     // Degrees
}

// ============================================================================
// Lighting
// ============================================================================

export interface LightingConditions {
  sun_position: [number, number];  // [azimuth, elevation]
  sun_color: [number, number, number];
  sun_intensity: number;
  sky_color: [number, number, number];
  horizon_color: [number, number, number];
  ambient_color: [number, number, number];
  ambient_intensity: number;
  color_temperature: number;
  visibility_km: number;
  atmospheric_perspective: number;
}

// ============================================================================
// Keyframe Configuration
// ============================================================================

export type RenderQuality = 'draft' | 'standard' | 'high' | 'ultra';

export interface KeyframeConfig {
  width: number;
  height: number;
  quality: RenderQuality;
  output_dir: string;
  project_name: string;
  shot_id: string;
  include_depth_map: boolean;
  include_sky_mask: boolean;
  include_ground_mask: boolean;
  include_metadata: boolean;
  horizon_position: number;  // 0-1
  ground_type: 'auto' | 'flat' | 'terrain' | 'custom';
}

// ============================================================================
// Keyframe Result
// ============================================================================

export interface KeyframeResult {
  success: boolean;
  image_path?: string;
  depth_map_path?: string;
  sky_mask_path?: string;
  ground_mask_path?: string;
  metadata_path?: string;
  metadata: KeyframeMetadata;
  error_message?: string;
}

export interface KeyframeMetadata {
  world_type: WorldType;
  time_of_day: number;
  latitude: number;
  conditions: AtmosphericConditions;
  lighting: LightingConditions;
  camera: {
    position: [number, number, number];
    look_at: [number, number, number];
    fov: number;
  };
  render_settings: {
    width: number;
    height: number;
    quality: RenderQuality;
    horizon_position: number;
  };
}

// ============================================================================
// ComfyUI Integration
// ============================================================================

export interface ComfyUIPayload {
  reference_image?: string;
  depth_map?: string;
  sky_mask?: string;
  ground_mask?: string;
  atmospheric_context: LightingConditions;
  world_type: WorldType;
  time_of_day: number;
  prompt_enhancement: string;
  prompt?: string;
  prompt_with_atmosphere?: string;
}

// ============================================================================
// World Presets
// ============================================================================

export interface WorldPreset {
  name: string;
  description: string;
  world_type: WorldType;
  conditions: AtmosphericConditions;
  time_of_day: number;
  latitude: number;
  tags: string[];
}

export interface PresetInfo {
  name: string;
  description: string;
  world_type: string;
  time_of_day: number;
  latitude: number;
  tags: string[];
  conditions: {
    pressure_hpa: number;
    temperature_c: number;
    humidity: number;
    haze_density: number;
    fog_density: number;
    dust_storm_intensity: number;
  };
}

// ============================================================================
// Camera
// ============================================================================

export type CameraProjection = 'perspective' | 'orthographic' | 'fisheye' | 'panoramic';

export interface CameraConfig {
  position: [number, number, number];
  look_at: [number, number, number];
  up_vector: [number, number, number];
  fov: number;
  near_clip: number;
  far_clip: number;
  projection: CameraProjection;
  aspect_ratio: number;
}

// ============================================================================
// UI State
// ============================================================================

export interface SkyGeneratorState {
  selectedPreset: string | null;
  worldType: WorldType;
  timeOfDay: number;
  latitude: number;
  quality: RenderQuality;
  isGenerating: boolean;
  lastResult: KeyframeResult | null;
  error: string | null;
}

export interface SkyGeneratorConfig {
  presets: WorldPreset[];
  selectedPresetId: string | null;
  customConditions: Partial<AtmosphericConditions>;
  cameraPosition: [number, number, number];
  cameraLookAt: [number, number, number];
  renderQuality: RenderQuality;
  outputSettings: {
    includeDepthMap: boolean;
    includeSkyMask: boolean;
    includeMetadata: boolean;
  };
}

// ============================================================================
// API Requests/Responses
// ============================================================================

export interface GenerateKeyframeRequest {
  preset?: string;
  world_type?: WorldType;
  time_of_day: number;
  latitude?: number;
  quality: RenderQuality;
  camera_position?: [number, number, number];
  camera_look_at?: [number, number, number];
  output_dir?: string;
  project_name?: string;
  shot_id?: string;
}


export interface GenerateKeyframeResponse {
  success: boolean;
  result?: KeyframeResult;
  error?: string;
}

export interface ListPresetsResponse {
  presets: string[];
  presets_by_type: Record<WorldType, string[]>;
}

export interface GetPresetResponse {
  preset: PresetInfo;
}

// ============================================================================
// Events
// ============================================================================

export type SkyGeneratorEvent =
  | { type: 'GENERATION_STARTED' }
  | { type: 'GENERATION_PROGRESS'; progress: number; stage: string }
  | { type: 'GENERATION_COMPLETED'; result: KeyframeResult }
  | { type: 'GENERATION_FAILED'; error: string }
  | { type: 'PRESET_SELECTED'; preset: WorldPreset }
  | { type: 'TIME_CHANGED'; time: number }
  | { type: 'WORLD_TYPE_CHANGED'; worldType: WorldType };

// ============================================================================
// Constants
// ============================================================================

export const WORLD_TYPE_LABELS: Record<WorldType, string> = {
  earth: 'Earth',
  mars: 'Mars',
  titan: 'Titan',
  venus: 'Venus',
  exoplanet_earth_like: 'Earth-like Exoplanet',
  exoplanet_hot_jupiter: 'Hot Jupiter',
  custom: 'Custom World'
};

export const RENDER_QUALITY_LABELS: Record<RenderQuality, string> = {
  draft: 'Draft (720p)',
  standard: 'Standard (1080p)',
  high: 'High (4K)',
  ultra: 'Ultra (8K)'
};

export const DEFAULT_KEYFRAME_CONFIG: KeyframeConfig = {
  width: 1920,
  height: 1080,
  quality: 'standard',
  output_dir: 'keyframes',
  project_name: 'scene',
  shot_id: '001',
  include_depth_map: true,
  include_sky_mask: true,
  include_ground_mask: true,
  include_metadata: true,
  horizon_position: 0.5,
  ground_type: 'auto'
};

export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  position: [0, 1.6, 0],
  look_at: [0, 1.6, 10],
  up_vector: [0, 1, 0],
  fov: 60,
  near_clip: 0.1,
  far_clip: 1000,
  projection: 'perspective',
  aspect_ratio: 16 / 9
};
