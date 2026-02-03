/**
 * MenuBar Component
 * 
 * The main menu bar component that orchestrates all menu functionality.
 * Uses the existing I18nProvider context from the app.
 * 
 * Requirements: 1.1-15.6
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Menu } from './Menu';
import { menuBarConfig } from '../../config/menuBarConfig';
import { useI18n } from '../../utils/i18n';
import { getIconElement } from '../../utils/iconMapper';
import type { ViewState, UndoStack, ClipboardState } from '../../types/menuBarState';
import type { Project } from '../../types';
import type { MenuItemConfig } from '../../types/menuConfig';
import { evaluateEnabled, evaluateVisible, evaluateChecked } from '../../types/menuConfig';
import { projectExportService } from '../../services/projectExportService';

export interface MenuBarProps {
  /** Current project state */
  project: Project | null;
  /** Whether project has unsaved changes */
  hasUnsavedChanges: boolean;
  /** Callback when project changes */
  onProjectChange: (project: Project | null) => void;
  /** Callback when view state changes */
  onViewStateChange: (viewState: Partial<ViewState>) => void;
  /** Current view state */
  viewState: ViewState;
  /** Undo/redo stack */
  undoStack: UndoStack;
  /** Clipboard state */
  clipboard: ClipboardState;
  /** Whether a long-running operation is in progress */
  isProcessing?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * MenuBar Component
 * 
 * Renders the complete menu bar with all six menus and handles all menu interactions.
 * Uses the existing I18nProvider context from the app.
 */
export const MenuBar: React.FC<MenuBarProps> = (props) => {
  const { t } = useI18n();
  
  // Local state for menu open/close
  const [openMenuId, setOpenMenuId] = useState<string | null>(() => {
    try {
      // Try to load from localStorage
      const saved = localStorage.getItem('menuBar.lastOpenMenu');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  
  // Refs for menu trigger buttons to enable Alt key focus
  const menuTriggerRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map());

  // Callback refs for menu actions
  const actionCallbacksRef = useRef<Record<string, () => void>>({});

  /**
   * Handle Alt key to focus first menu
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Alt key (without other modifiers)
      if (event.key === 'Alt' && !event.ctrlKey && !event.shiftKey && !event.metaKey) {
        event.preventDefault();
        
        // Focus the first menu trigger button
        const firstMenuId = menuBarConfig[0]?.id;
        if (firstMenuId) {
          const firstMenuButton = menuTriggerRefs.current.get(firstMenuId);
          if (firstMenuButton) {
            firstMenuButton.focus();
          }
        }
      }
      
      // Handle horizontal arrow key navigation between menus when a menu trigger is focused
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const activeElement = document.activeElement as HTMLElement;
        
        // Check if a menu trigger button is focused
        const focusedMenuId = Array.from(menuTriggerRefs.current.entries()).find(
          ([_, ref]) => ref === activeElement
        )?.[0];
        
        if (focusedMenuId) {
          event.preventDefault();
          
          const currentIndex = menuBarConfig.findIndex(menu => menu.id === focusedMenuId);
          if (currentIndex === -1) return;
          
          let nextIndex: number;
          if (event.key === 'ArrowRight') {
            nextIndex = (currentIndex + 1) % menuBarConfig.length;
          } else {
            nextIndex = (currentIndex - 1 + menuBarConfig.length) % menuBarConfig.length;
          }
          
          const nextMenuId = menuBarConfig[nextIndex]?.id;
          if (nextMenuId) {
            const nextMenuButton = menuTriggerRefs.current.get(nextMenuId);
            if (nextMenuButton) {
              nextMenuButton.focus();
            }
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  /**
   * Get current application state
   */
  const getAppState = useCallback(() => {
    console.log('[MenuBar] getAppState called with isProcessing:', props.isProcessing);
    return {
      project: props.project,
      hasUnsavedChanges: props.hasUnsavedChanges,
      viewState: props.viewState,
      undoStack: props.undoStack,
      clipboard: props.clipboard,
      isProcessing: props.isProcessing ?? false, // Ensure boolean type
    };
  }, [props.project, props.hasUnsavedChanges, props.viewState, props.undoStack, props.clipboard, props.isProcessing]);

  /**
   * Handle menu open - closes other menus first for mutual exclusivity
   */
  const handleMenuOpen = useCallback((menuId: string) => {
    setOpenMenuId(menuId);
    try {
      localStorage.setItem('menuBar.lastOpenMenu', JSON.stringify(menuId));
    } catch (error) {
      console.warn('[MenuBar] Failed to persist menu state', error);
    }
  }, []);

  /**
   * Handle menu close
   */
  const handleMenuClose = useCallback(() => {
    setOpenMenuId(null);
    try {
      localStorage.setItem('menuBar.lastOpenMenu', JSON.stringify(null));
    } catch (error) {
      console.warn('[MenuBar] Failed to persist menu state', error);
    }
  }, []);

  /**
   * Handle menu item click
   */
  const handleMenuItemClick = useCallback((itemId: string) => {
    try {
      const callback = actionCallbacksRef.current[itemId];
      if (callback) {
        callback();
      }
    } catch (error) {
      console.error(`[MenuBar] Error executing menu action: ${itemId}`, error);
      // Dispatch error notification event
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      const event = new CustomEvent('showNotification', {
        detail: {
          type: 'error',
          message: `Action failed: ${errorMessage}`,
          duration: 5000
        }
      });
      window.dispatchEvent(event);
    } finally {
      setOpenMenuId(null);
    }
  }, []);

  /**
   * Determine if a menu should be disabled based on context
   */
  const isMenuDisabled = useCallback((menuId: string): boolean => {
    // Always disable non-help menus during processing
    if (props.isProcessing && menuId !== 'help') {
      return true;
    }
    
    // Disable menus that require a project when no project is open
    if (!props.project) {
      if (['project', 'tools'].includes(menuId)) {
        return true;
      }
    }
    
    // Disable Edit menu if nothing is selected
    if (menuId === 'edit' && !props.project) {
      return true;
    }
    
    return false;
  }, [props.isProcessing, props.project]);

  /**
   * Register menu trigger button ref
   */
  const registerMenuTriggerRef = useCallback((menuId: string, ref: HTMLButtonElement | null) => {
    if (ref) {
      menuTriggerRefs.current.set(menuId, ref);
    } else {
      menuTriggerRefs.current.delete(menuId);
    }
  }, []);

  /**
   * Convert menu config items to Menu component props
   */
  const convertMenuItems = useCallback((items: MenuItemConfig[]): any[] => {
    const state = getAppState();

    return items
      .filter((item) => evaluateVisible(item.visible, state))
      .map((item) => {
        const enabled = evaluateEnabled(item.enabled, state);
        const checked = evaluateChecked(item.checked, state);

        // Store action callback
        if (item.action && item.id) {
          // Create a wrapper that captures the current props
          actionCallbacksRef.current[item.id] = () => {
            if (item.id && item.action) {
              item.action({
                state: getAppState(),
                services: {
                  persistence: {}, // Placeholder for persistence service
                  export: projectExportService,
                  recentProjects: {}, // Placeholder for recent projects service
                  // Notification service
                  notification: {
                    show: (notification: { type: 'success' | 'error' | 'warning' | 'info'; message: string; duration?: number }) => {
                      // Use toast notification from the app
                      console.log(`[Notification] ${notification.type}: ${notification.message}`);
                      return `notification-${Date.now()}`;
                    },
                    dismiss: (id: string) => {
                      console.log(`[Notification] Dismissed: ${id}`);
                    },
                  },
                  // Modal service
                  modal: {
                    openModal: async (modalId: string) => {
                      console.log(`[Modal] Opening modal: ${modalId}`);
                      // Dispatch event or use context to open modal
                      const event = new CustomEvent('openModal', { detail: { modalId } });
                      window.dispatchEvent(event);
                    },
                    closeModal: async (modalId: string) => {
                      console.log(`[Modal] Closing modal: ${modalId}`);
                      const event = new CustomEvent('closeModal', { detail: { modalId } });
                      window.dispatchEvent(event);
                    },
                  },
                },
                onViewStateChange: props.onViewStateChange,
              });
            }
          };
        }

        return {
          id: item.id,
          label: t(item.label),
          type: item.type,
          enabled,
          checked,
          shortcut: item.shortcut ? `${item.shortcut.ctrl ? 'Ctrl+' : ''}${item.shortcut.key}` : undefined,
          icon: getIconElement(item.icon),
          onClick: () => handleMenuItemClick(item.id),
          submenu: item.submenu ? convertMenuItems(item.submenu) : undefined,
        };
      });
  }, [getAppState, handleMenuItemClick, props.onViewStateChange, t, getIconElement]);

  return (
    <nav
      className={`
        flex items-center gap-1 px-2 py-1
        bg-card
        border-b border-border
        shadow-sm
        ${props.className || ''}
      `}
      aria-label="Main menu"
    >
      {menuBarConfig.map((menu) => (
        <Menu
          key={menu.id}
          id={menu.id}
          label={t(menu.label)}
          items={convertMenuItems(menu.items)}
          disabled={isMenuDisabled(menu.id)}
          isOpen={openMenuId === menu.id}
          onOpen={() => handleMenuOpen(menu.id)}
          onClose={handleMenuClose}
          onItemClick={handleMenuItemClick}
          onRegisterTriggerRef={(ref) => registerMenuTriggerRef(menu.id, ref)}
        />
      ))}
    </nav>
  );
};

export default MenuBar;

