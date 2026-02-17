import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  FolderOpen,
  Users,
  Mountain,
  Box,
  LayoutTemplate,
  Palette,
  Camera,
  Sun,
  Plus,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Image as ImageIcon,
  MessageCircle,
  X,
  Sparkles,
  Save,
  Edit,
  Copy,
  Trash2,
  BookOpen,
  Scissors as ScissorsIcon,
  SplitIcon,
  Type,
  Move,
  Layers as LayersIcon,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  ZoomIn,
  ZoomOut,
  Volume2,
  VolumeX,
  Repeat,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { useStore, useSelectedWorld, useStories } from '../../store';
import type { Character } from '@/types/character';
import { TimelineTracks, AmbianceProfile } from './TimelineTracks';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '../ui/dropdown-menu';
import { Monitor, Smartphone, ChevronDown, Check } from 'lucide-react';
import { TransitionLibrary } from './tools/TransitionLibrary';
import { TransitionEditor } from './tools/TransitionEditor';
import { ClipTrimmer } from './tools/ClipTrimmer';
import { ClipSplitter } from './tools/ClipSplitter';
import { TimelineScrubber } from './timeline/TimelineScrubber';
import { TimelineRuler } from './timeline/TimelineRuler';
import { AudioWaveform } from './timeline/AudioWaveform';
import { VolumeKeyframes } from './timeline/VolumeKeyframes';
import { KeyframeEditor } from './tools/KeyframeEditor';
import { TextClip } from '../clips/TextClip';
import { EffectPanel } from './effects/EffectPanel';
import { FilterLibrary } from './effects/FilterLibrary';
import { LayerPanel } from './layers/LayerPanel';
import { MediaLibrary } from './media/MediaLibrary';
import { gridGenerationService, GridGenerationProgress, GridGenerationResult } from '../../services/gridGenerationService';
import { videoEditorAPI } from '../../services/videoEditorAPI';
import { EffectPreviewRenderer } from './effects/EffectPreviewRenderer';
import { EffectsLibrary } from './effects/EffectsLibrary';
import { EffectStack } from './effects/EffectStack';
import { EffectControls } from './effects/EffectControls';
import { CharacterCreatorWizard } from './sequence-planning/CharacterCreatorWizard';
import { StorytellerWizard } from './sequence-planning/StorytellerWizard';
import { useCharacterPersistence } from '../../hooks/useCharacterPersistence';
import { FloatingAIAssistant } from '../FloatingAIAssistant';
import type { VolumeKeyframe } from '../../types/timeline';
import type { Layer } from './layers/LayerPanel';
import type { Effect, AppliedEffect, EffectStackProps, EffectParameter } from '../../types/effect';

import type { TextLayer } from '../../types/text-layer';
import './VideoEditorPage.css';
import './TimelineTransitions.css';
import './timeline/TimelineScrubber.css';
import './timeline/TimelineRuler.css';
import './timeline/AudioWaveform.css';
import './timeline/VolumeKeyframes.css';

// Context menu for shot actions
const ShotContextMenu = ({ shot, position, onClose, onEdit, onDelete, onDuplicate }: {
  shot: Shot;
  position: { x: number; y: number };
  onClose: () => void;
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
  sequenceId?: string;
  sequenceName?: string;
  initialShots?: any[];
  projectName?: string;
  onBackToDashboard?: () => void;
}

const VideoEditorPage: React.FC<VideoEditorPageProps> = ({
  sequenceId,
  sequenceName: propSequenceName,
  initialShots = [],
  projectName = 'Untitled Project',
  onBackToDashboard,
}) => {
  const [selectedShot, setSelectedShot] = useState<number | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(true);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(true);
  const [sequenceName, setSequenceName] = useState(propSequenceName || 'Plan sequence 1');

  // Auto-save state
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
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
    // Auto-hide after 3 seconds
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

  // Character creator wizard state
  const [isCharacterWizardOpen, setIsCharacterWizardOpen] = useState(false);

  // Storyteller wizard state
  const [isStorytellerWizardOpen, setIsStorytellerWizardOpen] = useState(false);

  // Character persistence hook
  const { saveCharacter } = useCharacterPersistence();
  const characters = useStore((state) => state.characters);
  const world = useSelectedWorld();
  
  // Get locations and stories from store for StorytellerWizard
  const locations = useStore((state) => state.locations);
  const stories = useStore((state) => state.stories);

  // Initialize shots from props or use default
  const [shots, setShots] = useState<Shot[]>(() => {
    if (initialShots && initialShots.length > 0) {
      return initialShots.map((shot, index) => ({
        id: index + 1,
        title: shot.title || `Shot ${index + 1}`,
        duration: shot.duration || 5,
        // FIXED: Check multiple possible fields for prompt data
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
      const converted = initialShots.map((shot, index) => ({
        id: index + 1,
        title: shot.title || `Shot ${index + 1}`,
        duration: shot.duration || 5,
        // FIXED: Check multiple possible fields for prompt data
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
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Timeline controls state
  const [zoom, setZoom] = useState(1);
  const [loopEnabled, setLoopEnabled] = useState(false);

  // Project Aspect Ratio
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');

  // Audio state
  const [audioVolume, setAudioVolume] = useState(1);
  const [audioMuted, setAudioMuted] = useState(false);
  const [volumeKeyframes, setVolumeKeyframes] = useState<VolumeKeyframe[]>([]);

  // Effects state for preview
  const [appliedEffects, setAppliedEffects] = useState<AppliedEffect[]>([]);

  // Professional video editing state
  const [selectedTool, setSelectedTool] = useState<'select' | 'trim' | 'split' | 'transition' | 'text' | 'keyframe'>('select');
  const [showTransitionEditor, setShowTransitionEditor] = useState(false);
  const [showKeyframeEditor, setShowKeyframeEditor] = useState(false);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [showLayerPanel, setShowLayerPanel] = useState(false);

  // Text clips state
  const [textClips, setTextClips] = useState<TextLayer[]>([]);
  const [selectedTextClip, setSelectedTextClip] = useState<string | null>(null);

  // Layer management state
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>([]);

  // Media library state
  const [mediaAssets, setMediaAssets] = useState([]);
  const [mediaFolders, setMediaFolders] = useState([]);

  // Store state
  const currentTime = useStore((state) => state.currentTime);
  const setCurrentTime = useStore((state) => state.setCurrentTime);
  const isPlaying = useStore((state) => state.isPlaying);
  const play = useStore((state) => state.play);
  const pause = useStore((state) => state.pause);
  const storeShots = useStore((state) => state.shots);
  const project = useStore((state) => state.project);

  // Calculate total duration from local shots
  const totalDuration = shots.reduce((acc, shot) => acc + shot.duration, 0);

  // Debounced save function
  const debouncedSave = useCallback(async (shotId: number, updates: Partial<Shot>) => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set saving state
    setIsSaving(true);

    // Debounce the save operation (1 second delay)
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        // Simulate API call to save the shot data
        // In a real implementation, this would call an API endpoint
        console.log(`Auto-saving shot ${shotId} with updates:`, updates);

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Update last saved timestamp
        setLastSavedAt(new Date().toISOString());

        // Show success feedback (could be replaced with toast notification)
        console.log(`✓ Shot ${shotId} saved successfully`);

      } catch (error) {
        console.error(`Failed to save shot ${shotId}:`, error);
        // Could show error toast here
      } finally {
        setIsSaving(false);
      }
    }, 1000);
  }, []);

  const handleAddShot = () => {
    const newShot: Shot = {
      id: shots.length + 1,
      title: `Shot ${shots.length + 1}`,
      duration: 5,
      prompt: 'Nouveau prompt'
    };
    setShots([...shots, newShot]);
  };

  const handleGenerateSequence = async () => {
    if (isGeneratingGrid) {
      // Cancel generation if already running
      gridGenerationService.abortGeneration();
      setIsGeneratingGrid(false);
      setGenerationProgress(null);
      return;
    }

    setIsGeneratingGrid(true);
    setGenerationProgress({ progress: 0, status: 'Preparing grid generation...' });

    try {
      const result: GridGenerationResult = await gridGenerationService.generateGridForSequence(
        shots,
        {
          quality: 'standard',
          width: 1024,
          height: 576,
          enhancePrompt: true,
        },
        (progress: GridGenerationProgress) => {
          setGenerationProgress(progress);
        }
      );

      // Update shots with generated thumbnails
      setShots(prevShots =>
        prevShots.map(shot => {
          const generatedImage = result.images.get(shot.id);
          return generatedImage ? { ...shot, thumbnail: generatedImage } : shot;
        })
      );

      console.log('Grid generation completed:', result.stats);

      // Show completion message
      setGenerationProgress({
        progress: 100,
        status: `Completed: ${result.stats.successfulGenerations}/${result.stats.totalShots} images generated`
      });

      // Clear progress after a delay
      setTimeout(() => {
        setGenerationProgress(null);
      }, 3000);

    } catch (error) {
      console.error('Grid generation failed:', error);
      setGenerationProgress({
        progress: 0,
        status: `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsGeneratingGrid(false);
    }
  };

  const handleDropMedia = (trackType: 'video' | 'image' | 'audio' | 'text', file: File) => {
    ;
    // Logic for handling dropped media files
    // In a real implementation, this would:
    // 1. Upload/process the file
    // 2. Create a clip object
    // 3. Add it to the appropriate track
  };

  const handleSaveCharacter = async (character: any) => {
    try {
      // Map wizard data to Character type
      const characterData: Partial<Character> = {
        name: character.name,
        visual_identity: {
          age_range: `${character.age} ans`,
          gender: character.gender || 'neutral',
          build: character.appearance,
          hair_color: '',
          hair_style: '',
          hair_length: '',
          eye_color: '',
          eye_shape: '',
          skin_tone: '',
          facial_structure: '',
          distinctive_features: [],
          height: '',
          posture: '',
          clothing_style: '',
          color_palette: [],
          reference_images: [],
          reference_sheet_images: [],
        },
        personality: {
          traits: character.personality,
          temperament: character.personality?.join(', ') || '',
          values: [],
          fears: [],
          desires: [],
          flaws: [],
          strengths: [],
          communication_style: '',
        },
        background: {
          origin: character.backstory,
          current_situation: character.worldRelation,
          occupation: '',
          education: '',
          family: '',
          significant_events: [],
        },
        role: {
          archetype: character.abilities?.join(', ') || '',
          narrative_function: '',
          character_arc: '',
        },
        creation_method: 'wizard',
        creation_timestamp: new Date().toISOString(),
        version: '1.0',
      };

      await saveCharacter(characterData);
      console.log('Character saved successfully:', character.name);
    } catch (error) {
      console.error('Error saving character:', error);
    }
  };

  const handleSaveStory = async (storySummary: any) => {
    try {
      // Save story summary to project
      console.log('Story summary saved successfully:', storySummary.title);

      // Here you would typically save to a story service or store
      // For now, we'll just log it
      console.log('Story details:', {
        title: storySummary.title,
        type: storySummary.videoType,
        duration: storySummary.duration,
        genres: storySummary.genre,
        summary: storySummary.mainConflict
      });
    } catch (error) {
      console.error('Error saving story:', error);
    }
  };

  const handlePromptChange = (shotId: number, newPrompt: string) => {
    // Update the shot's prompt in local state
    setShots(prevShots =>
      prevShots.map(shot =>
        shot.id === shotId ? { ...shot, prompt: newPrompt } : shot
      )
    );

    // Auto-save with debouncing (will be implemented)
    debouncedSave(shotId, { prompt: newPrompt });
  };

  // Context menu handlers
  const handleShotContextMenu = (e: React.MouseEvent, shot: Shot) => {
    e.preventDefault();
    setContextMenu({
      shot,
      position: { x: e.clientX, y: e.clientY }
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const handleEditShot = () => {
    if (contextMenu) {
      setSelectedShot(contextMenu.shot.id);
      setContextMenu(null);
    }
  };

  const handleDuplicateShot = () => {
    if (contextMenu) {
      const newShot: Shot = {
        ...contextMenu.shot,
        id: shots.length + 1,
        title: `${contextMenu.shot.title} (Copy)`
      };
      setShots([...shots, newShot]);
      setContextMenu(null);
    }
  };

  const handleDeleteShot = () => {
    if (contextMenu) {
      setShots(shots.filter(shot => shot.id !== contextMenu.shot.id));
      if (selectedShot === contextMenu.shot.id) {
        setSelectedShot(null);
      }
      setContextMenu(null);
    }
  };

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu) {
        setContextMenu(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu]);

  // Timeline control functions
  const handleTimeChange = useCallback((newTime: number) => {
    setCurrentTime(Math.max(0, Math.min(totalDuration, newTime)));
  }, [totalDuration]);

  const handleZoomChange = useCallback((newZoom: number) => {
    setZoom(Math.max(0.1, Math.min(5, newZoom)));
  }, []);

  const handleFrameStep = useCallback((direction: 'forward' | 'backward') => {
    const frameDuration = 1 / 30; // Assuming 30fps
    const step = direction === 'forward' ? frameDuration : -frameDuration;
    handleTimeChange(currentTime + step);
  }, [currentTime, handleTimeChange]);

  const handleLoopToggle = useCallback(() => {
    setLoopEnabled(!loopEnabled);
  }, [loopEnabled]);

  const handleFillGaps = async (
    trackType: 'video' | 'image' | 'audio' | 'text',
    profile: AmbianceProfile
  ) => {
    if (!project?.id) {
      showToast('error', 'Aucun projet actif pour combler les trous.');
      return;
    }

    showLoading(`Comblement (${profile.name})...`);
    try {
      let finalProfile = { ...profile };

      // 4. Handle AI Generation if needed
      if (profile.id === 'custom_ai') {
        const aiPrompt = window.prompt("Décrivez l'ambiance sonore souhaitée (ex: 'Vent glacial dans un canyon désertique', 'Bruit de foule lointain dans un stade') :");

        if (!aiPrompt) {
          hideLoading();
          return;
        }

        showLoading("Génération de l'ambiance par l'IA...");
        const genResult = await videoEditorAPI.generateAmbiance(project.id, aiPrompt);

        finalProfile = {
          ...profile,
          name: aiPrompt,
          file_path: genResult.file_path
        };

        showLoading(`Comblement (${aiPrompt})...`);
      }

      // 1. Fetch current project state to get track IDs
      const projectData = await videoEditorAPI.getProject(project.id);

      // 2. Find the first track of the matching type
      const targetTrack = projectData.tracks.find(t => t.type === trackType);

      if (!targetTrack) {
        showToast('info', `Piste ${trackType} vide ou introuvable.`);
        hideLoading();
        return;
      }

      // 3. Call fillGaps with the selected ambiance profile (static or newly generated)
      await videoEditorAPI.fillGaps(project.id, targetTrack.id, {
        name: finalProfile.name,
        file_path: finalProfile.file_path,
        type: finalProfile.type
      });

      showToast('success', `Smart Fill terminé : ambiance "${finalProfile.name}" appliquée.`);
    } catch (err) {
      console.error('[VideoEditor] Fill gaps failed:', err);
      showToast('error', 'Échec du comblement automatique.');
    } finally {
      hideLoading();
    }
  };

  const handleFormatChange = async (newRatio: '16:9' | '9:16') => {
    if (newRatio === aspectRatio) return;

    const confirmChange = window.confirm(
      `Voulez-vous passer au format ${newRatio === '16:9' ? 'Paysage' : 'Portrait'} ?\nL'IA va automatiquement recadrer vos plans pour préserver l'action.`
    );

    if (!confirmChange) return;

    setAspectRatio(newRatio);
    showLoading(`Adaptation au format ${newRatio}...`);

    try {
      // Pour cet exemple, on applique le Smart Crop sur chaque shot visible
      const updatedShots = await Promise.all(shots.map(async (shot) => {
        try {
          // 1. Démarrer le job Smart Crop
          // Note: Dans une vraie appli, shot.media_id serait utilisé
          const response = await videoEditorAPI.smartCrop(shot.id.toString(), newRatio, 'face');

          let status = response.status;
          let job_id = response.job_id;
          let cropRegions = response.crop_regions;

          // 2. Polling si nécessaire (limité pour l'UI)
          let attempts = 0;
          while (status === 'pending' && attempts < 5) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const jobStatus = await videoEditorAPI.getAiJobStatus(job_id);
            status = jobStatus.status;
            cropRegions = jobStatus.crop_regions;
            attempts++;
          }

          if (cropRegions) {
            return {
              ...shot,
              smartCrop: cropRegions[0] // On prend la première région détectée
            };
          }
          return shot;
        } catch (e) {
          console.error(`Failed to crop shot ${shot.id}:`, e);
          return shot;
        }
      }));

      setShots(updatedShots);
      showToast('success', `Projet adapté avec succès au format ${newRatio}.`);
    } catch (err) {
      console.error('Smart Crop failed:', err);
      showToast('error', "Échec de l'adaptation automatique du format.");
    } finally {
      hideLoading();
    }
  };

  return (
    <div className="video-editor-container">
      {/* Toolbar - Simplified header without duplicate menu */}
      <div className="editor-toolbar">
        {onBackToDashboard && (
          <button className="btn-back" onClick={onBackToDashboard}>
            ← Back to Dashboard
          </button>
        )}
        <span className="project-name">{projectName}</span>

        <div className="project-format-switcher ml-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="format-btn">
                {aspectRatio === '16:9' ? <Monitor size={14} /> : <Smartphone size={14} />}
                <span className="ml-2">{aspectRatio}</span>
                <ChevronDown size={14} className="ml-1 opacity-50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Format du Projet</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => handleFormatChange('16:9')}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center">
                    <Monitor size={14} className="mr-2" />
                    <span>Paysage (16:9)</span>
                  </div>
                  {aspectRatio === '16:9' && <Check size={14} />}
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleFormatChange('9:16')}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center">
                    <Smartphone size={14} className="mr-2" />
                    <span>Portrait (9:16)</span>
                  </div>
                  {aspectRatio === '9:16' && <Check size={14} />}
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <span className="sequence-name">{sequenceName}</span>

        {/* Auto-save status indicator */}
        <div className="save-status">
          {isSaving ? (
            <div className="saving-indicator">
              <Save size={16} className="saving-icon" />
              <span>Saving...</span>
            </div>
          ) : lastSavedAt ? (
            <div className="saved-indicator">
              <span>✓ Saved</span>
              <span className="save-time">
                {new Date(lastSavedAt).toLocaleTimeString()}
              </span>
            </div>
          ) : (
            <div className="unsaved-indicator">
              <span>Not saved</span>
            </div>
          )}
        </div>
      </div>

      <div className="editor-main">
        {/* Left Sidebar - Library */}
        <aside className="sidebar-left">
          <div className="search-bar">
            <Search size={16} className="search-icon" />
            <input type="text" placeholder="Rechercher assets..." />
          </div>

          {/* Library Assets Section */}
          <div className="library-section">
            <button
              className="section-header"
              onClick={() => setIsLibraryOpen(!isLibraryOpen)}
            >
              <FolderOpen size={18} className="section-icon purple" />
              <span>BIBLIOTHÈQUE ASSETS</span>
              <span className="badge">12</span>
            </button>
            {isLibraryOpen && (
              <div className="section-content">
                <div className="asset-category">
                  <Users size={16} className="category-icon" />
                  <span>Personnages</span>
                  <span className="count">{characters.length}</span>
                  <button
                    className="add-button"
                    onClick={() => setIsCharacterWizardOpen(true)}
                    title="Créer un nouveau personnage"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <div className="asset-list">
                  {characters.map(character => (
                    <div key={character.character_id} className="asset-item">
                      {character.name}
                    </div>
                  ))}
                  {characters.length === 0 && (
                    <div className="asset-item empty">
                      Aucun personnage - Cliquez + pour créer
                    </div>
                  )}
                </div>

                <div className="asset-category">
                  <Mountain size={16} className="category-icon" />
                  <span>Environnements</span>
                  <span className="count">5</span>
                </div>
                <div className="asset-list">
                  <div className="asset-item">Ville_Futuriste</div>
                  <div className="asset-item">Forêt_Mystique</div>
                  <div className="asset-item">Désert_Aride</div>
                </div>

                <div className="asset-category">
                  <Box size={16} className="category-icon" />
                  <span>Props & Objets</span>
                  <span className="count">4</span>
                </div>
                <div className="asset-list">
                  <div className="asset-item">Épée_Légendaire</div>
                  <div className="asset-item">Véhicule_Hover</div>
                </div>
              </div>
            )}
          </div>

          {/* Templates Section */}
          <div className="library-section">
            <button
              className="section-header"
              onClick={() => setIsTemplatesOpen(!isTemplatesOpen)}
            >
              <LayoutTemplate size={18} className="section-icon cyan" />
              <span>TEMPLATES & STYLES</span>
              <span className="badge">8</span>
            </button>
            {isTemplatesOpen && (
              <div className="section-content">
                <div className="asset-category">
                  <Palette size={16} className="category-icon" />
                  <span>Styles Visuels</span>
                </div>
                <div className="asset-list">
                  <div className="asset-item">Cinématique</div>
                  <div className="asset-item">Concept Art</div>
                  <div className="asset-item">Anime</div>
                </div>

                <div className="asset-category">
                  <Camera size={16} className="category-icon" />
                  <span>Presets Caméra</span>
                </div>
                <div className="asset-list">
                  <div className="asset-item">Travelling</div>
                  <div className="asset-item">Plongée</div>
                  <div className="asset-item">Contre-plongée</div>
                </div>

                <div className="asset-category">
                  <Sun size={16} className="category-icon" />
                  <span>Lighting Rig</span>
                </div>
                <div className="asset-list">
                  <div className="asset-item">Golden Hour</div>
                  <div className="asset-item">Studio</div>
                  <div className="asset-item">Nuit</div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="quick-actions">
            <button className="btn-new-asset">
              <Plus size={18} />
              Nouvel Asset IA
            </button>
            <div className="action-grid">
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
        </aside>

        {/* Center Area - Player & Timeline */}
        <main className="center-area">
          <div className="video-player">
            {selectedShot ? (
              <EffectPreviewRenderer
                videoSrc={shots.find(shot => shot.id === selectedShot)?.thumbnail || ''}
                effects={appliedEffects}
                width={640}
                height={360}
                onPerformanceMetrics={(metrics) => {
                  console.log('GPU Performance:', metrics);
                }}
              />
            ) : (
              <div className="player-content">
                <ImageIcon size={48} className="player-icon" />
                <p>Sélectionnez un shot pour voir l'aperçu avec effets</p>
              </div>
            )}
          </div>

          {/* Professional Video Editing Tools */}
          <div className="video-editing-tools">
            <div className="tool-toolbar">
              <button
                className={`tool-btn ${selectedTool === 'select' ? 'active' : ''}`}
                onClick={() => setSelectedTool('select')}
                title="Selection Tool"
              >
                <Edit size={16} />
                Select
              </button>

              <button
                className={`tool-btn ${selectedTool === 'trim' ? 'active' : ''}`}
                onClick={() => setSelectedTool('trim')}
                title="Trim Tool"
              >
                <ScissorsIcon size={16} />
                Trim
              </button>

              <button
                className={`tool-btn ${selectedTool === 'split' ? 'active' : ''}`}
                onClick={() => setSelectedTool('split')}
                title="Split Tool"
              >
                <SplitIcon size={16} />
                Split
              </button>

              <button
                className={`tool-btn ${selectedTool === 'transition' ? 'active' : ''}`}
                onClick={() => setSelectedTool('transition')}
                title="Transition Tool"
              >
                <Sparkles size={16} />
                Transition
              </button>

              <button
                className={`tool-btn ${selectedTool === 'text' ? 'active' : ''}`}
                onClick={() => setSelectedTool('text')}
                title="Text Tool"
              >
                <Type size={16} />
                Text
              </button>

              <button
                className={`tool-btn ${selectedTool === 'keyframe' ? 'active' : ''}`}
                onClick={() => setSelectedTool('keyframe')}
                title="Keyframe Tool"
              >
                <Move size={16} />
                Keyframe
              </button>

              <div className="tool-separator" />

              <button
                className="tool-btn"
                onClick={() => setShowMediaLibrary(true)}
                title="Media Library"
              >
                <ImageIcon size={16} />
                Media
              </button>

              <button
                className="tool-btn"
                onClick={() => setShowLayerPanel(true)}
                title="Layer Panel"
              >
                <LayersIcon size={16} />
                Layers
              </button>
            </div>

            {/* Tool Panels */}
            {selectedTool === 'transition' && (
              <div className="tool-panel">
                <TransitionLibrary
                  onTransitionSelect={(transition) => {
                    setShowTransitionEditor(true);
                    // Store selected transition for editor
                  }}
                />
              </div>
            )}

            {selectedTool === 'text' && (
              <div className="tool-panel">
                <button
                  className="add-text-btn"
                  onClick={() => {
                    const newTextClip = {
                      id: `text-${Date.now()}`,
                      text: 'New Text',
                      style: {
                        fontFamily: 'Arial',
                        fontSize: 48,
                        fontWeight: 'bold' as const,
                        fontStyle: 'normal' as const,
                        textDecoration: 'none' as const,
                        textAlign: 'center' as const,
                        color: '#ffffff',
                        backgroundColor: 'transparent',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                        letterSpacing: 0,
                        lineHeight: 1.2,
                        textTransform: 'none' as const,
                      },
                      position: { x: 100, y: 100 },
                      size: { width: 400, height: 100 },
                      isSelected: true,
                    };
                    setTextClips([...textClips, newTextClip]);
                    setSelectedTextClip(newTextClip.id);
                  }}
                >
                  <Plus size={16} />
                  Add Text
                </button>
              </div>
            )}

            {selectedTool === 'keyframe' && (
              <div className="tool-panel">
                <button
                  className="keyframe-btn"
                  onClick={() => setShowKeyframeEditor(true)}
                >
                  <Move size={16} />
                  Open Keyframe Editor
                </button>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="timeline-container">
            {/* Professional Timeline Controls */}
            <TimelineScrubber
              currentTime={currentTime}
              duration={totalDuration}
              zoom={zoom}
              isPlaying={isPlaying}
              onTimeChange={handleTimeChange}
              onPlayPause={() => isPlaying ? pause() : play()}
              onZoomChange={handleZoomChange}
              onFrameStep={handleFrameStep}
              loopEnabled={loopEnabled}
              onLoopToggle={handleLoopToggle}
            />

            {/* Timeline Ruler */}
            <TimelineRuler
              duration={totalDuration}
              zoom={zoom}
              currentTime={currentTime}
            />

            <div className="timeline-track">
              {shots.map((shot, index) => (
                <div
                  key={shot.id}
                  className={`timeline-shot ${selectedShot === shot.id ? 'selected' : ''}`}
                  style={{ width: `${(shot.duration / totalDuration) * 100}%` }}
                  onClick={() => setSelectedShot(shot.id)}
                >
                  <span className="shot-label">
                    {shot.title} : Durée {shot.duration} secondes
                  </span>
                </div>
              ))}
              <button className="timeline-add-btn" onClick={handleAddShot} title="Add shot" aria-label="Add shot">
                <Plus size={16} />
              </button>
            </div>

            <p className="timeline-hint">
              Fais glisser les ressources ici et commence à créer
            </p>

            {/* Audio Waveform and Volume Controls */}
            <AudioWaveform
              duration={totalDuration}
              currentTime={currentTime}
              volume={audioVolume}
              isMuted={audioMuted}
              onVolumeChange={setAudioVolume}
              onMuteToggle={() => setAudioMuted(!audioMuted)}
            />

            <VolumeKeyframes
              duration={totalDuration}
              currentTime={currentTime}
              keyframes={volumeKeyframes}
              onKeyframesChange={setVolumeKeyframes}
            />

            {/* Timeline Tracks for Media */}
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
                  <h4>{shot.title}</h4>
                  <p className="shot-duration">{shot.duration}s</p>
                  <textarea
                    className="shot-prompt"
                    placeholder="Prompt text image et animation"
                    value={shot.prompt}
                    onChange={(e) => handlePromptChange(shot.id, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Effects Panel */}
          {selectedShot && (
            <div className="effects-panel">
              <div className="panel-section">
                <h3>Effets Visuels</h3>
                <EffectsLibrary
                  onEffectSelect={(effect) => {
                    setAppliedEffects([...appliedEffects, {
                      ...effect,
                      id: Date.now().toString(),
                      order: appliedEffects.length,
                      type: 'custom',
                      enabled: true
                    }]);
                  }}
                />
              </div>

              <div className="panel-section">
                <h3>Pile d'Effets</h3>
                <EffectStack
                  effects={appliedEffects}
                  onEffectsChange={(effects: AppliedEffect[]) => setAppliedEffects(effects)}
                  onEffectSelect={(effect: AppliedEffect) => {
                    // Handle effect selection if needed
                  }}
                />
              </div>

              {appliedEffects.length > 0 && (
                <div className="panel-section">
                  <h3>Contrôles d'Effets</h3>
                  <EffectControls
                    effects={appliedEffects}
                    onEffectUpdate={(effectId, updates) => {
                      setAppliedEffects(appliedEffects.map(e =>
                        e.id === effectId ? { ...e, ...updates } : e
                      ));
                    }}
                    currentTime={currentTime}
                    duration={totalDuration}
                  />
                </div>
              )}
            </div>
          )}

          <div className="panel-footer">
            <div className="project-details">
              <div className="detail-row">
                <span className="label">Chemin:</span>
                <span className="value">/projects/demo</span>
              </div>
              <div className="detail-row">
                <span className="label">Format:</span>
                <span className="value">16:9</span>
              </div>
              <div className="detail-row">
                <span className="label">Résolution:</span>
                <span className="value">1920×1080</span>
              </div>
              <div className="detail-row">
                <span className="label">FPS:</span>
                <span className="value">30</span>
              </div>
            </div>
            <button className="btn-modify">Modifier</button>
          </div>
        </aside>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <Loader2 size={48} className="loading-spinner" />
            <p className="loading-message">{loadingMessage}</p>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`toast-notification toast-${toast.type}`}>
          {toast.type === 'success' && <CheckCircle size={20} />}
          {toast.type === 'error' && <AlertCircle size={20} />}
          {toast.type === 'info' && <AlertCircle size={20} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <ShotContextMenu
          shot={contextMenu.shot}
          position={contextMenu.position}
          onClose={handleCloseContextMenu}
          onEdit={handleEditShot}
          onDelete={handleDeleteShot}
          onDuplicate={handleDuplicateShot}
        />
      )}

      {/* Character Creator Wizard */}
      <CharacterCreatorWizard
        isOpen={isCharacterWizardOpen}
        onClose={() => setIsCharacterWizardOpen(false)}
        onSave={handleSaveCharacter}
        worldContext={{ genre: 'fantasy', description: 'Monde médiéval avec magie' }} // Mock world context
      />

      {/* Storyteller Wizard */}
      <StorytellerWizard
        isOpen={isStorytellerWizardOpen}
        onClose={() => setIsStorytellerWizardOpen(false)}
        onSave={handleSaveStory}
        projectContext={{
          characters: characters,
          world: world,
          locations: locations,
          previousStories: stories
        }}
      />

      {/* Professional Video Editing Modals */}
      {showTransitionEditor && (
        <div className="modal-overlay">
          <TransitionEditor
            transition={{
              id: 'fade-transition',
              name: 'Fade Transition',
              type: 'fade',
              duration: 1.0,
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
        </div>
      )}

      {showKeyframeEditor && (
        <div className="modal-overlay">
          <KeyframeEditor
            properties={[]} // TODO: Pass actual properties
            duration={totalDuration}
            currentTime={currentTime}
            onPropertyUpdate={() => { }}
            onKeyframeAdd={() => { }}
            onKeyframeUpdate={() => { }}
            onKeyframeRemove={() => { }}
            onPlayPause={() => isPlaying ? pause() : play()}
            onSeek={handleTimeChange}
          />
        </div>
      )}

      {showMediaLibrary && (
        <div className="modal-overlay">
          <div className="media-library-modal">
            <div className="modal-header">
              <h3>Media Library</h3>
              <button onClick={() => setShowMediaLibrary(false)} title="Close media library" aria-label="Close media library">×</button>
            </div>
            <MediaLibrary
              assets={mediaAssets}
              folders={mediaFolders}
              selectedAssetIds={[]}
              onAssetSelect={() => { }}
              onAssetImport={(files) => {
                console.log('Importing files:', files);
                setShowMediaLibrary(false);
              }}
              onAssetDelete={() => { }}
              onAssetDownload={() => { }}
              onAssetFavorite={() => { }}
              onFolderCreate={() => { }}
              onFolderDelete={() => { }}
              onAssetMove={() => { }}
            />
          </div>
        </div>
      )}

      {showLayerPanel && (
        <div className="modal-overlay">
          <div className="layer-panel-modal">
            <div className="modal-header">
              <h3>Layer Management</h3>
              <button onClick={() => setShowLayerPanel(false)} title="Close layer panel" aria-label="Close layer panel">×</button>
            </div>
            <LayerPanel
              layers={layers}
              selectedLayerIds={selectedLayerIds}
              onLayerSelect={(layerId, multiSelect) => {
                if (multiSelect) {
                  setSelectedLayerIds(prev =>
                    prev.includes(layerId)
                      ? prev.filter(id => id !== layerId)
                      : [...prev, layerId]
                  );
                } else {
                  setSelectedLayerIds([layerId]);
                }
              }}
              onLayerUpdate={(layerId, updates) => {
                setLayers(prev => prev.map(layer =>
                  layer.id === layerId ? { ...layer, ...updates } : layer
                ));
              }}
              onLayerAdd={(type, name) => {
                const newLayer = {
                  id: `layer-${Date.now()}`,
                  name: name || `New ${type} Layer`,
                  type,
                  visible: true,
                  locked: false,
                  opacity: 1,
                  blendMode: 'normal' as const,
                  position: { x: 0, y: 0, z: layers.length },
                };
                setLayers(prev => [...prev, newLayer]);
              }}
              onLayerRemove={(layerId) => {
                setLayers(prev => prev.filter(layer => layer.id !== layerId));
                setSelectedLayerIds(prev => prev.filter(id => id !== layerId));
              }}
              onLayerDuplicate={(layerId) => {
                const layer = layers.find(l => l.id === layerId);
                if (layer) {
                  const duplicatedLayer = {
                    ...layer,
                    id: `layer-${Date.now()}`,
                    name: `${layer.name} (Copy)`,
                    position: { ...layer.position, z: layers.length }
                  };
                  setLayers(prev => [...prev, duplicatedLayer]);
                }
              }}
              onLayerReorder={(layerId, newIndex) => {
                // Implémenter la logique de réordering des layers
                setLayers(prev => {
                  const oldIndex = prev.findIndex(l => l.id === layerId);
                  if (oldIndex === -1) return prev;

                  const newLayers = [...prev];
                  const [removed] = newLayers.splice(oldIndex, 1);
                  newLayers.splice(newIndex, 0, removed);

                  // Mettre à jour les positions z
                  return newLayers.map((layer, index) => ({
                    ...layer,
                    position: { ...layer.position, z: index }
                  }));
                });
                console.log('Layer reordered:', layerId, 'to index:', newIndex);
              }}
              onLayerGroup={(layerIds, groupName) => {
                console.log('Group layers:', layerIds, 'with name:', groupName);
              }}
              onLayerUngroup={(groupId) => {
                console.log('Ungroup layer:', groupId);
              }}
            />
          </div>
        </div>
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
          onTextChange={(text) => {
            setTextClips(prev => prev.map(clip =>
              clip.id === textClip.id ? { ...clip, text } : clip
            ));
          }}
          onStyleChange={(style) => {
            setTextClips(prev => prev.map(clip =>
              clip.id === textClip.id ? { ...clip, style: { ...clip.style, ...style } } : clip
            ));
          }}
          onAnimationChange={(animation) => {
            setTextClips(prev => prev.map(clip =>
              clip.id === textClip.id ? { ...clip, animation } : clip
            ));
          }}
          onPositionChange={(position) => {
            setTextClips(prev => prev.map(clip =>
              clip.id === textClip.id ? { ...clip, position } : clip
            ));
          }}
          onSizeChange={(size) => {
            setTextClips(prev => prev.map(clip =>
              clip.id === textClip.id ? { ...clip, size } : clip
            ));
          }}
          onSelect={() => setSelectedTextClip(textClip.id)}
        />
      ))}

      {/* AI Assistant Integration for Video Editor V3 */}
      <FloatingAIAssistant />
    </div>
  );
};

export default VideoEditorPage;

