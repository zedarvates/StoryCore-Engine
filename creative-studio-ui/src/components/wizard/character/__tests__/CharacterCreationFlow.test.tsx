// ============================================================================
// Character Creation Flow Integration Tests
// ============================================================================
// Tests the complete character creation workflow from step 1 to final save

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CharacterWizard } from '../CharacterWizard';
import type { Character } from '@/types/character';

// Mock the store
const mockAddCharacter = vi.fn();
const mockUpdateCharacter = vi.fn();
const mockCharacters: Character[] = [];

vi.mock('@/store', () => ({
  useStore: vi.fn((selector) => {
    const mockState = {
      characters: mockCharacters,
      addCharacter: mockAddCharacter,
      updateCharacter: mockUpdateCharacter,
      deleteCharacter: vi.fn(),
      getAllCharacters: vi.fn(() => mockCharacters),
    };
    return selector ? selector(mockState) : mockState;
  }),
  useCharacters: vi.fn(() => mockCharacters),
}));

// Mock hooks
vi.mock('@/hooks/useCharacterPersistence', () => ({
  useCharacterPersistence: vi.fn(() => ({
    saveCharacter: vi.fn().mockResolvedValue({
      character_id: 'test-uuid',
      name: 'Test Hero',
      creation_method: 'wizard',
    }),
    isSaving: false,
    error: null,
  })),
}));

vi.mock('@/hooks/useServiceStatus', () => ({
  useServiceStatus: vi.fn(() => ({
    ollama: { available: true, status: 'running' },
    comfyui: { available: true, status: 'running' },
  })),
}));

// Mock fetch for API calls
global.fetch = vi.fn();

describe('Character Creation Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    
    // Reset mock implementations
    mockAddCharacter.mockClear();
    mockUpdateCharacter.mockClear();
    
    (global.fetch as any).mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Complete Character Creation Workflow', () => {
    it('creates character from step 1 to final save', async () => {
      const user = userEvent.setup();
      const onComplete = vi.fn();

      // Mock successful API response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          character_id: 'test-uuid',
          name: 'Test Hero',
          creation_method: 'wizard',
        }),
      });

      render(
        <CharacterWizard
          onComplete={onComplete}
          onCancel={vi.fn()}
        />
      );

      // Step 1: Basic Identity
      await user.type(screen.getByLabelText(/character name/i), 'Test Hero');
      
      const archetypeSelect = screen.getByRole('combobox', { name: /character archetype/i });
      await user.click(archetypeSelect);
      await user.click(screen.getByText('Protagonist'));

      const ageSelect = screen.getByRole('combobox', { name: /age range/i });
      await user.click(ageSelect);
      await user.click(screen.getByText('Adult (25-50)'));

      // Navigate to step 2
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Step 2: Physical Appearance
      await waitFor(() => {
        expect(screen.getByText(/physical appearance/i)).toBeInTheDocument();
      });

      // Fill some physical traits
      const hairColorSelect = screen.getByRole('combobox', { name: /hair color/i });
      if (hairColorSelect) {
        await user.click(hairColorSelect);
        await user.click(screen.getByText('Brown'));
      }

      // Navigate to step 3
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Step 3: Personality
      await waitFor(() => {
        expect(screen.getByText(/personality/i)).toBeInTheDocument();
      });

      // Navigate to step 4
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Step 4: Background
      await waitFor(() => {
        expect(screen.getByText(/background/i)).toBeInTheDocument();
      });

      // Navigate to step 5
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Step 5: Relationships
      await waitFor(() => {
        expect(screen.getByText(/relationships/i)).toBeInTheDocument();
      });

      // Skip relationships (no relationships added)
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Step 6: Review
      await waitFor(() => {
        expect(screen.getByText(/review your character/i)).toBeInTheDocument();
      });

      // Verify character summary is shown
      expect(screen.getByText(/test hero/i)).toBeInTheDocument();
      expect(screen.getByText(/protagonist/i)).toBeInTheDocument();

      // Finalize character
      await user.click(screen.getByRole('button', { name: /create character/i }));

      // Verify completion
      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
      });

      const createdCharacter = onComplete.mock.calls[0][0];
      expect(createdCharacter.name).toBe('Test Hero');
      expect(createdCharacter.role.archetype).toBe('Protagonist');
    });

    it('persists data through all steps of the flow', async () => {
      const user = userEvent.setup();

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          character_id: 'test-uuid',
          name: 'Persistent Hero',
        }),
      });

      render(
        <CharacterWizard
          onComplete={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      // Fill step 1 with data
      await user.type(screen.getByLabelText(/character name/i), 'Persistent Hero');
      
      const archetypeSelect = screen.getByRole('combobox', { name: /character archetype/i });
      await user.click(archetypeSelect);
      await user.click(screen.getByText('Antagonist'));

      // Navigate through all steps
      for (let i = 0; i < 5; i++) {
        await user.click(screen.getByRole('button', { name: /next/i }));
      }

      // Navigate back to step 1
      for (let i = 0; i < 5; i++) {
        await user.click(screen.getByRole('button', { name: /previous/i }));
      }

      // Verify data persisted
      await waitFor(() => {
        expect(screen.getByLabelText(/character name/i)).toHaveValue('Persistent Hero');
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('handles API failure gracefully', async () => {
      const user = userEvent.setup();
      const onComplete = vi.fn();

      // Mock API failure
      (global.fetch as any).mockRejectedValueOnce(new Error('Network Error'));

      // Mock successful fallback
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          character_id: 'local-uuid',
          name: 'Fallback Hero',
        }),
      });

      render(
        <CharacterWizard
          onComplete={onComplete}
          onCancel={vi.fn()}
        />
      );

      // Fill required fields
      await user.type(screen.getByLabelText(/character name/i), 'Fallback Hero');
      
      const archetypeSelect = screen.getByRole('combobox', { name: /character archetype/i });
      await user.click(archetypeSelect);
      await user.click(screen.getByText('Protagonist'));

      const ageSelect = screen.getByRole('combobox', { name: /age range/i });
      await user.click(ageSelect);
      await user.click(screen.getByText('Adult (25-50)'));

      // Navigate to final step
      for (let i = 0; i < 5; i++) {
        await user.click(screen.getByRole('button', { name: /next/i }));
      }

      // Finalize
      await user.click(screen.getByRole('button', { name: /create character/i }));

      // Should still complete despite API failure
      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
      });
    });

    it('validates required fields before allowing navigation', async () => {
      const user = userEvent.setup();

      render(
        <CharacterWizard
          onComplete={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      // Try to navigate without required fields
      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toBeDisabled();

      // Fill only name, still need archetype
      await user.type(screen.getByLabelText(/character name/i), 'Test Hero');
      expect(nextButton).toBeDisabled();

      // Fill archetype too
      const archetypeSelect = screen.getByRole('combobox', { name: /character archetype/i });
      await user.click(archetypeSelect);
      await user.click(screen.getByText('Protagonist'));

      // Still need age
      expect(nextButton).toBeDisabled();

      // Fill age
      const ageSelect = screen.getByRole('combobox', { name: /age range/i });
      await user.click(ageSelect);
      await user.click(screen.getByText('Adult (25-50)'));

      // Now should be enabled
      expect(nextButton).toBeEnabled();
    });

    it('shows error message on save failure', async () => {
      const user = userEvent.setup();

      // Mock persistent API failure
      (global.fetch as any).mockRejectedValue(new Error('Save Failed'));

      render(
        <CharacterWizard
          onComplete={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      // Fill required fields
      await user.type(screen.getByLabelText(/character name/i), 'Test Hero');
      
      const archetypeSelect = screen.getByRole('combobox', { name: /character archetype/i });
      await user.click(archetypeSelect);
      await user.click(screen.getByText('Protagonist'));

      const ageSelect = screen.getByRole('combobox', { name: /age range/i });
      await user.click(ageSelect);
      await user.click(screen.getByText('Adult (25-50)'));

      // Navigate to final step
      for (let i = 0; i < 5; i++) {
        await user.click(screen.getByRole('button', { name: /next/i }));
      }

      // Finalize
      await user.click(screen.getByRole('button', { name: /create character/i }));

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/error saving character/i)).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases in the Flow', () => {
    it('handles empty optional fields gracefully', async () => {
      const user = userEvent.setup();
      const onComplete = vi.fn();

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          character_id: 'test-uuid',
          name: 'Minimal Hero',
          role: { archetype: 'Protagonist' },
        }),
      });

      render(
        <CharacterWizard
          onComplete={onComplete}
          onCancel={vi.fn()}
        />
      );

      // Fill only required fields
      await user.type(screen.getByLabelText(/character name/i), 'Minimal Hero');
      
      const archetypeSelect = screen.getByRole('combobox', { name: /character archetype/i });
      await user.click(archetypeSelect);
      await user.click(screen.getByText('Protagonist'));

      const ageSelect = screen.getByRole('combobox', { name: /age range/i });
      await user.click(ageSelect);
      await user.click(screen.getByText('Adult (25-50)'));

      // Navigate through all steps without filling optional fields
      for (let i = 0; i < 5; i++) {
        await user.click(screen.getByRole('button', { name: /next/i }));
      }

      await user.click(screen.getByRole('button', { name: /create character/i }));

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
      });
    });

    it('handles rapid navigation between steps', async () => {
      const user = userEvent.setup();

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ character_id: 'test-uuid', name: 'Rapid Hero' }),
      });

      render(
        <CharacterWizard
          onComplete={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      // Fill required fields
      await user.type(screen.getByLabelText(/character name/i), 'Rapid Hero');
      
      const archetypeSelect = screen.getByRole('combobox', { name: /character archetype/i });
      await user.click(archetypeSelect);
      await user.click(screen.getByText('Protagonist'));

      const ageSelect = screen.getByRole('combobox', { name: /age range/i });
      await user.click(ageSelect);
      await user.click(screen.getByText('Adult (25-50)'));

      // Rapidly navigate through steps
      for (let i = 0; i < 5; i++) {
        await user.click(screen.getByRole('button', { name: /next/i }));
        await user.click(screen.getByRole('button', { name: /previous/i }));
      }

      // Should still be on step 1
      expect(screen.getByLabelText(/character name/i)).toBeInTheDocument();
    });

    it('handles special characters in character name', async () => {
      const user = userEvent.setup();
      const onComplete = vi.fn();

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          character_id: 'test-uuid',
          name: "O'Brien-Smith Jr. 'The Great'",
        }),
      });

      render(
        <CharacterWizard
          onComplete={onComplete}
          onCancel={vi.fn()}
        />
      );

      // Fill name with special characters
      await user.type(screen.getByLabelText(/character name/i), "O'Brien-Smith Jr. 'The Great'");
      
      const archetypeSelect = screen.getByRole('combobox', { name: /character archetype/i });
      await user.click(archetypeSelect);
      await user.click(screen.getByText('Protagonist'));

      const ageSelect = screen.getByRole('combobox', { name: /age range/i });
      await user.click(ageSelect);
      await user.click(screen.getByText('Adult (25-50)'));

      // Navigate to final step
      for (let i = 0; i < 5; i++) {
        await user.click(screen.getByRole('button', { name: /next/i }));
      }

      await user.click(screen.getByRole('button', { name: /create character/i }));

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
        const character = onComplete.mock.calls[0][0];
        expect(character.name).toBe("O'Brien-Smith Jr. 'The Great'");
      });
    });

    it('handles all archetype options', async () => {
      const user = userEvent.setup();

      const archetypes = ['Protagonist', 'Antagonist', 'Mentor', 'Sidekick', 'Love Interest', 'Supporting'];

      for (const archetype of archetypes) {
        cleanup();
        vi.clearAllMocks();
        localStorage.clear();
        
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ character_id: 'test-uuid', name: `Test ${archetype}` }),
        });

        render(
          <CharacterWizard
            onComplete={vi.fn()}
            onCancel={vi.fn()}
          />
        );

        await user.type(screen.getByLabelText(/character name/i), `Test ${archetype}`);
        
        const archetypeSelect = screen.getByRole('combobox', { name: /character archetype/i });
        await user.click(archetypeSelect);
        await user.click(screen.getByText(archetype));

        const ageSelect = screen.getByRole('combobox', { name: /age range/i });
        await user.click(ageSelect);
        await user.click(screen.getByText('Adult (25-50)'));

        await user.click(screen.getByRole('button', { name: /next/i }));

        await waitFor(() => {
          expect(screen.getByText(/physical appearance/i)).toBeInTheDocument();
        });
      }
    });

    it('handles all age range options', async () => {
      const user = userEvent.setup();

      const ageRanges = ['Child (0-12)', 'Teen (13-19)', 'Young Adult (20-24)', 'Adult (25-50)', 'Middle Age (51-65)', 'Senior (65+)'];

      for (const ageRange of ageRanges) {
        cleanup();
        vi.clearAllMocks();
        localStorage.clear();
        
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ character_id: 'test-uuid', name: `Test ${ageRange}` }),
        });

        render(
          <CharacterWizard
            onComplete={vi.fn()}
            onCancel={vi.fn()}
          />
        );

        await user.type(screen.getByLabelText(/character name/i), `Test ${ageRange}`);
        
        const archetypeSelect = screen.getByRole('combobox', { name: /character archetype/i });
        await user.click(archetypeSelect);
        await user.click(screen.getByText('Protagonist'));

        const ageSelect = screen.getByRole('combobox', { name: /age range/i });
        await user.click(ageSelect);
        await user.click(screen.getByText(ageRange));

        await user.click(screen.getByRole('button', { name: /next/i }));

        await waitFor(() => {
          expect(screen.getByText(/physical appearance/i)).toBeInTheDocument();
        });
      }
    });
  });

  describe('Data Persistence Through Flow', () => {
    it('maintains data integrity from step 1 to step 6', async () => {
      const user = userEvent.setup();
      const onComplete = vi.fn();

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          character_id: 'integrity-test-uuid',
          name: 'Integrity Test Hero',
          role: {
            archetype: 'Protagonist',
            narrative_function: 'Hero',
            character_arc: 'Growth',
          },
          visual_identity: {
            age_range: 'adult',
            hair_color: 'Brown',
          },
          personality: {
            traits: ['Brave', 'Compassionate'],
          },
          background: {
            origin: 'Unknown village',
          },
          relationships: [],
        }),
      });

      render(
        <CharacterWizard
          onComplete={onComplete}
          onCancel={vi.fn()}
        />
      );

      // Step 1: Basic Identity
      await user.type(screen.getByLabelText(/character name/i), 'Integrity Test Hero');
      
      const archetypeSelect = screen.getByRole('combobox', { name: /character archetype/i });
      await user.click(archetypeSelect);
      await user.click(screen.getByText('Protagonist'));

      const ageSelect = screen.getByRole('combobox', { name: /age range/i });
      await user.click(ageSelect);
      await user.click(screen.getByText('Adult (25-50)'));

      // Step 2: Physical Appearance
      await user.click(screen.getByRole('button', { name: /next/i }));
      
      const hairColorSelect = screen.getByRole('combobox', { name: /hair color/i });
      if (hairColorSelect) {
        await user.click(hairColorSelect);
        await user.click(screen.getByText('Brown'));
      }

      // Step 3: Personality - Add traits
      await user.click(screen.getByRole('button', { name: /next/i }));
      
      const traitsInput = screen.queryByLabelText(/key traits/i);
      if (traitsInput) {
        await user.type(traitsInput, 'Brave, Compassionate');
      }

      // Step 4: Background
      await user.click(screen.getByRole('button', { name: /next/i }));
      
      const originInput = screen.queryByLabelText(/place of origin/i);
      if (originInput) {
        await user.type(originInput, 'Unknown village');
      }

      // Steps 5 & 6
      await user.click(screen.getByRole('button', { name: /next/i }));
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Finalize
      await user.click(screen.getByRole('button', { name: /create character/i }));

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
      });

      const character = onComplete.mock.calls[0][0];
      
      // Verify data integrity
      expect(character.name).toBe('Integrity Test Hero');
      expect(character.role.archetype).toBe('Protagonist');
    });

    it('preserves partial data when navigating back from validation error', async () => {
      const user = userEvent.setup();

      render(
        <CharacterWizard
          onComplete={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      // Fill step 1
      await user.type(screen.getByLabelText(/character name/i), 'Partial Data Hero');
      
      const archetypeSelect = screen.getByRole('combobox', { name: /character archetype/i });
      await user.click(archetypeSelect);
      await user.click(screen.getByText('Protagonist'));

      const ageSelect = screen.getByRole('combobox', { name: /age range/i });
      await user.click(ageSelect);
      await user.click(screen.getByText('Adult (25-50)'));

      // Go to step 2
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Go back to step 1
      await user.click(screen.getByRole('button', { name: /previous/i }));

      // Clear name to create validation error
      const nameInput = screen.getByLabelText(/character name/i);
      await user.clear(nameInput);
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Error should appear
      expect(screen.getByText(/character name is required/i)).toBeInTheDocument();

      // Restore name
      await user.type(nameInput, 'Partial Data Hero');

      // Error should clear
      await waitFor(() => {
        expect(screen.queryByText(/character name is required/i)).not.toBeInTheDocument();
      });
    });
  });
});
