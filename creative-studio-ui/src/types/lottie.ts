/**
 * Lottie Animation Types
 * ME2: Lottie Integration - Support for Lottie animations
 */

export interface LottieAnimation {
  id: string;
  name: string;
  description: string;
  url: string;
  previewUrl?: string;
  width: number;
  height: number;
  duration: number;
  frameRate: number;
  totalFrames: number;
  layers: LottieLayer[];
  assets: LottieAsset[];
  metadata: LottieMetadata;
}

export interface LottieLayer {
  id: string;
  name: string;
  type: 'precomposition' | 'solid' | 'shape' | 'null' | 'text' | 'image' | 'audio';
  startFrame: number;
  endFrame: number;
  duration: number;
  inPoint: number;
  outPoint: number;
  transform: LottieTransform;
  opacity: number;
  isEnabled: boolean;
  parentId?: string;
}

export interface LottieTransform {
  anchorPoint: [number, number];
  position: [number, number];
  scale: [number, number];
  rotation: number;
}

export interface LottieAsset {
  id: string;
  type: 'image' | 'audio' | 'precomposition';
  url: string;
  name: string;
  width?: number;
  height?: number;
  duration?: number;
}

export interface LottieMetadata {
  createdAt: string;
  updatedAt: string;
  author: string;
  version: string;
  framework: 'lottie-web' | 'lottie-android' | 'lottie-ios' | 'remotion';
  keywords: string[];
  category: LottieCategory;
}

export type LottieCategory = 
  | 'ui'
  | 'background'
  | 'icon'
  | 'character'
  | 'effect'
  | 'transition'
  | 'decoration'
  | 'loading'
  | 'custom';

export interface LottiePlaybackSettings {
  autoplay: boolean;
  loop: boolean;
  loopCount: number;
  speed: number;
  direction: 'forward' | 'reverse';
  startFrame: number;
  endFrame: number;
  goToFrame: number;
}

export interface LottieConfig {
  animationId: string;
  playback: LottiePlaybackSettings;
  renderer: 'svg' | 'canvas' | 'html';
  renderingSettings: {
    preserveAspectRatio: 'xMidYMid meet' | 'xMidYMid slice' | 'xMinYMin meet' | 'xMinYMin slice' | 'xMaxYMax meet' | 'xMaxYMax slice';
    progressiveLoad: boolean;
    hardwareAcceleration: boolean;
  };
}

export interface LottieState {
  currentFrame: number;
  isPlaying: boolean;
  isLoaded: boolean;
  error: string | null;
  progress: number;
}
