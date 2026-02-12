// ============================================================================
// CharacterList Component
// ============================================================================
// Displays all characters in a grid layout with search, filter, and selection
// capabilities. Supports real-time updates via event subscriptions.
//
// Requirements: 1.1, 1.2, 1.3, 1.5, 4.2, 4.5, 5.1, 5.2, 5.3
// ============================================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { CharacterCard } from './CharacterCard';
import { CharacterSearchBar } from './CharacterSearchBar';
import { useCharacterManager } from '@/hooks/useCharacterManager';
import { useAppStore } from '@/stores/useAppStore';
import type { Character } from '@/types/character';
import type { CharacterFilters } from '@/stores/useAppStore';
import { eventEmitter } from '@/services/eventEmitter';
import { deduplicateCharacters, logDuplicateInfo } from '@/utils/deduplicateCharacters';
import './CharacterList.css';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the CharacterList component
 * Requirements: 1.1, 4.2, 4.5
 */
export interface CharacterListProps {
  /** Optional click handler for character cards */
  onCharacterClick?: (character: Character) => void;
  
  /** Optional handler for create character button */
  onCreateClick?: () => void;
  
  /** Whether the list is in selection mode (for Story Generator) */
  selectable?: boolean;
  
  /** Currently selected character IDs (for Story Generator) */
  selectedIds?: string[];
  
  /** Handler for selection changes (for Story Generator) */
  onSelectionChange?: (ids: string[]) => void;
  
  /** Whether to show action buttons on cards */
  showActions?: boolean;
  
  /** Optional handler for character edit */
  onEdit?: (character: Character) => void;
  
  /** Optional handler for character delete */
  onDelete?: (character: Character) => void;
}

// ============================================================================
// CharacterList Component
// ============================================================================

/**
 * CharacterList Component
 * 
 * Displays all characters in a responsive grid layout with:
 * - Search and filter functionality
 * - Real-time updates via event subscriptions
 * - Selection mode for Story Generator
 * - Empty state with create button
 * - Loading states
 * 
 * Requirements:
 * - Req 1.1: Characters section on dashboard
 * - Req 1.2: Display character information
 * - Req 1.3: Sort by creation date (newest first)
 * - Req 1.5: Empty state with create button
 * - Req 4.2: Multi-character selection
 * - Req 4.5: Selection adds to story
 * - Req 5.1, 5.2, 5.3: Real-time updates via events
 */
export function CharacterList({
  onCharacterClick,
  onCreateClick,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  showActions = false,
  onEdit,
  onDelete,
}: CharacterListProps) {
  // ============================================================================
  // State and Hooks
  // ============================================================================

  const characterManager = useCharacterManager();
  
  // Store state for search and filters
  const characterSearchQuery = useAppStore((state) => state.characterSearchQuery);
  const characterFilters = useAppStore((state) => state.characterFilters);
  const setCharacterSearchQuery = useAppStore((state) => state.setCharacterSearchQuery);
  const setCharacterFilters = useAppStore((state) => state.setCharacterFilters);
  
  // Local state
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Log component mount/unmount
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🎬 [CharacterList] Component mounted');
    }
    return () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🎬 [CharacterList] Component unmounted');
      }
    };
  }, []);

  // ============================================================================
  // Character Data Processing
  // ============================================================================

  /**
   * Get all characters and apply search/filter/sort
   * Requirements: 1.2, 1.3, 4.4, 9.2, 9.3, 9.4
   */
  const characters = useMemo(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [CharacterList] Recalculating characters list');
    }
    
    let result = characterManager.getAllCharacters();
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 [CharacterList] Total characters from store: ${result.length}`);
    }
    
    // Apply search filter (Requirement: 9.2)
    if (characterSearchQuery && characterSearchQuery.trim() !== '') {
      result = characterManager.searchCharacters(characterSearchQuery);
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔎 [CharacterList] After search: ${result.length} characters`);
      }
    }

    // Apply additional filters (Requirement: 9.3, 9.4)
    if (
      characterFilters.archetype?.length ||
      characterFilters.ageRange?.length ||
      characterFilters.creationMethod?.length
    ) {
      result = characterManager.filterCharacters(characterFilters);
      if (process.env.NODE_ENV === 'development') {
        console.log(`🎯 [CharacterList] After filters: ${result.length} characters`);
      }
      
      // If both search and filters are active, we need to intersect the results
      if (characterSearchQuery && characterSearchQuery.trim() !== '') {
        const searchResults = characterManager.searchCharacters(characterSearchQuery);
        const searchIds = new Set(searchResults.map(c => c.character_id));
        result = result.filter(c => searchIds.has(c.character_id));
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔗 [CharacterList] After search+filter intersection: ${result.length} characters`);
        }
      }
    }

    // Single deduplication at the end (optimization: was called 3x O(n), now 1x O(n))
    const beforeDedup = result.length;
    result = deduplicateCharacters(result);
    const afterDedup = result.length;
    
    if (beforeDedup !== afterDedup) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`⚠️ [CharacterList] Removed ${beforeDedup - afterDedup} duplicate(s)`);
      }
    }
    
    // Log duplicate info in development
    if (process.env.NODE_ENV === 'development') {
      logDuplicateInfo(result);
    }

    // Sort by creation date, newest first (Requirement: 1.3)
    result.sort((a, b) => {
      const dateA = new Date(a.creation_timestamp).getTime();
      const dateB = new Date(b.creation_timestamp).getTime();
      return dateB - dateA; // Descending order (newest first)
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ [CharacterList] Final result: ${result.length} characters to display`);
    }
    return result;
  }, [
    characterManager,
    characterSearchQuery,
    characterFilters,
    refreshTrigger, // Trigger re-computation on events
  ]);

  // ============================================================================
  // Event Subscriptions
  // ============================================================================

  /**
   * Subscribe to character events for real-time updates
   * Requirements: 5.1, 5.2, 5.3
   */
  useEffect(() => {
    let updateTimeout: NodeJS.Timeout | null = null;
    
    // Debounced update function to prevent multiple rapid re-renders
    const scheduleUpdate = () => {
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
      updateTimeout = setTimeout(() => {
        setRefreshTrigger(prev => prev + 1);
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 [CharacterList] Refreshing character list');
        }
      }, 100); // 100ms debounce
    };
    
    // Handler for character-created event (Requirement: 5.1)
    const handleCharacterCreated = () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('➕ [CharacterList] Character created event received');
      }
      scheduleUpdate();
    };

    // Handler for character-updated event (Requirement: 5.2)
    const handleCharacterUpdated = () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('✏️ [CharacterList] Character updated event received');
      }
      scheduleUpdate();
    };

    // Handler for character-deleted event (Requirement: 5.3)
    const handleCharacterDeleted = () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🗑️ [CharacterList] Character deleted event received');
      }
      scheduleUpdate();
    };

    // Subscribe to events
    eventEmitter.on('character-created', handleCharacterCreated);
    eventEmitter.on('character-updated', handleCharacterUpdated);
    eventEmitter.on('character-deleted', handleCharacterDeleted);

    // Cleanup subscriptions on unmount - MUST pass the same handler reference
    return () => {
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
      eventEmitter.off('character-created', handleCharacterCreated);
      eventEmitter.off('character-updated', handleCharacterUpdated);
      eventEmitter.off('character-deleted', handleCharacterDeleted);
    };
  }, []); // Empty deps - only subscribe once on mount

  // ============================================================================
  // Event Handlers
  // ============================================================================

  /**
   * Handle search query changes
   * Requirement: 9.2
   */
  const handleSearchChange = useCallback((query: string) => {
    setCharacterSearchQuery(query);
  }, [setCharacterSearchQuery]);

  /**
   * Handle filter changes
   * Requirement: 9.4
   */
  const handleFilterChange = useCallback((filters: CharacterFilters) => {
    setCharacterFilters(filters);
  }, [setCharacterFilters]);

  /**
   * Handle character card click
   */
  const handleCharacterClick = useCallback((character: Character) => {
    if (onCharacterClick) {
      onCharacterClick(character);
    }
  }, [onCharacterClick]);

  /**
   * Handle character selection (for Story Generator)
   * Requirements: 4.2, 4.5
   */
  const handleCharacterSelect = useCallback((character: Character, selected: boolean) => {
    if (!onSelectionChange) return;

    const newSelectedIds = selected
      ? [...selectedIds, character.character_id]
      : selectedIds.filter(id => id !== character.character_id);

    onSelectionChange(newSelectedIds);
  }, [selectedIds, onSelectionChange]);

  /**
   * Handle character edit
   */
  const handleCharacterEdit = useCallback((character: Character) => {
    if (onEdit) {
      onEdit(character);
    }
  }, [onEdit]);

  /**
   * Handle character delete
   */
  const handleCharacterDelete = useCallback((character: Character) => {
    if (onDelete) {
      onDelete(character);
    }
  }, [onDelete]);

  /**
   * Handle image generation - save to character data
   */
  const handleImageGenerated = useCallback(async (character: Character, imagePath: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🖼️ [CharacterList] Image generated for character:', character.name, imagePath);
    }
    
    try {
      // Update character with the generated portrait path
      await characterManager.updateCharacter(character.character_id, {
        visual_identity: {
          ...character.visual_identity,
          generated_portrait: imagePath,
        },
      });
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ [CharacterList] Character updated with portrait path');
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ [CharacterList] Failed to update character with portrait:', error);
      }
    }
  }, [characterManager]);

  // ============================================================================
  // Render Helpers
  // ============================================================================

  /**
   * Render empty state
   * Requirement: 1.5
   */
  const renderEmptyState = () => {
    const hasFilters = 
      characterSearchQuery.trim() !== '' ||
      characterFilters.archetype?.length ||
      characterFilters.ageRange?.length ||
      characterFilters.creationMethod?.length;

    if (hasFilters) {
      // No results for current search/filters
      return (
        <div className="character-list__empty-state">
          <div className="character-list__empty-icon">🔍</div>
          <h3 className="character-list__empty-title">No characters found</h3>
          <p className="character-list__empty-message">
            Try adjusting your search or filters to find characters.
          </p>
        </div>
      );
    }

    // No characters at all
    return (
      <div className="character-list__empty-state">
        <div className="character-list__empty-icon">👥</div>
        <h3 className="character-list__empty-title">No characters yet</h3>
        <p className="character-list__empty-message">
          Create your first character to get started with your story.
        </p>
        {onCreateClick && (
          <button
            className="character-list__empty-create-button"
            onClick={onCreateClick}
          >
            <Plus className="character-list__empty-create-icon" />
            Create Character
          </button>
        )}
      </div>
    );
  };

  /**
   * Render loading state
   */
  const renderLoadingState = () => {
    return (
      <div className="character-list__grid">
        {Array.from({ length: 6 }).map((_, index) => (
          <CharacterCard
            key={`loading-${index}`}
            character={{} as Character}
            loading={true}
          />
        ))}
      </div>
    );
  };

  /**
   * Render character grid
   * Requirements: 1.2, 4.2
   */
  const renderCharacterGrid = () => {
    return (
      <div className="character-list__grid">
        {characters.map((character) => (
          <CharacterCard
            key={character.character_id}
            character={character}
            onClick={() => handleCharacterClick(character)}
            selectable={selectable}
            selected={selectedIds.includes(character.character_id)}
            onSelect={(selected) => handleCharacterSelect(character, selected)}
            showActions={showActions}
            onEdit={() => handleCharacterEdit(character)}
            onDelete={() => handleCharacterDelete(character)}
            onImageGenerated={(imagePath) => handleImageGenerated(character, imagePath)}
          />
        ))}
      </div>
    );
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="character-list">
      {/* Search and filter bar */}
      <CharacterSearchBar
        onSearchChange={handleSearchChange}
        onFilterChange={handleFilterChange}
        currentFilters={characterFilters}
        resultCount={characters.length}
      />

      {/* Character grid or empty state */}
      <div className="character-list__content">
        {loading ? (
          renderLoadingState()
        ) : characters.length === 0 ? (
          renderEmptyState()
        ) : (
          renderCharacterGrid()
        )}
      </div>
    </div>
  );
}
