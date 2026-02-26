/**
 * Anime Effect Types for Animated Sprite System
 */

import { SpriteOrientation, Point2D } from './sprite';

// ===================================

/**
 * Base interface for all anime effects
 */
export interface BaseAnimeEffect {
  /** Unique effect identifier */
  id: string;
  
  /** Effect type identifier */
  type: string;
  
  /** Whether the effect is enabled */
  enabled: boolean;
  
  /** Effect intensity (0-1) */
  intensity: number;
  
  /** Effect duration in milliseconds (0 = instant/permanent) */
  duration: number;
  
  /** Delay before effect starts */
  delay: number;
  
  /** Animation speed multiplier */
  speed: number;
  
  /** Blend mode for compositing */
  blendMode: AnimeBlendMode;
  
  /** Z-order for layering */
  zIndex: number;
}

/**
 * Blend modes for anime effects
 */
export type AnimeBlendMode = 
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'additive'
  | 'subtract'
  | 'difference'
  | 'exclusion';

/**
 * Trigger mode for effects
 */
export type EffectTriggerMode = 
  | 'immediate'      // Play immediately when added
  | 'on_action'      // Trigger on specific action
  | 'on_collision'   // Trigger on collision
  | 'on_keyframe'    // Trigger at specific keyframe
  | 'manual';        // Manual trigger only

// ============================================================================
// Speed Lines Effect
// ============================================================================

/**
 * Speed lines direction type
 */
export type SpeedLinesDirection = 
  | 'linear'    // Straight lines in one direction
  | 'radial'    // Lines emanating from a point
  | 'spiral'    // Spiral/vortex lines
  | 'curved'    // Curved motion lines
  | 'custom';   // Custom path-based lines

/**
 * Speed lines style presets
 */
export type SpeedLinesStyle = 
  | 'action'    // Bold, thick lines for action scenes
  | 'subtle'    // Thin, subtle lines
  | 'dramatic'  // High contrast, dynamic
  | 'sparkle'   // Shojo-style sparkle lines
  | 'focus'     // Concentration/focus lines
  | 'chaos';    // Chaotic, jagged lines

/**
 * Speed Lines Effect Configuration
 */
export interface SpeedLinesEffect extends BaseAnimeEffect {
  type: 'speed_lines';
  
  // Line Configuration
  /** Number of lines to render */
  lineCount: number;
  
  /** Length of each line in pixels */
  lineLength: number;
  
  /** Minimum line length (for variation) */
  lineLengthMin?: number;
  
  /** Thickness of lines in pixels */
  lineThickness: number;
  
  /** Variation in thickness (0-1) */
  thicknessVariation: number;
  
  /** Line color */
  lineColor: string;
  
  /** Line opacity (0-1) */
  lineOpacity: number;
  
  /** Whether to use gradient along line */
  useGradient: boolean;
  
  /** Gradient end color */
  gradientEndColor?: string;
  
  // Direction Configuration
  /** Direction type */
  direction: SpeedLinesDirection;
  
  /** Angle for linear direction (degrees, 0 = right) */
  angle: number;
  
  /** Focal point for radial lines (normalized 0-1) */
  focalPoint: Point2D;
  
  /** Spiral tightness (for spiral type) */
  spiralTightness: number;
  
  /** Custom path data (for custom type) */
  customPaths?: CustomLinePath[];
  
  // Style Configuration
  /** Visual style preset */
  style: SpeedLinesStyle;
  
  /** Line dash pattern (dash, gap) */
  dashPattern?: [number, number];
  
  /** Line cap style */
  lineCap: 'butt' | 'round' | 'square';
  
  /** Taper lines (thinner at ends) */
  taperLines: boolean;
  
  /** Add glow effect */
  glowEffect: boolean;
  
  /** Glow color */
  glowColor?: string;
  
  /** Glow blur radius */
  glowBlur?: number;
  
  // Animation
  /** Animate the lines */
  animated: boolean;
  
  /** Animation speed (lines per second) */
  animationSpeed: number;
  
  /** Pulse animation */
  pulseAnimation: boolean;
  
  /** Pulse speed */
  pulseSpeed: number;
  
  // Positioning
  /** Follow sprite position */
  followSprite: boolean;
  
  /** Offset from sprite center */
  offset: Point2D;
  
  /** Rotation with sprite */
  rotateWithSprite: boolean;
}

/**
 * Custom line path definition
 */
export interface CustomLinePath {
  /** Path start point */
  start: Point2D;
  
  /** Control points for bezier curve */
  controlPoints: Point2D[];
  
  /** Path end point */
  end: Point2D;
}

// ============================================================================
// Impact Frame Effect
// ============================================================================

/**
 * Impact frame type
 */
export type ImpactType = 
  | 'punch'     // Fist/hand impact
  | 'kick'      // Kick impact
  | 'slash'     // Sword/blade slash
  | 'explosion' // Explosion burst
  | 'magic'     // Magical effect
  | 'energy'    // Energy blast
  | 'emotion'   // Emotional impact (shock, surprise)
  | 'collision' // General collision
  | 'custom';   // Custom shape

/**
 * Element type for magic impacts
 */
export type MagicElement = 
  | 'fire'
  | 'ice'
  | 'lightning'
  | 'wind'
  | 'earth'
  | 'water'
  | 'light'
  | 'dark'
  | 'neutral';

/**
 * Impact Frame Effect Configuration
 */
export interface ImpactFrameEffect extends BaseAnimeEffect {
  type: 'impact_frame';
  
  // Impact Configuration
  /** Type of impact */
  impactType: ImpactType;
  
  /** Impact size multiplier */
  impactSize: number;
  
  /** Impact shape */
  impactShape: 'circle' | 'star' | 'burst' | 'diamond' | 'custom';
  
  /** Custom shape SVG path */
  customShapePath?: string;
  
  // Visual Effects
  /** Flash color */
  flashColor: string;
  
  /** Flash duration in ms */
  flashDuration: number;
  
  /** Flash intensity (0-1) */
  flashIntensity: number;
  
  /** Inner glow color */
  innerGlowColor?: string;
  
  /** Outer glow color */
  outerGlowColor?: string;
  
  /** Glow radius */
  glowRadius: number;
  
  // Screen Shake
  screenShake: ScreenShakeConfig;
  
  // Particles
  particles: ImpactParticleConfig;
  
  // Impact Lines
  /** Radiating impact lines */
  radiatingLines: boolean;
  
  /** Number of radiating lines */
  radiatingLineCount: number;
  
  /** Radiating line color */
  radiatingLineColor: string;
  
  // Magic-specific
  /** Element type (for magic impacts) */
  magicElement?: MagicElement;
  
  /** Elemental color override */
  elementalColor?: string;
  
  // Emotion-specific
  /** Emotion type (for emotion impacts) */
  emotionType?: 'shock' | 'anger' | 'joy' | 'sadness' | 'fear' | 'surprise';
  
  /** Emotion symbol */
  emotionSymbol?: string;
  
  // Sound
  /** Sound effect to play */
  soundEffect?: string;
  
  /** Sound delay */
  soundDelay?: number;
  
  // Positioning
  /** Impact position (normalized to sprite) */
  position: Point2D;
  
  /** World space position */
  worldPosition?: Point2D;
}

/**
 * Screen shake configuration
 */
export interface ScreenShakeConfig {
  /** Enable screen shake */
  enabled: boolean;
  
  /** Shake intensity (0-1) */
  intensity: number;
  
  /** Shake duration in ms */
  duration: number;
  
  /** Shake frequency */
  frequency: number;
  
  /** Shake decay (0-1, 1 = no decay) */
  decay: number;
  
  /** Shake axis */
  axis: 'both' | 'horizontal' | 'vertical' | 'rotational';
}

/**
 * Impact particle configuration
 */
export interface ImpactParticleConfig {
  /** Enable particles */
  enabled: boolean;
  
  /** Particle type */
  type: 'sparks' | 'debris' | 'magic' | 'stars' | 'custom';
  
  /** Number of particles */
  count: number;
  
  /** Particle color */
  color: string;
  
  /** Secondary color (for variation) */
  secondaryColor?: string;
  
  /** Particle size range */
  sizeRange: [number, number];
  
  /** Particle speed range */
  speedRange: [number, number];
  
  /** Particle lifetime range (ms) */
  lifetimeRange: [number, number];
  
  /** Particle spread angle (degrees) */
  spreadAngle: number;
  
  /** Gravity effect */
  gravity: number;
  
  /** Custom particle sprite */
  customSprite?: string;
}

// ============================================================================
// Motion Trail Effect
// ============================================================================

/**
 * Motion trail fade mode
 */
export type TrailFadeMode = 
  | 'linear'       // Linear fade
  | 'ease'         // Smooth ease out
  | 'exponential'  // Fast initial fade
  | 'step';        // Stepped fade

/**
 * Motion Trail Effect Configuration
 */
export interface MotionTrailEffect extends BaseAnimeEffect {
  type: 'motion_trail';
  
  // Trail Configuration
  /** Number of trail segments/frames */
  trailLength: number;
  
  /** Trail opacity (0-1) */
  trailOpacity: number;
  
  /** Trail color */
  trailColor: string;
  
  /** Use sprite colors for trail */
  useSpriteColors: boolean;
  
  /** Trail blur amount */
  trailBlur: number;
  
  /** Trail blur quality */
  blurQuality: 'low' | 'medium' | 'high';
  
  // Fade Configuration
  /** How the trail fades */
  fadeMode: TrailFadeMode;
  
  /** Persistence factor (0-1) */
  persistence: number;
  
  /** Minimum opacity before removal */
  minOpacity: number;
  
  // Position Sampling
  /** Sample interval in ms */
  sampleInterval: number;
  
  /** Interpolate between samples */
  interpolate: boolean;
  
  /** Interpolation smoothness */
  interpolationSmoothness: number;
  
  // Directional
  /** Direction-based trail (follows movement) */
  directionBased: boolean;
  
  /** Trail direction offset */
  directionOffset: number;
  
  // Visual Style
  /** Trail style */
  style: 'solid' | 'outline' | 'ghost' | 'motion_blur';
  
  /** Outline thickness (for outline style) */
  outlineThickness: number;
  
  /** Outline color (for outline style) */
  outlineColor?: string;
  
  /** Distortion amount */
  distortion: number;
  
  /** Color shift (hue rotation in degrees) */
  colorShift: number;
  
  // Animation
  /** Animate trail */
  animated: boolean;
  
  /** Ripple effect */
  rippleEffect: boolean;
  
  /** Ripple speed */
  rippleSpeed: number;
}

// ============================================================================
// Manga Panel Effect
// ============================================================================

/**
 * Manga panel shape type
 */
export type MangaPanelShape = 
  | 'rectangle'
  | 'rounded'
  | 'jagged'
  | 'burst'
  | 'focus'
  | 'speed'
  | 'dramatic'
  | 'emotional'
  | 'custom';

/**
 * Screen tone pattern type
 */
export type ScreenTonePattern = 
  | 'dots'        // Halftone dots
  | 'lines'       // Parallel lines
  | 'crosshatch'  // Crosshatch pattern
  | 'screentone'  // Classic manga screentone
  | 'gradient'    // Gradient pattern
  | 'noise'       // Noise/grain
  | 'sparkle'     // Sparkle pattern
  | 'custom';     // Custom pattern

/**
 * Manga Panel Effect Configuration
 */
export interface MangaPanelEffect extends BaseAnimeEffect {
  type: 'manga_panel';
  
  // Panel Shape
  /** Panel shape type */
  panelShape: MangaPanelShape;
  
  /** Custom shape SVG path */
  customShapePath?: string;
  
  /** Panel size */
  size: { width: number; height: number };
  
  /** Corner radius (for rounded) */
  cornerRadius?: number;
  
  /** Jaggedness (for jagged/burst) */
  jaggedness?: number;
  
  // Border Configuration
  /** Border width */
  borderWidth: number;
  
  /** Border color */
  borderColor: string;
  
  /** Border style */
  borderStyle: 'solid' | 'dashed' | 'double' | 'jagged';
  
  /** Border opacity */
  borderOpacity: number;
  
  // Background
  /** Background fill type */
  backgroundFill: 'solid' | 'gradient' | 'pattern' | 'transparent';
  
  /** Background color */
  backgroundColor: string;
  
  /** Background opacity */
  backgroundOpacity: number;
  
  /** Gradient configuration */
  gradient?: {
    type: 'linear' | 'radial';
    colors: string[];
    positions: number[];
    angle?: number;
  };
  
  // Screen Tone
  /** Screen tone pattern */
  screenTone: ScreenTonePattern;
  
  /** Screen tone intensity (0-1) */
  screenToneIntensity: number;
  
  /** Screen tone scale */
  screenToneScale: number;
  
  /** Screen tone color */
  screenToneColor: string;
  
  /** Custom pattern image */
  customPatternUrl?: string;
  
  // Focus Effect
  /** Enable focus/spotlight effect */
  focusEffect: boolean;
  
  /** Focus point (normalized) */
  focusPoint: Point2D;
  
  /** Focus size (normalized) */
  focusSize: { width: number; height: number };
  
  /** Focus feather amount */
  focusFeather: number;
  
  /** Vignette intensity */
  vignetteIntensity: number;
  
  // Speed Lines Background
  /** Background speed lines */
  backgroundSpeedLines: boolean;
  
  /** Background speed lines config */
  backgroundSpeedLinesConfig?: Partial<SpeedLinesEffect>;
  
  // Text (Sound Effects)
  /** Sound effect text */
  sfxText?: string;
  
  /** SFX style configuration */
  sfxStyle?: SFXTextStyle;
  
  // Animation
  /** Panel entrance animation */
  entranceAnimation: 'none' | 'zoom' | 'slide' | 'fade' | 'burst';
  
  /** Entrance duration */
  entranceDuration: number;
  
  /** Panel exit animation */
  exitAnimation: 'none' | 'zoom' | 'slide' | 'fade' | 'shatter';
  
  /** Exit duration */
  exitDuration: number;
  
  // Positioning
  /** Panel position (normalized to frame) */
  position: Point2D;
  
  /** Rotation angle */
  rotation: number;
  
  /** Scale */
  scale: number;
}

/**
 * Sound effect text style configuration
 */
export interface SFXTextStyle {
  /** Font family */
  fontFamily: string;
  
  /** Font size */
  fontSize: number;
  
  /** Font weight */
  fontWeight: 'normal' | 'bold' | 'black';
  
  /** Font style */
  fontStyle: 'normal' | 'italic' | 'oblique';
  
  /** Text color */
  color: string;
  
  /** Outline/stroke color */
  outlineColor: string;
  
  /** Outline width */
  outlineWidth: number;
  
  /** Shadow color */
  shadowColor?: string;
  
  /** Shadow blur */
  shadowBlur?: number;
  
  /** Shadow offset */
  shadowOffset?: Point2D;
  
  /** Text rotation */
  rotation: number;
  
  /** Letter spacing */
  letterSpacing: number;
  
  /** Text warp/curve amount */
  warpAmount: number;
  
  /** Shake/vibrate text */
  shake: boolean;
  
  /** Shake intensity */
  shakeIntensity: number;
}

// ============================================================================
// Emotion Effect
// ============================================================================

/**
 * Emotion symbol type
 */
export type EmotionSymbolType = 
  | 'sweat_drop'    // Anime sweat drop
  | 'anger_vein'    // Anger cross/vein
  | 'sparkle'       // Star/sparkle eyes
  | 'tear'          // Tears
  | 'heart'         // Hearts
  | 'exclamation'   // Exclamation mark
  | 'question'      // Question mark
  | 'lightbulb'     // Idea lightbulb
  | 'steam'         // Steam from ears/head
  | 'lines'         // Vertical lines (disappointment)
  | 'chibi'         // Chibi transformation
  | 'nose_bleed'    // Anime nose bleed
  | 'custom';       // Custom symbol

/**
 * Emotion Effect Configuration
 */
export interface EmotionEffect extends BaseAnimeEffect {
  type: 'emotion';
  
  /** Emotion symbol type */
  symbolType: EmotionSymbolType;
  
  /** Custom symbol image */
  customSymbolUrl?: string;
  
  /** Symbol size */
  symbolSize: number;
  
  /** Symbol color */
  symbolColor: string;
  
  /** Number of symbols */
  symbolCount: number;
  
  /** Symbol position relative to sprite */
  position: Point2D;
  
  /** Position offset variation */
  positionVariation: number;
  
  /** Animation type */
  animationType: 'pop' | 'float' | 'bounce' | 'shake' | 'pulse' | 'spiral';
  
  /** Animation duration */
  animationDuration: number;
  
  /** Loop animation */
  loopAnimation: boolean;
  
  /** Fade out after duration */
  fadeOut: boolean;
  
  /** Fade duration */
  fadeDuration: number;
  
  /** Follow sprite */
  followSprite: boolean;
  
  /** Appear with sprite movement */
  triggerOnMovement: boolean;
  
  /** Movement threshold for trigger */
  movementThreshold: number;
}

// ============================================================================
// Aura/Glow Effect
// ============================================================================

/**
 * Aura type
 */
export type AuraType = 
  | 'flame'      // Fire/flame aura
  | 'electric'   // Electric/lightning aura
  | 'wind'       // Wind/air aura
  | 'water'      // Water/flowing aura
  | 'dark'       // Dark/shadow aura
  | 'light'      // Light/holy aura
  | 'energy'     // Generic energy aura
  | 'custom';    // Custom aura pattern

/**
 * Aura Effect Configuration
 */
export interface AuraEffect extends BaseAnimeEffect {
  type: 'aura';
  
  /** Aura type */
  auraType: AuraType;
  
  /** Aura color (primary) */
  color: string;
  
  /** Secondary color */
  secondaryColor?: string;
  
  /** Aura size multiplier */
  size: number;
  
  /** Inner radius (percentage of sprite) */
  innerRadius: number;
  
  /** Outer radius (percentage of sprite) */
  outerRadius: number;
  
  /** Aura opacity */
  opacity: number;
  
  /** Number of aura layers */
  layers: number;
  
  /** Layer offset (animation phase) */
  layerOffset: number;
  
  /** Particle emission */
  particleEmission: boolean;
  
  /** Particle count per second */
  particleRate: number;
  
  /** Particle size range */
  particleSizeRange: [number, number];
  
  /** Particle lifetime */
  particleLifetime: number;
  
  /** Animation speed */
  animationSpeed: number;
  
  /** Aura direction (for directional auras) */
  direction?: SpriteOrientation;
  
  /** Wobble/organic movement */
  wobble: boolean;
  
  /** Wobble intensity */
  wobbleIntensity: number;
  
  /** Pulsing effect */
  pulse: boolean;
  
  /** Pulse speed */
  pulseSpeed: number;
  
  /** Pulse intensity */
  pulseIntensity: number;
}

// ============================================================================
// Combined Effect Types
// ============================================================================

/**
 * Union type of all anime effects
 */
export type AnimeEffect = 
  | SpeedLinesEffect
  | ImpactFrameEffect
  | MotionTrailEffect
  | MangaPanelEffect
  | EmotionEffect
  | AuraEffect;

/**
 * Effect stack for a sprite
 */
export interface AnimeEffectStack {
  /** Sprite ID this stack belongs to */
  spriteId: string;
  
  /** List of effects in the stack */
  effects: AnimeEffect[];
  
  /** Global intensity multiplier for all effects */
  globalIntensity: number;
  
  /** Whether the effect stack is enabled */
  enabled: boolean;
  
  /** Effect blending between effects in stack */
  effectBlendMode: AnimeBlendMode;
}

/**
 * Effect instance in the scene
 */
export interface AnimeEffectInstance {
  /** Instance ID */
  id: string;
  
  /** Effect configuration */
  effect: AnimeEffect;
  
  /** Current time in effect (ms) */
  currentTime: number;
  
  /** Whether effect is playing */
  isPlaying: boolean;
  
  /** Number of loops completed */
  loopsCompleted: number;
  
  /** World position */
  worldPosition?: Point2D;
  
  /** Attached sprite ID */
  attachedSpriteId?: string;
  
  /** Attachment offset */
  attachmentOffset?: Point2D;
}

// ============================================================================
// Effect Presets
// ============================================================================

/**
 * Anime effect preset
 */
export interface AnimeEffectPreset {
  /** Preset ID */
  id: string;
  
  /** Preset name */
  name: string;
  
  /** Preset description */
  description: string;
  
  /** Category for organization */
  category: 'action' | 'emotion' | 'ambient' | 'focus' | 'transition';
  
  /** Style tags */
  tags: string[];
  
  /** Effect configuration */
  effects: AnimeEffect[];
  
  /** Preview thumbnail */
  thumbnail?: string;
}

/**
 * Default effect presets
 */
export const ANIME_EFFECT_PRESETS: AnimeEffectPreset[] = [
  {
    id: 'shonen_punch',
    name: 'Shonen Punch',
    description: 'Classic shonen anime punch impact with speed lines',
    category: 'action',
    tags: ['action', 'shonen', 'impact', 'punch'],
    effects: [
      {
        id: 'speed_lines_1',
        type: 'speed_lines',
        enabled: true,
        intensity: 1,
        duration: 200,
        delay: 0,
        speed: 1,
        blendMode: 'normal',
        zIndex: 1,
        lineCount: 30,
        lineLength: 200,
        lineThickness: 3,
        thicknessVariation: 0.3,
        lineColor: '#ffffff',
        lineOpacity: 0.9,
        useGradient: false,
        direction: 'radial',
        angle: 0,
        focalPoint: { x: 0.5, y: 0.5 },
        spiralTightness: 1,
        style: 'action',
        lineCap: 'round',
        taperLines: true,
        glowEffect: true,
        glowColor: '#ffff00',
        glowBlur: 5,
        animated: true,
        animationSpeed: 2,
        pulseAnimation: false,
        pulseSpeed: 1,
        followSprite: true,
        offset: { x: 0, y: 0 },
        rotateWithSprite: false
      },
      {
        id: 'impact_1',
        type: 'impact_frame',
        enabled: true,
        intensity: 1,
        duration: 150,
        delay: 0,
        speed: 1,
        blendMode: 'additive',
        zIndex: 2,
        impactType: 'punch',
        impactSize: 1.5,
        impactShape: 'burst',
        flashColor: '#ffffff',
        flashDuration: 50,
        flashIntensity: 1,
        glowRadius: 30,
        screenShake: {
          enabled: true,
          intensity: 0.5,
          duration: 100,
          frequency: 30,
          decay: 0.8,
          axis: 'both'
        },
        particles: {
          enabled: true,
          type: 'sparks',
          count: 20,
          color: '#ffff00',
          sizeRange: [2, 6],
          speedRange: [100, 300],
          lifetimeRange: [100, 300],
          spreadAngle: 360,
          gravity: 200
        },
        radiatingLines: true,
        radiatingLineCount: 12,
        radiatingLineColor: '#ffffff',
        position: { x: 0.5, y: 0.5 }
      }
    ]
  },
  {
    id: 'shojo_sparkle',
    name: 'Shojo Sparkle',
    description: 'Romantic shojo-style sparkle effect',
    category: 'emotion',
    tags: ['shojo', 'romance', 'sparkle', 'emotion'],
    effects: [
      {
        id: 'emotion_1',
        type: 'emotion',
        enabled: true,
        intensity: 0.8,
        duration: 0,
        delay: 0,
        speed: 1,
        blendMode: 'normal',
        zIndex: 1,
        symbolType: 'sparkle',
        symbolSize: 24,
        symbolColor: '#ffd700',
        symbolCount: 5,
        position: { x: 0.5, y: 0.3 },
        positionVariation: 30,
        animationType: 'float',
        animationDuration: 2000,
        loopAnimation: true,
        fadeOut: false,
        fadeDuration: 500,
        followSprite: true,
        triggerOnMovement: false,
        movementThreshold: 0
      },
      {
        id: 'aura_1',
        type: 'aura',
        enabled: true,
        intensity: 0.5,
        duration: 0,
        delay: 0,
        speed: 1,
        blendMode: 'screen',
        zIndex: 0,
        auraType: 'light',
        color: '#ffb7dd',
        size: 1.5,
        innerRadius: 0.8,
        outerRadius: 1.5,
        opacity: 0.4,
        layers: 2,
        layerOffset: 0.5,
        particleEmission: true,
        particleRate: 10,
        particleSizeRange: [2, 5],
        particleLifetime: 1500,
        animationSpeed: 0.5,
        wobble: true,
        wobbleIntensity: 0.2,
        pulse: true,
        pulseSpeed: 1,
        pulseIntensity: 0.1
      }
    ]
  },
  {
    id: 'action_dash',
    name: 'Action Dash',
    description: 'Quick dash movement with motion trail',
    category: 'action',
    tags: ['action', 'movement', 'speed', 'dash'],
    effects: [
      {
        id: 'trail_1',
        type: 'motion_trail',
        enabled: true,
        intensity: 1,
        duration: 300,
        delay: 0,
        speed: 1,
        blendMode: 'normal',
        zIndex: -1,
        trailLength: 8,
        trailOpacity: 0.7,
        trailColor: '#ffffff',
        useSpriteColors: true,
        trailBlur: 3,
        blurQuality: 'medium',
        fadeMode: 'exponential',
        persistence: 0.6,
        minOpacity: 0.1,
        sampleInterval: 16,
        interpolate: true,
        interpolationSmoothness: 0.5,
        directionBased: true,
        directionOffset: 0,
        style: 'ghost',
        outlineThickness: 2,
        distortion: 0.1,
        colorShift: 0,
        animated: true,
        rippleEffect: false,
        rippleSpeed: 1
      },
      {
        id: 'speed_1',
        type: 'speed_lines',
        enabled: true,
        intensity: 0.8,
        duration: 200,
        delay: 0,
        speed: 1,
        blendMode: 'normal',
        zIndex: 1,
        lineCount: 15,
        lineLength: 150,
        lineThickness: 2,
        thicknessVariation: 0.5,
        lineColor: '#ffffff',
        lineOpacity: 0.6,
        useGradient: true,
        gradientEndColor: 'transparent',
        direction: 'linear',
        angle: 180,
        focalPoint: { x: 0.5, y: 0.5 },
        spiralTightness: 1,
        style: 'subtle',
        lineCap: 'round',
        taperLines: true,
        glowEffect: false,
        animated: true,
        animationSpeed: 3,
        pulseAnimation: false,
        pulseSpeed: 1,
        followSprite: true,
        offset: { x: 0, y: 0 },
        rotateWithSprite: true
      }
    ]
  }
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a default speed lines effect
 */
export function createDefaultSpeedLinesEffect(): SpeedLinesEffect {
  return {
    id: `speedlines_${Date.now()}`,
    type: 'speed_lines',
    enabled: true,
    intensity: 1,
    duration: 0,
    delay: 0,
    speed: 1,
    blendMode: 'normal',
    zIndex: 1,
    lineCount: 20,
    lineLength: 100,
    lineThickness: 2,
    thicknessVariation: 0.3,
    lineColor: '#ffffff',
    lineOpacity: 0.8,
    useGradient: false,
    direction: 'linear',
    angle: 0,
    focalPoint: { x: 0.5, y: 0.5 },
    spiralTightness: 1,
    style: 'action',
    lineCap: 'round',
    taperLines: true,
    glowEffect: false,
    animated: true,
    animationSpeed: 1,
    pulseAnimation: false,
    pulseSpeed: 1,
    followSprite: true,
    offset: { x: 0, y: 0 },
    rotateWithSprite: false
  };
}

/**
 * Create a default impact frame effect
 */
export function createDefaultImpactFrameEffect(): ImpactFrameEffect {
  return {
    id: `impact_${Date.now()}`,
    type: 'impact_frame',
    enabled: true,
    intensity: 1,
    duration: 200,
    delay: 0,
    speed: 1,
    blendMode: 'additive',
    zIndex: 2,
    impactType: 'punch',
    impactSize: 1,
    impactShape: 'burst',
    flashColor: '#ffffff',
    flashDuration: 50,
    flashIntensity: 0.8,
    glowRadius: 20,
    screenShake: {
      enabled: true,
      intensity: 0.3,
      duration: 100,
      frequency: 20,
      decay: 0.8,
      axis: 'both'
    },
    particles: {
      enabled: true,
      type: 'sparks',
      count: 10,
      color: '#ffff00',
      sizeRange: [2, 5],
      speedRange: [50, 150],
      lifetimeRange: [100, 300],
      spreadAngle: 360,
      gravity: 100
    },
    radiatingLines: true,
    radiatingLineCount: 8,
    radiatingLineColor: '#ffffff',
    position: { x: 0.5, y: 0.5 }
  };
}

/**
 * Create a default motion trail effect
 */
export function createDefaultMotionTrailEffect(): MotionTrailEffect {
  return {
    id: `trail_${Date.now()}`,
    type: 'motion_trail',
    enabled: true,
    intensity: 1,
    duration: 0,
    delay: 0,
    speed: 1,
    blendMode: 'normal',
    zIndex: -1,
    trailLength: 5,
    trailOpacity: 0.5,
    trailColor: '#ffffff',
    useSpriteColors: false,
    trailBlur: 2,
    blurQuality: 'medium',
    fadeMode: 'linear',
    persistence: 0.5,
    minOpacity: 0.1,
    sampleInterval: 16,
    interpolate: true,
    interpolationSmoothness: 0.5,
    directionBased: false,
    directionOffset: 0,
    style: 'ghost',
    outlineThickness: 2,
    distortion: 0,
    colorShift: 0,
    animated: true,
    rippleEffect: false,
    rippleSpeed: 1
  };
}

/**
 * Create a default emotion effect
 */
export function createDefaultEmotionEffect(): EmotionEffect {
  return {
    id: `emotion_${Date.now()}`,
    type: 'emotion',
    enabled: true,
    intensity: 1,
    duration: 0,
    delay: 0,
    speed: 1,
    blendMode: 'normal',
    zIndex: 3,
    symbolType: 'exclamation',
    symbolSize: 20,
    symbolColor: '#ff0000',
    symbolCount: 1,
    position: { x: 0.5, y: 0 },
    positionVariation: 10,
    animationType: 'bounce',
    animationDuration: 500,
    loopAnimation: true,
    fadeOut: false,
    fadeDuration: 200,
    followSprite: true,
    triggerOnMovement: false,
    movementThreshold: 0
  };
}

