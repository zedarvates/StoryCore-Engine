import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecentProjectsList, type RecentProject } from '../RecentProjectsList';

describe('RecentProjectsList', () => {
  const mockProjects: RecentProject[] = [
    {
      id: '1',
      name: 'Test Project 1',
      path: '/path/to/project1',
      lastAccessed: new Date('2024-01-15T10:00:00Z'),
      exists: true,
      isRecent: true, // Recently opened project
    },
    {
      id: '2',
      name: 'Test Project 2',
      path: '/path/to/project2',
      lastAccessed: new Date('2024-01-14T10:00:00Z'),
      exists: true,
      isRecent: false, // Discovered project
    },
  ];

  it('should render empty state when no projects', () => {
    const onProjectClick = vi.fn();
    const onRemoveProject = vi.fn();

    render(
      <RecentProjectsList
        projects={[]}
        onProjectClick={onProjectClick}
        onRemoveProject={onRemoveProject}
      />
    );

    expect(screen.getByText('No Projects Found')).toBeInTheDocument();
  });

  it('should render empty state with Create New Project button when callback provided', () => {
    const onProjectClick = vi.fn();
    const onRemoveProject = vi.fn();
    const onCreateNew = vi.fn();

    render(
      <RecentProjectsList
        projects={[]}
        onProjectClick={onProjectClick}
        onRemoveProject={onRemoveProject}
        onCreateNew={onCreateNew}
      />
    );

    const createButton = screen.getByText('Create New Project');
    expect(createButton).toBeInTheDocument();
    
    fireEvent.click(createButton);
    expect(onCreateNew).toHaveBeenCalledTimes(1);
  });

  it('should render empty state with Refresh button when callback provided', () => {
    const onProjectClick = vi.fn();
    const onRemoveProject = vi.fn();
    const onRefresh = vi.fn();

    render(
      <RecentProjectsList
        projects={[]}
        onProjectClick={onProjectClick}
        onRemoveProject={onRemoveProject}
        onRefresh={onRefresh}
      />
    );

    const refreshButton = screen.getByText('Refresh');
    expect(refreshButton).toBeInTheDocument();
    
    fireEvent.click(refreshButton);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('should render list of projects', () => {
    const onProjectClick = vi.fn();
    const onRemoveProject = vi.fn();

    render(
      <RecentProjectsList
        projects={mockProjects}
        onProjectClick={onProjectClick}
        onRemoveProject={onRemoveProject}
      />
    );

    expect(screen.getByText('Test Project 1')).toBeInTheDocument();
    expect(screen.getByText('Test Project 2')).toBeInTheDocument();
  });

  it('should display "Recently Opened" badge for recent projects', () => {
    const onProjectClick = vi.fn();
    const onRemoveProject = vi.fn();

    render(
      <RecentProjectsList
        projects={mockProjects}
        onProjectClick={onProjectClick}
        onRemoveProject={onRemoveProject}
      />
    );

    // Should have exactly one "Recently Opened" badge
    const badges = screen.getAllByText('Recently Opened');
    expect(badges).toHaveLength(1);
  });

  it('should not display "Recently Opened" badge for discovered projects', () => {
    const onProjectClick = vi.fn();
    const onRemoveProject = vi.fn();

    const discoveredProject: RecentProject = {
      id: '3',
      name: 'Discovered Project',
      path: '/path/to/discovered',
      lastAccessed: new Date('2024-01-13T10:00:00Z'),
      exists: true,
      isRecent: false,
    };

    render(
      <RecentProjectsList
        projects={[discoveredProject]}
        onProjectClick={onProjectClick}
        onRemoveProject={onRemoveProject}
      />
    );

    // Should not have any "Recently Opened" badges
    expect(screen.queryByText('Recently Opened')).not.toBeInTheDocument();
  });

  it('should display tooltip with project path on hover', () => {
    const onProjectClick = vi.fn();
    const onRemoveProject = vi.fn();

    const { container } = render(
      <RecentProjectsList
        projects={mockProjects}
        onProjectClick={onProjectClick}
        onRemoveProject={onRemoveProject}
      />
    );

    // Find the project card div with title attribute
    const projectCards = container.querySelectorAll('[title="/path/to/project1"]');
    expect(projectCards.length).toBeGreaterThan(0);
  });

  it('should render manual refresh button when onRefresh provided', () => {
    const onProjectClick = vi.fn();
    const onRemoveProject = vi.fn();
    const onRefresh = vi.fn();

    render(
      <RecentProjectsList
        projects={mockProjects}
        onProjectClick={onProjectClick}
        onRemoveProject={onRemoveProject}
        onRefresh={onRefresh}
      />
    );

    // Find refresh button in header
    const refreshButtons = screen.getAllByText('Refresh');
    expect(refreshButtons.length).toBeGreaterThan(0);
    
    fireEvent.click(refreshButtons[0]);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('should display loading spinner during scan', () => {
    const onProjectClick = vi.fn();
    const onRemoveProject = vi.fn();

    render(
      <RecentProjectsList
        projects={[]}
        onProjectClick={onProjectClick}
        onRemoveProject={onRemoveProject}
        isLoading={true}
      />
    );

    expect(screen.getByText('Discovering Projects')).toBeInTheDocument();
    expect(screen.getByText('Scanning your StoryCore Projects folder...')).toBeInTheDocument();
  });

  it('should call onProjectClick when project is clicked', () => {
    const onProjectClick = vi.fn();
    const onRemoveProject = vi.fn();

    render(
      <RecentProjectsList
        projects={mockProjects}
        onProjectClick={onProjectClick}
        onRemoveProject={onRemoveProject}
      />
    );

    const projectCard = screen.getByText('Test Project 1').closest('div');
    if (projectCard) {
      fireEvent.click(projectCard);
    }

    expect(onProjectClick).toHaveBeenCalledWith(mockProjects[0]);
  });

  it('should call onRemoveProject when X button is clicked', () => {
    const onProjectClick = vi.fn();
    const onRemoveProject = vi.fn();

    const { container } = render(
      <RecentProjectsList
        projects={mockProjects}
        onProjectClick={onProjectClick}
        onRemoveProject={onRemoveProject}
      />
    );

    // Find the first remove button (X button)
    const removeButtons = container.querySelectorAll('button[aria-label*="Remove"]');
    expect(removeButtons.length).toBeGreaterThan(0);

    // Click the first remove button
    fireEvent.click(removeButtons[0]);

    // Verify onRemoveProject was called with the correct path
    expect(onRemoveProject).toHaveBeenCalledWith(mockProjects[0].path);
    // Verify onProjectClick was NOT called
    expect(onProjectClick).not.toHaveBeenCalled();
  });

  it('should not call onProjectClick when remove button is clicked', () => {
    const onProjectClick = vi.fn();
    const onRemoveProject = vi.fn();

    const { container } = render(
      <RecentProjectsList
        projects={mockProjects}
        onProjectClick={onProjectClick}
        onRemoveProject={onRemoveProject}
      />
    );

    // Find and click the remove button
    const removeButtons = container.querySelectorAll('button[aria-label*="Remove"]');
    fireEvent.click(removeButtons[0]);

    // Verify only onRemoveProject was called, not onProjectClick
    expect(onRemoveProject).toHaveBeenCalledTimes(1);
    expect(onProjectClick).not.toHaveBeenCalled();
  });

  it('should not allow clicking on missing projects', () => {
    const onProjectClick = vi.fn();
    const onRemoveProject = vi.fn();

    const missingProject: RecentProject = {
      id: '3',
      name: 'Missing Project',
      path: '/path/to/missing',
      lastAccessed: new Date('2024-01-13T10:00:00Z'),
      exists: false,
      isRecent: true,
    };

    render(
      <RecentProjectsList
        projects={[missingProject]}
        onProjectClick={onProjectClick}
        onRemoveProject={onRemoveProject}
      />
    );

    const projectCard = screen.getByText('Missing Project').closest('div');
    if (projectCard) {
      fireEvent.click(projectCard);
    }

    // Should not call onProjectClick for missing projects
    expect(onProjectClick).not.toHaveBeenCalled();
  });

  it('should still allow removing missing projects', () => {
    const onProjectClick = vi.fn();
    const onRemoveProject = vi.fn();

    const missingProject: RecentProject = {
      id: '3',
      name: 'Missing Project',
      path: '/path/to/missing',
      lastAccessed: new Date('2024-01-13T10:00:00Z'),
      exists: false,
      isRecent: true,
    };

    const { container } = render(
      <RecentProjectsList
        projects={[missingProject]}
        onProjectClick={onProjectClick}
        onRemoveProject={onRemoveProject}
      />
    );

    // Find and click the remove button
    const removeButtons = container.querySelectorAll('button[aria-label*="Remove"]');
    fireEvent.click(removeButtons[0]);

    // Should allow removing missing projects
    expect(onRemoveProject).toHaveBeenCalledWith(missingProject.path);
  });

  it('should not show "Recently Opened" badge for missing recent projects', () => {
    const onProjectClick = vi.fn();
    const onRemoveProject = vi.fn();

    const missingRecentProject: RecentProject = {
      id: '4',
      name: 'Missing Recent Project',
      path: '/path/to/missing-recent',
      lastAccessed: new Date('2024-01-13T10:00:00Z'),
      exists: false,
      isRecent: true,
    };

    render(
      <RecentProjectsList
        projects={[missingRecentProject]}
        onProjectClick={onProjectClick}
        onRemoveProject={onRemoveProject}
      />
    );

    // Badge should not be shown for missing projects even if they are recent
    expect(screen.queryByText('Recently Opened')).not.toBeInTheDocument();
  });

  it('should apply different styling for recent vs discovered projects', () => {
    const onProjectClick = vi.fn();
    const onRemoveProject = vi.fn();

    render(
      <RecentProjectsList
        projects={mockProjects}
        onProjectClick={onProjectClick}
        onRemoveProject={onRemoveProject}
      />
    );

    // Get the project card containers by finding the parent divs with specific classes
    const recentProjectName = screen.getByText('Test Project 1');
    const recentCard = recentProjectName.closest('div[title="/path/to/project1"]');
    
    const discoveredProjectName = screen.getByText('Test Project 2');
    const discoveredCard = discoveredProjectName.closest('div[title="/path/to/project2"]');
    
    // First project (recent) should have blue border styling
    expect(recentCard?.className).toContain('border-blue-600');
    
    // Second project (discovered) should have gray border styling  
    expect(discoveredCard?.className).toContain('border-gray-700');
  });
});
