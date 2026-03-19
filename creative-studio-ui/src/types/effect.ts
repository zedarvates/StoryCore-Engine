import React from 'react';

export type EffectCategory = 'color' | 'blur' | 'stylize' | 'distort' | 'noise' | 'creative' | 'transform' | 'temporal';

export interface EffectKeyframe {
  id: string;
  time: number; // in seconds
  value: number; // 0-1 normalized value
  interpolation: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export interface EffectParameter {
  id: string;
  name: string;
  type: EffectParameterType;
  value: EffectParameterValue;
  defaultValue?: EffectParameterValue;
  min?: number;
  max?: number;
  step?: number;
  options?: EffectParameterOption[];
  unit?: string;
  keyframes?: EffectKeyframe[];
}

// Type definitions for Effect parameters
export type EffectParameterType = 'range' | 'color' | 'select' | 'boolean' | 'number';
export type EffectParameterValue = string | number | boolean | [number, number, number] | [number, number, number, number];
export interface EffectParameterOption {
  label: string;
  value: EffectParameterValue;
}

export interface Effect {
  id: string;
  name: string;
  type?: 'color-correction' | 'blur' | 'sharpen' | 'distortion' | 'filter' | 'transition' | 'custom';
  category: 'color' | 'creative' | 'transform' | 'temporal' | 'blur' | 'stylize';
  enabled?: boolean;
  parameters: EffectParameter[];
  intensity?: number; // 0-1
  duration?: number; // in seconds
  startTime?: number; // in seconds
  endTime?: number; // in seconds
  icon: React.ReactNode;
  description: string;
  preview?: string;
}

export interface AppliedEffect extends Effect {
  id: string;
  name: string;
  type: 'color-correction' | 'blur' | 'sharpen' | 'distortion' | 'filter' | 'transition' | 'custom';
  enabled: boolean;
  order: number;
}

export interface EffectStackProps {
  effects: AppliedEffect[];
  onEffectsChange: (effects: AppliedEffect[]) => void;
  onEffectSelect: (effect: AppliedEffect) => void;
  selectedEffectId?: string;
  className?: string;
  onReorder?: (effects: AppliedEffect[]) => void;
  onRemove?: (effectId: string) => void;
}
