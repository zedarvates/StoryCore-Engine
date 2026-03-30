/**
 * Type definitions for Shot Presets and Layout Guides
 */

export interface ShotLayoutColors {
  character1?: string; // Hex color or name
  character2?: string;
  character3?: string;
  interior?: string;
  exterior?: string;
  foreground?: string;
  background?: string;
  props?: string;
  sky?: string;
  ground?: string;
  vegetation?: string;
  architecture?: string;
  vehicles?: string;
  animals?: string;
  liquids?: string;
  sfx?: string;
  smoke?: string;
  sparks?: string;
  [key: string]: string | undefined; // Allow custom keys like 'dashboard'
}

export interface ShotPreset {
  id: string;
  label: string;
  description: string;
  category: 'establishing' | 'action' | 'dialogue' | 'reaction' | 'transition' | 'environment' | 'sfx';
  promptTemplate: string;
  negativePrompt?: string;
  layoutColors: ShotLayoutColors;
  framing?: string; // e.g., 'CU', 'MS', 'WS'
  cameraAngle?: string;
  templatePath?: string; // Path to .kra or other template file
  rigPath?: string;      // Path to 3D FBX puppet/rig
  animationId?: string;  // Internal ID for specific animation (e.g., 'Long Jump')
  is3DSupported?: boolean;
}
