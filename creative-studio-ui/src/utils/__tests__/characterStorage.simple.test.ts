// ============================================================================
// Character Storage Utilities - Simple Tests
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  mapWizardDataToCharacter,
  validateCharacter,
  getCharacterFilename,
  getCharacterFilePath,
  formatCharacterForExport,
  parseCharacterFromJSON,
  getCharacterSummary,
  filterCharactersForSelection,
  sortCharactersByName,
  sortCharactersByDate,
  groupCharactersByArchetype,
} from '../characterStorage';
import type { Character } from '@/types/character';

describe('characterStorage - mapWizardDataToCharacter', () => {
  it('maps wizard data to complete character object', () => {
    const wizardData: Partial<Character> = {
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
    };

    const character = mapWizardDataToCharacter(wizardData);

    expect(character.name).toBe('Test Hero');
    expect(character.creation_method).toBe('wizard');
    expect(character.character_id).toBeDefined();
    expect(character.version).toBe('1.0');
    expect(character.role.archetype).toBe('Protagonist');
  });

  it('generates UUID when not provided', () => {
    const wizardData: Partial<Character> = {
      name: 'Test',
    };

    const character = mapWizardDataToCharacter(wizardData);

    expect(character.character_id).toBeDefined();
    expect(character.character_id.length).toBeGreaterThan(0);
  });

  it('fills in empty fields with defaults', () => {
    const wizardData: Partial<Character> = {
      name: 'Test',
    };

    const character = mapWizardDataToCharacter(wizardData);

    expect(character.personality.traits).toEqual([]);
    expect(character.background.origin).toBe('');
    expect(character.relationships).toEqual([]);
  });
});

describe('characterStorage - validateCharacter', () => {
  it('validates required fields', () => {
    const character: Partial<Character> = {
      name: 'Test Hero',
      role: {
        archetype: 'Protagonist',
        narrative_function: 'Hero',
        character_arc: 'Growth',
      },
      visual_identity: {
        age_range: 'adult',
        hair_color: '',
        hair_style: '',
        hair_length: '',
        eye_color: '',
        eye_shape: '',
        skin_tone: '',
        facial_structure: '',
        distinctive_features: [],
        height: '',
        build: '',
        posture: '',
        clothing_style: '',
        color_palette: [],
      },
    };

    const result = validateCharacter(character);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('returns errors for missing required fields', () => {
    const character: Partial<Character> = {
      name: '',
    };

    const result = validateCharacter(character);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Character name is required');
    expect(result.errors).toContain('Character archetype is required');
    expect(result.errors).toContain('Age range is required');
  });

  it('validates relationships', () => {
    const character: Partial<Character> = {
      name: 'Test',
      role: {
        archetype: 'Protagonist',
        narrative_function: '',
        character_arc: '',
      },
      visual_identity: {
        age_range: 'adult',
        hair_color: '',
        hair_style: '',
        hair_length: '',
        eye_color: '',
        eye_shape: '',
        skin_tone: '',
        facial_structure: '',
        distinctive_features: [],
        height: '',
        build: '',
        posture: '',
        clothing_style: '',
        color_palette: [],
      },
      relationships: [
        {
          character_id: '',
          character_name: 'Friend',
          relationship_type: '',
          description: '',
          dynamic: '',
        },
      ],
    };

    const result = validateCharacter(character);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Character ID is required'))).toBe(true);
    expect(result.errors.some((e) => e.includes('Relationship type is required'))).toBe(true);
  });
});

describe('characterStorage - file operations', () => {
  it('generates correct filename', () => {
    const filename = getCharacterFilename('test-uuid-123');
    expect(filename).toBe('test-uuid-123.json');
  });

  it('generates correct file path', () => {
    const path = getCharacterFilePath('test-uuid-123');
    expect(path).toBe('characters/test-uuid-123.json');
  });

  it('formats character for JSON export', () => {
    const character: Character = {
      character_id: 'test-uuid',
      name: 'Test',
      creation_method: 'wizard',
      creation_timestamp: '2024-01-01T00:00:00Z',
      version: '1.0',
      role: {
        archetype: 'Protagonist',
        narrative_function: '',
        character_arc: '',
      },
      visual_identity: {
        age_range: 'adult',
        hair_color: '',
        hair_style: '',
        hair_length: '',
        eye_color: '',
        eye_shape: '',
        skin_tone: '',
        facial_structure: '',
        distinctive_features: [],
        height: '',
        build: '',
        posture: '',
        clothing_style: '',
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

    const json = formatCharacterForExport(character);

    expect(json).toContain('"character_id": "test-uuid"');
    expect(json).toContain('"name": "Test"');
    expect(JSON.parse(json)).toEqual(character);
  });

  it('parses character from JSON', () => {
    const json = JSON.stringify({
      character_id: 'test-uuid',
      name: 'Test',
      creation_method: 'wizard',
      creation_timestamp: '2024-01-01T00:00:00Z',
      version: '1.0',
      role: { archetype: 'Protagonist', narrative_function: '', character_arc: '' },
      visual_identity: {
        age_range: 'adult',
        hair_color: '',
        hair_style: '',
        hair_length: '',
        eye_color: '',
        eye_shape: '',
        skin_tone: '',
        facial_structure: '',
        distinctive_features: [],
        height: '',
        build: '',
        posture: '',
        clothing_style: '',
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
    });

    const character = parseCharacterFromJSON(json);

    expect(character.character_id).toBe('test-uuid');
    expect(character.name).toBe('Test');
  });

  it('throws error for invalid JSON', () => {
    expect(() => parseCharacterFromJSON('invalid json')).toThrow();
  });

  it('throws error for missing required fields in JSON', () => {
    const json = JSON.stringify({ name: 'Test' });
    expect(() => parseCharacterFromJSON(json)).toThrow('missing required fields');
  });
});

describe('characterStorage - character summary', () => {
  it('creates summary with all fields', () => {
    const character: Character = {
      character_id: 'test-uuid',
      name: 'Test Hero',
      creation_method: 'wizard',
      creation_timestamp: '2024-01-01T00:00:00Z',
      version: '1.0',
      role: {
        archetype: 'Protagonist',
        narrative_function: '',
        character_arc: '',
      },
      visual_identity: {
        age_range: 'adult',
        hair_color: '',
        hair_style: '',
        hair_length: '',
        eye_color: '',
        eye_shape: '',
        skin_tone: '',
        facial_structure: '',
        distinctive_features: [],
        height: '',
        build: '',
        posture: '',
        clothing_style: '',
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

    const summary = getCharacterSummary(character);

    expect(summary).toBe('Test Hero • Protagonist • adult');
  });

  it('creates summary with missing fields', () => {
    const character: Character = {
      character_id: 'test-uuid',
      name: 'Test Hero',
      creation_method: 'wizard',
      creation_timestamp: '2024-01-01T00:00:00Z',
      version: '1.0',
      role: {
        archetype: '',
        narrative_function: '',
        character_arc: '',
      },
      visual_identity: {
        age_range: '',
        hair_color: '',
        hair_style: '',
        hair_length: '',
        eye_color: '',
        eye_shape: '',
        skin_tone: '',
        facial_structure: '',
        distinctive_features: [],
        height: '',
        build: '',
        posture: '',
        clothing_style: '',
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

    const summary = getCharacterSummary(character);

    expect(summary).toBe('Test Hero');
  });
});

describe('characterStorage - filtering and sorting', () => {
  const characters: Character[] = [
    {
      character_id: 'uuid-1',
      name: 'Charlie',
      creation_method: 'wizard',
      creation_timestamp: '2024-01-03T00:00:00Z',
      version: '1.0',
      role: { archetype: 'Protagonist', narrative_function: '', character_arc: '' },
      visual_identity: {
        age_range: 'adult',
        hair_color: '',
        hair_style: '',
        hair_length: '',
        eye_color: '',
        eye_shape: '',
        skin_tone: '',
        facial_structure: '',
        distinctive_features: [],
        height: '',
        build: '',
        posture: '',
        clothing_style: '',
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
    },
    {
      character_id: 'uuid-2',
      name: 'Alice',
      creation_method: 'wizard',
      creation_timestamp: '2024-01-01T00:00:00Z',
      version: '1.0',
      role: { archetype: 'Antagonist', narrative_function: '', character_arc: '' },
      visual_identity: {
        age_range: 'adult',
        hair_color: '',
        hair_style: '',
        hair_length: '',
        eye_color: '',
        eye_shape: '',
        skin_tone: '',
        facial_structure: '',
        distinctive_features: [],
        height: '',
        build: '',
        posture: '',
        clothing_style: '',
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
    },
    {
      character_id: 'uuid-3',
      name: 'Bob',
      creation_method: 'wizard',
      creation_timestamp: '2024-01-02T00:00:00Z',
      version: '1.0',
      role: { archetype: 'Protagonist', narrative_function: '', character_arc: '' },
      visual_identity: {
        age_range: 'adult',
        hair_color: '',
        hair_style: '',
        hair_length: '',
        eye_color: '',
        eye_shape: '',
        skin_tone: '',
        facial_structure: '',
        distinctive_features: [],
        height: '',
        build: '',
        posture: '',
        clothing_style: '',
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
    },
  ];

  it('filters characters excluding specific ID', () => {
    const filtered = filterCharactersForSelection(characters, 'uuid-2');

    expect(filtered).toHaveLength(2);
    expect(filtered.find((c) => c.character_id === 'uuid-2')).toBeUndefined();
  });

  it('sorts characters by name', () => {
    const sorted = sortCharactersByName(characters);

    expect(sorted[0].name).toBe('Alice');
    expect(sorted[1].name).toBe('Bob');
    expect(sorted[2].name).toBe('Charlie');
  });

  it('sorts characters by date (newest first)', () => {
    const sorted = sortCharactersByDate(characters);

    expect(sorted[0].name).toBe('Charlie'); // 2024-01-03
    expect(sorted[1].name).toBe('Bob'); // 2024-01-02
    expect(sorted[2].name).toBe('Alice'); // 2024-01-01
  });

  it('groups characters by archetype', () => {
    const grouped = groupCharactersByArchetype(characters);

    expect(grouped['Protagonist']).toHaveLength(2);
    expect(grouped['Antagonist']).toHaveLength(1);
    expect(grouped['Protagonist'][0].name).toBe('Charlie');
  });
});
