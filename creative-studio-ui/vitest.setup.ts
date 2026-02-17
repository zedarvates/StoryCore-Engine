import { expect, afterEach, vi } from 'vitest';
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
Object.defineProperty((globalThis as any).HTMLElement.prototype, 'hasPointerCapture', {
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
Object.defineProperty((globalThis as any).HTMLElement.prototype, 'scrollIntoView', {
  writable: true,
  value: vi.fn(),
});

// Mock ResizeObserver for canvas-based components
(globalThis as any).ResizeObserver = class ResizeObserver {
  observe() { }
  unobserve() { }
  disconnect() { }
};

// Mock IntersectionObserver for lazy loading components
(globalThis as any).IntersectionObserver = class IntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  callback: IntersectionObserverCallback;
  observe() {
    // Immediately trigger callback with isIntersecting: true for testing
    this.callback(
      [
        {
          isIntersecting: true,
          target: document.createElement('div'),
          boundingClientRect: {} as DOMRectReadOnly,
          intersectionRatio: 1,
          intersectionRect: {} as DOMRectReadOnly,
          rootBounds: null,
          time: Date.now(),
        } as IntersectionObserverEntry,
      ],
      this as any
    );
  }
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
})) as any;

console.log('Vitest setup loaded successfully');

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock lucide-react icons
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, any>;
  const mockedIcons: Record<string, any> = {};
  Object.keys(actual).forEach(key => {
    mockedIcons[key] = () => null;
  });
  return mockedIcons;
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
(globalThis as any).URL = {
  ...URL,
  createObjectURL: vi.fn(() => 'blob:mock-url'),
  revokeObjectURL: vi.fn(),
};
