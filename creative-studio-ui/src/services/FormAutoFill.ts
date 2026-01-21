/**
 * FormAutoFill - Pré-remplissage automatique des formulaires
 *
 * Utilise l'extracteur de contexte pour pré-remplir automatiquement
 * les formulaires des wizards avec des valeurs extraites du texte utilisateur
 */

import { contextExtractor, ExtractedContext, WorldContext, CharacterContext, SceneContext, DialogueContext, StoryboardContext, StyleContext } from './ContextExtractor';
import { World } from '@/types/world';
import { Character } from '@/types/character';

export interface AutoFillResult {
  success: boolean;
  filledFields: string[];
  suggestions: string[];
  confidence: number;
  data: any;
}

export interface FormData {
  [key: string]: any;
}

/**
 * Service de pré-remplissage automatique des formulaires
 */
export class FormAutoFill {
  private static instance: FormAutoFill;

  private constructor() {}

  static getInstance(): FormAutoFill {
    if (!FormAutoFill.instance) {
      FormAutoFill.instance = new FormAutoFill();
    }
    return FormAutoFill.instance;
  }

  /**
   * Pré-remplit automatiquement un formulaire de monde
   */
  autoFillWorldForm(text: string): AutoFillResult {
    const context = contextExtractor.analyzeText(text);
    const filledFields: string[] = [];
    const suggestions = contextExtractor.getSuggestions(context);

    if (!context.worldContext) {
      return {
        success: false,
        filledFields: [],
        suggestions,
        confidence: context.confidence,
        data: {}
      };
    }

    const formData: Partial<World> = {};

    // Mapping du contexte vers les champs du formulaire
    const worldContext = context.worldContext;

    // Nom du monde
    if (worldContext.name) {
      formData.name = worldContext.name;
      filledFields.push('name');
    }

    // Genres
    if (worldContext.genre && worldContext.genre.length > 0) {
      formData.genre = worldContext.genre;
      filledFields.push('genre');
    }

    // Tons
    if (worldContext.tone && worldContext.tone.length > 0) {
      formData.tone = worldContext.tone;
      filledFields.push('tone');
    }

    // Période temporelle
    if (worldContext.timePeriod) {
      formData.timePeriod = worldContext.timePeriod;
      filledFields.push('timePeriod');
    }

    // Atmosphère
    if (worldContext.atmosphere) {
      formData.atmosphere = worldContext.atmosphere;
      filledFields.push('atmosphere');
    }

    // Règles
    if (worldContext.rules && worldContext.rules.length > 0) {
      formData.rules = worldContext.rules;
      filledFields.push('rules');
    }

    // Magie
    if (worldContext.magic) {
      formData.magic = worldContext.magic;
      filledFields.push('magic');
    }

    // Technologie
    if (worldContext.technology) {
      formData.technology = worldContext.technology;
      filledFields.push('technology');
    }

    // Conflits
    if (worldContext.conflicts && worldContext.conflicts.length > 0) {
      formData.conflicts = worldContext.conflicts;
      filledFields.push('conflicts');
    }

    // Lieux
    if (worldContext.locations && worldContext.locations.length > 0) {
      formData.locations = worldContext.locations.map(loc => ({
        id: crypto.randomUUID(),
        name: loc.name || '',
        description: loc.description || '',
        type: loc.type || 'location'
      }));
      filledFields.push('locations');
    }

    return {
      success: filledFields.length > 0,
      filledFields,
      suggestions,
      confidence: context.confidence,
      data: formData
    };
  }

  /**
   * Pré-remplit automatiquement un formulaire de personnage
   */
  autoFillCharacterForm(text: string): AutoFillResult {
    const context = contextExtractor.analyzeText(text);
    const filledFields: string[] = [];
    const suggestions = contextExtractor.getSuggestions(context);

    if (!context.characterContext) {
      return {
        success: false,
        filledFields: [],
        suggestions,
        confidence: context.confidence,
        data: {}
      };
    }

    const formData: Partial<Character> = {};
    const characterContext = context.characterContext;

    // Nom du personnage
    if (characterContext.name) {
      formData.name = characterContext.name;
      filledFields.push('name');
    }

    // Traits de personnalité
    if (characterContext.personality && characterContext.personality.length > 0) {
      formData.personality = {
        traits: characterContext.personality,
        values: [],
        fears: [],
        desires: [],
        flaws: [],
        strengths: [],
        temperament: '',
        communication_style: ''
      };
      filledFields.push('personality');
    }

    // Apparence
    if (characterContext.appearance) {
      formData.visual_identity = {
        hair_color: '',
        hair_style: '',
        hair_length: '',
        eye_color: '',
        eye_shape: '',
        skin_tone: '',
        facial_structure: '',
        distinctive_features: [],
        age_range: characterContext.age || '',
        height: '',
        build: '',
        posture: '',
        clothing_style: characterContext.appearance,
        color_palette: []
      };
      filledFields.push('visual_identity');
    }

    // Background
    if (characterContext.background || characterContext.occupation) {
      formData.background = {
        origin: '',
        occupation: characterContext.occupation || '',
        education: '',
        family: '',
        significant_events: [],
        current_situation: characterContext.background || ''
      };
      filledFields.push('background');
    }

    // Relations
    if (characterContext.relationships && characterContext.relationships.length > 0) {
      formData.relationships = characterContext.relationships;
      filledFields.push('relationships');
    }

    return {
      success: filledFields.length > 0,
      filledFields,
      suggestions,
      confidence: context.confidence,
      data: formData
    };
  }

  /**
   * Pré-remplit automatiquement un formulaire de scène
   */
  autoFillSceneForm(text: string): AutoFillResult {
    const context = contextExtractor.analyzeText(text);
    const filledFields: string[] = [];
    const suggestions = contextExtractor.getSuggestions(context);

    if (!context.sceneContext) {
      return {
        success: false,
        filledFields: [],
        suggestions,
        confidence: context.confidence,
        data: {}
      };
    }

    const formData: any = {};
    const sceneContext = context.sceneContext;

    // Type de scène
    if (sceneContext.type) {
      formData.sceneType = sceneContext.type;
      filledFields.push('sceneType');
    }

    // Lieu
    if (sceneContext.location) {
      formData.location = sceneContext.location;
      filledFields.push('location');
    }

    // Moment de la journée
    if (sceneContext.time) {
      formData.timeOfDay = sceneContext.time;
      filledFields.push('timeOfDay');
    }

    // Personnages présents
    if (sceneContext.characters && sceneContext.characters.length > 0) {
      formData.characters = sceneContext.characters;
      filledFields.push('characters');
    }

    // Action/Description
    if (sceneContext.action) {
      formData.description = sceneContext.action;
      filledFields.push('description');
    }

    // Ambiance
    if (sceneContext.mood) {
      formData.mood = sceneContext.mood;
      filledFields.push('mood');
    }

    return {
      success: filledFields.length > 0,
      filledFields,
      suggestions,
      confidence: context.confidence,
      data: formData
    };
  }

  /**
   * Pré-remplit automatiquement un formulaire de dialogue
   */
  autoFillDialogueForm(text: string): AutoFillResult {
    const context = contextExtractor.analyzeText(text);
    const filledFields: string[] = [];
    const suggestions = contextExtractor.getSuggestions(context);

    if (!context.dialogueContext) {
      return {
        success: false,
        filledFields: [],
        suggestions,
        confidence: context.confidence,
        data: {}
      };
    }

    const formData: any = {};
    const dialogueContext = context.dialogueContext;

    // Interlocuteur principal
    if (dialogueContext.speaker) {
      formData.speaker = dialogueContext.speaker;
      filledFields.push('speaker');
    }

    // Interlocuteur secondaire
    if (dialogueContext.listener) {
      formData.listener = dialogueContext.listener;
      filledFields.push('listener');
    }

    // Sujet du dialogue
    if (dialogueContext.topic) {
      formData.topic = dialogueContext.topic;
      filledFields.push('topic');
    }

    // Ton du dialogue
    if (dialogueContext.tone) {
      formData.tone = dialogueContext.tone;
      filledFields.push('tone');
    }

    // Contexte du dialogue
    if (dialogueContext.context) {
      formData.context = dialogueContext.context;
      filledFields.push('context');
    }

    return {
      success: filledFields.length > 0,
      filledFields,
      suggestions,
      confidence: context.confidence,
      data: formData
    };
  }

  /**
   * Pré-remplit automatiquement un formulaire de storyboard
   */
  autoFillStoryboardForm(text: string): AutoFillResult {
    const context = contextExtractor.analyzeText(text);
    const filledFields: string[] = [];
    const suggestions = contextExtractor.getSuggestions(context);

    if (!context.storyboardContext) {
      return {
        success: false,
        filledFields: [],
        suggestions,
        confidence: context.confidence,
        data: {}
      };
    }

    const formData: any = {};
    const storyboardContext = context.storyboardContext;

    // Séquence
    if (storyboardContext.sequence) {
      formData.sequence = storyboardContext.sequence;
      filledFields.push('sequence');
    }

    // Nombre de plans
    if (storyboardContext.shots) {
      formData.shotsCount = storyboardContext.shots;
      filledFields.push('shotsCount');
    }

    // Style artistique
    if (storyboardContext.style) {
      formData.artStyle = storyboardContext.style;
      filledFields.push('artStyle');
    }

    // Thème
    if (storyboardContext.theme) {
      formData.theme = storyboardContext.theme;
      filledFields.push('theme');
    }

    return {
      success: filledFields.length > 0,
      filledFields,
      suggestions,
      confidence: context.confidence,
      data: formData
    };
  }

  /**
   * Pré-remplit automatiquement un formulaire de style
   */
  autoFillStyleForm(text: string): AutoFillResult {
    const context = contextExtractor.analyzeText(text);
    const filledFields: string[] = [];
    const suggestions = contextExtractor.getSuggestions(context);

    if (!context.styleContext) {
      return {
        success: false,
        filledFields: [],
        suggestions,
        confidence: context.confidence,
        data: {}
      };
    }

    const formData: any = {};
    const styleContext = context.styleContext;

    // Style cible
    if (styleContext.targetStyle) {
      formData.targetStyle = styleContext.targetStyle;
      filledFields.push('targetStyle');
    }

    // Style de référence
    if (styleContext.reference) {
      formData.referenceStyle = styleContext.reference;
      filledFields.push('referenceStyle');
    }

    // Humeur/Ambiance
    if (styleContext.mood) {
      formData.mood = styleContext.mood;
      filledFields.push('mood');
    }

    return {
      success: filledFields.length > 0,
      filledFields,
      suggestions,
      confidence: context.confidence,
      data: formData
    };
  }

  /**
   * Pré-remplit automatiquement n'importe quel formulaire basé sur le texte
   */
  autoFillForm(formType: string, text: string): AutoFillResult {
    switch (formType.toLowerCase()) {
      case 'world':
      case 'world-building':
        return this.autoFillWorldForm(text);

      case 'character':
      case 'character-creation':
        return this.autoFillCharacterForm(text);

      case 'scene':
      case 'scene-generator':
        return this.autoFillSceneForm(text);

      case 'dialogue':
      case 'dialogue-writer':
        return this.autoFillDialogueForm(text);

      case 'storyboard':
      case 'storyboard-creator':
        return this.autoFillStoryboardForm(text);

      case 'style':
      case 'style-transfer':
        return this.autoFillStyleForm(text);

      default:
        // Essai intelligent : analyse le texte et trouve le meilleur match
        return this.intelligentAutoFill(text);
    }
  }

  /**
   * Remplissage intelligent basé sur l'analyse du texte
   */
  private intelligentAutoFill(text: string): AutoFillResult {
    const context = contextExtractor.analyzeText(text);
    const suggestions = contextExtractor.getSuggestions(context);

    // Détermine le type de formulaire le plus approprié
    let bestMatch = 'unknown';
    let bestScore = 0;

    const scores = {
      world: context.worldContext ? Object.keys(context.worldContext).length : 0,
      character: context.characterContext ? Object.keys(context.characterContext).length : 0,
      scene: context.sceneContext ? Object.keys(context.sceneContext).length : 0,
      dialogue: context.dialogueContext ? Object.keys(context.dialogueContext).length : 0,
      storyboard: context.storyboardContext ? Object.keys(context.storyboardContext).length : 0,
      style: context.styleContext ? Object.keys(context.styleContext).length : 0
    };

    for (const [type, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestMatch = type;
      }
    }

    if (bestScore > 0) {
      // Utilise le meilleur match trouvé
      return this.autoFillForm(bestMatch, text);
    }

    // Aucun contexte spécifique trouvé
    return {
      success: false,
      filledFields: [],
      suggestions: [...suggestions, 'Essayez d\'être plus spécifique sur ce que vous voulez créer'],
      confidence: context.confidence,
      data: {}
    };
  }

  /**
   * Valide les données pré-remplies en temps réel
   */
  validateAutoFilledData(formType: string, data: any): { isValid: boolean, errors: string[], warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (formType.toLowerCase()) {
      case 'world':
        // Validation spécifique au monde
        if (data.name && data.name.length < 3) {
          warnings.push('Le nom du monde semble court, considérez un nom plus descriptif');
        }
        if (data.genre && data.genre.length === 0) {
          errors.push('Au moins un genre doit être sélectionné');
        }
        break;

      case 'character':
        // Validation spécifique au personnage
        if (data.name && data.name.length < 2) {
          warnings.push('Le nom du personnage semble court');
        }
        if (data.visual_identity?.age_range && isNaN(parseInt(data.visual_identity.age_range))) {
          errors.push('L\'âge doit être un nombre valide');
        }
        break;

      case 'scene':
        // Validation spécifique à la scène
        if (data.description && data.description.length < 10) {
          warnings.push('La description de la scène pourrait être plus détaillée');
        }
        break;

      case 'dialogue':
        // Validation spécifique au dialogue
        if (!data.speaker) {
          errors.push('Un interlocuteur doit être spécifié');
        }
        break;

      case 'storyboard':
        // Validation spécifique au storyboard
        if (data.shotsCount && (data.shotsCount < 1 || data.shotsCount > 50)) {
          errors.push('Le nombre de plans doit être entre 1 et 50');
        }
        break;

      case 'style':
        // Validation spécifique au style
        if (!data.targetStyle) {
          warnings.push('Spécifier un style cible aiderait à de meilleurs résultats');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Génère des suggestions d'amélioration pour les données pré-remplies
   */
  generateImprovementSuggestions(formType: string, data: any): string[] {
    const suggestions: string[] = [];

    switch (formType.toLowerCase()) {
      case 'world':
        if (!data.atmosphere) {
          suggestions.push('Ajouter une description de l\'atmosphère pour enrichir le monde');
        }
        if (!data.locations || data.locations.length === 0) {
          suggestions.push('Définir quelques lieux clés pour ancrer votre histoire');
        }
        if (!data.rules || data.rules.length === 0) {
          suggestions.push('Établir des règles ou lois pour donner de la consistance au monde');
        }
        break;

      case 'character':
        if (!data.background?.occupation) {
          suggestions.push('Définir une profession pour donner plus de profondeur au personnage');
        }
        if (!data.relationships || data.relationships.length === 0) {
          suggestions.push('Établir des relations avec d\'autres personnages');
        }
        break;

      case 'scene':
        if (!data.characters || data.characters.length === 0) {
          suggestions.push('Spécifier quels personnages sont présents dans la scène');
        }
        if (!data.timeOfDay) {
          suggestions.push('Indiquer le moment de la journée pour définir l\'ambiance');
        }
        break;

      case 'dialogue':
        if (!data.topic) {
          suggestions.push('Préciser le sujet du dialogue pour guider la génération');
        }
        if (!data.tone) {
          suggestions.push('Définir le ton (sérieux, humoristique, tendu...) du dialogue');
        }
        break;

      case 'storyboard':
        if (!data.shotsCount) {
          suggestions.push('Indiquer le nombre de plans souhaité pour le storyboard');
        }
        break;

      case 'style':
        if (!data.referenceStyle) {
          suggestions.push('Fournir une référence de style pour de meilleurs résultats');
        }
        break;
    }

    return suggestions;
  }

  /**
   * Obtient des statistiques sur l'efficacité du pré-remplissage
   */
  getAutoFillStats(): {
    totalRequests: number;
    successfulFills: number;
    averageConfidence: number;
    commonSuggestions: string[];
  } {
    // Ces statistiques seraient normalement trackées dans une vraie implémentation
    return {
      totalRequests: 0,
      successfulFills: 0,
      averageConfidence: 0,
      commonSuggestions: []
    };
  }
}

// Export de l'instance singleton
export const formAutoFill = FormAutoFill.getInstance();