/**
 * SAPI TTS Provider for Windows Speech API
 * 
 * Provides Text-to-Speech using Windows native SAPI voices.
 * Integrates with the existing TTS service architecture.
 */

import type { VoiceOver, Voice } from '../types';

interface SapiTTSProviderConfig {
  defaultVoice?: string;
  useCoquiTTS?: boolean;
}

interface SapiVoice {
  id: string;
  name: string;
  displayName: string;
  gender: 'male' | 'female' | 'neutral';
  language: string;
  localService: boolean;
  supported: boolean;
  default?: boolean;
}

class SapiTTSProvider {
  name = 'SAPI';
  private config: SapiTTSProviderConfig;
  private cachedVoices: SapiVoice[] | null = null;

  constructor(config: SapiTTSProviderConfig = {}) {
    this.config = config;
  }

  /**
   * Get all available SAPI voices
   */
  async getAvailableVoices(): Promise<Voice[]> {
    // Try to get voices from Coqui TTS first (if configured)
    if (this.config.useCoquiTTS) {
      try {
        const coquiVoices = await this.getCoquiTTSVoices();
        if (coquiVoices.length > 0) {
          return coquiVoices;
        }
      } catch {
        console.warn('Coqui TTS not available, falling back to SAPI');
      }
    }

    // Fall back to native SAPI voices via Web Speech API
    return this.getSapiVoices();
  }

  /**
   * Get voices from Coqui TTS (if available)
   */
  private async getCoquiTTSVoices(): Promise<Voice[]> {
    // Check if Coqui TTS is available
    if (!(window as any).coquiTTS) {
      throw new Error('Coqui TTS not loaded');
    }

    const tts = (window as any).coquiTTS;
    const speakers = await tts.getSpeakers?.() || [];
    
    return speakers.map((speaker: unknown) => ({
      id: speaker.id || speaker.name,
      name: speaker.name || speaker.id,
      gender: this.inferGender(speaker.name || speaker.id),
      language: speaker.language || 'en-US',
    }));
  }

  /**
   * Get native SAPI voices via Web Speech API
   */
  private async getSapiVoices(): Promise<Voice[]> {
    if (!('speechSynthesis' in window)) {
      console.warn('Web Speech API not available');
      return this.getMockVoices();
    }

    // Wait for voices to be loaded
    await this.waitForVoices();

    const voices = window.speechSynthesis.getVoices();
    
    if (voices.length === 0) {
      console.warn('No SAPI voices available');
      return this.getMockVoices();
    }

    // Filter and map SAPI voices
    const sapiVoices = voices
      .filter(voice => voice.localService || voice.lang.startsWith('en'))
      .map(voice => ({
        id: voice.voiceURI || voice.name,
        name: voice.name,
        gender: this.inferGender(voice.name),
        language: voice.lang,
      }));

    return sapiVoices.length > 0 ? sapiVoices : this.getMockVoices();
  }

  /**
   * Get mock voices for development
   */
  private getMockVoices(): Voice[] {
    return [
      { id: 'sapi-david', name: 'Microsoft David Desktop', gender: 'male', language: 'en-US' },
      { id: 'sapi-zira', name: 'Microsoft Zira Desktop', gender: 'female', language: 'en-US' },
      { id: 'sapi-helena', name: 'Microsoft Helena Desktop', gender: 'female', language: 'fr-FR' },
      { id: 'sapi-hortense', name: 'Microsoft Hortense Desktop', gender: 'female', language: 'fr-FR' },
    ];
  }

  /**
   * Wait for voices to be loaded (Web Speech API quirk)
   */
  private waitForVoices(timeout: number = 1000): Promise<void> {
    return new Promise((resolve) => {
      if (window.speechSynthesis.getVoices().length > 0) {
        resolve();
        return;
      }

      const timeoutId = setTimeout(() => {
        resolve();
      }, timeout);

      window.speechSynthesis.onvoiceschanged = () => {
        clearTimeout(timeoutId);
        window.speechSynthesis.onvoiceschanged = null;
        resolve();
      };
    });
  }

  /**
   * Infer gender from voice name
   */
  private inferGender(name: string): 'male' | 'female' | 'neutral' {
    const lowerName = name.toLowerCase();
    
    const maleIndicators = ['male', 'david', 'james', 'richard', 'george', 'henri', 'francois'];
    const femaleIndicators = ['female', 'zira', 'samantha', 'victoria', 'helena', 'hortense', 'suzanne', 'marie'];
    
    if (maleIndicators.some(indicator => lowerName.includes(indicator))) {
      return 'male';
    }
    if (femaleIndicators.some(indicator => lowerName.includes(indicator))) {
      return 'female';
    }
    return 'neutral';
  }

  /**
   * Generate voiceover using SAPI
   */
  async generateVoiceOver(voiceOver: VoiceOver): Promise<string> {
    if (!('speechSynthesis' in window)) {
      throw new Error('Web Speech API not available');
    }

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(voiceOver.text);
      
      // Configure utterance parameters
      utterance.rate = Math.max(0.5, Math.min(2, voiceOver.speed));
      utterance.pitch = Math.max(0.5, Math.min(2, 1 + voiceOver.pitch / 10));
      utterance.volume = 1;

      // Select appropriate voice
      const voices = window.speechSynthesis.getVoices();
      const selectedVoice = this.selectVoice(voices, voiceOver.voice, voiceOver.language);
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      // Handle completion
      utterance.onend = () => {
        resolve(this.createAudioUrl(voiceOver));
      };

      utterance.onerror = (event) => {
        console.error('SAPI TTS error:', event);
        reject(new Error(`Speech synthesis failed: ${event.error}`));
      };

      // Start synthesis
      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Select best matching voice
   */
  private selectVoice(
    voices: SpeechSynthesisVoice[],
    voiceId: string,
    language: string
  ): SpeechSynthesisVoice | null {
    // Try to find exact voice match
    if (voiceId) {
      const exactMatch = voices.find(v => 
        v.voiceURI === voiceId || v.name === voiceId
      );
      if (exactMatch) return exactMatch;
    }

    // Try to find voice by language
    const langPrefix = language.split('-')[0];
    const langMatch = voices.find(v => 
      v.lang.toLowerCase().startsWith(langPrefix)
    );
    if (langMatch) return langMatch;

    // Return first available voice
    return voices[0] || null;
  }

  /**
   * Create a placeholder audio URL
   * Note: In production, you'd want to capture the actual audio
   */
  private createAudioUrl(voiceOver: VoiceOver): string {
    // This is a placeholder - actual implementation would capture
    // the Web Speech API output using MediaRecorder
    return `data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=`;
  }
}

// Export provider
export { SapiTTSProvider };

// Export singleton instance
export const sapiTTSProvider = new SapiTTSProvider();

// Re-export types for convenience
export type { SapiTTSProviderConfig, SapiVoice };


