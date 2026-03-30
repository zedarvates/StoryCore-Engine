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
  images?: string[]; // Base64 encoded images
  keep_alive?: number | string; // Model retention in memory (0 = unload immediately)
}

export interface OllamaGenerateResponse {
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  load_duration_ms?: number;
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
      if (!response.ok) throw new Error(`Failed to list models: ${response.statusText}`);
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
   * Generate completion using Ollama with automatic retries and model fallback
   */
  async generate(
    model: string,
    prompt: string,
    options?: OllamaGenerateOptions,
    signal?: AbortSignal
  ): Promise<string> {
    const startTime = Date.now();
    const maxRetries = 0; // Let LLMService handle broad retries; local retries cause total wait time to explode
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        logger.info(`[OllamaClient] 🚀 Generation attempt ${attempt + 1}/${maxRetries + 1} for model: ${model}`);

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
            keep_alive: options?.keep_alive,
          }),
          signal,
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unable to read error response');
          
          // CASCADE FALLBACK: If 500 or Memory Error occurs, switch to a smaller model immediately
          if (response.status === 500 || errorText.toLowerCase().includes('memory') || errorText.toLowerCase().includes('capacity')) {
             logger.warn(`[OllamaClient] ⚠️ Resource Limit/Server Error detected: ${errorText}`);
             const fallbackModel = await this.getBestAvailableModel('quick');
             if (fallbackModel !== model) {
               logger.warn(`[OllamaClient] 🔄 Performance Fallback: Switching to ${fallbackModel} and restarting generation.`);
               return this.generate(fallbackModel, prompt, options, signal);
             }
          }

          if (response.status === 500 && attempt < maxRetries) {
            logger.warn(`[OllamaClient] ⚠️ Received 500 Error, retrying same model...`);
            await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
            attempt++;
            continue;
          }

          throw new Error(`Generation failed (${response.status}): ${errorText}`);
        }

        const data: OllamaGenerateResponse = await response.json();
        logger.info(`[OllamaClient] ✅ Generation complete in ${Date.now() - startTime}ms`);
        return data.response;

      } catch (error) {
        const errMessage = error instanceof Error ? error.message : 'Unknown';
        
        // Handle AbortSignal separately
        if (errMessage.includes('abort') || (error instanceof Error && error.name === 'AbortError')) {
          throw error;
        }

        if (attempt >= maxRetries) {
          if (maxRetries > 0) {
            logger.error(`[OllamaClient] ❌ Client-level retries exhausted (${maxRetries + 1} attempts). Error:`, error);
          } else {
            logger.warn(`[OllamaClient] ⚠️ Request failed: ${errMessage}. Re-throwing to LLMService for global retry logic.`);
          }
          throw error;
        }
        
        const delay = Math.pow(2, attempt) * 1000;
        logger.warn(`[OllamaClient] 🔄 Retrying in ${delay}ms... (Error: ${errMessage})`);
        await new Promise(r => setTimeout(r, delay));
        attempt++;
      }
    }
    
    throw new Error('Generation failed after maximum retries');
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/api/tags`, { signal: AbortSignal.timeout(3000) });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Detect the best available model
   */
  async getBestAvailableModel(category: ModelMetadata['category'] = 'storytelling'): Promise<string> {
    try {
      const models = await this.listModels();
      const categorized = models.filter(m => m.category === category);
      if (categorized.length > 0) return categorized[0].name;

      const Fallbacks = ['llama3.2', 'llama3.1', 'gemma3', 'mistral', 'phi3'];
      for (const pref of Fallbacks) {
        const found = models.find(m => m.name.toLowerCase().includes(pref));
        if (found) return found.name;
      }
      return models.length > 0 ? models[0].name : 'gemma3:4b';
    } catch {
      return 'gemma3:4b'; // Absolute safety fallback
    }
  }

  private detectCategory(name: string): ModelMetadata['category'] {
    const n = name.toLowerCase();
    if (n.includes('code') || n.includes('deepseek')) return 'technical';
    if (n.includes('vl') || n.includes('llava')) return 'vision';
    if (n.includes('llama') || n.includes('mistral')) return 'storytelling';
    if (n.includes('gemma') || n.includes('phi')) return 'quick';
    return 'general';
  }

  private detectCapabilities(name: string): string[] {
    const caps = ['text'];
    if (name.toLowerCase().match(/vl|llava|vision/)) caps.push('vision');
    return caps;
  }

  private getRecommendations(name: string): string[] {
    const n = name.toLowerCase();
    if (n.includes('llama')) return ['storytelling', 'narrative'];
    if (n.includes('gemma')) return ['quick-tasks', 'brainstorming'];
    return ['general-purpose'];
  }

  private formatSize(bytes: number): string {
    return `${(bytes / (1024 ** 3)).toFixed(1)}GB`;
  }
}

export const ollamaClient = new OllamaClient();
export default ollamaClient;
