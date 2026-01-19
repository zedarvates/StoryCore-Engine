/**
 * Lazy-loaded components for performance optimization
 * Heavy components are loaded on-demand to reduce initial bundle size
 */

import { lazy, Suspense, ComponentType } from 'react';
import { Loader2 } from 'lucide-react';

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

// Wrapper for lazy components with suspense
function withLazy<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  fallback: React.ReactNode = <LoadingFallback />
) {
  const LazyComponent = lazy(importFn);

  return (props: P) => (
    <Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

// Lazy-loaded heavy components
export const LazyAnimationPanel = withLazy(
  () => import('./AnimationPanel').then(m => ({ default: (m as any).default || (m as any).AnimationPanel || m }))
);

export const LazyAudioEffectsPanel = withLazy(
  () => import('./AudioEffectsPanel').then(m => ({ default: (m as any).default || (m as any).AudioEffectsPanel || m }))
);

export const LazyAudioCurveEditor = withLazy(
  () => import('./AudioCurveEditor').then(m => ({ default: (m as any).default || (m as any).AudioCurveEditor || m }))
);

export const LazySurroundSoundPanel = withLazy(
  () => import('./SurroundSoundPanel').then(m => ({ default: (m as any).default || (m as any).SurroundSoundPanel || m }))
);

export const LazyBezierCurveEditor = withLazy(
  () => import('./BezierCurveEditor').then(m => ({ default: (m as any).default || (m as any).BezierCurveEditor || m }))
);

export const LazyPreviewPanel = withLazy(
  () => import('./PreviewPanel').then(m => ({ default: (m as any).default || (m as any).PreviewPanel || m }))
);

export const LazyVoiceOverGenerator = withLazy(
  () => import('./VoiceOverGenerator').then(m => ({ default: (m as any).default || (m as any).VoiceOverGenerator || m }))
);

export const LazyTaskQueueModal = withLazy(
  () => import('./TaskQueueModal').then(m => ({ default: (m as any).default || (m as any).TaskQueueModal || m }))
);

export const LazyResultsGallery = withLazy(
  () => import('./ResultsGallery').then(m => ({ default: (m as any).default || (m as any).ResultsGallery || m }))
);

// Custom fallback for specific components
export const LazyWaveformDisplay = withLazy(
  () => import('./WaveformDisplay').then(module => ({ default: module.WaveformDisplay })),
  <div className="flex items-center justify-center h-16 bg-muted rounded">
    <span className="text-sm text-muted-foreground">Loading waveform...</span>
  </div>
);

export const LazyAudioEffectPresetsPanel = withLazy(
  () => import('./AudioEffectPresetsPanel').then(m => ({ default: (m as any).default || (m as any).AudioEffectPresetsPanel || m }))
);

export const LazyAISurroundAssistant = withLazy(
  () => import('./AISurroundAssistant').then(m => ({ default: (m as any).default || (m as any).AISurroundAssistant || m }))
);
