/**
 * useEventListener Hook
 * 
 * Safely attach and cleanup event listeners
 */
import { useEffect, useRef } from 'react';

type ListenerTarget = Window | Document | HTMLElement;
type BrowserEventMap = WindowEventMap & DocumentEventMap & HTMLElementEventMap;

/**
 * Hook to attach event listeners with automatic cleanup
 */
export function useEventListener<K extends keyof BrowserEventMap>(
  eventName: K,
  handler: (this: ListenerTarget, ev: BrowserEventMap[K]) => unknown,
  element: ListenerTarget = window,
  options?: boolean | AddEventListenerOptions
) {
  const savedHandler = useRef(handler);

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    const isSupported = element && element.addEventListener;
    if (!isSupported) return;

    const eventListener = (event: Event) => savedHandler.current.call(element, event as BrowserEventMap[K]);

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
    eventName: keyof BrowserEventMap;
    handler: (this: ListenerTarget, ev: BrowserEventMap[keyof BrowserEventMap]) => unknown;
    element?: ListenerTarget;
    options?: boolean | AddEventListenerOptions;
  }>
) {
  useEffect(() => {
    const cleanups: Array<() => void> = [];

    listeners.forEach(({ eventName, handler, element = window, options }) => {
      const eventListener = (event: Event) => handler.call(element, event);
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

