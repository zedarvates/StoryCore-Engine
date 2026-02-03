/**
 * MenuDropdown Component
 * 
 * A dropdown menu that displays menu items with full keyboard navigation support.
 * Implements the WAI-ARIA menu pattern with:
 * - Arrow key navigation (up/down)
 * - Enter key activation
 * - Escape key to close
 * - Home/End key navigation
 * - Roving tabindex for focus management
 * - Submenu support
 * 
 * @module components/menuBar/MenuDropdown
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MenuItem, MenuItemProps } from './MenuItem';
import { useScreenReaderAnnouncer } from './ScreenReaderAnnouncer';
import {
  getNextEnabledItemIndex,
  getFirstEnabledItemIndex,
  getLastEnabledItemIndex,
  findMenuItemByFirstLetter,
} from '../../utils/menuNavigation';

export interface MenuDropdownProps {
  /** Array of menu items to display */
  items: (Omit<MenuItemProps, 'focused' | 'tabIndex' | 'onFocus' | 'onMouseEnter'> | { id: string; separator: true })[];
  
  /** Whether the dropdown is open */
  isOpen: boolean;
  
  /** Callback when the dropdown should close */
  onClose: () => void;
  
  /** Callback when an item is clicked */
  onItemClick?: (itemId: string) => void;
  
  /** ARIA label for the menu */
  ariaLabel?: string;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Position of the dropdown relative to trigger */
  position?: 'left' | 'right';
}

/**
 * MenuDropdown Component
 * 
 * Renders a dropdown menu with keyboard navigation and accessibility support.
 * 
 * @example
 * ```tsx
 * <MenuDropdown
 *   items={[
 *     { id: 'new', label: 'New Project', shortcut: 'Ctrl+N', onClick: handleNew },
 *     { id: 'open', label: 'Open Project', shortcut: 'Ctrl+O', onClick: handleOpen },
 *     { id: 'save', label: 'Save', shortcut: 'Ctrl+S', enabled: hasProject, onClick: handleSave }
 *   ]}
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   ariaLabel="File menu"
 * />
 * ```
 */
export const MenuDropdown: React.FC<MenuDropdownProps> = ({
  items,
  isOpen,
  onClose,
  onItemClick,
  ariaLabel,
  className = '',
  position = 'left',
}) => {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  
  // Get screen reader announcer (optional - only if provider is available)
  let announcer: ReturnType<typeof useScreenReaderAnnouncer> | null = null;
  try {
    announcer = useScreenReaderAnnouncer();
  } catch {
    // Provider not available, announcements will be skipped
  }

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setFocusedIndex((prev) => getNextEnabledItemIndex(items, prev, 'next'));
          break;

        case 'ArrowUp':
          event.preventDefault();
          setFocusedIndex((prev) => getNextEnabledItemIndex(items, prev, 'previous'));
          break;

        case 'Home':
          event.preventDefault();
          setFocusedIndex(getFirstEnabledItemIndex(items));
          break;

        case 'End':
          event.preventDefault();
          setFocusedIndex(getLastEnabledItemIndex(items));
          break;

        case 'Escape':
          event.preventDefault();
          onClose();
          break;

        case 'Tab':
          // Close menu on Tab to allow normal tab navigation
          event.preventDefault();
          onClose();
          break;

        default:
          // Support letter key navigation
          if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            event.preventDefault();
            const letter = event.key.toLowerCase();
            const nextIndex = findMenuItemByFirstLetter(items, letter, focusedIndex + 1);
            
            if (nextIndex !== -1) {
              setFocusedIndex(nextIndex);
            }
          }
          break;
      }
    },
    [isOpen, onClose, items, focusedIndex]
  );

  /**
   * Focus the current item when focusedIndex changes
   */
  useEffect(() => {
    if (isOpen && itemRefs.current[focusedIndex]) {
      itemRefs.current[focusedIndex]?.focus();
      
      // Announce focused item to screen readers
      // Requirements: 10.3
      const focusedItem = items[focusedIndex];
      if (focusedItem && announcer && !('separator' in focusedItem)) {
        const item = focusedItem as Omit<MenuItemProps, 'focused' | 'tabIndex' | 'onFocus' | 'onMouseEnter'>;
        const enabledState = item.enabled === false ? 'disabled' : 'enabled';
        const checkedState = item.checked !== undefined 
          ? item.checked ? 'checked' : 'not checked'
          : '';
        const shortcutText = item.shortcut ? `, keyboard shortcut ${item.shortcut}` : '';
        
        announcer.announce(
          `${item.label}${checkedState ? `, ${checkedState}` : ''}${shortcutText}, ${enabledState}`,
          'polite'
        );
      }
    }
  }, [focusedIndex, isOpen, items, announcer]);

  /**
   * Set up keyboard event listeners
   */
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, handleKeyDown]);

  /**
   * Focus first enabled item when menu opens
   */
  useEffect(() => {
    if (isOpen) {
      const firstEnabled = getFirstEnabledItemIndex(items);
      setFocusedIndex(firstEnabled);
    }
  }, [isOpen, items]);

  /**
   * Handle click outside to close menu
   */
  useEffect(() => {
    if (!isOpen) return;

    // Use ref to track whether menu should be open (prevents race conditions)
    const menuContainer = menuRef.current;
    let isMenuOpen = true;

    const handleClickOutside = (event: MouseEvent) => {
      if (!isMenuOpen || !menuContainer) return;
      
      if (!menuContainer.contains(event.target as Node)) {
        // Use setTimeout to allow event propagation before closing
        setTimeout(() => {
          if (isMenuOpen && menuRef.current) {
            onClose();
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
  }, [isOpen, onClose]);

  /**
   * Handle item click
   */
  const handleItemClick = (item: typeof items[0], index: number) => {
    // Skip if it's a separator
    if ('separator' in item) return;
    
    const menuItem = item as Omit<MenuItemProps, 'focused' | 'tabIndex' | 'onFocus' | 'onMouseEnter'>;
    
    if (menuItem.enabled === false) return;

    // Call the item's onClick handler
    if (menuItem.onClick) {
      menuItem.onClick();
    }

    // Call the dropdown's onItemClick handler
    if (onItemClick) {
      onItemClick(menuItem.id);
    }

    // Close the menu after clicking (unless it has a submenu)
    if (!menuItem.hasSubmenu) {
      onClose();
    }
  };

  /**
   * Handle mouse enter on item
   */
  const handleItemMouseEnter = (index: number) => {
    setFocusedIndex(index);
  };

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={ariaLabel}
      aria-orientation="vertical"
      className={`
        absolute mt-1 min-w-max
        bg-popover text-popover-foreground
        border border-border
        rounded-md shadow-lg
        py-1
        z-50
        transition-all duration-150 ease-in-out
        origin-top
        ${position === 'left' ? 'left-0' : 'right-0'}
        ${isOpen ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95'}
        ${className}
      `}
    >
      {items.length > 0 ? (
        items.map((item, index) => {
          // Handle separator items
          if ('separator' in item && item.separator) {
            return (
              <div
                key={item.id}
                className="my-1 px-2"
                role="separator"
                aria-orientation="horizontal"
              >
                <div className="h-px bg-border/50" />
              </div>
            );
          }

          // Handle regular menu items
          return (
            <MenuItem
              key={item.id}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              {...(item as Omit<MenuItemProps, 'focused' | 'tabIndex' | 'onFocus' | 'onMouseEnter'>)}
              focused={focusedIndex === index}
              tabIndex={focusedIndex === index ? 0 : -1}
              onClick={() => handleItemClick(item as Omit<MenuItemProps, 'focused' | 'tabIndex' | 'onFocus' | 'onMouseEnter'>, index)}
              onFocus={() => setFocusedIndex(index)}
              onMouseEnter={() => handleItemMouseEnter(index)}
            />
          );
        })
      ) : (
        <div className="px-3 py-2 text-sm text-gray-500">
          Aucun élément disponible
        </div>
      )}
    </div>
  );
};

export default MenuDropdown;
