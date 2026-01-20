import { useState } from 'react';
import { LandingPage } from './LandingPage';
import type { RecentProject } from '@/components/launcher/RecentProjectsList';
import { CreateProjectDialog } from '@/components/launcher/CreateProjectDialog';
import { OpenProjectDialog } from '@/components/launcher/OpenProjectDialog';
import { generateProjectTemplate, sequencesToShots } from '@/utils/projectTemplateGenerator';
import type { SerializableProjectFormat } from '@/components/launcher/CreateProjectDialog';

// ============================================================================
// Landing Page Demo Component
// ============================================================================

export function LandingPageDemo() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([
    {
      id: '1',
      name: 'My First Story',
      path: 'C:/Users/Documents/StoryCore/my-first-story',
      lastAccessed: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      exists: true,
    },
    {
      id: '2',
      name: 'Epic Adventure',
      path: 'C:/Users/Documents/StoryCore/epic-adventure',
      lastAccessed: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      exists: true,
    },
    {
      id: '3',
      name: 'Deleted Project',
      path: 'C:/Users/Documents/StoryCore/deleted-project',
      lastAccessed: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      exists: false,
    },
    {
      id: '4',
      name: 'Tutorial Project',
      path: 'C:/Users/Documents/StoryCore/tutorial',
      lastAccessed: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
      exists: true,
    },
  ]);

  const handleCreateProject = () => {
    console.log('Create new project clicked');
    setShowCreateDialog(true);
  };

  const handleOpenProject = () => {
    console.log('Open project clicked');
    setShowOpenDialog(true);
  };

  const handleCreateProjectSubmit = async (projectName: string, projectPath: string, format: SerializableProjectFormat) => {
    console.log('Creating project:', { projectName, projectPath, format });
    
    // Generate project template
    const template = generateProjectTemplate(format);
    const initialShots = sequencesToShots(template.sequences);
    
    console.log('Generated template:', {
      sequences: template.sequences.length,
      shots: template.totalShots,
      duration: template.totalDuration,
    });
    
    // Simulate project creation
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // Add to recent projects
    const newProject: RecentProject = {
      id: Date.now().toString(),
      name: projectName,
      path: `${projectPath}/${projectName}`,
      lastAccessed: new Date(),
      exists: true,
    };
    
    setRecentProjects((prev) => [newProject, ...prev].slice(0, 10));
    alert(`Project "${projectName}" created successfully with format: ${format.name}!\n\n${template.sequences.length} sequences and ${template.totalShots} shots created.`);
  };

  const handleOpenProjectSubmit = async (projectPath: string) => {
    console.log('Opening project:', projectPath);
    
    // Simulate project opening
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    alert(`Opening project at: ${projectPath}`);
  };

  const handleRecentProjectClick = (project: RecentProject) => {
    console.log('Recent project clicked:', project);
    if (project.exists === false) {
      alert(`Project "${project.name}" not found at ${project.path}`);
    } else {
      alert(`Opening project: ${project.name}`);
    }
  };

  const handleRemoveRecentProject = (projectPath: string) => {
    console.log('Remove project:', projectPath);
    setRecentProjects((prev) => prev.filter((p) => p.path !== projectPath));
  };

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
