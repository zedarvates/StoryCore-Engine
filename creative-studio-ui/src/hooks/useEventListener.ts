/**
 * useEventListener Hook
 * 
 * Safely attach and cleanup event listeners
 */

import { useEffect, useRef } from 'react';

/**
 * Hook to attach event listeners with automatic cleanup
 */
export function useEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  handler: (this: Window, ev: WindowEventMap[K]) => any,
  element: Window | Document | HTMLElement = window,
  options?: boolean | AddEventListenerOptions
) {
  const savedHandler = useRef(handler);

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    const isSupported = element && element.addEventListener;
    if (!isSupported) return;

    const eventListener = (event: Event) => savedHandler.current(event as any);

    element.addEventListener(eventName, eventListener, options);

    return () => {
      element.removeEventListener(eventName, eventListener, options);
    };
  }, [eventName, element, options]);
}

/**
 * Hook to attach multiple event listeners
 */
export function useEventListeners(
  listeners: Array<{
    eventName: keyof WindowEventMap;
    handler: (this: Window, ev: WindowEventMap[keyof WindowEventMap]) => any;
    element?: Window | Document | HTMLElement;
    options?: boolean | AddEventListenerOptions;
  }>
) {
  useEffect(() => {
    const cleanups: Array<() => void> = [];

    listeners.forEach(({ eventName, handler, element = window, options }) => {
      const eventListener = (event: Event) => handler(event as any);
      element.addEventListener(eventName, eventListener, options);
      cleanups.push(() => {
        element.removeEventListener(eventName, eventListener, options);
      });
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [listeners]);
}

/**
 * Hook to attach a resize listener with automatic cleanup
 */
export function useResizeListener(handler: () => void, element: Window | HTMLElement = window) {
  useEventListener('resize', () => handler(), element);
}

/**
 * Hook to attach a keyboard listener with automatic cleanup
 */
export function useKeyboardListener(
  handler: (event: KeyboardEvent) => void,
  options?: boolean | AddEventListenerOptions
) {
  useEventListener('keydown', (event) => handler(event as KeyboardEvent), window, options);
}

/**
 * Hook to attach a storage listener with automatic cleanup
 */
export function useStorageListener(handler: (event: StorageEvent) => void) {
  useEventListener('storage', (event) => handler(event as StorageEvent), window);
}

/**
 * Hook to attach a visibility change listener
 */
export function useVisibilityListener(handler: () => void) {
  useEventListener('visibilitychange', () => handler(), document);
}

/**
 * Hook to attach a beforeunload listener
 */
export function useBeforeUnloadListener(handler: (event: BeforeUnloadEvent) => void) {
  useEventListener('beforeunload', (event) => handler(event as BeforeUnloadEvent), window);
}
