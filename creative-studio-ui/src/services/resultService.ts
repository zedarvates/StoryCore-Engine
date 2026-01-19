/**
 * Result Service
 * 
 * Manages fetching and displaying generated results from the backend.
 * Supports result retrieval, preview, and download functionality.
 */

import type { GenerationTask } from '../types';

export interface GeneratedResult {
  taskId: string;
  shotId: string;
  type: GenerationTask['type'];
  status: 'success' | 'failed';
  
  // Generated assets
  assets: GeneratedAsset[];
  
  // Metadata
  generatedAt: Date;
  processingTime?: number; // seconds
  
  // Quality metrics (if available)
  qualityScore?: number; // 0-100
  metrics?: Record<string, number>;
  
  // Error information (if failed)
  error?: string;
}

export interface GeneratedAsset {
  id: string;
  type: 'image' | 'video' | 'audio' | 'data';
  name: string;
  url: string;
  thumbnail?: string;
  size?: number; // bytes
  format?: string; // e.g., 'png', 'mp4', 'wav', 'json'
  dimensions?: { width: number; height: number };
  duration?: number; // seconds (for video/audio)
  metadata?: Record<string, any>;
}

export interface ResultFetchOptions {
  includeAssets?: boolean; // Include asset URLs (default: true)
  includeThumbnails?: boolean; // Include thumbnails (default: true)
  includeMetrics?: boolean; // Include quality metrics (default: false)
}

export class ResultService {
  private baseUrl: string;

  constructor(baseUrl: string = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Fetch result for a completed task
   */
  async fetchResult(taskId: string, options: ResultFetchOptions = {}): Promise<GeneratedResult> {
    const {
      includeAssets = true,
      includeThumbnails = true,
      includeMetrics = false,
    } = options;

    const params = new URLSearchParams({
      includeAssets: String(includeAssets),
      includeThumbnails: String(includeThumbnails),
      includeMetrics: String(includeMetrics),
    });

    const response = await fetch(`${this.baseUrl}/api/tasks/${taskId}/result?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch result: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      taskId: data.taskId,
      shotId: data.shotId,
      type: data.type,
      status: data.status,
      assets: data.assets || [],
      generatedAt: new Date(data.generatedAt),
      processingTime: data.processingTime,
      qualityScore: data.qualityScore,
      metrics: data.metrics,
      error: data.error,
    };
  }

  /**
   * Fetch results for multiple tasks
   */
  async fetchMultipleResults(taskIds: string[], options: ResultFetchOptions = {}): Promise<GeneratedResult[]> {
    const promises = taskIds.map((taskId) => this.fetchResult(taskId, options));
    return Promise.all(promises);
  }

  /**
   * Fetch all results for a project
   */
  async fetchProjectResults(projectName: string, options: ResultFetchOptions = {}): Promise<GeneratedResult[]> {
    const {
      includeAssets = true,
      includeThumbnails = true,
      includeMetrics = false,
    } = options;

    const params = new URLSearchParams({
      includeAssets: String(includeAssets),
      includeThumbnails: String(includeThumbnails),
      includeMetrics: String(includeMetrics),
    });

    const response = await fetch(`${this.baseUrl}/api/projects/${projectName}/results?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch project results: ${response.statusText}`);
    }

    const data = await response.json();
    
    return data.results.map((result: any) => ({
      taskId: result.taskId,
      shotId: result.shotId,
      type: result.type,
      status: result.status,
      assets: result.assets || [],
      generatedAt: new Date(result.generatedAt),
      processingTime: result.processingTime,
      qualityScore: result.qualityScore,
      metrics: result.metrics,
      error: result.error,
    }));
  }

  /**
   * Download an asset
   */
  async downloadAsset(asset: GeneratedAsset, filename?: string): Promise<void> {
    const response = await fetch(asset.url);
    
    if (!response.ok) {
      throw new Error(`Failed to download asset: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || asset.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  /**
   * Download all assets from a result
   */
  async downloadAllAssets(result: GeneratedResult): Promise<void> {
    for (const asset of result.assets) {
      await this.downloadAsset(asset);
    }
  }

  /**
   * Get preview URL for an asset
   */
  getPreviewUrl(asset: GeneratedAsset): string {
    if (asset.thumbnail) {
      return asset.thumbnail;
    }
    
    // For images, use the asset URL directly
    if (asset.type === 'image') {
      return asset.url;
    }
    
    // For other types, return a placeholder or generate thumbnail URL
    return `${this.baseUrl}/api/assets/${asset.id}/thumbnail`;
  }

  /**
   * Delete a result
   */
  async deleteResult(taskId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/tasks/${taskId}/result`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete result: ${response.statusText}`);
    }
  }
}

/**
 * Mock Result Service for development/testing
 */
export class MockResultService extends ResultService {
  private mockResults: Map<string, GeneratedResult> = new Map();
  private mockDelay: number = 500;

  setMockResult(taskId: string, result: GeneratedResult): void {
    this.mockResults.set(taskId, result);
  }

  setMockDelay(delay: number): void {
    this.mockDelay = delay;
  }

  async fetchResult(taskId: string, _options: ResultFetchOptions = {}): Promise<GeneratedResult> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, this.mockDelay));

    // Return mock result if available
    if (this.mockResults.has(taskId)) {
      return this.mockResults.get(taskId)!;
    }

    // Generate mock result
    const mockResult: GeneratedResult = {
      taskId,
      shotId: `shot-${taskId}`,
      type: 'grid',
      status: 'success',
      assets: [
        {
          id: `asset-${taskId}-1`,
          type: 'image',
          name: `generated-image-${taskId}.png`,
          url: `https://via.placeholder.com/800x600?text=Generated+Image+${taskId}`,
          thumbnail: `https://via.placeholder.com/200x150?text=Thumbnail+${taskId}`,
          size: 1024 * 500, // 500 KB
          format: 'png',
          dimensions: { width: 800, height: 600 },
        },
        {
          id: `asset-${taskId}-2`,
          type: 'data',
          name: `metadata-${taskId}.json`,
          url: `data:application/json,${encodeURIComponent(JSON.stringify({ taskId, generated: true }))}`,
          size: 256,
          format: 'json',
        },
      ],
      generatedAt: new Date(),
      processingTime: 45,
      qualityScore: 85,
      metrics: {
        sharpness: 92,
        colorBalance: 88,
        composition: 85,
      },
    };

    this.mockResults.set(taskId, mockResult);
    return mockResult;
  }

  async downloadAsset(asset: GeneratedAsset, filename?: string): Promise<void> {
    // Simulate download delay
    await new Promise((resolve) => setTimeout(resolve, this.mockDelay));
    
    console.log(`Mock download: ${filename || asset.name}`);
    
    // In a real implementation, this would trigger a download
    // For mock, we just log it
  }

  async deleteResult(taskId: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, this.mockDelay));
    this.mockResults.delete(taskId);
  }
}

/**
 * Factory function to create the appropriate service
 */
export function createResultService(useMock: boolean = false): ResultService {
  if (useMock || import.meta.env.VITE_USE_MOCK_BACKEND === 'true') {
    return new MockResultService();
  }
  return new ResultService();
}
