import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { PreviewPanel } from '../PreviewPanel';
import { useStore } from '../../store';
import type { Shot } from '../../types';

describe('PreviewPanel', () => {
  const mockShots: Shot[] = [
    {
      id: 'shot-1',
      title: 'Shot 1',
      description: 'First shot',
      duration: 5,
      position: 0,
      audioTracks: [],
      effects: [],
      textLayers: [],
      animations: [],
    },
    {
      id: 'shot-2',
      title: 'Shot 2',
      description: 'Second shot',
      duration: 3,
      position: 1,
      audioTracks: [],
      effects: [],
      textLayers: [],
      animations: [],
      transitionOut: {
        id: 'trans-1',
        type: 'fade',
        duration: 1,
        easing: 'ease-in-out',
      },
    },
  ];

  beforeEach(() => {
    useStore.setState({
      shots: [],
      isPlaying: false,
      currentTime: 0,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders preview canvas', () => {
    render(<PreviewPanel />);
    
    const canvas = screen.getByRole('img', { hidden: true });
    expect(canvas).toBeInTheDocument();
  });

  it('renders playback controls', () => {
    render(<PreviewPanel />);

    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
  });

  it('displays timecode', () => {
    render(<PreviewPanel />);

    expect(screen.getByText(/timecode:/i)).toBeInTheDocument();
    expect(screen.getByText(/00:00:00/)).toBeInTheDocument();
  });

  it('calculates total duration correctly', () => {
    useStore.setState({ shots: mockShots });
    render(<PreviewPanel />);

    // Shot 1: 5s, Shot 2: 3s, Transition: 1s = 9s total
    expect(screen.getByText(/duration:/i)).toBeInTheDocument();
    expect(screen.getByText(/00:09:00/)).toBeInTheDocument();
  });

  it('displays shot count', () => {
    useStore.setState({ shots: mockShots });
    render(<PreviewPanel />);

    expect(screen.getByText(/2 shots in timeline/i)).toBeInTheDocument();
  });

  it('shows empty state when no shots', () => {
    render(<PreviewPanel />);

    expect(screen.getByText(/no shots in timeline/i)).toBeInTheDocument();
  });

  it('disables play button when no shots', () => {
    render(<PreviewPanel />);

    const playButton = screen.getByRole('button', { name: /play/i });
    expect(playButton).toBeDisabled();
  });

  it('enables play button when shots exist', () => {
    useStore.setState({ shots: mockShots });
    render(<PreviewPanel />);

    const playButton = screen.getByRole('button', { name: /play/i });
    expect(playButton).toBeEnabled();
  });

  it('calls play when play button clicked', () => {
    const play = vi.fn();
    useStore.setState({ 
      shots: mockShots,
      play,
    });
    render(<PreviewPanel />);

    const playButton = screen.getByRole('button', { name: /play/i });
    fireEvent.click(playButton);

    expect(play).toHaveBeenCalledTimes(1);
  });

  it('calls pause when pause button clicked', () => {
    const pause = vi.fn();
    useStore.setState({ 
      shots: mockShots,
      isPlaying: true,
      pause,
    });
    render(<PreviewPanel />);

    const pauseButton = screen.getByRole('button', { name: /pause/i });
    fireEvent.click(pauseButton);

    expect(pause).toHaveBeenCalledTimes(1);
  });

  it('calls stop when stop button clicked', () => {
    const stop = vi.fn();
    useStore.setState({ 
      shots: mockShots,
      isPlaying: true,
      stop,
    });
    render(<PreviewPanel />);

    const stopButton = screen.getByRole('button', { name: /stop/i });
    fireEvent.click(stopButton);

    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('disables stop button when not playing and at start', () => {
    useStore.setState({ shots: mockShots });
    render(<PreviewPanel />);

    const stopButton = screen.getByRole('button', { name: /stop/i });
    expect(stopButton).toBeDisabled();
  });

  it('handles frame-by-frame navigation', () => {
    const setCurrentTime = vi.fn();
    useStore.setState({ 
      shots: mockShots,
      currentTime: 1.0,
      setCurrentTime,
    });
    render(<PreviewPanel />);

    // Previous frame (1/30 second back)
    const prevButton = screen.getAllByRole('button')[0]; // SkipBack
    fireEvent.click(prevButton);
    expect(setCurrentTime).toHaveBeenCalledWith(expect.closeTo(1.0 - 1/30, 5));

    // Next frame (1/30 second forward)
    const nextButton = screen.getAllByRole('button')[4]; // SkipForward
    fireEvent.click(nextButton);
    expect(setCurrentTime).toHaveBeenCalledWith(expect.closeTo(1.0 + 1/30, 5));
  });

  it('disables previous frame at start', () => {
    useStore.setState({ 
      shots: mockShots,
      currentTime: 0,
    });
    render(<PreviewPanel />);

    const prevButton = screen.getAllByRole('button')[0];
    expect(prevButton).toBeDisabled();
  });

  it('disables next frame at end', () => {
    useStore.setState({ 
      shots: mockShots,
      currentTime: 9, // Total duration
    });
    render(<PreviewPanel />);

    const nextButton = screen.getAllByRole('button')[4];
    expect(nextButton).toBeDisabled();
  });

  it('displays volume control', () => {
    render(<PreviewPanel />);

    expect(screen.getByText(/100%/)).toBeInTheDocument();
  });

  it('toggles mute', () => {
    render(<PreviewPanel />);

    // Find mute button (Volume2 icon initially)
    const muteButtons = screen.getAllByRole('button');
    const muteButton = muteButtons.find(btn => 
      btn.querySelector('svg')?.classList.contains('lucide-volume-2') ||
      btn.querySelector('svg')?.classList.contains('lucide-volume-x')
    );

    expect(muteButton).toBeDefined();
    
    if (muteButton) {
      fireEvent.click(muteButton);
      // After click, volume should show 0%
      expect(screen.getByText(/0%/)).toBeInTheDocument();
    }
  });

  it('formats time correctly', () => {
    useStore.setState({ 
      shots: mockShots,
      currentTime: 65.5, // 1 minute, 5.5 seconds
    });
    render(<PreviewPanel />);

    // Should display as 01:05:15 (1 min, 5 sec, 15 frames at 30fps)
    expect(screen.getByText(/01:05:15/)).toBeInTheDocument();
  });

  it('updates timeline scrubber', () => {
    const setCurrentTime = vi.fn();
    useStore.setState({ 
      shots: mockShots,
      setCurrentTime,
    });
    render(<PreviewPanel />);

    const slider = screen.getAllByRole('slider')[0]; // Timeline slider
    fireEvent.change(slider, { target: { value: '5' } });

    expect(setCurrentTime).toHaveBeenCalled();
  });

  it('renders fullscreen button', () => {
    render(<PreviewPanel />);

    const fullscreenButton = screen.getAllByRole('button').find(btn =>
      btn.querySelector('svg')?.classList.contains('lucide-maximize-2')
    );

    expect(fullscreenButton).toBeDefined();
  });
});
