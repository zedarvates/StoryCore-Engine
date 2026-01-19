/**
 * Basic verification tests for the Zustand store
 * These tests verify that the store is properly configured and all actions work
 */

import { useStore } from '../index';
import type { Shot, Asset, GenerationTask } from '../../types';

describe('Zustand Store', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useStore.setState({
      project: null,
      shots: [],
      assets: [],
      selectedShotId: null,
      currentTime: 0,
      showChat: false,
      showTaskQueue: false,
      panelSizes: {
        assetLibrary: 20,
        canvas: 55,
        propertiesOrChat: 25,
      },
      taskQueue: [],
      generationStatus: {
        isGenerating: false,
        progress: 0,
      },
      isPlaying: false,
      playbackSpeed: 1,
      history: [],
      historyIndex: -1,
      selectedEffectId: null,
      selectedTextLayerId: null,
      selectedKeyframeId: null,
    });
  });

  describe('Project State', () => {
    it('should set project', () => {
      const project = {
        schema_version: '1.0',
        project_name: 'Test Project',
        shots: [],
        assets: [],
        capabilities: {
          grid_generation: true,
          promotion_engine: true,
          qa_engine: true,
          autofix_engine: true,
        },
        generation_status: {
          grid: 'pending' as const,
          promotion: 'pending' as const,
        },
      };

      useStore.getState().setProject(project);
      expect(useStore.getState().project).toEqual(project);
    });

    it('should update project', () => {
      const project = {
        schema_version: '1.0',
        project_name: 'Test Project',
        shots: [],
        assets: [],
        capabilities: {
          grid_generation: true,
          promotion_engine: true,
          qa_engine: true,
          autofix_engine: true,
        },
        generation_status: {
          grid: 'pending' as const,
          promotion: 'pending' as const,
        },
      };

      useStore.getState().setProject(project);
      useStore.getState().updateProject({ project_name: 'Updated Project' });
      
      expect(useStore.getState().project?.project_name).toBe('Updated Project');
    });
  });

  describe('Shot Actions', () => {
    it('should add a shot', () => {
      const shot: Shot = {
        id: 'shot-1',
        title: 'Test Shot',
        description: 'A test shot',
        duration: 5,
        audioTracks: [],
        effects: [],
        textLayers: [],
        animations: [],
        position: 0,
      };

      useStore.getState().addShot(shot);
      expect(useStore.getState().shots).toHaveLength(1);
      expect(useStore.getState().shots[0]).toEqual(shot);
    });

    it('should update a shot', () => {
      const shot: Shot = {
        id: 'shot-1',
        title: 'Test Shot',
        description: 'A test shot',
        duration: 5,
        audioTracks: [],
        effects: [],
        textLayers: [],
        animations: [],
        position: 0,
      };

      useStore.getState().addShot(shot);
      useStore.getState().updateShot('shot-1', { title: 'Updated Shot' });
      
      expect(useStore.getState().shots[0].title).toBe('Updated Shot');
    });

    it('should delete a shot', () => {
      const shot: Shot = {
        id: 'shot-1',
        title: 'Test Shot',
        description: 'A test shot',
        duration: 5,
        audioTracks: [],
        effects: [],
        textLayers: [],
        animations: [],
        position: 0,
      };

      useStore.getState().addShot(shot);
      useStore.getState().deleteShot('shot-1');
      
      expect(useStore.getState().shots).toHaveLength(0);
    });

    it('should select a shot', () => {
      useStore.getState().selectShot('shot-1');
      expect(useStore.getState().selectedShotId).toBe('shot-1');
    });

    it('should reorder shots', () => {
      const shot1: Shot = {
        id: 'shot-1',
        title: 'Shot 1',
        description: 'First shot',
        duration: 5,
        audioTracks: [],
        effects: [],
        textLayers: [],
        animations: [],
        position: 0,
      };

      const shot2: Shot = {
        id: 'shot-2',
        title: 'Shot 2',
        description: 'Second shot',
        duration: 5,
        audioTracks: [],
        effects: [],
        textLayers: [],
        animations: [],
        position: 1,
      };

      useStore.getState().addShot(shot1);
      useStore.getState().addShot(shot2);
      useStore.getState().reorderShots([shot2, shot1]);
      
      expect(useStore.getState().shots[0].id).toBe('shot-2');
      expect(useStore.getState().shots[1].id).toBe('shot-1');
    });
  });

  describe('Asset Actions', () => {
    it('should add an asset', () => {
      const asset: Asset = {
        id: 'asset-1',
        name: 'Test Asset',
        type: 'image',
        url: '/test.jpg',
      };

      useStore.getState().addAsset(asset);
      expect(useStore.getState().assets).toHaveLength(1);
      expect(useStore.getState().assets[0]).toEqual(asset);
    });

    it('should update an asset', () => {
      const asset: Asset = {
        id: 'asset-1',
        name: 'Test Asset',
        type: 'image',
        url: '/test.jpg',
      };

      useStore.getState().addAsset(asset);
      useStore.getState().updateAsset('asset-1', { name: 'Updated Asset' });
      
      expect(useStore.getState().assets[0].name).toBe('Updated Asset');
    });

    it('should delete an asset', () => {
      const asset: Asset = {
        id: 'asset-1',
        name: 'Test Asset',
        type: 'image',
        url: '/test.jpg',
      };

      useStore.getState().addAsset(asset);
      useStore.getState().deleteAsset('asset-1');
      
      expect(useStore.getState().assets).toHaveLength(0);
    });
  });

  describe('Task Queue Actions', () => {
    it('should add a task', () => {
      const task: GenerationTask = {
        id: 'task-1',
        shotId: 'shot-1',
        type: 'grid',
        status: 'pending',
        priority: 1,
        createdAt: new Date(),
      };

      useStore.getState().addTask(task);
      expect(useStore.getState().taskQueue).toHaveLength(1);
      expect(useStore.getState().taskQueue[0].id).toBe('task-1');
    });

    it('should update task priorities when adding', () => {
      const task1: GenerationTask = {
        id: 'task-1',
        shotId: 'shot-1',
        type: 'grid',
        status: 'pending',
        priority: 1,
        createdAt: new Date(),
      };

      const task2: GenerationTask = {
        id: 'task-2',
        shotId: 'shot-2',
        type: 'promotion',
        status: 'pending',
        priority: 2,
        createdAt: new Date(),
      };

      useStore.getState().addTask(task1);
      useStore.getState().addTask(task2);
      
      expect(useStore.getState().taskQueue[0].priority).toBe(1);
      expect(useStore.getState().taskQueue[1].priority).toBe(2);
    });

    it('should move task up', () => {
      const task1: GenerationTask = {
        id: 'task-1',
        shotId: 'shot-1',
        type: 'grid',
        status: 'pending',
        priority: 1,
        createdAt: new Date(),
      };

      const task2: GenerationTask = {
        id: 'task-2',
        shotId: 'shot-2',
        type: 'promotion',
        status: 'pending',
        priority: 2,
        createdAt: new Date(),
      };

      useStore.getState().addTask(task1);
      useStore.getState().addTask(task2);
      useStore.getState().moveTaskUp('task-2');
      
      expect(useStore.getState().taskQueue[0].id).toBe('task-2');
      expect(useStore.getState().taskQueue[1].id).toBe('task-1');
    });

    it('should move task down', () => {
      const task1: GenerationTask = {
        id: 'task-1',
        shotId: 'shot-1',
        type: 'grid',
        status: 'pending',
        priority: 1,
        createdAt: new Date(),
      };

      const task2: GenerationTask = {
        id: 'task-2',
        shotId: 'shot-2',
        type: 'promotion',
        status: 'pending',
        priority: 2,
        createdAt: new Date(),
      };

      useStore.getState().addTask(task1);
      useStore.getState().addTask(task2);
      useStore.getState().moveTaskDown('task-1');
      
      expect(useStore.getState().taskQueue[0].id).toBe('task-2');
      expect(useStore.getState().taskQueue[1].id).toBe('task-1');
    });

    it('should remove a task', () => {
      const task: GenerationTask = {
        id: 'task-1',
        shotId: 'shot-1',
        type: 'grid',
        status: 'pending',
        priority: 1,
        createdAt: new Date(),
      };

      useStore.getState().addTask(task);
      useStore.getState().removeTask('task-1');
      
      expect(useStore.getState().taskQueue).toHaveLength(0);
    });
  });

  describe('UI State Actions', () => {
    it('should toggle chat visibility', () => {
      useStore.getState().setShowChat(true);
      expect(useStore.getState().showChat).toBe(true);
      
      useStore.getState().setShowChat(false);
      expect(useStore.getState().showChat).toBe(false);
    });

    it('should toggle task queue visibility', () => {
      useStore.getState().setShowTaskQueue(true);
      expect(useStore.getState().showTaskQueue).toBe(true);
      
      useStore.getState().setShowTaskQueue(false);
      expect(useStore.getState().showTaskQueue).toBe(false);
    });

    it('should update panel sizes', () => {
      const newSizes = {
        assetLibrary: 25,
        canvas: 50,
        propertiesOrChat: 25,
      };

      useStore.getState().setPanelSizes(newSizes);
      expect(useStore.getState().panelSizes).toEqual(newSizes);
    });

    it('should update current time', () => {
      useStore.getState().setCurrentTime(10.5);
      expect(useStore.getState().currentTime).toBe(10.5);
    });
  });

  describe('Playback Actions', () => {
    it('should play', () => {
      useStore.getState().play();
      expect(useStore.getState().isPlaying).toBe(true);
    });

    it('should pause', () => {
      useStore.getState().play();
      useStore.getState().pause();
      expect(useStore.getState().isPlaying).toBe(false);
    });

    it('should stop and reset time', () => {
      useStore.getState().setCurrentTime(10);
      useStore.getState().play();
      useStore.getState().stop();
      
      expect(useStore.getState().isPlaying).toBe(false);
      expect(useStore.getState().currentTime).toBe(0);
    });

    it('should set playback speed', () => {
      useStore.getState().setPlaybackSpeed(2);
      expect(useStore.getState().playbackSpeed).toBe(2);
    });
  });

  describe('Undo/Redo', () => {
    it('should have undo/redo methods', () => {
      expect(typeof useStore.getState().undo).toBe('function');
      expect(typeof useStore.getState().redo).toBe('function');
      expect(typeof useStore.getState().canUndo).toBe('function');
      expect(typeof useStore.getState().canRedo).toBe('function');
    });

    it('should track history', () => {
      const shot: Shot = {
        id: 'shot-1',
        title: 'Test Shot',
        description: 'A test shot',
        duration: 5,
        audioTracks: [],
        effects: [],
        textLayers: [],
        animations: [],
        position: 0,
      };

      // Push initial state to history
      useStore.getState().pushHistory({
        shots: [],
        project: null,
        assets: [],
        selectedShotId: null,
        taskQueue: [],
      });

      // Add shot
      useStore.getState().addShot(shot);

      // Push new state to history
      useStore.getState().pushHistory({
        shots: [shot],
        project: null,
        assets: [],
        selectedShotId: null,
        taskQueue: [],
      });

      expect(useStore.getState().history.length).toBeGreaterThan(0);
    });
  });
});
