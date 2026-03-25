/**
 * LLM Service
 * 
 * Handles communication with various LLM providers (OpenAI, Anthropic, local, custom)
 * Supports streaming responses, retry logic, and error handling
 */

import { ollamaClient, OllamaClient } from './llm/OllamaClient';
import { OLLAMA_URL, LM_STUDIO_URL } from '../config/apiConfig';
import { logger } from '../utils/logger';
import { backendApiService } from './backendApiService';


/**
 * Supported LLM providers
 */
export type LLMProvider = 'openai' | 'anthropic' | 'openrouter' | 'local' | 'lmstudio' | 'custom' | 'diffusion';

/**
 * LLM provider configuration
 */
export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  apiEndpoint?: string; // for custom/local providers
  model: string;
  parameters: {
    temperature: number; // 0-2
    maxTokens: number;
    topP: number; // 0-1
    frequencyPenalty: number; // -2 to 2
    presencePenalty: number; // -2 to 2
    draftMode?: boolean;      // Use local diffusion for fast drafting
    creativityMode?: string;
    jokesEnabled?: boolean;
    wordGamesEnabled?: boolean;
    probabilityFramingEnabled?: boolean;
    vectorialOptimization?: string;
    embeddingModel?: string;
    similarityThreshold?: number;
  };
  systemPrompts: {
    worldGeneration: string;
    characterGeneration: string;
    dialogueGeneration: string;
  };
  timeout: number; // milliseconds
  retryAttempts: number;
  streamingEnabled: boolean;
}

/**
 * LLM request payload
 */
export interface LLMRequest {
  prompt: string;
  systemPrompt?: string;
  context?: Record<string, unknown>;
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
  images?: string[]; // Base64 encoded images for vision models
}

/**
 * LLM response
 */
export interface LLMResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  finish_reason?: string;
}

export interface ImageGenerationOptions {
  prompt: string;
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  model?: 'dall-e-2' | 'dall-e-3';
}

/**
 * Music generation options
 */
export interface MusicGenerationOptions {
  style?: string;
  genre?: string;
  duration?: number;
  mood?: string[];
  instrumentation?: string[];
  bpm?: number;
  key?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Lyrics generation options
 */
export interface LyricsGenerationOptions {
  style?: string;
  theme?: string;
  mood?: string[];
  length?: 'short' | 'medium' | 'long';
  includeMelody?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  size: string;
  model: string;
  createdAt: Date;
  revisedPrompt?: string;
  metadata?: Record<string, unknown>;
}

/**
 * LLM error categories for better error handling
 */
export const LLMErrorCategory = {
  AUTHENTICATION: 'authentication',
  RATE_LIMIT: 'rate_limit',
  TIMEOUT: 'timeout',
  NETWORK: 'network',
  INVALID_REQUEST: 'invalid_request',
  CONTENT_FILTER: 'content_filter',
  SERVER_ERROR: 'server_error',
  RESOURCE_EXHAUSTED: 'resource_exhausted',
  UNKNOWN: 'unknown',
} as const;

export type LLMErrorCategory = typeof LLMErrorCategory[keyof typeof LLMErrorCategory];

/**
 * Recovery action for errors
 */
export interface RecoveryAction {
  label: string;
  action: () => void | Promise<void>;
  primary: boolean;
}

/**
 * Error recovery options
 */
export interface ErrorRecoveryOptions {
  message: string;
  userMessage: string; // User-friendly message
  actions: RecoveryAction[];
  fallbackData?: unknown;
  retryable: boolean;
  category: LLMErrorCategory;
}

/**
 * LLM error types
 */
export class LLMError extends Error {
  code: string;
  retryable: boolean;
  details?: unknown;
  category: LLMErrorCategory;

  constructor(
    message: string,
    code: string,
    retryable: boolean = false,
    details?: unknown,
    category?: LLMErrorCategory
  ) {
    super(message);
    this.name = 'LLMError';
    this.code = code;
    this.retryable = retryable;
    this.details = details;
    this.category = category || this.categorizeError(code);
  }

  /**
   * Categorize error based on error code
   */
  private categorizeError(code: string): LLMErrorCategory {
    if (code.includes('auth') || code.includes('api_key') || code.includes('invalid_api_key')) {
      return LLMErrorCategory.AUTHENTICATION;
    }
    if (code.includes('rate_limit') || code === '429') {
      return LLMErrorCategory.RATE_LIMIT;
    }
    if (code === 'timeout') {
      return LLMErrorCategory.TIMEOUT;
    }
    if (code.includes('network') || code.includes('connection')) {
      return LLMErrorCategory.NETWORK;
    }
    if (code.includes('invalid') || code.includes('bad_request')) {
      return LLMErrorCategory.INVALID_REQUEST;
    }
    if (code.includes('content_filter') || code.includes('safety')) {
      return LLMErrorCategory.CONTENT_FILTER;
    }
    if (code.includes('server') || code.includes('500') || code.includes('503')) {
      // Check for specific resource issues in message if available
      if (this.message?.toLowerCase().includes('memory') || this.message?.toLowerCase().includes('available')) {
        return LLMErrorCategory.RESOURCE_EXHAUSTED;
      }
      return LLMErrorCategory.SERVER_ERROR;
    }
    if (code.includes('memory') || code.includes('resource')) {
      return LLMErrorCategory.RESOURCE_EXHAUSTED;
    }
    return LLMErrorCategory.UNKNOWN;
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    switch (this.category) {
      case LLMErrorCategory.AUTHENTICATION:
        return 'Authentication failed. Please check your API key in settings.';
      case LLMErrorCategory.RATE_LIMIT:
        return 'Rate limit exceeded. Please wait a moment and try again.';
      case LLMErrorCategory.TIMEOUT:
        return 'Request timed out. The AI service is taking too long to respond.';
      case LLMErrorCategory.NETWORK:
        return 'Network error. Please check your internet connection.';
      case LLMErrorCategory.INVALID_REQUEST:
        return 'Invalid request. Please check your input and try again.';
      case LLMErrorCategory.CONTENT_FILTER:
        return 'Content was filtered by safety guidelines. Please try different input.';
      case LLMErrorCategory.SERVER_ERROR:
        return 'AI service is temporarily unavailable. Please try again later.';
      case LLMErrorCategory.RESOURCE_EXHAUSTED:
        return 'The selected model is too large for your system memory. Please choose a smaller model (e.g., llama3:8b instead of 70b) in the LLM configuration.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Get suggested recovery actions
   */
  getSuggestedActions(): string[] {
    switch (this.category) {
      case LLMErrorCategory.AUTHENTICATION:
        return [
          'Verify your API key in settings',
          'Check that your API key has the correct permissions',
          'Ensure your account has sufficient credits',
        ];
      case LLMErrorCategory.RATE_LIMIT:
        return [
          'Wait a few moments before retrying',
          'Reduce the frequency of requests',
          'Consider upgrading your API plan',
        ];
      case LLMErrorCategory.TIMEOUT:
        return [
          'Try again with a shorter prompt',
          'Check your internet connection',
          'Increase the timeout setting',
        ];
      case LLMErrorCategory.NETWORK:
        return [
          'Check your internet connection',
          'Verify the API endpoint is accessible',
          'Try again in a moment',
        ];
      case LLMErrorCategory.INVALID_REQUEST:
        return [
          'Review your input for errors',
          'Ensure all required fields are filled',
          'Check parameter values are within valid ranges',
        ];
      case LLMErrorCategory.CONTENT_FILTER:
        return [
          'Modify your prompt to avoid sensitive content',
          'Try a different approach to your request',
          'Review content guidelines for the AI service',
        ];
      case LLMErrorCategory.SERVER_ERROR:
        return [
          'Wait a few minutes and try again',
          'Check the AI service status page',
          'Try a different AI provider if available',
        ];
      default:
        return [
          'Try again',
          'Check your settings',
          'Contact support if the problem persists',
        ];
    }
  }
}

/**
 * API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Streaming chunk callback
 */
export type StreamChunkCallback = (chunk: string) => void;

/**
 * Default LLM configuration
 */
const DEFAULT_CONFIG: LLMConfig = {
  provider: 'local',
  apiKey: '',
  model: 'qwen3-vl:4b',
  parameters: {
    temperature: 0.7,
    maxTokens: 2000,
    topP: 1.0,
    frequencyPenalty: 0,
    presencePenalty: 0,
  },
  systemPrompts: {
    worldGeneration: 'You are a creative world-building assistant...',
    characterGeneration: 'You are a character development expert...',
    dialogueGeneration: 'You are a dialogue writing specialist...',
  },
  timeout: 300000, // 300 seconds (5 minutes) - local models like Ollama need more time for model loading and generation
  retryAttempts: 3,
  streamingEnabled: true,
};

/**
 * Abstract LLM Provider base class
 */
abstract class LLMProviderBase {
  protected config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  /**
   * Generate completion
   */
  abstract generateCompletion(request: LLMRequest, signal?: AbortSignal): Promise<LLMResponse>;

  /**
   * Generate streaming completion
   */
  abstract generateStreamingCompletion(
    request: LLMRequest,
    onChunk: StreamChunkCallback,
    signal?: AbortSignal,
    modelOverride?: string
  ): Promise<LLMResponse>;

  /**
   * Validate connection
   */
  abstract validateConnection(): Promise<boolean>;

  /**
   * Get provider name
   */
  abstract getProviderName(): string;

  /**
   * Generate image (optional, only supported by some providers)
   */
  generateImage?(options: ImageGenerationOptions): Promise<GeneratedImage>;

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LLMConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): LLMConfig {
    return { ...this.config };
  }
}

/**
 * OpenAI Provider Implementation
 */
class OpenAIProvider extends LLMProviderBase {
  private readonly baseUrl = 'https://api.openai.com/v1';

  getProviderName(): string {
    return 'OpenAI';
  }

  async generateCompletion(request: LLMRequest, signal?: AbortSignal): Promise<LLMResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
          {
            role: 'user',
            content: request.images && request.images.length > 0
              ? [
                { type: 'text', text: request.prompt },
                ...request.images.map(img => ({
                  type: 'image_url',
                  image_url: { url: img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}` }
                }))
              ]
              : request.prompt
          },
        ],
        temperature: request.temperature ?? this.config.parameters.temperature,
        max_tokens: request.maxTokens ?? this.config.parameters.maxTokens,
        top_p: this.config.parameters.topP,
        frequency_penalty: this.config.parameters.frequencyPenalty,
        presence_penalty: this.config.parameters.presencePenalty,
        stream: false,
      }),
      signal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new LLMError(
        error.error?.message || 'OpenAI API request failed',
        error.error?.code || 'api_error',
        response.status === 429 || response.status >= 500,
        error
      );
    }

    const data = await response.json();
    const choice = data.choices[0];

    return {
      content: choice.message.content,
      finish_reason: choice.finish_reason,
      usage: {
        prompt_tokens: data.usage.prompt_tokens,
        completion_tokens: data.usage.completion_tokens,
        total_tokens: data.usage.total_tokens,
      },
    };
  }

  async generateStreamingCompletion(
    request: LLMRequest,
    onChunk: StreamChunkCallback,
    signal?: AbortSignal,
    modelOverride?: string
  ): Promise<LLMResponse> {
    const model = modelOverride || this.config.model;
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
          {
            role: 'user',
            content: request.images && request.images.length > 0
              ? [
                { type: 'text', text: request.prompt },
                ...request.images.map(img => ({
                  type: 'image_url',
                  image_url: { url: img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}` }
                }))
              ]
              : request.prompt
          },
        ],
        temperature: request.temperature ?? this.config.parameters.temperature,
        max_tokens: request.maxTokens ?? this.config.parameters.maxTokens,
        top_p: this.config.parameters.topP,
        frequency_penalty: this.config.parameters.frequencyPenalty,
        presence_penalty: this.config.parameters.presencePenalty,
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new LLMError(
        error.error?.message || 'OpenAI API request failed',
        error.error?.code || 'api_error',
        response.status === 429 || response.status >= 500,
        error
      );
    }

    return this.processStream(response, onChunk);
  }

  private async processStream(
    response: Response,
    onChunk: StreamChunkCallback
  ): Promise<LLMResponse> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new LLMError('No response body', 'stream_error', false);
    }

    const decoder = new TextDecoder();
    let fullContent = '';
    let finish_reason: LLMResponse['finish_reason'] = 'stop';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim().startsWith('data: '));

        for (const line of lines) {
          const data = line.replace('data: ', '').trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              onChunk(delta);
            }
            if (parsed.choices[0]?.finish_reason) {
              finish_reason = parsed.choices[0].finish_reason;
            }
          } catch {
            // Skip invalid JSON chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return {
      content: fullContent,
      finish_reason,
    };
  }

  async validateConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Generate image using DALL-E
   */
  async generateImage(options: ImageGenerationOptions): Promise<GeneratedImage> {
    const response = await fetch(`${this.baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        prompt: options.prompt,
        model: options.model || 'dall-e-3',
        n: 1,
        size: options.size || '1024x1024',
        quality: options.quality || 'standard',
        style: options.style || 'vivid',
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new LLMError(
        error.error?.message || 'DALL-E API request failed',
        error.error?.code || 'image_generation_error',
        response.status === 429 || response.status >= 500,
        error
      );
    }

    const data = await response.json();
    const image = data.data[0];

    return {
      id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      url: image.url,
      prompt: options.prompt,
      size: options.size || '1024x1024',
      model: options.model || 'dall-e-3',
      createdAt: new Date(),
      revisedPrompt: image.revised_prompt,
      metadata: {
        quality: options.quality,
        style: options.style,
      }
    };
  }
}

/**
 * Anthropic Provider Implementation
 */
class AnthropicProvider extends LLMProviderBase {
  private readonly baseUrl = 'https://api.anthropic.com/v1';

  getProviderName(): string {
    return 'Anthropic';
  }

  async generateCompletion(request: LLMRequest, signal?: AbortSignal): Promise<LLMResponse> {
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: request.maxTokens ?? this.config.parameters.maxTokens,
        temperature: request.temperature ?? this.config.parameters.temperature,
        system: request.systemPrompt,
        messages: [
          {
            role: 'user',
            content: request.images && request.images.length > 0
              ? [
                ...request.images.map(img => ({
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/jpeg',
                    data: img.startsWith('data:') ? img.split(',')[1] : img
                  }
                })),
                { type: 'text', text: request.prompt }
              ]
              : request.prompt
          },
        ],
        stream: false,
      }),
      signal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new LLMError(
        error.error?.message || 'Anthropic API request failed',
        error.error?.type || 'api_error',
        response.status === 429 || response.status >= 500,
        error
      );
    }

    const data = await response.json();

    return {
      content: data.content[0].text,
      finish_reason: data.stop_reason === 'end_turn' ? 'stop' : data.stop_reason,
      usage: {
        prompt_tokens: data.usage.input_tokens,
        completion_tokens: data.usage.output_tokens,
        total_tokens: data.usage.input_tokens + data.usage.output_tokens,
      },
    };
  }

  async generateStreamingCompletion(
    request: LLMRequest,
    onChunk: StreamChunkCallback,
    signal?: AbortSignal,
    modelOverride?: string
  ): Promise<LLMResponse> {
    const model = modelOverride || this.config.model;
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: request.maxTokens ?? this.config.parameters.maxTokens,
        temperature: request.temperature ?? this.config.parameters.temperature,
        system: request.systemPrompt,
        messages: [
          {
            role: 'user',
            content: request.images && request.images.length > 0
              ? [
                ...request.images.map(img => ({
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/jpeg',
                    data: img.startsWith('data:') ? img.split(',')[1] : img
                  }
                })),
                { type: 'text', text: request.prompt }
              ]
              : request.prompt
          },
        ],
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new LLMError(
        error.error?.message || 'Anthropic API request failed',
        error.error?.type || 'api_error',
        response.status === 429 || response.status >= 500,
        error
      );
    }

    return this.processStream(response, onChunk);
  }

  private async processStream(
    response: Response,
    onChunk: StreamChunkCallback
  ): Promise<LLMResponse> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new LLMError('No response body', 'stream_error', false);
    }

    const decoder = new TextDecoder();
    let fullContent = '';
    let finish_reason: LLMResponse['finish_reason'] = 'stop';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim().startsWith('data: '));

        for (const line of lines) {
          const data = line.replace('data: ', '').trim();

          try {
            const parsed = JSON.parse(data);

            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              const text = parsed.delta.text;
              fullContent += text;
              onChunk(text);
            }

            if (parsed.type === 'message_stop') {
              finish_reason = 'stop';
            }
          } catch {
            // Skip invalid JSON chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return {
      content: fullContent,
      finish_reason: finish_reason,
    };
  }

  async validateConnection(): Promise<boolean> {
    try {
      // Anthropic doesn't have a simple health check endpoint
      // We'll do a minimal request to validate the API key
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }],
        }),
      });
      return response.ok || response.status === 400; // 400 is ok, means auth worked
    } catch {
      return false;
    }
  }
}

/**
 * OpenRouter Provider Implementation
 */
class OpenRouterProvider extends LLMProviderBase {
  private readonly baseUrl = 'https://openrouter.ai/api/v1';

  getProviderName(): string {
    return 'OpenRouter';
  }

  async generateCompletion(request: LLMRequest, signal?: AbortSignal): Promise<LLMResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'StoryCore Creative Studio',
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
          { role: 'user', content: request.prompt },
        ],
        temperature: request.temperature ?? this.config.parameters.temperature,
        max_tokens: request.maxTokens ?? this.config.parameters.maxTokens,
        stream: false,
      }),
      signal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new LLMError(
        error.error?.message || 'OpenRouter API request failed',
        error.error?.code || 'api_error',
        response.status === 429 || response.status >= 500,
        error
      );
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      usage: data.usage,
    };
  }

  async generateStreamingCompletion(
    request: LLMRequest,
    onChunk: StreamChunkCallback,
    signal?: AbortSignal,
    modelOverride?: string
  ): Promise<LLMResponse> {
    const model = modelOverride || this.config.model;
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'HTTP-Referer': (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'),
        'X-Title': 'StoryCore Creative Studio',
      },
      body: JSON.stringify({
        model,
        messages: [
          ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
          { role: 'user', content: request.prompt },
        ],
        temperature: request.temperature ?? this.config.parameters.temperature,
        max_tokens: request.maxTokens ?? this.config.parameters.maxTokens,
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new LLMError(
        error.error?.message || 'OpenRouter API request failed',
        error.error?.code || 'api_error',
        response.status === 429 || response.status >= 500,
        error
      );
    }

    return this.processStream(response, onChunk);
  }

  private async processStream(
    response: Response,
    onChunk: StreamChunkCallback
  ): Promise<LLMResponse> {
    const reader = response.body?.getReader();
    if (!reader) throw new LLMError('No response body', 'stream_error', false);

    const decoder = new TextDecoder();
    let fullContent = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => {
          const trimmed = line.trim();
          return trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]';
        });

        for (const line of lines) {
          const data = line.replace('data: ', '').trim();
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              onChunk(delta);
            }
          } catch { /* skip invalid JSON */ }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return { content: fullContent };
  }

  async validateConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: { 'Authorization': `Bearer ${this.config.apiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Fetch available models from OpenRouter
   */
  async getAvailableModels(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/models`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.data || [];
    } catch {
      return [];
    }
  }
}

/**
 * Local/Custom Provider Implementation
 */
class CustomProvider extends LLMProviderBase {
  getProviderName(): string {
    return this.config.provider === 'local' ? 'Local' : this.config.provider === 'lmstudio' ? 'LM Studio' : 'Custom';
  }

  async generateCompletion(request: LLMRequest, signal?: AbortSignal): Promise<LLMResponse> {
    const endpoint = this.config.apiEndpoint || OLLAMA_URL;
    // Create a local OllamaClient instance with the correct endpoint
    const localClient = new OllamaClient(endpoint);

    try {
      // Use Ollama's native API format
      // Note: For models with extended thinking (like Qwen 3 VL), we need higher token limits
      // because thinking tokens are included in the count
      const maxTokens = request.maxTokens ?? this.config.parameters.maxTokens;
      const numPredict = Math.max(maxTokens * 2, 500);

      const prompt = request.systemPrompt
        ? `${request.systemPrompt}\n\n${request.prompt}`
        : request.prompt;

      const response = await localClient.generate(this.config.model, prompt, {
        temperature: request.temperature ?? this.config.parameters.temperature,
        maxTokens: numPredict,
        images: request.images,
      }, signal);

      return {
        content: response || '',
        finish_reason: 'stop',
      };
    } catch (error: unknown) {
      // HANDLE MODEL NOT FOUND: Automatically try to fallback to any available model
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (
        this.config.provider === 'local' && 
        (errorMessage.includes('Not Found') || errorMessage.includes('not found'))
      ) {
        logger.warn(`[CustomProvider] Model '${this.config.model}' not found. Attempting auto-fallback...`);
        try {
          const bestModel = await localClient.getBestAvailableModel();
          if (bestModel && bestModel !== this.config.model) {
            logger.info(`[CustomProvider] Falling back to available model: ${bestModel}`);
            
            const maxTokens = request.maxTokens ?? this.config.parameters.maxTokens;
            const numPredict = Math.max(maxTokens * 2, 500);
            const prompt = request.systemPrompt
              ? `${request.systemPrompt}\n\n${request.prompt}`
              : request.prompt;

            const response = await localClient.generate(bestModel, prompt, {
              temperature: request.temperature ?? this.config.parameters.temperature,
              maxTokens: numPredict,
              images: request.images,
            }, signal);

            return {
              content: response || '',
              finish_reason: 'stop',
            };
          }
        } catch (fallbackError) {
          logger.error('[CustomProvider] Fallback failed:', fallbackError);
        }
      }

      // Handle network errors
      if (error instanceof TypeError && (error as Error).message.includes('fetch')) {
        throw new LLMError(
          'Cannot connect to Ollama. Please ensure Ollama is running at ' + endpoint,
          'network',
          true,
          { endpoint, originalError: error.message }
        );
      }

      // Re-throw LLMError as-is
      if (error instanceof LLMError) {
        throw error;
      }

      // Wrap other errors
      const finalErrorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const isMemoryError = finalErrorMessage.toLowerCase().includes('memory') || finalErrorMessage.toLowerCase().includes('available');
      
      throw new LLMError(
        finalErrorMessage,
        isMemoryError ? 'resource_exhausted' : 'unknown',
        !isMemoryError, // Don't retry memory errors
        { originalError: error },
        isMemoryError ? LLMErrorCategory.RESOURCE_EXHAUSTED : undefined
      );
    }
  }

  async generateStreamingCompletion(
    request: LLMRequest,
    onChunk: StreamChunkCallback,
    signal?: AbortSignal,
    modelOverride?: string
  ): Promise<LLMResponse> {
    const endpoint = this.config.apiEndpoint || OLLAMA_URL;
    const model = modelOverride || this.config.model;

    try {
      // Use Ollama's native API format with streaming
      // Note: For models with extended thinking (like Qwen 3 VL), we need higher token limits
      // because thinking tokens are included in the count
      const maxTokens = request.maxTokens ?? this.config.parameters.maxTokens;
      const numPredict = Math.max(maxTokens * 2, 500); // Double the tokens to account for thinking

      const response = await fetch(`${endpoint}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt: request.systemPrompt
            ? `${request.systemPrompt}\n\n${request.prompt}`
            : request.prompt,
          stream: true,
          options: {
            temperature: request.temperature ?? this.config.parameters.temperature,
            num_predict: numPredict,
          },
          images: request.images,
        }),
        signal,
      });

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 404) {
          const errorData = await response.json().catch(() => ({}));
          const isModelMissing = errorData.error && (errorData.error.includes('not found') || errorData.error.includes('Not Found'));
          
          if (isModelMissing) {
             logger.warn(`[CustomProvider] Model '${this.config.model}' not found during streaming. Attempting fallback...`);
             const localClient = new OllamaClient(endpoint);
             const bestModel = await localClient.getBestAvailableModel();
             
             if (bestModel && bestModel !== model) {
               logger.info(`[CustomProvider] Falling back to: ${bestModel}`);
               // Recurse with new model override
               return this.generateStreamingCompletion(request, onChunk, signal, bestModel);
             }
          }

          throw new LLMError(
            isModelMissing ? `Model '${model}' not found in Ollama.` : 'Ollama service not found at ' + endpoint,
            'connection',
            true,
            { endpoint, status: 404, error: errorData.error }
          );
        }

        const error = await response.json().catch(() => ({}));
        const errorMessage = error.error || `Ollama request failed with status ${response.status}`;
        const isMemoryError = errorMessage.toLowerCase().includes('memory') || errorMessage.toLowerCase().includes('available');
        
        throw new LLMError(
          errorMessage,
          isMemoryError ? 'resource_exhausted' : 'api_error',
          !isMemoryError && (response.status === 429 || response.status >= 500),
          error,
          isMemoryError ? LLMErrorCategory.RESOURCE_EXHAUSTED : undefined
        );
      }

      return this.processOllamaStream(response, onChunk);
    } catch (error) {
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new LLMError(
          'Cannot connect to Ollama. Please ensure Ollama is running at ' + endpoint,
          'network',
          true,
          { endpoint, originalError: error.message }
        );
      }

      // Re-throw LLMError as-is
      if (error instanceof LLMError) {
        throw error;
      }

      // Wrap other errors
      const finalErrorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const isMemoryError = finalErrorMessage.toLowerCase().includes('memory') || finalErrorMessage.toLowerCase().includes('available');
      
      throw new LLMError(
        finalErrorMessage,
        isMemoryError ? 'resource_exhausted' : 'unknown',
        !isMemoryError, // Don't retry memory errors
        { originalError: error },
        isMemoryError ? LLMErrorCategory.RESOURCE_EXHAUSTED : undefined
      );
    }
  }

  private async processOllamaStream(
    response: Response,
    onChunk: StreamChunkCallback
  ): Promise<LLMResponse> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new LLMError('No response body', 'stream_error', false);
    }

    const decoder = new TextDecoder();
    let fullContent = '';
    let finish_reason: LLMResponse['finish_reason'] = 'stop';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            // For /api/generate, the response is directly in 'response' field
            const content = parsed.response;
            if (content) {
              fullContent += content;
              onChunk(content);
            }
            if (parsed.done) {
              finish_reason = 'stop';
            }
          } catch {
            // Skip invalid JSON chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return {
      content: fullContent,
      finish_reason,
    };
  }
  private async processStream(
    response: Response,
    onChunk: StreamChunkCallback
  ): Promise<LLMResponse> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new LLMError('No response body', 'stream_error', false);
    }

    const decoder = new TextDecoder();
    let fullContent = '';
    let finish_reason: LLMResponse['finish_reason'] = 'stop';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim().startsWith('data: '));

        for (const line of lines) {
          const data = line.replace('data: ', '').trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices[0]?.delta?.content || parsed.choices[0]?.text;
            if (delta) {
              fullContent += delta;
              onChunk(delta);
            }
            if (parsed.choices[0]?.finish_reason) {
              finish_reason = parsed.choices[0].finish_reason;
            }
          } catch {
            // Skip invalid JSON chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return {
      content: fullContent,
      finish_reason,
    };
  }

  async validateConnection(): Promise<boolean> {
    try {
      const endpoint = this.config.apiEndpoint || OLLAMA_URL;
      const response = await fetch(`${endpoint}/api/tags`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Diffusion Provider Implementation (Local Fast)
 */
class DiffusionProvider extends LLMProviderBase {
  getProviderName(): string {
    return 'Diffusion (Local Fast)';
  }

  async generateCompletion(request: LLMRequest, signal?: AbortSignal): Promise<LLMResponse> {
    const endpoint = this.config.apiEndpoint || 'http://localhost:8005';
    const response = await fetch(`${endpoint}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: request.prompt,
        max_tokens: request.maxTokens || this.config.parameters.maxTokens,
        temperature: request.temperature || this.config.parameters.temperature,
      }),
      signal,
    });

    if (!response.ok) {
      throw new LLMError('Diffusion server error', 'api_error', true);
    }

    const data = await response.json();
    return {
      content: data.text,
      usage: {
        prompt_tokens: 0,
        completion_tokens: data.steps,
        total_tokens: data.steps,
      },
    };
  }

  async generateStreamingCompletion(
    request: LLMRequest,
    onChunk: StreamChunkCallback,
    signal?: AbortSignal
  ): Promise<LLMResponse> {
    const response = await this.generateCompletion(request, signal);
    onChunk(response.content);
    return response;
  }

  async validateConnection(): Promise<boolean> {
    try {
      const endpoint = this.config.apiEndpoint || 'http://localhost:8005';
      const response = await fetch(`${endpoint}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Main LLM Service with retry logic and error handling
 */
export class LLMService {
  private provider: LLMProviderBase;
  private draftProvider: DiffusionProvider;
  private config: LLMConfig;
  private readonly abortControllers: Map<string, AbortController> = new Map();

  constructor(config?: Partial<LLMConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.provider = this.createProvider(this.config);
    this.draftProvider = new DiffusionProvider(this.config);
  }

  /**
   * Create provider instance based on configuration
   */
  private createProvider(config: LLMConfig): LLMProviderBase {
    switch (config.provider) {
      case 'openai':
        return new OpenAIProvider(config);
      case 'anthropic':
        return new AnthropicProvider(config);
      case 'openrouter':
        return new OpenRouterProvider(config);
      case 'local':
      case 'lmstudio':
      case 'custom':
        return new CustomProvider(config);
      case 'diffusion':
        return new DiffusionProvider(config);
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  }

  /**
   * Get available models for OpenRouter (public endpoint)
   */
  async getOpenRouterModels(): Promise<any[]> {
    if (this.provider instanceof OpenRouterProvider) {
      return this.provider.getAvailableModels();
    }
    
    // Fallback if current provider is not OpenRouter but we want to know models
    try {
      const resp = await fetch('https://openrouter.ai/api/v1/models');
      const data = await resp.json();
      return data.data || [];
    } catch {
      return [];
    }
  }

  /**
   * Generate completion with retry logic
   */
  async generateCompletion(request: LLMRequest, requestId?: string): Promise<ApiResponse<LLMResponse>> {
    const id = requestId || this.generateRequestId();
    const abortController = new AbortController();
    this.abortControllers.set(id, abortController);

    // DIAGNOSTIC: Log request details and configuration
    logger.info(`[LLMService] 🚀 Starting generateCompletion (requestId: ${id})`);
    logger.info(`[LLMService] ⚙️ Config: provider=${this.config.provider}, model=${this.config.model}, timeout=${this.config.timeout}ms, retryAttempts=${this.config.retryAttempts}`);
    logger.debug(`[LLMService] 📝 Prompt length: ${request.prompt?.length || 0} chars, maxTokens: ${request.maxTokens || this.config.parameters.maxTokens}`);

    try {
      return await this.withRetry(async () => {
        if (abortController.signal.aborted) {
          throw new LLMError('Request cancelled', 'cancelled', false, undefined, LLMErrorCategory.UNKNOWN);
        }

        const startTime = Date.now();
        logger.debug(`[LLMService] 📤 Calling provider.generateCompletion (timeout: ${this.config.timeout}ms)`);

        // Create a timeout controller that combines timeout and abort signal
        const timeoutController = this.createTimeoutController(this.config.timeout, abortController.signal);

        // HYBRID LOGIC: If draftMode is active, use the fast local provider
        const activeProvider = this.config.parameters.draftMode ? this.draftProvider : this.provider;
        
        logger.info(`[LLMService] ⚡ Using provider: ${activeProvider.getProviderName()} (DraftMode: ${this.config.parameters.draftMode})`);
        
        const response = await activeProvider.generateCompletion(request, timeoutController.signal);

        const elapsedMs = Date.now() - startTime;
        logger.info(`[LLMService] ✅ Provider response received in ${elapsedMs}ms`);

        return {
          success: true,
          data: response,
        };
      });
    } catch (error) {
      logger.error('[LLMService] Generate completion failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: error instanceof LLMError ? error.code : 'unknown',
      };
    } finally {
      this.abortControllers.delete(id);
    }
  }

  /**
   * Generate text using the LLM service
   */
  async generateText(prompt: string, options: {
    temperature?: number;
    maxTokens?: number;
  } = {}): Promise<string> {
    const request: LLMRequest = {
      prompt: prompt,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    };

    const response = await this.generateCompletion(request);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to generate text');
    }

    return response.data.content;
  }

  /**
   * High-level generation method used by ChatBox and other components.
   * Allows overriding provider and model for a single call.
   */
  async generate(prompt: string, options: {
    provider?: LLMProvider;
    model?: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}): Promise<string> {
    const originalProvider = this.provider;
    const originalConfig = { ...this.config };

    try {
      if (options.provider && options.provider !== this.config.provider) {
        // Temporarily switch provider
        const tempConfig = { ...this.config, provider: options.provider, model: options.model || this.config.model };
        this.provider = this.createProvider(tempConfig);
      } else if (options.model && options.model !== this.config.model) {
        // Temporarily switch model
        this.provider.updateConfig({ model: options.model });
      }

      const request: LLMRequest = {
        prompt,
        systemPrompt: options.systemPrompt,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
      };

      const response = await this.generateCompletion(request);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to generate response');
      }

      return response.data.content;
    } finally {
      // Restore original provider and config
      this.provider = originalProvider;
      this.provider.updateConfig({ model: originalConfig.model });
    }
  }

  /**
   * Generate streaming completion with retry logic
   */
  async generateStreamingCompletion(
    request: LLMRequest,
    onChunk: StreamChunkCallback,
    requestId?: string
  ): Promise<ApiResponse<LLMResponse>> {
    if (!this.config.streamingEnabled) {
      return this.generateCompletion(request, requestId);
    }

    const id = requestId || this.generateRequestId();
    const abortController = new AbortController();
    this.abortControllers.set(id, abortController);

    try {
      return await this.withRetry(async () => {
        if (abortController.signal.aborted) {
          throw new LLMError('Request cancelled', 'cancelled', false, undefined, LLMErrorCategory.UNKNOWN);
        }

        // Create a timeout controller that combines timeout and abort signal
        const timeoutController = this.createTimeoutController(this.config.timeout, abortController.signal);

        // HYBRID LOGIC: If draftMode is active, use the fast local provider
        const activeProvider = this.config.parameters.draftMode ? this.draftProvider : this.provider;
        
        logger.info(`[LLMService] ⚡ Using provider: ${activeProvider.getProviderName()} (DraftMode: ${this.config.parameters.draftMode})`);

        const response = await activeProvider.generateStreamingCompletion(request, onChunk, timeoutController.signal);
        return {
          success: true,
          data: response,
        };
      });
    } catch (error) {
      logger.error('[LLMService] Generate streaming completion failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: error instanceof LLMError ? error.code : 'unknown',
      };
    } finally {
      this.abortControllers.delete(id);
    }
  }

  /**
   * Cancel an ongoing request
   */
  cancelRequest(requestId: string): boolean {
    const controller = this.abortControllers.get(requestId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(requestId);
      return true;
    }
    return false;
  }

  /**
   * Cancel all ongoing requests
   */
  cancelAllRequests(): void {
    this.abortControllers.forEach((controller) => controller.abort());
    this.abortControllers.clear();
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Validate connection to LLM provider
   */
  async validateConnection(): Promise<ApiResponse<boolean>> {
    try {
      const isValid = await this.withTimeout(
        this.provider.validateConnection(),
        10000 // 10 second timeout for validation
      );
      return {
        success: true,
        data: isValid,
      };
    } catch (error) {
      logger.error('[LLMService] Connection validation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection validation failed',
        code: error instanceof LLMError ? error.code : 'validation_error',
      };
    }
  }

  /**
   * Retry logic with exponential backoff
   */
  private async withRetry<T>(
    operation: () => Promise<ApiResponse<T>>
  ): Promise<ApiResponse<T>> {
    let lastError: LLMError | Error | null = null;

    logger.info(`[LLMService] 🔄 Starting retry loop (max attempts: ${this.config.retryAttempts})`);

    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      const attemptStartTime = Date.now();
      logger.info(`[LLMService] 🔄 Attempt ${attempt + 1}/${this.config.retryAttempts} starting...`);

      try {
        const result = await operation();
        logger.info(`[LLMService] ✅ Attempt ${attempt + 1} succeeded after ${Date.now() - attemptStartTime}ms`);
        return result;
      } catch (error) {
        const attemptDuration = Date.now() - attemptStartTime;
        lastError = error instanceof Error ? error : new Error('Unknown error');

        logger.warn(`[LLMService] ⚠️ Attempt ${attempt + 1} failed after ${attemptDuration}ms: ${lastError.message}`);

        // DIAGNOSTIC: Log error details
        if (error instanceof LLMError) {
          logger.warn(`[LLMService] 🏷️ LLMError - code: ${error.code}, retryable: ${error.retryable}, category: ${error.category}`);
        }

        // Don't retry if error is not retryable
        if (error instanceof LLMError && !error.retryable) {
          logger.warn(`[LLMService] ❌ Non-retryable error on attempt ${attempt + 1}:`, error.message);
          return {
            success: false,
            error: error.message,
            code: error.code,
          };
        }

        // Don't retry on last attempt
        if (attempt === this.config.retryAttempts - 1) {
          logger.error(`[LLMService] ❌ Final attempt ${attempt + 1} failed, no more retries`);
          break;
        }

        // Exponential backoff: 1s, 2s, 4s, 8s, etc.
        const delayMs = Math.pow(2, attempt) * 1000;
        logger.info(`[LLMService] ⏳ Retrying in ${delayMs}ms (attempt ${attempt + 1}/${this.config.retryAttempts})`);
        await this.delay(delayMs);
      }
    }

    logger.error('[LLMService] ❌ Request failed after all retry attempts');
    logger.error(`[LLMService] 💡 DIAGNOSTIC: Last error was: ${lastError?.message}`);
    logger.error(`[LLMService] 💡 DIAGNOSTIC: Config - provider: ${this.config.provider}, timeout: ${this.config.timeout}ms`);

    return {
      success: false,
      error: lastError?.message || 'Request failed after retries',
      code: lastError instanceof LLMError ? lastError.code : 'retry_exhausted',
    };
  }

  /**
   * Timeout wrapper with cancellation support
   * Creates an AbortController that can be triggered by either timeout or external signal
   * Returns both the timeout signal (to pass to fetch) and the result promise
   */
  private createTimeoutController(timeoutMs: number, signal?: AbortSignal): AbortController {
    const timeoutController = new AbortController();

    // If external signal is already aborted, abort our controller too
    if (signal?.aborted) {
      timeoutController.abort(signal.reason);
    }

    // Listen for external signal abort
    signal?.addEventListener('abort', () => {
      timeoutController.abort(signal.reason);
    });

    // Set up timeout
    const timeoutId = setTimeout(() => {
      const error = new LLMError(
        'Request timeout',
        'timeout',
        true,
        `Request exceeded ${timeoutMs}ms limit`,
        LLMErrorCategory.TIMEOUT
      );
      timeoutController.abort(error);
    }, timeoutMs);

    // Clear timeout when controller is aborted (cleanup)
    const originalAbort = timeoutController.abort.bind(timeoutController);
    timeoutController.abort = (reason?: unknown) => {
      clearTimeout(timeoutId);
      originalAbort(reason);
    };

    return timeoutController;
  }

  /**
   * Timeout wrapper with cancellation support
   * Uses AbortController to properly cancel the underlying HTTP request on timeout
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    signal?: AbortSignal
  ): Promise<T> {
    logger.debug(`[LLMService] ⏱️ Setting up timeout for ${timeoutMs}ms`);

    const timeoutController = this.createTimeoutController(timeoutMs, signal);

    const timeoutPromise = new Promise<T>((_, reject) => {
      const timeoutId = setTimeout(() => {
        logger.error(`[LLMService] ⏰ TIMEOUT! Request exceeded ${timeoutMs}ms limit`);
        logger.error(`[LLMService] 💡 DIAGNOSTIC: Consider increasing timeout in config (current: ${timeoutMs}ms)`);
        reject(new LLMError('Request timeout', 'timeout', true, undefined, LLMErrorCategory.TIMEOUT));
      }, timeoutMs);

      // Clear timeout if signal is aborted
      signal?.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        reject(new LLMError('Request cancelled', 'cancelled', false, undefined, LLMErrorCategory.UNKNOWN));
      });

      // Also listen to our timeout controller
      timeoutController.signal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        reject(timeoutController.signal.reason);
      });
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Update service configuration
   */
  updateConfig(config: Partial<LLMConfig>): void {
    this.config = { ...this.config, ...config };

    // Recreate provider if provider type changed
    if (config.provider && config.provider !== this.provider.getProviderName().toLowerCase()) {
      this.provider = this.createProvider(this.config);
    } else {
      this.provider.updateConfig(this.config);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): LLMConfig {
    return { ...this.config };
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return this.provider.getProviderName();
  }

  /**
   * Generate image using the current provider (if supported)
   */
  async generateImage(options: ImageGenerationOptions, requestId?: string): Promise<ApiResponse<GeneratedImage>> {
    const id = requestId || this.generateRequestId();
    const abortController = new AbortController();
    this.abortControllers.set(id, abortController);

    try {
      // Only OpenAI provider supports image generation currently
      if (!(this.provider instanceof OpenAIProvider)) {
        return {
          success: false,
          error: 'Image generation is only supported with OpenAI provider',
          code: 'unsupported_provider',
        };
      }

      return await this.withRetry(async () => {
        if (abortController.signal.aborted) {
          throw new LLMError('Image generation cancelled', 'cancelled', false, undefined, LLMErrorCategory.UNKNOWN);
        }

        // Cast to OpenAIProvider since we've already checked instanceof
        const openAIProvider = this.provider as OpenAIProvider;
        const image = await this.withTimeout(
          openAIProvider.generateImage(options),
          this.config.timeout * 2, // Double timeout for image generation
          abortController.signal
        );
        return {
          success: true,
          data: image,
        };
      });
    } finally {
      this.abortControllers.delete(id);
    }
  }

  /**
   * Create error recovery options from an error
   */
  createRecoveryOptions(
    error: Error | LLMError,
    onRetry?: () => void | Promise<void>,
    onManualEntry?: () => void,
    onCancel?: () => void
  ): ErrorRecoveryOptions {
    const llmError = error instanceof LLMError ? error : new LLMError(
      error.message,
      'unknown',
      false,
      undefined,
      LLMErrorCategory.UNKNOWN
    );

    const actions: RecoveryAction[] = [];

    // Add retry action if error is retryable
    if (llmError.retryable && onRetry) {
      actions.push({
        label: 'Retry',
        action: onRetry,
        primary: true,
      });
    }

    // Add manual entry fallback
    if (onManualEntry) {
      actions.push({
        label: 'Enter Manually',
        action: onManualEntry,
        primary: !llmError.retryable,
      });
    }

    // Add cancel action
    if (onCancel) {
      actions.push({
        label: 'Cancel',
        action: onCancel,
        primary: false,
      });
    }

    return {
      message: llmError.message,
      userMessage: llmError.getUserMessage(),
      actions,
      retryable: llmError.retryable,
      category: llmError.category,
    };
  }

  /**
   * Generate music description/prompt using LLM
   * This creates a detailed music prompt that can be used with external music generation tools
   */
  async generateMusicPrompt(request: {
    description: string;
    style?: string;
    mood?: string[];
    duration?: number;
    context?: string;
  }): Promise<ApiResponse<{ prompt: string; style: string; duration: number; mood: string[] }>> {
    const prompt = `You are a music composition expert for film and video production.
Generate a detailed music prompt for AI music generation based on the following description.

Description: ${request.description}
${request.style ? `Style: ${request.style}` : ''}
${request.mood ? `Mood: ${request.mood.join(', ')}` : ''}
${request.duration ? `Duration: ${request.duration} seconds` : ''}
${request.context ? `Context: ${request.context}` : ''}

Generate a detailed music prompt that includes:
1. Style (e.g., cinematic, ambient, action, romantic)
2. Instrumentation (e.g., orchestral, electronic, hybrid)
3. Tempo/BPM
4. Key signature
5. Mood descriptors
6. Detailed description of the music

Respond in JSON format:
{
  "prompt": "detailed music prompt...",
  "style": "main style",
  "duration": number,
  "mood": ["mood1", "mood2"]
}`;

    try {
      const response = await this.generateText(prompt, {
        temperature: 0.7,
        maxTokens: 1000,
      });

      // Parse the JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          data: parsed,
        };
      }

      return {
        success: true,
        data: {
          prompt: response,
          style: request.style || 'cinematic',
          duration: request.duration || 60,
          mood: request.mood || [],
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate music prompt',
      };
    }
  }

  /**
   * Generate lyrics using LLM
   */
  async generateLyrics(request: {
    theme: string;
    style?: string;
    mood?: string[];
    length?: 'short' | 'medium' | 'long';
    characters?: string[];
    context?: string;
  }): Promise<ApiResponse<{
    title: string;
    lyrics: string;
    sections: { type: string; lines: string[] }[];
    style: string;
    mood: string[];
  }>> {
    const lengthMap = {
      short: '30-60 seconds (1-2 verses + chorus)',
      medium: '60-120 seconds (2 verses + chorus + bridge)',
      long: '120-180 seconds (full song with verses, chorus, bridge)',
    };

    const prompt = `You are a lyrics writer for film and video production.
Generate original lyrics based on the following parameters.

Theme: ${request.theme}
${request.style ? `Style/Genre: ${request.style}` : 'Style: Pop/Cinematic'}
${request.mood ? `Mood: ${request.mood.join(', ')}` : ''}
${request.length ? `Length: ${lengthMap[request.length]}` : 'Length: Medium'}
${request.characters ? `Characters involved: ${request.characters.join(', ')}` : ''}
${request.context ? `Context/Story: ${request.context}` : ''}

Generate:
1. A title
2. Lyrics with clear sections (verse, chorus, bridge, intro, outro)
3. Keep the mood and style consistent
4. Make it suitable for the given context

Respond in JSON format:
{
  "title": "Song Title",
  "lyrics": "Full lyrics text...",
  "sections": [
    { "type": "intro", "lines": ["line1", "line2"] },
    { "type": "verse1", "lines": ["line1", "line2", "line3"] },
    { "type": "chorus", "lines": ["line1", "line2", "line3", "line4"] }
  ],
  "style": "pop/cinematic",
  "mood": ["emotional", "uplifting"]
}`;

    try {
      const response = await this.generateText(prompt, {
        temperature: 0.8,
        maxTokens: 2000,
      });

      // Parse the JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          data: parsed,
        };
      }

      // Fallback: return raw text
      return {
        success: true,
        data: {
          title: request.theme,
          lyrics: response,
          sections: [],
          style: request.style || 'pop',
          mood: request.mood || [],
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate lyrics',
      };
    }
  }

  /**
   * Generate dialogue for a specific shot and character
   * This integrates dialogue generation with shots
   */
  async generateShotDialogue(request: {
    shotId: string;
    characterName?: string;
    context?: string;
    previousDialogue?: string;
    mood?: string;
    lineCount?: number;
  }): Promise<ApiResponse<{
    dialogues: { character: string; text: string; mood: string }[];
    shotId: string;
  }>> {
    const prompt = `You are a dialogue writer for film and video.
Generate dialogue for a specific shot based on the following parameters.

Shot ID: ${request.shotId}
${request.characterName ? `Character: ${request.characterName}` : ''}
${request.context ? `Scene Context: ${request.context}` : ''}
${request.previousDialogue ? `Previous Dialogue: ${request.previousDialogue}` : ''}
${request.mood ? `Mood/Tone: ${request.mood}` : ''}
${request.lineCount ? `Number of lines: ${request.lineCount}` : 'Number of lines: 1-2'}

Generate natural, character-appropriate dialogue that:
1. Fits the scene context and mood
2. Is appropriate for the character
3. Advances the story
4. Can be delivered naturally as voice over or on-screen dialogue

Respond in JSON format:
{
  "shotId": "${request.shotId}",
  "dialogues": [
    { "character": "Character Name", "text": "Dialogue line...", "mood": "emotion" }
  ]
}`;

    try {
      const response = await this.generateText(prompt, {
        temperature: 0.7,
        maxTokens: 500,
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          data: {
            ...parsed,
            shotId: request.shotId,
          },
        };
      }

      return {
        success: true,
        data: {
          shotId: request.shotId,
          dialogues: [{
            character: request.characterName || 'Narrator',
            text: response,
            mood: request.mood || 'neutral',
          }],
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate dialogue',
      };
    }
  }

  /**
   * Generates professional lyrics based on a theme and style for clip production
   */
  async generateProfessionalLyrics(params: {
    theme: string;
    style: string;
    mood: string[];
    length: 'short' | 'medium' | 'long';
  }): Promise<{ success: boolean; data?: { lyrics: string; structure: { bpm_guess: number; energy_level: string; key: string } } }> {

    logger.info('[LLM] Generating professional lyrics for clip:', params);

    try {
      const response = await backendApiService.post<{ lyrics: string; structure: { bpm_guess: number; energy_level: string; key: string } }>(
        '/api/llm/render-template',
        {
          template_name: 'music_lyrics_generation',
          variables: params
        }
      );
      
      // The render-template returns a prompt, but we want to actually GENERATE here.
      // So we render then call generate.
      
      const genResponse = await backendApiService.post<{ text: string }>(
        '/api/llm/generate',
        {
          prompt: (response as Record<string, unknown>).rendered_prompt as string,
          model: 'gpt-4'
        }
      );

      // Parse JSON from LLM response
      const cleanJson = genResponse.text.replace(/```json|```/g, '').trim();
      const result = JSON.parse(cleanJson);

      return {
        success: true,
        data: result
      };
    } catch (error) {
      logger.error('Lyrics generation failed, using mock', error);
      // Fallback to mock for demo purposes if backend fails
      const lyrics = `[Verset 1]
Dans les échos du code, une lueur s'éveille
Un moteur qui murmure, une force sans pareille
StoryCore s'anime, le rêve prend son envol
Sous le ciel de silicium, nous brisons le sol

[Refrain]
Visionnaire, la musique nous guide
Éclats de pixels, l'espace se vide
Projetons nos ombres sur l'écran du futur
IA créatrice, pureté de l'azur`;

      return {
        success: true,
        data: {
          lyrics,
          structure: {
            bpm_guess: 124,
            energy_level: 'high',
            key: 'C Minor'
          }
        }
      };
    }
  }

  /**
   * Analyzes music style from a prompt or audio reference
   */
  async analyzeMusicStyle(input: string): Promise<{
    style: string;
    instruments: string[];
    bpm: number;
    cinematic_prompts: string[];
  }> {
    logger.info('[LLM] Analyzing music style:', input);
    
    try {
      return await backendApiService.post('/api/audio/analyze-style', {
        audio_id: input,
        project_id: 'default'
      });
    } catch (error) {
      logger.error('Style analysis failed, using mock', error);
      return {
        style: "Synthwave Cinématographique",
        instruments: ["Analog Synths", "Deep Bass", "Drum Machine", "Electronic Percussion"],
        bpm: 120,
        cinematic_prompts: [
          "Volumetric lighting",
          "Anamorphic lens flares",
          "Retro-futuristic cityscape",
          "Handheld camera motion"
        ]
      };
    }
  }

  /**
   * Generates a structural plan for a music video (8-15s blocks)
   */
  async generateClipStructure(lyrics: string, bpm: number): Promise<Array<{
    timestamp: number;
    shot_type: string;
    description: string;
    duration: number;
  }>> {
    logger.info(`[LLM] Sequencing clip blocks based on lyrics (${lyrics.length}) and BPM (${bpm})...`);

    try {
      const response = await backendApiService.post<{ text: string }>(
        '/api/llm/generate',
        {
          prompt: `Using the music_video_segmentation template for: Lyrics=${lyrics}, BPM=${bpm}`,
          model: 'gpt-4'
        }
      );
      
      const cleanJson = response.text.replace(/```json|```/g, '').trim();
      const result = JSON.parse(cleanJson);
      return result.segments;
    } catch (error) {
      logger.error('Clip structure generation failed, using mock', error);
      return [
        { timestamp: 0, shot_type: "Establishing", description: "Vaste panorama urbain néon", duration: 8.5 },
        { timestamp: 8.5, shot_type: "Medium Shot", description: "Sujet marchant sous la pluie synthétique", duration: 10.2 },
        { timestamp: 18.7, shot_type: "Close Up", description: "Reflet des néons dans les yeux", duration: 7.4 }
      ];
    }
  }

}


/**
 * Default LLM service instance
 */
let defaultService: LLMService | null = null;

/**
 * Get or create default LLM service instance
 * Uses ConfigManager to get proper configuration
 */
export async function getLLMService(): Promise<LLMService> {
  if (!defaultService) {
    try {
      const configModule = await import('./llm/ConfigManager');
      if (configModule && configModule.ConfigManager) {
        const config = configModule.ConfigManager.getLLMConfig();
        const llmConfig: Partial<LLMConfig> = {
          provider: config.provider as LLMProvider,
          apiKey: '',
          apiEndpoint: config.apiEndpoint,
          model: config.model,
          parameters: config.parameters as { temperature: number; maxTokens: number; topP: number; frequencyPenalty: number; presencePenalty: number },

          streamingEnabled: config.streamingEnabled,
          timeout: 180000,
          systemPrompts: {
            worldGeneration: ((config.systemPrompts as unknown) as Record<string, string>)?.worldGeneration || 'You are a creative world-building assistant...',
            characterGeneration: ((config.systemPrompts as unknown) as Record<string, string>)?.characterGeneration || 'You are a character development expert...',
            dialogueGeneration: ((config.systemPrompts as unknown) as Record<string, string>)?.dialogueGeneration || 'You are a dialogue writing specialist...',
          },
        };

        defaultService = new LLMService(llmConfig);
      } else {
        defaultService = new LLMService();
      }
    } catch (error) {
      logger.warn('Could not load ConfigManager, using default LLM config:', error);
      defaultService = new LLMService();
    }
  }
  return defaultService;
}


/**
 * Create a new LLM service instance with custom configuration
 */
export function createLLMService(config?: Partial<LLMConfig>): LLMService {
  return new LLMService(config);
}

/**
 * Set the default LLM service instance
 */
export function setDefaultLLMService(service: LLMService): void {
  defaultService = service;
}

/**
 * Provider information
 */
export interface LLMProviderInfo {
  id: LLMProvider;
  name: string;
  models: LLMModelInfo[];
  requiresApiKey: boolean;
  supportsStreaming: boolean;
  defaultEndpoint: string;
}

export interface LLMModelInfo {
  id: string;
  name: string;
  contextWindow: number;
  costPer1kTokens?: number;
  capabilities: string[];
}

/**
 * Get available providers
 */
export function getAvailableProviders(): LLMProviderInfo[] {
  return [
    {
      id: 'openai',
      name: 'OpenAI',
      models: [
        {
          id: 'gpt-4',
          name: 'GPT-4',
          contextWindow: 8192,
          costPer1kTokens: 0.03,
          capabilities: ['chat', 'completion', 'streaming'],
        },
        {
          id: 'gpt-4-turbo',
          name: 'GPT-4 Turbo',
          contextWindow: 128000,
          costPer1kTokens: 0.01,
          capabilities: ['chat', 'completion', 'streaming', 'vision'],
        },
        {
          id: 'gpt-3.5-turbo',
          name: 'GPT-3.5 Turbo',
          contextWindow: 16385,
          costPer1kTokens: 0.001,
          capabilities: ['chat', 'completion', 'streaming'],
        },
      ],
      requiresApiKey: true,
      supportsStreaming: true,
      defaultEndpoint: 'https://api.openai.com/v1',
    },
    {
      id: 'openrouter',
      name: 'OpenRouter',
      models: [
        { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', contextWindow: 128000, capabilities: ['storytelling', 'quick'] },
        { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', contextWindow: 128000, capabilities: ['storytelling', 'reasoning'] },
        { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', contextWindow: 200000, capabilities: ['vision', 'storytelling', 'reasoning'] },
      ],
      requiresApiKey: true,
      supportsStreaming: true,
      defaultEndpoint: 'https://openrouter.ai/api/v1',
    },
    {
      id: 'anthropic',
      name: 'Anthropic',
      models: [
        {
          id: 'claude-3-opus-20240229',
          name: 'Claude 3 Opus',
          contextWindow: 200000,
          costPer1kTokens: 0.015,
          capabilities: ['chat', 'completion', 'streaming', 'vision'],
        },
        {
          id: 'claude-3-sonnet-20240229',
          name: 'Claude 3 Sonnet',
          contextWindow: 200000,
          costPer1kTokens: 0.003,
          capabilities: ['chat', 'completion', 'streaming', 'vision'],
        },
        {
          id: 'claude-3-haiku-20240307',
          name: 'Claude 3 Haiku',
          contextWindow: 200000,
          costPer1kTokens: 0.00025,
          capabilities: ['chat', 'completion', 'streaming', 'vision'],
        },
      ],
      requiresApiKey: true,
      supportsStreaming: true,
      defaultEndpoint: 'https://api.anthropic.com/v1',
    },
    {
      id: 'local',
      name: 'Local LLM',
      models: [
        {
          id: 'qwen3-vl:8b',
          name: 'Qwen 3 VL 8B (Vision + Language) ⭐ HIGH QUALITY',
          contextWindow: 32768,
          capabilities: ['chat', 'completion', 'streaming', 'vision', 'multimodal'],
        },
        {
          id: 'qwen3-vl:4b',
          name: 'Qwen 3 VL 4B (Vision + Language) ⭐ RECOMMENDED',
          contextWindow: 32768,
          capabilities: ['chat', 'completion', 'streaming', 'vision', 'multimodal'],
        },
        {
          id: 'llama3.2:3b',
          name: 'Llama 3.2 3B (Balanced)',
          contextWindow: 8192,
          capabilities: ['chat', 'completion', 'streaming'],
        },
        {
          id: 'gemma3:4b',
          name: 'Gemma 3 4B (Fast)',
          contextWindow: 8192,
          capabilities: ['chat', 'completion', 'streaming'],
        },
        {
          id: 'gemma3:1b',
          name: 'Gemma 3 1B (Ultra Fast)',
          contextWindow: 8192,
          capabilities: ['chat', 'completion', 'streaming'],
        },
        {
          id: 'mistral:latest',
          name: 'Mistral 7B',
          contextWindow: 8192,
          capabilities: ['chat', 'completion', 'streaming'],
        },
        {
          id: 'qwen2.5-coder:latest',
          name: 'Qwen 2.5 Coder (Code Generation)',
          contextWindow: 32768,
          capabilities: ['chat', 'completion', 'streaming', 'code'],
        },
        {
          id: 'phi3:mini',
          name: 'Phi 3 Mini',
          contextWindow: 4096,
          capabilities: ['chat', 'completion', 'streaming'],
        },
      ],
      requiresApiKey: false,
      supportsStreaming: true,
      defaultEndpoint: OLLAMA_URL,
    },
    {
      id: 'lmstudio',
      name: 'LM Studio (Local Server)',
      models: [
        {
          id: 'qwen3-vl:8b',
          name: 'Qwen 3 VL 8B (Vision + Language)',
          contextWindow: 32768,
          capabilities: ['chat', 'completion', 'streaming', 'vision', 'multimodal'],
        },
        {
          id: 'qwen3-vl:4b',
          name: 'Qwen 3 VL 4B (Vision + Language)',
          contextWindow: 32768,
          capabilities: ['chat', 'completion', 'streaming', 'vision', 'multimodal'],
        },
        {
          id: 'llama3.2:3b',
          name: 'Llama 3.2 3B',
          contextWindow: 8192,
          capabilities: ['chat', 'completion', 'streaming'],
        },
        {
          id: 'llama3.2:1b',
          name: 'Llama 3.2 1B',
          contextWindow: 8192,
          capabilities: ['chat', 'completion', 'streaming'],
        },
        {
          id: 'gemma3:4b',
          name: 'Gemma 3 4B',
          contextWindow: 8192,
          capabilities: ['chat', 'completion', 'streaming'],
        },
        {
          id: 'gemma3:1b',
          name: 'Gemma 3 1B',
          contextWindow: 8192,
          capabilities: ['chat', 'completion', 'streaming'],
        },
        {
          id: 'mistral:latest',
          name: 'Mistral 7B',
          contextWindow: 8192,
          capabilities: ['chat', 'completion', 'streaming'],
        },
        {
          id: 'phi3:mini',
          name: 'Phi 3 Mini',
          contextWindow: 4096,
          capabilities: ['chat', 'completion', 'streaming'],
        },
        {
          id: 'qwen2.5-coder:latest',
          name: 'Qwen 2.5 Coder',
          contextWindow: 32768,
          capabilities: ['chat', 'completion', 'streaming', 'code'],
        },
      ],
      requiresApiKey: false,
      supportsStreaming: true,
      defaultEndpoint: LM_STUDIO_URL,
    },
    {
      id: 'custom',
      name: 'Custom Provider',
      models: [
        {
          id: 'custom-model',
          name: 'Custom Model',
          contextWindow: 4096,
          capabilities: ['chat', 'completion'],
        },
      ],
      requiresApiKey: false,
      supportsStreaming: true,
      defaultEndpoint: '',
    },
    {
      id: 'diffusion',
      name: 'Diffusion LLM (Local Fast)',
      models: [
        {
          id: 'llda-v1',
          name: 'LLDA v1 (Super Fast Diffusion)',
          contextWindow: 1024,
          capabilities: ['completion', 'fast'],
        },
        {
          id: 'sseds-beta',
          name: 'SSEDS Beta (High Speed)',
          contextWindow: 2048,
          capabilities: ['completion', 'fast'],
        },
      ],
      requiresApiKey: false,
      supportsStreaming: false,
      defaultEndpoint: 'http://localhost:8005',
    },
  ];
}

/**
 * Get default system prompts
 */
export function getDefaultSystemPrompts() {
  return {
    worldGeneration: `You are a creative world-building assistant for storytelling and visual content creation. Generate rich, coherent, and detailed world descriptions that are internally consistent and visually compelling. Consider genre conventions, cultural elements, visual aesthetics, color palettes, and narrative potential. Provide specific, vivid details that help creators visualize and understand the world. When describing visual elements, be precise about composition, lighting, atmosphere, and mood.`,

    characterGeneration: `You are a character development expert for storytelling and visual media. Create well-rounded, believable characters with consistent traits, motivations, backgrounds, and distinctive visual appearances. Ensure that physical appearance, personality, and backstory align logically. Consider character archetypes, narrative roles, relationship dynamics, and visual design elements like costume, color schemes, and distinctive features. Provide detailed visual descriptions that can guide character design and illustration.`,

    dialogueGeneration: `You are a dialogue writing specialist for narrative content. Create natural, character-appropriate dialogue that reveals personality, advances plot, maintains consistent voice, and feels authentic to the character's background and emotional state. Consider subtext, pacing, and how dialogue can convey visual actions and reactions. Ensure dialogue works well for both text and potential voice acting or animation.`,
  };
}

export const llmService = new LLMService();


