/**
 * useWizardVoiceAssistant
 * ========================
 * Hook React pour les commandes vocales/textuelles contextuelles dans les wizards.
 *
 * S'intègre avec :
 *   - WizardContext (updateFormData)
 *   - WizardFieldIntelligence (parsing sémantique)
 *   - useLLMGeneration (génération IA des sections)
 *
 * Usage dans un step de wizard :
 *
 *   // Dans CharacterWizard.tsx ou step individuel :
 *   const assistant = useWizardVoiceAssistant({
 *     entityType: 'character',
 *     onPatchApplied: (patch) => console.log('Appliqué :', patch),
 *     onTabChange: (tabId) => setActiveStep(tabId),
 *   });
 *
 *   // Depuis un transcript vocal ou texte saisi :
 *   assistant.handleCommand("Mets les yeux en vert");
 *   assistant.handleCommand("Remplis les champs manquants");
 *   assistant.handleCommand("Génère un physique cohérent");
 */

import { useState, useCallback, useRef } from 'react';
import {
  WizardFieldIntelligence,
  WizardCommandIntent,
  WizardEntityType,
  FieldPatch,
} from '@/services/WizardFieldIntelligence';
import { useVoiceInput } from './useAddonVoiceCommands';

// ============================================================================
// TYPES
// ============================================================================

export interface WizardVoiceAssistantOptions {
  /** Type d'entité éditée dans ce wizard */
  entityType: WizardEntityType;

  /** Fonction pour mettre à jour le formData du wizard */
  onFieldChange: (section: string | null, field: string, value: unknown) => void;

  /** Callback quand une navigation d'onglet est demandée */
  onTabChange?: (tabId: string) => void;

  /** Callback quand une génération IA est demandée */
  onGenerateSection?: (sectionName: string, prompt: string) => void;

  /** Callback quand l'utilisateur demande de remplir les champs vides */
  onFillMissing?: () => void;

  /** Callback quand un patch est appliqué (pour feedback) */
  onPatchApplied?: (patch: FieldPatch) => void;

  /** Callback erreur */
  onError?: (message: string) => void;
}

export interface WizardCommandFeedback {
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
  patches?: FieldPatch[];
  timestamp: number;
}

export interface UseWizardVoiceAssistantReturn {
  /** Traite une commande (texte ou vocal) */
  handleCommand: (transcript: string, confidence?: number) => WizardCommandIntent;

  /** Feedback de la dernière commande */
  lastFeedback: WizardCommandFeedback | null;

  /** Historique des commandes appliquées */
  commandHistory: WizardCommandFeedback[];

  /** Écoute vocale */
  isListening: boolean;
  isVoiceSupported: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;

  /** Suggestions contextuelles */
  suggestions: string[];

  /** Reset le feedback */
  clearFeedback: () => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useWizardVoiceAssistant(
  options: WizardVoiceAssistantOptions,
): UseWizardVoiceAssistantReturn {
  const {
    entityType,
    onFieldChange,
    onTabChange,
    onGenerateSection,
    onFillMissing,
    onPatchApplied,
    onError,
  } = options;

  const [lastFeedback, setLastFeedback] = useState<WizardCommandFeedback | null>(null);
  const [commandHistory, setCommandHistory] = useState<WizardCommandFeedback[]>([]);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Traitement d'une commande ─────────────────────────────────────────────

  const handleCommand = useCallback(
    (transcript: string, _confidence = 1.0): WizardCommandIntent => {
      if (!transcript.trim()) {
        return { action: 'unknown', entityType, patches: [], confidence: 0, rawTranscript: '' };
      }

      const intent = WizardFieldIntelligence.parseCommand(transcript, entityType);

      let feedback: WizardCommandFeedback;

      switch (intent.action) {

        // ── Patch de champs ──────────────────────────────────────────────
        case 'set_field': {
          if (intent.patches.length === 0) {
            feedback = { type: 'warning', message: `Champ non reconnu : "${transcript}"`, timestamp: Date.now() };
            break;
          }

          const applied: FieldPatch[] = [];
          const skipped: string[] = [];

          for (const patch of intent.patches) {
            if (patch.confidence >= 0.5) {
              onFieldChange(patch.section, patch.field, patch.value);
              onPatchApplied?.(patch);
              applied.push(patch);
            } else {
              skipped.push(patch.explanation);
            }
          }

          if (applied.length > 0) {
            const lines = applied.map(p => `✓ ${p.explanation}`).join('\n');
            feedback = {
              type: 'success',
              message: applied.length === 1
                ? `✅ ${applied[0].explanation}`
                : `✅ ${applied.length} champs mis à jour :\n${lines}`,
              patches: applied,
              timestamp: Date.now(),
            };
          } else {
            feedback = {
              type: 'warning',
              message: `Confiance insuffisante pour appliquer : ${skipped.join(', ')}`,
              timestamp: Date.now(),
            };
          }
          break;
        }

        // ── Génération IA ────────────────────────────────────────────────
        case 'generate_section': {
          const section = intent.sectionToGenerate ?? 'current';
          const prompt = intent.generationPrompt ?? 'Génère une suggestion cohérente.';
          onGenerateSection?.(section, prompt);
          feedback = {
            type: 'info',
            message: `🤖 Génération IA demandée pour : ${section}`,
            timestamp: Date.now(),
          };
          break;
        }

        // ── Remplir les champs vides ─────────────────────────────────────
        case 'fill_missing': {
          onFillMissing?.();
          feedback = {
            type: 'info',
            message: `✨ Remplissage intelligent des champs vides…`,
            timestamp: Date.now(),
          };
          break;
        }

        // ── Navigation onglet ────────────────────────────────────────────
        case 'navigate_tab': {
          if (intent.targetTab) {
            onTabChange?.(intent.targetTab);
            feedback = {
              type: 'success',
              message: `📑 Navigation vers : ${intent.targetTab}`,
              timestamp: Date.now(),
            };
          } else {
            feedback = { type: 'warning', message: 'Onglet non trouvé', timestamp: Date.now() };
          }
          break;
        }

        // ── Inconnu ──────────────────────────────────────────────────────
        default: {
          const suggestions = WizardFieldIntelligence.getSuggestionsFor(entityType);
          feedback = {
            type: 'warning',
            message: `❓ Commande non reconnue : "${transcript}"\nExemples : ${suggestions.slice(0, 3).join(' • ')}`,
            timestamp: Date.now(),
          };
          onError?.(`Commande non reconnue : "${transcript}"`);
          break;
        }
      }

      setLastFeedback(feedback);
      setCommandHistory(prev => [feedback, ...prev].slice(0, 20));

      // Auto-clear feedback après 4s
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = setTimeout(() => setLastFeedback(null), 4000);

      return intent;
    },
    [entityType, onFieldChange, onTabChange, onGenerateSection, onFillMissing, onPatchApplied, onError],
  );

  // ── Écoute vocale ─────────────────────────────────────────────────────────

  const { isListening, isSupported, transcript, startListening, stopListening, toggleListening } = useVoiceInput({
    onCommand: (result) => {
      if (result.handled) return; // déjà géré par l'addon router
    },
    onTranscriptChange: (t) => {
      if (t && t.length > 3) {
        // Traitement interactif pendant la dictée (transcript intermédiaire)
        // On attend le final pour appliquer
      }
    },
  });

  // Intercepter le transcript final pour l'envoyer au wizard
  // (Le useVoiceInput appelle onCommand avec le résultat routé,
  //  mais on veut aussi traiter localement pour le wizard)
  // On se branche sur les events de reconnaissance vocale

  // ── Suggestions ───────────────────────────────────────────────────────────

  const suggestions = WizardFieldIntelligence.getSuggestionsFor(entityType);

  const clearFeedback = useCallback(() => setLastFeedback(null), []);

  return {
    handleCommand,
    lastFeedback,
    commandHistory,
    isListening,
    isVoiceSupported: isSupported,
    transcript,
    startListening,
    stopListening,
    toggleListening,
    suggestions,
    clearFeedback,
  };
}
