/**
 * ObjectsAIService - AI Service for Object Management
 *
 * Automatically generates objects, analyzes their narrative role,
 * and proposes connections with characters and locations.
 */

import { llmConfigService } from './llmConfigService';
import { notificationService } from './NotificationService';
import { LanguageCode } from '@/utils/llmConfigStorage';
import { StoryObject, ObjectType, ObjectRarity } from '@/types/object';

export interface ObjectAnalysis {
  narrativeRole: 'plot_device' | 'character_development' | 'world_building' | 'macguffin' | 'red_herring' | 'chekhovs_gun';
  thematicConnections: string[];
  characterRelationships: Array<{
    characterId: string;
    relationship: 'owns' | 'seeks' | 'guards' | 'fears' | 'created' | 'destroys';
    significance: string;
  }>;
  locationConnections: Array<{
    locationId: string;
    connection: 'stored' | 'crafted' | 'hidden' | 'guarded' | 'legend_origin';
    significance: string;
  }>;
  plotHooks: string[];
  conflictPotential: 'low' | 'medium' | 'high';
}

export interface ObjectGenerationOptions {
  theme: string;
  powerLevel: number;
  objectType: ObjectType;
  rarity: ObjectRarity;
  connectedTo?: {
    characters?: string[];
    locations?: string[];
    plotElements?: string[];
  };
}

/**
 * AI Service for Object Management
 */
export class ObjectsAIService {
  private static instance: ObjectsAIService;
  private objectsCache: Map<string, StoryObject[]> = new Map();
  private analysisCache: Map<string, ObjectAnalysis> = new Map();

  private constructor() { }

  static getInstance(): ObjectsAIService {
    if (!ObjectsAIService.instance) {
      ObjectsAIService.instance = new ObjectsAIService();
    }
    return ObjectsAIService.instance;
  }

  /**
   * Generates an object automatically with AI
   */
  async generateObject(options: ObjectGenerationOptions, language: LanguageCode = 'fr'): Promise<StoryObject> {
    try {
      const prompt = this.buildObjectGenerationPrompt(options, language);

      const llmService = llmConfigService.getService();
      if (!llmService) {
        throw new Error('LLM Service not configured');
      }

      const response = await llmService.generateCompletion({
        prompt: prompt,
        systemPrompt: language === 'fr'
          ? 'Tu es un expert en game design et en world building. Crée un objet détaillé au format JSON.'
          : 'You are an expert game designer and world builder. Create a detailed object in JSON format.'
      });

      const content = response.success ? response.data?.content : null;
      const generatedObject = this.parseGeneratedObject(content || '', options);

      notificationService.success(
        language === 'fr' ? 'Objet généré' : 'Object Generated',
        language === 'fr'
          ? `L'objet "${generatedObject.name}" a été créé avec succès.`
          : `Object "${generatedObject.name}" created successfully.`
      );

      return generatedObject;
    } catch (error) {
      console.error('Failed to generate object:', error);
      notificationService.error(
        language === 'fr' ? 'Erreur de génération' : 'Generation Error',
        language === 'fr' ? 'Impossible de générer l\'objet.' : 'Failed to generate object.'
      );

      // Fallback: create a basic object
      return this.createFallbackObject(options);
    }
  }

  /**
   * Analyzes the narrative role of an object
   */
  async analyzeObject(object: StoryObject, context?: {
    characters?: Array<{ id: string; name: string; role?: string }>;
    locations?: Array<{ id: string; name: string; type?: string }>;
    plotElements?: string[];
  }): Promise<ObjectAnalysis> {
    // Check cache
    const cacheKey = `analysis_${object.id}`;
    if (this.analysisCache.has(cacheKey)) {
      return this.analysisCache.get(cacheKey)!;
    }

    try {
      const prompt = this.buildAnalysisPrompt(object, context);

      const llmService = llmConfigService.getService();
      if (!llmService) {
        throw new Error('LLM Service not configured');
      }

      const response = await llmService.generateCompletion({
        prompt: prompt,
        systemPrompt: 'Tu es un expert en narration cinématographique. Analyse le rôle de cet objet dans l\'histoire.'
      });

      const content = response.success ? response.data?.content : null;
      const analysis = this.parseAnalysis(content || '');
      this.analysisCache.set(cacheKey, analysis);

      return analysis;
    } catch (error) {
      console.error('Failed to analyze object:', error);

      // Fallback: basic analysis
      return this.createFallbackAnalysis(object);
    }
  }

  /**
   * Generates multiple objects for a quest or treasure
   */
  async generateObjectSet(
    theme: string,
    count: number,
    baseRarity: ObjectRarity = 'common',
    language: LanguageCode = 'fr'
  ): Promise<StoryObject[]> {
    const objects: StoryObject[] = [];

    for (let i = 0; i < count; i++) {
      const options: ObjectGenerationOptions = {
        theme,
        powerLevel: this.getRandomPowerLevel(baseRarity),
        objectType: this.getRandomObjectType(),
        rarity: this.adjustRarity(baseRarity, i, count)
      };

      const object = await this.generateObject(options, language);
      objects.push(object);

      // Small delay to avoid overloading
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    notificationService.success(
      language === 'fr' ? 'Ensemble d\'objets généré' : 'Object Set Generated',
      language === 'fr'
        ? `${count} objets ont été créés pour le thème "${theme}".`
        : `${count} objects created for theme "${theme}".`
    );

    return objects;
  }

  /**
   * Suggests object improvements
   */
  async suggestObjectImprovements(object: StoryObject): Promise<{
    nameSuggestions: string[];
    abilitySuggestions: string[];
    loreEnhancements: string[];
    balanceAdjustments: string[];
  }> {
    try {
      const prompt = `Analyse cet objet de jeu et propose des améliorations:

Objet: ${object.name}
Type: ${object.type}
Rareté: ${object.rarity}
Puissance: ${object.power}
Description: ${object.description}
Lore: ${object.lore}
Capacités: ${(object.abilityStrings || []).join(', ')}

Propose:
1. 3 noms alternatifs plus immersifs
2. 2-3 nouvelles capacités intéressantes
3. Améliorations de l'histoire/lore
4. Ajustements d'équilibrage (puissance, rareté, etc.)

Réponds en format JSON structuré.`;

      const llmService = llmConfigService.getService();
      if (!llmService) {
        throw new Error('LLM Service not configured');
      }

      const response = await llmService.generateCompletion({
        prompt: prompt,
        systemPrompt: 'Tu es un expert en design d\'objets. Propose des améliorations pertinentes.'
      });

      const content = response.success ? response.data?.content : null;
      return this.parseImprovementSuggestions(content || '');
    } catch (error) {
      console.error('Failed to generate improvements:', error);
      return {
        nameSuggestions: [],
        abilitySuggestions: [],
        loreEnhancements: [],
        balanceAdjustments: []
      };
    }
  }

  /**
   * Finds connections between objects
   */
  async findObjectConnections(
    objects: StoryObject[],
    context?: {
      characters?: Array<{ id: string; name: string }>;
      locations?: Array<{ id: string; name: string }>;
    }
  ): Promise<Array<{
    objectId: string;
    connections: Array<{
      type: 'requires' | 'enhances' | 'conflicts' | 'complements';
      targetObjectId: string;
      explanation: string;
    }>;
  }>> {
    if (objects.length < 2) return [];

    try {
      const prompt = this.buildConnectionsPrompt(objects, context);

      const llmService = llmConfigService.getService();
      if (!llmService) {
        throw new Error('LLM Service not configured');
      }

      const response = await llmService.generateCompletion({
        prompt: prompt,
        systemPrompt: 'Tu es un expert en conception de systèmes de jeu. Identifie les synergies entre objets.'
      });

      const content = response.success ? response.data?.content : null;
      return this.parseConnections(content || '', objects);
    } catch (error) {
      console.error('Failed to find connections:', error);
      return [];
    }
  }

  // === PRIVATE METHODS ===

  private buildObjectGenerationPrompt(options: ObjectGenerationOptions, language: LanguageCode): string {
    const lang = language === 'fr' ? 'français' : 'english';

    return `Génère un objet fantastique détaillé en ${lang} avec ces caractéristiques:

Thème: ${options.theme}
Type d'objet: ${options.objectType}
Niveau de puissance: ${options.powerLevel}/100
Rareté: ${options.rarity}

${options.connectedTo ? `Connexions:
${options.connectedTo.characters ? `- Personnages liés: ${options.connectedTo.characters.join(', ')}` : ''}
${options.connectedTo.locations ? `- Lieux liés: ${options.connectedTo.locations.join(', ')}` : ''}
${options.connectedTo.plotElements ? `- Éléments de l'intrigue: ${options.connectedTo.plotElements.join(', ')}` : ''}
` : ''}

L'objet doit inclure:
- Nom immersif et évocateur
- Description détaillée (apparence, sensation, etc.)
- Histoire/lore captivante
- Capacités spéciales (3-5)
- Conditions d'utilisation
- Valeur et poids approximatifs

Format de réponse JSON:
{
  "name": "Nom de l'objet",
  "description": "Description détaillée",
  "lore": "Histoire et légende",
  "abilities": ["Capacité 1", "Capacité 2", "Capacité 3"],
  "requirements": "Conditions d'utilisation",
  "value": 1000,
  "weight": 5.5
}`;
  }

  private parseGeneratedObject(response: string, options: ObjectGenerationOptions): StoryObject {
    try {
      const jsonStart = response.indexOf('{');
      const jsonEnd = response.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1) throw new Error('No JSON found');

      const jsonContent = response.substring(jsonStart, jsonEnd + 1);
      const parsed = JSON.parse(jsonContent);

      return {
        id: `obj_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        name: parsed.name || 'Objet mystérieux',
        description: parsed.description || '',
        type: options.objectType,
        rarity: options.rarity,
        power: options.powerLevel,
        lore: parsed.lore || '',
        abilityStrings: Array.isArray(parsed.abilities) ? parsed.abilities : [],
        requirements: parsed.requirements || '',
        properties: {
          value: parsed.value || 100,
          weight: parsed.weight || 1,
        },
        tags: [options.theme, options.objectType],
        generatedBy: 'ai',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch {
      return this.createFallbackObject(options);
    }
  }

  private createFallbackObject(options: ObjectGenerationOptions): StoryObject {
    const fallbackNames: Record<string, string[]> = {
      weapon: ['Épée ancienne', 'Bâton runique', 'Arc elfique'],
      armor: ['Armure enchantée', 'Bouclier sacré', 'Cape magique'],
      artifact: ['Cristal mystique', 'Amulette ancienne', 'Relique perdue'],
      consumable: ['Potion curative', 'Élixir de force', 'Baume régénérant'],
      tool: ['Clé universelle', 'Boussole magique', 'Lentille de vérité'],
      treasure: ['Couronne royale', 'Joyau stellaire', 'Trésor ancien'],
      magical: ['Baguette de pouvoir', 'Orbe divin', 'Livre des secrets'],
      quest: ['Carte au trésor', 'Lettre scellée', 'Artefact de quête'],
      key: ['Clé dorée', 'Passe-partout', 'Sésame magique']
    };

    const names = fallbackNames[options.objectType] || ['Objet mystérieux'];

    return {
      id: `obj_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      name: names[Math.floor(Math.random() * names.length)],
      description: `Un objet ${options.objectType} ${options.rarity} lié au thème ${options.theme}.`,
      type: options.objectType,
      rarity: options.rarity,
      power: options.powerLevel,
      lore: `Légende liée au thème ${options.theme}.`,
      abilityStrings: ['Capacité spéciale 1', 'Capacité spéciale 2'],
      requirements: 'Aucune condition particulière',
      properties: {
        value: 100 * options.powerLevel,
        weight: Math.max(0.1, options.powerLevel / 20),
      },
      tags: [options.theme, options.objectType, options.rarity],
      generatedBy: 'ai',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private buildAnalysisPrompt(object: StoryObject, context?: {
    characters?: Array<{ id: string; name: string }>;
    locations?: Array<{ id: string; name: string }>;
  }): string {
    return `Analyse le rôle narratif de cet objet dans une histoire:

Objet: ${object.name}
Type: ${object.type}
Description: ${object.description}
Lore: ${object.lore}
Capacités: ${(object.abilityStrings || []).join(', ')}

${context ? `Contexte:
${context.characters ? `Personnages: ${context.characters.map(c => c.name).join(', ')}` : ''}
${context.locations ? `Lieux: ${context.locations.map(l => l.name).join(', ')}` : ''}
` : ''}

Détermine:
1. Rôle narratif: plot_device, character_development, world_building, macguffin, red_herring, chekhovs_gun
2. Connexions thématiques avec l'histoire
3. Relations potentielles avec les personnages
4. Liens possibles avec les lieux
5. Accroches pour l'intrigue (plot hooks)
6. Potentiel de conflit: low/medium/high

Réponds en format JSON structuré.`;
  }

  private parseAnalysis(response: string): ObjectAnalysis {
    try {
      const jsonStart = response.indexOf('{');
      const jsonEnd = response.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1) throw new Error('No JSON found');

      const jsonContent = response.substring(jsonStart, jsonEnd + 1);
      const parsed = JSON.parse(jsonContent);

      return {
        narrativeRole: parsed.narrativeRole || 'world_building',
        thematicConnections: Array.isArray(parsed.thematicConnections) ? parsed.thematicConnections : [],
        characterRelationships: Array.isArray(parsed.characterRelationships) ? parsed.characterRelationships : [],
        locationConnections: Array.isArray(parsed.locationConnections) ? parsed.locationConnections : [],
        plotHooks: Array.isArray(parsed.plotHooks) ? parsed.plotHooks : [],
        conflictPotential: parsed.conflictPotential || 'medium'
      };
    } catch {
      return this.createFallbackAnalysis({} as StoryObject);
    }
  }

  private createFallbackAnalysis(object: StoryObject): ObjectAnalysis {
    return {
      narrativeRole: 'world_building',
      thematicConnections: ['magie', 'aventure', 'mystère'],
      characterRelationships: [],
      locationConnections: [],
      plotHooks: ['Découverte mystérieuse', 'Pouvoir caché', 'Origines anciennes'],
      conflictPotential: 'medium'
    };
  }

  private parseImprovementSuggestions(response: string): any {
    try {
      const jsonStart = response.indexOf('{');
      const jsonEnd = response.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1) throw new Error('No JSON found');

      const jsonContent = response.substring(jsonStart, jsonEnd + 1);
      const parsed = JSON.parse(jsonContent);

      return {
        nameSuggestions: parsed.nameSuggestions || [],
        abilitySuggestions: parsed.abilitySuggestions || [],
        loreEnhancements: parsed.loreEnhancements || [],
        balanceAdjustments: parsed.balanceAdjustments || []
      };
    } catch {
      return {
        nameSuggestions: ['Nom alternatif 1', 'Nom alternatif 2', 'Nom alternatif 3'],
        abilitySuggestions: ['Nouvelle capacité 1', 'Nouvelle capacité 2'],
        loreEnhancements: ['Amélioration de l\'histoire'],
        balanceAdjustments: ['Ajustement d\'équilibrage']
      };
    }
  }

  private buildConnectionsPrompt(objects: StoryObject[], context?: {
    characters?: Array<{ id: string; name: string }>;
    locations?: Array<{ id: string; name: string }>;
  }): string {
    const objectList = objects.map(obj => `- ${obj.name} (${obj.type}, ${obj.rarity})`).join('\n');

    return `Analyse les connexions possibles entre ces objets:

${objectList}

${context ? `Contexte:
${context.characters ? `Personnages: ${context.characters.map(c => c.name).join(', ')}` : ''}
${context.locations ? `Lieux: ${context.locations.map(l => l.name).join(', ')}` : ''}
` : ''}

Pour chaque objet, identifie les relations avec les autres:
- requires: nécessite un autre objet
- enhances: améliore un autre objet
- conflicts: entre en conflit avec un autre objet
- complements: complète un autre objet

Réponds en format JSON structuré.`;
  }

  private parseConnections(response: string, objects: StoryObject[]): any[] {
    try {
      const jsonStart = response.indexOf('[');
      const jsonEnd = response.lastIndexOf(']');
      if (jsonStart === -1 || jsonEnd === -1) throw new Error('No JSON sequence found');

      const jsonContent = response.substring(jsonStart, jsonEnd + 1);
      return JSON.parse(jsonContent);
    } catch {
      return objects.map(obj => ({
        objectId: obj.id,
        connections: []
      }));
    }
  }

  private getRandomPowerLevel(rarity: ObjectRarity): number {
    const ranges: Record<string, [number, number]> = {
      common: [1, 30],
      uncommon: [20, 50],
      rare: [40, 70],
      epic: [60, 85],
      legendary: [80, 95],
      mythical: [90, 100],
      unique: [1, 100]
    };

    const [min, max] = ranges[rarity as string] || [1, 50];
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private getRandomObjectType(): ObjectType {
    const types: ObjectType[] = ['weapon', 'armor', 'artifact', 'consumable', 'tool', 'treasure', 'magical', 'quest', 'key'];
    return types[Math.floor(Math.random() * types.length)];
  }

  private adjustRarity(baseRarity: ObjectRarity, index: number, total: number): ObjectRarity {
    const rarityLevels: ObjectRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythical'];
    const baseIndex = rarityLevels.indexOf(baseRarity);
    if (baseIndex === -1) return baseRarity;

    const variation = Math.floor((index / total) * 3) - 1; // -1, 0, or 1
    const newIndex = Math.max(0, Math.min(rarityLevels.length - 1, baseIndex + variation));

    return rarityLevels[newIndex];
  }
}

// Export of the singleton instance
export const objectsAIService = ObjectsAIService.getInstance();
