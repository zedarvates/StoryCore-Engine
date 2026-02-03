/**
 * Timeline Canvas Component
 * 
 * Renders shots and layers on a timeline track with virtual scrolling support.
 * Requirements: 1.1, 1.3, 4.3, 9.1, 9.3, 9.4, 9.5, 9.7, 15.2, 15.3, 15.4
 */

import React, { useCallback } from 'react';
import { TimelineDropTarget } from './TimelineDropTarget';
import type { Track, Shot } from '../../types';

interface TimelineCanvasProps {
  track: Track;
  shots: Shot[];
  zoomLevel: number;
  selectedElements: string[];
  playheadPosition: number;
  onShotSelect: (shotId: string, multiSelect: boolean) => void;
}

export const TimelineCanvas: React.FC<TimelineCanvasProps> = ({
  track,
  shots,
  zoomLevel,
  selectedElements,
  playheadPosition,
  onShotSelect,
}) => {
  // Get shots for this track type
  const trackShots = shots.filter((shot) => {
    // Check if shot has a layer matching this track type
    return shot.layers.some((layer) => layer.type === track.type);
  });

  // Handle shot click
  const handleShotClick = useCallback((e: React.MouseEvent, shotId: string) => {
    e.stopPropagation();
    onShotSelect(shotId, e.ctrlKey || e.metaKey);
  }, [onShotSelect]);

  // Calculate shot position and width
  const getShotStyle = (shot: Shot) => {
    const left = shot.startTime * zoomLevel;
    const width = shot.duration * zoomLevel;
    const layer = shot.layers.find((l) => l.type === track.type);
    const layerIndex = shot.layers.filter((l) => l.type === track.type).indexOf(layer!);
    
    return {
      left: `${left}px`,
      width: `${width}px`,
      top: `${layerIndex * 30}px`, // Stack layers vertically
      height: '28px',
    };
  };

  if (track.hidden) {
    return null;
  }

  return (
    <TimelineDropTarget track={track} zoomLevel={zoomLevel}>
      <div
        className={`timeline-canvas track-${track.type}`}
        style={{
          height: track.height,
          backgroundColor: track.color + '20', // 20 = 12% opacity
          borderBottom: '1px solid var(--border-color, #3a3a3a)',
        }}
      >
        {/* Grid lines */}
        <div className="timeline-grid-lines">
          {Array.from({ length: Math.ceil(track.height / 20) }).map((_, i) => (
            <div
              key={i}
              className="grid-line"
              style={{ top: i * 20 }}
            />
          ))}
        </div>

        {/* Shot elements */}
        {trackShots.map((shot) => {
          const isSelected = selectedElements.includes(shot.id);
          
          return (
            <div
              key={shot.id}
              className={`timeline-shot ${isSelected ? 'selected' : ''}`}
              style={getShotStyle(shot)}
              onClick={(e) => handleShotClick(e, shot.id)}
              draggable={!track.locked}
            >
              <div
                className="shot-content"
                style={{
                  backgroundColor: track.color,
                  opacity: isSelected ? 1 : 0.8,
                }}
              >
                <span className="shot-name">{shot.name || 'Untitled Shot'}</span>
                {shot.duration > 30 && (
                  <span className="shot-duration">
                    {Math.round(shot.duration / 24)}s
                  </span>
                )}
              </div>
              
              {/* Resize handles */}
              {!track.locked && (
                <>
                  <div className="resize-handle-left" />
                  <div className="resize-handle-right" />
                </>
              )}
            </div>
          );
        })}

        {/* Playhead overlay */}
        <div
          className="playhead-overlay"
          style={{
            left: `${playheadPosition * zoomLevel}px`,
          }}
        />
      </div>
    </TimelineDropTarget>
  );
};

export default TimelineCanvas;

