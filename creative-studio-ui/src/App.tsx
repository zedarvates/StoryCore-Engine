
import { useState, useEffect, useCallback } from 'react';
import { useAppStore, type WizardType } from '@/stores/useAppStore';
import { useStore } from '@/store';
import { LLMProvider } from '@/providers/LLMProvider';
import { SecretModeProvider, useSecretMode } from '@/contexts/SecretModeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { NavigationProvider } from '@/contexts/NavigationContext';
import { I18nProvider } from '@/utils/i18n';
import { MenuBar } from '@/components/menuBar/MenuBar';
import { FloatingAIAssistant } from '@/components/FloatingAIAssistant';
import { DEFAULT_VIEW_STATE } from '@/types/menuBarState';
import type { ViewState, UndoStack, ClipboardState } from '@/types/menuBarState';
import { ToggleButton } from '@/components/ToggleButton';
import { WorldWizardDemo } from '@/pages/WorldWizardDemo';
import { LandingPageDemo } from '@/pages/LandingPageDemo';
import { LandingPageWithHooks } from '@/pages/LandingPageWithHooks';
import { EditorPageSimple } from '@/pages/EditorPageSimple';
import { ProjectDashboardPage } from '@/pages/ProjectDashboardPage';
import { AdvancedGridEditorPage } from '@/pages/experimental/AdvancedGridEditorPage';
import { AIAssistantV3Page } from '@/pages/experimental/AIAssistantV3Page';
import { PerformanceProfilerPage } from '@/pages/experimental/PerformanceProfilerPage';
import { InstallationWizardModal } from '@/components/installation/InstallationWizardModal';
import { WorldWizardModal } from '@/components/wizard/WorldWizardModal';
import { CharacterWizardModal } from '@/components/wizard/CharacterWizardModal';
import { StorytellerWizardModal } from '@/components/wizard/StorytellerWizardModal';
import { ProjectSetupWizardModal } from '@/components/wizard/ProjectSetupWizardModal';
import { SequencePlanWizardModal } from '@/components/wizard/SequencePlanWizardModal';
import { ShotWizardModal } from '@/components/wizard/ShotWizardModal';
import { GenericWizardModal } from '@/components/wizard/GenericWizardModal';
import { LLMSettingsModal } from '@/components/settings/LLMSettingsModal';
import { ComfyUISettingsModal } from '@/components/settings/ComfyUISettingsModal';
import { GeneralSettingsWindow } from '@/components/configuration/GeneralSettingsWindow';
import { AddonsModal } from '@/components/settings/AddonsModal';
import { CharactersModal } from '@/components/modals/CharactersModal';
import { WorldModal } from '@/components/modals/WorldModal';
import { LocationsModal } from '@/components/modals/LocationsModal';
import { ObjectsModal } from '@/components/modals/ObjectsModal';
import { ImageGalleryModal } from '@/components/modals/ImageGalleryModal';
import { FeedbackPanel } from '@/components/feedback/FeedbackPanel';
import { PendingReportsList } from '@/components/feedback/PendingReportsList';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import DialogueEditor from '@/ui/DialogueEditor';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { useOllamaInit } from '@/hooks/useOllamaInit';
import { useGlobalKeyboardShortcuts } from '@/hooks/useGlobalKeyboardShortcuts';
import { useCharacterRestoration } from '@/hooks/useCharacterRestoration'; // NEW: Restore characters on app load
import { initializeLLMConfigService } from '@/services/llmConfigService'; // NEW: Initialize unified LLM service
import { initializeLLMConfig } from '@/utils/migrateLLMConfig'; // NEW: Migrate legacy configs
import { globalErrorHandler } from '@/utils/globalErrorHandler'; // NEW: Global error handler
import { validateFeatureRegistry } from '@/config/experimentalFeatures'; // NEW: Validate experimental features registry
import { serviceStatusMonitor } from '@/services/ServiceStatusMonitor'; // NEW: Service status monitoring
import type { FeedbackInitialContext } from '@/components/feedback/types';
import {
  createEmptyProject,
  getRecentProjects,
  addRecentProject,
  loadProjectFromFile,
  downloadProject,
  type RecentProject,
} from '@/utils/projectManager';
import type { World } from '@/types/world';
import type { Character } from '@/types/character';

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
    // Generic wizard state (simple forms in GenericWizardModal)
    showDialogueWriter,
    showSceneGenerator,
    showStoryboardCreator,
    showStyleTransfer,
    closeActiveWizard,
  } = useAppStore();

  // MenuBar state management
  // Requirements: 1.1-15.6
  const [viewState, setViewState] = useState<ViewState>(DEFAULT_VIEW_STATE);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Track unsaved changes when project changes
  useEffect(() => {
    // Reset unsaved changes flag when project changes
    setHasUnsavedChanges(false);
  }, [project]);

  // Sync project to main store when it changes (CRITICAL: Fixes character persistence)
  // This ensures characters and other project data are available to all components
  // Requirements: 8.1, 8.4
  const storeSetProject = useStore((state) => state.setProject);
  useEffect(() => {
    if (project) {
      console.log('🔄 [App] Syncing project to main store with', project.characters?.length || 0, 'characters');
      storeSetProject(project);
    }
  }, [project, storeSetProject]);

  // Handle view state changes from MenuBar
  // Requirements: 3.1-3.9
  const handleViewStateChange = useCallback((updates: Partial<ViewState>) => {
    setViewState(prev => ({ ...prev, ...updates }));
  }, []);

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
    cut: (content: any) => {
      console.log('Cut operation not yet implemented', content);
    },
    copy: (content: any) => {
      console.log('Copy operation not yet implemented', content);
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
  const ollamaState = useOllamaInit();

  // Initialize global keyboard shortcuts
  useGlobalKeyboardShortcuts();

  // Restore characters from localStorage on app load (Requirement 8.4)
  useCharacterRestoration();

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
      ;

      // Migrate legacy configurations
      await initializeLLMConfig();

      // Initialize unified service
      await initializeLLMConfigService();

      ;
    }

    initializeLLM();
  }, []);

  // Validate experimental features registry on startup (Requirements: 4.5)
  useEffect(() => {
    validateFeatureRegistry();
  }, []);

  // Set up service status monitoring (NEW)
  useEffect(() => {
    serviceStatusMonitor.start();
    return () => {
      serviceStatusMonitor.stop();
    };
  }, []);

  // Show Ollama status in console
  useEffect(() => {
    if (ollamaState.isInitialized && ollamaState.recommendation) {
      if (ollamaState.isOllamaAvailable) {
      } else {
        console.warn('Ollama not available:', ollamaState.recommendation);
      }
    }
  }, [ollamaState]);
  const setRecentProjects = useState<RecentProject[]>(getRecentProjects())[1];
  const [currentView, setCurrentView] = useState<'dashboard' | 'editor'>('dashboard');
  const [selectedSequenceId, setSelectedSequenceId] = useState<string | undefined>(undefined);

  const handleNewProject = useCallback(() => {
    try {
      const newProject = createEmptyProject('Untitled Project');
      setProject(newProject);
      setShots([]);

      toast({
        title: 'New Project',
        description: 'Empty project created',
      });
    } catch (error) {
      console.error('Failed to create new project:', error);
      toast({
        title: 'Error',
        description: 'Failed to create new project',
        variant: 'destructive',
      });
    }
  }, [setProject, setShots, toast]);

  const handleOpenProject = useCallback(() => {
    // Create file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const loadedProject = await loadProjectFromFile(file);
        setProject(loadedProject);
        setShots(loadedProject.shots);

        // Add to recent projects
        const recentProject: RecentProject = {
          id: crypto.randomUUID(),
          name: loadedProject.project_name,
          path: file.name,
          lastAccessed: new Date(),
        };
        addRecentProject(recentProject);
        setRecentProjects(getRecentProjects());

        toast({
          title: 'Project Loaded',
          description: `"${loadedProject.project_name}" loaded successfully`,
        });
      } catch (error) {
        console.error('Failed to load project:', error);
        toast({
          title: 'Error',
          description: 'Failed to load project. Please check the file format.',
          variant: 'destructive',
        });
      }
    };

    input.click();
  }, [setProject, setShots, toast]);



  const handleSaveProject = useCallback(() => {
    try {
      if (!project) {
        toast({
          title: 'Error',
          description: 'No project to save',
          variant: 'destructive',
        });
        return;
      }

      downloadProject(project);

      toast({
        title: 'Success',
        description: 'Project saved successfully',
      });
    } catch (error) {
      console.error('Failed to save project:', error);
      toast({
        title: 'Error',
        description: 'Failed to save project',
        variant: 'destructive',
      });
    }
  }, [project, toast]);

  const handleExportProject = useCallback(() => {
    try {
      if (!project) {
        toast({
          title: 'Error',
          description: 'No project to export',
          variant: 'destructive',
        });
        return;
      }

      downloadProject(project);

      toast({
        title: 'Success',
        description: 'Project exported successfully',
      });
    } catch (error) {
      console.error('Failed to export project:', error);
      toast({
        title: 'Error',
        description: 'Failed to export project',
        variant: 'destructive',
      });
    }
  }, [project, toast]);

  const handleCloseProject = useCallback(() => {
    setProject(null);
    setShots([]);
    setCurrentView('dashboard');
  }, [setProject, setShots]);

  const handleInstallationComplete = (installationPath: string) => {
    ;
    setInstallationComplete(true);
    setShowInstallationWizard(false);
    // Could update app configuration here
  };

  const handleCloseInstallationWizard = () => {
    setShowInstallationWizard(false);
  };

  const handleWorldComplete = (world: World) => {
    try {
      if (!world || !world.id) {
        throw new Error('Invalid world data');
      }

      // Valider que le monde a été ajouté au store
      const state = useAppStore.getState();
      const worldExists = state.worlds?.some(w => w.id === world.id);

      if (!worldExists) {
        console.warn('World not found in store after creation');
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

      // Valider que le caractère a été ajouté au store
      const state = useAppStore.getState();
      const characterExists = state.characters?.some(
        c => c.character_id === character.character_id
      );

      if (!characterExists) {
        console.warn('Character not found in store after creation');
        toast({
          title: 'Warning',
          description: 'Character created but not found in store',
          variant: 'destructive',
        });
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

  const handleStorytellerComplete = (story: any) => {
    try {
      if (!story || !story.id) {
        throw new Error('Invalid story data');
      }

      setShowStorytellerWizard(false);

      toast({
        title: 'Story Created',
        description: `"${story.title || 'Untitled Story'}" has been generated and saved`,
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

  // Generic wizard completion handler (Requirement 5.3, 9.1)
  const handleWizardComplete = (data: any) => {
    ;

    // Integrate wizard results into project based on wizard type (Requirement 5.3)
    if (activeWizardType && project) {
      switch (activeWizardType) {
        case 'dialogue-writer':
          // Add generated dialogue to project metadata
          // In a real implementation, this would update specific shots with dialogue
          const updatedProjectWithDialogue = {
            ...project,
            metadata: {
              ...project.metadata,
              lastDialogueGeneration: {
                timestamp: new Date().toISOString(),
                data,
              },
            },
          };
          setProject(updatedProjectWithDialogue);

          toast({
            title: 'Dialogue Generated',
            description: `Dialogue has been generated for ${data.characters?.length || 0} characters`,
          });
          break;

        case 'scene-generator':
          // Add generated scene to project metadata
          // In a real implementation, this would create new shots
          const updatedProjectWithScene = {
            ...project,
            metadata: {
              ...project.metadata,
              lastSceneGeneration: {
                timestamp: new Date().toISOString(),
                data,
              },
            },
          };
          setProject(updatedProjectWithScene);

          toast({
            title: 'Scene Generated',
            description: `Scene "${data.concept}" has been generated`,
          });
          break;

        case 'storyboard-creator':
          // Add storyboard metadata to project
          // In a real implementation, this would create/update shots based on mode
          const updatedProjectWithStoryboard = {
            ...project,
            metadata: {
              ...project.metadata,
              lastStoryboardGeneration: {
                timestamp: new Date().toISOString(),
                mode: data.mode,
                data,
              },
            },
          };
          setProject(updatedProjectWithStoryboard);

          toast({
            title: 'Storyboard Created',
            description: `Storyboard has been ${data.mode === 'replace' ? 'created' : 'appended'} with ${data.visualStyle} style`,
          });
          break;

        case 'style-transfer':
          // Apply style to selected shot
          // In a real implementation, this would update the shot's style parameters
          const updatedProjectWithStyle = {
            ...project,
            metadata: {
              ...project.metadata,
              lastStyleTransfer: {
                timestamp: new Date().toISOString(),
                shotId: data.shotId,
                styleImage: data.styleReferenceImage?.name,
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
      />

      {/* Character Wizard Modal */}
      <CharacterWizardModal
        isOpen={showCharacterWizard}
        onClose={() => setShowCharacterWizard(false)}
        onComplete={handleCharacterComplete}
      />

      {/* Storyteller Wizard Modal */}
      <StorytellerWizardModal
        isOpen={showStorytellerWizard}
        onClose={() => setShowStorytellerWizard(false)}
        onComplete={handleStorytellerComplete}
      />

      {/* Project Setup Wizard Modal */}
      <ProjectSetupWizardModal />

      {/* Production Wizards */}
      <SequencePlanWizardModal />
      <ShotWizardModal />

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

      {/* Toast Notifications */}
      <Toaster />
    </>
  );

  // Show experimental features if one is selected (Requirements: 2.1, 2.2, 7.3)
  if (currentExperimentalFeature) {
    let ExperimentalPage: React.FC | null = null;

    switch (currentExperimentalFeature) {
      case 'advanced-grid-editor':
        ExperimentalPage = AdvancedGridEditorPage;
        break;
      case 'ai-assistant-v3':
        ExperimentalPage = AIAssistantV3Page;
        break;
      case 'performance-profiler':
        ExperimentalPage = PerformanceProfilerPage;
        break;
      default:
        console.warn(`Unknown experimental feature: ${currentExperimentalFeature}`);
        ExperimentalPage = null;
    }

    if (ExperimentalPage) {
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

