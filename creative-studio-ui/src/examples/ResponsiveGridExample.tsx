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
import { LegacyAny } from '@/types/legacy';


import React, { useState } from 'react';
import { ResponsiveGridLayout } from '../components/gridEditor/ResponsiveGridLayout';
import { useResponsiveGrid } from '../hooks/useResponsiveGrid';
import { getLayoutPreferencesManager } from '../services/responsive/LayoutPreferences';
import type { GridLayoutConfig, GridPanel } from '../types/gridEditorAdvanced';

export const ResponsiveGridExample: React.FC = () => {
  const responsive = useResponsiveGrid();
  const preferencesManager = getLayoutPreferencesManager();

  const [items, setItems] = useState<GridPanel[]>(() => Array.from({ length: 6 }, (_, index) => {
    const number = index + 1;
    const title = `Panel ${number}`;
    return {
      id: `panel-${number}`,
      position: { x: (index % 3) * 220, y: Math.floor(index / 3) * 220 },
      size: { width: 200, height: 200 },
      content: {
        id: `shot-${number}`,
        sequencePlanId: 'grid-demo',
        sceneId: 'scene-1',
        number,
        title,
        type: 'medium',
        category: 'custom',
        composition: {
          characterIds: [], characterPositions: [], environmentId: '', props: [], lightingMood: '', timeOfDay: '',
        },
        camera: { framing: 'medium', angle: 'eye-level', movement: { type: 'static' } },
        timing: { duration: 120, inPoint: 0, outPoint: 120, transition: 'cut', transitionDuration: 0 },
        generation: {
          aiProvider: 'comfyui', model: '', prompt: title, negativePrompt: '', comfyuiPreset: '',
          parameters: { width: 1920, height: 1080, steps: 20, cfgScale: 7.5, sampler: 'euler', scheduler: 'normal' },
          styleReferences: [],
        },
        status: 'planned',
        dialogues: [],
        notes: '',
        tags: [],
        templates: [],
      },
      zIndex: 1,
    };
  }));

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
    ;
  };

  const handleFullscreen = () => {
    const elem = document.documentElement;
    if (!document.fullscreenElement) {
      elem.requestFullscreen?.() ||
      (elem as LegacyAny).webkitRequestFullscreen?.() ||
      (elem as LegacyAny).mozRequestFullScreen?.() ||
      (elem as LegacyAny).msRequestFullscreen?.();
    } else {
      document.exitFullscreen?.() ||
      (document as LegacyAny).webkitExitFullscreen?.() ||
      (document as LegacyAny).mozCancelFullScreen?.() ||
      (document as LegacyAny).msExitFullscreen?.();
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
