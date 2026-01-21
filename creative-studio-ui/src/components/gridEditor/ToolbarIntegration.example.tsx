/**
 * Toolbar Integration Example
 * 
 * This example demonstrates how to integrate the Toolbar component
 * and useKeyboardShortcuts hook into a Grid Editor application.
 */

import React, { useState } from 'react';
import { Toolbar } from './Toolbar';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { useGridStore } from '../../stores/gridEditorStore';

// ============================================================================
// Example: Basic Toolbar Integration
// ============================================================================

export const BasicToolbarExample: React.FC = () => {
  const gridBounds = { width: 1920, height: 1080 };

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar at the top */}
      <Toolbar
        gridBounds={gridBounds}
        onToolChange={(tool) => {
          ;
        }}
      />

      {/* Grid editor content */}
      <div style={{ flex: 1, backgroundColor: '#1a1a1a', position: 'relative' }}>
        <div style={{ color: '#ccc', padding: '20px' }}>
          <h2>Grid Editor Canvas</h2>
          <p>Use the toolbar above to select tools and control the viewport.</p>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Example: Toolbar with Keyboard Shortcuts
// ============================================================================

export const ToolbarWithKeyboardShortcutsExample: React.FC = () => {
  const gridBounds = { width: 1920, height: 1080 };
  const [lastShortcut, setLastShortcut] = useState<string>('');

  // Enable keyboard shortcuts
  useKeyboardShortcuts({
    enabled: true,
    gridBounds,
    onShortcut: (action, key) => {
      `);
      setLastShortcut(`${action} (${key})`);
    },
    onDelete: () => {
      ;
      // Implement delete logic here
    },
    onDuplicate: () => {
      ;
      // Implement duplicate logic here
    },
  });

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <Toolbar gridBounds={gridBounds} />

      {/* Grid editor content */}
      <div style={{ flex: 1, backgroundColor: '#1a1a1a', position: 'relative' }}>
        <div style={{ color: '#ccc', padding: '20px' }}>
          <h2>Grid Editor with Keyboard Shortcuts</h2>
          <p>Try pressing keyboard shortcuts:</p>
          <ul>
            <li>V - Select tool</li>
            <li>C - Crop tool</li>
            <li>R - Rotate tool</li>
            <li>S - Scale tool</li>
            <li>Space - Pan tool (hold)</li>
            <li>Ctrl+Z - Undo</li>
            <li>Ctrl+Shift+Z - Redo</li>
            <li>[ / ] - Cycle panels</li>
            <li>F - Focus mode</li>
            <li>Escape - Deselect all</li>
          </ul>
          {lastShortcut && (
            <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#2a2a2a', borderRadius: '4px' }}>
              <strong>Last shortcut:</strong> {lastShortcut}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Example: Complete Grid Editor Integration
// ============================================================================

export const CompleteGridEditorExample: React.FC = () => {
  const gridBounds = { width: 1920, height: 1080 };
  const activeTool = useGridStore((state) => state.activeTool);
  const selectedPanelIds = useGridStore((state) => state.selectedPanelIds);

  // Keyboard shortcuts with full callbacks
  useKeyboardShortcuts({
    enabled: true,
    gridBounds,
    onShortcut: (action, key) => {
      `);
    },
    onDelete: () => {
      if (selectedPanelIds.length > 0) {
        ;
        // Implement delete logic
        // Example: Clear layers from selected panels
        selectedPanelIds.forEach((panelId) => {
          const panel = useGridStore.getState().getPanelById(panelId);
          if (panel) {
            panel.layers.forEach((layer) => {
              useGridStore.getState().removeLayer(panelId, layer.id);
            });
          }
        });
      }
    },
    onDuplicate: () => {
      if (selectedPanelIds.length === 1) {
        const sourcePanelId = selectedPanelIds[0];
        ;
        // Implement duplicate logic
        // Example: Copy to clipboard
        useGridStore.getState().copyPanel(sourcePanelId);
      }
    },
  });

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <Toolbar
        gridBounds={gridBounds}
        onToolChange={(tool) => {
          ;
        }}
      />

      {/* Status bar */}
      <div
        style={{
          padding: '8px 16px',
          backgroundColor: '#2a2a2a',
          borderBottom: '1px solid #444',
          color: '#ccc',
          fontSize: '12px',
          display: 'flex',
          gap: '20px',
        }}
      >
        <div>
          <strong>Active Tool:</strong> {activeTool}
        </div>
        <div>
          <strong>Selected Panels:</strong> {selectedPanelIds.length}
        </div>
      </div>

      {/* Grid editor content */}
      <div style={{ flex: 1, backgroundColor: '#1a1a1a', position: 'relative' }}>
        {/* Your grid renderer, viewport, and interaction layer go here */}
        <div style={{ color: '#ccc', padding: '20px' }}>
          <h2>Complete Grid Editor</h2>
          <p>This example shows full integration with toolbar and keyboard shortcuts.</p>
          <p>Current tool: <strong>{activeTool}</strong></p>
          <p>Selected panels: <strong>{selectedPanelIds.length}</strong></p>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Example: Conditional Keyboard Shortcuts
// ============================================================================

export const ConditionalShortcutsExample: React.FC = () => {
  const [shortcutsEnabled, setShortcutsEnabled] = useState(true);
  const gridBounds = { width: 1920, height: 1080 };

  useKeyboardShortcuts({
    enabled: shortcutsEnabled,
    gridBounds,
    onShortcut: (action, key) => {
      `);
    },
  });

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Toolbar gridBounds={gridBounds} />

      <div style={{ padding: '20px', backgroundColor: '#1a1a1a', color: '#ccc' }}>
        <h2>Conditional Keyboard Shortcuts</h2>
        <p>Toggle keyboard shortcuts on/off:</p>
        <button
          onClick={() => setShortcutsEnabled(!shortcutsEnabled)}
          style={{
            padding: '8px 16px',
            backgroundColor: shortcutsEnabled ? '#4a90e2' : '#666',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Shortcuts: {shortcutsEnabled ? 'Enabled' : 'Disabled'}
        </button>
        <p style={{ marginTop: '20px' }}>
          {shortcutsEnabled
            ? 'Try pressing V, C, R, or S to change tools'
            : 'Keyboard shortcuts are disabled'}
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// Example: Custom Toolbar Styling
// ============================================================================

export const CustomStyledToolbarExample: React.FC = () => {
  const gridBounds = { width: 1920, height: 1080 };

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar with custom className */}
      <Toolbar
        className="custom-toolbar"
        gridBounds={gridBounds}
        onToolChange={(tool) => {
          ;
        }}
      />

      {/* Add custom styles */}
      <style>{`
        .custom-toolbar {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
      `}</style>

      <div style={{ flex: 1, backgroundColor: '#1a1a1a' }}>
        <div style={{ color: '#ccc', padding: '20px' }}>
          <h2>Custom Styled Toolbar</h2>
          <p>The toolbar has custom styling applied via className.</p>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Export All Examples
// ============================================================================

export default {
  BasicToolbarExample,
  ToolbarWithKeyboardShortcutsExample,
  CompleteGridEditorExample,
  ConditionalShortcutsExample,
  CustomStyledToolbarExample,
};
