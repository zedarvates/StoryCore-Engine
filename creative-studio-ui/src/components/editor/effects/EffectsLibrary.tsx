import React, { useState } from 'react';
import { Search, X, Filter } from 'lucide-react';
import './EffectsLibrary.css';
import { EFFECTS_DATA, CATEGORIES } from './constants';

import { Effect, EffectParameter, EffectKeyframe } from '@/types/effect';

export type { Effect, EffectParameter, EffectKeyframe };

interface EffectsLibraryProps {
  onEffectSelect: (effect: Effect) => void;
  selectedEffects?: Effect[];
  className?: string;
}

// Data moved to constants.ts

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
