/**
 * TransitionWrapper Component
 * Main wrapper component for applying transitions to any content
 */

import React, { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  TransitionConfig,
  TransitionState,
  TransitionPreset,
  TransitionCategory,
  FadeTransitionConfig,
  SlideTransitionConfig,
  ZoomTransitionConfig,
  WipeTransitionConfig,
  GlitchTransitionConfig,
  GPUMode,
} from '../../services/transitions';
import { useTransition, useCSSTransition, TRANSITION_CSS_CLASSES } from '../../hooks/useTransition';

// ============================================
// Props
// ============================================

export interface TransitionWrapperProps {
  /** Child content to apply transition to */
  children: React.ReactNode;
  
  /** Transition configuration */
  config?: Partial<TransitionConfig>;
  
  /** Preset ID to use */
  presetId?: string;
  
  /** Whether the transition should trigger automatically */
  autoTrigger?: boolean;
  
  /** Trigger dependency - when this changes, transition runs */
  trigger?: unknown;
  
  /** Transition direction */
  direction?: 'forward' | 'backward';
  
  /** Whether to preserve the old content during transition */
  preserveOldContent?: boolean;
  
  /** Custom CSS class for the container */
  className?: string;
  
  /** Custom styles for the container */
  style?: CSSProperties;
  
  /** Canvas ref for WebGL transitions */
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  
  /** Callback when transition starts */
  onTransitionStart?: () => void;
  
  /** Callback when transition completes */
  onTransitionComplete?: () => void;
  
  /** Callback on each progress update */
  onProgressUpdate?: (progress: number) => void;
  
  /** Render function for old content (when preserveOldContent is true) */
  renderOldContent?: () => React.ReactNode;
  
  /** Render function for new content */
  renderNewContent?: (progress: number) => React.ReactNode;
}

// ============================================
// Default Props
// ============================================

const defaultProps: Partial<TransitionWrapperProps> = {
  autoTrigger: false,
  preserveOldContent: true,
  direction: 'forward',
};

// ============================================
// CSS Styles
// ============================================

const styles: Record<string, CSSProperties> = {
  container: {
    position: 'relative',
    overflow: 'hidden',
    width: '100%',
    height: '100%',
  },
  oldContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  newContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 2,
  },
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 3,
  },
};

// ============================================
// Component
// ============================================

export const TransitionWrapper: React.FC<TransitionWrapperProps> = (props) => {
  const {
    children,
    config,
    presetId,
    autoTrigger,
    trigger,
    direction,
    preserveOldContent,
    className,
    style,
    canvasRef,
    onTransitionStart,
    onTransitionComplete,
    onProgressUpdate,
    renderOldContent,
    renderNewContent,
  } = { ...defaultProps, ...props };

  const internalCanvasRef = useRef<HTMLCanvasElement>(null);
  const effectiveCanvasRef = canvasRef || internalCanvasRef;
  const [oldChildren, setOldChildren] = useState<React.ReactNode>(null);
  const [newChildren, setNewChildren] = useState<React.ReactNode>(children);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [progress, setProgress] = useState(0);

  // WebGL-based transition
  const {
    state,
    isActive,
    isComplete,
    start,
    cancel,
    reset,
    applyPreset,
    getPreset,
    getPresets,
    getPresetsByCategory,
    metrics,
    engine,
  } = useTransition(effectiveCanvasRef, config);

  // CSS-based transition helper
  const {
    isTransitioning: cssTransitioning,
    fadeOut,
    fadeIn,
    slideLeft,
    slideRight,
    zoomIn,
    zoomOut,
  } = useCSSTransition(useRef<HTMLDivElement>(null));

  // Apply preset if specified
  useEffect(() => {
    if (presetId && engine) {
      const preset = getPreset(presetId);
      if (preset) {
        start(preset.defaultConfig);
      }
    }
  }, [presetId, engine, getPreset, start]);

  // Handle trigger changes
  useEffect(() => {
    if (autoTrigger && trigger !== undefined) {
      // Store old children
      if (preserveOldContent) {
        setOldChildren(newChildren);
      }
      
      // Update new children
      setNewChildren(children);
      
      // Start transition
      if (presetId && engine) {
        applyPreset(presetId);
      } else if (config) {
        start(config as TransitionConfig);
      } else {
        // Default to fade
        fadeOut();
        setTimeout(() => {
          fadeIn();
          setIsTransitioning(true);
        }, 100);
      }
    }
  }, [autoTrigger, trigger, children, preserveOldContent, presetId, config, engine, applyPreset, start, fadeOut, fadeIn]);

  // Update progress
  useEffect(() => {
    setProgress(state.progress);
    onProgressUpdate?.(state.progress);

    if (state.phase === 'running') {
      setIsTransitioning(true);
      onTransitionStart?.();
    }

    if (state.phase === 'complete') {
      setIsTransitioning(false);
      setOldChildren(null);
      onTransitionComplete?.();
    }
  }, [state, onTransitionStart, onTransitionComplete, onProgressUpdate]);

  // Render content based on transition type
  const renderTransitionContent = useMemo(() => {
    if (!isTransitioning && !isActive) {
      return (
        <div style={styles.newContent}>
          {renderNewContent ? renderNewContent(1) : newChildren}
        </div>
      );
    }

    return (
      <>
        {preserveOldContent && oldChildren && (
          <div style={styles.oldContent}>
            {renderOldContent ? renderOldContent() : oldChildren}
          </div>
        )}
        <div style={styles.newContent}>
          {renderNewContent ? renderNewContent(progress) : newChildren}
        </div>
      </>
    );
  }, [isTransitioning, isActive, progress, preserveOldContent, oldChildren, newChildren, renderOldContent, renderNewContent]);

  return (
    <>
      <style>{TRANSITION_CSS_CLASSES}</style>
      <div
        className={`transition-wrapper ${className || ''}`}
        style={{ ...styles.container, ...style }}
      >
        {renderTransitionContent}
        <canvas
          ref={effectiveCanvasRef}
          style={styles.canvas}
          width={style?.width || 800}
          height={style?.height || 600}
        />
      </div>
    </>
  );
};

// ============================================
// Preset Selector Component
// ============================================

export interface TransitionPresetSelectorProps {
  /** Currently selected preset ID */
  selectedPresetId?: string;
  
  /** Callback when a preset is selected */
  onSelect?: (presetId: string) => void;
  
  /** Filter by category */
  category?: TransitionCategory;
  
  /** Custom class name */
  className?: string;
  
  /** Show thumbnails */
  showThumbnails?: boolean;
  
  /** Custom styles */
  style?: CSSProperties;
}

export const TransitionPresetSelector: React.FC<TransitionPresetSelectorProps> = ({
  selectedPresetId,
  onSelect,
  category,
  className,
  showThumbnails = true,
  style,
}) => {
  const presets = useMemo(() => {
    // This would normally get presets from the engine
    // For now, return a static list
    const allPresets: TransitionPreset[] = [
      { id: 'fade-black', name: 'Fade to Black', category: 'fade', description: 'Smooth fade to black', defaultConfig: { type: 'fade', duration: 500, easing: 'easeInOut', gpuMode: 'auto', performanceTier: 'high', fadeType: 'black' } as FadeTransitionConfig, tags: ['fade', 'black'], gpuSupported: true, performanceRating: 5 },
      { id: 'fade-white', name: 'Fade to White', category: 'fade', description: 'Smooth fade to white', defaultConfig: { type: 'fade', duration: 500, easing: 'easeInOut', gpuMode: 'auto', performanceTier: 'high', fadeType: 'white' } as FadeTransitionConfig, tags: ['fade', 'white'], gpuSupported: true, performanceRating: 5 },
      { id: 'fade-cross', name: 'Cross Fade', category: 'fade', description: 'Cross dissolve between clips', defaultConfig: { type: 'fade', duration: 600, easing: 'linear', gpuMode: 'auto', performanceTier: 'high', fadeType: 'cross' } as FadeTransitionConfig, tags: ['fade', 'cross'], gpuSupported: true, performanceRating: 5 },
      { id: 'slide-left', name: 'Slide Left', category: 'slide', description: 'Slide from right to left', defaultConfig: { type: 'slide', duration: 400, easing: 'easeOut', gpuMode: 'auto', performanceTier: 'high', direction: 'left' } as SlideTransitionConfig, tags: ['slide', 'left'], gpuSupported: true, performanceRating: 5 },
      { id: 'slide-right', name: 'Slide Right', category: 'slide', description: 'Slide from left to right', defaultConfig: { type: 'slide', duration: 400, easing: 'easeOut', gpuMode: 'auto', performanceTier: 'high', direction: 'right' } as SlideTransitionConfig, tags: ['slide', 'right'], gpuSupported: true, performanceRating: 5 },
      { id: 'slide-up', name: 'Slide Up', category: 'slide', description: 'Slide from bottom to top', defaultConfig: { type: 'slide', duration: 400, easing: 'easeOut', gpuMode: 'auto', performanceTier: 'high', direction: 'up' } as SlideTransitionConfig, tags: ['slide', 'up'], gpuSupported: true, performanceRating: 5 },
      { id: 'slide-down', name: 'Slide Down', category: 'slide', description: 'Slide from top to bottom', defaultConfig: { type: 'slide', duration: 400, easing: 'easeOut', gpuMode: 'auto', performanceTier: 'high', direction: 'down' } as SlideTransitionConfig, tags: ['slide', 'down'], gpuSupported: true, performanceRating: 5 },
      { id: 'zoom-in', name: 'Zoom In', category: 'zoom', description: 'Zoom into next clip', defaultConfig: { type: 'zoom', duration: 500, easing: 'easeInOut', gpuMode: 'auto', performanceTier: 'high', zoomType: 'in', intensity: 1.5 } as ZoomTransitionConfig, tags: ['zoom', 'in'], gpuSupported: true, performanceRating: 5 },
      { id: 'zoom-out', name: 'Zoom Out', category: 'zoom', description: 'Zoom out of current clip', defaultConfig: { type: 'zoom', duration: 500, easing: 'easeInOut', gpuMode: 'auto', performanceTier: 'high', zoomType: 'out', intensity: 0.5 } as ZoomTransitionConfig, tags: ['zoom', 'out'], gpuSupported: true, performanceRating: 5 },
      { id: 'zoom-pulsar', name: 'Pulsar Zoom', category: 'zoom', description: 'Dynamic zoom with pulse', defaultConfig: { type: 'zoom', duration: 600, easing: 'elastic', gpuMode: 'auto', performanceTier: 'high', zoomType: 'pulsar', intensity: 2.0 } as ZoomTransitionConfig, tags: ['zoom', 'pulsar', 'dynamic'], gpuSupported: true, performanceRating: 4 },
      { id: 'wipe-linear', name: 'Linear Wipe', category: 'wipe', description: 'Linear wipe transition', defaultConfig: { type: 'wipe', duration: 400, easing: 'linear', gpuMode: 'auto', performanceTier: 'high', wipeType: 'linear', direction: 'left' } as WipeTransitionConfig, tags: ['wipe', 'linear'], gpuSupported: true, performanceRating: 5 },
      { id: 'wipe-radial', name: 'Radial Wipe', category: 'wipe', description: 'Radial wipe from center', defaultConfig: { type: 'wipe', duration: 500, easing: 'easeInOut', gpuMode: 'auto', performanceTier: 'high', wipeType: 'radial', direction: 'left' } as WipeTransitionConfig, tags: ['wipe', 'radial'], gpuSupported: true, performanceRating: 5 },
      { id: 'glitch-rgb', name: 'RGB Glitch', category: 'glitch', description: 'RGB split glitch effect', defaultConfig: { type: 'glitch', duration: 300, easing: 'linear', gpuMode: 'auto', performanceTier: 'high', glitchType: 'rgbSplit', intensity: 0.5 } as GlitchTransitionConfig, tags: ['glitch', 'rgb', 'vhs'], gpuSupported: true, performanceRating: 4 },
      { id: 'glitch-noise', name: 'Noise Glitch', category: 'glitch', description: 'Digital noise glitch', defaultConfig: { type: 'glitch', duration: 400, easing: 'linear', gpuMode: 'auto', performanceTier: 'high', glitchType: 'noise', intensity: 0.7 } as GlitchTransitionConfig, tags: ['glitch', 'noise', 'static'], gpuSupported: true, performanceRating: 4 },
    ];

    if (category) {
      return allPresets.filter(p => p.category === category);
    }
    return allPresets;
  }, [category]);

  return (
    <div className={`transition-preset-selector ${className || ''}`} style={style}>
      <div className="preset-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: '8px',
        padding: '8px',
      }}>
        {presets.map((preset) => (
          <div
            key={preset.id}
            className={`preset-item ${selectedPresetId === preset.id ? 'selected' : ''}`}
            onClick={() => onSelect?.(preset.id)}
            style={{
              padding: '12px',
              border: selectedPresetId === preset.id ? '2px solid #007bff' : '1px solid #ddd',
              borderRadius: '8px',
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'all 0.2s ease',
              background: selectedPresetId === preset.id ? '#e7f1ff' : '#fff',
            }}
          >
            {showThumbnails && (
              <div
                className="preset-thumbnail"
                style={{
                  width: '100%',
                  height: '60px',
                  background: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`,
                  borderRadius: '4px',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '12px',
                }}
              >
                {preset.category.toUpperCase()}
              </div>
            )}
            <div className="preset-name" style={{ fontWeight: 500, fontSize: '14px' }}>
              {preset.name}
            </div>
            <div className="preset-description" style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
              {preset.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// Progress Bar Component
// ============================================

export interface TransitionProgressBarProps {
  /** Current progress (0-1) */
  progress: number;
  
  /** Whether transition is active */
  isActive?: boolean;
  
  /** Custom class name */
  className?: string;
  
  /** Custom styles */
  style?: CSSProperties;
  
  /** Bar color */
  color?: string;
  
  /** Bar height */
  height?: number;
}

export const TransitionProgressBar: React.FC<TransitionProgressBarProps> = ({
  progress,
  isActive = true,
  className,
  style,
  color = '#007bff',
  height = 4,
}) => {
  return (
    <div
      className={`transition-progress-bar ${className || ''}`}
      style={{
        width: '100%',
        height: `${height}px`,
        background: '#e0e0e0',
        borderRadius: `${height / 2}px`,
        overflow: 'hidden',
        ...style,
      }}
    >
      <div
        className="progress-fill"
        style={{
          width: `${progress * 100}%`,
          height: '100%',
          background: color,
          borderRadius: `${height / 2}px`,
          transition: isActive ? 'width 0.05s linear' : 'none',
        }}
      />
    </div>
  );
};

// ============================================
// Metrics Display Component
// ============================================

export interface TransitionMetricsDisplayProps {
  /** Metrics to display */
  metrics: {
    totalTime?: number;
    averageFPS?: number;
    minFPS?: number;
    maxFPS?: number;
    gpuMemoryPeak?: number;
    frameDrops?: number;
    cpuTimePerFrame?: number;
    gpuTimePerFrame?: number;
  } | null;
  
  /** Custom class name */
  className?: string;
  
  /** Custom styles */
  style?: CSSProperties;
  
  /** Whether to show detailed metrics */
  showDetails?: boolean;
}

export const TransitionMetricsDisplay: React.FC<TransitionMetricsDisplayProps> = ({
  metrics,
  className,
  style,
  showDetails = false,
}) => {
  if (!metrics) {
    return (
      <div className={`transition-metrics ${className || ''}`} style={style}>
        No metrics available
      </div>
    );
  }

  return (
    <div
      className={`transition-metrics ${className || ''}`}
      style={{
        padding: '12px',
        background: '#f5f5f5',
        borderRadius: '8px',
        fontSize: '12px',
        fontFamily: 'monospace',
        ...style,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: '8px' }}>Transition Metrics</div>
      <div>Total Time: {metrics.totalTime?.toFixed(2) || 0}ms</div>
      <div>Average FPS: {metrics.averageFPS || 0}</div>
      <div>Min FPS: {metrics.minFPS || 0}</div>
      <div>Max FPS: {metrics.maxFPS || 0}</div>
      {showDetails && (
        <>
          <div>Frame Drops: {metrics.frameDrops || 0}</div>
          <div>GPU Memory: {metrics.gpuMemoryPeak ? `${(metrics.gpuMemoryPeak / 1024 / 1024).toFixed(2)}MB` : 'N/A'}</div>
          <div>CPU/frame: {metrics.cpuTimePerFrame?.toFixed(2) || 0}ms</div>
          <div>GPU/frame: {metrics.gpuTimePerFrame?.toFixed(2) || 0}ms</div>
        </>
      )}
    </div>
  );
};
