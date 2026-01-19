/**
 * Integration tests for backend communication
 * Tests project export, task submission, and progress tracking
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { useStore } from '@/store';
import {
  saveProjectToJSON,
  loadProjectFromJSON,
  validateProject,
} from '@/utils/projectManager';
import type { Project, Shot } from '@/types';

describe('Backend Communication Integration', () => {
  beforeEach(() => {
    useStore.setState({
      project: null,
      shots: [],
      assets: [],
      taskQueue: [],
      generationStatus: {
        isGenerating: false,
        progress: 0,
      },
    });
  });

  describe('Project Export', () => {
    it('should export project to valid JSON format', async () => {
      const project: Project = {
        schema_version: '1.0',
        project_name: 'Test Project',
        shots: [
          {
            id: 'shot-1',
            title: 'Opening Scene',
            description: 'First shot',
            duration: 5,
            audioTracks: [],
            effects: [],
            textLayers: [],
            animations: [],
            position: 0,
          },
        ],
        assets: [
          {
            id: 'asset-1',
            name: 'Background',
            type: 'image',
            url: '/bg.jpg',
          },
        ],
        capabilities: {
          grid_generation: true,
          promotion_engine: true,
          qa_engine: true,
          autofix_engine: true,
        },
        generation_status: {
          grid: 'pending',
          promotion: 'pending',
        },
      };

      useStore.setState({ project });

      const json = saveProjectToJSON(project);
      const parsed = JSON.parse(json);

      expect(parsed.schema_version).toBe('1.0');
      expect(parsed.project_name).toBe('Test Project');
      expect(parsed.shots.length).toBe(1);
      expect(parsed.assets.length).toBe(1);
    });

    it('should validate exported project against schema', async () => {
      const project: Project = {
        schema_version: '1.0',
        project_name: 'Valid Project',
        shots: [],
        assets: [],
        capabilities: {
          grid_generation: true,
          promotion_engine: true,
          qa_engine: true,
          autofix_engine: true,
        },
        generation_status: {
          grid: 'pending',
          promotion: 'pending',
        },
      };

      const json = saveProjectToJSON(project);
      const parsed = JSON.parse(json);

      expect(validateProject(parsed)).toBe(true);
    });

    it('should preserve all shot metadata in export', async () => {
      const shot: Shot = {
        id: 'shot-1',
        title: 'Complex Shot',
        description: 'Shot with all features',
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
            fadeIn: 0.5,
            fadeOut: 1.0,
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

      const project: Project = {
        schema_version: '1.0',
        project_name: 'Test',
        shots: [shot],
        assets: [],
        capabilities: {
          grid_generation: true,
          promotion_engine: true,
          qa_engine: true,
          autofix_engine: true,
        },
        generation_status: {
          grid: 'pending',
          promotion: 'pending',
        },
      };

      const json = saveProjectToJSON(project);
      const loaded = loadProjectFromJSON(json);

      expect(loaded.shots[0].audioTracks.length).toBe(1);
      expect(loaded.shots[0].effects.length).toBe(1);
      expect(loaded.shots[0].textLayers.length).toBe(1);
      expect(loaded.shots[0].transitionOut).toBeDefined();
    });
  });

  describe('Project Import', () => {
    it('should load project from valid JSON', async () => {
      const projectData = {
        schema_version: '1.0',
        project_name: 'Imported Project',
        shots: [
          {
            id: 'shot-1',
            title: 'Shot 1',
            description: 'Test',
            duration: 5,
            position: 0,
            metadata: {
              audioTracks: [],
              effects: [],
              textLayers: [],
              animations: [],
            },
          },
        ],
        assets: [],
        capabilities: {
          grid_generation: true,
          promotion_engine: true,
          qa_engine: true,
          autofix_engine: true,
        },
        generation_status: {
          grid: 'pending',
          promotion: 'pending',
        },
      };

      const json = JSON.stringify(projectData);
      const loaded = loadProjectFromJSON(json);

      expect(loaded.project_name).toBe('Imported Project');
      expect(loaded.shots.length).toBe(1);
      expect(loaded.shots[0].title).toBe('Shot 1');
    });

    it('should throw error for invalid JSON', async () => {
      expect(() => loadProjectFromJSON('invalid json')).toThrow();
    });

    it('should throw error for invalid project format', async () => {
      const invalidProject = {
        name: 'Invalid',
        // Missing required fields
      };

      const json = JSON.stringify(invalidProject);

      expect(() => loadProjectFromJSON(json)).toThrow('Invalid project format');
    });
  });

  describe('Task Submission', () => {
    it('should add generation task to queue', async () => {
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
        expect(useStore.getState().taskQueue[0].type).toBe('grid');
      });
    });

    it('should update task status during processing', async () => {
      const task = {
        id: 'task-1',
        shotId: 'shot-1',
        type: 'grid' as const,
        status: 'pending' as const,
        priority: 1,
        createdAt: new Date(),
      };

      useStore.getState().addTask(task);

      // Simulate backend processing
      useStore.getState().updateTask('task-1', {
        status: 'processing',
        startedAt: new Date(),
      });

      await waitFor(() => {
        const updatedTask = useStore.getState().taskQueue.find((t) => t.id === 'task-1');
        expect(updatedTask?.status).toBe('processing');
        expect(updatedTask?.startedAt).toBeDefined();
      });
    });

    it('should mark task as completed', async () => {
      const task = {
        id: 'task-1',
        shotId: 'shot-1',
        type: 'grid' as const,
        status: 'pending' as const,
        priority: 1,
        createdAt: new Date(),
      };

      useStore.getState().addTask(task);

      useStore.getState().updateTask('task-1', {
        status: 'completed',
        completedAt: new Date(),
      });

      await waitFor(() => {
        const updatedTask = useStore.getState().taskQueue.find((t) => t.id === 'task-1');
        expect(updatedTask?.status).toBe('completed');
        expect(updatedTask?.completedAt).toBeDefined();
      });
    });

    it('should handle task failure', async () => {
      const task = {
        id: 'task-1',
        shotId: 'shot-1',
        type: 'grid' as const,
        status: 'pending' as const,
        priority: 1,
        createdAt: new Date(),
      };

      useStore.getState().addTask(task);

      useStore.getState().updateTask('task-1', {
        status: 'failed',
        error: 'Backend error occurred',
      });

      await waitFor(() => {
        const updatedTask = useStore.getState().taskQueue.find((t) => t.id === 'task-1');
        expect(updatedTask?.status).toBe('failed');
        expect(updatedTask?.error).toBe('Backend error occurred');
      });
    });
  });

  describe('Progress Tracking', () => {
    it('should track generation progress', async () => {
      useStore.setState({
        generationStatus: {
          isGenerating: true,
          progress: 0,
        },
      });

      // Simulate progress updates
      useStore.setState({
        generationStatus: {
          isGenerating: true,
          progress: 50,
        },
      });

      await waitFor(() => {
        expect(useStore.getState().generationStatus.progress).toBe(50);
      });

      useStore.setState({
        generationStatus: {
          isGenerating: false,
          progress: 100,
        },
      });

      await waitFor(() => {
        expect(useStore.getState().generationStatus.isGenerating).toBe(false);
        expect(useStore.getState().generationStatus.progress).toBe(100);
      });
    });

    it('should handle multiple tasks in queue', async () => {
      const tasks = [
        {
          id: 'task-1',
          shotId: 'shot-1',
          type: 'grid' as const,
          status: 'pending' as const,
          priority: 1,
          createdAt: new Date(),
        },
        {
          id: 'task-2',
          shotId: 'shot-2',
          type: 'promotion' as const,
          status: 'pending' as const,
          priority: 2,
          createdAt: new Date(),
        },
        {
          id: 'task-3',
          shotId: 'shot-3',
          type: 'qa' as const,
          status: 'pending' as const,
          priority: 3,
          createdAt: new Date(),
        },
      ];

      tasks.forEach((task) => useStore.getState().addTask(task));

      await waitFor(() => {
        expect(useStore.getState().taskQueue.length).toBe(3);
      });

      // Process tasks sequentially
      useStore.getState().updateTask('task-1', { status: 'completed' });
      useStore.getState().updateTask('task-2', { status: 'processing' });

      await waitFor(() => {
        const queue = useStore.getState().taskQueue;
        expect(queue.find((t) => t.id === 'task-1')?.status).toBe('completed');
        expect(queue.find((t) => t.id === 'task-2')?.status).toBe('processing');
        expect(queue.find((t) => t.id === 'task-3')?.status).toBe('pending');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Simulate network error
      const task = {
        id: 'task-1',
        shotId: 'shot-1',
        type: 'grid' as const,
        status: 'pending' as const,
        priority: 1,
        createdAt: new Date(),
      };

      useStore.getState().addTask(task);

      useStore.getState().updateTask('task-1', {
        status: 'failed',
        error: 'Network error: Failed to connect to backend',
      });

      await waitFor(() => {
        const failedTask = useStore.getState().taskQueue.find((t) => t.id === 'task-1');
        expect(failedTask?.status).toBe('failed');
        expect(failedTask?.error).toContain('Network error');
      });
    });

    it('should maintain app stability after backend errors', async () => {
      const task = {
        id: 'task-1',
        shotId: 'shot-1',
        type: 'grid' as const,
        status: 'pending' as const,
        priority: 1,
        createdAt: new Date(),
      };

      useStore.getState().addTask(task);

      // Simulate error
      useStore.getState().updateTask('task-1', {
        status: 'failed',
        error: 'Backend error',
      });

      // App should still be functional
      const newTask = {
        id: 'task-2',
        shotId: 'shot-2',
        type: 'promotion' as const,
        status: 'pending' as const,
        priority: 2,
        createdAt: new Date(),
      };

      useStore.getState().addTask(newTask);

      await waitFor(() => {
        expect(useStore.getState().taskQueue.length).toBe(2);
      });
    });
  });

  describe('Data Contract Compliance', () => {
    it('should generate Data Contract v1 compliant JSON', async () => {
      const project: Project = {
        schema_version: '1.0',
        project_name: 'Compliant Project',
        shots: [],
        assets: [],
        capabilities: {
          grid_generation: true,
          promotion_engine: true,
          qa_engine: true,
          autofix_engine: true,
        },
        generation_status: {
          grid: 'pending',
          promotion: 'pending',
        },
      };

      const json = saveProjectToJSON(project);
      const parsed = JSON.parse(json);

      // Verify required fields
      expect(parsed).toHaveProperty('schema_version');
      expect(parsed).toHaveProperty('project_name');
      expect(parsed).toHaveProperty('shots');
      expect(parsed).toHaveProperty('assets');
      expect(parsed).toHaveProperty('capabilities');
      expect(parsed).toHaveProperty('generation_status');

      // Verify capabilities structure
      expect(parsed.capabilities).toHaveProperty('grid_generation');
      expect(parsed.capabilities).toHaveProperty('promotion_engine');
      expect(parsed.capabilities).toHaveProperty('qa_engine');
      expect(parsed.capabilities).toHaveProperty('autofix_engine');

      // Verify generation_status structure
      expect(parsed.generation_status).toHaveProperty('grid');
      expect(parsed.generation_status).toHaveProperty('promotion');
    });

    it('should validate generation status values', async () => {
      const validStatuses = ['pending', 'done', 'failed', 'passed'];

      const project: Project = {
        schema_version: '1.0',
        project_name: 'Test',
        shots: [],
        assets: [],
        capabilities: {
          grid_generation: true,
          promotion_engine: true,
          qa_engine: true,
          autofix_engine: true,
        },
        generation_status: {
          grid: 'done',
          promotion: 'passed',
        },
      };

      const json = saveProjectToJSON(project);
      const parsed = JSON.parse(json);

      expect(validStatuses).toContain(parsed.generation_status.grid);
      expect(validStatuses).toContain(parsed.generation_status.promotion);
    });
  });
});
