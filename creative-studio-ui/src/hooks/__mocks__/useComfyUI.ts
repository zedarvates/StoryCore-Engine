/**
 * Mock implementation of useComfyUI hook for testing
 */

import { jest } from '@jest/globals';
import type { UseComfyUIReturn } from '../useComfyUI';

// Mock ComfyUI server data
const mockServer = {
  id: 'mock-server-1',
  name: 'Mock ComfyUI Server',
  serverUrl: 'http://localhost:8188',
  authentication: { type: 'none' as const },
  isActive: true,
  status: 'connected' as const,
  timeout: 30000,
};

// Mock hook implementation
export const useComfyUI = jest.fn((): UseComfyUIReturn => ({
  // State
  servers: [mockServer],
  activeServer: mockServer,
  isLoading: false,
  error: null,
  autoSwitchOnFailure: false,

  // Server management
  addServer: jest.fn().mockResolvedValue(mockServer),
  updateServer: jest.fn().mockResolvedValue(mockServer),
  deleteServer: jest.fn().mockResolvedValue(true),
  setActiveServer: jest.fn().mockResolvedValue(true),

  // Connection testing
  testServer: jest.fn().mockResolvedValue(true),
  testAllServers: jest.fn().mockResolvedValue(new Map([['mock-server-1', true]])),
  getAvailableServer: jest.fn().mockResolvedValue(mockServer),

  // Configuration
  setAutoSwitchOnFailure: jest.fn(),
  exportConfig: jest.fn().mockReturnValue('{"servers":[],"version":"1.0"}'),
  importConfig: jest.fn().mockReturnValue(true),
  clearAll: jest.fn(),

  // Utilities
  refresh: jest.fn(),
}));
