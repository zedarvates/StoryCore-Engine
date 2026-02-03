/**
 * Tests for RecentProjectsManager
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { RecentProjectsManager, RecentProject, MergedProject } from './RecentProjectsManager';
import { DiscoveredProject } from './services/ProjectDiscoveryService';

describe('RecentProjectsManager', () => {
  let tempDir: string;
  let storageFilePath: string;
  let manager: RecentProjectsManager;

  beforeEach(() => {
    // Create temporary directory for tests
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'recent-projects-test-'));
    storageFilePath = path.join(tempDir, 'recent-projects.json');
    manager = new RecentProjectsManager(storageFilePath);
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('initialization', () => {
    it('should create an empty list when no storage file exists', () => {
      expect(manager.getCount()).toBe(0);
      expect(manager.getProjects()).toEqual([]);
    });

    it('should load existing projects from storage', () => {
      // Create storage file
      const data = {
        version: '1.0',
        projects: [
          {
            id: '1',
            name: 'Project 1',
            path: '/path/to/project1',
            lastAccessed: new Date().toISOString(),
          },
        ],
      };
      fs.writeFileSync(storageFilePath, JSON.stringify(data), 'utf-8');

      // Create new manager
      const newManager = new RecentProjectsManager(storageFilePath);
      expect(newManager.getCount()).toBe(1);
      expect(newManager.getProjects()[0].name).toBe('Project 1');
    });

    it('should handle corrupted storage file gracefully', () => {
      // Create corrupted storage file
      fs.writeFileSync(storageFilePath, 'invalid json', 'utf-8');

      // Create new manager
      const newManager = new RecentProjectsManager(storageFilePath);
      expect(newManager.getCount()).toBe(0);
    });

    it('should clear list if version mismatch', () => {
      // Create storage file with wrong version
      const data = {
        version: '0.9',
        projects: [
          {
            id: '1',
            name: 'Project 1',
            path: '/path/to/project1',
            lastAccessed: new Date().toISOString(),
          },
        ],
      };
      fs.writeFileSync(storageFilePath, JSON.stringify(data), 'utf-8');

      // Create new manager
      const newManager = new RecentProjectsManager(storageFilePath);
      expect(newManager.getCount()).toBe(0);
    });
  });

  describe('addProject', () => {
    it('should add a project to the list', () => {
      manager.addProject({
        id: '1',
        name: 'Test Project',
        path: '/path/to/project',
      });

      expect(manager.getCount()).toBe(1);
      const projects = manager.getProjects();
      expect(projects[0].name).toBe('Test Project');
      expect(projects[0].path).toBe('/path/to/project');
    });

    it('should add lastAccessed timestamp', () => {
      const before = new Date();
      manager.addProject({
        id: '1',
        name: 'Test Project',
        path: '/path/to/project',
      });
      const after = new Date();

      const projects = manager.getProjects();
      expect(projects[0].lastAccessed.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(projects[0].lastAccessed.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should add new projects to the front of the list', () => {
      manager.addProject({
        id: '1',
        name: 'Project 1',
        path: '/path/to/project1',
      });
      manager.addProject({
        id: '2',
        name: 'Project 2',
        path: '/path/to/project2',
      });

      const projects = manager.getProjects();
      expect(projects[0].name).toBe('Project 2');
      expect(projects[1].name).toBe('Project 1');
    });

    it('should move existing project to front when re-added', () => {
      manager.addProject({
        id: '1',
        name: 'Project 1',
        path: '/path/to/project1',
      });
      manager.addProject({
        id: '2',
        name: 'Project 2',
        path: '/path/to/project2',
      });
      manager.addProject({
        id: '1',
        name: 'Project 1',
        path: '/path/to/project1',
      });

      const projects = manager.getProjects();
      expect(projects.length).toBe(2);
      expect(projects[0].name).toBe('Project 1');
      expect(projects[1].name).toBe('Project 2');
    });

    it('should enforce 10-project limit with LRU eviction', () => {
      // Add 11 projects
      for (let i = 1; i <= 11; i++) {
        manager.addProject({
          id: `${i}`,
          name: `Project ${i}`,
          path: `/path/to/project${i}`,
        });
      }

      // Should only have 10 projects
      expect(manager.getCount()).toBe(10);

      // First project should be evicted
      const projects = manager.getProjects();
      expect(projects.find(p => p.name === 'Project 1')).toBeUndefined();
      expect(projects[0].name).toBe('Project 11');
    });

    it('should persist projects to storage', () => {
      manager.addProject({
        id: '1',
        name: 'Test Project',
        path: '/path/to/project',
      });

      // Verify storage file exists
      expect(fs.existsSync(storageFilePath)).toBe(true);

      // Load from storage
      const data = JSON.parse(fs.readFileSync(storageFilePath, 'utf-8'));
      expect(data.projects.length).toBe(1);
      expect(data.projects[0].name).toBe('Test Project');
    });
  });

  describe('removeProject', () => {
    beforeEach(() => {
      manager.addProject({
        id: '1',
        name: 'Project 1',
        path: '/path/to/project1',
      });
      manager.addProject({
        id: '2',
        name: 'Project 2',
        path: '/path/to/project2',
      });
    });

    it('should remove a project from the list', () => {
      manager.removeProject('/path/to/project1');

      expect(manager.getCount()).toBe(1);
      expect(manager.getProjects()[0].name).toBe('Project 2');
    });

    it('should do nothing if project does not exist', () => {
      manager.removeProject('/path/to/nonexistent');

      expect(manager.getCount()).toBe(2);
    });

    it('should persist changes to storage', () => {
      manager.removeProject('/path/to/project1');

      const data = JSON.parse(fs.readFileSync(storageFilePath, 'utf-8'));
      expect(data.projects.length).toBe(1);
      expect(data.projects[0].name).toBe('Project 2');
    });
  });

  describe('getProjects', () => {
    it('should return a copy of the projects array', () => {
      manager.addProject({
        id: '1',
        name: 'Test Project',
        path: '/path/to/project',
      });

      const projects1 = manager.getProjects();
      const projects2 = manager.getProjects();

      expect(projects1).toEqual(projects2);
      expect(projects1).not.toBe(projects2); // Different array instances
    });

    it('should return projects in most-recently-accessed order', () => {
      manager.addProject({
        id: '1',
        name: 'Project 1',
        path: '/path/to/project1',
      });
      manager.addProject({
        id: '2',
        name: 'Project 2',
        path: '/path/to/project2',
      });
      manager.addProject({
        id: '3',
        name: 'Project 3',
        path: '/path/to/project3',
      });

      const projects = manager.getProjects();
      expect(projects[0].name).toBe('Project 3');
      expect(projects[1].name).toBe('Project 2');
      expect(projects[2].name).toBe('Project 1');
    });
  });

  describe('getProject', () => {
    beforeEach(() => {
      manager.addProject({
        id: '1',
        name: 'Test Project',
        path: '/path/to/project',
      });
    });

    it('should return project by path', () => {
      const project = manager.getProject('/path/to/project');

      expect(project).toBeDefined();
      expect(project?.name).toBe('Test Project');
    });

    it('should return undefined if project not found', () => {
      const project = manager.getProject('/path/to/nonexistent');

      expect(project).toBeUndefined();
    });
  });

  describe('updateLastAccessed', () => {
    beforeEach(() => {
      manager.addProject({
        id: '1',
        name: 'Project 1',
        path: '/path/to/project1',
      });
      manager.addProject({
        id: '2',
        name: 'Project 2',
        path: '/path/to/project2',
      });
    });

    it('should update last accessed time', async () => {
      const before = manager.getProject('/path/to/project1')?.lastAccessed;
      
      // Wait a bit to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      manager.updateLastAccessed('/path/to/project1');
      
      const after = manager.getProject('/path/to/project1')?.lastAccessed;
      expect(after!.getTime()).toBeGreaterThan(before!.getTime());
    });

    it('should move project to front of list', () => {
      manager.updateLastAccessed('/path/to/project1');

      const projects = manager.getProjects();
      expect(projects[0].name).toBe('Project 1');
      expect(projects[1].name).toBe('Project 2');
    });

    it('should do nothing if project not found', () => {
      const countBefore = manager.getCount();
      manager.updateLastAccessed('/path/to/nonexistent');
      expect(manager.getCount()).toBe(countBefore);
    });

    it('should persist changes to storage', () => {
      manager.updateLastAccessed('/path/to/project1');

      const data = JSON.parse(fs.readFileSync(storageFilePath, 'utf-8'));
      expect(data.projects[0].name).toBe('Project 1');
    });
  });

  describe('checkProjectsExistence', () => {
    let testProjectDir: string;

    beforeEach(() => {
      // Create a real test project directory
      testProjectDir = path.join(tempDir, 'test-project');
      fs.mkdirSync(testProjectDir, { recursive: true });
      fs.writeFileSync(path.join(testProjectDir, 'project.json'), '{}', 'utf-8');

      manager.addProject({
        id: '1',
        name: 'Existing Project',
        path: testProjectDir,
      });
      manager.addProject({
        id: '2',
        name: 'Missing Project',
        path: '/path/to/nonexistent',
      });
    });

    it('should check existence of all projects', async () => {
      const projects = await manager.checkProjectsExistence();

      expect(projects[0].exists).toBe(false); // Missing Project (most recent)
      expect(projects[1].exists).toBe(true);  // Existing Project
    });

    it('should update exists property', async () => {
      await manager.checkProjectsExistence();

      const existingProject = manager.getProject(testProjectDir);
      const missingProject = manager.getProject('/path/to/nonexistent');

      expect(existingProject?.exists).toBe(true);
      expect(missingProject?.exists).toBe(false);
    });
  });

  describe('cleanupMissingProjects', () => {
    let testProjectDir: string;

    beforeEach(() => {
      // Create a real test project directory
      testProjectDir = path.join(tempDir, 'test-project');
      fs.mkdirSync(testProjectDir, { recursive: true });
      fs.writeFileSync(path.join(testProjectDir, 'project.json'), '{}', 'utf-8');

      manager.addProject({
        id: '1',
        name: 'Existing Project',
        path: testProjectDir,
      });
      manager.addProject({
        id: '2',
        name: 'Missing Project',
        path: '/path/to/nonexistent',
      });
    });

    it('should remove projects that no longer exist', async () => {
      await manager.cleanupMissingProjects();

      expect(manager.getCount()).toBe(1);
      expect(manager.getProjects()[0].name).toBe('Existing Project');
    });

    it('should persist changes to storage', async () => {
      await manager.cleanupMissingProjects();

      const data = JSON.parse(fs.readFileSync(storageFilePath, 'utf-8'));
      expect(data.projects.length).toBe(1);
      expect(data.projects[0].name).toBe('Existing Project');
    });
  });

  describe('clear', () => {
    beforeEach(() => {
      manager.addProject({
        id: '1',
        name: 'Project 1',
        path: '/path/to/project1',
      });
      manager.addProject({
        id: '2',
        name: 'Project 2',
        path: '/path/to/project2',
      });
    });

    it('should remove all projects', () => {
      manager.clear();

      expect(manager.getCount()).toBe(0);
      expect(manager.getProjects()).toEqual([]);
    });

    it('should persist changes to storage', () => {
      manager.clear();

      const data = JSON.parse(fs.readFileSync(storageFilePath, 'utf-8'));
      expect(data.projects.length).toBe(0);
    });
  });

  describe('getCount', () => {
    it('should return 0 for empty list', () => {
      expect(manager.getCount()).toBe(0);
    });

    it('should return correct count', () => {
      manager.addProject({
        id: '1',
        name: 'Project 1',
        path: '/path/to/project1',
      });
      manager.addProject({
        id: '2',
        name: 'Project 2',
        path: '/path/to/project2',
      });

      expect(manager.getCount()).toBe(2);
    });
  });

  describe('persistence', () => {
    it('should create storage directory if it does not exist', () => {
      const nestedPath = path.join(tempDir, 'nested', 'dir', 'recent-projects.json');
      const nestedManager = new RecentProjectsManager(nestedPath);

      nestedManager.addProject({
        id: '1',
        name: 'Test Project',
        path: '/path/to/project',
      });

      expect(fs.existsSync(nestedPath)).toBe(true);
    });

    it('should reload projects after restart', () => {
      manager.addProject({
        id: '1',
        name: 'Project 1',
        path: '/path/to/project1',
      });
      manager.addProject({
        id: '2',
        name: 'Project 2',
        path: '/path/to/project2',
      });

      // Create new manager with same storage path
      const newManager = new RecentProjectsManager(storageFilePath);

      expect(newManager.getCount()).toBe(2);
      const projects = newManager.getProjects();
      expect(projects[0].name).toBe('Project 2');
      expect(projects[1].name).toBe('Project 1');
    });

    it('should handle storage write failures gracefully', () => {
      // Skip on Windows as chmod doesn't work the same way
      if (process.platform === 'win32') {
        expect(true).toBe(true);
        return;
      }

      // Make storage file read-only
      manager.addProject({
        id: '1',
        name: 'Test Project',
        path: '/path/to/project',
      });

      // Make directory read-only (this will cause write to fail)
      fs.chmodSync(tempDir, 0o444);

      // This should not throw
      expect(() => {
        manager.addProject({
          id: '2',
          name: 'Another Project',
          path: '/path/to/project2',
        });
      }).not.toThrow();

      // Restore permissions for cleanup
      fs.chmodSync(tempDir, 0o755);
    });
  });

  describe('getMergedProjectList', () => {
    let testProjectDir1: string;
    let testProjectDir2: string;
    let testProjectDir3: string;

    beforeEach(() => {
      // Create test project directories
      testProjectDir1 = path.join(tempDir, 'test-project-1');
      testProjectDir2 = path.join(tempDir, 'test-project-2');
      testProjectDir3 = path.join(tempDir, 'test-project-3');

      fs.mkdirSync(testProjectDir1, { recursive: true });
      fs.mkdirSync(testProjectDir2, { recursive: true });
      fs.mkdirSync(testProjectDir3, { recursive: true });

      // Create project.json files
      fs.writeFileSync(path.join(testProjectDir1, 'project.json'), '{}', 'utf-8');
      fs.writeFileSync(path.join(testProjectDir2, 'project.json'), '{}', 'utf-8');
      fs.writeFileSync(path.join(testProjectDir3, 'project.json'), '{}', 'utf-8');
    });

    it('should merge discovered and recent projects', async () => {
      // Add one project to recent list
      manager.addProject({
        id: '1',
        name: 'Recent Project',
        path: testProjectDir1,
      });

      // Create discovered projects list
      const discoveredProjects: DiscoveredProject[] = [
        {
          name: 'Discovered Project 1',
          path: testProjectDir2,
          lastModified: new Date('2024-01-15'),
          isRecent: false,
        },
        {
          name: 'Discovered Project 2',
          path: testProjectDir3,
          lastModified: new Date('2024-01-10'),
          isRecent: false,
        },
      ];

      const merged = await manager.getMergedProjectList(discoveredProjects);

      expect(merged.length).toBe(3);
      expect(merged.some(p => p.name === 'Recent Project')).toBe(true);
      expect(merged.some(p => p.name === 'Discovered Project 1')).toBe(true);
      expect(merged.some(p => p.name === 'Discovered Project 2')).toBe(true);
    });

    it('should mark recent projects with isRecent flag', async () => {
      manager.addProject({
        id: '1',
        name: 'Recent Project',
        path: testProjectDir1,
      });

      const discoveredProjects: DiscoveredProject[] = [
        {
          name: 'Discovered Project',
          path: testProjectDir2,
          lastModified: new Date('2024-01-15'),
          isRecent: false,
        },
      ];

      const merged = await manager.getMergedProjectList(discoveredProjects);

      const recentProject = merged.find(p => p.name === 'Recent Project');
      const discoveredProject = merged.find(p => p.name === 'Discovered Project');

      expect(recentProject?.isRecent).toBe(true);
      expect(discoveredProject?.isRecent).toBe(false);
    });

    it('should preserve lastOpened for recent projects', async () => {
      const beforeAdd = new Date();
      manager.addProject({
        id: '1',
        name: 'Recent Project',
        path: testProjectDir1,
      });
      const afterAdd = new Date();

      const discoveredProjects: DiscoveredProject[] = [];
      const merged = await manager.getMergedProjectList(discoveredProjects);

      const recentProject = merged.find(p => p.name === 'Recent Project');
      expect(recentProject?.lastOpened).toBeDefined();
      expect(recentProject?.lastOpened!.getTime()).toBeGreaterThanOrEqual(beforeAdd.getTime());
      expect(recentProject?.lastOpened!.getTime()).toBeLessThanOrEqual(afterAdd.getTime());
    });

    it('should not have lastOpened for discovered projects', async () => {
      const discoveredProjects: DiscoveredProject[] = [
        {
          name: 'Discovered Project',
          path: testProjectDir1,
          lastModified: new Date('2024-01-15'),
          isRecent: false,
        },
      ];

      const merged = await manager.getMergedProjectList(discoveredProjects);

      const discoveredProject = merged.find(p => p.name === 'Discovered Project');
      expect(discoveredProject?.lastOpened).toBeUndefined();
    });

    it('should deduplicate projects with recent taking precedence', async () => {
      // Add project to recent list
      manager.addProject({
        id: '1',
        name: 'Recent Project Name',
        path: testProjectDir1,
      });

      // Same project in discovered list with different name
      const discoveredProjects: DiscoveredProject[] = [
        {
          name: 'Discovered Project Name',
          path: testProjectDir1, // Same path
          lastModified: new Date('2024-01-15'),
          isRecent: false,
        },
        {
          name: 'Another Project',
          path: testProjectDir2,
          lastModified: new Date('2024-01-10'),
          isRecent: false,
        },
      ];

      const merged = await manager.getMergedProjectList(discoveredProjects);

      // Should only have 2 projects (duplicate removed)
      expect(merged.length).toBe(2);

      // Should use recent project's name
      const duplicateProject = merged.find(p => p.path === testProjectDir1);
      expect(duplicateProject?.name).toBe('Recent Project Name');
      expect(duplicateProject?.isRecent).toBe(true);
    });

    it('should sort projects by lastModified date descending', async () => {
      // Add recent project
      manager.addProject({
        id: '1',
        name: 'Recent Project',
        path: testProjectDir1,
      });

      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      // Touch the project files to set specific modification times
      const oldDate = new Date('2024-01-01');
      const newDate = new Date('2024-01-20');
      
      fs.utimesSync(path.join(testProjectDir2, 'project.json'), oldDate, oldDate);
      fs.utimesSync(path.join(testProjectDir3, 'project.json'), newDate, newDate);

      // Create discovered projects with different dates
      const discoveredProjects: DiscoveredProject[] = [
        {
          name: 'Old Project',
          path: testProjectDir2,
          lastModified: oldDate,
          isRecent: false,
        },
        {
          name: 'New Project',
          path: testProjectDir3,
          lastModified: newDate,
          isRecent: false,
        },
      ];

      const merged = await manager.getMergedProjectList(discoveredProjects);

      // Should be sorted by lastModified descending
      // Recent project will have current timestamp (most recent)
      expect(merged[0].name).toBe('Recent Project');
      expect(merged[1].name).toBe('New Project');
      expect(merged[2].name).toBe('Old Project');
    });

    it('should preserve all metadata from discovered projects', async () => {
      const createdDate = new Date('2024-01-01');
      const modifiedDate = new Date('2024-01-15');

      const discoveredProjects: DiscoveredProject[] = [
        {
          name: 'Test Project',
          path: testProjectDir1,
          lastModified: modifiedDate,
          createdAt: createdDate,
          isRecent: false,
        },
      ];

      const merged = await manager.getMergedProjectList(discoveredProjects);

      const project = merged.find(p => p.name === 'Test Project');
      expect(project?.name).toBe('Test Project');
      expect(project?.path).toBe(testProjectDir1);
      expect(project?.lastModified).toEqual(modifiedDate);
      expect(project?.createdAt).toEqual(createdDate);
      expect(project?.isRecent).toBe(false);
    });

    it('should handle empty discovered list', async () => {
      manager.addProject({
        id: '1',
        name: 'Recent Project',
        path: testProjectDir1,
      });

      const merged = await manager.getMergedProjectList([]);

      expect(merged.length).toBe(1);
      expect(merged[0].name).toBe('Recent Project');
      expect(merged[0].isRecent).toBe(true);
    });

    it('should handle empty recent list', async () => {
      const discoveredProjects: DiscoveredProject[] = [
        {
          name: 'Discovered Project',
          path: testProjectDir1,
          lastModified: new Date('2024-01-15'),
          isRecent: false,
        },
      ];

      const merged = await manager.getMergedProjectList(discoveredProjects);

      expect(merged.length).toBe(1);
      expect(merged[0].name).toBe('Discovered Project');
      expect(merged[0].isRecent).toBe(false);
    });

    it('should handle both lists empty', async () => {
      const merged = await manager.getMergedProjectList([]);

      expect(merged.length).toBe(0);
    });

    it('should get lastModified from file system for recent projects', async () => {
      manager.addProject({
        id: '1',
        name: 'Recent Project',
        path: testProjectDir1,
      });

      // Wait a bit to ensure file system timestamp is different
      await new Promise(resolve => setTimeout(resolve, 10));

      // Touch the project.json file to update its modification time
      const projectJsonPath = path.join(testProjectDir1, 'project.json');
      const now = new Date();
      fs.utimesSync(projectJsonPath, now, now);

      const merged = await manager.getMergedProjectList([]);

      const project = merged.find(p => p.name === 'Recent Project');
      expect(project?.lastModified).toBeDefined();
      // Should be close to current time (within 1 second)
      expect(Math.abs(project!.lastModified.getTime() - now.getTime())).toBeLessThan(1000);
    });

    it('should use lastAccessed as fallback if project.json missing', async () => {
      const nonExistentPath = path.join(tempDir, 'nonexistent-project');
      
      manager.addProject({
        id: '1',
        name: 'Missing Project',
        path: nonExistentPath,
      });

      const merged = await manager.getMergedProjectList([]);

      const project = merged.find(p => p.name === 'Missing Project');
      expect(project?.lastModified).toBeDefined();
      // Should use lastAccessed as fallback
      expect(project?.lastOpened).toBeDefined();
    });

    it('should preserve exists property from recent projects', async () => {
      manager.addProject({
        id: '1',
        name: 'Recent Project',
        path: testProjectDir1,
      });

      // Manually set exists property
      await manager.checkProjectsExistence();

      const merged = await manager.getMergedProjectList([]);

      const project = merged.find(p => p.name === 'Recent Project');
      expect(project?.exists).toBe(true);
    });
  });
});
