// ============================================================================
// Character Casting System Add-on
// ============================================================================

// Core types
export type {
  Avatar,
  CastingAssignment,
  CastingState,
  CastingAnalytics,
  AvatarValidationResult,
  SceneReference,
  OperationRecord,
} from './types';

// Import types for internal use
import type { Avatar, CastingAssignment, CastingAnalytics } from './types';

// Import implementation
import { CastingManager as CastingManagerImpl } from './CastingManager';

// Plugin interface (to be implemented)
export interface CastingPlugin {
  name: string;
  version: string;
  description: string;

  // Lifecycle methods
  initialize(): Promise<void>;
  destroy(): Promise<void>;

  // Core functionality
  getCastingManager(): CastingManager;

  // Integration hooks
  onCharacterCreated(characterId: string): void;
  onCharacterUpdated(characterId: string): void;
  onCharacterDeleted(characterId: string): void;

  // API for story generation
  getActorForCharacter(characterId: string): Avatar | null;
  getActorsForCharacters(characterIds: string[]): Record<string, Avatar | null>;
}

// Placeholder for CastingManager (to be implemented)
export interface CastingManager {
  // Core methods (to be implemented)
  assignActor(characterId: string, avatarId: string): void;
  replaceActor(characterId: string, newAvatarId: string): void;
  unassignActor(characterId: string): void;
  getActorForCharacter(characterId: string): Avatar | null;
  getAssignments(): CastingAssignment[];
  getAnalytics(): CastingAnalytics;

  // Persistence
  serialize(): string;
  deserialize(data: string): void;

  // Undo/Redo
  undo(): boolean;
  redo(): boolean;
  canUndo(): boolean;
  canRedo(): boolean;
}

// Export the plugin instance
let castingManagerInstance: CastingManagerImpl | null = null;

export const castingPlugin: CastingPlugin = {
  name: 'Character Casting System',
  version: '1.0.0',
  description: 'Assign avatar assets to character roles for consistent visual representation',

  initialize: async () => {
    castingManagerInstance = new CastingManagerImpl();
    console.log('Character Casting System initialized');
  },

  destroy: async () => {
    castingManagerInstance = null;
    console.log('Character Casting System destroyed');
  },

  getCastingManager: () => {
    if (!castingManagerInstance) {
      throw new Error('CastingManager not initialized. Call initialize() first.');
    }
    return castingManagerInstance;
  },

  onCharacterCreated: (characterId: string) => {
    console.log(`Character created: ${characterId}`);
  },

  onCharacterUpdated: (characterId: string) => {
    console.log(`Character updated: ${characterId}`);
  },

  onCharacterDeleted: (characterId: string) => {
    console.log(`Character deleted: ${characterId}`);
  },

  getActorForCharacter: (characterId: string) => {
    console.log(`Getting actor for character: ${characterId}`);
    return null;
  },

  getActorsForCharacters: (characterIds: string[]) => {
    console.log(`Getting actors for characters: ${characterIds.join(', ')}`);
    return {};
  },
};

// Default export
export default castingPlugin;