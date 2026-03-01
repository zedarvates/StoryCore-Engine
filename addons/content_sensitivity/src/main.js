/**
 * Main entry point — Content Sensitivity Addon
 *
 * Orchestrateur principal : analyse le contenu et applique les mécanismes
 * de censure automatique selon le niveau de sensibilité détecté.
 */

'use strict';

const dialogueAnalysis      = require('./dialogue_analysis');
const clothingAnalysis      = require('./clothing_analysis');
const scenarioAnalysis      = require('./scenario_analysis');
const scoringSystem         = require('./scoring_system');
const PEGIAnalyzer          = require('./pegi_analysis');
const censorshipMechanisms  = require('./censorship_mechanisms');
const pixelationEngine      = require('./pixelation_engine');
const narrativeSubstitution = require('./narrative_substitution');
const cinematicSubstitution = require('./cinematic_substitution');

class ContentSensitivityAddon {
  constructor() {
    this.name                = 'content_sensitivity';
    this.config              = {};
    this.sensitivityCriteria = {};
    this.pegiAnalyzer        = new PEGIAnalyzer();
    this.initialized         = false;
  }

  // ─── Initialisation ──────────────────────────────────────────────────────────

  async initialize(config = {}) {
    this.config              = config;
    this.sensitivityCriteria = require('../config/schema.json');
    this.culturalContext     = require('../config/cultural_context.json');

    if (config.perspective_api_key) {
      await this.initializeExternalServices();
    }

    this.initialized = true;
    console.log('[ContentSensitivity] Addon initialisé.');
  }

  async initializeExternalServices() {
    try {
      const perspectiveApi  = require('perspective-api-client');
      this.perspectiveClient = new perspectiveApi.Client({
        apiKey: this.config.perspective_api_key,
      });
      console.log('[ContentSensitivity] Perspective API initialisée.');
    } catch (err) {
      console.warn('[ContentSensitivity] Perspective API non disponible :', err.message);
    }
  }

  // ─── Analyse du contenu ───────────────────────────────────────────────────────

  /**
   * Analyse l'ensemble du contenu et retourne un rapport complet.
   * @param {{ dialogue?, clothing?, context?, scenario?, image? }} content
   * @returns {Promise<AnalysisResult>}
   */
  async analyzeContent(content) {
    const results = {
      dialogue: content.dialogue
        ? await this.analyzeDialogue(content.dialogue)
        : { score: 0, flaggedWords: [], recommendations: [] },
      clothing: content.clothing
        ? await this.analyzeClothing(content.clothing, content.context)
        : { score: 0, flaggedItems: [], recommendations: [] },
      scenario: content.scenario
        ? await this.analyzeScenario(content.scenario)
        : { score: 0, flaggedElements: [], recommendations: [] },
    };

    const overallScore     = scoringSystem.calculateSensitivityScore(results);
    const sensitivityLevel = scoringSystem.mapToSensitivityLevel(overallScore);
    const indicators       = this.detectContentIndicators(results);
    const pegiRating       = this.pegiAnalyzer.getRating(overallScore);
    const contentWarnings  = this.pegiAnalyzer.getContentWarnings(indicators);

    return {
      score:            overallScore,
      level:            sensitivityLevel,
      pegi_rating:      pegiRating,
      content_warnings: contentWarnings,
      indicators,
      recommendations:  this.getRecommendations(sensitivityLevel),
      details:          results,
    };
  }

  /**
   * Détecte les indicateurs de contenu (violence, language, etc.)
   * @param {object} results Résultats d'analyse
   * @returns {string[]}
   */
  detectContentIndicators(results) {
    const indicators  = [];
    const thresholds  = this.sensitivityCriteria?.content_indicators ?? {};

    if (results.dialogue?.score >= (thresholds.violence?.threshold ?? 20)) {
      indicators.push('violence');
    }
    if (results.dialogue?.score >= (thresholds.language?.threshold ?? 15)) {
      indicators.push('language');
    }
    if (results.scenario?.score >= (thresholds.fear?.threshold ?? 10)) {
      indicators.push('fear');
    }
    if (results.dialogue?.flaggedWords?.includes('drugs')) {
      indicators.push('drugs');
    }
    if (results.dialogue?.flaggedWords?.includes('sex')) {
      indicators.push('sex');
    }
    if (results.scenario?.flaggedElements?.some(e =>
      typeof e === 'string' ? e === 'discrimination' : e?.item === 'discrimination'
    )) {
      indicators.push('discrimination');
    }

    return indicators;
  }

  async analyzeDialogue(dialogue) {
    return dialogueAnalysis.analyzeDialogue(dialogue);
  }

  async analyzeClothing(clothing, context) {
    return clothingAnalysis.analyzeClothing(clothing, context);
  }

  async analyzeScenario(scenario) {
    return scenarioAnalysis.analyzeScenario(scenario);
  }

  getRecommendations(sensitivityLevel) {
    const actions = this.sensitivityCriteria?.sensitivity_levels?.[sensitivityLevel]?.actions ?? [];
    return actions.map(action => {
      switch (action) {
        case 'log':            return 'Enregistrer le contenu pour archivage.';
        case 'suggest_review': return 'Suggérer une révision humaine.';
        case 'auto_censor':    return 'Appliquer la censure automatique.';
        case 'alert_user':     return 'Alerter l\'utilisateur immédiatement.';
        default:               return `Action inconnue : ${action}`;
      }
    });
  }

  // ─── Censure automatique ──────────────────────────────────────────────────────

  /**
   * Applique la censure automatique au contenu selon le niveau de sensibilité.
   *
   * @param {{ text?, image?, clothing? }} content
   * @param {'low'|'medium'|'high'} sensitivityLevel
   * @param {object} [options]
   * @param {boolean}  [options.censorText=true]
   * @param {boolean}  [options.censorImage=true]
   * @param {boolean}  [options.censorClothing=true]
   * @param {string}   [options.imageOutputPath]
   * @returns {Promise<CensorshipResult>}
   */
  async applyCensorship(content, sensitivityLevel = 'medium', options = {}) {
    return censorshipMechanisms.applyCensorship(content, sensitivityLevel, options);
  }

  /**
   * Analyse puis censure automatiquement si le niveau le requiert.
   * Raccourci pratique : une seule méthode pour tout faire.
   *
   * @param {{ text?, image?, clothing?, dialogue?, scenario?, context? }} content
   * @param {object} [censorOptions]
   * @returns {Promise<{ analysis: AnalysisResult, censorship?: CensorshipResult }>}
   */
  async analyzeAndCensor(content, censorOptions = {}) {
    const analysis = await this.analyzeContent(content);

    const actions = this.sensitivityCriteria?.sensitivity_levels?.[analysis.level]?.actions ?? [];
    const shouldCensor = actions.includes('auto_censor');

    if (shouldCensor) {
      const censorship = await this.applyCensorship(content, analysis.level, censorOptions);
      return { analysis, censorship };
    }

    return { analysis, censorship: null };
  }

  // ─── Pixelisation directe (API bas niveau) ────────────────────────────────────

  /**
   * Pixelise directement une image sans passer par l'analyse.
   * @param {string|Buffer} imageInput  Chemin ou data-URL
   * @param {'low'|'medium'|'high'} level
   * @param {object} [options]          Options de pixelationEngine
   * @returns {Promise<string>} data-URL PNG
   */
  async pixelateImage(imageInput, level = 'medium', options = {}) {
    return pixelationEngine.pixelateToDataURL(imageInput, { level, ...options });
  }

  /**
   * Pixelise un fichier image et le sauvegarde (Node seulement).
   * @param {string} inputPath
   * @param {string} outputPath
   * @param {'low'|'medium'|'high'} level
   */
  async pixelateImageFile(inputPath, outputPath, level = 'medium') {
    return pixelationEngine.pixelateFile(inputPath, outputPath, { level });
  }

  // ─── Substitution narrative (point d'entrée dédié) ────────────────────────────

  /**
   * Applique directement les substitutions narratives à un texte.
   * Ne pixelise pas, ne censure pas brutalement — propose des alternatives créatives.
   *
   * @param {string} text
   * @param {object} [options]
   * @param {'low'|'medium'|'high'}                          [options.level='medium']
   * @param {'neutral'|'poetic'|'children'|'random'|'all'}  [options.mode='neutral']
   * @param {string[]}                                       [options.categories]
   * @returns {{ substituted: string, changes: Array<object>, unchanged: boolean }}
   */
  applyNarrativeSubstitutions(text, options = {}) {
    return narrativeSubstitution.applyNarrativeSubstitutions(text, options);
  }

  /**
   * Retourne toutes les alternatives narratives pour un terme.
   * Utile pour afficher un menu de choix à l'utilisateur.
   * @param {string} term
   */
  getAlternativesFor(term) {
    return narrativeSubstitution.getAlternativesFor(term);
  }

  /**
   * Retourne le dictionnaire complet des substitutions, groupé par catégorie.
   */
  getAllSubstitutions() {
    return narrativeSubstitution.getAllSubstitutions();
  }

  // ─── Substitutions cinématographiques ─────────────────────────────────────────

  /**
   * Retourne des alternatives de plans cinématographiques pour une scène sensible.
   *
   * @param {string}   sceneId            Ex: 'scene_erotic_explicit', 'scene_graphic_violence'
   * @param {object}   [options]
   * @param {string}   [options.locale]   Code pays ISO (ex: 'fr', 'us', 'jp', 'sa', 'kr', 'in')
   * @param {string[]} [options.audience] Publics cibles (ex: ['adult', 'universal'])
   * @param {string}   [options.tone]     Ton préféré (ex: 'romantique', 'poétique', 'comique')
   * @returns {object|null}
   */
  getCinematicAlternatives(sceneId, options = {}) {
    return cinematicSubstitution.getCinematicAlternatives(sceneId, options);
  }

  /**
   * Analyse la description d’une scène et propose automatiquement des alternatives
   * cinématographiques selon le contenu détecté.
   *
   * @param {string} sceneDescription   Description libre de la scène
   * @param {object} [options]          Mêmes options que getCinematicAlternatives
   * @returns {Array<object>}
   */
  suggestCinematicAlternatives(sceneDescription, options = {}) {
    return cinematicSubstitution.suggestAlternativesFromText(sceneDescription, options);
  }

  /**
   * Retourne les notes culturelles par locale pour une scène donnée.
   * @param {string} sceneId
   * @returns {object|null}
   */
  getCinematicLocaleNotes(sceneId) {
    return cinematicSubstitution.getLocaleNotes(sceneId);
  }
}

// ─── Export ───────────────────────────────────────────────────────────────────

module.exports = new ContentSensitivityAddon();