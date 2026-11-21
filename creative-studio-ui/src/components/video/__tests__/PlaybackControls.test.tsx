import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useVideoPlayer, type UseVideoPlayerReturn } from '@/hooks/useVideoPlayer';
import { PlaybackControls } from '../PlaybackControls';

vi.mock('@/hooks/useVideoPlayer', () => ({ useVideoPlayer: vi.fn() }));

function player(overrides: Partial<UseVideoPlayerReturn> = {}): UseVideoPlayerReturn {
  return {
    status: {
      state: 'paused', currentTime: 30, currentFrame: 900, duration: 120, totalFrames: 3600,
      playbackRate: 1, isMuted: false, isLooping: false, volume: 1, bufferProgress: 1, isBuffering: false,
    },
    currentTime: 30,
    currentFrame: 900,
    duration: 120,
    totalFrames: 3600,
    currentFps: 30,
    droppedFrames: 0,
    formattedTime: '00:30',
    formattedTimecode: '00:00:30:00',
    frameInfo: { frameNumber: 900, timestamp: 30, width: 1920, height: 1080 },
    isPlaying: false,
    isMuted: false,
    isLooping: false,
    isReady: true,
    isLoaded: true,
    isBuffering: false,
    hasError: false,
    play: vi.fn(async () => undefined),
    pause: vi.fn(),
    stop: vi.fn(),
    togglePlay: vi.fn(async () => undefined),
    seek: vi.fn(async () => undefined),
    seekToFrame: vi.fn(async () => undefined),
    stepForward: vi.fn(async () => undefined),
    stepBackward: vi.fn(async () => undefined),
    setPlaybackRate: vi.fn(),
    setVolume: vi.fn(),
    toggleMute: vi.fn(),
    toggleLoop: vi.fn(),
    service: null,
    videoElement: null,
    getTotalFrames: () => 3600,
    getCurrentFps: () => 30,
    playbackRate: 1,
    ...overrides,
  };
}

describe('PlaybackControls', () => {
  let video: UseVideoPlayerReturn;

  beforeEach(() => {
    video = player();
    vi.mocked(useVideoPlayer).mockReturnValue(video);
  });

  it('renders accessible playback, navigation and audio controls', () => {
    render(<PlaybackControls />);
    const controls = within(screen.getByRole('region', { name: /video playback controls/i }));

    for (const name of [/^play \(/i, /^stop$/i, /previous frame/i, /next frame/i, /skip to start/i,
      /skip to end/i, /^mute \(/i, /enable loop/i, /fullscreen/i]) {
      expect(controls.getByRole('button', { name })).toBeInTheDocument();
    }
  });

  it('shows time and progress and can display frame numbers', () => {
    const { rerender } = render(<PlaybackControls />);

    expect(screen.getAllByText('00:00:30:00').length).toBeGreaterThan(0);
    expect(screen.getByRole('slider', { name: 'Video progress' })).toHaveAttribute('aria-valuenow', '25');

    rerender(<PlaybackControls timeFormat="frames" />);
    expect(screen.getByText('900 / 3600')).toBeInTheDocument();
  });

  it('toggles playback and reports current play state', () => {
    const onPlayStateChange = vi.fn<(isPlaying: boolean) => void>();
    const { rerender } = render(<PlaybackControls onPlayStateChange={onPlayStateChange} />);

    fireEvent.click(screen.getByRole('button', { name: /^play \(/i }));
    expect(video.togglePlay).toHaveBeenCalledTimes(1);
    expect(onPlayStateChange).toHaveBeenLastCalledWith(false);

    vi.mocked(useVideoPlayer).mockReturnValue({ ...video, isPlaying: true });
    rerender(<PlaybackControls onPlayStateChange={onPlayStateChange} />);
    fireEvent.click(screen.getByRole('button', { name: /^pause \(/i }));
    expect(video.togglePlay).toHaveBeenCalledTimes(2);
    expect(onPlayStateChange).toHaveBeenLastCalledWith(true);
  });

  it('stops, steps frames and seeks to both ends', () => {
    render(<PlaybackControls />);

    for (const name of [/^stop$/i, /previous frame/i, /next frame/i, /skip to start/i, /skip to end/i]) {
      fireEvent.click(screen.getByRole('button', { name }));
    }
    expect(video.stop).toHaveBeenCalledTimes(1);
    expect(video.stepBackward).toHaveBeenCalledWith(1);
    expect(video.stepForward).toHaveBeenCalledWith(1);
    expect(video.seek).toHaveBeenNthCalledWith(1, 0);
    expect(video.seek).toHaveBeenNthCalledWith(2, video.duration);
  });

  it('updates mute and loop controls from the player state', () => {
    const { rerender } = render(<PlaybackControls />);
    fireEvent.click(screen.getByRole('button', { name: /^mute \(/i }));
    fireEvent.click(screen.getByRole('button', { name: /enable loop/i }));
    expect(video.toggleMute).toHaveBeenCalledTimes(1);
    expect(video.toggleLoop).toHaveBeenCalledTimes(1);

    vi.mocked(useVideoPlayer).mockReturnValue({ ...video, isMuted: true, isLooping: true });
    rerender(<PlaybackControls />);
    expect(screen.getByRole('button', { name: /^unmute \(/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /disable loop/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('offers playback rates and applies the selected rate', () => {
    render(<PlaybackControls />);

    const speed = screen.getByRole('button', { name: 'Playback speed: 1x' });
    fireEvent.click(speed);
    expect(speed).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: /^2x$/ }));
    expect(video.setPlaybackRate).toHaveBeenCalledWith(2);
    expect(speed).toHaveAttribute('aria-expanded', 'false');
  });

  it('delegates keyboard shortcuts and lets an input handle typed keys', () => {
    render(<><PlaybackControls /><input aria-label="Test input" /></>);
    fireEvent.keyDown(document.body, { key: ' ' });
    fireEvent.keyDown(document.body, { key: 'ArrowLeft' });
    fireEvent.keyDown(document.body, { key: 'ArrowRight', shiftKey: true });
    fireEvent.keyDown(document.body, { key: 'm' });
    fireEvent.keyDown(document.body, { key: 'l' });
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Test input' }), { key: ' ' });

    expect(video.togglePlay).toHaveBeenCalledTimes(1);
    expect(video.stepBackward).toHaveBeenCalledWith(1);
    expect(video.stepForward).toHaveBeenCalledWith(5);
    expect(video.toggleMute).toHaveBeenCalledTimes(1);
    expect(video.toggleLoop).toHaveBeenCalledTimes(1);
  });

  it('uses compact styling and hides optional controls when requested', () => {
    render(<PlaybackControls compact className="example" showFrameNavigation={false}
      showTimeDisplay={false} showMuteToggle={false} showLoopToggle={false} />);

    expect(screen.getByRole('region')).toHaveClass('playback-controls-compact', 'example');
    expect(screen.queryByRole('button', { name: /previous frame/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^mute \(/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /enable loop/i })).not.toBeInTheDocument();
    expect(screen.queryByText('00:00:30:00')).not.toBeInTheDocument();
  });
});
