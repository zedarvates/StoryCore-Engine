/**
 * PreviewFrame View Mode Integration Tests
 * 
 * Integration tests for view mode toggle functionality in PreviewFrame.
 * Requirements: 3.1, 3.7
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { PreviewFrame } from '../PreviewFrame';
import timelineReducer from '../../../store/slices/timelineSlice';
import previewReducer from '../../../store/slices/previewSlice';
import projectReducer from '../../../store/slices/projectSlice';
import type { TimelineState, PreviewState, ProjectState } from '../../../types';

// Mock canvas context
const mockGetContext = vi.fn();
const mockContext = {
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
  font: '',
  textAlign: '',
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  fillText: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  setLineDash: vi.fn(),
  createLinearGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
};

beforeEach(() => {
  mockGetContext.mockReturnValue(mockContext);
  HTMLCanvasElement.prototype.getContext = mockGetContext;
  
  global.requestAnimationFrame = vi.fn((cb) => {
    cb(0);
    return 0;
  });
  
  global.cancelAnimationFrame = vi.fn();
});

afterEach(() => {
  vi.clearAllMocks();
});

function createTestStore(initialState: Partial<{
  timeline: Partial<TimelineState>;
  preview: Partial<PreviewState>;
  project: Partial<ProjectState>;
}> = {}) {
  return configureStore({
    reducer: {
      timeline: timelineReducer,
      preview: previewReducer,
      project: projectReducer,
    },
    preloadedState: {
      timeline: {
        shots: [],
        tracks: [],
        playheadPosition: 0,
        zoomLevel: 10,
        duration: 1000,
        selectedElements: [],
        markers: [],
        regions: [],
        selectedMarkers: [],
        selectedRegions: [],
        ...initialState.timeline,
      },
      preview: {
        currentFrame: null,
        playbackState: 'stopped' as const,
        playbackSpeed: 1,
        ...initialState.preview,
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
          resolution: { width: 1280, height: 720 },
          format: 'mp4' as const,
          quality: 'preview' as const,
          fps: 24,
        },
        saveStatus: {
          state: 'saved' as const,
        },
        generationStatus: {
          state: 'idle' as const,
        },
        ...initialState.project,
      },
    },
  });
}

function renderWithProviders(component: React.ReactElement, store = createTestStore()) {
  return render(
    <Provider store={store}>
      <DndProvider backend={HTML5Backend}>
        {component}
      </DndProvider>
    </Provider>
  );
}

describe('PreviewFrame View Mode Integration', () => {
  describe('View Mode Toggle Rendering', () => {
    it('should render view mode toggle buttons', () => {
      renderWithProviders(<PreviewFrame />);
      
      expect(screen.getByTitle('Video Preview Mode')).toBeInTheDocument();
      expect(screen.getByTitle('3D Scene View Mode')).toBeInTheDocument();
    });
    
    it('should start in video preview mode by default', () => {
      renderWithProviders(<PreviewFrame />);
      
      const videoBtn = screen.getByTitle('Video Preview Mode');
      expect(videoBtn).toHaveClass('active');
    });
  });
  
  describe('View Mode Switching', () => {
    it('should switch from video to 3D scene view', async () => {
      renderWithProviders(<PreviewFrame />);
      
      const sceneBtn = screen.getByTitle('3D Scene View Mode');
      fireEvent.click(sceneBtn);
      
      await waitFor(() => {
        expect(sceneBtn).toHaveClass('active');
      });
      
      // Should render 3D scene controls
      expect(screen.getByText('Camera')).toBeInTheDocument();
      expect(screen.getByText('Puppet')).toBeInTheDocument();
    });
    
    it('should switch from 3D scene to video preview', async () => {
      renderWithProviders(<PreviewFrame />);
      
      // Switch to 3D scene first
      const sceneBtn = screen.getByTitle('3D Scene View Mode');
      fireEvent.click(sceneBtn);
      
      await waitFor(() => {
        expect(screen.getByText('Camera')).toBeInTheDocument();
      });
      
      // Switch back to video
      const videoBtn = screen.getByTitle('Video Preview Mode');
      fireEvent.click(videoBtn);
      
      await waitFor(() => {
        expect(videoBtn).toHaveClass('active');
      });
      
      // Should not render 3D scene controls
      expect(screen.queryByText('Camera')).not.toBeInTheDocument();
    });
    
    it('should maintain playback controls in both modes', () => {
      renderWithProviders(<PreviewFrame />);
      
      // Check controls in video mode
      expect(screen.getByTitle('Play/Pause (Space)')).toBeInTheDocument();
      expect(screen.getByTitle('Stop (K)')).toBeInTheDocument();
      
      // Switch to 3D scene
      const sceneBtn = screen.getByTitle('3D Scene View Mode');
      fireEvent.click(sceneBtn);
      
      // Controls should still be present
      expect(screen.getByTitle('Play/Pause (Space)')).toBeInTheDocument();
      expect(screen.getByTitle('Stop (K)')).toBeInTheDocument();
    });
  });
  
  describe('Video Preview Mode', () => {
    it('should render video canvas in video mode', () => {
      const { container } = renderWithProviders(<PreviewFrame />);
      
      const canvas = container.querySelector('.preview-canvas');
      expect(canvas).toBeInTheDocument();
    });
    
    it('should show timecode overlay in video mode', () => {
      renderWithProviders(<PreviewFrame />);
      
      expect(screen.getByText(/00:00:00:00/)).toBeInTheDocument();
    });
    
    it('should show safe zones toggle in video mode', () => {
      renderWithProviders(<PreviewFrame />);
      
      expect(screen.getByTitle('Toggle safe zones')).toBeInTheDocument();
    });
    
    it('should not show 3D scene controls in video mode', () => {
      renderWithProviders(<PreviewFrame />);
      
      expect(screen.queryByText('Camera')).not.toBeInTheDocument();
      expect(screen.queryByText('Puppet')).not.toBeInTheDocument();
    });
  });
  
  describe('3D Scene View Mode', () => {
    it('should render 3D scene canvas in 3D mode', () => {
      const { container } = renderWithProviders(<PreviewFrame />);
      
      const sceneBtn = screen.getByTitle('3D Scene View Mode');
      fireEvent.click(sceneBtn);
      
      const canvas = container.querySelector('.scene-canvas');
      expect(canvas).toBeInTheDocument();
    });
    
    it('should show camera controls in 3D mode', () => {
      renderWithProviders(<PreviewFrame />);
      
      const sceneBtn = screen.getByTitle('3D Scene View Mode');
      fireEvent.click(sceneBtn);
      
      expect(screen.getByTitle('Move camera forward')).toBeInTheDocument();
      expect(screen.getByTitle('Move camera backward')).toBeInTheDocument();
      expect(screen.getByTitle('Reset camera')).toBeInTheDocument();
    });
    
    it('should show puppet controls in 3D mode', () => {
      renderWithProviders(<PreviewFrame />);
      
      const sceneBtn = screen.getByTitle('3D Scene View Mode');
      fireEvent.click(sceneBtn);
      
      expect(screen.getByText('Transform')).toBeInTheDocument();
      expect(screen.getByText('Position X:')).toBeInTheDocument();
    });
    
    it('should not show video-specific controls in 3D mode', () => {
      renderWithProviders(<PreviewFrame />);
      
      const sceneBtn = screen.getByTitle('3D Scene View Mode');
      fireEvent.click(sceneBtn);
      
      expect(screen.queryByTitle('Toggle safe zones')).not.toBeInTheDocument();
    });
  });
  
  describe('Canvas Resolution', () => {
    it('should use minimum 1280x720 resolution for video canvas', () => {
      const { container } = renderWithProviders(<PreviewFrame />);
      
      const canvas = container.querySelector('.preview-canvas');
      expect(canvas).toHaveAttribute('width', '1280');
      expect(canvas).toHaveAttribute('height', '720');
    });
    
    it('should use minimum 1280x720 resolution for 3D scene canvas', () => {
      const { container } = renderWithProviders(<PreviewFrame />);
      
      const sceneBtn = screen.getByTitle('3D Scene View Mode');
      fireEvent.click(sceneBtn);
      
      const canvas = container.querySelector('.scene-canvas');
      expect(canvas).toHaveAttribute('width', '1280');
      expect(canvas).toHaveAttribute('height', '720');
    });
    
    it('should respect custom resolution from project settings', () => {
      const store = createTestStore({
        project: {
          settings: {
            resolution: { width: 1920, height: 1080 },
            format: 'mp4' as const,
            quality: 'preview' as const,
            fps: 24,
          },
        },
      });
      
      const { container } = renderWithProviders(<PreviewFrame />, store);
      
      const canvas = container.querySelector('.preview-canvas');
      expect(canvas).toHaveAttribute('width', '1920');
      expect(canvas).toHaveAttribute('height', '1080');
    });
  });
  
  describe('Playhead Synchronization', () => {
    it('should maintain playhead position when switching modes', () => {
      const store = createTestStore({
        timeline: {
          playheadPosition: 500,
          zoomLevel: 10,
          duration: 1000,
        },
      });
      
      renderWithProviders(<PreviewFrame />, store);
      
      // Check initial timecode
      expect(screen.getByText(/00:00:02:02/)).toBeInTheDocument();
      
      // Switch to 3D scene
      const sceneBtn = screen.getByTitle('3D Scene View Mode');
      fireEvent.click(sceneBtn);
      
      // Switch back to video
      const videoBtn = screen.getByTitle('Video Preview Mode');
      fireEvent.click(videoBtn);
      
      // Timecode should be the same
      expect(screen.getByText(/00:00:02:02/)).toBeInTheDocument();
    });
  });
  
  describe('WebGL Acceleration', () => {
    it('should attempt to use WebGL for 3D scene', () => {
      renderWithProviders(<PreviewFrame />);
      
      const sceneBtn = screen.getByTitle('3D Scene View Mode');
      fireEvent.click(sceneBtn);
      
      expect(mockGetContext).toHaveBeenCalledWith('webgl');
    });
    
    it('should fall back to 2D when WebGL is unavailable', () => {
      mockGetContext.mockReturnValueOnce(null); // WebGL not available
      mockGetContext.mockReturnValueOnce(null); // experimental-webgl not available
      mockGetContext.mockReturnValue(mockContext); // 2D context
      
      renderWithProviders(<PreviewFrame />);
      
      const sceneBtn = screen.getByTitle('3D Scene View Mode');
      fireEvent.click(sceneBtn);
      
      expect(screen.getByText(/WebGL not available/)).toBeInTheDocument();
    });
  });
  
  describe('Accessibility', () => {
    it('should be keyboard navigable between modes', () => {
      renderWithProviders(<PreviewFrame />);
      
      const videoBtn = screen.getByTitle('Video Preview Mode');
      const sceneBtn = screen.getByTitle('3D Scene View Mode');
      
      videoBtn.focus();
      expect(videoBtn).toHaveFocus();
      
      // Tab to next button
      fireEvent.keyDown(videoBtn, { key: 'Tab' });
      
      // Should be able to activate with Enter
      sceneBtn.focus();
      fireEvent.keyDown(sceneBtn, { key: 'Enter' });
      
      expect(sceneBtn).toHaveClass('active');
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle rapid mode switching', () => {
      renderWithProviders(<PreviewFrame />);
      
      const videoBtn = screen.getByTitle('Video Preview Mode');
      const sceneBtn = screen.getByTitle('3D Scene View Mode');
      
      // Rapidly switch modes
      fireEvent.click(sceneBtn);
      fireEvent.click(videoBtn);
      fireEvent.click(sceneBtn);
      fireEvent.click(videoBtn);
      
      // Should end in video mode
      expect(videoBtn).toHaveClass('active');
    });
    
    it('should handle mode switching during playback', async () => {
      const store = createTestStore({
        preview: {
          playbackState: 'playing',
          playbackSpeed: 1,
        },
      });
      
      renderWithProviders(<PreviewFrame />, store);
      
      const sceneBtn = screen.getByTitle('3D Scene View Mode');
      fireEvent.click(sceneBtn);
      
      // Playback should continue
      await waitFor(() => {
        expect(screen.getByTitle('Play/Pause (Space)')).toBeInTheDocument();
      });
    });
  });
});
