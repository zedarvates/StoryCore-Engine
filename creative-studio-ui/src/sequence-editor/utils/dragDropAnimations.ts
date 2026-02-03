/**
 * Drag and Drop Animation Utilities
 * 
 * Provides animation functions specifically for drag-and-drop interactions.
 * 
 * Requirement 20.4: Animate ghost image and drop target highlights
 */

import { ANIMATION_TIMING, EASING, createTransition } from './animations';

/**
 * Drag state types
 */
export type DragState = 'idle' | 'dragging' | 'over' | 'invalid';

/**
 * Drop target configuration
 */
export interface DropTargetConfig {
  element: HTMLElement;
  isValid: boolean;
  highlightColor?: string;
  invalidColor?: string;
}

/**
 * Drag ghost configuration
 */
export interface DragGhostConfig {
  element: HTMLElement;
  opacity?: number;
  scale?: number;
  offset?: { x: number; y: number };
}

/**
 * Creates and animates a drag ghost image
 * Requirement 20.4: Animate ghost images during drag
 * 
 * @param config - Drag ghost configuration
 * @returns Ghost element
 */
export function createDragGhost(config: DragGhostConfig): HTMLElement {
  const { element, opacity = 0.7, scale = 0.95, offset = { x: 0, y: 0 } } = config;
  
  // Clone the element
  const ghost = element.cloneNode(true) as HTMLElement;
  
  // Style the ghost
  ghost.style.position = 'fixed';
  ghost.style.pointerEvents = 'none';
  ghost.style.zIndex = '9999';
  ghost.style.opacity = opacity.toString();
  ghost.style.transform = `scale(${scale})`;
  ghost.style.transition = createTransition({
    duration: ANIMATION_TIMING.FAST,
    easing: EASING.EASE_IN_OUT,
    properties: ['opacity', 'transform']
  });
  
  // Add ghost class for additional styling
  ghost.classList.add('drag-ghost');
  
  // Position the ghost
  const rect = element.getBoundingClientRect();
  ghost.style.left = `${rect.left + offset.x}px`;
  ghost.style.top = `${rect.top + offset.y}px`;
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
  
  document.body.appendChild(ghost);
  
  return ghost;
}

/**
 * Updates drag ghost position
 * 
 * @param ghost - Ghost element
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param offset - Offset from cursor
 */
export function updateDragGhostPosition(
  ghost: HTMLElement,
  x: number,
  y: number,
  offset: { x: number; y: number } = { x: 0, y: 0 }
): void {
  ghost.style.left = `${x + offset.x}px`;
  ghost.style.top = `${y + offset.y}px`;
}

/**
 * Removes drag ghost with fade-out animation
 * 
 * @param ghost - Ghost element
 * @returns Promise that resolves when animation completes
 */
export function removeDragGhost(ghost: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    ghost.style.opacity = '0';
    ghost.style.transform = 'scale(0.8)';
    
    setTimeout(() => {
      ghost.remove();
      resolve();
    }, ANIMATION_TIMING.FAST);
  });
}

/**
 * Highlights a drop target
 * Requirement 20.4: Highlight drop targets with smooth transitions
 * 
 * @param config - Drop target configuration
 */
export function highlightDropTarget(config: DropTargetConfig): void {
  const { element, isValid, highlightColor, invalidColor } = config;
  
  // Apply transition
  element.style.transition = createTransition({
    duration: ANIMATION_TIMING.FAST,
    easing: EASING.EASE_IN_OUT,
    properties: ['outline-color', 'background-color', 'border-color']
  });
  
  if (isValid) {
    // Valid drop target
    element.classList.add('drop-target');
    element.classList.remove('drop-not-allowed');
    
    if (highlightColor) {
      element.style.outlineColor = highlightColor;
      element.style.backgroundColor = `${highlightColor}1a`; // 10% opacity
    }
  } else {
    // Invalid drop target
    element.classList.add('drop-not-allowed');
    element.classList.remove('drop-target');
    
    if (invalidColor) {
      element.style.outlineColor = invalidColor;
      element.style.backgroundColor = `${invalidColor}1a`; // 10% opacity
    }
    
    // Show "not allowed" cursor
    element.style.cursor = 'not-allowed';
  }
}

/**
 * Activates drop target animation (pulsing effect)
 * 
 * @param element - Drop target element
 */
export function activateDropTarget(element: HTMLElement): void {
  element.classList.add('drop-target-active');
}

/**
 * Deactivates drop target animation
 * 
 * @param element - Drop target element
 */
export function deactivateDropTarget(element: HTMLElement): void {
  element.classList.remove('drop-target-active');
}

/**
 * Removes drop target highlight
 * 
 * @param element - Drop target element
 */
export function removeDropTargetHighlight(element: HTMLElement): void {
  element.classList.remove('drop-target', 'drop-target-active', 'drop-not-allowed');
  element.style.outlineColor = '';
  element.style.backgroundColor = '';
  element.style.cursor = '';
}

/**
 * Shows "not allowed" cursor for invalid drop
 * Requirement 20.4: Show "not allowed" cursor for invalid drops
 * 
 * @param element - Element to show cursor on
 */
export function showNotAllowedCursor(element: HTMLElement): void {
  element.style.cursor = 'not-allowed';
  element.classList.add('drop-not-allowed');
}

/**
 * Hides "not allowed" cursor
 * 
 * @param element - Element to hide cursor on
 */
export function hideNotAllowedCursor(element: HTMLElement): void {
  element.style.cursor = '';
  element.classList.remove('drop-not-allowed');
}

/**
 * Animates successful drop
 * 
 * @param element - Element that was dropped
 * @param targetElement - Drop target element
 * @returns Promise that resolves when animation completes
 */
export function animateSuccessfulDrop(
  element: HTMLElement,
  targetElement: HTMLElement
): Promise<void> {
  return new Promise((resolve) => {
    const targetRect = targetElement.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    
    // Calculate translation
    const translateX = targetRect.left - elementRect.left;
    const translateY = targetRect.top - elementRect.top;
    
    // Apply animation
    element.style.transition = createTransition({
      duration: ANIMATION_TIMING.NORMAL,
      easing: EASING.EASE_IN_OUT,
      properties: ['transform', 'opacity']
    });
    
    element.style.transform = `translate(${translateX}px, ${translateY}px) scale(0.9)`;
    element.style.opacity = '0';
    
    setTimeout(() => {
      resolve();
    }, ANIMATION_TIMING.NORMAL);
  });
}

/**
 * Animates failed drop (snap back)
 * 
 * @param element - Element that was dropped
 * @param originalPosition - Original position before drag
 * @returns Promise that resolves when animation completes
 */
export function animateFailedDrop(
  element: HTMLElement,
  originalPosition: { x: number; y: number }
): Promise<void> {
  return new Promise((resolve) => {
    const currentRect = element.getBoundingClientRect();
    
    // Calculate translation back to original position
    const translateX = originalPosition.x - currentRect.left;
    const translateY = originalPosition.y - currentRect.top;
    
    // Apply animation
    element.style.transition = createTransition({
      duration: ANIMATION_TIMING.NORMAL,
      easing: EASING.EASE_OUT,
      properties: ['transform']
    });
    
    element.style.transform = `translate(${translateX}px, ${translateY}px)`;
    
    setTimeout(() => {
      element.style.transform = '';
      resolve();
    }, ANIMATION_TIMING.NORMAL);
  });
}

/**
 * Creates a drop indicator line
 * 
 * @param position - Position to show indicator
 * @param orientation - Horizontal or vertical
 * @returns Indicator element
 */
export function createDropIndicator(
  position: { x: number; y: number },
  orientation: 'horizontal' | 'vertical' = 'horizontal'
): HTMLElement {
  const indicator = document.createElement('div');
  
  indicator.style.position = 'fixed';
  indicator.style.backgroundColor = 'var(--accent-color, #4A90E2)';
  indicator.style.pointerEvents = 'none';
  indicator.style.zIndex = '9998';
  indicator.style.boxShadow = '0 0 4px var(--accent-color, #4A90E2)';
  indicator.style.transition = createTransition({
    duration: ANIMATION_TIMING.FAST,
    easing: EASING.EASE_IN_OUT,
    properties: ['left', 'top', 'width', 'height']
  });
  
  if (orientation === 'horizontal') {
    indicator.style.left = '0';
    indicator.style.top = `${position.y}px`;
    indicator.style.width = '100%';
    indicator.style.height = '2px';
  } else {
    indicator.style.left = `${position.x}px`;
    indicator.style.top = '0';
    indicator.style.width = '2px';
    indicator.style.height = '100%';
  }
  
  document.body.appendChild(indicator);
  
  // Fade in
  indicator.style.opacity = '0';
  requestAnimationFrame(() => {
    indicator.style.opacity = '1';
  });
  
  return indicator;
}

/**
 * Updates drop indicator position
 * 
 * @param indicator - Indicator element
 * @param position - New position
 * @param orientation - Horizontal or vertical
 */
export function updateDropIndicator(
  indicator: HTMLElement,
  position: { x: number; y: number },
  orientation: 'horizontal' | 'vertical' = 'horizontal'
): void {
  if (orientation === 'horizontal') {
    indicator.style.top = `${position.y}px`;
  } else {
    indicator.style.left = `${position.x}px`;
  }
}

/**
 * Removes drop indicator
 * 
 * @param indicator - Indicator element
 * @returns Promise that resolves when animation completes
 */
export function removeDropIndicator(indicator: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    indicator.style.opacity = '0';
    
    setTimeout(() => {
      indicator.remove();
      resolve();
    }, ANIMATION_TIMING.FAST);
  });
}

/**
 * Drag and drop manager class
 * Manages the complete drag-and-drop animation lifecycle
 */
export class DragDropAnimationManager {
  private ghost: HTMLElement | null = null;
  private indicator: HTMLElement | null = null;
  private activeDropTarget: HTMLElement | null = null;
  private originalPosition: { x: number; y: number } | null = null;
  
  /**
   * Starts drag operation
   * 
   * @param element - Element being dragged
   * @param event - Drag event
   * @param config - Ghost configuration
   */
  startDrag(
    element: HTMLElement,
    event: MouseEvent | DragEvent,
    config?: Partial<DragGhostConfig>
  ): void {
    const rect = element.getBoundingClientRect();
    this.originalPosition = { x: rect.left, y: rect.top };
    
    this.ghost = createDragGhost({
      element,
      ...config
    });
    
    // Update ghost position
    this.updateGhostPosition(event.clientX, event.clientY);
  }
  
  /**
   * Updates ghost position during drag
   * 
   * @param x - X coordinate
   * @param y - Y coordinate
   */
  updateGhostPosition(x: number, y: number): void {
    if (this.ghost) {
      updateDragGhostPosition(this.ghost, x, y, { x: 10, y: 10 });
    }
  }
  
  /**
   * Highlights drop target
   * 
   * @param element - Drop target element
   * @param isValid - Whether drop is valid
   */
  highlightTarget(element: HTMLElement, isValid: boolean): void {
    // Remove previous highlight
    if (this.activeDropTarget && this.activeDropTarget !== element) {
      removeDropTargetHighlight(this.activeDropTarget);
    }
    
    this.activeDropTarget = element;
    highlightDropTarget({ element, isValid });
    
    if (isValid) {
      activateDropTarget(element);
    }
  }
  
  /**
   * Shows drop indicator
   * 
   * @param position - Position to show indicator
   * @param orientation - Horizontal or vertical
   */
  showIndicator(
    position: { x: number; y: number },
    orientation: 'horizontal' | 'vertical' = 'horizontal'
  ): void {
    if (this.indicator) {
      updateDropIndicator(this.indicator, position, orientation);
    } else {
      this.indicator = createDropIndicator(position, orientation);
    }
  }
  
  /**
   * Ends drag operation with success
   * 
   * @param targetElement - Drop target element
   * @returns Promise that resolves when animation completes
   */
  async endDragSuccess(targetElement: HTMLElement): Promise<void> {
    if (this.ghost) {
      await removeDragGhost(this.ghost);
      this.ghost = null;
    }
    
    if (this.indicator) {
      await removeDropIndicator(this.indicator);
      this.indicator = null;
    }
    
    if (this.activeDropTarget) {
      removeDropTargetHighlight(this.activeDropTarget);
      this.activeDropTarget = null;
    }
    
    this.originalPosition = null;
  }
  
  /**
   * Ends drag operation with failure
   * 
   * @returns Promise that resolves when animation completes
   */
  async endDragFailure(): Promise<void> {
    if (this.ghost && this.originalPosition) {
      await animateFailedDrop(this.ghost, this.originalPosition);
      await removeDragGhost(this.ghost);
      this.ghost = null;
    }
    
    if (this.indicator) {
      await removeDropIndicator(this.indicator);
      this.indicator = null;
    }
    
    if (this.activeDropTarget) {
      removeDropTargetHighlight(this.activeDropTarget);
      this.activeDropTarget = null;
    }
    
    this.originalPosition = null;
  }
  
  /**
   * Cancels drag operation
   */
  async cancelDrag(): Promise<void> {
    await this.endDragFailure();
  }
  
  /**
   * Cleans up all drag-related elements
   */
  cleanup(): void {
    if (this.ghost) {
      this.ghost.remove();
      this.ghost = null;
    }
    
    if (this.indicator) {
      this.indicator.remove();
      this.indicator = null;
    }
    
    if (this.activeDropTarget) {
      removeDropTargetHighlight(this.activeDropTarget);
      this.activeDropTarget = null;
    }
    
    this.originalPosition = null;
  }
}
