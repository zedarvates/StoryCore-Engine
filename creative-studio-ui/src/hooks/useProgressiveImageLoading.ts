/**
 * useProgressiveImageLoading Hook
 * 
 * React hook for progressive image loading with automatic state management
 * Provides low-resolution preview first, then progressively loads higher resolutions
 * 
 * Requirements: 13.1, 13.2, 13.3
 */

import { useState, useEffect, useRef } from 'react';
import { imageLoader, ImageData } from '../services/gridEditor/ImageLoaderService';
import { LegacyAny } from '../types/legacy';

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
  const { enabled = true } = options;

  const [state, setState] = useState<ProgressiveImageState>({
    currentImage: null,
    isLoading: enabled && !!url,
    isFullResolution: false,
    error: null,
    progress: 0,
  });

  const [prevParams, setPrevParams] = useState({ url, enabled });
  if (prevParams.url !== url || prevParams.enabled !== enabled) {
    setPrevParams({ url, enabled });
    setState({
      currentImage: null,
      isLoading: enabled && !!url,
      isFullResolution: false,
      error: null,
      progress: 0,
    });
  }

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Create abort controller for cleanup
    abortControllerRef.current = new AbortController();
    const abortSignal = abortControllerRef.current.signal;

    // Load image progressively
    imageLoader
      .loadImageProgressively(url!, (imageData) => {
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

  // JSON stringify for stable array dependency
  const urlsString = JSON.stringify(urls);

  // Sync states when urls change
  const [prevUrls, setPrevUrls] = useState<string>(urlsString);
  if (prevUrls !== urlsString) {
    setPrevUrls(urlsString);
    const initialMap = new Map<string, ProgressiveImageState>();
    if (enabled) {
      urls.forEach((u) => {
        initialMap.set(u, {
          currentImage: null,
          isLoading: true,
          isFullResolution: false,
          error: null,
          progress: 0,
        });
      });
    }
    setStates(initialMap);
  }

  useEffect(() => {
    if (urls.length === 0 || !enabled) {
      return;
    }

    // Create abort controller for cleanup
    abortControllerRef.current = new AbortController();
    const abortSignal = abortControllerRef.current.signal;

    imageLoader
      .loadImagesProgressively(urls, (url, imageData: LegacyAny) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlsString, enabled]);

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

  const [prevUrl, setPrevUrl] = useState(url);
  if (prevUrl !== url) {
    setPrevUrl(url);
    setState({
      currentImage: null,
      isLoading: !!url,
      isFullResolution: false,
      error: null,
      progress: 0,
    });
  }

  useEffect(() => {
    if (!url) {
      return;
    }

    // Create abort controller for cleanup
    abortControllerRef.current = new AbortController();
    const abortSignal = abortControllerRef.current.signal;

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
  const urlsString = JSON.stringify(urls);
  
  // Sync preloading state during render
  const shouldBePreloading = enabled && urls.length > 0;
  if (state.isPreloading !== shouldBePreloading && !state.error && state.preloadedCount < urls.length) {
    setState(prev => ({ ...prev, isPreloading: shouldBePreloading, totalCount: urls.length }));
  }

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

    const preloadFn = progressive
      ? imageLoader.preloadImagesProgressively.bind(imageLoader)
      : imageLoader.preloadImages.bind(imageLoader);

    let loadedCount = 0;

    const progressCallback = progressive
      ? (_url: string, imageData: LegacyAny) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlsString, enabled, progressive]);

  return state;
}

