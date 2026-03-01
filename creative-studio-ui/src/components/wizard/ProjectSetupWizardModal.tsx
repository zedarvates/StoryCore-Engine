import { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { ProjectSetupWizard, type ProjectSetupData } from './project-setup';
import { useAppStore } from '@/stores/useAppStore';
import { useEditorStore } from '@/stores/editorStore';
import './WizardModal.css';

export function ProjectSetupWizardModal() {
  const showProjectSetupWizard = useAppStore((state) => state.showProjectSetupWizard);
  const setShowProjectSetupWizard = useAppStore((state) => state.setShowProjectSetupWizard);
  const project = useAppStore((state) => state.project);
  const setProject = useAppStore((state) => state.setProject);
  
  // Get editor store actions for saving
  const saveProject = useEditorStore((state) => state.saveProject);
  const projectPath = useEditorStore((state) => state.projectPath);

  // Handle Escape key
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowProjectSetupWizard(false);
      }
    },
    [setShowProjectSetupWizard]
  );

  useEffect(() => {
    if (showProjectSetupWizard) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [showProjectSetupWizard, handleKeyDown]);

  if (!showProjectSetupWizard) {
    return null;
  }

  const handleComplete = async (data: ProjectSetupData) => {
    console.log('✅ Project Setup completed:', data);
    
    // Update project with setup data
    if (project) {
      const updatedProject = {
        ...project,
        project_name: data.projectName || project.project_name,
        metadata: {
          ...project.metadata,
          name: data.projectName || (project.metadata?.name as string),
          description: data.projectDescription,
        },
        // Store additional setup data in project
        projectSetup: {
          genre: data.genre,
          tone: data.tone,
          targetAudience: data.targetAudience,
          estimatedDuration: data.estimatedDuration,
          visualStyle: data.visualStyle,
          audioStyle: data.audioStyle,
          constraints: data.constraints,
        },
        // Ensure Data Contract v1 compliance fields
        storyboard: project.storyboard || project.shots || [],
        assets: project.assets || [],
        capabilities: project.capabilities || {
          grid_generation: false,
          promotion_engine: false,
          qa_engine: false,
          autofix_engine: false
        },
        generation_status: project.generation_status || {
          grid: 'pending',
          promotion: 'pending'
        }
      };
      
      setProject(updatedProject);
      
      // Save project to file if projectPath is available
      if (projectPath) {
        try {
          // Update the current project in editor store first
          useEditorStore.setState({ currentProject: updatedProject as unknown as import('@/types/project').ProjectData });
          await saveProject();
          console.log('[ProjectSetupWizardModal] Project saved successfully');
        } catch (error) {
          console.error('[ProjectSetupWizardModal] Failed to save project:', error);
        }
      }
    }
    
    setShowProjectSetupWizard(false);
  };

  const handleCancel = () => {
    setShowProjectSetupWizard(false);
  };

  return (
    <div className="wizard-modal-overlay" onClick={handleCancel}>
      <div className="wizard-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="wizard-modal-header">
          <h2 className="wizard-modal-title">Project Setup</h2>
          <button
            className="wizard-modal-close"
            onClick={handleCancel}
            aria-label="Close wizard"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="wizard-modal-content">
          <ProjectSetupWizard
            onComplete={handleComplete}
            onCancel={handleCancel}
            initialData={{
              projectName: project?.project_name || (project?.metadata?.name as string | undefined),
              projectDescription: project?.global_resume || (project?.metadata?.description as string | undefined),
              // Pre-fill genre and tone from saved project setup
              genre: project?.projectSetup?.genre,
              tone: project?.projectSetup?.tone,
              targetAudience: project?.projectSetup?.targetAudience,
              estimatedDuration: project?.projectSetup?.estimatedDuration,
              visualStyle: project?.projectSetup?.visualStyle,
              audioStyle: project?.projectSetup?.audioStyle,
              constraints: project?.projectSetup?.constraints,
            }}
          />
        </div>
      </div>
    </div>
  );
}