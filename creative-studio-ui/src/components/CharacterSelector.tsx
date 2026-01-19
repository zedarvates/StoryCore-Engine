// ============================================================================
// Character Selector Component
// ============================================================================
// Dropdown component for selecting characters in shot editing and other contexts

import React, { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCharacters } from '@/store';
import type { Character } from '@/types/character';
import {
  sortCharactersByName,
  getCharacterSummary,
  filterCharactersForSelection,
} from '@/utils/characterStorage';

// ============================================================================
// Character Selector Props
// ============================================================================

export interface CharacterSelectorProps {
  value?: string; // character_id
  onChange: (characterId: string) => void;
  placeholder?: string;
  excludeId?: string; // Exclude a specific character (e.g., current character)
  disabled?: boolean;
  required?: boolean;
  className?: string;
  groupByArchetype?: boolean;
  sortBy?: 'name' | 'date';
  emptyMessage?: string;
}

// ============================================================================
// Character Selector Component
// ============================================================================

export function CharacterSelector({
  value,
  onChange,
  placeholder = 'Select a character',
  excludeId,
  disabled = false,
  required = false,
  className,
  groupByArchetype = false,
  sortBy = 'name',
  emptyMessage = 'No characters available',
}: CharacterSelectorProps) {
  // Get characters from store
  const allCharacters = useCharacters();

  // Filter and sort characters
  const characters = useMemo(() => {
    let filtered = filterCharactersForSelection(allCharacters, excludeId);

    if (sortBy === 'name') {
      filtered = sortCharactersByName(filtered);
    }

    return filtered;
  }, [allCharacters, excludeId, sortBy]);

  // Group characters by archetype if requested
  const groupedCharacters = useMemo(() => {
    if (!groupByArchetype) return null;

    const groups: Record<string, Character[]> = {};
    characters.forEach((character) => {
      const archetype = character.role?.archetype || 'Unspecified';
      if (!groups[archetype]) {
        groups[archetype] = [];
      }
      groups[archetype].push(character);
    });

    return groups;
  }, [characters, groupByArchetype]);

  // Handle empty state
  if (characters.length === 0) {
    return (
      <Select disabled={true}>
        <SelectTrigger className={className}>
          <SelectValue placeholder={emptyMessage} />
        </SelectTrigger>
      </Select>
    );
  }

  // Render grouped characters
  if (groupByArchetype && groupedCharacters) {
    return (
      <Select
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        required={required}
      >
        <SelectTrigger className={className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(groupedCharacters).map(([archetype, chars]) => (
            <React.Fragment key={archetype}>
              <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                {archetype}
              </div>
              {chars.map((character) => (
                <SelectItem
                  key={character.character_id}
                  value={character.character_id}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{character.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {character.visual_identity?.age_range && (
                        <>{character.visual_identity.age_range}</>
                      )}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </React.Fragment>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Render flat list
  return (
    <Select
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      required={required}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {characters.map((character) => (
          <SelectItem key={character.character_id} value={character.character_id}>
            <div className="flex flex-col">
              <span className="font-medium">{character.name}</span>
              <span className="text-xs text-muted-foreground">
                {getCharacterSummary(character)}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ============================================================================
// Multi-Character Selector Component
// ============================================================================

export interface MultiCharacterSelectorProps {
  value: string[]; // array of character_ids
  onChange: (characterIds: string[]) => void;
  placeholder?: string;
  excludeId?: string;
  disabled?: boolean;
  maxSelections?: number;
  className?: string;
}

export function MultiCharacterSelector({
  value,
  onChange,
  placeholder = 'Select characters',
  excludeId,
  disabled = false,
  maxSelections,
  className,
}: MultiCharacterSelectorProps) {
  const allCharacters = useCharacters();

  const characters = useMemo(() => {
    return sortCharactersByName(
      filterCharactersForSelection(allCharacters, excludeId)
    );
  }, [allCharacters, excludeId]);

  const handleToggle = (characterId: string) => {
    if (value.includes(characterId)) {
      // Remove character
      onChange(value.filter((id) => id !== characterId));
    } else {
      // Add character (if not at max)
      if (!maxSelections || value.length < maxSelections) {
        onChange([...value, characterId]);
      }
    }
  };

  const selectedCharacters = useMemo(() => {
    return characters.filter((char) => value.includes(char.character_id));
  }, [characters, value]);

  if (characters.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No characters available
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-2">
        {/* Selected characters */}
        {selectedCharacters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedCharacters.map((character) => (
              <div
                key={character.character_id}
                className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-1.5 text-sm"
              >
                <span className="font-medium">{character.name}</span>
                <button
                  type="button"
                  onClick={() => handleToggle(character.character_id)}
                  disabled={disabled}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={`Remove ${character.name}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Character selection dropdown */}
        <Select
          value=""
          onValueChange={handleToggle}
          disabled={disabled || (maxSelections !== undefined && value.length >= maxSelections)}
        >
          <SelectTrigger>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {characters
              .filter((char) => !value.includes(char.character_id))
              .map((character) => (
                <SelectItem
                  key={character.character_id}
                  value={character.character_id}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{character.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {getCharacterSummary(character)}
                    </span>
                  </div>
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        {maxSelections && (
          <p className="text-xs text-muted-foreground">
            {value.length} / {maxSelections} selected
          </p>
        )}
      </div>
    </div>
  );
}
