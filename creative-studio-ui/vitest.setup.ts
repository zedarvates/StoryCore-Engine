import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// ============================================================================
// Global Mocks for Service Status
// ============================================================================

// Mock useServiceStatus hook globally
vi.mock('@/hooks/useServiceStatus', () => ({
  useServiceStatus: vi.fn(() => ({
    ollama: 'connected',
    comfyui: 'connected',
  })),
}));

// Mock hasPointerCapture for Radix UI compatibility with jsdom
Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
  writable: true,
  value: vi.fn(() => false),
});

// Mock requestSubmit for Radix UI Dialog compatibility with jsdom
if (!HTMLFormElement.prototype.requestSubmit) {
  HTMLFormElement.prototype.requestSubmit = function (submitter?: HTMLElement) {
    if (submitter) {
      submitter.click();
    } else {
      this.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
  };
}

// Mock scrollIntoView for Radix UI Select
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  writable: true,
  value: vi.fn(),
});

// Mock ResizeObserver for virtualized and responsive components
class TestResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  callback: ResizeObserverCallback;
  observe(target: HTMLElement) {
    // Provide non-zero dimensions for JSDOM
    if (!target.offsetWidth) {
      Object.defineProperty(target, 'offsetWidth', { value: 800, configurable: true });
    }
    if (!target.offsetHeight) {
      Object.defineProperty(target, 'offsetHeight', { value: 600, configurable: true });
    }

    // Trigger callback with default dimensions for tests
    setTimeout(() => {
      this.callback([{
        target,
        contentRect: {
          width: target.offsetWidth,
          height: target.offsetHeight,
          top: 0,
          left: 0,
          right: target.offsetWidth,
          bottom: target.offsetHeight,
          x: 0,
          y: 0,
          toJSON: () => ({})
        },
        borderBoxSize: [{ inlineSize: target.offsetWidth, blockSize: target.offsetHeight }],
        contentBoxSize: [{ inlineSize: target.offsetWidth, blockSize: target.offsetHeight }],
        devicePixelContentBoxSize: []
      }], this);
    }, 0);
  }
  unobserve() { }
  disconnect() { }
}
Object.defineProperty(globalThis, 'ResizeObserver', { configurable: true, writable: true, value: TestResizeObserver });

// Mock IntersectionObserver for lazy loading components
class TestIntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  };
  callback: IntersectionObserverCallback;
  observe() { }
  unobserve() { }
  disconnect() { }
  takeRecords() {
    return [];
  }
  root = null;
  rootMargin = '';
  thresholds = [];
}
Object.defineProperty(globalThis, 'IntersectionObserver', { configurable: true, writable: true, value: TestIntersectionObserver });

// Mock HTMLCanvasElement.getContext for canvas-based components
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  writable: true,
  value: vi.fn(() => ({
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    createPattern: vi.fn(),
    getImageData: vi.fn(() => ({
      data: new Uint8ClampedArray(),
      width: 0,
      height: 0,
    })),
    putImageData: vi.fn(),
    canvas: {
      width: 800,
      height: 600,
    },
  })),
});

console.log('Vitest setup loaded successfully');

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock lucide-react icons
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  const mockedIcons: Record<string, unknown> = {};
  Object.keys(actual).forEach(key => {
    mockedIcons[key] = () => null;
  });
  return mockedIcons as Record<string, unknown>;
});

// Record element creation without changing browser behavior.
vi.spyOn(document, 'createElement');

// Export services use object URLs, which JSDOM does not implement.
Object.defineProperties(URL, {
  createObjectURL: { configurable: true, writable: true, value: vi.fn(() => 'blob:mock-url') },
  revokeObjectURL: { configurable: true, writable: true, value: vi.fn() },
});

// Mock Worker for web worker tests
class TestWorker {
  constructor(_url: string | URL, _options?: WorkerOptions) {
    this.onmessage = vi.fn();
    this.onerror = vi.fn();
  }
  onmessage: (event: MessageEvent) => void;
  onerror: (event: Event) => void;
  postMessage(_message: unknown) { }
  terminate() { }
  addEventListener(_type: string, _listener: EventListenerOrEventListenerObject) { }
  removeEventListener(_type: string, _listener: EventListenerOrEventListenerObject) { }
  dispatchEvent(_event: Event): boolean { return true; }
}
Object.defineProperty(globalThis, 'Worker', { configurable: true, writable: true, value: TestWorker });
