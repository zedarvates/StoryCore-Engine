/**
 * Tests for RecentProjectsManager
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { RecentProjectsManager, RecentProject } from './RecentProjectsManager';

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
});
