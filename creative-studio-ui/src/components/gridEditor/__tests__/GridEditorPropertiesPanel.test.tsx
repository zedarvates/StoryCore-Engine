/**
 * GridEditorPropertiesPanel Tests
 * 
 * Tests for the properties panel component that displays:
 * - Transform values
 * - Crop indicator and dimensions
 * - Layer information
 * 
 * Requirements: 4.8
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GridEditorPropertiesPanel } from '../GridEditorPropertiesPanel';
import { useGridStore } from '../../../stores/gridEditorStore';
import { createEmptyPanel, createTransform, createCropRegion } from '../../../types/gridEditor.factories';

describe('GridEditorPropertiesPanel', () => {
  beforeEach(() => {
    // Reset store before each test
    useGridStore.setState({
      config: {
        version: '1.0',
        projectId: 'test-project',
        panels: [],
        presets: [],
        metadata: {
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
        },
      },
      selectedPanelIds: [],
      activeTool: 'select',
      clipboard: null,
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no panel is selected', () => {
      render(<GridEditorPropertiesPanel />);
      
      expect(screen.getByText('No panel selected')).toBeInTheDocument();
      expect(screen.getByText('Select a panel to view properties')).toBeInTheDocument();
    });
  });

  describe('Multi-Selection State', () => {
    it('should display multi-selection message when multiple panels selected', () => {
      const panel1 = createEmptyPanel(0, 0);
      const panel2 = createEmptyPanel(0, 1);

      useGridStore.setState({
        config: {
          version: '1.0',
          projectId: 'test-project',
          panels: [panel1, panel2],
          presets: [],
          metadata: {
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
          },
        },
        selectedPanelIds: ['panel-0-0', 'panel-0-1'],
        activeTool: 'select',
        clipboard: null,
      });

      render(<GridEditorPropertiesPanel />);
      
      expect(screen.getByText('2 panels selected')).toBeInTheDocument();
      expect(screen.getByText('Multi-panel editing coming soon')).toBeInTheDocument();
    });
  });

  describe('Single Panel Properties', () => {
    it('should display transform properties for selected panel', () => {
      const panel = createEmptyPanel(0, 0);
      panel.transform = createTransform({
        position: { x: 100, y: 200 },
        scale: { x: 1.5, y: 1.5 },
        rotation: 45,
      });

      useGridStore.setState({
        config: {
          version: '1.0',
          projectId: 'test-project',
          panels: [panel],
          presets: [],
          metadata: {
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
          },
        },
        selectedPanelIds: ['panel-0-0'],
        activeTool: 'select',
        clipboard: null,
      });

      render(<GridEditorPropertiesPanel />);
      
      // Check panel identifier
      expect(screen.getByText(/Panel 1/)).toBeInTheDocument();
      
      // Check transform section
      expect(screen.getByText('Transform')).toBeInTheDocument();
      expect(screen.getByText('100px, 200px')).toBeInTheDocument(); // Position
      expect(screen.getByText('150%, 150%')).toBeInTheDocument(); // Scale
      expect(screen.getByText('45°')).toBeInTheDocument(); // Rotation
    });

    it('should display "No crop applied" when panel has no crop', () => {
      const panel = createEmptyPanel(0, 0);
      panel.crop = null;

      useGridStore.setState({
        config: {
          version: '1.0',
          projectId: 'test-project',
          panels: [panel],
          presets: [],
          metadata: {
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
          },
        },
        selectedPanelIds: ['panel-0-0'],
        activeTool: 'select',
        clipboard: null,
      });

      render(<GridEditorPropertiesPanel />);
      
      expect(screen.getByText('Crop')).toBeInTheDocument();
      expect(screen.getByText('No crop applied')).toBeInTheDocument();
    });

    it('should display crop indicator and dimensions when panel has active crop', () => {
      const panel = createEmptyPanel(0, 0);
      panel.crop = createCropRegion({
        x: 0.1,
        y: 0.2,
        width: 0.6,
        height: 0.5,
      });

      useGridStore.setState({
        config: {
          version: '1.0',
          projectId: 'test-project',
          panels: [panel],
          presets: [],
          metadata: {
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
          },
        },
        selectedPanelIds: ['panel-0-0'],
        activeTool: 'select',
        clipboard: null,
      });

      render(<GridEditorPropertiesPanel />);
      
      // Check crop indicator
      expect(screen.getByText('Crop Active')).toBeInTheDocument();
      
      // Check crop dimensions
      expect(screen.getByText('60% × 50%')).toBeInTheDocument();
      
      // Check crop position
      expect(screen.getByText('(10%, 20%)')).toBeInTheDocument();
      
      // Check crop area (width * height)
      expect(screen.getByText('30%')).toBeInTheDocument();
    });

    it('should display layer count', () => {
      const panel = createEmptyPanel(0, 0);
      panel.layers = [
        {
          id: 'layer-1',
          name: 'Layer 1',
          type: 'image',
          visible: true,
          locked: false,
          opacity: 1,
          blendMode: 'normal',
          content: {
            type: 'image',
            url: 'test.jpg',
            naturalWidth: 1920,
            naturalHeight: 1080,
          },
        },
        {
          id: 'layer-2',
          name: 'Layer 2',
          type: 'image',
          visible: true,
          locked: false,
          opacity: 1,
          blendMode: 'normal',
          content: {
            type: 'image',
            url: 'test2.jpg',
            naturalWidth: 1920,
            naturalHeight: 1080,
          },
        },
      ];

      useGridStore.setState({
        config: {
          version: '1.0',
          projectId: 'test-project',
          panels: [panel],
          presets: [],
          metadata: {
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
          },
        },
        selectedPanelIds: ['panel-0-0'],
        activeTool: 'select',
        clipboard: null,
      });

      render(<GridEditorPropertiesPanel />);
      
      expect(screen.getByText('Layers')).toBeInTheDocument();
      expect(screen.getByText('2 layers')).toBeInTheDocument();
    });
  });

  describe('Panel Position Display', () => {
    it('should correctly display panel position in grid', () => {
      const testCases = [
        { row: 0, col: 0, expected: 'Panel 1 (0, 0)' },
        { row: 0, col: 1, expected: 'Panel 2 (0, 1)' },
        { row: 0, col: 2, expected: 'Panel 3 (0, 2)' },
        { row: 1, col: 0, expected: 'Panel 4 (1, 0)' },
        { row: 1, col: 1, expected: 'Panel 5 (1, 1)' },
        { row: 2, col: 2, expected: 'Panel 9 (2, 2)' },
      ];

      testCases.forEach(({ row, col, expected }) => {
        const panel = createEmptyPanel(row, col);

        useGridStore.setState({
          config: {
            version: '1.0',
            projectId: 'test-project',
            panels: [panel],
            presets: [],
            metadata: {
              createdAt: new Date().toISOString(),
              modifiedAt: new Date().toISOString(),
            },
          },
          selectedPanelIds: [`panel-${row}-${col}`],
          activeTool: 'select',
          clipboard: null,
        });

        const { unmount } = render(<GridEditorPropertiesPanel />);
        
        expect(screen.getByText(expected)).toBeInTheDocument();
        
        unmount();
      });
    });
  });
});
