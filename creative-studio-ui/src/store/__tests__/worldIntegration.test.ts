import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStore, useWorlds, useSelectedWorld } from '../index';
import type { World } from '@/types/world';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('World Store Integration', () => {
  beforeEach(() => {
    // Reset store before each test
    act(() => {
      useStore.setState({
        worlds: [],
        selectedWorldId: null,
        project: {
          schema_version: '1.0',
          project_name: 'test-project',
          shots: [],
          assets: [],
          worlds: [],
          selectedWorldId: null,
          capabilities: {
            grid_generation: true,
            promotion_engine: true,
            qa_engine: true,
            autofix_engine: true,
          },
          generation_status: {
            grid: 'pending',
            promotion: 'pending',
          },
        },
      });
    });

    // Clear localStorage
    localStorageMock.clear();
  });

  describe('addWorld', () => {
    it('should add a world to the store', () => {
      const world: World = {
        id: 'world-1',
        name: 'Eldoria',
        genre: ['fantasy'],
        timePeriod: 'Medieval',
        tone: ['epic', 'dark'],
        locations: [],
        rules: [],
        atmosphere: 'Mystical and dangerous',
        culturalElements: {
          languages: ['Eldorian'],
          religions: ['The Old Gods'],
          traditions: [],
          historicalEvents: [],
          culturalConflicts: [],
        },
        technology: 'Medieval',
        magic: 'Elemental magic system',
        conflicts: ['War of the Five Kingdoms'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        useStore.getState().addWorld(world);
      });

      const state = useStore.getState();
      expect(state.worlds).toHaveLength(1);
      expect(state.worlds[0]).toEqual(world);
      expect(state.selectedWorldId).toBe('world-1'); // Auto-selected
    });

    it('should persist world to localStorage', () => {
      const world: World = {
        id: 'world-1',
        name: 'Eldoria',
        genre: ['fantasy'],
        timePeriod: 'Medieval',
        tone: ['epic'],
        locations: [],
        rules: [],
        atmosphere: '',
        culturalElements: {
          languages: [],
          religions: [],
          traditions: [],
          historicalEvents: [],
          culturalConflicts: [],
        },
        technology: '',
        magic: '',
        conflicts: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        useStore.getState().addWorld(world);
      });

      const stored = localStorageMock.getItem('project-test-project-worlds');
      expect(stored).toBeTruthy();
      
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe('world-1');
    });

    it('should update project with new world', () => {
      const world: World = {
        id: 'world-1',
        name: 'Eldoria',
        genre: ['fantasy'],
        timePeriod: 'Medieval',
        tone: ['epic'],
        locations: [],
        rules: [],
        atmosphere: '',
        culturalElements: {
          languages: [],
          religions: [],
          traditions: [],
          historicalEvents: [],
          culturalConflicts: [],
        },
        technology: '',
        magic: '',
        conflicts: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        useStore.getState().addWorld(world);
      });

      const state = useStore.getState();
      expect(state.project?.worlds).toHaveLength(1);
      expect(state.project?.selectedWorldId).toBe('world-1');
    });

    it('should not auto-select if a world is already selected', () => {
      const world1: World = {
        id: 'world-1',
        name: 'Eldoria',
        genre: ['fantasy'],
        timePeriod: 'Medieval',
        tone: ['epic'],
        locations: [],
        rules: [],
        atmosphere: '',
        culturalElements: {
          languages: [],
          religions: [],
          traditions: [],
          historicalEvents: [],
          culturalConflicts: [],
        },
        technology: '',
        magic: '',
        conflicts: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const world2: World = {
        ...world1,
        id: 'world-2',
        name: 'Cyberpunk City',
        genre: ['sci-fi', 'cyberpunk'],
      };

      act(() => {
        useStore.getState().addWorld(world1);
        useStore.getState().addWorld(world2);
      });

      const state = useStore.getState();
      expect(state.selectedWorldId).toBe('world-1'); // Still first world
    });
  });

  describe('updateWorld', () => {
    it('should update a world in the store', () => {
      const world: World = {
        id: 'world-1',
        name: 'Eldoria',
        genre: ['fantasy'],
        timePeriod: 'Medieval',
        tone: ['epic'],
        locations: [],
        rules: [],
        atmosphere: '',
        culturalElements: {
          languages: [],
          religions: [],
          traditions: [],
          historicalEvents: [],
          culturalConflicts: [],
        },
        technology: '',
        magic: '',
        conflicts: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        useStore.getState().addWorld(world);
        useStore.getState().updateWorld('world-1', {
          name: 'New Eldoria',
          atmosphere: 'Dark and mysterious',
        });
      });

      const state = useStore.getState();
      expect(state.worlds[0].name).toBe('New Eldoria');
      expect(state.worlds[0].atmosphere).toBe('Dark and mysterious');
      expect(state.worlds[0].updatedAt).not.toEqual(world.updatedAt);
    });

    it('should persist updated world to localStorage', () => {
      const world: World = {
        id: 'world-1',
        name: 'Eldoria',
        genre: ['fantasy'],
        timePeriod: 'Medieval',
        tone: ['epic'],
        locations: [],
        rules: [],
        atmosphere: '',
        culturalElements: {
          languages: [],
          religions: [],
          traditions: [],
          historicalEvents: [],
          culturalConflicts: [],
        },
        technology: '',
        magic: '',
        conflicts: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        useStore.getState().addWorld(world);
        useStore.getState().updateWorld('world-1', { name: 'Updated World' });
      });

      const stored = localStorageMock.getItem('project-test-project-worlds');
      const parsed = JSON.parse(stored!);
      expect(parsed[0].name).toBe('Updated World');
    });
  });

  describe('deleteWorld', () => {
    it('should delete a world from the store', () => {
      const world: World = {
        id: 'world-1',
        name: 'Eldoria',
        genre: ['fantasy'],
        timePeriod: 'Medieval',
        tone: ['epic'],
        locations: [],
        rules: [],
        atmosphere: '',
        culturalElements: {
          languages: [],
          religions: [],
          traditions: [],
          historicalEvents: [],
          culturalConflicts: [],
        },
        technology: '',
        magic: '',
        conflicts: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        useStore.getState().addWorld(world);
        useStore.getState().deleteWorld('world-1');
      });

      const state = useStore.getState();
      expect(state.worlds).toHaveLength(0);
      expect(state.selectedWorldId).toBeNull();
    });

    it('should select next world when deleting selected world', () => {
      const world1: World = {
        id: 'world-1',
        name: 'Eldoria',
        genre: ['fantasy'],
        timePeriod: 'Medieval',
        tone: ['epic'],
        locations: [],
        rules: [],
        atmosphere: '',
        culturalElements: {
          languages: [],
          religions: [],
          traditions: [],
          historicalEvents: [],
          culturalConflicts: [],
        },
        technology: '',
        magic: '',
        conflicts: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const world2: World = {
        ...world1,
        id: 'world-2',
        name: 'Cyberpunk City',
      };

      act(() => {
        useStore.getState().addWorld(world1);
        useStore.getState().addWorld(world2);
        useStore.getState().deleteWorld('world-1');
      });

      const state = useStore.getState();
      expect(state.selectedWorldId).toBe('world-2');
    });
  });

  describe('selectWorld', () => {
    it('should select a world', () => {
      const world: World = {
        id: 'world-1',
        name: 'Eldoria',
        genre: ['fantasy'],
        timePeriod: 'Medieval',
        tone: ['epic'],
        locations: [],
        rules: [],
        atmosphere: '',
        culturalElements: {
          languages: [],
          religions: [],
          traditions: [],
          historicalEvents: [],
          culturalConflicts: [],
        },
        technology: '',
        magic: '',
        conflicts: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        useStore.getState().addWorld(world);
        useStore.getState().selectWorld(null);
        useStore.getState().selectWorld('world-1');
      });

      const state = useStore.getState();
      expect(state.selectedWorldId).toBe('world-1');
    });
  });

  describe('getWorldById', () => {
    it('should return world by id', () => {
      const world: World = {
        id: 'world-1',
        name: 'Eldoria',
        genre: ['fantasy'],
        timePeriod: 'Medieval',
        tone: ['epic'],
        locations: [],
        rules: [],
        atmosphere: '',
        culturalElements: {
          languages: [],
          religions: [],
          traditions: [],
          historicalEvents: [],
          culturalConflicts: [],
        },
        technology: '',
        magic: '',
        conflicts: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        useStore.getState().addWorld(world);
      });

      const found = useStore.getState().getWorldById('world-1');
      expect(found).toEqual(world);
    });

    it('should return undefined for non-existent world', () => {
      const found = useStore.getState().getWorldById('non-existent');
      expect(found).toBeUndefined();
    });
  });

  describe('Selector Hooks', () => {
    it('useWorlds should return all worlds', () => {
      const world: World = {
        id: 'world-1',
        name: 'Eldoria',
        genre: ['fantasy'],
        timePeriod: 'Medieval',
        tone: ['epic'],
        locations: [],
        rules: [],
        atmosphere: '',
        culturalElements: {
          languages: [],
          religions: [],
          traditions: [],
          historicalEvents: [],
          culturalConflicts: [],
        },
        technology: '',
        magic: '',
        conflicts: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        useStore.getState().addWorld(world);
      });

      const { result } = renderHook(() => useWorlds());
      expect(result.current).toHaveLength(1);
      expect(result.current[0]).toEqual(world);
    });

    it('useSelectedWorld should return selected world', () => {
      const world: World = {
        id: 'world-1',
        name: 'Eldoria',
        genre: ['fantasy'],
        timePeriod: 'Medieval',
        tone: ['epic'],
        locations: [],
        rules: [],
        atmosphere: '',
        culturalElements: {
          languages: [],
          religions: [],
          traditions: [],
          historicalEvents: [],
          culturalConflicts: [],
        },
        technology: '',
        magic: '',
        conflicts: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        useStore.getState().addWorld(world);
      });

      const { result } = renderHook(() => useSelectedWorld());
      expect(result.current).toEqual(world);
    });

    it('useSelectedWorld should return null when no world selected', () => {
      const { result } = renderHook(() => useSelectedWorld());
      expect(result.current).toBeNull();
    });
  });
});
