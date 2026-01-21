/**
 * VoiceTextService - Service d'intégration voix/texte
 *
 * Permet la reconnaissance vocale pour la saisie, la synthèse vocale
 * pour les réponses, le contrôle vocal des fonctionnalités,
 * et améliore l'accessibilité.
 */

import { notificationService } from './NotificationService';
import { LanguageCode } from '@/utils/llmConfigStorage';

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

  // APIs du navigateur
  private speechRecognition: SpeechRecognition | null = null;
  private speechSynthesis: SpeechSynthesis | null = null;

  // État du service
  private settings: VoiceSettings;
  private isListening = false;
  private isSpeaking = false;
  private recognitionCallbacks: {
    onResult: (result: SpeechRecognitionResult) => void;
    onError: (error: string) => void;
    onStart: () => void;
    onEnd: () => void;
  } | null = null;

  // Commandes vocales
  private voiceCommands: VoiceCommand[] = [];

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
    // Reconnaissance vocale
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.speechRecognition = new SpeechRecognition();
      this.configureSpeechRecognition();
    }

    // Synthèse vocale
    if ('speechSynthesis' in window) {
      this.speechSynthesis = window.speechSynthesis;
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

    this.speechRecognition.onresult = (event) => {
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

    this.speechRecognition.onerror = (event) => {
      this.isListening = false;
      let errorMessage = 'Erreur de reconnaissance vocale';

      switch (event.error) {
        case 'network':
          errorMessage = 'Erreur réseau lors de la reconnaissance vocale';
          break;
        case 'not-allowed':
          errorMessage = 'Permission micro refusée';
          break;
        case 'no-speech':
          errorMessage = 'Aucune parole détectée';
          break;
        case 'aborted':
          errorMessage = 'Reconnaissance vocale interrompue';
          break;
      }

      this.recognitionCallbacks?.onError(errorMessage);
    };

    this.speechRecognition.onend = () => {
      this.isListening = false;
      this.recognitionCallbacks?.onEnd();
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
      continuousListening: false
    };

    try {
      const stored = localStorage.getItem('voice-settings');
      return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
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
    onEnd: () => void;
  }): boolean {
    if (!this.settings.enabled || !this.speechRecognition) {
      callbacks.onError('Reconnaissance vocale non disponible');
      return false;
    }

    if (this.isListening) {
      this.stopListening();
    }

    this.recognitionCallbacks = callbacks;

    try {
      this.speechRecognition.start();
      return true;
    } catch (error) {
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
    voice?: SpeechSynthesisVoice;
  }): boolean {
    if (!this.settings.enabled || !this.speechSynthesis) {
      return false;
    }

    // Arrêter la synthèse en cours
    if (this.isSpeaking) {
      this.speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);

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
      const preferredVoice = voices.find(voice =>
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

    utterance.onerror = (event) => {
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
  getAvailableVoices(): SpeechSynthesisVoice[] {
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