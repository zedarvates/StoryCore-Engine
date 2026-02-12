/**
 * React Hook for Audio Mixing
 * 
 * Provides a convenient React hook for integrating audio mixing
 * into StoryCore components with automatic lifecycle management.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AudioTrack,
  AudioTrackState,
  AudioEffect,
  DuckingConfig,
  CrossfadeConfig,
  SyncConfig,
  AudioMixingState,
  ExportOptions
} from '../services/audio-mixing/AudioMixingTypes';
import {
  audioMixingService,
  defaultDuckingConfig,
  defaultCrossfadeConfig,
  defaultSyncConfig
} from '../services/audio-mixing/AudioMixingService';

// ============================================================================
// Hook Return Type
// ============================================================================

interface UseAudioMixingReturn {
  // State
  state: AudioMixingState;
  trackStates: Map<string, AudioTrackState>;
  
  // Initialization
  initialize: () => Promise<void>;
  dispose: () => void;
  isReady: boolean;
  
  // Track Management
  addTrack: (track: Omit<AudioTrack, 'id' | 'order'>) => string;
  removeTrack: (id: string) => void;
  updateTrack: (id: string, updates: Partial<AudioTrack>) => void;
  reorderTracks: (trackIds: string[]) => void;
  duplicateTrack: (id: string) => string;
  
  // Playback Control
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setMasterVolume: (volume: number) => void;
  setMasterMuted: (muted: boolean) => void;
  
  // Track Control
  setTrackVolume: (id: string, volume: number) => void;
  setTrackPan: (id: string, pan: number) => void;
  setTrackMuted: (id: string, muted: boolean) => void;
  setTrackSolo: (id: string, solo: boolean) => void;
  setTrackFadeIn: (id: string, duration: number) => void;
  setTrackFadeOut: (id: string, duration: number) => void;
  
  // Effects Management
  addEffect: (trackId: string, effect: Omit<AudioEffect, 'id' | 'order'>) => void;
  removeEffect: (trackId: string, effectId: string) => void;
  updateEffect: (trackId: string, effectId: string, updates: Partial<AudioEffect>) => void;
  reorderEffects: (trackId: string, effectIds: string[]) => void;
  
  // Ducking
  setDucking: (config: DuckingConfig) => void;
  disableDucking: () => void;
  
  // Crossfade
  setCrossfade: (config: CrossfadeConfig) => void;
  setCrossfadeProgress: (progress: number) => void;
  
  // Synchronization
  setSync: (config: SyncConfig) => void;
  
  // Recording
  startRecording: () => void;
  stopRecording: () => void;
  
  // Export
  exportMix: (format: 'wav' | 'mp3' | 'ogg', options?: ExportOptions) => Promise<Blob>;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useAudioMixing(): UseAudioMixingReturn {
  // State
  const [state, setState] = useState<AudioMixingState>(audioMixingService.getState());
  const [trackStates, setTrackStates] = useState<Map<string, AudioTrackState>>(new Map());
  const [isReady, setIsReady] = useState(false);
  
  // ==========================================================================
  // Event Handlers
  // ==========================================================================

  useEffect(() => {
    const handleUpdate = () => {
      setState(audioMixingService.getState());
    };

    const handlePlaybackStarted = () => {
      setState(prev => ({ ...prev, isPlaying: true }));
    };

    const handlePlaybackPaused = () => {
      setState(prev => ({ ...prev, isPlaying: false }));
    };

    const handlePlaybackStopped = () => {
      setState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
    };

    const handleSeeked = (_time: number) => {
      setState(prev => ({ ...prev, currentTime: _time }));
    };

    const handleTimeUpdate = (_time: number) => {
      setState(prev => ({ ...prev, currentTime: _time }));
    };

    const handleError = (error: string) => {
      setState(prev => ({ ...prev, error }));
    };

    // Subscribe to events
    audioMixingService.on('track:added', handleUpdate as () => void);
    audioMixingService.on('playback:started', handlePlaybackStarted as () => void);
    audioMixingService.on('playback:paused', handlePlaybackPaused as () => void);
    audioMixingService.on('playback:stopped', handlePlaybackStopped as () => void);
    audioMixingService.on('playback:seeked', handleSeeked as (time: number) => void);
    audioMixingService.on('timeupdate', handleTimeUpdate as (time: number) => void);
    audioMixingService.on('error', handleError as (error: string) => void);

    return () => {
      audioMixingService.off('track:added', handleUpdate as () => void);
      audioMixingService.off('playback:started', handlePlaybackStarted as () => void);
      audioMixingService.off('playback:paused', handlePlaybackPaused as () => void);
      audioMixingService.off('playback:stopped', handlePlaybackStopped as () => void);
      audioMixingService.off('playback:seeked', handleSeeked as (time: number) => void);
      audioMixingService.off('timeupdate', handleTimeUpdate as (time: number) => void);
      audioMixingService.off('error', handleError as (error: string) => void);
    };
  }, []);

  // ==========================================================================
  // Sync State Periodically
  // ==========================================================================

  useEffect(() => {
    const interval = setInterval(() => {
      setState(audioMixingService.getState());
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // ==========================================================================
  // Initialization
  // ==========================================================================

  const initialize = useCallback(async () => {
    await audioMixingService.initialize();
    setIsReady(true);
  }, []);

  const dispose = useCallback(() => {
    audioMixingService.dispose();
    setIsReady(false);
  }, []);

  // ==========================================================================
  // Track Management
  // ==========================================================================

  const addTrack = useCallback((track: Omit<AudioTrack, 'id' | 'order'>) => {
    return audioMixingService.addTrack(track);
  }, []);

  const removeTrack = useCallback((id: string) => {
    audioMixingService.removeTrack(id);
  }, []);

  const updateTrack = useCallback((id: string, updates: Partial<AudioTrack>) => {
    audioMixingService.updateTrack(id, updates);
  }, []);

  const reorderTracks = useCallback((trackIds: string[]) => {
    audioMixingService.reorderTracks(trackIds);
  }, []);

  const duplicateTrack = useCallback((id: string) => {
    return audioMixingService.duplicateTrack(id);
  }, []);

  // ==========================================================================
  // Playback Control
  // ==========================================================================

  const play = useCallback(async () => {
    await audioMixingService.play();
  }, []);

  const pause = useCallback(() => {
    audioMixingService.pause();
  }, []);

  const stop = useCallback(() => {
    audioMixingService.stop();
  }, []);

  const seek = useCallback((time: number) => {
    audioMixingService.seek(time);
  }, []);

  const setMasterVolume = useCallback((volume: number) => {
    audioMixingService.setMasterVolume(volume);
  }, []);

  const setMasterMuted = useCallback((muted: boolean) => {
    audioMixingService.setMasterMuted(muted);
  }, []);

  // ==========================================================================
  // Track Control
  // ==========================================================================

  const setTrackVolume = useCallback((id: string, volume: number) => {
    audioMixingService.setTrackVolume(id, volume);
  }, []);

  const setTrackPan = useCallback((id: string, pan: number) => {
    audioMixingService.setTrackPan(id, pan);
  }, []);

  const setTrackMuted = useCallback((id: string, muted: boolean) => {
    audioMixingService.setTrackMuted(id, muted);
  }, []);

  const setTrackSolo = useCallback((id: string, solo: boolean) => {
    audioMixingService.setTrackSolo(id, solo);
  }, []);

  const setTrackFadeIn = useCallback((id: string, duration: number) => {
    audioMixingService.setTrackFadeIn(id, duration);
  }, []);

  const setTrackFadeOut = useCallback((id: string, duration: number) => {
    audioMixingService.setTrackFadeOut(id, duration);
  }, []);

  // ==========================================================================
  // Effects Management
  // ==========================================================================

  const addEffect = useCallback((trackId: string, effect: Omit<AudioEffect, 'id' | 'order'>) => {
    audioMixingService.addEffect(trackId, effect);
  }, []);

  const removeEffect = useCallback((trackId: string, effectId: string) => {
    audioMixingService.removeEffect(trackId, effectId);
  }, []);

  const updateEffect = useCallback((trackId: string, effectId: string, updates: Partial<AudioEffect>) => {
    audioMixingService.updateEffect(trackId, effectId, updates);
  }, []);

  const reorderEffects = useCallback((trackId: string, effectIds: string[]) => {
    audioMixingService.reorderEffects(trackId, effectIds);
  }, []);

  // ==========================================================================
  // Ducking
  // ==========================================================================

  const setDucking = useCallback((config: DuckingConfig) => {
    audioMixingService.setDucking(config);
  }, []);

  const disableDucking = useCallback(() => {
    audioMixingService.disableDucking();
  }, []);

  // ==========================================================================
  // Crossfade
  // ==========================================================================

  const setCrossfade = useCallback((config: CrossfadeConfig) => {
    audioMixingService.setCrossfade(config);
  }, []);

  const setCrossfadeProgress = useCallback((progress: number) => {
    audioMixingService.setCrossfadeProgress(progress);
  }, []);

  // ==========================================================================
  // Synchronization
  // ==========================================================================

  const setSync = useCallback((config: SyncConfig) => {
    audioMixingService.setSync(config);
  }, []);

  // ==========================================================================
  // Recording
  // ==========================================================================

  const startRecording = useCallback(() => {
    audioMixingService.startRecording();
  }, []);

  const stopRecording = useCallback(() => {
    audioMixingService.stopRecording();
  }, []);

  // ==========================================================================
  // Export
  // ==========================================================================

  const exportMix = useCallback(async (format: 'wav' | 'mp3' | 'ogg', options?: ExportOptions) => {
    return audioMixingService.exportMix(format, options);
  }, []);

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    state,
    trackStates,
    initialize,
    dispose,
    isReady,
    addTrack,
    removeTrack,
    updateTrack,
    reorderTracks,
    duplicateTrack,
    play,
    pause,
    stop,
    seek,
    setMasterVolume,
    setMasterMuted,
    setTrackVolume,
    setTrackPan,
    setTrackMuted,
    setTrackSolo,
    setTrackFadeIn,
    setTrackFadeOut,
    addEffect,
    removeEffect,
    updateEffect,
    reorderEffects,
    setDucking,
    disableDucking,
    setCrossfade,
    setCrossfadeProgress,
    setSync,
    startRecording,
    stopRecording,
    exportMix
  };
}

// ============================================================================
// Hook for Individual Track
// ============================================================================

export function useAudioTrack(trackId: string) {
  const [track, setTrack] = useState<AudioTrack | null>(null);
  const [trackState, setTrackState] = useState<AudioTrackState | null>(null);

  useEffect(() => {
    const state = audioMixingService.getState();
    setTrack(state.tracks.get(trackId) || null);
    setTrackState(audioMixingService.getTrackState(trackId) || null);

    const handleUpdate = () => {
      const newState = audioMixingService.getState();
      setTrack(newState.tracks.get(trackId) || null);
      setTrackState(audioMixingService.getTrackState(trackId) || null);
    };

    audioMixingService.on('track:added', handleUpdate as () => void);

    return () => {
      audioMixingService.off('track:added', handleUpdate as () => void);
    };
  }, [trackId]);

  return { track, trackState };
}

// ============================================================================
// Hook for Ducking State
// ============================================================================

export function useDucking() {
  const [duckingState, setDuckingState] = useState(audioMixingService.getDuckingState());

  useEffect(() => {
    const interval = setInterval(() => {
      setDuckingState(audioMixingService.getDuckingState());
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return duckingState;
}

// ============================================================================
// Hook for Crossfade State
// ============================================================================

export function useCrossfade() {
  const [crossfadeState, setCrossfadeState] = useState(audioMixingService.getCrossfadeState());

  useEffect(() => {
    const interval = setInterval(() => {
      setCrossfadeState(audioMixingService.getCrossfadeState());
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return crossfadeState;
}

// ============================================================================
// Default Exports
// ============================================================================

export { defaultDuckingConfig, defaultCrossfadeConfig, defaultSyncConfig };
export default useAudioMixing;
