/**
 * Processing Worker - Worker for async processing
 * 
 * This worker handles heavy background operations:
 * - Video thumbnail generation
 * - Video encoding
 * - Batch processing
 * 
 * Requirements: 10.2, 10.3, 10.4, 10.7
 */

interface WorkerMessage<T = any> {
  id: string;
  type: string;
  data: T;
}

interface WorkerResponse<R = any> {
  id: string;
  status: 'completed' | 'error' | 'progress';
  result?: R;
  error?: string;
  progress?: number;
}

/**
 * Sends a response to the main thread
 */
function sendResponse<R>(response: WorkerResponse<R>): void {
  self.postMessage(response);
}

/**
 * Sends a progress update
 * Requirement: 10.2 - Progress messages
 */
function sendProgress(id: string, progress: number): void {
  sendResponse({
    id,
    status: 'progress',
    progress
  });
}

/**
 * Sends a success result
 */
function sendSuccess<R>(id: string, result: R): void {
  sendResponse({
    id,
    status: 'completed',
    result
  });
}

/**
 * Sends an error with context
 * Requirement: 10.7 - Error handling with context
 */
function sendError(id: string, error: Error, context?: unknown): void {
  const errorMessage = error.message;
  const errorContext = context ? ` (Context: ${JSON.stringify(context)})` : '';
  
  sendResponse({
    id,
    status: 'error',
    error: `${errorMessage}${errorContext}`
  });
}

/**
 * Generates a thumbnail from a video
 * Requirement: 10.3 - Thumbnail generation
 */
async function generateThumbnail(
  id: string,
  data: { videoUrl: string; time: number; width?: number; height?: number }
): Promise<void> {
  try {
    const { videoUrl, time, width = 160, height = 90 } = data;

    sendProgress(id, 10);

    // Create video element
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';

    sendProgress(id, 30);

    // Charger la vidéo
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Failed to load video'));
      video.src = videoUrl;
    });

    sendProgress(id, 50);

    // Seek to specified time
    video.currentTime = time;
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
    });

    sendProgress(id, 70);

    // Create canvas and draw frame
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    ctx.drawImage(video, 0, 0, width, height);

    sendProgress(id, 90);

    // Convertir en blob
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 });

    sendProgress(id, 100);
    sendSuccess(id, blob);

  } catch (error) {
    sendError(id, error as Error, { videoUrl: data.videoUrl, time: data.time });
  }
}

/**
 * Encodes a video (simulation for now)
 * Requirement: 10.3 - Video encoding
 */
async function encodeVideo(
  id: string,
  data: { videoUrl: string; format: string; quality: string }
): Promise<void> {
  try {
    const { videoUrl, format, quality } = data;

    // Encoding simulation with progress
    for (let progress = 0; progress <= 100; progress += 10) {
      sendProgress(id, progress);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const result = {
      encodedUrl: videoUrl,
      format,
      quality,
      size: Math.floor(Math.random() * 10000000), // Simulated size
      duration: Math.floor(Math.random() * 300) // Simulated duration
    };

    sendSuccess(id, result);

  } catch (error) {
    sendError(id, error as Error, { videoUrl: data.videoUrl, format: data.format });
  }
}

/**
 * Processes a batch of items
 * Requirement: 10.4 - Batch processing
 */
async function processBatch(
  id: string,
  data: { items: unknown[]; operation: string; options?: unknown }
): Promise<void> {
  try {
    const { items, operation, options } = data;
    const results: unknown[] = [];
    const errors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < items.length; i++) {
      try {
        // Simulate processing of each item
        const result = await processItem(items[i], operation, options);
        results.push(result);

        // Send progress
        const progress = ((i + 1) / items.length) * 100;
        sendProgress(id, progress);

      } catch (error) {
        errors.push({
          index: i,
          error: (error as Error).message
        });
      }
    }

    sendSuccess(id, { results, errors });

  } catch (error) {
    sendError(id, error as Error, { itemCount: data.items.length, operation: data.operation });
  }
}

/**
 * Processes a single item in a batch
 */
async function processItem(item: unknown, operation: string, options?: unknown): Promise<any> {
  // Processing simulation
  await new Promise(resolve => setTimeout(resolve, 50));

  switch (operation) {
    case 'duplicate':
      return { ...item, id: `${item.id}_copy` };
    case 'transform':
      return { ...item, ...options };
    case 'export':
      return { ...item, exported: true };
    default:
      return item;
  }
}

/**
 * Optimizes an image
 * Requirement: 10.3 - Image processing
 */
async function optimizeImage(
  id: string,
  data: { imageUrl: string; maxWidth?: number; maxHeight?: number; quality?: number }
): Promise<void> {
  try {
    const { imageUrl, maxWidth = 1920, maxHeight = 1080, quality = 0.85 } = data;

    sendProgress(id, 20);

    // Load image
    const response = await fetch(imageUrl);
    const blob = await response.blob();

    sendProgress(id, 40);

    // Create bitmap
    const bitmap = await createImageBitmap(blob);

    sendProgress(id, 60);

    // Calculate new dimensions
    let width = bitmap.width;
    let height = bitmap.height;

    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.floor(width * ratio);
      height = Math.floor(height * ratio);
    }

    sendProgress(id, 80);

    // Resize
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    ctx.drawImage(bitmap, 0, 0, width, height);

    // Convert to blob
    const optimizedBlob = await canvas.convertToBlob({
      type: 'image/jpeg',
      quality
    });

    sendProgress(id, 100);
    sendSuccess(id, optimizedBlob);

  } catch (error) {
    sendError(id, error as Error, { imageUrl: data.imageUrl });
  }
}

/**
 * Analyzes video quality
 */
async function analyzeVideoQuality(
  id: string,
  data: { videoUrl: string }
): Promise<void> {
  try {
    const { videoUrl } = data;

    sendProgress(id, 25);

    // Load video
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Failed to load video'));
      video.src = videoUrl;
    });

    sendProgress(id, 50);

    // Extract metadata
    const metadata = {
      duration: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
      aspectRatio: video.videoWidth / video.videoHeight,
      hasAudio: video.mozHasAudio || Boolean((video as any).webkitAudioDecodedByteCount)
    };

    sendProgress(id, 75);

    // Analyze frames for quality
    const samples = 5;
    const qualityScores: number[] = [];

    for (let i = 0; i < samples; i++) {
      const time = (video.duration / samples) * i;
      video.currentTime = time;
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
      });

      // Simulate quality analysis
      qualityScores.push(Math.random() * 100);
    }

    const averageQuality = qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length;

    sendProgress(id, 100);

    sendSuccess(id, {
      ...metadata,
      qualityScore: averageQuality,
      qualityScores
    });

  } catch (error) {
    sendError(id, error as Error, { videoUrl: data.videoUrl });
  }
}

/**
 * Main message handler
 * Requirement: 10.4 - Multiple operations handling
 * Requirement: 10.5 - Task cancellation
 */

// Map to track ongoing tasks and enable cancellation
const activeTasks = new Map<string, AbortController>();

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { id, type, data } = event.data;

  // Handle cancellation
  if (type === 'cancel') {
    const controller = activeTasks.get(id);
    if (controller) {
      controller.abort();
      activeTasks.delete(id);
    }
    return;
  }

  // Create AbortController for this task
  const abortController = new AbortController();
  activeTasks.set(id, abortController);

  try {
    switch (type) {
      case 'generateThumbnail':
        await generateThumbnail(id, data);
        break;

      case 'encodeVideo':
        await encodeVideo(id, data);
        break;

      case 'processBatch':
        await processBatch(id, data);
        break;

      case 'optimizeImage':
        await optimizeImage(id, data);
        break;

      case 'analyzeVideoQuality':
        await analyzeVideoQuality(id, data);
        break;

      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
  } catch (error) {
    // Do not send error if task was cancelled
    if (error instanceof Error && error.name === 'AbortError') {
      return;
    }
    sendError(id, error as Error, { type, data });
  } finally {
    // Cleanup controller
    activeTasks.delete(id);
  }
};

// Export pour TypeScript
export {};



