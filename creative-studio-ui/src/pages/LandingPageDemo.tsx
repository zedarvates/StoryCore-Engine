import { useState, useEffect } from 'react';
import { LandingPage } from './LandingPage';
import type { RecentProject } from '@/components/launcher/RecentProjectsList';
import { CreateProjectDialog } from '@/components/launcher/CreateProjectDialog';
import { OpenProjectDialog } from '@/components/launcher/OpenProjectDialog';
import { EmptyProjectsState } from '@/components/launcher/EmptyProjectsState';
import { ErrorProjectsState } from '@/components/launcher/ErrorProjectsState';
import { generateProjectTemplate, sequencesToShots } from '@/utils/projectTemplateGenerator';
import type { SerializableProjectFormat } from '@/components/launcher/CreateProjectDialog';
import { useProjectLoader } from '@/hooks/useProjectLoader';
import { MergedProject } from '@/utils/projectMerger';

// ============================================================================
// Landing Page Demo Component
// ============================================================================

export function LandingPageDemo() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  
  // Use the project loader hook
  const { projects, isLoading, error, loadProjects, refreshProjects } = useProjectLoader();

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Convert MergedProject to RecentProject format for display
  const recentProjects: RecentProject[] = projects.map((project: MergedProject) => ({
    id: project.path,
    name: project.name,
    path: project.path,
    lastAccessed: project.lastAccessed ? new Date(project.lastAccessed) : new Date(project.lastModified),
    exists: true,
  }));

  const handleCreateProject = () => {
    setShowCreateDialog(true);
  };

  const handleOpenProject = () => {
    setShowOpenDialog(true);
  };

  const handleCreateProjectSubmit = async (projectName: string, projectPath: string, format: SerializableProjectFormat) => {
    // Generate project template
    const template = generateProjectTemplate(format);
    const initialShots = sequencesToShots(template.sequences);

    // Simulate project creation
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    alert(`Project "${projectName}" created successfully with format: ${format.name}!\n\n${template.sequences.length} sequences and ${template.totalShots} shots created.`);
    
    // Refresh projects list
    await refreshProjects();
  };

  const handleOpenProjectSubmit = async (projectPath: string) => {
    // Simulate project opening
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    alert(`Opening project at: ${projectPath}`);
  };

  const handleRecentProjectClick = (project: RecentProject) => {
    if (project.exists === false) {
      alert(`Project "${project.name}" not found at ${project.path}`);
    } else {
      alert(`Opening project: ${project.name}`);
    }
  };

  const handleRemoveRecentProject = (projectPath: string) => {
    // This will be handled by the RecentProjectsService
    // For now, just refresh the list
    refreshProjects();
  };

  // Loading state
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        flexDirection: 'column',
        gap: '1rem',
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #007bff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <p style={{ color: '#666' }}>Loading projects...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Error state
  if (error && projects.length === 0) {
    return (
      <>
        <ErrorProjectsState 
          error={error} 
          onRetry={refreshProjects}
        />
        
        <CreateProjectDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onCreateProject={handleCreateProjectSubmit}
        />
        
        <OpenProjectDialog
          open={showOpenDialog}
          onOpenChange={setShowOpenDialog}
          onOpenProject={handleOpenProjectSubmit}
        />
      </>
    );
  }

  // Empty state
  if (projects.length === 0) {
    return (
      <>
        <EmptyProjectsState onCreateProject={handleCreateProject} />
        
        <CreateProjectDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onCreateProject={handleCreateProjectSubmit}
        />
        
        <OpenProjectDialog
          open={showOpenDialog}
          onOpenChange={setShowOpenDialog}
          onOpenProject={handleOpenProjectSubmit}
        />
      </>
    );
  }

  return (
    <>
      <LandingPage
        onCreateProject={handleCreateProject}
        onOpenProject={handleOpenProject}
        recentProjects={recentProjects}
        onRecentProjectClick={handleRecentProjectClick}
        onRemoveRecentProject={handleRemoveRecentProject}
        version="1.0.0"
      />
      
      <CreateProjectDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreateProject={handleCreateProjectSubmit}
      />
      
      <OpenProjectDialog
        open={showOpenDialog}
        onOpenChange={setShowOpenDialog}
        onOpenProject={handleOpenProjectSubmit}
      />
    </>
  );
}