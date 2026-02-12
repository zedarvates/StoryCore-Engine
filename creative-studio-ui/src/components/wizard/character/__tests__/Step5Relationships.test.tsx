import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Step5Relationships } from '../Step5Relationships';
import { WizardProvider } from '@/contexts/WizardContext';
import type { Character } from '@/types/character';
import { createEmptyCharacter } from '@/types/character';

// Mock the store
vi.mock('@/store', () => ({
  useStore: vi.fn(),
  useCharacters: vi.fn(),
}));

import { useCharacters } from '@/store';

describe('Step5Relationships - Character Relationship Validation', () => {
  const mockNextStep = vi.fn();
  const mockPreviousStep = vi.fn();
  const mockUpdateFormData = vi.fn();

  const mockCharacter: Partial<Character> = {
    ...createEmptyCharacter(),
    character_id: 'char-1',
    name: 'Test Character',
  };

  const existingCharacters: Character[] = [
    {
      ...createEmptyCharacter(),
      character_id: 'char-2',
      name: 'Alice',
      role: {
        archetype: 'Protagonist',
        narrative_function: 'Hero',
        character_arc: 'Growth',
      },
    } as Character,
    {
      ...createEmptyCharacter(),
      character_id: 'char-3',
      name: 'Bob',
      role: {
        archetype: 'Mentor',
        narrative_function: 'Guide',
        character_arc: 'Flat',
      },
    } as Character,
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock useCharacters to return existing characters
    vi.mocked(useCharacters).mockReturnValue(existingCharacters);
  });

  const renderComponent = (formData: Partial<Character> = mockCharacter) => {
    return render(
      <WizardProvider
        initialData={formData}
        onComplete={vi.fn()}
        storageKey="test-character-wizard"
      >
        <Step5Relationships />
      </WizardProvider>
    );
  };

  it('displays existing characters count when characters exist', () => {
    renderComponent();
    
    expect(screen.getByText(/You have 2 existing characters in your project/i)).toBeInTheDocument();
  });

  it('shows character selection dropdown for existing characters', () => {
    renderComponent();
    
    expect(screen.getByText('Character Source')).toBeInTheDocument();
    expect(screen.getByLabelText('Existing Character')).toBeChecked();
    expect(screen.getByText('Select Character')).toBeInTheDocument();
  });

  it('allows switching between existing and new character modes', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    // Initially in existing character mode
    expect(screen.getByLabelText('Existing Character')).toBeChecked();
    expect(screen.getByText('Select Character')).toBeInTheDocument();
    
    // Switch to new character mode
    await user.click(screen.getByLabelText('New Character'));
    
    expect(screen.getByLabelText('New Character')).toBeChecked();
    expect(screen.getByLabelText('Character Name')).toBeInTheDocument();
  });

  it('validates that selected character exists when adding relationship', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    // Try to add without selecting a character
    const addButton = screen.getByRole('button', { name: /Add Relationship/i });
    expect(addButton).toBeDisabled();
  });

  it('displays existing characters in dropdown excluding current character', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    // Open the select dropdown
    const selectTrigger = screen.getByRole('combobox', { name: /Select Character/i });
    await user.click(selectTrigger);
    
    // Should show Alice and Bob
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
  });

  it('shows validation status for relationships with existing characters', () => {
    const characterWithRelationships: Partial<Character> = {
      ...mockCharacter,
      relationships: [
        {
          character_id: 'char-2', // Alice - exists
          character_name: 'Alice',
          relationship_type: 'Friend',
          description: 'Best friends',
          dynamic: 'Supportive',
        },
        {
          character_id: 'char-999', // Doesn't exist
          character_name: 'Unknown',
          relationship_type: 'Enemy',
          description: 'Rival',
          dynamic: 'Antagonistic',
        },
      ],
    };

    renderComponent(characterWithRelationships);
    
    // Should show both relationships
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Unknown')).toBeInTheDocument();
    
    // Should show warning for non-existent character
    expect(screen.getByText(/This character doesn't exist yet/i)).toBeInTheDocument();
  });

  it('allows adding relationship with new character name', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    // Switch to new character mode
    await user.click(screen.getByLabelText('New Character'));
    
    // Fill in character name
    const nameInput = screen.getByLabelText('Character Name');
    await user.type(nameInput, 'Charlie');
    
    // Select relationship type
    const typeSelect = screen.getByRole('combobox', { name: /Relationship Type/i });
    await user.click(typeSelect);
    await user.click(screen.getByText('Friend'));
    
    // Add button should be enabled
    const addButton = screen.getByRole('button', { name: /Add Relationship/i });
    expect(addButton).toBeEnabled();
  });

  it('displays relationship type options', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    // Switch to new character mode for easier testing
    await user.click(screen.getByLabelText('New Character'));
    await user.type(screen.getByLabelText('Character Name'), 'Test');
    
    // Open relationship type dropdown
    const typeSelect = screen.getByRole('combobox', { name: /Relationship Type/i });
    await user.click(typeSelect);
    
    // Check for relationship types
    await waitFor(() => {
      expect(screen.getByText('Family')).toBeInTheDocument();
      expect(screen.getByText('Friend')).toBeInTheDocument();
      expect(screen.getByText('Romantic Partner')).toBeInTheDocument();
      expect(screen.getByText('Mentor')).toBeInTheDocument();
      expect(screen.getByText('Rival')).toBeInTheDocument();
      expect(screen.getByText('Enemy')).toBeInTheDocument();
    });
  });

  it('displays relationship dynamic options', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    // Switch to new character mode
    await user.click(screen.getByLabelText('New Character'));
    await user.type(screen.getByLabelText('Character Name'), 'Test');
    
    // Open dynamic dropdown
    const dynamicSelect = screen.getByRole('combobox', { name: /Relationship Dynamic/i });
    await user.click(dynamicSelect);
    
    // Check for dynamic options
    await waitFor(() => {
      expect(screen.getByText('Supportive')).toBeInTheDocument();
      expect(screen.getByText('Antagonistic')).toBeInTheDocument();
      expect(screen.getByText('Complicated')).toBeInTheDocument();
      expect(screen.getByText('Close')).toBeInTheDocument();
    });
  });

  it('shows validation error when trying to add without required fields', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    // Switch to new character mode
    await user.click(screen.getByLabelText('New Character'));
    
    // Try to add without filling required fields
    const addButton = screen.getByRole('button', { name: /Add Relationship/i });
    expect(addButton).toBeDisabled();
  });

  it('allows editing existing relationships', async () => {
    const user = userEvent.setup();
    const characterWithRelationships: Partial<Character> = {
      ...mockCharacter,
      relationships: [
        {
          character_id: 'char-2',
          character_name: 'Alice',
          relationship_type: 'Friend',
          description: 'Best friends',
          dynamic: 'Supportive',
        },
      ],
    };

    renderComponent(characterWithRelationships);
    
    // Click edit button
    const editButton = screen.getByRole('button', { name: /Edit/i });
    await user.click(editButton);
    
    // Should show Update button instead of Add
    expect(screen.getByRole('button', { name: /Update Relationship/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });

  it('allows deleting relationships', async () => {
    const user = userEvent.setup();
    const characterWithRelationships: Partial<Character> = {
      ...mockCharacter,
      relationships: [
        {
          character_id: 'char-2',
          character_name: 'Alice',
          relationship_type: 'Friend',
          description: 'Best friends',
          dynamic: 'Supportive',
        },
      ],
    };

    renderComponent(characterWithRelationships);
    
    // Should show the relationship
    expect(screen.getByText('Alice')).toBeInTheDocument();
    
    // Delete button should be present
    const deleteButtons = screen.getAllByRole('button');
    const deleteButton = deleteButtons.find(btn => btn.querySelector('svg')); // Trash icon
    expect(deleteButton).toBeInTheDocument();
  });
});
