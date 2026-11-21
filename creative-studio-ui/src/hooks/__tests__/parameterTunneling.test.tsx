import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ParameterKeyframe } from '../../types/parameter-tunneling';
import { useKeyframes, useTunneledParameter } from '../useParameterTunneling';

const keyframes: ParameterKeyframe<number>[] = [
  { id: 'first', time: 10, value: 2, easing: { type: 'linear' } },
  { id: 'last', time: 20, value: 6, easing: { type: 'linear' } },
];

describe('parameter tunneling hooks', () => {
  it('reports new values and preserves them across renders with the same settings', () => {
    const { result, rerender, unmount } = renderHook(() => useTunneledParameter('test-opacity', 0, { max: 1 }));
    act(() => result.current.setValue(0.5));
    rerender();
    expect(result.current.value).toBe(0.5);
    unmount();
  });

  it('clamps before and after the saved interval and interpolates between the keyframes', () => {
    const { result } = renderHook(() => useKeyframes('test-animation', keyframes));
    expect(result.current.getValueAtTime(0)).toBe(2);
    expect(result.current.getValueAtTime(15)).toBe(4);
    expect(result.current.getValueAtTime(30)).toBe(6);
  });
});
