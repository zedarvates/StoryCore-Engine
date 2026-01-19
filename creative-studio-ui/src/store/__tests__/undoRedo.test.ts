/**
 * Unit tests for undo/redo functionality
 * Tests the history management and state restoration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../index';
import {
  createHistorySnapshot,
  restoreFromSnapshot,
  pushToHistory,
  undo,
  redo,
  canUndo,
  canRedo,
  withUndo,
  batchActions,
} from '../undoRedo';
import type { Shot, HistoryState } from '../../types';

describe('undoRedo', () => {
  beforeEach(() => {
    // Reset store to initial state
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

  describe('createHistorySnapshot', () => {
    it('should create a deep copy of state', () => {
      const shot: Shot = {
        id: 'shot-1',
        title: 'Test',
        description: 'Test',
        duration: 5,
        audioTracks: [],
        effects: [],
        textLayers: [],
        animations: [],
        position: 0,
      };

      useStore.setState({ shots: [shot] });
      const state = useStore.getState();
      const snapshot = createHistorySnapshot(state);

      // Modify original
      shot.title = 'Modified';

      // Snapshot should be unchanged
      expect(snapshot.shots[0].title).toBe('Test');
    });

    it('should include all required state fields', () => {
      const state = useStore.getState();
      const snapshot = createHistorySnapshot(state);

      expect(snapshot).toHaveProperty('shots');
      expect(snapshot).toHaveProperty('project');
      expect(snapshot).toHaveProperty('assets');
      expect(snapshot).toHaveProperty('selectedShotId');
      expect(snapshot).toHaveProperty('taskQueue');
    });
  });

  describe('restoreFromSnapshot', () => {
    it('should restore state from snapshot', () => {
      const shot: Shot = {
        id: 'shot-1',
        title: 'Test',
        description: 'Test',
        duration: 5,
        audioTracks: [],
        effects: [],
        textLayers: [],
        animations: [],
        position: 0,
      };

      const snapshot: HistoryState = {
        shots: [shot],
        project: null,
        assets: [],
        selectedShotId: 'shot-1',
        taskQueue: [],
      };

      const restored = restoreFromSnapshot(snapshot);

      expect(restored.shots).toEqual([shot]);
      expect(restored.selectedShotId).toBe('shot-1');
    });

    it('should create independent copies', () => {
      const shot: Shot = {
        id: 'shot-1',
        title: 'Test',
        description: 'Test',
        duration: 5,
        audioTracks: [],
        effects: [],
        textLayers: [],
        animations: [],
        position: 0,
      };

      const snapshot: HistoryState = {
        shots: [shot],
        project: null,
        assets: [],
        selectedShotId: null,
        taskQueue: [],
      };

      const restored = restoreFromSnapshot(snapshot);

      // Modify restored
      if (restored.shots) {
        restored.shots[0].title = 'Modified';
      }

      // Original snapshot should be unchanged
      expect(snapshot.shots[0].title).toBe('Test');
    });
  });

  describe('pushToHistory', () => {
    it('should add current state to history', () => {
      const shot: Shot = {
        id: 'shot-1',
        title: 'Test',
        description: 'Test',
        duration: 5,
        audioTracks: [],
        effects: [],
        textLayers: [],
        animations: [],
        position: 0,
      };

      useStore.setState({ shots: [shot] });
      pushToHistory();

      const state = useStore.getState();
      expect(state.history.length).toBe(1);
      expect(state.historyIndex).toBe(0);
    });

    it('should limit history to 50 entries', () => {
      // Add 60 entries
      for (let i = 0; i < 60; i++) {
        useStore.setState({ currentTime: i });
        pushToHistory();
      }

      const state = useStore.getState();
      expect(state.history.length).toBeLessThanOrEqual(50);
    });

    it('should remove future history when pushing from middle', () => {
      // Create history
      pushToHistory(); // State 0
      useStore.setState({ currentTime: 1 });
      pushToHistory(); // State 1
      useStore.setState({ currentTime: 2 });
      pushToHistory(); // State 2

      // Undo twice
      undo();
      undo();

      // Make new change
      useStore.setState({ currentTime: 10 });
      pushToHistory();

      const state = useStore.getState();
      // Should have states 0, 1, and new state (10)
      expect(state.history.length).toBe(3);
    });
  });

  describe('undo', () => {
    it('should restore previous state', () => {
      const shot1: Shot = {
        id: 'shot-1',
        title: 'Shot 1',
        description: 'Test',
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
        description: 'Test',
        duration: 5,
        audioTracks: [],
        effects: [],
        textLayers: [],
        animations: [],
        position: 1,
      };

      // Initial state
      pushToHistory();

      // Add shot 1
      useStore.setState({ shots: [shot1] });
      pushToHistory();

      // Add shot 2
      useStore.setState({ shots: [shot1, shot2] });
      pushToHistory();

      // Undo
      undo();

      const state = useStore.getState();
      expect(state.shots.length).toBe(1);
      expect(state.shots[0].id).toBe('shot-1');
    });

    it('should not undo when at beginning of history', () => {
      pushToHistory();
      const initialState = useStore.getState();

      undo(); // Should do nothing

      const state = useStore.getState();
      expect(state.historyIndex).toBe(initialState.historyIndex);
    });
  });

  describe('redo', () => {
    it('should restore next state', () => {
      const shot: Shot = {
        id: 'shot-1',
        title: 'Test',
        description: 'Test',
        duration: 5,
        audioTracks: [],
        effects: [],
        textLayers: [],
        animations: [],
        position: 0,
      };

      // Initial state
      pushToHistory();

      // Add shot
      useStore.setState({ shots: [shot] });
      pushToHistory();

      // Undo
      undo();

      // Redo
      redo();

      const state = useStore.getState();
      expect(state.shots.length).toBe(1);
      expect(state.shots[0].id).toBe('shot-1');
    });

    it('should not redo when at end of history', () => {
      pushToHistory();
      const initialState = useStore.getState();

      redo(); // Should do nothing

      const state = useStore.getState();
      expect(state.historyIndex).toBe(initialState.historyIndex);
    });
  });

  describe('canUndo and canRedo', () => {
    it('should return false when no history', () => {
      expect(canUndo()).toBe(false);
      expect(canRedo()).toBe(false);
    });

    it('should return true when undo is available', () => {
      pushToHistory();
      useStore.setState({ currentTime: 1 });
      pushToHistory();

      expect(canUndo()).toBe(true);
      expect(canRedo()).toBe(false);
    });

    it('should return true when redo is available', () => {
      pushToHistory();
      useStore.setState({ currentTime: 1 });
      pushToHistory();

      undo();

      expect(canUndo()).toBe(true);
      expect(canRedo()).toBe(true);
    });
  });

  describe('withUndo', () => {
    it('should wrap action with history tracking', () => {
      const shot: Shot = {
        id: 'shot-1',
        title: 'Test',
        description: 'Test',
        duration: 5,
        audioTracks: [],
        effects: [],
        textLayers: [],
        animations: [],
        position: 0,
      };

      // Initial state
      pushToHistory();

      // Wrap addShot with undo
      const addShotWithUndo = withUndo(useStore.getState().addShot);
      addShotWithUndo(shot);

      // Should have history entry
      const state = useStore.getState();
      expect(state.history.length).toBeGreaterThan(1);

      // Should be able to undo
      expect(canUndo()).toBe(true);
    });
  });

  describe('batchActions', () => {
    it('should create single history entry for multiple actions', () => {
      const shot1: Shot = {
        id: 'shot-1',
        title: 'Shot 1',
        description: 'Test',
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
        description: 'Test',
        duration: 5,
        audioTracks: [],
        effects: [],
        textLayers: [],
        animations: [],
        position: 1,
      };

      // Initial state
      pushToHistory();
      const initialHistoryLength = useStore.getState().history.length;

      // Batch multiple actions
      batchActions(() => {
        useStore.getState().addShot(shot1);
        useStore.getState().addShot(shot2);
      });

      // Should only add one history entry
      const state = useStore.getState();
      expect(state.history.length).toBe(initialHistoryLength + 1);
      expect(state.shots.length).toBe(2);
    });
  });
});
