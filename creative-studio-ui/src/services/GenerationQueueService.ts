import { GenerationTask, GeneratedAsset } from '@/types/generation';
import { eventEmitter } from './eventEmitter';
import { logger } from '@/utils/logger';
import { generateId, generateIdWithPrefix } from '@/utils/idGenerator';

export interface QueuedGenerationTask extends GenerationTask {
  serverId?: string; // For ComfyUI routing
  pipelineId: 'comfyui-pipeline' | 'grok-pipeline';
  params: Record<string, unknown>;
  retryCount?: number;
  maxRetries?: number;
}

class GenerationQueueService {
  private queue: QueuedGenerationTask[] = [];
  private static instance: GenerationQueueService;
  private isProcessing: boolean = false;
  private currentProcessingId: string | null = null;

  private constructor() {
    this.loadFromStorage();
    // Auto-start processing if there are items in queue
    setTimeout(() => this.startProcessing(), 1000);
  }

  public static getInstance(): GenerationQueueService {
    if (!GenerationQueueService.instance) {
      GenerationQueueService.instance = new GenerationQueueService();
    }
    return GenerationQueueService.instance;
  }

  private loadFromStorage() {
    const stored = localStorage.getItem('storycore_generation_queue');
    if (stored) {
      try {
        this.queue = JSON.parse(stored);
        // Reset running status to queued on load
        this.queue.forEach(t => {
          if (t.status === 'running') t.status = 'queued';
        });
      } catch (e) {
        logger.error('Failed to load generation queue', e);
      }
    }
  }

  private saveToStorage() {
    localStorage.setItem('storycore_generation_queue', JSON.stringify(this.queue));
    eventEmitter.emit('queue:updated', { 
      queue: [...this.queue], 
      timestamp: new Date(), 
      source: 'QueueService' 
    });
  }

  public addToQueue(task: Omit<QueuedGenerationTask, 'id' | 'status' | 'progress' | 'createdAt'>): QueuedGenerationTask {
    const newTask: QueuedGenerationTask = {
      ...task,
      id: generateIdWithPrefix('task'),
      status: 'queued',
      progress: {
        stage: 'Queued',
        stageProgress: 0,
        overallProgress: 0,
        estimatedTimeRemaining: 0,
        message: 'Waiting in queue...',
        cancellable: true
      },
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: 3
    };
    
    this.queue.push(newTask);
    this.saveToStorage();
    return newTask;
  }

  public getQueue(): QueuedGenerationTask[] {
    return [...this.queue];
  }

  public moveUp(taskId: string) {
    const index = this.queue.findIndex(t => t.id === taskId);
    if (index > 0) {
      const temp = this.queue[index];
      this.queue[index] = this.queue[index - 1];
      this.queue[index - 1] = temp;
      this.saveToStorage();
    }
  }

  public moveDown(taskId: string) {
    const index = this.queue.findIndex(t => t.id === taskId);
    if (index !== -1 && index < this.queue.length - 1) {
      const temp = this.queue[index];
      this.queue[index] = this.queue[index + 1];
      this.queue[index + 1] = temp;
      this.saveToStorage();
    }
  }

  public removeTask(taskId: string) {
    this.queue = this.queue.filter(t => t.id !== taskId);
    this.saveToStorage();
  }

  public updateQueueOrder(newQueue: QueuedGenerationTask[]) {
    this.queue = newQueue;
    this.saveToStorage();
  }

  public clearCompletedTasks() {
    this.queue = this.queue.filter(t => t.status !== 'completed' && t.status !== 'failed');
    this.saveToStorage();
  }

  public retryTask(taskId: string) {
    const task = this.queue.find(t => t.id === taskId);
    if (task) {
      task.status = 'queued';
      task.retryCount = 0;
      task.error = undefined;
      this.saveToStorage();
      this.startProcessing();
    }
  }

  public updateTaskStatus(taskId: string, status: QueuedGenerationTask['status'], result?: GeneratedAsset, error?: string) {
    const task = this.queue.find(t => t.id === taskId);
    if (task) {
      if (status === 'failed' && (task.retryCount || 0) < (task.maxRetries || 3)) {
        task.retryCount = (task.retryCount || 0) + 1;
        task.status = 'queued';
        task.progress = {
          ...task.progress!,
          message: `Retrying (${task.retryCount}/${task.maxRetries})... ${error || ''}`
        };
      } else {
        const prevStatus = task.status;
        task.status = status;
        if (result) task.result = result;
        if (error) task.error = error;
        if (status === 'running') task.startedAt = Date.now();
        if (status === 'completed' || status === 'failed') {
          task.completedAt = Date.now();
          
          // Emit notification event for toasts
          if (prevStatus !== status) {
            eventEmitter.emit('generation:completed', {
              taskId: task.id,
              status: status as 'completed' | 'failed',
              type: task.type === 'image' ? 'image' : 'video',
              prompt: (task.params as Record<string, unknown>).prompt as string,
              error: error,
              assetUrl: result?.url,
              timestamp: new Date(),
              source: 'QueueService'
            });
          }
        }
      }
      this.saveToStorage();
    }
  }

  public setPriority(taskId: string, priority: number) {
    const task = this.queue.find(t => t.id === taskId);
    if (task) {
      task.priority = priority;
      this.queue.sort((a, b) => (b.priority || 0) - (a.priority || 0));
      this.saveToStorage();
    }
  }

  public startProcessing() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    this.processLoop();
  }

  public stopProcessing() {
    this.isProcessing = false;
  }

  private async processLoop() {
    while (this.isProcessing) {
      // Find next queued task
      const nextTask = this.queue.find(t => t.status === 'queued');
      
      if (!nextTask) {
        // Nothing to do, wait a bit and check again
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }

      try {
        await this.executeTask(nextTask);
      } catch (error: unknown) {
        let errorMessage = 'Network error or server unavailable';
        if (error instanceof Error) errorMessage = error.message;
        else if (typeof error === 'string') errorMessage = error;
        
        logger.error(`Error executing task ${nextTask.id}`, error);
        this.updateTaskStatus(nextTask.id, 'failed', undefined, errorMessage);
      }

      // Small delay between tasks
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  private async executeTask(task: QueuedGenerationTask) {
    this.currentProcessingId = task.id;
    this.updateTaskStatus(task.id, 'running');

    if (task.pipelineId === 'comfyui-pipeline') {
      await this.executeComfyUITask(task);
    } else if (task.pipelineId === 'grok-pipeline') {
      await this.executeGrokTask(task);
    }

    this.currentProcessingId = null;
  }

  private async executeComfyUITask(task: QueuedGenerationTask) {
    const { getComfyUIServersService } = await import('./comfyuiServersService');
    const service = getComfyUIServersService();
    const serverId = task.serverId;
    const server = serverId ? service.getServer(serverId) : service.getActiveServer();
    
    if (!server) {
      throw new Error('No ComfyUI server available for task');
    }

    const baseUrl = server.serverUrl.replace(/\/$/, '');
    const endpoint = task.type === 'image' ? 'image' : 'video';
    
    const response = await fetch(`${baseUrl}/generate/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task.params),
    });

    if (!response.ok) {
      const errorJson = await response.json();
      throw new Error(errorJson.error || `HTTP error ${response.status}`);
    }

    const { job_id } = await response.json();
    
    // Poll for status
    let completed = false;
    while (!completed && this.isProcessing) {
      const statusResponse = await fetch(`${baseUrl}/job/${job_id}`);
      const statusData = await statusResponse.json();

      if (statusData.status === 'completed') {
        completed = true;
        
        // Extract assets and log to history
        const result = statusData.result;
        if (result?.outputs) {
          const { generationHistoryService } = await import('./GenerationHistoryService');
          
          Object.values(result.outputs as Record<string, { images?: { filename: string; subfolder?: string; type?: string }[] }>).forEach((output) => {
            if (output.images) {
              output.images.forEach((img) => {
                if (img.filename) {
                  const url = `${baseUrl}/view?filename=${img.filename}&subfolder=${img.subfolder || ''}&type=${img.type || 'output'}`;
                    const asset: GeneratedAsset = {
                      id: generateId(),
                      type: task.type === 'image' ? 'image' : 'video',
                    url: url,
                    timestamp: Date.now(),
                    relatedAssets: [],
                    metadata: { 
                      format: task.type === 'image' ? 'png' : 'mp4',
                      fileSize: 0,
                      dimensions: { 
                        width: (task.params as Record<string, unknown>).width as number || 1024,
                        height: (task.params as Record<string, unknown>).height as number || 1024
                      },
                      generationParams: task.params
                    }
                  };
                  
                  generationHistoryService.logGeneration(
                    task.pipelineId,
                    task.type,
                    task.params,
                    asset
                  );
                  
                  // Update task with result
                  this.updateTaskStatus(task.id, 'completed', asset);
                }
              });
            }
          });
        } else {
          this.updateTaskStatus(task.id, 'completed');
        }
      } else if (statusData.status === 'failed') {
        throw new Error(statusData.error || 'Generation failed');
      } else {
        // Update progress if available
        if (statusData.progress) {
          const t = this.queue.find(item => item.id === task.id);
          if (t) {
            t.progress = statusData.progress;
            this.saveToStorage();
          }
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  private async executeGrokTask(task: QueuedGenerationTask) {
    const params = task.params as Record<string, unknown>;
    const response = await fetch('/api/addons/grok-imagine/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scene: {
          description: params.prompt,
          aspect_ratio: params.aspectRatio,
          style: params.quality
        },
        config_overrides: {
          model: params.model,
          enable_motion: (params.mode as string)?.includes('Video'),
          duration_seconds: params.duration === '10s' ? 10 : 6,
          concatenation_enabled: params.concatenation,
          output_count_per_prompt: params.outputCount,
          seed: params.seed
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Grok API error ${response.status}`);
    }

    const result = await response.json();
    if (result.status === 'success') {
      this.updateTaskStatus(task.id, 'completed');
    } else {
      throw new Error(result.error || 'Grok generation failed');
    }
  }
}

export const generationQueueService = GenerationQueueService.getInstance();
