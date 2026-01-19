// ============================================================================
// Character Persistence Hook Tests
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCharacterPersistence } from '../useCharacterPersistence';
import type { Character } from '@/types/character';

// Mock the store
vi.mock('@/store', () => ({
  useStore: vi.fn((selector) => {
    const mockState = {
      characters: [] as Character[],
      addCharacter: vi.fn(),
      updateCharacter: vi.fn(),
      deleteCharacter: vi.fn(),
      getAllCharacters: vi.fn(() => []),
    };
    return selector ? selector(mockState) : mockState;
  }),
}));

// Mock fetch
global.fetch = vi.fn();

describe('useCharacterPersistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('saveCharacter', () => {
    it('saves a new character with generated UUID', async () => {
      const mockCharacter: Partial<Character> = {
        name: 'Test Hero',
        role: {
          archetype: 'Protagonist',
          narrative_function: 'Hero',
          character_arc: 'Growth',
        },
        visual_identity: {
          age_range: 'adult',
          hair_color: 'brown',
          hair_style: 'short',
          hair_length: 'short',
          eye_color: 'blue',
          eye_shape: 'round',
          skin_tone: 'fair',
          facial_structure: 'oval',
          distinctive_features: [],
          height: 'average',
          build: 'athletic',
          posture: 'upright',
          clothing_style: 'casual',
          color_palette: [],
        },
        personality: {
          traits: ['brave', 'loyal'],
          values: ['justice'],
          fears: ['failure'],
          desires: ['peace'],
          flaws: ['stubborn'],
          strengths: ['courage'],
          temperament: 'calm',
          communication_style: 'direct',
        },
        background: {
          origin: 'City',
          occupation: 'Warrior',
          education: 'Self-taught',
          family: 'Unknown',
          significant_events: [],
          current_situation: 'Active',
        },
        relationships: [],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockCharacter, character_id: 'test-uuid' }),
      });

      const { result } = renderHook(() => useCharacterPersistence());

      let savedCharacter: Character | undefined;
      await act(async () => {
        savedCharacter = await result.current.saveCharacter(mockCharacter);
      });

      expect(savedCharacter).toBeDefined();
      expect(savedCharacter?.character_id).toBeDefined();
      expect(savedCharacter?.name).toBe('Test Hero');
      expect(savedCharacter?.creation_method).toBe('wizard');
      expect(fetch).toHaveBeenCalledWith(
        '/api/characters/save',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('updates an existing character', async () => {
      const existingCharacter: Partial<Character> = {
        character_id: 'existing-uuid',
        name: 'Updated Hero',
        role: {
          archetype: 'Protagonist',
          narrative_function: 'Hero',
          character_arc: 'Growth',
        },
        visual_identity: {
          age_range: 'adult',
          hair_color: 'brown',
          hair_style: 'short',
          hair_length: 'short',
          eye_color: 'blue',
          eye_shape: 'round',
          skin_tone: 'fair',
          facial_structure: 'oval',
          distinctive_features: [],
          height: 'average',
          build: 'athletic',
          posture: 'upright',
          clothing_style: 'casual',
          color_palette: [],
        },
        personality: {
          traits: [],
          values: [],
          fears: [],
          desires: [],
          flaws: [],
          strengths: [],
          temperament: '',
          communication_style: '',
        },
        background: {
          origin: '',
          occupation: '',
          education: '',
          family: '',
          significant_events: [],
          current_situation: '',
        },
        relationships: [],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => existingCharacter,
      });

      const { result } = renderHook(() => useCharacterPersistence());

      let savedCharacter: Character | undefined;
      await act(async () => {
        savedCharacter = await result.current.saveCharacter(existingCharacter);
      });

      expect(savedCharacter?.character_id).toBe('existing-uuid');
      expect(savedCharacter?.name).toBe('Updated Hero');
    });

    it('falls back to localStorage when API fails', async () => {
      const mockCharacter: Partial<Character> = {
        name: 'Test Hero',
        role: {
          archetype: 'Protagonist',
          narrative_function: 'Hero',
          character_arc: 'Growth',
        },
        visual_identity: {
          age_range: 'adult',
          hair_color: 'brown',
          hair_style: 'short',
          hair_length: 'short',
          eye_color: 'blue',
          eye_shape: 'round',
          skin_tone: 'fair',
          facial_structure: 'oval',
          distinctive_features: [],
          height: 'average',
          build: 'athletic',
          posture: 'upright',
          clothing_style: 'casual',
          color_palette: [],
        },
        personality: {
          traits: [],
          values: [],
          fears: [],
          desires: [],
          flaws: [],
          strengths: [],
          temperament: '',
          communication_style: '',
        },
        background: {
          origin: '',
          occupation: '',
          education: '',
          family: '',
          significant_events: [],
          current_situation: '',
        },
        relationships: [],
      };

      (global.fetch as any).mockRejectedValueOnce(new Error('API Error'));

      const { result } = renderHook(() => useCharacterPersistence());

      let savedCharacter: Character | undefined;
      await act(async () => {
        savedCharacter = await result.current.saveCharacter(mockCharacter);
      });

      expect(savedCharacter).toBeDefined();
      expect(savedCharacter?.name).toBe('Test Hero');

      // Check localStorage
      const stored = localStorage.getItem(`character-${savedCharacter?.character_id}`);
      expect(stored).toBeDefined();
    });
  });

  describe('loadCharacter', () => {
    it('loads a character from API', async () => {
      const mockCharacter: Character = {
        character_id: 'test-uuid',
        name: 'Test Hero',
        creation_method: 'wizard',
        creation_timestamp: new Date().toISOString(),
        version: '1.0',
        role: {
          archetype: 'Protagonist',
          narrative_function: 'Hero',
          character_arc: 'Growth',
        },
        visual_identity: {
          age_range: 'adult',
          hair_color: 'brown',
          hair_style: 'short',
          hair_length: 'short',
          eye_color: 'blue',
          eye_shape: 'round',
          skin_tone: 'fair',
          facial_structure: 'oval',
          distinctive_features: [],
          height: 'average',
          build: 'athletic',
          posture: 'upright',
          clothing_style: 'casual',
          color_palette: [],
        },
        personality: {
          traits: [],
          values: [],
          fears: [],
          desires: [],
          flaws: [],
          strengths: [],
          temperament: '',
          communication_style: '',
        },
        background: {
          origin: '',
          occupation: '',
          education: '',
          family: '',
          significant_events: [],
          current_situation: '',
        },
        relationships: [],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCharacter,
      });

      const { result } = renderHook(() => useCharacterPersistence());

      let loadedCharacter: Character | null = null;
      await act(async () => {
        loadedCharacter = await result.current.loadCharacter('test-uuid');
      });

      expect(loadedCharacter).toEqual(mockCharacter);
      expect(fetch).toHaveBeenCalledWith('/api/characters/test-uuid');
    });

    it('falls back to localStorage when API fails', async () => {
      const mockCharacter: Character = {
        character_id: 'test-uuid',
        name: 'Test Hero',
        creation_method: 'wizard',
        creation_timestamp: new Date().toISOString(),
        version: '1.0',
        role: {
          archetype: 'Protagonist',
          narrative_function: 'Hero',
          character_arc: 'Growth',
        },
        visual_identity: {
          age_range: 'adult',
          hair_color: 'brown',
          hair_style: 'short',
          hair_length: 'short',
          eye_color: 'blue',
          eye_shape: 'round',
          skin_tone: 'fair',
          facial_structure: 'oval',
          distinctive_features: [],
          height: 'average',
          build: 'athletic',
          posture: 'upright',
          clothing_style: 'casual',
          color_palette: [],
        },
        personality: {
          traits: [],
          values: [],
          fears: [],
          desires: [],
          flaws: [],
          strengths: [],
          temperament: '',
          communication_style: '',
        },
        background: {
          origin: '',
          occupation: '',
          education: '',
          family: '',
          significant_events: [],
          current_situation: '',
        },
        relationships: [],
      };

      localStorage.setItem('character-test-uuid', JSON.stringify(mockCharacter));

      (global.fetch as any).mockRejectedValueOnce(new Error('API Error'));

      const { result } = renderHook(() => useCharacterPersistence());

      let loadedCharacter: Character | null = null;
      await act(async () => {
        loadedCharacter = await result.current.loadCharacter('test-uuid');
      });

      expect(loadedCharacter).toEqual(mockCharacter);
    });
  });

  describe('removeCharacter', () => {
    it('deletes a character from API and store', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
      });

      const { result } = renderHook(() => useCharacterPersistence());

      await act(async () => {
        await result.current.removeCharacter('test-uuid');
      });

      expect(fetch).toHaveBeenCalledWith(
        '/api/characters/test-uuid',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('removes from localStorage when API fails', async () => {
      localStorage.setItem('character-test-uuid', JSON.stringify({ id: 'test-uuid' }));

      (global.fetch as any).mockRejectedValueOnce(new Error('API Error'));

      const { result } = renderHook(() => useCharacterPersistence());

      await act(async () => {
        await result.current.removeCharacter('test-uuid');
      });

      expect(localStorage.getItem('character-test-uuid')).toBeNull();
    });
  });
});
