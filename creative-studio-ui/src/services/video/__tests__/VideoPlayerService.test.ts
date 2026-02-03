/**
 * VideoPlayerService Unit Tests
 */

import { VideoPlayerService } from '../VideoPlayerService';

// Mock HTMLVideoElement
const createMockVideoElement = () => {
  const video = {
    play: jest.fn().mockResolvedValue(undefined),
    pause: jest.fn(),
    stop: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    load: jest.fn(),
    duration: 120,
    currentTime: 0,
    videoWidth: 1920,
    videoHeight: 1080,
    volume: 1,
    muted: false,
    loop: false,
    playbackRate: 1,
    error: null,
    buffered: { length: 0, end: () => 0 },
  };
  return video;
};

describe('VideoPlayerService', () => {
  let service: VideoPlayerService;
  let mockVideo: ReturnType<typeof createMockVideoElement>;

  beforeEach(() => {
    service = new VideoPlayerService();
    mockVideo = createMockVideoElement();
    jest.clearAllMocks();
  });

  afterEach(() => {
    service.destroy();
  });

  describe('Initialization', () => {
    it('initializes with default configuration', () => {
      const status = service.getStatus();
      expect(status.state).toBe('idle');
      expect(status.volume).toBe(1);
      expect(status.playbackRate).toBe(1);
    });

    it('initializes with video element', () => {
      service.initialize(mockVideo as unknown as HTMLVideoElement);
      expect(service.isLoaded()).toBe(true);
      expect(service.isReady()).toBe(true);
    });

    it('attaches event listeners on initialization', () => {
      service.initialize(mockVideo as unknown as HTMLVideoElement);
      expect(mockVideo.addEventListener).toHaveBeenCalledWith('timeupdate', expect.any(Function));
      expect(mockVideo.addEventListener).toHaveBeenCalledWith('play', expect.any(Function));
      expect(mockVideo.addEventListener).toHaveBeenCalledWith('pause', expect.any(Function));
      expect(mockVideo.addEventListener).toHaveBeenCalledWith('ended', expect.any(Function));
    });
  });

  describe('Playback Controls', () => {
    beforeEach(() => {
      service.initialize(mockVideo as unknown as HTMLVideoElement);
    });

    it('plays video', async () => {
      await service.play();
      expect(mockVideo.play).toHaveBeenCalledTimes(1);
    });

    it('pauses video', () => {
      service.pause();
      expect(mockVideo.pause).toHaveBeenCalledTimes(1);
    });

    it('stops video and resets time', () => {
      service.stop();
      expect(mockVideo.pause).toHaveBeenCalled();
      expect(mockVideo.currentTime).toBe(0);
    });

    it('toggles play/pause', async () => {
      await service.togglePlay();
      expect(mockVideo.play).toHaveBeenCalledTimes(1);

      await service.togglePlay();
      expect(mockVideo.pause).toHaveBeenCalledTimes(1);
    });
  });

  describe('Seeking', () => {
    beforeEach(() => {
      service.initialize(mockVideo as unknown as HTMLVideoElement);
    });

    it('seeks to specific time', async () => {
      await service.seek(30);
      expect(mockVideo.currentTime).toBe(30);
    });

    it('seeks to specific frame', async () => {
      await service.seekToFrame(900); // 30fps * 30s = 900 frames
      expect(mockVideo.currentTime).toBe(30);
    });

    it('steps forward by frames', async () => {
      mockVideo.currentTime = 0;
      await service.stepForward(5);
      expect(mockVideo.currentTime).toBeGreaterThan(0);
    });

    it('steps backward by frames', async () => {
      mockVideo.currentTime = 1;
      await service.stepBackward(5);
      expect(mockVideo.currentTime).toBeLessThanOrEqual(0);
    });
  });

  describe('Playback Rate', () => {
    beforeEach(() => {
      service.initialize(mockVideo as unknown as HTMLVideoElement);
    });

    it('sets playback rate', () => {
      service.setPlaybackRate(2);
      expect(service.getStatus().playbackRate).toBe(2);
    });

    it('throws on invalid playback rate', () => {
      // @ts-expect-error - Testing invalid rate
      expect(() => service.setPlaybackRate(99)).toThrow();
    });
  });

  describe('Volume Controls', () => {
    beforeEach(() => {
      service.initialize(mockVideo as unknown as HTMLVideoElement);
    });

    it('sets volume', () => {
      service.setVolume(0.5);
      expect(service.getStatus().volume).toBe(0.5);
    });

    it('clamps volume between 0 and 1', () => {
      service.setVolume(1.5);
      expect(service.getStatus().volume).toBe(1);

      service.setVolume(-0.5);
      expect(service.getStatus().volume).toBe(0);
    });

    it('toggles mute', () => {
      service.toggleMute();
      expect(service.getStatus().isMuted).toBe(true);
      service.toggleMute();
      expect(service.getStatus().isMuted).toBe(false);
    });
  });

  describe('Loop Control', () => {
    beforeEach(() => {
      service.initialize(mockVideo as unknown as HTMLVideoElement);
    });

    it('toggles loop', () => {
      service.toggleLoop();
      expect(service.getStatus().isLooping).toBe(true);
      service.toggleLoop();
      expect(service.getStatus().isLooping).toBe(false);
    });
  });

  describe('Event System', () => {
    beforeEach(() => {
      service.initialize(mockVideo as unknown as HTMLVideoElement);
    });

    it('registers event listeners', () => {
      const callback = jest.fn();
      service.on('play', callback);
      
      // Trigger play event
      const playHandler = mockVideo.addEventListener.mock.calls.find(
        (call: unknown[]) => call[0] === 'play'
      )?.[1];
      if (playHandler) playHandler();
      
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('removes event listeners', () => {
      const callback = jest.fn();
      service.on('play', callback);
      service.off('play', callback);
      
      const playHandler = mockVideo.addEventListener.mock.calls.find(
        (call: unknown[]) => call[0] === 'play'
      )?.[1];
      if (playHandler) playHandler();
      
      expect(callback).not.toHaveBeenCalled();
    });

    it('registers one-time event listeners', () => {
      const callback = jest.fn();
      service.once('play', callback);
      
      const playHandler = mockVideo.addEventListener.mock.calls.find(
        (call: unknown[]) => call[0] === 'play'
      )?.[1];
      if (playHandler) playHandler();
      
      expect(callback).toHaveBeenCalledTimes(1);
      
      // Second call should not trigger callback
      if (playHandler) playHandler();
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Status Queries', () => {
    beforeEach(() => {
      service.initialize(mockVideo as unknown as HTMLVideoElement);
    });

    it('returns isPlaying correctly', () => {
      expect(service.isPlaying()).toBe(false);
    });

    it('returns isMuted correctly', () => {
      expect(service.isMuted()).toBe(false);
    });

    it('returns isLooping correctly', () => {
      expect(service.isLooping()).toBe(false);
    });

    it('returns isReady correctly', () => {
      expect(service.isReady()).toBe(true);
    });

    it('returns isLoaded correctly', () => {
      expect(service.isLoaded()).toBe(true);
    });
  });

  describe('Frame Information', () => {
    beforeEach(() => {
      service.initialize(mockVideo as unknown as HTMLVideoElement);
    });

    it('returns current frame info', () => {
      const frameInfo = service.getCurrentFrameInfo();
      expect(frameInfo).toHaveProperty('frameNumber');
      expect(frameInfo).toHaveProperty('timestamp');
      expect(frameInfo).toHaveProperty('width');
      expect(frameInfo).toHaveProperty('height');
    });

    it('returns total frames', () => {
      const totalFrames = service.getTotalFrames();
      expect(totalFrames).toBeGreaterThanOrEqual(0);
    });

    it('returns current FPS', () => {
      const fps = service.getCurrentFps();
      expect(fps).toBeGreaterThanOrEqual(0);
    });

    it('returns formatted time', () => {
      const time = service.getFormattedTime();
      expect(typeof time).toBe('string');
    });

    it('returns formatted timecode', () => {
      const timecode = service.getFormattedTimecode();
      expect(typeof timecode).toBe('string');
      expect(timecode).toMatch(/^\d{2}:\d{2}:\d{2}:\d{2}$/);
    });
  });

  describe('Detach', () => {
    it('removes event listeners on detach', () => {
      service.initialize(mockVideo as unknown as HTMLVideoElement);
      service.detach();
      
      expect(mockVideo.removeEventListener).toHaveBeenCalled();
    });

    it('resets state on detach', () => {
      service.initialize(mockVideo as unknown as HTMLVideoElement);
      service.detach();
      
      expect(service.isLoaded()).toBe(false);
      expect(service.getStatus().state).toBe('idle');
    });
  });

  describe('Destroy', () => {
    it('clears all state on destroy', () => {
      service.initialize(mockVideo as unknown as HTMLVideoElement);
      service.destroy();
      
      expect(service.isLoaded()).toBe(false);
      expect(service.isPlaying()).toBe(false);
    });
  });
});


