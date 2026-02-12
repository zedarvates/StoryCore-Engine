import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
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

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render audio panel with title', () => {
      render(<AudioPanel shotId="shot-1" />);

      expect(screen.getByText('Audio Tracks')).toBeInTheDocument();
      expect(screen.getByText('Add Audio Track')).toBeInTheDocument();
    });

    it('should render empty state when no audio tracks', () => {
      render(<AudioPanel shotId="shot-1" />);

      expect(screen.getByText('No audio tracks added yet')).toBeInTheDocument();
    });

    it('should render audio track when present', () => {
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

      expect(screen.getByText('Music Track')).toBeInTheDocument();
    });
  });

  describe('Add Audio Track', () => {
    it('should show add audio track form when button clicked', () => {
      render(<AudioPanel shotId="shot-1" />);

      const addButton = screen.getByText('Add Audio Track');
      fireEvent.click(addButton);

      expect(screen.getByLabelText('Track Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Audio URL')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    });

    it('should call addAudioTrack when form submitted', () => {
      render(<AudioPanel shotId="shot-1" />);

      const addButton = screen.getByText('Add Audio Track');
      fireEvent.click(addButton);

      const nameInput = screen.getByLabelText('Track Name');
      const urlInput = screen.getByLabelText('Audio URL');

      fireEvent.change(nameInput, { target: { value: 'New Track' } });
      fireEvent.change(urlInput, { target: { value: '/audio/new.mp3' } });

      const saveButton = screen.getByRole('button', { name: 'Save' });
      fireEvent.click(saveButton);

      expect(mockAddAudioTrack).toHaveBeenCalledWith('shot-1', {
        name: 'New Track',
        url: '/audio/new.mp3',
        type: 'music',
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
      });
    });
  });

  describe('Edit Audio Track', () => {
    it('should show edit form when edit button clicked', () => {
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

      const editButton = screen.getByRole('button', { name: 'Edit' });
      fireEvent.click(editButton);

      expect(screen.getByDisplayValue('Music Track')).toBeInTheDocument();
    });

    it('should call updateAudioTrack when edit form submitted', () => {
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

      const editButton = screen.getByRole('button', { name: 'Edit' });
      fireEvent.click(editButton);

      const nameInput = screen.getByDisplayValue('Music Track');
      fireEvent.change(nameInput, { target: { value: 'Updated Track' } });

      const saveButton = screen.getByRole('button', { name: 'Save' });
      fireEvent.click(saveButton);

      expect(mockUpdateAudioTrack).toHaveBeenCalledWith('shot-1', 'track-1', {
        ...mockAudioTrack,
        name: 'Updated Track',
      });
    });

    it('should cancel edit when cancel button clicked', () => {
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

      const editButton = screen.getByRole('button', { name: 'Edit' });
      fireEvent.click(editButton);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelButton);

      expect(screen.queryByDisplayValue('Music Track')).not.toBeInTheDocument();
    });
  });

  describe('Delete Audio Track', () => {
    it('should show delete confirmation when delete button clicked', () => {
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

      const deleteButton = screen.getByRole('button', { name: 'Delete' });
      fireEvent.click(deleteButton);

      expect(screen.getByText('Are you sure you want to delete')).toBeInTheDocument();
    });

    it('should call deleteAudioTrack when confirmed', () => {
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

      const deleteButton = screen.getByRole('button', { name: 'Delete' });
      fireEvent.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: 'Delete' });
      fireEvent.click(confirmButton);

      expect(mockDeleteAudioTrack).toHaveBeenCalledWith('shot-1', 'track-1');
    });
  });

  describe('Audio Track Controls', () => {
    it('should toggle mute when mute button clicked', () => {
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

      const muteButton = screen.getByRole('button', { name: 'Mute' });
      fireEvent.click(muteButton);

      expect(mockUpdateAudioTrack).toHaveBeenCalledWith('shot-1', 'track-1', {
        ...mockAudioTrack,
        muted: true,
      });
    });

    it('should toggle solo when solo button clicked', () => {
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

      const soloButton = screen.getByRole('button', { name: 'Solo' });
      fireEvent.click(soloButton);

      expect(mockUpdateAudioTrack).toHaveBeenCalledWith('shot-1', 'track-1', {
        ...mockAudioTrack,
        solo: true,
      });
    });

    it('should update volume when volume slider changed', () => {
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

      const volumeSlider = screen.getByRole('slider', { name: 'Volume' });
      fireEvent.change(volumeSlider, { target: { value: '50' } });

      expect(mockUpdateAudioTrack).toHaveBeenCalledWith('shot-1', 'track-1', {
        ...mockAudioTrack,
        volume: 50,
      });
    });
  });

  describe('Multiple Audio Tracks', () => {
    it('should render all audio tracks', () => {
      const track2: AudioTrack = {
        id: 'track-2',
        name: 'SFX Track',
        type: 'sfx',
        url: '/audio/sfx.mp3',
        startTime: 0,
        duration: 3,
        offset: 0,
        volume: 90,
        fadeIn: 0,
        fadeOut: 0,
        pan: 0,
        muted: false,
        solo: false,
        effects: [],
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

      expect(screen.getByText('Music Track')).toBeInTheDocument();
      expect(screen.getByText('SFX Track')).toBeInTheDocument();
    });
  });
});
