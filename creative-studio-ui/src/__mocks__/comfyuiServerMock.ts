/**
 * ComfyUI Server Mock for Testing
 *
 * Mock implementation of ComfyUI server API endpoints for testing purposes.
 * Simulates real ComfyUI server responses including system stats, workflows, and models.
 */

import { jest } from '@jest/globals';

// Mock server configuration
export interface MockComfyUIServerConfig {
  port: number;
  delay?: number;
  failRate?: number;
  authRequired?: boolean;
  simulateBusy?: boolean;
}

// Mock response types
export interface MockSystemStats {
  system: {
    os: string;
    python_version: string;
    pytorch_version: string;
  };
  devices: Array<{
    name: string;
    type: 'cuda' | 'cpu';
    vram_total: number;
    vram_free: number;
  }>;
}

export interface MockWorkflow {
  id: string;
  name: string;
  type: 'image' | 'video' | 'upscale' | 'inpaint';
  description: string;
  required_inputs: string[];
}

export interface MockModel {
  id: string;
  name: string;
  type: 'checkpoint' | 'vae' | 'lora' | 'clip' | 'controlnet';
  size: number;
  loaded: boolean;
}

// Default mock data
const MOCK_SYSTEM_STATS: MockSystemStats = {
  system: {
    os: 'Linux',
    python_version: '3.10.12',
    pytorch_version: '2.1.1+cu121',
  },
  devices: [
    {
      name: 'NVIDIA GeForce RTX 4090',
      type: 'cuda',
      vram_total: 24564,
      vram_free: 16384,
    },
  ],
};

const MOCK_WORKFLOWS: MockWorkflow[] = [
  {
    id: 'workflow-image-gen-1',
    name: 'Standard Image Generation',
    type: 'image',
    description: 'Basic text-to-image generation workflow',
    required_inputs: ['prompt', 'negative_prompt', 'width', 'height'],
  },
  {
    id: 'workflow-video-gen-1',
    name: 'Video Generation',
    type: 'video',
    description: 'Text-to-video generation with AnimateDiff',
    required_inputs: ['prompt', 'negative_prompt', 'frames', 'fps'],
  },
  {
    id: 'workflow-upscale-1',
    name: '4x Upscaling',
    type: 'upscale',
    description: 'Upscale images 4x using ESRGAN',
    required_inputs: ['image'],
  },
];

const MOCK_MODELS: MockModel[] = [
  {
    id: 'sd15-base',
    name: 'Stable Diffusion 1.5',
    type: 'checkpoint',
    size: 4265380000,
    loaded: true,
  },
  {
    id: 'sdxl-base',
    name: 'Stable Diffusion XL Base',
    type: 'checkpoint',
    size: 6938078000,
    loaded: false,
  },
  {
    id: 'vae-ft-mse',
    name: 'VAE-ft-MSE-840000',
    type: 'vae',
    size: 334643000,
    loaded: true,
  },
];

/**
 * ComfyUI Server Mock Class
 * Simulates a ComfyUI server for testing purposes
 */
export class ComfyUIServerMock {
  private config: MockComfyUIServerConfig;
  private requestCount = 0;
  private isRunning = true;

  constructor(config: MockComfyUIServerConfig) {
    this.config = {
      delay: 100,
      failRate: 0,
      authRequired: false,
      simulateBusy: false,
      ...config,
    };
  }

  /**
   * Start the mock server
   */
  start(): void {
    this.isRunning = true;
  }

  /**
   * Stop the mock server
   */
  stop(): void {
    this.isRunning = false;
  }

  /**
   * Mock fetch function that simulates ComfyUI API responses
   */
  async mockFetch(url: string, options: RequestInit = {}): Promise<Response> {
    if (!this.isRunning) {
      throw new Error('Mock server is not running');
    }

    this.requestCount++;

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, this.config.delay));

    // Simulate random failures
    if (this.config.failRate && Math.random() < this.config.failRate) {
      return new Response(null, { status: 500, statusText: 'Internal Server Error' });
    }

    // Simulate authentication requirement
    if (this.config.authRequired && !this.hasValidAuth(options.headers)) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        statusText: 'Unauthorized',
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Simulate busy server
    if (this.config.simulateBusy && this.requestCount % 3 === 0) {
      return new Response(null, { status: 503, statusText: 'Service Unavailable' });
    }

    // Route handling
    const urlObj = new URL(url);
    const path = urlObj.pathname;

    switch (path) {
      case '/system_stats':
        return this.handleSystemStats();

      case '/object_info':
        return this.handleObjectInfo();

      case '/prompt':
        return this.handlePrompt(options);

      case '/queue':
        return this.handleQueue();

      default:
        return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          statusText: 'Not Found',
          headers: { 'Content-Type': 'application/json' },
        });
    }
  }

  private handleSystemStats(): Response {
    return new Response(JSON.stringify(MOCK_SYSTEM_STATS), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private handleObjectInfo(): Response {
    // Simplified object_info response for testing
    return new Response(JSON.stringify({
      CheckpointLoaderSimple: { inputs: {}, outputs: {} },
      CLIPTextEncode: { inputs: {}, outputs: {} },
      KSampler: { inputs: {}, outputs: {} },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private handlePrompt(options: RequestInit): Response {
    const body = options.body as string;
    try {
      const promptData = JSON.parse(body);
      // Validate required fields for a basic prompt
      if (!promptData.prompt) {
        return new Response(JSON.stringify({ error: 'Missing prompt' }), {
          status: 400,
          statusText: 'Bad Request',
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Mock successful prompt submission
      return new Response(JSON.stringify({
        prompt_id: `prompt-${Date.now()}`,
        number: this.requestCount,
        node_errors: {},
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        statusText: 'Bad Request',
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private handleQueue(): Response {
    return new Response(JSON.stringify({
      queue_running: [],
      queue_pending: [],
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private hasValidAuth(headers: HeadersInit = {}): boolean {
    const authHeader = (headers as any)['Authorization'] || (headers as any)['authorization'];
    return authHeader && authHeader.startsWith('Bearer ') || authHeader.startsWith('Basic ');
  }

  /**
   * Get server statistics
   */
  getStats() {
    return {
      requestCount: this.requestCount,
      isRunning: this.isRunning,
      config: this.config,
    };
  }

  /**
   * Reset request count
   */
  resetStats(): void {
    this.requestCount = 0;
  }
}

// Global mock server instance for testing
let globalMockServer: ComfyUIServerMock | null = null;

/**
 * Setup global ComfyUI server mock for testing
 */
export function setupComfyUIMock(config: MockComfyUIServerConfig = { port: 8188 }): void {
  globalMockServer = new ComfyUIServerMock(config);
  globalMockServer.start();

  // Mock the global fetch function
  // Mock the global fetch function with proper Promise<Response> return type
  global.fetch = jest.fn().mockImplementation((url: RequestInfo, options: RequestInit = {}): Promise<Response> => {
    const urlString = typeof url === 'string' ? url : url.toString();
    if (globalMockServer && urlString.includes(`localhost:${config.port}`)) {
      // Ensure the mockFetch returns a Promise<Response>
      const result = globalMockServer.mockFetch(urlString, options);
      return Promise.resolve(result);
    }
    // Fallback to real fetch for non-ComfyUI URLs
    return jest.requireActual('node-fetch')(url, options);
  });
}

/**
 * Teardown ComfyUI server mock
 */
export function teardownComfyUIMock(): void {
  if (globalMockServer) {
    globalMockServer.stop();
    globalMockServer = null;
  }
  jest.restoreAllMocks();
}

/**
 * Get current mock server instance
 */
export function getComfyUIMock(): ComfyUIServerMock | null {
  return globalMockServer;
}

// Export mock data for direct access in tests
export { MOCK_SYSTEM_STATS, MOCK_WORKFLOWS, MOCK_MODELS };
