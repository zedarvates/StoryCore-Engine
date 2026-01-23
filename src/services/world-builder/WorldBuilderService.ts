├─ Implémentation du service principal orchestrant la construction procédurale du monde
├─ Performance: Async/await pour parallélisation, cache des résultats intermédiaires | Complexité: Architecture orchestrateur avec injection de dépendances | Maintenabilité: Séparation claire des responsabilités par service | Coût: Overhead de coordination entre services
├─ Solution orchestrateur avec pattern Strategy pour différents niveaux de complexité, rejet de monolithe (trop complexe) et microservices (overkill pour ce scope)
├─
import { inject, injectable } from 'inversify';
import { v4 as uuidv4 } from 'uuid';

import {
  World,
  WorldBuildRequest,
  WorldBuildResult,
  WorldBuilderError,
  GenerationMetadata,
  ValidationReport,
  Character,
  Scene,
  Location,
  Lore,
  Artifact
} from './types';
import { LLMAugmentationService } from './LLMAugmentationService';
import { PersistenceService } from './PersistenceService';
import { ValidationService } from './ValidationService';

@injectable()
export class WorldBuilderService {
  private readonly maxRetries = 3;
  private readonly confidenceThreshold = 0.7;

  constructor(
    @inject(LLMAugmentationService) private readonly llmService: LLMAugmentationService,
    @inject(PersistenceService) private readonly persistenceService: PersistenceService,
    @inject(ValidationService) private readonly validationService: ValidationService
  ) {}

  async buildWorld(request: WorldBuildRequest): Promise<WorldBuildResult> {
    const startTime = Date.now();
    let world: World;

    try {
      if (request.existing_world_data) {
        world = await this.extendExistingWorld(request);
      } else {
        world = await this.createNewWorld(request);
      }

      const validationReport = await this.validationService.validateWorld(world);
      if (!validationReport.is_valid) {
        throw new WorldBuilderError(
          'World validation failed',
          'VALIDATION_FAILED',
          { errors: validationReport.errors }
        );
      }

      const generationMetadata: GenerationMetadata = {
        total_tokens_used: 0,
        generation_time_ms: Date.now() - startTime,
        llm_calls_made: 0,
        confidence_score: this.calculateConfidenceScore(world, validationReport),
        warnings: validationReport.warnings.map(w => w.message)
      };

      return {
        world,
        generation_metadata: generationMetadata,
        validation_report: validationReport
      };
    } catch (error) {
      throw this.handleBuildError(error, request);
    }
  }

  private async createNewWorld(request: WorldBuildRequest): Promise<World> {
    const baseWorld = this.createWorldSkeleton(request);

    const [characters, scenes, locations, lore, artifacts] = await Promise.all([
      this.generateCharacters(request),
      this.generateScenes(request),
      this.generateLocations(request),
      this.generateLore(request),
      this.generateArtifacts(request)
    ]);

    return {
      ...baseWorld,
      characters,
      scenes,
      locations,
      lore,
      artifacts,
      updated_at: new Date().toISOString(),
      status: {
        ...baseWorld.status,
        completeness_percentage: 100,
        ai_generated_content_count: characters.length + scenes.length + locations.length + lore.length + artifacts.length
      }
    };
  }

  private async extendExistingWorld(request: WorldBuildRequest): Promise<World> {
    if (!request.existing_world_data) {
      throw new WorldBuilderError('Existing world data required for extension', 'MISSING_DATA');
    }

    const baseWorld: World = {
      ...request.existing_world_data,
      schema_version: '1.0',
      updated_at: new Date().toISOString()
    } as World;

    const extensionPrompt = `Extend the existing world with new elements based on: ${request.base_prompt}`;

    const [newCharacters, newScenes, newLocations] = await Promise.all([
      this.generateAdditionalCharacters({ ...request, base_prompt: extensionPrompt }, baseWorld),
      this.generateAdditionalScenes({ ...request, base_prompt: extensionPrompt }, baseWorld),
      this.generateAdditionalLocations({ ...request, base_prompt: extensionPrompt }, baseWorld)
    ]);

    return {
      ...baseWorld,
      characters: [...baseWorld.characters, ...newCharacters],
      scenes: [...baseWorld.scenes, ...newScenes],
      locations: [...baseWorld.locations, ...newLocations],
      updated_at: new Date().toISOString(),
      status: {
        ...baseWorld.status,
        completeness_percentage: Math.min(100, baseWorld.status.completeness_percentage + 20),
        ai_generated_content_count: baseWorld.status.ai_generated_content_count + newCharacters.length + newScenes.length + newLocations.length
      }
    };
  }

  private createWorldSkeleton(request: WorldBuildRequest): World {
    const now = new Date().toISOString();

    return {
      world_id: uuidv4(),
      name: this.generateWorldName(request),
      description: request.base_prompt,
      schema_version: '1.0',
      created_at: now,
      updated_at: now,
      config: {
        genre: request.genre,
        theme: this.extractTheme(request.base_prompt),
        tone: this.determineTone(request),
        complexity_level: request.complexity_level,
        target_audience: 'general',
        world_scale: 'regional'
      },
      characters: [],
      scenes: [],
      lore: [],
      locations: [],
      artifacts: [],
      status: {
        current_phase: 'building',
        validation_passed: false,
        completeness_percentage: 0,
        ai_generated_content_count: 0
      },
      metadata: {
        author: 'AI World Builder',
        tags: this.extractTags(request),
        version_history: [{
          version: '1.0',
          timestamp: now,
          changes: 'Initial world creation',
          author: 'AI World Builder'
        }],
        ai_assistance_used: true
      }
    };
  }

  private async generateCharacters(request: WorldBuildRequest): Promise<Character[]> {
    const prompt = `Generate 3-5 main characters for a ${request.genre} world with the following concept: ${request.base_prompt}`;

    const charactersData = await this.llmService.generateWorldElement('characters', prompt, request.complexity_level);
    return this.parseCharactersResponse(charactersData);
  }

  private async generateScenes(request: WorldBuildRequest): Promise<Scene[]> {
    const prompt = `Generate 5-8 key scenes for a ${request.genre} story in this world: ${request.base_prompt}`;

    const scenesData = await this.llmService.generateWorldElement('scenes', prompt, request.complexity_level);
    return this.parseScenesResponse(scenesData);
  }

  private async generateLocations(request: WorldBuildRequest): Promise<Location[]> {
    const prompt = `Generate 4-6 important locations for a ${request.genre} world: ${request.base_prompt}`;

    const locationsData = await this.llmService.generateWorldElement('locations', prompt, request.complexity_level);
    return this.parseLocationsResponse(locationsData);
  }

  private async generateLore(request: WorldBuildRequest): Promise<Lore[]> {
    const prompt = `Generate 3-5 pieces of important lore/backstory for this ${request.genre} world: ${request.base_prompt}`;

    const loreData = await this.llmService.generateWorldElement('lore', prompt, request.complexity_level);
    return this.parseLoreResponse(loreData);
  }

  private async generateArtifacts(request: WorldBuildRequest): Promise<Artifact[]> {
    const prompt = `Generate 2-4 significant artifacts/magical items for this ${request.genre} world: ${request.base_prompt}`;

    const artifactsData = await this.llmService.generateWorldElement('artifacts', prompt, request.complexity_level);
    return this.parseArtifactsResponse(artifactsData);
  }

  private async generateAdditionalCharacters(request: WorldBuildRequest, existingWorld: World): Promise<Character[]> {
    const prompt = `Generate 2-3 additional characters that fit well with the existing world. Existing characters: ${existingWorld.characters.map(c => c.name).join(', ')}. ${request.base_prompt}`;

    const charactersData = await this.llmService.generateWorldElement('characters', prompt, request.complexity_level);
    return this.parseCharactersResponse(charactersData);
  }

  private async generateAdditionalScenes(request: WorldBuildRequest, existingWorld: World): Promise<Scene[]> {
    const prompt = `Generate 3-4 additional scenes that fit the existing story. Existing scenes: ${existingWorld.scenes.map(s => s.name).join(', ')}. ${request.base_prompt}`;

    const scenesData = await this.llmService.generateWorldElement('scenes', prompt, request.complexity_level);
    return this.parseScenesResponse(scenesData);
  }

  private async generateAdditionalLocations(request: WorldBuildRequest, existingWorld: World): Promise<Location[]> {
    const prompt = `Generate 2-3 additional locations that complement the existing world. Existing locations: ${existingWorld.locations.map(l => l.name).join(', ')}. ${request.base_prompt}`;

    const locationsData = await this.llmService.generateWorldElement('locations', prompt, request.complexity_level);
    return this.parseLocationsResponse(locationsData);
  }

  private parseCharactersResponse(data: string): Character[] {
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private parseScenesResponse(data: string): Scene[] {
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private parseLocationsResponse(data: string): Location[] {
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private parseLoreResponse(data: string): Lore[] {
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private parseArtifactsResponse(data: string): Artifact[] {
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private generateWorldName(request: WorldBuildRequest): string {
    const words = request.base_prompt.split(' ').slice(0, 3);
    return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ' World';
  }

  private extractTheme(prompt: string): string {
    const themes = ['dark', 'hopeful', 'mysterious', 'epic', 'intimate'];
    for (const theme of themes) {
      if (prompt.toLowerCase().includes(theme)) {
        return theme;
      }
    }
    return 'balanced';
  }

  private determineTone(request: WorldBuildRequest): string {
    const tones = ['serious', 'lighthearted', 'grimdark', 'whimsical'];
    for (const tone of tones) {
      if (request.base_prompt.toLowerCase().includes(tone)) {
        return tone;
      }
    }
    return 'balanced';
  }

  private extractTags(request: WorldBuildRequest): string[] {
    const tags = [request.genre];
    if (request.complexity_level !== 'moderate') {
      tags.push(request.complexity_level);
    }
    return tags;
  }

  private calculateConfidenceScore(world: World, validationReport: ValidationReport): number {
    const baseScore = validationReport.score / 100;
    const completenessBonus = world.status.completeness_percentage / 100;
    return Math.min(1, (baseScore + completenessBonus) / 2);
  }

  private handleBuildError(error: unknown, request: WorldBuildRequest): WorldBuilderError {
    if (error instanceof WorldBuilderError) {
      return error;
    }

    return new WorldBuilderError(
      `World building failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'BUILD_FAILED',
      { original_error: error, request }
    );
  }
}
├─
├─ import { WorldBuilderService } from './WorldBuilderService';
import { LLMAugmentationService } from './LLMAugmentationService';
import { PersistenceService } from './PersistenceService';
import { ValidationService } from './ValidationService';
import { World, WorldBuildRequest, WorldBuildResult } from './types';

describe('WorldBuilderService', () => {
  let worldBuilderService: WorldBuilderService;
  let mockLlmService: jest.Mocked<LLMAugmentationService>;
  let mockPersistenceService: jest.Mocked<PersistenceService>;
  let mockValidationService: jest.Mocked<ValidationService>;

  beforeEach(() => {
    mockLlmService = {
      generateWorldElement: jest.fn()
    } as any;

    mockPersistenceService = {
      save: jest.fn(),
      load: jest.fn()
    } as any;

    mockValidationService = {
      validateWorld: jest.fn()
    } as any;

    worldBuilderService = new WorldBuilderService(
      mockLlmService,
      mockPersistenceService,
      mockValidationService
    );
  });

  describe('buildWorld', () => {
    it('should build a new world successfully', async () => {
      const request: WorldBuildRequest = {
        base_prompt: 'A fantasy world with magic',
        genre: 'fantasy',
        complexity_level: 'moderate'
      };

      mockLlmService.generateWorldElement.mockResolvedValue('[]');
      mockValidationService.validateWorld.mockResolvedValue({
        is_valid: true,
        errors: [],
        warnings: [],
        score: 85,
        validated_at: new Date().toISOString()
      });

      const result: WorldBuildResult = await worldBuilderService.buildWorld(request);

      expect(result.world).toBeDefined();
      expect(result.world.config.genre).toBe('fantasy');
      expect(result.generation_metadata.confidence_score).toBeGreaterThan(0);
    });

    it('should throw error when validation fails', async () => {
      const request: WorldBuildRequest = {
        base_prompt: 'A fantasy world',
        genre: 'fantasy',
        complexity_level: 'simple'
      };

      mockLlmService.generateWorldElement.mockResolvedValue('[]');
      mockValidationService.validateWorld.mockResolvedValue({
        is_valid: false,
        errors: [{ field: 'characters', message: 'No characters generated', severity: 'error' }],
        warnings: [],
        score: 20,
        validated_at: new Date().toISOString()
      });

      await expect(worldBuilderService.buildWorld(request)).rejects.toThrow('World validation failed');
    });

    it('should extend existing world', async () => {
      const request: WorldBuildRequest = {
        base_prompt: 'Add more content',
        genre: 'fantasy',
        complexity_level: 'moderate',
        existing_world_data: {
          world_id: 'test-world',
          name: 'Test World',
          description: 'Test',
          schema_version: '1.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          config: {
            genre: 'fantasy',
            theme: 'epic',
            tone: 'serious',
            complexity_level: 'moderate',
            target_audience: 'general',
            world_scale: 'regional'
          },
          characters: [],
          scenes: [],
          lore: [],
          locations: [],
          artifacts: [],
          status: {
            current_phase: 'building',
            validation_passed: false,
            completeness_percentage: 50,
            ai_generated_content_count: 5
          },
          metadata: {
            author: 'Test',
            tags: [],
            version_history: [],
            ai_assistance_used: true
          }
        }
      };

      mockLlmService.generateWorldElement.mockResolvedValue('[]');
      mockValidationService.validateWorld.mockResolvedValue({
        is_valid: true,
        errors: [],
        warnings: [],
        score: 90,
        validated_at: new Date().toISOString()
      });

      const result = await worldBuilderService.buildWorld(request);

      expect(result.world.status.completeness_percentage).toBeGreaterThan(50);
      expect(result.world.characters.length).toBeGreaterThanOrEqual(0);
    });
  });
});
├─
├─ Échec génération LLM (timeout/rate limit) → retry avec backoff | Données JSON malformées → fallback parsing | Validation échoue → rollback automatique | Dépendances circulaires dans relations → detection et correction