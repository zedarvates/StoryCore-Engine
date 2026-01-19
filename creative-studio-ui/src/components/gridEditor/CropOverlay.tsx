/**
 * CropOverlay Component - Interactive crop region editor
 * 
 * Provides visual controls for adjusting crop boundaries:
 * - 8 handles (4 edges + 4 corners) for resizing
 * - Interior drag for translating entire crop region
 * - Visual mask showing dimmed area outside crop
 * - Real-time dimension and position feedback
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */

import React, { useCallback, useState } from 'react';
import type { CropRegion, Rectangle, Point } from '../../stores/gridEditorStore';

// ============================================================================
// Type Definitions
// ============================================================================

export interface CropOverlayProps {
  /**
   * Current crop region (normalized 0-1 coordinates)
   */
  crop: CropRegion;
  
  /**
   * Panel bounds in screen space
   */
  panelBounds: Rectangle;
  
  /**
   * Callback when crop changes during interaction
   */
  onCropChange: (crop: CropRegion) => void;
  
  /**
   * Callback when crop editing is confirmed
   */
  onConfirm: () => void;
  
  /**
   * Callback when crop editing is cancelled
   */
  onCancel: () => void;
  
  /**
   * Whether crop editing is active
   */
  isActive: boolean;
}

type HandleType = 
  | 'top-left' | 'top' | 'top-right'
  | 'left' | 'right'
  | 'bottom-left' | 'bottom' | 'bottom-right'
  | 'interior';

interface DragState {
  handleType: HandleType;
  startCrop: CropRegion;
  startPoint: Point;
}

// ============================================================================
// Constants
// ============================================================================

const HANDLE_SIZE = 8; // pixels
const HANDLE_HOVER_SIZE = 12; // pixels
const MIN_CROP_SIZE = 0.01; // 1% minimum (normalized)
const MASK_OPACITY = 0.5;
const CROP_BORDER_COLOR = '#3b82f6'; // blue-500
const CROP_BORDER_WIDTH = 2;
const HANDLE_COLOR = '#ffffff';
const HANDLE_STROKE_COLOR = '#3b82f6';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert normalized crop coordinates to screen coordinates
 */
function cropToScreen(crop: CropRegion, panelBounds: Rectangle): Rectangle {
  return {
    x: panelBounds.x + crop.x * panelBounds.width,
    y: panelBounds.y + crop.y * panelBounds.height,
    width: crop.width * panelBounds.width,
    height: crop.height * panelBounds.height,
  };
}

/**
 * Convert screen coordinates to normalized crop coordinates (for future use)
 */
function _screenToCrop(screenRect: Rectangle, panelBounds: Rectangle): CropRegion {
  return {
    x: (screenRect.x - panelBounds.x) / panelBounds.width,
    y: (screenRect.y - panelBounds.y) / panelBounds.height,
    width: screenRect.width / panelBounds.width,
    height: screenRect.height / panelBounds.height,
  };
}

/**
 * Constrain crop region to valid bounds (0-1, minimum size)
 */
function constrainCrop(crop: CropRegion): CropRegion {
  const constrained = { ...crop };
  
  // Ensure minimum size
  constrained.width = Math.max(MIN_CROP_SIZE, constrained.width);
  constrained.height = Math.max(MIN_CROP_SIZE, constrained.height);
  
  // Constrain to 0-1 bounds
  constrained.x = Math.max(0, Math.min(1 - constrained.width, constrained.x));
  constrained.y = Math.max(0, Math.min(1 - constrained.height, constrained.y));
  constrained.width = Math.min(1 - constrained.x, constrained.width);
  constrained.height = Math.min(1 - constrained.y, constrained.height);
  
  return constrained;
}

// ============================================================================
// Component
// ============================================================================

export const CropOverlay: React.FC<CropOverlayProps> = ({
  crop,
  panelBounds,
  onCropChange,
  onConfirm,
  onCancel,
  isActive,
}) => {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoveredHandle, setHoveredHandle] = useState<HandleType | null>(null);

  // Convert crop to screen coordinates
  const cropBounds = cropToScreen(crop, panelBounds);

  // ============================================================================
  // Drag Handlers
  // ============================================================================

  const handleMouseDown = useCallback(
    (handleType: HandleType, event: React.MouseEvent) => {
      event.stopPropagation();
      event.preventDefault();

      setDragState({
        handleType,
        startCrop: crop,
        startPoint: { x: event.clientX, y: event.clientY },
      });
    },
    [crop]
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!dragState) return;

      const delta = {
        x: event.clientX - dragState.startPoint.x,
        y: event.clientY - dragState.startPoint.y,
      };

      // Convert delta to normalized coordinates
      const normalizedDelta = {
        x: delta.x / panelBounds.width,
        y: delta.y / panelBounds.height,
      };

      let newCrop = { ...dragState.startCrop };

      // Apply delta based on handle type
      switch (dragState.handleType) {
        case 'top-left':
          newCrop.x += normalizedDelta.x;
          newCrop.y += normalizedDelta.y;
          newCrop.width -= normalizedDelta.x;
          newCrop.height -= normalizedDelta.y;
          break;

        case 'top':
          newCrop.y += normalizedDelta.y;
          newCrop.height -= normalizedDelta.y;
          break;

        case 'top-right':
          newCrop.y += normalizedDelta.y;
          newCrop.width += normalizedDelta.x;
          newCrop.height -= normalizedDelta.y;
          break;

        case 'left':
          newCrop.x += normalizedDelta.x;
          newCrop.width -= normalizedDelta.x;
          break;

        case 'right':
          newCrop.width += normalizedDelta.x;
          break;

        case 'bottom-left':
          newCrop.x += normalizedDelta.x;
          newCrop.width -= normalizedDelta.x;
          newCrop.height += normalizedDelta.y;
          break;

        case 'bottom':
          newCrop.height += normalizedDelta.y;
          break;

        case 'bottom-right':
          newCrop.width += normalizedDelta.x;
          newCrop.height += normalizedDelta.y;
          break;

        case 'interior':
          newCrop.x += normalizedDelta.x;
          newCrop.y += normalizedDelta.y;
          break;
      }

      // Constrain and update
      newCrop = constrainCrop(newCrop);
      onCropChange(newCrop);
    },
    [dragState, panelBounds, onCropChange]
  );

  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);

  // Set up global mouse event listeners during drag
  React.useEffect(() => {
    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState, handleMouseMove, handleMouseUp]);

  // ============================================================================
  // Keyboard Handlers
  // ============================================================================

  React.useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        onConfirm();
      } else if (event.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, onConfirm, onCancel]);

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderHandle = (type: HandleType, x: number, y: number) => {
    const isHovered = hoveredHandle === type;
    const size = isHovered ? HANDLE_HOVER_SIZE : HANDLE_SIZE;
    const offset = size / 2;

    return (
      <rect
        key={type}
        x={x - offset}
        y={y - offset}
        width={size}
        height={size}
        fill={HANDLE_COLOR}
        stroke={HANDLE_STROKE_COLOR}
        strokeWidth={2}
        style={{
          cursor: getCursorForHandle(type),
          pointerEvents: 'all',
        }}
        onMouseDown={(e) => handleMouseDown(type, e)}
        onMouseEnter={() => setHoveredHandle(type)}
        onMouseLeave={() => setHoveredHandle(null)}
      />
    );
  };

  const getCursorForHandle = (type: HandleType): string => {
    switch (type) {
      case 'top-left':
      case 'bottom-right':
        return 'nwse-resize';
      case 'top-right':
      case 'bottom-left':
        return 'nesw-resize';
      case 'top':
      case 'bottom':
        return 'ns-resize';
      case 'left':
      case 'right':
        return 'ew-resize';
      case 'interior':
        return 'move';
      default:
        return 'default';
    }
  };

  if (!isActive) return null;

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <g>
      {/* Crop mask - dimmed area outside crop */}
      <defs>
        <mask id="crop-mask">
          <rect
            x={panelBounds.x}
            y={panelBounds.y}
            width={panelBounds.width}
            height={panelBounds.height}
            fill="white"
          />
          <rect
            x={cropBounds.x}
            y={cropBounds.y}
            width={cropBounds.width}
            height={cropBounds.height}
            fill="black"
          />
        </mask>
      </defs>

      <rect
        x={panelBounds.x}
        y={panelBounds.y}
        width={panelBounds.width}
        height={panelBounds.height}
        fill="black"
        opacity={MASK_OPACITY}
        mask="url(#crop-mask)"
        style={{ pointerEvents: 'none' }}
      />

      {/* Crop rectangle border */}
      <rect
        x={cropBounds.x}
        y={cropBounds.y}
        width={cropBounds.width}
        height={cropBounds.height}
        fill="none"
        stroke={CROP_BORDER_COLOR}
        strokeWidth={CROP_BORDER_WIDTH}
        style={{ pointerEvents: 'none' }}
      />

      {/* Interior drag area */}
      <rect
        x={cropBounds.x}
        y={cropBounds.y}
        width={cropBounds.width}
        height={cropBounds.height}
        fill="transparent"
        style={{
          cursor: 'move',
          pointerEvents: 'all',
        }}
        onMouseDown={(e) => handleMouseDown('interior', e)}
      />

      {/* Corner handles */}
      {renderHandle('top-left', cropBounds.x, cropBounds.y)}
      {renderHandle('top-right', cropBounds.x + cropBounds.width, cropBounds.y)}
      {renderHandle('bottom-left', cropBounds.x, cropBounds.y + cropBounds.height)}
      {renderHandle('bottom-right', cropBounds.x + cropBounds.width, cropBounds.y + cropBounds.height)}

      {/* Edge handles */}
      {renderHandle('top', cropBounds.x + cropBounds.width / 2, cropBounds.y)}
      {renderHandle('bottom', cropBounds.x + cropBounds.width / 2, cropBounds.y + cropBounds.height)}
      {renderHandle('left', cropBounds.x, cropBounds.y + cropBounds.height / 2)}
      {renderHandle('right', cropBounds.x + cropBounds.width, cropBounds.y + cropBounds.height / 2)}

      {/* Dimension feedback */}
      <text
        x={cropBounds.x + cropBounds.width / 2}
        y={cropBounds.y - 10}
        textAnchor="middle"
        fill={CROP_BORDER_COLOR}
        fontSize="12"
        fontWeight="bold"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {`${Math.round(crop.width * 100)}% × ${Math.round(crop.height * 100)}%`}
      </text>

      {/* Position feedback */}
      <text
        x={cropBounds.x + cropBounds.width / 2}
        y={cropBounds.y + cropBounds.height + 20}
        textAnchor="middle"
        fill={CROP_BORDER_COLOR}
        fontSize="11"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {`(${Math.round(crop.x * 100)}%, ${Math.round(crop.y * 100)}%)`}
      </text>
    </g>
  );
};

export default CropOverlay;
