/**
 * Color Correction Store
 * MI1: Color Correction Presets - Vintage, Noir, Vibrant, Cinematic
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  ColorCorrectionPreset,
  ColorCorrectionLayer,
  ColorGradingState,
  ColorCorrectionSettings,
  ColorCorrectionPresetLibrary,
} from '../types/color-correction';

interface ColorCorrectionStore {
  // Presets
  presets: ColorCorrectionPreset[];
  customPresets: ColorCorrectionPreset[];
  recentlyUsed: string[];
  favorites: string[];
  
  // Active correction
  activeLayer: ColorCorrectionLayer | null;
  layers: ColorCorrectionLayer[];
  globalAdjustment: ColorCorrectionLayer | null;
  
  // State
  state: ColorGradingState;
  
  // Settings
  settings: ColorCorrectionSettings;
  
  // UI
  isPanelOpen: boolean;
  selectedLayerId: string | null;
  selectedPresetId: string | null;
  compareMode: boolean;
  beforeAfterView: boolean;
  
  // Actions
  // Preset management
  loadPreset: (preset: ColorCorrectionPreset) => void;
  saveCustomPreset: (preset: ColorCorrectionPreset) => void;
  deleteCustomPreset: (id: string) => void;
  addToFavorites: (id: string) => void;
  removeFromFavorites: (id: string) => void;
  addToRecent: (id: string) => void;
  
  // Layer management
  addLayer: (layer: ColorCorrectionLayer) => void;
  removeLayer: (id: string) => void;
  updateLayer: (id: string, updates: Partial<ColorCorrectionLayer>) => void;
  reorderLayers: (fromIndex: number, toIndex: number) => void;
  selectLayer: (id: string | null) => void;
  
  // Active preset
  applyPreset: (presetId: string) => void;
  applyPresetToLayer: (presetId: string, layerId: string) => void;
  selectPreset: (id: string | null) => void;
  
  // Global adjustment
  updateGlobalAdjustment: (adjustments: Partial<ColorCorrectionLayer['adjustments']>) => void;
  
  // State management
  toggleEnabled: () => void;
  setCompareMode: (enabled: boolean) => void;
  setBeforeAfterView: (enabled: boolean) => void;
  
  // Settings
  updateSettings: (settings: Partial<ColorCorrectionSettings>) => void;
  
  // UI
  togglePanel: () => void;
  
  // Reset
  resetAll: () => void;
  resetLayer: (id: string) => void;
}

const defaultSettings: ColorCorrectionSettings = {
  enableHDR: false,
  bitDepth: 8,
  colorSpace: 'Rec.709',
  gamma: 2.4,
  gamutMapping: 'perceptual',
};

export const useColorCorrectionStore = create<ColorCorrectionStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    presets: [],
    customPresets: [],
    recentlyUsed: [],
    favorites: [],
    activeLayer: null,
    layers: [],
    globalAdjustment: null,
    state: {
      activePresets: [],
      globalAdjustment: {
        exposure: 0,
        contrast: 0,
        highlights: 0,
        shadows: 0,
        whites: 0,
        blacks: 0,
        temperature: 0,
        tint: 0,
        saturation: 0,
        vibrance: 0,
        clarity: 0,
        fade: 0,
        grain: 0,
        vignette: {
          intensity: 0,
          midpoint: 50,
          roundness: 100,
          feather: 50,
          color: '#000000',
        },
        colorBalance: {
          shadows: [0, 0, 0],
          midtones: [0, 0, 0],
          highlights: [0, 0, 0],
        },
        hsl: [],
      },
      beforeCorrection: false,
      afterCorrection: true,
      isEnabled: true,
    },
    settings: { ...defaultSettings },
    isPanelOpen: false,
    selectedLayerId: null,
    selectedPresetId: null,
    compareMode: false,
    beforeAfterView: false,
    
    // Preset management
    loadPreset: (preset) => set((state) => ({
      presets: state.presets.some((p) => p.id === preset.id)
        ? state.presets
        : [...state.presets, preset],
    })),
    
    saveCustomPreset: (preset) => set((state) => ({
      customPresets: [...state.customPresets, preset],
    })),
    
    deleteCustomPreset: (id) => set((state) => ({
      customPresets: state.customPresets.filter((p) => p.id !== id),
      favorites: state.favorites.filter((fId) => fId !== id),
    })),
    
    addToFavorites: (id) => set((state) => ({
      favorites: state.favorites.includes(id) 
        ? state.favorites 
        : [...state.favorites, id],
    })),
    
    removeFromFavorites: (id) => set((state) => ({
      favorites: state.favorites.filter((fId) => fId !== id),
    })),
    
    addToRecent: (id) => set((state) => {
      const recent = [id, ...state.recentlyUsed.filter((rId) => rId !== id)].slice(0, 10);
      return { recentlyUsed: recent };
    }),
    
    // Layer management
    addLayer: (layer) => set((state) => ({
      layers: [...state.layers, layer],
    })),
    
    removeLayer: (id) => set((state) => ({
      layers: state.layers.filter((l) => l.id !== id),
      selectedLayerId: state.selectedLayerId === id ? null : state.selectedLayerId,
    })),
    
    updateLayer: (id, updates) => set((state) => ({
      layers: state.layers.map((l) => 
        l.id === id ? { ...l, ...updates } : l
      ),
    })),
    
    reorderLayers: (fromIndex, toIndex) => set((state) => {
      const newLayers = [...state.layers];
      const [removed] = newLayers.splice(fromIndex, 1);
      newLayers.splice(toIndex, 0, removed);
      return {
        layers: newLayers.map((l, index) => ({ ...l, order: index })),
      };
    }),
    
    selectLayer: (id) => set({ selectedLayerId: id }),
    
    // Active preset
    applyPreset: (presetId) => {
      const { presets, addLayer } = get();
      const preset = presets.find((p) => p.id === presetId);
      if (preset) {
        addLayer({
          id: `layer-${Date.now()}`,
          name: preset.name,
          isEnabled: true,
          blendMode: 'normal',
          opacity: 100,
          presetId,
          adjustments: preset.adjustments,
          order: get().layers.length,
        });
        get().addToRecent(presetId);
      }
    },
    
    applyPresetToLayer: (presetId, layerId) => {
      const { presets, updateLayer, addToRecent } = get();
      const preset = presets.find((p) => p.id === presetId);
      if (preset) {
        updateLayer(layerId, {
          presetId,
          adjustments: preset.adjustments,
        });
        addToRecent(presetId);
      }
    },
    
    selectPreset: (id) => set({ selectedPresetId: id }),
    
    // Global adjustment
    updateGlobalAdjustment: (adjustments) => set((state) => ({
      globalAdjustment: {
        ...state.globalAdjustment!,
        ...adjustments,
      },
    })),
    
    // State management
    toggleEnabled: () => set((state) => ({
      state: { ...state.state, isEnabled: !state.state.isEnabled },
    })),
    
    setCompareMode: (enabled) => set({ compareMode: enabled }),
    
    setBeforeAfterView: (enabled) => set({ beforeAfterView: enabled }),
    
    // Settings
    updateSettings: (settings) => set((state) => ({
      settings: { ...state.settings, ...settings },
    })),
    
    // UI
    togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),
    
    // Reset
    resetAll: () => set({
      layers: [],
      globalAdjustment: defaultSettings as any,
    }),
    
    resetLayer: (id) => {
      const { presets, updateLayer } = get();
      const layer = get().layers.find((l) => l.id === id);
      if (layer?.presetId) {
        const preset = presets.find((p) => p.id === layer.presetId);
        if (preset) {
          updateLayer(id, { adjustments: preset.adjustments });
        }
      }
    },
  }))
);
