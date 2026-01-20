/**
 * ResponsiveGridExample
 * 
 * Demonstrates the responsive grid system with all features:
 * - Automatic breakpoint detection
 * - List/Grid mode switching
 * - Fullscreen support
 * - Orientation handling
 * - Preference persistence
 * 
 * Exigences: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8
 */

import React, { useState } from 'react';
import { ResponsiveGridLayout } from '../components/gridEditor/ResponsiveGridLayout';
import { useResponsiveGrid } from '../hooks/useResponsiveGrid';
import { getLayoutPreferencesManager } from '../services/responsive/LayoutPreferences';
import type { GridLayoutConfig, GridPanel } from '../types/gridEditorAdvanced';

export const ResponsiveGridExample: React.FC = () => {
  const responsive = useResponsiveGrid();
  const preferencesManager = getLayoutPreferencesManager();

  // Sample grid items
  const [items, setItems] = useState<GridPanel[]>([
    {
      id: 'panel-1',
      position: { x: 0, y: 0 },
      size: { width: 200, height: 200 },
      content: { name: 'Panel 1', type: 'shot' },
      locked: false,
      zIndex: 1
    },
    {
      id: 'panel-2',
      position: { x: 220, y: 0 },
      size: { width: 200, height: 200 },
      content: { name: 'Panel 2', type: 'shot' },
      locked: false,
      zIndex: 1
    },
    {
      id: 'panel-3',
      position: { x: 440, y: 0 },
      size: { width: 200, height: 200 },
      content: { name: 'Panel 3', type: 'shot' },
      locked: false,
      zIndex: 1
    },
    {
      id: 'panel-4',
      position: { x: 0, y: 220 },
      size: { width: 200, height: 200 },
      content: { name: 'Panel 4', type: 'shot' },
      locked: false,
      zIndex: 1
    },
    {
      id: 'panel-5',
      position: { x: 220, y: 220 },
      size: { width: 200, height: 200 },
      content: { name: 'Panel 5', type: 'shot' },
      locked: false,
      zIndex: 1
    },
    {
      id: 'panel-6',
      position: { x: 440, y: 220 },
      size: { width: 200, height: 200 },
      content: { name: 'Panel 6', type: 'shot' },
      locked: false,
      zIndex: 1
    }
  ]);

  const baseConfig: GridLayoutConfig = {
    columns: 3,
    rows: 3,
    gap: 16,
    cellSize: { width: 200, height: 200 },
    snapEnabled: true,
    snapThreshold: 10,
    showGridLines: true
  };

  const handleLayoutChange = (newItems: GridPanel[]) => {
    setItems(newItems);
    console.log('Layout changed:', newItems);
  };

  const handleFullscreen = () => {
    const elem = document.documentElement;
    if (!document.fullscreenElement) {
      elem.requestFullscreen?.() ||
      (elem as any).webkitRequestFullscreen?.() ||
      (elem as any).mozRequestFullScreen?.() ||
      (elem as any).msRequestFullscreen?.();
    } else {
      document.exitFullscreen?.() ||
      (document as any).webkitExitFullscreen?.() ||
      (document as any).mozCancelFullScreen?.() ||
      (document as any).msExitFullscreen?.();
    }
  };

  const handleExportPreferences = () => {
    const json = preferencesManager.exportPreferences();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'layout-preferences.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportPreferences = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const json = e.target?.result as string;
      const success = preferencesManager.importPreferences(json);
      if (success) {
        alert('Preferences imported successfully!');
        window.location.reload();
      } else {
        alert('Failed to import preferences');
      }
    };
    reader.readAsText(file);
  };

  const handleClearPreferences = () => {
    if (confirm('Clear all layout preferences?')) {
      preferencesManager.clearPreferences();
      window.location.reload();
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header with controls */}
      <div
        style={{
          padding: '16px',
          background: '#f5f5f5',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap'
        }}
      >
        <h2 style={{ margin: 0, flex: 1 }}>Responsive Grid Example</h2>

        {/* Responsive info */}
        <div
          style={{
            padding: '8px 12px',
            background: 'white',
            borderRadius: '4px',
            fontSize: '14px',
            border: '1px solid #e0e0e0'
          }}
        >
          <strong>{responsive.breakpoint.name}</strong> • 
          {responsive.width}x{responsive.height} • 
          {responsive.orientation} • 
          {responsive.columns} cols • 
          {responsive.useListMode ? 'List' : 'Grid'} mode
          {responsive.isFullscreen && ' • Fullscreen'}
        </div>

        {/* Controls */}
        <button
          onClick={handleFullscreen}
          style={{
            padding: '8px 16px',
            background: '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {responsive.isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        </button>

        <button
          onClick={handleExportPreferences}
          style={{
            padding: '8px 16px',
            background: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Export Preferences
        </button>

        <label
          style={{
            padding: '8px 16px',
            background: '#ff9800',
            color: 'white',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Import Preferences
          <input
            type="file"
            accept=".json"
            onChange={handleImportPreferences}
            style={{ display: 'none' }}
          />
        </label>

        <button
          onClick={handleClearPreferences}
          style={{
            padding: '8px 16px',
            background: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Clear Preferences
        </button>
      </div>

      {/* Responsive grid */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <ResponsiveGridLayout
          items={items}
          baseConfig={baseConfig}
          onLayoutChange={handleLayoutChange}
          enablePreferences={true}
          animateTransitions={true}
        />
      </div>

      {/* Instructions */}
      <div
        style={{
          padding: '16px',
          background: '#f5f5f5',
          borderTop: '1px solid #e0e0e0',
          fontSize: '14px'
        }}
      >
        <strong>Instructions:</strong>
        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
          <li>Resize the window to see breakpoint changes</li>
          <li>Try fullscreen mode for maximum space utilization</li>
          <li>Rotate your device (mobile/tablet) to see orientation handling</li>
          <li>Adjust settings - they'll be saved per breakpoint</li>
          <li>Export/import preferences to share configurations</li>
          <li>Grid mode appears on screens ≥ 1024px</li>
          <li>List mode appears on screens &lt; 1024px</li>
        </ul>
      </div>
    </div>
  );
};

export default ResponsiveGridExample;
