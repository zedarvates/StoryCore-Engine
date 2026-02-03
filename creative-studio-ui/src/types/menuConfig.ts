/**
 * Menu Configuration Types
 * 
 * Defines all types for the menu configuration system.
 * These types support Requirements 11.1-11.5 and enable declarative menu definitions.
 */

import { KeyboardShortcut } from './keyboardShortcut';
import { AppState } from './menuBarState';

/**
 * Menu item types
 */
export type MenuItemType = 'action' | 'submenu' | 'separator' | 'toggle';

/**
 * Action context passed to menu item actions
 * Contains all necessary state and services for executing menu actions
 */
export interface ActionContext {
  /** Current application state */
  state: AppState;
  /** Service instances */
  services: {
    /** Project persistence service */
    persistence: any; // Will be typed properly when service is implemented
    /** Project export service */
    export: {
      exportJSON: (project: any) => Promise<{ success: boolean; filePath?: string; error?: Error }>;
      exportPDF: (project: any) => Promise<{ success: boolean; filePath?: string; error?: Error }>;
      exportVideo: (project: any) => Promise<{ success: boolean; filePath?: string; error?: Error }>;
      setProgressCallback?: (callback: (progress: number, message: string) => void) => void;
      clearProgressCallback?: () => void;
    };
    /** Recent projects service */
    recentProjects: any; // Will be typed properly when service is implemented
    /** Modal manager */
    modal: any; // Will be typed properly when modal manager is implemented
    /** Notification service */
    notification: {
      show: (notification: { type: 'success' | 'error' | 'warning' | 'info'; message: string; duration?: number }) => string;
      dismiss: (id: string) => void;
    };
  };
  /** Callback to update view state */
  onViewStateChange?: (viewState: Partial<import('./menuBarState').ViewState>) => void;
}

/**
 * Menu item configuration
 * Defines a single menu item with all its properties and behavior
 */
export interface MenuItemConfig {
  /** Unique identifier for the menu item */
  id: string;
  
  /** Display label (translation key or plain text) */
  label: string;
  
  /** Type of menu item */
  type: MenuItemType;
  
  /** Whether the item is enabled (can be static or dynamic) */
  enabled: boolean | ((state: AppState) => boolean);
  
  /** Whether the item is visible (can be static or dynamic) */
  visible: boolean | ((state: AppState) => boolean);
  
  /** For toggle items: whether the item is checked (can be static or dynamic) */
  checked?: boolean | ((state: AppState) => boolean);
  
  /** Keyboard shortcut for the item */
  shortcut?: KeyboardShortcut;
  
  /** Action to execute when item is activated */
  action?: (context: ActionContext) => void | Promise<void>;
  
  /** Submenu items (only for type='submenu') */
  submenu?: MenuItemConfig[];
  
  /** Optional icon identifier */
  icon?: string;
  
  /** Optional description for tooltips */
  description?: string;
}

/**
 * Menu configuration
 * Defines a complete menu with all its items
 */
export interface MenuConfig {
  /** Unique identifier for the menu */
  id: string;
  
  /** Display label (translation key or plain text) */
  label: string;
  
  /** Menu items */
  items: MenuItemConfig[];
  
  /** Optional icon identifier */
  icon?: string;
}

/**
 * Complete menu bar configuration
 * Array of all menus in the menu bar
 */
export type MenuBarConfig = MenuConfig[];

/**
 * Type guard to check if enabled is a function
 */
export function isEnabledFunction(
  enabled: boolean | ((state: AppState) => boolean)
): enabled is (state: AppState) => boolean {
  return typeof enabled === 'function';
}

/**
 * Type guard to check if visible is a function
 */
export function isVisibleFunction(
  visible: boolean | ((state: AppState) => boolean)
): visible is (state: AppState) => boolean {
  return typeof visible === 'function';
}

/**
 * Type guard to check if checked is a function
 */
export function isCheckedFunction(
  checked: boolean | ((state: AppState) => boolean) | undefined
): checked is (state: AppState) => boolean {
  return typeof checked === 'function';
}

/**
 * Evaluate enabled state (handles both static and dynamic values)
 */
export function evaluateEnabled(
  enabled: boolean | ((state: AppState) => boolean),
  state: AppState
): boolean {
  return isEnabledFunction(enabled) ? enabled(state) : enabled;
}

/**
 * Evaluate visible state (handles both static and dynamic values)
 */
export function evaluateVisible(
  visible: boolean | ((state: AppState) => boolean),
  state: AppState
): boolean {
  return isVisibleFunction(visible) ? visible(state) : visible;
}

/**
 * Evaluate checked state (handles both static and dynamic values)
 */
export function evaluateChecked(
  checked: boolean | ((state: AppState) => boolean) | undefined,
  state: AppState
): boolean | undefined {
  if (checked === undefined) return undefined;
  return isCheckedFunction(checked) ? checked(state) : checked;
}

/**
 * Menu configuration validation error
 */
export class MenuConfigError extends Error {
  menuId?: string;
  itemId?: string;
  
  constructor(message: string, menuId?: string, itemId?: string) {
    super(message);
    this.name = 'MenuConfigError';
    this.menuId = menuId;
    this.itemId = itemId;
  }
}
