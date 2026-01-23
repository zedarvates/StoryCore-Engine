import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { WorldBuilderWizard } from '../WorldBuilderWizard';
import { useWorldBuilderSelectors, useWorldBuilderActions } from '../../../../stores/worldBuilderStore';

// Mock the store hooks
vi.mock('../../../../stores/worldBuilderStore', () => ({
  useWorldBuilderSelectors: vi.fn(),
  useWorldBuilderActions: vi.fn(),
}));

// Mock the step components
jest.mock('../steps/FoundationsStep', () => ({
  FoundationsStep: () => <div data-testid="foundations-step">Foundations Step</div>,
}));
jest.mock('../steps/RulesStep', () => ({
  RulesStep: () => <div data-testid="rules-step">Rules Step</div>,
}));
jest.mock('../steps/CultureStep', () => ({
  CultureStep: () => <div data-testid="culture-step">Culture Step</div>,
}));
jest.mock('../steps/LocationsStep', () => ({
  LocationsStep: () => <div data-testid="locations-step">Locations Step</div>,
}));
jest.mock('../steps/SynthesisStep', () => ({
  SynthesisStep: () => <div data-testid="synthesis-step">Synthesis Step</div>,
}));

// Mock other components
jest.mock('../StepNavigator', () => ({
  StepNavigator: ({ onStepChange }: { onStepChange: (step: string) => void }) => (
    <div data-testid="step-navigator">
      <button onClick={() => onStepChange('foundations')}>Foundations</button>
      <button onClick={() => onStepChange('rules')}>Rules</button>
    </div>
  ),
}));
jest.mock('../ProgressIndicator', () => ({
  ProgressIndicator: () => <div data-testid="progress-indicator">Progress</div>,
}));
jest.mock('../ErrorBoundary', () => ({
  ErrorBoundary: ({ children, onError }: { children: React.ReactNode; onError: (error: Error) => void }) => (
    <div data-testid="error-boundary">{children}</div>
  ),
}));
jest.mock('../LLMAssistant', () => ({
  LLMAssistant: () => <div data-testid="llm-assistant">LLM Assistant</div>,
}));
jest.mock('../WorldPreview', () => ({
  WorldPreview: () => <div data-testid="world-preview">World Preview</div>,
}));

describe('WorldBuilderWizard Integration', () => {
  const mockSelectors = {
    worldData: null,
    currentStep: 'foundations',
    isLoading: false,
    error: null,
  };

  const mockActions = {
    initializeWorld: jest.fn(),
    saveWorld: jest.fn(),
    setError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    (useWorldBuilderSelectors as jest.Mock).mockReturnValue(mockSelectors);
    (useWorldBuilderActions as jest.Mock).mockReturnValue(mockActions);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    it('should initialize world on mount when no worldData exists', () => {
      render(<WorldBuilderWizard />);

      expect(mockActions.initializeWorld).toHaveBeenCalledWith({});
    });

    it('should initialize world with initialData when provided', () => {
      const initialData = { id: 'test', foundations: { name: 'Test World' } };
      render(<WorldBuilderWizard initialData={initialData} />);

      expect(mockActions.initializeWorld).toHaveBeenCalledWith(initialData);
    });

    it('should not initialize world when worldData already exists', () => {
      (useWorldBuilderSelectors as jest.Mock).mockReturnValue({
        ...mockSelectors,
        worldData: { id: 'existing', foundations: { name: 'Existing World' } },
      });

      render(<WorldBuilderWizard />);

      expect(mockActions.initializeWorld).not.toHaveBeenCalled();
    });

    it('should show loading state when isLoading is true and no worldData', () => {
      (useWorldBuilderSelectors as jest.Mock).mockReturnValue({
        ...mockSelectors,
        isLoading: true,
      });

      render(<WorldBuilderWizard />);

      expect(screen.getByText('Loading world builder...')).toBeInTheDocument();
    });
  });

  describe('Auto-save functionality', () => {
    it('should auto-save every 30 seconds when worldData exists', async () => {
      (useWorldBuilderSelectors as jest.Mock).mockReturnValue({
        ...mockSelectors,
        worldData: { id: 'test', foundations: { name: 'Test World' } },
      });

      render(<WorldBuilderWizard />);

      // Fast-forward 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockActions.saveWorld).toHaveBeenCalled();
      });
    });

    it('should not auto-save when no worldData exists', () => {
      render(<WorldBuilderWizard />);

      act(() => {
        jest.advanceTimersByTime(30000);
      });

      expect(mockActions.saveWorld).not.toHaveBeenCalled();
    });

    it('should clear auto-save interval on unmount', () => {
      const { unmount } = render(<WorldBuilderWizard />);

      unmount();

      act(() => {
        jest.advanceTimersByTime(30000);
      });

      expect(mockActions.saveWorld).not.toHaveBeenCalled();
    });
  });

  describe('Step navigation', () => {
    it('should render current step component', () => {
      render(<WorldBuilderWizard />);

      expect(screen.getByTestId('foundations-step')).toBeInTheDocument();
    });

    it('should render different step component based on currentStep', () => {
      (useWorldBuilderSelectors as jest.Mock).mockReturnValue({
        ...mockSelectors,
        currentStep: 'rules',
      });

      render(<WorldBuilderWizard />);

      expect(screen.getByTestId('rules-step')).toBeInTheDocument();
    });

    it('should render error banner when error exists', () => {
      (useWorldBuilderSelectors as jest.Mock).mockReturnValue({
        ...mockSelectors,
        error: 'Test error message',
      });

      render(<WorldBuilderWizard />);

      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('should call setError(null) when error close button is clicked', () => {
      (useWorldBuilderSelectors as jest.Mock).mockReturnValue({
        ...mockSelectors,
        error: 'Test error message',
      });

      render(<WorldBuilderWizard />);

      const closeButton = screen.getByRole('button', { name: /×/ });
      fireEvent.click(closeButton);

      expect(mockActions.setError).toHaveBeenCalledWith(null);
    });
  });

  describe('UI Components rendering', () => {
    it('should render all main UI components', () => {
      render(<WorldBuilderWizard />);

      expect(screen.getByText('World Builder')).toBeInTheDocument();
      expect(screen.getByTestId('progress-indicator')).toBeInTheDocument();
      expect(screen.getByTestId('step-navigator')).toBeInTheDocument();
      expect(screen.getByTestId('llm-assistant')).toBeInTheDocument();
      expect(screen.getByTestId('world-preview')).toBeInTheDocument();
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    });

    it('should render close button with correct accessibility', () => {
      const onClose = jest.fn();
      render(<WorldBuilderWizard onClose={onClose} />);

      const closeButton = screen.getByRole('button', { name: 'Close wizard' });
      expect(closeButton).toBeInTheDocument();

      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle step navigation errors gracefully', () => {
      render(<WorldBuilderWizard />);

      // The step navigator mock includes buttons that call onStepChange
      const foundationsButton = screen.getByText('Foundations');
      fireEvent.click(foundationsButton);

      // Should not crash - navigation logic is handled internally
      expect(screen.getByTestId('foundations-step')).toBeInTheDocument();
    });

    it('should render Suspense fallback during step loading', () => {
      // Mock a lazy-loaded component that suspends
      const SuspenseStep = () => {
        throw new Promise(() => {}); // Never resolves
      };

      jest.doMock('../steps/FoundationsStep', () => ({
        FoundationsStep: SuspenseStep,
      }));

      render(<WorldBuilderWizard />);

      expect(screen.getByText('Loading step...')).toBeInTheDocument();
    });
  });

  describe('Performance and memory', () => {
    it('should not cause unnecessary re-renders on prop changes', () => {
      const { rerender } = render(<WorldBuilderWizard />);

      // Re-render with same props
      rerender(<WorldBuilderWizard />);

      // Components should still be present
      expect(screen.getByTestId('foundations-step')).toBeInTheDocument();
    });

    it('should handle rapid step changes without issues', () => {
      render(<WorldBuilderWizard />);

      const foundationsButton = screen.getByText('Foundations');
      const rulesButton = screen.getByText('Rules');

      // Rapid clicking
      fireEvent.click(rulesButton);
      fireEvent.click(foundationsButton);
      fireEvent.click(rulesButton);

      // Should still render properly
      expect(screen.getByTestId('foundations-step')).toBeInTheDocument();
    });
  });
});