import type { AudioEffect } from '../types';

/**
 * Audio effect preset definition
 */
export interface AudioEffectPreset {
  id: string;
  name: string;
  description: string;
  category: 'reverb' | 'spatial' | 'creative' | 'correction' | 'dynamics';
  effects: Omit<AudioEffect, 'id'>[];
  keywords: string[];
  icon?: string;
}

/**
 * Built-in audio effect presets
 * Includes reverb/echo presets for different environments
 */
export const AUDIO_EFFECT_PRESETS: AudioEffectPreset[] = [
  // ============================================================================
  // REVERB / ECHO PRESETS
  // ============================================================================
  {
    id: 'echo-cave',
    name: 'Écho Caverne',
    description: 'Réverbération profonde et sombre comme dans une grotte',
    category: 'reverb',
    keywords: ['cave', 'caverne', 'grotte', 'underground', 'souterrain', 'dark', 'sombre'],
    effects: [
      {
        type: 'reverb',
        enabled: true,
        parameters: {
          roomSize: 0.9,
          damping: 0.3,
          wetLevel: 0.6,
          dryLevel: 0.4,
          preDelay: 50,
          decay: 4.5,
        },
      },
      {
        type: 'eq',
        enabled: true,
        parameters: {
          lowGain: 3,
          midGain: -2,
          highGain: -4,
        },
      },
    ],
  },
  {
    id: 'echo-church',
    name: 'Écho Église',
    description: 'Réverbération majestueuse et claire comme dans une cathédrale',
    category: 'reverb',
    keywords: ['church', 'église', 'cathedral', 'cathédrale', 'temple', 'religious', 'religieux'],
    effects: [
      {
        type: 'reverb',
        enabled: true,
        parameters: {
          roomSize: 0.95,
          damping: 0.5,
          wetLevel: 0.5,
          dryLevel: 0.5,
          preDelay: 80,
          decay: 6.0,
        },
      },
      {
        type: 'eq',
        enabled: true,
        parameters: {
          lowGain: 2,
          midGain: 1,
          highGain: 3,
        },
      },
    ],
  },
  {
    id: 'echo-well',
    name: 'Écho Puits Sans Fond',
    description: 'Réverbération profonde avec délai long, comme dans un puits',
    category: 'reverb',
    keywords: ['well', 'puits', 'deep', 'profond', 'bottomless', 'sans fond', 'shaft'],
    effects: [
      {
        type: 'reverb',
        enabled: true,
        parameters: {
          roomSize: 0.85,
          damping: 0.2,
          wetLevel: 0.7,
          dryLevel: 0.3,
          preDelay: 120,
          decay: 8.0,
        },
      },
      {
        type: 'eq',
        enabled: true,
        parameters: {
          lowGain: 4,
          midGain: -3,
          highGain: -6,
        },
      },
    ],
  },
  {
    id: 'echo-hall',
    name: 'Écho Grande Salle',
    description: 'Réverbération spacieuse comme dans un hall ou auditorium',
    category: 'reverb',
    keywords: ['hall', 'salle', 'auditorium', 'concert', 'large', 'grand', 'spacious'],
    effects: [
      {
        type: 'reverb',
        enabled: true,
        parameters: {
          roomSize: 0.8,
          damping: 0.6,
          wetLevel: 0.45,
          dryLevel: 0.55,
          preDelay: 40,
          decay: 3.5,
        },
      },
    ],
  },
  {
    id: 'echo-room',
    name: 'Écho Petite Pièce',
    description: 'Réverbération courte et intime comme dans une chambre',
    category: 'reverb',
    keywords: ['room', 'pièce', 'chambre', 'bedroom', 'small', 'petit', 'intimate'],
    effects: [
      {
        type: 'reverb',
        enabled: true,
        parameters: {
          roomSize: 0.3,
          damping: 0.7,
          wetLevel: 0.25,
          dryLevel: 0.75,
          preDelay: 10,
          decay: 0.8,
        },
      },
    ],
  },
  {
    id: 'echo-canyon',
    name: 'Écho Canyon',
    description: 'Réverbération ouverte avec délais multiples comme dans un canyon',
    category: 'reverb',
    keywords: ['canyon', 'gorge', 'valley', 'vallée', 'outdoor', 'extérieur', 'mountain'],
    effects: [
      {
        type: 'reverb',
        enabled: true,
        parameters: {
          roomSize: 0.75,
          damping: 0.4,
          wetLevel: 0.55,
          dryLevel: 0.45,
          preDelay: 100,
          decay: 5.0,
        },
      },
      {
        type: 'eq',
        enabled: true,
        parameters: {
          lowGain: -2,
          midGain: 2,
          highGain: 1,
        },
      },
    ],
  },
  {
    id: 'echo-tunnel',
    name: 'Écho Tunnel',
    description: 'Réverbération métallique et résonnante comme dans un tunnel',
    category: 'reverb',
    keywords: ['tunnel', 'subway', 'métro', 'underground', 'souterrain', 'passage'],
    effects: [
      {
        type: 'reverb',
        enabled: true,
        parameters: {
          roomSize: 0.7,
          damping: 0.3,
          wetLevel: 0.6,
          dryLevel: 0.4,
          preDelay: 30,
          decay: 3.0,
        },
      },
      {
        type: 'eq',
        enabled: true,
        parameters: {
          lowGain: 1,
          midGain: 3,
          highGain: -1,
        },
      },
    ],
  },
  {
    id: 'echo-forest',
    name: 'Écho Forêt',
    description: 'Réverbération naturelle et diffuse comme en forêt',
    category: 'reverb',
    keywords: ['forest', 'forêt', 'woods', 'bois', 'nature', 'trees', 'arbres'],
    effects: [
      {
        type: 'reverb',
        enabled: true,
        parameters: {
          roomSize: 0.6,
          damping: 0.8,
          wetLevel: 0.35,
          dryLevel: 0.65,
          preDelay: 20,
          decay: 2.0,
        },
      },
      {
        type: 'eq',
        enabled: true,
        parameters: {
          lowGain: 1,
          midGain: 0,
          highGain: -2,
        },
      },
    ],
  },

  // ============================================================================
  // SPATIAL / CREATIVE PRESETS
  // ============================================================================
  {
    id: 'underwater',
    name: 'Sous l\'Eau',
    description: 'Effet étouffé et filtré comme sous l\'eau',
    category: 'spatial',
    keywords: ['underwater', 'sous eau', 'ocean', 'océan', 'sea', 'mer', 'diving'],
    effects: [
      {
        type: 'eq',
        enabled: true,
        parameters: {
          lowGain: 4,
          midGain: -6,
          highGain: -12,
        },
      },
      {
        type: 'reverb',
        enabled: true,
        parameters: {
          roomSize: 0.5,
          damping: 0.9,
          wetLevel: 0.5,
          dryLevel: 0.5,
          preDelay: 15,
          decay: 2.5,
        },
      },
    ],
  },
  {
    id: 'telephone',
    name: 'Téléphone',
    description: 'Son filtré comme à travers un téléphone',
    category: 'creative',
    keywords: ['telephone', 'téléphone', 'phone', 'call', 'appel', 'radio'],
    effects: [
      {
        type: 'eq',
        enabled: true,
        parameters: {
          lowGain: -12,
          midGain: 6,
          highGain: -8,
        },
      },
      {
        type: 'distortion',
        enabled: true,
        parameters: {
          distortion: 15,
          distortionType: 'soft',
        },
      },
    ],
  },
  {
    id: 'megaphone',
    name: 'Mégaphone',
    description: 'Son amplifié et distordu comme à travers un mégaphone',
    category: 'creative',
    keywords: ['megaphone', 'mégaphone', 'loudspeaker', 'haut-parleur', 'announcement'],
    effects: [
      {
        type: 'gain',
        enabled: true,
        parameters: {
          gain: 6,
        },
      },
      {
        type: 'distortion',
        enabled: true,
        parameters: {
          distortion: 25,
          distortionType: 'hard',
        },
      },
      {
        type: 'eq',
        enabled: true,
        parameters: {
          lowGain: -6,
          midGain: 8,
          highGain: -4,
        },
      },
    ],
  },
  {
    id: 'robot',
    name: 'Voix Robot',
    description: 'Effet robotique et métallique',
    category: 'creative',
    keywords: ['robot', 'robotic', 'robotique', 'mechanical', 'mécanique', 'ai', 'artificial'],
    effects: [
      {
        type: 'distortion',
        enabled: true,
        parameters: {
          distortion: 35,
          distortionType: 'tube',
        },
      },
      {
        type: 'eq',
        enabled: true,
        parameters: {
          lowGain: -4,
          midGain: 2,
          highGain: 6,
        },
      },
    ],
  },
  {
    id: 'walkie-talkie',
    name: 'Talkie-Walkie',
    description: 'Son compressé comme à travers un talkie-walkie',
    category: 'creative',
    keywords: ['walkie', 'talkie', 'radio', 'military', 'militaire', 'communication'],
    effects: [
      {
        type: 'compressor',
        enabled: true,
        parameters: {
          ratio: 8,
          attack: 5,
        },
      },
      {
        type: 'eq',
        enabled: true,
        parameters: {
          lowGain: -10,
          midGain: 8,
          highGain: -6,
        },
      },
      {
        type: 'noise-reduction',
        enabled: true,
        parameters: {
          noiseFloor: -30,
        },
      },
    ],
  },

  // ============================================================================
  // CORRECTION / DYNAMICS PRESETS
  // ============================================================================
  {
    id: 'voice-enhance',
    name: 'Amélioration Voix',
    description: 'Optimise la clarté et la présence de la voix',
    category: 'correction',
    keywords: ['voice', 'voix', 'speech', 'parole', 'dialogue', 'clarity', 'clarté'],
    effects: [
      {
        type: 'voice-clarity',
        enabled: true,
        parameters: {
          intensity: 80,
        },
      },
      {
        type: 'compressor',
        enabled: true,
        parameters: {
          ratio: 3,
          attack: 10,
        },
      },
    ],
  },
  {
    id: 'de-esser',
    name: 'Réduction Sibilance',
    description: 'Réduit les sons "s" et "ch" trop prononcés',
    category: 'correction',
    keywords: ['sibilance', 'de-esser', 'harsh', 'aigus', 'treble'],
    effects: [
      {
        type: 'eq',
        enabled: true,
        parameters: {
          lowGain: 0,
          midGain: 0,
          highGain: -6,
        },
      },
      {
        type: 'compressor',
        enabled: true,
        parameters: {
          ratio: 6,
          attack: 3,
        },
      },
    ],
  },
  {
    id: 'bass-heavy',
    name: 'Basses Puissantes',
    description: 'Renforce les basses fréquences pour plus d\'impact',
    category: 'dynamics',
    keywords: ['bass', 'basse', 'low', 'grave', 'impact', 'punch', 'heavy'],
    effects: [
      {
        type: 'bass-boost',
        enabled: true,
        parameters: {
          bassFrequency: 80,
          bassGain: 8,
          bassQ: 1.5,
        },
      },
      {
        type: 'limiter',
        enabled: true,
        parameters: {
          threshold: -6,
          ceiling: -1,
          release: 100,
        },
      },
    ],
  },
  {
    id: 'bright-clear',
    name: 'Clair et Brillant',
    description: 'Augmente les hautes fréquences pour plus de clarté',
    category: 'dynamics',
    keywords: ['bright', 'brillant', 'clear', 'clair', 'crisp', 'high', 'aigu'],
    effects: [
      {
        type: 'treble-boost',
        enabled: true,
        parameters: {
          trebleFrequency: 8000,
          trebleGain: 6,
          trebleQ: 1.0,
        },
      },
      {
        type: 'eq',
        enabled: true,
        parameters: {
          lowGain: -2,
          midGain: 1,
          highGain: 4,
        },
      },
    ],
  },
  {
    id: 'warm-smooth',
    name: 'Chaud et Doux',
    description: 'Son chaleureux avec basses douces',
    category: 'dynamics',
    keywords: ['warm', 'chaud', 'smooth', 'doux', 'soft', 'mellow'],
    effects: [
      {
        type: 'bass-boost',
        enabled: true,
        parameters: {
          bassFrequency: 120,
          bassGain: 4,
          bassQ: 0.8,
        },
      },
      {
        type: 'eq',
        enabled: true,
        parameters: {
          lowGain: 3,
          midGain: 1,
          highGain: -2,
        },
      },
    ],
  },
];

/**
 * Get preset by ID
 */
export function getAudioEffectPresetById(id: string): AudioEffectPreset | undefined {
  return AUDIO_EFFECT_PRESETS.find((p) => p.id === id);
}

/**
 * Get presets by category
 */
export function getAudioEffectPresetsByCategory(
  category: AudioEffectPreset['category']
): AudioEffectPreset[] {
  return AUDIO_EFFECT_PRESETS.filter((p) => p.category === category);
}

/**
 * Search presets by keywords
 */
export function searchAudioEffectPresets(query: string): AudioEffectPreset[] {
  const lowerQuery = query.toLowerCase();
  return AUDIO_EFFECT_PRESETS.filter(
    (preset) =>
      preset.name.toLowerCase().includes(lowerQuery) ||
      preset.description.toLowerCase().includes(lowerQuery) ||
      preset.keywords.some((keyword) => keyword.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Suggest preset based on scene description
 */
export function suggestAudioEffectPreset(sceneText: string): AudioEffectPreset | null {
  const lowerText = sceneText.toLowerCase();

  // Find preset with most keyword matches
  let bestMatch: AudioEffectPreset | null = null;
  let maxMatches = 0;

  for (const preset of AUDIO_EFFECT_PRESETS) {
    let matches = 0;
    for (const keyword of preset.keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        matches++;
      }
    }

    if (matches > maxMatches) {
      maxMatches = matches;
      bestMatch = preset;
    }
  }

  return maxMatches > 0 ? bestMatch : null;
}

/**
 * Get all preset categories
 */
export function getAudioEffectPresetCategories(): Array<{
  id: AudioEffectPreset['category'];
  name: string;
  description: string;
}> {
  return [
    {
      id: 'reverb',
      name: 'Réverbération',
      description: 'Effets d\'écho et d\'espace',
    },
    {
      id: 'spatial',
      name: 'Spatial',
      description: 'Effets de positionnement et d\'environnement',
    },
    {
      id: 'creative',
      name: 'Créatif',
      description: 'Effets artistiques et stylisés',
    },
    {
      id: 'correction',
      name: 'Correction',
      description: 'Amélioration et nettoyage audio',
    },
    {
      id: 'dynamics',
      name: 'Dynamique',
      description: 'Contrôle des fréquences et du volume',
    },
  ];
}
