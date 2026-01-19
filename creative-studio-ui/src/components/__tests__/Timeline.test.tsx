import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Timeline } from '../Timeline';
import { useStore } from '../../store';
import type { Shot } from '../../types';

// Mock the store
vi.mock('../../store', () => ({
  useStore: vi.fn(),
}));

describe('Timeline Component', () => {
  const mockShots: Shot[] = [
    {
      id: 'shot-1',
      title: 'Opening Scene',
      description: 'First shot',
      duration: 5,
      audioTracks: [
        {
          id: 'audio-1',
          name: 'Background Music',
          type: 'music',
          url: '/audio/music.mp3',
          startTime: 0,
          duration: 5,
          offset: 0,
          volume: 80,
          fadeIn: 0,
          fadeOut: 0,
          pan: 0,
          muted: false,
          solo: false,
          effects: [],
        },
      ],
      effects: [],
      textLayers: [],
      animations: [],
      position: 0,
    },
    {
      id: 'shot-2',
      title: 'Middle Scene',
      description: 'Second shot',
      duration: 8,
      audioTracks: [],
      effects: [],
      textLayers: [],
      animations: [],
      transitionOut: {
        id: 'trans-1',
        type: 'fade',
        duration: 1,
      },
      position: 1,
    },
    {
      id: 'shot-3',
      title: 'Closing Scene',
      description: 'Third shot',
      duration: 6,
      audioTracks: [],
      effects: [],
      textLayers: [],
      animations: [],
      position: 2,
    },
  ];

  const mockSetCurrentTime = vi.fn();
  const mockPlay = vi.fn();
  const mockPause = vi.fn();
  const mockSelectShot = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    (useStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: any) => {
      const state = {
        shots: mockShots,
        currentTime: 0,
        isPlaying: false,
        setCurrentTime: mockSetCurrentTime,
        play: mockPlay,
        pause: mockPause,
        selectShot: mockSelectShot,
      };
      return selector(state);
    });
  });

  describe('Rendering', () => {
    it('should render timeline with playback controls', () => {
      render(<Timeline />);
      
      // Check for playback controls
      expect(screen.getByTitle('Play')).toBeInTheDocument();
      expect(screen.getByTitle('Skip back 5s')).toBeInTheDocument();
      expect(screen.getByTitle('Skip forward 5s')).toBeInTheDocument();
    });

    it('should display current time and total duration', () => {
      render(<Timeline />);
      
      // Total duration: 5 + 8 + 1 (transition) + 6 = 20 seconds
      expect(screen.getByText('00:00')).toBeInTheDocument(); // current time
      expect(screen.getByText('00:20')).toBeInTheDocument(); // total duration
    });

    it('should render all shots as bars', () => {
      render(<Timeline />);
      
      expect(screen.getByText('Opening Scene')).toBeInTheDocument();
      expect(screen.getByText('Middle Scene')).toBeInTheDocument();
      expect(screen.getByText('Closing Scene')).toBeInTheDocument();
    });

    it('should display shot durations', () => {
      render(<Timeline />);
      
      expect(screen.getByText('5s')).toBeInTheDocument();
      expect(screen.getByText('8s')).toBeInTheDocument();
      expect(screen.getByText('6s')).toBeInTheDocument();
    });

    it('should show audio track indicators', () => {
      render(<Timeline />);
      
      // First shot has 1 audio track
      expect(screen.getByText('🔊 1 track')).toBeInTheDocument();
    });

    it('should render transition indicators', () => {
      render(<Timeline />);
      
      // Second shot has a fade transition
      expect(screen.getByText('fade')).toBeInTheDocument();
    });

    it('should display time markers', () => {
      render(<Timeline />);
      
      // Should have markers at 0, 5, 10, 15, 20 seconds
      const timeMarkers = screen.getAllByText(/00:\d{2}/);
      expect(timeMarkers.length).toBeGreaterThan(0);
    });
  });

  describe('Playback Controls', () => {
    it('should call play when play button is clicked', () => {
      render(<Timeline />);
      
      const playButton = screen.getByTitle('Play');
      fireEvent.click(playButton);
      
      expect(mockPlay).toHaveBeenCalledTimes(1);
    });

    it('should show pause button when playing', () => {
      (useStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: any) => {
        const state = {
          shots: mockShots,
          currentTime: 0,
          isPlaying: true,
          setCurrentTime: mockSetCurrentTime,
          play: mockPlay,
          pause: mockPause,
          selectShot: mockSelectShot,
        };
        return selector(state);
      });
      
      render(<Timeline />);
      
      expect(screen.getByTitle('Pause')).toBeInTheDocument();
    });

    it('should call pause when pause button is clicked', () => {
      (useStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: any) => {
        const state = {
          shots: mockShots,
          currentTime: 0,
          isPlaying: true,
          setCurrentTime: mockSetCurrentTime,
          play: mockPlay,
          pause: mockPause,
          selectShot: mockSelectShot,
        };
        return selector(state);
      });
      
      render(<Timeline />);
      
      const pauseButton = screen.getByTitle('Pause');
      fireEvent.click(pauseButton);
      
      expect(mockPause).toHaveBeenCalledTimes(1);
    });

    it('should skip back 5 seconds when skip back button is clicked', () => {
      (useStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: any) => {
        const state = {
          shots: mockShots,
          currentTime: 10,
          isPlaying: false,
          setCurrentTime: mockSetCurrentTime,
          play: mockPlay,
          pause: mockPause,
          selectShot: mockSelectShot,
        };
        return selector(state);
      });
      
      render(<Timeline />);
      
      const skipBackButton = screen.getByTitle('Skip back 5s');
      fireEvent.click(skipBackButton);
      
      expect(mockSetCurrentTime).toHaveBeenCalledWith(5);
    });

    it('should skip forward 5 seconds when skip forward button is clicked', () => {
      (useStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: any) => {
        const state = {
          shots: mockShots,
          currentTime: 10,
          isPlaying: false,
          setCurrentTime: mockSetCurrentTime,
          play: mockPlay,
          pause: mockPause,
          selectShot: mockSelectShot,
        };
        return selector(state);
      });
      
      render(<Timeline />);
      
      const skipForwardButton = screen.getByTitle('Skip forward 5s');
      fireEvent.click(skipForwardButton);
      
      expect(mockSetCurrentTime).toHaveBeenCalledWith(15);
    });

    it('should not skip back below 0', () => {
      (useStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: any) => {
        const state = {
          shots: mockShots,
          currentTime: 2,
          isPlaying: false,
          setCurrentTime: mockSetCurrentTime,
          play: mockPlay,
          pause: mockPause,
          selectShot: mockSelectShot,
        };
        return selector(state);
      });
      
      render(<Timeline />);
      
      const skipBackButton = screen.getByTitle('Skip back 5s');
      fireEvent.click(skipBackButton);
      
      expect(mockSetCurrentTime).toHaveBeenCalledWith(0);
    });

    it('should not skip forward beyond total duration', () => {
      (useStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: any) => {
        const state = {
          shots: mockShots,
          currentTime: 18,
          isPlaying: false,
          setCurrentTime: mockSetCurrentTime,
          play: mockPlay,
          pause: mockPause,
          selectShot: mockSelectShot,
        };
        return selector(state);
      });
      
      render(<Timeline />);
      
      const skipForwardButton = screen.getByTitle('Skip forward 5s');
      fireEvent.click(skipForwardButton);
      
      // Total duration is 20 seconds
      expect(mockSetCurrentTime).toHaveBeenCalledWith(20);
    });
  });

  describe('Shot Selection', () => {
    it('should select shot when clicked', () => {
      render(<Timeline />);
      
      const shotElement = screen.getByText('Opening Scene');
      fireEvent.click(shotElement);
      
      expect(mockSelectShot).toHaveBeenCalledWith('shot-1');
    });
  });

  describe('Duration Calculation', () => {
    it('should calculate total duration correctly', () => {
      render(<Timeline />);
      
      // Total: 5 + 8 + 1 (transition) + 6 = 20 seconds
      expect(screen.getByText('00:20')).toBeInTheDocument();
    });

    it('should handle shots without transitions', () => {
      const shotsWithoutTransitions: Shot[] = [
        {
          id: 'shot-1',
          title: 'Shot 1',
          description: 'First',
          duration: 10,
          audioTracks: [],
          effects: [],
          textLayers: [],
          animations: [],
          position: 0,
        },
        {
          id: 'shot-2',
          title: 'Shot 2',
          description: 'Second',
          duration: 15,
          audioTracks: [],
          effects: [],
          textLayers: [],
          animations: [],
          position: 1,
        },
      ];

      (useStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: any) => {
        const state = {
          shots: shotsWithoutTransitions,
          currentTime: 0,
          isPlaying: false,
          setCurrentTime: mockSetCurrentTime,
          play: mockPlay,
          pause: mockPause,
          selectShot: mockSelectShot,
        };
        return selector(state);
      });
      
      render(<Timeline />);
      
      // Total: 10 + 15 = 25 seconds
      expect(screen.getByText('00:25')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should render with no shots', () => {
      (useStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: any) => {
        const state = {
          shots: [],
          currentTime: 0,
          isPlaying: false,
          setCurrentTime: mockSetCurrentTime,
          play: mockPlay,
          pause: mockPause,
          selectShot: mockSelectShot,
        };
        return selector(state);
      });
      
      render(<Timeline />);
      
      // Should still show controls and 00:00 duration
      expect(screen.getByTitle('Play')).toBeInTheDocument();
      expect(screen.getByText('00:00')).toBeInTheDocument();
    });
  });
});

/**
 * **Validates: Requirements 4.1, 4.5**
 * 
 * These tests verify that the Timeline component:
 * - Displays all shots in chronological order with duration bars (4.1)
 * - Shows the current time position and total duration (4.5)
 * - Renders transition indicators between shots (4.1)
 * - Provides playback controls for navigation
 * - Calculates total project duration correctly
 */
