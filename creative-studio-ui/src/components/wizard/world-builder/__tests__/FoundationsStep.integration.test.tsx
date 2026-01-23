import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { FoundationsStep } from '../steps/FoundationsStep';
import { useWorldBuilderSelectors, useWorldBuilderActions } from '../../../../stores/worldBuilderStore';

// Mock the store hooks
vi.mock('../../../../stores/worldBuilderStore', () => ({
  useWorldBuilderSelectors: vi.fn(),
  useWorldBuilderActions: vi.fn(),
}));

// Mock StepValidator
vi.mock('../StepValidator', () => ({
  StepValidator: ({ step }: { step: string }) => (
    <div data-testid={`step-validator-${step}`}>Step Validator: {step}</div>
  ),
}));

describe('FoundationsStep Integration', () => {
  const mockSelectors = {
    worldData: null,
    currentStep: 'foundations',
    completedSteps: new Set(),
    isLoading: false,
    error: null,
    lastSaved: null,
    isStepCompleted: jest.fn(),
    canNavigateToStep: jest.fn(),
  };

  const mockActions = {
    updateStep: jest.fn(),
    markStepComplete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useWorldBuilderSelectors as jest.Mock).mockReturnValue(mockSelectors);
    (useWorldBuilderActions as jest.Mock).mockReturnValue(mockActions);
  });

  describe('Initial rendering', () => {
    it('should render all form fields with correct labels', () => {
      render(<FoundationsStep />);

      expect(screen.getByLabelText(/World Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Genre/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Tone/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Setting/)).toBeInTheDocument();
      expect(screen.getByLabelText(/World Scale/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Save Foundations/ })).toBeInTheDocument();
    });

    it('should render StepValidator component', () => {
      render(<FoundationsStep />);

      expect(screen.getByTestId('step-validator-foundations')).toBeInTheDocument();
    });

    it('should initialize form with default values', () => {
      render(<FoundationsStep />);

      const nameInput = screen.getByLabelText(/World Name/) as HTMLInputElement;
      const genreSelect = screen.getByLabelText(/Genre/) as HTMLSelectElement;
      const scaleSelect = screen.getByLabelText(/World Scale/) as HTMLSelectElement;

      expect(nameInput.value).toBe('');
      expect(genreSelect.value).toBe('');
      expect(scaleSelect.value).toBe('medium');
    });
  });

  describe('Form data synchronization', () => {
    it('should update form when worldData changes', () => {
      const { rerender } = render(<FoundationsStep />);

      // Update mock data
      (useWorldBuilderSelectors as jest.Mock).mockReturnValue({
        ...mockSelectors,
        worldData: {
          id: 'test',
          foundations: {
            name: 'Test World',
            genre: 'fantasy',
            tone: 'dark',
            setting: 'A dark fantasy world',
            scale: 'large' as const,
          },
        },
      });

      rerender(<FoundationsStep />);

      const nameInput = screen.getByLabelText(/World Name/) as HTMLInputElement;
      const genreSelect = screen.getByLabelText(/Genre/) as HTMLSelectElement;
      const toneSelect = screen.getByLabelText(/Tone/) as HTMLSelectElement;
      const settingTextarea = screen.getByLabelText(/Setting/) as HTMLTextAreaElement;
      const scaleSelect = screen.getByLabelText(/World Scale/) as HTMLSelectElement;

      expect(nameInput.value).toBe('Test World');
      expect(genreSelect.value).toBe('fantasy');
      expect(toneSelect.value).toBe('dark');
      expect(settingTextarea.value).toBe('A dark fantasy world');
      expect(scaleSelect.value).toBe('large');
    });

    it('should handle partial worldData gracefully', () => {
      (useWorldBuilderSelectors as jest.Mock).mockReturnValue({
        ...mockSelectors,
        worldData: {
          id: 'test',
          foundations: {
            name: 'Partial World',
            // Missing other fields
          },
        },
      });

      render(<FoundationsStep />);

      const nameInput = screen.getByLabelText(/World Name/) as HTMLInputElement;
      const genreSelect = screen.getByLabelText(/Genre/) as HTMLSelectElement;

      expect(nameInput.value).toBe('Partial World');
      expect(genreSelect.value).toBe('');
    });
  });

  describe('User interactions', () => {
    it('should update form state and call updateStep on input change', () => {
      render(<FoundationsStep />);

      const nameInput = screen.getByLabelText(/World Name/);
      fireEvent.change(nameInput, { target: { value: 'New World Name' } });

      expect(mockActions.updateStep).toHaveBeenCalledWith('foundations', {
        name: 'New World Name',
        genre: '',
        tone: '',
        setting: '',
        scale: 'medium',
      });
    });

    it('should handle genre selection', () => {
      render(<FoundationsStep />);

      const genreSelect = screen.getByLabelText(/Genre/);
      fireEvent.change(genreSelect, { target: { value: 'sci-fi' } });

      expect(mockActions.updateStep).toHaveBeenCalledWith('foundations', {
        name: '',
        genre: 'sci-fi',
        tone: '',
        setting: '',
        scale: 'medium',
      });
    });

    it('should handle tone selection', () => {
      render(<FoundationsStep />);

      const toneSelect = screen.getByLabelText(/Tone/);
      fireEvent.change(toneSelect, { target: { value: 'light' } });

      expect(mockActions.updateStep).toHaveBeenCalledWith('foundations', {
        name: '',
        genre: '',
        tone: 'light',
        setting: '',
        scale: 'medium',
      });
    });

    it('should handle setting textarea input', () => {
      render(<FoundationsStep />);

      const settingTextarea = screen.getByLabelText(/Setting/);
      fireEvent.change(settingTextarea, { target: { value: 'A beautiful world description' } });

      expect(mockActions.updateStep).toHaveBeenCalledWith('foundations', {
        name: '',
        genre: '',
        tone: '',
        setting: 'A beautiful world description',
        scale: 'medium',
      });
    });

    it('should handle scale selection', () => {
      render(<FoundationsStep />);

      const scaleSelect = screen.getByLabelText(/World Scale/);
      fireEvent.change(scaleSelect, { target: { value: 'small' } });

      expect(mockActions.updateStep).toHaveBeenCalledWith('foundations', {
        name: '',
        genre: '',
        tone: '',
        setting: '',
        scale: 'small',
      });
    });
  });

  describe('Form submission', () => {
    it('should mark step complete when all required fields are filled', () => {
      (useWorldBuilderSelectors as jest.Mock).mockReturnValue({
        ...mockSelectors,
        worldData: {
          id: 'test',
          foundations: {
            name: 'Complete World',
            genre: 'fantasy',
            tone: 'dark',
            setting: 'Complete setting',
            scale: 'medium',
          },
        },
      });

      render(<FoundationsStep />);

      const submitButton = screen.getByRole('button', { name: /Save Foundations/ });
      fireEvent.click(submitButton);

      expect(mockActions.markStepComplete).toHaveBeenCalledWith('foundations');
    });

    it('should not mark step complete when required fields are missing', () => {
      render(<FoundationsStep />);

      const submitButton = screen.getByRole('button', { name: /Save Foundations/ });
      fireEvent.click(submitButton);

      expect(mockActions.markStepComplete).not.toHaveBeenCalled();
    });

    it('should prevent default form submission', () => {
      render(<FoundationsStep />);

      const form = screen.getByRole('form');
      const submitEvent = new Event('submit', { cancelable: true });

      fireEvent(form, submitEvent);

      expect(submitEvent.defaultPrevented).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for all inputs', () => {
      render(<FoundationsStep />);

      expect(screen.getByLabelText(/World Name/)).toHaveAttribute('id', 'world-name');
      expect(screen.getByLabelText(/Genre/)).toHaveAttribute('id', 'genre');
      expect(screen.getByLabelText(/Tone/)).toHaveAttribute('id', 'tone');
      expect(screen.getByLabelText(/Setting/)).toHaveAttribute('id', 'setting');
      expect(screen.getByLabelText(/World Scale/)).toHaveAttribute('id', 'scale');
    });

    it('should have required attribute on required fields', () => {
      render(<FoundationsStep />);

      const nameInput = screen.getByLabelText(/World Name/);
      const genreSelect = screen.getByLabelText(/Genre/);
      const settingTextarea = screen.getByLabelText(/Setting/);

      expect(nameInput).toHaveAttribute('required');
      expect(genreSelect).toHaveAttribute('required');
      expect(settingTextarea).toHaveAttribute('required');
    });

    it('should have proper placeholder text', () => {
      render(<FoundationsStep />);

      expect(screen.getByPlaceholderText('Enter world name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Describe the world\'s setting')).toBeInTheDocument();
    });
  });

  describe('Genre options', () => {
    it('should render all genre options', () => {
      render(<FoundationsStep />);

      const genreSelect = screen.getByLabelText(/Genre/);
      const options = Array.from(genreSelect.querySelectorAll('option')).map(option => ({
        value: option.value,
        text: option.textContent,
      }));

      expect(options).toEqual([
        { value: '', text: 'Select genre' },
        { value: 'fantasy', text: 'Fantasy' },
        { value: 'sci-fi', text: 'Science Fiction' },
        { value: 'historical', text: 'Historical' },
        { value: 'modern', text: 'Modern' },
        { value: 'post-apocalyptic', text: 'Post-Apocalyptic' },
      ]);
    });
  });

  describe('Tone options', () => {
    it('should render all tone options', () => {
      render(<FoundationsStep />);

      const toneSelect = screen.getByLabelText(/Tone/);
      const options = Array.from(toneSelect.querySelectorAll('option')).map(option => ({
        value: option.value,
        text: option.textContent,
      }));

      expect(options).toEqual([
        { value: '', text: 'Select tone' },
        { value: 'dark', text: 'Dark' },
        { value: 'light', text: 'Light' },
        { value: 'neutral', text: 'Neutral' },
        { value: 'humorous', text: 'Humorous' },
      ]);
    });
  });

  describe('Scale options', () => {
    it('should render all scale options', () => {
      render(<FoundationsStep />);

      const scaleSelect = screen.getByLabelText(/World Scale/);
      const options = Array.from(scaleSelect.querySelectorAll('option')).map(option => ({
        value: option.value,
        text: option.textContent,
      }));

      expect(options).toEqual([
        { value: 'small', text: 'Small (village/town)' },
        { value: 'medium', text: 'Medium (region/country)' },
        { value: 'large', text: 'Large (continent/world)' },
      ]);
    });
  });

  describe('Error handling', () => {
    it('should handle invalid step data gracefully', () => {
      (useWorldBuilderSelectors as jest.Mock).mockReturnValue({
        ...mockSelectors,
        worldData: {
          id: 'test',
          foundations: null, // Invalid data
        },
      });

      // Should not crash
      expect(() => render(<FoundationsStep />)).not.toThrow();
    });

    it('should maintain form state during rapid updates', () => {
      render(<FoundationsStep />);

      const nameInput = screen.getByLabelText(/World Name/);

      // Rapid changes
      fireEvent.change(nameInput, { target: { value: 'First' } });
      fireEvent.change(nameInput, { target: { value: 'Second' } });
      fireEvent.change(nameInput, { target: { value: 'Final' } });

      expect(mockActions.updateStep).toHaveBeenCalledTimes(3);
      expect(mockActions.updateStep).toHaveBeenLastCalledWith('foundations', {
        name: 'Final',
        genre: '',
        tone: '',
        setting: '',
        scale: 'medium',
      });
    });
  });
});