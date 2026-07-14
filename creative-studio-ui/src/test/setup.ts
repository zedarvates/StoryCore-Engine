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
    setLineDash: vi.fn(),
    getLineDash: vi.fn(() => []),
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
    const listeners: Record<string, ((event: any) => void)[]> = {};
    const request = {
      onupgradeneeded: null as ((this: IDBOpenDBRequest, ev: IDBVersionChangeEvent) => any) | null,
      onsuccess: null as ((this: IDBRequest<IDBDatabase>, ev: Event) => any) | null,
      onerror: null as ((this: IDBRequest<IDBDatabase>, ev: Event) => any) | null,
      readyState: 'pending' as IDBRequestReadyState,
      result: {
        objectStoreNames: {
          contains: vi.fn().mockReturnValue(true),
          length: 0,
          item: vi.fn(),
          [Symbol.iterator]: function* () {},
        } as unknown as DOMStringList,
        createObjectStore: vi.fn().mockReturnValue({
          createIndex: vi.fn(),
          add: vi.fn().mockReturnValue({ onsuccess: null, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
          put: vi.fn().mockReturnValue({ onsuccess: null, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
          get: vi.fn().mockReturnValue({ onsuccess: null, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
          getAll: vi.fn().mockReturnValue({ onsuccess: null, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
          delete: vi.fn().mockReturnValue({ onsuccess: null, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
          clear: vi.fn().mockReturnValue({ onsuccess: null, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
          openCursor: vi.fn().mockReturnValue({ onsuccess: null, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
        }),
        transaction: vi.fn().mockReturnValue({
          objectStore: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue({ onsuccess: null, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
            put: vi.fn().mockReturnValue({ onsuccess: null, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
            delete: vi.fn().mockReturnValue({ onsuccess: null, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
            clear: vi.fn().mockReturnValue({ onsuccess: null, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
            getAll: vi.fn().mockReturnValue({ onsuccess: null, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
            getAllKeys: vi.fn().mockReturnValue({ onsuccess: null, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
          }),
          oncomplete: null,
          onerror: null,
          abort: vi.fn(),
          commit: vi.fn(),
        }),
        close: vi.fn(),
      } as unknown as IDBDatabase,
      addEventListener: vi.fn((type: string, listener: (event: any) => void) => {
        if (!listeners[type]) listeners[type] = [];
        listeners[type].push(listener);
      }),
      removeEventListener: vi.fn((type: string, listener: (event: any) => void) => {
        if (listeners[type]) {
          listeners[type] = listeners[type].filter(l => l !== listener);
        }
      }),
      dispatchEvent: vi.fn((event: any) => {
        const type = event.type;
        if (listeners[type]) {
          listeners[type].forEach(l => l(event));
        }
        if (type === 'success' && request.onsuccess) (request.onsuccess as any)(event);
        if (type === 'error' && request.onerror) (request.onerror as any)(event);
        if (type === 'upgradeneeded' && request.onupgradeneeded) (request.onupgradeneeded as any)(event);
        return true;
      }),
    } as unknown as IDBOpenDBRequest;
    
    // Simulate async success
    setTimeout(() => {
      (request as any).readyState = 'done';
      const event = { type: 'success', target: request };
      if (request.onsuccess) (request.onsuccess as any)(event);
      if (listeners['success']) listeners['success'].forEach(l => l(event));
    }, 0);
    
    return request;
  };
  
  const idbMock = {
    open: vi.fn().mockImplementation(mockRequest),
    deleteDatabase: vi.fn().mockImplementation(mockRequest),
    cmp: vi.fn(),
    databases: vi.fn().mockResolvedValue([]),
  } as unknown as IDBFactory;

  Object.defineProperty(window, 'indexedDB', {
    value: idbMock,
    writable: true,
  });

  // Also set on global for Node environments/utilities
  (global as { indexedDB?: IDBFactory }).indexedDB = idbMock;
}

// Mock Worker for web worker tests
if (typeof window !== 'undefined') {
  global.Worker = class Worker {
    onmessage: (event: MessageEvent) => void;
    onerror: (event: Event) => void;
    constructor(_url: string | URL, _options?: WorkerOptions) {
      this.onmessage = vi.fn();
      this.onerror = vi.fn();
    }
    postMessage(_message: unknown) { }
    terminate() { }
    addEventListener(_type: string, _listener: EventListenerOrEventListenerObject) { }
    removeEventListener(_type: string, _listener: EventListenerOrEventListenerObject) { }
    dispatchEvent(_event: Event): boolean { return true; }
  } as unknown as typeof Worker;
}