/**
 * Presets Slice - Redux state management for custom user presets
 * 
 * Manages saving and loading of custom configurations for:
 * - Shot effects
 * - Export settings
 * - Audio configurations
 * 
 * Requirements: Phase 5 - Custom Presets
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CustomPreset, PresetsState, PresetType } from '../../types';

// Initial state - attempts to load from localStorage
const loadPresetsFromStorage = (): CustomPreset[] => {
  try {
    const stored = localStorage.getItem('storycore_custom_presets');
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Failed to load presets from localStorage', e);
    return [];
  }
};

const initialState: PresetsState = {
  presets: loadPresetsFromStorage(),
  isLoading: false,
  error: null,
};

const presetsSlice = createSlice({
  name: 'presets',
  initialState,
  reducers: {
    addPreset: (state, action: PayloadAction<Omit<CustomPreset, 'id' | 'createdAt'>>) => {
      const newPreset: CustomPreset = {
        ...action.payload,
        id: `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now(),
      };
      state.presets.push(newPreset);
      
      // Persist to storage
      try {
        localStorage.setItem('storycore_custom_presets', JSON.stringify(state.presets));
      } catch (e) {
        console.error('Failed to save presets to localStorage', e);
      }
    },
    
    removePreset: (state, action: PayloadAction<string>) => {
      state.presets = state.presets.filter(p => p.id !== action.payload);
      
      // Persist to storage
      try {
        localStorage.setItem('storycore_custom_presets', JSON.stringify(state.presets));
      } catch (e) {
        console.error('Failed to save presets to localStorage', e);
      }
    },
    
    updatePreset: (state, action: PayloadAction<{ id: string; updates: Partial<CustomPreset> }>) => {
      const preset = state.presets.find(p => p.id === action.payload.id);
      if (preset) {
        Object.assign(preset, action.payload.updates);
        
        // Persist to storage
        try {
          localStorage.setItem('storycore_custom_presets', JSON.stringify(state.presets));
        } catch (e) {
          console.error('Failed to save presets to localStorage', e);
        }
      }
    },
    
    clearPresets: (state) => {
      state.presets = [];
      localStorage.removeItem('storycore_custom_presets');
    }
  }
});

export const { addPreset, removePreset, updatePreset, clearPresets } = presetsSlice.actions;

// Selectors
export const selectAllPresets = (state: { presets: PresetsState }) => state.presets.presets;
export const selectPresetsByType = (state: { presets: PresetsState }, type: PresetType) => 
  state.presets.presets.filter(p => p.type === type);

export default presetsSlice.reducer;
