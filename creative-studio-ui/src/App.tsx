import { useState, useEffect } from 'react';
import { useAppStore, type WizardType } from '@/stores/useAppStore';
import { LLMProvider } from '@/providers/LLMProvider';
import { MenuBar } from '@/components/MenuBar';
import { WorldWizardDemo } from '@/pages/WorldWizardDemo';
import { LandingPageDemo } from '@/pages/LandingPageDemo';
import { LandingPageWithHooks } from '@/pages/LandingPageWithHooks';
import { EditorPageSimple } from '@/pages/EditorPageSimple';
import { ProjectDashboardPage } from '@/pages/ProjectDashboardPage';
import { InstallationWizardModal } from '@/components/installation/InstallationWizardModal';
import { WorldWizardModal } from '@/components/wizard/WorldWizardModal';
import { CharacterWizardModal } from '@/components/wizard/CharacterWizardModal';
import { SequencePlanWizardModal } from '@/components/wizard/SequencePlanWizardModal';
import { ShotWizardModal } from '@/components/wizard/ShotWizardModal';
import { GenericWizardModal } from '@/components/wizard/GenericWizardModal';
import { LLMSettingsModal } from '@/components/settings/LLMSettingsModal';
import { ComfyUISettingsModal } from '@/components/settings/ComfyUISettingsModal';
import { AddonsModal } from '@/components/settings/AddonsModal';
import { CharactersModal } from '@/components/modals/CharactersModal';
import { WorldModal } from '@/components/modals/WorldModal';
import { LocationsModal } from '@/components/modals/LocationsModal';
import { ObjectsModal } from '@/components/modals/ObjectsModal';
import { ImageGalleryModal } from '@/components/modals/ImageGalleryModal';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { useOllamaInit } from '@/hooks/useOllamaInit';
import { useGlobalKeyboardShortcuts } from '@/hooks/useGlobalKeyboardShortcuts';
import { initializeLLMConfigService } from '@/services/llmConfigService'; // NEW: Initialize unified LLM service
import { initializeLLMConfig } from '@/utils/migrateLLMConfig'; // NEW: Migrate legacy configs
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
    showLLMSettings,
    setShowLLMSettings,
    showComfyUISettings,
    setShowComfyUISettings,
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
    // Generic wizard state (simple forms in GenericWizardModal)
    showDialogueWriter,
    showSceneGenerator,
    showStoryboardCreator,
    showStyleTransfer,
    closeActiveWizard,
  } = useAppStore();
  
  // Get activeWizardType with explicit typing (Requirement 1.2)
  const activeWizardType = useAppStore((state) => state.activeWizardType) as WizardType | null;
  
  // Toast for user feedback (Requirement 5.3, 9.1)
  const { toast } = useToast();
  
  // Initialize Ollama on app startup
  const ollamaState = useOllamaInit();
  
  // Initialize global keyboard shortcuts
  useGlobalKeyboardShortcuts();
  
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
  
  // Show Ollama status in console
  useEffect(() => {
    if (ollamaState.isInitialized && ollamaState.recommendation) {
      if (ollamaState.isOllamaAvailable) {
        console.log('Ollama available:', ollamaState.recommendation);
      } else {
        console.warn('Ollama not available:', ollamaState.recommendation);
      }
    }
  }, [ollamaState]);
  const setRecentProjects = useState<RecentProject[]>(getRecentProjects())[1];
  const [_showWorldWizardDemo, _setShowWorldWizardDemo] = useState(false);
  const [_showLandingPageDemo, _setShowLandingPageDemo] = useState(false);
  const [_showLandingPageWithHooks, _setShowLandingPageWithHooks] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'editor'>('dashboard');
  const [selectedSequenceId, setSelectedSequenceId] = useState<string | undefined>(undefined);

  const handleNewProject = () => {};

  const handleOpenProject = () => {
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
      } catch (error) {
        console.error('Failed to load project:', error);
        alert('Failed to load project. Please check the file format.');
      }
    };

    input.click();
  };



  const handleSaveProject = () => {
    if (project) {
      downloadProject(project);
      alert('Project saved successfully!');
    }
  };

  const handleExportProject = () => {
    if (project) {
      downloadProject(project);
      alert('Project exported successfully!');
    }
  };

  const handleCloseProject = () => {
    setProject(null);
    setShots([]);
    setCurrentView('dashboard');
  };

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
    ;
    // World is already saved to store by the wizard
    setShowWorldWizard(false);
  };

  const handleCharacterComplete = (character: Character) => {
    ;
    // Character is already saved to store by the wizard
    setShowCharacterWizard(false);
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

  // Show Landing Page With Hooks if requested
  if (_showLandingPageWithHooks) {
    return (
      <>
        <LandingPageWithHooks />
        {/* Installation Wizard Modal - rendered at app level */}
        <InstallationWizardModal
          isOpen={showInstallationWizard}
          onClose={handleCloseInstallationWizard}
          onComplete={handleInstallationComplete}
        />
        <Toaster />
      </>
    );
  }

  // Show Landing Page Demo if requested
  if (_showLandingPageDemo) {
    return (
      <>
        <LandingPageDemo />
        {/* Installation Wizard Modal - rendered at app level */}
        <InstallationWizardModal
          isOpen={showInstallationWizard}
          onClose={handleCloseInstallationWizard}
          onComplete={handleInstallationComplete}
        />
        <Toaster />
      </>
    );
  }

  // Show World Wizard Demo if requested
  if (_showWorldWizardDemo) {
    return (
      <>
        <WorldWizardDemo />
        {/* Installation Wizard Modal - rendered at app level */}
        <InstallationWizardModal
          isOpen={showInstallationWizard}
          onClose={handleCloseInstallationWizard}
          onComplete={handleInstallationComplete}
        />
        <Toaster />
      </>
    );
  }

  // Show landing page if no project is loaded (default view)
  if (!project) {
    return (
      <>
        <LandingPageWithHooks />
        
        {/* All Wizard Modals */}
        <InstallationWizardModal
          isOpen={showInstallationWizard}
          onClose={handleCloseInstallationWizard}
          onComplete={handleInstallationComplete}
        />
        <WorldWizardModal
          isOpen={showWorldWizard}
          onClose={() => setShowWorldWizard(false)}
          onComplete={handleWorldComplete}
        />
        <CharacterWizardModal
          isOpen={showCharacterWizard}
          onClose={() => setShowCharacterWizard(false)}
          onComplete={handleCharacterComplete}
        />
        <LLMSettingsModal
          isOpen={showLLMSettings}
          onClose={() => setShowLLMSettings(false)}
        />
        <ComfyUISettingsModal
          isOpen={showComfyUISettings}
          onClose={() => setShowComfyUISettings(false)}
        />
        <AddonsModal
          isOpen={showAddonsModal}
          onClose={() => setShowAddonsModal(false)}
        />
        <CharactersModal
          isOpen={showCharactersModal}
          onClose={() => setShowCharactersModal(false)}
        />
        <WorldModal
          isOpen={showWorldModal}
          onClose={() => setShowWorldModal(false)}
        />
        <LocationsModal
          isOpen={showLocationsModal}
          onClose={() => setShowLocationsModal(false)}
        />
        <ObjectsModal
          isOpen={showObjectsModal}
          onClose={() => setShowObjectsModal(false)}
        />
        <ImageGalleryModal
          isOpen={showImageGalleryModal}
          onClose={() => setShowImageGalleryModal(false)}
        />

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

        <Toaster />
      </>
    );
  }

  // Show editor or dashboard based on current view
  if (currentView === 'editor') {
    return (
      <>
        <MenuBar
          onNewProject={handleNewProject}
          onOpenProject={handleOpenProject}
          onSaveProject={handleSaveProject}
          onExportProject={handleExportProject}
          onCloseProject={handleCloseProject}
        />
        <EditorPageSimple 
          sequenceId={selectedSequenceId}
          onBackToDashboard={() => {
            setSelectedSequenceId(undefined);
            setCurrentView('dashboard');
          }}
        />
        
        {/* All Wizard Modals */}
        <InstallationWizardModal
          isOpen={showInstallationWizard}
          onClose={handleCloseInstallationWizard}
          onComplete={handleInstallationComplete}
        />
        <WorldWizardModal
          isOpen={showWorldWizard}
          onClose={() => setShowWorldWizard(false)}
          onComplete={handleWorldComplete}
        />
        <CharacterWizardModal
          isOpen={showCharacterWizard}
          onClose={() => setShowCharacterWizard(false)}
          onComplete={handleCharacterComplete}
        />
        <LLMSettingsModal
          isOpen={showLLMSettings}
          onClose={() => setShowLLMSettings(false)}
        />
        <ComfyUISettingsModal
          isOpen={showComfyUISettings}
          onClose={() => setShowComfyUISettings(false)}
        />
        <AddonsModal
          isOpen={showAddonsModal}
          onClose={() => setShowAddonsModal(false)}
        />

        <CharactersModal
          isOpen={showCharactersModal}
          onClose={() => setShowCharactersModal(false)}
        />
        <WorldModal
          isOpen={showWorldModal}
          onClose={() => setShowWorldModal(false)}
        />
        <LocationsModal
          isOpen={showLocationsModal}
          onClose={() => setShowLocationsModal(false)}
        />
        <ObjectsModal
          isOpen={showObjectsModal}
          onClose={() => setShowObjectsModal(false)}
        />
        <ImageGalleryModal
          isOpen={showImageGalleryModal}
          onClose={() => setShowImageGalleryModal(false)}
        />

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

        <Toaster />
      </>
    );
  }

  // Show project dashboard as default view when project is loaded
  return (
    <>
      <MenuBar
        onNewProject={handleNewProject}
        onOpenProject={handleOpenProject}
        onSaveProject={handleSaveProject}
        onExportProject={handleExportProject}
        onCloseProject={handleCloseProject}
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

      {/* Toast Notifications */}
      <Toaster />
    </>
  );
}

// Wrapper component with LLMProvider
function App() {
  return (
    <LLMProvider>
      <AppContent />
    </LLMProvider>
  );
}

export default App;