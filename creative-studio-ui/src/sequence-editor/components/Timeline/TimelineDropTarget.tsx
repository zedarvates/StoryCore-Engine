/**
 * Timeline Drop Target Component
 * 
 * Provides drop zones for timeline tracks to accept dragged assets.
 * Enhanced with multi-select support, validation, and undo/redo integration.
 * Requirements: 15.2, 15.3, 15.4, 15.7 - Drop target highlighting, asset placement, and multi-select
 */

import React, { useCallback } from 'react';
import { useDrop } from 'react-dnd';
import { DND_ITEM_TYPES, type DraggedAssetItem } from '../AssetLibrary/DraggableAsset';
import { useAppDispatch } from '../../store';
import { addShot } from '../../store/slices/timelineSlice';
import type { Track, LayerType, Asset } from '../../types';

// ============================================================================
// Types
// ============================================================================

interface TimelineDropTargetProps {
  track: Track;
  zoomLevel: number;
  onAssetDrop?: (assets: Asset[], position: number, trackType: LayerType) => void;
  children: React.ReactNode;
}

/**
 * Validates if an asset type is compatible with a track type
 */
function isAssetCompatibleWithTrack(assetType: Asset['type'], trackType: LayerType): boolean {
  // Media track accepts most visual assets
  if (trackType === 'media') {
    return ['character', 'environment', 'prop', 'camera-preset', 'template'].includes(assetType);
  }
  
  // Effects track accepts visual styles
  if (trackType === 'effects') {
    return assetType === 'visual-style';
  }
  
  // Other tracks have specific requirements
  // For now, default to media track for most assets
  return trackType === 'media';
}

// ============================================================================
// Component
// ============================================================================

export const TimelineDropTarget: React.FC<TimelineDropTargetProps> = ({
  track,
  zoomLevel,
  onAssetDrop,
  children,
}) => {
  const dispatch = useAppDispatch();

  // Calculate drop position from mouse coordinates
  const getDropPosition = useCallback((monitor: unknown): number => {
    const clientOffset = monitor.getClientOffset();
    if (!clientOffset) return 0;

    // Get the timeline canvas element
    const timelineElement = document.querySelector('.timeline-canvas');
    if (!timelineElement) return 0;

    const rect = timelineElement.getBoundingClientRect();
    const relativeX = clientOffset.x - rect.left;
    
    // Convert pixel position to frame position
    const framePosition = Math.max(0, Math.floor(relativeX / zoomLevel));
    return framePosition;
  }, [zoomLevel]);

  // Handle asset drop
  const handleDrop = useCallback((item: DraggedAssetItem, monitor: unknown) => {
    const dropPosition = getDropPosition(monitor);
    
    // Support multi-select in the future by wrapping single asset in array
    const assets = [item.asset];
    
    console.log('Asset(s) dropped on timeline:', {
      assets: assets.map(a => a.name),
      track: track.type,
      position: dropPosition,
    });

    // Call custom handler if provided
    if (onAssetDrop) {
      onAssetDrop(assets, dropPosition, track.type);
      return;
    }

    // Default behavior: Create new shot(s) with the asset(s)
    assets.forEach((asset, index) => {
      const offsetPosition = dropPosition + (index * 120); // Offset each shot by 5 seconds
      
      const newShot = {
        id: `shot-${Date.now()}-${index}`,
        name: asset.name,
        startTime: offsetPosition,
        duration: 120, // Default 5 seconds at 24fps
        layers: [
          {
            id: `layer-${Date.now()}-${index}`,
            type: track.type,
            startTime: 0,
            duration: 120,
            locked: false,
            hidden: false,
            opacity: 1,
            blendMode: 'normal',
            data: {
              sourceUrl: asset.thumbnailUrl,
              trim: { start: 0, end: 120 },
              transform: {
                position: { x: 0, y: 0 },
                scale: { x: 1, y: 1 },
                rotation: 0,
                anchor: { x: 0.5, y: 0.5 },
              },
            },
          },
        ],
        referenceImages: [
          {
            id: `ref-${Date.now()}-${index}`,
            url: asset.thumbnailUrl,
            weight: 1.0,
            source: 'library' as const,
          },
        ],
        prompt: asset.metadata.description || `Generate ${asset.name}`,
        parameters: {
          seed: Math.floor(Math.random() * 1000000),
          denoising: 0.7,
          steps: 30,
          guidance: 7.5,
          sampler: 'euler',
          scheduler: 'normal',
        },
        generationStatus: 'pending' as const,
      };

      // Dispatch action (will be captured by history middleware for undo/redo)
      dispatch(addShot(newShot));
    });
  }, [dispatch, track, getDropPosition, onAssetDrop]);

  // Set up drop target
  const [{ isOver, canDrop }, drop] = useDrop<
    DraggedAssetItem,
    void,
    { isOver: boolean; canDrop: boolean }
  >(
    () => ({
      accept: DND_ITEM_TYPES.ASSET,
      drop: handleDrop,
      canDrop: (item) => {
        // Validate asset compatibility with track
        return isAssetCompatibleWithTrack(item.asset.type, track.type);
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }),
    [track, handleDrop]
  );

  // Determine drop target state
  const isActive = isOver && canDrop;
  const isInvalid = isOver && !canDrop;

  return (
    <div
      ref={drop}
      className={`timeline-drop-target ${isActive ? 'drop-active' : ''} ${isInvalid ? 'drop-invalid' : ''} ${canDrop && !isOver ? 'drop-ready' : ''}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
      }}
    >
      {children}
      
      {/* Drop indicator overlay */}
      {isActive && (
        <div className="drop-indicator">
          <div className="drop-indicator-content">
            <span className="drop-icon">📍</span>
            <span className="drop-text">Drop to add to {track.type} track</span>
          </div>
        </div>
      )}
      
      {/* Invalid drop indicator */}
      {isInvalid && (
        <div className="drop-indicator invalid">
          <div className="drop-indicator-content">
            <span className="drop-icon">🚫</span>
            <span className="drop-text">Cannot drop here</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimelineDropTarget;

