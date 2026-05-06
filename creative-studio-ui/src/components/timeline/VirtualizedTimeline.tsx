/**
 * Virtualized Timeline Component
 * 
 * Requirements: 85
 * Performance Level: 🟡 HAUTE
 * 
 * Implements virtual scrolling for timeline tracks to improve
 * rendering performance with large numbers of tracks/shots.
 */

import React, { useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { useTimelineStore } from '@/stores/useTimelineStore';
import { TimelineTrack } from './TimelineTrack';
import { TrackData } from '@/types/timeline';

interface VirtualTimelineProps {
  tracks: TrackData[];
  shots: any[];
  zoomLevel: number;
  playheadPosition: number;
  selectedElements: string[];
  onShotSelect: (shotId: string, multiSelect?: boolean) => void;
  onLayerSelect?: (layerId: string) => void;
  isPlaying?: boolean;
}

export const VirtualTimeline: React.FC<VirtualTimelineProps> = ({
  tracks,
  shots,
  zoomLevel,
  playheadPosition,
  selectedElements,
  onShotSelect,
  onLayerSelect,
  isPlaying = false,
}) => {
  // Memoize track data to prevent unnecessary re-renders
  const trackData = useMemo(() => {
    return tracks.map((track, index) => ({
      ...track,
      index,
      shots: shots.filter((shot) => shot.trackId === track.id),
    }));
  }, [tracks, shots]);

  // Row renderer for virtualized list
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const track = trackData[index];
    
    return (
      <div style={style}>
        <TimelineTrack
          track={track}
          zoomLevel={zoomLevel}
          playheadPosition={playheadPosition}
          selectedElements={selectedElements}
          onShotSelect={onShotSelect}
          onLayerSelect={onLayerSelect}
          isPlaying={isPlaying}
        />
      </div>
    );
  }, [trackData, zoomLevel, playheadPosition, selectedElements, onShotSelect, onLayerSelect, isPlaying]);

  // Calculate item size based on zoom level
  const getItemSize = useCallback(() => {
    const baseHeight = 60;
    return Math.max(40, baseHeight * zoomLevel);
  }, [zoomLevel]);

  return (
    <div className="virtual-timeline-container" data-testid="virtual-timeline">
      <AutoSizer disableHeight>
        {({ width }) => (
          <List
            height={600}
            itemCount={trackData.length}
            itemSize={getItemSize()}
            width={width}
            overscanCount={5}
            estimatedItemSize={60}
          >
            {Row}
          </List>
        )}
      </AutoSizer>
    </div>
  );
};

// Optimized TimelineTrack component with React.memo
export const TimelineTrack = React.memo<{
  track: TrackData & { index: number; shots: any[] };
  zoomLevel: number;
  playheadPosition: number;
  selectedElements: string[];
  onShotSelect: (shotId: string, multiSelect?: boolean) => void;
  onLayerSelect?: (layerId: string) => void;
  isPlaying?: boolean;
}>(
  ({
    track,
    zoomLevel,
    playheadPosition,
    selectedElements,
    onShotSelect,
    onLayerSelect,
    isPlaying,
  }) => {
    // Memoize expensive calculations
    const trackWidth = useMemo(() => {
      return Math.max(1000, 30000 * zoomLevel);
    }, [zoomLevel]);

    const isSelected = useMemo(() => {
      return selectedElements.includes(track.id);
    }, [selectedElements, track.id]);

    const handleShotClick = useCallback(
      (shotId: string, event: React.MouseEvent) => {
        onShotSelect(shotId, event.ctrlKey || event.metaKey);
      },
      [onShotSelect]
    );

    return (
      <div
        className={`timeline-track ${isSelected ? 'selected' : ''}`}
        data-track-id={track.id}
        data-testid={`track-${track.id}`}
      >
        <div className="track-header">
          <span className="track-name">{track.name}</span>
          <span className="track-type">{track.type}</span>
          <span className="shot-count">{track.shots.length} shots</span>
        </div>
        <div
          className="track-canvas"
          style={{ width: trackWidth }}
          data-zoom={zoomLevel}
        >
          {track.shots.map((shot) => (
            <div
              key={shot.id}
              className={`shot-item ${selectedElements.includes(shot.id) ? 'selected' : ''}`}
              style={{
                left: shot.startTime * zoomLevel * 10,
                width: shot.duration * zoomLevel * 10,
              }}
              onClick={(e) => handleShotClick(shot.id, e)}
              role="button"
              tabIndex={0}
              aria-label={`Shot ${shot.name}`}
            >
              <div className="shot-label">{shot.name}</div>
            </div>
          ))}
          {/* Playhead */}
          <div
            className="playhead"
            style={{ left: playheadPosition * zoomLevel * 10 }}
          />
        </div>
      </div>
    );
  }
);

TimelineTrack.displayName = 'TimelineTrack';

// CSS Styles (can be moved to separate file)
const styles = `
.virtual-timeline-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.timeline-track {
  border-bottom: 1px solid #e5e7eb;
  background: #ffffff;
  transition: background-color 0.2s;
}

.timeline-track.selected {
  background: #dbeafe;
}

.timeline-track:hover {
  background: #f9fafb;
}

.track-header {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #f3f4f6;
  border-bottom: 1px solid #e5e7eb;
  font-size: 12px;
  font-weight: 500;
}

.track-name {
  flex: 1;
  margin-right: 16px;
}

.track-type {
  color: #6b7280;
  margin-right: 16px;
}

.shot-count {
  color: #9ca3af;
}

.track-canvas {
  position: relative;
  height: 40px;
  overflow: hidden;
}

.shot-item {
  position: absolute;
  height: 32px;
  top: 4px;
  background: #3b82f6;
  border: 1px solid #2563eb;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  overflow: hidden;
}

.shot-item:hover {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.shot-item.selected {
  background: #ef4444;
  border-color: #dc2626;
}

.shot-label {
  padding: 4px 8px;
  color: white;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #ef4444;
  pointer-events: none;
  z-index: 10;
}

.playhead::after {
  content: '';
  position: absolute;
  top: 0;
  left: -4px;
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 6px solid #ef4444;
}
`;

// Inject styles if not already present
if (typeof document !== 'undefined') {
  const styleId = 'virtual-timeline-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = styles;
    document.head.appendChild(style);
  }
}
