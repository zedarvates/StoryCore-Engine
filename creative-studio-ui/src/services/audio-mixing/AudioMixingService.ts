/**
 * Audio Mixing Service for StoryCore
 * 
 * Centralized audio mixing engine that provides:
 * - Multi-track audio composition
 * - Effects chain processing
 * - Ducking and crossfade
 * - Audio synchronization
 */

import {
  AudioTrack,
  AudioTrackState,
  AudioEffect,
  AudioEffectType,
  AudioEffectParameters,
  DuckingConfig,
  DuckingState,
  CrossfadeConfig,
  CrossfadeState,
  SyncConfig,
  SyncState,
  AudioMixingState,
  AudioMixingActions,
  ExportOptions,
  AudioEventMap,
  LevelMeter
} from './AudioMixingTypes';

// ============================================================================
// Event Emitter
// ============================================================================

type EventCallback<T extends keyof AudioEventMap> = 
  AudioEventMap[T] extends [] 
    ? () => void 
    : AudioEventMap[T] extends [infer T1] 
      ? (arg1: T1) => void 
      : never;

class AudioMixingEventEmitter {
  private events: Map<string, Set<Function>> = new Map();

  on<K extends keyof AudioEventMap>(event: K, callback: EventCallback<K>): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(callback);
  }

  off<K extends keyof AudioEventMap>(event: K, callback: EventCallback<K>): void {
    this.events.get(event)?.delete(callback);
  }

  emit<K extends keyof AudioEventMap>(event: K, ...args: AudioEventMap[K]): void {
    this.events.get(event)?.forEach(callback => {
      (callback as Function)(...args);
    });
  }
}

// ============================================================================
// Audio Mixing Service Implementation
// ============================================================================

class AudioMixingService implements AudioMixingActions {
  private state: AudioMixingState;
  private trackStates: Map<string, AudioTrackState>;
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private trackNodes: Map<string, {
    source: AudioBufferSourceNode | null;
    gain: GainNode;
    pan: StereoPannerNode;
    effects: Map<string, AudioNode>;
  }> = new Map();
  private duckingNodes: Map<string, {
    analyzer: AnalyserNode;
    gain: GainNode;
  }> = new Map();
  private duckingConfig: DuckingConfig | null = null;
  private duckingState: DuckingState = {
    currentDuckLevel: 1,
    isActive: false,
    releaseTime: 0
  };
  private crossfadeConfig: CrossfadeConfig | null = null;
  private crossfadeState: CrossfadeState = {
    progress: 0.5,
    volumeA: 1,
    volumeB: 1
  };
  private syncConfig: SyncConfig | null = null;
  private syncState: SyncState = {
    currentBeat: 0,
    currentBar: 0,
    currentPosition: 0,
    isSynced: false,
    drift: 0
  };
  private eventEmitter: AudioMixingEventEmitter;
  private animationFrameId: number | null = null;
  private startTime: number = 0;
  private pauseTime: number = 0;
  private isInitialized: boolean = false;

  constructor() {
    this.state = {
      tracks: new Map(),
      masterVolume: 1,
      masterMuted: false,
      isPlaying: false,
      currentTime: 0,
      totalDuration: 0,
      audioContextState: 'suspended',
      sampleRate: 44100,
      isRecording: false,
      recordingDuration: 0,
      error: null
    };
    this.trackStates = new Map();
    this.eventEmitter = new AudioMixingEventEmitter();
  }

  // ==========================================================================
  // Event Handling
  // ==========================================================================

  on<K extends keyof AudioEventMap>(event: K, callback: EventCallback<K>): void {
    this.eventEmitter.on(event, callback);
  }

  off<K extends keyof AudioEventMap>(event: K, callback: EventCallback<K>): void {
    this.eventEmitter.off(event, callback);
  }

  private emit<K extends keyof AudioEventMap>(event: K, ...args: AudioEventMap[K]): void {
    this.eventEmitter.emit(event, ...args);
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  async initialize(): Promise<void> {
    try {
      // Create audio context
      this.audioContext = new AudioContext();
      this.state.sampleRate = this.audioContext.sampleRate;

      // Create master gain node
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = this.state.masterVolume;

      this.state.audioContextState = this.audioContext.state;
      this.isInitialized = true;

      // Start level monitoring
      this.startLevelMonitoring();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.state.error = errorMessage;
      this.emit('error', errorMessage);
      throw error;
    }
  }

  dispose(): void {
    this.stop();

    // Dispose all track nodes
    this.trackNodes.forEach((nodes, trackId) => {
      this.disposeTrackNodes(trackId);
    });
    this.trackNodes.clear();

    // Dispose master gain
    this.masterGain?.disconnect();
    this.masterGain = null;

    // Dispose audio context
    this.audioContext?.close();
    this.audioContext = null;

    // Stop level monitoring
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.isInitialized = false;
  }

  private disposeTrackNodes(trackId: string): void {
    const nodes = this.trackNodes.get(trackId);
    if (nodes) {
      if (nodes.source) {
        try { nodes.source.stop(); } catch {}
        nodes.source.disconnect();
      }
      nodes.gain.disconnect();
      nodes.pan.disconnect();
      nodes.effects.forEach(effect => effect.disconnect());
      nodes.effects.clear();
    }
  }

  // ==========================================================================
  // Track Management
  // ==========================================================================

  addTrack(track: Omit<AudioTrack, 'id' | 'order'>): string {
    const id = `track-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const order = this.state.tracks.size;

    const newTrack: AudioTrack = {
      ...track,
      id,
      order
    };

    this.state.tracks.set(id, newTrack);
    this.trackStates.set(id, {
      currentTime: 0,
      isPlaying: false,
      currentVolume: track.volume,
      currentPan: track.pan,
      peakLevel: 0,
      rmsLevel: 0
    });

    this.calculateTotalDuration();
    this.emit('track:added', id);

    return id;
  }

  removeTrack(id: string): void {
    if (!this.state.tracks.has(id)) return;

    this.disposeTrackNodes(id);
    this.trackNodes.delete(id);
    this.trackStates.delete(id);
    this.state.tracks.delete(id);

    // Reorder remaining tracks
    let order = 0;
    this.state.tracks.forEach(track => {
      track.order = order;
      order++;
    });

    this.calculateTotalDuration();
    this.emit('track:removed', id);
  }

  updateTrack(id: string, updates: Partial<AudioTrack>): void {
    const track = this.state.tracks.get(id);
    if (!track) return;

    const newTrack = { ...track, ...updates };
    this.state.tracks.set(id, newTrack);

    // Update audio nodes if track is playing
    this.updateTrackNodes(id, newTrack);

    this.emit('track:updated', id, updates);
  }

  reorderTracks(trackIds: string[]): void {
    trackIds.forEach((id, index) => {
      const track = this.state.tracks.get(id);
      if (track) {
        track.order = index;
      }
    });
    this.emit('track:updated', 'reorder', {} as Partial<AudioTrack>);
  }

  duplicateTrack(id: string): string {
    const track = this.state.tracks.get(id);
    if (!track) throw new Error(`Track ${id} not found`);

    const { id: _, order: __, ...rest } = track;
    return this.addTrack({
      ...rest,
      name: `${track.name} (Copy)`
    });
  }

  // ==========================================================================
  // Track Nodes Management
  // ==========================================================================

  private async setupTrackNodes(trackId: string): Promise<void> {
    if (!this.audioContext || !this.masterGain) return;

    const track = this.state.tracks.get(trackId);
    if (!track) return;

    // Create gain node
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = track.volume;

    // Create pan node
    const panNode = this.audioContext.createStereoPanner();
    panNode.pan.value = track.pan;

    // Connect to master
    gainNode.connect(panNode);
    panNode.connect(this.masterGain);

    this.trackNodes.set(trackId, {
      source: null,
      gain: gainNode,
      pan: panNode,
      effects: new Map()
    });

    // Load audio buffer
    await this.loadAudioBuffer(trackId);
  }

  private async loadAudioBuffer(trackId: string): Promise<void> {
    const track = this.state.tracks.get(trackId);
    if (!track || !this.audioContext) return;

    const nodes = this.trackNodes.get(trackId);
    if (!nodes) return;

    try {
      // Fetch and decode audio
      const response = await fetch(track.src);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      // Store buffer duration
      track.duration = audioBuffer.duration;
      this.calculateTotalDuration();
    } catch (error) {
      console.error(`Failed to load audio for track ${trackId}:`, error);
    }
  }

  private updateTrackNodes(trackId: string, track: AudioTrack): void {
    const nodes = this.trackNodes.get(trackId);
    if (!nodes) return;

    // Update gain
    nodes.gain.gain.value = track.muted ? 0 : track.volume;

    // Update pan
    nodes.pan.pan.value = track.pan;
  }

  // ==========================================================================
  // Playback Control
  // ==========================================================================

  async play(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
      this.state.audioContextState = this.audioContext.state;
    }

    // Start all tracks
    this.state.tracks.forEach(async (track, trackId) => {
      await this.playTrack(trackId);
    });

    this.state.isPlaying = true;
    this.startTime = this.audioContext?.currentTime ?? 0 - this.pauseTime;
    this.emit('playback:started');
  }

  private async playTrack(trackId: string): Promise<void> {
    const track = this.state.tracks.get(trackId);
    const nodes = this.trackNodes.get(trackId);

    if (!track || !nodes || !this.audioContext) return;

    // Stop existing source
    nodes.source?.stop?.();

    // Create new source
    const source = this.audioContext.createBufferSource();
    source.buffer = await this.loadBufferForTrack(trackId);
    source.connect(nodes.gain);

    // Handle fade in
    if (track.fadeIn > 0) {
      nodes.gain.gain.setValueAtTime(0, this.audioContext.currentTime);
      nodes.gain.gain.linearRampToValueAtTime(
        track.volume,
        this.audioContext.currentTime + track.fadeIn
      );
    }

    source.start(0, this.state.currentTime);
    nodes.source = source;

    const trackState = this.trackStates.get(trackId);
    if (trackState) {
      trackState.isPlaying = true;
    }
  }

  private async loadBufferForTrack(trackId: string): Promise<AudioBuffer | null> {
    const track = this.state.tracks.get(trackId);
    if (!track || !this.audioContext) return null;

    try {
      const response = await fetch(track.src);
      const arrayBuffer = await response.arrayBuffer();
      return await this.audioContext.decodeAudioData(arrayBuffer);
    } catch {
      return null;
    }
  }

  pause(): void {
    this.state.isPlaying = false;
    this.pauseTime = this.state.currentTime;

    this.state.tracks.forEach((_, trackId) => {
      this.pauseTrack(trackId);
    });

    this.emit('playback:paused');
  }

  private pauseTrack(trackId: string): void {
    const nodes = this.trackNodes.get(trackId);
    if (nodes) {
      nodes.source?.stop?.();
      nodes.source = null;
    }

    const trackState = this.trackStates.get(trackId);
    if (trackState) {
      trackState.isPlaying = false;
    }
  }

  stop(): void {
    this.state.isPlaying = false;
    this.state.currentTime = 0;
    this.pauseTime = 0;

    this.state.tracks.forEach((_, trackId) => {
      this.pauseTrack(trackId);
    });

    this.emit('playback:stopped');
  }

  seek(time: number): void {
    const wasPlaying = this.state.isPlaying;

    if (wasPlaying) {
      this.state.isPlaying = false;
    }

    this.state.currentTime = Math.max(0, time);

    if (wasPlaying) {
      this.play();
    }

    this.emit('playback:seeked', time);
  }

  setMasterVolume(volume: number): void {
    this.state.masterVolume = Math.max(0, Math.min(1, volume));

    if (this.masterGain) {
      this.masterGain.gain.value = this.state.masterMuted ? 0 : volume;
    }
  }

  setMasterMuted(muted: boolean): void {
    this.state.masterMuted = muted;

    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : this.state.masterVolume;
    }
  }

  // ==========================================================================
  // Track Control
  // ==========================================================================

  setTrackVolume(id: string, volume: number): void {
    const track = this.state.tracks.get(id);
    if (!track) return;

    track.volume = Math.max(0, Math.min(1, volume));
    this.updateTrackNodes(id, track);

    const trackState = this.trackStates.get(id);
    if (trackState) {
      trackState.currentVolume = volume;
    }
  }

  setTrackPan(id: string, pan: number): void {
    const track = this.state.tracks.get(id);
    if (!track) return;

    track.pan = Math.max(-1, Math.min(1, pan));
    this.updateTrackNodes(id, track);

    const trackState = this.trackStates.get(id);
    if (trackState) {
      trackState.currentPan = pan;
    }
  }

  setTrackMuted(id: string, muted: boolean): void {
    const track = this.state.tracks.get(id);
    if (!track) return;

    track.muted = muted;
    this.updateTrackNodes(id, track);
  }

  setTrackSolo(id: string, solo: boolean): void {
    const track = this.state.tracks.get(id);
    if (!track) return;

    track.solo = solo;

    // If any track is soloed, mute all non-solo tracks
    const hasSolo = Array.from(this.state.tracks.values()).some(t => t.solo);
    this.state.tracks.forEach(t => {
      if (hasSolo) {
        t.muted = !t.solo;
      } else {
        t.muted = false;
      }
      this.updateTrackNodes(t.id, t);
    });
  }

  setTrackFadeIn(id: string, duration: number): void {
    const track = this.state.tracks.get(id);
    if (!track) return;

    track.fadeIn = Math.max(0, duration);
  }

  setTrackFadeOut(id: string, duration: number): void {
    const track = this.state.tracks.get(id);
    if (!track) return;

    track.fadeOut = Math.max(0, duration);
  }

  // ==========================================================================
  // Effects Management
  // ==========================================================================

  addEffect(trackId: string, effect: Omit<AudioEffect, 'id' | 'order'>): void {
    const track = this.state.tracks.get(trackId);
    if (!track) return;

    const id = `effect-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const order = track.effects.length;

    const newEffect: AudioEffect = {
      ...effect,
      id,
      order
    };

    track.effects.push(newEffect);
    this.buildEffectChain(trackId);

    this.emit('effect:added', trackId, id);
  }

  removeEffect(trackId: string, effectId: string): void {
    const track = this.state.tracks.get(trackId);
    if (!track) return;

    const index = track.effects.findIndex(e => e.id === effectId);
    if (index === -1) return;

    track.effects.splice(index, 1);

    // Reorder effects
    track.effects.forEach((effect, i) => {
      effect.order = i;
    });

    this.buildEffectChain(trackId);
    this.emit('effect:removed', trackId, effectId);
  }

  updateEffect(trackId: string, effectId: string, updates: Partial<AudioEffect>): void {
    const track = this.state.tracks.get(trackId);
    if (!track) return;

    const effect = track.effects.find(e => e.id === effectId);
    if (!effect) return;

    Object.assign(effect, updates);
    this.updateEffectNode(trackId, effectId, effect);

    this.emit('effect:updated', trackId, effectId, updates);
  }

  reorderEffects(trackId: string, effectIds: string[]): void {
    const track = this.state.tracks.get(trackId);
    if (!track) return;

    const reorderedEffects: AudioEffect[] = [];
    effectIds.forEach((id, index) => {
      const effect = track.effects.find(e => e.id === id);
      if (effect) {
        effect.order = index;
        reorderedEffects.push(effect);
      }
    });

    track.effects = reorderedEffects;
    this.buildEffectChain(trackId);
  }

  private buildEffectChain(trackId: string): void {
    const track = this.state.tracks.get(trackId);
    const nodes = this.trackNodes.get(trackId);

    if (!track || !nodes || !this.audioContext) return;

    // Remove existing effect nodes
    nodes.effects.forEach(effect => effect.disconnect());
    nodes.effects.clear();

    // Create new effect nodes
    track.effects
      .sort((a, b) => a.order - b.order)
      .forEach(effect => {
        const node = this.createEffectNode(effect);
        if (node) {
          nodes.effects.set(effect.id, node);
        }
      });

    // Reconnect the chain
    this.reconnectEffectChain(trackId);
  }

  private createEffectNode(effect: AudioEffect): AudioNode | null {
    if (!this.audioContext) return null;

    switch (effect.type) {
      case 'gain': {
        const node = this.audioContext.createGain();
        node.gain.value = effect.parameters.gain ?? 1;
        return node;
      }
      case 'compressor': {
        const node = this.audioContext.createDynamicsCompressor();
        node.threshold.value = effect.parameters.threshold ?? -24;
        node.ratio.value = effect.parameters.ratio ?? 4;
        node.attack.value = effect.parameters.attack ?? 0.003;
        node.release.value = effect.parameters.release ?? 0.25;
        node.knee.value = effect.parameters.knee ?? 30;
        return node;
      }
      case 'filter': {
        const node = this.audioContext.createBiquadFilter();
        node.type = effect.parameters.filterType ?? 'lowpass';
        node.frequency.value = effect.parameters.filterFreq ?? 1000;
        node.Q.value = effect.parameters.filterQ ?? 1;
        return node;
      }
      default:
        return null;
    }
  }

  private updateEffectNode(trackId: string, effectId: string, effect: AudioEffect): void {
    const nodes = this.trackNodes.get(trackId);
    const node = nodes?.effects.get(effectId);

    if (!node) return;

    switch (effect.type) {
      case 'gain':
        if (node instanceof GainNode) {
          node.gain.value = effect.parameters.gain ?? 1;
        }
        break;
      case 'compressor':
        if (node instanceof DynamicsCompressorNode) {
          node.threshold.value = effect.parameters.threshold ?? -24;
          node.ratio.value = effect.parameters.ratio ?? 4;
          node.attack.value = effect.parameters.attack ?? 0.003;
          node.release.value = effect.parameters.release ?? 0.25;
        }
        break;
    }
  }

  private reconnectEffectChain(trackId: string): void {
    const nodes = this.trackNodes.get(trackId);
    if (!nodes) return;

    const effects = Array.from(nodes.effects.values());

    if (effects.length === 0) {
      nodes.gain.disconnect();
      nodes.gain.connect(nodes.pan);
    } else {
      nodes.gain.disconnect();

      // Connect in order
      nodes.gain.connect(effects[0]);
      for (let i = 0; i < effects.length - 1; i++) {
        effects[i].disconnect();
        effects[i].connect(effects[i + 1]);
      }
      effects[effects.length - 1].disconnect();
      effects[effects.length - 1].connect(nodes.pan);
    }
  }

  // ==========================================================================
  // Ducking
  // ==========================================================================

  setDucking(config: DuckingConfig): void {
    this.duckingConfig = config;

    // Create ducking nodes for target track
    if (this.audioContext) {
      const nodes = this.trackNodes.get(config.targetTrackId);
      if (nodes && !this.duckingNodes.has(config.targetTrackId)) {
        const analyzer = this.audioContext.createAnalyser();
        const gain = this.audioContext.createGain();
        gain.gain.value = 1;

        nodes.gain.disconnect();
        nodes.gain.connect(gain);
        gain.connect(nodes.pan);

        this.duckingNodes.set(config.targetTrackId, { analyzer, gain });
      }
    }
  }

  disableDucking(): void {
    this.duckingConfig = null;
    this.duckingState = {
      currentDuckLevel: 1,
      isActive: false,
      releaseTime: 0
    };
  }

  // ==========================================================================
  // Crossfade
  // ==========================================================================

  setCrossfade(config: CrossfadeConfig): void {
    this.crossfadeConfig = config;
    this.updateCrossfadeVolumes();
  }

  setCrossfadeProgress(progress: number): void {
    this.crossfadeState.progress = Math.max(0, Math.min(1, progress));
    this.updateCrossfadeVolumes();
  }

  private updateCrossfadeVolumes(): void {
    if (!this.crossfadeConfig) return;

    const { progress } = this.crossfadeState;
    const type = this.crossfadeConfig.type;

    switch (type) {
      case 'linear':
        this.crossfadeState.volumeA = 1 - progress;
        this.crossfadeState.volumeB = progress;
        break;
      case 'equal_power':
        this.crossfadeState.volumeA = Math.cos((1 - progress) * Math.PI / 2);
        this.crossfadeState.volumeB = Math.cos(progress * Math.PI / 2);
        break;
      case 'equal_gain':
        this.crossfadeState.volumeA = 1 - progress;
        this.crossfadeState.volumeB = progress;
        break;
    }
  }

  // ==========================================================================
  // Synchronization
  // ==========================================================================

  setSync(config: SyncConfig): void {
    this.syncConfig = config;
    this.syncState.isSynced = true;
  }

  // ==========================================================================
  // Recording
  // ==========================================================================

  startRecording(): void {
    this.state.isRecording = true;
    this.state.recordingDuration = 0;
    this.emit('recording:started');
  }

  stopRecording(): void {
    this.state.isRecording = false;
    this.emit('recording:stopped', new Blob());
  }

  // ==========================================================================
  // Export
  // ==========================================================================

  async exportMix(format: 'wav' | 'mp3' | 'ogg', options?: ExportOptions): Promise<Blob> {
    this.emit('export:started');

    const sampleRate = options?.sampleRate || 44100;
    const duration = this.state.totalDuration;
    const numberOfChannels = options?.channels || 2;

    // Create offline context
    const offlineContext = new OfflineAudioContext(
      numberOfChannels,
      sampleRate * duration,
      sampleRate
    );

    // Render all tracks to offline context
    // This is a simplified implementation
    // In production, you would render each track and mix them

    const renderedBuffer = await offlineContext.startRendering();

    // Convert to blob
    const blob = this.bufferToWav(renderedBuffer);

    this.emit('export:completed', blob);
    return blob;
  }

  private bufferToWav(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const data = buffer.getChannelData(0);
    const samples = data.length;

    const bufferSize = 44 + samples * blockAlign;
    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);

    // Write WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, bufferSize - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, samples * blockAlign, true);

    // Write audio data
    const offset = 44;
    for (let i = 0; i < samples; i++) {
      const sample = Math.max(-1, Math.min(1, data[i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset + i * 2, intSample, true);
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  // ==========================================================================
  // Level Monitoring
  // ==========================================================================

  private startLevelMonitoring(): void {
    const updateLevels = () => {
      this.trackNodes.forEach((nodes, trackId) => {
        const analyzer = this.duckingNodes.get(trackId)?.analyzer;
        if (analyzer) {
          const dataArray = new Uint8Array(analyzer.frequencyBinCount);
          analyzer.getByteTimeDomainData(dataArray);

          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const normalized = (dataArray[i] - 128) / 128;
            sum += normalized * normalized;
          }
          const rms = Math.sqrt(sum / dataArray.length);
          const peak = Math.max(...dataArray.map(v => Math.abs((v - 128) / 128)));

          const trackState = this.trackStates.get(trackId);
          if (trackState) {
            trackState.peakLevel = peak;
            trackState.rmsLevel = rms;
          }

          this.emit('levelupdate', trackId, peak, rms);
        }
      });

      this.animationFrameId = requestAnimationFrame(updateLevels);
    };

    updateLevels();
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  private calculateTotalDuration(): void {
    let maxDuration = 0;
    this.state.tracks.forEach(track => {
      const endTime = track.startTime + track.duration;
      if (endTime > maxDuration) {
        maxDuration = endTime;
      }
    });
    this.state.totalDuration = maxDuration;
  }

  // ==========================================================================
  // Getters
  // ==========================================================================

  getState(): AudioMixingState {
    return { ...this.state, tracks: new Map(this.state.tracks) };
  }

  getTrackState(id: string): AudioTrackState | undefined {
    return this.trackStates.get(id);
  }

  getDuckingState(): DuckingState {
    return { ...this.duckingState };
  }

  getCrossfadeState(): CrossfadeState {
    return { ...this.crossfadeState };
  }

  getSyncState(): SyncState {
    return { ...this.syncState };
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const audioMixingService = new AudioMixingService();

// ============================================================================
// Default Configurations
// ============================================================================

export const defaultDuckingConfig: DuckingConfig = {
  enabled: false,
  targetTrackId: '',
  triggerTrackId: '',
  threshold: -30,
  duckAmount: -20,
  attack: 0.01,
  release: 0.3,
  hold: 0.1,
  range: 40
};

export const defaultCrossfadeConfig: CrossfadeConfig = {
  type: 'equal_power',
  duration: 2,
  autoCrossfade: false
};

export const defaultSyncConfig: SyncConfig = {
  masterTempo: 120,
  quantizeTo: 'bar',
  timeSignatureNumerator: 4,
  timeSignatureDenominator: 4,
  frameOffset: 0,
  syncToExternal: false
};

export const defaultExportOptions: ExportOptions = {
  sampleRate: 44100,
  bitDepth: 16,
  channels: 2
};
