/**
 * Effect Library Panel Component
 * 
 * A unified library of high-quality presets for video and audio.
 * Complements the manual EffectPanel by providing "one-click" creative looks.
 */

import React, { useState } from 'react';
import { FilterLibrary } from './FilterLibrary';
import { AudioFilterLibrary } from './AudioFilterLibrary';
import { Film, Volume2, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import './EffectLibraryPanel.css';

interface EffectLibraryPanelProps {
    onVideoFilterSelect: (preset: unknown) => void;
    onAudioFilterSelect: (preset: unknown) => void;
    selectedVideoFilterId?: string;
    selectedAudioFilterId?: string;
    onClose?: () => void;
}

export const EffectLibraryPanel: React.FC<EffectLibraryPanelProps> = ({
    onVideoFilterSelect,
    onAudioFilterSelect,
    selectedVideoFilterId,
    selectedAudioFilterId,
    onClose
}) => {
    const [activeTab, setActiveTab] = useState<'visual' | 'audio'>('visual');

    return (
        <div className="effect-library-panel">
            <div className="panel-header">
                <div className="header-title">
                    <Sparkles size={18} className="sparkle-icon" />
                    <h2>Bibliothèque de Styles</h2>
                </div>
                {onClose && (
                    <button className="close-btn" onClick={onClose}>
                        <X size={18} />
                    </button>
                )}
            </div>

            <div className="library-tabs">
                <button
                    className={cn("lib-tab", activeTab === 'visual' && "active")}
                    onClick={() => setActiveTab('visual')}
                >
                    <Film size={16} />
                    <span>Visuels</span>
                </button>
                <button
                    className={cn("lib-tab", activeTab === 'audio' && "active")}
                    onClick={() => setActiveTab('audio')}
                >
                    <Volume2 size={16} />
                    <span>Audio</span>
                </button>
            </div>

            <div className="library-content">
                {activeTab === 'visual' ? (
                    <FilterLibrary
                        onFilterSelect={onVideoFilterSelect}
                        selectedFilter={undefined} // Map ID to preset if needed
                    />
                ) : (
                    <AudioFilterLibrary
                        onFilterSelect={onAudioFilterSelect}
                        selectedFilterId={selectedAudioFilterId}
                    />
                )}
            </div>
        </div>
    );
};

