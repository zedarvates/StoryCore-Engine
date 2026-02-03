/**
 * React Hook for Drag and Drop Animations
 * 
 * Provides easy-to-use drag-and-drop animation functions for React components.
 * 
 * Requirement 20.4: Animate ghost image and drop target highlights
 */

import { useRef, useCallback, useEffect } from 'react';
import { DragDropAnimationManager } from '../utils/dragDropAnimations';

/**
 * Hook for managing drag-and-drop animations
 * 
 * @returns Drag-and-drop animation manager and handlers
 */
export function useDragDropAnimations() {
  const managerRef = useRef<DragDropAnimationManager | null>(null);
  
  // Initialize manager
  useEffect(() => {
    managerRef.current = new DragDropAnimationManager();
    
    return () => {
      if (managerRef.current) {
        managerRef.current.cleanup();
      }
    };
  }, []);
  
  /**
   * Starts drag operation
   */
  const startDrag = useCallback((
    element: HTMLElement,
    event: MouseEvent | DragEvent,
    config?: { opacity?: number; scale?: number }
  ) => {
    if (managerRef.current) {
      managerRef.current.startDrag(element, event, config);
    }
  }, []);
  
  /**
   * Updates ghost position during drag
   */
  const updateDrag = useCallback((x: number, y: number) => {
    if (managerRef.current) {
      managerRef.current.updateGhostPosition(x, y);
    }
  }, []);
  
  /**
   * Highlights drop target
   */
  const highlightTarget = useCallback((element: HTMLElement, isValid: boolean) => {
    if (managerRef.current) {
      managerRef.current.highlightTarget(element, isValid);
    }
  }, []);
  
  /**
   * Shows drop indicator
   */
  const showIndicator = useCallback((
    position: { x: number; y: number },
    orientation: 'horizontal' | 'vertical' = 'horizontal'
  ) => {
    if (managerRef.current) {
      managerRef.current.showIndicator(position, orientation);
    }
  }, []);
  
  /**
   * Ends drag operation with success
   */
  const endDragSuccess = useCallback(async (targetElement: HTMLElement) => {
    if (managerRef.current) {
      await managerRef.current.endDragSuccess(targetElement);
    }
  }, []);
  
  /**
   * Ends drag operation with failure
   */
  const endDragFailure = useCallback(async () => {
    if (managerRef.current) {
      await managerRef.current.endDragFailure();
    }
  }, []);
  
  /**
   * Cancels drag operation
   */
  const cancelDrag = useCallback(async () => {
    if (managerRef.current) {
      await managerRef.current.cancelDrag();
    }
  }, []);
  
  return {
    startDrag,
    updateDrag,
    highlightTarget,
    showIndicator,
    endDragSuccess,
    endDragFailure,
    cancelDrag,
  };
}

/**
 * Hook for making an element draggable with animations
 * 
 * @param onDragStart - Callback when drag starts
 * @param onDragEnd - Callback when drag ends
 * @returns Ref and drag handlers
 */
export function useDraggable(
  onDragStart?: (element: HTMLElement, event: MouseEvent) => void,
  onDragEnd?: (success: boolean) => void
) {
  const ref = useRef<HTMLElement>(null);
  const { startDrag, updateDrag, endDragSuccess, endDragFailure } = useDragDropAnimations();
  const isDraggingRef = useRef(false);
  
  const handleMouseDown = useCallback((event: MouseEvent) => {
    if (ref.current && event.button === 0) { // Left mouse button only
      isDraggingRef.current = true;
      startDrag(ref.current, event);
      onDragStart?.(ref.current, event);
      
      event.preventDefault();
    }
  }, [startDrag, onDragStart]);
  
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (isDraggingRef.current) {
      updateDrag(event.clientX, event.clientY);
    }
  }, [updateDrag]);
  
  const handleMouseUp = useCallback(async (event: MouseEvent) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      
      // Check if dropped on valid target
      const dropTarget = document.elementFromPoint(event.clientX, event.clientY);
      const isValidDrop = dropTarget?.classList.contains('drop-target');
      
      if (isValidDrop && dropTarget instanceof HTMLElement) {
        await endDragSuccess(dropTarget);
        onDragEnd?.(true);
      } else {
        await endDragFailure();
        onDragEnd?.(false);
      }
    }
  }, [endDragSuccess, endDragFailure, onDragEnd]);
  
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
    element.addEventListener('mousedown', handleMouseDown as any);
    document.addEventListener('mousemove', handleMouseMove as any);
    document.addEventListener('mouseup', handleMouseUp as any);
    
    return () => {
      element.removeEventListener('mousedown', handleMouseDown as any);
      document.removeEventListener('mousemove', handleMouseMove as any);
      document.removeEventListener('mouseup', handleMouseUp as any);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp]);
  
  return ref;
}

/**
 * Hook for making an element a drop target with animations
 * 
 * @param onDrop - Callback when item is dropped
 * @param isValidDrop - Function to check if drop is valid
 * @returns Ref and drop handlers
 */
export function useDropTarget(
  onDrop?: (element: HTMLElement, event: MouseEvent) => void,
  isValidDrop?: (element: HTMLElement, event: MouseEvent) => boolean
) {
  const ref = useRef<HTMLElement>(null);
  const { highlightTarget } = useDragDropAnimations();
  
  const handleDragEnter = useCallback((event: MouseEvent) => {
    if (ref.current) {
      const isValid = isValidDrop ? isValidDrop(ref.current, event) : true;
      highlightTarget(ref.current, isValid);
    }
  }, [highlightTarget, isValidDrop]);
  
  const handleDragLeave = useCallback(() => {
    if (ref.current) {
      ref.current.classList.remove('drop-target', 'drop-target-active', 'drop-not-allowed');
    }
  }, []);
  
  const handleDrop = useCallback((event: MouseEvent) => {
    if (ref.current) {
      const isValid = isValidDrop ? isValidDrop(ref.current, event) : true;
      
      if (isValid) {
        onDrop?.(ref.current, event);
      }
      
      handleDragLeave();
    }
  }, [onDrop, isValidDrop, handleDragLeave]);
  
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
    element.addEventListener('dragenter', handleDragEnter as any);
    element.addEventListener('dragleave', handleDragLeave as any);
    element.addEventListener('drop', handleDrop as any);
    
    return () => {
      element.removeEventListener('dragenter', handleDragEnter as any);
      element.removeEventListener('dragleave', handleDragLeave as any);
      element.removeEventListener('drop', handleDrop as any);
    };
  }, [handleDragEnter, handleDragLeave, handleDrop]);
  
  return ref;
}
