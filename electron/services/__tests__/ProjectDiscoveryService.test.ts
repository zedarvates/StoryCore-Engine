/**
 * Unit tests for ProjectDiscoveryService
 */

import * as fs from 'fs';
import * as path from 'path';
import { ProjectDiscoveryService, DiscoveredProject } from '../ProjectDiscoveryService';
import * as defaultPaths from '../../defaultPaths';

// Mock electron before importing modules that use it
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(),
  },
}));

// Mock electron before importing modules that use it
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(),
  },
}));

// Mock the modules
jest.mock('fs');
jest.mock('../../defaultPaths');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockFsPromises = {
  readdir: jest.fn(),
  stat: jest.fn(),
  readFile: jest.fn(),
};
// Assign the mocked promises to fs.promises
(mockFs as any).promises = mockFsPromises;

const mockDefaultPaths = defaultPaths as jest.Mocked<typeof defaultPaths>;

describe('ProjectDiscoveryService', () => {
  let service: ProjectDiscoveryService;
  const mockProjectsDir = '/mock/documents/StoryCore Projects';

  beforeEach(() => {
    service = new ProjectDiscoveryService();
    jest.clearAllMocks();
    
    // Reset mock implementations
    mockFsPromises.readdir.mockReset();
    mockFsPromises.stat.mockReset();
    mockFsPromises.readFile.mockReset();
    mockFs.existsSync.mockReset();
    
    // Default mock for getDefaultProjectsDirectory
    mockDefaultPaths.getDefaultProjectsDirectory.mockReturnValue(mockProjectsDir);
  });

  describe('scanProjectDirectory', () => {
    it('should return empty array when projects directory does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await service.scanProjectDirectory();

      expect(result.projects).toEqual([]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('ENOENT');
      expect(mockFs.existsSync).toHaveBeenCalledWith(mockProjectsDir);
    });

    it('should scan directory and return valid projects', async () => {
      const mockDirents = [
        { name: 'project1', isDirectory: () => true },
        { name: 'project2', isDirectory: () => true },
        { name: 'file.txt', isDirectory: () => false },
      ];

      const validProjectJson = JSON.stringify({
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
      });

      mockFs.existsSync.mockImplementation((filePath: any) => {
        const pathStr = String(filePath);
        if (pathStr === mockProjectsDir) return true;
        if (pathStr.includes('project.json')) return true;
        return true;
      });

      mockFsPromises.readdir.mockResolvedValue(mockDirents as any);
      mockFsPromises.stat.mockResolvedValue({
        isDirectory: () => true,
        mtime: new Date('2024-01-15'),
      } as any);
      mockFsPromises.readFile.mockResolvedValue(validProjectJson);

      const result = await service.scanProjectDirectory();

      expect(result.projects).toHaveLength(2);
      expect(result.projects[0]).toMatchObject({
        name: 'Test Project',
        isRecent: false,
        isValid: true,
      });
      expect(result.errors).toHaveLength(0);
    });

    it('should skip folders without project.json', async () => {
      const mockDirents = [
        { name: 'valid-project', isDirectory: () => true },
        { name: 'invalid-folder', isDirectory: () => true },
      ];

      mockFs.existsSync.mockImplementation((filePath: any) => {
        const pathStr = String(filePath);
        if (pathStr === mockProjectsDir) return true;
        if (pathStr.includes('valid-project') && pathStr.includes('project.json')) return true;
        if (pathStr.includes('invalid-folder') && pathStr.includes('project.json')) return false;
        return true; // Default to true for folder checks
      });

      mockFsPromises.readdir.mockResolvedValue(mockDirents as any);
      mockFsPromises.stat.mockResolvedValue({
        isDirectory: () => true,
        mtime: new Date('2024-01-15'),
      } as any);
      mockFsPromises.readFile.mockResolvedValue(JSON.stringify({
        schema_version: '1.0',
        project_name: 'Valid Project',
        capabilities: { grid_generation: true, promotion_engine: true, qa_engine: true, autofix_engine: true },
        generation_status: { grid: 'pending', promotion: 'pending' },
      }));

      const result = await service.scanProjectDirectory();

      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].name).toBe('Valid Project');
    });

    it('should use cache for subsequent calls within TTL', async () => {
      const mockDirents = [
        { name: 'project1', isDirectory: () => true },
      ];

      mockFs.existsSync.mockImplementation((filePath: any) => {
        const pathStr = String(filePath);
        if (pathStr === mockProjectsDir) return true;
        if (pathStr.includes('project.json')) return true;
        return true;
      });
      mockFsPromises.readdir.mockResolvedValue(mockDirents as any);
      mockFsPromises.stat.mockResolvedValue({
        isDirectory: () => true,
        mtime: new Date('2024-01-15'),
      } as any);
      mockFsPromises.readFile.mockResolvedValue(JSON.stringify({
        schema_version: '1.0',
        project_name: 'Test Project',
        capabilities: { grid_generation: true, promotion_engine: true, qa_engine: true, autofix_engine: true },
        generation_status: { grid: 'pending', promotion: 'pending' },
      }));

      // First call
      const result1 = await service.scanProjectDirectory();
      expect(mockFsPromises.readdir).toHaveBeenCalledTimes(1);
      expect(result1.projects).toHaveLength(1);

      // Second call (should use cache)
      const result2 = await service.scanProjectDirectory();
      expect(mockFsPromises.readdir).toHaveBeenCalledTimes(1); // Not called again
      expect(result2).toEqual(result1);
    });

    it('should bypass cache when bypassCache option is true', async () => {
      const mockDirents = [
        { name: 'project1', isDirectory: () => true },
      ];

      mockFs.existsSync.mockImplementation((filePath: any) => {
        const pathStr = String(filePath);
        if (pathStr === mockProjectsDir) return true;
        if (pathStr.includes('project.json')) return true;
        return true;
      });
      mockFsPromises.readdir.mockResolvedValue(mockDirents as any);
      mockFsPromises.stat.mockResolvedValue({
        isDirectory: () => true,
        mtime: new Date('2024-01-15'),
      } as any);
      mockFsPromises.readFile.mockResolvedValue(JSON.stringify({
        schema_version: '1.0',
        project_name: 'Test Project',
        capabilities: { grid_generation: true, promotion_engine: true, qa_engine: true, autofix_engine: true },
        generation_status: { grid: 'pending', promotion: 'pending' },
      }));

      // First call
      await service.scanProjectDirectory();
      expect(mockFsPromises.readdir).toHaveBeenCalledTimes(1);

      // Second call with bypassCache
      await service.scanProjectDirectory({ bypassCache: true });
      expect(mockFsPromises.readdir).toHaveBeenCalledTimes(2); // Called again
    });

    it('should handle scan errors gracefully', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFsPromises.readdir.mockRejectedValue(new Error('Permission denied'));

      const result = await service.scanProjectDirectory();

      expect(result.projects).toEqual([]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('Permission denied');
    });

    it('should continue scanning after individual folder errors', async () => {
      const mockDirents = [
        { name: 'good-project', isDirectory: () => true },
        { name: 'bad-project', isDirectory: () => true },
      ];
      
      mockFs.existsSync.mockImplementation((filePath: any) => {
        const pathStr = String(filePath);
        if (pathStr === mockProjectsDir) return true;
        if (pathStr.includes('project.json')) return true;
        return true; // Default to true for folder checks
      });

      mockFsPromises.readdir.mockResolvedValue(mockDirents as any);
      mockFsPromises.stat.mockResolvedValue({
        isDirectory: () => true,
        mtime: new Date('2024-01-15'),
      } as any);
      
      mockFsPromises.readFile.mockImplementation((filePath: any) => {
        const pathStr = String(filePath);
        
        if (pathStr.includes('bad-project')) {
          return Promise.reject(new Error('Read error'));
        }
        return Promise.resolve(JSON.stringify({
          schema_version: '1.0',
          project_name: 'Good Project',
          capabilities: { grid_generation: true, promotion_engine: true, qa_engine: true, autofix_engine: true },
          generation_status: { grid: 'pending', promotion: 'pending' },
        }));
      });

      const result = await service.scanProjectDirectory();

      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].name).toBe('Good Project');
    });
  });

  describe('isValidProject', () => {
    const projectPath = '/mock/projects/test-project';

    it('should return false when folder does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await service.isValidProject(projectPath);

      expect(result).toBe(false);
    });

    it('should return false when path is not a directory', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFsPromises.stat.mockResolvedValue({
        isDirectory: () => false,
      } as any);

      const result = await service.isValidProject(projectPath);

      expect(result).toBe(false);
    });

    it('should return false when project.json does not exist', async () => {
      mockFs.existsSync.mockImplementation((path: any) => {
        if (path === projectPath) return true;
        if (path.includes('project.json')) return false;
        return false;
      });
      mockFsPromises.stat.mockResolvedValue({
        isDirectory: () => true,
      } as any);

      const result = await service.isValidProject(projectPath);

      expect(result).toBe(false);
    });

    it('should return true for valid project with all required fields', async () => {
      const validProjectJson = JSON.stringify({
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
      });

      mockFs.existsSync.mockReturnValue(true);
      mockFsPromises.stat.mockResolvedValue({
        isDirectory: () => true,
      } as any);
      mockFsPromises.readFile.mockResolvedValue(validProjectJson);

      const result = await service.isValidProject(projectPath);

      expect(result).toBe(true);
    });

    it('should return false for malformed JSON', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFsPromises.stat.mockResolvedValue({
        isDirectory: () => true,
      } as any);
      mockFsPromises.readFile.mockResolvedValue('{ invalid json }');

      const result = await service.isValidProject(projectPath);

      expect(result).toBe(false);
    });

    it('should return false when missing schema_version', async () => {
      const invalidProjectJson = JSON.stringify({
        project_name: 'Test Project',
        capabilities: { grid_generation: true, promotion_engine: true, qa_engine: true, autofix_engine: true },
        generation_status: { grid: 'pending', promotion: 'pending' },
      });

      mockFs.existsSync.mockReturnValue(true);
      mockFsPromises.stat.mockResolvedValue({
        isDirectory: () => true,
      } as any);
      mockFsPromises.readFile.mockResolvedValue(invalidProjectJson);

      const result = await service.isValidProject(projectPath);

      expect(result).toBe(false);
    });

    it('should return false when missing project_name', async () => {
      const invalidProjectJson = JSON.stringify({
        schema_version: '1.0',
        capabilities: { grid_generation: true, promotion_engine: true, qa_engine: true, autofix_engine: true },
        generation_status: { grid: 'pending', promotion: 'pending' },
      });

      mockFs.existsSync.mockReturnValue(true);
      mockFsPromises.stat.mockResolvedValue({
        isDirectory: () => true,
      } as any);
      mockFsPromises.readFile.mockResolvedValue(invalidProjectJson);

      const result = await service.isValidProject(projectPath);

      expect(result).toBe(false);
    });

    it('should return false when missing capabilities', async () => {
      const invalidProjectJson = JSON.stringify({
        schema_version: '1.0',
        project_name: 'Test Project',
        generation_status: { grid: 'pending', promotion: 'pending' },
      });

      mockFs.existsSync.mockReturnValue(true);
      mockFsPromises.stat.mockResolvedValue({
        isDirectory: () => true,
      } as any);
      mockFsPromises.readFile.mockResolvedValue(invalidProjectJson);

      const result = await service.isValidProject(projectPath);

      expect(result).toBe(false);
    });

    it('should return false when missing generation_status', async () => {
      const invalidProjectJson = JSON.stringify({
        schema_version: '1.0',
        project_name: 'Test Project',
        capabilities: { grid_generation: true, promotion_engine: true, qa_engine: true, autofix_engine: true },
      });

      mockFs.existsSync.mockReturnValue(true);
      mockFsPromises.stat.mockResolvedValue({
        isDirectory: () => true,
      } as any);
      mockFsPromises.readFile.mockResolvedValue(invalidProjectJson);

      const result = await service.isValidProject(projectPath);

      expect(result).toBe(false);
    });
  });

  describe('extractProjectMetadata', () => {
    const projectPath = '/mock/projects/test-project';

    it('should extract complete metadata from valid project', async () => {
      const projectJson = JSON.stringify({
        schema_version: '1.0',
        project_name: 'My Test Project',
        created_at: '2024-01-01T00:00:00.000Z',
        capabilities: { grid_generation: true, promotion_engine: true, qa_engine: true, autofix_engine: true },
        generation_status: { grid: 'done', promotion: 'pending' },
      });

      mockFsPromises.readFile.mockResolvedValue(projectJson);
      mockFsPromises.stat.mockResolvedValue({
        mtime: new Date('2024-01-15T12:00:00.000Z'),
      } as any);

      const result = await service.extractProjectMetadata(projectPath);

      expect(result).not.toBeNull();
      expect(result).toMatchObject({
        name: 'My Test Project',
        path: projectPath,
        isRecent: false,
        isValid: true,
      });
      expect(result!.lastModified).toBe(new Date('2024-01-15T12:00:00.000Z').getTime());
      expect(result!.createdAt).toEqual(new Date('2024-01-01T00:00:00.000Z'));
    });

    it('should extract metadata without created_at if not present', async () => {
      const projectJson = JSON.stringify({
        schema_version: '1.0',
        project_name: 'My Test Project',
        capabilities: { grid_generation: true, promotion_engine: true, qa_engine: true, autofix_engine: true },
        generation_status: { grid: 'done', promotion: 'pending' },
      });

      mockFsPromises.readFile.mockResolvedValue(projectJson);
      mockFsPromises.stat.mockResolvedValue({
        mtime: new Date('2024-01-15T12:00:00.000Z'),
      } as any);

      const result = await service.extractProjectMetadata(projectPath);

      expect(result).not.toBeNull();
      expect(result!.createdAt).toBeUndefined();
    });

    it('should return null when file cannot be read', async () => {
      mockFsPromises.readFile.mockRejectedValue(new Error('File not found'));

      const result = await service.extractProjectMetadata(projectPath);

      expect(result).toBeNull();
    });

    it('should return null when JSON is malformed', async () => {
      mockFsPromises.readFile.mockResolvedValue('{ invalid json }');

      const result = await service.extractProjectMetadata(projectPath);

      expect(result).toBeNull();
    });

    it('should handle invalid created_at date gracefully', async () => {
      const projectJson = JSON.stringify({
        schema_version: '1.0',
        project_name: 'My Test Project',
        created_at: 'invalid-date',
        capabilities: { grid_generation: true, promotion_engine: true, qa_engine: true, autofix_engine: true },
        generation_status: { grid: 'done', promotion: 'pending' },
      });

      mockFsPromises.readFile.mockResolvedValue(projectJson);
      mockFsPromises.stat.mockResolvedValue({
        mtime: new Date('2024-01-15T12:00:00.000Z'),
      } as any);

      const result = await service.extractProjectMetadata(projectPath);

      expect(result).not.toBeNull();
      expect(result!.createdAt).toBeUndefined();
    });
  });

  describe('clearCache', () => {
    it('should clear the cache', async () => {
      // Setup cache by doing a scan
      mockFs.existsSync.mockReturnValue(true);
      mockFsPromises.readdir.mockResolvedValue([]);

      await service.scanProjectDirectory();
      
      let status = service.getCacheStatus();
      expect(status.cached).toBe(true);

      // Clear cache
      service.clearCache();

      status = service.getCacheStatus();
      expect(status.cached).toBe(false);
    });
  });

  describe('getCacheStatus', () => {
    it('should return not cached when no cache exists', () => {
      const status = service.getCacheStatus();

      expect(status).toEqual({ cached: false });
    });

    it('should return cache info when cache exists', async () => {
      mockFs.existsSync.mockImplementation((filePath: any) => {
        const pathStr = String(filePath);
        if (pathStr === mockProjectsDir) return true;
        if (pathStr.includes('project.json')) return true;
        return true;
      });
      mockFsPromises.readdir.mockResolvedValue([
        { name: 'project1', isDirectory: () => true },
      ] as any);
      mockFsPromises.stat.mockResolvedValue({
        isDirectory: () => true,
        mtime: new Date('2024-01-15'),
      } as any);
      mockFsPromises.readFile.mockResolvedValue(JSON.stringify({
        schema_version: '1.0',
        project_name: 'Test',
        capabilities: { grid_generation: true, promotion_engine: true, qa_engine: true, autofix_engine: true },
        generation_status: { grid: 'pending', promotion: 'pending' },
      }));

      await service.scanProjectDirectory();

      const status = service.getCacheStatus();

      expect(status.cached).toBe(true);
      expect(status.count).toBe(1);
      expect(status.age).toBeGreaterThanOrEqual(0);
    });
  });

  describe('validateProjectJson', () => {
    const projectJsonPath = '/mock/projects/test-project/project.json';

    it('should return error when file does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await service.validateProjectJson(projectJsonPath);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('project.json file does not exist');
      expect(result.config).toBeUndefined();
    });

    it('should return error for malformed JSON', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFsPromises.readFile.mockResolvedValue('{ invalid json }');

      const result = await service.validateProjectJson(projectJsonPath);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Invalid JSON syntax');
      expect(result.config).toBeUndefined();
    });

    it('should validate successfully with all required fields', async () => {
      const validProjectJson = JSON.stringify({
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
      });

      mockFs.existsSync.mockReturnValue(true);
      mockFsPromises.readFile.mockResolvedValue(validProjectJson);

      const result = await service.validateProjectJson(projectJsonPath);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.config).toBeDefined();
      expect(result.config?.schema_version).toBe('1.0');
      expect(result.config?.project_name).toBe('Test Project');
    });

    it('should return error when schema_version is missing', async () => {
      const invalidProjectJson = JSON.stringify({
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
      });

      mockFs.existsSync.mockReturnValue(true);
      mockFsPromises.readFile.mockResolvedValue(invalidProjectJson);

      const result = await service.validateProjectJson(projectJsonPath);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required field: schema_version');
    });

    it('should return error when schema_version is not a string', async () => {
      const invalidProjectJson = JSON.stringify({
        schema_version: 1.0,
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
      });

      mockFs.existsSync.mockReturnValue(true);
      mockFsPromises.readFile.mockResolvedValue(invalidProjectJson);

      const result = await service.validateProjectJson(projectJsonPath);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid type for schema_version: expected string');
    });

    it('should return error when project_name is missing', async () => {
      const invalidProjectJson = JSON.stringify({
        schema_version: '1.0',
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
      });

      mockFs.existsSync.mockReturnValue(true);
      mockFsPromises.readFile.mockResolvedValue(invalidProjectJson);

      const result = await service.validateProjectJson(projectJsonPath);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required field: project_name');
    });

    it('should return error when capabilities is missing', async () => {
      const invalidProjectJson = JSON.stringify({
        schema_version: '1.0',
        project_name: 'Test Project',
        generation_status: {
          grid: 'pending',
          promotion: 'pending',
        },
      });

      mockFs.existsSync.mockReturnValue(true);
      mockFsPromises.readFile.mockResolvedValue(invalidProjectJson);

      const result = await service.validateProjectJson(projectJsonPath);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required field: capabilities');
    });

    it('should return error when capabilities is not an object', async () => {
      const invalidProjectJson = JSON.stringify({
        schema_version: '1.0',
        project_name: 'Test Project',
        capabilities: 'invalid',
        generation_status: {
          grid: 'pending',
          promotion: 'pending',
        },
      });

      mockFs.existsSync.mockReturnValue(true);
      mockFsPromises.readFile.mockResolvedValue(invalidProjectJson);

      const result = await service.validateProjectJson(projectJsonPath);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid type for capabilities: expected object');
    });

    it('should return error when required capability is missing', async () => {
      const invalidProjectJson = JSON.stringify({
        schema_version: '1.0',
        project_name: 'Test Project',
        capabilities: {
          grid_generation: true,
          promotion_engine: true,
          qa_engine: true,
          // autofix_engine is missing
        },
        generation_status: {
          grid: 'pending',
          promotion: 'pending',
        },
      });

      mockFs.existsSync.mockReturnValue(true);
      mockFsPromises.readFile.mockResolvedValue(invalidProjectJson);

      const result = await service.validateProjectJson(projectJsonPath);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required capability: autofix_engine');
    });

    it('should return error when capability is not a boolean', async () => {
      const invalidProjectJson = JSON.stringify({
        schema_version: '1.0',
        project_name: 'Test Project',
        capabilities: {
          grid_generation: 'yes',
          promotion_engine: true,
          qa_engine: true,
          autofix_engine: true,
        },
        generation_status: {
          grid: 'pending',
          promotion: 'pending',
        },
      });

      mockFs.existsSync.mockReturnValue(true);
      mockFsPromises.readFile.mockResolvedValue(invalidProjectJson);

      const result = await service.validateProjectJson(projectJsonPath);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid type for capability grid_generation: expected boolean');
    });

    it('should return error when generation_status is missing', async () => {
      const invalidProjectJson = JSON.stringify({
        schema_version: '1.0',
        project_name: 'Test Project',
        capabilities: {
          grid_generation: true,
          promotion_engine: true,
          qa_engine: true,
          autofix_engine: true,
        },
      });

      mockFs.existsSync.mockReturnValue(true);
      mockFsPromises.readFile.mockResolvedValue(invalidProjectJson);

      const result = await service.validateProjectJson(projectJsonPath);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required field: generation_status');
    });

    it('should return error when generation_status.grid is missing', async () => {
      const invalidProjectJson = JSON.stringify({
        schema_version: '1.0',
        project_name: 'Test Project',
        capabilities: {
          grid_generation: true,
          promotion_engine: true,
          qa_engine: true,
          autofix_engine: true,
        },
        generation_status: {
          promotion: 'pending',
        },
      });

      mockFs.existsSync.mockReturnValue(true);
      mockFsPromises.readFile.mockResolvedValue(invalidProjectJson);

      const result = await service.validateProjectJson(projectJsonPath);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required field: generation_status.grid');
    });

    it('should return error when generation_status.grid has invalid value', async () => {
      const invalidProjectJson = JSON.stringify({
        schema_version: '1.0',
        project_name: 'Test Project',
        capabilities: {
          grid_generation: true,
          promotion_engine: true,
          qa_engine: true,
          autofix_engine: true,
        },
        generation_status: {
          grid: 'invalid_status',
          promotion: 'pending',
        },
      });

      mockFs.existsSync.mockReturnValue(true);
      mockFsPromises.readFile.mockResolvedValue(invalidProjectJson);

      const result = await service.validateProjectJson(projectJsonPath);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('generation_status.grid'))).toBe(true);
    });

    it('should return error when generation_status.promotion is missing', async () => {
      const invalidProjectJson = JSON.stringify({
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
        },
      });

      mockFs.existsSync.mockReturnValue(true);
      mockFsPromises.readFile.mockResolvedValue(invalidProjectJson);

      const result = await service.validateProjectJson(projectJsonPath);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required field: generation_status.promotion');
    });

    it('should return multiple errors for multiple missing fields', async () => {
      const invalidProjectJson = JSON.stringify({
        schema_version: '1.0',
        // Missing project_name, capabilities, and generation_status
      });

      mockFs.existsSync.mockReturnValue(true);
      mockFsPromises.readFile.mockResolvedValue(invalidProjectJson);

      const result = await service.validateProjectJson(projectJsonPath);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain('Missing required field: project_name');
      expect(result.errors).toContain('Missing required field: capabilities');
      expect(result.errors).toContain('Missing required field: generation_status');
    });

    it('should accept all valid status values', async () => {
      const validStatuses = ['pending', 'done', 'failed', 'passed'];

      for (const status of validStatuses) {
        const validProjectJson = JSON.stringify({
          schema_version: '1.0',
          project_name: 'Test Project',
          capabilities: {
            grid_generation: true,
            promotion_engine: true,
            qa_engine: true,
            autofix_engine: true,
          },
          generation_status: {
            grid: status,
            promotion: status,
          },
        });

        mockFs.existsSync.mockReturnValue(true);
        mockFsPromises.readFile.mockResolvedValue(validProjectJson);

        const result = await service.validateProjectJson(projectJsonPath);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }
    });

    it('should handle file read errors gracefully', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFsPromises.readFile.mockRejectedValue(new Error('Permission denied'));

      const result = await service.validateProjectJson(projectJsonPath);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Validation error');
    });
  });
});
