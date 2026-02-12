// ============================================================================
// Advanced Transitions Types
// ============================================================================

export interface Transition {
  id: string;
  name: string;
  category: 'basic' | 'professional' | 'cinematic' | 'creative';
  description: string;
  defaultSettings: TransitionSettings;
}

export interface TransitionPreset extends Transition {
  previewUrl?: string;
  thumbnailUrl?: string;
  tags?: string[];
}

export interface TransitionSettings {
  duration: number; // Seconds
  direction?: 'in' | 'out' | 'left' | 'right' | 'up' | 'down';
  intensity?: number; // 0-1
  color?: string; // Hex color
  customParams?: Record<string, unknown>;
}

export interface TransitionLibrary {
  builtin: TransitionPreset[];
  custom: TransitionPreset[];
  version: string;
}

export interface TransitionOperation {
  id: string;
  type: 'apply' | 'preview' | 'add' | 'remove';
  timestamp: string;
  description: string;
  transitionId?: string;
}

export interface TransitionState {
  library: TransitionLibrary;
  history: TransitionOperation[];
  version: string;
  lastModified: string;
}
