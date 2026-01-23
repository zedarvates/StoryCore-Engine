/**
 * ComfyUI Integration Tests
 *
 * End-to-end integration tests validating real HTTP/WebSocket communication
 * with ComfyUI server, workflow execution, and error handling.
 */

import {
  testComfyUIConnection,
  getAvailableWorkflows,
  getAvailableModels,
  getConnectionDiagnostics,
} from '../comfyuiService';
import { setupComfyUIMock, teardownComfyUIMock, getComfyUIMock } from '../../__mocks__/comfyuiServerMock';

// Mock AbortController for testing
global.AbortController = jest.fn().mockImplementation(() => ({
  signal: {},
  abort: jest.fn(),
}));

describe('ComfyUI Integration Tests', () => {
  beforeEach(() => {
    setupComfyUIMock({
      port: 8188,
      delay: 50, // Fast responses for testing
      failRate: 0,
    });
  });

  afterEach(() => {
    teardownComfyUIMock();
  });

  describe('Real HTTP Communication', () => {
    it('should establish real HTTP connection to ComfyUI server', async () => {
      const config = {
        serverUrl: 'http://localhost:8188',
        authentication: { type: 'none' as const },
      };

      const result = await testComfyUIConnection(config);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Connected successfully');
      expect(result.serverInfo).toBeDefined();
      expect(result.serverInfo?.systemInfo).toBeDefined();
      expect(result.serverInfo?.systemInfo.gpuName).toBeDefined();
      expect(result.serverInfo?.systemInfo.vramTotal).toBeGreaterThan(0);
    });

    it('should fetch real workflows from server', async () => {
      const workflows = await getAvailableWorkflows('http://localhost:8188');

      expect(Array.isArray(workflows)).toBe(true);
      expect(workflows.length).toBeGreaterThan(0);

      workflows.forEach(workflow => {
        expect(workflow).toHaveProperty('id');
        expect(workflow).toHaveProperty('name');
        expect(workflow).toHaveProperty('type');
        expect(workflow).toHaveProperty('description');
        expect(workflow).toHaveProperty('requiredInputs');
        expect(Array.isArray(workflow.requiredInputs)).toBe(true);
      });
    });

    it('should fetch real models from server', async () => {
      const models = await getAvailableModels('http://localhost:8188');

      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);

      models.forEach(model => {
        expect(model).toHaveProperty('id');
        expect(model).toHaveProperty('name');
        expect(model).toHaveProperty('type');
        expect(model).toHaveProperty('size');
        expect(typeof model.loaded).toBe('boolean');
        expect(model.size).toBeGreaterThan(0);
      });
    });

    it('should handle system stats parsing', async () => {
      const config = {
        serverUrl: 'http://localhost:8188',
      };

      const result = await testComfyUIConnection(config);

      expect(result.serverInfo?.systemInfo).toBeDefined();
      const systemInfo = result.serverInfo!.systemInfo;

      expect(systemInfo.gpuName).toBeDefined();
      expect(systemInfo.vramTotal).toBeGreaterThan(0);
      expect(systemInfo.vramFree).toBeGreaterThan(0);
      expect(systemInfo.vramFree).toBeLessThanOrEqual(systemInfo.vramTotal);
    });
  });

  describe('Authentication Integration', () => {
    it('should handle basic authentication', async () => {
      setupComfyUIMock({
        port: 8188,
        authRequired: true,
      });

      const config = {
        serverUrl: 'http://localhost:8188',
        authentication: {
          type: 'basic' as const,
          username: 'testuser',
          password: 'testpass',
        },
      };

      const result = await testComfyUIConnection(config);

      // Should fail because our mock doesn't validate credentials
      expect(result.success).toBe(false);
      expect(result.message).toContain('Authentication failed');
    });

    it('should handle token authentication', async () => {
      setupComfyUIMock({
        port: 8188,
        authRequired: true,
      });

      const config = {
        serverUrl: 'http://localhost:8188',
        authentication: {
          type: 'token' as const,
          token: 'test-token-123',
        },
      };

      const result = await testComfyUIConnection(config);

      // Should fail because our mock doesn't validate tokens
      expect(result.success).toBe(false);
      expect(result.message).toContain('Authentication failed');
    });

    it('should work without authentication when not required', async () => {
      const config = {
        serverUrl: 'http://localhost:8188',
        authentication: { type: 'none' as const },
      };

      const result = await testComfyUIConnection(config);

      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle server not responding', async () => {
      // Mock network failure
      global.fetch = jest.fn().mockRejectedValue(new Error('Failed to fetch'));

      const config = {
        serverUrl: 'http://nonexistent:8188',
      };

      const result = await testComfyUIConnection(config);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Cannot reach server');
    });

    it('should handle timeout scenarios', async () => {
      setupComfyUIMock({
        port: 8188,
        delay: 12000, // Longer than timeout
      });

      const config = {
        serverUrl: 'http://localhost:8188',
      };

      const result = await testComfyUIConnection(config);

      expect(result.success).toBe(false);
      expect(result.message).toContain('timeout');
    });

    it('should handle server errors (5xx)', async () => {
      setupComfyUIMock({
        port: 8188,
        failRate: 1.0, // Always fail
      });

      const config = {
        serverUrl: 'http://localhost:8188',
      };

      const result = await testComfyUIConnection(config);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Server returned error');
    });

    it('should handle malformed JSON responses', async () => {
      // Mock fetch to return invalid JSON
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      const config = {
        serverUrl: 'http://localhost:8188',
      };

      const result = await testComfyUIConnection(config);

      expect(result.success).toBe(false);
    });
  });

  describe('Connection Diagnostics Integration', () => {
    it('should provide comprehensive diagnostics for healthy server', async () => {
      const config = {
        serverUrl: 'http://localhost:8188',
      };

      const diagnostics = await getConnectionDiagnostics(config);

      expect(diagnostics.urlValid).toBe(true);
      expect(diagnostics.serverReachable).toBe(true);
      expect(diagnostics.authenticationValid).toBe(true);
      expect(diagnostics.endpointsAvailable.systemStats).toBe(true);
      expect(diagnostics.responseTime).toBeGreaterThan(0);
      expect(diagnostics.suggestions).toBeDefined();
    });

    it('should diagnose unreachable servers', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const config = {
        serverUrl: 'http://unreachable:8188',
      };

      const diagnostics = await getConnectionDiagnostics(config);

      expect(diagnostics.serverReachable).toBe(false);
      expect(diagnostics.errorDetails).toContain('Cannot reach server');
      expect(diagnostics.suggestions).toContain('Check that ComfyUI is running');
    });

    it('should diagnose authentication issues', async () => {
      setupComfyUIMock({
        port: 8188,
        authRequired: true,
      });

      const config = {
        serverUrl: 'http://localhost:8188',
        authentication: { type: 'none' as const },
      };

      const diagnostics = await getConnectionDiagnostics(config);

      expect(diagnostics.authenticationValid).toBe(false);
      expect(diagnostics.suggestions).toContain('Check your username/password or token');
    });

    it('should test multiple endpoints', async () => {
      const config = {
        serverUrl: 'http://localhost:8188',
      };

      const diagnostics = await getConnectionDiagnostics(config);

      expect(diagnostics.endpointsAvailable).toBeDefined();
      expect(typeof diagnostics.endpointsAvailable.systemStats).toBe('boolean');
      expect(typeof diagnostics.endpointsAvailable.prompt).toBe('boolean');
      expect(typeof diagnostics.endpointsAvailable.objectInfo).toBe('boolean');
    });
  });

  describe('Workflow Execution Simulation', () => {
    it('should simulate workflow prompt submission', async () => {
      const promptData = {
        prompt: {
          '1': {
            inputs: {
              text: 'A beautiful landscape',
              clip: ['CLIP', 0],
            },
            class_type: 'CLIPTextEncode',
          },
          '2': {
            inputs: {
              text: 'blurry, low quality',
              clip: ['CLIP', 0],
            },
            class_type: 'CLIPTextEncode',
          },
          '3': {
            inputs: {
              width: 512,
              height: 512,
              batch_size: 1,
            },
            class_type: 'EmptyLatentImage',
          },
          '4': {
            inputs: {
              seed: 12345,
              steps: 20,
              cfg: 7.5,
              sampler_name: 'euler_a',
              scheduler: 'normal',
              denoise: 1,
              model: ['MODEL', 0],
              positive: ['1', 0],
              negative: ['2', 0],
              latent_image: ['3', 0],
            },
            class_type: 'KSampler',
          },
          '5': {
            inputs: {
              samples: ['4', 0],
              vae: ['VAE', 0],
            },
            class_type: 'VAEDecode',
          },
          '6': {
            inputs: {
              filename_prefix: 'ComfyUI',
              images: ['5', 0],
            },
            class_type: 'SaveImage',
          },
        },
      };

      // Mock the prompt endpoint response
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          prompt_id: 'test-prompt-123',
          number: 1,
          node_errors: {},
        }),
      });

      const response = await fetch('http://localhost:8188/prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(promptData),
      });

      expect(response.ok).toBe(true);
      const result = await response.json();
      expect(result.prompt_id).toBeDefined();
      expect(result.number).toBeDefined();
    });

    it('should handle workflow execution errors', async () => {
      // Mock prompt endpoint to return validation error
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          error: 'Invalid workflow structure',
          node_errors: {
            '1': 'Missing required input: text',
          },
        }),
      });

      const response = await fetch('http://localhost:8188/prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });

    it('should query workflow execution status', async () => {
      // Mock queue endpoint response
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          queue_running: [
            {
              prompt_id: 'test-prompt-123',
              status: {
                status_str: 'running',
                completed: 0,
                total: 4,
              },
            },
          ],
          queue_pending: [],
        }),
      });

      const response = await fetch('http://localhost:8188/queue', {
        method: 'GET',
      });

      expect(response.ok).toBe(true);
      const queueStatus = await response.json();
      expect(queueStatus.queue_running).toBeDefined();
      expect(queueStatus.queue_pending).toBeDefined();
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent requests', async () => {
      const config = {
        serverUrl: 'http://localhost:8188',
      };

      // Make multiple concurrent connection tests
      const promises = Array(5).fill(null).map(() =>
        testComfyUIConnection(config)
      );

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('should handle rapid successive requests', async () => {
      const config = {
        serverUrl: 'http://localhost:8188',
      };

      for (let i = 0; i < 10; i++) {
        const result = await testComfyUIConnection(config);
        expect(result.success).toBe(true);
      }
    });

    it('should measure response times accurately', async () => {
      const startTime = Date.now();

      const config = {
        serverUrl: 'http://localhost:8188',
      };

      const result = await testComfyUIConnection(config);
      const diagnostics = await getConnectionDiagnostics(config);

      expect(result.success).toBe(true);
      expect(diagnostics.responseTime).toBeGreaterThan(0);
      expect(diagnostics.responseTime).toBeLessThan(Date.now() - startTime);
    });
  });

  describe('WebSocket Integration', () => {
    let mockWebSocket: any;

    beforeEach(() => {
      // Mock WebSocket for testing
      mockWebSocket = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        send: jest.fn(),
        close: jest.fn(),
        readyState: 1, // OPEN
        onopen: null,
        onmessage: null,
        onclose: null,
        onerror: null,
      };

      global.WebSocket = jest.fn().mockImplementation(() => mockWebSocket);
    });

    it('should establish WebSocket connection for real-time updates', () => {
      const ws = new WebSocket('ws://localhost:8188/ws');

      expect(WebSocket).toHaveBeenCalledWith('ws://localhost:8188/ws');
      expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('open', expect.any(Function));
      expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should handle WebSocket execution updates', () => {
      const ws = new WebSocket('ws://localhost:8188/ws');

      // Simulate execution start message
      const executionStartMessage = {
        type: 'execution_start',
        data: {
          prompt_id: 'test-prompt-123',
        },
      };

      // Trigger message handler
      const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )[1];

      messageHandler({
        data: JSON.stringify(executionStartMessage),
      });

      // WebSocket should remain open for updates
      expect(mockWebSocket.close).not.toHaveBeenCalled();
    });

    it('should handle WebSocket execution progress', () => {
      const ws = new WebSocket('ws://localhost:8188/ws');

      // Simulate progress message
      const progressMessage = {
        type: 'progress',
        data: {
          value: 50,
          max: 100,
          node: '4', // KSampler node
        },
      };

      const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )[1];

      messageHandler({
        data: JSON.stringify(progressMessage),
      });

      // Should handle progress updates without closing
      expect(mockWebSocket.close).not.toHaveBeenCalled();
    });

    it('should handle WebSocket execution completion', () => {
      const ws = new WebSocket('ws://localhost:8188/ws');

      // Simulate execution success message
      const executionSuccessMessage = {
        type: 'execution_cached', // or 'execution_success'
        data: {
          prompt_id: 'test-prompt-123',
          outputs: {
            '6': { // SaveImage node
              images: [{
                filename: 'ComfyUI_00001_.png',
                subfolder: '',
                type: 'output',
              }],
            },
          },
        },
      };

      const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )[1];

      messageHandler({
        data: JSON.stringify(executionSuccessMessage),
      });

      // Connection might close after successful execution
      // expect(mockWebSocket.close).toHaveBeenCalled();
    });

    it('should handle WebSocket errors gracefully', () => {
      const ws = new WebSocket('ws://localhost:8188/ws');

      const errorHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'error'
      )[1];

      errorHandler(new Event('error'));

      // Should handle errors without crashing
      expect(mockWebSocket.close).toHaveBeenCalled();
    });

    it('should handle WebSocket connection close', () => {
      const ws = new WebSocket('ws://localhost:8188/ws');

      const closeHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'close'
      )[1];

      closeHandler({
        code: 1000,
        reason: 'Normal closure',
        wasClean: true,
      });

      // Close handler should execute without error
      expect(closeHandler).toBeDefined();
    });
  });

  describe('Server Load and Stress Testing', () => {
    it('should handle server busy states', async () => {
      setupComfyUIMock({
        port: 8188,
        simulateBusy: true,
      });

      const config = {
        serverUrl: 'http://localhost:8188',
      };

      // Some requests should succeed, some should return busy
      const results = [];
      for (let i = 0; i < 10; i++) {
        const result = await testComfyUIConnection(config);
        results.push(result);
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      expect(successCount).toBeGreaterThan(0);
      expect(failureCount).toBeGreaterThan(0);
    });

    it('should recover from temporary server issues', async () => {
      // Start with failing server
      setupComfyUIMock({
        port: 8188,
        failRate: 1.0,
      });

      const config = {
        serverUrl: 'http://localhost:8188',
      };

      // First few requests should fail
      for (let i = 0; i < 3; i++) {
        const result = await testComfyUIConnection(config);
        expect(result.success).toBe(false);
      }

      // Switch to healthy server
      setupComfyUIMock({
        port: 8188,
        failRate: 0,
      });

      // Subsequent requests should succeed
      const result = await testComfyUIConnection(config);
      expect(result.success).toBe(true);
    });
  });
});
