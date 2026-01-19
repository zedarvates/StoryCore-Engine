/**
 * Preset Store - Manages grid layout presets
 * 
 * Handles preset creation, storage, retrieval, and application.
 * Supports both default presets and custom user-created presets.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Preset, Transform, CropRegion, DEFAULT_TRANSFORM, DEFAULT_CROP_REGION } from '../../types/gridEditor';

// ============================================================================
// Default Presets
// ============================================================================

/**
 * Cinematic preset - 16:9 aspect ratio with letterbox crops
 */
const CINEMATIC_PRESET: Preset = {
  id: 'preset-cinematic',
  name: 'Cinematic',
  description: 'Widescreen 16:9 format with letterbox crops for cinematic storytelling',
  thumbnail: undefined,
  panelTransforms: Array(9).fill(null).map(() => ({
    ...DEFAULT_TRANSFORM,
    scale: { x: 1.2, y: 1.2 }, // Slight zoom for dramatic effect
  })),
  panelCrops: Array(9).fill(null).map(() => ({
    x: 0,
    y: 0.125, // Letterbox top
    width: 1.0,
    height: 0.75, // Letterbox height (16:9 aspect)
  })),
};

/**
 * Comic preset - Dynamic panel arrangements with varied crops
 */
const COMIC_PRESET: Preset = {
  id: 'preset-comic',
  name: 'Comic Book',
  description: 'Dynamic panel layout inspired by comic book storytelling',
  thumbnail: undefined,
  panelTransforms: [
    // Top row - standard
    { ...DEFAULT_TRANSFORM },
    { ...DEFAULT_TRANSFORM, rotation: -2 },
    { ...DEFAULT_TRANSFORM },
    // Middle row - dynamic
    { ...DEFAULT_TRANSFORM, scale: { x: 1.1, y: 1.1 }, rotation: 3 },
    { ...DEFAULT_TRANSFORM, scale: { x: 1.2, y: 1.2 } }, // Center focus
    { ...DEFAULT_TRANSFORM, scale: { x: 1.1, y: 1.1 }, rotation: -3 },
    // Bottom row - standard
    { ...DEFAULT_TRANSFORM },
    { ...DEFAULT_TRANSFORM, rotation: 2 },
    { ...DEFAULT_TRANSFORM },
  ],
  panelCrops: [
    // Top row
    { x: 0.05, y: 0.05, width: 0.9, height: 0.9 },
    { x: 0.1, y: 0.05, width: 0.85, height: 0.9 },
    { x: 0.05, y: 0.05, width: 0.9, height: 0.9 },
    // Middle row
    { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
    { x: 0.05, y: 0.05, width: 0.9, height: 0.9 }, // Center - minimal crop
    { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
    // Bottom row
    { x: 0.05, y: 0.05, width: 0.9, height: 0.9 },
    { x: 0.1, y: 0.05, width: 0.85, height: 0.9 },
    { x: 0.05, y: 0.05, width: 0.9, height: 0.9 },
  ],
};

/**
 * Portrait preset - Vertical emphasis with portrait-oriented crops
 */
const PORTRAIT_PRESET: Preset = {
  id: 'preset-portrait',
  name: 'Portrait',
  description: 'Vertical composition optimized for portrait photography and character focus',
  thumbnail: undefined,
  panelTransforms: Array(9).fill(null).map(() => ({
    ...DEFAULT_TRANSFORM,
    scale: { x: 1.0, y: 1.15 }, // Vertical stretch
  })),
  panelCrops: Array(9).fill(null).map(() => ({
    x: 0.15, // Crop sides
    y: 0,
    width: 0.7, // Portrait aspect
    height: 1.0,
  })),
};

/**
 * Landscape preset - Horizontal emphasis with wide crops
 */
const LANDSCAPE_PRESET: Preset = {
  id: 'preset-landscape',
  name: 'Landscape',
  description: 'Horizontal composition for sweeping vistas and environmental storytelling',
  thumbnail: undefined,
  panelTransforms: Array(9).fill(null).map(() => ({
    ...DEFAULT_TRANSFORM,
    scale: { x: 1.15, y: 1.0 }, // Horizontal stretch
  })),
  panelCrops: Array(9).fill(null).map(() => ({
    x: 0,
    y: 0.15, // Crop top/bottom
    width: 1.0,
    height: 0.7, // Landscape aspect
  })),
};

/**
 * Default preset - No transformations or crops
 */
const DEFAULT_PRESET: Preset = {
  id: 'preset-default',
  name: 'Default',
  description: 'Standard 3x3 grid with no transformations or crops',
  thumbnail: undefined,
  panelTransforms: Array(9).fill(null).map(() => ({ ...DEFAULT_TRANSFORM })),
  panelCrops: Array(9).fill(null).map(() => null),
};

export const DEFAULT_PRESETS: Preset[] = [
  DEFAULT_PRESET,
  CINEMATIC_PRESET,
  COMIC_PRESET,
  PORTRAIT_PRESET,
  LANDSCAPE_PRESET,
];

// ============================================================================
// Preset Store Interface
// ============================================================================

interface PresetStore {
  // State
  presets: Preset[];
  customPresets: Preset[];
  selectedPresetId: string | null;
  
  // Actions
  loadDefaultPresets: () => void;
  addCustomPreset: (preset: Omit<Preset, 'id'>) => string;
  deleteCustomPreset: (presetId: string) => boolean;
  getPresetById: (presetId: string) => Preset | undefined;
  getAllPresets: () => Preset[];
  selectPreset: (presetId: string | null) => void;
  updatePresetThumbnail: (presetId: string, thumbnail: string) => void;
}

// ============================================================================
// Preset Store Implementation
// ============================================================================

export const usePresetStore = create<PresetStore>()(
  persist(
    (set, get) => ({
      // Initial state
      presets: DEFAULT_PRESETS,
      customPresets: [],
      selectedPresetId: null,

      // Load default presets (useful for reset)
      loadDefaultPresets: () => {
        set({ presets: DEFAULT_PRESETS });
      },

      // Add a custom preset
      addCustomPreset: (preset) => {
        const newPreset: Preset = {
          ...preset,
          id: `preset-custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        };
        
        set((state) => ({
          customPresets: [...state.customPresets, newPreset],
        }));
        
        return newPreset.id;
      },

      // Delete a custom preset
      deleteCustomPreset: (presetId) => {
        const state = get();
        
        // Prevent deletion of default presets
        if (state.presets.some(p => p.id === presetId)) {
          console.warn('Cannot delete default preset:', presetId);
          return false;
        }
        
        set((state) => ({
          customPresets: state.customPresets.filter(p => p.id !== presetId),
          selectedPresetId: state.selectedPresetId === presetId ? null : state.selectedPresetId,
        }));
        
        return true;
      },

      // Get preset by ID
      getPresetById: (presetId) => {
        const state = get();
        return [...state.presets, ...state.customPresets].find(p => p.id === presetId);
      },

      // Get all presets (default + custom)
      getAllPresets: () => {
        const state = get();
        return [...state.presets, ...state.customPresets];
      },

      // Select a preset
      selectPreset: (presetId) => {
        set({ selectedPresetId: presetId });
      },

      // Update preset thumbnail
      updatePresetThumbnail: (presetId, thumbnail) => {
        set((state) => {
          // Update in default presets
          const updatedPresets = state.presets.map(p =>
            p.id === presetId ? { ...p, thumbnail } : p
          );
          
          // Update in custom presets
          const updatedCustomPresets = state.customPresets.map(p =>
            p.id === presetId ? { ...p, thumbnail } : p
          );
          
          return {
            presets: updatedPresets,
            customPresets: updatedCustomPresets,
          };
        });
      },
    }),
    {
      name: 'grid-editor-presets', // localStorage key
      partialize: (state) => ({
        // Only persist custom presets, not default ones
        customPresets: state.customPresets,
        selectedPresetId: state.selectedPresetId,
      }),
    }
  )
);

// ============================================================================
// Preset Utilities
// ============================================================================

/**
 * Create a preset from current grid configuration
 */
export function createPresetFromPanels(
  name: string,
  description: string,
  panels: Array<{ transform: Transform; crop: CropRegion | null }>
): Omit<Preset, 'id'> {
  return {
    name,
    description,
    thumbnail: undefined,
    panelTransforms: panels.map(p => p.transform),
    panelCrops: panels.map(p => p.crop),
  };
}

/**
 * Validate preset structure
 */
export function validatePreset(preset: Preset): boolean {
  if (!preset.id || !preset.name) {
    return false;
  }
  
  if (preset.panelTransforms.length !== 9) {
    return false;
  }
  
  if (preset.panelCrops.length !== 9) {
    return false;
  }
  
  return true;
}

/**
 * Generate thumbnail data URL from canvas
 */
export function generatePresetThumbnail(
  canvas: HTMLCanvasElement,
  width: number = 200,
  height: number = 200
): string {
  const thumbnailCanvas = document.createElement('canvas');
  thumbnailCanvas.width = width;
  thumbnailCanvas.height = height;
  
  const ctx = thumbnailCanvas.getContext('2d');
  if (!ctx) {
    return '';
  }
  
  // Draw scaled version of main canvas
  ctx.drawImage(canvas, 0, 0, width, height);
  
  return thumbnailCanvas.toDataURL('image/png');
}
