/**
 * Timeline Snapping Hook
 * 
 * Provides snapping behavior for timeline operations.
 * Snaps to shot boundaries, playhead, and grid.
 */

import { useCallback, useMemo } from 'react';
import type { Shot } from '../../types';

interface UseTimelineSnappingOptions {
  shots: Shot[];
  zoomLevel: number;
  snapThreshold?: number;
  enabled?: boolean;
}

export const useTimelineSnapping = ({
  shots,
  zoomLevel,
  snapThreshold = 10,
  enabled = true,
}: UseTimelineSnappingOptions) => {
  // Calculate snap points from shot boundaries
  const snapPoints = useMemo(() => {
    if (!enabled) return [];
    
    const points: number[] = [0]; // Always snap to start
    
    shots.forEach((shot) => {
      const start = shot.startTime || 0;
      const end = start + (shot.duration || 0);
      
      if (!points.includes(start)) points.push(start);
      if (!points.includes(end)) points.push(end);
    });
    
    return points.sort((a, b) => a - b);
  }, [shots, enabled]);

  // Find closest snap point
  const findSnapPoint = useCallback(
    (position: number): number => {
      if (!enabled || snapPoints.length === 0) return position;
      
      let closestPoint = position;
      let minDistance = Infinity;
      
      for (const point of snapPoints) {
        const distance = Math.abs(point - position);
        if (distance < minDistance) {
          minDistance = distance;
          closestPoint = point;
        }
      }
      
      // Only snap if within threshold
      return minDistance <= snapThreshold ? closestPoint : position;
    },
    [snapPoints, snapThreshold, enabled]
  );

  // Snap a range (start, end) while maintaining duration
  const snapRange = useCallback(
    (start: number, end: number): { start: number; end: number } => {
      const snappedStart = findSnapPoint(start);
      const duration = end - start;
      
      // Try to snap end to a point while maintaining duration
      const targetEnd = snappedStart + duration;
      const snappedEnd = findSnapPoint(targetEnd);
      
      // If end snapped, adjust start to maintain duration
      if (snappedEnd !== targetEnd && snappedEnd > snappedStart) {
        const newStart = snappedEnd - duration;
        return { start: findSnapPoint(newStart), end: snappedEnd };
      }
      
      return { start: snappedStart, end: snappedEnd };
    },
    [findSnapPoint]
  );

  // Get visual snap indicator position
  const getSnapIndicator = useCallback(
    (position: number): number | null => {
      if (!enabled) return null;
      
      const snapped = findSnapPoint(position);
      return snapped !== position ? snapped : null;
    },
    [enabled, findSnapPoint]
  );

  return {
    snapPoints,
    findSnapPoint,
    snapRange,
    getSnapIndicator,
  };
};

export default useTimelineSnapping;
