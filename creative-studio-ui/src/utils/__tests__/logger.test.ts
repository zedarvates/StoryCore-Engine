/**
 * Logger Tests
 */
import { LegacyAny } from '@/types/legacy';


import { describe, it, expect, beforeEach, vi } from 'vitest';
import { logger } from '../logger';

describe('Logger', () => {
  beforeEach(() => {
    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('info', () => {
    it('should log info messages', () => {
      const message = 'Test info message';
      logger.info(message);
      
      expect(console.info).toHaveBeenCalled();
    });

    it('should include the log level', () => {
      const message = 'Test message';
      logger.info(message);
      
      const callArgs = vi.mocked(console.info).mock.calls[0][0];
      expect(callArgs).toContain('INFO');
    });
  });

  describe('warn', () => {
    it('should log warning messages', () => {
      const message = 'Test warning message';
      logger.warn(message);
      
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('should log error messages', () => {
      const message = 'Test error message';
      logger.error(message);
      
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle error objects', () => {
      const error = new Error('Test error');
      logger.error('An error occurred', error);
      
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('debug', () => {
    it('should log debug messages', () => {
      const message = 'Test debug message';
      logger.debug(message);
      
      expect(console.log).toHaveBeenCalled();
    });
  });
});
