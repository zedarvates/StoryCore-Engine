// ============================================================================
// Character Selector Component - Simple Tests
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CharacterSelector, MultiCharacterSelector } from '../CharacterSelector';
import type { Character } from '@/types/character';

// Mock the store
vi.mock('@/store', () => ({
  useCharacters: vi.fn(() => []),
}));

// Mock character storage utilities
vi.mock('@/utils/characterStorage', () => ({
  sortCharactersByName: vi.fn((chars) => chars),
  getCharacterSummary: vi.fn((char) => `${char.name} • ${char.role?.archetype}`),
  filterCharactersForSelection: vi.fn((chars, excludeId) =>
    chars.filter((c: Character) => c.character_id !== excludeId)
  ),
}));

const mockCharacters: Character[] = [
  {
    character_id: 'uuid-1',
    name: 'Hero',
    creation_method: 'wizard',
    creation_timestamp: '2024-01-01T00:00:00Z',
    version: '1.0',
    role: {
      archetype: 'Protagonist',
      narrative_function: 'Hero',
      character_arc: 'Growth',
    },
    visual_identity: {
      age_range: 'adult',
      hair_color: 'brown',
      hair_style: 'short',
      hair_length: 'short',
      eye_color: 'blue',
      eye_shape: 'round',
      skin_tone: 'fair',
      facial_structure: 'oval',
      distinctive_features: [],
      height: 'average',
      build: 'athletic',
      posture: 'upright',
      clothing_style: 'casual',
      color_palette: [],
    },
    personality: {
      traits: ['brave'],
      values: ['justice'],
      fears: ['failure'],
      desires: ['peace'],
      flaws: ['stubborn'],
      strengths: ['courage'],
      temperament: 'calm',
      communication_style: 'direct',
    },
    background: {
      origin: 'City',
      occupation: 'Warrior',
      education: 'Self-taught',
      family: 'Unknown',
      significant_events: [],
      current_situation: 'Active',
    },
    relationships: [],
  },
  {
    character_id: 'uuid-2',
    name: 'Villain',
    creation_method: 'wizard',
    creation_timestamp: '2024-01-02T00:00:00Z',
    version: '1.0',
    role: {
      archetype: 'Antagonist',
      narrative_function: 'Villain',
      character_arc: 'Corruption',
    },
    visual_identity: {
      age_range: 'adult',
      hair_color: 'black',
      hair_style: 'long',
      hair_length: 'long',
      eye_color: 'red',
      eye_shape: 'narrow',
      skin_tone: 'pale',
      facial_structure: 'angular',
      distinctive_features: ['scar'],
      height: 'tall',
      build: 'lean',
      posture: 'menacing',
      clothing_style: 'dark',
      color_palette: ['#000000'],
    },
    personality: {
      traits: ['cunning'],
      values: ['power'],
      fears: ['weakness'],
      desires: ['control'],
      flaws: ['arrogant'],
      strengths: ['intelligence'],
      temperament: 'cold',
      communication_style: 'manipulative',
    },
    background: {
      origin: 'Unknown',
      occupation: 'Warlord',
      education: 'Elite',
      family: 'Disowned',
      significant_events: ['betrayal'],
      current_situation: 'Rising',
    },
    relationships: [],
  },
];

describe('CharacterSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with placeholder when no characters', () => {
    const { useCharacters } = require('@/store');
    useCharacters.mockReturnValue([]);

    render(
      <CharacterSelector
        value=""
        onChange={vi.fn()}
        placeholder="Select a character"
      />
    );

    expect(screen.getByText('No characters available')).toBeInTheDocument();
  });

  it('renders character list when characters exist', () => {
    const { useCharacters } = require('@/store');
    useCharacters.mockReturnValue(mockCharacters);

    render(
      <CharacterSelector
        value=""
        onChange={vi.fn()}
        placeholder="Select a character"
      />
    );

    // Placeholder should be visible
    expect(screen.getByText('Select a character')).toBeInTheDocument();
  });

  it('calls onChange when character is selected', async () => {
    const { useCharacters } = require('@/store');
    useCharacters.mockReturnValue(mockCharacters);

    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <CharacterSelector
        value=""
        onChange={onChange}
        placeholder="Select a character"
      />
    );

    // Open dropdown
    const trigger = screen.getByRole('combobox');
    await user.click(trigger);

    // Select character
    const option = screen.getByText('Hero');
    await user.click(option);

    expect(onChange).toHaveBeenCalledWith('uuid-1');
  });

  it('excludes specified character from list', () => {
    const { useCharacters } = require('@/store');
    useCharacters.mockReturnValue(mockCharacters);

    render(
      <CharacterSelector
        value=""
        onChange={vi.fn()}
        excludeId="uuid-1"
      />
    );

    // filterCharactersForSelection should be called with excludeId
    const { filterCharactersForSelection } = require('@/utils/characterStorage');
    expect(filterCharactersForSelection).toHaveBeenCalledWith(
      mockCharacters,
      'uuid-1'
    );
  });

  it('displays selected character', () => {
    const { useCharacters } = require('@/store');
    useCharacters.mockReturnValue(mockCharacters);

    render(
      <CharacterSelector
        value="uuid-1"
        onChange={vi.fn()}
      />
    );

    // Selected value should be set
    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveAttribute('data-state', 'closed');
  });

  it('can be disabled', () => {
    const { useCharacters } = require('@/store');
    useCharacters.mockReturnValue(mockCharacters);

    render(
      <CharacterSelector
        value=""
        onChange={vi.fn()}
        disabled={true}
      />
    );

    const trigger = screen.getByRole('combobox');
    expect(trigger).toBeDisabled();
  });
});

describe('MultiCharacterSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with empty selection', () => {
    const { useCharacters } = require('@/store');
    useCharacters.mockReturnValue(mockCharacters);

    render(
      <MultiCharacterSelector
        value={[]}
        onChange={vi.fn()}
        placeholder="Select characters"
      />
    );

    expect(screen.getByText('Select characters')).toBeInTheDocument();
  });

  it('displays selected characters as chips', () => {
    const { useCharacters } = require('@/store');
    useCharacters.mockReturnValue(mockCharacters);

    render(
      <MultiCharacterSelector
        value={['uuid-1', 'uuid-2']}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText('Hero')).toBeInTheDocument();
    expect(screen.getByText('Villain')).toBeInTheDocument();
  });

  it('adds character when selected', async () => {
    const { useCharacters } = require('@/store');
    useCharacters.mockReturnValue(mockCharacters);

    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <MultiCharacterSelector
        value={[]}
        onChange={onChange}
      />
    );

    // Open dropdown
    const trigger = screen.getByRole('combobox');
    await user.click(trigger);

    // Select character
    const option = screen.getByText('Hero');
    await user.click(option);

    expect(onChange).toHaveBeenCalledWith(['uuid-1']);
  });

  it('removes character when chip is clicked', async () => {
    const { useCharacters } = require('@/store');
    useCharacters.mockReturnValue(mockCharacters);

    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <MultiCharacterSelector
        value={['uuid-1', 'uuid-2']}
        onChange={onChange}
      />
    );

    // Click remove button on first character
    const removeButtons = screen.getAllByRole('button', { name: /Remove/ });
    await user.click(removeButtons[0]);

    expect(onChange).toHaveBeenCalledWith(['uuid-2']);
  });

  it('respects maxSelections limit', async () => {
    const { useCharacters } = require('@/store');
    useCharacters.mockReturnValue(mockCharacters);

    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <MultiCharacterSelector
        value={['uuid-1']}
        onChange={onChange}
        maxSelections={1}
      />
    );

    // Dropdown should be disabled when at max
    const trigger = screen.getByRole('combobox');
    expect(trigger).toBeDisabled();

    // Should show selection count
    expect(screen.getByText('1 / 1 selected')).toBeInTheDocument();
  });

  it('shows selection count when maxSelections is set', () => {
    const { useCharacters } = require('@/store');
    useCharacters.mockReturnValue(mockCharacters);

    render(
      <MultiCharacterSelector
        value={['uuid-1']}
        onChange={vi.fn()}
        maxSelections={3}
      />
    );

    expect(screen.getByText('1 / 3 selected')).toBeInTheDocument();
  });

  it('handles empty character list', () => {
    const { useCharacters } = require('@/store');
    useCharacters.mockReturnValue([]);

    render(
      <MultiCharacterSelector
        value={[]}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText('No characters available')).toBeInTheDocument();
  });
});
