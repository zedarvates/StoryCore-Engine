import { create } from 'zustand';
import type { Project, Shot, Asset, GenerationTask, PanelSizes, ChatMessage } from '@/types';
import type { SequencePlanWizardContext, ShotWizardContext } from '@/types/wizard';
import type { MasterReferenceSheet, SequenceReferenceSheet, ShotReference } from '@/types/reference';
import type { World } from '@/types/world';
import type { Character } from '@/types/character';
import { logger } from '@/utils/logger';

// Wizard type for generic wizard forms (simple forms in GenericWizardModal)
// Multi-step wizards (world, character) are handled separately via their own modals
export type WizardType =
  | 'dialogue-writer'
  | 'scene-generator'
  | 'storyboard-creator'
  | 'style-transfer'
  | 'sequence-plan'
  | 'shot';

// Character filter types for character integration system
// Requirements: 9.3
export interface CharacterFilters {
  archetype?: string[];
  ageRange?: string[];
  creationMethod?: ('wizard' | 'auto_generated' | 'manual')[];
}

interface AppState {
  // Project data
  project: Project | null;
  shots: Shot[];
  assets: Asset[];
  worlds: World[];
  characters: Character[];

  // UI state
  selectedShotId: string | null;
  currentTime: number;
  showChat: boolean;
  showTaskQueue: boolean;
  panelSizes: PanelSizes;

  // Floating chat panel state
  chatPanelPosition: { x: number; y: number };
  chatPanelSize: { width: number; height: number };
  chatPanelMinimized: boolean;

  // Task queue
  taskQueue: GenerationTask[];

  // Service Status
  ollamaStatus: 'connected' | 'error' | 'disconnected' | 'connecting';
  comfyuiStatus: 'connected' | 'error' | 'disconnected' | 'connecting';

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
  showProjectSetupWizard: boolean;
  showCreateProjectDialog: boolean;
  showStorytellerWizard: boolean;
  showLLMSettings: boolean;
  showComfyUISettings: boolean;
  showGeneralSettings: boolean;
  showAddonsModal: boolean;
  showCharactersModal: boolean;
  showWorldModal: boolean;
  showLocationsModal: boolean;
  showObjectsModal: boolean;
  showObjectWizard: boolean;
  showImageGalleryModal: boolean;
  showDialogueEditor: boolean;
  showFeedbackPanel: boolean;
  showPendingReportsList: boolean;
  showFactCheckModal: boolean;
  settingsAddonId: string | null; // ID of the addon to show settings for

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

  // Character integration system UI state
  // Requirements: 4.2, 9.1, 9.2, 9.3
  selectedCharacterIds: string[];
  characterSearchQuery: string;
  characterFilters: CharacterFilters;
  isCharacterEditorOpen: boolean;
  editingCharacterId: string | null;

  // Reference sheet state (Continuous Creation feature)
  masterReferenceSheet: MasterReferenceSheet | null;
  sequenceReferenceSheets: SequenceReferenceSheet[];
  activeSequenceSheetId: string | null;
  shotReferences: Record<string, ShotReference>;

  // Continuous Creation dialogs state
  showReferenceSheetManager: boolean;
  showVideoReplicationDialog: boolean;
  showCrossShotReferencePicker: boolean;
  showProjectBranchingDialog: boolean;
  showEpisodeReferenceDialog: boolean;

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
  setChatPanelPosition: (position: { x: number; y: number }) => void;
  setChatPanelSize: (size: { width: number; height: number }) => void;
  setChatPanelMinimized: (minimized: boolean) => void;
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
  setShowProjectSetupWizard: (show: boolean) => void;
  setShowCreateProjectDialog: (show: boolean) => void;
  setShowStorytellerWizard: (show: boolean) => void;
  setShowLLMSettings: (show: boolean) => void;
  setShowComfyUISettings: (show: boolean) => void;
  setShowGeneralSettings: (show: boolean) => void;
  setShowAddonsModal: (show: boolean) => void;
  setShowCharactersModal: (show: boolean) => void;
  setShowWorldModal: (show: boolean) => void;
  setShowLocationsModal: (show: boolean) => void;
  setShowObjectsModal: (show: boolean) => void;
  setShowObjectWizard: (show: boolean) => void;
  setShowImageGalleryModal: (show: boolean) => void;
  setShowDialogueEditor: (show: boolean) => void;
  setShowFeedbackPanel: (show: boolean) => void;
  setShowFactCheckModal: (show: boolean) => void;
  setShowPendingReportsList: (show: boolean) => void;
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

  // Character integration system actions
  // Requirements: 4.2, 9.2, 9.4
  setSelectedCharacterIds: (ids: string[]) => void;
  setCharacterSearchQuery: (query: string) => void;
  setCharacterFilters: (filters: CharacterFilters) => void;
  openCharacterEditor: (characterId: string) => void;
  closeCharacterEditor: () => void;
  setOllamaStatus: (status: 'connected' | 'error' | 'disconnected' | 'connecting') => void;
  setComfyUIStatus: (status: 'connected' | 'error' | 'disconnected' | 'connecting') => void;

  // Reference sheet actions (Continuous Creation feature)
  setMasterReferenceSheet: (sheet: MasterReferenceSheet | null) => void;
  addSequenceReferenceSheet: (sheet: SequenceReferenceSheet) => void;
  updateSequenceReferenceSheet: (id: string, sheet: Partial<SequenceReferenceSheet>) => void;
  removeSequenceReferenceSheet: (id: string) => void;
  setActiveSequenceSheetId: (id: string | null) => void;
  addShotReference: (reference: ShotReference) => void;
  updateShotReference: (id: string, reference: Partial<ShotReference>) => void;
  removeShotReference: (id: string) => void;

  // Continuous Creation dialog actions
  setShowReferenceSheetManager: (show: boolean) => void;
  setShowVideoReplicationDialog: (show: boolean) => void;
  setShowCrossShotReferencePicker: (show: boolean) => void;
  setShowProjectBranchingDialog: (show: boolean) => void;
  setShowEpisodeReferenceDialog: (show: boolean) => void;

  // Addon Settings
  openAddonSettings: (addonId: string) => void;
  closeAddonSettings: () => void;
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
  chatPanelPosition: { x: 100, y: 100 },
  chatPanelSize: { width: 384, height: 500 },
  chatPanelMinimized: false,
  taskQueue: [],
  ollamaStatus: 'disconnected',
  comfyuiStatus: 'disconnected',
  worlds: [],
  characters: [],
  isPlaying: false,
  playbackSpeed: 1,
  chatMessages: [],
  history: [],
  historyIndex: -1,
  showInstallationWizard: false,
  installationComplete: false,
  showWorldWizard: false,
  showCharacterWizard: false,
  showCreateProjectDialog: false,
  showProjectSetupWizard: false,
  showStorytellerWizard: false,
  showLLMSettings: false,
  showComfyUISettings: false,
  showGeneralSettings: false,
  showAddonsModal: false,
  showCharactersModal: false,
  showWorldModal: false,
  showLocationsModal: false,
  showObjectsModal: false,
  showObjectWizard: false,
  showImageGalleryModal: false,
  showFactCheckModal: false,
  showDialogueEditor: false,
  showFeedbackPanel: false,
  showPendingReportsList: false,
  showSequencePlanWizard: false,
  sequencePlanWizardContext: null,
  showShotWizard: false,
  shotWizardContext: null,
  settingsAddonId: null,

  // Generic wizard forms initial state (simple forms in GenericWizardModal)
  showDialogueWriter: false,
  showSceneGenerator: false,
  showStoryboardCreator: false,
  showStyleTransfer: false,
  activeWizardType: null,

  // Character integration system initial state
  // Requirements: 4.2, 9.1, 9.2, 9.3
  selectedCharacterIds: [],
  characterSearchQuery: '',
  characterFilters: {},
  isCharacterEditorOpen: false,
  editingCharacterId: null,

  // Reference sheet initial state (Continuous Creation feature)
  masterReferenceSheet: null,
  sequenceReferenceSheets: [],
  activeSequenceSheetId: null,
  shotReferences: {},

  // Continuous Creation dialogs initial state
  showReferenceSheetManager: false,
  showVideoReplicationDialog: false,
  showCrossShotReferencePicker: false,
  showProjectBranchingDialog: false,
  showEpisodeReferenceDialog: false,

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
  setChatPanelPosition: (position) => set({ chatPanelPosition: position }),
  setChatPanelSize: (size) => set({ chatPanelSize: size }),
  setChatPanelMinimized: (minimized) => set({ chatPanelMinimized: minimized }),
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
  setShowCharacterWizard: (show) => {
    logger.debug('[useAppStore] setShowCharacterWizard called with:', show);
    set({ showCharacterWizard: show });
  },
  setShowProjectSetupWizard: (show) => set({ showProjectSetupWizard: show }),
  setShowCreateProjectDialog: (show) => set({ showCreateProjectDialog: show }),
  setShowStorytellerWizard: (show) => {
    logger.debug('[useAppStore] setShowStorytellerWizard called with:', show);
    set({ showStorytellerWizard: show });
  },
  setShowLLMSettings: (show) => set({ showLLMSettings: show }),
  setShowComfyUISettings: (show) => set({ showComfyUISettings: show }),
  setShowGeneralSettings: (show) => set({ showGeneralSettings: show }),
  setShowAddonsModal: (show) => set({ showAddonsModal: show }),
  setShowCharactersModal: (show) => set({ showCharactersModal: show }),
  setShowWorldModal: (show) => set({ showWorldModal: show }),
  setShowLocationsModal: (show) => set({ showLocationsModal: show }),
  setShowObjectsModal: (show) => set({ showObjectsModal: show }),
  setShowObjectWizard: (show) => {
    logger.debug('[useAppStore] setShowObjectWizard called with:', show);
    set({ showObjectWizard: show });
  },
  setShowImageGalleryModal: (show) => set({ showImageGalleryModal: show }),
  setShowFactCheckModal: (show) => set({ showFactCheckModal: show }),
  setShowDialogueEditor: (show) => set({ showDialogueEditor: show }),
  setShowFeedbackPanel: (show) => set({ showFeedbackPanel: show }),
  setShowPendingReportsList: (show) => set({ showPendingReportsList: show }),
  openSequencePlanWizard: (context) => {
    set({
      showSequencePlanWizard: true,
      sequencePlanWizardContext: context || { mode: 'create' },
    });
  },
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
      // Close ALL wizards first (mutual exclusion) - including multi-step wizards
      showWorldWizard: false,
      showCharacterWizard: false,
      showProjectSetupWizard: false,
      showStorytellerWizard: false,
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
      showWorldWizard: false,
      showCharacterWizard: false,
      showProjectSetupWizard: false,
      showStorytellerWizard: false,
      showDialogueWriter: false,
      showSceneGenerator: false,
      showStoryboardCreator: false,
      showStyleTransfer: false,
      activeWizardType: null,
    }),

  // Character integration system actions
  // Requirements: 4.2, 9.2, 9.4
  setSelectedCharacterIds: (ids) => set({ selectedCharacterIds: ids }),
  setCharacterSearchQuery: (query) => set({ characterSearchQuery: query }),
  setCharacterFilters: (filters) => set({ characterFilters: filters }),
  openCharacterEditor: (characterId) =>
    set({
      isCharacterEditorOpen: true,
      editingCharacterId: characterId,
    }),
  closeCharacterEditor: () =>
    set({
      isCharacterEditorOpen: false,
      editingCharacterId: null,
    }),
  setOllamaStatus: (status) => set({ ollamaStatus: status }),
  setComfyUIStatus: (status) => set({ comfyuiStatus: status }),

  // Reference sheet actions (Continuous Creation feature)
  setMasterReferenceSheet: (sheet) => set({ masterReferenceSheet: sheet }),
  addSequenceReferenceSheet: (sheet) =>
    set((state) => ({
      sequenceReferenceSheets: [...state.sequenceReferenceSheets, sheet],
    })),
  updateSequenceReferenceSheet: (id, updates) =>
    set((state) => ({
      sequenceReferenceSheets: state.sequenceReferenceSheets.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    })),
  removeSequenceReferenceSheet: (id) =>
    set((state) => ({
      sequenceReferenceSheets: state.sequenceReferenceSheets.filter((s) => s.id !== id),
      activeSequenceSheetId: state.activeSequenceSheetId === id ? null : state.activeSequenceSheetId,
    })),
  setActiveSequenceSheetId: (id) => set({ activeSequenceSheetId: id }),
  addShotReference: (reference) =>
    set((state) => ({
      shotReferences: { ...state.shotReferences, [reference.id]: reference },
    })),
  updateShotReference: (id, updates) =>
    set((state) => {
      const existing = state.shotReferences[id];
      if (!existing) return state;
      return {
        shotReferences: { ...state.shotReferences, [id]: { ...existing, ...updates } },
      };
    }),
  removeShotReference: (id) =>
    set((state) => {
      const { [id]: _, ...rest } = state.shotReferences;
      return { shotReferences: rest };
    }),

  // Continuous Creation dialog actions
  setShowReferenceSheetManager: (show) => set({ showReferenceSheetManager: show }),
  setShowVideoReplicationDialog: (show) => set({ showVideoReplicationDialog: show }),
  setShowCrossShotReferencePicker: (show) => set({ showCrossShotReferencePicker: show }),
  setShowProjectBranchingDialog: (show) => set({ showProjectBranchingDialog: show }),
  setShowEpisodeReferenceDialog: (show) => set({ showEpisodeReferenceDialog: show }),

  // Addon Settings
  openAddonSettings: (addonId) => set({ settingsAddonId: addonId }),
  closeAddonSettings: () => set({ settingsAddonId: null }),
}));
