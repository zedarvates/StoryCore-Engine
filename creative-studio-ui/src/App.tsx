import { useState, useEffect, useCallback } from 'react';
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
import { LandingPageWithHooks } from '@/pages/LandingPageWithHooks';
import { EditorPageSimple } from '@/pages/EditorPageSimple';
import { ProjectDashboardPage } from '@/pages/ProjectDashboardPage';
import { AdvancedGridEditorPage } from '@/pages/experimental/AdvancedGridEditorPage';
import { AIAssistantV3Page } from '@/pages/experimental/AIAssistantV3Page';
import { PerformanceProfilerPage } from '@/pages/experimental/PerformanceProfilerPage';
import { DetachedChatPage } from '@/pages/DetachedChatPage';
import { InstallationWizardModal } from '@/components/installation/InstallationWizardModal';
import { WorldWizardModal } from '@/components/wizard/WorldWizardModal';
import { CharacterWizardModal } from '@/components/wizard/CharacterWizardModal';
import { ObjectWizardModal } from '@/components/wizard/ObjectWizardModal';
import { StorytellerWizardModal } from '@/components/wizard/StorytellerWizardModal';
import { ProjectSetupWizardModal } from '@/components/wizard/ProjectSetupWizardModal';
import { CreateProjectDialogModal } from '@/components/wizard/CreateProjectDialogModal';
import { SequencePlanWizardModal } from '@/components/wizard/SequencePlanWizardModal';
import { ShotWizardModal } from '@/components/wizard/ShotWizardModal';
import { GenericWizardModal } from '@/components/wizard/GenericWizardModal';
import { RogerWizardModal } from './components/wizard/RogerWizardModalWrapper';
import { GhostTrackerWizardModal } from './components/wizard/GhostTrackerWizardModal';
import { DialogueWriterWizardModal } from './components/wizard/DialogueWriterWizardModal';
import { LipSyncWizardModal } from './components/wizard/LipSyncWizardModal';
import { AudioProductionWizardModal } from '@/components/wizard/production/AudioProductionWizardModal';
import { VideoEditorWizardModal } from '@/components/wizard/production/VideoEditorWizardModal';
import { ComicToSequenceWizardModal } from '@/components/wizard/production/ComicToSequenceWizardModal';
import { MarketingWizardModal } from '@/components/wizard/marketing/MarketingWizardModal';
import { ScenarioBuilderWizardModal } from '@/components/wizard/ScenarioBuilderWizardModal';
import { DialogueBuilderWizardModal } from '@/components/wizard/DialogueBuilderWizardModal';
import { ProjectTranslatorModal } from '@/components/wizard/ProjectTranslatorModal';
import { TTTLRMModal } from '@/components/wizard/TTTLRMModal';
import { LLMSettingsModal } from '@/components/settings/LLMSettingsModal';
import { ComfyUISettingsModal } from '@/components/settings/ComfyUISettingsModal';
import { GeneralSettingsWindow } from '@/components/configuration/GeneralSettingsWindow';
import { AddonsModal } from '@/components/settings/AddonsModal';
import { AddonSettingsModal } from '@/components/settings/AddonSettingsModal';
import { CharactersModal } from '@/components/modals/CharactersModal';
import { WorldModal } from '@/components/modals/WorldModal';
import { LocationsModal } from '@/components/modals/LocationsModal';
import { ObjectsModal } from '@/components/modals/ObjectsModal';
import { ImageGalleryModal } from '@/components/modals/ImageGalleryModal';
import { VaultModal } from '@/components/modals/VaultModal';
import { FactCheckModal } from '@/components/modals/FactCheckModal';
import { AboutModal } from '@/components/modals/AboutModal';
import { DocumentationModal } from '@/components/modals/menuBar/DocumentationModal';
import { KeyboardShortcutsDialog } from '@/components/KeyboardShortcutsDialog';
import { FeedbackPanel } from '@/components/feedback/FeedbackPanel';
import { PendingReportsList } from '@/components/feedback/PendingReportsList';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ReferenceSheetManager } from '@/components/reference/ReferenceSheetManager';
import { VideoReplicationDialog } from '@/components/reference/VideoReplicationDialog';
import { CrossShotReferencePicker } from '@/components/reference/CrossShotReferencePicker';
import { ProjectBranchingDialog } from '@/components/reference/ProjectBranchingDialog';
import { EpisodeReferenceDialog } from '@/components/reference/EpisodeReferenceDialog';
import DialogueEditor from '@/ui/DialogueEditor';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { useOllamaInit } from '@/hooks/useOllamaInit';
import { useGlobalKeyboardShortcuts } from '@/hooks/useGlobalKeyboardShortcuts';
import { useVoiceHotkey } from '@/hooks/useVoiceHotkey';
import { useSystemVoiceCommands } from '@/hooks/useSystemVoiceCommands';
import { useNeuralAssistant } from '@/hooks/useNeuralAssistant';
import { initializeLLMConfigService } from '@/services/llmConfigService'; // NEW: Initialize unified LLM service
import { initializeLLMConfig } from '@/utils/migrateLLMConfig'; // NEW: Migrate legacy configs
import { globalErrorHandler } from '@/utils/globalErrorHandler'; // NEW: Global error handler
import { validateFeatureRegistry } from '@/config/experimentalFeatures'; // NEW: Validate experimental features registry
import { serviceStatusMonitor } from '@/services/ServiceStatusMonitor'; // NEW: Service status monitoring
import { addonManager } from '@/services/AddonManager';
import type { FeedbackInitialContext } from '@/components/feedback/types';
import { logger } from '@/utils/logger';
import { devLog } from '@/utils/devOnly';
import type { World } from '@/types/world';
import type { Character } from '@/types/character';
import { eventEmitter, WizardEventType, GenerationCompletedPayload } from '@/services/eventEmitter';
import { useThemeStore } from '@/stores/themeStore';
import { DialogueBuilderData } from '@/components/wizard/dialogue-builder/DialogueBuilderWizard';
import { DiscoveryLab } from '@/components/DiscoveryLab/DiscoveryLab';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';


function AppContent() {
  // Get secret mode context to check for experimental features
  const { currentExperimentalFeature } = useSecretMode();

  const {
    project,
    setProject,
    setShots,
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
    selectedShotId,
  } = useAppStore(useShallow((state) => ({
    project: state.project,
    setProject: state.setProject,
    setShots: state.setShots,
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
    // Generic wizard state (simple forms in GenericWizardModal)
    closeActiveWizard: state.closeActiveWizard,
    settingsAddonId: state.settingsAddonId,
    closeAddonSettings: state.closeAddonSettings,
    // Continuous Creation state mappings
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
    selectedShotId: state.selectedShotId,
  })));

  // MenuBar state management
  // Requirements: 1.1-15.6
  // NOTE: isProcessing and hasUnsavedChanges are currently static (not yet wired to actual state)
  // TODO: Wire these to actual processing/unsaved changes state when implemented
  const isProcessing = false;
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
  useEffect(() => {
    console.log('🔄 [App] Syncing project to main store:', project ? project.project_name : 'null');
    storeSetProject(project);
  }, [project, storeSetProject]);

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

  // Undo/Redo stack (stub implementation)
  // Requirements: 2.1-2.4
  // TODO: Integrate with actual undo/redo system when available
  const undoStack: UndoStack = {
    canUndo: false,
    canRedo: false,
    undo: () => {
      console.log('Undo operation not yet implemented');
    },
    redo: () => {
      console.log('Redo operation not yet implemented');
    },
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
  useEffect(() => {
    const handleGenerationCompleted = (payload: GenerationCompletedPayload) => {
      const isSuccess = payload.status === 'completed';
      
      toast({
        title: isSuccess ? 'Generation Complete' : 'Generation Failed',
        description: isSuccess 
          ? `Successfully generated ${payload.type}: "${payload.prompt.substring(0, 50)}..."`
          : `Error generating ${payload.type}: ${payload.error || 'Unknown error'}`,
        variant: isSuccess ? 'default' : 'destructive',
        duration: 5000,
      });
    };

    const sub = eventEmitter.on(WizardEventType.GENERATION_COMPLETED, handleGenerationCompleted);
    return () => sub.unsubscribe();
  }, [toast]);

  const [currentView, setCurrentView] = useState<'dashboard' | 'editor'>('dashboard');
  const [selectedSequenceId, setSelectedSequenceId] = useState<string | undefined>(undefined);

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

    return () => {
      window.removeEventListener('storycore:navigate-to-dashboard', handleNavigateToDashboard);
      window.removeEventListener('storycore:exit-project', handleExitProject);
    };
  }, [setProject, setShots]);

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
          genre: project?.projectSetup?.genre,
          tone: project?.projectSetup?.tone,
        }}
      />

      {/* Character Wizard Modal */}
      <CharacterWizardModal
        onComplete={handleCharacterComplete}
        isOpen={showCharacterWizard}
        onClose={() => setShowCharacterWizard(false)}
        worldContext={project?.worlds?.[0]}
        initialData={{
          // Pre-fill genre and tone from project setup to aid AI
          role: {
            archetype: project?.projectSetup?.genre?.[0] || '',
          } as Character['role'],
          // If we wanted to edit existing, we'd need a way to select which one
        }}
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
      />

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
        projectData={project || {}}
      />

      {/* tttLRM Reconstruction Modal */}
      <TTTLRMModal />

      {/* Generic Wizard Modal (Requirements 1.2, 1.3, 1.4) */}
      <GenericWizardModal
        isOpen={activeWizardType !== null}
        wizardType={activeWizardType}
        onClose={closeActiveWizard}
        onComplete={handleWizardComplete}
      />

      {/* LLM Settings Modal */}
      <LLMSettingsModal
        isOpen={showLLMSettings}
        onClose={() => setShowLLMSettings(false)}
      />

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

      <AboutModal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
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

      {/* Toast Notifications */}
      <Toaster />
    </>
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
          />
          <ExperimentalPage />
          {/* Single instance of all modals - accessible from experimental pages */}
          {renderModals()}
        </>
      );
    }
  }

  // Show landing page if no project is loaded (default view)
  if (!project) {
    return (
      <>
        <MenuBar
          project={project}
          hasUnsavedChanges={hasUnsavedChanges}
          onProjectChange={handleProjectChange}
          onViewStateChange={handleViewStateChange}
          viewState={viewState}
          undoStack={undoStack}
          clipboard={clipboard}
          isProcessing={isProcessing}
        />
        <LandingPageWithHooks />
        {/* Single instance of all modals */}
        {renderModals()}
      </>
    );
  }

  // Show editor or dashboard based on current view
  return (
    <>
      <MenuBar
        project={project}
        hasUnsavedChanges={hasUnsavedChanges}
        onProjectChange={handleProjectChange}
        onViewStateChange={handleViewStateChange}
        viewState={viewState}
        undoStack={undoStack}
        clipboard={clipboard}
        isProcessing={isProcessing}
      />
      {currentView === 'dashboard' ? (
        <ProjectDashboardPage onOpenEditor={(sequenceId) => {
          setSelectedSequenceId(sequenceId);
          setCurrentView('editor');
        }} />
      ) : (
        <EditorPageSimple
          sequenceId={selectedSequenceId}
          onBackToDashboard={() => {
            setSelectedSequenceId(undefined);
            setCurrentView('dashboard');
          }}
        />
      )}
      {/* Single instance of all modals - shared across all views */}
      {renderModals()}
    </>
  );
}

// Wrapper component with LanguageProvider, NavigationProvider, SecretModeProvider, LLMProvider and ErrorBoundary
function App() {
  return (
    <ErrorBoundary>
      <I18nProvider defaultLanguage="en" enableAutoDetect={false}>
        <LanguageProvider>
          <NavigationProvider>
            <SecretModeProvider>
              <LLMProvider>
                <div className="relative min-h-screen">
                  <AppContent />

                  {/* Floating AI Assistant */}
                  <FloatingAIAssistant />

                  {/* Toggle Button */}
                  <ToggleButton position="bottom-right" />
                </div>
              </LLMProvider>
            </SecretModeProvider>
          </NavigationProvider>
        </LanguageProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}

export default App;



