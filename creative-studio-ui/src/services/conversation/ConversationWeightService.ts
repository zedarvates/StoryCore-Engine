/**
 * ConversationWeightService
 *
 * Détecte les verbes et adjectifs sémantiquement importants dans un prompt
 * de conversation utilisateur, et leur attribue des poids 0-100.
 *
 * PÉRIMÈTRE : couche conversation utilisateur ↔ assistant UNIQUEMENT.
 * Ce service est DISTINCT du PromptOptimizationService (pipeline image/vidéo).
 *
 * Architecture :
 *  1. Tentative de détection via LLM léger (Ollama/OpenRouter)
 *  2. Fallback automatique offline via regex + listes de termes forts
 *  3. Construction du prompt final enrichi pour envoi au LLM assistant
 */

import { ollamaClient } from '@/services/llm/OllamaClient';
import { logger } from '@/utils/logger';
import type {
  WeightedTerm,
  EnrichedPrompt,
  DetectionResult,
  TermType,
} from '@/types/promptWeighting';

// ---------------------------------------------------------------------------
// Listes de termes forts (fallback offline — local-first garantie)
// ---------------------------------------------------------------------------

/** Verbes de contrainte forte FR → poids initial 92 */
const CONSTRAINT_VERBS_FR = [
  'éviter', 'proscrire', 'interdire', 'empêcher', 'exclure',
  'bannir', 'refuser', 'éliminer', 'supprimer', 'omettre',
  'jamais',
];

/** Verbes de priorité haute FR → poids initial 78 */
const PRIORITY_VERBS_FR = [
  'maintenir', 'insister', 'forcer', 'imposer', 'garantir',
  'assurer', 'préserver', 'conserver', 'respecter', 'souligner',
  'accentuer', 'renforcer', 'privilégier', 'prioriser',
];

/** Verbes de contrainte forte EN → poids initial 92 */
const CONSTRAINT_VERBS_EN = [
  'avoid', 'prevent', 'never', 'prohibit', 'exclude',
  'forbid', 'ban', 'reject', 'eliminate', 'omit',
];

/** Verbes de priorité haute EN → poids initial 78 */
const PRIORITY_VERBS_EN = [
  'ensure', 'maintain', 'enforce', 'always', 'require',
  'guarantee', 'preserve', 'keep', 'insist', 'emphasize',
  'highlight', 'prioritize', 'stress',
];

const VISUAL_ADJECTIVES = [
  'cinematic', 'photorealistic', 'hyper-detailed', 'smooth', 'stable', 'synchronized',
  'high-speed', 'slow-motion', 'distorted', 'abstract', 'neon', 'techno',
  'rouge', 'bleu', 'vert', 'jaune', 'orange', 'violet', 'rose', 'noir', 'blanc',
  'red', 'blue', 'green', 'yellow', 'purple', 'pink', 'dark', 'bright',
];

/** Templates de poids — Sprint 3 */
export const WEIGHT_TEMPLATES = {
  cinematic: {
    terms: ['cadrage', 'lumière', 'composition', 'caméra', 'shot', 'lighting'],
    weight: 95,
    description: 'Priorité absolue à la technique visuelle'
  },
  character: {
    terms: ['visage', 'expression', 'vêtements', 'personnalité', 'face', 'traits'],
    weight: 90,
    description: 'Focus sur la cohérence du personnage'
  },
  audio: {
    terms: ['tempo', 'rythme', 'instrument', 'ambiance', 'sound', 'music'],
    weight: 85,
    description: 'Precision sur la structure sonore'
  },
  video_ultra: {
    terms: ['hunyuan', '720p', '1080p', '4k', 'ultra', 'high-fidelity', 'stabilized'],
    weight: 98,
    description: 'Priorité maximale à la qualité visuelle vidéo'
  },
  video_fast: {
    terms: ['wan', 'lightning', 'fast', 'real-time', 'draft', 'quick'],
    weight: 90,
    description: 'Priorité à la vitesse de génération'
  }
};

/** Paires de termes contradictoires — Sprint 3 */
const SEMANTIC_CONFLICTS: Array<[string, string, string]> = [
  ['minimaliste', 'baroque', 'Style visuel contradictoire'],
  ['sombre', 'lumineux', 'Éclairage opposé'],
  ['flou', 'net', 'Netteté incompatible'],
  ['minimalist', 'baroque', 'Contradictory visual style'],
  ['dark', 'luminous', 'Opposing lighting'],
  ['blurry', 'sharp', 'Incompatible sharpness'],
];

// Prompt système pour la détection LLM
const DETECTION_SYSTEM_PROMPT = `Tu es un analyseur sémantique de prompts créatifs.
Analyse le prompt utilisateur et retourne UNIQUEMENT un tableau JSON.
Pour chaque verbe ou adjectif porteur de sens :
{
  "word": "éviter",
  "type": "verb",
  "weight": 95,
  "certainty": 90,
  "position": 12
}

Règles de pondération :
- Verbes d'interdiction (éviter, proscrire, jamais, avoid, never) → weight 92-100
- Verbes de priorité (maintenir, insister, garantir, ensure, always) → weight 75-88
- Verbes d'action neutres (ajouter, créer, faire, create) → weight 40-60
- Adjectifs de COULEUR (rouge, bleu, red, blue, etc.) → weight 70-85 (TRÈS IMPORTANT)
- Adjectifs visuels très spécifiques (rouillé, baroque, cristallin) → weight 70-85
- Adjectifs visuels précis (sombre, lumineux, ancien) → weight 55-70
- Adjectifs génériques (beau, grand, bon) → weight 20-45
- certainty : 100 si terme très spécifique, 50 si vague

Note : Si le prompt contient une couleur, identifie-la impérativement comme adjectif avec un poids élevé.
Retourne UNIQUEMENT le JSON array. Maximum 8 termes. Aucun texte autour.`;

// ---------------------------------------------------------------------------
// Service principal
// ---------------------------------------------------------------------------

export class ConversationWeightService {
  private readonly maxTerms = 6;

  // -------------------------------------------------------------------------
  // Détection principale (LLM + fallback)
  // -------------------------------------------------------------------------

  /**
   * Détecte les termes pondérés dans un prompt de conversation.
   * Tente d'abord le LLM local ; si indisponible, utilise le fallback offline.
   *
   * @param input - Texte brut saisi par l'utilisateur dans la chatbox
   */
  async detectWeightedTerms(input: string): Promise<DetectionResult> {
    if (!input || input.trim().length < 3) {
      return { terms: [], source: 'offline', durationMs: 0 };
    }

    const start = Date.now();

    // Tentative LLM
    try {
      const model = await ollamaClient.getBestAvailableModel('quick');
      const prompt = `${DETECTION_SYSTEM_PROMPT}\n\n[PROMPT UTILISATEUR]\n"${input}"\n\nJSON:`;

      const raw = await ollamaClient.generate(model, prompt, {
        temperature: 0.1,
        maxTokens: 400,
        keep_alive: 0, // NEW: Unload model immediately after detection (stable memory)
      });

      const terms = this.parseDetectionResponse(raw, input);
      if (terms.length > 0) {
        return {
          terms: terms.slice(0, this.maxTerms),
          source: 'llm',
          durationMs: Date.now() - start,
        };
      }
    } catch (error) {
      if (error instanceof Error && (error.message.includes('Memory') || error.message.includes('capacity') || error.message.includes('500'))) {
        logger.error('[ConversationWeight] 💨 LLM Out-of-Memory during detection. Forcing offline fallback.');
      } else {
        logger.warn('[ConversationWeight] LLM detection unavailable, using offline fallback:', error);
      }
    }

    // Fallback offline garanti
    const terms = this.detectWeightedTermsOffline(input);
    return {
      terms,
      source: 'offline',
      durationMs: Date.now() - start,
    };
  }

  // -------------------------------------------------------------------------
  // Fallback offline (regex + listes)
  // -------------------------------------------------------------------------

  /**
   * Détection sans LLM — regex sur listes de termes connus.
   * Garantit le mode local-first même si Ollama est indisponible.
   */
  detectWeightedTermsOffline(input: string): WeightedTerm[] {
    const lower = input.toLowerCase();
    const detected: WeightedTerm[] = [];

    const addIfFound = (
      terms: string[],
      type: TermType,
      weight: number,
      certainty: number
    ) => {
      for (const term of terms) {
        const idx = lower.indexOf(term);
        if (idx !== -1 && !detected.find(d => d.word === term)) {
          detected.push({ word: term, type, weight, certainty, position: idx });
        }
      }
    };

    addIfFound(CONSTRAINT_VERBS_FR, 'constraint', 92, 90);
    addIfFound(CONSTRAINT_VERBS_EN, 'constraint', 92, 90);
    addIfFound(PRIORITY_VERBS_FR, 'verb', 78, 80);
    addIfFound(PRIORITY_VERBS_EN, 'verb', 78, 80);
    addIfFound(VISUAL_ADJECTIVES, 'adjective', 72, 75);

    return detected
      .sort((a, b) => b.weight - a.weight)
      .slice(0, this.maxTerms);
  }

  /**
   * Détecte les tensions sémantiques entre les termes pondérés (Sprint 3).
   */
  detectConflicts(terms: WeightedTerm[]): import('@/types/promptWeighting').TermConflict[] {
    const conflicts: import('@/types/promptWeighting').TermConflict[] = [];
    const words = terms.map(t => t.word.toLowerCase());

    for (const [t1, t2, desc] of SEMANTIC_CONFLICTS) {
      if (words.includes(t1) && words.includes(t2)) {
        conflicts.push({
          terms: [t1, t2],
          severity: 'high',
          description: desc
        });
      }
    }
    return conflicts;
  }

  // -------------------------------------------------------------------------
  // Construction du prompt enrichi final
  // -------------------------------------------------------------------------

  /**
   * Construit le prompt final à envoyer au modèle assistant.
   */
  buildWeightedConversationPrompt(pep: EnrichedPrompt): string {
    const { rawText, weightedTerms, outputDetail, globalTone, conflicts } = pep;

    if (weightedTerms.length === 0 && globalTone === 50) return rawText;

    const parts: string[] = [];

    // Tonalité globale (0-100)
    if (globalTone !== 50) {
      const toneDesc = globalTone > 75 ? 'TRÈS narrative, émotionnelle et descriptive' 
                    : globalTone > 60 ? 'narrative et créative'
                    : globalTone < 25 ? 'ULTRA-CONCISE, factuelle et technique'
                    : 'directe et sans fioritures';
      parts.push(`[STYLE DE RÉPONSE ATTENDU : ${toneDesc}]`);
    }

    // Avertissement de conflit
    if (conflicts.length > 0) {
      const conflictMsg = conflicts.map(c => `- ATTENTION CONFLIT : "${c.terms[0]}" vs "${c.terms[1]}" (${c.description})`).join('\n');
      parts.push(`[NOTES DE TENSION SÉMANTIQUE — l'utilisateur a pondéré des éléments opposés :]\n${conflictMsg}\n-> Arbitre intelligemment selon la cohérence globale.`);
    }

    // Contraintes dures → bloc séparé
    const hardConstraints = weightedTerms
      .filter(t => t.weight >= 90)
      .map(t => `- RESPECTER ABSOLUMENT : "${t.word}" — priorité ${t.weight}/100`)
      .join('\n');

    const importantTerms = weightedTerms
      .filter(t => t.weight >= 70 && t.weight < 90)
      .map(t => `"${t.word}" (poids ${t.weight}/100)`)
      .join(', ');

    if (hardConstraints) {
      parts.push(`[CONTRAINTES PRIORITAIRES]\n${hardConstraints}`);
    }

    if (importantTerms) {
      parts.push(`[ACCENTS SÉMANTIQUES : ${importantTerms}]`);
    }

    // Teintes de couleur spécifiques (ColorStudio Unity-style)
    const colorNotes = weightedTerms
      .filter(t => t.colorData)
      .map(t => {
        const d = t.colorData!;
        const c1 = `HSL(${d.h}, ${d.s}%, ${d.l}%)`;
        if (d.isRange) {
          const c2 = `HSL(${d.h2}, ${d.s2}%, ${d.l2}%)`;
          return `- PLAGE CHROMATIQUE pour "${t.word}" : de ${c1} à ${c2} (dégradé visuel exigé)`;
        }
        return `- COULEUR PRÉCISE pour "${t.word}" : ${c1}`;
      })
      .join('\n');
    
    if (colorNotes) {
      parts.push(`[SÉLECTION DE COULEUR TECHNIQUE PRO]\n${colorNotes}`);
    }

    // Niveau de détail
    const detailInstruction = outputDetail >= 80 ? 'Instruction : Soyez exhaustif.' 
                           : outputDetail <= 30 ? 'Instruction : Soyez minimaliste.' 
                           : '';
    
    parts.push(rawText);
    if (detailInstruction) parts.push(detailInstruction);

    return parts.join('\n\n');
  }

  /**
   * Sérialise un EnrichedPrompt en YAML lisible (pour debug / export optionnel).
   */
  toYAML(pep: EnrichedPrompt): string {
    const lines: string[] = [
      `task: "${pep.rawText.replace(/"/g, '\\"')}"`,
      `weighted_terms:`,
    ];

    if (pep.weightedTerms.length === 0) {
      lines.push('  []');
    } else {
      for (const t of pep.weightedTerms) {
        lines.push(`  - word: "${t.word}"`);
        lines.push(`    type: "${t.type}"`);
        lines.push(`    weight: ${t.weight}`);
        lines.push(`    certainty: ${t.certainty}`);
        lines.push(`    position: ${t.position}`);
      }
    }

    lines.push(`output_style:`);
    lines.push(`  level_of_detail: ${pep.outputDetail}`);
    lines.push(`  global_tone: ${pep.globalTone}`);
    if (pep.templateId) {
      lines.push(`  template: "${pep.templateId}"`);
    }

    return lines.join('\n');
  }

  // -------------------------------------------------------------------------
  // Utilitaires privés
  // -------------------------------------------------------------------------

  /**
   * Parse la réponse brute du LLM et extrait les WeightedTerm[].
   * Robuste aux réponses partielles ou mal formées.
   */
  private parseDetectionResponse(raw: string, originalInput: string): WeightedTerm[] {
    try {
      // Extraire le JSON array de la réponse (même si entouré de texte)
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) return [];

      const parsed = JSON.parse(match[0]);
      if (!Array.isArray(parsed)) return [];

      const lower = originalInput.toLowerCase();

      return parsed
        .filter((item): item is WeightedTerm =>
          typeof item.word === 'string' &&
          typeof item.weight === 'number' &&
          item.weight >= 0 && item.weight <= 100
        )
        .map(item => ({
          word: item.word,
          type: (['verb', 'adjective', 'constraint', 'noun'].includes(item.type)
            ? item.type
            : 'verb') as TermType,
          weight: Math.round(Math.max(0, Math.min(100, item.weight))),
          certainty: Math.round(Math.max(0, Math.min(100, item.certainty ?? 70))),
          // Recalcule la position si absente ou incorrecte
          position: typeof item.position === 'number'
            ? item.position
            : lower.indexOf(item.word.toLowerCase()),
        }));
    } catch {
      logger.warn('[ConversationWeight] Failed to parse LLM detection response');
      return [];
    }
  }
}

// Singleton exporté
export const conversationWeightService = new ConversationWeightService();
