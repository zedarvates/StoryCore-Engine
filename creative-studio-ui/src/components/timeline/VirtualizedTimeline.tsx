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
import { List, type RowComponentProps } from 'react-window';
import type { Shot } from '@/types';
import type { TimelineTrack as MediaTrack } from '@/types/timeline';

type TrackData = Pick<MediaTrack, 'id' | 'type'> & { name: string };
type TimelineShot = Pick<Shot, 'id' | 'name' | 'startTime' | 'duration'> & { trackId: string };
type TrackWithShots = TrackData & { shots: TimelineShot[] };

interface VirtualTimelineProps {
  tracks: TrackData[];
  shots: TimelineShot[];
  zoomLevel: number;
  playheadPosition: number;
  selectedElements: string[];
  onShotSelect: (shotId: string, multiSelect?: boolean) => void;
  onLayerSelect?: (layerId: string) => void;
  isPlaying?: boolean;
}

type RowProps = Omit<VirtualTimelineProps, 'tracks' | 'shots'> & { tracks: TrackWithShots[] };

function TimelineRow({ index, style, ariaAttributes, tracks, ...props }: RowComponentProps<RowProps>) {
  const track = tracks[index];
  if (!track) return null;
  return (
    <div style={style} {...ariaAttributes}>
      <TimelineTrack {...props} track={track} />
    </div>
  );
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
  const trackData = useMemo(() => {
    const shotsByTrack = new Map<string, TimelineShot[]>();
    for (const shot of shots) {
      const current = shotsByTrack.get(shot.trackId);
      if (current) current.push(shot);
      else shotsByTrack.set(shot.trackId, [shot]);
    }
    return tracks.map((track) => ({ ...track, shots: shotsByTrack.get(track.id) ?? [] }));
  }, [tracks, shots]);

  return (
    <div className="virtual-timeline-container" data-testid="virtual-timeline">
      <List
        defaultHeight={600}
        style={{ height: 600, width: '100%' }}
        rowCount={trackData.length}
        rowHeight={Math.max(40, 60 * zoomLevel)}
        rowComponent={TimelineRow}
        rowProps={{ tracks: trackData, zoomLevel, playheadPosition, selectedElements, onShotSelect, onLayerSelect, isPlaying }}
        overscanCount={5}
      />
    </div>
  );
};

// Optimized TimelineTrack component with React.memo
export const TimelineTrack = React.memo<{
  track: TrackWithShots;
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
              onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                onShotSelect(shot.id, e.ctrlKey || e.metaKey);
              }}
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
