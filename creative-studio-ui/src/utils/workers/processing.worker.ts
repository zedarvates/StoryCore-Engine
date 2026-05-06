/**
 * Processing Worker - handles CPU-intensive tasks off the main thread
 * Supports thumbnail generation, video processing, and batch operations
 */

interface WorkerMessage {
  type: string;
  taskId?: string;
  taskType?: string;
  data?: unknown;
  workerId?: number;
}

interface TaskResult {
  success: boolean;
  result?: unknown;
  error?: string;
}

// Worker state
let _workerId: number | undefined;

// Task handlers
const taskHandlers = {
  async thumbnail_generation(taskData: unknown): Promise<TaskResult> {
    try {
      // Simulate thumbnail generation
      // In real implementation, this would extract frames from video
      await de_lay(100); // Simulate processing time

      const { timestamp, width = 160, height = 90 } = taskData as { timestamp: number; width?: number; height?: number };

      // Mock thumbnail generation
      const thumbnail = {
        url: `thumbnail-${Date.now()}.png`,
        timestamp,
        width,
        height,
      };

      return {
        success: true,
        result: thumbnail,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  async video_processing(_taskData: unknown): Promise<TaskResult> {
    try {
      // Simulate video processing
      await de_lay(200);

      return {
        success: true,
        result: { processed: true },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  async video_encoding(taskData: unknown): Promise<TaskResult> {
    try {
      const { timestamp, width = 160, height = 90 } = taskData as { timestamp: number; width?: number; height?: number };

      // Simulate video encoding
      await delay(500);

      const encodedVideo = {
        url: `encoded-${Date.now()}.mp4`,
        timestamp,
        width,
        height,
        size: width * height * 0.8, // Mock size
      };

      return { success: true, result: encodedVideo };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Encoding failed' };
    }
  },

  async batch_processing(taskData: unknown): Promise<TaskResult> {
    try {
      const items = Array.isArray(taskData) ? taskData : [];
      const results = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // Simulate processing each item
        await delay(50);

        // Report progress
        const progress = ((i + 1) / items.length) * 100;
        self.postMessage({
          type: 'TASK_PROGRESS',
          progress,
          message: `Processing item ${i + 1}/${items.length}`
        });

        // Apply operation (mock)
        const result = { ...item, processed: true };
        results.push(result);
      }

      return { success: true, result: results };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Batch processing failed' };
    }
  }
};

// Utility functions
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function executeTask(taskId: string, taskType: string, data: unknown) {
  const handler = taskHandlers[taskType as keyof typeof taskHandlers];

  if (!handler) {
    self.postMessage({
      type: 'TASK_COMPLETE',
      taskId,
      success: false,
      error: `Unknown task type: ${taskType}`
    });
    return;
  }

  try {
    const result = await handler(data);

    self.postMessage({
      type: 'TASK_COMPLETE',
      taskId,
      success: result.success,
      result: result.result,
      error: result.error
    });
  } catch (error) {
    self.postMessage({
      type: 'TASK_COMPLETE',
      taskId,
      success: false,
      error: error instanceof Error ? error.message : 'Task execution failed'
    });
  }
}

// Message handler
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, taskId, taskType, data, workerId: msgWorkerId } = event.data;

  switch (type) {
    case 'INIT':
      workerId = msgWorkerId!;
      self.postMessage({ type: 'WORKER_READY' });
      break;

    case 'EXECUTE_TASK':
      if (taskId && taskType) {
        await executeTask(taskId, taskType, data);
      }
      break;

    default:
      console.warn('Unknown message type:', type);
  }
};

// Handle unhandled errors
self.onerror = (error) => {
  console.error('Worker unhandled error:', error);
};

self.onunhandledrejection = (event) => {
  console.error('Worker unhandled rejection:', event.reason);
  event.preventDefault();
};
