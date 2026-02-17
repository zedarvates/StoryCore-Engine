import React from 'react';

export interface EffectKeyframe {
  id: string;
  time: number; // in seconds
  value: number; // 0-1 normalized value
  interpolation: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export interface EffectParameter {
  id: string;
  name: string;
  type: 'range' | 'color' | 'select' | 'boolean' | 'number';
  value: any;
  min?: number;
  max?: number;
  step?: number;
  options?: { label: string; value: any }[];
  unit?: string;
  keyframes?: EffectKeyframe[];
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
