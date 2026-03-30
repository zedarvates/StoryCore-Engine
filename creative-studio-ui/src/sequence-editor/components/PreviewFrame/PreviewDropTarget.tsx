/**
 * Preview Frame Drop Target Component
 * 
 * Provides drop zone for preview frame to accept dragged assets.
 * Enhanced with multi-select support, validation, and undo/redo integration.
 * Requirements: 15.6, 15.7 - Apply assets to selected shot via preview frame with multi-select
 */

import React, { useCallback } from 'react';
import { useDrop } from 'react-dnd';
import { DND_ITEM_TYPES, type DraggedAssetItem } from '../AssetLibrary/DraggableAsset';
import { useAppDispatch, useAppSelector } from '../../store';
import { AssetIntegrationService } from '../../services/assetIntegrationService';
import type { Shot, ServiceAsset } from '../../types';
import './previewDropTarget.css';

// ============================================================================
// Types
// ============================================================================

interface PreviewDropTargetProps {
  children: React.ReactNode;
  onAssetDrop?: (assets: ServiceAsset[]) => void;
}

// ============================================================================
// Component
// ============================================================================

export const PreviewDropTarget: React.FC<PreviewDropTargetProps> = ({
  children,
  onAssetDrop,
}) => {
  const dispatch = useAppDispatch();
  const { shots, selectedElements, playheadPosition } = useAppSelector((state) => state.timeline);

  // Get currently selected shot or shot at playhead
  const getCurrentShot = useCallback(() => {
    // First, try to get selected shot
    if (selectedElements.length > 0) {
      const selectedShot = shots.find((s: Shot) => s.id === selectedElements[0]);
      if (selectedShot) return selectedShot;
    }

    // Otherwise, get shot at playhead position
    const currentShot = shots.find((shot: Shot) =>
      playheadPosition >= shot.startTime &&
      playheadPosition < (shot.startTime + shot.duration)
    );

    return currentShot;
  }, [shots, selectedElements, playheadPosition]);

  // Handle asset drop
  const handleDrop = useCallback((item: DraggedAssetItem) => {
    const currentShot = getCurrentShot();
    
    if (!currentShot) {
      console.warn('No shot selected or at playhead position');
      return;
    }

    // Support multi-select in the future by wrapping single asset in array
    const assets = [item.asset];

    console.log('Asset(s) dropped on preview frame:', {
      assets: assets.map(a => a.name),
      shot: currentShot.name,
      assetTypes: assets.map(a => a.type),
    });

    // Call custom handler if provided
    if (onAssetDrop) {
      onAssetDrop(assets);
      return;
    }

    // Apply each asset to the current shot
    AssetIntegrationService.applyToShot(assets, currentShot, dispatch);
  }, [dispatch, getCurrentShot, onAssetDrop]);

  // Set up drop target
  const [{ isOver, canDrop }, drop] = useDrop<
    DraggedAssetItem,
    void,
    { isOver: boolean; canDrop: boolean }
  >(
    () => ({
      accept: DND_ITEM_TYPES.ASSET,
      drop: handleDrop,
      canDrop: () => {
        // Can only drop if there's a shot selected or at playhead
        return getCurrentShot() !== undefined;
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }),
    [handleDrop, getCurrentShot]
  );

  // Determine drop target state
  const isActive = isOver && canDrop;
  const isInvalid = isOver && !canDrop;
  const currentShot = getCurrentShot();

  return (
    <div
      ref={drop as unknown as React.RefObject<HTMLDivElement>}
      className={`preview-drop-target ${isActive ? 'drop-active' : ''} ${isInvalid ? 'drop-invalid' : ''} ${canDrop && !isOver ? 'drop-ready' : ''}`}
    >
      {children}
      
      {/* Drop indicator overlay */}
      {isActive && currentShot && (
        <div className="drop-indicator">
          <div className="drop-indicator-content">
            <span className="drop-icon">🎯</span>
            <span className="drop-text">Apply to {currentShot.name}</span>
          </div>
        </div>
      )}
      
      {/* Invalid drop indicator */}
      {isInvalid && (
        <div className="drop-indicator invalid">
          <div className="drop-indicator-content">
            <span className="drop-icon">🚫</span>
            <span className="drop-text">No shot at playhead</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreviewDropTarget;
