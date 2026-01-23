├─ Implémentation du service d'intégration LLM pour génération procédurale de contenu monde
├─ Performance: Cache des prompts similaires, batch processing pour éléments multiples | Complexité: Gestion des erreurs et retry logic, parsing JSON structuré | Maintenabilité: Interface claire avec séparation des templates | Coût: Optimisation des tokens, choix provider selon complexité
├─ Service facade sur provider-manager existant avec templates spécialisés world-building, rejet de génération directe (pas de réutilisabilité) et API custom (overkill pour ce scope)
├─
import { inject, injectable } from 'inversify';
import { LLMProvider } from '../llm/interfaces';

import { WorldBuilderError } from './types';

export type WorldElementType = 'characters' | 'scenes' | 'locations' | 'lore' | 'artifacts';
export type ComplexityLevel = 'simple' | 'moderate' | 'complex';

interface GenerationConfig {
  temperature: number;
  maxTokens: number;
  retries: number;
  timeout: number;
}

@injectable()
export class LLMAugmentationService {
  private readonly generationConfigs: Record<ComplexityLevel, GenerationConfig> = {
    simple: {
      temperature: 0.3,
      maxTokens: 1000,
      retries: 2,
      timeout: 30000
    },
    moderate: {
      temperature: 0.5,
      maxTokens: 2000,
      retries: 3,
      timeout: 60000
    },
    complex: {
      temperature: 0.7,
      maxTokens: 4000,
      retries: 3,
      timeout: 120000
    }
  };

  private readonly promptTemplates: Record<WorldElementType, string> = {
    characters: `Generate 3-5 detailed characters for a {genre} world. For each character provide:
- character_id (unique string)
- name
- age (adult/young/elder etc.)
- gender
- species (human/elf/dwarf etc.)
- occupation
- personality (array of traits)
- backstory (brief)
- motivations (array)
- relationships (array of objects with target_character_id, relationship_type, description, strength 1-10)
- abilities (array)
- appearance
- voice_description (optional)

World concept: {prompt}

Return as JSON array only.`,

    scenes: `Generate 5-8 key scenes for a {genre} story. For each scene provide:
- scene_id (unique string)
- name
- description
- location_id (placeholder or logical name)
- characters_present (array of character names)
- plot_points (array of key events)
- atmosphere
- time_of_day
- weather (optional)
- duration_estimate (in minutes)
- sequence_order (number)
- created_at (ISO string)
- updated_at (ISO string)

World concept: {prompt}

Return as JSON array only.`,

    locations: `Generate 4-6 important locations for a {genre} world. For each location provide:
- location_id (unique string)
- name
- type (city/forest/mountain/castle etc.)
- description
- coordinates (optional object with latitude, longitude, elevation)
- inhabitants (optional array of character names)
- landmarks (array)
- atmosphere
- strategic_importance (optional)
- created_at (ISO string)
- updated_at (ISO string)

World concept: {prompt}

Return as JSON array only.`,

    lore: `Generate 3-5 pieces of important lore/backstory for a {genre} world. For each lore entry provide:
- lore_id (unique string)
- title
- content (detailed backstory)
- category (history/myth/magic/politics etc.)
- significance
- related_entities (array of character/location names)
- created_at (ISO string)
- updated_at (ISO string)

World concept: {prompt}

Return as JSON array only.`,

    artifacts: `Generate 2-4 significant artifacts/magical items for a {genre} world. For each artifact provide:
- artifact_id (unique string)
- name
- type (weapon/jewelry/book etc.)
- description
- origin
- powers (optional array)
- current_location (optional)
- owner (optional)
- significance
- created_at (ISO string)
- updated_at (ISO string)

World concept: {prompt}

Return as JSON array only.`
  };

  constructor(
    @inject('LLMProvider') private readonly llmProvider: LLMProvider
  ) {}

  async generateWorldElement(
    elementType: WorldElementType,
    prompt: string,
    complexity: ComplexityLevel,
    genre: string = 'fantasy'
  ): Promise<string> {
    const config = this.generationConfigs[complexity];
    const template = this.promptTemplates[elementType];

    const fullPrompt = template
      .replace('{genre}', genre)
      .replace('{prompt}', prompt);

    return this.executeWithRetry(fullPrompt, config);
  }

  async enhanceElement(
    elementType: WorldElementType,
    existingData: string,
    enhancementPrompt: string,
    complexity: ComplexityLevel
  ): Promise<string> {
    const config = this.generationConfigs[complexity];

    const prompt = `Enhance the following ${elementType} data with additional details based on: ${enhancementPrompt}

Existing data:
${existingData}

Provide enhanced version with more depth and consistency. Return as JSON array only.`;

    return this.executeWithRetry(prompt, config);
  }

  async validateGeneration(
    elementType: WorldElementType,
    generatedData: string
  ): Promise<{ isValid: boolean; errors: string[] }> {
    try {
      const parsed = JSON.parse(generatedData);

      if (!Array.isArray(parsed)) {
        return { isValid: false, errors: ['Generated data must be a JSON array'] };
      }

      const errors: string[] = [];

      for (let i = 0; i < parsed.length; i++) {
        const item = parsed[i];

        if (typeof item !== 'object' || item === null) {
          errors.push(`Item ${i} must be an object`);
          continue;
        }

        const requiredFields = this.getRequiredFields(elementType);
        for (const field of requiredFields) {
          if (!(field in item)) {
            errors.push(`Item ${i} missing required field: ${field}`);
          }
        }

        if (item.created_at && !this.isValidISODate(item.created_at)) {
          errors.push(`Item ${i} has invalid created_at date`);
        }

        if (item.updated_at && !this.isValidISODate(item.updated_at)) {
          errors.push(`Item ${i} has invalid updated_at date`);
        }
      }

      return { isValid: errors.length === 0, errors };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  private async executeWithRetry(
    prompt: string,
    config: GenerationConfig
  ): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= config.retries; attempt++) {
      try {
        const result = await this.llmProvider.generateText(prompt, {
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          timeout: config.timeout
        });

        if (!result || result.trim().length === 0) {
          throw new WorldBuilderError('Empty response from LLM', 'EMPTY_RESPONSE');
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown LLM error');

        if (attempt < config.retries) {
          await this.delay(this.calculateBackoffDelay(attempt));
        }
      }
    }

    throw new WorldBuilderError(
      `LLM generation failed after ${config.retries} attempts: ${lastError?.message}`,
      'LLM_RETRY_EXHAUSTED',
      { lastError }
    );
  }

  private calculateBackoffDelay(attempt: number): number {
    return Math.min(1000 * Math.pow(2, attempt), 10000);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getRequiredFields(elementType: WorldElementType): string[] {
    const fieldMap: Record<WorldElementType, string[]> = {
      characters: ['character_id', 'name', 'age', 'gender', 'species', 'occupation', 'personality', 'backstory', 'motivations', 'abilities', 'appearance'],
      scenes: ['scene_id', 'name', 'description', 'location_id', 'characters_present', 'plot_points', 'atmosphere', 'time_of_day', 'sequence_order'],
      locations: ['location_id', 'name', 'type', 'description', 'landmarks', 'atmosphere'],
      lore: ['lore_id', 'title', 'content', 'category', 'significance', 'related_entities'],
      artifacts: ['artifact_id', 'name', 'type', 'description', 'origin', 'significance']
    };

    return fieldMap[elementType] || [];
  }

  private isValidISODate(dateString: string): boolean {
    try {
      const date = new Date(dateString);
      return date.toISOString() === dateString;
    } catch {
      return false;
    }
  }
}
├─
├─ import { LLMAugmentationService, WorldElementType } from './LLMAugmentationService';
import { LLMProvider } from '../llm/interfaces';

describe('LLMAugmentationService', () => {
  let llmAugmentationService: LLMAugmentationService;
  let mockLlmProvider: jest.Mocked<LLMProvider>;

  beforeEach(() => {
    mockLlmProvider = {
      generateText: jest.fn(),
      generateCompletion: jest.fn(),
      isAvailable: jest.fn().mockResolvedValue(true)
    };

    llmAugmentationService = new LLMAugmentationService(mockLlmProvider);
  });

  describe('generateWorldElement', () => {
    it('should generate characters successfully', async () => {
      const mockResponse = JSON.stringify([{
        character_id: 'hero1',
        name: 'Test Hero',
        age: 'adult',
        gender: 'male',
        species: 'human',
        occupation: 'warrior',
        personality: ['brave', 'loyal'],
        backstory: 'Born in a small village',
        motivations: ['protect the innocent'],
        abilities: ['sword fighting'],
        appearance: 'Tall with brown hair',
        voice_description: 'Deep and commanding'
      }]);

      mockLlmProvider.generateText.mockResolvedValue(mockResponse);

      const result = await llmAugmentationService.generateWorldElement(
        'characters',
        'A fantasy world with magic',
        'moderate',
        'fantasy'
      );

      expect(result).toBe(mockResponse);
      expect(mockLlmProvider.generateText).toHaveBeenCalledWith(
        expect.stringContaining('Generate 3-5 detailed characters'),
        expect.objectContaining({
          temperature: 0.5,
          maxTokens: 2000
        })
      );
    });

    it('should retry on failure', async () => {
      mockLlmProvider.generateText
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('{"test": "data"}');

      const result = await llmAugmentationService.generateWorldElement(
        'characters',
        'Test prompt',
        'simple'
      );

      expect(result).toBe('{"test": "data"}');
      expect(mockLlmProvider.generateText).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max retries', async () => {
      mockLlmProvider.generateText.mockRejectedValue(new Error('Persistent error'));

      await expect(
        llmAugmentationService.generateWorldElement('characters', 'Test', 'simple')
      ).rejects.toThrow('LLM generation failed after 2 attempts');
    });
  });

  describe('validateGeneration', () => {
    it('should validate valid JSON array', async () => {
      const validData = JSON.stringify([{
        character_id: 'test1',
        name: 'Test',
        age: 'adult',
        gender: 'male',
        species: 'human',
        occupation: 'test',
        personality: ['test'],
        backstory: 'test',
        motivations: ['test'],
        abilities: ['test'],
        appearance: 'test'
      }]);

      const result = await llmAugmentationService.validateGeneration('characters', validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid JSON', async () => {
      const invalidData = 'not json';

      const result = await llmAugmentationService.validateGeneration('characters', invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid JSON');
    });

    it('should detect missing required fields', async () => {
      const invalidData = JSON.stringify([{
        name: 'Test'
        // missing required fields
      }]);

      const result = await llmAugmentationService.validateGeneration('characters', invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('enhanceElement', () => {
    it('should enhance existing element', async () => {
      const existingData = JSON.stringify([{
        character_id: 'hero1',
        name: 'Hero',
        age: 'adult',
        gender: 'male',
        species: 'human',
        occupation: 'warrior',
        personality: ['brave'],
        backstory: 'Basic backstory',
        motivations: ['fight evil'],
        abilities: ['sword'],
        appearance: 'Tall'
      }]);

      const enhancedData = JSON.stringify([{
        character_id: 'hero1',
        name: 'Hero',
        age: 'adult',
        gender: 'male',
        species: 'human',
        occupation: 'warrior',
        personality: ['brave', 'wise'],
        backstory: 'Detailed enhanced backstory',
        motivations: ['fight evil', 'protect family'],
        abilities: ['sword', 'magic'],
        appearance: 'Tall with piercing blue eyes'
      }]);

      mockLlmProvider.generateText.mockResolvedValue(enhancedData);

      const result = await llmAugmentationService.enhanceElement(
        'characters',
        existingData,
        'Add more depth and magic abilities',
        'moderate'
      );

      expect(result).toBe(enhancedData);
    });
  });
});
├─
├─ Timeout provider LLM → retry avec backoff exponentiel | Rate limit dépassé → circuit breaker | Réponse malformée → parsing alternatif | Token limit dépassé → réduction complexité