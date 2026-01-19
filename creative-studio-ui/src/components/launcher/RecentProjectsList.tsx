import React from 'react';
import { 
  Folder, 
  Clock, 
  X, 
  AlertCircle, 
  CheckCircle,
  FolderOpen 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface RecentProject {
  id: string;
  name: string;
  path: string;
  lastAccessed: Date;
  exists?: boolean;
}

interface RecentProjectsListProps {
  projects: RecentProject[];
  onProjectClick: (project: RecentProject) => void;
  onRemoveProject: (projectPath: string) => void;
  className?: string;
}

// ============================================================================
// Recent Projects List Component
// ============================================================================

export function RecentProjectsList({
  projects,
  onProjectClick,
  onRemoveProject,
  className,
}: RecentProjectsListProps) {
  if (projects.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-800 mx-auto mb-4">
          <FolderOpen className="w-8 h-8 text-gray-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-400 mb-2">
          No Recent Projects
        </h3>
        <p className="text-sm text-gray-500">
          Your recently opened projects will appear here
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-blue-400" />
        Recent Projects
      </h3>

      <div className="space-y-2">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onClick={() => onProjectClick(project)}
            onRemove={() => onRemoveProject(project.path)}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Project Card Component
// ============================================================================

interface ProjectCardProps {
  project: RecentProject;
  onClick: () => void;
  onRemove: () => void;
}

function ProjectCard({ project, onClick, onRemove }: ProjectCardProps) {
  const isMissing = project.exists === false;
  const isValid = project.exists === true;
  
  // Format last accessed time
  const formatLastAccessed = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  };

  const handleRemove = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onRemove();
  };

  const handleClick = () => {
    if (!isMissing) {
      onClick();
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'group w-full flex items-center gap-4 p-4 rounded-lg transition-all cursor-pointer',
        'border border-gray-700 bg-gray-800/50 backdrop-blur-sm',
        !isMissing && 'hover:bg-gray-700/50 hover:border-gray-600 hover:shadow-lg',
        isMissing && 'opacity-60 cursor-not-allowed'
      )}
    >
      {/* Project Icon with Status */}
      <div className="relative flex-shrink-0">
        <div
          className={cn(
            'flex items-center justify-center w-12 h-12 rounded-lg transition-colors',
            isMissing && 'bg-red-500/20',
            isValid && 'bg-blue-500/20 group-hover:bg-blue-500/30',
            !isMissing && !isValid && 'bg-gray-700 group-hover:bg-gray-600'
          )}
        >
          <Folder
            className={cn(
              'w-6 h-6',
              isMissing && 'text-red-400',
              isValid && 'text-blue-400',
              !isMissing && !isValid && 'text-gray-400'
            )}
          />
        </div>

        {/* Status Indicator */}
        {isMissing && (
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
            <AlertCircle className="w-3 h-3 text-white" />
          </div>
        )}
        {isValid && (
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
            <CheckCircle className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Project Info */}
      <div className="flex-1 min-w-0">
        <h4
          className={cn(
            'font-semibold truncate mb-1',
            isMissing ? 'text-gray-500' : 'text-white'
          )}
        >
          {project.name}
        </h4>
        <div className="flex items-center gap-2 text-sm">
          <span
            className={cn(
              'truncate',
              isMissing ? 'text-gray-600' : 'text-gray-400'
            )}
          >
            {project.path}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Clock className="w-3 h-3 text-gray-500" />
          <span className="text-xs text-gray-500">
            {formatLastAccessed(project.lastAccessed)}
          </span>
          {isMissing && (
            <span className="text-xs text-red-400 font-medium">
              • Project not found
            </span>
          )}
        </div>
      </div>

      {/* Remove Button */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleRemove}
        aria-label={`Remove ${project.name} from recent projects`}
        className={cn(
          'flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity',
          'hover:bg-red-500/20 hover:text-red-400'
        )}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
