import { afterEach, describe, expect, it } from 'vitest';
import type { Shot } from '../../types';
import { ClipboardManager } from './ClipboardManager';

const clipboard = ClipboardManager.getInstance();

afterEach(() => {
  clipboard.clear();
});

describe('copying a shot between sequences', () => {
  it('accepts a shot without optional tracks, effects, text layers or animations', () => {
    const shot: Shot = {
      id: 'original',
      name: 'First shot',
      prompt: 'An establishing shot',
      position: 0,
      startTime: 0,
      duration: 3,
      parameters: { seed: -1, denoising: 0.75, steps: 20, guidance: 7.5, sampler: 'euler', scheduler: 'normal' },
      layers: [],
      referenceImages: [],
    };
    clipboard.copy([shot], 'source');

    const result = clipboard.paste({ targetSequenceId: 'target', position: 1, validateCompatibility: true });

    expect(result.success).toBe(true);
    expect(result.errors).toBeUndefined();
    expect(result.pastedShots[0]).toMatchObject({ name: shot.name, prompt: shot.prompt, position: 1 });
    expect(result.pastedShots[0].id).not.toBe(shot.id);
    expect(shot.position).toBe(0);
  });
});
