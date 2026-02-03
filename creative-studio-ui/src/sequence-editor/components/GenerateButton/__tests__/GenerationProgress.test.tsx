/**
 * GenerationProgress Component Tests
 * Requirements: 7.2, 7.3, 7.4, 7.5, 7.7
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { GenerationProgress } from '../GenerationProgress';
import projectReducer from '../../../store/slices/projectSlice';
import timelineReducer from '../../../store/slices/timelineSlice';

// Helper to create a test store
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      project: projectReducer,
      timeline: timelineReducer,
    },
    preloadedState: initialState,
  });
};

describe('GenerationProgress Component', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Rendering States', () => {
    it('should render idle state', () => {
      store = createTestStore({
        project: {
          metadata: null,
          settings: {
            resolution: { width: 1920, height: 1080 },
            format: 'mp4',
            fps: 30,
            quality: 'preview',
          },
          saveStatus: { state: 'saved' },
          generationStatus: {
            state: 'idle',
          },
        },
      });

      render(
        <Provider store={store}>
          <GenerationProgress />
        </Provider>
      );

      expect(screen.getByText('Generation Pipeline')).toBeInTheDocument();
    });

    it('should render processing state with stage information', () => {
      store = createTestStore({
        project: {
          metadata: null,
          settings: {
            resolution: { width: 1920, height: 1080 },
            format: 'mp4',
            fps: 30,
            quality: 'preview',
          },
          saveStatus: { state: 'saved' },
          generationStatus: {
            state: 'processing',
            stage: 'grid',
            progress: 25,
          },
        },
      });

      render(
        <Provider store={store}>
          <GenerationProgress />
        </Provider>
      );

      expect(screen.getByText('Generating Sequence...')).toBeInTheDocument();
      expect(screen.getAllByText('Grid Generation').length).toBeGreaterThan(0);
      expect(screen.getByText('Generating image grid')).toBeInTheDocument();
    });

    it('should render complete state', () => {
      store = createTestStore({
        project: {
          metadata: null,
          settings: {
            resolution: { width: 1920, height: 1080 },
            format: 'mp4',
            fps: 30,
            quality: 'preview',
          },
          saveStatus: { state: 'saved' },
          generationStatus: {
            state: 'complete',
            progress: 100,
          },
        },
      });

      render(
        <Provider store={store}>
          <GenerationProgress />
        </Provider>
      );

      expect(screen.getByText('Generation Complete')).toBeInTheDocument();
      expect(screen.getByText('Sequence generated successfully!')).toBeInTheDocument();
    });

    it('should render error state with message', () => {
      store = createTestStore({
        project: {
          metadata: null,
          settings: {
            resolution: { width: 1920, height: 1080 },
            format: 'mp4',
            fps: 30,
            quality: 'preview',
          },
          saveStatus: { state: 'saved' },
          generationStatus: {
            state: 'error',
            error: 'Pipeline execution failed',
          },
        },
      });

      render(
        <Provider store={store}>
          <GenerationProgress />
        </Provider>
      );

      expect(screen.getByText('Generation Failed')).toBeInTheDocument();
      expect(screen.getByText('Pipeline execution failed')).toBeInTheDocument();
    });
  });

  describe('Progress Display', () => {
    it('should display overall progress percentage', () => {
      store = createTestStore({
        project: {
          metadata: null,
          settings: {
            resolution: { width: 1920, height: 1080 },
            format: 'mp4',
            fps: 30,
            quality: 'preview',
          },
          saveStatus: { state: 'saved' },
          generationStatus: {
            state: 'processing',
            stage: 'promotion',
            progress: 50,
          },
        },
      });

      render(
        <Provider store={store}>
          <GenerationProgress />
        </Provider>
      );

      // Should show percentage in header (there will be multiple percentages)
      const percentages = screen.getAllByText(/\d+%/);
      expect(percentages.length).toBeGreaterThan(0);
    });

    it('should display stage-specific progress', () => {
      store = createTestStore({
        project: {
          metadata: null,
          settings: {
            resolution: { width: 1920, height: 1080 },
            format: 'mp4',
            fps: 30,
            quality: 'preview',
          },
          saveStatus: { state: 'saved' },
          generationStatus: {
            state: 'processing',
            stage: 'qa',
            progress: 75,
          },
        },
      });

      render(
        <Provider store={store}>
          <GenerationProgress />
        </Provider>
      );

      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('should display all pipeline stages in timeline', () => {
      store = createTestStore({
        project: {
          metadata: null,
          settings: {
            resolution: { width: 1920, height: 1080 },
            format: 'mp4',
            fps: 30,
            quality: 'preview',
          },
          saveStatus: { state: 'saved' },
          generationStatus: {
            state: 'processing',
            stage: 'promotion',
            progress: 50,
          },
        },
      });

      render(
        <Provider store={store}>
          <GenerationProgress />
        </Provider>
      );

      // All stages should appear (some may appear multiple times)
      expect(screen.getAllByText('Grid Generation').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Video Promotion').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Quality Check').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Exporting').length).toBeGreaterThan(0);
    });
  });

  describe('Time Estimation', () => {
    it('should display elapsed time during processing', async () => {
      store = createTestStore({
        project: {
          metadata: null,
          settings: {
            resolution: { width: 1920, height: 1080 },
            format: 'mp4',
            fps: 30,
            quality: 'preview',
          },
          saveStatus: { state: 'saved' },
          generationStatus: {
            state: 'processing',
            stage: 'grid',
            progress: 25,
          },
        },
      });

      render(
        <Provider store={store}>
          <GenerationProgress />
        </Provider>
      );

      expect(screen.getByText('Elapsed')).toBeInTheDocument();
      expect(screen.getByText('Remaining')).toBeInTheDocument();
      expect(screen.getByText('Total')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should allow collapsing and expanding', () => {
      store = createTestStore({
        project: {
          metadata: null,
          settings: {
            resolution: { width: 1920, height: 1080 },
            format: 'mp4',
            fps: 30,
            quality: 'preview',
          },
          saveStatus: { state: 'saved' },
          generationStatus: {
            state: 'processing',
            stage: 'grid',
            progress: 25,
          },
        },
      });

      render(
        <Provider store={store}>
          <GenerationProgress />
        </Provider>
      );

      // Get the header button specifically
      const header = screen.getByText('Generating Sequence...').closest('[role="button"]');
      expect(header).toBeInTheDocument();
      
      // Should be expanded by default (▼ icon)
      expect(screen.getByText('▼')).toBeInTheDocument();
      expect(screen.getAllByText('Grid Generation').length).toBeGreaterThan(0);

      // Click to collapse
      if (header) {
        fireEvent.click(header);
      }

      // Should show collapsed icon (▶)
      expect(screen.getByText('▶')).toBeInTheDocument();
    });

    it('should show cancel button during processing', () => {
      store = createTestStore({
        project: {
          metadata: null,
          settings: {
            resolution: { width: 1920, height: 1080 },
            format: 'mp4',
            fps: 30,
            quality: 'preview',
          },
          saveStatus: { state: 'saved' },
          generationStatus: {
            state: 'processing',
            stage: 'grid',
            progress: 25,
          },
        },
      });

      render(
        <Provider store={store}>
          <GenerationProgress />
        </Provider>
      );

      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should show retry button on error', () => {
      store = createTestStore({
        project: {
          metadata: null,
          settings: {
            resolution: { width: 1920, height: 1080 },
            format: 'mp4',
            fps: 30,
            quality: 'preview',
          },
          saveStatus: { state: 'saved' },
          generationStatus: {
            state: 'error',
            error: 'Test error',
          },
        },
      });

      render(
        <Provider store={store}>
          <GenerationProgress />
        </Provider>
      );

      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  describe('Stage Progression', () => {
    it('should mark completed stages', () => {
      store = createTestStore({
        project: {
          metadata: null,
          settings: {
            resolution: { width: 1920, height: 1080 },
            format: 'mp4',
            fps: 30,
            quality: 'preview',
          },
          saveStatus: { state: 'saved' },
          generationStatus: {
            state: 'processing',
            stage: 'qa',
            progress: 75,
          },
        },
      });

      const { container } = render(
        <Provider store={store}>
          <GenerationProgress />
        </Provider>
      );

      // Check for complete stages (grid and promotion should be complete)
      const completeStages = container.querySelectorAll('.timeline-stage.complete');
      expect(completeStages.length).toBeGreaterThan(0);
    });

    it('should highlight current stage', () => {
      store = createTestStore({
        project: {
          metadata: null,
          settings: {
            resolution: { width: 1920, height: 1080 },
            format: 'mp4',
            fps: 30,
            quality: 'preview',
          },
          saveStatus: { state: 'saved' },
          generationStatus: {
            state: 'processing',
            stage: 'export',
            progress: 90,
          },
        },
      });

      const { container } = render(
        <Provider store={store}>
          <GenerationProgress />
        </Provider>
      );

      // Check for current stage
      const currentStage = container.querySelector('.timeline-stage.current');
      expect(currentStage).toBeInTheDocument();
    });
  });
});
