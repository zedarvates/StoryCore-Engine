/**
 * Unit tests for Wizard Store
 * Tests basic store functionality and state management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useWizardStore } from '../wizardStore';
import type { ProjectTypeData, GenreStyleData } from '../../../types/wizard';

describe('WizardStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useWizardStore.getState().reset();
  });

  describe('Navigation State', () => {
    it('should initialize with step 1', () => {
      const state = useWizardStore.getState();
      expect(state.currentStep).toBe(1);
    });

    it('should update current step', () => {
      const { setCurrentStep } = useWizardStore.getState();
      setCurrentStep(3);
      expect(useWizardStore.getState().currentStep).toBe(3);
    });

    it('should mark steps as complete', () => {
      const { markStepComplete } = useWizardStore.getState();
      markStepComplete(1);
      markStepComplete(2);

      const completedSteps = useWizardStore.getState().completedSteps;
      expect(completedSteps.has(1)).toBe(true);
      expect(completedSteps.has(2)).toBe(true);
      expect(completedSteps.has(3)).toBe(false);
    });

    it('should initialize with empty completed steps', () => {
      const state = useWizardStore.getState();
      expect(state.completedSteps.size).toBe(0);
    });

    it('should not be in review mode initially', () => {
      const state = useWizardStore.getState();
      expect(state.isReviewMode).toBe(false);
    });
  });

  describe('Project Data Updates', () => {
    it('should update project type data (step 1)', () => {
      const { updateStepData } = useWizardStore.getState();
      const projectTypeData: ProjectTypeData = {
        type: 'court-metrage',
        durationMinutes: 15,
        durationRange: { min: 1, max: 30 },
      };

      updateStepData(1, projectTypeData);

      const state = useWizardStore.getState();
      expect(state.projectType).toEqual(projectTypeData);
    });

    it('should update genre style data (step 2)', () => {
      const { updateStepData } = useWizardStore.getState();
      const genreStyleData: GenreStyleData = {
        genres: ['action', 'sci-fi'],
        visualStyle: 'realistic',
        colorPalette: {
          primary: '#FF0000',
          secondary: '#00FF00',
          accent: '#0000FF',
        },
        mood: ['tense', 'energetic'],
      };

      updateStepData(2, genreStyleData);

      const state = useWizardStore.getState();
      expect(state.genreStyle).toEqual(genreStyleData);
    });

    it('should update characters array (step 4)', () => {
      const { updateStepData } = useWizardStore.getState();
      const characters = [
        {
          id: '1',
          name: 'John Doe',
          role: 'protagonist' as const,
          physicalAppearance: 'Tall, dark hair',
          personalityTraits: ['brave', 'determined'],
          characterArc: 'Hero journey',
          visualReferences: [],
          dialogueStyle: 'casual' as const,
          relationships: [],
        },
      ];

      updateStepData(4, characters);

      const state = useWizardStore.getState();
      expect(state.characters).toEqual(characters);
    });
  });

  describe('Validation', () => {
    it('should validate step 1 requires project type', async () => {
      const { validateStep } = useWizardStore.getState();
      const result = await validateStep(1);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('projectType');
    });

    it('should validate step 1 passes with valid project type', async () => {
      const { updateStepData, validateStep } = useWizardStore.getState();

      updateStepData(1, {
        type: 'court-metrage',
        durationMinutes: 15,
      } as ProjectTypeData);

      const result = await validateStep(1);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate step 1 rejects negative duration', async () => {
      const { updateStepData, validateStep } = useWizardStore.getState();

      updateStepData(1, {
        type: 'custom',
        durationMinutes: -10,
      } as ProjectTypeData);

      const result = await validateStep(1);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'durationMinutes')).toBe(true);
    });

    it('should store validation errors in state', async () => {
      const { validateStep } = useWizardStore.getState();
      await validateStep(1);

      const state = useWizardStore.getState();
      expect(state.validationErrors.has(1)).toBe(true);
      expect(state.validationErrors.get(1)?.length).toBeGreaterThan(0);
    });

    it('should clear validation errors when step becomes valid', async () => {
      const { updateStepData, validateStep } = useWizardStore.getState();

      // First validate with no data (should fail)
      await validateStep(1);
      expect(useWizardStore.getState().validationErrors.has(1)).toBe(true);

      // Then add valid data and validate again
      updateStepData(1, {
        type: 'court-metrage',
        durationMinutes: 15,
      } as ProjectTypeData);
      await validateStep(1);

      expect(useWizardStore.getState().validationErrors.has(1)).toBe(false);
    });
  });

  describe('canProceed', () => {
    it('should return false when current step has validation errors', async () => {
      const { validateStep, canProceed } = useWizardStore.getState();

      await validateStep(1); // Will fail validation
      expect(canProceed()).toBe(false);
    });

    it('should return true when current step has no validation errors', async () => {
      const { updateStepData, validateStep, canProceed } = useWizardStore.getState();

      updateStepData(1, {
        type: 'court-metrage',
        durationMinutes: 15,
      } as ProjectTypeData);

      await validateStep(1);
      expect(canProceed()).toBe(true);
    });
  });

  describe('Reset', () => {
    it('should reset all state to initial values', () => {
      const { updateStepData, setCurrentStep, markStepComplete, reset } =
        useWizardStore.getState();

      // Modify state
      setCurrentStep(3);
      markStepComplete(1);
      updateStepData(1, {
        type: 'court-metrage',
        durationMinutes: 15,
      } as ProjectTypeData);

      // Reset
      reset();

      const state = useWizardStore.getState();
      expect(state.currentStep).toBe(1);
      expect(state.completedSteps.size).toBe(0);
      expect(state.projectType).toBeNull();
    });
  });

  describe('Cross-step validation', () => {
    it('should validate step 3 requires at least one location', async () => {
      const { updateStepData, validateStep } = useWizardStore.getState();

      updateStepData(3, {
        timePeriod: 'Modern',
        primaryLocation: 'City',
        universeType: 'realistic',
        worldRules: 'Realistic physics',
        locations: [],
        culturalContext: 'Western',
        technologyLevel: 5,
      });

      const result = await validateStep(3);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'locations')).toBe(true);
    });

    it('should validate step 4 requires at least one character', async () => {
      const { validateStep } = useWizardStore.getState();

      const result = await validateStep(4);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'characters')).toBe(true);
    });

    it('should validate step 5 requires premise and logline', async () => {
      const { updateStepData, validateStep } = useWizardStore.getState();

      updateStepData(5, {
        premise: '',
        logline: '',
        actStructure: '3-act',
        plotPoints: [],
        themes: [],
        motifs: [],
        narrativePerspective: 'third-person-limited',
      });

      const result = await validateStep(5);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'premise')).toBe(true);
      expect(result.errors.some((e) => e.field === 'logline')).toBe(true);
    });
  });
});
