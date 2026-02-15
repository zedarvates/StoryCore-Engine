/**
 * Ollama Client Service
 * 
 * Handles communication with Ollama API for model detection,
 * generation, and health checks.
 */

import { OLLAMA_URL } from '../../config/apiConfig';
import { logger } from '@/utils/logger';

export interface ModelMetadata {
  name: string;
  category: 'vision' | 'storytelling' | 'quick' | 'technical' | 'general';
  size: string;
  available: boolean;
  capabilities: string[];
  recommendedFor: string[];
}

export interface OllamaGenerateOptions {
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  signal?: AbortSignal;
}

export interface OllamaGenerateResponse {
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

/**
 * Ollama API response model structure
 */
interface OllamaApiResponse {
  models: OllamaModel[];
}

interface OllamaModel {
  name: string;
  size: number;
  digest?: string;
  modified_at?: string;
}

/**
 * Ollama API Client
 */
export class OllamaClient {
  private readonly baseURL: string;

  constructor(baseURL: string = OLLAMA_URL) {
    this.baseURL = baseURL;
  }

  /**
   * List available models from Ollama
   */
  async listModels(): Promise<ModelMetadata[]> {
    try {
      const response = await fetch(`${this.baseURL}/api/tags`);

      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.statusText}`);
      }

      const data: OllamaApiResponse = await response.json();

      return data.models.map((model) => ({
        name: model.name,
        size: this.formatSize(model.size),
        available: true,
        category: this.detectCategory(model.name),
        capabilities: this.detectCapabilities(model.name),
        recommendedFor: this.getRecommendations(model.name),
      }));
    } catch (error) {
      logger.error('[OllamaClient] Failed to list models:', error);
      throw error;
    }
  }

  /**
   * Generate completion using Ollama
   */
  async generate(
    model: string,
    prompt: string,
    options?: OllamaGenerateOptions,
    signal?: AbortSignal
  ): Promise<string> {
    const startTime = Date.now();
    logger.info(`[OllamaClient] 🚀 Starting generation for model: ${model}`);
    logger.debug(`[OllamaClient] 📝 Prompt length: ${prompt.length} chars, maxTokens: ${options?.maxTokens || 2000}`);
    
    // DIAGNOSTIC: Check if Ollama is reachable before attempting generation
    const isHealthy = await this.healthCheck();
    if (!isHealthy) {
      logger.error(`[OllamaClient] ❌ Ollama service NOT reachable at ${this.baseURL}`);
      throw new Error(`Ollama service not reachable at ${this.baseURL}. Please ensure Ollama is running.`);
    }
    logger.info(`[OllamaClient] ✅ Ollama health check passed`);
    
    try {
      logger.debug(`[OllamaClient] 📤 Sending generate request to ${this.baseURL}/api/generate`);
      
      const response = await fetch(`${this.baseURL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          options: {
            temperature: options?.temperature || 0.7,
            num_predict: options?.maxTokens || 2000,
          },
          stream: false,
        }),
        signal,
      });

      const elapsedMs = Date.now() - startTime;
      logger.info(`[OllamaClient] ⏱️ Response received after ${elapsedMs}ms (status: ${response.status})`);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error response');
        logger.error(`[OllamaClient] ❌ Generation failed with status ${response.status}: ${errorText}`);
        throw new Error(`Generation failed: ${response.statusText}`);
      }

      const data: OllamaGenerateResponse = await response.json();
      const totalMs = Date.now() - startTime;
      logger.info(`[OllamaClient] ✅ Generation complete in ${totalMs}ms, response length: ${data.response?.length || 0} chars`);
      
      return data.response;
    } catch (error) {
      const elapsedMs = Date.now() - startTime;
      logger.error(`[OllamaClient] ❌ Generation failed after ${elapsedMs}ms:`, error);
      
      // DIAGNOSTIC: Add more context to the error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        logger.error(`[OllamaClient] 💡 This appears to be a network error - Ollama may not be running at ${this.baseURL}`);
      }
      throw error;
    }
  }

  /**
   * Generate streaming completion
   */
  async generateStream(
    model: string,
    prompt: string,
    onChunk: (chunk: string) => void,
    options?: OllamaGenerateOptions,
    signal?: AbortSignal
  ): Promise<string> {
    try {
      const response = await fetch(`${this.baseURL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          options: {
            temperature: options?.temperature || 0.7,
            num_predict: options?.maxTokens || 2000,
          },
          stream: true,
        }),
        signal,
      });

      if (!response.ok) {
        throw new Error(`Streaming generation failed: ${response.statusText}`);
      }

      return await this.processStream(response, onChunk);
    } catch (error) {
      logger.error('[OllamaClient] Streaming generation failed:', error);
      throw error;
    }
  }

  /**
   * Process streaming response
   */
  private async processStream(
    response: Response,
    onChunk: (chunk: string) => void
  ): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let fullContent = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const parsed: OllamaGenerateResponse = JSON.parse(line);
            if (parsed.response) {
              fullContent += parsed.response;
              onChunk(parsed.response);
            }
          } catch (e) {
            // Skip invalid JSON chunks - this is expected for partial/malformed streaming data
            logger.debug('[OllamaClient] Skipped invalid JSON chunk:', e);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullContent;
  }

  /**
   * Check if Ollama is running and accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get model metadata (size, parameters, etc.)
   */
  async getModelInfo(modelName: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/api/show`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get model info: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('[OllamaClient] Failed to get model info:', error);
      throw error;
    }
  }

  /**
   * Detect model category based on name
   */
  private detectCategory(modelName: string): ModelMetadata['category'] {
    const name = modelName.toLowerCase();

    // Check for technical models first (before checking for llama)
    if (name.includes('code') || name.includes('deepseek')) {
      return 'technical';
    }
    if (name.includes('vl') || name.includes('llava') || name.includes('vision')) {
      return 'vision';
    }
    if (name.includes('llama') || name.includes('mistral') || name.includes('neural-chat')) {
      return 'storytelling';
    }
    if (name.includes('gemma') || name.includes('phi')) {
      return 'quick';
    }

    return 'general';
  }

  /**
   * Detect model capabilities
   */
  private detectCapabilities(modelName: string): string[] {
    const caps: string[] = ['text'];
    const name = modelName.toLowerCase();

    if (name.includes('vl') || name.includes('llava') || name.includes('vision')) {
      caps.push('vision');
    }
    if (name.includes('code')) {
      caps.push('code');
    }

    return caps;
  }

  /**
   * Get recommended use cases for model
   */
  private getRecommendations(modelName: string): string[] {
    const recommendations: string[] = [];
    const name = modelName.toLowerCase();

    if (name.includes('vl') || name.includes('llava')) {
      recommendations.push('image-analysis', 'visual-design', 'storyboard-review');
    }
    if (name.includes('llama') || name.includes('mistral')) {
      recommendations.push('long-form-writing', 'storytelling', 'world-building');
    }
    if (name.includes('gemma')) {
      recommendations.push('quick-brainstorm', 'name-generation', 'simple-tasks');
    }
    if (name.includes('code')) {
      recommendations.push('code-generation', 'technical-writing');
    }

    return recommendations;
  }

  /**
   * Format size in human-readable format
   */
  private formatSize(bytes: number): string {
    const gb = bytes / (1024 ** 3);
    return `${gb.toFixed(1)}GB`;
  }

}

// Export singleton instance
export const ollamaClient = new OllamaClient();

