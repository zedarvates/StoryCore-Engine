/**
 * DataValidator - Service de validation des données
 *
 * Valide les schémas JSON et contraintes métier pour toutes les entités
 */

import { World } from '@/types/world';
import { Character } from '@/types/character';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  score: number; // Score de qualité des données (0-100)
}

export interface ValidationRule {
  name: string;
  validator: (data: any) => boolean;
  message: string;
  severity: 'error' | 'warning';
  weight: number; // Impact sur le score (0-10)
}

/**
 * Service de validation centralisé
 */
export class DataValidator {
  private static instance: DataValidator;
  private rules: Map<string, ValidationRule[]> = new Map();

  private constructor() {
    this.initializeRules();
  }

  static getInstance(): DataValidator {
    if (!DataValidator.instance) {
      DataValidator.instance = new DataValidator();
    }
    return DataValidator.instance;
  }

  /**
   * Valide un monde
   */
  validateWorld(world: World): ValidationResult {
    const rules = this.rules.get('world') || [];
    return this.validateEntity(world, rules);
  }

  /**
   * Valide un personnage
   */
  validateCharacter(character: Character): ValidationResult {
    const rules = this.rules.get('character') || [];
    return this.validateEntity(character, rules);
  }

  /**
   * Valide une séquence
   */
  validateSequence(sequence: any): ValidationResult {
    const rules = this.rules.get('sequence') || [];
    return this.validateEntity(sequence, rules);
  }

  /**
   * Valide une scène
   */
  validateScene(scene: any): ValidationResult {
    const rules = this.rules.get('scene') || [];
    return this.validateEntity(scene, rules);
  }

  /**
   * Valide un plan
   */
  validateShot(shot: any): ValidationResult {
    const rules = this.rules.get('shot') || [];
    return this.validateEntity(shot, rules);
  }

  /**
   * Validation générique d'entité
   */
  private validateEntity(entity: any, rules: ValidationRule[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let totalScore = 100;

    for (const rule of rules) {
      try {
        const isValid = rule.validator(entity);

        if (!isValid) {
          if (rule.severity === 'error') {
            errors.push(rule.message);
            totalScore -= rule.weight * 10; // Erreurs coûtent cher
          } else {
            warnings.push(rule.message);
            totalScore -= rule.weight * 2; // Avertissements coûtent moins
          }
        }
      } catch (error) {
        console.warn(`[DataValidator] Rule "${rule.name}" failed:`, error);
        // Considérer les règles défaillantes comme des avertissements
        warnings.push(`Validation rule "${rule.name}" could not be executed`);
        totalScore -= 5;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, Math.min(100, totalScore))
    };
  }

  /**
   * Initialise toutes les règles de validation
   */
  private initializeRules(): void {
    // Règles pour les mondes
    this.rules.set('world', [
      // Règles critiques (errors)
      {
        name: 'has-valid-id',
        validator: (world: World) => !!world.id && typeof world.id === 'string' && world.id.length > 0,
        message: 'World must have a valid string ID',
        severity: 'error',
        weight: 10
      },
      {
        name: 'has-name',
        validator: (world: World) => !!world.name && world.name.trim().length > 0,
        message: 'World must have a name',
        severity: 'error',
        weight: 8
      },
      {
        name: 'has-genre',
        validator: (world: World) => !!world.genre && Array.isArray(world.genre) && world.genre.length > 0,
        message: 'World must have at least one genre',
        severity: 'error',
        weight: 7
      },
      {
        name: 'valid-timestamps',
        validator: (world: World) => {
          if (!world.createdAt && !world.updatedAt) return true; // Optionnel
          const created = world.createdAt ? new Date(world.createdAt) : null;
          const updated = world.updatedAt ? new Date(world.updatedAt) : null;
          return (!created || !isNaN(created.getTime())) && (!updated || !isNaN(updated.getTime()));
        },
        message: 'Timestamps must be valid dates',
        severity: 'error',
        weight: 3
      },

      // Règles recommandées (warnings)
      {
        name: 'has-time-period',
        validator: (world: World) => !!world.timePeriod && world.timePeriod.trim().length > 0,
        message: 'Time period is recommended for world consistency',
        severity: 'warning',
        weight: 4
      },
      {
        name: 'has-tone',
        validator: (world: World) => !!world.tone && Array.isArray(world.tone) && world.tone.length > 0,
        message: 'Tone helps define the world atmosphere',
        severity: 'warning',
        weight: 3
      },
      {
        name: 'has-atmosphere',
        validator: (world: World) => !!world.atmosphere && world.atmosphere.trim().length > 0,
        message: 'Atmosphere description enhances world immersion',
        severity: 'warning',
        weight: 2
      },

      // Règles de qualité (warnings légères)
      {
        name: 'has-locations',
        validator: (world: World) => !!world.locations && Array.isArray(world.locations) && world.locations.length > 0,
        message: 'Adding locations makes the world more detailed',
        severity: 'warning',
        weight: 1
      },
      {
        name: 'has-rules',
        validator: (world: World) => !!world.rules && Array.isArray(world.rules) && world.rules.length > 0,
        message: 'World rules provide structure and consistency',
        severity: 'warning',
        weight: 1
      },
      {
        name: 'has-cultural-elements',
        validator: (world: World) => !!world.culturalElements &&
          (world.culturalElements.languages?.length > 0 ||
           world.culturalElements.religions?.length > 0 ||
           world.culturalElements.traditions?.length > 0),
        message: 'Cultural elements enrich the world background',
        severity: 'warning',
        weight: 1
      }
    ]);

    // Règles pour les personnages
    this.rules.set('character', [
      {
        name: 'has-valid-id',
        validator: (character: Character) => !!character.character_id && typeof character.character_id === 'string',
        message: 'Character must have a valid string ID',
        severity: 'error',
        weight: 10
      },
      {
        name: 'has-name',
        validator: (character: Character) => !!character.name && character.name.trim().length > 0,
        message: 'Character must have a name',
        severity: 'error',
        weight: 8
      },
      {
        name: 'has-visual-identity',
        validator: (character: Character) => !!character.visual_identity &&
          Object.keys(character.visual_identity).length > 0,
        message: 'Character must have visual identity information',
        severity: 'error',
        weight: 6
      },
      {
        name: 'has-personality',
        validator: (character: Character) => !!character.personality &&
          Object.keys(character.personality).length > 0,
        message: 'Character must have personality information',
        severity: 'warning',
        weight: 4
      },
      {
        name: 'has-background',
        validator: (character: Character) => !!character.background &&
          Object.keys(character.background).length > 0,
        message: 'Character background provides depth',
        severity: 'warning',
        weight: 2
      }
    ]);

    // Règles pour les séquences
    this.rules.set('sequence', [
      {
        name: 'has-valid-id',
        validator: (sequence: any) => !!sequence.id && typeof sequence.id === 'string',
        message: 'Sequence must have a valid string ID',
        severity: 'error',
        weight: 10
      },
      {
        name: 'has-name',
        validator: (sequence: any) => !!sequence.name && sequence.name.trim().length > 0,
        message: 'Sequence must have a name',
        severity: 'error',
        weight: 8
      },
      {
        name: 'has-duration',
        validator: (sequence: any) => typeof sequence.duration === 'number' && sequence.duration > 0,
        message: 'Sequence must have a valid duration',
        severity: 'error',
        weight: 6
      },
      {
        name: 'has-shots',
        validator: (sequence: any) => !!sequence.shots && typeof sequence.shots === 'number' && sequence.shots >= 0,
        message: 'Sequence must specify number of shots',
        severity: 'warning',
        weight: 3
      }
    ]);

    // Règles pour les scènes
    this.rules.set('scene', [
      {
        name: 'has-description',
        validator: (scene: any) => !!scene.description && scene.description.trim().length > 0,
        message: 'Scene must have a description',
        severity: 'error',
        weight: 8
      },
      {
        name: 'has-characters',
        validator: (scene: any) => !!scene.characters && Array.isArray(scene.characters) && scene.characters.length > 0,
        message: 'Scene should involve characters',
        severity: 'warning',
        weight: 3
      }
    ]);

    // Règles pour les plans
    this.rules.set('shot', [
      {
        name: 'has-valid-id',
        validator: (shot: any) => !!shot.id && typeof shot.id === 'string',
        message: 'Shot must have a valid string ID',
        severity: 'error',
        weight: 10
      },
      {
        name: 'has-description',
        validator: (shot: any) => !!shot.description && shot.description.trim().length > 0,
        message: 'Shot must have a description',
        severity: 'error',
        weight: 8
      },
      {
        name: 'has-duration',
        validator: (shot: any) => typeof shot.duration === 'number' && shot.duration > 0,
        message: 'Shot must have a valid duration',
        severity: 'error',
        weight: 6
      },
      {
        name: 'has-camera-angle',
        validator: (shot: any) => !!shot.camera_angle,
        message: 'Camera angle should be specified',
        severity: 'warning',
        weight: 2
      }
    ]);
  }

  /**
   * Ajoute une règle de validation personnalisée
   */
  addRule(entityType: string, rule: ValidationRule): void {
    if (!this.rules.has(entityType)) {
      this.rules.set(entityType, []);
    }
    this.rules.get(entityType)!.push(rule);
  }

  /**
   * Supprime une règle de validation
   */
  removeRule(entityType: string, ruleName: string): void {
    const entityRules = this.rules.get(entityType);
    if (entityRules) {
      const filteredRules = entityRules.filter(rule => rule.name !== ruleName);
      this.rules.set(entityType, filteredRules);
    }
  }

  /**
   * Valide un schéma JSON générique
   */
  validateJSONSchema(data: any, schema: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    try {
      // Validation basique de schéma
      this.validateObjectAgainstSchema(data, schema, '', errors, warnings);
    } catch (error) {
      errors.push(`Schema validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      score = 0;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, score - (errors.length * 10) - (warnings.length * 2))
    };
  }

  /**
   * Validation récursive contre un schéma
   */
  private validateObjectAgainstSchema(
    data: any,
    schema: any,
    path: string,
    errors: string[],
    warnings: string[]
  ): void {
    if (!schema) return;

    // Validation de type
    if (schema.type) {
      const actualType = Array.isArray(data) ? 'array' : typeof data;
      if (actualType !== schema.type) {
        errors.push(`${path}: Expected ${schema.type}, got ${actualType}`);
        return; // Ne pas continuer la validation si le type est incorrect
      }
    }

    // Validation de propriétés requises
    if (schema.required && Array.isArray(schema.required)) {
      for (const requiredProp of schema.required) {
        if (!(requiredProp in data)) {
          errors.push(`${path}: Missing required property "${requiredProp}"`);
        }
      }
    }

    // Validation des propriétés
    if (schema.properties && typeof data === 'object') {
      for (const [prop, propSchema] of Object.entries(schema.properties)) {
        if (prop in data) {
          const newPath = path ? `${path}.${prop}` : prop;
          this.validateObjectAgainstSchema(data[prop], propSchema, newPath, errors, warnings);
        }
      }
    }

    // Validation des items de tableau
    if (schema.items && Array.isArray(data)) {
      data.forEach((item, index) => {
        const newPath = `${path}[${index}]`;
        this.validateObjectAgainstSchema(item, schema.items, newPath, errors, warnings);
      });
    }
  }

  /**
   * Génère un rapport de validation détaillé
   */
  generateValidationReport(results: ValidationResult[]): string {
    let report = '# Rapport de Validation des Données\n\n';

    const totalEntities = results.length;
    const validEntities = results.filter(r => r.isValid).length;
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / totalEntities;

    report += `## Résumé\n`;
    report += `- **Entités validées** : ${totalEntities}\n`;
    report += `- **Entités valides** : ${validEntities} (${((validEntities / totalEntities) * 100).toFixed(1)}%)\n`;
    report += `- **Score moyen** : ${avgScore.toFixed(1)}/100\n\n`;

    // Erreurs par type
    const allErrors = results.flatMap(r => r.errors);
    const allWarnings = results.flatMap(r => r.warnings);

    report += `## Statistiques\n`;
    report += `- **Erreurs totales** : ${allErrors.length}\n`;
    report += `- **Avertissements totaux** : ${allWarnings.length}\n\n`;

    if (allErrors.length > 0) {
      report += `## Erreurs critiques\n`;
      allErrors.slice(0, 10).forEach((error, index) => {
        report += `${index + 1}. ${error}\n`;
      });
      if (allErrors.length > 10) {
        report += `... et ${allErrors.length - 10} autres erreurs\n`;
      }
      report += '\n';
    }

    if (allWarnings.length > 0) {
      report += `## Recommandations d'amélioration\n`;
      allWarnings.slice(0, 10).forEach((warning, index) => {
        report += `${index + 1}. ${warning}\n`;
      });
      if (allWarnings.length > 10) {
        report += `... et ${allWarnings.length - 10} autres avertissements\n`;
      }
    }

    return report;
  }
}

// Export de l'instance singleton
export const dataValidator = DataValidator.getInstance();