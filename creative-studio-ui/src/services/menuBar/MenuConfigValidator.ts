/**
 * Menu Configuration Validator
 * 
 * Validates menu configurations against schema rules.
 * Provides error handling and default configuration fallback.
 * 
 * This service supports Requirements 11.4 and 11.5.
 */

import {
  MenuBarConfig,
  MenuConfig,
  MenuItemConfig,
  MenuConfigError,
} from '../../types/menuConfig';

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Validation errors */
  errors: ValidationError[];
  /** Validation warnings */
  warnings: ValidationWarning[];
}

/**
 * Validation error
 */
export interface ValidationError {
  /** Error severity */
  severity: 'error' | 'warning';
  /** Error message */
  message: string;
  /** Menu ID where error occurred */
  menuId?: string;
  /** Item ID where error occurred */
  itemId?: string;
  /** Path to the problematic field */
  path?: string;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  /** Warning message */
  message: string;
  /** Menu ID where warning occurred */
  menuId?: string;
  /** Item ID where warning occurred */
  itemId?: string;
}

/**
 * Menu Configuration Validator
 * 
 * Validates menu configurations on startup and provides fallback mechanisms.
 */
export class MenuConfigValidator {
  private errors: ValidationError[] = [];
  private warnings: ValidationWarning[] = [];

  /**
   * Validate complete menu bar configuration
   */
  validate(config: MenuBarConfig): ValidationResult {
    this.errors = [];
    this.warnings = [];

    // Check if config is an array
    if (!Array.isArray(config)) {
      this.addError('Menu bar configuration must be an array');
      return this.getResult();
    }

    // Check if config is not empty
    if (config.length === 0) {
      this.addError('Menu bar configuration cannot be empty');
      return this.getResult();
    }

    // Validate each menu
    for (const menu of config) {
      this.validateMenu(menu);
    }

    // Check for duplicate menu IDs
    this.checkDuplicateMenuIds(config);

    return this.getResult();
  }

  /**
   * Validate a single menu
   */
  private validateMenu(menu: MenuConfig): void {
    const menuId = menu.id;

    // Validate menu ID
    if (!menuId || typeof menuId !== 'string') {
      this.addError('Menu must have a valid ID', undefined, undefined);
      return;
    }

    // Validate menu label
    if (!menu.label || typeof menu.label !== 'string') {
      this.addError('Menu must have a valid label', menuId);
    }

    // Validate menu items
    if (!Array.isArray(menu.items)) {
      this.addError('Menu items must be an array', menuId);
      return;
    }

    if (menu.items.length === 0) {
      this.addWarning('Menu has no items', menuId);
    }

    // Validate each menu item
    for (const item of menu.items) {
      this.validateMenuItem(item, menuId);
    }

    // Check for duplicate item IDs within menu
    this.checkDuplicateItemIds(menu.items, menuId);
  }

  /**
   * Validate a single menu item
   */
  private validateMenuItem(item: MenuItemConfig, menuId: string, parentPath: string = ''): void {
    const itemId = item.id;
    const path = parentPath ? `${parentPath}.${itemId}` : itemId;

    // Validate item ID
    if (!itemId || typeof itemId !== 'string') {
      this.addError('Menu item must have a valid ID', menuId, undefined, path);
      return;
    }

    // Validate item type
    const validTypes = ['action', 'submenu', 'separator', 'toggle'];
    if (!validTypes.includes(item.type)) {
      this.addError(
        `Invalid menu item type: ${item.type}. Must be one of: ${validTypes.join(', ')}`,
        menuId,
        itemId,
        path
      );
    }

    // Validate item label (not required for separators)
    if (item.type !== 'separator') {
      if (!item.label || typeof item.label !== 'string') {
        this.addError('Menu item must have a valid label', menuId, itemId, path);
      }
    }

    // Validate enabled property
    if (item.enabled === undefined) {
      this.addError('Menu item must have an enabled property', menuId, itemId, path);
    } else if (typeof item.enabled !== 'boolean' && typeof item.enabled !== 'function') {
      this.addError('Menu item enabled must be boolean or function', menuId, itemId, path);
    }

    // Validate visible property
    if (item.visible === undefined) {
      this.addError('Menu item must have a visible property', menuId, itemId, path);
    } else if (typeof item.visible !== 'boolean' && typeof item.visible !== 'function') {
      this.addError('Menu item visible must be boolean or function', menuId, itemId, path);
    }

    // Type-specific validation
    switch (item.type) {
      case 'action':
        this.validateActionItem(item, menuId, itemId, path);
        break;
      case 'submenu':
        this.validateSubmenuItem(item, menuId, itemId, path);
        break;
      case 'toggle':
        this.validateToggleItem(item, menuId, itemId, path);
        break;
      case 'separator':
        // Separators don't need additional validation
        break;
    }

    // Validate shortcut if present
    if (item.shortcut) {
      this.validateShortcut(item.shortcut, menuId, itemId, path);
    }
  }

  /**
   * Validate action menu item
   */
  private validateActionItem(
    item: MenuItemConfig,
    menuId: string,
    itemId: string,
    path: string
  ): void {
    if (!item.action || typeof item.action !== 'function') {
      this.addError('Action menu item must have an action function', menuId, itemId, path);
    }

    if (item.submenu) {
      this.addWarning('Action menu item should not have submenu', menuId, itemId);
    }

    if (item.checked !== undefined) {
      this.addWarning('Action menu item should not have checked property', menuId, itemId);
    }
  }

  /**
   * Validate submenu menu item
   */
  private validateSubmenuItem(
    item: MenuItemConfig,
    menuId: string,
    itemId: string,
    path: string
  ): void {
    if (!item.submenu || !Array.isArray(item.submenu)) {
      this.addError('Submenu menu item must have a submenu array', menuId, itemId, path);
      return;
    }

    if (item.submenu.length === 0) {
      this.addWarning('Submenu has no items', menuId, itemId);
    }

    if (item.action) {
      this.addWarning('Submenu menu item should not have action function', menuId, itemId);
    }

    // Validate submenu items recursively
    for (const subItem of item.submenu) {
      this.validateMenuItem(subItem, menuId, path);
    }

    // Check for duplicate IDs in submenu
    this.checkDuplicateItemIds(item.submenu, menuId, itemId);
  }

  /**
   * Validate toggle menu item
   */
  private validateToggleItem(
    item: MenuItemConfig,
    menuId: string,
    itemId: string,
    path: string
  ): void {
    if (item.checked === undefined) {
      this.addError('Toggle menu item must have a checked property', menuId, itemId, path);
    } else if (typeof item.checked !== 'boolean' && typeof item.checked !== 'function') {
      this.addError('Toggle menu item checked must be boolean or function', menuId, itemId, path);
    }

    if (!item.action || typeof item.action !== 'function') {
      this.addError('Toggle menu item must have an action function', menuId, itemId, path);
    }

    if (item.submenu) {
      this.addWarning('Toggle menu item should not have submenu', menuId, itemId);
    }
  }

  /**
   * Validate keyboard shortcut
   */
  private validateShortcut(
    shortcut: unknown,
    menuId: string,
    itemId: string,
    path: string
  ): void {
    if (!shortcut.key || typeof shortcut.key !== 'string') {
      this.addError('Keyboard shortcut must have a valid key', menuId, itemId, path);
    }

    // Validate modifier keys
    const modifiers = ['ctrl', 'shift', 'alt', 'meta'];
    for (const modifier of modifiers) {
      if (shortcut[modifier] !== undefined && typeof shortcut[modifier] !== 'boolean') {
        this.addError(
          `Keyboard shortcut ${modifier} must be boolean`,
          menuId,
          itemId,
          path
        );
      }
    }
  }

  /**
   * Check for duplicate menu IDs
   */
  private checkDuplicateMenuIds(config: MenuBarConfig): void {
    const ids = new Set<string>();
    for (const menu of config) {
      if (ids.has(menu.id)) {
        this.addError(`Duplicate menu ID: ${menu.id}`);
      }
      ids.add(menu.id);
    }
  }

  /**
   * Check for duplicate item IDs within a menu
   */
  private checkDuplicateItemIds(
    items: MenuItemConfig[],
    menuId: string,
    parentItemId?: string
  ): void {
    const ids = new Set<string>();
    for (const item of items) {
      if (ids.has(item.id)) {
        const context = parentItemId ? `submenu of ${parentItemId}` : `menu ${menuId}`;
        this.addError(`Duplicate item ID: ${item.id} in ${context}`, menuId);
      }
      ids.add(item.id);
    }
  }

  /**
   * Add validation error
   */
  private addError(
    message: string,
    menuId?: string,
    itemId?: string,
    path?: string
  ): void {
    this.errors.push({
      severity: 'error',
      message,
      menuId,
      itemId,
      path,
    });
  }

  /**
   * Add validation warning
   */
  private addWarning(message: string, menuId?: string, itemId?: string): void {
    this.warnings.push({
      message,
      menuId,
      itemId,
    });
  }

  /**
   * Get validation result
   */
  private getResult(): ValidationResult {
    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
    };
  }
}

/**
 * Validate menu configuration and log results
 * 
 * @param config Menu bar configuration to validate
 * @param throwOnError Whether to throw error on validation failure
 * @returns Validation result
 */
export function validateMenuConfig(
  config: MenuBarConfig,
  throwOnError: boolean = false
): ValidationResult {
  const validator = new MenuConfigValidator();
  const result = validator.validate(config);

  // Log errors
  if (result.errors.length > 0) {
    console.error('Menu configuration validation errors:');
    for (const error of result.errors) {
      const location = error.menuId
        ? error.itemId
          ? `${error.menuId}.${error.itemId}`
          : error.menuId
        : 'root';
      console.error(`  [${location}] ${error.message}`);
    }

    if (throwOnError) {
      throw new MenuConfigError(
        `Menu configuration validation failed with ${result.errors.length} error(s)`
      );
    }
  }

  // Log warnings
  if (result.warnings.length > 0) {
    console.warn('Menu configuration validation warnings:');
    for (const warning of result.warnings) {
      const location = warning.menuId
        ? warning.itemId
          ? `${warning.menuId}.${warning.itemId}`
          : warning.menuId
        : 'root';
      console.warn(`  [${location}] ${warning.message}`);
    }
  }

  return result;
}

/**
 * Get default menu bar configuration
 * Used as fallback when validation fails
 */
export function getDefaultMenuConfig(): MenuBarConfig {
  // Import the default configuration
  // This is a minimal safe configuration
  return [
    {
      id: 'file',
      label: 'File',
      items: [
        {
          id: 'new',
          label: 'New Project',
          type: 'action',
          enabled: true,
          visible: true,
          action: () => console.log('New project'),
        },
      ],
    },
    {
      id: 'help',
      label: 'Help',
      items: [
        {
          id: 'about',
          label: 'About',
          type: 'action',
          enabled: true,
          visible: true,
          action: () => console.log('About'),
        },
      ],
    },
  ];
}

/**
 * Validate and get menu configuration with fallback
 * 
 * @param config Menu bar configuration to validate
 * @returns Valid configuration (original or default fallback)
 */
export function validateAndGetConfig(config: MenuBarConfig): MenuBarConfig {
  const result = validateMenuConfig(config, false);

  if (!result.valid) {
    console.error('Using default menu configuration due to validation errors');
    return getDefaultMenuConfig();
  }

  return config;
}

