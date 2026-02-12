/**
 * Pre-built Transition Effects
 * Ready-to-use transition components for common use cases
 */

import React, { CSSProperties, useCallback, useRef, useState } from 'react';
import {
  TransitionConfig,
  FadeTransitionConfig,
  SlideTransitionConfig,
  ZoomTransitionConfig,
  WipeTransitionConfig,
  GlitchTransitionConfig,
  GPUMode,
  PerformanceTier,
} from '../../services/transitions';
import { useTransition } from '../../hooks/useTransition';
import { TransitionWrapper, TransitionProgressBar, TransitionMetricsDisplay } from './TransitionWrapper';

// ============================================
// Fade Transition
// ============================================

export interface FadeTransitionProps {
  /** Child content */
  children: React.ReactNode;
  
  /** Fade type */
  fadeType?: 'black' | 'white' | 'cross' | 'transparent';
  
  /** Duration in milliseconds */
  duration?: number;
  
  /** Whether auto-triggers on children change */
  autoTrigger?: boolean;
  
  /** Current content key (triggers transition when changed) */
  contentKey?: string;
  
  /** Easing function */
  easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'elastic' | 'bounce';
  
  /** GPU mode */
  gpuMode?: GPUMode;
  
  /** Performance tier */
  performanceTier?: PerformanceTier;
  
  /** Callback when transition starts */
  onStart?: () => void;
  
  /** Callback when transition completes */
  onComplete?: () => void;
}

export const FadeTransition: React.FC<FadeTransitionProps> = ({
  children,
  fadeType = 'cross',
  duration = 500,
  autoTrigger = false,
  contentKey,
  easing = 'easeInOut',
  gpuMode = 'auto',
  performanceTier = 'high',
  onStart,
  onComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [key, setKey] = useState(contentKey || 'initial');
  const [progress, setProgress] = useState(0);
  const [metrics, setMetrics] = useState<any>(null);

  const config: FadeTransitionConfig = {
    type: 'fade',
    fadeType,
    duration,
    easing,
    gpuMode,
    performanceTier,
    onStart: () => {
      setProgress(0);
      onStart?.();
    },
    onUpdate: (p) => setProgress(p),
    onComplete: () => {
      setProgress(1);
      setMetrics({ totalTime: duration }); // Simplified metrics
      onComplete?.();
    },
  };

  const { start, cancel } = useTransition(canvasRef, config);

  // Trigger transition when key changes
  React.useEffect(() => {
    if (autoTrigger && contentKey !== undefined) {
      setKey(contentKey);
      start(config);
    }
  }, [contentKey, autoTrigger, start]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <TransitionWrapper
        config={config}
        canvasRef={canvasRef}
        trigger={key}
        autoTrigger={autoTrigger}
        onTransitionStart={onStart}
        onTransitionComplete={onComplete}
        onProgressUpdate={setProgress}
      >
        <div key={key} style={{ width: '100%', height: '100%' }}>
          {children}
        </div>
      </TransitionWrapper>
      {progress > 0 && progress < 1 && (
        <TransitionProgressBar progress={progress} />
      )}
    </div>
  );
};

// ============================================
// Slide Transition
// ============================================

export interface SlideTransitionProps {
  children: React.ReactNode;
  
  /** Slide direction */
  direction?: 'left' | 'right' | 'up' | 'down';
  
  /** Duration in milliseconds */
  duration?: number;
  
  /** Slide overlap (0-1) */
  overlap?: number;
  
  /** Whether auto-triggers on children change */
  autoTrigger?: boolean;
  
  /** Current content key */
  contentKey?: string;
  
  /** Easing function */
  easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'elastic';
  
  /** GPU mode */
  gpuMode?: GPUMode;
  
  /** Enable parallax effect */
  parallax?: boolean;
  
  /** Parallax intensity */
  parallaxIntensity?: number;
}

export const SlideTransition: React.FC<SlideTransitionProps> = ({
  children,
  direction = 'left',
  duration = 400,
  overlap = 0.2,
  autoTrigger = false,
  contentKey,
  easing = 'easeOut',
  gpuMode = 'auto',
  parallax = false,
  parallaxIntensity = 0.3,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [key, setKey] = useState(contentKey || 'initial');
  const [progress, setProgress] = useState(0);

  const config: SlideTransitionConfig = {
    type: 'slide',
    direction,
    duration,
    easing,
    gpuMode,
    performanceTier: 'high',
    overlap,
    parallax,
    parallaxIntensity,
    onUpdate: (p) => setProgress(p),
  };

  const { start } = useTransition(canvasRef, config);

  React.useEffect(() => {
    if (autoTrigger && contentKey !== undefined) {
      setKey(contentKey);
      start(config);
    }
  }, [contentKey, autoTrigger, start]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <TransitionWrapper
        config={config}
        canvasRef={canvasRef}
        trigger={key}
        autoTrigger={autoTrigger}
        onProgressUpdate={setProgress}
      >
        <div key={key} style={{ width: '100%', height: '100%' }}>
          {children}
        </div>
      </TransitionWrapper>
      {progress > 0 && progress < 1 && (
        <TransitionProgressBar progress={progress} />
      )}
    </div>
  );
};

// ============================================
// Zoom Transition
// ============================================

export interface ZoomTransitionProps {
  children: React.ReactNode;
  
  /** Zoom type */
  zoomType?: 'in' | 'out' | 'pulsar';
  
  /** Duration in milliseconds */
  duration?: number;
  
  /** Zoom intensity factor */
  intensity?: number;
  
  /** Zoom origin [x, y] as percentage (0-1) */
  origin?: [number, number];
  
  /** Whether to add rotation */
  rotation?: boolean;
  
  /** Rotation angle in degrees */
  rotationAngle?: number;
  
  /** Auto-trigger */
  autoTrigger?: boolean;
  
  /** Content key */
  contentKey?: string;
  
  /** Easing */
  easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'elastic';
}

export const ZoomTransition: React.FC<ZoomTransitionProps> = ({
  children,
  zoomType = 'in',
  duration = 500,
  intensity = 1.5,
  origin = [0.5, 0.5],
  rotation = false,
  rotationAngle = 15,
  autoTrigger = false,
  contentKey,
  easing = 'easeInOut',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [key, setKey] = useState(contentKey || 'initial');
  const [progress, setProgress] = useState(0);

  const config: ZoomTransitionConfig = {
    type: 'zoom',
    zoomType,
    duration,
    easing,
    gpuMode: 'auto',
    performanceTier: 'high',
    origin,
    intensity,
    rotation,
    rotationAngle,
    onUpdate: (p) => setProgress(p),
  };

  const { start } = useTransition(canvasRef, config);

  React.useEffect(() => {
    if (autoTrigger && contentKey !== undefined) {
      setKey(contentKey);
      start(config);
    }
  }, [contentKey, autoTrigger, start]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <TransitionWrapper
        config={config}
        canvasRef={canvasRef}
        trigger={key}
        autoTrigger={autoTrigger}
        onProgressUpdate={setProgress}
      >
        <div key={key} style={{ width: '100%', height: '100%' }}>
          {children}
        </div>
      </TransitionWrapper>
      {progress > 0 && progress < 1 && (
        <TransitionProgressBar progress={progress} />
      )}
    </div>
  );
};

// ============================================
// Wipe Transition
// ============================================

export interface WipeTransitionProps {
  children: React.ReactNode;
  
  /** Wipe type */
  wipeType?: 'linear' | 'radial' | 'gradient' | 'diagonal';
  
  /** Wipe direction */
  direction?: 'left' | 'right' | 'up' | 'down';
  
  /** Duration */
  duration?: number;
  
  /** Softness of wipe edge (0-1) */
  softness?: number;
  
  /** Gradient stops for gradient wipe */
  gradientStops?: string[];
  
  /** Auto-trigger */
  autoTrigger?: boolean;
  
  /** Content key */
  contentKey?: string;
}

export const WipeTransition: React.FC<WipeTransitionProps> = ({
  children,
  wipeType = 'linear',
  direction = 'left',
  duration = 400,
  softness = 0.1,
  gradientStops,
  autoTrigger = false,
  contentKey,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [key, setKey] = useState(contentKey || 'initial');
  const [progress, setProgress] = useState(0);

  const config: WipeTransitionConfig = {
    type: 'wipe',
    wipeType,
    direction,
    duration,
    easing: 'linear',
    gpuMode: 'auto',
    performanceTier: 'high',
    softness,
    gradientStops,
    onUpdate: (p) => setProgress(p),
  };

  const { start } = useTransition(canvasRef, config);

  React.useEffect(() => {
    if (autoTrigger && contentKey !== undefined) {
      setKey(contentKey);
      start(config);
    }
  }, [contentKey, autoTrigger, start]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <TransitionWrapper
        config={config}
        canvasRef={canvasRef}
        trigger={key}
        autoTrigger={autoTrigger}
        onProgressUpdate={setProgress}
      >
        <div key={key} style={{ width: '100%', height: '100%' }}>
          {children}
        </div>
      </TransitionWrapper>
      {progress > 0 && progress < 1 && (
        <TransitionProgressBar progress={progress} />
      )}
    </div>
  );
};

// ============================================
// Glitch Transition
// ============================================

export interface GlitchTransitionProps {
  children: React.ReactNode;
  
  /** Glitch type */
  glitchType?: 'rgbSplit' | 'noise' | 'chromatic' | 'digital';
  
  /** Duration */
  duration?: number;
  
  /** Intensity (0-1) */
  intensity?: number;
  
  /** RGB offset for split */
  rgbOffset?: number;
  
  /** Number of noise blocks */
  blockCount?: number;
  
  /** Auto-trigger */
  autoTrigger?: boolean;
  
  /** Content key */
  contentKey?: string;
}

export const GlitchTransition: React.FC<GlitchTransitionProps> = ({
  children,
  glitchType = 'rgbSplit',
  duration = 300,
  intensity = 0.5,
  rgbOffset = 5,
  blockCount = 10,
  autoTrigger = false,
  contentKey,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [key, setKey] = useState(contentKey || 'initial');
  const [progress, setProgress] = useState(0);

  const config: GlitchTransitionConfig = {
    type: 'glitch',
    glitchType,
    duration,
    easing: 'linear',
    gpuMode: 'auto',
    performanceTier: 'high',
    intensity,
    rgbOffset,
    blockCount,
    onUpdate: (p) => setProgress(p),
  };

  const { start } = useTransition(canvasRef, config);

  React.useEffect(() => {
    if (autoTrigger && contentKey !== undefined) {
      setKey(contentKey);
      start(config);
    }
  }, [contentKey, autoTrigger, start]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <TransitionWrapper
        config={config}
        canvasRef={canvasRef}
        trigger={key}
        autoTrigger={autoTrigger}
        onProgressUpdate={setProgress}
      >
        <div key={key} style={{ width: '100%', height: '100%' }}>
          {children}
        </div>
      </TransitionWrapper>
      {progress > 0 && progress < 1 && (
        <TransitionProgressBar progress={progress} color="#ff0066" />
      )}
    </div>
  );
};

// ============================================
// Blur Transition
// ============================================

export interface BlurTransitionProps {
  children: React.ReactNode;
  
  /** Blur direction */
  direction?: 'in' | 'out';
  
  /** Blur radius in pixels */
  radius?: number;
  
  /** Duration */
  duration?: number;
  
  /** Whether to use grayscale */
  grayscale?: boolean;
  
  /** Auto-trigger */
  autoTrigger?: boolean;
  
  /** Content key */
  contentKey?: string;
}

export const BlurTransition: React.FC<BlurTransitionProps> = ({
  children,
  direction = 'in',
  radius = 20,
  duration = 500,
  grayscale = false,
  autoTrigger = false,
  contentKey,
}) => {
  const [key, setKey] = useState(contentKey || 'initial');
  const [progress, setProgress] = useState(0);

  // CSS-based blur transition for simplicity
  const getBlurStyle = (p: number): CSSProperties => {
    const currentRadius = direction === 'in' 
      ? radius * (1 - p)
      : radius * p;
    
    return {
      filter: `blur(${currentRadius}px)${grayscale ? ' grayscale(100%)' : ''}`,
      transition: `filter ${duration}ms ease-in-out`,
    };
  };

  React.useEffect(() => {
    if (autoTrigger && contentKey !== undefined) {
      setKey(contentKey);
      // Simulate progress
      let p = 0;
      const interval = setInterval(() => {
        p += 16 / duration;
        if (p >= 1) {
          p = 1;
          clearInterval(interval);
        }
        setProgress(p);
      }, 16);
      return () => clearInterval(interval);
    }
  }, [contentKey, autoTrigger, duration]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <div key={key} style={{ width: '100%', height: '100%', ...getBlurStyle(progress) }}>
        {children}
      </div>
      {progress > 0 && progress < 1 && (
        <TransitionProgressBar progress={progress} color="#6c5ce7" />
      )}
    </div>
  );
};

// ============================================
// Dissolve Transition
// ============================================

export interface DissolveTransitionProps {
  children: React.ReactNode;
  
  /** Dissolve pattern */
  pattern?: 'random' | 'grid' | 'radial' | 'diagonal';
  
  /** Particle size */
  particleSize?: number;
  
  /** Noise scale */
  noiseScale?: number;
  
  /** Duration */
  duration?: number;
  
  /** Auto-trigger */
  autoTrigger?: boolean;
  
  /** Content key */
  contentKey?: string;
}

export const DissolveTransition: React.FC<DissolveTransitionProps> = ({
  children,
  pattern = 'random',
  particleSize = 4,
  noiseScale = 2,
  duration = 600,
  autoTrigger = false,
  contentKey,
}) => {
  const [key, setKey] = useState(contentKey || 'initial');
  const [progress, setProgress] = useState(0);

  React.useEffect(() => {
    if (autoTrigger && contentKey !== undefined) {
      setKey(contentKey);
      let p = 0;
      const interval = setInterval(() => {
        p += 16 / duration;
        if (p >= 1) {
          p = 1;
          clearInterval(interval);
        }
        setProgress(p);
      }, 16);
      return () => clearInterval(interval);
    }
  }, [contentKey, autoTrigger, duration]);

  // Create dissolve mask based on pattern
  const getDissolveStyle = (p: number): CSSProperties => {
    const maskSize = particleSize * (1 / (p + 0.1));
    return {
      maskImage: pattern === 'random' 
        ? `radial-gradient(circle, black ${p * 100}%, transparent ${p * 100 + 10}%)`
        : `linear-gradient(45deg, black ${p * 100}%, transparent ${p * 100}%)`,
      maskSize: `${maskSize * 10}% ${maskSize * 10}%`,
      maskRepeat: 'repeat',
      transition: `mask-image ${duration}ms ease-in-out`,
    };
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <div key={key} style={{ width: '100%', height: '100%', ...getDissolveStyle(progress) }}>
        {children}
      </div>
      {progress > 0 && progress < 1 && (
        <TransitionProgressBar progress={progress} color="#00b894" />
      )}
    </div>
  );
};

// ============================================
// Transition List Component
// ============================================

export interface TransitionListProps {
  /** Available transitions */
  transitions: Array<{
    id: string;
    name: string;
    type: string;
    category: string;
    thumbnail?: string;
  }>;
  
  /** Currently selected transition */
  selectedId?: string;
  
  /** Callback when a transition is selected */
  onSelect?: (id: string) => void;
  
  /** Columns */
  columns?: number;
  
  /** Custom class name */
  className?: string;
}

export const TransitionList: React.FC<TransitionListProps> = ({
  transitions,
  selectedId,
  onSelect,
  columns = 4,
  className,
}) => {
  return (
    <div
      className={`transition-list ${className || ''}`}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: '12px',
        padding: '12px',
      }}
    >
      {transitions.map((transition) => (
        <div
          key={transition.id}
          onClick={() => onSelect?.(transition.id)}
          style={{
            padding: '16px',
            border: selectedId === transition.id ? '2px solid #007bff' : '1px solid #ddd',
            borderRadius: '8px',
            cursor: 'pointer',
            background: selectedId === transition.id ? '#e7f1ff' : '#fff',
            transition: 'all 0.2s ease',
            textAlign: 'center',
          }}
        >
          {transition.thumbnail && (
            <img
              src={transition.thumbnail}
              alt={transition.name}
              style={{
                width: '100%',
                height: '80px',
                objectFit: 'cover',
                borderRadius: '4px',
                marginBottom: '8px',
              }}
            />
          )}
          <div style={{ fontWeight: 500 }}>{transition.name}</div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            {transition.category}
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================
// Transition Preview Component
// ============================================

export interface TransitionPreviewProps {
  /** Transition ID to preview */
  transitionId?: string;
  
  /** Source content */
  sourceContent?: React.ReactNode;
  
  /** Destination content */
  destinationContent?: React.ReactNode;
  
  /** Preview size */
  size?: { width: number; height: number };
  
  /** Auto-preview */
  autoPreview?: boolean;
  
  /** Loop preview */
  loop?: boolean;
  
  /** Callback when preview is complete */
  onPreviewComplete?: () => void;
}

export const TransitionPreview: React.FC<TransitionPreviewProps> = ({
  transitionId,
  sourceContent,
  destinationContent,
  size = { width: 320, height: 180 },
  autoPreview = true,
  loop = true,
  onPreviewComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoPreview);
  const [progress, setProgress] = useState(0);

  useCallback(() => {
    if (!isPlaying || !transitionId) return;

    let p = 0;
    const duration = 1000; // 1 second preview
    const interval = setInterval(() => {
      p += 16 / duration;
      if (p >= 1) {
        if (loop) {
          p = 0;
        } else {
          p = 1;
          setIsPlaying(false);
          onPreviewComplete?.();
          clearInterval(interval);
        }
      }
      setProgress(p);
    }, 16);

    return () => clearInterval(interval);
  }, [isPlaying, transitionId, loop, onPreviewComplete]);

  return (
    <div
      className="transition-preview"
      style={{
        width: size.width,
        height: size.height,
        border: '1px solid #ddd',
        borderRadius: '8px',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Source content */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 1 - progress,
        }}
      >
        {sourceContent || (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            Source
          </div>
        )}
      </div>

      {/* Destination content */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: progress,
        }}
      >
        {destinationContent || (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            Destination
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: `${progress * 100}%`,
          height: '4px',
          background: '#007bff',
          transition: 'width 0.05s linear',
        }}
      />

      {/* Controls */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          style={{
            padding: '8px 16px',
            background: 'rgba(0,0,0,0.7)',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
      </div>
    </div>
  );
};
