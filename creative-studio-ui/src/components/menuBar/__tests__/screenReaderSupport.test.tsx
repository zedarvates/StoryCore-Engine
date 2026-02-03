/**
 * Screen Reader Support Tests
 * 
 * Tests for screen reader announcements and ARIA attributes.
 * Validates Requirements 10.3, 10.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { 
  ScreenReaderAnnouncer, 
  ScreenReaderAnnouncerProvider, 
  useScreenReaderAnnouncer 
} from '../ScreenReaderAnnouncer';
import { Menu } from '../Menu';
import { MenuItem } from '../MenuItem';
import { MenuDropdown } from '../MenuDropdown';
import React from 'react';

describe('ScreenReaderAnnouncer', () => {
  describe('Component Rendering', () => {
    it('should render aria-live regions', () => {
      render(<ScreenReaderAnnouncer />);
      
      const politeRegion = screen.getByTestId('screen-reader-announcer-polite');
      const assertiveRegion = screen.getByTestId('screen-reader-announcer-assertive');
      
      expect(politeRegion).toBeInTheDocument();
      expect(politeRegion).toHaveAttribute('role', 'status');
      expect(politeRegion).toHaveAttribute('aria-live', 'polite');
      expect(politeRegion).toHaveAttribute('aria-atomic', 'true');
      
      expect(assertiveRegion).toBeInTheDocument();
      expect(assertiveRegion).toHaveAttribute('role', 'alert');
      expect(assertiveRegion).toHaveAttribute('aria-live', 'assertive');
      expect(assertiveRegion).toHaveAttribute('aria-atomic', 'true');
    });

    it('should have sr-only class for visual hiding', () => {
      render(<ScreenReaderAnnouncer />);
      
      const politeRegion = screen.getByTestId('screen-reader-announcer-polite');
      const assertiveRegion = screen.getByTestId('screen-reader-announcer-assertive');
      
      expect(politeRegion).toHaveClass('sr-only');
      expect(assertiveRegion).toHaveClass('sr-only');
    });
  });

  describe('ScreenReaderAnnouncerProvider', () => {
    it('should provide announce function to children', () => {
      const TestComponent = () => {
        const { announce } = useScreenReaderAnnouncer();
        return (
          <button onClick={() => announce('Test message')}>
            Announce
          </button>
        );
      };

      render(
        <ScreenReaderAnnouncerProvider>
          <TestComponent />
        </ScreenReaderAnnouncerProvider>
      );

      expect(screen.getByRole('button', { name: 'Announce' })).toBeInTheDocument();
    });

    it('should announce polite messages', async () => {
      const TestComponent = () => {
        const { announce } = useScreenReaderAnnouncer();
        return (
          <button onClick={() => announce('Polite message', 'polite')}>
            Announce Polite
          </button>
        );
      };

      render(
        <ScreenReaderAnnouncerProvider>
          <TestComponent />
        </ScreenReaderAnnouncerProvider>
      );

      const button = screen.getByRole('button', { name: 'Announce Polite' });
      await userEvent.click(button);

      await waitFor(() => {
        const politeRegion = screen.getByTestId('screen-reader-announcer-polite');
        expect(politeRegion).toHaveTextContent('Polite message');
      });
    });

    it('should announce assertive messages', async () => {
      const TestComponent = () => {
        const { announce } = useScreenReaderAnnouncer();
        return (
          <button onClick={() => announce('Assertive message', 'assertive')}>
            Announce Assertive
          </button>
        );
      };

      render(
        <ScreenReaderAnnouncerProvider>
          <TestComponent />
        </ScreenReaderAnnouncerProvider>
      );

      const button = screen.getByRole('button', { name: 'Announce Assertive' });
      await userEvent.click(button);

      await waitFor(() => {
        const assertiveRegion = screen.getByTestId('screen-reader-announcer-assertive');
        expect(assertiveRegion).toHaveTextContent('Assertive message');
      });
    });

    it('should clear messages after timeout', async () => {
      const TestComponent = () => {
        const { announce } = useScreenReaderAnnouncer();
        return (
          <button onClick={() => announce('Temporary message', 'polite')}>
            Announce
          </button>
        );
      };

      render(
        <ScreenReaderAnnouncerProvider>
          <TestComponent />
        </ScreenReaderAnnouncerProvider>
      );

      const button = screen.getByRole('button', { name: 'Announce' });
      const user = userEvent.setup();
      await user.click(button);

      const politeRegion = screen.getByTestId('screen-reader-announcer-polite');
      expect(politeRegion).toHaveTextContent('Temporary message');

      // Wait for the clear timeout (1000ms)
      await waitFor(() => {
        expect(politeRegion).toHaveTextContent('');
      }, { timeout: 2000 });
    });

    it('should support delayed announcements', async () => {
      const TestComponent = () => {
        const { announce } = useScreenReaderAnnouncer();
        return (
          <button onClick={() => announce('Delayed message', 'polite', 500)}>
            Announce Delayed
          </button>
        );
      };

      render(
        <ScreenReaderAnnouncerProvider>
          <TestComponent />
        </ScreenReaderAnnouncerProvider>
      );

      const button = screen.getByRole('button', { name: 'Announce Delayed' });
      const user = userEvent.setup();
      await user.click(button);

      const politeRegion = screen.getByTestId('screen-reader-announcer-polite');
      
      // Should not be announced immediately
      expect(politeRegion).toHaveTextContent('');

      // Wait for the delay time
      await waitFor(() => {
        expect(politeRegion).toHaveTextContent('Delayed message');
      }, { timeout: 1000 });
    });

    it('should throw error when used outside provider', () => {
      const TestComponent = () => {
        useScreenReaderAnnouncer();
        return <div>Test</div>;
      };

      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useScreenReaderAnnouncer must be used within a ScreenReaderAnnouncerProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('MenuItem ARIA Attributes', () => {
    it('should have complete ARIA attributes for enabled item', () => {
      render(
        <MenuItem
          id="test-item"
          label="Test Item"
          enabled={true}
          shortcut="Ctrl+T"
        />
      );

      const menuItem = screen.getByRole('menuitem');
      
      expect(menuItem).toHaveAttribute('role', 'menuitem');
      expect(menuItem).toHaveAttribute('aria-label', 'Test Item, keyboard shortcut Ctrl+T');
      expect(menuItem).toHaveAttribute('aria-disabled', 'false');
      expect(menuItem).toHaveAttribute('tabIndex', '-1');
      expect(menuItem).not.toBeDisabled();
    });

    it('should have correct ARIA attributes for disabled item', () => {
      render(
        <MenuItem
          id="test-item"
          label="Test Item"
          enabled={false}
        />
      );

      const menuItem = screen.getByRole('menuitem');
      
      expect(menuItem).toHaveAttribute('aria-disabled', 'true');
      expect(menuItem).toHaveAttribute('aria-label', 'Test Item');
      expect(menuItem).toBeDisabled();
    });

    it('should have correct ARIA attributes for checked toggle item', () => {
      render(
        <MenuItem
          id="test-item"
          label="Toggle Item"
          checked={true}
        />
      );

      const menuItem = screen.getByRole('menuitem');
      
      expect(menuItem).toHaveAttribute('aria-checked', 'true');
      expect(menuItem).toHaveAttribute('aria-label', 'Toggle Item, checked');
    });

    it('should have correct ARIA attributes for unchecked toggle item', () => {
      render(
        <MenuItem
          id="test-item"
          label="Toggle Item"
          checked={false}
        />
      );

      const menuItem = screen.getByRole('menuitem');
      
      expect(menuItem).toHaveAttribute('aria-checked', 'false');
      expect(menuItem).toHaveAttribute('aria-label', 'Toggle Item, not checked');
    });

    it('should have correct ARIA attributes for item with submenu', () => {
      render(
        <MenuItem
          id="test-item"
          label="Submenu Item"
          hasSubmenu={true}
        />
      );

      const menuItem = screen.getByRole('menuitem');
      
      expect(menuItem).toHaveAttribute('aria-haspopup', 'true');
    });
  });

  describe('Menu ARIA Attributes', () => {
    it('should have correct ARIA attributes on trigger button', () => {
      render(
        <ScreenReaderAnnouncerProvider>
          <Menu
            id="test-menu"
            label="Test Menu"
            items={[
              { id: 'item1', label: 'Item 1', onClick: vi.fn() }
            ]}
          />
        </ScreenReaderAnnouncerProvider>
      );

      const trigger = screen.getByRole('button', { name: 'Test Menu' });
      
      expect(trigger).toHaveAttribute('aria-haspopup', 'true');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(trigger).toHaveAttribute('aria-controls', 'test-menu-menu');
      expect(trigger).toHaveAttribute('aria-label', 'Test Menu');
    });

    it('should update aria-expanded when menu opens', async () => {
      const user = userEvent.setup();
      
      render(
        <ScreenReaderAnnouncerProvider>
          <Menu
            id="test-menu"
            label="Test Menu"
            items={[
              { id: 'item1', label: 'Item 1', onClick: vi.fn() }
            ]}
          />
        </ScreenReaderAnnouncerProvider>
      );

      const trigger = screen.getByRole('button', { name: 'Test Menu' });
      expect(trigger).toHaveAttribute('aria-expanded', 'false');

      await user.click(trigger);

      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('MenuDropdown ARIA Attributes', () => {
    it('should have correct ARIA attributes on menu container', () => {
      render(
        <MenuDropdown
          items={[
            { id: 'item1', label: 'Item 1', onClick: vi.fn() },
            { id: 'item2', label: 'Item 2', onClick: vi.fn() }
          ]}
          isOpen={true}
          onClose={vi.fn()}
          ariaLabel="Test dropdown menu"
        />
      );

      const menu = screen.getByRole('menu');
      
      expect(menu).toHaveAttribute('role', 'menu');
      expect(menu).toHaveAttribute('aria-label', 'Test dropdown menu');
      expect(menu).toHaveAttribute('aria-orientation', 'vertical');
    });

    it('should not render when closed', () => {
      render(
        <MenuDropdown
          items={[
            { id: 'item1', label: 'Item 1', onClick: vi.fn() }
          ]}
          isOpen={false}
          onClose={vi.fn()}
        />
      );

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  describe('Integration: Menu with Screen Reader Announcements', () => {
    it('should announce when menu opens', async () => {
      const user = userEvent.setup();
      
      render(
        <ScreenReaderAnnouncerProvider>
          <Menu
            id="test-menu"
            label="File"
            items={[
              { id: 'new', label: 'New', onClick: vi.fn() }
            ]}
          />
        </ScreenReaderAnnouncerProvider>
      );

      const trigger = screen.getByRole('button', { name: 'File' });
      await user.click(trigger);

      await waitFor(() => {
        const politeRegion = screen.getByTestId('screen-reader-announcer-polite');
        expect(politeRegion).toHaveTextContent('File menu opened');
      });
    });

    it('should announce when menu closes', async () => {
      const user = userEvent.setup();
      
      render(
        <ScreenReaderAnnouncerProvider>
          <Menu
            id="test-menu"
            label="File"
            items={[
              { id: 'new', label: 'New', onClick: vi.fn() }
            ]}
          />
        </ScreenReaderAnnouncerProvider>
      );

      const trigger = screen.getByRole('button', { name: 'File' });
      
      // Open menu
      await user.click(trigger);
      
      // Close menu with Escape
      await user.keyboard('{Escape}');

      await waitFor(() => {
        const politeRegion = screen.getByTestId('screen-reader-announcer-polite');
        expect(politeRegion).toHaveTextContent('File menu closed');
      });
    });
  });
});

/**
 * Validates: Requirements 10.3, 10.6
 * 
 * These tests verify:
 * - ARIA live regions are properly configured
 * - Screen reader announcements work for menu state changes
 * - All ARIA attributes are present and correct on menu components
 * - Announcements use appropriate politeness levels
 * - Messages are cleared after timeout to allow re-announcement
 */
