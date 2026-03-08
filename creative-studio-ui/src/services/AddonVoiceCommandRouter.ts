/**
 * AddonVoiceCommandRouter
 * ========================
 * Routeur de commandes vocales et textuelles pour tous les addons StoryCore.
 */

import { eventEmitter, type TranscriptPayload, type AddonActionPayload } from './eventEmitter';
import { notificationService } from './NotificationService';

export type { AddonActionPayload };

// ============================================================================
// TYPES
// ============================================================================

export type AddonId =
  | 'system'
  | 'grok-imagine'
  | 'stable-diffusion'
  | 'seedance'
  | 'comic-generator'
  | 'recap-engine'
  | 'asset-creator'
  | 'cinematic-editor'
  | 'project-translator'
  | 'credits-screen'
  | 'video-publisher';

export type VerbCategory =
  | 'create'
  | 'regenerate'
  | 'fix'
  | 'edit'
  | 'export'
  | 'cancel'
  | 'continue'
  | 'navigate'
  | 'playback'
  | 'selection'
  | 'view'
  | 'mood'
  | 'undo'
  | 'redo'
  | 'save'
  | 'pose';

export interface ParsedVoiceIntent {
  addonId: AddonId;
  verb: VerbCategory;
  subject: string;
  modifiers: string[];
  rawTranscript: string;
  confidence: number;
}

export interface VoiceCommandResult {
  success: boolean;
  message: string;
  actionTaken?: string;
  suggestions?: string[];
}

// ── Événements Standardisés ────────────────────────────────────────────────

export const ADDON_EVENTS = {
  // System actions
  SYSTEM_UNDO: 'system:undo',
  SYSTEM_REDO: 'system:redo',
  SYSTEM_SAVE: 'system:save',
  SYSTEM_NAVIGATE: 'system:navigate',

  // Cinematic Editor actions
  CINEMATIC_PLAY: 'cinematic:play',
  CINEMATIC_PAUSE: 'cinematic:pause',
  CINEMATIC_STOP: 'cinematic:stop',
  CINEMATIC_NEXT: 'cinematic:next',
  CINEMATIC_PREV: 'cinematic:prev',
  CINEMATIC_SELECT_SHOT: 'cinematic:select-shot',
  CINEMATIC_CHANGE_MOOD: 'cinematic:change-mood',
  CINEMATIC_SWITCH_TAB: 'cinematic:switch-tab',
  CINEMATIC_SET_POSE: 'cinematic:set-pose',
  CINEMATIC_SET_CAMERA: 'cinematic:set-camera',
  CINEMATIC_REWIND: 'cinematic:rewind',
  CINEMATIC_GENERATE_STORY: 'cinematic:generate-story',
  CINEMATIC_GENERATE_DIALOGUES: 'cinematic:generate-dialogues',
  CINEMATIC_GENERATE_PROMPT: 'cinematic:generate-prompt',
};

// ============================================================================
// VOICE INTENT PARSER
// ============================================================================

class VoiceIntentParser {
  // Dictionnaires de mots-clés
  private static readonly VERBS: Record<VerbCategory, string[]> = {
    create: ['générer', 'créer', 'dessiner', 'faire', 'lancer', 'produire', 'écrire', 'inventer', 'create', 'generate', 'make', 'draw', 'write', 'invent'],
    regenerate: ['régénérer', 'refaire', 'recommencer', 'relancer', 'regenerate', 'redo', 'restart'],
    fix: ['corriger', 'améliorer', 'affiner', 'retoucher', 'fixer', 'fix', 'improve', 'enhance', 'touch up'],
    edit: ['éditer', 'modifier', 'changer', 'ajuster', 'edit', 'modify', 'change', 'adjust'],
    export: ['exporter', 'sauvegarder', 'télécharger', 'export', 'save', 'download'],
    cancel: ['annuler', 'arrêter', 'stop', 'quitter', 'cancel', 'stop', 'quit', 'halt'],
    continue: ['continuer', 'prolonger', 'suite', 'prochain', 'continue', 'next', 'keep going'],
    navigate: ['aller', 'montrer', 'ouvrir', 'naviguer', 'go', 'show', 'open', 'navigate', 'display', 'pov'],
    playback: ['jouer', 'lire', 'lecture', 'pause', 'play', 'read', 'listen', 'retour', 'rewind', 'rembobiner'],
    selection: ['sélectionner', 'choisir', 'select', 'choose', 'pick', 'pov'],
    view: ['voir', 'regarder', 'view', 'look', 'watch'],
    mood: ['ambiance', 'style', 'mood', 'atmosphere'],
    undo: ['annuler action', 'revenir en arrière', 'undo', 'back'],
    redo: ['rétablir', 'refaire action', 'redo', 'forward'],
    save: ['enregistrer projet', 'sauvegarder projet', 'save project', 'store'],
    pose: ['pose', 'position', 'posture', 'attitude', 'geste', 'pose', 'position', 'stance'],
  };

  private static readonly ADDONS: Record<AddonId, string[]> = {
    system: ['système', 'application', 'logiciel', 'system', 'app'],
    'grok-imagine': ['grok', 'imagine', 'xai'],
    'stable-diffusion': ['stable diffusion', 'sd', 'local', 'comfy'],
    seedance: ['seedance', 'vidéo ia', 'video ai'],
    'comic-generator': ['bd', 'comic', 'planche'],
    'recap-engine': ['recap', 'résumé', 'recapitulatif'],
    'asset-creator': ['asset', 'objet', 'élément', 'accessoire'],
    'cinematic-editor': ['éditeur', 'cinématique', 'cinematic', 'editor', 'timeline', 'séquence'],
    'project-translator': ['traducteur', 'traduction', 'translator', 'translate', 'traduire'],
    'credits-screen': ['crédits', 'générique', 'remerciements', 'credits', 'thanks'],
    'video-publisher': ['publisher', 'publication', 'publier', 'video publisher', 'social hub', 'postbot'],
  };

  public static parse(transcript: string, confidence: number = 1.0): ParsedVoiceIntent {
    const lower = transcript.toLowerCase();
    const result: ParsedVoiceIntent = {
      addonId: 'system', // Default
      verb: 'create',    // Default
      subject: '',
      modifiers: [],
      rawTranscript: transcript,
      confidence,
    };

    // 1. Détection de l'Addon
    for (const [id, keywords] of Object.entries(this.ADDONS)) {
      if (keywords.some(kw => lower.includes(kw))) {
        result.addonId = id as AddonId;
        break;
      }
    }

    // Spécial : Si on parle d'action d'édition cinématique, on cible cet addon
    if (lower.includes('lecture') || lower.includes('jouer') || lower.includes('prochain') || lower.includes('précédent') || lower.includes('onglet') || lower.includes('pose') || lower.includes('position')) {
      result.addonId = 'cinematic-editor';
    }

    // 2. Détection du Verbe
    for (const [category, keywords] of Object.entries(this.VERBS)) {
      if (keywords.some(kw => lower.includes(kw))) {
        result.verb = category as VerbCategory;
        break;
      }
    }

    // 3. Extraction du Sujet (ce qui reste après le verbe et l'addon)
    // Logique simplifiée : on prend la fin de la phrase après les mots clés
    result.subject = transcript; // Temporaire

    return result;
  }
}

// ============================================================================
// ADDON VOICE COMMAND ROUTER (SINGLETON)
// ============================================================================

export class AddonVoiceCommandRouter {
  private static instance: AddonVoiceCommandRouter;

  private constructor() {
    console.info('[AddonVoiceCommandRouter] Initialisé');
  }

  public static getInstance(): AddonVoiceCommandRouter {
    if (!AddonVoiceCommandRouter.instance) {
      AddonVoiceCommandRouter.instance = new AddonVoiceCommandRouter();
    }
    return AddonVoiceCommandRouter.instance;
  }

  /**
   * Route une commande vers l'addon approprié
   */
  public route(transcript: string, confidence: number = 1.0): VoiceCommandResult {
    const intent = VoiceIntentParser.parse(transcript, confidence);
    console.debug('[VoiceRouter] Intent détecté :', intent);

    switch (intent.addonId) {
      case 'system':
        return this.handleSystem(intent.verb, intent.subject, intent.modifiers);
      case 'cinematic-editor':
        return this.handleCinematic(intent.verb, intent.subject, intent.modifiers);
      case 'grok-imagine':
      case 'stable-diffusion':
      case 'seedance':
      case 'comic-generator':
      case 'project-translator':
      case 'credits-screen':
      case 'video-publisher':
        return this.handleImageVideoAddon(intent);
      default:
        return {
          success: false,
          message: `Désolé, l'addon "${intent.addonId}" n'est pas encore supporté par commande vocale.`,
        };
    }
  }

  // ============================================================================
  // HANDLERS SPÉCIFIQUES
  // ============================================================================

  // SYSTEM — Actions Globales
  // ============================================================================

  private handleSystem(verb: VerbCategory, subject: string, modifiers: string[]): VoiceCommandResult {
    // modifiers and subject usage depends on the specific system action
    console.debug(`[handleSystem] ${verb} ${subject}`, modifiers);
    const timestamp = new Date();
    const source = 'VoiceCommandRouter';

    switch (verb) {
      case 'undo':
        eventEmitter.emit(ADDON_EVENTS.SYSTEM_UNDO, { timestamp, source, addonId: 'system', verb: 'undo', action: 'undo' });
        return { success: true, message: 'Action annulée.' };
      case 'redo':
        eventEmitter.emit(ADDON_EVENTS.SYSTEM_REDO, { timestamp, source, addonId: 'system', verb: 'redo', action: 'redo' });
        return { success: true, message: 'Action rétablie.' };
      case 'save':
        eventEmitter.emit(ADDON_EVENTS.SYSTEM_SAVE, { timestamp, source, addonId: 'system', verb: 'save', action: 'save' });
        return { success: true, message: 'Projet sauvegardé.' };
      case 'navigate':
        // On essaie d'extraire la destination du sujet
        eventEmitter.emit(ADDON_EVENTS.SYSTEM_NAVIGATE, {
          timestamp,
          source,
          addonId: 'system',
          verb: 'navigate',
          target: subject || 'dashboard'
        });
        return { success: true, message: `Navigation vers ${subject || 'le tableau de bord'}.` };
      default:
        return this.handleAmbiguous({ addonId: 'system', verb, subject, modifiers, rawTranscript: '', confidence: 1 });
    }
  }

  // CINEMATIC EDITOR — Contrôle Lecture et Montage
  // ============================================================================

  private handleCinematic(verb: VerbCategory, subject: string, modifiers: string[]): VoiceCommandResult {
    const lower = subject.toLowerCase();
    const timestamp = new Date();
    const source = 'VoiceCommandRouter';

    // Playback control
    if (lower.includes('jouer') || lower.includes('lire') || lower.includes('play')) {
      eventEmitter.emit(ADDON_EVENTS.CINEMATIC_PLAY, { timestamp, source, addonId: 'cinematic-editor', verb: 'playback', action: 'play' });
      return { success: true, message: 'Lecture lancée.' };
    }
    if (lower.includes('pause') || lower.includes('arrêter') || lower.includes('stop')) {
      eventEmitter.emit(ADDON_EVENTS.CINEMATIC_PAUSE, { timestamp, source, addonId: 'cinematic-editor', verb: 'playback', action: 'pause' });
      return { success: true, message: 'Lecture en pause.' };
    }
    if (lower.includes('retour') || lower.includes('rewind') || lower.includes('revenir') || lower.includes('rembobiner')) {
      eventEmitter.emit(ADDON_EVENTS.CINEMATIC_REWIND, { timestamp, source, addonId: 'cinematic-editor', verb: 'playback', action: 'rewind' });
      return { success: true, message: 'Retour en arrière (Rewind) avec effet SFX.' };
    }
    if (lower.includes('pov') || lower.includes('p.o.v') || lower.includes('vue subjective')) {
      eventEmitter.emit(ADDON_EVENTS.CINEMATIC_SET_CAMERA, { timestamp, source, addonId: 'cinematic-editor', verb: 'camera', camera: 'pov' });
      return { success: true, message: 'Passage en vue subjective (POV).' };
    }

    // Navigation de plans
    if (lower.includes('suivant') || lower.includes('prochain') || lower.includes('next')) {
      eventEmitter.emit(ADDON_EVENTS.CINEMATIC_NEXT, { timestamp, source, addonId: 'cinematic-editor', verb: 'navigate' });
      return { success: true, message: 'Séquence suivante.' };
    }
    if (lower.includes('précédent') || lower.includes('avant') || lower.includes('previous')) {
      eventEmitter.emit(ADDON_EVENTS.CINEMATIC_PREV, { timestamp, source, addonId: 'cinematic-editor', verb: 'navigate' });
      return { success: true, message: 'Séquence précédente.' };
    }

    // Changement d'onglet
    if (lower.includes('onglet') || lower.includes('tab')) {
      eventEmitter.emit(ADDON_EVENTS.CINEMATIC_SWITCH_TAB, {
        timestamp,
        source,
        addonId: 'cinematic-editor',
        verb: 'view',
        tab: modifiers[0] || 'timeline'
      });
      return { success: true, message: 'Changement d\'onglet.' };
    }

    // Pose de personnage
    if (verb === 'pose' || lower.includes('pose') || lower.includes('position')) {
      // Tentative d'extraction du personnage et de la pose
      // Format attendu: "[Nom/P1] en pose [Pose]"
      let target = 'P1'; // Par défaut
      let pose = 'idle';

      // Extraction simplifiée
      const parts = lower.split(/ en pose | pose | position | en /);
      if (parts.length >= 2) {
        target = parts[0].trim().replace(/^(mets|positionne|mettez) /i, '');
        pose = parts[parts.length - 1].trim();
      } else {
        // Fallback si format different
        const words = lower.split(' ');
        if (words.length >= 2) {
          target = words[0];
          pose = words[words.length - 1];
        }
      }

      eventEmitter.emit(ADDON_EVENTS.CINEMATIC_SET_POSE, {
        timestamp,
        source,
        addonId: 'cinematic-editor',
        verb: 'pose',
        target, // Nom ou P1/P2...
        pose // Nom de la pose (ex: "guerrier", "action")
      });

      return { 
        success: true, 
        message: `Pose "${pose}" appliquée à ${target}.`,
        actionTaken: `cinematic:set-pose:${target}:${pose}`
      };
    }

    // Story / Scenario generation
    if (lower.includes('scénario') || lower.includes('histoire') || lower.includes('scenario') || lower.includes('story')) {
      eventEmitter.emit(ADDON_EVENTS.CINEMATIC_GENERATE_STORY, { timestamp, source, addonId: 'cinematic-editor', verb: 'create', subject: 'scenario' });
      return { success: true, message: 'Génération du scénario lancée.' };
    }

    // Dialogue generation
    if (lower.includes('dialogue') || lower.includes('paroles') || lower.includes('texte')) {
      eventEmitter.emit(ADDON_EVENTS.CINEMATIC_GENERATE_DIALOGUES, { timestamp, source, addonId: 'cinematic-editor', verb: 'create', subject: 'dialogues' });
      return { success: true, message: 'Génération des dialogues lancée.' };
    }

    // Prompt generation
    if (lower.includes('prompt') || lower.includes('commande ia')) {
      eventEmitter.emit(ADDON_EVENTS.CINEMATIC_GENERATE_PROMPT, { timestamp, source, addonId: 'cinematic-editor', verb: 'create', subject: 'prompt' });
      return { success: true, message: 'Génération du prompt lancée.' };
    }

    return {
      success: false,
      message: 'Commande cinématique non reconnue.',
      suggestions: ['Jouer la vidéo', 'Mettre en pause', 'Plan suivant', 'Aller à l\'onglet effets'],
    };
  }

  // IMAGE / VIDEO / COMIC — Génération de contenu
  // ============================================================================

  private handleImageVideoAddon(intent: ParsedVoiceIntent): VoiceCommandResult {
    const { addonId, verb, subject } = intent;

    // Mapping verbe -> événement addon
    const eventType = `addon:${addonId}:${verb}`;
    const payload: AddonActionPayload = {
      timestamp: new Date(),
      source: 'VoiceCommandRouter',
      addonId,
      verb,
      prompt: subject,
      confidence: intent.confidence,
    };

    console.info(`[AddonVoiceCommandRouter] Émission : ${eventType}`, payload);
    eventEmitter.emit(eventType, payload);

    notificationService.info(`Action IA (${addonId})`, `Commande "${verb}" reconnue.`);

    return {
      success: true,
      message: `La commande de type "${verb}" a été transmise à l'addon ${addonId}.`,
      actionTaken: eventType,
    };
  }

  // AMBIGUOUS / FALLBACK
  // ============================================================================

  private handleAmbiguous(intent: ParsedVoiceIntent): VoiceCommandResult {
    const { verb, subject } = intent;
    console.debug('[handleAmbiguous] Suggestions for:', verb, subject);

    // Proposer des suggestions selon le verbe
    const suggestions: string[] = [];
    if (verb === 'create') suggestions.push('Générer un paysage', 'Créer un nouveau personnage');
    if (verb === 'cancel') suggestions.push('Arrêter la génération');

    return {
      success: false,
      message: 'Désolé, je n\'ai pas bien compris l\'action demandée.',
      suggestions,
    };
  }
}

/**
 * Initialise les listeners de commandes vocales pour les addons
 */
export function initializeAddonVoiceCommands() {
  const router = AddonVoiceCommandRouter.getInstance();

  const addonCommands = [
    {
      command: 'generate-image',
      keywords: ['générer image', 'créer image', 'dessiner', 'fais-moi une image'],
      description: 'Générer une image avec l\'addon actif',
      action: (prompt: string) => router.route(`créer image ${prompt}`),
    },
    {
      command: 'regenerate',
      keywords: ['régénérer', 'refais', 'essaye encore', 'un autre style'],
      description: 'Demander un nouveau résultat',
      action: () => router.route('régénérer'),
    },
    {
      command: 'fix-element',
      keywords: ['corriger', 'améliorer', 'fixer', 'plus de détails'],
      description: 'Corriger/améliorer l\'élément sélectionné',
      action: () => router.route('corriger'),
    },
    {
      command: 'annuler-generation',
      keywords: ['annuler génération', 'stopper génération', 'arrête génération'],
      description: 'Annuler la génération en cours',
      action: () => {
        ['grok-imagine', 'stable-diffusion', 'seedance', 'comic-generator', 'recap-engine'].forEach(
          addon => eventEmitter.emit(`addon:${addon}:cancel`, {
            timestamp: new Date(),
            source: 'VoiceCommandRouter',
            addonId: addon,
            verb: 'cancel'
          })
        );
      },
    },
  ];

  // Enregistrer dans VoiceTextService (accès via singleton)
  // VoiceTextService expose addVoiceCommands si on l'étend, sinon on utilise l'event
  // Pour rester découplé, on intercepte via processVoiceCommand override
  addonCommands.forEach(cmd => {
    // Émet un événement que le VoiceTextService peut écouter
    eventEmitter.on('voice:transcript', (data: TranscriptPayload) => {
      // TranscriptPayload compatible check
      if (!data.transcript) return;
      
      const lower = data.transcript.toLowerCase();
      const hasKw = cmd.keywords.some(kw => lower.includes(kw));
      if (hasKw) {
        router.route(data.transcript, data.confidence || 1.0);
      }
    });
  });

  console.info('[AddonVoiceCommandRouter] Commandes vocales addon enregistrées :', addonCommands.length);
}

// ── Singletons exportés ────────────────────────────────────────────────────

export const addonVoiceCommandRouter = AddonVoiceCommandRouter.getInstance();
export const voiceIntentParser = VoiceIntentParser;
