/**
 * Sprite Components Index
 * 
 * Exports all sprite-related components for the animated sprite system.
 */

// Orientation Components
export {
  OrientationSelector,
  OrientationSelectorCompact,
  OrientationWheel
} from './OrientationSelector';

export type { OrientationSelectorProps } from './OrientationSelector';

// Effect Components
export {
  AnimeEffectPanel,
  default as AnimeEffectPanelDefault
} from './AnimeEffectPanel';

export type { AnimeEffectPanelProps } from './AnimeEffectPanel';

// Re-export types for convenience
export type {
  SpriteOrientation,
  AnimatedSprite,
  SpriteFrame,
  SpriteState,
  SpriteTransform
} from '../../types/sprite';

export type {
  AnimeEffect,
  SpeedLinesEffect,
  ImpactFrameEffect,
  MotionTrailEffect,
  EmotionEffect
} from '../../types/animeEffect';