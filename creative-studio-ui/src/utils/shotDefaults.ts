import type { Shot } from '@/types';

type StoryboardShotInput = Pick<Shot, 'id' | 'duration' | 'position' | 'startTime'> & Partial<Shot>;

export function createStoryboardShot(shot: StoryboardShotInput): Shot {
  return {
    ...shot,
    name: shot.name ?? shot.title ?? 'Untitled shot',
    prompt: shot.prompt ?? '',
    layers: shot.layers ?? [],
    referenceImages: shot.referenceImages ?? [],
    parameters: shot.parameters ?? {
      seed: -1,
      denoising: 0.7,
      steps: 20,
      guidance: 7.5,
      sampler: 'dpmpp_2m',
      scheduler: 'karras',
    },
  };
}
