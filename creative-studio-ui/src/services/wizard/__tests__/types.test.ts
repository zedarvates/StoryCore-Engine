/**
 * Wizard Types Tests
 * 
 * Tests for WizardError class and type definitions
 */

import { describe, it, expect } from 'vitest';
import { WizardError } from '../types';

describe('WizardError', () => {
  it('should create error with all properties', () => {
    const error = new WizardError(
      'Test error',
      'connection',
      true,
      true,
      { endpoint: 'http://localhost:11434' }
    );

    expect(error.message).toBe('Test error');
    expect(error.category).toBe('connection');
    expect(error.recoverable).toBe(true);
    expect(error.retryable).toBe(true);
    expect(error.details).toEqual({ endpoint: 'http://localhost:11434' });
    expect(error.timestamp).toBeInstanceOf(Date);
  });

  it('should use default values for optional parameters', () => {
    const error = new WizardError('Test error', 'validation');

    expect(error.recoverable).toBe(true);
    expect(error.retryable).toBe(true);
    expect(error.details).toBeUndefined();
  });

  it('should generate user-friendly messages for connection errors', () => {
    const error = new WizardError(
      'Connection failed',
      'connection',
      true,
      true,
      { service: 'Ollama', endpoint: 'http://localhost:11434' }
    );

    const userMessage = error.getUserMessage();
    expect(userMessage).toContain('Connection failed');
    expect(userMessage).toContain('Ollama');
    expect(userMessage).toContain('http://localhost:11434');
  });

  it('should generate user-friendly messages for validation errors', () => {
    const error = new WizardError('Invalid input', 'validation');

    const userMessage = error.getUserMessage();
    expect(userMessage).toContain('Invalid input');
    expect(userMessage).toContain('review your input');
  });

  it('should generate user-friendly messages for generation errors', () => {
    const error = new WizardError('Generation failed', 'generation');

    const userMessage = error.getUserMessage();
    expect(userMessage).toContain('Generation failed');
    expect(userMessage).toContain('retry');
  });

  it('should generate user-friendly messages for filesystem errors', () => {
    const error = new WizardError('File write failed', 'filesystem');

    const userMessage = error.getUserMessage();
    expect(userMessage).toContain('File write failed');
    expect(userMessage).toContain('permissions');
  });

  it('should generate user-friendly messages for datacontract errors', () => {
    const error = new WizardError('Schema validation failed', 'datacontract');

    const userMessage = error.getUserMessage();
    expect(userMessage).toContain('Schema validation failed');
    expect(userMessage).toContain('format');
  });

  it('should generate user-friendly messages for timeout errors', () => {
    const error = new WizardError('Operation timed out', 'timeout');

    const userMessage = error.getUserMessage();
    expect(userMessage).toContain('Operation timed out');
    expect(userMessage).toContain('try again');
  });

  it('should convert to JSON', () => {
    const error = new WizardError(
      'Test error',
      'connection',
      true,
      true,
      { test: 'data' }
    );

    const json = error.toJSON();

    expect(json.name).toBe('WizardError');
    expect(json.message).toBe('Test error');
    expect(json.category).toBe('connection');
    expect(json.recoverable).toBe(true);
    expect(json.retryable).toBe(true);
    expect(json.details).toEqual({ test: 'data' });
    expect(json.timestamp).toBeDefined();
  });

  it('should be instanceof Error', () => {
    const error = new WizardError('Test', 'unknown');
    expect(error).toBeInstanceOf(Error);
  });

  it('should have correct name', () => {
    const error = new WizardError('Test', 'unknown');
    expect(error.name).toBe('WizardError');
  });
});
