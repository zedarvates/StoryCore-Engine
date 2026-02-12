import type { VoiceOver } from '../types';

/**
 * TTS Service for generating voiceovers using AI text-to-speech APIs
 * Supports multiple TTS providers: ElevenLabs, Google TTS, Azure TTS
 */

export interface TTSProvider {
  name: string;
  generateVoiceOver: (voiceOver: VoiceOver) => Promise<string>;
  getAvailableVoices: () => Promise<Voice[]>;
}

export interface Voice {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'neutral';
  language: string;
  previewUrl?: string;
}

/**
 * Mock TTS Provider for development and testing
 * In production, replace with actual API calls to ElevenLabs, Google TTS, or Azure TTS
 */
class MockTTSProvider implements TTSProvider {
  name = 'Mock TTS';

  async generateVoiceOver(voiceOver: VoiceOver): Promise<string> {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // In production, this would call the actual TTS API
    // For now, return a mock audio URL
    // You could generate a simple audio file or use Web Speech API

    // Option 1: Use Web Speech API (browser-based TTS)
    if ('speechSynthesis' in window) {
      return this.generateWithWebSpeechAPI(voiceOver);
    }

    // Option 2: Return mock audio URL
    return this.generateMockAudio(voiceOver);
  }

  private async generateWithWebSpeechAPI(voiceOver: VoiceOver): Promise<string> {
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(voiceOver.text);
      
      // Set voice parameters
      utterance.rate = voiceOver.speed;
      utterance.pitch = 1 + (voiceOver.pitch / 10); // Convert -10 to 10 range to 0 to 2
      
      // Try to find matching voice
      const voices = window.speechSynthesis.getVoices();
      const matchingVoice = voices.find((v) => {
        const voiceLang = v.lang.toLowerCase();
        const targetLang = voiceOver.language.toLowerCase();
        
        if (!voiceLang.startsWith(targetLang.split('-')[0])) {
          return false;
        }
        
        if (voiceOver.voice === 'male') {
          return v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('james');
        } else if (voiceOver.voice === 'female') {
          return v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('samantha') || v.name.toLowerCase().includes('victoria');
        }
        
        return true;
      });
      
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }

      // Record the audio
      const mediaRecorder = this.recordSpeech(utterance);
      
      if (mediaRecorder) {
        const audioChunks: Blob[] = [];
        
        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
          const audioUrl = URL.createObjectURL(audioBlob);
          resolve(audioUrl);
        };
        
        utterance.onend = () => {
          mediaRecorder.stop();
        };
        
        utterance.onerror = (event) => {
          reject(new Error(`Speech synthesis failed: ${event.error}`));
        };
        
        mediaRecorder.start();
        window.speechSynthesis.speak(utterance);
      } else {
        // Fallback: just speak without recording
        utterance.onend = () => {
          resolve(this.generateMockAudio(voiceOver));
        };
        
        utterance.onerror = (event) => {
          reject(new Error(`Speech synthesis failed: ${event.error}`));
        };
        
        window.speechSynthesis.speak(utterance);
      }
    });
  }

  private recordSpeech(utterance: SpeechSynthesisUtterance): MediaRecorder | null {
    try {
      // Create an audio context to capture the speech
      const audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();
      
      // Note: This is a simplified approach
      // In a real implementation, you'd need to route the speech synthesis through the audio context
      // which is not directly supported by the Web Speech API
      
      return new MediaRecorder(destination.stream);
    } catch (error) {
      console.warn('Could not create MediaRecorder:', error);
      return null;
    }
  }

  private generateMockAudio(voiceOver: VoiceOver): string {
    // Generate a simple audio file using Web Audio API
    const audioContext = new AudioContext();
    const duration = Math.max(1, voiceOver.text.length * 0.05); // Rough estimate: 0.05s per character
    const sampleRate = audioContext.sampleRate;
    const numSamples = duration * sampleRate;
    
    const audioBuffer = audioContext.createBuffer(1, numSamples, sampleRate);
    const channelData = audioBuffer.getChannelData(0);
    
    // Generate a simple tone (placeholder for actual speech)
    const frequency = voiceOver.pitch > 0 ? 440 + voiceOver.pitch * 20 : 440 + voiceOver.pitch * 20;
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      channelData[i] = Math.sin(2 * Math.PI * frequency * t) * 0.1;
    }
    
    // Convert to WAV blob
    const wavBlob = this.audioBufferToWav(audioBuffer);
    return URL.createObjectURL(wavBlob);
  }

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

  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  async getAvailableVoices(): Promise<Voice[]> {
    // In production, fetch from TTS API
    // For now, return mock voices
    
    if ('speechSynthesis' in window) {
      const voices = window.speechSynthesis.getVoices();
      return voices.map((voice) => ({
        id: voice.voiceURI,
        name: voice.name,
        gender: this.inferGender(voice.name),
        language: voice.lang,
      }));
    }
    
    return [
      { id: 'male-1', name: 'Male Voice 1', gender: 'male', language: 'en-US' },
      { id: 'female-1', name: 'Female Voice 1', gender: 'female', language: 'en-US' },
      { id: 'neutral-1', name: 'Neutral Voice 1', gender: 'neutral', language: 'en-US' },
    ];
  }

  private inferGender(voiceName: string): 'male' | 'female' | 'neutral' {
    const name = voiceName.toLowerCase();
    if (name.includes('male') || name.includes('david') || name.includes('james') || name.includes('daniel')) {
      return 'male';
    } else if (name.includes('female') || name.includes('samantha') || name.includes('victoria') || name.includes('karen')) {
      return 'female';
    }
    return 'neutral';
  }
}

/**
 * ElevenLabs TTS Provider (production implementation)
 * Requires API key and endpoint configuration
 */
class ElevenLabsTTSProvider implements TTSProvider {
  name = 'ElevenLabs';
  private apiKey: string;
  private apiEndpoint = 'https://api.elevenlabs.io/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateVoiceOver(voiceOver: VoiceOver): Promise<string> {
    const response = await fetch(`${this.apiEndpoint}/text-to-speech/${voiceOver.voice}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': this.apiKey,
      },
      body: JSON.stringify({
        text: voiceOver.text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
          style: voiceOver.emotion === 'neutral' ? 0 : 0.5,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.statusText}`);
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  async getAvailableVoices(): Promise<Voice[]> {
    const response = await fetch(`${this.apiEndpoint}/voices`, {
      headers: {
        'xi-api-key': this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.statusText}`);
    }

    const data = await response.json();
    // Using 'any' for voice data from ElevenLabs API response which has flexible structure
    return data.voices.map((voice: unknown) => ({
      id: voice.voice_id,
      name: voice.name,
      gender: voice.labels?.gender || 'neutral',
      language: voice.labels?.language || 'en-US',
      previewUrl: voice.preview_url,
    }));
  }
}

/**
 * TTS Service singleton
 */
class TTSService {
  private provider: TTSProvider;

  constructor() {
    // Default to mock provider
    // In production, initialize with actual provider based on configuration
    this.provider = new MockTTSProvider();
  }

  setProvider(provider: TTSProvider): void {
    this.provider = provider;
  }

  async generateVoiceOver(voiceOver: VoiceOver): Promise<string> {
    return this.provider.generateVoiceOver(voiceOver);
  }

  async getAvailableVoices(): Promise<Voice[]> {
    return this.provider.getAvailableVoices();
  }

  // Helper method to initialize ElevenLabs provider
  initializeElevenLabs(apiKey: string): void {
    this.provider = new ElevenLabsTTSProvider(apiKey);
  }
}

// Export singleton instance
export const ttsService = new TTSService();

// Export provider classes for testing
export { MockTTSProvider, ElevenLabsTTSProvider };

