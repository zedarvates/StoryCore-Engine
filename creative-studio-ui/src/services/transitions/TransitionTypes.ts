/**
 * Transition Types for StoryCore Advanced Transitions Library
 * GPU-accelerated shader-based transitions with 15+ presets
 */

// WebGL Renderer type (defined in TransitionEngine)
export type WebGLRenderer = unknown;

// ============================================
// Core Transition Types
// ============================================

export type TransitionDirection = 'forward' | 'backward';

export type TransitionInterpolation = 
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'bezier'
  | 'elastic'
  | 'bounce';

// Fade Transitions
export type FadeType = 'black' | 'white' | 'cross' | 'transparent';

// Slide Transitions
export type SlideDirection = 'left' | 'right' | 'up' | 'down';

// Zoom Transitions
export type ZoomType = 'in' | 'out' | 'pulsar';

// Wipe Transitions
export type WipeType = 'linear' | 'radial' | 'gradient' | 'diagonal';

// Glitch Transitions
export type GlitchType = 'rgbSplit' | 'noise' | 'chromatic' | 'digital';

// GPU Acceleration
export type GPUMode = 'auto' | 'force' | 'disabled';

// Performance Tier
export type PerformanceTier = 'low' | 'medium' | 'high' | 'ultra';

// ============================================
// Transition Category
// ============================================

export type TransitionCategory =
  | 'fade'
  | 'slide'
  | 'zoom'
  | 'wipe'
  | 'glitch'
  | 'blur'
  | 'dissolve'
  | 'custom';

// ============================================
// Transition Configuration
// ============================================

export interface BaseTransitionConfig {
  /** Duration of the transition in milliseconds */
  duration: number;
  /** Easing function or interpolation type */
  easing: TransitionInterpolation | string;
  /** Custom easing bezier points [x1, y1, x2, y2] */
  easingBezier?: [number, number, number, number];
  /** GPU acceleration mode */
  gpuMode: GPUMode;
  /** Performance tier for optimization */
  performanceTier: PerformanceTier;
  /** Callback when transition starts */
  onStart?: () => void;
  /** Callback when transition completes */
  onComplete?: () => void;
  /** Callback on each frame update */
  onUpdate?: (progress: number) => void;
  /** Enable/disable hardware acceleration */
  hardwareAcceleration?: boolean;
  /** Antialiasing quality (1-4) */
  antialiasing?: number;
}

export interface FadeTransitionConfig extends BaseTransitionConfig {
  type: 'fade';
  fadeType: FadeType;
  /** Overlay color opacity (0-1) */
  overlayOpacity?: number;
  /** Hold duration before fade starts */
  holdDuration?: number;
}

export interface SlideTransitionConfig extends BaseTransitionConfig {
  type: 'slide';
  direction: SlideDirection;
  /** Slide overlap amount (0-1) */
  overlap?: number;
  /** Enable/disable parallax effect */
  parallax?: boolean;
  /** Parallax intensity (0-1) */
  parallaxIntensity?: number;
}

export interface ZoomTransitionConfig extends BaseTransitionConfig {
  type: 'zoom';
  zoomType: ZoomType;
  /** Zoom origin point [x, y] */
  origin?: [number, number];
  /** Zoom intensity factor */
  intensity?: number;
  /** Enable rotation during zoom */
  rotation?: boolean;
  /** Rotation angle in degrees */
  rotationAngle?: number;
}

export interface WipeTransitionConfig extends BaseTransitionConfig {
  type: 'wipe';
  wipeType: WipeType;
  /** Wipe direction */
  direction: SlideDirection;
  /** Wipe brush softness (0-1) */
  softness?: number;
  /** Custom gradient stops for gradient wipe */
  gradientStops?: string[];
}

export interface GlitchTransitionConfig extends BaseTransitionConfig {
  type: 'glitch';
  glitchType: GlitchType;
  /** Glitch intensity (0-1) */
  intensity?: number;
  /** Number of glitch blocks */
  blockCount?: number;
  /** Glitch noise seed */
  noiseSeed?: number;
  /** RGB split offset amount */
  rgbOffset?: number;
}

export interface BlurTransitionConfig extends BaseTransitionConfig {
  type: 'blur';
  /** Blur radius in pixels */
  radius?: number;
  /** Blur direction */
  direction: 'in' | 'out';
  /** Enable grayscale during transition */
  grayscale?: boolean;
}

export interface DissolveTransitionConfig extends BaseTransitionConfig {
  type: 'dissolve';
  /** Dissolve pattern */
  pattern?: 'random' | 'grid' | 'radial' | 'diagonal';
  /** Particle size for dissolve */
  particleSize?: number;
  /** Dissolve noise scale */
  noiseScale?: number;
}

export interface CustomTransitionConfig extends BaseTransitionConfig {
  type: 'custom';
  /** Custom shader code */
  shaderCode: string;
  /** Custom shader uniforms */
  uniforms?: Record<string, number | [number, number] | [number, number, number] | [number, number, number, number]>;
  /** Custom vertex shader (optional) */
  vertexShader?: string;
}

export type TransitionConfig =
  | FadeTransitionConfig
  | SlideTransitionConfig
  | ZoomTransitionConfig
  | WipeTransitionConfig
  | GlitchTransitionConfig
  | BlurTransitionConfig
  | DissolveTransitionConfig
  | CustomTransitionConfig;

// ============================================
// Transition State
// ============================================

export interface TransitionState {
  /** Current progress (0-1) */
  progress: number;
  /** Current phase of transition */
  phase: 'idle' | 'preparing' | 'running' | 'completing' | 'complete';
  /** Elapsed time in milliseconds */
  elapsed: number;
  /** Remaining time in milliseconds */
  remaining: number;
  /** Whether transition is currently active */
  isActive: boolean;
  /** Current frame being rendered */
  currentFrame: number;
  /** FPS during transition */
  fps: number;
  /** GPU memory usage (if available) */
  gpuMemoryUsage?: number;
}

// ============================================
// Transition Preset
// ============================================

export interface TransitionPreset {
  /** Unique identifier for the preset */
  id: string;
  /** Display name */
  name: string;
  /** Category of transition */
  category: TransitionCategory;
  /** Description */
  description: string;
  /** Default configuration */
  defaultConfig: TransitionConfig;
  /** Thumbnail path (optional) */
  thumbnail?: string;
  /** Tags for searchability */
  tags: string[];
  /** Whether GPU acceleration is supported */
  gpuSupported: boolean;
  /** Performance rating (1-5) */
  performanceRating: number;
}

// ============================================
// WebGL Shader Types
// ============================================

export interface ShaderUniforms {
  u_progress: number;
  u_resolution: [number, number];
  u_textureSize: [number, number];
  u_time: number;
  u_direction?: [number, number];
  u_intensity?: number;
  u_color?: [number, number, number, number];
  u_custom?: Record<string, number | [number, number] | [number, number, number] | [number, number, number, number]>;
}

export interface ShaderProgram {
  /** Vertex shader source */
  vertexShader: string;
  /** Fragment shader source */
  fragmentShader: string;
  /** Uniforms definition */
  uniforms: ShaderUniformsDefinition[];
  /** Attributes definition */
  attributes: string[];
}

export interface ShaderUniformsDefinition {
  name: string;
  type: 'float' | 'vec2' | 'vec3' | 'vec4' | 'int' | 'bool' | 'sampler2D';
  defaultValue: number | [number, number] | [number, number, number] | [number, number, number, number];
}

// ============================================
// Canvas Types
// ============================================

export interface TransitionCanvasOptions {
  /** Canvas width in pixels */
  width: number;
  /** Canvas height in pixels */
  height: number;
  /** WebGL context attributes */
  glAttributes?: WebGLContextAttributes;
  /** Pixel ratio for high-DPI displays */
  pixelRatio?: number;
  /** Enable preserve drawing buffer */
  preserveDrawingBuffer?: boolean;
  /** Antialiasing samples */
  antialiasing?: number;
}

export interface TransitionFrameData {
  /** Source image/video canvas */
  source: HTMLCanvasElement | HTMLVideoElement | ImageBitmap;
  /** Destination canvas */
  destination: HTMLCanvasElement;
  /** Current progress */
  progress: number;
  /** Transition configuration */
  config: TransitionConfig;
  /** Timestamp for shader animations */
  timestamp: number;
}

// ============================================
// Performance Monitoring
// ============================================

export interface TransitionMetrics {
  /** Total transition time */
  totalTime: number;
  /** Average FPS */
  averageFPS: number;
  /** Minimum FPS */
  minFPS: number;
  /** Maximum FPS */
  maxFPS: number;
  /** GPU memory peak */
  gpuMemoryPeak: number;
  /** Number of frame drops */
  frameDrops: number;
  /** CPU time per frame (ms) */
  cpuTimePerFrame: number;
  /** GPU time per frame (ms) */
  gpuTimePerFrame: number;
}

// Export
// ============================================

// All types and interfaces are exported above
// See TransitionEngine.ts for WebGLRenderer and TransitionEngine classes
