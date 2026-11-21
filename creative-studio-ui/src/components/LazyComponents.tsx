/**
 * Lazy-loaded components for performance optimization
 * Heavy components are loaded on-demand to reduce initial bundle size
 */
import { lazy, Suspense, type ComponentType } from 'react';
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
function withLazy<M, P extends object>(
  loadModule: () => Promise<M>,
  selectComponent: (module: M) => ComponentType<P>,
  fallback: React.ReactNode = <LoadingFallback />
) {
  const LazyComponent = lazy(async () => ({ default: selectComponent(await loadModule()) }));

  return (props: P) => (
    <Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

// Lazy-loaded heavy components
export const LazyAnimationPanel = withLazy(
  () => import('./AnimationPanel'), module => module.AnimationPanel
);

export const LazyAudioEffectsPanel = withLazy(
  () => import('./AudioEffectsPanel'), module => module.AudioEffectsPanel
);

export const LazyAudioCurveEditor = withLazy(
  () => import('./AudioCurveEditor'), module => module.AudioCurveEditor
);

export const LazySurroundSoundPanel = withLazy(
  () => import('./SurroundSoundPanel'), module => module.SurroundSoundPanel
);

export const LazyBezierCurveEditor = withLazy(
  () => import('./BezierCurveEditor'), module => module.BezierCurveEditor
);

export const LazyPreviewPanel = withLazy(
  () => import('./PreviewPanel'), module => module.PreviewPanel
);

export const LazyVoiceOverGenerator = withLazy(
  () => import('./VoiceOverGenerator'), module => module.VoiceOverGenerator
);

export const LazyTaskQueueModal = withLazy(
  () => import('./TaskQueueModal'), module => module.TaskQueueModal
);

export const LazyResultsGallery = withLazy(
  () => import('./ResultsGallery'), module => module.ResultsGallery
);

// Custom fallback for specific components
export const LazyWaveformDisplay = withLazy(
  () => import('./WaveformDisplay'),
  module => module.WaveformDisplay,
  <div className="flex items-center justify-center h-16 bg-muted rounded">
    <span className="text-sm text-muted-foreground">Loading waveform...</span>
  </div>
);

export const LazyAudioEffectPresetsPanel = withLazy(
  () => import('./AudioEffectPresetsPanel'), module => module.AudioEffectPresetsPanel
);

export const LazyAISurroundAssistant = withLazy(
  () => import('./AISurroundAssistant'), module => module.AISurroundAssistant
);
