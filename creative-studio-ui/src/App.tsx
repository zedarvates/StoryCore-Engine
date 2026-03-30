import { useState, useEffect, useCallback, useRef, lazy } from 'react';
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
import { createDragDropManager, type DragDropManager } from 'dnd-core';
const DetachedChatPage = lazy(() => import('@/pages/DetachedChatPage').then(m => ({ default: m.DetachedChatPage })));
const LandingPageWithHooks = lazy(() => import('@/pages/LandingPageWithHooks').then(m => ({ default: m.LandingPageWithHooks })));
const AdvancedGridEditorPage = lazy(() => import('@/pages/experimental/AdvancedGridEditorPage').then(m => ({ default: m.AdvancedGridEditorPage })));
const AIAssistantV3Page = lazy(() => import('@/pages/experimental/AIAssistantV3Page').then(m => ({ default: m.AIAssistantV3Page })));
const PerformanceProfilerPage = lazy(() => import('@/pages/experimental/PerformanceProfilerPage').then(m => ({ default: m.PerformanceProfilerPage })));
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { projectCreationService, convertElectronProjectToStore } from '@/services/ProjectCreationService';
import { ModalManager } from '@/components/modals/ModalManager';
import { Toaster } from '@/components/ui/toaster';
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
import { eventEmitter, WizardEventType, GenerationCompletedPayload } from '@/services/eventEmitter';
import { useThemeStore } from '@/stores/themeStore';
import { DialogueBuilderData } from '@/components/wizard/dialogue-builder/DialogueBuilderWizard';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ScreenReaderAnnouncerProvider } from '@/components/menuBar/ScreenReaderAnnouncer';



import { Provider as ReduxProvider } from 'react-redux';
import { store as reduxStore } from '@/sequence-editor/store';
import { StoreSynchronizer } from '@/stores/StoreSynchronizer';

function AppContent() {
  // Get secret mode context to check for experimental features
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
    setShowScenarioBuilder,
    setShowDialogueBuilder,
    setShowObjectWizard,
    setShowStorytellerWizard,
    closeSequencePlanWizard,
    closeShotWizard,
    setShowCrossShotReferencePicker,
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
    setShowScenarioBuilder: state.setShowScenarioBuilder,
    setShowDialogueBuilder: state.setShowDialogueBuilder,
    setShowObjectWizard: state.setShowObjectWizard,
    setShowStorytellerWizard: state.setShowStorytellerWizard,
    closeSequencePlanWizard: state.closeSequencePlanWizard,
    closeShotWizard: state.closeShotWizard,
    setShowCrossShotReferencePicker: state.setShowCrossShotReferencePicker,
    selectedShotId: state.selectedShotId,
  })));

  // Hook for unified LLM configuration moved to ModalManager

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
                        (project?.characters?.length !== currentStoreProject?.characters?.length) ||
                        (JSON.stringify(project?.projectSetup) !== JSON.stringify(currentStoreProject?.projectSetup));
                        
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
        
        // We load the project if the URL path doesn't match the store path.
        // We now allow project loading regardless of whether the ID looks like a path or UUID.
        const needsLoading = !project || normalizedUrlPath !== normalizedStorePath;
        
        // Detailed logging for debugging
        console.log(`[App] Sync check: URL="${normalizedUrlPath}", Store="${normalizedStorePath}", storeHasProject=${!!project}, needsLoading=${needsLoading}`);
        
        if (needsLoading && projectPath && projectPath !== 'default') {
          console.log(`[App] Triggering project load for ID/Path: "${projectPath}"`);
          
          // DEBUG: Log detailed path information for diagnosis
          console.log(`[App] DEBUG - ProjectPath type check:`, {
            isUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectPath),
            rawPath: projectPath,
            length: projectPath?.length,
            firstChar: projectPath?.charAt(0),
          });
          
          // FIX: If the path looks like a UUID (not a directory path), we need to resolve it to an actual path
          const isUUIDFormat = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectPath);
          let resolvedProjectPath = projectPath;
          
          if (isUUIDFormat) {
            // UUID format detected - need to find the actual project path
            console.log(`[App] UUID format detected, attempting to resolve to actual project path`);
            try {
              const api = (window as unknown as { electronAPI: import('./types').ElectronAPI }).electronAPI;
              if (api && api.project) {
                // Try to get recent projects to find matching ID
                if (api.recentProjects && api.recentProjects.get) {
                  const recentProjects = await api.recentProjects.get();
                  const matchingProject = recentProjects?.find(
                    (p: { id?: string; path?: string }) => p.id === projectPath
                  );
                  if (matchingProject?.path) {
                    resolvedProjectPath = matchingProject.path;
                    console.log(`[App] Resolved UUID to path: ${resolvedProjectPath}`);
                  }
                }
              }
            } catch (resolveError) {
              console.warn(`[App] Failed to resolve UUID to path:`, resolveError);
            }
          }
          
          // Validate that the resolved path exists before attempting to open
          if (isUUIDFormat && resolvedProjectPath === projectPath) {
            console.error(`[App] Could not resolve UUID "${projectPath}" to a valid project path. Recent projects may not contain this project.`);
            toast({
              variant: 'destructive',
              title: 'Project Not Found',
              description: 'The project could not be found. It may have been deleted or moved.',
            });
            navigate('/');
            return;
          }
          
          isSyncingRef.current = true;
          if (setIsInitialLoading) setIsInitialLoading(true);
          
          try {
            const api = (window as unknown as { electronAPI: import('./types').ElectronAPI }).electronAPI;
            if (api.project && api.project.open) {
              // Use resolved path if available, otherwise use original projectPath
              const pathToOpen = resolvedProjectPath !== projectPath ? resolvedProjectPath : projectPath;
              console.log(`[App] Opening project at path: ${pathToOpen}`);
              const electronProject = await api.project.open(pathToOpen);
              
              if (electronProject) {
                const storeProject = convertElectronProjectToStore(electronProject) as import('./types').Project;
                
                // Ensure the path in the store matches the resolved path we used to open it 
                // to prevent mismatch on next effect run
                const finalPath = pathToOpen;
                if (!storeProject.path) storeProject.path = finalPath;
                if (storeProject.metadata && !storeProject.metadata.path) {
                  storeProject.metadata.path = finalPath;
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
      
      // Also navigate using React Router to ensure we leave the editor page
      // Prefer project path for navigation as it's the unique identifier in the router
      const pId = project?.path || project?.metadata?.path || project?.metadata?.id || project?.project_name;
      
      if (pId) {
        navigate(`/project/${encodeURIComponent(pId as string)}`);
      } else {
        navigate('/');
      }
    };

    const handleExitProject = () => {
      // Clear the project and navigate to landing page
      setProject(null);
      setShots([]);
      setCurrentView('dashboard');
      setSelectedSequenceId(undefined);
      navigate('/');

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
  }, [setProject, setShots, setCurrentView, setSelectedSequenceId, navigate, project?.metadata?.id, project?.project_name, project?.path, project?.metadata?.path]);

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
        toast({
          title: 'References Borrowed',
          description: `Successfully borrowed ${_refs.length} references`,
        });
      }}
      onBranchCreated={(_branch) => {
        devLog('Branch created:', _branch);
        toast({
          title: 'Branch Created',
          description: `Started new branch: ${_branch.name}`,
        });
      }}
      onReferenceAdded={(_ref) => {
        devLog('Episode reference added:', _ref);
        toast({
          title: 'Reference Linked',
          description: `Linked to ${_ref.episodeName}`,
        });
      }}
      toast={toast}
    />
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

/* 
 * DragDropManager singleton to prevent "Cannot have two HTML5 backends" error (Req: 10.3)
 * This ensures that the backend is only initialized once even if App re-renders or mounts twice in StrictMode.
 */
let globalDndManager: DragDropManager | null = null;
const getDndManager = () => {
  if (!globalDndManager) {
    globalDndManager = createDragDropManager(HTML5Backend);
  }
  return globalDndManager;
};

// Wrapper component with LanguageProvider, NavigationProvider, SecretModeProvider, LLMProvider, ScreenReaderAnnouncerProvider and ErrorBoundary
function App() {
  return (
    <ErrorBoundary>
      <ReduxProvider store={reduxStore}>
        <DndProvider manager={getDndManager()}>
          <I18nProvider defaultLanguage="en" enableAutoDetect={false}>
            <StoreSynchronizer />
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
                        
                        {/* Toasts */}
                        <Toaster />
                      </div>
                    </ScreenReaderAnnouncerProvider>
                  </LLMProvider>
                </SecretModeProvider>
              </NavigationProvider>
            </LanguageProvider>
          </I18nProvider>
        </DndProvider>
      </ReduxProvider>
    </ErrorBoundary>
  );
}

export default App;



