/**
 * Tests for useFilePolling Hook
 * 
 * Tests the polling interval management functionality including:
 * - 2-second polling with cleanup on unmount
 * - Manual refresh trigger
 * - Stop polling when file detected or wizard closed
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFilePolling } from '../useFilePolling';

describe('useFilePolling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with default options', () => {
      const onPoll = vi.fn();
      const { result } = renderHook(() => useFilePolling({ onPoll }));

      expect(result.current.isPolling).toBe(true);
      expect(result.current.refresh).toBeDefined();
      expect(result.current.start).toBeDefined();
      expect(result.current.stop).toBeDefined();
    });

    it('should call onPoll immediately on mount when enabled', () => {
      const onPoll = vi.fn();
      renderHook(() => useFilePolling({ onPoll, enabled: true }));

      expect(onPoll).toHaveBeenCalledTimes(1);
    });

    it('should not call onPoll when disabled', () => {
      const onPoll = vi.fn();
      renderHook(() => useFilePolling({ onPoll, enabled: false }));

      expect(onPoll).not.toHaveBeenCalled();
    });

    it('should not start polling when stopCondition is true', () => {
      const onPoll = vi.fn();
      const { result } = renderHook(() =>
        useFilePolling({ onPoll, stopCondition: true })
      );

      expect(result.current.isPolling).toBe(false);
      expect(onPoll).not.toHaveBeenCalled();
    });
  });

  describe('polling interval', () => {
    it('should poll at 2-second intervals by default', () => {
      const onPoll = vi.fn();
      renderHook(() => useFilePolling({ onPoll }));

      // Initial call
      expect(onPoll).toHaveBeenCalledTimes(1);

      // Advance time by 2 seconds
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(onPoll).toHaveBeenCalledTimes(2);

      // Advance time by another 2 seconds
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(onPoll).toHaveBeenCalledTimes(3);
    });

    it('should poll at custom interval when specified', () => {
      const onPoll = vi.fn();
      renderHook(() => useFilePolling({ onPoll, interval: 5000 }));

      // Initial call
      expect(onPoll).toHaveBeenCalledTimes(1);

      // Advance time by 5 seconds
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(onPoll).toHaveBeenCalledTimes(2);

      // Advance time by another 5 seconds
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(onPoll).toHaveBeenCalledTimes(3);
    });

    it('should maintain consistent polling interval', () => {
      const onPoll = vi.fn();
      renderHook(() => useFilePolling({ onPoll, interval: 2000 }));

      // Initial call
      expect(onPoll).toHaveBeenCalledTimes(1);

      // Advance time in smaller increments
      for (let i = 0; i < 10; i++) {
        act(() => {
          vi.advanceTimersByTime(2000);
        });
      }

      // Should have been called 11 times (1 initial + 10 intervals)
      expect(onPoll).toHaveBeenCalledTimes(11);
    });
  });

  describe('manual refresh', () => {
    it('should trigger onPoll immediately when refresh is called', () => {
      const onPoll = vi.fn();
      const { result } = renderHook(() => useFilePolling({ onPoll }));

      // Initial call
      expect(onPoll).toHaveBeenCalledTimes(1);

      // Manual refresh
      act(() => {
        result.current.refresh();
      });

      expect(onPoll).toHaveBeenCalledTimes(2);
    });

    it('should not affect polling interval when refresh is called', () => {
      const onPoll = vi.fn();
      const { result } = renderHook(() => useFilePolling({ onPoll, interval: 2000 }));

      // Initial call
      expect(onPoll).toHaveBeenCalledTimes(1);

      // Advance time by 1 second
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Manual refresh
      act(() => {
        result.current.refresh();
      });

      expect(onPoll).toHaveBeenCalledTimes(2);

      // Advance time by 1 more second (total 2 seconds from start)
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Should have interval call
      expect(onPoll).toHaveBeenCalledTimes(3);
    });

    it('should work when polling is disabled', () => {
      const onPoll = vi.fn();
      const { result } = renderHook(() => useFilePolling({ onPoll, enabled: false }));

      expect(onPoll).not.toHaveBeenCalled();

      // Manual refresh should still work
      act(() => {
        result.current.refresh();
      });

      expect(onPoll).toHaveBeenCalledTimes(1);
    });
  });

  describe('stop condition', () => {
    it('should stop polling when stopCondition becomes true', () => {
      const onPoll = vi.fn();
      const { rerender } = renderHook(
        ({ stopCondition }) => useFilePolling({ onPoll, stopCondition }),
        { initialProps: { stopCondition: false } }
      );

      // Initial call
      expect(onPoll).toHaveBeenCalledTimes(1);

      // Advance time
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(onPoll).toHaveBeenCalledTimes(2);

      // Update stopCondition to true
      rerender({ stopCondition: true });

      // Advance time - should not poll anymore
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(onPoll).toHaveBeenCalledTimes(2);
    });

    it('should resume polling when stopCondition becomes false again', () => {
      const onPoll = vi.fn();
      const { rerender } = renderHook(
        ({ stopCondition }) => useFilePolling({ onPoll, stopCondition }),
        { initialProps: { stopCondition: true } }
      );

      // Should not poll when stopCondition is true
      expect(onPoll).not.toHaveBeenCalled();

      // Update stopCondition to false
      rerender({ stopCondition: false });

      // Should start polling
      expect(onPoll).toHaveBeenCalledTimes(1);

      // Advance time
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(onPoll).toHaveBeenCalledTimes(2);
    });
  });

  describe('enabled state', () => {
    it('should stop polling when enabled becomes false', () => {
      const onPoll = vi.fn();
      const { rerender } = renderHook(
        ({ enabled }) => useFilePolling({ onPoll, enabled }),
        { initialProps: { enabled: true } }
      );

      // Initial call
      expect(onPoll).toHaveBeenCalledTimes(1);

      // Advance time
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(onPoll).toHaveBeenCalledTimes(2);

      // Disable polling
      rerender({ enabled: false });

      // Advance time - should not poll anymore
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(onPoll).toHaveBeenCalledTimes(2);
    });

    it('should resume polling when enabled becomes true again', () => {
      const onPoll = vi.fn();
      const { rerender } = renderHook(
        ({ enabled }) => useFilePolling({ onPoll, enabled }),
        { initialProps: { enabled: false } }
      );

      // Should not poll when disabled
      expect(onPoll).not.toHaveBeenCalled();

      // Enable polling
      rerender({ enabled: true });

      // Should start polling
      expect(onPoll).toHaveBeenCalledTimes(1);

      // Advance time
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(onPoll).toHaveBeenCalledTimes(2);
    });
  });

  describe('start and stop methods', () => {
    it('should stop polling when stop is called', () => {
      const onPoll = vi.fn();
      const { result } = renderHook(() => useFilePolling({ onPoll }));

      // Initial call
      expect(onPoll).toHaveBeenCalledTimes(1);
      expect(result.current.isPolling).toBe(true);

      // Stop polling
      act(() => {
        result.current.stop();
      });

      expect(result.current.isPolling).toBe(false);

      // Advance time - should not poll anymore
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(onPoll).toHaveBeenCalledTimes(1);
    });

    it('should start polling when start is called', () => {
      const onPoll = vi.fn();
      const { result } = renderHook(() => useFilePolling({ onPoll, enabled: false }));

      // Should not poll when disabled
      expect(onPoll).not.toHaveBeenCalled();
      expect(result.current.isPolling).toBe(false);

      // Start polling manually
      act(() => {
        result.current.start();
      });

      expect(result.current.isPolling).toBe(true);

      // Advance time
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(onPoll).toHaveBeenCalledTimes(1);
    });

    it('should not start polling if stopCondition is true', () => {
      const onPoll = vi.fn();
      const { result } = renderHook(() =>
        useFilePolling({ onPoll, enabled: false, stopCondition: true })
      );

      // Try to start polling
      act(() => {
        result.current.start();
      });

      expect(result.current.isPolling).toBe(false);
      expect(onPoll).not.toHaveBeenCalled();
    });
  });

  describe('cleanup on unmount', () => {
    it('should stop polling when component unmounts', () => {
      const onPoll = vi.fn();
      const { unmount } = renderHook(() => useFilePolling({ onPoll }));

      // Initial call
      expect(onPoll).toHaveBeenCalledTimes(1);

      // Advance time
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(onPoll).toHaveBeenCalledTimes(2);

      // Unmount
      unmount();

      // Advance time - should not poll anymore
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(onPoll).toHaveBeenCalledTimes(2);
    });

    it('should clear interval on unmount', () => {
      const onPoll = vi.fn();
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      
      const { unmount } = renderHook(() => useFilePolling({ onPoll }));

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('async onPoll callback', () => {
    it('should handle async onPoll callback', () => {
      const onPoll = vi.fn().mockResolvedValue(undefined);
      renderHook(() => useFilePolling({ onPoll }));

      // Initial call
      expect(onPoll).toHaveBeenCalledTimes(1);

      // Advance time
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(onPoll).toHaveBeenCalledTimes(2);
    });

    it('should continue polling even if onPoll throws error', () => {
      const onPoll = vi.fn().mockRejectedValue(new Error('Test error'));
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderHook(() => useFilePolling({ onPoll }));

      // Initial call
      expect(onPoll).toHaveBeenCalledTimes(1);

      // Advance time
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(onPoll).toHaveBeenCalledTimes(2);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('isPolling state', () => {
    it('should reflect polling state correctly', () => {
      const onPoll = vi.fn();
      const { result } = renderHook(() => useFilePolling({ onPoll }));

      expect(result.current.isPolling).toBe(true);

      act(() => {
        result.current.stop();
      });

      expect(result.current.isPolling).toBe(false);

      act(() => {
        result.current.start();
      });

      expect(result.current.isPolling).toBe(true);
    });

    it('should be false when disabled', () => {
      const onPoll = vi.fn();
      const { result } = renderHook(() => useFilePolling({ onPoll, enabled: false }));

      expect(result.current.isPolling).toBe(false);
    });

    it('should be false when stopCondition is true', () => {
      const onPoll = vi.fn();
      const { result } = renderHook(() =>
        useFilePolling({ onPoll, stopCondition: true })
      );

      expect(result.current.isPolling).toBe(false);
    });
  });

  describe('Requirements 3.1 and 2.5', () => {
    it('should implement 2-second polling interval (Requirement 3.1)', () => {
      const onPoll = vi.fn();
      renderHook(() => useFilePolling({ onPoll }));

      // Initial call
      expect(onPoll).toHaveBeenCalledTimes(1);

      // Verify 2-second interval
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(onPoll).toHaveBeenCalledTimes(2);
    });

    it('should provide manual refresh trigger (Requirement 2.5)', () => {
      const onPoll = vi.fn();
      const { result } = renderHook(() => useFilePolling({ onPoll }));

      // Initial call
      expect(onPoll).toHaveBeenCalledTimes(1);

      // Manual refresh
      act(() => {
        result.current.refresh();
      });

      expect(onPoll).toHaveBeenCalledTimes(2);
    });

    it('should stop polling when file detected (Requirement 3.1)', () => {
      const onPoll = vi.fn();
      const { rerender } = renderHook(
        ({ fileDetected }) => useFilePolling({ onPoll, stopCondition: fileDetected }),
        { initialProps: { fileDetected: false } }
      );

      // Initial call
      expect(onPoll).toHaveBeenCalledTimes(1);

      // Simulate file detected
      rerender({ fileDetected: true });

      // Advance time - should not poll anymore
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(onPoll).toHaveBeenCalledTimes(1);
    });

    it('should stop polling when wizard closed (Requirement 3.1)', () => {
      const onPoll = vi.fn();
      const { rerender } = renderHook(
        ({ wizardOpen }) => useFilePolling({ onPoll, enabled: wizardOpen }),
        { initialProps: { wizardOpen: true } }
      );

      // Initial call
      expect(onPoll).toHaveBeenCalledTimes(1);

      // Simulate wizard closed
      rerender({ wizardOpen: false });

      // Advance time - should not poll anymore
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(onPoll).toHaveBeenCalledTimes(1);
    });

    it('should cleanup on unmount (Requirement 3.1)', () => {
      const onPoll = vi.fn();
      const { unmount } = renderHook(() => useFilePolling({ onPoll }));

      // Initial call
      expect(onPoll).toHaveBeenCalledTimes(1);

      // Unmount
      unmount();

      // Advance time - should not poll anymore
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(onPoll).toHaveBeenCalledTimes(1);
    });
  });
});
