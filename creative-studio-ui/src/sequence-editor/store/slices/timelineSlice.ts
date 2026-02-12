/**
 * Timeline Slice - Redux state management for timeline, shots, tracks, markers, and regions
 * Requirements: 1.1, 1.3, 1.8, 19.1
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { TimelineState, Shot, Track, ReferenceImage, TimelineMarker, TimelineRegion, Layer } from '../../types';

// Default track configuration
const DEFAULT_TRACKS: Track[] = [
  { id: 'media', type: 'media', height: 60, locked: false, hidden: false, color: '#4A90E2', icon: 'film' },
  { id: 'audio', type: 'audio', height: 40, locked: false, hidden: false, color: '#50C878', icon: 'volume' },
  { id: 'effects', type: 'effects', height: 40, locked: false, hidden: false, color: '#9B59B6', icon: 'magic' },
  { id: 'transitions', type: 'transitions', height: 30, locked: false, hidden: false, color: '#E67E22', icon: 'shuffle' },
  { id: 'text', type: 'text', height: 40, locked: false, hidden: false, color: '#F39C12', icon: 'text' },
  { id: 'keyframes', type: 'keyframes', height: 30, locked: false, hidden: false, color: '#E74C3C', icon: 'key' },
];

const initialState: TimelineState = {
  shots: [],
  tracks: DEFAULT_TRACKS,
  playheadPosition: 0,
  zoomLevel: 1, // 1 pixel per frame
  selectedElements: [],
  duration: 0,
  markers: [],
  regions: [],
  selectedMarkers: [],
  selectedRegions: [],
};

const timelineSlice = createSlice({
  name: 'timeline',
  initialState,
  reducers: {
    addShot: (state, action: PayloadAction<Shot>) => {
      state.shots.push(action.payload);
      // Update total duration
      const shotEnd = action.payload.startTime + action.payload.duration;
      if (shotEnd > state.duration) {
        state.duration = shotEnd;
      }
    },
    updateShot: (state, action: PayloadAction<{ id: string; updates: Partial<Shot> }>) => {
      const { id, updates } = action.payload;
      const index = state.shots.findIndex((shot) => shot.id === id);
      if (index !== -1) {
        state.shots[index] = { ...state.shots[index], ...updates };
        // Recalculate duration if needed
        const maxEnd = Math.max(
          ...state.shots.map((shot) => shot.startTime + shot.duration)
        );
        state.duration = maxEnd;
      }
    },
    deleteShot: (state, action: PayloadAction<string>) => {
      state.shots = state.shots.filter((shot) => shot.id !== action.payload);
      state.selectedElements = state.selectedElements.filter((id) => id !== action.payload);
      // Recalculate duration
      const maxEnd = state.shots.length > 0
        ? Math.max(...state.shots.map((shot) => shot.startTime + shot.duration))
        : 0;
      state.duration = maxEnd;
    },
    reorderShots: (state, action: PayloadAction<Shot[]>) => {
      state.shots = action.payload;
    },
    addTrack: (state, action: PayloadAction<Track>) => {
      state.tracks.push(action.payload);
    },
    updateTrack: (state, action: PayloadAction<{ id: string; updates: Partial<Track> }>) => {
      const { id, updates } = action.payload;
      const index = state.tracks.findIndex((track) => track.id === id);
      if (index !== -1) {
        state.tracks[index] = { ...state.tracks[index], ...updates };
      }
    },
    deleteTrack: (state, action: PayloadAction<string>) => {
      state.tracks = state.tracks.filter((track) => track.id !== action.payload);
    },
    reorderTracks: (state, action: PayloadAction<Track[]>) => {
      state.tracks = action.payload;
    },
    setPlayheadPosition: (state, action: PayloadAction<number>) => {
      state.playheadPosition = action.payload;
    },
    setZoomLevel: (state, action: PayloadAction<number>) => {
      state.zoomLevel = action.payload;
    },
    selectElement: (state, action: PayloadAction<string>) => {
      if (!state.selectedElements.includes(action.payload)) {
        state.selectedElements.push(action.payload);
      }
    },
    deselectElement: (state, action: PayloadAction<string>) => {
      state.selectedElements = state.selectedElements.filter((id) => id !== action.payload);
    },
    setSelectedElements: (state, action: PayloadAction<string[]>) => {
      state.selectedElements = action.payload;
    },
    clearSelection: (state) => {
      state.selectedElements = [];
    },
    toggleTrackLock: (state, action: PayloadAction<string>) => {
      const track = state.tracks.find((t) => t.id === action.payload);
      if (track) {
        track.locked = !track.locked;
      }
    },
    toggleTrackHidden: (state, action: PayloadAction<string>) => {
      const track = state.tracks.find((t) => t.id === action.payload);
      if (track) {
        track.hidden = !track.hidden;
      }
    },
    addReferenceImage: (state, action: PayloadAction<{ shotId: string; image: ReferenceImage }>) => {
      const { shotId, image } = action.payload;
      const shot = state.shots.find((s) => s.id === shotId);
      if (shot) {
        shot.referenceImages.push(image);
      }
    },
    removeReferenceImage: (state, action: PayloadAction<{ shotId: string; imageIndex: number }>) => {
      const { shotId, imageIndex } = action.payload;
      const shot = state.shots.find((s) => s.id === shotId);
      if (shot && shot.referenceImages[imageIndex]) {
        shot.referenceImages.splice(imageIndex, 1);
      }
    },
    // Marker actions
    addMarker: (state, action: PayloadAction<TimelineMarker>) => {
      state.markers.push(action.payload);
    },
    updateMarker: (state, action: PayloadAction<{ id: string; updates: Partial<TimelineMarker> }>) => {
      const { id, updates } = action.payload;
      const index = state.markers.findIndex((marker) => marker.id === id);
      if (index !== -1) {
        state.markers[index] = { ...state.markers[index], ...updates, updatedAt: Date.now() };
      }
    },
    deleteMarker: (state, action: PayloadAction<string>) => {
      state.markers = state.markers.filter((marker) => marker.id !== action.payload);
      state.selectedMarkers = state.selectedMarkers.filter((id) => id !== action.payload);
    },
    selectMarker: (state, action: PayloadAction<string>) => {
      if (!state.selectedMarkers.includes(action.payload)) {
        state.selectedMarkers.push(action.payload);
      }
    },
    deselectMarker: (state, action: PayloadAction<string>) => {
      state.selectedMarkers = state.selectedMarkers.filter((id) => id !== action.payload);
    },
    setSelectedMarkers: (state, action: PayloadAction<string[]>) => {
      state.selectedMarkers = action.payload;
    },
    clearMarkerSelection: (state) => {
      state.selectedMarkers = [];
    },
    // Region actions
    addRegion: (state, action: PayloadAction<TimelineRegion>) => {
      state.regions.push(action.payload);
    },
    updateRegion: (state, action: PayloadAction<{ id: string; updates: Partial<TimelineRegion> }>) => {
      const { id, updates } = action.payload;
      const index = state.regions.findIndex((region) => region.id === id);
      if (index !== -1) {
        state.regions[index] = { ...state.regions[index], ...updates, updatedAt: Date.now() };
      }
    },
    deleteRegion: (state, action: PayloadAction<string>) => {
      state.regions = state.regions.filter((region) => region.id !== action.payload);
      state.selectedRegions = state.selectedRegions.filter((id) => id !== action.payload);
    },
    selectRegion: (state, action: PayloadAction<string>) => {
      if (!state.selectedRegions.includes(action.payload)) {
        state.selectedRegions.push(action.payload);
      }
    },
    deselectRegion: (state, action: PayloadAction<string>) => {
      state.selectedRegions = state.selectedRegions.filter((id) => id !== action.payload);
    },
    setSelectedRegions: (state, action: PayloadAction<string[]>) => {
      state.selectedRegions = action.payload;
    },
    clearRegionSelection: (state) => {
      state.selectedRegions = [];
    },
    // Layer actions
    addLayer: (state, action: PayloadAction<{ shotId: string; layer: Layer }>) => {
      const { shotId, layer } = action.payload;
      const shot = state.shots.find((s) => s.id === shotId);
      if (shot) {
        shot.layers.push(layer);
      }
    },
    updateLayer: (state, action: PayloadAction<{ shotId: string; layerId: string; updates: Partial<Layer> }>) => {
      const { shotId, layerId, updates } = action.payload;
      const shot = state.shots.find((s) => s.id === shotId);
      if (shot) {
        const layerIndex = shot.layers.findIndex((l) => l.id === layerId);
        if (layerIndex !== -1) {
          shot.layers[layerIndex] = { ...shot.layers[layerIndex], ...updates };
        }
      }
    },
    deleteLayer: (state, action: PayloadAction<{ shotId: string; layerId: string }>) => {
      const { shotId, layerId } = action.payload;
      const shot = state.shots.find((s) => s.id === shotId);
      if (shot) {
        shot.layers = shot.layers.filter((l) => l.id !== layerId);
        // Remove from selection if selected
        state.selectedElements = state.selectedElements.filter((id) => id !== layerId);
      }
    },
    reorderLayers: (state, action: PayloadAction<{ shotId: string; layers: Layer[] }>) => {
      const { shotId, layers } = action.payload;
      const shot = state.shots.find((s) => s.id === shotId);
      if (shot) {
        shot.layers = layers;
      }
    },
    toggleLayerLock: (state, action: PayloadAction<{ shotId: string; layerId: string }>) => {
      const { shotId, layerId } = action.payload;
      const shot = state.shots.find((s) => s.id === shotId);
      if (shot) {
        const layer = shot.layers.find((l) => l.id === layerId);
        if (layer) {
          layer.locked = !layer.locked;
        }
      }
    },
    toggleLayerHidden: (state, action: PayloadAction<{ shotId: string; layerId: string }>) => {
      const { shotId, layerId } = action.payload;
      const shot = state.shots.find((s) => s.id === shotId);
      if (shot) {
        const layer = shot.layers.find((l) => l.id === layerId);
        if (layer) {
          layer.hidden = !layer.hidden;
        }
      }
    },
    setLayerOpacity: (state, action: PayloadAction<{ shotId: string; layerId: string; opacity: number }>) => {
      const { shotId, layerId, opacity } = action.payload;
      const shot = state.shots.find((s) => s.id === shotId);
      if (shot) {
        const layer = shot.layers.find((l) => l.id === layerId);
        if (layer) {
          layer.opacity = Math.max(0, Math.min(1, opacity)); // Clamp to 0-1
        }
      }
    },
    setLayerBlendMode: (state, action: PayloadAction<{ shotId: string; layerId: string; blendMode: string }>) => {
      const { shotId, layerId, blendMode } = action.payload;
      const shot = state.shots.find((s) => s.id === shotId);
      if (shot) {
        const layer = shot.layers.find((l) => l.id === layerId);
        if (layer) {
          layer.blendMode = blendMode;
        }
      }
    },
    // Visual style actions
    applyStyleToShot: (state, action: PayloadAction<{ shotId: string; styleApplication: unknown }>) => {
      const { shotId, styleApplication } = action.payload;
      const shot = state.shots.find((s) => s.id === shotId);
      if (shot) {
        shot.visualStyle = styleApplication;
        shot.modified = true;
      }
    },
    applyStyleToMultipleShots: (state, action: PayloadAction<{ shotIds: string[]; styleApplication: unknown }>) => {
      const { shotIds, styleApplication } = action.payload;
      shotIds.forEach((shotId) => {
        const shot = state.shots.find((s) => s.id === shotId);
        if (shot) {
          shot.visualStyle = { ...styleApplication, shotId };
          shot.modified = true;
        }
      });
    },
    removeStyleFromShot: (state, action: PayloadAction<string>) => {
      const shot = state.shots.find((s) => s.id === action.payload);
      if (shot) {
        shot.visualStyle = undefined;
        shot.modified = true;
      }
    },
    updateStyleIntensity: (state, action: PayloadAction<{ shotId: string; intensity: number }>) => {
      const { shotId, intensity } = action.payload;
      const shot = state.shots.find((s) => s.id === shotId);
      if (shot && shot.visualStyle) {
        shot.visualStyle.intensity = Math.max(0, Math.min(100, intensity));
        shot.modified = true;
      }
    },
    updateStyleParameters: (state, action: PayloadAction<{ shotId: string; parameters: unknown }>) => {
      const { shotId, parameters } = action.payload;
      const shot = state.shots.find((s) => s.id === shotId);
      if (shot && shot.visualStyle) {
        shot.visualStyle.parameters = { ...shot.visualStyle.parameters, ...parameters };
        shot.modified = true;
      }
    },
  },
});

export const {
  addShot,
  updateShot,
  deleteShot,
  reorderShots,
  addTrack,
  updateTrack,
  deleteTrack,
  reorderTracks,
  setPlayheadPosition,
  setZoomLevel,
  selectElement,
  deselectElement,
  setSelectedElements,
  clearSelection,
  toggleTrackLock,
  toggleTrackHidden,
  addReferenceImage,
  removeReferenceImage,
  addMarker,
  updateMarker,
  deleteMarker,
  selectMarker,
  deselectMarker,
  setSelectedMarkers,
  clearMarkerSelection,
  addRegion,
  updateRegion,
  deleteRegion,
  selectRegion,
  deselectRegion,
  setSelectedRegions,
  clearRegionSelection,
  addLayer,
  updateLayer,
  deleteLayer,
  reorderLayers,
  toggleLayerLock,
  toggleLayerHidden,
  setLayerOpacity,
  setLayerBlendMode,
  applyStyleToShot,
  applyStyleToMultipleShots,
  removeStyleFromShot,
  updateStyleIntensity,
  updateStyleParameters,
} = timelineSlice.actions;

export default timelineSlice.reducer;

