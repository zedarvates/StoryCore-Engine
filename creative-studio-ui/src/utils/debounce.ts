/**
 * Debounce Utility
 * 
 * Delays function execution until after a specified wait time has elapsed
 * since the last time the function was called.
 * 
 * This module now re-exports from the unified debounceAndThrottle module.
 * For new code, consider importing directly from debounceAndThrottle.ts.
 */

export { 
  debounce, 
  debounceWithImmediate, 
  throttle 
} from './debounceAndThrottle';
