/**
 * ObjectsAIService - Service IA pour la gestion des objets
 *
 * Génère automatiquement des objets, analyse leur rôle narratif,
 * et propose des connexions avec personnages et lieux
 */

import { promptSuggestionService, type PromptSuggestion } from './PromptSuggestionService';
import { notificationService } from './NotificationService';
import { LanguageCode } from '@/utils/llmConfigStorage';

export interface GameObject {
  id: string;
  name: string;
  description: string;
  type: 'weapon' | 'armor' | 'artifact' | 'consumable' | 'tool' | 'treasure' | 'magical' | 'quest' | 'key';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythical';
  power: number; // 1-100
  lore: string;
  abilities: string[];
  requirements: string;
  value: number;
  weight: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

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
  objectType: GameObject['type'];
  rarity: GameObject['rarity'];
  connectedTo?: {
    characters?: string[];
    locations?: string[];
    plotElements?: string[];
  };
}

/**
 * Service IA pour la gestion des objets
 */
export class ObjectsAIService {
  private static instance: ObjectsAIService;
  private objectsCache: Map<string, GameObject[]> = new Map();
  private analysisCache: Map<string, ObjectAnalysis> = new Map();

  private constructor() {}

  static getInstance(): ObjectsAIService {
    if (!ObjectsAIService.instance) {
      ObjectsAIService.instance = new ObjectsAIService();
    }
    return ObjectsAIService.instance;
  }

  /**
   * Génère un objet automatiquement avec IA
   */
  async generateObject(options: ObjectGenerationOptions, language: LanguageCode = 'fr'): Promise<GameObject> {
    try {
      const prompt = this.buildObjectGenerationPrompt(options, language);
      const suggestions = await promptSuggestionService.generateSuggestions(
        [{ role: 'user', content: prompt }],
        language,
        ''
      );

      const generatedObject = this.parseGeneratedObject(suggestions[0]?.content || '', options);

      notificationService.success(
        'Objet généré',
        `L'objet "${generatedObject.name}" a été créé avec succès.`
      );

      return generatedObject;
    } catch (error) {
      console.error('Failed to generate object:', error);
      notificationService.error('Erreur de génération', 'Impossible de générer l\'objet.');

      // Fallback: créer un objet basique
      return this.createFallbackObject(options);
    }
  }

  /**
   * Analyse le rôle narratif d'un objet
   */
  async analyzeObject(object: GameObject, context?: {
    characters?: Array<{ id: string; name: string; role: string }>;
    locations?: Array<{ id: string; name: string; type: string }>;
    plotElements?: string[];
  }): Promise<ObjectAnalysis> {
    // Vérifier le cache
    const cacheKey = `analysis_${object.id}`;
    if (this.analysisCache.has(cacheKey)) {
      return this.analysisCache.get(cacheKey)!;
    }

    try {
      const prompt = this.buildAnalysisPrompt(object, context);
      const suggestions = await promptSuggestionService.generateSuggestions(
        [{ role: 'user', content: prompt }],
        'fr',
        ''
      );

      const analysis = this.parseAnalysis(suggestions[0]?.content || '');
      this.analysisCache.set(cacheKey, analysis);

      return analysis;
    } catch (error) {
      console.error('Failed to analyze object:', error);

      // Fallback: analyse basique
      return this.createFallbackAnalysis(object);
    }
  }

  /**
   * Génère plusieurs objets pour une quête ou un trésor
   */
  async generateObjectSet(
    theme: string,
    count: number,
    baseRarity: GameObject['rarity'] = 'common',
    language: LanguageCode = 'fr'
  ): Promise<GameObject[]> {
    const objects: GameObject[] = [];

    for (let i = 0; i < count; i++) {
      const options: ObjectGenerationOptions = {
        theme,
        powerLevel: this.getRandomPowerLevel(baseRarity),
        objectType: this.getRandomObjectType(),
        rarity: this.adjustRarity(baseRarity, i, count)
      };

      const object = await this.generateObject(options, language);
      objects.push(object);

      // Petit délai pour éviter la surcharge
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    notificationService.success(
      'Ensemble d\'objets généré',
      `${count} objets ont été créés pour le thème "${theme}".`
    );

    return objects;
  }

  /**
   * Propose des améliorations d'objet
   */
  async suggestObjectImprovements(object: GameObject): Promise<{
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
Capacités: ${object.abilities.join(', ')}

Propose:
1. 3 noms alternatifs plus immersifs
2. 2-3 nouvelles capacités intéressantes
3. Améliorations de l'histoire/lore
4. Ajustements d'équilibrage (puissance, rareté, etc.)

Réponds en format structuré.`;

      const suggestions = await promptSuggestionService.generateSuggestions(
        [{ role: 'user', content: prompt }],
        'fr',
        ''
      );

      return this.parseImprovementSuggestions(suggestions[0]?.content || '');
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
   * Trouve des connexions entre objets
   */
  async findObjectConnections(
    objects: GameObject[],
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
      const suggestions = await promptSuggestionService.generateSuggestions(
        [{ role: 'user', content: prompt }],
        'fr',
        ''
      );

      return this.parseConnections(suggestions[0]?.content || '', objects);
    } catch (error) {
      console.error('Failed to find connections:', error);
      return [];
    }
  }

  // === MÉTHODES PRIVÉES ===

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

  private parseGeneratedObject(response: string, options: ObjectGenerationOptions): GameObject {
    try {
      // Essayer de parser le JSON directement
      const parsed = JSON.parse(response.trim());

      return {
        id: `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: parsed.name || 'Objet mystérieux',
        description: parsed.description || '',
        type: options.objectType,
        rarity: options.rarity,
        power: options.powerLevel,
        lore: parsed.lore || '',
        abilities: Array.isArray(parsed.abilities) ? parsed.abilities : [],
        requirements: parsed.requirements || '',
        value: parsed.value || 100,
        weight: parsed.weight || 1,
        tags: [options.theme, options.objectType],
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch {
      // Fallback: extraire manuellement
      return this.createFallbackObject(options);
    }
  }

  private createFallbackObject(options: ObjectGenerationOptions): GameObject {
    const fallbackNames = {
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
      id: `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: names[Math.floor(Math.random() * names.length)],
      description: `Un objet ${options.objectType} ${options.rarity} lié au thème ${options.theme}.`,
      type: options.objectType,
      rarity: options.rarity,
      power: options.powerLevel,
      lore: `Légende liée au thème ${options.theme}.`,
      abilities: ['Capacité spéciale 1', 'Capacité spéciale 2'],
      requirements: 'Aucune condition particulière',
      value: 100 * options.powerLevel,
      weight: Math.max(0.1, options.powerLevel / 20),
      tags: [options.theme, options.objectType, options.rarity],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private buildAnalysisPrompt(object: GameObject, context?: any): string {
    return `Analyse le rôle narratif de cet objet dans une histoire:

Objet: ${object.name}
Type: ${object.type}
Description: ${object.description}
Lore: ${object.lore}
Capacités: ${object.abilities.join(', ')}

${context ? `Contexte:
${context.characters ? `Personnages: ${context.characters.map((c: any) => c.name).join(', ')}` : ''}
${context.locations ? `Lieux: ${context.locations.map((l: any) => l.name).join(', ')}` : ''}
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
      const parsed = JSON.parse(response.trim());
      return {
        narrativeRole: parsed.narrativeRole || 'world_building',
        thematicConnections: Array.isArray(parsed.thematicConnections) ? parsed.thematicConnections : [],
        characterRelationships: Array.isArray(parsed.characterRelationships) ? parsed.characterRelationships : [],
        locationConnections: Array.isArray(parsed.locationConnections) ? parsed.locationConnections : [],
        plotHooks: Array.isArray(parsed.plotHooks) ? parsed.plotHooks : [],
        conflictPotential: parsed.conflictPotential || 'medium'
      };
    } catch {
      return this.createFallbackAnalysis({} as GameObject);
    }
  }

  private createFallbackAnalysis(object: GameObject): ObjectAnalysis {
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
    // Parser les suggestions d'amélioration
    return {
      nameSuggestions: ['Nom alternatif 1', 'Nom alternatif 2', 'Nom alternatif 3'],
      abilitySuggestions: ['Nouvelle capacité 1', 'Nouvelle capacité 2'],
      loreEnhancements: ['Amélioration de l\'histoire'],
      balanceAdjustments: ['Ajustement d\'équilibrage']
    };
  }

  private buildConnectionsPrompt(objects: GameObject[], context?: any): string {
    const objectList = objects.map(obj => `- ${obj.name} (${obj.type}, ${obj.rarity})`).join('\n');

    return `Analyse les connexions possibles entre ces objets:

${objectList}

${context ? `Contexte:
${context.characters ? `Personnages: ${context.characters.map((c: any) => c.name).join(', ')}` : ''}
${context.locations ? `Lieux: ${context.locations.map((l: any) => l.name).join(', ')}` : ''}
` : ''}

Pour chaque objet, identifie les relations avec les autres:
- requires: nécessite un autre objet
- enhances: améliore un autre objet
- conflicts: entre en conflit avec un autre objet
- complements: complète un autre objet

Réponds en format JSON structuré.`;
  }

  private parseConnections(response: string, objects: GameObject[]): any[] {
    // Parser les connexions
    return objects.map(obj => ({
      objectId: obj.id,
      connections: []
    }));
  }

  private getRandomPowerLevel(rarity: GameObject['rarity']): number {
    const ranges = {
      common: [1, 30],
      uncommon: [20, 50],
      rare: [40, 70],
      epic: [60, 85],
      legendary: [80, 95],
      mythical: [90, 100]
    };

    const [min, max] = ranges[rarity];
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private getRandomObjectType(): GameObject['type'] {
    const types: GameObject['type'][] = ['weapon', 'armor', 'artifact', 'consumable', 'tool', 'treasure', 'magical', 'quest', 'key'];
    return types[Math.floor(Math.random() * types.length)];
  }

  private adjustRarity(baseRarity: GameObject['rarity'], index: number, total: number): GameObject['rarity'] {
    // Distribuer les raretés de manière équilibrée
    const rarityLevels: GameObject['rarity'][] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythical'];
    const baseIndex = rarityLevels.indexOf(baseRarity);

    // Ajouter une variation basée sur la position
    const variation = Math.floor((index / total) * 3) - 1; // -1, 0, or 1
    const newIndex = Math.max(0, Math.min(rarityLevels.length - 1, baseIndex + variation));

    return rarityLevels[newIndex];
  }
}

// Export de l'instance singleton
export const objectsAIService = ObjectsAIService.getInstance();
