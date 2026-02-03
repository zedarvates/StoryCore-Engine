/**
 * Integration test for discover-projects IPC handler
 * 
 * Tests the complete flow from IPC invocation to ProjectDiscoveryService
 */

import { IPCHandlers, IPC_CHANNELS } from '../ipcChannels';
import { ProjectService } from '../ProjectService';
import { RecentProjectsManager } from '../RecentProjectsManager';
import { ProjectDiscoveryService } from '../services/ProjectDiscoveryService';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock electron
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn((channel: string, handler: Function) => {
      // Store handlers for testing
      (global as any).__ipcHandlers = (global as any).__ipcHandlers || {};
      (global as any).__ipcHandlers[channel] = handler;
    }),
    removeHandler: jest.fn(),
    removeAllListeners: jest.fn(),
    on: jest.fn(),
  },
  dialog: {
    showOpenDialog: jest.fn(),
  },
  BrowserWindow: {
    fromWebContents: jest.fn(),
  },
  app: {
    getPath: jest.fn(() => '/mock/app/data'),
    quit: jest.fn(),
  },
}));

// Mock defaultPaths to use a temp directory
const tempDir = path.join(os.tmpdir(), 'storycore-test-projects');
jest.mock('../defaultPaths', () => ({
  getDefaultProjectsDirectory: jest.fn(() => tempDir),
}));

describe('discover-projects IPC Handler Integration', () => {
  let ipcHandlers: IPCHandlers;
  let projectService: ProjectService;
  let recentProjectsManager: RecentProjectsManager;

  beforeAll(() => {
    // Create temp directory for testing
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    // Clear any existing projects
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      files.forEach(file => {
        const filePath = path.join(tempDir, file);
        if (fs.statSync(filePath).isDirectory()) {
          fs.rmSync(filePath, { recursive: true, force: true });
        }
      });
    }

    // Initialize services
    projectService = new ProjectService();
    recentProjectsManager = new RecentProjectsManager('/tmp/recent-projects-test.json');
    
    // Initialize IPC handlers
    ipcHandlers = new IPCHandlers(projectService, recentProjectsManager);
    ipcHandlers.registerHandlers();
  });

  afterEach(() => {
    // Unregister handlers
    ipcHandlers.unregisterHandlers();
  });

  describe('Handler Registration', () => {
    it('should register discover-projects handler', () => {
      const handlers = (global as any).__ipcHandlers;
      expect(handlers).toHaveProperty('discover-projects');
      expect(typeof handlers['discover-projects']).toBe('function');
    });
  });

  describe('Empty Directory', () => {
    it('should return empty projects array when no projects exist', async () => {
      const handler = (global as any).__ipcHandlers['discover-projects'];
      const result = await handler({}, null);

      expect(result).toHaveProperty('projects');
      expect(result).toHaveProperty('scannedPath');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('errors');
      
      expect(Array.isArray(result.projects)).toBe(true);
      expect(result.projects.length).toBe(0);
      expect(result.scannedPath).toBe(tempDir);
      expect(typeof result.timestamp).toBe('number');
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe('Valid Project Discovery', () => {
    it('should discover a valid project', async () => {
      // Create a valid project
      const projectPath = path.join(tempDir, 'test-project');
      fs.mkdirSync(projectPath, { recursive: true });
      
      const projectJson = {
        schema_version: '1.0',
        project_name: 'Test Project',
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
        path.join(projectPath, 'project.json'),
        JSON.stringify(projectJson, null, 2)
      );

      // Invoke handler
      const handler = (global as any).__ipcHandlers['discover-projects'];
      const result = await handler({}, null);

      expect(result.projects.length).toBe(1);
      expect(result.projects[0].name).toBe('Test Project');
      expect(result.projects[0].path).toBe(projectPath);
      expect(result.projects[0].isValid).toBe(true);
      expect(result.projects[0].metadata).toBeDefined();
      expect(result.projects[0].metadata?.project_name).toBe('Test Project');
      expect(result.errors.length).toBe(0);
    });

    it('should discover multiple valid projects', async () => {
      // Create multiple valid projects
      for (let i = 1; i <= 3; i++) {
        const projectPath = path.join(tempDir, `test-project-${i}`);
        fs.mkdirSync(projectPath, { recursive: true });
        
        const projectJson = {
          schema_version: '1.0',
          project_name: `Test Project ${i}`,
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
          path.join(projectPath, 'project.json'),
          JSON.stringify(projectJson, null, 2)
        );
      }

      // Invoke handler
      const handler = (global as any).__ipcHandlers['discover-projects'];
      const result = await handler({}, null);

      expect(result.projects.length).toBe(3);
      expect(result.errors.length).toBe(0);
    });
  });

  describe('Invalid Project Handling', () => {
    it('should skip folders without project.json', async () => {
      // Create a folder without project.json
      const invalidPath = path.join(tempDir, 'invalid-project');
      fs.mkdirSync(invalidPath, { recursive: true });

      // Invoke handler
      const handler = (global as any).__ipcHandlers['discover-projects'];
      const result = await handler({}, null);

      expect(result.projects.length).toBe(0);
      expect(result.errors.length).toBe(0); // Not an error, just not a valid project
    });

    it('should handle corrupted project.json gracefully', async () => {
      // Create a project with corrupted JSON
      const projectPath = path.join(tempDir, 'corrupted-project');
      fs.mkdirSync(projectPath, { recursive: true });
      fs.writeFileSync(
        path.join(projectPath, 'project.json'),
        '{ invalid json }'
      );

      // Invoke handler
      const handler = (global as any).__ipcHandlers['discover-projects'];
      const result = await handler({}, null);

      expect(result.projects.length).toBe(0);
      // Corrupted projects should be logged but not crash the scan
    });

    it('should skip projects with missing required fields', async () => {
      // Create a project with incomplete project.json
      const projectPath = path.join(tempDir, 'incomplete-project');
      fs.mkdirSync(projectPath, { recursive: true });
      
      const incompleteJson = {
        schema_version: '1.0',
        // Missing project_name and other required fields
      };
      
      fs.writeFileSync(
        path.join(projectPath, 'project.json'),
        JSON.stringify(incompleteJson, null, 2)
      );

      // Invoke handler
      const handler = (global as any).__ipcHandlers['discover-projects'];
      const result = await handler({}, null);

      expect(result.projects.length).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should return error structure when directory does not exist', async () => {
      // Mock getDefaultProjectsDirectory to return non-existent path
      const { getDefaultProjectsDirectory } = require('../defaultPaths');
      getDefaultProjectsDirectory.mockReturnValueOnce('/non/existent/path');

      // Create new handler with mocked path
      const newProjectService = new ProjectService();
      const newRecentProjectsManager = new RecentProjectsManager('/tmp/recent-test.json');
      const newIpcHandlers = new IPCHandlers(newProjectService, newRecentProjectsManager);
      newIpcHandlers.registerHandlers();

      // Invoke handler
      const handler = (global as any).__ipcHandlers['discover-projects'];
      const result = await handler({}, null);

      expect(result).toHaveProperty('projects');
      expect(result).toHaveProperty('errors');
      expect(result.projects.length).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].error).toContain('does not exist');
    });
  });

  describe('Response Structure', () => {
    it('should return DiscoveryResult with all required fields', async () => {
      const handler = (global as any).__ipcHandlers['discover-projects'];
      const result = await handler({}, null);

      // Validate structure
      expect(result).toHaveProperty('projects');
      expect(result).toHaveProperty('scannedPath');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('errors');

      // Validate types
      expect(Array.isArray(result.projects)).toBe(true);
      expect(typeof result.scannedPath).toBe('string');
      expect(typeof result.timestamp).toBe('number');
      expect(Array.isArray(result.errors)).toBe(true);

      // Validate timestamp is recent
      const now = Date.now();
      expect(result.timestamp).toBeLessThanOrEqual(now);
      expect(result.timestamp).toBeGreaterThan(now - 5000); // Within last 5 seconds
    });
  });
});
