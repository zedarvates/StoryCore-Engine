/**
 * Project Dashboard Page
 * 
 * Main dashboard view after opening/creating a project
 * Shows the new redesigned dashboard with sequences, LLM assistant, and more
 */

import { ProjectDashboardNew } from '@/components/workspace/ProjectDashboardNew';
import { ChatPanel } from '@/components/ChatPanel';
import { ChatToggleButton } from '@/components/ChatToggleButton';
import { useAppStore } from '@/stores/useAppStore';
import { Film } from 'lucide-react';

interface ProjectDashboardPageProps {
  onOpenEditor: (sequenceId?: string) => void;
}

export function ProjectDashboardPage({ onOpenEditor }: ProjectDashboardPageProps) {
  const { project } = useAppStore();
  const openSequencePlanWizard = useAppStore((state) => state.openSequencePlanWizard);

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
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Top Navigation Bar */}
      <div className="h-14 border-b border-border bg-card flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">{project.project_name}</h1>
          <span className="text-sm text-muted-foreground">Project Dashboard</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => openSequencePlanWizard({ mode: 'create', sourceLocation: 'dashboard' })}
            className="px-4 py-1.5 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 flex items-center gap-2"
            title="Créer un nouveau plan de séquence"
          >
            <Film className="w-4 h-4" />
            Nouveau Plan
          </button>
          {/* Open Editor button commented out - sequences now open editor directly
          <button
            onClick={() => onOpenEditor()}
            className="px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-2"
          >
            🎬 Open Editor
          </button>
          */}

        </div>
      </div>

      {/* Main Content - New Dashboard */}
      <div className="flex-1 overflow-hidden">
        <ProjectDashboardNew
          projectId={project.metadata?.id || project.project_name}
          projectName={project.project_name}
          onOpenEditor={onOpenEditor}
        />
      </div>

      {/* Chat Toggle Button */}
      <ChatToggleButton />

      {/* Chat Panel */}
      <ChatPanel />
    </div>
  );
}