/**
 * useEventListener Hook Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEventListener, useResizeListener, useKeyboardListener } from '../useEventListener';

describe('useEventListener', () => {
  let addEventListenerSpy: any;
  let removeEventListenerSpy: any;

  beforeEach(() => {
    addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it('should add event listener on mount', () => {
    const handler = vi.fn();
    renderHook(() => useEventListener('resize', handler));

    expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('should remove event listener on unmount', () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() => useEventListener('resize', handler));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('should update handler on dependency change', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    const { rerender } = renderHook(
      ({ handler }) => useEventListener('resize', handler),
      { initialProps: { handler: handler1 } }
    );

    expect(addEventListenerSpy).toHaveBeenCalledTimes(1);

    rerender({ handler: handler2 });

    expect(removeEventListenerSpy).toHaveBeenCalledTimes(1);
    expect(addEventListenerSpy).toHaveBeenCalledTimes(2);
  });
});

describe('useResizeListener', () => {
  it('should attach resize listener', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const handler = vi.fn();

    renderHook(() => useResizeListener(handler));

    expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));

    addEventListenerSpy.mockRestore();
  });
});

describe('useKeyboardListener', () => {
  it('should attach keyboard listener', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const handler = vi.fn();

    renderHook(() => useKeyboardListener(handler));

    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

    addEventListenerSpy.mockRestore();
  });
});
