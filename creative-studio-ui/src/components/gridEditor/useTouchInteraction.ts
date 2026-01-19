/**
 * useTouchInteraction Hook
 * 
 * Provides touch interaction support for tablets and mobile devices:
 * - Touch-based pan and zoom (pinch-to-zoom)
 * - Touch-based transform operations
 * - Long-press for context menus
 * - Swipe gestures
 */

import { useEffect, useRef, useCallback } from 'react';
import { useViewportStore } from '../../stores/viewportStore';

interface TouchPoint {
  x: number;
  y: number;
}

interface TouchInteractionOptions {
  enablePinchZoom?: boolean;
  enablePan?: boolean;
  enableLongPress?: boolean;
  longPressDuration?: number;
  onLongPress?: (point: TouchPoint) => void;
  onSwipe?: (direction: 'left' | 'right' | 'up' | 'down') => void;
}

/**
 * Calculate distance between two touch points
 */
function getTouchDistance(touch1: Touch, touch2: Touch): number {
  const dx = touch1.clientX - touch2.clientX;
  const dy = touch1.clientY - touch2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate center point between two touches
 */
function getTouchCenter(touch1: Touch, touch2: Touch): TouchPoint {
  return {
    x: (touch1.clientX + touch2.clientX) / 2,
    y: (touch1.clientY + touch2.clientY) / 2,
  };
}

/**
 * Hook for touch interactions
 */
export function useTouchInteraction(
  elementRef: React.RefObject<HTMLElement | null>,
  options: TouchInteractionOptions = {}
) {
  const {
    enablePinchZoom = true,
    enablePan = true,
    enableLongPress = true,
    longPressDuration = 500,
    onLongPress,
    onSwipe,
  } = options;

  const { setZoom, setPan, zoom, pan } = useViewportStore();

  const touchStateRef = useRef({
    initialDistance: 0,
    initialZoom: 1,
    initialPan: { x: 0, y: 0 },
    lastTouchPoint: null as TouchPoint | null,
    longPressTimer: null as ReturnType<typeof setTimeout> | null,
    swipeStartPoint: null as TouchPoint | null,
    swipeStartTime: 0,
  });

  /**
   * Handle touch start
   */
  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      const touches = e.touches;

      if (touches.length === 1) {
        // Single touch - potential pan or long press
        const touch = touches[0];
        const point = { x: touch.clientX, y: touch.clientY };

        touchStateRef.current.lastTouchPoint = point;
        touchStateRef.current.swipeStartPoint = point;
        touchStateRef.current.swipeStartTime = Date.now();

        // Start long press timer
        if (enableLongPress && onLongPress) {
          touchStateRef.current.longPressTimer = setTimeout(() => {
            onLongPress(point);
          }, longPressDuration);
        }
      } else if (touches.length === 2 && enablePinchZoom) {
        // Two touches - pinch zoom
        touchStateRef.current.initialDistance = getTouchDistance(touches[0], touches[1]);
        touchStateRef.current.initialZoom = zoom;

        // Cancel long press
        if (touchStateRef.current.longPressTimer) {
          clearTimeout(touchStateRef.current.longPressTimer);
          touchStateRef.current.longPressTimer = null;
        }
      }
    },
    [enableLongPress, enablePinchZoom, longPressDuration, onLongPress, zoom]
  );

  /**
   * Handle touch move
   */
  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      const touches = e.touches;

      // Cancel long press on move
      if (touchStateRef.current.longPressTimer) {
        clearTimeout(touchStateRef.current.longPressTimer);
        touchStateRef.current.longPressTimer = null;
      }

      if (touches.length === 1 && enablePan) {
        // Single touch - pan
        const touch = touches[0];
        const currentPoint = { x: touch.clientX, y: touch.clientY };
        const lastPoint = touchStateRef.current.lastTouchPoint;

        if (lastPoint) {
          const dx = currentPoint.x - lastPoint.x;
          const dy = currentPoint.y - lastPoint.y;

          setPan({
            x: pan.x + dx,
            y: pan.y + dy,
          });
        }

        touchStateRef.current.lastTouchPoint = currentPoint;
      } else if (touches.length === 2 && enablePinchZoom) {
        // Two touches - pinch zoom
        const currentDistance = getTouchDistance(touches[0], touches[1]);
        const initialDistance = touchStateRef.current.initialDistance;

        if (initialDistance > 0) {
          const scale = currentDistance / initialDistance;
          const newZoom = touchStateRef.current.initialZoom * scale;

          // Clamp zoom between 0.1 and 10
          const clampedZoom = Math.max(0.1, Math.min(10, newZoom));

          // Get center point for zoom
          const center = getTouchCenter(touches[0], touches[1]);

          // Calculate new pan to keep center point stable
          const zoomRatio = clampedZoom / zoom;
          const newPan = {
            x: center.x - (center.x - pan.x) * zoomRatio,
            y: center.y - (center.y - pan.y) * zoomRatio,
          };

          setZoom(clampedZoom);
          setPan(newPan);
        }
      }
    },
    [enablePan, enablePinchZoom, pan, zoom, setPan, setZoom]
  );

  /**
   * Handle touch end
   */
  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      // Cancel long press
      if (touchStateRef.current.longPressTimer) {
        clearTimeout(touchStateRef.current.longPressTimer);
        touchStateRef.current.longPressTimer = null;
      }

      // Detect swipe gesture
      if (onSwipe && touchStateRef.current.swipeStartPoint) {
        const touch = e.changedTouches[0];
        const endPoint = { x: touch.clientX, y: touch.clientY };
        const startPoint = touchStateRef.current.swipeStartPoint;
        const duration = Date.now() - touchStateRef.current.swipeStartTime;

        const dx = endPoint.x - startPoint.x;
        const dy = endPoint.y - startPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Swipe detection: minimum distance 50px, maximum duration 300ms
        if (distance > 50 && duration < 300) {
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);

          if (angle >= -45 && angle < 45) {
            onSwipe('right');
          } else if (angle >= 45 && angle < 135) {
            onSwipe('down');
          } else if (angle >= -135 && angle < -45) {
            onSwipe('up');
          } else {
            onSwipe('left');
          }
        }
      }

      // Reset state
      touchStateRef.current.lastTouchPoint = null;
      touchStateRef.current.swipeStartPoint = null;
      touchStateRef.current.initialDistance = 0;
    },
    [onSwipe]
  );

  /**
   * Set up touch event listeners
   */
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);

      // Clean up timer
      if (touchStateRef.current.longPressTimer) {
        clearTimeout(touchStateRef.current.longPressTimer);
      }
    };
  }, [elementRef, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    // Expose touch state if needed
    isTouchDevice: 'ontouchstart' in window,
  };
}

export default useTouchInteraction;
