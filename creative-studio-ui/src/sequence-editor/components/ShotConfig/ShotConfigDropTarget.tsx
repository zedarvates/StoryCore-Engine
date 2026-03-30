/**
 * Shot Config Drop Target Component
 * 
 * Provides drop zone for shot configuration panel to accept dragged assets.
 * Enhanced with multi-select support, validation, and undo/redo integration.
 * Requirements: 15.5, 15.7 - Apply assets to shots via drag-and-drop with multi-select
 */

import React, { useCallback } from 'react';
import { useDrop } from 'react-dnd';
import { DND_ITEM_TYPES, type DraggedAssetItem } from '../AssetLibrary/DraggableAsset';
import { useAppDispatch } from '../../store';
import { AssetIntegrationService } from '../../services/assetIntegrationService';
import type { Shot, ServiceAsset } from '../../types';
import './shotConfigDropTarget.css';

// ============================================================================
// Types
// ============================================================================

interface ShotConfigDropTargetProps {
  shot: Shot;
  children: React.ReactNode;
  onAssetDrop?: (assets: ServiceAsset[], shot: Shot) => void;
}

// ============================================================================
// Component
// ============================================================================

export const ShotConfigDropTarget: React.FC<ShotConfigDropTargetProps> = ({
  shot,
  children,
  onAssetDrop,
}) => {
  const dispatch = useAppDispatch();

  // Handle asset drop
  const handleDrop = useCallback((item: DraggedAssetItem) => {
    if (!shot) return;

    // Support multi-select in the future by wrapping single asset in array
    const assets = [item.asset];

    console.log('Asset(s) dropped on shot config:', {
      assets: assets.map(a => a.name),
      shot: shot.name,
      assetTypes: assets.map(a => a.type),
    });

    // Call custom handler if provided
    if (onAssetDrop) {
      onAssetDrop(assets, shot);
      return;
    }

    // Apply each asset to the current shot
    AssetIntegrationService.applyToShot(assets, shot, dispatch);
  }, [dispatch, shot, onAssetDrop]);

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
        // Can only drop if a shot is selected
        return shot !== null;
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }),
    [shot, handleDrop]
  );

  // Determine drop target state
  const isActive = isOver && canDrop;
  const isInvalid = isOver && !canDrop;

  return (
    <div
      ref={drop as unknown as React.RefObject<HTMLDivElement>}
      className={`shot-config-drop-target ${isActive ? 'drop-active' : ''} ${isInvalid ? 'drop-invalid' : ''} ${canDrop && !isOver ? 'drop-ready' : ''}`}
    >
      {children}
      
      {/* Drop indicator overlay */}
      {isActive && shot && (
        <div className="drop-indicator">
          <div className="drop-indicator-content">
            <span className="drop-icon">✨</span>
            <span className="drop-text">Apply to {shot.name}</span>
          </div>
        </div>
      )}
      
      {/* Invalid drop indicator */}
      {isInvalid && (
        <div className="drop-indicator invalid">
          <div className="drop-indicator-content">
            <span className="drop-icon">🚫</span>
            <span className="drop-text">Select a shot first</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShotConfigDropTarget;
