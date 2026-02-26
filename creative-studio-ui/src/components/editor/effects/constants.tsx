import React from 'react';
import {
  Sun,
  Moon,
  Zap,
  RotateCw,
  Move,
  Clock,
  Sparkles,
  Droplet,
  Flame,
  Eye,
  Camera,
  Film,
  Rainbow,
  Cloud,
  FlipHorizontal,
  FlipVertical,
  Maximize,
  Rewind,
  Pause,
  Wind,
  Palette,
  Square,
  Wand2,
} from 'lucide-react';
import { Effect } from '@/types/effect';

export const EFFECTS_DATA: Effect[] = [
  // Color Correction
  {
    id: 'brightness',
    name: 'Luminosité',
    category: 'color',
    icon: <Sun size={16} />,
    description: 'Ajuste la luminosité de l\'image',
    parameters: [
      { id: 'brightness', name: 'Luminosité', type: 'range', value: 0, min: -100, max: 100, step: 1, unit: '%' }
    ]
  },
  {
    id: 'contrast',
    name: 'Contraste',
    category: 'color',
    icon: <Moon size={16} />,
    description: 'Ajuste le contraste de l\'image',
    parameters: [
      { id: 'contrast', name: 'Contraste', type: 'range', value: 0, min: -100, max: 100, step: 1, unit: '%' }
    ]
  },
  {
    id: 'saturation',
    name: 'Saturation',
    category: 'color',
    icon: <Droplet size={16} />,
    description: 'Ajuste la saturation des couleurs',
    parameters: [
      { id: 'saturation', name: 'Saturation', type: 'range', value: 0, min: -100, max: 100, step: 1, unit: '%' }
    ]
  },
  {
    id: 'hue',
    name: 'Teinte',
    category: 'color',
    icon: <Rainbow size={16} />,
    description: 'Change la teinte globale',
    parameters: [
      { id: 'hue', name: 'Teinte', type: 'range', value: 0, min: 0, max: 360, step: 1, unit: '°' }
    ]
  },
  {
    id: 'temperature',
    name: 'Température',
    category: 'color',
    icon: <Flame size={16} />,
    description: 'Ajuste la température de couleur',
    parameters: [
      { id: 'temperature', name: 'Température', type: 'range', value: 0, min: -100, max: 100, step: 1, unit: '%' }
    ]
  },

  // Creative Filters
  {
    id: 'vintage',
    name: 'Vintage',
    category: 'creative',
    icon: <Camera size={16} />,
    description: 'Effet photo vintage avec tons sépia',
    parameters: [
      { id: 'intensity', name: 'Intensité', type: 'range', value: 50, min: 0, max: 100, step: 1, unit: '%' }
    ]
  },
  {
    id: 'cinematic',
    name: 'Cinématique',
    category: 'creative',
    icon: <Film size={16} />,
    description: 'Look cinématographique professionnel',
    parameters: [
      { id: 'intensity', name: 'Intensité', type: 'range', value: 50, min: 0, max: 100, step: 1, unit: '%' }
    ]
  },
  {
    id: 'noir_blanc',
    name: 'Noir & Blanc',
    category: 'creative',
    icon: <Eye size={16} />,
    description: 'Conversion en noir et blanc',
    parameters: [
      { id: 'contrast', name: 'Contraste', type: 'range', value: 0, min: -50, max: 50, step: 1, unit: '%' }
    ]
  },
  {
    id: 'sepia',
    name: 'Sépia',
    category: 'creative',
    icon: <Palette size={16} />,
    description: 'Teinte sépia classique',
    parameters: [
      { id: 'intensity', name: 'Intensité', type: 'range', value: 50, min: 0, max: 100, step: 1, unit: '%' }
    ]
  },
  {
    id: 'dreamy',
    name: 'Rêveur',
    category: 'creative',
    icon: <Sparkles size={16} />,
    description: 'Effet doux et onirique',
    parameters: [
      { id: 'blur', name: 'Flou', type: 'range', value: 2, min: 0, max: 10, step: 0.1, unit: 'px' },
      { id: 'glow', name: 'Lueur', type: 'range', value: 20, min: 0, max: 100, step: 1, unit: '%' }
    ]
  },

  // Transform Effects
  {
    id: 'rotation',
    name: 'Rotation',
    category: 'transform',
    icon: <RotateCw size={16} />,
    description: 'Fait pivoter l\'élément',
    parameters: [
      { id: 'angle', name: 'Angle', type: 'range', value: 0, min: -180, max: 180, step: 1, unit: '°' }
    ]
  },
  {
    id: 'scale',
    name: 'Échelle',
    category: 'transform',
    icon: <Maximize size={16} />,
    description: 'Change la taille de l\'élément',
    parameters: [
      { id: 'scaleX', name: 'Échelle X', type: 'range', value: 100, min: 10, max: 300, step: 1, unit: '%' },
      { id: 'scaleY', name: 'Échelle Y', type: 'range', value: 100, min: 10, max: 300, step: 1, unit: '%' }
    ]
  },
  {
    id: 'position',
    name: 'Position',
    category: 'transform',
    icon: <Move size={16} />,
    description: 'Déplace l\'élément',
    parameters: [
      { id: 'x', name: 'Position X', type: 'range', value: 0, min: -100, max: 100, step: 1, unit: '%' },
      { id: 'y', name: 'Position Y', type: 'range', value: 0, min: -100, max: 100, step: 1, unit: '%' }
    ]
  },
  {
    id: 'flip_horizontal',
    name: 'Retourner H',
    category: 'transform',
    icon: <FlipHorizontal size={16} />,
    description: 'Retourner horizontalement',
    parameters: [
      { id: 'enabled', name: 'Activé', type: 'boolean', value: false }
    ]
  },
  {
    id: 'flip_vertical',
    name: 'Retourner V',
    category: 'transform',
    icon: <FlipVertical size={16} />,
    description: 'Retourner verticalement',
    parameters: [
      { id: 'enabled', name: 'Activé', type: 'boolean', value: false }
    ]
  },

  // Temporal Effects
  {
    id: 'speed_ramp',
    name: 'Rampe Vitesse',
    category: 'temporal',
    icon: <Zap size={16} />,
    description: 'Change progressivement la vitesse',
    parameters: [
      { id: 'startSpeed', name: 'Vitesse Début', type: 'range', value: 100, min: 10, max: 200, step: 1, unit: '%' },
      { id: 'endSpeed', name: 'Vitesse Fin', type: 'range', value: 100, min: 10, max: 200, step: 1, unit: '%' }
    ]
  },
  {
    id: 'reverse',
    name: 'Inverser',
    category: 'temporal',
    icon: <Rewind size={16} />,
    description: 'Joue la vidéo à l\'envers',
    parameters: [
      { id: 'enabled', name: 'Activé', type: 'boolean', value: false }
    ]
  },
  {
    id: 'freeze_frame',
    name: 'Image Figée',
    category: 'temporal',
    icon: <Pause size={16} />,
    description: 'Figer une image pendant une durée',
    parameters: [
      { id: 'duration', name: 'Durée', type: 'range', value: 2, min: 0.1, max: 10, step: 0.1, unit: 's' }
    ]
  },

  // Blur Effects
  {
    id: 'gaussian_blur',
    name: 'Flou Gaussien',
    category: 'blur',
    icon: <Cloud size={16} />,
    description: 'Flou gaussien classique',
    parameters: [
      { id: 'radius', name: 'Rayon', type: 'range', value: 5, min: 0, max: 50, step: 0.1, unit: 'px' }
    ]
  },
  {
    id: 'motion_blur',
    name: 'Flou Mouvement',
    category: 'blur',
    icon: <Wind size={16} />,
    description: 'Effet de flou de mouvement',
    parameters: [
      { id: 'angle', name: 'Angle', type: 'range', value: 0, min: 0, max: 360, step: 1, unit: '°' },
      { id: 'distance', name: 'Distance', type: 'range', value: 10, min: 0, max: 100, step: 1, unit: 'px' }
    ]
  },

  // Stylize Effects
  {
    id: 'posterize',
    name: 'Postériser',
    category: 'stylize',
    icon: <Palette size={16} />,
    description: 'Effet de postérisation',
    parameters: [
      { id: 'levels', name: 'Niveaux', type: 'range', value: 4, min: 2, max: 16, step: 1 }
    ]
  },
  {
    id: 'pixelate',
    name: 'Pixéliser',
    category: 'stylize',
    icon: <Square size={16} />,
    description: 'Effet de pixélisation',
    parameters: [
      { id: 'size', name: 'Taille', type: 'range', value: 8, min: 2, max: 32, step: 1, unit: 'px' }
    ]
  },
  {
    id: 'glitch',
    name: 'Glitch',
    category: 'stylize',
    icon: <Zap size={16} />,
    description: 'Effet glitch numérique',
    parameters: [
      { id: 'intensity', name: 'Intensité', type: 'range', value: 30, min: 0, max: 100, step: 1, unit: '%' }
    ]
  }
];

export const CATEGORIES = [
  { id: 'color', name: 'Couleur', icon: <Palette size={16} />, color: '#3b82f6' },
  { id: 'creative', name: 'Créatif', icon: <Sparkles size={16} />, color: '#8b5cf6' },
  { id: 'transform', name: 'Transformation', icon: <Move size={16} />, color: '#10b981' },
  { id: 'temporal', name: 'Temporel', icon: <Clock size={16} />, color: '#f59e0b' },
  { id: 'blur', name: 'Flou', icon: <Cloud size={16} />, color: '#6b7280' },
  { id: 'stylize', name: 'Style', icon: <Wand2 size={16} />, color: '#ef4444' }
];
