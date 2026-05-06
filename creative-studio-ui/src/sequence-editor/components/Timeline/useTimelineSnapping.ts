/**
 * Timeline Snapping Hook
 * 
 * Provides continuous snapping behavior for timeline drag operations.
 * Snaps to shot boundaries, playhead, markers, and timeline start/end.
 * Inspired by LTX-Desktop's continuous snap during mousemove.
 */

import { useCallback, useMemo } from 'react';
import type { Shot, TimelineMarker } from '../../types';

interface UseTimelineSnappingOptions {
  shots: Shot[];
  zoomLevel: number;
  snapThreshold?: number;        // en pixels (default: 10)
  snapThresholdTime?: number;    // en secondes (default: 0.2)
  enabled?: boolean;
  playheadPosition?: number;     // pour snap au playhead
  markers?: TimelineMarker[];    // pour snap aux marqueurs
}

export const useTimelineSnapping = ({
  shots,
  zoomLevel,
  snapThreshold = 10,
  snapThresholdTime = 0.2,
  enabled = true,
  playheadPosition = 0,
  markers = [],
}: UseTimelineSnappingOptions) => {
  // Calculer le seuil de snap combine (pixels ou temps, le plus large des deux)
  const effectiveThreshold = useMemo(() => {
    const timeThresholdInPixels = snapThresholdTime * zoomLevel;
    return Math.max(snapThreshold, timeThresholdInPixels);
  }, [snapThreshold, snapThresholdTime, zoomLevel]);

  // Calculer les points de snap : bornes des shots + playhead + marqueurs + debut/fin timeline
  const snapPoints = useMemo(() => {
    if (!enabled) return [];
    
    const points: number[] = [0]; // Toujours snap au debut

    // Bornes des shots
    shots.forEach((shot) => {
      const start = shot.startTime || 0;
      const end = start + (shot.duration || 0);
      if (!points.includes(start)) points.push(start);
      if (!points.includes(end)) points.push(end);
    });

    // Playhead
    if (playheadPosition > 0 && !points.includes(playheadPosition)) {
      points.push(playheadPosition);
    }

    // Marqueurs
    markers.forEach((marker) => {
      const markerTime = marker.position || 0;
      if (!points.includes(markerTime)) points.push(markerTime);
    });
    
    return points.sort((a, b) => a - b);
  }, [shots, enabled, playheadPosition, markers]);

  // Trouver le point de snap le plus proche
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
      
      // Ne snap que si dans le seuil
      return minDistance <= effectiveThreshold ? closestPoint : position;
    },
    [snapPoints, effectiveThreshold, enabled]
  );

  // Snap une plage (start, end) en preservant la duree
  const snapRange = useCallback(
    (start: number, end: number): { start: number; end: number } => {
      const snappedStart = findSnapPoint(start);
      const duration = end - start;
      
      // Essayer de snaper la fin a un point tout en preservant la duree
      const targetEnd = snappedStart + duration;
      const snappedEnd = findSnapPoint(targetEnd);
      
      // Si la fin a snape, ajuster le debut pour maintenir la duree
      if (snappedEnd !== targetEnd && snappedEnd > snappedStart) {
        const newStart = snappedEnd - duration;
        return { start: findSnapPoint(newStart), end: snappedEnd };
      }
      
      return { start: snappedStart, end: snappedEnd };
    },
    [findSnapPoint]
  );

  // Retourne la position snapee si differente de l'input (pour l'indicateur visuel)
  const getSnapIndicator = useCallback(
    (position: number): number | null => {
      if (!enabled) return null;
      const snapped = findSnapPoint(position);
      return snapped !== position ? snapped : null;
    },
    [enabled, findSnapPoint]
  );

  // Snap un delta de deplacement (pour le drag) — utilitaire pratique
  const snapDelta = useCallback(
    (originalPosition: number, delta: number): number => {
      const targetPosition = originalPosition + delta;
      const snappedPosition = findSnapPoint(targetPosition);
      return snappedPosition - originalPosition;
    },
    [findSnapPoint]
  );

  return {
    snapPoints,
    effectiveThreshold,
    findSnapPoint,
    snapRange,
    snapDelta,
    getSnapIndicator,
  };
};

export default useTimelineSnapping;
