import { create } from 'zustand';
import type { Project, Shot, Asset, GenerationTask, PanelSizes, ChatMessage } from '@/types';
import type { SequencePlanWizardContext, ShotWizardContext } from '@/types/wizard';

// Wizard type for generic wizard forms (simple forms in GenericWizardModal)
// Multi-step wizards (world, character) are handled separately via their own modals
export type WizardType =
  | 'dialogue-writer'
  | 'scene-generator'
  | 'storyboard-creator'
  | 'style-transfer'
  | 'sequence-plan'
  | 'shot';

interface AppState {
  // Project data
  project: Project | null;
  shots: Shot[];
  assets: Asset[];

  // UI state
  selectedShotId: string | null;
  currentTime: number;
  showChat: boolean;
  showTaskQueue: boolean;
  panelSizes: PanelSizes;

  // Task queue
  taskQueue: GenerationTask[];

  // Playback state
  isPlaying: boolean;
  playbackSpeed: number;

  // Chat state
  chatMessages: ChatMessage[];

  // Installation wizard state
  showInstallationWizard: boolean;
  installationComplete: boolean;

  // Configuration wizards state
  showWorldWizard: boolean;
  showCharacterWizard: boolean;
  showLLMSettings: boolean;
  showComfyUISettings: boolean;
  showAddonsModal: boolean;
  showCharactersModal: boolean;
  showWorldModal: boolean;
  showLocationsModal: boolean;
  showObjectsModal: boolean;
  showImageGalleryModal: boolean;

  // Production wizards state
  showSequencePlanWizard: boolean;
  sequencePlanWizardContext: SequencePlanWizardContext | null;
  showShotWizard: boolean;
  shotWizardContext: ShotWizardContext | null;

  // Generic wizard forms state (simple forms in GenericWizardModal)
  // Multi-step wizards (world, character) use separate state (showWorldWizard, showCharacterWizard)
  showDialogueWriter: boolean;
  showSceneGenerator: boolean;
  showStoryboardCreator: boolean;
  showStyleTransfer: boolean;
  activeWizardType: WizardType | null;

  // Undo/Redo
  history: AppState[];
  historyIndex: number;

  // Actions
  setProject: (project: Project | null) => void;
  setShots: (shots: Shot[]) => void;
  addShot: (shot: Shot) => void;
  updateShot: (id: string, updates: Partial<Shot>) => void;
  deleteShot: (id: string) => void;
  setSelectedShotId: (id: string | null) => void;
  setCurrentTime: (time: number) => void;
  setShowChat: (show: boolean) => void;
  setShowTaskQueue: (show: boolean) => void;
  setPanelSizes: (sizes: PanelSizes) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  addAsset: (asset: Asset) => void;
  addTask: (task: GenerationTask) => void;
  removeTask: (taskId: string) => void;
  reorderTasks: (tasks: GenerationTask[]) => void;
  addChatMessage: (message: ChatMessage) => void;
  clearChatMessages: () => void;
  setShowInstallationWizard: (show: boolean) => void;
  setInstallationComplete: (complete: boolean) => void;
  setShowWorldWizard: (show: boolean) => void;
  setShowCharacterWizard: (show: boolean) => void;
  setShowLLMSettings: (show: boolean) => void;
  setShowComfyUISettings: (show: boolean) => void;
  setShowAddonsModal: (show: boolean) => void;
  setShowCharactersModal: (show: boolean) => void;
  setShowWorldModal: (show: boolean) => void;
  setShowLocationsModal: (show: boolean) => void;
  setShowObjectsModal: (show: boolean) => void;
  setShowImageGalleryModal: (show: boolean) => void;
  openSequencePlanWizard: (context?: SequencePlanWizardContext) => void;
  closeSequencePlanWizard: () => void;
  openShotWizard: (context?: ShotWizardContext) => void;
  closeShotWizard: () => void;

  // Generic wizard form actions (simple forms in GenericWizardModal)
  setShowDialogueWriter: (show: boolean) => void;
  setShowSceneGenerator: (show: boolean) => void;
  setShowStoryboardCreator: (show: boolean) => void;
  setShowStyleTransfer: (show: boolean) => void;
  openWizard: (wizardType: WizardType) => void;
  closeActiveWizard: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  project: null,
  shots: [],
  assets: [],
  selectedShotId: null,
  currentTime: 0,
  showChat: false,
  showTaskQueue: false,
  panelSizes: {
    assetLibrary: 20,
    canvas: 50,
    propertiesOrChat: 30,
  },
  taskQueue: [],
  isPlaying: false,
  playbackSpeed: 1,
  chatMessages: [],
  history: [],
  historyIndex: -1,
  showInstallationWizard: false,
  installationComplete: false,
  showWorldWizard: false,
  showCharacterWizard: false,
  showLLMSettings: false,
  showComfyUISettings: false,
  showAddonsModal: false,
  showCharactersModal: false,
  showWorldModal: false,
  showLocationsModal: false,
  showObjectsModal: false,
  showImageGalleryModal: false,
  showSequencePlanWizard: false,
  sequencePlanWizardContext: null,
  showShotWizard: false,
  shotWizardContext: null,

  // Generic wizard forms initial state (simple forms in GenericWizardModal)
  showDialogueWriter: false,
  showSceneGenerator: false,
  showStoryboardCreator: false,
  showStyleTransfer: false,
  activeWizardType: null,

  // Actions
  setProject: (project) => set({ project }),
  setShots: (shots) => set({ shots }),
  addShot: (shot) => set((state) => ({ shots: [...state.shots, shot] })),
  updateShot: (id, updates) =>
    set((state) => ({
      shots: state.shots.map((shot) => (shot.id === id ? { ...shot, ...updates } : shot)),
    })),
  deleteShot: (id) =>
    set((state) => ({
      shots: state.shots.filter((shot) => shot.id !== id),
      selectedShotId: state.selectedShotId === id ? null : state.selectedShotId,
    })),
  setSelectedShotId: (id) => set({ selectedShotId: id }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setShowChat: (show) => set({ showChat: show }),
  setShowTaskQueue: (show) => set({ showTaskQueue: show }),
  setPanelSizes: (sizes) => set({ panelSizes: sizes }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  addAsset: (asset) => set((state) => ({ assets: [...state.assets, asset] })),
  addTask: (task) => set((state) => ({ taskQueue: [...state.taskQueue, task] })),
  removeTask: (taskId) =>
    set((state) => ({
      taskQueue: state.taskQueue.filter((task) => task.id !== taskId),
    })),
  reorderTasks: (tasks) => set({ taskQueue: tasks }),
  addChatMessage: (message) =>
    set((state) => ({ chatMessages: [...state.chatMessages, message] })),
  clearChatMessages: () => set({ chatMessages: [] }),
  setShowInstallationWizard: (show) => set({ showInstallationWizard: show }),
  setInstallationComplete: (complete) => set({ installationComplete: complete }),
  setShowWorldWizard: (show) => set({ showWorldWizard: show }),
  setShowCharacterWizard: (show) => set({ showCharacterWizard: show }),
  setShowLLMSettings: (show) => set({ showLLMSettings: show }),
  setShowComfyUISettings: (show) => set({ showComfyUISettings: show }),
  setShowAddonsModal: (show) => set({ showAddonsModal: show }),
  setShowCharactersModal: (show) => set({ showCharactersModal: show }),
  setShowWorldModal: (show) => set({ showWorldModal: show }),
  setShowLocationsModal: (show) => set({ showLocationsModal: show }),
  setShowObjectsModal: (show) => set({ showObjectsModal: show }),
  setShowImageGalleryModal: (show) => set({ showImageGalleryModal: show }),
  openSequencePlanWizard: (context) =>
    set({
      showSequencePlanWizard: true,
      sequencePlanWizardContext: context || { mode: 'create' },
    }),
  closeSequencePlanWizard: () =>
    set({
      showSequencePlanWizard: false,
      sequencePlanWizardContext: null,
    }),
  openShotWizard: (context) =>
    set({
      showShotWizard: true,
      shotWizardContext: context || { mode: 'create' },
    }),
  closeShotWizard: () =>
    set({
      showShotWizard: false,
      shotWizardContext: null,
    }),

  // Generic wizard form actions (simple forms in GenericWizardModal)
  setShowDialogueWriter: (show) => set({ showDialogueWriter: show }),
  setShowSceneGenerator: (show) => set({ showSceneGenerator: show }),
  setShowStoryboardCreator: (show) => set({ showStoryboardCreator: show }),
  setShowStyleTransfer: (show) => set({ showStyleTransfer: show }),

  // Open wizard with mutual exclusion (Requirement 3.4)
  openWizard: (wizardType) =>
    set({
      // Close all wizards first (mutual exclusion)
      showDialogueWriter: false,
      showSceneGenerator: false,
      showStoryboardCreator: false,
      showStyleTransfer: false,
      // Set active wizard type
      activeWizardType: wizardType,
      // Open the requested wizard
      ...(wizardType === 'dialogue-writer' && { showDialogueWriter: true }),
      ...(wizardType === 'scene-generator' && { showSceneGenerator: true }),
      ...(wizardType === 'storyboard-creator' && { showStoryboardCreator: true }),
      ...(wizardType === 'style-transfer' && { showStyleTransfer: true }),
    }),

  // Close active wizard (Requirement 3.3)
  closeActiveWizard: () =>
    set({
      showDialogueWriter: false,
      showSceneGenerator: false,
      showStoryboardCreator: false,
      showStyleTransfer: false,
      activeWizardType: null,
    }),
}));