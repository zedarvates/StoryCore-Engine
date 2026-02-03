/**
 * Keyboard Focus Management Tests
 * 
 * Tests for keyboard focus management in the MenuBar component:
 * - Alt key to focus first menu
 * - Roving tabindex for menu items
 * - Focus trap in open menus
 * - Focus restoration on menu close
 * 
 * Requirements: 10.1-10.5
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MenuBar } from '../MenuBar';
import { I18nProvider } from '../../../utils/i18n';
import type { ViewState, UndoStack, ClipboardState } from '../../../types/menuBarState';

// Mock services
vi.mock('../../../services/persistence/projectPersistence', () => ({
  projectPersistence: {
    saveProject: vi.fn(),
    loadProject: vi.fn(),
  },
}));

vi.mock('../../../services/recentProjects', () => ({
  recentProjectsService: {
    addProject: vi.fn(),
    getRecentProjects: vi.fn(() => []),
    removeProject: vi.fn(),
  },
}));

describe('MenuBar Keyboard Focus Management', () => {
  const mockViewState: ViewState = {
    timelineVisible: true,
    gridVisible: false,
    zoomLevel: 100,
    minZoom: 25,
    maxZoom: 400,
    zoomStep: 25,
    panelsVisible: {
      properties: true,
      assets: true,
      preview: true,
    },
    fullScreen: false,
  };

  const mockUndoStack: UndoStack = {
    canUndo: false,
    canRedo: false,
    undo: vi.fn(),
    redo: vi.fn(),
  };

  const mockClipboard: ClipboardState = {
    hasContent: false,
    contentType: null,
    cut: vi.fn(),
    copy: vi.fn(),
    paste: vi.fn(),
  };

  const defaultProps = {
    project: null,
    hasUnsavedChanges: false,
    onProjectChange: vi.fn(),
    onViewStateChange: vi.fn(),
    viewState: mockViewState,
    undoStack: mockUndoStack,
    clipboard: mockClipboard,
  };

  const renderMenuBar = (props = {}) => {
    return render(
      <I18nProvider>
        <MenuBar {...defaultProps} {...props} />
      </I18nProvider>
    );
  };

  describe('Alt Key Focus Management', () => {
    it('should focus first menu when Alt key is pressed', async () => {
      renderMenuBar();

      // Press Alt key
      fireEvent.keyDown(document, { key: 'Alt' });

      // First menu (File) should be focused
      await waitFor(() => {
        const fileMenu = screen.getByRole('button', { name: /file/i });
        expect(fileMenu).toHaveFocus();
      });
    });

    it('should not focus menu when Alt is pressed with other modifiers', async () => {
      renderMenuBar();

      const fileMenu = screen.getByRole('button', { name: /file/i });

      // Press Alt+Ctrl
      fireEvent.keyDown(document, { key: 'Alt', ctrlKey: true });
      expect(fileMenu).not.toHaveFocus();

      // Press Alt+Shift
      fireEvent.keyDown(document, { key: 'Alt', shiftKey: true });
      expect(fileMenu).not.toHaveFocus();

      // Press Alt+Meta
      fireEvent.keyDown(document, { key: 'Alt', metaKey: true });
      expect(fileMenu).not.toHaveFocus();
    });
  });

  describe('Horizontal Arrow Key Navigation', () => {
    it('should navigate to next menu with ArrowRight', async () => {
      renderMenuBar();

      // Focus first menu
      const fileMenu = screen.getByRole('button', { name: /file/i });
      fileMenu.focus();
      expect(fileMenu).toHaveFocus();

      // Press ArrowRight
      fireEvent.keyDown(document, { key: 'ArrowRight' });

      // Edit menu should be focused
      await waitFor(() => {
        const editMenu = screen.getByRole('button', { name: /edit/i });
        expect(editMenu).toHaveFocus();
      });
    });

    it('should navigate to previous menu with ArrowLeft', async () => {
      renderMenuBar();

      // Focus Edit menu
      const editMenu = screen.getByRole('button', { name: /edit/i });
      editMenu.focus();
      expect(editMenu).toHaveFocus();

      // Press ArrowLeft
      fireEvent.keyDown(document, { key: 'ArrowLeft' });

      // File menu should be focused
      await waitFor(() => {
        const fileMenu = screen.getByRole('button', { name: /file/i });
        expect(fileMenu).toHaveFocus();
      });
    });

    it('should wrap around to last menu when pressing ArrowLeft on first menu', async () => {
      renderMenuBar();

      // Focus first menu
      const fileMenu = screen.getByRole('button', { name: /file/i });
      fileMenu.focus();

      // Press ArrowLeft
      fireEvent.keyDown(document, { key: 'ArrowLeft' });

      // Help menu (last) should be focused
      await waitFor(() => {
        const helpMenu = screen.getByRole('button', { name: /help/i });
        expect(helpMenu).toHaveFocus();
      });
    });

    it('should wrap around to first menu when pressing ArrowRight on last menu', async () => {
      renderMenuBar();

      // Focus last menu (Help)
      const helpMenu = screen.getByRole('button', { name: /help/i });
      helpMenu.focus();

      // Press ArrowRight
      fireEvent.keyDown(document, { key: 'ArrowRight' });

      // File menu (first) should be focused
      await waitFor(() => {
        const fileMenu = screen.getByRole('button', { name: /file/i });
        expect(fileMenu).toHaveFocus();
      });
    });
  });

  describe('Roving Tabindex in Menu Items', () => {
    it('should have only one menu item with tabIndex 0 at a time', async () => {
      const user = userEvent.setup();
      renderMenuBar();

      // Open File menu
      const fileMenu = screen.getByRole('button', { name: /file/i });
      await user.click(fileMenu);

      // Wait for menu to open
      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      // Get all menu items
      const menuItems = screen.getAllByRole('menuitem');

      // Count items with tabIndex 0
      const focusableItems = menuItems.filter(
        (item) => item.getAttribute('tabIndex') === '0'
      );

      // Should have exactly one item with tabIndex 0
      expect(focusableItems).toHaveLength(1);
    });

    it('should move tabIndex 0 when navigating with arrow keys', async () => {
      const user = userEvent.setup();
      renderMenuBar();

      // Open File menu
      const fileMenu = screen.getByRole('button', { name: /file/i });
      await user.click(fileMenu);

      // Wait for menu to open
      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      // Get first menu item
      const menuItems = screen.getAllByRole('menuitem');
      const firstItem = menuItems[0];

      // First item should have tabIndex 0
      expect(firstItem).toHaveAttribute('tabIndex', '0');

      // Press ArrowDown
      fireEvent.keyDown(document, { key: 'ArrowDown' });

      // Wait for focus to move
      await waitFor(() => {
        // First item should now have tabIndex -1
        expect(firstItem).toHaveAttribute('tabIndex', '-1');
        
        // Second item should have tabIndex 0
        const secondItem = menuItems[1];
        expect(secondItem).toHaveAttribute('tabIndex', '0');
      });
    });
  });

  describe('Focus Trap in Open Menus', () => {
    it('should keep focus within menu when navigating with arrow keys', async () => {
      const user = userEvent.setup();
      renderMenuBar();

      // Open File menu
      const fileMenu = screen.getByRole('button', { name: /file/i });
      await user.click(fileMenu);

      // Wait for menu to open
      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      // Navigate down multiple times
      for (let i = 0; i < 10; i++) {
        fireEvent.keyDown(document, { key: 'ArrowDown' });
      }

      // Focus should still be within the menu
      const activeElement = document.activeElement;
      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems).toContainEqual(activeElement);
    });

    it('should close menu and return focus when Tab is pressed', async () => {
      const user = userEvent.setup();
      renderMenuBar();

      // Open File menu
      const fileMenu = screen.getByRole('button', { name: /file/i });
      await user.click(fileMenu);

      // Wait for menu to open
      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      // Press Tab
      fireEvent.keyDown(document, { key: 'Tab' });

      // Menu should close
      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });

      // Focus should return to trigger button
      expect(fileMenu).toHaveFocus();
    });

    it('should close menu and return focus when Escape is pressed', async () => {
      const user = userEvent.setup();
      renderMenuBar();

      // Open File menu
      const fileMenu = screen.getByRole('button', { name: /file/i });
      await user.click(fileMenu);

      // Wait for menu to open
      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      // Press Escape
      fireEvent.keyDown(document, { key: 'Escape' });

      // Menu should close
      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });

      // Focus should return to trigger button
      expect(fileMenu).toHaveFocus();
    });
  });

  describe('Focus Restoration on Menu Close', () => {
    it('should restore focus to trigger button when menu closes', async () => {
      const user = userEvent.setup();
      renderMenuBar();

      // Open File menu
      const fileMenu = screen.getByRole('button', { name: /file/i });
      await user.click(fileMenu);

      // Wait for menu to open
      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      // Wait a bit for the click outside handler to be registered
      await new Promise(resolve => setTimeout(resolve, 150));

      // Click outside to close menu
      fireEvent.mouseDown(document.body);

      // Menu should close
      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      }, { timeout: 2000 });

      // Focus should return to trigger button
      expect(fileMenu).toHaveFocus();
    });

    it('should restore focus after selecting a menu item', async () => {
      const user = userEvent.setup();
      renderMenuBar();

      // Open File menu
      const fileMenu = screen.getByRole('button', { name: /file/i });
      await user.click(fileMenu);

      // Wait for menu to open
      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      // Click a menu item
      const newProjectItem = screen.getByRole('menuitem', { name: /new project/i });
      await user.click(newProjectItem);

      // Menu should close
      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });

      // Focus should return to trigger button
      expect(fileMenu).toHaveFocus();
    });
  });

  describe('Complete Keyboard Navigation Flow', () => {
    it('should support complete keyboard-only workflow', async () => {
      renderMenuBar();

      // 1. Press Alt to focus first menu
      fireEvent.keyDown(document, { key: 'Alt' });

      await waitFor(() => {
        const fileMenu = screen.getByRole('button', { name: /file/i });
        expect(fileMenu).toHaveFocus();
      });

      // 2. Press ArrowRight to navigate to Edit menu
      fireEvent.keyDown(document, { key: 'ArrowRight' });

      await waitFor(() => {
        const editMenu = screen.getByRole('button', { name: /edit/i });
        expect(editMenu).toHaveFocus();
      });

      // 3. Press Enter to open Edit menu
      const editMenu = screen.getByRole('button', { name: /edit/i });
      fireEvent.keyDown(editMenu, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      // 4. Press ArrowDown to navigate menu items
      fireEvent.keyDown(document, { key: 'ArrowDown' });

      // 5. Press Escape to close menu
      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });

      // 6. Focus should be back on Edit menu trigger
      expect(editMenu).toHaveFocus();
    });
  });
});
