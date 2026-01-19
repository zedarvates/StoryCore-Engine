/**
 * SelectionBox Component - SVG overlay for panel selection
 * 
 * Renders selection indicators around selected panels and handles:
 * - Click events for panel selection
 * - Shift+click for multi-select
 * - Escape key to deselect all
 * 
 * Requirements: 1.5, 2.1, 2.2, 2.3, 2.4
 */

import React, { useEffect, useCallback } from 'react';
import { useGridStore } from '../../stores/gridEditorStore';
import type { Panel, Rectangle } from '../../stores/gridEditorStore';

// ============================================================================
// Type Definitions
// ============================================================================

export interface SelectionBoxProps {
  /**
   * Panels to render selection boxes for
   */
  panels: Panel[];
  
  /**
   * Function to calculate panel bounds in screen space
   */
  getPanelBounds: (panel: Panel) => Rectangle;
  
  /**
   * Callback when a panel is clicked
   */
  onPanelClick?: (panelId: string, event: React.MouseEvent) => void;
}

// ============================================================================
// Constants
// ============================================================================

const SELECTION_STROKE_WIDTH = 2;
const SELECTION_COLOR = '#3b82f6'; // blue-500
const SELECTION_HOVER_COLOR = '#60a5fa'; // blue-400
const SELECTION_DASH_ARRAY = '5,5';

// ============================================================================
// Component
// ============================================================================

export const SelectionBox: React.FC<SelectionBoxProps> = ({
  panels,
  getPanelBounds,
  onPanelClick,
}) => {
  const selectedPanelIds = useGridStore((state) => state.selectedPanelIds);
  const selectPanel = useGridStore((state) => state.selectPanel);
  const deselectAll = useGridStore((state) => state.deselectAll);

  const [hoveredPanelId, setHoveredPanelId] = React.useState<string | null>(null);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  /**
   * Handle panel click
   * Requirements: 2.1, 2.2, 2.3
   */
  const handlePanelClick = useCallback(
    (panelId: string, event: React.MouseEvent) => {
      event.stopPropagation();

      // Check if Shift key is held for multi-select
      const addToSelection = event.shiftKey;

      // Select the panel
      selectPanel(panelId, addToSelection);

      // Call optional callback
      if (onPanelClick) {
        onPanelClick(panelId, event);
      }
    },
    [selectPanel, onPanelClick]
  );

  /**
   * Handle background click (deselect all)
   * Requirements: 2.4
   */
  const handleBackgroundClick = useCallback(
    (event: React.MouseEvent) => {
      // Only deselect if clicking directly on the SVG background
      if (event.target === event.currentTarget) {
        deselectAll();
      }
    },
    [deselectAll]
  );

  /**
   * Handle Escape key to deselect all
   * Requirements: 2.4
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        deselectAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [deselectAll]);

  // ============================================================================
  // Render Helpers
  // ============================================================================

  /**
   * Render selection indicator for a panel
   */
  const renderSelectionIndicator = (panel: Panel, bounds: Rectangle) => {
    const isSelected = selectedPanelIds.includes(panel.id);
    const isHovered = hoveredPanelId === panel.id;

    if (!isSelected && !isHovered) {
      return null;
    }

    const color = isSelected ? SELECTION_COLOR : SELECTION_HOVER_COLOR;
    const strokeWidth = isSelected ? SELECTION_STROKE_WIDTH : 1;

    return (
      <g key={`selection-${panel.id}`}>
        {/* Selection border */}
        <rect
          x={bounds.x}
          y={bounds.y}
          width={bounds.width}
          height={bounds.height}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={isSelected ? undefined : SELECTION_DASH_ARRAY}
          pointerEvents="none"
        />

        {/* Corner indicators for selected panels */}
        {isSelected && (
          <>
            {/* Top-left corner */}
            <rect
              x={bounds.x - 4}
              y={bounds.y - 4}
              width={8}
              height={8}
              fill={color}
              pointerEvents="none"
            />

            {/* Top-right corner */}
            <rect
              x={bounds.x + bounds.width - 4}
              y={bounds.y - 4}
              width={8}
              height={8}
              fill={color}
              pointerEvents="none"
            />

            {/* Bottom-left corner */}
            <rect
              x={bounds.x - 4}
              y={bounds.y + bounds.height - 4}
              width={8}
              height={8}
              fill={color}
              pointerEvents="none"
            />

            {/* Bottom-right corner */}
            <rect
              x={bounds.x + bounds.width - 4}
              y={bounds.y + bounds.height - 4}
              width={8}
              height={8}
              fill={color}
              pointerEvents="none"
            />
          </>
        )}
      </g>
    );
  };

  /**
   * Render clickable area for a panel
   */
  const renderClickableArea = (panel: Panel, bounds: Rectangle) => {
    return (
      <rect
        key={`clickable-${panel.id}`}
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={bounds.height}
        fill="transparent"
        cursor="pointer"
        onClick={(e) => handlePanelClick(panel.id, e)}
        onMouseEnter={() => setHoveredPanelId(panel.id)}
        onMouseLeave={() => setHoveredPanelId(null)}
      />
    );
  };

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
        pointerEvents: 'all',
      }}
      onClick={handleBackgroundClick}
    >
      {/* Render clickable areas for all panels */}
      {panels.map((panel) => {
        const bounds = getPanelBounds(panel);
        return renderClickableArea(panel, bounds);
      })}

      {/* Render selection indicators */}
      {panels.map((panel) => {
        const bounds = getPanelBounds(panel);
        return renderSelectionIndicator(panel, bounds);
      })}
    </svg>
  );
};

export default SelectionBox;
