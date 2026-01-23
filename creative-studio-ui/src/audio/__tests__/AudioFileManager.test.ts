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
      play: jest.fn(),
      oncanplaythrough: null as any,
      onerror: null as any
    };

    global.Audio = jest.fn().mockImplementation(() => {
      const instance = mockAudio as any;
      instance.oncanplaythrough = null;
      instance.onerror = null;
      return instance;
    }) as any;

    // Mock fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      blob: jest.fn().mockResolvedValue(new Blob(['mock-audio-data'], { type: 'audio/wav' }))
    }) as any;

    await audioFileManager.playAudioFile('mock-url');
    expect(mockAudio.play).toHaveBeenCalled();
  });

  it('should get audio metadata', async () => {
    // Mock fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0))
    }) as any;

    // Mock AudioContext
    const mockAudioContext = {
      decodeAudioData: jest.fn().mockResolvedValue({
        duration: 120,
        sampleRate: 44100
      })
    };

    global.AudioContext = jest.fn().mockImplementation(() => mockAudioContext) as any;

    const metadata = await audioFileManager.getAudioMetadata('mock-url');
    
    expect(metadata.duration).toBe(120);
    expect(metadata.sampleRate).toBe(44100);
  });
});
