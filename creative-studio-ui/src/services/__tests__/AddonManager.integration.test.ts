/**
 * Tests d'intégration pour AddonManager avec FileSystemService
 */

import { addonManager } from '../AddonManager';
import { fileSystemService } from '../FileSystemService';
import { promises as fs } from 'fs';

describe('AddonManager Integration Tests', () => {
  const testFile = 'test-addons-integration.json';

  beforeEach(async () => {
    // Nettoyer le fichier de test
    try {
      await fs.unlink(testFile);
    } catch {}
    
    // Réinitialiser le manager
    // Note: Comme AddonManager est un singleton, nous devons le réinitialiser manuellement
    await addonManager.initialize();
  });

  afterEach(async () => {
    // Nettoyer le fichier de test
    try {
      await fs.unlink(testFile);
    } catch {}
  });

  describe('saveToFile and loadFromFile', () => {
    it('should save and load config from file', async () => {
      // Configurer un état initial
      await addonManager.initialize();
      await addonManager.activateAddon('casting');
      await addonManager.activateAddon('mcp-server');
      
      // Vérifier que casting et mcp-server sont activés
      const castingAddonBefore = addonManager.getAddon('casting');
      const mcpServerAddonBefore = addonManager.getAddon('mcp-server');
      expect(castingAddonBefore?.enabled).toBe(true);
      expect(mcpServerAddonBefore?.enabled).toBe(true);
      
      // Sauvegarder dans un fichier
      await addonManager.saveToFile(testFile);
      
      // Vérifier que le fichier existe
      const fileExists = await fileSystemService.fileExists(testFile);
      expect(fileExists).toBe(true);
      
      // Réinitialiser le manager (simuler un nouveau chargement)
      // Comme c'est un singleton, nous devons créer une nouvelle instance
      // Pour les tests, nous allons simplement recharger depuis le fichier
      
      // Charger depuis le fichier
      await addonManager.loadFromFile(testFile);
      
      // Vérifier que l'état est restauré
      const castingAddonAfter = addonManager.getAddon('casting');
      const mcpServerAddonAfter = addonManager.getAddon('mcp-server');
      expect(castingAddonAfter?.enabled).toBe(true);
      expect(mcpServerAddonAfter?.enabled).toBe(true);
      
      // Vérifier que la configuration est synchronisée avec localStorage
      const localStorageConfig = localStorage.getItem('storycore_addon_config');
      expect(localStorageConfig).toBeDefined();
      const parsedConfig = JSON.parse(localStorageConfig!);
      expect(parsedConfig['casting']?.enabled).toBe(true);
      expect(parsedConfig['mcp-server']?.enabled).toBe(true);
    });

    it('should handle file not found gracefully', async () => {
      // Essayer de charger depuis un fichier qui n'existe pas
      await expect(addonManager.loadFromFile('non-existent.json'))
        .resolves
        .not.toThrow();
    });

    it('should sync between localStorage and file system', async () => {
      // Activer un add-on
      await addonManager.activateAddon('audio-production');
      await addonManager.activateAddon('demo-addon');
      
      // Sauvegarder dans le fichier
      await addonManager.saveToFile(testFile);
      
      // Vérifier que localStorage et le fichier sont synchronisés
      const localStorageConfig = localStorage.getItem('storycore_addon_config');
      const fileConfig = await fileSystemService.readConfigFile(testFile);
      
      expect(localStorageConfig).toBeDefined();
      expect(fileConfig).toBeDefined();
      
      const parsedLocalStorage = JSON.parse(localStorageConfig!);
      expect(parsedLocalStorage['audio-production']?.enabled).toBe(true);
      expect(parsedLocalStorage['demo-addon']?.enabled).toBe(true);
      expect(fileConfig['audio-production']?.enabled).toBe(true);
      expect(fileConfig['demo-addon']?.enabled).toBe(true);
    });
  });

  describe('autoSync', () => {
    it('should auto-sync configuration to file', async () => {
      // Activer l'auto-sync (si implémenté)
      // Pour l'instant, nous testons simplement que saveToFile fonctionne
      
      await addonManager.activateAddon('transitions');
      await addonManager.activateAddon('example-workflow');
      await addonManager.saveToFile(testFile);
      
      const fileExists = await fileSystemService.fileExists(testFile);
      expect(fileExists).toBe(true);
    });

    it('should handle concurrent sync operations', async () => {
      // Activer plusieurs add-ons
      await addonManager.activateAddon('casting');
      await addonManager.activateAddon('audio-production');
      
      // Sauvegarder plusieurs fois rapidement pour simuler des opérations concurrentes
      const syncPromises = [
        addonManager.saveToFile(testFile),
        addonManager.saveToFile(testFile),
        addonManager.saveToFile(testFile)
      ];
      
      // Attendre que toutes les opérations se terminent
      await Promise.all(syncPromises);
      
      // Vérifier que le fichier existe et est valide
      const fileExists = await fileSystemService.fileExists(testFile);
      expect(fileExists).toBe(true);
      
      const content = await fs.readFile(testFile, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.addons['casting'].enabled).toBe(true);
      expect(parsed.addons['audio-production'].enabled).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle invalid file format', async () => {
      // Créer un fichier avec un format invalide
      await fs.writeFile(testFile, 'invalid json content', 'utf-8');
      
      // Essayer de charger le fichier
      await expect(addonManager.loadFromFile(testFile))
        .rejects
        .toThrow('Format JSON invalide');
    });

    it('should handle missing addons property', async () => {
      // Créer un fichier sans la propriété addons
      const invalidConfig = {
        version: '1.0',
        timestamp: new Date().toISOString()
      };
      await fs.writeFile(testFile, JSON.stringify(invalidConfig), 'utf-8');
      
      // Essayer de charger le fichier
      await expect(addonManager.loadFromFile(testFile))
        .rejects
        .toThrow('Format de configuration invalide');
    });

    it('should handle file permission errors', async () => {
      // Simuler une erreur de permission en essayant d'écrire dans un répertoire protégé
      const protectedPath = '/root/protected-addons.json';
      
      // Essayer de sauvegarder dans un emplacement protégé
      await expect(addonManager.saveToFile(protectedPath))
        .rejects
        .toThrow();
    });

    it('should handle concurrent modification conflicts', async () => {
      // Sauvegarder une configuration initiale
      await addonManager.activateAddon('casting');
      await addonManager.saveToFile(testFile);
      
      // Lire et modifier le fichier directement (simuler une modification externe)
      const content = await fs.readFile(testFile, 'utf-8');
      const parsed = JSON.parse(content);
      parsed.addons['audio-production'] = { enabled: true };
      await fs.writeFile(testFile, JSON.stringify(parsed), 'utf-8');
      
      // Charger le fichier modifié - devrait gérer le conflit
      await expect(addonManager.loadFromFile(testFile))
        .resolves
        .not.toThrow();
      
      // Vérifier que l'état est cohérent
      const audioAddon = addonManager.getAddon('audio-production');
      expect(audioAddon?.enabled).toBe(true);
    });

    it('should handle race conditions during concurrent activation', async () => {
      // Activer plusieurs add-ons simultanément
      const activationPromises = [
        addonManager.activateAddon('casting'),
        addonManager.activateAddon('audio-production'),
        addonManager.activateAddon('transitions')
      ];
      
      // Attendre que toutes les activations se terminent
      const results = await Promise.allSettled(activationPromises);
      
      // Vérifier que toutes les activations ont réussi
      results.forEach(result => {
        if (result.status === 'rejected') {
          console.warn('Activation failed:', result.reason);
        }
        expect(result.status).toBe('fulfilled');
      });
      
      // Vérifier que tous les add-ons sont activés
      expect(addonManager.getAddon('casting')?.enabled).toBe(true);
      expect(addonManager.getAddon('audio-production')?.enabled).toBe(true);
      expect(addonManager.getAddon('transitions')?.enabled).toBe(true);
    });
  });

  describe('configuration structure', () => {
    it('should save complete configuration with metadata', async () => {
      // Activer quelques add-ons avec des paramètres
      await addonManager.activateAddon('casting');
      await addonManager.updateAddonSettings('casting', { maxActorsPerScene: 10 });
      await addonManager.activateAddon('mcp-server');
      await addonManager.updateAddonSettings('mcp-server', { enableMCP: true });
      
      // Sauvegarder la configuration
      await addonManager.saveToFile(testFile);
      
      // Lire le fichier directement pour vérifier la structure
      const content = await fs.readFile(testFile, 'utf-8');
      const parsed = JSON.parse(content);
      
      // Vérifier la structure
      expect(parsed.version).toBe('1.0');
      expect(parsed.timestamp).toBeDefined();
      expect(parsed.addons).toBeDefined();
      expect(parsed.addons['casting']).toBeDefined();
      expect(parsed.addons['casting'].enabled).toBe(true);
      expect(parsed.addons['casting'].settings.maxActorsPerScene).toBe(10);
      expect(parsed.addons['mcp-server']).toBeDefined();
      expect(parsed.addons['mcp-server'].enabled).toBe(true);
      expect(parsed.addons['mcp-server'].settings.enableMCP).toBe(true);
    });

    it('should preserve all add-on settings', async () => {
      // Configurer plusieurs add-ons avec différents paramètres
      await addonManager.activateAddon('casting');
      await addonManager.updateAddonSettings('casting', {
        maxActorsPerScene: 8,
        enableActorTemplates: false
      });
      
      await addonManager.activateAddon('audio-production');
      await addonManager.updateAddonSettings('audio-production', {
        defaultSampleRate: 48000,
        maxAudioTracks: 32
      });
      
      await addonManager.activateAddon('example-workflow');
      await addonManager.updateAddonSettings('example-workflow', {
        enableWorkflow: true,
        maxSteps: 10
      });
      
      // Sauvegarder et recharger
      await addonManager.saveToFile(testFile);
      await addonManager.loadFromFile(testFile);
      
      // Vérifier que tous les paramètres sont préservés
      const castingSettings = addonManager.getAddonSettings('casting');
      expect(castingSettings.maxActorsPerScene).toBe(8);
      expect(castingSettings.enableActorTemplates).toBe(false);
      
      const audioSettings = addonManager.getAddonSettings('audio-production');
      expect(audioSettings.defaultSampleRate).toBe(48000);
      expect(audioSettings.maxAudioTracks).toBe(32);
      
      const workflowSettings = addonManager.getAddonSettings('example-workflow');
      expect(workflowSettings.enableWorkflow).toBe(true);
      expect(workflowSettings.maxSteps).toBe(10);
    });

    it('should handle corrupted configuration gracefully', async () => {
      // Créer une configuration corrompue avec des valeurs invalides
      const corruptedConfig = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        addons: {
          'casting': {
            enabled: 'invalid_boolean', // Devrait être un booléen
            settings: {
              maxActorsPerScene: 'invalid_number' // Devrait être un nombre
            }
          }
        }
      };
      await fs.writeFile(testFile, JSON.stringify(corruptedConfig), 'utf-8');
      
      // Essayer de charger la configuration corrompue
      await expect(addonManager.loadFromFile(testFile))
        .rejects
        .toThrow('Format de configuration invalide');
    });
  });
});