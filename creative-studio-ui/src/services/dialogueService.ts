/**
 * Dialogue Service - Advanced Dialogue Generation and Audio Processing
 *
 * This service integrates:
 * - LLM APIs for dialogue generation
 * - SAPI (Speech API) for text-to-speech
 * - Audio recording and processing
 * - Prompt generation for images/videos
 */

import { getLLMService } from '../services/llmService';

export interface Character {
  id: string;
  name: string;
  voiceProfile: string;
  personality: string[];
  age?: string;
  gender?: string;
}

export interface DialogueLine {
  id: string;
  character: string;
  text: string;
  emotionalState: string;
  audioGenerated?: boolean;
  audioPath?: string;
  recordedAudio?: Blob;
  sapiGenerated?: boolean;
  imagePrompt?: string;
  videoPrompt?: string;
  timestamp?: number;
}

export interface DialogueScene {
  id: string;
  title: string;
  characters: Character[];
  lines: DialogueLine[];
  genre?: string;
  tone?: string;
  setting?: string;
}

export class DialogueService {
  private static instance: DialogueService;
  private llmService = getLLMService();

  private constructor() {}

  static getInstance(): DialogueService {
    if (!DialogueService.instance) {
      DialogueService.instance = new DialogueService();
    }
    return DialogueService.instance;
  }

  /**
   * Generate dialogues using LLM based on characters and context
   */
  async generateDialogues(
    characters: Character[],
    context: {
      genre?: string;
      tone?: string;
      setting?: string;
      topic?: string;
      length?: 'short' | 'medium' | 'long';
    } = {}
  ): Promise<DialogueLine[]> {
    try {
      const prompt = this.buildDialoguePrompt(characters, context);

      const response = await this.llmService.generateText(prompt, {
        temperature: 0.8,
        maxTokens: 1000,
        model: 'gpt-4'
      } as { temperature?: number; maxTokens?: number; model?: string; });

      return this.parseDialogueResponse(response, characters);
    } catch (error) {
      console.error('Erreur lors de la génération des dialogues:', error);
      throw new Error('Impossible de générer les dialogues');
    }
  }

  /**
   * Generate audio using SAPI (Speech API)
   */
  async generateAudioWithSAPI(
    text: string,
    character: Character,
    options: {
      emotionalState?: string;
      speed?: number;
      pitch?: number;
    } = {}
  ): Promise<Blob> {
    try {
      console.log(`Génération audio SAPI pour "${text}" avec la voix ${character.voiceProfile}`);

      // Use real SAPI service instead of simulation
      return await this.callSAPIService(text, character, options);
    } catch (error) {
      console.error('Erreur lors de la génération SAPI:', error);
      throw new Error('Impossible de générer l\'audio avec SAPI');
    }
  }

  /**
   * Generate image prompt based on dialogue line
   */
  async generateImagePrompt(
    dialogueText: string,
    character: Character,
    emotionalState: string,
    context?: string
  ): Promise<string> {
    try {
      const prompt = `Génère un prompt détaillé pour une image représentant cette scène de dialogue:

Personnage: ${character.name} (${character.personality.join(', ')})
Dialogue: "${dialogueText}"
État émotionnel: ${emotionalState}
${context ? `Contexte: ${context}` : ''}

Le prompt doit être en anglais et inclure:
- Description visuelle détaillée du personnage et de son expression
- Environnement et éclairage appropriés
- Style artistique cinématographique
- Composition et angle de caméra
- Détails techniques pour la génération d'image IA

Format: Prompt complet prêt pour DALL-E, Midjourney ou Stable Diffusion.`;

      const response = await this.llmService.generateText(prompt, {
        temperature: 0.7,
        maxTokens: 300
      });

      return response.trim();
    } catch (error) {
      console.error('Erreur lors de la génération du prompt image:', error);
      throw new Error('Impossible de générer le prompt image');
    }
  }

  /**
   * Generate video prompt based on dialogue line
   */
  async generateVideoPrompt(
    dialogueText: string,
    character: Character,
    emotionalState: string,
    context?: string
  ): Promise<string> {
    try {
      const prompt = `Génère un prompt détaillé pour une vidéo courte représentant cette scène de dialogue:

Personnage: ${character.name} (${character.personality.join(', ')})
Dialogue: "${dialogueText}"
État émotionnel: ${emotionalState}
${context ? `Contexte: ${context}` : ''}

La vidéo doit durer 3-5 secondes et inclure:
- Mouvement de caméra dynamique (gros plan, travelling léger)
- Évolution de l'expression faciale pendant le dialogue
- Transitions fluides et naturelles
- Ambiance et timing appropriés
- Style cinématographique professionnel

Format: Description complète de séquence vidéo pour génération IA.`;

      const response = await this.llmService.generateText(prompt, {
        temperature: 0.7,
        maxTokens: 400
      });

      return response.trim();
    } catch (error) {
      console.error('Erreur lors de la génération du prompt vidéo:', error);
      throw new Error('Impossible de générer le prompt vidéo');
    }
  }

  /**
   * Build dialogue generation prompt
   */
  private buildDialoguePrompt(characters: Character[], context: unknown): string {
    const characterDescriptions = characters.map(char =>
      `${char.name}: ${char.personality.join(', ')} (${char.age || 'âge inconnu'}, ${char.gender || 'genre inconnu'})`
    ).join('\n');

    return `Génère un dialogue naturel et engageant entre ces personnages:

${characterDescriptions}

${context.genre ? `Genre: ${context.genre}` : ''}
${context.tone ? `Ton: ${context.tone}` : ''}
${context.setting ? `Décor: ${context.setting}` : ''}
${context.topic ? `Sujet: ${context.topic}` : ''}

Le dialogue doit être:
- Naturel et conversationnel
- Cohérent avec la personnalité de chaque personnage
- En français
- Approprié au contexte

Format JSON:
{
  "dialogues": [
    {
      "character": "nom_du_personnage",
      "text": "texte_du_dialogue",
      "emotionalState": "état_émotionnel"
    }
  ]
}

Génère ${context.length === 'long' ? '8-12' : context.length === 'medium' ? '4-6' : '2-4'} lignes de dialogue.`;
  }

  /**
   * Parse LLM response into dialogue lines
   */
  private parseDialogueResponse(response: string, characters: Character[]): DialogueLine[] {
    try {
      // Essayer de parser le JSON
      const parsed = JSON.parse(response);

      if (parsed.dialogues && Array.isArray(parsed.dialogues)) {
        return parsed.dialogues.map((line: unknown, index: number) => ({
          id: `dialogue_${Date.now()}_${index}`,
          character: line.character,
          text: line.text,
          emotionalState: line.emotionalState || 'neutral',
          timestamp: Date.now() + index * 1000
        }));
      }

      throw new Error('Format de réponse invalide');
    } catch (error) {
      // Fallback: essayer d'extraire manuellement
      console.warn('Erreur de parsing JSON, tentative d\'extraction manuelle');
      return this.extractDialoguesFromText(response, characters);
    }
  }

  /**
   * Extract dialogues from plain text response
   */
  private extractDialoguesFromText(text: string, characters: Character[]): DialogueLine[] {
    const lines: DialogueLine[] = [];
    const characterNames = characters.map(c => c.name);

    // Simple extraction basée sur les noms de personnages
    const dialoguePattern = new RegExp(`(${characterNames.join('|')}):\\s*([^\\n]+)`, 'gi');
    let match;
    let index = 0;

    while ((match = dialoguePattern.exec(text)) !== null) {
      const character = match[1];
      const dialogueText = match[2].trim();

      lines.push({
        id: `dialogue_${Date.now()}_${index}`,
        character,
        text: dialogueText,
        emotionalState: 'neutral',
        timestamp: Date.now() + index * 1000
      });

      index++;
    }

    return lines;
  }

  /**
   * Build SAPI command for text-to-speech
   */
  private buildSAPICommand(text: string, character: Character, options: unknown): string {
    // Simulation de commande SAPI
    // En production, utiliser l'API Windows SAPI ou un service TTS
    return `SAPI-Speak -Text "${text}" -Voice "${character.voiceProfile}" -Rate ${options.speed || 0} -Pitch ${options.pitch || 0}`;
  }

  /**
   * Simulate SAPI API call
   */
  private async simulateSAPICall(command: string): Promise<void> {
    // Simulation d'un appel à SAPI
    console.log('Exécution commande SAPI:', command);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simuler délai
  }

  /**
   * Call real SAPI service at 192.168.1.47:3000
   */
  private async callSAPIService(text: string, character: Character, options: unknown): Promise<Blob> {
    try {
      const sapiUrl = 'http://192.168.1.47:3000/api/sapi/generate';

      const response = await fetch(sapiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          voice: character.voiceProfile,
          emotionalState: options.emotionalState || 'neutral',
          speed: options.speed || 0,
          pitch: options.pitch || 0,
          personality: character.personality,
          age: character.age,
          gender: character.gender
        })
      });

      if (!response.ok) {
        throw new Error(`SAPI service error: ${response.status} ${response.statusText}`);
      }

      const audioBlob = await response.blob();
      return audioBlob;
    } catch (error) {
      console.error('Erreur lors de l\'appel au service SAPI:', error);
      // Fallback to simulation if service is unavailable
      console.log('Fallback vers simulation SAPI');
      await this.simulateSAPICall(this.buildSAPICommand(text, character, options));
      return this.createMockAudioBlob(text);
    }
  }

  /**
   * Create mock audio blob for testing
   */
  private createMockAudioBlob(text: string): Blob {
    // Créer un blob audio simulé
    // En production, retourner le vrai audio généré par SAPI
    const audioContext = new AudioContext();
    const duration = Math.max(text.length * 0.1, 2); // Durée basée sur la longueur du texte

    // Créer un buffer audio simple (ton sine)
    const sampleRate = audioContext.sampleRate;
    const numSamples = sampleRate * duration;
    const buffer = audioContext.createBuffer(1, numSamples, sampleRate);
    const channelData = buffer.getChannelData(0);

    // Générer un ton simple
    for (let i = 0; i < numSamples; i++) {
      channelData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.1; // 440Hz sine wave
    }

    // Convertir en WAV blob
    return this.audioBufferToWav(buffer);
  }

  /**
   * Convert AudioBuffer to WAV Blob
   */
  private audioBufferToWav(buffer: AudioBuffer): Blob {
    const length = buffer.length;
    const sampleRate = buffer.sampleRate;
    const numChannels = buffer.numberOfChannels;

    // Créer le buffer WAV
    const arrayBuffer = new ArrayBuffer(44 + length * numChannels * 2);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numChannels * 2, true);

    // Audio data
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  /**
   * Get audio duration from blob
   */
  private async getAudioDuration(audioBlob: Blob): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio(URL.createObjectURL(audioBlob));
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration);
      });
      audio.addEventListener('error', () => {
        resolve(0); // Fallback
      });
    });
  }

  /**
   * Start audio recording from microphone
   */
  async startAudioRecording(): Promise<MediaRecorder> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Cleanup stream
        stream.getTracks().forEach(track => track.stop());
      };

      // Store chunks for later retrieval
      (mediaRecorder as any).audioChunks = audioChunks;

      mediaRecorder.start(100); // Collect data every 100ms
      return mediaRecorder;
    } catch (error) {
      console.error('Erreur lors du démarrage de l\'enregistrement:', error);
      throw new Error('Impossible d\'accéder au microphone');
    }
  }

  /**
   * Stop audio recording and return audio blob
   */
  async stopAudioRecording(mediaRecorder: MediaRecorder): Promise<Blob> {
    return new Promise((resolve, reject) => {
      mediaRecorder.onstop = () => {
        const audioChunks = (mediaRecorder as any).audioChunks || [];
        if (audioChunks.length === 0) {
          reject(new Error('Aucun audio enregistré'));
          return;
        }

        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        resolve(audioBlob);

        // Cleanup stream
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.stop();
    });
  }

  /**
   * Process recorded audio and extract dialogue features
   */
  async processRecordedAudio(audioBlob: Blob): Promise<{
    duration: number;
    transcription?: string;
    emotionalTone?: string;
    voiceCharacteristics?: unknown;
  }> {
    try {
      const duration = await this.getAudioDuration(audioBlob);

      // Send audio to SAPI service for analysis
      const analysisResult = await this.analyzeAudioWithSAPI(audioBlob);

      return {
        duration,
        transcription: analysisResult.transcription,
        emotionalTone: analysisResult.emotionalTone,
        voiceCharacteristics: analysisResult.voiceCharacteristics
      };
    } catch (error) {
      console.error('Erreur lors du traitement de l\'audio:', error);
      // Fallback to basic duration only
      const duration = await this.getAudioDuration(audioBlob);
      return { duration };
    }
  }

  /**
   * Analyze audio using SAPI service for transcription and voice analysis
   */
  private async analyzeAudioWithSAPI(audioBlob: Blob): Promise<{
    transcription?: string;
    emotionalTone?: string;
    voiceCharacteristics?: unknown;
  }> {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch('http://192.168.1.47:3000/api/sapi/analyze', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`SAPI analysis error: ${response.status}`);
      }

      const result = await response.json();
      return {
        transcription: result.transcription,
        emotionalTone: result.emotional_tone,
        voiceCharacteristics: result.voice_characteristics
      };
    } catch (error) {
      console.error('Erreur lors de l\'analyse SAPI:', error);
      return {}; // Return empty result on error
    }
  }

  /**
   * Generate dialogue from recorded audio using LLM
   */
  async generateDialogueFromAudio(
    audioBlob: Blob,
    character: Character,
    context?: string
  ): Promise<DialogueLine> {
    try {
      // First analyze the audio
      const audioAnalysis = await this.processRecordedAudio(audioBlob);

      // Generate dialogue text using LLM based on transcription
      let dialogueText = audioAnalysis.transcription || 'Audio non transcrit';

      if (audioAnalysis.transcription) {
        // Enhance the transcription with LLM for better dialogue
        const enhancementPrompt = `Améliore cette transcription audio en dialogue naturel pour un personnage:

Personnage: ${character.name} (${character.personality.join(', ')})
Transcription brute: "${audioAnalysis.transcription}"
${context ? `Contexte: ${context}` : ''}

Rends le dialogue plus naturel, corrige les erreurs de transcription, et adapte-le au style du personnage. Garde la même signification mais améliore la fluidité.`;

        dialogueText = await this.llmService.generateText(enhancementPrompt, {
          temperature: 0.3,
          maxTokens: 200
        });
      }

      // Determine emotional state from audio analysis
      const emotionalState = audioAnalysis.emotionalTone || 'neutral';

      return {
        id: `recorded_${Date.now()}`,
        character: character.name,
        text: dialogueText.trim(),
        emotionalState,
        recordedAudio: audioBlob,
        audioGenerated: true,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Erreur lors de la génération de dialogue depuis audio:', error);
      throw new Error('Impossible de générer le dialogue depuis l\'audio');
    }
  }
}

export const dialogueService = DialogueService.getInstance();

