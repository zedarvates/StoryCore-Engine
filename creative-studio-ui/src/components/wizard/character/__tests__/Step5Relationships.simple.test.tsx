import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CharacterWizard } from '../CharacterWizard';
import type { Character } from '@/types/character';

// Mock the store to provide test characters
vi.mock('@/store', () => ({
  useStore: vi.fn((selector) => {
    const mockState = {
      characters: [
        {
          character_id: 'char-2',
          name: 'Alice',
          role: {
            archetype: 'Protagonist',
            narrative_function: 'Hero',
            character_arc: 'Growth',
          },
          visual_identity: {},
          personality: {},
          background: {},
          relationships: [],
          creation_method: 'wizard',
          creation_timestamp: new Date().toISOString(),
          version: '1.0',
        },
        {
          character_id: 'char-3',
          name: 'Bob',
          role: {
            archetype: 'Mentor',
            narrative_function: 'Guide',
            character_arc: 'Flat',
          },
          visual_identity: {},
          personality: {},
          background: {},
          relationships: [],
          creation_method: 'wizard',
          creation_timestamp: new Date().toISOString(),
          version: '1.0',
        },
      ],
    };
    return selector ? selector(mockState) : mockState.characters;
  }),
  useCharacters: vi.fn(() => [
    {
      character_id: 'char-2',
      name: 'Alice',
      role: {
        archetype: 'Protagonist',
        narrative_function: 'Hero',
        character_arc: 'Growth',
      },
      visual_identity: {},
      personality: {},
      background: {},
      relationships: [],
      creation_method: 'wizard',
      creation_timestamp: new Date().toISOString(),
      version: '1.0',
    },
    {
      character_id: 'char-3',
      name: 'Bob',
      role: {
        archetype: 'Mentor',
        narrative_function: 'Guide',
        character_arc: 'Flat',
      },
      visual_identity: {},
      personality: {},
      background: {},
      relationships: [],
      creation_method: 'wizard',
      creation_timestamp: new Date().toISOString(),
      version: '1.0',
    },
  ]),
}));

// ============================================================================
// Step 5 Relationships - Simple Tests
// ============================================================================

describe('Step5Relationships - Character Relationship Validation', () => {
  it('displays character selection dropdown when existing characters are available', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const onCancel = vi.fn();

    render(<CharacterWizard onComplete={onComplete} onCancel={onCancel} />);

    // Navigate to Step 5 (Relationships)
    // Step 1: Basic Identity
    await user.type(screen.getByLabelText(/character name/i), 'Test Character');
    const archetypeSelect = screen.getByRole('combobox', { name: /character archetype/i });
    await user.click(archetypeSelect);
    await user.click(screen.getByText('Protagonist'));
    await user.click(screen.getByRole('button', { name: /continue to appearance/i }));

    // Step 2: Physical Appearance - skip with minimal data
    await waitFor(() => {
      expect(screen.getByText('Physical Appearance')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /continue to personality/i }));

    // Step 3: Personality - skip with minimal data
    await waitFor(() => {
      expect(screen.getByText('Personality')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /continue to background/i }));

    // Step 4: Background - skip with minimal data
    await waitFor(() => {
      expect(screen.getByText('Background')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /continue to relationships/i }));

    // Step 5: Relationships
    await waitFor(() => {
      expect(screen.getByText('Relationships')).toBeInTheDocument();
    });

    // Should show existing characters info
    expect(screen.getByText(/You have 2 existing characters/i)).toBeInTheDocument();
    
    // Should show character source selection
    expect(screen.getByText('Character Source')).toBeInTheDocument();
    expect(screen.getByLabelText('Existing Character')).toBeChecked();
  });

  it('shows relationship type options', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const onCancel = vi.fn();

    render(<CharacterWizard onComplete={onComplete} onCancel={onCancel} />);

    // Navigate to Step 5
    await user.type(screen.getByLabelText(/character name/i), 'Test Character');
    const archetypeSelect = screen.getByRole('combobox', { name: /character archetype/i });
    await user.click(archetypeSelect);
    await user.click(screen.getByText('Protagonist'));
    await user.click(screen.getByRole('button', { name: /continue to appearance/i }));
    
    await waitFor(() => expect(screen.getByText('Physical Appearance')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /continue to personality/i }));
    
    await waitFor(() => expect(screen.getByText('Personality')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /continue to background/i }));
    
    await waitFor(() => expect(screen.getByText('Background')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /continue to relationships/i }));

    await waitFor(() => {
      expect(screen.getByText('Relationships')).toBeInTheDocument();
    });

    // Switch to new character mode to test relationship types
    await user.click(screen.getByLabelText('New Character'));
    await user.type(screen.getByLabelText('Character Name'), 'Charlie');

    // Open relationship type dropdown
    const typeSelect = screen.getByRole('combobox', { name: /Relationship Type/i });
    await user.click(typeSelect);

    // Check for relationship types
    await waitFor(() => {
      expect(screen.getByText('Family')).toBeInTheDocument();
      expect(screen.getByText('Friend')).toBeInTheDocument();
      expect(screen.getByText('Mentor')).toBeInTheDocument();
      expect(screen.getByText('Rival')).toBeInTheDocument();
    });
  });

  it('validates that character name is required for new characters', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const onCancel = vi.fn();

    render(<CharacterWizard onComplete={onComplete} onCancel={onCancel} />);

    // Navigate to Step 5
    await user.type(screen.getByLabelText(/character name/i), 'Test Character');
    const archetypeSelect = screen.getByRole('combobox', { name: /character archetype/i });
    await user.click(archetypeSelect);
    await user.click(screen.getByText('Protagonist'));
    await user.click(screen.getByRole('button', { name: /continue to appearance/i }));
    
    await waitFor(() => expect(screen.getByText('Physical Appearance')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /continue to personality/i }));
    
    await waitFor(() => expect(screen.getByText('Personality')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /continue to background/i }));
    
    await waitFor(() => expect(screen.getByText('Background')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /continue to relationships/i }));

    await waitFor(() => {
      expect(screen.getByText('Relationships')).toBeInTheDocument();
    });

    // Switch to new character mode
    await user.click(screen.getByLabelText('New Character'));

    // Try to add without filling name
    const addButton = screen.getByRole('button', { name: /Add Relationship/i });
    expect(addButton).toBeDisabled();
  });

  it('allows selecting existing characters from dropdown', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const onCancel = vi.fn();

    render(<CharacterWizard onComplete={onComplete} onCancel={onCancel} />);

    // Navigate to Step 5
    await user.type(screen.getByLabelText(/character name/i), 'Test Character');
    const archetypeSelect = screen.getByRole('combobox', { name: /character archetype/i });
    await user.click(archetypeSelect);
    await user.click(screen.getByText('Protagonist'));
    await user.click(screen.getByRole('button', { name: /continue to appearance/i }));
    
    await waitFor(() => expect(screen.getByText('Physical Appearance')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /continue to personality/i }));
    
    await waitFor(() => expect(screen.getByText('Personality')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /continue to background/i }));
    
    await waitFor(() => expect(screen.getByText('Background')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /continue to relationships/i }));

    await waitFor(() => {
      expect(screen.getByText('Relationships')).toBeInTheDocument();
    });

    // Open character select dropdown
    const characterSelect = screen.getByRole('combobox', { name: /Select Character/i });
    await user.click(characterSelect);

    // Should show Alice and Bob
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
  });

  it('displays relationship dynamic options', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const onCancel = vi.fn();

    render(<CharacterWizard onComplete={onComplete} onCancel={onCancel} />);

    // Navigate to Step 5
    await user.type(screen.getByLabelText(/character name/i), 'Test Character');
    const archetypeSelect = screen.getByRole('combobox', { name: /character archetype/i });
    await user.click(archetypeSelect);
    await user.click(screen.getByText('Protagonist'));
    await user.click(screen.getByRole('button', { name: /continue to appearance/i }));
    
    await waitFor(() => expect(screen.getByText('Physical Appearance')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /continue to personality/i }));
    
    await waitFor(() => expect(screen.getByText('Personality')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /continue to background/i }));
    
    await waitFor(() => expect(screen.getByText('Background')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /continue to relationships/i }));

    await waitFor(() => {
      expect(screen.getByText('Relationships')).toBeInTheDocument();
    });

    // Switch to new character mode
    await user.click(screen.getByLabelText('New Character'));
    await user.type(screen.getByLabelText('Character Name'), 'Charlie');

    // Open dynamic dropdown
    const dynamicSelect = screen.getByRole('combobox', { name: /Relationship Dynamic/i });
    await user.click(dynamicSelect);

    // Check for dynamic options
    await waitFor(() => {
      expect(screen.getByText('Supportive')).toBeInTheDocument();
      expect(screen.getByText('Antagonistic')).toBeInTheDocument();
      expect(screen.getByText('Complicated')).toBeInTheDocument();
    });
  });
});
