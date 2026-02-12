import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
      // Disable oxc to use esbuild
      babel: undefined,
    }),
    // Bundle size analyzer - generates stats.html in dist/
    visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap', // 'sunburst', 'treemap', 'network'
    }),
  ],
  // Enhanced esbuild configuration for TypeScript transformation
  // Ensures proper JSX handling and class field semantics
  esbuild: {
    jsx: 'automatic',
    tsconfigRaw: {
      compilerOptions: {
        // Use standard class field semantics for better compatibility
        useDefineForClassFields: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@services': path.resolve(__dirname, './src/services'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@types': path.resolve(__dirname, './src/types'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@contexts': path.resolve(__dirname, './src/contexts'),
      '@stores': path.resolve(__dirname, './src/stores'),
      '@lib': path.resolve(__dirname, './src/lib'),
    },
    // Prioritize TypeScript files over JavaScript files in module resolution
    // This prevents conflicts when both .ts and .js files exist with the same name
    // Order matters: .ts/.tsx are checked before .js/.jsx
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },
  // Electron-specific configuration
  // Use relative paths for Electron (file:// protocol)
  base: './',
  // Web Worker configuration
  worker: {
    format: 'es',
    plugins: () => [react()],
  },
  build: {
    outDir: 'dist',
    // Clean the output directory before each build to prevent stale artifacts
    // This ensures no leftover files from previous builds cause conflicts
    emptyOutDir: true,
    // Ensure assets are properly referenced in Electron
    assetsDir: 'assets',
    // Generate sourcemaps for debugging
    sourcemap: process.env.NODE_ENV === 'development',
    // Optimize for production
    minify: process.env.NODE_ENV === 'production' ? 'esbuild' : false,
    // Target modern browsers (Electron uses Chromium)
    target: 'chrome120',
    // Bundle size warning threshold (500KB target)
    chunkSizeWarningLimit: 500,
    // CSS code splitting for better caching
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        // Optimize chunk naming for better caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        // Manual chunks for code splitting
        manualChunks: {
          // Vendor chunks - React core
          'react-vendor': ['react', 'react-dom', 'react-router', 'react-router-dom'],
          // Radix UI components
          'radix-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-popover',
            '@radix-ui/react-progress',
            '@radix-ui/react-separator',
            '@radix-ui/react-slider',
            '@radix-ui/react-switch',
            '@radix-ui/react-toggle',
            '@radix-ui/react-toggle-group',
          ],
          // PDF and export libraries
          'pdf-export': ['jspdf', 'html2canvas'],
          // UI libraries
          'ui-libs': ['@mui/material', '@emotion/react', '@emotion/styled'],
          // State management
          'zustand-store': ['zustand'],
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: false, // Allow fallback ports
    host: 'localhost',
    hmr: {
      overlay: true, // Show errors as overlay
    },
    watch: {
      usePolling: false, // Better performance on most systems
      ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
    },
  },
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'zustand',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@mui/material',
      '@mui/icons-material',
    ],
    exclude: ['@vite/client', '@vite/env'],
  },
})
