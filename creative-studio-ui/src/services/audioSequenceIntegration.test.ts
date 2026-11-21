import { describe, expect, it } from 'vitest';
import { audioSequenceIntegrationService } from './audioSequenceIntegration';

describe('sequence audio integration', () => {
  it('attaches every requested category and preserves the input shot', async () => {
    const input = {
      id: 'sequence',
      project_id: 'project',
      title: 'Original',
      shots: [{ id: 'shot', shot_type: 'dialogue', duration_seconds: 3, prompt: 'A line' }],
    };
    const { sequence, timeline } = await audioSequenceIntegrationService.applyAudioToSequence(
      input, { themes: ['Night'] }, ['music', 'voice'],
    );

    expect(sequence.title).toBe('Original');
    expect(sequence.shots[0].audio_tracks.map(track => track.type)).toEqual(
      expect.arrayContaining(['music', 'voice']),
    );
    expect(sequence.shots[0].audio_tracks.some(track => track.type === 'sfx')).toBe(false);
    expect(timeline.totalDuration).toBe(3);
    expect(input.shots[0]).not.toHaveProperty('audio_tracks');
  });
});
