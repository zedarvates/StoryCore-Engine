/**
 * useProgressiveImageLoading Hook
 * 
 * React hook for progressive image loading with automatic state management
 * Provides low-resolution preview first, then progressively loads higher resolutions
 * 
 * Requirements: 13.1, 13.2, 13.3
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { imageLoader, ImageData } from '../services/gridEditor/ImageLoaderService';

export interface ProgressiveImageState {
  currentImage: ImageData | null;
  isLoading: boolean;
  isFullResolution: boolean;
  error: Error | null;
  progress: number; // 0-100
}

export interface UseProgressiveImageLoadingOptions {
  enabled?: boolean;
  zoom?: number; // Current zoom level for mipmap selection
}

/**
 * Hook for loading a single image progressively
 */
export function useProgressiveImageLoading(
  url: string | null,
  options: UseProgressiveImageLoadingOptions = {}
): ProgressiveImageState {
  const { enabled = true, zoom = 1.0 } = options;

  const [state, setState] = useState<ProgressiveImageState>({
    currentImage: null,
    isLoading: false,
    isFullResolution: false,
    error: null,
    progress: 0,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!url || !enabled) {
      setState({
        currentImage: null,
        isLoading: false,
        isFullResolution: false,
        error: null,
        progress: 0,
      });
      return;
    }

    // Create abort controller for cleanup
    abortControllerRef.current = new AbortController();
    const abortSignal = abortControllerRef.current.signal;

    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    // Load image progressively
    imageLoader
      .loadImageProgressively(url, (imageData) => {
        if (abortSignal.aborted) return;

        const isFullRes = imageData.level === 0;
        const totalLevels = 5; // Approximate number of mipmap levels
        const progress = ((totalLevels - imageData.level) / totalLevels) * 100;

        setState({
          currentImage: imageData,
          isLoading: !isFullRes,
          isFullResolution: isFullRes,
          error: null,
          progress,
        });
      })
      .catch((error) => {
        if (abortSignal.aborted) return;

        setState({
          currentImage: null,
          isLoading: false,
          isFullResolution: false,
          error: error as Error,
          progress: 0,
        });
      });

    // Cleanup
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [url, enabled]);

  return state;
}

/**
 * Hook for loading multiple images progressively
 */
export function useProgressiveImagesLoading(
  urls: string[],
  options: UseProgressiveImageLoadingOptions = {}
): Map<string, ProgressiveImageState> {
  const { enabled = true } = options;

  const [states, setStates] = useState<Map<string, ProgressiveImageState>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (urls.length === 0 || !enabled) {
      setStates(new Map());
      return;
    }

    // Create abort controller for cleanup
    abortControllerRef.current = new AbortController();
    const abortSignal = abortControllerRef.current.signal;

    // Initialize states for all URLs
    const initialStates = new Map<string, ProgressiveImageState>();
    urls.forEach((url) => {
      initialStates.set(url, {
        currentImage: null,
        isLoading: true,
        isFullResolution: false,
        error: null,
        progress: 0,
      });
    });
    setStates(initialStates);

    // Load all images progressively
    imageLoader
      .loadImagesProgressively(urls, (url, imageData) => {
        if (abortSignal.aborted) return;

        const isFullRes = imageData.level === 0;
        const totalLevels = 5;
        const progress = ((totalLevels - imageData.level) / totalLevels) * 100;

        setStates((prev) => {
          const next = new Map(prev);
          next.set(url, {
            currentImage: imageData,
            isLoading: !isFullRes,
            isFullResolution: isFullRes,
            error: null,
            progress,
          });
          return next;
        });
      })
      .catch((error) => {
        if (abortSignal.aborted) return;

        console.error('Failed to load images progressively:', error);
      });

    // Cleanup
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [urls.join(','), enabled]);

  return states;
}

/**
 * Hook for zoom-aware image loading
 * Automatically selects appropriate mipmap level based on zoom
 */
export function useZoomAwareImageLoading(
  url: string | null,
  zoom: number
): ProgressiveImageState {
  const [state, setState] = useState<ProgressiveImageState>({
    currentImage: null,
    isLoading: false,
    isFullResolution: false,
    error: null,
    progress: 100,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!url) {
      setState({
        currentImage: null,
        isLoading: false,
        isFullResolution: false,
        error: null,
        progress: 0,
      });
      return;
    }

    // Create abort controller for cleanup
    abortControllerRef.current = new AbortController();
    const abortSignal = abortControllerRef.current.signal;

    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    // Get appropriate mipmap for zoom level
    imageLoader
      .getMipmapForZoom(url, zoom)
      .then((imageData) => {
        if (abortSignal.aborted) return;

        setState({
          currentImage: imageData,
          isLoading: false,
          isFullResolution: imageData.level === 0,
          error: null,
          progress: 100,
        });
      })
      .catch((error) => {
        if (abortSignal.aborted) return;

        setState({
          currentImage: null,
          isLoading: false,
          isFullResolution: false,
          error: error as Error,
          progress: 0,
        });
      });

    // Cleanup
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [url, zoom]);

  return state;
}

/**
 * Hook for preloading images in the background
 */
export function useImagePreloader(
  urls: string[],
  options: { enabled?: boolean; progressive?: boolean } = {}
): {
  isPreloading: boolean;
  preloadedCount: number;
  totalCount: number;
  error: Error | null;
} {
  const { enabled = true, progressive = true } = options;

  const [state, setState] = useState({
    isPreloading: false,
    preloadedCount: 0,
    totalCount: urls.length,
    error: null as Error | null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (urls.length === 0 || !enabled) {
      setState({
        isPreloading: false,
        preloadedCount: 0,
        totalCount: urls.length,
        error: null,
      });
      return;
    }

    // Create abort controller for cleanup
    abortControllerRef.current = new AbortController();
    const abortSignal = abortControllerRef.current.signal;

    setState({
      isPreloading: true,
      preloadedCount: 0,
      totalCount: urls.length,
      error: null,
    });

    const preloadFn = progressive
      ? imageLoader.preloadImagesProgressively.bind(imageLoader)
      : imageLoader.preloadImages.bind(imageLoader);

    let loadedCount = 0;

    const progressCallback = progressive
      ? (url: string, imageData: unknown) => {
          if (abortSignal.aborted) return;
          if (imageData.level === 0) {
            // Only count full-resolution images
            loadedCount++;
            setState((prev) => ({
              ...prev,
              preloadedCount: loadedCount,
            }));
          }
        }
      : undefined;

    preloadFn(urls, progressCallback)
      .then(() => {
        if (abortSignal.aborted) return;

        setState({
          isPreloading: false,
          preloadedCount: urls.length,
          totalCount: urls.length,
          error: null,
        });
      })
      .catch((error) => {
        if (abortSignal.aborted) return;

        setState((prev) => ({
          ...prev,
          isPreloading: false,
          error: error as Error,
        }));
      });

    // Cleanup
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [urls.join(','), enabled, progressive]);

  return state;
}

