export interface Effect {
  id: string;
  name: string;
  type: 'color-correction' | 'blur' | 'sharpen' | 'distortion' | 'filter' | 'transition';
  enabled: boolean;
  parameters: Record<string, any>;
  intensity?: number; // 0-1
  duration?: number; // in seconds
  startTime?: number; // in seconds
  endTime?: number; // in seconds
}

import React from 'react';

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
}

export interface AppliedEffect extends Effect {
  order: number;
  category: 'color' | 'creative' | 'transform' | 'temporal' | 'blur' | 'stylize';
  icon: React.ReactNode;
  description: string;
  parameters: EffectParameter[];
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