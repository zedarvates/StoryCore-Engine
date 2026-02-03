import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CharacterCard } from '../CharacterCard';
import type { Character } from '@/types/character';

// Mock character data
const createMockCharacter = (overrides?: Partial<Character>): Character => ({
  character_id: 'char-123',
  name: 'John Doe',
  creation_method: 'wizard',
  creation_timestamp: '2024-01-15T10:30:00Z',
  version: '1.0',
  visual_identity: {
    hair_color: 'brown',
    hair_style: 'short',
    hair_length: 'short',
    eye_color: 'blue',
    eye_shape: 'round',
    skin_tone: 'fair',
    facial_structure: 'oval',
    distinctive_features: ['scar on left cheek'],
    age_range: '25-35',
    height: '6ft',
    build: 'athletic',
    posture: 'upright',
    clothing_style: 'casual',
    color_palette: ['blue', 'gray'],
  },
  personality: {
    traits: ['brave', 'loyal'],
    values: ['justice', 'family'],
    fears: ['failure'],
    desires: ['success'],
    flaws: ['stubborn'],
    strengths: ['determined'],
    temperament: 'calm',
    communication_style: 'direct',
  },
  background: {
    origin: 'New York',
    occupation: 'Detective',
    education: 'Police Academy',
    family: 'Married with two kids',
    significant_events: ['Solved major case'],
    current_situation: 'Working on new case',
  },
  relationships: [],
  role: {
    archetype: 'Hero',
    narrative_function: 'Protagonist',
    character_arc: 'Redemption',
  },
  ...overrides,
});

describe('CharacterCard', () => {
  describe('Basic Rendering', () => {
    it('should render character name', () => {
      const character = createMockCharacter();
      render(<CharacterCard character={character} />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should render character archetype', () => {
      const character = createMockCharacter();
      render(<CharacterCard character={character} />);
      
      expect(screen.getByText('Hero')).toBeInTheDocument();
    });

    it('should render age range', () => {
      const character = createMockCharacter();
      render(<CharacterCard character={character} />);
      
      expect(screen.getByText('25-35')).toBeInTheDocument();
    });

    it('should render formatted creation date', () => {
      const character = createMockCharacter();
      render(<CharacterCard character={character} />);
      
      // Date should be formatted as "Jan 15, 2024"
      expect(screen.getByText(/Jan 15, 2024/)).toBeInTheDocument();
    });

    it('should handle missing age range gracefully', () => {
      const character = createMockCharacter({
        visual_identity: {
          ...createMockCharacter().visual_identity,
          age_range: '',
        },
      });
      render(<CharacterCard character={character} />);
      
      expect(screen.getByText('Not specified')).toBeInTheDocument();
    });
  });

  describe('Thumbnail Display', () => {
    it('should display thumbnail image when thumbnail_url is provided', () => {
      const character = {
        ...createMockCharacter(),
        thumbnail_url: 'https://example.com/thumbnail.jpg',
      } as any;
      render(<CharacterCard character={character} />);
      
      const img = screen.getByAltText('John Doe thumbnail');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/thumbnail.jpg');
    });

    it('should display placeholder when no thumbnail_url is provided', () => {
      const character = createMockCharacter();
      render(<CharacterCard character={character} />);
      
      // Should have placeholder with User icon
      const placeholder = document.querySelector('.character-card__thumbnail-placeholder');
      expect(placeholder).toBeInTheDocument();
    });

    it('should handle image load error gracefully', () => {
      const character = {
        ...createMockCharacter(),
        thumbnail_url: 'https://example.com/broken.jpg',
      } as any;
      render(<CharacterCard character={character} />);
      
      const img = screen.getByAltText('John Doe thumbnail');
      
      // Simulate image load error
      fireEvent.error(img);
      
      // Should show placeholder after error
      const placeholder = document.querySelector('.character-card__thumbnail-placeholder');
      expect(placeholder).toBeInTheDocument();
    });
  });

  describe('Click Handling', () => {
    it('should call onClick when card is clicked', () => {
      const character = createMockCharacter();
      const handleClick = vi.fn();
      render(<CharacterCard character={character} onClick={handleClick} />);
      
      const card = document.querySelector('.character-card');
      fireEvent.click(card!);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should handle Enter key press', () => {
      const character = createMockCharacter();
      const handleClick = vi.fn();
      render(<CharacterCard character={character} onClick={handleClick} />);
      
      const card = document.querySelector('.character-card');
      fireEvent.keyDown(card!, { key: 'Enter' });
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should handle Space key press', () => {
      const character = createMockCharacter();
      const handleClick = vi.fn();
      render(<CharacterCard character={character} onClick={handleClick} />);
      
      const card = document.querySelector('.character-card');
      fireEvent.keyDown(card!, { key: ' ' });
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when card is not clickable', () => {
      const character = createMockCharacter();
      const handleClick = vi.fn();
      render(<CharacterCard character={character} />);
      
      const card = document.querySelector('.character-card');
      fireEvent.click(card!);
      
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Selection Mode', () => {
    it('should render checkbox when selectable is true', () => {
      const character = createMockCharacter();
      render(<CharacterCard character={character} selectable={true} />);
      
      const checkbox = screen.getByRole('checkbox', { name: 'Select John Doe' });
      expect(checkbox).toBeInTheDocument();
    });

    it('should not render checkbox when selectable is false', () => {
      const character = createMockCharacter();
      render(<CharacterCard character={character} selectable={false} />);
      
      const checkbox = screen.queryByRole('checkbox');
      expect(checkbox).not.toBeInTheDocument();
    });

    it('should reflect selected state in checkbox', () => {
      const character = createMockCharacter();
      render(
        <CharacterCard
          character={character}
          selectable={true}
          selected={true}
        />
      );
      
      const checkbox = screen.getByLabelText('Select John Doe') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('should call onSelect when checkbox is changed', () => {
      const character = createMockCharacter();
      const handleSelect = vi.fn();
      render(
        <CharacterCard
          character={character}
          selectable={true}
          selected={false}
          onSelect={handleSelect}
        />
      );
      
      const checkbox = screen.getByLabelText('Select John Doe');
      fireEvent.click(checkbox);
      
      expect(handleSelect).toHaveBeenCalledWith(true);
    });

    it('should toggle selection when card is clicked in selectable mode', () => {
      const character = createMockCharacter();
      const handleSelect = vi.fn();
      render(
        <CharacterCard
          character={character}
          selectable={true}
          selected={false}
          onSelect={handleSelect}
        />
      );
      
      const card = document.querySelector('.character-card');
      fireEvent.click(card!);
      
      expect(handleSelect).toHaveBeenCalledWith(true);
    });

    it('should apply selected styling when selected', () => {
      const character = createMockCharacter();
      render(
        <CharacterCard
          character={character}
          selectable={true}
          selected={true}
        />
      );
      
      const card = document.querySelector('.character-card');
      expect(card).toHaveClass('character-card--selected');
    });

    it('should stop propagation when checkbox is clicked', () => {
      const character = createMockCharacter();
      const handleSelect = vi.fn();
      const handleClick = vi.fn();
      render(
        <CharacterCard
          character={character}
          selectable={true}
          onClick={handleClick}
          onSelect={handleSelect}
        />
      );
      
      const checkbox = screen.getByLabelText('Select John Doe');
      fireEvent.click(checkbox);
      
      // onSelect should be called, but onClick should not
      expect(handleSelect).toHaveBeenCalled();
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Action Buttons', () => {
    it('should render edit button when showActions is true and onEdit is provided', () => {
      const character = createMockCharacter();
      const handleEdit = vi.fn();
      render(
        <CharacterCard
          character={character}
          showActions={true}
          onEdit={handleEdit}
        />
      );
      
      const editButton = screen.getByLabelText('Edit John Doe');
      expect(editButton).toBeInTheDocument();
    });

    it('should render delete button when showActions is true and onDelete is provided', () => {
      const character = createMockCharacter();
      const handleDelete = vi.fn();
      render(
        <CharacterCard
          character={character}
          showActions={true}
          onDelete={handleDelete}
        />
      );
      
      const deleteButton = screen.getByLabelText('Delete John Doe');
      expect(deleteButton).toBeInTheDocument();
    });

    it('should not render action buttons when showActions is false', () => {
      const character = createMockCharacter();
      render(
        <CharacterCard
          character={character}
          showActions={false}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      );
      
      const actions = document.querySelector('.character-card__actions');
      expect(actions).not.toBeInTheDocument();
    });

    it('should call onEdit when edit button is clicked', () => {
      const character = createMockCharacter();
      const handleEdit = vi.fn();
      render(
        <CharacterCard
          character={character}
          showActions={true}
          onEdit={handleEdit}
        />
      );
      
      const editButton = screen.getByLabelText('Edit John Doe');
      fireEvent.click(editButton);
      
      expect(handleEdit).toHaveBeenCalledTimes(1);
    });

    it('should call onDelete when delete button is clicked', () => {
      const character = createMockCharacter();
      const handleDelete = vi.fn();
      render(
        <CharacterCard
          character={character}
          showActions={true}
          onDelete={handleDelete}
        />
      );
      
      const deleteButton = screen.getByLabelText('Delete John Doe');
      fireEvent.click(deleteButton);
      
      expect(handleDelete).toHaveBeenCalledTimes(1);
    });

    it('should stop propagation when action buttons are clicked', () => {
      const character = createMockCharacter();
      const handleEdit = vi.fn();
      const handleClick = vi.fn();
      render(
        <CharacterCard
          character={character}
          showActions={true}
          onClick={handleClick}
          onEdit={handleEdit}
        />
      );
      
      const editButton = screen.getByLabelText('Edit John Doe');
      fireEvent.click(editButton);
      
      // onEdit should be called, but onClick should not
      expect(handleEdit).toHaveBeenCalled();
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should render loading skeleton when loading is true', () => {
      const character = createMockCharacter();
      render(<CharacterCard character={character} loading={true} />);
      
      const skeleton = document.querySelector('.character-card__skeleton');
      expect(skeleton).toBeInTheDocument();
    });

    it('should not render character content when loading', () => {
      const character = createMockCharacter();
      render(<CharacterCard character={character} loading={true} />);
      
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });

    it('should not be clickable when loading', () => {
      const character = createMockCharacter();
      const handleClick = vi.fn();
      render(
        <CharacterCard
          character={character}
          loading={true}
          onClick={handleClick}
        />
      );
      
      const card = document.querySelector('.character-card');
      fireEvent.click(card!);
      
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Styling and CSS Classes', () => {
    it('should apply clickable class when onClick is provided', () => {
      const character = createMockCharacter();
      render(<CharacterCard character={character} onClick={vi.fn()} />);
      
      const card = document.querySelector('.character-card');
      expect(card).toHaveClass('character-card--clickable');
    });

    it('should apply selectable class when selectable is true', () => {
      const character = createMockCharacter();
      render(<CharacterCard character={character} selectable={true} />);
      
      const card = document.querySelector('.character-card');
      expect(card).toHaveClass('character-card--selectable');
    });

    it('should apply loading class when loading is true', () => {
      const character = createMockCharacter();
      render(<CharacterCard character={character} loading={true} />);
      
      const card = document.querySelector('.character-card');
      expect(card).toHaveClass('character-card--loading');
    });
  });

  describe('Accessibility', () => {
    it('should have proper role when selectable', () => {
      const character = createMockCharacter();
      render(<CharacterCard character={character} selectable={true} />);
      
      const card = document.querySelector('.character-card');
      expect(card).toHaveAttribute('role', 'article');
    });

    it('should have proper role when not selectable', () => {
      const character = createMockCharacter();
      render(<CharacterCard character={character} />);
      
      const card = document.querySelector('.character-card');
      expect(card).toHaveAttribute('role', 'article');
    });

    it('should not have aria-checked attribute', () => {
      const character = createMockCharacter();
      render(
        <CharacterCard
          character={character}
          selectable={true}
          selected={true}
        />
      );
      
      const card = document.querySelector('.character-card');
      expect(card).not.toHaveAttribute('aria-checked');
    });

    it('should have tabIndex when clickable', () => {
      const character = createMockCharacter();
      render(<CharacterCard character={character} onClick={vi.fn()} />);
      
      const card = document.querySelector('.character-card');
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('should have proper aria-label for checkbox', () => {
      const character = createMockCharacter();
      render(<CharacterCard character={character} selectable={true} />);
      
      const checkbox = screen.getByLabelText('Select John Doe');
      expect(checkbox).toHaveAttribute('aria-label', 'Select John Doe');
    });

    it('should have proper aria-label for edit button', () => {
      const character = createMockCharacter();
      render(
        <CharacterCard
          character={character}
          showActions={true}
          onEdit={vi.fn()}
        />
      );
      
      const editButton = screen.getByLabelText('Edit John Doe');
      expect(editButton).toHaveAttribute('aria-label', 'Edit John Doe');
    });

    it('should have proper aria-label for delete button', () => {
      const character = createMockCharacter();
      render(
        <CharacterCard
          character={character}
          showActions={true}
          onDelete={vi.fn()}
        />
      );
      
      const deleteButton = screen.getByLabelText('Delete John Doe');
      expect(deleteButton).toHaveAttribute('aria-label', 'Delete John Doe');
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid date gracefully', () => {
      const character = createMockCharacter({
        creation_timestamp: 'invalid-date',
      });
      render(<CharacterCard character={character} />);
      
      expect(screen.getByText('Unknown date')).toBeInTheDocument();
    });

    it('should handle empty character name', () => {
      const character = createMockCharacter({ name: '' });
      render(<CharacterCard character={character} />);
      
      // Should still render without crashing
      const card = document.querySelector('.character-card');
      expect(card).toBeInTheDocument();
    });

    it('should handle missing archetype', () => {
      const character = createMockCharacter({
        role: {
          archetype: '',
          narrative_function: 'Protagonist',
          character_arc: 'Redemption',
        },
      });
      render(<CharacterCard character={character} />);
      
      // Should still render without crashing
      const card = document.querySelector('.character-card');
      expect(card).toBeInTheDocument();
    });

    it('should handle all props together', () => {
      const character = {
        ...createMockCharacter(),
        thumbnail_url: 'https://example.com/thumbnail.jpg',
      } as any;
      const handleClick = vi.fn();
      const handleSelect = vi.fn();
      const handleEdit = vi.fn();
      const handleDelete = vi.fn();
      
      render(
        <CharacterCard
          character={character}
          onClick={handleClick}
          selectable={true}
          selected={true}
          onSelect={handleSelect}
          showActions={true}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      );
      
      // Should render all elements
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByLabelText('Select John Doe')).toBeInTheDocument();
      expect(screen.getByLabelText('Edit John Doe')).toBeInTheDocument();
      expect(screen.getByLabelText('Delete John Doe')).toBeInTheDocument();
    });
  });
});
