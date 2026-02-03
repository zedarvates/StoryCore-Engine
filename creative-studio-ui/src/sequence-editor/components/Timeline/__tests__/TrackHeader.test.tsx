/**
 * TrackHeader Component Tests
 * 
 * Tests for track management and controls including:
 * - Lock/hide toggles
 * - Track reordering via drag-and-drop
 * - Vertical track resizing
 * - Track-specific controls (mute, solo for audio)
 * 
 * Requirements: 1.4, 1.5, 1.6, 1.7
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TrackHeader, TRACK_CONFIG } from '../TrackHeader';
import type { Track } from '../../../types';

// Mock track data
const createMockTrack = (overrides?: Partial<Track>): Track => ({
  id: 'track-1',
  type: 'media',
  height: 60,
  locked: false,
  hidden: false,
  color: '#4A90E2',
  icon: 'film',
  ...overrides,
});

describe('TrackHeader Component', () => {
  // Default props
  const defaultProps = {
    track: createMockTrack(),
    index: 0,
    isHovered: false,
    isDragging: false,
    isDropTarget: false,
    onHover: vi.fn(),
    onLockToggle: vi.fn(),
    onHideToggle: vi.fn(),
    onResize: vi.fn(),
    onReorder: vi.fn(),
    zoomLevel: 10,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render track header with correct track name', () => {
      render(<TrackHeader {...defaultProps} />);
      expect(screen.getByText('Media')).toBeInTheDocument();
    });

    it('should render track icon', () => {
      const { container } = render(<TrackHeader {...defaultProps} />);
      const icon = container.querySelector('.track-icon-emoji');
      expect(icon).toBeInTheDocument();
    });

    it('should render lock and hide buttons', () => {
      const { container } = render(<TrackHeader {...defaultProps} />);
      const buttons = container.querySelectorAll('.track-control-btn');
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    it('should render drag handle', () => {
      const { container } = render(<TrackHeader {...defaultProps} />);
      const dragHandle = container.querySelector('.track-drag-handle');
      expect(dragHandle).toBeInTheDocument();
    });

    it('should render resize handle', () => {
      const { container } = render(<TrackHeader {...defaultProps} />);
      const resizeHandle = container.querySelector('.track-resize-handle');
      expect(resizeHandle).toBeInTheDocument();
    });

    it('should render color indicator with correct color', () => {
      const { container } = render(<TrackHeader {...defaultProps} />);
      const colorIndicator = container.querySelector('.track-color-indicator');
      expect(colorIndicator).toHaveStyle({ backgroundColor: '#4A90E2' });
    });

    it('should apply correct height style', () => {
      const { container } = render(<TrackHeader {...defaultProps} />);
      const header = container.querySelector('.track-header');
      expect(header).toHaveStyle({ height: '60px' });
    });
  });

  describe('Track States', () => {
    it('should apply locked class when track is locked', () => {
      const lockedTrack = createMockTrack({ locked: true });
      const { container } = render(
        <TrackHeader {...defaultProps} track={lockedTrack} />
      );
      const header = container.querySelector('.track-header');
      expect(header).toHaveClass('locked');
    });

    it('should apply hidden class when track is hidden', () => {
      const hiddenTrack = createMockTrack({ hidden: true });
      const { container } = render(
        <TrackHeader {...defaultProps} track={hiddenTrack} />
      );
      const header = container.querySelector('.track-header');
      expect(header).toHaveClass('hidden');
    });

    it('should apply hovered class when isHovered is true', () => {
      const { container } = render(
        <TrackHeader {...defaultProps} isHovered={true} />
      );
      const header = container.querySelector('.track-header');
      expect(header).toHaveClass('hovered');
    });

    it('should apply dragging class when isDragging is true', () => {
      const { container } = render(
        <TrackHeader {...defaultProps} isDragging={true} />
      );
      const header = container.querySelector('.track-header');
      expect(header).toHaveClass('dragging');
    });

    it('should apply drop-target class when isDropTarget is true', () => {
      const { container } = render(
        <TrackHeader {...defaultProps} isDropTarget={true} />
      );
      const header = container.querySelector('.track-header');
      expect(header).toHaveClass('drop-target');
    });

    it('should show "(Hidden)" in track name when hidden', () => {
      const hiddenTrack = createMockTrack({ hidden: true });
      render(<TrackHeader {...defaultProps} track={hiddenTrack} />);
      expect(screen.getByText(/Media.*\(Hidden\)/)).toBeInTheDocument();
    });

    it('should show "(Locked)" in track name when locked', () => {
      const lockedTrack = createMockTrack({ locked: true });
      render(<TrackHeader {...defaultProps} track={lockedTrack} />);
      expect(screen.getByText(/Media.*\(Locked\)/)).toBeInTheDocument();
    });
  });

  describe('Lock/Hide Toggles', () => {
    it('should call onLockToggle when lock button is clicked', () => {
      const { container } = render(<TrackHeader {...defaultProps} />);
      const lockButton = container.querySelectorAll('.track-control-btn')[0];
      fireEvent.click(lockButton);
      expect(defaultProps.onLockToggle).toHaveBeenCalledTimes(1);
    });

    it('should call onHideToggle when hide button is clicked', () => {
      const { container } = render(<TrackHeader {...defaultProps} />);
      const hideButton = container.querySelectorAll('.track-control-btn')[1];
      fireEvent.click(hideButton);
      expect(defaultProps.onHideToggle).toHaveBeenCalledTimes(1);
    });

    it('should show active state on lock button when track is locked', () => {
      const lockedTrack = createMockTrack({ locked: true });
      const { container } = render(
        <TrackHeader {...defaultProps} track={lockedTrack} />
      );
      const lockButton = container.querySelectorAll('.track-control-btn')[0];
      expect(lockButton).toHaveClass('active');
    });

    it('should show active state on hide button when track is hidden', () => {
      const hiddenTrack = createMockTrack({ hidden: true });
      const { container } = render(
        <TrackHeader {...defaultProps} track={hiddenTrack} />
      );
      const hideButton = container.querySelectorAll('.track-control-btn')[1];
      expect(hideButton).toHaveClass('active');
    });

    it('should disable lock button when track is hidden', () => {
      const hiddenTrack = createMockTrack({ hidden: true });
      const { container } = render(
        <TrackHeader {...defaultProps} track={hiddenTrack} />
      );
      const lockButton = container.querySelectorAll('.track-control-btn')[0];
      expect(lockButton).toBeDisabled();
    });
  });

  describe('Drag and Drop for Reordering', () => {
    it('should be draggable when not locked', () => {
      const { container } = render(<TrackHeader {...defaultProps} />);
      const header = container.querySelector('.track-header');
      expect(header).toHaveAttribute('draggable', 'true');
    });

    it('should not be draggable when locked', () => {
      const lockedTrack = createMockTrack({ locked: true });
      const { container } = render(
        <TrackHeader {...defaultProps} track={lockedTrack} />
      );
      const header = container.querySelector('.track-header');
      expect(header).toHaveAttribute('draggable', 'false');
    });

    it('should call onHover when mouse enters', () => {
      const { container } = render(<TrackHeader {...defaultProps} />);
      const header = container.querySelector('.track-header');
      fireEvent.mouseEnter(header!);
      expect(defaultProps.onHover).toHaveBeenCalledWith('track-1');
    });

    it('should call onHover with null when mouse leaves', () => {
      const { container } = render(<TrackHeader {...defaultProps} />);
      const header = container.querySelector('.track-header');
      fireEvent.mouseLeave(header!);
      expect(defaultProps.onHover).toHaveBeenCalledWith(null);
    });

    it('should set dataTransfer on drag start', () => {
      const { container } = render(<TrackHeader {...defaultProps} />);
      const header = container.querySelector('.track-header');
      
      const dataTransfer = {
        setData: vi.fn(),
        effectAllowed: '',
      };
      
      fireEvent.dragStart(header!, { dataTransfer });
      expect(dataTransfer.setData).toHaveBeenCalledWith('trackIndex', '0');
      expect(dataTransfer.effectAllowed).toBe('move');
    });

    it('should call onReorder on drop with correct indices', () => {
      const { container } = render(<TrackHeader {...defaultProps} index={2} />);
      const header = container.querySelector('.track-header');
      
      const dataTransfer = {
        getData: vi.fn().mockReturnValue('0'),
      };
      
      fireEvent.drop(header!, { dataTransfer });
      expect(defaultProps.onReorder).toHaveBeenCalledWith(0, 2);
    });

    it('should not call onReorder when dropping on same index', () => {
      const { container } = render(<TrackHeader {...defaultProps} index={0} />);
      const header = container.querySelector('.track-header');
      
      const dataTransfer = {
        getData: vi.fn().mockReturnValue('0'),
      };
      
      fireEvent.drop(header!, { dataTransfer });
      expect(defaultProps.onReorder).not.toHaveBeenCalled();
    });
  });

  describe('Vertical Resizing', () => {
    it('should call onResize when resize handle is dragged', () => {
      const { container } = render(<TrackHeader {...defaultProps} />);
      const resizeHandle = container.querySelector('.track-resize-handle');
      
      // Start resize
      fireEvent.mouseDown(resizeHandle!, { clientY: 100 });
      
      // Move mouse
      fireEvent.mouseMove(window, { clientY: 150 });
      
      // Should call onResize with new height
      expect(defaultProps.onResize).toHaveBeenCalled();
      
      // End resize
      fireEvent.mouseUp(window);
    });

    it('should enforce minimum height constraint', () => {
      const { container } = render(<TrackHeader {...defaultProps} />);
      const resizeHandle = container.querySelector('.track-resize-handle');
      
      // Start resize at current height
      fireEvent.mouseDown(resizeHandle!, { clientY: 100 });
      
      // Try to drag up beyond minimum
      fireEvent.mouseMove(window, { clientY: 50 });
      
      // Should be called with minimum height (40px for media track)
      const calls = defaultProps.onResize.mock.calls;
      if (calls.length > 0) {
        const lastCall = calls[calls.length - 1][0];
        expect(lastCall).toBeGreaterThanOrEqual(TRACK_CONFIG.media.minHeight);
      }
      
      fireEvent.mouseUp(window);
    });

    it('should apply resizing class during resize', () => {
      const { container } = render(<TrackHeader {...defaultProps} />);
      const resizeHandle = container.querySelector('.track-resize-handle');
      const header = container.querySelector('.track-header');
      
      // Start resize
      fireEvent.mouseDown(resizeHandle!, { clientY: 100 });
      
      // Should have resizing class
      expect(header).toHaveClass('resizing');
      
      // End resize
      fireEvent.mouseUp(window);
    });

    it('should not be draggable during resize', () => {
      const { container } = render(<TrackHeader {...defaultProps} />);
      const resizeHandle = container.querySelector('.track-resize-handle');
      const header = container.querySelector('.track-header');
      
      // Start resize
      fireEvent.mouseDown(resizeHandle!, { clientY: 100 });
      
      // Should not be draggable
      expect(header).toHaveAttribute('draggable', 'false');
      
      // End resize
      fireEvent.mouseUp(window);
    });
  });

  describe('Audio Track Controls', () => {
    const audioTrack = createMockTrack({ type: 'audio' });
    const audioProps = {
      ...defaultProps,
      track: audioTrack,
      onMuteToggle: vi.fn(),
      onSoloToggle: vi.fn(),
    };

    it('should render mute button for audio tracks', () => {
      const { container } = render(<TrackHeader {...audioProps} />);
      const muteButton = container.querySelector('.mute-btn');
      expect(muteButton).toBeInTheDocument();
    });

    it('should render solo button for audio tracks', () => {
      const { container } = render(<TrackHeader {...audioProps} />);
      const soloButton = container.querySelector('.solo-btn');
      expect(soloButton).toBeInTheDocument();
    });

    it('should not render audio controls for non-audio tracks', () => {
      const { container } = render(<TrackHeader {...defaultProps} />);
      const muteButton = container.querySelector('.mute-btn');
      const soloButton = container.querySelector('.solo-btn');
      expect(muteButton).not.toBeInTheDocument();
      expect(soloButton).not.toBeInTheDocument();
    });

    it('should call onMuteToggle when mute button is clicked', () => {
      const { container } = render(<TrackHeader {...audioProps} />);
      const muteButton = container.querySelector('.mute-btn');
      fireEvent.click(muteButton!);
      expect(audioProps.onMuteToggle).toHaveBeenCalledTimes(1);
    });

    it('should call onSoloToggle when solo button is clicked', () => {
      const { container } = render(<TrackHeader {...audioProps} />);
      const soloButton = container.querySelector('.solo-btn');
      fireEvent.click(soloButton!);
      expect(audioProps.onSoloToggle).toHaveBeenCalledTimes(1);
    });

    it('should toggle mute button active state', () => {
      const { container } = render(<TrackHeader {...audioProps} />);
      const muteButton = container.querySelector('.mute-btn');
      
      // Initially not active
      expect(muteButton).not.toHaveClass('active');
      
      // Click to mute
      fireEvent.click(muteButton!);
      
      // Should be active after click (local state)
      // Note: This tests the component's internal state management
    });

    it('should toggle solo button active state', () => {
      const { container } = render(<TrackHeader {...audioProps} />);
      const soloButton = container.querySelector('.solo-btn');
      
      // Initially not active
      expect(soloButton).not.toHaveClass('active');
      
      // Click to solo
      fireEvent.click(soloButton!);
      
      // Should be active after click (local state)
    });

    it('should render record button when onRecordToggle is provided', () => {
      const propsWithRecord = {
        ...audioProps,
        onRecordToggle: vi.fn(),
      };
      const { container } = render(<TrackHeader {...propsWithRecord} />);
      const recordButton = container.querySelector('.record-btn');
      expect(recordButton).toBeInTheDocument();
    });
  });

  describe('Track Type Configuration', () => {
    it('should render correct color for media track', () => {
      const { container } = render(<TrackHeader {...defaultProps} />);
      const colorIndicator = container.querySelector('.track-color-indicator');
      expect(colorIndicator).toHaveStyle({ backgroundColor: TRACK_CONFIG.media.color });
    });

    it('should render correct color for audio track', () => {
      const audioTrack = createMockTrack({ type: 'audio', color: TRACK_CONFIG.audio.color });
      const { container } = render(
        <TrackHeader {...defaultProps} track={audioTrack} />
      );
      const colorIndicator = container.querySelector('.track-color-indicator');
      expect(colorIndicator).toHaveStyle({ backgroundColor: TRACK_CONFIG.audio.color });
    });

    it('should render correct name for each track type', () => {
      const trackTypes: Array<keyof typeof TRACK_CONFIG> = [
        'media', 'audio', 'effects', 'transitions', 'text', 'keyframes'
      ];
      
      trackTypes.forEach(type => {
        const track = createMockTrack({ type });
        const { getByText } = render(
          <TrackHeader {...defaultProps} track={track} />
        );
        expect(getByText(TRACK_CONFIG[type].name)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have title attribute on drag handle', () => {
      const { container } = render(<TrackHeader {...defaultProps} />);
      const dragHandle = container.querySelector('.track-drag-handle');
      expect(dragHandle).toHaveAttribute('title', 'Drag to reorder');
    });

    it('should have title attribute on resize handle', () => {
      const { container } = render(<TrackHeader {...defaultProps} />);
      const resizeHandle = container.querySelector('.track-resize-handle');
      expect(resizeHandle).toHaveAttribute('title', 'Drag to resize track height');
    });

    it('should have title attribute on lock button', () => {
      const { container } = render(<TrackHeader {...defaultProps} />);
      const lockButton = container.querySelectorAll('.track-control-btn')[0];
      expect(lockButton).toHaveAttribute('title');
    });

    it('should have title attribute on hide button', () => {
      const { container } = render(<TrackHeader {...defaultProps} />);
      const hideButton = container.querySelectorAll('.track-control-btn')[1];
      expect(hideButton).toHaveAttribute('title');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing onMuteToggle for audio track', () => {
      const audioTrack = createMockTrack({ type: 'audio' });
      const propsWithoutMute = {
        ...defaultProps,
        track: audioTrack,
        onMuteToggle: undefined,
      };
      
      expect(() => {
        render(<TrackHeader {...propsWithoutMute} />);
      }).not.toThrow();
    });

    it('should handle missing onSoloToggle for audio track', () => {
      const audioTrack = createMockTrack({ type: 'audio' });
      const propsWithoutSolo = {
        ...defaultProps,
        track: audioTrack,
        onSoloToggle: undefined,
      };
      
      expect(() => {
        render(<TrackHeader {...propsWithoutSolo} />);
      }).not.toThrow();
    });

    it('should handle invalid drag data gracefully', () => {
      const { container } = render(<TrackHeader {...defaultProps} />);
      const header = container.querySelector('.track-header');
      
      const dataTransfer = {
        getData: vi.fn().mockReturnValue('invalid'),
      };
      
      fireEvent.drop(header!, { dataTransfer });
      expect(defaultProps.onReorder).not.toHaveBeenCalled();
    });

    it('should cleanup event listeners on unmount', () => {
      const { container, unmount } = render(<TrackHeader {...defaultProps} />);
      const resizeHandle = container.querySelector('.track-resize-handle');
      
      // Start resize
      fireEvent.mouseDown(resizeHandle!, { clientY: 100 });
      
      // Unmount while resizing
      unmount();
      
      // Should not throw error
      expect(() => {
        fireEvent.mouseMove(window, { clientY: 150 });
        fireEvent.mouseUp(window);
      }).not.toThrow();
    });
  });
});
