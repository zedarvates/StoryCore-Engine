import React, { useState, useCallback, useEffect } from 'react';
import { 
  Folder, 
  Clock, 
  X, 
  AlertCircle, 
  CheckCircle,
  FolderOpen,
  RefreshCw,
  Plus,
  Video,
  Film,
  Image,
  Clapperboard
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
  isRecent?: boolean; // Flag to indicate if this is a recently opened project
  projectType?: 'video' | 'animation' | 'image' | 'mixed'; // Project type for badge
  thumbnailUrl?: string; // Thumbnail preview URL
  sceneCount?: number; // Number of scenes
  shotCount?: number; // Number of shots
}

// Project type configurations
const PROJECT_TYPE_CONFIG = {
  video: {
    icon: Video,
    label: 'Video',
    color: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    bgGradient: 'from-blue-500/30 to-cyan-500/20',
  },
  animation: {
    icon: Film,
    label: 'Animation',
    color: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    bgGradient: 'from-purple-500/30 to-pink-500/20',
  },
  image: {
    icon: Image,
    label: 'Images',
    color: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    bgGradient: 'from-amber-500/30 to-orange-500/20',
  },
  mixed: {
    icon: Clapperboard,
    label: 'Mixed',
    color: 'bg-green-500/20 text-green-300 border-green-500/30',
    bgGradient: 'from-green-500/30 to-emerald-500/20',
  },
} as const;

interface RecentProjectsListProps {
  projects: RecentProject[];
  onProjectClick: (project: RecentProject) => void;
  onRemoveProject: (projectPath: string) => void;
  onCreateNew?: () => void;
  onRefresh?: () => void;
  className?: string;
  isLoading?: boolean;
  animated?: boolean; // Enable entrance animations
}

// ============================================================================
// Enhanced Recent Projects List Component
// ============================================================================

export function RecentProjectsList({
  projects,
  onProjectClick,
  onRemoveProject,
  onCreateNew,
  onRefresh,
  className,
  isLoading = false,
  animated = true,
}: RecentProjectsListProps) {
  const [visibleProjects, setVisibleProjects] = useState<RecentProject[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);

  // Animate entrance when projects load
  useEffect(() => {
    if (!isLoading && projects.length > 0) {
      // Stagger the animation of each project card
      const timer = setTimeout(() => {
        setVisibleProjects(projects);
        setIsInitializing(false);
      }, 100);
      return () => clearTimeout(timer);
    } else if (!isLoading) {
      setIsInitializing(false);
    }
  }, [isLoading, projects]);

  if (isLoading) {
    return (
      <div className={cn('text-center py-12', className)}>
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-800 mx-auto mb-4">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <h3 className="text-lg font-semibold text-gray-400 mb-2">
          Discovering Projects
        </h3>
        <p className="text-sm text-gray-500">
          Scanning your StoryCore Projects folder...
        </p>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-800 mx-auto mb-4">
          <FolderOpen className="w-8 h-8 text-gray-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-400 mb-2">
          No Projects Found
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          No StoryCore projects were found in your projects folder.
          {onRefresh && ' Try refreshing or create a new project to get started.'}
          {!onRefresh && ' Create a new project to get started.'}
        </p>
        <div className="flex items-center justify-center gap-3">
          {onCreateNew && (
            <Button
              onClick={onCreateNew}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Project
            </Button>
          )}
          {onRefresh && (
            <Button
              onClick={onRefresh}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-400" />
          Recent Projects
          <span className="text-sm font-normal text-gray-500">({projects.length})</span>
        </h3>
        {onRefresh && (
          <Button
            onClick={onRefresh}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white hover:bg-gray-700"
            title="Refresh project list"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {projects.map((project, index) => (
          <EnhancedProjectCard
            key={project.id}
            project={project}
            index={index}
            onClick={() => onProjectClick(project)}
            onRemove={() => onRemoveProject(project.path)}
            animated={animated}
            isVisible={visibleProjects.some(p => p.id === project.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Enhanced Project Card Component
// ============================================================================

interface EnhancedProjectCardProps {
  project: RecentProject;
  index: number;
  onClick: () => void;
  onRemove: () => void;
  animated: boolean;
  isVisible: boolean;
}

function EnhancedProjectCard({ 
  project, 
  index, 
  onClick, 
  onRemove, 
  animated,
  isVisible 
}: EnhancedProjectCardProps) {
  const isMissing = project.exists === false;
  const isValid = project.exists === true;
  const isRecent = project.isRecent === true;
  
  // Determine project type - infer from metadata or use provided type
  const projectType = project.projectType || inferProjectType(project);
  const typeConfig = PROJECT_TYPE_CONFIG[projectType as keyof typeof PROJECT_TYPE_CONFIG] || PROJECT_TYPE_CONFIG.mixed;
  const TypeIcon = typeConfig.icon;

  // Format last accessed time
  const formatLastAccessed = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // Format scene/shot count
  const formatProjectStats = (): string => {
    const parts: string[] = [];
    if (project.sceneCount) parts.push(`${project.sceneCount} scenes`);
    if (project.shotCount) parts.push(`${project.shotCount} shots`);
    return parts.join(' • ');
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

  // Animation delay based on index for staggered entrance
  const animationDelay = animated ? `${index * 50}ms` : '0ms';

  return (
    <div
      onClick={handleClick}
      title={project.path}
      className={cn(
        'group relative w-full flex items-center gap-4 p-4 rounded-xl transition-all cursor-pointer',
        'border backdrop-blur-sm overflow-hidden',
        // Base styles
        'bg-gray-800/40',
        // Animated visibility
        animated && !isVisible && 'opacity-0 translate-y-4',
        animated && isVisible && 'opacity-100 translate-y-0 animate-fadeIn',
        // Hover effects
        !isMissing && !isRecent && 'border-gray-700 hover:bg-gray-700/60 hover:border-gray-600 hover:shadow-lg hover:shadow-gray-500/10',
        !isMissing && isRecent && 'border-blue-600/40 hover:bg-blue-900/30 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20',
        isMissing && 'opacity-60 cursor-not-allowed border-gray-700'
      )}
      style={{ animationDelay }}
    >
      {/* Animated Background Gradient */}
      {!isMissing && (
        <div 
          className={cn(
            'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500',
            `bg-gradient-to-r ${typeConfig.bgGradient}`
          )}
        />
      )}

      {/* Thumbnail Preview (if available) */}
      {project.thumbnailUrl && !isMissing && (
        <div className="relative flex-shrink-0">
          <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-600 bg-gray-900">
            <img 
              src={project.thumbnailUrl} 
              alt={`${project.name} thumbnail`}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to icon if image fails to load
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            {/* Fallback icon shown when image fails or loads */}
            <div className="absolute inset-0 flex items-center justify-center">
              <TypeIcon className="w-6 h-6 text-gray-500" />
            </div>
          </div>
        </div>
      )}

      {/* Project Icon with Status (when no thumbnail) */}
      {!project.thumbnailUrl && (
        <div className="relative flex-shrink-0">
          <div
            className={cn(
              'flex items-center justify-center w-12 h-12 rounded-lg transition-colors',
              isMissing && 'bg-red-500/20',
              isValid && isRecent && 'bg-blue-500/30 group-hover:bg-blue-500/40',
              isValid && !isRecent && 'bg-blue-500/20 group-hover:bg-blue-500/30',
              !isMissing && !isValid && 'bg-gray-700 group-hover:bg-gray-600'
            )}
          >
            <TypeIcon
              className={cn(
                'w-6 h-6',
                isMissing && 'text-red-400',
                isValid && isRecent && 'text-blue-400',
                isValid && !isRecent && 'text-blue-300',
                !isMissing && !isValid && 'text-gray-400'
              )}
            />
          </div>

          {/* Status Indicator */}
          {isMissing && (
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
              <AlertCircle className="w-3 h-3 text-white" />
            </div>
          )}
          {isValid && (
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
              <CheckCircle className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
      )}

      {/* Project Info */}
      <div className="flex-1 min-w-0 relative z-10">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h4
            className={cn(
              'font-semibold truncate',
              isMissing ? 'text-gray-500' : 'text-white'
            )}
          >
            {project.name}
          </h4>
          
          {/* Project Type Badge */}
          {!isMissing && (
            <span className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
              typeConfig.color
            )}>
              <TypeIcon className="w-3 h-3" />
              {typeConfig.label}
            </span>
          )}
          
          {/* Recently Opened Badge */}
          {isRecent && !isMissing && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Recent
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <span
            className={cn(
              'truncate',
              isMissing ? 'text-gray-600' : 'text-gray-400'
            )}
            title={project.path}
          >
            {project.path}
          </span>
        </div>
        
        <div className="flex items-center gap-3 mt-1">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            <span>{formatLastAccessed(project.lastAccessed)}</span>
          </div>
          
          {/* Project Stats */}
          {!isMissing && formatProjectStats() && (
            <>
              <span className="text-gray-600">•</span>
              <span className="text-xs text-gray-500">
                {formatProjectStats()}
              </span>
            </>
          )}
          
          {isMissing && (
            <span className="text-xs text-red-400 font-medium">
              Project not found
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
          'flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200',
          'hover:bg-red-500/20 hover:text-red-400'
        )}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Infer project type from project metadata
 */
function inferProjectType(project: RecentProject): RecentProject['projectType'] {
  // This could be enhanced to read actual project metadata
  // For now, we'll use a simple heuristic based on naming or default to 'mixed'
  
  const name = project.name.toLowerCase();
  
  if (name.includes('animation') || name.includes('anime')) {
    return 'animation';
  }
  if (name.includes('video') || name.includes('clip')) {
    return 'video';
  }
  if (name.includes('image') || name.includes('gallery')) {
    return 'image';
  }
  
  return 'mixed';
}
