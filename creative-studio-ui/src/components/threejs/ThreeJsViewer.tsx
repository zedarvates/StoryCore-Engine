/**
 * Three.js Viewer Component
 * 
 * A React component for rendering Three.js 3D scenes in StoryCore.
 * Provides automatic scene initialization, model loading, and animation support.
 */

import React, { useEffect, useCallback, useRef } from 'react';
import { Camera } from 'lucide-react';
import { useThreeJs } from '../../hooks/useThreeJs';
import {
  ThreeJsViewerProps,
  ThreeJsSceneConfig,
  ModelConfig,
  AnimationConfig,
  CameraAnimationConfig,
  EffectComposerConfig,
  ThreeJsState
} from '../../services/threejs/ThreeJsTypes';
import {
  threeJsService,
  defaultSceneConfig,
  defaultCameraAnimationConfig
} from '../../services/threejs/ThreeJsService';
import { ShotRenderer } from '../../services/threejs/ShotRenderer';

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative' as const,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: '#000000'
  },
  canvas: {
    display: 'block',
    width: '100%',
    height: '100%'
  },
  loading: {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: '#ffffff',
    fontSize: '16px',
    fontFamily: 'system-ui, sans-serif'
  },
  error: {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: '#ff4444',
    fontSize: '14px',
    fontFamily: 'system-ui, sans-serif',
    textAlign: 'center' as const,
    padding: '20px',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: '8px'
  },
  controls: {
    position: 'absolute' as const,
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '10px',
    padding: '10px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: '8px'
  },
  button: {
    padding: '8px 16px',
    backgroundColor: '#4a90d9',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontFamily: 'system-ui, sans-serif',
    transition: 'background-color 0.2s'
  }
};

// ============================================================================
// ThreeJsViewer Component
// ============================================================================

export const ThreeJsViewer: React.FC<ThreeJsViewerProps> = ({
  sceneConfig,
  cameraConfig,
  models = [],
  cameraAnimation,
  effects,
  onReady,
  onError,
  onFrameRendered,
  onCameraCapture,
  currentFrame,
  continuous = false,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    state,
    isReady,
    error,
    initializeScene,
    disposeScene,
    loadModel,
    unloadModel,
    playAnimation,
    stopAnimation,
    animateCamera,
    stopCameraAnimation,
    updateCameraPosition,
    renderFrame,
    startRendering,
    stopRendering,
    updateEffects
  } = useThreeJs({
    sceneConfig,
    cameraConfig,
    onReady,
    onError,
    onFrameRendered
  });

  // ==========================================================================
  // Initialize Scene
  // ==========================================================================

  useEffect(() => {
    const initScene = async () => {
      try {
        await initializeScene({
          ...defaultSceneConfig,
          ...sceneConfig
        });
      } catch (err) {
        console.error('Failed to initialize Three.js scene:', err);
      }
    };

    if (!state.isReady && !error) {
      initScene();
    }

    return () => {
      disposeScene();
    };
  }, [initializeScene, disposeScene, sceneConfig, error, state.isReady]);

  // ==========================================================================
  // Load Models
  // ==========================================================================

  useEffect(() => {
    if (!state.isReady) return;

    const loadModels = async () => {
      for (const modelConfig of models) {
        try {
          await loadModel(modelConfig.modelPath, modelConfig);
        } catch (err) {
          console.error(`Failed to load model ${modelConfig.modelPath}:`, err);
        }
      }
    };

    loadModels();

    return () => {
      models.forEach(model => unloadModel(model.modelPath));
    };
  }, [state.isReady, models, loadModel, unloadModel]);

  // ==========================================================================
  // Start/Stop Rendering
  // ==========================================================================

  useEffect(() => {
    if (continuous && state.isReady) {
      startRendering();
    }

    return () => {
      stopRendering();
    };
  }, [continuous, state.isReady, startRendering, stopRendering]);

  // ==========================================================================
  // Frame-by-frame Rendering
  // ==========================================================================

  useEffect(() => {
    if (!continuous && currentFrame !== undefined && state.isReady) {
      renderFrame();
    }
  }, [currentFrame, continuous, state.isReady, renderFrame]);

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div
      ref={containerRef}
      className={className}
      style={styles.container}
    >
      {/* Canvas Container */}
      <div style={styles.canvas}>
        {/* Three.js canvas will be appended here */}
      </div>

      {/* Loading State */}
      {!isReady && !error && (
        <div style={styles.loading}>
          Loading 3D Scene...
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={styles.error}>
          <p>Failed to initialize 3D scene</p>
          <p>{error}</p>
        </div>
      )}

      {/* Overlay Controls */}
      {isReady && onCameraCapture && (
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
          <button
            onClick={() => {
              const camera = threeJsService.getCamera();
              const state = threeJsService.getState();
              if (camera && state.cameraConfig) {
                // Capture the reference image
                const referenceImage = ShotRenderer.captureFrame({
                  format: 'image/webp',
                  quality: 0.9
                });

                onCameraCapture({
                  position: [camera.position.x, camera.position.y, camera.position.z],
                  target: state.cameraConfig.lookAt as [number, number, number],
                  fov: camera.fov,
                  referenceImage
                });
              }
            }}
            className="flex items-center gap-2 bg-black/60 hover:bg-violet-600 text-white px-3 py-1.5 rounded-md border border-white/10 transition-colors text-xs font-semibold backdrop-blur-md"
            title="Capturer cet angle pour le Shot"
          >
            <Camera size={14} />
            Capturer l'Angle
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Scene Builder Helper
// ============================================================================

export class ThreeJsSceneBuilder {
  private config: Partial<ThreeJsSceneConfig> = {};
  private models: ModelConfig[] = [];
  private cameraConfig: Partial<import('../../services/threejs/ThreeJsTypes').CameraConfig> = {};
  private animationConfig: Partial<CameraAnimationConfig> = {};
  private effectsConfig: Partial<EffectComposerConfig> = {};
  private readyCallback?: () => void;
  private errorCallback?: (error: string) => void;

  width(width: number): this {
    this.config.width = width;
    return this;
  }

  height(height: number): this {
    this.config.height = height;
    return this;
  }

  backgroundColor(color: string): this {
    this.config.backgroundColor = color;
    return this;
  }

  antialias(enabled: boolean): this {
    this.config.antialias = enabled;
    return this;
  }

  shadows(enabled: boolean): this {
    this.config.shadows = enabled;
    return this;
  }

  pixelRatio(ratio: number): this {
    this.config.pixelRatio = ratio;
    return this;
  }

  addModel(config: ModelConfig): this {
    this.models.push(config);
    return this;
  }

  cameraPosition(position: [number, number, number]): this {
    this.cameraConfig.position = position;
    return this;
  }

  cameraLookAt(target: [number, number, number]): this {
    this.cameraConfig.lookAt = target;
    return this;
  }

  cameraFOV(fov: number): this {
    this.cameraConfig.fov = fov;
    return this;
  }

  animateCamera(config: Partial<CameraAnimationConfig>): this {
    this.animationConfig = config;
    return this;
  }

  withEffects(config: Partial<EffectComposerConfig>): this {
    this.effectsConfig = config;
    return this;
  }

  onReady(callback: () => void): this {
    this.readyCallback = callback;
    return this;
  }

  onError(callback: (error: string) => void): this {
    this.errorCallback = callback;
    return this;
  }

  build(): ThreeJsViewerProps {
    return {
      sceneConfig: this.config,
      models: this.models,
      cameraConfig: this.cameraConfig as Partial<import('../../services/threejs/ThreeJsTypes').CameraConfig>,
      effects: this.effectsConfig,
      onReady: this.readyCallback,
      onError: this.errorCallback
    };
  }
}

// ============================================================================
// Scene Builder Factory
// ============================================================================

export function createThreeJsScene(): ThreeJsSceneBuilder {
  return new ThreeJsSceneBuilder();
}

export default ThreeJsViewer;
