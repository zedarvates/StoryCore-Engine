/**
 * Shot Configuration Panel Tests
 * 
 * Tests for Task 8: Shot Configuration Panel
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { configureStore } from '@reduxjs/toolkit';
import { vi } from 'vitest';
import { ShotConfigPanel } from '../ShotConfigPanel';
import timelineReducer from '../../../store/slices/timelineSlice';
import projectReducer from '../../../store/slices/projectSlice';
import type { TimelineState, ProjectState } from '../../../types';

// ============================================================================
// Test Utilities
// ============================================================================

const createMockStore = (initialState: Partial<{
  timeline: Partial<TimelineState>;
  project: Partial<ProjectState>;
}> = {}) => {
  return configureStore({
    reducer: {
      timeline: timelineReducer,
      project: projectReducer,
    },
    preloadedState: {
      timeline: {
        shots: [
          {
            id: 'shot-1',
            name: 'Opening Scene',
            startTime: 0,
            duration: 5,
            prompt: 'A beautiful sunrise over mountains',
            referenceImages: [
              {
                id: 'ref-1',
                url: '/images/mountain.jpg',
                weight: 1.0,
                source: 'library' as const,
              },
            ],
            parameters: {
              seed: 12345,
              denoising: 0.75,
              steps: 30,
              guidance: 7.5,
              sampler: 'euler',
              scheduler: 'normal',
            },
            generationStatus: 'pending' as const,
            layers: [],
          },
          {
            id: 'shot-2',
            name: 'Character Introduction',
            startTime: 5,
            duration: 3,
            prompt: 'Hero character standing tall',
            referenceImages: [],
            parameters: {
              seed: 54321,
              denoising: 0.8,
              steps: 40,
              guidance: 8.0,
              sampler: 'euler',
              scheduler: 'normal',
            },
            generationStatus: 'pending' as const,
            layers: [],
          },
        ],
        tracks: [],
        playheadPosition: 0,
        zoomLevel: 10,
        duration: 8,
        selectedElements: ['shot-1'],
        markers: [],
        regions: [],
        selectedMarkers: [],
        selectedRegions: [],
        ...initialState.timeline,
      },
      project: {
        metadata: {
          name: 'Test Project',
          path: '/test/project',
          created: new Date(),
          modified: new Date(),
          author: 'Test User',
          description: 'Test project',
        },
        settings: {
          resolution: { width: 1920, height: 1080 },
          format: 'mp4' as const,
          fps: 24,
          quality: 'preview' as const,
        },
        saveStatus: { state: 'saved' as const },
        generationStatus: { state: 'idle' as const },
        ...initialState.project,
      },
    },
  });
};

const renderWithStore = (component: React.ReactElement, store = createMockStore()) => {
  return {
    ...render(
      <Provider store={store}>
        <DndProvider backend={HTML5Backend}>
          {component}
        </DndProvider>
      </Provider>
    ),
    store,
  };
};

// ============================================================================
// Test Suite
// ============================================================================

describe('ShotConfigPanel', () => {
  describe('Empty State', () => {
    it('should show empty state when no shot is selected', () => {
      const store = createMockStore({ timeline: { selectedElements: [] } });
      renderWithStore(<ShotConfigPanel />, store);

      expect(screen.getByText('No Shot Selected')).toBeInTheDocument();
      expect(screen.getByText('Select a shot from the timeline to edit its configuration')).toBeInTheDocument();
    });

    it('should show empty icon', () => {
      const store = createMockStore({ timeline: { selectedElements: [] } });
      const { container } = renderWithStore(<ShotConfigPanel />, store);

      const emptyIcon = container.querySelector('.empty-icon');
      expect(emptyIcon).toBeInTheDocument();
      expect(emptyIcon?.textContent).toBe('🎬');
    });
  });

  describe('Shot Display', () => {
    it('should display selected shot name', () => {
      renderWithStore(<ShotConfigPanel />);

      expect(screen.getByText('Opening Scene')).toBeInTheDocument();
    });

    it('should display shot prompt', () => {
      renderWithStore(<ShotConfigPanel />);

      const promptEditor = screen.getByPlaceholderText('Describe the shot in detail...');
      expect(promptEditor).toHaveValue('A beautiful sunrise over mountains');
    });

    it('should display reference images', () => {
      renderWithStore(<ShotConfigPanel />);

      const images = screen.getAllByRole('img');
      expect(images).toHaveLength(1);
      expect(images[0]).toHaveAttribute('src', '/images/mountain.jpg');
    });

    it('should display generation parameters', () => {
      renderWithStore(<ShotConfigPanel />);

      expect(screen.getByLabelText(/Seed/i)).toHaveValue(12345);
      expect(screen.getByLabelText(/Denoising/i)).toHaveValue(0.75);
      expect(screen.getByLabelText(/Steps/i)).toHaveValue(30);
      expect(screen.getByLabelText(/Guidance/i)).toHaveValue(7.5);
    });
  });

  describe('Prompt Editing', () => {
    it('should allow editing prompt', () => {
      renderWithStore(<ShotConfigPanel />);

      const promptEditor = screen.getByPlaceholderText('Describe the shot in detail...');
      fireEvent.change(promptEditor, { target: { value: 'New prompt text' } });

      expect(promptEditor).toHaveValue('New prompt text');
    });

    it('should show character count', () => {
      renderWithStore(<ShotConfigPanel />);

      expect(screen.getByText('34 characters')).toBeInTheDocument();
    });

    it('should update character count when prompt changes', () => {
      renderWithStore(<ShotConfigPanel />);

      const promptEditor = screen.getByPlaceholderText('Describe the shot in detail...');
      fireEvent.change(promptEditor, { target: { value: 'Short' } });

      expect(screen.getByText('5 characters')).toBeInTheDocument();
    });

    it('should show modified indicator when prompt changes', () => {
      const { container } = renderWithStore(<ShotConfigPanel />);

      const promptEditor = screen.getByPlaceholderText('Describe the shot in detail...');
      fireEvent.change(promptEditor, { target: { value: 'Modified prompt' } });

      const modifiedIndicator = container.querySelector('.modified-indicator');
      expect(modifiedIndicator).toBeInTheDocument();
    });
  });

  describe('Parameter Editing', () => {
    it('should allow editing seed', () => {
      renderWithStore(<ShotConfigPanel />);

      const seedInput = screen.getByLabelText(/Seed/i);
      fireEvent.change(seedInput, { target: { value: '99999' } });

      expect(seedInput).toHaveValue(99999);
    });

    it('should allow editing denoising', () => {
      renderWithStore(<ShotConfigPanel />);

      const denoisingInput = screen.getByLabelText(/Denoising/i);
      fireEvent.change(denoisingInput, { target: { value: '0.9' } });

      expect(denoisingInput).toHaveValue(0.9);
    });

    it('should allow editing steps', () => {
      renderWithStore(<ShotConfigPanel />);

      const stepsInput = screen.getByLabelText(/Steps/i);
      fireEvent.change(stepsInput, { target: { value: '50' } });

      expect(stepsInput).toHaveValue(50);
    });

    it('should allow editing guidance', () => {
      renderWithStore(<ShotConfigPanel />);

      const guidanceInput = screen.getByLabelText(/Guidance/i);
      fireEvent.change(guidanceInput, { target: { value: '10' } });

      expect(guidanceInput).toHaveValue(10);
    });

    it('should show modified indicator when parameters change', () => {
      const { container } = renderWithStore(<ShotConfigPanel />);

      const seedInput = screen.getByLabelText(/Seed/i);
      fireEvent.change(seedInput, { target: { value: '99999' } });

      const modifiedIndicator = container.querySelector('.modified-indicator');
      expect(modifiedIndicator).toBeInTheDocument();
    });
  });

  describe('Reference Images', () => {
    it('should display upload button', () => {
      renderWithStore(<ShotConfigPanel />);

      expect(screen.getByText('Add Image')).toBeInTheDocument();
    });

    it('should show remove button on image hover', () => {
      const { container } = renderWithStore(<ShotConfigPanel />);

      const imageItem = container.querySelector('.reference-image-item');
      expect(imageItem).toBeInTheDocument();

      const removeBtn = container.querySelector('.remove-image-btn');
      expect(removeBtn).toBeInTheDocument();
    });

    it('should remove image when remove button is clicked', () => {
      const { container } = renderWithStore(<ShotConfigPanel />);

      const removeBtn = container.querySelector('.remove-image-btn') as HTMLElement;
      fireEvent.click(removeBtn);

      // Image should be removed
      const images = screen.queryAllByRole('img');
      expect(images).toHaveLength(0);
    });

    it('should show image type badge', () => {
      const { container } = renderWithStore(<ShotConfigPanel />);

      const badge = container.querySelector('.image-type-badge');
      expect(badge).toBeInTheDocument();
      expect(badge?.textContent).toBe('library');
    });

    it('should show drag and drop hint', () => {
      renderWithStore(<ShotConfigPanel />);

      expect(screen.getByText('Drag and drop images here or click to upload')).toBeInTheDocument();
    });
  });

  describe('Apply/Revert Actions', () => {
    it('should have apply and revert buttons', () => {
      renderWithStore(<ShotConfigPanel />);

      expect(screen.getByText('Apply Changes')).toBeInTheDocument();
      expect(screen.getByText('Revert')).toBeInTheDocument();
    });

    it('should disable buttons when no modifications', () => {
      renderWithStore(<ShotConfigPanel />);

      const applyBtn = screen.getByText('Apply Changes');
      const revertBtn = screen.getByText('Revert');

      expect(applyBtn).toBeDisabled();
      expect(revertBtn).toBeDisabled();
    });

    it('should enable buttons when modifications exist', () => {
      renderWithStore(<ShotConfigPanel />);

      const promptEditor = screen.getByPlaceholderText('Describe the shot in detail...');
      fireEvent.change(promptEditor, { target: { value: 'Modified' } });

      const applyBtn = screen.getByText('Apply Changes');
      const revertBtn = screen.getByText('Revert');

      expect(applyBtn).not.toBeDisabled();
      expect(revertBtn).not.toBeDisabled();
    });

    it('should revert changes when revert button is clicked', () => {
      renderWithStore(<ShotConfigPanel />);

      const promptEditor = screen.getByPlaceholderText('Describe the shot in detail...');
      const originalValue = 'A beautiful sunrise over mountains';

      // Modify prompt
      fireEvent.change(promptEditor, { target: { value: 'Modified' } });
      expect(promptEditor).toHaveValue('Modified');

      // Revert
      const revertBtn = screen.getByText('Revert');
      fireEvent.click(revertBtn);

      expect(promptEditor).toHaveValue(originalValue);
    });

    it('should dispatch updateShot action when apply is clicked', () => {
      const store = createMockStore();
      const dispatchSpy = vi.spyOn(store, 'dispatch');

      renderWithStore(<ShotConfigPanel />, store);

      const promptEditor = screen.getByPlaceholderText('Describe the shot in detail...');
      fireEvent.change(promptEditor, { target: { value: 'Modified prompt' } });

      const applyBtn = screen.getByText('Apply Changes');
      fireEvent.click(applyBtn);

      expect(dispatchSpy).toHaveBeenCalled();
    });

    it('should clear modified indicator after apply', () => {
      const { container } = renderWithStore(<ShotConfigPanel />);

      const promptEditor = screen.getByPlaceholderText('Describe the shot in detail...');
      fireEvent.change(promptEditor, { target: { value: 'Modified' } });

      let modifiedIndicator = container.querySelector('.modified-indicator');
      expect(modifiedIndicator).toBeInTheDocument();

      const applyBtn = screen.getByText('Apply Changes');
      fireEvent.click(applyBtn);

      modifiedIndicator = container.querySelector('.modified-indicator');
      expect(modifiedIndicator).not.toBeInTheDocument();
    });
  });

  describe('Shot Selection Changes', () => {
    it('should update display when different shot is selected', () => {
      const store1 = createMockStore({ timeline: { selectedElements: ['shot-1'] } });
      const { unmount } = renderWithStore(<ShotConfigPanel />, store1);

      expect(screen.getByText('Opening Scene')).toBeInTheDocument();
      unmount();

      // Render with different shot selected
      const store2 = createMockStore({ timeline: { selectedElements: ['shot-2'] } });
      renderWithStore(<ShotConfigPanel />, store2);

      expect(screen.getByText('Character Introduction')).toBeInTheDocument();
    });

    it('should reset modifications when shot changes', () => {
      const store1 = createMockStore({ timeline: { selectedElements: ['shot-1'] } });
      const { container: container1, unmount } = renderWithStore(<ShotConfigPanel />, store1);

      // Modify current shot
      const promptEditor = screen.getByPlaceholderText('Describe the shot in detail...');
      fireEvent.change(promptEditor, { target: { value: 'Modified' } });

      let modifiedIndicator = container1.querySelector('.modified-indicator');
      expect(modifiedIndicator).toBeInTheDocument();
      unmount();

      // Render with different shot selected (should not have modifications)
      const store2 = createMockStore({ timeline: { selectedElements: ['shot-2'] } });
      const { container: container2 } = renderWithStore(<ShotConfigPanel />, store2);

      modifiedIndicator = container2.querySelector('.modified-indicator');
      expect(modifiedIndicator).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for inputs', () => {
      renderWithStore(<ShotConfigPanel />);

      expect(screen.getByLabelText(/Seed/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Denoising/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Steps/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Guidance/i)).toBeInTheDocument();
    });

    it('should have tooltips for parameter hints', () => {
      const { container } = renderWithStore(<ShotConfigPanel />);

      const hints = container.querySelectorAll('.param-hint');
      expect(hints.length).toBeGreaterThan(0);

      hints.forEach((hint) => {
        expect(hint).toHaveAttribute('title');
      });
    });

    it('should have proper button titles', () => {
      const { container } = renderWithStore(<ShotConfigPanel />);

      const removeBtn = container.querySelector('.remove-image-btn');
      expect(removeBtn).toHaveAttribute('title', 'Remove image');
    });
  });

  describe('Responsive Behavior', () => {
    it('should render reference images grid', () => {
      const { container } = renderWithStore(<ShotConfigPanel />);

      const grid = container.querySelector('.reference-images-grid');
      expect(grid).toBeInTheDocument();
    });

    it('should render parameters grid', () => {
      const { container } = renderWithStore(<ShotConfigPanel />);

      const grid = container.querySelector('.parameters-grid');
      expect(grid).toBeInTheDocument();
    });
  });
});
