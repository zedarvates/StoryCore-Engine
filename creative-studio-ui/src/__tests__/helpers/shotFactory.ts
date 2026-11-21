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
 * Fill the required fields while preserving the optional fields supplied by a test.
 */
export function createShotFixture(overrides: Partial<Shot>): Shot {
  return {
    ...overrides,
    id: overrides.id ?? `shot-${Math.random().toString(36).slice(2, 11)}`,
    name: overrides.name ?? overrides.title ?? 'Test shot',
    duration: overrides.duration ?? 5,
    position: overrides.position ?? 0,
    startTime: overrides.startTime ?? 0,
    prompt: overrides.prompt ?? '',
    layers: overrides.layers ?? [],
    referenceImages: overrides.referenceImages ?? [],
    parameters: overrides.parameters ?? {
      seed: -1,
      denoising: 0.7,
      steps: 20,
      guidance: 7.5,
      sampler: 'dpmpp_2m',
      scheduler: 'karras',
    },
  };
}

/**
 * Create a Shot object with all required properties for testing
 */
export function createTestShot(options: CreateShotOptions = {}): Shot {
  return createShotFixture({
    id: options.id || undefined,
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
  });
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
