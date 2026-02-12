/**
 * Parameter Tunneling Store
 * ME3: Parameter Tunneling - Runtime parameter adjustments
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  TunneledParameter,
  ParameterTunnel,
  RuntimeParameterState,
  ParameterTunnelConfig,
  ParameterUpdate,
} from '../types/parameter-tunneling';

interface ParameterTunnelingStore {
  // Parameters
  parameters: Map<string, TunneledParameter<unknown>>;
  
  // Tunnels
  tunnels: Map<string, ParameterTunnel>;
  activeTunnelIds: string[];
  
  // Runtime state
  runtimeState: RuntimeParameterState;
  
  // Configuration
  config: ParameterTunnelConfig;
  
  // UI state
  isPanelOpen: boolean;
  selectedParameterId: string | null;
  selectedTunnelId: string | null;
  
  // Actions
  registerParameter: <T>(parameter: TunneledParameter<T>) => void;
  unregisterParameter: (id: string) => void;
  updateParameter: <T>(id: string, value: T) => void;
  
  // Tunnel management
  createTunnel: (tunnel: ParameterTunnel) => void;
  deleteTunnel: (id: string) => void;
  activateTunnel: (id: string) => void;
  deactivateTunnel: (id: string) => void;
  
  // Runtime controls
  setTunneling: (enabled: boolean) => void;
  processUpdate: (update: ParameterUpdate) => void;
  undo: () => void;
  redo: () => void;
  
  // Configuration
  updateConfig: (config: Partial<ParameterTunnelConfig>) => void;
  
  // UI
  togglePanel: () => void;
  selectParameter: (id: string | null) => void;
  selectTunnel: (id: string | null) => void;
}

const defaultConfig: ParameterTunnelConfig = {
  enableRealTimeUpdates: true,
  maxUpdateRate: 60,
  enableHistory: true,
  historyLimit: 50,
  enableValidation: true,
  debugMode: false,
};

const defaultRuntimeState: RuntimeParameterState = {
  isTunneling: false,
  activeTunnels: [],
  pendingUpdates: [],
  history: [],
};

export const useParameterTunnelingStore = create<ParameterTunnelingStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    parameters: new Map(),
    tunnels: new Map(),
    activeTunnelIds: [],
    runtimeState: { ...defaultRuntimeState },
    config: { ...defaultConfig },
    isPanelOpen: false,
    selectedParameterId: null,
    selectedTunnelId: null,
    
    // Parameter management
    registerParameter: (parameter) => {
      const parameters = new Map(get().parameters);
      parameters.set(parameter.id, parameter);
      set({ parameters });
    },
    
    unregisterParameter: (id) => {
      const parameters = new Map(get().parameters);
      parameters.delete(id);
      set({ parameters });
    },
    
    updateParameter: (id, value) => {
      const parameters = new Map(get().parameters);
      const parameter = parameters.get(id);
      if (parameter) {
        const update: ParameterUpdate = {
          parameterId: id,
          oldValue: parameter.value,
          newValue: value,
          timestamp: Date.now(),
          source: 'user-input',
        };
        parameters.set(id, { ...parameter, value });
        
        set({
          parameters,
          runtimeState: {
            ...get().runtimeState,
            pendingUpdates: [...get().runtimeState.pendingUpdates, update],
          },
        });
      }
    },
    
    // Tunnel management
    createTunnel: (tunnel) => {
      const tunnels = new Map(get().tunnels);
      tunnels.set(tunnel.id, tunnel);
      set({ tunnels });
    },
    
    deleteTunnel: (id) => {
      const tunnels = new Map(get().tunnels);
      const activeTunnelIds = get().activeTunnelIds.filter((tId) => tId !== id);
      tunnels.delete(id);
      set({ tunnels, activeTunnelIds });
    },
    
    activateTunnel: (id) => {
      if (!get().activeTunnelIds.includes(id)) {
        set({
          activeTunnelIds: [...get().activeTunnelIds, id],
          runtimeState: {
            ...get().runtimeState,
            activeTunnels: [...get().runtimeState.activeTunnels, id],
          },
        });
      }
    },
    
    deactivateTunnel: (id) => {
      set({
        activeTunnelIds: get().activeTunnelIds.filter((tId) => tId !== id),
        runtimeState: {
          ...get().runtimeState,
          activeTunnels: get().runtimeState.activeTunnels.filter((tId) => tId !== id),
        },
      });
    },
    
    // Runtime controls
    setTunneling: (enabled) => set((state) => ({
      runtimeState: { ...state.runtimeState, isTunneling: enabled },
    })),
    
    processUpdate: (update) => {
      const { config, runtimeState } = get();
      
      if (runtimeState.history.length >= config.historyLimit) {
        runtimeState.history.shift();
      }
      
      set({
        runtimeState: {
          ...runtimeState,
          pendingUpdates: runtimeState.pendingUpdates.filter(
            (u) => u.parameterId !== update.parameterId
          ),
          history: [
            ...runtimeState.history,
            {
              id: `hist-${Date.now()}`,
              timestamp: Date.now(),
              action: 'set',
              parameterId: update.parameterId,
              value: update.newValue,
              source: update.source,
            },
          ],
        },
      });
    },
    
    undo: () => {
      const history = get().runtimeState.history;
      if (history.length > 0) {
        const lastEntry = history[history.length - 1];
        const parameters = new Map(get().parameters);
        const parameter = parameters.get(lastEntry.parameterId);
        if (parameter) {
          parameters.set(lastEntry.parameterId, {
            ...parameter,
            value: lastEntry.value,
          });
          set({
            parameters,
            runtimeState: {
              ...get().runtimeState,
              history: history.slice(0, -1),
            },
          });
        }
      }
    },
    
    redo: () => {
      // Implementation would require storing redo stack
    },
    
    // Configuration
    updateConfig: (config) => set((state) => ({
      config: { ...state.config, ...config },
    })),
    
    // UI
    togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),
    
    selectParameter: (id) => set({ selectedParameterId: id }),
    
    selectTunnel: (id) => set({ selectedTunnelId: id }),
  }))
);
