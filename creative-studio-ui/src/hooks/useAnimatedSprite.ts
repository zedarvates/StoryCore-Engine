/**
 * useAnimatedSprite Hook
 * 
 * Custom hook for managing animated sprites with orientation and effects.
 * Provides a simple API for sprite manipulation in components.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AnimatedSprite,
  SpriteOrientation,
  SpriteTransform,
  movementToOrientation,
  SPRITE_ORIENTATIONS
} from '@/types/sprite';

import {
  AnimeEffect,
  AnimeEffectPreset,
  ANIME_EFFECT_PRESETS
} from '@/types/animeEffect';


// ============================================================================
// Types
// ============================================================================

export interface UseAnimatedSpriteOptions {
  /** Initial sprite data */
  initialSprite?: AnimatedSprite;
  /** Initial orientation */
  initialOrientation?: SpriteOrientation;
  /** Auto-play animation on mount */
  autoPlay?: boolean;
  /** Loop animation */
  loop?: boolean;
  /** Animation speed multiplier */
  speed?: number;
  /** Initial effects */
  initialEffects?: AnimeEffect[];
}

export interface UseAnimatedSpriteReturn {
  // Sprite state
  sprite: AnimatedSprite | null;
  orientation: SpriteOrientation;
  transform: SpriteTransform;
  effects: AnimeEffect[];
  isPlaying: boolean;
  currentFrame: number;
  currentAnimation: string;

  // Sprite actions
  setSprite: (sprite: AnimatedSprite) => void;
  clearSprite: () => void;

  // Orientation actions
  setOrientation: (orientation: SpriteOrientation) => void;
  autoOrient: (dx: number, dy: number) => void;
  rotateCW: () => void;
  rotateCCW: () => void;

  // Animation actions
  play: () => void;
  pause: () => void;
  stop: () => void;
  playAnimation: (animationName: string) => void;
  setSpeed: (speed: number) => void;
  setFrame: (frame: number) => void;

  // Transform actions
  setPosition: (x: number, y: number) => void;
  move: (dx: number, dy: number) => void;
  setScale: (scale: number) => void;
  setRotation: (degrees: number) => void;
  rotate: (degrees: number) => void;
  flipHorizontal: () => void;
  flipVertical: () => void;
  setOpacity: (opacity: number) => void;

  // Effect actions
  addEffect: (effect: AnimeEffect) => void;
  removeEffect: (effectId: string) => void;
  updateEffect: (effectId: string, updates: Partial<AnimeEffect>) => void;
  clearEffects: () => void;
  applyPreset: (presetId: string) => void;

  // Utility
  availableAnimations: string[];
  availableOrientations: SpriteOrientation[];
  getEffectStack: () => AnimeEffect[];
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useAnimatedSprite(
  options: UseAnimatedSpriteOptions = {}
): UseAnimatedSpriteReturn {
  const {
    initialSprite,
    initialOrientation = 's',
    autoPlay = false,
    loop = true,
    speed = 1,
    initialEffects = []
  } = options;

  // Local state
  const [sprite, setSpriteState] = useState<AnimatedSprite | null>(initialSprite || null);
  const [orientation, setOrientationState] = useState<SpriteOrientation>(initialOrientation);
  const [transform, setTransform] = useState<SpriteTransform>({
    position: { x: 0, y: 0 },
    scale: { x: 1, y: 1 },
    rotation: 0,
    flipH: false,
    flipV: false,
    opacity: 1
  });
  const [effects, setEffects] = useState<AnimeEffect[]>(initialEffects);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [currentAnimation, setCurrentAnimation] = useState('idle');

  // Animation frame reference
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const frameTimeRef = useRef<number>(0);
  const _currentSpeedRef = useRef<number>(speed);

  // ==========================================================================
  // Sprite Management
  // ==========================================================================

  const setSprite = useCallback((newSprite: AnimatedSprite) => {
    setSpriteState(newSprite);
    setCurrentAnimation(newSprite.animationList[0] || 'idle');
    setOrientationState(newSprite.currentOrientation);
    if (autoPlay) {
      setIsPlaying(true);
    }
  }, [autoPlay]);

  const clearSprite = useCallback(() => {
    setSpriteState(null);
    setIsPlaying(false);
    setCurrentFrame(0);
    setEffects([]);
  }, []);

  // ==========================================================================
  // Orientation Management
  // ==========================================================================

  const setOrientation = useCallback((newOrientation: SpriteOrientation) => {
    setOrientationState(newOrientation);
  }, []);

  const autoOrient = useCallback((dx: number, dy: number) => {
    const newOrientation = movementToOrientation(dx, dy);
    setOrientationState(newOrientation);
  }, []);

  const rotateCW = useCallback(() => {
    const currentIndex = SPRITE_ORIENTATIONS.indexOf(orientation);
    const nextIndex = (currentIndex + 1) % SPRITE_ORIENTATIONS.length;
    setOrientationState(SPRITE_ORIENTATIONS[nextIndex]);
  }, [orientation]);

  const rotateCCW = useCallback(() => {
    const currentIndex = SPRITE_ORIENTATIONS.indexOf(orientation);
    const prevIndex = (currentIndex - 1 + SPRITE_ORIENTATIONS.length) % SPRITE_ORIENTATIONS.length;
    setOrientationState(SPRITE_ORIENTATIONS[prevIndex]);
  }, [orientation]);

  // ==========================================================================
  // Animation Management
  // ==========================================================================

  const play = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const stop = useCallback(() => {
    setIsPlaying(false);
    setCurrentFrame(0);
    frameTimeRef.current = 0;
  }, []);

  const playAnimation = useCallback((animationName: string) => {
    setCurrentAnimation(animationName);
    setCurrentFrame(0);
    frameTimeRef.current = 0;
    setIsPlaying(true);
  }, []);

  const setSpeed = useCallback((_newSpeed: number) => {
    // Speed is applied in the animation loop
  }, []);

  const setFrame = useCallback((frame: number) => {
    if (sprite) {
      // Get max frames for current animation
      const maxFrames = 8; // Placeholder - should get from actual animation
      setCurrentFrame(Math.max(0, Math.min(frame, maxFrames - 1)));
    }
  }, [sprite]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || !sprite) return;

    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
      }

      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      // Update frame based on delta time and speed
      frameTimeRef.current += deltaTime * speed;

      // Frame duration (100ms default, should get from actual animation)
      const frameDuration = 100;

      if (frameTimeRef.current >= frameDuration) {
        frameTimeRef.current -= frameDuration;
        
        // Get max frames for current animation
        const maxFrames = 8; // Placeholder
        
        setCurrentFrame(prev => {
          const nextFrame = prev + 1;
          if (nextFrame >= maxFrames) {
            if (loop) {
              return 0;
            } else {
              setIsPlaying(false);
              return maxFrames - 1;
            }
          }
          return nextFrame;
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, sprite, speed, loop]);

  // ==========================================================================
  // Transform Management
  // ==========================================================================

  const setPosition = useCallback((x: number, y: number) => {
    setTransform(prev => ({
      ...prev,
      position: { x, y }
    }));
  }, []);

  const move = useCallback((dx: number, dy: number) => {
    setTransform(prev => ({
      ...prev,
      position: {
        x: prev.position.x + dx,
        y: prev.position.y + dy
      }
    }));
  }, []);

  const setScale = useCallback((scale: number) => {
    setTransform(prev => ({
      ...prev,
      scale: { x: scale, y: scale }
    }));
  }, []);

  const setRotation = useCallback((degrees: number) => {
    setTransform(prev => ({
      ...prev,
      rotation: degrees
    }));
  }, []);

  const rotate = useCallback((degrees: number) => {
    setTransform(prev => ({
      ...prev,
      rotation: prev.rotation + degrees
    }));
  }, []);

  const flipHorizontal = useCallback(() => {
    setTransform(prev => ({
      ...prev,
      flipH: !prev.flipH
    }));
  }, []);

  const flipVertical = useCallback(() => {
    setTransform(prev => ({
      ...prev,
      flipV: !prev.flipV
    }));
  }, []);

  const setOpacity = useCallback((opacity: number) => {
    setTransform(prev => ({
      ...prev,
      opacity: Math.max(0, Math.min(1, opacity))
    }));
  }, []);

  // ==========================================================================
  // Effect Management
  // ==========================================================================

  const addEffect = useCallback((effect: AnimeEffect) => {
    setEffects(prev => [...prev, effect]);
  }, []);

  const removeEffect = useCallback((effectId: string) => {
    setEffects(prev => prev.filter(e => e.id !== effectId));
  }, []);

  const updateEffect = useCallback((effectId: string, updates: Partial<AnimeEffect>) => {
    setEffects(prev => prev.map(e => 
      e.id === effectId ? { ...e, ...updates } as AnimeEffect : e
    ));
  }, []);

  const clearEffects = useCallback(() => {
    setEffects([]);
  }, []);

  const applyPreset = useCallback((presetId: string) => {
    const preset = ANIME_EFFECT_PRESETS.find(p => p.id === presetId);
    if (preset) {
      const newEffects = preset.effects.map(e => ({
        ...e,
        id: `${e.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }));
      setEffects(prev => [...prev, ...newEffects]);
    }
  }, []);

  const getEffectStack = useCallback(() => {
    return effects;
  }, [effects]);

  // ==========================================================================
  // Computed Values
  // ==========================================================================

  const availableAnimations = sprite?.animationList || [];
  
  const availableOrientations = SPRITE_ORIENTATIONS.filter(o => {
    if (!sprite) return false;
    // Check if animation exists for this orientation
    const key = `${currentAnimation}_${o}`;
    return sprite.animations.has(key);
  });

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    // State
    sprite,
    orientation,
    transform,
    effects,
    isPlaying,
    currentFrame,
    currentAnimation,

    // Sprite actions
    setSprite,
    clearSprite,

    // Orientation actions
    setOrientation,
    autoOrient,
    rotateCW,
    rotateCCW,

    // Animation actions
    play,
    pause,
    stop,
    playAnimation,
    setSpeed,
    setFrame,

    // Transform actions
    setPosition,
    move,
    setScale,
    setRotation,
    rotate,
    flipHorizontal,
    flipVertical,
    setOpacity,

    // Effect actions
    addEffect,
    removeEffect,
    updateEffect,
    clearEffects,
    applyPreset,

    // Utility
    availableAnimations,
    availableOrientations,
    getEffectStack
  };
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook for managing multiple sprites
 */
export function useSpriteManager() {
  const [sprites, setSprites] = useState<Map<string, AnimatedSprite>>(new Map());
  const [activeSpriteId, setActiveSpriteId] = useState<string | null>(null);

  const addSprite = useCallback((sprite: AnimatedSprite) => {
    setSprites(prev => new Map(prev).set(sprite.id, sprite));
    setActiveSpriteId(sprite.id);
  }, []);

  const removeSprite = useCallback((id: string) => {
    setSprites(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
    if (activeSpriteId === id) {
      setActiveSpriteId(null);
    }
  }, [activeSpriteId]);

  const getSprite = useCallback((id: string) => {
    return sprites.get(id);
  }, [sprites]);

  const activeSprite = activeSpriteId ? sprites.get(activeSpriteId) : null;

  return {
    sprites: Array.from(sprites.values()),
    activeSprite,
    activeSpriteId,
    addSprite,
    removeSprite,
    getSprite,
    setActiveSpriteId
  };
}

/**
 * Hook for effect presets
 */
export function useEffectPresets() {
  const getPresets = useCallback(() => ANIME_EFFECT_PRESETS, []);
  
  const getPreset = useCallback((id: string) => {
    return ANIME_EFFECT_PRESETS.find(p => p.id === id);
  }, []);

  const getPresetsByCategory = useCallback((category: AnimeEffectPreset['category']) => {
    return ANIME_EFFECT_PRESETS.filter(p => p.category === category);
  }, []);

  const searchPresets = useCallback((query: string) => {
    const lowerQuery = query.toLowerCase();
    return ANIME_EFFECT_PRESETS.filter(p => 
      p.name.toLowerCase().includes(lowerQuery) ||
      p.description.toLowerCase().includes(lowerQuery) ||
      p.tags.some(t => t.toLowerCase().includes(lowerQuery))
    );
  }, []);

  return {
    presets: ANIME_EFFECT_PRESETS,
    getPresets,
    getPreset,
    getPresetsByCategory,
    searchPresets
  };
}

export default useAnimatedSprite;