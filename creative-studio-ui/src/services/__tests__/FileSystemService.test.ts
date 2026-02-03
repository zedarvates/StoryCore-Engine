/**
 * Tests unitaires pour FileSystemService
 */

import { fileSystemService } from '../FileSystemService';
import { promises as fs } from 'fs';
import path from 'path';

// Configuration des tests
test('FileSystemService should be a singleton', () => {
  const instance1 = fileSystemService;
  const instance2 = fileSystemService;
  expect(instance1).toBe(instance2);
});

describe('FileSystemService - readConfigFile', () => {
  const testFile = 'test-config.json';
  const testConfig = {
    'test-addon': {
      enabled: true,
      settings: { key: 'value' }
    }
  };

  beforeEach(async () => {
    // Créer un fichier de test valide
    const fullConfig = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      addons: testConfig
    };
    await fs.writeFile(testFile, JSON.stringify(fullConfig, null, 2), 'utf-8');
  });

  afterEach(async () => {
    // Nettoyer le fichier de test
    try {
      await fs.unlink(testFile);
    } catch {}
  });

  it('should read and parse a valid config file', async () => {
    const result = await fileSystemService.readConfigFile(testFile);
    expect(result).toEqual(testConfig);
  });

  it('should return empty object for non-existent file', async () => {
    const result = await fileSystemService.readConfigFile('non-existent.json');
    expect(result).toEqual({});
  });

  it('should throw error for invalid JSON format', async () => {
    // Créer un fichier avec du JSON invalide
    await fs.writeFile(testFile, 'invalid json content', 'utf-8');
    
    await expect(fileSystemService.readConfigFile(testFile))
      .rejects
      .toThrow('Format JSON invalide');
  });

  it('should throw error for missing addons property', async () => {
    // Créer un fichier sans la propriété addons
    const invalidConfig = {
      version: '1.0',
      timestamp: new Date().toISOString()
    };
    await fs.writeFile(testFile, JSON.stringify(invalidConfig), 'utf-8');
    
    await expect(fileSystemService.readConfigFile(testFile))
      .rejects
      .toThrow('Format de configuration invalide');
  });
});

describe('FileSystemService - writeConfigFile', () => {
  const testFile = 'test-write-config.json';
  const testConfig = {
    'addon1': {
      enabled: true,
      settings: { option: 'value' }
    },
    'addon2': {
      enabled: false,
      settings: { option: 'another-value' }
    }
  };

  afterEach(async () => {
    // Nettoyer le fichier de test
    try {
      await fs.unlink(testFile);
    } catch {}
  });

  it('should write config file with proper structure', async () => {
    await fileSystemService.writeConfigFile(testFile, testConfig);
    
    // Vérifier que le fichier existe
    const exists = await fs.access(testFile)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
    
    // Vérifier le contenu
    const content = await fs.readFile(testFile, 'utf-8');
    const parsed = JSON.parse(content);
    
    expect(parsed.version).toBe('1.0');
    expect(parsed.timestamp).toBeDefined();
    expect(parsed.addons).toEqual(testConfig);
  });

  it('should create directory if it does not exist', async () => {
    const nestedPath = 'nested/dir/config.json';
    
    await fileSystemService.writeConfigFile(nestedPath, testConfig);
    
    // Vérifier que le fichier existe
    const exists = await fs.access(nestedPath)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
    
    // Nettoyer
    try {
      await fs.unlink(nestedPath);
      await fs.rmdir(path.dirname(nestedPath));
    } catch {}
  });

  it('should throw error if file write fails', async () => {
    // Essayer d'écrire dans un répertoire système protégé
    const invalidPath = '/root/protected/config.json';
    
    await expect(fileSystemService.writeConfigFile(invalidPath, testConfig))
      .rejects
      .toThrow('Échec de l\'écriture du fichier');
  });
});

describe('FileSystemService - ensureDirectoryExists', () => {
  const testDir = 'test-directory';

  afterEach(async () => {
    // Nettoyer le répertoire de test
    try {
      await fs.rmdir(testDir);
    } catch {}
  });

  it('should create directory if it does not exist', async () => {
    // Vérifier que le répertoire n'existe pas
    const existsBefore = await fs.access(testDir)
      .then(() => true)
      .catch(() => false);
    expect(existsBefore).toBe(false);
    
    // Créer le répertoire
    await fileSystemService.ensureDirectoryExists(testDir);
    
    // Vérifier que le répertoire existe
    const existsAfter = await fs.access(testDir)
      .then(() => true)
      .catch(() => false);
    expect(existsAfter).toBe(true);
  });

  it('should not throw error if directory already exists', async () => {
    // Créer le répertoire d'abord
    await fs.mkdir(testDir);
    
    // Appeler la méthode ne devrait pas lancer d'erreur
    await expect(fileSystemService.ensureDirectoryExists(testDir))
      .resolves
      .not.toThrow();
  });
});

describe('FileSystemService - syncWithLocalStorage', () => {
  const testConfig = {
    'test-addon': {
      enabled: true,
      settings: { key: 'value' }
    }
  };

  beforeEach(() => {
    // Nettoyer localStorage
    localStorage.clear();
  });

  it('should save config to localStorage', async () => {
    await fileSystemService.syncWithLocalStorage(testConfig);
    
    const stored = localStorage.getItem('storycore_addon_config');
    expect(stored).toBeDefined();
    
    const parsed = JSON.parse(stored!);
    expect(parsed).toEqual(testConfig);
  });

  it('should throw error if localStorage fails', async () => {
    // Simuler une erreur de localStorage
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = () => {
      throw new Error('localStorage is full');
    };
    
    await expect(fileSystemService.syncWithLocalStorage(testConfig))
      .rejects
      .toThrow('Échec de la synchronisation avec localStorage');
    
    // Restaurer la méthode originale
    localStorage.setItem = originalSetItem;
  });
});

describe('FileSystemService - fileExists', () => {
  const testFile = 'test-exists.json';

  beforeEach(async () => {
    // Créer le fichier de test
    await fs.writeFile(testFile, '{}', 'utf-8');
  });

  afterEach(async () => {
    // Nettoyer le fichier de test
    try {
      await fs.unlink(testFile);
    } catch {}
  });

  it('should return true for existing file', async () => {
    const exists = await fileSystemService.fileExists(testFile);
    expect(exists).toBe(true);
  });

  it('should return false for non-existent file', async () => {
    const exists = await fileSystemService.fileExists('non-existent.json');
    expect(exists).toBe(false);
  });
});

describe('FileSystemService - deleteConfigFile', () => {
  const testFile = 'test-delete.json';

  beforeEach(async () => {
    // Créer le fichier de test
    await fs.writeFile(testFile, '{}', 'utf-8');
  });

  afterEach(async () => {
    // Nettoyer le fichier de test (au cas où le test échoue)
    try {
      await fs.unlink(testFile);
    } catch {}
  });

  it('should delete existing file', async () => {
    // Vérifier que le fichier existe
    const existsBefore = await fileSystemService.fileExists(testFile);
    expect(existsBefore).toBe(true);
    
    // Supprimer le fichier
    await fileSystemService.deleteConfigFile(testFile);
    
    // Vérifier que le fichier n'existe plus
    const existsAfter = await fileSystemService.fileExists(testFile);
    expect(existsAfter).toBe(false);
  });

  it('should throw error if file does not exist', async () => {
    await expect(fileSystemService.deleteConfigFile('non-existent.json'))
      .rejects
      .toThrow('Échec de la suppression du fichier');
  });
});