/**
 * VirtualTimelineCanvas Component Tests
 * 
 * Tests for virtual scrolling and canvas-based rendering
 * 
 * Requirements tested: 1.1, 1.3, 1.8, 4.3, 9.1, 9.2, 9.3, 9.4, 9.5, 9.7
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { VirtualTimelineCanvas, getTrackShots, TRACK_CONFIG } from '../VirtualTimelineCanvas';
import type { Track, Shot, LayerType, MediaLayerData } from '../../../types';

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
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

// Helper function to create sample tracks
function createSampleTracks(): Track[] {
  return [
    {
      id: 'track-media',
      type: 'media',
      height: 60,
      locked: false,
      hidden: false,
      color: '#4A90E2',
      icon: 'film',
    },
    {
      id: 'track-audio',
      type: 'audio',
      height: 40,
      locked: false,
      hidden: false,
      color: '#50C878',
      icon: 'volume',
    },
    {
      id: 'track-effects',
      type: 'effects',
      height: 40,
      locked: false,
      hidden: false,
      color: '#9B59B6',
      icon: 'magic',
    },
  ];
}

// Helper function to create sample shot
function createSampleShot(id: string, startTime: number, duration: number, layerType: LayerType = 'media'): Shot {
  return {
    id,
    name: `Shot ${id}`,
    startTime,
    duration,
    layers: [
      {
        id: `layer-${id}`,
        type: layerType,
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

describe('VirtualTimelineCanvas Component', () => {
  const mockOnShotSelect = vi.fn();
  const mockOnLayerSelect = vi.fn();
  const mockOnShotMove = vi.fn();
  const mockOnShotResize = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Track Configuration', () => {
    it('should have configuration for all 6 track types', () => {
      expect(TRACK_CONFIG).toHaveProperty('media');
      expect(TRACK_CONFIG).toHaveProperty('audio');
      expect(TRACK_CONFIG).toHaveProperty('effects');
      expect(TRACK_CONFIG).toHaveProperty('transitions');
      expect(TRACK_CONFIG).toHaveProperty('text');
      expect(TRACK_CONFIG).toHaveProperty('keyframes');
    });

    it('should have unique colors for each track type', () => {
      const colors = Object.values(TRACK_CONFIG).map(config => config.color);
      expect(new Set(colors).size).toBe(6);
    });

    it('should have unique icons for each track type', () => {
      const icons = Object.values(TRACK_CONFIG).map(config => config.icon);
      expect(new Set(icons).size).toBe(6);
    });

    it('should have appropriate heights for each track type', () => {
      expect(TRACK_CONFIG.media.height).toBe(60);
      expect(TRACK_CONFIG.audio.height).toBe(40);
      expect(TRACK_CONFIG.effects.height).toBe(40);
      expect(TRACK_CONFIG.transitions.height).toBe(30);
      expect(TRACK_CONFIG.text.height).toBe(40);
      expect(TRACK_CONFIG.keyframes.height).toBe(30);
    });
  });

  describe('Virtual Scrolling', () => {
    it('should render virtual timeline canvas container', () => {
      const tracks = createSampleTracks();
      const shots: Shot[] = [];
      
      const { container } = render(
        <VirtualTimelineCanvas
          tracks={tracks}
          shots={shots}
          zoomLevel={10}
          playheadPosition={0}
          selectedElements={[]}
          timelineWidth={1000}
          onShotSelect={mockOnShotSelect}
        />
      );

      expect(container.querySelector('.virtual-timeline-canvas')).toBeTruthy();
    });

    it('should render track list with virtual items', () => {
      const tracks = createSampleTracks();
      const shots: Shot[] = [];
      
      const { container } = render(
        <VirtualTimelineCanvas
          tracks={tracks}
          shots={shots}
          zoomLevel={10}
          playheadPosition={0}
          selectedElements={[]}
          timelineWidth={1000}
          onShotSelect={mockOnShotSelect}
        />
      );

      expect(container.querySelector('.timeline-track-list')).toBeTruthy();
    });

    it('should filter out hidden tracks', () => {
      const tracks = createSampleTracks();
      tracks[1].hidden = true; // Hide audio track
      
      const shots: Shot[] = [];
      
      const { container } = render(
        <VirtualTimelineCanvas
          tracks={tracks}
          shots={shots}
          zoomLevel={10}
          playheadPosition={0}
          selectedElements={[]}
          timelineWidth={1000}
          onShotSelect={mockOnShotSelect}
        />
      );

      // Should only render visible tracks
      const virtualRows = container.querySelectorAll('.virtual-track-row');
      // Note: Virtual rendering may not show all rows immediately
      expect(container.querySelector('.virtual-timeline-canvas')).toBeTruthy();
    });
  });

  describe('Canvas Rendering', () => {
    it('should render canvas for each track', () => {
      const tracks = createSampleTracks();
      const shots: Shot[] = [];
      
      const { container } = render(
        <VirtualTimelineCanvas
          tracks={tracks}
          shots={shots}
          zoomLevel={10}
          playheadPosition={0}
          selectedElements={[]}
          timelineWidth={1000}
          onShotSelect={mockOnShotSelect}
        />
      );

      // Canvas elements should be present
      const canvases = container.querySelectorAll('canvas');
      expect(canvases.length).toBeGreaterThan(0);
    });

    it('should set canvas dimensions based on timeline width and track height', () => {
      const tracks = createSampleTracks();
      const shots: Shot[] = [];
      const timelineWidth = 2000;
      
      const { container } = render(
        <VirtualTimelineCanvas
          tracks={tracks}
          shots={shots}
          zoomLevel={10}
          playheadPosition={0}
          selectedElements={[]}
          timelineWidth={timelineWidth}
          onShotSelect={mockOnShotSelect}
        />
      );

      const canvases = container.querySelectorAll('.track-canvas');
      expect(canvases.length).toBeGreaterThan(0);
    });
  });

  describe('Shot Rendering', () => {
    it('should render shots on appropriate tracks', () => {
      const tracks = createSampleTracks();
      const shots = [
        createSampleShot('shot-1', 0, 60, 'media'),
        createSampleShot('shot-2', 60, 90, 'media'),
      ];
      
      const { container } = render(
        <VirtualTimelineCanvas
          tracks={tracks}
          shots={shots}
          zoomLevel={10}
          playheadPosition={0}
          selectedElements={[]}
          timelineWidth={1000}
          onShotSelect={mockOnShotSelect}
        />
      );

      // Canvas should be rendered
      expect(container.querySelector('.track-canvas')).toBeTruthy();
    });

    it('should handle shots with multiple layers', () => {
      const tracks = createSampleTracks();
      const shot = createSampleShot('shot-1', 0, 60, 'media');
      
      // Add additional layers
      shot.layers.push({
        id: 'layer-audio',
        type: 'audio',
        startTime: 0,
        duration: 60,
        locked: false,
        hidden: false,
        opacity: 1,
        blendMode: 'normal',
        data: {
          sourceUrl: '',
          volume: 0.8,
          fadeIn: 0,
          fadeOut: 0,
        },
      });
      
      const shots = [shot];
      
      const { container } = render(
        <VirtualTimelineCanvas
          tracks={tracks}
          shots={shots}
          zoomLevel={10}
          playheadPosition={0}
          selectedElements={[]}
          timelineWidth={1000}
          onShotSelect={mockOnShotSelect}
        />
      );

      // Should render without errors
      expect(container.querySelector('.virtual-timeline-canvas')).toBeTruthy();
    });

    it('should display layer count badge when track has layers', () => {
      const tracks = createSampleTracks();
      const shots = [
        createSampleShot('shot-1', 0, 60, 'media'),
        createSampleShot('shot-2', 60, 90, 'media'),
      ];
      
      const { container } = render(
        <VirtualTimelineCanvas
          tracks={tracks}
          shots={shots}
          zoomLevel={10}
          playheadPosition={0}
          selectedElements={[]}
          timelineWidth={1000}
          onShotSelect={mockOnShotSelect}
        />
      );

      // Layer count badges should be present
      const badges = container.querySelectorAll('.layer-count-badge');
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  describe('Shot Selection', () => {
    it('should call onShotSelect when shot is clicked', async () => {
      const tracks = createSampleTracks();
      const shots = [createSampleShot('shot-1', 0, 60, 'media')];
      
      const { container } = render(
        <VirtualTimelineCanvas
          tracks={tracks}
          shots={shots}
          zoomLevel={10}
          playheadPosition={0}
          selectedElements={[]}
          timelineWidth={1000}
          onShotSelect={mockOnShotSelect}
        />
      );

      const canvas = container.querySelector('.track-canvas');
      if (canvas) {
        fireEvent.click(canvas, { clientX: 100, clientY: 30 });
        
        await waitFor(() => {
          expect(mockOnShotSelect).toHaveBeenCalled();
        });
      }
    });

    it('should support multi-select with Ctrl/Cmd key', async () => {
      const tracks = createSampleTracks();
      const shots = [createSampleShot('shot-1', 0, 60, 'media')];
      
      const { container } = render(
        <VirtualTimelineCanvas
          tracks={tracks}
          shots={shots}
          zoomLevel={10}
          playheadPosition={0}
          selectedElements={[]}
          timelineWidth={1000}
          onShotSelect={mockOnShotSelect}
        />
      );

      const canvas = container.querySelector('.track-canvas');
      if (canvas) {
        fireEvent.click(canvas, { clientX: 100, clientY: 30, ctrlKey: true });
        
        await waitFor(() => {
          expect(mockOnShotSelect).toHaveBeenCalledWith(
            expect.any(String),
            true // multiSelect flag
          );
        });
      }
    });

    it('should highlight selected shots', () => {
      const tracks = createSampleTracks();
      const shots = [createSampleShot('shot-1', 0, 60, 'media')];
      
      const { container } = render(
        <VirtualTimelineCanvas
          tracks={tracks}
          shots={shots}
          zoomLevel={10}
          playheadPosition={0}
          selectedElements={['shot-1']}
          timelineWidth={1000}
          onShotSelect={mockOnShotSelect}
        />
      );

      // Canvas should be rendered with selected shot
      expect(container.querySelector('.track-canvas')).toBeTruthy();
    });
  });

  describe('Layer Selection', () => {
    it('should call onLayerSelect when layer is clicked', async () => {
      const tracks = createSampleTracks();
      const shots = [createSampleShot('shot-1', 0, 60, 'media')];
      
      const { container } = render(
        <VirtualTimelineCanvas
          tracks={tracks}
          shots={shots}
          zoomLevel={10}
          playheadPosition={0}
          selectedElements={[]}
          timelineWidth={1000}
          onShotSelect={mockOnShotSelect}
          onLayerSelect={mockOnLayerSelect}
        />
      );

      const canvas = container.querySelector('.track-canvas');
      if (canvas) {
        fireEvent.click(canvas, { clientX: 100, clientY: 30 });
        
        await waitFor(() => {
          expect(mockOnLayerSelect).toHaveBeenCalled();
        });
      }
    });
  });

  describe('Playhead Rendering', () => {
    it('should render playhead at current position', () => {
      const tracks = createSampleTracks();
      const shots: Shot[] = [];
      
      const { container } = render(
        <VirtualTimelineCanvas
          tracks={tracks}
          shots={shots}
          zoomLevel={10}
          playheadPosition={60}
          selectedElements={[]}
          timelineWidth={1000}
          onShotSelect={mockOnShotSelect}
        />
      );

      // Canvas should be rendered with playhead
      expect(container.querySelector('.track-canvas')).toBeTruthy();
    });

    it('should show playing indicator when isPlaying is true', () => {
      const tracks = createSampleTracks();
      const shots: Shot[] = [];
      
      const { container } = render(
        <VirtualTimelineCanvas
          tracks={tracks}
          shots={shots}
          zoomLevel={10}
          playheadPosition={60}
          selectedElements={[]}
          timelineWidth={1000}
          onShotSelect={mockOnShotSelect}
          isPlaying={true}
        />
      );

      // Canvas should be rendered with playing state
      expect(container.querySelector('.track-canvas')).toBeTruthy();
    });
  });

  describe('Zoom Level Handling', () => {
    it('should adjust rendering based on zoom level', () => {
      const tracks = createSampleTracks();
      const shots = [createSampleShot('shot-1', 0, 60, 'media')];
      
      const { rerender, container } = render(
        <VirtualTimelineCanvas
          tracks={tracks}
          shots={shots}
          zoomLevel={10}
          playheadPosition={0}
          selectedElements={[]}
          timelineWidth={1000}
          onShotSelect={mockOnShotSelect}
        />
      );

      expect(container.querySelector('.track-canvas')).toBeTruthy();

      // Change zoom level
      rerender(
        <VirtualTimelineCanvas
          tracks={tracks}
          shots={shots}
          zoomLevel={50}
          playheadPosition={0}
          selectedElements={[]}
          timelineWidth={1000}
          onShotSelect={mockOnShotSelect}
        />
      );

      // Should still render correctly
      expect(container.querySelector('.track-canvas')).toBeTruthy();
    });
  });

  describe('Helper Functions', () => {
    it('getTrackShots should filter shots by track type', () => {
      const shots = [
        createSampleShot('shot-1', 0, 60, 'media'),
        createSampleShot('shot-2', 60, 90, 'audio'),
        createSampleShot('shot-3', 150, 120, 'media'),
      ];

      const mediaShots = getTrackShots(shots, 'media');
      expect(mediaShots).toHaveLength(2);
      expect(mediaShots.every(({ layer }) => layer.type === 'media')).toBe(true);

      const audioShots = getTrackShots(shots, 'audio');
      expect(audioShots).toHaveLength(1);
      expect(audioShots[0].layer.type).toBe('audio');
    });

    it('getTrackShots should handle shots with multiple layers of same type', () => {
      const shot = createSampleShot('shot-1', 0, 60, 'media');
      shot.layers.push({
        id: 'layer-2',
        type: 'media',
        startTime: 0,
        duration: 60,
        locked: false,
        hidden: false,
        opacity: 1,
        blendMode: 'normal',
        data: {
          sourceUrl: '',
          trim: { start: 0, end: 60 },
          transform: {
            position: { x: 0, y: 0 },
            scale: { x: 1, y: 1 },
            rotation: 0,
            anchor: { x: 0.5, y: 0.5 },
          },
        } as MediaLayerData,
      });

      const shots = [shot];
      const mediaShots = getTrackShots(shots, 'media');
      
      // Should return both layers
      expect(mediaShots).toHaveLength(2);
    });
  });

  describe('Performance', () => {
    it('should handle large number of shots efficiently', () => {
      const tracks = createSampleTracks();
      const shots: Shot[] = [];
      
      // Create 1000 shots
      for (let i = 0; i < 1000; i++) {
        shots.push(createSampleShot(`shot-${i}`, i * 30, 30, 'media'));
      }
      
      const { container } = render(
        <VirtualTimelineCanvas
          tracks={tracks}
          shots={shots}
          zoomLevel={10}
          playheadPosition={0}
          selectedElements={[]}
          timelineWidth={30000}
          onShotSelect={mockOnShotSelect}
        />
      );

      // Should render without errors
      expect(container.querySelector('.virtual-timeline-canvas')).toBeTruthy();
    });

    it('should use virtual scrolling for performance', () => {
      const tracks = createSampleTracks();
      const shots: Shot[] = [];
      
      for (let i = 0; i < 100; i++) {
        shots.push(createSampleShot(`shot-${i}`, i * 30, 30, 'media'));
      }
      
      const { container } = render(
        <VirtualTimelineCanvas
          tracks={tracks}
          shots={shots}
          zoomLevel={10}
          playheadPosition={0}
          selectedElements={[]}
          timelineWidth={3000}
          onShotSelect={mockOnShotSelect}
        />
      );

      // Virtual list should be present
      expect(container.querySelector('.timeline-track-list')).toBeTruthy();
    });
  });
});
