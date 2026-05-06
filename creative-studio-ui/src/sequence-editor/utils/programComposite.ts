/**
 * useProgramComposite — Logique de composition multi-track pour le Program Monitor
 * Inspiré de LTX-Desktop ProgramMonitor.tsx
 *
 * Règle NLE : la track la plus haute (indexAudio le plus élevé) gagne.
 * Chaque frame, on détermine quel clip de quelle track est visible.
 * Gère l'opacité, les blend modes, et les transitions.
 */
import { useMemo } from 'react';
import type { Shot } from '@/types';

// ============================================================================
// Types
// ============================================================================

export interface TrackDefinition {
  id: string;
  type: string; // 'media' | 'audio' | 'text' | 'effects' etc.
  index: number; // 0 = lowest, higher = on top
  locked: boolean;
  hidden: boolean;
}

export interface CompositeFrame {
  /** Timestamp en frames */
  frame: number;
  /** Clips vidéo visibles à cette frame, triés par track index croissant */
  visibleClips: VisibleClip[];
  /** Clips audio actifs à cette frame */
  activeAudioClips: ActiveAudioClip[];
  /** Clips texte visibles */
  visibleTextClips: VisibleClip[];
}

export interface VisibleClip {
  shotId: string;
  shotName: string;
  trackIndex: number;
  trackType: string;
  /** Opacité 0-1 */
  opacity: number;
  /** Blend mode */
  blendMode: string;
  /** Position relative dans le clip source (en frames) */
  sourceFrame: number;
  /** Transition in active sur cette frame */
  transitionInProgress?: number; // 0-1, progression de la transition
  /** Transition out active sur cette frame */
  transitionOutProgress?: number;
  /** Type de transition active */
  transitionType?: string;
  /** URL de l'asset source */
  assetUrl?: string;
  /** La vitesse du clip */
  speed: number;
  /** Effets appliqués */
  effects?: string[];
  /** Style visuel */
  visualStyle?: Record<string, unknown>;
}

export interface ActiveAudioClip {
  shotId: string;
  shotName: string;
  trackIndex: number;
  /** Volume 0-1 */
  volume: number;
  /** Pan -1 à 1 */
  pan: number;
}

// ============================================================================
// Composition Engine
// ============================================================================

/**
 * Compose la frame à un temps donné.
 * Pour chaque track, trouve le clip actif et le superpose selon les règles NLE.
 */
export function composeFrame(
  frame: number,
  shots: Shot[],
  tracks: TrackDefinition[]
): CompositeFrame {
  const visibleClips: VisibleClip[] = [];
  const activeAudioClips: ActiveAudioClip[] = [];
  const visibleTextClips: VisibleClip[] = [];

  // Pour chaque track, trouver le clip qui couvre cette frame
  for (const track of tracks) {
    if (track.hidden) continue;

    // Trouver le clip actif sur cette track à cette frame
    const activeClip = findActiveClipAtFrame(frame, shots, track);

    if (!activeClip) continue;

    const relFrame = frame - activeClip.startTime;
    const sourceFrame = activeClip.metadata?.contentOffset
      ? relFrame + Number(activeClip.metadata.contentOffset)
      : relFrame;

    // Calculer la progression des transitions
    let transitionInProgress: number | undefined;
    let transitionOutProgress: number | undefined;
    let transitionType: string | undefined;

    const transIn = activeClip.transitions?.in;
    if (transIn && transIn.type !== 'none' && transIn.duration > 0) {
      transitionType = transIn.type;
      transitionInProgress = Math.min(1, relFrame / transIn.duration);
    }

    const transOut = activeClip.transitions?.out;
    if (transOut && transOut.type !== 'none' && transOut.duration > 0) {
      const endRelFrame = activeClip.duration - relFrame;
      if (endRelFrame <= transOut.duration) {
        transitionType = transOut.type;
        transitionOutProgress = Math.min(1, endRelFrame / transOut.duration);
      }
    }

    const visibleClip: VisibleClip = {
      shotId: activeClip.id,
      shotName: activeClip.name || `Shot ${activeClip.id.slice(0, 6)}`,
      trackIndex: track.index,
      trackType: track.type,
      opacity: 1, // Default, could be from layer
      blendMode: 'normal',
      sourceFrame,
      transitionInProgress,
      transitionOutProgress,
      transitionType,
      assetUrl: activeClip.generatedImageUrl || activeClip.outputPath,
      speed: 1,
    };

    switch (track.type) {
      case 'media':
        visibleClips.push(visibleClip);
        break;
      case 'audio':
        activeAudioClips.push({
          shotId: activeClip.id,
          shotName: visibleClip.shotName,
          trackIndex: track.index,
          volume: (activeClip.audioSettings?.volume ?? 0) / 100 * 2 + 0.8,
          pan: activeClip.audioSettings?.pan ?? 0,
        });
        break;
      case 'text':
        visibleTextClips.push(visibleClip);
        break;
    }
  }

  // Trier par track index (le plus bas = arrière-plan, le plus haut = premier plan)
  visibleClips.sort((a, b) => a.trackIndex - b.trackIndex);

  return {
    frame,
    visibleClips,
    activeAudioClips,
    visibleTextClips,
  };
}

/**
 * Trouve le clip actif sur une track à une frame donnée.
 */
function findActiveClipAtFrame(
  frame: number,
  shots: Shot[],
  track: TrackDefinition
): Shot | null {
  // Chercher un shot qui couvre cette frame
  // Le shot actif est celui dont startTime <= frame < startTime + duration
  // En cas de chevauchement, le dernier dans l'ordre temporel gagne

  let best: Shot | null = null;

  for (const shot of shots) {
    const start = shot.startTime || 0;
    const end = start + (shot.duration || 0);

    if (frame >= start && frame < end) {
      // Vérifier la compatibilité avec le type de track
      if (isShotCompatibleWithTrack(shot, track.type)) {
        if (!best || shot.startTime > best.startTime) {
          best = shot;
        }
      }
    }
  }

  return best;
}

/**
 * Vérifie si un shot est compatible avec un type de track.
 */
function isShotCompatibleWithTrack(shot: Shot, trackType: string): boolean {
  // Si le shot a des layers, vérifier qu'au moins un layer correspond
  if (shot.layers && shot.layers.length > 0) {
    return shot.layers.some(l => l.type === trackType);
  }

  // Sinon, compatibilité par défaut
  switch (trackType) {
    case 'media': return true;
    case 'audio': return !!shot.audioTracks || !!shot.audioLayers;
    case 'text': return !!shot.textLayers;
    case 'effects': return !!shot.effects;
    case 'transitions': return !!shot.transitions;
    case 'keyframes': return !!shot.animations;
    default: return false;
  }
}

/**
 * Hook React pour calculer la composition de la frame courante.
 */
export function useProgramComposite(
  currentFrame: number,
  shots: Shot[],
  tracks: TrackDefinition[]
): CompositeFrame {
  return useMemo(
    () => composeFrame(currentFrame, shots, tracks),
    [currentFrame, shots, tracks]
  );
}

/**
 * Calcule la progression d'une transition pour l'affichage.
 * Retourne un facteur 0-1 indiquant le niveau de fondu à appliquer.
 */
export function getTransitionAlpha(
  progress: number | undefined,
  type: string
): number {
  if (progress == null) return 0;

  switch (type) {
    case 'dissolve':
      return progress; // Linéaire
    case 'fade-to-black':
      return progress;
    case 'fade-to-white':
      return progress;
    default:
      return progress;
  }
}

/**
 * Fusionne deux clips pour le rendu composite.
 * Applique l'opacité et le blend mode du clip du premier plan.
 */
export function blendComposite(
  baseOpacity: number,
  overlayClip: VisibleClip,
  baseAlpha: number = 1
): { compositeOpacity: number; compositeBlend: string } {
  const overlayOpacity = overlayClip.opacity;

  // Transition in : fondu d'entrée
  let effectiveOpacity = overlayOpacity;
  if (overlayClip.transitionInProgress != null) {
    effectiveOpacity *= overlayClip.transitionInProgress;
  }
  // Transition out : fondu de sortie
  if (overlayClip.transitionOutProgress != null) {
    effectiveOpacity *= (1 - overlayClip.transitionOutProgress);
  }

  return {
    compositeOpacity: effectiveOpacity,
    compositeBlend: overlayClip.blendMode,
  };
}

export default useProgramComposite;
