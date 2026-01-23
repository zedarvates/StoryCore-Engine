// ============================================================================
// Character Casting System Types
// ============================================================================

import type { Character } from '@/types/character';

/**
 * Represents an avatar asset that can be assigned to a character
 */
export interface Avatar {
  /** Unique identifier for the avatar */
  id: string;
  /** Display name of the avatar */
  name: string;
  /** Relative path to the avatar file from the project assets folder */
  path: string;
  /** Image dimensions in pixels */
  dimensions: {
    width: number;
    height: number;
  };
  /** ISO timestamp when the avatar was created/imported */
  createdDate: string;
  /** Optional tags for filtering and organization */
  tags: string[];
  /** Image format */
  format: 'png' | 'jpg' | 'jpeg' | 'webp';
  /** File size in bytes */
  size: number;
}

/**
 * Represents an assignment of an avatar to a character
 */
export interface CastingAssignment {
  /** Character identifier */
  characterId: string;
  /** Avatar identifier */
  avatarId: string;
  /** ISO timestamp when the assignment was made */
  assignedAt: string;
}

/**
 * Represents a reference to a scene where a character appears
 */
export interface SceneReference {
  /** Scene identifier */
  sceneId: string;
  /** Character identifier */
  characterId: string;
  /** Optional scene title or description */
  sceneTitle?: string;
}

/**
 * Overall state of the casting system
 */
export interface CastingState {
  /** Current casting assignments */
  assignments: CastingAssignment[];
  /** Schema version for data persistence */
  version: string;
  /** Last modified timestamp */
  lastModified: string;
}

/**
 * Analytics data for casting insights
 */
export interface CastingAnalytics {
  /** Number of scenes each character appears in */
  characterSceneCounts: Record<string, number>;
  /** Most frequently used avatars */
  avatarUsageCounts: Record<string, number>;
  /** Characters that have not been cast */
  uncastCharacters: string[];
  /** Total unique actors used */
  uniqueActorCount: number;
}

/**
 * Validation result for avatar assets
 */
export interface AvatarValidationResult {
  /** Whether the avatar is valid */
  isValid: boolean;
  /** Error message if invalid */
  error?: string;
  /** Validation metadata */
  metadata?: {
    dimensions: { width: number; height: number };
    format: string;
    size: number;
  };
}

/**
 * Undo/Redo operation record
 */
export interface OperationRecord {
  /** Unique operation identifier */
  id: string;
  /** Type of operation */
  type: 'assign' | 'replace' | 'unassign';
  /** Timestamp of the operation */
  timestamp: string;
  /** Previous state (for undo) */
  previousState?: Partial<CastingState>;
  /** New state (for redo) */
  newState?: Partial<CastingState>;
  /** Description of the operation */
  description: string;
}
