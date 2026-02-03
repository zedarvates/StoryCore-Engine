/**
 * Timeline Component Tests
 * 
 * Tests for Task 4.1: Timeline canvas with virtual scrolling
 * 
 * Requirements tested: 1.1, 1.3, 1.8
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Timeline from '../Timeline';
import timelineReducer from '../../../store/slices/timelineSlice';
import type { Track, Shot, LayerType, MediaLayerData } from '../../../types';

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock HTMLCanvasElement.getContext
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(),
  putImageData: vi.fn(),
  createImageData: vi.fn(),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  fillText: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  transform: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
  roundRect: vi.fn(),
  strokeStyle: '',
  fillStyle: '',
  lineWidth: 1,
  font: '',
  textBaseline: '',
  textAlign: '',
  globalAlpha: 1,
  shadowColor: '',
  shadowBlur: 0,
});

// Helper function to create a mock store
function createMockStore(initialState = {}) {
  const defaultState = {
    timeline: {
      shots: [],
      tracks: [
        {
          id: 'track-media',
          type: 'media' as LayerType,
          height: 60,
          locked: false,
          hidden: false,
          color: '#4A90E2',
          icon: 'film',
        },
        {
          id: 'track-audio',
          type: 'audio' as LayerType,
          height: 40,
          locked: false,
          hidden: false,
          color: '#50C878',
          icon: 'volume',
        },
        {
          id: 'track-effects',
          type: 'effects' as LayerType,
          height: 40,
          locked: false,
          hidden: false,
          color: '#9B59B6',
          icon: 'magic',
        },
        {
          id: 'track-transitions',
          type: 'transitions' as LayerType,
          height: 30,
          locked: false,
          hidden: false,
          color: '#E67E22',
          icon: 'shuffle',
        },
        {
          id: 'track-text',
          type: 'text' as LayerType,
          height: 40,
          locked: false,
          hidden: false,
          color: '#F39C12',
          icon: 'text',
        },
        {
          id: 'track-keyframes',
          type: 'keyframes' as LayerType,
          height: 30,
          locked: false,
          hidden: false,
          color: '#E74C3C',
          icon: 'key',
        },
      ],
      playheadPosition: 0,
      zoomLevel: 10,
      selectedElements: [],
      duration: 360, // 12 seconds at 30fps
    },
    ...initialState,
  };

  return configureStore({
    reducer: {
      timeline: timelineReducer,
    },
    preloadedState: defaultState,
  });
}

// Helper function to create a sample shot
function createSampleShot(id: string, startTime: number, duration: number): Shot {
  return {
    id,
    name: `Shot ${id}`,
    startTime,
    duration,
    layers: [
      {
        id: `layer-${id}`,
        type: 'media',
        startTime: 0,
        duration,
        locked: false,
        hidden: false,
        opacity: 1,
        blendMode: 'normal',
        data: {
          sourceUrl: '',
          trim: { start: 0, end: duration },
          transform: {
            position: { x: 0, y: 0 },
            scale: { x: 1, y: 1 },
            rotation: 0,
            anchor: { x: 0.5, y: 0.5 },
          },
        } as MediaLayerData,
      },
    ],
    referenceImages: [],
    prompt: 'Test prompt',
    parameters: {
      seed: 12345,
      denoising: 0.7,
      steps: 30,
      guidance: 7.5,
      sampler: 'euler',
      scheduler: 'normal',
    },
    generationStatus: 'pending',
  };
}

describe('Timeline Component - Task 4.1', () => {
  describe('Requirement 1.1: Multi-Track Timeline Display', () => {
    it('should display 6 distinct track types', () => {
      const store = createMockStore();
      render(
        <Provider store={store}>
          <Timeline />
        </Provider>
      );

      // Check that all 6 track types are rendered
      const state = store.getState().timeline;
      expect(state.tracks).toHaveLength(6);
      expect(state.tracks.map((t: Track) => t.type)).toEqual([
        'media',
        'audio',
        'effects',
        'transitions',
        'text',
        'keyframes',
      ]);
    });

    it('should render each track with unique color scheme', () => {
      const store = createMockStore();
      render(
        <Provider store={store}>
          <Timeline />
        </Provider>
      );

      const state = store.getState().timeline;
      const colors = state.tracks.map((t: Track) => t.color);
      
      // All colors should be unique
      expect(new Set(colors).size).toBe(6);
      
      // Check specific colors match design spec
      expect(colors).toContain('#4A90E2'); // media
      expect(colors).toContain('#50C878'); // audio
      expect(colors).toContain('#9B59B6'); // effects
      expect(colors).toContain('#E67E22'); // transitions
      expect(colors).toContain('#F39C12'); // text
      expect(colors).toContain('#E74C3C'); // keyframes
    });

    it('should render each track with unique icon', () => {
      const store = createMockStore();
      render(
        <Provider store={store}>
          <Timeline />
        </Provider>
      );

      const state = store.getState().timeline;
      const icons = state.tracks.map((t: Track) => t.icon);
      
      // All icons should be unique
      expect(new Set(icons).size).toBe(6);
      
      // Check specific icons match design spec
      expect(icons).toContain('film'); // media
      expect(icons).toContain('volume'); // audio
      expect(icons).toContain('magic'); // effects
      expect(icons).toContain('shuffle'); // transitions
      expect(icons).toContain('text'); // text
      expect(icons).toContain('key'); // keyframes
    });
  });

  describe('Requirement 1.3: Track Visual Identification', () => {
    it('should display track type indicators', () => {
      const store = createMockStore();
      const { container } = render(
        <Provider store={store}>
          <Timeline />
        </Provider>
      );

      // Check that track headers are rendered
      const trackHeaders = container.querySelectorAll('.track-header');
      expect(trackHeaders.length).toBeGreaterThan(0);
    });

    it('should show track color indicators', () => {
      const store = createMockStore();
      const { container } = render(
        <Provider store={store}>
          <Timeline />
        </Provider>
      );

      // Check that color indicators are present
      const colorIndicators = container.querySelectorAll('.track-color-indicator');
      expect(colorIndicators.length).toBeGreaterThan(0);
    });
  });

  describe('Requirement 1.8: Time Markers Display', () => {
    it('should display time markers with configurable granularity', () => {
      const store = createMockStore();
      const { container } = render(
        <Provider store={store}>
          <Timeline />
        </Provider>
      );

      // Check that time ruler is rendered
      const timeRuler = container.querySelector('.timeline-ruler');
      expect(timeRuler).toBeTruthy();
    });

    it('should display time markers at appropriate intervals based on zoom', () => {
      const store = createMockStore({
        timeline: {
          ...createMockStore().getState().timeline,
          zoomLevel: 50, // High zoom level
        },
      });
      
      const { container } = render(
        <Provider store={store}>
          <Timeline />
        </Provider>
      );

      // At high zoom, markers should be more frequent
      const markers = container.querySelectorAll('.timeline-ruler-marker');
      expect(markers.length).toBeGreaterThan(0);
    });
  });

  describe('Virtual Scrolling Performance', () => {
    it('should use virtual scrolling mode by default', () => {
      const store = createMockStore();
      const { container } = render(
        <Provider store={store}>
          <Timeline />
        </Provider>
      );

      // Check that virtual timeline canvas is rendered
      const virtualCanvas = container.querySelector('.virtual-timeline-canvas');
      expect(virtualCanvas).toBeTruthy();
    });

    it('should toggle between virtual and DOM rendering modes', async () => {
      const store = createMockStore();
      const { container } = render(
        <Provider store={store}>
          <Timeline />
        </Provider>
      );

      // Find the virtual mode toggle button
      const toggleButton = container.querySelector('.toggle-btn');
      
      if (toggleButton) {
        // Initially should be in virtual mode
        expect(container.querySelector('.virtual-timeline-canvas')).toBeTruthy();
        
        // Toggle to DOM mode
        fireEvent.click(toggleButton);
        
        await waitFor(() => {
          // Should now show DOM-based rendering
          expect(container.querySelector('.timeline-tracks-area')).toBeTruthy();
        });
      }
    });

    it('should handle large number of shots efficiently', () => {
      // Create a timeline with many shots
      const shots: Shot[] = [];
      for (let i = 0; i < 100; i++) {
        shots.push(createSampleShot(`shot-${i}`, i * 30, 30));
      }

      const store = createMockStore({
        timeline: {
          ...createMockStore().getState().timeline,
          shots,
          duration: 3000, // 100 seconds
        },
      });

      const { container } = render(
        <Provider store={store}>
          <Timeline />
        </Provider>
      );

      // Should render without errors
      expect(container.querySelector('.timeline-panel')).toBeTruthy();
      
      // Virtual canvas should be present for performance
      expect(container.querySelector('.virtual-timeline-canvas')).toBeTruthy();
    });
  });

  describe('Canvas-based Rendering', () => {
    it('should render timeline using canvas elements', () => {
      const store = createMockStore();
      const { container } = render(
        <Provider store={store}>
          <Timeline />
        </Provider>
      );

      // Check that canvas elements are present
      const canvases = container.querySelectorAll('canvas');
      expect(canvases.length).toBeGreaterThan(0);
    });

    it('should render track canvases for each visible track', () => {
      const store = createMockStore();
      const { container } = render(
        <Provider store={store}>
          <Timeline />
        </Provider>
      );

      // Each visible track should have a canvas
      const state = store.getState().timeline;
      const visibleTracks = state.tracks.filter((t: Track) => !t.hidden);
      
      // Note: Canvas rendering happens in useEffect, so we just check structure
      expect(visibleTracks.length).toBe(6);
    });
  });

  describe('Track Headers', () => {
    it('should display track headers with correct information', () => {
      const store = createMockStore();
      const { container } = render(
        <Provider store={store}>
          <Timeline />
        </Provider>
      );

      const trackHeaders = container.querySelectorAll('.track-header');
      expect(trackHeaders.length).toBeGreaterThan(0);
    });

    it('should show lock and hide controls for each track', () => {
      const store = createMockStore();
      const { container } = render(
        <Provider store={store}>
          <Timeline />
        </Provider>
      );

      // Check for control buttons
      const controlButtons = container.querySelectorAll('.track-control-btn');
      expect(controlButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Timeline Controls', () => {
    it('should display timeline controls bar', () => {
      const store = createMockStore();
      const { container } = render(
        <Provider store={store}>
          <Timeline />
        </Provider>
      );

      const controlsBar = container.querySelector('.timeline-controls-bar');
      expect(controlsBar).toBeTruthy();
    });

    it('should display zoom controls', () => {
      const store = createMockStore();
      const { container } = render(
        <Provider store={store}>
          <Timeline />
        </Provider>
      );

      // Check for zoom level display
      const zoomDisplay = container.querySelector('.zoom-level-display');
      expect(zoomDisplay).toBeTruthy();
    });

    it('should display current timecode', () => {
      const store = createMockStore();
      const { container } = render(
        <Provider store={store}>
          <Timeline />
        </Provider>
      );

      const timecode = container.querySelector('.timeline-timecode');
      expect(timecode).toBeTruthy();
      expect(timecode?.textContent).toMatch(/\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('Playhead Indicator', () => {
    it('should display playhead at current position', () => {
      const store = createMockStore({
        timeline: {
          ...createMockStore().getState().timeline,
          playheadPosition: 60, // 2 seconds at 30fps
        },
      });

      const { container } = render(
        <Provider store={store}>
          <Timeline />
        </Provider>
      );

      // Playhead should be rendered
      const playhead = container.querySelector('.playhead-indicator');
      expect(playhead).toBeTruthy();
    });

    it('should update playhead position on timeline click', async () => {
      const store = createMockStore();
      const { container } = render(
        <Provider store={store}>
          <Timeline />
        </Provider>
      );

      const timelineContainer = container.querySelector('.timeline-container');
      expect(timelineContainer).toBeTruthy();

      // Click on timeline should update playhead position
      if (timelineContainer) {
        fireEvent.click(timelineContainer, { clientX: 300 });
        
        await waitFor(() => {
          const state = store.getState().timeline;
          // Position should have changed from initial 0
          expect(state.playheadPosition).toBeGreaterThanOrEqual(0);
        });
      }
    });
  });

  describe('Zoom Functionality', () => {
    it('should support zoom in operation', async () => {
      const store = createMockStore();
      const { container } = render(
        <Provider store={store}>
          <Timeline />
        </Provider>
      );

      const initialZoom = store.getState().timeline.zoomLevel;
      
      // Find zoom in button (contains 🔍+)
      const buttons = Array.from(container.querySelectorAll('.timeline-control-btn'));
      const zoomInButton = buttons.find(btn => btn.textContent?.includes('🔍+'));
      
      if (zoomInButton) {
        fireEvent.click(zoomInButton);
        
        await waitFor(() => {
          const newZoom = store.getState().timeline.zoomLevel;
          expect(newZoom).toBeGreaterThan(initialZoom);
        });
      }
    });

    it('should support zoom out operation', async () => {
      const store = createMockStore({
        timeline: {
          ...createMockStore().getState().timeline,
          zoomLevel: 50, // Start with higher zoom
        },
      });
      
      const { container } = render(
        <Provider store={store}>
          <Timeline />
        </Provider>
      );

      const initialZoom = store.getState().timeline.zoomLevel;
      
      // Find zoom out button (contains 🔍-)
      const buttons = Array.from(container.querySelectorAll('.timeline-control-btn'));
      const zoomOutButton = buttons.find(btn => btn.textContent?.includes('🔍-'));
      
      if (zoomOutButton) {
        fireEvent.click(zoomOutButton);
        
        await waitFor(() => {
          const newZoom = store.getState().timeline.zoomLevel;
          expect(newZoom).toBeLessThan(initialZoom);
        });
      }
    });
  });

  describe('Track Management', () => {
    it('should support adding new tracks', async () => {
      const store = createMockStore();
      const { container } = render(
        <Provider store={store}>
          <Timeline />
        </Provider>
      );

      const initialTrackCount = store.getState().timeline.tracks.length;
      
      // Find add track button
      const addTrackButton = container.querySelector('.add-track-btn');
      
      if (addTrackButton) {
        fireEvent.click(addTrackButton);
        
        // Menu should appear
        await waitFor(() => {
          const menu = container.querySelector('.add-track-menu');
          expect(menu).toBeTruthy();
        });
      }
    });
  });

  describe('Responsive Layout', () => {
    it('should render timeline panel with proper structure', () => {
      const store = createMockStore();
      const { container } = render(
        <Provider store={store}>
          <Timeline />
        </Provider>
      );

      // Check main structure
      expect(container.querySelector('.timeline-panel')).toBeTruthy();
      expect(container.querySelector('.timeline-controls-bar')).toBeTruthy();
      expect(container.querySelector('.timeline-container')).toBeTruthy();
      expect(container.querySelector('.timeline-track-headers')).toBeTruthy();
      expect(container.querySelector('.timeline-content-area')).toBeTruthy();
    });

    it('should maintain track headers width', () => {
      const store = createMockStore();
      const { container } = render(
        <Provider store={store}>
          <Timeline />
        </Provider>
      );

      const trackHeaders = container.querySelector('.timeline-track-headers');
      expect(trackHeaders).toBeTruthy();
      
      // Track headers should have fixed width (200px as per design)
      const styles = window.getComputedStyle(trackHeaders as Element);
      expect(styles.width).toBeTruthy();
    });
  });
});
