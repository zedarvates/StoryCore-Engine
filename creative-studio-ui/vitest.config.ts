import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react({
    jsxRuntime: 'automatic',
  })],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    css: false,
    // Fix for corrupted output on Windows - use single fork instead of parallel threads
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // Additional Windows compatibility fixes
    silent: false,
    reporters: ['basic'],
    maxConcurrency: 1,
    isolate: true,
    // Coverage configuration (Requirement 7.5: 80% minimum coverage)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'src/__tests__/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'src/vite-env.d.ts',
        'src/test-utils/',
        '**/*.example.tsx',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },
  esbuild: {
    jsx: 'transform',
  },
});
