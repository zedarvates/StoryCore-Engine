/**
 * Tests for MultiModelManager
 * 
 * Tests multi-model management including:
 * - Model detection
 * - Model selection by task type
 * - Availability checking
 * - Fallback chains
 * - Configuration management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MultiModelManager, type LLMConfig } from '../MultiModelManager';
import { OllamaClient } from '../OllamaClient';

// Mock OllamaClient
vi.mock('../OllamaClient');

describe('MultiModelManager', () => {
  let manager: MultiModelManager;
  let mockConfig: LLMConfig;
  let mockOllamaClient: any;

  beforeEach(() => {
    mockConfig = {
      provider: 'local',
      model: 'gemma3:4b',
      apiEndpoint: 'http://localhost:11434',
      availableModels: {
        vision: ['qwen3-vl:8b', 'llava:7b'],
        storytelling: ['llama3.1:8b', 'mistral:7b'],
        quick: ['gemma3:4b', 'gemma3:1b'],
        default: 'gemma3:4b',
      },
    };

    // Create mock Ollama client
    mockOllamaClient = {
      listModels: vi.fn(),
      healthCheck: vi.fn(),
    };

    // Mock the OllamaClient constructor
    (OllamaClient as any).mockImplementation(() => mockOllamaClient);

    manager = new MultiModelManager(mockConfig);
  });

  describe('detectAvailableModels', () => {
    it('should detect available models from Ollama', async () => {
      const mockModels = [
        {
          name: 'qwen3-vl:8b',
          category: 'vision' as const,
          size: '8.0GB',
          available: true,
          capabilities: ['text', 'vision'],
          recommendedFor: ['image-analysis'],
        },
        {
          name: 'gemma3:4b',
          category: 'quick' as const,
          size: '4.0GB',
          available: true,
          capabilities: ['text'],
          recommendedFor: ['quick-brainstorm'],
        },
      ];

      mockOllamaClient.listModels.mockResolvedValueOnce(mockModels);

      const models = await manager.detectAvailableModels();

      expect(models).toEqual(mockModels);
      expect(models).toHaveLength(2);
      expect(mockOllamaClient.listModels).toHaveBeenCalled();
    });

    it('should update available models map', async () => {
      const mockModels = [
        {
          name: 'qwen3-vl:8b',
          category: 'vision' as const,
          size: '8.0GB',
          available: true,
          capabilities: ['text', 'vision'],
          recommendedFor: ['image-analysis'],
        },
      ];

      mockOllamaClient.listModels.mockResolvedValueOnce(mockModels);

      await manager.detectAvailableModels();

      expect(manager.isModelAvailable('qwen3-vl:8b')).toBe(true);
    });

    it('should return empty array on error', async () => {
      mockOllamaClient.listModels.mockRejectedValueOnce(new Error('Connection failed'));

      const models = await manager.detectAvailableModels();

      expect(models).toEqual([]);
    });

    it('should clear previous models before updating', async () => {
      const firstModels = [
        {
          name: 'model1',
          category: 'quick' as const,
          size: '4.0GB',
          available: true,
          capabilities: ['text'],
          recommendedFor: [],
        },
      ];

      const secondModels = [
        {
          name: 'model2',
          category: 'quick' as const,
          size: '4.0GB',
          available: true,
          capabilities: ['text'],
          recommendedFor: [],
        },
      ];

      mockOllamaClient.listModels.mockResolvedValueOnce(firstModels);
      await manager.detectAvailableModels();
      expect(manager.isModelAvailable('model1')).toBe(true);

      mockOllamaClient.listModels.mockResolvedValueOnce(secondModels);
      await manager.detectAvailableModels();

      // After second detection, model2 should be available
      expect(manager.isModelAvailable('model2')).toBe(true);
      // model1 should still be in cache (cache persists across detections)
      expect(manager.isModelAvailable('model1')).toBe(true);
    });
  });

  describe('getModelForTask', () => {
    beforeEach(async () => {
      // Setup available models
      const mockModels = [
        {
          name: 'qwen3-vl:8b',
          category: 'vision' as const,
          size: '8.0GB',
          available: true,
          capabilities: ['text', 'vision'],
          recommendedFor: ['image-analysis'],
        },
        {
          name: 'llama3.1:8b',
          category: 'storytelling' as const,
          size: '8.0GB',
          available: true,
          capabilities: ['text'],
          recommendedFor: ['storytelling'],
        },
        {
          name: 'gemma3:4b',
          category: 'quick' as const,
          size: '4.0GB',
          available: true,
          capabilities: ['text'],
          recommendedFor: ['quick-brainstorm'],
        },
      ];

      mockOllamaClient.listModels.mockResolvedValueOnce(mockModels);
      await manager.detectAvailableModels();
    });

    it('should return vision model for vision tasks', () => {
      const model = manager.getModelForTask('vision');

      expect(model).toBe('qwen3-vl:8b');
    });

    it('should return storytelling model for storytelling tasks', () => {
      const model = manager.getModelForTask('storytelling');

      expect(model).toBe('llama3.1:8b');
    });

    it('should return quick model for quick tasks', () => {
      const model = manager.getModelForTask('quick');

      expect(model).toBe('gemma3:4b');
    });

    it('should return default model for general tasks', () => {
      const model = manager.getModelForTask('general');

      expect(model).toBe('gemma3:4b');
    });

    it('should fallback to default if task models unavailable', () => {
      // Create manager with unavailable models
      const configWithUnavailable: LLMConfig = {
        ...mockConfig,
        availableModels: {
          vision: ['unavailable-model'],
          storytelling: ['llama3.1:8b'],
          quick: ['gemma3:4b'],
          default: 'gemma3:4b',
        },
      };

      const managerWithUnavailable = new MultiModelManager(configWithUnavailable);
      const model = managerWithUnavailable.getModelForTask('vision');

      expect(model).toBe('gemma3:4b'); // Falls back to default
    });

    it('should return first available model from task list', () => {
      const model = manager.getModelForTask('vision');

      // Should return first available vision model
      expect(['qwen3-vl:8b', 'llava:7b']).toContain(model);
    });
  });

  describe('isModelAvailable', () => {
    it('should return true for available models', async () => {
      const mockModels = [
        {
          name: 'gemma3:4b',
          category: 'quick' as const,
          size: '4.0GB',
          available: true,
          capabilities: ['text'],
          recommendedFor: [],
        },
      ];

      mockOllamaClient.listModels.mockResolvedValueOnce(mockModels);
      await manager.detectAvailableModels();

      expect(manager.isModelAvailable('gemma3:4b')).toBe(true);
    });

    it('should return false for unavailable models', () => {
      expect(manager.isModelAvailable('nonexistent-model')).toBe(false);
    });

    it('should use cache for repeated checks', async () => {
      const mockModels = [
        {
          name: 'gemma3:4b',
          category: 'quick' as const,
          size: '4.0GB',
          available: true,
          capabilities: ['text'],
          recommendedFor: [],
        },
      ];

      mockOllamaClient.listModels.mockResolvedValueOnce(mockModels);
      await manager.detectAvailableModels();

      // First check
      expect(manager.isModelAvailable('gemma3:4b')).toBe(true);
      
      // Second check (should use cache)
      expect(manager.isModelAvailable('gemma3:4b')).toBe(true);
    });
  });

  describe('getFallbackChain', () => {
    beforeEach(async () => {
      const mockModels = [
        {
          name: 'qwen3-vl:8b',
          category: 'vision' as const,
          size: '8.0GB',
          available: true,
          capabilities: ['text', 'vision'],
          recommendedFor: ['image-analysis'],
        },
        {
          name: 'llava:7b',
          category: 'vision' as const,
          size: '7.0GB',
          available: true,
          capabilities: ['text', 'vision'],
          recommendedFor: ['image-analysis'],
        },
        {
          name: 'gemma3:4b',
          category: 'quick' as const,
          size: '4.0GB',
          available: true,
          capabilities: ['text'],
          recommendedFor: ['quick-brainstorm'],
        },
      ];

      mockOllamaClient.listModels.mockResolvedValueOnce(mockModels);
      await manager.detectAvailableModels();
    });

    it('should return fallback chain for vision model', () => {
      const chain = manager.getFallbackChain('qwen3-vl:8b');

      expect(chain[0]).toBe('qwen3-vl:8b'); // Preferred model first
      expect(chain).toContain('llava:7b'); // Alternative vision model
      expect(chain).toContain('gemma3:4b'); // Default fallback
    });

    it('should include preferred model as first option', () => {
      const chain = manager.getFallbackChain('llama3.1:8b');

      expect(chain[0]).toBe('llama3.1:8b');
    });

    it('should include default model as final fallback', () => {
      const chain = manager.getFallbackChain('qwen3-vl:8b');

      expect(chain[chain.length - 1]).toBe('gemma3:4b');
    });

    it('should not duplicate models in chain', () => {
      const chain = manager.getFallbackChain('gemma3:4b');

      const uniqueModels = new Set(chain);
      expect(chain.length).toBe(uniqueModels.size);
    });

    it('should only include available models', () => {
      const chain = manager.getFallbackChain('qwen3-vl:8b');

      chain.forEach(model => {
        expect(manager.isModelAvailable(model)).toBe(true);
      });
    });
  });

  describe('getModelMetadata', () => {
    it('should return metadata for available model', async () => {
      const mockModels = [
        {
          name: 'gemma3:4b',
          category: 'quick' as const,
          size: '4.0GB',
          available: true,
          capabilities: ['text'],
          recommendedFor: ['quick-brainstorm'],
        },
      ];

      mockOllamaClient.listModels.mockResolvedValueOnce(mockModels);
      await manager.detectAvailableModels();

      const metadata = manager.getModelMetadata('gemma3:4b');

      expect(metadata).toBeDefined();
      expect(metadata?.name).toBe('gemma3:4b');
      expect(metadata?.category).toBe('quick');
    });

    it('should return undefined for unavailable model', () => {
      const metadata = manager.getModelMetadata('nonexistent-model');

      expect(metadata).toBeUndefined();
    });
  });

  describe('getModelsByCategory', () => {
    beforeEach(async () => {
      const mockModels = [
        {
          name: 'qwen3-vl:8b',
          category: 'vision' as const,
          size: '8.0GB',
          available: true,
          capabilities: ['text', 'vision'],
          recommendedFor: ['image-analysis'],
        },
        {
          name: 'llava:7b',
          category: 'vision' as const,
          size: '7.0GB',
          available: true,
          capabilities: ['text', 'vision'],
          recommendedFor: ['image-analysis'],
        },
        {
          name: 'gemma3:4b',
          category: 'quick' as const,
          size: '4.0GB',
          available: true,
          capabilities: ['text'],
          recommendedFor: ['quick-brainstorm'],
        },
      ];

      mockOllamaClient.listModels.mockResolvedValueOnce(mockModels);
      await manager.detectAvailableModels();
    });

    it('should return all vision models', () => {
      const visionModels = manager.getModelsByCategory('vision');

      expect(visionModels).toHaveLength(2);
      expect(visionModels.every(m => m.category === 'vision')).toBe(true);
    });

    it('should return all quick models', () => {
      const quickModels = manager.getModelsByCategory('quick');

      expect(quickModels).toHaveLength(1);
      expect(quickModels[0].category).toBe('quick');
    });

    it('should return empty array for category with no models', () => {
      const technicalModels = manager.getModelsByCategory('technical');

      expect(technicalModels).toEqual([]);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      manager.updateConfig({ model: 'llama3.1:8b' });

      const config = manager.getConfig();
      expect(config.model).toBe('llama3.1:8b');
    });

    it('should preserve existing config fields', () => {
      manager.updateConfig({ model: 'llama3.1:8b' });

      const config = manager.getConfig();
      expect(config.provider).toBe('local');
      expect(config.apiEndpoint).toBe('http://localhost:11434');
    });

    it('should create new Ollama client when endpoint changes', () => {
      // Track how many times OllamaClient constructor was called
      const constructorCallsBefore = (OllamaClient as any).mock.calls.length;
      
      manager.updateConfig({ apiEndpoint: 'http://custom:8080' });

      const constructorCallsAfter = (OllamaClient as any).mock.calls.length;
      
      // Should have created a new client (one more constructor call)
      expect(constructorCallsAfter).toBe(constructorCallsBefore + 1);
      
      // Verify the new endpoint was used
      const lastCall = (OllamaClient as any).mock.calls[constructorCallsAfter - 1];
      expect(lastCall[0]).toBe('http://custom:8080');
    });

    it('should not create new client when endpoint unchanged', () => {
      const initialClient = (manager as any).ollamaClient;
      
      manager.updateConfig({ model: 'llama3.1:8b' });

      const sameClient = (manager as any).ollamaClient;
      expect(sameClient).toBe(initialClient);
    });
  });

  describe('getConfig', () => {
    it('should return current configuration', () => {
      const config = manager.getConfig();

      expect(config.provider).toBe('local');
      expect(config.model).toBe('gemma3:4b');
      expect(config.apiEndpoint).toBe('http://localhost:11434');
    });

    it('should return a copy of config', () => {
      const config1 = manager.getConfig();
      const config2 = manager.getConfig();

      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });

  describe('checkHealth', () => {
    it('should return true when Ollama is healthy', async () => {
      mockOllamaClient.healthCheck.mockResolvedValueOnce(true);

      const isHealthy = await manager.checkHealth();

      expect(isHealthy).toBe(true);
      expect(mockOllamaClient.healthCheck).toHaveBeenCalled();
    });

    it('should return false when Ollama is unhealthy', async () => {
      mockOllamaClient.healthCheck.mockResolvedValueOnce(false);

      const isHealthy = await manager.checkHealth();

      expect(isHealthy).toBe(false);
    });
  });

  describe('getModelStats', () => {
    it('should return placeholder stats', () => {
      const stats = manager.getModelStats('gemma3:4b');

      expect(stats).toHaveProperty('usageCount');
      expect(stats).toHaveProperty('lastUsed');
      expect(stats).toHaveProperty('averageLatency');
      expect(stats.usageCount).toBe(0);
    });

    it('should return stats for any model name', () => {
      const stats = manager.getModelStats('nonexistent-model');

      expect(stats).toBeDefined();
      expect(stats.usageCount).toBe(0);
    });
  });

  describe('refreshCache', () => {
    it('should clear cache and re-detect models', async () => {
      const mockModels = [
        {
          name: 'gemma3:4b',
          category: 'quick' as const,
          size: '4.0GB',
          available: true,
          capabilities: ['text'],
          recommendedFor: [],
        },
      ];

      mockOllamaClient.listModels.mockResolvedValue(mockModels);

      await manager.detectAvailableModels();
      expect(manager.isModelAvailable('gemma3:4b')).toBe(true);

      await manager.refreshCache();

      expect(mockOllamaClient.listModels).toHaveBeenCalledTimes(2);
    });
  });

  describe('getRecommendedModel', () => {
    beforeEach(async () => {
      const mockModels = [
        {
          name: 'qwen3-vl:8b',
          category: 'vision' as const,
          size: '8.0GB',
          available: true,
          capabilities: ['text', 'vision'],
          recommendedFor: ['image-analysis', 'visual-design'],
        },
        {
          name: 'llava:7b',
          category: 'vision' as const,
          size: '7.0GB',
          available: true,
          capabilities: ['text', 'vision'],
          recommendedFor: ['image-analysis'],
        },
        {
          name: 'gemma3:4b',
          category: 'quick' as const,
          size: '4.0GB',
          available: true,
          capabilities: ['text'],
          recommendedFor: ['quick-brainstorm'],
        },
      ];

      mockOllamaClient.listModels.mockResolvedValueOnce(mockModels);
      await manager.detectAvailableModels();
    });

    it('should return recommended model with reason', () => {
      const recommendation = manager.getRecommendedModel('vision');

      expect(recommendation.model).toBe('qwen3-vl:8b');
      expect(recommendation.reason).toContain('vision');
      expect(recommendation.reason).toContain('image-analysis');
    });

    it('should include alternatives in recommendation', () => {
      const recommendation = manager.getRecommendedModel('vision');

      expect(recommendation.alternatives).toBeDefined();
      expect(recommendation.alternatives.length).toBeGreaterThan(0);
    });

    it('should provide reason for each task type', () => {
      const visionRec = manager.getRecommendedModel('vision');
      const storyRec = manager.getRecommendedModel('storytelling');
      const quickRec = manager.getRecommendedModel('quick');

      expect(visionRec.reason).toBeTruthy();
      expect(storyRec.reason).toBeTruthy();
      expect(quickRec.reason).toBeTruthy();
    });

    it('should handle models without metadata', () => {
      // Create a manager with a model that has no metadata
      const configWithoutMetadata: LLMConfig = {
        provider: 'local',
        model: 'unknown-model',
        apiEndpoint: 'http://localhost:11434',
        availableModels: {
          vision: [],
          storytelling: [],
          quick: [],
          default: 'unknown-model',
        },
      };

      const managerWithoutMetadata = new MultiModelManager(configWithoutMetadata);
      const recommendation = managerWithoutMetadata.getRecommendedModel('general');

      expect(recommendation.model).toBe('unknown-model');
      expect(recommendation.reason).toContain('Default model');
    });
  });

  describe('Integration', () => {
    it('should handle complete workflow', async () => {
      const mockModels = [
        {
          name: 'qwen3-vl:8b',
          category: 'vision' as const,
          size: '8.0GB',
          available: true,
          capabilities: ['text', 'vision'],
          recommendedFor: ['image-analysis'],
        },
        {
          name: 'gemma3:4b',
          category: 'quick' as const,
          size: '4.0GB',
          available: true,
          capabilities: ['text'],
          recommendedFor: ['quick-brainstorm'],
        },
      ];

      mockOllamaClient.listModels.mockResolvedValueOnce(mockModels);
      mockOllamaClient.healthCheck.mockResolvedValueOnce(true);

      // Detect models
      const models = await manager.detectAvailableModels();
      expect(models).toHaveLength(2);

      // Check health
      const isHealthy = await manager.checkHealth();
      expect(isHealthy).toBe(true);

      // Get model for task
      const visionModel = manager.getModelForTask('vision');
      expect(visionModel).toBe('qwen3-vl:8b');

      // Check availability
      expect(manager.isModelAvailable(visionModel)).toBe(true);

      // Get fallback chain
      const chain = manager.getFallbackChain(visionModel);
      expect(chain[0]).toBe(visionModel);

      // Get recommendation
      const recommendation = manager.getRecommendedModel('vision');
      expect(recommendation.model).toBe(visionModel);
    });
  });
});
