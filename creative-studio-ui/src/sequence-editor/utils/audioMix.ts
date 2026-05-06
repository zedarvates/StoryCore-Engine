/**
 * mixAudio — Utilitaire de mixage audio pour l'export
 * Inspiré de LTX-Desktop electron/export/audio-mix.ts
 *
 * Gère :
 * - Normalisation de volume par clip
 * - Crossfade audio aux points de montage
 * - Mixage multi-piste
 * - Génération de commandes FFmpeg pour le mixage
 */

import type { Shot } from '@/types';
import type { FlattenSegment } from './flattenTimeline';

// ============================================================================
// Types
// ============================================================================

export interface AudioMixSettings {
  /** Volume master (0-1) */
  masterVolume: number;
  /** Sample rate de sortie */
  sampleRate: number;
  /** Normaliser le volume (LUFS) */
  normalize: boolean;
  /** LUFS cible pour la normalisation */
  targetLUFS: number;
  /** Durée du crossfade audio aux points de montage (ms) */
  crossfadeDuration: number;
}

export interface AudioTrackMix {
  /** Segments audio à mixer */
  segments: FlattenSegment[];
  /** Volume de la piste (0-1) */
  trackVolume: number;
  /** Pan (-1 à 1) */
  pan: number;
  /** Mute */
  muted: boolean;
}

export interface AudioMixResult {
  /** Durée totale du mix (frames) */
  totalFrames: number;
  /** Niveau de volume moyen (LUFS estimé) */
  estimatedLUFS: number;
  /** Commandes FFmpeg pour le mixage */
  ffmpegCommands: string[];
  /** Nombre de pistes mixées */
  trackCount: number;
}

// ============================================================================
// Default Settings
// ============================================================================

export const DEFAULT_AUDIO_MIX_SETTINGS: AudioMixSettings = {
  masterVolume: 0.85,
  sampleRate: 48000,
  normalize: true,
  targetLUFS: -16,
  crossfadeDuration: 30, // 30ms crossfade
};

// ============================================================================
// Audio Mix Engine
// ============================================================================

/**
 * Mixe les segments audio en une piste unique.
 * Génère les commandes FFmpeg nécessaires pour le mixage.
 */
export function buildAudioMixCommand(
  audioSegments: FlattenSegment[],
  settings: AudioMixSettings = DEFAULT_AUDIO_MIX_SETTINGS
): string {
  if (audioSegments.length === 0) {
    // Silence complet
    return 'anullsrc=r=48000:cl=stereo,atrim=duration=1';
  }

  const parts: string[] = [];
  const inputs: string[] = [];
  const filters: string[] = [];

  // Collecter les inputs uniques (par source audio)
  const sourceMap = new Map<string, number>();
  let inputIndex = 0;

  for (const seg of audioSegments) {
    const source = seg.shot.generatedImageUrl || seg.shot.outputPath || `shot_${seg.shot.id}`;
    if (!sourceMap.has(source)) {
      sourceMap.set(source, inputIndex);
      inputs.push(source);
      inputIndex++;
    }
  }

  // Construire les filtres pour chaque segment
  audioSegments.forEach((seg, i) => {
    const srcIdx = sourceMap.get(seg.shot.generatedImageUrl || seg.shot.outputPath || `shot_${seg.shot.id}`) ?? 0;
    const startSec = seg.startFrame / 24;
    const durationSec = (seg.endFrame - seg.startFrame) / 24;
    const volume = (seg.shot.audioSettings?.volume ?? 0) / 100 * 2 + 0.8;

    // Trim + volume + crossfade
    let filter = `[${srcIdx}:a]atrim=start=${startSec.toFixed(3)}:duration=${durationSec.toFixed(3)}`;
    filter += `,volume=${volume.toFixed(2)}`;

    // Crossfade au début (sauf premier segment)
    if (i > 0 && settings.crossfadeDuration > 0) {
      filter += `,afade=t=in:d=${(settings.crossfadeDuration / 1000).toFixed(3)}`;
    }

    // Crossfade à la fin (sauf dernier segment)
    if (i < audioSegments.length - 1 && settings.crossfadeDuration > 0) {
      filter += `,afade=t=out:st=${(durationSec - settings.crossfadeDuration / 1000).toFixed(3)}:d=${(settings.crossfadeDuration / 1000).toFixed(3)}`;
    }

    filter += `[a${i}]`;
    filters.push(filter);
  });

  // Concaténer tous les segments
  const concatInputs = audioSegments.map((_, i) => `[a${i}]`).join('');
  const concatFilter = `${concatInputs}concat=n=${audioSegments.length}:v=0:a=1[a_out]`;

  // Volume master
  const masterFilter = `[a_out]volume=${settings.masterVolume.toFixed(2)}`;

  // Normalisation LUFS (si activée)
  let finalFilter = masterFilter;
  if (settings.normalize) {
    finalFilter += `,loudnorm=I=${settings.targetLUFS}:LRA=11:TP=-1.5`;
  }

  finalFilter += '[audio_final]';

  return `${filters.join(';')};${concatFilter};${finalFilter}`;
}

/**
 * Estime le volume LUFS d'un shot audio.
 * (Simplifié — en production, utiliser ffprobe + loudnorm)
 */
export function estimateLoudness(shot: Shot): number {
  const volume = shot.audioSettings?.volume ?? -6;
  // Formule approximative : chaque -6dB ≈ -6 LUFS de marge
  return -23 + (volume / 6) * 3;
}

/**
 * Calcule les paramètres de volume pour un mixage équilibré.
 */
export function calculateMixLevels(
  segments: FlattenSegment[],
  targetLUFS: number = -16
): Map<string, number> {
  const levels = new Map<string, number>();

  for (const seg of segments) {
    const currentLUFS = estimateLoudness(seg.shot);
    const adjustment = targetLUFS - currentLUFS;
    // Conversion dB → facteur de gain linéaire
    const gain = Math.pow(10, adjustment / 20);
    levels.set(seg.shot.id, Math.max(0.1, Math.min(4, gain)));
  }

  return levels;
}

/**
 * Génère la commande FFmpeg complète pour le mixage audio.
 */
export function generateFullAudioCommand(
  audioSegments: FlattenSegment[],
  outputPath: string,
  settings: AudioMixSettings = DEFAULT_AUDIO_MIX_SETTINGS
): string {
  if (audioSegments.length === 0) return '';

  const sourceMap = new Map<string, string>();
  for (const seg of audioSegments) {
    const source = seg.shot.generatedImageUrl || seg.shot.outputPath;
    if (source && !sourceMap.has(source)) {
      sourceMap.set(source, source);
    }
  }

  const inputs = Array.from(sourceMap.keys()).map(s => `-i "${s}"`).join(' ');
  const filterComplex = buildAudioMixCommand(audioSegments, settings);

  return `ffmpeg ${inputs} -filter_complex "${filterComplex}" -map "[audio_final]" -c:a aac -b:a 320k -ar ${settings.sampleRate} "${outputPath}"`;
}

export default buildAudioMixCommand;
