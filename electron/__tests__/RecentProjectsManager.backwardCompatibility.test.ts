/**
 * Backward Compatibility Tests for RecentProjectsManager
 * 
 * These tests verify that the enhanced RecentProjectsManager maintains
 * backward compatibility with existing recent-projects.json files and
 * behavior, ensuring users don't lose access to their work history.
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { RecentProjectsManager, RecentProject } from '../RecentProjectsManager';
import { DiscoveredProject } from '../services/ProjectDiscoveryService';

describe('RecentProjectsManager - Backward Compatibility', () => {
  let tempDir: string;
  let storageFilePath: string;
  let manager: RecentProjectsManager;

  beforeEach(() => {
    // Create temporary directory for tests
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'backward-compat-test-'));
    storageFilePath = path.join(tempDir, 'recent-projects.json');
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Requirement 8.1: Reading existing recent-projects.json', () => {
    it('should read existing recent-projects.json with correct structure', () => {
      // Create a typical existing recent-projects.json file
      const existingData = {
        version: '1.0',
        projects: [
          {
            id: 'project-1',
            name: 'My First Project',
            path: '/Users/john/Documents/StoryCore Projects/my-first-project',
            lastAccessed: '2024-01-15T10:30:00.000Z',
          },
          {
            id: 'project-2',
            name: 'Demo Project',
            path: '/Users/john/Documents/StoryCore Projects/demo-project',
            lastAccessed: '2024-01-14T15:45:00.000Z',
          },
          {
            id: 'project-3',
            name: 'Test Animation',
            path: '/Users/john/Documents/StoryCore Projects/test-animation',
            lastAccessed: '2024-01-10T09:00:00.000Z',
          },
        ],
      };

      fs.writeFileSync(storageFilePath, JSON.stringify(existingData, null, 2), 'utf-8');

      // Create manager - should load existing data
      manager = new RecentProjectsManager(storageFilePath);

      // Verify all projects were loaded
      expect(manager.getCount()).toBe(3);

      const projects = manager.getProjects();
      
      // Verify first project
      expect(projects[0].id).toBe('project-1');
      expect(projects[0].name).toBe('My First Project');
      expect(projects[0].path).toBe('/Users/john/Documents/StoryCore Projects/my-first-project');
      expect(projects[0].lastAccessed).toEqual(new Date('2024-01-15T10:30:00.000Z'));

      // Verify second project
      expect(projects[1].id).toBe('project-2');
      expect(projects[1].name).toBe('Demo Project');

      // Verify third project
      expect(projects[2].id).toBe('project-3');
      expect(projects[2].name).toBe('Test Animation');
    });

    it('should handle existing file with maximum 10 projects', () => {
      // Create file with exactly 10 projects (the limit)
      const projects = [];
      for (let i = 1; i <= 10; i++) {
        projects.push({
          id: `project-${i}`,
          name: `Project ${i}`,
          path: `/path/to/project${i}`,
          lastAccessed: new Date(2024, 0, i).toISOString(),
        });
      }

      const existingData = {
        version: '1.0',
        projects,
      };

      fs.writeFileSync(storageFilePath, JSON.stringify(existingData, null, 2), 'utf-8');

      manager = new RecentProjectsManager(storageFilePath);

      expect(manager.getCount()).toBe(10);
    });

    it('should handle existing file with more than 10 projects (enforce limit)', () => {
      // Create file with 12 projects (over the limit)
      const projects = [];
      for (let i = 1; i <= 12; i++) {
        projects.push({
          id: `project-${i}`,
          name: `Project ${i}`,
          path: `/path/to/project${i}`,
          lastAccessed: new Date(2024, 0, i).toISOString(),
        });
      }

      const existingData = {
        version: '1.0',
        projects,
      };

      fs.writeFileSync(storageFilePath, JSON.stringify(existingData, null, 2), 'utf-8');

      manager = new RecentProjectsManager(storageFilePath);

      // Should enforce 10-project limit
      expect(manager.getCount()).toBe(10);
      
      // Should keep the first 10 projects
      const loadedProjects = manager.getProjects();
      expect(loadedProjects[0].id).toBe('project-1');
      expect(loadedProjects[9].id).toBe('project-10');
    });

    it('should preserve date formats from existing file', () => {
      const existingData = {
        version: '1.0',
        projects: [
          {
            id: 'project-1',
            name: 'Test Project',
            path: '/path/to/project',
            lastAccessed: '2024-01-15T10:30:45.123Z', // ISO 8601 with milliseconds
          },
        ],
      };

      fs.writeFileSync(storageFilePath, JSON.stringify(existingData, null, 2), 'utf-8');

      manager = new RecentProjectsManager(storageFilePath);

      const project = manager.getProjects()[0];
      expect(project.lastAccessed).toEqual(new Date('2024-01-15T10:30:45.123Z'));
    });
  });

  describe('Requirement 8.2: Updating recent-projects.json when opening projects', () => {
    it('should update recent-projects.json when a project is opened', () => {
      // Start with existing data
      const existingData = {
        version: '1.0',
        projects: [
          {
            id: 'project-1',
            name: 'Existing Project',
            path: '/path/to/existing',
            lastAccessed: '2024-01-10T10:00:00.000Z',
          },
        ],
      };

      fs.writeFileSync(storageFilePath, JSON.stringify(existingData, null, 2), 'utf-8');

      manager = new RecentProjectsManager(storageFilePath);

      // Open a new project (simulate user opening a project)
      manager.addProject({
        id: 'project-2',
        name: 'Newly Opened Project',
        path: '/path/to/new',
      });

      // Verify file was updated
      expect(fs.existsSync(storageFilePath)).toBe(true);

      const updatedData = JSON.parse(fs.readFileSync(storageFilePath, 'utf-8'));
      
      expect(updatedData.version).toBe('1.0');
      expect(updatedData.projects.length).toBe(2);
      
      // New project should be first (most recent)
      expect(updatedData.projects[0].id).toBe('project-2');
      expect(updatedData.projects[0].name).toBe('Newly Opened Project');
      
      // Existing project should be second
      expect(updatedData.projects[1].id).toBe('project-1');
    });

    it('should update lastAccessed when reopening an existing project', () => {
      const existingData = {
        version: '1.0',
        projects: [
          {
            id: 'project-1',
            name: 'Project 1',
            path: '/path/to/project1',
            lastAccessed: '2024-01-10T10:00:00.000Z',
          },
          {
            id: 'project-2',
            name: 'Project 2',
            path: '/path/to/project2',
            lastAccessed: '2024-01-09T10:00:00.000Z',
          },
        ],
      };

      fs.writeFileSync(storageFilePath, JSON.stringify(existingData, null, 2), 'utf-8');

      manager = new RecentProjectsManager(storageFilePath);

      // Reopen project-2 (it should move to front)
      manager.addProject({
        id: 'project-2',
        name: 'Project 2',
        path: '/path/to/project2',
      });

      const updatedData = JSON.parse(fs.readFileSync(storageFilePath, 'utf-8'));
      
      // Project 2 should now be first
      expect(updatedData.projects[0].id).toBe('project-2');
      expect(updatedData.projects[1].id).toBe('project-1');
      
      // lastAccessed should be updated (more recent than original)
      const newLastAccessed = new Date(updatedData.projects[0].lastAccessed);
      const originalLastAccessed = new Date('2024-01-09T10:00:00.000Z');
      expect(newLastAccessed.getTime()).toBeGreaterThan(originalLastAccessed.getTime());
    });

    it('should maintain file format consistency after updates', () => {
      manager = new RecentProjectsManager(storageFilePath);

      manager.addProject({
        id: 'project-1',
        name: 'Test Project',
        path: '/path/to/project',
      });

      const savedData = JSON.parse(fs.readFileSync(storageFilePath, 'utf-8'));
      
      // Verify structure matches expected format
      expect(savedData).toHaveProperty('version');
      expect(savedData).toHaveProperty('projects');
      expect(Array.isArray(savedData.projects)).toBe(true);
      
      // Verify project structure
      const project = savedData.projects[0];
      expect(project).toHaveProperty('id');
      expect(project).toHaveProperty('name');
      expect(project).toHaveProperty('path');
      expect(project).toHaveProperty('lastAccessed');
      
      // Verify no extra fields were added
      const expectedKeys = ['id', 'name', 'path', 'lastAccessed'];
      const actualKeys = Object.keys(project).sort();
      expect(actualKeys).toEqual(expectedKeys.sort());
    });
  });

  describe('Requirement 8.4: JSON file structure preservation', () => {
    it('should maintain exact JSON structure format', () => {
      manager = new RecentProjectsManager(storageFilePath);

      manager.addProject({
        id: 'test-project',
        name: 'Test Project',
        path: '/path/to/test',
      });

      const fileContent = fs.readFileSync(storageFilePath, 'utf-8');
      const data = JSON.parse(fileContent);

      // Verify top-level structure
      expect(Object.keys(data).sort()).toEqual(['projects', 'version']);
      
      // Verify version field
      expect(data.version).toBe('1.0');
      expect(typeof data.version).toBe('string');
      
      // Verify projects array
      expect(Array.isArray(data.projects)).toBe(true);
      
      // Verify project entry structure
      const project = data.projects[0];
      expect(typeof project.id).toBe('string');
      expect(typeof project.name).toBe('string');
      expect(typeof project.path).toBe('string');
      expect(typeof project.lastAccessed).toBe('string');
      
      // Verify lastAccessed is ISO 8601 format
      expect(project.lastAccessed).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should not add new fields to the JSON structure', () => {
      const existingData = {
        version: '1.0',
        projects: [
          {
            id: 'project-1',
            name: 'Existing Project',
            path: '/path/to/existing',
            lastAccessed: '2024-01-10T10:00:00.000Z',
          },
        ],
      };

      fs.writeFileSync(storageFilePath, JSON.stringify(existingData, null, 2), 'utf-8');

      manager = new RecentProjectsManager(storageFilePath);

      // Add a new project
      manager.addProject({
        id: 'project-2',
        name: 'New Project',
        path: '/path/to/new',
      });

      const updatedData = JSON.parse(fs.readFileSync(storageFilePath, 'utf-8'));
      
      // Verify no new top-level fields
      expect(Object.keys(updatedData).sort()).toEqual(['projects', 'version']);
      
      // Verify no new project fields
      updatedData.projects.forEach((project: any) => {
        const keys = Object.keys(project).sort();
        expect(keys).toEqual(['id', 'lastAccessed', 'name', 'path']);
      });
    });

    it('should preserve formatting (pretty-printed JSON)', () => {
      manager = new RecentProjectsManager(storageFilePath);

      manager.addProject({
        id: 'test-project',
        name: 'Test Project',
        path: '/path/to/test',
      });

      const fileContent = fs.readFileSync(storageFilePath, 'utf-8');
      
      // Verify it's pretty-printed (contains newlines and indentation)
      expect(fileContent).toContain('\n');
      expect(fileContent).toContain('  '); // 2-space indentation
      
      // Verify it can be parsed
      expect(() => JSON.parse(fileContent)).not.toThrow();
    });
  });

  describe('Requirement 8.5: Adding discovered projects to recent list', () => {
    let testProjectDir: string;

    beforeEach(() => {
      // Create a real test project directory
      testProjectDir = path.join(tempDir, 'discovered-project');
      fs.mkdirSync(testProjectDir, { recursive: true });
      
      // Create a valid project.json
      const projectConfig = {
        schema_version: '1.0',
        project_name: 'Discovered Project',
        created_at: '2024-01-01T00:00:00.000Z',
        capabilities: {
          grid_generation: true,
          promotion_engine: true,
          qa_engine: true,
          autofix_engine: true,
        },
        generation_status: {
          grid: 'pending',
          promotion: 'pending',
        },
      };
      
      fs.writeFileSync(
        path.join(testProjectDir, 'project.json'),
        JSON.stringify(projectConfig, null, 2),
        'utf-8'
      );
    });

    it('should add discovered project to recent list when opened', () => {
      manager = new RecentProjectsManager(storageFilePath);

      // Initially, recent list is empty
      expect(manager.getCount()).toBe(0);

      // User opens a discovered project
      manager.addProject({
        id: 'discovered-1',
        name: 'Discovered Project',
        path: testProjectDir,
      });

      // Verify it was added to recent list
      expect(manager.getCount()).toBe(1);
      
      const projects = manager.getProjects();
      expect(projects[0].name).toBe('Discovered Project');
      expect(projects[0].path).toBe(testProjectDir);
      
      // Verify it was persisted
      const savedData = JSON.parse(fs.readFileSync(storageFilePath, 'utf-8'));
      expect(savedData.projects.length).toBe(1);
      expect(savedData.projects[0].name).toBe('Discovered Project');
    });

    it('should merge discovered project with existing recent projects', () => {
      // Start with existing recent projects
      const existingData = {
        version: '1.0',
        projects: [
          {
            id: 'recent-1',
            name: 'Recent Project',
            path: '/path/to/recent',
            lastAccessed: '2024-01-10T10:00:00.000Z',
          },
        ],
      };

      fs.writeFileSync(storageFilePath, JSON.stringify(existingData, null, 2), 'utf-8');

      manager = new RecentProjectsManager(storageFilePath);

      // User opens a discovered project
      manager.addProject({
        id: 'discovered-1',
        name: 'Discovered Project',
        path: testProjectDir,
      });

      // Verify both projects are in the list
      expect(manager.getCount()).toBe(2);
      
      const projects = manager.getProjects();
      expect(projects[0].name).toBe('Discovered Project'); // Most recent
      expect(projects[1].name).toBe('Recent Project');
    });

    it('should mark opened discovered project as recent in merged list', async () => {
      manager = new RecentProjectsManager(storageFilePath);

      // Create a discovered project
      const discoveredProjects: DiscoveredProject[] = [
        {
          name: 'Discovered Project',
          path: testProjectDir,
          lastModified: new Date('2024-01-15'),
          isRecent: false,
        },
      ];

      // Get merged list - project should not be marked as recent
      let merged = await manager.getMergedProjectList(discoveredProjects);
      expect(merged[0].isRecent).toBe(false);

      // User opens the discovered project
      manager.addProject({
        id: 'discovered-1',
        name: 'Discovered Project',
        path: testProjectDir,
      });

      // Get merged list again - project should now be marked as recent
      merged = await manager.getMergedProjectList(discoveredProjects);
      
      // Should still have 1 project (no duplicate)
      expect(merged.length).toBe(1);
      
      // Should now be marked as recent
      expect(merged[0].isRecent).toBe(true);
      expect(merged[0].lastOpened).toBeDefined();
    });

    it('should handle opening multiple discovered projects', () => {
      manager = new RecentProjectsManager(storageFilePath);

      // Create multiple test project directories
      const testProjectDir2 = path.join(tempDir, 'discovered-project-2');
      const testProjectDir3 = path.join(tempDir, 'discovered-project-3');
      
      fs.mkdirSync(testProjectDir2, { recursive: true });
      fs.mkdirSync(testProjectDir3, { recursive: true });
      
      // Create project.json files
      const projectConfig = {
        schema_version: '1.0',
        project_name: 'Test',
        capabilities: {},
        generation_status: {},
      };
      
      fs.writeFileSync(path.join(testProjectDir2, 'project.json'), JSON.stringify(projectConfig), 'utf-8');
      fs.writeFileSync(path.join(testProjectDir3, 'project.json'), JSON.stringify(projectConfig), 'utf-8');

      // User opens multiple discovered projects
      manager.addProject({
        id: 'discovered-1',
        name: 'Discovered Project 1',
        path: testProjectDir,
      });

      manager.addProject({
        id: 'discovered-2',
        name: 'Discovered Project 2',
        path: testProjectDir2,
      });

      manager.addProject({
        id: 'discovered-3',
        name: 'Discovered Project 3',
        path: testProjectDir3,
      });

      // Verify all were added
      expect(manager.getCount()).toBe(3);
      
      // Verify they're in correct order (most recent first)
      const projects = manager.getProjects();
      expect(projects[0].name).toBe('Discovered Project 3');
      expect(projects[1].name).toBe('Discovered Project 2');
      expect(projects[2].name).toBe('Discovered Project 1');
    });
  });

  describe('Requirement 8.3: Metadata preservation during merge', () => {
    let testProjectDir: string;

    beforeEach(() => {
      testProjectDir = path.join(tempDir, 'test-project');
      fs.mkdirSync(testProjectDir, { recursive: true });
      fs.writeFileSync(path.join(testProjectDir, 'project.json'), '{}', 'utf-8');
    });

    it('should preserve all recent project metadata during merge', async () => {
      // Add a project to recent list with specific metadata
      const addTime = new Date('2024-01-15T10:30:00.000Z');
      
      manager = new RecentProjectsManager(storageFilePath);
      manager.addProject({
        id: 'recent-project',
        name: 'Recent Project Name',
        path: testProjectDir,
      });

      // Create discovered projects list with same project
      const discoveredProjects: DiscoveredProject[] = [
        {
          name: 'Different Name', // Different name in discovered list
          path: testProjectDir, // Same path
          lastModified: new Date('2024-01-20'),
          createdAt: new Date('2024-01-01'),
          isRecent: false,
        },
      ];

      const merged = await manager.getMergedProjectList(discoveredProjects);

      // Should have only 1 project (deduplicated)
      expect(merged.length).toBe(1);

      const project = merged[0];
      
      // Should preserve recent project's name (not discovered name)
      expect(project.name).toBe('Recent Project Name');
      
      // Should preserve recent project's path
      expect(project.path).toBe(testProjectDir);
      
      // Should be marked as recent
      expect(project.isRecent).toBe(true);
      
      // Should have lastOpened from recent project
      expect(project.lastOpened).toBeDefined();
      
      // Should have id from recent project
      expect(project.id).toBe('recent-project');
    });

    it('should preserve exists property from recent projects', async () => {
      manager = new RecentProjectsManager(storageFilePath);
      
      manager.addProject({
        id: 'recent-project',
        name: 'Recent Project',
        path: testProjectDir,
      });

      // Check existence
      await manager.checkProjectsExistence();

      const discoveredProjects: DiscoveredProject[] = [];
      const merged = await manager.getMergedProjectList(discoveredProjects);

      expect(merged[0].exists).toBe(true);
    });

    it('should not lose metadata when merging large lists', async () => {
      manager = new RecentProjectsManager(storageFilePath);

      // Add multiple recent projects
      for (let i = 1; i <= 5; i++) {
        const projectDir = path.join(tempDir, `recent-project-${i}`);
        fs.mkdirSync(projectDir, { recursive: true });
        fs.writeFileSync(path.join(projectDir, 'project.json'), '{}', 'utf-8');
        
        manager.addProject({
          id: `recent-${i}`,
          name: `Recent Project ${i}`,
          path: projectDir,
        });
      }

      // Create discovered projects (some overlapping, some new)
      const discoveredProjects: DiscoveredProject[] = [];
      
      // Overlapping projects (1-3)
      for (let i = 1; i <= 3; i++) {
        const projectDir = path.join(tempDir, `recent-project-${i}`);
        discoveredProjects.push({
          name: `Discovered Name ${i}`, // Different name
          path: projectDir,
          lastModified: new Date(`2024-01-${10 + i}`),
          isRecent: false,
        });
      }
      
      // New discovered projects (6-8)
      for (let i = 6; i <= 8; i++) {
        const projectDir = path.join(tempDir, `discovered-project-${i}`);
        fs.mkdirSync(projectDir, { recursive: true });
        fs.writeFileSync(path.join(projectDir, 'project.json'), '{}', 'utf-8');
        
        discoveredProjects.push({
          name: `Discovered Project ${i}`,
          path: projectDir,
          lastModified: new Date(`2024-01-${10 + i}`),
          isRecent: false,
        });
      }

      const merged = await manager.getMergedProjectList(discoveredProjects);

      // Should have 8 total projects (5 recent + 3 new discovered)
      expect(merged.length).toBe(8);

      // Verify recent projects preserved their names
      const recentProjects = merged.filter(p => p.isRecent);
      expect(recentProjects.length).toBe(5);
      
      recentProjects.forEach((project, index) => {
        // Should have recent project names, not discovered names
        expect(project.name).toMatch(/^Recent Project \d+$/);
        expect(project.id).toBeDefined();
        expect(project.lastOpened).toBeDefined();
      });

      // Verify discovered projects have correct metadata
      const discoveredOnly = merged.filter(p => !p.isRecent);
      expect(discoveredOnly.length).toBe(3);
      
      discoveredOnly.forEach(project => {
        expect(project.name).toMatch(/^Discovered Project \d+$/);
        expect(project.lastOpened).toBeUndefined();
      });
    });
  });

  describe('Integration: Complete backward compatibility workflow', () => {
    let testProjectDir1: string;
    let testProjectDir2: string;
    let testProjectDir3: string;

    beforeEach(() => {
      // Create test project directories
      testProjectDir1 = path.join(tempDir, 'existing-project');
      testProjectDir2 = path.join(tempDir, 'discovered-project');
      testProjectDir3 = path.join(tempDir, 'new-project');

      [testProjectDir1, testProjectDir2, testProjectDir3].forEach(dir => {
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'project.json'), '{}', 'utf-8');
      });
    });

    it('should handle complete user workflow with backward compatibility', async () => {
      // Step 1: User has existing recent-projects.json from previous version
      const existingData = {
        version: '1.0',
        projects: [
          {
            id: 'existing-1',
            name: 'Existing Project',
            path: testProjectDir1,
            lastAccessed: '2024-01-10T10:00:00.000Z',
          },
        ],
      };

      fs.writeFileSync(storageFilePath, JSON.stringify(existingData, null, 2), 'utf-8');

      // Step 2: Application starts and loads recent projects
      manager = new RecentProjectsManager(storageFilePath);
      expect(manager.getCount()).toBe(1);

      // Step 3: Discovery service finds projects in directory
      const discoveredProjects: DiscoveredProject[] = [
        {
          name: 'Existing Project', // Same project
          path: testProjectDir1,
          lastModified: new Date('2024-01-10'),
          isRecent: false,
        },
        {
          name: 'Discovered Project', // New project found
          path: testProjectDir2,
          lastModified: new Date('2024-01-15'),
          isRecent: false,
        },
      ];

      // Step 4: Get merged list for display
      let merged = await manager.getMergedProjectList(discoveredProjects);
      
      expect(merged.length).toBe(2);
      expect(merged.find(p => p.path === testProjectDir1)?.isRecent).toBe(true);
      expect(merged.find(p => p.path === testProjectDir2)?.isRecent).toBe(false);

      // Step 5: User opens the discovered project
      manager.addProject({
        id: 'discovered-1',
        name: 'Discovered Project',
        path: testProjectDir2,
      });

      // Step 6: Verify recent-projects.json was updated
      const updatedData = JSON.parse(fs.readFileSync(storageFilePath, 'utf-8'));
      expect(updatedData.projects.length).toBe(2);
      expect(updatedData.projects[0].path).toBe(testProjectDir2); // Most recent

      // Step 7: User creates a new project
      manager.addProject({
        id: 'new-1',
        name: 'New Project',
        path: testProjectDir3,
      });

      // Step 8: Get final merged list
      merged = await manager.getMergedProjectList(discoveredProjects);
      
      // Should have 3 projects, all marked as recent now
      const recentProjects = merged.filter(p => p.isRecent);
      expect(recentProjects.length).toBe(3);

      // Step 9: Verify file structure is still correct
      const finalData = JSON.parse(fs.readFileSync(storageFilePath, 'utf-8'));
      expect(finalData.version).toBe('1.0');
      expect(finalData.projects.length).toBe(3);
      
      // Verify no extra fields were added
      finalData.projects.forEach((project: any) => {
        const keys = Object.keys(project).sort();
        expect(keys).toEqual(['id', 'lastAccessed', 'name', 'path']);
      });
    });
  });
});
