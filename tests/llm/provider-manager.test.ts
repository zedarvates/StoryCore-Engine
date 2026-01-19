import { LLMProviderManager } from '../../src/llm/provider-manager';
import { LLMProvider, Message } from '../../src/llm/interfaces';

// Mock provider for testing
class MockProvider implements LLMProvider {
  private shouldFail: boolean;
  private response: string;

  constructor(shouldFail = false, response = 'mock response') {
    this.shouldFail = shouldFail;
    this.response = response;
  }

  async generateText(prompt: string): Promise<string> {
    if (this.shouldFail) {
      throw new Error('Mock provider failure');
    }
    return this.response;
  }

  async generateCompletion(messages: Message[]): Promise<string> {
    if (this.shouldFail) {
      throw new Error('Mock provider failure');
    }
    return this.response;
  }

  async isAvailable(): Promise<boolean> {
    return !this.shouldFail;
  }
}

describe('LLMProviderManager', () => {
  let manager: LLMProviderManager;

  beforeEach(() => {
    manager = new LLMProviderManager('test-key');
  });

  describe('Provider Management', () => {
    it('should add and manage providers correctly', () => {
      const mockProvider = new MockProvider();

      manager.addProvider('test-provider', {
        provider: 'openai',
        model: 'gpt-4',
        enabled: true,
        priority: 1,
        apiKey: 'test-key',
      });

      expect(manager.getProviderNames()).toContain('test-provider');
      expect(manager.getCurrentProviderName()).toBe('test-provider');
    });

    it('should remove providers', () => {
      manager.addProvider('test-provider', {
        provider: 'openai',
        model: 'gpt-4',
        enabled: true,
        priority: 1,
        apiKey: 'test-key',
      });

      manager.removeProvider('test-provider');
      expect(manager.getProviderNames()).not.toContain('test-provider');
    });

    it('should encrypt and decrypt API keys', () => {
      manager.addProvider('test-provider', {
        provider: 'openai',
        model: 'gpt-4',
        enabled: true,
        priority: 1,
        apiKey: 'secret-key-123',
      });

      const config = manager.getProviderConfig('test-provider');
      expect(config?.apiKey).toBe('secret-key-123');
    });
  });

  describe('Round-robin Fallback', () => {
    it('should use first available provider', async () => {
      const goodProvider = new MockProvider(false, 'good response');
      const badProvider = new MockProvider(true, 'bad response');

      manager.addProvider('good', {
        provider: 'openai',
        model: 'gpt-4',
        enabled: true,
        priority: 1,
        apiKey: 'key1',
      });

      manager.addProvider('bad', {
        provider: 'openai',
        model: 'gpt-4',
        enabled: true,
        priority: 2,
        apiKey: 'key2',
      });

      const result = await manager.generateText('test prompt');
      expect(result).toBe('good response');
    });

    it('should fallback to next provider on failure', async () => {
      const badProvider1 = new MockProvider(true, 'bad1');
      const goodProvider2 = new MockProvider(false, 'good response');

      manager.addProvider('bad1', {
        provider: 'openai',
        model: 'gpt-4',
        enabled: true,
        priority: 1,
        apiKey: 'key1',
      });

      manager.addProvider('good2', {
        provider: 'openai',
        model: 'gpt-4',
        enabled: true,
        priority: 2,
        apiKey: 'key2',
      });

      const result = await manager.generateText('test prompt');
      expect(result).toBe('good response');
    });

    it('should throw error when all providers fail', async () => {
      manager.addProvider('bad1', {
        provider: 'openai',
        model: 'gpt-4',
        enabled: true,
        priority: 1,
        apiKey: 'key1',
      });

      manager.addProvider('bad2', {
        provider: 'openai',
        model: 'gpt-4',
        enabled: true,
        priority: 2,
        apiKey: 'key2',
      });

      await expect(manager.generateText('test prompt')).rejects.toThrow('All providers failed');
    });
  });

  describe('Priority Ordering', () => {
    it('should order providers by priority', () => {
      manager.addProvider('low-priority', {
        provider: 'openai',
        model: 'gpt-4',
        enabled: true,
        priority: 3,
        apiKey: 'key1',
      });

      manager.addProvider('high-priority', {
        provider: 'openai',
        model: 'gpt-4',
        enabled: true,
        priority: 1,
        apiKey: 'key2',
      });

      const names = manager.getProviderNames();
      expect(names[0]).toBe('high-priority');
      expect(names[1]).toBe('low-priority');
    });
  });
});