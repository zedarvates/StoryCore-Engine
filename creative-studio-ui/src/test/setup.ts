import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock ResizeObserver
if (typeof window !== 'undefined') {
  global.ResizeObserver = class ResizeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  };

  // Mock scrollIntoView
  Element.prototype.scrollIntoView = vi.fn();
}

// Mock IntersectionObserver
if (typeof window !== 'undefined') {
  global.IntersectionObserver = class IntersectionObserver {
    readonly root: Element | null = null;
    readonly rootMargin: string = '';
    readonly thresholds: ReadonlyArray<number> = [];
    private callback: IntersectionObserverCallback;

    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback;
    }

    observe = vi.fn((target: Element) => {
      // Simulate intersection after a short delay
      setTimeout(() => {
        const entry: Partial<IntersectionObserverEntry> = {
          isIntersecting: true,
          target,
          boundingClientRect: target.getBoundingClientRect(),
          intersectionRatio: 1,
          intersectionRect: target.getBoundingClientRect(),
          rootBounds: null,
          time: Date.now(),
        };
        this.callback([entry as IntersectionObserverEntry], this);
      }, 0);
    });
    unobserve = vi.fn();
    disconnect = vi.fn();
    takeRecords = vi.fn();
  };
}

// Mock HTMLCanvasElement.getContext
if (typeof window !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({ 
      data: new Uint8ClampedArray(0),
      width: 0,
      height: 0
    })),
    putImageData: vi.fn(),
    createImageData: vi.fn(() => ({
      data: new Uint8ClampedArray(0),
      width: 0,
      height: 0
    })),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    rect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    transform: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    closePath: vi.fn(),
    clip: vi.fn(),
    quadraticCurveTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    arcTo: vi.fn(),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    createPattern: vi.fn(),
  }) as any;
}


// Mock IndexedDB
if (typeof window !== 'undefined') {
  const mockRequest = () => {
    const request = {
      onupgradeneeded: null,
      onsuccess: null,
      onerror: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      result: {
        objectStoreNames: {
          contains: vi.fn().mockReturnValue(true),
          length: 0,
          item: vi.fn(),
          [Symbol.iterator]: function* () {},
        },
        createObjectStore: vi.fn().mockReturnValue({
          createIndex: vi.fn(),
          add: vi.fn(),
          put: vi.fn(),
          get: vi.fn(),
          getAll: vi.fn(),
          delete: vi.fn(),
          clear: vi.fn(),
          openCursor: vi.fn(),
        }),
        transaction: vi.fn().mockReturnValue({
          objectStore: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue({ onsuccess: null, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
            put: vi.fn().mockReturnValue({ onsuccess: null, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
            delete: vi.fn().mockReturnValue({ onsuccess: null, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
            clear: vi.fn().mockReturnValue({ onsuccess: null, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
          }),
          oncomplete: null,
          onerror: null,
          abort: vi.fn(),
        }),
        close: vi.fn(),
      },
    } as unknown as IDBOpenDBRequest;
    
    // Simulate async success
    setTimeout(() => {
      if (request.onsuccess) (request.onsuccess as any)({ target: request });
    }, 0);
    
    return request as unknown as IDBOpenDBRequest;
  };

  Object.defineProperty(window, 'indexedDB', {
    value: {
      open: vi.fn().mockImplementation(mockRequest),
      deleteDatabase: vi.fn().mockImplementation(mockRequest),
      cmp: vi.fn(),
      databases: vi.fn().mockResolvedValue([]),
    },
    writable: true,
  });
}