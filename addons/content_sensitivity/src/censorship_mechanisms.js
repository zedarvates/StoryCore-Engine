/**
 * Censorship Mechanisms — Content Sensitivity Addon
 *
 * Applique les mécanismes de censure au contenu en fonction du niveau de sensibilité :
 *   - Texte  : substitution narrative créative (pistolet → talky-walky, etc.)
 *             puis censure brute en fallback si substitution impossible
 *   - Images : pixelisation des zones compromettantes (via PixelationEngine)
 *   - Vêtements : propositions d'alternatives vestimentaires
 */

'use strict';

const pixelationEngine        = require('./pixelation_engine');
const clothingAnalysis         = require('./clothing_analysis');
const narrativeSubstitution    = require('./narrative_substitution');

// ─── Dictionnaire de censure textuelle ────────────────────────────────────────

/** Termes considérés sensibles par niveau. */
const SENSITIVE_TERMS = {
  low: [
    /\b(religion|foi|croyance|faith|belief)\b/gi,
  ],
  medium: [
    /\b(religion|foi|croyance|faith|belief)\b/gi,
    /\b(raciste?|xénophob\w+|racist|xenophobic)\b/gi,
    /\b(sexe|nude|naked|desnudo)\b/gi,
  ],
  high: [
    /\b(religion|foi|croyance|faith|belief)\b/gi,
    /\b(raciste?|xénophob\w+|racist|xenophobic)\b/gi,
    /\b(sexe|nude|naked|desnudo)\b/gi,
    /\b(violence|meurtre?|murder|kill|blood)\b/gi,
    /\b(drogues?|drugs?|cocaine|heroin\w*)\b/gi,
  ],
};

/**
 * Censure un texte avec deux couches :
 * 1. Substitution narrative créative (pistolet → talky-walky, poudre → fleurs de coquelicot…)
 * 2. Remplacement brut par [CENSURÉ] pour les termes non couverts par la substitution narrative
 *
 * @param {string} text
 * @param {'low'|'medium'|'high'} level
 * @param {object} [options]
 * @param {'neutral'|'poetic'|'children'|'random'|'all'} [options.substitutionMode='neutral']
 * @param {boolean} [options.narrativeOnly=false]  Si true, pas de fallback [CENSURÉ]
 * @returns {{
 *   censored: string,
 *   replacedCount: number,
 *   terms: string[],
 *   narrativeChanges: Array<object>,
 *   method: 'narrative'|'raw'|'mixed'
 * }}
 */
function censorText(text, level = 'medium', options = {}) {
  if (!text || typeof text !== 'string') {
    return { censored: text || '', replacedCount: 0, terms: [], narrativeChanges: [], method: 'none' };
  }

  const { substitutionMode = 'neutral', narrativeOnly = false } = options;

  // ── Étape 1 : substitution narrative ─────────────────────────────────────
  const narrativeResult = narrativeSubstitution.applyNarrativeSubstitutions(text, {
    level,
    mode: substitutionMode,
  });

  let censored     = narrativeResult.substituted;
  const foundTerms = narrativeResult.changes.map(c => c.original);
  let method       = narrativeResult.unchanged ? 'none' : 'narrative';

  // ── Étape 2 : censure brute sur les termes restants (si narrativeOnly = false) ──
  if (!narrativeOnly) {
    const patterns = SENSITIVE_TERMS[level] ?? SENSITIVE_TERMS.medium;
    const rawTerms = [];

    for (const pattern of patterns) {
      censored = censored.replace(pattern, (match) => {
        rawTerms.push(match);
        return '[CENSURÉ]';
      });
    }

    if (rawTerms.length > 0) {
      foundTerms.push(...rawTerms);
      method = narrativeResult.unchanged ? 'raw' : 'mixed';
    }
  }

  return {
    censored,
    replacedCount:    foundTerms.length,
    terms:            [...new Set(foundTerms)],
    narrativeChanges: narrativeResult.changes,
    method,
  };
}

// ─── Pixelisation d'image ─────────────────────────────────────────────────────

/**
 * Options de pixelisation selon le niveau de sensibilité.
 * Plus le niveau est élevé, plus les blocs sont grands.
 */
const PIXELATION_OPTIONS = {
  low: {
    level:    'low',    // blockSize = 8px
    zone:     'body',   // zone corps uniquement
  },
  medium: {
    level:    'medium', // blockSize = 16px
    zone:     'body',
  },
  high: {
    level:    'high',   // blockSize = 32px
    zone:     'full',   // image entière
  },
};

/**
 * Pixelise une image selon le niveau de sensibilité.
 *
 * @param {string|Buffer} imageInput  Chemin fichier (Node) ou data-URL (Browser)
 * @param {'low'|'medium'|'high'} level
 * @param {string} [outputPath]       Chemin de sortie (Node uniquement)
 * @returns {Promise<{ dataUrl: string, success: boolean, error?: string }>}
 */
async function censorImage(imageInput, level = 'medium', outputPath = null) {
  try {
    if (!imageInput) {
      return { dataUrl: null, success: false, error: 'Aucune image fournie.' };
    }

    const opts = {
      ...(PIXELATION_OPTIONS[level] ?? PIXELATION_OPTIONS.medium),
      ...(outputPath ? { outputPath } : {}),
    };

    const dataUrl = await pixelationEngine.pixelateToDataURL(imageInput, opts);

    return {
      dataUrl,
      success: true,
      level,
      zone: opts.zone,
    };
  } catch (err) {
    console.error('[CensorshipMechanisms] Erreur pixelisation :', err);
    return {
      dataUrl: imageInput, // Retourner l'original en cas d'erreur
      success: false,
      error:   err.message,
    };
  }
}

/**
 * Pixelise une image sur disque et sauvegarde le résultat (Node seulement).
 * @param {string} inputPath
 * @param {string} outputPath
 * @param {'low'|'medium'|'high'} level
 * @returns {Promise<{ success: boolean, outputPath?: string, error?: string }>}
 */
async function censorImageFile(inputPath, outputPath, level = 'medium') {
  try {
    const opts = {
      ...(PIXELATION_OPTIONS[level] ?? PIXELATION_OPTIONS.medium),
      outputPath,
    };
    await pixelationEngine.pixelateFile(inputPath, outputPath, opts);
    return { success: true, outputPath };
  } catch (err) {
    console.error('[CensorshipMechanisms] Erreur pixelisation fichier :', err);
    return { success: false, error: err.message };
  }
}

// ─── Censure de vêtements ─────────────────────────────────────────────────────

/**
 * Suggère des alternatives vestimentaires pour les tenues inappropriées.
 * @param {object} clothing       Données vestimentaires
 * @param {'low'|'medium'|'high'} level
 * @returns {Array<{original: string, alternative: string, reason: string}>}
 */
function censorClothing(clothing, level = 'medium') {
  try {
    if (!clothing) return [];
    return clothingAnalysis.suggestAlternatives(clothing, level);
  } catch (err) {
    console.error('[CensorshipMechanisms] Erreur analyse vêtements :', err);
    return [];
  }
}

// ─── Censure globale (point d'entrée principal) ────────────────────────────────

/**
 * Applique l'ensemble des mécanismes de censure au contenu.
 *
 * @param {object} content
 * @param {string}        [content.text]     Texte à censurer
 * @param {string|Buffer} [content.image]    Image à pixeliser (chemin ou data-URL)
 * @param {object}        [content.clothing] Données vestimentaires
 * @param {'low'|'medium'|'high'} sensitivityLevel
 * @param {object} [options]
 * @param {boolean} [options.censorText=true]
 * @param {boolean} [options.censorImage=true]
 * @param {boolean} [options.censorClothing=true]
 * @param {string}  [options.imageOutputPath]   Sauvegarde l'image sur disque si fourni
 * @returns {Promise<{
 *   censoredContent: { text?: string, image?: string, clothing?: object },
 *   modifications: Array<object>,
 *   success: boolean
 * }>}
 */
async function applyCensorship(content, sensitivityLevel = 'medium', options = {}) {
  const {
    censorText:     doText     = true,
    censorImage:    doImage    = true,
    censorClothing: doClothing = true,
    imageOutputPath             = null,
  } = options;

  const modifications  = [];
  const censoredContent = {};

  // 1. Censure du texte
  if (doText && content.text) {
    const textResult = censorText(content.text, sensitivityLevel);
    censoredContent.text = textResult.censored;

    if (textResult.replacedCount > 0) {
      modifications.push({
        type:         'text_replacement',
        original:     content.text,
        censored:     textResult.censored,
        replacedCount: textResult.replacedCount,
        terms:        textResult.terms,
      });
    } else {
      censoredContent.text = content.text;
    }
  } else {
    censoredContent.text = content.text ?? null;
  }

  // 2. Pixelisation de l'image
  if (doImage && content.image) {
    const imageResult = await censorImage(content.image, sensitivityLevel, imageOutputPath);
    censoredContent.image = imageResult.dataUrl;

    modifications.push({
      type:     'image_pixelation',
      original: typeof content.image === 'string' && content.image.length < 200
        ? content.image
        : '[buffer ou data-URL]',
      level:    sensitivityLevel,
      zone:     imageResult.zone,
      success:  imageResult.success,
      ...(imageResult.error ? { error: imageResult.error } : {}),
    });
  } else {
    censoredContent.image = content.image ?? null;
  }

  // 3. Alternatives vestimentaires
  if (doClothing && content.clothing) {
    const clothingAlternatives = censorClothing(content.clothing, sensitivityLevel);
    censoredContent.clothing = {
      original:     content.clothing,
      alternatives: clothingAlternatives,
    };

    if (clothingAlternatives.length > 0) {
      modifications.push({
        type:         'clothing_change',
        original:     content.clothing,
        alternatives: clothingAlternatives,
      });
    }
  } else {
    censoredContent.clothing = content.clothing ?? null;
  }

  return {
    censoredContent,
    modifications,
    success:          true,
    sensitivityLevel,
  };
}

// ─── Export ───────────────────────────────────────────────────────────────────

module.exports = {
  applyCensorship,
  censorText,
  censorImage,
  censorImageFile,
  censorClothing,
  PIXELATION_OPTIONS,
  SENSITIVE_TERMS,
  // Accès direct aux substitutions narratives
  narrativeSubstitution,
};