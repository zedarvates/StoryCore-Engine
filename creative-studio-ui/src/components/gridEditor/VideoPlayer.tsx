/**
 * VideoPlayer - Advanced video player component with frame-accurate controls
 * Supports play/pause, seeking, timecode display, and frame-by-frame navigation
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

export interface VideoPlayerProps {
  src: string;
  className?: string;
  width?: number;
  height?: number;
  frameRate?: number; // frames per second
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onSeek?: (time: number) => void;
  onError?: (error: Error) => void;
  autoPlay?: boolean;
  controls?: boolean;
  showTimecode?: boolean;
  timecodeFormat?: 'frames' | 'seconds' | 'smpte';
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  className,
  width = 640,
  height = 360,
  frameRate = 30,
  onTimeUpdate,
  onDurationChange,
  onPlay,
  onPause,
  onSeek,
  onError,
  autoPlay = false,
  controls = true,
  showTimecode = true,
  timecodeFormat = 'smpte'
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(1);

  // Frame-accurate seeking
  const seekToTime = useCallback((time: number) => {
    if (videoRef.current) {
      const clampedTime = Math.max(0, Math.min(time, duration));
      videoRef.current.currentTime = clampedTime;
      setCurrentTime(clampedTime);
      onSeek?.(clampedTime);
    }
  }, [duration, onSeek]);

  const seekToFrame = useCallback((frame: number) => {
    const time = frame / frameRate;
    seekToTime(time);
  }, [frameRate, seekToTime]);

  const getCurrentFrame = useCallback(() => {
    return Math.round(currentTime * frameRate);
  }, [currentTime, frameRate]);

  const getTotalFrames = useCallback(() => {
    return Math.round(duration * frameRate);
  }, [duration, frameRate]);

  // Timecode formatting
  const formatTimecode = useCallback((time: number): string => {
    switch (timecodeFormat) {
      case 'frames':
        return `${getCurrentFrame()}/${getTotalFrames()}`;

      case 'seconds':
        return `${time.toFixed(2)}s / ${duration.toFixed(2)}s`;

      case 'smpte':
      default:
        const hours = Math.floor(time / 3600);
        const minutes = Math.floor((time % 3600) / 60);
        const seconds = Math.floor(time % 60);
        const frames = Math.floor((time % 1) * frameRate);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
    }
  }, [timecodeFormat, getCurrentFrame, getTotalFrames, duration, frameRate]);

  // Video event handlers
  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      onDurationChange?.(videoRef.current.duration);
      setIsLoading(false);
    }
  }, [onDurationChange]);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);
      onTimeUpdate?.(time);
    }
  }, [onTimeUpdate]);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    onPlay?.();
  }, [onPlay]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    onPause?.();
  }, [onPause]);

  const handleError = useCallback((e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const target = e.target as HTMLVideoElement;
    const error = target.error;
    const errorMessage = error?.message || 'Video loading failed';
    setError(errorMessage);
    setIsLoading(false);
    onError?.(new Error(errorMessage));
  }, [onError]);

  const handleCanPlay = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Control handlers
  const togglePlayPause = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  }, [isPlaying]);

  const handleSeek = useCallback((value: number[]) => {
    seekToTime(value[0]);
  }, [seekToTime]);

  const stepFrame = useCallback((direction: 'forward' | 'backward') => {
    const currentFrame = getCurrentFrame();
    const newFrame = direction === 'forward' ? currentFrame + 1 : currentFrame - 1;
    seekToFrame(Math.max(0, Math.min(newFrame, getTotalFrames())));
  }, [getCurrentFrame, getTotalFrames, seekToFrame]);

  const handleVolumeChange = useCallback((value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  }, []);

  // Initialize video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      if (autoPlay) {
        videoRef.current.play().catch(() => {
          // Autoplay failed, user interaction required
        });
      }
    }
  }, [volume, autoPlay]);

  // Reset state when src changes
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
  }, [src]);

  return (
    <div className={cn('relative bg-black rounded-lg overflow-hidden', className)}>
      <video
        ref={videoRef}
        src={src}
        width={width}
        height={height}
        className="w-full h-full object-contain"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        onError={handleError}
        onCanPlay={handleCanPlay}
        preload="metadata"
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="text-white">Loading video...</div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
          <div className="text-red-400 text-center p-4">
            <div className="font-semibold mb-2">Video Error</div>
            <div className="text-sm">{error}</div>
          </div>
        </div>
      )}

      {controls && !error && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
          {/* Progress bar */}
          <div className="mb-2">
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={1 / frameRate}
              onValueChange={handleSeek}
              className="w-full"
            />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePlayPause}
                className="text-white hover:bg-white/20"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => stepFrame('backward')}
                className="text-white hover:bg-white/20"
              >
                <SkipBack className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => stepFrame('forward')}
                className="text-white hover:bg-white/20"
              >
                <SkipForward className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center space-x-4">
              {/* Volume control */}
              <div className="flex items-center space-x-2">
                <span className="text-white text-xs">Vol</span>
                <Slider
                  value={[volume]}
                  max={1}
                  step={0.1}
                  onValueChange={handleVolumeChange}
                  className="w-16"
                />
              </div>

              {/* Timecode */}
              {showTimecode && (
                <div className="text-white text-sm font-mono">
                  {formatTimecode(currentTime)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
