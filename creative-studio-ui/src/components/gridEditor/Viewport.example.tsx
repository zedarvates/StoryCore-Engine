/**
 * Viewport Component - Usage Example
 * 
 * This file demonstrates how to use the Viewport component
 * with the GridRenderer for the Advanced Grid Editor.
 */

import React from 'react';
import { Viewport } from './Viewport';
import { GridRenderer } from './GridRenderer';
import { useGridEditorStore } from '../../stores/gridEditorStore';

/**
 * Example: Basic Viewport Usage
 */
export const BasicViewportExample: React.FC = () => {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Viewport
        gridBounds={{ width: 1920, height: 1080 }}
        showMinimap={true}
      >
        <div style={{ width: 1920, height: 1080, background: '#2a2a2a' }}>
          <h1 style={{ color: 'white', padding: 20 }}>Grid Content Here</h1>
        </div>
      </Viewport>
    </div>
  );
};

/**
 * Example: Viewport with GridRenderer
 */
export const ViewportWithGridExample: React.FC = () => {
  const { config } = useGridEditorStore();

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Viewport
        gridBounds={{ width: 1920, height: 1080 }}
        showMinimap={true}
      >
        <GridRenderer
          panels={config.panels}
          selectedPanelIds={[]}
          onPanelClick={(panelId) => console.log('Panel clicked:', panelId)}
        />
      </Viewport>
    </div>
  );
};

/**
 * Example: Viewport without Minimap
 */
export const ViewportWithoutMinimapExample: React.FC = () => {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Viewport
        gridBounds={{ width: 1920, height: 1080 }}
        showMinimap={false}
      >
        <div style={{ width: 1920, height: 1080, background: '#2a2a2a' }}>
          <h1 style={{ color: 'white', padding: 20 }}>No Minimap</h1>
        </div>
      </Viewport>
    </div>
  );
};

/**
 * Example: Custom Grid Bounds
 */
export const CustomBoundsExample: React.FC = () => {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Viewport
        gridBounds={{ width: 3840, height: 2160 }} // 4K resolution
        showMinimap={true}
      >
        <div style={{ width: 3840, height: 2160, background: '#2a2a2a' }}>
          <h1 style={{ color: 'white', padding: 20 }}>4K Grid</h1>
        </div>
      </Viewport>
    </div>
  );
};

/**
 * Usage Instructions:
 * 
 * 1. Wrap your grid content with the Viewport component
 * 2. Specify gridBounds to match your content dimensions
 * 3. Enable/disable minimap with showMinimap prop
 * 4. The Viewport will handle all zoom and pan interactions
 * 
 * Interactions:
 * - Mouse wheel: Zoom in/out centered on cursor
 * - Space + Drag: Pan the viewport
 * - Fit to View button: Fit entire grid in viewport
 * - 1:1 button: Zoom to 100%
 * - +/- buttons: Zoom in/out
 * - Minimap: Click to navigate (appears when zoom > 1.5x)
 */
