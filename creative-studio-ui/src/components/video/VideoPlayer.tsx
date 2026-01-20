import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';
import { PlaybackSpeedControl } from './PlaybackSpeedControl';
import type { Shot } from '@/types';

export interface VideoPlayerProps {
  shot: Shot;
  autoPlay?: boolean;
  controls?: boolean;
  onTimeUpdate?: (time: number) => void;
  onEnded?: () => void;
  playbackRate?: number;
  onPlaybackRateChange?: (rate: number) => void;
  className?: string;
}

export interface VideoPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  buffered: TimeRanges | null;
  error: Error | null;
  isLoading: boolean;
  isMuted: boolean;
  volume: number;
  isFullscreen: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  shot,
  autoPlay = false,
  controls = true,
  onTimeUpdate,
  onEnded,
  playbackRate = 1.0,
  onPlaybackRateChange,
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [state, setState] = useState<VideoPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    buffered: null,
    error: null,
    isLoading: true,
    isMuted: false,
    volume: 100,
    isFullscreen: false,
  });

  const [currentPlaybackRate, setCurrentPlaybackRate] = useState(playbackRate);

  // Format time as HH:MM:SS.mmm
  const formatTimecode = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds
      .toString()
      .padStart(3, '0')}`;
  }, []);

  // Calculate frame number based on framerate (assuming 30fps default)
  const getFrameNumber = useCallback((time: number, framerate: number = 30): number => {
    return Math.floor(time * framerate);
  }, []);

  // Seek to specific frame
  const seekToFrame = useCallback((frameNumber: number, framerate: number = 30) => {
    if (!videoRef.current) return;
    const time = frameNumber / framerate;
    videoRef.current.currentTime = time;
  }, []);

  // Generate thumbnail at specific time
  const generateThumbnail = useCallback(async (time: number): Promise<Blob | null> => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Seek to time
    video.currentTime = time;

    return new Promise((resolve) => {
      const handleSeeked = () => {
        // Draw video frame to canvas
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert canvas to blob
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/jpeg', 0.8);

        video.removeEventListener('seeked', handleSeeked);
      };

      video.addEventListener('seeked', handleSeeked);
    });
  }, []);

  // Play/Pause toggle
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;

    if (state.isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  }, [state.isPlaying]);

  // Seek forward/backward
  const seek = useCallback((seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(
      0,
      Math.min(videoRef.current.duration, videoRef.current.currentTime + seconds)
    );
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setState((prev) => ({ ...prev, isMuted: !prev.isMuted }));
  }, []);

  // Set volume
  const setVolume = useCallback((volume: number) => {
    if (!videoRef.current) return;
    const clampedVolume = Math.max(0, Math.min(100, volume));
    videoRef.current.volume = clampedVolume / 100;
    setState((prev) => ({ ...prev, volume: clampedVolume }));
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setState((prev) => ({ ...prev, isFullscreen: true }));
    } else {
      document.exitFullscreen();
      setState((prev) => ({ ...prev, isFullscreen: false }));
    }
  }, []);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setState((prev) => ({
        ...prev,
        duration: video.duration,
        isLoading: false,
      }));
    };

    const handleTimeUpdate = () => {
      setState((prev) => ({
        ...prev,
        currentTime: video.currentTime,
        buffered: video.buffered,
      }));
      onTimeUpdate?.(video.currentTime);
    };

    const handlePlay = () => {
      setState((prev) => ({ ...prev, isPlaying: true }));
    };

    const handlePause = () => {
      setState((prev) => ({ ...prev, isPlaying: false }));
    };

    const handleEnded = () => {
      setState((prev) => ({ ...prev, isPlaying: false }));
      onEnded?.();
    };

    const handleError = () => {
      setState((prev) => ({
        ...prev,
        error: new Error('Failed to load video'),
        isLoading: false,
      }));
    };

    const handleWaiting = () => {
      setState((prev) => ({ ...prev, isLoading: true }));
    };

    const handleCanPlay = () => {
      setState((prev) => ({ ...prev, isLoading: false }));
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [onTimeUpdate, onEnded]);

  // Set playback rate
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = currentPlaybackRate;
    }
  }, [currentPlaybackRate]);

  // Handle playback rate change
  const handlePlaybackRateChange = useCallback((rate: number) => {
    setCurrentPlaybackRate(rate);
    onPlaybackRateChange?.(rate);
  }, [onPlaybackRateChange]);

  // Auto play
  useEffect(() => {
    if (autoPlay && videoRef.current && !state.error) {
      videoRef.current.play().catch((err) => {
        console.error('Auto-play failed:', err);
      });
    }
  }, [autoPlay, state.error]);

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setState((prev) => ({
        ...prev,
        isFullscreen: !!document.fullscreenElement,
      }));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seek(-5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seek(5);
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, seek, toggleMute, toggleFullscreen]);

  // Render error state
  if (state.error) {
    return (
      <div className={`relative bg-gray-900 flex items-center justify-center ${className}`}>
        <div className="text-center p-8">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-300 mb-2">
            Erreur de chargement vidéo
          </h3>
          <p className="text-sm text-gray-400">
            Impossible de charger la vidéo pour ce plan.
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Vérifiez que le fichier existe et est dans un format supporté.
          </p>
        </div>
      </div>
    );
  }

  // Render placeholder if no video
  if (!shot.image && !shot.metadata?.videoUrl) {
    return (
      <div className={`relative bg-gray-900 flex items-center justify-center ${className}`}>
        <div className="text-center p-8">
          <div className="text-gray-600 text-6xl mb-4">🎬</div>
          <h3 className="text-lg font-semibold text-gray-300 mb-2">
            Aucune vidéo disponible
          </h3>
          <p className="text-sm text-gray-400">
            Ce plan ne contient pas de vidéo.
          </p>
        </div>
      </div>
    );
  }

  const videoUrl = shot.metadata?.videoUrl || shot.image;

  return (
    <div ref={containerRef} className={`relative bg-black ${className}`}>
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        src={videoUrl}
        playsInline
      />

      {/* Hidden canvas for thumbnail generation */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Loading Overlay */}
      {state.isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      )}

      {/* Controls */}
      {controls && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
          {/* Progress Bar */}
          <div className="mb-3">
            <input
              type="range"
              min="0"
              max={state.duration || 100}
              value={state.currentTime}
              onChange={(e) => {
                if (videoRef.current) {
                  videoRef.current.currentTime = parseFloat(e.target.value);
                }
              }}
              className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${
                  (state.currentTime / state.duration) * 100
                }%, #4b5563 ${(state.currentTime / state.duration) * 100}%, #4b5563 100%)`,
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            {/* Left Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => seek(-5)}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
                title="Reculer 5s"
              >
                <SkipBack className="w-5 h-5 text-white" />
              </button>

              <button
                onClick={togglePlay}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
                title={state.isPlaying ? 'Pause' : 'Lecture'}
              >
                {state.isPlaying ? (
                  <Pause className="w-6 h-6 text-white" />
                ) : (
                  <Play className="w-6 h-6 text-white" />
                )}
              </button>

              <button
                onClick={() => seek(5)}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
                title="Avancer 5s"
              >
                <SkipForward className="w-5 h-5 text-white" />
              </button>

              {/* Volume Control */}
              <div className="flex items-center gap-2 ml-2">
                <button
                  onClick={toggleMute}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
                  title={state.isMuted ? 'Activer le son' : 'Couper le son'}
                >
                  {state.isMuted ? (
                    <VolumeX className="w-5 h-5 text-white" />
                  ) : (
                    <Volume2 className="w-5 h-5 text-white" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={state.volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* Center - Timecode */}
            <div className="flex items-center gap-2 text-white text-sm font-mono">
              <span>{formatTimecode(state.currentTime)}</span>
              <span className="text-gray-400">/</span>
              <span className="text-gray-400">{formatTimecode(state.duration)}</span>
              <span className="text-gray-500 ml-2">
                Frame: {getFrameNumber(state.currentTime)}
              </span>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2">
              {/* Playback Speed Control */}
              <PlaybackSpeedControl
                currentSpeed={currentPlaybackRate}
                onSpeedChange={handlePlaybackRateChange}
              />

              <button
                onClick={toggleFullscreen}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
                title={state.isFullscreen ? 'Quitter plein écran' : 'Plein écran'}
              >
                {state.isFullscreen ? (
                  <Minimize className="w-5 h-5 text-white" />
                ) : (
                  <Maximize className="w-5 h-5 text-white" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
