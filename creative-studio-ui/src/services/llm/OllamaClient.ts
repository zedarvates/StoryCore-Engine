/**
 * Ollama Client Service
 * 
 * Handles communication with Ollama API for model detection,
 * generation, and health checks.
 */

import { OLLAMA_URL } from '../../config/apiConfig';
import { logger } from '@/utils/logger';
import { ConfigManager } from './ConfigManager';

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
  images?: string[]; // Base64 encoded images
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
   * Generate completion using Ollama with automatic retries
   */
  async generate(
    model: string,
    prompt: string,
    options?: OllamaGenerateOptions,
    signal?: AbortSignal
  ): Promise<string> {
    const startTime = Date.now();
    const maxRetries = 2;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        logger.info(`[OllamaClient] 🚀 Generation attempt ${attempt + 1}/${maxRetries + 1} for model: ${model}`);

        // DIAGNOSTIC: Check if Ollama is reachable
        const isHealthy = await this.healthCheck();
        if (!isHealthy) {
          if (attempt < maxRetries) {
            logger.warn(`[OllamaClient] ⚠️ Ollama not reachable, retrying in 2s...`);
            await new Promise(r => setTimeout(r, 2000));
            attempt++;
            continue;
          }
          throw new Error(`Ollama service not reachable at ${this.baseURL}`);
        }

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
            images: options?.images,
            stream: false,
          }),
          signal,
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unable to read error response');
          
          // If it's a 500 and we have retries left, wait and retry
          if (response.status === 500 && attempt < maxRetries) {
            logger.warn(`[OllamaClient] ⚠️ Received 500 Error, retrying attempt ${attempt + 2}...`, { errorText });
            const backoff = Math.pow(2, attempt) * 1000;
            await new Promise(r => setTimeout(r, backoff));
            attempt++;
            continue;
          }

          let errorMessage = response.statusText;
          try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.error) errorMessage = errorJson.error;
          } catch (_) {
            if (errorText.length > 0 && errorText.length < 200) errorMessage = errorText;
          }

          if (errorMessage.toLowerCase().includes('memory') || errorMessage.toLowerCase().includes('capacity')) {
            throw new Error(`LLM Memory Error: ${errorMessage}. Try selecting a smaller model.`);
          }
          
          throw new Error(`Generation failed (${response.status}): ${errorMessage}`);
        }

        const data: OllamaGenerateResponse = await response.json();
        const totalMs = Date.now() - startTime;
        logger.info(`[OllamaClient] ✅ Generation complete in ${totalMs}ms`);
        return data.response;

      } catch (error) {
        if (attempt >= maxRetries || (error instanceof Error && error.message.includes('Memory'))) {
          logger.error(`[OllamaClient] ❌ Generation failed permanently:`, error);
          throw error;
        }
        
        const backoff = Math.pow(2, attempt) * 1000;
        logger.warn(`[OllamaClient] ⚠️ Attempt ${attempt + 1} failed: ${error instanceof Error ? error.message : 'Unknown error'}. Retrying in ${backoff}ms...`);
        await new Promise(r => setTimeout(r, backoff));
        attempt++;
      }
    }
    
    throw new Error('Generation failed after maximum retries');
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
          images: options?.images,
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
  async getModelInfo(modelName: string): Promise<unknown> {
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
   * Generate embeddings for a text using Ollama
   */
  async embeddings(model: string, prompt: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.baseURL}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt }),
      });

      if (!response.ok) {
        throw new Error(`Embeddings generation failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.embedding;
    } catch (error) {
      logger.error('[OllamaClient] Embeddings generation failed:', error);
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

  /**
   * Dynamically detect the best available model for general tasks.
   * Prioritizes Llama 3 family, then Mistral, then Gemma.
   */
  async getBestAvailableModel(category: ModelMetadata['category'] = 'storytelling'): Promise<string> {
    try {
      const models = await this.listModels();
      // 0. Check ConfigManager for user preference first
      if (typeof window !== 'undefined') {
        const config = ConfigManager.getLLMConfig();
        if ((config.provider === 'local' || config.provider === 'lmstudio' || config.provider === 'custom') && config.model) {
          const found = models.find(m => m.name === config.model || m.name.split(':')[0] === config.model.split(':')[0]);
          if (found) return found.name;
        }
      }

      // 1. Try to find models by category first
      const categorizedModels = models.filter(m => m.category === category);
      if (categorizedModels.length > 0) {
        // Prefer llama3 or mistral within the category if possible
        const preferred = categorizedModels.find(m => 
          m.name.includes('llama3') || 
          m.name.includes('mistral') || 
          m.name.includes('llama2')
        );
        return preferred ? preferred.name : categorizedModels[0].name;
      }

      // 2. Global preferences if category match fails
      // Prioritize smaller models (4b, 8b, mini) over massive ones (70b, expert)
      const preferredNames = [
        'qwen3-vl:4b', 'gemma3:4b', 'gemma3:8b', 'llama3.2:3b', 'llama3.1:8b', 
        'gemma3', 'llama3.2', 'llama3.1', 'llama3:8b', 'qwen3', 'mistral', 'gemma', 'phi3', 'phi'
      ];
      
      for (const pref of preferredNames) {
        const found = models.find(m => m.name.toLowerCase().includes(pref) && !m.name.includes('70b'));
        if (found) return found.name;
      }
      
      // 3. Fallback to any small model or just the first available
      const smallish = models.find(m => !m.name.includes('70b'));
      return smallish ? smallish.name : models[0].name;
    } catch (error) {
      logger.error('[OllamaClient] Error detecting best model, falling back to gemma3:4b:', error);
      return 'gemma3:4b'; // Default fallback
    }
  }

}

// Export singleton instance
export const ollamaClient = new OllamaClient();

