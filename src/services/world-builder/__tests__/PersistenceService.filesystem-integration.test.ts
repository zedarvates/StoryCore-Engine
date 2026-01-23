import { PersistenceService } from '../PersistenceService';
import { World } from '../types';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
    rename: jest.fn(),
    unlink: jest.fn(),
    readdir: jest.fn(),
    copyFile: jest.fn(),
  },
}));

// Mock path module
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  dirname: jest.fn((p) => p.split('/').slice(0, -1).join('/')),
}));

describe('PersistenceService Filesystem Integration', () => {
  let persistenceService: PersistenceService;
  const mockFs = fs.promises;
  const mockPath = path as jest.Mocked<typeof path>;

  beforeEach(() => {
    jest.clearAllMocks();
    persistenceService = new PersistenceService();

    // Reset path mocks to default behavior
    mockPath.join.mockImplementation((...args) => args.join('/'));
    mockPath.dirname.mockImplementation((p) => p.split('/').slice(0, -1).join('/'));
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Save Operation with Filesystem Simulation', () => {
    const testWorld: World = {
      world_id: 'test-world-123',
      name: 'Test Fantasy World',
      description: 'A world for testing',
      schema_version: '1.0',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      config: {
        genre: 'fantasy',
        theme: 'epic',
        tone: 'serious',
        complexity_level: 'moderate',
        target_audience: 'general',
        world_scale: 'regional',
      },
      characters: [],
      scenes: [],
      locations: [],
      lore: [],
      artifacts: [],
      status: {
        current_phase: 'building',
        validation_passed: false,
        completeness_percentage: 0,
        ai_generated_content_count: 0,
      },
      metadata: {
        author: 'Test Author',
        tags: ['fantasy', 'epic'],
        version_history: [],
        ai_assistance_used: true,
      },
    };

    it('should successfully save world with atomic write pattern', async () => {
      (mockFs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (mockFs.writeFile as jest.Mock).mockResolvedValue(undefined);
      (mockFs.rename as jest.Mock).mockResolvedValue(undefined);
      (mockFs.readFile as jest.Mock).mockResolvedValue('[]');
      (mockFs.readdir as jest.Mock).mockResolvedValue([]);

      const result = await persistenceService.save(testWorld);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(testWorld);
      expect(result.metadata?.operation_type).toBe('save');

      // Verify atomic write pattern
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        'data/worlds/test-world-123.json.tmp',
        expect.any(String),
        'utf8'
      );
      expect(mockFs.rename).toHaveBeenCalledWith(
        'data/worlds/test-world-123.json.tmp',
        'data/worlds/test-world-123.json'
      );
    });

    it('should create backup before overwriting existing file', async () => {
      (mockFs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (mockFs.writeFile as jest.Mock).mockResolvedValue(undefined);
      (mockFs.rename as jest.Mock).mockResolvedValue(undefined);
      (mockFs.readFile as jest.Mock).mockResolvedValue('[]');
      (mockFs.readdir as jest.Mock).mockResolvedValue([]);
      (mockFs.copyFile as jest.Mock).mockResolvedValue(undefined);

      // First save to create existing file
      await persistenceService.save(testWorld);

      // Second save should create backup
      const updatedWorld = { ...testWorld, name: 'Updated World' };
      await persistenceService.save(updatedWorld);

      expect(mockFs.copyFile).toHaveBeenCalledWith(
        'data/worlds/test-world-123.json',
        expect.stringContaining('data/worlds/backups/test-world-123/backup_')
      );
    });

    it('should handle filesystem write failures with cleanup', async () => {
      (mockFs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (mockFs.writeFile as jest.Mock).mockRejectedValue(new Error('Disk full'));
      (mockFs.unlink as jest.Mock).mockResolvedValue(undefined);

      const result = await persistenceService.save(testWorld);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SAVE_FAILED');
      expect(result.error?.message).toContain('Disk full');

      // Verify temp file cleanup
      expect(mockFs.unlink).toHaveBeenCalledWith('data/worlds/test-world-123.json.tmp');
    });

    it('should update version history correctly', async () => {
      (mockFs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (mockFs.writeFile as jest.Mock).mockResolvedValue(undefined);
      (mockFs.rename as jest.Mock).mockResolvedValue(undefined);
      (mockFs.readFile as jest.Mock).mockResolvedValue('[]');
      (mockFs.readdir as jest.Mock).mockResolvedValue([]);

      await persistenceService.save(testWorld);

      // Verify version history file is written
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        'data/worlds/test-world-123.versions.json',
        expect.stringContaining('"version":'),
        'utf8'
      );
    });

    it('should limit version history to maximum allowed', async () => {
      // Mock existing version history with max entries
      const existingVersions = Array.from({ length: 10 }, (_, i) => ({
        version: `v${i}`,
        timestamp: new Date().toISOString(),
        hash: `hash${i}`,
        changes_summary: `Change ${i}`,
      }));

      (mockFs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (mockFs.writeFile as jest.Mock).mockResolvedValue(undefined);
      (mockFs.rename as jest.Mock).mockResolvedValue(undefined);
      (mockFs.readFile as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify(existingVersions)) // For version history
        .mockResolvedValueOnce('[]'); // For readdir
      (mockFs.readdir as jest.Mock).mockResolvedValue([]);

      await persistenceService.save(testWorld);

      const versionHistoryCall = (mockFs.writeFile as jest.Mock).mock.calls.find(
        call => call[0].includes('.versions.json')
      );

      const writtenVersions = JSON.parse(versionHistoryCall[1]);
      expect(writtenVersions).toHaveLength(10); // Should maintain max versions
    });
  });

  describe('Load Operation with Filesystem Simulation', () => {
    const testWorld: World = {
      world_id: 'load-test-456',
      name: 'Load Test World',
      description: 'Testing load functionality',
      schema_version: '1.0',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      config: {
        genre: 'sci-fi',
        theme: 'cyberpunk',
        tone: 'gritty',
        complexity_level: 'complex',
        target_audience: 'mature',
        world_scale: 'planetary',
      },
      characters: [],
      scenes: [],
      locations: [],
      lore: [],
      artifacts: [],
      status: {
        current_phase: 'complete',
        validation_passed: true,
        completeness_percentage: 100,
        ai_generated_content_count: 25,
      },
      metadata: {
        author: 'Load Tester',
        tags: ['sci-fi', 'cyberpunk'],
        version_history: [{
          version: '1.0',
          timestamp: '2024-01-01T00:00:00.000Z',
          changes: 'Initial creation',
          author: 'Load Tester',
        }],
        ai_assistance_used: true,
      },
    };

    it('should successfully load world with integrity check', async () => {
      const worldData = JSON.stringify(testWorld);
      const expectedHash = require('crypto').createHash('sha256').update(worldData).digest('hex');

      (mockFs.readFile as jest.Mock)
        .mockResolvedValueOnce(worldData) // World file
        .mockResolvedValueOnce(JSON.stringify([{ // Version history
          version: '1.0',
          timestamp: '2024-01-01T00:00:00.000Z',
          hash: expectedHash,
          changes_summary: 'Test',
        }]));

      const result = await persistenceService.load('load-test-456');

      expect(result.success).toBe(true);
      expect(result.data?.world_id).toBe('load-test-456');
      expect(result.data?.name).toBe('Load Test World');
      expect(result.metadata?.operation_type).toBe('load');
    });

    it('should detect and reject corrupted files', async () => {
      const worldData = JSON.stringify(testWorld);
      const wrongHash = 'wronghash123';

      (mockFs.readFile as jest.Mock)
        .mockResolvedValueOnce(worldData) // World file
        .mockResolvedValueOnce(JSON.stringify([{ // Version history with wrong hash
          version: '1.0',
          timestamp: '2024-01-01T00:00:00.000Z',
          hash: wrongHash,
          changes_summary: 'Test',
        }]));

      await expect(persistenceService.load('load-test-456'))
        .rejects.toThrow('File integrity check failed');
    });

    it('should handle missing files gracefully', async () => {
      (mockFs.readFile as jest.Mock).mockRejectedValue(new Error('ENOENT: no such file'));

      const result = await persistenceService.load('nonexistent-world');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('LOAD_FAILED');
      expect(result.error?.message).toContain('nonexistent-world');
    });

    it('should handle corrupted JSON files', async () => {
      (mockFs.readFile as jest.Mock).mockResolvedValue('{ invalid json');

      const result = await persistenceService.load('corrupted-world');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('LOAD_FAILED');
    });
  });

  describe('Delete Operation with Backup Creation', () => {
    it('should delete world and create backup', async () => {
      (mockFs.copyFile as jest.Mock).mockResolvedValue(undefined);
      (mockFs.unlink as jest.Mock).mockResolvedValue(undefined);
      (mockFs.readdir as jest.Mock).mockResolvedValue([]);

      const result = await persistenceService.delete('delete-test-789');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      expect(result.metadata?.backup_created).toBe(true);

      expect(mockFs.copyFile).toHaveBeenCalledWith(
        'data/worlds/delete-test-789.json',
        expect.any(String)
      );
      expect(mockFs.unlink).toHaveBeenCalledTimes(2); // World file and versions file
    });

    it('should handle delete failures gracefully', async () => {
      (mockFs.copyFile as jest.Mock).mockRejectedValue(new Error('Backup failed'));
      (mockFs.unlink as jest.Mock).mockRejectedValue(new Error('Delete failed'));

      const result = await persistenceService.delete('delete-fail-test');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DELETE_FAILED');
    });
  });

  describe('Version Management', () => {
    it('should restore specific version correctly', async () => {
      const versionToRestore = 'v1234567890';
      const backupWorld: World = {
        world_id: 'restore-test',
        name: 'Restored World',
        description: 'World from backup',
        schema_version: '1.0',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        config: {
          genre: 'fantasy',
          theme: 'epic',
          tone: 'serious',
          complexity_level: 'moderate',
          target_audience: 'general',
          world_scale: 'regional',
        },
        characters: [],
        scenes: [],
        locations: [],
        lore: [],
        artifacts: [],
        status: {
          current_phase: 'building',
          validation_passed: false,
          completeness_percentage: 0,
          ai_generated_content_count: 0,
        },
        metadata: {
          author: 'Restore Test',
          tags: [],
          version_history: [],
          ai_assistance_used: true,
        },
      };

      (mockFs.readFile as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify([{ // Version history
          version: versionToRestore,
          timestamp: '2024-01-01T00:00:00.000Z',
          hash: 'test',
          changes_summary: 'Test version',
        }]))
        .mockResolvedValueOnce(JSON.stringify(backupWorld)); // Backup file
      (mockFs.readdir as jest.Mock).mockResolvedValue(['backup_2024-01-01T00-00-00-000Z.json']);
      (mockFs.writeFile as jest.Mock).mockResolvedValue(undefined);
      (mockFs.rename as jest.Mock).mockResolvedValue(undefined);

      // Mock the save method call within restoreVersion
      const saveSpy = jest.spyOn(persistenceService, 'save').mockResolvedValue({
        success: true,
        data: backupWorld,
        metadata: {
          operation_type: 'save',
          file_path: 'data/worlds/restore-test.json',
          version_created: versionToRestore,
          backup_created: false,
          timestamp: new Date().toISOString(),
        },
      });

      const result = await persistenceService.restoreVersion('restore-test', versionToRestore);

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Restored World');
      expect(saveSpy).toHaveBeenCalledWith(backupWorld);
    });

    it('should handle missing backup files', async () => {
      (mockFs.readFile as jest.Mock).mockResolvedValue(JSON.stringify([{
        version: 'v123',
        timestamp: '2024-01-01T00:00:00.000Z',
        hash: 'test',
        changes_summary: 'Test',
      }]));
      (mockFs.readdir as jest.Mock).mockResolvedValue(['other_backup.json']);

      const result = await persistenceService.restoreVersion('test-world', 'v123');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('BACKUP_NOT_FOUND');
    });
  });

  describe('List and Discovery Operations', () => {
    it('should list all worlds correctly', async () => {
      (mockFs.readdir as jest.Mock).mockResolvedValue([
        'world1.json',
        'world2.json',
        'world3.json',
        'temp.tmp',
        'invalid.txt',
      ]);

      const worlds = await persistenceService.listWorlds();

      expect(worlds).toEqual(['world1', 'world2', 'world3']);
      expect(worlds).not.toContain('temp'); // Should filter temp files
      expect(worlds).not.toContain('invalid'); // Should filter non-json files
    });

    it('should handle empty directories', async () => {
      (mockFs.readdir as jest.Mock).mockResolvedValue([]);

      const worlds = await persistenceService.listWorlds();

      expect(worlds).toEqual([]);
    });

    it('should handle directory access errors', async () => {
      (mockFs.readdir as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      const worlds = await persistenceService.listWorlds();

      expect(worlds).toEqual([]);
    });
  });

  describe('Directory and Path Management', () => {
    it('should create necessary directories', async () => {
      (mockFs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (mockFs.writeFile as jest.Mock).mockResolvedValue(undefined);
      (mockFs.rename as jest.Mock).mockResolvedValue(undefined);
      (mockFs.readFile as jest.Mock).mockResolvedValue('[]');
      (mockFs.readdir as jest.Mock).mockResolvedValue([]);

      await persistenceService.save({
        world_id: 'dir-test',
        name: 'Directory Test',
        description: 'Test',
        schema_version: '1.0',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        config: {
          genre: 'fantasy',
          theme: 'epic',
          tone: 'serious',
          complexity_level: 'moderate',
          target_audience: 'general',
          world_scale: 'regional',
        },
        characters: [],
        scenes: [],
        locations: [],
        lore: [],
        artifacts: [],
        status: {
          current_phase: 'building',
          validation_passed: false,
          completeness_percentage: 0,
          ai_generated_content_count: 0,
        },
        metadata: {
          author: 'Test',
          tags: [],
          version_history: [],
          ai_assistance_used: true,
        },
      });

      expect(mockFs.mkdir).toHaveBeenCalledWith('data/worlds', { recursive: true });
      expect(mockFs.mkdir).toHaveBeenCalledWith('data/worlds/backups/dir-test', { recursive: true });
    });

    it('should handle path construction correctly', () => {
      const worldId = 'path-test-123';

      // Verify path construction calls
      expect(mockPath.join).toHaveBeenCalledWith('data/worlds', `${worldId}.json`);
      expect(mockPath.join).toHaveBeenCalledWith('data/worlds', `${worldId}.versions.json`);
    });
  });

  describe('Backup Rotation and Cleanup', () => {
    it('should rotate backups when limit exceeded', async () => {
      const existingBackups = Array.from({ length: 6 }, (_, i) =>
        `backup_${new Date(Date.now() - i * 86400000).toISOString().replace(/[:.]/g, '-')}.json`
      );

      (mockFs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (mockFs.writeFile as jest.Mock).mockResolvedValue(undefined);
      (mockFs.rename as jest.Mock).mockResolvedValue(undefined);
      (mockFs.readFile as jest.Mock).mockResolvedValue('[]');
      (mockFs.readdir as jest.Mock).mockResolvedValue(existingBackups);
      (mockFs.unlink as jest.Mock).mockResolvedValue(undefined);

      const testWorld: World = {
        world_id: 'backup-test',
        name: 'Backup Test World',
        description: 'Test',
        schema_version: '1.0',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        config: {
          genre: 'fantasy',
          theme: 'epic',
          tone: 'serious',
          complexity_level: 'moderate',
          target_audience: 'general',
          world_scale: 'regional',
        },
        characters: [],
        scenes: [],
        locations: [],
        lore: [],
        artifacts: [],
        status: {
          current_phase: 'building',
          validation_passed: false,
          completeness_percentage: 0,
          ai_generated_content_count: 0,
        },
        metadata: {
          author: 'Test',
          tags: [],
          version_history: [],
          ai_assistance_used: true,
        },
      };

      await persistenceService.save(testWorld);

      // Should have deleted the oldest backup
      expect(mockFs.unlink).toHaveBeenCalledWith(
        expect.stringContaining(existingBackups[5]) // Oldest backup
      );
    });

    it('should handle backup creation failures', async () => {
      (mockFs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (mockFs.writeFile as jest.Mock).mockResolvedValue(undefined);
      (mockFs.rename as jest.Mock).mockResolvedValue(undefined);
      (mockFs.readFile as jest.Mock).mockResolvedValue('[]');
      (mockFs.readdir as jest.Mock).mockRejectedValue(new Error('Backup dir access failed'));

      const testWorld: World = {
        world_id: 'backup-fail-test',
        name: 'Backup Fail Test',
        description: 'Test',
        schema_version: '1.0',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        config: {
          genre: 'fantasy',
          theme: 'epic',
          tone: 'serious',
          complexity_level: 'moderate',
          target_audience: 'general',
          world_scale: 'regional',
        },
        characters: [],
        scenes: [],
        locations: [],
        lore: [],
        artifacts: [],
        status: {
          current_phase: 'building',
          validation_passed: false,
          completeness_percentage: 0,
          ai_generated_content_count: 0,
        },
        metadata: {
          author: 'Test',
          tags: [],
          version_history: [],
          ai_assistance_used: true,
        },
      };

      // Should still succeed even if backup fails
      await expect(persistenceService.save(testWorld)).resolves.toHaveProperty('success', true);
    });
  });

  describe('Concurrent Operations Simulation', () => {
    it('should handle multiple save operations concurrently', async () => {
      (mockFs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (mockFs.writeFile as jest.Mock).mockResolvedValue(undefined);
      (mockFs.rename as jest.Mock).mockResolvedValue(undefined);
      (mockFs.readFile as jest.Mock).mockResolvedValue('[]');
      (mockFs.readdir as jest.Mock).mockResolvedValue([]);

      const world1: World = {
        world_id: 'concurrent-1',
        name: 'Concurrent World 1',
        description: 'Test',
        schema_version: '1.0',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        config: {
          genre: 'fantasy',
          theme: 'epic',
          tone: 'serious',
          complexity_level: 'moderate',
          target_audience: 'general',
          world_scale: 'regional',
        },
        characters: [],
        scenes: [],
        locations: [],
        lore: [],
        artifacts: [],
        status: {
          current_phase: 'building',
          validation_passed: false,
          completeness_percentage: 0,
          ai_generated_content_count: 0,
        },
        metadata: {
          author: 'Test',
          tags: [],
          version_history: [],
          ai_assistance_used: true,
        },
      };

      const world2: World = { ...world1, world_id: 'concurrent-2', name: 'Concurrent World 2' };

      // Execute concurrent saves
      const [result1, result2] = await Promise.all([
        persistenceService.save(world1),
        persistenceService.save(world2),
      ]);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.data?.world_id).not.toBe(result2.data?.world_id);
    });

    it('should handle read operations during writes', async () => {
      const testWorld: World = {
        world_id: 'read-during-write',
        name: 'Read During Write Test',
        description: 'Test',
        schema_version: '1.0',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        config: {
          genre: 'fantasy',
          theme: 'epic',
          tone: 'serious',
          complexity_level: 'moderate',
          target_audience: 'general',
          world_scale: 'regional',
        },
        characters: [],
        scenes: [],
        locations: [],
        lore: [],
        artifacts: [],
        status: {
          current_phase: 'building',
          validation_passed: false,
          completeness_percentage: 0,
          ai_generated_content_count: 0,
        },
        metadata: {
          author: 'Test',
          tags: [],
          version_history: [],
          ai_assistance_used: true,
        },
      };

      (mockFs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (mockFs.writeFile as jest.Mock).mockResolvedValue(undefined);
      (mockFs.rename as jest.Mock).mockResolvedValue(undefined);
      (mockFs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(testWorld));
      (mockFs.readdir as jest.Mock).mockResolvedValue([]);

      // Save and load simultaneously
      const savePromise = persistenceService.save(testWorld);
      const loadPromise = persistenceService.load('read-during-write');

      const [saveResult, loadResult] = await Promise.all([savePromise, loadPromise]);

      expect(saveResult.success).toBe(true);
      expect(loadResult.success).toBe(true);
    });
  });
});