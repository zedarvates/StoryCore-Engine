/**
 * PlaybackControls Component - Video playback controls UI
 * 
 * Provides playback controls including:
 * - Play/pause button
 * - Frame navigation (±1 frame, ±5 seconds)
 * - Time display
 * - Playback speed selector
 * - Loop and mute toggles
 * - Keyboard shortcuts
 * 
 * @module components/video/PlaybackControls
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useVideoPlayer } from '../../hooks/useVideoPlayer';
import { PlaybackRate, PLAYBACK_RATES } from '../../types/video';
import './PlaybackControls.css';

// ============================================
// Props
// ============================================

export interface PlaybackControlsProps {
  /** Video element to control */
  videoElement?: HTMLVideoElement | null;
  
  /** Whether to auto-initialize */
  autoInitialize?: boolean;
  
  /** Custom class name */
  className?: string;
  
  /** Show frame navigation buttons */
  showFrameNavigation?: boolean;
  
  /** Show playback speed selector */
  showSpeedSelector?: boolean;
  
  /** Show loop toggle */
  showLoopToggle?: boolean;
  
  /** Show mute toggle */
  showMuteToggle?: boolean;
  
  /** Show time display */
  showTimeDisplay?: boolean;
  
  /** Show progress bar */
  showProgressBar?: boolean;
  
  /** Custom time format */
  timeFormat?: 'time' | 'timecode' | 'frames';
  
  /** Compact mode */
  compact?: boolean;
  
  /** Callback when seek occurs */
  onSeek?: (time: number) => void;
  
  /** Callback when play state changes */
  onPlayStateChange?: (isPlaying: boolean) => void;
}

// ============================================
// Default Props
// ============================================

const DEFAULT_PROPS: Partial<PlaybackControlsProps> = {
  autoInitialize: true,
  showFrameNavigation: true,
  showSpeedSelector: true,
  showLoopToggle: true,
  showMuteToggle: true,
  showTimeDisplay: true,
  showProgressBar: true,
  timeFormat: 'timecode',
  compact: false,
};

// ============================================
// Icons
// ============================================

const Icons = {
  play: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  ),
  pause: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  ),
  stop: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 6h12v12H6z" />
    </svg>
  ),
  stepBackward: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z" />
    </svg>
  ),
  stepForward: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
    </svg>
  ),
  skipPrevious: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
    </svg>
  ),
  skipNext: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
    </svg>
  ),
  volumeUp: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
    </svg>
  ),
  volumeMute: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71z" />
    </svg>
  ),
  loop: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
    </svg>
  ),
  loopOne: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
    </svg>
  ),
  fullscreen: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
    </svg>
  ),
};

// ============================================
// Component
// ============================================

export const PlaybackControls: React.FC<PlaybackControlsProps> = (props) => {
  const {
    videoElement,
    autoInitialize,
    className,
    showFrameNavigation,
    showSpeedSelector,
    showLoopToggle,
    showMuteToggle,
    showTimeDisplay,
    showProgressBar,
    timeFormat,
    compact,
    onSeek,
    onPlayStateChange,
  } = { ...DEFAULT_PROPS, ...props };
  
  const {
    isPlaying,
    isMuted,
    isLooping,
    currentTime,
    duration,
    currentFrame,
    totalFrames,
    formattedTime,
    formattedTimecode,
    playbackRate,
    stop,
    togglePlay,
    seek,
    stepForward,
    stepBackward,
    setPlaybackRate,
    toggleMute,
    toggleLoop,
  } = useVideoPlayer(videoElement, autoInitialize);
  
  // Local state for progress bar
  const [progress, setProgress] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  
  // Update progress
  useEffect(() => {
    if (duration > 0 && !isSeeking) {
      const newProgress = (currentTime / duration) * 100;
      setProgress(newProgress);
    }
  }, [currentTime, duration, isSeeking]);
  
  // Handle play state change
  useEffect(() => {
    onPlayStateChange?.(isPlaying);
  }, [isPlaying, onPlayStateChange]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }
      
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (e.shiftKey) {
            stepBackward(5);
          } else {
            stepBackward(1);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (e.shiftKey) {
            stepForward(5);
          } else {
            stepForward(1);
          }
          break;
        case 'Home':
          e.preventDefault();
          seek(0);
          break;
        case 'End':
          e.preventDefault();
          seek(duration);
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          break;
        case 'l':
        case 'L':
          e.preventDefault();
          toggleLoop();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, stepForward, stepBackward, seek, toggleMute, toggleLoop, duration]);
  
  // Handle progress bar click
  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    seek(newTime);
    onSeek?.(newTime);
  }, [duration, seek, onSeek]);
  
  // Handle progress bar drag
  const handleProgressMouseDown = useCallback(() => {
    setIsSeeking(true);
  }, []);
  
  useEffect(() => {
    const handleMouseUp = () => {
      setIsSeeking(false);
    };
    
    if (isSeeking) {
      document.addEventListener('mouseup', handleMouseUp);
      return () => document.removeEventListener('mouseup', handleMouseUp);
    }
  }, [isSeeking]);
  
  // Handle speed change
  const handleSpeedChange = useCallback((rate: PlaybackRate) => {
    setPlaybackRate(rate);
    setShowSpeedMenu(false);
  }, [setPlaybackRate]);
  
  // Format display
  const formatDisplay = () => {
    if (timeFormat === 'timecode') {
      return formattedTimecode;
    } else if (timeFormat === 'frames') {
      return `${currentFrame} / ${totalFrames}`;
    }
    return formattedTime;
  };
  
  // Combined class names
  const containerClassName = [
    'playback-controls',
    compact ? 'playback-controls-compact' : '',
    className,
  ].filter(Boolean).join(' ');

  // Progress value for ARIA
  const progressValue = Math.round(progress);
  
  // ARIA string values for boolean states
  const ariaExpanded = showSpeedMenu ? 'true' : 'false';

  return (
    <div className={containerClassName} role="region" aria-label="Video playback controls">
      <style>{`
        .playback-progress {
          --progress-width: 0%;
          --progress-position: 0%;
        }
      `}</style>
        {/* Progress bar */}
        {showProgressBar && (
          <div
            className="playback-progress"
            onClick={handleProgressClick}
            onMouseDown={handleProgressMouseDown}
            role="slider"
            aria-label="Video progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={String(progressValue)}
            tabIndex={0}
          >
            <div
              className="playback-progress-bar"
            />
            <div
              className="playback-progress-thumb"
            />
          </div>
        )}
      
      {/* Main controls */}
      <div className="playback-controls-main">
        {/* Left section */}
        <div className="playback-controls-left">
          {/* Play/Pause button */}
          <button
            className="playback-btn playback-btn-primary"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? Icons.pause : Icons.play}
          </button>
          
          {/* Stop button */}
          <button
            className="playback-btn"
            onClick={stop}
            aria-label="Stop"
          >
            {Icons.stop}
          </button>
          
          {/* Frame navigation */}
          {showFrameNavigation && (
            <>
              <button
                className="playback-btn"
                onClick={() => stepBackward(1)}
                aria-label="Previous frame (Left arrow)"
              >
                {Icons.stepBackward}
              </button>
              <button
                className="playback-btn"
                onClick={() => stepForward(1)}
                aria-label="Next frame (Right arrow)"
              >
                {Icons.stepForward}
              </button>
            </>
          )}
          
          {/* Skip buttons */}
          <button
            className="playback-btn"
            onClick={() => seek(0)}
            aria-label="Skip to start (Home)"
          >
            {Icons.skipPrevious}
          </button>
          <button
            className="playback-btn"
            onClick={() => seek(duration)}
            aria-label="Skip to end (End)"
          >
            {Icons.skipNext}
          </button>
          
          {/* Mute/Volume */}
          {showMuteToggle && (
            <button
              className="playback-btn playback-btn-volume"
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute (M)' : 'Mute (M)'}
            >
              {isMuted ? Icons.volumeMute : Icons.volumeUp}
            </button>
          )}
        </div>
        
        {/* Center section - Time display */}
        {showTimeDisplay && (
          <div className="playback-controls-center">
            <span className="playback-time-current">
              {formatDisplay()}
            </span>
            <span className="playback-time-separator">/</span>
            <span className="playback-time-total">
              {timeFormat === 'timecode' 
                ? formattedTimecode.split('/')[1] || formattedTimecode
                : formattedTime}
            </span>
          </div>
        )}
        
        {/* Right section */}
        <div className="playback-controls-right">
          {/* Loop toggle */}
          {showLoopToggle && (
            <button
              className={`playback-btn ${isLooping ? 'playback-btn-active' : ''}`}
              onClick={toggleLoop}
              aria-label={isLooping ? 'Disable loop (L)' : 'Enable loop (L)'}
              aria-pressed={isLooping ? 'true' : 'false'}
            >
              {isLooping ? Icons.loopOne : Icons.loop}
            </button>
          )}
          
          {/* Playback speed */}
          {showSpeedSelector && (
            <div className="playback-speed">
              <button
                className="playback-btn playback-speed-btn"
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                aria-label={`Playback speed: ${playbackRate}x`}
                aria-expanded={ariaExpanded}
              >
                {playbackRate}x
              </button>
              
              {showSpeedMenu && (
                <div className="playback-speed-menu">
                  {PLAYBACK_RATES.map(rate => (
                    <button
                      key={rate}
                      className={`playback-speed-option ${rate === playbackRate ? 'playback-speed-option-active' : ''}`}
                      onClick={() => handleSpeedChange(rate)}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Fullscreen button */}
          <button
            className="playback-btn"
            aria-label="Fullscreen"
          >
            {Icons.fullscreen}
          </button>
        </div>
      </div>
      
      {/* Keyboard shortcuts hint */}
      {!compact && (
        <div className="playback-shortcuts">
          <span><kbd>Space</kbd> Play/Pause</span>
          <span><kbd>←</kbd><kbd>→</kbd> Frame</span>
          <span><kbd>Shift</kbd>+<kbd>←</kbd> -5s</span>
          <span><kbd>M</kbd> Mute</span>
          <span><kbd>L</kbd> Loop</span>
        </div>
      )}
    </div>
  );
};

export default PlaybackControls;

