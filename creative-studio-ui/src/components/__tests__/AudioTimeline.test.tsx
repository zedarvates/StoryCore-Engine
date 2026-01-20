/**
 * Unit tests for AudioTimeline component
 * Requirements: 4.1
 * 
 * Note: These are minimal tests for core functionality.
 * Task 9.3 and 9.4 (property tests and comprehensive unit tests) are marked as optional.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AudioTimeline } from '../AudioTimeline';
import type { Shot, DialoguePhrase } from '../../types/projectDashboard';

describe('AudioTimeline', () => {
  const mockOnPhraseMove = vi.fn();
  const mockOnPhraseResize = vi.fn();
  const mockOnTimelineClick = vi.fn();

  const createMockShot = (overrides?: Partial<Shot>): Shot => ({
    id: 'shot-1',
    sequenceId: 'seq-1',
    startTime: 0,
    duration: 10,
    prompt: 'Test prompt',
    metadata: {},
    ...overrides,
  });

  const createMockPhrase = (overrides?: Partial<DialoguePhrase>): DialoguePhrase => ({
    id: 'phrase-1',
    shotId: 'shot-1',
    text: 'Test dialogue',
    startTime: 2,
    endTime: 5,
    metadata: {},
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render timeline canvas', () => {
      const shots = [createMockShot()];
      const phrases = [createMockPhrase()];

      render(
        <AudioTimeline
          shots={shots}
          phrases={phrases}
          duration={30}
          currentTime={0}
          onPhraseMove={mockOnPhraseMove}
          onPhraseResize={mockOnPhraseResize}
          onTimelineClick={mockOnTimelineClick}
        />
      );

      // Check for canvas element
      const canvas = document.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('should render zoom controls', () => {
      const shots = [createMockShot()];
      const phrases = [createMockPhrase()];

      render(
        <AudioTimeline
          shots={shots}
          phrases={phrases}
          duration={30}
          currentTime={0}
          onPhraseMove={mockOnPhraseMove}
          onPhraseResize={mockOnPhraseResize}
          onTimelineClick={mockOnTimelineClick}
        />
      );

      expect(screen.getByText('Zoom In')).toBeInTheDocument();
      expect(screen.getByText('Zoom Out')).toBeInTheDocument();
      expect(screen.getByText('Reset')).toBeInTheDocument();
    });

    it('should render legend', () => {
      const shots = [createMockShot()];
      const phrases = [createMockPhrase()];

      render(
        <AudioTimeline
          shots={shots}
          phrases={phrases}
          duration={30}
          currentTime={0}
          onPhraseMove={mockOnPhraseMove}
          onPhraseResize={mockOnPhraseResize}
          onTimelineClick={mockOnTimelineClick}
        />
      );

      expect(screen.getByText('Shot Boundary')).toBeInTheDocument();
      expect(screen.getByText('Dialogue Phrase')).toBeInTheDocument();
      expect(screen.getByText('Playhead')).toBeInTheDocument();
    });
  });

  describe('Zoom Controls', () => {
    it('should zoom in when Zoom In button is clicked', () => {
      const shots = [createMockShot()];
      const phrases = [createMockPhrase()];

      render(
        <AudioTimeline
          shots={shots}
          phrases={phrases}
          duration={30}
          currentTime={0}
          onPhraseMove={mockOnPhraseMove}
          onPhraseResize={mockOnPhraseResize}
          onTimelineClick={mockOnTimelineClick}
        />
      );

      const zoomInButton = screen.getByText('Zoom In');
      const initialZoom = screen.getByText(/60s/); // Default zoom
      expect(initialZoom).toBeInTheDocument();

      fireEvent.click(zoomInButton);

      expect(screen.getByText(/50s/)).toBeInTheDocument();
    });

    it('should zoom out when Zoom Out button is clicked', () => {
      const shots = [createMockShot()];
      const phrases = [createMockPhrase()];

      render(
        <AudioTimeline
          shots={shots}
          phrases={phrases}
          duration={30}
          currentTime={0}
          onPhraseMove={mockOnPhraseMove}
          onPhraseResize={mockOnPhraseResize}
          onTimelineClick={mockOnTimelineClick}
        />
      );

      const zoomOutButton = screen.getByText('Zoom Out');
      fireEvent.click(zoomOutButton);

      expect(screen.getByText(/70s/)).toBeInTheDocument();
    });

    it('should reset zoom when Reset button is clicked', () => {
      const shots = [createMockShot()];
      const phrases = [createMockPhrase()];

      render(
        <AudioTimeline
          shots={shots}
          phrases={phrases}
          duration={30}
          currentTime={0}
          onPhraseMove={mockOnPhraseMove}
          onPhraseResize={mockOnPhraseResize}
          onTimelineClick={mockOnTimelineClick}
        />
      );

      // Zoom in first
      const zoomInButton = screen.getByText('Zoom In');
      fireEvent.click(zoomInButton);
      expect(screen.getByText(/50s/)).toBeInTheDocument();

      // Reset
      const resetButton = screen.getByText('Reset');
      fireEvent.click(resetButton);
      expect(screen.getByText(/60s/)).toBeInTheDocument();
    });

    it('should disable Zoom In button at minimum zoom', () => {
      const shots = [createMockShot()];
      const phrases = [createMockPhrase()];

      render(
        <AudioTimeline
          shots={shots}
          phrases={phrases}
          duration={30}
          currentTime={0}
          onPhraseMove={mockOnPhraseMove}
          onPhraseResize={mockOnPhraseResize}
          onTimelineClick={mockOnTimelineClick}
        />
      );

      const zoomInButton = screen.getByText('Zoom In') as HTMLButtonElement;
      
      // Zoom in to minimum (10s)
      for (let i = 0; i < 10; i++) {
        if (!zoomInButton.disabled) {
          fireEvent.click(zoomInButton);
        }
      }

      expect(zoomInButton.disabled).toBe(true);
    });

    it('should disable Zoom Out button at maximum zoom', () => {
      const shots = [createMockShot()];
      const phrases = [createMockPhrase()];

      render(
        <AudioTimeline
          shots={shots}
          phrases={phrases}
          duration={30}
          currentTime={0}
          onPhraseMove={mockOnPhraseMove}
          onPhraseResize={mockOnPhraseResize}
          onTimelineClick={mockOnTimelineClick}
        />
      );

      const zoomOutButton = screen.getByText('Zoom Out') as HTMLButtonElement;
      
      // Zoom out to maximum (300s)
      for (let i = 0; i < 30; i++) {
        if (!zoomOutButton.disabled) {
          fireEvent.click(zoomOutButton);
        }
      }

      expect(zoomOutButton.disabled).toBe(true);
    });
  });

  describe('Timeline Interaction', () => {
    it('should call onTimelineClick when canvas is clicked', () => {
      const shots = [createMockShot()];
      const phrases: DialoguePhrase[] = [];

      render(
        <AudioTimeline
          shots={shots}
          phrases={phrases}
          duration={30}
          currentTime={0}
          onPhraseMove={mockOnPhraseMove}
          onPhraseResize={mockOnPhraseResize}
          onTimelineClick={mockOnTimelineClick}
        />
      );

      const canvas = document.querySelector('canvas');
      expect(canvas).toBeInTheDocument();

      if (canvas) {
        fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
      }

      // Should call onTimelineClick (exact time depends on canvas dimensions)
      expect(mockOnTimelineClick).toHaveBeenCalled();
    });
  });

  describe('Empty State', () => {
    it('should render with no shots', () => {
      render(
        <AudioTimeline
          shots={[]}
          phrases={[]}
          duration={30}
          currentTime={0}
          onPhraseMove={mockOnPhraseMove}
          onPhraseResize={mockOnPhraseResize}
          onTimelineClick={mockOnTimelineClick}
        />
      );

      const canvas = document.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('should render with no phrases', () => {
      const shots = [createMockShot()];

      render(
        <AudioTimeline
          shots={shots}
          phrases={[]}
          duration={30}
          currentTime={0}
          onPhraseMove={mockOnPhraseMove}
          onPhraseResize={mockOnPhraseResize}
          onTimelineClick={mockOnTimelineClick}
        />
      );

      const canvas = document.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Multiple Items', () => {
    it('should render multiple shots', () => {
      const shots = [
        createMockShot({ id: 'shot-1', startTime: 0, duration: 10 }),
        createMockShot({ id: 'shot-2', startTime: 10, duration: 10 }),
        createMockShot({ id: 'shot-3', startTime: 20, duration: 10 }),
      ];

      render(
        <AudioTimeline
          shots={shots}
          phrases={[]}
          duration={30}
          currentTime={0}
          onPhraseMove={mockOnPhraseMove}
          onPhraseResize={mockOnPhraseResize}
          onTimelineClick={mockOnTimelineClick}
        />
      );

      const canvas = document.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('should render multiple phrases', () => {
      const shots = [createMockShot()];
      const phrases = [
        createMockPhrase({ id: 'phrase-1', startTime: 0, endTime: 3 }),
        createMockPhrase({ id: 'phrase-2', startTime: 4, endTime: 7 }),
        createMockPhrase({ id: 'phrase-3', startTime: 8, endTime: 10 }),
      ];

      render(
        <AudioTimeline
          shots={shots}
          phrases={phrases}
          duration={30}
          currentTime={0}
          onPhraseMove={mockOnPhraseMove}
          onPhraseResize={mockOnPhraseResize}
          onTimelineClick={mockOnTimelineClick}
        />
      );

      const canvas = document.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });
  });
});
