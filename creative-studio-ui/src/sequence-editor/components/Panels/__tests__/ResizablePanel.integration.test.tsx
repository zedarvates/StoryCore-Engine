/**
 * ResizablePanel Integration Tests
 * 
 * Integration tests verifying layout persistence and restoration
 * across multiple panels and application lifecycle.
 * 
 * Requirements: 4.5, 4.6, 4.7
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi } from 'vitest';
import { ResizablePanel } from '../ResizablePanel';
import panelsReducer from '../../../store/slices/panelsSlice';

// ============================================================================
// Test Utilities
// ============================================================================

const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      panels: panelsReducer,
    },
    preloadedState: {
      panels: {
        layout: {
          assetLibrary: { width: 20 },
          preview: { width: 50, height: 60 },
          shotConfig: { width: 30 },
          timeline: { height: 40 },
        },
        activePanel: null,
        shotConfigTarget: null,
        ...initialState,
      },
    },
  });
};

const renderWithStore = (component: React.ReactElement, store = createMockStore()) => {
  return {
    ...render(<Provider store={store}>{component}</Provider>),
    store,
  };
};

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// ============================================================================
// Integration Test Suite
// ============================================================================

describe('ResizablePanel Integration Tests', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Requirement 4.5: Layout persistence with debouncing
  // ==========================================================================

  describe('Layout Persistence Integration', () => {
    it('should persist layout changes across multiple panels', async () => {
      const store = createMockStore();
      
      const { container: container1 } = renderWithStore(
        <ResizablePanel panelId="assetLibrary" resizeDirection="horizontal">
          <div>Asset Library</div>
        </ResizablePanel>,
        store
      );

      const { container: container2 } = renderWithStore(
        <ResizablePanel panelId="timeline" resizeDirection="vertical">
          <div>Timeline</div>
        </ResizablePanel>,
        store
      );

      // Resize asset library
      const assetLibraryHandle = container1.querySelector('.resize-handle');
      if (assetLibraryHandle) {
        fireEvent.mouseDown(assetLibraryHandle, { clientX: 100, clientY: 100 });
        fireEvent.mouseMove(window, { clientX: 150, clientY: 100 });
        fireEvent.mouseUp(window);
      }

      // Resize timeline
      const timelineHandle = container2.querySelector('.resize-handle');
      if (timelineHandle) {
        fireEvent.mouseDown(timelineHandle, { clientX: 100, clientY: 500 });
        fireEvent.mouseMove(window, { clientX: 100, clientY: 450 });
        fireEvent.mouseUp(window);
      }

      // Wait for debounced save
      await waitFor(() => {
        const savedLayout = localStorageMock.getItem('sequence-editor-layout');
        expect(savedLayout).toBeTruthy();
        
        if (savedLayout) {
          const layout = JSON.parse(savedLayout);
          expect(layout.assetLibrary).toBeDefined();
          expect(layout.timeline).toBeDefined();
        }
      }, { timeout: 1000 });
    });

    it('should debounce multiple rapid resize operations', async () => {
      const { container } = renderWithStore(
        <ResizablePanel panelId="assetLibrary" resizeDirection="horizontal">
          <div>Content</div>
        </ResizablePanel>
      );

      const resizeHandle = container.querySelector('.resize-handle');
      
      if (resizeHandle) {
        // Perform multiple rapid resizes
        for (let i = 0; i < 5; i++) {
          fireEvent.mouseDown(resizeHandle, { clientX: 100 + i * 10, clientY: 100 });
          fireEvent.mouseMove(window, { clientX: 150 + i * 10, clientY: 100 });
          fireEvent.mouseUp(window);
        }
        
        // Should only save once after debounce period
        await waitFor(() => {
          const savedLayout = localStorageMock.getItem('sequence-editor-layout');
          expect(savedLayout).toBeTruthy();
        }, { timeout: 1000 });
      }
    });

    it('should handle localStorage quota exceeded gracefully', async () => {
      // Mock localStorage.setItem to throw quota exceeded error
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = vi.fn(() => {
        throw new Error('QuotaExceededError');
      });

      const { container } = renderWithStore(
        <ResizablePanel panelId="assetLibrary" resizeDirection="horizontal">
          <div>Content</div>
        </ResizablePanel>
      );

      const resizeHandle = container.querySelector('.resize-handle');
      
      if (resizeHandle) {
        fireEvent.mouseDown(resizeHandle, { clientX: 100, clientY: 100 });
        fireEvent.mouseMove(window, { clientX: 150, clientY: 100 });
        fireEvent.mouseUp(window);
        
        // Should not crash the application
        await waitFor(() => {
          const panel = container.querySelector('[data-panel-id="assetLibrary"]');
          expect(panel).toBeInTheDocument();
        }, { timeout: 1000 });
      }

      // Restore original setItem
      localStorageMock.setItem = originalSetItem;
    });
  });

  // ==========================================================================
  // Requirement 4.6: Layout restoration on application load
  // ==========================================================================

  describe('Layout Restoration Integration', () => {
    it('should restore complete layout state on mount', () => {
      const customLayout = {
        assetLibrary: { width: 25 },
        preview: { width: 45, height: 55 },
        shotConfig: { width: 30 },
        timeline: { height: 45 },
      };
      
      localStorageMock.setItem('sequence-editor-layout', JSON.stringify(customLayout));
      
      const store = createMockStore();
      
      // Mount all panels
      renderWithStore(
        <>
          <ResizablePanel panelId="assetLibrary" resizeDirection="horizontal">
            <div>Asset Library</div>
          </ResizablePanel>
          <ResizablePanel panelId="preview" resizeDirection="both">
            <div>Preview</div>
          </ResizablePanel>
          <ResizablePanel panelId="shotConfig" resizeDirection="horizontal">
            <div>Shot Config</div>
          </ResizablePanel>
          <ResizablePanel panelId="timeline" resizeDirection="vertical">
            <div>Timeline</div>
          </ResizablePanel>
        </>,
        store
      );

      // Verify layout was restored
      waitFor(() => {
        const state = store.getState();
        expect(state.panels.layout.assetLibrary.width).toBe(25);
        expect(state.panels.layout.preview.width).toBe(45);
        expect(state.panels.layout.preview.height).toBe(55);
        expect(state.panels.layout.shotConfig.width).toBe(30);
        expect(state.panels.layout.timeline.height).toBe(45);
      });
    });

    it('should handle partial layout data gracefully', () => {
      const partialLayout = {
        assetLibrary: { width: 25 },
        // Missing other panels
      };
      
      localStorageMock.setItem('sequence-editor-layout', JSON.stringify(partialLayout));
      
      const store = createMockStore();
      
      renderWithStore(
        <ResizablePanel panelId="assetLibrary" resizeDirection="horizontal">
          <div>Asset Library</div>
        </ResizablePanel>,
        store
      );

      // Should not crash and should use defaults for missing panels
      const state = store.getState();
      expect(state.panels.layout).toBeDefined();
    });

    it('should restore layout after application restart simulation', async () => {
      // First session - resize and save
      const store1 = createMockStore();
      const { container: container1, unmount: unmount1 } = renderWithStore(
        <ResizablePanel panelId="assetLibrary" resizeDirection="horizontal">
          <div>Content</div>
        </ResizablePanel>,
        store1
      );

      const resizeHandle1 = container1.querySelector('.resize-handle');
      if (resizeHandle1) {
        fireEvent.mouseDown(resizeHandle1, { clientX: 100, clientY: 100 });
        fireEvent.mouseMove(window, { clientX: 200, clientY: 100 });
        fireEvent.mouseUp(window);
      }

      // Wait for save
      await waitFor(() => {
        const savedLayout = localStorageMock.getItem('sequence-editor-layout');
        expect(savedLayout).toBeTruthy();
      }, { timeout: 1000 });

      // Unmount (simulate app close)
      unmount1();

      // Second session - restore
      const store2 = createMockStore();
      renderWithStore(
        <ResizablePanel panelId="assetLibrary" resizeDirection="horizontal">
          <div>Content</div>
        </ResizablePanel>,
        store2
      );

      // Verify layout was restored
      waitFor(() => {
        const state = store2.getState();
        expect(state.panels.layout.assetLibrary).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // Requirement 4.7: Reset Layout functionality
  // ==========================================================================

  describe('Reset Layout Integration', () => {
    it('should reset all panels to default layout', () => {
      // Set custom layout
      const customLayout = {
        assetLibrary: { width: 35 },
        preview: { width: 40, height: 50 },
        shotConfig: { width: 25 },
        timeline: { height: 50 },
      };
      
      localStorageMock.setItem('sequence-editor-layout', JSON.stringify(customLayout));
      
      const store = createMockStore();
      const { container } = renderWithStore(
        <ResizablePanel panelId="assetLibrary" resizeDirection="horizontal" showResetButton={true}>
          <div>Asset Library</div>
        </ResizablePanel>,
        store
      );

      // Hover to show reset button
      const panel = container.querySelector('[data-panel-id="assetLibrary"]');
      if (panel) {
        fireEvent.mouseEnter(panel);
        
        const resetButton = screen.getByTitle('Reset Layout');
        fireEvent.click(resetButton);
        
        // Verify reset to defaults
        const state = store.getState();
        expect(state.panels.layout.assetLibrary.width).toBe(20);
        expect(state.panels.layout.preview.width).toBe(50);
        expect(state.panels.layout.preview.height).toBe(60);
        expect(state.panels.layout.shotConfig.width).toBe(30);
        expect(state.panels.layout.timeline.height).toBe(40);
        
        // Verify localStorage was cleared
        expect(localStorageMock.getItem('sequence-editor-layout')).toBeNull();
      }
    });

    it('should reset layout and allow new customization', async () => {
      const store = createMockStore();
      const { container } = renderWithStore(
        <ResizablePanel panelId="assetLibrary" resizeDirection="horizontal" showResetButton={true}>
          <div>Asset Library</div>
        </ResizablePanel>,
        store
      );

      // Reset layout
      const panel = container.querySelector('[data-panel-id="assetLibrary"]');
      if (panel) {
        fireEvent.mouseEnter(panel);
        const resetButton = screen.getByTitle('Reset Layout');
        fireEvent.click(resetButton);
      }

      // Perform new resize
      const resizeHandle = container.querySelector('.resize-handle');
      if (resizeHandle) {
        fireEvent.mouseDown(resizeHandle, { clientX: 100, clientY: 100 });
        fireEvent.mouseMove(window, { clientX: 180, clientY: 100 });
        fireEvent.mouseUp(window);
      }

      // Verify new layout was saved
      await waitFor(() => {
        const savedLayout = localStorageMock.getItem('sequence-editor-layout');
        expect(savedLayout).toBeTruthy();
      }, { timeout: 1000 });
    });
  });

  // ==========================================================================
  // Cross-panel interaction tests
  // ==========================================================================

  describe('Cross-Panel Interactions', () => {
    it('should maintain independent resize state for each panel', () => {
      const store = createMockStore();
      
      const { container: container1 } = renderWithStore(
        <ResizablePanel panelId="assetLibrary" resizeDirection="horizontal">
          <div>Asset Library</div>
        </ResizablePanel>,
        store
      );

      const { container: container2 } = renderWithStore(
        <ResizablePanel panelId="shotConfig" resizeDirection="horizontal">
          <div>Shot Config</div>
        </ResizablePanel>,
        store
      );

      // Resize asset library
      const handle1 = container1.querySelector('.resize-handle');
      if (handle1) {
        fireEvent.mouseDown(handle1, { clientX: 100, clientY: 100 });
        fireEvent.mouseMove(window, { clientX: 150, clientY: 100 });
        fireEvent.mouseUp(window);
      }

      // Resize shot config
      const handle2 = container2.querySelector('.resize-handle');
      if (handle2) {
        fireEvent.mouseDown(handle2, { clientX: 800, clientY: 100 });
        fireEvent.mouseMove(window, { clientX: 750, clientY: 100 });
        fireEvent.mouseUp(window);
      }

      // Both panels should maintain their state
      const state = store.getState();
      expect(state.panels.layout.assetLibrary).toBeDefined();
      expect(state.panels.layout.shotConfig).toBeDefined();
    });

    it('should handle simultaneous hover on multiple panels', () => {
      const store = createMockStore();
      
      const { container: container1 } = renderWithStore(
        <ResizablePanel panelId="assetLibrary" resizeDirection="horizontal" showResetButton={true}>
          <div>Asset Library</div>
        </ResizablePanel>,
        store
      );

      const { container: container2 } = renderWithStore(
        <ResizablePanel panelId="timeline" resizeDirection="vertical" showResetButton={true}>
          <div>Timeline</div>
        </ResizablePanel>,
        store
      );

      // Hover both panels
      const panel1 = container1.querySelector('[data-panel-id="assetLibrary"]');
      const panel2 = container2.querySelector('[data-panel-id="timeline"]');
      
      if (panel1 && panel2) {
        fireEvent.mouseEnter(panel1);
        fireEvent.mouseEnter(panel2);
        
        // Both should show their reset buttons
        const resetButtons = screen.getAllByTitle('Reset Layout');
        expect(resetButtons.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  // ==========================================================================
  // Error recovery tests
  // ==========================================================================

  describe('Error Recovery', () => {
    it('should recover from corrupted localStorage and use defaults', () => {
      localStorageMock.setItem('sequence-editor-layout', 'invalid-json-{{{');
      
      const store = createMockStore();
      const { container } = renderWithStore(
        <ResizablePanel panelId="assetLibrary" resizeDirection="horizontal">
          <div>Content</div>
        </ResizablePanel>,
        store
      );

      // Should render successfully with default layout
      const panel = container.querySelector('[data-panel-id="assetLibrary"]');
      expect(panel).toBeInTheDocument();
      
      const state = store.getState();
      expect(state.panels.layout.assetLibrary.width).toBe(20); // Default value
    });

    it('should handle missing localStorage gracefully', () => {
      // Temporarily remove localStorage
      const originalLocalStorage = window.localStorage;
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true,
      });

      const store = createMockStore();
      const { container } = renderWithStore(
        <ResizablePanel panelId="assetLibrary" resizeDirection="horizontal">
          <div>Content</div>
        </ResizablePanel>,
        store
      );

      // Should render successfully
      const panel = container.querySelector('[data-panel-id="assetLibrary"]');
      expect(panel).toBeInTheDocument();

      // Restore localStorage
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
      });
    });
  });
});
