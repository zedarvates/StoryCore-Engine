/**
 * TrackComponent — Conteneur de piste avec clips en DOM
 * Alternative au canvas VirtualTimelineCanvas pour le rendu des clips.
 * Inspiré de LTX-Desktop.
 */
import React, { useCallback, useMemo, useRef } from 'react';
import { useDrop } from 'react-dnd';
import { DND_ITEM_TYPES, type DraggedAssetItem } from '../AssetLibrary/DraggableAsset';
import { TimelineClipComponent } from './TimelineClipComponent';
import type { Shot, LayerType } from '@/types';
import type { Track } from '@/sequence-editor/types';
import { getTrackShots } from '../../constants/timelineConstants';

// ============================================================================
// Types
// ============================================================================

export interface TrackComponentProps {
  /** Track definition */
  track: Track;
  /** Track index (for ordering) */
  index: number;
  /** All shots */
  shots: Shot[];
  /** Zoom level */
  zoomLevel: number;
  /** Selected element IDs */
  selectedElements: string[];
  /** Active tool */
  activeTool?: string;
  /** Timeline width in pixels */
  timelineWidth: number;
  /** Click on clip */
  onClipClick: (shotId: string, multiSelect: boolean) => void;
  /** Double click on clip */
  onClipDoubleClick?: (shotId: string) => void;
  /** Resize start left */
  onResizeStartLeft?: (shotId: string, e: React.MouseEvent) => void;
  /** Resize start right */
  onResizeStartRight?: (shotId: string, e: React.MouseEvent) => void;
  /** Drop asset on track */
  onAssetDrop?: (asset: DraggedAssetItem, startTime: number, trackType: LayerType) => void;
  /** Drag preview styles for clips */
  clipDragStyles?: Map<string, React.CSSProperties>;
  /** Content offset map for slip editing */
  contentOffsets?: Map<string, number>;
}

// ============================================================================
// Component
// ============================================================================

export const TrackComponent: React.FC<TrackComponentProps> = React.memo(({
  track,
  index: _trackIndex,
  shots,
  zoomLevel,
  selectedElements,
  activeTool = 'select',
  timelineWidth,
  onClipClick,
  onClipDoubleClick,
  onResizeStartLeft,
  onResizeStartRight,
  onAssetDrop,
  clipDragStyles,
  contentOffsets,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  // DnD drop zone for assets
  const [{ isOver, canDrop }, drop] = useDrop<DraggedAssetItem, void, { isOver: boolean; canDrop: boolean }>(() => ({
    accept: DND_ITEM_TYPES.ASSET,
    canDrop: (item) => {
      // Only allow drop if asset type matches track type
      return isAssetCompatibleWithTrack(item, track.type);
    },
    drop: (item, monitor) => {
      const offset = monitor.getClientOffset();
      if (!offset || !contentRef.current) return;
      const rect = contentRef.current.getBoundingClientRect();
      const relativeX = offset.x - rect.left;
      const startTime = Math.max(0, Math.floor(relativeX / zoomLevel));
      onAssetDrop?.(item, startTime, track.type);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [zoomLevel, track.type, onAssetDrop]);

  // Get shots relevant to this track
  const trackShots = useMemo(() => {
    return getTrackShots(shots, track.type).map(ts => ts.shot);
  }, [shots, track.type]);

  const isLocked = track.locked || track.hidden;

  return (
    <div
      className={`track-row ${isOver && canDrop ? 'drop-active' : ''} ${isLocked ? 'track-locked' : ''}`}
      style={{
        height: `${track.height}px`,
        minHeight: `${track.height}px`,
        position: 'relative',
        borderBottom: '1px solid rgba(255,255,255,0.03)',
      }}
    >
      {/* Drop zone overlay */}
      {isOver && canDrop && (
        <div
          style={{
            position: 'absolute', inset: 0,
            background: 'rgba(99, 102, 241, 0.1)',
            border: '2px dashed rgba(99, 102, 241, 0.3)',
            borderRadius: '4px',
            zIndex: 80,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Content area with clips */}
      <div
        ref={(node) => {
          if (node) {
            contentRef.current = node;
            drop(node);
          }
        }}
        style={{
          position: 'absolute', top: 0, left: 0,
          width: `${timelineWidth}px`, height: '100%',
        }}
      >
        {/* Background grid */}
        <div
          style={{
            position: 'absolute', inset: 0,
            background: `
              repeating-linear-gradient(
                90deg,
                transparent,
                transparent ${zoomLevel >= 50 ? zoomLevel - 1 : zoomLevel * 5 - 1}px,
                rgba(255,255,255,0.03) ${zoomLevel >= 50 ? zoomLevel - 1 : zoomLevel * 5 - 1}px,
                rgba(255,255,255,0.03) ${zoomLevel >= 50 ? zoomLevel : zoomLevel * 5}px
              )
            `,
            pointerEvents: 'none',
          }}
        />

        {/* Clips */}
        {trackShots.map((shot) => (
          <TimelineClipComponent
            key={shot.id}
            shot={shot}
            trackType={track.type}
            zoomLevel={zoomLevel}
            isSelected={selectedElements.includes(shot.id)}
            isTrackLocked={isLocked}
            activeTool={activeTool}
            contentOffset={contentOffsets?.get(shot.id) ?? 0}
            onClick={(e) => onClipClick(shot.id, e.ctrlKey || e.metaKey)}
            onDoubleClick={onClipDoubleClick ? () => onClipDoubleClick(shot.id) : undefined}
            onResizeStartLeft={onResizeStartLeft ? (e) => onResizeStartLeft(shot.id, e) : undefined}
            onResizeStartRight={onResizeStartRight ? (e) => onResizeStartRight(shot.id, e) : undefined}
            dragStyle={clipDragStyles?.get(shot.id)}
          />
        ))}
      </div>
    </div>
  );
});

TrackComponent.displayName = 'TrackComponent';

// ============================================================================
// Helpers
// ============================================================================

function isAssetCompatibleWithTrack(item: DraggedAssetItem, trackType: LayerType): boolean {
  // Map asset types to track types
  switch (trackType) {
    case 'media':
      return true; // any asset can go on media track
    case 'audio':
      return item.asset.type === 'audio' || item.asset.type === 'video'; // video assets have audio too
    case 'text':
      return true; // text can go on text track
    case 'effects':
      return true;
    case 'transitions':
      return true;
    case 'keyframes':
      return true;
    default:
      return false;
  }
}

export default TrackComponent;
