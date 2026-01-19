import React, { useState } from 'react';
import { Wand2, Search, Filter, Sparkles } from 'lucide-react';
import type { AudioTrack } from '../types';
import {
  AUDIO_EFFECT_PRESETS,
  getAudioEffectPresetsByCategory,
  searchAudioEffectPresets,
  suggestAudioEffectPreset,
  getAudioEffectPresetCategories,
  type AudioEffectPreset,
} from '../utils/audioEffectPresets';

interface AudioEffectPresetsPanelProps {
  track: AudioTrack;
  sceneDescription?: string;
  onApplyPreset: (preset: AudioEffectPreset) => void;
}

/**
 * AudioEffectPresetsPanel - Browse and apply audio effect presets
 * 
 * Features:
 * - Categorized preset browser
 * - Search by name/keywords
 * - AI-powered preset suggestion based on scene
 * - One-click preset application
 * - Reverb/echo presets for different environments
 * 
 * Includes presets for:
 * - Reverb: Cave, Church, Well, Hall, Room, Canyon, Tunnel, Forest
 * - Spatial: Underwater, Telephone, Megaphone, Robot, Walkie-Talkie
 * - Correction: Voice Enhancement, De-esser
 * - Dynamics: Bass Heavy, Bright Clear, Warm Smooth
 */
export const AudioEffectPresetsPanel: React.FC<AudioEffectPresetsPanelProps> = ({
  track,
  sceneDescription,
  onApplyPreset,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [suggestedPreset, setSuggestedPreset] = useState<AudioEffectPreset | null>(null);

  const categories = getAudioEffectPresetCategories();

  // Filter presets based on search and category
  const filteredPresets = React.useMemo(() => {
    let presets = AUDIO_EFFECT_PRESETS;

    if (searchQuery) {
      presets = searchAudioEffectPresets(searchQuery);
    } else if (selectedCategory) {
      presets = getAudioEffectPresetsByCategory(
        selectedCategory as AudioEffectPreset['category']
      );
    }

    return presets;
  }, [searchQuery, selectedCategory]);

  const handleAISuggest = () => {
    if (!sceneDescription) return;

    const suggested = suggestAudioEffectPreset(sceneDescription);
    setSuggestedPreset(suggested);
  };

  const handleApplyPreset = (preset: AudioEffectPreset) => {
    onApplyPreset(preset);
  };

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold">Presets d'Effets Audio</h3>
        </div>

        {sceneDescription && (
          <button
            onClick={handleAISuggest}
            className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Suggérer
          </button>
        )}
      </div>

      {/* AI Suggestion */}
      {suggestedPreset && (
        <div className="p-3 bg-purple-100 rounded-lg border border-purple-300">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-semibold text-purple-900">
                  Suggestion IA
                </span>
              </div>
              <p className="text-sm text-purple-800 mb-2">
                <span className="font-medium">{suggestedPreset.name}</span> -{' '}
                {suggestedPreset.description}
              </p>
            </div>
            <button
              onClick={() => handleApplyPreset(suggestedPreset)}
              className="px-3 py-1 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              Appliquer
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher un preset..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setSelectedCategory(null);
          }}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm"
        />
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
        <button
          onClick={() => {
            setSelectedCategory(null);
            setSearchQuery('');
          }}
          className={`px-3 py-1 text-sm rounded-md whitespace-nowrap ${
            !selectedCategory && !searchQuery
              ? 'bg-purple-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Tous
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => {
              setSelectedCategory(category.id);
              setSearchQuery('');
            }}
            className={`px-3 py-1 text-sm rounded-md whitespace-nowrap ${
              selectedCategory === category.id
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Presets Grid */}
      <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
        {filteredPresets.map((preset) => (
          <PresetCard
            key={preset.id}
            preset={preset}
            onApply={handleApplyPreset}
          />
        ))}
      </div>

      {filteredPresets.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">Aucun preset trouvé</p>
        </div>
      )}
    </div>
  );
};

/**
 * Preset card component
 */
interface PresetCardProps {
  preset: AudioEffectPreset;
  onApply: (preset: AudioEffectPreset) => void;
}

const PresetCard: React.FC<PresetCardProps> = ({ preset, onApply }) => {
  const categoryColors: Record<AudioEffectPreset['category'], string> = {
    reverb: 'bg-blue-100 text-blue-700',
    spatial: 'bg-green-100 text-green-700',
    creative: 'bg-purple-100 text-purple-700',
    correction: 'bg-orange-100 text-orange-700',
    dynamics: 'bg-pink-100 text-pink-700',
  };

  const categoryIcons: Record<AudioEffectPreset['category'], string> = {
    reverb: '🔊',
    spatial: '🌍',
    creative: '🎨',
    correction: '🔧',
    dynamics: '⚡',
  };

  return (
    <div
      className="bg-white p-3 rounded-lg border border-gray-200 hover:border-purple-400 transition-all cursor-pointer group"
      onClick={() => onApply(preset)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{categoryIcons[preset.category]}</span>
            <h4 className="text-sm font-semibold text-gray-900 group-hover:text-purple-600">
              {preset.name}
            </h4>
          </div>
          <span
            className={`text-xs px-2 py-0.5 rounded ${categoryColors[preset.category]}`}
          >
            {preset.category}
          </span>
        </div>
      </div>

      <p className="text-xs text-gray-600 mb-2">{preset.description}</p>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {preset.effects.length} effet{preset.effects.length > 1 ? 's' : ''}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onApply(preset);
          }}
          className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          Appliquer
        </button>
      </div>
    </div>
  );
};

/**
 * Compact preset selector for inline use
 */
export const AudioEffectPresetsCompact: React.FC<AudioEffectPresetsPanelProps> = ({
  track,
  sceneDescription,
  onApplyPreset,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleQuickSuggest = () => {
    if (!sceneDescription) return;

    const suggested = suggestAudioEffectPreset(sceneDescription);
    if (suggested) {
      onApplyPreset(suggested);
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center gap-2"
        >
          <Wand2 className="w-3 h-3" />
          Presets
        </button>

        {sceneDescription && (
          <button
            onClick={handleQuickSuggest}
            className="px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 flex items-center gap-2"
          >
            <Sparkles className="w-3 h-3" />
            Auto
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <AudioEffectPresetsPanel
            track={track}
            sceneDescription={sceneDescription}
            onApplyPreset={(preset) => {
              onApplyPreset(preset);
              setIsOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
};
