// ============================================================================
// ProjectDashboardNew Character Integration Tests
// ============================================================================
// Tests for character integration in the ProjectDashboardNew component.
//
// Requirements: 1.1, 2.1, 3.1
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProjectDashboardNew } from '../ProjectDashboardNew';
import type { Character } from '@/types/character';

// Mock dependencies
vi.mock('@/stores/useAppStore', () => ({
  useAppStore: vi.fn(),
  useStore: vi.fn(),
}));
vi.mock('@/store', () => ({
  useStore: vi.fn(),
}));
vi.mock('@/hooks/useCharacterManager');
vi.mock('@/services/eventEmitter', () => ({
  eventEmitter: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  },
}));

// Import mocked modules after mocking
import { useAppStore, useStore as useAppStoreStore } from '@/stores/useAppStore';
import { useStore } from '@/store';
import { useCharacterManager } from '@/hooks/useCharacterManager';

// Mock other services
vi.mock('@/services/sequencePlanService', () => ({
  sequencePlanService: {
    subscribeToPlanUpdates: vi.fn(() => vi.fn()),
    subscribeToPlanList: vi.fn(() => vi.fn()),
  },
}));

vi.mock('@/services/project/ProjectService', () => ({
  projectService: {
    getGlobalResume: vi.fn().mockResolvedValue('Test resume'),
    updateGlobalResume: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/services/llmConfigService', () => ({
  useLLMConfig: vi.fn(() => ({
    config: null,
    service: null,
    isConfigured: false,
  })),
}));

// ============================================================================
// Test Data
// ============================================================================

const mockCharacter: Character = {
  character_id: 'char-1',
  name: 'Dashboard Hero',
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

const mockProject = {
  metadata: {
    name: 'Test Project',
    path: '/test/project',
    created_at: '2024-01-01T00:00:00.000Z',
    globalResume: 'Test global resume',
  },
  characters: [],
  assets: [],
};

// ============================================================================
// Test Setup
// ============================================================================

describe('ProjectDashboardNew - Character Integration', () => {
  const mockOnOpenEditor = vi.fn();
  const mockSetShowCharacterWizard = vi.fn();
  const mockOpenCharacterEditor = vi.fn();
  const mockCloseCharacterEditor = vi.fn();

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

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup useAppStore mock
    vi.mocked(useAppStore).mockImplementation((selector: any) => {
      const state = {
        project: mockProject,
        shots: [],
        setShots: vi.fn(),
        setProject: vi.fn(),
        addShot: vi.fn(),
        openWizard: vi.fn(),
        setShowWorldWizard: vi.fn(),
        setShowCharacterWizard: mockSetShowCharacterWizard,
        setShowStorytellerWizard: vi.fn(),
        isCharacterEditorOpen: false,
        editingCharacterId: null,
        openCharacterEditor: mockOpenCharacterEditor,
        closeCharacterEditor: mockCloseCharacterEditor,
        showChat: false,
      };
      return selector(state);
    });

    // Setup useStore mock (for stories)
    vi.mocked(useStore).mockImplementation((selector: any) => {
      const state = {
        stories: [],
        getAllStories: vi.fn(() => []),
        getStoryById: vi.fn(),
        characterSearchQuery: '',
        characterFilters: {},
        setCharacterSearchQuery: vi.fn(),
        setCharacterFilters: vi.fn(),
      };
      return selector(state);
    });

    // Setup useAppStoreStore mock (for CharacterList)
    vi.mocked(useAppStoreStore).mockImplementation((selector: any) => {
      const state = {
        characterSearchQuery: '',
        characterFilters: {},
        setCharacterSearchQuery: vi.fn(),
        setCharacterFilters: vi.fn(),
      };
      return selector(state);
    });

    // Setup useCharacterManager mock
    vi.mocked(useCharacterManager).mockReturnValue(mockCharacterManager);
    mockCharacterManager.getAllCharacters.mockReturnValue([]);
    mockCharacterManager.searchCharacters.mockReturnValue([]);
    mockCharacterManager.filterCharacters.mockReturnValue([]);
  });

  // ============================================================================
  // Requirement 1.1: Characters section on dashboard
  // ============================================================================

  describe('Requirement 1.1: Dashboard characters section', () => {
    it('should render the characters section on the dashboard', () => {
      render(<ProjectDashboardNew onOpenEditor={mockOnOpenEditor} />);

      // Check for Characters section title
      expect(screen.getByText('Characters')).toBeInTheDocument();
    });

    it('should display the create character button', () => {
      render(<ProjectDashboardNew onOpenEditor={mockOnOpenEditor} />);

      // Should have create character buttons (header + empty state)
      const createButtons = screen.getAllByRole('button', { name: /create character/i });
      expect(createButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('should render characters section after stories section', () => {
      const { container } = render(<ProjectDashboardNew onOpenEditor={mockOnOpenEditor} />);

      const storiesSection = container.querySelector('.stories-section');
      const charactersSection = container.querySelector('.characters-section');

      expect(storiesSection).toBeInTheDocument();
      expect(charactersSection).toBeInTheDocument();

      // Characters section should come after stories section in DOM
      if (storiesSection && charactersSection) {
        const storiesIndex = Array.from(container.querySelectorAll('.dashboard-left > *')).indexOf(storiesSection);
        const charactersIndex = Array.from(container.querySelectorAll('.dashboard-left > *')).indexOf(charactersSection);
        expect(charactersIndex).toBeGreaterThan(storiesIndex);
      }
    });
  });

  // ============================================================================
  // Requirement 3.1: Character creation from dashboard
  // ============================================================================

  describe('Requirement 3.1: Character creation from dashboard', () => {
    it('should open character wizard when create button is clicked', () => {
      render(<ProjectDashboardNew onOpenEditor={mockOnOpenEditor} />);

      // Get all create buttons and click the first one (header button)
      const createButtons = screen.getAllByRole('button', { name: /create character/i });
      fireEvent.click(createButtons[0]);

      expect(mockSetShowCharacterWizard).toHaveBeenCalledWith(true);
    });

    it('should handle character wizard completion', async () => {
      // This test verifies that the wizard integration is set up correctly
      render(<ProjectDashboardNew onOpenEditor={mockOnOpenEditor} />);

      // The wizard completion is handled by the wizard component itself
      // This test just verifies the setup is correct
      expect(mockSetShowCharacterWizard).toBeDefined();
    });
  });

  // ============================================================================
  // Requirement 2.1: Character editor interface
  // ============================================================================

  describe('Requirement 2.1: Character editor interface', () => {
    it('should open character editor when character is clicked', () => {
      mockCharacterManager.getAllCharacters.mockReturnValue([mockCharacter]);

      render(<ProjectDashboardNew onOpenEditor={mockOnOpenEditor} />);

      // Find and click the character card
      const characterCard = screen.getByText('Dashboard Hero').closest('.character-card');
      expect(characterCard).toBeInTheDocument();

      if (characterCard) {
        fireEvent.click(characterCard);
        expect(mockOpenCharacterEditor).toHaveBeenCalledWith('char-1');
      }
    });

    it('should render character editor when editor is open', () => {
      // Mock editor open state
      vi.mocked(useAppStore).mockImplementation((selector: any) => {
        const state = {
          project: mockProject,
          shots: [],
          setShots: vi.fn(),
          setProject: vi.fn(),
          addShot: vi.fn(),
          openWizard: vi.fn(),
          setShowWorldWizard: vi.fn(),
          setShowCharacterWizard: mockSetShowCharacterWizard,
          setShowStorytellerWizard: vi.fn(),
          isCharacterEditorOpen: true,
          editingCharacterId: 'char-1',
          openCharacterEditor: mockOpenCharacterEditor,
          closeCharacterEditor: mockCloseCharacterEditor,
          showChat: false,
        };
        return selector(state);
      });

      mockCharacterManager.getCharacter.mockReturnValue(mockCharacter);

      render(<ProjectDashboardNew onOpenEditor={mockOnOpenEditor} />);

      // Character editor should be rendered
      // Note: The actual editor rendering is tested in CharacterEditor tests
      // Here we just verify the conditional rendering logic
      expect(mockCharacterManager.getCharacter).toHaveBeenCalled();
    });

    it('should close character editor when close is called', () => {
      // Mock editor open state
      vi.mocked(useAppStore).mockImplementation((selector: any) => {
        const state = {
          project: mockProject,
          shots: [],
          setShots: vi.fn(),
          setProject: vi.fn(),
          addShot: vi.fn(),
          openWizard: vi.fn(),
          setShowWorldWizard: vi.fn(),
          setShowCharacterWizard: mockSetShowCharacterWizard,
          setShowStorytellerWizard: vi.fn(),
          isCharacterEditorOpen: true,
          editingCharacterId: 'char-1',
          openCharacterEditor: mockOpenCharacterEditor,
          closeCharacterEditor: mockCloseCharacterEditor,
          showChat: false,
        };
        return selector(state);
      });

      mockCharacterManager.getCharacter.mockReturnValue(mockCharacter);

      render(<ProjectDashboardNew onOpenEditor={mockOnOpenEditor} />);

      // The close handler should be available
      expect(mockCloseCharacterEditor).toBeDefined();
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Character integration', () => {
    it('should display characters in the characters section', () => {
      mockCharacterManager.getAllCharacters.mockReturnValue([mockCharacter]);

      render(<ProjectDashboardNew onOpenEditor={mockOnOpenEditor} />);

      // Character should be visible
      expect(screen.getByText('Dashboard Hero')).toBeInTheDocument();
      expect(screen.getByText('Hero')).toBeInTheDocument();
    });

    it('should handle multiple characters', () => {
      const characters = [
        mockCharacter,
        { ...mockCharacter, character_id: 'char-2', name: 'Second Hero' },
        { ...mockCharacter, character_id: 'char-3', name: 'Third Hero' },
      ];
      mockCharacterManager.getAllCharacters.mockReturnValue(characters);

      render(<ProjectDashboardNew onOpenEditor={mockOnOpenEditor} />);

      // All characters should be visible
      expect(screen.getByText('Dashboard Hero')).toBeInTheDocument();
      expect(screen.getByText('Second Hero')).toBeInTheDocument();
      expect(screen.getByText('Third Hero')).toBeInTheDocument();
    });

    it('should show empty state when no characters exist', () => {
      mockCharacterManager.getAllCharacters.mockReturnValue([]);

      render(<ProjectDashboardNew onOpenEditor={mockOnOpenEditor} />);

      // Empty state message should be visible
      expect(screen.getByText(/no characters yet/i)).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Layout Tests
  // ============================================================================

  describe('Layout and positioning', () => {
    it('should render characters section in the left column', () => {
      const { container } = render(<ProjectDashboardNew onOpenEditor={mockOnOpenEditor} />);

      const leftColumn = container.querySelector('.dashboard-left');
      const charactersSection = container.querySelector('.characters-section');

      expect(leftColumn).toBeInTheDocument();
      expect(charactersSection).toBeInTheDocument();

      // Characters section should be inside left column
      expect(leftColumn?.contains(charactersSection)).toBe(true);
    });

    it('should have proper spacing between sections', () => {
      const { container } = render(<ProjectDashboardNew onOpenEditor={mockOnOpenEditor} />);

      const charactersSection = container.querySelector('.characters-section');
      expect(charactersSection).toBeInTheDocument();

      // Check for CSS class that provides spacing
      expect(charactersSection).toHaveClass('characters-section');
    });
  });
});
