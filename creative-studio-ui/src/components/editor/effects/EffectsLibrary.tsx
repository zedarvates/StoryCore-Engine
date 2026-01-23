import React, { useState } from 'react';
import {
  Palette,
  Sun,
  Moon,
  Zap,
  RotateCw,
  Move,
  Clock,
  Filter,
  Sparkles,
  Droplet,
  Flame,
  Eye,
  Camera,
  Film,
  Music,
  Wind,
  Snowflake,
  Heart,
  Star,
  Zap as Lightning,
  Waves,
  Mountain,
  TreePine,
  Cloud,
  Rainbow,
  Gem,
  Crown,
  Wand2,
  Scissors,
  Timer,
  Rewind,
  FastForward,
  Play,
  Pause,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Maximize,
  Minimize,
  Move3D,
  Box,
  Circle,
  Square,
  Triangle,
  Hexagon,
  Pentagon,
  Diamond,
  Search,
  X,
} from 'lucide-react';
import './EffectsLibrary.css';

export interface EffectKeyframe {
  id: string;
  time: number; // in seconds
  value: number; // 0-1 normalized value
  interpolation: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export interface Effect {
  id: string;
  name: string;
  category: 'color' | 'creative' | 'transform' | 'temporal' | 'blur' | 'stylize';
  icon: React.ReactNode;
  description: string;
  parameters: EffectParameter[];
  preview?: string;
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

interface EffectsLibraryProps {
  onEffectSelect: (effect: Effect) => void;
  selectedEffects?: Effect[];
  className?: string;
}

const EFFECTS_DATA: Effect[] = [
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

const CATEGORIES = [
  { id: 'color', name: 'Couleur', icon: <Palette size={16} />, color: '#3b82f6' },
  { id: 'creative', name: 'Créatif', icon: <Sparkles size={16} />, color: '#8b5cf6' },
  { id: 'transform', name: 'Transformation', icon: <Move size={16} />, color: '#10b981' },
  { id: 'temporal', name: 'Temporel', icon: <Clock size={16} />, color: '#f59e0b' },
  { id: 'blur', name: 'Flou', icon: <Cloud size={16} />, color: '#6b7280' },
  { id: 'stylize', name: 'Style', icon: <Wand2 size={16} />, color: '#ef4444' }
];

export const EffectsLibrary: React.FC<EffectsLibraryProps> = ({
  onEffectSelect,
  selectedEffects = [],
  className = ''
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('color');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEffects = EFFECTS_DATA.filter(effect => {
    const matchesCategory = effect.category === selectedCategory;
    const matchesSearch = effect.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         effect.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && (searchTerm === '' || matchesSearch);
  });

  const isEffectSelected = (effectId: string) => {
    return selectedEffects.some(effect => effect.id === effectId);
  };

  return (
    <div className={`effects-library ${className}`}>
      <div className="effects-header">
        <h3 className="effects-title">
          <Filter size={18} />
          Bibliothèque d'Effets
        </h3>

        <div className="effects-search">
          <Search size={14} />
          <input
            type="text"
            placeholder="Rechercher un effet..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              className="search-clear"
              onClick={() => setSearchTerm('')}
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="effects-categories">
        {CATEGORIES.map(category => (
          <button
            key={category.id}
            className={`category-tab ${selectedCategory === category.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(category.id)}
            style={{ '--category-color': category.color } as React.CSSProperties}
          >
            {category.icon}
            <span>{category.name}</span>
          </button>
        ))}
      </div>

      <div className="effects-grid">
        {filteredEffects.map(effect => (
          <div
            key={effect.id}
            className={`effect-item ${isEffectSelected(effect.id) ? 'selected' : ''}`}
            onClick={() => onEffectSelect(effect)}
          >
            <div className="effect-icon">
              {effect.icon}
            </div>

            <div className="effect-info">
              <h4 className="effect-name">{effect.name}</h4>
              <p className="effect-description">{effect.description}</p>
            </div>

            {isEffectSelected(effect.id) && (
              <div className="effect-selected-indicator">
                <div className="selected-badge">✓</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredEffects.length === 0 && (
        <div className="no-effects">
          <Filter size={24} />
          <p>Aucun effet trouvé</p>
          <small>Essayez de modifier votre recherche</small>
        </div>
      )}
    </div>
  );
};