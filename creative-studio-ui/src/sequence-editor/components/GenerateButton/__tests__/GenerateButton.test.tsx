/**
 * GenerateButton Component Tests
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import GenerateButton from '../GenerateButton';
import projectReducer from '../../../store/slices/projectSlice';
import timelineReducer from '../../../store/slices/timelineSlice';
import type { Shot, Track } from '../../../types';

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

// Helper to create mock shots
const createMockShot = (id: string): Shot => ({
  id,
  name: `Shot ${id}`,
  startTime: 0,
  duration: 100,
  layers: [],
  referenceImages: [],
  prompt: 'Test prompt',
  parameters: {
    seed: 42,
    denoising: 0.7,
    steps: 30,
    guidance: 7.5,
    sampler: 'euler',
    scheduler: 'normal',
  },
  generationStatus: 'pending',
});

// Helper to create mock tracks
const createMockTrack = (id: string): Track => ({
  id,
  type: 'media',
  height: 100,
  locked: false,
  hidden: false,
  color: '#4A90E2',
  icon: '🎬',
});

describe('GenerateButton Component', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render the generate button', () => {
      store = createTestStore({
        timeline: {
          shots: [createMockShot('1')],
          tracks: [createMockTrack('1')],
          playheadPosition: 0,
          zoomLevel: 1,
          selectedElements: [],
        },
      });

      render(
        <Provider store={store}>
          <GenerateButton />
        </Provider>
      );

      expect(screen.getByTestId('generate-button')).toBeInTheDocument();
      expect(screen.getByText('Generate Sequence')).toBeInTheDocument();
    });

    it('should be disabled when no shots exist', () => {
      store = createTestStore({
        timeline: {
          shots: [],
          tracks: [],
          playheadPosition: 0,
          zoomLevel: 1,
          selectedElements: [],
        },
      });

      render(
        <Provider store={store}>
          <GenerateButton />
        </Provider>
      );

      const button = screen.getByTestId('generate-button');
      expect(button).toBeDisabled();
      expect(screen.getByText('Add shots and tracks to generate')).toBeInTheDocument();
    });

    it('should be enabled when shots and tracks exist', () => {
      store = createTestStore({
        timeline: {
          shots: [createMockShot('1')],
          tracks: [createMockTrack('1')],
          playheadPosition: 0,
          zoomLevel: 1,
          selectedElements: [],
        },
      });

      render(
        <Provider store={store}>
          <GenerateButton />
        </Provider>
      );

      const button = screen.getByTestId('generate-button');
      expect(button).not.toBeDisabled();
    });
  });

  describe('Generation Process', () => {
    it('should initiate generation when clicked', async () => {
      store = createTestStore({
        timeline: {
          shots: [createMockShot('1')],
          tracks: [createMockTrack('1')],
          playheadPosition: 0,
          zoomLevel: 1,
          selectedElements: [],
        },
      });

      render(
        <Provider store={store}>
          <GenerateButton />
        </Provider>
      );

      const button = screen.getByTestId('generate-button');
      fireEvent.click(button);

      // Check immediately after click
      const state = store.getState();
      expect(state.project.generationStatus.state).toBe('processing');
      expect(state.project.generationStatus.stage).toBe('grid');
    });

    it('should show progress indicator during generation', () => {
      store = createTestStore({
        timeline: {
          shots: [createMockShot('1')],
          tracks: [createMockTrack('1')],
          playheadPosition: 0,
          zoomLevel: 1,
          selectedElements: [],
        },
      });

      render(
        <Provider store={store}>
          <GenerateButton />
        </Provider>
      );

      const button = screen.getByTestId('generate-button');
      fireEvent.click(button);

      // Progress bar should appear immediately
      expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
    });

    it('should display current pipeline stage', () => {
      store = createTestStore({
        timeline: {
          shots: [createMockShot('1')],
          tracks: [createMockTrack('1')],
          playheadPosition: 0,
          zoomLevel: 1,
          selectedElements: [],
        },
      });

      render(
        <Provider store={store}>
          <GenerateButton />
        </Provider>
      );

      const button = screen.getByTestId('generate-button');
      fireEvent.click(button);

      expect(screen.getByText(/Generating \(grid\)/)).toBeInTheDocument();
    });

    it('should show success state after completion', async () => {
      store = createTestStore({
        timeline: {
          shots: [createMockShot('1')],
          tracks: [createMockTrack('1')],
          playheadPosition: 0,
          zoomLevel: 1,
          selectedElements: [],
        },
      });

      render(
        <Provider store={store}>
          <GenerateButton />
        </Provider>
      );

      const button = screen.getByTestId('generate-button');
      fireEvent.click(button);

      // Fast-forward through all stages (4 seconds total)
      await vi.advanceTimersByTimeAsync(4000);

      expect(screen.getByText('Generated!')).toBeInTheDocument();
    });

    it('should show cancel button during generation', () => {
      store = createTestStore({
        timeline: {
          shots: [createMockShot('1')],
          tracks: [createMockTrack('1')],
          playheadPosition: 0,
          zoomLevel: 1,
          selectedElements: [],
        },
      });

      render(
        <Provider store={store}>
          <GenerateButton />
        </Provider>
      );

      const button = screen.getByTestId('generate-button');
      fireEvent.click(button);

      expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
    });

    it('should cancel generation when cancel button is clicked', () => {
      store = createTestStore({
        timeline: {
          shots: [createMockShot('1')],
          tracks: [createMockTrack('1')],
          playheadPosition: 0,
          zoomLevel: 1,
          selectedElements: [],
        },
      });

      render(
        <Provider store={store}>
          <GenerateButton />
        </Provider>
      );

      const button = screen.getByTestId('generate-button');
      fireEvent.click(button);

      expect(screen.getByTestId('cancel-button')).toBeInTheDocument();

      const cancelButton = screen.getByTestId('cancel-button');
      fireEvent.click(cancelButton);

      const state = store.getState();
      expect(state.project.generationStatus.state).toBe('idle');
    });
  });

  describe('Error Handling', () => {
    it('should display error state with message', () => {
      store = createTestStore({
        timeline: {
          shots: [createMockShot('1')],
          tracks: [createMockTrack('1')],
          playheadPosition: 0,
          zoomLevel: 1,
          selectedElements: [],
        },
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
            error: 'Pipeline failed',
          },
        },
      });

      render(
        <Provider store={store}>
          <GenerateButton />
        </Provider>
      );

      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Pipeline failed')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      store = createTestStore({
        timeline: {
          shots: [createMockShot('1')],
          tracks: [createMockTrack('1')],
          playheadPosition: 0,
          zoomLevel: 1,
          selectedElements: [],
        },
      });

      render(
        <Provider store={store}>
          <GenerateButton />
        </Provider>
      );

      const button = screen.getByTestId('generate-button');
      expect(button).toHaveAttribute('aria-label', 'Generate Sequence');
      expect(button).toHaveAttribute('aria-busy', 'false');
    });

    it('should update aria-busy during generation', () => {
      store = createTestStore({
        timeline: {
          shots: [createMockShot('1')],
          tracks: [createMockTrack('1')],
          playheadPosition: 0,
          zoomLevel: 1,
          selectedElements: [],
        },
      });

      render(
        <Provider store={store}>
          <GenerateButton />
        </Provider>
      );

      const button = screen.getByTestId('generate-button');
      fireEvent.click(button);

      expect(button).toHaveAttribute('aria-busy', 'true');
    });
  });
});
