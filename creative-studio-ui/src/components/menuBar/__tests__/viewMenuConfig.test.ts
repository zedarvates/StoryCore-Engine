/**
 * View Menu Configuration Tests
 * 
 * Tests the integration between view menu configuration and view actions:
 * - Menu item enabled states based on view state
 * - Menu item checked states for toggles
 * - Action handlers are correctly wired
 * 
 * Requirements: 3.1-3.9, 8.1-8.4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getMenuById } from '../../../config/menuBarConfig';
import { evaluateEnabled, evaluateChecked } from '../../../types/menuConfig';
import type { AppState } from '../../../types/menuBarState';
import { DEFAULT_VIEW_STATE } from '../../../types/menuBarState';

describe('View Menu Configuration', () => {
  let mockAppState: AppState;

  beforeEach(() => {
    // Create mock app state with default view state
    mockAppState = {
      project: null,
      hasUnsavedChanges: false,
      viewState: { ...DEFAULT_VIEW_STATE },
      undoStack: {
        canUndo: false,
        canRedo: false,
        undo: () => {},
        redo: () => {},
      },
      clipboard: {
        hasContent: false,
        contentType: null,
        cut: () => {},
        copy: () => {},
        paste: () => {},
      },
      isProcessing: false,
    };
  });

  describe('Menu structure', () => {
    it('should have view menu defined', () => {
      const viewMenu = getMenuById('view');
      expect(viewMenu).toBeDefined();
      expect(viewMenu?.id).toBe('view');
      expect(viewMenu?.label).toBe('menu.view');
    });

    it('should have all required view menu items', () => {
      const viewMenu = getMenuById('view');
      expect(viewMenu).toBeDefined();

      const itemIds = viewMenu!.items.map(item => item.id);
      
      // Check for all required items
      expect(itemIds).toContain('timeline');
      expect(itemIds).toContain('zoom-in');
      expect(itemIds).toContain('zoom-out');
      expect(itemIds).toContain('reset-zoom');
      expect(itemIds).toContain('toggle-grid');
      expect(itemIds).toContain('panels');
      expect(itemIds).toContain('fullscreen');
    });

    it('should have panels submenu with all panel toggles', () => {
      const viewMenu = getMenuById('view');
      const panelsItem = viewMenu?.items.find(item => item.id === 'panels');
      
      expect(panelsItem).toBeDefined();
      expect(panelsItem?.type).toBe('submenu');
      expect(panelsItem?.submenu).toBeDefined();

      const submenuIds = panelsItem!.submenu!.map(item => item.id);
      expect(submenuIds).toContain('panel-properties');
      expect(submenuIds).toContain('panel-assets');
      expect(submenuIds).toContain('panel-preview');
    });
  });

  describe('Timeline toggle', () => {
    it('should be a toggle type menu item', () => {
      const viewMenu = getMenuById('view');
      const timelineItem = viewMenu?.items.find(item => item.id === 'timeline');
      
      expect(timelineItem?.type).toBe('toggle');
    });

    it('should be enabled', () => {
      const viewMenu = getMenuById('view');
      const timelineItem = viewMenu?.items.find(item => item.id === 'timeline');
      
      const enabled = evaluateEnabled(timelineItem!.enabled, mockAppState);
      expect(enabled).toBe(true);
    });

    it('should be checked when timeline is visible', () => {
      mockAppState.viewState.timelineVisible = true;
      
      const viewMenu = getMenuById('view');
      const timelineItem = viewMenu?.items.find(item => item.id === 'timeline');
      
      const checked = evaluateChecked(timelineItem!.checked, mockAppState);
      expect(checked).toBe(true);
    });

    it('should be unchecked when timeline is hidden', () => {
      mockAppState.viewState.timelineVisible = false;
      
      const viewMenu = getMenuById('view');
      const timelineItem = viewMenu?.items.find(item => item.id === 'timeline');
      
      const checked = evaluateChecked(timelineItem!.checked, mockAppState);
      expect(checked).toBe(false);
    });

    it('should have action handler defined', () => {
      const viewMenu = getMenuById('view');
      const timelineItem = viewMenu?.items.find(item => item.id === 'timeline');
      
      expect(timelineItem?.action).toBeDefined();
      expect(typeof timelineItem?.action).toBe('function');
    });
  });

  describe('Zoom In', () => {
    it('should be an action type menu item', () => {
      const viewMenu = getMenuById('view');
      const zoomInItem = viewMenu?.items.find(item => item.id === 'zoom-in');
      
      expect(zoomInItem?.type).toBe('action');
    });

    it('should be enabled when below max zoom', () => {
      mockAppState.viewState.zoomLevel = 100;
      mockAppState.viewState.maxZoom = 400;
      
      const viewMenu = getMenuById('view');
      const zoomInItem = viewMenu?.items.find(item => item.id === 'zoom-in');
      
      const enabled = evaluateEnabled(zoomInItem!.enabled, mockAppState);
      expect(enabled).toBe(true);
    });

    it('should be disabled when at max zoom', () => {
      mockAppState.viewState.zoomLevel = 400;
      mockAppState.viewState.maxZoom = 400;
      
      const viewMenu = getMenuById('view');
      const zoomInItem = viewMenu?.items.find(item => item.id === 'zoom-in');
      
      const enabled = evaluateEnabled(zoomInItem!.enabled, mockAppState);
      expect(enabled).toBe(false);
    });

    it('should have keyboard shortcut defined', () => {
      const viewMenu = getMenuById('view');
      const zoomInItem = viewMenu?.items.find(item => item.id === 'zoom-in');
      
      expect(zoomInItem?.shortcut).toBeDefined();
      expect(zoomInItem?.shortcut?.key).toBe('=');
      expect(zoomInItem?.shortcut?.ctrl).toBe(true);
    });

    it('should have action handler defined', () => {
      const viewMenu = getMenuById('view');
      const zoomInItem = viewMenu?.items.find(item => item.id === 'zoom-in');
      
      expect(zoomInItem?.action).toBeDefined();
      expect(typeof zoomInItem?.action).toBe('function');
    });
  });

  describe('Zoom Out', () => {
    it('should be an action type menu item', () => {
      const viewMenu = getMenuById('view');
      const zoomOutItem = viewMenu?.items.find(item => item.id === 'zoom-out');
      
      expect(zoomOutItem?.type).toBe('action');
    });

    it('should be enabled when above min zoom', () => {
      mockAppState.viewState.zoomLevel = 100;
      mockAppState.viewState.minZoom = 25;
      
      const viewMenu = getMenuById('view');
      const zoomOutItem = viewMenu?.items.find(item => item.id === 'zoom-out');
      
      const enabled = evaluateEnabled(zoomOutItem!.enabled, mockAppState);
      expect(enabled).toBe(true);
    });

    it('should be disabled when at min zoom', () => {
      mockAppState.viewState.zoomLevel = 25;
      mockAppState.viewState.minZoom = 25;
      
      const viewMenu = getMenuById('view');
      const zoomOutItem = viewMenu?.items.find(item => item.id === 'zoom-out');
      
      const enabled = evaluateEnabled(zoomOutItem!.enabled, mockAppState);
      expect(enabled).toBe(false);
    });

    it('should have keyboard shortcut defined', () => {
      const viewMenu = getMenuById('view');
      const zoomOutItem = viewMenu?.items.find(item => item.id === 'zoom-out');
      
      expect(zoomOutItem?.shortcut).toBeDefined();
      expect(zoomOutItem?.shortcut?.key).toBe('-');
      expect(zoomOutItem?.shortcut?.ctrl).toBe(true);
    });

    it('should have action handler defined', () => {
      const viewMenu = getMenuById('view');
      const zoomOutItem = viewMenu?.items.find(item => item.id === 'zoom-out');
      
      expect(zoomOutItem?.action).toBeDefined();
      expect(typeof zoomOutItem?.action).toBe('function');
    });
  });

  describe('Reset Zoom', () => {
    it('should be an action type menu item', () => {
      const viewMenu = getMenuById('view');
      const resetZoomItem = viewMenu?.items.find(item => item.id === 'reset-zoom');
      
      expect(resetZoomItem?.type).toBe('action');
    });

    it('should be enabled when zoom is not 100%', () => {
      mockAppState.viewState.zoomLevel = 200;
      
      const viewMenu = getMenuById('view');
      const resetZoomItem = viewMenu?.items.find(item => item.id === 'reset-zoom');
      
      const enabled = evaluateEnabled(resetZoomItem!.enabled, mockAppState);
      expect(enabled).toBe(true);
    });

    it('should be disabled when zoom is 100%', () => {
      mockAppState.viewState.zoomLevel = 100;
      
      const viewMenu = getMenuById('view');
      const resetZoomItem = viewMenu?.items.find(item => item.id === 'reset-zoom');
      
      const enabled = evaluateEnabled(resetZoomItem!.enabled, mockAppState);
      expect(enabled).toBe(false);
    });

    it('should have keyboard shortcut defined', () => {
      const viewMenu = getMenuById('view');
      const resetZoomItem = viewMenu?.items.find(item => item.id === 'reset-zoom');
      
      expect(resetZoomItem?.shortcut).toBeDefined();
      expect(resetZoomItem?.shortcut?.key).toBe('0');
      expect(resetZoomItem?.shortcut?.ctrl).toBe(true);
    });

    it('should have action handler defined', () => {
      const viewMenu = getMenuById('view');
      const resetZoomItem = viewMenu?.items.find(item => item.id === 'reset-zoom');
      
      expect(resetZoomItem?.action).toBeDefined();
      expect(typeof resetZoomItem?.action).toBe('function');
    });
  });

  describe('Grid toggle', () => {
    it('should be a toggle type menu item', () => {
      const viewMenu = getMenuById('view');
      const gridItem = viewMenu?.items.find(item => item.id === 'toggle-grid');
      
      expect(gridItem?.type).toBe('toggle');
    });

    it('should be enabled', () => {
      const viewMenu = getMenuById('view');
      const gridItem = viewMenu?.items.find(item => item.id === 'toggle-grid');
      
      const enabled = evaluateEnabled(gridItem!.enabled, mockAppState);
      expect(enabled).toBe(true);
    });

    it('should be checked when grid is visible', () => {
      mockAppState.viewState.gridVisible = true;
      
      const viewMenu = getMenuById('view');
      const gridItem = viewMenu?.items.find(item => item.id === 'toggle-grid');
      
      const checked = evaluateChecked(gridItem!.checked, mockAppState);
      expect(checked).toBe(true);
    });

    it('should be unchecked when grid is hidden', () => {
      mockAppState.viewState.gridVisible = false;
      
      const viewMenu = getMenuById('view');
      const gridItem = viewMenu?.items.find(item => item.id === 'toggle-grid');
      
      const checked = evaluateChecked(gridItem!.checked, mockAppState);
      expect(checked).toBe(false);
    });

    it('should have action handler defined', () => {
      const viewMenu = getMenuById('view');
      const gridItem = viewMenu?.items.find(item => item.id === 'toggle-grid');
      
      expect(gridItem?.action).toBeDefined();
      expect(typeof gridItem?.action).toBe('function');
    });
  });

  describe('Panel toggles', () => {
    it('should have properties panel toggle', () => {
      const viewMenu = getMenuById('view');
      const panelsItem = viewMenu?.items.find(item => item.id === 'panels');
      const propertiesItem = panelsItem?.submenu?.find(item => item.id === 'panel-properties');
      
      expect(propertiesItem).toBeDefined();
      expect(propertiesItem?.type).toBe('toggle');
    });

    it('should have assets panel toggle', () => {
      const viewMenu = getMenuById('view');
      const panelsItem = viewMenu?.items.find(item => item.id === 'panels');
      const assetsItem = panelsItem?.submenu?.find(item => item.id === 'panel-assets');
      
      expect(assetsItem).toBeDefined();
      expect(assetsItem?.type).toBe('toggle');
    });

    it('should have preview panel toggle', () => {
      const viewMenu = getMenuById('view');
      const panelsItem = viewMenu?.items.find(item => item.id === 'panels');
      const previewItem = panelsItem?.submenu?.find(item => item.id === 'panel-preview');
      
      expect(previewItem).toBeDefined();
      expect(previewItem?.type).toBe('toggle');
    });

    it('should show properties panel as checked when visible', () => {
      mockAppState.viewState.panelsVisible.properties = true;
      
      const viewMenu = getMenuById('view');
      const panelsItem = viewMenu?.items.find(item => item.id === 'panels');
      const propertiesItem = panelsItem?.submenu?.find(item => item.id === 'panel-properties');
      
      const checked = evaluateChecked(propertiesItem!.checked, mockAppState);
      expect(checked).toBe(true);
    });

    it('should show assets panel as checked when visible', () => {
      mockAppState.viewState.panelsVisible.assets = true;
      
      const viewMenu = getMenuById('view');
      const panelsItem = viewMenu?.items.find(item => item.id === 'panels');
      const assetsItem = panelsItem?.submenu?.find(item => item.id === 'panel-assets');
      
      const checked = evaluateChecked(assetsItem!.checked, mockAppState);
      expect(checked).toBe(true);
    });

    it('should show preview panel as checked when visible', () => {
      mockAppState.viewState.panelsVisible.preview = true;
      
      const viewMenu = getMenuById('view');
      const panelsItem = viewMenu?.items.find(item => item.id === 'panels');
      const previewItem = panelsItem?.submenu?.find(item => item.id === 'panel-preview');
      
      const checked = evaluateChecked(previewItem!.checked, mockAppState);
      expect(checked).toBe(true);
    });

    it('should have action handlers for all panel toggles', () => {
      const viewMenu = getMenuById('view');
      const panelsItem = viewMenu?.items.find(item => item.id === 'panels');
      
      const propertiesItem = panelsItem?.submenu?.find(item => item.id === 'panel-properties');
      const assetsItem = panelsItem?.submenu?.find(item => item.id === 'panel-assets');
      const previewItem = panelsItem?.submenu?.find(item => item.id === 'panel-preview');
      
      expect(propertiesItem?.action).toBeDefined();
      expect(assetsItem?.action).toBeDefined();
      expect(previewItem?.action).toBeDefined();
    });
  });

  describe('Fullscreen toggle', () => {
    it('should be a toggle type menu item', () => {
      const viewMenu = getMenuById('view');
      const fullscreenItem = viewMenu?.items.find(item => item.id === 'fullscreen');
      
      expect(fullscreenItem?.type).toBe('toggle');
    });

    it('should be enabled', () => {
      const viewMenu = getMenuById('view');
      const fullscreenItem = viewMenu?.items.find(item => item.id === 'fullscreen');
      
      const enabled = evaluateEnabled(fullscreenItem!.enabled, mockAppState);
      expect(enabled).toBe(true);
    });

    it('should be checked when fullscreen is active', () => {
      mockAppState.viewState.fullScreen = true;
      
      const viewMenu = getMenuById('view');
      const fullscreenItem = viewMenu?.items.find(item => item.id === 'fullscreen');
      
      const checked = evaluateChecked(fullscreenItem!.checked, mockAppState);
      expect(checked).toBe(true);
    });

    it('should be unchecked when fullscreen is inactive', () => {
      mockAppState.viewState.fullScreen = false;
      
      const viewMenu = getMenuById('view');
      const fullscreenItem = viewMenu?.items.find(item => item.id === 'fullscreen');
      
      const checked = evaluateChecked(fullscreenItem!.checked, mockAppState);
      expect(checked).toBe(false);
    });

    it('should have keyboard shortcut defined', () => {
      const viewMenu = getMenuById('view');
      const fullscreenItem = viewMenu?.items.find(item => item.id === 'fullscreen');
      
      expect(fullscreenItem?.shortcut).toBeDefined();
      expect(fullscreenItem?.shortcut?.key).toBe('F11');
    });

    it('should have action handler defined', () => {
      const viewMenu = getMenuById('view');
      const fullscreenItem = viewMenu?.items.find(item => item.id === 'fullscreen');
      
      expect(fullscreenItem?.action).toBeDefined();
      expect(typeof fullscreenItem?.action).toBe('function');
    });
  });

  describe('Menu item visual indicators', () => {
    it('should have icons for all main menu items', () => {
      const viewMenu = getMenuById('view');
      
      const timeline = viewMenu?.items.find(item => item.id === 'timeline');
      const zoomIn = viewMenu?.items.find(item => item.id === 'zoom-in');
      const zoomOut = viewMenu?.items.find(item => item.id === 'zoom-out');
      const resetZoom = viewMenu?.items.find(item => item.id === 'reset-zoom');
      const grid = viewMenu?.items.find(item => item.id === 'toggle-grid');
      const panels = viewMenu?.items.find(item => item.id === 'panels');
      const fullscreen = viewMenu?.items.find(item => item.id === 'fullscreen');
      
      expect(timeline?.icon).toBeDefined();
      expect(zoomIn?.icon).toBeDefined();
      expect(zoomOut?.icon).toBeDefined();
      expect(resetZoom?.icon).toBeDefined();
      expect(grid?.icon).toBeDefined();
      expect(panels?.icon).toBeDefined();
      expect(fullscreen?.icon).toBeDefined();
    });

    it('should have descriptions for all main menu items', () => {
      const viewMenu = getMenuById('view');
      
      const timeline = viewMenu?.items.find(item => item.id === 'timeline');
      const zoomIn = viewMenu?.items.find(item => item.id === 'zoom-in');
      const zoomOut = viewMenu?.items.find(item => item.id === 'zoom-out');
      const resetZoom = viewMenu?.items.find(item => item.id === 'reset-zoom');
      const grid = viewMenu?.items.find(item => item.id === 'toggle-grid');
      const panels = viewMenu?.items.find(item => item.id === 'panels');
      const fullscreen = viewMenu?.items.find(item => item.id === 'fullscreen');
      
      expect(timeline?.description).toBeDefined();
      expect(zoomIn?.description).toBeDefined();
      expect(zoomOut?.description).toBeDefined();
      expect(resetZoom?.description).toBeDefined();
      expect(grid?.description).toBeDefined();
      expect(panels?.description).toBeDefined();
      expect(fullscreen?.description).toBeDefined();
    });

    it('should have separators between logical groups', () => {
      const viewMenu = getMenuById('view');
      const separators = viewMenu?.items.filter(item => item.type === 'separator');
      
      // Should have at least 3 separators (after timeline, after zoom controls, after panels)
      expect(separators?.length).toBeGreaterThanOrEqual(3);
    });
  });
});
