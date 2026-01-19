/**
 * InteractionLayer Component - SVG overlay for all interactions
 * 
 * Combines:
 * - SelectionBox for panel selection
 * - TransformGizmo for transform controls
 * - Transform interaction handlers
 * 
 * Requirements: 1.5, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 */

import React, { useCallback } from 'react';
import { useGridStore } from '../../stores/gridEditorStore';
import { SelectionBox } from './SelectionBox';
import { TransformGizmo } from './TransformGizmo';
import { useTransformInteraction } from './useTransformInteraction';
import type { Panel, Rectangle, Transform } from '../../stores/gridEditorStore';
import type { TransformType } from './useTransformInteraction';

// ============================================================================
// Type Definitions
// ============================================================================

export interface InteractionLayerProps {
  /**
   * All panels in the grid
   */
  panels: Panel[];
  
  /**
   * Function to calculate panel bounds in screen space
   */
  getPanelBounds: (panel: Panel) => Rectangle;
  
  /**
   * Width of the SVG overlay
   */
  width: number;
  
  /**
   * Height of the SVG overlay
   */
  height: number;
}

// ============================================================================
// Component
// ============================================================================

export const InteractionLayer: React.FC<InteractionLayerProps> = ({
  panels,
  getPanelBounds,
  width,
  height,
}) => {
  const selectedPanelIds = useGridStore((state) => state.selectedPanelIds);
  const activeTool = useGridStore((state) => state.activeTool);

  // Get selected panels
  const selectedPanels = panels.filter((panel) =>
    selectedPanelIds.includes(panel.id)
  );

  // ============================================================================
  // Transform Interaction State
  // ============================================================================

  // Track active transform for visual feedback (currently unused but reserved for future use)
  // const [activeTransformState, setActiveTransformState] = React.useState<{
  //   panelId: string;
  //   type: TransformType;
  //   transform: Transform;
  // } | null>(null);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
      width={width}
      height={height}
    >
      {/* Selection boxes for all panels */}
      <g style={{ pointerEvents: 'all' }}>
        <SelectionBox
          panels={panels}
          getPanelBounds={getPanelBounds}
        />
      </g>

      {/* Transform gizmos for selected panels */}
      {activeTool === 'select' && selectedPanels.map((panel) => (
        <TransformGizmoWrapper
          key={panel.id}
          panel={panel}
          bounds={getPanelBounds(panel)}
          onActiveTransformChange={() => {
            // Reserved for future use - could track active transforms for visual feedback
          }}
        />
      ))}
    </svg>
  );
};

// ============================================================================
// Transform Gizmo Wrapper Component
// ============================================================================

interface TransformGizmoWrapperProps {
  panel: Panel;
  bounds: Rectangle;
  onActiveTransformChange: (
    type: TransformType | null,
    transform: Transform | null
  ) => void;
}

const TransformGizmoWrapper: React.FC<TransformGizmoWrapperProps> = ({
  panel,
  bounds,
  onActiveTransformChange,
}) => {
  const { isTransforming, transformType, currentTransform, startTransform } =
    useTransformInteraction({
      panel,
    });

  // Update parent when transform state changes
  React.useEffect(() => {
    if (isTransforming && transformType && currentTransform) {
      onActiveTransformChange(transformType, currentTransform);
    } else {
      onActiveTransformChange(null, null);
    }
  }, [isTransforming, transformType, currentTransform, onActiveTransformChange]);

  const handleTransformStart = useCallback(
    (type: TransformType, handle: string, event: React.MouseEvent) => {
      startTransform(type, handle, { x: event.clientX, y: event.clientY });
    },
    [startTransform]
  );

  return (
    <g style={{ pointerEvents: 'all' }}>
      <TransformGizmo
        panel={panel}
        bounds={bounds}
        activeTransform={
          isTransforming && transformType && currentTransform
            ? { type: transformType, value: currentTransform }
            : undefined
        }
        onTransformStart={handleTransformStart}
      />
    </g>
  );
};

export default InteractionLayer;
