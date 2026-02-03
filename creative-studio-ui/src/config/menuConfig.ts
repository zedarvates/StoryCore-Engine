/**
 * Menu Configuration System
 * 
 * This module provides centralized configuration for the application menu bar,
 * including View and Settings menus. It defines menu item structures with
 * enabled/visible flags to support feature toggling and future extensibility.
 */

/**
 * Configuration for a single menu item
 */
export interface MenuItemConfig {
  /** Unique identifier for the menu item */
  id: string;
  /** Display label for the menu item (translation key or direct text) */
  label: string;
  /** Whether the menu item is enabled (can be clicked) */
  enabled: boolean;
  /** Whether the menu item is visible in the menu */
  visible: boolean;
  /** Optional action callback when menu item is clicked */
  action?: () => void;
  /** Optional submenu items */
  submenu?: MenuItemConfig[];
}

/**
 * Complete menu bar configuration
 */
export interface MenuBarConfig {
  /** View menu items */
  viewMenu: MenuItemConfig[];
  /** Settings menu items */
  settingsMenu: MenuItemConfig[];
}

/**
 * Menu state tracking for enabled/visible flags
 */
export interface MenuState {
  viewMenuItems: {
    timeline: { enabled: boolean; visible: boolean };
    zoomIn: { enabled: boolean; visible: boolean };
    zoomOut: { enabled: boolean; visible: boolean };
    toggleGrid: { enabled: boolean; visible: boolean };
  };
  settingsMenuItems: {
    llmConfig: { enabled: boolean; visible: boolean };
    comfyUIConfig: { enabled: boolean; visible: boolean };
    userPreferences: { enabled: boolean; visible: boolean };
  };
}

/**
 * Get View menu configuration with filtered visible items
 * 
 * This function defines all View menu items including disabled/hidden features
 * that are kept in configuration for future reactivation. Only visible items
 * are returned in the final array.
 * 
 * @returns Array of visible View menu items
 */
export function getViewMenuConfig(): MenuItemConfig[] {
  // Define all View menu items, including disabled ones
  const allItems: MenuItemConfig[] = [
    {
      id: 'timeline',
      label: 'Timeline',
      enabled: false,
      visible: false,
    },
    {
      id: 'zoomIn',
      label: 'Zoom In',
      enabled: false,
      visible: false,
    },
    {
      id: 'zoomOut',
      label: 'Zoom Out',
      enabled: false,
      visible: false,
    },
    {
      id: 'toggleGrid',
      label: 'Toggle Grid',
      enabled: false,
      visible: false,
    },
    // Additional visible items can be added here in the future
  ];

  // Filter to return only visible items
  return filterMenuItems(allItems);
}

/**
 * Get Settings menu configuration with action callbacks
 * 
 * This function defines all Settings menu items with their corresponding
 * action callbacks for opening configuration modals.
 * 
 * @param openLLMConfig - Callback to open LLM Assistant configuration modal
 * @param openComfyUIConfig - Callback to open ComfyUI Server configuration modal
 * @param openUserPreferences - Callback to open User Preferences modal
 * @returns Array of Settings menu items
 */
export function getSettingsMenuConfig(
  openLLMConfig: () => void,
  openComfyUIConfig: () => void,
  openUserPreferences: () => void
): MenuItemConfig[] {
  return [
    {
      id: 'llmConfig',
      label: 'LLM StoryCore Assistant Configuration',
      enabled: true,
      visible: true,
      action: openLLMConfig,
    },
    {
      id: 'comfyUIConfig',
      label: 'ComfyUI Server Configuration',
      enabled: true,
      visible: true,
      action: openComfyUIConfig,
    },
    {
      id: 'userPreferences',
      label: 'User Preferences',
      enabled: true,
      visible: true,
      action: openUserPreferences,
    },
  ];
}

/**
 * Filter menu items to return only visible ones
 * 
 * @param items - Array of menu items to filter
 * @returns Array of visible menu items
 */
function filterMenuItems(items: MenuItemConfig[]): MenuItemConfig[] {
  return items.filter(item => item.visible);
}

/**
 * Get complete menu bar configuration
 * 
 * This is a convenience function that returns both View and Settings menu
 * configurations in a single object.
 * 
 * @param openLLMConfig - Callback to open LLM Assistant configuration modal
 * @param openComfyUIConfig - Callback to open ComfyUI Server configuration modal
 * @param openUserPreferences - Callback to open User Preferences modal
 * @returns Complete menu bar configuration
 */
export function getMenuBarConfig(
  openLLMConfig: () => void,
  openComfyUIConfig: () => void,
  openUserPreferences: () => void
): MenuBarConfig {
  return {
    viewMenu: getViewMenuConfig(),
    settingsMenu: getSettingsMenuConfig(
      openLLMConfig,
      openComfyUIConfig,
      openUserPreferences
    ),
  };
}
