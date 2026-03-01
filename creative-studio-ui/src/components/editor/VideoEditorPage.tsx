/* cspell:ignore dreamina Dreamina Ungroup */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FolderOpen,
  Users,
  Mountain,
  Box,
  Palette,
  Camera,
  Plus,
  Image as ImageIcon,
  MessageCircle,
  Sparkles,
  Edit,
  Copy,
  Trash2,
  BookOpen,
  Settings2,
  X,
  Monitor,
  Smartphone,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useStore } from '../../store';

import { TimelineTracks } from './TimelineTracks';
import { TransitionLibrary } from './tools/TransitionLibrary';
import { TransitionEditor } from './tools/TransitionEditor';
import { TimelineScrubber } from './timeline/TimelineScrubber';
import { TimelineRuler } from './timeline/TimelineRuler';
import { KeyframeEditor } from './tools/KeyframeEditor';
import { TextClip } from '../clips/TextClip';
import ProductionToolsHub from './effects/ProductionToolsHub';
import { LayerPanel } from './layers/LayerPanel';
import { MediaLibrary } from './media/MediaLibrary';
import { gridGenerationService } from '../../services/gridGenerationService';
import type { GridGenerationProgress } from '../../services/gridGenerationService';
import { EffectPreviewRenderer } from './effects/EffectPreviewRenderer';
import { EffectsLibrary } from './effects/EffectsLibrary';
import { EffectStack } from './effects/EffectStack';
import { EffectControls } from './effects/EffectControls';
import { CharacterWizardModal } from '../wizard/CharacterWizardModal';
import { StorytellerWizard } from './sequence-planning/StorytellerWizard';
import { FloatingAIAssistant } from '../FloatingAIAssistant';
import type { AppliedEffect } from '../../types/effect';
import type { MediaAsset, MediaFolder } from './media/MediaLibrary';
import type { Layer } from './layers/LayerPanel';
import type { TextStyle, TextAnimation, TextLayer } from '../../types/text-layer';

import './VideoEditorPage.css';
import './TimelineTransitions.css';
import './timeline/TimelineScrubber.css';
import './timeline/TimelineRuler.css';
import './timeline/AudioWaveform.css';
import './timeline/VolumeKeyframes.css';

// Context menu for shot actions
const ShotContextMenu = ({ position, onEdit, onDelete, onDuplicate }: {
  position: { x: number; y: number };
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) => {
  return (
    <div
      className="context-menu context-menu-position"
      style={{
        '--left': `${position.x}px`,
        '--top': `${position.y}px`
      } as React.CSSProperties}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="context-menu-item" onClick={onEdit}>
        <Edit size={16} />
        Edit Shot
      </div>
      <div className="context-menu-item" onClick={onDuplicate}>
        <Copy size={16} />
        Duplicate Shot
      </div>
      <div className="context-menu-separator" />
      <div className="context-menu-item danger" onClick={onDelete}>
        <Trash2 size={16} />
        Delete Shot
      </div>
    </div>
  );
};

interface RawShot {
  id?: number | string;
  title?: string;
  duration?: number;
  prompt?: string;
  description?: string;
  text?: string;
  thumbnail?: string;
}

interface Shot {
  id: number;
  title: string;
  duration: number;
  prompt: string;
  thumbnail?: string;
  smartCrop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface VideoEditorPageProps {
  sequenceName?: string;
  initialShots?: RawShot[];
  projectName?: string;
  onBackToDashboard?: () => void;
}

const VideoEditorPage: React.FC<VideoEditorPageProps> = ({
  sequenceName: propSequenceName,
  initialShots = [],
  projectName = 'Untitled Project',
  onBackToDashboard,
}) => {
  const [selectedShot, setSelectedShot] = useState<number | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(true);
  const [sequenceName, setSequenceName] = useState(propSequenceName || 'Plan sequence 1');

  // Auto-save state
  const isSaving = false;
  const lastSavedAt = null;
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Grid generation state
  const [isGeneratingGrid, setIsGeneratingGrid] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<GridGenerationProgress | null>(null);

  // Loading overlay state
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  // Toast notifications state
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Toast helper functions
  const showToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Loading helper functions
  const showLoading = useCallback((message: string) => {
    setLoadingMessage(message);
    setIsLoading(true);
  }, []);

  const hideLoading = useCallback(() => {
    setIsLoading(false);
    setLoadingMessage('');
  }, []);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    shot: Shot;
    position: { x: number; y: number };
  } | null>(null);

  // Initialize shots from props or use default
  const [shots, setShots] = useState<Shot[]>(() => {
    if (initialShots && initialShots.length > 0) {
      return initialShots.map((shot: RawShot, index) => ({
        id: typeof shot.id === 'string' ? parseInt(shot.id) : (shot.id || index + 1),
        title: shot.title || `Shot ${index + 1}`,
        duration: shot.duration || 5,
        prompt: shot.prompt || shot.description || shot.text || '',
        thumbnail: shot.thumbnail,
      }));
    }
    return [
      { id: 1, title: 'Shot 1', duration: 6, prompt: 'Prompt text image et animation' },
      { id: 2, title: 'Shot 2', duration: 10, prompt: 'Prompt text image et animation' }
    ];
  });

  // Update shots when initialShots changes
  useEffect(() => {
    if (initialShots && initialShots.length > 0) {
      const converted = initialShots.map((shot: RawShot, index) => ({
        id: typeof shot.id === 'string' ? parseInt(shot.id) : (shot.id || index + 1),
        title: shot.title || `Shot ${index + 1}`,
        duration: shot.duration || 5,
        prompt: shot.prompt || shot.description || shot.text || '',
        thumbnail: shot.thumbnail,
      }));
      setShots(converted);
    }
  }, [initialShots]);

  // Update sequence name when prop changes
  useEffect(() => {
    if (propSequenceName) {
      setSequenceName(propSequenceName);
    }
  }, [propSequenceName]);

  // Cleanup timeout on unmount
  useEffect(() => {
    const currentRef = saveTimeoutRef.current;
    return () => {
      if (currentRef) {
        clearTimeout(currentRef);
      }
    };
  }, []);

  // Timeline controls state
  const [zoom, setZoom] = useState(1);

  // Modal states
  const [isCharacterWizardOpen, setIsCharacterWizardOpen] = useState(false);
  const [isStorytellerWizardOpen, setIsStorytellerWizardOpen] = useState(false);
  const [showHub, setShowHub] = useState('library'); // library, characters, locations, effects
  const [showProHub, setShowProHub] = useState(false);

  // Media library state
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [mediaFolders, setMediaFolders] = useState<MediaFolder[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);

  // Store state
  const currentTime = useStore((state) => state.currentTime);
  const setCurrentTime = useStore((state) => state.setCurrentTime);
  const isPlaying = useStore((state) => state.isPlaying);
  const play = useStore((state) => state.play);
  const pause = useStore((state) => state.pause);

  // Calculate total duration from local shots
  const totalDuration = shots.reduce((acc, shot) => acc + shot.duration, 0);

  // Effect and layer state
  const [appliedEffects, setAppliedEffects] = useState<AppliedEffect[]>([]);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>([]);
  const [textClips, setTextClips] = useState<TextLayer[]>([]);
  const [selectedTextClip, setSelectedTextClip] = useState<string | null>(null);

  // Aspect ratio state
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');

  // Sidebar controls
  const toggleLibrary = () => setIsLibraryOpen(!isLibraryOpen);

  // Shot manipulation
  const addShot = () => {
    const newShot: Shot = {
      id: Math.max(...shots.map(s => s.id), 0) + 1,
      title: `Shot ${shots.length + 1}`,
      duration: 5,
      prompt: '',
    };
    setShots([...shots, newShot]);
  };

  const updateShot = (id: number, updates: Partial<Shot>) => {
    setShots(shots.map((shot) => (shot.id === id ? { ...shot, ...updates } : shot)));
  };

  const handleShotContextMenu = (e: React.MouseEvent, shot: Shot) => {
    e.preventDefault();
    setContextMenu({
      shot,
      position: { x: e.clientX, y: e.clientY },
    });
  };

  const handleDuplicateShot = (shotToDuplicate: Shot) => {
    const newShot: Shot = {
      ...shotToDuplicate,
      id: Math.max(...shots.map(s => s.id), 0) + 1,
      title: `${shotToDuplicate.title} (Copy)`
    };
    setShots([...shots, newShot]);
  };

  const handleDeleteShot = (shotIdToDelete: number) => {
    setShots(shots.filter(shot => shot.id !== shotIdToDelete));
    if (selectedShot === shotIdToDelete) {
      setSelectedShot(null);
    }
  };

  // Timeline control functions
  const handleTimeChange = useCallback((newTime: number) => {
    setCurrentTime(Math.max(0, Math.min(totalDuration, newTime)));
  }, [totalDuration, setCurrentTime]);

  const handleZoomChange = useCallback((newZoom: number) => {
    setZoom(Math.max(0.1, Math.min(5, newZoom)));
  }, []);

  const handleFrameStep = useCallback((direction: 'forward' | 'backward') => {
    const frameDuration = 1 / 30; // Assuming 30fps
    if (direction === 'forward') {
      setCurrentTime(Math.min(totalDuration, currentTime + frameDuration));
    } else {
      setCurrentTime(Math.max(0, currentTime - frameDuration));
    }
  }, [totalDuration, currentTime, setCurrentTime]);

  // Hub management
  const selectHub = (hub: string) => {
    setShowHub(hub);
    setIsLibraryOpen(true);
  };

  // Generation functions
  const handleGenerateSequence = async () => {
    if (shots.length === 0) return;

    try {
      setIsGeneratingGrid(true);
      showLoading('Analysis and generating visual grid...');

      const result = await gridGenerationService.generateGrid(
        shots.map(s => ({
          id: s.id,
          title: s.title,
          prompt: s.prompt,
          duration: s.duration
        })),
        {
          quality: 'standard'
        },
        (progress) => setGenerationProgress(progress)
      );

      // Update shots with thumbnails
      const updatedShots = shots.map((shot) => {
        const imageUrl = result.images.get(shot.id);
        if (imageUrl) {
          return { ...shot, thumbnail: imageUrl };
        }
        return shot;
      });

      setShots(updatedShots);
      showToast('success', 'Sequence grid generated successfully!');
    } catch (error) {
      console.error('Grid generation failed:', error);
      showToast('error', 'Failed to generate grid. Please check your connection.');
    } finally {
      setIsGeneratingGrid(false);
      setGenerationProgress(null);
      hideLoading();
    }
  };

  // Media interaction
  const handleDropMedia = () => {
    // Implementation for dropping media onto timeline
  };

  const handleFillGaps = () => {
    // Implementation for filling gaps in timeline
  };

  // View switch helpers
  const [showTransitionLibrary] = useState(false);
  const [showTransitionEditor, setShowTransitionEditor] = useState(false);

  // Temporary path
  const videoPath = "assets/raw/sample.mp4";

  return (
    <div className="video-editor-page">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <Loader2 className="animate-spin mb-4" size={48} />
            <p className="text-xl font-bold">{loadingMessage}</p>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Navigation */}
      <header className="editor-header">
        <div className="header-left">
          <button className="btn-back" onClick={onBackToDashboard}>
            <X size={20} />
          </button>
          <div className="project-info">
            <span className="project-name">{projectName}</span>
            <span className={`save-status ${isSaving ? 'saving' : ''}`}>
              {isSaving ? 'Enregistrement...' : lastSavedAt ? `Enregistré à ${lastSavedAt}` : 'Modifications non enregistrées'}
            </span>
          </div>
        </div>

        <div className="header-center">
          <div className="aspect-ratio-selector">
            <button
              className={aspectRatio === '16:9' ? 'active' : ''}
              onClick={() => setAspectRatio('16:9')}
            >
              <Monitor size={16} /> 16:9
            </button>
            <button
              className={aspectRatio === '9:16' ? 'active' : ''}
              onClick={() => setAspectRatio('9:16')}
            >
              <Smartphone size={16} /> 9:16
            </button>
            <button
              className={aspectRatio === '1:1' ? 'active' : ''}
              onClick={() => setAspectRatio('1:1')}
            >
              <Box size={16} /> 1:1
            </button>
          </div>
        </div>

        <div className="header-right">
          <button className="btn-share">
            <Users size={18} /> Partager
          </button>
          <button className="btn-export primary">Exporter</button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="editor-main">
        {/* Left Toolbar */}
        <aside className="toolbar-left">
          <button
            className={`tool-btn ${showHub === 'library' && isLibraryOpen ? 'active' : ''}`}
            onClick={() => selectHub('library')}
            title="Médiathèque"
          >
            <FolderOpen size={24} />
          </button>
          <button
            className={`tool-btn ${showHub === 'characters' && isLibraryOpen ? 'active' : ''}`}
            onClick={() => selectHub('characters')}
            title="Personnages"
          >
            <Users size={24} />
          </button>
          <button
            className={`tool-btn ${showHub === 'locations' && isLibraryOpen ? 'active' : ''}`}
            onClick={() => selectHub('locations')}
            title="Lieux"
          >
            <Mountain size={24} />
          </button>
          <button
            className={`tool-btn ${showHub === 'effects' && isLibraryOpen ? 'active' : ''}`}
            onClick={() => selectHub('effects')}
            title="Effets"
          >
            <Palette size={24} />
          </button>
          <div className="toolbar-spacer" />
          <button className="tool-btn" onClick={() => setIsCharacterWizardOpen(true)}>
            <Plus size={24} />
          </button>
        </aside>

        {/* Assets Panel */}
        {isLibraryOpen && (
          <aside className="assets-panel">
            <div className="panel-header">
              <h3>
                {showHub === 'library' ? 'Médiathèque' :
                 showHub === 'characters' ? 'Personnages' :
                 showHub === 'locations' ? 'Lieux' : 'Effets & Filtres'}
              </h3>
              <button className="btn-close" onClick={toggleLibrary}>
                <X size={16} />
              </button>
            </div>

            <div className="panel-content overflow-y-auto">
              {showHub === 'library' && (
                <MediaLibrary
                  assets={mediaAssets}
                  folders={mediaFolders}
                  selectedAssetIds={selectedAssetIds}
                  onAssetSelect={(id, multi) => {
                    if (multi) {
                      setSelectedAssetIds(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
                    } else {
                      setSelectedAssetIds([id]);
                    }
                  }}
                  onAssetImport={(files) => {
                    console.log('Import files:', files);
                  }}
                  onAssetDelete={(id) => {
                    setMediaAssets(prev => prev.filter(a => a.id !== id));
                  }}
                  onAssetDownload={(id) => {
                    console.log('Download asset:', id);
                  }}
                  onAssetFavorite={(id) => {
                    setMediaAssets(prev => prev.map(a => a.id === id ? { ...a, favorite: !a.favorite } : a));
                  }}
                  onFolderCreate={(name, parentId) => {
                    const newFolder: MediaFolder = { id: Date.now().toString(), name, parentId, children: [], expanded: false, assetCount: 0 };
                    setMediaFolders(prev => [...prev, newFolder]);
                  }}
                />
              )}

              {showHub === 'characters' && (
                <div className="character-grid">
                  <div className="add-character-card" onClick={() => setIsCharacterWizardOpen(true)}>
                    <Plus size={24} />
                    <span>Nouveau</span>
                  </div>
                  {/* Character listing mapped here */}
                </div>
              )}

              {showHub === 'effects' && (
                <>
                  <div className="panel-section">
                    <h3>Effets Visuels</h3>
                    <EffectsLibrary onEffectSelect={(effect) => {
                      setAppliedEffects(prev => [...prev, {
                        ...effect,
                        id: Date.now().toString(),
                        order: prev.length,
                        type: 'custom',
                        enabled: true
                      }]);
                    }} />
                  </div>

                  <div className="panel-section">
                    <h3>Piles d'Effets</h3>
                    <EffectStack
                      effects={appliedEffects}
                      onEffectsChange={(newEffects) => setAppliedEffects(newEffects)}
                      onEffectSelect={(effect) => {
                        console.log('Selected effect:', effect);
                      }}
                      onReorder={(newEffects) => setAppliedEffects(newEffects)}
                      onRemove={(id) => setAppliedEffects(prev => prev.filter(e => e.id !== id))}
                    />
                  </div>

                  <div className="panel-section">
                    <h3>Contrôles d'Effets</h3>
                    <EffectControls
                      effects={appliedEffects}
                      onEffectUpdate={(effectId, updates: Partial<AppliedEffect>) => {
                        setAppliedEffects(prev => prev.map(e =>
                          e.id === effectId ? { ...e, ...updates } : e
                        ));
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          </aside>
        )}

        {/* Center Area - Player & Timeline */}
        <main className="center-area">
          {/* Video Player */}
          <div className="preview-container">
            <div className="player-viewport">
              <div className="player-canvas" style={{ aspectRatio: aspectRatio.replace(':', '/') }}>
                {/* Visual content would render here */}
                <div className="player-placeholder">
                  <Camera size={64} className="opacity-20" />
                  <p>Prévisualisation Vidéo</p>
                </div>
              </div>

              {/* Player Overlay Controls */}
              <div className="player-controls">
                <div className="playback-info">
                  <span className="time-display">{Math.floor(currentTime / 60)}:{(currentTime % 60).toFixed(0).padStart(2, '0')}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="quick-actions">
              <button
                className="action-btn storyteller"
                onClick={() => setIsStorytellerWizardOpen(true)}
              >
                <BookOpen size={20} />
                <span>Storyteller</span>
              </button>
              <button className="action-btn dreamina">
                <ImageIcon size={20} />
                <span>Dreamina</span>
              </button>
              <button className="action-btn prompt-gen">
                <MessageCircle size={20} />
                <span>Prompt Gen</span>
              </button>
            </div>
          </div>

          {/* Timeline Area */}
          <div className="timeline-container">
            <div className="timeline-toolbar">
              <TimelineScrubber
                currentTime={currentTime}
                duration={totalDuration}
                zoom={zoom}
                isPlaying={isPlaying}
                onTimeChange={handleTimeChange}
                onPlayPause={() => isPlaying ? pause() : play()}
                onZoomChange={handleZoomChange}
                onFrameStep={handleFrameStep}
              />
            </div>

            <div className="ruler-container font-mono">
              <TimelineRuler duration={totalDuration} zoom={zoom} currentTime={currentTime} />
            </div>

            <TimelineTracks
              onDropMedia={handleDropMedia}
              onFillGaps={handleFillGaps}
            />
          </div>
        </main>

        {/* Right Panel - Sequence Plan */}
        <aside className="sidebar-right">
          <div className="panel-header">
            <h2>{sequenceName}</h2>
            <button
              className={`btn-generate ${isGeneratingGrid ? 'generating' : ''} ${showProHub ? 'active' : ''}`}
              onClick={() => setShowProHub(!showProHub)}
              disabled={shots.length === 0}
            >
              <Settings2 size={18} />
              {showProHub ? 'Standard FX' : 'AI Production Pro'}
            </button>
            <button
              className={`btn-generate ${isGeneratingGrid ? 'generating' : ''}`}
              onClick={handleGenerateSequence}
              disabled={shots.length === 0}
            >
              <Sparkles size={18} />
              {isGeneratingGrid ? 'Générer Grille' : 'Générer Séquence'}
            </button>

            {/* Grid Generation Progress */}
            {generationProgress && (
              <div className="generation-progress">
                <div className="progress-bar">
                  <div
                    className="progress-fill progress-fill-width"
                    style={{ '--width': `${generationProgress.progress}%` } as React.CSSProperties}
                  />
                </div>
                <div className="progress-text">
                  {generationProgress.status}
                </div>
                {generationProgress.estimatedTimeRemaining && (
                  <div className="progress-time">
                    ~{Math.ceil(generationProgress.estimatedTimeRemaining / 60)} min remaining
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="shots-grid">
            {shots.map((shot) => (
              <div
                key={shot.id}
                className="shot-card"
                onContextMenu={(e) => handleShotContextMenu(e, shot)}
              >
                <div className="shot-number">{shot.id}</div>
                <div className="shot-thumbnail">
                  {shot.thumbnail ? (
                    <img
                      src={shot.thumbnail}
                      alt={`${shot.title} thumbnail`}
                      className="shot-thumbnail-img"
                    />
                  ) : (
                    <ImageIcon size={32} />
                  )}
                </div>
                <div className="shot-info">
                  <div className="shot-header">
                    <input
                      type="text"
                      className="shot-title-input"
                      value={shot.title}
                      onChange={(e) => updateShot(shot.id, { title: e.target.value })}
                    />
                    <span className="shot-duration">{shot.duration}s</span>
                  </div>
                  <textarea
                    className="shot-prompt-textarea"
                    value={shot.prompt}
                    onChange={(e) => updateShot(shot.id, { prompt: e.target.value })}
                    placeholder="Entrez le prompt visuel..."
                  />
                </div>
              </div>
            ))}
            <button className="btn-add-shot" onClick={addShot}>
              <Plus size={24} />
              <span>Nouveau Shot</span>
            </button>
          </div>
        </aside>
      </div>

      {/* Overlays & Hubs */}
      {showProHub && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" onClick={() => setShowProHub(false)}>
           <div onClick={e => e.stopPropagation()}>
              <ProductionToolsHub videoPath={videoPath} />
           </div>
        </div>
      )}

      {/* Floating Tools Overlays */}
      {showTransitionLibrary && (
        <TransitionLibrary
          onTransitionSelect={() => setShowTransitionEditor(true)}
        />
      )}

      {showTransitionEditor && (
        <TransitionEditor
            transition={{
                id: '1',
                name: 'Cross Dissolve',
                type: 'fade',
                duration: 0.5,
                easing: 'ease-in-out',
                intensity: 1
            }}
            onTransitionChange={(transition) => {
              console.log('Transition updated:', transition);
            }}
            onClose={() => setShowTransitionEditor(false)}
            clipA={{ src: '', thumbnail: shots[0]?.thumbnail }}
            clipB={{ src: '', thumbnail: shots[1]?.thumbnail }}
        />
      )}

      <KeyframeEditor
        properties={[]}
        duration={totalDuration}
        currentTime={currentTime}
        onPropertyUpdate={() => {}}
        onKeyframeAdd={() => {}}
        onKeyframeUpdate={() => {}}
        onKeyframeRemove={() => {}}
        onPlayPause={() => isPlaying ? pause() : play()}
        onSeek={handleTimeChange}
      />

      <EffectPreviewRenderer
        videoSrc={videoPath}
        effects={appliedEffects}
      />

      {/* Character Wizard */}
      <CharacterWizardModal
        isOpen={isCharacterWizardOpen}
        onClose={() => setIsCharacterWizardOpen(false)}
      />

      {/* Storyteller Wizard */}
      {isStorytellerWizardOpen && (
        <StorytellerWizard
          isOpen={isStorytellerWizardOpen}
          onClose={() => setIsStorytellerWizardOpen(false)}
          onSave={(storySummary) => {
             console.log('Story saved:', storySummary);
          }}
        />
      )}

      {/* Context Menu */}
      {contextMenu && (
        <ShotContextMenu
          position={contextMenu.position}
          onEdit={() => {
            setSelectedShot(contextMenu.shot.id);
            setContextMenu(null);
          }}
          onDelete={() => {
            handleDeleteShot(contextMenu.shot.id);
            setContextMenu(null);
          }}
          onDuplicate={() => {
            handleDuplicateShot(contextMenu.shot);
            setContextMenu(null);
          }}
        />
      )}

      {/* Render Text Clips on Canvas */}
      {textClips.map((textClip) => (
        <TextClip
          key={textClip.id}
          text={textClip.text}
          style={textClip.style}
          position={textClip.position}
          size={textClip.size}
          isSelected={selectedTextClip === textClip.id}
          isPlaying={isPlaying}
          currentTime={currentTime}
          onTextChange={(text: string) => {
            setTextClips(prev => prev.map(clip =>
              clip.id === textClip.id ? { ...clip, text } : clip
            ));
          }}
          onStyleChange={(style: Partial<TextStyle>) => {
            setTextClips(prev => prev.map(clip =>
              clip.id === textClip.id ? { ...clip, style: { ...clip.style, ...style } } : clip
            ));
          }}
          onAnimationChange={(animation?: TextAnimation) => {
            setTextClips(prev => prev.map(clip =>
              clip.id === textClip.id ? { ...clip, animation } : clip
            ));
          }}
          onPositionChange={(position: { x: number; y: number }) => {
            setTextClips(prev => prev.map(clip =>
              clip.id === textClip.id ? { ...clip, position } : clip
            ));
          }}
          onSizeChange={(size: { width: number; height: number }) => {
            setTextClips(prev => prev.map(clip =>
              clip.id === textClip.id ? { ...clip, size } : clip
            ));
          }}
          onSelect={() => setSelectedTextClip(textClip.id)}
        />
      ))}

      {/* Layers Panel Helper Overlay */}
      {selectedLayerIds.length > 0 && (
        <div className="layers-overlay">
            <div className="panel-container">
            <LayerPanel
              layers={layers}
              selectedLayerIds={selectedLayerIds}
              onLayerSelect={(layerId, multiSelect) => {
                setSelectedLayerIds(prev => multiSelect ? (prev.includes(layerId) ? prev.filter(lid => lid !== layerId) : [...prev, layerId]) : [layerId]);
              }}
              onLayerUpdate={(layerId, updates) => {
                setLayers(prev => prev.map(l => l.id === layerId ? { ...l, ...updates } : l));
              }}
              onLayerAdd={(type, name) => {
                const newLayer: Layer = { id: Date.now().toString(), type, name: name || `Nouveau ${type}`, position: { x: 0, y: 0, z: layers.length }, opacity: 1, visible: true, locked: false, blendMode: 'normal' };
                setLayers(prev => [...prev, newLayer]);
              }}
              onLayerRemove={(layerId) => {
                setLayers(prev => prev.filter(l => l.id !== layerId));
                setSelectedLayerIds(prev => prev.filter(lid => lid !== layerId));
              }}
              onLayerDuplicate={(layerId) => {
                const layer = layers.find(l => l.id === layerId);
                if (layer) {
                  const duplicatedLayer = { ...layer, id: Date.now().toString(), position: { ...layer.position, z: layers.length } };
                  setLayers(prev => [...prev, duplicatedLayer]);
                }
              }}
              onLayerReorder={(layerId, newIndex) => {
                setLayers(prev => {
                  const oldIndex = prev.findIndex(l => l.id === layerId);
                  if (oldIndex === -1) return prev;

                  const newLayers = [...prev];
                  const [removed] = newLayers.splice(oldIndex, 1);
                  newLayers.splice(newIndex, 0, removed);

                  return newLayers.map((layer, index) => ({
                    ...layer,
                    position: { ...layer.position, z: index }
                  }));
                });
              }}
              onLayerGroup={(layerIds, groupName) => {
                console.log('Group layers:', layerIds, groupName);
              }}
              onLayerUngroup={(groupId) => {
                console.log('Ungroup layer:', groupId);
              }}
            />
          </div>
        </div>
      )}

      {/* AI Assistant Integration */}
      <FloatingAIAssistant />
    </div>
  );
};

export default VideoEditorPage;
