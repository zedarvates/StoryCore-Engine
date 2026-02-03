/**
 * Minimap Component
 * 
 * Overview of the entire timeline sequence with a viewport indicator
 * showing the currently visible region. Allows quick navigation by
 * dragging the viewport or clicking on the overview.
 * 
 * Requirements: 16.6, 16.7, 16.8
 */

import React, { useCallback, useRef, useEffect, useState } from 'react';
import type { Track, Shot } from '../../types';

interface MinimapProps {
  tracks: Track[];
  shots: Shot[];
  zoomLevel: number;
  scrollLeft: number;
  containerWidth: number;
  timelineWidth: number;
  totalTracksHeight: number;
  onViewportChange: (viewportX: number, viewportWidth: number) => void;
  visibleShots?: Shot[]; // For highlighting visible shots
}

export const Minimap: React.FC<MinimapProps> = ({
  tracks,
  shots,
  zoomLevel,
  scrollLeft,
  containerWidth,
  timelineWidth,
  totalTracksHeight,
  onViewportChange,
  visibleShots,
}) => {
  const minimapRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [viewportStart, setViewportStart] = useState(0);
  
  // Calculate minimap dimensions
  const MINIMAP_HEIGHT = 80;
  const MINIMAP_WIDTH = 200;
  const HEIGHT_SCALE = totalTracksHeight > 0 
    ? MINIMAP_HEIGHT / totalTracksHeight 
    : 1;
  
  // Calculate visible region on minimap
  const viewportWidth = Math.max(20, containerWidth / zoomLevel * (timelineWidth / containerWidth));
  const viewportX = scrollLeft / zoomLevel * (MINIMAP_WIDTH / timelineWidth) * containerWidth;

  // Handle click on minimap to jump to position
  const handleMinimapClick = useCallback((e: React.MouseEvent) => {
    if (!minimapRef.current || isDragging) return;
    
    const rect = minimapRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    // Convert minimap position to timeline position
    const timelinePosition = (x / rect.width) * timelineWidth;
    const newScrollLeft = Math.max(0, Math.min(timelineWidth - containerWidth, 
      timelinePosition - containerWidth / 2));
    
    onViewportChange(newScrollLeft, containerWidth);
  }, [isDragging, timelineWidth, containerWidth, onViewportChange]);

  // Handle viewport drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStartX(e.clientX);
    setViewportStart(scrollLeft);
  }, [scrollLeft]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !minimapRef.current) return;
    
    const rect = minimapRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragStartX;
    const deltaTimeline = (deltaX / rect.width) * timelineWidth;
    
    const newScrollLeft = Math.max(0, Math.min(timelineWidth - containerWidth, viewportStart + deltaTimeline));
    onViewportChange(newScrollLeft, containerWidth);
  }, [isDragging, dragStartX, timelineWidth, containerWidth, viewportStart, onViewportChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add/remove global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Calculate shot positions for minimap
  const getShotStyle = (shot: Shot) => {
    const left = (shot.startTime / timelineWidth) * 100;
    const width = (shot.duration / timelineWidth) * 100;
    const trackColor = getTrackColor(shot);
    
    return {
      left: `${left}%`,
      width: `${width}%`,
      backgroundColor: trackColor,
    };
  };

  // Get track color for a shot
  const getTrackColor = (shot: Shot): string => {
    const mediaLayer = shot.layers.find(l => l.type === 'media');
    if (mediaLayer) {
      const trackColors: Record<string, string> = {
        media: '#4A90E2',
        audio: '#50C878',
        effects: '#9B59B6',
        transitions: '#E67E22',
        text: '#F39C12',
        keyframes: '#E74C3C',
      };
      return trackColors[mediaLayer.type] || '#666';
    }
    return '#666';
  };

  // Filter visible tracks
  const visibleTracks = tracks.filter(t => !t.hidden);
  
  // Calculate track heights for minimap
  const trackHeightPercentage = visibleTracks.length > 0
    ? (1 / visibleTracks.length) * 100
    : 10;

  return (
    <div className="minimap-container">
      <div className="minimap-header">
        <span className="minimap-title">Minimap</span>
        <span className="minimap-info">
          {Math.round((containerWidth / timelineWidth) * 100)}% visible
        </span>
      </div>
      
      <div
        ref={minimapRef}
        className={`minimap-canvas ${isDragging ? 'dragging' : ''}`}
        onClick={handleMinimapClick}
        style={{ height: MINIMAP_HEIGHT }}
        role="slider"
        aria-label="Timeline navigation minimap"
        aria-valuenow={scrollLeft}
        aria-valuemin={0}
        aria-valuemax={timelineWidth - containerWidth}
        tabIndex={0}
      >
        {/* Tracks overview */}
        <div className="minimap-tracks">
          {visibleTracks.map((track, index) => (
            <div
              key={track.id}
              className="minimap-track"
              style={{
                height: `${Math.max(HEIGHT_SCALE * track.height, 3)}px`,
                top: `${visibleTracks.slice(0, index).reduce((sum, t) => sum + HEIGHT_SCALE * t.height, 0)}px`,
                backgroundColor: track.color + '30',
              }}
            />
          ))}
        </div>

        {/* Shots overview */}
        <div className="minimap-shots">
          {shots.map((shot) => {
            const isVisible = visibleShots?.includes(shot);
            return (
              <div
                key={shot.id}
                className={`minimap-shot ${isVisible ? 'visible' : ''}`}
                style={getShotStyle(shot)}
                title={shot.name}
              />
            );
          })}
        </div>

        {/* Visible region indicator (viewport) */}
        <div
          className={`minimap-viewport ${isDragging ? 'dragging' : ''}`}
          style={{
            left: `${(scrollLeft / timelineWidth) * 100}%`,
            width: `${(containerWidth / timelineWidth) * 100}%`,
          }}
          onMouseDown={handleMouseDown}
        >
          <div className="viewport-handle left" />
          <div className="viewport-handle right" />
          <div className="viewport-fill" />
        </div>
      </div>
      
      {/* Time scale reference */}
      <div className="minimap-time-scale">
        <span>0:00</span>
        <span>{formatTimecode(timelineWidth / zoomLevel)}</span>
      </div>
    </div>
  );
};

// Utility function to format timecode
function formatTimecode(frames: number, fps: number = 24): string {
  const totalSeconds = Math.floor(frames / fps);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default Minimap;

