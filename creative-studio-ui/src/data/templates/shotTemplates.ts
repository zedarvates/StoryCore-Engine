/**
 * Built-in Shot Templates
 * Pre-configured shot configurations for different cinematographic styles
 */

import { ShotTemplate, ProductionShot } from '../../types';

// ============================================================================
// Helper Functions
// ============================================================================

const createShotTemplate = (
  id: string,
  name: string,
  description: string,
  category: string,
  configuration: Partial<ProductionShot>
): ShotTemplate => ({
  id,
  name,
  description,
  category,
  isBuiltIn: true,
  configuration,
  previewImage: `/templates/shots/${id}.svg`,
  tags: [category.toLowerCase(), 'preset'],
});

// ============================================================================
// Built-in Shot Templates
// ============================================================================

export const SHOT_TEMPLATES: ShotTemplate[] = [
  // ============================================================================
  // Establishing Shots
  // ============================================================================
  createShotTemplate(
    'establishing-wide',
    'Establishing Wide Shot',
    'Wide establishing shot to set the scene and provide context. Perfect for opening sequences.',
    'establishing',
    {
      type: 'extreme-wide',
      category: 'establishing',
      camera: {
        framing: 'extreme-wide',
        angle: 'eye-level',
        movement: {
          type: 'static',
        },
      },
      timing: {
        duration: 120, // 4 seconds at 30fps
        inPoint: 0,
        outPoint: 120,
        transition: 'cut',
        transitionDuration: 0,
      },
      composition: {
        characterIds: [],
        characterPositions: [],
        environmentId: '',
        props: [],
        lightingMood: 'natural',
        timeOfDay: 'day',
      },
    }
  ),

  createShotTemplate(
    'establishing-pan',
    'Establishing Pan Shot',
    'Slow panning establishing shot to reveal the environment gradually.',
    'establishing',
    {
      type: 'wide',
      category: 'establishing',
      camera: {
        framing: 'wide',
        angle: 'eye-level',
        movement: {
          type: 'pan',
          direction: 'left',
          speed: 'slow',
          easing: 'linear',
        },
      },
      timing: {
        duration: 180, // 6 seconds at 30fps
        inPoint: 0,
        outPoint: 180,
        transition: 'cut',
        transitionDuration: 0,
      },
      composition: {
        characterIds: [],
        characterPositions: [],
        environmentId: '',
        props: [],
        lightingMood: 'natural',
        timeOfDay: 'day',
      },
    }
  ),

  // ============================================================================
  // Action Shots
  // ============================================================================
  createShotTemplate(
    'action-dynamic',
    'Dynamic Action Shot',
    'Fast-paced action shot with camera movement to convey energy and motion.',
    'action',
    {
      type: 'wide',
      category: 'action',
      camera: {
        framing: 'wide',
        angle: 'eye-level',
        movement: {
          type: 'tracking',
          direction: 'forward',
          speed: 'medium',
          easing: 'ease-out',
        },
      },
      timing: {
        duration: 60, // 2 seconds at 30fps
        inPoint: 0,
        outPoint: 60,
        transition: 'cut',
        transitionDuration: 0,
      },
      composition: {
        characterIds: ['character-1'],
        characterPositions: [{
          characterId: 'character-1',
          position: 'center',
          pose: 'running',
        }],
        environmentId: '',
        props: [],
        lightingMood: 'dramatic',
        timeOfDay: 'day',
      },
    }
  ),

  createShotTemplate(
    'action-slow-motion',
    'Slow Motion Action',
    'Slow motion shot to emphasize dramatic moments and movements.',
    'action',
    {
      type: 'medium',
      category: 'action',
      camera: {
        framing: 'medium',
        angle: 'low',
        movement: {
          type: 'static',
        },
      },
      timing: {
        duration: 90, // 3 seconds at 30fps (will be slowed down)
        inPoint: 0,
        outPoint: 90,
        transition: 'cut',
        transitionDuration: 0,
      },
      composition: {
        characterIds: ['character-1'],
        characterPositions: [{
          characterId: 'character-1',
          position: 'center',
          pose: 'jumping',
        }],
        environmentId: '',
        props: [],
        lightingMood: 'dramatic',
        timeOfDay: 'day',
      },
    }
  ),

  // ============================================================================
  // Dialogue Shots
  // ============================================================================
  createShotTemplate(
    'dialogue-over-shoulder',
    'Over-the-Shoulder Dialogue',
    'Classic dialogue shot showing one character while the other speaks.',
    'dialogue',
    {
      type: 'over-the-shoulder',
      category: 'dialogue',
      camera: {
        framing: 'medium',
        angle: 'eye-level',
        movement: {
          type: 'static',
        },
      },
      timing: {
        duration: 120, // 4 seconds at 30fps
        inPoint: 0,
        outPoint: 120,
        transition: 'cut',
        transitionDuration: 0,
      },
      composition: {
        characterIds: ['character-1', 'character-2'],
        characterPositions: [
          {
            characterId: 'character-1',
            position: 'left',
            pose: 'listening',
          },
          {
            characterId: 'character-2',
            position: 'right',
            pose: 'speaking',
          },
        ],
        environmentId: '',
        props: [],
        lightingMood: 'natural',
        timeOfDay: 'day',
      },
    }
  ),

  createShotTemplate(
    'dialogue-close-up',
    'Close-Up Dialogue',
    'Intimate close-up shot for emotional dialogue scenes.',
    'dialogue',
    {
      type: 'close-up',
      category: 'dialogue',
      camera: {
        framing: 'close-up',
        angle: 'eye-level',
        movement: {
          type: 'static',
        },
      },
      timing: {
        duration: 90, // 3 seconds at 30fps
        inPoint: 0,
        outPoint: 90,
        transition: 'cut',
        transitionDuration: 0,
      },
      composition: {
        characterIds: ['character-1'],
        characterPositions: [{
          characterId: 'character-1',
          position: 'center',
          pose: 'speaking',
        }],
        environmentId: '',
        props: [],
        lightingMood: 'soft',
        timeOfDay: 'day',
      },
    }
  ),

  // ============================================================================
  // Reaction Shots
  // ============================================================================
  createShotTemplate(
    'reaction-close-up',
    'Reaction Close-Up',
    'Close-up reaction shot to show character emotions and responses.',
    'reaction',
    {
      type: 'close-up',
      category: 'reaction',
      camera: {
        framing: 'close-up',
        angle: 'eye-level',
        movement: {
          type: 'static',
        },
      },
      timing: {
        duration: 60, // 2 seconds at 30fps
        inPoint: 0,
        outPoint: 60,
        transition: 'cut',
        transitionDuration: 0,
      },
      composition: {
        characterIds: ['character-1'],
        characterPositions: [{
          characterId: 'character-1',
          position: 'center',
          pose: 'reacting',
        }],
        environmentId: '',
        props: [],
        lightingMood: 'dramatic',
        timeOfDay: 'day',
      },
    }
  ),

  // ============================================================================
  // Insert Shots
  // ============================================================================
  createShotTemplate(
    'insert-object',
    'Object Insert Shot',
    'Close-up of an important object or detail to add visual interest.',
    'insert',
    {
      type: 'extreme-close-up',
      category: 'insert',
      camera: {
        framing: 'extreme-close-up',
        angle: 'eye-level',
        movement: {
          type: 'static',
        },
      },
      timing: {
        duration: 30, // 1 second at 30fps
        inPoint: 0,
        outPoint: 30,
        transition: 'cut',
        transitionDuration: 0,
      },
      composition: {
        characterIds: [],
        characterPositions: [],
        environmentId: '',
        props: ['important-object'],
        lightingMood: 'dramatic',
        timeOfDay: 'day',
      },
    }
  ),

  // ============================================================================
  // Transition Shots
  // ============================================================================
  createShotTemplate(
    'transition-fade',
    'Fade Transition Shot',
    'Soft transition shot using lighting and composition changes.',
    'transition',
    {
      type: 'wide',
      category: 'transition',
      camera: {
        framing: 'wide',
        angle: 'high',
        movement: {
          type: 'static',
        },
      },
      timing: {
        duration: 60, // 2 seconds at 30fps
        inPoint: 0,
        outPoint: 60,
        transition: 'fade',
        transitionDuration: 30,
      },
      composition: {
        characterIds: [],
        characterPositions: [],
        environmentId: '',
        props: [],
        lightingMood: 'soft',
        timeOfDay: 'dusk',
      },
    }
  ),

  // ============================================================================
  // Custom/Advanced Shots
  // ============================================================================
  createShotTemplate(
    'dolly-zoom',
    'Dolly Zoom Effect',
    'Classic Hitchcock dolly zoom for tension and psychological impact.',
    'custom',
    {
      type: 'medium',
      category: 'custom',
      camera: {
        framing: 'medium',
        angle: 'eye-level',
        movement: {
          type: 'dolly',
          direction: 'in',
          speed: 'slow',
          easing: 'linear',
        },
      },
      timing: {
        duration: 90, // 3 seconds at 30fps
        inPoint: 0,
        outPoint: 90,
        transition: 'cut',
        transitionDuration: 0,
      },
      composition: {
        characterIds: ['character-1'],
        characterPositions: [{
          characterId: 'character-1',
          position: 'center',
          pose: 'standing',
        }],
        environmentId: '',
        props: [],
        lightingMood: 'dramatic',
        timeOfDay: 'day',
      },
    }
  ),

  // ============================================================================
  // Special/Shorts Shots
  // ============================================================================
  createShotTemplate(
    'special-rewind',
    'Rewind Effect (SFX)',
    'Reverse playback visual effect with tape scratching SFX. Perfect for story recaps or multi-take jokes.',
    'custom',
    {
      type: 'medium',
      category: 'custom',
      camera: {
        framing: 'medium',
        angle: 'eye-level',
        movement: {
          type: 'static',
        },
      },
      timing: {
        duration: 45, // 1.5 seconds at 30fps
        inPoint: 0,
        outPoint: 45,
        transition: 'rewind',
        transitionDuration: 15,
      },
      composition: {
        characterIds: [],
        characterPositions: [],
        environmentId: '',
        props: [],
        lightingMood: 'dramatic',
        timeOfDay: 'day',
      },
      backgroundAudio: {
        type: 'sound-effect',
        assetId: 'sfx_rewind_tape',
        volume: 0.8,
        fadeIn: 0,
        fadeOut: 0,
        loop: false
      }
    }
  ),

  createShotTemplate(
    'youtube-shorts-vertical',
    'YouTube Shorts Vertical',
    'Native 9:16 vertical shot optimized for YouTube Shorts and TikTok.',
    'custom',
    {
      type: 'medium',
      category: 'custom',
      camera: {
        framing: 'medium',
        angle: 'eye-level',
        movement: {
          type: 'static',
        },
      },
      generation: {
        aiProvider: 'stable-diffusion',
        model: 'xl-base-1.0',
        prompt: '',
        negativePrompt: '',
        comfyuiPreset: 'vertical-shots',
        parameters: {
          width: 720,
          height: 1280,
          steps: 25,
          cfgScale: 7.5,
          sampler: 'euler_a',
          scheduler: 'karras'
        },
        styleReferences: []
      },
      timing: {
        duration: 90,
        inPoint: 0,
        outPoint: 90,
        transition: 'cut',
        transitionDuration: 0,
      }
    }
  ),

  createShotTemplate(
    'special-pov',
    'POV (Vue Subjective)',
    'Point of View shot placing the audience in the character\'s eyes. Essential for immersive storytelling and reaction shorts.',
    'shorts',
    {
      type: 'pov',
      category: 'reaction',
      camera: {
        framing: 'medium',
        angle: 'eye-level',
        movement: {
          type: 'handheld',
          speed: 'slow',
        },
      },
      timing: {
        duration: 90,
        inPoint: 0,
        outPoint: 90,
        transition: 'cut',
        transitionDuration: 0,
      },
      composition: {
        characterIds: [],
        characterPositions: [],
        environmentId: '',
        props: [],
        lightingMood: 'natural',
        timeOfDay: 'day',
      }
    }
  ),
];

// ============================================================================
// Template Categories and Metadata
// ============================================================================

export const SHOT_TEMPLATE_CATEGORIES = {
  establishing: {
    name: 'Establishing',
    description: 'Shots that set the scene and provide context',
    icon: '🏞️',
    templates: SHOT_TEMPLATES.filter(t => t.category === 'establishing'),
  },
  action: {
    name: 'Action',
    description: 'Dynamic shots with movement and energy',
    icon: '💨',
    templates: SHOT_TEMPLATES.filter(t => t.category === 'action'),
  },
  dialogue: {
    name: 'Dialogue',
    description: 'Shots for character conversations and interactions',
    icon: '💬',
    templates: SHOT_TEMPLATES.filter(t => t.category === 'dialogue'),
  },
  reaction: {
    name: 'Reaction',
    description: 'Shots showing character responses and emotions',
    icon: '😊',
    templates: SHOT_TEMPLATES.filter(t => t.category === 'reaction'),
  },
  insert: {
    name: 'Insert',
    description: 'Detail shots of objects and specific elements',
    icon: '🔍',
    templates: SHOT_TEMPLATES.filter(t => t.category === 'insert'),
  },
  transition: {
    name: 'Transition',
    description: 'Shots that bridge different scenes or moments',
    icon: '🌅',
    templates: SHOT_TEMPLATES.filter(t => t.category === 'transition'),
  },
  custom: {
    name: 'Custom',
    description: 'Advanced and specialized shot techniques',
    icon: '🎭',
    templates: SHOT_TEMPLATES.filter(t => t.category === 'custom'),
  },
  shorts: {
    name: 'YouTube Shorts',
    description: 'Vertical 9:16 shots and special social media effects',
    icon: '📱',
    templates: SHOT_TEMPLATES.filter(t => t.id.includes('shorts') || t.id.includes('rewind')),
  },
} as const;

export const getShotTemplateById = (id: string): ShotTemplate | undefined => {
  return SHOT_TEMPLATES.find(template => template.id === id);
};

export const getShotTemplatesByCategory = (category: string): ShotTemplate[] => {
  return SHOT_TEMPLATES.filter(template => template.category === category);
};

export const getAllShotTemplates = (): ShotTemplate[] => {
  return [...SHOT_TEMPLATES];
};

export const getFeaturedShotTemplates = (): ShotTemplate[] => {
  // Return the most commonly used shot templates
  return ['establishing-wide', 'dialogue-over-shoulder', 'action-dynamic', 'reaction-close-up'].map(id =>
    SHOT_TEMPLATES.find(t => t.id === id)
  ).filter(Boolean) as ShotTemplate[];
};
