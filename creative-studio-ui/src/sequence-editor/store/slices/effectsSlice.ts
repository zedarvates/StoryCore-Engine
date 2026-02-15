/**
 * Effects Slice - Redux state management for video effects
 * 
 * Manages applied effects on shots including:
 * - Effect application state
 * - Effect parameters (intensity, enabled)
 * - Effect categories and types
 * 
 * Requirements: Phase 1 - Redux State Enhancement
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// =============================================================================
// Types
// =============================================================================

export type EffectCategory = 'color' | 'blur' | 'stylize' | 'distort' | 'noise';

export interface Effect {
  id: string;
  name: string;
  category: EffectCategory;
  description: string;
  icon: string;
}

export interface AppliedEffect {
  id: string;
  effectId: string;
  intensity: number;
  enabled: boolean;
  parameters?: Record<string, unknown>;
}

export interface ShotEffects {
  shotId: string;
  effects: AppliedEffect[];
}

// Define available effects (mirrors EffectsPanel.tsx)
export const AVAILABLE_EFFECTS: Effect[] = [
  // Color effects
  { id: 'brightness', name: 'Brightness', category: 'color', description: 'Adjust overall brightness', icon: '☀️' },
  { id: 'contrast', name: 'Contrast', category: 'color', description: 'Adjust contrast levels', icon: '◐' },
  { id: 'saturation', name: 'Saturation', category: 'color', description: 'Adjust color intensity', icon: '🎨' },
  { id: 'hue', name: 'Hue Shift', category: 'color', description: 'Rotate color wheel', icon: '🌈' },
  { id: 'temperature', name: 'Temperature', category: 'color', description: 'Warm/cool color shift', icon: '🌡️' },
  { id: 'tint', name: 'Tint', category: 'color', description: 'Green/magenta correction', icon: '🟢' },
  { id: 'levels', name: 'Levels', category: 'color', description: 'Adjust shadows/midtones/highlights', icon: '📊' },
  { id: 'curves', name: 'Curves', category: 'color', description: 'Advanced color grading', icon: '📈' },
  
  // Blur effects
  { id: 'gaussian_blur', name: 'Gaussian Blur', category: 'blur', description: 'Soft blur effect', icon: '🔮' },
  { id: 'motion_blur', name: 'Motion Blur', category: 'blur', description: 'Directional blur', icon: '💨' },
  { id: 'radial_blur', name: 'Radial Blur', category: 'blur', description: 'Blur from center', icon: '🌀' },
  { id: 'zoom_blur', name: 'Zoom Blur', category: 'blur', description: 'Blur from point', icon: '🔍' },
  
  // Stylize effects
  { id: 'vignette', name: 'Vignette', category: 'stylize', description: 'Darken edges', icon: '⬛' },
  { id: 'sharpen', name: 'Sharpen', category: 'stylize', description: 'Enhance edges', icon: '🔪' },
  { id: 'edge_detect', name: 'Edge Detect', category: 'stylize', description: 'Find edges', icon: '📐' },
  { id: 'posterize', name: 'Posterize', category: 'stylize', description: 'Reduce colors', icon: '🎭' },
  { id: 'sobel', name: 'Sobel', category: 'stylize', description: 'Edge detection', icon: '⬜' },
  
  // Distort effects
  { id: 'bulge', name: 'Bulge', category: 'distort', description: 'Bulge distortion', icon: '🔵' },
  { id: 'spherize', name: 'Spherize', category: 'distort', description: 'Spherical effect', icon: '🌐' },
  { id: 'displace', name: 'Displace', category: 'distort', description: 'Image displacement', icon: '🌊' },
  { id: 'ripple', name: 'Ripple', category: 'distort', description: 'Wave distortion', icon: '〰️' },
  
  // Noise effects
  { id: 'noise', name: 'Noise', category: 'noise', description: 'Add grain', icon: '📺' },
  { id: 'film_grain', name: 'Film Grain', category: 'noise', description: 'Vintage grain', icon: '🎞️' },
  { id: 'scratch', name: 'Scratches', category: 'noise', description: 'Film scratches', icon: '💿' },
  { id: 'dust', name: 'Dust', category: 'noise', description: 'Dust particles', icon: '🌫️' },
];

// =============================================================================
// State
// =============================================================================

export interface EffectsState {
  shotEffects: Record<string, ShotEffects>; // shotId -> effects
  selectedEffectId: string | null;
  isProcessing: boolean;
  error: string | null;
}

const initialState: EffectsState = {
  shotEffects: {},
  selectedEffectId: null,
  isProcessing: false,
  error: null,
};

// =============================================================================
// Slice
// =============================================================================

const effectsSlice = createSlice({
  name: 'effects',
  initialState,
  reducers: {
    // Add effect to a shot
    addEffect: (state, action: PayloadAction<{ shotId: string; effectId: string; intensity?: number }>) => {
      const { shotId, effectId, intensity = 50 } = action.payload;
      
      if (!state.shotEffects[shotId]) {
        state.shotEffects[shotId] = { shotId, effects: [] };
      }
      
      // Check if effect already exists
      const exists = state.shotEffects[shotId].effects.some(e => e.effectId === effectId);
      if (!exists) {
        state.shotEffects[shotId].effects.push({
          id: `effect-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          effectId,
          intensity,
          enabled: true,
        });
      }
    },
    
    // Remove effect from a shot
    removeEffect: (state, action: PayloadAction<{ shotId: string; effectId: string }>) => {
      const { shotId, effectId } = action.payload;
      
      if (state.shotEffects[shotId]) {
        state.shotEffects[shotId].effects = state.shotEffects[shotId].effects.filter(
          e => e.effectId !== effectId
        );
        
        // Clean up empty shot entries
        if (state.shotEffects[shotId].effects.length === 0) {
          delete state.shotEffects[shotId];
        }
      }
    },
    
    // Update effect parameters
    updateEffect: (state, action: PayloadAction<{ shotId: string; effectId: string; updates: Partial<AppliedEffect> }>) => {
      const { shotId, effectId, updates } = action.payload;
      
      if (state.shotEffects[shotId]) {
        const effect = state.shotEffects[shotId].effects.find(e => e.effectId === effectId);
        if (effect) {
          Object.assign(effect, updates);
        }
      }
    },
    
    // Toggle effect enabled state
    toggleEffect: (state, action: PayloadAction<{ shotId: string; effectId: string }>) => {
      const { shotId, effectId } = action.payload;
      
      if (state.shotEffects[shotId]) {
        const effect = state.shotEffects[shotId].effects.find(e => e.effectId === effectId);
        if (effect) {
          effect.enabled = !effect.enabled;
        }
      }
    },
    
    // Update effect intensity
    setEffectIntensity: (state, action: PayloadAction<{ shotId: string; effectId: string; intensity: number }>) => {
      const { shotId, effectId, intensity } = action.payload;
      
      if (state.shotEffects[shotId]) {
        const effect = state.shotEffects[shotId].effects.find(e => e.effectId === effectId);
        if (effect) {
          effect.intensity = Math.max(0, Math.min(100, intensity));
        }
      }
    },
    
    // Clear all effects from a shot
    clearShotEffects: (state, action: PayloadAction<string>) => {
      const shotId = action.payload;
      delete state.shotEffects[shotId];
    },
    
    // Select effect for editing
    selectEffect: (state, action: PayloadAction<string | null>) => {
      state.selectedEffectId = action.payload;
    },
    
    // Set processing state
    setProcessing: (state, action: PayloadAction<boolean>) => {
      state.isProcessing = action.payload;
    },
    
    // Set error
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    // Bulk add effects
    addMultipleEffects: (state, action: PayloadAction<{ shotId: string; effectIds: string[] }>) => {
      const { shotId, effectIds } = action.payload;
      
      if (!state.shotEffects[shotId]) {
        state.shotEffects[shotId] = { shotId, effects: [] };
      }
      
      effectIds.forEach(effectId => {
        const exists = state.shotEffects[shotId].effects.some(e => e.effectId === effectId);
        if (!exists) {
          state.shotEffects[shotId].effects.push({
            id: `effect-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            effectId,
            intensity: 50,
            enabled: true,
          });
        }
      });
    },
  },
});

// =============================================================================
// Actions
// =============================================================================

export const {
  addEffect,
  removeEffect,
  updateEffect,
  toggleEffect,
  setEffectIntensity,
  clearShotEffects,
  selectEffect,
  setProcessing,
  setError,
  addMultipleEffects,
} = effectsSlice.actions;

// =============================================================================
// Selectors
// =============================================================================

// Get effects for a specific shot
export const selectShotEffects = (state: { effects: EffectsState }, shotId: string): AppliedEffect[] => 
  state.effects.shotEffects[shotId]?.effects || [];

// Get all shot effects
export const selectAllShotEffects = (state: { effects: EffectsState }): Record<string, ShotEffects> => 
  state.effects.shotEffects;

// Get selected effect ID
export const selectSelectedEffectId = (state: { effects: EffectsState }): string | null => 
  state.effects.selectedEffectId;

// Get processing state
export const selectIsProcessing = (state: { effects: EffectsState }): boolean => 
  state.effects.isProcessing;

// Get error
export const selectEffectsError = (state: { effects: EffectsState }): string | null => 
  state.effects.error;

// Check if a specific effect is applied to a shot
export const selectIsEffectApplied = (state: { effects: EffectsState }, shotId: string, effectId: string): boolean =>
  state.effects.shotEffects[shotId]?.effects.some(e => e.effectId === effectId) || false;

// Get effect by ID
export const selectEffectById = (effectId: string): Effect | undefined =>
  AVAILABLE_EFFECTS.find(e => e.id === effectId);

// Get effects by category
export const selectEffectsByCategory = (category: EffectCategory): Effect[] =>
  AVAILABLE_EFFECTS.filter(e => e.category === category);

// =============================================================================
// Reducer
// =============================================================================

export default effectsSlice.reducer;

