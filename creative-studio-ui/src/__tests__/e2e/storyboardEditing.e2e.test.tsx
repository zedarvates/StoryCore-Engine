/**
 * E2E tests for storyboard editing workflow
 * Tests the complete flow of editing shots, reordering, and applying effects
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { useStore } from '@/store';
import { createEmptyProject } from '@/utils/projectManager';
import type { Shot, Effect, TextLayer, Transition } from '@/types';

describe('Storyboard Editing E2E Workflow', () => {
  beforeEach(() => {
    const project = createEmptyProject('Editing Test Project');
    useStore.setState({
      project,
      shots: [],
      selectedShotId: null,
      currentTime: 0,
      isPlaying: false,
    });
  });

  describe('Shot Editing', () => {
    beforeEach(() => {
      const shot: Shot = {
        id: 'shot-1',
        title: 'Original Title',
        description: 'Original description',
        duration: 5,
        audioTracks: [],
        effects: [],
        textLayers: [],
        animations: [],
        position: 0,
      };

      useStore.getState().addShot(shot);
    });

    it('should edit shot title and description', async () => {
      useStore.getState().updateShot('shot-1', {
        title: 'Updated Title',
        description: 'Updated description',
      });

      await waitFor(() => {
        const shot = useStore.getState().shots.find((s) => s.id === 'shot-1');
        expect(shot?.title).toBe('Updated Title');
        expect(shot?.description).toBe('Updated description');
      });
    });

    it('should change shot duration', async () => {
      useStore.getState().updateShot('shot-1', { duration: 10 });

      await waitFor(() => {
        const shot = useStore.getState().shots.find((s) => s.id === 'shot-1');
        expect(shot?.duration).toBe(10);
      });
    });

    it('should update shot image', async () => {
      useStore.getState().updateShot('shot-1', {
        image: '/new-image.jpg',
      });

      await waitFor(() => {
        const shot = useStore.getState().shots.find((s) => s.id === 'shot-1');
        expect(shot?.image).toBe('/new-image.jpg');
      });
    });
  });

  describe('Shot Reordering', () => {
    beforeEach(() => {
      const shots: Shot[] = [
        {
          id: 'shot-1',
          title: 'Shot 1',
          description: '',
          duration: 5,
          audioTracks: [],
          effects: [],
          textLayers: [],
          animations: [],
          position: 0,
        },
        {
          id: 'shot-2',
          title: 'Shot 2',
          description: '',
          duration: 5,
          audioTracks: [],
          effects: [],
          textLayers: [],
          animations: [],
          position: 1,
        },
        {
          id: 'shot-3',
          title: 'Shot 3',
          description: '',
          duration: 5,
          audioTracks: [],
          effects: [],
          textLayers: [],
          animations: [],
          position: 2,
        },
      ];

      shots.forEach((shot) => useStore.getState().addShot(shot));
    });

    it('should reorder shots by dragging', async () => {
      const shots = useStore.getState().shots;

      // Move shot-3 to first position
      const reordered = [shots[2], shots[0], shots[1]];
      useStore.getState().reorderShots(reordered);

      await waitFor(() => {
        const newShots = useStore.getState().shots;
        expect(newShots[0].id).toBe('shot-3');
        expect(newShots[1].id).toBe('shot-1');
        expect(newShots[2].id).toBe('shot-2');
      });
    });

    it('should maintain shot data during reordering', async () => {
      const shots = useStore.getState().shots;
      const originalShot1 = { ...shots[0] };

      const reordered = [shots[1], shots[0], shots[2]];
      useStore.getState().reorderShots(reordered);

      await waitFor(() => {
        const movedShot = useStore.getState().shots.find((s) => s.id === 'shot-1');
        expect(movedShot?.title).toBe(originalShot1.title);
        expect(movedShot?.duration).toBe(originalShot1.duration);
      });
    });
  });

  describe('Adding Effects', () => {
    beforeEach(() => {
      const shot: Shot = {
        id: 'shot-1',
        title: 'Shot with Effects',
        description: '',
        duration: 5,
        audioTracks: [],
        effects: [],
        textLayers: [],
        animations: [],
        position: 0,
      };

      useStore.getState().addShot(shot);
    });

    it('should add visual effect to shot', async () => {
      const effect: Effect = {
        id: 'effect-1',
        type: 'filter',
        name: 'vintage',
        enabled: true,
        intensity: 50,
        parameters: { contrast: 1.2, saturation: 0.8 },
      };

      useStore.getState().addEffect('shot-1', effect);

      await waitFor(() => {
        const shot = useStore.getState().shots.find((s) => s.id === 'shot-1');
        expect(shot?.effects.length).toBe(1);
        expect(shot?.effects[0].name).toBe('vintage');
      });
    });

    it('should add multiple effects to shot', async () => {
      const effects: Effect[] = [
        {
          id: 'effect-1',
          type: 'filter',
          name: 'vintage',
          enabled: true,
          intensity: 50,
          parameters: {},
        },
        {
          id: 'effect-2',
          type: 'filter',
          name: 'blur',
          enabled: true,
          intensity: 30,
          parameters: {},
        },
        {
          id: 'effect-3',
          type: 'adjustment',
          name: 'brightness',
          enabled: true,
          intensity: 70,
          parameters: {},
        },
      ];

      effects.forEach((effect) => useStore.getState().addEffect('shot-1', effect));

      await waitFor(() => {
        const shot = useStore.getState().shots.find((s) => s.id === 'shot-1');
        expect(shot?.effects.length).toBe(3);
      });
    });

    it('should reorder effects', async () => {
      const effect1: Effect = {
        id: 'effect-1',
        type: 'filter',
        name: 'vintage',
        enabled: true,
        intensity: 50,
        parameters: {},
      };

      const effect2: Effect = {
        id: 'effect-2',
        type: 'filter',
        name: 'blur',
        enabled: true,
        intensity: 30,
        parameters: {},
      };

      useStore.getState().addEffect('shot-1', effect1);
      useStore.getState().addEffect('shot-1', effect2);

      // Reorder: blur first, then vintage
      useStore.getState().reorderEffects('shot-1', [effect2, effect1]);

      await waitFor(() => {
        const shot = useStore.getState().shots.find((s) => s.id === 'shot-1');
        expect(shot?.effects[0].name).toBe('blur');
        expect(shot?.effects[1].name).toBe('vintage');
      });
    });

    it('should update effect properties', async () => {
      const effect: Effect = {
        id: 'effect-1',
        type: 'filter',
        name: 'vintage',
        enabled: true,
        intensity: 50,
        parameters: {},
      };

      useStore.getState().addEffect('shot-1', effect);

      useStore.getState().updateEffect('shot-1', 'effect-1', {
        intensity: 75,
        enabled: false,
      });

      await waitFor(() => {
        const shot = useStore.getState().shots.find((s) => s.id === 'shot-1');
        const eff = shot?.effects.find((e) => e.id === 'effect-1');
        expect(eff?.intensity).toBe(75);
        expect(eff?.enabled).toBe(false);
      });
    });

    it('should remove effect from shot', async () => {
      const effect: Effect = {
        id: 'effect-1',
        type: 'filter',
        name: 'vintage',
        enabled: true,
        intensity: 50,
        parameters: {},
      };

      useStore.getState().addEffect('shot-1', effect);
      expect(useStore.getState().shots[0].effects.length).toBe(1);

      useStore.getState().deleteEffect('shot-1', 'effect-1');

      await waitFor(() => {
        const shot = useStore.getState().shots.find((s) => s.id === 'shot-1');
        expect(shot?.effects.length).toBe(0);
      });
    });
  });

  describe('Adding Text Layers', () => {
    beforeEach(() => {
      const shot: Shot = {
        id: 'shot-1',
        title: 'Shot with Text',
        description: '',
        duration: 10,
        audioTracks: [],
        effects: [],
        textLayers: [],
        animations: [],
        position: 0,
      };

      useStore.getState().addShot(shot);
    });

    it('should add text layer to shot', async () => {
      const textLayer: TextLayer = {
        id: 'text-1',
        content: 'Hello World',
        font: 'Arial',
        fontSize: 24,
        color: '#FFFFFF',
        position: { x: 50, y: 50 },
        alignment: 'center',
        startTime: 0,
        duration: 5,
        style: {},
      };

      useStore.getState().addTextLayer('shot-1', textLayer);

      await waitFor(() => {
        const shot = useStore.getState().shots.find((s) => s.id === 'shot-1');
        expect(shot?.textLayers.length).toBe(1);
        expect(shot?.textLayers[0].content).toBe('Hello World');
      });
    });

    it('should update text layer content', async () => {
      const textLayer: TextLayer = {
        id: 'text-1',
        content: 'Original Text',
        font: 'Arial',
        fontSize: 24,
        color: '#000',
        position: { x: 50, y: 50 },
        alignment: 'center',
        startTime: 0,
        duration: 5,
        style: {},
      };

      useStore.getState().addTextLayer('shot-1', textLayer);

      useStore.getState().updateTextLayer('shot-1', 'text-1', {
        content: 'Updated Text',
        fontSize: 32,
        color: '#FFFFFF',
      });

      await waitFor(() => {
        const shot = useStore.getState().shots.find((s) => s.id === 'shot-1');
        const layer = shot?.textLayers.find((l) => l.id === 'text-1');
        expect(layer?.content).toBe('Updated Text');
        expect(layer?.fontSize).toBe(32);
        expect(layer?.color).toBe('#FFFFFF');
      });
    });

    it('should add multiple text layers with different timings', async () => {
      const textLayers: TextLayer[] = [
        {
          id: 'text-1',
          content: 'Title',
          font: 'Arial',
          fontSize: 48,
          color: '#FFF',
          position: { x: 50, y: 20 },
          alignment: 'center',
          startTime: 0,
          duration: 3,
          style: { bold: true },
        },
        {
          id: 'text-2',
          content: 'Subtitle',
          font: 'Arial',
          fontSize: 24,
          color: '#FFF',
          position: { x: 50, y: 80 },
          alignment: 'center',
          startTime: 3,
          duration: 7,
          style: {},
        },
      ];

      textLayers.forEach((layer) => useStore.getState().addTextLayer('shot-1', layer));

      await waitFor(() => {
        const shot = useStore.getState().shots.find((s) => s.id === 'shot-1');
        expect(shot?.textLayers.length).toBe(2);
        expect(shot?.textLayers[0].startTime).toBe(0);
        expect(shot?.textLayers[1].startTime).toBe(3);
      });
    });
  });

  describe('Adding Transitions', () => {
    beforeEach(() => {
      const shots: Shot[] = [
        {
          id: 'shot-1',
          title: 'Shot 1',
          description: '',
          duration: 5,
          audioTracks: [],
          effects: [],
          textLayers: [],
          animations: [],
          position: 0,
        },
        {
          id: 'shot-2',
          title: 'Shot 2',
          description: '',
          duration: 5,
          audioTracks: [],
          effects: [],
          textLayers: [],
          animations: [],
          position: 1,
        },
      ];

      shots.forEach((shot) => useStore.getState().addShot(shot));
    });

    it('should add transition between shots', async () => {
      const transition: Transition = {
        id: 'trans-1',
        type: 'fade',
        duration: 1,
        easing: 'ease-in-out',
      };

      useStore.getState().setTransition('shot-1', transition);

      await waitFor(() => {
        const shot = useStore.getState().shots.find((s) => s.id === 'shot-1');
        expect(shot?.transitionOut).toBeDefined();
        expect(shot?.transitionOut?.type).toBe('fade');
      });
    });

    it('should update transition properties', async () => {
      const transition: Transition = {
        id: 'trans-1',
        type: 'fade',
        duration: 1,
        easing: 'ease-in-out',
      };

      useStore.getState().setTransition('shot-1', transition);

      const updatedTransition: Transition = {
        id: 'trans-1',
        type: 'dissolve',
        duration: 2,
        easing: 'ease-out',
      };

      useStore.getState().setTransition('shot-1', updatedTransition);

      await waitFor(() => {
        const shot = useStore.getState().shots.find((s) => s.id === 'shot-1');
        expect(shot?.transitionOut?.type).toBe('dissolve');
        expect(shot?.transitionOut?.duration).toBe(2);
      });
    });

    it('should remove transition', async () => {
      const transition: Transition = {
        id: 'trans-1',
        type: 'fade',
        duration: 1,
        easing: 'ease-in-out',
      };

      useStore.getState().setTransition('shot-1', transition);
      expect(useStore.getState().shots[0].transitionOut).toBeDefined();

      useStore.getState().setTransition('shot-1', undefined);

      await waitFor(() => {
        const shot = useStore.getState().shots.find((s) => s.id === 'shot-1');
        expect(shot?.transitionOut).toBeUndefined();
      });
    });
  });

  describe('Complete Editing Workflow', () => {
    it('should complete full storyboard editing workflow', async () => {
      // Step 1: Add initial shots
      const shots: Shot[] = [
        {
          id: 'shot-1',
          title: 'Opening',
          description: 'Opening scene',
          duration: 5,
          audioTracks: [],
          effects: [],
          textLayers: [],
          animations: [],
          position: 0,
        },
        {
          id: 'shot-2',
          title: 'Middle',
          description: 'Middle scene',
          duration: 8,
          audioTracks: [],
          effects: [],
          textLayers: [],
          animations: [],
          position: 1,
        },
        {
          id: 'shot-3',
          title: 'Closing',
          description: 'Closing scene',
          duration: 6,
          audioTracks: [],
          effects: [],
          textLayers: [],
          animations: [],
          position: 2,
        },
      ];

      shots.forEach((shot) => useStore.getState().addShot(shot));

      // Step 2: Edit shot properties
      useStore.getState().updateShot('shot-1', {
        title: 'Epic Opening',
        duration: 7,
      });

      // Step 3: Add effects
      const effect: Effect = {
        id: 'effect-1',
        type: 'filter',
        name: 'cinematic',
        enabled: true,
        intensity: 60,
        parameters: {},
      };

      useStore.getState().addEffect('shot-1', effect);

      // Step 4: Add text layer
      const textLayer: TextLayer = {
        id: 'text-1',
        content: 'Welcome',
        font: 'Arial',
        fontSize: 48,
        color: '#FFFFFF',
        position: { x: 50, y: 50 },
        alignment: 'center',
        startTime: 0,
        duration: 5,
        style: { bold: true },
      };

      useStore.getState().addTextLayer('shot-1', textLayer);

      // Step 5: Add transition
      const transition: Transition = {
        id: 'trans-1',
        type: 'fade',
        duration: 1.5,
        easing: 'ease-in-out',
      };

      useStore.getState().setTransition('shot-1', transition);

      // Step 6: Reorder shots
      const currentShots = useStore.getState().shots;
      const reordered = [currentShots[1], currentShots[0], currentShots[2]];
      useStore.getState().reorderShots(reordered);

      // Verify complete workflow
      await waitFor(() => {
        const finalShots = useStore.getState().shots;

        // Check reordering
        expect(finalShots[0].id).toBe('shot-2');
        expect(finalShots[1].id).toBe('shot-1');

        // Check edited shot
        const editedShot = finalShots.find((s) => s.id === 'shot-1');
        expect(editedShot?.title).toBe('Epic Opening');
        expect(editedShot?.duration).toBe(7);
        expect(editedShot?.effects.length).toBe(1);
        expect(editedShot?.textLayers.length).toBe(1);
        expect(editedShot?.transitionOut).toBeDefined();
      });
    });
  });
});
