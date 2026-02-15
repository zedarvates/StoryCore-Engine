/**
 * Camera Preset Service
 * 
 * Manages camera presets with movement types, trajectories, and metadata.
 * Requirements: 12.1, 12.2, 12.4, 12.5
 */

import type { Asset, CameraMetadata } from '../types';

// ============================================================================
// Types
// ============================================================================

export type CameraMovementType =
  | 'static'
  | 'pan'
  | 'tilt'
  | 'dolly'
  | 'zoom'
  | 'crane'
  | 'tracking';

export interface CameraPresetParameters {
  movementType: CameraMovementType;
  duration: number; // in seconds
  focalLength: number; // in mm
  trajectory: string;
  speed?: number; // 0-100
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  startPosition?: { x: number; y: number; z: number };
  endPosition?: { x: number; y: number; z: number };
  rotation?: { pitch: number; yaw: number; roll: number };
}

export interface CameraPreset extends Asset {
  type: 'camera-preset';
  category: 'camera-presets';
  metadata: {
    description: string;
    cameraMetadata: CameraMetadata & {
      recommendedUseCases: string[];
      previewAnimation?: string;
      parameters: CameraPresetParameters;
    };
  };
}

// ============================================================================
// Built-in Camera Presets
// ============================================================================

const BUILTIN_CAMERA_PRESETS: CameraPreset[] = [
  // Static Presets
  {
    id: 'camera-static-wide',
    name: 'Static Wide Shot',
    type: 'camera-preset',
    category: 'camera-presets',
    subcategory: 'static',
    thumbnailUrl: '/assets/camera-presets/static-wide.jpg',
    previewUrl: '/assets/camera-presets/static-wide-preview.mp4',
    metadata: {
      description: 'Fixed wide-angle shot for establishing scenes',
      cameraMetadata: {
        movementType: 'static',
        duration: 5,
        focalLength: 24,
        trajectory: 'none',
        recommendedUseCases: ['Establishing shots', 'Wide scenes', 'Group shots'],
        parameters: {
          movementType: 'static',
          duration: 5,
          focalLength: 24,
          trajectory: 'none',
        },
      },
    },
    tags: ['static', 'wide', 'establishing', 'fixed'],
    source: 'builtin',
    createdAt: new Date('2024-01-01').getTime(),
  },
  {
    id: 'camera-static-medium',
    name: 'Static Medium Shot',
    type: 'camera-preset',
    category: 'camera-presets',
    subcategory: 'static',
    thumbnailUrl: '/assets/camera-presets/static-medium.jpg',
    metadata: {
      description: 'Fixed medium shot for dialogue and character focus',
      cameraMetadata: {
        movementType: 'static',
        duration: 5,
        focalLength: 50,
        trajectory: 'none',
        recommendedUseCases: ['Dialogue', 'Character focus', 'Medium shots'],
        parameters: {
          movementType: 'static',
          duration: 5,
          focalLength: 50,
          trajectory: 'none',
        },
      },
    },
    tags: ['static', 'medium', 'dialogue', 'character'],
    source: 'builtin',
    createdAt: new Date('2024-01-01').getTime(),
  },
  {
    id: 'camera-static-closeup',
    name: 'Static Close-Up',
    type: 'camera-preset',
    category: 'camera-presets',
    subcategory: 'static',
    thumbnailUrl: '/assets/camera-presets/static-closeup.jpg',
    metadata: {
      description: 'Fixed close-up for emotional moments and details',
      cameraMetadata: {
        movementType: 'static',
        duration: 3,
        focalLength: 85,
        trajectory: 'none',
        recommendedUseCases: ['Emotional moments', 'Detail shots', 'Reactions'],
        parameters: {
          movementType: 'static',
          duration: 3,
          focalLength: 85,
          trajectory: 'none',
        },
      },
    },
    tags: ['static', 'closeup', 'emotional', 'detail'],
    source: 'builtin',
    createdAt: new Date('2024-01-01').getTime(),
  },

  // Pan Presets
  {
    id: 'camera-pan-left-slow',
    name: 'Slow Pan Left',
    type: 'camera-preset',
    category: 'camera-presets',
    subcategory: 'pan',
    thumbnailUrl: '/assets/camera-presets/pan-left-slow.jpg',
    previewUrl: '/assets/camera-presets/pan-left-slow-preview.mp4',
    metadata: {
      description: 'Smooth horizontal pan from right to left',
      cameraMetadata: {
        movementType: 'pan',
        duration: 8,
        focalLength: 35,
        trajectory: 'horizontal-left',
        recommendedUseCases: ['Landscape reveals', 'Scene exploration', 'Smooth transitions'],
        parameters: {
          movementType: 'pan',
          duration: 8,
          focalLength: 35,
          trajectory: 'horizontal-left',
          speed: 30,
          easing: 'ease-in-out',
          rotation: { pitch: 0, yaw: -45, roll: 0 },
        },
      },
    },
    tags: ['pan', 'left', 'slow', 'smooth', 'horizontal'],
    source: 'builtin',
    createdAt: new Date('2024-01-01').getTime(),
  },
  {
    id: 'camera-pan-right-fast',
    name: 'Fast Pan Right',
    type: 'camera-preset',
    category: 'camera-presets',
    subcategory: 'pan',
    thumbnailUrl: '/assets/camera-presets/pan-right-fast.jpg',
    metadata: {
      description: 'Quick horizontal pan from left to right',
      cameraMetadata: {
        movementType: 'pan',
        duration: 3,
        focalLength: 35,
        trajectory: 'horizontal-right',
        recommendedUseCases: ['Action sequences', 'Quick reveals', 'Dynamic shots'],
        parameters: {
          movementType: 'pan',
          duration: 3,
          focalLength: 35,
          trajectory: 'horizontal-right',
          speed: 80,
          easing: 'ease-out',
          rotation: { pitch: 0, yaw: 45, roll: 0 },
        },
      },
    },
    tags: ['pan', 'right', 'fast', 'dynamic', 'action'],
    source: 'builtin',
    createdAt: new Date('2024-01-01').getTime(),
  },

  // Tilt Presets
  {
    id: 'camera-tilt-up',
    name: 'Tilt Up',
    type: 'camera-preset',
    category: 'camera-presets',
    subcategory: 'tilt',
    thumbnailUrl: '/assets/camera-presets/tilt-up.jpg',
    metadata: {
      description: 'Vertical tilt from bottom to top',
      cameraMetadata: {
        movementType: 'tilt',
        duration: 5,
        focalLength: 50,
        trajectory: 'vertical-up',
        recommendedUseCases: ['Revealing height', 'Character reveals', 'Building shots'],
        parameters: {
          movementType: 'tilt',
          duration: 5,
          focalLength: 50,
          trajectory: 'vertical-up',
          speed: 40,
          easing: 'ease-in-out',
          rotation: { pitch: 30, yaw: 0, roll: 0 },
        },
      },
    },
    tags: ['tilt', 'up', 'vertical', 'reveal'],
    source: 'builtin',
    createdAt: new Date('2024-01-01').getTime(),
  },
  {
    id: 'camera-tilt-down',
    name: 'Tilt Down',
    type: 'camera-preset',
    category: 'camera-presets',
    subcategory: 'tilt',
    thumbnailUrl: '/assets/camera-presets/tilt-down.jpg',
    metadata: {
      description: 'Vertical tilt from top to bottom',
      cameraMetadata: {
        movementType: 'tilt',
        duration: 5,
        focalLength: 50,
        trajectory: 'vertical-down',
        recommendedUseCases: ['Descending shots', 'Ground reveals', 'Dramatic moments'],
        parameters: {
          movementType: 'tilt',
          duration: 5,
          focalLength: 50,
          trajectory: 'vertical-down',
          speed: 40,
          easing: 'ease-in-out',
          rotation: { pitch: -30, yaw: 0, roll: 0 },
        },
      },
    },
    tags: ['tilt', 'down', 'vertical', 'dramatic'],
    source: 'builtin',
    createdAt: new Date('2024-01-01').getTime(),
  },

  // Dolly Presets
  {
    id: 'camera-dolly-in',
    name: 'Dolly In',
    type: 'camera-preset',
    category: 'camera-presets',
    subcategory: 'dolly',
    thumbnailUrl: '/assets/camera-presets/dolly-in.jpg',
    previewUrl: '/assets/camera-presets/dolly-in-preview.mp4',
    metadata: {
      description: 'Move camera forward toward subject',
      cameraMetadata: {
        movementType: 'dolly',
        duration: 6,
        focalLength: 35,
        trajectory: 'forward',
        recommendedUseCases: ['Focus on subject', 'Tension building', 'Intimate moments'],
        parameters: {
          movementType: 'dolly',
          duration: 6,
          focalLength: 35,
          trajectory: 'forward',
          speed: 50,
          easing: 'ease-in',
          startPosition: { x: 0, y: 0, z: 10 },
          endPosition: { x: 0, y: 0, z: 2 },
        },
      },
    },
    tags: ['dolly', 'in', 'forward', 'focus', 'tension'],
    source: 'builtin',
    createdAt: new Date('2024-01-01').getTime(),
  },
  {
    id: 'camera-dolly-out',
    name: 'Dolly Out',
    type: 'camera-preset',
    category: 'camera-presets',
    subcategory: 'dolly',
    thumbnailUrl: '/assets/camera-presets/dolly-out.jpg',
    metadata: {
      description: 'Move camera backward away from subject',
      cameraMetadata: {
        movementType: 'dolly',
        duration: 6,
        focalLength: 35,
        trajectory: 'backward',
        recommendedUseCases: ['Reveal environment', 'Isolation', 'Context building'],
        parameters: {
          movementType: 'dolly',
          duration: 6,
          focalLength: 35,
          trajectory: 'backward',
          speed: 50,
          easing: 'ease-out',
          startPosition: { x: 0, y: 0, z: 2 },
          endPosition: { x: 0, y: 0, z: 10 },
        },
      },
    },
    tags: ['dolly', 'out', 'backward', 'reveal', 'context'],
    source: 'builtin',
    createdAt: new Date('2024-01-01').getTime(),
  },

  // Zoom Presets
  {
    id: 'camera-zoom-in',
    name: 'Zoom In',
    type: 'camera-preset',
    category: 'camera-presets',
    subcategory: 'zoom',
    thumbnailUrl: '/assets/camera-presets/zoom-in.jpg',
    metadata: {
      description: 'Optical zoom in on subject',
      cameraMetadata: {
        movementType: 'zoom',
        duration: 4,
        focalLength: 70,
        trajectory: 'zoom-in',
        recommendedUseCases: ['Detail focus', 'Dramatic emphasis', 'Subject isolation'],
        parameters: {
          movementType: 'zoom',
          duration: 4,
          focalLength: 70,
          trajectory: 'zoom-in',
          speed: 60,
          easing: 'ease-in-out',
        },
      },
    },
    tags: ['zoom', 'in', 'focus', 'dramatic', 'detail'],
    source: 'builtin',
    createdAt: new Date('2024-01-01').getTime(),
  },
  {
    id: 'camera-zoom-out',
    name: 'Zoom Out',
    type: 'camera-preset',
    category: 'camera-presets',
    subcategory: 'zoom',
    thumbnailUrl: '/assets/camera-presets/zoom-out.jpg',
    metadata: {
      description: 'Optical zoom out from subject',
      cameraMetadata: {
        movementType: 'zoom',
        duration: 4,
        focalLength: 24,
        trajectory: 'zoom-out',
        recommendedUseCases: ['Context reveal', 'Scene establishment', 'Perspective shift'],
        parameters: {
          movementType: 'zoom',
          duration: 4,
          focalLength: 24,
          trajectory: 'zoom-out',
          speed: 60,
          easing: 'ease-in-out',
        },
      },
    },
    tags: ['zoom', 'out', 'context', 'reveal', 'perspective'],
    source: 'builtin',
    createdAt: new Date('2024-01-01').getTime(),
  },

  // Crane Presets
  {
    id: 'camera-crane-up',
    name: 'Crane Up',
    type: 'camera-preset',
    category: 'camera-presets',
    subcategory: 'crane',
    thumbnailUrl: '/assets/camera-presets/crane-up.jpg',
    previewUrl: '/assets/camera-presets/crane-up-preview.mp4',
    metadata: {
      description: 'Vertical crane movement upward',
      cameraMetadata: {
        movementType: 'crane',
        duration: 7,
        focalLength: 35,
        trajectory: 'vertical-up',
        recommendedUseCases: ['Epic reveals', 'Aerial transitions', 'Grand scenes'],
        parameters: {
          movementType: 'crane',
          duration: 7,
          focalLength: 35,
          trajectory: 'vertical-up',
          speed: 45,
          easing: 'ease-in-out',
          startPosition: { x: 0, y: 2, z: 5 },
          endPosition: { x: 0, y: 10, z: 5 },
          rotation: { pitch: -15, yaw: 0, roll: 0 },
        },
      },
    },
    tags: ['crane', 'up', 'aerial', 'epic', 'reveal'],
    source: 'builtin',
    createdAt: new Date('2024-01-01').getTime(),
  },
  {
    id: 'camera-crane-down',
    name: 'Crane Down',
    type: 'camera-preset',
    category: 'camera-presets',
    subcategory: 'crane',
    thumbnailUrl: '/assets/camera-presets/crane-down.jpg',
    metadata: {
      description: 'Vertical crane movement downward',
      cameraMetadata: {
        movementType: 'crane',
        duration: 7,
        focalLength: 35,
        trajectory: 'vertical-down',
        recommendedUseCases: ['Descending shots', 'Ground approach', 'Dramatic entry'],
        parameters: {
          movementType: 'crane',
          duration: 7,
          focalLength: 35,
          trajectory: 'vertical-down',
          speed: 45,
          easing: 'ease-in-out',
          startPosition: { x: 0, y: 10, z: 5 },
          endPosition: { x: 0, y: 2, z: 5 },
          rotation: { pitch: 15, yaw: 0, roll: 0 },
        },
      },
    },
    tags: ['crane', 'down', 'descending', 'dramatic', 'entry'],
    source: 'builtin',
    createdAt: new Date('2024-01-01').getTime(),
  },

  // Tracking Presets
  {
    id: 'camera-tracking-follow',
    name: 'Follow Tracking',
    type: 'camera-preset',
    category: 'camera-presets',
    subcategory: 'tracking',
    thumbnailUrl: '/assets/camera-presets/tracking-follow.jpg',
    previewUrl: '/assets/camera-presets/tracking-follow-preview.mp4',
    metadata: {
      description: 'Camera follows subject movement',
      cameraMetadata: {
        movementType: 'tracking',
        duration: 10,
        focalLength: 50,
        trajectory: 'follow',
        recommendedUseCases: ['Character following', 'Action sequences', 'Dynamic movement'],
        parameters: {
          movementType: 'tracking',
          duration: 10,
          focalLength: 50,
          trajectory: 'follow',
          speed: 55,
          easing: 'linear',
        },
      },
    },
    tags: ['tracking', 'follow', 'character', 'action', 'dynamic'],
    source: 'builtin',
    createdAt: new Date('2024-01-01').getTime(),
  },
  {
    id: 'camera-tracking-orbit',
    name: 'Orbit Tracking',
    type: 'camera-preset',
    category: 'camera-presets',
    subcategory: 'tracking',
    thumbnailUrl: '/assets/camera-presets/tracking-orbit.jpg',
    metadata: {
      description: 'Camera orbits around subject',
      cameraMetadata: {
        movementType: 'tracking',
        duration: 12,
        focalLength: 35,
        trajectory: 'orbit',
        recommendedUseCases: ['360° reveals', 'Product shots', 'Character showcase'],
        parameters: {
          movementType: 'tracking',
          duration: 12,
          focalLength: 35,
          trajectory: 'orbit',
          speed: 40,
          easing: 'linear',
          rotation: { pitch: 0, yaw: 360, roll: 0 },
        },
      },
    },
    tags: ['tracking', 'orbit', '360', 'reveal', 'showcase'],
    source: 'builtin',
    createdAt: new Date('2024-01-01').getTime(),
  },
];

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Get all camera presets
 */
export function getAllCameraPresets(): CameraPreset[] {
  return [...BUILTIN_CAMERA_PRESETS];
}

/**
 * Get camera presets by movement type
 */
export function getCameraPresetsByType(type: CameraMovementType): CameraPreset[] {
  return BUILTIN_CAMERA_PRESETS.filter(
    (preset) => preset.metadata.cameraMetadata.movementType === type
  );
}

/**
 * Get camera preset by ID
 */
export function getCameraPresetById(id: string): CameraPreset | undefined {
  return BUILTIN_CAMERA_PRESETS.find((preset) => preset.id === id);
}

/**
 * Get camera preset types with counts
 */
export function getCameraPresetTypes(): Array<{ type: CameraMovementType; count: number }> {
  const types: CameraMovementType[] = ['static', 'pan', 'tilt', 'dolly', 'zoom', 'crane', 'tracking'];

  return types.map((type) => ({
    type,
    count: getCameraPresetsByType(type).length,
  }));
}

/**
 * Apply camera preset to shot parameters
 */
export function applyCameraPresetToShot(
  preset: CameraPreset,
  shotId: string
): CameraPresetParameters {
  return {
    ...preset.metadata.cameraMetadata.parameters,
  };
}

/**
 * Create custom camera preset
 */
export function createCustomCameraPreset(
  name: string,
  parameters: CameraPresetParameters,
  description: string,
  tags: string[]
): CameraPreset {
  return {
    id: `camera-custom-${Date.now()}`,
    name,
    type: 'camera-preset',
    category: 'camera-presets',
    subcategory: parameters.movementType,
    thumbnailUrl: '/assets/camera-presets/custom-placeholder.jpg',
    metadata: {
      description,
      cameraMetadata: {
        movementType: parameters.movementType,
        duration: parameters.duration,
        focalLength: parameters.focalLength,
        trajectory: parameters.trajectory,
        recommendedUseCases: [],
        parameters,
      },
    },
    tags,
    source: 'user',
    createdAt: Date.now(),
  };
}

/**
 * Get preview animation URL for camera preset
 */
export function getCameraPresetPreviewUrl(preset: CameraPreset): string | undefined {
  return preset.previewUrl || preset.metadata.cameraMetadata.previewAnimation;
}

/**
 * Validate camera preset parameters
 */
export function validateCameraPresetParameters(
  parameters: Partial<CameraPresetParameters>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!parameters.movementType) {
    errors.push('Movement type is required');
  }

  if (parameters.duration !== undefined && parameters.duration <= 0) {
    errors.push('Duration must be greater than 0');
  }

  if (parameters.focalLength !== undefined && (parameters.focalLength < 10 || parameters.focalLength > 200)) {
    errors.push('Focal length must be between 10mm and 200mm');
  }

  if (parameters.speed !== undefined && (parameters.speed < 0 || parameters.speed > 100)) {
    errors.push('Speed must be between 0 and 100');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
