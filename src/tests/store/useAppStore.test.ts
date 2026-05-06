/**
 * Store Tests
 * 
 * Requirements: 129-135
 * Level: 🟡 HAUTE
 * 
 * Tests for Zustand stores with undo/redo, persistence, and validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from '../stores/useAppStore';
import { useUndoRedoStore } from '../stores/useUndoRedoStore';
import { useCrossTabSync } from '../stores/useCrossTabSync';

describe('App Store', () => {
  beforeEach(() => {
    useAppStore.setState(useAppStore.getInitialState());
  });

  describe('Project Management', () => {
    it('should create a project', () => {
      const project = {
        name: 'Test Project',
        type: 'grid' as const,
      };

      useAppStore.getState().createProject(project);

      const projects = useAppStore.getState().projects;
      expect(projects.size).toBe(1);

      const createdProject = Array.from(projects.values())[0];
      expect(createdProject.name).toBe('Test Project');
      expect(createdProject.type).toBe('grid');
      expect(createdProject.status).toBe('active');
      expect(createdProject.id).toBeDefined();
    });

    it('should update a project', () => {
      const project = {
        name: 'Test Project',
        type: 'grid' as const,
      };

      useAppStore.getState().createProject(project);
      const projectId = Array.from(useAppStore.getState().projects.keys())[0];

      useAppStore.getState().updateProject(projectId, {
        name: 'Updated Project',
      });

      const updatedProject = useAppStore.getState().projects.get(projectId);
      expect(updatedProject?.name).toBe('Updated Project');
    });

    it('should delete a project', () => {
      const project = {
        name: 'Test Project',
        type: 'grid' as const,
      };

      useAppStore.getState().createProject(project);
      const projectId = Array.from(useAppStore.getState().projects.keys())[0];

      useAppStore.getState().deleteProject(projectId);

      expect(useAppStore.getState().projects.size).toBe(0);
    });

    it('should set current project', () => {
      const project = {
        name: 'Test Project',
        type: 'grid' as const,
      };

      useAppStore.getState().createProject(project);
      const projectId = Array.from(useAppStore.getState().projects.keys())[0];

      useAppStore.getState().setCurrentProject(projectId);

      expect(useAppStore.getState().currentProjectId).toBe(projectId);
    });
  });

  describe('Result Management', () => {
    it('should add a result', () => {
      const result = {
        taskId: 'task-1',
        shotId: 'shot-1',
        type: 'grid' as const,
        status: 'success' as const,
        assets: [],
        generatedAt: new Date().toISOString(),
      };

      useAppStore.getState().addResult(result);

      const results = useAppStore.getState().results;
      expect(results.size).toBe(1);
      expect(results.get('task-1')).toBeDefined();
    });

    it('should update a result', () => {
      const result = {
        taskId: 'task-1',
        shotId: 'shot-1',
        type: 'grid' as const,
        status: 'success' as const,
        assets: [],
        generatedAt: new Date().toISOString(),
      };

      useAppStore.getState().addResult(result);

      useAppStore.getState().updateResult('task-1', {
        status: 'failed',
      });

      const updatedResult = useAppStore.getState().results.get('task-1');
      expect(updatedResult?.status).toBe('failed');
    });

    it('should delete a result', () => {
      const result = {
        taskId: 'task-1',
        shotId: 'shot-1',
        type: 'grid' as const,
        status: 'success' as const,
        assets: [],
        generatedAt: new Date().toISOString(),
      };

      useAppStore.getState().addResult(result);
      useAppStore.getState().deleteResult('task-1');

      expect(useAppStore.getState().results.size).toBe(0);
    });

    it('should select and deselect results', () => {
      const result = {
        taskId: 'task-1',
        shotId: 'shot-1',
        type: 'grid' as const,
        status: 'success' as const,
        assets: [],
        generatedAt: new Date().toISOString(),
      };

      useAppStore.getState().addResult(result);

      useAppStore.getState().selectResult('task-1');
      expect(useAppStore.getState().selectedResultIds.has('task-1')).toBe(true);

      useAppStore.getState().deselectResult('task-1');
      expect(useAppStore.getState().selectedResultIds.has('task-1')).toBe(false);
    });

    it('should clear selected results', () => {
      const result1 = {
        taskId: 'task-1',
        shotId: 'shot-1',
        type: 'grid' as const,
        status: 'success' as const,
        assets: [],
        generatedAt: new Date().toISOString(),
      };

      const result2 = {
        taskId: 'task-2',
        shotId: 'shot-2',
        type: 'promotion' as const,
        status: 'success' as const,
        assets: [],
        generatedAt: new Date().toISOString(),
      };

      useAppStore.getState().addResult(result1);
      useAppStore.getState().addResult(result2);

      useAppStore.getState().selectResult('task-1');
      useAppStore.getState().selectResult('task-2');

      expect(useAppStore.getState().selectedResultIds.size).toBe(2);

      useAppStore.getState().clearSelectedResults();

      expect(useAppStore.getState().selectedResultIds.size).toBe(0);
    });
  });

  describe('UI State', () => {
    it('should set loading state', () => {
      useAppStore.getState().setLoading(true);
      expect(useAppStore.getState().isLoading).toBe(true);

      useAppStore.getState().setLoading(false);
      expect(useAppStore.getState().isLoading).toBe(false);
    });

    it('should set error', () => {
      useAppStore.getState().setError('Test error');
      expect(useAppStore.getState().error).toBe('Test error');

      useAppStore.getState().setError(null);
      expect(useAppStore.getState().error).toBeNull();
    });

    it('should add notification', () => {
      useAppStore.getState().addNotification({
        type: 'success',
        title: 'Test',
        message: 'Test message',
      });

      expect(useAppStore.getState().notifications.length).toBe(1);
      expect(useAppStore.getState().notifications[0].type).toBe('success');
    });

    it('should remove notification', () => {
      useAppStore.getState().addNotification({
        type: 'success',
        title: 'Test',
        message: 'Test message',
      });

      const notificationId = useAppStore.getState().notifications[0].id;
      useAppStore.getState().removeNotification(notificationId);

      expect(useAppStore.getState().notifications.length).toBe(0);
    });

    it('should mark notification as read', () => {
      useAppStore.getState().addNotification({
        type: 'success',
        title: 'Test',
        message: 'Test message',
      });

      const notificationId = useAppStore.getState().notifications[0].id;
      useAppStore.getState().markNotificationAsRead(notificationId);

      expect(useAppStore.getState().notifications[0].read).toBe(true);
    });
  });

  describe('Settings', () => {
    it('should update settings', () => {
      useAppStore.getState().updateSettings({
        theme: 'dark',
        language: 'fr',
      });

      expect(useAppStore.getState().settings.theme).toBe('dark');
      expect(useAppStore.getState().settings.language).toBe('fr');
    });
  });

  describe('Batch Operations', () => {
    it('should perform batch update', () => {
      useAppStore.getState().batchUpdate((state) => {
        state.projects.set('test', {
          id: 'test',
          name: 'Test',
          type: 'grid',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'active',
        });

        state.results.set('task-1', {
          taskId: 'task-1',
          shotId: 'shot-1',
          type: 'grid',
          status: 'success',
          assets: [],
          generatedAt: new Date().toISOString(),
        });
      });

      expect(useAppStore.getState().projects.size).toBe(1);
      expect(useAppStore.getState().results.size).toBe(1);
    });
  });
});

describe('Undo/Redo Store', () => {
  beforeEach(() => {
    useUndoRedoStore.setState(useUndoRedoStore.getInitialState());
  });

  it('should add action', () => {
    useUndoRedoStore.getState().addAction({
      type: 'test',
      description: 'Test action',
      patches: [],
      inversePatches: [],
      state: { test: true },
    });

    expect(useUndoRedoStore.getState().history.length).toBe(1);
    expect(useUndoRedoStore.getState().currentIndex).toBe(0);
  });

  it('should undo action', () => {
    useUndoRedoStore.getState().addAction({
      type: 'test',
      description: 'Test action',
      patches: [],
      inversePatches: [],
      state: { test: true },
    });

    useUndoRedoStore.getState().undo();

    expect(useUndoRedoStore.getState().currentIndex).toBe(-1);
  });

  it('should redo action', () => {
    useUndoRedoStore.getState().addAction({
      type: 'test',
      description: 'Test action',
      patches: [],
      inversePatches: [],
      state: { test: true },
    });

    useUndoRedoStore.getState().undo();
    useUndoRedoStore.getState().redo();

    expect(useUndoRedoStore.getState().currentIndex).toBe(0);
  });

  it('should check canUndo', () => {
    expect(useUndoRedoStore.getState().canUndo()).toBe(false);

    useUndoRedoStore.getState().addAction({
      type: 'test',
      description: 'Test action',
      patches: [],
      inversePatches: [],
      state: { test: true },
    });

    expect(useUndoRedoStore.getState().canUndo()).toBe(true);
  });

  it('should check canRedo', () => {
    expect(useUndoRedoStore.getState().canRedo()).toBe(false);

    useUndoRedoStore.getState().addAction({
      type: 'test',
      description: 'Test action',
      patches: [],
      inversePatches: [],
      state: { test: true },
    });

    useUndoRedoStore.getState().undo();

    expect(useUndoRedoStore.getState().canRedo()).toBe(true);
  });

  it('should batch actions', () => {
    useUndoRedoStore.getState().batchActions([
      {
        type: 'test1',
        description: 'Test action 1',
        patches: [],
        inversePatches: [],
        state: { test1: true },
      },
      {
        type: 'test2',
        description: 'Test action 2',
        patches: [],
        inversePatches: [],
        state: { test2: true },
      },
    ]);

    expect(useUndoRedoStore.getState().history.length).toBe(2);
  });
});

describe('Cross-Tab Sync', () => {
  it('should create instance', () => {
    const sync = new useCrossTabSync();
    expect(sync).toBeDefined();
  });

  it('should check if supported', () => {
    const { isSupported } = useCrossTabSync();
    expect(typeof isSupported).toBe('boolean');
  });

  it('should broadcast message', () => {
    const { broadcast } = useCrossTabSync();
    expect(() => broadcast('test', { data: 'test' })).not.toThrow();
  });

  it('should subscribe to messages', () => {
    const { subscribe } = useCrossTabSync();
    const handler = vi.fn();
    const unsubscribe = subscribe('test', handler);

    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });
});
