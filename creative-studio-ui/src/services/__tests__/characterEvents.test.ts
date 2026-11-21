/**
 * Character Event System Tests
 * 
 * Tests for character event types, payloads, and helper functions
 * 
 * Requirements: 5.4, 12.1, 12.2, 12.3, 12.4, 12.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CharacterEventType,
  createCharacterCreatedPayload,
  createCharacterUpdatedPayload,
  createCharacterDeletedPayload,
  createCharacterSelectedPayload,
  createRelationshipAddedPayload,
  createValidationFailedPayload,
  createDependenciesCheckedPayload,
  isCharacterEvent,
  isCharacterCreatedEvent,
  isCharacterUpdatedEvent,
  isCharacterDeletedEvent,
  type CharacterCreatedEventPayload,
  type CharacterUpdatedEventPayload,
  type CharacterDeletedEventPayload,
  type CharacterSelectedEventPayload,
  type RelationshipAddedEventPayload,
  type CharacterValidationFailedEventPayload,
  type CharacterDependenciesCheckedEventPayload,
} from '../characterEvents';
import { eventEmitter } from '../eventEmitter';
import type { Character, CharacterRelationship } from '@/types/character';

// ============================================================================
// Test Fixtures
// ============================================================================

const mockCharacter: Character = {
  character_id: 'char-123',
  name: 'Test Character',
  creation_method: 'wizard',
  creation_timestamp: '2024-01-01T00:00:00Z',
  version: '1.0',
  visual_identity: {
    age_range: '25-35',
    gender: 'male',
    ethnicity: 'diverse',
    distinctive_features: ['tall', 'blue eyes'],
    style_aesthetic: 'modern',
    color_palette: ['blue', 'gray'],
    visual_references: [],
  },
  personality: {
    traits: ['brave', 'intelligent'],
    values: ['justice', 'loyalty'],
    fears: ['failure'],
    desires: ['success'],
    quirks: ['always early'],
    speech_patterns: 'formal',
    emotional_range: 'balanced',
  },
  background: {
    origin_story: 'Born in a small town',
    key_experiences: ['graduated college'],
    relationships: [],
    current_situation: 'working professional',
    secrets: [],
  },
  relationships: [],
  role: {
    archetype: 'hero',
    narrative_function: 'protagonist',
    character_arc: 'growth',
    symbolic_meaning: 'hope',
  },
};

const mockRelationship: CharacterRelationship = {
  character_id: 'char-456',
  character_name: 'Related Character',
  relationship_type: 'friend',
  description: 'Close friends since childhood',
  dynamic: 'supportive',
};

// ============================================================================
// Event Type Tests
// ============================================================================

describe('CharacterEventType', () => {
  it('should define all required character event types', () => {
    expect(CharacterEventType.CHARACTER_CREATED).toBe('character:created');
    expect(CharacterEventType.CHARACTER_UPDATED).toBe('character:updated');
    expect(CharacterEventType.CHARACTER_DELETED).toBe('character:deleted');
    expect(CharacterEventType.CHARACTER_SELECTED).toBe('character:selected');
    expect(CharacterEventType.RELATIONSHIP_ADDED).toBe('character:relationship:added');
    expect(CharacterEventType.RELATIONSHIP_UPDATED).toBe('character:relationship:updated');
    expect(CharacterEventType.RELATIONSHIP_REMOVED).toBe('character:relationship:removed');
    expect(CharacterEventType.CHARACTER_VALIDATION_FAILED).toBe('character:validation:failed');
    expect(CharacterEventType.CHARACTER_VALIDATION_PASSED).toBe('character:validation:passed');
    expect(CharacterEventType.CHARACTER_EXPORTED).toBe('character:exported');
    expect(CharacterEventType.CHARACTER_IMPORTED).toBe('character:imported');
    expect(CharacterEventType.CHARACTER_IMPORT_FAILED).toBe('character:import:failed');
    expect(CharacterEventType.CHARACTER_DEPENDENCIES_CHECKED).toBe('character:dependencies:checked');
    expect(CharacterEventType.CHARACTER_DELETION_BLOCKED).toBe('character:deletion:blocked');
  });

  it('should have unique event type values', () => {
    const eventTypes = Object.values(CharacterEventType);
    const uniqueTypes = new Set(eventTypes);
    expect(uniqueTypes.size).toBe(eventTypes.length);
  });
});

// ============================================================================
// Type Guard Tests
// ============================================================================

describe('Type Guards', () => {
  it('should identify character events correctly', () => {
    expect(isCharacterEvent(CharacterEventType.CHARACTER_CREATED)).toBe(true);
    expect(isCharacterEvent(CharacterEventType.CHARACTER_UPDATED)).toBe(true);
    expect(isCharacterEvent(CharacterEventType.CHARACTER_DELETED)).toBe(true);
    expect(isCharacterEvent('world:created')).toBe(false);
    expect(isCharacterEvent('unknown:event')).toBe(false);
  });

  it('should identify character created events', () => {
    const payload = createCharacterCreatedPayload(mockCharacter, 'wizard');
    expect(isCharacterCreatedEvent(payload)).toBe(true);
    expect(isCharacterCreatedEvent({ characterId: 'test' })).toBe(false);
    expect(isCharacterCreatedEvent(null)).toBe(false);
  });

  it('should identify character updated events', () => {
    const payload = createCharacterUpdatedPayload('char-123', { name: 'New Name' }, 'editor');
    expect(isCharacterUpdatedEvent(payload)).toBe(true);
    expect(isCharacterUpdatedEvent({ character: mockCharacter })).toBe(false);
    expect(isCharacterUpdatedEvent(null)).toBe(false);
  });

  it('should identify character deleted events', () => {
    const payload = createCharacterDeletedPayload('char-123', 'Test Character');
    expect(isCharacterDeletedEvent(payload)).toBe(true);
    expect(isCharacterDeletedEvent({ characterId: 'test' })).toBe(false);
    expect(isCharacterDeletedEvent(null)).toBe(false);
  });
});

// ============================================================================
// Payload Creation Tests
// ============================================================================

describe('createCharacterCreatedPayload', () => {
  it('should create valid character created payload', () => {
    const payload = createCharacterCreatedPayload(mockCharacter, 'wizard', 'test-project');

    expect(payload.character).toBe(mockCharacter);
    expect(payload.source).toBe('wizard');
    expect(payload.projectName).toBe('test-project');
    expect(payload.timestamp).toBeInstanceOf(Date);
  });

  it('should work without optional projectName', () => {
    const payload = createCharacterCreatedPayload(mockCharacter, 'editor');

    expect(payload.character).toBe(mockCharacter);
    expect(payload.source).toBe('editor');
    expect(payload.projectName).toBeUndefined();
    expect(payload.timestamp).toBeInstanceOf(Date);
  });

  it('should support all source types', () => {
    const sources: Array<CharacterCreatedEventPayload['source']> = ['wizard', 'editor', 'import', 'api'];
    
    sources.forEach(source => {
      const payload = createCharacterCreatedPayload(mockCharacter, source);
      expect(payload.source).toBe(source);
    });
  });
});

describe('createCharacterUpdatedPayload', () => {
  it('should create valid character updated payload', () => {
    const updates = { name: 'Updated Name' };
    const payload = createCharacterUpdatedPayload('char-123', updates, 'editor', mockCharacter);

    expect(payload.characterId).toBe('char-123');
    expect(payload.updates).toBe(updates);
    expect(payload.source).toBe('editor');
    expect(payload.previousCharacter).toBe(mockCharacter);
    expect(payload.timestamp).toBeInstanceOf(Date);
  });

  it('should work without optional previousCharacter', () => {
    const updates = { name: 'Updated Name' };
    const payload = createCharacterUpdatedPayload('char-123', updates, 'relationship-sync');

    expect(payload.characterId).toBe('char-123');
    expect(payload.updates).toBe(updates);
    expect(payload.source).toBe('relationship-sync');
    expect(payload.previousCharacter).toBeUndefined();
  });

  it('should support all source types', () => {
    const sources: Array<CharacterUpdatedEventPayload['source']> = ['editor', 'relationship-sync', 'import', 'api'];
    
    sources.forEach(source => {
      const payload = createCharacterUpdatedPayload('char-123', {}, source);
      expect(payload.source).toBe(source);
    });
  });
});

describe('createCharacterDeletedPayload', () => {
  it('should create valid character deleted payload', () => {
    const dependencies = {
      stories: [{ id: 'story-1', name: 'Test Story' }],
      relationships: [{ characterId: 'char-456', characterName: 'Related Character' }],
    };
    const payload = createCharacterDeletedPayload('char-123', 'Test Character', dependencies, true);

    expect(payload.characterId).toBe('char-123');
    expect(payload.characterName).toBe('Test Character');
    expect(payload.dependencies).toBe(dependencies);
    expect(payload.forced).toBe(true);
    expect(payload.timestamp).toBeInstanceOf(Date);
    expect(payload.source).toBe('character-manager');
  });

  it('should work without optional parameters', () => {
    const payload = createCharacterDeletedPayload('char-123', 'Test Character');

    expect(payload.characterId).toBe('char-123');
    expect(payload.characterName).toBe('Test Character');
    expect(payload.dependencies).toBeUndefined();
    expect(payload.forced).toBeUndefined();
  });
});

describe('createCharacterSelectedPayload', () => {
  it('should create valid character selected payload', () => {
    const selectedIds = ['char-123', 'char-456'];
    const payload = createCharacterSelectedPayload(mockCharacter, 'story-generator', true, selectedIds);

    expect(payload.characterId).toBe(mockCharacter.character_id);
    expect(payload.character).toBe(mockCharacter);
    expect(payload.context).toBe('story-generator');
    expect(payload.multiSelect).toBe(true);
    expect(payload.selectedIds).toBe(selectedIds);
    expect(payload.timestamp).toBeInstanceOf(Date);
    expect(payload.source).toBe('character-story-generator');
  });

  it('should work without optional parameters', () => {
    const payload = createCharacterSelectedPayload(mockCharacter, 'editor');

    expect(payload.characterId).toBe(mockCharacter.character_id);
    expect(payload.character).toBe(mockCharacter);
    expect(payload.context).toBe('editor');
    expect(payload.multiSelect).toBeUndefined();
    expect(payload.selectedIds).toBeUndefined();
  });

  it('should support all context types', () => {
    const contexts: Array<CharacterSelectedEventPayload['context']> = ['story-generator', 'editor', 'list', 'dashboard'];
    
    contexts.forEach(context => {
      const payload = createCharacterSelectedPayload(mockCharacter, context);
      expect(payload.context).toBe(context);
      expect(payload.source).toBe(`character-${context}`);
    });
  });
});

describe('createRelationshipAddedPayload', () => {
  it('should create valid relationship added payload', () => {
    const inverseRelationship: CharacterRelationship = {
      ...mockRelationship,
      character_id: 'char-123',
      character_name: 'Test Character',
    };
    const payload = createRelationshipAddedPayload('char-123', 'char-456', mockRelationship, inverseRelationship);

    expect(payload.fromCharacterId).toBe('char-123');
    expect(payload.toCharacterId).toBe('char-456');
    expect(payload.relationship).toBe(mockRelationship);
    expect(payload.inverseRelationship).toBe(inverseRelationship);
    expect(payload.bidirectional).toBe(true);
    expect(payload.timestamp).toBeInstanceOf(Date);
    expect(payload.source).toBe('relationship-manager');
  });
});

describe('createValidationFailedPayload', () => {
  it('should create valid validation failed payload', () => {
    const errors = {
      name: ['Name is required'],
      archetype: ['Archetype must be selected'],
    };
    const payload = createValidationFailedPayload(mockCharacter, errors, 'create', 'char-123');

    expect(payload.characterId).toBe('char-123');
    expect(payload.characterData).toBe(mockCharacter);
    expect(payload.errors).toBe(errors);
    expect(payload.context).toBe('create');
    expect(payload.timestamp).toBeInstanceOf(Date);
    expect(payload.source).toBe('character-validator');
  });

  it('should work without optional characterId', () => {
    const errors = { name: ['Name is required'] };
    const payload = createValidationFailedPayload({}, errors, 'import');

    expect(payload.characterId).toBeUndefined();
    expect(payload.errors).toBe(errors);
    expect(payload.context).toBe('import');
  });

  it('should support all context types', () => {
    const contexts: Array<CharacterValidationFailedEventPayload['context']> = ['create', 'update', 'import'];
    
    contexts.forEach(context => {
      const payload = createValidationFailedPayload({}, {}, context);
      expect(payload.context).toBe(context);
    });
  });
});

describe('createDependenciesCheckedPayload', () => {
  it('should create valid dependencies checked payload with dependencies', () => {
    const dependencies = {
      stories: [{ id: 'story-1', name: 'Test Story' }],
      relationships: [{ characterId: 'char-456', characterName: 'Related Character' }],
    };
    const payload = createDependenciesCheckedPayload('char-123', 'Test Character', dependencies);

    expect(payload.characterId).toBe('char-123');
    expect(payload.characterName).toBe('Test Character');
    expect(payload.dependencies).toBe(dependencies);
    expect(payload.hasDependencies).toBe(true);
    expect(payload.timestamp).toBeInstanceOf(Date);
    expect(payload.source).toBe('dependency-checker');
  });

  it('should correctly identify no dependencies', () => {
    const dependencies = {
      stories: [],
      relationships: [],
    };
    const payload = createDependenciesCheckedPayload('char-123', 'Test Character', dependencies);

    expect(payload.hasDependencies).toBe(false);
  });

  it('should identify dependencies from stories only', () => {
    const dependencies = {
      stories: [{ id: 'story-1', name: 'Test Story' }],
      relationships: [],
    };
    const payload = createDependenciesCheckedPayload('char-123', 'Test Character', dependencies);

    expect(payload.hasDependencies).toBe(true);
  });

  it('should identify dependencies from relationships only', () => {
    const dependencies = {
      stories: [],
      relationships: [{ characterId: 'char-456', characterName: 'Related Character' }],
    };
    const payload = createDependenciesCheckedPayload('char-123', 'Test Character', dependencies);

    expect(payload.hasDependencies).toBe(true);
  });
});

// ============================================================================
// Event Emitter Integration Tests
// ============================================================================

describe('Event Emitter Integration', () => {
  beforeEach(() => {
    // Clear all listeners before each test
    eventEmitter.offAll();
  });

  it('should emit and receive character created events', () => {
    const listener = vi.fn();
    const subscription = eventEmitter.on(CharacterEventType.CHARACTER_CREATED, listener);

    const payload = createCharacterCreatedPayload(mockCharacter, 'wizard');
    eventEmitter.emit(CharacterEventType.CHARACTER_CREATED, payload);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(payload);

    subscription.unsubscribe();
  });

  it('should emit and receive character updated events', () => {
    const listener = vi.fn();
    const subscription = eventEmitter.on(CharacterEventType.CHARACTER_UPDATED, listener);

    const payload = createCharacterUpdatedPayload('char-123', { name: 'New Name' }, 'editor');
    eventEmitter.emit(CharacterEventType.CHARACTER_UPDATED, payload);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(payload);

    subscription.unsubscribe();
  });

  it('should emit and receive character deleted events', () => {
    const listener = vi.fn();
    const subscription = eventEmitter.on(CharacterEventType.CHARACTER_DELETED, listener);

    const payload = createCharacterDeletedPayload('char-123', 'Test Character');
    eventEmitter.emit(CharacterEventType.CHARACTER_DELETED, payload);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(payload);

    subscription.unsubscribe();
  });

  it('should support multiple listeners for the same event', () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    const subscription1 = eventEmitter.on(CharacterEventType.CHARACTER_CREATED, listener1);
    const subscription2 = eventEmitter.on(CharacterEventType.CHARACTER_CREATED, listener2);

    const payload = createCharacterCreatedPayload(mockCharacter, 'wizard');
    eventEmitter.emit(CharacterEventType.CHARACTER_CREATED, payload);

    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);

    subscription1.unsubscribe();
    subscription2.unsubscribe();
  });

  it('should not receive events after unsubscribing', () => {
    const listener = vi.fn();
    const subscription = eventEmitter.on(CharacterEventType.CHARACTER_CREATED, listener);

    const payload = createCharacterCreatedPayload(mockCharacter, 'wizard');
    eventEmitter.emit(CharacterEventType.CHARACTER_CREATED, payload);

    expect(listener).toHaveBeenCalledTimes(1);

    subscription.unsubscribe();

    eventEmitter.emit(CharacterEventType.CHARACTER_CREATED, payload);

    expect(listener).toHaveBeenCalledTimes(1); // Still 1, not 2
  });

  it('should handle relationship events', () => {
    const listener = vi.fn();
    const subscription = eventEmitter.on(CharacterEventType.RELATIONSHIP_ADDED, listener);

    const inverseRelationship: CharacterRelationship = {
      ...mockRelationship,
      character_id: 'char-123',
      character_name: 'Test Character',
    };
    const payload = createRelationshipAddedPayload('char-123', 'char-456', mockRelationship, inverseRelationship);
    eventEmitter.emit(CharacterEventType.RELATIONSHIP_ADDED, payload);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(payload);

    subscription.unsubscribe();
  });

  it('should handle validation events', () => {
    const listener = vi.fn();
    const subscription = eventEmitter.on(CharacterEventType.CHARACTER_VALIDATION_FAILED, listener);

    const errors = { name: ['Name is required'] };
    const payload = createValidationFailedPayload(mockCharacter, errors, 'create');
    eventEmitter.emit(CharacterEventType.CHARACTER_VALIDATION_FAILED, payload);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(payload);

    subscription.unsubscribe();
  });

  it('should handle dependency check events', () => {
    const listener = vi.fn();
    const subscription = eventEmitter.on(CharacterEventType.CHARACTER_DEPENDENCIES_CHECKED, listener);

    const dependencies = {
      stories: [{ id: 'story-1', name: 'Test Story' }],
      relationships: [],
    };
    const payload = createDependenciesCheckedPayload('char-123', 'Test Character', dependencies);
    eventEmitter.emit(CharacterEventType.CHARACTER_DEPENDENCIES_CHECKED, payload);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(payload);

    subscription.unsubscribe();
  });
});

// ============================================================================
// Event History Tests
// ============================================================================

describe('Event History', () => {
  beforeEach(() => {
    eventEmitter.offAll();
    eventEmitter.clearHistory();
  });

  it('should record character events in history', () => {
    const payload = createCharacterCreatedPayload(mockCharacter, 'wizard');
    eventEmitter.emit(CharacterEventType.CHARACTER_CREATED, payload);

    const history = eventEmitter.getHistory(CharacterEventType.CHARACTER_CREATED);
    expect(history).toHaveLength(1);
    expect(history[0].type).toBe(CharacterEventType.CHARACTER_CREATED);
    expect(history[0].payload).toBe(payload);
  });

  it('should filter history by event type', () => {
    const createdPayload = createCharacterCreatedPayload(mockCharacter, 'wizard');
    const updatedPayload = createCharacterUpdatedPayload('char-123', { name: 'New Name' }, 'editor');

    eventEmitter.emit(CharacterEventType.CHARACTER_CREATED, createdPayload);
    eventEmitter.emit(CharacterEventType.CHARACTER_UPDATED, updatedPayload);

    const createdHistory = eventEmitter.getHistory(CharacterEventType.CHARACTER_CREATED);
    expect(createdHistory).toHaveLength(1);
    expect(createdHistory[0].type).toBe(CharacterEventType.CHARACTER_CREATED);

    const updatedHistory = eventEmitter.getHistory(CharacterEventType.CHARACTER_UPDATED);
    expect(updatedHistory).toHaveLength(1);
    expect(updatedHistory[0].type).toBe(CharacterEventType.CHARACTER_UPDATED);
  });
});
