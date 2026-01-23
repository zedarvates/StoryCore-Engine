import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

interface TimelineScrubberProps {
  currentTime: number;
  duration: number;
  zoom: number;
  isPlaying: boolean;
  onTimeChange: (time: number) => void;
  onPlayPause: () => void;
  onZoomChange: (zoom: number) => void;
  onFrameStep: (direction: 'forward' | 'backward') => void;
  loopEnabled?: boolean;
  onLoopToggle?: () => void;
}

export function TimelineScrubber({
  currentTime,
  duration,
  zoom,
  isPlaying,
  onTimeChange,
  onPlayPause,
  onZoomChange,
  onFrameStep,
  loopEnabled = false,
  onLoopToggle
}: TimelineScrubberProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartTime, setDragStartTime] = useState(0);
  const scrubberRef = useRef<HTMLDivElement>(null);

  // Format time as HH:MM:SS:FF (frames)
  const formatTime = useCallback((time: number) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    const frames = Math.floor((time % 1) * 30); // Assuming 30fps

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  }, []);

  // Handle scrubber click/drag
  const handleScrubberInteraction = useCallback((clientX: number) => {
    if (!scrubberRef.current) return;

    const rect = scrubberRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newTime = percentage * duration;

    onTimeChange(newTime);
  }, [duration, onTimeChange]);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragStartTime(currentTime);
    handleScrubberInteraction(e.clientX);
  }, [currentTime, handleScrubberInteraction]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      handleScrubberInteraction(e.clientX);
    }
  }, [isDragging, handleScrubberInteraction]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Global mouse events for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          onPlayPause();
          break;
        case 'ArrowLeft':
          if (e.shiftKey) {
            e.preventDefault();
            onFrameStep('backward');
          }
          break;
        case 'ArrowRight':
          if (e.shiftKey) {
            e.preventDefault();
            onFrameStep('forward');
          }
          break;
        case 'z':
        case 'Z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            // Toggle zoom (this could be enhanced with zoom to fit, etc.)
            onZoomChange(zoom === 1 ? 2 : 1);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onPlayPause, onFrameStep, onZoomChange, zoom]);

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="timeline-scrubber">
      {/* Time Display */}
      <div className="time-display">
        <span className="current-time">{formatTime(currentTime)}</span>
        <span className="separator">/</span>
        <span className="total-time">{formatTime(duration)}</span>
      </div>

      {/* Playback Controls */}
      <div className="playback-controls">
        <button
          className="control-btn"
          onClick={() => onTimeChange(0)}
          title="Go to Start (Home)"
        >
          <SkipBack size={16} />
        </button>

        <button
          className="control-btn frame-step"
          onClick={() => onFrameStep('backward')}
          title="Previous Frame (Shift+←)"
        >
          <SkipBack size={12} />
        </button>

        <button
          className="control-btn play-pause"
          onClick={onPlayPause}
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>

        <button
          className="control-btn frame-step"
          onClick={() => onFrameStep('forward')}
          title="Next Frame (Shift+→)"
        >
          <SkipForward size={12} />
        </button>

        <button
          className="control-btn"
          onClick={() => onTimeChange(duration)}
          title="Go to End (End)"
        >
          <SkipForward size={16} />
        </button>

        {onLoopToggle && (
          <button
            className={`control-btn loop-btn ${loopEnabled ? 'active' : ''}`}
            onClick={onLoopToggle}
            title="Loop Playback"
          >
            <RotateCcw size={14} />
          </button>
        )}
      </div>

      {/* Scrubber Bar */}
      <div className="scrubber-container">
        <div
          ref={scrubberRef}
          className="scrubber-bar"
          onMouseDown={handleMouseDown}
        >
          <div
            className="scrubber-progress"
            style={{ width: `${progressPercentage}%` }}
          />
          <div
            className="scrubber-handle"
            style={{ left: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="zoom-controls">
        <button
          className="zoom-btn"
          onClick={() => onZoomChange(Math.max(0.1, zoom - 0.1))}
          title="Zoom Out"
        >
          <ZoomOut size={14} />
        </button>

        <span className="zoom-level">{Math.round(zoom * 100)}%</span>

        <button
          className="zoom-btn"
          onClick={() => onZoomChange(Math.min(5, zoom + 0.1))}
          title="Zoom In"
        >
          <ZoomIn size={14} />
        </button>
      </div>
    </div>
  );
}