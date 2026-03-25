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
    cssCodeSplit: true,
    // Enable module preload for better performance
    modulePreload: {
      polyfill: true,
    },
    rollupOptions: {
      // Optimize rollup for tree shaking
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
      },
      output: {
        // Optimize chunk naming for better caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        // Manual chunks for code splitting - optimized for smaller chunks
        manualChunks: (id) => {
          // Vendor chunks - React core (separate chunk)
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'react-vendor';
          }
          
          // Animation library
          if (id.includes('framer-motion')) {
            return 'animation-libs';
          }

          // Icons
          if (id.includes('lucide-react')) {
            return 'icons';
          }

          // Radix UI components (separate chunk)
          if (id.includes('@radix-ui')) {
            return 'radix-ui';
          }
          
          // PDF and export libraries (separate chunk)
          if (id.includes('jspdf') || id.includes('html2canvas')) {
            return 'pdf-export';
          }
          
          // UI libraries - MUI (separate chunk)
          if (id.includes('@mui') || id.includes('@emotion')) {
            return 'ui-libs';
          }
          
          // State management (separate chunk)
          if (id.includes('zustand')) {
            return 'zustand-store';
          }
          
          // Three.js and 3D libraries (separate chunk)
          if (id.includes('three') || id.includes('@react-three')) {
            return 'three-3d';
          }
          
          // LLM services - split into smaller chunks
          if (id.includes('ollama')) {
            return 'ollama-client';
          }
          if (id.includes('llm') && !id.includes('ollama')) {
            return 'llm-core';
          }
          
          // Large AI libraries (likely the cause of large ai-core)
          if (id.includes('@ai-sdk') || id.includes('openai') || id.includes('anthropic') || id.includes('langchain')) {
            return 'ai-providers';
          }

          // AI services - split into smaller chunks by service type
          // AI Wizard services
          if (id.includes('aiWizardService') || id.includes('WizardService')) {
            return 'ai-wizard';
          }
          
          // AI Composition services (shot composition, script analysis)
          if (id.includes('aiShotCompositionService') || id.includes('aiScriptAnalysisService')) {
            return 'ai-composition';
          }
          
          // AI Character services
          if (id.includes('aiCharacterService')) {
            return 'ai-character';
          }
          
          // AI Media services (audio enhancement, color grading)
          if (id.includes('aiAudioEnhancementService') || id.includes('aiColorGradingService')) {
            return 'ai-media';
          }
          
          // AI Preset and Performance services
          if (id.includes('aiPresetService') || id.includes('aiPerformanceService') || id.includes('ObjectsAIService')) {
            return 'ai-presets';
          }
          
          // Core AI services (ActionDispatcher, IntentOrchestration, etc.)
          if (id.includes('services/ai/')) {
            return 'ai-core';
          }
          
          // Internal AI services (other services with 'ai' in path)
          if (id.includes('ai') && id.includes('services') && !id.includes('node_modules')) {
             // Keep fallback for other AI services
             return 'ai-internal';
          }

          // External AI dependencies
          if (id.includes('node_modules') && id.includes('ai')) {
            return 'ai-vendor';
          }
          
          // ComfyUI and image generation (separate chunk)
          if (id.includes('comfyui') || id.includes('image') || id.includes('generation')) {
            return 'image-generation';
          }
          
          // Audio and video processing (separate chunk)
          if (id.includes('audio') || id.includes('video') || id.includes('ffmpeg')) {
            return 'media-processing';
          }

          // Wizard components (large feature)
          if (id.includes('components/wizard/')) {
            return 'wizard-components';
          }
          
          // Modal components
          if (id.includes('components/modals/')) {
            return 'modal-components';
          }
          
          // Workspace components
          if (id.includes('components/workspace/')) {
            return 'workspace-components';
          }
          
          // Character components
          if (id.includes('components/character/')) {
            return 'character-components';
          }
          
          // Location components
          if (id.includes('components/location/')) {
            return 'location-components';
          }
          
          // Object components
          if (id.includes('components/objects/')) {
            return 'object-components';
          }
          
          // Sequence editor components (heavy feature)
          if (id.includes('sequence-editor/')) {
            return 'sequence-editor';
          }
          
          // EditorPage components
          if (id.includes('EditorPage') || id.includes('components/editor/')) {
            return 'editor-page';
          }
          
          // Custom hooks (can be lazy loaded)
          if (id.includes('hooks/') && !id.includes('node_modules')) {
            return 'app-hooks';
          }

          // Story components
          if (id.includes('storyteller') || id.includes('Storyteller')) {
            return 'storyteller-feature';
          }
          
          // Default chunk for other dependencies
          if (id.includes('node_modules')) {
            return 'vendor';
          }
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
    // Proxy API requests to the backend server
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
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
