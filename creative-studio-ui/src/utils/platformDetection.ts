/**
 * Platform Detection Utility
 * 
 * Provides cross-platform detection for keyboard shortcuts and platform-specific behavior.
 * Supports Mac, Windows, and Linux platforms.
 * 
 * Requirements: 7.1-7.13, 10.1-10.7
 */

export type Platform = 'mac' | 'windows' | 'linux';

/**
 * Detect the current platform based on user agent and navigator properties
 */
export function detectPlatform(): Platform {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    // Default to windows for SSR or non-browser environments
    return 'windows';
  }

  const userAgent = navigator.userAgent.toLowerCase();
  const platform = navigator.platform?.toLowerCase() || '';

  // Check for Mac
  if (
    platform.includes('mac') ||
    userAgent.includes('mac') ||
    /macintosh|mac os x/i.test(userAgent)
  ) {
    return 'mac';
  }

  // Check for Linux
  if (
    platform.includes('linux') ||
    userAgent.includes('linux') ||
    /linux/i.test(userAgent)
  ) {
    return 'linux';
  }

  // Default to Windows
  return 'windows';
}

/**
 * Check if the current platform is Mac
 */
export function isMac(): boolean {
  return detectPlatform() === 'mac';
}

/**
 * Check if the current platform is Windows
 */
export function isWindows(): boolean {
  return detectPlatform() === 'windows';
}

/**
 * Check if the current platform is Linux
 */
export function isLinux(): boolean {
  return detectPlatform() === 'linux';
}

/**
 * Get the modifier key name for the current platform
 * Returns 'Cmd' for Mac, 'Ctrl' for Windows/Linux
 */
export function getModifierKeyName(): string {
  return isMac() ? 'Cmd' : 'Ctrl';
}

/**
 * Get the modifier key symbol for the current platform
 * Returns '⌘' for Mac, 'Ctrl' for Windows/Linux
 */
export function getModifierKeySymbol(): string {
  return isMac() ? '⌘' : 'Ctrl';
}

/**
 * Check if the modifier key is pressed in a keyboard event
 * Uses metaKey for Mac, ctrlKey for Windows/Linux
 */
export function isModifierKeyPressed(event: KeyboardEvent | React.KeyboardEvent): boolean {
  return isMac() ? event.metaKey : event.ctrlKey;
}

/**
 * Format a keyboard shortcut for display based on the current platform
 * 
 * @param key - The key character (e.g., 's', 'Enter')
 * @param modifiers - Object specifying which modifier keys are used
 * @returns Formatted shortcut string (e.g., '⌘S' on Mac, 'Ctrl+S' on Windows)
 */
export function formatShortcut(
  key: string,
  modifiers: {
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
  } = {}
): string {
  const parts: string[] = [];
  const platform = detectPlatform();

  // Handle Ctrl/Cmd modifier
  if (modifiers.ctrl || modifiers.meta) {
    if (platform === 'mac') {
      parts.push('⌘');
    } else {
      parts.push('Ctrl');
    }
  }

  // Handle Shift modifier
  if (modifiers.shift) {
    parts.push(platform === 'mac' ? '⇧' : 'Shift');
  }

  // Handle Alt/Option modifier
  if (modifiers.alt) {
    parts.push(platform === 'mac' ? '⌥' : 'Alt');
  }

  // Add the key
  const formattedKey = key.length === 1 ? key.toUpperCase() : key;
  parts.push(formattedKey);

  // Join with appropriate separator
  return platform === 'mac' ? parts.join('') : parts.join('+');
}

/**
 * Check if a keyboard event matches a shortcut definition
 * 
 * @param event - The keyboard event to check
 * @param shortcut - The shortcut definition
 * @returns True if the event matches the shortcut
 */
export function matchesShortcut(
  event: KeyboardEvent | React.KeyboardEvent,
  shortcut: {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
  }
): boolean {
  // Normalize key comparison (case-insensitive)
  const eventKey = event.key.toLowerCase();
  const shortcutKey = shortcut.key.toLowerCase();

  if (eventKey !== shortcutKey) {
    return false;
  }

  // Check modifiers
  const platform = detectPlatform();
  
  // For Ctrl/Meta, check the appropriate key based on platform
  const modifierPressed = platform === 'mac' ? event.metaKey : event.ctrlKey;
  const modifierRequired = shortcut.ctrl || shortcut.meta || false;
  
  if (modifierPressed !== modifierRequired) {
    return false;
  }

  // Check Shift
  if (event.shiftKey !== (shortcut.shift || false)) {
    return false;
  }

  // Check Alt
  if (event.altKey !== (shortcut.alt || false)) {
    return false;
  }

  return true;
}
