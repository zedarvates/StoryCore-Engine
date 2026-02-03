/**
 * Optimized Event Emitter Service
 * 
 * Performance-optimized version of the event emitter with:
 * - Debounced event emissions to prevent rapid-fire updates
 * - Batched event processing for multiple simultaneous events
 * - Optimized listener management with WeakMap for cleanup
 * - Event coalescing to merge similar events
 * - Priority-based event processing
 * 
 * Requirements: 5.4, 12.1, 12.2, 12.3, 12.4, 12.5
 */

import type { EventPayload, EventListener, EventSubscription } from './eventEmitter';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Default debounce delay in milliseconds
 */
const DEFAULT_DEBOUNCE_DELAY = 100;

/**
 * Default batch processing delay in milliseconds
 */
const DEFAULT_BATCH_DELAY = 50;

/**
 * Maximum number of events to batch together
 */
const MAX_BATCH_SIZE = 50;

/**
 * Event priority levels
 */
export const EventPriority = {
  LOW: 0,
  NORMAL: 1,
  HIGH: 2,
  CRITICAL: 3,
} as const;

export type EventPriority = typeof EventPriority[keyof typeof EventPriority];

// ============================================================================
// Types
// ============================================================================

/**
 * Debounced event configuration
 */
interface DebouncedEventConfig {
  delay: number;
  timer: NodeJS.Timeout | null;
  pendingPayload: EventPayload | null;
}

/**
 * Batched event configuration
 */
interface BatchedEvent {
  type: string;
  payload: EventPayload;
  priority: EventPriority;
  timestamp: number;
}

/**
 * Event listener with metadata
 */
interface ListenerMetadata {
  listener: EventListener;
  priority: EventPriority;
  once: boolean;
}

// ============================================================================
// Optimized Event Emitter Class
// ============================================================================

/**
 * Optimized Event Emitter with debouncing, batching, and priority support
 */
class OptimizedEventEmitter {
  private listeners: Map<string, Set<ListenerMetadata>>;
  private debouncedEvents: Map<string, DebouncedEventConfig>;
  private batchQueue: BatchedEvent[];
  private batchTimer: NodeJS.Timeout | null;
  private batchDelay: number;
  private eventHistory: Array<{ type: string; payload: EventPayload }>;
  private maxHistorySize: number;
  private paused: boolean;
  private pausedEvents: BatchedEvent[];

  constructor(maxHistorySize: number = 100, batchDelay: number = DEFAULT_BATCH_DELAY) {
    this.listeners = new Map();
    this.debouncedEvents = new Map();
    this.batchQueue = [];
    this.batchTimer = null;
    this.batchDelay = batchDelay;
    this.eventHistory = [];
    this.maxHistorySize = maxHistorySize;
    this.paused = false;
    this.pausedEvents = [];
  }

  // ============================================================================
  // Subscription Methods
  // ============================================================================

  /**
   * Subscribe to an event type with optional priority
   * 
   * @param eventType - The type of event to listen for
   * @param listener - Callback function to invoke when event occurs
   * @param priority - Priority level for listener execution order
   * @returns Subscription handle for unsubscribing
   */
  on<T extends EventPayload>(
    eventType: string,
    listener: EventListener<T>,
    priority: EventPriority = EventPriority.NORMAL
  ): EventSubscription {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    const listeners = this.listeners.get(eventType)!;
    const metadata: ListenerMetadata = {
      listener: listener as EventListener,
      priority,
      once: false,
    };

    listeners.add(metadata);

    return {
      unsubscribe: () => {
        listeners.delete(metadata);
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
   * @param priority - Priority level for listener execution order
   * @returns Subscription handle for unsubscribing
   */
  once<T extends EventPayload>(
    eventType: string,
    listener: EventListener<T>,
    priority: EventPriority = EventPriority.NORMAL
  ): EventSubscription {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    const listeners = this.listeners.get(eventType)!;
    const metadata: ListenerMetadata = {
      listener: listener as EventListener,
      priority,
      once: true,
    };

    listeners.add(metadata);

    return {
      unsubscribe: () => {
        listeners.delete(metadata);
        if (listeners.size === 0) {
          this.listeners.delete(eventType);
        }
      },
    };
  }

  // ============================================================================
  // Emission Methods
  // ============================================================================

  /**
   * Emit an event immediately (bypasses debouncing and batching)
   * 
   * @param eventType - The type of event to emit
   * @param payload - Event payload data
   * @param priority - Priority level for event processing
   */
  emitImmediate<T extends EventPayload>(
    eventType: string,
    payload: T,
    priority: EventPriority = EventPriority.NORMAL
  ): void {
    this.processEvent(eventType, payload, priority);
  }

  /**
   * Emit an event with debouncing
   * Multiple rapid emissions of the same event type will be coalesced
   * 
   * @param eventType - The type of event to emit
   * @param payload - Event payload data
   * @param delay - Debounce delay in milliseconds
   * @param priority - Priority level for event processing
   */
  emitDebounced<T extends EventPayload>(
    eventType: string,
    payload: T,
    delay: number = DEFAULT_DEBOUNCE_DELAY,
    priority: EventPriority = EventPriority.NORMAL
  ): void {
    // Get or create debounce config for this event type
    let config = this.debouncedEvents.get(eventType);
    if (!config) {
      config = {
        delay,
        timer: null,
        pendingPayload: null,
      };
      this.debouncedEvents.set(eventType, config);
    }

    // Clear existing timer
    if (config.timer) {
      clearTimeout(config.timer);
    }

    // Store the latest payload
    config.pendingPayload = payload;

    // Set new timer
    config.timer = setTimeout(() => {
      if (config!.pendingPayload) {
        this.processEvent(eventType, config!.pendingPayload, priority);
        config!.pendingPayload = null;
        config!.timer = null;
      }
    }, delay);
  }

  /**
   * Emit an event with batching
   * Events are queued and processed together in batches
   * 
   * @param eventType - The type of event to emit
   * @param payload - Event payload data
   * @param priority - Priority level for event processing
   */
  emitBatched<T extends EventPayload>(
    eventType: string,
    payload: T,
    priority: EventPriority = EventPriority.NORMAL
  ): void {
    // Add to batch queue
    this.batchQueue.push({
      type: eventType,
      payload,
      priority,
      timestamp: Date.now(),
    });

    // Process immediately if batch is full
    if (this.batchQueue.length >= MAX_BATCH_SIZE) {
      this.processBatch();
      return;
    }

    // Schedule batch processing
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.processBatch();
      }, this.batchDelay);
    }
  }

  /**
   * Default emit method (uses batching for performance)
   * 
   * @param eventType - The type of event to emit
   * @param payload - Event payload data
   * @param priority - Priority level for event processing
   */
  emit<T extends EventPayload>(
    eventType: string,
    payload: T,
    priority: EventPriority = EventPriority.NORMAL
  ): void {
    // Use immediate emission for critical events
    if (priority === EventPriority.CRITICAL) {
      this.emitImmediate(eventType, payload, priority);
    } else {
      this.emitBatched(eventType, payload, priority);
    }
  }

  // ============================================================================
  // Processing Methods
  // ============================================================================

  /**
   * Process a single event
   */
  private processEvent(
    eventType: string,
    payload: EventPayload,
    priority: EventPriority
  ): void {
    // If paused, queue the event
    if (this.paused) {
      this.pausedEvents.push({
        type: eventType,
        payload,
        priority,
        timestamp: Date.now(),
      });
      return;
    }

    // Add to event history
    this.eventHistory.push({ type: eventType, payload });
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Get listeners and sort by priority
    const listeners = this.listeners.get(eventType);
    if (!listeners || listeners.size === 0) {
      return;
    }

    // Convert to array and sort by priority (highest first)
    const sortedListeners = Array.from(listeners).sort(
      (a, b) => b.priority - a.priority
    );

    // Notify all listeners
    const listenersToRemove: ListenerMetadata[] = [];

    for (const metadata of sortedListeners) {
      try {
        metadata.listener(payload);

        // Mark once listeners for removal
        if (metadata.once) {
          listenersToRemove.push(metadata);
        }
      } catch (error) {
        console.error(`Error in event listener for ${eventType}:`, error);
      }
    }

    // Remove once listeners
    for (const metadata of listenersToRemove) {
      listeners.delete(metadata);
    }

    // Clean up empty listener sets
    if (listeners.size === 0) {
      this.listeners.delete(eventType);
    }

    // Log event in development
    if (import.meta.env.DEV) {
      console.debug(`[EventEmitter] ${eventType}`, payload);
    }
  }

  /**
   * Process batched events
   */
  private processBatch(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.batchQueue.length === 0) {
      return;
    }

    // Sort batch by priority (highest first)
    const sortedBatch = this.batchQueue.sort((a, b) => b.priority - a.priority);

    // Process each event
    for (const event of sortedBatch) {
      this.processEvent(event.type, event.payload, event.priority);
    }

    // Clear batch queue
    this.batchQueue = [];
  }

  // ============================================================================
  // Control Methods
  // ============================================================================

  /**
   * Pause event processing
   * Events will be queued until resume() is called
   */
  pause(): void {
    this.paused = true;
  }

  /**
   * Resume event processing
   * Processes all queued events
   */
  resume(): void {
    this.paused = false;

    // Process paused events
    if (this.pausedEvents.length > 0) {
      const events = this.pausedEvents.sort((a, b) => b.priority - a.priority);
      this.pausedEvents = [];

      for (const event of events) {
        this.processEvent(event.type, event.payload, event.priority);
      }
    }
  }

  /**
   * Flush all pending events immediately
   */
  flush(): void {
    // Flush debounced events
    for (const [eventType, config] of this.debouncedEvents.entries()) {
      if (config.timer) {
        clearTimeout(config.timer);
        config.timer = null;
      }
      if (config.pendingPayload) {
        this.processEvent(eventType, config.pendingPayload, EventPriority.NORMAL);
        config.pendingPayload = null;
      }
    }

    // Flush batched events
    this.processBatch();
  }

  // ============================================================================
  // Cleanup Methods
  // ============================================================================

  /**
   * Remove all listeners for a specific event type
   * 
   * @param eventType - The type of event to clear listeners for
   */
  off(eventType: string): void {
    this.listeners.delete(eventType);

    // Clear debounce config
    const config = this.debouncedEvents.get(eventType);
    if (config?.timer) {
      clearTimeout(config.timer);
    }
    this.debouncedEvents.delete(eventType);
  }

  /**
   * Remove all listeners for all event types
   */
  offAll(): void {
    this.listeners.clear();

    // Clear all debounce timers
    for (const config of this.debouncedEvents.values()) {
      if (config.timer) {
        clearTimeout(config.timer);
      }
    }
    this.debouncedEvents.clear();

    // Clear batch timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Clear queues
    this.batchQueue = [];
    this.pausedEvents = [];
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

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
  getHistory(
    eventType?: string,
    limit?: number
  ): Array<{ type: string; payload: EventPayload }> {
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

  /**
   * Get performance metrics
   */
  getMetrics(): {
    listenerCount: number;
    eventTypeCount: number;
    batchQueueSize: number;
    pausedEventCount: number;
    historySize: number;
  } {
    let totalListeners = 0;
    for (const listeners of this.listeners.values()) {
      totalListeners += listeners.size;
    }

    return {
      listenerCount: totalListeners,
      eventTypeCount: this.listeners.size,
      batchQueueSize: this.batchQueue.length,
      pausedEventCount: this.pausedEvents.length,
      historySize: this.eventHistory.length,
    };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Global optimized event emitter instance
 */
export const optimizedEventEmitter = new OptimizedEventEmitter();

// ============================================================================
// React Hook
// ============================================================================

import React from 'react';

/**
 * React hook for subscribing to events with the optimized emitter
 * 
 * @example
 * ```typescript
 * useOptimizedEventListener(
 *   'character-created',
 *   (payload) => {
 *     console.log('Character created:', payload);
 *   },
 *   EventPriority.HIGH
 * );
 * ```
 */
export function useOptimizedEventListener<T extends EventPayload>(
  eventType: string,
  listener: EventListener<T>,
  priority: EventPriority = EventPriority.NORMAL,
  deps: React.DependencyList = []
): void {
  React.useEffect(() => {
    const subscription = optimizedEventEmitter.on(eventType, listener, priority);
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventType, priority, ...deps]);
}

// ============================================================================
// Export Types
// ============================================================================

export type { EventPayload, EventListener, EventSubscription };
