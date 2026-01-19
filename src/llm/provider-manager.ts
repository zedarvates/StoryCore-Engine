import { LLMProvider, LLMConfig, Message } from './interfaces';
import { SecurityManager } from './security-manager';
import { OpenAIProvider } from './openai-provider';
import { OpenRouterProvider } from './openrouter-provider';
import { OllamaProvider } from './ollama-provider';
import { GrokProvider } from './grok-provider';
import { GeminiProvider } from './gemini-provider';

/**
 * Provider configuration with encrypted API key
 */
export interface ProviderConfig extends Omit<LLMConfig, 'apiKey'> {
  encryptedApiKey: string;
  enabled: boolean;
  priority: number; // Lower number = higher priority
}

/**
 * LLM Provider Manager
 *
 * Manages multiple LLM providers with:
 * - Encrypted API key storage
 * - Round-robin fallback strategy
 * - Configuration management
 * - Security features
 */
export class LLMProviderManager implements LLMProvider {
  private readonly securityManager: SecurityManager;
  private readonly providers: Map<string, LLMProvider> = new Map();
  private readonly providerConfigs: Map<string, ProviderConfig> = new Map();
  private currentProviderIndex = 0;
  private readonly providerNames: string[] = [];

  constructor(encryptionKey?: string) {
    this.securityManager = new SecurityManager(encryptionKey);
  }

  /**
   * Add or update a provider configuration
   */
  addProvider(name: string, config: Omit<ProviderConfig, 'encryptedApiKey'> & { apiKey?: string; encryptedApiKey?: string }): void {
    if (!config.enabled) {
      this.providerConfigs.delete(name);
      this.providers.delete(name);
      this.updateProviderNames();
      return;
    }

    let encryptedApiKey: string;
    if (config.apiKey) {
      encryptedApiKey = this.securityManager.encrypt(config.apiKey);
    } else if (config.encryptedApiKey) {
      encryptedApiKey = config.encryptedApiKey;
    } else {
      throw new Error(`No API key provided for provider ${name}`);
    }

    const providerConfig: ProviderConfig = {
      ...config,
      encryptedApiKey,
    };

    this.providerConfigs.set(name, providerConfig);
    this.providers.set(name, this.createProviderInstance(name, providerConfig));
    this.updateProviderNames();
  }

  /**
   * Remove a provider
   */
  removeProvider(name: string): void {
    this.providerConfigs.delete(name);
    this.providers.delete(name);
    this.updateProviderNames();
  }

  /**
   * Get provider configuration (with decrypted API key for internal use)
   */
  getProviderConfig(name: string): LLMConfig | null {
    const config = this.providerConfigs.get(name);
    if (!config) return null;

    return {
      provider: config.provider,
      baseUrl: config.baseUrl,
      apiKey: this.securityManager.decrypt(config.encryptedApiKey),
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      timeout: config.timeout,
      options: config.options,
    };
  }

  /**
   * Get all provider names
   */
  getProviderNames(): string[] {
    return [...this.providerNames];
  }

  /**
   * Generate text using round-robin fallback
   */
  async generateText(prompt: string, config?: Partial<LLMConfig>): Promise<string> {
    const errors: Error[] = [];

    for (let i = 0; i < this.providerNames.length; i++) {
      const providerName = this.providerNames[this.currentProviderIndex];
      this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providerNames.length;

      const provider = this.providers.get(providerName);
      if (!provider) continue;

      try {
        return await provider.generateText(prompt, config);
      } catch (error) {
        errors.push(error as Error);
        continue;
      }
    }

    throw new Error(`All providers failed: ${errors.map(e => e.message).join('; ')}`);
  }

  /**
   * Generate completion using round-robin fallback
   */
  async generateCompletion(messages: Message[], config?: Partial<LLMConfig>): Promise<string> {
    const errors: Error[] = [];

    for (let i = 0; i < this.providerNames.length; i++) {
      const providerName = this.providerNames[this.currentProviderIndex];
      this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providerNames.length;

      const provider = this.providers.get(providerName);
      if (!provider) continue;

      try {
        return await provider.generateCompletion(messages, config);
      } catch (error) {
        errors.push(error as Error);
        continue;
      }
    }

    throw new Error(`All providers failed: ${errors.map(e => e.message).join('; ')}`);
  }

  /**
   * Check if any provider is available
   */
  async isAvailable(): Promise<boolean> {
    for (const provider of this.providers.values()) {
      try {
        if (await provider.isAvailable()) {
          return true;
        }
      } catch {
        continue;
      }
    }
    return false;
  }

  /**
   * Get the current provider being used (for round-robin)
   */
  getCurrentProviderName(): string | null {
    return this.providerNames[this.currentProviderIndex] || null;
  }

  /**
   * Force switch to next provider in round-robin
   */
  switchToNextProvider(): void {
    this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providerNames.length;
  }

  private createProviderInstance(name: string, config: ProviderConfig): LLMProvider {
    const apiKey = this.securityManager.decrypt(config.encryptedApiKey);

    switch (config.provider.toLowerCase()) {
      case 'openai':
        return new OpenAIProvider(apiKey, config.baseUrl, config.timeout);

      case 'openrouter':
        return new OpenRouterProvider(apiKey, config.baseUrl, config.timeout);

      case 'ollama':
        return new OllamaProvider(config.baseUrl || 'http://localhost:11434', config.timeout);

      case 'grok':
        return new GrokProvider(apiKey, config.baseUrl, config.timeout);

      case 'gemini':
        return new GeminiProvider(apiKey, config.baseUrl, config.timeout);

      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  }

  private updateProviderNames(): void {
    this.providerNames.length = 0;
    this.providerNames.push(
      ...Array.from(this.providerConfigs.entries())
        .filter(([, config]) => config.enabled)
        .sort(([, a], [, b]) => a.priority - b.priority)
        .map(([name]) => name)
    );
  }
}