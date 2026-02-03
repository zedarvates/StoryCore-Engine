import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CharacterSearchBar } from '../CharacterSearchBar';
import type { CharacterFilters } from '@/stores/useAppStore';

describe('CharacterSearchBar', () => {
  const mockOnSearchChange = vi.fn();
  const mockOnFilterChange = vi.fn();
  
  const defaultProps = {
    onSearchChange: mockOnSearchChange,
    onFilterChange: mockOnFilterChange,
    currentFilters: {} as CharacterFilters,
    resultCount: 10,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('Search Input', () => {
    it('renders search input with placeholder', () => {
      render(<CharacterSearchBar {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText(/search characters/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('updates search input value on user input', () => {
      render(<CharacterSearchBar {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText(/search characters/i) as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: 'hero' } });
      
      expect(searchInput.value).toBe('hero');
    });

    it('debounces search query changes (300ms default)', () => {
      render(<CharacterSearchBar {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText(/search characters/i);
      fireEvent.change(searchInput, { target: { value: 'hero' } });
      
      // Should not call immediately
      expect(mockOnSearchChange).not.toHaveBeenCalled();
      
      // Fast-forward time by 300ms
      vi.advanceTimersByTime(300);
      
      // Should call after debounce delay
      expect(mockOnSearchChange).toHaveBeenCalledWith('hero');
    });

    it('respects custom debounce delay', () => {
      render(<CharacterSearchBar {...defaultProps} debounceDelay={500} />);
      
      const searchInput = screen.getByPlaceholderText(/search characters/i);
      fireEvent.change(searchInput, { target: { value: 'hero' } });
      
      // Should not call after 300ms
      vi.advanceTimersByTime(300);
      expect(mockOnSearchChange).not.toHaveBeenCalled();
      
      // Should call after 500ms
      vi.advanceTimersByTime(200);
      expect(mockOnSearchChange).toHaveBeenCalledWith('hero');
    });

    it('shows clear button when search has value', () => {
      render(<CharacterSearchBar {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText(/search characters/i);
      
      // Clear button should not be visible initially
      expect(screen.queryByLabelText(/clear search/i)).not.toBeInTheDocument();
      
      // Type in search
      fireEvent.change(searchInput, { target: { value: 'hero' } });
      
      // Clear button should be visible
      expect(screen.getByLabelText(/clear search/i)).toBeInTheDocument();
    });

    it('clears search when clear button is clicked', () => {
      render(<CharacterSearchBar {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText(/search characters/i) as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: 'hero' } });
      
      const clearButton = screen.getByLabelText(/clear search/i);
      fireEvent.click(clearButton);
      
      expect(searchInput.value).toBe('');
    });

    it('calls onSearchChange with empty string when cleared', () => {
      render(<CharacterSearchBar {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText(/search characters/i);
      fireEvent.change(searchInput, { target: { value: 'hero' } });
      
      vi.advanceTimersByTime(300);
      expect(mockOnSearchChange).toHaveBeenCalledWith('hero');
      
      mockOnSearchChange.mockClear();
      
      const clearButton = screen.getByLabelText(/clear search/i);
      fireEvent.click(clearButton);
      
      vi.advanceTimersByTime(300);
      expect(mockOnSearchChange).toHaveBeenCalledWith('');
    });
  });

  describe('Archetype Filter', () => {
    it('renders archetype filter button', () => {
      render(<CharacterSearchBar {...defaultProps} />);
      
      expect(screen.getByLabelText(/filter by archetype/i)).toBeInTheDocument();
    });

    it('shows archetype dropdown when button is clicked', () => {
      render(<CharacterSearchBar {...defaultProps} />);
      
      const filterButton = screen.getByLabelText(/filter by archetype/i);
      fireEvent.click(filterButton);
      
      // Check for some archetype options
      expect(screen.getByText('Hero')).toBeInTheDocument();
      expect(screen.getByText('Mentor')).toBeInTheDocument();
      expect(screen.getByText('Shadow')).toBeInTheDocument();
    });

    it('toggles archetype selection', () => {
      render(<CharacterSearchBar {...defaultProps} />);
      
      const filterButton = screen.getByLabelText(/filter by archetype/i);
      fireEvent.click(filterButton);
      
      const heroLabel = screen.getByText('Hero').closest('label');
      const heroCheckbox = heroLabel?.querySelector('input[type="checkbox"]') as HTMLInputElement;
      fireEvent.click(heroCheckbox);
      
      expect(mockOnFilterChange).toHaveBeenCalledWith({
        archetype: ['Hero'],
      });
    });

    it('deselects archetype when clicked again', () => {
      render(
        <CharacterSearchBar
          {...defaultProps}
          currentFilters={{ archetype: ['Hero'] }}
        />
      );
      
      const filterButton = screen.getByLabelText(/filter by archetype/i);
      fireEvent.click(filterButton);
      
      const heroLabel = screen.getByText('Hero').closest('label');
      const heroCheckbox = heroLabel?.querySelector('input[type="checkbox"]') as HTMLInputElement;
      fireEvent.click(heroCheckbox);
      
      expect(mockOnFilterChange).toHaveBeenCalledWith({
        archetype: undefined,
      });
    });

    it('shows badge with count when archetypes are selected', () => {
      render(
        <CharacterSearchBar
          {...defaultProps}
          currentFilters={{ archetype: ['Hero', 'Mentor'] }}
        />
      );
      
      const filterButton = screen.getByLabelText(/filter by archetype/i);
      expect(filterButton).toHaveTextContent('2');
    });

    it('applies active styling when archetypes are selected', () => {
      render(
        <CharacterSearchBar
          {...defaultProps}
          currentFilters={{ archetype: ['Hero'] }}
        />
      );
      
      const filterButton = screen.getByLabelText(/filter by archetype/i);
      expect(filterButton).toHaveClass('character-search-bar__filter-button--active');
    });
  });

  describe('Age Range Filter', () => {
    it('renders age range filter button', () => {
      render(<CharacterSearchBar {...defaultProps} />);
      
      expect(screen.getByLabelText(/filter by age range/i)).toBeInTheDocument();
    });

    it('shows age range dropdown when button is clicked', () => {
      render(<CharacterSearchBar {...defaultProps} />);
      
      const filterButton = screen.getByLabelText(/filter by age range/i);
      fireEvent.click(filterButton);
      
      // Check for some age range options
      expect(screen.getByText(/child \(0-12\)/i)).toBeInTheDocument();
      expect(screen.getByText(/teen \(13-19\)/i)).toBeInTheDocument();
      expect(screen.getByText(/adult \(36-55\)/i)).toBeInTheDocument();
    });

    it('toggles age range selection', () => {
      render(<CharacterSearchBar {...defaultProps} />);
      
      const filterButton = screen.getByLabelText(/filter by age range/i);
      fireEvent.click(filterButton);
      
      const adultLabel = screen.getByText(/adult \(36-55\)/i).closest('label');
      const adultCheckbox = adultLabel?.querySelector('input[type="checkbox"]') as HTMLInputElement;
      fireEvent.click(adultCheckbox);
      
      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ageRange: ['Adult (36-55)'],
      });
    });

    it('shows badge with count when age ranges are selected', () => {
      render(
        <CharacterSearchBar
          {...defaultProps}
          currentFilters={{ ageRange: ['Teen (13-19)', 'Adult (36-55)'] }}
        />
      );
      
      const filterButton = screen.getByLabelText(/filter by age range/i);
      expect(filterButton).toHaveTextContent('2');
    });
  });

  describe('Creation Method Filter', () => {
    it('renders creation method filter button', () => {
      render(<CharacterSearchBar {...defaultProps} />);
      
      expect(screen.getByLabelText(/filter by creation method/i)).toBeInTheDocument();
    });

    it('shows creation method dropdown when button is clicked', () => {
      render(<CharacterSearchBar {...defaultProps} />);
      
      const filterButton = screen.getByLabelText(/filter by creation method/i);
      fireEvent.click(filterButton);
      
      // Check for creation method options
      expect(screen.getByText('Wizard')).toBeInTheDocument();
      expect(screen.getByText('Auto-Generated')).toBeInTheDocument();
      expect(screen.getByText('Manual')).toBeInTheDocument();
    });

    it('toggles creation method selection', () => {
      render(<CharacterSearchBar {...defaultProps} />);
      
      const filterButton = screen.getByLabelText(/filter by creation method/i);
      fireEvent.click(filterButton);
      
      const wizardLabel = screen.getByText('Wizard').closest('label');
      const wizardCheckbox = wizardLabel?.querySelector('input[type="checkbox"]') as HTMLInputElement;
      fireEvent.click(wizardCheckbox);
      
      expect(mockOnFilterChange).toHaveBeenCalledWith({
        creationMethod: ['wizard'],
      });
    });

    it('shows badge with count when creation methods are selected', () => {
      render(
        <CharacterSearchBar
          {...defaultProps}
          currentFilters={{ creationMethod: ['wizard', 'manual'] }}
        />
      );
      
      const filterButton = screen.getByLabelText(/filter by creation method/i);
      expect(filterButton).toHaveTextContent('2');
    });
  });

  describe('Clear Filters Button', () => {
    it('does not show clear filters button when no filters are active', () => {
      render(<CharacterSearchBar {...defaultProps} />);
      
      expect(screen.queryByLabelText(/clear all filters/i)).not.toBeInTheDocument();
    });

    it('shows clear filters button when search has value', () => {
      render(<CharacterSearchBar {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText(/search characters/i);
      fireEvent.change(searchInput, { target: { value: 'hero' } });
      
      expect(screen.getByLabelText(/clear all filters/i)).toBeInTheDocument();
    });

    it('shows clear filters button when filters are active', () => {
      render(
        <CharacterSearchBar
          {...defaultProps}
          currentFilters={{ archetype: ['Hero'] }}
        />
      );
      
      expect(screen.getByLabelText(/clear all filters/i)).toBeInTheDocument();
    });

    it('clears all filters and search when clicked', () => {
      render(
        <CharacterSearchBar
          {...defaultProps}
          currentFilters={{ archetype: ['Hero'], ageRange: ['Adult (36-55)'] }}
        />
      );
      
      const searchInput = screen.getByPlaceholderText(/search characters/i) as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: 'hero' } });
      
      const clearButton = screen.getByLabelText(/clear all filters/i);
      fireEvent.click(clearButton);
      
      expect(searchInput.value).toBe('');
      expect(mockOnFilterChange).toHaveBeenCalledWith({
        archetype: undefined,
        ageRange: undefined,
        creationMethod: undefined,
      });
    });
  });

  describe('Result Count Display', () => {
    it('displays result count', () => {
      render(<CharacterSearchBar {...defaultProps} resultCount={42} />);
      
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('characters')).toBeInTheDocument();
    });

    it('uses singular form for single result', () => {
      render(<CharacterSearchBar {...defaultProps} resultCount={1} />);
      
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('character')).toBeInTheDocument();
    });

    it('displays active filter count', () => {
      render(
        <CharacterSearchBar
          {...defaultProps}
          currentFilters={{
            archetype: ['Hero', 'Mentor'],
            ageRange: ['Adult (36-55)'],
          }}
          resultCount={5}
        />
      );
      
      expect(screen.getByText(/3 filters active/i)).toBeInTheDocument();
    });

    it('uses singular form for single active filter', () => {
      render(
        <CharacterSearchBar
          {...defaultProps}
          currentFilters={{ archetype: ['Hero'] }}
          resultCount={5}
        />
      );
      
      expect(screen.getByText(/1 filter active/i)).toBeInTheDocument();
    });

    it('does not show filter count when no filters are active', () => {
      render(<CharacterSearchBar {...defaultProps} resultCount={10} />);
      
      expect(screen.queryByText(/filters active/i)).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for search input', () => {
      render(<CharacterSearchBar {...defaultProps} />);
      
      const searchInput = screen.getByLabelText(/search characters/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('has proper ARIA labels for filter buttons', () => {
      render(<CharacterSearchBar {...defaultProps} />);
      
      expect(screen.getByLabelText(/filter by archetype/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/filter by age range/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/filter by creation method/i)).toBeInTheDocument();
    });

    it('has proper ARIA expanded state for filter dropdowns', () => {
      render(<CharacterSearchBar {...defaultProps} />);
      
      const filterButton = screen.getByLabelText(/filter by archetype/i);
      expect(filterButton).toHaveAttribute('aria-expanded', 'false');
      
      fireEvent.click(filterButton);
      expect(filterButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('has proper ARIA labels for clear buttons', () => {
      render(<CharacterSearchBar {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText(/search characters/i);
      fireEvent.change(searchInput, { target: { value: 'hero' } });
      
      expect(screen.getByLabelText(/clear search/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/clear all filters/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid typing in search input', () => {
      render(<CharacterSearchBar {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText(/search characters/i);
      
      // Type rapidly
      fireEvent.change(searchInput, { target: { value: 'abcdefghijklmnop' } });
      
      // Should only call once after debounce
      vi.advanceTimersByTime(300);
      expect(mockOnSearchChange).toHaveBeenCalledTimes(1);
      expect(mockOnSearchChange).toHaveBeenCalledWith('abcdefghijklmnop');
    });

    it('handles zero results', () => {
      render(<CharacterSearchBar {...defaultProps} resultCount={0} />);
      
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('characters')).toBeInTheDocument();
    });

    it('handles large result counts', () => {
      render(<CharacterSearchBar {...defaultProps} resultCount={9999} />);
      
      expect(screen.getByText('9999')).toBeInTheDocument();
    });

    it('handles empty filter arrays', () => {
      render(
        <CharacterSearchBar
          {...defaultProps}
          currentFilters={{
            archetype: [],
            ageRange: [],
            creationMethod: [],
          }}
        />
      );
      
      // Should not show clear filters button
      expect(screen.queryByLabelText(/clear all filters/i)).not.toBeInTheDocument();
    });

    it('handles undefined filter values', () => {
      render(
        <CharacterSearchBar
          {...defaultProps}
          currentFilters={{
            archetype: undefined,
            ageRange: undefined,
            creationMethod: undefined,
          }}
        />
      );
      
      // Should render without errors
      expect(screen.getByPlaceholderText(/search characters/i)).toBeInTheDocument();
    });
  });
});
