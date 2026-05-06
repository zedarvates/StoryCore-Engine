/**
 * Cross-Tab Store Synchronization
 * 
 * Requirements: 127
 * State Management Level: 🔵 MOYENNE
 * 
 * Synchronizes Zustand store state across browser tabs using BroadcastChannel
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from './useAppStoreOptimized';

const CHANNEL_NAME = 'storycore-store-sync';

/**
 * Creates a BroadcastChannel for cross-tab communication
 */
export const createBroadcastChannel = () => {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
    return null;
  }
  
  return new BroadcastChannel(CHANNEL_NAME);
};

/**
 * Hook to enable cross-tab store synchronization
 * 
 * Automatically syncs store state changes across all open tabs
 * of the same origin. Prevents infinite loops by tracking source tab.
 */
export const useCrossTabSync = () => {
  const channel = useRef<BroadcastChannel | null>(null);
  const store = useAppStore();
  
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    
    // Check for BroadcastChannel support
    if (!('BroadcastChannel' in window)) {
      console.warn('BroadcastChannel not supported in this browser');
      return;
    }
    
    channel.current = createBroadcastChannel();
    
    if (!channel.current) {
      return;
    }
    
    // Listen for messages from other tabs
    const handleMessage = (event: MessageEvent) => {
      const { type, payload } = event.data;
      
      if (type === 'STORE_UPDATE') {
        const { state, source, timestamp } = payload;
        const currentSessionId = store.getState().sessionId;
        
        // Prevent infinite loops by checking if update is from this tab
        if (source !== currentSessionId) {
          console.log('[CrossTab Sync] Received state update from tab:', source);
          store.setState(state, true);
        }
      }
      
      if (type === 'STORE_REHYDRATED') {
        // Notify other tabs that this tab has rehydrated
        broadcastState();
      }
    };
    
    channel.current.onmessage = handleMessage;
    
    // Broadcast initial state
    broadcastState();
    
    return () => {
      channel.current?.removeEventListener('message', handleMessage);
      channel.current?.close();
    };
  }, [store]);
  
  /**
   * Broadcast current state to other tabs
   */
  const broadcastState = useCallback(() => {
    if (!channel.current) {
      return;
    }
    
    const state = store.getState();
    
    try {
      channel.current.postMessage({
        type: 'STORE_UPDATE',
        payload: {
          state,
          source: state.sessionId,
          timestamp: Date.now(),
        },
      });
    } catch (error) {
      console.warn('[CrossTab Sync] Failed to broadcast state:', error);
    }
  }, [store]);
  
  /**
   * Subscribe to store changes and broadcast them
   */
  useEffect(() => {
    const unsubscribe = store.subscribe((state, prevState) => {
      // Only broadcast if state actually changed
      if (state !== prevState) {
        broadcastState();
      }
    });
    
    return unsubscribe;
  }, [store, broadcastState]);
  
  return { broadcastState };
};

/**
 * Broadcasts a specific state update to other tabs
 */
export const broadcastStateUpdate = (state: any) => {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
    return;
  }
  
  const channel = createBroadcastChannel();
  if (!channel) {
    return;
  }
  
  try {
    channel.postMessage({
      type: 'STORE_UPDATE',
      payload: {
        state,
        source: state.sessionId || 'unknown',
        timestamp: Date.now(),
      },
    });
  } finally {
    channel.close();
  }
};

/**
 * Notifies other tabs that store has been rehydrated
 */
export const notifyStoreRehydrated = () => {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
    return;
  }
  
  const channel = createBroadcastChannel();
  if (!channel) {
    return;
  }
  
  try {
    channel.postMessage({
      type: 'STORE_REHYDRATED',
      payload: {
        timestamp: Date.now(),
      },
    });
  } finally {
    channel.close();
  }
};

/**
 * Enhanced store with cross-tab sync capability
 */
export const useSyncedStore = () => {
  const store = useAppStore();
  const { broadcastState } = useCrossTabSync();
  
  // Enhanced actions that broadcast changes
  const syncedActions = {
    ...store,
    
    setProject: (project: any) => {
      store.setProject(project);
      broadcastState();
    },
    
    setShots: (shots: any[]) => {
      store.setShots(shots);
      broadcastState();
    },
    
    addShot: (shot: any) => {
      store.addShot(shot);
      broadcastState();
    },
    
    updateShot: (id: string, updates: any) => {
      store.updateShot(id, updates);
      broadcastState();
    },
    
    deleteShot: (id: string) => {
      store.deleteShot(id);
      broadcastState();
    },
    
    setCurrentShot: (shot: any) => {
      store.setCurrentShot(shot);
      broadcastState();
    },
    
    setSelectedShotId: (id: string | null) => {
      store.setSelectedShotId(id);
      broadcastState();
    },
  };
  
  return syncedActions;
};

export type CrossTabSync = ReturnType<typeof useCrossTabSync>;
