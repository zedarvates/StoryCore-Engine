/**
 * GridLayout Example Usage
 * 
 * Demonstrates how to use the GridLayout system with snap-to-grid,
 * alignment guides, and distribute evenly functionality.
 */

import React, { useState } from 'react';
import { GridLayoutContainer } from './GridLayoutContainer';
import type { GridLayoutConfig, GridPanel } from '../../types/gridEditorAdvanced';
import type { Shot } from '../../types';

// Example: Create a grid layout for a storyboard
export const GridLayoutExample: React.FC = () => {
  // Initial grid configuration (Exigences: 3.1, 3.4, 3.6)
  const [config] = useState<GridLayoutConfig>({
    columns: 4,
    rows: 3,
    gap: 16,
    cellSize: { width: 200, height: 150 },
    snapEnabled: true,
    snapThreshold: 20,
    showGridLines: true
  });

  // Example shots/panels
  const [items] = useState<GridPanel[]>([
    {
      id: 'panel-1',
      position: { x: 0, y: 0 },
      size: { width: 200, height: 150 },
      content: {
        id: 'shot-1',
        title: 'Opening Scene',
        description: 'Wide establishing shot',
        duration: 5,
        position: 0,
        audioTracks: [],
        effects: [],
        textLayers: [],
        animations: []
      } as Shot,
      zIndex: 1
    },
    {
      id: 'panel-2',
      position: { x: 216, y: 0 },
      size: { width: 200, height: 150 },
      content: {
        id: 'shot-2',
        title: 'Character Introduction',
        description: 'Medium shot of protagonist',
        duration: 3,
        position: 1,
        audioTracks: [],
        effects: [],
        textLayers: [],
        animations: []
      } as Shot,
      zIndex: 1
    },
    {
      id: 'panel-3',
      position: { x: 432, y: 0 },
      size: { width: 200, height: 150 },
      content: {
        id: 'shot-3',
        title: 'Action Sequence',
        description: 'Dynamic camera movement',
        duration: 8,
        position: 2,
        audioTracks: [],
        effects: [],
        textLayers: [],
        animations: []
      } as Shot,
      zIndex: 1
    }
  ]);

  const handleLayoutChange = (newItems: GridPanel[]) => {
    console.log('Layout changed:', newItems);
    // Save to state or backend
  };

  const handleConfigChange = (newConfig: GridLayoutConfig) => {
    console.log('Config changed:', newConfig);
    // Save configuration
  };

  return (
    <div style={{ width: '100%', height: '600px', backgroundColor: '#1a1a1a' }}>
      <GridLayoutContainer
        initialConfig={config}
        initialItems={items}
        onLayoutChange={handleLayoutChange}
        onConfigChange={handleConfigChange}
      />

      {/* Instructions */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '16px',
        borderRadius: '8px',
        maxWidth: '400px'
      }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Grid Layout Controls</h3>
        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', lineHeight: '1.6' }}>
          <li><strong>Drag panels</strong> to move them (snaps to grid)</li>
          <li><strong>Hold Shift</strong> while dragging to disable snap (Exigence 3.2)</li>
          <li><strong>Select multiple panels</strong> to use Distribute Evenly (Exigence 3.8)</li>
          <li><strong>Green guides</strong> appear when panels align (Exigence 3.7)</li>
          <li><strong>Toggle Grid Lines</strong> to show/hide grid (Exigence 3.4)</li>
          <li><strong>Toggle Snap</strong> to enable/disable snap-to-grid (Exigence 3.1)</li>
        </ul>
      </div>
    </div>
  );
};

// Example: Different grid sizes (Exigence 3.6)
export const GridSizeExample: React.FC = () => {
  const [gridSize, setGridSize] = useState<8 | 16 | 24 | 32>(16);

  const config: GridLayoutConfig = {
    columns: 6,
    rows: 4,
    gap: gridSize / 2,
    cellSize: { width: gridSize * 10, height: gridSize * 8 },
    snapEnabled: true,
    snapThreshold: gridSize,
    showGridLines: true
  };

  return (
    <div style={{ width: '100%', height: '600px', backgroundColor: '#1a1a1a' }}>
      {/* Grid size selector */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 200,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: '12px',
        borderRadius: '8px'
      }}>
        <label style={{ color: 'white', marginRight: '12px' }}>Grid Size:</label>
        {[8, 16, 24, 32].map(size => (
          <button
            key={size}
            onClick={() => setGridSize(size as 8 | 16 | 24 | 32)}
            style={{
              padding: '6px 12px',
              margin: '0 4px',
              backgroundColor: gridSize === size ? '#2196F3' : 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {size}px
          </button>
        ))}
      </div>

      <GridLayoutContainer
        initialConfig={config}
        initialItems={[]}
        onLayoutChange={(items) => console.log('Layout changed:', items)}
        onConfigChange={(cfg) => console.log('Config changed:', cfg)}
      />
    </div>
  );
};

// Example: Resize constraints (Exigence 3.3)
export const ResizeConstraintsExample: React.FC = () => {
  const config: GridLayoutConfig = {
    columns: 4,
    rows: 3,
    gap: 16,
    cellSize: { width: 200, height: 150 },
    snapEnabled: true,
    snapThreshold: 20,
    showGridLines: true
  };

  const items: GridPanel[] = [
    {
      id: 'resizable-panel',
      position: { x: 0, y: 0 },
      size: { width: 200, height: 150 }, // Will be constrained to grid multiples
      content: {
        id: 'shot-resize',
        title: 'Resizable Panel',
        description: 'Try resizing - constrained to grid dimensions',
        duration: 5,
        position: 0,
        audioTracks: [],
        effects: [],
        textLayers: [],
        animations: []
      } as Shot,
      zIndex: 1
    }
  ];

  return (
    <div style={{ width: '100%', height: '600px', backgroundColor: '#1a1a1a' }}>
      <GridLayoutContainer
        initialConfig={config}
        initialItems={items}
        onLayoutChange={(newItems) => {
          console.log('Resized items:', newItems);
          // Size will always be a multiple of cellSize + gap
        }}
      />

      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '16px',
        borderRadius: '8px'
      }}>
        <p style={{ margin: 0 }}>
          <strong>Resize Constraints:</strong> Panel sizes are automatically constrained
          to valid grid dimensions (multiples of cell size + gap).
        </p>
      </div>
    </div>
  );
};
