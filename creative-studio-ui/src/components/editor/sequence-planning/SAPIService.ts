import { DialogueLine, ProductionShot } from '@/types/shot';
import { Vector3D, calculateAudioProperties } from './types';

interface Voice {
  id: string;
  name: string;
  gender: 'male' | 'female';
  language: string;
}

export interface SAPIDialogueGenerator {
  generateDialogue: (
    characterId: string,
    text: string,
    shotPosition: Vector3D,
    surroundMode: '5.1' | '7.1',
    emotionalTone?: DialogueLine['timing']['emotionalTone']
  ) => Promise<DialogueLine>;
  updateSpatialization: (
    dialogue: DialogueLine,
    newPosition: Vector3D,
    surroundMode: '5.1' | '7.1'
  ) => DialogueLine;
  generateBulkDialogues: (
    shot: ProductionShot,
    surroundMode: '5.1' | '7.1'
  ) => Promise<DialogueLine[]>;
}

export class SAPIService implements SAPIDialogueGenerator {
  private voices: Voice[] = [
    // Anglais
    { id: 'Microsoft-Zira', name: 'Zira', gender: 'female', language: 'en-US' },
    { id: 'Microsoft-David', name: 'David', gender: 'male', language: 'en-US' },
    { id: 'Microsoft-Mark', name: 'Mark', gender: 'male', language: 'en-US' },
    { id: 'Microsoft-Hazel', name: 'Hazel', gender: 'female', language: 'en-GB' },
    
    // Espagnol
    { id: 'Microsoft-Helena', name: 'Helena', gender: 'female', language: 'es-ES' },
    { id: 'Microsoft-Raul', name: 'Raul', gender: 'male', language: 'es-ES' },
    
    // Français
    { id: 'Microsoft-Hortense', name: 'Hortense', gender: 'female', language: 'fr-FR' },
    { id: 'Microsoft-Paul', name: 'Paul', gender: 'male', language: 'fr-FR' },
    
    // Italien
    { id: 'Microsoft-Elsa', name: 'Elsa', gender: 'female', language: 'it-IT' },
    { id: 'Microsoft-Cosimo', name: 'Cosimo', gender: 'male', language: 'it-IT' },
    
    // Allemand
    { id: 'Microsoft-Katja', name: 'Katja', gender: 'female', language: 'de-DE' },
    { id: 'Microsoft-Stefan', name: 'Stefan', gender: 'male', language: 'de-DE' },
    
    // Japonais
    { id: 'Microsoft-Haruka', name: 'Haruka', gender: 'female', language: 'ja-JP' },
    { id: 'Microsoft-Ichiro', name: 'Ichiro', gender: 'male', language: 'ja-JP' },
    
    // Coréen
    { id: 'Microsoft-Heami', name: 'Heami', gender: 'female', language: 'ko-KR' },
    { id: 'Microsoft-Zira', name: 'Zira', gender: 'male', language: 'ko-KR' },
    
    // Mandarin
    { id: 'Microsoft-Huihui', name: 'Huihui', gender: 'female', language: 'zh-CN' },
    { id: 'Microsoft-Kangkang', name: 'Kangkang', gender: 'male', language: 'zh-CN' }
  ];

  async generateDialogue(
    characterId: string,
    text: string,
    shotPosition: Vector3D,
    surroundMode: '5.1' | '7.1' = '5.1',
    emotionalTone: DialogueLine['timing']['emotionalTone'] = 'neutral'
  ): Promise<DialogueLine> {
    // Calcul de la spatialisation basée sur la position du shot
    const spatialAudio = calculateAudioProperties(shotPosition, surroundMode);

    // Sélection de la voix basée sur le personnage (simulé)
    const voice = this.selectVoiceForCharacter(characterId);

    // Calcul du timing basé sur le texte
    const estimatedDuration = this.estimateSpeechDuration(text, emotionalTone);

    // Paramètres SAPI ajustés selon l'émotion
    const sapiParams = this.generateSAPIParameters(voice.id, emotionalTone);

    const dialogue: DialogueLine = {
      id: `dialogue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      characterId,
      text,
      timing: {
        startTime: 0, // À définir selon le contexte du shot
        duration: estimatedDuration,
        emotionalTone
      },
      audio: {
        voiceId: voice.id,
        pitch: this.getPitchForEmotion(emotionalTone),
        speed: this.getSpeedForEmotion(emotionalTone),
        volume: spatialAudio.volume || 0.8,
        spatialization: {
          enabled: true,
          speakerAssignment: spatialAudio.speakerAssignment || 'front-center',
          reverb: spatialAudio.reverb || 0.2,
          delay: spatialAudio.delay || 0
        }
      },
      sapiGenerated: true,
      sapiParameters: sapiParams
    };

    return dialogue;
  }

  updateSpatialization(
    dialogue: DialogueLine,
    newPosition: Vector3D,
    surroundMode: '5.1' | '7.1' = '5.1'
  ): DialogueLine {
    const spatialAudio = calculateAudioProperties(newPosition, surroundMode);

    return {
      ...dialogue,
      audio: {
        ...dialogue.audio,
        volume: spatialAudio.volume || dialogue.audio.volume,
        spatialization: {
          ...dialogue.audio.spatialization,
          speakerAssignment: spatialAudio.speakerAssignment || dialogue.audio.spatialization.speakerAssignment,
          reverb: spatialAudio.reverb || dialogue.audio.spatialization.reverb,
          delay: spatialAudio.delay || dialogue.audio.spatialization.delay
        }
      }
    };
  }

  async generateBulkDialogues(
    shot: ProductionShot,
    surroundMode: '5.1' | '7.1' = '5.1'
  ): Promise<DialogueLine[]> {
    const dialogues: DialogueLine[] = [];

    // Position spatiale du shot (simulée pour l'instant)
    const shotPosition: Vector3D = {
      x: Math.random() * 10 - 5, // -5 à 5
      y: 0,
      z: Math.random() * 10 - 5  // -5 à 5
    };

    // Générer des dialogues pour chaque personnage dans le shot
    for (const characterId of shot.composition.characterIds) {
      // Texte de dialogue simulé (dans un vrai système, cela viendrait d'un prompt IA)
      const sampleTexts = [
        "Hello, how are you today?",
        "I think we should go this way.",
        "Did you hear that noise?",
        "This place gives me the creeps.",
        "Let's stick together, okay?"
      ];

      const randomText = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];

      const dialogue = await this.generateDialogue(
        characterId,
        randomText,
        shotPosition,
        surroundMode,
        this.getRandomEmotion()
      );

      dialogues.push(dialogue);
    }

    return dialogues;
  }

  private selectVoiceForCharacter(characterId: string) {
    // Améliorer la sélection de voix basée sur l'ID du personnage
    // Utiliser un hash plus sophistiqué pour une meilleure distribution
    let hash = 0;
    for (let i = 0; i < characterId.length; i++) {
      const char = characterId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir en entier 32 bits
    }
    
    // Assurer un index positif
    const voiceIndex = Math.abs(hash) % this.voices.length;
    return this.voices[voiceIndex];
  }

  private estimateSpeechDuration(text: string, emotion: DialogueLine['timing']['emotionalTone']): number {
    // Estimation simple : ~150 mots par minute
    const wordsPerMinute = 150;
    const wordCount = text.split(' ').length;
    const baseDuration = (wordCount / wordsPerMinute) * 60;

    // Ajustement selon l'émotion
    const emotionMultiplier = {
      neutral: 1.0,
      happy: 1.1,
      sad: 0.9,
      angry: 1.2,
      excited: 1.3,
      calm: 0.8,
      surprised: 1.1
    };

    return baseDuration * emotionMultiplier[emotion];
  }

  private generateSAPIParameters(voiceId: string, emotion: DialogueLine['timing']['emotionalTone']) {
    const baseParams = {
      voice: voiceId,
      rate: 0,
      volume: 80,
      emphasis: [] as string[]
    };

    // Ajustements selon l'émotion
    switch (emotion) {
      case 'happy':
        baseParams.rate = 2;
        baseParams.emphasis = ['pitch', 'volume'];
        break;
      case 'sad':
        baseParams.rate = -2;
        baseParams.volume = 60;
        baseParams.emphasis = ['pitch-down'];
        break;
      case 'angry':
        baseParams.rate = 3;
        baseParams.volume = 90;
        baseParams.emphasis = ['volume', 'pitch'];
        break;
      case 'excited':
        baseParams.rate = 4;
        baseParams.volume = 85;
        baseParams.emphasis = ['pitch', 'rate'];
        break;
      case 'calm':
        baseParams.rate = -1;
        baseParams.volume = 70;
        baseParams.emphasis = ['smooth'];
        break;
      case 'surprised':
        baseParams.rate = 1;
        baseParams.emphasis = ['pitch-up', 'volume'];
        break;
    }

    return baseParams;
  }

  private getPitchForEmotion(emotion: DialogueLine['timing']['emotionalTone']): number {
    const pitchMap = {
      neutral: 1.0,
      happy: 1.1,
      sad: 0.9,
      angry: 1.2,
      excited: 1.15,
      calm: 0.95,
      surprised: 1.3
    };
    return pitchMap[emotion];
  }

  private getSpeedForEmotion(emotion: DialogueLine['timing']['emotionalTone']): number {
    const speedMap = {
      neutral: 1.0,
      happy: 1.1,
      sad: 0.9,
      angry: 1.2,
      excited: 1.3,
      calm: 0.8,
      surprised: 1.1
    };
    return speedMap[emotion];
  }

  private getRandomEmotion(): DialogueLine['timing']['emotionalTone'] {
    const emotions: DialogueLine['timing']['emotionalTone'][] =
      ['neutral', 'happy', 'sad', 'angry', 'excited', 'calm', 'surprised'];
    return emotions[Math.floor(Math.random() * emotions.length)];
  }

  // Méthode utilitaire pour obtenir les voix disponibles par langue
  getVoicesByLanguage(languageCode: string) {
    return this.voices.filter(voice => voice.language === languageCode);
  }

  // Méthode utilitaire pour obtenir toutes les langues disponibles
  getAvailableLanguages() {
    const languageSet = new Set(this.voices.map(voice => voice.language));
    const languages: string[] = [];
    languageSet.forEach(lang => languages.push(lang));
    return languages.sort();
  }

  // Méthode pour sélectionner une voix spécifique par langue et genre
  selectVoiceByLanguageAndGender(languageCode: string, gender: 'male' | 'female'): Voice | null {
    const voicesForLanguage = this.voices.filter(voice => 
      voice.language === languageCode && voice.gender === gender
    );
    
    if (voicesForLanguage.length === 0) {
      // Fallback: retourner une voix de la langue demandée, peu importe le genre
      const anyVoiceForLanguage = this.voices.filter(voice => voice.language === languageCode);
      return anyVoiceForLanguage.length > 0 ? anyVoiceForLanguage[0] : null;
    }
    
    // Retourner la première voix trouvée
    return voicesForLanguage[0];
  }

  // Méthode pour obtenir des statistiques sur les voix disponibles
  getVoiceStatistics() {
    const stats = {
      totalVoices: this.voices.length,
      languages: {} as Record<string, { male: number; female: number; total: number }>,
      genders: { male: 0, female: 0 }
    };

    this.voices.forEach(voice => {
      // Statistiques par langue
      if (!stats.languages[voice.language]) {
        stats.languages[voice.language] = { male: 0, female: 0, total: 0 };
      }
      stats.languages[voice.language][voice.gender]++;
      stats.languages[voice.language].total++;

      // Statistiques par genre
      stats.genders[voice.gender]++;
    });

    return stats;
  }

  // Méthode pour valider si une voix est disponible
  isVoiceAvailable(voiceId: string): boolean {
    return this.voices.some(voice => voice.id === voiceId);
  }

  // Méthode pour obtenir une voix par son ID
  getVoiceById(voiceId: string): Voice | null {
    return this.voices.find(voice => voice.id === voiceId) || null;
  }
}

// Instance globale du service SAPI
export const sapiService = new SAPIService();