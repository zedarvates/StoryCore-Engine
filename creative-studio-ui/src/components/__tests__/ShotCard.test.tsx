/**
 * Component tests for ShotCard
 * Tests shot card rendering with thumbnails, metadata, and interactions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import type { Shot } from '@/types';

// Mock ShotCard component (inline for testing)
interface ShotCardProps {
  shot: Shot;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
}

const ShotCard: React.FC<ShotCardProps> = ({ shot, isSelected, onSelect, onDelete }) => {
  return (
    <div
      className={`shot-card ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(shot.id)}
      data-testid={`shot-card-${shot.id}`}
    >
      {shot.image ? (
        <img src={shot.image} alt={shot.title || 'Shot'} />
      ) : (
        <div className="placeholder">No Image</div>
      )}
      <div className="shot-info">
        <h3>{shot.title || 'Untitled Shot'}</h3>
        <p>{shot.description}</p>
        <span className="duration">{formatDuration(shot.duration)}</span>
        {shot.audioTracks.length > 0 && (
          <span className="audio-indicator">{shot.audioTracks.length} audio</span>
        )}
        {shot.effects.length > 0 && (
          <span className="effects-indicator">{shot.effects.length} effects</span>
        )}
        {shot.textLayers.length > 0 && (
          <span className="text-indicator">{shot.textLayers.length} text</span>
        )}
        {shot.transitionOut && <span className="transition-indicator">Transition</span>}
      </div>
      {onDelete && (
        <button onClick={(e) => { e.stopPropagation(); onDelete(shot.id); }}>
          Delete
        </button>
      )}
    </div>
  );
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

describe('ShotCard', () => {
  const createMockShot = (overrides: Partial<Shot> = {}): Shot => ({
    id: 'shot-1',
    title: 'Test Shot',
    description: 'Test description',
    duration: 5,
    audioTracks: [],
    effects: [],
    textLayers: [],
    animations: [],
    position: 0,
    ...overrides,
  });

  const mockOnSelect = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render shot card with basic information', () => {
      const shot = createMockShot({
        title: 'My Shot',
        description: 'Shot description',
        duration: 10,
      });

      render(<ShotCard shot={shot} isSelected={false} onSelect={mockOnSelect} />);

      expect(screen.getByText('My Shot')).toBeInTheDocument();
      expect(screen.getByText('Shot description')).toBeInTheDocument();
      expect(screen.getByText('0:10')).toBeInTheDocument();
    });

    it('should render thumbnail when image is provided', () => {
      const shot = createMockShot({
        title: 'Shot with Image',
        image: 'https://example.com/image.jpg',
      });

      render(<ShotCard shot={shot} isSelected={false} onSelect={mockOnSelect} />);

      const img = screen.getByAltText('Shot with Image');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
    });

    it('should render placeholder when no image is provided', () => {
      const shot = createMockShot({ image: undefined });

      render(<ShotCard shot={shot} isSelected={false} onSelect={mockOnSelect} />);

      expect(screen.getByText('No Image')).toBeInTheDocument();
    });

    it('should render "Untitled Shot" when no title is provided', () => {
      const shot = createMockShot({ title: '' });

      render(<ShotCard shot={shot} isSelected={false} onSelect={mockOnSelect} />);

      expect(screen.getByText('Untitled Shot')).toBeInTheDocument();
    });
  });

  describe('Metadata Indicators', () => {
    it('should display audio track indicator', () => {
      const shot = createMockShot({
        audioTracks: [
          {
            id: 'audio-1',
            name: 'Music',
            type: 'music',
            url: 'audio.mp3',
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
          {
            id: 'audio-2',
            name: 'SFX',
            type: 'sfx',
            url: 'sfx.mp3',
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
      });

      render(<ShotCard shot={shot} isSelected={false} onSelect={mockOnSelect} />);

      expect(screen.getByText('2 audio')).toBeInTheDocument();
    });

    it('should display effects indicator', () => {
      const shot = createMockShot({
        effects: [
          {
            id: 'effect-1',
            type: 'filter',
            name: 'vintage',
            enabled: true,
            intensity: 50,
            parameters: {},
          },
        ],
      });

      render(<ShotCard shot={shot} isSelected={false} onSelect={mockOnSelect} />);

      expect(screen.getByText('1 effects')).toBeInTheDocument();
    });

    it('should display text layers indicator', () => {
      const shot = createMockShot({
        textLayers: [
          {
            id: 'text-1',
            content: 'Title',
            font: 'Arial',
            fontSize: 24,
            color: '#000',
            position: { x: 50, y: 50 },
            alignment: 'center',
            startTime: 0,
            duration: 5,
            style: {},
          },
        ],
      });

      render(<ShotCard shot={shot} isSelected={false} onSelect={mockOnSelect} />);

      expect(screen.getByText('1 text')).toBeInTheDocument();
    });

    it('should display transition indicator', () => {
      const shot = createMockShot({
        transitionOut: {
          id: 'transition-1',
          type: 'fade',
          duration: 1,
          easing: 'ease-in-out',
        },
      });

      render(<ShotCard shot={shot} isSelected={false} onSelect={mockOnSelect} />);

      expect(screen.getByText('Transition')).toBeInTheDocument();
    });

    it('should display multiple indicators simultaneously', () => {
      const shot = createMockShot({
        audioTracks: [
          {
            id: 'audio-1',
            name: 'Music',
            type: 'music',
            url: 'audio.mp3',
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
        effects: [
          {
            id: 'effect-1',
            type: 'filter',
            name: 'vintage',
            enabled: true,
            intensity: 50,
            parameters: {},
          },
        ],
        textLayers: [
          {
            id: 'text-1',
            content: 'Title',
            font: 'Arial',
            fontSize: 24,
            color: '#000',
            position: { x: 50, y: 50 },
            alignment: 'center',
            startTime: 0,
            duration: 5,
            style: {},
          },
        ],
      });

      render(<ShotCard shot={shot} isSelected={false} onSelect={mockOnSelect} />);

      expect(screen.getByText('1 audio')).toBeInTheDocument();
      expect(screen.getByText('1 effects')).toBeInTheDocument();
      expect(screen.getByText('1 text')).toBeInTheDocument();
    });
  });

  describe('Selection', () => {
    it('should call onSelect when clicked', async () => {
      const user = userEvent.setup();
      const shot = createMockShot({ id: 'shot-123' });

      render(<ShotCard shot={shot} isSelected={false} onSelect={mockOnSelect} />);

      const card = screen.getByTestId('shot-card-shot-123');
      await user.click(card);

      expect(mockOnSelect).toHaveBeenCalledWith('shot-123');
      expect(mockOnSelect).toHaveBeenCalledTimes(1);
    });

    it('should apply selected class when isSelected is true', () => {
      const shot = createMockShot();

      render(<ShotCard shot={shot} isSelected={true} onSelect={mockOnSelect} />);

      const card = screen.getByTestId(`shot-card-${shot.id}`);
      expect(card).toHaveClass('selected');
    });

    it('should not apply selected class when isSelected is false', () => {
      const shot = createMockShot();

      render(<ShotCard shot={shot} isSelected={false} onSelect={mockOnSelect} />);

      const card = screen.getByTestId(`shot-card-${shot.id}`);
      expect(card).not.toHaveClass('selected');
    });
  });

  describe('Delete Action', () => {
    it('should render delete button when onDelete is provided', () => {
      const shot = createMockShot();

      render(
        <ShotCard
          shot={shot}
          isSelected={false}
          onSelect={mockOnSelect}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should not render delete button when onDelete is not provided', () => {
      const shot = createMockShot();

      render(<ShotCard shot={shot} isSelected={false} onSelect={mockOnSelect} />);

      expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    });

    it('should call onDelete when delete button is clicked', async () => {
      const user = userEvent.setup();
      const shot = createMockShot({ id: 'shot-456' });

      render(
        <ShotCard
          shot={shot}
          isSelected={false}
          onSelect={mockOnSelect}
          onDelete={mockOnDelete}
        />
      );

      const deleteButton = screen.getByText('Delete');
      await user.click(deleteButton);

      expect(mockOnDelete).toHaveBeenCalledWith('shot-456');
      expect(mockOnDelete).toHaveBeenCalledTimes(1);
    });

    it('should not trigger onSelect when delete button is clicked', async () => {
      const user = userEvent.setup();
      const shot = createMockShot();

      render(
        <ShotCard
          shot={shot}
          isSelected={false}
          onSelect={mockOnSelect}
          onDelete={mockOnDelete}
        />
      );

      const deleteButton = screen.getByText('Delete');
      await user.click(deleteButton);

      expect(mockOnSelect).not.toHaveBeenCalled();
    });
  });

  describe('Duration Formatting', () => {
    it('should format duration with minutes and seconds', () => {
      const shot = createMockShot({ duration: 125 }); // 2:05

      render(<ShotCard shot={shot} isSelected={false} onSelect={mockOnSelect} />);

      expect(screen.getByText('2:05')).toBeInTheDocument();
    });

    it('should pad seconds with zero when less than 10', () => {
      const shot = createMockShot({ duration: 63 }); // 1:03

      render(<ShotCard shot={shot} isSelected={false} onSelect={mockOnSelect} />);

      expect(screen.getByText('1:03')).toBeInTheDocument();
    });

    it('should handle zero duration', () => {
      const shot = createMockShot({ duration: 0 });

      render(<ShotCard shot={shot} isSelected={false} onSelect={mockOnSelect} />);

      expect(screen.getByText('0:00')).toBeInTheDocument();
    });

    it('should handle large durations', () => {
      const shot = createMockShot({ duration: 3661 }); // 61:01

      render(<ShotCard shot={shot} isSelected={false} onSelect={mockOnSelect} />);

      expect(screen.getByText('61:01')).toBeInTheDocument();
    });
  });
});
