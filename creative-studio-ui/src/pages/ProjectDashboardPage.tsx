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

interface ProjectDashboardPageProps {
  onOpenEditor?: (sequenceId?: string) => void;
}

export function ProjectDashboardPage({ onOpenEditor }: ProjectDashboardPageProps) {
  const { project } = useAppStore();
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
      <div className="flex flex-col h-screen bg-background text-foreground">
        {/* Top Navigation Bar */}
        <div className="h-14 border-b border-border bg-card flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold">{project.project_name}</h1>
            <span className="text-sm text-muted-foreground">Project Dashboard</span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Nouveau Plan button moved to Plan Sequences section in ProjectDashboardNew */}
          </div>
        </div>

        {/* Main Content - New Dashboard */}
        <div className="flex-1 overflow-hidden">
          <ProjectDashboardNew
            onOpenEditor={onOpenEditor || (() => {})}
          />
        </div>
      </div>
    </ProjectProvider>
  );
}