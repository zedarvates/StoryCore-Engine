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
export function useTunneledParameter(
  id: string,
  initialValue: number,
  options?: {
    min?: number;
    max?: number;
    step?: number;
    category?: TunneledParameter['category'];
  }
): {
  value: number;
  setValue: (value: number) => void;
  register: () => void;
  unregister: () => void;
} {
  const { updateParameter, registerParameter, unregisterParameter } =
    useParameterTunnelingStore();

  const { min, max, step, category = 'transform' } = options ?? {};
  const storedValue = useParameterTunnelingStore((state) => state.parameters.get(id)?.value);
  const parameter = useRef<TunneledParameter<number> | null>(null);

  const register = useCallback(() => {
    const registered: TunneledParameter<number> = {
      id,
      name: id,
      description: '',
      type: 'number' as const,
      value: initialValue,
      defaultValue: initialValue,
      minValue: min,
      maxValue: max,
      step: step,
      category: category,
      isAnimated: false,
      tunnelSource: {
        type: 'internal',
        sourceId: id,
        path: id,
        syncEnabled: true,
      },
    };
    parameter.current = registered;
    registerParameter(registered);
  }, [id, initialValue, min, max, step, category, registerParameter]);

  const unregister = useCallback(() => {
    if (parameter.current) {
      unregisterParameter(id);
      parameter.current = null;
    }
  }, [id, unregisterParameter]);

  const setValue = useCallback(
    (value: number) => {
      updateParameter(id, value);
    },
    [id, updateParameter]
  );

  useEffect(() => {
    register();
    return () => unregister();
  }, [register, unregister]);

  return {
    value: typeof storedValue === 'number' ? storedValue : initialValue,
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
  const { createTunnel, deleteTunnel, activateTunnel, deactivateTunnel } =
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
export function useKeyframes(
  parameterId: string,
  initialKeyframes: ParameterKeyframe<number>[]
): {
  addKeyframe: (time: number, value: number, easing?: ParameterKeyframe<number>['easing']) => void;
  removeKeyframe: (keyframeId: string) => void;
  updateKeyframe: (keyframeId: string, updates: Partial<ParameterKeyframe<number>>) => void;
  getValueAtTime: (time: number) => number | null;
} {
  const { parameters } = useParameterTunnelingStore();

  const addKeyframe = useCallback(
    (time: number, value: number, easing?: ParameterKeyframe<number>['easing']) => {
      const parameter = parameters.get(parameterId);
      if (!parameter) return;

      const newKeyframe: ParameterKeyframe<number> = {
        id: `kf_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        time,
        value,
        easing: easing || { type: 'linear' },
      };

      const updatedKeyframes = [...(parameter.keyframes ?? initialKeyframes), newKeyframe].sort(
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
    [parameterId, parameters, initialKeyframes]
  );

  const removeKeyframe = useCallback(
    (keyframeId: string) => {
      const parameter = parameters.get(parameterId);
      if (!parameter) return;

      const updatedKeyframes = (parameter.keyframes ?? initialKeyframes).filter(
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
    [parameterId, parameters, initialKeyframes]
  );

  const updateKeyframe = useCallback(
    (keyframeId: string, updates: Partial<ParameterKeyframe<number>>) => {
      const parameter = parameters.get(parameterId);
      if (!parameter) return;

      const updatedKeyframes = (parameter.keyframes ?? initialKeyframes).map((kf) =>
        kf.id === keyframeId ? { ...kf, ...updates } : kf
      );

      useParameterTunnelingStore.setState({
        parameters: new Map(parameters).set(parameterId, {
          ...parameter,
          keyframes: updatedKeyframes,
        }),
      });
    },
    [parameterId, parameters, initialKeyframes]
  );

  const getValueAtTime = useCallback(
    (time: number): number | null => {
      const keyframes = parameters.get(parameterId)?.keyframes ?? initialKeyframes;
      const sorted = keyframes.filter((frame): frame is ParameterKeyframe<number> =>
        typeof frame.value === 'number' && Number.isFinite(frame.value) && Number.isFinite(frame.time)
      ).sort((first, second) => first.time - second.time);
      if (sorted.length === 0 || !Number.isFinite(time)) return null;

      const nextIndex = sorted.findIndex((frame) => frame.time >= time);
      if (nextIndex === -1) return sorted[sorted.length - 1].value;
      const next = sorted[nextIndex];
      if (nextIndex === 0 || next.time === time) return next.value;
      const previous = sorted[nextIndex - 1];
      if (previous.easing?.type !== 'linear') return next.value;
      return previous.value + (next.value - previous.value) * (time - previous.time) / (next.time - previous.time);
    },
    [parameterId, parameters, initialKeyframes]
  );

  return {
    addKeyframe,
    removeKeyframe,
    updateKeyframe,
    getValueAtTime,
  };
}

export default useTunneledParameter;
