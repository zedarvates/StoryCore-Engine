/**
 * VoiceTextService - Service d'intégration voix/texte
 *
 * Permet la reconnaissance vocale pour la saisie, la synthèse vocale
 * pour les réponses, le contrôle vocal des fonctionnalités,
 * et améliore l'accessibilité.
 */

import { notificationService } from './NotificationService';
import { LanguageCode } from '@/utils/llmConfigStorage';

// Use any type for browser Web Speech APIs to avoid type conflicts
/* eslint-disable @typescript-eslint/no-explicit-any */

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
}

export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  language: LanguageCode;
}

export interface VoiceCommand {
  command: string;
  action: () => void;
  keywords: string[];
  description: string;
}

/**
 * Service d'intégration voix/texte
 */
export class VoiceTextService {
  private static instance: VoiceTextService;

  // APIs du navigateur - using any to avoid type conflicts
  private speechRecognition: any = null;
  private speechSynthesis: any = null;

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

  private constructor() {
    this.settings = this.loadSettings();
    this.initializeAPIs();
    this.setupVoiceCommands();
  }

  static getInstance(): VoiceTextService {
    if (!VoiceTextService.instance) {
      VoiceTextService.instance = new VoiceTextService();
    }
    return VoiceTextService.instance;
  }

  /**
   * Initialise les APIs du navigateur
   */
  private initializeAPIs(): void {
    // Reconnaissance vocale - use any to access browser API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.speechRecognition = new SpeechRecognition();
      this.configureSpeechRecognition();
    }

    // Synthèse vocale
    if ('speechSynthesis' in window) {
      this.speechSynthesis = (window as any).speechSynthesis;
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

    this.speechRecognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript;
      const confidence = result[0].confidence;

      this.recognitionCallbacks?.onResult({
        transcript,
        confidence,
        isFinal: result.isFinal,
        language: this.settings.inputLanguage
      });

      // Vérifier les commandes vocales
      if (result.isFinal) {
        this.processVoiceCommand(transcript);
      }
    };

    this.speechRecognition.onerror = (event: any) => {
      let errorMessage = 'Erreur de reconnaissance vocale';
      const isNetworkError = event.error === 'network';

      switch (event.error) {
        case 'network':
          errorMessage = 'Erreur réseau lors de la reconnaissance vocale';
          console.warn('[VoiceTextService] Network error detected, will retry if possible');
          break;
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
        key: 'Space',
        modifier: 'alt',
        enabled: true
      }
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

    // Reconfigurer la reconnaissance si la langue a changé
    if (settings.inputLanguage) {
      this.configureSpeechRecognition();
    }
  }

  /**
   * Configure les commandes vocales
   */
  private setupVoiceCommands(): void {
    this.voiceCommands = [
      {
        command: 'envoyer',
        action: () => {
          // Simuler l'envoi du message
          const sendButton = document.querySelector('button[aria-label="Send message"]') as HTMLButtonElement;
          sendButton?.click();
        },
        keywords: ['envoyer', 'envoyez', 'send', 'submit'],
        description: 'Envoyer le message actuel'
      },
      {
        command: 'effacer',
        action: () => {
          // Effacer le texte
          const textarea = document.querySelector('textarea[aria-label="Message input"]') as HTMLTextAreaElement;
          if (textarea) {
            textarea.value = '';
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
          }
        },
        keywords: ['effacer', 'clear', 'delete', 'supprimer'],
        description: 'Effacer le texte saisi'
      },
      {
        command: 'suggestions',
        action: () => {
          // Basculer l'affichage des suggestions
          const suggestionsButton = document.querySelector('button[title*="suggestions"]') as HTMLButtonElement;
          suggestionsButton?.click();
        },
        keywords: ['suggestions', 'conseils', 'aide'],
        description: 'Afficher/masquer les suggestions'
      },
      {
        command: 'améliorer',
        action: () => {
          // Déclencher l'amélioration IA
          const enhanceButton = document.querySelector('button[aria-label*="améliorer"]') as HTMLButtonElement;
          enhanceButton?.click();
        },
        keywords: ['améliorer', 'enhance', 'improve'],
        description: 'Améliorer le texte avec IA'
      },
      {
        command: 'parler',
        action: () => {
          // Activer/désactiver la synthèse vocale
          this.settings.autoSpeakResponses = !this.settings.autoSpeakResponses;
          notificationService.info(
            'Synthèse vocale',
            `Synthèse vocale ${this.settings.autoSpeakResponses ? 'activée' : 'désactivée'}`
          );
        },
        keywords: ['parler', 'speak', 'voice', 'talk'],
        description: 'Activer/désactiver la synthèse vocale'
      }
    ];
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
    }
  }

  /**
   * Parle un texte
   */
  speak(text: string, options?: {
    speed?: number;
    pitch?: number;
    volume?: number;
    voice?: any;
  }): boolean {
    if (!this.settings.enabled || !this.speechSynthesis) {
      return false;
    }

    // Arrêter la synthèse en cours
    if (this.isSpeaking) {
      this.speechSynthesis.cancel();
    }

    const utterance = new (window as any).SpeechSynthesisUtterance(text);

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
      const preferredVoice = voices.find((voice: any) =>
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

    utterance.onerror = (event: any) => {
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
  private processVoiceCommand(transcript: string): void {
    const lowerTranscript = transcript.toLowerCase().trim();

    // Vérifier le mot-clé d'activation
    if (this.settings.voiceActivationKeyword &&
        !lowerTranscript.includes(this.settings.voiceActivationKeyword.toLowerCase())) {
      return;
    }

    // Nettoyer le transcript du mot-clé
    let cleanTranscript = lowerTranscript;
    if (this.settings.voiceActivationKeyword) {
      cleanTranscript = cleanTranscript.replace(this.settings.voiceActivationKeyword.toLowerCase(), '').trim();
    }

    // Trouver la commande correspondante
    for (const command of this.voiceCommands) {
      const hasKeyword = command.keywords.some(keyword =>
        cleanTranscript.includes(keyword.toLowerCase())
      );

      if (hasKeyword) {
        notificationService.info(
          'Commande vocale exécutée',
          `"${command.description}"`,
          [
            {
              label: 'Annuler',
              action: () => {}, // Pourrait implémenter un undo
              primary: true
            }
          ]
        );

        command.action();
        return;
      }
    }
  }

  /**
   * Obtient la liste des voix disponibles
   */
  getAvailableVoices(): any[] {
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
   * Teste la reconnaissance vocale
   */
  async testSpeechRecognition(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.speechRecognition) {
        resolve(false);
        return;
      }

      const testCallbacks = {
        onResult: (result: SpeechRecognitionResult) => {
          if (result.isFinal && result.transcript.trim()) {
            notificationService.success(
              'Test réussi',
              `Reconnaissance: "${result.transcript}" (${Math.round(result.confidence * 100)}% de confiance)`
            );
            this.stopListening();
            resolve(true);
          }
        },
        onError: (error: string) => {
          notificationService.error('Test échoué', error);
          resolve(false);
        },
        onStart: () => {
          notificationService.info('Test en cours', 'Parlez maintenant...');
        },
        onEnd: () => {
          resolve(false);
        }
      };

      setTimeout(() => {
        this.stopListening();
        notificationService.warning('Test expiré', 'Aucune parole détectée');
        resolve(false);
      }, 5000);

      this.startListening(testCallbacks);
    });
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

