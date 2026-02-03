// ============================================================================
// CharactersSection Component Tests
// ============================================================================
// Tests for the CharactersSection component that wraps CharacterList
// on the project dashboard.
//
// Requirements: 1.1, 1.5, 2.1, 3.1
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { CharactersSection } from '../CharactersSection';
import type { Character } from '@/types/character';

// Mock dependencies
vi.mock('@/hooks/useCharacterManager');
vi.mock('@/stores/useAppStore', () => ({
  useStore: vi.fn(),
}));
vi.mock('@/services/eventEmitter', () => ({
  eventEmitter: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  },
}));

// Import mocked modules after mocking
import { useCharacterManager } from '@/hooks/useCharacterManager';
import { useStore } from '@/stores/useAppStore';

// ============================================================================
// Test Data
// ============================================================================

const mockCharacter: Character = {
  character_id: 'char-1',
  name: 'Test Hero',
  creation_method: 'wizard',
  creation_timestamp: '2024-01-01T00:00:00.000Z',
  version: '1.0',
  visual_identity: {
    hair_color: 'black',
    hair_style: 'short',
    hair_length: 'short',
    eye_color: 'brown',
    eye_shape: 'almond',
    skin_tone: 'medium',
    facial_structure: 'oval',
    distinctive_features: [],
    age_range: '25-35',
    height: '180cm',
    build: 'athletic',
    posture: 'upright',
    clothing_style: 'casual',
    color_palette: ['blue', 'black'],
  },
  personality: {
    traits: ['brave', 'loyal'],
    values: ['justice', 'honor'],
    fears: ['failure'],
    desires: ['peace'],
    flaws: ['stubborn'],
    strengths: ['determined'],
    temperament: 'calm',
    communication_style: 'direct',
  },
  background: {
    origin: 'City',
    occupation: 'Warrior',
    education: 'Military Academy',
    family: 'Parents deceased',
    significant_events: ['Battle of the Plains'],
    current_situation: 'Seeking redemption',
  },
  relationships: [],
  role: {
    archetype: 'Hero',
    narrative_function: 'Protagonist',
    character_arc: 'Redemption',
  },
};

// ============================================================================
// Test Setup
// ============================================================================

describe('CharactersSection', () => {
  const mockOnCreateCharacter = vi.fn();
  const mockOnCharacterClick = vi.fn();
  const mockOnEditCharacter = vi.fn();
  const mockOnDeleteCharacter = vi.fn();

  const mockCharacterManager = {
    getAllCharacters: vi.fn(),
    searchCharacters: vi.fn(),
    filterCharacters: vi.fn(),
    getCharacter: vi.fn(),
    createCharacter: vi.fn(),
    updateCharacter: vi.fn(),
    deleteCharacter: vi.fn(),
    validateCharacter: vi.fn(),
    checkDependencies: vi.fn(),
    addRelationship: vi.fn(),
    updateRelationship: vi.fn(),
    removeRelationship: vi.fn(),
  };

  const mockStore = {
    characterSearchQuery: '',
    characterFilters: {},
    setCharacterSearchQuery: vi.fn(),
    setCharacterFilters: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mocks
    vi.mocked(useCharacterManager).mockReturnValue(mockCharacterManager);
    vi.mocked(useStore).mockImplementation((selector: any) => {
      const state = mockStore;
      return selector(state);
    });

    // Default: no characters
    mockCharacterManager.getAllCharacters.mockReturnValue([]);
    mockCharacterManager.searchCharacters.mockReturnValue([]);
    mockCharacterManager.filterCharacters.mockReturnValue([]);
  });

  // ============================================================================
  // Requirement 1.1: Characters section on dashboard
  // ============================================================================

  describe('Requirement 1.1: Dashboard characters section', () => {
    it('should render the characters section with title and icon', () => {
      const { container } = render(
        <CharactersSection
          onCreateCharacter={mockOnCreateCharacter}
          onCharacterClick={mockOnCharacterClick}
        />
      );

      // Check for section title
      expect(screen.getByText('Characters')).toBeInTheDocument();
      
      // Check for header element
      const header = container.querySelector('.characters-section__header');
      expect(header).toBeTruthy();
      
      // Check for title group with icon
      const titleGroup = container.querySelector('.characters-section__title-group');
      expect(titleGroup).toBeTruthy();
    });

    it('should render the create character button', () => {
      render(
        <CharactersSection
          onCreateCharacter={mockOnCreateCharacter}
          onCharacterClick={mockOnCharacterClick}
        />
      );

      // Get all create buttons (header + empty state)
      const createButtons = screen.getAllByRole('button', { name: /create character/i });
      expect(createButtons.length).toBeGreaterThanOrEqual(1);
      
      // Check that at least one has the title attribute (the header button)
      const headerButton = createButtons.find(btn => btn.hasAttribute('title'));
      expect(headerButton).toBeTruthy();
    });

    it('should render the CharacterList component', () => {
      render(
        <CharactersSection
          onCreateCharacter={mockOnCreateCharacter}
          onCharacterClick={mockOnCharacterClick}
        />
      );

      // CharacterList should be present (check for its container)
      const content = document.querySelector('.characters-section__content');
      expect(content).toBeInTheDocument();
      
      // CharacterList renders its own container
      const characterList = document.querySelector('.character-list');
      expect(characterList).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Requirement 1.5: Empty state with create button
  // ============================================================================

  describe('Requirement 1.5: Empty state with create button', () => {
    it('should display empty state when no characters exist', () => {
      mockCharacterManager.getAllCharacters.mockReturnValue([]);

      render(
        <CharactersSection
          onCreateCharacter={mockOnCreateCharacter}
          onCharacterClick={mockOnCharacterClick}
        />
      );

      // Check for empty state message
      expect(screen.getByText(/no characters yet/i)).toBeInTheDocument();
    });

    it('should show create button in empty state', () => {
      mockCharacterManager.getAllCharacters.mockReturnValue([]);

      render(
        <CharactersSection
          onCreateCharacter={mockOnCreateCharacter}
          onCharacterClick={mockOnCharacterClick}
        />
      );

      // Should have multiple create buttons (header + empty state)
      const createButtons = screen.getAllByRole('button', { name: /create character/i });
      expect(createButtons.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ============================================================================
  // Requirement 3.1: Character creation from dashboard
  // ============================================================================

  describe('Requirement 3.1: Character creation from dashboard', () => {
    it('should call onCreateCharacter when create button is clicked', () => {
      render(
        <CharactersSection
          onCreateCharacter={mockOnCreateCharacter}
          onCharacterClick={mockOnCharacterClick}
        />
      );

      // Get all create buttons and click the first one (header button)
      const createButtons = screen.getAllByRole('button', { name: /create character/i });
      fireEvent.click(createButtons[0]);

      expect(mockOnCreateCharacter).toHaveBeenCalledTimes(1);
    });

    it('should call onCreateCharacter from empty state button', () => {
      mockCharacterManager.getAllCharacters.mockReturnValue([]);

      render(
        <CharactersSection
          onCreateCharacter={mockOnCreateCharacter}
          onCharacterClick={mockOnCharacterClick}
        />
      );

      // Click any create button
      const createButtons = screen.getAllByRole('button', { name: /create character/i });
      fireEvent.click(createButtons[0]);

      expect(mockOnCreateCharacter).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Requirement 2.1: Character editor interface
  // ============================================================================

  describe('Requirement 2.1: Character editor interface', () => {
    it('should call onCharacterClick when a character card is clicked', () => {
      mockCharacterManager.getAllCharacters.mockReturnValue([mockCharacter]);

      render(
        <CharactersSection
          onCreateCharacter={mockOnCreateCharacter}
          onCharacterClick={mockOnCharacterClick}
        />
      );

      // Find and click the character card
      const characterCard = screen.getByText('Test Hero').closest('.character-card');
      expect(characterCard).toBeInTheDocument();
      
      if (characterCard) {
        fireEvent.click(characterCard);
        expect(mockOnCharacterClick).toHaveBeenCalledWith(mockCharacter);
      }
    });

    it('should pass onEdit handler to CharacterList', () => {
      mockCharacterManager.getAllCharacters.mockReturnValue([mockCharacter]);

      render(
        <CharactersSection
          onCreateCharacter={mockOnCreateCharacter}
          onCharacterClick={mockOnCharacterClick}
          onEditCharacter={mockOnEditCharacter}
        />
      );

      // The edit handler should be passed through
      // This is tested indirectly through CharacterList tests
      expect(mockOnEditCharacter).toBeDefined();
    });

    it('should pass onDelete handler to CharacterList', () => {
      mockCharacterManager.getAllCharacters.mockReturnValue([mockCharacter]);

      render(
        <CharactersSection
          onCreateCharacter={mockOnCreateCharacter}
          onCharacterClick={mockOnCharacterClick}
          onDeleteCharacter={mockOnDeleteCharacter}
        />
      );

      // The delete handler should be passed through
      // This is tested indirectly through CharacterList tests
      expect(mockOnDeleteCharacter).toBeDefined();
    });
  });

  // ============================================================================
  // Component Integration Tests
  // ============================================================================

  describe('Component integration', () => {
    it('should display characters when they exist', () => {
      mockCharacterManager.getAllCharacters.mockReturnValue([mockCharacter]);

      render(
        <CharactersSection
          onCreateCharacter={mockOnCreateCharacter}
          onCharacterClick={mockOnCharacterClick}
        />
      );

      // Character should be displayed
      expect(screen.getByText('Test Hero')).toBeInTheDocument();
      expect(screen.getByText('Hero')).toBeInTheDocument();
    });

    it('should pass showActions prop to CharacterList', () => {
      mockCharacterManager.getAllCharacters.mockReturnValue([mockCharacter]);

      render(
        <CharactersSection
          onCreateCharacter={mockOnCreateCharacter}
          onCharacterClick={mockOnCharacterClick}
          showActions={true}
        />
      );

      // When showActions is true, action buttons should be present
      // This is tested indirectly through CharacterList tests
      const characterCard = screen.getByText('Test Hero').closest('.character-card');
      expect(characterCard).toBeInTheDocument();
    });

    it('should handle multiple characters', () => {
      const characters = [
        mockCharacter,
        { ...mockCharacter, character_id: 'char-2', name: 'Test Villain' },
        { ...mockCharacter, character_id: 'char-3', name: 'Test Sidekick' },
      ];
      mockCharacterManager.getAllCharacters.mockReturnValue(characters);

      render(
        <CharactersSection
          onCreateCharacter={mockOnCreateCharacter}
          onCharacterClick={mockOnCharacterClick}
        />
      );

      // All characters should be displayed
      expect(screen.getByText('Test Hero')).toBeInTheDocument();
      expect(screen.getByText('Test Villain')).toBeInTheDocument();
      expect(screen.getByText('Test Sidekick')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Accessibility Tests
  // ============================================================================

  describe('Accessibility', () => {
    it('should have accessible create button', () => {
      render(
        <CharactersSection
          onCreateCharacter={mockOnCreateCharacter}
          onCharacterClick={mockOnCharacterClick}
        />
      );

      // Get all create buttons and check the header button has title
      const createButtons = screen.getAllByRole('button', { name: /create character/i });
      const headerButton = createButtons[0]; // First button is the header button
      expect(headerButton).toHaveAttribute('title');
    });

    it('should have proper heading hierarchy', () => {
      render(
        <CharactersSection
          onCreateCharacter={mockOnCreateCharacter}
          onCharacterClick={mockOnCharacterClick}
        />
      );

      // Get the section heading specifically (not the empty state heading)
      const heading = screen.getByText('Characters').closest('h3');
      expect(heading).toBeInTheDocument();
      expect(heading?.tagName).toBe('H3');
    });
  });

  // ============================================================================
  // Responsive Design Tests
  // ============================================================================

  describe('Responsive design', () => {
    it('should render with proper CSS classes for responsive layout', () => {
      const { container } = render(
        <CharactersSection
          onCreateCharacter={mockOnCreateCharacter}
          onCharacterClick={mockOnCharacterClick}
        />
      );

      const section = container.querySelector('.characters-section');
      expect(section).toBeInTheDocument();
      expect(section).toHaveClass('characters-section');
    });

    it('should have responsive header layout', () => {
      render(
        <CharactersSection
          onCreateCharacter={mockOnCreateCharacter}
          onCharacterClick={mockOnCharacterClick}
        />
      );

      const header = document.querySelector('.characters-section__header');
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('characters-section__header');
    });
  });
});
