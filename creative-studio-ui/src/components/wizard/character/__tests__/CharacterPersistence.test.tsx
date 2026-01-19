// ============================================================================
// Character Persistence Integration Tests
// ============================================================================
// Tests the complete flow from wizard to file system persistence

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CharacterWizard } from '../CharacterWizard';
import type { Character } from '@/types/character';

// Mock the store
const mockAddCharacter = vi.fn();
const mockUpdateCharacter = vi.fn();

vi.mock('@/store', () => ({
  useStore: vi.fn((selector) => {
    const mockState = {
      characters: [] as Character[],
      addCharacter: mockAddCharacter,
      updateCharacter: mockUpdateCharacter,
      deleteCharacter: vi.fn(),
      getAllCharacters: vi.fn(() => []),
    };
    return selector ? selector(mockState) : mockState;
  }),
  useCharacters: vi.fn(() => []),
}));

// Mock fetch for API calls
global.fetch = vi.fn();

describe('Character Persistence Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('saves character to JSON file when wizard completes', async () => {
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

    await user.click(screen.getByRole('button', { name: /next/i }));

    // Step 2: Physical Appearance (skip)
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Step 3: Personality (skip)
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Step 4: Background (skip)
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Step 5: Relationships (skip)
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Step 6: Review and Finalize
    await waitFor(() => {
      expect(screen.getByText(/review your character/i)).toBeInTheDocument();
    });

    const finalizeButton = screen.getByRole('button', { name: /create character/i });
    await user.click(finalizeButton);

    // Verify API was called
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/characters/save',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    // Verify onComplete was called
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });
  });

  it('updates Zustand store when character is saved', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();

    const savedCharacter: Character = {
      character_id: 'test-uuid',
      name: 'Test Hero',
      creation_method: 'wizard',
      creation_timestamp: new Date().toISOString(),
      version: '1.0',
      role: {
        archetype: 'Protagonist',
        narrative_function: 'Hero',
        character_arc: 'Growth',
      },
      visual_identity: {
        age_range: 'adult',
        hair_color: '',
        hair_style: '',
        hair_length: '',
        eye_color: '',
        eye_shape: '',
        skin_tone: '',
        facial_structure: '',
        distinctive_features: [],
        height: '',
        build: '',
        posture: '',
        clothing_style: '',
        color_palette: [],
      },
      personality: {
        traits: [],
        values: [],
        fears: [],
        desires: [],
        flaws: [],
        strengths: [],
        temperament: '',
        communication_style: '',
      },
      background: {
        origin: '',
        occupation: '',
        education: '',
        family: '',
        significant_events: [],
        current_situation: '',
      },
      relationships: [],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => savedCharacter,
    });

    render(
      <CharacterWizard
        onComplete={onComplete}
        onCancel={vi.fn()}
      />
    );

    // Complete wizard quickly
    await user.type(screen.getByLabelText(/character name/i), 'Test Hero');
    
    const archetypeSelect = screen.getByRole('combobox', { name: /character archetype/i });
    await user.click(archetypeSelect);
    await user.click(screen.getByText('Protagonist'));

    const ageSelect = screen.getByRole('combobox', { name: /age range/i });
    await user.click(ageSelect);
    await user.click(screen.getByText('Adult (25-50)'));

    // Navigate through steps
    for (let i = 0; i < 5; i++) {
      await user.click(screen.getByRole('button', { name: /next/i }));
    }

    // Finalize
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create character/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /create character/i }));

    // Verify store was updated
    await waitFor(() => {
      expect(mockAddCharacter).toHaveBeenCalled();
    });
  });

  it('falls back to localStorage when API fails', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();

    // Mock API failure
    (global.fetch as any).mockRejectedValueOnce(new Error('API Error'));

    render(
      <CharacterWizard
        onComplete={onComplete}
        onCancel={vi.fn()}
      />
    );

    // Complete wizard
    await user.type(screen.getByLabelText(/character name/i), 'Test Hero');
    
    const archetypeSelect = screen.getByRole('combobox', { name: /character archetype/i });
    await user.click(archetypeSelect);
    await user.click(screen.getByText('Protagonist'));

    const ageSelect = screen.getByRole('combobox', { name: /age range/i });
    await user.click(ageSelect);
    await user.click(screen.getByText('Adult (25-50)'));

    // Navigate through steps
    for (let i = 0; i < 5; i++) {
      await user.click(screen.getByRole('button', { name: /next/i }));
    }

    // Finalize
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create character/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /create character/i }));

    // Verify localStorage was used as fallback
    await waitFor(() => {
      const keys = Object.keys(localStorage);
      const characterKey = keys.find((key) => key.startsWith('character-'));
      expect(characterKey).toBeDefined();
    });

    // Verify onComplete was still called
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });
  });

  it('emits character-created event when character is saved', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const eventListener = vi.fn();

    window.addEventListener('character-created', eventListener);

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        character_id: 'test-uuid',
        name: 'Test Hero',
      }),
    });

    render(
      <CharacterWizard
        onComplete={onComplete}
        onCancel={vi.fn()}
      />
    );

    // Complete wizard
    await user.type(screen.getByLabelText(/character name/i), 'Test Hero');
    
    const archetypeSelect = screen.getByRole('combobox', { name: /character archetype/i });
    await user.click(archetypeSelect);
    await user.click(screen.getByText('Protagonist'));

    const ageSelect = screen.getByRole('combobox', { name: /age range/i });
    await user.click(ageSelect);
    await user.click(screen.getByText('Adult (25-50)'));

    // Navigate through steps
    for (let i = 0; i < 5; i++) {
      await user.click(screen.getByRole('button', { name: /next/i }));
    }

    // Finalize
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create character/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /create character/i }));

    // Verify event was emitted
    await waitFor(() => {
      expect(eventListener).toHaveBeenCalled();
    });

    window.removeEventListener('character-created', eventListener);
  });

  it('generates UUID for new characters', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();

    (global.fetch as any).mockImplementation(async (url: string, options: any) => {
      const body = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => body,
      };
    });

    render(
      <CharacterWizard
        onComplete={onComplete}
        onCancel={vi.fn()}
      />
    );

    // Complete wizard
    await user.type(screen.getByLabelText(/character name/i), 'Test Hero');
    
    const archetypeSelect = screen.getByRole('combobox', { name: /character archetype/i });
    await user.click(archetypeSelect);
    await user.click(screen.getByText('Protagonist'));

    const ageSelect = screen.getByRole('combobox', { name: /age range/i });
    await user.click(ageSelect);
    await user.click(screen.getByText('Adult (25-50)'));

    // Navigate through steps
    for (let i = 0; i < 5; i++) {
      await user.click(screen.getByRole('button', { name: /next/i }));
    }

    // Finalize
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create character/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /create character/i }));

    // Verify character has UUID
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
      const character = onComplete.mock.calls[0][0];
      expect(character.character_id).toBeDefined();
      expect(character.character_id.length).toBeGreaterThan(0);
    });
  });
});
