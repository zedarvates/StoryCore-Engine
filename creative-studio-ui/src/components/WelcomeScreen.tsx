import { FileText, FolderOpen, Clock, GlobeIcon, UserIcon } from 'lucide-react';
import type { RecentProject } from '@/utils/projectManager';

interface WelcomeScreenProps {
  onNewProject: () => void;
  onOpenProject: () => void;
  recentProjects: RecentProject[];
  onOpenRecentProject: (project: RecentProject) => void;
  onCreateWorld?: () => void;
  onCreateCharacter?: () => void;
}

export function WelcomeScreen({
  onNewProject,
  onOpenProject,
  recentProjects,
  onOpenRecentProject,
  onCreateWorld,
  onCreateCharacter,
}: WelcomeScreenProps) {
  return (
    <div className="flex h-full items-center justify-center bg-background">
      <div className="w-full max-w-2xl p-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold">Creative Studio UI</h1>
          <p className="text-lg text-muted-foreground">
            Professional video storyboard editor with drag-and-drop, timeline editing, and more
          </p>
        </div>

        {/* Action Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* New Project Card */}
          <button
            onClick={onNewProject}
            className="group flex flex-col items-center rounded-lg border border-border bg-card p-6 text-center transition-colors hover:border-primary hover:bg-accent"
          >
            <div className="mb-3 rounded-full bg-primary/10 p-4 transition-colors group-hover:bg-primary/20">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">New Project</h3>
            <p className="text-sm text-muted-foreground">
              Create a new storyboard project from scratch
            </p>
          </button>

          {/* Open Project Card */}
          <button
            onClick={onOpenProject}
            className="group flex flex-col items-center rounded-lg border border-border bg-card p-6 text-center transition-colors hover:border-primary hover:bg-accent"
          >
            <div className="mb-3 rounded-full bg-primary/10 p-4 transition-colors group-hover:bg-primary/20">
              <FolderOpen className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Open Project</h3>
            <p className="text-sm text-muted-foreground">
              Load an existing project from your computer
            </p>
          </button>
        </div>

        {/* Wizard Shortcuts */}
        {(onCreateWorld || onCreateCharacter) && (
          <div className="mb-8">
            <h3 className="mb-4 text-lg font-semibold text-center">Quick Create</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Create World Card */}
              {onCreateWorld && (
                <button
                  onClick={onCreateWorld}
                  className="group flex flex-col items-center rounded-lg border border-border bg-card p-4 text-center transition-colors hover:border-primary hover:bg-accent"
                >
                  <div className="mb-2 rounded-full bg-blue-500/10 p-3 transition-colors group-hover:bg-blue-500/20">
                    <GlobeIcon className="h-6 w-6 text-blue-500" />
                  </div>
                  <h4 className="mb-1 text-base font-semibold">Create World</h4>
                  <p className="text-xs text-muted-foreground">
                    Build a rich story world with AI assistance
                  </p>
                </button>
              )}

              {/* Create Character Card */}
              {onCreateCharacter && (
                <button
                  onClick={onCreateCharacter}
                  className="group flex flex-col items-center rounded-lg border border-border bg-card p-4 text-center transition-colors hover:border-primary hover:bg-accent"
                >
                  <div className="mb-2 rounded-full bg-purple-500/10 p-3 transition-colors group-hover:bg-purple-500/20">
                    <UserIcon className="h-6 w-6 text-purple-500" />
                  </div>
                  <h4 className="mb-1 text-base font-semibold">Create Character</h4>
                  <p className="text-xs text-muted-foreground">
                    Design detailed characters with AI suggestions
                  </p>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Recent Projects */}
        {recentProjects.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Recent Projects</h3>
            </div>
            <div className="space-y-2">
              {recentProjects.slice(0, 5).map((project) => (
                <button
                  key={project.name}
                  onClick={() => onOpenRecentProject(project)}
                  className="flex w-full items-center justify-between rounded-md border border-border bg-background px-4 py-3 text-left transition-colors hover:bg-accent"
                >
                  <div className="flex-1">
                    <p className="font-medium">{project.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Last opened: {new Date(project.lastAccessed).toLocaleDateString()}
                    </p>
                  </div>
                  <FolderOpen className="h-5 w-5 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Tips */}
        <div className="mt-8 rounded-lg bg-muted p-4 text-sm text-muted-foreground">
          <p className="mb-2 font-medium">Quick Tips:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Projects are saved in Data Contract v1.0 format</li>
            <li>Compatible with StoryCore-Engine backend</li>
            <li>Use keyboard shortcuts for faster workflow</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
