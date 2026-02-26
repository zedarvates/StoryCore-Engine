/**
 * Sprite Store
 * 
 * Zustand store for managing sprite state across the application.
 * Handles sprites, animations, effects, and selection state.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import {
  AnimatedSprite,
  SpriteOrientation,
  SpriteState,
  SpriteTransform,
  SPRITE_ORIENTATIONS
} from '@/types/sprite';

import {
  AnimeEffect,
  AnimeEffectPreset,
  AnimeEffectStack
} from '@/types/animeEffect';

import { spriteService } from '@/services/sprite/SpriteService';

// ============================================================================
// Store Types
// ============================================================================

export interface SpriteInstance {
  id: string;
  sprite: AnimatedSprite;
  state: SpriteState;
  transform: SpriteTransform;
  effects: AnimeEffect[];
  name: string;
  visible: boolean;
  locked: boolean;
}

export interface SpriteStoreState {
  // Sprites
  sprites: Map<string, SpriteInstance>;
  spriteOrder: string[];
  selectedSpriteId: string | null;
  hoveredSpriteId: string | null;

  // Animation
  isPlaying: boolean;
  globalSpeed: number;
  currentFrame: number;
  totalFrames: number;

  // Effects
  activeEffects: Map<string, AnimeEffectStack>;
  effectPresets: AnimeEffectPreset[];

  // UI State
  activePanel: 'sprites' | 'animations' | 'effects' | 'settings';
  showOrientationWheel: boolean;
  showEffectLibrary: boolean;
  previewMode: '2d' | '3d' | '2.5d';

  // Clipboard
  clipboard: SpriteInstance | null;

  // History
  history: SpriteInstance[][];
  historyIndex: number;
  maxHistory: number;
}

export interface SpriteStoreActions {
  // Sprite Management
  addSprite: (sprite: AnimatedSprite) => void;
  removeSprite: (id: string) => void;
  duplicateSprite: (id: string) => void;
  updateSprite: (id: string, updates: Partial<SpriteInstance>) => void;
  reorderSprites: (newOrder: string[]) => void;
  
  // Selection
  selectSprite: (id: string | null) => void;
  hoverSprite: (id: string | null) => void;
  selectAll: () => void;
  deselectAll: () => void;

  // Animation
  play: () => void;
  pause: () => void;
  stop: () => void;
  setFrame: (frame: number) => void;
  setGlobalSpeed: (speed: number) => void;
  playAnimation: (spriteId: string, animationName: string) => void;
  
  // Orientation
  setOrientation: (spriteId: string, orientation: SpriteOrientation) => void;
  autoOrientAll: (dx: number, dy: number) => void;

  // Transform
  setTransform: (spriteId: string, transform: Partial<SpriteTransform>) => void;
  moveSprite: (spriteId: string, x: number, y: number) => void;
  scaleSprite: (spriteId: string, scale: number) => void;
  rotateSprite: (spriteId: string, rotation: number) => void;
  flipSprite: (spriteId: string, horizontal: boolean) => void;

  // Effects
  addEffect: (spriteId: string, effect: AnimeEffect) => void;
  removeEffect: (spriteId: string, effectId: string) => void;
  updateEffect: (spriteId: string, effectId: string, updates: Partial<AnimeEffect>) => void;
  applyEffectPreset: (spriteId: string, presetId: string) => void;
  reorderEffects: (spriteId: string, effectIds: string[]) => void;

  // UI
  setActivePanel: (panel: SpriteStoreState['activePanel']) => void;
  toggleOrientationWheel: () => void;
  toggleEffectLibrary: () => void;
  setPreviewMode: (mode: SpriteStoreState['previewMode']) => void;

  // Clipboard
  copySprite: (id: string) => void;
  pasteSprite: () => void;
  cutSprite: (id: string) => void;

  // History
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;

  // Import/Export
  exportAll: () => string;
  importSprites: (json: string) => void;
  
  // Utility
  getSelectedSprite: () => SpriteInstance | null;
  getSpriteById: (id: string) => SpriteInstance | undefined;
  getAllSprites: () => SpriteInstance[];
  clearAll: () => void;
}

export type SpriteStore = SpriteStoreState & SpriteStoreActions;

// ============================================================================
// Default State
// ============================================================================

const defaultState: SpriteStoreState = {
  sprites: new Map(),
  spriteOrder: [],
  selectedSpriteId: null,
  hoveredSpriteId: null,

  isPlaying: false,
  globalSpeed: 1,
  currentFrame: 0,
  totalFrames: 100,

  activeEffects: new Map(),
  effectPresets: [],

  activePanel: 'sprites',
  showOrientationWheel: false,
  showEffectLibrary: false,
  previewMode: '2d',

  clipboard: null,

  history: [],
  historyIndex: -1,
  maxHistory: 50
};

// ============================================================================
// Store Creation
// ============================================================================

export const useSpriteStore = create<SpriteStore>()(
  subscribeWithSelector((set, get) => ({
    ...defaultState,

    // ========================================================================
    // Sprite Management
    // ========================================================================

    addSprite: (sprite: AnimatedSprite) => {
      const instance: SpriteInstance = {
        id: sprite.id,
        sprite,
        state: {
          spriteId: sprite.id,
          animation: sprite.animationList[0] || 'idle',
          orientation: sprite.currentOrientation,
          frameIndex: 0,
          animationTime: 0,
          isPlaying: false,
          speed: 1,
          loopRemaining: -1,
          lastUpdate: Date.now()
        },
        transform: {
          position: { x: 0, y: 0 },
          scale: { x: 1, y: 1 },
          rotation: 0,
          flipH: false,
          flipV: false,
          opacity: 1
        },
        effects: [],
        name: sprite.name,
        visible: true,
        locked: false
      };

      set(state => {
        const newSprites = new Map(state.sprites);
        newSprites.set(sprite.id, instance);
        
        return {
          sprites: newSprites,
          spriteOrder: [...state.spriteOrder, sprite.id],
          selectedSpriteId: sprite.id
        };
      });

      get().saveToHistory();
    },

    removeSprite: (id: string) => {
      set(state => {
        const newSprites = new Map(state.sprites);
        newSprites.delete(id);
        
        return {
          sprites: newSprites,
          spriteOrder: state.spriteOrder.filter(sid => sid !== id),
          selectedSpriteId: state.selectedSpriteId === id ? null : state.selectedSpriteId
        };
      });

      get().saveToHistory();
    },

    duplicateSprite: (id: string) => {
      const instance = get().sprites.get(id);
      if (!instance) return;

      const newSprite: AnimatedSprite = {
        ...instance.sprite,
        id: `sprite_${Date.now()}`,
        name: `${instance.sprite.name} (copy)`,
        metadata: {
          ...instance.sprite.metadata,
          created: Date.now(),
          modified: Date.now()
        }
      };

      get().addSprite(newSprite);
    },

    updateSprite: (id: string, updates: Partial<SpriteInstance>) => {
      set(state => {
        const instance = state.sprites.get(id);
        if (!instance) return state;

        const newSprites = new Map(state.sprites);
        newSprites.set(id, { ...instance, ...updates });

        return { sprites: newSprites };
      });
    },

    reorderSprites: (newOrder: string[]) => {
      set({ spriteOrder: newOrder });
      get().saveToHistory();
    },

    // ========================================================================
    // Selection
    // ========================================================================

    selectSprite: (id: string | null) => {
      set({ selectedSpriteId: id });
    },

    hoverSprite: (id: string | null) => {
      set({ hoveredSpriteId: id });
    },

    selectAll: () => {
      const state = get();
      if (state.spriteOrder.length > 0) {
        set({ selectedSpriteId: state.spriteOrder[0] });
      }
    },

    deselectAll: () => {
      set({ selectedSpriteId: null });
    },

    // ========================================================================
    // Animation
    // ========================================================================

    play: () => {
      set({ isPlaying: true });
      
      // Start animation for all sprites
      const state = get();
      state.sprites.forEach((instance, id) => {
        spriteService.resumeAnimation(id);
      });
    },

    pause: () => {
      set({ isPlaying: false });
      
      const state = get();
      state.sprites.forEach((instance, id) => {
        spriteService.pauseAnimation(id);
      });
    },

    stop: () => {
      set({ isPlaying: false, currentFrame: 0 });
      
      const state = get();
      state.sprites.forEach((instance, id) => {
        spriteService.stopAnimation(id);
      });
    },

    setFrame: (frame: number) => {
      set({ currentFrame: frame });
    },

    setGlobalSpeed: (speed: number) => {
      set({ globalSpeed: speed });
      
      const state = get();
      state.sprites.forEach((instance, id) => {
        spriteService.setAnimationSpeed(id, speed);
      });
    },

    playAnimation: (spriteId: string, animationName: string) => {
      spriteService.playAnimation(spriteId, animationName);
      
      set(state => {
        const instance = state.sprites.get(spriteId);
        if (!instance) return state;

        const newSprites = new Map(state.sprites);
        newSprites.set(spriteId, {
          ...instance,
          state: {
            ...instance.state,
            animation: animationName
          }
        });

        return { sprites: newSprites };
      });
    },

    // ========================================================================
    // Orientation
    // ========================================================================

    setOrientation: (spriteId: string, orientation: SpriteOrientation) => {
      spriteService.setOrientation(spriteId, orientation);
      
      set(state => {
        const instance = state.sprites.get(spriteId);
        if (!instance) return state;

        const newSprites = new Map(state.sprites);
        newSprites.set(spriteId, {
          ...instance,
          state: {
            ...instance.state,
            orientation
          },
          sprite: {
            ...instance.sprite,
            currentOrientation: orientation
          }
        });

        return { sprites: newSprites };
      });
    },

    autoOrientAll: () => {
      const state = get();
      state.sprites.forEach((_instance, id) => {
        get().setOrientation(id, 
          SPRITE_ORIENTATIONS[Math.floor(Math.random() * SPRITE_ORIENTATIONS.length)]
        );
      });
    },

    // ========================================================================
    // Transform
    // ========================================================================

    setTransform: (spriteId: string, transform: Partial<SpriteTransform>) => {
      set(state => {
        const instance = state.sprites.get(spriteId);
        if (!instance) return state;

        const newSprites = new Map(state.sprites);
        newSprites.set(spriteId, {
          ...instance,
          transform: { ...instance.transform, ...transform }
        });

        return { sprites: newSprites };
      });
    },

    moveSprite: (spriteId: string, x: number, y: number) => {
      get().setTransform(spriteId, { position: { x, y } });
    },

    scaleSprite: (spriteId: string, scale: number) => {
      get().setTransform(spriteId, { scale: { x: scale, y: scale } });
    },

    rotateSprite: (spriteId: string, rotation: number) => {
      get().setTransform(spriteId, { rotation });
    },

    flipSprite: (spriteId: string, horizontal: boolean) => {
      set(state => {
        const instance = state.sprites.get(spriteId);
        if (!instance) return state;

        const newSprites = new Map(state.sprites);
        newSprites.set(spriteId, {
          ...instance,
          transform: {
            ...instance.transform,
            flipH: horizontal ? !instance.transform.flipH : instance.transform.flipH,
            flipV: !horizontal ? !instance.transform.flipV : instance.transform.flipV
          }
        });

        return { sprites: newSprites };
      });
    },

    // ========================================================================
    // Effects
    // ========================================================================

    addEffect: (spriteId: string, effect: AnimeEffect) => {
      spriteService.addEffect(spriteId, effect);
      
      set(state => {
        const instance = state.sprites.get(spriteId);
        if (!instance) return state;

        const newSprites = new Map(state.sprites);
        newSprites.set(spriteId, {
          ...instance,
          effects: [...instance.effects, effect]
        });

        return { sprites: newSprites };
      });

      get().saveToHistory();
    },

    removeEffect: (spriteId: string, effectId: string) => {
      spriteService.removeEffect(spriteId, effectId);
      
      set(state => {
        const instance = state.sprites.get(spriteId);
        if (!instance) return state;

        const newSprites = new Map(state.sprites);
        newSprites.set(spriteId, {
          ...instance,
          effects: instance.effects.filter(e => e.id !== effectId)
        });

        return { sprites: newSprites };
      });

      get().saveToHistory();
    },

    updateEffect: (spriteId: string, effectId: string, updates: Partial<AnimeEffect>) => {
      set(state => {
        const instance = state.sprites.get(spriteId);
        if (!instance) return state;

        const newEffects = instance.effects.map(e => 
          e.id === effectId ? { ...e, ...updates } as AnimeEffect : e
        );

        const newSprites = new Map(state.sprites);
        newSprites.set(spriteId, {
          ...instance,
          effects: newEffects
        });

        return { sprites: newSprites };
      });
    },

    applyEffectPreset: (spriteId: string, presetId: string) => {
      // Find preset and apply all its effects
      const preset = get().effectPresets.find(p => p.id === presetId);
      if (!preset) return;

      preset.effects.forEach(effect => {
        get().addEffect(spriteId, { ...effect, id: `${effect.id}_${Date.now()}` });
      });
    },

    reorderEffects: (spriteId: string, effectIds: string[]) => {
      set(state => {
        const instance = state.sprites.get(spriteId);
        if (!instance) return state;

        const effectMap = new Map(instance.effects.map(e => [e.id, e]));
        const newEffects = effectIds
          .map(id => effectMap.get(id))
          .filter((e): e is AnimeEffect => e !== undefined);

        const newSprites = new Map(state.sprites);
        newSprites.set(spriteId, {
          ...instance,
          effects: newEffects
        });

        return { sprites: newSprites };
      });
    },

    // ========================================================================
    // UI
    // ========================================================================

    setActivePanel: (panel) => set({ activePanel: panel }),

    toggleOrientationWheel: () => set(state => ({ 
      showOrientationWheel: !state.showOrientationWheel 
    })),

    toggleEffectLibrary: () => set(state => ({ 
      showEffectLibrary: !state.showEffectLibrary 
    })),

    setPreviewMode: (mode) => set({ previewMode: mode }),

    // ========================================================================
    // Clipboard
    // ========================================================================

    copySprite: (id: string) => {
      const instance = get().sprites.get(id);
      if (instance) {
        set({ clipboard: { ...instance, id: `clipboard_${Date.now()}` } });
      }
    },

    pasteSprite: () => {
      const { clipboard } = get();
      if (!clipboard) return;

      const newSprite: AnimatedSprite = {
        ...clipboard.sprite,
        id: `sprite_${Date.now()}`,
        name: `${clipboard.sprite.name} (pasted)`,
        metadata: {
          ...clipboard.sprite.metadata,
          created: Date.now(),
          modified: Date.now()
        }
      };

      get().addSprite(newSprite);
    },

    cutSprite: (id: string) => {
      get().copySprite(id);
      get().removeSprite(id);
    },

    // ========================================================================
    // History
    // ========================================================================

    undo: () => {
      const { history, historyIndex } = get();
      if (historyIndex <= 0) return;

      const newIndex = historyIndex - 1;
      const snapshot = history[newIndex];
      
      set({
        historyIndex: newIndex,
        sprites: new Map(snapshot.map(s => [s.id, s])),
        spriteOrder: snapshot.map(s => s.id)
      });
    },

    redo: () => {
      const { history, historyIndex } = get();
      if (historyIndex >= history.length - 1) return;

      const newIndex = historyIndex + 1;
      const snapshot = history[newIndex];
      
      set({
        historyIndex: newIndex,
        sprites: new Map(snapshot.map(s => [s.id, s])),
        spriteOrder: snapshot.map(s => s.id)
      });
    },

    saveToHistory: () => {
      const { sprites, spriteOrder, history, historyIndex, maxHistory } = get();
      
      const snapshot = spriteOrder.map(id => sprites.get(id)).filter((s): s is SpriteInstance => s !== undefined);
      
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(snapshot);
      
      if (newHistory.length > maxHistory) {
        newHistory.shift();
      }

      set({
        history: newHistory,
        historyIndex: newHistory.length - 1
      });
    },

    // ========================================================================
    // Import/Export
    // ========================================================================

    exportAll: () => {
      const { sprites, spriteOrder } = get();
      const data = spriteOrder.map(id => {
        const instance = sprites.get(id);
        if (!instance) return null;
        
        return {
          sprite: spriteService.exportSprite(instance.sprite.id),
          transform: instance.transform,
          effects: instance.effects,
          name: instance.name,
          visible: instance.visible,
          locked: instance.locked
        };
      }).filter(Boolean);

      return JSON.stringify(data);
    },

    importSprites: async (json: string) => {
      try {
        const data = JSON.parse(json);
        
        for (const item of data) {
          if (item.sprite) {
            const sprite = await spriteService.importSprite(JSON.stringify(item.sprite));
            if (sprite) {
              get().addSprite(sprite);
              if (item.transform) {
                get().setTransform(sprite.id, item.transform);
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to import sprites:', error);
      }
    },

    // ========================================================================
    // Utility
    // ========================================================================

    getSelectedSprite: () => {
      const { sprites, selectedSpriteId } = get();
      return selectedSpriteId ? sprites.get(selectedSpriteId) || null : null;
    },

    getSpriteById: (id: string) => {
      return get().sprites.get(id);
    },

    getAllSprites: () => {
      const { sprites, spriteOrder } = get();
      return spriteOrder.map(id => sprites.get(id)).filter((s): s is SpriteInstance => s !== undefined);
    },

    clearAll: () => {
      set({
        sprites: new Map(),
        spriteOrder: [],
        selectedSpriteId: null,
        hoveredSpriteId: null,
        isPlaying: false,
        currentFrame: 0,
        history: [],
        historyIndex: -1
      });
    }
  }))
);

// ============================================================================
// Hooks
// ============================================================================

export const useSelectedSprite = () => useSpriteStore(state => {
  if (!state.selectedSpriteId) return null;
  return state.sprites.get(state.selectedSpriteId) || null;
});

export const useSpriteOrientation = (spriteId: string | null) => useSpriteStore(state => {
  if (!spriteId) return null;
  const instance = state.sprites.get(spriteId);
  return instance?.state.orientation || null;
});

export const useSpriteEffects = (spriteId: string | null) => useSpriteStore(state => {
  if (!spriteId) return [];
  const instance = state.sprites.get(spriteId);
  return instance?.effects || [];
});

export const useIsSpritePlaying = () => useSpriteStore(state => state.isPlaying);

export const useSpriteOrder = () => useSpriteStore(state => state.spriteOrder);

export default useSpriteStore;