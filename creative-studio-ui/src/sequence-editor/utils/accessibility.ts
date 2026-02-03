/**
 * Accessibility Utilities
 * 
 * Provides utilities for keyboard navigation, screen reader support,
 * and ARIA attribute management.
 * 
 * Requirements: 20.1, 22.2
 */

// ============================================================================
// Keyboard Navigation
// ============================================================================

/**
 * Check if an element is focusable
 */
export const isFocusable = (element: HTMLElement): boolean => {
  if (element.tabIndex < 0) return false;
  if (element.hasAttribute('disabled')) return false;
  if (element.getAttribute('aria-hidden') === 'true') return false;
  
  const tagName = element.tagName.toLowerCase();
  const focusableTags = ['a', 'button', 'input', 'select', 'textarea'];
  
  return (
    focusableTags.includes(tagName) ||
    element.tabIndex >= 0 ||
    element.hasAttribute('contenteditable')
  );
};

/**
 * Get all focusable elements within a container
 */
export const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(', ');
  
  const elements = Array.from(container.querySelectorAll<HTMLElement>(selector));
  return elements.filter(el => {
    return (
      el.offsetParent !== null && // Element is visible
      el.getAttribute('aria-hidden') !== 'true' &&
      !el.hasAttribute('disabled')
    );
  });
};

/**
 * Focus the first focusable element in a container
 */
export const focusFirstElement = (container: HTMLElement): boolean => {
  const focusable = getFocusableElements(container);
  if (focusable.length > 0) {
    focusable[0].focus();
    return true;
  }
  return false;
};

/**
 * Focus the last focusable element in a container
 */
export const focusLastElement = (container: HTMLElement): boolean => {
  const focusable = getFocusableElements(container);
  if (focusable.length > 0) {
    focusable[focusable.length - 1].focus();
    return true;
  }
  return false;
};

/**
 * Trap focus within a container (for modals/dialogs)
 */
export const trapFocus = (container: HTMLElement, event: KeyboardEvent): void => {
  if (event.key !== 'Tab') return;
  
  const focusable = getFocusableElements(container);
  if (focusable.length === 0) return;
  
  const firstElement = focusable[0];
  const lastElement = focusable[focusable.length - 1];
  
  if (event.shiftKey) {
    // Shift + Tab
    if (document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    }
  } else {
    // Tab
    if (document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }
};

// ============================================================================
// Screen Reader Announcements
// ============================================================================

let announcementRegion: HTMLElement | null = null;

/**
 * Initialize the live region for screen reader announcements
 */
export const initializeAnnouncementRegion = (): void => {
  if (announcementRegion) return;
  
  announcementRegion = document.createElement('div');
  announcementRegion.setAttribute('role', 'status');
  announcementRegion.setAttribute('aria-live', 'polite');
  announcementRegion.setAttribute('aria-atomic', 'true');
  announcementRegion.style.position = 'absolute';
  announcementRegion.style.left = '-10000px';
  announcementRegion.style.width = '1px';
  announcementRegion.style.height = '1px';
  announcementRegion.style.overflow = 'hidden';
  
  document.body.appendChild(announcementRegion);
};

/**
 * Announce a message to screen readers
 */
export const announce = (message: string, priority: 'polite' | 'assertive' = 'polite'): void => {
  if (!announcementRegion) {
    initializeAnnouncementRegion();
  }
  
  if (announcementRegion) {
    announcementRegion.setAttribute('aria-live', priority);
    announcementRegion.textContent = message;
    
    // Clear after announcement
    setTimeout(() => {
      if (announcementRegion) {
        announcementRegion.textContent = '';
      }
    }, 1000);
  }
};

// ============================================================================
// ARIA Utilities
// ============================================================================

/**
 * Generate a unique ID for ARIA relationships
 */
let idCounter = 0;
export const generateAriaId = (prefix: string = 'aria'): string => {
  return `${prefix}-${Date.now()}-${++idCounter}`;
};

/**
 * Set ARIA attributes for a combobox/autocomplete
 */
export const setComboboxAria = (
  input: HTMLElement,
  listbox: HTMLElement,
  expanded: boolean
): void => {
  const listboxId = listbox.id || generateAriaId('listbox');
  listbox.id = listboxId;
  
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-controls', listboxId);
  input.setAttribute('aria-expanded', String(expanded));
  
  listbox.setAttribute('role', 'listbox');
};

/**
 * Set ARIA attributes for a dialog/modal
 */
export const setDialogAria = (
  dialog: HTMLElement,
  titleId?: string,
  descriptionId?: string
): void => {
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  
  if (titleId) {
    dialog.setAttribute('aria-labelledby', titleId);
  }
  
  if (descriptionId) {
    dialog.setAttribute('aria-describedby', descriptionId);
  }
};

/**
 * Set ARIA attributes for a tab panel
 */
export const setTabPanelAria = (
  tab: HTMLElement,
  panel: HTMLElement,
  selected: boolean
): void => {
  const tabId = tab.id || generateAriaId('tab');
  const panelId = panel.id || generateAriaId('tabpanel');
  
  tab.id = tabId;
  panel.id = panelId;
  
  tab.setAttribute('role', 'tab');
  tab.setAttribute('aria-selected', String(selected));
  tab.setAttribute('aria-controls', panelId);
  tab.setAttribute('tabindex', selected ? '0' : '-1');
  
  panel.setAttribute('role', 'tabpanel');
  panel.setAttribute('aria-labelledby', tabId);
  panel.setAttribute('tabindex', '0');
  
  if (!selected) {
    panel.setAttribute('hidden', 'true');
  } else {
    panel.removeAttribute('hidden');
  }
};

// ============================================================================
// Keyboard Event Handlers
// ============================================================================

/**
 * Handle arrow key navigation in a list
 */
export const handleArrowNavigation = (
  event: KeyboardEvent,
  items: HTMLElement[],
  currentIndex: number,
  onSelect: (index: number) => void
): void => {
  let newIndex = currentIndex;
  
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      newIndex = Math.min(currentIndex + 1, items.length - 1);
      break;
    case 'ArrowUp':
      event.preventDefault();
      newIndex = Math.max(currentIndex - 1, 0);
      break;
    case 'Home':
      event.preventDefault();
      newIndex = 0;
      break;
    case 'End':
      event.preventDefault();
      newIndex = items.length - 1;
      break;
    case 'Enter':
    case ' ':
      event.preventDefault();
      onSelect(currentIndex);
      return;
  }
  
  if (newIndex !== currentIndex) {
    items[newIndex]?.focus();
    onSelect(newIndex);
  }
};

/**
 * Handle tab navigation in a tab list
 */
export const handleTabNavigation = (
  event: KeyboardEvent,
  tabs: HTMLElement[],
  currentIndex: number,
  onSelect: (index: number) => void
): void => {
  let newIndex = currentIndex;
  
  switch (event.key) {
    case 'ArrowRight':
      event.preventDefault();
      newIndex = (currentIndex + 1) % tabs.length;
      break;
    case 'ArrowLeft':
      event.preventDefault();
      newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      break;
    case 'Home':
      event.preventDefault();
      newIndex = 0;
      break;
    case 'End':
      event.preventDefault();
      newIndex = tabs.length - 1;
      break;
  }
  
  if (newIndex !== currentIndex) {
    tabs[newIndex]?.focus();
    onSelect(newIndex);
  }
};

// ============================================================================
// Focus Management
// ============================================================================

/**
 * Save the currently focused element
 */
export const saveFocus = (): HTMLElement | null => {
  return document.activeElement as HTMLElement;
};

/**
 * Restore focus to a previously saved element
 */
export const restoreFocus = (element: HTMLElement | null): void => {
  if (element && typeof element.focus === 'function') {
    element.focus();
  }
};

/**
 * Create a focus trap for modal dialogs
 */
export class FocusTrap {
  private container: HTMLElement;
  private previousFocus: HTMLElement | null = null;
  private handleKeyDown: (e: KeyboardEvent) => void;
  
  constructor(container: HTMLElement) {
    this.container = container;
    this.handleKeyDown = (e: KeyboardEvent) => trapFocus(container, e);
  }
  
  activate(): void {
    this.previousFocus = saveFocus();
    this.container.addEventListener('keydown', this.handleKeyDown);
    focusFirstElement(this.container);
  }
  
  deactivate(): void {
    this.container.removeEventListener('keydown', this.handleKeyDown);
    restoreFocus(this.previousFocus);
    this.previousFocus = null;
  }
}

// ============================================================================
// Reduced Motion Support
// ============================================================================

/**
 * Check if user prefers reduced motion
 */
export const prefersReducedMotion = (): boolean => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Get animation duration based on user preference
 */
export const getAnimationDuration = (defaultDuration: number): number => {
  return prefersReducedMotion() ? 0 : defaultDuration;
};

// ============================================================================
// High Contrast Support
// ============================================================================

/**
 * Check if high contrast mode is active
 */
export const isHighContrastMode = (): boolean => {
  return window.matchMedia('(prefers-contrast: high)').matches;
};

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize accessibility features
 */
export const initializeAccessibility = (): void => {
  initializeAnnouncementRegion();
  
  // Add skip link for keyboard navigation
  const skipLink = document.createElement('a');
  skipLink.href = '#main-content';
  skipLink.textContent = 'Skip to main content';
  skipLink.className = 'skip-link';
  skipLink.style.position = 'absolute';
  skipLink.style.top = '-40px';
  skipLink.style.left = '0';
  skipLink.style.background = '#000';
  skipLink.style.color = '#fff';
  skipLink.style.padding = '8px';
  skipLink.style.textDecoration = 'none';
  skipLink.style.zIndex = '10000';
  
  skipLink.addEventListener('focus', () => {
    skipLink.style.top = '0';
  });
  
  skipLink.addEventListener('blur', () => {
    skipLink.style.top = '-40px';
  });
  
  document.body.insertBefore(skipLink, document.body.firstChild);
};
