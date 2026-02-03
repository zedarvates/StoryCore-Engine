/**
 * Unit tests for Global Error Handler
 * 
 * Requirements: 2.3
 * Phase 2: Advanced Diagnostics
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { globalErrorHandler, type ErrorContext } from '../globalErrorHandler';
import type { FeedbackInitialContext } from '@/components/feedback/types';

describe('GlobalErrorHandler', () => {
  let mockOpenFeedbackPanel: ReturnType<typeof vi.fn>;
  let originalConsoleError: typeof console.error;
  let originalConsoleLog: typeof console.log;
  let originalConsoleWarn: typeof console.warn;

  beforeEach(() => {
    // Mock console methods to avoid noise in test output
    originalConsoleError = console.error;
    originalConsoleLog = console.log;
    originalConsoleWarn = console.warn;
    console.error = vi.fn();
    console.log = vi.fn();
    console.warn = vi.fn();

    // Create mock callback
    mockOpenFeedbackPanel = vi.fn();

    // Clear error history
    globalErrorHandler.clearErrorHistory();
  });

  afterEach(() => {
    // Restore console methods
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;

    // Cleanup error handler
    globalErrorHandler.cleanup();
  });

  describe('initialization', () => {
    it('should initialize successfully', () => {
      globalErrorHandler.initialize(mockOpenFeedbackPanel);
      
      expect(console.log).toHaveBeenCalledWith('GlobalErrorHandler initialized');
    });

    it('should warn if already initialized', () => {
      globalErrorHandler.initialize(mockOpenFeedbackPanel);
      globalErrorHandler.initialize(mockOpenFeedbackPanel);
      
      expect(console.warn).toHaveBeenCalledWith('GlobalErrorHandler already initialized');
    });

    it('should register error handlers', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      
      globalErrorHandler.initialize(mockOpenFeedbackPanel);
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('error', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
      
      addEventListenerSpy.mockRestore();
    });
  });

  describe('cleanup', () => {
    it('should remove event listeners', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      
      globalErrorHandler.initialize(mockOpenFeedbackPanel);
      globalErrorHandler.cleanup();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('error', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
      expect(console.log).toHaveBeenCalledWith('GlobalErrorHandler cleaned up');
      
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('handleReactError', () => {
    it('should capture React error and open feedback panel', () => {
      globalErrorHandler.initialize(mockOpenFeedbackPanel);
      
      const error = new Error('Test React error');
      error.stack = 'Error: Test React error\n    at Component (file.tsx:10:5)';
      const errorInfo = {
        componentStack: '\n    in Component (at App.tsx:20)\n    in App',
      };
      
      globalErrorHandler.handleReactError(error, errorInfo);
      
      // Should open feedback panel
      expect(mockOpenFeedbackPanel).toHaveBeenCalledTimes(1);
      
      const callArgs = mockOpenFeedbackPanel.mock.calls[0][0] as FeedbackInitialContext;
      expect(callArgs.errorMessage).toContain('React Component Error');
      expect(callArgs.errorMessage).toContain('Test React error');
      expect(callArgs.stackTrace).toContain('Stack Trace:');
      expect(callArgs.stackTrace).toContain('Component Stack:');
      expect(callArgs.activeModule).toBeDefined();
    });

    it('should add error to history', () => {
      globalErrorHandler.initialize(mockOpenFeedbackPanel);
      
      const error = new Error('Test error');
      const errorInfo = { componentStack: '' };
      
      globalErrorHandler.handleReactError(error, errorInfo);
      
      const history = globalErrorHandler.getErrorHistory();
      expect(history).toHaveLength(1);
      expect(history[0].message).toBe('Test error');
      expect(history[0].errorType).toBe('react');
    });
  });

  describe('window error handling', () => {
    it('should capture window errors', () => {
      globalErrorHandler.initialize(mockOpenFeedbackPanel);
      
      const error = new Error('Test window error');
      error.stack = 'Error: Test window error\n    at file.js:10:5';
      
      const errorEvent = new ErrorEvent('error', {
        message: 'Test window error',
        error,
      });
      
      window.dispatchEvent(errorEvent);
      
      // Should open feedback panel
      expect(mockOpenFeedbackPanel).toHaveBeenCalledTimes(1);
      
      const callArgs = mockOpenFeedbackPanel.mock.calls[0][0] as FeedbackInitialContext;
      expect(callArgs.errorMessage).toContain('Uncaught JavaScript Error');
      expect(callArgs.errorMessage).toContain('Test window error');
    });
  });

  describe('promise rejection handling', () => {
    it('should capture unhandled promise rejections', () => {
      globalErrorHandler.initialize(mockOpenFeedbackPanel);
      
      const error = new Error('Test promise rejection');
      error.stack = 'Error: Test promise rejection\n    at async.js:10:5';
      
      const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.reject(error),
        reason: error,
      });
      
      window.dispatchEvent(rejectionEvent);
      
      // Should open feedback panel
      expect(mockOpenFeedbackPanel).toHaveBeenCalledTimes(1);
      
      const callArgs = mockOpenFeedbackPanel.mock.calls[0][0] as FeedbackInitialContext;
      expect(callArgs.errorMessage).toContain('Unhandled Promise Rejection');
      expect(callArgs.errorMessage).toContain('Test promise rejection');
    });

    it('should handle non-Error promise rejections', () => {
      globalErrorHandler.initialize(mockOpenFeedbackPanel);
      
      const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.reject('String rejection'),
        reason: 'String rejection',
      });
      
      window.dispatchEvent(rejectionEvent);
      
      expect(mockOpenFeedbackPanel).toHaveBeenCalledTimes(1);
      
      const callArgs = mockOpenFeedbackPanel.mock.calls[0][0] as FeedbackInitialContext;
      expect(callArgs.errorMessage).toContain('String rejection');
    });
  });

  describe('error history', () => {
    it('should maintain error history', () => {
      globalErrorHandler.initialize(mockOpenFeedbackPanel);
      
      // Add multiple errors
      for (let i = 0; i < 5; i++) {
        const error = new Error(`Error ${i}`);
        globalErrorHandler.handleReactError(error, { componentStack: '' });
      }
      
      const history = globalErrorHandler.getErrorHistory();
      expect(history).toHaveLength(5);
      expect(history[0].message).toBe('Error 0');
      expect(history[4].message).toBe('Error 4');
    });

    it('should limit history size to 10 errors', () => {
      globalErrorHandler.initialize(mockOpenFeedbackPanel);
      
      // Add more than 10 errors
      for (let i = 0; i < 15; i++) {
        const error = new Error(`Error ${i}`);
        globalErrorHandler.handleReactError(error, { componentStack: '' });
      }
      
      const history = globalErrorHandler.getErrorHistory();
      expect(history).toHaveLength(10);
      // Should keep the most recent 10
      expect(history[0].message).toBe('Error 5');
      expect(history[9].message).toBe('Error 14');
    });

    it('should clear error history', () => {
      globalErrorHandler.initialize(mockOpenFeedbackPanel);
      
      const error = new Error('Test error');
      globalErrorHandler.handleReactError(error, { componentStack: '' });
      
      expect(globalErrorHandler.getErrorHistory()).toHaveLength(1);
      
      globalErrorHandler.clearErrorHistory();
      
      expect(globalErrorHandler.getErrorHistory()).toHaveLength(0);
    });
  });

  describe('module detection', () => {
    it('should detect editor module from URL', () => {
      // Mock window.location
      delete (window as any).location;
      window.location = { pathname: '/editor/sequence-1' } as any;
      
      globalErrorHandler.initialize(mockOpenFeedbackPanel);
      
      const error = new Error('Test error');
      globalErrorHandler.handleReactError(error, { componentStack: '' });
      
      const callArgs = mockOpenFeedbackPanel.mock.calls[0][0] as FeedbackInitialContext;
      expect(callArgs.activeModule).toBe('editor');
    });

    it('should detect dashboard module from URL', () => {
      delete (window as any).location;
      window.location = { pathname: '/dashboard' } as any;
      
      globalErrorHandler.initialize(mockOpenFeedbackPanel);
      
      const error = new Error('Test error');
      globalErrorHandler.handleReactError(error, { componentStack: '' });
      
      const callArgs = mockOpenFeedbackPanel.mock.calls[0][0] as FeedbackInitialContext;
      expect(callArgs.activeModule).toBe('dashboard');
    });

    it('should default to creative-studio-ui for unknown paths', () => {
      delete (window as any).location;
      window.location = { pathname: '/' } as any;
      
      globalErrorHandler.initialize(mockOpenFeedbackPanel);
      
      const error = new Error('Test error');
      globalErrorHandler.handleReactError(error, { componentStack: '' });
      
      const callArgs = mockOpenFeedbackPanel.mock.calls[0][0] as FeedbackInitialContext;
      expect(callArgs.activeModule).toBe('creative-studio-ui');
    });
  });

  describe('error formatting', () => {
    it('should format error message with timestamp', () => {
      globalErrorHandler.initialize(mockOpenFeedbackPanel);
      
      const error = new Error('Test error');
      globalErrorHandler.handleReactError(error, { componentStack: '' });
      
      const callArgs = mockOpenFeedbackPanel.mock.calls[0][0] as FeedbackInitialContext;
      expect(callArgs.errorMessage).toMatch(/React Component Error \(\d{1,2}:\d{2}:\d{2} [AP]M\)/);
    });

    it('should include component stack in stack trace', () => {
      globalErrorHandler.initialize(mockOpenFeedbackPanel);
      
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at Component';
      const errorInfo = {
        componentStack: '\n    in Component\n    in App',
      };
      
      globalErrorHandler.handleReactError(error, errorInfo);
      
      const callArgs = mockOpenFeedbackPanel.mock.calls[0][0] as FeedbackInitialContext;
      expect(callArgs.stackTrace).toContain('Stack Trace:');
      expect(callArgs.stackTrace).toContain('Component Stack:');
      expect(callArgs.stackTrace).toContain('in Component');
    });
  });
});
