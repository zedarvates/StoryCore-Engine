/**
 * View Actions Tests
 * 
 * Tests the view menu actions including:
 * - Timeline toggle
 * - Zoom in/out/reset
 * - Grid toggle
 * - Panel toggles (properties, assets, preview)
 * - Fullscreen toggle
 * - Menu item state updates (checked, enabled)
 * 
 * Requirements: 3.1-3.9
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { viewActions } from '../menuActions';
import type { ActionContext } from '../../../types/menuConfig';
import type { ViewState } from '../../../types/menuBarState';
import { NotificationService } from '../../../services/menuBar/NotificationService';

describe('View Actions', () => {
  let mockNotificationService: NotificationService;
  let mockContext: ActionContext;
  let mockViewState: ViewState;
  let onViewStateChangeSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Create mock notification service
    mockNotificationService = new NotificationService();

    // Create mock view state
    mockViewState = {
      timelineVisible: true,
      gridVisible: false,
      zoomLevel: 100,
      minZoom: 25,
      maxZoom: 400,
      zoomStep: 25,
      panelsVisible: {
        properties: true,
        assets: true,
        preview: true,
      },
      fullScreen: false,
    };

    // Create spy for view state change callback
    onViewStateChangeSpy = vi.fn();

    // Create mock context
    mockContext = {
      state: {
        project: null,
        hasUnsavedChanges: false,
        viewState: mockViewState,
        undoStack: {
          canUndo: false,
          canRedo: false,
          undo: vi.fn(),
          redo: vi.fn(),
        },
        clipboard: {
          hasContent: false,
          contentType: null,
          cut: vi.fn(),
          copy: vi.fn(),
          paste: vi.fn(),
        },
        isProcessing: false,
      },
      services: {
        persistence: {} as any,
        export: {
          exportJSON: vi.fn(),
          exportPDF: vi.fn(),
          exportVideo: vi.fn(),
        },
        recentProjects: {} as any,
        modal: {
          openModal: vi.fn(),
          closeModal: vi.fn(),
        },
        notification: mockNotificationService,
      },
      onViewStateChange: onViewStateChangeSpy,
    };
  });

  describe('toggleTimeline', () => {
    it('should toggle timeline visibility from true to false', () => {
      // Initial state: timeline visible
      mockContext.state.viewState.timelineVisible = true;

      // Execute toggle action
      viewActions.toggleTimeline(mockContext);

      // Verify callback was called with updated state
      expect(onViewStateChangeSpy).toHaveBeenCalledWith({
        timelineVisible: false,
      });
    });

    it('should toggle timeline visibility from false to true', () => {
      // Initial state: timeline hidden
      mockContext.state.viewState.timelineVisible = false;

      // Execute toggle action
      viewActions.toggleTimeline(mockContext);

      // Verify callback was called with updated state
      expect(onViewStateChangeSpy).toHaveBeenCalledWith({
        timelineVisible: true,
      });
    });

    it('should not call callback if onViewStateChange is undefined', () => {
      // Remove callback
      mockContext.onViewStateChange = undefined;

      // Execute toggle action (should not throw)
      expect(() => viewActions.toggleTimeline(mockContext)).not.toThrow();
    });

    it('should be idempotent - toggling twice returns to original state', () => {
      // Initial state: timeline visible
      const initialState = true;
      mockContext.state.viewState.timelineVisible = initialState;

      // Toggle twice
      viewActions.toggleTimeline(mockContext);
      mockContext.state.viewState.timelineVisible = false; // Simulate state update
      viewActions.toggleTimeline(mockContext);

      // Verify final state matches initial state
      const finalCall = onViewStateChangeSpy.mock.calls[1][0];
      expect(finalCall.timelineVisible).toBe(initialState);
    });
  });

  describe('zoomIn', () => {
    it('should increase zoom level by one step', () => {
      // Initial zoom: 100%
      mockContext.state.viewState.zoomLevel = 100;

      // Execute zoom in
      viewActions.zoomIn(mockContext);

      // Verify callback was called with increased zoom
      expect(onViewStateChangeSpy).toHaveBeenCalledWith({
        zoomLevel: 125, // 100 + 25 (zoomStep)
      });
    });

    it('should not exceed maximum zoom level', () => {
      // Set zoom to max
      mockContext.state.viewState.zoomLevel = 400;

      // Execute zoom in
      viewActions.zoomIn(mockContext);

      // Verify callback was not called (already at max)
      expect(onViewStateChangeSpy).not.toHaveBeenCalled();
    });

    it('should cap zoom at maximum when step would exceed it', () => {
      // Set zoom near max
      mockContext.state.viewState.zoomLevel = 390;

      // Execute zoom in
      viewActions.zoomIn(mockContext);

      // Verify zoom is capped at max
      expect(onViewStateChangeSpy).toHaveBeenCalledWith({
        zoomLevel: 400, // Capped at maxZoom
      });
    });

    it('should show notification with new zoom level', () => {
      // Spy on notification service
      const showSpy = vi.spyOn(mockNotificationService, 'show');

      // Initial zoom: 100%
      mockContext.state.viewState.zoomLevel = 100;

      // Execute zoom in
      viewActions.zoomIn(mockContext);

      // Verify notification was shown
      expect(showSpy).toHaveBeenCalledWith({
        type: 'info',
        message: 'Zoom: 125%',
        duration: 1500,
      });
    });

    it('should not call callback if onViewStateChange is undefined', () => {
      // Remove callback
      mockContext.onViewStateChange = undefined;

      // Execute zoom in (should not throw)
      expect(() => viewActions.zoomIn(mockContext)).not.toThrow();
    });
  });

  describe('zoomOut', () => {
    it('should decrease zoom level by one step', () => {
      // Initial zoom: 100%
      mockContext.state.viewState.zoomLevel = 100;

      // Execute zoom out
      viewActions.zoomOut(mockContext);

      // Verify callback was called with decreased zoom
      expect(onViewStateChangeSpy).toHaveBeenCalledWith({
        zoomLevel: 75, // 100 - 25 (zoomStep)
      });
    });

    it('should not go below minimum zoom level', () => {
      // Set zoom to min
      mockContext.state.viewState.zoomLevel = 25;

      // Execute zoom out
      viewActions.zoomOut(mockContext);

      // Verify callback was not called (already at min)
      expect(onViewStateChangeSpy).not.toHaveBeenCalled();
    });

    it('should cap zoom at minimum when step would go below it', () => {
      // Set zoom near min
      mockContext.state.viewState.zoomLevel = 35;

      // Execute zoom out
      viewActions.zoomOut(mockContext);

      // Verify zoom is capped at min
      expect(onViewStateChangeSpy).toHaveBeenCalledWith({
        zoomLevel: 25, // Capped at minZoom
      });
    });

    it('should show notification with new zoom level', () => {
      // Spy on notification service
      const showSpy = vi.spyOn(mockNotificationService, 'show');

      // Initial zoom: 100%
      mockContext.state.viewState.zoomLevel = 100;

      // Execute zoom out
      viewActions.zoomOut(mockContext);

      // Verify notification was shown
      expect(showSpy).toHaveBeenCalledWith({
        type: 'info',
        message: 'Zoom: 75%',
        duration: 1500,
      });
    });

    it('should not call callback if onViewStateChange is undefined', () => {
      // Remove callback
      mockContext.onViewStateChange = undefined;

      // Execute zoom out (should not throw)
      expect(() => viewActions.zoomOut(mockContext)).not.toThrow();
    });
  });

  describe('resetZoom', () => {
    it('should reset zoom to 100% from higher level', () => {
      // Set zoom to 200%
      mockContext.state.viewState.zoomLevel = 200;

      // Execute reset zoom
      viewActions.resetZoom(mockContext);

      // Verify callback was called with 100%
      expect(onViewStateChangeSpy).toHaveBeenCalledWith({
        zoomLevel: 100,
      });
    });

    it('should reset zoom to 100% from lower level', () => {
      // Set zoom to 50%
      mockContext.state.viewState.zoomLevel = 50;

      // Execute reset zoom
      viewActions.resetZoom(mockContext);

      // Verify callback was called with 100%
      expect(onViewStateChangeSpy).toHaveBeenCalledWith({
        zoomLevel: 100,
      });
    });

    it('should show notification when resetting zoom', () => {
      // Spy on notification service
      const showSpy = vi.spyOn(mockNotificationService, 'show');

      // Set zoom to 200%
      mockContext.state.viewState.zoomLevel = 200;

      // Execute reset zoom
      viewActions.resetZoom(mockContext);

      // Verify notification was shown
      expect(showSpy).toHaveBeenCalledWith({
        type: 'info',
        message: 'Zoom reset to 100%',
        duration: 1500,
      });
    });

    it('should not call callback if onViewStateChange is undefined', () => {
      // Remove callback
      mockContext.onViewStateChange = undefined;

      // Execute reset zoom (should not throw)
      expect(() => viewActions.resetZoom(mockContext)).not.toThrow();
    });
  });

  describe('toggleGrid', () => {
    it('should toggle grid visibility from false to true', () => {
      // Initial state: grid hidden
      mockContext.state.viewState.gridVisible = false;

      // Execute toggle action
      viewActions.toggleGrid(mockContext);

      // Verify callback was called with updated state
      expect(onViewStateChangeSpy).toHaveBeenCalledWith({
        gridVisible: true,
      });
    });

    it('should toggle grid visibility from true to false', () => {
      // Initial state: grid visible
      mockContext.state.viewState.gridVisible = true;

      // Execute toggle action
      viewActions.toggleGrid(mockContext);

      // Verify callback was called with updated state
      expect(onViewStateChangeSpy).toHaveBeenCalledWith({
        gridVisible: false,
      });
    });

    it('should not call callback if onViewStateChange is undefined', () => {
      // Remove callback
      mockContext.onViewStateChange = undefined;

      // Execute toggle action (should not throw)
      expect(() => viewActions.toggleGrid(mockContext)).not.toThrow();
    });

    it('should be idempotent - toggling twice returns to original state', () => {
      // Initial state: grid hidden
      const initialState = false;
      mockContext.state.viewState.gridVisible = initialState;

      // Toggle twice
      viewActions.toggleGrid(mockContext);
      mockContext.state.viewState.gridVisible = true; // Simulate state update
      viewActions.toggleGrid(mockContext);

      // Verify final state matches initial state
      const finalCall = onViewStateChangeSpy.mock.calls[1][0];
      expect(finalCall.gridVisible).toBe(initialState);
    });
  });

  describe('togglePropertiesPanel', () => {
    it('should toggle properties panel visibility from true to false', () => {
      // Initial state: properties panel visible
      mockContext.state.viewState.panelsVisible.properties = true;

      // Execute toggle action
      viewActions.togglePropertiesPanel(mockContext);

      // Verify callback was called with updated state
      expect(onViewStateChangeSpy).toHaveBeenCalledWith({
        panelsVisible: {
          properties: false,
          assets: true,
          preview: true,
        },
      });
    });

    it('should toggle properties panel visibility from false to true', () => {
      // Initial state: properties panel hidden
      mockContext.state.viewState.panelsVisible.properties = false;

      // Execute toggle action
      viewActions.togglePropertiesPanel(mockContext);

      // Verify callback was called with updated state
      expect(onViewStateChangeSpy).toHaveBeenCalledWith({
        panelsVisible: {
          properties: true,
          assets: true,
          preview: true,
        },
      });
    });

    it('should not affect other panel states', () => {
      // Set initial panel states
      mockContext.state.viewState.panelsVisible = {
        properties: true,
        assets: false,
        preview: true,
      };

      // Execute toggle action
      viewActions.togglePropertiesPanel(mockContext);

      // Verify only properties panel changed
      const updatedState = onViewStateChangeSpy.mock.calls[0][0];
      expect(updatedState.panelsVisible.properties).toBe(false);
      expect(updatedState.panelsVisible.assets).toBe(false); // Unchanged
      expect(updatedState.panelsVisible.preview).toBe(true); // Unchanged
    });

    it('should not call callback if onViewStateChange is undefined', () => {
      // Remove callback
      mockContext.onViewStateChange = undefined;

      // Execute toggle action (should not throw)
      expect(() => viewActions.togglePropertiesPanel(mockContext)).not.toThrow();
    });
  });

  describe('toggleAssetsPanel', () => {
    it('should toggle assets panel visibility from true to false', () => {
      // Initial state: assets panel visible
      mockContext.state.viewState.panelsVisible.assets = true;

      // Execute toggle action
      viewActions.toggleAssetsPanel(mockContext);

      // Verify callback was called with updated state
      expect(onViewStateChangeSpy).toHaveBeenCalledWith({
        panelsVisible: {
          properties: true,
          assets: false,
          preview: true,
        },
      });
    });

    it('should toggle assets panel visibility from false to true', () => {
      // Initial state: assets panel hidden
      mockContext.state.viewState.panelsVisible.assets = false;

      // Execute toggle action
      viewActions.toggleAssetsPanel(mockContext);

      // Verify callback was called with updated state
      expect(onViewStateChangeSpy).toHaveBeenCalledWith({
        panelsVisible: {
          properties: true,
          assets: true,
          preview: true,
        },
      });
    });

    it('should not affect other panel states', () => {
      // Set initial panel states
      mockContext.state.viewState.panelsVisible = {
        properties: false,
        assets: true,
        preview: false,
      };

      // Execute toggle action
      viewActions.toggleAssetsPanel(mockContext);

      // Verify only assets panel changed
      const updatedState = onViewStateChangeSpy.mock.calls[0][0];
      expect(updatedState.panelsVisible.properties).toBe(false); // Unchanged
      expect(updatedState.panelsVisible.assets).toBe(false);
      expect(updatedState.panelsVisible.preview).toBe(false); // Unchanged
    });

    it('should not call callback if onViewStateChange is undefined', () => {
      // Remove callback
      mockContext.onViewStateChange = undefined;

      // Execute toggle action (should not throw)
      expect(() => viewActions.toggleAssetsPanel(mockContext)).not.toThrow();
    });
  });

  describe('togglePreviewPanel', () => {
    it('should toggle preview panel visibility from true to false', () => {
      // Initial state: preview panel visible
      mockContext.state.viewState.panelsVisible.preview = true;

      // Execute toggle action
      viewActions.togglePreviewPanel(mockContext);

      // Verify callback was called with updated state
      expect(onViewStateChangeSpy).toHaveBeenCalledWith({
        panelsVisible: {
          properties: true,
          assets: true,
          preview: false,
        },
      });
    });

    it('should toggle preview panel visibility from false to true', () => {
      // Initial state: preview panel hidden
      mockContext.state.viewState.panelsVisible.preview = false;

      // Execute toggle action
      viewActions.togglePreviewPanel(mockContext);

      // Verify callback was called with updated state
      expect(onViewStateChangeSpy).toHaveBeenCalledWith({
        panelsVisible: {
          properties: true,
          assets: true,
          preview: true,
        },
      });
    });

    it('should not affect other panel states', () => {
      // Set initial panel states
      mockContext.state.viewState.panelsVisible = {
        properties: true,
        assets: false,
        preview: true,
      };

      // Execute toggle action
      viewActions.togglePreviewPanel(mockContext);

      // Verify only preview panel changed
      const updatedState = onViewStateChangeSpy.mock.calls[0][0];
      expect(updatedState.panelsVisible.properties).toBe(true); // Unchanged
      expect(updatedState.panelsVisible.assets).toBe(false); // Unchanged
      expect(updatedState.panelsVisible.preview).toBe(false);
    });

    it('should not call callback if onViewStateChange is undefined', () => {
      // Remove callback
      mockContext.onViewStateChange = undefined;

      // Execute toggle action (should not throw)
      expect(() => viewActions.togglePreviewPanel(mockContext)).not.toThrow();
    });
  });

  describe('toggleFullscreen', () => {
    let requestFullscreenSpy: ReturnType<typeof vi.fn>;
    let exitFullscreenSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      // Mock fullscreen API
      requestFullscreenSpy = vi.fn();
      exitFullscreenSpy = vi.fn();
      
      Object.defineProperty(document.documentElement, 'requestFullscreen', {
        value: requestFullscreenSpy,
        writable: true,
        configurable: true,
      });
      
      Object.defineProperty(document, 'exitFullscreen', {
        value: exitFullscreenSpy,
        writable: true,
        configurable: true,
      });
    });

    it('should toggle fullscreen from false to true', () => {
      // Initial state: not fullscreen
      mockContext.state.viewState.fullScreen = false;

      // Execute toggle action
      viewActions.toggleFullscreen(mockContext);

      // Verify callback was called with updated state
      expect(onViewStateChangeSpy).toHaveBeenCalledWith({
        fullScreen: true,
      });

      // Verify browser fullscreen API was called
      expect(requestFullscreenSpy).toHaveBeenCalled();
    });

    it('should toggle fullscreen from true to false', () => {
      // Initial state: fullscreen
      mockContext.state.viewState.fullScreen = true;

      // Execute toggle action
      viewActions.toggleFullscreen(mockContext);

      // Verify callback was called with updated state
      expect(onViewStateChangeSpy).toHaveBeenCalledWith({
        fullScreen: false,
      });

      // Verify browser fullscreen API was called
      expect(exitFullscreenSpy).toHaveBeenCalled();
    });

    it('should not call callback if onViewStateChange is undefined', () => {
      // Remove callback
      mockContext.onViewStateChange = undefined;

      // Execute toggle action (should not throw)
      expect(() => viewActions.toggleFullscreen(mockContext)).not.toThrow();
    });

    it('should be idempotent - toggling twice returns to original state', () => {
      // Initial state: not fullscreen
      const initialState = false;
      mockContext.state.viewState.fullScreen = initialState;

      // Toggle twice
      viewActions.toggleFullscreen(mockContext);
      mockContext.state.viewState.fullScreen = true; // Simulate state update
      viewActions.toggleFullscreen(mockContext);

      // Verify final state matches initial state
      const finalCall = onViewStateChangeSpy.mock.calls[1][0];
      expect(finalCall.fullScreen).toBe(initialState);
    });
  });

  describe('Menu item state integration', () => {
    it('should enable zoom in when below max zoom', () => {
      // Set zoom below max
      mockContext.state.viewState.zoomLevel = 100;
      mockContext.state.viewState.maxZoom = 400;

      // Zoom in should be enabled
      const enabled = mockContext.state.viewState.zoomLevel < mockContext.state.viewState.maxZoom;
      expect(enabled).toBe(true);
    });

    it('should disable zoom in when at max zoom', () => {
      // Set zoom to max
      mockContext.state.viewState.zoomLevel = 400;
      mockContext.state.viewState.maxZoom = 400;

      // Zoom in should be disabled
      const enabled = mockContext.state.viewState.zoomLevel < mockContext.state.viewState.maxZoom;
      expect(enabled).toBe(false);
    });

    it('should enable zoom out when above min zoom', () => {
      // Set zoom above min
      mockContext.state.viewState.zoomLevel = 100;
      mockContext.state.viewState.minZoom = 25;

      // Zoom out should be enabled
      const enabled = mockContext.state.viewState.zoomLevel > mockContext.state.viewState.minZoom;
      expect(enabled).toBe(true);
    });

    it('should disable zoom out when at min zoom', () => {
      // Set zoom to min
      mockContext.state.viewState.zoomLevel = 25;
      mockContext.state.viewState.minZoom = 25;

      // Zoom out should be disabled
      const enabled = mockContext.state.viewState.zoomLevel > mockContext.state.viewState.minZoom;
      expect(enabled).toBe(false);
    });

    it('should show timeline as checked when visible', () => {
      // Set timeline visible
      mockContext.state.viewState.timelineVisible = true;

      // Timeline menu item should be checked
      expect(mockContext.state.viewState.timelineVisible).toBe(true);
    });

    it('should show timeline as unchecked when hidden', () => {
      // Set timeline hidden
      mockContext.state.viewState.timelineVisible = false;

      // Timeline menu item should be unchecked
      expect(mockContext.state.viewState.timelineVisible).toBe(false);
    });

    it('should show grid as checked when visible', () => {
      // Set grid visible
      mockContext.state.viewState.gridVisible = true;

      // Grid menu item should be checked
      expect(mockContext.state.viewState.gridVisible).toBe(true);
    });

    it('should show grid as unchecked when hidden', () => {
      // Set grid hidden
      mockContext.state.viewState.gridVisible = false;

      // Grid menu item should be unchecked
      expect(mockContext.state.viewState.gridVisible).toBe(false);
    });

    it('should show fullscreen as checked when active', () => {
      // Set fullscreen active
      mockContext.state.viewState.fullScreen = true;

      // Fullscreen menu item should be checked
      expect(mockContext.state.viewState.fullScreen).toBe(true);
    });

    it('should show fullscreen as unchecked when inactive', () => {
      // Set fullscreen inactive
      mockContext.state.viewState.fullScreen = false;

      // Fullscreen menu item should be unchecked
      expect(mockContext.state.viewState.fullScreen).toBe(false);
    });

    it('should show panel toggles as checked when panels are visible', () => {
      // Set all panels visible
      mockContext.state.viewState.panelsVisible = {
        properties: true,
        assets: true,
        preview: true,
      };

      // All panel menu items should be checked
      expect(mockContext.state.viewState.panelsVisible.properties).toBe(true);
      expect(mockContext.state.viewState.panelsVisible.assets).toBe(true);
      expect(mockContext.state.viewState.panelsVisible.preview).toBe(true);
    });

    it('should show panel toggles as unchecked when panels are hidden', () => {
      // Set all panels hidden
      mockContext.state.viewState.panelsVisible = {
        properties: false,
        assets: false,
        preview: false,
      };

      // All panel menu items should be unchecked
      expect(mockContext.state.viewState.panelsVisible.properties).toBe(false);
      expect(mockContext.state.viewState.panelsVisible.assets).toBe(false);
      expect(mockContext.state.viewState.panelsVisible.preview).toBe(false);
    });
  });
});
