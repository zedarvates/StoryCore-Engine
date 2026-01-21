/**
 * GridEditorCanvas - Main Grid Editor Component
 * 
 * Integrates all grid editor components into a complete editing interface:
 * - Viewport with zoom/pan controls
 * - Grid renderer with panel display
 * - Interaction layer with transform gizmos
 * - Toolbar with editing tools
 * - Properties panel with layer management
 * - Keyboard shortcuts
 * - Error handling and notifications
 * - Responsive design and touch support
 * 
 * This is the main entry point for the Advanced Grid Editor feature.
 */

import React, { useEffect, useCallback, useRef } from 'react';
import { useGridStore } from '../../stores/gridEditorStore';
import { useViewportStore } from '../../stores/viewportStore';
import { useUndoRedoStore } from '../../stores/undoRedoStore';
import { Viewport } from './Viewport';
import { GridRenderer } from './GridRenderer';
import { InteractionLayer } from './InteractionLayer';
import { Toolbar } from './Toolbar';
import { GridEditorPropertiesPanel } from './GridEditorPropertiesPanel';
import { Minimap } from './Minimap';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { useTouchInteraction } from './useTouchInteraction';
import { GridEditorErrorBoundary } from './GridEditorErrorBoundary';
import { NotificationContainer } from './NotificationSystem';
import { ScreenReaderAnnouncer, ARIA_LABELS } from './accessibility';
import type { GridConfiguration } from '../../types/gridEditor';
import './responsive.css';

export interface GridEditorCanvasProps {
  projectId: string;
  onSave?: (config: GridConfiguration) => void;
  onExport?: (config: GridConfiguration) => void;
  initialConfig?: GridConfiguration;
  className?: string;
}

/**
 * Main Grid Editor Canvas Component
 */
export const GridEditorCanvas: React.FC<GridEditorCanvasProps> = ({
  projectId,
  onSave,
  onExport,
  initialConfig,
  className = '',
}) => {
  const config = useGridStore((state) => state.config);
  const loadConfiguration = useGridStore((state) => state.loadConfiguration);
  const exportConfiguration = useGridStore((state) => state.exportConfiguration);
  const selectedPanelIds = useGridStore((state) => state.selectedPanelIds);
  const activeTool = useGridStore((state) => state.activeTool);
  const selectPanel = useGridStore((state) => state.selectPanel);
  
  // Memoize viewport selector to prevent infinite loops
  const viewportZoom = useViewportStore((state) => state.zoom);
  const viewportPan = useViewportStore((state) => state.pan);
  const viewportBounds = useViewportStore((state) => state.bounds);
  const viewportFocusedPanelId = useViewportStore((state) => state.focusedPanelId);
  
  const viewport = React.useMemo(() => ({
    zoom: viewportZoom,
    pan: viewportPan,
    bounds: viewportBounds,
    focusedPanelId: viewportFocusedPanelId,
  }), [viewportZoom, viewportPan, viewportBounds, viewportFocusedPanelId]);
  
  // Extract undo/redo functions separately to avoid object creation
  const undo = useUndoRedoStore((state) => state.undo);
  const redo = useUndoRedoStore((state) => state.redo);

  const canvasRef = useRef<HTMLDivElement>(null);
  const announcerRef = useRef<ScreenReaderAnnouncer | null>(null);

  // Handle panel click
  const handlePanelClick = useCallback((panelId: string, event: React.MouseEvent) => {
    selectPanel(panelId, event.ctrlKey || event.metaKey);
  }, [selectPanel]);

  // Initialize screen reader announcer
  useEffect(() => {
    announcerRef.current = ScreenReaderAnnouncer.getInstance();
  }, []);

  // Announce panel selection changes
  useEffect(() => {
    if (announcerRef.current) {
      announcerRef.current.announcePanelSelection(selectedPanelIds.length);
    }
  }, [selectedPanelIds.length]);

  // Announce tool changes
  useEffect(() => {
    if (announcerRef.current && activeTool) {
      announcerRef.current.announceToolChange(activeTool);
    }
  }, [activeTool]);

  // Announce zoom changes
  useEffect(() => {
    if (announcerRef.current) {
      announcerRef.current.announceZoom(viewport.zoom);
    }
  }, [viewport.zoom]);

  // Set up touch interactions for tablets and mobile
  useTouchInteraction(canvasRef, {
    enablePinchZoom: true,
    enablePan: true,
    enableLongPress: true,
    onLongPress: (point) => {
      ;
      // Could trigger context menu or other actions
    },
    onSwipe: (direction) => {
      ;
      // Could trigger panel navigation or other actions
    },
  });

  // Load initial configuration or create default
  useEffect(() => {
    if (initialConfig) {
      loadConfiguration(initialConfig);
    } else if (!config || config.panels.length === 0) {
      // Initialize with default configuration if none exists
      const { resetConfiguration } = useGridStore.getState();
      resetConfiguration(projectId);
    }
  }, [initialConfig, loadConfiguration, projectId, config]);

  // Handle save
  const handleSave = useCallback(() => {
    const currentConfig = exportConfiguration();
    onSave?.(currentConfig);
    if (announcerRef.current) {
      announcerRef.current.announceOperation('Save', true);
    }
  }, [exportConfiguration, onSave]);

  // Handle export
  const handleExport = useCallback(() => {
    const currentConfig = exportConfiguration();
    onExport?.(currentConfig);
    if (announcerRef.current) {
      announcerRef.current.announceOperation('Export', true);
    }
  }, [exportConfiguration, onExport]);

  // Set up keyboard shortcuts
  useKeyboardShortcuts({
    onDelete: () => {
      // Handle delete action
      if (announcerRef.current) {
        announcerRef.current.announceOperation('Delete', true);
      }
    },
    onDuplicate: () => {
      // Handle duplicate action
      if (announcerRef.current) {
        announcerRef.current.announceOperation('Duplicate', true);
      }
    },
    onSave: handleSave,
    onExport: handleExport,
  });

  return (
    <GridEditorErrorBoundary>
      <div 
        ref={canvasRef} 
        className={`grid-editor-canvas flex flex-col h-full bg-gray-50 dark:bg-gray-900 ${className}`}
        role="application"
        aria-label={ARIA_LABELS.gridEditor}
      >
        {/* Toolbar */}
        <div role="toolbar" aria-label={ARIA_LABELS.toolbar}>
          <Toolbar
            gridBounds={{ width: 1920, height: 1080 }}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Canvas Area */}
          <div 
            className="flex-1 relative"
            role="region"
            aria-label={ARIA_LABELS.gridCanvas}
          >
            <Viewport>
              {/* Grid Renderer (Canvas) */}
              <GridRenderer
                panels={config?.panels || []}
                selectedPanelIds={selectedPanelIds}
                viewport={viewport}
                onPanelClick={handlePanelClick}
              />

              {/* Interaction Layer (SVG Overlay) */}
              <InteractionLayer
                panels={config?.panels || []}
                getPanelBounds={(panel) => ({
                  x: panel.position.col * 400,
                  y: panel.position.row * 400,
                  width: 400,
                  height: 400,
                })}
                width={1920}
                height={1080}
              />
            </Viewport>

            {/* Minimap */}
            {viewport.zoom > 1.5 && (
              <div 
                className="absolute bottom-4 right-4"
                role="navigation"
                aria-label={ARIA_LABELS.minimap}
              >
                <Minimap contentBounds={{ width: 1920, height: 1080 }} />
              </div>
            )}
          </div>

          {/* Properties Panel */}
          <aside 
            role="complementary"
            aria-label={ARIA_LABELS.propertiesPanel}
          >
            <GridEditorPropertiesPanel />
          </aside>
        </div>

        {/* Notification System */}
        <div role="status" aria-live="polite" aria-atomic="true">
          <NotificationContainer />
        </div>
      </div>
    </GridEditorErrorBoundary>
  );
};

export default GridEditorCanvas;
