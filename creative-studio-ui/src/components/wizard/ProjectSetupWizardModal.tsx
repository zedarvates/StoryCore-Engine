import React from 'react';
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

  if (!showProjectSetupWizard) {
    return null;
  }

  const handleComplete = async (data: ProjectSetupData) => {
    console.log('✅ Project Setup completed:', data);
    
    // Update project with setup data
    if (project) {
      const updatedProject = {
        ...project,
        metadata: {
          ...project.metadata,
          name: data.projectName || project.metadata?.name,
          description: data.projectDescription,
        },
        // Store additional setup data in project
        projectSetup: {
          genre: data.genre,
          tone: data.tone,
          targetAudience: data.targetAudience,
          estimatedDuration: data.estimatedDuration,
        },
      };
      
      setProject(updatedProject);
      
      // Save project to file if projectPath is available
      if (projectPath) {
        try {
          // Update the current project in editor store first
          useEditorStore.setState({ currentProject: updatedProject });
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
              projectName: project?.metadata?.name as string | undefined,
              projectDescription: project?.metadata?.description as string | undefined,
              // Pre-fill genre and tone from saved project setup
              genre: (project as any)?.projectSetup?.genre,
              tone: (project as any)?.projectSetup?.tone,
              targetAudience: (project as any)?.projectSetup?.targetAudience,
              estimatedDuration: (project as any)?.projectSetup?.estimatedDuration,
            }}
          />
        </div>
      </div>
    </div>
  );
}