import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import type { Shot, StoryObject, SequencePlan } from '@/types';
import { useAppStore, type WizardType } from '@/stores/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@/store';
import { useEditorStore } from '@/stores/editorStore';
import type { Story } from '@/types/story';
import { LLMProvider } from '@/providers/LLMProvider';
import { SecretModeProvider, useSecretMode } from '@/contexts/SecretModeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { NavigationProvider } from '@/contexts/NavigationContext';
import { DEFAULT_VIEW_STATE } from '@/types/menuBarState';
import type { ViewState, UndoStack, ClipboardState } from '@/types/menuBarState';
import { MenuBar } from '@/components/menuBar/MenuBar';
import { FloatingAIAssistant } from '@/components/FloatingAIAssistant';
import { ToggleButton } from '@/components/ToggleButton';
import { I18nProvider } from '@/utils/i18n';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
const DetachedChatPage = lazy(() => import('@/pages/DetachedChatPage').then(m => ({ default: m.DetachedChatPage })));
const LandingPageWithHooks = lazy(() => import('@/pages/LandingPageWithHooks').then(m => ({ default: m.LandingPageWithHooks })));
const AdvancedGridEditorPage = lazy(() => import('@/pages/experimental/AdvancedGridEditorPage').then(m => ({ default: m.AdvancedGridEditorPage })));
const AIAssistantV3Page = lazy(() => import('@/pages/experimental/AIAssistantV3Page').then(m => ({ default: m.AIAssistantV3Page })));
const PerformanceProfilerPage = lazy(() => import('@/pages/experimental/PerformanceProfilerPage').then(m => ({ default: m.PerformanceProfilerPage })));
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { projectCreationService, convertElectronProjectToStore } from '@/services/ProjectCreationService';
const InstallationWizardModal = lazy(() => import('@/components/installation/InstallationWizardModal').then(m => ({ default: m.InstallationWizardModal })));
const WorldWizardModal = lazy(() => import('@/components/wizard/WorldWizardModal').then(m => ({ default: m.WorldWizardModal })));
const CharacterWizardModal = lazy(() => import('@/components/wizard/CharacterWizardModal').then(m => ({ default: m.CharacterWizardModal })));
const ObjectWizardModal = lazy(() => import('@/components/wizard/ObjectWizardModal').then(m => ({ default: m.ObjectWizardModal })));
const StorytellerWizardModal = lazy(() => import('@/components/wizard/StorytellerWizardModal').then(m => ({ default: m.StorytellerWizardModal })));
const ProjectSetupWizardModal = lazy(() => import('@/components/wizard/ProjectSetupWizardModal').then(m => ({ default: m.ProjectSetupWizardModal })));
const CreateProjectDialogModal = lazy(() => import('@/components/wizard/CreateProjectDialogModal').then(m => ({ default: m.CreateProjectDialogModal })));
const SequencePlanWizardModal = lazy(() => import('@/components/wizard/SequencePlanWizardModal').then(m => ({ default: m.SequencePlanWizardModal })));
const ShotWizardModal = lazy(() => import('@/components/wizard/ShotWizardModal').then(m => ({ default: m.ShotWizardModal })));
const GenericWizardModal = lazy(() => import('@/components/wizard/GenericWizardModal').then(m => ({ default: m.GenericWizardModal })));
const RogerWizardModal = lazy(() => import('./components/wizard/RogerWizardModalWrapper').then(m => ({ default: m.RogerWizardModal })));
const GhostTrackerWizardModal = lazy(() => import('./components/wizard/GhostTrackerWizardModal').then(m => ({ default: m.GhostTrackerWizardModal })));
const DialogueWriterWizardModal = lazy(() => import('./components/wizard/DialogueWriterWizardModal').then(m => ({ default: m.DialogueWriterWizardModal })));
const LipSyncWizardModal = lazy(() => import('./components/wizard/LipSyncWizardModal').then(m => ({ default: m.LipSyncWizardModal })));
const AudioProductionWizardModal = lazy(() => import('@/components/wizard/production/AudioProductionWizardModal').then(m => ({ default: m.AudioProductionWizardModal })));
const VideoEditorWizardModal = lazy(() => import('@/components/wizard/production/VideoEditorWizardModal').then(m => ({ default: m.VideoEditorWizardModal })));
const ComicToSequenceWizardModal = lazy(() => import('@/components/wizard/production/ComicToSequenceWizardModal').then(m => ({ default: m.ComicToSequenceWizardModal })));
const MarketingWizardModal = lazy(() => import('@/components/wizard/marketing/MarketingWizardModal').then(m => ({ default: m.MarketingWizardModal })));
const ScenarioBuilderWizardModal = lazy(() => import('@/components/wizard/ScenarioBuilderWizardModal').then(m => ({ default: m.ScenarioBuilderWizardModal })));
const DialogueBuilderWizardModal = lazy(() => import('@/components/wizard/DialogueBuilderWizardModal').then(m => ({ default: m.DialogueBuilderWizardModal })));
const ProjectTranslatorModal = lazy(() => import('@/components/wizard/ProjectTranslatorModal').then(m => ({ default: m.ProjectTranslatorModal })));
const TTTLRMModal = lazy(() => import('@/components/wizard/TTTLRMModal').then(m => ({ default: m.TTTLRMModal })));
const VideoPublisherEditor = lazy(() => import('@/components/addons/video_publisher/VideoPublisherEditor').then(m => ({ default: m.VideoPublisherEditor })));
const CreditsScreenModal = lazy(() => import('@/components/addons/credits_screen/CreditsScreenModal').then(m => ({ default: m.CreditsScreenModal })));
const ComfyUISettingsModal = lazy(() => import('@/components/settings/ComfyUISettingsModal').then(m => ({ default: m.ComfyUISettingsModal })));
const GeneralSettingsWindow = lazy(() => import('@/components/configuration/GeneralSettingsWindow').then(m => ({ default: m.GeneralSettingsWindow })));
const AddonsModal = lazy(() => import('@/components/settings/AddonsModal').then(m => ({ default: m.AddonsModal })));
const AddonSettingsModal = lazy(() => import('@/components/settings/AddonSettingsModal').then(m => ({ default: m.AddonSettingsModal })));
const CharactersModal = lazy(() => import('@/components/modals/CharactersModal').then(m => ({ default: m.CharactersModal })));
const WorldModal = lazy(() => import('@/components/modals/WorldModal').then(m => ({ default: m.WorldModal })));
const LocationsModal = lazy(() => import('@/components/modals/LocationsModal').then(m => ({ default: m.LocationsModal })));
const ObjectsModal = lazy(() => import('@/components/modals/ObjectsModal').then(m => ({ default: m.ObjectsModal })));
const ImageGalleryModal = lazy(() => import('@/components/modals/ImageGalleryModal').then(m => ({ default: m.ImageGalleryModal })));
const VaultModal = lazy(() => import('@/components/modals/VaultModal').then(m => ({ default: m.VaultModal })));
const FactCheckModal = lazy(() => import('@/components/modals/FactCheckModal').then(m => ({ default: m.FactCheckModal })));
const AboutModal = lazy(() => import('@/components/modals/AboutModal').then(m => ({ default: m.AboutModal })));
const DocumentationModal = lazy(() => import('@/components/modals/menuBar/DocumentationModal').then(m => ({ default: m.DocumentationModal })));
const KeyboardShortcutsDialog = lazy(() => import('@/components/KeyboardShortcutsDialog').then(m => ({ default: m.KeyboardShortcutsDialog })));
const MoodboardModal = lazy(() => import('@/components/modals/MoodboardModal').then(m => ({ default: m.MoodboardModal })));
const LLMConfigDialog = lazy(() => import('@/components/launcher/LLMConfigDialog').then(m => ({ default: m.LLMConfigDialog }))); // NEW: Unified LLM Config Dialog
const ComputeDashboard = lazy(() => import('@/components/feedback/ComputeDashboard').then(m => ({ default: m.ComputeDashboard })));
const ReferenceSheetManager = lazy(() => import('@/components/reference/ReferenceSheetManager').then(m => ({ default: m.ReferenceSheetManager })));
const VideoReplicationDialog = lazy(() => import('@/components/reference/VideoReplicationDialog').then(m => ({ default: m.VideoReplicationDialog })));
const CrossShotReferencePicker = lazy(() => import('@/components/reference/CrossShotReferencePicker').then(m => ({ default: m.CrossShotReferencePicker })));
const ProjectBranchingDialog = lazy(() => import('@/components/reference/ProjectBranchingDialog').then(m => ({ default: m.ProjectBranchingDialog })));
const EpisodeReferenceDialog = lazy(() => import('@/components/reference/EpisodeReferenceDialog').then(m => ({ default: m.EpisodeReferenceDialog })));
const DialogueEditor = lazy(() => import('@/ui/DialogueEditor'));
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { useOllamaInit } from '@/hooks/useOllamaInit';
import { useGlobalKeyboardShortcuts } from '@/hooks/useGlobalKeyboardShortcuts';
import { useVoiceHotkey } from '@/hooks/useVoiceHotkey';
import { useSystemVoiceCommands } from '@/hooks/useSystemVoiceCommands';
import { useNeuralAssistant } from '@/hooks/useNeuralAssistant';
import { initializeLLMConfigService, useLLMConfig } from '@/services/llmConfigService'; // NEW: Initialize and use unified LLM service
import { initializeLLMConfig } from '@/utils/migrateLLMConfig'; // NEW: Migrate legacy configs
import { globalErrorHandler } from '@/utils/globalErrorHandler'; // NEW: Global error handler
import { validateFeatureRegistry } from '@/config/experimentalFeatures'; // NEW: Validate experimental features registry
import { serviceStatusMonitor } from '@/services/ServiceStatusMonitor'; // NEW: Service status monitoring
import { addonManager } from '@/services/AddonManager';
import type { FeedbackInitialContext } from '@/components/feedback/types';
import { logger } from '@/utils/logger';
import { devLog } from '@/utils/devOnly';
import type { World, Genre, Tone } from '@/types/world';
import type { Character } from '@/types/character';
import { eventEmitter, WizardEventType, GenerationCompletedPayload } from '@/services/eventEmitter';
import { useThemeStore } from '@/stores/themeStore';
const FeedbackPanel = lazy(() => import('@/components/feedback/FeedbackPanel').then(m => ({ default: m.FeedbackPanel })));
const PendingReportsList = lazy(() => import('@/components/feedback/PendingReportsList').then(m => ({ default: m.PendingReportsList })));
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ScreenReaderAnnouncerProvider } from '@/components/menuBar/ScreenReaderAnnouncer';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { DialogueBuilderData } from '@/components/wizard/dialogue-builder/DialogueBuilderWizard';
const DiscoveryLab = lazy(() => import('@/components/DiscoveryLab/DiscoveryLab').then(m => ({ default: m.DiscoveryLab })));
const AutomationPanel = lazy(() => import('@/components/automation/AutomationPanel').then(m => ({ default: m.AutomationPanel })));


function AppContent() {
  // Get secret mode context to check for experimental features
  const { currentExperimentalFeature } = useSecretMode();

  const {
    project,
    setProject,
    setShots,
    setCurrentView,
    setSelectedSequenceId,
    isInitialLoading,
    setIsInitialLoading,
    showInstallationWizard,
    setShowInstallationWizard,
    setInstallationComplete,
    showWorldWizard,
    setShowWorldWizard,
    showCharacterWizard,
    setShowCharacterWizard,
    showObjectWizard,
    setShowObjectWizard,
    showStorytellerWizard,
    setShowStorytellerWizard,
    showLLMSettings,
    setShowLLMSettings,
    showComfyUISettings,
    setShowComfyUISettings,
    showGeneralSettings,
    setShowGeneralSettings,
    showAddonsModal,
    setShowAddonsModal,
    showCharactersModal,
    setShowCharactersModal,
    showWorldModal,
    setShowWorldModal,
    showLocationsModal,
    setShowLocationsModal,
    showObjectsModal,
    setShowObjectsModal,
    showImageGalleryModal,
    setShowImageGalleryModal,
    showDialogueEditor,
    setShowDialogueEditor,
    showFeedbackPanel,
    setShowFeedbackPanel,
    showPendingReportsList,
    setShowPendingReportsList,
    showFactCheckModal,
    setShowFactCheckModal,
    showAboutModal,
    setShowAboutModal,
    showMoodboardModal,
    setShowMoodboardModal,
    showDocumentationModal,
    setShowDocumentationModal,
    showKeyboardShortcutsDialog,
    setShowKeyboardShortcutsDialog,
    showSequencePlanWizard,
    closeSequencePlanWizard,
    sequencePlanWizardContext,
    showShotWizard,
    closeShotWizard,
    shotWizardContext,
    showScenarioBuilder,
    setShowScenarioBuilder,
    showDialogueBuilder,
    setShowDialogueBuilder,
    // Generic wizard state (simple forms in GenericWizardModal)
    closeActiveWizard,
    settingsAddonId,
    closeAddonSettings,
    // Continuous Creation state from store
    showReferenceSheetManager,
    setShowReferenceSheetManager,
    showVideoReplicationDialog,
    setShowVideoReplicationDialog,
    showCrossShotReferencePicker,
    setShowCrossShotReferencePicker,
    showProjectBranchingDialog,
    setShowProjectBranchingDialog,
    showEpisodeReferenceDialog,
    setShowEpisodeReferenceDialog,
    showDiscoveryLab,
    setShowDiscoveryLab,
    showProjectTranslator,
    setShowProjectTranslator,
    showVideoPublisher,
    setShowVideoPublisher,
    showLocationWizard,
    setShowLocationWizard,
    showComputeDashboard,
    setShowComputeDashboard,
    showAutomationPanel,
    setShowAutomationPanel,
    characterWizardContext,
    objectWizardContext,
    selectedShotId,
  } = useAppStore(useShallow((state) => ({
    project: state.project,
    setProject: state.setProject,
    setShots: state.setShots,
    setCurrentView: state.setCurrentView,
    setSelectedSequenceId: state.setSelectedSequenceId,
    isInitialLoading: state.isInitialLoading,
    setIsInitialLoading: state.setIsInitialLoading,
    showInstallationWizard: state.showInstallationWizard,
    setShowInstallationWizard: state.setShowInstallationWizard,
    setInstallationComplete: state.setInstallationComplete,
    showWorldWizard: state.showWorldWizard,
    setShowWorldWizard: state.setShowWorldWizard,
    showCharacterWizard: state.showCharacterWizard,
    setShowCharacterWizard: state.setShowCharacterWizard,
    showObjectWizard: state.showObjectWizard,
    setShowObjectWizard: state.setShowObjectWizard,
    showStorytellerWizard: state.showStorytellerWizard,
    setShowStorytellerWizard: state.setShowStorytellerWizard,
    showLLMSettings: state.showLLMSettings,
    setShowLLMSettings: state.setShowLLMSettings,
    showComfyUISettings: state.showComfyUISettings,
    setShowComfyUISettings: state.setShowComfyUISettings,
    showGeneralSettings: state.showGeneralSettings,
    setShowGeneralSettings: state.setShowGeneralSettings,
    showAddonsModal: state.showAddonsModal,
    setShowAddonsModal: state.setShowAddonsModal,
    showCharactersModal: state.showCharactersModal,
    setShowCharactersModal: state.setShowCharactersModal,
    showWorldModal: state.showWorldModal,
    setShowWorldModal: state.setShowWorldModal,
    showLocationsModal: state.showLocationsModal,
    setShowLocationsModal: state.setShowLocationsModal,
    showObjectsModal: state.showObjectsModal,
    setShowObjectsModal: state.setShowObjectsModal,
    showImageGalleryModal: state.showImageGalleryModal,
    setShowImageGalleryModal: state.setShowImageGalleryModal,
    showDialogueEditor: state.showDialogueEditor,
    setShowDialogueEditor: state.setShowDialogueEditor,
    showFeedbackPanel: state.showFeedbackPanel,
    setShowFeedbackPanel: state.setShowFeedbackPanel,
    showPendingReportsList: state.showPendingReportsList,
    setShowPendingReportsList: state.setShowPendingReportsList,
    showFactCheckModal: state.showFactCheckModal,
    setShowFactCheckModal: state.setShowFactCheckModal,
    showAboutModal: state.showAboutModal,
    setShowAboutModal: state.setShowAboutModal,
    showMoodboardModal: state.showMoodboardModal,
    setShowMoodboardModal: state.setShowMoodboardModal,
    showDocumentationModal: state.showDocumentationModal,
    setShowDocumentationModal: state.setShowDocumentationModal,
    showKeyboardShortcutsDialog: state.showKeyboardShortcutsDialog,
    setShowKeyboardShortcutsDialog: state.setShowKeyboardShortcutsDialog,
    showSequencePlanWizard: state.showSequencePlanWizard,
    closeSequencePlanWizard: state.closeSequencePlanWizard,
    sequencePlanWizardContext: state.sequencePlanWizardContext,
    showShotWizard: state.showShotWizard,
    closeShotWizard: state.closeShotWizard,
    shotWizardContext: state.shotWizardContext,
    showScenarioBuilder: state.showScenarioBuilder,
    setShowScenarioBuilder: state.setShowScenarioBuilder,
    showDialogueBuilder: state.showDialogueBuilder,
    setShowDialogueBuilder: state.setShowDialogueBuilder,
    closeActiveWizard: state.closeActiveWizard,
    settingsAddonId: state.settingsAddonId,
    closeAddonSettings: state.closeAddonSettings,
    showReferenceSheetManager: state.showReferenceSheetManager,
    setShowReferenceSheetManager: state.setShowReferenceSheetManager,
    showVideoReplicationDialog: state.showVideoReplicationDialog,
    setShowVideoReplicationDialog: state.setShowVideoReplicationDialog,
    showCrossShotReferencePicker: state.showCrossShotReferencePicker,
    setShowCrossShotReferencePicker: state.setShowCrossShotReferencePicker,
    showProjectBranchingDialog: state.showProjectBranchingDialog,
    setShowProjectBranchingDialog: state.setShowProjectBranchingDialog,
    showEpisodeReferenceDialog: state.showEpisodeReferenceDialog,
    setShowEpisodeReferenceDialog: state.setShowEpisodeReferenceDialog,
    showDiscoveryLab: state.showDiscoveryLab,
    setShowDiscoveryLab: state.setShowDiscoveryLab,
    showProjectTranslator: state.showProjectTranslator,
    setShowProjectTranslator: state.setShowProjectTranslator,
    showVideoPublisher: state.showVideoPublisher,
    setShowVideoPublisher: state.setShowVideoPublisher,
    showLocationWizard: state.showLocationWizard,
    setShowLocationWizard: state.setShowLocationWizard,
    showComputeDashboard: state.showComputeDashboard,
    setShowComputeDashboard: state.setShowComputeDashboard,
    showAutomationPanel: state.showAutomationPanel,
    setShowAutomationPanel: state.setShowAutomationPanel,
    characterWizardContext: state.characterWizardContext,
    objectWizardContext: state.objectWizardContext,
    selectedShotId: state.selectedShotId,
  })));

  // Hook for unified LLM configuration
  const { 
    config: llmConfig, 
    updateConfig, 
    validateConnection: validateLLMConnection 
  } = useLLMConfig();

  // MenuBar state management
  // Requirements: 1.1-15.6
  
  // Track actual processing state from potential sources (e.g. generation queue)
  const isGenerating = useStore((state) => state.generationStatus?.isGenerating ?? false);
  const isProcessing = isGenerating; 
  
  // TODO: Implement real unsaved changes tracking
  const hasUnsavedChanges = false;
  
  const [viewState, setViewState] = useState<ViewState>(DEFAULT_VIEW_STATE);

  // Local state for Continuous Creation modals moved to store
  const [settingsAddonName, setSettingsAddonName] = useState('');
  // characterWizardWorldContext is no longer used as initialWorldContext is removed from CharacterWizardModal

  // Fetch addon name when showing settings
  useEffect(() => {
    if (settingsAddonId) {
      // We need to ensure addons are initialized, or at least try to get the addon
      try {
        const addon = addonManager.getAddon(settingsAddonId);
        if (addon) {
          setSettingsAddonName(addon.name);
        } else {
          // Fallback if addon not found directly (might be async init issue, but usually addons are loaded by dashboard)
          setSettingsAddonName('Addon Settings');
        }
      } catch (_e) {
        console.warn('Failed to get addon info for settings:', _e);
        setSettingsAddonName('Addon Settings');
      }
    }
  }, [settingsAddonId]);

  // Sync project to main store when it changes (CRITICAL: Fixes character persistence)
  // This ensures characters and other project data are available to all components
  // Requirements: 8.1, 8.4
  const storeSetProject = useStore((state) => state.setProject);
  const currentStoreProject = useStore((state) => state.project);
  
  useEffect(() => {
    // Only sync if projects are actually different to prevent infinite loops
    const isDifferent = !currentStoreProject || 
                        project?.id !== currentStoreProject?.id || 
                        project?.path !== currentStoreProject?.path ||
                        (project?.characters?.length !== currentStoreProject?.characters?.length);
                        
    if (project && isDifferent) {
      console.log('🔄 [App] Syncing project to main store:', project.project_name);
      storeSetProject(project);
    }
  }, [project, storeSetProject, currentStoreProject]);

  // Handle view state changes from MenuBar
  // Requirements: 3.1-3.9
  const handleViewStateChange = useCallback((updates: Partial<ViewState>) => {
    setViewState(prev => ({ ...prev, ...updates }));
  }, [setViewState]);

  // Handle project changes from MenuBar
  // Requirements: 1.1-1.8
  const handleProjectChange = useCallback((newProject: typeof project) => {
    setProject(newProject);
    if (newProject) {
      setShots(newProject.shots || []);
    } else {
      setShots([]);
    }
  }, [setProject, setShots]);

  // Undo/Redo stack integration with main store
  // Requirements: 2.1-2.4
  const storeUndo = useStore((state) => state.undo);
  const storeRedo = useStore((state) => state.redo);
  const historyIndex = useStore((state) => state.historyIndex);
  const historyLength = useStore((state) => state.history.length);

  const undoStack: UndoStack = {
    canUndo: historyIndex >= 0,
    canRedo: historyIndex < historyLength - 1,
    undo: storeUndo,
    redo: storeRedo,
  };

  // Clipboard state (stub implementation)
  // Requirements: 2.5-2.9
  // TODO: Integrate with actual clipboard system when available
  const clipboard: ClipboardState = {
    hasContent: false,
    contentType: null,
    cut: () => {
      console.log('Cut operation not yet implemented');
    },
    copy: () => {
      console.log('Copy operation not yet implemented');
    },
    paste: () => {
      console.log('Paste operation not yet implemented');
      return null;
    },
  };

  // Get activeWizardType with explicit typing (Requirement 1.2)
  const activeWizardType = useAppStore((state) => state.activeWizardType) as WizardType | null;

  // Toast for user feedback (Requirement 5.3, 9.1)
  const { toast } = useToast();

  // Initialize Ollama on app startup
  useOllamaInit();

  // Initialize global keyboard shortcuts
  useGlobalKeyboardShortcuts();

  // Initialize voice hotkey for speech recognition
  useVoiceHotkey();

  // Initialize global system voice commands (undo, redo, save, navigate)
  useSystemVoiceCommands();

  // Initialize Neural Intent Engine (V2 Orchestrator)
  useNeuralAssistant();

  // Restore characters from localStorage on app load (Requirement 8.4)
  // useCharacterRestoration(); // Disabled to prevent mixing characters between projects

  // State for feedback panel initial context
  const [feedbackInitialContext, setFeedbackInitialContext] = useState<FeedbackInitialContext | undefined>(undefined);

  // Initialize global error handler (Requirements: 2.3)
  useEffect(() => {
    const openFeedbackPanelWithContext = (context: FeedbackInitialContext) => {
      console.log('Opening feedback panel with error context:', context);
      setFeedbackInitialContext(context);
      setShowFeedbackPanel(true);
    };

    globalErrorHandler.initialize(openFeedbackPanelWithContext);

    return () => {
      globalErrorHandler.cleanup();
    };
  }, [setShowFeedbackPanel]);

  // Clear feedback initial context when panel closes
  useEffect(() => {
    if (!showFeedbackPanel) {
      setFeedbackInitialContext(undefined);
    }
  }, [showFeedbackPanel]);

  // Initialize LLM configuration service (NEW)
  useEffect(() => {
    async function initializeLLM() {
      // Migrate legacy configurations
      await initializeLLMConfig();

      // Initialize unified service
      await initializeLLMConfigService();
    }

    initializeLLM();
  }, []);

  // Validate experimental features registry on startup (Requirements: 4.5)
  useEffect(() => {
    validateFeatureRegistry();
  }, []);

  // Initialize theme system on app startup
  useEffect(() => {
    // Sync theme with system preferences and user saved preferences
    useThemeStore.getState().syncWithSystem();
  }, []);

  useEffect(() => {
    serviceStatusMonitor.start();
    return () => {
      serviceStatusMonitor.stop();
    };
  }, []);

  // Handle global capture-screen event
  useEffect(() => {
    const handleCaptureScreen = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const displayIndex = customEvent.detail?.displayIndex || 0;
      
      try {
        console.log(`[App] Triggering screen capture for display ${displayIndex}`);
        const base64Image = await window.electronAPI.screen.capture({ displayIndex });
        
        if (base64Image) {
          const timestamp = new Date().getTime();
          const filename = `capture_${timestamp}.png`;
          const projectPath = project?.path;
          
          const result = await window.electronAPI.screen.saveCapture(base64Image, filename, projectPath);
          
          if (result.success) {
            toast({
              title: 'Capture d\'écran réussie',
              description: `Image sauvegardée : ${result.path}`,
            });
          } else {
            throw new Error('Failed to save capture');
          }
        }
      } catch (error) {
        console.error('Screen capture failed:', error);
        toast({
          title: 'Erreur de capture',
          description: error instanceof Error ? error.message : 'Une erreur est survenue lors de la capture.',
          variant: 'destructive',
        });
      }
    };

    window.addEventListener('storycore:capture-screen', handleCaptureScreen);
    return () => {
      window.removeEventListener('storycore:capture-screen', handleCaptureScreen);
    };
  }, [project, toast]);

  // Generation notifications (Toasts)
  const handleGenerationCompleted = useCallback((payload: GenerationCompletedPayload) => {
    const isSuccess = payload.status === 'completed';
    
    toast({
      title: isSuccess ? 'Generation Complete' : 'Generation Failed',
      description: isSuccess 
        ? `Successfully generated ${payload.type}: "${payload.prompt.substring(0, 50)}..."`
        : `Error generating ${payload.type}: ${payload.error || 'Unknown error'}`,
      variant: isSuccess ? 'default' : 'destructive',
      duration: 5000,
    });
  }, [toast]);

  useEffect(() => {
    const sub = eventEmitter.on(WizardEventType.GENERATION_COMPLETED, handleGenerationCompleted);
    return () => sub.unsubscribe();
  }, [handleGenerationCompleted]);

  const location = useLocation();
  const navigate = useNavigate();

  // Ref to track if we are currently loading a project to avoid concurrent loads
  const isSyncingRef = useRef(false);

  // Handle URL changes to load project if needed
  useEffect(() => {
    async function syncUrlWithProject() {
      if (!window.electronAPI) {
         if (setIsInitialLoading) setIsInitialLoading(false);
         return;
      }
      if (isSyncingRef.current) return;

      const pathParts = location.pathname.split('/');
      const projectIndex = pathParts.indexOf('project');
      
      if (projectIndex !== -1 && pathParts[projectIndex + 1]) {
        const encodedPath = pathParts[projectIndex + 1];
        const projectPath = decodeURIComponent(encodedPath);
        
        // Normalize paths for comparison (handle Windows backslashes, case-insensitivity, and trailing slashes)
        const normalize = (p: string) => {
          if (!p) return '';
          let normalized = p.replace(/\\/g, '/').toLowerCase();
          // Remove trailing slash if present
          if (normalized.endsWith('/')) {
            normalized = normalized.substring(0, normalized.length - 1);
          }
          return normalized;
        };

        const normalizedUrlPath = normalize(projectPath);
        const currentStorePath = project?.path || (project?.metadata?.path as string) || '';
        const normalizedStorePath = normalize(currentStorePath);
        
        // If no project is loaded, or a different project is in the URL, load it
        const needsLoading = !project || normalizedUrlPath !== normalizedStorePath;
        
        // Detailed logging for debugging loops
        console.log(`[App] Sync check: URL="${normalizedUrlPath}", Store="${normalizedStorePath}", storeHasProject=${!!project}, needsLoading=${needsLoading}`);
        
        // Detect if the path is likely just a UUID (not a real path)
        // UUIDs are typically 36 chars: 8-4-4-4-12 hex chars
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const isUuid = uuidRegex.test(projectPath);
        const isLikelyPath = !isUuid && (projectPath.includes('/') || projectPath.includes('\\') || projectPath.includes(':'));

        if (needsLoading && isLikelyPath) {
          console.log(`[App] Triggering project load for: "${projectPath}"`);
          
          isSyncingRef.current = true;
          if (setIsInitialLoading) setIsInitialLoading(true);
          
          try {
            const api = (window as unknown as { electronAPI: import('./types').ElectronAPI }).electronAPI;
            if (api.project && api.project.open) {
              const electronProject = await api.project.open(projectPath);
              
              if (electronProject) {
                const storeProject = convertElectronProjectToStore(electronProject) as import('./types').Project;
                
                // Ensure the path in the store matches the path we used to open it 
                // to prevent mismatch on next effect run
                if (!storeProject.path) storeProject.path = projectPath;
                if (storeProject.metadata && !storeProject.metadata.path) {
                  storeProject.metadata.path = projectPath;
                }
                
                // Load additional entities
                let characters: import('./types/character').Character[] = [];
                let worlds: import('./types').World[] = [];
                let locations: import('./types').Location[] = [];
                let stories: import('./types/story').Story[] = [];
                let sequences: import('./types').SequencePlan[] = [];
                
                try {
                  // Fallback to fs scanning if specialized API is missing or fails
                  const scanDir = async (dirName: string, subFile?: string) => {
                    const dirPath = `${projectPath}/${dirName}`;
                    const items = [];
                    try {
                      if (api.fs && await api.fs.exists(dirPath)) {
                        const files = await api.fs.readdir(dirPath);
                        for (const file of files) {
                          try {
                            const itemPath = subFile ? `${dirPath}/${file}/${subFile}` : `${dirPath}/${file}`;
                            if (await api.fs.exists(itemPath)) {
                              const buffer = await api.fs.readFile(itemPath);
                              const json = JSON.parse(new TextDecoder().decode(buffer));
                              items.push(json);
                            } else if (file.endsWith('.json') || file.endsWith('.md')) {
                              // Direct file
                              const buffer = await api.fs.readFile(`${dirPath}/${file}`);
                              const content = new TextDecoder().decode(buffer);
                              if (file.endsWith('.json')) {
                                items.push(JSON.parse(content));
                              } else {
                                // For markdown, we might need a parser, but for now just basic meta
                                items.push({ id: file, title: file, type: 'markdown' });
                              }
                            }
                          } catch (e) {
                            console.warn(`[App] Failed to load item ${file} in ${dirName}:`, e);
                          }
                        }
                      }
                    } catch (e) {
                      console.warn(`[App] Directory scan failed for ${dirName}:`, e);
                    }
                    return items;
                  };

                  if (api.character?.list) characters = await api.character.list(projectPath);
                  else characters = await scanDir('characters', 'character.json');

                  if (api.world?.list) worlds = await api.world.list(projectPath);
                  else worlds = await scanDir('worlds');

                  if (api.location?.list) locations = await api.location.list(projectPath);
                  else locations = await scanDir('locations');

                  if (api.story?.list) stories = await api.story.list(projectPath);
                  else stories = await scanDir('stories');
                  
                  // If stories empty, check 'story' (singular) for legacy
                  if (stories.length === 0) {
                     const legacyStories = await scanDir('story');
                     if (legacyStories.length > 0) stories = legacyStories;
                  }

                  if (api.sequence?.getAll) sequences = await api.sequence.getAll(projectPath);
                  else if (api.sequence?.list) sequences = await api.sequence.list(projectPath);
                  else sequences = await scanDir('sequences');

                } catch (e) {
                  console.warn('[App] Failed to load some project entities:', e);
                }

                const finalProject = {
                  ...storeProject,
                  characters: characters?.length > 0 ? characters : storeProject.characters || [],
                  worlds: worlds?.length > 0 ? worlds : storeProject.worlds || [],
                  locations: locations?.length > 0 ? locations : storeProject.locations || [],
                  objects: storeProject.objects || [],
                  stories: stories?.length > 0 ? stories : storeProject.stories || [],
                  sequencePlans: (sequences?.length > 0 ? sequences : storeProject.sequencePlans) || []
                };

                // Use the service to load into stores
                await projectCreationService.loadProjectIntoStores(finalProject as import('./types').Project, projectPath, finalProject.sequencePlans);
                console.log('[App] Project successfully loaded into stores');
              } else {
                console.error('[App] Failed to open project: electronProject is null');
                toast({
                  variant: 'destructive',
                  title: 'Load Error',
                  description: 'Could not open the project directory.',
                });
                navigate('/');
              }
            }
          } catch (error) {
            console.error('[App] Exception while loading project from URL:', error);
            toast({
              variant: 'destructive',
              title: 'Load Error',
              description: 'An error occurred while loading the project.',
            });
            navigate('/');
          } finally {
            isSyncingRef.current = false;
            if (setIsInitialLoading) setIsInitialLoading(false);
          }
        } else {
          // Project already loaded and matches URL, ensure we're not showing loader
          if (isInitialLoading && setIsInitialLoading) {
            console.log('[App] Project already loaded and matches URL. Hiding loader.');
            setIsInitialLoading(false);
          }
        }
      } else {
        // Not on a specific project path, or path is incomplete
        if (isInitialLoading && setIsInitialLoading) {
          setIsInitialLoading(false);
        }
      }
    }

    syncUrlWithProject();
    // We intentionally only depend on paths and specific flags to avoid infinite loops 
    // when other project properties (like characters or shots) update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    location.pathname, 
    location.search,
    project?.path, 
    project?.metadata?.path, 
    toast, 
    navigate, 
    setIsInitialLoading
  ]);


  // Listen for navigation events from menu bar
  useEffect(() => {
    const handleNavigateToDashboard = () => {
      setCurrentView('dashboard');
      setSelectedSequenceId(undefined);
    };

    const handleExitProject = () => {
      // Clear the project and navigate to dashboard
      setProject(null);
      setShots([]);
      setCurrentView('dashboard');
      setSelectedSequenceId(undefined);

      // Also dispatch navigate-to-dashboard as a fallback
      setTimeout(() => {
        setCurrentView('dashboard');
      }, 100);
    };

    window.addEventListener('storycore:navigate-to-dashboard', handleNavigateToDashboard);
    window.addEventListener('storycore:exit-project', handleExitProject);

    const handleNavigateToExperimentalAI = () => {
      setCurrentView('experimental-ai');
      setSelectedSequenceId(undefined);
    };

    window.addEventListener('storycore:navigate-to-experimental-ai', handleNavigateToExperimentalAI);

    return () => {
      window.removeEventListener('storycore:navigate-to-dashboard', handleNavigateToDashboard);
      window.removeEventListener('storycore:exit-project', handleExitProject);
      window.removeEventListener('storycore:navigate-to-experimental-ai', handleNavigateToExperimentalAI);
    };
  }, [setProject, setShots, setCurrentView, setSelectedSequenceId]);

  // handleNewProject removed - use store actions directly or via menuActions

  // Project command handlers removed - replaced by direct store actions in menuActions
  // handleOpenProject, handleSaveProject, handleExportProject, handleCloseProject removed as per instructions.

  const handleInstallationComplete = () => {
    setInstallationComplete(true);
    setShowInstallationWizard(false);
  };

  const handleCloseInstallationWizard = () => {
    setShowInstallationWizard(false);
  };

  const handleWorldComplete = (world: World, nextAction?: string) => {
    try {
      if (!world || !world.id) {
        throw new Error('Invalid world data');
      }

      // Valider que le monde a été ajouté au store
      const state = useAppStore.getState();
      const worldExists = state.worlds?.some(w => w.id === world.id);

      if (!worldExists) {
        logger.warn('World created but not found in store after creation');
        toast({
          title: 'Warning',
          description: 'World created but not found in store',
          variant: 'destructive',
        });
      }

      setShowWorldWizard(false);

      toast({
        title: 'Success',
        description: `World "${world.name}" created successfully`,
      });

      // Handle chaining
      if (nextAction === 'create-character') {
        // characterWizardWorldContext is no longer used, but we still need to show the wizard
        setShowCharacterWizard(true);
      } else if (nextAction === 'create-location') {
        // TODO: Implement location wizard chaining
        // Currently we don't have a standalone Location Wizard modal exposed in App.tsx easily
        // But we can add it later.
        toast({
          title: 'Info',
          description: 'Location wizard chaining coming soon',
        });
      }

    } catch (error) {
      console.error('Failed to complete world wizard:', error);

      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create world',
        variant: 'destructive',
      });
    }
  };

  const handleCharacterComplete = (character: Character) => {
    try {
      if (!character || !character.character_id) {
        throw new Error('Invalid character data');
      }

      // FIX: Ensure character is properly synced to both stores
      // 1. Add to Zustand store (main store for UI components)
      const store = useStore.getState();
      const characterExistsInStore = store.characters?.some(
        c => c.character_id === character.character_id
      );

      if (!characterExistsInStore) {
        useStore.getState().addCharacter(character);
        devLog('[App] Character added to Zustand store:', character.character_id);
      }

      // 2. Sync to App store project characters
      const currentProject = useAppStore.getState().project;
      if (currentProject) {
        const projectCharacters = currentProject.characters || [];
        const characterExistsInProject = projectCharacters.some(
          c => c.character_id === character.character_id
        );

        if (!characterExistsInProject) {
          useAppStore.setState({
            project: {
              ...currentProject,
              characters: [...projectCharacters, character]
            }
          });
          devLog('[App] Character synced to project:', character.character_id);
        }
      }

      // 3. Trigger store sync to ensure all components see the update
      const updatedProject = useAppStore.getState().project;
      if (updatedProject) {
        useStore.getState().setProject(updatedProject);
        console.log('[App] Full project sync triggered');
      }

      setShowCharacterWizard(false);

      toast({
        title: 'Success',
        description: `Character "${character.name}" created successfully`,
      });
    } catch (error) {
      console.error('Failed to complete character wizard:', error);

      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create character',
        variant: 'destructive',
      });
    }
  };

  const handleScenarioComplete = (story: Partial<Story>) => {
    devLog('Scenario building complete:', story);
    setShowScenarioBuilder(false);
    toast({
      title: 'Scenario Created',
      description: `Story structure for "${story.title}" generated`,
    });
  };

  const handleDialogueBuilderComplete = (data: DialogueBuilderData, result?: string) => {
    devLog('Dialogue building complete:', data);
    setShowDialogueBuilder(false);
    if (result) {
      toast({
        title: 'Dialogue Forge Complete',
        description: 'New dialogue has been generated and refined',
      });
    }
  };

  const handleObjectComplete = (object: Partial<StoryObject>) => {
    try {
      if (!object || !object.id) {
        throw new Error('Invalid object data');
      }

      // Add to Zustand store
      const store = useStore.getState();
      const objectExistsInStore = store.objects?.some(
        o => o.id === object.id
      );

      if (!objectExistsInStore) {
        useStore.getState().addObject(object as StoryObject);
        devLog('[App] Object added to Zustand store:', (object as StoryObject).id);
      }

      // Sync to App store project objects
      const currentProject = useAppStore.getState().project;
      if (currentProject) {
        const projectObjects = currentProject.objects || [];
        const objectExistsInProject = projectObjects.some(
          o => o.id === object.id
        );

        if (!objectExistsInProject) {
          useAppStore.setState({
            project: {
              ...currentProject,
              objects: [...projectObjects, object as StoryObject]
            }
          });
          devLog('[App] Object synced to project:', (object as StoryObject).id);
        }
      }

      // Trigger store sync
      const updatedProject = useAppStore.getState().project;
      if (updatedProject) {
        useStore.getState().setProject(updatedProject);
        console.log('[App] Full project sync triggered');
      }

      setShowObjectWizard(false);

      toast({
        title: 'Success',
        description: `Object "${object.name}" created successfully`,
      });
    } catch (error) {
      console.error('Failed to complete object wizard:', error);

      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create object',
        variant: 'destructive',
      });
    }
  };

  const handleStorytellerComplete = async (story: Story) => {
    try {
      const storyData = story;
      if (!storyData || !storyData.id) {
        throw new Error('Invalid story data');
      }

      // Initialize the first shot/sequence with the story intro
      // This corresponds to the intro.md file content
      const introPart = storyData.parts?.find(p => p.type === 'intro' || p.title?.toLowerCase().includes('intro'));
      const introContent = introPart ? introPart.content : (storyData.summary || storyData.content?.substring(0, 500));

      if (introContent && project) {
        try {
          const { createShot } = useEditorStore.getState();
          await createShot({
            title: 'Intro',
            description: introContent,
            duration: 5, // Default duration for intro
          });
          console.log('[App] First shot initialized from story intro');
        } catch (error) {
          console.error('[App] Failed to create initial shot:', error);
        }
      }

      setShowStorytellerWizard(false);

      toast({
        title: 'Story Created',
        description: `"${storyData.title || 'Untitled Story'}" has been generated and saved. Initial shot created.`,
      });
    } catch (error) {
      console.error('Failed to complete storyteller wizard:', error);

      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create story',
        variant: 'destructive',
      });
    }
  };

  // Sequence Plan Wizard Handler
  const handleSequencePlanComplete = (plan: SequencePlan) => {
    // Log event in development
    if (import.meta.env.DEV) {
      devLog('Sequence plan complete:', plan.id);
    }
    // Save to project structure
    if (project) {
      const updatedProject = { ...project };
      // Assuming project has a sequences array or we store it in metadata for now
      // Update sequencePlans array in project
      const sequencePlans = updatedProject.sequencePlans || [];
      const existingIndex = sequencePlans.findIndex((s) => s.id === plan.id);

      if (existingIndex >= 0) {
        sequencePlans[existingIndex] = plan;
      } else {
        sequencePlans.push(plan);
      }

      updatedProject.sequencePlans = sequencePlans;
      setProject(updatedProject);

      // If a preferred engine is selected, trigger production automatically
      if (plan.preferredEngine) {
        import('@/services/wanVideoService').then(({ wanVideoService }) => {
          wanVideoService.generateSequence({
            projectId: updatedProject.id,
            sceneId: plan.id,
            sceneDescription: plan.description || plan.name,
            engine: plan.preferredEngine,
            overrides: {
              plan: plan
            }
          }, () => {
            // progress logging disabled to reduce console noise unless needed
          }).then(() => {
            toast({
              title: 'Production Started',
              description: `Generating via ${plan.preferredEngine}...`
            });
          }).catch(err => {
            console.error('Production failed:', err);
            toast({
              title: 'Production Error',
              description: err.message,
              variant: 'destructive'
            });
          });
        });
      }
    }

    console.log('Sequence Plan saved:', plan);
    closeSequencePlanWizard();
    toast({
      title: 'Sequence Plan Saved',
      description: `The plan "${plan.name}" has been successfully saved.`
    });
  };

  // Shot Wizard Handler
  const handleShotComplete = (shot: Shot) => {
    // Use store actions to update shots
    const { shots, addShot, updateShot } = useAppStore.getState();
    const existingShot = shots.find(s => s.id === shot.id);

    if (existingShot) {
      updateShot(shot.id, shot);
    } else {
      addShot(shot);
    }

    console.log('Shot saved:', shot);
    closeShotWizard();
    toast({
      title: 'Plan (Shot) sauvegardé',
      description: `Le plan "${shot.title}" a été enregistré avec succès.`
    });
  };

  // Generic wizard completion handler (Requirement 5.3, 9.1)
  const handleWizardComplete = (data: unknown) => {
    const wizardData = data as Record<string, unknown>;
    // Integrate wizard results into project based on wizard type (Requirement 5.3)
    if (activeWizardType && project) {
      switch (activeWizardType) {
        case 'dialogue-writer': {
          // Add generated dialogue to project metadata
          // In a real implementation, this would update specific shots with dialogue
          const updatedProjectWithDialogue = {
            ...project,
            metadata: {
              ...project.metadata,
              lastDialogueGeneration: {
                timestamp: Date.now(),
                data,
              },
            },
          };
          setProject(updatedProjectWithDialogue);

          toast({
            title: 'Dialogue Generated',
            description: `Dialogue has been generated for ${(wizardData.characters as unknown[])?.length || 0} characters`,
          });
          break;
        }

        case 'scene-generator': {
          // Add generated scene to project metadata
          // In a real implementation, this would create new shots
          const updatedProjectWithScene = {
            ...project,
            metadata: {
              ...project.metadata,
              lastSceneGeneration: {
                timestamp: Date.now(),
                data,
              },
            },
          };
          setProject(updatedProjectWithScene);

          toast({
            title: 'Scene Generated',
            description: `Scene "${wizardData.concept as string}" has been generated`,
          });
          break;
        }

        case 'storyboard-creator': {
          // Add storyboard metadata to project
          // In a real implementation, this would create/update shots based on mode
          const updatedProjectWithStoryboard = {
            ...project,
            metadata: {
              ...project.metadata,
              lastStoryboardGeneration: {
                timestamp: Date.now(),
                mode: wizardData.mode as string,
                data,
              },
            },
          };
          setProject(updatedProjectWithStoryboard);

          toast({
            title: 'Storyboard Created',
            description: `Storyboard has been ${(wizardData.mode as string) === 'replace' ? 'created' : 'appended'} with ${wizardData.visualStyle as string} style`,
          });
          break;
        }

        case 'style-transfer': {
          // Apply style to selected shot
          // In a real implementation, this would update the shot's style parameters
          const updatedProjectWithStyle = {
            ...project,
            metadata: {
              ...project.metadata,
              lastStyleTransfer: {
                timestamp: Date.now(),
                shotId: wizardData.shotId as string,
                styleImage: (wizardData.styleReferenceImage as { name?: string })?.name,
              },
            },
          };
          setProject(updatedProjectWithStyle);

          toast({
            title: 'Style Applied',
            description: 'Style has been applied to the selected shot',
          });
          break;
        }
      }
    }

    closeActiveWizard();
  };

  // ============================================================================
  // Modal Renderer - SINGLE INSTANCE (Fixes modal duplication issue)
  // ============================================================================
  // All modals are now rendered ONCE at the root level to prevent:
  // - Duplicate event handlers
  // - State conflicts between modal instances
  // - Memory leaks from multiple modal instances
  const renderModals = () => (
    <Suspense fallback={null}>
      <>
      {/* Installation Wizard Modal */}
      <InstallationWizardModal
        isOpen={showInstallationWizard}
        onClose={handleCloseInstallationWizard}
        onComplete={handleInstallationComplete}
      />

      {/* World Wizard Modal */}
      <WorldWizardModal
        isOpen={showWorldWizard}
        onClose={() => setShowWorldWizard(false)}
        onComplete={handleWorldComplete}
        initialData={project?.worlds?.[0] || {
          // Pre-fill genre and tone from project setup
          genre: (project?.projectSetup?.genre as Genre[]) || [],
          tone: (project?.projectSetup?.tone as Tone[]) || [],
        }}
      />

      {/* Character Wizard Modal */}
      <CharacterWizardModal
        onComplete={handleCharacterComplete}
        isOpen={showCharacterWizard}
        onClose={() => setShowCharacterWizard(false)}
        worldContext={project?.worlds?.find(w => w.id === project.selectedWorldId) || project?.worlds?.[0]}
        productionMode={project?.projectSetup?.productionMode}
        initialData={{
          // Pre-fill genre and tone from project setup to aid AI
          role: {
            archetype: (project?.projectSetup?.genre?.[0] || '') as string,
            narrative_function: '',
            character_arc: '',
          },
          // If launched from chatbox with context
          ...(characterWizardContext?.imageFile && { 
            visual_identity: { 
              generated_portrait: URL.createObjectURL(characterWizardContext.imageFile) 
            } as Character['visual_identity']
          }),
          ...(characterWizardContext?.name && { name: characterWizardContext.name }),
          ...(characterWizardContext?.role && { 
            role: { 
              archetype: characterWizardContext.role || '',
              narrative_function: '',
              character_arc: '',
            } 
          }),
        } as Partial<Character>}
        initialImage={characterWizardContext?.imageFile}
      />

      {/* Scenario Builder Wizard Modal */}
      <ScenarioBuilderWizardModal
        isOpen={showScenarioBuilder}
        onClose={() => setShowScenarioBuilder(false)}
        onComplete={handleScenarioComplete}
        initialData={project?.stories?.[0] || {
          genre: project?.projectSetup?.genre,
          tone: project?.projectSetup?.tone,
        }}
      />

      {/* Dialogue Builder Wizard Modal */}
      <DialogueBuilderWizardModal
        isOpen={showDialogueBuilder}
        onClose={() => setShowDialogueBuilder(false)}
        onComplete={handleDialogueBuilderComplete}
        initialData={{
          tone: project?.projectSetup?.tone?.[0] || 'Casual',
        }}
      />

      {/* Documentation Modal */}
      <DocumentationModal
        isOpen={showDocumentationModal}
        onClose={() => setShowDocumentationModal(false)}
      />

      {/* Object Wizard Modal */}
      <ObjectWizardModal
        isOpen={showObjectWizard}
        onClose={() => setShowObjectWizard(false)}
        onComplete={handleObjectComplete}
        initialData={{
          ...(objectWizardContext?.imageFile && { 
            imageUrl: URL.createObjectURL(objectWizardContext.imageFile) 
          }),
          ...(objectWizardContext?.name && { name: objectWizardContext.name }),
        }}
      />

      {/* Location Wizard Placeholder (Linked to LocationsModal for now) */}
      {showLocationWizard && (
        <LocationsModal
          isOpen={showLocationWizard}
          onClose={() => setShowLocationWizard(false)}
          // Since there's no LocationWizard yet, we just open the modal
        />
      )}

      {/* Storyteller Wizard Modal */}
      <StorytellerWizardModal
        isOpen={showStorytellerWizard}
        onClose={() => setShowStorytellerWizard(false)}
        onComplete={handleStorytellerComplete}
        initialData={{
          // Pre-fill genre and tone from project setup
          genre: project?.projectSetup?.genre,
          tone: project?.projectSetup?.tone,
        }}
      />

      {/* Project Setup Wizard Modal */}
      <CreateProjectDialogModal />
      <ProjectSetupWizardModal />

      {/* Production Wizards */}
      <SequencePlanWizardModal
        isOpen={showSequencePlanWizard}
        onClose={closeSequencePlanWizard}
        onComplete={handleSequencePlanComplete}
        mode={sequencePlanWizardContext?.mode || 'create'}
        initialPlan={sequencePlanWizardContext?.existingSequencePlan as SequencePlan}
      />
      <ShotWizardModal
        isOpen={showShotWizard}
        onClose={closeShotWizard}
        onComplete={handleShotComplete}
        mode={shotWizardContext?.mode || 'create'}
        initialShot={shotWizardContext?.existingShot as Shot}
        sequenceId={shotWizardContext?.sequenceId}
      />

      {/* Specialty Wizards */}
      <RogerWizardModal />
      <GhostTrackerWizardModal />
      <DialogueWriterWizardModal />
      <LipSyncWizardModal />
      <AudioProductionWizardModal />
      <VideoEditorWizardModal />
      <ComicToSequenceWizardModal />
      <MarketingWizardModal />
      
      {/* Project Translator Modal */}
      <ProjectTranslatorModal
        isOpen={showProjectTranslator}
        onClose={() => setShowProjectTranslator(false)}
        projectId={project?.id || ''}
        projectData={(project as unknown as Record<string, unknown>) || {}}
      />

      {/* tttLRM Reconstruction Modal */}
      <TTTLRMModal />

      {/* Video Publisher Modal */}
      <VideoPublisherEditor
        isOpen={showVideoPublisher}
        onClose={() => setShowVideoPublisher(false)}
      />

      {/* Credits Screen Modal */}
      <CreditsScreenModal />

      {/* Generic Wizard Modal (Requirements 1.2, 1.3, 1.4) */}
      <GenericWizardModal
        isOpen={activeWizardType !== null}
        wizardType={activeWizardType}
        onClose={closeActiveWizard}
        onComplete={handleWizardComplete}
      />

      {/* Unified LLM Config Dialog (used by both Menu Bar and Chatbot) */}
      <Suspense fallback={null}>
        <LLMConfigDialog
          open={showLLMSettings}
          onOpenChange={setShowLLMSettings}
          currentConfig={llmConfig}
          onSave={updateConfig}
          onValidateConnection={validateLLMConnection}
        />
      </Suspense>

      {/* ComfyUI Settings Modal */}
      <ComfyUISettingsModal
        isOpen={showComfyUISettings}
        onClose={() => setShowComfyUISettings(false)}
      />

      {/* General Settings Window */}
      <GeneralSettingsWindow
        isOpen={showGeneralSettings}
        onClose={() => setShowGeneralSettings(false)}
      />

      {/* Add-ons Modal */}
      <AddonsModal
        isOpen={showAddonsModal}
        onClose={() => setShowAddonsModal(false)}
      />

      {/* Addon Settings Modal (Individual) */}
      <AddonSettingsModal
        isOpen={!!settingsAddonId}
        onClose={closeAddonSettings}
        addonId={settingsAddonId || ''}
        addonName={settingsAddonName}
      />

      {/* Characters Modal */}
      <CharactersModal
        isOpen={showCharactersModal}
        onClose={() => setShowCharactersModal(false)}
      />

      {/* World Modal */}
      <WorldModal
        isOpen={showWorldModal}
        onClose={() => setShowWorldModal(false)}
      />

      {/* Locations Modal */}
      <LocationsModal
        isOpen={showLocationsModal}
        onClose={() => setShowLocationsModal(false)}
      />

      {/* Objects Modal */}
      <ObjectsModal
        isOpen={showObjectsModal}
        onClose={() => setShowObjectsModal(false)}
      />

      {/* Image Gallery Modal */}
      <ImageGalleryModal
        isOpen={showImageGalleryModal}
        onClose={() => setShowImageGalleryModal(false)}
      />

      {/* Vault Modal */}
      <VaultModal
        isOpen={useAppStore.getState().showVaultModal}
        onClose={() => useAppStore.getState().setShowVaultModal(false)}
      />

      {/* Dialogue Editor */}
      <DialogueEditor
        isOpen={showDialogueEditor}
        onClose={() => setShowDialogueEditor(false)}
      />

      <AboutModal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
      />

      <MoodboardModal
        isOpen={showMoodboardModal}
        onClose={() => setShowMoodboardModal(false)}
      />

      {/* Feedback Panel */}
      <FeedbackPanel
        isOpen={showFeedbackPanel}
        onClose={() => setShowFeedbackPanel(false)}
        initialContext={feedbackInitialContext}
        onOpenPendingReports={() => setShowPendingReportsList(true)}
      />

      {/* Pending Reports List */}
      <PendingReportsList
        isOpen={showPendingReportsList}
        onClose={() => setShowPendingReportsList(false)}
      />

      {/* Fact Check Modal */}
      <FactCheckModal
        isOpen={showFactCheckModal}
        onClose={() => setShowFactCheckModal(false)}
      />

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsDialog
        isOpen={showKeyboardShortcutsDialog}
        onClose={() => setShowKeyboardShortcutsDialog(false)}
      />

      {/* Continuous Creation Modals */}
      {/* Reference Sheet Manager Modal */}
      <ReferenceSheetManager
        open={showReferenceSheetManager}
        onClose={() => setShowReferenceSheetManager(false)}
        projectId={project?.id || ''}
        projectPath={project?.path || ''}
        onSheetUpdate={() => {
          devLog('Reference sheet updated');
        }}
      />

      {/* Video Replication Dialog */}
      <VideoReplicationDialog
        open={showVideoReplicationDialog}
        onClose={() => setShowVideoReplicationDialog(false)}
        onReplicationComplete={(_projectId) => {
          devLog('Video replication started:', _projectId);
          toast({
            title: 'Replication Started',
            description: 'Video replication process has begun',
          });
        }}
      />

      {/* Cross-Shot Reference Picker */}
      {showCrossShotReferencePicker && (
        <CrossShotReferencePicker
          currentShotId={selectedShotId || ''}
          sequenceId="" // This could be enhanced to find the sequence ID of the shot
          onSelect={(_refs) => {
            devLog('Borrowed references:', _refs);
            setShowCrossShotReferencePicker(false);
            toast({
              title: 'References Borrowed',
              description: `Successfully borrowed ${_refs.length} references`,
            });
          }}
          onClose={() => setShowCrossShotReferencePicker(false)}
        />
      )}

      {/* Project Branching Dialog */}
      <ProjectBranchingDialog
        open={showProjectBranchingDialog}
        onClose={() => setShowProjectBranchingDialog(false)}
        currentProjectId={project?.id || ''}
        currentShotId={selectedShotId || undefined}
        onBranchCreated={(_branch) => {
          devLog('Branch created:', _branch);
          toast({
            title: 'Branch Created',
            description: `Started new branch: ${_branch.name}`,
          });
        }}
      />

      {/* Episode Reference Dialog */}
      <EpisodeReferenceDialog
        open={showEpisodeReferenceDialog}
        onClose={() => setShowEpisodeReferenceDialog(false)}
        currentProjectId={project?.id || ''}
        onReferenceAdded={(_ref) => {
          devLog('Episode reference added:', _ref);
          toast({
            title: 'Reference Linked',
            description: `Linked to ${_ref.episodeName}`,
          });
        }}
      />

      {/* Narrative Discovery Lab (P0 R&D) */}
      {showDiscoveryLab && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col">
          <div className="absolute top-4 right-6 z-[110]">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowDiscoveryLab(false)}
              className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-full"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
          <DiscoveryLab />
        </div>
      )}

      {/* Compute Marketplace Dashboard */}
      {showComputeDashboard && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col p-10 overflow-auto">
          <div className="absolute top-4 right-6 z-[110]">
            <Button 
              variant="secondary" 
              size="icon" 
              onClick={() => setShowComputeDashboard(false)}
              className="rounded-full"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
          <ComputeDashboard />
        </div>
      )}

      {/* Automation Studio & n8n Panel */}
      {showAutomationPanel && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex flex-col p-4 md:p-8 overflow-auto">
          <div className="absolute top-4 right-6 z-[110]">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowAutomationPanel(false)}
              className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-full"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
          <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col">
            <AutomationPanel />
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <Toaster />
      </>
    </Suspense>
  );

  // Check for detached chat route
  const isDetachedChat = typeof window !== 'undefined' && window.location.pathname === '/detached-chat';

  if (isDetachedChat) {
    return <DetachedChatPage />;
  }

  // Show experimental features if one is selected (Requirements: 2.1, 2.2, 7.3)
  if (currentExperimentalFeature) {
    let ExperimentalPage: React.FC | null = null;

    switch (currentExperimentalFeature) {
      case 'advanced-grid-editor': {
        ExperimentalPage = AdvancedGridEditorPage;
        break;
      }
      case 'ai-assistant-v3': {
        ExperimentalPage = AIAssistantV3Page;
        break;
      }
      case 'performance-profiler': {
        ExperimentalPage = PerformanceProfilerPage;
        break;
      }
      default: {
        logger.warn(`Unknown experimental feature: ${currentExperimentalFeature}`);
        ExperimentalPage = null;
      }
    }

    if (ExperimentalPage) {
      return (
        <>
          <MenuBar
            project={project}
            hasUnsavedChanges={false}
            onProjectChange={handleProjectChange}
            onViewStateChange={handleViewStateChange}
            viewState={DEFAULT_VIEW_STATE} // Fallback
            undoStack={undoStack}
            clipboard={clipboard}
            isProcessing={false}
            selectedShotId={selectedShotId}
          />
          <ExperimentalPage />
          {/* Single instance of all modals - accessible from experimental pages */}
          {renderModals()}
        </>
      );
    }
  }

  // Check if we are on a project route
  const isProjectRoute = location.pathname.includes('/project/');

  // Initial loading state
  if (isInitialLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-semibold">Loading Project...</h2>
        <p className="text-muted-foreground text-center px-4">Synchronizing your creative world</p>
      </div>
    );
  }

  // Show landing page if no project is loaded and not a project route
  if (!project && !isProjectRoute) {
    return (
      <div className="flex flex-col min-h-screen">
        <MenuBar
          project={null}
          hasUnsavedChanges={false}
          onProjectChange={handleProjectChange}
          onViewStateChange={handleViewStateChange}
          viewState={viewState}
          undoStack={undoStack}
          clipboard={clipboard}
          isProcessing={false}
          selectedShotId={null}
        />
        <main className="flex-1 overflow-hidden">
          <LandingPageWithHooks />
        </main>
        {renderModals()}
      </div>
    );
  }

  // Full app layout with MenuBar and Router Outlet
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <MenuBar
        project={project}
        hasUnsavedChanges={hasUnsavedChanges}
        onProjectChange={handleProjectChange}
        onViewStateChange={handleViewStateChange}
        viewState={viewState}
        undoStack={undoStack}
        clipboard={clipboard}
        isProcessing={isProcessing}
        selectedShotId={selectedShotId}
      />
      <main className="flex-1 overflow-hidden relative">
        <Outlet />
      </main>
      
      {/* Single instance of all modals */}
      {renderModals()}
    </div>
  );
}

// Wrapper component with LanguageProvider, NavigationProvider, SecretModeProvider, LLMProvider, ScreenReaderAnnouncerProvider and ErrorBoundary
function App() {
  return (
    <ErrorBoundary>
      <DndProvider backend={HTML5Backend}>
        <I18nProvider defaultLanguage="en" enableAutoDetect={false}>
          <LanguageProvider>
            <NavigationProvider>
              <SecretModeProvider>
                <LLMProvider>
                  <ScreenReaderAnnouncerProvider>
                    <div className="relative min-h-screen">
                      <AppContent />

                      {/* Floating AI Assistant */}
                      <FloatingAIAssistant />

                      {/* Toggle Button */}
                      <ToggleButton position="bottom-right" />
                    </div>
                  </ScreenReaderAnnouncerProvider>
                </LLMProvider>
              </SecretModeProvider>
            </NavigationProvider>
          </LanguageProvider>
        </I18nProvider>
      </DndProvider>
    </ErrorBoundary>
  );
}

export default App;



