import { LLMProvider, LLMConfig, Message } from '../interfaces';

export class OpenAIProvider implements LLMProvider {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;

  constructor(apiKey: string, baseUrl?: string, timeout?: number) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || 'https://api.openai.com/v1';
    this.timeout = timeout || 30000;
  }

  async generateText(prompt: string, config?: Partial<LLMConfig>): Promise<string> {
    // Mock implementation - return predefined response
    if (this.apiKey === 'invalid-key') {
      throw new Error('Invalid API key');
    }
    if (this.apiKey === 'timeout-key') {
      await new Promise(resolve => setTimeout(resolve, this.timeout + 1000));
      throw new Error('Request timeout');
    }
    return `OpenAI response to: ${prompt}`;
  }

  async generateCompletion(messages: Message[], config?: Partial<LLMConfig>): Promise<string> {
    if (this.apiKey === 'invalid-key') {
      throw new Error('Invalid API key');
    }
    const lastMessage = messages[messages.length - 1];
    return `OpenAI completion for: ${lastMessage.content}`;
  }

  async isAvailable(): Promise<boolean> {
    return this.apiKey !== 'invalid-key' && this.apiKey !== 'timeout-key';
  }
}