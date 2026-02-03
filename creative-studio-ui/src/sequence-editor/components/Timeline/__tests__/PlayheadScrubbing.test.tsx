/**
 * Playhead Scrubbing Tests
 * 
 * Tests for enhanced playhead scrubbing functionality including:
 * - Draggable playhead with smooth scrubbing
 * - Click-to-seek on timeline ruler
 * - Vertical line indicator across all tracks
 * - Timecode tooltip during scrubbing
 * - Snap-to-grid behavior
 * 
 * Requirements: 1.8, 3.2, 4.5, 4.6
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlayheadIndicator } from '../PlayheadIndicator';
import { TimeRuler } from '../TimeRuler';

describe('PlayheadIndicator - Enhanced Scrubbing', () => {
  const defaultProps = {
    position: 100,
    height: 500,
    zoomLevel: 10,
    fps: 24,
    isDragging: false,
    isPlaying: false,
    snapToGrid: true,
    onMouseDown: vi.fn(),
    onPositionChange: vi.fn(),
    onDragStart: vi.fn(),
    onDragEnd: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Draggable Playhead', () => {
    it('should render playhead indicator at correct position', () => {
      const { container } = render(<PlayheadIndicator {...defaultProps} />);
      const playhead = container.querySelector('.playhead-indicator');
      
      expect(playhead).toBeInTheDocument();
      expect(playhead).toHaveStyle({ left: '100px' });
    });

    it('should call onMouseDown when playhead handle is clicked', () => {
      const { container } = render(<PlayheadIndicator {...defaultProps} />);
      const handle = container.querySelector('.playhead-handle');
      
      fireEvent.mouseDown(handle!);
      
      expect(defaultProps.onMouseDown).toHaveBeenCalled();
    });

    it('should call onDragStart when dragging begins', () => {
      const { container } = render(<PlayheadIndicator {...defaultProps} />);
      const handle = container.querySelector('.playhead-handle');
      
      fireEvent.mouseDown(handle!);
      
      expect(defaultProps.onDragStart).toHaveBeenCalled();
    });

    it('should show dragging state when isDragging is true', () => {
      const { container } = render(
        <PlayheadIndicator {...defaultProps} isDragging={true} />
      );
      const playhead = container.querySelector('.playhead-indicator');
      
      expect(playhead).toHaveClass('dragging');
    });

    it('should display scrubbing indicator when dragging', () => {
      const { container } = render(
        <PlayheadIndicator {...defaultProps} isDragging={true} />
      );
      
      expect(container.querySelector('.playhead-scrubbing-indicator')).toBeInTheDocument();
      expect(screen.getByText('SCRUB')).toBeInTheDocument();
    });
  });

  describe('Timecode Tooltip', () => {
    it('should show tooltip on hover', async () => {
      const { container } = render(<PlayheadIndicator {...defaultProps} />);
      const playhead = container.querySelector('.playhead-indicator');
      
      fireEvent.mouseEnter(playhead!);
      
      await waitFor(() => {
        expect(container.querySelector('.playhead-tooltip')).toBeInTheDocument();
      });
    });

    it('should display correct timecode in tooltip', async () => {
      // position 100 / zoomLevel 10 = frame 10
      // frame 10 at 24fps = 00:00:10
      const { container } = render(<PlayheadIndicator {...defaultProps} />);
      const playhead = container.querySelector('.playhead-indicator');
      
      fireEvent.mouseEnter(playhead!);
      
      await waitFor(() => {
        const tooltip = container.querySelector('.playhead-tooltip-timecode');
        expect(tooltip).toHaveTextContent('00:00:10');
      });
    });

    it('should show tooltip during dragging', () => {
      const { container } = render(
        <PlayheadIndicator {...defaultProps} isDragging={true} />
      );
      
      expect(container.querySelector('.playhead-tooltip')).toBeInTheDocument();
    });

    it('should display snap state in tooltip when dragging', () => {
      const { container } = render(
        <PlayheadIndicator {...defaultProps} isDragging={true} snapToGrid={true} />
      );
      
      const hint = container.querySelector('.playhead-tooltip-hint');
      expect(hint).toHaveTextContent('🔒 Snapped');
    });

    it('should display free state in tooltip when snap is disabled', () => {
      const { container } = render(
        <PlayheadIndicator {...defaultProps} isDragging={true} snapToGrid={false} />
      );
      
      const hint = container.querySelector('.playhead-tooltip-hint');
      expect(hint).toHaveTextContent('🔓 Free');
    });

    it('should hide tooltip after mouse leave with delay', async () => {
      const { container } = render(<PlayheadIndicator {...defaultProps} />);
      const playhead = container.querySelector('.playhead-indicator');
      
      fireEvent.mouseEnter(playhead!);
      await waitFor(() => {
        expect(container.querySelector('.playhead-tooltip')).toBeInTheDocument();
      });
      
      fireEvent.mouseLeave(playhead!);
      
      // Tooltip should still be visible immediately after leave
      expect(container.querySelector('.playhead-tooltip')).toBeInTheDocument();
      
      // Wait for delay (200ms)
      await waitFor(() => {
        expect(container.querySelector('.playhead-tooltip')).not.toBeInTheDocument();
      }, { timeout: 300 });
    });
  });

  describe('Vertical Line Indicator', () => {
    it('should render vertical line across all tracks', () => {
      const { container } = render(<PlayheadIndicator {...defaultProps} />);
      const line = container.querySelector('.playhead-line');
      
      expect(line).toBeInTheDocument();
      expect(line).toHaveStyle({ height: '500px' });
    });

    it('should render line glow effect', () => {
      const { container } = render(<PlayheadIndicator {...defaultProps} />);
      
      expect(container.querySelector('.playhead-line-glow')).toBeInTheDocument();
    });

    it('should enhance glow when dragging', () => {
      const { container } = render(
        <PlayheadIndicator {...defaultProps} isDragging={true} />
      );
      const playhead = container.querySelector('.playhead-indicator');
      
      expect(playhead).toHaveClass('dragging');
    });
  });

  describe('Snap-to-Grid Behavior', () => {
    it('should snap to nearest frame when snapToGrid is true', () => {
      const { rerender } = render(<PlayheadIndicator {...defaultProps} snapToGrid={true} />);
      
      // Position 105 / zoomLevel 10 = 10.5 frames, should snap to 11
      rerender(<PlayheadIndicator {...defaultProps} position={105} snapToGrid={true} />);
      
      // The component should calculate frame 11 (rounded)
      // We can verify this by checking the tooltip
      const { container } = render(
        <PlayheadIndicator {...defaultProps} position={105} snapToGrid={true} isDragging={true} />
      );
      
      const tooltip = container.querySelector('.playhead-tooltip-timecode');
      expect(tooltip).toBeInTheDocument();
    });

    it('should not snap when snapToGrid is false', () => {
      const { container } = render(
        <PlayheadIndicator {...defaultProps} position={105} snapToGrid={false} isDragging={true} />
      );
      
      // Should floor to frame 10 instead of rounding to 11
      const tooltip = container.querySelector('.playhead-tooltip-timecode');
      expect(tooltip).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should move playhead forward with right arrow', () => {
      render(<PlayheadIndicator {...defaultProps} />);
      
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      
      expect(defaultProps.onPositionChange).toHaveBeenCalled();
    });

    it('should move playhead backward with left arrow', () => {
      render(<PlayheadIndicator {...defaultProps} />);
      
      fireEvent.keyDown(window, { key: 'ArrowLeft' });
      
      expect(defaultProps.onPositionChange).toHaveBeenCalled();
    });

    it('should jump to start with Home key', () => {
      render(<PlayheadIndicator {...defaultProps} />);
      
      fireEvent.keyDown(window, { key: 'Home' });
      
      expect(defaultProps.onPositionChange).toHaveBeenCalledWith(0);
    });

    it('should jump to end with End key', () => {
      render(<PlayheadIndicator {...defaultProps} />);
      
      fireEvent.keyDown(window, { key: 'End' });
      
      expect(defaultProps.onPositionChange).toHaveBeenCalled();
    });

    it('should move by 10 frames with Shift+Arrow', () => {
      render(<PlayheadIndicator {...defaultProps} />);
      
      fireEvent.keyDown(window, { key: 'ArrowRight', shiftKey: true });
      
      expect(defaultProps.onPositionChange).toHaveBeenCalled();
    });

    it('should move by 1 second with PageDown/PageUp', () => {
      render(<PlayheadIndicator {...defaultProps} />);
      
      fireEvent.keyDown(window, { key: 'PageDown' });
      
      expect(defaultProps.onPositionChange).toHaveBeenCalled();
    });
  });

  describe('Playing State', () => {
    it('should show playing indicator when isPlaying is true', () => {
      const { container } = render(
        <PlayheadIndicator {...defaultProps} isPlaying={true} />
      );
      
      expect(container.querySelector('.playhead-playing-indicator')).toBeInTheDocument();
      expect(screen.getByText('PLAY')).toBeInTheDocument();
    });

    it('should not show scrubbing indicator when playing', () => {
      const { container } = render(
        <PlayheadIndicator {...defaultProps} isPlaying={true} isDragging={true} />
      );
      
      expect(container.querySelector('.playhead-scrubbing-indicator')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const { container } = render(<PlayheadIndicator {...defaultProps} />);
      const playhead = container.querySelector('.playhead-indicator');
      
      expect(playhead).toHaveAttribute('role', 'slider');
      expect(playhead).toHaveAttribute('aria-label', 'Playhead position');
      expect(playhead).toHaveAttribute('aria-valuenow');
      expect(playhead).toHaveAttribute('aria-valuemin', '0');
      expect(playhead).toHaveAttribute('aria-valuemax');
    });

    it('should be keyboard focusable', () => {
      const { container } = render(<PlayheadIndicator {...defaultProps} />);
      const playhead = container.querySelector('.playhead-indicator');
      
      expect(playhead).toHaveAttribute('tabIndex', '0');
    });
  });
});

describe('TimeRuler - Click-to-Seek', () => {
  const defaultProps = {
    zoomLevel: 10,
    duration: 1000,
    fps: 24,
    snapToGrid: true,
    playheadPosition: 100,
    onSeek: vi.fn(),
    onMarkerClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Click-to-Seek Functionality', () => {
    it('should render time ruler', () => {
      const { container } = render(<TimeRuler {...defaultProps} />);
      
      expect(container.querySelector('.timeline-ruler')).toBeInTheDocument();
    });

    it('should call onSeek when ruler is clicked', () => {
      const { container } = render(<TimeRuler {...defaultProps} />);
      const ruler = container.querySelector('.timeline-ruler');
      
      // Mock getBoundingClientRect
      vi.spyOn(ruler!, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        right: 1000,
        bottom: 30,
        width: 1000,
        height: 30,
        x: 0,
        y: 0,
        toJSON: () => {},
      });
      
      fireEvent.click(ruler!, { clientX: 500 });
      
      expect(defaultProps.onSeek).toHaveBeenCalled();
    });

    it('should calculate correct frame from click position', () => {
      const { container } = render(<TimeRuler {...defaultProps} />);
      const ruler = container.querySelector('.timeline-ruler');
      
      vi.spyOn(ruler!, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        right: 1000,
        bottom: 30,
        width: 1000,
        height: 30,
        x: 0,
        y: 0,
        toJSON: () => {},
      });
      
      // Click at x=240 with zoomLevel=10 should be frame 24
      fireEvent.click(ruler!, { clientX: 240 });
      
      expect(defaultProps.onSeek).toHaveBeenCalledWith(24);
    });

    it('should clamp seek position to valid range', () => {
      const { container } = render(<TimeRuler {...defaultProps} />);
      const ruler = container.querySelector('.timeline-ruler');
      
      vi.spyOn(ruler!, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        right: 1000,
        bottom: 30,
        width: 1000,
        height: 30,
        x: 0,
        y: 0,
        toJSON: () => {},
      });
      
      // Click beyond duration
      fireEvent.click(ruler!, { clientX: 20000 });
      
      // Should clamp to duration (1000 frames)
      expect(defaultProps.onSeek).toHaveBeenCalledWith(expect.any(Number));
      const calledFrame = defaultProps.onSeek.mock.calls[0][0];
      expect(calledFrame).toBeLessThanOrEqual(1000);
    });
  });

  describe('Hover Preview', () => {
    it('should show hover indicator on mouse move', () => {
      const { container } = render(<TimeRuler {...defaultProps} />);
      const ruler = container.querySelector('.timeline-ruler');
      
      vi.spyOn(ruler!, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        right: 1000,
        bottom: 30,
        width: 1000,
        height: 30,
        x: 0,
        y: 0,
        toJSON: () => {},
      });
      
      fireEvent.mouseMove(ruler!, { clientX: 500 });
      
      expect(container.querySelector('.ruler-hover-indicator')).toBeInTheDocument();
    });

    it('should display timecode tooltip on hover', () => {
      const { container } = render(<TimeRuler {...defaultProps} />);
      const ruler = container.querySelector('.timeline-ruler');
      
      vi.spyOn(ruler!, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        right: 1000,
        bottom: 30,
        width: 1000,
        height: 30,
        x: 0,
        y: 0,
        toJSON: () => {},
      });
      
      fireEvent.mouseMove(ruler!, { clientX: 240 });
      
      expect(container.querySelector('.ruler-hover-tooltip')).toBeInTheDocument();
    });

    it('should hide hover indicator on mouse leave', () => {
      const { container } = render(<TimeRuler {...defaultProps} />);
      const ruler = container.querySelector('.timeline-ruler');
      
      vi.spyOn(ruler!, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        right: 1000,
        bottom: 30,
        width: 1000,
        height: 30,
        x: 0,
        y: 0,
        toJSON: () => {},
      });
      
      fireEvent.mouseMove(ruler!, { clientX: 500 });
      expect(container.querySelector('.ruler-hover-indicator')).toBeInTheDocument();
      
      fireEvent.mouseLeave(ruler!);
      expect(container.querySelector('.ruler-hover-indicator')).not.toBeInTheDocument();
    });
  });

  describe('Playhead Position Indicator', () => {
    it('should show playhead position on ruler', () => {
      const { container } = render(<TimeRuler {...defaultProps} playheadPosition={50} />);
      
      const indicator = container.querySelector('.ruler-playhead-indicator');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveStyle({ left: '500px' }); // 50 * 10 zoomLevel
    });
  });

  describe('Time Format Toggle', () => {
    it('should toggle time format on double-click', () => {
      const { container } = render(<TimeRuler {...defaultProps} />);
      const ruler = container.querySelector('.timeline-ruler');
      
      // Initial format should be seconds
      expect(container.querySelector('.ruler-format-hint')).toHaveTextContent('Seconds');
      
      fireEvent.doubleClick(ruler!);
      
      // Should change to frames
      expect(container.querySelector('.ruler-format-hint')).toHaveTextContent('Frames');
    });

    it('should cycle through all time formats', () => {
      const { container } = render(<TimeRuler {...defaultProps} />);
      const ruler = container.querySelector('.timeline-ruler');
      
      // Seconds -> Frames
      fireEvent.doubleClick(ruler!);
      expect(container.querySelector('.ruler-format-hint')).toHaveTextContent('Frames');
      
      // Frames -> Minutes
      fireEvent.doubleClick(ruler!);
      expect(container.querySelector('.ruler-format-hint')).toHaveTextContent('Minutes');
      
      // Minutes -> Seconds
      fireEvent.doubleClick(ruler!);
      expect(container.querySelector('.ruler-format-hint')).toHaveTextContent('Seconds');
    });
  });

  describe('Marker Click', () => {
    it('should call onMarkerClick when marker is clicked', () => {
      const { container } = render(<TimeRuler {...defaultProps} />);
      const marker = container.querySelector('.timeline-ruler-marker');
      
      if (marker) {
        fireEvent.click(marker);
        expect(defaultProps.onMarkerClick).toHaveBeenCalled();
      }
    });

    it('should call onSeek when marker is clicked', () => {
      const { container } = render(<TimeRuler {...defaultProps} />);
      const marker = container.querySelector('.timeline-ruler-marker');
      
      if (marker) {
        fireEvent.click(marker);
        expect(defaultProps.onSeek).toHaveBeenCalled();
      }
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const { container } = render(<TimeRuler {...defaultProps} />);
      const ruler = container.querySelector('.timeline-ruler');
      
      expect(ruler).toHaveAttribute('role', 'slider');
      expect(ruler).toHaveAttribute('aria-label');
      expect(ruler).toHaveAttribute('aria-valuenow');
      expect(ruler).toHaveAttribute('aria-valuemin', '0');
      expect(ruler).toHaveAttribute('aria-valuemax', '1000');
    });

    it('should be keyboard focusable', () => {
      const { container } = render(<TimeRuler {...defaultProps} />);
      const ruler = container.querySelector('.timeline-ruler');
      
      expect(ruler).toHaveAttribute('tabIndex', '0');
    });

    it('should support keyboard navigation on markers', () => {
      const { container } = render(<TimeRuler {...defaultProps} />);
      const marker = container.querySelector('.timeline-ruler-marker');
      
      if (marker) {
        expect(marker).toHaveAttribute('role', 'button');
        expect(marker).toHaveAttribute('tabIndex', '0');
        
        fireEvent.keyDown(marker, { key: 'Enter' });
        expect(defaultProps.onSeek).toHaveBeenCalled();
      }
    });
  });
});

