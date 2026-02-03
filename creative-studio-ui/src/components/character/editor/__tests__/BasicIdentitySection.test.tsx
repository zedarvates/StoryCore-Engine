import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BasicIdentitySection } from '../BasicIdentitySection';
import type { Character } from '@/types/character';

describe('BasicIdentitySection', () => {
  const mockOnChange = vi.fn();
  const mockOnNestedChange = vi.fn();

  const mockData: Partial<Character> = {
    name: 'Test Character',
    role: {
      archetype: 'Hero',
      narrative_function: 'Protagonist',
      character_arc: 'From naive to experienced',
    },
    visual_identity: {
      age_range: 'Young Adult (20-35)',
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
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all required fields', () => {
    render(
      <BasicIdentitySection
        data={mockData}
        errors={{}}
        onChange={mockOnChange}
        onNestedChange={mockOnNestedChange}
      />
    );

    expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Archetype/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Age Range/i)).toBeInTheDocument();
  });

  it('should display character data in fields', () => {
    render(
      <BasicIdentitySection
        data={mockData}
        errors={{}}
        onChange={mockOnChange}
        onNestedChange={mockOnNestedChange}
      />
    );

    const nameInput = screen.getByLabelText(/Name/i) as HTMLInputElement;
    expect(nameInput.value).toBe('Test Character');

    const archetypeSelect = screen.getByLabelText(/Archetype/i) as HTMLSelectElement;
    expect(archetypeSelect.value).toBe('Hero');

    const ageRangeSelect = screen.getByLabelText(/Age Range/i) as HTMLSelectElement;
    expect(ageRangeSelect.value).toBe('Young Adult (20-35)');
  });

  it('should call onChange when name is changed', () => {
    render(
      <BasicIdentitySection
        data={mockData}
        errors={{}}
        onChange={mockOnChange}
        onNestedChange={mockOnNestedChange}
      />
    );

    const nameInput = screen.getByLabelText(/Name/i);
    fireEvent.change(nameInput, { target: { value: 'New Name' } });

    expect(mockOnChange).toHaveBeenCalledWith('name', 'New Name');
  });

  it('should call onNestedChange when archetype is changed', () => {
    render(
      <BasicIdentitySection
        data={mockData}
        errors={{}}
        onChange={mockOnChange}
        onNestedChange={mockOnNestedChange}
      />
    );

    const archetypeSelect = screen.getByLabelText(/Archetype/i);
    fireEvent.change(archetypeSelect, { target: { value: 'Mentor' } });

    expect(mockOnNestedChange).toHaveBeenCalledWith('role', 'archetype', 'Mentor');
  });

  it('should display validation errors', () => {
    const errors = {
      name: ['Name is required'],
      'role.archetype': ['Archetype is required'],
    };

    render(
      <BasicIdentitySection
        data={mockData}
        errors={errors}
        onChange={mockOnChange}
        onNestedChange={mockOnNestedChange}
      />
    );

    expect(screen.getByText(/Name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Archetype is required/i)).toBeInTheDocument();
  });

  it('should mark required fields with asterisk', () => {
    render(
      <BasicIdentitySection
        data={mockData}
        errors={{}}
        onChange={mockOnChange}
        onNestedChange={mockOnNestedChange}
      />
    );

    const labels = screen.getAllByText('*');
    expect(labels.length).toBeGreaterThan(0);
  });
});
