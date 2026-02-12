import React, { useState, useCallback } from 'react';
import { Filter, Star, Heart, Zap, Camera, Film, Palette, Sparkles, Moon, Sun, Coffee, Gamepad2 } from 'lucide-react';
import './FilterLibrary.css';

interface FilterPreset {
  id: string;
  name: string;
  description: string;
  category: 'basic' | 'cinematic' | 'vintage' | 'artistic' | 'color' | 'mood';
  icon: React.ReactNode;
  preview: string;
  parameters: {
    brightness: number;
    contrast: number;
    saturation: number;
    hue: number;
    warmth?: number;
    tint?: number;
    vignette?: number;
    grain?: number;
    blur?: number;
    sharpness?: number;
  };
  popular?: boolean;
}

interface FilterLibraryProps {
  onFilterSelect: (filter: FilterPreset) => void;
  selectedFilter?: FilterPreset;
}

const FILTER_PRESETS: FilterPreset[] = [
  // Basic Filters
  {
    id: 'none',
    name: 'Original',
    description: 'No filter applied',
    category: 'basic',
    icon: <Camera size={16} />,
    preview: '📷',
    parameters: { brightness: 0, contrast: 0, saturation: 0, hue: 0 }
  },
  {
    id: 'bright',
    name: 'Bright & Vibrant',
    description: 'Enhanced colors and brightness',
    category: 'basic',
    icon: <Sun size={16} />,
    preview: '☀️',
    parameters: { brightness: 10, contrast: 15, saturation: 20, hue: 0 }
  },
  {
    id: 'soft',
    name: 'Soft & Warm',
    description: 'Gentle warming with reduced contrast',
    category: 'basic',
    icon: <Heart size={16} />,
    preview: '💕',
    parameters: { brightness: 5, contrast: -10, saturation: -5, hue: 0, warmth: 15 }
  },

  // Cinematic Filters
  {
    id: 'cinematic',
    name: 'Cinematic',
    description: 'Hollywood movie look with rich contrast',
    category: 'cinematic',
    icon: <Film size={16} />,
    preview: '🎬',
    popular: true,
    parameters: {
      brightness: -5,
      contrast: 25,
      saturation: 10,
      hue: 0,
      vignette: 20,
      sharpness: 15
    }
  },
  {
    id: 'teal-orange',
    name: 'Teal & Orange',
    description: 'Classic block-buster look with warm skin and teal shadows',
    category: 'cinematic',
    icon: <Film size={16} />,
    preview: '🎞️',
    popular: true,
    parameters: {
      brightness: 0,
      contrast: 30,
      saturation: 15,
      hue: 15,
      tint: -20,
      warmth: 10,
    }
  },
  {
    id: 'bleach-bypass',
    name: 'Bleach Bypass',
    description: 'High contrast, low saturation gritty film look',
    category: 'cinematic',
    icon: <Film size={16} />,
    preview: '🏭',
    parameters: {
      brightness: -10,
      contrast: 50,
      saturation: -40,
      hue: 0,
      sharpness: 20,
      grain: 25
    }
  },
  {
    id: 'technicolor',
    name: 'Technicolor',
    description: 'Vibrant, over-saturated early color film aesthetic',
    category: 'cinematic',
    icon: <Palette size={16} />,
    preview: '🌈',
    parameters: {
      brightness: 5,
      contrast: 20,
      saturation: 60,
      hue: -5,
      warmth: 5
    }
  },
  {
    id: 'moody',
    name: 'Moody Blues',
    description: 'Cool tones with high contrast',
    category: 'cinematic',
    icon: <Moon size={16} />,
    preview: '🌙',
    parameters: {
      brightness: -10,
      contrast: 30,
      saturation: -20,
      hue: 220,
      vignette: 25
    }
  },
  {
    id: 'noir',
    name: 'Film Noir',
    description: 'Classic black and white with high contrast',
    category: 'cinematic',
    icon: <Zap size={16} />,
    preview: '⚡',
    parameters: {
      brightness: -15,
      contrast: 40,
      saturation: -100,
      hue: 0,
      grain: 20,
      vignette: 30
    }
  },

  // Vintage Filters
  {
    id: 'vintage-70s',
    name: '70s Retro',
    description: 'Warm, saturated colors with film grain',
    category: 'vintage',
    icon: <Coffee size={16} />,
    preview: '🕺',
    popular: true,
    parameters: {
      brightness: 5,
      contrast: 10,
      saturation: 25,
      hue: 15,
      warmth: 20,
      grain: 15,
      vignette: 10
    }
  },
  {
    id: 'kodachrome',
    name: 'Kodachrome',
    description: 'Classic slide film look',
    category: 'vintage',
    icon: <Camera size={16} />,
    preview: '📸',
    parameters: {
      brightness: 8,
      contrast: 20,
      saturation: 30,
      hue: 0,
      warmth: 10,
      grain: 8
    }
  },
  {
    id: 'polaroid',
    name: 'Polaroid',
    description: 'Instant camera aesthetic with warm tones',
    category: 'vintage',
    icon: <Heart size={16} />,
    preview: '📷',
    parameters: {
      brightness: -5,
      contrast: 15,
      saturation: 20,
      hue: 0,
      warmth: 25,
      vignette: 35,
      blur: 2
    }
  },

  // Artistic Filters
  {
    id: 'dreamy',
    name: 'Dreamy',
    description: 'Soft focus with pastel colors',
    category: 'artistic',
    icon: <Sparkles size={16} />,
    preview: '✨',
    parameters: {
      brightness: 5,
      contrast: -15,
      saturation: 15,
      hue: 0,
      blur: 3,
      warmth: 10
    }
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Blue',
    description: 'Electric blue and neon highlights',
    category: 'artistic',
    icon: <Gamepad2 size={16} />,
    preview: '🎮',
    parameters: {
      brightness: -5,
      contrast: 35,
      saturation: 40,
      hue: 280,
      sharpness: 20
    }
  },
  {
    id: 'cyber-pink',
    name: 'Night City Pink',
    description: 'Neon magenta and deep purples',
    category: 'artistic',
    icon: <Sparkles size={16} />,
    preview: '🌆',
    popular: true,
    parameters: {
      brightness: -5,
      contrast: 40,
      saturation: 50,
      hue: 320,
      vignette: 20
    }
  },
  {
    id: 'minimalist',
    name: 'Minimalist',
    description: 'Clean, high contrast black and white',
    category: 'artistic',
    icon: <Palette size={16} />,
    preview: '🎨',
    parameters: {
      brightness: 0,
      contrast: 50,
      saturation: -100,
      hue: 0,
      sharpness: 25
    }
  },

  // Color Filters
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    description: 'Warm, magical lighting',
    category: 'color',
    icon: <Sun size={16} />,
    preview: '🌅',
    popular: true,
    parameters: {
      brightness: 10,
      contrast: 15,
      saturation: 25,
      hue: 25,
      warmth: 30,
      vignette: 15
    }
  },
  {
    id: 'cool-blue',
    name: 'Cool Blue',
    description: 'Icy blue tones',
    category: 'color',
    icon: <Moon size={16} />,
    preview: '🧊',
    parameters: {
      brightness: -5,
      contrast: 10,
      saturation: 15,
      hue: 200,
      tint: -20
    }
  },

  // Mood Filters
  {
    id: 'dramatic',
    name: 'Dramatic',
    description: 'High contrast, moody atmosphere',
    category: 'mood',
    icon: <Zap size={16} />,
    preview: '⚡',
    parameters: {
      brightness: -10,
      contrast: 35,
      saturation: 10,
      hue: 0,
      vignette: 40,
      sharpness: 15
    }
  },
  {
    id: 'romantic',
    name: 'Romantic',
    description: 'Soft, warm, intimate feel',
    category: 'mood',
    icon: <Heart size={16} />,
    preview: '💕',
    parameters: {
      brightness: 5,
      contrast: -10,
      saturation: 20,
      hue: 0,
      warmth: 20,
      blur: 1,
      vignette: 20
    }
  }
];

export function FilterLibrary({ onFilterSelect, selectedFilter }: FilterLibraryProps) {
  const [activeCategory, setActiveCategory] = useState<'all' | FilterPreset['category']>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = [
    { id: 'all', name: 'All Filters', count: FILTER_PRESETS.length },
    { id: 'basic', name: 'Basic', count: FILTER_PRESETS.filter(f => f.category === 'basic').length },
    { id: 'cinematic', name: 'Cinematic', count: FILTER_PRESETS.filter(f => f.category === 'cinematic').length },
    { id: 'vintage', name: 'Vintage', count: FILTER_PRESETS.filter(f => f.category === 'vintage').length },
    { id: 'artistic', name: 'Artistic', count: FILTER_PRESETS.filter(f => f.category === 'artistic').length },
    { id: 'color', name: 'Color', count: FILTER_PRESETS.filter(f => f.category === 'color').length },
    { id: 'mood', name: 'Mood', count: FILTER_PRESETS.filter(f => f.category === 'mood').length },
  ];

  const filteredFilters = FILTER_PRESETS.filter(filter => {
    const matchesCategory = activeCategory === 'all' || filter.category === activeCategory;
    const matchesSearch = filter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      filter.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const popularFilters = FILTER_PRESETS.filter(f => f.popular);

  const handleFilterClick = useCallback((filter: FilterPreset) => {
    onFilterSelect(filter);
  }, [onFilterSelect]);

  return (
    <div className="filter-library">
      <div className="library-header">
        <h3>Filter Library</h3>
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search filters..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Filter size={16} />
        </div>
      </div>

      {/* Categories */}
      <div className="categories">
        {categories.map(category => (
          <button
            key={category.id}
            className={`category-tab ${activeCategory === category.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(category.id as any)}
          >
            {category.name}
            <span className="count">({category.count})</span>
          </button>
        ))}
      </div>

      {/* Popular Filters */}
      {activeCategory === 'all' && !searchTerm && (
        <div className="popular-section">
          <h4>
            <Star size={14} />
            Popular Filters
          </h4>
          <div className="popular-filters">
            {popularFilters.map(filter => (
              <div
                key={`popular-${filter.id}`}
                className={`filter-item popular ${selectedFilter?.id === filter.id ? 'selected' : ''}`}
                onClick={() => handleFilterClick(filter)}
              >
                <div className="filter-preview">
                  {filter.icon}
                  <span className="preview-emoji">{filter.preview}</span>
                </div>
                <div className="filter-info">
                  <span className="filter-name">{filter.name}</span>
                  <span className="filter-description">{filter.description}</span>
                </div>
                <div className="popular-badge">
                  <Star size={10} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Filters Grid */}
      <div className="filters-grid">
        {filteredFilters.map(filter => (
          <div
            key={filter.id}
            className={`filter-item ${selectedFilter?.id === filter.id ? 'selected' : ''}`}
            onClick={() => handleFilterClick(filter)}
          >
            <div className="filter-preview">
              {filter.icon}
              <span className="preview-emoji">{filter.preview}</span>
            </div>
            <div className="filter-info">
              <span className="filter-name">{filter.name}</span>
              <span className="filter-description">{filter.description}</span>
            </div>
            {filter.popular && (
              <div className="popular-indicator">
                <Star size={10} />
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredFilters.length === 0 && (
        <div className="no-filters">
          <Filter size={48} />
          <p>No filters found matching "{searchTerm}"</p>
          <button onClick={() => setSearchTerm('')}>Clear Search</button>
        </div>
      )}
    </div>
  );
}