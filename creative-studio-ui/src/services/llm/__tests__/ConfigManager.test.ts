/**
 * ConfigManager Unit Tests
 * 
 * Tests for LLM configuration management including:
 * - Loading/saving configuration
 * - Schema migration
 * - Validation
 * - Export/import
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfigManager, DEFAULT_CONFIG, type LLMConfig } from '../ConfigManager';

describe('ConfigManager', () => {
  // Mock localStorage
  const localStorageMock = (() => {
    let store: Record<string, string> = {};

    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
  })();

  beforeEach(() => {
    // Replace global localStorage with mock
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
    
    // Clear localStorage before each test
    localStorageMock.clear();
    
    // Clear console spies
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('getLLMConfig', () => {
    it('should return default config when none exists', () => {
      const config = ConfigManager.getLLMConfig();
      
      expect(config).toEqual(DEFAULT_CONFIG);
      expect(config.schemaVersion).toBe('2.0');
    });

    it('should load existing config from localStorage', () => {
      const testConfig: LLMConfig = {
        ...DEFAULT_CONFIG,
        model: 'llama3.1:8b',
      };
      
      localStorageMock.setItem('storycore-llm-config', JSON.stringify(testConfig));
      
      const config = ConfigManager.getLLMConfig();
      
      expect(config.model).toBe('llama3.1:8b');
      expect(config.schemaVersion).toBe('2.0');
    });

    it('should return default config on parse error', () => {
      localStorageMock.setItem('storycore-llm-config', 'invalid json');
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const config = ConfigManager.getLLMConfig();
      
      expect(config).toEqual(DEFAULT_CONFIG);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should merge config with defaults for missing fields', () => {
      const partialConfig = {
        provider: 'local' as const,
        model: 'gemma3:4b',
        apiEndpoint: 'http://localhost:11434',
        streamingEnabled: true,
        parameters: {
          temperature: 0.7,
          maxTokens: 2000,
          topP: 0.9,
          frequencyPenalty: 0,
          presencePenalty: 0,
        },
        schemaVersion: '2.0',
      };
      
      localStorageMock.setItem('storycore-llm-config', JSON.stringify(partialConfig));
      
      const config = ConfigManager.getLLMConfig();
      
      expect(config.availableModels).toBeDefined();
      expect(config.reasoningMode).toBeDefined();
    });
  });

  describe('saveLLMConfig', () => {
    it('should save config to localStorage', () => {
      ConfigManager.saveLLMConfig({ model: 'llama3.1:8b' });
      
      const stored = localStorageMock.getItem('storycore-llm-config');
      expect(stored).toBeTruthy();
      
      const config = JSON.parse(stored!);
      expect(config.model).toBe('llama3.1:8b');
      expect(config.schemaVersion).toBe('2.0');
    });

    it('should merge with existing config', () => {
      ConfigManager.saveLLMConfig({ model: 'gemma3:4b' });
      ConfigManager.saveLLMConfig({ apiEndpoint: 'http://localhost:11435' });
      
      const config = ConfigManager.getLLMConfig();
      
      expect(config.model).toBe('gemma3:4b');
      expect(config.apiEndpoint).toBe('http://localhost:11435');
    });

    it('should throw error for invalid config', () => {
      expect(() => {
        ConfigManager.saveLLMConfig({
          provider: 'invalid' as any,
        });
      }).toThrow();
    });

    it('should validate parameter ranges', () => {
      expect(() => {
        ConfigManager.saveLLMConfig({
          parameters: {
            temperature: 5.0, // Invalid: > 2
            maxTokens: 2000,
            topP: 0.9,
            frequencyPenalty: 0,
            presencePenalty: 0,
          },
        });
      }).toThrow();
    });

    it('should update schema version', () => {
      ConfigManager.saveLLMConfig({ model: 'llama3.1:8b' });
      
      const config = ConfigManager.getLLMConfig();
      expect(config.schemaVersion).toBe('2.0');
    });
  });

  describe('resetToDefaults', () => {
    it('should reset config to defaults', () => {
      // Set custom config
      ConfigManager.saveLLMConfig({ model: 'llama3.1:8b' });
      
      // Reset
      ConfigManager.resetToDefaults();
      
      const config = ConfigManager.getLLMConfig();
      expect(config).toEqual(DEFAULT_CONFIG);
    });

    it('should overwrite all custom settings', () => {
      ConfigManager.saveLLMConfig({
        model: 'llama3.1:8b',
        apiEndpoint: 'http://custom:11434',
        parameters: {
          temperature: 0.9,
          maxTokens: 4000,
          topP: 0.95,
          frequencyPenalty: 0.5,
          presencePenalty: 0.5,
        },
      });
      
      ConfigManager.resetToDefaults();
      
      const config = ConfigManager.getLLMConfig();
      expect(config.model).toBe(DEFAULT_CONFIG.model);
      expect(config.apiEndpoint).toBe(DEFAULT_CONFIG.apiEndpoint);
      expect(config.parameters).toEqual(DEFAULT_CONFIG.parameters);
    });
  });

  describe('updateReasoningMode', () => {
    it('should update reasoning mode settings', () => {
      ConfigManager.updateReasoningMode({ enabled: false });
      
      const config = ConfigManager.getLLMConfig();
      expect(config.reasoningMode?.enabled).toBe(false);
    });

    it('should merge with existing reasoning mode', () => {
      ConfigManager.updateReasoningMode({ enabled: true });
      ConfigManager.updateReasoningMode({ showThinking: true });
      
      const config = ConfigManager.getLLMConfig();
      expect(config.reasoningMode?.enabled).toBe(true);
      expect(config.reasoningMode?.showThinking).toBe(true);
    });

    it('should preserve other config fields', () => {
      const originalModel = ConfigManager.getLLMConfig().model;
      
      ConfigManager.updateReasoningMode({ enabled: false });
      
      const config = ConfigManager.getLLMConfig();
      expect(config.model).toBe(originalModel);
    });
  });

  describe('updateAvailableModels', () => {
    it('should update available models', () => {
      ConfigManager.updateAvailableModels({
        storytelling: ['llama3.1:8b', 'mistral:7b', 'neural-chat:7b'],
      });
      
      const config = ConfigManager.getLLMConfig();
      expect(config.availableModels?.storytelling).toHaveLength(3);
      expect(config.availableModels?.storytelling).toContain('neural-chat:7b');
    });

    it('should merge with existing models', () => {
      ConfigManager.updateAvailableModels({ vision: ['qwen3-vl:8b', 'llava:7b'] });
      ConfigManager.updateAvailableModels({ quick: ['gemma3:1b'] });
      
      const config = ConfigManager.getLLMConfig();
      expect(config.availableModels?.vision).toHaveLength(2);
      expect(config.availableModels?.quick).toHaveLength(1);
    });
  });

  describe('exportConfig', () => {
    it('should export config as JSON string', () => {
      ConfigManager.saveLLMConfig({ model: 'llama3.1:8b' });
      
      const exported = ConfigManager.exportConfig();
      
      expect(exported).toBeTruthy();
      expect(() => JSON.parse(exported)).not.toThrow();
      
      const parsed = JSON.parse(exported);
      expect(parsed.model).toBe('llama3.1:8b');
    });

    it('should export formatted JSON', () => {
      const exported = ConfigManager.exportConfig();
      
      // Check if it's pretty-printed (contains newlines)
      expect(exported).toContain('\n');
    });

    it('should include all config fields', () => {
      const exported = ConfigManager.exportConfig();
      const parsed = JSON.parse(exported);
      
      expect(parsed.provider).toBeDefined();
      expect(parsed.model).toBeDefined();
      expect(parsed.apiEndpoint).toBeDefined();
      expect(parsed.parameters).toBeDefined();
      expect(parsed.availableModels).toBeDefined();
      expect(parsed.reasoningMode).toBeDefined();
      expect(parsed.schemaVersion).toBeDefined();
    });
  });

  describe('importConfig', () => {
    it('should import valid config', () => {
      const testConfig = {
        ...DEFAULT_CONFIG,
        model: 'llama3.1:8b',
      };
      
      const jsonString = JSON.stringify(testConfig);
      
      ConfigManager.importConfig(jsonString);
      
      const config = ConfigManager.getLLMConfig();
      expect(config.model).toBe('llama3.1:8b');
    });

    it('should throw error for invalid JSON', () => {
      expect(() => {
        ConfigManager.importConfig('invalid json');
      }).toThrow();
    });

    it('should throw error for invalid config structure', () => {
      const invalidConfig = {
        provider: 'invalid',
        model: 'test',
      };
      
      expect(() => {
        ConfigManager.importConfig(JSON.stringify(invalidConfig));
      }).toThrow();
    });

    it('should validate imported config', () => {
      const invalidConfig = {
        ...DEFAULT_CONFIG,
        parameters: {
          ...DEFAULT_CONFIG.parameters,
          temperature: 10.0, // Invalid
        },
      };
      
      expect(() => {
        ConfigManager.importConfig(JSON.stringify(invalidConfig));
      }).toThrow();
    });
  });

  describe('Schema Migration', () => {
    it('should migrate v1.0 config to v2.0', () => {
      const v1Config = {
        provider: 'local',
        model: 'gemma3:4b',
        apiEndpoint: 'http://localhost:11434',
        streamingEnabled: true,
        parameters: {
          temperature: 0.7,
          maxTokens: 2000,
          topP: 0.9,
          frequencyPenalty: 0,
          presencePenalty: 0,
        },
        // No schemaVersion, availableModels, or reasoningMode
      };
      
      localStorageMock.setItem('storycore-llm-config', JSON.stringify(v1Config));
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const config = ConfigManager.getLLMConfig();
      
      expect(config.schemaVersion).toBe('2.0');
      expect(config.availableModels).toBeDefined();
      expect(config.reasoningMode).toBeDefined();
      // Check that migration was logged (it logs with multiple arguments)
      const migrationCalls = consoleSpy.mock.calls.filter(call => 
        call[0]?.includes?.('Migrating LLM config')
      );
      expect(migrationCalls.length).toBeGreaterThan(0);
      
      consoleSpy.mockRestore();
    });

    it('should preserve user settings during migration', () => {
      const v1Config = {
        provider: 'local',
        model: 'llama3.1:8b', // Custom model
        apiEndpoint: 'http://custom:11434', // Custom endpoint
        streamingEnabled: false, // Custom setting
        parameters: {
          temperature: 0.9, // Custom parameter
          maxTokens: 4000,
          topP: 0.95,
          frequencyPenalty: 0.5,
          presencePenalty: 0.5,
        },
      };
      
      localStorageMock.setItem('storycore-llm-config', JSON.stringify(v1Config));
      
      const config = ConfigManager.getLLMConfig();
      
      expect(config.model).toBe('llama3.1:8b');
      expect(config.apiEndpoint).toBe('http://custom:11434');
      expect(config.streamingEnabled).toBe(false);
      expect(config.parameters.temperature).toBe(0.9);
    });

    it('should add new fields with defaults during migration', () => {
      const v1Config = {
        provider: 'local',
        model: 'gemma3:4b',
        apiEndpoint: 'http://localhost:11434',
        streamingEnabled: true,
        parameters: {
          temperature: 0.7,
          maxTokens: 2000,
          topP: 0.9,
          frequencyPenalty: 0,
          presencePenalty: 0,
        },
      };
      
      localStorageMock.setItem('storycore-llm-config', JSON.stringify(v1Config));
      
      const config = ConfigManager.getLLMConfig();
      
      expect(config.availableModels).toEqual(DEFAULT_CONFIG.availableModels);
      expect(config.reasoningMode).toEqual(DEFAULT_CONFIG.reasoningMode);
    });

    it('should save migrated config to localStorage', () => {
      const v1Config = {
        provider: 'local',
        model: 'gemma3:4b',
        apiEndpoint: 'http://localhost:11434',
        streamingEnabled: true,
        parameters: {
          temperature: 0.7,
          maxTokens: 2000,
          topP: 0.9,
          frequencyPenalty: 0,
          presencePenalty: 0,
        },
      };
      
      localStorageMock.setItem('storycore-llm-config', JSON.stringify(v1Config));
      
      ConfigManager.getLLMConfig();
      
      const stored = localStorageMock.getItem('storycore-llm-config');
      const parsed = JSON.parse(stored!);
      
      expect(parsed.schemaVersion).toBe('2.0');
    });
  });

  describe('Validation', () => {
    it('should reject config without required fields', () => {
      expect(() => {
        ConfigManager.saveLLMConfig({
          provider: undefined as any,
        });
      }).toThrow();
    });

    it('should reject invalid provider', () => {
      expect(() => {
        ConfigManager.saveLLMConfig({
          provider: 'invalid' as any,
        });
      }).toThrow();
    });

    it('should reject temperature out of range', () => {
      expect(() => {
        ConfigManager.saveLLMConfig({
          parameters: {
            temperature: -1, // Invalid: < 0
            maxTokens: 2000,
            topP: 0.9,
            frequencyPenalty: 0,
            presencePenalty: 0,
          },
        });
      }).toThrow();

      expect(() => {
        ConfigManager.saveLLMConfig({
          parameters: {
            temperature: 3, // Invalid: > 2
            maxTokens: 2000,
            topP: 0.9,
            frequencyPenalty: 0,
            presencePenalty: 0,
          },
        });
      }).toThrow();
    });

    it('should reject maxTokens out of range', () => {
      expect(() => {
        ConfigManager.saveLLMConfig({
          parameters: {
            temperature: 0.7,
            maxTokens: 0, // Invalid: < 1
            topP: 0.9,
            frequencyPenalty: 0,
            presencePenalty: 0,
          },
        });
      }).toThrow();

      expect(() => {
        ConfigManager.saveLLMConfig({
          parameters: {
            temperature: 0.7,
            maxTokens: 200000, // Invalid: > 100000
            topP: 0.9,
            frequencyPenalty: 0,
            presencePenalty: 0,
          },
        });
      }).toThrow();
    });

    it('should reject topP out of range', () => {
      expect(() => {
        ConfigManager.saveLLMConfig({
          parameters: {
            temperature: 0.7,
            maxTokens: 2000,
            topP: -0.1, // Invalid: < 0
            frequencyPenalty: 0,
            presencePenalty: 0,
          },
        });
      }).toThrow();

      expect(() => {
        ConfigManager.saveLLMConfig({
          parameters: {
            temperature: 0.7,
            maxTokens: 2000,
            topP: 1.5, // Invalid: > 1
            frequencyPenalty: 0,
            presencePenalty: 0,
          },
        });
      }).toThrow();
    });

    it('should reject invalid reasoning mode format', () => {
      expect(() => {
        ConfigManager.saveLLMConfig({
          reasoningMode: {
            enabled: true,
            format: 'invalid' as any,
            showThinking: false,
            confucianPrinciples: ['ren'],
          },
        });
      }).toThrow();
    });

    it('should reject availableModels without default', () => {
      expect(() => {
        ConfigManager.saveLLMConfig({
          availableModels: {
            vision: ['qwen3-vl:8b'],
            storytelling: ['llama3.1:8b'],
            quick: ['gemma3:4b'],
            default: '', // Invalid: empty
          },
        });
      }).toThrow();
    });
  });

  describe('getDefaultConfig', () => {
    it('should return default configuration', () => {
      const defaultConfig = ConfigManager.getDefaultConfig();
      
      expect(defaultConfig).toEqual(DEFAULT_CONFIG);
    });

    it('should return a copy, not reference', () => {
      const defaultConfig1 = ConfigManager.getDefaultConfig();
      const defaultConfig2 = ConfigManager.getDefaultConfig();
      
      expect(defaultConfig1).not.toBe(defaultConfig2);
      expect(defaultConfig1).toEqual(defaultConfig2);
    });
  });
});
