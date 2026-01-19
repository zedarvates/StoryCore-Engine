/**
 * E2E tests for audio management workflow
 * Tests the complete flow of adding, editing, and managing audio tracks
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { useStore } from '@/store';
import { createEmptyProject } from '@/utils/projectManager';
import type { Shot, AudioTrack, AudioEffect } from '@/types';

describe('Audio Management E2E Workflow', () => {
  beforeEach(() => {
    const project = createEmptyProject('Audio Test Project');
    useStore.setState({
      project,
      shots: [],
      selectedShotId: null,
    });
  });

  describe('Adding Audio Tracks', () => {
    beforeEach(() => {
      const shot: Shot = {
        id: 'shot-1',
        title: 'Shot with Audio',
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

    it('should add background music track', async () => {
      const audioTrack: AudioTrack = {
        id: 'audio-1',
        name: 'Background Music',
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

      useStore.getState().addAudioTrack('shot-1', audioTrack);

      await waitFor(() => {
        const shot = useStore.getState().shots.find((s) => s.id === 'shot-1');
        expect(shot?.audioTracks.length).toBe(1);
        expect(shot?.audioTracks[0].name).toBe('Background Music');
        expect(shot?.audioTracks[0].type).toBe('music');
      });
    });

    it('should add sound effects track', async () => {
      const audioTrack: AudioTrack = {
        id: 'audio-2',
        name: 'Door Slam',
        type: 'sfx',
        url: '/audio/door-slam.mp3',
        startTime: 2,
        duration: 1,
        offset: 0,
        volume: 100,
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
        expect(shot?.audioTracks[0].type).toBe('sfx');
      });
    });

    it('should add multiple audio tracks', async () => {
      const tracks: AudioTrack[] = [
        {
          id: 'audio-1',
          name: 'Music',
          type: 'music',
          url: '/music.mp3',
          startTime: 0,
          duration: 10,
          offset: 0,
          volume: 70,
          fadeIn: 0,
          fadeOut: 0,
          pan: 0,
          muted: false,
          solo: false,
          effects: [],
        },
        {
          id: 'audio-2',
          name: 'Dialogue',
          type: 'dialogue',
          url: '/dialogue.mp3',
          startTime: 1,
          duration: 5,
          offset: 0,
          volume: 90,
          fadeIn: 0,
          fadeOut: 0,
          pan: 0,
          muted: false,
          solo: false,
          effects: [],
        },
        {
          id: 'audio-3',
          name: 'Ambient',
          type: 'ambient',
          url: '/ambient.mp3',
          startTime: 0,
          duration: 10,
          offset: 0,
          volume: 50,
          fadeIn: 0,
          fadeOut: 0,
          pan: 0,
          muted: false,
          solo: false,
          effects: [],
        },
      ];

      tracks.forEach((track) => useStore.getState().addAudioTrack('shot-1', track));

      await waitFor(() => {
        const shot = useStore.getState().shots.find((s) => s.id === 'shot-1');
        expect(shot?.audioTracks.length).toBe(3);
      });
    });
  });

  describe('Editing Audio Properties', () => {
    beforeEach(() => {
      const shot: Shot = {
        id: 'shot-1',
        title: 'Shot with Audio',
        description: '',
        duration: 10,
        audioTracks: [
          {
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
          },
        ],
        effects: [],
        textLayers: [],
        animations: [],
        position: 0,
      };

      useStore.getState().addShot(shot);
    });

    it('should adjust volume', async () => {
      useStore.getState().updateAudioTrack('shot-1', 'audio-1', {
        volume: 50,
      });

      await waitFor(() => {
        const shot = useStore.getState().shots.find((s) => s.id === 'shot-1');
        const track = shot?.audioTracks.find((t) => t.id === 'audio-1');
        expect(track?.volume).toBe(50);
      });
    });

    it('should adjust fade in and fade out', async () => {
      useStore.getState().updateAudioTrack('shot-1', 'audio-1', {
        fadeIn: 2.0,
        fadeOut: 3.0,
      });

      await waitFor(() => {
        const shot = useStore.getState().shots.find((s) => s.id === 'shot-1');
        const track = shot?.audioTracks.find((t) => t.id === 'audio-1');
        expect(track?.fadeIn).toBe(2.0);
        expect(track?.fadeOut).toBe(3.0);
      });
    });

    it('should adjust pan (left/right balance)', async () => {
      useStore.getState().updateAudioTrack('shot-1', 'audio-1', {
        pan: -50, // Pan left
      });

      await waitFor(() => {
        const shot = useStore.getState().shots.find((s) => s.id === 'shot-1');
        const track = shot?.audioTracks.find((t) => t.id === 'audio-1');
        expect(track?.pan).toBe(-50);
      });
    });

    it('should mute and unmute track', async () => {
      useStore.getState().updateAudioTrack('shot-1', 'audio-1', {
        muted: true,
      });

      await waitFor(() => {
        const shot = useStore.getState().shots.find((s) => s.id === 'shot-1');
        const track = shot?.audioTracks.find((t) => t.id === 'audio-1');
        expect(track?.muted).toBe(true);
      });

      useStore.getState().updateAudioTrack('shot-1', 'audio-1', {
        muted: false,
      });

      await waitFor(() => {
        const shot = useStore.getState().shots.find((s) => s.id === 'shot-1');
        const track = shot?.audioTracks.find((t) => t.id === 'audio-1');
        expect(track?.muted).toBe(false);
      });
    });

    it('should solo track', async () => {
      useStore.getState().updateAudioTrack('shot-1', 'audio-1', {
        solo: true,
      });

      await waitFor(() => {
        const shot = useStore.getState().shots.find((s) => s.id === 'shot-1');
        const track = shot?.audioTracks.find((t) => t.id === 'audio-1');
        expect(track?.solo).toBe(true);
      });
    });

    it('should adjust timing', async () => {
      useStore.getState().updateAudioTrack('shot-1', 'audio-1', {
        startTime: 2,
        duration: 6,
        offset: 1,
      });

      await waitFor(() => {
        const shot = useStore.getState().shots.find((s) => s.id === 'shot-1');
        const track = shot?.audioTracks.find((t) => t.id === 'audio-1');
        expect(track?.startTime).toBe(2);
        expect(track?.duration).toBe(6);
        expect(track?.offset).toBe(1);
      });
    });
  });

  describe('Audio Effects', () => {
    beforeEach(() => {
      const shot: Shot = {
        id: 'shot-1',
        title: 'Shot with Audio',
        description: '',
        duration: 10,
        audioTracks: [
          {
            id: 'audio-1',
            name: 'Dialogue',
            type: 'dialogue',
            url: '/dialogue.mp3',
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
          },
        ],
        effects: [],
        textLayers: [],
        animations: [],
        position: 0,
      };

      useStore.getState().addShot(shot);
    });

    it('should add voice clarity effect', async () => {
      const shot = useStore.getState().shots.find((s) => s.id === 'shot-1');
      const track = shot?.audioTracks[0];

      const effect: AudioEffect = {
        id: 'effect-1',
        type: 'voice-clarity',
        enabled: true,
        parameters: {
          intensity: 80,
        },
      };

      const updatedTrack = {
        ...track!,
        effects: [...track!.effects, effect],
      };

      useStore.getState().updateAudioTrack('shot-1', 'audio-1', {
        effects: updatedTrack.effects,
      });

      await waitFor(() => {
        const updatedShot = useStore.getState().shots.find((s) => s.id === 'shot-1');
        const updatedAudioTrack = updatedShot?.audioTracks.find((t) => t.id === 'audio-1');
        expect(updatedAudioTrack?.effects.length).toBe(1);
        expect(updatedAudioTrack?.effects[0].type).toBe('voice-clarity');
      });
    });

    it('should add limiter effect', async () => {
      const shot = useStore.getState().shots.find((s) => s.id === 'shot-1');
      const track = shot?.audioTracks[0];

      const effect: AudioEffect = {
        id: 'effect-2',
        type: 'limiter',
        enabled: true,
        parameters: {
          threshold: -6,
          ceiling: -1,
          release: 100,
        },
      };

      const updatedTrack = {
        ...track!,
        effects: [...track!.effects, effect],
      };

      useStore.getState().updateAudioTrack('shot-1', 'audio-1', {
        effects: updatedTrack.effects,
      });

      await waitFor(() => {
        const updatedShot = useStore.getState().shots.find((s) => s.id === 'shot-1');
        const updatedAudioTrack = updatedShot?.audioTracks.find((t) => t.id === 'audio-1');
        expect(updatedAudioTrack?.effects.length).toBe(1);
        expect(updatedAudioTrack?.effects[0].type).toBe('limiter');
      });
    });

    it('should apply audio preset', async () => {
      const shot = useStore.getState().shots.find((s) => s.id === 'shot-1');
      const track = shot?.audioTracks[0];

      // Podcast preset: voice clarity + limiter
      const effects: AudioEffect[] = [
        {
          id: 'effect-1',
          type: 'voice-clarity',
          enabled: true,
          preset: 'podcast',
          parameters: {
            intensity: 85,
          },
        },
        {
          id: 'effect-2',
          type: 'limiter',
          enabled: true,
          preset: 'podcast',
          parameters: {
            threshold: -8,
            ceiling: -1,
            release: 100,
          },
        },
      ];

      useStore.getState().updateAudioTrack('shot-1', 'audio-1', {
        effects,
      });

      await waitFor(() => {
        const updatedShot = useStore.getState().shots.find((s) => s.id === 'shot-1');
        const updatedAudioTrack = updatedShot?.audioTracks.find((t) => t.id === 'audio-1');
        expect(updatedAudioTrack?.effects.length).toBe(2);
        expect(updatedAudioTrack?.effects[0].preset).toBe('podcast');
      });
    });
  });

  describe('Surround Sound Configuration', () => {
    beforeEach(() => {
      const shot: Shot = {
        id: 'shot-1',
        title: 'Shot with Surround',
        description: '',
        duration: 10,
        audioTracks: [
          {
            id: 'audio-1',
            name: 'Dialogue',
            type: 'dialogue',
            url: '/dialogue.mp3',
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
          },
        ],
        effects: [],
        textLayers: [],
        animations: [],
        position: 0,
      };

      useStore.getState().addShot(shot);
    });

    it('should configure 5.1 surround sound', async () => {
      useStore.getState().updateAudioTrack('shot-1', 'audio-1', {
        surroundConfig: {
          mode: '5.1',
          channels: {
            frontLeft: 30,
            frontRight: 30,
            center: 100,
            lfe: 50,
            surroundLeft: 20,
            surroundRight: 20,
          },
        },
      });

      await waitFor(() => {
        const shot = useStore.getState().shots.find((s) => s.id === 'shot-1');
        const track = shot?.audioTracks.find((t) => t.id === 'audio-1');
        expect(track?.surroundConfig?.mode).toBe('5.1');
        expect(track?.surroundConfig?.channels.center).toBe(100);
      });
    });

    it('should configure 7.1 surround sound', async () => {
      useStore.getState().updateAudioTrack('shot-1', 'audio-1', {
        surroundConfig: {
          mode: '7.1',
          channels: {
            frontLeft: 80,
            frontRight: 80,
            center: 50,
            lfe: 70,
            surroundLeft: 60,
            surroundRight: 60,
            sideLeft: 40,
            sideRight: 40,
          },
        },
      });

      await waitFor(() => {
        const shot = useStore.getState().shots.find((s) => s.id === 'shot-1');
        const track = shot?.audioTracks.find((t) => t.id === 'audio-1');
        expect(track?.surroundConfig?.mode).toBe('7.1');
        expect(track?.surroundConfig?.channels.sideLeft).toBe(40);
      });
    });

    it('should set spatial position', async () => {
      useStore.getState().updateAudioTrack('shot-1', 'audio-1', {
        surroundConfig: {
          mode: '5.1',
          channels: {
            frontLeft: 50,
            frontRight: 50,
            center: 100,
            lfe: 50,
            surroundLeft: 30,
            surroundRight: 30,
          },
          spatialPosition: {
            x: 0, // Center
            y: 1, // Front
            z: 0, // Ground level
          },
        },
      });

      await waitFor(() => {
        const shot = useStore.getState().shots.find((s) => s.id === 'shot-1');
        const track = shot?.audioTracks.find((t) => t.id === 'audio-1');
        expect(track?.surroundConfig?.spatialPosition).toEqual({
          x: 0,
          y: 1,
          z: 0,
        });
      });
    });
  });

  describe('Complete Audio Workflow', () => {
    it('should complete full audio management workflow', async () => {
      // Step 1: Create shot
      const shot: Shot = {
        id: 'shot-1',
        title: 'Professional Audio Shot',
        description: 'Shot with complete audio setup',
        duration: 15,
        audioTracks: [],
        effects: [],
        textLayers: [],
        animations: [],
        position: 0,
      };

      useStore.getState().addShot(shot);

      // Step 2: Add background music
      const musicTrack: AudioTrack = {
        id: 'audio-1',
        name: 'Background Music',
        type: 'music',
        url: '/music.mp3',
        startTime: 0,
        duration: 15,
        offset: 0,
        volume: 60,
        fadeIn: 2,
        fadeOut: 2,
        pan: 0,
        muted: false,
        solo: false,
        effects: [],
      };

      useStore.getState().addAudioTrack('shot-1', musicTrack);

      // Step 3: Add dialogue
      const dialogueTrack: AudioTrack = {
        id: 'audio-2',
        name: 'Dialogue',
        type: 'dialogue',
        url: '/dialogue.mp3',
        startTime: 2,
        duration: 10,
        offset: 0,
        volume: 90,
        fadeIn: 0.5,
        fadeOut: 0.5,
        pan: 0,
        muted: false,
        solo: false,
        effects: [
          {
            id: 'effect-1',
            type: 'voice-clarity',
            enabled: true,
            preset: 'podcast',
            parameters: {
              intensity: 85,
            },
          },
          {
            id: 'effect-2',
            type: 'limiter',
            enabled: true,
            parameters: {
              threshold: -6,
              ceiling: -1,
              release: 100,
            },
          },
        ],
        surroundConfig: {
          mode: '5.1',
          channels: {
            frontLeft: 30,
            frontRight: 30,
            center: 100,
            lfe: 40,
            surroundLeft: 20,
            surroundRight: 20,
          },
        },
      };

      useStore.getState().addAudioTrack('shot-1', dialogueTrack);

      // Step 4: Add ambient sound
      const ambientTrack: AudioTrack = {
        id: 'audio-3',
        name: 'Ambient',
        type: 'ambient',
        url: '/ambient.mp3',
        startTime: 0,
        duration: 15,
        offset: 0,
        volume: 40,
        fadeIn: 3,
        fadeOut: 3,
        pan: 0,
        muted: false,
        solo: false,
        effects: [],
        surroundConfig: {
          mode: '5.1',
          channels: {
            frontLeft: 50,
            frontRight: 50,
            center: 30,
            lfe: 20,
            surroundLeft: 80,
            surroundRight: 80,
          },
        },
      };

      useStore.getState().addAudioTrack('shot-1', ambientTrack);

      // Verify complete workflow
      await waitFor(() => {
        const finalShot = useStore.getState().shots.find((s) => s.id === 'shot-1');

        // Check all tracks added
        expect(finalShot?.audioTracks.length).toBe(3);

        // Check music track
        const music = finalShot?.audioTracks.find((t) => t.id === 'audio-1');
        expect(music?.type).toBe('music');
        expect(music?.volume).toBe(60);
        expect(music?.fadeIn).toBe(2);

        // Check dialogue track with effects
        const dialogue = finalShot?.audioTracks.find((t) => t.id === 'audio-2');
        expect(dialogue?.type).toBe('dialogue');
        expect(dialogue?.effects.length).toBe(2);
        expect(dialogue?.surroundConfig?.mode).toBe('5.1');
        expect(dialogue?.surroundConfig?.channels.center).toBe(100);

        // Check ambient track
        const ambient = finalShot?.audioTracks.find((t) => t.id === 'audio-3');
        expect(ambient?.type).toBe('ambient');
        expect(ambient?.surroundConfig?.channels.surroundLeft).toBe(80);
      });
    });
  });
});
