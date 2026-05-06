/**
 * flattenTimeline — Algorithme de composition multi-track pour l'export
 * Inspiré de LTX-Desktop electron/export/timeline.ts
 *
 * Règle NLE: pour chaque frame, la track la plus haute (index le plus élevé) gagne.
 * Construit une timeline linéaire (flattened) pour le rendu FFmpeg.
 */

import type { Shot } from '@/types';

// ============================================================================
// Types
// ============================================================================

export interface FlattenTrack {
  id: string;
  type: string;
  index: number;
  height: number;
  hidden: boolean;
}

export interface FlattenSegment {
  /** Timestamp de début (frames) */
  startFrame: number;
  /** Timestamp de fin (frames) */
  endFrame: number;
  /** Shot source */
  shot: Shot;
  /** Track d'origine */
  trackIndex: number;
  /** Offset source dans le clip (frames) */
  sourceOffset: number;
  /** Vitesse du clip */
  speed: number;
  /** Transition entrante */
  transitionIn?: { type: string; duration: number };
  /** Transition sortante */
  transitionOut?: { type: string; duration: number };
  /** Opacité (0-1) */
  opacity: number;
}

export interface FlattenedTimeline {
  /** Durée totale en frames */
  totalFrames: number;
  /** Segments vidéo, triés par frame de début */
  videoSegments: FlattenSegment[];
  /** Segments audio, triés par frame de début */
  audioSegments: FlattenSegment[];
  /** Segments texte/sous-titres */
  textSegments: FlattenSegment[];
  /** Points où une transition ou un changement de layer se produit */
  eventFrames: number[];
}

// ============================================================================
// Core Algorithm
// ============================================================================

/**
 * Aplatie la timeline multi-track en une liste de segments pour l'export.
 *
 * Pour chaque track (de la plus basse à la plus haute), on projette les shots
 * sur une timeline linéaire. Les tracks plus hautes écrasent les plus basses
 * quand elles se chevauchent (règle NLE standard).
 */
export function flattenTimeline(
  shots: Shot[],
  tracks: FlattenTrack[]
): FlattenedTimeline {
  // 1. Collecter tous les segments de toutes les tracks
  const allSegments: FlattenSegment[] = [];

  for (const track of tracks) {
    if (track.hidden) continue;

    // Trouver les shots compatibles avec cette track
    const trackShots = shots.filter(s => isShotCompatible(s, track.type));

    for (const shot of trackShots) {
      allSegments.push({
        startFrame: shot.startTime,
        endFrame: shot.startTime + shot.duration,
        shot,
        trackIndex: track.index,
        sourceOffset: Number(shot.metadata?.contentOffset) || 0,
        speed: 1,
        transitionIn: shot.transitions?.in && shot.transitions.in.type !== 'none'
          ? { type: shot.transitions.in.type, duration: shot.transitions.in.duration }
          : undefined,
        transitionOut: shot.transitions?.out && shot.transitions.out.type !== 'none'
          ? { type: shot.transitions.out.type, duration: shot.transitions.out.duration }
          : undefined,
        opacity: 1,
      });
    }
  }

  // 2. Trier par track index croissant (les plus hautes en dernier = priorité)
  allSegments.sort((a, b) => a.trackIndex - b.trackIndex);

  // 3. Collecter tous les points d'événement (débuts, fins, transitions)
  const eventFrames = new Set<number>();
  eventFrames.add(0);

  for (const seg of allSegments) {
    eventFrames.add(seg.startFrame);
    eventFrames.add(seg.endFrame);
    // Ajouter les milieux de transition
    if (seg.transitionIn) {
      eventFrames.add(seg.startFrame + seg.transitionIn.duration);
    }
    if (seg.transitionOut) {
      eventFrames.add(seg.endFrame - seg.transitionOut.duration);
    }
  }

  const sortedEvents = Array.from(eventFrames).sort((a, b) => a - b);

  // 4. Pour chaque intervalle entre événements, déterminer le segment gagnant
  const videoSegments: FlattenSegment[] = [];
  const audioSegments: FlattenSegment[] = [];
  const textSegments: FlattenSegment[] = [];

  for (let i = 0; i < sortedEvents.length - 1; i++) {
    const frameStart = sortedEvents[i];
    const frameEnd = sortedEvents[i + 1];
    const midFrame = Math.floor((frameStart + frameEnd) / 2);
    const frameDuration = frameEnd - frameStart;

    if (frameDuration <= 0) continue;

    // Trouver le segment le plus haut qui couvre cette frame
    let bestVideo: FlattenSegment | null = null;
    let bestAudio: FlattenSegment | null = null;
    let bestText: FlattenSegment | null = null;

    for (const seg of allSegments) {
      if (midFrame < seg.startFrame || midFrame >= seg.endFrame) continue;

      const segTrack = tracks.find(t => t.index === seg.trackIndex);
      if (!segTrack) continue;

      switch (segTrack.type) {
        case 'media':
          if (!bestVideo || seg.trackIndex > bestVideo.trackIndex) {
            bestVideo = { ...seg, startFrame: frameStart, endFrame: frameEnd };
          }
          break;
        case 'audio':
          if (!bestAudio || seg.trackIndex > bestAudio.trackIndex) {
            bestAudio = { ...seg, startFrame: frameStart, endFrame: frameEnd };
          }
          break;
        case 'text':
          if (!bestText || seg.trackIndex > bestText.trackIndex) {
            bestText = { ...seg, startFrame: frameStart, endFrame: frameEnd };
          }
          break;
      }
    }

    if (bestVideo) videoSegments.push(bestVideo);
    if (bestAudio) audioSegments.push(bestAudio);
    if (bestText) textSegments.push(bestText);
  }

  // 5. Fusionner les segments adjacents identiques
  const mergedVideo = mergeAdjacentSegments(videoSegments);
  const mergedAudio = mergeAdjacentSegments(audioSegments);
  const mergedText = mergeAdjacentSegments(textSegments);

  // 6. Calculer la durée totale
  const totalFrames = Math.max(
    mergedVideo.length > 0 ? mergedVideo[mergedVideo.length - 1].endFrame : 0,
    mergedAudio.length > 0 ? mergedAudio[mergedAudio.length - 1].endFrame : 0,
    1
  );

  return {
    totalFrames,
    videoSegments: mergedVideo,
    audioSegments: mergedAudio,
    textSegments: mergedText,
    eventFrames: sortedEvents,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function isShotCompatible(shot: Shot, trackType: string): boolean {
  if (shot.layers && shot.layers.length > 0) {
    return shot.layers.some(l => l.type === trackType);
  }
  switch (trackType) {
    case 'media': return true;
    case 'audio': return !!shot.audioTracks || !!shot.audioLayers;
    case 'text': return !!shot.textLayers;
    default: return false;
  }
}

function mergeAdjacentSegments(segments: FlattenSegment[]): FlattenSegment[] {
  if (segments.length <= 1) return segments;

  segments.sort((a, b) => a.startFrame - b.startFrame);
  const merged: FlattenSegment[] = [segments[0]];

  for (let i = 1; i < segments.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = segments[i];

    // Fusible si même shot, même track, et adjacent
    if (
      prev.shot.id === curr.shot.id &&
      prev.trackIndex === curr.trackIndex &&
      prev.endFrame === curr.startFrame
    ) {
      prev.endFrame = curr.endFrame;
    } else {
      merged.push(curr);
    }
  }

  return merged;
}

export default flattenTimeline;
