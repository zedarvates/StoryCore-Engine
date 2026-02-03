/**
 * ResizablePanel Animation and Visual Feedback Tests
 * 
 * Tests specifically for Task 3.3:
 * - CSS transitions for panel resizing (200ms ease-in-out)
 * - Hover states for drag handles
 * - Resize cursor on drag handle hover
 * 
 * Requirements: 20.2, 20.5
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
// Test Suite
// ============================================================================

describe('ResizablePanel - Animations and Visual Feedback (Task 3.3)', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Requirement 20.2: CSS transitions for panel resizing (200ms ease-in-out)
  // ==========================================================================

  describe('Smooth Resize Animations', () => {
    it('should have 200ms ease-in-out transition on resize handle', () => {
      const { container } = renderWithStore(
        <ResizablePanel panelId="assetLibrary" resizeDirection="horizontal">
          <div>Content</div>
        </ResizablePanel>
      );

      const resizeHandle = container.querySelector('.resize-handle');
      expect(resizeHandle).toBeInTheDocument();
      
      if (resizeHandle instanceof HTMLElement) {
        // Check for transition property - should include 200ms ease-in-out
        const transition = resizeHandle.style.transition;
        expect(transition).toContain('200ms ease-in-out');
      }
    });

    it('should apply smooth transition to opacity changes', () => {
      const { container } = renderWithStore(
        <ResizablePanel panelId="assetLibrary" resizeDirection="horizontal">
          <div>Content</div>
        </ResizablePanel>
      );

      const resizeHandle = container.querySelector('.resize-handle') as HTMLElement;
      expect(resizeHandle).toBeInTheDocument();
      
      if (resizeHandle) {
        // Check that opacity transition is defined
        const transition = resizeHandle.style.transition;
        expect(transition).toContain('opacity');
      }
    });

    it('should apply smooth transition to background-color changes', () => {
      const { container } = renderWithStore(
        <ResizablePanel panelId="assetLibrary" resizeDirection="horizontal">
          <div>Content</div>
        </ResizablePanel>
      );

      const resizeHandle = container.querySelector('.resize-handle') as HTMLElement;
      expect(resizeHandle).toBeInTheDocument();
      
      if (resizeHandle) {
        // Check that background-color transition is defined
        const transition = resizeHandle.style.transition;
        expect(transition).toContain('background-color');
      }
    });

    it('should have smooth transition on reset button', () => {
      const { container } = renderWithStore(
        <ResizablePanel panelId="assetLibrary" resizeDirection="horizontal" showResetButton={true}>
          <div>Content</div>
        </ResizablePanel>
      );

      const panel = container.querySelector('[data-panel-id="assetLibrary"]');
      
      if (panel) {
        fireEvent.mouseEnter(panel);
        
        const resetButton = screen.getByTitle('Reset Layout');
        expect(resetButton).toBeInTheDocument();
        
        // Check for transition on reset button
        const transition = resetButton.style.transition;
        expect(transition).toContain('200ms ease-in-out');
      }
    });
  });

  // ==========================================================================
  // Requirement 20.5: Hover states for drag handles
  // ==========================================================================

  describe('Drag Handle Hover States', () => {
    it('should show resize handle on panel hover', () => {
      const { container } = renderWithStore(
        <ResizablePanel panelId="assetLibrary" resizeDirection="horizontal">
          <div>Content</div>
        </ResizablePanel>
      );

      const panel = container.querySelector('[data-panel-id="assetLibrary"]');
      const resizeHandle = container.querySelector('.resize-handle');
      
      expect(resizeHandle).toBeInTheDocument();
      
      if (panel && resizeHandle) {
        // Initially hidden (opacity 0)
        expect(resizeHandle).toHaveStyle({ opacity: '0' });
        
        // Hover over panel
        fireEvent.mouseEnter(panel);
        
        // Should become visible (opacity 1)
        expect(resizeHandle).toHaveStyle({ opacity: '1' });
      }
    });

    it('should hide resize handle when mouse leaves panel', () => {
      const { container } = renderWithStore(
        <ResizablePanel panelId="assetLibrary" resizeDirection="horizontal">
          <div>Content</div>
        </ResizablePanel>
      );

      const panel = container.querySelector('[data-panel-id="assetLibrary"]');
      const resizeHandle = container.querySelector('.resize-handle');
      
      if (panel && resizeHandle) {
        // Hover over panel
        fireEvent.mouseEnter(panel);
        expect(resizeHandle).toHaveStyle({ opacity: '1' });
        
        // Mouse leaves panel
        fireEvent.mouseLeave(panel);
        expect(resizeHandle).toHaveStyle({ opacity: '0' });
      }
    });

    it('should keep resize handle visible during active resize', () => {
      const { container } = renderWithStore(
        <ResizablePanel panelId="assetLibrary" resizeDirection="horizontal">
          <div>Content</div>
        </ResizablePanel>
      );

      const panel = container.querySelector('[data-panel-id="assetLibrary"]');
      const resizeHandle = container.querySelector('.resize-handle');
      
      if (panel && resizeHandle) {
        // Start resize
        fireEvent.mouseDown(resizeHandle, { clientX: 100, clientY: 100 });
        
        // Handle should remain visible even if mouse leaves panel
        fireEvent.mouseLeave(panel);
        expect(resizeHandle).toHaveStyle({ opacity: '1' });
        
        // End resize
        fireEvent.mouseUp(window);
      }
    });

    it('should highlight resize handle with accent color during resize', () => {
      const { container } = renderWithStore(
        <ResizablePanel panelId="assetLibrary" resizeDirection="horizontal">
          <div>Content</div>
        </ResizablePanel>
      );

      const resizeHandle = container.querySelector('.resize-handle');
      
      if (resizeHandle) {
        // Start resize
        fireEvent.mouseDown(resizeHandle, { clientX: 100, clientY: 100 });
        
        // Should have accent color background
        expect(resizeHandle).toHaveStyle({
          backgroundColor: expect.stringContaining('4A90E2'),
          opacity: '1',
        });
        
        // End resize
        fireEvent.mouseUp(window);
      }
    });

    it('should show reset button on panel hover', () => {
      const { container } = renderWithStore(
        <ResizablePanel panelId="assetLibrary" resizeDirection="horizontal" showResetButton={true}>
          <div>Content</div>
        </ResizablePanel>
      );

      const panel = container.querySelector('[data-panel-id="assetLibrary"]');
      
      if (panel) {
        // Initially no reset button visible
        let resetButton = container.querySelector('.reset-layout-button');
        expect(resetButton).not.toBeInTheDocument();
        
        // Hover over panel
        fireEvent.mouseEnter(panel);
        
        // Reset button should appear
        const visibleResetButton = screen.getByTitle('Reset Layout');
        expect(visibleResetButton).toBeInTheDocument();
      }
    });

    it('should hide reset button when mouse leaves panel', () => {
      const { container } = renderWithStore(
        <ResizablePanel panelId="assetLibrary" resizeDirection="horizontal" showResetButton={true}>
          <div>Content</div>
        </ResizablePanel>
      );

      const panel = container.querySelector('[data-panel-id="assetLibrary"]');
      
      if (panel) {
        // Hover over panel
        fireEvent.mouseEnter(panel);
        let resetButton = screen.getByTitle('Reset Layout');
        expect(resetButton).toBeInTheDocument();
        
        // Mouse leaves panel
        fireEvent.mouseLeave(panel);
        
        // Reset button should be hidden
        const hiddenResetButton = container.querySelector('.reset-layout-button');
        expect(hiddenResetButton).not.toBeInTheDocument();
      }
    });
  });

  // ==========================================================================
  // Requirement 20.5: Display resize cursor on drag handle hover
  // ==========================================================================

  describe('Resize Cursor Display', () => {
    it('should display col-resize cursor for horizontal resize handles', () => {
      const { container } = renderWithStore(
        <ResizablePanel panelId="assetLibrary" resizeDirection="horizontal">
          <div>Content</div>
        </ResizablePanel>
      );

      const resizeHandle = container.querySelector('.resize-handle');
      expect(resizeHandle).toBeInTheDocument();
      
      if (resizeHandle) {
        expect(resizeHandle).toHaveStyle({ cursor: 'col-resize' });
      }
    });

    it('should display row-resize cursor for vertical resize handles', () => {
      const { container } = renderWithStore(
        <ResizablePanel panelId="timeline" resizeDirection="vertical">
          <div>Content</div>
        </ResizablePanel>
      );

      const resizeHandle = container.querySelector('.resize-handle');
      expect(resizeHandle).toBeInTheDocument();
      
      if (resizeHandle) {
        expect(resizeHandle).toHaveStyle({ cursor: 'row-resize' });
      }
    });

    it('should change document cursor during active resize (horizontal)', () => {
      const { container } = renderWithStore(
        <ResizablePanel panelId="assetLibrary" resizeDirection="horizontal">
          <div>Content</div>
        </ResizablePanel>
      );

      const resizeHandle = container.querySelector('.resize-handle');
      
      if (resizeHandle) {
        // Start resize
        fireEvent.mouseDown(resizeHandle, { clientX: 100, clientY: 100 });
        
        // Document cursor should change
        expect(document.body.style.cursor).toBe('col-resize');
        
        // End resize
        fireEvent.mouseUp(window);
        
        // Cursor should reset
        expect(document.body.style.cursor).toBe('');
      }
    });

    it('should change document cursor during active resize (vertical)', () => {
      const { container } = renderWithStore(
        <ResizablePanel panelId="timeline" resizeDirection="vertical">
          <div>Content</div>
        </ResizablePanel>
      );

      const resizeHandle = container.querySelector('.resize-handle');
      
      if (resizeHandle) {
        // Start resize
        fireEvent.mouseDown(resizeHandle, { clientX: 100, clientY: 100 });
        
        // Document cursor should change
        expect(document.body.style.cursor).toBe('row-resize');
        
        // End resize
        fireEvent.mouseUp(window);
        
        // Cursor should reset
        expect(document.body.style.cursor).toBe('');
      }
    });

    it('should prevent text selection during resize', () => {
      const { container } = renderWithStore(
        <ResizablePanel panelId="assetLibrary" resizeDirection="horizontal">
          <div>Content</div>
        </ResizablePanel>
      );

      const resizeHandle = container.querySelector('.resize-handle');
      
      if (resizeHandle) {
        // Start resize
        fireEvent.mouseDown(resizeHandle, { clientX: 100, clientY: 100 });
        
        // User select should be disabled
        expect(document.body.style.userSelect).toBe('none');
        
        // End resize
        fireEvent.mouseUp(window);
        
        // User select should be restored
        expect(document.body.style.userSelect).toBe('');
      }
    });
  });

  // ==========================================================================
  // Additional Visual Feedback Tests
  // ==========================================================================

  describe('Additional Visual Feedback', () => {
    it('should apply hover effect to reset button', () => {
      const { container } = renderWithStore(
        <ResizablePanel panelId="assetLibrary" resizeDirection="horizontal" showResetButton={true}>
          <div>Content</div>
        </ResizablePanel>
      );

      const panel = container.querySelector('[data-panel-id="assetLibrary"]');
      
      if (panel) {
        fireEvent.mouseEnter(panel);
        
        const resetButton = screen.getByTitle('Reset Layout');
        
        // Initial opacity
        expect(resetButton).toHaveStyle({ opacity: '0.8' });
        
        // Hover over button
        fireEvent.mouseEnter(resetButton);
        
        // Opacity should increase
        expect(resetButton).toHaveStyle({ opacity: '1' });
        
        // Mouse leaves button
        fireEvent.mouseLeave(resetButton);
        
        // Opacity should decrease
        expect(resetButton).toHaveStyle({ opacity: '0.8' });
      }
    });

    it('should maintain visual feedback consistency across all panel types', () => {
      const panelIds: Array<'assetLibrary' | 'preview' | 'shotConfig' | 'timeline'> = [
        'assetLibrary',
        'shotConfig',
        'timeline',
      ];

      panelIds.forEach((panelId) => {
        const { container, unmount } = renderWithStore(
          <ResizablePanel 
            panelId={panelId} 
            resizeDirection={panelId === 'timeline' ? 'vertical' : 'horizontal'}
          >
            <div>Content</div>
          </ResizablePanel>
        );

        const resizeHandle = container.querySelector('.resize-handle');
        expect(resizeHandle).toBeInTheDocument();
        
        if (resizeHandle instanceof HTMLElement) {
          // All handles should have consistent transition timing
          const transition = resizeHandle.style.transition;
          expect(transition).toContain('200ms ease-in-out');
        }

        unmount();
      });
    });

    it('should provide immediate visual feedback on resize start', () => {
      const { container } = renderWithStore(
        <ResizablePanel panelId="assetLibrary" resizeDirection="horizontal">
          <div>Content</div>
        </ResizablePanel>
      );

      const resizeHandle = container.querySelector('.resize-handle');
      
      if (resizeHandle) {
        // Start resize
        fireEvent.mouseDown(resizeHandle, { clientX: 100, clientY: 100 });
        
        // Immediate feedback: cursor change, user-select disabled, handle highlighted
        expect(document.body.style.cursor).toBe('col-resize');
        expect(document.body.style.userSelect).toBe('none');
        expect(resizeHandle).toHaveStyle({
          backgroundColor: expect.stringContaining('4A90E2'),
          opacity: '1',
        });
      }
    });

    it('should restore all visual states after resize completes', () => {
      const { container } = renderWithStore(
        <ResizablePanel panelId="assetLibrary" resizeDirection="horizontal">
          <div>Content</div>
        </ResizablePanel>
      );

      const panel = container.querySelector('[data-panel-id="assetLibrary"]');
      const resizeHandle = container.querySelector('.resize-handle');
      
      if (panel && resizeHandle) {
        // Hover to show handle
        fireEvent.mouseEnter(panel);
        
        // Start resize
        fireEvent.mouseDown(resizeHandle, { clientX: 100, clientY: 100 });
        
        // Move and end resize
        fireEvent.mouseMove(window, { clientX: 150, clientY: 100 });
        fireEvent.mouseUp(window);
        
        // All states should be restored
        expect(document.body.style.cursor).toBe('');
        expect(document.body.style.userSelect).toBe('');
        
        // Handle should still be visible (panel is still hovered)
        expect(resizeHandle).toHaveStyle({ opacity: '1' });
        
        // Leave panel
        fireEvent.mouseLeave(panel);
        
        // Handle should be hidden
        expect(resizeHandle).toHaveStyle({ opacity: '0' });
      }
    });
  });

  // ==========================================================================
  // Performance and Smoothness Tests
  // ==========================================================================

  describe('Animation Performance', () => {
    it('should use CSS transitions for smooth animations', () => {
      const { container } = renderWithStore(
        <ResizablePanel panelId="assetLibrary" resizeDirection="horizontal">
          <div>Content</div>
        </ResizablePanel>
      );

      const resizeHandle = container.querySelector('.resize-handle') as HTMLElement;
      
      if (resizeHandle) {
        // Verify CSS transitions are used (hardware-accelerated)
        const transition = resizeHandle.style.transition;
        expect(transition).toContain('ease-in-out');
      }
    });

    it('should not block UI during resize animations', async () => {
      const { container } = renderWithStore(
        <ResizablePanel panelId="assetLibrary" resizeDirection="horizontal">
          <div>Content</div>
        </ResizablePanel>
      );

      const panel = container.querySelector('[data-panel-id="assetLibrary"]');
      const resizeHandle = container.querySelector('.resize-handle');
      
      if (panel && resizeHandle) {
        // Rapid hover/unhover should not cause issues
        for (let i = 0; i < 10; i++) {
          fireEvent.mouseEnter(panel);
          fireEvent.mouseLeave(panel);
        }
        
        // Component should still be functional
        expect(panel).toBeInTheDocument();
        expect(resizeHandle).toBeInTheDocument();
      }
    });
  });
});
