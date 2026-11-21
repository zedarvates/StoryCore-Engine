import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WelcomeScreen } from '../WelcomeScreen';
import type { RecentProject } from '@/utils/projectManager';

describe('WelcomeScreen', () => {
  const mockOnNewProject = vi.fn();
  const mockOnOpenProject = vi.fn();
  const mockOnOpenRecentProject = vi.fn();

  beforeEach(() => {
    mockOnNewProject.mockClear();
    mockOnOpenProject.mockClear();
    mockOnOpenRecentProject.mockClear();
  });

  it('should render welcome screen with title and description', () => {
    render(
      <WelcomeScreen
        onNewProject={mockOnNewProject}
        onOpenProject={mockOnOpenProject}
        recentProjects={[]}
        onOpenRecentProject={mockOnOpenRecentProject}
      />
    );

    expect(screen.getByText('Creative Studio UI')).toBeInTheDocument();
    expect(
      screen.getByText('Professional video storyboard editor with drag-and-drop, timeline editing, and more')
    ).toBeInTheDocument();
  });

  it('should render new project button', () => {
    render(
      <WelcomeScreen
        onNewProject={mockOnNewProject}
        onOpenProject={mockOnOpenProject}
        recentProjects={[]}
        onOpenRecentProject={mockOnOpenRecentProject}
      />
    );

    expect(screen.getByText('New Project')).toBeInTheDocument();
    expect(screen.getByText('Create a new storyboard project from scratch')).toBeInTheDocument();
  });

  it('should render open project button', () => {
    render(
      <WelcomeScreen
        onNewProject={mockOnNewProject}
        onOpenProject={mockOnOpenProject}
        recentProjects={[]}
        onOpenRecentProject={mockOnOpenRecentProject}
      />
    );

    expect(screen.getByText('Open Project')).toBeInTheDocument();
    expect(screen.getByText('Load an existing project from your computer')).toBeInTheDocument();
  });

  it('should call onNewProject when new project button is clicked', () => {
    render(
      <WelcomeScreen
        onNewProject={mockOnNewProject}
        onOpenProject={mockOnOpenProject}
        recentProjects={[]}
        onOpenRecentProject={mockOnOpenRecentProject}
      />
    );

    const newProjectButton = screen.getByText('New Project').closest('button');
    if (newProjectButton) {
      fireEvent.click(newProjectButton);
      expect(mockOnNewProject).toHaveBeenCalledTimes(1);
    }
  });

  it('should call onOpenProject when open project button is clicked', () => {
    render(
      <WelcomeScreen
        onNewProject={mockOnNewProject}
        onOpenProject={mockOnOpenProject}
        recentProjects={[]}
        onOpenRecentProject={mockOnOpenRecentProject}
      />
    );

    const openProjectButton = screen.getByText('Open Project').closest('button');
    if (openProjectButton) {
      fireEvent.click(openProjectButton);
      expect(mockOnOpenProject).toHaveBeenCalledTimes(1);
    }
  });

  it('should not render recent projects section when list is empty', () => {
    render(
      <WelcomeScreen
        onNewProject={mockOnNewProject}
        onOpenProject={mockOnOpenProject}
        recentProjects={[]}
        onOpenRecentProject={mockOnOpenRecentProject}
      />
    );

    expect(screen.queryByText('Recent Projects')).not.toBeInTheDocument();
  });

  it('should render recent projects section when list has items', () => {
    const recentProjects: RecentProject[] = [
      { id: 'project-1', name: 'Project 1', path: '/projects/project-1', lastAccessed: new Date('2024-01-15T10:00:00Z') },
      { id: 'project-2', name: 'Project 2', path: '/projects/project-2', lastAccessed: new Date('2024-01-14T10:00:00Z') },
    ];

    render(
      <WelcomeScreen
        onNewProject={mockOnNewProject}
        onOpenProject={mockOnOpenProject}
        recentProjects={recentProjects}
        onOpenRecentProject={mockOnOpenRecentProject}
      />
    );

    expect(screen.getByText('Recent Projects')).toBeInTheDocument();
    expect(screen.getByText('Project 1')).toBeInTheDocument();
    expect(screen.getByText('Project 2')).toBeInTheDocument();
  });

  it('should display last opened date for recent projects', () => {
    const recentProjects: RecentProject[] = [
      { id: 'test-project', name: 'Test Project', path: '/projects/test-project', lastAccessed: new Date('2024-01-15T10:00:00Z') },
    ];

    render(
      <WelcomeScreen
        onNewProject={mockOnNewProject}
        onOpenProject={mockOnOpenProject}
        recentProjects={recentProjects}
        onOpenRecentProject={mockOnOpenRecentProject}
      />
    );

    // Check that the date is displayed (format may vary by locale)
    expect(screen.getByText(/Last opened:/)).toBeInTheDocument();
  });

  it('should limit recent projects to 5 items', () => {
    const recentProjects: RecentProject[] = [
      { id: 'project-1', name: 'Project 1', path: '/projects/project-1', lastAccessed: new Date('2024-01-15T10:00:00Z') },
      { id: 'project-2', name: 'Project 2', path: '/projects/project-2', lastAccessed: new Date('2024-01-14T10:00:00Z') },
      { id: 'project-3', name: 'Project 3', path: '/projects/project-3', lastAccessed: new Date('2024-01-13T10:00:00Z') },
      { id: 'project-4', name: 'Project 4', path: '/projects/project-4', lastAccessed: new Date('2024-01-12T10:00:00Z') },
      { id: 'project-5', name: 'Project 5', path: '/projects/project-5', lastAccessed: new Date('2024-01-11T10:00:00Z') },
      { id: 'project-6', name: 'Project 6', path: '/projects/project-6', lastAccessed: new Date('2024-01-10T10:00:00Z') },
      { id: 'project-7', name: 'Project 7', path: '/projects/project-7', lastAccessed: new Date('2024-01-09T10:00:00Z') },
    ];

    render(
      <WelcomeScreen
        onNewProject={mockOnNewProject}
        onOpenProject={mockOnOpenProject}
        recentProjects={recentProjects}
        onOpenRecentProject={mockOnOpenRecentProject}
      />
    );

    // Should show first 5 projects
    expect(screen.getByText('Project 1')).toBeInTheDocument();
    expect(screen.getByText('Project 2')).toBeInTheDocument();
    expect(screen.getByText('Project 3')).toBeInTheDocument();
    expect(screen.getByText('Project 4')).toBeInTheDocument();
    expect(screen.getByText('Project 5')).toBeInTheDocument();

    // Should not show 6th and 7th projects
    expect(screen.queryByText('Project 6')).not.toBeInTheDocument();
    expect(screen.queryByText('Project 7')).not.toBeInTheDocument();
  });

  it('should call onOpenRecentProject when recent project is clicked', () => {
    const recentProjects: RecentProject[] = [
      { id: 'test-project', name: 'Test Project', path: '/projects/test-project', lastAccessed: new Date('2024-01-15T10:00:00Z') },
    ];

    render(
      <WelcomeScreen
        onNewProject={mockOnNewProject}
        onOpenProject={mockOnOpenProject}
        recentProjects={recentProjects}
        onOpenRecentProject={mockOnOpenRecentProject}
      />
    );

    const recentProjectButton = screen.getByText('Test Project').closest('button');
    if (recentProjectButton) {
      fireEvent.click(recentProjectButton);
      expect(mockOnOpenRecentProject).toHaveBeenCalledWith(recentProjects[0]);
    }
  });

  it('should render quick tips section', () => {
    render(
      <WelcomeScreen
        onNewProject={mockOnNewProject}
        onOpenProject={mockOnOpenProject}
        recentProjects={[]}
        onOpenRecentProject={mockOnOpenRecentProject}
      />
    );

    expect(screen.getByText('Quick Tips:')).toBeInTheDocument();
    expect(screen.getByText('Projects are saved in Data Contract v1.0 format')).toBeInTheDocument();
    expect(screen.getByText('Compatible with StoryCore-Engine backend')).toBeInTheDocument();
    expect(screen.getByText('Use keyboard shortcuts for faster workflow')).toBeInTheDocument();
  });
});
