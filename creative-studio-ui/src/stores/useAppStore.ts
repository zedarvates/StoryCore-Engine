import { LegacyAny } from '@/types/legacy';
import { create } from 'zustand';
import type { Project, Shot, Asset, GenerationTask, PanelSizes, ChatMessage, Sequence, SequencePlan } from '@/types';
import type { SequencePlanWizardContext, ShotWizardContext } from '@/types/wizard';
import type { MasterReferenceSheet, SequenceReferenceSheet, ShotReference } from '@/types/reference';
import type { World } from '@/types/world';
import type { Character } from '@/types/character';
import type { MoodboardReference } from '@/types/moodboard';
import { persist, createJSONStorage } from 'zustand/middleware';
import { StorageManager } from '@/utils/storageManager';
import { generateId } from '@/utils/idGenerator';

// Wizard types
interface WizardCommandHistoryEntry {
  id: string;
  command: string;
  timestamp: number;
  wizardType: WizardType;
  result?: string;
}

export type WizardType =
  | 'dialogue-writer'
  | 'scene-generator'
  | 'storyboard-creator'
  | 'style-transfer'
  | 'sequence-plan'
  | 'shot'
  | 'roger-wizard'
  | 'ghost-tracker-wizard'
  | 'lip-sync'
  | 'scenario-builder'
  | 'dialogue-builder'
  | 'audio-production-wizard'
  | 'video-editor-wizard'
  | 'comic-to-sequence-wizard'
  | 'marketing-wizard'
  | 'discovery-lab'
  | 'project-translator'
  | 'ttt-lrm'
  | 'credits-screen'
  | 'video-publisher';

export interface CharacterFilters {
  archetype?: string[];
  ageRange?: string[];
  creationMethod?: ('wizard' | 'auto_generated' | 'manual' | 'ai_vision')[];
}

interface AppState {
  // Project data
  project: Project | null;
  shots: Shot[];
  assets: Asset[];
  worlds: World[];
  characters: Character[];
  currentShot: Shot | null;
  currentSequence: Sequence | null;

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
  lmStudioStatus: 'connected' | 'error' | 'disconnected' | 'connecting';
  comfyuiStatus: 'connected' | 'error' | 'disconnected' | 'connecting';

  // Playback state
  isPlaying: boolean;
  playbackSpeed: number;

  // Chat state
  chatMessages: ChatMessage[];

  // Modals state
  showInstallationWizard: boolean;
  installationComplete: boolean;
  showWorldWizard: boolean;
  showCharacterWizard: boolean;
  showCreateProjectDialog: boolean;
  showProjectSetupWizard: boolean;
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
  showVaultModal: boolean;
  showDialogueEditor: boolean;
  showFeedbackPanel: boolean;
  showPendingReportsList: boolean;
  showFactCheckModal: boolean;
  showMoodboardModal: boolean;
  showAboutModal: boolean;
  showDocumentationModal: boolean;
  showKeyboardShortcutsDialog: boolean;
  showRogerWizard: boolean;
  showGhostTrackerWizard: boolean;
  showLipSyncWizard: boolean;
  showScenarioBuilder: boolean;
  showDialogueBuilder: boolean;
  showAudioProductionWizard: boolean;
  showVideoEditorWizard: boolean;
  showComicToSequenceWizard: boolean;
  showMarketingWizard: boolean;
  showDiscoveryLab: boolean;
  showProjectTranslator: boolean;
  showTTTLRMModal: boolean;
  showCreditsScreen: boolean;
  showVideoPublisher: boolean;
  showLocationWizard: boolean;
  showComputeDashboard: boolean;
  showAutomationPanel: boolean;
  
  settingsAddonId: string | null;
  lipSyncContext: { audioFile?: File; characterId?: string } | null;
  audioProductionWizardContext: { sequenceId?: string; mode?: string } | null;
  marketingWizardContext: { projectId?: string; targetChannel?: string } | null;
  characterWizardContext: { imageFile?: File; name?: string; role?: string } | null;
  objectWizardContext: { imageFile?: File; name?: string } | null;
  locationWizardContext: { sceneId?: string; imageFile?: File } | null;
  sequencePlanWizardContext: SequencePlanWizardContext | null;
  shotWizardContext: ShotWizardContext | null;
  showSequencePlanWizard: boolean;
  showShotWizard: boolean;
  activeWizardType: WizardType | null;
  showSequenceEditor: boolean;
  sequenceEditorContext: { existingSequencePlan?: SequencePlan } | null;

  // Wizard discussion history (persisted)
  wizardCommandHistory: WizardCommandHistoryEntry[];


  // Character integration
  selectedCharacterIds: string[];
  characterSearchQuery: string;
  characterFilters: CharacterFilters;
  isCharacterEditorOpen: boolean;
  editingCharacterId: string | null;

  // Reference sheet state
  masterReferenceSheet: MasterReferenceSheet | null;
  sequenceReferenceSheets: SequenceReferenceSheet[];
  activeSequenceSheetId: string | null;
  shotReferences: Record<string, ShotReference>;

  // Continuous Creation dialogs
  showReferenceSheetManager: boolean;
  showVideoReplicationDialog: boolean;
  showCrossShotReferencePicker: boolean;
  showProjectBranchingDialog: boolean;
  showEpisodeReferenceDialog: boolean;

  // Navigation and Loading
  currentView: 'dashboard' | 'editor' | 'experimental-ai';
  selectedSequenceId: string | undefined;
  isInitialLoading: boolean;

  // Actions
  setProject: (project: Project | null) => void;
  updateProject: (updates: Partial<Project>) => void;
  saveProjectToDisk: () => Promise<{ success: boolean; errors: string[]; backupCreated?: boolean; imagesCopied?: number }>;
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
  addChatMessage: (message: ChatMessage | ChatMessage[]) => void;
  updateChatMessage: (id: string, updates: Partial<ChatMessage> | ((msg: ChatMessage) => Partial<ChatMessage>)) => void;
  setChatMessages: (messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  clearChatMessages: () => void;
  
  // Modal actions
  setShowInstallationWizard: (show: boolean) => void;
  setInstallationComplete: (complete: boolean) => void;
  setShowWorldWizard: (show: boolean) => void;
  setShowCharacterWizard: (show: boolean, context?: { imageFile?: File; name?: string; role?: string }) => void;
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
  setShowObjectWizard: (show: boolean, context?: { imageFile?: File; name?: string }) => void;
  setShowImageGalleryModal: (show: boolean) => void;
  setShowVaultModal: (show: boolean) => void;
  setShowDialogueEditor: (show: boolean) => void;
  setShowFeedbackPanel: (show: boolean) => void;
  setShowPendingReportsList: (show: boolean) => void;
  setShowFactCheckModal: (show: boolean) => void;
  setShowMoodboardModal: (show: boolean) => void;
  setShowAboutModal: (show: boolean) => void;
  setShowDocumentationModal: (show: boolean) => void;
  setShowKeyboardShortcutsDialog: (show: boolean) => void;
  setShowRogerWizard: (show: boolean) => void;
  setShowGhostTrackerWizard: (show: boolean) => void;
  setShowLipSyncWizard: (show: boolean, context?: { audioFile?: File; characterId?: string }) => void;
  setShowScenarioBuilder: (show: boolean) => void;
  setShowDialogueBuilder: (show: boolean) => void;
  setShowAudioProductionWizard: (show: boolean, context?: { sequenceId?: string; mode?: string }) => void;
  closeAudioProductionWizard: () => void;
  setShowVideoEditorWizard: (show: boolean) => void;
  closeVideoEditorWizard: () => void;
  setShowComicToSequenceWizard: (show: boolean) => void;
  closeComicToSequenceWizard: () => void;
  setShowMarketingWizard: (show: boolean, context?: { projectId?: string; targetChannel?: string }) => void;
  closeMarketingWizard: () => void;
  setShowDiscoveryLab: (show: boolean) => void;
  setShowProjectTranslator: (show: boolean) => void;
  setShowTTTLRMModal: (show: boolean) => void;
  setShowCreditsScreen: (show: boolean) => void;
  openSequencePlanWizard: (context?: SequencePlanWizardContext) => void;
  closeSequencePlanWizard: () => void;
  openShotWizard: (context?: ShotWizardContext) => void;
  closeShotWizard: () => void;
  setShowVideoPublisher: (show: boolean) => void;
  setShowLocationWizard: (show: boolean, context?: { sceneId?: string; imageFile?: File }) => void;
  setShowComputeDashboard: (show: boolean) => void;
  setShowAutomationPanel: (show: boolean) => void;
  openWizard: (wizardType: WizardType) => void;
  closeActiveWizard: () => void;
  setShowSequenceEditor: (show: boolean, context?: { existingSequencePlan?: SequencePlan }) => void;
  closeSequenceEditor: () => void;
  
  // Wizard discussion actions
  addWizardHistory: (entry: Omit<WizardCommandHistoryEntry, 'id' | 'timestamp'>) => void;
  clearWizardHistory: () => void;

  
  // Character integration
  setSelectedCharacterIds: (ids: string[]) => void;
  setCharacterSearchQuery: (query: string) => void;
  setCharacterFilters: (filters: CharacterFilters) => void;
  openCharacterEditor: (characterId: string) => void;
  closeCharacterEditor: () => void;
  setOllamaStatus: (status: 'connected' | 'error' | 'disconnected' | 'connecting') => void;
  setLmStudioStatus: (status: 'connected' | 'error' | 'disconnected' | 'connecting') => void;
  setComfyUIStatus: (status: 'connected' | 'error' | 'disconnected' | 'connecting') => void;

  // Reference sheet actions
  setMasterReferenceSheet: (sheet: MasterReferenceSheet | null) => void;
  addSequenceReferenceSheet: (sheet: SequenceReferenceSheet) => void;
  updateSequenceReferenceSheet: (id: string, updates: Partial<SequenceReferenceSheet>) => void;
  removeSequenceReferenceSheet: (id: string) => void;
  setActiveSequenceSheetId: (id: string | null) => void;
  addShotReference: (reference: ShotReference) => void;
  updateShotReference: (id: string, updates: Partial<ShotReference>) => void;
  removeShotReference: (id: string) => void;

  // Continuous Creation dialog actions
  setShowReferenceSheetManager: (show: boolean) => void;
  setShowVideoReplicationDialog: (show: boolean) => void;
  setShowCrossShotReferencePicker: (show: boolean) => void;
  setShowProjectBranchingDialog: (show: boolean) => void;
  setShowEpisodeReferenceDialog: (show: boolean) => void;

  // Navigation and Loading actions
  setCurrentView: (view: 'dashboard' | 'editor' | 'experimental-ai') => void;
  setSelectedSequenceId: (id: string | undefined) => void;
  setIsInitialLoading: (loading: boolean) => void;
  
  openAddonSettings: (addonId: string) => void;
  closeAddonSettings: () => void;
  addMoodboardReference: (reference: Partial<MoodboardReference>) => void;
}

const initialState = {
  project: null,
  shots: [],
  assets: [],
  selectedShotId: null,
  currentTime: 0,
  showChat: false,
  showTaskQueue: false,
  panelSizes: { assetLibrary: 20, canvas: 50, propertiesOrChat: 30 },
  chatPanelPosition: { x: 100, y: 100 },
  chatPanelSize: { width: 384, height: 500 },
  chatPanelMinimized: false,
  taskQueue: [],
  ollamaStatus: 'disconnected' as const,
  lmStudioStatus: 'disconnected' as const,
  comfyuiStatus: 'disconnected' as const,
  worlds: [],
  characters: [],
  currentShot: null,
  currentSequence: null,
  isPlaying: false,
  playbackSpeed: 1,
  chatMessages: [],
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
  showVaultModal: false,
  showFactCheckModal: false,
  showMoodboardModal: false,
  showAboutModal: false,
  showDocumentationModal: false,
  showKeyboardShortcutsDialog: false,
  showDialogueEditor: false,
  showFeedbackPanel: false,
  showPendingReportsList: false,
  showSequencePlanWizard: false,
  sequencePlanWizardContext: null,
  showShotWizard: false,
  shotWizardContext: null,
  settingsAddonId: null,
  showRogerWizard: false,
  showGhostTrackerWizard: false,
  showLipSyncWizard: false,
  lipSyncContext: null,
  showScenarioBuilder: false,
  showDialogueBuilder: false,
  showAudioProductionWizard: false,
  audioProductionWizardContext: null,
  showVideoEditorWizard: false,
  showComicToSequenceWizard: false,
  showMarketingWizard: false,
  marketingWizardContext: null,
  showDiscoveryLab: false,
  showProjectTranslator: false,
  showTTTLRMModal: false,
  showCreditsScreen: false,
  showVideoPublisher: false,
  showLocationWizard: false,
  showComputeDashboard: false,
  showAutomationPanel: false,
  characterWizardContext: null,
  objectWizardContext: null,
  locationWizardContext: null,
  activeWizardType: null,
  wizardCommandHistory: [],
  showSequenceEditor: false,
  sequenceEditorContext: null,

  selectedCharacterIds: [],
  characterSearchQuery: '',
  characterFilters: {},
  isCharacterEditorOpen: false,
  editingCharacterId: null,
  masterReferenceSheet: null,
  sequenceReferenceSheets: [],
  activeSequenceSheetId: null,
  shotReferences: {},
  showReferenceSheetManager: false,
  showVideoReplicationDialog: false,
  showCrossShotReferencePicker: false,
  showProjectBranchingDialog: false,
  showEpisodeReferenceDialog: false,
  currentView: 'dashboard' as const,
  selectedSequenceId: undefined,
  isInitialLoading: false,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, _get) => ({
      ...initialState,
      setProject: (project) => set({ project }),
      updateProject: (updates) => set((state) => ({
        project: state.project ? { ...state.project, ...updates } : null
      })),
      saveProjectToDisk: async () => {
        const state = _get();
        if (!state.project?.path) return { success: false, errors: ['No project path'] };
        
        try {
          const { EnhancedProjectStorage } = await import('../utils/EnhancedProjectStorage');
          const storage = new EnhancedProjectStorage(state.project.path);
          
          // Prepare state for persistence
          const projectState = {
            selectedShotId: state.selectedShotId,
            selectedSequenceId: state.selectedSequenceId,
            currentTime: state.currentTime,
            currentView: state.currentView,
            wizardCommandHistory: state.wizardCommandHistory,
            // Add other state variables as needed
          };
          
          const result = await storage.save(state.project as LegacyAny, projectState);
          return result;
        } catch (error) {
          console.error('[Store] Failed to save project to disk:', error);
          return { success: false, errors: [String(error)] };
        }
      },
      setShots: (shots) => set({ shots }),
      addShot: (shot) => set((state) => ({ shots: [...state.shots, shot] })),
      updateShot: (id, updates) => set((state) => ({
        shots: state.shots.map((shot) => (shot.id === id ? { ...shot, ...updates } : shot)),
      })),
      deleteShot: (id) => set((state) => ({
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
      addAsset: (asset) => set((state) => ({ 
        assets: [...state.assets, asset].slice(-1000) 
      })),
      addTask: (task) => set((state) => ({ 
        taskQueue: [...state.taskQueue, task].slice(-100) 
      })),
      removeTask: (taskId) => set((state) => ({
        taskQueue: state.taskQueue.filter((t) => t.id !== taskId),
      })),
      reorderTasks: (tasks) => set({ taskQueue: tasks }),
      addChatMessage: (message) => set((state) => {
        const messagesToAdd = Array.isArray(message) ? message : [message];
        
        // Filter out messages that already exist by ID to prevent duplication
        const uniqueNewMessages = messagesToAdd.filter(
          (newMsg) => !state.chatMessages.some((m) => m.id === newMsg.id)
        );

        if (uniqueNewMessages.length === 0) return state;

        const updatedMessages = [...state.chatMessages, ...uniqueNewMessages];
        return { chatMessages: updatedMessages.slice(-100) };
      }),
      updateChatMessage: (id, updates) => set((state) => ({
        chatMessages: state.chatMessages.map((msg) =>
          msg.id === id ? { ...msg, ...(typeof updates === 'function' ? updates(msg) : updates) } : msg
        ),
      })),
      setChatMessages: (messages) => set((state) => ({
        chatMessages: typeof messages === 'function' ? messages(state.chatMessages) : messages,
      })),
      clearChatMessages: () => set({ chatMessages: [] }),
      setShowInstallationWizard: (show) => set({ showInstallationWizard: show }),
      setInstallationComplete: (complete) => set({ installationComplete: complete }),
      setShowWorldWizard: (show) => set({ showWorldWizard: show }),
      setShowCharacterWizard: (show, context) => set({ showCharacterWizard: show, characterWizardContext: context || null }),
      setShowProjectSetupWizard: (show) => set({ showProjectSetupWizard: show }),
      setShowCreateProjectDialog: (show) => set({ showCreateProjectDialog: show }),
      setShowStorytellerWizard: (show) => set({ showStorytellerWizard: show }),
      setShowLLMSettings: (show) => set({ showLLMSettings: show }),
      setShowComfyUISettings: (show) => set({ showComfyUISettings: show }),
      setShowGeneralSettings: (show) => set({ showGeneralSettings: show }),
      setShowAddonsModal: (show) => set({ showAddonsModal: show }),
      setShowCharactersModal: (show) => set({ showCharactersModal: show }),
      setShowWorldModal: (show) => set({ showWorldModal: show }),
      setShowLocationsModal: (show) => set({ showLocationsModal: show }),
      setShowObjectsModal: (show) => set({ showObjectsModal: show }),
      setShowObjectWizard: (show, context) => set({ showObjectWizard: show, objectWizardContext: context || null }),
      setShowImageGalleryModal: (show) => set({ showImageGalleryModal: show }),
      setShowVaultModal: (show) => set({ showVaultModal: show }),
      setShowDialogueEditor: (show) => set({ showDialogueEditor: show }),
      setShowFeedbackPanel: (show) => set({ showFeedbackPanel: show }),
      setShowPendingReportsList: (show) => set({ showPendingReportsList: show }),
      setShowFactCheckModal: (show) => set({ showFactCheckModal: show }),
      setShowMoodboardModal: (show) => set({ showMoodboardModal: show }),
      setShowAboutModal: (show) => set({ showAboutModal: show }),
      setShowDocumentationModal: (show) => set({ showDocumentationModal: show }),
      setShowKeyboardShortcutsDialog: (show) => set({ showKeyboardShortcutsDialog: show }),
      setShowRogerWizard: (show) => set({ showRogerWizard: show }),
      setShowGhostTrackerWizard: (show) => set({ showGhostTrackerWizard: show }),
      setShowLipSyncWizard: (show, context) => set({ showLipSyncWizard: show, lipSyncContext: context || null }),
      setShowScenarioBuilder: (show) => set({ showScenarioBuilder: show }),
      setShowDialogueBuilder: (show) => set({ showDialogueBuilder: show }),
      setShowAudioProductionWizard: (show, context) => set({
        showAudioProductionWizard: show,
        audioProductionWizardContext: context || null,
      }),
      closeAudioProductionWizard: () => set({ showAudioProductionWizard: false, audioProductionWizardContext: null }),
      setShowVideoEditorWizard: (show) => set({ showVideoEditorWizard: show }),
      closeVideoEditorWizard: () => set({ showVideoEditorWizard: false }),
      setShowComicToSequenceWizard: (show) => set({ showComicToSequenceWizard: show }),
      closeComicToSequenceWizard: () => set({ showComicToSequenceWizard: false }),
      setShowMarketingWizard: (show, context) => set({ showMarketingWizard: show, marketingWizardContext: context || null }),
      closeMarketingWizard: () => set({ showMarketingWizard: false, marketingWizardContext: null }),
      setShowDiscoveryLab: (show) => set({ showDiscoveryLab: show }),
      setShowProjectTranslator: (show) => set({ showProjectTranslator: show }),
      setShowTTTLRMModal: (show) => set({ showTTTLRMModal: show }),
      setShowCreditsScreen: (show) => set({ showCreditsScreen: show }),
      openSequencePlanWizard: (context) => set({ showSequencePlanWizard: true, sequencePlanWizardContext: context || { mode: 'create' } }),
      closeSequencePlanWizard: () => set({ showSequencePlanWizard: false, sequencePlanWizardContext: null }),
      openShotWizard: (context) => set({ showShotWizard: true, shotWizardContext: context || { mode: 'create' } }),
      closeShotWizard: () => set({ showShotWizard: false, shotWizardContext: null }),
      setShowVideoPublisher: (show) => set({ showVideoPublisher: show }),
      setShowLocationWizard: (show, context) => set({ showLocationWizard: show, locationWizardContext: context || null }),
      setShowComputeDashboard: (show) => set({ showComputeDashboard: show }),
      setShowAutomationPanel: (show) => set({ showAutomationPanel: show }),
      openWizard: (wizardType) => set({ activeWizardType: wizardType }),
      closeActiveWizard: () => set({ activeWizardType: null }),
      setShowSequenceEditor: (show, context) => set({ showSequenceEditor: show, sequenceEditorContext: context || null }),
      closeSequenceEditor: () => set({ showSequenceEditor: false, sequenceEditorContext: null }),
      
      addWizardHistory: (entry) => set((state) => ({ 
        wizardCommandHistory: [{
          ...entry,
          id: generateId(),
          timestamp: Date.now(),
        }, ...state.wizardCommandHistory].slice(0, 50)
      })),
      clearWizardHistory: () => set({ wizardCommandHistory: [] }),

      setSelectedCharacterIds: (ids) => set({ selectedCharacterIds: ids }),
      setCharacterSearchQuery: (query) => set({ characterSearchQuery: query }),
      setCharacterFilters: (filters) => set({ characterFilters: filters }),
      openCharacterEditor: (id) => set({ isCharacterEditorOpen: true, editingCharacterId: id }),
      closeCharacterEditor: () => set({ isCharacterEditorOpen: false, editingCharacterId: null }),
      setOllamaStatus: (status) => set({ ollamaStatus: status }),
      setLmStudioStatus: (status) => set({ lmStudioStatus: status }),
      setComfyUIStatus: (status) => set({ comfyuiStatus: status }),
      setMasterReferenceSheet: (sheet) => set({ masterReferenceSheet: sheet }),
      addSequenceReferenceSheet: (sheet) => set((state) => ({ sequenceReferenceSheets: [...state.sequenceReferenceSheets, sheet] })),
      updateSequenceReferenceSheet: (id, updates) => set((state) => ({
        sequenceReferenceSheets: state.sequenceReferenceSheets.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      })),
      removeSequenceReferenceSheet: (id) => set((state) => ({
        sequenceReferenceSheets: state.sequenceReferenceSheets.filter((s) => s.id !== id),
      })),
      setActiveSequenceSheetId: (id) => set({ activeSequenceSheetId: id }),
      addShotReference: (ref) => set((state) => ({ shotReferences: { ...state.shotReferences, [ref.id]: ref } })),
      updateShotReference: (id, updates) => set((state) => {
        const existing = state.shotReferences[id];
        return existing ? { shotReferences: { ...state.shotReferences, [id]: { ...existing, ...updates } } } : state;
      }),
      removeShotReference: (id) => set((state) => {
        const rest = { ...state.shotReferences };
        delete rest[id];
        return { shotReferences: rest };
      }),
      setShowReferenceSheetManager: (show) => set({ showReferenceSheetManager: show }),
      setShowVideoReplicationDialog: (show) => set({ showVideoReplicationDialog: show }),
      setShowCrossShotReferencePicker: (show) => set({ showCrossShotReferencePicker: show }),
      setShowProjectBranchingDialog: (show) => set({ showProjectBranchingDialog: show }),
      setShowEpisodeReferenceDialog: (show) => set({ showEpisodeReferenceDialog: show }),
      setCurrentView: (view) => set({ currentView: view }),
      setSelectedSequenceId: (id) => set({ selectedSequenceId: id }),
      setIsInitialLoading: (loading) => set({ isInitialLoading: loading }),
      openAddonSettings: (addonId) => set({ settingsAddonId: addonId }),
      closeAddonSettings: () => set({ settingsAddonId: null }),
      addMoodboardReference: (reference) => set((state) => {
        if (!state.project) return state;

        const newReference: MoodboardReference = {
          id: `mb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          url: reference.url || '',
          type: reference.type || 'image',
          source: reference.source || 'upload',
          createdAt: Date.now(),
          ...reference,
        } as MoodboardReference;

        const currentMoodboard = state.project.moodboard || {
          id: `mood_${Date.now()}`,
          projectId: state.project.id,
          vision: { description: '', keywords: [] },
          visualStyle: { 
            artStyle: '', 
            colorPalette: [], 
            typography: { headers: '', body: '' } 
          },
          references: [],
          inspirationNotes: [],
          updatedAt: Date.now(),
        };

        const updatedMoodboard = {
          ...currentMoodboard,
          references: [...currentMoodboard.references, newReference],
          updatedAt: Date.now(),
        };

        return {
          project: {
            ...state.project,
            moodboard: updatedMoodboard
          }
        };
      }),
    }),
    {
      name: 'storycore-app-storage',
      storage: createJSONStorage(() => ({
        getItem: (name) => StorageManager.getItem(name),
        setItem: async (name, value) => { await StorageManager.setItem(name, value); },
        removeItem: async (name) => StorageManager.removeItem(name),
      })),
      partialize: (state) => ({
        // Project metadata and selection
        project: state.project,
        selectedShotId: state.selectedShotId,
        selectedSequenceId: state.selectedSequenceId,
        currentView: state.currentView,
        
        // Playback and UI state
        currentTime: state.currentTime,
        playbackSpeed: state.playbackSpeed,
        chatMessages: state.chatMessages,
        panelSizes: state.panelSizes,
        
        // Wizard contexts (to prevent loss of progress)
        wizardCommandHistory: state.wizardCommandHistory,
        sequencePlanWizardContext: state.sequencePlanWizardContext,
        shotWizardContext: state.shotWizardContext,
        lipSyncContext: state.lipSyncContext,
        characterWizardContext: state.characterWizardContext,
        locationWizardContext: state.locationWizardContext,
        
        // Floating panels
        chatPanelPosition: state.chatPanelPosition,
        chatPanelSize: state.chatPanelSize,
        chatPanelMinimized: state.chatPanelMinimized,
      }),
    }
  )
);
