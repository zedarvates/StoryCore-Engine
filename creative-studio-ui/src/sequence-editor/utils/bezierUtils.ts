/**
 * Bezier Curve Utilities for Keyframe Interpolation
 */

export interface Point {
  x: number;
  y: number;
}

export interface BezierControlPoints {
  cp1: Point;
  cp2: Point;
}

/**
 * Calculates the y-value of a cubic Bezier curve at a given x.
 * Since x and y are not necessarily a direct function of each other in a Bezier curve
 * (it's a parametric curve (x(t), y(t))), we need to solve for t first.
 * 
 * @param x - The normalized x-coordinate (0 to 1) for which to find the y-value
 * @param cp1 - First control point (normalized 0 to 1)
 * @param cp2 - Second control point (normalized 0 to 1)
 * @returns The normalized y-value (0 to 1)
 */
export function getBezierValue(x: number, cp1: Point, cp2: Point): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  // Solve for t using binary search (Newton-Raphson would be faster but this is stable)
  let t = x;
  for (let i = 0; i < 8; i++) {
    const currentX = getCubicBezierPoint(t, 0, cp1.x, cp2.x, 1);
    const slope = getCubicBezierDerivative(t, 0, cp1.x, cp2.x, 1);
    if (Math.abs(slope) < 1e-6) break;
    t -= (currentX - x) / slope;
    t = Math.max(0, Math.min(1, t));
  }

  return getCubicBezierPoint(t, 0, cp1.y, cp2.y, 1);
}

/**
 * Cubic Bezier formula: (1-t)^3*p0 + 3t(1-t)^2*p1 + 3t^2(1-t)*p2 + t^3*p3
 */
function getCubicBezierPoint(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;

  return mt3 * p0 + 3 * t * mt2 * p1 + 3 * t2 * mt * p2 + t3 * p3;
}

/**
 * Derivative of Cubic Bezier formula
 */
function getCubicBezierDerivative(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const t2 = t * t;
  const mt = 1 - t;
  const mt2 = mt * mt;

  return 3 * mt2 * (p1 - p0) + 6 * t * mt * (p2 - p1) + 3 * t2 * (p3 - p2);
}

/**
 * Interpolates between two keyframes
 */
export function interpolate(
  time: number,
  k1: { time: number; value: number; easing?: string; controlPoints?: BezierControlPoints },
  k2: { time: number; value: number }
): number {
  const duration = k2.time - k1.time;
  if (duration <= 0) return k2.value;

  const t = (time - k1.time) / duration;
  const delta = k2.value - k1.value;

  let factor = t;
  const easing = k1.easing || 'linear';

  if (easing === 'bezier' && k1.controlPoints) {
    factor = getBezierValue(t, k1.controlPoints.cp1, k1.controlPoints.cp2);
  } else if (easing === 'ease-in') {
    factor = getBezierValue(t, { x: 0.42, y: 0 }, { x: 1, y: 1 });
  } else if (easing === 'ease-out') {
    factor = getBezierValue(t, { x: 0, y: 0 }, { x: 0.58, y: 1 });
  } else if (easing === 'ease-in-out') {
    factor = getBezierValue(t, { x: 0.42, y: 0 }, { x: 0.58, y: 1 });
  }

  return k1.value + factor * delta;
}
