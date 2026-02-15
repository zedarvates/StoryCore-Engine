// ============================================================================
// CharacterCard Component (Memoized)
// ============================================================================
// Performance-optimized version of CharacterCard with React.memo to prevent
// unnecessary re-renders when parent components update.
//
// Optimizations:
// - React.memo with custom comparison function
// - Memoized event handlers
// - Optimized thumbnail loading with lazy loading
// - Reduced DOM operations
//
// Requirements: 1.2, 1.4, 2.1, 4.2
// ============================================================================

import React, { memo, useCallback } from 'react';
import { Edit2, Trash2, User } from 'lucide-react';
import type { Character } from '@/types/character';
import './CharacterCard.css';

// ============================================================================
// Types
// ============================================================================

export interface CharacterCardProps {
  character: Character;
  onClick?: () => void;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  showActions?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  loading?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format creation date (memoized)
 */
const formatDate = (timestamp: string): string => {
  try {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return 'Unknown date';
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Unknown date';
  }
};

// ============================================================================
// CharacterCard Component (Memoized)
// ============================================================================

/**
 * CharacterCard Component with React.memo optimization
 * 
 * Only re-renders when:
 * - character data changes
 * - selected state changes
 * - loading state changes
 * - callback functions change (should be memoized in parent)
 */
const CharacterCardComponent = ({
  character,
  onClick,
  selectable = false,
  selected = false,
  onSelect,
  showActions = false,
  onEdit,
  onDelete,
  loading = false,
}: CharacterCardProps) => {
  // ============================================================================
  // Memoized Event Handlers
  // ============================================================================

  const handleCardClick = useCallback(() => {
    if (selectable && onSelect) {
      onSelect(!selected);
    } else if (onClick) {
      onClick();
    }
  }, [selectable, onSelect, selected, onClick]);

  const handleCheckboxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation();
      if (onSelect) {
        onSelect(e.target.checked);
      }
    },
    [onSelect]
  );

  const handleEditClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onEdit) {
        onEdit();
      }
    },
    [onEdit]
  );

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onDelete) {
        onDelete();
      }
    },
    [onDelete]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && (onClick || selectable)) {
        e.preventDefault();
        handleCardClick();
      }
    },
    [onClick, selectable, handleCardClick]
  );

  // ============================================================================
  // Render Helpers
  // ============================================================================

  // Get thumbnail URL
  const thumbnailUrl = (character as any).thumbnail_url || null;

  // Loading skeleton
  if (loading) {
    return (
      <div className="character-card character-card--loading">
        <div className="character-card__skeleton">
          <div className="character-card__skeleton-thumbnail" />
          <div className="character-card__skeleton-content">
            <div className="character-card__skeleton-line character-card__skeleton-line--title" />
            <div className="character-card__skeleton-line character-card__skeleton-line--subtitle" />
            <div className="character-card__skeleton-line character-card__skeleton-line--text" />
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div
      className={`
        character-card
        ${selectable ? 'character-card--selectable' : ''}
        ${selected ? 'character-card--selected' : ''}
        ${onClick || selectable ? 'character-card--clickable' : ''}
      `}
      onClick={handleCardClick}
      role="article"
      tabIndex={onClick || selectable ? 0 : undefined}
      onKeyDown={handleKeyDown}
    >
      {/* Selection checkbox */}
      {selectable && (
        <div className="character-card__checkbox">
          <input
            type="checkbox"
            checked={selected}
            onChange={handleCheckboxChange}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select ${character.name}`}
          />
        </div>
      )}

      {/* Thumbnail with lazy loading */}
      <div className="character-card__thumbnail">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={`${character.name} thumbnail`}
            className="character-card__thumbnail-image"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                const placeholder = document.createElement('div');
                placeholder.className = 'character-card__thumbnail-placeholder';
                placeholder.innerHTML =
                  '<svg class="character-card__thumbnail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
                parent.appendChild(placeholder);
              }
            }}
          />
        ) : (
          <div className="character-card__thumbnail-placeholder">
            <User className="character-card__thumbnail-icon" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="character-card__content">
        <div className="character-card__header">
          <h3 className="character-card__name">{character.name || 'Unnamed Character'}</h3>
          <p className="character-card__archetype">{character.role?.archetype || 'Unspecified'}</p>
        </div>

        <div className="character-card__details">
          <div className="character-card__detail">
            <span className="character-card__detail-label">Age:</span>
            <span className="character-card__detail-value">
              {character.visual_identity?.age_range || 'Not specified'}
            </span>
          </div>
          <div className="character-card__detail">
            <span className="character-card__detail-label">Created:</span>
            <span className="character-card__detail-value">
              {formatDate(character.creation_timestamp)}
            </span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {showActions && (
        <div className="character-card__actions">
          {onEdit && (
            <button
              className="character-card__action-button character-card__action-button--edit"
              onClick={handleEditClick}
              aria-label={`Edit ${character.name}`}
              title="Edit character"
            >
              <Edit2 className="character-card__action-icon" />
            </button>
          )}
          {onDelete && (
            <button
              className="character-card__action-button character-card__action-button--delete"
              onClick={handleDeleteClick}
              aria-label={`Delete ${character.name}`}
              title="Delete character"
            >
              <Trash2 className="character-card__action-icon" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Memoization with Custom Comparison
// ============================================================================

/**
 * Custom comparison function for React.memo
 * Only re-render if these props change:
 * - character.character_id
 * - character.name
 * - character.role.archetype
 * - character.visual_identity.age_range
 * - character.creation_timestamp
 * - selected
 * - loading
 */
function arePropsEqual(
  prevProps: CharacterCardProps,
  nextProps: CharacterCardProps
): boolean {
  // Always re-render if loading state changes
  if (prevProps.loading !== nextProps.loading) {
    return false;
  }

  // If loading, don't compare character data
  if (nextProps.loading) {
    return true;
  }

  // Compare character data
  const prevChar = prevProps.character;
  const nextChar = nextProps.character;

  // Add null checks for potentially undefined properties
  const prevName = prevChar?.name ?? '';
  const nextName = nextChar?.name ?? '';
  const prevArchetype = prevChar?.role?.archetype ?? '';
  const nextArchetype = nextChar?.role?.archetype ?? '';
  const prevAgeRange = prevChar?.visual_identity?.age_range ?? '';
  const nextAgeRange = nextChar?.visual_identity?.age_range ?? '';
  const prevTimestamp = prevChar?.creation_timestamp ?? '';
  const nextTimestamp = nextChar?.creation_timestamp ?? '';

  if (
    prevChar.character_id !== nextChar.character_id ||
    prevName !== nextName ||
    prevArchetype !== nextArchetype ||
    prevAgeRange !== nextAgeRange ||
    prevTimestamp !== nextTimestamp
  ) {
    return false;
  }

  // Compare selection state
  if (prevProps.selected !== nextProps.selected) {
    return false;
  }

  // Compare selectable mode
  if (prevProps.selectable !== nextProps.selectable) {
    return false;
  }

  // Compare showActions
  if (prevProps.showActions !== nextProps.showActions) {
    return false;
  }

  // Props are equal, don't re-render
  return true;
}

// Export memoized component
export const CharacterCardMemoized = memo(CharacterCardComponent, arePropsEqual);
