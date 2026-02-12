/**
 * Lottie Store
 * ME2: Lottie Integration - Support for Lottie animations
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { 
  LottieAnimation, 
  LottiePlaybackSettings, 
  LottieState,
  LottieConfig 
} from '../types/lottie';

interface LottieStore {
  // Animation state
  animations: Map<string, LottieAnimation>;
  activeAnimationId: string | null;
  
  // Playback state
  playback: LottiePlaybackSettings;
  state: LottieState;
  
  // Configuration
  config: Partial<LottieConfig>;
  
  // UI state
  isPanelOpen: boolean;
  selectedLayerId: string | null;
  
  // Actions
  loadAnimation: (animation: LottieAnimation) => void;
  unloadAnimation: (id: string) => void;
  setActiveAnimation: (id: string | null) => void;
  
  // Playback controls
  play: () => void;
  pause: () => void;
  stop: () => void;
  setFrame: (frame: number) => void;
  setProgress: (progress: number) => void;
  setSpeed: (speed: number) => void;
  setLoop: (loop: boolean) => void;
  setDirection: (direction: 'forward' | 'reverse') => void;
  
  // Configuration
  updateConfig: (config: Partial<LottieConfig>) => void;
  updatePlayback: (playback: Partial<LottiePlaybackSettings>) => void;
  
  // UI
  togglePanel: () => void;
  selectLayer: (layerId: string | null) => void;
  
  // State
  updateState: (state: Partial<LottieState>) => void;
}

const defaultPlayback: LottiePlaybackSettings = {
  autoplay: true,
  loop: true,
  loopCount: 0,
  speed: 1,
  direction: 'forward',
  startFrame: 0,
  endFrame: 0,
  goToFrame: 0,
};

const defaultState: LottieState = {
  currentFrame: 0,
  isPlaying: false,
  isLoaded: false,
  error: null,
  progress: 0,
};

export const useLottieStore = create<LottieStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    animations: new Map(),
    activeAnimationId: null,
    playback: { ...defaultPlayback },
    state: { ...defaultState },
    config: {},
    isPanelOpen: false,
    selectedLayerId: null,
    
    // Actions
    loadAnimation: (animation) => {
      const animations = new Map(get().animations);
      animations.set(animation.id, animation);
      set({
        animations,
        activeAnimationId: animation.id,
        state: {
          ...defaultState,
          isLoaded: true,
        },
      });
    },
    
    unloadAnimation: (id) => {
      const animations = new Map(get().animations);
      animations.delete(id);
      const activeId = get().activeAnimationId === id ? null : get().activeAnimationId;
      set({
        animations,
        activeAnimationId: activeId,
        state: activeId ? get().state : { ...defaultState },
      });
    },
    
    setActiveAnimation: (id) => {
      const animation = id ? get().animations.get(id) : null;
      set({
        activeAnimationId: id,
        state: animation ? { ...get().state, isLoaded: true } : { ...defaultState },
      });
    },
    
    // Playback controls
    play: () => set((state) => ({ state: { ...state.state, isPlaying: true } })),
    
    pause: () => set((state) => ({ state: { ...state.state, isPlaying: false } })),
    
    stop: () => set((state) => ({ 
      state: { ...state.state, isPlaying: false, currentFrame: 0, progress: 0 } 
    })),
    
    setFrame: (frame) => set((state) => {
      const animation = state.activeAnimationId 
        ? get().animations.get(state.activeAnimationId) 
        : null;
      const totalFrames = animation?.totalFrames || 0;
      const progress = totalFrames > 0 ? (frame / totalFrames) * 100 : 0;
      return { 
        state: { ...state.state, currentFrame: frame, progress } 
      };
    }),
    
    setProgress: (progress) => set((state) => {
      const animation = state.activeAnimationId 
        ? get().animations.get(state.activeAnimationId) 
        : null;
      const totalFrames = animation?.totalFrames || 0;
      const frame = Math.round((progress / 100) * totalFrames);
      return { 
        state: { ...state.state, progress, currentFrame: frame } 
      };
    }),
    
    setSpeed: (speed) => set((state) => ({ 
      playback: { ...state.playback, speed } 
    })),
    
    setLoop: (loop) => set((state) => ({ 
      playback: { ...state.playback, loop } 
    })),
    
    setDirection: (direction) => set((state) => ({ 
      playback: { ...state.playback, direction } 
    })),
    
    // Configuration
    updateConfig: (config) => set((state) => ({ 
      config: { ...state.config, ...config } 
    })),
    
    updatePlayback: (playback) => set((state) => ({ 
      playback: { ...state.playback, ...playback } 
    })),
    
    // UI
    togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),
    
    selectLayer: (layerId) => set({ selectedLayerId: layerId }),
    
    // State
    updateState: (newState) => set((state) => ({ 
      state: { ...state.state, ...newState } 
    })),
  }))
);
