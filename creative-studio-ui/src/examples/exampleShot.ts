import type { Shot } from '@/types';

export function exampleShot(
  fields: Pick<Shot, 'id' | 'duration' | 'position'> & Partial<Shot>,
): Shot {
  return {
    name: fields.title ?? fields.id,
    prompt: fields.description ?? '',
    startTime: 0,
    parameters: { seed: -1, denoising: 0.75, steps: 20, guidance: 7.5, sampler: 'euler', scheduler: 'normal' },
    layers: [],
    referenceImages: [],
    ...fields,
  };
}
