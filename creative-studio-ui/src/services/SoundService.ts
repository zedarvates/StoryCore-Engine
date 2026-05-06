/**
 * SoundService - Service de génération de sons pour les événements vocaux
 *
 * Utilise Web Audio API pour générer des sons harmoniques
 * sans dépendances externes
 */
import { LegacyAny } from '@/types/legacy';


/* eslint-disable @typescript-eslint/no-explicit-any */

export type SoundType = 
  | 'mic-open'      // Microphone activé
  | 'mic-close'     // Microphone fermé
  | 'message-sent'  // Message vocal envoyé (transcrit)
  | 'prompt-received' // Assistant a reçu le prompt
  | 'response-ready'; // Assistant a terminé sa réponse

interface SoundConfig {
  frequency: number;
  duration: number;
  type: OscillatorType;
  volume: number;
  harmonics?: { freq: number; gain: number }[];
  envelope?: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
}

/**
 * Service de génération de sons
 */
export class SoundService {
  private static instance: SoundService;
  private audioContext: AudioContext | null = null;
  private enabled = true;
  private volume = 0.3;

  private soundConfigs: Record<SoundType, SoundConfig> = {
    'mic-open': {
      frequency: 440,
      duration: 0.15,
      type: 'sine',
      volume: 0.4,
      harmonics: [
        { freq: 1, gain: 1 },      // Fundamental
        { freq: 1.5, gain: 0.5 },  // Perfect fifth
        { freq: 2, gain: 0.25 },   // Octave
      ],
      envelope: { attack: 0.01, decay: 0.05, sustain: 0.7, release: 0.1 }
    },
    'mic-close': {
      frequency: 330,
      duration: 0.12,
      type: 'sine',
      volume: 0.3,
      harmonics: [
        { freq: 1, gain: 1 },
        { freq: 0.75, gain: 0.4 },
      ],
      envelope: { attack: 0.01, decay: 0.04, sustain: 0.6, release: 0.08 }
    },
    'message-sent': {
      frequency: 523.25, // C5
      duration: 0.2,
      type: 'sine',
      volume: 0.35,
      harmonics: [
        { freq: 1, gain: 1 },
        { freq: 1.25, gain: 0.6 }, // Major third
        { freq: 1.5, gain: 0.4 },  // Perfect fifth
      ],
      envelope: { attack: 0.02, decay: 0.08, sustain: 0.5, release: 0.12 }
    },
    'prompt-received': {
      frequency: 659.25, // E5
      duration: 0.15,
      type: 'triangle',
      volume: 0.3,
      harmonics: [
        { freq: 1, gain: 1 },
        { freq: 2, gain: 0.3 },
      ],
      envelope: { attack: 0.01, decay: 0.05, sustain: 0.7, release: 0.08 }
    },
    'response-ready': {
      frequency: 587.33, // D5
      duration: 0.35,
      type: 'sine',
      volume: 0.4,
      harmonics: [
        { freq: 1, gain: 1 },       // D5
        { freq: 1.25, gain: 0.7 },  // F#5 (major third)
        { freq: 1.5, gain: 0.5 },   // A5 (perfect fifth)
        { freq: 2, gain: 0.2 },     // D6 (octave)
      ],
      envelope: { attack: 0.03, decay: 0.1, sustain: 0.6, release: 0.2 }
    }
  };

  private constructor() {
    this.initAudioContext();
  }

  static getInstance(): SoundService {
    if (!SoundService.instance) {
      SoundService.instance = new SoundService();
    }
    return SoundService.instance;
  }

  /**
   * Initialise l'AudioContext (lazy loading)
   */
  private initAudioContext(): void {
    try {
      // Create AudioContext on first user interaction
      const AudioContextClass = (window as LegacyAny).AudioContext || (window as LegacyAny).webkitAudioContext;
      if (AudioContextClass && !this.audioContext) {
        this.audioContext = new AudioContextClass();
      }
    } catch (error) {
      console.warn('[SoundService] AudioContext not available:', error);
    }
  }

  /**
   * S'assure que l'AudioContext est actif
   */
  private async ensureAudioContext(): Promise<AudioContext | null> {
    if (!this.audioContext) {
      this.initAudioContext();
    }

    if (this.audioContext?.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (error) {
        console.warn('[SoundService] Could not resume AudioContext:', error);
        return null;
      }
    }

    return this.audioContext;
  }

  /**
   * Joue un son
   */
  async play(soundType: SoundType): Promise<void> {
    if (!this.enabled) return;

    const ctx = await this.ensureAudioContext();
    if (!ctx) return;

    const config = this.soundConfigs[soundType];
    if (!config) return;

    try {
      const now = ctx.currentTime;
      const envelope = config.envelope || { attack: 0.01, decay: 0.05, sustain: 0.7, release: 0.1 };

      // Create master gain for envelope
      const masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);
      masterGain.gain.setValueAtTime(0, now);

      // Apply envelope to master gain
      const attackEnd = now + envelope.attack;
      const decayEnd = attackEnd + envelope.decay;
      const sustainEnd = decayEnd + config.duration;
      const releaseEnd = sustainEnd + envelope.release;

      masterGain.gain.linearRampToValueAtTime(this.volume * config.volume, attackEnd);
      masterGain.gain.linearRampToValueAtTime(this.volume * config.volume * envelope.sustain, decayEnd);
      masterGain.gain.setValueAtTime(this.volume * config.volume * envelope.sustain, sustainEnd);
      masterGain.gain.linearRampToValueAtTime(0, releaseEnd);

      // Create oscillators for harmonics
      const oscillators: OscillatorNode[] = [];
      const harmonicGains: GainNode[] = [];

      if (config.harmonics && config.harmonics.length > 0) {
        // Multi-oscillator approach for rich harmonics
        config.harmonics.forEach((harmonic) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = config.type;
          osc.frequency.setValueAtTime(config.frequency * harmonic.freq, now);

          gain.gain.setValueAtTime(harmonic.gain * this.volume * config.volume, now);

          osc.connect(gain);
          gain.connect(masterGain);

          osc.start(now);
          osc.stop(releaseEnd);

          oscillators.push(osc);
          harmonicGains.push(gain);
        });
      } else {
        // Single oscillator
        const osc = ctx.createOscillator();
        osc.type = config.type;
        osc.frequency.setValueAtTime(config.frequency, now);
        osc.connect(masterGain);
        osc.start(now);
        osc.stop(releaseEnd);
        oscillators.push(osc);
      }

      // Clean up after sound ends
      setTimeout(() => {
        oscillators.forEach(osc => {
          try { osc.disconnect(); } catch { /* ignore */ }
        });
        harmonicGains.forEach(gain => {
          try { gain.disconnect(); } catch { /* ignore */ }
        });
        try { masterGain.disconnect(); } catch { /* ignore */ }
      }, (releaseEnd - now) * 1000 + 100);

    } catch (error) {
      console.warn('[SoundService] Error playing sound:', error);
    }
  }

  /**
   * Active/désactive les sons
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Définit le volume global (0-1)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Obtient l'état activé
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Obtient le volume actuel
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Prépare l'AudioContext pour une utilisation ultérieure
   * (à appeler lors d'une interaction utilisateur)
   */
  prepare(): void {
    this.initAudioContext();
  }

  /**
   * Teste un son
   */
  async testSound(soundType: SoundType = 'mic-open'): Promise<void> {
    await this.play(soundType);
  }
}

// Export de l'instance singleton
export const soundService = SoundService.getInstance();