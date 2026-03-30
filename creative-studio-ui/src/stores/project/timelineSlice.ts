import { StateCreator } from 'zustand';
import { UnifiedProjectStore } from './types';
import { logger as Logger } from '@/utils/logger';
import { generateId } from '@/utils/idGenerator';
import type { Shot } from '@/types';
import type { Track, TimelineMarker } from '@/sequence-editor/types';

/**
 * Creates the Timeline Slice for the Unified Project Store
 * Handles shots, playback state, and current time.
 */
export const createTimelineSlice: StateCreator<
  UnifiedProjectStore,
  [],
  [],
  Partial<UnifiedProjectStore>
> = (set, get) => ({
  // Timeline Data
  shots: [],
  selectedShotId: null,
  currentTime: 0,
  
  // Timeline UI State (Audit Task 5 & 21)
  tracks: [
    { id: 'track-1', type: 'media', height: 120, locked: false, hidden: false, color: '#4A90E2', icon: 'film' },
    { id: 'track-2', type: 'media', height: 120, locked: false, hidden: false, color: '#4A90E2', icon: 'film' },
    { id: 'track-3', type: 'audio', height: 60, locked: false, hidden: false, color: '#50E3C2', icon: 'music' },
  ],
  zoomLevel: 10,
  selectedElements: [],
  timelineDuration: 2400, // 100 seconds at 24fps
  markers: [],
  
  // NLE Interaction Modes (Audit Task 5)
  snapMode: true,
  rippleMode: false,
  magneticMode: false,
  
  // Tools (Task 21 bridge)
  activeTool: 'select',
  toolSettings: {},
  
  // Playback
  isPlaying: false,
  playbackSpeed: 1,

  /**
   * Actions
   */
  setShots: (shots: Shot[]) => set((_state) => {
    Logger.debug(`📦 [ProjectStore] Setting ${shots.length} shots`);
    const updatedProject = _state.project ? { ..._state.project, shots } : null;
    return { shots, project: updatedProject };
  }),

  addShot: (shot: Shot, skipHistory = false) => {
    const previousStateSnapshot = { shots: get().shots };
    
    set((state) => {
      const newShots = [...state.shots, shot];
      const updatedProject = state.project ? { ...state.project, shots: newShots } : null;
      return { shots: newShots, project: updatedProject };
    });
    
    if (!skipHistory) {
      get().pushHistory({
        id: generateId(),
        timestamp: Date.now(),
        action: `Add Shot: ${shot.name || shot.id}`,
        previousState: previousStateSnapshot,
        nextState: { shots: get().shots }
      });
    }
  },

  updateShot: (id: string, updates: Partial<Shot>, skipHistory = false) => {
    const previousStateSnapshot = { shots: get().shots };
    
    set((state) => {
      const updatedShots = state.shots.map((shot) =>
        shot.id === id ? { ...shot, ...updates } : shot
      );
      const updatedProject = state.project ? { ...state.project, shots: updatedShots } : null;
      return { shots: updatedShots, project: updatedProject };
    });
    
    if (!skipHistory) {
      get().pushHistory({
        id: generateId(),
        timestamp: Date.now(),
        action: `Update Shot: ${id}`,
        previousState: previousStateSnapshot,
        nextState: { shots: get().shots }
      });
    }
  },

  deleteShot: (id: string, skipHistory = false) => {
    const previousShots = get().shots;
    const previousSelected = get().selectedShotId;
    
    set((state) => {
      const filteredShots = state.shots.filter((shot) => shot.id !== id);
      const updatedProject = state.project ? { ...state.project, shots: filteredShots } : null;
      return {
        shots: filteredShots,
        selectedShotId: state.selectedShotId === id ? null : state.selectedShotId,
        project: updatedProject,
      };
    });
    
    if (!skipHistory) {
      get().pushHistory({
        id: generateId(),
        timestamp: Date.now(),
        action: `Delete Shot: ${id}`,
        previousState: { shots: previousShots, selectedShotId: previousSelected },
        nextState: { shots: get().shots, selectedShotId: get().selectedShotId }
      });
    }
  },

  reorderShots: (shots: Shot[], skipHistory = false) => {
    const previousShots = get().shots;
    
    // Update positions based on new order
    const updatedShots = shots.map((shot, index) => {
      // If we are in a sequential/magnetic mode, we might want to update startTime too
      // but for now let's just update the internal position index
      return { ...shot, position: index };
    });
    
    set((state) => {
      const updatedProject = state.project ? { ...state.project, shots: updatedShots } : null;
      return { shots: updatedShots, project: updatedProject };
    });
    
    if (!skipHistory) {
      get().pushHistory({
        id: generateId(),
        timestamp: Date.now(),
        action: 'Reorder Shots',
        previousState: { shots: previousShots },
        nextState: { shots: get().shots }
      });
    }
  },

  setSelectedShotId: (id: string | null) => set({ selectedShotId: id }),
  
  setCurrentTime: (time: number) => set({ currentTime: time }),

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  stop: () => set({ isPlaying: false, currentTime: 0 }),
  setPlaybackSpeed: (speed: number) => set({ playbackSpeed: speed }),
  
  // Timeline UI Setters (Audit Task 5 & 21)
  setTracks: (tracks: Track[]) => set({ tracks }),
  setZoomLevel: (zoomLevel: number) => set({ zoomLevel }),
  setSelectedElements: (selectedElements: string[]) => set({ selectedElements }),
  setTimelineDuration: (timelineDuration: number) => set({ timelineDuration }),
  setMarkers: (markers: TimelineMarker[]) => set({ markers }),
  
  // Track Management
  addTrack: (track: Track) => {
    const prevState = { tracks: get().tracks };
    set((state) => ({ tracks: [...state.tracks, track] }));
    get().pushHistory({
      id: generateId(),
      timestamp: Date.now(),
      action: `Add Track: ${track.id}`,
      previousState: prevState,
      nextState: { tracks: get().tracks }
    });
  },
  updateTrack: (id: string, updates: Partial<Track>) => set((state) => ({
    tracks: state.tracks.map(t => t.id === id ? { ...t, ...updates } : t)
  })),
  deleteTrack: (id: string) => {
    const prevState = { tracks: get().tracks };
    set((state) => ({
      tracks: state.tracks.filter(t => t.id !== id)
    }));
    get().pushHistory({
      id: generateId(),
      timestamp: Date.now(),
      action: `Delete Track: ${id}`,
      previousState: prevState,
      nextState: { tracks: get().tracks }
    });
  },
  reorderTracks: (tracks: Track[]) => {
    const prevState = { tracks: get().tracks };
    set({ tracks });
    get().pushHistory({
      id: generateId(),
      timestamp: Date.now(),
      action: 'Reorder Tracks',
      previousState: prevState,
      nextState: { tracks: get().tracks }
    });
  },
  toggleTrackLock: (id: string) => set((state) => ({
    tracks: state.tracks.map(t => t.id === id ? { ...t, locked: !t.locked } : t)
  })),
  toggleTrackHidden: (id: string) => set((state) => ({
    tracks: state.tracks.map(t => t.id === id ? { ...t, hidden: !t.hidden } : t)
  })),

  // Tools (Task 21 bridge)
  setActiveTool: (activeTool: string) => set({ activeTool }),
  updateToolSettings: (updates: Record<string, unknown>) => set((state) => ({
    toolSettings: { ...state.toolSettings, ...updates }
  })),

  // Mode Toggles
  toggleSnapToGrid: () => set((state) => ({ snapMode: !state.snapMode })),
  toggleRippleEdit: () => set((state) => ({ rippleMode: !state.rippleMode })),
  toggleMagneticTimeline: () => set((state) => ({ magneticMode: !state.magneticMode })),

  // Complex NLE Edits (Audit Task 5)
  // Simplified implementations for initial migration
  rippleEdit: ({ shotId, delta, edge }) => {
    const shots = get().shots;
    const shot = shots.find(s => s.id === shotId);
    if (!shot) return;

    const prevState = { shots: get().shots };
    
    set((state) => {
      const updatedShots = state.shots.map(s => {
        if (s.id === shotId) {
          return edge === 'start' 
            ? { ...s, startTime: s.startTime - delta, duration: s.duration + delta }
            : { ...s, duration: s.duration + delta };
        }
        // Shift subsequent shots if ripple is enabled
        if (s.startTime >= shot.startTime + shot.duration) {
            return { ...s, startTime: s.startTime + delta };
        }
        return s;
      });
      return { shots: updatedShots };
    });

    get().pushHistory({
      id: generateId(),
      timestamp: Date.now(),
      action: `Ripple Edit: ${shotId}`,
      previousState: prevState,
      nextState: { shots: get().shots }
    });
  },

  rollEdit: ({ shotAId, shotBId, delta }) => {
    const prevState = { shots: get().shots };
    set((state) => ({
      shots: state.shots.map(s => {
        if (s.id === shotAId) return { ...s, duration: s.duration + delta };
        if (s.id === shotBId) return { ...s, startTime: s.startTime + delta, duration: s.duration - delta };
        return s;
      })
    }));

    get().pushHistory({
      id: generateId(),
      timestamp: Date.now(),
      action: `Roll Edit: ${shotAId}/${shotBId}`,
      previousState: prevState,
      nextState: { shots: get().shots }
    });
  },

  slipEdit: ({ shotId, delta }) => {
    // In our model, slip might affect mediaStart if we added it, but for now just log or shift internal position if supported
    Logger.debug(`[ProjectStore] Slip edit on ${shotId} by ${delta}`);
  },

  slideEdit: ({ shotId, delta }) => {
    const prevState = { shots: get().shots };
    set((state) => ({
      shots: state.shots.map(s => {
        if (s.id === shotId) return { ...s, startTime: s.startTime + delta };
        return s;
      })
    }));

    get().pushHistory({
      id: generateId(),
      timestamp: Date.now(),
      action: `Slide Edit: ${shotId}`,
      previousState: prevState,
      nextState: { shots: get().shots }
    });
  },
});
