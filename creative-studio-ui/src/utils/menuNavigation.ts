/**
 * Menu Navigation Utilities
 * 
 * Shared utilities for menu keyboard navigation and item management.
 * This module provides reusable functions for:
 * - Finding next/previous enabled menu items
 * - Getting first/last enabled item indices
 * - Filtering menu items (skipping separators and disabled items)
 * 
 * Used by MenuDropdown and other menu components.
 */

import type { MenuItemConfig } from '../types/menuConfig';
import type { MenuItemProps } from '../components/menuBar/MenuItem';

/**
 * Check if a menu item is a regular item (not a separator)
 */
export function isRegularMenuItem(
  item: MenuItemConfig | (Omit<MenuItemProps, 'focused' | 'tabIndex' | 'onFocus' | 'onMouseEnter'> | { id: string; separator: true })
): item is Omit<MenuItemProps, 'focused' | 'tabIndex' | 'onFocus' | 'onMouseEnter'> {
  return !('separator' in item);
}

/**
 * Check if a menu item is enabled (not a separator and not disabled)
 */
export function isMenuItemEnabled(
  item: MenuItemConfig | (Omit<MenuItemProps, 'focused' | 'tabIndex' | 'onFocus' | 'onMouseEnter'> | { id: string; separator: true })
): boolean {
  return isRegularMenuItem(item) && item.enabled !== false;
}

/**
 * Find the index of the next enabled menu item
 */
export function getNextEnabledItemIndex(
  items: (MenuItemConfig | (Omit<MenuItemProps, 'focused' | 'tabIndex' | 'onFocus' | 'onMouseEnter'> | { id: string; separator: true }))[],
  currentIndex: number,
  direction: 'next' | 'previous'
): number {
  const enabledItems = items
    .map((item, index) => ({ ...item, index }))
    .filter((item) => isMenuItemEnabled(item));

  if (enabledItems.length === 0) return currentIndex;

  const currentEnabledIndex = enabledItems.findIndex(
    (item) => item.index === currentIndex
  );

  if (direction === 'next') {
    const nextIndex =
      currentEnabledIndex === -1 || currentEnabledIndex === enabledItems.length - 1
        ? 0
        : currentEnabledIndex + 1;
    return enabledItems[nextIndex].index;
  } else {
    const prevIndex =
      currentEnabledIndex === -1 || currentEnabledIndex === 0
        ? enabledItems.length - 1
        : currentEnabledIndex - 1;
    return enabledItems[prevIndex].index;
  }
}

/**
 * Find the index of the first enabled menu item
 */
export function getFirstEnabledItemIndex(
  items: (MenuItemConfig | (Omit<MenuItemProps, 'focused' | 'tabIndex' | 'onFocus' | 'onMouseEnter'> | { id: string; separator: true }))[]
): number {
  const firstEnabled = items.findIndex((item) => isMenuItemEnabled(item));
  return firstEnabled === -1 ? 0 : firstEnabled;
}

/**
 * Find the index of the last enabled menu item
 */
export function getLastEnabledItemIndex(
  items: (MenuItemConfig | (Omit<MenuItemProps, 'focused' | 'tabIndex' | 'onFocus' | 'onMouseEnter'> | { id: string; separator: true }))[]
): number {
  for (let i = items.length - 1; i >= 0; i--) {
    if (isMenuItemEnabled(items[i])) {
      return i;
    }
  }
  return items.length - 1;
}

/**
 * Get all enabled menu items with their indices
 */
export function getEnabledItems<T>(
  items: T[]
): Array<{ item: T; index: number }> {
  return items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => isMenuItemEnabled(item as any));
}

/**
 * Navigate to the next enabled item (wraps around)
 */
export function navigateToNextItem<T>(
  items: T[],
  currentIndex: number
): number {
  return getNextEnabledItemIndex(items as any, currentIndex, 'next');
}

/**
 * Navigate to the previous enabled item (wraps around)
 */
export function navigateToPreviousItem<T>(
  items: T[],
  currentIndex: number
): number {
  return getNextEnabledItemIndex(items as any, currentIndex, 'previous');
}

/**
 * Navigate to the first enabled item
 */
export function navigateToFirstItem<T>(items: T[]): number {
  return getFirstEnabledItemIndex(items as any);
}

/**
 * Navigate to the last enabled item
 */
export function navigateToLastItem<T>(items: T[]): number {
  return getLastEnabledItemIndex(items as any);
}

/**
 * Find item index by first letter (for quick navigation)
 * Handles items with separators
 */
export function findMenuItemByFirstLetter(
  items: (Omit<MenuItemProps, 'focused' | 'tabIndex' | 'onFocus' | 'onMouseEnter'> | { id: string; separator: true })[],
  letter: string,
  startIndex: number = 0
): number {
  const lowerLetter = letter.toLowerCase();
  
  // Search from startIndex to end
  for (let i = startIndex; i < items.length; i++) {
    const item = items[i];
    if (isRegularMenuItem(item) && item.label?.toLowerCase().startsWith(lowerLetter)) {
      return i;
    }
  }
  
  // Wrap around to beginning
  for (let i = 0; i < startIndex; i++) {
    const item = items[i];
    if (isRegularMenuItem(item) && item.label?.toLowerCase().startsWith(lowerLetter)) {
      return i;
    }
  }
  
  return -1;
}

