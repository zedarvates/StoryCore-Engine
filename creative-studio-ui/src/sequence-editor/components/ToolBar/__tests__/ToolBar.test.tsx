/**
 * ToolBar Component Tests
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 17.1, 19.4
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ToolBar } from '../ToolBar';
import toolsReducer from '../../../store/slices/toolsSlice';
import projectReducer from '../../../store/slices/projectSlice';
import type { ToolType } from '../../../types';

// Helper to create test store
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      tools: toolsReducer,
      project: projectReducer,
    },
    preloadedState: initialState,
  });
};

// Helper to render with Redux
const renderWithRedux = (component: React.ReactElement, initialState = {}) => {
  const store = createTestStore(initialState);
  return {
    ...render(<Provider store={store}>{component}</Provider>),
    store,
  };
};

describe('ToolBar Component', () => {
  describe('Rendering', () => {
    it('should render all tool groups', () => {
      renderWithRedux(<ToolBar />);
      
      // Check for primary tools
      expect(screen.getByLabelText('Select')).toBeInTheDocument();
      expect(screen.getByLabelText('Cut')).toBeInTheDocument();
      expect(screen.getByLabelText('Move')).toBeInTheDocument();
      expect(screen.getByLabelText('Zoom')).toBeInTheDocument();
      
      // Check for media tools
      expect(screen.getByLabelText('Add Image')).toBeInTheDocument();
      expect(screen.getByLabelText('Add Video')).toBeInTheDocument();
      expect(screen.getByLabelText('Add Audio')).toBeInTheDocument();
      
      // Check for editing tools
      expect(screen.getByLabelText('Trim')).toBeInTheDocument();
      expect(screen.getByLabelText('Ripple Edit')).toBeInTheDocument();
      expect(screen.getByLabelText('Roll Edit')).toBeInTheDocument();
      expect(screen.getByLabelText('Slip')).toBeInTheDocument();
      expect(screen.getByLabelText('Slide')).toBeInTheDocument();
      
      // Check for effects tools
      expect(screen.getByLabelText('Transition')).toBeInTheDocument();
      expect(screen.getByLabelText('Text')).toBeInTheDocument();
      expect(screen.getByLabelText('Keyframe')).toBeInTheDocument();
    });

    it('should render project management buttons', () => {
      renderWithRedux(<ToolBar />);
      
      expect(screen.getByLabelText('Project Settings')).toBeInTheDocument();
      expect(screen.getByLabelText('Save Project')).toBeInTheDocument();
      expect(screen.getByLabelText('Export Project')).toBeInTheDocument();
    });

    it('should render tool separators', () => {
      const { container } = renderWithRedux(<ToolBar />);
      const separators = container.querySelectorAll('.tool-separator');
      expect(separators.length).toBeGreaterThan(0);
    });

    it('should render tool icons and labels', () => {
      renderWithRedux(<ToolBar />);
      
      const selectButton = screen.getByLabelText('Select');
      expect(selectButton.querySelector('.tool-icon')).toBeInTheDocument();
      expect(selectButton.querySelector('.tool-label')).toHaveTextContent('Select');
    });
  });

  describe('Tool Selection', () => {
    it('should highlight active tool', () => {
      const initialState = {
        tools: { activeTool: 'select' as ToolType, toolSettings: {} },
        project: {
          metadata: null,
          settings: {
            resolution: { width: 1920, height: 1080 },
            format: 'mp4' as const,
            fps: 30,
            quality: 'preview' as const,
          },
          saveStatus: { state: 'saved' as const },
          generationStatus: { state: 'idle' as const },
        },
      };
      
      renderWithRedux(<ToolBar />, initialState);
      
      const selectButton = screen.getByLabelText('Select');
      expect(selectButton).toHaveClass('active');
      expect(selectButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should change active tool on click', () => {
      const { store } = renderWithRedux(<ToolBar />);
      
      const cutButton = screen.getByLabelText('Cut');
      fireEvent.click(cutButton);
      
      expect(store.getState().tools.activeTool).toBe('cut');
    });

    it('should update active state when tool changes', () => {
      const { store } = renderWithRedux(<ToolBar />);
      
      const trimButton = screen.getByLabelText('Trim');
      fireEvent.click(trimButton);
      
      expect(trimButton).toHaveClass('active');
      expect(trimButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should only have one active tool at a time', () => {
      const { container } = renderWithRedux(<ToolBar />);
      
      const cutButton = screen.getByLabelText('Cut');
      fireEvent.click(cutButton);
      
      const activeButtons = container.querySelectorAll('.tool-btn.active');
      expect(activeButtons.length).toBe(1);
      expect(activeButtons[0]).toHaveAttribute('aria-label', 'Cut');
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should activate tool with keyboard shortcut', () => {
      const { store } = renderWithRedux(<ToolBar />);
      
      // Press 'V' for Select tool
      fireEvent.keyDown(window, { key: 'V' });
      expect(store.getState().tools.activeTool).toBe('select');
      
      // Press 'C' for Cut tool
      fireEvent.keyDown(window, { key: 'C' });
      expect(store.getState().tools.activeTool).toBe('cut');
    });

    it('should handle Shift+key shortcuts', () => {
      const { store } = renderWithRedux(<ToolBar />);
      
      // Press 'Shift+T' for Transition tool
      fireEvent.keyDown(window, { key: 'T', shiftKey: true });
      expect(store.getState().tools.activeTool).toBe('transition');
    });

    it('should not activate shortcuts when typing in input', () => {
      const { store } = renderWithRedux(<ToolBar />);
      
      // Create a mock input element
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();
      
      // Press 'V' while focused on input
      fireEvent.keyDown(input, { key: 'V' });
      
      // Tool should not change
      expect(store.getState().tools.activeTool).toBe('select');
      
      document.body.removeChild(input);
    });

    it('should not activate shortcuts when typing in textarea', () => {
      const { store } = renderWithRedux(<ToolBar />);
      
      // Create a mock textarea element
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      textarea.focus();
      
      // Press 'C' while focused on textarea
      fireEvent.keyDown(textarea, { key: 'C' });
      
      // Tool should not change
      expect(store.getState().tools.activeTool).toBe('select');
      
      document.body.removeChild(textarea);
    });

    it('should handle Ctrl+S for save', () => {
      const { store } = renderWithRedux(<ToolBar />);
      
      // Press Ctrl+S
      fireEvent.keyDown(window, { key: 's', ctrlKey: true });
      
      // Should trigger save (status will change to saving then saved)
      waitFor(() => {
        expect(store.getState().project.saveStatus.state).toBe('saved');
      });
    });

    it('should handle Cmd+S for save on Mac', () => {
      const { store } = renderWithRedux(<ToolBar />);
      
      // Press Cmd+S
      fireEvent.keyDown(window, { key: 's', metaKey: true });
      
      // Should trigger save
      waitFor(() => {
        expect(store.getState().project.saveStatus.state).toBe('saved');
      });
    });

    it('should prevent default behavior for Ctrl+S', () => {
      renderWithRedux(<ToolBar />);
      
      const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      
      window.dispatchEvent(event);
      
      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Cursor Changes', () => {
    it('should apply cursor class for select tool', () => {
      const initialState = {
        tools: { activeTool: 'select' as ToolType, toolSettings: {} },
        project: {
          metadata: null,
          settings: {
            resolution: { width: 1920, height: 1080 },
            format: 'mp4' as const,
            fps: 30,
            quality: 'preview' as const,
          },
          saveStatus: { state: 'saved' as const },
          generationStatus: { state: 'idle' as const },
        },
      };
      
      renderWithRedux(<ToolBar />, initialState);
      
      expect(document.body).toHaveClass('cursor-default');
    });

    it('should apply cursor class for cut tool', () => {
      const { store } = renderWithRedux(<ToolBar />);
      
      const cutButton = screen.getByLabelText('Cut');
      fireEvent.click(cutButton);
      
      expect(document.body).toHaveClass('cursor-crosshair');
    });

    it('should apply cursor class for move tool', () => {
      const { store } = renderWithRedux(<ToolBar />);
      
      const moveButton = screen.getByLabelText('Move');
      fireEvent.click(moveButton);
      
      expect(document.body).toHaveClass('cursor-grab');
    });

    it('should apply cursor class for zoom tool', () => {
      const { store } = renderWithRedux(<ToolBar />);
      
      const zoomButton = screen.getByLabelText('Zoom');
      fireEvent.click(zoomButton);
      
      expect(document.body).toHaveClass('cursor-zoom-in');
    });

    it('should apply cursor class for trim tool', () => {
      const { store } = renderWithRedux(<ToolBar />);
      
      const trimButton = screen.getByLabelText('Trim');
      fireEvent.click(trimButton);
      
      expect(document.body).toHaveClass('cursor-ew-resize');
    });

    it('should apply cursor class for text tool', () => {
      const { store } = renderWithRedux(<ToolBar />);
      
      const textButton = screen.getByLabelText('Text');
      fireEvent.click(textButton);
      
      expect(document.body).toHaveClass('cursor-text');
    });

    it('should remove previous cursor class when tool changes', () => {
      const { store } = renderWithRedux(<ToolBar />);
      
      // Select cut tool
      const cutButton = screen.getByLabelText('Cut');
      fireEvent.click(cutButton);
      expect(document.body).toHaveClass('cursor-crosshair');
      
      // Select move tool
      const moveButton = screen.getByLabelText('Move');
      fireEvent.click(moveButton);
      expect(document.body).not.toHaveClass('cursor-crosshair');
      expect(document.body).toHaveClass('cursor-grab');
    });
  });

  describe('Project Management', () => {
    it('should display save status', () => {
      const initialState = {
        tools: { activeTool: 'select' as ToolType, toolSettings: {} },
        project: {
          metadata: null,
          settings: {
            resolution: { width: 1920, height: 1080 },
            format: 'mp4' as const,
            fps: 30,
            quality: 'preview' as const,
          },
          saveStatus: { state: 'modified' as const },
          generationStatus: { state: 'idle' as const },
        },
      };
      
      renderWithRedux(<ToolBar />, initialState);
      
      const saveButton = screen.getByLabelText('Save Project');
      const statusElement = saveButton.querySelector('.save-status');
      expect(statusElement).toHaveTextContent('modified');
      expect(statusElement).toHaveClass('modified');
    });

    it('should handle save button click', async () => {
      const { store } = renderWithRedux(<ToolBar />);
      
      const saveButton = screen.getByLabelText('Save Project');
      fireEvent.click(saveButton);
      
      // Should change to saving status
      expect(store.getState().project.saveStatus.state).toBe('saving');
      
      // Should change to saved after timeout
      await waitFor(() => {
        expect(store.getState().project.saveStatus.state).toBe('saved');
      }, { timeout: 1000 });
    });

    it('should handle project settings button click', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      renderWithRedux(<ToolBar />);
      
      const settingsButton = screen.getByLabelText('Project Settings');
      fireEvent.click(settingsButton);
      
      expect(consoleSpy).toHaveBeenCalledWith('Open project settings');
      
      consoleSpy.mockRestore();
    });

    it('should handle export button click', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      renderWithRedux(<ToolBar />);
      
      const exportButton = screen.getByLabelText('Export Project');
      fireEvent.click(exportButton);
      
      expect(consoleSpy).toHaveBeenCalledWith('Export project');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderWithRedux(<ToolBar />);
      
      const selectButton = screen.getByLabelText('Select');
      expect(selectButton).toHaveAttribute('aria-label', 'Select');
    });

    it('should have proper ARIA pressed state', () => {
      const initialState = {
        tools: { activeTool: 'cut' as ToolType, toolSettings: {} },
        project: {
          metadata: null,
          settings: {
            resolution: { width: 1920, height: 1080 },
            format: 'mp4' as const,
            fps: 30,
            quality: 'preview' as const,
          },
          saveStatus: { state: 'saved' as const },
          generationStatus: { state: 'idle' as const },
        },
      };
      
      renderWithRedux(<ToolBar />, initialState);
      
      const cutButton = screen.getByLabelText('Cut');
      expect(cutButton).toHaveAttribute('aria-pressed', 'true');
      
      const selectButton = screen.getByLabelText('Select');
      expect(selectButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('should have descriptive titles with shortcuts', () => {
      renderWithRedux(<ToolBar />);
      
      const selectButton = screen.getByLabelText('Select');
      expect(selectButton).toHaveAttribute('title', 'Select and move shots (V)');
    });

    it('should be keyboard navigable', () => {
      renderWithRedux(<ToolBar />);
      
      const selectButton = screen.getByLabelText('Select');
      selectButton.focus();
      
      expect(document.activeElement).toBe(selectButton);
    });
  });

  describe('Visual Feedback', () => {
    it('should show shortcut on hover', () => {
      const { container } = renderWithRedux(<ToolBar />);
      
      const selectButton = screen.getByLabelText('Select');
      const shortcut = selectButton.querySelector('.tool-shortcut');
      
      expect(shortcut).toBeInTheDocument();
      expect(shortcut).toHaveTextContent('V');
    });

    it('should display tool icons', () => {
      renderWithRedux(<ToolBar />);
      
      const selectButton = screen.getByLabelText('Select');
      const icon = selectButton.querySelector('.tool-icon');
      
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveTextContent('⬚');
    });

    it('should display tool labels', () => {
      renderWithRedux(<ToolBar />);
      
      const selectButton = screen.getByLabelText('Select');
      const label = selectButton.querySelector('.tool-label');
      
      expect(label).toBeInTheDocument();
      expect(label).toHaveTextContent('Select');
    });
  });

  describe('Tool Categories', () => {
    it('should group primary tools together', () => {
      const { container } = renderWithRedux(<ToolBar />);
      
      const primaryGroup = container.querySelector('.primary-tools');
      expect(primaryGroup).toBeInTheDocument();
      expect(primaryGroup?.querySelectorAll('.tool-btn').length).toBe(4);
    });

    it('should group media tools together', () => {
      const { container } = renderWithRedux(<ToolBar />);
      
      const mediaGroup = container.querySelector('.media-tools');
      expect(mediaGroup).toBeInTheDocument();
      expect(mediaGroup?.querySelectorAll('.tool-btn').length).toBe(3);
    });

    it('should group editing tools together', () => {
      const { container } = renderWithRedux(<ToolBar />);
      
      const editingGroup = container.querySelector('.editing-tools');
      expect(editingGroup).toBeInTheDocument();
      expect(editingGroup?.querySelectorAll('.tool-btn').length).toBe(5);
    });

    it('should group effects tools together', () => {
      const { container } = renderWithRedux(<ToolBar />);
      
      const effectsGroup = container.querySelector('.effects-tools');
      expect(effectsGroup).toBeInTheDocument();
      expect(effectsGroup?.querySelectorAll('.tool-btn').length).toBe(3);
    });

    it('should group project tools together', () => {
      const { container } = renderWithRedux(<ToolBar />);
      
      const projectGroup = container.querySelector('.project-tools');
      expect(projectGroup).toBeInTheDocument();
      expect(projectGroup?.querySelectorAll('.tool-btn').length).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid tool switching', () => {
      const { store } = renderWithRedux(<ToolBar />);
      
      const selectButton = screen.getByLabelText('Select');
      const cutButton = screen.getByLabelText('Cut');
      const moveButton = screen.getByLabelText('Move');
      
      fireEvent.click(selectButton);
      fireEvent.click(cutButton);
      fireEvent.click(moveButton);
      
      expect(store.getState().tools.activeTool).toBe('move');
    });

    it('should handle clicking same tool twice', () => {
      const { store } = renderWithRedux(<ToolBar />);
      
      const selectButton = screen.getByLabelText('Select');
      fireEvent.click(selectButton);
      fireEvent.click(selectButton);
      
      expect(store.getState().tools.activeTool).toBe('select');
    });

    it('should cleanup event listeners on unmount', () => {
      const { unmount } = renderWithRedux(<ToolBar />);
      
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      
      removeEventListenerSpy.mockRestore();
    });

    it('should cleanup cursor class on unmount', () => {
      const { unmount } = renderWithRedux(<ToolBar />);
      
      const cutButton = screen.getByLabelText('Cut');
      fireEvent.click(cutButton);
      
      expect(document.body).toHaveClass('cursor-crosshair');
      
      unmount();
      
      expect(document.body).not.toHaveClass('cursor-crosshair');
    });
  });
});
