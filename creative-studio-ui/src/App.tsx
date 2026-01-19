import { useState, useEffect } from 'react';
import { useAppStore, type WizardType } from '@/stores/useAppStore';
import { MenuBar } from '@/components/MenuBar';
import { WorldWizardDemo } from '@/pages/WorldWizardDemo';
import { LandingPageDemo } from '@/pages/LandingPageDemo';
import { LandingPageWithHooks } from '@/pages/LandingPageWithHooks';
import { EditorPage } from '@/pages/EditorPage';
import { ProjectDashboardPage } from '@/pages/ProjectDashboardPage';
import { InstallationWizardModal } from '@/components/installation/InstallationWizardModal';
import { WorldWizardModal } from '@/components/wizard/WorldWizardModal';
import { CharacterWizardModal } from '@/components/wizard/CharacterWizardModal';
import { SequencePlanWizardModal } from '@/components/wizard/SequencePlanWizardModal';
import { ShotWizardModal } from '@/components/wizard/ShotWizardModal';
import { GenericWizardModal } from '@/components/wizard/GenericWizardModal';
import { LLMSettingsModal } from '@/components/settings/LLMSettingsModal';
import { ComfyUISettingsModal } from '@/components/settings/ComfyUISettingsModal';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { useOllamaInit } from '@/hooks/useOllamaInit';
import { useGlobalKeyboardShortcuts } from '@/hooks/useGlobalKeyboardShortcuts';
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

function App() {
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
    // Generic wizard state (Requirements 1.1, 1.2)
    showDialogueWriter,
    showSceneGenerator,
    showStoryboardCreator,
    showStyleTransfer,
    showWorldBuilding,
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
  
  // Show Ollama status in console
  useEffect(() => {
    if (ollamaState.isInitialized && ollamaState.recommendation) {
      if (ollamaState.isOllamaAvailable) {
        console.log(`🚀 StoryCore ready with ${ollamaState.recommendation.model.name}`);
      } else {
        console.log('⚠️ StoryCore ready (Ollama not available - LLM features limited)');
      }
    }
  }, [ollamaState]);
  const setRecentProjects = useState<RecentProject[]>(getRecentProjects())[1];
  const [_showWorldWizardDemo, _setShowWorldWizardDemo] = useState(false);
  const [_showLandingPageDemo, _setShowLandingPageDemo] = useState(false);
  const [_showLandingPageWithHooks, _setShowLandingPageWithHooks] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'editor'>('dashboard');

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
    console.log('ComfyUI installed at:', installationPath);
    setInstallationComplete(true);
    setShowInstallationWizard(false);
    // Could update app configuration here
  };

  const handleCloseInstallationWizard = () => {
    setShowInstallationWizard(false);
  };

  const handleWorldComplete = (world: World) => {
    console.log('World created:', world);
    // World is already saved to store by the wizard
    setShowWorldWizard(false);
  };

  const handleCharacterComplete = (character: Character) => {
    console.log('Character created:', character);
    // Character is already saved to store by the wizard
    setShowCharacterWizard(false);
  };

  // Generic wizard completion handler (Requirement 5.3, 9.1)
  const handleWizardComplete = (data: any) => {
    console.log('Wizard completed with data:', data);
    
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
          
        case 'world-building':
          // Add world data to project
          const newWorld: World = {
            id: `world-${Date.now()}`,
            name: data.worldName,
            genre: [],
            timePeriod: data.timePeriod,
            tone: [],
            locations: data.locations.map((loc: any, index: number) => ({
              id: `loc-${Date.now()}-${index}`,
              name: loc.name,
              description: loc.description,
              significance: 'medium',
              atmosphere: '',
            })),
            rules: [],
            atmosphere: data.setting,
            culturalElements: {
              languages: [],
              religions: [],
              traditions: [],
              historicalEvents: [],
              culturalConflicts: [],
            },
            technology: '',
            magic: '',
            conflicts: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          const updatedProjectWithWorld = {
            ...project,
            worlds: [...(project.worlds || []), newWorld],
            selectedWorldId: newWorld.id,
          };
          setProject(updatedProjectWithWorld);
          
          toast({
            title: 'World Created',
            description: `World "${data.worldName}" has been added with ${data.locations.length} locations`,
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
        <EditorPage onBackToDashboard={() => setCurrentView('dashboard')} />
        
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
      <ProjectDashboardPage onOpenEditor={() => setCurrentView('editor')} />
      
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

export default App;
