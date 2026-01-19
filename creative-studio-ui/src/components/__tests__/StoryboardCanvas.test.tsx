import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { StoryboardCanvas } from '../StoryboardCanvas';
import type { Shot } from '@/types';

// Mock the store
const mockSelectShot = vi.fn();
const mockReorderShots = vi.fn();
const mockDeleteShot = vi.fn();
let mockShots: Shot[] = [];
let mockSelectedShotId: string | null = null;

vi.mock('@/store', () => ({
  useStore: vi.fn((selector) => {
    if (typeof selector === 'function') {
      const state = {
        shots: mockShots,
        selectedShotId: mockSelectedShotId,
        selectShot: mockSelectShot,
        reorderShots: mockReorderShots,
        deleteShot: mockDeleteShot,
      };
      return selector(state);
    }
    return { 
      shots: mockShots, 
      selectedShotId: mockSelectedShotId, 
      selectShot: mockSelectShot,
      reorderShots: mockReorderShots,
      deleteShot: mockDeleteShot,
    };
  }),
}));

// Helper to render with DndProvider
const renderWithDnd = (ui: React.ReactElement) => {
  return render(
    <DndProvider backend={HTML5Backend}>
      {ui}
    </DndProvider>
  );
};

describe('StoryboardCanvas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockShots = [];
    mockSelectedShotId = null;
  });

  describe('Empty State', () => {
    it('should display empty state when no shots exist', () => {
      renderWithDnd(<StoryboardCanvas />);

      expect(screen.getByText('No shots yet')).toBeInTheDocument();
      expect(screen.getByText(/Get started by dragging assets/)).toBeInTheDocument();
      expect(screen.getByText(/💡 Tip:/)).toBeInTheDocument();
    });
  });

  describe('Shot Display', () => {
    const createMockShot = (overrides: Partial<Shot> = {}): Shot => ({
      id: 'shot-1',
      title: 'Test Shot',
      description: 'Test description',
      duration: 5,
      image: 'https://example.com/image.jpg',
      audioTracks: [],
      effects: [],
      textLayers: [],
      animations: [],
      position: 0,
      ...overrides,
    });

    it('should display shots in a grid layout', () => {
      mockShots = [
        createMockShot({ id: 'shot-1', title: 'Shot 1', position: 0 }),
        createMockShot({ id: 'shot-2', title: 'Shot 2', position: 1 }),
        createMockShot({ id: 'shot-3', title: 'Shot 3', position: 2 }),
      ];

      render(<StoryboardCanvas />);

      expect(screen.getByText('Shot 1')).toBeInTheDocument();
      expect(screen.getByText('Shot 2')).toBeInTheDocument();
      expect(screen.getByText('Shot 3')).toBeInTheDocument();
    });

    it('should display shot thumbnail when image is provided', () => {
      mockShots = [
        createMockShot({
          title: 'Shot with Image',
          image: 'https://example.com/test.jpg',
        }),
      ];

      render(<StoryboardCanvas />);

      const img = screen.getByAltText('Shot with Image');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/test.jpg');
    });

    it('should display placeholder when no image is provided', () => {
      mockShots = [
        createMockShot({
          title: 'Shot without Image',
          image: undefined,
        }),
      ];

      render(<StoryboardCanvas />);

      // Check for placeholder SVG icon
      const shotCard = screen.getByText('Shot without Image').closest('div')?.parentElement;
      expect(shotCard).toBeInTheDocument();
      const svg = shotCard?.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should display shot title', () => {
      mockShots = [createMockShot({ title: 'My Amazing Shot' })];

      render(<StoryboardCanvas />);

      expect(screen.getByText('My Amazing Shot')).toBeInTheDocument();
    });

    it('should display "Untitled Shot" when no title is provided', () => {
      mockShots = [createMockShot({ title: '' })];

      render(<StoryboardCanvas />);

      expect(screen.getByText('Untitled Shot')).toBeInTheDocument();
    });

    it('should display shot description', () => {
      mockShots = [createMockShot({ description: 'This is a test description' })];

      render(<StoryboardCanvas />);

      expect(screen.getByText('This is a test description')).toBeInTheDocument();
    });

    it('should display formatted duration', () => {
      mockShots = [createMockShot({ duration: 125 })]; // 2:05

      render(<StoryboardCanvas />);

      expect(screen.getByText('2:05')).toBeInTheDocument();
    });

    it('should display position indicator', () => {
      mockShots = [createMockShot({ position: 5 })];

      render(<StoryboardCanvas />);

      expect(screen.getByText('#6')).toBeInTheDocument(); // position + 1
    });
  });

  describe('Metadata Indicators', () => {
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

    it('should display audio track indicator when audio tracks exist', () => {
      mockShots = [
        createMockShot({
          audioTracks: [
            {
              id: 'audio-1',
              name: 'Background Music',
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
        }),
      ];

      render(<StoryboardCanvas />);

      // Check for audio icon and count
      const shotCard = screen.getByText('Test Shot').closest('div')?.parentElement;
      expect(shotCard).toBeInTheDocument();
      expect(within(shotCard!).getByText('1')).toBeInTheDocument();
    });

    it('should display effects indicator when effects exist', () => {
      mockShots = [
        createMockShot({
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
        }),
      ];

      render(<StoryboardCanvas />);

      const shotCard = screen.getByText('Test Shot').closest('div')?.parentElement;
      expect(shotCard).toBeInTheDocument();
      expect(within(shotCard!).getByText('1')).toBeInTheDocument();
    });

    it('should display text layers indicator when text layers exist', () => {
      mockShots = [
        createMockShot({
          textLayers: [
            {
              id: 'text-1',
              content: 'Hello World',
              font: 'Arial',
              fontSize: 24,
              color: '#000000',
              position: { x: 50, y: 50 },
              alignment: 'center',
              startTime: 0,
              duration: 5,
              style: {},
            },
          ],
        }),
      ];

      render(<StoryboardCanvas />);

      const shotCard = screen.getByText('Test Shot').closest('div')?.parentElement;
      expect(shotCard).toBeInTheDocument();
      expect(within(shotCard!).getByText('1')).toBeInTheDocument();
    });

    it('should display transition indicator when transition exists', () => {
      mockShots = [
        createMockShot({
          transitionOut: {
            id: 'transition-1',
            type: 'fade',
            duration: 1,
            easing: 'ease-in-out',
          },
        }),
      ];

      render(<StoryboardCanvas />);

      const shotCard = screen.getByText('Test Shot').closest('div')?.parentElement;
      expect(shotCard).toBeInTheDocument();
      // Check for transition icon
      const svg = shotCard?.querySelector('svg[viewBox="0 0 24 24"]');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Selection', () => {
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

    it('should call selectShot when a shot is clicked', async () => {
      const user = userEvent.setup();
      mockShots = [createMockShot({ id: 'shot-1', title: 'Clickable Shot' })];

      render(<StoryboardCanvas />);

      const shotCard = screen.getByText('Clickable Shot').closest('div')?.parentElement;
      expect(shotCard).toBeInTheDocument();

      await user.click(shotCard!);

      expect(mockSelectShot).toHaveBeenCalledWith('shot-1');
    });

    it('should display visual selection indicator for selected shot', () => {
      mockShots = [createMockShot({ id: 'shot-1', title: 'Selected Shot' })];
      mockSelectedShotId = 'shot-1';

      render(<StoryboardCanvas />);

      const shotCard = screen.getByText('Selected Shot').closest('div')?.parentElement;
      expect(shotCard).toBeInTheDocument();
      expect(shotCard).toHaveClass('ring-2', 'ring-blue-500');
    });

    it('should not display selection indicator for unselected shots', () => {
      mockShots = [
        createMockShot({ id: 'shot-1', title: 'Shot 1' }),
        createMockShot({ id: 'shot-2', title: 'Shot 2' }),
      ];
      mockSelectedShotId = 'shot-1';

      render(<StoryboardCanvas />);

      const shot1Card = screen.getByText('Shot 1').closest('div')?.parentElement;
      const shot2Card = screen.getByText('Shot 2').closest('div')?.parentElement;

      expect(shot1Card).toHaveClass('ring-2', 'ring-blue-500');
      expect(shot2Card).not.toHaveClass('ring-2', 'ring-blue-500');
    });
  });

  describe('Responsive Layout', () => {
    it('should apply responsive grid classes', () => {
      mockShots = [
        {
          id: 'shot-1',
          title: 'Test Shot',
          description: 'Test',
          duration: 5,
          audioTracks: [],
          effects: [],
          textLayers: [],
          animations: [],
          position: 0,
        },
      ];

      const { container } = render(<StoryboardCanvas />);

      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toBeInTheDocument();
      expect(gridContainer).toHaveClass(
        'grid-cols-1',
        'sm:grid-cols-2',
        'lg:grid-cols-3',
        'xl:grid-cols-4'
      );
    });
  });

  describe('Duration Formatting', () => {
    const createMockShot = (duration: number): Shot => ({
      id: 'shot-1',
      title: 'Test Shot',
      description: 'Test',
      duration,
      audioTracks: [],
      effects: [],
      textLayers: [],
      animations: [],
      position: 0,
    });

    it('should format duration correctly for seconds only', () => {
      mockShots = [createMockShot(45)];

      render(<StoryboardCanvas />);
      expect(screen.getByText('0:45')).toBeInTheDocument();
    });

    it('should format duration correctly for minutes and seconds', () => {
      mockShots = [createMockShot(125)];

      render(<StoryboardCanvas />);
      expect(screen.getByText('2:05')).toBeInTheDocument();
    });

    it('should pad seconds with zero when less than 10', () => {
      mockShots = [createMockShot(63)];

      render(<StoryboardCanvas />);
      expect(screen.getByText('1:03')).toBeInTheDocument();
    });
  });
});
