/**
 * Unit tests for ProjectService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProjectService } from '../ProjectService';
import type { ProjectData, ShotInput } from '../../../types/project';
import type { Shot } from '../../../types';

// Mock window.electronAPI
const mockElectronAPI = {
  fs: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    exists: vi.fn(),
    ensureDir: vi.fn(),
  },
};

(global as any).window = {
  electronAPI: mockElectronAPI,
};

// Helper function to create buffer mock that returns a serializable object
const createBufferMock = (data: any) => {
  const jsonString = typeof data === 'string' ? data : JSON.stringify(data);
  return {
    toString: (_encoding?: string) => jsonString,
  };
};

describe('ProjectService', () => {
  let service: ProjectService;
  let mockProjectData: ProjectData;

  beforeEach(() => {
    service = new ProjectService();
    vi.clearAllMocks();

    // Create mock project data
    mockProjectData = {
      schema_version: '1.0',
      project_name: 'Test Project',
      capabilities: {
        grid_generation: true,
        promotion_engine: true,
        qa_engine: true,
        autofix_engine: true,
        wizard_generation: true,
      },
      generation_status: {
        grid: 'pending',
        promotion: 'pending',
        wizard: 'pending',
      },
      storyboard: [],
      assets: [],
      characters: [],
      scenes: [],
    };
  });

  describe('loadProject', () => {
    it('should load project data from file', async () => {
      mockElectronAPI.fs.readFile.mockResolvedValue(createBufferMock(mockProjectData));

      const result = await service.loadProject('/test/project');

      expect(mockElectronAPI.fs.readFile).toHaveBeenCalledWith('/test/project/project.json');
      expect(result).toEqual(mockProjectData);
    });

    it('should migrate legacy project data', async () => {
      const legacyData = {
        name: 'Legacy Project',
        shots: [],
        assets: [],
      };
      mockElectronAPI.fs.readFile.mockResolvedValue(createBufferMock(legacyData));

      const result = await service.loadProject('/test/project');

      expect(result.schema_version).toBe('1.0');
      expect(result.project_name).toBe('Legacy Project');
      expect(result.storyboard).toEqual([]);
    });
  });

  describe('saveProject', () => {
    it('should save project data to file', async () => {
      mockElectronAPI.fs.writeFile.mockResolvedValue(undefined);

      await service.saveProject('/test/project', mockProjectData);

      expect(mockElectronAPI.fs.writeFile).toHaveBeenCalled();
    });

    it('should throw error if validation fails', async () => {
      const invalidData = { ...mockProjectData, schema_version: undefined } as any;

      await expect(service.saveProject('/test/project', invalidData)).rejects.toThrow('Cannot save invalid project data');
    });
  });

  describe('createShot', () => {
    it('should create a new shot with unique ID', async () => {
      mockElectronAPI.fs.readFile.mockResolvedValue(createBufferMock(mockProjectData));
      mockElectronAPI.fs.writeFile.mockResolvedValue(undefined);

      const shotInput: ShotInput = {
        title: 'Test Shot',
        description: 'A test shot',
        duration: 5.0,
      };

      const result = await service.createShot('/test/project', shotInput);

      expect(result.id).toMatch(/^shot_\d+_0$/);
      expect(result.title).toBe('Test Shot');
      expect(result.duration).toBe(5.0);
      expect(result.position).toBe(0);
    });

    it('should throw error if title is empty', async () => {
      const shotInput: ShotInput = {
        title: '',
        description: 'A test shot',
        duration: 5.0,
      };

      await expect(service.createShot('/test/project', shotInput)).rejects.toThrow('Shot title cannot be empty');
    });

    it('should throw error if duration is not positive', async () => {
      const shotInput: ShotInput = {
        title: 'Test Shot',
        description: 'A test shot',
        duration: 0,
      };

      await expect(service.createShot('/test/project', shotInput)).rejects.toThrow('Shot duration must be a positive number');
    });
  });

  describe('updateShot', () => {
    it('should update an existing shot', async () => {
      const existingShot: Shot = {
        id: 'shot_1000_0',
        title: 'Original Title',
        description: 'Original description',
        duration: 3.0,
        position: 0,
        audioTracks: [],
        effects: [],
        textLayers: [],
        animations: [],
      };
      mockProjectData.storyboard = [existingShot];
      mockElectronAPI.fs.readFile.mockResolvedValue(createBufferMock(mockProjectData));
      mockElectronAPI.fs.writeFile.mockResolvedValue(undefined);

      await service.updateShot('/test/project', 'shot_1000_0', {
        title: 'Updated Title',
        duration: 5.0,
      });

      expect(mockElectronAPI.fs.writeFile).toHaveBeenCalled();
    });

    it('should throw error if shot not found', async () => {
      mockElectronAPI.fs.readFile.mockResolvedValue(createBufferMock(mockProjectData));

      await expect(service.updateShot('/test/project', 'nonexistent', { title: 'New Title' })).rejects.toThrow('Shot with ID nonexistent not found');
    });
  });

  describe('deleteShot', () => {
    it('should delete a shot and update positions', async () => {
      const shots: Shot[] = [
        {
          id: 'shot_1000_0',
          title: 'Shot 1',
          description: '',
          duration: 3.0,
          position: 0,
          audioTracks: [],
          effects: [],
          textLayers: [],
          animations: [],
        },
        {
          id: 'shot_1001_1',
          title: 'Shot 2',
          description: '',
          duration: 4.0,
          position: 1,
          audioTracks: [],
          effects: [],
          textLayers: [],
          animations: [],
        },
      ];
      mockProjectData.storyboard = shots;
      mockElectronAPI.fs.readFile.mockResolvedValue(createBufferMock(mockProjectData));
      mockElectronAPI.fs.writeFile.mockResolvedValue(undefined);

      await service.deleteShot('/test/project', 'shot_1000_0');

      expect(mockElectronAPI.fs.writeFile).toHaveBeenCalled();
    });
  });

  describe('addShotsToStoryboard', () => {
    it('should add shots with correct positions', async () => {
      const existingShot: Shot = {
        id: 'shot_1000_0',
        title: 'Existing Shot',
        description: '',
        duration: 3.0,
        position: 0,
        audioTracks: [],
        effects: [],
        textLayers: [],
        animations: [],
      };
      mockProjectData.storyboard = [existingShot];
      mockElectronAPI.fs.readFile.mockResolvedValue(createBufferMock(mockProjectData));
      mockElectronAPI.fs.writeFile.mockResolvedValue(undefined);

      const newShots: Shot[] = [
        {
          id: 'shot_2000_0',
          title: 'New Shot 1',
          description: '',
          duration: 4.0,
          position: 0,
          audioTracks: [],
          effects: [],
          textLayers: [],
          animations: [],
        },
      ];

      await service.addShotsToStoryboard('/test/project', newShots);

      expect(mockElectronAPI.fs.writeFile).toHaveBeenCalled();
    });
  });

  describe('reorderShots', () => {
    it('should reorder shots correctly', async () => {
      const shots: Shot[] = [
        {
          id: 'shot_1000_0',
          title: 'Shot 1',
          description: '',
          duration: 3.0,
          position: 0,
          audioTracks: [],
          effects: [],
          textLayers: [],
          animations: [],
        },
        {
          id: 'shot_1001_1',
          title: 'Shot 2',
          description: '',
          duration: 4.0,
          position: 1,
          audioTracks: [],
          effects: [],
          textLayers: [],
          animations: [],
        },
      ];
      mockProjectData.storyboard = shots;
      mockElectronAPI.fs.readFile.mockResolvedValue(createBufferMock(mockProjectData));
      mockElectronAPI.fs.writeFile.mockResolvedValue(undefined);

      await service.reorderShots('/test/project', ['shot_1001_1', 'shot_1000_0']);

      expect(mockElectronAPI.fs.writeFile).toHaveBeenCalled();
    });

    it('should throw error if shot IDs are missing', async () => {
      const shots: Shot[] = [
        {
          id: 'shot_1000_0',
          title: 'Shot 1',
          description: '',
          duration: 3.0,
          position: 0,
          audioTracks: [],
          effects: [],
          textLayers: [],
          animations: [],
        },
      ];
      mockProjectData.storyboard = shots;
      mockElectronAPI.fs.readFile.mockResolvedValue(createBufferMock(mockProjectData));

      await expect(service.reorderShots('/test/project', ['shot_1000_0', 'nonexistent'])).rejects.toThrow('Shot IDs not found');
    });
  });

  describe('validateProjectData', () => {
    it('should validate correct project data', () => {
      const result = service.validateProjectData(mockProjectData);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing schema_version', () => {
      const invalidData = { ...mockProjectData, schema_version: undefined };

      const result = service.validateProjectData(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: schema_version');
    });

    it('should detect missing project_name', () => {
      const invalidData = { ...mockProjectData, project_name: undefined };

      const result = service.validateProjectData(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: project_name');
    });
  });

  describe('migrateToDataContractV1', () => {
    it('should migrate legacy project with shots field', () => {
      const legacyData = {
        name: 'Legacy Project',
        shots: [{ id: 'shot1', title: 'Shot 1' }],
        assets: [],
      };

      const result = service.migrateToDataContractV1(legacyData);

      expect(result.schema_version).toBe('1.0');
      expect(result.project_name).toBe('Legacy Project');
      expect(result.storyboard).toEqual(legacyData.shots);
    });

    it('should set default values for missing fields', () => {
      const legacyData = {
        name: 'Minimal Project',
      };

      const result = service.migrateToDataContractV1(legacyData);

      expect(result.capabilities.grid_generation).toBe(false);
      expect(result.generation_status.grid).toBe('pending');
      expect(result.storyboard).toEqual([]);
      expect(result.assets).toEqual([]);
    });
  });

  describe('updateCapabilities', () => {
    it('should update project capabilities', async () => {
      mockElectronAPI.fs.readFile.mockResolvedValue(createBufferMock(mockProjectData));
      mockElectronAPI.fs.writeFile.mockResolvedValue(undefined);

      await service.updateCapabilities('/test/project', { wizard_generation: true });

      expect(mockElectronAPI.fs.writeFile).toHaveBeenCalled();
    });
  });

  describe('updateGenerationStatus', () => {
    it('should update generation status', async () => {
      mockElectronAPI.fs.readFile.mockResolvedValue(createBufferMock(mockProjectData));
      mockElectronAPI.fs.writeFile.mockResolvedValue(undefined);

      await service.updateGenerationStatus('/test/project', { wizard: 'done' });

      expect(mockElectronAPI.fs.writeFile).toHaveBeenCalled();
    });
  });

  describe('getCapabilities', () => {
    it('should return project capabilities', async () => {
      mockElectronAPI.fs.readFile.mockResolvedValue(createBufferMock(mockProjectData));

      const result = await service.getCapabilities('/test/project');

      expect(result).toEqual(mockProjectData.capabilities);
    });
  });

  describe('getGenerationStatus', () => {
    it('should return generation status', async () => {
      mockElectronAPI.fs.readFile.mockResolvedValue(createBufferMock(mockProjectData));

      const result = await service.getGenerationStatus('/test/project');

      expect(result).toEqual(mockProjectData.generation_status);
    });
  });

  describe('updateGlobalResume', () => {
    it('should update global resume', async () => {
      mockElectronAPI.fs.readFile.mockResolvedValue(createBufferMock(mockProjectData));
      mockElectronAPI.fs.writeFile.mockResolvedValue(undefined);

      await service.updateGlobalResume('/test/project', 'This is a test resume');

      expect(mockElectronAPI.fs.writeFile).toHaveBeenCalled();
    });

    it('should handle empty resume', async () => {
      mockElectronAPI.fs.readFile.mockResolvedValue(createBufferMock(mockProjectData));
      mockElectronAPI.fs.writeFile.mockResolvedValue(undefined);

      await service.updateGlobalResume('/test/project', '');

      expect(mockElectronAPI.fs.writeFile).toHaveBeenCalled();
    });
  });

  describe('getGlobalResume', () => {
    it('should return global resume', async () => {
      const projectDataWithResume = {
        ...mockProjectData,
        global_resume: 'Test resume content',
      };
      mockElectronAPI.fs.readFile.mockResolvedValue(createBufferMock(projectDataWithResume));

      const result = await service.getGlobalResume('/test/project');

      expect(result).toBe('Test resume content');
    });

    it('should return undefined if no global resume exists', async () => {
      mockElectronAPI.fs.readFile.mockResolvedValue(createBufferMock(mockProjectData));

      const result = await service.getGlobalResume('/test/project');

      expect(result).toBeUndefined();
    });
  });
});
