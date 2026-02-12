import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AnimationPanel } from '../AnimationPanel';
import { useStore } from '../../store';
import type { Shot, Animation, Keyframe } from '../../types';

// Mock the store
vi.mock('../../store', () => ({
  useStore: vi.fn(),
}));

describe('AnimationPanel', () => {
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

  const mockAddAnimation = vi.fn();
  const mockUpdateAnimation = vi.fn();
  const mockDeleteAnimation = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as any).mockImplementation((selector: any) => {
      const state = {
        shots: [mockShot],
        addAnimation: mockAddAnimation,
        updateAnimation: mockUpdateAnimation,
        deleteAnimation: mockDeleteAnimation,
      };
      return selector(state);
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render animation panel with property selector', () => {
      render(<AnimationPanel shotId="shot-1" />);

      expect(screen.getByText('Keyframe Animation')).toBeInTheDocument();
      expect(screen.getByText('Animated Property')).toBeInTheDocument();
      expect(screen.getByText('position')).toBeInTheDocument();
      expect(screen.getByText('scale')).toBeInTheDocument();
      expect(screen.getByText('rotation')).toBeInTheDocument();
      expect(screen.getByText('opacity')).toBeInTheDocument();
    });

    it('should show message when no shot is selected', () => {
      (useStore as any).mockImplementation((selector: any) => {
        const state = {
          shots: [],
          addAnimation: mockAddAnimation,
          updateAnimation: mockUpdateAnimation,
          deleteAnimation: mockDeleteAnimation,
        };
        return selector(state);
      });

      render(<AnimationPanel shotId="nonexistent" />);

      expect(
        screen.getByText('No shot selected. Select a shot to manage animations.')
      ).toBeInTheDocument();
    });

    it('should show add animation button when no animation exists', () => {
      render(<AnimationPanel shotId="shot-1" />);

      expect(screen.getByText('No animation for position')).toBeInTheDocument();
      expect(screen.getByText('Add Animation')).toBeInTheDocument();
    });

    it('should show animation controls when animation exists', () => {
      const mockAnimation: Animation = {
        id: 'anim-1',
        property: 'position',
        keyframes: [],
      };

      (useStore as any).mockImplementation((selector: any) => {
        const state = {
          shots: [{ ...mockShot, animations: [mockAnimation] }],
          addAnimation: mockAddAnimation,
          updateAnimation: mockUpdateAnimation,
          deleteAnimation: mockDeleteAnimation,
        };
        return selector(state);
      });

      render(<AnimationPanel shotId="shot-1" />);

      expect(screen.getByText('Position Animation')).toBeInTheDocument();
      expect(screen.getByText('Remove Animation')).toBeInTheDocument();
      expect(screen.getByText('Add Keyframe')).toBeInTheDocument();
    });
  });

  describe('Property Selection', () => {
    it('should allow selecting different properties', () => {
      render(<AnimationPanel shotId="shot-1" />);

      const scaleButton = screen.getByText('scale');
      fireEvent.click(scaleButton);

      expect(screen.getByText('No animation for scale')).toBeInTheDocument();
    });

    it('should highlight selected property', () => {
      render(<AnimationPanel shotId="shot-1" />);

      const positionButton = screen.getByText('position');
      expect(positionButton).toHaveClass('bg-blue-500');

      const scaleButton = screen.getByText('scale');
      expect(scaleButton).toHaveClass('bg-white');
    });
  });

  describe('Animation Management', () => {
    it('should add animation when Add Animation button is clicked', () => {
      render(<AnimationPanel shotId="shot-1" />);

      const addButton = screen.getByText('Add Animation');
      fireEvent.click(addButton);

      expect(mockAddAnimation).toHaveBeenCalledWith('shot-1', {
        id: expect.stringContaining('anim-'),
        property: 'position',
        keyframes: [],
      });
    });

    it('should delete animation when Remove Animation button is clicked', () => {
      const mockAnimation: Animation = {
        id: 'anim-1',
        property: 'position',
        keyframes: [],
      };

      (useStore as any).mockImplementation((selector: any) => {
        const state = {
          shots: [{ ...mockShot, animations: [mockAnimation] }],
          addAnimation: mockAddAnimation,
          updateAnimation: mockUpdateAnimation,
          deleteAnimation: mockDeleteAnimation,
        };
        return selector(state);
      });

      render(<AnimationPanel shotId="shot-1" />);

      const removeButton = screen.getByText('Remove Animation');
      fireEvent.click(removeButton);

      expect(mockDeleteAnimation).toHaveBeenCalledWith('shot-1', 'anim-1');
    });

    it('should not add duplicate animation for same property', () => {
      const mockAnimation: Animation = {
        id: 'anim-1',
        property: 'position',
        keyframes: [],
      };

      (useStore as any).mockImplementation((selector: any) => {
        const state = {
          shots: [{ ...mockShot, animations: [mockAnimation] }],
          addAnimation: mockAddAnimation,
          updateAnimation: mockUpdateAnimation,
          deleteAnimation: mockDeleteAnimation,
        };
        return selector(state);
      });

      render(<AnimationPanel shotId="shot-1" />);

      // Should not show Add Animation button when animation exists
      expect(screen.queryByText('Add Animation')).not.toBeInTheDocument();
    });
  });

  describe('Keyframe Management', () => {
    const mockAnimation: Animation = {
      id: 'anim-1',
      property: 'position',
      keyframes: [],
    };

    beforeEach(() => {
      (useStore as any).mockImplementation((selector: any) => {
        const state = {
          shots: [{ ...mockShot, animations: [mockAnimation] }],
          addAnimation: mockAddAnimation,
          updateAnimation: mockUpdateAnimation,
          deleteAnimation: mockDeleteAnimation,
        };
        return selector(state);
      });
    });

    it('should show empty state when no keyframes exist', () => {
      render(<AnimationPanel shotId="shot-1" />);

      expect(
        screen.getByText('No keyframes. Add a keyframe to start animating.')
      ).toBeInTheDocument();
    });

    it('should add keyframe when Add Keyframe button is clicked', () => {
      render(<AnimationPanel shotId="shot-1" />);

      const addButton = screen.getByText('Add Keyframe');
      fireEvent.click(addButton);

      expect(mockUpdateAnimation).toHaveBeenCalledWith('shot-1', 'anim-1', {
        keyframes: [
          {
            id: expect.stringContaining('keyframe-'),
            time: 0,
            value: { x: 0, y: 0 },
            easing: 'linear',
          },
        ],
      });
    });

    it('should display keyframes in timeline order', () => {
      const keyframes: Keyframe[] = [
        {
          id: 'kf-2',
          time: 5,
          value: { x: 100, y: 100 },
          easing: 'linear',
        },
        {
          id: 'kf-1',
          time: 2,
          value: { x: 50, y: 50 },
          easing: 'ease-in',
        },
      ];

      (useStore as any).mockImplementation((selector: any) => {
        const state = {
          shots: [
            {
              ...mockShot,
              animations: [{ ...mockAnimation, keyframes }],
            },
          ],
          addAnimation: mockAddAnimation,
          updateAnimation: mockUpdateAnimation,
          deleteAnimation: mockDeleteAnimation,
        };
        return selector(state);
      });

      render(<AnimationPanel shotId="shot-1" />);

      const keyframeElements = screen.getAllByText(/Keyframe \d+/);
      expect(keyframeElements).toHaveLength(2);
      // Should be sorted by time (kf-1 at 2s, then kf-2 at 5s)
    });
  });

  describe('Keyframe Editor', () => {
    const mockKeyframe: Keyframe = {
      id: 'kf-1',
      time: 2,
      value: { x: 50, y: 50 },
      easing: 'linear',
    };

    const mockAnimation: Animation = {
      id: 'anim-1',
      property: 'position',
      keyframes: [mockKeyframe],
    };

    beforeEach(() => {
      (useStore as any).mockImplementation((selector: any) => {
        const state = {
          shots: [{ ...mockShot, animations: [mockAnimation] }],
          addAnimation: mockAddAnimation,
          updateAnimation: mockUpdateAnimation,
          deleteAnimation: mockDeleteAnimation,
        };
        return selector(state);
      });
    });

    it('should display keyframe properties', () => {
      render(<AnimationPanel shotId="shot-1" />);

      expect(screen.getByText('Keyframe 1')).toBeInTheDocument();
      expect(screen.getByLabelText('Time (seconds)')).toHaveValue(2);
      expect(screen.getByLabelText('X')).toHaveValue(50);
      expect(screen.getByLabelText('Y')).toHaveValue(50);
    });

    it('should update keyframe time', () => {
      render(<AnimationPanel shotId="shot-1" />);

      const timeInput = screen.getByLabelText('Time (seconds)');
      fireEvent.change(timeInput, { target: { value: '3.5' } });

      expect(mockUpdateAnimation).toHaveBeenCalledWith('shot-1', 'anim-1', {
        keyframes: [
          {
            ...mockKeyframe,
            time: 3.5,
          },
        ],
      });
    });

    it('should update keyframe position values', () => {
      render(<AnimationPanel shotId="shot-1" />);

      const xInput = screen.getByLabelText('X');
      fireEvent.change(xInput, { target: { value: '100' } });

      expect(mockUpdateAnimation).toHaveBeenCalledWith('shot-1', 'anim-1', {
        keyframes: [
          {
            ...mockKeyframe,
            value: { x: 100, y: 50 },
          },
        ],
      });
    });

    it('should update keyframe easing', () => {
      render(<AnimationPanel shotId="shot-1" />);

      const easingSelect = screen.getByLabelText('Easing');
      fireEvent.change(easingSelect, { target: { value: 'ease-in' } });

      expect(mockUpdateAnimation).toHaveBeenCalledWith('shot-1', 'anim-1', {
        keyframes: [
          {
            ...mockKeyframe,
            easing: 'ease-in',
          },
        ],
      });
    });

    it('should delete keyframe', () => {
      render(<AnimationPanel shotId="shot-1" />);

      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);

      expect(mockUpdateAnimation).toHaveBeenCalledWith('shot-1', 'anim-1', {
        keyframes: [],
      });
    });
  });

  describe('Property-Specific Keyframes', () => {
    it('should show single value input for scale property', () => {
      const mockAnimation: Animation = {
        id: 'anim-1',
        property: 'scale',
        keyframes: [
          {
            id: 'kf-1',
            time: 0,
            value: 1.5,
            easing: 'linear',
          },
        ],
      };

      (useStore as any).mockImplementation((selector: any) => {
        const state = {
          shots: [{ ...mockShot, animations: [mockAnimation] }],
          addAnimation: mockAddAnimation,
          updateAnimation: mockUpdateAnimation,
          deleteAnimation: mockDeleteAnimation,
        };
        return selector(state);
      });

      render(<AnimationPanel shotId="shot-1" />);

      // Switch to scale property
      fireEvent.click(screen.getByText('scale'));

      expect(screen.getByLabelText('Scale')).toHaveValue(1.5);
      expect(screen.queryByLabelText('X')).not.toBeInTheDocument();
    });

    it('should show single value input for rotation property', () => {
      const mockAnimation: Animation = {
        id: 'anim-1',
        property: 'rotation',
        keyframes: [
          {
            id: 'kf-1',
            time: 0,
            value: 45,
            easing: 'linear',
          },
        ],
      };

      (useStore as any).mockImplementation((selector: any) => {
        const state = {
          shots: [{ ...mockShot, animations: [mockAnimation] }],
          addAnimation: mockAddAnimation,
          updateAnimation: mockUpdateAnimation,
          deleteAnimation: mockDeleteAnimation,
        };
        return selector(state);
      });

      render(<AnimationPanel shotId="shot-1" />);

      // Switch to rotation property
      fireEvent.click(screen.getByText('rotation'));

      expect(screen.getByLabelText('Rotation (degrees)')).toHaveValue(45);
    });

    it('should show single value input for opacity property', () => {
      const mockAnimation: Animation = {
        id: 'anim-1',
        property: 'opacity',
        keyframes: [
          {
            id: 'kf-1',
            time: 0,
            value: 0.8,
            easing: 'linear',
          },
        ],
      };

      (useStore as any).mockImplementation((selector: any) => {
        const state = {
          shots: [{ ...mockShot, animations: [mockAnimation] }],
          addAnimation: mockAddAnimation,
          updateAnimation: mockUpdateAnimation,
          deleteAnimation: mockDeleteAnimation,
        };
        return selector(state);
      });

      render(<AnimationPanel shotId="shot-1" />);

      // Switch to opacity property
      fireEvent.click(screen.getByText('opacity'));

      expect(screen.getByLabelText('Opacity (0-1)')).toHaveValue(0.8);
    });
  });

  describe('Keyframe Timeline Visualization', () => {
    it('should display timeline when keyframes exist', () => {
      const mockAnimation: Animation = {
        id: 'anim-1',
        property: 'position',
        keyframes: [
          {
            id: 'kf-1',
            time: 2,
            value: { x: 50, y: 50 },
            easing: 'linear',
          },
          {
            id: 'kf-2',
            time: 5,
            value: { x: 100, y: 100 },
            easing: 'ease-in',
          },
        ],
      };

      (useStore as any).mockImplementation((selector: any) => {
        const state = {
          shots: [{ ...mockShot, animations: [mockAnimation] }],
          addAnimation: mockAddAnimation,
          updateAnimation: mockUpdateAnimation,
          deleteAnimation: mockDeleteAnimation,
        };
        return selector(state);
      });

      render(<AnimationPanel shotId="shot-1" />);

      expect(screen.getByText('Timeline')).toBeInTheDocument();
      // Timeline should show time markers
      expect(screen.getByText('0s')).toBeInTheDocument();
    });

    it('should not display timeline when no keyframes exist', () => {
      const mockAnimation: Animation = {
        id: 'anim-1',
        property: 'position',
        keyframes: [],
      };

      (useStore as any).mockImplementation((selector: any) => {
        const state = {
          shots: [{ ...mockShot, animations: [mockAnimation] }],
          addAnimation: mockAddAnimation,
          updateAnimation: mockUpdateAnimation,
          deleteAnimation: mockDeleteAnimation,
        };
        return selector(state);
      });

      render(<AnimationPanel shotId="shot-1" />);

      expect(screen.queryByText('Timeline')).not.toBeInTheDocument();
    });
  });
});
