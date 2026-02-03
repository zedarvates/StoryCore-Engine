import React, { useState, useEffect, useCallback } from 'react';
import { Clapperboard, FolderOpen, Plus, Sparkles, Video, Film, Image, Clock, Calendar } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { RecentProjectsList, type RecentProject } from '@/components/launcher/RecentProjectsList';
import { useServiceStatus } from '@/components/ui/service-warning';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

/**
 * MergedProject represents the structure of projects returned from getMergedList().
 * It combines stored recent projects with discovered projects from the file system.
 * The isRecent flag indicates if this is from the recent projects list.
 */
interface MergedProject {
  id?: string;
  name: string;
  path: string;
  lastModified?: Date;
  lastAccessed?: Date;
  createdAt?: Date;
  isRecent?: boolean;
  lastOpened?: Date;
  exists?: boolean;
}

// ============================================================================
// Landing Page Component
// ============================================================================

interface LandingPageProps {
  onCreateProject: () => void;
  onOpenProject: () => void;
  recentProjects?: RecentProject[];
  onRecentProjectClick?: (project: RecentProject) => void;
  onRemoveRecentProject?: (projectPath: string) => void;
  version?: string;
  children?: React.ReactNode;
}

export function LandingPage({
  onCreateProject,
  onOpenProject,
  recentProjects = [],
  onRecentProjectClick,
  onRemoveRecentProject,
  version = '1.0.0',
  children,
}: LandingPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mergedProjects, setMergedProjects] = useState<RecentProject[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);

  // Trigger project discovery on component mount
  useEffect(() => {
    discoverProjects();
  }, []);

  const discoverProjects = async () => {
    // Only discover if we have access to the Electron API
    if (!window.electronAPI?.recentProjects?.getMergedList) {
      // Fallback to provided recent projects if not in Electron environment
      setMergedProjects(recentProjects);
      return;
    }

    setIsDiscovering(true);
    setDiscoveryError(null);

    try {
      const discovered = await window.electronAPI.recentProjects.getMergedList();
      
      // Convert MergedProject to RecentProject format for display
      const converted: RecentProject[] = discovered.map((project: MergedProject) => ({
        id: project.id || project.path,
        name: project.name,
        path: project.path,
        lastAccessed: project.lastOpened || project.lastModified || new Date(),
        exists: project.exists,
        isRecent: project.isRecent ?? true, // Default to true for merged list projects
      }));
      
      setMergedProjects(converted);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to discover projects';
      setDiscoveryError(errorMessage);
      console.error('Project discovery error:', err);
      
      // Fallback to provided recent projects on error
      setMergedProjects(recentProjects);
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleRefresh = async () => {
    await discoverProjects();
  };

  const handleCreateProject = () => {
    setIsLoading(true);
    setError(null);
    try {
      onCreateProject();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenProject = () => {
    setIsLoading(true);
    setError(null);
    try {
      onOpenProject();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open project');
    } finally {
      setIsLoading(false);
    }
  };

  // Determine which projects to display
  const displayProjects = mergedProjects.length > 0 ? mergedProjects : recentProjects;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      {/* Header with Branding */}
      <header className="border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                <Clapperboard className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  StoryCore Creative Studio
                </h1>
                <p className="text-sm text-gray-400">
                  From Script to Screen Safer & faster
                </p>
              </div>
            </div>

            {/* Version Badge */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-800 border border-gray-700">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-gray-300">v{version}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Welcome Section */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              Welcome to StoryCore
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Create quality cinematic sequences with visual coherence.
              Start a new project or continue where you left off.
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <p>{error}</p>
            </Alert>
          )}

          {/* Discovery Error Display */}
          {discoveryError && (
            <Alert variant="destructive" className="mb-6">
              <p className="font-semibold">Project Discovery Error</p>
              <p className="text-sm mt-1">{discoveryError}</p>
              <p className="text-sm mt-2 text-gray-300">
                Showing recently opened projects only. Some projects in your StoryCore Projects folder may not be visible.
              </p>
            </Alert>
          )}

          {/* Action Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* Create New Project Card */}
            <button
              onClick={handleCreateProject}
              disabled={isLoading}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 p-8 text-left transition-all hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <div className="relative z-10">
                <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-white/20 backdrop-blur-sm mb-4">
                  <Plus className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Create New Project
                </h3>
                <p className="text-blue-100">
                  Start fresh with a new StoryCore project. Set up your scenes, characters, and worlds.
                </p>
              </div>
              
              {/* Animated Background Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-400/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            {/* Open Existing Project Card */}
            <button
              onClick={handleOpenProject}
              disabled={isLoading}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-700 to-gray-800 p-8 text-left transition-all hover:scale-105 hover:shadow-2xl border border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <div className="relative z-10">
                <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-white/10 backdrop-blur-sm mb-4">
                  <FolderOpen className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Open Existing Project
                </h3>
                <p className="text-gray-300">
                  Continue working on an existing project. Browse your files to get started.
                </p>
              </div>
              
              {/* Animated Background Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-600/20 to-gray-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>

          {/* Loading State */}
          {(isLoading || isDiscovering) && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-gray-800 border border-gray-700">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-gray-300">
                  {isDiscovering ? 'Discovering projects...' : 'Loading...'}
                </span>
              </div>
            </div>
          )}

          {/* Chat Assistant Section */}
          {children && (
            <div className="mt-8">
              {children}
            </div>
          )}

          {/* Features Highlight - Hidden per UI Polish requirements */}
          {/* 
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <div className="text-center p-6 rounded-xl bg-gray-800/50 border border-gray-700">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-500/20 mx-auto mb-3">
                <Sparkles className="w-6 h-6 text-blue-400" />
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">
                Visual Coherence
              </h4>
              <p className="text-sm text-gray-400">
                Master Coherence Sheet ensures consistent style across all scenes
              </p>
            </div>

            <div className="text-center p-6 rounded-xl bg-gray-800/50 border border-gray-700">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-purple-500/20 mx-auto mb-3">
                <Clapperboard className="w-6 h-6 text-purple-400" />
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">
                Professional Quality
              </h4>
              <p className="text-sm text-gray-400">
                Autonomous QA and autofix ensure production-ready results
              </p>
            </div>

            <div className="text-center p-6 rounded-xl bg-gray-800/50 border border-gray-700">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-green-500/20 mx-auto mb-3">
                <FolderOpen className="w-6 h-6 text-green-400" />
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">
                Fast Workflow
              </h4>
              <p className="text-sm text-gray-400">
                Complete pipeline from script to video in under 5 minutes
              </p>
            </div>
          </div>
          */}

          {/* Recent Projects Section */}
          {displayProjects.length > 0 && onRecentProjectClick && onRemoveRecentProject && (
            <div className="mt-12 p-6 rounded-2xl bg-gray-800/30 border border-gray-700">
              <RecentProjectsList
                projects={displayProjects}
                onProjectClick={onRecentProjectClick}
                onRemoveProject={onRemoveRecentProject}
                onCreateNew={onCreateProject}
                onRefresh={handleRefresh}
                isLoading={isDiscovering}
              />
            </div>
          )}

          {/* Show empty state even when no projects but we have the callbacks */}
          {displayProjects.length === 0 && !isDiscovering && onRecentProjectClick && onRemoveRecentProject && (
            <div className="mt-12 p-6 rounded-2xl bg-gray-800/30 border border-gray-700">
              <RecentProjectsList
                projects={[]}
                onProjectClick={onRecentProjectClick}
                onRemoveProject={onRemoveRecentProject}
                onCreateNew={onCreateProject}
                onRefresh={handleRefresh}
                isLoading={false}
              />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-700 bg-gray-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <p>© 2026 StoryCore Engine. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-white transition-colors">
                Documentation
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Support
              </a>
              <a href="#" className="hover:text-white transition-colors">
                About
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
