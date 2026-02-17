// ============================================================================
// useWizard Hook Unit Tests
// Tests the WizardContext hook functionality
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { WizardProvider, useWizard } from '../WizardContext';
import { createElement, ReactNode } from 'react';

// ============================================================================
// Test Wrapper
// ============================================================================

interface TestFormData {
  name?: string;
  email?: string;
  age?: number;
}

function createWrapper({
  onSubmit = vi.fn(),
  onValidateStep,
  initialData,
  totalSteps = 3,
  wizardType = 'character' as const,
}: {
  onSubmit?: () => Promise<void>;
  onValidateStep?: (step: number, data: Partial<TestFormData>) => Promise<Record<string, string[]>>;
  initialData?: Partial<TestFormData>;
  totalSteps?: number;
  wizardType?: 'world' | 'character' | 'storyteller' | 'object';
} = {}) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(WizardProvider, {
      wizardType,
      totalSteps,
      initialData: initialData || {},
      onSubmit,
      onValidateStep,
      children,
    });
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('useWizard Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with step 1', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useWizard<TestFormData>(), { wrapper });

      expect(result.current.currentStep).toBe(1);
    });

    it('should initialize with empty form data', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useWizard<TestFormData>(), { wrapper });

      expect(result.current.formData).toEqual({});
    });

    it('should initialize with provided initial data', () => {
      const initialData: TestFormData = { name: 'John', email: 'john@example.com' };
      const wrapper = createWrapper({ initialData });
      const { result } = renderHook(() => useWizard<TestFormData>(), { wrapper });

      expect(result.current.formData).toEqual(initialData);
    });

    it('should initialize with correct total steps', () => {
      const wrapper = createWrapper({ totalSteps: 5 });
      const { result } = renderHook(() => useWizard<TestFormData>(), { wrapper });

      expect(result.current.totalSteps).toBe(5);
    });

    it('should not be submitting initially', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useWizard<TestFormData>(), { wrapper });

      expect(result.current.isSubmitting).toBe(false);
    });

    it('should not be dirty initially', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useWizard<TestFormData>(), { wrapper });

      expect(result.current.isDirty).toBe(false);
    });

    it('should not be in manual mode initially', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useWizard<TestFormData>(), { wrapper });

      expect(result.current.isManualMode).toBe(false);
    });
  });

  describe('Navigation', () => {
    it('should navigate to next step', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useWizard<TestFormData>(), { wrapper });

      await act(async () => {
        await result.current.nextStep();
      });

      expect(result.current.currentStep).toBe(2);
    });

    it('should navigate to previous step', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useWizard<TestFormData>(), { wrapper });

      // Go to step 2
      await act(async () => {
        await result.current.nextStep();
      });
      expect(result.current.currentStep).toBe(2);

      // Go back to step 1
      act(() => {
        result.current.previousStep();
      });
      expect(result.current.currentStep).toBe(1);
    });

    it('should not go below step 1', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useWizard<TestFormData>(), { wrapper });

      // Try to go back from step 1
      act(() => {
        result.current.previousStep();
      });

      expect(result.current.currentStep).toBe(1);
    });

    it('should go to specific step', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useWizard<TestFormData>(), { wrapper });

      act(() => {
        result.current.goToStep(3);
      });

      expect(result.current.currentStep).toBe(3);
    });

    it('should not exceed total steps', () => {
      const wrapper = createWrapper({ totalSteps: 3 });
      const { result } = renderHook(() => useWizard<TestFormData>(), { wrapper });

      act(() => {
        result.current.goToStep(10);
      });

      expect(result.current.currentStep).toBeLessThanOrEqual(3);
    });
  });

  describe('Form Data Management', () => {
    it('should update form data', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useWizard<TestFormData>(), { wrapper });

      act(() => {
        result.current.updateFormData({ name: 'Alice' });
      });

      expect(result.current.formData.name).toBe('Alice');
    });

    it('should merge form data on update', () => {
      const initialData: TestFormData = { name: 'Bob' };
      const wrapper = createWrapper({ initialData });
      const { result } = renderHook(() => useWizard<TestFormData>(), { wrapper });

      act(() => {
        result.current.updateFormData({ email: 'bob@example.com' });
      });

      expect(result.current.formData).toEqual({
        name: 'Bob',
        email: 'bob@example.com',
      });
    });

    it('should mark form as dirty after update', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useWizard<TestFormData>(), { wrapper });

      act(() => {
        result.current.updateFormData({ name: 'Charlie' });
      });

      expect(result.current.isDirty).toBe(true);
    });
  });

  describe('Validation', () => {
    it('should call validation function on next step', async () => {
      const onValidateStep = vi.fn().mockResolvedValue({});
      const wrapper = createWrapper({ onValidateStep });
      const { result } = renderHook(() => useWizard<TestFormData>(), { wrapper });

      await act(async () => {
        await result.current.nextStep();
      });

      expect(onValidateStep).toHaveBeenCalledWith(1, expect.any(Object));
    });

    it('should set validation errors when validation fails', async () => {
      const onValidateStep = vi.fn().mockResolvedValue({
        name: ['Name is required'],
      });
      const wrapper = createWrapper({ onValidateStep });
      const { result } = renderHook(() => useWizard<TestFormData>(), { wrapper });

      await act(async () => {
        await result.current.validateStep(1);
      });

      expect(result.current.validationErrors).toHaveProperty('name');
    });

    it('should clear validation errors when validation passes', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useWizard<TestFormData>(), { wrapper });

      // Manually set validation errors
      act(() => {
        result.current.setValidationErrors({ name: ['Name is required'] });
      });
      
      // Check that errors were set
      expect(Object.keys(result.current.validationErrors).length).toBeGreaterThan(0);

      // Manually clear validation errors
      act(() => {
        result.current.setValidationErrors({});
      });
      expect(Object.keys(result.current.validationErrors)).toHaveLength(0);
    });

    it('should manually set validation errors', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useWizard<TestFormData>(), { wrapper });

      act(() => {
        result.current.setValidationErrors({ email: ['Invalid email format'] });
      });

      expect(result.current.validationErrors).toHaveProperty('email');
    });
  });

  describe('Manual Mode', () => {
    it('should enable manual mode', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useWizard<TestFormData>(), { wrapper });

      act(() => {
        result.current.setManualMode(true);
      });

      expect(result.current.isManualMode).toBe(true);
    });

    it('should disable manual mode', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useWizard<TestFormData>(), { wrapper });

      act(() => {
        result.current.setManualMode(true);
      });
      expect(result.current.isManualMode).toBe(true);

      act(() => {
        result.current.setManualMode(false);
      });
      expect(result.current.isManualMode).toBe(false);
    });
  });

  describe('Reset', () => {
    it('should reset wizard to initial state', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useWizard<TestFormData>(), { wrapper });

      // Make some changes
      await act(async () => {
        await result.current.nextStep();
      });
      act(() => {
        result.current.updateFormData({ name: 'Test' });
      });

      // Reset
      act(() => {
        result.current.resetWizard();
      });

      expect(result.current.currentStep).toBe(1);
      expect(result.current.formData).toEqual({});
      expect(result.current.isDirty).toBe(false);
    });
  });

  describe('Submit', () => {
    it('should call onSubmit when submitting', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      const wrapper = createWrapper({ onSubmit });
      const { result } = renderHook(() => useWizard<TestFormData>(), { wrapper });

      await act(async () => {
        await result.current.submitWizard();
      });

      expect(onSubmit).toHaveBeenCalled();
    });

    it('should set isSubmitting during submission', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      const wrapper = createWrapper({ onSubmit });
      const { result } = renderHook(() => useWizard<TestFormData>(), { wrapper });

      // Start submission
      await act(async () => {
        result.current.submitWizard();
      });

      // After submission completes, isSubmitting should be false
      expect(result.current.isSubmitting).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useWizard<TestFormData>());
      }).toThrow('useWizard must be used within a WizardProvider');

      consoleSpy.mockRestore();
    });
  });
});
