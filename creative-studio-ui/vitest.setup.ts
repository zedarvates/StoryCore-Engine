import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Mock hasPointerCapture for Radix UI compatibility with jsdom
Object.defineProperty((globalThis as any).HTMLElement.prototype, 'hasPointerCapture', {
  writable: true,
  value: vi.fn(() => false),
});

// Mock scrollIntoView for Radix UI Select
Object.defineProperty((globalThis as any).HTMLElement.prototype, 'scrollIntoView', {
  writable: true,
  value: vi.fn(),
});

// Mock ResizeObserver for canvas-based components
(globalThis as any).ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
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
