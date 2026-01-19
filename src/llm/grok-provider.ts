import { LLMProvider, LLMConfig, Message } from './interfaces';

interface GrokChatCompletionRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  model: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface GrokChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
      refusal: string | null;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    prompt_tokens_details: {
      text_tokens: number;
      audio_tokens: number;
      image_tokens: number;
      cached_tokens: number;
    };
    completion_tokens_details: {
      reasoning_tokens: number;
      audio_tokens: number;
      accepted_prediction_tokens: number;
      rejected_prediction_tokens: number;
    };
    num_sources_used: number;
  };
  system_fingerprint?: string;
}

export class GrokProvider implements LLMProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;

  constructor(apiKey: string, baseUrl = 'https://api.x.ai/v1', timeout = 30000) {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('xAI API key is required');
    }
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  async generateText(prompt: string, config?: Partial<LLMConfig>): Promise<string> {
    const mergedConfig = { ...this.getDefaultConfig(), ...config };
    const request: GrokChatCompletionRequest = {
      messages: [{ role: 'user', content: prompt }],
      model: mergedConfig.model,
      temperature: mergedConfig.temperature,
      max_tokens: mergedConfig.maxTokens,
    };

    const response = await this.callApi('/chat/completions', request);
    return response.choices[0]?.message?.content ?? '';
  }

  async generateCompletion(messages: Message[], config?: Partial<LLMConfig>): Promise<string> {
    const mergedConfig = { ...this.getDefaultConfig(), ...config };
    const grokMessages = messages.map(msg => ({
      role: msg.role as 'system' | 'user' | 'assistant',
      content: msg.content,
    }));

    const request: GrokChatCompletionRequest = {
      messages: grokMessages,
      model: mergedConfig.model,
      temperature: mergedConfig.temperature,
      max_tokens: mergedConfig.maxTokens,
    };

    const response = await this.callApi('/chat/completions', request);
    return response.choices[0]?.message?.content ?? '';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const simpleRequest: GrokChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'grok-2-1212',
      };
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(simpleRequest),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  private async callApi(endpoint: string, body: GrokChatCompletionRequest): Promise<GrokChatCompletionResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (response.status === 403) {
          throw new Error('API quota exceeded. Please check your xAI billing.');
        }
        if (response.status === 401) {
          throw new Error('Invalid API key provided.');
        }
        throw new Error(`xAI API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return await response.json() as GrokChatCompletionResponse;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private getDefaultConfig(): Partial<LLMConfig> {
    return {
      model: 'grok-2-1212',
      temperature: 0.7,
      maxTokens: 1000,
      timeout: this.timeout,
    };
  }
}