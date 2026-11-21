/**
 * Debounce and Throttle Utilities
 * 
 * Unified implementations for debouncing and throttling function calls.
 * Consolidates duplicate implementations from multiple files.
 */

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 */
export function debounce<Args extends unknown[], Result>(
  func: (...args: Args) => Result,
  wait: number
): (...args: Args) => void {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  
  return (...args: Args) => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = undefined;
    }, wait);
  };
}

/**
 * Creates a debounced version of a function with immediate execution option
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to wait
 * @param immediate - Whether to execute the function immediately on the leading edge
 * @returns A debounced version of the function
 */
export function debounceWithImmediate<Args extends unknown[], Result>(
  func: (...args: Args) => Result,
  wait: number,
  immediate: boolean = false
): (...args: Args) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Args) {
    const later = () => {
      timeout = null;
      if (!immediate) {
        func(...args);
      }
    };

    const callNow = immediate && !timeout;
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);

    if (callNow) {
      func(...args);
    }
  };
}

/**
 * Creates a throttled function that only invokes func at most once per every wait milliseconds.
 * Calls run on the leading edge; suppressed calls are not queued for a trailing invocation.
 */
export function throttle<Args extends unknown[], Result>(
  func: (...args: Args) => Result,
  limit: number
): (...args: Args) => void {
  let inThrottle = false;
  
  return (...args: Args) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
