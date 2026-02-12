/**
 * Event Emitter Service for Wizard Completions and Character Operations
 * 
 * This service provides a centralized event system for wizard completions,
 * character operations, and other application events. Components can subscribe
 * to events and receive notifications when entities are created or updated.
 * 
 * Requirements: 7.5, 5.4, 12.1, 12.2, 12.3, 12.4, 12.5
 */

import type { World } from '@/types/world';
import type { Character } from '@/types/character';

// ============================================================================
// Event Types
// ============================================================================

/**
 * Event types for wizard completions and entity operations
 */
export const WizardEventType = {
  // World events
  WORLD_CREATED: 'world:created',
  WORLD_UPDATED: 'world:updated',
  WORLD_DELETED: 'world:deleted',
  WORLD_SELECTED: 'world:selected',
  
  // Character events
  CHARACTER_CREATED: 'character:created',
  CHARACTER_UPDATED: 'character:updated',
  CHARACTER_DELETED: 'character:deleted',
  
  // Settings events
  LLM_SETTINGS_UPDATED: 'settings:llm:updated',
  COMFYUI_SETTINGS_UPDATED: 'settings:comfyui:updated',
  
  // Wizard lifecycle events
  WIZARD_STARTED: 'wizard:started',
  WIZARD_STEP_CHANGED: 'wizard:step:changed',
  WIZARD_COMPLETED: 'wizard:completed',
  WIZARD_CANCELLED: 'wizard:cancelled',
} as const;

// ============================================================================
// Event Payload Interfaces
// ============================================================================

/**
 * Base event payload structure
 */
export interface BaseEventPayload {
  timestamp: Date;
  source: string; // Component or service that emitted the event
}

/**
 * World creation event payload
 */
export interface WorldCreatedPayload extends BaseEventPayload {
  world: World;
  projectName?: string;
}

/**
 * World update event payload
 */
export interface WorldUpdatedPayload extends BaseEventPayload {
  worldId: string;
  updates: Partial<World>;
  previousWorld?: World;
}

/**
 * World deletion event payload
 */
export interface WorldDeletedPayload extends BaseEventPayload {
  worldId: string;
  worldName: string;
}

/**
 * World selection event payload
 */
export interface WorldSelectedPayload extends BaseEventPayload {
  worldId: string | null;
  world: World | null;
}

/**
 * Character creation event payload
 */
export interface CharacterCreatedPayload extends BaseEventPayload {
  character: Character;
  projectName?: string;
}

/**
 * Character update event payload
 */
export interface CharacterUpdatedPayload extends BaseEventPayload {
  characterId: string;
  updates: Partial<Character>;
  previousCharacter?: Character;
}

/**
 * Character deletion event payload
 */
export interface CharacterDeletedPayload extends BaseEventPayload {
  characterId: string;
  characterName: string;
}

/**
 * LLM settings update event payload
 */
export interface LLMSettingsUpdatedPayload extends BaseEventPayload {
  provider: string;
  model: string;
  previousProvider?: string;
  previousModel?: string;
}

/**
 * ComfyUI settings update event payload
 */
export interface ComfyUISettingsUpdatedPayload extends BaseEventPayload {
  serverUrl: string;
  connected: boolean;
  previousServerUrl?: string;
}

/**
 * Wizard started event payload
 */
export interface WizardStartedPayload extends BaseEventPayload {
  wizardType: 'world' | 'character' | 'llm-settings' | 'comfyui-settings';
  // Using 'any' for initialData to support different wizard initialization data structures
  initialData?: unknown;
}

/**
 * Wizard step changed event payload
 */
export interface WizardStepChangedPayload extends BaseEventPayload {
  wizardType: string;
  currentStep: number;
  totalSteps: number;
  previousStep: number;
}

/**
 * Wizard completed event payload
 */
export interface WizardCompletedPayload extends BaseEventPayload {
  wizardType: string;
  // Using 'any' for wizard completion data to support different wizard result types
  data: unknown;
  duration: number; // milliseconds
}

/**
 * Wizard cancelled event payload
 */
export interface WizardCancelledPayload extends BaseEventPayload {
  wizardType: string;
  currentStep: number;
  reason?: string;
}

/**
 * Union type of all event payloads
 */
export type EventPayload =
  | WorldCreatedPayload
  | WorldUpdatedPayload
  | WorldDeletedPayload
  | WorldSelectedPayload
  | CharacterCreatedPayload
  | CharacterUpdatedPayload
  | CharacterDeletedPayload
  | LLMSettingsUpdatedPayload
  | ComfyUISettingsUpdatedPayload
  | WizardStartedPayload
  | WizardStepChangedPayload
  | WizardCompletedPayload
  | WizardCancelledPayload;

// ============================================================================
// Event Listener Types
// ============================================================================

/**
 * Event listener callback function
 */
export type EventListener<T extends EventPayload = EventPayload> = (payload: T) => void;

/**
 * Event subscription handle for unsubscribing
 */
export interface EventSubscription {
  unsubscribe: () => void;
}

// ============================================================================
// Event Emitter Class
// ============================================================================

/**
 * Event emitter for wizard completions and entity operations
 * 
 * This class implements a simple pub/sub pattern for application events.
 * Components can subscribe to specific event types and receive notifications
 * when those events occur.
 * 
 * @example
 * ```typescript
 * // Subscribe to world creation events
 * const subscription = eventEmitter.on(
 *   WizardEventType.WORLD_CREATED,
 *   (payload) => {
 *   }
 * );
 * 
 * // Emit a world creation event
 * eventEmitter.emit(WizardEventType.WORLD_CREATED, {
 *   world: newWorld,
 *   timestamp: new Date(),
 *   source: 'WorldWizard',
 * });
 * 
 * // Unsubscribe when done
 * subscription.unsubscribe();
 * ```
 */
class EventEmitter {
  private listeners: Map<string, Set<EventListener>>;
  private eventHistory: Array<{ type: string; payload: EventPayload }>;
  private maxHistorySize: number;

  constructor(maxHistorySize: number = 100) {
    this.listeners = new Map();
    this.eventHistory = [];
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Subscribe to an event type
   * 
   * @param eventType - The type of event to listen for
   * @param listener - Callback function to invoke when event occurs
   * @returns Subscription handle for unsubscribing
   */
  on<T extends EventPayload>(
    eventType: string,
    listener: EventListener<T>
  ): EventSubscription {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    const listeners = this.listeners.get(eventType)!;
    listeners.add(listener as EventListener);

    return {
      unsubscribe: () => {
        listeners.delete(listener as EventListener);
        if (listeners.size === 0) {
          this.listeners.delete(eventType);
        }
      },
    };
  }

  /**
   * Subscribe to an event type for a single occurrence
   * 
   * @param eventType - The type of event to listen for
   * @param listener - Callback function to invoke when event occurs
   * @returns Subscription handle for unsubscribing
   */
  once<T extends EventPayload>(
    eventType: string,
    listener: EventListener<T>
  ): EventSubscription {
    const wrappedListener: EventListener<T> = (payload) => {
      listener(payload);
      subscription.unsubscribe();
    };

    const subscription = this.on(eventType, wrappedListener);
    return subscription;
  }

  /**
   * Emit an event to all subscribers
   * 
   * @param eventType - The type of event to emit
   * @param payload - Event payload data
   */
  emit<T extends EventPayload>(eventType: string, payload: T): void {
    // Add to event history
    this.eventHistory.push({ type: eventType, payload });
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Notify all listeners
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(payload);
        } catch (error) {
          console.error(`Error in event listener for ${eventType}:`, error);
        }
      });
    }

    // Log event in development
    if (import.meta.env.DEV) {
    }
  }

  /**
   * Remove all listeners for a specific event type
   * 
   * @param eventType - The type of event to clear listeners for
   */
  off(eventType: string): void {
    this.listeners.delete(eventType);
  }

  /**
   * Remove all listeners for all event types
   */
  offAll(): void {
    this.listeners.clear();
  }

  /**
   * Get the number of listeners for a specific event type
   * 
   * @param eventType - The type of event to count listeners for
   * @returns Number of listeners
   */
  listenerCount(eventType: string): number {
    const listeners = this.listeners.get(eventType);
    return listeners ? listeners.size : 0;
  }

  /**
   * Get all event types that have listeners
   * 
   * @returns Array of event types
   */
  eventTypes(): string[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * Get event history
   * 
   * @param eventType - Optional filter by event type
   * @param limit - Maximum number of events to return
   * @returns Array of historical events
   */
  getHistory(eventType?: string, limit?: number): Array<{ type: string; payload: EventPayload }> {
    let history = this.eventHistory;

    if (eventType) {
      history = history.filter((event) => event.type === eventType);
    }

    if (limit) {
      history = history.slice(-limit);
    }

    return history;
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Global event emitter instance
 * 
 * This singleton instance is used throughout the application for
 * emitting and subscribing to events.
 */
export const eventEmitter = new EventEmitter();

// ============================================================================
// Convenience Hooks for React Components
// ============================================================================

/**
 * React hook for subscribing to events
 * 
 * @example
 * ```typescript
 * useEventListener(WizardEventType.WORLD_CREATED, (payload) => {
 * });
 * ```
 */
export function useEventListener<T extends EventPayload>(
  eventType: string,
  listener: EventListener<T>,
  deps: React.DependencyList = []
): void {
  React.useEffect(() => {
    const subscription = eventEmitter.on(eventType, listener);
    return () => subscription.unsubscribe();
  }, [eventType, ...deps]);
}

// Import React for the hook
import React from 'react';

// ============================================================================
// Re-export Character Event System
// ============================================================================

/**
 * Re-export character event types and payloads for convenience
 * This allows consumers to import everything from a single module
 */
export {
  CharacterEventType,
  type CharacterEventPayload,
  type CharacterCreatedEventPayload,
  type CharacterUpdatedEventPayload,
  type CharacterDeletedEventPayload,
  type CharacterSelectedEventPayload,
  type RelationshipAddedEventPayload,
  type RelationshipUpdatedEventPayload,
  type RelationshipRemovedEventPayload,
  type CharacterValidationFailedEventPayload,
  type CharacterValidationPassedEventPayload,
  type CharacterExportedEventPayload,
  type CharacterImportedEventPayload,
  type CharacterImportFailedEventPayload,
  type CharacterDependenciesCheckedEventPayload,
  type CharacterDeletionBlockedEventPayload,
  isCharacterEvent,
  isCharacterCreatedEvent,
  isCharacterUpdatedEvent,
  isCharacterDeletedEvent,
  createCharacterCreatedPayload,
  createCharacterUpdatedPayload,
  createCharacterDeletedPayload,
  createCharacterSelectedPayload,
  createRelationshipAddedPayload,
  createValidationFailedPayload,
  createDependenciesCheckedPayload,
} from './characterEvents';


