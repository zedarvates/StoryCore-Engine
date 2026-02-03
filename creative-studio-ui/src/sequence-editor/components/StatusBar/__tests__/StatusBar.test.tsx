/**
 * StatusBar Component Tests
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { StatusBar } from '../StatusBar';
import projectReducer from '../../../store/slices/projectSlice';
import type { ProjectState } from '../../../types';

// Mock store setup
const createMockStore = (projectState: Partial<ProjectState>) => {
  return configureStore({
    reducer: {
      project: () => ({
        metadata: null,
        settings: {
          resolution: { width: 1920, height: 1080 },
          format: 'mp4',
          fps: 30,
          quality: 'preview',
        },
        saveStatus: {
          state: 'saved',
        },
        generationStatus: {
          state: 'idle',
        },
        ...projectState,
      }),
    },
  });
};

describe('StatusBar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Requirement 8.1: Display at bottom right', () => {
    it('should render the status bar', () => {
      const store = createMockStore({});
      render(
        <Provider store={store}>
          <StatusBar />
        </Provider>
      );

      const statusBar = screen.getByRole('status');
      expect(statusBar).toBeInTheDocument();
      expect(statusBar).toHaveClass('status-bar');
    });
  });

  describe('Requirement 8.2: Show project metadata', () => {
    it('should display project path', () => {
      const store = createMockStore({
        metadata: {
          name: 'Test Project',
          path: '/projects/test-project',
          created: new Date(),
          modified: new Date(),
          author: 'Test User',
          description: 'Test description',
        },
      });

      render(
        <Provider store={store}>
          <StatusBar />
        </Provider>
      );

      expect(screen.getByText('/projects/test-project')).toBeInTheDocument();
    });

    it('should display "Untitled Project" when no path is set', () => {
      const store = createMockStore({
        metadata: null,
      });

      render(
        <Provider store={store}>
          <StatusBar />
        </Provider>
      );

      expect(screen.getByText('Untitled Project')).toBeInTheDocument();
    });

    it('should truncate long project paths', () => {
      const longPath = '/very/long/path/to/project/that/exceeds/forty/characters/in/length';
      const store = createMockStore({
        metadata: {
          name: 'Test Project',
          path: longPath,
          created: new Date(),
          modified: new Date(),
          author: 'Test User',
          description: 'Test description',
        },
      });

      render(
        <Provider store={store}>
          <StatusBar />
        </Provider>
      );

      const pathElement = screen.getByText(/\.\.\./);
      expect(pathElement.textContent).toHaveLength(40);
    });

    it('should display format', () => {
      const store = createMockStore({
        settings: {
          resolution: { width: 1920, height: 1080 },
          format: 'mp4',
          fps: 30,
          quality: 'preview',
        },
      });

      render(
        <Provider store={store}>
          <StatusBar />
        </Provider>
      );

      expect(screen.getByText('MP4')).toBeInTheDocument();
    });

    it('should display resolution', () => {
      const store = createMockStore({
        settings: {
          resolution: { width: 1920, height: 1080 },
          format: 'mp4',
          fps: 30,
          quality: 'preview',
        },
      });

      render(
        <Provider store={store}>
          <StatusBar />
        </Provider>
      );

      expect(screen.getByText('1920x1080')).toBeInTheDocument();
    });

    it('should display FPS', () => {
      const store = createMockStore({
        settings: {
          resolution: { width: 1920, height: 1080 },
          format: 'mp4',
          fps: 24,
          quality: 'preview',
        },
      });

      render(
        <Provider store={store}>
          <StatusBar />
        </Provider>
      );

      expect(screen.getByText('24')).toBeInTheDocument();
    });
  });

  describe('Requirement 8.3: Display "Modified" indicator', () => {
    it('should show "Modified" when project has unsaved changes', () => {
      const store = createMockStore({
        saveStatus: {
          state: 'modified',
        },
      });

      render(
        <Provider store={store}>
          <StatusBar />
        </Provider>
      );

      expect(screen.getByText('Modified')).toBeInTheDocument();
    });
  });

  describe('Requirement 8.4: Display last save timestamp', () => {
    it('should show "Saved just now" for recent saves', () => {
      const store = createMockStore({
        saveStatus: {
          state: 'saved',
          lastSaveTime: new Date(),
        },
      });

      render(
        <Provider store={store}>
          <StatusBar />
        </Provider>
      );

      expect(screen.getByText('Saved just now')).toBeInTheDocument();
    });

    it('should show relative time for saves within minutes', () => {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      const store = createMockStore({
        saveStatus: {
          state: 'saved',
          lastSaveTime: twoMinutesAgo,
        },
      });

      render(
        <Provider store={store}>
          <StatusBar />
        </Provider>
      );

      expect(screen.getByText('Saved 2 minutes ago')).toBeInTheDocument();
    });

    it('should show relative time for saves within hours', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const store = createMockStore({
        saveStatus: {
          state: 'saved',
          lastSaveTime: twoHoursAgo,
        },
      });

      render(
        <Provider store={store}>
          <StatusBar />
        </Provider>
      );

      expect(screen.getByText('Saved 2 hours ago')).toBeInTheDocument();
    });

    it('should show "Never saved" when no save time exists', () => {
      const store = createMockStore({
        saveStatus: {
          state: 'saved',
        },
      });

      render(
        <Provider store={store}>
          <StatusBar />
        </Provider>
      );

      expect(screen.getByText('Never saved')).toBeInTheDocument();
    });
  });

  describe('Requirement 8.5: Real-time updates', () => {
    it('should update when project settings change', () => {
      const store = createMockStore({
        settings: {
          resolution: { width: 1920, height: 1080 },
          format: 'mp4',
          fps: 30,
          quality: 'preview',
        },
      });

      const { rerender } = render(
        <Provider store={store}>
          <StatusBar />
        </Provider>
      );

      expect(screen.getByText('1920x1080')).toBeInTheDocument();

      // Update store with new settings
      const newStore = createMockStore({
        settings: {
          resolution: { width: 3840, height: 2160 },
          format: 'mp4',
          fps: 30,
          quality: 'preview',
        },
      });

      rerender(
        <Provider store={newStore}>
          <StatusBar />
        </Provider>
      );

      expect(screen.getByText('3840x2160')).toBeInTheDocument();
    });
  });

  describe('Requirement 8.6: Color coding', () => {
    it('should use green color for saved state', () => {
      const store = createMockStore({
        saveStatus: {
          state: 'saved',
          lastSaveTime: new Date(),
        },
      });

      render(
        <Provider store={store}>
          <StatusBar />
        </Provider>
      );

      const saveStatus = screen.getByText('Saved just now').closest('.save-status');
      expect(saveStatus).toHaveClass('status-saved');
    });

    it('should use yellow color for modified state', () => {
      const store = createMockStore({
        saveStatus: {
          state: 'modified',
        },
      });

      render(
        <Provider store={store}>
          <StatusBar />
        </Provider>
      );

      const saveStatus = screen.getByText('Modified').closest('.save-status');
      expect(saveStatus).toHaveClass('status-modified');
    });

    it('should use red color for error state', () => {
      const store = createMockStore({
        saveStatus: {
          state: 'error',
          error: 'Failed to save project',
        },
      });

      render(
        <Provider store={store}>
          <StatusBar />
        </Provider>
      );

      const saveStatus = screen.getByText('Failed to save project').closest('.save-status');
      expect(saveStatus).toHaveClass('status-error');
    });

    it('should show saving state with animation', () => {
      const store = createMockStore({
        saveStatus: {
          state: 'saving',
        },
      });

      render(
        <Provider store={store}>
          <StatusBar />
        </Provider>
      );

      const saveStatus = screen.getByText('Saving...').closest('.save-status');
      expect(saveStatus).toHaveClass('status-saving');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const store = createMockStore({});

      render(
        <Provider store={store}>
          <StatusBar />
        </Provider>
      );

      const statusBar = screen.getByRole('status');
      expect(statusBar).toHaveAttribute('aria-live', 'polite');
    });

    it('should provide tooltips for project path', () => {
      const store = createMockStore({
        metadata: {
          name: 'Test Project',
          path: '/projects/test-project',
          created: new Date(),
          modified: new Date(),
          author: 'Test User',
          description: 'Test description',
        },
      });

      render(
        <Provider store={store}>
          <StatusBar />
        </Provider>
      );

      const pathElement = screen.getByText('/projects/test-project').closest('.status-path');
      expect(pathElement).toHaveAttribute('title', '/projects/test-project');
    });
  });
});
