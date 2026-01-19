import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AudioPanel } from '../AudioPanel';
import { useStore } from '../../store';
import type { Shot, AudioTrack } from '../../types';

// Mock the store
vi.mock('../../store', () => ({
  useStore: vi.fn(),
}));

// Mock window.confirm
global.confirm = vi.fn(() => true);

describe('AudioPanel', () => {
  const mockShot: Shot = {
    id: 'shot-1',
    title: 'Test Shot',
    description: 'Test description',
    duration: 10,
    position: 0,
    audioTracks: [],
    effects: [],
    textLayers: [],
    animations: [],
  };

  const mockAudioTrack: AudioTrack = {
    id: 'track-1',
    name: 'Music Track',
    type: 'music',
    url: '/audio/music.mp3',
    startTime: 0,
    duration: 10,
    offset: 0,
    volume: 80,
    fadeIn: 0.5,
    fadeOut: 1.0,
    pan: 0,
    muted: false,
    solo: false,
    effects: [],
  };

  const mockAddAudioTrack = vi.fn();
  const mockUpdateAudioTrack = vi.fn();
  const mockDeleteAudioTrack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as any).mockImplementation((selector: any) => {
      const state = {
        shots: [mockShot],
        addAudioTrack: mockAddAudioTrack,
        updateAudioTrack: mockUpdateAudioTrack,
        deleteAudioTrack: mockDeleteAudioTrack,
      };
      return selector(state);
    });
  });

  describe('Rendering', () => {
    it('should render audio panel with title', () => {
      render(<AudioPanel shotId="shot-1" />);

      expect(screen.getByText('Audio Tracks')).toBeInTheDocument();
      expect(
        screen.getByText('Manage audio tracks for this shot')
      ).toBeInTheDocument();
    });

    it('should show message when no shot is selected', () => {
      (useStore as any).mockImplementation((selector: any) => {
        const state = {
          shots: [],
          addAudioTrack: mockAddAudioTrack,
          updateAudioTrack: mockUpdateAudioTrack,
          deleteAudioTrack: mockDeleteAudioTrack,
        };
        return selector(state);
      });

      render(<AudioPanel shotId="nonexistent" />);

      expect(
        screen.getByText('No shot selected. Select a shot to manage audio tracks.')
      ).toBeInTheDocument();
    });

    it('should show empty state when no audio tracks exist', () => {
      render(<AudioPanel shotId="shot-1" />);

      expect(screen.getByText('No audio tracks')).toBeInTheDocument();
      expect(screen.getByText('Add Audio Track')).toBeInTheDocument();
    });

    it('should display audio tracks when they exist', () => {
      (useStore as any).mockImplementation((selector: any) => {
        const state = {
          shots: [{ ...mockShot, audioTracks: [mockAudioTrack] }],
          addAudioTrack: mockAddAudioTrack,
          updateAudioTrack: mockUpdateAudioTrack,
          deleteAudioTrack: mockDeleteAudioTrack,
        };
        return selector(state);
      });

      render(<AudioPanel shotId="shot-1" />);

      expect(screen.getByDisplayValue('Music Track')).toBeInTheDocument();
      expect(screen.getByText('music')).toBeInTheDocument();
    });
  });

  describe('Add Audio Track', () => {
    it('should open add track modal when button is clicked', () => {
      render(<AudioPanel shotId="shot-1" />);

      const addButton = screen.getByText('Add Audio Track');
      fireEvent.click(addButton);

      expect(screen.getByText('Select the type of audio track to add:')).toBeInTheDocument();
      expect(screen.getByText('music')).toBeInTheDocument();
      expect(screen.getByText('dialogue')).toBeInTheDocument();
      expect(screen.getByText('voiceover')).toBeInTheDocument();
      expect(screen.getByText('sfx')).toBeInTheDocument();
      expect(screen.getByText('ambient')).toBeInTheDocument();
    });

    it('should add music track when selected', () => {
      render(<AudioPanel shotId="shot-1" />);

      fireEvent.click(screen.getByText('Add Audio Track'));
      fireEvent.click(screen.getByText('music'));

      expect(mockAddAudioTrack).toHaveBeenCalledWith('shot-1', {
        id: expect.stringContaining('track-'),
        name: 'Music Track',
        type: 'music',
        url: '',
        startTime: 0,
        duration: 10,
        offset: 0,
        volume: 80,
        fadeIn: 0,
        fadeOut: 0,
        pan: 0,
        muted: false,
        solo: false,
        effects: [],
      });
    });

    it('should add dialogue track when selected', () => {
      render(<AudioPanel shotId="shot-1" />);

      fireEvent.click(screen.getByText('Add Audio Track'));
      fireEvent.click(screen.getByText('dialogue'));

      expect(mockAddAudioTrack).toHaveBeenCalledWith(
        'shot-1',
        expect.objectContaining({
          type: 'dialogue',
          name: 'Dialogue Track',
        })
      );
    });

    it('should close modal when cancel is clicked', () => {
      render(<AudioPanel shotId="shot-1" />);

      fireEvent.click(screen.getByText('Add Audio Track'));
      expect(screen.getByText('Select the type of audio track to add:')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Cancel'));
      expect(screen.queryByText('Select the type of audio track to add:')).not.toBeInTheDocument();
    });
  });

  describe('Audio Track Card', () => {
    beforeEach(() => {
      (useStore as any).mockImplementation((selector: any) => {
        const state = {
          shots: [{ ...mockShot, audioTracks: [mockAudioTrack] }],
          addAudioTrack: mockAddAudioTrack,
          updateAudioTrack: mockUpdateAudioTrack,
          deleteAudioTrack: mockDeleteAudioTrack,
        };
        return selector(state);
      });
    });

    it('should display track name and type', () => {
      render(<AudioPanel shotId="shot-1" />);

      expect(screen.getByDisplayValue('Music Track')).toBeInTheDocument();
      expect(screen.getByText('music')).toBeInTheDocument();
    });

    it('should update track name', () => {
      render(<AudioPanel shotId="shot-1" />);

      const nameInput = screen.getByDisplayValue('Music Track');
      fireEvent.change(nameInput, { target: { value: 'Background Music' } });

      expect(mockUpdateAudioTrack).toHaveBeenCalledWith('shot-1', 'track-1', {
        name: 'Background Music',
      });
    });

    it('should display and update audio file URL', () => {
      render(<AudioPanel shotId="shot-1" />);

      const urlInput = screen.getByDisplayValue('/audio/music.mp3');
      fireEvent.change(urlInput, { target: { value: '/audio/new-music.mp3' } });

      expect(mockUpdateAudioTrack).toHaveBeenCalledWith('shot-1', 'track-1', {
        url: '/audio/new-music.mp3',
      });
    });

    it('should display timing controls', () => {
      render(<AudioPanel shotId="shot-1" />);

      expect(screen.getByLabelText('Start (s)')).toHaveValue(0);
      expect(screen.getByLabelText('Duration (s)')).toHaveValue(10);
      expect(screen.getByLabelText('Offset (s)')).toHaveValue(0);
    });

    it('should update start time', () => {
      render(<AudioPanel shotId="shot-1" />);

      const startInput = screen.getByLabelText('Start (s)');
      fireEvent.change(startInput, { target: { value: '2.5' } });

      expect(mockUpdateAudioTrack).toHaveBeenCalledWith('shot-1', 'track-1', {
        startTime: 2.5,
      });
    });

    it('should display volume control', () => {
      render(<AudioPanel shotId="shot-1" />);

      expect(screen.getByText('Volume')).toBeInTheDocument();
      expect(screen.getByText('80%')).toBeInTheDocument();
    });

    it('should update volume', () => {
      render(<AudioPanel shotId="shot-1" />);

      const volumeSlider = screen.getByLabelText('Volume');
      fireEvent.change(volumeSlider, { target: { value: '60' } });

      expect(mockUpdateAudioTrack).toHaveBeenCalledWith('shot-1', 'track-1', {
        volume: 60,
      });
    });

    it('should display pan control', () => {
      render(<AudioPanel shotId="shot-1" />);

      expect(screen.getByText('Pan (L/R)')).toBeInTheDocument();
      expect(screen.getByText('Center')).toBeInTheDocument();
    });

    it('should update pan', () => {
      render(<AudioPanel shotId="shot-1" />);

      const panSlider = screen.getByLabelText('Pan (L/R)');
      fireEvent.change(panSlider, { target: { value: '-50' } });

      expect(mockUpdateAudioTrack).toHaveBeenCalledWith('shot-1', 'track-1', {
        pan: -50,
      });
    });

    it('should display fade controls', () => {
      render(<AudioPanel shotId="shot-1" />);

      expect(screen.getByLabelText('Fade In (s)')).toHaveValue(0.5);
      expect(screen.getByLabelText('Fade Out (s)')).toHaveValue(1.0);
    });

    it('should update fade in', () => {
      render(<AudioPanel shotId="shot-1" />);

      const fadeInInput = screen.getByLabelText('Fade In (s)');
      fireEvent.change(fadeInInput, { target: { value: '1.5' } });

      expect(mockUpdateAudioTrack).toHaveBeenCalledWith('shot-1', 'track-1', {
        fadeIn: 1.5,
      });
    });
  });

  describe('Mute and Solo', () => {
    beforeEach(() => {
      (useStore as any).mockImplementation((selector: any) => {
        const state = {
          shots: [{ ...mockShot, audioTracks: [mockAudioTrack] }],
          addAudioTrack: mockAddAudioTrack,
          updateAudioTrack: mockUpdateAudioTrack,
          deleteAudioTrack: mockDeleteAudioTrack,
        };
        return selector(state);
      });
    });

    it('should toggle mute', () => {
      render(<AudioPanel shotId="shot-1" />);

      const muteButton = screen.getByText('Mute');
      fireEvent.click(muteButton);

      expect(mockUpdateAudioTrack).toHaveBeenCalledWith('shot-1', 'track-1', {
        muted: true,
      });
    });

    it('should toggle solo', () => {
      render(<AudioPanel shotId="shot-1" />);

      const soloButton = screen.getByText('Solo');
      fireEvent.click(soloButton);

      expect(mockUpdateAudioTrack).toHaveBeenCalledWith('shot-1', 'track-1', {
        solo: true,
      });
    });

    it('should display muted badge when track is muted', () => {
      (useStore as any).mockImplementation((selector: any) => {
        const state = {
          shots: [
            {
              ...mockShot,
              audioTracks: [{ ...mockAudioTrack, muted: true }],
            },
          ],
          addAudioTrack: mockAddAudioTrack,
          updateAudioTrack: mockUpdateAudioTrack,
          deleteAudioTrack: mockDeleteAudioTrack,
        };
        return selector(state);
      });

      render(<AudioPanel shotId="shot-1" />);

      expect(screen.getByText('Muted')).toBeInTheDocument();
    });

    it('should display solo badge when track is solo', () => {
      (useStore as any).mockImplementation((selector: any) => {
        const state = {
          shots: [
            {
              ...mockShot,
              audioTracks: [{ ...mockAudioTrack, solo: true }],
            },
          ],
          addAudioTrack: mockAddAudioTrack,
          updateAudioTrack: mockUpdateAudioTrack,
          deleteAudioTrack: mockDeleteAudioTrack,
        };
        return selector(state);
      });

      render(<AudioPanel shotId="shot-1" />);

      expect(screen.getByText('Solo')).toBeInTheDocument();
    });
  });

  describe('Delete Track', () => {
    beforeEach(() => {
      (useStore as any).mockImplementation((selector: any) => {
        const state = {
          shots: [{ ...mockShot, audioTracks: [mockAudioTrack] }],
          addAudioTrack: mockAddAudioTrack,
          updateAudioTrack: mockUpdateAudioTrack,
          deleteAudioTrack: mockDeleteAudioTrack,
        };
        return selector(state);
      });
    });

    it('should delete track when confirmed', () => {
      render(<AudioPanel shotId="shot-1" />);

      const deleteButton = screen.getByTitle('Delete track');
      fireEvent.click(deleteButton);

      expect(global.confirm).toHaveBeenCalled();
      expect(mockDeleteAudioTrack).toHaveBeenCalledWith('shot-1', 'track-1');
    });
  });

  describe('Multiple Tracks', () => {
    it('should display multiple audio tracks', () => {
      const track2: AudioTrack = {
        ...mockAudioTrack,
        id: 'track-2',
        name: 'Dialogue Track',
        type: 'dialogue',
      };

      (useStore as any).mockImplementation((selector: any) => {
        const state = {
          shots: [{ ...mockShot, audioTracks: [mockAudioTrack, track2] }],
          addAudioTrack: mockAddAudioTrack,
          updateAudioTrack: mockUpdateAudioTrack,
          deleteAudioTrack: mockDeleteAudioTrack,
        };
        return selector(state);
      });

      render(<AudioPanel shotId="shot-1" />);

      expect(screen.getByDisplayValue('Music Track')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Dialogue Track')).toBeInTheDocument();
    });

    it('should show add track button when tracks exist', () => {
      (useStore as any).mockImplementation((selector: any) => {
        const state = {
          shots: [{ ...mockShot, audioTracks: [mockAudioTrack] }],
          addAudioTrack: mockAddAudioTrack,
          updateAudioTrack: mockUpdateAudioTrack,
          deleteAudioTrack: mockDeleteAudioTrack,
        };
        return selector(state);
      });

      render(<AudioPanel shotId="shot-1" />);

      expect(screen.getByText('+ Add Audio Track')).toBeInTheDocument();
    });
  });

  describe('Effects Display', () => {
    it('should display effects count when effects exist', () => {
      const trackWithEffects: AudioTrack = {
        ...mockAudioTrack,
        effects: [
          {
            id: 'effect-1',
            type: 'limiter',
            enabled: true,
            parameters: {},
          },
          {
            id: 'effect-2',
            type: 'eq',
            enabled: true,
            parameters: {},
          },
        ],
      };

      (useStore as any).mockImplementation((selector: any) => {
        const state = {
          shots: [{ ...mockShot, audioTracks: [trackWithEffects] }],
          addAudioTrack: mockAddAudioTrack,
          updateAudioTrack: mockUpdateAudioTrack,
          deleteAudioTrack: mockDeleteAudioTrack,
        };
        return selector(state);
      });

      render(<AudioPanel shotId="shot-1" />);

      expect(screen.getByText('2 effects applied')).toBeInTheDocument();
    });
  });
});
