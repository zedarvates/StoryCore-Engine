import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WizardProvider, useWizard } from '@/contexts/WizardContext';
import { useWizardNavigation } from '@/hooks/useWizardNavigation';
import {
  saveWizardState,
  loadWizardState,
  clearWizardState,
  isLocalStorageAvailable,
} from '@/utils/wizardStorage';

// ============================================================================
// Test Component
// ============================================================================

interface TestFormData {
  name: string;
  email: string;
  age: number;
}

function TestWizardContent() {
  const { formData, updateFormData, validationErrors } = useWizard<TestFormData>();
  const { currentStep, nextStep, previousStep, canGoNext, canGoPrevious } = useWizardNavigation();

  return (
    <div>
      <div data-testid="current-step">Step {currentStep}</div>
      <div data-testid="form-data">{JSON.stringify(formData)}</div>
      
      {currentStep === 1 && (
        <div>
          <input
            data-testid="name-input"
            value={formData.name || ''}
            onChange={(e) => updateFormData({ name: e.target.value })}
          />
          {validationErrors.name && (
            <span data-testid="name-error">{validationErrors.name[0]}</span>
          )}
        </div>
      )}

      {currentStep === 2 && (
        <div>
          <input
            data-testid="email-input"
            value={formData.email || ''}
            onChange={(e) => updateFormData({ email: e.target.value })}
          />
        </div>
      )}

      <button
        data-testid="previous-button"
        onClick={previousStep}
        disabled={!canGoPrevious}
      >
        Previous
      </button>
      <button
        data-testid="next-button"
        onClick={nextStep}
        disabled={!canGoNext}
      >
        Next
      </button>
    </div>
  );
}

// ============================================================================
// Tests
// ============================================================================

describe('Wizard Infrastructure', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('WizardContext', () => {
    it('should provide wizard state to children', () => {
      const onSubmit = vi.fn();

      render(
        <WizardProvider
          wizardType="world"
          totalSteps={3}
          onSubmit={onSubmit}
          autoSave={false}
        >
          <TestWizardContent />
        </WizardProvider>
      );

      expect(screen.getByTestId('current-step')).toHaveTextContent('Step 1');
    });

    it('should update form data', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(
        <WizardProvider
          wizardType="world"
          totalSteps={3}
          onSubmit={onSubmit}
          autoSave={false}
        >
          <TestWizardContent />
        </WizardProvider>
      );

      const nameInput = screen.getByTestId('name-input');
      await user.type(nameInput, 'John Doe');

      await waitFor(() => {
        const formData = JSON.parse(screen.getByTestId('form-data').textContent || '{}');
        expect(formData.name).toBe('John Doe');
      });
    });

    it('should navigate between steps', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(
        <WizardProvider
          wizardType="world"
          totalSteps={3}
          onSubmit={onSubmit}
          autoSave={false}
        >
          <TestWizardContent />
        </WizardProvider>
      );

      expect(screen.getByTestId('current-step')).toHaveTextContent('Step 1');

      const nextButton = screen.getByTestId('next-button');
      await user.click(nextButton);

      expect(screen.getByTestId('current-step')).toHaveTextContent('Step 2');

      const previousButton = screen.getByTestId('previous-button');
      await user.click(previousButton);

      expect(screen.getByTestId('current-step')).toHaveTextContent('Step 1');
    });

    it('should preserve form data during navigation', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(
        <WizardProvider
          wizardType="world"
          totalSteps={3}
          onSubmit={onSubmit}
          autoSave={false}
        >
          <TestWizardContent />
        </WizardProvider>
      );

      // Enter data on step 1
      const nameInput = screen.getByTestId('name-input');
      await user.type(nameInput, 'John Doe');

      // Navigate to step 2
      const nextButton = screen.getByTestId('next-button');
      await user.click(nextButton);

      // Navigate back to step 1
      const previousButton = screen.getByTestId('previous-button');
      await user.click(previousButton);

      // Data should still be there
      await waitFor(() => {
        const formData = JSON.parse(screen.getByTestId('form-data').textContent || '{}');
        expect(formData.name).toBe('John Doe');
      });
    });
  });

  describe('wizardStorage utilities', () => {
    it('should check localStorage availability', () => {
      expect(isLocalStorageAvailable()).toBe(true);
    });

    it('should save and load wizard state', () => {
      const formData = { name: 'Test', email: 'test@example.com', age: 25 };
      
      const saved = saveWizardState('world', 2, formData);
      expect(saved).toBe(true);

      const loaded = loadWizardState<TestFormData>('world');
      expect(loaded).not.toBeNull();
      expect(loaded?.currentStep).toBe(2);
      expect(loaded?.formData).toEqual(formData);
    });

    it('should clear wizard state', () => {
      const formData = { name: 'Test', email: 'test@example.com', age: 25 };
      
      saveWizardState('world', 2, formData);
      clearWizardState('world');

      const loaded = loadWizardState<TestFormData>('world');
      expect(loaded).toBeNull();
    });

    it('should handle expired state', () => {
      const formData = { name: 'Test', email: 'test@example.com', age: 25 };
      
      // Save with negative expiration (already expired)
      saveWizardState('world', 2, formData, -1);

      const loaded = loadWizardState<TestFormData>('world');
      expect(loaded).toBeNull();
    });

    it('should handle corrupted state', () => {
      // Manually set corrupted data
      localStorage.setItem('wizard-world', 'invalid-json{');

      const loaded = loadWizardState<TestFormData>('world');
      expect(loaded).toBeNull();

      // Should have cleared the corrupted data
      expect(localStorage.getItem('wizard-world')).toBeNull();
    });
  });

  describe('useWizardNavigation', () => {
    it('should provide navigation state', () => {
      const onSubmit = vi.fn();

      render(
        <WizardProvider
          wizardType="world"
          totalSteps={3}
          onSubmit={onSubmit}
          autoSave={false}
        >
          <TestWizardContent />
        </WizardProvider>
      );

      // On first step
      expect(screen.getByTestId('previous-button')).toBeDisabled();
      expect(screen.getByTestId('next-button')).not.toBeDisabled();
    });

    it('should disable navigation at boundaries', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(
        <WizardProvider
          wizardType="world"
          totalSteps={3}
          onSubmit={onSubmit}
          autoSave={false}
        >
          <TestWizardContent />
        </WizardProvider>
      );

      // Navigate to last step
      const nextButton = screen.getByTestId('next-button');
      await user.click(nextButton);
      await user.click(nextButton);

      expect(screen.getByTestId('current-step')).toHaveTextContent('Step 3');
      expect(screen.getByTestId('next-button')).toBeDisabled();
      expect(screen.getByTestId('previous-button')).not.toBeDisabled();
    });
  });
});
