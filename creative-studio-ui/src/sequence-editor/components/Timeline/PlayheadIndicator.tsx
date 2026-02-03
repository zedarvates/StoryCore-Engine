/**
 * Playhead Indicator Component
 * 
 * Enhanced draggable playhead with smooth scrubbing, snap-to-frame behavior,
 * timecode display, click-to-seek, and keyboard navigation support.
 * 
 * Features:
 * - Draggable playhead with smooth scrubbing
 * - Click-to-seek on timeline ruler
 * - Vertical line indicator across all tracks
 * - Timecode tooltip during scrubbing
 * - Keyboard navigation (arrow keys, Home/End, Page Up/Down)
 * 
 * Requirements: 1.8, 3.2, 4.5, 4.6
 */

import React, { useCallback, useRef, useEffect, useState } from 'react';

interface PlayheadIndicatorProps {
  position: number;
  height: number;
  zoomLevel: number;
  fps?: number;
  isDragging: boolean;
  isPlaying?: boolean;
  snapToGrid?: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onPositionChange: (position: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export const PlayheadIndicator: React.FC<PlayheadIndicatorProps> = ({
  position,
  height,
  zoomLevel,
  fps = 24,
  isDragging,
  isPlaying = false,
  snapToGrid = true,
  onMouseDown,
  onPositionChange,
  onDragStart,
  onDragEnd,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const dragStartTimeRef = useRef<number>(0);
  
  // Calculate frame from position
  const frameFromPosition = useCallback((pos: number): number => {
    const frame = pos / zoomLevel;
    if (snapToGrid) {
      return Math.round(frame);
    }
    return Math.floor(frame);
  }, [zoomLevel, snapToGrid]);
  
  // Calculate position from frame
  const positionFromFrame = useCallback((frame: number): number => {
    return frame * zoomLevel;
  }, [zoomLevel]);
  
  // Format timecode from frame
  const formatTimecode = useCallback((frame: number): string => {
    const totalSeconds = Math.floor(frame / fps);
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60);
    const frameNum = frame % fps;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(frameNum).padStart(2, '0')}`;
  }, [fps]);
  
  // Format duration from frames
  const formatDuration = useCallback((frame: number): string => {
    const totalSeconds = Math.floor(frame / fps);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }, [fps]);
  
  const currentFrame = frameFromPosition(position);
  const timecode = formatTimecode(currentFrame);
  const totalFrames = Math.round(height / zoomLevel);
  const duration = formatDuration(totalFrames);
  
  // Show tooltip when hovering or dragging
  useEffect(() => {
    if (isHovered || isDragging) {
      setShowTooltip(true);
    } else {
      // Delay hiding tooltip slightly for better UX
      const timer = setTimeout(() => setShowTooltip(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isHovered, isDragging]);
  
  // Handle drag start
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    dragStartTimeRef.current = Date.now();
    if (onDragStart) {
      onDragStart();
    }
    onMouseDown(e);
  }, [onMouseDown, onDragStart]);
  
  // Handle drag end
  useEffect(() => {
    if (!isDragging && dragStartTimeRef.current > 0) {
      const dragDuration = Date.now() - dragStartTimeRef.current;
      dragStartTimeRef.current = 0;
      
      // Only call onDragEnd if it was actually a drag (not just a click)
      if (dragDuration > 100 && onDragEnd) {
        onDragEnd();
      }
    }
  }, [isDragging, onDragEnd]);
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isDragging) return;
      
      let delta = 0;
      
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          delta = e.shiftKey ? -10 : -1; // Shift for 10 frames, normal for 1
          break;
        case 'ArrowRight':
          e.preventDefault();
          delta = e.shiftKey ? 10 : 1;
          break;
        case 'Home':
          e.preventDefault();
          onPositionChange(0);
          return;
        case 'End':
          e.preventDefault();
          onPositionChange(positionFromFrame(Math.round(height / zoomLevel)));
          return;
        case 'PageUp':
          e.preventDefault();
          delta = fps; // 1 second
          break;
        case 'PageDown':
          e.preventDefault();
          delta = -fps; // -1 second
          break;
      }
      
      if (delta !== 0) {
        const newFrame = Math.max(0, currentFrame + delta);
        onPositionChange(positionFromFrame(newFrame));
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDragging, currentFrame, height, zoomLevel, fps, onPositionChange, positionFromFrame]);
  
  return (
    <div
      className={`playhead-indicator ${isDragging ? 'dragging' : ''} ${isPlaying ? 'playing' : ''} ${isHovered ? 'hovered' : ''}`}
      style={{
        left: position,
        height,
      }}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="slider"
      aria-label="Playhead position"
      aria-valuenow={currentFrame}
      aria-valuemin={0}
      aria-valuemax={Math.round(height / zoomLevel)}
      tabIndex={0}
    >
      {/* Playhead handle with timecode */}
      <div className={`playhead-handle ${isHovered || isDragging ? 'hovered' : ''}`}>
        <div className="playhead-handle-top" />
        
        {/* Timecode tooltip - shown during hover or drag */}
        {showTooltip && (
          <div className="playhead-tooltip">
            <div className="playhead-tooltip-timecode">{timecode}</div>
            <div className="playhead-tooltip-info">
              <span>Frame: {currentFrame}</span>
              <span>Total: {duration}</span>
            </div>
            {isDragging && (
              <div className="playhead-tooltip-hint">
                {snapToGrid ? '🔒 Snapped' : '🔓 Free'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Playhead line - vertical indicator across all tracks */}
      <div className="playhead-line" style={{ height }}>
        {/* Add subtle gradient for better visibility */}
        <div className="playhead-line-glow" />
      </div>
      
      {/* Current frame indicator on line */}
      <div 
        className="playhead-frame-marker"
        style={{ bottom: 0 }}
        title={`Frame ${currentFrame}`}
      />
      
      {/* Playing indicator */}
      {isPlaying && (
        <div className="playhead-playing-indicator">
          <span className="playing-dot" />
          <span className="playing-text">PLAY</span>
        </div>
      )}
      
      {/* Scrubbing indicator */}
      {isDragging && !isPlaying && (
        <div className="playhead-scrubbing-indicator">
          <span className="scrubbing-icon">⏩</span>
          <span className="scrubbing-text">SCRUB</span>
        </div>
      )}
    </div>
  );
};

// Export utility functions
export { formatTimecodeFromPosition };

function formatTimecodeFromPosition(pixels: number, fps: number = 24, zoomLevel: number = 1): string {
  const frame = Math.round(pixels / zoomLevel);
  const totalSeconds = Math.floor(frame / fps);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);
  const frames = frame % fps;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
}

export default PlayheadIndicator;

