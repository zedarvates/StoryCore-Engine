/**
 * StatusBar Real-time Updates Tests
 * Requirements: 8.3, 8.5
 * 
 * Tests that StatusBar updates in real-time when Redux state changes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { StatusBar } from '../StatusBar';
import projectReducer, { 
  updateSettings, 
  markModified, 
  markSaved,
  setSaveStatus,
  setProject,
} from '../../../store/slices/projectSlice';

// Create a real store for testing real-time updates
const createTestStore = () => {
  return configureStore({
    reducer: {
      project: projectReducer,
    },
  });
};

describe('StatusBar Real-time Updates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Requirement 8.5: Real-time status updates', () => {
    it('should update resolution when settings change', async () => {
      const store = createTestStore();

      render(
        <Provider store={store}>
          <StatusBar />
        </Provider>
      );

      // Initial resolution
      expect(screen.getByText('1920x1080')).toBeInTheDocument();

      // Dispatch action to change resolution
      store.dispatch(updateSettings({
        resolution: { width: 3840, height: 2160 },
      }));

      // Should update immediately
      await waitFor(() => {
        expect(screen.getByText('3840x2160')).toBeInTheDocument();
      });
    });

    it('should update format when settings change', async () => {
      const store = createTestStore();

      render(
        <Provider store={store}>
          <StatusBar />
        </Provider>
      );

      // Initial format
      expect(screen.getByText('MP4')).toBeInTheDocument();

      // Dispatch action to change format
      store.dispatch(updateSettings({
        format: 'mov',
      }));

      // Should update immediately
      await waitFor(() => {
        expect(screen.getByText('MOV')).toBeInTheDocument();
      });
    });

    it('should update FPS when settings change', async () => {
      const store = createTestStore();

      render(
        <Provider store={store}>
          <StatusBar />
        </Provider>
      );

      // Initial FPS
      expect(screen.getByText('30')).toBeInTheDocument();

      // Dispatch action to change FPS
      store.dispatch(updateSettings({
        fps: 60,
      }));

      // Should update immediately
      await waitFor(() => {
        expect(screen.getByText('60')).toBeInTheDocument();
      });
    });

    it('should update project path when metadata changes', async () => {
      const store = createTestStore();

      render(
        <Provider store={store}>
          <StatusBar />
        </Provider>
      );

      // Initial state - no project
      expect(screen.getByText('Untitled Project')).toBeInTheDocument();

      // Dispatch action to set project
      store.dispatch(setProject({
        name: 'My Project',
        path: '/projects/my-project',
        created: new Date(),
        modified: new Date(),
        author: 'Test User',
        description: 'Test project',
      }));

      // Should update immediately
      await waitFor(() => {
        expect(screen.getByText('/projects/my-project')).toBeInTheDocument();
      });
    });
  });

  describe('Requirement 8.3: Modified indicator updates', () => {
    it('should show "Modified" when markModified is dispatched', async () => {
      const store = createTestStore();

      render(
        <Provider store={store}>
          <StatusBar />
        </Provider>
      );

      // Initial state - saved
      expect(screen.queryByText('Modified')).not.toBeInTheDocument();

      // Dispatch action to mark as modified
      store.dispatch(markModified());

      // Should update immediately
      await waitFor(() => {
        expect(screen.getByText('Modified')).toBeInTheDocument();
      });
    });

    it('should update from "Modified" to "Saved" when markSaved is dispatched', async () => {
      const store = createTestStore();

      // Start with modified state
      store.dispatch(markModified());

      render(
        <Provider store={store}>
          <StatusBar />
        </Provider>
      );

      // Should show modified
      expect(screen.getByText('Modified')).toBeInTheDocument();

      // Dispatch action to mark as saved
      store.dispatch(markSaved());

      // Should update to saved state
      await waitFor(() => {
        expect(screen.getByText('Saved just now')).toBeInTheDocument();
      });
    });

    it('should show "Saving..." during save operation', async () => {
      const store = createTestStore();

      render(
        <Provider store={store}>
          <StatusBar />
        </Provider>
      );

      // Dispatch action to set saving state
      store.dispatch(setSaveStatus({
        state: 'saving',
      }));

      // Should update immediately
      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument();
      });
    });

    it('should show error message when save fails', async () => {
      const store = createTestStore();

      render(
        <Provider store={store}>
          <StatusBar />
        </Provider>
      );

      // Dispatch action to set error state
      store.dispatch(setSaveStatus({
        state: 'error',
        error: 'Network error',
      }));

      // Should update immediately
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  describe('Save timestamp updates', () => {
    it('should update relative time as time passes', async () => {
      const store = createTestStore();

      // Set save time to 30 seconds ago
      const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
      store.dispatch(setSaveStatus({
        state: 'saved',
        lastSaveTime: thirtySecondsAgo,
      }));

      render(
        <Provider store={store}>
          <StatusBar />
        </Provider>
      );

      // Should show "Saved just now" for saves within 60 seconds
      expect(screen.getByText('Saved just now')).toBeInTheDocument();

      // Update to 2 minutes ago
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      store.dispatch(setSaveStatus({
        state: 'saved',
        lastSaveTime: twoMinutesAgo,
      }));

      // Should update to show minutes
      await waitFor(() => {
        expect(screen.getByText('Saved 2 minutes ago')).toBeInTheDocument();
      });
    });
  });

  describe('Color coding updates', () => {
    it('should change color class when save state changes', async () => {
      const store = createTestStore();

      render(
        <Provider store={store}>
          <StatusBar />
        </Provider>
      );

      // Initial state - saved (green)
      let saveStatus = screen.getByText(/Saved|Never saved/).closest('.save-status');
      expect(saveStatus).toHaveClass('status-saved');

      // Change to modified (yellow)
      store.dispatch(markModified());

      await waitFor(() => {
        saveStatus = screen.getByText('Modified').closest('.save-status');
        expect(saveStatus).toHaveClass('status-modified');
      });

      // Change to error (red)
      store.dispatch(setSaveStatus({
        state: 'error',
        error: 'Save failed',
      }));

      await waitFor(() => {
        saveStatus = screen.getByText('Save failed').closest('.save-status');
        expect(saveStatus).toHaveClass('status-error');
      });

      // Change to saving (blue)
      store.dispatch(setSaveStatus({
        state: 'saving',
      }));

      await waitFor(() => {
        saveStatus = screen.getByText('Saving...').closest('.save-status');
        expect(saveStatus).toHaveClass('status-saving');
      });
    });
  });

  describe('Multiple simultaneous updates', () => {
    it('should handle multiple state changes correctly', async () => {
      const store = createTestStore();

      render(
        <Provider store={store}>
          <StatusBar />
        </Provider>
      );

      // Dispatch multiple actions
      store.dispatch(setProject({
        name: 'Test Project',
        path: '/test/project',
        created: new Date(),
        modified: new Date(),
        author: 'Test',
        description: 'Test',
      }));

      store.dispatch(updateSettings({
        resolution: { width: 2560, height: 1440 },
        format: 'webm',
        fps: 60,
      }));

      store.dispatch(markModified());

      // All updates should be reflected
      await waitFor(() => {
        expect(screen.getByText('/test/project')).toBeInTheDocument();
        expect(screen.getByText('2560x1440')).toBeInTheDocument();
        expect(screen.getByText('WEBM')).toBeInTheDocument();
        expect(screen.getByText('60')).toBeInTheDocument();
        expect(screen.getByText('Modified')).toBeInTheDocument();
      });
    });
  });
});
