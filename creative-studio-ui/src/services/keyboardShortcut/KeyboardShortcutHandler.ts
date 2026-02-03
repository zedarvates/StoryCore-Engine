/**
 * Keyboard Shortcut Handler
 * 
 * Manages keyboard shortcut registration, event handling, and platform-aware
 * key matching. Provides display text generation for menu items.
 * 
 * Requirements: 7.1-7.13
 */

import type {
  Platform,
  KeyboardShortcut,
  ShortcutConfig,
  KeyMatchResult,
} from '../../types/keyboardShortcut';
import {
  detectPlatform,
  formatShortcut,
  matchesShortcut,
} from '../../utils/platformDetection';

/**
 * KeyboardShortcutHandler class
 * 
 * Centralized keyboard shortcut management with platform detection,
 * shortcut registration, event handling, and display text generation.
 */
export class KeyboardShortcutHandler {
  private shortcuts: Map<string, ShortcutConfig>;
  private platform: Platform;
  private isListening: boolean;
  private boundHandler: ((event: KeyboardEvent) => void) | null;

  constructor() {
    this.shortcuts = new Map();
    this.platform = detectPlatform();
    this.isListening = false;
    this.boundHandler = null;
  }

  /**
   * Get the current platform
   */
  getPlatform(): Platform {
    return this.platform;
  }

  /**
   * Register a keyboard shortcut
   * 
   * @param config - Shortcut configuration
   * @throws Error if shortcut ID already exists
   */
  register(config: ShortcutConfig): void {
    if (this.shortcuts.has(config.id)) {
      throw new Error(`Shortcut with id "${config.id}" is already registered`);
    }

    this.shortcuts.set(config.id, config);
  }

  /**
   * Register multiple keyboard shortcuts
   * 
   * @param configs - Array of shortcut configurations
   */
  registerMultiple(configs: ShortcutConfig[]): void {
    configs.forEach((config) => this.register(config));
  }

  /**
   * Unregister a keyboard shortcut
   * 
   * @param id - Shortcut identifier
   * @returns True if shortcut was found and removed
   */
  unregister(id: string): boolean {
    return this.shortcuts.delete(id);
  }

  /**
   * Unregister all keyboard shortcuts
   */
  unregisterAll(): void {
    this.shortcuts.clear();
  }

  /**
   * Get a registered shortcut by ID
   * 
   * @param id - Shortcut identifier
   * @returns Shortcut configuration or undefined
   */
  getShortcut(id: string): ShortcutConfig | undefined {
    return this.shortcuts.get(id);
  }

  /**
   * Get all registered shortcuts
   * 
   * @returns Array of all shortcut configurations
   */
  getAllShortcuts(): ShortcutConfig[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Handle keyboard event and trigger matching shortcuts
   * 
   * @param event - Keyboard event
   * @returns True if a shortcut was triggered and event should be prevented
   */
  handleKeyDown(event: KeyboardEvent): boolean {
    // Find matching shortcut
    const matchResult = this.findMatchingShortcut(event);

    if (!matchResult.matches || !matchResult.config) {
      return false;
    }

    const config = matchResult.config;

    // Check if shortcut is enabled
    if (!config.enabled()) {
      return false;
    }

    // Prevent default browser behavior
    event.preventDefault();
    event.stopPropagation();

    // Execute action
    try {
      const result = config.action();
      
      // Handle async actions
      if (result instanceof Promise) {
        result.catch((error) => {
          console.error(`Error executing shortcut "${config.id}":`, error);
        });
      }
    } catch (error) {
      console.error(`Error executing shortcut "${config.id}":`, error);
    }

    return true;
  }

  /**
   * Find a shortcut that matches the keyboard event
   * 
   * @param event - Keyboard event
   * @returns Match result with config if found
   */
  private findMatchingShortcut(event: KeyboardEvent): KeyMatchResult {
    for (const config of this.shortcuts.values()) {
      if (matchesShortcut(event, config.shortcut)) {
        return {
          matches: true,
          config,
        };
      }
    }

    return { matches: false };
  }

  /**
   * Get display text for a keyboard shortcut (platform-aware)
   * 
   * @param shortcut - Keyboard shortcut definition
   * @returns Formatted display text (e.g., "⌘S" on Mac, "Ctrl+S" on Windows)
   */
  getDisplayText(shortcut: KeyboardShortcut): string {
    // Use custom display text if provided
    if (shortcut.displayText) {
      return shortcut.displayText;
    }

    // Generate platform-aware display text
    return formatShortcut(shortcut.key, {
      ctrl: shortcut.ctrl,
      shift: shortcut.shift,
      alt: shortcut.alt,
      meta: shortcut.meta,
    });
  }

  /**
   * Start listening for keyboard events
   * 
   * Attaches a global keydown event listener to handle shortcuts.
   */
  startListening(): void {
    if (this.isListening) {
      return;
    }

    this.boundHandler = (event: KeyboardEvent) => {
      this.handleKeyDown(event);
    };

    window.addEventListener('keydown', this.boundHandler);
    this.isListening = true;
  }

  /**
   * Stop listening for keyboard events
   * 
   * Removes the global keydown event listener.
   */
  stopListening(): void {
    if (!this.isListening || !this.boundHandler) {
      return;
    }

    window.removeEventListener('keydown', this.boundHandler);
    this.boundHandler = null;
    this.isListening = false;
  }

  /**
   * Check if handler is currently listening
   */
  isActive(): boolean {
    return this.isListening;
  }

  /**
   * Get shortcut count
   */
  getShortcutCount(): number {
    return this.shortcuts.size;
  }

  /**
   * Check if a shortcut ID is registered
   */
  hasShortcut(id: string): boolean {
    return this.shortcuts.has(id);
  }

  /**
   * Update a shortcut's enabled state function
   * 
   * @param id - Shortcut identifier
   * @param enabled - New enabled state function
   * @returns True if shortcut was found and updated
   */
  updateEnabled(id: string, enabled: () => boolean): boolean {
    const config = this.shortcuts.get(id);
    if (!config) {
      return false;
    }

    config.enabled = enabled;
    return true;
  }

  /**
   * Update a shortcut's action function
   * 
   * @param id - Shortcut identifier
   * @param action - New action function
   * @returns True if shortcut was found and updated
   */
  updateAction(id: string, action: () => void | Promise<void>): boolean {
    const config = this.shortcuts.get(id);
    if (!config) {
      return false;
    }

    config.action = action;
    return true;
  }

  /**
   * Dispose of the handler and clean up resources
   */
  dispose(): void {
    this.stopListening();
    this.unregisterAll();
  }
}

/**
 * Create a singleton instance for global use
 */
let globalHandler: KeyboardShortcutHandler | null = null;

/**
 * Get the global keyboard shortcut handler instance
 * 
 * @returns Global handler instance
 */
export function getGlobalKeyboardShortcutHandler(): KeyboardShortcutHandler {
  if (!globalHandler) {
    globalHandler = new KeyboardShortcutHandler();
  }
  return globalHandler;
}

/**
 * Reset the global keyboard shortcut handler
 * Useful for testing
 */
export function resetGlobalKeyboardShortcutHandler(): void {
  if (globalHandler) {
    globalHandler.dispose();
    globalHandler = null;
  }
}
