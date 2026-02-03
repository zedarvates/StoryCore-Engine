/**
 * LLM Service
 * 
 * Handles communication with various LLM providers (OpenAI, Anthropic, local, custom)
 * Supports streaming responses, retry logic, and error handling
 */

import { ollamaClient } from './llm/OllamaClient';

/**
 * Supported LLM providers
 */
export type LLMProvider = 'openai' | 'anthropic' | 'local' | 'custom';

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
  context?: Record<string, any>;
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
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

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  size: string;
  model: string;
  createdAt: Date;
  revisedPrompt?: string;
  metadata?: Record<string, any>;
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
  fallbackData?: any;
  retryable: boolean;
  category: LLMErrorCategory;
}

/**
 * LLM error types
 */
export class LLMError extends Error {
  code: string;
  retryable: boolean;
  details?: any;
  category: LLMErrorCategory;

  constructor(
    message: string,
    code: string,
    retryable: boolean = false,
    details?: any,
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
      return LLMErrorCategory.SERVER_ERROR;
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
export interface ApiResponse<T = any> {
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
  provider: 'openai',
  apiKey: '',
  model: 'gpt-4',
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
  timeout: 30000,
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
  abstract generateCompletion(request: LLMRequest): Promise<LLMResponse>;

  /**
   * Generate streaming completion
   */
  abstract generateStreamingCompletion(
    request: LLMRequest,
    onChunk: StreamChunkCallback
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

  async generateCompletion(request: LLMRequest): Promise<LLMResponse> {
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
          { role: 'user', content: request.prompt },
        ],
        temperature: request.temperature ?? this.config.parameters.temperature,
        max_tokens: request.maxTokens ?? this.config.parameters.maxTokens,
        top_p: this.config.parameters.topP,
        frequency_penalty: this.config.parameters.frequencyPenalty,
        presence_penalty: this.config.parameters.presencePenalty,
        stream: false,
      }),
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
    onChunk: StreamChunkCallback
  ): Promise<LLMResponse> {
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
          { role: 'user', content: request.prompt },
        ],
        temperature: request.temperature ?? this.config.parameters.temperature,
        max_tokens: request.maxTokens ?? this.config.parameters.maxTokens,
        top_p: this.config.parameters.topP,
        frequency_penalty: this.config.parameters.frequencyPenalty,
        presence_penalty: this.config.parameters.presencePenalty,
        stream: true,
      }),
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
          } catch (e) {
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
      id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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

  async generateCompletion(request: LLMRequest): Promise<LLMResponse> {
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
          { role: 'user', content: request.prompt },
        ],
        stream: false,
      }),
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
    onChunk: StreamChunkCallback
  ): Promise<LLMResponse> {
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
          { role: 'user', content: request.prompt },
        ],
        stream: true,
      }),
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
          } catch (e) {
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
 * Local/Custom Provider Implementation
 */
class CustomProvider extends LLMProviderBase {
  getProviderName(): string {
    return this.config.provider === 'local' ? 'Local' : 'Custom';
  }

  async generateCompletion(request: LLMRequest): Promise<LLMResponse> {
    const endpoint = this.config.apiEndpoint || 'http://localhost:11434';

    try {
      // Use Ollama's native API format
      // Note: For models with extended thinking (like Qwen 3 VL), we need higher token limits
      // because thinking tokens are included in the count
      const maxTokens = request.maxTokens ?? this.config.parameters.maxTokens;
      const numPredict = Math.max(maxTokens * 2, 500);

      const prompt = request.systemPrompt
        ? `${request.systemPrompt}\n\n${request.prompt}`
        : request.prompt;

      const response = await ollamaClient.generate(this.config.model, prompt, {
        temperature: request.temperature ?? this.config.parameters.temperature,
        maxTokens: numPredict,
      });

      return {
        content: response || '',
        finish_reason: 'stop',
      };
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
      throw new LLMError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        'unknown',
        false,
        { originalError: error }
      );
    }
  }

  async generateStreamingCompletion(
    request: LLMRequest,
    onChunk: StreamChunkCallback
  ): Promise<LLMResponse> {
    const endpoint = this.config.apiEndpoint || 'http://localhost:11434';

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
          model: this.config.model,
          prompt: request.systemPrompt
            ? `${request.systemPrompt}\n\n${request.prompt}`
            : request.prompt,
          stream: true,
          options: {
            temperature: request.temperature ?? this.config.parameters.temperature,
            num_predict: numPredict,
          },
        }),
      });

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 404) {
          throw new LLMError(
            'Ollama service not found. Please ensure Ollama is running and accessible at ' + endpoint,
            'connection',
            true,
            { endpoint, status: 404 }
          );
        }

        const error = await response.json().catch(() => ({}));
        throw new LLMError(
          error.error || `Ollama request failed with status ${response.status}`,
          'api_error',
          response.status === 429 || response.status >= 500,
          error
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
      throw new LLMError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        'unknown',
        false,
        { originalError: error }
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
          } catch (e) {
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
          } catch (e) {
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
      const endpoint = this.config.apiEndpoint || 'http://localhost:11434';
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
 * Main LLM Service with retry logic and error handling
 */
export class LLMService {
  private provider: LLMProviderBase;
  private config: LLMConfig;
  private abortControllers: Map<string, AbortController> = new Map();

  constructor(config?: Partial<LLMConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.provider = this.createProvider(this.config);
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
      case 'local':
      case 'custom':
        return new CustomProvider(config);
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  }

  /**
   * Generate completion with retry logic
   */
  async generateCompletion(request: LLMRequest, requestId?: string): Promise<ApiResponse<LLMResponse>> {
    const id = requestId || this.generateRequestId();
    const abortController = new AbortController();
    this.abortControllers.set(id, abortController);

    try {
      return await this.withRetry(async () => {
        if (abortController.signal.aborted) {
          throw new LLMError('Request cancelled', 'cancelled', false, undefined, LLMErrorCategory.UNKNOWN);
        }

        const response = await this.withTimeout(
          this.provider.generateCompletion(request),
          this.config.timeout,
          abortController.signal
        );
        return {
          success: true,
          data: response,
        };
      });
    } catch (error) {
      console.error('[LLMService] Generate completion failed:', error);
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

        const response = await this.withTimeout(
          this.provider.generateStreamingCompletion(request, onChunk),
          this.config.timeout,
          abortController.signal
        );
        return {
          success: true,
          data: response,
        };
      });
    } catch (error) {
      console.error('[LLMService] Generate streaming completion failed:', error);
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
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
      console.error('[LLMService] Connection validation failed:', error);
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

    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // Don't retry if error is not retryable
        if (error instanceof LLMError && !error.retryable) {
          console.warn(`[LLMService] Non-retryable error on attempt ${attempt + 1}:`, error.message);
          return {
            success: false,
            error: error.message,
            code: error.code,
          };
        }

        // Don't retry on last attempt
        if (attempt === this.config.retryAttempts - 1) {
          break;
        }

        // Exponential backoff: 1s, 2s, 4s, 8s, etc.
        const delayMs = Math.pow(2, attempt) * 1000;
        console.log(`[LLMService] Retrying in ${delayMs}ms (attempt ${attempt + 1}/${this.config.retryAttempts})`);
        await this.delay(delayMs);
      }
    }

    console.error('[LLMService] Request failed after all retry attempts');
    return {
      success: false,
      error: lastError?.message || 'Request failed after retries',
      code: lastError instanceof LLMError ? lastError.code : 'retry_exhausted',
    };
  }

  /**
   * Timeout wrapper with cancellation support
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, signal?: AbortSignal): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        const timeoutId = setTimeout(
          () => reject(new LLMError('Request timeout', 'timeout', true, undefined, LLMErrorCategory.TIMEOUT)),
          timeoutMs
        );

        // Clear timeout if signal is aborted
        signal?.addEventListener('abort', () => {
          clearTimeout(timeoutId);
          reject(new LLMError('Request cancelled', 'cancelled', false, undefined, LLMErrorCategory.UNKNOWN));
        });
      }),
    ]);
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

        const image = await this.withTimeout(
          this.provider.generateImage(options),
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
}

/**
 * Default LLM service instance
 */
let defaultService: LLMService | null = null;

/**
 * Get or create default LLM service instance
 * Uses ConfigManager to get proper configuration
 */
export function getLLMService(): LLMService {
  if (!defaultService) {
    // Try to load config from ConfigManager if available
    try {
      // Dynamic import to avoid circular dependency
      const configModule = require('./llm/ConfigManager');
      if (configModule && configModule.ConfigManager) {
        const config = configModule.ConfigManager.getLLMConfig();
        // Convert ConfigManager config to LLMService config
        const llmConfig: Partial<LLMConfig> = {
          provider: config.provider as LLMProvider,
          apiKey: '', // ConfigManager doesn't store API keys for local
          apiEndpoint: config.apiEndpoint,
          model: config.model,
          parameters: config.parameters,
          streamingEnabled: config.streamingEnabled,
          systemPrompts: config.systemPrompts || {
            worldGeneration: 'You are a creative world-building assistant...',
            characterGeneration: 'You are a character development expert...',
            dialogueGeneration: 'You are a dialogue writing specialist...',
          },
        };
        defaultService = new LLMService(llmConfig);
      } else {
        defaultService = new LLMService();
      }
    } catch (error) {
      console.warn('Could not load ConfigManager, using default LLM config:', error);
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
          id: 'llama3.1:8b',
          name: 'Llama 3.1 8B (High Quality)',
          contextWindow: 8192,
          capabilities: ['chat', 'completion', 'streaming'],
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
      defaultEndpoint: 'http://localhost:11434',
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
