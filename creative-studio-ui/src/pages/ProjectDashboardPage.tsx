/**
 * Project Dashboard Page
 * 
 * Main dashboard view after opening/creating a project
 * Shows the new redesigned dashboard with sequences, LLM assistant, and more
 */

import { ProjectDashboardNew } from '@/components/workspace/ProjectDashboardNew';
import { useAppStore } from '@/stores/useAppStore';
import { ProjectProvider } from '@/contexts/ProjectContext';
import { useCharacterPersistence } from '@/hooks/useCharacterPersistence';
import { useLocationPersistence } from '@/hooks/useLocationPersistence';
import { useWorldPersistence } from '@/hooks/useWorldPersistence';
import { useObjectStore } from '@/stores/objectStore';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

interface ProjectDashboardPageProps {
  onOpenEditor?: (sequenceId?: string) => void;
}

export function ProjectDashboardPage({ onOpenEditor }: ProjectDashboardPageProps) {
  const { project } = useAppStore();
  const navigate = useNavigate();
  const { projectId: routeProjectId } = useParams();
  
  // Use the ID from route if project metadata is not available yet
  const projectId = project?.metadata?.id || routeProjectId || 'default';

  const handleOpenEditor = (sequenceId?: string) => {
    if (onOpenEditor) {
      onOpenEditor(sequenceId);
    } else if (sequenceId) {
      // Default navigation logic if no handler provided
      navigate(`/project/${projectId}/editor/${sequenceId}`);
    }
  };
  const { loadAndSyncCharacters } = useCharacterPersistence();
  const { loadAndSyncLocations } = useLocationPersistence();
  const { syncWorldsFromProject } = useWorldPersistence();
  const fetchProjectObjects = useObjectStore((state) => state.fetchProjectObjects);

  const projectPath = (project?.metadata?.path as string) || (project as unknown as Record<string, unknown>)?.path as string || '';

  useEffect(() => {
    if (projectPath) {
      // Automatically sync all entities from the project directory when the dashboard opens
      // We use the path/ID as dependencies to avoid infinite loops when the project object itself is updated during sync
      console.log(`[ProjectDashboardPage] Project changed: ${projectPath}. Triggering sync.`);
      loadAndSyncCharacters().catch(console.error);
      loadAndSyncLocations().catch(console.error);
      syncWorldsFromProject().catch(console.error);
      fetchProjectObjects(projectPath).catch(console.error);
    }
  }, [projectPath, loadAndSyncCharacters, loadAndSyncLocations, syncWorldsFromProject, fetchProjectObjects]);

  // If no project is loaded, show error
  if (!project) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">No Project Loaded</h1>
          <p className="text-muted-foreground">Please create or open a project first.</p>
        </div>
      </div>
    );
  }

  return (
    <ProjectProvider projectId={(project.metadata?.id as string) || project.project_name}>
      <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col h-screen bg-background text-foreground relative">
        {/* Main Content - New Dashboard */}
        <div className="flex-1 overflow-hidden">
          <ProjectDashboardNew
            onOpenEditor={handleOpenEditor}
          />
        </div>
      </div>
      </DndProvider>
    </ProjectProvider>
  );
}