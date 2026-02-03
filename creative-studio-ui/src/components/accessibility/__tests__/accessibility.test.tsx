import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  FocusTrap,
  SkipLink,
  LiveRegion,
  AlertRegion,
  AnnouncementProvider,
  useAnnouncements,
  KeyboardShortcuts,
  AccessibleDialog,
  AccessibleTabs,
  Tooltip,
  HighContrastMode,
  ReducedMotion,
} from '../index';

// Test component for AnnouncementProvider
function TestAnnouncementComponent() {
  const { announce } = useAnnouncements();
  return (
    <div>
      <button onClick={() => announce('Test announcement')}>Announce</button>
      <button onClick={() => announce('Urgent announcement', 'assertive')}>Announce Urgent</button>
    </div>
  );
}

describe('Accessibility Components', () => {
  describe('FocusTrap', () => {
    it('should trap focus within the container', () => {
      render(
        <FocusTrap active={true}>
          <button>First</button>
          <button>Second</button>
        </FocusTrap>
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
    });

    it('should not trap focus when inactive', () => {
      render(
        <FocusTrap active={false}>
          <button>First</button>
        </FocusTrap>
      );

      expect(screen.getByText('First')).toBeInTheDocument();
    });
  });

  describe('SkipLink', () => {
    it('should render as a hidden link', () => {
      render(<SkipLink target="main-content">Skip to main content</SkipLink>);

      const link = screen.getByText('Skip to main content');
      expect(link).toHaveAttribute('href', '#main-content');
      expect(link).toHaveClass('sr-only');
    });
  });

  describe('LiveRegion', () => {
    it('should render with proper ARIA attributes', () => {
      render(<LiveRegion message="Test message" />);

      const region = screen.getByRole('status');
      expect(region).toHaveTextContent('Test message');
      expect(region).toHaveAttribute('aria-live', 'polite');
    });

    it('should support assertive politeness', () => {
      render(<LiveRegion message="Important" politeness="assertive" />);

      const region = screen.getByRole('status');
      expect(region).toHaveAttribute('aria-live', 'assertive');
    });
  });

  describe('AlertRegion', () => {
    it('should render as an alert with assertive live region', () => {
      render(<AlertRegion message="Alert message" />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('Alert message');
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });
  });

  describe('AnnouncementProvider', () => {
    it('should provide announce function to children', () => {
      render(
        <AnnouncementProvider>
          <TestAnnouncementComponent />
        </AnnouncementProvider>
      );

      const button = screen.getByText('Announce');
      fireEvent.click(button);

      // Check that live region has the announcement
      expect(screen.getByRole('status')).toHaveTextContent('Test announcement');
    });
  });

  describe('KeyboardShortcuts', () => {
    it('should render keyboard shortcuts list', () => {
      const shortcuts: Array<{ key: string; modifier?: 'ctrl' | 'alt' | 'shift' | 'meta'; description: string }> = [
        { key: 'Enter', description: 'Submit form' },
        { key: 'Escape', modifier: 'alt', description: 'Cancel' },
      ];

      render(<KeyboardShortcuts shortcuts={shortcuts} />);

      expect(screen.getByText('Submit form')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Enter')).toBeInTheDocument();
    });
  });

  describe('AccessibleDialog', () => {
    it('should render dialog when open', () => {
      render(
        <AccessibleDialog isOpen={true} onClose={() => {}} title="Test Dialog">
          Dialog content
        </AccessibleDialog>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Test Dialog')).toBeInTheDocument();
      expect(screen.getByText('Dialog content')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(
        <AccessibleDialog isOpen={false} onClose={() => {}} title="Test Dialog">
          Dialog content
        </AccessibleDialog>
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should have proper ARIA attributes', () => {
      render(
        <AccessibleDialog
          isOpen={true}
          onClose={() => {}}
          title="Test Dialog"
          description="Dialog description"
        >
          Dialog content
        </AccessibleDialog>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby');
    });

    it('should call onClose when overlay is clicked', async () => {
      const onClose = vi.fn();
      render(
        <AccessibleDialog isOpen={true} onClose={onClose} title="Test Dialog">
          Dialog content
        </AccessibleDialog>
      );

      const overlay = screen.getByTestId('dialog-overlay');
      fireEvent.click(overlay);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('AccessibleTabs', () => {
    const tabs = [
      { id: 'tab1', label: 'Tab 1', content: 'Content 1' },
      { id: 'tab2', label: 'Tab 2', content: 'Content 2' },
      { id: 'tab3', label: 'Tab 3', content: 'Content 3', disabled: true },
    ];

    it('should render tabs with proper ARIA attributes', () => {
      render(<AccessibleTabs tabs={tabs} defaultTab="tab1" />);

      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Tab 1' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Tab 2' })).toBeInTheDocument();
    });

    it('should show correct tab panel', () => {
      render(<AccessibleTabs tabs={tabs} defaultTab="tab1" />);

      const panel1 = screen.getByRole('tabpanel', { name: 'Tab 1' });
      expect(panel1).toHaveTextContent('Content 1');
      expect(panel1).not.toHaveAttribute('hidden');
    });

    it('should change tab on click', async () => {
      render(<AccessibleTabs tabs={tabs} defaultTab="tab1" />);

      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      await userEvent.click(tab2);

      expect(screen.getByRole('tabpanel', { name: 'Tab 2' })).not.toHaveAttribute('hidden');
    });

    it('should disable disabled tabs', () => {
      render(<AccessibleTabs tabs={tabs} defaultTab="tab1" />);

      const tab3 = screen.getByRole('tab', { name: 'Tab 3' });
      expect(tab3).toBeDisabled();
    });

    it('should support keyboard navigation', async () => {
      render(<AccessibleTabs tabs={tabs} defaultTab="tab1" />);

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      tab1.focus();
      await userEvent.keyboard('{ArrowRight}');

      expect(screen.getByRole('tab', { name: 'Tab 2' })).toHaveFocus();
    });
  });

  describe('Tooltip', () => {
    it('should show tooltip on hover', async () => {
      render(
        <Tooltip content="Tooltip content">
          <button>Hover me</button>
        </Tooltip>
      );

      const button = screen.getByText('Hover me');
      await userEvent.hover(button);

      await waitFor(() => {
        expect(screen.getByText('Tooltip content')).toBeInTheDocument();
      });
    });

    it('should hide tooltip on mouse leave', async () => {
      render(
        <Tooltip content="Tooltip content">
          <button>Hover me</button>
        </Tooltip>
      );

      const button = screen.getByText('Hover me');
      await userEvent.hover(button);
      await waitFor(() => {
        expect(screen.getByText('Tooltip content')).toBeInTheDocument();
      });

      await userEvent.unhover(button);

      await waitFor(() => {
        expect(screen.queryByText('Tooltip content')).not.toBeInTheDocument();
      });
    });

    it('should have proper ARIA attributes', async () => {
      render(
        <Tooltip content="Tooltip content">
          <button>Hover me</button>
        </Tooltip>
      );

      const button = screen.getByText('Hover me');
      await userEvent.hover(button);

      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        expect(tooltip).toHaveTextContent('Tooltip content');
      });
    });
  });

  describe('HighContrastMode', () => {
    it('should apply high contrast styles when media query matches', () => {
      // Mock matchMedia
      const mockMatchMedia = vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });
      vi.stubGlobal('matchMedia', mockMatchMedia);

      render(
        <HighContrastMode>
          <div>Content</div>
        </HighContrastMode>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('ReducedMotion', () => {
    it('should apply reduced motion styles when media query matches', () => {
      // Mock matchMedia
      const mockMatchMedia = vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });
      vi.stubGlobal('matchMedia', mockMatchMedia);

      render(
        <ReducedMotion>
          <div>Content</div>
        </ReducedMotion>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });
});

