/**
 * Clothing Analysis — Content Sensitivity Addon
 * Analyse les vêtements et propose des alternatives culturellement adaptées.
 */

'use strict';

// cultural_context.json est optionnel
let culturalContext = {};
try {
  culturalContext = require('../config/cultural_context.json');
} catch {
  // Pas de contexte culturel chargé — comportement dégradé gracieusement
}

/** Alternatives vestimentaires de base selon le niveau de sensibilité. */
const CLOTHING_ALTERNATIVES = {
  low: [
    { type: 'suggestion', description: 'Envisager un style plus sobre.' },
  ],
  medium: [
    { type: 'change',     description: 'Remplacer par une tenue moins révélatrice.' },
    { type: 'suggestion', description: 'Adapter au contexte culturel local.' },
  ],
  high: [
    { type: 'change',     description: 'Tenue non appropriée — remplacer entièrement.' },
    { type: 'cover',      description: 'Ajouter des couches supplémentaires.' },
    { type: 'neutral',    description: 'Opter pour un uniforme ou tenue neutre.' },
  ],
};

module.exports = {
  /**
   * Analyse une tenue vestimentaire par rapport au contexte culturel.
   * @param {object} clothing  Données de la tenue
   * @param {object} [context] Contexte culturel (origine, etc.)
   * @returns {Promise<{ score: number, flaggedItems: string[], recommendations: string[] }>}
   */
  analyzeClothing: async (clothing, context = {}) => {
    if (!clothing) {
      return { score: 0, flaggedItems: [], recommendations: [] };
    }

    const flaggedItems     = [];
    let   score            = 0;

    // Vérification basique de la significativité culturelle
    if (clothing.exposed && clothing.exposed === true) {
      flaggedItems.push('tenue révélatrice');
      score += 30;
    }
    if (clothing.culturalSignificance && context.origin
        && clothing.origin !== context.origin) {
      flaggedItems.push(`appropriation culturelle (${clothing.origin} → ${context.origin})`);
      score += 20;
    }
    if (clothing.religious) {
      flaggedItems.push('vêtement religieux');
      score += 10;
    }

    return {
      score:           Math.min(100, score),
      flaggedItems,
      recommendations: flaggedItems.length > 0
        ? [`Revoir : ${flaggedItems.join(', ')}`]
        : ['Tenue appropriée.'],
    };
  },

  /**
   * Valide un vêtement par rapport aux normes culturelles.
   * @param {object} clothingItem
   * @param {object} context
   * @returns {{ appropriate: boolean, score: number, issues: string[] }}
   */
  validateCulturalContext: (clothingItem, context = {}) => {
    if (!clothingItem) return { appropriate: true, score: 0, issues: [] };

    const issues = [];
    if (clothingItem.culturalSignificance && clothingItem.origin !== context.origin) {
      issues.push('Vêtement culturellement significatif hors contexte d\'origine.');
    }

    return {
      appropriate: issues.length === 0,
      score:       issues.length * 15,
      issues,
    };
  },

  /**
   * Propose des alternatives vestimentaires.
   * @param {object} clothingItem
   * @param {'low'|'medium'|'high'} sensitivityLevel
   * @returns {Array<{ type: string, description: string }>}
   */
  suggestAlternatives: (clothingItem, sensitivityLevel = 'medium') => {
    return CLOTHING_ALTERNATIVES[sensitivityLevel] ?? CLOTHING_ALTERNATIVES.medium;
  },
};