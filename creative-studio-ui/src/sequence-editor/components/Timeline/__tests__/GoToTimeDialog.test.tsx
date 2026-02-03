/**
 * GoToTimeDialog Tests
 * 
 * Comprehensive tests for the Go to Time dialog component including:
 * - Dialog open/close behavior
 * - Timecode input validation
 * - Quick jump buttons
 * - Keyboard shortcuts
 * - Error handling
 * 
 * Requirements: 4.6
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GoToTimeDialog } from '../GoToTimeDialog';

describe('GoToTimeDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onGoToTime: vi.fn(),
    maxFrame: 1000,
    fps: 24,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Dialog Visibility', () => {
    it('should render when isOpen is true', () => {
      render(<GoToTimeDialog {...defaultProps} />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Go to Time')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<GoToTimeDialog {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
      render(<GoToTimeDialog {...defaultProps} />);
      
      const closeBtn = screen.getByLabelText('Close dialog');
      fireEvent.click(closeBtn);
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when overlay is clicked', () => {
      render(<GoToTimeDialog {...defaultProps} />);
      
      const overlay = screen.getByRole('dialog').parentElement;
      fireEvent.click(overlay!);
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when dialog content is clicked', () => {
      render(<GoToTimeDialog {...defaultProps} />);
      
      const dialog = screen.getByRole('dialog');
      fireEvent.click(dialog);
      
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });

  describe('Timecode Input', () => {
    it('should render timecode input field', () => {
      render(<GoToTimeDialog {...defaultProps} />);
      
      const input = screen.getByLabelText(/Enter timecode/i);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('placeholder', '00:00:00');
    });

    it('should focus input when dialog opens', async () => {
      const { rerender } = render(<GoToTimeDialog {...defaultProps} isOpen={false} />);
      
      rerender(<GoToTimeDialog {...defaultProps} isOpen={true} />);
      
      await waitFor(() => {
        const input = screen.getByLabelText(/Enter timecode/i);
        expect(input).toHaveFocus();
      });
    });

    it('should select input text when dialog opens', async () => {
      render(<GoToTimeDialog {...defaultProps} />);
      
      await waitFor(() => {
        const input = screen.getByLabelText(/Enter timecode/i) as HTMLInputElement;
        expect(input.selectionStart).toBe(0);
        expect(input.selectionEnd).toBe(input.value.length);
      });
    });

    it('should accept valid timecode format MM:SS:FF', async () => {
      const user = userEvent.setup();
      render(<GoToTimeDialog {...defaultProps} maxFrame={5000} />);
      
      const input = screen.getByLabelText(/Enter timecode/i);
      await user.clear(input);
      await user.type(input, '01:30:15');
      
      expect(input).toHaveValue('01:30:15');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should show error for invalid format', async () => {
      const user = userEvent.setup();
      render(<GoToTimeDialog {...defaultProps} />);
      
      const input = screen.getByLabelText(/Enter timecode/i);
      await user.clear(input);
      await user.type(input, 'invalid');
      
      expect(screen.getByRole('alert')).toHaveTextContent(/Invalid format/i);
    });

    it('should show error for seconds >= 60', async () => {
      const user = userEvent.setup();
      render(<GoToTimeDialog {...defaultProps} />);
      
      const input = screen.getByLabelText(/Enter timecode/i);
      await user.clear(input);
      await user.type(input, '00:60:00');
      
      expect(screen.getByRole('alert')).toHaveTextContent(/Invalid timecode/i);
    });

    it('should show error for frames >= fps', async () => {
      const user = userEvent.setup();
      render(<GoToTimeDialog {...defaultProps} />);
      
      const input = screen.getByLabelText(/Enter timecode/i);
      await user.clear(input);
      await user.type(input, '00:00:24');
      
      expect(screen.getByRole('alert')).toHaveTextContent(/Invalid timecode/i);
    });

    it('should show error when timecode exceeds duration', async () => {
      const user = userEvent.setup();
      render(<GoToTimeDialog {...defaultProps} maxFrame={100} />);
      
      const input = screen.getByLabelText(/Enter timecode/i);
      await user.clear(input);
      await user.type(input, '10:00:00'); // Way beyond maxFrame
      
      expect(screen.getByRole('alert')).toHaveTextContent(/exceeds timeline duration/i);
    });

    it('should display frame rate hint', () => {
      render(<GoToTimeDialog {...defaultProps} fps={30} />);
      
      expect(screen.getByText(/Frame rate: 30 fps/i)).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should call onGoToTime with correct frame on submit', async () => {
      const user = userEvent.setup();
      render(<GoToTimeDialog {...defaultProps} maxFrame={5000} />);
      
      const input = screen.getByLabelText(/Enter timecode/i);
      await user.clear(input);
      await user.type(input, '01:00:00'); // 1 minute, 0 seconds, 0 frames = 60 seconds * 24 fps = 1440 frames
      
      const submitBtn = screen.getByRole('button', { name: /Go/i });
      await waitFor(() => {
        expect(submitBtn).not.toBeDisabled();
      });
      
      fireEvent.click(submitBtn);
      
      await waitFor(() => {
        expect(defaultProps.onGoToTime).toHaveBeenCalledWith(1440);
      });
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should not submit when there is an error', async () => {
      const user = userEvent.setup();
      render(<GoToTimeDialog {...defaultProps} />);
      
      const input = screen.getByLabelText(/Enter timecode/i);
      await user.clear(input);
      await user.type(input, 'invalid');
      
      const submitBtn = screen.getByRole('button', { name: /Go/i });
      fireEvent.click(submitBtn);
      
      expect(defaultProps.onGoToTime).not.toHaveBeenCalled();
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    it('should disable submit button when input is empty', () => {
      render(<GoToTimeDialog {...defaultProps} />);
      
      const input = screen.getByLabelText(/Enter timecode/i) as HTMLInputElement;
      fireEvent.change(input, { target: { value: '' } });
      
      const submitBtn = screen.getByRole('button', { name: /Go/i });
      expect(submitBtn).toBeDisabled();
    });

    it('should disable submit button when there is an error', async () => {
      const user = userEvent.setup();
      render(<GoToTimeDialog {...defaultProps} />);
      
      const input = screen.getByLabelText(/Enter timecode/i);
      await user.clear(input);
      await user.type(input, 'invalid');
      
      const submitBtn = screen.getByRole('button', { name: /Go/i });
      expect(submitBtn).toBeDisabled();
    });
  });

  describe('Quick Jump Buttons', () => {
    it('should render quick jump buttons', () => {
      render(<GoToTimeDialog {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /Start/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Middle/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /End/i })).toBeInTheDocument();
    });

    it('should jump to start when Start button is clicked', () => {
      render(<GoToTimeDialog {...defaultProps} />);
      
      const startBtn = screen.getByRole('button', { name: /Start/i });
      fireEvent.click(startBtn);
      
      expect(defaultProps.onGoToTime).toHaveBeenCalledWith(0);
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should jump to middle when Middle button is clicked', () => {
      render(<GoToTimeDialog {...defaultProps} maxFrame={1000} />);
      
      const middleBtn = screen.getByRole('button', { name: /Middle/i });
      fireEvent.click(middleBtn);
      
      expect(defaultProps.onGoToTime).toHaveBeenCalledWith(500);
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should jump to end when End button is clicked', () => {
      render(<GoToTimeDialog {...defaultProps} maxFrame={1000} />);
      
      const endBtn = screen.getByRole('button', { name: /End/i });
      fireEvent.click(endBtn);
      
      expect(defaultProps.onGoToTime).toHaveBeenCalledWith(1000);
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should update input field when quick jump button is clicked', () => {
      render(<GoToTimeDialog {...defaultProps} maxFrame={1000} />);
      
      const middleBtn = screen.getByRole('button', { name: /Middle/i });
      fireEvent.click(middleBtn);
      
      // Middle of 1000 frames = 500 frames
      // 500 frames / 24 fps = 20.83 seconds = 00:20:20
      const input = screen.getByLabelText(/Enter timecode/i) as HTMLInputElement;
      expect(input.value).toMatch(/00:20:20/);
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should close dialog when Escape is pressed', () => {
      render(<GoToTimeDialog {...defaultProps} />);
      
      const input = screen.getByLabelText(/Enter timecode/i);
      fireEvent.keyDown(input, { key: 'Escape' });
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should submit when Enter is pressed', async () => {
      const user = userEvent.setup();
      render(<GoToTimeDialog {...defaultProps} />);
      
      const input = screen.getByLabelText(/Enter timecode/i);
      await user.clear(input);
      await user.type(input, '00:01:00');
      
      fireEvent.keyDown(input, { key: 'Enter' });
      
      expect(defaultProps.onGoToTime).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should not submit on Enter when there is an error', async () => {
      const user = userEvent.setup();
      render(<GoToTimeDialog {...defaultProps} />);
      
      const input = screen.getByLabelText(/Enter timecode/i);
      await user.clear(input);
      await user.type(input, 'invalid');
      
      fireEvent.keyDown(input, { key: 'Enter' });
      
      expect(defaultProps.onGoToTime).not.toHaveBeenCalled();
    });

    it('should display keyboard shortcuts hint', () => {
      render(<GoToTimeDialog {...defaultProps} />);
      
      // Use getAllByText to handle multiple matches
      const enterElements = screen.getAllByText(/Enter/i);
      expect(enterElements.length).toBeGreaterThan(0);
      expect(screen.getByText(/Esc/i)).toBeInTheDocument();
    });
  });

  describe('Timecode Parsing', () => {
    it('should parse MM:SS:FF format correctly', async () => {
      const user = userEvent.setup();
      render(<GoToTimeDialog {...defaultProps} maxFrame={10000} />);
      
      const input = screen.getByLabelText(/Enter timecode/i);
      await user.clear(input);
      await user.type(input, '02:30:12');
      
      const submitBtn = screen.getByRole('button', { name: /Go/i });
      await waitFor(() => {
        expect(submitBtn).not.toBeDisabled();
      });
      
      fireEvent.click(submitBtn);
      
      // 2 minutes * 60 seconds * 24 fps + 30 seconds * 24 fps + 12 frames
      // = 2880 + 720 + 12 = 3612 frames
      await waitFor(() => {
        expect(defaultProps.onGoToTime).toHaveBeenCalledWith(3612);
      });
    });

    it('should handle single digit minutes', async () => {
      const user = userEvent.setup();
      render(<GoToTimeDialog {...defaultProps} maxFrame={5000} />);
      
      const input = screen.getByLabelText(/Enter timecode/i);
      await user.clear(input);
      await user.type(input, '1:00:00');
      
      const submitBtn = screen.getByRole('button', { name: /Go/i });
      await waitFor(() => {
        expect(submitBtn).not.toBeDisabled();
      });
      
      fireEvent.click(submitBtn);
      
      // 1 minute * 60 seconds * 24 fps = 1440 frames
      await waitFor(() => {
        expect(defaultProps.onGoToTime).toHaveBeenCalledWith(1440);
      });
    });

    it('should handle zero values', async () => {
      const user = userEvent.setup();
      render(<GoToTimeDialog {...defaultProps} />);
      
      const input = screen.getByLabelText(/Enter timecode/i);
      await user.clear(input);
      await user.type(input, '00:00:00');
      
      const submitBtn = screen.getByRole('button', { name: /Go/i });
      fireEvent.click(submitBtn);
      
      expect(defaultProps.onGoToTime).toHaveBeenCalledWith(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<GoToTimeDialog {...defaultProps} />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'goto-time-title');
    });

    it('should have proper label for input', () => {
      render(<GoToTimeDialog {...defaultProps} />);
      
      const input = screen.getByLabelText(/Enter timecode/i);
      expect(input).toHaveAttribute('aria-describedby', 'timecode-hint');
    });

    it('should mark input as invalid when there is an error', async () => {
      const user = userEvent.setup();
      render(<GoToTimeDialog {...defaultProps} />);
      
      const input = screen.getByLabelText(/Enter timecode/i);
      await user.clear(input);
      await user.type(input, 'invalid');
      
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('should have proper button labels', () => {
      render(<GoToTimeDialog {...defaultProps} />);
      
      expect(screen.getByLabelText('Close dialog')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Go/i })).toBeInTheDocument();
    });
  });

  describe('Cancel Button', () => {
    it('should call onClose when Cancel button is clicked', () => {
      render(<GoToTimeDialog {...defaultProps} />);
      
      const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelBtn);
      
      expect(defaultProps.onClose).toHaveBeenCalled();
      expect(defaultProps.onGoToTime).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large frame numbers', async () => {
      const user = userEvent.setup();
      render(<GoToTimeDialog {...defaultProps} maxFrame={200000} />);
      
      const input = screen.getByLabelText(/Enter timecode/i);
      await user.clear(input);
      await user.type(input, '99:59:23'); // Near maximum
      
      const submitBtn = screen.getByRole('button', { name: /Go/i });
      await waitFor(() => {
        expect(submitBtn).not.toBeDisabled();
      });
      
      fireEvent.click(submitBtn);
      
      await waitFor(() => {
        expect(defaultProps.onGoToTime).toHaveBeenCalled();
      });
    });

    it('should handle different fps values', async () => {
      const user = userEvent.setup();
      render(<GoToTimeDialog {...defaultProps} fps={30} maxFrame={5000} />);
      
      const input = screen.getByLabelText(/Enter timecode/i);
      await user.clear(input);
      await user.type(input, '01:00:00'); // 1 minute, 0 seconds, 0 frames = 60 seconds * 30 fps = 1800 frames
      
      const submitBtn = screen.getByRole('button', { name: /Go/i });
      await waitFor(() => {
        expect(submitBtn).not.toBeDisabled();
      });
      
      fireEvent.click(submitBtn);
      
      // 1 minute * 60 seconds * 30 fps = 1800 frames
      await waitFor(() => {
        expect(defaultProps.onGoToTime).toHaveBeenCalledWith(1800);
      });
    });

    it('should prevent frames >= fps', async () => {
      const user = userEvent.setup();
      render(<GoToTimeDialog {...defaultProps} fps={30} />);
      
      const input = screen.getByLabelText(/Enter timecode/i);
      await user.clear(input);
      await user.type(input, '00:00:30'); // 30 frames with fps=30 is invalid
      
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
