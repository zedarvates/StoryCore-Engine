/**
 * Browser Compatibility Utilities
 * 
 * Provides utilities for detecting browser capabilities and
 * implementing cross-browser compatible features.
 * 
 * Requirements: 22.4
 */

// ============================================================================
// Browser Detection
// ============================================================================

export interface BrowserInfo {
  name: string;
  version: string;
  isChrome: boolean;
  isFirefox: boolean;
  isSafari: boolean;
  isEdge: boolean;
  isIE: boolean;
  isOpera: boolean;
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
}

/**
 * Detect browser information
 */
export function detectBrowser(): BrowserInfo {
  const ua = navigator.userAgent;
  
  const isChrome = /Chrome/.test(ua) && /Google Inc/.test(navigator.vendor);
  const isFirefox = /Firefox/.test(ua);
  const isSafari = /Safari/.test(ua) && /Apple Computer/.test(navigator.vendor);
  const isEdge = /Edg/.test(ua);
  const isIE = /MSIE|Trident/.test(ua);
  const isOpera = /OPR/.test(ua) || /Opera/.test(ua);
  
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isMobile = isIOS || isAndroid || /Mobile/.test(ua);
  
  let name = 'Unknown';
  let version = 'Unknown';
  
  if (isChrome) {
    name = 'Chrome';
    const match = ua.match(/Chrome\/(\d+)/);
    version = match ? match[1] : 'Unknown';
  } else if (isFirefox) {
    name = 'Firefox';
    const match = ua.match(/Firefox\/(\d+)/);
    version = match ? match[1] : 'Unknown';
  } else if (isSafari) {
    name = 'Safari';
    const match = ua.match(/Version\/(\d+)/);
    version = match ? match[1] : 'Unknown';
  } else if (isEdge) {
    name = 'Edge';
    const match = ua.match(/Edg\/(\d+)/);
    version = match ? match[1] : 'Unknown';
  } else if (isIE) {
    name = 'Internet Explorer';
    const match = ua.match(/(?:MSIE |rv:)(\d+)/);
    version = match ? match[1] : 'Unknown';
  } else if (isOpera) {
    name = 'Opera';
    const match = ua.match(/(?:OPR|Opera)\/(\d+)/);
    version = match ? match[1] : 'Unknown';
  }
  
  return {
    name,
    version,
    isChrome,
    isFirefox,
    isSafari,
    isEdge,
    isIE,
    isOpera,
    isMobile,
    isIOS,
    isAndroid,
  };
}

// ============================================================================
// Feature Detection
// ============================================================================

/**
 * Check if browser supports a specific feature
 */
export const features = {
  // CSS Features
  cssGrid: () => CSS.supports('display', 'grid'),
  cssFlexbox: () => CSS.supports('display', 'flex'),
  cssVariables: () => CSS.supports('--test', '0'),
  cssBackdropFilter: () => CSS.supports('backdrop-filter', 'blur(10px)'),
  
  // JavaScript Features
  intersectionObserver: () => 'IntersectionObserver' in window,
  resizeObserver: () => 'ResizeObserver' in window,
  mutationObserver: () => 'MutationObserver' in window,
  requestIdleCallback: () => 'requestIdleCallback' in window,
  requestAnimationFrame: () => 'requestAnimationFrame' in window,
  
  // Web APIs
  webGL: () => {
    try {
      const canvas = document.createElement('canvas');
      return !!(
        canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl')
      );
    } catch (e) {
      return false;
    }
  },
  webGL2: () => {
    try {
      const canvas = document.createElement('canvas');
      return !!canvas.getContext('webgl2');
    } catch (e) {
      return false;
    }
  },
  webWorkers: () => 'Worker' in window,
  serviceWorker: () => 'serviceWorker' in navigator,
  indexedDB: () => 'indexedDB' in window,
  localStorage: () => {
    try {
      const test = '__test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  },
  
  // Media Features
  mediaRecorder: () => 'MediaRecorder' in window,
  getUserMedia: () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
  webAudio: () => 'AudioContext' in window || 'webkitAudioContext' in window,
  
  // Drag and Drop
  dragAndDrop: () => 'draggable' in document.createElement('div'),
  
  // Touch Events
  touchEvents: () => 'ontouchstart' in window || navigator.maxTouchPoints > 0,
  
  // Pointer Events
  pointerEvents: () => 'PointerEvent' in window,
};

/**
 * Get all feature support information
 */
export function getFeatureSupport(): Record<string, boolean> {
  const support: Record<string, boolean> = {};
  
  for (const [key, check] of Object.entries(features)) {
    try {
      support[key] = check();
    } catch (e) {
      support[key] = false;
    }
  }
  
  return support;
}

// ============================================================================
// Polyfills and Fallbacks
// ============================================================================

/**
 * Polyfill for requestAnimationFrame
 */
export const requestAnimationFramePolyfill =
  window.requestAnimationFrame ||
  (window as any).webkitRequestAnimationFrame ||
  ((callback: FrameRequestCallback) => window.setTimeout(callback, 1000 / 60));

/**
 * Polyfill for cancelAnimationFrame
 */
export const cancelAnimationFramePolyfill =
  window.cancelAnimationFrame ||
  (window as any).webkitCancelAnimationFrame ||
  ((id: number) => window.clearTimeout(id));

/**
 * Polyfill for requestIdleCallback
 */
export const requestIdleCallbackPolyfill =
  window.requestIdleCallback ||
  ((callback: IdleRequestCallback) => {
    const start = Date.now();
    return window.setTimeout(() => {
      callback({
        didTimeout: false,
        timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
      });
    }, 1);
  });

/**
 * Polyfill for cancelIdleCallback
 */
export const cancelIdleCallbackPolyfill =
  window.cancelIdleCallback ||
  ((id: number) => window.clearTimeout(id));

// ============================================================================
// CSS Prefix Utilities
// ============================================================================

/**
 * Get vendor-prefixed CSS property name
 */
export function getVendorPrefix(property: string): string {
  const style = document.createElement('div').style;
  const prefixes = ['webkit', 'moz', 'ms', 'o'];
  
  // Check unprefixed
  if (property in style) {
    return property;
  }
  
  // Check prefixed
  const capitalized = property.charAt(0).toUpperCase() + property.slice(1);
  for (const prefix of prefixes) {
    const prefixed = prefix + capitalized;
    if (prefixed in style) {
      return prefixed;
    }
  }
  
  return property;
}

/**
 * Apply vendor-prefixed CSS property
 */
export function setVendorPrefixedStyle(
  element: HTMLElement,
  property: string,
  value: string
): void {
  const prefixedProperty = getVendorPrefix(property);
  element.style[prefixedProperty as any] = value;
}

// ============================================================================
// Event Handling Utilities
// ============================================================================

/**
 * Get normalized wheel event delta
 */
export function normalizeWheel(event: WheelEvent): { deltaX: number; deltaY: number } {
  let deltaX = event.deltaX;
  let deltaY = event.deltaY;
  
  // Firefox uses different units
  if (event.deltaMode === 1) {
    // DOM_DELTA_LINE
    deltaX *= 40;
    deltaY *= 40;
  } else if (event.deltaMode === 2) {
    // DOM_DELTA_PAGE
    deltaX *= 800;
    deltaY *= 800;
  }
  
  return { deltaX, deltaY };
}

/**
 * Get normalized pointer position
 */
export function getPointerPosition(
  event: MouseEvent | TouchEvent | PointerEvent
): { x: number; y: number } {
  if ('touches' in event && event.touches.length > 0) {
    return {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
    };
  }
  
  if ('clientX' in event) {
    return {
      x: event.clientX,
      y: event.clientY,
    };
  }
  
  return { x: 0, y: 0 };
}

// ============================================================================
// Clipboard Utilities
// ============================================================================

/**
 * Copy text to clipboard with fallback
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Modern API
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      console.error('Clipboard API failed:', e);
    }
  }
  
  // Fallback for older browsers
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch (e) {
    console.error('Fallback copy failed:', e);
    return false;
  }
}

/**
 * Read text from clipboard with fallback
 */
export async function readFromClipboard(): Promise<string | null> {
  // Modern API
  if (navigator.clipboard && navigator.clipboard.readText) {
    try {
      return await navigator.clipboard.readText();
    } catch (e) {
      console.error('Clipboard API failed:', e);
    }
  }
  
  // No reliable fallback for reading clipboard
  return null;
}

// ============================================================================
// File API Utilities
// ============================================================================

/**
 * Check if File API is supported
 */
export function isFileAPISupported(): boolean {
  return !!(window.File && window.FileReader && window.FileList && window.Blob);
}

/**
 * Read file as data URL with fallback
 */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!isFileAPISupported()) {
      reject(new Error('File API not supported'));
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// ============================================================================
// Canvas Utilities
// ============================================================================

/**
 * Get canvas context with fallback
 */
export function getCanvasContext(
  canvas: HTMLCanvasElement,
  contextType: '2d' | 'webgl' | 'webgl2' = '2d'
): CanvasRenderingContext2D | WebGLRenderingContext | WebGL2RenderingContext | null {
  if (contextType === '2d') {
    return canvas.getContext('2d');
  }
  
  if (contextType === 'webgl2') {
    return canvas.getContext('webgl2') || canvas.getContext('webgl');
  }
  
  if (contextType === 'webgl') {
    return (
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl') as WebGLRenderingContext
    );
  }
  
  return null;
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize browser compatibility features
 */
export function initializeBrowserCompat(): void {
  const browser = detectBrowser();
  
  // Log browser info in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Browser:', browser);
    console.log('Feature Support:', getFeatureSupport());
  }
  
  // Add browser class to body for CSS targeting
  document.body.classList.add(`browser-${browser.name.toLowerCase().replace(/\s+/g, '-')}`);
  
  if (browser.isMobile) {
    document.body.classList.add('is-mobile');
  }
  
  // Warn about unsupported browsers
  if (browser.isIE) {
    console.warn('Internet Explorer is not fully supported. Please use a modern browser.');
  }
}
