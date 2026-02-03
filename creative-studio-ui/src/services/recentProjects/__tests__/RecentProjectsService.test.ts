/**
 * Unit tests for RecentProjectsService.validateAndCleanup method
 * 
 * Tests Requirements 3.2, 3.3
 */

import { RecentProjectsService } from '../RecentProjectsService';
import { RecentProject } from '../../../types/menuBarState';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('RecentProjectsService.validateAndCleanup', () => {
  let service: RecentProjectsService;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    
    // Create a new service instance
    service = new RecentProjectsService();
  });

  describe('Basic Functionality', () => {
    it('should remove recent projects that no longer exist', () => {
      // Add some recent projects
      const recentProjects: RecentProject[] = [
        {
          id: '1',
          name: 'Project 1',
          path: '/path/to/project1',
          lastModified: new Date('2024-01-01'),
        },
        {
          id: '2',
          name: 'Project 2',
          path: '/path/to/project2',
          lastModified: new Date('2024-01-02'),
        },
        {
          id: '3',
          name: 'Project 3',
          path: '/path/to/project3',
          lastModified: new Date('2024-01-03'),
        },
      ];

      // Add projects to service
      recentProjects.forEach(p => service.addProject(p));

      // Discovered projects (only project1 and project3 exist)
      const discoveredProjects = [
        { path: '/path/to/project1' },
        { path: '/path/to/project3' },
      ];

      // Validate and cleanup
      const validRecent = service.validateAndCleanup(discoveredProjects);

      // Should only have project1 and project3
      expect(validRecent.length).toBe(2);
      expect(validRecent.find(p => p.id === '1')).toBeDefined();
      expect(validRecent.find(p => p.id === '2')).toBeUndefined();
      expect(validRecent.find(p => p.id === '3')).toBeDefined();
    });

    it('should keep all recent projects when all exist', () => {
      // Add some recent projects
      const recentProjects: RecentProject[] = [
        {
          id: '1',
          name: 'Project 1',
          path: '/path/to/project1',
          lastModified: new Date('2024-01-01'),
        },
        {
          id: '2',
          name: 'Project 2',
          path: '/path/to/project2',
          lastModified: new Date('2024-01-02'),
        },
      ];

      recentProjects.forEach(p => service.addProject(p));

      // All projects exist
      const discoveredProjects = [
        { path: '/path/to/project1' },
        { path: '/path/to/project2' },
      ];

      const validRecent = service.validateAndCleanup(discoveredProjects);

      expect(validRecent.length).toBe(2);
      expect(validRecent.find(p => p.id === '1')).toBeDefined();
      expect(validRecent.find(p => p.id === '2')).toBeDefined();
    });

    it('should remove all recent projects when none exist', () => {
      // Add some recent projects
      const recentProjects: RecentProject[] = [
        {
          id: '1',
          name: 'Project 1',
          path: '/path/to/project1',
          lastModified: new Date('2024-01-01'),
        },
        {
          id: '2',
          name: 'Project 2',
          path: '/path/to/project2',
          lastModified: new Date('2024-01-02'),
        },
      ];

      recentProjects.forEach(p => service.addProject(p));

      // No projects exist
      const discoveredProjects: Array<{ path: string }> = [];

      const validRecent = service.validateAndCleanup(discoveredProjects);

      expect(validRecent.length).toBe(0);
    });

    it('should handle empty recent projects list', () => {
      // No recent projects
      const discoveredProjects = [
        { path: '/path/to/project1' },
        { path: '/path/to/project2' },
      ];

      const validRecent = service.validateAndCleanup(discoveredProjects);

      expect(validRecent.length).toBe(0);
    });
  });

  describe('localStorage Persistence', () => {
    it('should update localStorage when projects are removed', () => {
      // Add recent projects
      const recentProjects: RecentProject[] = [
        {
          id: '1',
          name: 'Project 1',
          path: '/path/to/project1',
          lastModified: new Date('2024-01-01'),
        },
        {
          id: '2',
          name: 'Project 2',
          path: '/path/to/project2',
          lastModified: new Date('2024-01-02'),
        },
      ];

      recentProjects.forEach(p => service.addProject(p));

      // Only project1 exists
      const discoveredProjects = [{ path: '/path/to/project1' }];

      service.validateAndCleanup(discoveredProjects);

      // Check localStorage was updated
      const stored = localStorage.getItem('storycore_recent_projects');
      expect(stored).toBeTruthy();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.length).toBe(1);
      expect(parsed[0].id).toBe('1');
    });

    it('should not update localStorage when no projects are removed', () => {
      // Add recent projects
      const recentProjects: RecentProject[] = [
        {
          id: '1',
          name: 'Project 1',
          path: '/path/to/project1',
          lastModified: new Date('2024-01-01'),
        },
      ];

      recentProjects.forEach(p => service.addProject(p));

      // Get initial localStorage state
      const initialStored = localStorage.getItem('storycore_recent_projects');

      // All projects exist
      const discoveredProjects = [{ path: '/path/to/project1' }];

      service.validateAndCleanup(discoveredProjects);

      // localStorage should be unchanged
      const finalStored = localStorage.getItem('storycore_recent_projects');
      expect(finalStored).toBe(initialStored);
    });
  });

  describe('Listener Notification', () => {
    it('should notify listeners when projects are removed', () => {
      const listener = jest.fn();
      service.subscribe(listener);

      // Add recent projects
      const recentProjects: RecentProject[] = [
        {
          id: '1',
          name: 'Project 1',
          path: '/path/to/project1',
          lastModified: new Date('2024-01-01'),
        },
        {
          id: '2',
          name: 'Project 2',
          path: '/path/to/project2',
          lastModified: new Date('2024-01-02'),
        },
      ];

      recentProjects.forEach(p => service.addProject(p));

      // Clear listener calls from addProject
      listener.mockClear();

      // Only project1 exists
      const discoveredProjects = [{ path: '/path/to/project1' }];

      service.validateAndCleanup(discoveredProjects);

      // Listener should be called once
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: '1' }),
        ])
      );
    });

    it('should not notify listeners when no projects are removed', () => {
      const listener = jest.fn();
      service.subscribe(listener);

      // Add recent projects
      const recentProjects: RecentProject[] = [
        {
          id: '1',
          name: 'Project 1',
          path: '/path/to/project1',
          lastModified: new Date('2024-01-01'),
        },
      ];

      recentProjects.forEach(p => service.addProject(p));

      // Clear listener calls from addProject
      listener.mockClear();

      // All projects exist
      const discoveredProjects = [{ path: '/path/to/project1' }];

      service.validateAndCleanup(discoveredProjects);

      // Listener should not be called
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle projects with same path but different IDs', () => {
      // This shouldn't happen in practice, but we should handle it gracefully
      const recentProjects: RecentProject[] = [
        {
          id: '1',
          name: 'Project 1',
          path: '/path/to/project',
          lastModified: new Date('2024-01-01'),
        },
        {
          id: '2',
          name: 'Project 2',
          path: '/path/to/project',
          lastModified: new Date('2024-01-02'),
        },
      ];

      recentProjects.forEach(p => service.addProject(p));

      const discoveredProjects = [{ path: '/path/to/project' }];

      const validRecent = service.validateAndCleanup(discoveredProjects);

      // Both should be kept since they have the same path
      expect(validRecent.length).toBe(2);
    });

    it('should handle discovered projects with additional properties', () => {
      const recentProjects: RecentProject[] = [
        {
          id: '1',
          name: 'Project 1',
          path: '/path/to/project1',
          lastModified: new Date('2024-01-01'),
        },
      ];

      recentProjects.forEach(p => service.addProject(p));

      // Discovered projects with extra properties (like DiscoveredProject interface)
      const discoveredProjects = [
        {
          path: '/path/to/project1',
          name: 'Project 1',
          lastModified: 1234567890,
          isValid: true,
          metadata: {
            schema_version: '1.0',
            project_name: 'Project 1',
            capabilities: {},
          },
        },
      ];

      const validRecent = service.validateAndCleanup(discoveredProjects);

      expect(validRecent.length).toBe(1);
      expect(validRecent[0].id).toBe('1');
    });

    it('should preserve order of remaining projects', () => {
      // Add projects in specific order (note: addProject adds to beginning)
      // So adding 3, 2, 1 results in order: 1, 2, 3
      const recentProjects: RecentProject[] = [
        {
          id: '3',
          name: 'Project 3',
          path: '/path/to/project3',
          lastModified: new Date('2024-01-03'),
        },
        {
          id: '2',
          name: 'Project 2',
          path: '/path/to/project2',
          lastModified: new Date('2024-01-02'),
        },
        {
          id: '1',
          name: 'Project 1',
          path: '/path/to/project1',
          lastModified: new Date('2024-01-01'),
        },
      ];

      recentProjects.forEach(p => service.addProject(p));

      // Only project3 and project1 exist
      const discoveredProjects = [
        { path: '/path/to/project3' },
        { path: '/path/to/project1' },
      ];

      const validRecent = service.validateAndCleanup(discoveredProjects);

      // Order should be preserved (1, 3) since addProject adds to beginning
      expect(validRecent.length).toBe(2);
      expect(validRecent[0].id).toBe('1');
      expect(validRecent[1].id).toBe('3');
    });
  });

  describe('Return Value', () => {
    it('should return the validated list', () => {
      const recentProjects: RecentProject[] = [
        {
          id: '1',
          name: 'Project 1',
          path: '/path/to/project1',
          lastModified: new Date('2024-01-01'),
        },
        {
          id: '2',
          name: 'Project 2',
          path: '/path/to/project2',
          lastModified: new Date('2024-01-02'),
        },
      ];

      recentProjects.forEach(p => service.addProject(p));

      const discoveredProjects = [{ path: '/path/to/project1' }];

      const validRecent = service.validateAndCleanup(discoveredProjects);

      // Return value should match getRecentProjects()
      expect(validRecent).toEqual(service.getRecentProjects());
    });

    it('should return a copy, not the internal array', () => {
      const recentProjects: RecentProject[] = [
        {
          id: '1',
          name: 'Project 1',
          path: '/path/to/project1',
          lastModified: new Date('2024-01-01'),
        },
      ];

      recentProjects.forEach(p => service.addProject(p));

      const discoveredProjects = [{ path: '/path/to/project1' }];

      const validRecent = service.validateAndCleanup(discoveredProjects);

      // Modifying the returned array should not affect internal state
      validRecent.push({
        id: '999',
        name: 'Fake Project',
        path: '/fake/path',
        lastModified: new Date(),
      });

      expect(service.getRecentProjects().length).toBe(1);
    });
  });
});
