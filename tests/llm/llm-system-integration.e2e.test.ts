/**
 * LLM System End-to-End Integration Tests
 *
 * Tests the complete LLM system flow: UI configuration, secure config storage,
 * provider management with fallback, and preset application.
 */

import { LLMProviderManager } from '../../src/llm/provider-manager';
import { SecurityManager } from '../../src/llm/security-manager';
import { LLMConfig, Message } from '../../src/llm/interfaces';

// Mock external dependencies
jest.mock('../../src/llm/openai-provider');
jest.mock('../../src/llm/openrouter-provider');
jest.mock('../../src/llm/ai-preset-service');
jest.mock('../../src/llm/security-manager');

// Import mocks after mocking
import { AIPresetService, AIPreset } from '../../src/llm/__mocks__/ai-preset-service';

describe('LLM System E2E Integration', () => {
  let providerManager: LLMProviderManager;
  let presetService: AIPresetService;
  let securityManager: SecurityManager;
  const encryptionKey = 'test-encryption-key-32-chars!!!';

  beforeEach(() => {
    jest.clearAllMocks();

    // Initialize services
    securityManager = new SecurityManager(encryptionKey);
    presetService = new AIPresetService();
    providerManager = new LLMProviderManager(encryptionKey);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('UI Configuration and Secure Storage', () => {
    it('should save and retrieve provider configurations securely', () => {
      // Simulate UI configuration input
      const uiConfig = {
        provider: 'openai' as const,
        model: 'gpt-4',
        enabled: true,
        priority: 1,
        apiKey: 'sk-test12345678901234567890123456789012'
      };

      // Save configuration (simulating UI save action)
      providerManager.addProvider('openai-primary', uiConfig);

      // Verify configuration is stored and retrievable
      const retrievedConfig = providerManager.getProviderConfig('openai-primary');

      expect(retrievedConfig).toBeDefined();
      expect(retrievedConfig?.provider).toBe('openai');
      expect(retrievedConfig?.model).toBe('gpt-4');
      expect(retrievedConfig?.apiKey).toBe('sk-test12345678901234567890123456789012');
    });

    it('should handle multiple provider configurations with priorities', () => {
      // Configure multiple providers (simulating UI setup)
      const configs = [
        { name: 'openai-fast', provider: 'openai', priority: 1, apiKey: 'sk-fast' },
        { name: 'openrouter-fallback', provider: 'openrouter', priority: 2, apiKey: 'or-fallback' },
        { name: 'openai-slow', provider: 'openai', priority: 3, apiKey: 'sk-slow' }
      ];

      configs.forEach(config => {
        providerManager.addProvider(config.name, {
          provider: config.provider as any,
          model: 'gpt-4',
          enabled: true,
          priority: config.priority,
          apiKey: config.apiKey
        });
      });

      // Verify priority ordering
      const providerNames = providerManager.getProviderNames();
      expect(providerNames).toEqual(['openai-fast', 'openrouter-fallback', 'openai-slow']);
    });

    it('should encrypt API keys securely and prevent access without proper decryption', () => {
      const apiKey = 'sk-sensitive-key-12345';

      providerManager.addProvider('secure-provider', {
        provider: 'openai',
        model: 'gpt-4',
        enabled: true,
        priority: 1,
        apiKey
      });

      // Verify the stored key is encrypted (not plain text)
      expect(securityManager.encrypt).toHaveBeenCalledWith(apiKey);

      // Verify retrieval gets decrypted key
      const config = providerManager.getProviderConfig('secure-provider');
      expect(config?.apiKey).toBe(apiKey);
      expect(securityManager.decrypt).toHaveBeenCalled();
    });

    it('should handle configuration validation and error feedback', () => {
      // Invalid configuration: missing API key
      expect(() => {
        providerManager.addProvider('invalid-provider', {
          provider: 'openai',
          model: 'gpt-4',
          enabled: true,
          priority: 1
          // apiKey missing
        });
      }).toThrow('No API key provided');

      // Invalid configuration: disabled provider
      providerManager.addProvider('disabled-provider', {
        provider: 'openai',
        model: 'gpt-4',
        enabled: false,
        priority: 1,
        apiKey: 'sk-test'
      });

      expect(providerManager.getProviderNames()).not.toContain('disabled-provider');
    });
  });

  describe('LLMProviderManager with Fallback Strategy', () => {
    beforeEach(() => {
      // Setup providers for fallback testing
      providerManager.addProvider('primary-openai', {
        provider: 'openai',
        model: 'gpt-4',
        enabled: true,
        priority: 1,
        apiKey: 'sk-primary'
      });

      providerManager.addProvider('secondary-openrouter', {
        provider: 'openrouter',
        model: 'gpt-4',
        enabled: true,
        priority: 2,
        apiKey: 'or-secondary'
      });

      providerManager.addProvider('tertiary-openai', {
        provider: 'openai',
        model: 'gpt-4',
        enabled: true,
        priority: 3,
        apiKey: 'sk-tertiary'
      });
    });

    it('should successfully generate text using primary provider', async () => {
      const prompt = 'Test prompt for primary provider';
      const result = await providerManager.generateText(prompt);

      expect(result).toContain('OpenAI response to:');
      expect(result).toContain(prompt);
    });

    it('should fallback to secondary provider when primary fails', async () => {
      // Configure primary to fail
      providerManager.addProvider('primary-openai', {
        provider: 'openai',
        model: 'gpt-4',
        enabled: true,
        priority: 1,
        apiKey: 'invalid-key' // This will cause failure
      });

      const prompt = 'Test fallback prompt';
      const result = await providerManager.generateText(prompt);

      // Should use secondary provider (OpenRouter)
      expect(result).toContain('OpenRouter response to:');
    });

    it('should fallback through multiple providers until success', async () => {
      // Configure first two to fail, third to succeed
      providerManager.addProvider('primary-openai', {
        provider: 'openai',
        enabled: true,
        priority: 1,
        apiKey: 'invalid-key'
      });

      providerManager.addProvider('secondary-openrouter', {
        provider: 'openrouter',
        enabled: true,
        priority: 2,
        apiKey: 'invalid-key'
      });

      // Third provider succeeds
      const result = await providerManager.generateText('Multi-fallback test');

      expect(result).toContain('OpenAI response to:');
    });

    it('should throw error when all providers fail', async () => {
      // Configure all providers to fail
      providerManager.addProvider('primary-openai', {
        provider: 'openai',
        enabled: true,
        priority: 1,
        apiKey: 'invalid-key'
      });

      providerManager.addProvider('secondary-openrouter', {
        provider: 'openrouter',
        enabled: true,
        priority: 2,
        apiKey: 'invalid-key'
      });

      providerManager.addProvider('tertiary-openai', {
        provider: 'openai',
        enabled: true,
        priority: 3,
        apiKey: 'invalid-key'
      });

      await expect(providerManager.generateText('All fail test')).rejects.toThrow('All providers failed');
    });

    it('should handle completion generation with fallback', async () => {
      const messages: Message[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello!' }
      ];

      const result = await providerManager.generateCompletion(messages);

      expect(result).toContain('completion for:');
      expect(result).toContain('Hello!');
    });

    it('should verify provider availability', async () => {
      const isAvailable = await providerManager.isAvailable();
      expect(isAvailable).toBe(true);
    });
  });

  describe('AIPresetService Integration', () => {
    it('should apply presets to LLM configurations', () => {
      const baseConfig: LLMConfig = {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        apiKey: 'sk-test'
      };

      const enhancedConfig = presetService.applyPreset('creative-writing', baseConfig);

      expect(enhancedConfig.temperature).toBe(0.9);
      expect(enhancedConfig.maxTokens).toBe(2048);
      expect(enhancedConfig.model).toBe('gpt-3.5-turbo'); // Should preserve base model
    });

    it('should validate preset configurations', () => {
      const validPreset: Partial<AIPreset> = {
        name: 'Test Preset',
        config: { temperature: 0.7 },
        category: 'conversational',
        tags: ['test']
      };

      const validation = presetService.validatePreset(validPreset);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject invalid preset configurations', () => {
      const invalidPreset: Partial<AIPreset> = {
        // Missing name
        config: { temperature: 0.7 },
        category: 'conversational'
      };

      const validation = presetService.validatePreset(invalidPreset);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Name required');
    });

    it('should manage custom presets', () => {
      const customPreset: Omit<AIPreset, 'id'> = {
        name: 'Custom Technical',
        description: 'Technical analysis preset',
        config: { temperature: 0.1, maxTokens: 1024 },
        category: 'technical',
        tags: ['analysis', 'technical']
      };

      const presetId = presetService.addPreset(customPreset);

      expect(presetId).toBeDefined();
      const retrieved = presetService.getPreset(presetId);
      expect(retrieved?.name).toBe('Custom Technical');
    });

    it('should filter presets by category and tags', () => {
      const creativePresets = presetService.getPresetsByCategory('creative');
      expect(creativePresets.length).toBeGreaterThan(0);
      expect(creativePresets[0].category).toBe('creative');

      const writingPresets = presetService.getPresetsByTags(['writing']);
      expect(writingPresets.length).toBeGreaterThan(0);
      expect(writingPresets[0].tags).toContain('writing');
    });
  });

  describe('Dependency Injection and Error Handling', () => {
    it('should inject dependencies correctly in provider manager', () => {
      const manager = new LLMProviderManager(encryptionKey);

      // Verify SecurityManager is injected
      expect(manager).toBeDefined();

      // Test that manager can create providers with injected dependencies
      manager.addProvider('test-provider', {
        provider: 'openai',
        model: 'gpt-4',
        enabled: true,
        priority: 1,
        apiKey: 'sk-test'
      });

      expect(manager.getProviderNames()).toContain('test-provider');
    });

    it('should handle encryption/decryption errors gracefully', () => {
      // Mock SecurityManager to throw on decrypt
      (securityManager.decrypt as jest.Mock).mockImplementation(() => {
        throw new Error('Decryption failed');
      });

      expect(() => {
        providerManager.addProvider('encrypted-provider', {
          provider: 'openai',
          model: 'gpt-4',
          enabled: true,
          priority: 1,
          encryptedApiKey: 'invalid-encrypted-key'
        });
      }).toThrow('Decryption failed');
    });

    it('should handle provider instantiation errors', () => {
      expect(() => {
        providerManager.addProvider('unknown-provider', {
          provider: 'unknown',
          model: 'unknown-model',
          enabled: true,
          priority: 1,
          apiKey: 'test-key'
        });
      }).toThrow('Unsupported provider: unknown');
    });

    it('should handle preset application errors', () => {
      expect(() => {
        presetService.applyPreset('non-existent-preset', {
          provider: 'openai',
          model: 'gpt-4',
          apiKey: 'sk-test'
        });
      }).toThrow('Preset non-existent-preset not found');
    });

    it('should handle async operation timeouts', async () => {
      // Configure provider with timeout
      providerManager.addProvider('timeout-provider', {
        provider: 'openai',
        model: 'gpt-4',
        enabled: true,
        priority: 1,
        apiKey: 'timeout-key'
      });

      await expect(providerManager.generateText('Timeout test')).rejects.toThrow('Request timeout');
    });

    it('should recover from temporary provider failures', async () => {
      // Setup providers with one failing temporarily
      providerManager.addProvider('failing-primary', {
        provider: 'openai',
        enabled: true,
        priority: 1,
        apiKey: 'invalid-key'
      });

      providerManager.addProvider('working-secondary', {
        provider: 'openrouter',
        enabled: true,
        priority: 2,
        apiKey: 'valid-key'
      });

      const result = await providerManager.generateText('Recovery test');

      // Should succeed with secondary provider
      expect(result).toContain('OpenRouter response to:');
    });
  });

  describe('End-to-End Workflow Scenarios', () => {
    it('should complete full workflow: config -> preset -> generation -> fallback', async () => {
      // Step 1: Configure providers via UI simulation
      providerManager.addProvider('workflow-openai', {
        provider: 'openai',
        model: 'gpt-4',
        enabled: true,
        priority: 1,
        apiKey: 'sk-workflow'
      });

      providerManager.addProvider('workflow-openrouter', {
        provider: 'openrouter',
        model: 'gpt-4',
        enabled: true,
        priority: 2,
        apiKey: 'or-workflow'
      });

      // Step 2: Apply preset to configuration
      const baseConfig: LLMConfig = {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'sk-workflow'
      };

      const presetConfig = presetService.applyPreset('creative-writing', baseConfig);

      // Step 3: Generate content with preset-enhanced config
      const result = await providerManager.generateText('Create a creative story', presetConfig);

      expect(result).toContain('OpenAI response to:');
      expect(result).toContain('Create a creative story');
    });

    it('should handle complete system failure gracefully', async () => {
      // Setup all providers to fail
      providerManager.addProvider('failing-openai', {
        provider: 'openai',
        enabled: true,
        priority: 1,
        apiKey: 'invalid-key'
      });

      providerManager.addProvider('failing-openrouter', {
        provider: 'openrouter',
        enabled: true,
        priority: 2,
        apiKey: 'invalid-key'
      });

      // Attempt generation
      await expect(providerManager.generateText('System failure test')).rejects.toThrow('All providers failed');

      // Verify system remains operational for future requests
      providerManager.addProvider('recovery-provider', {
        provider: 'openai',
        enabled: true,
        priority: 1,
        apiKey: 'sk-recovery'
      });

      const recoveryResult = await providerManager.generateText('Recovery after failure');
      expect(recoveryResult).toContain('OpenAI response to:');
    });
  });
});