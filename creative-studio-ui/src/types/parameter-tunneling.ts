/**
 * Parameter Tunneling Types
 * ME3: Parameter Tunneling - Runtime parameter adjustments
 */

// import { TimelineClip } from './timeline'; // Unused and missing export

export interface TunneledParameter<T = unknown> {
  id: string;
  name: string;
  description: string;
  type: ParameterType;
  value: T;
  defaultValue: T;
  minValue?: T;
  maxValue?: T;
  step?: number;
  unit?: string;
  category: ParameterCategory;
  isAnimated: boolean;
  keyframes?: ParameterKeyframe<T>[];
  tunnelSource: TunnelSource;
  constraints?: ParameterConstraints<T>;
}

export type ParameterType =
  | 'number'
  | 'string'
  | 'boolean'
  | 'color'
  | 'easing'
  | 'select'
  | 'range'
  | 'vector2'
  | 'vector3'
  | 'transform';

export type ParameterCategory =
  | 'transform'
  | 'opacity'
  | 'color'
  | 'effect'
  | 'audio'
  | 'video'
  | 'animation'
  | 'custom';

export interface ParameterKeyframe<T = unknown> {
  id: string;
  time: number;
  value: T;
  easing: EasingFunction;
  inHandle?: [number, number];
  outHandle?: [number, number];
}

export interface EasingFunction {
  type: 'linear' | 'bezier' | 'steps' | 'cubic-bezier';
  value?: number[];
}

export interface TunnelSource {
  type: 'internal' | 'external' | 'user-input' | 'automation' | 'ai-generated';
  sourceId: string;
  path: string;
  updateInterval?: number;
  syncEnabled: boolean;
}

export interface ParameterConstraints<T = unknown> {
  min?: T;
  max?: T;
  step?: T;
  precision?: number;
  allowedValues?: T[];
  regex?: string;
  required?: boolean;
}

export interface ParameterTunnel {
  id: string;
  name: string;
  source: TunnelEndpoint;
  target: TunnelEndpoint;
  mapping: ParameterMapping[];
  syncMode: 'one-way' | 'two-way' | 'reactive';
  isActive: boolean;
  priority: number;
  conditions?: TunnelCondition[];
}

export interface TunnelEndpoint {
  objectId: string;
  propertyPath: string;
  parameterId: string;
}

export interface ParameterMapping {
  sourceParameter: string;
  targetParameter: string;
  transformation?: ValueTransformation;
  bidirectional: boolean;
}

export interface ValueTransformation {
  type: 'linear' | 'exponential' | 'logarithmic' | 'inverse' | 'custom';
  params?: Record<string, number>;
}

export interface TunnelCondition {
  type: 'time' | 'value' | 'expression';
  expression?: string;
  threshold?: number;
  operator?: 'equals' | 'greater' | 'less' | 'between';
}

export interface RuntimeParameterState {
  isTunneling: boolean;
  activeTunnels: string[];
  pendingUpdates: ParameterUpdate[];
  history: ParameterHistoryEntry[];
}

export interface ParameterUpdate {
  parameterId: string;
  oldValue: unknown;
  newValue: unknown;
  timestamp: number;
  source: string;
}

export interface ParameterHistoryEntry {
  id: string;
  timestamp: number;
  action: 'set' | 'animate' | 'tunnel';
  parameterId: string;
  value: unknown;
  source: string;
}

export interface ParameterTunnelConfig {
  enableRealTimeUpdates: boolean;
  maxUpdateRate: number;
  enableHistory: boolean;
  historyLimit: number;
  enableValidation: boolean;
  debugMode: boolean;
}
