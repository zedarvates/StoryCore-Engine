import { LegacyAny } from '@/types/legacy';
import React from 'react';
import { CreateProjectDialog, type SerializableProjectFormat } from '@/components/launcher/CreateProjectDialog';
import { useAppStore } from '@/stores/useAppStore';
import { generateProjectTemplate, sequencesToShots } from '@/utils/projectTemplateGenerator';
import { useNavigate } from 'react-router-dom';
import { projectCreationService, convertElectronProjectToStore } from '@/services/ProjectCreationService';

export function CreateProjectDialogModal() {
  const showCreateProjectDialog = useAppStore((state) => state.showCreateProjectDialog);
  const setShowCreateProjectDialog = useAppStore((state) => state.setShowCreateProjectDialog);
  const navigate = useNavigate();

  if (!showCreateProjectDialog) {
    return null;
  }

  const handleCreateProject = async (
    projectName: string,
    projectPath: string,
    format: SerializableProjectFormat,
    options?: Record<string, any>
  ) => {
    const electronAPI = (window as LegacyAny).electronAPI;
    console.log('[CreateProjectDialogModal] Creating project:', {
      projectName,
      projectPath: projectPath || '(default)',
      format: format.name,
      options,
      electronAPIAvailable: !!window.electronAPI,
      projectAPIAvailable: !!window.electronAPI?.project,
      createAPIAvailable: !!window.electronAPI?.project?.create,
    });

    try {
      // Generate project template based on format and options
      const template = generateProjectTemplate(format, options);
      const initialShots = sequencesToShots(template.sequences);
      console.log('[CreateProjectDialogModal] Generated template:', {
        sequencesCount: template.sequences.length,
        shotsCount: initialShots.length,
      });

      if (electronAPI) {
        const createData: LegacyAny = {
          name: projectName,
          format: format,
          initialShots: initialShots,
          options: options,
        };

        // Only include location if it's not empty
        if (projectPath && projectPath.trim() !== '') {
          createData.location = projectPath;
        }

        console.log('[CreateProjectDialogModal] Calling electronAPI.project.create with:', createData);
        const electronProject = await window.electronAPI.project.create(createData);
        console.log('[CreateProjectDialogModal] Project created successfully:', electronProject);

        // Convert Electron project to Store project format using the service
        const storeProject = convertElectronProjectToStore(electronProject as LegacyAny);
        
        // Ensure shots and sequences are properly set
        storeProject.shots = initialShots;
        (storeProject as LegacyAny).sequencePlans = template.sequences;

        // Load the created project into the store via the service
        await projectCreationService.loadProjectIntoStores(storeProject, electronProject.path, template.sequences);

        // Navigate to the project dashboard immediately
        if (electronProject.path) {
          const encodedPath = encodeURIComponent(electronProject.path);
          navigate(`/project/${encodedPath}`);
        }
      } else {
        throw new Error('Electron API not available. Cannot create project files.');
      }

      // Close the dialog
      setShowCreateProjectDialog(false);
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  };

  return (
    <CreateProjectDialog
      open={showCreateProjectDialog}
      onOpenChange={setShowCreateProjectDialog}
      onCreateProject={handleCreateProject}
    />
  );
}

