/**
 * LLM Service for Electron Main Process
 * Handles LLM provider configuration and communication
 */

import type { LLMConfiguration } from '../configurationTypes';

// Simple in-memory configuration store for LLM
const llmConfigStore: Record<string, any> = {
  llm: {
    provider: 'ollama',
    defaultProvider: 'ollama',
    enableFallback: true,
    ollama: {
      baseUrl: 'http://localhost:11434',
      model: 'mistral',
      temperature: 0.7,
      maxTokens: 2048,
    },
  },
};

export interface LLMProvider {
  name: string;
  type: 'ollama' | 'openai' | 'anthropic' | 'custom';
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export class LLMService {
  /**
   * Get current LLM configuration
   */
  async getConfiguration(): Promise<LLMConfiguration> {
    return llmConfigStore.llm || {
      provider: 'ollama',
      defaultProvider: 'ollama',
      enableFallback: true,
      ollama: {
        baseUrl: 'http://localhost:11434',
        model: 'mistral',
        temperature: 0.7,
        maxTokens: 2048,
      },
    };
  }

  /**
   * Update LLM configuration
   */
  async updateConfiguration(config: Partial<LLMConfiguration>): Promise<LLMConfiguration> {
    const current = await this.getConfiguration();
    const updated = { ...current, ...config };
    llmConfigStore.llm = updated;
    return updated;
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
   * Get available models for a provider
   */
  async getAvailableModels(provider: LLMProvider): Promise<string[]> {
    try {
      switch (provider.type) {
        case 'ollama':
          return await this.getOllamaModels(provider);
        case 'openai':
          return await this.getOpenAIModels(provider);
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
}
