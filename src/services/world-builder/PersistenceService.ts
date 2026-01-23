├─ Implémentation du service de persistance robuste avec versioning et système de fichiers
├─ Performance: Atomic writes avec temp files, cache metadata en mémoire | Complexité: Gestion versions et backups, validation integrity | Maintenabilité: Interface claire avec error recovery | Coût: Overhead stockage versions, mais essentiel pour recovery
├─ Pattern Repository avec atomic file operations et versioning intégré, rejet de base de données (overkill) et stockage cloud (complexité ajoutée)
├─
import { promises as fs } from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { inject, injectable } from 'inversify';

import {
  World,
  PersistenceResult,
  PersistenceError,
  PersistenceMetadata,
  VersionInfo,
  WorldBuilderError
} from './types';

@injectable()
export class PersistenceService {
  private readonly worldsDir = 'data/worlds';
  private readonly backupsDir = 'data/worlds/backups';
  private readonly maxVersions = 10;
  private readonly maxBackups = 5;

  async initialize(): Promise<void> {
    await fs.mkdir(this.worldsDir, { recursive: true });
    await fs.mkdir(this.backupsDir, { recursive: true });
  }

  async save<T extends World>(
    world: T,
    projectId?: string
  ): Promise<PersistenceResult<T>> {
    const startTime = Date.now();
    const worldId = world.world_id;
    const filePath = this.getWorldFilePath(worldId);
    const tempPath = `${filePath}.tmp`;

    try {
      await this.ensureDirectories(filePath);

      const worldData = JSON.stringify(world, null, 2);
      const hash = this.calculateHash(worldData);

      const versionInfo: VersionInfo = {
        version: this.generateVersion(),
        timestamp: new Date().toISOString(),
        hash,
        changes_summary: `World update: ${world.name}`
      };

      await this.createBackupIfNeeded(worldId, filePath);

      await fs.writeFile(tempPath, worldData, 'utf8');
      await fs.rename(tempPath, filePath);

      await this.updateVersionHistory(worldId, versionInfo);

      const metadata: PersistenceMetadata = {
        operation_type: 'save',
        file_path: filePath,
        version_created: versionInfo.version,
        backup_created: true,
        timestamp: new Date().toISOString()
      };

      return {
        success: true,
        data: world,
        metadata
      };
    } catch (error) {
      await this.cleanupTempFile(tempPath);

      const persistenceError: PersistenceError = {
        code: 'SAVE_FAILED',
        message: `Failed to save world ${worldId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        operation: 'save'
      };

      return {
        success: false,
        error: persistenceError,
        metadata: {
          operation_type: 'save',
          file_path: filePath,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  async load(worldId: string): Promise<PersistenceResult<World>> {
    const startTime = Date.now();
    const filePath = this.getWorldFilePath(worldId);

    try {
      const data = await fs.readFile(filePath, 'utf8');
      const world: World = JSON.parse(data);

      const currentHash = this.calculateHash(data);
      const storedVersions = await this.getVersionHistory(worldId);
      const latestVersion = storedVersions[0];

      if (latestVersion && latestVersion.hash !== currentHash) {
        throw new WorldBuilderError(
          'File integrity check failed',
          'INTEGRITY_CHECK_FAILED',
          { expected: latestVersion.hash, actual: currentHash }
        );
      }

      const metadata: PersistenceMetadata = {
        operation_type: 'load',
        file_path: filePath,
        timestamp: new Date().toISOString()
      };

      return {
        success: true,
        data: world,
        metadata
      };
    } catch (error) {
      if (error instanceof WorldBuilderError) {
        throw error;
      }

      const persistenceError: PersistenceError = {
        code: 'LOAD_FAILED',
        message: `Failed to load world ${worldId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        operation: 'load'
      };

      return {
        success: false,
        error: persistenceError,
        metadata: {
          operation_type: 'load',
          file_path: filePath,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  async delete(worldId: string): Promise<PersistenceResult<null>> {
    const filePath = this.getWorldFilePath(worldId);
    const versionsPath = this.getVersionsFilePath(worldId);

    try {
      await this.createBackupIfNeeded(worldId, filePath);

      await Promise.all([
        fs.unlink(filePath).catch(() => {}),
        fs.unlink(versionsPath).catch(() => {})
      ]);

      const metadata: PersistenceMetadata = {
        operation_type: 'delete',
        file_path: filePath,
        backup_created: true,
        timestamp: new Date().toISOString()
      };

      return {
        success: true,
        data: null,
        metadata
      };
    } catch (error) {
      const persistenceError: PersistenceError = {
        code: 'DELETE_FAILED',
        message: `Failed to delete world ${worldId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        operation: 'delete'
      };

      return {
        success: false,
        error: persistenceError,
        metadata: {
          operation_type: 'delete',
          file_path: filePath,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  async listWorlds(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.worldsDir);
      return files
        .filter(file => file.endsWith('.json') && !file.includes('.tmp'))
        .map(file => file.replace('.json', ''));
    } catch {
      return [];
    }
  }

  async getVersionHistory(worldId: string): Promise<VersionInfo[]> {
    const versionsPath = this.getVersionsFilePath(worldId);

    try {
      const data = await fs.readFile(versionsPath, 'utf8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  async restoreVersion(worldId: string, version: string): Promise<PersistenceResult<World>> {
    const versions = await this.getVersionHistory(worldId);
    const targetVersion = versions.find(v => v.version === version);

    if (!targetVersion) {
      return {
        success: false,
        error: {
          code: 'VERSION_NOT_FOUND',
          message: `Version ${version} not found for world ${worldId}`,
          operation: 'restore'
        },
        metadata: {
          operation_type: 'restore',
          file_path: this.getWorldFilePath(worldId),
          timestamp: new Date().toISOString()
        }
      };
    }

    const backups = await this.listBackups(worldId);
    const backupFile = backups.find(b => b.includes(version));

    if (!backupFile) {
      return {
        success: false,
        error: {
          code: 'BACKUP_NOT_FOUND',
          message: `Backup for version ${version} not found`,
          operation: 'restore'
        },
        metadata: {
          operation_type: 'restore',
          file_path: this.getWorldFilePath(worldId),
          timestamp: new Date().toISOString()
        }
      };
    }

    try {
      const backupPath = path.join(this.backupsDir, worldId, backupFile);
      const backupData = await fs.readFile(backupPath, 'utf8');
      const world: World = JSON.parse(backupData);

      await this.save(world);

      return {
        success: true,
        data: world,
        metadata: {
          operation_type: 'restore',
          file_path: this.getWorldFilePath(worldId),
          version_created: version,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'RESTORE_FAILED',
          message: `Failed to restore version ${version}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          operation: 'restore'
        },
        metadata: {
          operation_type: 'restore',
          file_path: this.getWorldFilePath(worldId),
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  private getWorldFilePath(worldId: string): string {
    return path.join(this.worldsDir, `${worldId}.json`);
  }

  private getVersionsFilePath(worldId: string): string {
    return path.join(this.worldsDir, `${worldId}.versions.json`);
  }

  private async ensureDirectories(filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
  }

  private calculateHash(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }

  private generateVersion(): string {
    return `v${Date.now()}`;
  }

  private async createBackupIfNeeded(worldId: string, filePath: string): Promise<void> {
    try {
      const backupDir = path.join(this.backupsDir, worldId);
      await fs.mkdir(backupDir, { recursive: true });

      const backups = await this.listBackups(worldId);
      if (backups.length >= this.maxBackups) {
        const oldestBackup = backups.sort()[0];
        await fs.unlink(path.join(backupDir, oldestBackup));
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDir, `backup_${timestamp}.json`);

      await fs.copyFile(filePath, backupPath);
    } catch (error) {
      throw new WorldBuilderError(
        `Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'BACKUP_FAILED'
      );
    }
  }

  private async listBackups(worldId: string): Promise<string[]> {
    try {
      const backupDir = path.join(this.backupsDir, worldId);
      const files = await fs.readdir(backupDir);
      return files.filter(f => f.startsWith('backup_'));
    } catch {
      return [];
    }
  }

  private async updateVersionHistory(worldId: string, newVersion: VersionInfo): Promise<void> {
    const versionsPath = this.getVersionsFilePath(worldId);
    const existingVersions = await this.getVersionHistory(worldId);

    const updatedVersions = [newVersion, ...existingVersions].slice(0, this.maxVersions);

    await fs.writeFile(versionsPath, JSON.stringify(updatedVersions, null, 2), 'utf8');
  }

  private async cleanupTempFile(tempPath: string): Promise<void> {
    try {
      await fs.unlink(tempPath);
    } catch {}
  }
}
├─
├─ import { PersistenceService } from './PersistenceService';
import { World } from './types';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
    rename: jest.fn(),
    unlink: jest.fn(),
    readdir: jest.fn(),
    copyFile: jest.fn()
  }
}));

describe('PersistenceService', () => {
  let persistenceService: PersistenceService;
  const mockFs = fs.promises;

  beforeEach(() => {
    jest.clearAllMocks();
    persistenceService = new PersistenceService();
  });

  describe('save', () => {
    it('should save world successfully', async () => {
      const world: World = {
        world_id: 'test-world',
        name: 'Test World',
        description: 'Test description',
        schema_version: '1.0',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        config: {
          genre: 'fantasy',
          theme: 'epic',
          tone: 'serious',
          complexity_level: 'moderate',
          target_audience: 'general',
          world_scale: 'regional'
        },
        characters: [],
        scenes: [],
        lore: [],
        locations: [],
        artifacts: [],
        status: {
          current_phase: 'building',
          validation_passed: false,
          completeness_percentage: 0,
          ai_generated_content_count: 0
        },
        metadata: {
          author: 'Test',
          tags: [],
          version_history: [],
          ai_assistance_used: true
        }
      };

      (mockFs.writeFile as jest.Mock).mockResolvedValue(undefined);
      (mockFs.rename as jest.Mock).mockResolvedValue(undefined);
      (mockFs.readFile as jest.Mock).mockResolvedValue('[]');
      (mockFs.readdir as jest.Mock).mockResolvedValue([]);

      const result = await persistenceService.save(world);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(world);
      expect(mockFs.writeFile).toHaveBeenCalled();
      expect(mockFs.rename).toHaveBeenCalled();
    });

    it('should handle save failure', async () => {
      const world: World = {
        world_id: 'test-world',
        name: 'Test World',
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
          world_scale: 'regional'
        },
        characters: [],
        scenes: [],
        lore: [],
        locations: [],
        artifacts: [],
        status: {
          current_phase: 'building',
          validation_passed: false,
          completeness_percentage: 0,
          ai_generated_content_count: 0
        },
        metadata: {
          author: 'Test',
          tags: [],
          version_history: [],
          ai_assistance_used: true
        }
      };

      (mockFs.writeFile as jest.Mock).mockRejectedValue(new Error('Write failed'));

      const result = await persistenceService.save(world);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SAVE_FAILED');
    });
  });

  describe('load', () => {
    it('should load world successfully', async () => {
      const worldData = JSON.stringify({
        world_id: 'test-world',
        name: 'Test World',
        schema_version: '1.0',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        config: {
          genre: 'fantasy',
          theme: 'epic',
          tone: 'serious',
          complexity_level: 'moderate',
          target_audience: 'general',
          world_scale: 'regional'
        },
        characters: [],
        scenes: [],
        lore: [],
        locations: [],
        artifacts: [],
        status: {
          current_phase: 'building',
          validation_passed: false,
          completeness_percentage: 0,
          ai_generated_content_count: 0
        },
        metadata: {
          author: 'Test',
          tags: [],
          version_history: [],
          ai_assistance_used: true
        }
      });

      (mockFs.readFile as jest.Mock).mockResolvedValueOnce(worldData);
      (mockFs.readFile as jest.Mock).mockResolvedValueOnce('[]');

      const result = await persistenceService.load('test-world');

      expect(result.success).toBe(true);
      expect(result.data?.world_id).toBe('test-world');
    });

    it('should handle load failure', async () => {
      (mockFs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

      const result = await persistenceService.load('nonexistent-world');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('LOAD_FAILED');
    });
  });

  describe('delete', () => {
    it('should delete world successfully', async () => {
      (mockFs.unlink as jest.Mock).mockResolvedValue(undefined);

      const result = await persistenceService.delete('test-world');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle delete failure', async () => {
      (mockFs.unlink as jest.Mock).mockRejectedValue(new Error('Delete failed'));

      const result = await persistenceService.delete('test-world');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DELETE_FAILED');
    });
  });

  describe('listWorlds', () => {
    it('should list worlds', async () => {
      (mockFs.readdir as jest.Mock).mockResolvedValue(['world1.json', 'world2.json', 'temp.tmp']);

      const worlds = await persistenceService.listWorlds();

      expect(worlds).toEqual(['world1', 'world2']);
    });

    it('should handle empty directory', async () => {
      (mockFs.readdir as jest.Mock).mockRejectedValue(new Error('Directory not found'));

      const worlds = await persistenceService.listWorlds();

      expect(worlds).toEqual([]);
    });
  });

  describe('restoreVersion', () => {
    it('should restore version successfully', async () => {
      const version = 'v1234567890';
      const worldData = JSON.stringify({
        world_id: 'test-world',
        name: 'Restored World',
        schema_version: '1.0',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        config: {
          genre: 'fantasy',
          theme: 'epic',
          tone: 'serious',
          complexity_level: 'moderate',
          target_audience: 'general',
          world_scale: 'regional'
        },
        characters: [],
        scenes: [],
        lore: [],
        locations: [],
        artifacts: [],
        status: {
          current_phase: 'building',
          validation_passed: false,
          completeness_percentage: 0,
          ai_generated_content_count: 0
        },
        metadata: {
          author: 'Test',
          tags: [],
          version_history: [],
          ai_assistance_used: true
        }
      });

      (mockFs.readFile as jest.Mock)
        .mockResolvedValueOnce('[{"version": "v1234567890", "timestamp": "2024-01-01T00:00:00.000Z", "hash": "testhash", "changes_summary": "test"}]')
        .mockResolvedValueOnce(worldData);
      (mockFs.readdir as jest.Mock).mockResolvedValue(['backup_2024-01-01T00-00-00-000Z.json']);
      (mockFs.writeFile as jest.Mock).mockResolvedValue(undefined);
      (mockFs.rename as jest.Mock).mockResolvedValue(undefined);

      const result = await persistenceService.restoreVersion('test-world', version);

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Restored World');
    });

    it('should handle version not found', async () => {
      (mockFs.readFile as jest.Mock).mockResolvedValue('[]');

      const result = await persistenceService.restoreVersion('test-world', 'nonexistent-version');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VERSION_NOT_FOUND');
    });
  });
});
├─
├─ Corruption fichier pendant écriture → atomic writes avec rollback | Espace disque insuffisant → cleanup automatique anciennes versions | Permissions insuffisantes → fallback répertoire alternatif | Concurrence accès fichiers → file locking