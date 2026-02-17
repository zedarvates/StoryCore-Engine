/**
 * Unit Tests for Project Merger Utility
 * 
 * Tests the mergeProjects function with specific examples and edge cases.
 */

import { mergeProjects, MergedProject, DiscoveredProject } from '../projectMerger';
import { RecentProject } from '../../types/menuBarState';

describe('projectMerger', () => {
  describe('mergeProjects', () => {
    it('should merge discovered and recent projects correctly', () => {
      // Arrange
      const discovered: DiscoveredProject[] = [
        {
          name: 'Project A',
          path: '/path/to/project-a',
          lastModified: 1000,
          isValid: true,
          isRecent: false,
          metadata: {
            schema_version: '1.0',
            project_name: 'Project A',
            capabilities: { grid_generation: true, promotion_engine: true, qa_engine: true, autofix_engine: true },
          },
        },
        {
          name: 'Project B',
          path: '/path/to/project-b',
          lastModified: 2000,
          isValid: true,
          isRecent: false,
          metadata: {
            schema_version: '1.0',
            project_name: 'Project B',
            capabilities: { grid_generation: true, promotion_engine: true, qa_engine: true, autofix_engine: true },
          },
        },
        {
          name: 'Project C',
          path: '/path/to/project-c',
          lastModified: 3000,
          isValid: true,
          isRecent: false,
          metadata: {
            schema_version: '1.0',
            project_name: 'Project C',
            capabilities: { grid_generation: true, promotion_engine: true, qa_engine: true, autofix_engine: true },
          },
        },
      ];

      const recent: RecentProject[] = [
        {
          id: 'project-b',
          name: 'Project B',
          path: '/path/to/project-b',
          lastModified: new Date(5000),
        },
      ];

      // Act
      const result = mergeProjects(discovered, recent);

      // Assert
      expect(result).toHaveLength(3);

      // Project B should be first (recent)
      expect(result[0].path).toBe('/path/to/project-b');
      expect(result[0].isRecent).toBe(true);
      expect(result[0].lastAccessed).toBe(5000);

      // Project C should be second (not recent, but most recently modified)
      expect(result[1].path).toBe('/path/to/project-c');
      expect(result[1].isRecent).toBe(false);
      expect(result[1].lastAccessed).toBeUndefined();

      // Project A should be last (not recent, oldest modified)
      expect(result[2].path).toBe('/path/to/project-a');
      expect(result[2].isRecent).toBe(false);
      expect(result[2].lastAccessed).toBeUndefined();
    });

    it('should handle empty discovered projects array', () => {
      // Arrange
      const discovered: DiscoveredProject[] = [];
      const recent: RecentProject[] = [
        {
          id: 'project-a',
          name: 'Project A',
          path: '/path/to/project-a',
          lastModified: new Date(1000),
        },
      ];

      // Act
      const result = mergeProjects(discovered, recent);

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should handle empty recent projects array', () => {
      // Arrange
      const discovered: DiscoveredProject[] = [
        {
          name: 'Project A',
          path: '/path/to/project-a',
          lastModified: 1000,
          isValid: true,
          isRecent: false,
          metadata: {
            schema_version: '1.0',
            project_name: 'Project A',
            capabilities: { grid_generation: true, promotion_engine: true, qa_engine: true, autofix_engine: true },
          },
        },
      ];
      const recent: RecentProject[] = [];

      // Act
      const result = mergeProjects(discovered, recent);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].isRecent).toBe(false);
      expect(result[0].lastAccessed).toBeUndefined();
    });

    it('should handle both arrays being empty', () => {
      // Arrange
      const discovered: DiscoveredProject[] = [];
      const recent: RecentProject[] = [];

      // Act
      const result = mergeProjects(discovered, recent);

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should deduplicate projects appearing in both lists', () => {
      // Arrange
      const discovered: DiscoveredProject[] = [
        {
          name: 'Project A',
          path: '/path/to/project-a',
          lastModified: 1000,
          isValid: true,
          isRecent: false,
          metadata: {
            schema_version: '1.0',
            project_name: 'Project A',
            capabilities: { grid_generation: true, promotion_engine: true, qa_engine: true, autofix_engine: true },
          },
        },
      ];

      const recent: RecentProject[] = [
        {
          id: 'project-a',
          name: 'Project A',
          path: '/path/to/project-a',
          lastModified: new Date(2000),
        },
      ];

      // Act
      const result = mergeProjects(discovered, recent);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('/path/to/project-a');
      expect(result[0].isRecent).toBe(true);
      expect(result[0].lastAccessed).toBe(2000);
    });

    it('should sort multiple recent projects by lastAccessed descending', () => {
      // Arrange
      const discovered: DiscoveredProject[] = [
        {
          name: 'Project A',
          path: '/path/to/project-a',
          lastModified: 1000,
          isValid: true,
          isRecent: false,
          metadata: {
            schema_version: '1.0',
            project_name: 'Project A',
            capabilities: { grid_generation: true, promotion_engine: true, qa_engine: true, autofix_engine: true },
          },
        },
        {
          name: 'Project B',
          path: '/path/to/project-b',
          lastModified: 2000,
          isValid: true,
          isRecent: false,
          metadata: {
            schema_version: '1.0',
            project_name: 'Project B',
            capabilities: { grid_generation: true, promotion_engine: true, qa_engine: true, autofix_engine: true },
          },
        },
        {
          name: 'Project C',
          path: '/path/to/project-c',
          lastModified: 3000,
          isValid: true,
          isRecent: false,
          metadata: {
            schema_version: '1.0',
            project_name: 'Project C',
            capabilities: { grid_generation: true, promotion_engine: true, qa_engine: true, autofix_engine: true },
          },
        },
      ];

      const recent: RecentProject[] = [
        {
          id: 'project-a',
          name: 'Project A',
          path: '/path/to/project-a',
          lastModified: new Date(5000), // Most recent access
        },
        {
          id: 'project-c',
          name: 'Project C',
          path: '/path/to/project-c',
          lastModified: new Date(4000), // Second most recent access
        },
      ];

      // Act
      const result = mergeProjects(discovered, recent);

      // Assert
      expect(result).toHaveLength(3);

      // Recent projects should come first, sorted by lastAccessed
      expect(result[0].path).toBe('/path/to/project-a');
      expect(result[0].isRecent).toBe(true);
      expect(result[0].lastAccessed).toBe(5000);

      expect(result[1].path).toBe('/path/to/project-c');
      expect(result[1].isRecent).toBe(true);
      expect(result[1].lastAccessed).toBe(4000);

      // Non-recent project should come last
      expect(result[2].path).toBe('/path/to/project-b');
      expect(result[2].isRecent).toBe(false);
    });

    it('should sort non-recent projects by lastModified descending', () => {
      // Arrange
      const discovered: DiscoveredProject[] = [
        {
          name: 'Project A',
          path: '/path/to/project-a',
          lastModified: 1000, // Oldest
          isValid: true,
          isRecent: false,
          metadata: {
            schema_version: '1.0',
            project_name: 'Project A',
            capabilities: { grid_generation: true, promotion_engine: true, qa_engine: true, autofix_engine: true },
          },
        },
        {
          name: 'Project B',
          path: '/path/to/project-b',
          lastModified: 3000, // Newest
          isValid: true,
          isRecent: false,
          metadata: {
            schema_version: '1.0',
            project_name: 'Project B',
            capabilities: { grid_generation: true, promotion_engine: true, qa_engine: true, autofix_engine: true },
          },
        },
        {
          name: 'Project C',
          path: '/path/to/project-c',
          lastModified: 2000, // Middle
          isValid: true,
          isRecent: false,
          metadata: {
            schema_version: '1.0',
            project_name: 'Project C',
            capabilities: { grid_generation: true, promotion_engine: true, qa_engine: true, autofix_engine: true },
          },
        },
      ];

      const recent: RecentProject[] = [];

      // Act
      const result = mergeProjects(discovered, recent);

      // Assert
      expect(result).toHaveLength(3);

      // Should be sorted by lastModified descending
      expect(result[0].path).toBe('/path/to/project-b');
      expect(result[0].lastModified).toBe(3000);

      expect(result[1].path).toBe('/path/to/project-c');
      expect(result[1].lastModified).toBe(2000);

      expect(result[2].path).toBe('/path/to/project-a');
      expect(result[2].lastModified).toBe(1000);
    });

    it('should handle recent projects with timestamp as number', () => {
      // Arrange
      const discovered: DiscoveredProject[] = [
        {
          name: 'Project A',
          path: '/path/to/project-a',
          lastModified: 1000,
          isValid: true,
          isRecent: false,
          metadata: {
            schema_version: '1.0',
            project_name: 'Project A',
            capabilities: { grid_generation: true, promotion_engine: true, qa_engine: true, autofix_engine: true },
          },
        },
      ];

      const recent: RecentProject[] = [
        {
          id: 'project-a',
          name: 'Project A',
          path: '/path/to/project-a',
          lastModified: 2000 as any, // Simulate timestamp as number
        },
      ];

      // Act
      const result = mergeProjects(discovered, recent);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].isRecent).toBe(true);
      expect(result[0].lastAccessed).toBe(2000);
    });

    it('should preserve all discovered project properties', () => {
      // Arrange
      const discovered: DiscoveredProject[] = [
        {
          name: 'Project A',
          path: '/path/to/project-a',
          lastModified: 1000,
          isValid: true,
          isRecent: false,
          metadata: {
            schema_version: '1.0',
            project_name: 'Project A',
            capabilities: {
              grid_generation: true,
              promotion_engine: false,
              qa_engine: true,
              autofix_engine: false
            },
          },
          createdAt: new Date('2024-01-01'),
        },
      ];

      const recent: RecentProject[] = [];

      // Act
      const result = mergeProjects(discovered, recent);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Project A');
      expect(result[0].path).toBe('/path/to/project-a');
      expect(result[0].lastModified).toBe(1000);
      expect(result[0].isValid).toBe(true);
      expect(result[0].metadata).toEqual({
        schema_version: '1.0',
        project_name: 'Project A',
        capabilities: {
          grid_generation: true,
          promotion_engine: false,
          qa_engine: true,
          autofix_engine: false
        },
      });
      expect(result[0].createdAt).toEqual(new Date('2024-01-01'));
    });
  });
});
