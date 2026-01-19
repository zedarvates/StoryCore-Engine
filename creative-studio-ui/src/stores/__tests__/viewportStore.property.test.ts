/**
 * Property-Based Tests for ViewportStore Transformations
 * 
 * Task 2.6: Write property tests for viewport transformations
 * 
 * These tests verify:
 * - Property 17: Zoom Center Preservation
 * - Property 18: Viewport Pan Delta
 * 
 * Validates: Requirements 7.1, 7.2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { useViewportStore, type Point } from '../viewportStore';

describe('ViewportStore Transformations - Property-Based Tests', () => {
  beforeEach(() => {
    // Reset viewport to default state
    useViewportStore.getState().resetViewport();
  });

  describe('Property 17: Zoom Center Preservation', () => {
    it('should keep the point under cursor at same screen position when zooming', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Initial viewport state
          fc.record({
            zoom: fc.double({ min: 0.5, max: 5.0, noNaN: true }),
            pan: fc.record({
              x: fc.integer({ min: -1000, max: 1000 }),
              y: fc.integer({ min: -1000, max: 1000 }),
            }),
          }),
          // Cursor position (point to preserve)
          fc.record({
            x: fc.integer({ min: 0, max: 1920 }),
            y: fc.integer({ min: 0, max: 1080 }),
          }),
          // New zoom level
          fc.double({ min: 0.1, max: 10.0, noNaN: true }),
          async (initialState, cursorPoint, newZoom) => {
            // Reset and set initial state
            useViewportStore.getState().resetViewport();
            useViewportStore.getState().setZoom(initialState.zoom);
            useViewportStore.getState().setPan(initialState.pan);
            
            // Convert cursor point to canvas coordinates before zoom
            const canvasPointBefore = useViewportStore.getState().screenToCanvas(cursorPoint);
            
            // Zoom to point (this should preserve the cursor position)
            useViewportStore.getState().zoomToPoint(newZoom, cursorPoint);
            
            // Convert the same canvas point back to screen coordinates after zoom
            const screenPointAfter = useViewportStore.getState().canvasToScreen(canvasPointBefore);
            
            // Property: The screen position should be preserved (within floating point tolerance)
            const tolerance = 0.1; // Allow small floating point errors
            expect(Math.abs(screenPointAfter.x - cursorPoint.x)).toBeLessThan(tolerance);
            expect(Math.abs(screenPointAfter.y - cursorPoint.y)).toBeLessThan(tolerance);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve center point when zooming from any initial state', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Initial zoom and pan
          fc.record({
            zoom: fc.double({ min: 0.5, max: 5.0, noNaN: true }),
            pan: fc.record({
              x: fc.integer({ min: -500, max: 500 }),
              y: fc.integer({ min: -500, max: 500 }),
            }),
          }),
          // Center point to preserve
          fc.record({
            x: fc.integer({ min: 500, max: 1420 }), // Center region of 1920px viewport
            y: fc.integer({ min: 300, max: 780 }), // Center region of 1080px viewport
          }),
          // Zoom factor
          fc.double({ min: 0.5, max: 2.0, noNaN: true }),
          async (initialState, centerPoint, zoomFactor) => {
            // Reset and set initial state
            useViewportStore.getState().resetViewport();
            useViewportStore.getState().setZoom(initialState.zoom);
            useViewportStore.getState().setPan(initialState.pan);
            
            const oldZoom = useViewportStore.getState().zoom;
            const newZoom = Math.max(0.1, Math.min(10.0, oldZoom * zoomFactor));
            
            // Get canvas coordinates before zoom
            const canvasPointBefore = useViewportStore.getState().screenToCanvas(centerPoint);
            
            // Zoom to point
            useViewportStore.getState().zoomToPoint(newZoom, centerPoint);
            
            // Get screen coordinates after zoom
            const screenPointAfter = useViewportStore.getState().canvasToScreen(canvasPointBefore);
            
            // Property: Center point should remain at same screen position
            const tolerance = 0.5;
            expect(Math.abs(screenPointAfter.x - centerPoint.x)).toBeLessThan(tolerance);
            expect(Math.abs(screenPointAfter.y - centerPoint.y)).toBeLessThan(tolerance);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain zoom center across multiple zoom operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Fixed point to preserve
          fc.record({
            x: fc.integer({ min: 400, max: 1520 }),
            y: fc.integer({ min: 200, max: 880 }),
          }),
          // Sequence of zoom operations
          fc.array(
            fc.double({ min: 0.5, max: 3.0, noNaN: true }),
            { minLength: 2, maxLength: 5 }
          ),
          async (fixedPoint, zoomSequence) => {
            // Reset viewport
            useViewportStore.getState().resetViewport();
            
            // Get initial canvas coordinates
            const initialCanvasPoint = useViewportStore.getState().screenToCanvas(fixedPoint);
            
            // Apply sequence of zooms
            for (const zoomFactor of zoomSequence) {
              const currentZoom = useViewportStore.getState().zoom;
              const newZoom = Math.max(0.1, Math.min(10.0, currentZoom * zoomFactor));
              useViewportStore.getState().zoomToPoint(newZoom, fixedPoint);
            }
            
            // Get final screen coordinates
            const finalScreenPoint = useViewportStore.getState().canvasToScreen(initialCanvasPoint);
            
            // Property: After multiple zooms, the point should still be at same screen position
            const tolerance = 1.0; // Slightly larger tolerance for accumulated errors
            expect(Math.abs(finalScreenPoint.x - fixedPoint.x)).toBeLessThan(tolerance);
            expect(Math.abs(finalScreenPoint.y - fixedPoint.y)).toBeLessThan(tolerance);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle zoom center preservation at viewport edges', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Edge points (corners and edges of viewport)
          fc.constantFrom(
            { x: 0, y: 0 },       // Top-left corner
            { x: 1920, y: 0 },    // Top-right corner
            { x: 0, y: 1080 },    // Bottom-left corner
            { x: 1920, y: 1080 }, // Bottom-right corner
            { x: 960, y: 0 },     // Top edge center
            { x: 960, y: 1080 },  // Bottom edge center
            { x: 0, y: 540 },     // Left edge center
            { x: 1920, y: 540 }   // Right edge center
          ),
          // Zoom level
          fc.double({ min: 0.5, max: 5.0, noNaN: true }),
          async (edgePoint, newZoom) => {
            // Reset viewport
            useViewportStore.getState().resetViewport();
            
            // Get canvas coordinates before zoom
            const canvasPointBefore = useViewportStore.getState().screenToCanvas(edgePoint);
            
            // Zoom to edge point
            useViewportStore.getState().zoomToPoint(newZoom, edgePoint);
            
            // Get screen coordinates after zoom
            const screenPointAfter = useViewportStore.getState().canvasToScreen(canvasPointBefore);
            
            // Property: Edge point should be preserved
            const tolerance = 0.5;
            expect(Math.abs(screenPointAfter.x - edgePoint.x)).toBeLessThan(tolerance);
            expect(Math.abs(screenPointAfter.y - edgePoint.y)).toBeLessThan(tolerance);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 18: Viewport Pan Delta', () => {
    it('should change pan offset by exactly the delta amount', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Initial pan state
          fc.record({
            x: fc.integer({ min: -1000, max: 1000 }),
            y: fc.integer({ min: -1000, max: 1000 }),
          }),
          // Pan delta
          fc.record({
            x: fc.integer({ min: -500, max: 500 }),
            y: fc.integer({ min: -500, max: 500 }),
          }),
          async (initialPan, delta) => {
            // Reset and set initial state
            useViewportStore.getState().resetViewport();
            useViewportStore.getState().setPan(initialPan);
            
            // Apply pan delta
            useViewportStore.getState().panBy(delta);
            
            // Property: New pan should equal initial pan plus delta
            const newPan = useViewportStore.getState().pan;
            expect(newPan.x).toBe(initialPan.x + delta.x);
            expect(newPan.y).toBe(initialPan.y + delta.y);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accumulate multiple pan deltas correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Initial pan state
          fc.record({
            x: fc.integer({ min: -500, max: 500 }),
            y: fc.integer({ min: -500, max: 500 }),
          }),
          // Sequence of pan deltas
          fc.array(
            fc.record({
              x: fc.integer({ min: -100, max: 100 }),
              y: fc.integer({ min: -100, max: 100 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (initialPan, deltas) => {
            // Reset and set initial state
            useViewportStore.getState().resetViewport();
            useViewportStore.getState().setPan(initialPan);
            
            // Calculate expected final pan
            const expectedPan = deltas.reduce(
              (acc, delta) => ({
                x: acc.x + delta.x,
                y: acc.y + delta.y,
              }),
              initialPan
            );
            
            // Apply all deltas
            for (const delta of deltas) {
              useViewportStore.getState().panBy(delta);
            }
            
            // Property: Final pan should equal sum of all deltas
            const finalPan = useViewportStore.getState().pan;
            expect(finalPan.x).toBe(expectedPan.x);
            expect(finalPan.y).toBe(expectedPan.y);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle zero delta (no-op)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            x: fc.integer({ min: -1000, max: 1000 }),
            y: fc.integer({ min: -1000, max: 1000 }),
          }),
          async (initialPan) => {
            // Reset and set initial state
            useViewportStore.getState().resetViewport();
            useViewportStore.getState().setPan(initialPan);
            
            // Apply zero delta
            useViewportStore.getState().panBy({ x: 0, y: 0 });
            
            // Property: Pan should remain unchanged
            const newPan = useViewportStore.getState().pan;
            expect(newPan.x).toBe(initialPan.x);
            expect(newPan.y).toBe(initialPan.y);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle negative deltas (panning in opposite direction)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            x: fc.integer({ min: -500, max: 500 }),
            y: fc.integer({ min: -500, max: 500 }),
          }),
          fc.record({
            x: fc.integer({ min: -500, max: 500 }),
            y: fc.integer({ min: -500, max: 500 }),
          }),
          async (initialPan, delta) => {
            // Reset and set initial state
            useViewportStore.getState().resetViewport();
            useViewportStore.getState().setPan(initialPan);
            
            // Pan forward
            useViewportStore.getState().panBy(delta);
            const panAfterForward = useViewportStore.getState().pan;
            
            // Pan backward (negative delta)
            useViewportStore.getState().panBy({ x: -delta.x, y: -delta.y });
            
            // Property: Should return to initial pan
            const finalPan = useViewportStore.getState().pan;
            expect(finalPan.x).toBe(initialPan.x);
            expect(finalPan.y).toBe(initialPan.y);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain pan delta independence from zoom level', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Zoom level
          fc.double({ min: 0.5, max: 5.0, noNaN: true }),
          // Initial pan
          fc.record({
            x: fc.integer({ min: -500, max: 500 }),
            y: fc.integer({ min: -500, max: 500 }),
          }),
          // Pan delta
          fc.record({
            x: fc.integer({ min: -200, max: 200 }),
            y: fc.integer({ min: -200, max: 200 }),
          }),
          async (zoom, initialPan, delta) => {
            // Reset and set initial state
            useViewportStore.getState().resetViewport();
            useViewportStore.getState().setZoom(zoom);
            useViewportStore.getState().setPan(initialPan);
            
            // Apply pan delta
            useViewportStore.getState().panBy(delta);
            
            // Property: Pan delta should be independent of zoom level
            const newPan = useViewportStore.getState().pan;
            expect(newPan.x).toBe(initialPan.x + delta.x);
            expect(newPan.y).toBe(initialPan.y + delta.y);
            
            // Zoom level should remain unchanged
            expect(useViewportStore.getState().zoom).toBe(zoom);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Coordinate Transformation Properties', () => {
    it('should maintain round-trip consistency (screen -> canvas -> screen)', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Viewport state
          fc.record({
            zoom: fc.double({ min: 0.5, max: 5.0, noNaN: true }),
            pan: fc.record({
              x: fc.integer({ min: -500, max: 500 }),
              y: fc.integer({ min: -500, max: 500 }),
            }),
          }),
          // Screen point
          fc.record({
            x: fc.integer({ min: 0, max: 1920 }),
            y: fc.integer({ min: 0, max: 1080 }),
          }),
          async (viewportState, screenPoint) => {
            // Reset and set viewport state
            useViewportStore.getState().resetViewport();
            useViewportStore.getState().setZoom(viewportState.zoom);
            useViewportStore.getState().setPan(viewportState.pan);
            
            // Transform screen -> canvas -> screen
            const canvasPoint = useViewportStore.getState().screenToCanvas(screenPoint);
            const backToScreen = useViewportStore.getState().canvasToScreen(canvasPoint);
            
            // Property: Round trip should preserve coordinates
            const tolerance = 0.01; // Very small tolerance for floating point
            expect(Math.abs(backToScreen.x - screenPoint.x)).toBeLessThan(tolerance);
            expect(Math.abs(backToScreen.y - screenPoint.y)).toBeLessThan(tolerance);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain round-trip consistency (canvas -> screen -> canvas)', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Viewport state
          fc.record({
            zoom: fc.double({ min: 0.5, max: 5.0, noNaN: true }),
            pan: fc.record({
              x: fc.integer({ min: -500, max: 500 }),
              y: fc.integer({ min: -500, max: 500 }),
            }),
          }),
          // Canvas point
          fc.record({
            x: fc.integer({ min: -1000, max: 3000 }),
            y: fc.integer({ min: -1000, max: 3000 }),
          }),
          async (viewportState, canvasPoint) => {
            // Reset and set viewport state
            useViewportStore.getState().resetViewport();
            useViewportStore.getState().setZoom(viewportState.zoom);
            useViewportStore.getState().setPan(viewportState.pan);
            
            // Transform canvas -> screen -> canvas
            const screenPoint = useViewportStore.getState().canvasToScreen(canvasPoint);
            const backToCanvas = useViewportStore.getState().screenToCanvas(screenPoint);
            
            // Property: Round trip should preserve coordinates
            const tolerance = 0.01;
            expect(Math.abs(backToCanvas.x - canvasPoint.x)).toBeLessThan(tolerance);
            expect(Math.abs(backToCanvas.y - canvasPoint.y)).toBeLessThan(tolerance);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should scale coordinates correctly with zoom', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Two different zoom levels
          fc.double({ min: 0.5, max: 2.0, noNaN: true }),
          fc.double({ min: 0.5, max: 2.0, noNaN: true }),
          // Canvas point (exclude origin to avoid division by zero)
          fc.record({
            x: fc.integer({ min: 10, max: 1000 }),
            y: fc.integer({ min: 10, max: 1000 }),
          }),
          async (zoom1, zoom2, canvasPoint) => {
            // Skip if zooms are too similar
            if (Math.abs(zoom1 - zoom2) < 0.1) return;
            
            // Reset viewport with no pan for simplicity
            useViewportStore.getState().resetViewport();
            useViewportStore.getState().setPan({ x: 0, y: 0 });
            
            // Transform at zoom1
            useViewportStore.getState().setZoom(zoom1);
            const screen1 = useViewportStore.getState().canvasToScreen(canvasPoint);
            
            // Transform at zoom2
            useViewportStore.getState().setZoom(zoom2);
            const screen2 = useViewportStore.getState().canvasToScreen(canvasPoint);
            
            // Property: Screen coordinates should scale proportionally with zoom
            const expectedRatio = zoom2 / zoom1;
            const actualRatioX = screen2.x / screen1.x;
            const actualRatioY = screen2.y / screen1.y;
            
            const tolerance = 0.01;
            expect(Math.abs(actualRatioX - expectedRatio)).toBeLessThan(tolerance);
            expect(Math.abs(actualRatioY - expectedRatio)).toBeLessThan(tolerance);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Viewport State Consistency', () => {
    it('should maintain consistent state across zoom and pan operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.oneof(
              fc.record({
                type: fc.constant('zoom' as const),
                value: fc.double({ min: 0.5, max: 5.0, noNaN: true }),
              }),
              fc.record({
                type: fc.constant('pan' as const),
                value: fc.record({
                  x: fc.integer({ min: -100, max: 100 }),
                  y: fc.integer({ min: -100, max: 100 }),
                }),
              })
            ),
            { minLength: 1, maxLength: 10 }
          ),
          async (operations) => {
            // Reset viewport
            useViewportStore.getState().resetViewport();
            
            // Apply operations
            for (const op of operations) {
              if (op.type === 'zoom') {
                useViewportStore.getState().setZoom(op.value);
              } else {
                useViewportStore.getState().panBy(op.value);
              }
            }
            
            // Property: Viewport state should always be valid
            const state = useViewportStore.getState().getViewportState();
            expect(state.zoom).toBeGreaterThanOrEqual(0.1);
            expect(state.zoom).toBeLessThanOrEqual(10.0);
            expect(Number.isFinite(state.pan.x)).toBe(true);
            expect(Number.isFinite(state.pan.y)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
