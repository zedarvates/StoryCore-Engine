// ============================================================================
// Step2CharacterSelection Component Tests
// ============================================================================
// Tests for character selection in the Story Generator wizard
//
// Requirements: 4.1, 4.2, 4.3, 4.5, 3.2, 3.5
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Step2CharacterSelection } from '../Step2CharacterSelection';
import { WizardProvider } from '@/contexts/WizardContext';
import { useStore } from '@/store';
import { useAppStore } from '@/stores/useAppStore';
import { eventEmitter } from '@/services/eventEmitter';
import { createCharacter } from '@/services/storyGenerationService';
import type { Character } from '@/types/character';

// ============================================================================
// Mocks
// ============================================================================

// Mock the stores
vi.mock('@/store', () => ({
  useStore: vi.fn(),
}));

vi.mock('@/stores/useAppStore', () => ({
  useAppStore: vi.fn(),
}));

vi.mock('@/services/storyGenerationService', () => ({
  createCharacter: vi.fn(),
}));

vi.mock('@/components/ui/service-warning', () => ({
  ServiceWarning: ({ onConfigure }: any) => (
    <div data-testid="service-warning">
      <button onClick={onConfigure}>Configure</button>
    </div>
  ),
  useServiceStatus: vi.fn(() => ({ llmConfigured: true })),
}));

vi.mock('@/components/character/CharacterList', () => ({
  CharacterList: ({ selectable, selectedIds, onSelectionChange }: any) => (
    <div data-testid="character-list">
      <div>Character List (selectable: {String(selectable)})</div>
      <div>Selected: {selectedIds?.length || 0}</div>
      <button onClick={() => onSelectionChange?.(['char-1'])}>Select Alice</button>
      <button onClick={() => onSelectionChange?.(['char-1', 'char-2'])}>Select Both</button>
      <button onClick={() => onSelectionChange?.([])}>Clear Selection</button>
    </div>
  ),
}));

// ============================================================================
// Test Helpers
// ============================================================================

const mockCharacter1: Character = {
  character_id: 'char-1',
  name: 'Alice',
  creation_method: 'wizard',
  creation_timestamp: '2024-01-01T00:00:00Z',
  version: '1.0',
  visual_identity: {
    age_range: '25-30',
    gender: 'female',
    ethnicity: 'Caucasian',
    distinctive_features: [],
    clothing_style: 'casual',
    color_palette: [],
  },
  personality: {
    traits: ['brave', 'kind'],
    strengths: ['leadership'],
    weaknesses: ['impulsive'],
    fears: ['failure'],
    desires: ['justice'],
    quirks: [],
  },
  background: {
    origin: 'City',
    occupation: 'Detective',
    education: 'University',
    family: 'Parents',
    significant_events: [],
  },
  relationships: [],
  role: {
    archetype: 'Protagonist',
    narrative_function: 'Hero',
    character_arc: 'Growth',
  },
};

const mockCharacter2: Character = {
  character_id: 'char-2',
  name: 'Bob',
  creation_method: 'wizard',
  creation_timestamp: '2024-01-02T00:00:00Z',
  version: '1.0',
  visual_identity: {
    age_range: '40-45',
    gender: 'male',
    ethnicity: 'Asian',
    distinctive_features: [],
    clothing_style: 'formal',
    color_palette: [],
  },
  personality: {
    traits: ['wise', 'patient'],
    strengths: ['knowledge'],
    weaknesses: ['stubborn'],
    fears: ['irrelevance'],
    desires: ['legacy'],
    quirks: [],
  },
  background: {
    origin: 'Village',
    occupation: 'Teacher',
    education: 'Self-taught',
    family: 'Spouse',
    significant_events: [],
  },
  relationships: [],
  role: {
    archetype: 'Mentor',
    narrative_function: 'Guide',
    character_arc: 'Flat',
  },
};

function renderWithWizard(initialData = {}) {
  const onSubmit = vi.fn();
  const onValidateStep = vi.fn().mockResolvedValue({});

  return {
    ...render(
      <WizardProvider
        wizardType="storyteller"
        totalSteps={5}
        initialData={initialData}
        onSubmit={onSubmit}
        onValidateStep={onValidateStep}
        autoSave={false}
      >
        <Step2CharacterSelection />
      </WizardProvider>
    ),
    onSubmit,
    onValidateStep,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('Step2CharacterSelection', () => {
  beforeEach(() => {
    // Setup store mocks with getState
    const mockGetState = vi.fn(() => ({
      characters: [],
      worlds: [],
      selectedWorldId: undefined,
      addCharacter: vi.fn(),
    }));

    vi.mocked(useStore).mockImplementation((selector: any) => {
      const state = mockGetState();
      return selector ? selector(state) : state;
    });

    // Add getState to the mock
    (useStore as any).getState = mockGetState;

    vi.mocked(useAppStore).mockImplementation((selector: any) => {
      const state = {
        characterSearchQuery: '',
        characterFilters: {},
        setShowLLMSettings: vi.fn(),
      };
      return selector ? selector(state) : state;
    });

    // Clear mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Requirement 4.1: Display all available characters
  // ==========================================================================

  describe('Character Display (Req 4.1)', () => {
    it('should render CharacterList component in selectable mode', () => {
      // Arrange & Act
      renderWithWizard();

      // Assert
      expect(screen.getByTestId('character-list')).toBeInTheDocument();
      expect(screen.getByText(/selectable: true/i)).toBeInTheDocument();
    });

    it('should display character count', () => {
      // Arrange & Act
      renderWithWizard();

      // Assert - Use flexible text matcher
      expect(screen.getByText((content, element) => {
        return element?.textContent?.includes('0') && element?.textContent?.includes('selected') || false;
      })).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Requirement 4.2: Multi-character selection
  // ==========================================================================

  describe('Character Selection (Req 4.2)', () => {
    it('should pass selectedIds to CharacterList', () => {
      // Arrange
      const initialData = {
        selectedCharacters: [
          { id: 'char-1', name: 'Alice', role: 'Protagonist' },
        ],
      };

      // Act
      renderWithWizard(initialData);

      // Assert
      expect(screen.getByText(/1 character selected/i)).toBeInTheDocument();
      expect(screen.getByText(/Selected: 1/i)).toBeInTheDocument();
    });

    it('should handle selection changes from CharacterList', async () => {
      // Arrange
      const user = userEvent.setup();
      
      // Mock characters in store with getState
      const mockGetState = vi.fn(() => ({
        characters: [mockCharacter1, mockCharacter2],
        worlds: [],
        selectedWorldId: undefined,
        addCharacter: vi.fn(),
      }));

      vi.mocked(useStore).mockImplementation((selector: any) => {
        const state = mockGetState();
        return selector ? selector(state) : state;
      });
      (useStore as any).getState = mockGetState;

      // Act
      renderWithWizard();
      
      const selectButton = screen.getByRole('button', { name: /select alice/i });
      await user.click(selectButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/1 character selected/i)).toBeInTheDocument();
      });
    });

    it('should handle multiple character selection', async () => {
      // Arrange
      const user = userEvent.setup();
      
      const mockGetState = vi.fn(() => ({
        characters: [mockCharacter1, mockCharacter2],
        worlds: [],
        selectedWorldId: undefined,
        addCharacter: vi.fn(),
      }));

      vi.mocked(useStore).mockImplementation((selector: any) => {
        const state = mockGetState();
        return selector ? selector(state) : state;
      });
      (useStore as any).getState = mockGetState;

      // Act
      renderWithWizard();
      
      const selectBothButton = screen.getByRole('button', { name: /select both/i });
      await user.click(selectBothButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/2 characters selected/i)).toBeInTheDocument();
      });
    });

    it('should handle deselection', async () => {
      // Arrange
      const user = userEvent.setup();
      
      const initialData = {
        selectedCharacters: [
          { id: 'char-1', name: 'Alice', role: 'Protagonist' },
        ],
      };

      // Act
      renderWithWizard(initialData);
      
      const clearButton = screen.getByRole('button', { name: /clear selection/i });
      await user.click(clearButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/0 characters? selected/i)).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Requirement 4.3: Display character information
  // ==========================================================================

  describe('Character Information Display (Req 4.3)', () => {
    it('should pass characters to CharacterList component', () => {
      // Arrange & Act
      renderWithWizard();

      // Assert
      expect(screen.getByTestId('character-list')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Requirement 3.2: Create character from story context
  // ==========================================================================

  describe('Character Creation (Req 3.2)', () => {
    it('should show create character dialog when button is clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      renderWithWizard();

      // Act
      const createButton = screen.getByRole('button', { name: /create new character/i });
      await user.click(createButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/create new character/i)).toBeInTheDocument();
      });
    });

    it('should have name and role fields in create dialog', async () => {
      // Arrange
      const user = userEvent.setup();
      renderWithWizard();

      // Act
      const createButton = screen.getByRole('button', { name: /create new character/i });
      await user.click(createButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
      });
    });

    it('should validate required fields before creating character', async () => {
      // Arrange
      const user = userEvent.setup();
      renderWithWizard();

      // Act
      const createButton = screen.getByRole('button', { name: /create new character/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /create character/i });
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/name and role are required/i)).toBeInTheDocument();
      });
    });

    it('should call createCharacter service with correct data', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockCreatedCharacter = { ...mockCharacter1, character_id: 'new-char' };
      vi.mocked(createCharacter).mockResolvedValue(mockCreatedCharacter);

      renderWithWizard();

      // Act
      const createButton = screen.getByRole('button', { name: /create new character/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/name/i);
      const roleInput = screen.getByLabelText(/role/i);
      
      await user.type(nameInput, 'New Character');
      await user.type(roleInput, 'Hero');

      const submitButton = screen.getByRole('button', { name: /create character/i });
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(createCharacter).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'New Character',
            role: 'Hero',
          }),
          undefined // worldContext
        );
      });
    });
  });

  // ==========================================================================
  // Requirement 3.5: Auto-select newly created character
  // ==========================================================================

  describe('Auto-Selection After Creation (Req 3.5)', () => {
    it('should auto-select character after creation', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockCreatedCharacter = { ...mockCharacter1, character_id: 'new-char', name: 'New Hero' };
      vi.mocked(createCharacter).mockResolvedValue(mockCreatedCharacter);

      renderWithWizard();

      // Act
      const createButton = screen.getByRole('button', { name: /create new character/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/name/i);
      const roleInput = screen.getByLabelText(/role/i);
      
      await user.type(nameInput, 'New Hero');
      await user.type(roleInput, 'Protagonist');

      const submitButton = screen.getByRole('button', { name: /create character/i });
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/1 character selected/i)).toBeInTheDocument();
      });
    });

    it('should emit character-created event after creation', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockCreatedCharacter = { ...mockCharacter1, character_id: 'new-char' };
      vi.mocked(createCharacter).mockResolvedValue(mockCreatedCharacter);

      const eventSpy = vi.fn();
      eventEmitter.on('character-created', eventSpy);

      renderWithWizard();

      // Act
      const createButton = screen.getByRole('button', { name: /create new character/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/name/i);
      const roleInput = screen.getByLabelText(/role/i);
      
      await user.type(nameInput, 'New Character');
      await user.type(roleInput, 'Hero');

      const submitButton = screen.getByRole('button', { name: /create character/i });
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(eventSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            character: mockCreatedCharacter,
            source: 'wizard',
          })
        );
      });

      // Cleanup
      eventEmitter.off('character-created', eventSpy);
    });
  });

  // ==========================================================================
  // Requirement 4.5: Selection adds to story
  // ==========================================================================

  describe('Story Submission with Characters (Req 4.5)', () => {
    it('should track selected character IDs in form data', async () => {
      // Arrange
      const user = userEvent.setup();
      
      const mockGetState = vi.fn(() => ({
        characters: [mockCharacter1, mockCharacter2],
        worlds: [],
        selectedWorldId: undefined,
        addCharacter: vi.fn(),
      }));

      vi.mocked(useStore).mockImplementation((selector: any) => {
        const state = mockGetState();
        return selector ? selector(state) : state;
      });
      (useStore as any).getState = mockGetState;

      // Act
      renderWithWizard();
      
      const selectBothButton = screen.getByRole('button', { name: /select both/i });
      await user.click(selectBothButton);

      // Assert - verify form data is updated
      await waitFor(() => {
        expect(screen.getByText(/2 characters selected/i)).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('Integration Tests', () => {
    it('should handle complete character selection workflow', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockCreatedCharacter = { ...mockCharacter2, character_id: 'new-char' };
      vi.mocked(createCharacter).mockResolvedValue(mockCreatedCharacter);

      const mockGetState = vi.fn(() => ({
        characters: [mockCharacter1],
        worlds: [],
        selectedWorldId: undefined,
        addCharacter: vi.fn(),
      }));

      vi.mocked(useStore).mockImplementation((selector: any) => {
        const state = mockGetState();
        return selector ? selector(state) : state;
      });
      (useStore as any).getState = mockGetState;

      renderWithWizard();

      // Act - Select existing character
      const selectButton = screen.getByRole('button', { name: /select alice/i });
      await user.click(selectButton);

      await waitFor(() => {
        expect(screen.getByText(/1 character selected/i)).toBeInTheDocument();
      });

      // Act - Create new character
      const createButton = screen.getByRole('button', { name: /create new character/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/name/i);
      const roleInput = screen.getByLabelText(/role/i);
      
      await user.type(nameInput, 'Bob');
      await user.type(roleInput, 'Mentor');

      const submitButton = screen.getByRole('button', { name: /create character/i });
      await user.click(submitButton);

      // Assert - Character should be auto-selected
      await waitFor(() => {
        expect(screen.getByText(/2 characters selected/i)).toBeInTheDocument();
      });
    });

    it('should handle character creation errors gracefully', async () => {
      // Arrange
      const user = userEvent.setup();
      vi.mocked(createCharacter).mockRejectedValue(new Error('Creation failed'));

      renderWithWizard();

      // Act
      const createButton = screen.getByRole('button', { name: /create new character/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/name/i);
      const roleInput = screen.getByLabelText(/role/i);
      
      await user.type(nameInput, 'Test');
      await user.type(roleInput, 'Hero');

      const submitButton = screen.getByRole('button', { name: /create character/i });
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/creation failed/i)).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // UI/UX Tests
  // ==========================================================================

  describe('UI/UX', () => {
    it('should show helpful tip message', () => {
      // Arrange & Act
      renderWithWizard();

      // Assert
      expect(screen.getByText(/tip:/i)).toBeInTheDocument();
      expect(screen.getByText(/you can select multiple characters/i)).toBeInTheDocument();
    });

    it('should show create character button', () => {
      // Arrange & Act
      renderWithWizard();

      // Assert
      const createButton = screen.getByRole('button', { name: /create new character/i });
      expect(createButton).toBeInTheDocument();
    });
  });
});
