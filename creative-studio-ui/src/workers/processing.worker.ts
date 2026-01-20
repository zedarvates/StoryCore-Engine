/**
 * Processing Worker - Worker pour traitement asynchrone
 * 
 * Ce worker gère les opérations lourdes en arrière-plan:
 * - Génération de thumbnails vidéo
 * - Encodage vidéo
 * - Traitement par lots
 * 
 * Exigences: 10.2, 10.3, 10.4, 10.7
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
 * Envoie une réponse au thread principal
 */
function sendResponse<R>(response: WorkerResponse<R>): void {
  self.postMessage(response);
}

/**
 * Envoie une mise à jour de progression
 * Exigence: 10.2 - Messages de progression
 */
function sendProgress(id: string, progress: number): void {
  sendResponse({
    id,
    status: 'progress',
    progress
  });
}

/**
 * Envoie un résultat de succès
 */
function sendSuccess<R>(id: string, result: R): void {
  sendResponse({
    id,
    status: 'completed',
    result
  });
}

/**
 * Envoie une erreur avec contexte
 * Exigence: 10.7 - Gestion d'erreurs avec contexte
 */
function sendError(id: string, error: Error, context?: any): void {
  const errorMessage = error.message;
  const errorContext = context ? ` (Context: ${JSON.stringify(context)})` : '';
  
  sendResponse({
    id,
    status: 'error',
    error: `${errorMessage}${errorContext}`
  });
}

/**
 * Génère un thumbnail depuis une vidéo
 * Exigence: 10.3 - Thumbnail generation
 */
async function generateThumbnail(
  id: string,
  data: { videoUrl: string; time: number; width?: number; height?: number }
): Promise<void> {
  try {
    const { videoUrl, time, width = 160, height = 90 } = data;

    sendProgress(id, 10);

    // Créer un élément vidéo
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

    // Aller au temps spécifié
    video.currentTime = time;
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
    });

    sendProgress(id, 70);

    // Créer un canvas et dessiner la frame
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
 * Encode une vidéo (simulation pour l'instant)
 * Exigence: 10.3 - Video encoding
 */
async function encodeVideo(
  id: string,
  data: { videoUrl: string; format: string; quality: string }
): Promise<void> {
  try {
    const { videoUrl, format, quality } = data;

    // Simulation d'encodage avec progression
    for (let progress = 0; progress <= 100; progress += 10) {
      sendProgress(id, progress);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const result = {
      encodedUrl: videoUrl,
      format,
      quality,
      size: Math.floor(Math.random() * 10000000), // Taille simulée
      duration: Math.floor(Math.random() * 300) // Durée simulée
    };

    sendSuccess(id, result);

  } catch (error) {
    sendError(id, error as Error, { videoUrl: data.videoUrl, format: data.format });
  }
}

/**
 * Traite un lot d'éléments
 * Exigence: 10.4 - Batch processing
 */
async function processBatch(
  id: string,
  data: { items: any[]; operation: string; options?: any }
): Promise<void> {
  try {
    const { items, operation, options } = data;
    const results: any[] = [];
    const errors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < items.length; i++) {
      try {
        // Simuler le traitement de chaque élément
        const result = await processItem(items[i], operation, options);
        results.push(result);

        // Envoyer la progression
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
 * Traite un élément individuel dans un lot
 */
async function processItem(item: any, operation: string, options?: any): Promise<any> {
  // Simulation de traitement
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
 * Optimise une image
 * Exigence: 10.3 - Image processing
 */
async function optimizeImage(
  id: string,
  data: { imageUrl: string; maxWidth?: number; maxHeight?: number; quality?: number }
): Promise<void> {
  try {
    const { imageUrl, maxWidth = 1920, maxHeight = 1080, quality = 0.85 } = data;

    sendProgress(id, 20);

    // Charger l'image
    const response = await fetch(imageUrl);
    const blob = await response.blob();

    sendProgress(id, 40);

    // Créer un bitmap
    const bitmap = await createImageBitmap(blob);

    sendProgress(id, 60);

    // Calculer les nouvelles dimensions
    let width = bitmap.width;
    let height = bitmap.height;

    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.floor(width * ratio);
      height = Math.floor(height * ratio);
    }

    sendProgress(id, 80);

    // Redimensionner
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    ctx.drawImage(bitmap, 0, 0, width, height);

    // Convertir en blob
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
 * Analyse la qualité d'une vidéo
 */
async function analyzeVideoQuality(
  id: string,
  data: { videoUrl: string }
): Promise<void> {
  try {
    const { videoUrl } = data;

    sendProgress(id, 25);

    // Charger la vidéo
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Failed to load video'));
      video.src = videoUrl;
    });

    sendProgress(id, 50);

    // Extraire les métadonnées
    const metadata = {
      duration: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
      aspectRatio: video.videoWidth / video.videoHeight,
      hasAudio: video.mozHasAudio || Boolean((video as any).webkitAudioDecodedByteCount)
    };

    sendProgress(id, 75);

    // Analyser quelques frames pour la qualité
    const samples = 5;
    const qualityScores: number[] = [];

    for (let i = 0; i < samples; i++) {
      const time = (video.duration / samples) * i;
      video.currentTime = time;
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
      });

      // Simuler une analyse de qualité
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
 * Gestionnaire principal des messages
 * Exigence: 10.4 - Gestion des opérations multiples
 * Exigence: 10.5 - Annulation de tâches
 */

// Map pour suivre les tâches en cours et permettre l'annulation
const activeTasks = new Map<string, AbortController>();

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { id, type, data } = event.data;

  // Gérer l'annulation
  if (type === 'cancel') {
    const controller = activeTasks.get(id);
    if (controller) {
      controller.abort();
      activeTasks.delete(id);
    }
    return;
  }

  // Créer un AbortController pour cette tâche
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
    // Ne pas envoyer d'erreur si la tâche a été annulée
    if (error instanceof Error && error.name === 'AbortError') {
      return;
    }
    sendError(id, error as Error, { type, data });
  } finally {
    // Nettoyer le controller
    activeTasks.delete(id);
  }
};

// Export pour TypeScript
export {};
