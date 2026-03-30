import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Shot, Track, Layer, TimelineKeyframe, StyleApplication, StyleParameters, MediaLayerData, TextLayerData, AudioLayerData, ReferenceImage, TimelineMarker, TimelineRegion, Annotation } from '../../types';
import { v4 as uuidv4 } from 'uuid';

interface TimelineState {
  projectId: string;
  shots: Shot[];
  tracks: Track[];
  playheadPosition: number;
  zoomLevel: number;
  selectedElements: string[];
  duration: number; // In frames
  isPlaying: boolean;
  markers: TimelineMarker[];
  regions: TimelineRegion[];
  annotations: Annotation[];
  selectedMarkers: string[];
  selectedRegions: string[];
  activeKeyframeEditor?: {
    shotId: string;
    layerId: string;
    property: string;
  };
}

const initialState: TimelineState = {
  projectId: '',
  shots: [],
  tracks: [
    { id: 'track-1', type: 'media', height: 120, locked: false, hidden: false, color: '#4A90E2', icon: 'film' },
    { id: 'track-2', type: 'media', height: 120, locked: false, hidden: false, color: '#4A90E2', icon: 'film' },
    { id: 'track-3', type: 'audio', height: 60, locked: false, hidden: false, color: '#50E3C2', icon: 'music' },
  ],
  playheadPosition: 0,
  zoomLevel: 10,
  selectedElements: [],
  duration: 2400, // 100 seconds at 24fps
  isPlaying: false,
  markers: [],
  regions: [],
  annotations: [],
  selectedMarkers: [],
  selectedRegions: [],
  activeKeyframeEditor: undefined,
};

export const timelineSlice = createSlice({
  name: 'timeline',
  initialState,
  reducers: {
    setProjectId: (state, action: PayloadAction<string>) => {
      state.projectId = action.payload;
    },
    addShot: (state, action: PayloadAction<Shot>) => {
      state.shots.push(action.payload);
      // Update overall duration if needed
      const shotEnd = action.payload.startTime + action.payload.duration;
      if (shotEnd > state.duration) {
        state.duration = shotEnd + 240; // Add 10s buffer
      }
    },
    updateShot: (state, action: PayloadAction<{ id: string; updates: Partial<Shot> }>) => {
      const index = state.shots.findIndex((s) => s.id === action.payload.id);
      if (index !== -1) {
        state.shots[index] = { ...state.shots[index], ...action.payload.updates };
      }
    },
    deleteShot: (state, action: PayloadAction<string>) => {
      state.shots = state.shots.filter((s) => s.id !== action.payload);
    },
    deleteMultipleShots: (state, action: PayloadAction<string[]>) => {
      state.shots = state.shots.filter((s) => !action.payload.includes(s.id));
    },
    splitShot: (state, action: PayloadAction<{ id: string; frame: number }>) => {
      const { id, frame } = action.payload;
      const index = state.shots.findIndex((s) => s.id === id);
      if (index === -1) return;

      const shot = state.shots[index];
      const splitOffset = frame - shot.startTime;
      if (splitOffset <= 0 || splitOffset >= shot.duration) return;

      const newShot: Shot = {
        ...shot,
        id: uuidv4(),
        startTime: frame,
        duration: shot.duration - splitOffset,
        metadata: {
            ...shot.metadata,
            contentOffset: (Number(shot.metadata?.contentOffset) || 0) + splitOffset
        }
      };

      shot.duration = splitOffset;
      state.shots.splice(index + 1, 0, newShot);
    },
    setPlayheadPosition: (state, action: PayloadAction<number>) => {
      state.playheadPosition = Math.max(0, action.payload);
    },
    setZoomLevel: (state, action: PayloadAction<number>) => {
      state.zoomLevel = Math.max(0.1, Math.min(100, action.payload));
    },
    setSelectedElements: (state, action: PayloadAction<string[]>) => {
      state.selectedElements = action.payload;
    },
    selectElement: (state, action: PayloadAction<string>) => {
      state.selectedElements = [action.payload];
    },
    deselectElement: (state, action: PayloadAction<string>) => {
      state.selectedElements = state.selectedElements.filter(id => id !== action.payload);
    },
    clearSelection: (state) => {
      state.selectedElements = [];
    },
    setDuration: (state, action: PayloadAction<number>) => {
      state.duration = action.payload;
    },
    setIsPlaying: (state, action: PayloadAction<boolean>) => {
      state.isPlaying = action.payload;
    },
    // Track Management
    addTrack: (state, action: PayloadAction<Track>) => {
      state.tracks.push(action.payload);
    },
    updateTrack: (state, action: PayloadAction<{ id: string; updates: Partial<Track> }>) => {
      const index = state.tracks.findIndex((t) => t.id === action.payload.id);
      if (index !== -1) {
        state.tracks[index] = { ...state.tracks[index], ...action.payload.updates };
      }
    },
    deleteTrack: (state, action: PayloadAction<string>) => {
      state.tracks = state.tracks.filter((t) => t.id !== action.payload);
    },
    reorderTracks: (state, action: PayloadAction<Track[]>) => {
      state.tracks = action.payload;
    },
    reorderShots: (state, action: PayloadAction<Shot[]>) => {
      state.shots = action.payload;
    },
    toggleTrackLock: (state, action: PayloadAction<string>) => {
      const track = state.tracks.find((t) => t.id === action.payload);
      if (track) track.locked = !track.locked;
    },
    toggleTrackHidden: (state, action: PayloadAction<string>) => {
      const track = state.tracks.find((t) => t.id === action.payload);
      if (track) track.hidden = !track.hidden;
    },
    // Advanced Editing Operations
    shiftShots: (state, action: PayloadAction<{ startTime: number; delta: number }>) => {
      const { startTime, delta } = action.payload;
      state.shots.forEach((shot) => {
        if (shot.startTime >= startTime) {
          shot.startTime += delta;
        }
      });
    },
    rippleEdit: (state, action: PayloadAction<{ shotId: string; delta: number; edge: 'start' | 'end' }>) => {
      const { shotId, delta, edge } = action.payload;
      const shot = state.shots.find((s) => s.id === shotId);
      if (!shot) return;

      if (edge === 'end') {
        shot.duration += delta;
        state.shots.forEach((s) => {
          if (s.startTime > shot.startTime) {
            s.startTime += delta;
          }
        });
      } else {
        shot.startTime += delta;
        shot.duration -= delta;
        state.shots.forEach((s) => {
          if (s.startTime > shot.startTime - delta) {
            s.startTime += delta;
          }
        });
      }
    },
    rollEdit: (state, action: PayloadAction<{ shotAId: string; shotBId: string; delta: number }>) => {
      const { shotAId, shotBId, delta } = action.payload;
      const shotA = state.shots.find((s) => s.id === shotAId);
      const shotB = state.shots.find((s) => s.id === shotBId);
      if (shotA && shotB) {
        shotA.duration += delta;
        shotB.startTime += delta;
        shotB.duration -= delta;
      }
    },
    slipEdit: (state, action: PayloadAction<{ shotId: string; delta: number }>) => {
        const { shotId, delta } = action.payload;
        const shot = state.shots.find(s => s.id === shotId);
        if (shot) {
            if (!shot.metadata) shot.metadata = {};
            const currentOffset = Number(shot.metadata.contentOffset) || 0;
            shot.metadata.contentOffset = currentOffset + delta;
            // Note: startTime and duration remain unchanged in slip edit
        }
    },
    slideEdit: (state, action: PayloadAction<{ shotId: string; delta: number }>) => {
        const { shotId, delta } = action.payload;
        const shot = state.shots.find(s => s.id === shotId);
        if (!shot) return;

        // Slide changes startTime but opposite changes to neighbors to keep content alignment
        // Find immediate neighbors on the same track would be ideal, but for now we do simple slide
        shot.startTime += delta;
        
        // Compensate neighbors (simplified for one neighbor on each side)
        const prevShot = state.shots.find(s => s.startTime + s.duration === shot.startTime - delta);
        if (prevShot) prevShot.duration += delta;
        
        const nextShot = state.shots.find(s => s.startTime === shot.startTime + shot.duration - delta);
        if (nextShot) {
            nextShot.startTime += delta;
            nextShot.duration -= delta;
        }
    },
    // Sub-element management
    addShotLayer: (state, action: PayloadAction<{ shotId: string; layer: Layer }>) => {
      const shot = state.shots.find((s) => s.id === action.payload.shotId);
      if (shot) {
        shot.layers.push(action.payload.layer);
      }
    },
    updateShotLayer: (state, action: PayloadAction<{ shotId: string; layerId: string; updates: Partial<Layer> }>) => {
      const { shotId, layerId, updates } = action.payload;
      const shot = state.shots.find((s) => s.id === shotId);
      if (shot) {
        const index = shot.layers.findIndex((l) => l.id === layerId);
        if (index !== -1) {
          shot.layers[index] = { ...shot.layers[index], ...updates };
        }
      }
    },
    deleteShotLayer: (state, action: PayloadAction<{ shotId: string; layerId: string }>) => {
      const { shotId, layerId } = action.payload;
      const shot = state.shots.find((s) => s.id === shotId);
      if (shot) {
        shot.layers = shot.layers.filter((l) => l.id !== layerId);
      }
    },
    reorderShotLayers: (state, action: PayloadAction<{ shotId: string; layers: Layer[] }>) => {
      const { shotId, layers } = action.payload;
      const shot = state.shots.find((s) => s.id === shotId);
      if (shot) {
        shot.layers = layers;
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
    addShotReference: (state, action: PayloadAction<{ shotId: string; image: ReferenceImage }>) => {
      const { shotId, image } = action.payload;
      const shot = state.shots.find((s) => s.id === shotId);
      if (shot) {
        if (!shot.referenceImages) {
          shot.referenceImages = [];
        }
        shot.referenceImages.push(image);
        shot.modified = true;
      }
    },
    // Visual style actions
    applyStyleToShot: (state, action: PayloadAction<{ shotId: string; styleApplication: StyleApplication }>) => {
      const { shotId, styleApplication } = action.payload;
      const shot = state.shots.find((s) => s.id === shotId);
      if (shot) {
        shot.visualStyle = styleApplication;
        shot.modified = true;
      }
    },
    applyStyleToMultipleShots: (state, action: PayloadAction<{ shotIds: string[]; styleApplication: StyleApplication }>) => {
      const { shotIds, styleApplication } = action.payload;
      shotIds.forEach((shotId) => {
        const shot = state.shots.find((s) => s.id === shotId);
        if (shot) {
          shot.visualStyle = { ...styleApplication, shotId } as StyleApplication;
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
    updateStyleParameters: (state, action: PayloadAction<{ shotId: string; parameters: Partial<StyleParameters> }>) => {
      const { shotId, parameters } = action.payload;
      const shot = state.shots.find((s) => s.id === shotId);
      if (shot && shot.visualStyle) {
        shot.visualStyle.parameters = { ...shot.visualStyle.parameters, ...parameters } as StyleParameters;
        shot.modified = true;
      }
    },
    addTransition: (state, action: PayloadAction<{ clipId: string; transitionType: string; position: 'in' | 'out'; duration: number }>) => {
      const { clipId, transitionType, position, duration } = action.payload;
      const shot = state.shots.find((s) => s.id === clipId);
      if (shot) {
        if (!shot.transitions) {
          shot.transitions = {};
        }
        shot.transitions[position] = {
          type: transitionType,
          duration,
          appliedAt: Date.now(),
        };
        shot.modified = true;
      }
    },
    removeTransition: (state, action: PayloadAction<{ clipId: string; position: 'in' | 'out' }>) => {
      const { clipId, position } = action.payload;
      const shot = state.shots.find((s) => s.id === clipId);
      if (shot && shot.transitions) {
        delete shot.transitions[position];
        shot.modified = true;
      }
    },
    updateTransition: (state, action: PayloadAction<{ clipId: string; position: 'in' | 'out'; updates: { transitionType?: string; duration?: number } }>) => {
      const { clipId, position, updates } = action.payload;
      const shot = state.shots.find((s) => s.id === clipId);
      if (shot && shot.transitions && shot.transitions[position]) {
        Object.assign(shot.transitions[position]!, {
          ...updates,
          appliedAt: Date.now()
        });
        shot.modified = true;
      }
    },
    // Keyframe actions
    togglePropertyKeyframes: (state, action: PayloadAction<{ shotId: string; layerId: string; property: string }>) => {
      const { shotId, layerId, property } = action.payload;
      const shot = state.shots.find((s) => s.id === shotId);
      if (shot) {
        const layer = shot.layers.find((l) => l.id === layerId);
        if (layer) {
          if (!layer.animations) layer.animations = {};
          if (layer.animations[property]) {
            delete layer.animations[property];
          } else {
            // Add initial keyframe with current value
            let initialValue = 0;
            if (property === 'opacity') initialValue = layer.opacity;
            else if (property.startsWith('transform.')) {
              const transformProperty = property.split('.')[1];
              const data = layer.data as MediaLayerData | TextLayerData;
              if (data.transform) {
                 if (transformProperty === 'rotation') initialValue = data.transform.rotation;
                 else if (transformProperty === 'position_x') initialValue = data.transform.position?.x || 0;
                 else if (transformProperty === 'position_y') initialValue = data.transform.position?.y || 0;
                 else if (transformProperty === 'scale_x') initialValue = data.transform.scale?.x || 1;
                 else if (transformProperty === 'scale_y') initialValue = data.transform.scale?.y || 1;
              }
            } else if (property === 'volume') {
               initialValue = (layer.data as AudioLayerData).volume || 1;
            }
            layer.animations[property] = [{ id: uuidv4(), time: 0, value: initialValue, easing: 'linear' }];
          }
        }
      }
    },
    addKeyframe: (state, action: PayloadAction<{ shotId: string; layerId: string; property: string; keyframe: TimelineKeyframe }>) => {
      const { shotId, layerId, property, keyframe } = action.payload;
      const shot = state.shots.find((s) => s.id === shotId);
      if (shot) {
        const layer = shot.layers.find((l) => l.id === layerId);
        if (layer) {
          if (!layer.animations) layer.animations = {};
          if (!layer.animations[property]) layer.animations[property] = [];
          
          // Add or update by ID or time
          const existingIndex = layer.animations[property].findIndex((k: TimelineKeyframe) => 
            (keyframe.id && k.id === keyframe.id) || k.time === keyframe.time
          );
          
          if (existingIndex !== -1) {
            layer.animations[property][existingIndex] = { 
              ...layer.animations[property][existingIndex], 
              ...keyframe,
              id: layer.animations[property][existingIndex].id // Preserve ID
            };
          } else {
            layer.animations[property].push({ ...keyframe, id: keyframe.id || uuidv4() });
            layer.animations[property].sort((a: TimelineKeyframe, b: TimelineKeyframe) => a.time - b.time);
          }
        }
      }
    },
    removeKeyframe: (state, action: PayloadAction<{ shotId: string; layerId: string; property: string; id: string }>) => {
      const { shotId, layerId, property, id } = action.payload;
      const shot = state.shots.find((s) => s.id === shotId);
      if (shot) {
        const layer = shot.layers.find((l) => l.id === layerId);
        if (layer && layer.animations && layer.animations[property]) {
          layer.animations[property] = layer.animations[property].filter((k: TimelineKeyframe) => k.id !== id);
        }
      }
    },
    updateKeyframe: (state, action: PayloadAction<{ shotId: string; layerId: string; property: string; id: string; updates: Partial<TimelineKeyframe> }>) => {
      const { shotId, layerId, property, id, updates } = action.payload;
      const shot = state.shots.find((s) => s.id === shotId);
      if (shot) {
        const layer = shot.layers.find((l) => l.id === layerId);
        if (layer && layer.animations && layer.animations[property]) {
          const index = layer.animations[property].findIndex((k: TimelineKeyframe) => k.id === id);
          if (index !== -1) {
            layer.animations[property][index] = { ...layer.animations[property][index], ...updates };
            // Sort in case time changed
            if (updates.time !== undefined) {
               layer.animations[property].sort((a: TimelineKeyframe, b: TimelineKeyframe) => a.time - b.time);
            }
          }
        }
      }
    },
    updateAudioSettings: (state, action: PayloadAction<{ shotId: string; settings: Partial<Shot['audioSettings']> }>) => {
      const { shotId, settings } = action.payload;
      const shot = state.shots.find((s) => s.id === shotId);
      if (shot) {
        if (!shot.audioSettings) {
          shot.audioSettings = { volume: 0, pan: 0 };
        }
        shot.audioSettings = { ...shot.audioSettings, ...settings };
        shot.modified = true;
      }
    },
    setActiveKeyframeEditor: (state, action: PayloadAction<TimelineState['activeKeyframeEditor']>) => {
      state.activeKeyframeEditor = action.payload;
    },
    setTimelineState: (state, action: PayloadAction<Partial<TimelineState>>) => {
      return { ...state, ...action.payload };
    },
    loadSequenceData: (state, action: PayloadAction<{ id: string; shots: Shot[]; duration: number }>) => {
      state.projectId = action.payload.id;
      state.shots = action.payload.shots;
      state.duration = action.payload.duration;
      state.playheadPosition = 0;
    },
  },
});

// Export actions
export const {
  setProjectId,
  addShot,
  updateShot,
  deleteShot,
  deleteMultipleShots,
  splitShot,
  setPlayheadPosition,
  setZoomLevel,
  setSelectedElements,
  selectElement,
  deselectElement,
  clearSelection,
  setDuration,
  setIsPlaying,
  addTrack,
  updateTrack,
  deleteTrack,
  reorderTracks,
  reorderShots,
  toggleTrackLock,
  toggleTrackHidden,
  shiftShots,
  rippleEdit,
  rollEdit,
  slipEdit,
  slideEdit,
  addShotLayer,
  updateShotLayer,
  deleteShotLayer,
  reorderShotLayers,
  addShotReference,
  setLayerOpacity,
  setLayerBlendMode,
  applyStyleToShot,
  applyStyleToMultipleShots,
  removeStyleFromShot,
  updateStyleIntensity,
  updateStyleParameters,
  addTransition,
  removeTransition,
  updateTransition,
  togglePropertyKeyframes,
  addKeyframe,
  removeKeyframe,
  updateKeyframe,
  updateAudioSettings,
  setActiveKeyframeEditor,
  setTimelineState,
  loadSequenceData,
} = timelineSlice.actions;

export default timelineSlice.reducer;
