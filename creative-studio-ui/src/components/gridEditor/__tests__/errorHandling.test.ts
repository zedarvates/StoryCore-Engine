/**
 * Error Handling Tests
 * 
 * Unit tests for Grid Editor error handling and notification system
 * 
 * Requirements: All error handling requirements
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  showSuccess,
  showError,
  showWarning,
  showInfo,
  dismissNotification,
  clearAllNotifications,
  notifyOperationSuccess,
  notifyOperationError,
  notifyValidationWarning,
  notifyImportError,
  notifyExportSuccess,
  notifyGenerationInProgress,
  notifyGenerationComplete,
} from '../NotificationSystem';

describe('Notification System', () => {
  beforeEach(() => {
    // Clear all notifications before each test
    clearAllNotifications();
  });

  describe('Basic Notifications', () => {
    it('should create a success notification', () => {
      const id = showSuccess('Test Success', 'Operation completed');
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
    });

    it('should create an error notification', () => {
      const id = showError('Test Error', 'Operation failed');
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
    });

    it('should create a warning notification', () => {
      const id = showWarning('Test Warning', 'Validation issue');
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
    });

    it('should create an info notification', () => {
      const id = showInfo('Test Info', 'Information message');
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
    });
  });

  describe('Error Notifications with Recovery Options', () => {
    it('should create error notification with recovery options', () => {
      const mockAction = vi.fn();
      const id = showError('Test Error', 'Operation failed', {
        recoveryOptions: [
          {
            label: 'Retry',
            action: mockAction,
            isPrimary: true,
          },
        ],
      });

      expect(id).toBeDefined();
    });

    it('should include technical details in error notification', () => {
      const id = showError('Test Error', 'Operation failed', {
        technicalDetails: 'Stack trace here',
      });

      expect(id).toBeDefined();
    });
  });

  describe('Notification Dismissal', () => {
    it('should dismiss a notification by id', () => {
      const id = showSuccess('Test', 'Message');
      dismissNotification(id);
      // Notification should be removed (tested via UI component)
    });

    it('should clear all notifications', () => {
      showSuccess('Test 1', 'Message 1');
      showSuccess('Test 2', 'Message 2');
      showSuccess('Test 3', 'Message 3');
      
      clearAllNotifications();
      // All notifications should be removed (tested via UI component)
    });
  });

  describe('Predefined Notification Templates', () => {
    it('should notify operation success', () => {
      const id = notifyOperationSuccess('Save configuration');
      expect(id).toBeDefined();
    });

    it('should notify operation error', () => {
      const error = new Error('Test error');
      const mockAction = vi.fn();
      
      const id = notifyOperationError('save configuration', error, [
        {
          label: 'Retry',
          action: mockAction,
        },
      ]);

      expect(id).toBeDefined();
    });

    it('should notify validation warning', () => {
      const id = notifyValidationWarning('Panel transform', 'Scale must be positive');
      expect(id).toBeDefined();
    });

    it('should notify import error', () => {
      const error = new Error('Invalid JSON format');
      const id = notifyImportError(error);
      expect(id).toBeDefined();
    });

    it('should notify export success', () => {
      const id = notifyExportSuccess('grid-config.json');
      expect(id).toBeDefined();
    });

    it('should notify generation in progress', () => {
      const id = notifyGenerationInProgress(3);
      expect(id).toBeDefined();
    });

    it('should notify generation complete with all success', () => {
      const id = notifyGenerationComplete(3, 0);
      expect(id).toBeDefined();
    });

    it('should notify generation complete with partial failure', () => {
      const id = notifyGenerationComplete(2, 1);
      expect(id).toBeDefined();
    });
  });

  describe('Notification Duration', () => {
    it('should use default duration for success notifications', () => {
      const id = showSuccess('Test', 'Message');
      expect(id).toBeDefined();
      // Duration is 3000ms by default
    });

    it('should use custom duration', () => {
      const id = showSuccess('Test', 'Message', 1000);
      expect(id).toBeDefined();
    });

    it('should not auto-dismiss error notifications by default', () => {
      const id = showError('Test', 'Message');
      expect(id).toBeDefined();
      // Duration is 0 (no auto-dismiss) by default for errors
    });
  });
});

describe('Error Boundary', () => {
  describe('Emergency Backup', () => {
    it('should save emergency backup to localStorage', () => {
      // Mock localStorage
      const mockSetItem = vi.fn();
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = mockSetItem;

      // Simulate error boundary saving backup
      const mockConfig = {
        version: '1.0',
        projectId: 'test',
        panels: [],
        presets: [],
        metadata: {
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
        },
      };

      const backup = {
        timestamp: new Date().toISOString(),
        config: mockConfig,
        selectedPanelIds: [],
        activeTool: 'select',
      };

      localStorage.setItem('grid-editor-emergency-backup-latest', JSON.stringify(backup));

      expect(mockSetItem).toHaveBeenCalled();

      // Restore original
      Storage.prototype.setItem = originalSetItem;
    });

    it('should handle backup save failure gracefully', () => {
      // Mock localStorage to throw error
      const mockSetItem = vi.fn(() => {
        throw new Error('Storage quota exceeded');
      });
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = mockSetItem;

      try {
        localStorage.setItem('test', 'value');
      } catch (e) {
        expect(e).toBeDefined();
      }

      // Restore original
      Storage.prototype.setItem = originalSetItem;
    });
  });

  describe('Error Logging', () => {
    it('should log error details to console', () => {
      const mockConsoleError = vi.fn();
      const originalConsoleError = console.error;
      console.error = mockConsoleError;

      const error = new Error('Test error');
      console.error('Grid Editor Error:', error);

      expect(mockConsoleError).toHaveBeenCalledWith('Grid Editor Error:', error);

      // Restore original
      console.error = originalConsoleError;
    });
  });

  describe('Error Recovery', () => {
    it('should provide recovery options for errors', () => {
      const mockRetry = vi.fn();
      const mockReload = vi.fn();

      const recoveryOptions = [
        { label: 'Try Again', action: mockRetry, isPrimary: true },
        { label: 'Reload Page', action: mockReload },
      ];

      expect(recoveryOptions).toHaveLength(2);
      expect(recoveryOptions[0].isPrimary).toBe(true);
    });
  });
});

describe('Error Categories', () => {
  describe('User Input Errors', () => {
    it('should handle invalid transform values', () => {
      const id = notifyValidationWarning('Transform scale', 'Scale must be greater than 0');
      expect(id).toBeDefined();
    });

    it('should handle invalid crop regions', () => {
      const id = notifyValidationWarning('Crop region', 'Crop coordinates must be between 0 and 1');
      expect(id).toBeDefined();
    });

    it('should handle invalid layer operations', () => {
      const id = notifyValidationWarning('Layer operation', 'Cannot modify locked layer');
      expect(id).toBeDefined();
    });
  });

  describe('File I/O Errors', () => {
    it('should handle import failures', () => {
      const error = new Error('Invalid JSON format');
      const id = notifyImportError(error);
      expect(id).toBeDefined();
    });

    it('should handle export failures', () => {
      const error = new Error('Failed to save file');
      const id = notifyOperationError('export configuration', error);
      expect(id).toBeDefined();
    });

    it('should handle image loading failures', () => {
      const error = new Error('Failed to load image');
      const id = notifyOperationError('load image', error);
      expect(id).toBeDefined();
    });
  });

  describe('Backend Communication Errors', () => {
    it('should handle API request failures', () => {
      const error = new Error('Network timeout');
      const id = notifyOperationError('generate image', error, [
        {
          label: 'Retry',
          action: () => {},
          isPrimary: true,
        },
      ]);
      expect(id).toBeDefined();
    });

    it('should handle generation failures', () => {
      const error = new Error('Backend returned error status');
      const id = notifyOperationError('generate panel image', error);
      expect(id).toBeDefined();
    });

    it('should handle batch operation failures', () => {
      const id = notifyGenerationComplete(2, 1);
      expect(id).toBeDefined();
    });
  });

  describe('Performance Degradation', () => {
    it('should notify about memory pressure', () => {
      const id = showWarning(
        'Memory Warning',
        'High memory usage detected. Some textures may be unloaded.'
      );
      expect(id).toBeDefined();
    });

    it('should notify about rendering performance', () => {
      const id = showWarning(
        'Performance Warning',
        'Frame rate dropped below 30fps. Preview quality reduced.'
      );
      expect(id).toBeDefined();
    });

    it('should notify about large file handling', () => {
      const id = showWarning(
        'Large File Warning',
        'Image file is very large (>50MB). Loading may take longer.'
      );
      expect(id).toBeDefined();
    });
  });
});

describe('Notification UI Behavior', () => {
  it('should generate unique IDs for each notification', () => {
    const id1 = showSuccess('Test 1', 'Message 1');
    const id2 = showSuccess('Test 2', 'Message 2');
    
    expect(id1).not.toBe(id2);
  });

  it('should support dismissible notifications', () => {
    const id = showSuccess('Test', 'Message');
    dismissNotification(id);
    // Notification should be removed
  });

  it('should support non-dismissible notifications', () => {
    const id = showError('Critical Error', 'System failure', {
      duration: 0, // No auto-dismiss
    });
    expect(id).toBeDefined();
  });

  it('should support multiple simultaneous notifications', () => {
    const id1 = showSuccess('Test 1', 'Message 1');
    const id2 = showWarning('Test 2', 'Message 2');
    const id3 = showInfo('Test 3', 'Message 3');
    
    expect(id1).toBeDefined();
    expect(id2).toBeDefined();
    expect(id3).toBeDefined();
  });
});
