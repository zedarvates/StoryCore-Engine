/**
 * Accessibility Utilities for Grid Editor
 * 
 * Provides ARIA labels, keyboard navigation support, and screen reader
 * announcements for the Advanced Grid Editor.
 */

/**
 * ARIA labels for grid editor components
 */
export const ARIA_LABELS = {
  // Main components
  gridEditor: 'Advanced Grid Editor',
  gridCanvas: '3x3 grid canvas for editing panels',
  toolbar: 'Grid editor toolbar',
  propertiesPanel: 'Panel properties and settings',
  
  // Tools
  selectTool: 'Select tool - Click to select panels',
  cropTool: 'Crop tool - Click to crop panel content',
  rotateTool: 'Rotate tool - Click to rotate panels',
  scaleTool: 'Scale tool - Click to resize panels',
  panTool: 'Pan tool - Click to pan the viewport',
  annotateTool: 'Annotate tool - Click to add annotations',
  
  // Actions
  undo: 'Undo last action',
  redo: 'Redo last undone action',
  save: 'Save grid configuration',
  export: 'Export grid configuration',
  import: 'Import grid configuration',
  
  // Zoom controls
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  zoomFit: 'Fit grid to view',
  zoomActual: 'Zoom to actual size (100%)',
  
  // Panel operations
  selectPanel: (row: number, col: number) => `Select panel at row ${row + 1}, column ${col + 1}`,
  panelSelected: (row: number, col: number) => `Panel at row ${row + 1}, column ${col + 1} selected`,
  generatePanel: 'Generate image for selected panel',
  deletePanel: 'Delete selected panel content',
  duplicatePanel: 'Duplicate selected panel',
  
  // Layer operations
  addLayer: 'Add new layer',
  deleteLayer: 'Delete selected layer',
  moveLayerUp: 'Move layer up',
  moveLayerDown: 'Move layer down',
  toggleLayerVisibility: 'Toggle layer visibility',
  toggleLayerLock: 'Toggle layer lock',
  
  // Transform operations
  positionHandle: 'Position handle - Drag to move panel',
  scaleHandle: (corner: string) => `Scale handle ${corner} - Drag to resize panel`,
  rotationHandle: 'Rotation handle - Drag to rotate panel',
  
  // Crop operations
  cropEdge: (edge: string) => `Crop ${edge} edge - Drag to adjust`,
  cropCorner: (corner: string) => `Crop ${corner} corner - Drag to adjust`,
  cropConfirm: 'Confirm crop',
  cropCancel: 'Cancel crop',
  
  // Minimap
  minimap: 'Minimap - Shows current viewport position',
  minimapViewport: 'Current viewport position - Click to navigate',
};

/**
 * Keyboard shortcuts descriptions for screen readers
 */
export const KEYBOARD_SHORTCUTS = {
  'V': 'Activate select tool',
  'C': 'Activate crop tool',
  'R': 'Activate rotate tool',
  'S': 'Activate scale tool',
  'Space': 'Activate pan tool (hold)',
  'Escape': 'Deselect all panels',
  'Ctrl+Z': 'Undo',
  'Ctrl+Shift+Z': 'Redo',
  'Ctrl+Y': 'Redo (alternative)',
  'Delete': 'Delete selected content',
  'Backspace': 'Delete selected content',
  'Ctrl+D': 'Duplicate selected panel',
  'Ctrl+A': 'Select all panels',
  'F': 'Toggle focus mode',
  '[': 'Select previous panel',
  ']': 'Select next panel',
  'Ctrl+S': 'Save configuration',
  'Ctrl+E': 'Export configuration',
};

/**
 * Screen reader announcements
 */
export class ScreenReaderAnnouncer {
  private static instance: ScreenReaderAnnouncer;
  private announceElement: HTMLDivElement | null = null;

  private constructor() {
    this.createAnnounceElement();
  }

  static getInstance(): ScreenReaderAnnouncer {
    if (!ScreenReaderAnnouncer.instance) {
      ScreenReaderAnnouncer.instance = new ScreenReaderAnnouncer();
    }
    return ScreenReaderAnnouncer.instance;
  }

  private createAnnounceElement() {
    if (typeof document === 'undefined') return;

    this.announceElement = document.createElement('div');
    this.announceElement.setAttribute('role', 'status');
    this.announceElement.setAttribute('aria-live', 'polite');
    this.announceElement.setAttribute('aria-atomic', 'true');
    this.announceElement.style.position = 'absolute';
    this.announceElement.style.left = '-10000px';
    this.announceElement.style.width = '1px';
    this.announceElement.style.height = '1px';
    this.announceElement.style.overflow = 'hidden';
    document.body.appendChild(this.announceElement);
  }

  announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    if (!this.announceElement) return;

    this.announceElement.setAttribute('aria-live', priority);
    this.announceElement.textContent = message;

    // Clear after announcement
    setTimeout(() => {
      if (this.announceElement) {
        this.announceElement.textContent = '';
      }
    }, 1000);
  }

  announceToolChange(tool: string) {
    this.announce(`${tool} tool activated`);
  }

  announcePanelSelection(count: number) {
    if (count === 0) {
      this.announce('All panels deselected');
    } else if (count === 1) {
      this.announce('1 panel selected');
    } else {
      this.announce(`${count} panels selected`);
    }
  }

  announceTransform(type: string, value: string) {
    this.announce(`${type}: ${value}`);
  }

  announceOperation(operation: string, success: boolean) {
    if (success) {
      this.announce(`${operation} completed successfully`);
    } else {
      this.announce(`${operation} failed`, 'assertive');
    }
  }

  announceZoom(zoom: number) {
    this.announce(`Zoom level: ${Math.round(zoom * 100)}%`);
  }

  announceLayerChange(action: string, layerName: string) {
    this.announce(`${action}: ${layerName}`);
  }
}

/**
 * Focus management utilities
 */
export class FocusManager {
  private focusStack: HTMLElement[] = [];

  /**
   * Save current focus and move to new element
   */
  pushFocus(element: HTMLElement) {
    const currentFocus = document.activeElement as HTMLElement;
    if (currentFocus) {
      this.focusStack.push(currentFocus);
    }
    element.focus();
  }

  /**
   * Restore previous focus
   */
  popFocus() {
    const previousFocus = this.focusStack.pop();
    if (previousFocus) {
      previousFocus.focus();
    }
  }

  /**
   * Trap focus within a container
   */
  trapFocus(container: HTMLElement) {
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift+Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }
}

/**
 * Keyboard navigation helper
 */
export function handleArrowKeyNavigation(
  e: KeyboardEvent,
  items: HTMLElement[],
  currentIndex: number,
  onNavigate: (newIndex: number) => void
) {
  let newIndex = currentIndex;

  switch (e.key) {
    case 'ArrowUp':
    case 'ArrowLeft':
      e.preventDefault();
      newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
      break;
    case 'ArrowDown':
    case 'ArrowRight':
      e.preventDefault();
      newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
      break;
    case 'Home':
      e.preventDefault();
      newIndex = 0;
      break;
    case 'End':
      e.preventDefault();
      newIndex = items.length - 1;
      break;
    default:
      return;
  }

  onNavigate(newIndex);
  items[newIndex]?.focus();
}

/**
 * Generate accessible description for panel
 */
export function getPanelDescription(
  row: number,
  col: number,
  hasImage: boolean,
  layerCount: number,
  isModified: boolean
): string {
  const position = `Panel at row ${row + 1}, column ${col + 1}`;
  const content = hasImage ? 'contains image' : 'empty';
  const layers = layerCount > 1 ? `, ${layerCount} layers` : '';
  const modified = isModified ? ', modified' : '';
  
  return `${position}, ${content}${layers}${modified}`;
}

/**
 * Generate accessible description for transform
 */
export function getTransformDescription(transform: {
  position: { x: number; y: number };
  scale: { x: number; y: number };
  rotation: number;
}): string {
  const position = `Position: X ${Math.round(transform.position.x)}, Y ${Math.round(transform.position.y)}`;
  const scale = `Scale: ${Math.round(transform.scale.x * 100)}% by ${Math.round(transform.scale.y * 100)}%`;
  const rotation = `Rotation: ${Math.round(transform.rotation)} degrees`;
  
  return `${position}. ${scale}. ${rotation}`;
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check if user prefers high contrast
 */
export function prefersHighContrast(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-contrast: high)').matches;
}

export default {
  ARIA_LABELS,
  KEYBOARD_SHORTCUTS,
  ScreenReaderAnnouncer,
  FocusManager,
  handleArrowKeyNavigation,
  getPanelDescription,
  getTransformDescription,
  prefersReducedMotion,
  prefersHighContrast,
};
