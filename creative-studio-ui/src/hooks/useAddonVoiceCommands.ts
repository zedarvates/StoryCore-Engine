/**
 * useAddonVoiceCommands
 * ======================
 * Hook React pour écouter et émettre des commandes vocales addon.
 *
 * Usage dans un composant addon :
 *
 *   const { route, updateContext, lastIntent } = useAddonVoiceCommands({
 *     addonId: 'grok-imagine',
 *     onGenerate: (payload) => startGeneration(payload.prompt),
 *     onRegenerate: () => regenerate(),
 *     onEdit: (payload) => openEditor(payload.imagePath),
 *     onCancel: () => abort(),
 *   });
 *
 *   // Appel manuel depuis un textarea ou bouton micro :
 *   route('générer un chevalier samurai avec grok');
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import {
  AddonVoiceCommandRouter,
  AddonId,
  ParsedVoiceIntent,
  AddonCommandContext,
  VoiceCommandResult,
  registerAddonVoiceCommands,
} from '@/services/AddonVoiceCommandRouter';
import { eventEmitter, EventPayload, EventListener, AddonActionPayload } from '@/services/eventEmitter';

// ============================================================================
// TYPES
// ============================================================================

export interface UseAddonVoiceCommandsOptions {
  /** L'addon qui utilise ce hook */
  addonId: AddonId;

  /** Contexte courant (sera mis à jour automatiquement) */
  context?: Partial<AddonCommandContext>;

  /** Callbacks déclenchés par les commandes vocales */
  onGenerate?: (payload: EventPayload) => void;
  onRegenerate?: (payload: EventPayload) => void;
  onFix?: (payload: EventPayload) => void;
  onEdit?: (payload: EventPayload) => void;
  onExport?: (payload: EventPayload) => void;
  onCancel?: (payload: EventPayload) => void;
  onContinue?: (payload: EventPayload) => void;
  onStatus?: (payload: EventPayload) => void;
}

export interface UseAddonVoiceCommandsReturn {
  /** Route un transcript (texte libre ou vocal) vers les addons */
  route: (transcript: string, confidence?: number) => Promise<VoiceCommandResult>;

  /** Met à jour le contexte du routeur */
  updateContext: (ctx: Partial<AddonCommandContext>) => void;

  /** Dernier intent reconnu */
  lastIntent: ParsedVoiceIntent | null;

  /** Émet directement un événement addon */
  emit: (eventName: string, payload?: EventPayload) => void;

  /** Vrai si une commande est en cours de traitement */
  isProcessing: boolean;
}

// ============================================================================
// INIT GUARD — registerAddonVoiceCommands une seule fois
// ============================================================================

let _registered = false;

function ensureRegistered(): void {
  if (!_registered) {
    registerAddonVoiceCommands();
    _registered = true;
  }
}

// ============================================================================
// HOOK
// ============================================================================

export function useAddonVoiceCommands(
  options: UseAddonVoiceCommandsOptions,
): UseAddonVoiceCommandsReturn {
  const { addonId, context, onGenerate, onRegenerate, onFix, onEdit, onExport, onCancel, onContinue, onStatus } = options;
  const router = AddonVoiceCommandRouter.getInstance();

  const [lastIntent, setLastIntent] = useState<ParsedVoiceIntent | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Enregistrement unique
  useEffect(() => {
    ensureRegistered();
  }, []);

  // Mise à jour contexte
  useEffect(() => {
    if (context) {
      router.updateContext(context);
    }
  }, [context, router]);

  // Mappage événements → callbacks selon l'addonId
  useEffect(() => {
    // Construire les noms d'événements selon l'addonId
    const prefix = `addon:${addonId}`;

    const bindings: [string, EventListener<EventPayload> | undefined][] = [
      [`${prefix}:generate`,   onGenerate],
      [`${prefix}:regenerate`, onRegenerate],
      [`${prefix}:fix`,        onFix],
      [`${prefix}:edit`,       onEdit],
      [`${prefix}:export`,     onExport],
      [`${prefix}:cancel`,     onCancel],
      [`${prefix}:continue`,   onContinue],
      [`${prefix}:status`,     onStatus],
    ];

    const subscriptions: Array<{ unsubscribe: () => void }> = [];

    for (const [eventName, cb] of bindings) {
      if (cb) {
        const handler: EventListener<EventPayload> = (payload) => {
          setLastIntent(prev => prev as ParsedVoiceIntent); // force re-render
          cb(payload);
        };
        const sub = eventEmitter.on(eventName, handler);
        subscriptions.push(sub);
      }
    }

    return () => {
      subscriptions.forEach(sub => sub.unsubscribe());
    };
  }, [addonId, onGenerate, onRegenerate, onFix, onEdit, onExport, onCancel, onContinue, onStatus]);

  // ── route() ────────────────────────────────────────────────────────────────
 
  const route = useCallback(
    async (transcript: string, confidence = 1.0): Promise<VoiceCommandResult> => {
      setIsProcessing(true);
 
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setIsProcessing(false), 3000);
 
      const result = await router.route(transcript, confidence);
 
      if (result.intent) {
        setLastIntent(result.intent);
      }
 
      setIsProcessing(false);
      return result;
    },
    [router],
  );

  // ── updateContext() ────────────────────────────────────────────────────────

  const updateContext = useCallback(
    (ctx: Partial<AddonCommandContext>) => {
      router.updateContext(ctx);
    },
    [router],
  );

  // ── emit() ────────────────────────────────────────────────────────────────

  const emit = useCallback(
    (eventName: string, payload: EventPayload) => {
      eventEmitter.emit(eventName, payload);
    },
    [],
  );

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { route, updateContext, lastIntent, emit, isProcessing };
}

// ============================================================================
// useVoiceInput — Micro bouton + transcript → route automatique
// ============================================================================

/**
 * Hook complémentaire qui gère le bouton micro et route automatiquement
 * le transcript vers les addons.
 *
 * Usage :
 *   const { isListening, startListening, stopListening, transcript } = useVoiceInput({
 *     onCommand: (result) => console.log(result),
 *   });
 */
export interface UseVoiceInputOptions {
  /** Callback quand une commande est routée */
  onCommand?: (result: VoiceCommandResult) => void;
  /** Callback sur changements du transcript intermédiaire */
  onTranscriptChange?: (transcript: string) => void;
  /** Langue (default 'fr-FR') */
  language?: string;
}

export interface UseVoiceInputReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
}

export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const { onCommand, onTranscriptChange, language = 'fr-FR' } = options;
  const router = AddonVoiceCommandRouter.getInstance();

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    // Defer state update to avoid cascading renders
    const timer = setTimeout(() => setIsSupported(!!SpeechRecognition), 0);

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => setIsListening(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const latest = event.results[event.results.length - 1];
      const text = latest[0].transcript;
      const conf = latest[0].confidence;

      setTranscript(text);
      onTranscriptChange?.(text);

      // Émettre sur l'event bus pour que les commandes enregistrées puissent réagir
      // On passe un objet qui matche AddonActionPayload au minimum
      eventEmitter.emit('voice:transcript', { 
        transcript: text, 
        confidence: conf,
        timestamp: new Date(),
        source: 'VoiceInput',
        addonId: 'system',
        verb: 'transcript'
      } as AddonActionPayload);

      if (latest.isFinal) {
        // Router le transcript final
        router.route(text, conf).then(result => {
          onCommand?.(result);
          setTranscript('');
        });
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;

    return () => {
      if (recognition) recognition.abort();
      clearTimeout(timer);
    };
  }, [language, onCommand, onTranscriptChange, router]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const toggleListening = useCallback(() => {
    if (isListening) stopListening();
    else startListening();
  }, [isListening, startListening, stopListening]);

  return { isListening, isSupported, transcript, startListening, stopListening, toggleListening };
}
