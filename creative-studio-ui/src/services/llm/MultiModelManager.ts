/**
 * Multi-Model Manager Service
 * 
 * Manages multiple Ollama models, handles model selection,
 * fallback chains, and availability checking.
 */

import { OllamaClient, type ModelMetadata } from './OllamaClient';
import { logger } from '@/utils/logger';

export interface LLMConfig {
  provider: 'local' | 'openai' | 'anthropic' | 'custom';
  model: string;
  apiEndpoint?: string;
  availableModels?: {
    vision: string[];
    storytelling: string[];
    quick: string[];
    default: string;
  };
}

export type TaskType = 'vision' | 'storytelling' | 'quick' | 'general';

/**
 * Multi-Model Manager
 */
export class MultiModelManager {
  private config: LLMConfig;
  private ollamaClient: OllamaClient;
  private availableModels: Map<string, ModelMetadata>;
  private modelCache: Map<string, boolean>;

  constructor(config: LLMConfig) {
    this.config = config;
    this.ollamaClient = new OllamaClient(config.apiEndpoint || 'http://localhost:11434');
    this.availableModels = new Map();
    this.modelCache = new Map();
  }

  /**
   * Detect available models from Ollama
   */
  async detectAvailableModels(): Promise<ModelMetadata[]> {
    try {
      const models = await this.ollamaClient.listModels();
      
      // Update available models map
      this.availableModels.clear();
      models.forEach(model => {
        this.availableModels.set(model.name, model);
        this.modelCache.set(model.name, true);
      });

      logger.debug(`[MultiModelManager] Detected ${models.length} models`);
      return models;
    } catch (error) {
      logger.error('[MultiModelManager] Failed to detect models:', error);
      return [];
    }
  }

  /**
   * Get model for specific task type (manual selection for MVP)
   */
  getModelForTask(taskType: TaskType): string {
    const models = this.config.availableModels;
    
    if (!models) {
      return this.config.model;
    }

    // Get models for this task type
    let taskModels: string[] = [];
    
    switch (taskType) {
      case 'vision':
        taskModels = models.vision || [];
        break;
      case 'storytelling':
        taskModels = models.storytelling || [];
        break;
      case 'quick':
        taskModels = models.quick || [];
        break;
      default:
        return models.default || this.config.model;
    }

    // Find first available model
    for (const model of taskModels) {
      if (this.isModelAvailable(model)) {
        return model;
      }
    }

    // Fallback to default
    return models.default || this.config.model;
  }

  /**
   * Check if a specific model is available
   */
  isModelAvailable(modelName: string): boolean {
    // Check cache first
    if (this.modelCache.has(modelName)) {
      return this.modelCache.get(modelName)!;
    }

    // Check in available models map
    return this.availableModels.has(modelName);
  }

  /**
   * Get fallback chain for a model
   * Returns array of models to try in order
   */
  getFallbackChain(preferredModel: string): string[] {
    const chain: string[] = [preferredModel];
    
    // Determine task type from model name
    const metadata = this.availableModels.get(preferredModel);
    const taskType = metadata?.category || 'general';

    // Add alternatives from same category
    const models = this.config.availableModels;
    if (models) {
      let alternatives: string[] = [];
      
      switch (taskType) {
        case 'vision':
          alternatives = models.vision || [];
          break;
        case 'storytelling':
          alternatives = models.storytelling || [];
          break;
        case 'quick':
          alternatives = models.quick || [];
          break;
      }

      // Add available alternatives
      alternatives.forEach(model => {
        if (model !== preferredModel && this.isModelAvailable(model)) {
          chain.push(model);
        }
      });

      // Add default as final fallback
      if (models.default && !chain.includes(models.default)) {
        chain.push(models.default);
      }
    }

    return chain;
  }

  /**
   * Get model metadata
   */
  getModelMetadata(modelName: string): ModelMetadata | undefined {
    return this.availableModels.get(modelName);
  }

  /**
   * Get all available models by category
   */
  getModelsByCategory(category: ModelMetadata['category']): ModelMetadata[] {
    return Array.from(this.availableModels.values())
      .filter(model => model.category === category);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LLMConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (config.apiEndpoint) {
      this.ollamaClient = new OllamaClient(config.apiEndpoint);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): LLMConfig {
    return { ...this.config };
  }

  /**
   * Check Ollama health
   */
  async checkHealth(): Promise<boolean> {
    return await this.ollamaClient.healthCheck();
  }

  /**
   * Get model usage statistics (placeholder for future implementation)
   */
  getModelStats(modelName: string): {
    usageCount: number;
    lastUsed?: Date;
    averageLatency?: number;
  } {
    // TODO: Implement usage tracking
    return {
      usageCount: 0,
      lastUsed: undefined,
      averageLatency: undefined,
    };
  }

  /**
   * Refresh model cache
   */
  async refreshCache(): Promise<void> {
    this.modelCache.clear();
    await this.detectAvailableModels();
  }

  /**
   * Get recommended model for task
   */
  getRecommendedModel(taskType: TaskType): {
    model: string;
    reason: string;
    alternatives: string[];
  } {
    const model = this.getModelForTask(taskType);
    const metadata = this.getModelMetadata(model);
    const fallbackChain = this.getFallbackChain(model);

    return {
      model,
      reason: metadata 
        ? `Recommended for ${taskType}: ${metadata.recommendedFor.join(', ')}`
        : `Default model for ${taskType} tasks`,
      alternatives: fallbackChain.slice(1),
    };
  }
}
