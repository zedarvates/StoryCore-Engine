import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { LLMConfiguration } from '../configurationTypes';

// Global configuration path
const GLOBAL_LLM_CONFIG_PATH = path.join(os.homedir(), '.storycore', 'llm-config.json');

// Simple in-memory configuration store for LLM
let llmConfigStore: LLMConfiguration = {
  provider: 'ollama',
  defaultProvider: 'ollama',
  enableFallback: true,
  ollama: {
    baseUrl: 'http://localhost:11434',
    model: 'qwen3-vl:4b',
    temperature: 0.7,
    maxTokens: 2048,
  },
};

export interface LLMProvider {
  name: string;
  type: 'ollama' | 'openai' | 'anthropic' | 'lmstudio' | 'custom';
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export class LLMService {
  constructor() {
    this.loadGlobalConfiguration();
  }

  /**
   * Load global configuration from home directory
   */
  private loadGlobalConfiguration() {
    try {
      if (fs.existsSync(GLOBAL_LLM_CONFIG_PATH)) {
        const data = fs.readFileSync(GLOBAL_LLM_CONFIG_PATH, 'utf8');
        llmConfigStore = JSON.parse(data);
        console.log(`[LLMService] Loaded global LLM configuration from ${GLOBAL_LLM_CONFIG_PATH}`);
      } else {
        // Ensure directory exists for future saves
        fs.mkdirSync(path.dirname(GLOBAL_LLM_CONFIG_PATH), { recursive: true });
      }
    } catch (error) {
      console.warn('[LLMService] Failed to load global LLM configuration:', error);
    }
  }

  /**
   * Save global configuration to home directory
   */
  private saveGlobalConfiguration() {
    try {
      fs.writeFileSync(GLOBAL_LLM_CONFIG_PATH, JSON.stringify(llmConfigStore, null, 2), 'utf8');
    } catch (error) {
      console.error('[LLMService] Failed to save global LLM configuration:', error);
    }
  }

  /**
   * Get current LLM configuration
   */
  async getConfiguration(): Promise<LLMConfiguration> {
    return llmConfigStore;
  }

  /**
   * Update LLM configuration
   */
  async updateConfiguration(config: Partial<LLMConfiguration>): Promise<LLMConfiguration> {
    llmConfigStore = { ...llmConfigStore, ...config };
    this.saveGlobalConfiguration();
    return llmConfigStore;
  }

  /**
   * Test LLM provider connection
   */
  async testConnection(provider: LLMProvider): Promise<{ success: boolean; message: string }> {
    try {
      switch (provider.type) {
        case 'ollama':
          return await this.testOllamaConnection(provider);
        case 'openai':
          return await this.testOpenAIConnection(provider);
        case 'anthropic':
          return await this.testAnthropicConnection(provider);
        case 'lmstudio':
          return await this.testLMStudioConnection(provider);
        default:
          return { success: false, message: 'Unknown provider type' };
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
      };
    }
  }

  /**
   * Test Ollama connection
   */
  private async testOllamaConnection(provider: LLMProvider): Promise<{ success: boolean; message: string }> {
    const baseUrl = provider.baseUrl || 'http://localhost:11434';
    try {
      const response = await fetch(`${baseUrl}/api/tags`);
      if (!response.ok) {
        return { success: false, message: `Ollama server returned ${response.status}` };
      }
      const data = (await response.json()) as any;
      const models = (data.models || []).map((m: any) => m.name);
      return {
        success: true,
        message: `Connected to Ollama. Available models: ${models.join(', ') || 'none'}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to connect to Ollama at ${baseUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Test OpenAI connection
   */
  private async testOpenAIConnection(provider: LLMProvider): Promise<{ success: boolean; message: string }> {
    if (!provider.apiKey) {
      return { success: false, message: 'OpenAI API key is required' };
    }
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          Authorization: `Bearer ${provider.apiKey}`,
        },
      });
      if (!response.ok) {
        return { success: false, message: `OpenAI API returned ${response.status}` };
      }
      return { success: true, message: 'Successfully connected to OpenAI API' };
    } catch (error) {
      return {
        success: false,
        message: `Failed to connect to OpenAI: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Test Anthropic connection
   */
  private async testAnthropicConnection(provider: LLMProvider): Promise<{ success: boolean; message: string }> {
    if (!provider.apiKey) {
      return { success: false, message: 'Anthropic API key is required' };
    }
    try {
      const response = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': provider.apiKey,
        },
      });
      if (!response.ok) {
        return { success: false, message: `Anthropic API returned ${response.status}` };
      }
      return { success: true, message: 'Successfully connected to Anthropic API' };
    } catch (error) {
      return {
        success: false,
        message: `Failed to connect to Anthropic: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Test LM Studio connection
   */
  private async testLMStudioConnection(provider: LLMProvider): Promise<{ success: boolean; message: string }> {
    const baseUrl = provider.baseUrl || 'http://localhost:1234';
    try {
      const response = await fetch(`${baseUrl}/v1/models`);
      if (!response.ok) {
        return { success: false, message: `LM Studio returned ${response.status}` };
      }
      const data = (await response.json()) as any;
      const models = (data.data || []).map((m: any) => m.id);
      return {
        success: true,
        message: `Connected to LM Studio. Available models: ${models.join(', ') || 'none'}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to connect to LM Studio at ${baseUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get available models for a provider
   */
  async getAvailableModels(provider: LLMProvider): Promise<string[]> {
    try {
      switch (provider.type) {
        case 'ollama':
          return await this.getOllamaModels(provider);
        case 'openai':
          return await this.getOpenAIModels(provider);
        case 'lmstudio':
          return await this.getLMStudioModels(provider);
        default:
          return [];
      }
    } catch (error) {
      console.error('Failed to get available models:', error);
      return [];
    }
  }

  /**
   * Get Ollama models
   */
  private async getOllamaModels(provider: LLMProvider): Promise<string[]> {
    const baseUrl = provider.baseUrl || 'http://localhost:11434';
    const response = await fetch(`${baseUrl}/api/tags`);
    if (!response.ok) return [];
    const data = (await response.json()) as any;
    return (data.models || []).map((m: any) => m.name);
  }

  /**
   * Get OpenAI models
   */
  private async getOpenAIModels(provider: LLMProvider): Promise<string[]> {
    if (!provider.apiKey) return [];
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
      },
    });
    if (!response.ok) return [];
    const data = (await response.json()) as any;
    return (data.data || []).map((m: any) => m.id);
  }

  /**
   * Get LM Studio models
   */
  private async getLMStudioModels(provider: LLMProvider): Promise<string[]> {
    const baseUrl = provider.baseUrl || 'http://localhost:1234';
    try {
      const response = await fetch(`${baseUrl}/v1/models`);
      if (!response.ok) return [];
      const data = (await response.json()) as any;
      return (data.data || []).map((m: any) => m.id);
    } catch (error) {
      console.error('Failed to get LM Studio models:', error);
      return [];
    }
  }
}
