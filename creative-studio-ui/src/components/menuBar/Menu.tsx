/**
 * Menu Component
 * 
 * A menu trigger button with an associated dropdown menu.
 * Handles:
 * - Menu open/close state
 * - Click and hover interactions
 * - Keyboard activation (Enter, Space, Arrow keys)
 * - Focus management
 * - ARIA attributes for accessibility
 * 
 * @module components/menuBar/Menu
 */

import React, { useState, useRef, useEffect } from 'react';
import { MenuDropdown } from './MenuDropdown';
import { MenuItemProps } from './MenuItem';
import { useScreenReaderAnnouncer } from './ScreenReaderAnnouncer';

export interface MenuProps {
  /** Unique identifier for the menu */
  id: string;
  
  /** Display label for the menu trigger button */
  label: string;
  
  /** Array of menu items */
  items: Omit<MenuItemProps, 'focused' | 'tabIndex' | 'onFocus' | 'onMouseEnter'>[];
  
  /** Whether the menu is disabled */
  disabled?: boolean;
  
  /** Whether the menu is open (controlled by parent for mutual exclusivity) */
  isOpen?: boolean;
  
  /** Callback when menu opens */
  onOpen?: () => void;
  
  /** Callback when menu closes */
  onClose?: () => void;
  
  /** Callback when an item is clicked */
  onItemClick?: (itemId: string) => void;
  
  /** Callback to register the trigger button ref for keyboard focus management */
  onRegisterTriggerRef?: (ref: HTMLButtonElement | null) => void;
  
  /** Additional CSS classes for the trigger button */
  className?: string;
  
  /** Position of the dropdown */
  position?: 'left' | 'right';
}

/**
 * Menu Component
 * 
 * Renders a menu trigger button with an associated dropdown menu.
 * 
 * @example
 * ```tsx
 * <Menu
 *   id="file-menu"
 *   label="File"
 *   items={[
 *     { id: 'new', label: 'New Project', shortcut: 'Ctrl+N', onClick: handleNew },
 *     { id: 'open', label: 'Open Project', shortcut: 'Ctrl+O', onClick: handleOpen },
 *     { id: 'save', label: 'Save', shortcut: 'Ctrl+S', onClick: handleSave }
 *   ]}
 * />
 * ```
 */
export const Menu: React.FC<MenuProps> = ({
  id,
  label,
  items,
  disabled = false,
  isOpen: controlledIsOpen,
  onOpen,
  onClose,
  onItemClick,
  onRegisterTriggerRef,
  className = '',
  position = 'left',
}) => {
  // Menu open state - use controlled mode if isOpen prop provided, otherwise use internal state
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = controlledIsOpen !== undefined 
    ? (open: boolean) => { if (open && onOpen) onOpen(); if (!open && onClose) onClose(); }
    : setInternalIsOpen;
  
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);
  
  // Get screen reader announcer (optional - only if provider is available)
  let announcer: ReturnType<typeof useScreenReaderAnnouncer> | null = null;
  try {
    announcer = useScreenReaderAnnouncer();
  } catch {
    // Provider not available, announcements will be skipped
  }

  /**
   * Register trigger ref with parent MenuBar for Alt key focus management
   * Requirements: 10.1
   */
  useEffect(() => {
    if (onRegisterTriggerRef && triggerRef.current) {
      onRegisterTriggerRef(triggerRef.current);
    }
    
    return () => {
      if (onRegisterTriggerRef) {
        onRegisterTriggerRef(null);
      }
    };
  }, [onRegisterTriggerRef]);

  /**
   * Open the menu
   */
  const openMenu = () => {
    if (disabled) return;
    setIsOpen(true);
    if (onOpen) {
      onOpen();
    }
    
    // Announce menu opened to screen readers
    // Requirements: 10.3
    if (announcer) {
      announcer.announce(`${label} menu opened`, 'polite', 100);
    }
  };

  /**
   * Close the menu
   */
  const closeMenu = () => {
    setIsOpen(false);
    if (onClose) {
      onClose();
    }
    // Return focus to trigger button
    triggerRef.current?.focus();
    
    // Announce menu closed to screen readers
    // Requirements: 10.3
    if (announcer) {
      announcer.announce(`${label} menu closed`, 'polite');
    }
  };

  /**
   * Toggle menu open/close
   */
  const toggleMenu = () => {
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  /**
   * Handle trigger button click
   */
  const handleClick = () => {
    toggleMenu();
  };

  /**
   * Handle trigger button keyboard events
   */
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        toggleMenu();
        break;

      case 'ArrowDown':
        event.preventDefault();
        openMenu();
        break;

      case 'ArrowUp':
        event.preventDefault();
        openMenu();
        break;

      case 'Escape':
        if (isOpen) {
          event.preventDefault();
          closeMenu();
        }
        break;
    }
  };

  /**
   * Handle item click from dropdown
   */
  const handleItemClick = (itemId: string) => {
    if (onItemClick) {
      onItemClick(itemId);
    }
    closeMenu();
  };

  /**
   * Close menu when clicking outside
   */
  useEffect(() => {
    if (!isOpen) return;

    // Use ref to track whether menu should be open (prevents race conditions)
    const menuContainer = menuContainerRef.current;
    let isMenuOpen = true;

    const handleClickOutside = (event: MouseEvent) => {
      if (!isMenuOpen || !menuContainer) return;
      
      if (!menuContainer.contains(event.target as Node)) {
        // Use setTimeout to allow event propagation before closing
        setTimeout(() => {
          if (isMenuOpen && menuContainerRef.current) {
            closeMenu();
          }
        }, 0);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    // Cleanup function
    return () => {
      isMenuOpen = false;
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, closeMenu]);

  return (
    <div ref={menuContainerRef} className="relative" role="none">
      {/* Menu Trigger Button */}
      <button
        ref={triggerRef}
        id={`${id}-trigger`}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={`${id}-menu`}
        aria-label={label}
        disabled={disabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`
          px-3 py-1.5 text-sm font-medium
          rounded-md
          transition-all duration-150 ease-in-out
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
          ${
            disabled
              ? 'text-gray-500 dark:text-gray-400 cursor-not-allowed'
              : isOpen
              ? 'bg-accent text-accent-foreground'
              : 'text-foreground hover:bg-accent hover:text-accent-foreground'
          }
          ${className}
        `}
      >
        {label}
      </button>

      {/* Menu Dropdown */}
      <MenuDropdown
        items={items}
        isOpen={isOpen}
        onClose={closeMenu}
        onItemClick={handleItemClick}
        ariaLabel={`${label} menu`}
        position={position}
      />
    </div>
  );
};

export default Menu;
