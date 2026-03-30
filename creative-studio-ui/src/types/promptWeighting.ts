/**
 * Prompt Weighting Types
 *
 * Defines the data structures for the Weighted Prompt Composer system.
 * This system operates exclusively on the user ↔ assistant conversation layer.
 *
 * SCOPE: Conversation enrichment only.
 * NOT for: PromptOptimizationService (image/video pipeline — kept separate).
 */

// ---------------------------------------------------------------------------
// Core term types
// ---------------------------------------------------------------------------

/** Grammatical and semantic role of a detected term */
export type TermType = 'verb' | 'adjective' | 'constraint' | 'noun';

/**
 * A single term detected in the user's prompt, with semantic weight metadata.
 * Terms are detected by ConversationWeightService (LLM or offline fallback).
 */
export interface WeightedTerm {
  /** The exact word as it appears in the prompt */
  word: string;
  /** Grammatical/semantic role */
  type: TermType;
  /**
   * Importance weight 0–100.
   * 90–100 = hard constraint (e.g. "éviter", "never")
   * 70–89  = high priority (e.g. "maintenir", "insister")
   * 50–69  = standard intent (e.g. "ajouter", "créer")
   * 20–49  = suggestion (optional modifier)
   * 0–19   = negligible / noise
   */
  weight: number;
  /**
   * Certainty 0–100: how confident the system is that this term must be
   * preserved as-is. Specific terms → high certainty. Vague → low.
   */
  certainty: number;
  /** Character index of the term's start position in rawText */
  position: number;
  /** Rich color data (Unity-style) for color adjectives */
  colorData?: {
    h: number; // 0-360
    s: number; // 0-100
    l: number; // 0-100
    // Optional second point for range/gradient [Unity style]
    h2?: number; 
    s2?: number;
    l2?: number;
    isRange?: boolean;
  };
}

// ---------------------------------------------------------------------------
// Weight level classification
// ---------------------------------------------------------------------------

/** Human-readable classification derived from a numeric weight */
export type WeightLevel = 'critical' | 'high' | 'medium' | 'low' | 'negligible';

/**
 * Maps a numeric weight (0–100) to a semantic WeightLevel.
 *
 * @example
 * getWeightLevel(95) // 'critical'
 * getWeightLevel(72) // 'high'
 * getWeightLevel(30) // 'low'
 */
export function getWeightLevel(weight: number): WeightLevel {
  if (weight >= 90) return 'critical';
  if (weight >= 70) return 'high';
  if (weight >= 50) return 'medium';
  if (weight >= 20) return 'low';
  return 'negligible';
}

/**
 * CSS class name for each WeightLevel.
 * Maps to color gradient classes defined in prompt-composer.css.
 *
 * critical  → rouge foncé  (#ef4444 → #991b1b)
 * high      → orange       (#f97316 → #c2410c)
 * medium    → jaune        (#eab308 → #a16207)
 * low       → gris-bleu    (#6b7280 → #374151)
 * negligible→ transparent
 */
export function getWeightClass(weight: number): string {
  return `chip-${getWeightLevel(weight)}`;
}

// ---------------------------------------------------------------------------
// Enriched Prompt (PEP — Prompt Enrichi Pondéré)
// ---------------------------------------------------------------------------

/** Conflict between two weighted terms (e.g. minimalist vs baroque) */
export interface TermConflict {
  terms: [string, string];
  severity: 'high' | 'medium';
  description: string;
}

/**
 * The full Enriched Prompt structure produced after analysis.
 */
export interface EnrichedPrompt {
  /** Original, unmodified user text */
  rawText: string;
  /** All weighted terms detected in rawText */
  weightedTerms: WeightedTerm[];
  /** 0 = cold/concise, 100 = hot/narrative/emotional */
  globalTone: number;
  /** Desired level of detail (0-100) */
  outputDetail: number;
  /** Inferred or selected task template */
  templateId?: 'cinematic' | 'character' | 'world' | 'audio' | 'general' | 'video_ultra' | 'video_fast';
  /** Detected contradictions in weights/terms */
  conflicts: TermConflict[];
}

// ---------------------------------------------------------------------------
// Post-Response Analysis (Compliance & Autopsy)
// ---------------------------------------------------------------------------

/** Score of how well the assistant followed a specific weighted term */
export interface TermCompliance {
  word: string;
  targetWeight: number;
  actualImpact: number; // 0-100 detected in response
  status: 'respected' | 'diluted' | 'ignored';
  reason?: string; // "Autopsy" explanation
}

export interface ComplianceScore {
  globalScore: number; // 0-100 weighted average
  termResults: TermCompliance[];
  suggestions: string[]; // How to improve for next time
}

// ---------------------------------------------------------------------------
// Detection source
// ---------------------------------------------------------------------------

/** Whether terms were detected via LLM call or the offline regex fallback */
export type DetectionSource = 'llm' | 'offline';

/** Result of a term detection pass */
export interface DetectionResult {
  terms: WeightedTerm[];
  source: DetectionSource;
  /** Duration in ms (for performance monitoring) */
  durationMs: number;
}
