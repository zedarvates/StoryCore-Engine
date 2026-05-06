/**
 * Resolution des chevauchements de clips sur une meme piste (Inspire de LTX-Desktop)
 *
 * Lorsqu'un clip est deplace ou depose, gere automatiquement les chevauchements
 * avec les clips existants sur la meme piste.
 */

export interface OverlapClip {
  id: string;
  startTime: number;
  duration: number;
}

export interface OverlapResult {
  /** Clips a supprimer (chevauchement total) */
  toRemove: string[];
  /** Clips a modifier (trim ou split) */
  toUpdate: Array<{ id: string; updates: Partial<OverlapClip> }>;
  /** Nouveaux clips a creer (split au milieu) */
  toCreate: OverlapClip[];
}

/**
 * Resout les chevauchements entre un nouveau clip et les clips existants sur une piste.
 *
 * @param newClip - Le clip qu'on tente d'inserer/deplacer
 * @param existingClips - Tous les clips deja presents sur la meme piste
 * @returns Les operations a effectuer pour resoudre les conflits
 */
export function resolveOverlaps(
  newClip: OverlapClip,
  existingClips: OverlapClip[]
): OverlapResult {
  const result: OverlapResult = {
    toRemove: [],
    toUpdate: [],
    toCreate: [],
  };

  const newStart = newClip.startTime;
  const newEnd = newClip.startTime + newClip.duration;

  for (const existing of existingClips) {
    if (existing.id === newClip.id) continue;

    const existStart = existing.startTime;
    const existEnd = existing.startTime + existing.duration;

    // Pas de chevauchement
    if (newEnd <= existStart || newStart >= existEnd) continue;

    // Chevauchement total : le nouveau clip recouvre entierement l'existant
    if (newStart <= existStart && newEnd >= existEnd) {
      result.toRemove.push(existing.id);
      continue;
    }

    // Chevauchement partiel gauche : le nouveau clip commence avant l'existant et finit dedans
    if (newStart <= existStart && newEnd > existStart && newEnd < existEnd) {
      const newDuration = existEnd - newEnd;
      result.toUpdate.push({
        id: existing.id,
        updates: {
          startTime: newEnd,
          duration: newDuration,
        },
      });
      continue;
    }

    // Chevauchement partiel droit : le nouveau clip commence dans l'existant et finit apres
    if (newStart > existStart && newStart < existEnd && newEnd >= existEnd) {
      const newDuration = newStart - existStart;
      result.toUpdate.push({
        id: existing.id,
        updates: {
          duration: newDuration,
        },
      });
      continue;
    }

    // Chevauchement au milieu : le nouveau clip est entierement dans l'existant
    if (newStart > existStart && newEnd < existEnd) {
      // Split l'existant en deux : partie gauche + partie droite
      const leftDuration = newStart - existStart;
      result.toUpdate.push({
        id: existing.id,
        updates: {
          duration: leftDuration,
        },
      });

      result.toCreate.push({
        id: `${existing.id}_split_right`,
        startTime: newEnd,
        duration: existEnd - newEnd,
      });

      continue;
    }
  }

  return result;
}

/**
 * Applique les resultats de resolveOverlaps a un tableau de clips.
 * Retourne le nouveau tableau de clips avec les modifications appliquees.
 */
export function applyOverlapResolution(
  clips: OverlapClip[],
  resolution: OverlapResult,
  idGenerator: () => string = () => `clip-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
): OverlapClip[] {
  // 1. Supprimer les clips marques
  let result = clips.filter((c) => !resolution.toRemove.includes(c.id));

  // 2. Appliquer les mises a jour
  result = result.map((c) => {
    const update = resolution.toUpdate.find((u) => u.id === c.id);
    if (update) {
      return { ...c, ...update.updates };
    }
    return c;
  });

  // 3. Ajouter les nouveaux clips crees par split
  for (const newClip of resolution.toCreate) {
    result.push({
      ...newClip,
      id: idGenerator(),
    });
  }

  return result;
}

/**
 * Verifie si un clip chevauche d'autres clips sur la meme piste.
 */
export function hasOverlaps(
  clip: OverlapClip,
  existingClips: OverlapClip[]
): boolean {
  const newStart = clip.startTime;
  const newEnd = clip.startTime + clip.duration;

  return existingClips.some((existing) => {
    if (existing.id === clip.id) return false;
    const existStart = existing.startTime;
    const existEnd = existing.startTime + existing.duration;
    return !(newEnd <= existStart || newStart >= existEnd);
  });
}

/**
 * Trouve le premier espace libre ou un clip de la duree donnee peut etre insere,
 * en partant de la position startTime.
 */
export function findFreeSlot(
  startTime: number,
  duration: number,
  existingClips: OverlapClip[]
): number {
  const sorted = [...existingClips].sort((a, b) => a.startTime - b.startTime);

  let slot = startTime;

  for (const existing of sorted) {
    const existStart = existing.startTime;
    const existEnd = existing.startTime + existing.duration;

    if (slot + duration <= existStart) {
      // Le slot tient avant ce clip
      return slot;
    }

    if (slot < existEnd) {
      // Le slot chevauche ce clip, on decale apres
      slot = existEnd;
    }
  }

  return slot;
}
