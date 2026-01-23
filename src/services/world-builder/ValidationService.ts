├─ Implémentation du service de validation intelligente avec JSON Schema et règles métier
├─ Performance: Cache schémas compilés, validation sélective par sections | Complexité: Règles métier évoluées, scoring pondéré | Maintenabilité: Séparation schémas et logique, extensible | Coût: Overhead validation complète mais essentiel pour data integrity
├─ Validation hybride JSON Schema + business rules avec scoring, rejet de validation manuelle (error-prone) et bibliothèques lourdes (overkill simple)
├─
import { injectable } from 'inversify';
import Ajv, { ValidateFunction } from 'ajv';

import {
  World,
  ValidationReport,
  ValidationError,
  ValidationWarning,
  Character,
  Scene,
  Location,
  Lore,
  Artifact
} from './types';

@injectable()
export class ValidationService {
  private ajv: Ajv;
  private schemaCache: Map<string, ValidateFunction> = new Map();

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: true
    });

    this.initializeSchemas();
  }

  async validateWorld(world: World): Promise<ValidationReport> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const schemaErrors = this.validateSchema(world);
    errors.push(...schemaErrors);

    const businessErrors = this.validateBusinessRules(world);
    errors.push(...businessErrors.errors);
    warnings.push(...businessErrors.warnings);

    const consistencyErrors = this.validateConsistency(world);
    errors.push(...consistencyErrors.errors);
    warnings.push(...consistencyErrors.warnings);

    const score = this.calculateValidationScore(errors, warnings);

    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
      score,
      validated_at: new Date().toISOString()
    };
  }

  async validateCharacters(characters: Character[]): Promise<ValidationReport> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    for (let i = 0; i < characters.length; i++) {
      const charErrors = this.validateCharacter(characters[i]);
      charErrors.forEach(error => {
        errors.push({
          field: `characters[${i}].${error.field}`,
          message: error.message,
          severity: error.severity,
          suggestion: error.suggestion
        });
      });
    }

    const score = this.calculateValidationScore(errors, warnings);

    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
      score,
      validated_at: new Date().toISOString()
    };
  }

  async validateScenes(scenes: Scene[]): Promise<ValidationReport> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    for (let i = 0; i < scenes.length; i++) {
      const sceneErrors = this.validateScene(scenes[i]);
      sceneErrors.forEach(error => {
        errors.push({
          field: `scenes[${i}].${error.field}`,
          message: error.message,
          severity: error.severity,
          suggestion: error.suggestion
        });
      });
    }

    const score = this.calculateValidationScore(errors, warnings);

    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
      score,
      validated_at: new Date().toISOString()
    };
  }

  private initializeSchemas(): void {
    const worldSchema = {
      type: 'object',
      required: ['world_id', 'name', 'schema_version', 'created_at', 'updated_at', 'config', 'characters', 'scenes', 'locations', 'lore', 'artifacts', 'status', 'metadata'],
      properties: {
        world_id: { type: 'string', minLength: 1 },
        name: { type: 'string', minLength: 1, maxLength: 100 },
        description: { type: 'string', maxLength: 1000 },
        schema_version: { type: 'string', pattern: '^\\d+\\.\\d+$' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        config: {
          type: 'object',
          required: ['genre', 'theme', 'tone', 'complexity_level', 'target_audience', 'world_scale'],
          properties: {
            genre: { type: 'string', enum: ['fantasy', 'scifi', 'horror', 'mystery', 'historical', 'modern'] },
            theme: { type: 'string' },
            tone: { type: 'string' },
            complexity_level: { type: 'string', enum: ['simple', 'moderate', 'complex'] },
            target_audience: { type: 'string' },
            world_scale: { type: 'string', enum: ['personal', 'local', 'regional', 'global', 'cosmic'] },
            magic_system: { type: 'object' },
            technology_level: { type: 'string' }
          }
        },
        characters: { type: 'array', items: { type: 'object' } },
        scenes: { type: 'array', items: { type: 'object' } },
        locations: { type: 'array', items: { type: 'object' } },
        lore: { type: 'array', items: { type: 'object' } },
        artifacts: { type: 'array', items: { type: 'object' } },
        status: {
          type: 'object',
          required: ['current_phase', 'validation_passed', 'completeness_percentage', 'ai_generated_content_count'],
          properties: {
            current_phase: { type: 'string' },
            validation_passed: { type: 'boolean' },
            completeness_percentage: { type: 'number', minimum: 0, maximum: 100 },
            ai_generated_content_count: { type: 'integer', minimum: 0 }
          }
        },
        metadata: {
          type: 'object',
          required: ['author', 'tags', 'version_history', 'ai_assistance_used'],
          properties: {
            author: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            version_history: { type: 'array' },
            ai_assistance_used: { type: 'boolean' }
          }
        }
      }
    };

    this.schemaCache.set('world', this.ajv.compile(worldSchema));
  }

  private validateSchema(world: World): ValidationError[] {
    const validate = this.schemaCache.get('world');
    if (!validate) {
      return [{
        field: 'schema',
        message: 'World schema not found',
        severity: 'error'
      }];
    }

    const valid = validate(world);
    if (valid) {
      return [];
    }

    return (validate.errors || []).map(error => ({
      field: error.instancePath || error.params?.missingProperty || 'unknown',
      message: error.message || 'Schema validation error',
      severity: 'error' as const,
      suggestion: this.getSchemaErrorSuggestion(error)
    }));
  }

  private validateBusinessRules(world: World): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (world.characters.length === 0) {
      warnings.push({
        field: 'characters',
        message: 'World has no characters, which may limit story potential',
        suggestion: 'Consider adding at least one main character'
      });
    }

    if (world.scenes.length === 0) {
      warnings.push({
        field: 'scenes',
        message: 'World has no scenes, making it incomplete for storytelling',
        suggestion: 'Add key scenes to develop the narrative'
      });
    }

    if (world.characters.length > 20) {
      warnings.push({
        field: 'characters',
        message: 'World has many characters, which may be difficult to manage',
        suggestion: 'Consider consolidating similar characters or focusing on main ones'
      });
    }

    const duplicateNames = this.findDuplicateNames(world);
    if (duplicateNames.length > 0) {
      errors.push({
        field: 'names',
        message: `Duplicate names found: ${duplicateNames.join(', ')}`,
        severity: 'error',
        suggestion: 'Ensure all characters, locations, and artifacts have unique names'
      });
    }

    return { errors, warnings };
  }

  private validateConsistency(world: World): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const characterIds = new Set(world.characters.map(c => c.character_id));
    const locationIds = new Set(world.locations.map(l => l.location_id));

    for (const scene of world.scenes) {
      for (const charId of scene.characters_present) {
        if (!characterIds.has(charId)) {
          errors.push({
            field: `scenes.${scene.scene_id}.characters_present`,
            message: `Scene references non-existent character: ${charId}`,
            severity: 'error',
            suggestion: 'Ensure all referenced characters exist in the world'
          });
        }
      }

      if (scene.location_id && !locationIds.has(scene.location_id)) {
        errors.push({
          field: `scenes.${scene.scene_id}.location_id`,
          message: `Scene references non-existent location: ${scene.location_id}`,
          severity: 'error',
          suggestion: 'Ensure all referenced locations exist in the world'
        });
      }
    }

    for (const character of world.characters) {
      for (const relationship of character.relationships || []) {
        if (!characterIds.has(relationship.target_character_id)) {
          errors.push({
            field: `characters.${character.character_id}.relationships`,
            message: `Character references non-existent target: ${relationship.target_character_id}`,
            severity: 'error',
            suggestion: 'Ensure all relationship targets exist'
          });
        }
      }
    }

    if (world.updated_at < world.created_at) {
      errors.push({
        field: 'updated_at',
        message: 'Updated timestamp is before created timestamp',
        severity: 'error',
        suggestion: 'Ensure updated_at is not before created_at'
      });
    }

    return { errors, warnings };
  }

  private validateCharacter(character: Character): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!character.name || character.name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: 'Character name is required',
        severity: 'error'
      });
    }

    if (character.age && !['child', 'teen', 'adult', 'elder'].includes(character.age)) {
      errors.push({
        field: 'age',
        message: 'Age must be one of: child, teen, adult, elder',
        severity: 'error'
      });
    }

    if (character.personality && character.personality.length === 0) {
      errors.push({
        field: 'personality',
        message: 'At least one personality trait is recommended',
        severity: 'warning'
      });
    }

    return errors;
  }

  private validateScene(scene: Scene): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!scene.name || scene.name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: 'Scene name is required',
        severity: 'error'
      });
    }

    if (scene.duration_estimate <= 0) {
      errors.push({
        field: 'duration_estimate',
        message: 'Duration estimate must be positive',
        severity: 'error'
      });
    }

    if (scene.sequence_order < 0) {
      errors.push({
        field: 'sequence_order',
        message: 'Sequence order must be non-negative',
        severity: 'error'
      });
    }

    return errors;
  }

  private findDuplicateNames(world: World): string[] {
    const names = new Set<string>();
    const duplicates = new Set<string>();

    const allNamedEntities = [
      ...world.characters.map(c => c.name),
      ...world.locations.map(l => l.name),
      ...world.artifacts.map(a => a.name)
    ];

    for (const name of allNamedEntities) {
      if (names.has(name)) {
        duplicates.add(name);
      } else {
        names.add(name);
      }
    }

    return Array.from(duplicates);
  }

  private calculateValidationScore(errors: ValidationError[], warnings: ValidationWarning[]): number {
    const errorWeight = 10;
    const warningWeight = 2;

    const errorPenalty = errors.length * errorWeight;
    const warningPenalty = warnings.length * warningWeight;

    const baseScore = 100;
    const totalPenalty = errorPenalty + warningPenalty;

    return Math.max(0, baseScore - totalPenalty);
  }

  private getSchemaErrorSuggestion(error: any): string {
    if (error.keyword === 'required') {
      return `Add the required field: ${error.params.missingProperty}`;
    }
    if (error.keyword === 'type') {
      return `Change to type: ${error.params.type}`;
    }
    if (error.keyword === 'enum') {
      return `Use one of: ${error.params.allowedValues.join(', ')}`;
    }
    return 'Check the data format against the schema';
  }
}
├─
├─ import { ValidationService } from './ValidationService';
import { World, Character, Scene } from './types';

describe('ValidationService', () => {
  let validationService: ValidationService;

  beforeEach(() => {
    validationService = new ValidationService();
  });

  describe('validateWorld', () => {
    it('should validate a complete world successfully', async () => {
      const world: World = {
        world_id: 'test-world',
        name: 'Test World',
        description: 'A test world',
        schema_version: '1.0',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        config: {
          genre: 'fantasy',
          theme: 'epic',
          tone: 'serious',
          complexity_level: 'moderate',
          target_audience: 'general',
          world_scale: 'regional'
        },
        characters: [{
          character_id: 'char1',
          name: 'Test Character',
          age: 'adult',
          gender: 'male',
          species: 'human',
          occupation: 'warrior',
          personality: ['brave'],
          backstory: 'Born in a village',
          motivations: ['protect the innocent'],
          abilities: ['sword fighting'],
          appearance: 'Tall with brown hair',
          relationships: [],
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z'
        }],
        scenes: [{
          scene_id: 'scene1',
          name: 'Opening Scene',
          description: 'The hero begins his journey',
          location_id: 'loc1',
          characters_present: ['char1'],
          plot_points: ['Hero receives call to adventure'],
          atmosphere: 'tense',
          time_of_day: 'dawn',
          duration_estimate: 300,
          sequence_order: 1,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z'
        }],
        locations: [{
          location_id: 'loc1',
          name: 'Starting Village',
          type: 'village',
          description: 'A small peaceful village',
          landmarks: ['central well'],
          atmosphere: 'peaceful',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z'
        }],
        lore: [],
        artifacts: [],
        status: {
          current_phase: 'completed',
          validation_passed: true,
          completeness_percentage: 100,
          ai_generated_content_count: 3
        },
        metadata: {
          author: 'Test Author',
          tags: ['fantasy', 'epic'],
          version_history: [],
          ai_assistance_used: true
        }
      };

      const result = await validationService.validateWorld(world);

      expect(result.is_valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.score).toBe(100);
    });

    it('should detect missing required fields', async () => {
      const invalidWorld = {
        world_id: 'test-world'
        // missing many required fields
      } as any;

      const result = await validationService.validateWorld(invalidWorld);

      expect(result.is_valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect consistency errors', async () => {
      const world: World = {
        world_id: 'test-world',
        name: 'Test World',
        description: 'A test world',
        schema_version: '1.0',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        config: {
          genre: 'fantasy',
          theme: 'epic',
          tone: 'serious',
          complexity_level: 'moderate',
          target_audience: 'general',
          world_scale: 'regional'
        },
        characters: [],
        scenes: [{
          scene_id: 'scene1',
          name: 'Test Scene',
          description: 'Test',
          location_id: 'nonexistent',
          characters_present: ['nonexistent'],
          plot_points: [],
          atmosphere: 'test',
          time_of_day: 'day',
          duration_estimate: 100,
          sequence_order: 1,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z'
        }],
        locations: [],
        lore: [],
        artifacts: [],
        status: {
          current_phase: 'building',
          validation_passed: false,
          completeness_percentage: 50,
          ai_generated_content_count: 1
        },
        metadata: {
          author: 'Test',
          tags: [],
          version_history: [],
          ai_assistance_used: true
        }
      };

      const result = await validationService.validateWorld(world);

      expect(result.is_valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('non-existent'))).toBe(true);
    });
  });

  describe('validateCharacters', () => {
    it('should validate valid characters', async () => {
      const characters: Character[] = [{
        character_id: 'char1',
        name: 'Valid Character',
        age: 'adult',
        gender: 'female',
        species: 'human',
        occupation: 'mage',
        personality: ['wise', 'mysterious'],
        backstory: 'Born with magical powers',
        motivations: ['seek knowledge'],
        abilities: ['magic'],
        appearance: 'Tall with blue eyes',
        relationships: [],
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      }];

      const result = await validationService.validateCharacters(characters);

      expect(result.is_valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid characters', async () => {
      const characters: Character[] = [{
        character_id: 'char1',
        name: '',
        age: 'invalid',
        gender: 'female',
        species: 'human',
        occupation: 'mage',
        personality: [],
        backstory: 'Test',
        motivations: [],
        abilities: [],
        appearance: 'Test',
        relationships: [],
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      }];

      const result = await validationService.validateCharacters(characters);

      expect(result.is_valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateScenes', () => {
    it('should validate valid scenes', async () => {
      const scenes: Scene[] = [{
        scene_id: 'scene1',
        name: 'Valid Scene',
        description: 'A valid scene',
        location_id: 'loc1',
        characters_present: ['char1'],
        plot_points: ['something happens'],
        atmosphere: 'tense',
        time_of_day: 'night',
        duration_estimate: 200,
        sequence_order: 2,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      }];

      const result = await validationService.validateScenes(scenes);

      expect(result.is_valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid scenes', async () => {
      const scenes: Scene[] = [{
        scene_id: 'scene1',
        name: '',
        description: 'Test',
        location_id: 'loc1',
        characters_present: [],
        plot_points: [],
        atmosphere: 'test',
        time_of_day: 'day',
        duration_estimate: -5,
        sequence_order: -1,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      }];

      const result = await validationService.validateScenes(scenes);

      expect(result.is_valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('required'))).toBe(true);
      expect(result.errors.some(e => e.message.includes('positive'))).toBe(true);
    });
  });
});
├─
├─ Schéma JSON évolue → recompilation cache nécessaire | Règles métier complexes → tests exhaustifs requis | Données volumineuses → streaming validation | Inconsistances subtiles → IA/ML detection future