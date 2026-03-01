/**
 * Sprites Panel for Video Editor
 * 
 * Main panel for managing animated sprites within the StoryCore video editor.
 * Integrates sprite creation, orientation, animation, and effects.
 */

import React, { useCallback, useState, useRef } from 'react';
import {
  Upload,
  Plus,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  Copy,
  Layers,
  Sparkles,
  Compass,
  User,
  AlertCircle
} from 'lucide-react';

import {
  AnimatedSprite,
  SpriteOrientation,
  SpriteTransform,
  createEmptySprite
} from '@/types/sprite';

import {
  AnimeEffect
} from '@/types/animeEffect';

import { useSpriteStore } from '@/stores/spriteStore';
import { OrientationSelector } from '@/components/sprites/OrientationSelector';
import { AnimeEffectPanel } from '@/components/sprites/AnimeEffectPanel';
import { ImageSpriteCreator } from '@/components/sprites/ImageSpriteCreator';
import { IdentityCastingPanel } from '@/components/sprites/IdentityCastingPanel';
import { Modal } from '@/components/modals/Modal';

// ============================================================================
// Types
// ============================================================================

interface SpritesPanelProps {
  className?: string;
}

type TabType = 'sprites' | 'animations' | 'effects' | 'casting' | 'settings';

// ============================================================================
// Component
// ============================================================================

export const SpritesPanel: React.FC<SpritesPanelProps> = ({ className }) => {
  // State
  const [activeTab, setActiveTab] = useState<TabType>('sprites');
  const [showImageCreator, setShowImageCreator] = useState(false);
  
  // Store
  const {
    sprites,
    spriteOrder,
    selectedSpriteId,
    isPlaying,
    selectSprite,
    addSprite,
    removeSprite,
    duplicateSprite,
    play,
    pause,
    stop,
    setOrientation,
    setTransform
  } = useSpriteStore();

  // Project context (should be retrieved from a project store, but using placeholder for now)
  const projectId = 'default_project'; 

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ==========================================================================
  // Handlers
  // ==========================================================================
// ... (omitting unchanged handlers for brevity in view, but the tool will handle the block)
  const handleCreateSprite = useCallback(() => {
    const newSprite = createEmptySprite(
      `sprite_${Date.now()}`,
      `Sprite ${spriteOrder.length + 1}`
    );
    addSprite(newSprite);
  }, [addSprite, spriteOrder.length]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create sprite from file
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const newSprite = createEmptySprite(
        `sprite_${Date.now()}`,
        file.name.replace(/\.[^/.]+$/, '')
      );
      newSprite.source = { type: 'url', url: dataUrl };
      addSprite(newSprite);
    };
    reader.readAsDataURL(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [addSprite]);

  const handleDeleteSprite = useCallback((id: string) => {
    removeSprite(id);
  }, [removeSprite]);

  const handleDuplicateSprite = useCallback((id: string) => {
    duplicateSprite(id);
  }, [duplicateSprite]);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const handleStop = useCallback(() => {
    stop();
  }, [stop]);

  // ==========================================================================
  // Render
  // ==========================================================================

  const selectedSprite = selectedSpriteId 
    ? sprites.get(selectedSpriteId) 
    : null;

  return (
    <div className={`flex flex-col h-full bg-slate-900 ${className || ''}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.json"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
        <h3 className="text-sm font-medium text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-violet-400" />
          Sprites Animés
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCreateSprite}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Nouveau sprite"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={handleImportClick}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Importer"
          >
            <Upload className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowImageCreator(true)}
            className="p-1.5 rounded hover:bg-slate-700 text-violet-400 hover:text-violet-300 transition-colors"
            title="Créer via IA Vision"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-center gap-2 px-3 py-2 border-b border-slate-700 bg-slate-800">
        <button
          onClick={handleStop}
          className="p-1.5 rounded hover:bg-slate-600 text-slate-300 transition-colors"
          title="Stop"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={handlePlayPause}
          className={`p-2 rounded-full transition-colors ${
            isPlaying 
              ? 'bg-violet-600 text-white hover:bg-violet-500' 
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700 overflow-x-auto">
        {(['sprites', 'animations', 'effects', 'casting', 'settings'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`min-w-[70px] px-2 py-1.5 text-[10px] font-medium uppercase transition-colors ${
              activeTab === tab
                ? 'bg-slate-700 text-white border-b-2 border-violet-500'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {tab === 'casting' ? (
              <span className="flex items-center gap-1 justify-center">
                <User className="w-3 h-3" /> Casting
              </span>
            ) : tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'sprites' && (
          <SpritesList
            sprites={Array.from(sprites.values())}
            spriteOrder={spriteOrder}
            selectedSpriteId={selectedSpriteId}
            onSelect={selectSprite}
            onDelete={handleDeleteSprite}
            onDuplicate={handleDuplicateSprite}
          />
        )}

        {activeTab === 'animations' && (
          <AnimationsPanel sprite={selectedSprite?.sprite || null} />
        )}

        {activeTab === 'effects' && selectedSprite && (
          <EffectsPanel
            effects={selectedSprite.effects}
            onEffectsChange={(effects) => {
              // Update sprite effects
            }}
          />
        )}

        {activeTab === 'casting' && (
          <IdentityCastingPanel 
            selectedSprite={selectedSprite?.sprite || null}
            projectId={projectId}
          />
        )}

        {activeTab === 'settings' && selectedSprite && (
          <SpriteSettingsPanel
            sprite={selectedSprite.sprite}
            transform={selectedSprite.transform}
            onTransformChange={(t) => setTransform(selectedSpriteId!, t)}
            onOrientationChange={(o) => setOrientation(selectedSpriteId!, o)}
          />
        )}

        {(activeTab === 'effects' || activeTab === 'settings') && !selectedSprite && (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">Sélectionnez un sprite</p>
          </div>
        )}
      </div>

      {/* Footer - Selected Sprite Info */}
      {/* Modal for Image Sprite Creator */}
      {showImageCreator && (
        <Modal
          isOpen={showImageCreator}
          onClose={() => setShowImageCreator(false)}
          title="Créateur de Sprite IA"
          size="lg"
        >
          <div className="p-0 bg-[#0f172a]" style={{ height: '70vh' }}>
            <ImageSpriteCreator
              onSpriteCreated={(sprite) => {
                addSprite(sprite);
                setShowImageCreator(false);
              }}
            />
          </div>
        </Modal>
      )}

      {selectedSprite && (
        <div className="px-3 py-2 border-t border-slate-700 bg-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 truncate">
              {selectedSprite.sprite.name}
            </span>
            <span className="text-xs text-violet-400 uppercase">
              {selectedSprite.state.orientation}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Sub-Components
// ============================================================================

interface SpritesListProps {
  sprites: { id: string; sprite: AnimatedSprite }[];
  spriteOrder: string[];
  selectedSpriteId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

const SpritesList: React.FC<SpritesListProps> = ({
  sprites,
  spriteOrder,
  selectedSpriteId,
  onSelect,
  onDelete,
  onDuplicate
}) => {
  if (sprites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 p-4">
        <Layers className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm text-center mb-2">Aucun sprite</p>
        <p className="text-xs text-center text-slate-600">
          Créez un nouveau sprite ou importez une image
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {spriteOrder.map((id) => {
        const spriteData = sprites.find(s => s.id === id);
        if (!spriteData) return null;
        
        const { sprite } = spriteData;
        const isSelected = selectedSpriteId === id;

        return (
          <div
            key={id}
            onClick={() => onSelect(id)}
            className={`flex items-center gap-2 p-2 cursor-pointer transition-colors ${
              isSelected 
                ? 'bg-violet-600/20 border-l-2 border-violet-500' 
                : 'hover:bg-slate-800 border-l-2 border-transparent'
            }`}
          >
            {/* Thumbnail */}
            <div className="w-10 h-10 bg-slate-700 rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
              {sprite.thumbnail || sprite.source.url ? (
                <img
                  src={sprite.thumbnail || sprite.source.url}
                  alt={sprite.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Layers className="w-5 h-5 text-slate-500" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white truncate">{sprite.name}</div>
              <div className="text-xs text-slate-500">
                {sprite.width}x{sprite.height} • {sprite.animationList.length} anims
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate(id);
                }}
                className="p-1 rounded hover:bg-slate-600 text-slate-400"
                title="Dupliquer"
              >
                <Copy className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(id);
                }}
                className="p-1 rounded hover:bg-red-600/20 text-slate-400 hover:text-red-400"
                title="Supprimer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ============================================================================

interface AnimationsPanelProps {
  sprite: AnimatedSprite | null;
}

const AnimationsPanel: React.FC<AnimationsPanelProps> = ({ sprite }) => {
  if (!sprite) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500">
        <p className="text-sm">Sélectionnez un sprite</p>
      </div>
    );
  }

  const animations = sprite.animationList;

  return (
    <div className="p-3">
      <div className="text-xs text-slate-400 mb-2">Animations disponibles</div>
      <div className="space-y-1">
        {animations.map((anim) => (
          <button
            key={anim}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-left"
          >
            <Play className="w-3 h-3 text-violet-400" />
            <span className="text-sm text-slate-200">{anim}</span>
          </button>
        ))}
      </div>

      {animations.length === 0 && (
        <div className="text-xs text-slate-500 text-center py-4">
          Aucune animation définie
        </div>
      )}
    </div>
  );
};

// ============================================================================

interface EffectsPanelProps {
  effects: AnimeEffect[];
  onEffectsChange: (effects: AnimeEffect[]) => void;
}

const EffectsPanel: React.FC<EffectsPanelProps> = ({ effects, onEffectsChange }) => {
  return (
    <div className="h-full">
      <AnimeEffectPanel
        effects={effects}
        onEffectsChange={onEffectsChange}
      />
    </div>
  );
};

// ============================================================================

interface SpriteSettingsPanelProps {
  sprite: AnimatedSprite;
  transform: SpriteTransform;
  onTransformChange: (transform: Partial<SpriteTransform>) => void;
  onOrientationChange: (orientation: SpriteOrientation) => void;
}

const SpriteSettingsPanel: React.FC<SpriteSettingsPanelProps> = ({
  sprite,
  transform,
  onTransformChange,
  onOrientationChange
}) => {
  return (
    <div className="p-3 space-y-4 overflow-y-auto h-full">
      {/* Orientation */}
      <div>
        <div className="text-xs text-slate-400 mb-2 flex items-center gap-1">
          <Compass className="w-3 h-3" />
          Orientation
        </div>
        <OrientationSelector
          value={sprite.currentOrientation}
          onChange={onOrientationChange}
          size="sm"
        />
      </div>

      {/* Position */}
      <div>
        <div className="text-xs text-slate-400 mb-2">Position</div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-slate-500">X</label>
            <input
              type="number"
              value={transform.position.x}
              onChange={(e) => onTransformChange({
                position: { ...transform.position, x: parseFloat(e.target.value) || 0 }
              })}
              className="w-full px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded text-slate-200"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Y</label>
            <input
              type="number"
              value={transform.position.y}
              onChange={(e) => onTransformChange({
                position: { ...transform.position, y: parseFloat(e.target.value) || 0 }
              })}
              className="w-full px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded text-slate-200"
            />
          </div>
        </div>
      </div>

      {/* Scale */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-slate-400">Échelle</label>
          <span className="text-xs text-violet-400">{transform.scale.x.toFixed(2)}x</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="3"
          step="0.1"
          value={transform.scale.x}
          onChange={(e) => onTransformChange({
            scale: { x: parseFloat(e.target.value), y: parseFloat(e.target.value) }
          })}
          className="w-full accent-violet-500"
        />
      </div>

      {/* Rotation */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-slate-400">Rotation</label>
          <span className="text-xs text-violet-400">{transform.rotation.toFixed(0)}°</span>
        </div>
        <input
          type="range"
          min="0"
          max="360"
          step="1"
          value={transform.rotation}
          onChange={(e) => onTransformChange({
            rotation: parseFloat(e.target.value)
          })}
          className="w-full accent-violet-500"
        />
      </div>

      {/* Opacity */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-slate-400">Opacité</label>
          <span className="text-xs text-violet-400">{(transform.opacity * 100).toFixed(0)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={transform.opacity}
          onChange={(e) => onTransformChange({
            opacity: parseFloat(e.target.value)
          })}
          className="w-full accent-violet-500"
        />
      </div>

      {/* Flip Buttons */}
      <div>
        <label className="text-xs text-slate-400 mb-2 block">Miroir</label>
        <div className="flex gap-2">
          <button
            onClick={() => onTransformChange({ flipH: !transform.flipH })}
            className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors ${
              transform.flipH
                ? 'bg-violet-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Horizontal
          </button>
          <button
            onClick={() => onTransformChange({ flipV: !transform.flipV })}
            className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors ${
              transform.flipV
                ? 'bg-violet-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Vertical
          </button>
        </div>
      </div>
    </div>
  );
};

export default SpritesPanel;