/**
 * Utility to deduplicate characters in the store
 * Fixes the issue of duplicate character tiles
 */

import type { Character } from '@/types/character';

/**
 * Deduplicate an array of characters by character_id
 * Keeps the most recent version (last in array)
 */
export function deduplicateCharacters(characters: Character[]): Character[] {
  const uniqueMap = new Map<string, Character>();
  
  // Iterate through characters, later entries will overwrite earlier ones
  for (const character of characters) {
    uniqueMap.set(character.character_id, character);
  }
  
  // Convert back to array
  return Array.from(uniqueMap.values());
}

/**
 * Check if there are duplicate characters in an array
 */
export function hasDuplicateCharacters(characters: Character[]): boolean {
  const ids = characters.map(c => c.character_id);
  const uniqueIds = new Set(ids);
  return ids.length !== uniqueIds.size;
}

/**
 * Get duplicate character IDs
 */
export function getDuplicateCharacterIds(characters: Character[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  
  for (const character of characters) {
    if (seen.has(character.character_id)) {
      duplicates.add(character.character_id);
    } else {
      seen.add(character.character_id);
    }
  }
  
  return Array.from(duplicates);
}

/**
 * Log information about duplicate characters
 */
export function logDuplicateInfo(characters: Character[]): void {
  if (hasDuplicateCharacters(characters)) {
    const duplicateIds = getDuplicateCharacterIds(characters);
    console.warn('⚠️ Duplicate characters detected:', {
      total: characters.length,
      unique: new Set(characters.map(c => c.character_id)).size,
      duplicateIds,
    });
  } else {
    console.log('✅ No duplicate characters found');
  }
}
