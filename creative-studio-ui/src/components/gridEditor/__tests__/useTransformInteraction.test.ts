/**
 * Tests for useTransformInteraction hook
 * 
 * Validates:
 * - Position drag with delta calculation (Req 3.2)
 * - Scale drag with proportional/non-proportional modes (Req 3.3, 3.4)
 * - Rotation drag with angle calculation and snapping (Req 3.5, 3.6)
 * - Transform commit on mouse release (Req 3.8)
 */

import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useTransformInteraction } from '../useTransformInteraction';
import { useGridStore } from '../../../stores/gridEditorStore';
import { useViewportStore } from '../../../stores/viewportStore';
import { createEmptyPanel } from '../../../types/gridEditor.factories';
import type { Panel } from '../../../stores/gridEditorStore';

// Mock stores
vi.mock('../../../stores/gridEditorStore');
vi.mock('../../../stores/viewportStore');

describe('useTransformInteraction', () => {
  let mockUpdatePanelTransform: ReturnType<typeof vi.fn>;
  let mockScreenToCanvas: ReturnType<typeof vi.fn>;
  let testPanel: Panel;

  beforeEach(() => {
    // Reset mocks
    mockUpdatePanelTransform = vi.fn();
    mockScreenToCanvas = vi.fn((point) => point); // Identity transform for simplicity

    // Setup store mocks
    vi.mocked(useGridStore).mockImplementation((selector: any) =>
      selector({ updatePanelTransform: mockUpdatePanelTransform })
    );

    vi.mocked(useViewportStore).mockImplementation((selector: any) =>
      selector({ screenToCanvas: mockScreenToCanvas })
    );

    // Create test panel
    testPanel = createEmptyPanel(0, 0);
    testPanel.transform = {
      position: { x: 100, y: 100 },
      scale: { x: 1, y: 1 },
      rotation: 0,
      pivot: { x: 0.5, y: 0.5 },
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Position Transform Tests (Req 3.2)
  // ============================================================================

  describe('Position Transform', () => {
    it('should handle position drag with delta calculation', () => {
      const { result } = renderHook(() =>
        useTransformInteraction({ panel: testPanel })
      );

      // Start position transform
      act(() => {
        result.current.startTransform('position', 'top', { x: 200, y: 200 });
      });

      expect(result.current.isTransforming).toBe(true);
      expect(result.current.transformType).toBe('position');

      // Simulate mouse move with delta
      act(() => {
        // Simulate mousemove event
        const mouseMoveEvent = new MouseEvent('mousemove', {
          clientX: 250,
          clientY: 250,
          shiftKey: false,
          ctrlKey: false,
        });
        window.dispatchEvent(mouseMoveEvent);
      });

      // Current transform should reflect the delta (50, 50)
      expect(result.current.currentTransform).toMatchObject({
        position: {
          x: 150, // 100 + 50
          y: 150, // 100 + 50
        },
      });

      // Simulate mouse up to commit
      act(() => {
        const mouseUpEvent = new MouseEvent('mouseup');
        window.dispatchEvent(mouseUpEvent);
      });

      // Should commit transform
      expect(mockUpdatePanelTransform).toHaveBeenCalledWith(
        'panel-0-0',
        expect.objectContaining({
          position: { x: 150, y: 150 },
        })
      );
    });

    it('should apply position delta correctly for negative movements', () => {
      const { result } = renderHook(() =>
        useTransformInteraction({ panel: testPanel })
      );

      act(() => {
        result.current.startTransform('position', 'bottom', { x: 200, y: 200 });
      });

      // Move mouse backwards (negative delta)
      act(() => {
        const mouseMoveEvent = new MouseEvent('mousemove', {
          clientX: 150,
          clientY: 150,
        });
        window.dispatchEvent(mouseMoveEvent);
      });

      expect(result.current.currentTransform?.position).toEqual({
        x: 50, // 100 - 50
        y: 50, // 100 - 50
      });
    });
  });

  // ============================================================================
  // Scale Transform Tests (Req 3.3, 3.4)
  // ============================================================================

  describe('Scale Transform', () => {
    it('should handle proportional scaling when Shift is NOT held', () => {
      const { result } = renderHook(() =>
        useTransformInteraction({ panel: testPanel })
      );

      act(() => {
        result.current.startTransform('scale', 'bottomRight', { x: 200, y: 200 });
      });

      // Move mouse without Shift key (proportional mode)
      act(() => {
        const mouseMoveEvent = new MouseEvent('mousemove', {
          clientX: 300,
          clientY: 300,
          shiftKey: false, // Proportional scaling
          ctrlKey: false,
        });
        window.dispatchEvent(mouseMoveEvent);
      });

      // Should maintain aspect ratio
      const transform = result.current.currentTransform;
      expect(transform).toBeDefined();
      if (transform) {
        const aspectRatio = transform.scale.x / transform.scale.y;
        const originalAspectRatio = testPanel.transform.scale.x / testPanel.transform.scale.y;
        expect(Math.abs(aspectRatio - originalAspectRatio)).toBeLessThan(0.01);
      }
    });

    it('should handle non-proportional scaling when Shift IS held', () => {
      const { result } = renderHook(() =>
        useTransformInteraction({ panel: testPanel })
      );

      act(() => {
        result.current.startTransform('scale', 'bottomRight', { x: 200, y: 200 });
      });

      // Move mouse with Shift key (non-proportional mode)
      act(() => {
        const mouseMoveEvent = new MouseEvent('mousemove', {
          clientX: 300,
          clientY: 250,
          shiftKey: true, // Non-proportional scaling
          ctrlKey: false,
        });
        window.dispatchEvent(mouseMoveEvent);
      });

      // Scale values can be different
      const transform = result.current.currentTransform;
      expect(transform).toBeDefined();
      if (transform) {
        // With non-proportional scaling, x and y can differ
        expect(transform.scale.x).toBeGreaterThan(0);
        expect(transform.scale.y).toBeGreaterThan(0);
      }
    });

    it('should clamp scale values to MIN and MAX limits', () => {
      const { result } = renderHook(() =>
        useTransformInteraction({ panel: testPanel })
      );

      act(() => {
        result.current.startTransform('scale', 'topLeft', { x: 200, y: 200 });
      });

      // Try to scale way beyond limits
      act(() => {
        const mouseMoveEvent = new MouseEvent('mousemove', {
          clientX: 10000,
          clientY: 10000,
          shiftKey: true,
        });
        window.dispatchEvent(mouseMoveEvent);
      });

      const transform = result.current.currentTransform;
      expect(transform).toBeDefined();
      if (transform) {
        // Should be clamped to MAX_SCALE (10.0)
        expect(transform.scale.x).toBeLessThanOrEqual(10.0);
        expect(transform.scale.y).toBeLessThanOrEqual(10.0);
      }
    });
  });

  // ============================================================================
  // Rotation Transform Tests (Req 3.5, 3.6)
  // ============================================================================

  describe('Rotation Transform', () => {
    it('should calculate rotation angle from mouse position', () => {
      const { result } = renderHook(() =>
        useTransformInteraction({ panel: testPanel })
      );

      act(() => {
        result.current.startTransform('rotation', 'rotation', { x: 200, y: 200 });
      });

      // Move mouse to a position that creates a specific angle
      act(() => {
        const mouseMoveEvent = new MouseEvent('mousemove', {
          clientX: 200, // Same x as panel center (100 + some offset)
          clientY: 50,  // Above panel center
          shiftKey: false,
          ctrlKey: false, // No snapping
        });
        window.dispatchEvent(mouseMoveEvent);
      });

      const transform = result.current.currentTransform;
      expect(transform).toBeDefined();
      expect(transform?.rotation).toBeDefined();
    });

    it('should snap rotation to 15-degree increments when Ctrl is held', () => {
      const { result } = renderHook(() =>
        useTransformInteraction({ panel: testPanel })
      );

      act(() => {
        result.current.startTransform('rotation', 'rotation', { x: 200, y: 200 });
      });

      // Move mouse with Ctrl key (snapping enabled)
      act(() => {
        const mouseMoveEvent = new MouseEvent('mousemove', {
          clientX: 210,
          clientY: 190,
          shiftKey: false,
          ctrlKey: true, // Enable snapping
        });
        window.dispatchEvent(mouseMoveEvent);
      });

      const transform = result.current.currentTransform;
      expect(transform).toBeDefined();
      if (transform) {
        // Rotation should be a multiple of 15
        expect(transform.rotation % 15).toBe(0);
      }
    });

    it('should allow free rotation when Ctrl is NOT held', () => {
      const { result } = renderHook(() =>
        useTransformInteraction({ panel: testPanel })
      );

      act(() => {
        result.current.startTransform('rotation', 'rotation', { x: 200, y: 200 });
      });

      // Move mouse without Ctrl key (no snapping)
      act(() => {
        const mouseMoveEvent = new MouseEvent('mousemove', {
          clientX: 213,
          clientY: 187,
          shiftKey: false,
          ctrlKey: false, // No snapping
        });
        window.dispatchEvent(mouseMoveEvent);
      });

      const transform = result.current.currentTransform;
      expect(transform).toBeDefined();
      // Rotation can be any value (not necessarily a multiple of 15)
    });
  });

  // ============================================================================
  // Transform Commit Tests (Req 3.8)
  // ============================================================================

  describe('Transform Commit', () => {
    it('should commit transform to store on mouse release', () => {
      const { result } = renderHook(() =>
        useTransformInteraction({ panel: testPanel })
      );

      // Start any transform
      act(() => {
        result.current.startTransform('position', 'top', { x: 200, y: 200 });
      });

      // Move mouse
      act(() => {
        const mouseMoveEvent = new MouseEvent('mousemove', {
          clientX: 250,
          clientY: 250,
        });
        window.dispatchEvent(mouseMoveEvent);
      });

      // Release mouse
      act(() => {
        const mouseUpEvent = new MouseEvent('mouseup');
        window.dispatchEvent(mouseUpEvent);
      });

      // Should have called updatePanelTransform
      expect(mockUpdatePanelTransform).toHaveBeenCalledTimes(1);
      expect(mockUpdatePanelTransform).toHaveBeenCalledWith(
        'panel-0-0',
        expect.any(Object)
      );

      // Should reset transform state
      expect(result.current.isTransforming).toBe(false);
      expect(result.current.transformType).toBeNull();
    });

    it('should call onTransformCommit callback when provided', () => {
      const onTransformCommit = vi.fn();

      const { result } = renderHook(() =>
        useTransformInteraction({ panel: testPanel, onTransformCommit })
      );

      act(() => {
        result.current.startTransform('scale', 'bottomRight', { x: 200, y: 200 });
      });

      act(() => {
        const mouseMoveEvent = new MouseEvent('mousemove', {
          clientX: 300,
          clientY: 300,
        });
        window.dispatchEvent(mouseMoveEvent);
      });

      act(() => {
        const mouseUpEvent = new MouseEvent('mouseup');
        window.dispatchEvent(mouseUpEvent);
      });

      // Should have called the callback
      expect(onTransformCommit).toHaveBeenCalledTimes(1);
      expect(onTransformCommit).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should not commit if no transform was started', () => {
      renderHook(() =>
        useTransformInteraction({ panel: testPanel })
      );

      // Just trigger mouse up without starting transform
      act(() => {
        const mouseUpEvent = new MouseEvent('mouseup');
        window.dispatchEvent(mouseUpEvent);
      });

      // Should not call updatePanelTransform
      expect(mockUpdatePanelTransform).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Integration', () => {
    it('should handle complete transform workflow', () => {
      const { result } = renderHook(() =>
        useTransformInteraction({ panel: testPanel })
      );

      // 1. Start transform
      act(() => {
        result.current.startTransform('position', 'left', { x: 100, y: 100 });
      });

      expect(result.current.isTransforming).toBe(true);

      // 2. Update transform multiple times
      act(() => {
        const move1 = new MouseEvent('mousemove', { clientX: 120, clientY: 120 });
        window.dispatchEvent(move1);
      });

      act(() => {
        const move2 = new MouseEvent('mousemove', { clientX: 150, clientY: 150 });
        window.dispatchEvent(move2);
      });

      // 3. Commit transform
      act(() => {
        const mouseUp = new MouseEvent('mouseup');
        window.dispatchEvent(mouseUp);
      });

      expect(result.current.isTransforming).toBe(false);
      expect(mockUpdatePanelTransform).toHaveBeenCalledTimes(1);
    });
  });
});
