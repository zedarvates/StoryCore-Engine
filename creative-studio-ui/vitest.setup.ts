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
Object.defineProperty((globalThis as unknown).HTMLElement.prototype, 'hasPointerCapture', {
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
Object.defineProperty((globalThis as unknown).HTMLElement.prototype, 'scrollIntoView', {
  writable: true,
  value: vi.fn(),
});

// Mock ResizeObserver for virtualized and responsive components
(globalThis as unknown).ResizeObserver = class ResizeObserver {
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
};

// Mock IntersectionObserver for lazy loading components
(globalThis as unknown).IntersectionObserver = class IntersectionObserver {
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
};

// Mock HTMLCanvasElement.getContext for canvas-based components
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
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
})) as RenderingContext2D;

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

// Mock document.createElement for file input tests
const originalCreateElement = document.createElement.bind(document);
vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
  if (tagName === 'input') {
    const input = originalCreateElement('input') as HTMLInputElement;
    // Preserve the type that will be set by React - don't override to file
    // The mock should only set default properties for testing, not change the type
    return input;
  }
  return originalCreateElement(tagName);
});

// Mock URL.createObjectURL and URL.revokeObjectURL for export service tests
const OriginalURL = (globalThis as unknown).URL;
(globalThis as unknown).URL = class URL extends (OriginalURL as typeof URL) {
  static createObjectURL = vi.fn(() => 'blob:mock-url');
  static revokeObjectURL = vi.fn();
  constructor(url: string | URL, base?: string | URL) {
    super(url, base);
  }
};

// Mock Worker for web worker tests
(globalThis as unknown).Worker = class Worker {
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
};
