import { useEffect, useRef, useState } from 'react';
import { getAudioEngine, AudioEngine } from '../audio/AudioEngine';
import type { AudioTrack } from '../types';

/**
 * React hook for using the AudioEngine
 */
export function useAudioEngine() {
  const engineRef = useRef<AudioEngine | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Get or create audio engine instance
    engineRef.current = getAudioEngine();

    // Resume audio context (required for some browsers)
    engineRef.current.resumeContext().then(() => {
      setIsReady(true);
    });

    return () => {
      // Don't destroy the engine on unmount - it's a singleton
      // It will be destroyed when the app closes
    };
  }, []);

  const loadTrack = async (track: AudioTrack) => {
    if (!engineRef.current) return;
    await engineRef.current.loadTrack(track);
  };

  const play = (trackId: string, startTime?: number) => {
    if (!engineRef.current) return;
    engineRef.current.play(trackId, startTime);
  };

  const pause = (trackId: string) => {
    if (!engineRef.current) return;
    engineRef.current.pause(trackId);
  };

  const resume = (trackId: string) => {
    if (!engineRef.current) return;
    engineRef.current.resume(trackId);
  };

  const stop = (trackId: string) => {
    if (!engineRef.current) return;
    engineRef.current.stop(trackId);
  };

  const setVolume = (trackId: string, volume: number) => {
    if (!engineRef.current) return;
    engineRef.current.setVolume(trackId, volume);
  };

  const setPan = (trackId: string, pan: number) => {
    if (!engineRef.current) return;
    engineRef.current.setPan(trackId, pan);
  };

  const applyFades = (trackId: string, fadeIn: number, fadeOut: number, duration: number) => {
    if (!engineRef.current) return;
    engineRef.current.applyFades(trackId, fadeIn, fadeOut, duration);
  };

  const unloadTrack = (trackId: string) => {
    if (!engineRef.current) return;
    engineRef.current.unloadTrack(trackId);
  };

  const setMasterVolume = (volume: number) => {
    if (!engineRef.current) return;
    engineRef.current.setMasterVolume(volume);
  };

  const isPlaying = (trackId: string): boolean => {
    if (!engineRef.current) return false;
    return engineRef.current.isPlaying(trackId);
  };

  const getCurrentTime = (trackId: string): number => {
    if (!engineRef.current) return 0;
    return engineRef.current.getCurrentTime(trackId);
  };

  return {
    isReady,
    loadTrack,
    play,
    pause,
    resume,
    stop,
    setVolume,
    setPan,
    applyFades,
    unloadTrack,
    setMasterVolume,
    isPlaying,
    getCurrentTime,
  };
}

/**
 * Hook for managing a single audio track
 */
export function useAudioTrack(track: AudioTrack) {
  const audioEngine = useAudioEngine();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load track when URL changes
  useEffect(() => {
    if (!track.url || !audioEngine.isReady) return;

    setIsLoaded(false);
    setError(null);

    audioEngine
      .loadTrack(track)
      .then(() => {
        setIsLoaded(true);
      })
      .catch((err) => {
        console.error('Error loading audio track:', err);
        setError(err.message || 'Failed to load audio');
      });

    return () => {
      // Unload track on unmount
      audioEngine.unloadTrack(track.id);
    };
  }, [track.url, track.id, audioEngine.isReady]);

  // Update volume when it changes
  useEffect(() => {
    if (!isLoaded) return;
    audioEngine.setVolume(track.id, track.volume);
  }, [track.volume, isLoaded, track.id]);

  // Update pan when it changes
  useEffect(() => {
    if (!isLoaded) return;
    audioEngine.setPan(track.id, track.pan);
  }, [track.pan, isLoaded, track.id]);

  // Apply fades when they change
  useEffect(() => {
    if (!isLoaded || !isPlaying) return;
    audioEngine.applyFades(track.id, track.fadeIn, track.fadeOut, track.duration);
  }, [track.fadeIn, track.fadeOut, track.duration, isLoaded, isPlaying, track.id]);

  const play = () => {
    if (!isLoaded) return;
    audioEngine.play(track.id, track.offset);
    setIsPlaying(true);
  };

  const pause = () => {
    if (!isLoaded) return;
    audioEngine.pause(track.id);
    setIsPlaying(false);
  };

  const resume = () => {
    if (!isLoaded) return;
    audioEngine.resume(track.id);
    setIsPlaying(true);
  };

  const stop = () => {
    if (!isLoaded) return;
    audioEngine.stop(track.id);
    setIsPlaying(false);
  };

  return {
    isLoaded,
    isPlaying,
    error,
    play,
    pause,
    resume,
    stop,
  };
}
