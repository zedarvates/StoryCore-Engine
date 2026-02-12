/**
 * Three.js Types for StoryCore
 * 
 * Provides TypeScript types for Three.js integration including:
 * - Scene configuration
 * - Model loading
 * - Camera animations
 * - Post-processing effects
 */

import * as THREE from 'three';

// WebGL renderer parameters type
type WebGLRendererParameters = THREE.WebGLRendererParameters;

// ============================================================================
// Scene Configuration Types
// ============================================================================

export interface ThreeJsSceneConfig {
  /** Scene width in pixels */
  width: number;
  /** Scene height in pixels */
  height: number;
  /** Background color */
  backgroundColor: string;
  /** Enable antialiasing */
  antialias: boolean;
  /** WebGL renderer options */
  rendererOptions?: WebGLRendererParameters;
  /** Enable shadows */
  shadows: boolean;
  /** Enable camera controls */
  enableControls?: boolean;
  /** Pixel ratio for high-DPI displays */
  pixelRatio: number;
}

export interface LightConfig {
  /** Light type */
  type: 'ambient' | 'point' | 'directional' | 'spot' | 'hemisphere';
  /** Light color */
  color: string;
  /** Light intensity */
  intensity: number;
  /** Light position [x, y, z] */
  position?: [number, number, number];
  /** Light target position */
  target?: [number, number, number];
  /** Shadow map size */
  shadowMapSize?: number;
  /** Cast shadows */
  castShadow?: boolean;
}

export interface CameraConfig {
  /** Camera type */
  type: 'perspective' | 'orthographic';
  /** Field of view for perspective camera */
  fov?: number;
  /** Near clipping plane */
  near: number;
  /** Far clipping plane */
  far: number;
  /** Camera position [x, y, z] */
  position: [number, number, number];
  /** Camera look-at target [x, y, z] */
  lookAt: [number, number, number];
  /** Enable camera controls */
  enableControls: boolean;
  /** Camera zoom for orthographic */
  zoom?: number;
}

// ============================================================================
// Model Loading Types
// ============================================================================

export interface ModelConfig {
  /** Path to the 3D model file */
  modelPath: string;
  /** Model format */
  format: 'gltf' | 'glb' | 'obj' | 'fbx';
  /** Enable shadows */
  castShadows: boolean;
  /** Receive shadows */
  receiveShadows: boolean;
  /** Scale factor */
  scale: number;
  /** Position [x, y, z] */
  position: [number, number, number];
  /** Rotation [x, y, z] in radians */
  rotation: [number, number, number];
}

export interface AnimationConfig {
  /** Animation name to play */
  animationName: string;
  /** Whether to loop the animation */
  loop: boolean;
  /** Animation playback speed */
  speed: number;
  /** Fade in duration in seconds */
  fadeIn: number;
  /** Fade out duration in seconds */
  fadeOut: number;
}

export interface ModelLoadResult {
  /** The loaded 3D object */
  scene: THREE.Group;
  /** All animations from the model */
  animations: THREE.AnimationClip[];
  /** Model's bounding box */
  boundingBox: THREE.Box3;
  /** Whether loading was successful */
  success: boolean;
  /** Any error message */
  error?: string;
}

// ============================================================================
// Camera Animation Types
// ============================================================================

export interface CameraKeyframe {
  /** Time in seconds from start of animation */
  time: number;
  /** Camera position at this keyframe */
  position: [number, number, number];
  /** Camera look-at target at this keyframe */
  target: [number, number, number];
  /** Easing function */
  easing: EasingType;
}

export type EasingType =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'elastic'
  | 'bounce'
  | 'smoothstep'
  | 'smootherstep';

export interface CameraAnimationConfig {
  /** List of camera keyframes */
  keyframes: CameraKeyframe[];
  /** Total duration in seconds */
  duration: number;
  /** Whether to loop the animation */
  loop: boolean;
  /** Whether to auto-start the animation */
  autoStart: boolean;
}

// ============================================================================
// Post-Processing Types
// ============================================================================

export interface BloomEffectConfig {
  /** Effect enabled */
  enabled: boolean;
  /** Bloom intensity */
  intensity: number;
  /** Luminance threshold (0-1) */
  luminanceThreshold: number;
  /** Luminance smoothing (0-1) */
  luminanceSmoothing: number;
  /** Blur kernel size */
  kernelSize: number;
}

export interface ChromaticAberrationConfig {
  /** Effect enabled */
  enabled: boolean;
  /** RGB shift offset [x, y] */
  offset: [number, number];
  /** Effect radial modulation */
  radialModulation: boolean;
  /** Modulation offset */
  modulationOffset: number;
}

export interface EffectComposerConfig {
  /** Bloom effect configuration */
  bloom: BloomEffectConfig;
  /** Chromatic aberration configuration */
  chromaticAberration: ChromaticAberrationConfig;
  /** Enable antialiasing */
  enableAntialias: boolean;
  /** Enable multisampling */
  multisampling: number;
}

// ============================================================================
// Three.js Service State Types
// ============================================================================

export interface ThreeJsState {
  /** Current scene configuration */
  sceneConfig: ThreeJsSceneConfig | null;
  /** Currently loaded models */
  models: Map<string, ModelLoadResult>;
  /** Current camera configuration */
  cameraConfig: CameraConfig | null;
  /** Currently active animation */
  activeAnimation: string | null;
  /** Scene is ready for rendering */
  isReady: boolean;
  /** Currently rendering */
  isRendering: boolean;
  /** Last error encountered */
  error: string | null;
}

export interface ThreeJsActions {
  /** Initialize the Three.js scene */
  initializeScene: (config: ThreeJsSceneConfig) => Promise<void>;
  /** Dispose of the Three.js scene */
  disposeScene: () => void;
  /** Load a 3D model */
  loadModel: (id: string, config: ModelConfig) => Promise<ModelLoadResult>;
  /** Unload a 3D model */
  unloadModel: (id: string) => void;
  /** Play an animation */
  playAnimation: (modelId: string, config: AnimationConfig) => void;
  /** Stop an animation */
  stopAnimation: (modelId: string) => void;
  /** Animate the camera */
  animateCamera: (config: CameraAnimationConfig) => void;
  /** Update the camera position */
  updateCameraPosition: (position: [number, number, number]) => void;
  /** Update post-processing effects */
  updateEffects: (config: Partial<EffectComposerConfig>) => void;
  /** Render a single frame */
  renderFrame: () => void;
  /** Start continuous rendering */
  startRendering: () => void;
  /** Stop continuous rendering */
  stopRendering: () => void;
}

// ============================================================================
// Three.js Viewer Props
// ============================================================================

export interface ThreeJsViewerProps {
  /** Scene configuration */
  sceneConfig?: Partial<ThreeJsSceneConfig>;
  /** Initial camera configuration */
  cameraConfig?: Partial<CameraConfig>;
  /** Models to load */
  models?: ModelConfig[];
  /** Initial camera animation */
  cameraAnimation?: CameraAnimationConfig;
  /** Post-processing effects */
  effects?: Partial<EffectComposerConfig>;
  /** Callback when scene is ready */
  onReady?: () => void;
  /** Callback when error occurs */
  onError?: (error: string) => void;
  /** Callback on frame rendered */
  onFrameRendered?: (frameNumber: number) => void;
  /** Current frame number (for frame-by-frame rendering) */
  currentFrame?: number;
  /** Callback when camera is captured */
  onCameraCapture?: (config: {
    position: [number, number, number];
    target: [number, number, number];
    fov: number;
    referenceImage?: string;
  }) => void;
  /** Whether to render continuously */
  continuous?: boolean;
  /** CSS class name */
  className?: string;
}

// ============================================================================
// Three.js Event Types
// ============================================================================

export interface ThreeJsEventMap {
  'scene:ready': [];
  'scene:error': [error: string];
  'model:loaded': [modelId: string, result: ModelLoadResult];
  'model:error': [modelId: string, error: string];
  'animation:started': [modelId: string, animationName: string];
  'animation:ended': [modelId: string, animationName: string];
  'camera:animating': [progress: number];
  'frame:rendered': [frameNumber: number];
}

// ============================================================================
// Utility Types
// ============================================================================

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface Transform3D {
  position: Vector3D;
  rotation: Vector3D;
  scale: Vector3D;
}

export { THREE };
