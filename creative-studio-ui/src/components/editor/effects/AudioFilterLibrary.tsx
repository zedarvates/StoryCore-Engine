/**
 * Audio Filter Library Component
 * 
 * Provides a collection of audio effect presets for voice, music, and SFX.
 * These filters can be applied to generated audio assets.
 */

import React, { useState, useCallback } from 'react';
import {
    Volume2, Mic, Music, Waves,
    Wind, Ghost, Zap, Radio,
    Search, Check, Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import './AudioFilterLibrary.css';

interface AudioFilterPreset {
    id: string;
    name: string;
    description: string;
    category: 'voice' | 'environment' | 'special' | 'utility';
    icon: React.ReactNode;
    parameters: {
        reverb?: number;
        delay?: number;
        pitch?: number;
        echo?: number;
        bass?: number;
        treble?: number;
        distortion?: number;
        noise_reduction?: number;
    };
    popular?: boolean;
}

const AUDIO_PRESETS: AudioFilterPreset[] = [
    // Voice Filters
    {
        id: 'studio-voice',
        name: 'Voix Studio',
        description: 'Son clair et professionnel pour dialogues',
        category: 'voice',
        icon: <Mic size={16} />,
        parameters: { bass: 10, treble: 15, noise_reduction: 20 },
        popular: true,
    },
    {
        id: 'deep-voice',
        name: 'Voix Grave',
        description: 'Abaisse la tonalité pour un effet dramatique',
        category: 'voice',
        icon: <Volume2 size={16} />,
        parameters: { pitch: -20, bass: 30 },
    },
    {
        id: 'giant',
        name: 'Géant',
        description: 'Voix massive avec réverbération lente',
        category: 'voice',
        icon: <Ghost size={16} />,
        parameters: { pitch: -40, reverb: 60, bass: 50 },
    },
    {
        id: 'radio',
        name: 'Radio / Talkie',
        description: 'Effet de communication vintage saturée',
        category: 'voice',
        icon: <Radio size={16} />,
        parameters: { treble: 50, distortion: 30, bass: -20 },
        popular: true,
    },

    // Environment Filters
    {
        id: 'large-hall',
        name: 'Grande Salle',
        description: 'Immense réverbération de cathédrale',
        category: 'environment',
        icon: <Waves size={16} />,
        parameters: { reverb: 80, delay: 40 },
    },
    {
        id: 'small-room',
        name: 'Petite Pièce',
        description: 'Réflexions courtes et naturelles',
        category: 'environment',
        icon: <Mic size={16} />,
        parameters: { reverb: 15, delay: 5 },
    },
    {
        id: 'underwater',
        name: 'Sous l\'eau',
        description: 'Son étouffé avec bulles spectrales',
        category: 'environment',
        icon: <Waves size={16} />,
        parameters: { treble: -60, reverb: 40, delay: 10 },
    },

    // Special Effects
    {
        id: 'cybermatic',
        name: 'Cybermatique',
        description: 'Voix robotique avec glitches',
        category: 'special',
        icon: <Zap size={16} />,
        parameters: { distortion: 60, pitch: 10, delay: 20 },
        popular: true,
    },
    {
        id: 'ethereal',
        name: 'Éthéré',
        description: 'Voix fantomatique et aérienne',
        category: 'special',
        icon: <Wind size={16} />,
        parameters: { reverb: 90, delay: 60, treble: 20, pitch: 15 },
    },
];

interface AudioFilterLibraryProps {
    onFilterSelect: (filter: AudioFilterPreset) => void;
    selectedFilterId?: string;
}

export const AudioFilterLibrary: React.FC<AudioFilterLibraryProps> = ({
    onFilterSelect,
    selectedFilterId
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState<'all' | AudioFilterPreset['category']>('all');

    const filteredPresets = AUDIO_PRESETS.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="audio-filter-library">
            <div className="library-header">
                <div className="search-container">
                    <Search size={14} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Rechercher un effet audio..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="category-tabs">
                {(['all', 'voice', 'environment', 'special'] as const).map(cat => (
                    <button
                        key={cat}
                        className={cn("category-tab", activeCategory === cat && "active")}
                        onClick={() => setActiveCategory(cat)}
                    >
                        {cat === 'all' ? 'Tous' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                ))}
            </div>

            <div className="presets-list">
                {filteredPresets.map(preset => (
                    <div
                        key={preset.id}
                        className={cn(
                            "audio-preset-card",
                            selectedFilterId === preset.id && "selected",
                            preset.popular && "popular"
                        )}
                        onClick={() => onFilterSelect(preset)}
                    >
                        <div className="preset-icon-box">
                            {preset.icon}
                        </div>
                        <div className="preset-details">
                            <div className="preset-name">
                                {preset.name}
                                {preset.popular && <Star size={10} className="star-icon" />}
                            </div>
                            <div className="preset-desc">{preset.description}</div>
                        </div>
                        {selectedFilterId === preset.id && <Check size={16} className="check-icon" />}
                    </div>
                ))}
                {filteredPresets.length === 0 && (
                    <div className="no-results">Aucun effet trouvé.</div>
                )}
            </div>
        </div>
    );
};
