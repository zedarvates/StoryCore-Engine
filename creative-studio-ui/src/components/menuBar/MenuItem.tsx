/**
 * MenuItem Component
 * 
 * A single menu item within a dropdown menu that supports:
 * - Labels with optional icons
 * - Keyboard shortcuts display
 * - Enabled/disabled states
 * - Checked states for toggles
 * - Submenu indicators
 * - Full ARIA accessibility attributes
 * 
 * @module components/menuBar/MenuItem
 */

import React from 'react';
import { Check, ChevronRight } from 'lucide-react';

export interface MenuItemProps {
  /** Unique identifier for the menu item */
  id: string;
  
  /** Display label for the menu item */
  label: string;
  
  /** Whether the menu item is enabled (default: true) */
  enabled?: boolean;
  
  /** Whether the menu item is checked (for toggle items) */
  checked?: boolean;
  
  /** Keyboard shortcut display text (e.g., "Ctrl+S" or "⌘S") */
  shortcut?: string;
  
  /** Icon component to display before the label */
  icon?: React.ReactNode;
  
  /** Whether this item has a submenu */
  hasSubmenu?: boolean;
  
  /** Whether this item is currently focused */
  focused?: boolean;
  
  /** Click handler for the menu item */
  onClick?: () => void;
  
  /** Focus handler for keyboard navigation */
  onFocus?: () => void;
  
  /** Mouse enter handler for hover states */
  onMouseEnter?: () => void;
  
  /** Tab index for keyboard navigation (-1 for roving tabindex) */
  tabIndex?: number;
  
  /** Additional CSS classes */
  className?: string;
}

/**
 * MenuItem Component
 * 
 * Renders a single menu item with proper accessibility attributes and visual states.
 * 
 * @example
 * ```tsx
 * <MenuItem
 *   id="save"
 *   label="Save Project"
 *   shortcut="Ctrl+S"
 *   enabled={true}
 *   onClick={handleSave}
 * />
 * ```
 * 
 * @example Toggle item
 * ```tsx
 * <MenuItem
 *   id="grid"
 *   label="Show Grid"
 *   checked={gridVisible}
 *   onClick={toggleGrid}
 * />
 * ```
 */
export const MenuItem = React.forwardRef<HTMLButtonElement, MenuItemProps>(
  (
    {
      id,
      label,
      enabled = true,
      checked,
      shortcut,
      icon,
      hasSubmenu = false,
      focused = false,
      onClick,
      onFocus,
      onMouseEnter,
      tabIndex = -1,
      className = '',
    },
    ref
  ) => {
    /**
     * Handle click event
     */
    const handleClick = () => {
      if (enabled && onClick) {
        onClick();
      }
    };

    /**
     * Handle keyboard events
     */
    const handleKeyDown = (event: React.KeyboardEvent) => {
      if (!enabled) return;

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleClick();
      }
    };

    return (
      <button
        ref={ref}
        id={id}
        role={hasSubmenu ? 'menuitem' : 'menuitem'}
        aria-label={`${label}${shortcut ? `, keyboard shortcut ${shortcut}` : ''}${checked !== undefined ? `, ${checked ? 'checked' : 'not checked'}` : ''}`}
        aria-disabled={!enabled}
        aria-checked={checked !== undefined ? checked : undefined}
        aria-haspopup={hasSubmenu ? 'true' : undefined}
        tabIndex={tabIndex}
        onClick={handleClick}
        onFocus={onFocus}
        onMouseEnter={onMouseEnter}
        onKeyDown={handleKeyDown}
        disabled={!enabled}
        className={`
          flex items-center justify-between
          w-full px-3 py-2 text-sm text-left
          font-medium
          rounded-sm
          transition-all duration-100 ease-in-out
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
          whitespace-nowrap
          ${
            enabled
              ? focused
                ? 'bg-accent text-accent-foreground shadow-sm'
                : 'text-foreground hover:bg-accent hover:text-accent-foreground hover:shadow-sm active:bg-accent/80'
              : 'text-gray-500 dark:text-gray-400 cursor-not-allowed'
          }
          ${className}
        `}
      >
        {/* Left side: Icon, Checkmark, and Label */}
        <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
          {/* Checkmark for toggle items */}
          {checked !== undefined && (
            <span className="flex-shrink-0 w-4 h-4" aria-hidden="true">
              {checked && <Check className="w-4 h-4" />}
            </span>
          )}

          {/* Icon */}
          {icon && (
            <span className="flex-shrink-0 w-4 h-4" aria-hidden="true">
              {icon}
            </span>
          )}

          {/* Label */}
          <span className={`truncate ${!enabled ? 'line-through opacity-60' : ''}`}>{label}</span>
        </div>

        {/* Right side: Shortcut or Submenu indicator */}
        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
          {/* Keyboard shortcut */}
          {shortcut && !hasSubmenu && (
            <span
              className="text-xs text-muted-foreground"
              aria-label={`Keyboard shortcut: ${shortcut}`}
            >
              {shortcut}
            </span>
          )}

          {/* Submenu indicator */}
          {hasSubmenu && (
            <ChevronRight
              className="w-4 h-4 text-muted-foreground"
              aria-hidden="true"
            />
          )}
        </div>
      </button>
    );
  }
);

MenuItem.displayName = 'MenuItem';

export default MenuItem;
