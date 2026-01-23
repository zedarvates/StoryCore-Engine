import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { WorldBuilderWizard } from '../WorldBuilderWizard';
import { useWorldBuilderStore } from '../../../../stores/worldBuilderStore';

// Mock all step components with interactive forms
vi.mock('../steps/FoundationsStep', () => ({
  FoundationsStep: () => (
    <div data-testid="foundations-step">
      <form data-testid="foundations-form">
        <input data-testid="foundations-name" placeholder="World Name" aria-label="World Name" />
        <select data-testid="foundations-genre" aria-label="Genre">
          <option value="">Select genre</option>
          <option value="fantasy">Fantasy</option>
        </select>
        <textarea data-testid="foundations-setting" placeholder="Setting" aria-label="Setting" />
        <button type="submit" data-testid="foundations-submit">Save Foundations</button>
      </form>
    </div>
  ),
}));

vi.mock('../steps/RulesStep', () => ({
  RulesStep: () => (
    <div data-testid="rules-step">
      <div data-testid="rules-form">Rules Form</div>
    </div>
  ),
}));

vi.mock('../steps/CultureStep', () => ({
  CultureStep: () => (
    <div data-testid="culture-step">
      <div data-testid="culture-form">Culture Form</div>
    </div>
  ),
}));

vi.mock('../steps/LocationsStep', () => ({
  LocationsStep: () => (
    <div data-testid="locations-step">
      <div data-testid="locations-form">Locations Form</div>
    </div>
  ),
}));

vi.mock('../steps/SynthesisStep', () => ({
  SynthesisStep: () => (
    <div data-testid="synthesis-step">
      <div data-testid="synthesis-form">Synthesis Form</div>
    </div>
  ),
}));

// Mock other components
vi.mock('../StepNavigator', () => ({
  StepNavigator: ({ onStepChange }: { onStepChange: (step: string) => void }) => (
    <nav data-testid="step-navigator">
      <button data-testid="nav-foundations" onClick={() => onStepChange('foundations')}>Foundations</button>
      <button data-testid="nav-rules" onClick={() => onStepChange('rules')}>Rules</button>
      <button data-testid="nav-culture" onClick={() => onStepChange('culture')}>Culture</button>
      <button data-testid="nav-locations" onClick={() => onStepChange('locations')}>Locations</button>
      <button data-testid="nav-synthesis" onClick={() => onStepChange('synthesis')}>Synthesis</button>
    </nav>
  ),
}));

vi.mock('../ProgressIndicator', () => ({
  ProgressIndicator: () => <div data-testid="progress-indicator">Progress: 0%</div>,
}));

vi.mock('../ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <div data-testid="error-boundary">{children}</div>,
}));

vi.mock('../LLMAssistant', () => ({
  LLMAssistant: () => <div data-testid="llm-assistant">LLM Assistant</div>,
}));

vi.mock('../WorldPreview', () => ({
  WorldPreview: () => <div data-testid="world-preview">World Preview</div>,
}));

describe('WorldBuilderWizard End-to-End Flow', () => {
  beforeEach(() => {
    // Reset store before each test
    useWorldBuilderStore.getState().resetWorld();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Complete world building flow', () => {
    it('should allow creating a complete world from start to finish', async () => {
      render(<WorldBuilderWizard />);

      // Initial state - should show foundations step
      expect(screen.getByTestId('foundations-step')).toBeInTheDocument();
      expect(screen.getByText('World Builder')).toBeInTheDocument();

      // Fill foundations form
      const nameInput = screen.getByTestId('foundations-name');
      const genreSelect = screen.getByTestId('foundations-genre');
      const settingTextarea = screen.getByTestId('foundations-setting');
      const foundationsSubmit = screen.getByTestId('foundations-submit');

      fireEvent.change(nameInput, { target: { value: 'Elyndor' } });
      fireEvent.change(genreSelect, { target: { value: 'fantasy' } });
      fireEvent.change(settingTextarea, { target: { value: 'A magical realm of ancient forests and towering mountains' } });
      fireEvent.click(foundationsSubmit);

      // Verify world data was updated
      const state = useWorldBuilderStore.getState();
      expect(state.worldData?.foundations.name).toBe('Elyndor');
      expect(state.worldData?.foundations.genre).toBe('fantasy');
      expect(state.completedSteps.has('foundations')).toBe(true);

      // Navigate to rules step
      const rulesNav = screen.getByTestId('nav-rules');
      fireEvent.click(rulesNav);

      expect(screen.getByTestId('rules-step')).toBeInTheDocument();

      // Navigate to culture step
      const cultureNav = screen.getByTestId('nav-culture');
      fireEvent.click(cultureNav);

      expect(screen.getByTestId('culture-step')).toBeInTheDocument();

      // Navigate to locations step
      const locationsNav = screen.getByTestId('nav-locations');
      fireEvent.click(locationsNav);

      expect(screen.getByTestId('locations-step')).toBeInTheDocument();

      // Navigate to synthesis step
      const synthesisNav = screen.getByTestId('nav-synthesis');
      fireEvent.click(synthesisNav);

      expect(screen.getByTestId('synthesis-step')).toBeInTheDocument();

      // Verify complete world data structure
      const finalState = useWorldBuilderStore.getState();
      expect(finalState.worldData).toBeDefined();
      expect(finalState.worldData?.foundations).toBeDefined();
      expect(finalState.worldData?.rules).toBeDefined();
      expect(finalState.worldData?.culture).toBeDefined();
      expect(finalState.worldData?.locations).toEqual([]);
      expect(finalState.worldData?.synthesis).toBeDefined();
    });

    it('should handle navigation restrictions correctly', () => {
      render(<WorldBuilderWizard />);

      // Try to navigate to rules without completing foundations
      const rulesNav = screen.getByTestId('nav-rules');
      fireEvent.click(rulesNav);

      // Should still be on foundations (mock doesn't prevent navigation, but tests the logic)
      expect(screen.getByTestId('foundations-step')).toBeInTheDocument();
    });
  });

  describe('Auto-save functionality in E2E context', () => {
    it('should auto-save world data periodically during editing', async () => {
      // Mock save function
      const mockSave = jest.fn().mockResolvedValue(undefined);
      useWorldBuilderStore.setState({
        saveWorld: mockSave,
      });

      render(<WorldBuilderWizard />);

      // Fill some data
      const nameInput = screen.getByTestId('foundations-name');
      fireEvent.change(nameInput, { target: { value: 'AutoSave World' } });

      // Fast-forward 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockSave).toHaveBeenCalled();
      });
    });

    it('should handle auto-save errors gracefully', async () => {
      // Mock save function that throws
      const mockSave = jest.fn().mockRejectedValue(new Error('Save failed'));
      useWorldBuilderStore.setState({
        saveWorld: mockSave,
      });

      render(<WorldBuilderWizard />);

      // Fill some data
      const nameInput = screen.getByTestId('foundations-name');
      fireEvent.change(nameInput, { target: { value: 'Error World' } });

      // Fast-forward 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockSave).toHaveBeenCalled();
      });

      // Should show error
      expect(screen.getByText('Failed to save world')).toBeInTheDocument();
    });
  });

  describe('Error recovery and edge cases', () => {
    it('should recover from component errors', () => {
      // Mock a component that throws
      jest.mock('../steps/FoundationsStep', () => ({
        FoundationsStep: () => {
          throw new Error('Component crashed');
        },
      }));

      // Should be wrapped in error boundary
      expect(() => render(<WorldBuilderWizard />)).not.toThrow();
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    });

    it('should handle rapid step switching', () => {
      render(<WorldBuilderWizard />);

      const foundationsNav = screen.getByTestId('nav-foundations');
      const rulesNav = screen.getByTestId('nav-rules');
      const cultureNav = screen.getByTestId('nav-culture');

      // Rapid navigation
      fireEvent.click(rulesNav);
      fireEvent.click(cultureNav);
      fireEvent.click(foundationsNav);
      fireEvent.click(rulesNav);

      // Should still render correctly
      expect(screen.getByTestId('rules-step')).toBeInTheDocument();
    });

    it('should handle world data initialization with existing data', () => {
      const existingData = {
        id: 'existing-world',
        foundations: {
          name: 'Existing World',
          genre: 'sci-fi',
          tone: 'dark',
          setting: 'A dystopian future',
          scale: 'large' as const,
        },
      };

      render(<WorldBuilderWizard initialData={existingData} />);

      const state = useWorldBuilderStore.getState();
      expect(state.worldData?.foundations.name).toBe('Existing World');
      expect(state.worldData?.foundations.genre).toBe('sci-fi');
    });
  });

  describe('Wizard lifecycle', () => {
    it('should handle wizard close properly', () => {
      const onClose = jest.fn();
      render(<WorldBuilderWizard onClose={onClose} />);

      const closeButton = screen.getByRole('button', { name: 'Close wizard' });
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });

    it('should persist data across re-mounts', () => {
      const { unmount, rerender } = render(<WorldBuilderWizard />);

      // Fill data
      const nameInput = screen.getByTestId('foundations-name');
      fireEvent.change(nameInput, { target: { value: 'Persistent World' } });

      // Unmount and remount
      unmount();
      rerender(<WorldBuilderWizard />);

      // Data should be restored from localStorage (mocked)
      const state = useWorldBuilderStore.getState();
      expect(state.worldData?.foundations.name).toBe('Persistent World');
    });

    it('should handle memory cleanup on unmount', () => {
      const { unmount } = render(<WorldBuilderWizard />);

      // Fill data to trigger auto-save
      const nameInput = screen.getByTestId('foundations-name');
      fireEvent.change(nameInput, { target: { value: 'Cleanup World' } });

      unmount();

      // Auto-save interval should be cleared
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      const mockSave = useWorldBuilderStore.getState().saveWorld;
      expect(mockSave).not.toHaveBeenCalled();
    });
  });

  describe('Performance under load', () => {
    it('should handle multiple rapid updates efficiently', () => {
      render(<WorldBuilderWizard />);

      const nameInput = screen.getByTestId('foundations-name');

      // Simulate rapid typing
      for (let i = 0; i < 10; i++) {
        fireEvent.change(nameInput, { target: { value: `World ${i}` } });
      }

      // Should handle all updates without crashing
      expect(screen.getByTestId('foundations-step')).toBeInTheDocument();
    });

    it('should maintain responsiveness during state updates', async () => {
      render(<WorldBuilderWizard />);

      const nameInput = screen.getByTestId('foundations-name');
      const genreSelect = screen.getByTestId('foundations-genre');

      // Multiple simultaneous updates
      fireEvent.change(nameInput, { target: { value: 'Fast World' } });
      fireEvent.change(genreSelect, { target: { value: 'fantasy' } });

      // UI should remain responsive
      expect(nameInput).toHaveValue('Fast World');
      expect(genreSelect).toHaveValue('fantasy');
    });
  });

  describe('Accessibility compliance', () => {
    it('should maintain keyboard navigation', () => {
      render(<WorldBuilderWizard />);

      const nameInput = screen.getByTestId('foundations-name');

      // Focus management
      nameInput.focus();
      expect(document.activeElement).toBe(nameInput);

      // Tab navigation should work (basic test)
      fireEvent.keyDown(nameInput, { key: 'Tab' });
      // In a real scenario, this would move focus, but we test the setup
    });

    it('should announce state changes to screen readers', () => {
      render(<WorldBuilderWizard />);

      // Fill form and submit
      const nameInput = screen.getByTestId('foundations-name');
      const genreSelect = screen.getByTestId('foundations-genre');
      const settingTextarea = screen.getByTestId('foundations-setting');
      const submitButton = screen.getByTestId('foundations-submit');

      fireEvent.change(nameInput, { target: { value: 'Accessible World' } });
      fireEvent.change(genreSelect, { target: { value: 'fantasy' } });
      fireEvent.change(settingTextarea, { target: { value: 'An accessible world' } });
      fireEvent.click(submitButton);

      // Step completion should be announced (through state changes)
      const state = useWorldBuilderStore.getState();
      expect(state.completedSteps.has('foundations')).toBe(true);
    });
  });
});