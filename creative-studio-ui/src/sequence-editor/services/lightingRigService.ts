/**
 * Lighting Rig Service
 * 
 * Manages lighting rig presets for professional scene lighting.
 * Provides preconfigured lighting setups organized by mood.
 */

export interface LightingRig {
  id: string;
  name: string;
  mood: 'dramatic' | 'soft' | 'natural' | 'studio' | 'cinematic' | 'horror' | 'romantic';
  description: string;
  thumbnailUrl: string;
  previewUrl?: string;
  metadata: LightingRigMetadata;
  parameters: LightingRigParameters;
  createdAt: number;
}

export interface LightingRigMetadata {
  lightCount: number;
  intensityRange: { min: number; max: number };
  colorTemperature: number; // in Kelvin
  recommendedUse: string[];
  tags: string[];
}

export interface LightingRigParameters {
  lights: LightConfiguration[];
  ambientLight: AmbientLightConfig;
  shadows: ShadowConfig;
}

export interface LightConfiguration {
  id: string;
  type: 'key' | 'fill' | 'back' | 'rim' | 'ambient' | 'accent';
  position: { x: number; y: number; z: number };
  intensity: number; // 0-100
  color: string; // hex color
  colorTemperature: number; // in Kelvin
  softness: number; // 0-100
  angle: number; // in degrees
  falloff: number; // 0-100
}

export interface AmbientLightConfig {
  intensity: number; // 0-100
  color: string; // hex color
  colorTemperature: number; // in Kelvin
}

export interface ShadowConfig {
  enabled: boolean;
  intensity: number; // 0-100
  softness: number; // 0-100
  color: string; // hex color
}

/**
 * Built-in lighting rig presets organized by mood
 */
export const LIGHTING_RIG_PRESETS: LightingRig[] = [
  // Dramatic Lighting
  {
    id: 'dramatic-chiaroscuro',
    name: 'Chiaroscuro Drama',
    mood: 'dramatic',
    description: 'High contrast lighting with strong shadows, inspired by Renaissance painting',
    thumbnailUrl: '/assets/lighting-rigs/dramatic-chiaroscuro.jpg',
    metadata: {
      lightCount: 2,
      intensityRange: { min: 20, max: 100 },
      colorTemperature: 3200,
      recommendedUse: ['Dramatic scenes', 'Character portraits', 'Film noir'],
      tags: ['high-contrast', 'shadows', 'dramatic', 'moody']
    },
    parameters: {
      lights: [
        {
          id: 'key-1',
          type: 'key',
          position: { x: -45, y: 45, z: 100 },
          intensity: 100,
          color: '#FFE4B5',
          colorTemperature: 3200,
          softness: 20,
          angle: 45,
          falloff: 60
        },
        {
          id: 'fill-1',
          type: 'fill',
          position: { x: 45, y: 0, z: 80 },
          intensity: 20,
          color: '#E6E6FA',
          colorTemperature: 5600,
          softness: 80,
          angle: 60,
          falloff: 40
        }
      ],
      ambientLight: {
        intensity: 10,
        color: '#1A1A2E',
        colorTemperature: 4000
      },
      shadows: {
        enabled: true,
        intensity: 90,
        softness: 30,
        color: '#000000'
      }
    },
    createdAt: new Date('2024-01-01').getTime()
  },
  {
    id: 'dramatic-spotlight',
    name: 'Spotlight Drama',
    mood: 'dramatic',
    description: 'Focused spotlight with dramatic falloff',
    thumbnailUrl: '/assets/lighting-rigs/dramatic-spotlight.jpg',
    metadata: {
      lightCount: 1,
      intensityRange: { min: 0, max: 100 },
      colorTemperature: 3000,
      recommendedUse: ['Stage performances', 'Interrogation scenes', 'Solo subjects'],
      tags: ['spotlight', 'focused', 'dramatic', 'theatrical']
    },
    parameters: {
      lights: [
        {
          id: 'key-1',
          type: 'key',
          position: { x: 0, y: 90, z: 150 },
          intensity: 100,
          color: '#FFFACD',
          colorTemperature: 3000,
          softness: 10,
          angle: 30,
          falloff: 80
        }
      ],
      ambientLight: {
        intensity: 5,
        color: '#0A0A0A',
        colorTemperature: 4000
      },
      shadows: {
        enabled: true,
        intensity: 95,
        softness: 20,
        color: '#000000'
      }
    },
    createdAt: new Date('2024-01-01').getTime()
  },

  // Soft Lighting
  {
    id: 'soft-beauty',
    name: 'Beauty Light',
    mood: 'soft',
    description: 'Soft, flattering light perfect for portraits and beauty shots',
    thumbnailUrl: '/assets/lighting-rigs/soft-beauty.jpg',
    metadata: {
      lightCount: 3,
      intensityRange: { min: 60, max: 90 },
      colorTemperature: 5600,
      recommendedUse: ['Portraits', 'Beauty shots', 'Interviews'],
      tags: ['soft', 'flattering', 'portrait', 'beauty']
    },
    parameters: {
      lights: [
        {
          id: 'key-1',
          type: 'key',
          position: { x: 0, y: 30, z: 100 },
          intensity: 80,
          color: '#FFF8DC',
          colorTemperature: 5600,
          softness: 90,
          angle: 60,
          falloff: 30
        },
        {
          id: 'fill-1',
          type: 'fill',
          position: { x: -30, y: 15, z: 80 },
          intensity: 60,
          color: '#FFF8DC',
          colorTemperature: 5600,
          softness: 95,
          angle: 70,
          falloff: 25
        },
        {
          id: 'fill-2',
          type: 'fill',
          position: { x: 30, y: 15, z: 80 },
          intensity: 60,
          color: '#FFF8DC',
          colorTemperature: 5600,
          softness: 95,
          angle: 70,
          falloff: 25
        }
      ],
      ambientLight: {
        intensity: 40,
        color: '#F5F5F5',
        colorTemperature: 5600
      },
      shadows: {
        enabled: true,
        intensity: 20,
        softness: 90,
        color: '#D3D3D3'
      }
    },
    createdAt: new Date('2024-01-01').getTime()
  },

  // Natural Lighting
  {
    id: 'natural-daylight',
    name: 'Natural Daylight',
    mood: 'natural',
    description: 'Simulates natural outdoor daylight with soft shadows',
    thumbnailUrl: '/assets/lighting-rigs/natural-daylight.jpg',
    metadata: {
      lightCount: 2,
      intensityRange: { min: 70, max: 100 },
      colorTemperature: 6500,
      recommendedUse: ['Outdoor scenes', 'Natural look', 'Documentary'],
      tags: ['natural', 'daylight', 'outdoor', 'realistic']
    },
    parameters: {
      lights: [
        {
          id: 'key-1',
          type: 'key',
          position: { x: -60, y: 60, z: 200 },
          intensity: 100,
          color: '#FFFAF0',
          colorTemperature: 6500,
          softness: 70,
          angle: 90,
          falloff: 20
        },
        {
          id: 'fill-1',
          type: 'fill',
          position: { x: 30, y: 30, z: 150 },
          intensity: 70,
          color: '#E0F6FF',
          colorTemperature: 7500,
          softness: 85,
          angle: 80,
          falloff: 15
        }
      ],
      ambientLight: {
        intensity: 50,
        color: '#E6F2FF',
        colorTemperature: 7000
      },
      shadows: {
        enabled: true,
        intensity: 40,
        softness: 70,
        color: '#4A5568'
      }
    },
    createdAt: new Date('2024-01-01').getTime()
  },

  // Studio Lighting
  {
    id: 'studio-three-point',
    name: 'Three-Point Studio',
    mood: 'studio',
    description: 'Classic three-point lighting setup for professional studio work',
    thumbnailUrl: '/assets/lighting-rigs/studio-three-point.jpg',
    metadata: {
      lightCount: 3,
      intensityRange: { min: 50, max: 100 },
      colorTemperature: 5600,
      recommendedUse: ['Studio interviews', 'Product shots', 'Professional videos'],
      tags: ['studio', 'three-point', 'professional', 'balanced']
    },
    parameters: {
      lights: [
        {
          id: 'key-1',
          type: 'key',
          position: { x: -45, y: 45, z: 100 },
          intensity: 100,
          color: '#FFFFFF',
          colorTemperature: 5600,
          softness: 60,
          angle: 50,
          falloff: 40
        },
        {
          id: 'fill-1',
          type: 'fill',
          position: { x: 45, y: 30, z: 100 },
          intensity: 50,
          color: '#FFFFFF',
          colorTemperature: 5600,
          softness: 80,
          angle: 60,
          falloff: 30
        },
        {
          id: 'back-1',
          type: 'back',
          position: { x: 0, y: 60, z: -80 },
          intensity: 70,
          color: '#FFFACD',
          colorTemperature: 5200,
          softness: 40,
          angle: 40,
          falloff: 50
        }
      ],
      ambientLight: {
        intensity: 30,
        color: '#F0F0F0',
        colorTemperature: 5600
      },
      shadows: {
        enabled: true,
        intensity: 50,
        softness: 60,
        color: '#808080'
      }
    },
    createdAt: new Date('2024-01-01').getTime()
  },

  // Cinematic Lighting
  {
    id: 'cinematic-moody',
    name: 'Cinematic Mood',
    mood: 'cinematic',
    description: 'Atmospheric cinematic lighting with color contrast',
    thumbnailUrl: '/assets/lighting-rigs/cinematic-moody.jpg',
    metadata: {
      lightCount: 4,
      intensityRange: { min: 30, max: 90 },
      colorTemperature: 4500,
      recommendedUse: ['Film scenes', 'Music videos', 'Atmospheric shots'],
      tags: ['cinematic', 'atmospheric', 'moody', 'color-contrast']
    },
    parameters: {
      lights: [
        {
          id: 'key-1',
          type: 'key',
          position: { x: -50, y: 40, z: 120 },
          intensity: 80,
          color: '#FFD700',
          colorTemperature: 3200,
          softness: 50,
          angle: 45,
          falloff: 55
        },
        {
          id: 'fill-1',
          type: 'fill',
          position: { x: 50, y: 20, z: 100 },
          intensity: 40,
          color: '#4169E1',
          colorTemperature: 6500,
          softness: 70,
          angle: 55,
          falloff: 45
        },
        {
          id: 'back-1',
          type: 'back',
          position: { x: 0, y: 50, z: -100 },
          intensity: 60,
          color: '#FF6347',
          colorTemperature: 2800,
          softness: 30,
          angle: 35,
          falloff: 60
        },
        {
          id: 'rim-1',
          type: 'rim',
          position: { x: -70, y: 30, z: -50 },
          intensity: 50,
          color: '#00CED1',
          colorTemperature: 7000,
          softness: 20,
          angle: 25,
          falloff: 70
        }
      ],
      ambientLight: {
        intensity: 15,
        color: '#1C1C3C',
        colorTemperature: 4500
      },
      shadows: {
        enabled: true,
        intensity: 70,
        softness: 50,
        color: '#2C2C54'
      }
    },
    createdAt: new Date('2024-01-01').getTime()
  },

  // Horror Lighting
  {
    id: 'horror-underlight',
    name: 'Horror Underlight',
    mood: 'horror',
    description: 'Eerie underlighting for unsettling horror atmosphere',
    thumbnailUrl: '/assets/lighting-rigs/horror-underlight.jpg',
    metadata: {
      lightCount: 2,
      intensityRange: { min: 40, max: 80 },
      colorTemperature: 2500,
      recommendedUse: ['Horror scenes', 'Thriller moments', 'Unsettling atmosphere'],
      tags: ['horror', 'eerie', 'underlight', 'unsettling']
    },
    parameters: {
      lights: [
        {
          id: 'key-1',
          type: 'key',
          position: { x: 0, y: -60, z: 80 },
          intensity: 80,
          color: '#8B0000',
          colorTemperature: 2500,
          softness: 30,
          angle: 50,
          falloff: 70
        },
        {
          id: 'accent-1',
          type: 'accent',
          position: { x: -80, y: 0, z: 50 },
          intensity: 40,
          color: '#006400',
          colorTemperature: 3000,
          softness: 60,
          angle: 40,
          falloff: 65
        }
      ],
      ambientLight: {
        intensity: 5,
        color: '#0D0D0D',
        colorTemperature: 3500
      },
      shadows: {
        enabled: true,
        intensity: 95,
        softness: 40,
        color: '#000000'
      }
    },
    createdAt: new Date('2024-01-01').getTime()
  },

  // Romantic Lighting
  {
    id: 'romantic-warm',
    name: 'Romantic Warmth',
    mood: 'romantic',
    description: 'Warm, soft lighting for romantic scenes',
    thumbnailUrl: '/assets/lighting-rigs/romantic-warm.jpg',
    metadata: {
      lightCount: 3,
      intensityRange: { min: 50, max: 80 },
      colorTemperature: 2700,
      recommendedUse: ['Romantic scenes', 'Intimate moments', 'Candlelit atmosphere'],
      tags: ['romantic', 'warm', 'soft', 'intimate']
    },
    parameters: {
      lights: [
        {
          id: 'key-1',
          type: 'key',
          position: { x: -30, y: 30, z: 100 },
          intensity: 70,
          color: '#FFB6C1',
          colorTemperature: 2700,
          softness: 85,
          angle: 55,
          falloff: 35
        },
        {
          id: 'fill-1',
          type: 'fill',
          position: { x: 30, y: 20, z: 90 },
          intensity: 60,
          color: '#FFDAB9',
          colorTemperature: 2800,
          softness: 90,
          angle: 60,
          falloff: 30
        },
        {
          id: 'accent-1',
          type: 'accent',
          position: { x: 0, y: 10, z: -60 },
          intensity: 50,
          color: '#FF69B4',
          colorTemperature: 2600,
          softness: 80,
          angle: 45,
          falloff: 40
        }
      ],
      ambientLight: {
        intensity: 35,
        color: '#FFF0E6',
        colorTemperature: 2700
      },
      shadows: {
        enabled: true,
        intensity: 30,
        softness: 85,
        color: '#8B7355'
      }
    },
    createdAt: new Date('2024-01-01').getTime()
  }
];

/**
 * Lighting Rig Service Class
 */
export class LightingRigService {
  /**
   * Get all lighting rig presets
   */
  getAllRigs(): LightingRig[] {
    return LIGHTING_RIG_PRESETS;
  }

  /**
   * Get lighting rigs by mood
   */
  getRigsByMood(mood: LightingRig['mood']): LightingRig[] {
    return LIGHTING_RIG_PRESETS.filter(rig => rig.mood === mood);
  }

  /**
   * Get a specific lighting rig by ID
   */
  getRigById(id: string): LightingRig | undefined {
    return LIGHTING_RIG_PRESETS.find(rig => rig.id === id);
  }

  /**
   * Search lighting rigs by query
   */
  searchRigs(query: string): LightingRig[] {
    const lowerQuery = query.toLowerCase();
    return LIGHTING_RIG_PRESETS.filter(rig =>
      rig.name.toLowerCase().includes(lowerQuery) ||
      rig.description.toLowerCase().includes(lowerQuery) ||
      rig.metadata.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      rig.metadata.recommendedUse.some(use => use.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get available moods
   */
  getAvailableMoods(): LightingRig['mood'][] {
    return ['dramatic', 'soft', 'natural', 'studio', 'cinematic', 'horror', 'romantic'];
  }

  /**
   * Apply lighting rig to shot parameters
   */
  applyRigToShot(rig: LightingRig, shotId: string): LightingRigParameters {
    // Return a deep copy of the parameters to avoid mutation
    return JSON.parse(JSON.stringify(rig.parameters));
  }

  /**
   * Modify individual light in a rig
   */
  modifyLight(
    parameters: LightingRigParameters,
    lightId: string,
    updates: Partial<LightConfiguration>
  ): LightingRigParameters {
    // Deep copy to avoid mutation
    const updatedParams = JSON.parse(JSON.stringify(parameters));
    const lightIndex = updatedParams.lights.findIndex((light: LightConfiguration) => light.id === lightId);

    if (lightIndex !== -1) {
      updatedParams.lights[lightIndex] = {
        ...updatedParams.lights[lightIndex],
        ...updates
      };
    }

    return updatedParams;
  }

  /**
   * Adjust ambient light
   */
  adjustAmbientLight(
    parameters: LightingRigParameters,
    updates: Partial<AmbientLightConfig>
  ): LightingRigParameters {
    return {
      ...parameters,
      ambientLight: {
        ...parameters.ambientLight,
        ...updates
      }
    };
  }

  /**
   * Adjust shadow settings
   */
  adjustShadows(
    parameters: LightingRigParameters,
    updates: Partial<ShadowConfig>
  ): LightingRigParameters {
    return {
      ...parameters,
      shadows: {
        ...parameters.shadows,
        ...updates
      }
    };
  }

  /**
   * Create custom lighting rig
   */
  createCustomRig(
    name: string,
    mood: LightingRig['mood'],
    description: string,
    parameters: LightingRigParameters
  ): LightingRig {
    const lightCount = parameters.lights.length;
    const intensities = parameters.lights.map(light => light.intensity);
    const avgTemp = parameters.lights.reduce((sum, light) => sum + light.colorTemperature, 0) / lightCount;

    return {
      id: `custom-${Date.now()}`,
      name,
      mood,
      description,
      thumbnailUrl: '/assets/lighting-rigs/custom-placeholder.jpg',
      metadata: {
        lightCount,
        intensityRange: {
          min: Math.min(...intensities),
          max: Math.max(...intensities)
        },
        colorTemperature: Math.round(avgTemp),
        recommendedUse: ['Custom setup'],
        tags: ['custom', mood]
      },
      parameters,
      createdAt: Date.now()
    };
  }
}

// Export singleton instance
export const lightingRigService = new LightingRigService();
