import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PlaybackEngine } from '../PlaybackEngine';
import type { Shot } from '../../types';

describe('PlaybackEngine', () => {
  let canvas: HTMLCanvasElement;
  let engine: PlaybackEngine;

  const mockShots: Shot[] = [
    {
      id: 'shot-1',
      title: 'Shot 1',
      description: 'First shot',
      duration: 5,
      position: 0,
      image: 'data:image/png;base64,test',
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
    canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    engine = new PlaybackEngine(canvas);
  });

  afterEach(() => {
    engine.dispose();
  });

  it('initializes with canvas', () => {
    expect(engine).toBeDefined();
  });

  it('throws error if canvas context is not available', () => {
    const mockCanvas = {
      getContext: () => null,
    } as unknown as HTMLCanvasElement;

    expect(() => new PlaybackEngine(mockCanvas)).toThrow('Could not get 2D context');
  });

  it('sets shots', () => {
    engine.setShots(mockShots);
    expect(engine.getTotalDuration()).toBe(9); // 5 + 3 + 1 (transition)
  });

  it('calculates total duration correctly', () => {
    engine.setShots(mockShots);
    const duration = engine.getTotalDuration();
    expect(duration).toBe(9);
  });

  it('calculates duration without transitions', () => {
    const shotsWithoutTransitions = mockShots.map(shot => ({
      ...shot,
      transitionOut: undefined,
    }));
    engine.setShots(shotsWithoutTransitions);
    expect(engine.getTotalDuration()).toBe(8); // 5 + 3
  });

  it('starts playback', () => {
    const onPlayState = vi.fn();
    engine.onPlayState(onPlayState);
    engine.setShots(mockShots);

    engine.play();

    expect(onPlayState).toHaveBeenCalledWith(true);
  });

  it('pauses playback', () => {
    const onPlayState = vi.fn();
    engine.onPlayState(onPlayState);
    engine.setShots(mockShots);

    engine.play();
    engine.pause();

    expect(onPlayState).toHaveBeenCalledWith(false);
  });

  it('stops playback and resets time', () => {
    const onTimeUpdate = vi.fn();
    engine.onTime(onTimeUpdate);
    engine.setShots(mockShots);

    engine.seek(5);
    engine.stop();

    expect(onTimeUpdate).toHaveBeenCalledWith(0);
  });

  it('seeks to specific time', () => {
    const onTimeUpdate = vi.fn();
    engine.onTime(onTimeUpdate);
    engine.setShots(mockShots);

    engine.seek(3);

    expect(onTimeUpdate).toHaveBeenCalledWith(3);
  });

  it('clamps seek time to valid range', () => {
    const onTimeUpdate = vi.fn();
    engine.onTime(onTimeUpdate);
    engine.setShots(mockShots);

    // Seek beyond duration
    engine.seek(100);
    expect(onTimeUpdate).toHaveBeenCalledWith(9);

    // Seek before start
    engine.seek(-5);
    expect(onTimeUpdate).toHaveBeenCalledWith(0);
  });

  it('calls time update callback during playback', async () => {
    const onTimeUpdate = vi.fn();
    engine.onTime(onTimeUpdate);
    engine.setShots(mockShots);

    engine.play();

    await new Promise(resolve => setTimeout(resolve, 100));
    engine.pause();
    expect(onTimeUpdate).toHaveBeenCalled();
  });

  it('stops at end of duration', async () => {
    const onPlayState = vi.fn();
    engine.onPlayState(onPlayState);
    
    // Create very short shot
    const shortShot: Shot = {
      ...mockShots[0],
      duration: 0.05, // 50ms
    };
    engine.setShots([shortShot]);

    engine.play();

    await new Promise(resolve => setTimeout(resolve, 200));
    // Should have stopped
    expect(onPlayState).toHaveBeenCalledWith(false);
  });

  it('sorts shots by position', () => {
    const unsortedShots = [
      { ...mockShots[1], position: 1 },
      { ...mockShots[0], position: 0 },
    ];
    engine.setShots(unsortedShots);

    // Duration should still be correct (shots sorted internally)
    expect(engine.getTotalDuration()).toBe(9);
  });

  it('handles empty shots array', () => {
    engine.setShots([]);
    expect(engine.getTotalDuration()).toBe(0);
  });

  it('cleans up resources on dispose', () => {
    engine.setShots(mockShots);
    engine.play();
    
    engine.dispose();

    // Should have stopped playback
    // (Can't easily test internal state, but no errors should occur)
    expect(() => engine.dispose()).not.toThrow();
  });

  it('handles shots with effects', () => {
    const shotWithEffects: Shot = {
      ...mockShots[0],
      effects: [
        {
          id: 'effect-1',
          type: 'filter',
          name: 'brightness',
          enabled: true,
          intensity: 50,
          parameters: { value: 20 },
        },
      ],
    };

    engine.setShots([shotWithEffects]);
    engine.seek(1);

    // Should render without errors
    expect(() => engine.seek(1)).not.toThrow();
  });

  it('handles shots with text layers', () => {
    const shotWithText: Shot = {
      ...mockShots[0],
      textLayers: [
        {
          id: 'text-1',
          content: 'Test Text',
          font: 'Arial',
          fontSize: 48,
          color: '#ffffff',
          position: { x: 50, y: 50 },
          alignment: 'center',
          startTime: 0,
          duration: 3,
          style: {},
        },
      ],
    };

    engine.setShots([shotWithText]);
    engine.seek(1);

    // Should render without errors
    expect(() => engine.seek(1)).not.toThrow();
  });

  it('handles shots with animations', () => {
    const shotWithAnimations: Shot = {
      ...mockShots[0],
      animations: [
        {
          id: 'anim-1',
          property: 'opacity',
          keyframes: [
            { id: 'kf-1', time: 0, value: 0, easing: 'linear' },
            { id: 'kf-2', time: 2, value: 1, easing: 'linear' },
          ],
        },
      ],
    };

    engine.setShots([shotWithAnimations]);
    engine.seek(1);

    // Should render without errors
    expect(() => engine.seek(1)).not.toThrow();
  });

  it('handles different transition types', () => {
    const transitionTypes: Array<'fade' | 'dissolve' | 'wipe' | 'slide'> = [
      'fade',
      'dissolve',
      'wipe',
      'slide',
    ];

    transitionTypes.forEach((type) => {
      const shotsWithTransition = [
        mockShots[0],
        {
          ...mockShots[1],
          transitionOut: {
            id: 'trans-1',
            type,
            duration: 1,
            easing: 'linear' as const,
            direction: 'left' as 'left' | 'right' | 'up' | 'down',
          },
        },
      ];

      engine.setShots(shotsWithTransition);
      engine.seek(5.5); // In transition

      // Should render without errors
      expect(() => engine.seek(5.5)).not.toThrow();
    });
  });
});
