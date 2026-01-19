/**
 * Tests for ConfigStorage
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConfigStorage, AppConfig } from './ConfigStorage';

describe('ConfigStorage', () => {
  let tempDir: string;
  let configFilePath: string;
  let storage: ConfigStorage;

  beforeEach(() => {
    // Create temporary directory for tests with unique name
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `config-storage-test-${Date.now()}-`));
    configFilePath = path.join(tempDir, 'config.json');
    storage = new ConfigStorage(configFilePath);
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('initialization', () => {
    it('should create default configuration when no file exists', () => {
      const config = storage.getConfig();

      expect(config.version).toBe('1.0.0');
      expect(config.window).toBeDefined();
      expect(config.server).toBeDefined();
      expect(config.recentProjects).toBeDefined();
      expect(config.ui).toBeDefined();
    });

    it('should create configuration file on initialization', () => {
      expect(fs.existsSync(configFilePath)).toBe(true);
    });

    it('should load existing configuration', () => {
      // Create config file
      const customConfig: AppConfig = {
        version: '1.0.0',
        window: {
          width: 1600,
          height: 900,
        },
      };
      fs.writeFileSync(configFilePath, JSON.stringify(customConfig), 'utf-8');

      // Create new storage
      const newStorage = new ConfigStorage(configFilePath);
      const config = newStorage.getConfig();

      expect(config.window?.width).toBe(1600);
      expect(config.window?.height).toBe(900);
    });

    it('should merge loaded config with defaults', () => {
      // Create partial config file
      const partialConfig = {
        version: '1.0.0',
        window: {
          width: 1600,
        },
      };
      fs.writeFileSync(configFilePath, JSON.stringify(partialConfig), 'utf-8');

      // Create new storage
      const newStorage = new ConfigStorage(configFilePath);
      const config = newStorage.getConfig();

      // Custom value
      expect(config.window?.width).toBe(1600);
      // Default values
      expect(config.window?.height).toBe(800);
      expect(config.server).toBeDefined();
    });

    it('should handle corrupted config file gracefully', () => {
      // Create corrupted config file
      fs.writeFileSync(configFilePath, 'invalid json', 'utf-8');

      // Create new storage
      const newStorage = new ConfigStorage(configFilePath);

      expect(newStorage.isInMemoryMode()).toBe(true);
      expect(newStorage.getConfig().version).toBe('1.0.0');
    });

    it('should handle invalid config structure gracefully', () => {
      // Create invalid config file
      const invalidConfig = {
        version: '1.0.0',
        window: 'not an object', // Invalid
      };
      fs.writeFileSync(configFilePath, JSON.stringify(invalidConfig), 'utf-8');

      // Create new storage
      const newStorage = new ConfigStorage(configFilePath);
      const config = newStorage.getConfig();

      // Should use defaults
      expect(config.window).toEqual({
        width: 1200,
        height: 800,
        maximized: false,
      });
    });
  });

  describe('getConfig', () => {
    it('should return a copy of the configuration', () => {
      const config1 = storage.getConfig();
      const config2 = storage.getConfig();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Different object instances
    });

    it('should return complete configuration', () => {
      const config = storage.getConfig();

      expect(config.version).toBeDefined();
      expect(config.window).toBeDefined();
      expect(config.server).toBeDefined();
      expect(config.recentProjects).toBeDefined();
      expect(config.ui).toBeDefined();
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      storage.updateConfig({
        window: {
          width: 1600,
          height: 900,
        },
      });

      const config = storage.getConfig();
      expect(config.window?.width).toBe(1600);
      expect(config.window?.height).toBe(900);
    });

    it('should merge updates with existing config', () => {
      storage.updateConfig({
        window: {
          width: 1600,
        },
      });

      const config = storage.getConfig();
      expect(config.window?.width).toBe(1600);
      expect(config.window?.height).toBe(800); // Default value preserved
    });

    it('should persist updates to storage', () => {
      storage.updateConfig({
        window: {
          width: 1600,
        },
      });

      // Load from file
      const data = JSON.parse(fs.readFileSync(configFilePath, 'utf-8'));
      expect(data.window.width).toBe(1600);
    });

    it('should handle nested updates', () => {
      storage.updateConfig({
        ui: {
          theme: 'dark',
        },
      });

      const config = storage.getConfig();
      expect(config.ui?.theme).toBe('dark');
      expect(config.ui?.language).toBe('en'); // Default preserved
    });
  });

  describe('get', () => {
    beforeEach(() => {
      storage.updateConfig({
        window: {
          width: 1600,
          height: 900,
        },
        ui: {
          theme: 'dark',
        },
      });
    });

    it('should get top-level value', () => {
      expect(storage.get('version')).toBe('1.0.0');
    });

    it('should get nested value', () => {
      expect(storage.get('window.width')).toBe(1600);
      expect(storage.get('ui.theme')).toBe('dark');
    });

    it('should return undefined for non-existent key', () => {
      expect(storage.get('nonexistent')).toBeUndefined();
      expect(storage.get('window.nonexistent')).toBeUndefined();
    });

    it('should handle deep nesting', () => {
      expect(storage.get('window.width')).toBe(1600);
    });
  });

  describe('set', () => {
    it('should set top-level value', () => {
      storage.set('version', '2.0.0');
      expect(storage.get('version')).toBe('2.0.0');
    });

    it('should set nested value', () => {
      storage.set('window.width', 1920);
      expect(storage.get('window.width')).toBe(1920);
    });

    it('should create nested structure if not exists', () => {
      storage.set('custom.nested.value', 'test');
      expect(storage.get('custom.nested.value')).toBe('test');
    });

    it('should persist changes to storage', () => {
      storage.set('window.width', 1920);

      // Load from file
      const data = JSON.parse(fs.readFileSync(configFilePath, 'utf-8'));
      expect(data.window.width).toBe(1920);
    });

    it('should handle empty key gracefully', () => {
      expect(() => storage.set('', 'value')).not.toThrow();
    });
  });

  describe('reset', () => {
    beforeEach(() => {
      storage.updateConfig({
        window: {
          width: 1600,
          height: 900,
        },
      });
    });

    it('should reset configuration to defaults', () => {
      storage.reset();

      const config = storage.getConfig();
      expect(config.window?.width).toBe(1200);
      expect(config.window?.height).toBe(800);
    });

    it('should persist reset to storage', () => {
      storage.reset();

      // Load from file
      const data = JSON.parse(fs.readFileSync(configFilePath, 'utf-8'));
      expect(data.window.width).toBe(1200);
    });
  });

  describe('in-memory mode', () => {
    it('should not be in memory mode by default', () => {
      expect(storage.isInMemoryMode()).toBe(false);
    });

    it('should switch to memory mode on load failure', () => {
      // Create corrupted config file
      fs.writeFileSync(configFilePath, 'invalid json', 'utf-8');

      // Create new storage
      const newStorage = new ConfigStorage(configFilePath);

      expect(newStorage.isInMemoryMode()).toBe(true);
    });

    it('should switch to memory mode on save failure', () => {
      // Skip on Windows as chmod doesn't work the same way
      if (process.platform === 'win32') {
        expect(true).toBe(true);
        return;
      }

      // Make directory read-only
      fs.chmodSync(tempDir, 0o444);

      // Try to update config
      storage.updateConfig({
        window: {
          width: 1600,
        },
      });

      expect(storage.isInMemoryMode()).toBe(true);

      // Restore permissions for cleanup
      fs.chmodSync(tempDir, 0o755);
    });

    it('should not attempt to save in memory mode', () => {
      // Create corrupted config file
      fs.writeFileSync(configFilePath, 'invalid json', 'utf-8');

      // Create new storage (will be in memory mode)
      const newStorage = new ConfigStorage(configFilePath);

      // Update config
      newStorage.updateConfig({
        window: {
          width: 1600,
        },
      });

      // File should still be corrupted (no save attempted)
      const fileContent = fs.readFileSync(configFilePath, 'utf-8');
      expect(fileContent).toBe('invalid json');
    });

    it('should still work in memory mode', () => {
      // Create corrupted config file
      fs.writeFileSync(configFilePath, 'invalid json', 'utf-8');

      // Create new storage (will be in memory mode)
      const newStorage = new ConfigStorage(configFilePath);

      // Should still be able to get and set values
      newStorage.set('window.width', 1600);
      expect(newStorage.get('window.width')).toBe(1600);
    });
  });

  describe('getConfigFilePath', () => {
    it('should return the configuration file path', () => {
      expect(storage.getConfigFilePath()).toBe(configFilePath);
    });
  });

  describe('persistence', () => {
    it('should create config directory if it does not exist', () => {
      const nestedPath = path.join(tempDir, 'nested', 'dir', 'config.json');
      const nestedStorage = new ConfigStorage(nestedPath);

      expect(fs.existsSync(nestedPath)).toBe(true);
    });

    it('should reload configuration after restart', () => {
      storage.updateConfig({
        window: {
          width: 1600,
          height: 900,
        },
      });

      // Create new storage with same path
      const newStorage = new ConfigStorage(configFilePath);
      const config = newStorage.getConfig();

      expect(config.window?.width).toBe(1600);
      expect(config.window?.height).toBe(900);
    });

    it('should preserve all configuration sections', () => {
      storage.updateConfig({
        window: {
          width: 1600,
        },
        server: {
          port: 3000,
        },
        ui: {
          theme: 'dark',
        },
      });

      // Create new storage with same path
      const newStorage = new ConfigStorage(configFilePath);
      const config = newStorage.getConfig();

      expect(config.window?.width).toBe(1600);
      expect(config.server?.port).toBe(3000);
      expect(config.ui?.theme).toBe('dark');
    });
  });

  describe('validation', () => {
    it('should reject config without version', () => {
      const invalidConfig = {
        window: {
          width: 1600,
        },
      };
      fs.writeFileSync(configFilePath, JSON.stringify(invalidConfig), 'utf-8');

      const newStorage = new ConfigStorage(configFilePath);
      const config = newStorage.getConfig();

      // Should use defaults
      expect(config.version).toBe('1.0.0');
      expect(config.window?.width).toBe(1200);
    });

    it('should reject config with invalid window type', () => {
      const invalidConfig = {
        version: '1.0.0',
        window: 'not an object',
      };
      fs.writeFileSync(configFilePath, JSON.stringify(invalidConfig), 'utf-8');

      const newStorage = new ConfigStorage(configFilePath);
      const config = newStorage.getConfig();

      // Should use defaults
      expect(config.window).toEqual({
        width: 1200,
        height: 800,
        maximized: false,
      });
    });

    it('should reject config with invalid window.width type', () => {
      const invalidConfig = {
        version: '1.0.0',
        window: {
          width: 'not a number',
        },
      };
      fs.writeFileSync(configFilePath, JSON.stringify(invalidConfig), 'utf-8');

      const newStorage = new ConfigStorage(configFilePath);
      const config = newStorage.getConfig();

      // Should use defaults
      expect(config.window?.width).toBe(1200);
    });

    it('should reject config with invalid server.port type', () => {
      const invalidConfig = {
        version: '1.0.0',
        server: {
          port: 'not a number',
        },
      };
      fs.writeFileSync(configFilePath, JSON.stringify(invalidConfig), 'utf-8');

      const newStorage = new ConfigStorage(configFilePath);
      const config = newStorage.getConfig();

      // Should use defaults
      expect(config.server?.port).toBe(5173);
    });

    it('should accept valid configuration', () => {
      const validConfig: AppConfig = {
        version: '1.0.0',
        window: {
          width: 1600,
          height: 900,
          x: 100,
          y: 100,
          maximized: false,
        },
        server: {
          port: 3000,
          autoStart: true,
        },
        recentProjects: {
          maxCount: 5,
          autoCleanup: false,
        },
        ui: {
          theme: 'dark',
          language: 'fr',
        },
      };
      fs.writeFileSync(configFilePath, JSON.stringify(validConfig), 'utf-8');

      const newStorage = new ConfigStorage(configFilePath);
      const config = newStorage.getConfig();

      expect(config.window?.width).toBe(1600);
      expect(config.server?.port).toBe(3000);
      expect(config.ui?.theme).toBe('dark');
    });
  });
});
