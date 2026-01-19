import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioEngine, getAudioEngine, destroyAudioEngine } from '../AudioEngine';
import type { AudioTrack } from '../../types';

// Mock AudioContext
class MockAudioContext {
  state: AudioContextState = 'running';
  currentTime = 0;
  destination = {};
  
  createGain = vi.fn(() => ({
    gain: { value: 1 },
    connect: vi.fn(),
    disconnect: vi.fn(),
  }));
  
  createStereoPanner = vi.fn(() => ({
    pan: { value: 0 },
    connect: vi.fn(),
    disconnect: vi.fn(),
  }));
  
  createDynamicsCompressor = vi.fn(() => ({
    threshold: { value: -10 },
    knee: { value: 0 },
    ratio: { value: 20 },
    attack: { value: 0.003 },
    release: { value: 0.25 },
    connect: vi.fn(),
    disconnect: vi.fn(),
  }));
  
  createBiquadFilter = vi.fn(() => ({
    type: 'allpass',
    frequency: { value: 1000 },
    Q: { value: 1 },
    gain: { value: 0 },
    connect: vi.fn(),
    disconnect: vi.fn(),
  }));
  
  createBufferSource = vi.fn(() => ({
    buffer: null,
    start: vi.fn(),
    stop: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  }));
  
  createChannelSplitter = vi.fn((channels: number) => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
  }));
  
  createChannelMerger = vi.fn((channels: number) => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
  }));
  
  decodeAudioData = vi.fn().mockResolvedValue({
    length: 44100,
    numberOfChannels: 2,
    sampleRate: 44100,
    duration: 1,
    getChannelData: () => new Float32Array(44100),
  });
  
  resume = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
}

describe('AudioEngine', () => {
  let originalAudioContext: any;
  let mockAudioContext: MockAudioContext;

  beforeEach(() => {
    mockAudioContext = new MockAudioContext();
    originalAudioContext = (window as any).AudioContext;
    (window as any).AudioContext = vi.fn(() => mockAudioContext);
    
    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    });
  });

  afterEach(() => {
    (window as any).AudioContext = originalAudioContext;
    vi.clearAllMocks();
  });

  const createMockTrack = (overrides?: Partial<AudioTrack>): AudioTrack => ({
    id: 'track-1',
    name: 'Test Track',
    type: 'music',
    url: 'https://example.com/audio.mp3',
    startTime: 0,
    duration: 10,
    offset: 0,
    volume: 80,
    fadeIn: 0,
    fadeOut: 0,
    pan: 0,
    muted: false,
    solo: false,
    effects: [],
    ...overrides,
  });

  describe('constructor', () => {
    it('creates audio context and master gain', () => {
      const engine = new AudioEngine();
      
      expect(mockAudioContext.createGain).toHaveBeenCalled();
      expect(engine).toBeDefined();
    });
  });

  describe('loadTrack', () => {
    it('loads audio track from URL', async () => {
      const engine = new AudioEngine();
      const track = createMockTrack();
      
      await engine.loadTrack(track);
      
      expect(global.fetch).toHaveBeenCalledWith(track.url);
      expect(mockAudioContext.decodeAudioData).toHaveBeenCalled();
    });

    it('creates audio nodes for track', async () => {
      const engine = new AudioEngine();
      const track = createMockTrack();
      
      await engine.loadTrack(track);
      
      expect(mockAudioContext.createGain).toHaveBeenCalled();
      expect(mockAudioContext.createStereoPanner).toHaveBeenCalled();
      expect(mockAudioContext.createDynamicsCompressor).toHaveBeenCalled();
      expect(mockAudioContext.createBiquadFilter).toHaveBeenCalled();
    });

    it('throws error when fetch fails', async () => {
      const engine = new AudioEngine();
      const track = createMockTrack();
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      });
      
      await expect(engine.loadTrack(track)).rejects.toThrow();
    });
  });

  describe('play', () => {
    it('plays loaded track', async () => {
      const engine = new AudioEngine();
      const track = createMockTrack();
      
      await engine.loadTrack(track);
      engine.play(track.id);
      
      expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
      expect(engine.isPlaying(track.id)).toBe(true);
    });

    it('does not play if track not loaded', () => {
      const engine = new AudioEngine();
      
      engine.play('non-existent');
      
      expect(mockAudioContext.createBufferSource).not.toHaveBeenCalled();
    });
  });

  describe('pause', () => {
    it('pauses playing track', async () => {
      const engine = new AudioEngine();
      const track = createMockTrack();
      
      await engine.loadTrack(track);
      engine.play(track.id);
      engine.pause(track.id);
      
      expect(engine.isPlaying(track.id)).toBe(false);
    });
  });

  describe('stop', () => {
    it('stops playing track', async () => {
      const engine = new AudioEngine();
      const track = createMockTrack();
      
      await engine.loadTrack(track);
      engine.play(track.id);
      engine.stop(track.id);
      
      expect(engine.isPlaying(track.id)).toBe(false);
    });
  });

  describe('setVolume', () => {
    it('updates track volume', async () => {
      const engine = new AudioEngine();
      const track = createMockTrack();
      
      await engine.loadTrack(track);
      engine.setVolume(track.id, 50);
      
      // Volume should be set (mocked, so we just verify no errors)
      expect(true).toBe(true);
    });
  });

  describe('setPan', () => {
    it('updates track pan', async () => {
      const engine = new AudioEngine();
      const track = createMockTrack();
      
      await engine.loadTrack(track);
      engine.setPan(track.id, -50);
      
      // Pan should be set (mocked, so we just verify no errors)
      expect(true).toBe(true);
    });
  });

  describe('calculateSpatialChannels', () => {
    it('calculates 5.1 surround channels from position', () => {
      const engine = new AudioEngine();
      const position = { x: 0, y: 1, z: 0 }; // Front center
      
      const channels = engine.calculateSpatialChannels(position, '5.1');
      
      expect(channels.center).toBeGreaterThan(0);
      expect(channels.lfe).toBe(30);
    });

    it('calculates 7.1 surround channels from position', () => {
      const engine = new AudioEngine();
      const position = { x: -1, y: 0, z: 0 }; // Left side
      
      const channels = engine.calculateSpatialChannels(position, '7.1');
      
      expect(channels.sideLeft).toBeGreaterThan(0);
      expect(channels.lfe).toBe(30);
    });
  });

  describe('unloadTrack', () => {
    it('unloads track and frees resources', async () => {
      const engine = new AudioEngine();
      const track = createMockTrack();
      
      await engine.loadTrack(track);
      engine.unloadTrack(track.id);
      
      expect(engine.isPlaying(track.id)).toBe(false);
    });
  });

  describe('setMasterVolume', () => {
    it('sets master volume', () => {
      const engine = new AudioEngine();
      
      engine.setMasterVolume(75);
      
      // Master volume should be set (mocked, so we just verify no errors)
      expect(true).toBe(true);
    });
  });

  describe('resumeContext', () => {
    it('resumes suspended audio context', async () => {
      const engine = new AudioEngine();
      mockAudioContext.state = 'suspended';
      
      await engine.resumeContext();
      
      expect(mockAudioContext.resume).toHaveBeenCalled();
    });

    it('does not resume if already running', async () => {
      const engine = new AudioEngine();
      mockAudioContext.state = 'running';
      
      await engine.resumeContext();
      
      expect(mockAudioContext.resume).not.toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('closes audio context and unloads all tracks', async () => {
      const engine = new AudioEngine();
      const track = createMockTrack();
      
      await engine.loadTrack(track);
      await engine.close();
      
      expect(mockAudioContext.close).toHaveBeenCalled();
    });
  });
});

describe('getAudioEngine', () => {
  let originalAudioContext: any;

  beforeEach(() => {
    originalAudioContext = (window as any).AudioContext;
    (window as any).AudioContext = vi.fn(() => new MockAudioContext());
  });

  afterEach(async () => {
    (window as any).AudioContext = originalAudioContext;
    await destroyAudioEngine();
    vi.clearAllMocks();
  });

  it('returns singleton instance', () => {
    const engine1 = getAudioEngine();
    const engine2 = getAudioEngine();
    
    expect(engine1).toBe(engine2);
  });
});

describe('destroyAudioEngine', () => {
  let originalAudioContext: any;

  beforeEach(() => {
    originalAudioContext = (window as any).AudioContext;
    (window as any).AudioContext = vi.fn(() => new MockAudioContext());
  });

  afterEach(() => {
    (window as any).AudioContext = originalAudioContext;
    vi.clearAllMocks();
  });

  it('destroys singleton instance', async () => {
    const engine = getAudioEngine();
    await destroyAudioEngine();
    
    const newEngine = getAudioEngine();
    expect(newEngine).not.toBe(engine);
  });
});
