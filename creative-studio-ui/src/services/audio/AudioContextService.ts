/**
 * Audio Context Service for StoryCore
 * Web Audio API integration with FFT analysis and real-time frequency data
 */

import {
  AudioVisualizerConfig,
  WaveformData,
  FrequencyData,
  AudioAnalyzerState,
} from '../audio-visualization/AudioVisualizerTypes';

export class AudioContextService {
  private audioContext: AudioContext | null = null;
  private analyzerNode: AnalyserNode | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private gainNode: GainNode | null = null;
  private audioElement: HTMLAudioElement | null = null;

  private config: AudioVisualizerConfig;
  private state: AudioAnalyzerState;

  private timeDomainDataArray: Float32Array | null = null;
  private frequencyDataArray: Uint8Array | null = null;
  private animationFrameId: number | null = null;

  private stateChangeCallback: ((state: AudioAnalyzerState) => void) | null = null;
  private waveformCallback: ((data: WaveformData) => void) | null = null;
  private frequencyCallback: ((data: FrequencyData) => void) | null = null;

  constructor(config?: Partial<AudioVisualizerConfig>) {
    this.config = {
      fftSize: config?.fftSize || 2048,
      smoothingTimeConstant: config?.smoothingTimeConstant || 0.8,
      minDecibels: config?.minDecibels || -90,
      maxDecibels: config?.maxDecibels || -10,
      sampleRate: config?.sampleRate || 44100,
      bufferLength: config?.bufferLength || 2048,
    };

    this.state = {
      isActive: false,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 1,
      isLoaded: false,
      error: null,
    };
  }

  /**
   * Initialize the audio context
   */
  async initialize(): Promise<void> {
    try {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      
      this.analyzerNode = this.audioContext.createAnalyser();
      this.analyzerNode.fftSize = this.config.fftSize;
      this.analyzerNode.smoothingTimeConstant = this.config.smoothingTimeConstant;
      this.analyzerNode.minDecibels = this.config.minDecibels;
      this.analyzerNode.maxDecibels = this.config.maxDecibels;

      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.config.sampleRate;

      const bufferLength = this.analyzerNode.frequencyBinCount;
      this.timeDomainDataArray = new Float32Array(bufferLength);
      this.frequencyDataArray = new Uint8Array(bufferLength);

      this.state.isActive = true;
      this.updateState();
    } catch (error) {
      this.state.error = `Failed to initialize audio context: ${error}`;
      throw error;
    }
  }

  /**
   * Load audio from a file URL
   */
  async loadAudio(url: string): Promise<void> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized');
    }

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      this.state.duration = this.audioBuffer.duration;
      this.state.isLoaded = true;
      this.updateState();
    } catch (error) {
      this.state.error = `Failed to load audio: ${error}`;
      throw error;
    }
  }

  /**
   * Load audio from an HTML audio element
   */
  attachAudioElement(audioElement: HTMLAudioElement): void {
    this.audioElement = audioElement;

    if (!this.audioContext || !this.analyzerNode) {
      return;
    }

    const sourceNode = this.audioContext.createMediaElementSource(audioElement);
    sourceNode.connect(this.analyzerNode);
    this.analyzerNode.connect(this.gainNode!);
    this.gainNode!.connect(this.audioContext.destination);

    this.state.duration = audioElement.duration || 0;
    this.state.isLoaded = true;

    audioElement.addEventListener('timeupdate', () => {
      this.state.currentTime = audioElement.currentTime;
      this.updateState();
    });

    audioElement.addEventListener('ended', () => {
      this.state.isPlaying = false;
      this.state.currentTime = 0;
      this.updateState();
    });

    audioElement.addEventListener('loadedmetadata', () => {
      this.state.duration = audioElement.duration || 0;
      this.updateState();
    });

    this.updateState();
  }

  /**
   * Play the audio
   */
  play(): void {
    if (!this.audioContext || !this.audioBuffer) {
      return;
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    this.sourceNode.connect(this.analyzerNode!);
    this.analyzerNode!.connect(this.gainNode!);
    this.gainNode!.connect(this.audioContext.destination);

    this.sourceNode.start(0, this.state.currentTime);
    this.state.isPlaying = true;
    this.updateState();

    this.sourceNode.onended = () => {
      if (this.state.currentTime >= this.state.duration) {
        this.state.isPlaying = false;
        this.state.currentTime = 0;
        this.updateState();
      }
    };
  }

  /**
   * Pause the audio
   */
  pause(): void {
    if (this.sourceNode) {
      this.sourceNode.stop();
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    this.state.isPlaying = false;
    this.updateState();
  }

  /**
   * Stop the audio
   */
  stop(): void {
    if (this.sourceNode) {
      this.sourceNode.stop();
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    this.state.isPlaying = false;
    this.state.currentTime = 0;
    this.updateState();
  }

  /**
   * Seek to a specific time
   */
  seek(time: number): void {
    const wasPlaying = this.state.isPlaying;
    if (wasPlaying) {
      this.pause();
    }
    this.state.currentTime = Math.max(0, Math.min(time, this.state.duration));
    this.updateState();
    if (wasPlaying) {
      this.play();
    }
  }

  /**
   * Set the volume
   */
  setVolume(volume: number): void {
    this.state.volume = Math.max(0, Math.min(1, volume));
    if (this.gainNode) {
      this.gainNode.gain.value = this.state.volume;
    }
    this.updateState();
  }

  /**
   * Get current waveform data
   */
  getWaveformData(): WaveformData {
    if (!this.analyzerNode || !this.timeDomainDataArray) {
      return {
        timeDomainData: new Float32Array(0),
        peaks: [],
        rms: 0,
        zeroCrossings: 0,
        duration: this.state.duration,
        currentTime: this.state.currentTime,
      };
    }

    this.analyzerNode.getFloatTimeDomainData(this.timeDomainDataArray);

    const peaks: number[] = [];
    let sum = 0;
    let zeroCrossings = 0;
    let previousSign = Math.sign(this.timeDomainDataArray[0]);

    for (let i = 0; i < this.timeDomainDataArray.length; i++) {
      const value = this.timeDomainDataArray[i];
      sum += value * value;

      const currentSign = Math.sign(value);
      if (currentSign !== previousSign && currentSign !== 0) {
        zeroCrossings++;
      }
      previousSign = currentSign;

      if (Math.abs(value) > 0.9) {
        peaks.push(i / this.timeDomainDataArray.length);
      }
    }

    const rms = Math.sqrt(sum / this.timeDomainDataArray.length);

    return {
      timeDomainData: this.timeDomainDataArray,
      peaks,
      rms,
      zeroCrossings,
      duration: this.state.duration,
      currentTime: this.state.currentTime,
    };
  }

  /**
   * Get current frequency data
   */
  getFrequencyData(): FrequencyData {
    if (!this.analyzerNode || !this.frequencyDataArray) {
      return {
        frequencyData: new Uint8Array(0),
        frequencies: [],
        bassEnergy: 0,
        midEnergy: 0,
        highEnergy: 0,
        peakFrequency: 0,
        spectralCentroid: 0,
        spectralRolloff: 0,
      };
    }

    this.analyzerNode.getByteFrequencyData(this.frequencyDataArray);

    const frequencies: number[] = [];
    const nyquist = this.audioContext!.sampleRate / 2;
    const binWidth = nyquist / this.frequencyDataArray.length;

    for (let i = 0; i < this.frequencyDataArray.length; i++) {
      frequencies.push(i * binWidth);
    }

    let bassEnergy = 0;
    let midEnergy = 0;
    let highEnergy = 0;
    let totalEnergy = 0;
    let peakFrequency = 0;
    let peakAmplitude = 0;
    let weightedSum = 0;

    for (let i = 0; i < this.frequencyDataArray.length; i++) {
      const amplitude = this.frequencyDataArray[i] / 255;
      const frequency = frequencies[i];

      if (frequency < 250) {
        bassEnergy += amplitude;
      } else if (frequency < 4000) {
        midEnergy += amplitude;
      } else {
        highEnergy += amplitude;
      }

      totalEnergy += amplitude;

      if (amplitude > peakAmplitude) {
        peakAmplitude = amplitude;
        peakFrequency = frequency;
      }

      weightedSum += frequency * amplitude;
    }

    const spectralCentroid = totalEnergy > 0 ? weightedSum / totalEnergy : 0;

    let spectralRolloff = 0;
    let cumulativeEnergy = 0;
    const rolloffThreshold = totalEnergy * 0.85;

    for (let i = 0; i < this.frequencyDataArray.length; i++) {
      cumulativeEnergy += this.frequencyDataArray[i] / 255;
      if (cumulativeEnergy >= rolloffThreshold) {
        spectralRolloff = frequencies[i];
        break;
      }
    }

    return {
      frequencyData: this.frequencyDataArray,
      frequencies,
      bassEnergy,
      midEnergy,
      highEnergy,
      peakFrequency,
      spectralCentroid,
      spectralRolloff,
    };
  }

  /**
   * Start the visualization loop
   */
  startVisualization(
    onWaveform: (data: WaveformData) => void,
    onFrequency: (data: FrequencyData) => void
  ): void {
    this.waveformCallback = onWaveform;
    this.frequencyCallback = onFrequency;

    const loop = () => {
      const waveformData = this.getWaveformData();
      const frequencyData = this.getFrequencyData();

      if (this.waveformCallback) {
        this.waveformCallback(waveformData);
      }

      if (this.frequencyCallback) {
        this.frequencyCallback(frequencyData);
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };

    loop();
  }

  /**
   * Stop the visualization loop
   */
  stopVisualization(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.waveformCallback = null;
    this.frequencyCallback = null;
  }

  /**
   * Set state change callback
   */
  setStateChangeCallback(callback: (state: AudioAnalyzerState) => void): void {
    this.stateChangeCallback = callback;
  }

  /**
   * Update the state and notify listeners
   */
  private updateState(): void {
    if (this.stateChangeCallback) {
      this.stateChangeCallback({ ...this.state });
    }
  }

  /**
   * Get the current state
   */
  getState(): AudioAnalyzerState {
    return { ...this.state };
  }

  /**
   * Get the audio context
   */
  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  /**
   * Get the analyzer node
   */
  getAnalyzerNode(): AnalyserNode | null {
    return this.analyzerNode;
  }

  /**
   * Get the configuration
   */
  getConfig(): AudioVisualizerConfig {
    return { ...this.config };
  }

  /**
   * Update the configuration
   */
  updateConfig(updates: Partial<AudioVisualizerConfig>): void {
    Object.assign(this.config, updates);

    if (this.analyzerNode) {
      if (updates.fftSize) {
        this.analyzerNode.fftSize = updates.fftSize;
      }
      if (updates.smoothingTimeConstant !== undefined) {
        this.analyzerNode.smoothingTimeConstant = updates.smoothingTimeConstant;
      }
      if (updates.minDecibels !== undefined) {
        this.analyzerNode.minDecibels = updates.minDecibels;
      }
      if (updates.maxDecibels !== undefined) {
        this.analyzerNode.maxDecibels = updates.maxDecibels;
      }

      const bufferLength = this.analyzerNode.frequencyBinCount;
      this.timeDomainDataArray = new Float32Array(bufferLength);
      this.frequencyDataArray = new Uint8Array(bufferLength);
    }
  }

  /**
   * Dispose of the audio context and resources
   */
  dispose(): void {
    this.stopVisualization();
    this.stop();

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.audioBuffer = null;
    this.sourceNode = null;
    this.analyzerNode = null;
    this.gainNode = null;
    this.audioElement = null;

    this.state.isActive = false;
    this.state.isLoaded = false;
    this.updateState();
  }
}

// Export singleton instance factory
let audioContextServiceInstance: AudioContextService | null = null;

export function getAudioContextService(config?: Partial<AudioVisualizerConfig>): AudioContextService {
  if (!audioContextServiceInstance) {
    audioContextServiceInstance = new AudioContextService(config);
  }
  return audioContextServiceInstance;
}

export function createAudioContextService(config?: Partial<AudioVisualizerConfig>): AudioContextService {
  return new AudioContextService(config);
}
