import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useKeyframes } from '../useKeyframes';

describe('useKeyframes', () => {
  it('seeks to fractional and absolute keyframe times in time order', () => {
    const { result } = renderHook(() => useKeyframes({
      from: 0,
      to: 100,
      duration: 1000,
      keyframes: [
        { time: 750, value: 80 },
        { time: 0.25, value: 10 },
      ],
    }));

    act(() => result.current.seek(0.25));
    expect(result.current.value).toBe(10);

    act(() => result.current.seek(0.75));
    expect(result.current.value).toBe(80);
  });
});
