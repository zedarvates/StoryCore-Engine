import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface WorldData {
  id: string;
  version: number;
  foundations: {
    name: string;
    genre: string;
    tone: string;
    setting: string;
    scale: 'small' | 'medium' | 'large';
  };
  rules: {
    physics: string[];
    magic: string[];
    technology: string[];
    restrictions: string[];
  };
  culture: {
    societies: Array<{
      id: string;
      name: string;
      values: string[];
      customs: string[];
    }>;
    conflicts: string[];
    alliances: string[];
  };
  locations: Array<{
    id: string;
    name: string;
    type: 'city' | 'wilderness' | 'dungeon' | 'other';
    description: string;
    coordinates: { x: number; y: number };
  }>;
  synthesis: {
    plotHooks: string[];
    keyEvents: string[];
    themes: string[];
    summary: string;
  };
}

export interface WorldBuilderState {
  worldData: WorldData | null;
  currentStep: string;
  completedSteps: Set<string>;
  isLoading: boolean;
  error: string | null;
  lastSaved: Date | null;

  // Actions
  initializeWorld: (data: Partial<WorldData>) => void;
  updateStep: (step: string, data: any) => void;
  navigateToStep: (step: string) => void;
  markStepComplete: (step: string) => void;
  validateStep: (step: string) => boolean;
  saveWorld: () => Promise<void>;
  loadWorld: (id: string) => Promise<void>;
  resetWorld: () => void;
  setError: (error: string | null) => void;
}

const initialWorldData: Omit<WorldData, 'id'> = {
  version: 1,
  foundations: {
    name: '',
    genre: '',
    tone: '',
    setting: '',
    scale: 'medium',
  },
  rules: {
    physics: [],
    magic: [],
    technology: [],
    restrictions: [],
  },
  culture: {
    societies: [],
    conflicts: [],
    alliances: [],
  },
  locations: [],
  synthesis: {
    plotHooks: [],
    keyEvents: [],
    themes: [],
    summary: '',
  },
};

const STEPS = ['foundations', 'rules', 'culture', 'locations', 'synthesis'];

export const useWorldBuilderStore = create<WorldBuilderState>()(
  persist(
    (set, get) => ({
      worldData: null,
      currentStep: 'foundations',
      completedSteps: new Set(),
      isLoading: false,
      error: null,
      lastSaved: null,

      initializeWorld: (data: Partial<WorldData>) => {
        const newWorld: WorldData = {
          id: crypto.randomUUID(),
          ...initialWorldData,
          ...data,
        };
        set({
          worldData: newWorld,
          currentStep: 'foundations',
          completedSteps: new Set(),
          lastSaved: new Date(),
        });
      },

      updateStep: (step: string, data: any) => {
        const { worldData } = get();
        if (!worldData) return;

        const updatedWorld = {
          ...worldData,
          [step]: { ...worldData[step as keyof WorldData], ...data },
          version: worldData.version + 1,
        };

        set({
          worldData: updatedWorld,
          lastSaved: new Date(),
        });
      },

      navigateToStep: (step: string) => {
        if (!STEPS.includes(step)) return;
        set({ currentStep: step });
      },

      markStepComplete: (step: string) => {
        if (!STEPS.includes(step)) return;
        const { completedSteps } = get();
        const newCompleted = new Set(completedSteps);
        newCompleted.add(step);
        set({ completedSteps: newCompleted });
      },

      validateStep: (step: string): boolean => {
        const { worldData } = get();
        if (!worldData) return false;

        switch (step) {
          case 'foundations':
            return !!(
              worldData.foundations.name &&
              worldData.foundations.genre &&
              worldData.foundations.setting
            );
          case 'rules':
            return worldData.rules.physics.length > 0;
          case 'culture':
            return worldData.culture.societies.length > 0;
          case 'locations':
            return worldData.locations.length > 0;
          case 'synthesis':
            return !!(worldData.synthesis.summary && worldData.synthesis.themes.length > 0);
          default:
            return false;
        }
      },

      saveWorld: async () => {
        set({ isLoading: true, error: null });
        try {
          // TODO: Integrate with WorldBuilderService
          await new Promise(resolve => setTimeout(resolve, 100)); // Mock
          set({ lastSaved: new Date(), isLoading: false });
        } catch (error) {
          set({ error: 'Failed to save world', isLoading: false });
        }
      },

      loadWorld: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          // TODO: Integrate with WorldBuilderService
          await new Promise(resolve => setTimeout(resolve, 100)); // Mock
          set({ isLoading: false });
        } catch (error) {
          set({ error: 'Failed to load world', isLoading: false });
        }
      },

      resetWorld: () => {
        set({
          worldData: null,
          currentStep: 'foundations',
          completedSteps: new Set(),
          error: null,
          lastSaved: null,
        });
      },

      setError: (error: string | null) => {
        set({ error });
      },
    }),
    {
      name: 'world-builder-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        worldData: state.worldData,
        currentStep: state.currentStep,
        completedSteps: Array.from(state.completedSteps),
        lastSaved: state.lastSaved,
      }),
    }
  )
);

// Helper hooks
export const useWorldBuilderActions = () => {
  const {
    initializeWorld,
    updateStep,
    navigateToStep,
    markStepComplete,
    validateStep,
    saveWorld,
    loadWorld,
    resetWorld,
    setError,
  } = useWorldBuilderStore();

  return {
    initializeWorld,
    updateStep,
    navigateToStep,
    markStepComplete,
    validateStep,
    saveWorld,
    loadWorld,
    resetWorld,
    setError,
  };
};

export const useWorldBuilderSelectors = () => {
  const { worldData, currentStep, completedSteps, isLoading, error, lastSaved } =
    useWorldBuilderStore();

  return {
    worldData,
    currentStep,
    completedSteps,
    isLoading,
    error,
    lastSaved,
    isStepCompleted: (step: string) => completedSteps.has(step),
    canNavigateToStep: (step: string) => completedSteps.has(step) || step === currentStep,
  };
};