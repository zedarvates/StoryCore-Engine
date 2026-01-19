/**
 * Integration tests for state synchronization
 * Tests that state changes propagate correctly across components
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { useStore } from '@/store';
import type { Shot, AudioTrack, Effect, TextLayer } from '@/types';

describe('State Synchronization Integration', () => {
  beforeEach(() => {
    // Reset store to initial state
    useStore.setState({
      shots: [],
      assets: [],
      selectedShotId: null,
      taskQueue: [],
      currentTime: 0,
      isPlaying: false,
    });
  });

  describe('Shot State Synchronization', () => {
    it('should synchronize shot updates across all components', async () => {
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

      // Update shot
      useStore.getState().updateShot('shot-1', {
        title: 'Updated Title',
        description: 'Updated description',
      });

      await waitFor(() => {
        const updatedShot = useStore.getState().shots.find((s) => s.id === 'shot-1');
        expect(updatedShot?.title).toBe('Updated Title');
        expect(updatedShot?.description).toBe('Updated description');
      });
    });

    it('should update selection state when shot is selected', async () => {
      const shot: Shot = {
        id: 'shot-1',
        title: 'Test Shot',
        description: '',
        duration: 5,
        audioTracks: [],
        effects: [],
        textLayers: [],
        animations: [],
        position: 0,
      };

      useStore.getState().addShot(shot);
      useStore.getState().selectShot('shot-1');

      await waitFor(() => {
        expect(useStore.getState().selectedShotId).toBe('shot-1');
      });
    });

    it('should clear selection when shot is deleted', async () => {
      const shot: Shot = {
        id: 'shot-1',
        title: 'Test Shot',
        description: '',
        duration: 5,
        audioTracks: [],
        effects: [],
        textLayers: [],
        animations: [],
        position: 0,
      };

      useStore.getState().addShot(shot);
      useStore.getState().selectShot('shot-1');

      expect(useStore.getState().selectedShotId).toBe('shot-1');

      useStore.getState().deleteShot('shot-1');

      await waitFor(() => {
        expect(useStore.getState().selectedShotId).toBeNull();
      });
    });
  });

  describe('Audio Track Synchronization', () => {
    beforeEach(() => {
      const shot: Shot = {
        id: 'shot-1',
        title: 'Test Shot',
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

    it('should add audio track to shot', async () => {
      const audioTrack: AudioTrack = {
        id: 'audio-1',
        name: 'Background Music',
        type: 'music',
        url: '/music.mp3',
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
      };

      useStore.getState().addAudioTrack('shot-1', audioTrack);

      await waitFor(() => {
        const shot = useStore.getState().shots.find((s) => s.id === 'shot-1');
        expect(shot?.audioTracks.length).toBe(1);
        expect(shot?.audioTracks[0].name).toBe('Background Music');
      });
    });

    it('should update audio track properties', async () => {
      const audioTrack: AudioTrack = {
        id: 'audio-1',
        name: 'Music',
        type: 'music',
        url: '/music.mp3',
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
      };

      useStore.getState().addAudioTrack('shot-1', audioTrack);

      useStore.getState().updateAudioTrack('shot-1', 'audio-1', {
        volume: 50,
        muted: true,
      });

      await waitFor(() => {
        const shot = useStore.getState().shots.find((s) => s.id === 'shot-1');
        const track = shot?.audioTracks.find((t) => t.id === 'audio-1');
        expect(track?.volume).toBe(50);
        expect(track?.muted).toBe(true);
      });
    });

    it('should delete audio track from shot', async () => {
      const audioTrack: AudioTrack = {
        id: 'audio-1',
        name: 'Music',
        type: 'music',
        url: '/music.mp3',
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
      };

      useStore.getState().addAudioTrack('shot-1', audioTrack);
      expect(useStore.getState().shots[0].audioTracks.length).toBe(1);

      useStore.getState().deleteAudioTrack('shot-1', 'audio-1');

      await waitFor(() => {
        const shot = useStore.getState().shots.find((s) => s.id === 'shot-1');
        expect(shot?.audioTracks.length).toBe(0);
      });
    });
  });

  describe('Effects Synchronization', () => {
    beforeEach(() => {
      const shot: Shot = {
        id: 'shot-1',
        title: 'Test Shot',
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

    it('should add effect to shot', async () => {
      const effect: Effect = {
        id: 'effect-1',
        type: 'filter',
        name: 'vintage',
        enabled: true,
        intensity: 50,
        parameters: {},
      };

      useStore.getState().addEffect('shot-1', effect);

      await waitFor(() => {
        const shot = useStore.getState().shots.find((s) => s.id === 'shot-1');
        expect(shot?.effects.length).toBe(1);
        expect(shot?.effects[0].name).toBe('vintage');
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

      useStore.getState().reorderEffects('shot-1', [effect2, effect1]);

      await waitFor(() => {
        const shot = useStore.getState().shots.find((s) => s.id === 'shot-1');
        expect(shot?.effects[0].id).toBe('effect-2');
        expect(shot?.effects[1].id).toBe('effect-1');
      });
    });
  });

  describe('Text Layers Synchronization', () => {
    beforeEach(() => {
      const shot: Shot = {
        id: 'shot-1',
        title: 'Test Shot',
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
        color: '#000000',
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

    it('should update text layer properties', async () => {
      const textLayer: TextLayer = {
        id: 'text-1',
        content: 'Original Text',
        font: 'Arial',
        fontSize: 24,
        color: '#000000',
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
      });

      await waitFor(() => {
        const shot = useStore.getState().shots.find((s) => s.id === 'shot-1');
        const layer = shot?.textLayers.find((l) => l.id === 'text-1');
        expect(layer?.content).toBe('Updated Text');
        expect(layer?.fontSize).toBe(32);
      });
    });
  });

  describe('Playback State Synchronization', () => {
    it('should synchronize playback state', async () => {
      expect(useStore.getState().isPlaying).toBe(false);

      useStore.getState().play();

      await waitFor(() => {
        expect(useStore.getState().isPlaying).toBe(true);
      });

      useStore.getState().pause();

      await waitFor(() => {
        expect(useStore.getState().isPlaying).toBe(false);
      });
    });

    it('should reset time on stop', async () => {
      useStore.getState().setCurrentTime(10);
      expect(useStore.getState().currentTime).toBe(10);

      useStore.getState().stop();

      await waitFor(() => {
        expect(useStore.getState().currentTime).toBe(0);
        expect(useStore.getState().isPlaying).toBe(false);
      });
    });

    it('should update playback speed', async () => {
      expect(useStore.getState().playbackSpeed).toBe(1);

      useStore.getState().setPlaybackSpeed(2);

      await waitFor(() => {
        expect(useStore.getState().playbackSpeed).toBe(2);
      });
    });
  });

  describe('Task Queue Synchronization', () => {
    it('should add task to queue', async () => {
      const task = {
        id: 'task-1',
        shotId: 'shot-1',
        type: 'grid' as const,
        status: 'pending' as const,
        priority: 1,
        createdAt: new Date(),
      };

      useStore.getState().addTask(task);

      await waitFor(() => {
        expect(useStore.getState().taskQueue.length).toBe(1);
        expect(useStore.getState().taskQueue[0].id).toBe('task-1');
      });
    });

    it('should update task priorities when reordering', async () => {
      const task1 = {
        id: 'task-1',
        shotId: 'shot-1',
        type: 'grid' as const,
        status: 'pending' as const,
        priority: 1,
        createdAt: new Date(),
      };

      const task2 = {
        id: 'task-2',
        shotId: 'shot-2',
        type: 'promotion' as const,
        status: 'pending' as const,
        priority: 2,
        createdAt: new Date(),
      };

      useStore.getState().addTask(task1);
      useStore.getState().addTask(task2);

      useStore.getState().reorderTasks([task2, task1]);

      await waitFor(() => {
        const queue = useStore.getState().taskQueue;
        expect(queue[0].id).toBe('task-2');
        expect(queue[0].priority).toBe(1);
        expect(queue[1].id).toBe('task-1');
        expect(queue[1].priority).toBe(2);
      });
    });
  });

  describe('Complex State Updates', () => {
    it('should handle multiple simultaneous updates', async () => {
      const shot: Shot = {
        id: 'shot-1',
        title: 'Test Shot',
        description: '',
        duration: 10,
        audioTracks: [],
        effects: [],
        textLayers: [],
        animations: [],
        position: 0,
      };

      useStore.getState().addShot(shot);
      useStore.getState().selectShot('shot-1');
      useStore.getState().setCurrentTime(5);
      useStore.getState().play();

      await waitFor(() => {
        const state = useStore.getState();
        expect(state.shots.length).toBe(1);
        expect(state.selectedShotId).toBe('shot-1');
        expect(state.currentTime).toBe(5);
        expect(state.isPlaying).toBe(true);
      });
    });

    it('should maintain consistency during rapid updates', async () => {
      const shot: Shot = {
        id: 'shot-1',
        title: 'Test Shot',
        description: '',
        duration: 10,
        audioTracks: [],
        effects: [],
        textLayers: [],
        animations: [],
        position: 0,
      };

      useStore.getState().addShot(shot);

      // Rapid updates
      for (let i = 0; i < 10; i++) {
        useStore.getState().updateShot('shot-1', { duration: i + 1 });
      }

      await waitFor(() => {
        const updatedShot = useStore.getState().shots.find((s) => s.id === 'shot-1');
        expect(updatedShot?.duration).toBe(10);
      });
    });
  });
});
