/**
 * Caption Style Store
 * MI2: Caption Styles - Modern, Classic, Dynamic
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  CaptionStyle,
  CaptionStylePreset,
  CaptionTrack,
  CaptionLayer,
  CaptionStyleLibrary,
} from '../types/caption-style';

interface CaptionStyleStore {
  // Built-in styles
  builtInStyles: CaptionStyle[];

  // User presets
  userPresets: CaptionStylePreset[];
  recentStyles: string[];
  favoriteStyleIds: string[];

  // Active caption track
  activeTrack: CaptionTrack | null;
  tracks: CaptionTrack[];

  // Selected layer
  selectedLayerId: string | null;
  selectedStyleId: string | null;

  // UI state
  isPanelOpen: boolean;
  isStyleEditorOpen: boolean;
  previewMode: boolean;

  // Actions
  // Style management
  registerBuiltInStyle: (style: CaptionStyle) => void;
  createPreset: (preset: CaptionStylePreset) => void;
  updatePreset: (id: string, updates: Partial<CaptionStylePreset>) => void;
  deletePreset: (id: string) => void;
  addToFavorites: (id: string) => void;
  removeFromFavorites: (id: string) => void;
  addToRecent: (id: string) => void;

  // Track management
  createTrack: (track: CaptionTrack) => void;
  updateTrack: (id: string, updates: Partial<CaptionTrack>) => void;
  deleteTrack: (id: string) => void;
  selectTrack: (id: string | null) => void;

  // Layer management
  createLayer: (layer: CaptionLayer) => void;
  updateLayer: (id: string, updates: Partial<CaptionLayer>) => void;
  deleteLayer: (id: string) => void;
  selectLayer: (id: string | null) => void;

  // Style application
  applyStyleToLayer: (styleId: string, layerId: string) => void;
  applyStyleToTrack: (styleId: string, trackId: string) => void;
  selectStyle: (id: string | null) => void;

  // UI
  togglePanel: () => void;
  toggleStyleEditor: () => void;
  setPreviewMode: (enabled: boolean) => void;

  // Bulk operations
  importStyles: (styles: CaptionStyle[]) => void;
  exportStyles: (styleIds: string[]) => (CaptionStyle | CaptionStylePreset)[];
  resetToDefaults: () => void;
}

export const useCaptionStyleStore = create<CaptionStyleStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    builtInStyles: [],
    userPresets: [],
    recentStyles: [],
    favoriteStyleIds: [],
    activeTrack: null,
    tracks: [],
    selectedLayerId: null,
    selectedStyleId: null,
    isPanelOpen: false,
    isStyleEditorOpen: false,
    previewMode: false,

    // Style management
    registerBuiltInStyle: (style) => set((state) => ({
      builtInStyles: state.builtInStyles.some((s) => s.id === style.id)
        ? state.builtInStyles
        : [...state.builtInStyles, style],
    })),

    createPreset: (preset) => set((state) => ({
      userPresets: [...state.userPresets, preset],
    })),

    updatePreset: (id, updates) => set((state) => ({
      userPresets: state.userPresets.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
      ),
    })),

    deletePreset: (id) => set((state) => ({
      userPresets: state.userPresets.filter((p) => p.id !== id),
      favoriteStyleIds: state.favoriteStyleIds.filter((fId) => fId !== id),
    })),

    addToFavorites: (id) => set((state) => ({
      favoriteStyleIds: state.favoriteStyleIds.includes(id)
        ? state.favoriteStyleIds
        : [...state.favoriteStyleIds, id],
    })),

    removeFromFavorites: (id) => set((state) => ({
      favoriteStyleIds: state.favoriteStyleIds.filter((fId) => fId !== id),
    })),

    addToRecent: (id) => set((state) => {
      const recent = [id, ...state.recentStyles.filter((rId) => rId !== id)].slice(0, 10);
      return { recentStyles: recent };
    }),

    // Track management
    createTrack: (track) => set((state) => ({
      tracks: [...state.tracks, track],
      activeTrack: state.activeTrack || track,
    })),

    updateTrack: (id, updates) => set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
      activeTrack: state.activeTrack?.id === id
        ? { ...state.activeTrack, ...updates }
        : state.activeTrack,
    })),

    deleteTrack: (id) => set((state) => ({
      tracks: state.tracks.filter((t) => t.id !== id),
      activeTrack: state.activeTrack?.id === id
        ? (state.tracks[0] || null)
        : state.activeTrack,
    })),

    selectTrack: (id) => {
      const track = id ? get().tracks.find((t) => t.id === id) : null;
      set({ activeTrack: track });
    },

    // Layer management
    createLayer: (layer) => set((state) => {
      const tracks = state.tracks.map((t) =>
        t.id === layer.trackId
          ? { ...t, layers: [...t.layers, layer] }
          : t
      );
      return {
        tracks,
        activeTrack: state.activeTrack?.id === layer.trackId
          ? { ...state.activeTrack, layers: [...state.activeTrack.layers, layer] }
          : state.activeTrack,
      };
    }),

    updateLayer: (id, updates) => set((state) => {
      const tracks = state.tracks.map((t) => ({
        ...t,
        layers: t.layers.map((l) =>
          l.id === id ? { ...l, ...updates } : l
        ),
      }));
      return {
        tracks,
        activeTrack: state.activeTrack
          ? {
            ...state.activeTrack,
            layers: state.activeTrack.layers.map((l) =>
              l.id === id ? { ...l, ...updates } : l
            ),
          }
          : state.activeTrack,
      };
    }),

    deleteLayer: (id) => set((state) => {
      const tracks = state.tracks.map((t) => ({
        ...t,
        layers: t.layers.filter((l) => l.id !== id),
      }));
      return {
        tracks,
        activeTrack: state.activeTrack
          ? {
            ...state.activeTrack,
            layers: state.activeTrack.layers.filter((l) => l.id !== id),
          }
          : state.activeTrack,
        selectedLayerId: state.selectedLayerId === id ? null : state.selectedLayerId,
      };
    }),

    selectLayer: (id) => set({ selectedLayerId: id }),

    // Style application
    applyStyleToLayer: (styleId, layerId) => {
      const { builtInStyles, userPresets, updateLayer, addToRecent } = get();
      const style = builtInStyles.find((s) => s.id === styleId) ||
        userPresets.find((p) => p.id === styleId);

      if (style) {
        updateLayer(layerId, {
          styleId,
          customStyle: (style && 'customizations' in style)
            ? (style as CaptionStylePreset).customizations
            : undefined,
        });
        addToRecent(styleId);
      }
    },

    applyStyleToTrack: (styleId, trackId) => {
      const { builtInStyles, userPresets, updateTrack, addToRecent } = get();
      const style = builtInStyles.find((s) => s.id === styleId) ||
        userPresets.find((p) => p.id === styleId);

      if (style) {
        updateTrack(trackId, {
          styleId,
        });
        addToRecent(styleId);
      }
    },

    selectStyle: (id) => set({ selectedStyleId: id }),

    // UI
    togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),

    toggleStyleEditor: () => set((state) => ({ isStyleEditorOpen: !state.isStyleEditorOpen })),

    setPreviewMode: (enabled) => set({ previewMode: enabled }),

    // Bulk operations
    importStyles: (styles) => set((state) => ({
      builtInStyles: [...state.builtInStyles, ...styles],
    })),

    exportStyles: (styleIds) => {
      const { builtInStyles, userPresets } = get();
      return [...builtInStyles, ...userPresets].filter((s) =>
        styleIds.includes(s.id)
      );
    },

    resetToDefaults: () => set({
      userPresets: [],
      recentStyles: [],
      favoriteStyleIds: [],
      tracks: [],
      activeTrack: null,
    }),
  }))
);
