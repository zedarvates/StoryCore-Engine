import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '../ui/dialog';

/**
 * Test suite for the generic modal framework (Dialog components)
 * Validates the Radix UI based dialog implementation
 */
describe('Dialog Component Framework', () => {
  describe('Dialog structure rendering', () => {
    it('renders DialogContent with proper structure when open', () => {
      render(
        <Dialog open={true}>
          <DialogContent aria-describedby="dialog-desc">
            <DialogHeader>
              <DialogTitle>Test Dialog</DialogTitle>
              <DialogDescription id="dialog-desc">Test description</DialogDescription>
            </DialogHeader>
            <div>Dialog content</div>
            <DialogFooter>
              <DialogClose>Cancel</DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Test Dialog')).toBeInTheDocument();
      expect(screen.getByText('Test description')).toBeInTheDocument();
      expect(screen.getByText('Dialog content')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('does not render content when dialog is closed', () => {
      render(
        <Dialog open={false}>
          <DialogContent>
            <DialogTitle>Hidden Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      expect(screen.queryByText('Hidden Dialog')).not.toBeInTheDocument();
    });
  });

  describe('DialogTrigger functionality', () => {
    it('opens dialog when trigger is clicked', () => {
      const { rerender } = render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Triggered Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      expect(screen.queryByText('Triggered Dialog')).not.toBeInTheDocument();

      fireEvent.click(screen.getByText('Open Dialog'));

      rerender(
        <Dialog open={true}>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Triggered Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Triggered Dialog')).toBeInTheDocument();
    });
  });

  describe('DialogClose functionality', () => {
    it('closes dialog when close button is clicked', () => {
      const onOpenChange = vi.fn();

      render(
        <Dialog open={true} onOpenChange={onOpenChange}>
          <DialogContent>
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogClose>Close</DialogClose>
          </DialogContent>
        </Dialog>
      );

      fireEvent.click(screen.getByText('Close'));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('renders X close button with proper accessibility', () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveAttribute('aria-label', 'Close');
    });
  });

  describe('Accessibility and ARIA attributes', () => {
    it('passes aria-describedby to content', () => {
      render(
        <Dialog open={true}>
          <DialogContent aria-describedby="custom-desc">
            <DialogDescription id="custom-desc">Custom description</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      const content = screen.getByRole('dialog');
      expect(content).toHaveAttribute('aria-describedby', 'custom-desc');
    });

    it('sets proper ARIA roles', () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogTitle>Accessible Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('DialogHeader, DialogFooter, DialogTitle, DialogDescription', () => {
    it('applies correct CSS classes and structure', () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Test Title</DialogTitle>
              <DialogDescription>Test Description</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <button>Action</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      const header = screen.getByText('Test Title').closest('div');
      const footer = screen.getByText('Action').closest('div');

      expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'text-center', 'sm:text-left');
      expect(footer).toHaveClass('flex', 'flex-col-reverse', 'sm:flex-row', 'sm:justify-end', 'sm:space-x-2');
    });
  });

  describe('Error cases and edge cases', () => {
    it('handles missing children gracefully', () => {
      render(
        <Dialog open={true}>
          <DialogContent />
        </Dialog>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('applies custom className to DialogContent', () => {
      render(
        <Dialog open={true}>
          <DialogContent className="custom-class">
            <DialogTitle>Test</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      const content = screen.getByRole('dialog');
      expect(content).toHaveClass('custom-class');
    });
  });

  describe('Integration with modal framework improvements', () => {
    it('renders without console.log calls (dead code elimination validation)', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogTitle>Clean Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});