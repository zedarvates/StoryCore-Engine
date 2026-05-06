/**
 * TransitionsManager — Gestion des transitions entre clips
 * Inspiré de LTX-Desktop (cross-dissolve draggable entre clips adjacents)
 */

import type { Shot, TimelineTransition } from '@/types';
import type { OverlapClip } from './resolveOverlaps';

export const TRANSITION_TYPES = [
  'none',
  'dissolve',
  'fade-to-black',
  'fade-to-white',
  'wipe-left',
  'wipe-right',
  'wipe-up',
  'wipe-down',
] as const;

export type TransitionType = typeof TRANSITION_TYPES[number];

/** Deux clips adjacents avec un point de coupe commun */
export interface AdjacentClipPair {
  left: Shot;
  right: Shot;
  /** Position du point de coupe (fin du gauche = début du droit) */
  cutPoint: number;
}

/**
 * Trouve toutes les paires de clips adjacents sur la même piste.
 */
export function findAdjacentPairs(
  shots: Shot[],
  trackType?: string
): AdjacentClipPair[] {
  // Trie par startTime
  const sorted = [...shots].sort((a, b) => a.startTime - b.startTime);
  const pairs: AdjacentClipPair[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const left = sorted[i];
    const right = sorted[i + 1];

    // Les clips sont adjacents si la fin du gauche == le début du droit
    const leftEnd = left.startTime + left.duration;
    const rightStart = right.startTime;
    const gap = Math.abs(rightStart - leftEnd);

    // Tolérance de 2 frames pour considérer "adjacent"
    if (gap <= 2) {
      pairs.push({
        left,
        right,
        cutPoint: leftEnd,
      });
    }
  }

  return pairs;
}

/**
 * Vérifie si deux shots ont déjà une transition entre eux.
 */
export function hasCrossDissolve(left: Shot, right: Shot): boolean {
  const leftOut = left.transitions?.out;
  const rightIn = right.transitions?.in;
  return !!(
    leftOut && leftOut.type !== 'none' &&
    rightIn && rightIn.type !== 'none'
  );
}

/**
 * Calcule la durée de transition recommandée entre deux clips
 * basée sur la durée du plus court des deux.
 */
export function recommendedTransitionDuration(
  left: Shot,
  right: Shot,
  maxFrames: number = 24
): number {
  const minDuration = Math.min(left.duration, right.duration);
  return Math.min(maxFrames, Math.floor(minDuration / 4));
}

/**
 * Formate une durée de transition pour l'affichage.
 */
export function formatTransitionDuration(frames: number, fps: number = 24): string {
  const seconds = frames / fps;
  if (seconds < 1) return `${frames}f`;
  return `${seconds.toFixed(1)}s`;
}

/**
 * Crée un objet TimelineTransition.
 */
export function createTransition(
  type: TransitionType,
  duration: number
): TimelineTransition {
  return {
    type,
    duration,
    appliedAt: Date.now(),
  };
}

/**
 * Applique des transitions sur un chevauchement entre deux clips.
 * Pour un cross-dissolve, le clip gauche recoit transitionOut et le droit transitionIn.
 */
export function applyCrossDissolve(
  left: Shot,
  right: Shot,
  duration: number,
  type: TransitionType = 'dissolve'
): [Shot, Shot] {
  const now = Date.now();
  return [
    {
      ...left,
      transitions: {
        ...left.transitions,
        out: { type, duration, appliedAt: now },
      },
    },
    {
      ...right,
      transitions: {
        ...right.transitions,
        in: { type, duration, appliedAt: now },
      },
    },
  ];
}

/**
 * Supprime une transition d'un shot.
 */
export function removeTransitionFromShot(
  shot: Shot,
  side: 'in' | 'out'
): Shot {
  const transitions = { ...shot.transitions };
  if (side === 'in') transitions.in = undefined;
  if (side === 'out') transitions.out = undefined;
  return { ...shot, transitions };
}
