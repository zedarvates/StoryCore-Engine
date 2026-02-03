/**
 * TimeRuler Component
 * 
 * Timeline ruler with configurable time markers and granularity.
 * Supports frames, seconds, and minutes display.
 * Includes click-to-seek functionality for quick playhead positioning.
 * 
 * Features:
 * - Click anywhere on ruler to seek to that position
 * - Configurable time format (frames/seconds/minutes)
 * - Snap-to-grid visual feedback
 * - Hover preview of timecode
 * 
 * Requirements: 1.8, 4.5, 4.6
 */

import React, { useCallback, useMemo, useState, useRef } from 'react';

interface TimeRulerProps {
  zoomLevel: number;
  duration: number;
  fps?: number;
  snapToGrid?: boolean;
  playheadPosition?: number;
  onSeek?: (frame: number) => void;
  onMarkerClick?: (frame: number) => void;
}

type TimeFormat = 'frames' | 'seconds' | 'minutes';

export const TimeRuler: React.FC<TimeRulerProps> = ({
  zoomLevel,
  duration,
  fps = 24,
  snapToGrid = true,
  playheadPosition = 0,
  onSeek,
  onMarkerClick,
}) => {
  const [timeFormat, setTimeFormat] = useState<TimeFormat>('seconds');
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  
  // Calculate marker interval based on zoom level
  const markerInterval = useMemo(() => {
    if (zoomLevel >= 50) {
      return 1; // Every frame
    } else if (zoomLevel >= 20) {
      return 5; // Every 5 frames
    } else if (zoomLevel >= 10) {
      return 10; // Every 10 frames (about 0.4 seconds)
    } else if (zoomLevel >= 5) {
      return 30; // Every 30 frames (about 1.25 seconds)
    } else {
      return 60; // Every 60 frames (about 2.5 seconds)
    }
  }, [zoomLevel]);
  
  // Major marker interval (every 10th marker)
  const majorInterval = useMemo(() => {
    if (zoomLevel >= 50) {
      return 10; // Every 10 frames
    } else if (zoomLevel >= 20) {
      return 30; // Every 30 frames
    } else {
      return 60; // Every 60 frames
    }
  }, [zoomLevel]);
  
  // Calculate total width
  const totalWidth = duration * zoomLevel;
  
  // Format timecode
  const formatTimecode = useCallback((frame: number): string => {
    const totalSeconds = Math.floor(frame / fps);
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60);
    const frameNum = frame % fps;
    
    if (timeFormat === 'frames') {
      return `${frameNum}`;
    } else if (timeFormat === 'minutes') {
      return `${minutes}:00`;
    } else {
      return `${minutes}:${String(seconds).padStart(2, '0')}`;
    }
  }, [fps, timeFormat]);
  
  // Generate markers
  const markers = useMemo(() => {
    const result: { frame: number; position: number; isMajor: boolean; label: string }[] = [];
    const numMarkers = Math.ceil(duration / markerInterval);
    
    for (let frame = 0; frame <= numMarkers * markerInterval; frame += markerInterval) {
      if (frame > duration) break;
      
      const isMajor = frame % majorInterval === 0;
      const label = formatTimecode(frame);
      
      result.push({
        frame,
        position: frame * zoomLevel,
        isMajor,
        label,
      });
    }
    
    return result;
  }, [duration, markerInterval, majorInterval, zoomLevel, formatTimecode]);
  
  // Handle marker click
  const handleMarkerClick = useCallback((frame: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onMarkerClick) {
      onMarkerClick(frame);
    }
    if (onSeek) {
      onSeek(frame);
    }
  }, [onMarkerClick, onSeek]);
  
  // Handle ruler click for seek
  const handleRulerClick = useCallback((e: React.MouseEvent) => {
    if (!rulerRef.current || !onSeek) return;
    
    const rect = rulerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const frame = Math.round(x / zoomLevel);
    
    // Clamp to valid range
    const clampedFrame = Math.max(0, Math.min(frame, duration));
    onSeek(clampedFrame);
  }, [zoomLevel, duration, onSeek]);
  
  // Handle mouse move for hover preview
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!rulerRef.current) return;
    
    const rect = rulerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const frame = Math.round(x / zoomLevel);
    
    setHoverPosition(Math.max(0, Math.min(frame, duration)));
  }, [zoomLevel, duration]);
  
  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setHoverPosition(null);
  }, []);
  
  // Toggle time format on double-click
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const formats: TimeFormat[] = ['seconds', 'frames', 'minutes'];
    const currentIndex = formats.indexOf(timeFormat);
    const nextIndex = (currentIndex + 1) % formats.length;
    setTimeFormat(formats[nextIndex]);
  }, [timeFormat]);
  
  // Calculate hover timecode
  const hoverTimecode = useMemo(() => {
    if (hoverPosition === null) return null;
    return formatTimecode(hoverPosition);
  }, [hoverPosition, formatTimecode]);
  
  return (
    <div 
      ref={rulerRef}
      className={`timeline-ruler ${snapToGrid ? 'snap-grid-active' : ''}`}
      style={{ width: totalWidth }}
      onClick={handleRulerClick}
      onDoubleClick={handleDoubleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      role="slider"
      aria-label="Time ruler - click to seek"
      aria-valuenow={playheadPosition}
      aria-valuemin={0}
      aria-valuemax={duration}
      tabIndex={0}
      title="Click to seek, double-click to change time format"
    >
      {/* Markers */}
      {markers.map((marker) => (
        <div
          key={`marker-${marker.frame}`}
          className={`timeline-ruler-marker ${marker.isMajor ? 'major' : 'minor'}`}
          style={{ left: marker.position }}
          onClick={(e) => handleMarkerClick(marker.frame, e)}
          role="button"
          aria-label={`Go to ${marker.label}`}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleMarkerClick(marker.frame, e as any);
            }
          }}
        >
          {marker.isMajor && (
            <span className="timeline-ruler-label">
              {marker.label}
            </span>
          )}
        </div>
      ))}
      
      {/* Hover preview indicator */}
      {hoverPosition !== null && (
        <div 
          className="ruler-hover-indicator"
          style={{ left: hoverPosition * zoomLevel }}
        >
          <div className="ruler-hover-line" />
          <div className="ruler-hover-tooltip">
            {hoverTimecode}
          </div>
        </div>
      )}
      
      {/* Current playhead position indicator */}
      <div 
        className="ruler-playhead-indicator"
        style={{ left: playheadPosition * zoomLevel }}
      />
      
      {/* Format indicator tooltip */}
      <div className="ruler-format-hint" title="Double-click to change format">
        {timeFormat === 'seconds' && '⏱️ Seconds'}
        {timeFormat === 'frames' && '🎬 Frames'}
        {timeFormat === 'minutes' && '⏰ Minutes'}
      </div>
    </div>
  );
};

// Export utility functions
export { formatTimecodeFromFrames, formatDurationFromFrames };

function formatTimecodeFromFrames(frames: number, fps: number = 24): string {
  const totalSeconds = Math.floor(frames / fps);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);
  const frameNum = frames % fps;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(frameNum).padStart(2, '0')}`;
}

function formatDurationFromFrames(frames: number, fps: number = 24): string {
  const totalSeconds = Math.floor(frames / fps);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export default TimeRuler;

