import { SequencePlan } from '@/types/sequencePlan';
import { DialogueLine } from '@/types/shot';

// ============================================================================
// Core Geometry Types
// ============================================================================

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface SceneData {
  id: string;
  actId: string;
  number: number;
  title: string;
  description: string;
  locationId: string;
  characterIds: string[];
  estimatedShotCount: number;
  shotIds: string[];
  beats: string[];
  assetTemplates: string[];
  name?: string; // For planning state
  elements?: CanvasElement[]; // For planning state
  camera?: {
    position: Vector3D;
    target: Vector3D;
    fov: number;
  };
  lighting?: {
    ambient: number;
    directional: Vector3D;
  };
}

export interface AudioProperties {
  enabled: boolean;
  volume: number; // 0-1
  spatialization: boolean;
  speakerAssignment: 'auto' | 'front-left' | 'front-center' | 'front-right' | 'surround-left' | 'surround-right' | 'back-left' | 'back-right' | 'lfe';
  reverb: number; // 0-1
  delay: number; // ms
  lowPassFilter: number; // Hz
  highPassFilter: number; // Hz
}

export interface CanvasElement {
  id: string;
  name: string;
  type: 'puppet' | 'prop' | 'environment' | 'camera' | 'light';
  position: Vector3D;
  rotation: Vector3D;
  scale: Vector3D;
  visible: boolean;
  animation?: {
    pose: 'idle' | 'walking' | 'running' | 'talking' | 'gesturing';
    expression: 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised';
  };
  audio?: AudioProperties;
  metadata?: Record<string, unknown>;
}

export interface ShotData {
  id: string;
  sceneId: string;
  number: number;
  type: string;
  category: 'establishing' | 'action' | 'dialogue' | 'reaction' | 'insert' | 'transition' | 'custom';
  dialogues: DialogueLine[];
  camera: {
    position: Vector3D;
    target: Vector3D;
    fov: number;
  };
  spatialPosition: Vector3D; // Position 3D du shot pour la spatialisation audio
  audioProfile: {
    surroundMode: '5.1' | '7.1';
    masterVolume: number;
    reverbLevel: number;
  };
}

export type ViewMode = '2d' | '3d' | 'split';

export interface PlanningState {
  currentScene: SceneData;
  selectedElement: CanvasElement | null;
  viewMode: ViewMode;
  showGrid: boolean;
  showGizmos: boolean;
  sequencePlan: SequencePlan;
  isGenerating: boolean;
  generationProgress: {
    currentScene: number;
    totalScenes: number;
    status: 'idle' | 'generating' | 'completed' | 'error';
  };
}

export interface DragItem {
  type: string;
  id: string;
  data: unknown;
}

export interface TransformGizmo {
  mode: 'translate' | 'rotate' | 'scale';
  axis: 'x' | 'y' | 'z' | 'xy' | 'xz' | 'yz' | 'xyz';
  position: Vector3D;
}

// Audio spatialization utilities
export const calculateSpeakerAssignment = (position: Vector3D, surroundMode: '5.1' | '7.1' = '5.1'): AudioProperties['speakerAssignment'] => {
  const { x, z } = position; // x = left/right, z = front/back

  // Normalize coordinates to -1 to 1 range (assuming scene bounds)
  const normalizedX = Math.max(-1, Math.min(1, x / 5)); // Assuming scene width of 10 units
  const normalizedZ = Math.max(-1, Math.min(1, z / 5)); // Assuming scene depth of 10 units

  // Calculate angles
  const angle = Math.atan2(normalizedX, normalizedZ) * (180 / Math.PI);
  const distance = Math.sqrt(normalizedX * normalizedX + normalizedZ * normalizedZ);

  // Front speakers (0° ± 30°)
  if (Math.abs(angle) <= 30 && normalizedZ > 0) {
    if (Math.abs(angle) <= 15) return 'front-center';
    return angle > 0 ? 'front-right' : 'front-left';
  }

  // Side speakers
  if (Math.abs(angle) > 30 && Math.abs(angle) <= 90) {
    return angle > 0 ? 'surround-right' : 'surround-left';
  }

  // Rear speakers (for 7.1)
  if (surroundMode === '7.1' && Math.abs(angle) > 90) {
    return angle > 0 ? 'back-right' : 'back-left';
  }

  // Default to front center for very close or center positions
  return 'front-center';
};

export const calculateAudioProperties = (position: Vector3D, surroundMode: '5.1' | '7.1' = '5.1'): Partial<AudioProperties> => {
  const speakerAssignment = calculateSpeakerAssignment(position, surroundMode);
  const distance = Math.sqrt(position.x * position.x + position.z * position.z);

  // Volume falloff based on distance (inverse square law approximation)
  const baseVolume = Math.max(0.1, 1 / (1 + distance * 0.3));

  // Reverb increases with distance
  const reverb = Math.min(0.8, distance * 0.1);

  // Delay based on distance (speed of sound approximation)
  const delay = distance * 10; // ~10ms per unit distance

  // Frequency filtering based on distance and position
  const lowPassFilter = Math.max(200, 20000 - distance * 1000);
  const highPassFilter = Math.min(8000, 100 + distance * 200);

  return {
    enabled: true,
    volume: baseVolume,
    spatialization: true,
    speakerAssignment,
    reverb,
    delay,
    lowPassFilter,
    highPassFilter
  };
};

