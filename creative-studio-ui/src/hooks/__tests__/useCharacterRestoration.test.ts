// ============================================================================
// Character Restoration Hook Tests
// ============================================================================
// Tests for character restoration on app load
// Requirements: 8.4
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCharacterRestoration } from '../useCharacterRestoration';
import type { Character } from '@/types/character';

// Mock the useCharacterPersistence hook
const mockLoadAllCharacters = vi.fn();

vi.mock('../useCharacterPersistence', () => ({
  useCharacterPersistence: () => ({
    loadAllCharacters: mockLoadAllCharacters,
  }),
}));

describe('useCharacterRestoration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads characters from localStorage on mount', async () => {
    const mockCharacters: Character[] = [
      {
        character_id: 'char-1',
        name: 'Test Character 1',
        creation_method: 'wizard',
        creation_timestamp: new Date().toISOString(),
        version: '1.0',
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
          traits: ['brave'],
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
        role: {
          archetype: 'Protagonist',
          narrative_function: 'Hero',
          character_arc: 'Growth',
        },
      },
      {
        character_id: 'char-2',
        name: 'Test Character 2',
        creation_method: 'manual',
        creation_timestamp: new Date().toISOString(),
        version: '1.0',
        visual_identity: {
          age_range: 'young adult',
          hair_color: 'black',
          hair_style: 'long',
          hair_length: 'long',
          eye_color: 'green',
          eye_shape: 'almond',
          skin_tone: 'tan',
          facial_structure: 'angular',
          distinctive_features: [],
          height: 'tall',
          build: 'slim',
          posture: 'relaxed',
          clothing_style: 'elegant',
          color_palette: [],
        },
        personality: {
          traits: ['clever'],
          values: ['freedom'],
          fears: ['confinement'],
          desires: ['adventure'],
          flaws: ['reckless'],
          strengths: ['intelligence'],
          temperament: 'energetic',
          communication_style: 'witty',
        },
        background: {
          origin: 'Village',
          occupation: 'Scholar',
          education: 'University',
          family: 'Large',
          significant_events: [],
          current_situation: 'Traveling',
        },
        relationships: [],
        role: {
          archetype: 'Mentor',
          narrative_function: 'Guide',
          character_arc: 'Flat',
        },
      },
    ];

    mockLoadAllCharacters.mockResolvedValue(mockCharacters);

    renderHook(() => useCharacterRestoration());

    // Wait for the async restoration to complete
    await waitFor(() => {
      expect(mockLoadAllCharacters).toHaveBeenCalledTimes(1);
    });
  });

  it('handles empty character list gracefully', async () => {
    mockLoadAllCharacters.mockResolvedValue([]);

    renderHook(() => useCharacterRestoration());

    await waitFor(() => {
      expect(mockLoadAllCharacters).toHaveBeenCalledTimes(1);
    });
  });

  it('handles restoration errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    mockLoadAllCharacters.mockRejectedValue(new Error('Failed to load characters'));

    renderHook(() => useCharacterRestoration());

    await waitFor(() => {
      expect(mockLoadAllCharacters).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to restore characters:',
        expect.any(Error)
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it('only restores characters once on mount', async () => {
    mockLoadAllCharacters.mockResolvedValue([]);

    const { rerender } = renderHook(() => useCharacterRestoration());

    await waitFor(() => {
      expect(mockLoadAllCharacters).toHaveBeenCalledTimes(1);
    });

    // Rerender the hook
    rerender();

    // Should still only be called once
    expect(mockLoadAllCharacters).toHaveBeenCalledTimes(1);
  });
});
