// ============================================================================
// Character Restoration Hook
// ============================================================================
// Handles loading characters from localStorage on app mount
// Validates loaded data and handles corrupted data gracefully
// Populates store with loaded characters
//
// Requirements: 8.4
// ============================================================================

import { useEffect, useRef } from 'react';
import { useCharacterPersistence } from './useCharacterPersistence';

/**
 * Hook that restores characters from localStorage on app mount
 * Requirements: 8.4
 */
export function useCharacterRestoration() {
  const { loadAllCharacters } = useCharacterPersistence();
  const hasRestoredRef = useRef(false);

  useEffect(() => {
    // Only restore once on mount
    if (hasRestoredRef.current) {
      return;
    }

    hasRestoredRef.current = true;

    async function restoreCharacters() {
      try {
        console.log('Restoring characters from localStorage...');
        
        const characters = await loadAllCharacters();
        
        if (characters.length > 0) {
          console.log(`Successfully restored ${characters.length} character(s)`);
        } else {
          console.log('No characters found to restore');
        }
      } catch (error) {
        console.error('Failed to restore characters:', error);
      }
    }

    restoreCharacters();
  }, [loadAllCharacters]);
}
