import { vi } from 'vitest';
import { LegacyAny } from '@/types/legacy';
import { AudioRecorder } from '../AudioRecorder';
import { AudioFileManager } from '../AudioFileManager';

describe('AudioRecorder', () => {
  let audioRecorder: AudioRecorder;
  let audioFileManager: AudioFileManager;

  beforeEach(() => {
    audioFileManager = new AudioFileManager(null as LegacyAny);
    audioRecorder = new AudioRecorder(audioFileManager);
  });

  afterEach(async () => {
    await audioRecorder.close();
  });

  it('should initialize correctly', () => {
    expect(audioRecorder).toBeDefined();
    expect(audioRecorder.isRecordingActive()).toBe(false);
  });

  it('should start and stop recording', async () => {
    // Mock getUserMedia
    const mockStream = {
      getTracks: () => [
        {
          stop: vi.fn()
        }
      ]
    };
    
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue(mockStream) },
    });

    // Mock MediaRecorder
    const mockMediaRecorder = {
      start: vi.fn(),
      stop: vi.fn(),
      ondataavailable: null as LegacyAny,
      onstop: null as LegacyAny
    };

    global.MediaRecorder = vi.fn().mockImplementation(() => {
      const instance = mockMediaRecorder as LegacyAny;
      instance.ondataavailable = null;
      instance.onstop = null;
      return instance;
    }) as LegacyAny;

    // Mock saveAudioFile
    vi.spyOn(audioFileManager, 'saveAudioFile').mockResolvedValue('mock-url');

    // Start recording
    await audioRecorder.startRecording();
    expect(audioRecorder.isRecordingActive()).toBe(true);

    // Stop recording
    const filePath = await audioRecorder.stopRecording();
    expect(filePath).toBe('mock-url');
    expect(audioRecorder.isRecordingActive()).toBe(false);
  });

  it('should throw error when stopping without recording', async () => {
    await expect(audioRecorder.stopRecording()).rejects.toThrow('Aucun enregistrement en cours');
  });
});
