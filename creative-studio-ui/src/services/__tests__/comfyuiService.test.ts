/**
 * ComfyUI Service Tests
 * 
 * Tests for ComfyUI connection testing, health checks, and server info parsing.
 * Validates Requirements: 4.2, 4.3, 4.4, 4.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  testComfyUIConnection,
  validateUrl,
  getConnectionDiagnostics,
  getAvailableWorkflows,
  getAvailableModels,
  type ComfyUIConfig,
} from '../comfyuiService';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('ComfyUI Service', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('validateUrl', () => {
    it('should validate correct HTTP URL', () => {
      const result = validateUrl('http://localhost:8188');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate correct HTTPS URL', () => {
      const result = validateUrl('https://comfyui.example.com');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject empty URL', () => {
      const result = validateUrl('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Server URL is required');
    });

    it('should reject invalid protocol', () => {
      const result = validateUrl('ftp://localhost:8188');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Server URL must use HTTP or HTTPS protocol');
    });

    it('should reject malformed URL', () => {
      const result = validateUrl('not-a-url');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid server URL format');
    });
  });

  describe('testComfyUIConnection', () => {
    it('should return error when URL is missing', async () => {
      const result = await testComfyUIConnection({});
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Server URL is required');
    });

    it('should return error for invalid URL format', async () => {
      const result = await testComfyUIConnection({
        serverUrl: 'invalid-url',
      });
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid');
    });

    it('should successfully connect to ComfyUI server', async () => {
      const mockSystemStats = {
        system: {
          os: 'Linux',
          python_version: '3.10.0',
          pytorch_version: '2.0.0',
        },
        devices: [
          {
            name: 'NVIDIA RTX 4090',
            type: 'cuda',
            vram_total: 24576,
            vram_free: 18432,
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSystemStats,
      });

      const result = await testComfyUIConnection({
        serverUrl: 'http://localhost:8188',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Connected successfully to ComfyUI server');
      expect(result.serverInfo).toBeDefined();
      expect(result.serverInfo?.systemInfo.gpuName).toBe('NVIDIA RTX 4090');
      expect(result.serverInfo?.systemInfo.vramTotal).toBe(24576);
      expect(result.serverInfo?.systemInfo.vramFree).toBe(18432);
    });

    it('should handle authentication failure (401)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const result = await testComfyUIConnection({
        serverUrl: 'http://localhost:8188',
        authentication: {
          type: 'basic',
          username: 'wrong',
          password: 'credentials',
        },
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Authentication failed');
    });

    it('should handle 404 endpoint not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const result = await testComfyUIConnection({
        serverUrl: 'http://localhost:8188',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('endpoint not available');
    });

    it('should handle network timeout', async () => {
      mockFetch.mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            const error = new Error('Timeout');
            error.name = 'AbortError';
            reject(error);
          }, 100);
        });
      });

      const result = await testComfyUIConnection({
        serverUrl: 'http://localhost:8188',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('timeout');
    });

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'));

      const result = await testComfyUIConnection({
        serverUrl: 'http://localhost:8188',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Cannot reach server');
    });

    it('should include basic auth header when configured', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ devices: [] }),
      });

      await testComfyUIConnection({
        serverUrl: 'http://localhost:8188',
        authentication: {
          type: 'basic',
          username: 'user',
          password: 'pass',
        },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8188/system_stats',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Basic'),
          }),
        })
      );
    });

    it('should include bearer token when configured', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ devices: [] }),
      });

      await testComfyUIConnection({
        serverUrl: 'http://localhost:8188',
        authentication: {
          type: 'token',
          token: 'my-secret-token',
        },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8188/system_stats',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer my-secret-token',
          }),
        })
      );
    });

    it('should parse system info with missing GPU data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          system: { pytorch_version: '2.0.0' },
          devices: [],
        }),
      });

      const result = await testComfyUIConnection({
        serverUrl: 'http://localhost:8188',
      });

      expect(result.success).toBe(true);
      expect(result.serverInfo?.systemInfo.gpuName).toBe('Unknown GPU');
      expect(result.serverInfo?.systemInfo.vramTotal).toBe(0);
    });
  });

  describe('getConnectionDiagnostics', () => {
    it('should diagnose missing URL', async () => {
      const diagnostics = await getConnectionDiagnostics({});

      expect(diagnostics.urlValid).toBe(false);
      expect(diagnostics.urlError).toBe('Server URL is required');
      expect(diagnostics.suggestions).toContain(
        'Enter a valid ComfyUI server URL (e.g., http://localhost:8188)'
      );
    });

    it('should diagnose invalid URL format', async () => {
      const diagnostics = await getConnectionDiagnostics({
        serverUrl: 'not-a-url',
      });

      expect(diagnostics.urlValid).toBe(false);
      expect(diagnostics.suggestions).toContain(
        'Check that the URL format is correct (must start with http:// or https://)'
      );
    });

    it('should diagnose successful connection', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      const diagnostics = await getConnectionDiagnostics({
        serverUrl: 'http://localhost:8188',
      });

      expect(diagnostics.urlValid).toBe(true);
      expect(diagnostics.serverReachable).toBe(true);
      expect(diagnostics.authenticationValid).toBe(true);
      expect(diagnostics.endpointsAvailable.systemStats).toBe(true);
      expect(diagnostics.responseTime).toBeGreaterThan(0);
    });

    it('should diagnose authentication failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const diagnostics = await getConnectionDiagnostics({
        serverUrl: 'http://localhost:8188',
      });

      expect(diagnostics.serverReachable).toBe(true);
      expect(diagnostics.authenticationValid).toBe(false);
      expect(diagnostics.errorDetails).toBe('Authentication failed');
      expect(diagnostics.suggestions).toContain('Check your username/password or token');
    });

    it('should diagnose network timeout', async () => {
      mockFetch.mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            const error = new Error('Timeout');
            error.name = 'AbortError';
            reject(error);
          }, 100);
        });
      });

      const diagnostics = await getConnectionDiagnostics({
        serverUrl: 'http://localhost:8188',
      });

      expect(diagnostics.serverReachable).toBe(false);
      expect(diagnostics.errorDetails).toBe('Connection timeout');
      expect(diagnostics.suggestions).toContain('Server is not responding within 5 seconds');
    });

    it('should diagnose network unreachable', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'));

      const diagnostics = await getConnectionDiagnostics({
        serverUrl: 'http://localhost:8188',
      });

      expect(diagnostics.serverReachable).toBe(false);
      expect(diagnostics.errorDetails).toBe('Cannot reach server');
      expect(diagnostics.suggestions).toContain('Check that ComfyUI is running on the specified URL');
    });

    it('should test multiple endpoints when server is reachable', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        });

      const diagnostics = await getConnectionDiagnostics({
        serverUrl: 'http://localhost:8188',
      });

      expect(diagnostics.endpointsAvailable.systemStats).toBe(true);
      expect(diagnostics.endpointsAvailable.prompt).toBe(true);
      expect(diagnostics.endpointsAvailable.objectInfo).toBe(true);
    });
  });

  describe('getAvailableWorkflows', () => {
    it('should return workflows', async () => {
      const workflows = await getAvailableWorkflows('http://localhost:8188');
      
      expect(workflows).toBeDefined();
      expect(Array.isArray(workflows)).toBe(true);
      expect(workflows.length).toBeGreaterThan(0);
    });

    it('should include workflow metadata', async () => {
      const workflows = await getAvailableWorkflows('http://localhost:8188');
      
      const workflow = workflows[0];
      expect(workflow.id).toBeDefined();
      expect(workflow.name).toBeDefined();
      expect(workflow.type).toBeDefined();
      expect(workflow.description).toBeDefined();
      expect(workflow.requiredInputs).toBeDefined();
    });
  });

  describe('getAvailableModels', () => {
    it('should return models', async () => {
      const models = await getAvailableModels('http://localhost:8188');
      
      expect(models).toBeDefined();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    });

    it('should include model metadata', async () => {
      const models = await getAvailableModels('http://localhost:8188');
      
      const model = models[0];
      expect(model.id).toBeDefined();
      expect(model.name).toBeDefined();
      expect(model.type).toBeDefined();
      expect(model.size).toBeDefined();
      expect(typeof model.loaded).toBe('boolean');
    });
  });
});
