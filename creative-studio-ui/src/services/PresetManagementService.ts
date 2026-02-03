/**
 * Preset Management Service
 * 
 * Handles saving, loading, and managing generation parameter presets.
 * Supports presets for all generation types: prompt, image, video, and audio.
 * 
 * Requirements: 10.5
 */

import type {
  PromptCategories,
  ImageGenerationParams,
  VideoGenerationParams,
  AudioGenerationParams,
} from '../types/generation';

/**
 * Preset types
 */
export type PresetType = 'prompt' | 'image' | 'video' | 'audio';

/**
 * Base preset interface
 */
export interface BasePreset {
  id: string;
  name: string;
  type: PresetType;
  createdAt: number;
  updatedAt: number;
}

/**
 * Prompt preset
 */
export interface PromptPreset extends BasePreset {
  type: 'prompt';
  categories: PromptCategories;
}

/**
 * Image preset
 */
export interface ImagePreset extends BasePreset {
  type: 'image';
  params: Omit<ImageGenerationParams, 'prompt'>;
}

/**
 * Video preset
 */
export interface VideoPreset extends BasePreset {
  type: 'video';
  params: Omit<VideoGenerationParams, 'inputImagePath' | 'prompt'>;
}

/**
 * Audio preset
 */
export interface AudioPreset extends BasePreset {
  type: 'audio';
  params: Omit<AudioGenerationParams, 'text'>;
}

/**
 * Union type for all presets
 */
export type Preset = PromptPreset | ImagePreset | VideoPreset | AudioPreset;

/**
 * Storage key prefix
 */
const STORAGE_KEY_PREFIX = 'storycore_generation_presets';

/**
 * Get storage key for preset type
 */
function getStorageKey(type: PresetType): string {
  return `${STORAGE_KEY_PREFIX}_${type}`;
}

/**
 * Generate unique preset ID
 */
function generatePresetId(): string {
  return `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Preset Management Service
 * 
 * Provides methods for managing generation parameter presets.
 */
export class PresetManagementService {
  /**
   * Save a preset
   */
  static savePreset<T extends Preset>(preset: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): T {
    const now = Date.now();
    const fullPreset: T = {
      ...preset,
      id: generatePresetId(),
      createdAt: now,
      updatedAt: now,
    } as T;
    
    // Get existing presets
    const presets = this.getPresets(preset.type);
    
    // Add new preset
    presets.push(fullPreset);
    
    // Save to storage
    this.savePresetsToStorage(preset.type, presets);
    
    return fullPreset;
  }
  
  /**
   * Update an existing preset
   */
  static updatePreset<T extends Preset>(id: string, updates: Partial<Omit<T, 'id' | 'type' | 'createdAt' | 'updatedAt'>>): T | null {
    const preset = this.getPresetById(id);
    if (!preset) {
      return null;
    }
    
    const updatedPreset: T = {
      ...preset,
      ...updates,
      updatedAt: Date.now(),
    } as T;
    
    // Get all presets of this type
    const presets = this.getPresets(preset.type);
    
    // Replace the preset
    const index = presets.findIndex((p) => p.id === id);
    if (index !== -1) {
      presets[index] = updatedPreset;
      this.savePresetsToStorage(preset.type, presets);
    }
    
    return updatedPreset;
  }
  
  /**
   * Delete a preset
   */
  static deletePreset(id: string): boolean {
    const preset = this.getPresetById(id);
    if (!preset) {
      return false;
    }
    
    // Get all presets of this type
    const presets = this.getPresets(preset.type);
    
    // Filter out the preset
    const filtered = presets.filter((p) => p.id !== id);
    
    // Save to storage
    this.savePresetsToStorage(preset.type, filtered);
    
    return true;
  }
  
  /**
   * Rename a preset
   */
  static renamePreset(id: string, newName: string): Preset | null {
    return this.updatePreset(id, { name: newName });
  }
  
  /**
   * Get all presets of a specific type
   */
  static getPresets<T extends Preset>(type: PresetType): T[] {
    const key = getStorageKey(type);
    const stored = localStorage.getItem(key);
    
    if (!stored) {
      return [];
    }
    
    try {
      const presets = JSON.parse(stored);
      return Array.isArray(presets) ? presets : [];
    } catch (error) {
      console.error(`Failed to parse presets for type ${type}:`, error);
      return [];
    }
  }
  
  /**
   * Get a preset by ID
   */
  static getPresetById(id: string): Preset | null {
    // Search through all preset types
    const types: PresetType[] = ['prompt', 'image', 'video', 'audio'];
    
    for (const type of types) {
      const presets = this.getPresets(type);
      const preset = presets.find((p) => p.id === id);
      if (preset) {
        return preset;
      }
    }
    
    return null;
  }
  
  /**
   * Get all presets (across all types)
   */
  static getAllPresets(): Preset[] {
    const types: PresetType[] = ['prompt', 'image', 'video', 'audio'];
    const allPresets: Preset[] = [];
    
    for (const type of types) {
      allPresets.push(...this.getPresets(type));
    }
    
    return allPresets;
  }
  
  /**
   * Clear all presets of a specific type
   */
  static clearPresets(type: PresetType): void {
    const key = getStorageKey(type);
    localStorage.removeItem(key);
  }
  
  /**
   * Clear all presets (across all types)
   */
  static clearAllPresets(): void {
    const types: PresetType[] = ['prompt', 'image', 'video', 'audio'];
    for (const type of types) {
      this.clearPresets(type);
    }
  }
  
  /**
   * Export presets to JSON
   */
  static exportPresets(type?: PresetType): string {
    const presets = type ? this.getPresets(type) : this.getAllPresets();
    return JSON.stringify(presets, null, 2);
  }
  
  /**
   * Import presets from JSON
   */
  static importPresets(json: string): { success: number; failed: number } {
    let success = 0;
    let failed = 0;
    
    try {
      const presets = JSON.parse(json);
      
      if (!Array.isArray(presets)) {
        throw new Error('Invalid preset format');
      }
      
      for (const preset of presets) {
        try {
          // Validate preset structure
          if (!preset.type || !preset.name) {
            failed++;
            continue;
          }
          
          // Save preset (will generate new ID)
          this.savePreset(preset);
          success++;
        } catch (error) {
          console.error('Failed to import preset:', error);
          failed++;
        }
      }
    } catch (error) {
      console.error('Failed to parse preset JSON:', error);
      throw new Error('Invalid JSON format');
    }
    
    return { success, failed };
  }
  
  /**
   * Save presets to storage
   */
  private static savePresetsToStorage(type: PresetType, presets: Preset[]): void {
    const key = getStorageKey(type);
    try {
      localStorage.setItem(key, JSON.stringify(presets));
    } catch (error) {
      console.error(`Failed to save presets for type ${type}:`, error);
      throw new Error('Failed to save presets to storage');
    }
  }
}

/**
 * Singleton instance
 */
export const presetManagementService = PresetManagementService;
