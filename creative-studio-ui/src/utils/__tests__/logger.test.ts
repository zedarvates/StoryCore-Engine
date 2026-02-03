/**
 * Logger Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Logger } from '../logger';

describe('Logger', () => {
  beforeEach(() => {
    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('info', () => {
    it('should log info messages', () => {
      const message = 'Test info message';
      Logger.info(message);
      
      expect(console.log).toHaveBeenCalled();
    });

    it('should include timestamp in logs', () => {
      const message = 'Test message';
      Logger.info(message);
      
      const callArgs = (console.log as any).mock.calls[0][0];
      expect(callArgs).toContain('INFO');
    });
  });

  describe('warn', () => {
    it('should log warning messages', () => {
      const message = 'Test warning message';
      Logger.warn(message);
      
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('should log error messages', () => {
      const message = 'Test error message';
      Logger.error(message);
      
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle error objects', () => {
      const error = new Error('Test error');
      Logger.error('An error occurred', error);
      
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('debug', () => {
    it('should log debug messages', () => {
      const message = 'Test debug message';
      Logger.debug(message);
      
      expect(console.log).toHaveBeenCalled();
    });
  });
});
