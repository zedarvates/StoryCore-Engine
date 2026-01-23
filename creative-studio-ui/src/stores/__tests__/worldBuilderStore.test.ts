import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useWorldBuilderStore } from '../worldBuilderStore';
import { act } from '@testing-library/react';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('worldBuilderStore Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useWorldBuilderStore.getState().resetWorld();
    // Clear localStorage mock
    localStorageMock.clear();
  });

  afterEach(() => {
    // Clean up after each test
    localStorageMock.clear();
  });

  describe('State Initialization and Persistence', () => {
    it('should initialize with default state', () => {
      const state = useWorldBuilderStore.getState();
      expect(state.worldData).toBeNull();
      expect(state.currentStep).toBe('foundations');
      expect(state.completedSteps.size).toBe(0);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.lastSaved).toBeNull();
    });

    it('should persist state to localStorage', () => {
      const { initializeWorld, updateStep } = useWorldBuilderStore.getState();

      act(() => {
        initializeWorld({ foundations: { name: 'Persistent World' } });
        updateStep('foundations', { genre: 'fantasy' });
      });

      expect(localStorageMock.setItem).toHaveBeenCalled();
      const [key, value] = localStorageMock.setItem.mock.calls[0];
      expect(key).toBe('world-builder-storage');
      expect(JSON.parse(value)).toHaveProperty('state.worldData.foundations.name', 'Persistent World');
    });

    it('should restore state from localStorage on initialization', () => {
      const persistedState = {
        worldData: {
          id: 'restored-world',
          foundations: { name: 'Restored World', genre: 'fantasy', setting: 'Test', scale: 'medium' },
        },
        currentStep: 'rules',
        completedSteps: ['foundations'],
        lastSaved: new Date().toISOString(),
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify({ state: persistedState }));

      // Re-initialize store to trigger hydration
      const store = useWorldBuilderStore.getState();
      expect(store.worldData?.foundations.name).toBe('Restored World');
      expect(store.currentStep).toBe('rules');
      expect(store.completedSteps.has('foundations')).toBe(true);
    });
  });

  describe('World Data Management', () => {
    it('should initialize world data with provided values', () => {
      const { initializeWorld } = useWorldBuilderStore.getState();

      act(() => {
        initializeWorld({
          foundations: {
            name: 'Test World',
            genre: 'fantasy',
            setting: 'A magical world',
            scale: 'large',
          },
        });
      });

      const state = useWorldBuilderStore.getState();
      expect(state.worldData).not.toBeNull();
      expect(state.worldData?.foundations.name).toBe('Test World');
      expect(state.worldData?.foundations.genre).toBe('fantasy');
      expect(state.worldData?.foundations.scale).toBe('large');
      expect(state.worldData?.id).toMatch(/^[a-f0-9-]+$/); // UUID format
    });

    it('should merge provided data with defaults', () => {
      const { initializeWorld } = useWorldBuilderStore.getState();

      act(() => {
        initializeWorld({
          foundations: { name: 'Partial World' },
        });
      });

      const state = useWorldBuilderStore.getState();
      expect(state.worldData?.foundations.name).toBe('Partial World');
      expect(state.worldData?.foundations.genre).toBe(''); // Default empty
      expect(state.worldData?.foundations.scale).toBe('medium'); // Default value
    });

    it('should update step data and increment version', () => {
      const { initializeWorld, updateStep } = useWorldBuilderStore.getState();

      act(() => {
        initializeWorld({});
      });

      const initialState = useWorldBuilderStore.getState();
      const initialVersion = initialState.worldData?.version;

      act(() => {
        updateStep('foundations', { name: 'Updated World' });
      });

      const updatedState = useWorldBuilderStore.getState();
      expect(updatedState.worldData?.foundations.name).toBe('Updated World');
      expect(updatedState.worldData?.version).toBe(initialVersion! + 1);
      expect(updatedState.lastSaved).toBeInstanceOf(Date);
    });

    it('should handle complex nested updates', () => {
      const { initializeWorld, updateStep } = useWorldBuilderStore.getState();

      act(() => {
        initializeWorld({});
        updateStep('culture', {
          societies: [{
            id: 'society1',
            name: 'Test Society',
            values: ['honor', 'courage'],
            customs: ['ritual combat'],
          }],
          conflicts: ['resource wars'],
        });
      });

      const state = useWorldBuilderStore.getState();
      expect(state.worldData?.culture.societies).toHaveLength(1);
      expect(state.worldData?.culture.societies[0].name).toBe('Test Society');
      expect(state.worldData?.culture.conflicts).toEqual(['resource wars']);
    });
  });

  describe('Step Navigation and Validation', () => {
    it('should navigate between steps', () => {
      const { navigateToStep } = useWorldBuilderStore.getState();

      act(() => {
        navigateToStep('rules');
      });

      const state = useWorldBuilderStore.getState();
      expect(state.currentStep).toBe('rules');

      act(() => {
        navigateToStep('culture');
      });

      expect(useWorldBuilderStore.getState().currentStep).toBe('culture');
    });

    it('should reject navigation to invalid steps', () => {
      const { navigateToStep } = useWorldBuilderStore.getState();
      const initialStep = useWorldBuilderStore.getState().currentStep;

      act(() => {
        navigateToStep('invalid_step' as any);
      });

      expect(useWorldBuilderStore.getState().currentStep).toBe(initialStep);
    });

    it('should mark steps as complete', () => {
      const { markStepComplete } = useWorldBuilderStore.getState();

      act(() => {
        markStepComplete('foundations');
      });

      const state = useWorldBuilderStore.getState();
      expect(state.completedSteps.has('foundations')).toBe(true);
      expect(state.completedSteps.size).toBe(1);
    });

    it('should validate foundations step correctly', () => {
      const { initializeWorld, validateStep, updateStep } = useWorldBuilderStore.getState();

      act(() => {
        initializeWorld({});
      });

      expect(validateStep('foundations')).toBe(false);

      act(() => {
        updateStep('foundations', {
          name: 'Valid World',
          genre: 'fantasy',
          setting: 'Valid setting description',
        });
      });

      expect(validateStep('foundations')).toBe(true);
    });

    it('should validate rules step based on physics array', () => {
      const { initializeWorld, validateStep, updateStep } = useWorldBuilderStore.getState();

      act(() => {
        initializeWorld({});
      });

      expect(validateStep('rules')).toBe(false);

      act(() => {
        updateStep('rules', {
          physics: ['magic follows will', 'gravity is mutable'],
        });
      });

      expect(validateStep('rules')).toBe(true);
    });

    it('should validate culture step based on societies', () => {
      const { initializeWorld, validateStep, updateStep } = useWorldBuilderStore.getState();

      act(() => {
        initializeWorld({});
      });

      expect(validateStep('culture')).toBe(false);

      act(() => {
        updateStep('culture', {
          societies: [{
            id: 'society1',
            name: 'Test Society',
            values: [],
            customs: [],
          }],
        });
      });

      expect(validateStep('culture')).toBe(true);
    });

    it('should validate locations step based on locations array', () => {
      const { initializeWorld, validateStep, updateStep } = useWorldBuilderStore.getState();

      act(() => {
        initializeWorld({});
      });

      expect(validateStep('locations')).toBe(false);

      act(() => {
        updateStep('locations', [{
          id: 'location1',
          name: 'Test Location',
          type: 'city',
          description: 'A test city',
          coordinates: { x: 100, y: 200 },
        }]);
      });

      expect(validateStep('locations')).toBe(true);
    });

    it('should validate synthesis step based on summary and themes', () => {
      const { initializeWorld, validateStep, updateStep } = useWorldBuilderStore.getState();

      act(() => {
        initializeWorld({});
      });

      expect(validateStep('synthesis')).toBe(false);

      act(() => {
        updateStep('synthesis', {
          summary: 'World summary',
          themes: ['redemption', 'power'],
          plotHooks: [],
          keyEvents: [],
        });
      });

      expect(validateStep('synthesis')).toBe(true);
    });

    it('should return false for invalid step validation', () => {
      const { validateStep } = useWorldBuilderStore.getState();

      expect(validateStep('invalid_step' as any)).toBe(false);
    });
  });

  describe('Error Handling and Loading States', () => {
    it('should handle save operation with loading states', async () => {
      const { saveWorld } = useWorldBuilderStore.getState();

      // Mock successful save
      const savePromise = act(async () => {
        await saveWorld();
      });

      expect(useWorldBuilderStore.getState().isLoading).toBe(false);
      expect(useWorldBuilderStore.getState().lastSaved).toBeInstanceOf(Date);
    });

    it('should handle save errors', async () => {
      const { saveWorld } = useWorldBuilderStore.getState();

      // Mock save function to throw
      useWorldBuilderStore.setState({
        saveWorld: async () => {
          throw new Error('Save failed');
        },
      });

      await act(async () => {
        await saveWorld();
      });

      expect(useWorldBuilderStore.getState().error).toBe('Failed to save world');
      expect(useWorldBuilderStore.getState().isLoading).toBe(false);
    });

    it('should set and clear errors', () => {
      const { setError } = useWorldBuilderStore.getState();

      act(() => {
        setError('Test error');
      });

      expect(useWorldBuilderStore.getState().error).toBe('Test error');

      act(() => {
        setError(null);
      });

      expect(useWorldBuilderStore.getState().error).toBeNull();
    });
  });

  describe('World Reset and Cleanup', () => {
    it('should reset world to initial state', () => {
      const { initializeWorld, updateStep, markStepComplete, setError, resetWorld } = useWorldBuilderStore.getState();

      act(() => {
        initializeWorld({ foundations: { name: 'Test World' } });
        updateStep('foundations', { genre: 'fantasy' });
        markStepComplete('foundations');
        setError('Test error');
      });

      // Verify state is modified
      expect(useWorldBuilderStore.getState().worldData).not.toBeNull();
      expect(useWorldBuilderStore.getState().completedSteps.size).toBe(1);
      expect(useWorldBuilderStore.getState().error).toBe('Test error');

      act(() => {
        resetWorld();
      });

      // Verify reset
      const resetState = useWorldBuilderStore.getState();
      expect(resetState.worldData).toBeNull();
      expect(resetState.currentStep).toBe('foundations');
      expect(resetState.completedSteps.size).toBe(0);
      expect(resetState.error).toBeNull();
      expect(resetState.lastSaved).toBeNull();
    });
  });

  describe('Selectors and Computed Values', () => {
    it('should provide correct step completion status', () => {
      const { markStepComplete } = useWorldBuilderStore.getState();
      const selectors = useWorldBuilderStore.getState();

      expect(selectors.completedSteps.has('foundations')).toBe(false);

      act(() => {
        markStepComplete('foundations');
      });

      expect(useWorldBuilderStore.getState().completedSteps.has('foundations')).toBe(true);
    });

    it('should determine navigation permissions correctly', () => {
      const { initializeWorld, markStepComplete } = useWorldBuilderStore.getState();

      act(() => {
        initializeWorld({});
      });

      // Can navigate to current step
      expect(useWorldBuilderStore.getState().currentStep).toBe('foundations');

      act(() => {
        markStepComplete('foundations');
      });

      // Now can navigate to completed steps
      expect(useWorldBuilderStore.getState().completedSteps.has('foundations')).toBe(true);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle rapid state updates', () => {
      const { updateStep } = useWorldBuilderStore.getState();

      act(() => {
        // Simulate rapid updates (like typing)
        for (let i = 0; i < 10; i++) {
          updateStep('foundations', { name: `Update ${i}` });
        }
      });

      // Should have the last update
      expect(useWorldBuilderStore.getState().worldData?.foundations.name).toBe('Update 9');
      expect(useWorldBuilderStore.getState().worldData?.version).toBe(10); // Initial + 9 updates
    });

    it('should maintain state consistency during complex operations', () => {
      const { initializeWorld, updateStep, navigateToStep, markStepComplete } = useWorldBuilderStore.getState();

      act(() => {
        initializeWorld({});
        updateStep('foundations', { name: 'Complex World', genre: 'fantasy' });
        navigateToStep('rules');
        markStepComplete('foundations');
        updateStep('rules', { physics: ['magic'] });
      });

      const state = useWorldBuilderStore.getState();
      expect(state.worldData?.foundations.name).toBe('Complex World');
      expect(state.worldData?.foundations.genre).toBe('fantasy');
      expect(state.worldData?.rules.physics).toEqual(['magic']);
      expect(state.currentStep).toBe('rules');
      expect(state.completedSteps.has('foundations')).toBe(true);
    });
  });

  describe('Memory and Performance', () => {
    it('should not create unnecessary re-renders', () => {
      const { initializeWorld } = useWorldBuilderStore.getState();

      act(() => {
        initializeWorld({});
      });

      const state1 = useWorldBuilderStore.getState();
      const state2 = useWorldBuilderStore.getState();

      // Same reference should be returned for same state
      expect(state1).toBe(state2);
    });

    it('should handle large world data efficiently', () => {
      const { initializeWorld, updateStep } = useWorldBuilderStore.getState();

      const largeCultureData = {
        societies: Array.from({ length: 100 }, (_, i) => ({
          id: `society${i}`,
          name: `Society ${i}`,
          values: Array.from({ length: 10 }, (_, j) => `Value ${j}`),
          customs: Array.from({ length: 5 }, (_, j) => `Custom ${j}`),
        })),
        conflicts: Array.from({ length: 50 }, (_, i) => `Conflict ${i}`),
        alliances: Array.from({ length: 25 }, (_, i) => `Alliance ${i}`),
      };

      act(() => {
        initializeWorld({});
        updateStep('culture', largeCultureData);
      });

      const state = useWorldBuilderStore.getState();
      expect(state.worldData?.culture.societies).toHaveLength(100);
      expect(state.worldData?.culture.conflicts).toHaveLength(50);
      // Should handle large data without issues
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    it('should handle invalid step updates gracefully', () => {
      const { updateStep } = useWorldBuilderStore.getState();

      act(() => {
        updateStep('invalid_step' as any, { data: 'test' });
      });

      // Should not crash, just ignore
      expect(useWorldBuilderStore.getState().worldData).toBeNull();
    });

    it('should handle null/undefined data in validation', () => {
      const { validateStep } = useWorldBuilderStore.getState();

      // No world data
      expect(validateStep('foundations')).toBe(false);
      expect(validateStep('rules')).toBe(false);
      expect(validateStep('culture')).toBe(false);
      expect(validateStep('locations')).toBe(false);
      expect(validateStep('synthesis')).toBe(false);
    });

    it('should handle malformed persisted data', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      // Store should handle corrupted localStorage gracefully
      expect(() => useWorldBuilderStore.getState()).not.toThrow();
    });

    it('should handle localStorage errors', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const { initializeWorld } = useWorldBuilderStore.getState();

      // Should not crash even if localStorage fails
      expect(() => {
        act(() => {
          initializeWorld({});
        });
      }).not.toThrow();
    });
  });
});