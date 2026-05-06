/**
 * Cross-Tab Synchronization Store
 * 
 * Requirements: 128-135
 * Level: 🟡 HAUTE
 * 
 * Synchronizes state across browser tabs using BroadcastChannel
 */

import { useEffect, useRef } from 'react';
import { useAppStore } from './useAppStore';

interface CrossTabMessage {
  type: string;
  payload: any;
  source: string;
  timestamp: number;
}

export class CrossTabSync {
  private channel: BroadcastChannel | null = null;
  private tabId: string;
  private messageHandlers: Map<string, Set<(payload: any) => void>> = new Map();
  private isInitialized: boolean = false;

  constructor(channelName: string = 'storycore-sync') {
    this.tabId = crypto.randomUUID();
    
    // Check for BroadcastChannel support
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(channelName);
      this.isInitialized = true;
    } else {
      console.warn('BroadcastChannel not supported, cross-tab sync disabled');
    }
  }

  /**
   * Initialize cross-tab synchronization
   */
  public initialize(): void {
    if (!this.isInitialized || !this.channel) return;

    this.channel.onmessage = (event: MessageEvent<CrossTabMessage>) => {
      const { type, payload, source, timestamp } = event.data;

      // Ignore messages from this tab
      if (source === this.tabId) return;

      // Ignore old messages (older than 5 seconds)
      if (Date.now() - timestamp > 5000) return;

      // Handle the message
      this.handleMessage(type, payload, source);
    };

    // Listen for storage events as fallback
    window.addEventListener('storage', this.handleStorageEvent);
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    
    window.removeEventListener('storage', this.handleStorageEvent);
    this.isInitialized = false;
  }

  /**
   * Broadcast a message to other tabs
   */
  public broadcast(type: string, payload: any): void {
    if (!this.isInitialized || !this.channel) return;

    const message: CrossTabMessage = {
      type,
      payload,
      source: this.tabId,
      timestamp: Date.now(),
    };

    try {
      this.channel.postMessage(message);
    } catch (error) {
      console.error('Failed to broadcast message:', error);
    }
  }

  /**
   * Subscribe to a message type
   */
  public subscribe(type: string, handler: (payload: any) => void): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }

    const handlers = this.messageHandlers.get(type)!;
    handlers.add(handler);

    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.messageHandlers.delete(type);
      }
    };
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(type: string, payload: any, source: string): void {
    const handlers = this.messageHandlers.get(type);
    
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`Error in cross-tab handler for ${type}:`, error);
        }
      });
    }

    // Handle built-in message types
    switch (type) {
      case 'state-update':
        this.handleStateUpdate(payload);
        break;
      case 'notification':
        this.handleNotification(payload);
        break;
      case 'project-created':
        this.handleProjectCreated(payload);
        break;
      case 'result-updated':
        this.handleResultUpdated(payload);
        break;
    }
  }

  /**
   * Handle state update from another tab
   */
  private handleStateUpdate(payload: any): void {
    const { state, partial } = payload;
    
    if (partial) {
      // Merge partial state
      useAppStore.setState((currentState) => ({
        ...currentState,
        ...state,
        // Don't overwrite local projects/results completely
        projects: new Map([
          ...currentState.projects,
          ...(state.projects ? new Map(Object.entries(state.projects)) : []),
        ]),
        results: new Map([
          ...currentState.results,
          ...(state.results ? new Map(Object.entries(state.results)) : []),
        ]),
      }), true); // Force update
    } else {
      // Replace state (but keep local UI state)
      const currentUIState = {
        isLoading: useAppStore.getState().isLoading,
        error: useAppStore.getState().error,
      };
      
      useAppStore.setState({
        ...state,
        ...currentUIState,
        projects: new Map(Object.entries(state.projects || {})),
        results: new Map(Object.entries(state.results || {})),
        selectedResultIds: new Set(state.selectedResultIds || []),
      }, true);
    }
  }

  /**
   * Handle notification from another tab
   */
  private handleNotification(payload: any): void {
    useAppStore.getState().addNotification({
      ...payload,
      title: `[Other Tab] ${payload.title}`,
    });
  }

  /**
   * Handle project creation from another tab
   */
  private handleProjectCreated(payload: any): void {
    const { project } = payload;
    useAppStore.getState().projects.set(project.id, project);
  }

  /**
   * Handle result update from another tab
   */
  private handleResultUpdated(payload: any): void {
    const { result } = payload;
    useAppStore.getState().results.set(result.taskId, result);
  }

  /**
   * Handle storage events (fallback for older browsers)
   */
  private handleStorageEvent = (event: StorageEvent): void => {
    if (!event.key || !event.newValue) return;

    try {
      const data = JSON.parse(event.newValue);
      
      if (data.type === 'cross-tab-sync' && data.source !== this.tabId) {
        this.handleMessage(data.messageType, data.payload, data.source);
      }
    } catch (error) {
      // Ignore parse errors
    }
  };

  /**
   * Send message via localStorage (fallback)
   */
  private sendViaLocalStorage(type: string, payload: any): void {
    const message = {
      type: 'cross-tab-sync',
      messageType: type,
      payload,
      source: this.tabId,
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem(
        `storycore-sync-${Date.now()}`,
        JSON.stringify(message)
      );
      // Clean up immediately
      localStorage.removeItem(`storycore-sync-${Date.now()}`);
    } catch (error) {
      console.error('Failed to send message via localStorage:', error);
    }
  }
}

/**
 * React hook for cross-tab synchronization
 */
export function useCrossTabSync(): {
  broadcast: (type: string, payload: any) => void;
  subscribe: (type: string, handler: (payload: any) => void) => () => void;
  syncState: () => void;
  isSupported: boolean;
} {
  const syncRef = useRef<CrossTabSync | null>(null);

  useEffect(() => {
    if (!syncRef.current) {
      syncRef.current = new CrossTabSync();
      syncRef.current.initialize();
    }

    return () => {
      if (syncRef.current) {
        syncRef.current.destroy();
        syncRef.current = null;
      }
    };
  }, []);

  // Auto-sync state changes
  useEffect(() => {
    if (!syncRef.current) return;

    const unsubscribe = useAppStore.subscribe(
      (state, prevState) => {
        // Don't sync if state hasn't changed meaningfully
        if (state === prevState) return;

        // Broadcast state changes
        syncRef.current!.broadcast('state-update', {
          state: {
            projects: Object.fromEntries(state.projects),
            results: Object.fromEntries(state.results),
            selectedResultIds: Array.from(state.selectedResultIds),
            currentProjectId: state.currentProjectId,
            settings: state.settings,
          },
          partial: true,
        });
      },
      {
        // Only sync specific parts to avoid excessive broadcasts
        fireImmediately: false,
      }
    );

    return unsubscribe;
  }, []);

  const broadcast = (type: string, payload: any): void => {
    syncRef.current?.broadcast(type, payload);
  };

  const subscribe = (type: string, handler: (payload: any) => void): (() => void) => {
    return syncRef.current?.subscribe(type, handler) || (() => {});
  };

  const syncState = (): void => {
    if (!syncRef.current) return;

    const state = useAppStore.getState();
    syncRef.current.broadcast('state-update', {
      state: {
        projects: Object.fromEntries(state.projects),
        results: Object.fromEntries(state.results),
        selectedResultIds: Array.from(state.selectedResultIds),
        currentProjectId: state.currentProjectId,
        settings: state.settings,
      },
      partial: false,
    });
  };

  return {
    broadcast,
    subscribe,
    syncState,
    isSupported: syncRef.current?.isInitialized || false,
  };
}

/**
 * Hook to prevent cross-tab update loops
 */
export function useCrossTabSession(): {
  sessionId: string;
  isLocalUpdate: (timestamp: number) => boolean;
} {
  const sessionId = useRef(crypto.randomUUID()).current;
  const lastUpdateTime = useRef<number>(0);

  const isLocalUpdate = (timestamp: number): boolean => {
    return Math.abs(timestamp - lastUpdateTime.current) < 100;
  };

  useEffect(() => {
    lastUpdateTime.current = Date.now();
  }, []);

  return {
    sessionId,
    isLocalUpdate,
  };
}
