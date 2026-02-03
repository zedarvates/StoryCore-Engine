import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RelationshipsSection } from '../RelationshipsSection';
import { useCharacterManager } from '@/hooks/useCharacterManager';
import type { CharacterRelationship, Character } from '@/types/character';

vi.mock('@/hooks/useCharacterManager');

describe('RelationshipsSection', () => {
  const mockOnChange = vi.fn();
  const mockGetAllCharacters = vi.fn();

  const mockRelationships: CharacterRelationship[] = [
    {
      character_id: 'char-2',
      character_name: 'Friend Character',
      relationship_type: 'friend',
      description: 'Best friends since childhood',
      dynamic: 'Supportive and loyal',
    },
  ];

  const mockCharacters: Character[] = [
    {
      character_id: 'char-2',
      name: 'Friend Character',
      creation_method: 'wizard',
      creation_timestamp: '2024-01-01T00:00:00Z',
      version: '1.0',
    } as Character,
    {
      character_id: 'char-3',
      name: 'Enemy Character',
      creation_method: 'wizard',
      creation_timestamp: '2024-01-01T00:00:00Z',
      version: '1.0',
    } as Character,
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAllCharacters.mockReturnValue(mockCharacters);
    (useCharacterManager as any).mockReturnValue({
      getAllCharacters: mockGetAllCharacters,
    });
  });

  it('should render relationships section', () => {
    render(
      <RelationshipsSection
        characterId="char-1"
        relationships={[]}
        errors={{}}
        onChange={mockOnChange}
      />
    );

    expect(screen.getAllByText(/Relationships/i).length).toBeGreaterThan(0);
  });

  it('should display existing relationships', () => {
    render(
      <RelationshipsSection
        characterId="char-1"
        relationships={mockRelationships}
        errors={{}}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('Friend Character')).toBeInTheDocument();
    expect(screen.getByText('friend')).toBeInTheDocument();
    expect(screen.getByText('Best friends since childhood')).toBeInTheDocument();
  });

  it('should show empty state when no relationships', () => {
    render(
      <RelationshipsSection
        characterId="char-1"
        relationships={[]}
        errors={{}}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText(/No relationships defined yet/i)).toBeInTheDocument();
  });

  it('should show add relationship button', () => {
    render(
      <RelationshipsSection
        characterId="char-1"
        relationships={[]}
        errors={{}}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByRole('button', { name: /Add First Relationship/i })).toBeInTheDocument();
  });

  it('should show add relationship form when add is clicked', () => {
    render(
      <RelationshipsSection
        characterId="char-1"
        relationships={[]}
        errors={{}}
        onChange={mockOnChange}
      />
    );

    const addButton = screen.getByRole('button', { name: /Add First Relationship/i });
    fireEvent.click(addButton);

    expect(screen.getByText(/Add New Relationship/i)).toBeInTheDocument();
    expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0);
  });

  it('should populate character dropdown with available characters', () => {
    render(
      <RelationshipsSection
        characterId="char-1"
        relationships={[]}
        errors={{}}
        onChange={mockOnChange}
      />
    );

    const addButton = screen.getByRole('button', { name: /Add First Relationship/i });
    fireEvent.click(addButton);

    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThan(0);
    
    // Check that options are present
    expect(screen.getByText('Friend Character')).toBeInTheDocument();
    expect(screen.getByText('Enemy Character')).toBeInTheDocument();
  });

  it('should add new relationship when form is submitted', () => {
    render(
      <RelationshipsSection
        characterId="char-1"
        relationships={[]}
        errors={{}}
        onChange={mockOnChange}
      />
    );

    const addButton = screen.getByRole('button', { name: /Add First Relationship/i });
    fireEvent.click(addButton);

    // Fill form
    const selects = screen.getAllByRole('combobox');
    const characterSelect = selects[0];
    fireEvent.change(characterSelect, { target: { value: 'char-2' } });

    const typeSelect = selects[1];
    fireEvent.change(typeSelect, { target: { value: 'friend' } });

    const inputs = screen.getAllByRole('textbox');
    const descriptionInput = inputs[0];
    fireEvent.change(descriptionInput, { target: { value: 'Best friends' } });

    // Submit
    const saveButton = screen.getByRole('button', { name: /Add/i });
    fireEvent.click(saveButton);

    expect(mockOnChange).toHaveBeenCalledWith([
      {
        character_id: 'char-2',
        character_name: 'Friend Character',
        relationship_type: 'friend',
        description: 'Best friends',
        dynamic: '',
      },
    ]);
  });

  it('should show edit form when edit button is clicked', () => {
    render(
      <RelationshipsSection
        characterId="char-1"
        relationships={mockRelationships}
        errors={{}}
        onChange={mockOnChange}
      />
    );

    const editButton = screen.getByLabelText(/Edit relationship/i);
    fireEvent.click(editButton);

    expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0);
  });

  it('should delete relationship when delete button is clicked', () => {
    render(
      <RelationshipsSection
        characterId="char-1"
        relationships={mockRelationships}
        errors={{}}
        onChange={mockOnChange}
      />
    );

    const deleteButton = screen.getByLabelText(/Delete relationship/i);
    fireEvent.click(deleteButton);

    expect(mockOnChange).toHaveBeenCalledWith([]);
  });

  it('should cancel add when cancel is clicked', () => {
    render(
      <RelationshipsSection
        characterId="char-1"
        relationships={[]}
        errors={{}}
        onChange={mockOnChange}
      />
    );

    const addButton = screen.getByRole('button', { name: /Add First Relationship/i });
    fireEvent.click(addButton);

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(screen.queryByText(/Add New Relationship/i)).not.toBeInTheDocument();
  });

  it('should disable save button if required fields are empty', () => {
    render(
      <RelationshipsSection
        characterId="char-1"
        relationships={[]}
        errors={{}}
        onChange={mockOnChange}
      />
    );

    const addButton = screen.getByRole('button', { name: /Add First Relationship/i });
    fireEvent.click(addButton);

    const saveButton = screen.getByRole('button', { name: /Add/i });
    expect(saveButton).toBeDisabled();
  });
});
