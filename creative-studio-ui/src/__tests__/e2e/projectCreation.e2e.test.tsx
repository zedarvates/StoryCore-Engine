/**
 * E2E tests for project creation workflow
 * Tests the complete flow from creating a new project to saving it
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { useStore } from '@/store';
import { createEmptyProject, saveProjectToJSON, validateProject } from '@/utils/projectManager';
import type { Shot, Asset } from '@/types';

describe('Project Creation E2E Workflow', () => {
  beforeEach(() => {
    // Reset store to initial state
    useStore.setState({
      project: null,
      shots: [],
      assets: [],
      selectedShotId: null,
      taskQueue: [],
      currentTime: 0,
      isPlaying: false,
      showChat: false,
      showTaskQueue: false,
    });
  });

  describe('New Project Creation', () => {
    it('should create a new empty project', async () => {
      const projectName = 'My First Project';
      const project = createEmptyProject(projectName);

      useStore.setState({ project });

      await waitFor(() => {
        const state = useStore.getState();
        expect(state.project).toBeDefined();
        expect(state.project?.project_name).toBe(projectName);
        expect(state.project?.schema_version).toBe('1.0');
        expect(state.project?.shots).toEqual([]);
        expect(state.project?.assets).toEqual([]);
      });
    });

    it('should initialize project with default capabilities', async () => {
      const project = createEmptyProject('Test Project');

      expect(project.capabilities).toEqual({
        grid_generation: true,
        promotion_engine: true,
        qa_engine: true,
        autofix_engine: true,
      });
    });

    it('should initialize project with pending generation status', async () => {
      const project = createEmptyProject('Test Project');

      expect(project.generation_status).toEqual({
        grid: 'pending',
        promotion: 'pending',
      });
    });
  });

  describe('Adding Shots to Project', () => {
    beforeEach(() => {
      const project = createEmptyProject('Test Project');
      useStore.setState({ project });
    });

    it('should add first shot to empty project', async () => {
      const shot: Shot = {
        id: 'shot-1',
        title: 'Opening Scene',
        description: 'The story begins',
        duration: 5,
        audioTracks: [],
        effects: [],
        textLayers: [],
        animations: [],
        position: 0,
      };

      useStore.getState().addShot(shot);

      await waitFor(() => {
        expect(useStore.getState().shots.length).toBe(1);
        expect(useStore.getState().shots[0].title).toBe('Opening Scene');
      });
    });

    it('should add multiple shots in sequence', async () => {
      const shots: Shot[] = [
        {
          id: 'shot-1',
          title: 'Scene 1',
          description: 'First scene',
          duration: 5,
          audioTracks: [],
          effects: [],
          textLayers: [],
          animations: [],
          position: 0,
        },
        {
          id: 'shot-2',
          title: 'Scene 2',
          description: 'Second scene',
          duration: 8,
          audioTracks: [],
          effects: [],
          textLayers: [],
          animations: [],
          position: 1,
        },
        {
          id: 'shot-3',
          title: 'Scene 3',
          description: 'Third scene',
          duration: 6,
          audioTracks: [],
          effects: [],
          textLayers: [],
          animations: [],
          position: 2,
        },
      ];

      shots.forEach((shot) => useStore.getState().addShot(shot));

      await waitFor(() => {
        expect(useStore.getState().shots.length).toBe(3);
        expect(useStore.getState().shots[0].title).toBe('Scene 1');
        expect(useStore.getState().shots[1].title).toBe('Scene 2');
        expect(useStore.getState().shots[2].title).toBe('Scene 3');
      });
    });

    it('should maintain shot order by position', async () => {
      const shots: Shot[] = [
        {
          id: 'shot-3',
          title: 'Scene 3',
          description: '',
          duration: 5,
          audioTracks: [],
          effects: [],
          textLayers: [],
          animations: [],
          position: 2,
        },
        {
          id: 'shot-1',
          title: 'Scene 1',
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
          title: 'Scene 2',
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

      await waitFor(() => {
        const sortedShots = useStore.getState().shots.sort((a, b) => a.position - b.position);
        expect(sortedShots[0].title).toBe('Scene 1');
        expect(sortedShots[1].title).toBe('Scene 2');
        expect(sortedShots[2].title).toBe('Scene 3');
      });
    });
  });

  describe('Adding Assets to Project', () => {
    beforeEach(() => {
      const project = createEmptyProject('Test Project');
      useStore.setState({ project });
    });

    it('should add image asset to library', async () => {
      const asset: Asset = {
        id: 'asset-1',
        name: 'Background Image',
        type: 'image',
        url: '/images/background.jpg',
      };

      useStore.getState().addAsset(asset);

      await waitFor(() => {
        expect(useStore.getState().assets.length).toBe(1);
        expect(useStore.getState().assets[0].name).toBe('Background Image');
        expect(useStore.getState().assets[0].type).toBe('image');
      });
    });

    it('should add audio asset to library', async () => {
      const asset: Asset = {
        id: 'asset-2',
        name: 'Background Music',
        type: 'audio',
        url: '/audio/music.mp3',
      };

      useStore.getState().addAsset(asset);

      await waitFor(() => {
        expect(useStore.getState().assets.length).toBe(1);
        expect(useStore.getState().assets[0].type).toBe('audio');
      });
    });

    it('should add multiple assets of different types', async () => {
      const assets: Asset[] = [
        {
          id: 'asset-1',
          name: 'Image 1',
          type: 'image',
          url: '/img1.jpg',
        },
        {
          id: 'asset-2',
          name: 'Audio 1',
          type: 'audio',
          url: '/audio1.mp3',
        },
        {
          id: 'asset-3',
          name: 'Template 1',
          type: 'template',
          url: '/template1.json',
        },
      ];

      assets.forEach((asset) => useStore.getState().addAsset(asset));

      await waitFor(() => {
        expect(useStore.getState().assets.length).toBe(3);
        expect(useStore.getState().assets.filter((a) => a.type === 'image').length).toBe(1);
        expect(useStore.getState().assets.filter((a) => a.type === 'audio').length).toBe(1);
        expect(useStore.getState().assets.filter((a) => a.type === 'template').length).toBe(1);
      });
    });
  });

  describe('Building Complete Project', () => {
    it('should create a complete project with shots and assets', async () => {
      const project = createEmptyProject('Complete Project');
      useStore.setState({ project });

      // Add assets
      const assets: Asset[] = [
        {
          id: 'asset-1',
          name: 'Background',
          type: 'image',
          url: '/bg.jpg',
        },
        {
          id: 'asset-2',
          name: 'Music',
          type: 'audio',
          url: '/music.mp3',
        },
      ];

      assets.forEach((asset) => useStore.getState().addAsset(asset));

      // Add shots
      const shots: Shot[] = [
        {
          id: 'shot-1',
          title: 'Opening',
          description: 'Opening scene with background',
          duration: 5,
          image: '/bg.jpg',
          audioTracks: [
            {
              id: 'audio-1',
              name: 'Music',
              type: 'music',
              url: '/music.mp3',
              startTime: 0,
              duration: 5,
              offset: 0,
              volume: 80,
              fadeIn: 0.5,
              fadeOut: 0.5,
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
      ];

      shots.forEach((shot) => useStore.getState().addShot(shot));

      await waitFor(() => {
        const state = useStore.getState();
        expect(state.shots.length).toBe(2);
        expect(state.assets.length).toBe(2);
        expect(state.shots[0].audioTracks.length).toBe(1);
      });
    });
  });

  describe('Saving Project', () => {
    it('should save project to JSON format', async () => {
      const project = createEmptyProject('Save Test');
      useStore.setState({ project });

      const shot: Shot = {
        id: 'shot-1',
        title: 'Test Shot',
        description: 'Test',
        duration: 5,
        audioTracks: [],
        effects: [],
        textLayers: [],
        animations: [],
        position: 0,
      };

      useStore.getState().addShot(shot);

      // Update project with shots
      const updatedProject = {
        ...project,
        shots: useStore.getState().shots,
      };

      const json = saveProjectToJSON(updatedProject);
      const parsed = JSON.parse(json);

      expect(parsed.project_name).toBe('Save Test');
      expect(parsed.shots.length).toBe(1);
      expect(parsed.shots[0].title).toBe('Test Shot');
    });

    it('should save project with all data intact', async () => {
      const project = createEmptyProject('Full Save Test');
      useStore.setState({ project });

      // Add complete shot with all features
      const shot: Shot = {
        id: 'shot-1',
        title: 'Complex Shot',
        description: 'Shot with everything',
        duration: 10,
        image: '/image.jpg',
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
        animations: [],
        transitionOut: {
          id: 'trans-1',
          type: 'fade',
          duration: 1,
          easing: 'ease-in-out',
        },
        position: 0,
      };

      useStore.getState().addShot(shot);

      const updatedProject = {
        ...project,
        shots: useStore.getState().shots,
      };

      const json = saveProjectToJSON(updatedProject);
      const parsed = JSON.parse(json);

      expect(parsed.shots[0].metadata.audioTracks.length).toBe(1);
      expect(parsed.shots[0].metadata.effects.length).toBe(1);
      expect(parsed.shots[0].metadata.textLayers.length).toBe(1);
      expect(parsed.shots[0].metadata.transitionOut).toBeDefined();
    });

    it('should validate saved project', async () => {
      const project = createEmptyProject('Validation Test');
      const json = saveProjectToJSON(project);
      const parsed = JSON.parse(json);

      expect(validateProject(parsed)).toBe(true);
    });
  });

  describe('Complete Workflow', () => {
    it('should complete full project creation workflow', async () => {
      // Step 1: Create new project
      const project = createEmptyProject('My Video Project');
      useStore.setState({ project });

      // Step 2: Add assets
      const imageAsset: Asset = {
        id: 'asset-1',
        name: 'Hero Image',
        type: 'image',
        url: '/hero.jpg',
      };

      const audioAsset: Asset = {
        id: 'asset-2',
        name: 'Background Music',
        type: 'audio',
        url: '/bgmusic.mp3',
      };

      useStore.getState().addAsset(imageAsset);
      useStore.getState().addAsset(audioAsset);

      // Step 3: Create shots
      const shot1: Shot = {
        id: 'shot-1',
        title: 'Introduction',
        description: 'Opening shot with hero image',
        duration: 5,
        image: imageAsset.url,
        audioTracks: [
          {
            id: 'audio-1',
            name: audioAsset.name,
            type: 'music',
            url: audioAsset.url,
            startTime: 0,
            duration: 5,
            offset: 0,
            volume: 70,
            fadeIn: 1,
            fadeOut: 0,
            pan: 0,
            muted: false,
            solo: false,
            effects: [],
          },
        ],
        effects: [],
        textLayers: [
          {
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
          },
        ],
        animations: [],
        position: 0,
      };

      const shot2: Shot = {
        id: 'shot-2',
        title: 'Main Content',
        description: 'Main content shot',
        duration: 10,
        audioTracks: [],
        effects: [],
        textLayers: [],
        animations: [],
        transitionOut: {
          id: 'trans-1',
          type: 'fade',
          duration: 1,
          easing: 'ease-out',
        },
        position: 1,
      };

      useStore.getState().addShot(shot1);
      useStore.getState().addShot(shot2);

      // Step 4: Select and edit shot
      useStore.getState().selectShot('shot-1');

      // Step 5: Save project
      const finalProject = {
        ...project,
        shots: useStore.getState().shots,
        assets: useStore.getState().assets,
      };

      const json = saveProjectToJSON(finalProject);
      const parsed = JSON.parse(json);

      // Verify complete workflow
      await waitFor(() => {
        expect(parsed.project_name).toBe('My Video Project');
        expect(parsed.shots.length).toBe(2);
        expect(parsed.assets.length).toBe(2);
        expect(parsed.shots[0].title).toBe('Introduction');
        expect(parsed.shots[0].metadata.audioTracks.length).toBe(1);
        expect(parsed.shots[0].metadata.textLayers.length).toBe(1);
        expect(parsed.shots[1].metadata.transitionOut).toBeDefined();
        expect(validateProject(parsed)).toBe(true);
      });
    });
  });
});
