import React from 'react';
import { CreateProjectDialog, type SerializableProjectFormat } from '@/components/launcher/CreateProjectDialog';
import { useAppStore } from '@/stores/useAppStore';
import { generateProjectTemplate, sequencesToShots } from '@/utils/projectTemplateGenerator';

export function CreateProjectDialogModal() {
  const showCreateProjectDialog = useAppStore((state) => state.showCreateProjectDialog);
  const setShowCreateProjectDialog = useAppStore((state) => state.setShowCreateProjectDialog);
  const setProject = useAppStore((state) => state.setProject);
  const setShots = useAppStore((state) => state.setShots);

  if (!showCreateProjectDialog) {
    return null;
  }

  const handleCreateProject = async (
    projectName: string,
    projectPath: string,
    format: SerializableProjectFormat
  ) => {
    console.log('[CreateProjectDialogModal] Creating project:', {
      projectName,
      projectPath: projectPath || '(default)',
      format: format.name,
      electronAPIAvailable: !!window.electronAPI,
      projectAPIAvailable: !!window.electronAPI?.project,
      createAPIAvailable: !!window.electronAPI?.project?.create,
    });

    try {
      // Generate project template based on format
      const template = generateProjectTemplate(format);
      const initialShots = sequencesToShots(template.sequences);
      console.log('[CreateProjectDialogModal] Generated template:', {
        sequencesCount: template.sequences.length,
        shotsCount: initialShots.length,
      });

      if (window.electronAPI) {
        // Create project via Electron API
        const createData: unknown = {
          name: projectName,
          format: format,
          initialShots: initialShots,
        };

        // Only include location if it's not empty
        if (projectPath && projectPath.trim() !== '') {
          createData.location = projectPath;
        }

        console.log('[CreateProjectDialogModal] Calling electronAPI.project.create with:', createData);
        const electronProject = await window.electronAPI.project.create(createData);
        console.log('[CreateProjectDialogModal] Project created successfully:', electronProject);

        // Convert Electron project to Store project format
        const storeProject = {
          schema_version: electronProject.config?.schema_version || '1.0',
          project_name: electronProject.name || projectName,
          shots: initialShots,
          assets: [],
          capabilities: {
            grid_generation: true,
            promotion_engine: true,
            qa_engine: true,
            autofix_engine: true,
          },
          generation_status: {
            grid: 'pending',
            promotion: 'pending',
          },
          metadata: {
            id: electronProject.id,
            path: electronProject.path,
            version: electronProject.version,
            created_at: electronProject.createdAt instanceof Date
              ? electronProject.createdAt.toISOString()
              : electronProject.createdAt || new Date().toISOString(),
            updated_at: electronProject.modifiedAt instanceof Date
              ? electronProject.modifiedAt.toISOString()
              : electronProject.modifiedAt || new Date().toISOString(),
          },
        };

        // Load the created project into the store
        setProject(storeProject as any);
        setShots(initialShots);
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

