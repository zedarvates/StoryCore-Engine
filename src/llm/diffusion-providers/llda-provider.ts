import { LLMProvider, LLMConfig, Message } from '../interfaces';
import { DiffusionConfig, DiffusionResponse } from '../diffusion-interfaces';

export class LLDAProvider implements LLMProvider {
  private baseUrl: string;

  constructor(config: Partial<LLMConfig>) {
    this.baseUrl = config.baseUrl || 'http://localhost:8005';
  }

  async generateText(prompt: string, config?: Partial<LLMConfig>): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          steps: (config?.options as any)?.steps || 15,
          scheduler: (config?.options as any)?.scheduler || 'dpm++',
          temperature: config?.temperature || 0.7,
          max_tokens: config?.maxTokens || 512,
        }),
      });

      if (!response.ok) {
        throw new Error(`Diffusion server error: ${response.statusText}`);
      }

      const data: DiffusionResponse = await response.json() as any;
      return data.text;
    } catch (error) {
      console.error('LLDA Generation failed:', error);
      throw error;
    }
  }

  async generateCompletion(messages: Message[], config?: Partial<LLMConfig>): Promise<string> {
    // Diffusion LLMs often work best with a single prompt, so we flatten messages
    const flattenedPrompt = messages.map(m => `${m.role}: ${m.content}`).join('\n');
    return this.generateText(flattenedPrompt, config);
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
