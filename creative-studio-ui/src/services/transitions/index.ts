/**
 * Transitions Library - Barrel Export
 * GPU-accelerated shader-based transitions for StoryCore
 */

// Types
export * from './TransitionTypes';

// Engine
export { WebGLRenderer, TransitionEngine } from './TransitionEngine';

// Shaders
export {
  DEFAULT_VERTEX_SHADER,
  DEFAULT_FRAGMENT_SHADER,
  FADE_BLACK_FRAGMENT_SHADER,
  SLIDE_FRAGMENT_SHADER,
  ZOOM_FRAGMENT_SHADER,
  WIPE_FRAGMENT_SHADER,
  GLITCH_FRAGMENT_SHADER,
  RADIAL_WIPE_FRAGMENT_SHADER,
} from './TransitionEngine';
