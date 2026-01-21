/**
 * ContextExtractor - Extracteur de contexte intelligent
 *
 * Analyse le langage naturel pour extraire des informations contextuelles
 * et les mapper vers des valeurs structurées pour les wizards
 */

export interface ExtractedContext {
  // Métadonnées de l'extraction
  confidence: number; // 0-1, niveau de confiance
  entities: string[]; // Entités détectées (noms, lieux, concepts)
  sentiment: 'positive' | 'negative' | 'neutral';

  // Contexte spécifique aux wizards
  worldContext?: WorldContext;
  characterContext?: CharacterContext;
  sceneContext?: SceneContext;
  dialogueContext?: DialogueContext;
  storyboardContext?: StoryboardContext;
  styleContext?: StyleContext;
}

export interface WorldContext {
  name?: string;
  genre?: string[];
  tone?: string[];
  timePeriod?: string;
  atmosphere?: string;
  locations?: LocationContext[];
  rules?: string[];
  technology?: string;
  magic?: string;
  conflicts?: string[];
}

export interface CharacterContext {
  name?: string;
  age?: string;
  occupation?: string;
  personality?: string[];
  appearance?: string;
  background?: string;
  relationships?: string[];
}

export interface SceneContext {
  type?: string;
  location?: string;
  time?: string;
  characters?: string[];
  action?: string;
  mood?: string;
}

export interface DialogueContext {
  speaker?: string;
  listener?: string;
  topic?: string;
  tone?: string;
  context?: string;
}

export interface StoryboardContext {
  sequence?: string;
  shots?: number;
  style?: string;
  theme?: string;
}

export interface StyleContext {
  targetStyle?: string;
  reference?: string;
  mood?: string;
}

export interface LocationContext {
  name?: string;
  type?: string;
  description?: string;
}

/**
 * Extracteur de contexte intelligent
 */
export class ContextExtractor {
  private static instance: ContextExtractor;

  // Patterns de reconnaissance pour différents types de contenu
  private readonly patterns = {
    // Genres littéraires/cinématographiques
    genres: [
      'fantasy', 'science.fiction', 'sci.fi', 'scifi', 'horror', 'thriller',
      'drama', 'comedy', 'romance', 'action', 'adventure', 'mystery',
      'crime', 'western', 'animation', 'documentary', 'biography', 'war',
      'musical', 'satire', 'parody', 'dark', 'light', 'realistic'
    ],

    // Tons/atmosphères
    tones: [
      'dark', 'light', 'serious', 'humorous', 'dramatic', 'comedic',
      'mysterious', 'romantic', 'action.packed', 'intense', 'calm',
      'chaotic', 'peaceful', 'violent', 'gentle', 'satirical'
    ],

    // Périodes temporelles
    timePeriods: [
      'ancient', 'medieval', 'renaissance', 'victorian', 'modern',
      'future', 'prehistoric', 'contemporary', 'post.apocalyptic',
      'cyberpunk', 'steampunk', 'dieselpunk', 'atomic.age'
    ],

    // Types de personnages
    characterTypes: [
      'hero', 'villain', 'protagonist', 'antagonist', 'sidekick',
      'mentor', 'love.interest', 'rival', 'ally', 'traitor'
    ],

    // Traits de personnalité
    personalityTraits: [
      'brave', 'cowardly', 'intelligent', 'stupid', 'kind', 'cruel',
      'honest', 'deceitful', 'loyal', 'traitorous', 'optimistic', 'pessimistic',
      'confident', 'shy', 'ambitious', 'lazy', 'curious', 'apathetic'
    ],

    // Styles artistiques
    artStyles: [
      'realistic', 'cartoon', 'anime', 'manga', 'impressionist',
      'surreal', 'abstract', 'photorealistic', 'watercolor', 'oil.painting',
      'sketch', 'comic.book', 'pixel.art', '3d.rendered'
    ]
  };

  private constructor() {
    // Initialisation
  }

  static getInstance(): ContextExtractor {
    if (!ContextExtractor.instance) {
      ContextExtractor.instance = new ContextExtractor();
    }
    return ContextExtractor.instance;
  }

  /**
   * Analyse un texte et extrait le contexte
   */
  analyzeText(text: string): ExtractedContext {
    const normalizedText = text.toLowerCase().trim();

    // Analyse de base
    const entities = this.extractEntities(normalizedText);
    const sentiment = this.analyzeSentiment(normalizedText);
    const confidence = this.calculateConfidence(normalizedText, entities);

    // Extraction contextuelle par type de wizard
    const context: ExtractedContext = {
      confidence,
      entities,
      sentiment,
      worldContext: this.extractWorldContext(normalizedText),
      characterContext: this.extractCharacterContext(normalizedText),
      sceneContext: this.extractSceneContext(normalizedText),
      dialogueContext: this.extractDialogueContext(normalizedText),
      storyboardContext: this.extractStoryboardContext(normalizedText),
      styleContext: this.extractStyleContext(normalizedText)
    };

    return context;
  }

  /**
   * Extrait les entités nommées du texte
   */
  private extractEntities(text: string): string[] {
    const entities: string[] = [];

    // Extraction de mots en majuscules (noms propres potentiels)
    const capitalizedWords = text.match(/\b[A-Z][a-z]+\b/g) || [];
    entities.push(...capitalizedWords);

    // Extraction de mots entre guillemets
    const quotedWords = text.match(/"([^"]+)"/g) || [];
    entities.push(...quotedWords.map(q => q.slice(1, -1)));

    // Extraction de mots avec des traits spécifiques (noms de lieux, etc.)
    const specialPatterns = [
      /(?:in|at|from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi, // Lieux
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)(?:\s+kingdom|\s+empire|\s+world|\s+land)/gi // Royaumes/Mondes
    ];

    specialPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        entities.push(...matches.map(m => m.trim()));
      }
    });

    // Déduplication et filtrage
    return [...new Set(entities)].filter(entity =>
      entity.length > 2 && !this.isCommonWord(entity.toLowerCase())
    );
  }

  /**
   * Analyse le sentiment du texte
   */
  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'beautiful', 'fantastic', 'love', 'like'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'ugly', 'horrible', 'scary', 'dark'];

    const positiveCount = positiveWords.filter(word => text.includes(word)).length;
    const negativeCount = negativeWords.filter(word => text.includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Calcule le niveau de confiance de l'extraction
   */
  private calculateConfidence(text: string, entities: string[]): number {
    let confidence = 0.5; // Base confidence

    // Plus il y a d'entités, plus on est confiant
    confidence += Math.min(entities.length * 0.1, 0.3);

    // Plus le texte est long et descriptif, plus on est confiant
    if (text.length > 50) confidence += 0.1;
    if (text.length > 100) confidence += 0.1;

    // Mots-clés spécifiques augmentent la confiance
    const keywords = ['world', 'character', 'scene', 'storyboard', 'create', 'build', 'design'];
    const keywordMatches = keywords.filter(k => text.includes(k)).length;
    confidence += keywordMatches * 0.05;

    return Math.min(confidence, 1.0);
  }

  /**
   * Extrait le contexte pour un monde
   */
  private extractWorldContext(text: string): WorldContext | undefined {
    if (!this.isWorldRelated(text)) return undefined;

    const context: WorldContext = {};

    // Extraction du nom du monde
    const namePatterns = [
      /(?:world|kingdom|empire|land|realm)(?:\s+(?:of|called|named))?\s+([A-Z][a-zA-Z\s]+?)(?:\s+(?:where|which|that|with|$))/i,
      /([A-Z][a-zA-Z\s]+?)(?:\s+world|\s+kingdom|\s+empire)/i
    ];

    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        context.name = match[1].trim();
        break;
      }
    }

    // Extraction du genre
    context.genre = this.patterns.genres.filter(genre =>
      text.includes(genre.replace('.', ' '))
    );

    // Extraction du ton
    context.tone = this.patterns.tones.filter(tone =>
      text.includes(tone.replace('.', ' '))
    );

    // Extraction de la période temporelle
    const timePeriodMatch = this.patterns.timePeriods.find(period =>
      text.includes(period.replace('.', ' '))
    );
    if (timePeriodMatch) {
      context.timePeriod = timePeriodMatch;
    }

    // Extraction de l'atmosphère
    if (text.includes('atmosphere') || text.includes('mood') || text.includes('feeling')) {
      const atmospherePatterns = [
        /(?:atmosphere|mood|feeling)(?:\s+(?:is|of))?\s+([^,.]+)/i,
        /(?:dark|light|mysterious|peaceful|chaotic|violent)/i
      ];

      for (const pattern of atmospherePatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          context.atmosphere = match[1].trim();
          break;
        }
      }
    }

    // Extraction des règles
    if (text.includes('rules') || text.includes('laws')) {
      const rulesPattern = /(?:rules|laws)(?:\s+(?:are|include|state))?\s+([^,.]+)/i;
      const match = text.match(rulesPattern);
      if (match && match[1]) {
        context.rules = [match[1].trim()];
      }
    }

    // Extraction de la magie/technologie
    if (text.includes('magic')) {
      context.magic = 'present';
    }
    if (text.includes('technology') || text.includes('tech')) {
      context.technology = 'advanced';
    }

    return Object.keys(context).length > 0 ? context : undefined;
  }

  /**
   * Extrait le contexte pour un personnage
   */
  private extractCharacterContext(text: string): CharacterContext | undefined {
    if (!this.isCharacterRelated(text)) return undefined;

    const context: CharacterContext = {};

    // Extraction du nom
    const namePatterns = [
      /(?:character|person|personnage)(?:\s+(?:named|called))?\s+([A-Z][a-zA-Z\s]+)/i,
      /([A-Z][a-zA-Z]+)(?:\s+(?:is|was|who))/i
    ];

    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        context.name = match[1].trim();
        break;
      }
    }

    // Extraction de l'âge
    const agePatterns = [
      /(?:aged?|age)(?:\s+(?:of|is))?\s+(\d+)(?:\s+years?)?/i,
      /(\d+)(?:\s+years?)(?:\s+old)/i
    ];

    for (const pattern of agePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        context.age = match[1];
        break;
      }
    }

    // Extraction de la profession
    const occupationPatterns = [
      /(?:is|was|works|work)(?:\s+as)?\s+(?:a|an)\s+([a-zA-Z\s]+?)(?:\s+(?:who|that|$))/i,
      /(?:profession|job|occupation)(?:\s+(?:is|of))?\s+([a-zA-Z\s]+)/i
    ];

    for (const pattern of occupationPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        context.occupation = match[1].trim();
        break;
      }
    }

    // Extraction des traits de personnalité
    context.personality = this.patterns.personalityTraits.filter(trait =>
      text.includes(trait.replace('.', ' '))
    );

    return Object.keys(context).length > 0 ? context : undefined;
  }

  /**
   * Extrait le contexte pour une scène
   */
  private extractSceneContext(text: string): SceneContext | undefined {
    if (!this.isSceneRelated(text)) return undefined;

    const context: SceneContext = {};

    // Extraction du type de scène
    const sceneTypes = ['action', 'dialogue', 'transition', 'establishing', 'montage'];
    const sceneType = sceneTypes.find(type => text.includes(type));
    if (sceneType) {
      context.type = sceneType;
    }

    // Extraction du lieu
    const locationPatterns = [
      /(?:in|at|on|inside)\s+(?:the|a|an)?\s+([a-zA-Z\s]+?)(?:\s+(?:where|when|$))/i,
      /(?:location|place|setting)(?:\s+(?:is|of))?\s+([a-zA-Z\s]+)/i
    ];

    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        context.location = match[1].trim();
        break;
      }
    }

    // Extraction de l'heure
    const timePatterns = [
      /(?:at|during)\s+(?:night|day|morning|afternoon|evening|dusk|dawn)/i,
      /(?:time|moment)(?:\s+(?:is|of))?\s+([a-zA-Z\s]+)/i
    ];

    for (const pattern of timePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        context.time = match[1].trim();
        break;
      }
    }

    return Object.keys(context).length > 0 ? context : undefined;
  }

  /**
   * Extrait le contexte pour un dialogue
   */
  private extractDialogueContext(text: string): DialogueContext | undefined {
    if (!this.isDialogueRelated(text)) return undefined;

    const context: DialogueContext = {};

    // Extraction des interlocuteurs
    const speakerPattern = /(?:said|asked|told|spoke)(?:\s+to)?\s+([A-Z][a-zA-Z]+)/i;
    const match = text.match(speakerPattern);
    if (match && match[1]) {
      context.speaker = match[1];
    }

    // Extraction du sujet
    const topicPatterns = [
      /(?:about|regarding|concerning)\s+([a-zA-Z\s]+?)(?:\s+(?:and|but|or|$))/i,
      /(?:topic|subject)(?:\s+(?:is|of))?\s+([a-zA-Z\s]+)/i
    ];

    for (const pattern of topicPatterns) {
      const topicMatch = text.match(pattern);
      if (topicMatch && topicMatch[1]) {
        context.topic = topicMatch[1].trim();
        break;
      }
    }

    return Object.keys(context).length > 0 ? context : undefined;
  }

  /**
   * Extrait le contexte pour un storyboard
   */
  private extractStoryboardContext(text: string): StoryboardContext | undefined {
    if (!this.isStoryboardRelated(text)) return undefined;

    const context: StoryboardContext = {};

    // Extraction du nombre de plans
    const shotPattern = /(\d+)(?:\s+shots?|\s+plans?)/i;
    const shotMatch = text.match(shotPattern);
    if (shotMatch && shotMatch[1]) {
      context.shots = parseInt(shotMatch[1]);
    }

    // Extraction du style
    const styleMatch = this.patterns.artStyles.find(style =>
      text.includes(style.replace('.', ' '))
    );
    if (styleMatch) {
      context.style = styleMatch;
    }

    return Object.keys(context).length > 0 ? context : undefined;
  }

  /**
   * Extrait le contexte pour le style artistique
   */
  private extractStyleContext(text: string): StyleContext | undefined {
    if (!this.isStyleRelated(text)) return undefined;

    const context: StyleContext = {};

    // Extraction du style cible
    const styleMatch = this.patterns.artStyles.find(style =>
      text.includes(style.replace('.', ' '))
    );
    if (styleMatch) {
      context.targetStyle = styleMatch;
    }

    // Extraction de l'humeur
    if (text.includes('mood') || text.includes('feeling')) {
      const moodPattern = /(?:mood|feeling)(?:\s+(?:is|of))?\s+([a-zA-Z\s]+?)(?:\s+(?:and|but|$))/i;
      const match = text.match(moodPattern);
      if (match && match[1]) {
        context.mood = match[1].trim();
      }
    }

    return Object.keys(context).length > 0 ? context : undefined;
  }

  /**
   * Vérifie si le texte est lié aux mondes
   */
  private isWorldRelated(text: string): boolean {
    const worldKeywords = ['world', 'kingdom', 'empire', 'realm', 'land', 'universe', 'planet', 'dimension'];
    return worldKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Vérifie si le texte est lié aux personnages
   */
  private isCharacterRelated(text: string): boolean {
    const characterKeywords = ['character', 'personnage', 'person', 'hero', 'villain', 'protagonist'];
    return characterKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Vérifie si le texte est lié aux scènes
   */
  private isSceneRelated(text: string): boolean {
    const sceneKeywords = ['scene', 'scène', 'setting', 'location', 'place', 'environment'];
    return sceneKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Vérifie si le texte est lié aux dialogues
   */
  private isDialogueRelated(text: string): boolean {
    const dialogueKeywords = ['dialogue', 'conversation', 'talk', 'speak', 'said', 'asked', 'told'];
    return dialogueKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Vérifie si le texte est lié aux storyboards
   */
  private isStoryboardRelated(text: string): boolean {
    const storyboardKeywords = ['storyboard', 'shot', 'plan', 'sequence', 'frame'];
    return storyboardKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Vérifie si le texte est lié aux styles
   */
  private isStyleRelated(text: string): boolean {
    const styleKeywords = ['style', 'artistic', 'design', 'aesthetic', 'visual'];
    return styleKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Vérifie si un mot est commun (pour filtrer les entités)
   */
  private isCommonWord(word: string): boolean {
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being'];
    return commonWords.includes(word);
  }

  /**
   * Obtient des suggestions basées sur le contexte extrait
   */
  getSuggestions(context: ExtractedContext): string[] {
    const suggestions: string[] = [];

    // Suggestions basées sur le monde
    if (context.worldContext) {
      if (context.worldContext.genre?.includes('fantasy')) {
        suggestions.push('Ajouter des éléments de magie et de créatures fantastiques');
      }
      if (context.worldContext.tone?.includes('dark')) {
        suggestions.push('Développer les aspects sombres et mystérieux');
      }
    }

    // Suggestions basées sur le personnage
    if (context.characterContext) {
      if (!context.characterContext.background) {
        suggestions.push('Ajouter un background détaillé au personnage');
      }
      if (!context.characterContext.relationships) {
        suggestions.push('Définir les relations avec d\'autres personnages');
      }
    }

    // Suggestions générales
    if (context.confidence > 0.7) {
      suggestions.push('Les informations extraites semblent cohérentes');
    } else {
      suggestions.push('Considérez ajouter plus de détails pour améliorer la précision');
    }

    return suggestions;
  }
}

// Export de l'instance singleton
export const contextExtractor = ContextExtractor.getInstance();