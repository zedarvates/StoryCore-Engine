import { vi } from 'vitest';
import { LegacyAny } from '@/types/legacy';
import { AudioFileManager } from '../AudioFileManager';
import { AudioEngine } from '../AudioEngine';

describe('AudioFileManager', () => {
  let audioFileManager: AudioFileManager;
  let audioEngine: AudioEngine;

  beforeEach(() => {
    audioEngine = new AudioEngine();
    audioFileManager = new AudioFileManager(audioEngine);
  });

  it('should initialize correctly', () => {
    expect(audioFileManager).toBeDefined();
  });

  it('should save and load audio file', async () => {
    const mockBlob = new Blob(['mock-audio-data'], { type: 'audio/wav' });
    const filePath = await audioFileManager.saveAudioFile(mockBlob, 'test.wav');
    
    expect(filePath).toBeDefined();
    expect(typeof filePath).toBe('string');
  });

  it('should play audio file', async () => {
    // Mock Audio
    const mockAudio = {
      play: vi.fn(),
      oncanplaythrough: null as LegacyAny,
      onerror: null as LegacyAny
    };

    global.Audio = vi.fn().mockImplementation(() => {
      const instance = mockAudio as LegacyAny;
      instance.oncanplaythrough = null;
      instance.onerror = null;
      return instance;
    }) as LegacyAny;

    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(new Blob(['mock-audio-data'], { type: 'audio/wav' }))
    }) as LegacyAny;

    await audioFileManager.playAudioFile('mock-url');
    expect(mockAudio.play).toHaveBeenCalled();
  });

  it('should get audio metadata', async () => {
    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0))
    }) as LegacyAny;

    // Mock AudioContext
    const mockAudioContext = {
      decodeAudioData: vi.fn().mockResolvedValue({
        duration: 120,
        sampleRate: 44100
      })
    };

    global.AudioContext = vi.fn().mockImplementation(() => mockAudioContext) as LegacyAny;

    const metadata = await audioFileManager.getAudioMetadata('mock-url');
    
    expect(metadata.duration).toBe(120);
    expect(metadata.sampleRate).toBe(44100);
  });
});
