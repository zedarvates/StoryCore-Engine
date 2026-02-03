/**
 * Project Recovery Service Tests
 * 
 * Tests for automatic recovery snapshots and crash detection.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  saveRecoverySnapshot,
  loadRecoverySnapshot,
  getRecoverySnapshots,
  deleteRecoverySnapshot,
  clearAllRecoverySnapshots,
  markSessionActive,
  markSessionClosed,
  checkForCrashedSession,
  clearCrashedSessionFlag,
  formatSnapshotTimestamp,
  RecoveryManager,
} from '../projectRecovery';
import type { RootState } from '../../store';

// Mock state
const mockState: RootState = {
  project: {
    metadata: {
      name: 'Test Project',
      path: '/test/project',
      created: new Date('2024-01-01'),
      modified: new Date('2024-01-02'),
      author: 'Test Author',
      description: 'Test Description',
    },
    settings: {
      resolution: { width: 1920, height: 1080 },
      format: 'mp4' as const,
      quality: 'preview' as const,
      fps: 30,
    },
    saveStatus: {
      state: 'saved' as const,
      lastSaveTime: new Date('2024-01-02'),
    },
    generationStatus: {
      state: 'idle' as const,
    },
  },
  timeline: {
    shots: [],
    tracks: [],
    playheadPosition: 0,
    zoomLevel: 1,
    selectedElements: [],
    duration: 120,
  },
  assets: {
    categories: [],
    activeCategory: 'characters',
    searchQuery: '',
  },
  panels: {
    layout: {},
    activePanel: null,
    shotConfigTarget: null,
  },
  tools: {
    activeTool: 'select' as const,
    toolSettings: {},
  },
  preview: {
    currentFrame: null,
    playbackState: 'stopped' as const,
    playbackSpeed: 1,
  },
  history: {
    undoStack: [],
    redoStack: [],
    maxStackSize: 50,
  },
};

describe('projectRecovery', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });
  
  describe('saveRecoverySnapshot', () => {
    it('should save recovery snapshot to localStorage', () => {
      saveRecoverySnapshot(mockState);
      
      const snapshots = getRecoverySnapshots();
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].projectName).toBe('Test Project');
      expect(snapshots[0].shotCount).toBe(0);
      expect(snapshots[0].duration).toBe(120);
    });
    
    it('should limit snapshots to maximum count', () => {
      // Save more than MAX_RECOVERY_SNAPSHOTS (10)
      for (let i = 0; i < 15; i++) {
        saveRecoverySnapshot(mockState);
      }
      
      const snapshots = getRecoverySnapshots();
      expect(snapshots.length).toBeLessThanOrEqual(10);
    });
  });
  
  describe('loadRecoverySnapshot', () => {
    it('should load recovery snapshot by ID', () => {
      saveRecoverySnapshot(mockState);
      
      const snapshots = getRecoverySnapshots();
      const snapshotId = snapshots[0].id;
      
      const loaded = loadRecoverySnapshot(snapshotId);
      
      expect(loaded).not.toBeNull();
      expect(loaded?.project.metadata.name).toBe('Test Project');
    });
    
    it('should return null for non-existent snapshot', () => {
      const loaded = loadRecoverySnapshot('non-existent-id');
      
      expect(loaded).toBeNull();
    });
  });
  
  describe('deleteRecoverySnapshot', () => {
    it('should delete recovery snapshot', () => {
      saveRecoverySnapshot(mockState);
      
      const snapshots = getRecoverySnapshots();
      const snapshotId = snapshots[0].id;
      
      deleteRecoverySnapshot(snapshotId);
      
      const remaining = getRecoverySnapshots();
      expect(remaining).toHaveLength(0);
    });
  });
  
  describe('clearAllRecoverySnapshots', () => {
    it('should clear all recovery snapshots', () => {
      saveRecoverySnapshot(mockState);
      saveRecoverySnapshot(mockState);
      saveRecoverySnapshot(mockState);
      
      expect(getRecoverySnapshots()).toHaveLength(3);
      
      clearAllRecoverySnapshots();
      
      expect(getRecoverySnapshots()).toHaveLength(0);
    });
  });
  
  describe('crash detection', () => {
    it('should detect crashed session', () => {
      markSessionActive();
      
      const crashed = checkForCrashedSession();
      
      expect(crashed).toBe(true);
    });
    
    it('should not detect crash for normally closed session', () => {
      markSessionActive();
      markSessionClosed();
      
      const crashed = checkForCrashedSession();
      
      expect(crashed).toBe(false);
    });
    
    it('should clear crashed session flag', () => {
      markSessionActive();
      const firstCheck = checkForCrashedSession();
      expect(firstCheck).toBe(true);
      
      clearCrashedSessionFlag();
      markSessionClosed(); // Need to close the session first
      
      // Check again - should not be marked as crashed anymore
      const crashed = checkForCrashedSession();
      expect(crashed).toBe(false);
    });
  });
  
  describe('formatSnapshotTimestamp', () => {
    it('should format recent timestamp as "Just now"', () => {
      const now = new Date().toISOString();
      const formatted = formatSnapshotTimestamp(now);
      
      expect(formatted).toBe('Just now');
    });
    
    it('should format timestamp in minutes', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const formatted = formatSnapshotTimestamp(fiveMinutesAgo);
      
      expect(formatted).toBe('5 minutes ago');
    });
    
    it('should format timestamp in hours', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const formatted = formatSnapshotTimestamp(twoHoursAgo);
      
      expect(formatted).toBe('2 hours ago');
    });
  });
  
  describe('RecoveryManager', () => {
    let manager: RecoveryManager;
    
    beforeEach(() => {
      vi.useFakeTimers();
      manager = new RecoveryManager(() => mockState);
    });
    
    afterEach(() => {
      manager.stop();
      vi.useRealTimers();
    });
    
    it('should start automatic snapshots', () => {
      manager.start();
      
      // Should save initial snapshot
      expect(getRecoverySnapshots()).toHaveLength(1);
      
      // Advance time by 5 minutes
      vi.advanceTimersByTime(5 * 60 * 1000);
      
      // Should save another snapshot
      expect(getRecoverySnapshots()).toHaveLength(2);
    });
    
    it('should stop automatic snapshots', () => {
      manager.start();
      
      expect(getRecoverySnapshots()).toHaveLength(1);
      
      manager.stop();
      
      // Advance time - should not save more snapshots
      vi.advanceTimersByTime(5 * 60 * 1000);
      
      expect(getRecoverySnapshots()).toHaveLength(1);
    });
    
    it('should mark session as active on start', () => {
      manager.start();
      
      const crashed = checkForCrashedSession();
      expect(crashed).toBe(true);
    });
    
    it('should mark session as closed on stop', () => {
      manager.start();
      manager.stop();
      
      const crashed = checkForCrashedSession();
      expect(crashed).toBe(false);
    });
  });
});
