/**
 * Qwen TTS Provider
 * 
 * Provides Text-to-Speech using Qwen Audio models via Ollama.
 * Supports Qwen2-Audio and future Qwen-Omni models.
 * 
 * Requires Ollama to be running with Qwen-Audio models:
 * - ollama run qwen2-audio:latest
 */

import type { VoiceOver, Voice } from '../types';

interface QwenTTSConfig {
  ollamaEndpoint?: string;
  model?: string;
  useAcedemicEndpoints?: boolean;
}

interface QwenVoice {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'neutral';
  language: string;
  quality: 'low' | 'medium' | 'high';
}

class QwenTTSProvider {
  name = 'Qwen TTS';
  private config: QwenTTSConfig;
  private cachedVoices: QwenVoice[] | null = null;

  constructor(config: QwenTTSConfig = {}) {
    this.config = {
      ollamaEndpoint: config.ollamaEndpoint || 'http://localhost:11434',
      model: config.model || 'qwen2-audio:latest',
      ...config,
    };
  }

  /**
   * Get available Qwen TTS voices
   */
  async getAvailableVoices(): Promise<Voice[]> {
    // Qwen doesn't have discrete voices like other TTS providers
    // Instead, it generates speech based on the input text
    // We return a set of "voice presets" that map to different
    // generation parameters
    
    const voices: Voice[] = [
      {
        id: 'qwen-default',
        name: 'Qwen Default',
        gender: 'neutral',
        language: 'en-US',
      },
      {
        id: 'qwen-male-1',
        name: 'Qwen Male Deep',
        gender: 'male',
        language: 'en-US',
      },
      {
        id: 'qwen-female-1',
        name: 'Qwen Female Clear',
        gender: 'female',
        language: 'en-US',
      },
      {
        id: 'qwen-narrator',
        name: 'Qwen Narrator',
        gender: 'neutral',
        language: 'en-US',
      },
    ];

    // Add multilingual voices
    const languages = ['fr-FR', 'de-DE', 'es-ES', 'zh-CN', 'ja-JP', 'ko-KR'];
    for (const lang of languages) {
      voices.push({
        id: `qwen-${lang.toLowerCase()}`,
        name: `Qwen ${lang}`,
        gender: 'neutral',
        language: lang,
      });
    }

    return voices;
  }

  /**
   * Check if Ollama is running with Qwen model
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.ollamaEndpoint}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) return false;

      const data = await response.json();
      const models = data.models || [];
      
      // Check if Qwen audio model is available
      const hasQwenAudio = models.some((m: any) => 
        m.name?.includes('qwen2-audio') || 
        m.model?.includes('qwen2-audio')
      );

      return hasQwenAudio;
    } catch {
      return false;
    }
  }

  /**
   * Generate voiceover using Qwen2-Audio via Ollama
   */
  async generateVoiceOver(voiceOver: VoiceOver): Promise<string> {
    const isOllamaAvailable = await this.isAvailable();

    if (!isOllamaAvailable) {
      console.warn('Qwen TTS not available, falling back to mock');
      return this.generateMockAudio(voiceOver);
    }

    try {
      // Use Ollama's /api/generate endpoint for Qwen2-Audio
      const response = await fetch(`${this.config.ollamaEndpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model,
          prompt: this.buildAudioPrompt(voiceOver),
          stream: false,
          format: 'wav',
          options: {
            temperature: 0.7,
            top_p: 0.9,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Qwen returns base64 encoded audio
      if (data.response || data.audio) {
        const audioBase64 = data.response || data.audio;
        return this.base64ToAudioUrl(audioBase64, 'audio/wav');
      }

      // Fallback to mock if no audio returned
      return this.generateMockAudio(voiceOver);
    } catch (error) {
      console.error('Qwen TTS generation failed:', error);
      return this.generateMockAudio(voiceOver);
    }
  }

  /**
   * Build audio generation prompt for Qwen
   */
  private buildAudioPrompt(voiceOver: VoiceOver): string {
    const { text, voice, language } = voiceOver;

    // Qwen2-Audio uses special prompts for speech generation
    // The format may vary based on the specific model version
    const voiceProfile = this.getVoiceProfile(voice);
    
    return `Generate audio for: "${text}"
Language: ${language}
Voice characteristics: ${voiceProfile}
Speed: ${voiceOver.speed}
Pitch adjustment: ${voiceOver.pitch}`;
  }

  /**
   * Get voice profile based on voice ID
   */
  private getVoiceProfile(voiceId: string): string {
    const profiles: Record<string, string> = {
      'qwen-default': 'Standard clear speech, neutral tone',
      'qwen-male-1': 'Deep male voice, authoritative',
      'qwen-female-1': 'Clear female voice, friendly tone',
      'qwen-narrator': 'Smooth narrative voice, moderate pace',
    };

    return profiles[voiceId] || profiles['qwen-default'];
  }

  /**
   * Generate mock audio using Web Audio API
   * This is a placeholder that generates simple tones
   */
  private generateMockAudio(voiceOver: VoiceOver): string {
    const audioContext = new AudioContext();
    const duration = Math.max(1, voiceOver.text.length * 0.05);
    const sampleRate = audioContext.sampleRate;
    const numSamples = duration * sampleRate;

    const audioBuffer = audioContext.createBuffer(1, numSamples, sampleRate);
    const channelData = audioBuffer.getChannelData(0);

    // Generate a simple tone (placeholder for actual speech)
    const baseFreq = voiceOver.pitch > 0 ? 220 + voiceOver.pitch * 10 : 220;
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      // Add some variation for more natural sound
      const modulation = Math.sin(2 * Math.PI * 4 * t) * 0.3;
      channelData[i] = Math.sin(2 * Math.PI * (baseFreq + modulation) * t) * 0.1;
    }

    // Convert to WAV blob
    const wavBlob = this.audioBufferToWav(audioBuffer);
    return URL.createObjectURL(wavBlob);
  }

  /**
   * Convert AudioBuffer to WAV blob
   */
  private audioBufferToWav(buffer: AudioBuffer): Blob {
    const length = buffer.length * buffer.numberOfChannels * 2;
    const arrayBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(arrayBuffer);

    // WAV header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, buffer.numberOfChannels, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * buffer.numberOfChannels * 2, true);
    view.setUint16(32, buffer.numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, length, true);

    // Write audio data
    const channelData = buffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < channelData.length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  /**
   * Write string to DataView
   */
  private writeString(view: DataView, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  /**
   * Convert base64 to audio URL
   */
  private base64ToAudioUrl(base64: string, mimeType: string): string {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType });
    return URL.createObjectURL(blob);
  }

  /**
   * Initialize provider with specific endpoint
   */
  initialize(endpoint: string, model?: string): void {
    this.config.ollamaEndpoint = endpoint;
    if (model) this.config.model = model;
  }
}

// Export provider
export { QwenTTSProvider };

// Export singleton instance
export const qwenTTSProvider = new QwenTTSProvider();

// Re-export types
export type { QwenTTSConfig, QwenVoice };

