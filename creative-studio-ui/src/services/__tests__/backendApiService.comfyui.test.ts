/**
 * Tests for Backend API Service - ComfyUI Integration
 * 
 * Validates Requirements: 7.4, 4.6
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BackendApiService,
  MockBackendApiService,
  type ComfyUIWorkflowRequest,
} from '../backendApiService';
import { getDefaultComfyUIConfig, type ComfyUIConfig } from '../comfyuiService';
import type { Project, GenerationTask } from '@/types';

// Mock fetch
global.fetch = vi.fn();

describe('BackendApiService - ComfyUI Integration', () => {
  let apiService: BackendApiService;
  let comfyuiConfig: ComfyUIConfig;
  let mockProject: Project;
  let mockTask: GenerationTask;

  beforeEach(() => {
    apiService = new BackendApiService({
      baseUrl: 'http://test-api.com',
      timeout: 5000,
      retryAttempts: 2,
    });

    comfyuiConfig = {
      ...getDefaultComfyUIConfig(),
      serverUrl: 'http://localhost:8188',
      workflows: {
        imageGeneration: 'workflow-image-1',
        videoGeneration: 'workflow-video-1',
        upscaling: 'workflow-upscale-1',
        inpainting: 'workflow-inpaint-1',
      },
      models: {
        preferredCheckpoint: 'sd15-base',
        preferredVAE: 'vae-ft-mse',
        preferredLora: ['lora-detail'],
      },
      connectionStatus: 'connected',
    };

    mockProject = {
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
        grid: 'pending',
        promotion: 'pending',
      },
    };

    mockTask = {
      id: 'task-1',
      shotId: 'shot-1',
      type: 'image',
      status: 'pending',
      priority: 1,
      createdAt: new Date(),
      prompt: 'A beautiful landscape',
      negativePrompt: 'blurry, low quality',
      width: 512,
      height: 512,
      seed: 42,
      steps: 20,
      cfgScale: 7.0,
      sampler: 'euler',
      scheduler: 'normal',
    };

    vi.clearAllMocks();
  });

  describe('ComfyUI Configuration', () => {
    it('should update ComfyUI configuration', () => {
      apiService.updateComfyUIConfig(comfyuiConfig);

      const config = apiService.getComfyUIConfig();

      expect(config).toEqual(comfyuiConfig);
      expect(config?.serverUrl).toBe('http://localhost:8188');
    });

    it('should get ComfyUI configuration', () => {
      apiService.updateComfyUIConfig(comfyuiConfig);

      const config = apiService.getComfyUIConfig();

      expect(config).toBeDefined();
      expect(config?.workflows.imageGeneration).toBe('workflow-image-1');
    });

    it('should return undefined when ComfyUI not configured', () => {
      const config = apiService.getComfyUIConfig();

      expect(config).toBeUndefined();
    });
  });

  describe('submitComfyUIWorkflow', () => {
    it('should submit workflow successfully', async () => {
      apiService.updateComfyUIConfig(comfyuiConfig);

      const mockResponse = {
        promptId: 'prompt-123',
        status: 'queued',
        queuePosition: 2,
        message: 'Workflow queued',
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const workflow: ComfyUIWorkflowRequest = {
        workflowId: 'workflow-image-1',
        inputs: {
          prompt: 'A beautiful landscape',
          width: 512,
          height: 512,
        },
        config: {
          checkpoint: 'sd15-base',
          vae: 'vae-ft-mse',
          loras: ['lora-detail'],
        },
      };

      const result = await apiService.submitComfyUIWorkflow(workflow);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-api.com/api/comfyui/workflow',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('workflow-image-1'),
        })
      );
    });

    it('should fail when ComfyUI not configured', async () => {
      const workflow: ComfyUIWorkflowRequest = {
        workflowId: 'workflow-image-1',
        inputs: {},
      };

      const result = await apiService.submitComfyUIWorkflow(workflow);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
    });

    it('should handle API error response', async () => {
      apiService.updateComfyUIConfig(comfyuiConfig);

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Workflow not found' }),
      });

      const workflow: ComfyUIWorkflowRequest = {
        workflowId: 'invalid-workflow',
        inputs: {},
      };

      const result = await apiService.submitComfyUIWorkflow(workflow);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Workflow not found');
    });

    it('should handle network error', async () => {
      apiService.updateComfyUIConfig(comfyuiConfig);

      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error')
      );

      const workflow: ComfyUIWorkflowRequest = {
        workflowId: 'workflow-image-1',
        inputs: {},
      };

      const result = await apiService.submitComfyUIWorkflow(workflow);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('getComfyUIStatus', () => {
    it('should get workflow status successfully', async () => {
      apiService.updateComfyUIConfig(comfyuiConfig);

      const mockStatus = {
        promptId: 'prompt-123',
        status: 'running',
        progress: 50,
        currentNode: 'KSampler',
        totalNodes: 15,
        completedNodes: 7,
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatus,
      });

      const result = await apiService.getComfyUIStatus('prompt-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStatus);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-api.com/api/comfyui/status/prompt-123',
        expect.any(Object)
      );
    });

    it('should fail when ComfyUI not configured', async () => {
      const result = await apiService.getComfyUIStatus('prompt-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
    });

    it('should handle completed workflow with outputs', async () => {
      apiService.updateComfyUIConfig(comfyuiConfig);

      const mockStatus = {
        promptId: 'prompt-123',
        status: 'completed',
        progress: 100,
        outputs: [
          {
            type: 'image',
            url: '/outputs/image_00001.png',
            filename: 'image_00001.png',
          },
        ],
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatus,
      });

      const result = await apiService.getComfyUIStatus('prompt-123');

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('completed');
      expect(result.data?.outputs).toHaveLength(1);
      expect(result.data?.outputs?.[0].type).toBe('image');
    });

    it('should handle failed workflow with error', async () => {
      apiService.updateComfyUIConfig(comfyuiConfig);

      const mockStatus = {
        promptId: 'prompt-123',
        status: 'failed',
        progress: 45,
        error: 'Out of memory',
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatus,
      });

      const result = await apiService.getComfyUIStatus('prompt-123');

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('failed');
      expect(result.data?.error).toBe('Out of memory');
    });
  });

  describe('cancelComfyUIWorkflow', () => {
    it('should cancel workflow successfully', async () => {
      apiService.updateComfyUIConfig(comfyuiConfig);

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const result = await apiService.cancelComfyUIWorkflow('prompt-123');

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-api.com/api/comfyui/cancel/prompt-123',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should fail when ComfyUI not configured', async () => {
      const result = await apiService.cancelComfyUIWorkflow('prompt-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
    });

    it('should handle cancellation error', async () => {
      apiService.updateComfyUIConfig(comfyuiConfig);

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Workflow already completed' }),
      });

      const result = await apiService.cancelComfyUIWorkflow('prompt-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Workflow already completed');
    });
  });

  describe('getComfyUIQueue', () => {
    it('should get queue status successfully', async () => {
      apiService.updateComfyUIConfig(comfyuiConfig);

      const mockQueue = {
        pending: 3,
        running: 1,
        queue: [
          { promptId: 'prompt-1', position: 0 },
          { promptId: 'prompt-2', position: 1 },
          { promptId: 'prompt-3', position: 2 },
        ],
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockQueue,
      });

      const result = await apiService.getComfyUIQueue();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockQueue);
      expect(result.data?.pending).toBe(3);
      expect(result.data?.running).toBe(1);
      expect(result.data?.queue).toHaveLength(3);
    });

    it('should fail when ComfyUI not configured', async () => {
      const result = await apiService.getComfyUIQueue();

      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
    });
  });

  describe('executeTaskWithComfyUI', () => {
    it('should execute image generation task', async () => {
      apiService.updateComfyUIConfig(comfyuiConfig);

      const mockResponse = {
        promptId: 'prompt-task-1',
        status: 'queued',
        queuePosition: 0,
        message: 'Task submitted',
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await apiService.executeTaskWithComfyUI(mockTask, mockProject);

      expect(result.success).toBe(true);
      expect(result.data?.promptId).toBe('prompt-task-1');
      
      // Verify workflow ID selection
      const callBody = JSON.parse(
        (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body
      );
      expect(callBody.workflow.workflowId).toBe('workflow-image-1');
    });

    it('should execute video generation task', async () => {
      apiService.updateComfyUIConfig(comfyuiConfig);

      const videoTask: GenerationTask = {
        ...mockTask,
        type: 'video',
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ promptId: 'prompt-video' }),
      });

      const result = await apiService.executeTaskWithComfyUI(videoTask, mockProject);

      expect(result.success).toBe(true);
      
      const callBody = JSON.parse(
        (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body
      );
      expect(callBody.workflow.workflowId).toBe('workflow-video-1');
    });

    it('should execute upscaling task', async () => {
      apiService.updateComfyUIConfig(comfyuiConfig);

      const upscaleTask: GenerationTask = {
        ...mockTask,
        type: 'upscale',
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ promptId: 'prompt-upscale' }),
      });

      const result = await apiService.executeTaskWithComfyUI(upscaleTask, mockProject);

      expect(result.success).toBe(true);
      
      const callBody = JSON.parse(
        (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body
      );
      expect(callBody.workflow.workflowId).toBe('workflow-upscale-1');
    });

    it('should execute inpainting task', async () => {
      apiService.updateComfyUIConfig(comfyuiConfig);

      const inpaintTask: GenerationTask = {
        ...mockTask,
        type: 'inpaint',
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ promptId: 'prompt-inpaint' }),
      });

      const result = await apiService.executeTaskWithComfyUI(inpaintTask, mockProject);

      expect(result.success).toBe(true);
      
      const callBody = JSON.parse(
        (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body
      );
      expect(callBody.workflow.workflowId).toBe('workflow-inpaint-1');
    });

    it('should include task parameters in workflow inputs', async () => {
      apiService.updateComfyUIConfig(comfyuiConfig);

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ promptId: 'prompt-123' }),
      });

      await apiService.executeTaskWithComfyUI(mockTask, mockProject);

      const callBody = JSON.parse(
        (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body
      );
      
      expect(callBody.workflow.inputs.prompt).toBe('A beautiful landscape');
      expect(callBody.workflow.inputs.negative_prompt).toBe('blurry, low quality');
      expect(callBody.workflow.inputs.width).toBe(512);
      expect(callBody.workflow.inputs.height).toBe(512);
      expect(callBody.workflow.inputs.seed).toBe(42);
      expect(callBody.workflow.inputs.steps).toBe(20);
      expect(callBody.workflow.inputs.cfg_scale).toBe(7.0);
    });

    it('should include preferred models in workflow config', async () => {
      apiService.updateComfyUIConfig(comfyuiConfig);

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ promptId: 'prompt-123' }),
      });

      await apiService.executeTaskWithComfyUI(mockTask, mockProject);

      const callBody = JSON.parse(
        (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body
      );
      
      expect(callBody.workflow.config.checkpoint).toBe('sd15-base');
      expect(callBody.workflow.config.vae).toBe('vae-ft-mse');
      expect(callBody.workflow.config.loras).toEqual(['lora-detail']);
    });

    it('should fail when ComfyUI not configured', async () => {
      const result = await apiService.executeTaskWithComfyUI(mockTask, mockProject);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
    });

    it('should fail when no workflow configured for task type', async () => {
      const incompleteConfig = {
        ...comfyuiConfig,
        workflows: {
          imageGeneration: '',
          videoGeneration: '',
          upscaling: '',
          inpainting: '',
        },
      };

      apiService.updateComfyUIConfig(incompleteConfig);

      const result = await apiService.executeTaskWithComfyUI(mockTask, mockProject);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No ComfyUI workflow configured');
    });
  });

  describe('subscribeToComfyUIUpdates', () => {
    it('should fail when ComfyUI not configured', () => {
      const onUpdate = vi.fn();
      const onError = vi.fn();

      const cleanup = apiService.subscribeToComfyUIUpdates(
        'prompt-123',
        onUpdate,
        onError
      );

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('not configured'),
        })
      );

      cleanup();
    });

    // Note: Real-time SSE testing requires more complex setup
    // These would be tested in integration tests with actual EventSource
  });
});

describe('MockBackendApiService - ComfyUI Integration', () => {
  let mockService: MockBackendApiService;
  let mockProject: Project;
  let mockTask: GenerationTask;

  beforeEach(() => {
    mockService = new MockBackendApiService();
    mockService.setMockDelay(10);

    mockProject = {
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
        grid: 'pending',
        promotion: 'pending',
      },
    };

    mockTask = {
      id: 'task-1',
      shotId: 'shot-1',
      type: 'image',
      status: 'pending',
      priority: 1,
      createdAt: new Date(),
      prompt: 'A beautiful landscape',
    };
  });

  it('should submit ComfyUI workflow with mock response', async () => {
    const workflow: ComfyUIWorkflowRequest = {
      workflowId: 'workflow-image-1',
      inputs: { prompt: 'test' },
    };

    const result = await mockService.submitComfyUIWorkflow(workflow);

    expect(result.success).toBe(true);
    expect(result.data?.promptId).toBeDefined();
    expect(result.data?.status).toBe('queued');
    expect(result.data?.queuePosition).toBeGreaterThanOrEqual(0);
  });

  it('should get ComfyUI status with mock data', async () => {
    const result = await mockService.getComfyUIStatus('prompt-123');

    expect(result.success).toBe(true);
    expect(result.data?.promptId).toBe('prompt-123');
    expect(result.data?.progress).toBeGreaterThanOrEqual(0);
    expect(result.data?.progress).toBeLessThanOrEqual(100);
    expect(['queued', 'running', 'completed']).toContain(result.data?.status);
  });

  it('should cancel ComfyUI workflow successfully', async () => {
    const result = await mockService.cancelComfyUIWorkflow('prompt-123');

    expect(result.success).toBe(true);
  });

  it('should get ComfyUI queue with mock data', async () => {
    const result = await mockService.getComfyUIQueue();

    expect(result.success).toBe(true);
    expect(result.data?.pending).toBeGreaterThanOrEqual(0);
    expect(result.data?.running).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.data?.queue)).toBe(true);
  });

  it('should execute task with ComfyUI mock', async () => {
    const result = await mockService.executeTaskWithComfyUI(mockTask, mockProject);

    expect(result.success).toBe(true);
    expect(result.data?.promptId).toContain('prompt-');
    expect(result.data?.status).toBe('queued');
  });

  it('should provide real-time updates via subscription', async () => {
    const updates: number[] = [];
    
    const updatePromise = new Promise<void>((resolve) => {
      const cleanup = mockService.subscribeToComfyUIUpdates(
        'prompt-123',
        (update) => {
          updates.push(update.progress);
          
          if (update.status === 'completed') {
            expect(update.progress).toBe(100);
            expect(update.outputs).toBeDefined();
            expect(update.outputs).toHaveLength(1);
            cleanup();
            resolve();
          }
        }
      );
    });

    await updatePromise;
  });
});
