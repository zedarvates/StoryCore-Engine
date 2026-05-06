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
          stop: jest.fn()
        }
      ]
    };
    
    global.navigator.mediaDevices = {
      getUserMedia: jest.fn().mockResolvedValue(mockStream as LegacyAny)
    } as LegacyAny;

    // Mock MediaRecorder
    const mockMediaRecorder = {
      start: jest.fn(),
      stop: jest.fn(),
      ondataavailable: null as LegacyAny,
      onstop: null as LegacyAny
    };

    global.MediaRecorder = jest.fn().mockImplementation(() => {
      const instance = mockMediaRecorder as LegacyAny;
      instance.ondataavailable = null;
      instance.onstop = null;
      return instance;
    }) as LegacyAny;

    // Mock saveAudioFile
    jest.spyOn(audioFileManager, 'saveAudioFile').mockResolvedValue('mock-url');

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
