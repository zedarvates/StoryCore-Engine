import { afterEach, expect, it } from 'vitest';
import { features } from './browserCompat';

const probeKey = '__storycore_storage_probe__';

afterEach(() => localStorage.removeItem(probeKey));

it('reports writable storage and preserves the previous probe value', () => {
  expect(features.localStorage()).toBe(true);
  expect(localStorage.getItem(probeKey)).toBeNull();

  localStorage.setItem(probeKey, 'saved value');
  expect(features.localStorage()).toBe(true);
  expect(localStorage.getItem(probeKey)).toBe('saved value');
});
