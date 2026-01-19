import { LLMProvider, LLMConfig, Message } from './interfaces';

interface OpenRouterCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    text: string;
    index: number;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenRouterChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    index: number;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenRouterModelsResponse {
  object: string;
  data: Array<{
    id: string;
    object: string;
    created: number;
    owned_by: string;
  }>;
}

export class OpenRouterProvider implements LLMProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;

  constructor(apiKey: string, baseUrl = 'https://openrouter.ai/api/v1', timeout = 30000) {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('OpenRouter API key is required');
    }
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  async generateText(prompt: string, config?: Partial<LLMConfig>): Promise<string> {
    const mergedConfig = { ...this.getDefaultConfig(), ...config };
    const response = await this.callApi('/completions', {
      model: mergedConfig.model,
      prompt,
      temperature: mergedConfig.temperature,
      max_tokens: mergedConfig.maxTokens,
      ...mergedConfig.options,
    }) as OpenRouterCompletionResponse;
    return response.choices[0]?.text ?? '';
  }

  async generateCompletion(messages: Message[], config?: Partial<LLMConfig>): Promise<string> {
    const mergedConfig = { ...this.getDefaultConfig(), ...config };
    const response = await this.callApi('/chat/completions', {
      model: mergedConfig.model,
      messages,
      temperature: mergedConfig.temperature,
      max_tokens: mergedConfig.maxTokens,
      ...mergedConfig.options,
    }) as OpenRouterChatResponse;
    return response.choices[0]?.message?.content ?? '';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  private async callApi(endpoint: string, body: unknown): Promise<OpenRouterCompletionResponse | OpenRouterChatResponse> {
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
        if (response.status === 402 || (response.status === 429 && errorText.includes('credit'))) {
          throw new Error('API credits exceeded. Please check your OpenRouter billing.');
        }
        if (response.status === 401) {
          throw new Error('Invalid API key provided.');
        }
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return await response.json() as OpenRouterCompletionResponse | OpenRouterChatResponse;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private getDefaultConfig(): Partial<LLMConfig> {
    return {
      model: 'openai/gpt-4o',
      temperature: 0.7,
      maxTokens: 1000,
      timeout: this.timeout,
    };
  }
}