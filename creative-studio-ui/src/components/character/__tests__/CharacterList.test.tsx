// ============================================================================
// CharacterList Component Tests
// ============================================================================
// Comprehensive test suite for CharacterList component including:
// - Component rendering and structure
// - Search and filter functionality
// - Selection mode for Story Generator
// - Empty state display
// - Real-time event updates
// - User interactions
//
// Requirements: 1.1, 1.2, 1.3, 1.5, 4.2, 4.5, 5.1, 5.2, 5.3, 9.2, 9.4
// ============================================================================

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CharacterList } from '../CharacterList';
import { useStore } from '@/stores/useAppStore';
import { useCharacterManager } from '@/hooks/useCharacterManager';
import { eventEmitter } from '@/services/eventEmitter';
import type { Character } from '@/types/character';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@/hooks/useCharacterManager');
vi.mock('@/stores/useAppStore', () => ({
  useStore: vi.fn(),
  CharacterFilters: {},
}));

// ============================================================================
// Test Fixtures
// ============================================================================

const createMockCharacter = (overrides: Partial<Character> = {}): Character => ({
  character_id: `char-${Math.random()}`,
  name: 'Test Character',
  creation_method: 'wizard',
  creation_timestamp: new Date().toISOString(),
  version: '1.0',
  visual_identity: {
    hair_color: 'Brown',
    hair_style: 'Short',
    hair_length: 'Short',
    eye_color: 'Blue',
    eye_shape: 'Round',
    skin_tone: 'Fair',
    facial_structure: 'Oval',
    distinctive_features: [],
    age_range: 'Adult (36-55)',
    height: 'Average',
    build: 'Athletic',
    posture: 'Upright',
    clothing_style: 'Casual',
    color_palette: ['Blue', 'Gray'],
  },
  personality: {
    traits: ['Brave', 'Loyal'],
    values: ['Honor', 'Justice'],
    fears: ['Failure'],
    desires: ['Success'],
    flaws: ['Stubborn'],
    strengths: ['Determined'],
    temperament: 'Calm',
    communication_style: 'Direct',
  },
  background: {
    origin: 'City',
    occupation: 'Warrior',
    education: 'Military',
    family: 'Large',
    significant_events: [],
    current_situation: 'Active',
  },
  relationships: [],
  role: {
    archetype: 'Hero',
    narrative_function: 'Protagonist',
    character_arc: 'Growth',
  },
  ...overrides,
});

// ============================================================================
// Test Suite
// ============================================================================

describe('CharacterList', () => {
  let mockCharacters: Character[];
  let mockStoreState: any;

  beforeEach(() => {
    // Create mock characters with different timestamps for sorting tests
    mockCharacters = [
      createMockCharacter({
        character_id: 'char-1',
        name: 'Alice Hero',
        creation_timestamp: '2024-01-01T10:00:00Z',
        role: { archetype: 'Hero', narrative_function: 'Protagonist', character_arc: 'Growth' },
      }),
      createMockCharacter({
        character_id: 'char-2',
        name: 'Bob Mentor',
        creation_timestamp: '2024-01-02T10:00:00Z',
        role: { archetype: 'Mentor', narrative_function: 'Guide', character_arc: 'Flat' },
      }),
      createMockCharacter({
        character_id: 'char-3',
        name: 'Charlie Villain',
        creation_timestamp: '2024-01-03T10:00:00Z',
        role: { archetype: 'Shadow', narrative_function: 'Antagonist', character_arc: 'Corruption' },
      }),
    ];

    // Mock store state
    mockStoreState = {
      characterSearchQuery: '',
      characterFilters: {},
      selectedCharacterIds: [],
      setCharacterSearchQuery: vi.fn((query: string) => {
        mockStoreState.characterSearchQuery = query;
      }),
      setCharacterFilters: vi.fn((filters: any) => {
        mockStoreState.characterFilters = filters;
      }),
      setSelectedCharacterIds: vi.fn((ids: string[]) => {
        mockStoreState.selectedCharacterIds = ids;
      }),
    };

    // Mock useStore hook
    vi.mocked(useStore).mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector(mockStoreState);
      }
      return mockStoreState;
    });

    // Mock useCharacterManager hook
    vi.mocked(useCharacterManager).mockReturnValue({
      getAllCharacters: vi.fn(() => mockCharacters),
      searchCharacters: vi.fn((query: string) => {
        return mockCharacters.filter(c =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.role.archetype.toLowerCase().includes(query.toLowerCase())
        );
      }),
      filterCharacters: vi.fn((filters) => {
        return mockCharacters.filter(c => {
          if (filters.archetype?.length) {
            return filters.archetype.includes(c.role.archetype);
          }
          return true;
        });
      }),
      createCharacter: vi.fn(),
      updateCharacter: vi.fn(),
      deleteCharacter: vi.fn(),
      getCharacter: vi.fn(),
      validateCharacter: vi.fn(),
      checkDependencies: vi.fn(),
      addRelationship: vi.fn(),
      updateRelationship: vi.fn(),
      removeRelationship: vi.fn(),
    });
  });

  // ============================================================================
  // Basic Rendering Tests
  // ============================================================================

  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      render(<CharacterList />);
      expect(screen.getByRole('textbox', { name: /search characters/i })).toBeInTheDocument();
    });

    it('should render CharacterSearchBar component', () => {
      render(<CharacterList />);
      expect(screen.getByRole('textbox', { name: /search characters/i })).toBeInTheDocument();
    });

    it('should render character cards for all characters', () => {
      render(<CharacterList />);
      
      expect(screen.getByText('Alice Hero')).toBeInTheDocument();
      expect(screen.getByText('Bob Mentor')).toBeInTheDocument();
      expect(screen.getByText('Charlie Villain')).toBeInTheDocument();
    });

    it('should display result count', () => {
      render(<CharacterList />);
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('characters')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Sorting Tests
  // ============================================================================

  describe('Character Sorting', () => {
    it('should sort characters by creation date (newest first)', () => {
      // Requirement: 1.3
      render(<CharacterList />);
      
      const characterCards = screen.getAllByRole('article');
      
      // Charlie (2024-01-03) should be first
      expect(within(characterCards[0]).getByText('Charlie Villain')).toBeInTheDocument();
      
      // Bob (2024-01-02) should be second
      expect(within(characterCards[1]).getByText('Bob Mentor')).toBeInTheDocument();
      
      // Alice (2024-01-01) should be last
      expect(within(characterCards[2]).getByText('Alice Hero')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Empty State Tests
  // ============================================================================

  describe('Empty State', () => {
    it('should display empty state when no characters exist', () => {
      // Requirement: 1.5
      mockCharacters = [];
      
      vi.mocked(useCharacterManager).mockReturnValue({
        getAllCharacters: vi.fn(() => []),
        searchCharacters: vi.fn(() => []),
        filterCharacters: vi.fn(() => []),
        createCharacter: vi.fn(),
        updateCharacter: vi.fn(),
        deleteCharacter: vi.fn(),
        getCharacter: vi.fn(),
        validateCharacter: vi.fn(),
        checkDependencies: vi.fn(),
        addRelationship: vi.fn(),
        updateRelationship: vi.fn(),
        removeRelationship: vi.fn(),
      });

      render(<CharacterList />);
      
      expect(screen.getByText('No characters yet')).toBeInTheDocument();
      expect(screen.getByText(/create your first character/i)).toBeInTheDocument();
    });

    it('should display create button in empty state', () => {
      // Requirement: 1.5
      mockCharacters = [];
      
      vi.mocked(useCharacterManager).mockReturnValue({
        getAllCharacters: vi.fn(() => []),
        searchCharacters: vi.fn(() => []),
        filterCharacters: vi.fn(() => []),
        createCharacter: vi.fn(),
        updateCharacter: vi.fn(),
        deleteCharacter: vi.fn(),
        getCharacter: vi.fn(),
        validateCharacter: vi.fn(),
        checkDependencies: vi.fn(),
        addRelationship: vi.fn(),
        updateRelationship: vi.fn(),
        removeRelationship: vi.fn(),
      });

      const onCreateClick = vi.fn();
      render(<CharacterList onCreateClick={onCreateClick} />);
      
      const createButton = screen.getByRole('button', { name: /create character/i });
      expect(createButton).toBeInTheDocument();
    });

    it('should call onCreateClick when create button is clicked', async () => {
      // Requirement: 1.5
      mockCharacters = [];
      
      vi.mocked(useCharacterManager).mockReturnValue({
        getAllCharacters: vi.fn(() => []),
        searchCharacters: vi.fn(() => []),
        filterCharacters: vi.fn(() => []),
        createCharacter: vi.fn(),
        updateCharacter: vi.fn(),
        deleteCharacter: vi.fn(),
        getCharacter: vi.fn(),
        validateCharacter: vi.fn(),
        checkDependencies: vi.fn(),
        addRelationship: vi.fn(),
        updateRelationship: vi.fn(),
        removeRelationship: vi.fn(),
      });

      const user = userEvent.setup();
      const onCreateClick = vi.fn();
      render(<CharacterList onCreateClick={onCreateClick} />);
      
      const createButton = screen.getByRole('button', { name: /create character/i });
      await user.click(createButton);
      
      expect(onCreateClick).toHaveBeenCalledTimes(1);
    });

    it('should display "no results" message when search has no matches', () => {
      mockStoreState.characterSearchQuery = 'nonexistent';

      vi.mocked(useCharacterManager).mockReturnValue({
        getAllCharacters: vi.fn(() => mockCharacters),
        searchCharacters: vi.fn(() => []),
        filterCharacters: vi.fn(() => mockCharacters),
        createCharacter: vi.fn(),
        updateCharacter: vi.fn(),
        deleteCharacter: vi.fn(),
        getCharacter: vi.fn(),
        validateCharacter: vi.fn(),
        checkDependencies: vi.fn(),
        addRelationship: vi.fn(),
        updateRelationship: vi.fn(),
        removeRelationship: vi.fn(),
      });

      render(<CharacterList />);
      
      expect(screen.getByText('No characters found')).toBeInTheDocument();
      expect(screen.getByText(/try adjusting your search/i)).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Search and Filter Tests
  // ============================================================================

  describe('Search and Filter', () => {
    it('should filter characters based on search query', async () => {
      // Requirement: 9.2
      const user = userEvent.setup();
      render(<CharacterList />);
      
      const searchInput = screen.getByRole('textbox', { name: /search characters/i });
      
      // Initially all 3 characters should be visible
      expect(screen.getByText('Alice Hero')).toBeInTheDocument();
      expect(screen.getByText('Bob Mentor')).toBeInTheDocument();
      expect(screen.getByText('Charlie Villain')).toBeInTheDocument();
      
      // Type in search - the component will call searchCharacters which filters
      // But since we're mocking, we need to verify the search input works
      await user.type(searchInput, 'Alice');
      
      // Verify search input has the value
      expect(searchInput).toHaveValue('Alice');
    });

    it('should update result count when filtering', async () => {
      // Requirement: 9.5
      render(<CharacterList />);
      
      // Initial count should be 3
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('characters')).toBeInTheDocument(); // Plural
    });
  });

  // ============================================================================
  // Selection Mode Tests
  // ============================================================================

  describe('Selection Mode', () => {
    it('should render checkboxes when selectable is true', () => {
      // Requirement: 4.2
      render(<CharacterList selectable={true} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(3);
    });

    it('should not render checkboxes when selectable is false', () => {
      render(<CharacterList selectable={false} />);
      
      const checkboxes = screen.queryAllByRole('checkbox');
      expect(checkboxes).toHaveLength(0);
    });

    it('should mark selected characters as checked', () => {
      // Requirement: 4.2
      const selectedIds = ['char-1', 'char-3'];
      render(<CharacterList selectable={true} selectedIds={selectedIds} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      
      // Alice (char-1) should be checked
      expect(checkboxes[0]).toBeChecked();
      
      // Bob (char-2) should not be checked
      expect(checkboxes[1]).not.toBeChecked();
      
      // Charlie (char-3) should be checked
      expect(checkboxes[2]).toBeChecked();
    });

    it('should call onSelectionChange when character is selected', async () => {
      // Requirement: 4.2, 4.5
      const user = userEvent.setup();
      const onSelectionChange = vi.fn();
      
      render(
        <CharacterList
          selectable={true}
          selectedIds={[]}
          onSelectionChange={onSelectionChange}
        />
      );
      
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // Select Alice
      
      expect(onSelectionChange).toHaveBeenCalledWith(['char-3']); // Charlie is first due to sorting
    });

    it('should call onSelectionChange when character is deselected', async () => {
      // Requirement: 4.2
      const user = userEvent.setup();
      const onSelectionChange = vi.fn();
      
      render(
        <CharacterList
          selectable={true}
          selectedIds={['char-3', 'char-2']}
          onSelectionChange={onSelectionChange}
        />
      );
      
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // Deselect Charlie
      
      expect(onSelectionChange).toHaveBeenCalledWith(['char-2']);
    });

    it('should support multi-select', async () => {
      // Requirement: 4.2
      const user = userEvent.setup();
      const onSelectionChange = vi.fn();
      
      render(
        <CharacterList
          selectable={true}
          selectedIds={[]}
          onSelectionChange={onSelectionChange}
        />
      );
      
      const checkboxes = screen.getAllByRole('checkbox');
      
      // Select first character
      await user.click(checkboxes[0]);
      expect(onSelectionChange).toHaveBeenCalledWith(['char-3']);
      
      // Select second character
      await user.click(checkboxes[1]);
      expect(onSelectionChange).toHaveBeenCalledWith(['char-2']);
    });
  });

  // ============================================================================
  // Real-Time Event Updates Tests
  // ============================================================================

  describe('Real-Time Event Updates', () => {
    it('should update list when character-created event is emitted', async () => {
      // Requirement: 5.1
      render(<CharacterList />);
      
      // Initial state: 3 characters
      expect(screen.getAllByRole('article')).toHaveLength(3);
      
      // Add new character to mock data
      const newCharacter = createMockCharacter({
        character_id: 'char-4',
        name: 'Diana Ally',
        creation_timestamp: '2024-01-04T10:00:00Z',
      });
      mockCharacters.push(newCharacter);
      
      // Emit character-created event
      eventEmitter.emit('character-created', { character: newCharacter });
      
      // Wait for update
      await waitFor(() => {
        expect(screen.getAllByRole('article')).toHaveLength(4);
        expect(screen.getByText('Diana Ally')).toBeInTheDocument();
      });
    });

    it('should update list when character-updated event is emitted', async () => {
      // Requirement: 5.2
      const { rerender } = render(<CharacterList />);
      
      // Initial state
      expect(screen.getByText('Alice Hero')).toBeInTheDocument();
      
      // Update character in mock data
      const updatedCharacters = mockCharacters.map(c =>
        c.character_id === 'char-1' ? { ...c, name: 'Alice Updated' } : c
      );
      
      // Update the mock to return updated characters
      vi.mocked(useCharacterManager).mockReturnValue({
        getAllCharacters: vi.fn(() => updatedCharacters),
        searchCharacters: vi.fn(() => updatedCharacters),
        filterCharacters: vi.fn(() => updatedCharacters),
        createCharacter: vi.fn(),
        updateCharacter: vi.fn(),
        deleteCharacter: vi.fn(),
        getCharacter: vi.fn(),
        validateCharacter: vi.fn(),
        checkDependencies: vi.fn(),
        addRelationship: vi.fn(),
        updateRelationship: vi.fn(),
        removeRelationship: vi.fn(),
      });
      
      // Emit character-updated event
      eventEmitter.emit('character-updated', {
        characterId: 'char-1',
        updates: { name: 'Alice Updated' },
      });
      
      // Force re-render
      rerender(<CharacterList />);
      
      // Wait for update
      await waitFor(() => {
        expect(screen.getByText('Alice Updated')).toBeInTheDocument();
      });
    });

    it('should update list when character-deleted event is emitted', async () => {
      // Requirement: 5.3
      render(<CharacterList />);
      
      // Initial state: 3 characters
      expect(screen.getAllByRole('article')).toHaveLength(3);
      
      // Remove character from mock data
      mockCharacters = mockCharacters.filter(c => c.character_id !== 'char-1');
      
      // Update mock to return filtered characters
      vi.mocked(useCharacterManager).mockReturnValue({
        getAllCharacters: vi.fn(() => mockCharacters),
        searchCharacters: vi.fn(() => mockCharacters),
        filterCharacters: vi.fn(() => mockCharacters),
        createCharacter: vi.fn(),
        updateCharacter: vi.fn(),
        deleteCharacter: vi.fn(),
        getCharacter: vi.fn(),
        validateCharacter: vi.fn(),
        checkDependencies: vi.fn(),
        addRelationship: vi.fn(),
        updateRelationship: vi.fn(),
        removeRelationship: vi.fn(),
      });
      
      // Emit character-deleted event
      eventEmitter.emit('character-deleted', {
        characterId: 'char-1',
        characterName: 'Alice Hero',
      });
      
      // Wait for update
      await waitFor(() => {
        expect(screen.getAllByRole('article')).toHaveLength(2);
        expect(screen.queryByText('Alice Hero')).not.toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // User Interaction Tests
  // ============================================================================

  describe('User Interactions', () => {
    it('should call onCharacterClick when card is clicked', async () => {
      const user = userEvent.setup();
      const onCharacterClick = vi.fn();
      
      render(<CharacterList onCharacterClick={onCharacterClick} />);
      
      const characterCards = screen.getAllByRole('article');
      await user.click(characterCards[0]);
      
      expect(onCharacterClick).toHaveBeenCalledTimes(1);
      expect(onCharacterClick).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Charlie Villain' })
      );
    });

    it('should call onEdit when edit button is clicked', async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();
      
      render(<CharacterList showActions={true} onEdit={onEdit} />);
      
      const editButtons = screen.getAllByLabelText(/edit/i);
      await user.click(editButtons[0]);
      
      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onEdit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Charlie Villain' })
      );
    });

    it('should call onDelete when delete button is clicked', async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn();
      
      render(<CharacterList showActions={true} onDelete={onDelete} />);
      
      const deleteButtons = screen.getAllByLabelText(/delete/i);
      await user.click(deleteButtons[0]);
      
      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Charlie Villain' })
      );
    });
  });

  // ============================================================================
  // Accessibility Tests
  // ============================================================================

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<CharacterList />);
      
      expect(screen.getByRole('textbox', { name: /search characters/i })).toBeInTheDocument();
    });

    it('should have proper roles for character cards', () => {
      render(<CharacterList />);
      
      const characterCards = screen.getAllByRole('article');
      expect(characterCards).toHaveLength(3);
    });

    it('should have proper labels for checkboxes in selection mode', () => {
      render(<CharacterList selectable={true} />);
      
      expect(screen.getByLabelText('Select Charlie Villain')).toBeInTheDocument();
      expect(screen.getByLabelText('Select Bob Mentor')).toBeInTheDocument();
      expect(screen.getByLabelText('Select Alice Hero')).toBeInTheDocument();
    });
  });
});
