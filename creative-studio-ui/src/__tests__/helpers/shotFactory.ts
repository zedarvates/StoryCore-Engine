/**
 * Test helper for creating Shot objects with all required properties
 */

import type { Shot } from '@/types';

export interface CreateShotOptions {
  id?: string;
  sequenceId?: string;
  startTime?: number;
  duration?: number;
  prompt?: string;
  position?: number;
  title?: string;
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * Create a Shot object with all required properties for testing
 */
export function createTestShot(options: CreateShotOptions = {}): Shot {
  return {
    id: options.id || `shot-${Math.random().toString(36).substr(2, 9)}`,
    sequenceId: options.sequenceId || 'test-sequence',
    startTime: options.startTime ?? 0,
    duration: options.duration ?? 5,
    prompt: options.prompt || 'Test shot prompt',
    position: options.position ?? 0,
    title: options.title,
    description: options.description,
    promptValidation: {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
    },
    metadata: options.metadata || {},
    audioTracks: [],
    effects: [],
    textLayers: [],
    animations: [],
  };
}

/**
 * Create multiple test shots
 */
export function createTestShots(count: number, baseOptions: CreateShotOptions = {}): Shot[] {
  return Array.from({ length: count }, (_, index) =>
    createTestShot({
      ...baseOptions,
      id: `shot-${index + 1}`,
      position: index,
      startTime: index * (baseOptions.duration ?? 5),
    })
  );
}
