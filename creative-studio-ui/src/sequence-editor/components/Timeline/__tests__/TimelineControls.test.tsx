/**
 * TimelineControls Component Tests
 * 
 * Tests for timeline control bar with playback controls, keyboard shortcuts,
 * and timecode display.
 * 
 * Requirements: 1.1, 1.2, 1.4, 3.4, 3.5, 16.1, 16.2, 16.3, 16.4, 16.5, 17.2
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TimelineControls } from '../TimelineControls';
import previewReducer from '../../../store/slices/previewSlice';
import timelineReducer from '../../../store/slices/timelineSlice';
import type { LayerType } from '../../../types';

// Helper to create a test store
const createTestStore = () => {
  return configureStore({
    reducer: {
      preview: previewReducer,
      timeline: timelineReducer,
    },
  });
};

// Helper to render with Redux
const renderWithRedux = (component: React.ReactElement) => {
  const store = createTestStore();
  return {
    ...render(<Provider store={store}>{component}</Provider>),
    store,
  };
};

describe('TimelineControls', () => {
  const defaultProps = {
    zoomLevel: 10,
    onZoomChange: vi.fn(),
    onAddTrack: vi.fn(),
    playheadPosition: 120, // 5 seconds at 24fps
    duration: 720, // 30 seconds at 24fps
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all playback control buttons', () => {
      renderWithRedux(<TimelineControls {...defaultProps} />);

      expect(screen.getByTitle(/go to start/i)).toBeInTheDocument();
      expect(screen.getByTitle(/previous frame/i)).toBeInTheDocument();
      expect(screen.getByTitle(/^play \(space\)$/i)).toBeInTheDocument();
      expect(screen.getByTitle(/stop/i)).toBeInTheDocument();
      expect(screen.getByTitle(/next frame/i)).toBeInTheDocument();
      expect(screen.getByTitle(/go to end/i)).toBeInTheDocument();
    });

    it('should display current timecode and total duration', () => {
      renderWithRedux(<TimelineControls {...defaultProps} />);

      // Current time: 120 frames = 5 seconds = 00:05:00
      expect(screen.getByText('00:05:00')).toBeInTheDocument();
      
      // Total duration: 720 frames = 30 seconds = 00:30:00
      expect(screen.getByText('00:30:00')).toBeInTheDocument();
      
      // Separator
      expect(screen.getByText('/')).toBeInTheDocument();
    });

    it('should render zoom controls', () => {
      renderWithRedux(<TimelineControls {...defaultProps} />);

      expect(screen.getByTitle(/zoom out/i)).toBeInTheDocument();
      expect(screen.getByTitle(/zoom in/i)).toBeInTheDocument();
      expect(screen.getByTitle(/fit to window/i)).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument(); // zoomLevel * 10
    });

    it('should render track management buttons', () => {
      renderWithRedux(<TimelineControls {...defaultProps} />);

      expect(screen.getByText('+ Track')).toBeInTheDocument();
      expect(screen.getByText('- Track')).toBeInTheDocument();
    });

    it('should render edit mode toggles', () => {
      renderWithRedux(<TimelineControls {...defaultProps} />);

      expect(screen.getByTitle(/snap to grid/i)).toBeInTheDocument();
      expect(screen.getByTitle(/ripple edit/i)).toBeInTheDocument();
      expect(screen.getByTitle(/magnetic timeline/i)).toBeInTheDocument();
    });
  });

  describe('Playback Controls', () => {
    it('should toggle play/pause when play button is clicked', async () => {
      const { store } = renderWithRedux(<TimelineControls {...defaultProps} />);

      const playButton = screen.getByTitle(/^play \(space\)$/i);
      
      // Initially stopped
      expect(store.getState().preview.playbackState).toBe('stopped');

      // Click to play
      fireEvent.click(playButton);
      await waitFor(() => {
        expect(store.getState().preview.playbackState).toBe('playing');
      });

      // Click to pause
      fireEvent.click(playButton);
      await waitFor(() => {
        expect(store.getState().preview.playbackState).toBe('paused');
      });
    });

    it('should stop playback and reset to start when stop button is clicked', async () => {
      const { store } = renderWithRedux(<TimelineControls {...defaultProps} />);

      // Start playing
      const playButton = screen.getByTitle(/^play \(space\)$/i);
      fireEvent.click(playButton);
      await waitFor(() => {
        expect(store.getState().preview.playbackState).toBe('playing');
      });

      // Stop
      const stopButton = screen.getByTitle(/stop/i);
      fireEvent.click(stopButton);
      
      await waitFor(() => {
        expect(store.getState().preview.playbackState).toBe('stopped');
        expect(store.getState().timeline.playheadPosition).toBe(0);
      });
    });

    it('should go to start when go to start button is clicked', async () => {
      const { store } = renderWithRedux(<TimelineControls {...defaultProps} />);

      const goToStartButton = screen.getByTitle(/go to start/i);
      fireEvent.click(goToStartButton);

      await waitFor(() => {
        expect(store.getState().timeline.playheadPosition).toBe(0);
      });
    });

    it('should go to end when go to end button is clicked', async () => {
      const { store } = renderWithRedux(<TimelineControls {...defaultProps} />);

      const goToEndButton = screen.getByTitle(/go to end/i);
      fireEvent.click(goToEndButton);

      await waitFor(() => {
        expect(store.getState().timeline.playheadPosition).toBe(defaultProps.duration);
      });
    });

    it('should move to previous frame when previous frame button is clicked', async () => {
      const { store } = renderWithRedux(<TimelineControls {...defaultProps} />);

      const prevButton = screen.getByTitle(/previous frame/i);
      fireEvent.click(prevButton);

      await waitFor(() => {
        expect(store.getState().timeline.playheadPosition).toBe(defaultProps.playheadPosition - 1);
      });
    });

    it('should move to next frame when next frame button is clicked', async () => {
      const { store } = renderWithRedux(<TimelineControls {...defaultProps} />);

      const nextButton = screen.getByTitle(/next frame/i);
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(store.getState().timeline.playheadPosition).toBe(defaultProps.playheadPosition + 1);
      });
    });

    it('should not go below 0 when moving to previous frame at start', async () => {
      const { store } = renderWithRedux(
        <TimelineControls {...defaultProps} playheadPosition={0} />
      );

      const prevButton = screen.getByTitle(/previous frame/i);
      fireEvent.click(prevButton);

      await waitFor(() => {
        expect(store.getState().timeline.playheadPosition).toBe(0);
      });
    });

    it('should not exceed duration when moving to next frame at end', async () => {
      const { store } = renderWithRedux(
        <TimelineControls {...defaultProps} playheadPosition={defaultProps.duration} />
      );

      const nextButton = screen.getByTitle(/next frame/i);
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(store.getState().timeline.playheadPosition).toBe(defaultProps.duration);
      });
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should toggle play/pause when Space key is pressed', async () => {
      const { store } = renderWithRedux(<TimelineControls {...defaultProps} />);

      // Press Space to play
      fireEvent.keyDown(window, { key: ' ' });
      await waitFor(() => {
        expect(store.getState().preview.playbackState).toBe('playing');
      });

      // Press Space to pause
      fireEvent.keyDown(window, { key: ' ' });
      await waitFor(() => {
        expect(store.getState().preview.playbackState).toBe('paused');
      });
    });

    it('should stop playback when K key is pressed', async () => {
      const { store } = renderWithRedux(<TimelineControls {...defaultProps} />);

      // Start playing
      fireEvent.keyDown(window, { key: ' ' });
      await waitFor(() => {
        expect(store.getState().preview.playbackState).toBe('playing');
      });

      // Press K to stop
      fireEvent.keyDown(window, { key: 'k' });
      await waitFor(() => {
        expect(store.getState().preview.playbackState).toBe('stopped');
        expect(store.getState().timeline.playheadPosition).toBe(0);
      });
    });

    it('should move to previous frame when J key is pressed', async () => {
      const { store } = renderWithRedux(<TimelineControls {...defaultProps} />);

      fireEvent.keyDown(window, { key: 'j' });
      await waitFor(() => {
        expect(store.getState().timeline.playheadPosition).toBe(defaultProps.playheadPosition - 1);
      });
    });

    it('should move to next frame when L key is pressed', async () => {
      const { store } = renderWithRedux(<TimelineControls {...defaultProps} />);

      fireEvent.keyDown(window, { key: 'l' });
      await waitFor(() => {
        expect(store.getState().timeline.playheadPosition).toBe(defaultProps.playheadPosition + 1);
      });
    });

    it('should go to start when Home key is pressed', async () => {
      const { store } = renderWithRedux(<TimelineControls {...defaultProps} />);

      fireEvent.keyDown(window, { key: 'Home' });
      await waitFor(() => {
        expect(store.getState().timeline.playheadPosition).toBe(0);
      });
    });

    it('should go to end when End key is pressed', async () => {
      const { store } = renderWithRedux(<TimelineControls {...defaultProps} />);

      fireEvent.keyDown(window, { key: 'End' });
      await waitFor(() => {
        expect(store.getState().timeline.playheadPosition).toBe(defaultProps.duration);
      });
    });

    it('should move to previous frame when Left Arrow is pressed', async () => {
      const { store } = renderWithRedux(<TimelineControls {...defaultProps} />);

      fireEvent.keyDown(window, { key: 'ArrowLeft' });
      await waitFor(() => {
        expect(store.getState().timeline.playheadPosition).toBe(defaultProps.playheadPosition - 1);
      });
    });

    it('should move to next frame when Right Arrow is pressed', async () => {
      const { store } = renderWithRedux(<TimelineControls {...defaultProps} />);

      fireEvent.keyDown(window, { key: 'ArrowRight' });
      await waitFor(() => {
        expect(store.getState().timeline.playheadPosition).toBe(defaultProps.playheadPosition + 1);
      });
    });

    it('should not trigger shortcuts when typing in input field', async () => {
      const { store } = renderWithRedux(<TimelineControls {...defaultProps} />);

      // Create a mock input element
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      // Try to trigger play with Space
      fireEvent.keyDown(input, { key: ' ' });
      
      // Should not change playback state
      await waitFor(() => {
        expect(store.getState().preview.playbackState).toBe('stopped');
      });

      document.body.removeChild(input);
    });
  });

  describe('Zoom Controls', () => {
    it('should zoom in when zoom in button is clicked', () => {
      const onZoomChange = vi.fn();
      renderWithRedux(<TimelineControls {...defaultProps} onZoomChange={onZoomChange} />);

      const zoomInButton = screen.getByTitle(/zoom in/i);
      fireEvent.click(zoomInButton);

      expect(onZoomChange).toHaveBeenCalledWith(15); // 10 * 1.5
    });

    it('should zoom out when zoom out button is clicked', () => {
      const onZoomChange = vi.fn();
      renderWithRedux(<TimelineControls {...defaultProps} onZoomChange={onZoomChange} />);

      const zoomOutButton = screen.getByTitle(/zoom out/i);
      fireEvent.click(zoomOutButton);

      expect(onZoomChange).toHaveBeenCalledWith(6.666666666666667); // 10 / 1.5
    });

    it('should fit to window when fit button is clicked', () => {
      const onZoomChange = vi.fn();
      renderWithRedux(<TimelineControls {...defaultProps} onZoomChange={onZoomChange} />);

      const fitButton = screen.getByTitle(/fit to window/i);
      fireEvent.click(fitButton);

      expect(onZoomChange).toHaveBeenCalledWith(10);
    });

    it('should not zoom beyond maximum level', () => {
      const onZoomChange = vi.fn();
      renderWithRedux(<TimelineControls {...defaultProps} zoomLevel={80} onZoomChange={onZoomChange} />);

      const zoomInButton = screen.getByTitle(/zoom in/i);
      fireEvent.click(zoomInButton);

      expect(onZoomChange).toHaveBeenCalledWith(100); // Max is 100
    });

    it('should not zoom below minimum level', () => {
      const onZoomChange = vi.fn();
      renderWithRedux(<TimelineControls {...defaultProps} zoomLevel={1.5} onZoomChange={onZoomChange} />);

      const zoomOutButton = screen.getByTitle(/zoom out/i);
      fireEvent.click(zoomOutButton);

      expect(onZoomChange).toHaveBeenCalledWith(1); // Min is 1
    });
  });

  describe('Track Management', () => {
    it('should show track type menu when add track button is clicked', () => {
      renderWithRedux(<TimelineControls {...defaultProps} />);

      const addTrackButton = screen.getByText('+ Track');
      fireEvent.click(addTrackButton);

      expect(screen.getByText('Media Track')).toBeInTheDocument();
      expect(screen.getByText('Audio Track')).toBeInTheDocument();
      expect(screen.getByText('Effects Track')).toBeInTheDocument();
      expect(screen.getByText('Transitions Track')).toBeInTheDocument();
      expect(screen.getByText('Text Track')).toBeInTheDocument();
      expect(screen.getByText('Keyframes Track')).toBeInTheDocument();
    });

    it('should call onAddTrack with correct type when track type is selected', () => {
      const onAddTrack = vi.fn();
      renderWithRedux(<TimelineControls {...defaultProps} onAddTrack={onAddTrack} />);

      const addTrackButton = screen.getByText('+ Track');
      fireEvent.click(addTrackButton);

      const mediaTrackOption = screen.getByText('Media Track');
      fireEvent.click(mediaTrackOption);

      expect(onAddTrack).toHaveBeenCalledWith('media');
    });

    it('should close menu after selecting track type', () => {
      const onAddTrack = vi.fn();
      renderWithRedux(<TimelineControls {...defaultProps} onAddTrack={onAddTrack} />);

      const addTrackButton = screen.getByText('+ Track');
      fireEvent.click(addTrackButton);

      const audioTrackOption = screen.getByText('Audio Track');
      fireEvent.click(audioTrackOption);

      expect(screen.queryByText('Media Track')).not.toBeInTheDocument();
    });

    it('should call onDeleteTrack when delete track button is clicked', () => {
      const onDeleteTrack = vi.fn();
      renderWithRedux(<TimelineControls {...defaultProps} onDeleteTrack={onDeleteTrack} />);

      const deleteButton = screen.getByText('- Track');
      fireEvent.click(deleteButton);

      expect(onDeleteTrack).toHaveBeenCalled();
    });

    it('should disable delete track button when onDeleteTrack is not provided', () => {
      renderWithRedux(<TimelineControls {...defaultProps} />);

      const deleteButton = screen.getByText('- Track');
      expect(deleteButton).toBeDisabled();
    });
  });

  describe('Edit Mode Toggles', () => {
    it('should show active state for snap to grid when enabled', () => {
      renderWithRedux(<TimelineControls {...defaultProps} snapToGrid={true} />);

      const snapButton = screen.getByTitle(/snap to grid/i);
      expect(snapButton).toHaveClass('active');
    });

    it('should call onToggleSnapToGrid when snap button is clicked', () => {
      const onToggleSnapToGrid = vi.fn();
      renderWithRedux(
        <TimelineControls {...defaultProps} onToggleSnapToGrid={onToggleSnapToGrid} />
      );

      const snapButton = screen.getByTitle(/snap to grid/i);
      fireEvent.click(snapButton);

      expect(onToggleSnapToGrid).toHaveBeenCalled();
    });

    it('should show active state for ripple edit when enabled', () => {
      renderWithRedux(<TimelineControls {...defaultProps} rippleEdit={true} />);

      const rippleButton = screen.getByTitle(/ripple edit/i);
      expect(rippleButton).toHaveClass('active');
    });

    it('should call onToggleRippleEdit when ripple button is clicked', () => {
      const onToggleRippleEdit = vi.fn();
      renderWithRedux(
        <TimelineControls {...defaultProps} onToggleRippleEdit={onToggleRippleEdit} />
      );

      const rippleButton = screen.getByTitle(/ripple edit/i);
      fireEvent.click(rippleButton);

      expect(onToggleRippleEdit).toHaveBeenCalled();
    });

    it('should show active state for magnetic timeline when enabled', () => {
      renderWithRedux(<TimelineControls {...defaultProps} magneticTimeline={true} />);

      const magneticButton = screen.getByTitle(/magnetic timeline/i);
      expect(magneticButton).toHaveClass('active');
    });

    it('should call onToggleMagneticTimeline when magnetic button is clicked', () => {
      const onToggleMagneticTimeline = vi.fn();
      renderWithRedux(
        <TimelineControls {...defaultProps} onToggleMagneticTimeline={onToggleMagneticTimeline} />
      );

      const magneticButton = screen.getByTitle(/magnetic timeline/i);
      fireEvent.click(magneticButton);

      expect(onToggleMagneticTimeline).toHaveBeenCalled();
    });
  });

  describe('Timecode Formatting', () => {
    it('should format timecode correctly for various frame counts', () => {
      const testCases = [
        { frames: 0, expected: '00:00:00' },
        { frames: 24, expected: '00:01:00' }, // 1 second at 24fps
        { frames: 120, expected: '00:05:00' }, // 5 seconds
        { frames: 1440, expected: '01:00:00' }, // 1 minute
        { frames: 3600, expected: '02:30:00' }, // 2.5 minutes
      ];

      testCases.forEach(({ frames, expected }) => {
        const { unmount } = renderWithRedux(
          <TimelineControls {...defaultProps} playheadPosition={frames} />
        );
        expect(screen.getByText(expected)).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Virtual Mode Toggle', () => {
    it('should show virtual mode toggle when onToggleVirtualMode is provided', () => {
      const onToggleVirtualMode = vi.fn();
      renderWithRedux(
        <TimelineControls {...defaultProps} onToggleVirtualMode={onToggleVirtualMode} />
      );

      expect(screen.getByTitle(/toggle virtual scrolling mode/i)).toBeInTheDocument();
    });

    it('should not show virtual mode toggle when onToggleVirtualMode is not provided', () => {
      renderWithRedux(<TimelineControls {...defaultProps} />);

      expect(screen.queryByTitle(/toggle virtual scrolling mode/i)).not.toBeInTheDocument();
    });

    it('should call onToggleVirtualMode when virtual mode button is clicked', () => {
      const onToggleVirtualMode = vi.fn();
      renderWithRedux(
        <TimelineControls {...defaultProps} onToggleVirtualMode={onToggleVirtualMode} />
      );

      const virtualButton = screen.getByTitle(/toggle virtual scrolling mode/i);
      fireEvent.click(virtualButton);

      expect(onToggleVirtualMode).toHaveBeenCalled();
    });

    it('should show active state when virtual mode is enabled', () => {
      const onToggleVirtualMode = vi.fn();
      renderWithRedux(
        <TimelineControls
          {...defaultProps}
          onToggleVirtualMode={onToggleVirtualMode}
          useVirtualMode={true}
        />
      );

      const virtualButton = screen.getByTitle(/toggle virtual scrolling mode/i);
      expect(virtualButton).toHaveClass('active');
    });
  });
});
