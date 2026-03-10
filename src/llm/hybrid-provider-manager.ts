import { LLMProvider, LLMConfig, Message } from './interfaces';
import { LLMProviderManager } from './provider-manager';
import { LLDAProvider } from './diffusion-providers/llda-provider';

export interface HybridOptions {
  draftMode: boolean;        // If true, use local diffusion for everything
  speedThreshold: number;    // Latency threshold (ms)
  fallbackToQuality: boolean; // Fallback to cloud if local fails
}

/**
 * Hybrid provider manager that smartly switches between
 * fast local diffusion and high-quality cloud models.
 */
export class HybridProviderManager implements LLMProvider {
  private readonly qualityManager: LLMProviderManager;
  private readonly fastProvider: LLDAProvider;
  private options: HybridOptions;

  constructor(qualityManager: LLMProviderManager, fastProviderConfig: Partial<LLMConfig>, options?: Partial<HybridOptions>) {
    this.qualityManager = qualityManager;
    this.fastProvider = new LLDAProvider(fastProviderConfig);
    this.options = {
      draftMode: false,
      speedThreshold: 2000,
      fallbackToQuality: true,
      ...options,
    };
  }

  setOptions(options: Partial<HybridOptions>): void {
    this.options = { ...this.options, ...options };
  }

  async generateText(prompt: string, config?: Partial<LLMConfig>): Promise<string> {
    // SPECULATIVE ROUTING: For very short prompts, always try fast provider first
    const isVerySimple = prompt.length < 150;
    
    if (this.options.draftMode || isVerySimple) {
      try {
        const result = await this.fastProvider.generateText(prompt, config);
        if (isVerySimple) console.log(`[Hybrid] Speculative routing used fast provider for prompt: "${prompt.substring(0, 30)}..."`);
        return result;
      } catch (error) {
        if (this.options.fallbackToQuality || isVerySimple) {
          console.warn('Fast provider failed, falling back to quality manager');
          return this.qualityManager.generateText(prompt, config);
        }
        throw error;
      }
    }

    // Default to quality manager for non-draft mode
    return this.qualityManager.generateText(prompt, config);
  }

  async generateCompletion(messages: Message[], config?: Partial<LLMConfig>): Promise<string> {
    if (this.options.draftMode) {
      try {
        return await this.fastProvider.generateCompletion(messages, config);
      } catch (error) {
        if (this.options.fallbackToQuality) {
          console.warn('Fast provider failed, falling back to quality manager');
          return this.qualityManager.generateCompletion(messages, config);
        }
        throw error;
      }
    }

    return this.qualityManager.generateCompletion(messages, config);
  }

  async isAvailable(): Promise<boolean> {
    const fastAvailable = await this.fastProvider.isAvailable();
    if (fastAvailable) return true;
    return this.qualityManager.isAvailable();
  }

  /**
   * Performance-based routing (Experimental)
   */
  async generateOptimized(prompt: string, config?: Partial<LLMConfig>): Promise<{ text: string; provider: 'fast' | 'quality' }> {
    const isComplexityLow = prompt.length < 500; // Sample heuristic
    
    if (isComplexityLow && await this.fastProvider.isAvailable()) {
      try {
        const text = await this.fastProvider.generateText(prompt, config);
        return { text, provider: 'fast' };
      } catch {
        // fall through
      }
    }

    const text = await this.qualityManager.generateText(prompt, config);
    return { text, provider: 'quality' };
  }
}
