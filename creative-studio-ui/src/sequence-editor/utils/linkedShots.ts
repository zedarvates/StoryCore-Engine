/**
 * Liaison video↔audio — Linked clip utilities (inspire de LTX-Desktop)
 *
 * Quand un clip video est selectionne, tous les clips lies (ex: audio)
 * sont automatiquement selectionnes. Alt+clic casse temporairement le lien.
 */

import type { Shot } from '@/types';

/**
 * Etend une selection de shots avec leurs shots lies.
 * Expansion transitive : si A lie a B et B lie a C, tous sont selectionnes.
 *
 * @param shotIds - IDs des shots deja selectionnes
 * @param allShots - Tous les shots du projet
 * @returns Set de tous les IDs (originaux + lies)
 */
export function expandWithLinkedShots(
  shotIds: string[],
  allShots: Shot[]
): string[] {
  if (shotIds.length === 0) return [];

  const expanded = new Set(shotIds);
  const queue = [...shotIds];
  const shotMap = new Map(allShots.map(s => [s.id, s]));

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const shot = shotMap.get(currentId);
    if (!shot?.linkedShotIds) continue;

    for (const linkedId of shot.linkedShotIds) {
      if (!expanded.has(linkedId)) {
        expanded.add(linkedId);
        queue.push(linkedId);
      }
    }
  }

  return Array.from(expanded);
}

/**
 * Verifie si deux shots sont lies.
 */
export function areShotsLinked(shotA: Shot, shotB: Shot): boolean {
  const aLinks = shotA.linkedShotIds ?? [];
  const bLinks = shotB.linkedShotIds ?? [];
  return aLinks.includes(shotB.id) || bLinks.includes(shotA.id);
}

/**
 * Lie deux shots ensemble (reciproquement).
 * Retourne les deux shots modifies.
 */
export function linkShots(shotA: Shot, shotB: Shot): [Shot, Shot] {
  const aLinks = new Set(shotA.linkedShotIds ?? []);
  const bLinks = new Set(shotB.linkedShotIds ?? []);

  aLinks.add(shotB.id);
  bLinks.add(shotA.id);

  return [
    { ...shotA, linkedShotIds: Array.from(aLinks) },
    { ...shotB, linkedShotIds: Array.from(bLinks) },
  ];
}

/**
 * Delie deux shots.
 */
export function unlinkShots(shotA: Shot, shotB: Shot): [Shot, Shot] {
  const aLinks = (shotA.linkedShotIds ?? []).filter(id => id !== shotB.id);
  const bLinks = (shotB.linkedShotIds ?? []).filter(id => id !== shotA.id);

  return [
    { ...shotA, linkedShotIds: aLinks },
    { ...shotB, linkedShotIds: bLinks },
  ];
}

/**
 * Trouve les shots lies a un shot donne.
 */
export function getLinkedShots(shot: Shot, allShots: Shot[]): Shot[] {
  if (!shot.linkedShotIds || shot.linkedShotIds.length === 0) return [];
  const shotMap = new Map(allShots.map(s => [s.id, s]));
  return shot.linkedShotIds
    .map(id => shotMap.get(id))
    .filter(Boolean) as Shot[];
}

/**
 * Quand on ajoute un shot video, cree automatiquement un shot audio lie.
 * (Utilitaire pour la creation de paires video↔audio)
 */
export function createLinkedAudioShot(
  videoShot: Shot,
  audioStartTime: number,
  audioDuration: number
): Partial<Shot> {
  return {
    name: `${videoShot.name || 'Shot'} — Audio`,
    startTime: audioStartTime,
    duration: audioDuration,
    type: 'audio',
    layers: [],
    referenceImages: [],
    prompt: '',
    parameters: {
      seed: -1,
      denoising: 0.75,
      steps: 20,
      guidance: 7,
      sampler: 'DPM++ 2M Karras',
      scheduler: 'karras',
    },
    generationStatus: 'pending',
    linkedShotIds: [videoShot.id],
  };
}
