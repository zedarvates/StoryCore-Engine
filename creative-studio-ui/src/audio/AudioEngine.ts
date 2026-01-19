import type { AudioTrack, SurroundConfig, AudioEffect } from '../types';

/**
 * AudioEngine - Web Audio API based audio processing engine
 * 
 * Features:
 * - Load and play audio tracks
 * - Apply volume, pan, fades
 * - Real-time audio processing
 * - Surround sound support (stereo, 5.1, 7.1)
 * - Audio effects (limiter, voice clarity, etc.)
 */

interface AudioTrackNode {
  source: AudioBufferSourceNode | null;
  buffer: AudioBuffer;
  gainNode: GainNode;
  pannerNode: StereoPannerNode | null;
  surroundNodes: SurroundNodes | null;
  limiter: DynamicsCompressorNode;
  voiceClarityNode: BiquadFilterNode;
  isPlaying: boolean;
  startTime: number;
  pauseTime: number;
}

interface SurroundNodes {
  stereo?: StereoPannerNode;
  surround?: SurroundNodesConfig;
}

interface SurroundNodesConfig {
  splitter: ChannelSplitterNode;
  merger: ChannelMergerNode;
  channelGains: { [key: string]: GainNode };
  mode: '5.1' | '7.1';
}

export class AudioEngine {
  private audioContext: AudioContext;
  private tracks: Map<string, AudioTrackNode> = new Map();
  private masterGain: GainNode;

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.connect(this.audioContext.destination);
  }

  /**
   * Load an audio track from URL
   */
  async loadTrack(track: AudioTrack): Promise<void> {
    try {
      // Fetch audio file
      const response = await fetch(track.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      // Create audio nodes
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = track.volume / 100;

      // Create surround sound nodes if configured
      let pannerNode: StereoPannerNode | null = null;
      let surroundNodes: SurroundNodes | null = null;

      if (track.surroundConfig) {
        surroundNodes = this.createSurroundNodes(track.surroundConfig);
      } else {
        // Fallback to stereo panner
        pannerNode = this.audioContext.createStereoPanner();
        pannerNode.pan.value = track.pan / 100;
      }

      // Create dynamics compressor for limiter
      const limiter = this.audioContext.createDynamicsCompressor();
      limiter.threshold.value = -10;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.25;

      // Create Voice Clarity processing chain
      const voiceClarityNode = this.createVoiceClarityNode(track);

      // Store track node
      this.tracks.set(track.id, {
        source: null,
        buffer: audioBuffer,
        gainNode,
        pannerNode,
        surroundNodes,
        limiter,
        voiceClarityNode,
        isPlaying: false,
        startTime: 0,
        pauseTime: 0,
      });
    } catch (error) {
      console.error('Error loading audio track:', error);
      throw error;
    }
  }

  /**
   * Create surround sound nodes based on configuration
   */
  private createSurroundNodes(config: SurroundConfig): SurroundNodes {
    if (config.mode === 'stereo') {
      const pannerNode = this.audioContext.createStereoPanner();
      return { stereo: pannerNode };
    }

    // Create channel splitter for surround modes
    const channelCount = config.mode === '5.1' ? 6 : 8;
    const splitter = this.audioContext.createChannelSplitter(channelCount);
    const merger = this.audioContext.createChannelMerger(channelCount);

    // Create gain nodes for each channel
    const channelGains: { [key: string]: GainNode } = {};
    const channels =
      config.mode === '5.1'
        ? ['frontLeft', 'frontRight', 'center', 'lfe', 'surroundLeft', 'surroundRight']
        : [
            'frontLeft',
            'frontRight',
            'center',
            'lfe',
            'surroundLeft',
            'surroundRight',
            'sideLeft',
            'sideRight',
          ];

    channels.forEach((channel, index) => {
      const gainNode = this.audioContext.createGain();
      const level = config.channels[channel as keyof typeof config.channels] || 0;
      gainNode.gain.value = level / 100;
      channelGains[channel] = gainNode;

      // Connect splitter -> gain -> merger
      splitter.connect(gainNode, index);
      gainNode.connect(merger, 0, index);
    });

    return {
      surround: {
        splitter,
        merger,
        channelGains,
        mode: config.mode,
      },
    };
  }

  /**
   * Create Voice Clarity processing chain
   */
  private createVoiceClarityNode(track: AudioTrack): BiquadFilterNode {
    const voiceClarityEffect = track.effects.find((e) => e.type === 'voice-clarity');

    if (!voiceClarityEffect || !voiceClarityEffect.enabled) {
      // Passthrough node
      const passthrough = this.audioContext.createBiquadFilter();
      passthrough.type = 'allpass';
      return passthrough;
    }

    const intensity = voiceClarityEffect.parameters.intensity ?? 70;
    const intensityFactor = intensity / 100;

    // Voice Clarity: High-pass filter + presence boost
    const highPass = this.audioContext.createBiquadFilter();
    highPass.type = 'highpass';
    highPass.frequency.value = 80; // Remove low rumble

    const presenceBoost = this.audioContext.createBiquadFilter();
    presenceBoost.type = 'peaking';
    presenceBoost.frequency.value = 3000; // Boost presence frequencies
    presenceBoost.Q.value = 1.0;
    presenceBoost.gain.value = 6 * intensityFactor; // Scale by intensity

    const deEsser = this.audioContext.createBiquadFilter();
    deEsser.type = 'highshelf';
    deEsser.frequency.value = 8000; // Reduce sibilance
    deEsser.gain.value = -3 * intensityFactor; // Scale by intensity

    // Connect voice clarity chain
    highPass.connect(presenceBoost);
    presenceBoost.connect(deEsser);

    return highPass; // Return first node in chain
  }

  /**
   * Create and apply all audio effects for a track
   */
  private createEffectsChain(track: AudioTrack): AudioNode {
    // Start with the gain node
    let currentNode: AudioNode = this.audioContext.createGain();
    (currentNode as GainNode).gain.value = 1;

    // Apply each enabled effect in order
    for (const effect of track.effects) {
      if (!effect.enabled) continue;

      const effectNode = this.createEffectNode(effect);
      if (effectNode) {
        currentNode.connect(effectNode);
        currentNode = effectNode;
      }
    }

    return currentNode;
  }

  /**
   * Create a single effect node
   */
  private createEffectNode(effect: AudioEffect): AudioNode | null {
    switch (effect.type) {
      case 'gain':
        return this.createGainEffect(effect);
      case 'eq':
        return this.createEQEffect(effect);
      case 'bass-boost':
        return this.createBassBoostEffect(effect);
      case 'treble-boost':
        return this.createTrebleBoostEffect(effect);
      case 'distortion':
        return this.createDistortionEffect(effect);
      case 'compressor':
        return this.createCompressorEffect(effect);
      case 'noise-reduction':
        return this.createNoiseReductionEffect(effect);
      default:
        return null;
    }
  }

  /**
   * Create gain effect
   */
  private createGainEffect(effect: AudioEffect): GainNode {
    const gainNode = this.audioContext.createGain();
    const gainDB = effect.parameters.gain ?? 0;
    // Convert dB to linear gain: gain = 10^(dB/20)
    gainNode.gain.value = Math.pow(10, gainDB / 20);
    return gainNode;
  }

  /**
   * Create EQ effect (3-band)
   */
  private createEQEffect(effect: AudioEffect): AudioNode {
    const lowShelf = this.audioContext.createBiquadFilter();
    lowShelf.type = 'lowshelf';
    lowShelf.frequency.value = 200;
    lowShelf.gain.value = effect.parameters.lowGain ?? 0;

    const midPeak = this.audioContext.createBiquadFilter();
    midPeak.type = 'peaking';
    midPeak.frequency.value = 1000;
    midPeak.Q.value = 1;
    midPeak.gain.value = effect.parameters.midGain ?? 0;

    const highShelf = this.audioContext.createBiquadFilter();
    highShelf.type = 'highshelf';
    highShelf.frequency.value = 5000;
    highShelf.gain.value = effect.parameters.highGain ?? 0;

    // Connect EQ chain
    lowShelf.connect(midPeak);
    midPeak.connect(highShelf);

    return lowShelf;
  }

  /**
   * Create bass boost effect
   */
  private createBassBoostEffect(effect: AudioEffect): BiquadFilterNode {
    const bassBoost = this.audioContext.createBiquadFilter();
    bassBoost.type = 'lowshelf';
    bassBoost.frequency.value = effect.parameters.bassFrequency ?? 100;
    bassBoost.gain.value = effect.parameters.bassGain ?? 6;
    return bassBoost;
  }

  /**
   * Create treble boost effect
   */
  private createTrebleBoostEffect(effect: AudioEffect): BiquadFilterNode {
    const trebleBoost = this.audioContext.createBiquadFilter();
    trebleBoost.type = 'highshelf';
    trebleBoost.frequency.value = effect.parameters.trebleFrequency ?? 8000;
    trebleBoost.gain.value = effect.parameters.trebleGain ?? 6;
    return trebleBoost;
  }

  /**
   * Create distortion effect using WaveShaper
   */
  private createDistortionEffect(effect: AudioEffect): WaveShaperNode {
    const distortion = this.audioContext.createWaveShaper();
    const amount = (effect.parameters.distortion ?? 50) / 100;
    const type = effect.parameters.distortionType ?? 'soft';

    // Create distortion curve
    const samples = 44100;
    const curve = new Float32Array(samples);

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      switch (type) {
        case 'soft':
          // Soft clipping (tanh-like)
          curve[i] = Math.tanh(x * (1 + amount * 5));
          break;
        case 'hard':
          // Hard clipping
          curve[i] = Math.max(-1, Math.min(1, x * (1 + amount * 10)));
          break;
        case 'tube':
          // Tube-like asymmetric distortion
          curve[i] = x < 0 
            ? Math.tanh(x * (1 + amount * 3))
            : Math.tanh(x * (1 + amount * 5));
          break;
        case 'fuzz':
          // Fuzz (extreme clipping)
          curve[i] = x > 0 ? 1 : -1;
          break;
        default:
          curve[i] = x;
      }
    }

    distortion.curve = curve;
    distortion.oversample = '4x';

    return distortion;
  }

  /**
   * Create compressor effect
   */
  private createCompressorEffect(effect: AudioEffect): DynamicsCompressorNode {
    const compressor = this.audioContext.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 30;
    compressor.ratio.value = effect.parameters.ratio ?? 4;
    compressor.attack.value = (effect.parameters.attack ?? 10) / 1000; // Convert ms to seconds
    compressor.release.value = 0.25;
    return compressor;
  }

  /**
   * Create noise reduction effect (high-pass filter)
   */
  private createNoiseReductionEffect(effect: AudioEffect): BiquadFilterNode {
    const highPass = this.audioContext.createBiquadFilter();
    highPass.type = 'highpass';
    const noiseFloor = effect.parameters.noiseFloor ?? -40;
    // Map noise floor to cutoff frequency (lower noise floor = higher cutoff)
    highPass.frequency.value = Math.max(20, 100 + (noiseFloor + 60) * 5);
    highPass.Q.value = 0.7;
    return highPass;
  }

  /**
   * Play an audio track
   */
  play(trackId: string, startTime: number = 0): void {
    const trackNode = this.tracks.get(trackId);
    if (!trackNode || trackNode.isPlaying) return;

    // Create new source node
    const source = this.audioContext.createBufferSource();
    source.buffer = trackNode.buffer;

    // Create effects chain
    const effectsChainStart = this.audioContext.createGain();
    (effectsChainStart as GainNode).gain.value = 1;
    
    // Connect source to effects chain start
    source.connect(effectsChainStart);

    // Get the track to access effects
    let currentNode: AudioNode = effectsChainStart;
    
    // Apply effects chain if track has effects
    const track = Array.from(this.tracks.entries()).find(([id]) => id === trackId);
    if (track) {
      // Apply each enabled effect
      for (const effect of (track[1] as any).effects || []) {
        if (!effect.enabled) continue;
        
        const effectNode = this.createEffectNode(effect);
        if (effectNode) {
          currentNode.connect(effectNode);
          currentNode = effectNode;
        }
      }
    }

    // Connect to gain node
    currentNode.connect(trackNode.gainNode);

    if (trackNode.surroundNodes?.stereo) {
      trackNode.gainNode.connect(trackNode.surroundNodes.stereo);
      trackNode.surroundNodes.stereo.connect(trackNode.voiceClarityNode);
    } else if (trackNode.surroundNodes?.surround) {
      trackNode.gainNode.connect(trackNode.surroundNodes.surround.splitter);
      trackNode.surroundNodes.surround.merger.connect(trackNode.voiceClarityNode);
    } else if (trackNode.pannerNode) {
      trackNode.gainNode.connect(trackNode.pannerNode);
      trackNode.pannerNode.connect(trackNode.voiceClarityNode);
    } else {
      trackNode.gainNode.connect(trackNode.voiceClarityNode);
    }

    trackNode.voiceClarityNode.connect(trackNode.limiter);
    trackNode.limiter.connect(this.masterGain);

    // Start playback
    source.start(this.audioContext.currentTime, startTime);
    trackNode.source = source;
    trackNode.isPlaying = true;
    trackNode.startTime = this.audioContext.currentTime - startTime;
  }

  /**
   * Pause an audio track
   */
  pause(trackId: string): void {
    const trackNode = this.tracks.get(trackId);
    if (!trackNode || !trackNode.isPlaying || !trackNode.source) return;

    trackNode.source.stop();
    trackNode.pauseTime = this.audioContext.currentTime - trackNode.startTime;
    trackNode.isPlaying = false;
    trackNode.source = null;
  }

  /**
   * Resume a paused audio track
   */
  resume(trackId: string): void {
    const trackNode = this.tracks.get(trackId);
    if (!trackNode || trackNode.isPlaying) return;

    this.play(trackId, trackNode.pauseTime);
  }

  /**
   * Stop an audio track
   */
  stop(trackId: string): void {
    const trackNode = this.tracks.get(trackId);
    if (!trackNode) return;

    if (trackNode.source && trackNode.isPlaying) {
      trackNode.source.stop();
      trackNode.source = null;
    }

    trackNode.isPlaying = false;
    trackNode.pauseTime = 0;
  }

  /**
   * Update volume for a track
   */
  setVolume(trackId: string, volume: number): void {
    const trackNode = this.tracks.get(trackId);
    if (!trackNode) return;

    trackNode.gainNode.gain.value = volume / 100;
  }

  /**
   * Update pan for a track (stereo only)
   */
  setPan(trackId: string, pan: number): void {
    const trackNode = this.tracks.get(trackId);
    if (!trackNode || !trackNode.pannerNode) return;

    trackNode.pannerNode.pan.value = pan / 100;
  }

  /**
   * Apply fade in/out to a track
   */
  applyFades(trackId: string, fadeIn: number, fadeOut: number, duration: number): void {
    const trackNode = this.tracks.get(trackId);
    if (!trackNode) return;

    const now = this.audioContext.currentTime;

    // Clear any existing automation
    trackNode.gainNode.gain.cancelScheduledValues(now);

    // Get current volume
    const volume = trackNode.gainNode.gain.value;

    // Fade in
    if (fadeIn > 0) {
      trackNode.gainNode.gain.setValueAtTime(0, now);
      trackNode.gainNode.gain.linearRampToValueAtTime(volume, now + fadeIn);
    } else {
      trackNode.gainNode.gain.setValueAtTime(volume, now);
    }

    // Fade out
    if (fadeOut > 0) {
      trackNode.gainNode.gain.setValueAtTime(volume, now + duration - fadeOut);
      trackNode.gainNode.gain.linearRampToValueAtTime(0, now + duration);
    }
  }

  /**
   * Update surround sound configuration
   */
  updateSurroundConfig(trackId: string, config: SurroundConfig): void {
    const trackNode = this.tracks.get(trackId);
    if (!trackNode) return;

    // Stop current playback
    const wasPlaying = trackNode.isPlaying;
    const currentTime = wasPlaying ? this.audioContext.currentTime - trackNode.startTime : 0;

    if (wasPlaying) {
      this.stop(trackId);
    }

    // Create new surround nodes
    trackNode.surroundNodes = this.createSurroundNodes(config);

    // Resume playback if it was playing
    if (wasPlaying) {
      this.play(trackId, currentTime);
    }
  }

  /**
   * Update channel levels in real-time (without stopping playback)
   */
  updateChannelLevels(trackId: string, channels: SurroundConfig['channels']): void {
    const trackNode = this.tracks.get(trackId);
    if (!trackNode || !trackNode.surroundNodes?.surround) return;

    const { channelGains } = trackNode.surroundNodes.surround;

    // Update each channel gain
    Object.entries(channels).forEach(([channel, level]) => {
      const gainNode = channelGains[channel];
      if (gainNode && typeof level === 'number') {
        gainNode.gain.value = level / 100;
      }
    });
  }

  /**
   * Update spatial position and recalculate channel levels
   */
  updateSpatialPosition(
    trackId: string,
    position: { x: number; y: number; z: number },
    mode: '5.1' | '7.1'
  ): void {
    const channels = this.calculateSpatialChannels(position, mode);
    this.updateChannelLevels(trackId, channels);
  }

  /**
   * Calculate channel levels from spatial position
   */
  calculateSpatialChannels(
    position: { x: number; y: number; z: number },
    mode: '5.1' | '7.1'
  ): SurroundConfig['channels'] {
    const channels: SurroundConfig['channels'] = {};

    // Normalize position (-1 to 1 for x and y)
    const x = Math.max(-1, Math.min(1, position.x));
    const y = Math.max(-1, Math.min(1, position.y));
    const z = Math.max(0, Math.min(1, position.z));

    if (mode === '5.1') {
      // Front speakers (y > 0)
      const frontGain = Math.max(0, y);
      channels.frontLeft = Math.round(frontGain * Math.max(0, 1 - x) * 100);
      channels.frontRight = Math.round(frontGain * Math.max(0, 1 + x) * 100);
      channels.center = Math.round(frontGain * (1 - Math.abs(x)) * 100);

      // Surround speakers (y < 0)
      const surroundGain = Math.max(0, -y);
      channels.surroundLeft = Math.round(surroundGain * Math.max(0, 1 - x) * 100);
      channels.surroundRight = Math.round(surroundGain * Math.max(0, 1 + x) * 100);

      // LFE (subwoofer) - constant low level
      channels.lfe = 30;
    } else if (mode === '7.1') {
      // Front speakers
      const frontGain = Math.max(0, y);
      channels.frontLeft = Math.round(frontGain * Math.max(0, 1 - x) * 100);
      channels.frontRight = Math.round(frontGain * Math.max(0, 1 + x) * 100);
      channels.center = Math.round(frontGain * (1 - Math.abs(x)) * 100);

      // Side speakers (y ≈ 0)
      const sideGain = 1 - Math.abs(y);
      channels.sideLeft = Math.round(sideGain * Math.max(0, 1 - x) * 100);
      channels.sideRight = Math.round(sideGain * Math.max(0, 1 + x) * 100);

      // Surround back speakers (y < 0)
      const surroundGain = Math.max(0, -y);
      channels.surroundLeft = Math.round(surroundGain * Math.max(0, 1 - x) * 100);
      channels.surroundRight = Math.round(surroundGain * Math.max(0, 1 + x) * 100);

      // LFE
      channels.lfe = 30;
    }

    return channels;
  }

  /**
   * Get current playback time for a track
   */
  getCurrentTime(trackId: string): number {
    const trackNode = this.tracks.get(trackId);
    if (!trackNode) return 0;

    if (trackNode.isPlaying) {
      return this.audioContext.currentTime - trackNode.startTime;
    }

    return trackNode.pauseTime;
  }

  /**
   * Check if a track is playing
   */
  isPlaying(trackId: string): boolean {
    const trackNode = this.tracks.get(trackId);
    return trackNode?.isPlaying || false;
  }

  /**
   * Unload a track and free resources
   */
  unloadTrack(trackId: string): void {
    const trackNode = this.tracks.get(trackId);
    if (!trackNode) return;

    // Stop playback
    this.stop(trackId);

    // Disconnect nodes
    trackNode.gainNode.disconnect();
    if (trackNode.pannerNode) trackNode.pannerNode.disconnect();
    trackNode.limiter.disconnect();
    trackNode.voiceClarityNode.disconnect();

    // Remove from map
    this.tracks.delete(trackId);
  }

  /**
   * Set master volume
   */
  setMasterVolume(volume: number): void {
    this.masterGain.gain.value = volume / 100;
  }

  /**
   * Get audio context state
   */
  getState(): AudioContextState {
    return this.audioContext.state;
  }

  /**
   * Resume audio context (required for some browsers)
   */
  async resumeContext(): Promise<void> {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Close audio context and free all resources
   */
  async close(): Promise<void> {
    // Stop all tracks
    for (const trackId of this.tracks.keys()) {
      this.unloadTrack(trackId);
    }

    // Close audio context
    await this.audioContext.close();
  }
}

// Singleton instance
let audioEngineInstance: AudioEngine | null = null;

/**
 * Get the global AudioEngine instance
 */
export function getAudioEngine(): AudioEngine {
  if (!audioEngineInstance) {
    audioEngineInstance = new AudioEngine();
  }
  return audioEngineInstance;
}

/**
 * Destroy the global AudioEngine instance
 */
export async function destroyAudioEngine(): Promise<void> {
  if (audioEngineInstance) {
    await audioEngineInstance.close();
    audioEngineInstance = null;
  }
}
