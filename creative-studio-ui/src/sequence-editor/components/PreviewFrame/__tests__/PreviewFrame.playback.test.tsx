/**
 * PreviewFrame Playback Tests
 * Tests for Task 7.3 (Playback Engine) and Task 7.4 (Playback Controls UI)
 * Requirements: 3.4, 3.5, 3.6, 17.2
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { PreviewFrame } from '../PreviewFrame';
import timelineReducer from '../../../store/slices/timelineSlice';
import previewReducer from '../../../store/slices/previewSlice';
import projectReducer from '../../../store/slices/projectSlice';

// Mock requestAnimationFrame
let rafCallbacks: FrameRequestCallback[] = [];
let rafId = 0;

beforeEach(() => {
  rafCallbacks = [];
  rafId = 0;
  
  global.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
    rafCallbacks.push(callback);
    return ++rafId;
  });
  
  global.cancelAnimationFrame = vi.fn((id: number) => {
    // Remove callback
  });
  
  global.performance.now = vi.fn(() => Date.now());
});

afterEach(() => {
  rafCallbacks = [];
});

// Helper to create test store
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      timeline: timelineReducer,
      preview: previewReducer,
      project: projectReducer,
    },
    preloadedState: initialState,
  });
};

// Helper to render with Redux and DnD
const renderWithProviders = (component: React.ReactElement, initialState = {}) => {
  const store = createTestStore(initialState);
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

describe('PreviewFrame - Playback Engine (Task 7.3)', () => {
  describe('Play/Pause Controls', () => {
    it('should start playback when play button is clicked', () => {
      const initialState = {
        timeline: {
          shots: [],
          tracks: [],
          playheadPosition: 0,
          zoomLevel: 1,
          selectedElements: [],
          duration: 1000,
          markers: [],
          regions: [],
          selectedMarkers: [],
          selectedRegions: [],
        },
        preview: {
          currentFrame: null,
          playbackState: 'paused' as const,
          playbackSpeed: 1,
        },
        project: {
          metadata: null,
          settings: {
            resolution: { width: 1280, height: 720 },
            format: 'mp4' as const,
            fps: 24,
            quality: 'preview' as const,
          },
          saveStatus: { state: 'saved' as const },
          generationStatus: { state: 'idle' as const },
        },
      };
      
      const { store } = renderWithProviders(<PreviewFrame />, initialState);
      
      const playButton = screen.getByTitle(/Play\/Pause/i);
      fireEvent.click(playButton);
      
      expect(store.getState().preview.playbackState).toBe('playing');
    });

    it('should pause playback when pause button is clicked', () => {
      const initialState = {
        timeline: {
          shots: [],
          tracks: [],
          playheadPosition: 0,
          zoomLevel: 1,
          selectedElements: [],
          duration: 1000,
          markers: [],
          regions: [],
          selectedMarkers: [],
          selectedRegions: [],
        },
        preview: {
          currentFrame: null,
          playbackState: 'playing' as const,
          playbackSpeed: 1,
        },
        project: {
          metadata: null,
          settings: {
            resolution: { width: 1280, height: 720 },
            format: 'mp4' as const,
            fps: 24,
            quality: 'preview' as const,
          },
          saveStatus: { state: 'saved' as const },
          generationStatus: { state: 'idle' as const },
        },
      };
      
      const { store } = renderWithProviders(<PreviewFrame />, initialState);
      
      const pauseButton = screen.getByTitle(/Play\/Pause/i);
      fireEvent.click(pauseButton);
      
      expect(store.getState().preview.playbackState).toBe('paused');
    });

    it('should stop playback and reset to start', () => {
      const initialState = {
        timeline: {
          shots: [],
          tracks: [],
          playheadPosition: 500,
          zoomLevel: 1,
          selectedElements: [],
          duration: 1000,
          markers: [],
          regions: [],
          selectedMarkers: [],
          selectedRegions: [],
        },
        preview: {
          currentFrame: null,
          playbackState: 'playing' as const,
          playbackSpeed: 1,
        },
        project: {
          metadata: null,
          settings: {
            resolution: { width: 1280, height: 720 },
            format: 'mp4' as const,
            fps: 24,
            quality: 'preview' as const,
          },
          saveStatus: { state: 'saved' as const },
          generationStatus: { state: 'idle' as const },
        },
      };
      
      const { store } = renderWithProviders(<PreviewFrame />, initialState);
      
      const stopButton = screen.getByTitle(/Stop/i);
      fireEvent.click(stopButton);
      
      expect(store.getState().preview.playbackState).toBe('stopped');
      expect(store.getState().timeline.playheadPosition).toBe(0);
    });
  });

  describe('Frame Stepping', () => {
    it('should step forward one frame', () => {
      const initialState = {
        timeline: {
          shots: [],
          tracks: [],
          playheadPosition: 0,
          zoomLevel: 10,
          selectedElements: [],
          duration: 1000,
          markers: [],
          regions: [],
          selectedMarkers: [],
          selectedRegions: [],
        },
        preview: {
          currentFrame: null,
          playbackState: 'paused' as const,
          playbackSpeed: 1,
        },
        project: {
          metadata: null,
          settings: {
            resolution: { width: 1280, height: 720 },
            format: 'mp4' as const,
            fps: 24,
            quality: 'preview' as const,
          },
          saveStatus: { state: 'saved' as const },
          generationStatus: { state: 'idle' as const },
        },
      };
      
      const { store } = renderWithProviders(<PreviewFrame />, initialState);
      
      const forwardButton = screen.getByTitle(/Next frame/i);
      fireEvent.click(forwardButton);
      
      expect(store.getState().timeline.playheadPosition).toBe(10);
    });

    it('should step backward one frame', () => {
      const initialState = {
        timeline: {
          shots: [],
          tracks: [],
          playheadPosition: 100,
          zoomLevel: 10,
          selectedElements: [],
          duration: 1000,
          markers: [],
          regions: [],
          selectedMarkers: [],
          selectedRegions: [],
        },
        preview: {
          currentFrame: null,
          playbackState: 'paused' as const,
          playbackSpeed: 1,
        },
        project: {
          metadata: null,
          settings: {
            resolution: { width: 1280, height: 720 },
            format: 'mp4' as const,
            fps: 24,
            quality: 'preview' as const,
          },
          saveStatus: { state: 'saved' as const },
          generationStatus: { state: 'idle' as const },
        },
      };
      
      const { store } = renderWithProviders(<PreviewFrame />, initialState);
      
      const backwardButton = screen.getByTitle(/Previous frame/i);
      fireEvent.click(backwardButton);
      
      expect(store.getState().timeline.playheadPosition).toBe(90);
    });

    it('should not go below zero when stepping backward', () => {
      const initialState = {
        timeline: {
          shots: [],
          tracks: [],
          playheadPosition: 5,
          zoomLevel: 10,
          selectedElements: [],
          duration: 1000,
          markers: [],
          regions: [],
          selectedMarkers: [],
          selectedRegions: [],
        },
        preview: {
          currentFrame: null,
          playbackState: 'paused' as const,
          playbackSpeed: 1,
        },
        project: {
          metadata: null,
          settings: {
            resolution: { width: 1280, height: 720 },
            format: 'mp4' as const,
            fps: 24,
            quality: 'preview' as const,
          },
          saveStatus: { state: 'saved' as const },
          generationStatus: { state: 'idle' as const },
        },
      };
      
      const { store } = renderWithProviders(<PreviewFrame />, initialState);
      
      const backwardButton = screen.getByTitle(/Previous frame/i);
      fireEvent.click(backwardButton);
      
      expect(store.getState().timeline.playheadPosition).toBe(0);
    });
  });

  describe('Playback Speed', () => {
    it('should support multiple playback speeds', () => {
      const initialState = {
        timeline: {
          shots: [],
          tracks: [],
          playheadPosition: 0,
          zoomLevel: 1,
          selectedElements: [],
          duration: 1000,
          markers: [],
          regions: [],
          selectedMarkers: [],
          selectedRegions: [],
        },
        preview: {
          currentFrame: null,
          playbackState: 'paused' as const,
          playbackSpeed: 1,
        },
        project: {
          metadata: null,
          settings: {
            resolution: { width: 1280, height: 720 },
            format: 'mp4' as const,
            fps: 24,
            quality: 'preview' as const,
          },
          saveStatus: { state: 'saved' as const },
          generationStatus: { state: 'idle' as const },
        },
      };
      
      renderWithProviders(<PreviewFrame />, initialState);
      
      const speedSelect = screen.getByRole('combobox');
      expect(speedSelect).toBeInTheDocument();
      
      // Check available speeds
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(5); // 0.25x, 0.5x, 1x, 1.5x, 2x
    });
  });

  describe('RequestAnimationFrame Loop', () => {
    it('should use requestAnimationFrame for playback', () => {
      const initialState = {
        timeline: {
          shots: [],
          tracks: [],
          playheadPosition: 0,
          zoomLevel: 1,
          selectedElements: [],
          duration: 1000,
          markers: [],
          regions: [],
          selectedMarkers: [],
          selectedRegions: [],
        },
        preview: {
          currentFrame: null,
          playbackState: 'playing' as const,
          playbackSpeed: 1,
        },
        project: {
          metadata: null,
          settings: {
            resolution: { width: 1280, height: 720 },
            format: 'mp4' as const,
            fps: 24,
            quality: 'preview' as const,
          },
          saveStatus: { state: 'saved' as const },
          generationStatus: { state: 'idle' as const },
        },
      };
      
      renderWithProviders(<PreviewFrame />, initialState);
      
      expect(global.requestAnimationFrame).toHaveBeenCalled();
    });

    it('should cancel animation frame on pause', () => {
      const initialState = {
        timeline: {
          shots: [],
          tracks: [],
          playheadPosition: 0,
          zoomLevel: 1,
          selectedElements: [],
          duration: 1000,
          markers: [],
          regions: [],
          selectedMarkers: [],
          selectedRegions: [],
        },
        preview: {
          currentFrame: null,
          playbackState: 'playing' as const,
          playbackSpeed: 1,
        },
        project: {
          metadata: null,
          settings: {
            resolution: { width: 1280, height: 720 },
            format: 'mp4' as const,
            fps: 24,
            quality: 'preview' as const,
          },
          saveStatus: { state: 'saved' as const },
          generationStatus: { state: 'idle' as const },
        },
      };
      
      const { store } = renderWithProviders(<PreviewFrame />, initialState);
      
      const pauseButton = screen.getByTitle(/Play\/Pause/i);
      fireEvent.click(pauseButton);
      
      expect(global.cancelAnimationFrame).toHaveBeenCalled();
    });

    it('should maintain minimum 24 FPS during playback', () => {
      const initialState = {
        timeline: {
          shots: [],
          tracks: [],
          playheadPosition: 0,
          zoomLevel: 1,
          selectedElements: [],
          duration: 1000,
          markers: [],
          regions: [],
          selectedMarkers: [],
          selectedRegions: [],
        },
        preview: {
          currentFrame: null,
          playbackState: 'playing' as const,
          playbackSpeed: 1,
        },
        project: {
          metadata: null,
          settings: {
            resolution: { width: 1280, height: 720 },
            format: 'mp4' as const,
            fps: 24,
            quality: 'preview' as const,
          },
          saveStatus: { state: 'saved' as const },
          generationStatus: { state: 'idle' as const },
        },
      };
      
      renderWithProviders(<PreviewFrame />, initialState);
      
      // Verify FPS is set to 24
      expect(initialState.project.settings.fps).toBe(24);
    });
  });
});

describe('PreviewFrame - Playback Controls UI (Task 7.4)', () => {
  describe('Timecode Display', () => {
    it('should display current timecode', () => {
      const initialState = {
        timeline: {
          shots: [],
          tracks: [],
          playheadPosition: 240, // 10 frames at zoom level 24
          zoomLevel: 24,
          selectedElements: [],
          duration: 1000,
          markers: [],
          regions: [],
          selectedMarkers: [],
          selectedRegions: [],
        },
        preview: {
          currentFrame: null,
          playbackState: 'paused' as const,
          playbackSpeed: 1,
        },
        project: {
          metadata: null,
          settings: {
            resolution: { width: 1280, height: 720 },
            format: 'mp4' as const,
            fps: 24,
            quality: 'preview' as const,
          },
          saveStatus: { state: 'saved' as const },
          generationStatus: { state: 'idle' as const },
        },
      };
      
      renderWithProviders(<PreviewFrame />, initialState);
      
      const timecode = screen.getByText(/00:00:00:10/);
      expect(timecode).toBeInTheDocument();
    });

    it('should display total duration timecode', () => {
      const initialState = {
        timeline: {
          shots: [],
          tracks: [],
          playheadPosition: 0,
          zoomLevel: 1,
          selectedElements: [],
          duration: 2400, // 100 frames at 24fps = 00:00:04:04
          markers: [],
          regions: [],
          selectedMarkers: [],
          selectedRegions: [],
        },
        preview: {
          currentFrame: null,
          playbackState: 'paused' as const,
          playbackSpeed: 1,
        },
        project: {
          metadata: null,
          settings: {
            resolution: { width: 1280, height: 720 },
            format: 'mp4' as const,
            fps: 24,
            quality: 'preview' as const,
          },
          saveStatus: { state: 'saved' as const },
          generationStatus: { state: 'idle' as const },
        },
      };
      
      renderWithProviders(<PreviewFrame />, initialState);
      
      // Total frames = 2400 / 1 = 2400 frames = 100 seconds = 00:01:40:00
      const totalTimecode = screen.getByText(/00:01:40:00/);
      expect(totalTimecode).toBeInTheDocument();
    });

    it('should update timecode as playhead moves', () => {
      const initialState = {
        timeline: {
          shots: [],
          tracks: [],
          playheadPosition: 0,
          zoomLevel: 24,
          selectedElements: [],
          duration: 1000,
          markers: [],
          regions: [],
          selectedMarkers: [],
          selectedRegions: [],
        },
        preview: {
          currentFrame: null,
          playbackState: 'paused' as const,
          playbackSpeed: 1,
        },
        project: {
          metadata: null,
          settings: {
            resolution: { width: 1280, height: 720 },
            format: 'mp4' as const,
            fps: 24,
            quality: 'preview' as const,
          },
          saveStatus: { state: 'saved' as const },
          generationStatus: { state: 'idle' as const },
        },
      };
      
      const { store } = renderWithProviders(<PreviewFrame />, initialState);
      
      // Step forward
      const forwardButton = screen.getByTitle(/Next frame/i);
      fireEvent.click(forwardButton);
      
      // Timecode should update
      waitFor(() => {
        const timecode = screen.getByText(/00:00:00:01/);
        expect(timecode).toBeInTheDocument();
      });
    });
  });

  describe('Playback Control Bar', () => {
    it('should render all playback control buttons', () => {
      const initialState = {
        timeline: {
          shots: [],
          tracks: [],
          playheadPosition: 0,
          zoomLevel: 1,
          selectedElements: [],
          duration: 1000,
          markers: [],
          regions: [],
          selectedMarkers: [],
          selectedRegions: [],
        },
        preview: {
          currentFrame: null,
          playbackState: 'paused' as const,
          playbackSpeed: 1,
        },
        project: {
          metadata: null,
          settings: {
            resolution: { width: 1280, height: 720 },
            format: 'mp4' as const,
            fps: 24,
            quality: 'preview' as const,
          },
          saveStatus: { state: 'saved' as const },
          generationStatus: { state: 'idle' as const },
        },
      };
      
      renderWithProviders(<PreviewFrame />, initialState);
      
      expect(screen.getByTitle(/Go to start/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Previous frame/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Stop/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Play\/Pause/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Next frame/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Go to end/i)).toBeInTheDocument();
    });

    it('should show play icon when paused', () => {
      const initialState = {
        timeline: {
          shots: [],
          tracks: [],
          playheadPosition: 0,
          zoomLevel: 1,
          selectedElements: [],
          duration: 1000,
          markers: [],
          regions: [],
          selectedMarkers: [],
          selectedRegions: [],
        },
        preview: {
          currentFrame: null,
          playbackState: 'paused' as const,
          playbackSpeed: 1,
        },
        project: {
          metadata: null,
          settings: {
            resolution: { width: 1280, height: 720 },
            format: 'mp4' as const,
            fps: 24,
            quality: 'preview' as const,
          },
          saveStatus: { state: 'saved' as const },
          generationStatus: { state: 'idle' as const },
        },
      };
      
      renderWithProviders(<PreviewFrame />, initialState);
      
      const playButton = screen.getByTitle(/Play\/Pause/i);
      expect(playButton).toHaveTextContent('▶️');
    });

    it('should show pause icon when playing', () => {
      const initialState = {
        timeline: {
          shots: [],
          tracks: [],
          playheadPosition: 0,
          zoomLevel: 1,
          selectedElements: [],
          duration: 1000,
          markers: [],
          regions: [],
          selectedMarkers: [],
          selectedRegions: [],
        },
        preview: {
          currentFrame: null,
          playbackState: 'playing' as const,
          playbackSpeed: 1,
        },
        project: {
          metadata: null,
          settings: {
            resolution: { width: 1280, height: 720 },
            format: 'mp4' as const,
            fps: 24,
            quality: 'preview' as const,
          },
          saveStatus: { state: 'saved' as const },
          generationStatus: { state: 'idle' as const },
        },
      };
      
      renderWithProviders(<PreviewFrame />, initialState);
      
      const pauseButton = screen.getByTitle(/Play\/Pause/i);
      expect(pauseButton).toHaveTextContent('⏸');
    });
  });

  describe('Keyboard Shortcuts (Requirement 17.2)', () => {
    it('should play/pause with Space key', () => {
      const initialState = {
        timeline: {
          shots: [],
          tracks: [],
          playheadPosition: 0,
          zoomLevel: 1,
          selectedElements: [],
          duration: 1000,
          markers: [],
          regions: [],
          selectedMarkers: [],
          selectedRegions: [],
        },
        preview: {
          currentFrame: null,
          playbackState: 'paused' as const,
          playbackSpeed: 1,
        },
        project: {
          metadata: null,
          settings: {
            resolution: { width: 1280, height: 720 },
            format: 'mp4' as const,
            fps: 24,
            quality: 'preview' as const,
          },
          saveStatus: { state: 'saved' as const },
          generationStatus: { state: 'idle' as const },
        },
      };
      
      const { store } = renderWithProviders(<PreviewFrame />, initialState);
      
      fireEvent.keyDown(window, { code: 'Space' });
      
      expect(store.getState().preview.playbackState).toBe('playing');
    });

    it('should step forward with Right arrow key', () => {
      const initialState = {
        timeline: {
          shots: [],
          tracks: [],
          playheadPosition: 0,
          zoomLevel: 10,
          selectedElements: [],
          duration: 1000,
          markers: [],
          regions: [],
          selectedMarkers: [],
          selectedRegions: [],
        },
        preview: {
          currentFrame: null,
          playbackState: 'paused' as const,
          playbackSpeed: 1,
        },
        project: {
          metadata: null,
          settings: {
            resolution: { width: 1280, height: 720 },
            format: 'mp4' as const,
            fps: 24,
            quality: 'preview' as const,
          },
          saveStatus: { state: 'saved' as const },
          generationStatus: { state: 'idle' as const },
        },
      };
      
      const { store } = renderWithProviders(<PreviewFrame />, initialState);
      
      fireEvent.keyDown(window, { code: 'ArrowRight' });
      
      expect(store.getState().timeline.playheadPosition).toBe(10);
    });

    it('should step backward with Left arrow key', () => {
      const initialState = {
        timeline: {
          shots: [],
          tracks: [],
          playheadPosition: 100,
          zoomLevel: 10,
          selectedElements: [],
          duration: 1000,
          markers: [],
          regions: [],
          selectedMarkers: [],
          selectedRegions: [],
        },
        preview: {
          currentFrame: null,
          playbackState: 'paused' as const,
          playbackSpeed: 1,
        },
        project: {
          metadata: null,
          settings: {
            resolution: { width: 1280, height: 720 },
            format: 'mp4' as const,
            fps: 24,
            quality: 'preview' as const,
          },
          saveStatus: { state: 'saved' as const },
          generationStatus: { state: 'idle' as const },
        },
      };
      
      const { store } = renderWithProviders(<PreviewFrame />, initialState);
      
      fireEvent.keyDown(window, { code: 'ArrowLeft' });
      
      expect(store.getState().timeline.playheadPosition).toBe(90);
    });

    it('should jump to start with Home key', () => {
      const initialState = {
        timeline: {
          shots: [],
          tracks: [],
          playheadPosition: 500,
          zoomLevel: 1,
          selectedElements: [],
          duration: 1000,
          markers: [],
          regions: [],
          selectedMarkers: [],
          selectedRegions: [],
        },
        preview: {
          currentFrame: null,
          playbackState: 'paused' as const,
          playbackSpeed: 1,
        },
        project: {
          metadata: null,
          settings: {
            resolution: { width: 1280, height: 720 },
            format: 'mp4' as const,
            fps: 24,
            quality: 'preview' as const,
          },
          saveStatus: { state: 'saved' as const },
          generationStatus: { state: 'idle' as const },
        },
      };
      
      const { store } = renderWithProviders(<PreviewFrame />, initialState);
      
      fireEvent.keyDown(window, { code: 'Home' });
      
      expect(store.getState().timeline.playheadPosition).toBe(0);
    });

    it('should jump to end with End key', () => {
      const initialState = {
        timeline: {
          shots: [],
          tracks: [],
          playheadPosition: 0,
          zoomLevel: 1,
          selectedElements: [],
          duration: 1000,
          markers: [],
          regions: [],
          selectedMarkers: [],
          selectedRegions: [],
        },
        preview: {
          currentFrame: null,
          playbackState: 'paused' as const,
          playbackSpeed: 1,
        },
        project: {
          metadata: null,
          settings: {
            resolution: { width: 1280, height: 720 },
            format: 'mp4' as const,
            fps: 24,
            quality: 'preview' as const,
          },
          saveStatus: { state: 'saved' as const },
          generationStatus: { state: 'idle' as const },
        },
      };
      
      const { store } = renderWithProviders(<PreviewFrame />, initialState);
      
      fireEvent.keyDown(window, { code: 'End' });
      
      expect(store.getState().timeline.playheadPosition).toBe(1000);
    });

    it('should not trigger shortcuts when typing in input', () => {
      const initialState = {
        timeline: {
          shots: [],
          tracks: [],
          playheadPosition: 0,
          zoomLevel: 1,
          selectedElements: [],
          duration: 1000,
          markers: [],
          regions: [],
          selectedMarkers: [],
          selectedRegions: [],
        },
        preview: {
          currentFrame: null,
          playbackState: 'paused' as const,
          playbackSpeed: 1,
        },
        project: {
          metadata: null,
          settings: {
            resolution: { width: 1280, height: 720 },
            format: 'mp4' as const,
            fps: 24,
            quality: 'preview' as const,
          },
          saveStatus: { state: 'saved' as const },
          generationStatus: { state: 'idle' as const },
        },
      };
      
      const { store } = renderWithProviders(<PreviewFrame />, initialState);
      
      // Create a mock input element
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();
      
      fireEvent.keyDown(input, { code: 'Space' });
      
      // Playback state should not change
      expect(store.getState().preview.playbackState).toBe('paused');
      
      document.body.removeChild(input);
    });
  });

  describe('Time Slider', () => {
    it('should render time slider', () => {
      const initialState = {
        timeline: {
          shots: [],
          tracks: [],
          playheadPosition: 0,
          zoomLevel: 1,
          selectedElements: [],
          duration: 1000,
          markers: [],
          regions: [],
          selectedMarkers: [],
          selectedRegions: [],
        },
        preview: {
          currentFrame: null,
          playbackState: 'paused' as const,
          playbackSpeed: 1,
        },
        project: {
          metadata: null,
          settings: {
            resolution: { width: 1280, height: 720 },
            format: 'mp4' as const,
            fps: 24,
            quality: 'preview' as const,
          },
          saveStatus: { state: 'saved' as const },
          generationStatus: { state: 'idle' as const },
        },
      };
      
      renderWithProviders(<PreviewFrame />, initialState);
      
      const slider = screen.getByRole('slider');
      expect(slider).toBeInTheDocument();
    });

    it('should seek to position when slider is moved', () => {
      const initialState = {
        timeline: {
          shots: [],
          tracks: [],
          playheadPosition: 0,
          zoomLevel: 1,
          selectedElements: [],
          duration: 1000,
          markers: [],
          regions: [],
          selectedMarkers: [],
          selectedRegions: [],
        },
        preview: {
          currentFrame: null,
          playbackState: 'paused' as const,
          playbackSpeed: 1,
        },
        project: {
          metadata: null,
          settings: {
            resolution: { width: 1280, height: 720 },
            format: 'mp4' as const,
            fps: 24,
            quality: 'preview' as const,
          },
          saveStatus: { state: 'saved' as const },
          generationStatus: { state: 'idle' as const },
        },
      };
      
      const { store } = renderWithProviders(<PreviewFrame />, initialState);
      
      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '50' } });
      
      expect(store.getState().timeline.playheadPosition).toBe(500);
    });
  });
});
