/**
 * Storyboard Generator
 * Generate visual storyboards from sequence shots with AI-powered image generation
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Image as ImageIcon,
  Grid3X3,
  Columns,
  Rows,
  Download,
  Copy,
  RefreshCw,
  Wand2,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Settings,
  Sparkles,
  Film,
  Camera,
  Palette,
  Zap,
  Save,
  Share2,
  Maximize2,
  Layers,
  Layout,
  Type,
  Volume2,
  Clock,
  User,
  MapPin
} from 'lucide-react';
import type { Shot, Character, Location } from '@/types';
import type {
  EnhancedShot,
  CompleteSequence,
  CameraMovement,
  MoodType,
  ToneType
} from '@/types/cinematicTypes';
import {
  getCameraMovementConfig,
  moodColors
} from '@/types/cinematicTypes';
import './StoryboardGenerator.css';

interface StoryboardGeneratorProps {
  sequence: CompleteSequence;
  shots: EnhancedShot[];
  characters: Character[];
  locations: Location[];
  onUpdateShot: (shotId: string, updates: Partial<EnhancedShot>) => void;
  onGenerateImage: (shotId: string, prompt: string) => Promise<string>;
  className?: string;
}

interface StoryboardFrame {
  id: string;
  shotId: string;
  title: string;
  description: string;
  duration: number;
  cameraMovement: CameraMovement | null;
  mood: MoodType;
  tone: ToneType;
  characters: string[];
  location: string;
  imagePrompt: string;
  negativePrompt: string;
  generatedImage: string | null;
  isGenerating: boolean;
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3';
  style: string;
  notes: string;
}

type ViewMode = 'grid' | 'columns' | 'rows' | 'slideshow';
type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3';
type SortOrder = 'position' | 'duration' | 'mood';

export function StoryboardGenerator({
  sequence,
  shots,
  characters,
  locations,
  onUpdateShot,
  onGenerateImage,
  className
}: StoryboardGeneratorProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [sortOrder, setSortOrder] = useState<SortOrder>('position');
  const [showPrompts, setShowPrompts] = useState(true);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [slideshowIndex, setSlideshowIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  // Convert shots to storyboard frames
  const frames = useMemo((): StoryboardFrame[] => {
    return shots.map((shot, index) => {
      // Helper to find character name
      // Assuming characters and locations are improved in scope or lookup maps
      // If props are not available in scope, we can't lookup.
      // But props `characters` and `locations` ARE available in the component scope.
      const getCharacterName = (id: string) => characters.find(c => c.character_id === id)?.name || 'Unknown Character';
      const getLocationName = (id?: string) => locations.find(l => l.id === id)?.name || '';

      // Generate image prompt based on shot properties
      const cameraConfig = shot.cameraMovement
        ? getCameraMovementConfig(shot.cameraMovement)
        : null;

      const characterNames = shot.characters?.map(c => getCharacterName(c.characterId)).join(', ') || '';
      const locationName = getLocationName(shot.locationId);

      // Build comprehensive prompt
      const imagePrompt = buildImagePrompt({
        title: shot.title || shot.name,
        description: shot.description,
        mood: shot.mood,
        tone: shot.tone,
        cameraMovement: cameraConfig?.name || 'cinematic shot',
        characters: characterNames,
        location: locationName,
        style: 'cinematic, film grain, professional lighting'
      });

      // Get director note content
      let noteContent = '';
      if (shot.directorNotes && shot.directorNotes.length > 0) {
        noteContent = shot.directorNotes[0].note;
      } else if (typeof shot.directorNote === 'string') {
        noteContent = shot.directorNote;
      }

      return {
        id: crypto.randomUUID(),
        shotId: shot.id,
        title: shot.title || shot.name,
        description: shot.description,
        duration: shot.duration,
        cameraMovement: shot.cameraMovement || null,
        mood: shot.mood,
        tone: shot.tone,
        characters: shot.characters?.map(c => getCharacterName(c.characterId)) || [],
        location: locationName,
        imagePrompt,
        negativePrompt: buildNegativePrompt(shot.mood),
        generatedImage: (shot.metadata?.generatedStoryboard as string) || null,
        isGenerating: false,
        aspectRatio,
        style: 'cinematic',
        notes: noteContent
      };

    });
  }, [shots, aspectRatio]);

  // Sort frames
  const sortedFrames = useMemo(() => {
    const sorted = [...frames];
    switch (sortOrder) {
      case 'position':
        return sorted;
      case 'duration':
        return sorted.sort((a, b) => b.duration - a.duration);
      case 'mood':
        return sorted.sort((a, b) => a.mood.localeCompare(b.mood));
      default:
        return sorted;
    }
  }, [frames, sortOrder]);

  // Build image prompt
  function buildImagePrompt(params: {
    title: string;
    description: string;
    mood: MoodType;
    tone: ToneType;
    cameraMovement: string;
    characters: string;
    location: string;
    style: string;
  }): string {
    const { title, description, mood, tone, cameraMovement, characters, location, style } = params;

    let prompt = `Professional cinematic storyboard: ${title}. `;
    prompt += `${description}. `;
    prompt += `Atmosphere: ${mood}, lighting: ${tone}. `;
    prompt += `Cinematography: ${cameraMovement}. `;

    if (characters) {
      prompt += `Subjects: ${characters}. `;
    }
    if (location) {
      prompt += `Setting: ${location}. `;
    }
    prompt += `${style}. `;
    prompt += 'Photorealist, 8K, high detail, cinematic lighting, sharp focus, professional film cinematography.';

    return prompt;
  }

  // Build negative prompt based on mood
  function buildNegativePrompt(mood: MoodType): string {
    let negative = 'blurry, low quality, distorted, amateur, ';

    switch (mood) {
      case 'happy':
        negative += 'sad, dark, gloomy, ';
        break;
      case 'dark':
        negative += 'bright, cheerful, colorful, ';
        break;
      case 'romantic':
        negative += 'violent, dark, scary, ';
        break;
      default:
        break;
    }

    negative += 'bad anatomy, extra limbs, poorly drawn face, mutation, deformed';

    return negative;
  }

  // Handle single frame generation
  const handleGenerateFrame = useCallback(async (frame: StoryboardFrame) => {
    const frameIndex = frames.findIndex(f => f.id === frame.id);
    if (frameIndex === -1) return;

    // Update generating state
    const newFrames = [...frames];
    newFrames[frameIndex].isGenerating = true;

    try {
      const imageUrl = await onGenerateImage(frame.shotId, frame.imagePrompt);

      onUpdateShot(frame.shotId, {
        metadata: {
          generatedStoryboard: imageUrl,
          storyboardPrompt: frame.imagePrompt,
          storyboardNegativePrompt: frame.negativePrompt
        }
      });

      const updatedFrames = [...frames];
      updatedFrames[frameIndex].generatedImage = imageUrl;
      updatedFrames[frameIndex].isGenerating = false;
    } catch (error) {
      console.error('Failed to generate image:', error);
      const updatedFrames = [...frames];
      updatedFrames[frameIndex].isGenerating = false;
    }
  }, [frames, onGenerateImage, onUpdateShot]);

  // Handle batch generation
  const handleGenerateAll = useCallback(async () => {
    setIsGeneratingAll(true);

    for (const frame of frames) {
      if (!frame.generatedImage) {
        await handleGenerateFrame(frame);
      }
    }

    setIsGeneratingAll(false);
  }, [frames, handleGenerateFrame]);

  // Handle frame update
  const handleFrameUpdate = useCallback((frameId: string, updates: Partial<StoryboardFrame>) => {
    const frameIndex = frames.findIndex(f => f.id === frameId);
    if (frameIndex === -1) return;

    const newFrames = [...frames];
    newFrames[frameIndex] = { ...newFrames[frameIndex], ...updates };
  }, [frames]);

  // Slideshow controls
  const nextSlideshow = useCallback(() => {
    setSlideshowIndex((prev) => (prev + 1) % sortedFrames.length);
  }, [sortedFrames.length]);

  const prevSlideshow = useCallback(() => {
    setSlideshowIndex((prev) => (prev - 1 + sortedFrames.length) % sortedFrames.length);
  }, [sortedFrames.length]);

  // Export as JSON
  const handleExportJSON = useCallback(() => {
    const data = JSON.stringify(sortedFrames, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sequence.name.replace(/\s+/g, '_')}_storyboard.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [sortedFrames, sequence.name]);

  // Calculate grid columns based on view mode
  const getGridClass = () => {
    switch (viewMode) {
      case 'grid': return 'storyboard-grid-3';
      case 'columns': return 'storyboard-grid-2';
      case 'rows': return 'storyboard-grid-1';
      default: return '';
    }
  };

  return (
    <div className={`storyboard-generator ${className || ''}`}>
      {/* Header */}
      <div className="storyboard-header">
        <div className="header-left">
          <Film className="w-5 h-5" />
          <h2>Storyboard Generator</h2>
          <span className="shot-count">{sortedFrames.length} frames</span>
        </div>

        <div className="header-actions">
          {/* View Mode */}
          <div className="view-toggle">
            <button
              className={viewMode === 'grid' ? 'active' : ''}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              className={viewMode === 'columns' ? 'active' : ''}
              onClick={() => setViewMode('columns')}
              title="Two Columns"
            >
              <Columns className="w-4 h-4" />
            </button>
            <button
              className={viewMode === 'rows' ? 'active' : ''}
              onClick={() => setViewMode('rows')}
              title="List View"
            >
              <Rows className="w-4 h-4" />
            </button>
            <button
              className={viewMode === 'slideshow' ? 'active' : ''}
              onClick={() => setViewMode('slideshow')}
              title="Slideshow"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Aspect Ratio */}
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
            className="aspect-select"
          >
            <option value="16:9">16:9</option>
            <option value="9:16">9:16</option>
            <option value="1:1">1:1</option>
            <option value="4:3">4:3</option>
          </select>

          {/* Sort */}
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            className="sort-select"
          >
            <option value="position">Par position</option>
            <option value="duration">Par duree</option>
            <option value="mood">Par mood</option>
          </select>

          {/* Toggle Prompts */}
          <button
            className={`btn-toggle ${showPrompts ? 'active' : ''}`}
            onClick={() => setShowPrompts(!showPrompts)}
          >
            {showPrompts ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            Prompts
          </button>

          {/* Settings */}
          <button
            className={`btn-toggle ${showSettings ? 'active' : ''}`}
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Export */}
          <button className="btn-export" onClick={handleExportJSON}>
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="settings-panel">
          <h3>Generation Settings</h3>
          <div className="settings-grid">
            <label>
              Style Preset
              <select defaultValue="cinematic">
                <option value="cinematic">Cinematic</option>
                <option value="anime">Anime</option>
                <option value="illustration">Illustration</option>
                <option value="photorealistic">Photorealistic</option>
              </select>
            </label>
            <label>
              Quality
              <select defaultValue="high">
                <option value="standard">Standard</option>
                <option value="high">High</option>
                <option value="ultra">Ultra</option>
              </select>
            </label>
            <label>
              Lighting
              <select defaultValue="natural">
                <option value="natural">Natural</option>
                <option value="dramatic">Dramatic</option>
                <option value="soft">Soft</option>
                <option value="neon">Neon</option>
              </select>
            </label>
            <label>
              Color Grading
              <select defaultValue="neutral">
                <option value="neutral">Neutral</option>
                <option value="warm">Warm</option>
                <option value="cool">Cool</option>
                <option value="vintage">Vintage</option>
              </select>
            </label>
          </div>
        </div>
      )}

      {/* Content */}
      <div className={`storyboard-content ${viewMode === 'slideshow' ? 'slideshow-mode' : ''}`}>
        {viewMode === 'slideshow' ? (
          /* Slideshow View */
          <div className="slideshow-container">
            {sortedFrames.length > 0 && (
              <>
                <div className="slideshow-frame">
                  <SlideshowFrame
                    frame={sortedFrames[slideshowIndex]}
                    onGenerate={() => handleGenerateFrame(sortedFrames[slideshowIndex])}
                    showPrompt={showPrompts}
                    onUpdate={(updates) => handleFrameUpdate(sortedFrames[slideshowIndex].id, updates)}
                  />
                </div>
                <div className="slideshow-controls">
                  <button onClick={prevSlideshow}>Precedent</button>
                  <span>{slideshowIndex + 1} / {sortedFrames.length}</span>
                  <button onClick={nextSlideshow}>Suivant</button>
                </div>
              </>
            )}
          </div>
        ) : (
          /* Grid/Columns/Rows View */
          <div className={`storyboard-grid ${getGridClass()}`}>
            {sortedFrames.map((frame) => (
              <StoryboardFrameCard
                key={frame.id}
                frame={frame}
                isSelected={selectedFrameId === frame.id}
                showPrompt={showPrompts}
                onSelect={() => setSelectedFrameId(frame.id)}
                onGenerate={() => handleGenerateFrame(frame)}
                onUpdate={(updates) => handleFrameUpdate(frame.id, updates)}
                aspectRatio={aspectRatio}
              />
            ))}
          </div>
        )}
      </div>

      {/* Batch Generation Bar */}
      <div className="batch-bar">
        <button
          className="btn-batch-generate"
          onClick={handleGenerateAll}
          disabled={isGeneratingAll}
        >
          {isGeneratingAll ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Generation en cours...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              Generer tout
            </>
          )}
        </button>
        <span className="generation-progress">
          {frames.filter(f => f.generatedImage).length} / {frames.length} generes
        </span>
      </div>
    </div>
  );
}

// Storyboard Frame Card Component
interface FrameCardProps {
  frame: StoryboardFrame;
  isSelected: boolean;
  showPrompt: boolean;
  aspectRatio: AspectRatio;
  onSelect: () => void;
  onGenerate: () => void;
  onUpdate: (updates: Partial<StoryboardFrame>) => void;
}

function StoryboardFrameCard({
  frame,
  isSelected,
  showPrompt,
  onSelect,
  onGenerate,
  onUpdate,
  aspectRatio
}: FrameCardProps) {
  const aspectRatioClass = `aspect-${aspectRatio.replace(':', '-')}`;

  return (
    <div
      className={`storyboard-card ${isSelected ? 'selected' : ''} ${aspectRatioClass}`}
      onClick={onSelect}
    >
      <div className="card-header">
        <span className="frame-number">#{frame.shotId.slice(-4)}</span>
        <span
          className="mood-badge"
          style={{ backgroundColor: moodColors[frame.mood]?.bg }}
        >
          {frame.mood}
        </span>
      </div>

      <div className="frame-preview">
        {frame.generatedImage ? (
          <img src={frame.generatedImage} alt={frame.title} />
        ) : (
          <div className="placeholder">
            <Camera className="w-8 h-8" />
            <span>Aucun image</span>
          </div>
        )}

        {frame.isGenerating && (
          <div className="generating-overlay">
            <RefreshCw className="w-8 h-8 animate-spin" />
            <span>Generation...</span>
          </div>
        )}

        {!frame.generatedImage && !frame.isGenerating && (
          <button className="btn-generate" onClick={(e) => { e.stopPropagation(); onGenerate(); }}>
            <Wand2 className="w-4 h-4" />
            Generer
          </button>
        )}
      </div>

      <div className="card-body">
        <h4>{frame.title}</h4>
        <p className="description">{frame.description}</p>

        <div className="card-meta">
          <span><Clock className="w-3 h-3" />{frame.duration}s</span>
          {frame.cameraMovement && (
            <span>
              <Camera className="w-3 h-3" />
              {getCameraMovementConfig(frame.cameraMovement)?.name || frame.cameraMovement}
            </span>
          )}
          {frame.characters.length > 0 && (
            <span><User className="w-3 h-3" />{frame.characters.length}</span>
          )}
        </div>

        {showPrompt && (
          <div className="prompt-section">
            <div className="prompt-field positive">
              <span className="label">Prompt</span>
              <textarea
                value={frame.imagePrompt}
                onChange={(e) => onUpdate({ imagePrompt: e.target.value })}
                placeholder="Enter prompt..."
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}

        <div className="card-actions">
          <button
            className="btn-action"
            onClick={(e) => { e.stopPropagation(); onUpdate({ notes: prompt('Notes:', frame.notes) || '' }); }}
          >
            <Type className="w-3 h-3" />
          </button>
          <button className="btn-action">
            <Copy className="w-3 h-3" />
          </button>
          <button className="btn-action">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Slideshow Frame Component
interface SlideshowFrameProps {
  frame: StoryboardFrame;
  showPrompt: boolean;
  onGenerate: () => void;
  onUpdate: (updates: Partial<StoryboardFrame>) => void;
}

function SlideshowFrame({ frame, showPrompt, onGenerate, onUpdate }: SlideshowFrameProps) {
  return (
    <div className="slideshow-frame-content">
      <div className="slideshow-image">
        {frame.generatedImage ? (
          <img src={frame.generatedImage} alt={frame.title} />
        ) : (
          <div className="placeholder-large">
            <Camera className="w-16 h-16" />
            <h3>{frame.title}</h3>
            <p>{frame.description}</p>
            <button className="btn-generate-large" onClick={onGenerate}>
              <Wand2 className="w-6 h-6" />
              Generer l'image
            </button>
          </div>
        )}
      </div>

      <div className="slideshow-info">
        <h3>{frame.title}</h3>
        <div className="info-grid">
          <div className="info-item">
            <Camera className="w-4 h-4" />
            <span>{frame.cameraMovement ? getCameraMovementConfig(frame.cameraMovement)?.name : 'Plan fixe'}</span>
          </div>
          <div className="info-item">
            <Clock className="w-4 h-4" />
            <span>{frame.duration}s</span>
          </div>
          <div className="info-item">
            <User className="w-4 h-4" />
            <span>{frame.characters.join(', ') || 'Aucun'}</span>
          </div>
          <div className="info-item">
            <MapPin className="w-4 h-4" />
            <span>{frame.location || 'Non specifie'}</span>
          </div>
        </div>

        <p className="frame-description">{frame.description}</p>

        {showPrompt && (
          <div className="prompt-display">
            <h4>Prompt de generation</h4>
            <p>{frame.imagePrompt}</p>
          </div>
        )}

        {frame.notes && (
          <div className="notes-display">
            <h4>Notes</h4>
            <p>{frame.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default StoryboardGenerator;

