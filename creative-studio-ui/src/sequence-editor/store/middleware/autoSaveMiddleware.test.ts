import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadFromLocalStorage } from './autoSaveMiddleware';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('sequence editor snapshot recovery', () => {
  it.each(['2026-11-21T09:15:00.000Z', Date.UTC(2026, 10, 21, 9, 15)])(
    'normalizes the saved timestamp %s and retains the timeline',
    (timestamp) => {
      const snapshot = {
        version: '1.0',
        timestamp,
        project: {},
        timeline: { shots: [{ id: 'shot-1' }], tracks: [] },
        assets: { categories: [] },
        panels: {},
        tools: {},
      };
      const getItem = vi.fn().mockReturnValue(JSON.stringify(snapshot));
      vi.stubGlobal('localStorage', { getItem });

      expect(loadFromLocalStorage()).toEqual({
        ...snapshot,
        timestamp: Date.UTC(2026, 10, 21, 9, 15),
      });
      expect(getItem).toHaveBeenCalledWith('sequence-editor-project');
    },
  );

  it('rejects a snapshot with an unusable timeline', () => {
    vi.stubGlobal('localStorage', { getItem: () => '{"timeline":null}' });
    expect(loadFromLocalStorage()).toBeNull();
  });
});
