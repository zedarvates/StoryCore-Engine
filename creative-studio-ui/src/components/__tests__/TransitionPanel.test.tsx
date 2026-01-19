import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TransitionPanel } from '../TransitionPanel';
import { useStore, useSelectedShot } from '../../store';
import type { Shot, Transition } from '../../types';

// Mock the store
vi.mock('../../store', () => ({
  useStore: vi.fn(),
  useSelectedShot: vi.fn(),
}));

describe('TransitionPanel', () => {
  const mockSetTransition = vi.fn();
  
  const createMockShot = (id: string, title: string, position: number, transitionOut?: Transition): Shot => ({
    id,
    title,
    description: `Description for ${title}`,
    duration: 5,
    position,
    audioTracks: [],
    effects: [],
    textLayers: [],
    animations: [],
    transitionOut,
  });

  const createMockTransition = (overrides?: Partial<Transition>): Transition => ({
    id: 'transition-1',
    type: 'fade',
    duration: 1.0,
    easing: 'ease-in-out',
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('No Shot Selected', () => {
    beforeEach(() => {
      vi.mocked(useStore).mockImplementation((selector: any) => {
        const state = {
          shots: [],
          setTransition: mockSetTransition,
        };
        return selector ? selector(state) : state;
      });

      vi.mocked(useSelectedShot).mockReturnValue(null);
    });

    it('should display "No Shot Selected" message when no shot is selected', () => {
      render(<TransitionPanel />);

      expect(screen.getByText('No Shot Selected')).toBeInTheDocument();
      expect(screen.getByText('Select a shot to manage transitions')).toBeInTheDocument();
    });
  });

  describe('Last Shot', () => {
    beforeEach(() => {
      const shot1 = createMockShot('shot-1', 'Shot 1', 0);
      
      vi.mocked(useStore).mockImplementation((selector: any) => {
        const state = {
          shots: [shot1],
          setTransition: mockSetTransition,
        };
        return selector ? selector(state) : state;
      });

      vi.mocked(useSelectedShot).mockReturnValue(shot1);
    });

    it('should display "Last Shot" message when selected shot is the last one', () => {
      render(<TransitionPanel />);

      expect(screen.getByText('Last Shot')).toBeInTheDocument();
      expect(screen.getByText('Transitions can only be added between shots')).toBeInTheDocument();
    });
  });

  describe('No Transition State', () => {
    const shot1 = createMockShot('shot-1', 'Opening Scene', 0);
    const shot2 = createMockShot('shot-2', 'Main Action', 1);

    beforeEach(() => {
      vi.mocked(useStore).mockImplementation((selector: any) => {
        const state = {
          shots: [shot1, shot2],
          setTransition: mockSetTransition,
        };
        return selector ? selector(state) : state;
      });

      vi.mocked(useSelectedShot).mockReturnValue(shot1);
    });

    it('should display "No Transition" message when shot has no transition', () => {
      render(<TransitionPanel />);

      expect(screen.getByText('No Transition')).toBeInTheDocument();
      expect(screen.getByText('Add a transition to smoothly connect this shot to the next')).toBeInTheDocument();
    });

    it('should display shot titles in the header', () => {
      render(<TransitionPanel />);

      expect(screen.getByText(/Transition from "Opening Scene" to "Main Action"/)).toBeInTheDocument();
    });

    it('should call setTransition with new transition when "Add Transition" is clicked', () => {
      render(<TransitionPanel />);

      const addButton = screen.getByRole('button', { name: /Add Transition/i });
      fireEvent.click(addButton);

      expect(mockSetTransition).toHaveBeenCalledWith(
        'shot-1',
        expect.objectContaining({
          type: 'fade',
          duration: 1.0,
          easing: 'ease-in-out',
        })
      );
    });
  });

  describe('Transition Editor', () => {
    const shot1 = createMockShot('shot-1', 'Shot 1', 0, createMockTransition());
    const shot2 = createMockShot('shot-2', 'Shot 2', 1);

    beforeEach(() => {
      vi.mocked(useStore).mockImplementation((selector: any) => {
        const state = {
          shots: [shot1, shot2],
          setTransition: mockSetTransition,
        };
        return selector ? selector(state) : state;
      });

      vi.mocked(useSelectedShot).mockReturnValue(shot1);
    });

    it('should display transition settings when shot has a transition', () => {
      render(<TransitionPanel />);

      expect(screen.getByText('Transition Settings')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Transition Type')).toBeInTheDocument();
      expect(screen.getByText('Duration')).toBeInTheDocument();
      expect(screen.getByText('Easing Curve')).toBeInTheDocument();
    });

    it('should display current transition duration', () => {
      const shotWithDuration = createMockShot('shot-1', 'Shot 1', 0, createMockTransition({ duration: 2.5 }));
      
      vi.mocked(useSelectedShot).mockReturnValue(shotWithDuration);

      render(<TransitionPanel />);

      expect(screen.getByText('2.5s')).toBeInTheDocument();
    });

    it('should call setTransition with undefined when "Remove Transition" is clicked', () => {
      render(<TransitionPanel />);

      const removeButton = screen.getByRole('button', { name: /Remove Transition/i });
      fireEvent.click(removeButton);

      expect(mockSetTransition).toHaveBeenCalledWith('shot-1', undefined);
    });
  });

  describe('Direction Controls', () => {
    it('should display direction controls for "wipe" transition', () => {
      const shot1 = createMockShot('shot-1', 'Shot 1', 0, createMockTransition({ type: 'wipe', direction: 'right' }));
      const shot2 = createMockShot('shot-2', 'Shot 2', 1);
      
      vi.mocked(useStore).mockImplementation((selector: any) => {
        const state = {
          shots: [shot1, shot2],
          setTransition: mockSetTransition,
        };
        return selector ? selector(state) : state;
      });

      vi.mocked(useSelectedShot).mockReturnValue(shot1);

      render(<TransitionPanel />);

      expect(screen.getByText('Direction')).toBeInTheDocument();
      expect(screen.getByLabelText('Left')).toBeInTheDocument();
      expect(screen.getByLabelText('Right')).toBeInTheDocument();
      expect(screen.getByLabelText('Up')).toBeInTheDocument();
      expect(screen.getByLabelText('Down')).toBeInTheDocument();
    });

    it('should display direction controls for "slide" transition', () => {
      const shot1 = createMockShot('shot-1', 'Shot 1', 0, createMockTransition({ type: 'slide', direction: 'left' }));
      const shot2 = createMockShot('shot-2', 'Shot 2', 1);
      
      vi.mocked(useStore).mockImplementation((selector: any) => {
        const state = {
          shots: [shot1, shot2],
          setTransition: mockSetTransition,
        };
        return selector ? selector(state) : state;
      });

      vi.mocked(useSelectedShot).mockReturnValue(shot1);

      render(<TransitionPanel />);

      expect(screen.getByText('Direction')).toBeInTheDocument();
    });

    it('should NOT display direction controls for "fade" transition', () => {
      const shot1 = createMockShot('shot-1', 'Shot 1', 0, createMockTransition({ type: 'fade' }));
      const shot2 = createMockShot('shot-2', 'Shot 2', 1);
      
      vi.mocked(useStore).mockImplementation((selector: any) => {
        const state = {
          shots: [shot1, shot2],
          setTransition: mockSetTransition,
        };
        return selector ? selector(state) : state;
      });

      vi.mocked(useSelectedShot).mockReturnValue(shot1);

      render(<TransitionPanel />);

      expect(screen.queryByText('Direction')).not.toBeInTheDocument();
    });

    it('should NOT display direction controls for "dissolve" transition', () => {
      const shot1 = createMockShot('shot-1', 'Shot 1', 0, createMockTransition({ type: 'dissolve' }));
      const shot2 = createMockShot('shot-2', 'Shot 2', 1);
      
      vi.mocked(useStore).mockImplementation((selector: any) => {
        const state = {
          shots: [shot1, shot2],
          setTransition: mockSetTransition,
        };
        return selector ? selector(state) : state;
      });

      vi.mocked(useSelectedShot).mockReturnValue(shot1);

      render(<TransitionPanel />);

      expect(screen.queryByText('Direction')).not.toBeInTheDocument();
    });

    it('should update direction when changed', () => {
      const shot1 = createMockShot('shot-1', 'Shot 1', 0, createMockTransition({ type: 'wipe', direction: 'right' }));
      const shot2 = createMockShot('shot-2', 'Shot 2', 1);
      
      vi.mocked(useStore).mockImplementation((selector: any) => {
        const state = {
          shots: [shot1, shot2],
          setTransition: mockSetTransition,
        };
        return selector ? selector(state) : state;
      });

      vi.mocked(useSelectedShot).mockReturnValue(shot1);

      render(<TransitionPanel />);

      // Click the "Left" direction radio button
      const leftRadio = screen.getByLabelText('Left');
      fireEvent.click(leftRadio);

      expect(mockSetTransition).toHaveBeenCalledWith(
        'shot-1',
        expect.objectContaining({
          direction: 'left',
        })
      );
    });
  });

  describe('Transition Descriptions', () => {
    const transitionTypes: Array<{ type: Transition['type']; description: string }> = [
      { type: 'fade', description: 'Gradually fade from one shot to another' },
      { type: 'dissolve', description: 'Blend shots together with a cross-dissolve' },
      { type: 'wipe', description: 'Wipe across the screen in a direction' },
      { type: 'slide', description: 'Slide the next shot in from a direction' },
      { type: 'zoom', description: 'Zoom in or out between shots' },
      { type: 'custom', description: 'Custom transition with advanced parameters' },
    ];

    transitionTypes.forEach(({ type, description }) => {
      it(`should display correct description for ${type} transition`, () => {
        const shot1 = createMockShot('shot-1', 'Shot 1', 0, createMockTransition({ type }));
        const shot2 = createMockShot('shot-2', 'Shot 2', 1);
        
        vi.mocked(useStore).mockImplementation((selector: any) => {
          const state = {
            shots: [shot1, shot2],
            setTransition: mockSetTransition,
          };
          return selector ? selector(state) : state;
        });

        vi.mocked(useSelectedShot).mockReturnValue(shot1);

        render(<TransitionPanel />);
        
        expect(screen.getByText(description)).toBeInTheDocument();
      });
    });
  });

  describe('Transition Preview', () => {
    const shot1 = createMockShot('shot-1', 'Shot 1', 0, createMockTransition());
    const shot2 = createMockShot('shot-2', 'Shot 2', 1);

    beforeEach(() => {
      vi.mocked(useStore).mockImplementation((selector: any) => {
        const state = {
          shots: [shot1, shot2],
          setTransition: mockSetTransition,
        };
        return selector ? selector(state) : state;
      });

      vi.mocked(useSelectedShot).mockReturnValue(shot1);
    });

    it('should display transition preview section when transition exists', () => {
      render(<TransitionPanel />);

      expect(screen.getByText('Preview')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Play Preview/i })).toBeInTheDocument();
    });

    it('should display "Play Preview" button in initial state', () => {
      render(<TransitionPanel />);

      const playButton = screen.getByRole('button', { name: /Play Preview/i });
      expect(playButton).toBeInTheDocument();
      expect(playButton).not.toBeDisabled();
    });

    it('should display preview container with gradient backgrounds', () => {
      render(<TransitionPanel />);

      expect(screen.getByText('Shot 1')).toBeInTheDocument();
      expect(screen.getByText('Shot 2')).toBeInTheDocument();
    });

    it('should display preview help text', () => {
      render(<TransitionPanel />);

      expect(screen.getByText('Click "Play Preview" to see how the transition will look')).toBeInTheDocument();
    });

    it('should disable play button when playing', () => {
      render(<TransitionPanel />);

      const playButton = screen.getByRole('button', { name: /Play Preview/i });
      fireEvent.click(playButton);

      // Button should show "Playing..." and be disabled
      expect(screen.getByRole('button', { name: /Playing.../i })).toBeDisabled();
    });
  });
});
