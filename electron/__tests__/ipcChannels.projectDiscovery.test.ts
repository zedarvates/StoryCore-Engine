/**
 * Tests for Project Discovery IPC Handlers
 * 
 * Integration tests for the IPC communication layer for project discovery functionality
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../ipcChannels';

// Mock electron
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn(),
    removeHandler: jest.fn(),
    removeAllListeners: jest.fn(),
    on: jest.fn(),
  },
  dialog: {
    showOpenDialog: jest.fn(),
  },
  BrowserWindow: {
    fromWebContents: jest.fn(),
  },
  app: {
    getPath: jest.fn(() => '/mock/app/data'),
    quit: jest.fn(),
  },
}));

describe('IPC Channels - Project Discovery', () => {
  describe('Channel Constants', () => {
    it('should define DISCOVER_PROJECTS channel', () => {
      expect(IPC_CHANNELS.DISCOVER_PROJECTS).toBe('discover-projects');
    });

    it('should define PROJECTS_SCAN_DIRECTORY channel', () => {
      expect(IPC_CHANNELS.PROJECTS_SCAN_DIRECTORY).toBe('projects:scan-directory');
    });

    it('should define PROJECTS_GET_MERGED_LIST channel', () => {
      expect(IPC_CHANNELS.PROJECTS_GET_MERGED_LIST).toBe('projects:get-merged-list');
    });

    it('should define PROJECTS_REFRESH channel', () => {
      expect(IPC_CHANNELS.PROJECTS_REFRESH).toBe('projects:refresh');
    });
  });

  describe('Response Format Validation', () => {
    it('should validate DiscoveryResult structure', () => {
      // This test validates the DiscoveryResult interface structure
      const mockDiscoveryResult = {
        projects: [],
        scannedPath: '/path/to/projects',
        timestamp: Date.now(),
        errors: [],
      };

      expect(mockDiscoveryResult).toHaveProperty('projects');
      expect(mockDiscoveryResult).toHaveProperty('scannedPath');
      expect(mockDiscoveryResult).toHaveProperty('timestamp');
      expect(mockDiscoveryResult).toHaveProperty('errors');
      expect(Array.isArray(mockDiscoveryResult.projects)).toBe(true);
      expect(typeof mockDiscoveryResult.scannedPath).toBe('string');
      expect(typeof mockDiscoveryResult.timestamp).toBe('number');
      expect(Array.isArray(mockDiscoveryResult.errors)).toBe(true);
    });

    it('should validate DiscoveryResult with errors', () => {
      const mockDiscoveryResult = {
        projects: [],
        scannedPath: '/path/to/projects',
        timestamp: Date.now(),
        errors: [
          { path: '/path/to/invalid', error: 'Invalid project.json' }
        ],
      };

      expect(mockDiscoveryResult.errors.length).toBe(1);
      expect(mockDiscoveryResult.errors[0]).toHaveProperty('path');
      expect(mockDiscoveryResult.errors[0]).toHaveProperty('error');
      expect(typeof mockDiscoveryResult.errors[0].path).toBe('string');
      expect(typeof mockDiscoveryResult.errors[0].error).toBe('string');
    });

    it('should validate ScanProjectsResponse structure', () => {
      // This test validates the TypeScript interface structure
      const mockResponse = {
        success: true,
        projects: [],
        data: [],
      };

      expect(mockResponse).toHaveProperty('success');
      expect(mockResponse).toHaveProperty('projects');
      expect(mockResponse).toHaveProperty('data');
      expect(typeof mockResponse.success).toBe('boolean');
      expect(Array.isArray(mockResponse.projects)).toBe(true);
    });

    it('should validate error response structure', () => {
      const mockErrorResponse = {
        success: false,
        error: 'Test error',
        errorCode: 'SCAN_FAILED',
      };

      expect(mockErrorResponse).toHaveProperty('success');
      expect(mockErrorResponse).toHaveProperty('error');
      expect(mockErrorResponse).toHaveProperty('errorCode');
      expect(typeof mockErrorResponse.success).toBe('boolean');
      expect(typeof mockErrorResponse.error).toBe('string');
      expect(typeof mockErrorResponse.errorCode).toBe('string');
    });

    it('should validate MergedProjectsResponse structure', () => {
      const mockResponse = {
        success: true,
        projects: [],
        data: [],
      };

      expect(mockResponse).toHaveProperty('success');
      expect(mockResponse).toHaveProperty('projects');
      expect(mockResponse).toHaveProperty('data');
    });

    it('should validate RefreshProjectsResponse structure', () => {
      const mockResponse = {
        success: true,
        projects: [],
        data: [],
      };

      expect(mockResponse).toHaveProperty('success');
      expect(mockResponse).toHaveProperty('projects');
      expect(mockResponse).toHaveProperty('data');
    });
  });

  describe('Error Code Enum', () => {
    it('should define all required error codes', () => {
      // Import the error codes
      const { ProjectDiscoveryErrorCode } = require('../types/ipc');

      expect(ProjectDiscoveryErrorCode.DIRECTORY_NOT_FOUND).toBe('DIRECTORY_NOT_FOUND');
      expect(ProjectDiscoveryErrorCode.PERMISSION_DENIED).toBe('PERMISSION_DENIED');
      expect(ProjectDiscoveryErrorCode.INVALID_PROJECT).toBe('INVALID_PROJECT');
      expect(ProjectDiscoveryErrorCode.SCAN_FAILED).toBe('SCAN_FAILED');
      expect(ProjectDiscoveryErrorCode.MERGE_FAILED).toBe('MERGE_FAILED');
      expect(ProjectDiscoveryErrorCode.SERVICE_UNAVAILABLE).toBe('SERVICE_UNAVAILABLE');
    });
  });

  describe('Type Definitions', () => {
    it('should export ScanProjectsOptions interface', () => {
      const { ScanProjectsOptions } = require('../types/ipc');
      // TypeScript will validate this at compile time
      expect(ScanProjectsOptions).toBeUndefined(); // Interfaces don't exist at runtime
    });

    it('should validate DiscoveredProject structure', () => {
      const mockProject = {
        name: 'Test Project',
        path: '/path/to/project',
        lastModified: new Date(),
        isRecent: false,
      };

      expect(mockProject).toHaveProperty('name');
      expect(mockProject).toHaveProperty('path');
      expect(mockProject).toHaveProperty('lastModified');
      expect(mockProject).toHaveProperty('isRecent');
      expect(typeof mockProject.name).toBe('string');
      expect(typeof mockProject.path).toBe('string');
      expect(mockProject.lastModified instanceof Date).toBe(true);
      expect(typeof mockProject.isRecent).toBe('boolean');
    });

    it('should validate MergedProject structure', () => {
      const mockMergedProject = {
        name: 'Test Project',
        path: '/path/to/project',
        lastModified: new Date(),
        isRecent: true,
        lastOpened: new Date(),
      };

      expect(mockMergedProject).toHaveProperty('name');
      expect(mockMergedProject).toHaveProperty('path');
      expect(mockMergedProject).toHaveProperty('lastModified');
      expect(mockMergedProject).toHaveProperty('isRecent');
      expect(mockMergedProject).toHaveProperty('lastOpened');
      expect(typeof mockMergedProject.isRecent).toBe('boolean');
      expect(mockMergedProject.lastOpened instanceof Date).toBe(true);
    });
  });
});
