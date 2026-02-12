/**
 * Wizard State Store using Zustand
 * Manages the complete state for the Project Setup Wizard
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  WizardState,
  WizardStepData,
  ValidationResult,
  ValidationError,
  ProjectTypeData,
  GenreStyleData,
  WorldBuildingData,
  CharacterProfile,
  StoryStructureData,
  ScriptData,
  SceneBreakdown,
  ShotPlan,
  WizardType,
} from '../../types/wizard';

// Initial state factory
const createInitialState = () => ({
  // Wizard metadata
  wizardType: null as WizardType | null,
  
  // Navigation state
  currentStep: 1,
  completedSteps: new Set<number>(),
  isReviewMode: false,

  // Project data
  projectType: null,
  genreStyle: null,
  worldBuilding: null,
  characters: [],
  storyStructure: null,
  script: null,
  scenes: [],
  shots: [],

  // Metadata
  draftId: null,
  lastSaved: null,
  validationErrors: new Map<number, ValidationError[]>(),
});

/**
 * Wizard Store
 * Provides centralized state management for the wizard workflow
 */
export const useWizardStore = create<WizardState>()(
  devtools(
    persist(
      (set, get) => ({
        ...createInitialState(),

        /**
         * Set the wizard type
         * @param type - Wizard type identifier
         */
        setWizardType: (type: WizardType) => {
          set({ wizardType: type }, false, 'setWizardType');
        },

        /**
         * Set the current step
         * @param step - Step number to navigate to (1-8)
         */
        setCurrentStep: (step: number) => {
          set({ currentStep: step }, false, 'setCurrentStep');
        },

        /**
         * Update data for a specific step
         * @param step - Step number (1-8)
         * @param data - Partial data to update for that step
         */
        updateStepData: (step: number, data: Partial<WizardStepData>) => {
          set(
            (state) => {
              const updates: Partial<WizardState> = {};

              switch (step) {
                case 1:
                  updates.projectType = {
                    ...state.projectType,
                    ...data,
                  } as ProjectTypeData;
                  break;
                case 2:
                  updates.genreStyle = {
                    ...state.genreStyle,
                    ...data,
                  } as GenreStyleData;
                  break;
                case 3:
                  updates.worldBuilding = {
                    ...state.worldBuilding,
                    ...data,
                  } as WorldBuildingData;
                  break;
                case 4:
                  updates.characters = data as CharacterProfile[];
                  break;
                case 5:
                  updates.storyStructure = {
                    ...state.storyStructure,
                    ...data,
                  } as StoryStructureData;
                  break;
                case 6:
                  updates.script = {
                    ...state.script,
                    ...data,
                  } as ScriptData;
                  break;
                case 7:
                  updates.scenes = data as SceneBreakdown[];
                  break;
                case 8:
                  updates.shots = data as ShotPlan[];
                  break;
              }

              return updates;
            },
            false,
            'updateStepData'
          );
        },

        /**
         * Mark a step as complete
         * @param step - Step number to mark complete
         */
        markStepComplete: (step: number) => {
          set(
            (state) => {
              const newCompletedSteps = new Set(state.completedSteps);
              newCompletedSteps.add(step);
              return { completedSteps: newCompletedSteps };
            },
            false,
            'markStepComplete'
          );
        },

        /**
         * Validate a specific step
         * This is a placeholder that will call ValidationEngine when implemented
         * @param step - Step number to validate
         * @returns Validation result
         */
        validateStep: async (step: number): Promise<ValidationResult> => {
          const state = get();

          // Placeholder validation logic
          // This will be replaced with actual ValidationEngine calls in task 3
          const errors: ValidationError[] = [];
          const warnings: ValidationError[] = [];

          // Basic validation for each step
          switch (step) {
            case 1:
              if (!state.projectType) {
                errors.push({
                  field: 'projectType',
                  message: 'Project type is required',
                  severity: 'error',
                });
              } else if (state.projectType.durationMinutes <= 0) {
                errors.push({
                  field: 'durationMinutes',
                  message: 'Duration must be greater than 0',
                  severity: 'error',
                });
              }
              break;

            case 2:
              if (!state.genreStyle) {
                errors.push({
                  field: 'genreStyle',
                  message: 'Genre and style are required',
                  severity: 'error',
                });
              } else {
                if (state.genreStyle.genres.length === 0) {
                  errors.push({
                    field: 'genres',
                    message: 'At least one genre must be selected',
                    severity: 'error',
                  });
                }
              }
              break;

            case 3:
              if (!state.worldBuilding) {
                errors.push({
                  field: 'worldBuilding',
                  message: 'World building data is required',
                  severity: 'error',
                });
              } else if (state.worldBuilding.locations.length === 0) {
                errors.push({
                  field: 'locations',
                  message: 'At least one location is required',
                  severity: 'error',
                });
              }
              break;

            case 4:
              if (state.characters.length === 0) {
                errors.push({
                  field: 'characters',
                  message: 'At least one character is required',
                  severity: 'error',
                });
              }
              break;

            case 5:
              if (!state.storyStructure) {
                errors.push({
                  field: 'storyStructure',
                  message: 'Story structure is required',
                  severity: 'error',
                });
              } else {
                if (!state.storyStructure.premise) {
                  errors.push({
                    field: 'premise',
                    message: 'Premise is required',
                    severity: 'error',
                  });
                }
                if (!state.storyStructure.logline) {
                  errors.push({
                    field: 'logline',
                    message: 'Logline is required',
                    severity: 'error',
                  });
                }
              }
              break;

            case 6:
              if (!state.script) {
                errors.push({
                  field: 'script',
                  message: 'Script data is required',
                  severity: 'error',
                });
              }
              break;

            case 7:
              if (state.scenes.length === 0) {
                errors.push({
                  field: 'scenes',
                  message: 'At least one scene is required',
                  severity: 'error',
                });
              } else {
                // Validate each scene has location and characters
                state.scenes.forEach((scene, index) => {
                  if (!scene.locationId) {
                    errors.push({
                      field: `scenes[${index}].locationId`,
                      message: `Scene ${scene.sceneNumber} must have a location`,
                      severity: 'error',
                    });
                  }
                  if (scene.characterIds.length === 0) {
                    errors.push({
                      field: `scenes[${index}].characterIds`,
                      message: `Scene ${scene.sceneNumber} must have at least one character`,
                      severity: 'error',
                    });
                  }
                });
              }
              break;

            case 8:
              if (state.shots.length === 0) {
                errors.push({
                  field: 'shots',
                  message: 'At least one shot is required',
                  severity: 'error',
                });
              } else {
                // Validate each scene has at least one shot
                const scenesWithShots = new Set(state.shots.map((shot) => shot.sceneId));
                state.scenes.forEach((scene) => {
                  if (!scenesWithShots.has(scene.id)) {
                    warnings.push({
                      field: 'shots',
                      message: `Scene ${scene.sceneNumber} has no shots`,
                      severity: 'warning',
                    });
                  }
                });
              }
              break;
          }

          const result: ValidationResult = {
            isValid: errors.length === 0,
            errors,
            warnings,
          };

          // Update validation errors in state
          set(
            (state) => {
              const newValidationErrors = new Map(state.validationErrors);
              if (errors.length > 0) {
                newValidationErrors.set(step, errors);
              } else {
                newValidationErrors.delete(step);
              }
              return { validationErrors: newValidationErrors };
            },
            false,
            'validateStep'
          );

          return result;
        },

        /**
         * Check if the user can proceed from the current step
         * @returns true if validation passes for current step
         */
        canProceed: (): boolean => {
          const state = get();
          const currentStepErrors = state.validationErrors.get(state.currentStep);
          return !currentStepErrors || currentStepErrors.length === 0;
        },

        /**
         * Reset the wizard to initial state
         */
        reset: () => {
          set(createInitialState(), false, 'reset');
        },
      }),
      {
        name: 'wizard-storage',
        // Custom serialization for Set and Map
        partialize: (state) => ({
          ...state,
          completedSteps: Array.from(state.completedSteps),
          validationErrors: Array.from(state.validationErrors.entries()),
        }),
        // Custom deserialization for Set and Map with proper type handling
        merge: (persistedState: unknown, currentState) => {
          // Safely convert completedSteps to Set
          const completedSteps = Array.isArray(persistedState.completedSteps)
            ? new Set(persistedState.completedSteps)
            : new Set<number>();

          // Safely convert validationErrors to Map
          const validationErrors = Array.isArray(persistedState.validationErrors)
            ? new Map(persistedState.validationErrors)
            : new Map<number, ValidationError[]>();

          return {
            ...currentState,
            ...persistedState,
            completedSteps,
            validationErrors,
          };
        },
      }
    ),
    { name: 'WizardStore' }
  )
);

/**
 * Selector hooks for common state access patterns
 */

export const useCurrentStep = () => useWizardStore((state) => state.currentStep);
export const useCompletedSteps = () => useWizardStore((state) => state.completedSteps);
export const useIsReviewMode = () => useWizardStore((state) => state.isReviewMode);
export const useProjectType = () => useWizardStore((state) => state.projectType);
export const useGenreStyle = () => useWizardStore((state) => state.genreStyle);
export const useWorldBuilding = () => useWizardStore((state) => state.worldBuilding);
export const useCharacters = () => useWizardStore((state) => state.characters);
export const useStoryStructure = () => useWizardStore((state) => state.storyStructure);
export const useScript = () => useWizardStore((state) => state.script);
export const useScenes = () => useWizardStore((state) => state.scenes);
export const useShots = () => useWizardStore((state) => state.shots);
export const useValidationErrors = () => useWizardStore((state) => state.validationErrors);
export const useCanProceed = () => useWizardStore((state) => state.canProceed());

