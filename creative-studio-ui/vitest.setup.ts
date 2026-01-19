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
