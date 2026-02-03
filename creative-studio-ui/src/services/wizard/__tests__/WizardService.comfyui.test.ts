/**
 * WizardService ComfyUI Connection Tests
 * 
 * Tests for the fixed ComfyUI connection logic
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WizardService } from '../WizardService';
import { getComfyUIServersService, resetComfyUIServersService } from '../../comfyuiServersService';
import { testComfyUIConnection } from '../../comfyuiService';

// Mock the ComfyUI Servers Service
vi.mock('../../comfyuiServersService', () => ({
  getComfyUIServersService: vi.fn(),
  resetComfyUIServersService: vi.fn(),
}));

// Mock the ComfyUI Service
vi.mock('../../comfyuiService', () => ({
  testComfyUIConnection: vi.fn(),
}));

describe('WizardService ComfyUI Connection Tests', () => {
  let wizardService: WizardService;
  let mockComfyuiServersService: any;
  let mockTestComfyUIConnection: any;

  beforeEach(() => {
    wizardService = new WizardService();
    
    // Setup mocks
    mockComfyuiServersService = {
      getAvailableServer: vi.fn(),
    };
    
    mockTestComfyUIConnection = testComfyUIConnection;
    
    // Mock the service
    vi.mocked(getComfyUIServersService).mockReturnValue(mockComfyuiServersService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('checkComfyUIConnection()', () => {
    it('should use ComfyUI Servers Service when available', async () => {
      // Mock a configured server
      const mockServer = {
        serverUrl: 'http://localhost:8189',
        authentication: { type: 'none' },
        timeout: 5000,
      };
      
      mockComfyuiServersService.getAvailableServer.mockResolvedValue(mockServer);
      mockTestComfyUIConnection.mockResolvedValue({
        success: true,
        message: 'Connected successfully',
      });

      const result = await wizardService.checkComfyUIConnection();

      expect(result.connected).toBe(true);
      expect(result.endpoint).toBe('http://localhost:8189');
      expect(mockComfyuiServersService.getAvailableServer).toHaveBeenCalled();
      expect(mockTestComfyUIConnection).toHaveBeenCalledWith({
        serverUrl: 'http://localhost:8189',
        authentication: { type: 'none' },
        timeout: 5000,
      });
    });

    it('should fallback to default endpoint when no servers configured', async () => {
      // Mock no available server
      mockComfyuiServersService.getAvailableServer.mockResolvedValue(null);
      
      // Mock global fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => ({}),
      });

      const result = await wizardService.checkComfyUIConnection();

      expect(result.connected).toBe(true);
      expect(result.endpoint).toBe('http://localhost:8188');
      expect(fetch).toHaveBeenCalledWith('http://localhost:8188/system_stats', expect.any(Object));
    });

    it('should try ComfyUI Desktop port as secondary fallback', async () => {
      // Mock no available server
      mockComfyuiServersService.getAvailableServer.mockResolvedValue(null);
      
      // Mock failed default endpoint
      global.fetch = vi.fn()
        .mockRejectedValueOnce(new Error('Connection refused'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => ({}),
        });

      const result = await wizardService.checkComfyUIConnection();

      expect(result.connected).toBe(true);
      expect(result.endpoint).toBe('http://localhost:8000');
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenNthCalledWith(1, 'http://localhost:8188/system_stats', expect.any(Object));
      expect(fetch).toHaveBeenNthCalledWith(2, 'http://localhost:8000/system_stats', expect.any(Object));
    });

    it('should handle connection failures gracefully', async () => {
      // Mock no available server
      mockComfyuiServersService.getAvailableServer.mockResolvedValue(null);
      
      // Mock all connection attempts failing
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const result = await wizardService.checkComfyUIConnection();

      expect(result.connected).toBe(false);
      expect(result.endpoint).toBe('http://localhost:8188');
      expect(result.error).toContain('Connection refused');
    });

    it('should handle HTTP errors properly', async () => {
      // Mock no available server
      mockComfyuiServersService.getAvailableServer.mockResolvedValue(null);
      
      // Mock HTTP error response
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const result = await wizardService.checkComfyUIConnection();

      expect(result.connected).toBe(false);
      expect(result.endpoint).toBe('http://localhost:8188');
      expect(result.error).toContain('404');
    });
  });

  describe('error handling', () => {
    it('should handle ComfyUI Servers Service errors', async () => {
      // Mock service throwing error
      mockComfyuiServersService.getAvailableServer.mockRejectedValue(new Error('Service error'));
      
      // Mock global fetch as fallback
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => ({}),
      });

      const result = await wizardService.checkComfyUIConnection();

      expect(result.connected).toBe(true);
      expect(result.endpoint).toBe('http://localhost:8188');
    });

    it('should handle testComfyUIConnection errors', async () => {
      // Mock a configured server
      const mockServer = {
        serverUrl: 'http://localhost:8189',
        authentication: { type: 'none' },
        timeout: 5000,
      };
      
      mockComfyuiServersService.getAvailableServer.mockResolvedValue(mockServer);
      mockTestComfyUIConnection.mockResolvedValue({
        success: false,
        message: 'Authentication failed',
      });

      const result = await wizardService.checkComfyUIConnection();

      expect(result.connected).toBe(false);
      expect(result.endpoint).toBe('http://localhost:8189');
      expect(result.error).toBe('Authentication failed');
    });
  });
});