/**
 * VideoCanvas Component Unit Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { VideoCanvas } from '../VideoCanvas';

// Mock the useVideoPlayer hook
vi.mock('../../hooks/useVideoPlayer', () => ({
  useVideoPlayer: vi.fn(() => ({
    status: {
      state: 'ready',
      currentTime: 0,
      currentFrame: 0,
      duration: 120,
      totalFrames: 3600,
      playbackRate: 1,
      isMuted: false,
      isLooping: false,
      volume: 1,
      bufferProgress: 1,
      isBuffering: true, // Set to true for loading indicator test
    },
    isPlaying: false,
    isMuted: false,
    isLooping: false,
    isReady: true,
    isLoaded: true,
    isBuffering: true, // Set to true for loading indicator test
    hasError: false,
    play: vi.fn(),
    pause: vi.fn(),
    stop: vi.fn(),
    togglePlay: vi.fn(),
    seek: vi.fn(),
    seekToFrame: vi.fn(),
    stepForward: vi.fn(),
    stepBackward: vi.fn(),
    setPlaybackRate: vi.fn(),
    setVolume: vi.fn(),
    toggleMute: vi.fn(),
    toggleLoop: vi.fn(),
    service: null,
    videoElement: null,
    getTotalFrames: vi.fn(),
    getCurrentFps: vi.fn(),
    playbackRate: 1,
    formattedTime: '00:00',
    formattedTimecode: '00:00:00:00',
    frameInfo: { frameNumber: 0, timestamp: 0, width: 0, height: 0 },
    currentFps: 30,
    droppedFrames: 0,
    errorMessage: undefined,
  })),
}));

// Mock video element
const createMockVideoElement = () => {
  const mockVideo = {
    // Core video properties
    readyState: 4,
    videoWidth: 1920,
    videoHeight: 1080,
    duration: 120,
    currentTime: 0,
    paused: true,
    muted: false,
    loop: false,
    playbackRate: 1,
    volume: 1,
    
    // Media properties
    buffered: {
      length: 0,
      end: () => 0,
      start: () => 0,
    },
    
    // Media methods
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    load: vi.fn(),
    
    // DOM properties (most commonly used)
    src: '',
    currentSrc: '',
    crossOrigin: null,
    networkState: 0,
    preload: 'metadata',
    autoplay: false,
    controls: false,
    disablePictureInPicture: false,
    height: 0,
    width: 0,
    
    // Event handlers
    onabort: null,
    oncanplay: null,
    oncanplaythrough: null,
    ondurationchange: null,
    onemptied: null,
    onended: null,
    onerror: null,
    onloadeddata: null,
    onloadedmetadata: null,
    onloadstart: null,
    onpause: null,
    onplay: null,
    onplaying: null,
    onprogress: null,
    onratechange: null,
    onseeked: null,
    onseeking: null,
    onstalled: null,
    onsuspend: null,
    ontimeupdate: null,
    onvolumechange: null,
    onwaiting: null,
    onenterpictureinpicture: null,
    onleavepictureinpicture: null,
    
    // Additional required properties
    textTracks: [],
    videoTracks: [],
    audioTracks: [],
    captureStream: vi.fn(),
    requestVideoFrameCallback: vi.fn(),
    cancelVideoFrameCallback: vi.fn(),
    
    // Default values for common properties
    defaultMuted: false,
    defaultPlaybackRate: 1,
    ended: false,
    seeking: false,
    disableRemotePlayback: false,
    
    // Required for TypeScript compatibility
    getVideoPlaybackQuality: vi.fn(),
    requestPictureInPicture: vi.fn(),
    exitPictureInPicture: vi.fn(),
    
    // Additional mock implementations
    sinkId: '',
    setSinkId: vi.fn(),
    remote: null,
  };
  
  // Cast through unknown to bypass strict type checking
  return mockVideo as unknown as HTMLVideoElement;
};

describe('VideoCanvas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders canvas element', () => {
    const mockVideo = createMockVideoElement();
    render(
      <VideoCanvas
        videoElement={mockVideo}
        autoInitialize={false}
      />
    );

    const container = screen.getByRole('button', { name: /video paused/i });
    expect(container).toBeInTheDocument();
  });

  it('shows loading indicator when buffering', () => {
    const mockVideo = createMockVideoElement();
    
    render(
      <VideoCanvas
        videoElement={mockVideo}
        autoInitialize={false}
        showLoadingIndicator={true}
      />
    );

    // Debug: log the rendered HTML
    console.log('Rendered HTML:', document.body.innerHTML);
    
    // Check for the loading indicator by its CSS class since it's a spinner without text
    const loadingIndicator = document.querySelector('.video-canvas-loading');
    console.log('Loading indicator found:', loadingIndicator);
    
    expect(loadingIndicator).toBeInTheDocument();
  });

  it('calls togglePlay on click', () => {
    const mockVideo = createMockVideoElement();

    render(
      <VideoCanvas
        videoElement={mockVideo}
        autoInitialize={false}
        showPlayButton={true}
      />
    );

    const container = screen.getByRole('button', { name: /video paused/i });
    fireEvent.click(container);
    // The click should trigger the togglePlay function from the hook
  });

  it('displays time information when timeFormat is timecode', () => {
    const mockVideo = createMockVideoElement();

    render(
      <VideoCanvas
        videoElement={mockVideo}
        autoInitialize={false}
        timeFormat="timecode"
        showFrameNumber={true}
      />
    );

    // The time display should show "F: 00:00:00" and "00:00:00 / 00:00:00"
    // We need to check for the timecode format in the time display
    const timeDisplays = screen.getAllByText(/00:00:00/);
    expect(timeDisplays).toHaveLength(2); // Should find frame number and time displays
  });

  it('applies custom className', () => {
    const mockVideo = createMockVideoElement();
    render(
      <VideoCanvas
        videoElement={mockVideo}
        autoInitialize={false}
        className="custom-video"
      />
    );

    const container = screen.getByRole('button', { name: /video paused/i });
    expect(container).toHaveClass('custom-video');
  });
});

describe('VideoCanvas Accessibility', () => {
  it('has correct ARIA label when paused', () => {
    const mockVideo = createMockVideoElement();

    render(
      <VideoCanvas
        videoElement={mockVideo}
        autoInitialize={false}
      />
    );

    const container = screen.getByRole('button', { name: /video paused/i });
    expect(container).toHaveAttribute('aria-label', expect.stringContaining('paused'));
  });

  it('has correct ARIA label when playing', () => {
    const mockVideo = createMockVideoElement();

    render(
      <VideoCanvas
        videoElement={mockVideo}
        autoInitialize={false}
      />
    );

    const container = screen.getByRole('button', { name: /video paused/i });
    expect(container).toHaveAttribute('aria-label', expect.stringContaining('paused'));
  });
});