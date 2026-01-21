/**
 * Result Service
 * Provides functionality for fetching and managing generated results
 */

export interface GeneratedAsset {
  id: string;
  type: 'image' | 'video' | 'audio' | 'data';
  name: string;
  url: string;
  thumbnail?: string;
  size?: number;
  format?: string;
  dimensions?: { width: number; height: number };
  duration?: number;
  metadata?: Record<string, any>;
}

export interface GeneratedResult {
  taskId: string;
  shotId: string;
  type: 'grid' | 'promotion' | 'refine' | 'qa';
  status: 'success' | 'failed';
  assets: GeneratedAsset[];
  generatedAt: Date;
  processingTime?: number;
  qualityScore?: number;
  metrics?: Record<string, number>;
  error?: string;
}

export interface ResultFetchOptions {
  includeAssets?: boolean;
  includeThumbnails?: boolean;
  includeMetrics?: boolean;
}

export class ResultService {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  async fetchResult(taskId: string, options: ResultFetchOptions = {}): Promise<GeneratedResult | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tasks/${taskId}/result`);
      if (!response.ok) {
        throw new Error(`Failed to fetch result: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching result:', error);
      return null;
    }
  }

  async fetchMultipleResults(taskIds: string[], options: ResultFetchOptions = {}): Promise<GeneratedResult[]> {
    const results = await Promise.all(taskIds.map((taskId) => this.fetchResult(taskId, options)));
    return results.filter((result): result is GeneratedResult => result !== null);
  }

  async fetchProjectResults(projectName: string, options: ResultFetchOptions = {}): Promise<GeneratedResult[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/projects/${projectName}/results`);
      if (!response.ok) {
        throw new Error(`Failed to fetch project results: ${response.status}`);
      }
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Error fetching project results:', error);
      return [];
    }
  }

  async downloadAsset(asset: GeneratedAsset, filename?: string): Promise<boolean> {
    try {
      const response = await fetch(asset.url);
      if (!response.ok) {
        throw new Error(`Failed to download asset: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || asset.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      return true;
    } catch (error) {
      console.error('Error downloading asset:', error);
      return false;
    }
  }

  async downloadAllAssets(result: GeneratedResult): Promise<boolean> {
    try {
      for (const asset of result.assets) {
        const success = await this.downloadAsset(asset);
        if (!success) {
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Error downloading all assets:', error);
      return false;
    }
  }

  async deleteResult(taskId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tasks/${taskId}/result`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error(`Failed to delete result: ${response.status}`);
      }
      return true;
    } catch (error) {
      console.error('Error deleting result:', error);
      return false;
    }
  }

  getPreviewUrl(asset: GeneratedAsset): string {
    return asset.thumbnail || asset.url;
  }
}

export class MockResultService extends ResultService {
  private mockResults: Map<string, GeneratedResult> = new Map();

  constructor() {
    super('http://localhost:3000');
    this.initializeMockResults();
  }

  private initializeMockResults(): void {
    const mockResult: GeneratedResult = {
      taskId: 'mock-task-1',
      shotId: 'shot-1',
      type: 'grid',
      status: 'success',
      assets: [
        {
          id: 'asset-1',
          type: 'image',
          name: 'grid_output.png',
          url: 'https://via.placeholder.com/800x600',
          thumbnail: 'https://via.placeholder.com/200x150',
          size: 1024,
          format: 'png',
          dimensions: { width: 800, height: 600 },
        },
      ],
      generatedAt: new Date(),
      processingTime: 120,
      qualityScore: 95,
      metrics: { resolution: 800, fps: 30 },
    };

    this.mockResults.set('mock-task-1', mockResult);
  }

  async fetchResult(taskId: string, options: ResultFetchOptions = {}): Promise<GeneratedResult | null> {
    return this.mockResults.get(taskId) || null;
  }

  async fetchMultipleResults(taskIds: string[], options: ResultFetchOptions = {}): Promise<GeneratedResult[]> {
    return taskIds.map((taskId) => this.mockResults.get(taskId)).filter((result): result is GeneratedResult => result !== null);
  }

  async fetchProjectResults(projectName: string, options: ResultFetchOptions = {}): Promise<GeneratedResult[]> {
    return Array.from(this.mockResults.values());
  }

  async downloadAsset(asset: GeneratedAsset, filename?: string): Promise<boolean> {
    console.log(`Mock download of asset: ${asset.name}`);
    return true;
  }

  async downloadAllAssets(result: GeneratedResult): Promise<boolean> {
    console.log(`Mock download of all assets for result: ${result.taskId}`);
    return true;
  }

  async deleteResult(taskId: string): Promise<boolean> {
    console.log(`Mock delete of result: ${taskId}`);
    return true;
  }
}

export function createResultService(useMock: boolean = false): ResultService {
  return useMock ? new MockResultService() : new ResultService();
}