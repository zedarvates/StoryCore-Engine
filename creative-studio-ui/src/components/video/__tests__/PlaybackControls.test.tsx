/**
 * PlaybackControls Component Unit Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PlaybackControls } from '../PlaybackControls';

// Mock icons
jest.mock('../Icons', () => ({
  PlayIcon: () => <svg data-testid="play-icon">Play</svg>,
  PauseIcon: () => <svg data-testid="pause-icon">Pause</svg>,
  SkipBackIcon: () => <svg data-testid="skip-back-icon">SkipBack</svg>,
  SkipForwardIcon: () => <svg data-testid="skip-forward-icon">SkipForward</svg>,
  StepBackwardIcon: () => <svg data-testid="step-backward-icon">StepBackward</svg>,
  StepForwardIcon: () => <svg data-testid="step-forward-icon">StepForward</svg>,
  VolumeIcon: () => <svg data-testid="volume-icon">Volume</svg>,
  VolumeMuteIcon: () => <svg data-testid="volume-mute-icon">Mute</svg>,
  LoopIcon: () => <svg data-testid="loop-icon">Loop</svg>,
  FullscreenIcon: () => <svg data-testid="fullscreen-icon">Fullscreen</svg>,
  SettingsIcon: () => <svg data-testid="settings-icon">Settings</svg>,
}));

describe('PlaybackControls', () => {
  const defaultProps = {
    isPlaying: false,
    isBuffering: false,
    isMuted: false,
    isLooping: false,
    currentTime: 0,
    duration: 120,
    currentFrame: 0,
    totalFrames: 3600,
    formattedTime: '00:00:00:00',
    playbackRate: 1,
    onPlay: jest.fn(),
    onPause: jest.fn(),
    onStop: jest.fn(),
    onSeek: jest.fn(),
    onSeekToFrame: jest.fn(),
    onStepForward: jest.fn(),
    onStepBackward: jest.fn(),
    onVolumeChange: jest.fn(),
    onMuteToggle: jest.fn(),
    onLoopToggle: jest.fn(),
    onFullscreen: jest.fn(),
    onPlaybackRateChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders all control buttons', () => {
      render(<PlaybackControls {...defaultProps} />);

      expect(screen.getByTestId('skip-back-icon')).toBeInTheDocument();
      expect(screen.getByTestId('step-backward-icon')).toBeInTheDocument();
      expect(screen.getByTestId('play-icon')).toBeInTheDocument();
      expect(screen.getByTestId('step-forward-icon')).toBeInTheDocument();
      expect(screen.getByTestId('skip-forward-icon')).toBeInTheDocument();
    });

    it('renders time display', () => {
      render(<PlaybackControls {...defaultProps} />);

      expect(screen.getByText('00:00:00:00')).toBeInTheDocument();
      expect(screen.getByText('/')).toBeInTheDocument();
    });

    it('renders mute and loop toggle buttons', () => {
      render(<PlaybackControls {...defaultProps} />);

      expect(screen.getByTestId('volume-icon')).toBeInTheDocument();
      expect(screen.getByTestId('loop-icon')).toBeInTheDocument();
    });
  });

  describe('Play/Pause Functionality', () => {
    it('shows play icon when not playing', () => {
      render(<PlaybackControls {...defaultProps} isPlaying={false} />);

      expect(screen.getByTestId('play-icon')).toBeInTheDocument();
    });

    it('shows pause icon when playing', () => {
      render(<PlaybackControls {...defaultProps} isPlaying={true} />);

      expect(screen.getByTestId('pause-icon')).toBeInTheDocument();
    });

    it('calls onPlay when clicked and not playing', () => {
      const onPlay = jest.fn();
      render(<PlaybackControls {...defaultProps} isPlaying={false} onPlay={onPlay} />);

      const playButton = screen.getByRole('button', { name: /play/i });
      fireEvent.click(playButton);

      expect(onPlay).toHaveBeenCalledTimes(1);
    });

    it('calls onPause when clicked and playing', () => {
      const onPause = jest.fn();
      render(<PlaybackControls {...defaultProps} isPlaying={true} onPause={onPause} />);

      const pauseButton = screen.getByRole('button', { name: /pause/i });
      fireEvent.click(pauseButton);

      expect(onPause).toHaveBeenCalledTimes(1);
    });
  });

  describe('Frame Navigation', () => {
    it('calls onStepBackward when step backward button clicked', () => {
      const onStepBackward = jest.fn();
      render(<PlaybackControls {...defaultProps} onStepBackward={onStepBackward} />);

      const stepBackButton = screen.getByRole('button', { name: /step backward/i });
      fireEvent.click(stepBackButton);

      expect(onStepBackward).toHaveBeenCalledTimes(1);
      expect(onStepBackward).toHaveBeenCalledWith(1);
    });

    it('calls onStepForward when step forward button clicked', () => {
      const onStepForward = jest.fn();
      render(<PlaybackControls {...defaultProps} onStepForward={onStepForward} />);

      const stepForwardButton = screen.getByRole('button', { name: /step forward/i });
      fireEvent.click(stepForwardButton);

      expect(onStepForward).toHaveBeenCalledTimes(1);
      expect(onStepForward).toHaveBeenCalledWith(1);
    });

    it('calls onSeekToFrame when skip buttons clicked', () => {
      const onSeekToFrame = jest.fn();
      render(<PlaybackControls {...defaultProps} onSeekToFrame={onSeekToFrame} />);

      const skipBackButton = screen.getByRole('button', { name: /skip back/i });
      fireEvent.click(skipBackButton);

      expect(onSeekToFrame).toHaveBeenCalledWith(0);

      const skipForwardButton = screen.getByRole('button', { name: /skip forward/i });
      fireEvent.click(skipForwardButton);

      expect(onSeekToFrame).toHaveBeenCalledWith(3600);
    });
  });

  describe('Volume Controls', () => {
    it('shows volume icon when not muted', () => {
      render(<PlaybackControls {...defaultProps} isMuted={false} />);

      expect(screen.getByTestId('volume-icon')).toBeInTheDocument();
    });

    it('shows mute icon when muted', () => {
      render(<PlaybackControls {...defaultProps} isMuted={true} />);

      expect(screen.getByTestId('volume-mute-icon')).toBeInTheDocument();
    });

    it('calls onMuteToggle when mute button clicked', () => {
      const onMuteToggle = jest.fn();
      render(<PlaybackControls {...defaultProps} isMuted={false} onMuteToggle={onMuteToggle} />);

      const muteButton = screen.getByRole('button', { name: /mute/i });
      fireEvent.click(muteButton);

      expect(onMuteToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loop Control', () => {
    it('applies active class when looping is enabled', () => {
      render(<PlaybackControls {...defaultProps} isLooping={true} />);

      const loopButton = screen.getByRole('button', { name: /loop/i });
      expect(loopButton).toHaveClass('active');
    });

    it('calls onLoopToggle when loop button clicked', () => {
      const onLoopToggle = jest.fn();
      render(<PlaybackControls {...defaultProps} isLooping={false} onLoopToggle={onLoopToggle} />);

      const loopButton = screen.getByRole('button', { name: /loop/i });
      fireEvent.click(loopButton);

      expect(onLoopToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('Playback Rate', () => {
    it('displays current playback rate', () => {
      render(<PlaybackControls {...defaultProps} playbackRate={2} />);

      expect(screen.getByText('2x')).toBeInTheDocument();
    });

    it('opens rate menu when rate button clicked', () => {
      render(<PlaybackControls {...defaultProps} />);

      const rateButton = screen.getByRole('button', { name: /playback rate/i });
      fireEvent.click(rateButton);

      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('calls onPlaybackRateChange when rate option selected', () => {
      const onPlaybackRateChange = jest.fn();
      render(
        <PlaybackControls
          {...defaultProps}
          playbackRate={1}
          onPlaybackRateChange={onPlaybackRateChange}
        />
      );

      const rateButton = screen.getByRole('button', { name: /playback rate/i });
      fireEvent.click(rateButton);

      const option = screen.getByRole('menuitem', { name: /0\.5x/i });
      fireEvent.click(option);

      expect(onPlaybackRateChange).toHaveBeenCalledWith(0.5);
    });
  });

  describe('Fullscreen', () => {
    it('calls onFullscreen when fullscreen button clicked', () => {
      const onFullscreen = jest.fn();
      render(<PlaybackControls {...defaultProps} onFullscreen={onFullscreen} />);

      const fullscreenButton = screen.getByRole('button', { name: /fullscreen/i });
      fireEvent.click(fullscreenButton);

      expect(onFullscreen).toHaveBeenCalledTimes(1);
    });
  });

  describe('Buffering State', () => {
    it('disables controls when buffering', () => {
      render(<PlaybackControls {...defaultProps} isBuffering={true} />);

      const playButton = screen.getByRole('button', { name: /play/i });
      expect(playButton).toHaveAttribute('aria-disabled', 'true');
    });

    it('shows loading spinner when buffering', () => {
      render(<PlaybackControls {...defaultProps} isBuffering={true} showBufferingIndicator={true} />);

      expect(screen.getByTestId('buffering-spinner')).toBeInTheDocument();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('calls onPlay on space key when not playing', () => {
      const onPlay = jest.fn();
      render(<PlaybackControls {...defaultProps} isPlaying={false} onPlay={onPlay} />);

      const container = screen.getByRole('region');
      fireEvent.keyDown(container, { key: ' ' });

      expect(onPlay).toHaveBeenCalledTimes(1);
    });

    it('calls onPause on space key when playing', () => {
      const onPause = jest.fn();
      render(<PlaybackControls {...defaultProps} isPlaying={true} onPause={onPause} />);

      const container = screen.getByRole('region');
      fireEvent.keyDown(container, { key: ' ' });

      expect(onPause).toHaveBeenCalledTimes(1);
    });

    it('calls onStepForward on right arrow key', () => {
      const onStepForward = jest.fn();
      render(<PlaybackControls {...defaultProps} onStepForward={onStepForward} />);

      const container = screen.getByRole('region');
      fireEvent.keyDown(container, { key: 'ArrowRight' });

      expect(onStepForward).toHaveBeenCalledWith(1);
    });

    it('calls onStepBackward on left arrow key', () => {
      const onStepBackward = jest.fn();
      render(<PlaybackControls {...defaultProps} onStepBackward={onStepBackward} />);

      const container = screen.getByRole('region');
      fireEvent.keyDown(container, { key: 'ArrowLeft' });

      expect(onStepBackward).toHaveBeenCalledWith(1);
    });

    it('calls onMuteToggle on m key', () => {
      const onMuteToggle = jest.fn();
      render(<PlaybackControls {...defaultProps} onMuteToggle={onMuteToggle} />);

      const container = screen.getByRole('region');
      fireEvent.keyDown(container, { key: 'm' });

      expect(onMuteToggle).toHaveBeenCalledTimes(1);
    });

    it('calls onLoopToggle on l key', () => {
      const onLoopToggle = jest.fn();
      render(<PlaybackControls {...defaultProps} onLoopToggle={onLoopToggle} />);

      const container = screen.getByRole('region');
      fireEvent.keyDown(container, { key: 'l' });

      expect(onLoopToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA labels for all buttons', () => {
      render(<PlaybackControls {...defaultProps} />);

      expect(screen.getByRole('button', { name: /skip back/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /step backward/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /step forward/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /skip forward/i })).toBeInTheDocument();
    });

    it('has correct role and aria-valuenow for progress', () => {
      render(<PlaybackControls {...defaultProps} currentTime={60} duration={120} />);

      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('aria-valuenow', '50');
    });
  });

  describe('Customization', () => {
    it('applies custom className', () => {
      render(<PlaybackControls {...defaultProps} className="custom-controls" />);

      const container = screen.getByRole('region');
      expect(container).toHaveClass('custom-controls');
    });

    it('hides shortcuts panel when showKeyboardShortcuts is false', () => {
      render(<PlaybackControls {...defaultProps} showKeyboardShortcuts={false} />);

      expect(screen.queryByText(/keyboard shortcuts/i)).not.toBeInTheDocument();
    });

    it('hides frame number when showFrameNumber is false', () => {
      render(<PlaybackControls {...defaultProps} showFrameNumber={false} />);

      expect(screen.queryByText(/00:00:00:00/i)).not.toBeInTheDocument();
    });
  });
});

describe('PlaybackControls Compact Mode', () => {
  it('renders in compact mode with fewer controls', () => {
    render(<PlaybackControls {...{
      isPlaying: false,
      isBuffering: false,
      isMuted: false,
      isLooping: false,
      currentTime: 0,
      duration: 120,
      currentFrame: 0,
      totalFrames: 3600,
      formattedTime: '00:00:00:00',
      playbackRate: 1,
      onPlay: jest.fn(),
      onPause: jest.fn(),
      onStop: jest.fn(),
      onSeek: jest.fn(),
      onSeekToFrame: jest.fn(),
      onStepForward: jest.fn(),
      onStepBackward: jest.fn(),
      onVolumeChange: jest.fn(),
      onMuteToggle: jest.fn(),
      onLoopToggle: jest.fn(),
      onFullscreen: jest.fn(),
      onPlaybackRateChange: jest.fn(),
    }} variant="compact" />);

    // Compact mode should only show essential controls
    expect(screen.getByTestId('play-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('skip-back-icon')).not.toBeInTheDocument();
  });
});
