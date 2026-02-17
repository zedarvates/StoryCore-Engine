// ============================================================================
// CharactersSection Component
// ============================================================================
// Wrapper component for the characters section on the project dashboard.
// Provides section header, create button, and integrates CharacterList.
//
// Requirements: 1.1, 1.5, 2.1, 3.1
// ============================================================================

import React from 'react';
import { Plus, Users } from 'lucide-react';
import { CharacterList } from './CharacterList';
import type { Character } from '@/types/character';
import './CharactersSection.css';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the CharactersSection component
 * Requirements: 1.1, 1.5, 2.1, 3.1
 */
export interface CharactersSectionProps {
  /** Handler for create character button click */
  onCreateCharacter: () => void;

  /** Handler for character card click (opens editor) */
  onCharacterClick: (character: Character) => void;

  /** Optional handler for character edit */
  onEditCharacter?: (character: Character) => void;

  /** Optional handler for character delete */
  onDeleteCharacter?: (character: Character) => void;

  /** Whether to show action buttons on character cards */
  showActions?: boolean;

  /** Whether to hide the section header */
  hideHeader?: boolean;

  /** Optional className */
  className?: string;

  /** Optional style */
  style?: React.CSSProperties;
}

// ============================================================================
// CharactersSection Component
// ============================================================================

/**
 * CharactersSection Component
 * 
 * Provides a dedicated section for character management on the project dashboard.
 * Includes:
 * - Section header with title and icon
 * - "Create Character" button
 * - Integrated CharacterList component
 * 
 * Requirements:
 * - Req 1.1: Characters section on dashboard
 * - Req 1.5: Empty state with create button
 * - Req 2.1: Character editor interface
 * - Req 3.1: Character creation from dashboard
 */
export function CharactersSection({
  onCreateCharacter,
  onCharacterClick,
  onEditCharacter,
  onDeleteCharacter,
  showActions = true,
  hideHeader = false,
  className = '',
  style = {},
}: CharactersSectionProps) {
  return (
    <div className={`characters-section ${className}`} style={style}>
      {/* Section Header */}
      {!hideHeader && (
        <div className="characters-section__header">
          <div className="characters-section__title-group">
            <Users className="characters-section__icon" />
            <h3 className="characters-section__title">Characters</h3>
          </div>

          <button
            className="characters-section__create-button"
            onClick={onCreateCharacter}
            title="Create a new character"
          >
            <Plus className="characters-section__create-icon" />
            <span>Create Character</span>
          </button>
        </div>
      )}

      {/* Character List */}
      <div className="characters-section__content">
        <CharacterList
          onCharacterClick={onCharacterClick}
          onCreateClick={onCreateCharacter}
          showActions={showActions}
          onEdit={onEditCharacter}
          onDelete={onDeleteCharacter}
        />
      </div>
    </div>
  );
}
