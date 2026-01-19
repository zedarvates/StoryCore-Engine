/**
 * Focus Mode Integration Example
 * 
 * This example demonstrates how to integrate focus mode functionality
 * into the Grid Editor, including:
 * - Double-click to enter focus mode
 * - Exit focus button
 * - Escape key to exit
 * - Smooth transitions
 * - Selection state preservation
 * 
 * Requirements: 2.5, 2.6, 2.7
 */

import React, { useCallback } from 'react';
import { Viewport } from './Viewport';
import { GridRenderer } from './GridRenderer';
import { useGridStore } from '../../stores/gridEditorStore';
import { useViewportStore } from '../../stores/viewportStore';

/**
 * Example Grid Editor with Focus Mode
 */
export const GridEditorWithFocusMode: React.FC = () => {
  // ============================================================================
  // Store State
  // ============================================================================
  
  const {
    config,
    selectedPanelIds,
    selectPanel,
  } = useGridEditorStore();

  const {
    zoom,
    pan,
    focusedPanelId,
    focusPanel,
    exitFocusMode,
    getViewportState,
  } = useViewportStore();

  // ============================================================================
  // Panel Click Handler
  // ============================================================================
  
  const handlePanelClick = useCallback((panelId: string, event: React.MouseEvent) => {
    // Handle selection with Shift modifier for multi-select
    const addToSelection = event.shiftKey;
    selectPanel(panelId, addToSelection);
  }, [selectPanel]);

  // ============================================================================
  // Panel Double-Click Handler - Enter Focus Mode
  // Requirements: 2.5
  // ============================================================================
  
  const handlePanelDoubleClick = useCallback((panelId: string, event: React.MouseEvent) => {
    event.preventDefault();
    
    // Find the panel to get its bounds
    const panel = config.panels.find(p => p.id === panelId);
    if (!panel) return;

    // Calculate panel bounds based on grid layout
    // Assuming 3x3 grid with 1920x1080 total size
    const GRID_SIZE = 3;
    const TOTAL_WIDTH = 1920;
    const TOTAL_HEIGHT = 1080;
    const cellWidth = TOTAL_WIDTH / GRID_SIZE;
    const cellHeight = TOTAL_HEIGHT / GRID_SIZE;

    const panelBounds = {
      width: cellWidth,
      height: cellHeight,
    };

    // Enter focus mode (Requirements: 2.5, 2.6)
    // This will:
    // - Calculate zoom to maximize panel display
    // - Calculate pan to center panel
    // - Preserve selection state (managed by GridStore)
    focusPanel(panelId, panelBounds);
  }, [config.panels, focusPanel]);

  // ============================================================================
  // Render
  // ============================================================================
  
  return (
    <div style={styles.container}>
      {/* Info Panel */}
      <div style={styles.infoPanel}>
        <h3 style={styles.infoTitle}>Focus Mode Controls</h3>
        <ul style={styles.infoList}>
          <li><strong>Double-click</strong> a panel to enter focus mode</li>
          <li><strong>Escape</strong> key to exit focus mode</li>
          <li><strong>Exit Focus</strong> button to exit focus mode</li>
          <li>Selection state is preserved during focus mode</li>
        </ul>
        {focusedPanelId && (
          <div style={styles.focusIndicator}>
            <strong>Focus Mode Active</strong>
            <br />
            Focused Panel: {focusedPanelId}
          </div>
        )}
      </div>

      {/* Viewport with Grid Renderer */}
      <Viewport
        gridBounds={{ width: 1920, height: 1080 }}
        showMinimap={true}
      >
        <GridRenderer
          panels={config.panels}
          selectedPanelIds={selectedPanelIds}
          viewport={getViewportState()}
          onPanelClick={handlePanelClick}
          onPanelDoubleClick={handlePanelDoubleClick}
        />
      </Viewport>
    </div>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#1a1a1a',
  },
  infoPanel: {
    padding: 16,
    background: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  infoTitle: {
    margin: '0 0 12px 0',
    fontSize: 16,
    fontWeight: 600,
  },
  infoList: {
    margin: 0,
    paddingLeft: 20,
    fontSize: 14,
    lineHeight: 1.6,
  },
  focusIndicator: {
    marginTop: 12,
    padding: 12,
    background: 'rgba(33, 150, 243, 0.2)',
    border: '1px solid rgba(33, 150, 243, 0.5)',
    borderRadius: 4,
    fontSize: 14,
  },
};

// ============================================================================
// Usage Example
// ============================================================================

/**
 * Example usage in a parent component:
 * 
 * ```tsx
 * import { GridEditorWithFocusMode } from './FocusModeIntegration.example';
 * 
 * function App() {
 *   return (
 *     <div>
 *       <h1>Grid Editor with Focus Mode</h1>
 *       <GridEditorWithFocusMode />
 *     </div>
 *   );
 * }
 * ```
 */

// ============================================================================
// Advanced Usage: Custom Focus Behavior
// ============================================================================

/**
 * Example with custom focus behavior:
 * 
 * ```tsx
 * const handleCustomFocus = useCallback((panelId: string) => {
 *   // Custom logic before entering focus mode
 *   console.log('Entering focus mode for panel:', panelId);
 *   
 *   // Calculate custom panel bounds
 *   const customBounds = calculateCustomBounds(panelId);
 *   
 *   // Enter focus mode with custom bounds
 *   focusPanel(panelId, customBounds);
 *   
 *   // Custom logic after entering focus mode
 *   // e.g., load high-resolution version of the panel
 *   loadHighResPanel(panelId);
 * }, [focusPanel]);
 * ```
 */

// ============================================================================
// Testing Focus Mode
// ============================================================================

/**
 * Test cases for focus mode:
 * 
 * 1. Double-click panel → Should enter focus mode
 * 2. Press Escape → Should exit focus mode
 * 3. Click Exit Focus button → Should exit focus mode
 * 4. Selection state → Should be preserved during focus mode
 * 5. Zoom and pan → Should be calculated to maximize panel display
 * 6. Transition → Should animate smoothly between grid and focus views
 * 7. Minimap → Should hide when in focus mode
 */

export default GridEditorWithFocusMode;
