/**
 * useTransformInteraction Hook - Handle transform interactions
 * 
 * Manages:
 * - Position drag with delta calculation
 * - Scale drag with proportional/non-proportional modes (Shift)
 * - Rotation drag with angle calculation and snapping (Ctrl)
 * - Transform commit on mouse release
 * 
 * Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.8
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useGridStore } from '../../stores/gridEditorStore';
import { useViewportStore } from '../../stores/viewportStore';
import type { Transform, Point, Panel } from '../../stores/gridEditorStore';

// ============================================================================
// Type Definitions
// ============================================================================

export type TransformType = 'position' | 'scale' | 'rotation';

export interface TransformInteractionState {
  isTransforming: boolean;
  transformType: TransformType | null;
  handle: string | null;
  startTransform: Transform | null;
  startMousePos: Point | null;
  currentTransform: Transform | null;
}

export interface UseTransformInteractionOptions {
  panel: Panel;
  onTransformCommit?: (transform: Transform) => void;
}

// ============================================================================
// Constants
// ============================================================================

const ROTATION_SNAP_ANGLE = 15; // degrees
const MIN_SCALE = 0.1;
const MAX_SCALE = 10.0;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate angle between two points in degrees
 */
const calculateAngle = (center: Point, point: Point): number => {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
};

/**
 * Snap angle to nearest increment
 */
const snapAngle = (angle: number, snapIncrement: number): number => {
  return Math.round(angle / snapIncrement) * snapIncrement;
};

/**
 * Clamp value between min and max
 */
const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Calculate distance between two points (reserved for future use)
 */
// const distance = (p1: Point, p2: Point): number => {
//   const dx = p2.x - p1.x;
//   const dy = p2.y - p1.y;
//   return Math.sqrt(dx * dx + dy * dy);
// };

// ============================================================================
// Hook
// ============================================================================

export const useTransformInteraction = ({
  panel,
  onTransformCommit,
}: UseTransformInteractionOptions) => {
  const updatePanelTransform = useGridStore((state) => state.updatePanelTransform);
  const screenToCanvas = useViewportStore((state) => state.screenToCanvas);

  const [state, setState] = useState<TransformInteractionState>({
    isTransforming: false,
    transformType: null,
    handle: null,
    startTransform: null,
    startMousePos: null,
    currentTransform: null,
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  // ============================================================================
  // Transform Start
  // ============================================================================

  const startTransform = useCallback(
    (type: TransformType, handle: string, mousePos: Point) => {
      setState({
        isTransforming: true,
        transformType: type,
        handle,
        startTransform: { ...panel.transform },
        startMousePos: screenToCanvas(mousePos),
        currentTransform: { ...panel.transform },
      });
    },
    [panel.transform, screenToCanvas]
  );

  // ============================================================================
  // Transform Update
  // ============================================================================

  const updateTransform = useCallback(
    (mousePos: Point, shiftKey: boolean, ctrlKey: boolean) => {
      const { transformType, handle, startTransform, startMousePos } = stateRef.current;

      if (!transformType || !startTransform || !startMousePos) return;

      const currentMousePos = screenToCanvas(mousePos);
      const delta: Point = {
        x: currentMousePos.x - startMousePos.x,
        y: currentMousePos.y - startMousePos.y,
      };

      let newTransform: Transform = { ...startTransform };

      switch (transformType) {
        case 'position':
          newTransform = handlePositionDrag(startTransform, delta);
          break;

        case 'scale':
          newTransform = handleScaleDrag(
            startTransform,
            delta,
            handle!,
            shiftKey // proportional mode
          );
          break;

        case 'rotation':
          newTransform = handleRotationDrag(
            startTransform,
            currentMousePos,
            panel,
            ctrlKey // snap mode
          );
          break;
      }

      setState((prev) => ({
        ...prev,
        currentTransform: newTransform,
      }));
    },
    [panel, screenToCanvas]
  );

  // ============================================================================
  // Transform End
  // ============================================================================

  const endTransform = useCallback(() => {
    const { currentTransform } = stateRef.current;

    if (currentTransform) {
      // Commit transform to store
      updatePanelTransform(panel.id, currentTransform);

      // Call optional callback
      if (onTransformCommit) {
        onTransformCommit(currentTransform);
      }
    }

    setState({
      isTransforming: false,
      transformType: null,
      handle: null,
      startTransform: null,
      startMousePos: null,
      currentTransform: null,
    });
  }, [panel.id, updatePanelTransform, onTransformCommit]);

  // ============================================================================
  // Position Transform Handler
  // ============================================================================

  const handlePositionDrag = (
    startTransform: Transform,
    delta: Point
  ): Transform => {
    return {
      ...startTransform,
      position: {
        x: startTransform.position.x + delta.x,
        y: startTransform.position.y + delta.y,
      },
    };
  };

  // ============================================================================
  // Scale Transform Handler
  // ============================================================================

  const handleScaleDrag = (
    startTransform: Transform,
    delta: Point,
    handle: string,
    proportional: boolean
  ): Transform => {
    // Calculate scale factor based on handle and delta
    let scaleX = startTransform.scale.x;
    let scaleY = startTransform.scale.y;

    // Determine scale direction based on handle
    const scaleFactor = 0.01; // Sensitivity

    switch (handle) {
      case 'topLeft':
        scaleX = clamp(
          startTransform.scale.x - delta.x * scaleFactor,
          MIN_SCALE,
          MAX_SCALE
        );
        scaleY = clamp(
          startTransform.scale.y - delta.y * scaleFactor,
          MIN_SCALE,
          MAX_SCALE
        );
        break;

      case 'topRight':
        scaleX = clamp(
          startTransform.scale.x + delta.x * scaleFactor,
          MIN_SCALE,
          MAX_SCALE
        );
        scaleY = clamp(
          startTransform.scale.y - delta.y * scaleFactor,
          MIN_SCALE,
          MAX_SCALE
        );
        break;

      case 'bottomLeft':
        scaleX = clamp(
          startTransform.scale.x - delta.x * scaleFactor,
          MIN_SCALE,
          MAX_SCALE
        );
        scaleY = clamp(
          startTransform.scale.y + delta.y * scaleFactor,
          MIN_SCALE,
          MAX_SCALE
        );
        break;

      case 'bottomRight':
        scaleX = clamp(
          startTransform.scale.x + delta.x * scaleFactor,
          MIN_SCALE,
          MAX_SCALE
        );
        scaleY = clamp(
          startTransform.scale.y + delta.y * scaleFactor,
          MIN_SCALE,
          MAX_SCALE
        );
        break;
    }

    // Apply proportional scaling if Shift is NOT held
    // Requirements: 3.3, 3.4
    if (!proportional) {
      // Maintain aspect ratio
      const aspectRatio = startTransform.scale.x / startTransform.scale.y;
      const avgScale = (scaleX + scaleY) / 2;
      scaleX = avgScale;
      scaleY = avgScale / aspectRatio;
    }

    return {
      ...startTransform,
      scale: {
        x: scaleX,
        y: scaleY,
      },
    };
  };

  // ============================================================================
  // Rotation Transform Handler
  // ============================================================================

  const handleRotationDrag = (
    startTransform: Transform,
    mousePos: Point,
    panel: Panel,
    snap: boolean
  ): Transform => {
    // Calculate panel center in canvas space
    const panelCenter: Point = {
      x: panel.transform.position.x,
      y: panel.transform.position.y,
    };

    // Calculate angle from center to mouse
    let angle = calculateAngle(panelCenter, mousePos);

    // Apply snapping if Ctrl is held
    // Requirements: 3.6
    if (snap) {
      angle = snapAngle(angle, ROTATION_SNAP_ANGLE);
    }

    return {
      ...startTransform,
      rotation: angle,
    };
  };

  // ============================================================================
  // Mouse Event Handlers
  // ============================================================================

  useEffect(() => {
    if (!state.isTransforming) return;

    const handleMouseMove = (event: MouseEvent) => {
      updateTransform(
        { x: event.clientX, y: event.clientY },
        event.shiftKey,
        event.ctrlKey
      );
    };

    const handleMouseUp = () => {
      endTransform();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [state.isTransforming, updateTransform, endTransform]);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    isTransforming: state.isTransforming,
    transformType: state.transformType,
    currentTransform: state.currentTransform,
    startTransform,
  };
};
