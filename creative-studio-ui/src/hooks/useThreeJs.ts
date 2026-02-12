/**
 * React Hook for Three.js Integration
 * 
 * Provides a convenient React hook for integrating Three.js 3D scenes
 * into StoryCore components with automatic lifecycle management.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ThreeJsSceneConfig, 
  CameraConfig, 
  ModelConfig, 
  AnimationConfig,
  CameraAnimationConfig,
  EffectComposerConfig,
  ThreeJsViewerProps,
  ThreeJsState,
  ModelLoadResult
} from '../services/threejs/ThreeJsTypes';
import { 
  threeJsService, 
  defaultSceneConfig, 
  defaultCameraConfig 
} from '../services/threejs/ThreeJsService';

// ============================================================================
// Hook Return Type
// ============================================================================

interface UseThreeJsReturn {
  // State
  state: ThreeJsState;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isReady: boolean;
  error: string | null;
  
  // Scene Management
  initializeScene: (config?: Partial<ThreeJsSceneConfig>) => Promise<void>;
  disposeScene: () => void;
  
  // Model Management
  loadModel: (id: string, config: ModelConfig) => Promise<ModelLoadResult>;
  unloadModel: (id: string) => void;
  
  // Animation
  playAnimation: (modelId: string, config: AnimationConfig) => void;
  stopAnimation: (modelId: string) => void;
  
  // Camera
  animateCamera: (config: CameraAnimationConfig) => void;
  stopCameraAnimation: () => void;
  updateCameraPosition: (position: [number, number, number]) => void;
  
  // Rendering
  renderFrame: () => void;
  startRendering: () => void;
  stopRendering: () => void;
  
  // Effects
  updateEffects: (config: Partial<EffectComposerConfig>) => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useThreeJs(props: ThreeJsViewerProps = {}): UseThreeJsReturn {
  // State
  const [state, setState] = useState<ThreeJsState>({
    sceneConfig: null,
    models: new Map(),
    cameraConfig: null,
    activeAnimation: null,
    isReady: false,
    isRendering: false,
    error: null
  });

  // Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const initializedRef = useRef(false);
  const frameCountRef = useRef(0);

  // ==========================================================================
  // Event Handlers
  // ==========================================================================

  const handleSceneReady = useCallback(() => {
    setState(prev => ({ ...prev, isReady: true, error: null }));
    props.onReady?.();
  }, [props.onReady]);

  const handleSceneError = useCallback((error: string) => {
    setState(prev => ({ ...prev, error, isReady: false }));
    props.onError?.(error);
  }, [props.onError]);

  const handleFrameRendered = useCallback(() => {
    frameCountRef.current += 1;
    if (props.onFrameRendered) {
      props.onFrameRendered(frameCountRef.current);
    }
  }, [props.onFrameRendered]);

  // ==========================================================================
  // Event Subscription
  // ==========================================================================

  useEffect(() => {
    threeJsService.on('scene:ready', handleSceneReady as () => void);
    threeJsService.on('scene:error', handleSceneError as (error: string) => void);
    threeJsService.on('frame:rendered', handleFrameRendered as () => void);

    return () => {
      threeJsService.off('scene:ready', handleSceneReady as () => void);
      threeJsService.off('scene:error', handleSceneError as (error: string) => void);
      threeJsService.off('frame:rendered', handleFrameRendered as () => void);
    };
  }, [handleSceneReady, handleSceneError, handleFrameRendered]);

  // ==========================================================================
  // Scene Initialization
  // ==========================================================================

  const initializeScene = useCallback(async (config?: Partial<ThreeJsSceneConfig>) => {
    if (initializedRef.current) {
      return;
    }

    const mergedConfig: ThreeJsSceneConfig = {
      ...defaultSceneConfig,
      ...config,
      width: config?.width || 1920,
      height: config?.height || 1080
    };

    await threeJsService.initializeScene(mergedConfig);

    // Attach canvas if available
    const canvas = canvasRef.current;
    if (canvas && threeJsService.getRenderer()) {
      // Canvas will be attached by the renderer
    }

    initializedRef.current = true;
  }, []);

  const disposeScene = useCallback(() => {
    threeJsService.disposeScene();
    initializedRef.current = false;
    setState({
      sceneConfig: null,
      models: new Map(),
      cameraConfig: null,
      activeAnimation: null,
      isReady: false,
      isRendering: false,
      error: null
    });
  }, []);

  // ==========================================================================
  // Model Management
  // ==========================================================================

  const loadModel = useCallback(async (id: string, config: ModelConfig) => {
    return threeJsService.loadModel(id, config);
  }, []);

  const unloadModel = useCallback((id: string) => {
    threeJsService.unloadModel(id);
  }, []);

  // ==========================================================================
  // Animation
  // ==========================================================================

  const playAnimation = useCallback((modelId: string, config: AnimationConfig) => {
    threeJsService.playAnimation(modelId, config);
  }, []);

  const stopAnimation = useCallback((modelId: string) => {
    threeJsService.stopAnimation(modelId);
  }, []);

  // ==========================================================================
  // Camera
  // ==========================================================================

  const animateCamera = useCallback((config: CameraAnimationConfig) => {
    threeJsService.animateCamera(config);
  }, []);

  const stopCameraAnimation = useCallback(() => {
    threeJsService.stopCameraAnimation();
  }, []);

  const updateCameraPosition = useCallback((position: [number, number, number]) => {
    threeJsService.updateCameraPosition(position);
  }, []);

  // ==========================================================================
  // Rendering
  // ==========================================================================

  const renderFrame = useCallback(() => {
    threeJsService.renderFrame();
  }, []);

  const startRendering = useCallback(() => {
    threeJsService.startRendering();
    setState(prev => ({ ...prev, isRendering: true }));
  }, []);

  const stopRendering = useCallback(() => {
    threeJsService.stopRendering();
    setState(prev => ({ ...prev, isRendering: false }));
  }, []);

  // ==========================================================================
  // Effects
  // ==========================================================================

  const updateEffects = useCallback((config: Partial<EffectComposerConfig>) => {
    threeJsService.updateEffects(config);
  }, []);

  // ==========================================================================
  // Auto-initialization
  // ==========================================================================

  useEffect(() => {
    if (props.sceneConfig && !initializedRef.current) {
      initializeScene(props.sceneConfig);
    }

    return () => {
      // Cleanup is handled by the component using this hook
    };
  }, [props.sceneConfig, initializeScene]);

  // ==========================================================================
  // Sync state periodically
  // ==========================================================================

  useEffect(() => {
    const interval = setInterval(() => {
      setState(threeJsService.getState());
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    state: threeJsService.getState(),
    canvasRef,
    isReady: state.isReady,
    error: state.error,
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
  };
}

// ============================================================================
// Hook for Scene Configuration
// ============================================================================

export function useThreeJsScene() {
  const [sceneConfig, setSceneConfig] = useState<ThreeJsSceneConfig | null>(null);
  const [cameraConfig, setCameraConfig] = useState<CameraConfig | null>(null);

  const updateSceneConfig = useCallback((config: Partial<ThreeJsSceneConfig>) => {
    setSceneConfig(prev => prev ? { ...prev, ...config } : { ...defaultSceneConfig, ...config });
  }, []);

  const updateCameraConfig = useCallback((config: Partial<CameraConfig>) => {
    setCameraConfig(prev => prev ? { ...prev, ...config } : { ...defaultCameraConfig, ...config });
  }, []);

  return {
    sceneConfig,
    cameraConfig,
    updateSceneConfig,
    updateCameraConfig
  };
}

// ============================================================================
// Hook for Model Loading
// ============================================================================

export function useThreeJsModel(modelId: string) {
  const [model, setModel] = useState<ModelLoadResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (config: ModelConfig) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await threeJsService.loadModel(modelId, config);
      setModel(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [modelId]);

  const unload = useCallback(() => {
    threeJsService.unloadModel(modelId);
    setModel(null);
  }, [modelId]);

  return {
    model,
    isLoading,
    error,
    load,
    unload
  };
}

// ============================================================================
// Hook for Camera Animation
// ============================================================================

export function useCameraAnimation() {
  const [isAnimating, setIsAnimating] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleAnimating = (p: number) => {
      setProgress(p);
      setIsAnimating(true);
    };

    threeJsService.on('camera:animating', handleAnimating as (progress: number) => void);

    return () => {
      threeJsService.off('camera:animating', handleAnimating as (progress: number) => void);
    };
  }, []);

  const start = useCallback((config: CameraAnimationConfig) => {
    threeJsService.animateCamera(config);
  }, []);

  const stop = useCallback(() => {
    threeJsService.stopCameraAnimation();
    setIsAnimating(false);
    setProgress(0);
  }, []);

  return {
    isAnimating,
    progress,
    start,
    stop
  };
}

export default useThreeJs;
