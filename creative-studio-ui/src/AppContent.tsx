import { useState, useEffect, useCallback, useRef } from 'react';
import type { StoryObject, SequencePlan, Shot } from '@/types';
import { useAppStore, type WizardType } from '@/stores/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@/store';
import { useEditorStore } from '@/stores/editorStore';
import type { Story } from '@/types/story';
import { useSecretMode } from '@/contexts/SecretModeContext';
import { DEFAULT_VIEW_STATE } from '@/types/menuBarState';
import { MenuBar } from '@/components/menuBar/MenuBar';
import { FloatingAIAssistant } from '@/components/FloatingAIAssistant';
import { ToggleButton } from '@/components/ToggleButton';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { projectCreationService, convertElectronProjectToStore } from '@/services/ProjectCreationService';
import { ModalManager } from '@/components/modals/ModalManager';
import { DetachedChatPage } from '@/pages/DetachedChatPage';
import { LandingPageWithHooks } from '@/pages/LandingPageWithHooks';
import { AdvancedGridEditorPage } from '@/pages/experimental/AdvancedGridEditorPage';
import { AIAssistantV3Page } from '@/pages/experimental/AIAssistantV3Page';
import { PerformanceProfilerPage } from '@/pages/experimental/PerformanceProfilerPage';
import { useToast } from '@/hooks/use-toast';
import { useOllamaInit } from '@/hooks/useOllamaInit';
import { useGlobalKeyboardShortcuts } from '@/hooks/useGlobalKeyboardShortcuts';
import { useVoiceHotkey } from '@/hooks/useVoiceHotkey';
import { useSystemVoiceCommands } from '@/hooks/useSystemVoiceCommands';
import { useNeuralAssistant } from '@/hooks/useNeuralAssistant';
import { initializeLLMConfigService } from '@/services/llmConfigService';
import { initializeLLMConfig } from '@/utils/migrateLLMConfig';
import { globalErrorHandler } from '@/utils/globalErrorHandler';
import { validateFeatureRegistry } from '@/config/experimentalFeatures';
import { serviceStatusMonitor } from '@/services/ServiceStatusMonitor';
import { addonManager } from '@/services/AddonManager';
import type { FeedbackInitialContext } from '@/components/feedback/types';
import { logger } from '@/utils/logger';
import { devLog } from '@/utils/devOnly';
import type { World } from '@/types/world';
import { Character } from '@/types/character';
import type { Location } from '@/types/location';
import type { Project } from '@/types/project';
import type { ElectronAPI } from '@/types/electron';
import { useThemeStore } from '@/stores/themeStore';
import { useLocationStore } from '@/stores/locationStore';
import type { DialogueBuilderData } from '@/components/wizard/dialogue-builder/DialogueBuilderWizard';
function AppContentInner() {
  const { currentExperimentalFeature } = useSecretMode();

  const {
    project,
    setProject,
    setShots,
    isInitialLoading,
    setIsInitialLoading,
    setInstallationComplete,
    closeActiveWizard,
    closeAddonSettings,
    setCurrentView,
    setSelectedSequenceId,
    setShowFeedbackPanel,
    showFeedbackPanel,
    settingsAddonId,
    setShowInstallationWizard,
    setShowWorldWizard,
    setShowCharacterWizard,
    setShowObjectWizard,
    setShowStorytellerWizard,
    setShowScenarioBuilder,
    setShowDialogueBuilder,
    closeSequencePlanWizard,
    closeShotWizard,
    setShowCrossShotReferencePicker,
    setChatMessages,
    clearWizardHistory,
    showWorldWizard,
    showCharacterWizard,
    showObjectWizard,
    showSequencePlanWizard,
    selectedShotId,
  } = useAppStore(useShallow((state) => ({
    project: state.project,
    setProject: state.setProject,
    setShots: state.setShots,
    isInitialLoading: state.isInitialLoading,
    setIsInitialLoading: state.setIsInitialLoading,
    setInstallationComplete: state.setInstallationComplete,
    closeActiveWizard: state.closeActiveWizard,
    closeAddonSettings: state.closeAddonSettings,
    setCurrentView: state.setCurrentView,
    setSelectedSequenceId: state.setSelectedSequenceId,
    setShowFeedbackPanel: state.setShowFeedbackPanel,
    showFeedbackPanel: state.showFeedbackPanel,
    settingsAddonId: state.settingsAddonId,
    setShowInstallationWizard: state.setShowInstallationWizard,
    setShowWorldWizard: state.setShowWorldWizard,
    setShowCharacterWizard: state.setShowCharacterWizard,
    setShowObjectWizard: state.setShowObjectWizard,
    setShowStorytellerWizard: state.setShowStorytellerWizard,
    setShowLocationWizard: state.setShowLocationWizard,
    setShowScenarioBuilder: state.setShowScenarioBuilder,
    setShowDialogueBuilder: state.setShowDialogueBuilder,
    closeSequencePlanWizard: state.closeSequencePlanWizard,
    closeShotWizard: state.closeShotWizard,
    setShowCrossShotReferencePicker: state.setShowCrossShotReferencePicker,
    // Visibility flags (needed in selector to trigger re-renders of AppContentInner)
    showInstallationWizard: state.showInstallationWizard,
    showWorldWizard: state.showWorldWizard,
    showCharacterWizard: state.showCharacterWizard,
    showObjectWizard: state.showObjectWizard,
    showStorytellerWizard: state.showStorytellerWizard,
    showCreateProjectDialog: state.showCreateProjectDialog,
    showProjectSetupWizard: state.showProjectSetupWizard,
    showLLMSettings: state.showLLMSettings,
    showComfyUISettings: state.showComfyUISettings,
    showGeneralSettings: state.showGeneralSettings,
    showAddonsModal: state.showAddonsModal,
    showCharactersModal: state.showCharactersModal,
    showWorldModal: state.showWorldModal,
    showLocationsModal: state.showLocationsModal,
    showObjectsModal: state.showObjectsModal,
    showImageGalleryModal: state.showImageGalleryModal,
    showVaultModal: state.showVaultModal,
    showDialogueEditor: state.showDialogueEditor,
    showFactCheckModal: state.showFactCheckModal,
    showMoodboardModal: state.showMoodboardModal,
    showAboutModal: state.showAboutModal,
    showDocumentationModal: state.showDocumentationModal,
    showKeyboardShortcutsDialog: state.showKeyboardShortcutsDialog,
    showSequencePlanWizard: state.showSequencePlanWizard,
    showShotWizard: state.showShotWizard,
    showScenarioBuilder: state.showScenarioBuilder,
    showDialogueBuilder: state.showDialogueBuilder,
    showDiscoveryLab: state.showDiscoveryLab,
    showProjectTranslator: state.showProjectTranslator,
    showVideoPublisher: state.showVideoPublisher,
    showComputeDashboard: state.showComputeDashboard,
    showAutomationPanel: state.showAutomationPanel,
    showReferenceSheetManager: state.showReferenceSheetManager,
    showVideoReplicationDialog: state.showVideoReplicationDialog,
    showCrossShotReferencePicker: state.showCrossShotReferencePicker,
    showProjectBranchingDialog: state.showProjectBranchingDialog,
    showEpisodeReferenceDialog: state.showEpisodeReferenceDialog,
    setChatMessages: state.setChatMessages,
    clearWizardHistory: state.clearWizardHistory,
    selectedShotId: state.selectedShotId,
  })));

  devLog('[App] Render: project=' + (project?.project_name || 'none') + 
         ' wizards=[' + 
         (showWorldWizard ? 'world ' : '') + 
         (showCharacterWizard ? 'char ' : '') + 
         (showObjectWizard ? 'obj ' : '') + 
         (showSequencePlanWizard ? 'seq ' : '') + 
         ']');

  const isGenerating = useStore((state) => state.generationStatus?.isGenerating ?? false);
  const isProcessing = isGenerating;
  const hasUnsavedChanges = false;
  const [viewState, setViewState] = useState(DEFAULT_VIEW_STATE);
  const [settingsAddonName, setSettingsAddonName] = useState('');

  useEffect(() => {
    if (settingsAddonId) {
      try {
        const addon = addonManager.getAddon(settingsAddonId);
        if (addon) {
          setSettingsAddonName(addon.name);
        } else {
          setSettingsAddonName('Addon Settings');
        }
      } catch (_e) {
        console.warn('Failed to get addon info for settings:', _e);
        setSettingsAddonName('Addon Settings');
      }
    }
  }, [settingsAddonId]);

  const storeSetProject = useStore((state) => state.setProject);
  const currentStoreProject = useStore((state) => state.project);

  useEffect(() => {
    const isDifferent = !currentStoreProject ||
      project?.id !== currentStoreProject?.id ||
      project?.path !== currentStoreProject?.path ||
      (project?.characters?.length !== currentStoreProject?.characters?.length) ||
      (JSON.stringify(project?.projectSetup) !== JSON.stringify(currentStoreProject?.projectSetup));

    if (project && isDifferent) {
      console.log('🔄 [App] Syncing project to main store:', project.project_name);
      storeSetProject(project);
    }
  }, [project, storeSetProject, currentStoreProject]);

  const handleViewStateChange = useCallback((updates: Partial<typeof DEFAULT_VIEW_STATE>) => {
    setViewState(prev => ({ ...prev, ...updates }));
  }, [setViewState]);

  const handleProjectChange = useCallback((newProject: typeof project) => {
    setProject(newProject);
    if (newProject) {
      setShots(newProject.shots || []);
    } else {
      setShots([]);
    }
  }, [setProject, setShots]);

  const storeUndo = useStore((state) => state.undo);
  const storeRedo = useStore((state) => state.redo);
  const historyIndex = useStore((state) => state.historyIndex);
  const historyLength = useStore((state) => state.history.length);

  const undoStack = {
    canUndo: historyIndex >= 0,
    canRedo: historyIndex < historyLength - 1,
    undo: storeUndo,
    redo: storeRedo,
  };

  const clipboard = {
    hasContent: false,
    contentType: null as 'shot' | 'text' | 'asset' | null,
    cut: () => { console.log('Cut operation not yet implemented'); },
    copy: () => { console.log('Copy operation not yet implemented'); },
    paste: () => { console.log('Paste operation not yet implemented'); return null; },
  };

  const activeWizardType = useAppStore((state) => state.activeWizardType) as WizardType | null;
  const { toast } = useToast();

  useOllamaInit();
  useGlobalKeyboardShortcuts();
  useVoiceHotkey();
  useSystemVoiceCommands();
  useNeuralAssistant();

  useEffect(() => {
    const openFeedbackPanelWithContext = (context: FeedbackInitialContext) => {
      console.log('Opening feedback panel with error context:', context);
      setFeedbackInitialContext(context);
      setShowFeedbackPanel(true);
    };
    globalErrorHandler.initialize(openFeedbackPanelWithContext);
    return () => { globalErrorHandler.cleanup(); };
  }, [setShowFeedbackPanel]);

  const [feedbackInitialContext, setFeedbackInitialContext] = useState<FeedbackInitialContext | undefined>(undefined);

  useEffect(() => {
    if (!showFeedbackPanel) {
      setFeedbackInitialContext(undefined);
    }
  }, [showFeedbackPanel]);

  useEffect(() => {
    async function initializeLLM() {
      await initializeLLMConfig();
      await initializeLLMConfigService();
    }
    initializeLLM();
  }, []);

  useEffect(() => {
    validateFeatureRegistry();
  }, []);

  useEffect(() => {
    useThemeStore.getState().syncWithSystem();
  }, []);

  useEffect(() => {
    serviceStatusMonitor.start();
    return () => { serviceStatusMonitor.stop(); };
  }, []);

  const location = useLocation();
  const navigate = useNavigate();
  const isSyncingRef = useRef(false);

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

        const normalize = (p: string) => {
          if (!p) return '';
          let normalized = p.replace(/\\/g, '/').toLowerCase();
          if (normalized.endsWith('/')) {
            normalized = normalized.substring(0, normalized.length - 1);
          }
          return normalized;
        };

        const normalizedUrlPath = normalize(projectPath);
        const currentStorePath = project?.path || (project?.metadata?.path as string) || '';
        const normalizedStorePath = normalize(currentStorePath);

        const needsLoading = !project || normalizedUrlPath !== normalizedStorePath;

        if (needsLoading && projectPath && projectPath !== 'default') {
          isSyncingRef.current = true;
          if (setIsInitialLoading) setIsInitialLoading(true);
          setChatMessages([]); // Ensure chat is cleared before loading new project

          try {
            const api = (window as unknown as { electronAPI: ElectronAPI }).electronAPI;
            if (api?.project?.open) {
              const electronProject = await api.project.open(projectPath);
              if (electronProject) {
                const storeProject = convertElectronProjectToStore(electronProject);
                const finalPath = projectPath;
                if (!storeProject.path) storeProject.path = finalPath;
                if (storeProject.metadata && !storeProject.metadata.path) {
                  storeProject.metadata.path = finalPath;
                }

                let characters: Character[] = [];
                let worlds: World[] = [];
                let locations: Location[] = [];
                let stories: Story[] = [];
                let sequences: SequencePlan[] = [];

                try {
                  const scanDir = async (dirName: string, subFile?: string) => {
                    const items: unknown[] = [];
                    try {
                      if (api.fs && await api.fs.exists(`${projectPath}/${dirName}`)) {
                        const files = await api.fs.readdir(`${projectPath}/${dirName}`);
                        for (const file of files) {
                          try {
                            const itemPath = subFile ? `${projectPath}/${dirName}/${file}/${subFile}` : `${projectPath}/${dirName}/${file}`;
                            if (await api.fs.exists(itemPath)) {
                              const buffer = await api.fs.readFile(itemPath);
                              const json = JSON.parse(new TextDecoder().decode(buffer));
                              items.push(json);
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

                await projectCreationService.loadProjectIntoStores(finalProject as unknown as Project, projectPath, finalProject.sequencePlans);
                console.log('[App] Project successfully loaded into stores');
              } else {
                console.error('[App] Failed to open project: electronProject is null');
                toast({ variant: 'destructive', title: 'Load Error', description: 'Could not open the project directory.' });
                navigate('/');
              }
            }
          } catch (error) {
            console.error('[App] Exception while loading project from URL:', error);
            toast({ variant: 'destructive', title: 'Load Error', description: 'An error occurred while loading the project.' });
            navigate('/');
          } finally {
            isSyncingRef.current = false;
            if (setIsInitialLoading) setIsInitialLoading(false);
          }
        } else {
          if (isInitialLoading && setIsInitialLoading) {
            console.log('[App] Project already loaded and matches URL. Hiding loader.');
            setIsInitialLoading(false);
          }
        }
      } else {
        // No project in URL - if we have a project loaded, clear it to ensure home screen is clean
        if (project) {
          console.log('[AppContent] No project in URL but project exists in store. Clearing project state.');
          setProject(null);
          setShots([]);
          setChatMessages([]);
          clearWizardHistory();
          if (useLocationStore?.getState) {
            useLocationStore.getState().reset();
          }
        }
        
        if (isInitialLoading && setIsInitialLoading) {
          setIsInitialLoading(false);
        }
      }
    }

    syncUrlWithProject();
  }, [location.pathname, location.search, project, toast, navigate, setIsInitialLoading, isInitialLoading]);

  useEffect(() => {
    const handleNavigateToDashboard = () => {
      setCurrentView('dashboard');
      setSelectedSequenceId(undefined);
      const pId = project?.path || project?.metadata?.path || project?.metadata?.id || project?.project_name;
      if (pId) {
        navigate(`/project/${encodeURIComponent(pId as string)}`);
      } else {
        navigate('/');
      }
    };

    window.addEventListener('storycore:navigate-to-dashboard', handleNavigateToDashboard);
    
    // Use a stable reference for handleExitProject to avoid listener churn
    const handleExitProject = () => {
      console.log('[AppContent] storycore:exit-project event received');
      // Reset stores
      if (useLocationStore?.getState) {
        useLocationStore.getState().reset();
      }
      
      setProject(null);
      setShots([]);
      setChatMessages([]);
      clearWizardHistory();
      setCurrentView('dashboard');
      setSelectedSequenceId(undefined);
      navigate('/');
      
      // Force view update after navigation
      setTimeout(() => { 
        console.log('[AppContent] handleExitProject: Post-navigation cleanup');
        setCurrentView('dashboard'); 
      }, 100);
    };

    window.addEventListener('storycore:exit-project', handleExitProject as EventListener);

    const handleNavigateToExperimentalAI = () => {
      setCurrentView('experimental-ai');
      setSelectedSequenceId(undefined);
    };

    window.addEventListener('storycore:navigate-to-experimental-ai', handleNavigateToExperimentalAI);

    // Event Bridge for openModal/closeModal (Fixes Wizards not launching from MenuBar)
    const handleOpenModal = (e: CustomEvent<{ modalId: string }>) => {
      const modalId = e.detail?.modalId;
      console.log(`[EventBridge] openModal received: ${modalId}`);
      if (!modalId) return;

      const store = useAppStore.getState();
      switch (modalId) {
        case 'new-project': store.setShowCreateProjectDialog(true); break;
        case 'preferences': store.setShowGeneralSettings(true); break;
        case 'about': store.setShowAboutModal(true); break;
        case 'documentation': store.setShowDocumentationModal(true); break;
        case 'keyboard-shortcuts': store.setShowKeyboardShortcutsDialog(true); break;
        case 'character-wizard': store.setShowCharacterWizard(true); break;
        case 'world-wizard': store.setShowWorldWizard(true); break;
        case 'object-wizard': store.setShowObjectWizard(true); break;
        case 'storyteller-wizard': store.setShowStorytellerWizard(true); break;
        case 'sequence-plan': store.openSequencePlanWizard({ mode: 'create' }); break;
        case 'shot': store.openShotWizard({ mode: 'create' }); break;
        case 'style-transfer': store.openWizard('style-transfer'); break;
        case 'scene-generator': store.openWizard('scene-generator'); break;
        case 'storyboard-creator': store.openWizard('storyboard-creator'); break;
        case 'discovery-lab': store.setShowDiscoveryLab(true); break;
        case 'compute-dashboard': store.setShowComputeDashboard(true); break;
        case 'automation-panel': store.setShowAutomationPanel(true); break;
        case 'characters': store.setShowCharactersModal(true); break;
        case 'world': store.setShowWorldModal(true); break;
        case 'locations': store.setShowLocationsModal(true); break;
        case 'objects': store.setShowObjectsModal(true); break;
        case 'image-gallery': store.setShowImageGalleryModal(true); break;
        case 'vault': store.setShowVaultModal(true); break;
        case 'feedback': store.setShowFeedbackPanel(true); break;
        default: console.warn(`[EventBridge] Unknown modalId: ${modalId}`);
      }
    };

    const handleCloseModal = (e: CustomEvent<{ modalId: string }>) => {
      const modalId = e.detail?.modalId;
      console.log(`[EventBridge] closeModal received: ${modalId}`);
      if (!modalId) return;
      // Implement specific closers if needed, or use closeActiveWizard
      useAppStore.getState().closeActiveWizard();
    };

    window.addEventListener('openModal', handleOpenModal as EventListener);
    window.addEventListener('closeModal', handleCloseModal as EventListener);

    return () => {
      window.removeEventListener('storycore:navigate-to-dashboard', handleNavigateToDashboard);
      window.removeEventListener('storycore:exit-project', handleExitProject as EventListener);
      window.removeEventListener('storycore:navigate-to-experimental-ai', handleNavigateToExperimentalAI);
      window.removeEventListener('openModal', handleOpenModal as EventListener);
      window.removeEventListener('closeModal', handleCloseModal as EventListener);
    };
  }, [setProject, setShots, setCurrentView, setSelectedSequenceId, navigate, project, isInitialLoading]);

  const handleInstallationComplete = () => {
    setInstallationComplete(true);
    setShowInstallationWizard(false);
  };

  const handleCloseInstallationWizard = () => {
    setShowInstallationWizard(false);
  };

  const handleWorldComplete = (world: World, nextAction?: string) => {
    try {
      if (!world || !world.id) throw new Error('Invalid world data');

      const state = useAppStore.getState();
      const worldExists = state.worlds?.some(w => w.id === world.id);

      if (!worldExists) {
        logger.warn('World created but not found in store after creation');
        toast({ title: 'Warning', description: 'World created but not found in store', variant: 'destructive' });
      }

      setShowWorldWizard(false);

      toast({ title: 'Success', description: `World "${world.name}" created successfully` });

      if (nextAction === 'create-character') {
        setShowCharacterWizard(true);
      } else if (nextAction === 'create-location') {
        toast({ title: 'Info', description: 'Location wizard chaining coming soon' });
      }
    } catch (error) {
      console.error('Failed to complete world wizard:', error);
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to create world', variant: 'destructive' });
    }
  };

  const handleCharacterComplete = (character: Character) => {
    try {
      if (!character || !character.character_id) throw new Error('Invalid character data');

      const store = useStore.getState();
      const characterExistsInStore = store.characters?.some(c => c.character_id === character.character_id);

      if (!characterExistsInStore) {
        useStore.getState().addCharacter(character);
        devLog('[App] Character added to Zustand store:', character.character_id);
      }

      const currentProject = useAppStore.getState().project;
      if (currentProject) {
        const projectCharacters = currentProject.characters || [];
        const characterExistsInProject = projectCharacters.some(c => c.character_id === character.character_id);

        if (!characterExistsInProject) {
          useAppStore.setState({
            project: { ...currentProject, characters: [...projectCharacters, character] }
          });
          devLog('[App] Character synced to project:', character.character_id);
        }
      }

      const updatedProject = useAppStore.getState().project;
      if (updatedProject) {
        useStore.getState().setProject(updatedProject);
        console.log('[App] Full project sync triggered');
      }

      setShowCharacterWizard(false);

      toast({ title: 'Success', description: `Character "${character.name}" created successfully` });
    } catch (error) {
      console.error('Failed to complete character wizard:', error);
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to create character', variant: 'destructive' });
    }
  };

  const handleScenarioComplete = (story: Partial<Story>) => {
    devLog('Scenario building complete:', story);
    setShowScenarioBuilder(false);
    toast({ title: 'Scenario Created', description: `Story structure for "${story.title}" generated` });
  };

  const handleDialogueBuilderComplete = (data: DialogueBuilderData, result?: string) => {
    devLog('Dialogue building complete:', data);
    setShowDialogueBuilder(false);
    if (result) {
      toast({ title: 'Dialogue Forge Complete', description: 'New dialogue has been generated and refined' });
    }
  };

  const handleObjectComplete = (object: Partial<StoryObject>) => {
    try {
      if (!object || !object.id) throw new Error('Invalid object data');

      const store = useStore.getState();
      const objectExistsInStore = store.objects?.some(o => o.id === object.id);

      if (!objectExistsInStore) {
        useStore.getState().addObject(object as StoryObject);
        devLog('[App] Object added to Zustand store:', (object as StoryObject).id);
      }

      const currentProject = useAppStore.getState().project;
      if (currentProject) {
        const projectObjects = currentProject.objects || [];
        const objectExistsInProject = projectObjects.some(o => o.id === object.id);

        if (!objectExistsInProject) {
          useAppStore.setState({
            project: { ...currentProject, objects: [...projectObjects, object as StoryObject] }
          });
          devLog('[App] Object synced to project:', (object as StoryObject).id);
        }
      }

      const updatedProject = useAppStore.getState().project;
      if (updatedProject) {
        useStore.getState().setProject(updatedProject);
        console.log('[App] Full project sync triggered');
      }

      setShowObjectWizard(false);

      toast({ title: 'Success', description: `Object "${object.name}" created successfully` });
    } catch (error) {
      console.error('Failed to complete object wizard:', error);
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to create object', variant: 'destructive' });
    }
  };

  const handleStorytellerComplete = async (story: Story) => {
    try {
      const storyData = story;
      if (!storyData || !storyData.id) throw new Error('Invalid story data');

      const introPart = storyData.parts?.find(p => p.type === 'intro' || p.title?.toLowerCase().includes('intro'));
      const introContent = introPart ? introPart.content : (storyData.summary || storyData.content?.substring(0, 500));

      if (introContent && project) {
        try {
          const { createShot } = useEditorStore.getState();
          await createShot({ title: 'Intro', description: introContent, duration: 5 });
          console.log('[App] First shot initialized from story intro');
        } catch (error) {
          console.error('[App] Failed to create initial shot:', error);
        }
      }

      setShowStorytellerWizard(false);

      toast({ title: 'Story Created', description: `"${storyData.title || 'Untitled Story'}" has been generated and saved. Initial shot created.` });
    } catch (error) {
      console.error('Failed to complete storyteller wizard:', error);
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to create story', variant: 'destructive' });
    }
  };

  const handleSequencePlanComplete = (plan: SequencePlan) => {
    if (import.meta.env.DEV) {
      devLog('Sequence plan complete:', plan.id);
    }
    if (project) {
      const updatedProject = { ...project };
      const sequencePlans = updatedProject.sequencePlans || [];
      const existingIndex = sequencePlans.findIndex((s) => s.id === plan.id);

      if (existingIndex >= 0) {
        sequencePlans[existingIndex] = plan;
      } else {
        sequencePlans.push(plan);
      }

      updatedProject.sequencePlans = sequencePlans;
      setProject(updatedProject);

      if (plan.preferredEngine) {
        import('@/services/wanVideoService').then(({ wanVideoService }) => {
          wanVideoService.generateSequence({
            projectId: updatedProject.id,
            sceneId: plan.id,
            sceneDescription: plan.description || plan.name,
            engine: plan.preferredEngine,
            overrides: { plan: plan }
          }, () => {}).then(() => {
            toast({ title: 'Production Started', description: `Generating via ${plan.preferredEngine}...` });
          }).catch(err => {
            console.error('Production failed:', err);
            toast({ title: 'Production Error', description: err.message, variant: 'destructive' });
          });
        });
      }
    }

    console.log('Sequence Plan saved:', plan);
    closeSequencePlanWizard();
    toast({ title: 'Sequence Plan Saved', description: `The plan "${plan.name}" has been successfully saved.` });
  };

  const handleShotComplete = (shot: Shot) => {
    const { shots, addShot, updateShot } = useAppStore.getState();
    const existingShot = shots.find(s => s.id === shot.id);

    if (existingShot) {
      updateShot(shot.id, shot);
    } else {
      addShot(shot);
    }

    console.log('Shot saved:', shot);
    closeShotWizard();
    toast({ title: 'Plan (Shot) sauvegardé', description: `Le plan "${shot.title}" a été enregistré avec succès.` });
  };

  const handleWizardComplete = (data: unknown) => {
    const wizardData = data as Record<string, unknown>;
    if (activeWizardType && project) {
      switch (activeWizardType) {
        case 'dialogue-writer': {
          const updatedProjectWithDialogue = {
            ...project,
            metadata: {
              ...project.metadata,
              lastDialogueGeneration: { timestamp: Date.now(), data }
            }
          };
          setProject(updatedProjectWithDialogue);
          toast({ title: 'Dialogue Generated', description: `Dialogue has been generated for ${(wizardData.characters as unknown[])?.length || 0} characters` });
          break;
        }
        case 'scene-generator': {
          const updatedProjectWithScene = {
            ...project,
            metadata: {
              ...project.metadata,
              lastSceneGeneration: { timestamp: Date.now(), data }
            }
          };
          setProject(updatedProjectWithScene);
          toast({ title: 'Scene Generated', description: `Scene "${wizardData.concept as string}" has been generated` });
          break;
        }
        case 'storyboard-creator': {
          const updatedProjectWithStoryboard = {
            ...project,
            metadata: {
              ...project.metadata,
              lastStoryboardGeneration: { timestamp: Date.now(), mode: wizardData.mode as string, data }
            }
          };
          setProject(updatedProjectWithStoryboard);
          toast({ title: 'Storyboard Created', description: `Storyboard has been ${(wizardData.mode as string) === 'replace' ? 'created' : 'appended'} with ${wizardData.visualStyle as string} style` });
          break;
        }
        case 'style-transfer': {
          const updatedProjectWithStyle = {
            ...project,
            metadata: {
              ...project.metadata,
              lastStyleTransfer: { timestamp: Date.now(), shotId: wizardData.shotId as string, styleImage: (wizardData.styleReferenceImage as { name?: string })?.name }
            }
          };
          setProject(updatedProjectWithStyle);
          toast({ title: 'Style Applied', description: 'Style has been applied to the selected shot' });
          break;
        }
      }
    }
    closeActiveWizard();
  };

  const renderModals = () => (
    <ModalManager
      onCloseInstallationWizard={handleCloseInstallationWizard}
      onInstallationComplete={handleInstallationComplete}
      onWorldComplete={handleWorldComplete}
      onCharacterComplete={handleCharacterComplete}
      onScenarioComplete={handleScenarioComplete}
      onDialogueBuilderComplete={handleDialogueBuilderComplete}
      onObjectComplete={handleObjectComplete}
      onStorytellerComplete={handleStorytellerComplete}
      onSequencePlanComplete={handleSequencePlanComplete}
      onShotComplete={handleShotComplete}
      onWizardComplete={handleWizardComplete}
      feedbackInitialContext={feedbackInitialContext}
      settingsAddonName={settingsAddonName}
      onCloseAddonSettings={closeAddonSettings}
      onBorrowReferences={(_refs) => {
        devLog('Borrowed references:', _refs);
        setShowCrossShotReferencePicker(false);
        toast({ title: 'References Borrowed', description: `Successfully borrowed ${_refs.length} references` });
      }}
      onBranchCreated={(_branch) => {
        devLog('Branch created:', _branch);
        toast({ title: 'Branch Created', description: `Started new branch: ${_branch.name}` });
      }}
      onReferenceAdded={(_ref) => {
        devLog('Episode reference added:', _ref);
        toast({ title: 'Reference Linked', description: `Linked to ${_ref.episodeName}` });
      }}
      toast={toast}
    />
  );

  const isDetachedChat = typeof window !== 'undefined' && window.location.pathname === '/detached-chat';

  if (isDetachedChat) {
    return <DetachedChatPage />;
  }

  if (currentExperimentalFeature) {
    let ExperimentalPage: React.FC | null = null;
    switch (currentExperimentalFeature) {
      case 'advanced-grid-editor': ExperimentalPage = AdvancedGridEditorPage; break;
      case 'ai-assistant-v3': ExperimentalPage = AIAssistantV3Page; break;
      case 'performance-profiler': ExperimentalPage = PerformanceProfilerPage; break;
      default: ExperimentalPage = null;
    }
    if (ExperimentalPage) {
      return (
        <div className="flex flex-col h-screen overflow-hidden relative">
          <MenuBar project={project} hasUnsavedChanges={false} onProjectChange={handleProjectChange}
            onViewStateChange={handleViewStateChange} viewState={DEFAULT_VIEW_STATE} undoStack={undoStack}
            clipboard={clipboard} isProcessing={false} selectedShotId={selectedShotId} />
          <main className="flex-1 overflow-hidden relative">
            <ExperimentalPage />
          </main>
          <FloatingAIAssistant />
          <ToggleButton position="bottom-right" />
          {renderModals()}
        </div>
      );
    }
  }

  const isProjectRoute = location.pathname.includes('/project/');

  if (isInitialLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-semibold">Loading Project...</h2>
        <p className="text-muted-foreground text-center px-4">Synchronizing your creative world</p>
      </div>
    );
  }

  if (!project && !isProjectRoute) {
    return (
      <div className="flex flex-col min-h-screen relative">
        <MenuBar project={null} hasUnsavedChanges={false} onProjectChange={handleProjectChange}
          onViewStateChange={handleViewStateChange} viewState={viewState} undoStack={undoStack}
          clipboard={clipboard} isProcessing={false} selectedShotId={null} />
        <main className="flex-1 overflow-hidden"><LandingPageWithHooks /></main>
        <FloatingAIAssistant />
        <ToggleButton position="bottom-right" />
        {renderModals()}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden relative">
      <MenuBar project={project} hasUnsavedChanges={hasUnsavedChanges} onProjectChange={handleProjectChange}
        onViewStateChange={handleViewStateChange} viewState={viewState} undoStack={undoStack}
        clipboard={clipboard} isProcessing={isProcessing} selectedShotId={selectedShotId} />
      <main className="flex-1 overflow-hidden relative"><Outlet /></main>
      <FloatingAIAssistant />
      <ToggleButton position="bottom-right" />
      {renderModals()}
    </div>
  );
}

export { AppContentInner };
