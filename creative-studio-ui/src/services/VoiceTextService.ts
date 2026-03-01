/**
 * VoiceTextService - Service d'intégration voix/texte
 *
 * Permet la reconnaissance vocale pour la saisie, la synthèse vocale
 * pour les réponses, le contrôle vocal des fonctionnalités,
 * et améliore l'accessibilité.
 */

import { notificationService } from './NotificationService';
import { LanguageCode } from '@/utils/llmConfigStorage';

import { VOICE_COMMANDS_DATA, type VoiceCommandDef } from '../data/voiceCommands';

// Minimal typings for browser Web Speech APIs (not yet in lib.dom.d.ts everywhere)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}
interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
interface ISpeechSynthesisUtterance extends EventTarget {
  text: string;
  rate: number;
  pitch: number;
  volume: number;
  lang: string;
  voice: ISpeechSynthesisVoice | null;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
}
interface ISpeechSynthesisVoice {
  lang: string;
  localService: boolean;
  name: string;
}
interface ISpeechSynthesis {
  cancel(): void;
  speak(utterance: ISpeechSynthesisUtterance): void;
  getVoices(): ISpeechSynthesisVoice[];
}

export interface VoiceHotkeyConfig {
  key: string;
  modifier: 'alt' | 'ctrl' | 'shift' | 'meta' | 'none';
  enabled: boolean;
}

export interface VoiceSettings {
  enabled: boolean;
  inputLanguage: LanguageCode;
  outputLanguage: LanguageCode;
  voiceSpeed: number; // 0.5 - 2.0
  voicePitch: number; // 0 - 2
  voiceVolume: number; // 0 - 1
  autoSpeakResponses: boolean;
  voiceActivationKeyword: string;
  continuousListening: boolean;
  activationHotkey: VoiceHotkeyConfig;
  // Discord-style settings
  inputMode: 'voice-activity' | 'push-to-talk';
  inputSensitivity: number; // 0 - 100
  inputDevice: string;
  noiseSuppression: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;
  commandPrefix: string; // e.g. "slash"
  pttKeybind: string; // Key for Push-to-Talk
}

export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  language: LanguageCode;
}

export interface VoiceCommand extends VoiceCommandDef {
  action: (transcript?: string) => void;
  keywords: string[];
  description: string;
}

/**
 * Service d'intégration voix/texte
 */
export class VoiceTextService {
  private static instance: VoiceTextService;

  // APIs du navigateur - typed with minimal Web Speech API interfaces
  private speechRecognition: ISpeechRecognition | null = null;
  private speechSynthesis: ISpeechSynthesis | null = null;

  // État du service
  private settings: VoiceSettings;
  private isListening = false;
  private isSpeaking = false;
  private recognitionCallbacks: {
    onResult: (result: SpeechRecognitionResult) => void;
    onError: (error: string) => void;
    onStart: () => void;
    onEnd?: () => void;
  } | null = null;

  // Commandes vocales
  private voiceCommands: VoiceCommand[] = [];

  // Retry logic for network errors
  private retryCount = 0;
  private maxRetries = 3;
  private retryDelay = 1000; // Start with 1 second
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastNetworkErrorTime = 0;
  private isRetrying = false;
  // Audio analysis for volume levels
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private volumeLevel = 0;

  private constructor() {
    this.settings = this.loadSettings();
    this.initializeAPIs();
    this.setupVoiceCommands();
    this.setupGlobalShortcuts();
  }

  static getInstance(): VoiceTextService {
    if (!VoiceTextService.instance) {
      VoiceTextService.instance = new VoiceTextService();
    }
    return VoiceTextService.instance;
  }

  /**
   * Configure les raccourcis globaux (PTT)
   */
  private setupGlobalShortcuts(): void {
    if (typeof window === 'undefined') return;

    // Handle Control key and custom PTT key for voice activation
    const handlePTTDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Eviter le déclenchement en boucle lors d'un appui long
      if (e.repeat) return;

      const isControl = e.key === 'Control';
      const isCustomPTT = this.settings.inputMode === 'push-to-talk' && e.code === this.settings.pttKeybind;

      if (isControl || isCustomPTT) {
        if (!this.isListening) {
          // Si c'est Control, on preventDefault pour éviter les comportements système indésirables
          if (isControl) e.preventDefault();
          
          window.dispatchEvent(new CustomEvent('storycore:voice-ptt-start'));
          this.startListening({
            onStart: () => {
              this.isListening = true;
              window.dispatchEvent(new CustomEvent('storycore:voice-state', { detail: { isListening: true } }));
            },
            onResult: (res) => {
              if (res.isFinal) {
                window.dispatchEvent(new CustomEvent('storycore:voice-ptt-result', { detail: res.transcript }));
              }
            },
            onError: (err) => {
              console.error(err);
              this.isListening = false;
              window.dispatchEvent(new CustomEvent('storycore:voice-state', { detail: { isListening: false } }));
            },
            onEnd: () => {
              this.isListening = false;
              window.dispatchEvent(new CustomEvent('storycore:voice-state', { detail: { isListening: false } }));
            },
          });
        }
      }
    };

    const handlePTTUp = (e: KeyboardEvent) => {
      const isControl = e.key === 'Control';
      const isCustomPTT = this.settings.inputMode === 'push-to-talk' && e.code === this.settings.pttKeybind;

      if (isControl || isCustomPTT) {
        if (this.isListening) {
          // On laisse un petit délai pour capturer les derniers mots
          setTimeout(() => {
            this.stopListening();
          }, 300);
        }
      }
    };

    window.addEventListener('keydown', handlePTTDown);
    window.addEventListener('keyup', handlePTTUp);
  }

  /**
   * Initialise les APIs du navigateur
   */
  private initializeAPIs(): void {
    // Reconnaissance vocale - use any to access browser API
    const SpeechRecognition = (window as Window & { SpeechRecognition?: new() => ISpeechRecognition; webkitSpeechRecognition?: new() => ISpeechRecognition }).SpeechRecognition
      || (window as Window & { webkitSpeechRecognition?: new() => ISpeechRecognition }).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.speechRecognition = new SpeechRecognition();
      this.configureSpeechRecognition();
    }

    // Synthèse vocale
    if ('speechSynthesis' in window) {
      this.speechSynthesis = (window as Window & { speechSynthesis: ISpeechSynthesis }).speechSynthesis;
    }

    // Vérifier la compatibilité
    if (!this.speechRecognition || !this.speechSynthesis) {
      notificationService.warning(
        'Fonctionnalités vocales limitées',
        'Certaines fonctionnalités vocales ne sont pas disponibles dans votre navigateur.',
        [
          {
            label: 'En savoir plus',
            action: () => window.open('https://caniuse.com/speech-recognition', '_blank'),
            primary: true
          }
        ]
      );
    }
  }

  /**
   * Configure la reconnaissance vocale
   */
  private configureSpeechRecognition(): void {
    if (!this.speechRecognition) return;

    this.speechRecognition.continuous = this.settings.continuousListening;
    this.speechRecognition.interimResults = true;
    this.speechRecognition.lang = this.getLanguageCode(this.settings.inputLanguage);

    this.speechRecognition.onstart = () => {
      this.isListening = true;
      this.recognitionCallbacks?.onStart();
    };

    this.speechRecognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.results.length - 1];
      let transcript = result[0].transcript;
      const confidence = result[0].confidence;

      // Appliquer la correction contextuelle intelligente
      if (result.isFinal) {
        transcript = this.correctTranscript(transcript);
      }

      // Vérifier si c'est une commande vocale (Protocole Carotte)
      let handled = false;
      if (result.isFinal) {
        handled = this.processVoiceCommand(transcript);
      }

      // Si ce n'est pas une commande, envoyer le résultat pour la dictée
      if (!handled) {
        this.recognitionCallbacks?.onResult({
          transcript,
          confidence,
          isFinal: result.isFinal,
          language: this.settings.inputLanguage
        });
      }
    };

    this.speechRecognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      let errorMessage = 'Erreur de reconnaissance vocale';
      const isNetworkError = event.error === 'network';

      switch (event.error) {
        case 'network': {
          const isElectronEnv = typeof window !== 'undefined' && 'electronAPI' in window;
          if (isElectronEnv) {
            errorMessage = "Reconnaissance vocale non supportée dans cette version (Clé d'API manquante). Utilisez le mode navigateur.";
            this.isListening = false;
            this.recognitionCallbacks?.onError(errorMessage);
            return;
          }
          errorMessage = 'Erreur réseau lors de la reconnaissance vocale';
          console.warn('[VoiceTextService] Network error detected, will retry if possible');
          break;
        }
        case 'not-allowed':
          errorMessage = 'Permission micro refusée';
          break;
        case 'no-speech':
          errorMessage = 'Aucune parole détectée';
          // Don't count no-speech as a real error for retry purposes
          this.isListening = false;
          this.recognitionCallbacks?.onError(errorMessage);
          return;
        case 'aborted':
          errorMessage = 'Reconnaissance vocale interrompue';
          this.isListening = false;
          this.recognitionCallbacks?.onError(errorMessage);
          return;
        case 'audio-capture':
          errorMessage = 'Aucun microphone détecté';
          this.isListening = false;
          this.recognitionCallbacks?.onError(errorMessage);
          return;
        case 'service-not-allowed':
          errorMessage = 'Service de reconnaissance non autorisé';
          this.isListening = false;
          this.recognitionCallbacks?.onError(errorMessage);
          return;
      }

      // Handle network errors with retry logic
      if (isNetworkError && this.retryCount < this.maxRetries) {
        this.handleNetworkErrorRetry();
        return;
      }

      this.isListening = false;
      
      // Reset retry state after max retries reached
      if (isNetworkError && this.retryCount >= this.maxRetries) {
        errorMessage = `Erreur réseau: impossible de se connecter après ${this.maxRetries} tentatives. Vérifiez votre connexion internet.`;
        this.resetRetryState();
      }

      this.recognitionCallbacks?.onError(errorMessage);
    };

    this.speechRecognition.onend = () => {
      this.isListening = false;
      this.recognitionCallbacks?.onEnd?.();
    };
  }


  /**
   * Charge les paramètres
   */
  private loadSettings(): VoiceSettings {
    const defaultSettings: VoiceSettings = {
      enabled: true,
      inputLanguage: 'fr',
      outputLanguage: 'fr',
      voiceSpeed: 1.0,
      voicePitch: 1.0,
      voiceVolume: 0.8,
      autoSpeakResponses: false,
      voiceActivationKeyword: 'hé ros',
      continuousListening: false,
      activationHotkey: {
        key: 'Control',
        modifier: 'none',
        enabled: true
      },
      inputMode: 'voice-activity',
      inputSensitivity: 50,
      inputDevice: 'default',
      noiseSuppression: true,
      echoCancellation: true,
      autoGainControl: false,
      commandPrefix: 'slash',
      pttKeybind: 'KeyV'
    };

    try {
      const stored = localStorage.getItem('voice-settings');
      const parsed = stored ? JSON.parse(stored) : {};
      return { ...defaultSettings, ...parsed };
    } catch {
      return defaultSettings;
    }
  }

  /**
   * Sauvegarde les paramètres
   */
  saveSettings(settings: Partial<VoiceSettings>): void {
    this.settings = { ...this.settings, ...settings };
    localStorage.setItem('voice-settings', JSON.stringify(this.settings));

    // Reconfigurer la reconnaissance si la langue ou le mode a changé
    if (settings.inputLanguage || settings.continuousListening !== undefined) {
      this.configureSpeechRecognition();
      this.setupVoiceCommands();
    }
  }

  /**
   * Configure les commandes vocales basées sur les données partagées
   */
  private setupVoiceCommands(): void {
    // Mapper les données partagées vers des actions concrètes
    this.voiceCommands = VOICE_COMMANDS_DATA.map(def => {
      return {
        ...def,
        keywords: this.settings.inputLanguage === 'fr' ? def.keywordsFr : def.keywordsEn,
        description: this.settings.inputLanguage === 'fr' ? def.descriptionFr : def.descriptionEn,
        action: (transcript?: string) => this.executeAction(def.id, transcript)
      };
    });
  }

  /**
   * Exécute une action basée sur l'ID de commande
   */
  private executeAction(id: string, transcript?: string): void {
    switch (id) {
      case 'undo':
        window.dispatchEvent(new CustomEvent('storycore-undo'));
        break;
      case 'redo':
        window.dispatchEvent(new CustomEvent('storycore-redo'));
        break;
      case 'save':
        window.dispatchEvent(new CustomEvent('storycore-save'));
        break;
      case 'help':
        (document.querySelector('.llm-sidebar-header') as HTMLElement)?.click();
        break;
      case 'generate-image':
        window.dispatchEvent(new CustomEvent('storycore-generate-image'));
        break;
      case 'correct-last':
        window.dispatchEvent(new CustomEvent('storycore-correct-last-word'));
        break;
      case 'capture-screen':
        window.dispatchEvent(new CustomEvent('storycore:capture-screen'));
        break;
      case 'add-object':
        window.dispatchEvent(new CustomEvent('storycore:add-object', { detail: { transcript } }));
        break;
      case 'change-lighting':
        window.dispatchEvent(new CustomEvent('storycore:change-lighting', { detail: { transcript } }));
        break;
      case 'add-camera':
        window.dispatchEvent(new CustomEvent('storycore:add-camera', { detail: { transcript } }));
        break;
      default:
        console.warn(`Action non implémentée pour la commande: ${id}`);
    }
  }

  /**
   * Démarre l'analyse audio pour le retour visuel
   */
  private async startAudioAnalysis(): Promise<void> {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext || AudioContext)();
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: this.settings.echoCancellation,
          noiseSuppression: this.settings.noiseSuppression,
          autoGainControl: this.settings.autoGainControl,
        } 
      });

      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVolume = () => {
        if (!this.analyser || !this.isListening) {
          this.volumeLevel = 0;
          return;
        }
        
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        this.volumeLevel = (average / 128) * 100; // Normalisé 0-100

        if (this.isListening) {
          requestAnimationFrame(updateVolume);
        }
      };

      updateVolume();
    } catch (err) {
      console.error('[VoiceTextService] Failed to start audio analysis:', err);
    }
  }

  /**
   * Arrête l'analyse audio
   */
  private stopAudioAnalysis(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.volumeLevel = 0;
  }

  /**
   * Obtient le niveau de volume actuel (0-100)
   */
  getVolumeLevel(): number {
    return this.volumeLevel;
  }

  /**
   * Démarre la reconnaissance vocale
   */
  startListening(callbacks: {
    onResult: (result: SpeechRecognitionResult) => void;
    onError: (error: string) => void;
    onStart: () => void;
    onEnd?: () => void;
  }): boolean {
    if (!this.settings.enabled || !this.speechRecognition) {
      callbacks.onError('Reconnaissance vocale non disponible');
      return false;
    }

    // Check if we're online before attempting to start
    if (!navigator.onLine) {
      callbacks.onError('Pas de connexion internet. La reconnaissance vocale nécessite une connexion.');
      return false;
    }

    if (this.isListening) {
      this.stopListening();
    }

    // Reset retry state on new listening request
    this.resetRetryState();

    this.recognitionCallbacks = callbacks;

    try {
      this.speechRecognition.start();
      this.startAudioAnalysis();
      return true;
    } catch {
      callbacks.onError('Impossible de démarrer la reconnaissance vocale');
      return false;
    }
  }

  /**
   * Arrête la reconnaissance vocale
   */
  stopListening(): void {
    if (this.speechRecognition && this.isListening) {
      this.speechRecognition.stop();
      this.stopAudioAnalysis();
    }
  }

  /**
   * Parle un texte
   */
  speak(text: string, options?: {
    speed?: number;
    pitch?: number;
    volume?: number;
    voice?: ISpeechSynthesisVoice;
  }): boolean {
    if (!this.settings.enabled || !this.speechSynthesis) {
      return false;
    }

    // Arrêter la synthèse en cours
    if (this.isSpeaking) {
      this.speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text) as unknown as ISpeechSynthesisUtterance;

    // Configuration
    utterance.rate = options?.speed || this.settings.voiceSpeed;
    utterance.pitch = options?.pitch || this.settings.voicePitch;
    utterance.volume = options?.volume || this.settings.voiceVolume;
    utterance.lang = this.getLanguageCode(this.settings.outputLanguage);

    if (options?.voice) {
      utterance.voice = options.voice;
    } else {
      // Sélectionner une voix appropriée
      const voices = this.speechSynthesis.getVoices();
      const preferredVoice = voices.find((voice: ISpeechSynthesisVoice) =>
        voice.lang.startsWith(this.settings.outputLanguage) && voice.localService
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
    };

    utterance.onend = () => {
      this.isSpeaking = false;
    };

    utterance.onerror = (event: { error: string }) => {
      this.isSpeaking = false;
      console.error('Speech synthesis error:', event.error);
    };

    this.speechSynthesis.speak(utterance);
    return true;
  }

  /**
   * Arrête la synthèse vocale
   */
  stopSpeaking(): void {
    if (this.speechSynthesis) {
      this.speechSynthesis.cancel();
      this.isSpeaking = false;
    }
  }

  /**
   * Gère les erreurs réseau avec tentative de reconnexion
   */
  private handleNetworkErrorRetry(): void {
    this.isRetrying = true;
    this.retryCount++;
    const currentRetry = this.retryCount;
    
    // Calculate exponential backoff delay
    const delay = this.retryDelay * Math.pow(2, currentRetry - 1);
    
    // Only log to debug level to reduce console noise
    console.debug(`[VoiceTextService] Retrying connection (attempt ${currentRetry}/${this.maxRetries}) in ${delay}ms`);
    
    // DON'T show notification during retries - only show final error
    // This reduces notification spam when network is temporarily unavailable

    // Clear any existing retry timeout
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    // Attempt to restart recognition after delay
    this.retryTimeout = setTimeout(() => {
      if (this.recognitionCallbacks && this.retryCount === currentRetry) {
        try {
          // Try to restart speech recognition
          if (this.speechRecognition) {
            this.speechRecognition.start();
            console.debug('[VoiceTextService] Retry attempt started');
          }
        } catch (err) {
          console.debug('[VoiceTextService] Retry failed:', err);
          // If restart fails, try again if we haven't exceeded max retries
          if (this.retryCount < this.maxRetries) {
            this.handleNetworkErrorRetry();
          } else {
            this.recognitionCallbacks.onError(
              `Erreur réseau: impossible de se connecter après ${this.maxRetries} tentatives. Vérifiez votre connexion internet.`
            );
            this.resetRetryState();
          }
        }
      }
    }, delay);
  }

  /**
   * Réinitialise l'état de retry
   */
  private resetRetryState(): void {
    this.retryCount = 0;
    this.isRetrying = false;
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }

  /**
   * Vérifie si le service est en cours de reconnexion
   */
  isCurrentlyRetrying(): boolean {
    return this.isRetrying;
  }

  /**
   * Obtient le nombre de tentatives restantes
   */
  getRemainingRetries(): number {
    return Math.max(0, this.maxRetries - this.retryCount);
  }

  /**
   * Traite une commande vocale
   */
  public processVoiceCommand(transcript: string): boolean {
    const lowerTranscript = transcript.toLowerCase().trim();
    const prefix = this.settings.commandPrefix.toLowerCase();

    // Vérifier si le transcript commence par le préfixe réservé (ex: "slash")
    if (!lowerTranscript.startsWith(prefix)) {
      return false; // Pas une commande, laisser comme dictée normale
    }

    // Nettoyer le transcript du préfixe
    const cleanTranscript = lowerTranscript.substring(prefix.length).trim();

    // Trouver la commande correspondante
    for (const command of this.voiceCommands) {
      const hasKeyword = command.keywords.some(keyword =>
        cleanTranscript.startsWith(keyword.toLowerCase())
      );

      if (hasKeyword) {
        notificationService.info(
          'Commande vocale StoryCore',
          `Exécution : "${command.description}"`,
          [
            {
              label: 'Annuler',
              action: () => {}, 
              primary: true
            }
          ]
        );

        command.action(cleanTranscript);
        return true;
      }
    }

    return false;
  }

  /**
   * Corrige intelligemment le transcript (Protocole Carotte)
   */
  private correctTranscript(transcript: string): string {
    let corrected = transcript.trim();

    // 1. Supprimer les hésitations courantes
    const hesitations = [
      /\b(uhm|uh|euh|hmm|ah|oh)\b/gi,
      /\.\.\./g,
      /\s{2,}/g
    ];

    hesitations.forEach(regex => {
      corrected = corrected.replace(regex, ' ').trim();
    });

    // 2. Correction des homophones et termes techniques (gaming/streaming)
    const rules = this.getCorrectionRules(this.settings.inputLanguage);
    
    for (const [wrong, right] of Object.entries(rules)) {
      const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
      corrected = corrected.replace(regex, right);
    }

    // 3. Capitalisation automatique si nécessaire
    if (corrected.length > 0) {
      corrected = corrected.charAt(0).toUpperCase() + corrected.slice(1);
    }

    return corrected;
  }

  /**
   * Fournit les règles de correction par langue
   */
  private getCorrectionRules(lang: LanguageCode): Record<string, string> {
    const commonRules: Record<string, string> = {
      'pouchtok': 'push-to-talk',
      'stt': 'speech-to-text',
      'tts': 'text-to-speech',
    };

    const languageSpecific: Record<string, Record<string, string>> = {
      'fr': {
        'story corps': 'StoryCore',
        'story cord': 'StoryCore',
        'pousse tout talk': 'push-to-talk',
        'carrotte': 'Carrot',
      },
      'en': {
        'story core': 'StoryCore',
        'story chord': 'StoryCore',
        'push to talk': 'push-to-talk',
        'carrot protocol': 'Carrot Protocol',
      }
    };

    return { ...commonRules, ...(languageSpecific[lang] || {}) };
  }

  /**
   * Obtient la liste des voix disponibles
   */
  getAvailableVoices(): ISpeechSynthesisVoice[] {
    return this.speechSynthesis ? this.speechSynthesis.getVoices() : [];
  }

  /**
   * Obtient les paramètres actuels
   */
  getSettings(): VoiceSettings {
    return { ...this.settings };
  }

  /**
   * Vérifie si la reconnaissance vocale est disponible
   */
  isSpeechRecognitionAvailable(): boolean {
    return !!this.speechRecognition;
  }

  /**
   * Vérifie si la synthèse vocale est disponible
   */
  isSpeechSynthesisAvailable(): boolean {
    return !!this.speechSynthesis;
  }

  /**
   * Obtient l'état actuel
   */
  getStatus(): {
    isListening: boolean;
    isSpeaking: boolean;
    hasRecognition: boolean;
    hasSynthesis: boolean;
  } {
    return {
      isListening: this.isListening,
      isSpeaking: this.isSpeaking,
      hasRecognition: this.isSpeechRecognitionAvailable(),
      hasSynthesis: this.isSpeechSynthesisAvailable()
    };
  }

  /**
   * Obtient les commandes vocales disponibles
   */
  getVoiceCommands(): VoiceCommand[] {
    return [...this.voiceCommands];
  }

  /**
   * Convertit un code de langue en code BCP 47
   */
  private getLanguageCode(language: LanguageCode): string {
    const languageMap: Record<LanguageCode, string> = {
      fr: 'fr-FR',
      en: 'en-US',
      es: 'es-ES',
      de: 'de-DE',
      it: 'it-IT',
      pt: 'pt-BR',
      ja: 'ja-JP',
      zh: 'zh-CN',
      ko: 'ko-KR'
    };
    return languageMap[language] || 'fr-FR';
  }

  /**
   * Teste la synthèse vocale
   */
  testSpeechSynthesis(): boolean {
    const testText = this.settings.outputLanguage === 'fr'
      ? 'Test de synthèse vocale réussi'
      : 'Speech synthesis test successful';

    const success = this.speak(testText);

    if (success) {
      notificationService.success('Test réussi', 'Synthèse vocale fonctionnelle');
    } else {
      notificationService.error('Test échoué', 'Synthèse vocale non disponible');
    }

    return success;
  }

  /**
   * Nettoie les ressources
   */
  destroy(): void {
    this.stopListening();
    this.stopSpeaking();

    if (this.speechRecognition) {
      this.speechRecognition.abort();
    }
  }
}

// Export de l'instance singleton
export const voiceTextService = VoiceTextService.getInstance();

