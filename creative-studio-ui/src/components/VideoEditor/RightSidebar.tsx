/**
 * Right Sidebar for Video Editor
 * 
 * Contains panels for properties, sprites, effects, and other tools.
 */

import React, { useState } from 'react';
import {
  Settings,
  Layers,
  Sparkles,
  Wand2,
  Type,
  Music,
  Volume2
} from 'lucide-react';

import { SpritesPanel } from '@/components/VideoEditor/SpritesPanel';
import { AISearchPanel } from '@/components/VideoEditor/AIPanels/AISearchPanel';

// ============================================================================
// Types
// ============================================================================

type PanelType = 'properties' | 'sprites' | 'effects' | 'audio' | 'text' | 'ai' | 'settings';

interface RightSidebarProps {
  className?: string;
  defaultPanel?: PanelType;
}

// ============================================================================
// Component
// ============================================================================

export const RightSidebar: React.FC<RightSidebarProps> = ({
  className,
  defaultPanel = 'sprites'
}) => {
  const [activePanel, setActivePanel] = useState<PanelType>(defaultPanel);

  const panels = [
    { id: 'properties' as PanelType, icon: Settings, label: 'Propriétés' },
    { id: 'sprites' as PanelType, icon: Layers, label: 'Sprites' },
    { id: 'effects' as PanelType, icon: Sparkles, label: 'Effets' },
    { id: 'text' as PanelType, icon: Type, label: 'Texte' },
    { id: 'audio' as PanelType, icon: Volume2, label: 'Audio' },
    { id: 'ai' as PanelType, icon: Wand2, label: 'AI Power Tools' },
  ];

  return (
    <div className={`flex h-full bg-slate-900 ${className || ''}`}>
      {/* Icon Bar */}
      <div className="w-12 bg-slate-800 flex flex-col items-center py-2 gap-1 border-r border-slate-700">
        {panels.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActivePanel(id)}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
              activePanel === id
                ? 'bg-violet-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
            title={label}
          >
            <Icon className="w-5 h-5" />
          </button>
        ))}
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-hidden">
        {activePanel === 'properties' && (
          <PropertiesPanel />
        )}

        {activePanel === 'sprites' && (
          <SpritesPanel className="h-full" />
        )}

        {activePanel === 'effects' && (
          <EffectsPlaceholder />
        )}

        {activePanel === 'text' && (
          <TextPlaceholder />
        )}

        {activePanel === 'audio' && (
          <AudioPlaceholder />
        )}

        {activePanel === 'ai' && (
          <AISearchPanel />
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Placeholder Panels
// ============================================================================

const PropertiesPanel: React.FC = () => (
  <div className="p-4">
    <h3 className="text-sm font-medium text-white mb-3">Propriétés</h3>
    <p className="text-xs text-slate-500">
      Sélectionnez un élément pour voir ses propriétés
    </p>
  </div>
);

const EffectsPlaceholder: React.FC = () => (
  <div className="p-4 flex flex-col items-center justify-center h-full text-slate-500">
    <Wand2 className="w-8 h-8 mb-2 opacity-50" />
    <p className="text-sm">Effets</p>
    <p className="text-xs text-slate-600 mt-1">Gérez les effets depuis le panneau Sprites</p>
  </div>
);

const TextPlaceholder: React.FC = () => (
  <div className="p-4 flex flex-col items-center justify-center h-full text-slate-500">
    <Type className="w-8 h-8 mb-2 opacity-50" />
    <p className="text-sm">Texte</p>
    <p className="text-xs text-slate-600 mt-1">Ajoutez du texte à votre vidéo</p>
  </div>
);

const AudioPlaceholder: React.FC = () => (
  <div className="p-4 flex flex-col items-center justify-center h-full text-slate-500">
    <Music className="w-8 h-8 mb-2 opacity-50" />
    <p className="text-sm">Audio</p>
    <p className="text-xs text-slate-600 mt-1">Gérez les pistes audio</p>
  </div>
);

export default RightSidebar;