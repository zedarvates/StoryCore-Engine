/**
 * useResponsiveGrid Hook
 * 
 * Manages responsive grid behavior based on viewport width.
 * Automatically adjusts columns, switches to list mode, and handles orientation changes.
 * 
 * Exigences: 12.1, 12.2, 12.3, 12.4, 12.7
 */

import { useState, useEffect, useCallback } from 'react';

export interface ResponsiveBreakpoint {
  name: 'mobile' | 'tablet' | 'desktop' | 'large';
  minWidth: number;
  maxWidth?: number;
  columns: number;
  useListMode: boolean;
}

export interface ResponsiveGridState {
  breakpoint: ResponsiveBreakpoint;
  columns: number;
  useListMode: boolean;
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
  isFullscreen: boolean;
}

// Breakpoints configuration (Exigence 12.2, 12.3, 12.4)
export const BREAKPOINTS: ResponsiveBreakpoint[] = [
  {
    name: 'mobile',
    minWidth: 320,
    maxWidth: 767,
    columns: 1,
    useListMode: true
  },
  {
    name: 'tablet',
    minWidth: 768,
    maxWidth: 1023,
    columns: 2,
    useListMode: true
  },
  {
    name: 'desktop',
    minWidth: 1024,
    maxWidth: 1919,
    columns: 3,
    useListMode: false
  },
  {
    name: 'large',
    minWidth: 1920,
    columns: 4,
    useListMode: false
  }
];

/**
 * Get breakpoint for given width
 */
const getBreakpoint = (width: number): ResponsiveBreakpoint => {
  for (const breakpoint of BREAKPOINTS) {
    if (width >= breakpoint.minWidth && (!breakpoint.maxWidth || width <= breakpoint.maxWidth)) {
      return breakpoint;
    }
  }
  // Default to largest breakpoint
  return BREAKPOINTS[BREAKPOINTS.length - 1];
};

/**
 * Get orientation from dimensions
 * Exigence: 12.7
 */
const getOrientation = (width: number, height: number): 'portrait' | 'landscape' => {
  return width > height ? 'landscape' : 'portrait';
};

/**
 * Check if fullscreen
 * Exigence: 12.5
 */
const checkFullscreen = (): boolean => {
  return !!(
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).mozFullScreenElement ||
    (document as any).msFullscreenElement
  );
};

/**
 * Hook for responsive grid management
 */
export const useResponsiveGrid = (): ResponsiveGridState => {
  const [state, setState] = useState<ResponsiveGridState>(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const breakpoint = getBreakpoint(width);
    
    return {
      breakpoint,
      columns: breakpoint.columns,
      useListMode: breakpoint.useListMode,
      width,
      height,
      orientation: getOrientation(width, height),
      isFullscreen: checkFullscreen()
    };
  });

  /**
   * Handle window resize
   * Exigence: 12.1
   */
  const handleResize = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const breakpoint = getBreakpoint(width);
    const orientation = getOrientation(width, height);
    const isFullscreen = checkFullscreen();

    setState(prev => {
      // Only update if something changed
      if (
        prev.width === width &&
        prev.height === height &&
        prev.breakpoint.name === breakpoint.name &&
        prev.isFullscreen === isFullscreen
      ) {
        return prev;
      }

      return {
        breakpoint,
        columns: breakpoint.columns,
        useListMode: breakpoint.useListMode,
        width,
        height,
        orientation,
        isFullscreen
      };
    });
  }, []);

  /**
   * Handle fullscreen change
   * Exigence: 12.5
   */
  const handleFullscreenChange = useCallback(() => {
    setState(prev => ({
      ...prev,
      isFullscreen: checkFullscreen()
    }));
  }, []);

  // Set up event listeners
  useEffect(() => {
    // Debounce resize events for performance
    let timeoutId: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 150);
    };

    window.addEventListener('resize', debouncedResize);
    window.addEventListener('orientationchange', handleResize); // Exigence 12.7
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', debouncedResize);
      window.removeEventListener('orientationchange', handleResize);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [handleResize, handleFullscreenChange]);

  return state;
};

/**
 * Hook for responsive grid with custom breakpoints
 */
export const useResponsiveGridWithBreakpoints = (
  customBreakpoints: ResponsiveBreakpoint[]
): ResponsiveGridState => {
  const [state, setState] = useState<ResponsiveGridState>(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const breakpoint = getBreakpoint(width);
    
    return {
      breakpoint,
      columns: breakpoint.columns,
      useListMode: breakpoint.useListMode,
      width,
      height,
      orientation: getOrientation(width, height),
      isFullscreen: checkFullscreen()
    };
  });

  const handleResize = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Find matching custom breakpoint
    let breakpoint = customBreakpoints.find(bp => 
      width >= bp.minWidth && (!bp.maxWidth || width <= bp.maxWidth)
    );
    
    if (!breakpoint) {
      breakpoint = customBreakpoints[customBreakpoints.length - 1];
    }
    
    const orientation = getOrientation(width, height);
    const isFullscreen = checkFullscreen();

    setState({
      breakpoint,
      columns: breakpoint.columns,
      useListMode: breakpoint.useListMode,
      width,
      height,
      orientation,
      isFullscreen
    });
  }, [customBreakpoints]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 150);
    };

    window.addEventListener('resize', debouncedResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', debouncedResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [handleResize]);

  return state;
};
