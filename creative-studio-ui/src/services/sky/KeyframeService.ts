/**
 * Keyframe Service
 * 
 * Frontend service for generating atmospheric sky keyframes
 * Communicates with Python backend for rendering
 */

import {
  WorldType,
  RenderQuality,
  KeyframeConfig,
  KeyframeResult,
  KeyframeMetadata,
  ComfyUIPayload,
  WorldPreset,
  PresetInfo,
  CameraConfig,
  GenerateKeyframeRequest,
  GenerateKeyframeResponse,
  ListPresetsResponse,
  GetPresetResponse,
  SkyGeneratorEvent,
  DEFAULT_KEYFRAME_CONFIG,
  DEFAULT_CAMERA_CONFIG,
  LightingConditions
} from './SkyTypes';

// ============================================================================
// Service Configuration
// ============================================================================

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const SKY_API_ENDPOINT = `${API_BASE_URL}/api/sky`;

// ============================================================================
// Event Emitter
// ============================================================================

type EventCallback = (event: SkyGeneratorEvent) => void;

class EventEmitter {
  private listeners: Set<EventCallback> = new Set();

  on(callback: EventCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  emit(event: SkyGeneratorEvent): void {
    this.listeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
  }
}

// ============================================================================
// Keyframe Service
// ============================================================================

class KeyframeService {
  private eventEmitter = new EventEmitter();
  private abortController: AbortController | null = null;

  // ==========================================================================
  // Event Handling
  // ==========================================================================

  onEvent(callback: EventCallback): () => void {
    return this.eventEmitter.on(callback);
  }

  private emit(event: SkyGeneratorEvent): void {
    this.eventEmitter.emit(event);
  }

  // ==========================================================================
  // Preset Management
  // ==========================================================================

  /**
   * List all available world presets
   */
  async listPresets(worldType?: WorldType): Promise<string[]> {
    try {
      const url = worldType 
        ? `${SKY_API_ENDPOINT}/presets?world_type=${worldType}`
        : `${SKY_API_ENDPOINT}/presets`;

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch presets: ${response.statusText}`);
      }

      const data: ListPresetsResponse = await response.json();
      return data.presets;
    } catch (error) {
      console.error('Error listing presets:', error);
      // Return default presets if API fails
      return this.getDefaultPresets();
    }
  }

  /**
   * Get detailed information about a preset
   */
  async getPreset(name: string): Promise<PresetInfo | null> {
    try {
      const response = await fetch(`${SKY_API_ENDPOINT}/presets/${name}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to fetch preset: ${response.statusText}`);
      }

      const data: GetPresetResponse = await response.json();
      return data.preset;
    } catch (error) {
      console.error(`Error fetching preset ${name}:`, error);
      return this.getDefaultPresetInfo(name);
    }
  }

  /**
   * Get presets grouped by world type
   */
  async listPresetsByType(): Promise<Record<WorldType, string[]>> {
    try {
      const response = await fetch(`${SKY_API_ENDPOINT}/presets/by-type`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch presets: ${response.statusText}`);
      }

      const data: ListPresetsResponse = await response.json();
      return data.presets_by_type;
    } catch (error) {
      console.error('Error listing presets by type:', error);
      return this.getDefaultPresetsByType();
    }
  }

  // ==========================================================================
  // Keyframe Generation
  // ==========================================================================

  /**
   * Generate a keyframe with atmospheric sky
   */
  async generateKeyframe(request: GenerateKeyframeRequest): Promise<GenerateKeyframeResponse> {
    // Cancel any ongoing generation
    this.cancelGeneration();

    this.abortController = new AbortController();
    this.emit({ type: 'GENERATION_STARTED' });

    try {
      const response = await fetch(`${SKY_API_ENDPOINT}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Generation failed: ${errorText}`);
      }

      const data: GenerateKeyframeResponse = await response.json();

      if (data.success && data.result) {
        this.emit({ type: 'GENERATION_COMPLETED', result: data.result });
      } else {
        this.emit({ 
          type: 'GENERATION_FAILED', 
          error: data.error || 'Unknown error' 
        });
      }

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.emit({ type: 'GENERATION_FAILED', error: errorMessage });
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      this.abortController = null;
    }
  }

  /**
   * Cancel ongoing generation
   */
  cancelGeneration(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Quick generate with preset
   */
  async quickGenerate(
    presetName: string,
    timeOfDay: number = 12.0,
    quality: RenderQuality = 'standard'
  ): Promise<GenerateKeyframeResponse> {
    return this.generateKeyframe({
      preset: presetName,
      time_of_day: timeOfDay,
      quality,
    });
  }

  // ==========================================================================
  // ComfyUI Integration
  // ==========================================================================

  /**
   * Generate keyframe and prepare ComfyUI payload
   */
  async generateForComfyUI(
    prompt: string,
    request: GenerateKeyframeRequest
  ): Promise<ComfyUIPayload | null> {
    const response = await this.generateKeyframe(request);

    if (!response.success || !response.result) {
      return null;
    }

    return this.buildComfyUIPayload(response.result, prompt);
  }

  /**
   * Build ComfyUI payload from keyframe result
   */
  buildComfyUIPayload(result: KeyframeResult, prompt: string): ComfyUIPayload {
    const enhancement = this.generatePromptEnhancement(result.metadata);
    
    return {
      reference_image: result.image_path,
      depth_map: result.depth_map_path,
      sky_mask: result.sky_mask_path,
      ground_mask: result.ground_mask_path,
      atmospheric_context: result.metadata.lighting,
      world_type: result.metadata.world_type,
      time_of_day: result.metadata.time_of_day,
      prompt_enhancement: enhancement,
      prompt,
      prompt_with_atmosphere: `${prompt}, ${enhancement}`
    };
  }

  /**
   * Generate prompt enhancement from metadata
   */
  private generatePromptEnhancement(metadata: KeyframeMetadata): string {
    const enhancements: string[] = [];

    // World type description
    const worldDescriptions: Record<WorldType, string> = {
      earth: 'Earth-like planet',
      mars: 'Mars, red planet with ochre sky',
      titan: 'Titan, orange hazy atmosphere',
      venus: 'Venus, thick yellow clouds',
      exoplanet_earth_like: 'alien Earth-like world',
      exoplanet_hot_jupiter: 'hot gas giant world',
      custom: 'alien world'
    };
    enhancements.push(worldDescriptions[metadata.world_type] || 'alien world');

    // Time of day
    const time = metadata.time_of_day;
    if (time >= 5 && time < 8) {
      enhancements.push('sunrise, golden hour, warm light');
    } else if (time >= 8 && time < 17) {
      enhancements.push('daytime, clear sky');
    } else if (time >= 17 && time < 20) {
      enhancements.push('sunset, golden hour, orange sky');
    } else {
      enhancements.push('nighttime, starry sky');
    }

    // Lighting conditions
    const lighting = metadata.lighting;
    const colorTemp = lighting.color_temperature;
    if (colorTemp < 3500) {
      enhancements.push('warm orange lighting');
    } else if (colorTemp > 7000) {
      enhancements.push('cool blue lighting');
    }

    // Atmospheric effects
    const conditions = metadata.conditions;
    if (conditions.dust_storm_intensity > 0.5) {
      enhancements.push('global dust storm, low visibility');
    }
    if (conditions.haze_density > 0.5) {
      enhancements.push('thick atmospheric haze');
    }
    if (conditions.fog_density > 0.3) {
      enhancements.push('ground fog');
    }

    return enhancements.join(', ');
  }

  // ==========================================================================
  // Preview Generation
  // ==========================================================================

  /**
   * Generate low-res preview for UI
   */
  async generatePreview(
    presetName: string,
    timeOfDay: number
  ): Promise<string | null> {
    try {
      const response = await this.generateKeyframe({
        preset: presetName,
        time_of_day: timeOfDay,
        quality: 'draft',
        project_name: 'preview',
        shot_id: 'temp'
      });

      if (response.success && response.result?.image_path) {
        // Convert to data URL for display
        return this.loadImageAsDataURL(response.result.image_path);
      }

      return null;
    } catch (error) {
      console.error('Error generating preview:', error);
      return null;
    }
  }

  /**
   * Load image as data URL
   */
  private async loadImageAsDataURL(path: string): Promise<string> {
    // In a real implementation, this would fetch the image
    // and convert it to a data URL for display
    const response = await fetch(`${API_BASE_URL}/files/${path}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  // ==========================================================================
  // Default Data (Fallbacks)
  // ==========================================================================

  private getDefaultPresets(): string[] {
    return [
      'earth_clear_day',
      'earth_sunset',
      'earth_storm',
      'mars_clear',
      'mars_dust_storm',
      'titan_orange_haze',
      'fantasy_volcanic'
    ];
  }

  private getDefaultPresetsByType(): Record<WorldType, string[]> {
    return {
      earth: ['earth_clear_day', 'earth_sunset', 'earth_storm'],
      mars: ['mars_clear', 'mars_dust_storm'],
      titan: ['titan_orange_haze'],
      venus: ['venus_surface'],
      exoplanet_earth_like: ['exo_earth_like'],
      exoplanet_hot_jupiter: ['exo_hot_jupiter'],
      custom: ['fantasy_volcanic', 'fantasy_frozen']
    };
  }

  private getDefaultPresetInfo(name: string): PresetInfo | null {
    const defaults: Record<string, PresetInfo> = {
      earth_clear_day: {
        name: 'earth_clear_day',
        description: 'Clear day on Earth with blue sky',
        world_type: 'earth',
        time_of_day: 12.0,
        latitude: 45.0,
        tags: ['earth', 'day', 'clear', 'blue_sky'],
        conditions: {
          pressure_hpa: 1013.25,
          temperature_c: 15.0,
          humidity: 0.4,
          haze_density: 0.1,
          fog_density: 0.0,
          dust_storm_intensity: 0.0
        }
      },
      mars_dust_storm: {
        name: 'mars_dust_storm',
        description: 'Global dust storm on Mars',
        world_type: 'mars',
        time_of_day: 14.0,
        latitude: 20.0,
        tags: ['mars', 'dust_storm', 'red', 'low_visibility'],
        conditions: {
          pressure_hpa: 6.1,
          temperature_c: -63.0,
          humidity: 0.0,
          haze_density: 0.8,
          fog_density: 0.5,
          dust_storm_intensity: 0.9
        }
      }
    };

    return defaults[name] || null;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const keyframeService = new KeyframeService();

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format time of day for display
 */
export function formatTimeOfDay(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.floor((hour - h) * 60);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${m.toString().padStart(2, '0')} ${ampm}`;
}

/**
 * Get quality resolution
 */
export function getQualityResolution(quality: RenderQuality): { width: number; height: number } {
  switch (quality) {
    case 'draft':
      return { width: 1280, height: 720 };
    case 'standard':
      return { width: 1920, height: 1080 };
    case 'high':
      return { width: 3840, height: 2160 };
    case 'ultra':
      return { width: 7680, height: 4320 };
    default:
      return { width: 1920, height: 1080 };
  }
}

/**
 * Estimate generation time based on quality
 */
export function estimateGenerationTime(quality: RenderQuality): number {
  switch (quality) {
    case 'draft':
      return 5;  // 5 seconds
    case 'standard':
      return 15; // 15 seconds
    case 'high':
      return 60; // 1 minute
    case 'ultra':
      return 300; // 5 minutes
    default:
      return 15;
  }
}

/**
 * Validate keyframe configuration
 */
export function validateConfig(config: Partial<KeyframeConfig>): string[] {
  const errors: string[] = [];

  if (config.width && config.width < 640) {
    errors.push('Width must be at least 640 pixels');
  }
  if (config.height && config.height < 480) {
    errors.push('Height must be at least 480 pixels');
  }
  if (config.horizon_position !== undefined && 
      (config.horizon_position < 0 || config.horizon_position > 1)) {
    errors.push('Horizon position must be between 0 and 1');
  }

  return errors;
}

// Export types
export * from './SkyTypes';
