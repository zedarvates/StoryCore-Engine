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
import { useAppStore } from '@/stores/useAppStore';


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

  /** Callback pour générer une image */
  onGenerateImage?: () => void;
  
  /** Callback pour générer un objet 3D */
  onGenerate3D?: () => void;

  /** Callback pour générer un script/texte complexe */
  onGenerateScript?: (target: string) => void;

  /** Callback pour upscaler un média */
  onUpscale?: (resolution: string) => void;

  /** Callback pour changer le format/résolution */
  onSetResolution?: (ratio: string) => void;

  /** Callback quand on quitte le wizard */
  onDashboard?: () => void;

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

  /** Statut d'écoute */
  isListening: boolean;
  /** Supporte le vocal */
  isVoiceSupported: boolean;
  /** Transcript en cours */
  transcript: string;
  /** Activer le micro */
  startListening: () => void;
  /** Désactiver le micro */
  stopListening: () => void;
  /** Toogle micro */
  toggleListening: () => void;

  /** Suggestions contextuelles */
  suggestions: string[];

  /** Trigger manuel du retour dashboard */
  onDashboard: () => void;

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
    onGenerateImage,
    onGenerate3D,
    onGenerateScript,
    onUpscale,
    onSetResolution,
    onDashboard,
    onError,
  } = options;

  const [lastFeedback, setLastFeedback] = useState<WizardCommandFeedback | null>(null);
  const wizardCommandHistory = useAppStore(state => state.wizardCommandHistory);
  const addWizardHistory = useAppStore(state => state.addWizardHistory);
  
  // Local history for this specific session if needed, but we'll use the store for persistence
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

        // ── Navigation dashboard ─────────────────────────────────────────
        case 'navigate_dashboard': {
          onDashboard?.();
          feedback = {
            type: 'success',
            message: `🏡 Retour au dashboard...`,
            timestamp: Date.now(),
          };
          break;
        }

        // ── Générations spécialisées ──────────────────────────────────────
        case 'generate_image_tile': {
          onGenerateImage?.();
          feedback = { type: 'success', message: '🎨 Génération de l\'image...', timestamp: Date.now() };
          break;
        }

        case 'generate_3d_object': {
          onGenerate3D?.();
          feedback = { type: 'success', message: '🧊 Génération de l\'objet 3D (Trellis)...', timestamp: Date.now() };
          break;
        }

        case 'generate_script': {
          onGenerateScript?.(intent.targetSection || 'story');
          feedback = { 
            type: 'success', 
            message: `✍️ Génération ${intent.targetSection || 'du récit'}...`, 
            timestamp: Date.now() 
          };
          break;
        }

        case 'create_entity': {
          feedback = { type: 'info', message: `🆕 Création d'un nouveau ${intent.entityType}...`, timestamp: Date.now() };
          break;
        }

        case 'upscale': {
          onUpscale?.(intent.targetSection || '2K');
          feedback = { 
            type: 'success', 
            message: `🚀 Upscaling en ${intent.targetSection || '2K'} activé...`, 
            timestamp: Date.now() 
          };
          break;
        }

        case 'set_resolution': {
          onSetResolution?.(intent.targetSection || '16:9');
          feedback = { 
            type: 'success', 
            message: `📏 Format réglé sur ${intent.targetSection || '16:9'}`, 
            timestamp: Date.now() 
          };
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
      addWizardHistory(feedback);


      // Auto-clear feedback après 4s
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = setTimeout(() => setLastFeedback(null), 4000);

      return intent;
    },
    [entityType, onFieldChange, onTabChange, onGenerateSection, onFillMissing, onPatchApplied, onGenerateImage, onGenerate3D, onGenerateScript, onUpscale, onSetResolution, onDashboard, onError, addWizardHistory],
  );


  // ── Écoute vocale ─────────────────────────────────────────────────────────

  const { isListening, isSupported, transcript, startListening, stopListening, toggleListening } = useVoiceInput({
    onCommand: (result) => {
      if (result.success) return; // déjà géré par l'addon router
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
    commandHistory: wizardCommandHistory,
    transcript,

    isListening,
    isVoiceSupported: isSupported,
    startListening,
    stopListening,
    toggleListening,
    suggestions,
    onDashboard: () => {
       onDashboard?.();
       setLastFeedback({
         type: 'success',
         message: `🏡 Retour au dashboard...`,
         timestamp: Date.now(),
       });
    },
    clearFeedback,
  };
}
