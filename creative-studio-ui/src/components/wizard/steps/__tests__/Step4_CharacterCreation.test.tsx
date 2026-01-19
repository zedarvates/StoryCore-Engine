/**
 * Unit tests for Step4_CharacterCreation component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Step4_CharacterCreation } from '../Step4_CharacterCreation';
import type { CharacterProfile } from '@/types/wizard';

describe('Step4_CharacterCreation', () => {
  const mockOnUpdate = vi.fn();

  const mockCharacter: CharacterProfile = {
    id: 'char-1',
    name: 'John Doe',
    role: 'protagonist',
    physicalAppearance: 'Tall man with dark hair',
    personalityTraits: ['Brave', 'Intelligent'],
    characterArc: 'Learns to trust others',
    visualReferences: [],
    dialogueStyle: 'casual',
    relationships: [],
  };

  beforeEach(() => {
    mockOnUpdate.mockClear();
  });

  it('renders the component with title and description', () => {
    render(<Step4_CharacterCreation data={null} onUpdate={mockOnUpdate} />);

    expect(screen.getByText('Character Creation')).toBeInTheDocument();
    expect(screen.getByText('Create detailed character profiles for your story')).toBeInTheDocument();
  });

  it('displays "Add Character" button when no characters exist', () => {
    render(<Step4_CharacterCreation data={null} onUpdate={mockOnUpdate} />);

    const addButton = screen.getByRole('button', { name: /add character/i });
    expect(addButton).toBeInTheDocument();
  });

  it('displays existing characters when data is provided', () => {
    render(<Step4_CharacterCreation data={[mockCharacter]} onUpdate={mockOnUpdate} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Tall man with dark hair')).toBeInTheDocument();
    expect(screen.getByText('Brave')).toBeInTheDocument();
    expect(screen.getByText('Intelligent')).toBeInTheDocument();
  });

  it('opens character dialog when "Add Character" is clicked', async () => {
    render(<Step4_CharacterCreation data={null} onUpdate={mockOnUpdate} />);

    const addButton = screen.getByRole('button', { name: /add character/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Add New Character')).toBeInTheDocument();
    });
  });

  it('displays character form fields in dialog', async () => {
    render(<Step4_CharacterCreation data={null} onUpdate={mockOnUpdate} />);

    const addButton = screen.getByRole('button', { name: /add character/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/character name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/physical appearance/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/personality traits/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/character arc/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/dialogue style/i)).toBeInTheDocument();
    });
  });

  it('validates required fields before saving', async () => {
    render(<Step4_CharacterCreation data={null} onUpdate={mockOnUpdate} />);

    const addButton = screen.getByRole('button', { name: /add character/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: /add character/i });
      expect(saveButton).toBeDisabled();
    });
  });

  it('enables save button when required fields are filled', async () => {
    render(<Step4_CharacterCreation data={null} onUpdate={mockOnUpdate} />);

    const addButton = screen.getByRole('button', { name: /add character/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      const nameInput = screen.getByLabelText(/character name/i);
      const appearanceInput = screen.getByLabelText(/physical appearance/i);

      fireEvent.change(nameInput, { target: { value: 'Test Character' } });
      fireEvent.change(appearanceInput, { target: { value: 'Test appearance' } });
    });

    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: /add character/i });
      expect(saveButton).not.toBeDisabled();
    });
  });

  it('displays edit and delete buttons for existing characters', () => {
    render(<Step4_CharacterCreation data={[mockCharacter]} onUpdate={mockOnUpdate} />);

    expect(screen.getByLabelText(/edit john doe/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/delete john doe/i)).toBeInTheDocument();
  });

  it('displays relationship matrix button for characters', () => {
    render(<Step4_CharacterCreation data={[mockCharacter]} onUpdate={mockOnUpdate} />);

    expect(screen.getByLabelText(/view relationships for john doe/i)).toBeInTheDocument();
  });

  it('displays character summary when characters exist', () => {
    render(<Step4_CharacterCreation data={[mockCharacter]} onUpdate={mockOnUpdate} />);

    expect(screen.getByText('Character Summary')).toBeInTheDocument();
    expect(screen.getByText(/you have created/i)).toBeInTheDocument();
  });

  it('displays error message when provided', () => {
    const errors = { characters: 'At least one character is required' };
    render(<Step4_CharacterCreation data={null} onUpdate={mockOnUpdate} errors={errors} />);

    expect(screen.getByText('At least one character is required')).toBeInTheDocument();
  });

  it('displays all character role options', async () => {
    render(<Step4_CharacterCreation data={null} onUpdate={mockOnUpdate} />);

    const addButton = screen.getByRole('button', { name: /add character/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Protagonist')).toBeInTheDocument();
      expect(screen.getByText('Antagonist')).toBeInTheDocument();
      expect(screen.getByText('Supporting')).toBeInTheDocument();
      expect(screen.getByText('Background')).toBeInTheDocument();
    });
  });

  it('displays all dialogue style options', async () => {
    render(<Step4_CharacterCreation data={null} onUpdate={mockOnUpdate} />);

    const addButton = screen.getByRole('button', { name: /add character/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Formal')).toBeInTheDocument();
      expect(screen.getByText('Casual')).toBeInTheDocument();
      expect(screen.getByText('Technical')).toBeInTheDocument();
      expect(screen.getByText('Poetic')).toBeInTheDocument();
      expect(screen.getByText('Terse')).toBeInTheDocument();
      expect(screen.getByText('Verbose')).toBeInTheDocument();
      expect(screen.getByText('Dialect-Specific')).toBeInTheDocument();
    });
  });

  it('allows adding personality traits', async () => {
    render(<Step4_CharacterCreation data={null} onUpdate={mockOnUpdate} />);

    const addButton = screen.getByRole('button', { name: /add character/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      const traitInput = screen.getByPlaceholderText(/e.g., brave, intelligent/i);
      const addTraitButton = screen.getByRole('button', { name: /^add$/i });

      fireEvent.change(traitInput, { target: { value: 'Courageous' } });
      fireEvent.click(addTraitButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Courageous ×')).toBeInTheDocument();
    });
  });

  it('displays visual reference upload button', async () => {
    render(<Step4_CharacterCreation data={null} onUpdate={mockOnUpdate} />);

    const addButton = screen.getByRole('button', { name: /add character/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /upload reference image/i })).toBeInTheDocument();
    });
  });
});
