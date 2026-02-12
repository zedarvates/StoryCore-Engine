/**
 * Audio Visualization Types for StoryCore
 * Defines types for all audio visualization components and services
 */

export interface AudioVisualizerConfig {
  /** FFT size for frequency analysis (power of 2) */
  fftSize: number;
  /** Smoothing time constant (0-1) */
  smoothingTimeConstant: number;
  /** Minimum decibels for spectrum */
  minDecibels: number;
  /** Maximum decibels for spectrum */
  maxDecibels: number;
  /** Sample rate of the audio */
  sampleRate: number;
  /** Buffer length for waveform */
  bufferLength: number;
}

export interface WaveformData {
  /** Time domain data from analyzer */
  timeDomainData: Float32Array;
  /** Peak values detected */
  peaks: number[];
  /** RMS (Root Mean Square) energy */
  rms: number;
  /** Zero crossings for beat detection */
  zeroCrossings: number;
  /** Duration in seconds */
  duration: number;
  /** Current playback time */
  currentTime: number;
}

export interface FrequencyData {
  /** Frequency domain data (FFT bins) */
  frequencyData: Uint8Array;
  /** Array of frequency values in Hz */
  frequencies: number[];
  /** Bass range (20-250Hz) energy */
  bassEnergy: number;
  /** Mid range (250-4000Hz) energy */
  midEnergy: number;
  /** High range (4000-20000Hz) energy */
  highEnergy: number;
  /** Peak frequency detected */
  peakFrequency: number;
  /** Spectral centroid */
  spectralCentroid: number;
  /** Spectral rolloff */
  spectralRolloff: number;
}

export interface CircularVisualizerData {
  /** Radial frequency data */
  radialData: Uint8Array;
  /** Rotation angle in degrees */
  rotation: number;
  /** Radius of the visualizer */
  radius: number;
  /** Number of radial bars */
  barCount: number;
  /** Glow intensity */
  glowIntensity: number;
}

export interface TerrainVisualizerData {
  /** 2D grid of frequency values */
  gridData: Float32Array[][];
  /** Grid dimensions */
  rows: number;
  cols: number;
  /** Terrain height scale */
  heightScale: number;
  /** Color mapping */
  colorMap: string;
  /** Animation speed */
  speed: number;
}

export interface BarVisualizerData {
  /** Frequency bars data */
  barData: Uint8Array;
  /** Number of bars */
  barCount: number;
  /** Bar width in pixels */
  barWidth: number;
  /** Bar spacing in pixels */
  barSpacing: number;
  /** Color gradient */
  colorGradient: string[];
  /** Reflection enabled */
  reflection: boolean;
  /** Peak hold enabled */
  peakHold: boolean;
}

export interface AudioAnalyzerState {
  /** Whether audio context is active */
  isActive: boolean;
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** Current playback time in seconds */
  currentTime: number;
  /** Total duration in seconds */
  duration: number;
  /** Current volume (0-1) */
  volume: number;
  /** Whether audio is loaded */
  isLoaded: boolean;
  /** Error message if any */
  error: string | null;
}

export type VisualizationType = 
  | 'waveform'
  | 'spectrum'
  | 'circular'
  | 'bar'
  | 'terrain';

export interface VisualizationPreset {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Visualization type */
  type: VisualizationType;
  /** Configuration options */
  config: Partial<AudioVisualizerConfig>;
  /** Color scheme */
  colors: string[];
  /** Whether GPU acceleration is enabled */
  gpuAccelerated: boolean;
}

/**
 * WebGL Render context for GPU-accelerated visualization
 */
export interface WebGLContext {
  /** WebGL context */
  gl: WebGLRenderingContext;
  /** Shader program */
  program: WebGLProgram;
  /** Vertex buffer */
  vertexBuffer: WebGLBuffer;
  /** Fragment shader source */
  fragmentShader: string;
  /** Vertex shader source */
  vertexShader: string;
}

/**
 * Performance metrics for visualization
 */
export interface VisualizationMetrics {
  /** Frames per second */
  fps: number;
  /** Frame render time in ms */
  frameTime: number;
  /** Memory usage in bytes */
  memoryUsage: number;
  /** Dropped frames count */
  droppedFrames: number;
}

/**
 * Animation options for visualizations
 */
export interface AnimationOptions {
  /** Animation duration in ms */
  duration: number;
  /** Easing function */
  easing: (t: number) => number;
  /** Loop animation */
  loop: boolean;
  /** Delay before starting */
  delay: number;
}

/**
 * Event handlers for audio visualization
 */
export interface AudioVisualizerEvents {
  /** Called when a beat is detected */
  onBeat?: (intensity: number) => void;
  /** Called when peak is detected */
  onPeak?: (frequency: number, amplitude: number) => void;
  /** Called when visualization frame updates */
  onFrameUpdate?: (data: FrequencyData | WaveformData) => void;
  /** Called when audio playback ends */
  onEnded?: () => void;
  /** Called when audio error occurs */
  onError?: (error: Error) => void;
}

/**
 * Color configuration for visualizations
 */
export interface ColorConfig {
  /** Primary color */
  primary: string;
  /** Secondary color */
  secondary: string;
  /** Background color */
  background: string;
  /** Gradient colors */
  gradient: string[];
  /** Glow color */
  glow: string;
  /** Mirror effect color */
  mirror: string;
}
