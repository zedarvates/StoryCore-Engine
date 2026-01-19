/**
 * TransformGizmo Component - Visual handles for panel transformations
 * 
 * Renders interactive handles for:
 * - Position (4 edge handles for dragging)
 * - Scale (4 corner handles for resizing)
 * - Rotation (circular handle above panel)
 * - Real-time numerical feedback during transforms
 * 
 * Requirements: 3.1, 3.7
 */

import React from 'react';
import type { Panel, Rectangle, Transform, Point } from '../../stores/gridEditorStore';

// ============================================================================
// Type Definitions
// ============================================================================

export interface TransformGizmoProps {
  /**
   * Panel to render transform gizmo for
   */
  panel: Panel;
  
  /**
   * Panel bounds in screen space
   */
  bounds: Rectangle;
  
  /**
   * Current transform being applied (for real-time feedback)
   */
  activeTransform?: {
    type: 'position' | 'scale' | 'rotation';
    value: Transform;
  };
  
  /**
   * Callback when transform starts
   */
  onTransformStart?: (type: 'position' | 'scale' | 'rotation', handle: string, event: React.MouseEvent) => void;
  
  /**
   * Callback when transform updates
   */
  onTransformUpdate?: (transform: Transform) => void;
  
  /**
   * Callback when transform ends
   */
  onTransformEnd?: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const HANDLE_SIZE = 8;
const HANDLE_COLOR = '#3b82f6'; // blue-500
const HANDLE_HOVER_COLOR = '#60a5fa'; // blue-400
const HANDLE_STROKE_WIDTH = 2;
const ROTATION_HANDLE_OFFSET = 30; // pixels above panel
const ROTATION_HANDLE_RADIUS = 6;
const EDGE_HANDLE_SIZE = 12;

// ============================================================================
// Component
// ============================================================================

export const TransformGizmo: React.FC<TransformGizmoProps> = ({
  bounds,
  activeTransform,
  onTransformStart,
}) => {
  const [hoveredHandle, setHoveredHandle] = React.useState<string | null>(null);

  // ============================================================================
  // Handle Positions
  // ============================================================================

  /**
   * Calculate corner handle positions
   */
  const getCornerHandles = () => {
    return {
      topLeft: { x: bounds.x, y: bounds.y },
      topRight: { x: bounds.x + bounds.width, y: bounds.y },
      bottomLeft: { x: bounds.x, y: bounds.y + bounds.height },
      bottomRight: { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    };
  };

  /**
   * Calculate edge handle positions
   */
  const getEdgeHandles = () => {
    return {
      top: { x: bounds.x + bounds.width / 2, y: bounds.y },
      right: { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 },
      bottom: { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height },
      left: { x: bounds.x, y: bounds.y + bounds.height / 2 },
    };
  };

  /**
   * Calculate rotation handle position
   */
  const getRotationHandle = (): Point => {
    return {
      x: bounds.x + bounds.width / 2,
      y: bounds.y - ROTATION_HANDLE_OFFSET,
    };
  };

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleMouseDown = (
    type: 'position' | 'scale' | 'rotation',
    handle: string,
    event: React.MouseEvent
  ) => {
    event.stopPropagation();
    if (onTransformStart) {
      onTransformStart(type, handle, event);
    }
  };

  // ============================================================================
  // Render Helpers
  // ============================================================================

  /**
   * Render corner scale handles
   */
  const renderScaleHandles = () => {
    const corners = getCornerHandles();

    return (
      <g>
        {Object.entries(corners).map(([name, pos]) => {
          const isHovered = hoveredHandle === `scale-${name}`;
          const color = isHovered ? HANDLE_HOVER_COLOR : HANDLE_COLOR;

          return (
            <rect
              key={`scale-${name}`}
              x={pos.x - HANDLE_SIZE / 2}
              y={pos.y - HANDLE_SIZE / 2}
              width={HANDLE_SIZE}
              height={HANDLE_SIZE}
              fill={color}
              stroke="white"
              strokeWidth={1}
              cursor={getCursor(name)}
              onMouseDown={(e) => handleMouseDown('scale', name, e)}
              onMouseEnter={() => setHoveredHandle(`scale-${name}`)}
              onMouseLeave={() => setHoveredHandle(null)}
            />
          );
        })}
      </g>
    );
  };

  /**
   * Render edge position handles
   */
  const renderPositionHandles = () => {
    const edges = getEdgeHandles();

    return (
      <g>
        {Object.entries(edges).map(([name, pos]) => {
          const isHovered = hoveredHandle === `position-${name}`;
          const color = isHovered ? HANDLE_HOVER_COLOR : HANDLE_COLOR;

          return (
            <rect
              key={`position-${name}`}
              x={pos.x - EDGE_HANDLE_SIZE / 2}
              y={pos.y - EDGE_HANDLE_SIZE / 2}
              width={EDGE_HANDLE_SIZE}
              height={EDGE_HANDLE_SIZE}
              fill={color}
              stroke="white"
              strokeWidth={1}
              cursor="move"
              onMouseDown={(e) => handleMouseDown('position', name, e)}
              onMouseEnter={() => setHoveredHandle(`position-${name}`)}
              onMouseLeave={() => setHoveredHandle(null)}
            />
          );
        })}
      </g>
    );
  };

  /**
   * Render rotation handle
   */
  const renderRotationHandle = () => {
    const pos = getRotationHandle();
    const isHovered = hoveredHandle === 'rotation';
    const color = isHovered ? HANDLE_HOVER_COLOR : HANDLE_COLOR;

    return (
      <g>
        {/* Line connecting to panel */}
        <line
          x1={bounds.x + bounds.width / 2}
          y1={bounds.y}
          x2={pos.x}
          y2={pos.y}
          stroke={HANDLE_COLOR}
          strokeWidth={1}
          strokeDasharray="3,3"
          pointerEvents="none"
        />

        {/* Rotation handle circle */}
        <circle
          cx={pos.x}
          cy={pos.y}
          r={ROTATION_HANDLE_RADIUS}
          fill={color}
          stroke="white"
          strokeWidth={1}
          cursor="grab"
          onMouseDown={(e) => handleMouseDown('rotation', 'rotation', e)}
          onMouseEnter={() => setHoveredHandle('rotation')}
          onMouseLeave={() => setHoveredHandle(null)}
        />

        {/* Rotation icon */}
        <path
          d={`M ${pos.x - 3} ${pos.y - 2} A 3 3 0 1 1 ${pos.x + 3} ${pos.y - 2}`}
          stroke="white"
          strokeWidth={1}
          fill="none"
          pointerEvents="none"
        />
      </g>
    );
  };

  /**
   * Render numerical feedback
   */
  const renderFeedback = () => {
    if (!activeTransform) return null;

    const { type, value } = activeTransform;
    let text = '';

    switch (type) {
      case 'position':
        text = `X: ${Math.round(value.position.x)}px, Y: ${Math.round(value.position.y)}px`;
        break;
      case 'scale':
        text = `Scale: ${(value.scale.x * 100).toFixed(0)}% × ${(value.scale.y * 100).toFixed(0)}%`;
        break;
      case 'rotation':
        text = `Rotation: ${Math.round(value.rotation)}°`;
        break;
    }

    // Position feedback above the panel
    const feedbackX = bounds.x + bounds.width / 2;
    const feedbackY = bounds.y - 50;

    return (
      <g>
        {/* Background */}
        <rect
          x={feedbackX - 80}
          y={feedbackY - 15}
          width={160}
          height={30}
          fill="rgba(0, 0, 0, 0.8)"
          rx={4}
          pointerEvents="none"
        />

        {/* Text */}
        <text
          x={feedbackX}
          y={feedbackY + 5}
          textAnchor="middle"
          fill="white"
          fontSize={12}
          fontFamily="monospace"
          pointerEvents="none"
        >
          {text}
        </text>
      </g>
    );
  };

  /**
   * Get cursor style for handle
   */
  const getCursor = (handleName: string): string => {
    switch (handleName) {
      case 'topLeft':
      case 'bottomRight':
        return 'nwse-resize';
      case 'topRight':
      case 'bottomLeft':
        return 'nesw-resize';
      case 'top':
      case 'bottom':
        return 'ns-resize';
      case 'left':
      case 'right':
        return 'ew-resize';
      default:
        return 'default';
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <g>
      {/* Gizmo border */}
      <rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={bounds.height}
        fill="none"
        stroke={HANDLE_COLOR}
        strokeWidth={HANDLE_STROKE_WIDTH}
        pointerEvents="none"
      />

      {/* Position handles (edges) */}
      {renderPositionHandles()}

      {/* Scale handles (corners) */}
      {renderScaleHandles()}

      {/* Rotation handle */}
      {renderRotationHandle()}

      {/* Numerical feedback */}
      {renderFeedback()}
    </g>
  );
};

export default TransformGizmo;
