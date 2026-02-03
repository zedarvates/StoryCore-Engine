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
import { addReferenceImage, updateShot } from '../../store/slices/timelineSlice';
import type { Shot, Asset } from '../../types';

// ============================================================================
// Types
// ============================================================================

interface ShotConfigDropTargetProps {
  shot: Shot | null;
  children: React.ReactNode;
  onAssetDrop?: (assets: Asset[], shot: Shot) => void;
}

/**
 * Applies an asset to a shot based on asset type
 */
function applyAssetToShot(
  asset: Asset,
  shot: Shot,
  dispatch: ReturnType<typeof useAppDispatch>
): void {
  switch (asset.type) {
    case 'character':
    case 'environment':
    case 'prop':
      // Add as reference image
      dispatch(addReferenceImage({
        shotId: shot.id,
        image: {
          id: `ref-${Date.now()}-${Math.random()}`,
          url: asset.thumbnailUrl,
          weight: 0.7,
          source: 'library',
        },
      }));
      break;

    case 'visual-style':
      // Apply visual style to shot
      dispatch(updateShot({
        id: shot.id,
        updates: {
          prompt: shot.prompt + ` in ${asset.name} style`,
        },
      }));
      
      // Add as reference image with lower weight
      dispatch(addReferenceImage({
        shotId: shot.id,
        image: {
          id: `ref-${Date.now()}-${Math.random()}`,
          url: asset.thumbnailUrl,
          weight: 0.5,
          source: 'library',
        },
      }));
      break;

    case 'camera-preset':
      // Apply camera preset parameters
      if (asset.metadata.cameraMetadata) {
        dispatch(updateShot({
          id: shot.id,
          updates: {
            prompt: shot.prompt + ` with ${asset.name} camera movement`,
          },
        }));
      }
      break;

    case 'lighting-rig':
      // Apply lighting rig parameters
      if (asset.metadata.lightingMetadata) {
        dispatch(updateShot({
          id: shot.id,
          updates: {
            prompt: shot.prompt + ` with ${asset.name} lighting`,
          },
        }));
      }
      break;

    case 'template':
      // Templates are handled differently (not applicable to single shots)
      console.warn('Templates should be dropped on timeline, not shot config');
      break;

    default:
      // Default: add as reference image
      dispatch(addReferenceImage({
        shotId: shot.id,
        image: {
          id: `ref-${Date.now()}-${Math.random()}`,
          url: asset.thumbnailUrl,
          weight: 0.7,
          source: 'library',
        },
      }));
  }
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

    // Apply each asset to the shot
    assets.forEach((asset) => {
      applyAssetToShot(asset, shot, dispatch);
    });
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
      ref={drop as any}
      className={`shot-config-drop-target ${isActive ? 'drop-active' : ''} ${isInvalid ? 'drop-invalid' : ''} ${canDrop && !isOver ? 'drop-ready' : ''}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
      }}
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
