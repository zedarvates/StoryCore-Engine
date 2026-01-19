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
    },
    {
      id: '2',
      name: 'Test Project 2',
      path: '/path/to/project2',
      lastAccessed: new Date('2024-01-14T10:00:00Z'),
      exists: true,
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

    expect(screen.getByText('No Recent Projects')).toBeInTheDocument();
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
});
