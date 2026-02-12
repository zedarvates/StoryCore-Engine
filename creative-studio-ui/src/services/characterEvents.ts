/**
 * Character Event System
 * 
 * This module extends the event emitter with character-specific event types
 * and payload definitions for the Character Integration System.
 * 
 * Requirements: 5.4, 12.1, 12.2, 12.3, 12.4, 12.5
 */

import type { Character, CharacterRelationship } from '@/types/character';
import type { BaseEventPayload } from './eventEmitter';

// ============================================================================
// Character Event Types
// ============================================================================

/**
 * Character-specific event types for the Character Integration System
 */
export const CharacterEventType = {
  // Character CRUD events
  CHARACTER_CREATED: 'character:created',
  CHARACTER_UPDATED: 'character:updated',
  CHARACTER_DELETED: 'character:deleted',
  CHARACTER_SELECTED: 'character:selected',
  
  // Relationship events
  RELATIONSHIP_ADDED: 'character:relationship:added',
  RELATIONSHIP_UPDATED: 'character:relationship:updated',
  RELATIONSHIP_REMOVED: 'character:relationship:removed',
  
  // Validation events
  CHARACTER_VALIDATION_FAILED: 'character:validation:failed',
  CHARACTER_VALIDATION_PASSED: 'character:validation:passed',
  
  // Import/Export events
  CHARACTER_EXPORTED: 'character:exported',
  CHARACTER_IMPORTED: 'character:imported',
  CHARACTER_IMPORT_FAILED: 'character:import:failed',
  
  // Dependency events
  CHARACTER_DEPENDENCIES_CHECKED: 'character:dependencies:checked',
  CHARACTER_DELETION_BLOCKED: 'character:deletion:blocked',
} as const;

// ============================================================================
// Character Event Payload Interfaces
// ============================================================================

/**
 * Character creation event payload
 * Emitted when a new character is created through any means
 * 
 * Requirements: 3.4, 12.1
 */
export interface CharacterCreatedEventPayload extends BaseEventPayload {
  character: Character;
  source: 'wizard' | 'editor' | 'import' | 'api';
  projectName?: string;
}

/**
 * Character update event payload
 * Emitted when a character is modified
 * 
 * Requirements: 5.2, 12.2
 */
export interface CharacterUpdatedEventPayload extends BaseEventPayload {
  characterId: string;
  updates: Partial<Character>;
  previousCharacter?: Character;
  source: 'editor' | 'relationship-sync' | 'import' | 'api';
  changeType?: 'field-update' | 'relationship-sync' | 'bulk-update';
}

/**
 * Character deletion event payload
 * Emitted when a character is deleted
 * 
 * Requirements: 5.3, 12.3
 */
export interface CharacterDeletedEventPayload extends BaseEventPayload {
  characterId: string;
  characterName: string;
  dependencies?: {
    stories: Array<{ id: string; name: string }>;
    relationships: Array<{ characterId: string; characterName: string }>;
  };
  forced?: boolean; // Whether deletion was forced despite dependencies
}

/**
 * Character selection event payload
 * Emitted when a character is selected in the UI
 * 
 * Requirements: 4.2, 12.4
 */
export interface CharacterSelectedEventPayload extends BaseEventPayload {
  characterId: string;
  character: Character;
  context: 'story-generator' | 'editor' | 'list' | 'dashboard';
  multiSelect?: boolean;
  selectedIds?: string[]; // All currently selected character IDs
}

/**
 * Relationship added event payload
 * Emitted when a relationship is added between characters
 * 
 * Requirements: 6.1, 12.2
 */
export interface RelationshipAddedEventPayload extends BaseEventPayload {
  fromCharacterId: string;
  toCharacterId: string;
  relationship: CharacterRelationship;
  inverseRelationship: CharacterRelationship;
  bidirectional: boolean;
}

/**
 * Relationship updated event payload
 * Emitted when a relationship is modified
 * 
 * Requirements: 6.2, 12.2
 */
export interface RelationshipUpdatedEventPayload extends BaseEventPayload {
  fromCharacterId: string;
  toCharacterId: string;
  updates: Partial<CharacterRelationship>;
  previousRelationship: CharacterRelationship;
  bidirectional: boolean;
}

/**
 * Relationship removed event payload
 * Emitted when a relationship is deleted
 * 
 * Requirements: 6.3, 12.2
 */
export interface RelationshipRemovedEventPayload extends BaseEventPayload {
  fromCharacterId: string;
  toCharacterId: string;
  relationship: CharacterRelationship;
  bidirectional: boolean;
}

/**
 * Character validation failed event payload
 * Emitted when character validation fails
 * 
 * Requirements: 2.3, 2.4, 11.5
 */
export interface CharacterValidationFailedEventPayload extends BaseEventPayload {
  characterId?: string;
  characterData: Partial<Character>;
  errors: Record<string, string[]>;
  context: 'create' | 'update' | 'import';
}

/**
 * Character validation passed event payload
 * Emitted when character validation succeeds
 * 
 * Requirements: 2.3
 */
export interface CharacterValidationPassedEventPayload extends BaseEventPayload {
  characterId?: string;
  characterData: Partial<Character>;
  context: 'create' | 'update' | 'import';
}

/**
 * Character exported event payload
 * Emitted when a character is exported to JSON
 * 
 * Requirements: 10.2
 */
export interface CharacterExportedEventPayload extends BaseEventPayload {
  characterId: string;
  characterName: string;
  format: 'json';
  destination?: string; // File path or download
}

/**
 * Character imported event payload
 * Emitted when a character is successfully imported
 * 
 * Requirements: 10.4
 */
export interface CharacterImportedEventPayload extends BaseEventPayload {
  character: Character;
  sourceFile?: string;
  conflictResolution?: 'rename' | 'replace' | 'skip';
}

/**
 * Character import failed event payload
 * Emitted when character import fails
 * 
 * Requirements: 10.4, 10.5
 */
export interface CharacterImportFailedEventPayload extends BaseEventPayload {
  sourceFile?: string;
  error: string;
  validationErrors?: Record<string, string[]>;
  reason: 'invalid-json' | 'schema-mismatch' | 'duplicate-id' | 'validation-failed';
}

/**
 * Character dependencies checked event payload
 * Emitted when dependencies are checked for a character
 * 
 * Requirements: 7.1
 */
export interface CharacterDependenciesCheckedEventPayload extends BaseEventPayload {
  characterId: string;
  characterName: string;
  dependencies: {
    stories: Array<{ id: string; name: string }>;
    relationships: Array<{ characterId: string; characterName: string }>;
  };
  hasDependencies: boolean;
}

/**
 * Character deletion blocked event payload
 * Emitted when character deletion is blocked due to dependencies
 * 
 * Requirements: 7.2
 */
export interface CharacterDeletionBlockedEventPayload extends BaseEventPayload {
  characterId: string;
  characterName: string;
  dependencies: {
    stories: Array<{ id: string; name: string }>;
    relationships: Array<{ characterId: string; characterName: string }>;
  };
  userAction?: 'cancelled' | 'pending';
}

/**
 * Union type of all character event payloads
 */
export type CharacterEventPayload =
  | CharacterCreatedEventPayload
  | CharacterUpdatedEventPayload
  | CharacterDeletedEventPayload
  | CharacterSelectedEventPayload
  | RelationshipAddedEventPayload
  | RelationshipUpdatedEventPayload
  | RelationshipRemovedEventPayload
  | CharacterValidationFailedEventPayload
  | CharacterValidationPassedEventPayload
  | CharacterExportedEventPayload
  | CharacterImportedEventPayload
  | CharacterImportFailedEventPayload
  | CharacterDependenciesCheckedEventPayload
  | CharacterDeletionBlockedEventPayload;

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if an event is a character event
 */
export function isCharacterEvent(eventType: string): boolean {
  return Object.values(CharacterEventType).includes(eventType as any);
}

/**
 * Type guard for character created event
 */
export function isCharacterCreatedEvent(
  payload: unknown
): payload is CharacterCreatedEventPayload {
  return !!payload && 'character' in payload && 'source' in payload;
}

/**
 * Type guard for character updated event
 */
export function isCharacterUpdatedEvent(
  payload: unknown
): payload is CharacterUpdatedEventPayload {
  return !!payload && 'characterId' in payload && 'updates' in payload;
}

/**
 * Type guard for character deleted event
 */
export function isCharacterDeletedEvent(
  payload: unknown
): payload is CharacterDeletedEventPayload {
  return !!payload && 'characterId' in payload && 'characterName' in payload;
}

// ============================================================================
// Event Helper Functions
// ============================================================================

/**
 * Create a character created event payload
 * 
 * @param character - The created character
 * @param source - The source of the creation
 * @param projectName - Optional project name
 * @returns Character created event payload
 */
export function createCharacterCreatedPayload(
  character: Character,
  source: CharacterCreatedEventPayload['source'],
  projectName?: string
): CharacterCreatedEventPayload {
  return {
    character,
    source,
    projectName,
    timestamp: new Date(),
  };
}

/**
 * Create a character updated event payload
 * 
 * @param characterId - The ID of the updated character
 * @param updates - The updates applied
 * @param source - The source of the update
 * @param previousCharacter - Optional previous character state
 * @returns Character updated event payload
 */
export function createCharacterUpdatedPayload(
  characterId: string,
  updates: Partial<Character>,
  source: CharacterUpdatedEventPayload['source'],
  previousCharacter?: Character
): CharacterUpdatedEventPayload {
  return {
    characterId,
    updates,
    previousCharacter,
    source,
    timestamp: new Date(),
  };
}

/**
 * Create a character deleted event payload
 * 
 * @param characterId - The ID of the deleted character
 * @param characterName - The name of the deleted character
 * @param dependencies - Optional dependencies information
 * @param forced - Whether deletion was forced
 * @returns Character deleted event payload
 */
export function createCharacterDeletedPayload(
  characterId: string,
  characterName: string,
  dependencies?: CharacterDeletedEventPayload['dependencies'],
  forced?: boolean
): CharacterDeletedEventPayload {
  return {
    characterId,
    characterName,
    dependencies,
    forced,
    timestamp: new Date(),
    source: 'character-manager',
  };
}

/**
 * Create a character selected event payload
 * 
 * @param character - The selected character
 * @param context - The context of the selection
 * @param multiSelect - Whether this is part of multi-select
 * @param selectedIds - All currently selected character IDs
 * @returns Character selected event payload
 */
export function createCharacterSelectedPayload(
  character: Character,
  context: CharacterSelectedEventPayload['context'],
  multiSelect?: boolean,
  selectedIds?: string[]
): CharacterSelectedEventPayload {
  return {
    characterId: character.character_id,
    character,
    context,
    multiSelect,
    selectedIds,
    timestamp: new Date(),
    source: `character-${context}`,
  };
}

/**
 * Create a relationship added event payload
 * 
 * @param fromCharacterId - The source character ID
 * @param toCharacterId - The target character ID
 * @param relationship - The relationship data
 * @param inverseRelationship - The inverse relationship data
 * @returns Relationship added event payload
 */
export function createRelationshipAddedPayload(
  fromCharacterId: string,
  toCharacterId: string,
  relationship: CharacterRelationship,
  inverseRelationship: CharacterRelationship
): RelationshipAddedEventPayload {
  return {
    fromCharacterId,
    toCharacterId,
    relationship,
    inverseRelationship,
    bidirectional: true,
    timestamp: new Date(),
    source: 'relationship-manager',
  };
}

/**
 * Create a validation failed event payload
 * 
 * @param characterData - The character data that failed validation
 * @param errors - The validation errors
 * @param context - The context of the validation
 * @param characterId - Optional character ID
 * @returns Validation failed event payload
 */
export function createValidationFailedPayload(
  characterData: Partial<Character>,
  errors: Record<string, string[]>,
  context: CharacterValidationFailedEventPayload['context'],
  characterId?: string
): CharacterValidationFailedEventPayload {
  return {
    characterId,
    characterData,
    errors,
    context,
    timestamp: new Date(),
    source: 'character-validator',
  };
}

/**
 * Create a dependencies checked event payload
 * 
 * @param characterId - The character ID
 * @param characterName - The character name
 * @param dependencies - The dependencies found
 * @returns Dependencies checked event payload
 */
export function createDependenciesCheckedPayload(
  characterId: string,
  characterName: string,
  dependencies: CharacterDependenciesCheckedEventPayload['dependencies']
): CharacterDependenciesCheckedEventPayload {
  return {
    characterId,
    characterName,
    dependencies,
    hasDependencies: dependencies.stories.length > 0 || dependencies.relationships.length > 0,
    timestamp: new Date(),
    source: 'dependency-checker',
  };
}

