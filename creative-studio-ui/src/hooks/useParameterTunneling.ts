/**
 * useParameterTunneling Hook
 * ME3: Parameter Tunneling - Runtime parameter adjustments
 */

import { useCallback, useEffect, useRef } from 'react';
import { useParameterTunnelingStore } from '../stores/parameterTunnelingStore';
import {
  TunneledParameter,
  ParameterTunnel,
  ParameterKeyframe,
} from '../types/parameter-tunneling';

/**
 * Hook for managing a single tunneled parameter
 */
export function useTunneledParameter<T>(
  id: string,
  initialValue: T,
  options?: {
    min?: T;
    max?: T;
    step?: T;
    category?: TunneledParameter['category'];
  }
): {
  value: T;
  setValue: (value: T) => void;
  register: () => void;
  unregister: () => void;
} {
  const { updateParameter, registerParameter, unregisterParameter } =
    useParameterTunnelingStore();

  const parameter = useRef<TunneledParameter<T> | null>(null);

  const register = useCallback(() => {
    parameter.current = {
      id,
      name: id,
      description: '',
      type: 'number' as const,
      value: initialValue,
      defaultValue: initialValue,
      minValue: options?.min,
      maxValue: options?.max,
      step: options?.step,
      category: options?.category || 'transform',
      isAnimated: false,
      tunnelSource: {
        type: 'internal',
        sourceId: id,
        path: id,
        syncEnabled: true,
      },
    };
    registerParameter(parameter.current);
  }, [id, initialValue, options, registerParameter]);

  const unregister = useCallback(() => {
    if (parameter.current) {
      unregisterParameter(id);
      parameter.current = null;
    }
  }, [id, unregisterParameter]);

  const setValue = useCallback(
    (value: T) => {
      updateParameter(id, value);
    },
    [id, updateParameter]
  );

  useEffect(() => {
    register();
    return () => unregister();
  }, [register, unregister]);

  return {
    value: initialValue,
    setValue,
    register,
    unregister,
  };
}

/**
 * Hook for managing a tunnel between two parameters
 */
export function useParameterTunnel(
  sourceId: string,
  targetId: string,
  options?: {
    bidirectional?: boolean;
    syncMode?: 'one-way' | 'two-way' | 'reactive';
  }
): {
  createTunnel: () => void;
  destroyTunnel: () => void;
  activate: () => void;
  deactivate: () => void;
  isActive: boolean;
} {
  const tunnelId = useRef<string>('');
  const { createTunnel, deleteTunnel, activateTunnel, deactivateTunnel, tunnels } =
    useParameterTunnelingStore();

  const createTunnelFn = useCallback(() => {
    const id = `tunnel_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    tunnelId.current = id;

    const tunnel: ParameterTunnel = {
      id,
      name: `${sourceId} → ${targetId}`,
      source: {
        objectId: sourceId,
        propertyPath: '',
        parameterId: sourceId,
      },
      target: {
        objectId: targetId,
        propertyPath: '',
        parameterId: targetId,
      },
      mapping: [
        {
          sourceParameter: sourceId,
          targetParameter: targetId,
          bidirectional: options?.bidirectional || false,
        },
      ],
      syncMode: options?.syncMode || 'one-way',
      isActive: false,
      priority: 0,
    };

    createTunnel(tunnel);
    return id;
  }, [sourceId, targetId, options, createTunnel]);

  const destroyTunnel = useCallback(() => {
    if (tunnelId.current) {
      deleteTunnel(tunnelId.current);
      tunnelId.current = '';
    }
  }, [deleteTunnel]);

  const activate = useCallback(() => {
    if (tunnelId.current) {
      activateTunnel(tunnelId.current);
    }
  }, [activateTunnel]);

  const deactivate = useCallback(() => {
    if (tunnelId.current) {
      deactivateTunnel(tunnelId.current);
    }
  }, [deactivateTunnel]);

  const isActive = tunnelId.current
    ? useParameterTunnelingStore.getState().activeTunnelIds.includes(tunnelId.current)
    : false;

  return {
    createTunnel: createTunnelFn,
    destroyTunnel,
    activate,
    deactivate,
    isActive,
  };
}

/**
 * Hook for keyframe animation support
 */
export function useKeyframes<T>(
  parameterId: string,
  keyframes: ParameterKeyframe<T>[]
): {
  addKeyframe: (time: number, value: T, easing?: ParameterKeyframe<T>['easing']) => void;
  removeKeyframe: (keyframeId: string) => void;
  updateKeyframe: (keyframeId: string, updates: Partial<ParameterKeyframe<T>>) => void;
  getValueAtTime: (time: number) => T | null;
} {
  const { parameters, updateParameter } = useParameterTunnelingStore();

  const addKeyframe = useCallback(
    (time: number, value: T, easing?: ParameterKeyframe<T>['easing']) => {
      const parameter = parameters.get(parameterId);
      if (!parameter) return;

      const newKeyframe: ParameterKeyframe<T> = {
        id: `kf_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        time,
        value,
        easing: easing || { type: 'linear' },
      };

      const updatedKeyframes = [...(parameter.keyframes || []), newKeyframe].sort(
        (a, b) => a.time - b.time
      );

      useParameterTunnelingStore.setState({
        parameters: new Map(parameters).set(parameterId, {
          ...parameter,
          keyframes: updatedKeyframes,
          isAnimated: true,
        }),
      });
    },
    [parameterId, parameters]
  );

  const removeKeyframe = useCallback(
    (keyframeId: string) => {
      const parameter = parameters.get(parameterId);
      if (!parameter) return;

      const updatedKeyframes = (parameter.keyframes || []).filter(
        (kf) => kf.id !== keyframeId
      );

      useParameterTunnelingStore.setState({
        parameters: new Map(parameters).set(parameterId, {
          ...parameter,
          keyframes: updatedKeyframes,
          isAnimated: updatedKeyframes.length > 0,
        }),
      });
    },
    [parameterId, parameters]
  );

  const updateKeyframe = useCallback(
    (keyframeId: string, updates: Partial<ParameterKeyframe<T>>) => {
      const parameter = parameters.get(parameterId);
      if (!parameter) return;

      const updatedKeyframes = (parameter.keyframes || []).map((kf) =>
        kf.id === keyframeId ? { ...kf, ...updates } : kf
      );

      useParameterTunnelingStore.setState({
        parameters: new Map(parameters).set(parameterId, {
          ...parameter,
          keyframes: updatedKeyframes,
        }),
      });
    },
    [parameterId, parameters]
  );

  const getValueAtTime = useCallback(
    (time: number): T | null => {
      const parameter = parameters.get(parameterId);
      if (!parameter?.keyframes || parameter.keyframes.length === 0) return null;

      const sorted = [...parameter.keyframes].sort((a, b) => a.time - b.time);
      
      // Find surrounding keyframes
      let prevKf = sorted[0];
      let nextKf = sorted[sorted.length - 1];

      for (let i = 0; i < sorted.length; i++) {
        if (sorted[i].time <= time) {
          prevKf = sorted[i];
        }
        if (sorted[i].time >= time && nextKf === sorted[sorted.length - 1]) {
          nextKf = sorted[i];
          break;
        }
      }

      if (prevKf === nextKf) return prevKf.value;

      // Interpolate
      const ratio = (time - prevKf.time) / (nextKf.time - prevKf.time);
      return prevKf.easing?.type === 'linear'
        ? (prevKf.value as number) + ((nextKf.value as number) - (prevKf.value as number)) * ratio
        : (nextKf.value as number);
    },
    [parameterId, parameters]
  );

  return {
    addKeyframe,
    removeKeyframe,
    updateKeyframe,
    getValueAtTime,
  };
}

export default useParameterTunneling;
