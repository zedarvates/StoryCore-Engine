import { expect, it, vi } from 'vitest';
import { readEffectNumber, selectEffectOption } from './effectParameterValues';

it('reads valid numeric parameters and uses the fallback for invalid values', () => {
  expect(readEffectNumber('7.5')).toBe(7.5);
  expect(readEffectNumber(0, 100)).toBe(0);
  expect(readEffectNumber(true, 100)).toBe(100);
  expect(readEffectNumber(Number.POSITIVE_INFINITY, 100)).toBe(100);
});

it('retains a numeric option value when selected in a browser', () => {
  const onChange = vi.fn();
  selectEffectOption({
    id: 'quality', name: 'Quality', type: 'select', value: 1,
    options: [{ label: 'Low', value: 1 }, { label: 'High', value: 2 }],
  }, '2', onChange);
  expect(onChange).toHaveBeenCalledWith(2);
});
