/**
 * useVideoPlayer Hook - React hook for video playback
 * 
 * Provides easy access to VideoPlayerService functionality
 * with React state integration.
 * 
 * @module hooks/useVideoPlayer
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { VideoPlayerService } from '../services/video/VideoPlayerService';
import {
  PlaybackStatus,
  PlaybackRate,
  FrameInfo,
  PLAYBACK_RATES,
  PlaybackState,
} from '../types/video';

// ============================================
// Hook Return Type
// ============================================

export interface UseVideoPlayerReturn {
  // Status
  status: PlaybackStatus;
  currentTime: number;
  currentFrame: number;
  duration: number;
  totalFrames: number;
  currentFps: number;
  droppedFrames: number;
  formattedTime: string;
  formattedTimecode: string;
  frameInfo: FrameInfo;
  
  // State checks
  isPlaying: boolean;
  isMuted: boolean;
  isLooping: boolean;
  isReady: boolean;
  isLoaded: boolean;
  isBuffering: boolean;
  hasError: boolean;
  errorMessage?: string;
  
  // Controls
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  togglePlay: () => Promise<void>;
  seek: (time: number) => Promise<void>;
  seekToFrame: (frame: number) => Promise<void>;
  stepForward: (frames?: number) => Promise<void>;
  stepBackward: (frames?: number) => Promise<void>;
  setPlaybackRate: (rate: PlaybackRate) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleLoop: () => void;
  
  // Service
  service: VideoPlayerService | null;
  videoElement: HTMLVideoElement | null;
  
  // Direct access to service methods
  getTotalFrames: () => number;
  getCurrentFps: () => number;
  
  // Playback rate
  playbackRate: PlaybackRate;
}

// ============================================
// Hook
// ============================================

export function useVideoPlayer(
  videoElement?: HTMLVideoElement | null,
  autoInitialize: boolean = true
): UseVideoPlayerReturn {
  // Service reference
  const serviceRef = useRef<VideoPlayerService | null>(null);
  
  // State
  const [status, setStatus] = useState<PlaybackStatus>({
    state: 'idle',
    currentTime: 0,
    currentFrame: 0,
    duration: 0,
    totalFrames: 0,
    playbackRate: 1,
    isMuted: false,
    isLooping: false,
    volume: 1,
    bufferProgress: 0,
    isBuffering: false,
  });
  
  const [currentFps, setCurrentFps] = useState(30);
  const [droppedFrames, setDroppedFrames] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  
  // Initialize service
  useEffect(() => {
    if (!serviceRef.current) {
      serviceRef.current = new VideoPlayerService();
    }
    
    return () => {
      if (serviceRef.current) {
        serviceRef.current.destroy();
        serviceRef.current = null;
      }
    };
  }, []);
  
  
  // Initialize with video element
  useEffect(() => {
    const service = serviceRef.current;
    if (!service || !videoElement || !autoInitialize) {
      return;
    }
    
    // Check if already initialized with same element
    if (service.isLoaded() && service.getVideoElement() === videoElement) {
      return;
    }
    
    // Clear error
    setErrorMessage(undefined);
    
    // Initialize service with video element
    service.initialize(videoElement);
    
    // Set up event listeners with proper type casting
    const handleStateChange = (data: unknown) => {
      const state = data as PlaybackState;
      setStatus(prev => ({ ...prev, state }));
    };
    
    const handleTimeUpdate = (data: unknown) => {
      const time = data as number;
      setStatus(prev => ({ ...prev, currentTime: time }));
    };
    
    const handleFrameUpdate = (data: unknown) => {
      const frame = data as number;
      setStatus(prev => ({ ...prev, currentFrame: frame }));
    };
    
    const handleBuffering = (data: unknown) => {
      const isBuffering = data as boolean;
      setStatus(prev => ({ ...prev, isBuffering }));
    };
    
    const handleRateChange = (data: unknown) => {
      const rate = data as PlaybackRate;
      setStatus(prev => ({ ...prev, playbackRate: rate }));
    };
    
    const handleVolumeChange = (data: unknown) => {
      const volume = data as number;
      setStatus(prev => ({ ...prev, volume }));
    };
    
    const handleMutedChange = (data: unknown) => {
      const isMuted = data as boolean;
      setStatus(prev => ({ ...prev, isMuted }));
    };
    
    const handleLoopChange = (data: unknown) => {
      const isLooping = data as boolean;
      setStatus(prev => ({ ...prev, isLooping }));
    };
    
    const handleFpsUpdate = (data: unknown) => {
      setCurrentFps(data as number);
    };
    
    const handleDroppedFrame = (data: unknown) => {
      setDroppedFrames(data as number);
    };
    
    const handleError = (data: unknown) => {
      const error = data as { message?: string };
      setErrorMessage(error.message);
    };
    
    service.on('state:change', handleStateChange);
    service.on('time:update', handleTimeUpdate);
    service.on('frame:update', handleFrameUpdate);
    service.on('buffer:update', handleBuffering);
    service.on('rate:change', handleRateChange);
    service.on('volume:change', handleVolumeChange);
    service.on('muted:change', handleMutedChange);
    service.on('loop:change', handleLoopChange);
    service.on('fps:update', handleFpsUpdate);
    service.on('dropped:frame', handleDroppedFrame);
    service.on('error', handleError);
    
    // Sync initial state
    setStatus(service.getStatus());
    
    // Cleanup
    return () => {
      service.off('state:change', handleStateChange);
      service.off('time:update', handleTimeUpdate);
      service.off('frame:update', handleFrameUpdate);
      service.off('buffer:update', handleBuffering);
      service.off('rate:change', handleRateChange);
      service.off('volume:change', handleVolumeChange);
      service.off('muted:change', handleMutedChange);
      service.off('loop:change', handleLoopChange);
      service.off('fps:update', handleFpsUpdate);
      service.off('dropped:frame', handleDroppedFrame);
      service.off('error', handleError);
    };
  }, [videoElement, autoInitialize]);
  
  // Get service
  const service = serviceRef.current;
  
  // Computed values
  const isPlaying = status.state === 'playing';
  const isMuted = status.isMuted;
  const isLooping = status.isLooping;
  const isReady = status.state === 'ready' || status.state === 'playing';
  const isLoaded = !!videoElement && service?.isLoaded();
  const isBuffering = status.isBuffering;
  const hasError = status.state === 'error';
  const formattedTime = service?.getFormattedTime() || '00:00';
  const formattedTimecode = service?.getFormattedTimecode() || '00:00:00:00';
  const frameInfo = service?.getCurrentFrameInfo() || {
    frameNumber: 0,
    timestamp: 0,
    width: 0,
    height: 0,
  };
  
  // Direct access methods
  const getTotalFrames = useCallback(() => {
    return service?.getTotalFrames() || 0;
  }, [service]);
  
  const getCurrentFpsValue = useCallback(() => {
    return service?.getCurrentFps() || 30;
  }, [service]);
  
  // Control functions
  const play = useCallback(async () => {
    await service?.play();
  }, [service]);
  
  const pause = useCallback(() => {
    service?.pause();
  }, [service]);
  
  const stop = useCallback(() => {
    service?.stop();
  }, [service]);
  
  const togglePlay = useCallback(async () => {
    await service?.togglePlay();
  }, [service]);
  
  const seek = useCallback(async (time: number) => {
    await service?.seek(time);
  }, [service]);
  
  const seekToFrame = useCallback(async (frame: number) => {
    await service?.seekToFrame(frame);
  }, [service]);
  
  const stepForward = useCallback(async (frames?: number) => {
    await service?.stepForward(frames);
  }, [service]);
  
  const stepBackward = useCallback(async (frames?: number) => {
    await service?.stepBackward(frames);
  }, [service]);
  
  const setPlaybackRate = useCallback((rate: PlaybackRate) => {
    service?.setPlaybackRate(rate);
  }, [service]);
  
  const setVolume = useCallback((volume: number) => {
    service?.setVolume(volume);
  }, [service]);
  
  const toggleMute = useCallback(() => {
    service?.toggleMute();
  }, [service]);
  
  const toggleLoop = useCallback(() => {
    service?.toggleLoop();
  }, [service]);
  
  return {
    // Status
    status,
    currentTime: status.currentTime,
    currentFrame: status.currentFrame,
    duration: status.duration,
    totalFrames: status.totalFrames,
    currentFps,
    droppedFrames,
    formattedTime,
    formattedTimecode,
    frameInfo,
    
    // State checks
    isPlaying,
    isMuted,
    isLooping,
    isReady,
    isLoaded: isLoaded || false,
    isBuffering,
    hasError,
    errorMessage,
    
    // Playback rate
    playbackRate: status.playbackRate as PlaybackRate,
    
    // Controls
    play,
    pause,
    stop,
    togglePlay,
    seek,
    seekToFrame,
    stepForward,
    stepBackward,
    setPlaybackRate,
    setVolume,
    toggleMute,
    toggleLoop,
    
    // Service
    service,
    videoElement: videoElement || null,
    
    // Direct access
    getTotalFrames,
    getCurrentFps: getCurrentFpsValue,
  };
}

// ============================================
// Shorthand Hooks
// ============================================

/**
 * Hook for video playback with default settings
 */
export function useVideoPlayback(videoElement?: HTMLVideoElement | null) {
  return useVideoPlayer(videoElement, true);
}

/**
 * Hook for controlling video playback without auto-initialization
 */
export function useVideoControl(videoElement?: HTMLVideoElement | null) {
  return useVideoPlayer(videoElement, false);
}

// ============================================
// Utility Hooks
// ============================================

/**
 * Hook for frame-accurate video navigation
 */
export function useFrameNavigation(videoElement?: HTMLVideoElement | null) {
  const { seekToFrame, stepForward, stepBackward, getTotalFrames, currentFrame } = useVideoPlayer(videoElement);
  
  const goToFirstFrame = useCallback(() => {
    seekToFrame(0);
  }, [seekToFrame]);
  
  const goToLastFrame = useCallback(() => {
    const totalFrames = getTotalFrames();
    if (totalFrames > 0) {
      seekToFrame(totalFrames - 1);
    }
  }, [seekToFrame, getTotalFrames]);
  
  const goToNextFrame = useCallback(() => {
    stepForward(1);
  }, [stepForward]);
  
  const goToPrevFrame = useCallback(() => {
    stepBackward(1);
  }, [stepBackward]);
  
  const canGoNext = useCallback(() => {
    return currentFrame < getTotalFrames() - 1;
  }, [currentFrame, getTotalFrames]);
  
  const canGoPrev = useCallback(() => {
    return currentFrame > 0;
  }, [currentFrame]);
  
  return {
    goToFirstFrame,
    goToLastFrame,
    goToNextFrame,
    goToPrevFrame,
    seekToFrame,
    stepForward,
    stepBackward,
    canGoNext,
    canGoPrev,
  };
}

/**
 * Hook for video playback rate control
 */
export function usePlaybackRate(videoElement?: HTMLVideoElement | null) {
  const { setPlaybackRate, getCurrentFps, status } = useVideoPlayer(videoElement);
  
  const availableRates = PLAYBACK_RATES;
  
  const setSlowMotion = useCallback(() => {
    setPlaybackRate(0.25);
  }, [setPlaybackRate]);
  
  const setHalfSpeed = useCallback(() => {
    setPlaybackRate(0.5);
  }, [setPlaybackRate]);
  
  const setNormalSpeed = useCallback(() => {
    setPlaybackRate(1);
  }, [setPlaybackRate]);
  
  const setDoubleSpeed = useCallback(() => {
    setPlaybackRate(2);
  }, [setPlaybackRate]);
  
  const setQuadrupleSpeed = useCallback(() => {
    setPlaybackRate(4);
  }, [setPlaybackRate]);
  
  return {
    availableRates,
    currentRate: status.playbackRate,
    currentFps: getCurrentFps(),
    setSlowMotion,
    setHalfSpeed,
    setNormalSpeed,
    setDoubleSpeed,
    setQuadrupleSpeed,
    setPlaybackRate,
  };
}

