import React, { useState, useCallback, useRef } from 'react';
import { Reorder } from 'framer-motion';
import { toast } from '@/utils/toast';
import { Play, Square, Film, Cpu, Zap, Star, Crown, AlertCircle, ChevronLeft, ChevronRight, Plus, Trash2, Save, Sparkles, Wand } from 'lucide-react';
import { SequenceEditor } from '@/sequence-editor/SequenceEditor';
import type { SequencePlan, Shot } from '@/types';
import { useProjectStore } from '@/stores/useProjectStore';
import { useShallow } from 'zustand/react/shallow';
import { bulkProductionService } from '@/services/BulkProductionService';
import { generateId } from '@/utils/idGenerator';
import { markdownExportService } from '@/sequence-editor/services/markdownExportService';
import { storyInsightService } from '@/services/ai/StoryInsightService';
import type { Character } from '@/types/character';
import { Button, Input, Select, Space, Slider, Tooltip, Avatar, Switch } from 'antd';
import './VideoGenerationPanel.css';

// ==============================================================================
// TYPES
// ==============================================================================

type VideoEngine = 'wan21' | 'ltx2';
type QualityMode = 'draft' | 'standard' | 'cinematic' | 'ultra';

interface VideoGenerationPanelProps {
  onGenerateVideo?: (params: VideoGenerationParams) => Promise<void>;
  onCancel?: () => void;
}

interface VideoGenerationParams {
  inputImagePath: string;
  prompt: string;
  frameCount: number;
  frameRate: number;
  width: number;
  height: number;
  engine?: string;
  quality?: string;
}

interface GenerationProgress {
  stage: 'latent' | 'upscaling' | 'complete';
  stageProgress: number;
  overallProgress: number;
  message: string;
}
// cspell:ignore upscaling

// ==============================================================================
// CONFIG
// ==============================================================================

const QUALITY_MODES: { id: QualityMode; label: string; steps: number; icon: React.ReactNode; color: string; hint: string }[] = [
  { id: 'draft',     label: 'Fast',      steps: 10, icon: <Zap className="h-4 w-4" />,    color: '#3b82f6', hint: 'Brouillons & tests rapides' },
  { id: 'standard',  label: 'Pro',       steps: 20, icon: <Star className="h-4 w-4" />,   color: '#8b5cf6', hint: 'Réseaux sociaux' },
  { id: 'cinematic', label: 'Cinematic', steps: 30, icon: <Film className="h-4 w-4" />,   color: '#f59e0b', hint: 'Contenu premium' },
  { id: 'ultra',     label: 'Ultra',     steps: 40, icon: <Crown className="h-4 w-4" />,  color: '#ef4444', hint: 'Rendu final client' },
];

// ==============================================================================
// STYLES
// ==============================================================================

// ==============================================================================
// COMPONENT
// ==============================================================================

export const VideoGenerationPanel: React.FC<VideoGenerationPanelProps> = ({
  onGenerateVideo: _onGenerateVideo,
  onCancel: _onCancelProp,
}) => {
  const { 
    shots, 
    addShot, 
    updateShot, 
    deleteShot,
    selectedShotId,
    setSelectedShotId,
    project,
    characters,
    reorderShots
  } = useProjectStore(useShallow(state => ({
    shots: state.shots,
    addShot: state.addShot,
    updateShot: state.updateShot,
    deleteShot: state.deleteShot,
    selectedShotId: state.selectedShotId,
    setSelectedShotId: state.setSelectedShotId,
    project: state.project,
    characters: state.characters || [],
    reorderShots: state.reorderShots
  })));

  // ==============================================================================
  // STATE VARIABLES
  // ==============================================================================

  const [engine, setEngine] = useState<VideoEngine>('ltx2');
  const [quality, setQuality] = useState<QualityMode>('standard');
  const [isGenerating, setIsGenerating] = useState(false);
  const [inputImage, setInputImage] = useState('');
  const [prompt, setPrompt] = useState('');
  const [isBackendConnected] = useState(true);
  const [isDraftMode, setIsDraftMode] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [generatedVideoPath, setGeneratedVideoPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sequence editor state
  const [showSequenceEditor, setShowSequenceEditor] = useState(false);
  const [editingSequence, _setEditingSequence] = useState<SequencePlan | null>(null);
  const [currentShotIndex, setCurrentShotIndex] = useState(0);

  // ==============================================================================
  // HANDLE GENERATION AND CANCELLATION
  // ==============================================================================

  const handleOpenSequenceEditor = () => {
    setShowSequenceEditor(true);
  };

  const handleExportPlan = useCallback(() => {
    if (!shots || shots.length === 0) {
      toast.error('Export Impossible', 'Aucun plan à exporter.');
      return;
    }
    markdownExportService.downloadMarkdownPlan(project, shots);
    toast.success('Plan Exporté', 'Le fichier .MD a été téléchargé.');
  }, [shots, project]);

  const handleExportStoryboard = useCallback(() => {
    if (!shots || shots.length === 0) {
      toast.error('Export Impossible', 'Aucun storyboard à exporter.');
      return;
    }
    markdownExportService.downloadHtmlStoryboard(project, shots);
    toast.success('Storyboard Exporté', 'Le fichier .HTML a été téléchargé.');
  }, [shots, project]);

  // ==============================================================================
  // HANDLE GENERATION AND CANCELLATION
  // ==============================================================================

  const handleGenerate = useCallback(async () => {
    if (!inputImage && !prompt) { 
      setError('Veuillez fournir une image source ou une description.'); 
      return; 
    }

    if (!project) {
      setError('Aucun projet actif trouvé.');
      return;
    }

    setIsGenerating(true); 
    setError(null);
    setProgress({ stage: 'latent', stageProgress: 0, overallProgress: 0, message: 'Initialisation de l\'orchestration...' });

    try {
      // Find or create current shot context
      const currentShot = shots.find(s => s.id === selectedShotId) || shots[currentShotIndex];
      if (!currentShot) throw new Error("Aucun plan actif pour l'orchestration.");

      // Execute via bulk production (even for single shot) for coherence locking
      const result = await bulkProductionService.generateSequenceBulk(
        project,
        [currentShot],
        characters,
        {
          concurrency: 1,
          coherenceLock: true,
          onProgress: (p) => {
            setProgress({ 
              stage: 'latent', 
              stageProgress: p, 
              overallProgress: p, 
              message: p < 100 ? 'Orchestration cinématique en cours...' : 'Finalisation...' 
            });
          },
          onShotComplete: (shotId, job) => {
             // Extract final result
             const finalUrl = job.results.find(r => r.step === 'video' || r.step === 'image')?.output as string;
             if (finalUrl) {
                setGeneratedVideoPath(finalUrl);
                updateShot(shotId, { 
                  outputPath: finalUrl, 
                  generationStatus: 'complete' 
                });
             }
          }
        }
      );

      if (result.failed.length > 0) {
        throw new Error(result.failed[0].error);
      }

      setProgress({ stage: 'complete', stageProgress: 100, overallProgress: 100, message: 'Production terminée !' });
      setIsGenerating(false);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue pendant la production.');
      setIsGenerating(false);
      toast.error('Échec de la Production', 'L\'orchestrateur a renvoyé une erreur contextuelle.');
    }
  }, [inputImage, prompt, selectedShotId, currentShotIndex, updateShot, project, shots, characters]);
  
  const handleCancel = useCallback(async () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();
    
    setIsGenerating(false);
    setProgress(null);
    toast.info('Production Interrompue', 'Le rendu a été stoppé par l\'utilisateur.');
  }, []);
  // ==============================================================================
  // COMPACT SHOT EDITOR
  // ==============================================================================
  
  const renderCompactShotControls = () => {
    if (!shots || shots.length === 0) return null;
    
    // Auto-sync local index with selectedShotId or project context
    const currentShot = shots[currentShotIndex] || shots[0];
    
    return (
      <div className="shot-manager-floating">
        <Space orientation="vertical" className="w-full" size="middle">
          <div className="shot-manager-title">DIRECTORIAL CONTROLLER</div>
          
          {renderMiniTimeline()}

          <div className="shot-manager-nav">
            <Button 
              size="small" 
              icon={<ChevronLeft className="h-3 w-3" />} 
              disabled={currentShotIndex === 0}
              onClick={() => {
                const nextIndex = Math.max(0, currentShotIndex - 1);
                setCurrentShotIndex(nextIndex);
                const nextShot = shots[nextIndex];
                if (nextShot) {
                  setSelectedShotId(nextShot.id);
                  setPrompt(nextShot.prompt || '');
                  setInputImage(nextShot.outputPath || nextShot.thumbnailUrl || '');
                }
              }}
              className="shot-manager-nav-btn"
            />
            <div className="shot-manager-counter">
              PLAN {currentShotIndex + 1} / {shots.length}
            </div>
            <Button 
              size="small" 
              icon={<ChevronRight className="h-3 w-3" />} 
              disabled={currentShotIndex === shots.length - 1}
              onClick={() => {
                const nextIndex = Math.min(shots.length - 1, currentShotIndex + 1);
                setCurrentShotIndex(nextIndex);
                const nextShot = shots[nextIndex];
                if (nextShot) {
                  setSelectedShotId(nextShot.id);
                  setPrompt(nextShot.prompt || '');
                  setInputImage(nextShot.outputPath || nextShot.thumbnailUrl || '');
                }
              }}
              className="shot-manager-nav-btn"
            />
          </div>

          <div className="shot-manager-prompt-box">
            <div className="shot-manager-prompt-label">SHOT OBJECTIVE</div>
            <Input.TextArea
              className="shot-manager-prompt-textarea"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onBlur={() => {
                if (currentShot) {
                  updateShot(currentShot.id, { prompt });
                }
              }}
              rows={2}
            />
          </div>

          <div className="shot-manager-duration-box">
            <div className="shot-manager-prompt-label">DURATION (FRAMES)</div>
            <Slider 
              min={24} 
              max={240} 
              step={24} 
              value={currentShot?.duration || 120} 
              onChange={(val) => {
                if (currentShot) {
                  updateShot(currentShot.id, { duration: val });
                }
              }}
              tooltip={{ formatter: (val) => `${val} f (${(val || 0) / 24}s)` }}
            />
          </div>

          <div className="shot-manager-ai-tools">
            <Space orientation="vertical" className="w-full" size={8}>
              <Button 
                size="small" 
                className="w-full btn-ai-unify" 
                icon={<Sparkles size={14} />}
                loading={isGenerating} // Using isGenerating state to prevent multiple clicks
                onClick={async () => {
                  if (!currentShot || !project) return;
                  toast.info('IA en action', 'Analyse de la cohérence visuelle...');
                  setIsGenerating(true);
                  try {
                    const nextPrompt = await storyInsightService.unifyVisualCoherence(currentShot, project, shots, characters);
                    updateShot(currentShot.id, { prompt: nextPrompt });
                    setPrompt(nextPrompt);
                    toast.success('Cohérence Appliquée', 'Prompt harmonisé avec le reste de la séquence.');
                  } catch (_error) {
                    toast.error('Erreur', 'Impossible d\'unifier le prompt.');
                  } finally {
                    setIsGenerating(false);
                  }
                }}
              >
                UNIFY VISUAL COHERENCE
              </Button>

              <Button 
                size="small" 
                className="w-full btn-ai-expand" 
                icon={<Wand size={14} />}
                loading={isGenerating}
                onClick={async () => {
                  if (!currentShot || !project || !currentShot.prompt) return;
                  toast.info('Technicien Virtuel', 'Expansion du prompt en cours...');
                  setIsGenerating(true);
                  try {
                    const expandedPrompt = await storyInsightService.expandTechnicalPrompt(currentShot.prompt, project);
                    updateShot(currentShot.id, { prompt: expandedPrompt });
                    setPrompt(expandedPrompt);
                    toast.success('Prompt Étendu', 'Directives cinématographiques ajoutées.');
                  } catch (_error) {
                    toast.error('Erreur', 'Impossible d\'étendre le prompt.');
                  } finally {
                    setIsGenerating(false);
                  }
                }}
              >
                EXPAND TECHNICAL PROMPT
              </Button>
            </Space>
          </div>

          <div className="shot-manager-actions">
            <Button size="small" type="primary" className="shot-manager-btn-add" icon={<Plus size={14} />} onClick={() => {
              const newShot: Shot = {
                id: generateId(),
                name: `Plan ${shots.length + 1}`,
                prompt: prompt,
                startTime: currentShot ? currentShot.startTime + currentShot.duration : 0,
                duration: 120, // 5s default
                position: shots.length,
                layers: [],
                referenceImages: [],
                // cspell:ignore euler
                parameters: { seed: -1, denoising: 0.75, steps: 20, guidance: 3.5, sampler: 'euler', scheduler: 'normal' },
                generationStatus: 'pending'
              };
              addShot(newShot);
              setCurrentShotIndex(shots.length);
              toast.success('Shot Ajouté', 'Nouveau plan inséré dans la timeline.');
            }}>Add</Button>
            
            <Button size="small" danger ghost className="shot-manager-btn-remove" icon={<Trash2 size={14} />} onClick={() => {
               if (shots.length > 1 && currentShot) {
                 deleteShot(currentShot.id);
                 setCurrentShotIndex(Math.max(0, currentShotIndex - 1));
                 toast.info('Shot Supprimé', 'Le plan a été retiré de la séquence.');
               }
            }}>Remove</Button>
          </div>
          
          <Space orientation="vertical" className="w-full" size={4}>
            <Button 
              size="small" 
              className="w-full btn-export-md" 
              icon={<Save size={14} />} 
              onClick={handleExportPlan}
            >
              EXPORT .MD PLAN
            </Button>
            <Button 
              size="small" 
              className="w-full btn-export-html" 
              icon={<Film size={14} />} 
              onClick={handleExportStoryboard}
            >
              EXPORT HTML STORYBOARD
            </Button>
          </Space>
        </Space>
      </div>
    );
  };

  const renderMiniTimeline = () => {
    if (!shots || shots.length === 0) return null;
    
    return (
      <div className="mini-timeline-container">
        <Reorder.Group 
          axis="x" 
          values={shots} 
          onReorder={reorderShots}
          className="mini-timeline"
        >
          {shots.map((shot, idx) => {
            // Find characters in this shot (based on prompt or character references in shot)
            const shotCharacters = characters.filter((char: Character) => 
              shot.prompt?.toLowerCase().includes(char.name.toLowerCase())
            );

            return (
              <Reorder.Item
                key={shot.id}
                value={shot}
                className={`mini-timeline-shot ${idx === currentShotIndex ? 'active' : ''} ${shot.generationStatus || 'pending'}`}
                /* hint-disable no-inline-styles */
                style={{ '--shot-duration': shot.duration } as React.CSSProperties}
                /* hint-enable no-inline-styles */
                onClick={() => {
                   setCurrentShotIndex(idx);
                   setSelectedShotId(shot.id);
                   setPrompt(shot.prompt || '');
                   setInputImage(shot.outputPath || shot.thumbnailUrl || '');
                }}
              >
                <Tooltip 
                  title={
                    <div className="mini-timeline-tooltip">
                      <div className="tooltip-shot-name">{shot.name || `Plan ${idx + 1}`}</div>
                      <div className="tooltip-shot-prompt">{shot.prompt}</div>
                      {(shot.outputPath || shot.thumbnailUrl) && (
                        <img 
                           src={shot.outputPath || shot.thumbnailUrl} 
                           className="tooltip-preview-img" 
                           alt="Preview"
                        />
                      )}
                    </div>
                  }
                  overlayClassName="mini-timeline-tooltip-overlay"
                >
                  <div className="mini-timeline-shot-content">
                    {shotCharacters.length > 0 && (
                      <div className="mini-timeline-casting">
                        {shotCharacters.slice(0, 2).map((char: Character) => (
                          <Avatar 
                            key={char.character_id} 
                            size={12} 
                            src={char.visual_identity?.reference_images?.[0]?.url} 
                            className="mini-casting-avatar"
                          />
                        ))}
                      </div>
                    )}
                    {idx === currentShotIndex && <div className="mini-timeline-active-indicator" />}
                  </div>
                </Tooltip>
              </Reorder.Item>
            );
          })}
        </Reorder.Group>
      </div>
    );
  };

  // ==============================================================================
  // RENDER UI
  // ==============================================================================

  return (
    <div className="video-generation-panel">
      <h2 className="production-title">
        <Cpu className="text-indigo-400" /> PRODUCTION STUDIO
        <div className={`backend-status ${isBackendConnected ? 'backend-online' : 'backend-offline'}`}>
          {isBackendConnected ? 'BACKEND ONLINE' : 'BACKEND OFFLINE'}
        </div>
      </h2>

      <div className="controls-grid">
        <div className="control-group">
          <label className="label">ENGINE</label>
          <Select value={engine} onChange={(val) => setEngine(val as VideoEngine)} className="w-full">
            <Select.Option value="ltx2">LTX-2</Select.Option>
            <Select.Option value="wan21">Wan 2.1</Select.Option>
          </Select>
        </div>
        <div className="control-group">
          <label className="label">QUALITY</label>
          <Select value={quality} onChange={(val) => setQuality(val as QualityMode)} className="w-full">
            {QUALITY_MODES.map(q => <Select.Option key={q.id} value={q.id}>{q.label}</Select.Option>)}
          </Select>
        </div>
      </div>
      
      <div className="source-image-container">
        <label className="label">SOURCE IMAGE</label>
        <Input 
          placeholder="Path/URL to reference image" 
          value={inputImage} 
          onChange={(e) => setInputImage(e.target.value)} 
          className="input"
        />
      </div>

      <div className="story-prompt-container">
        <label className="label">STORY PROMPT</label>
        <Input.TextArea 
          placeholder="Describe the cinematic action..." 
          value={prompt} 
          onChange={(e) => setPrompt(e.target.value)} 
          className="input story-prompt-textarea"
          rows={3}
        />
      </div>
      
      <div className="sequence-plan-container">
        <Button 
          icon={<Film size={14} />} 
          onClick={handleOpenSequenceEditor}
          className="btn-sequence-plan"
        >
          {editingSequence ? 'EDIT SEQUENCE PLAN' : 'ATTACH SEQUENCE PLAN'}
        </Button>
      </div>

      {progress && (
        <div className="progress-container">
          <div className="progress-header">
             <span className="progress-message">{progress.message.toUpperCase()}</span>
             <span>{Math.round(progress.stageProgress)}%</span>
          </div>
          <div className="progress-track">
            {/* hint-disable no-inline-styles */}
            <div 
              className="progress-fill" 
              style={{ '--progress-width': `${progress.stageProgress}%` } as React.CSSProperties} 
            />
            {/* hint-enable no-inline-styles */}
          </div>
        </div>
      )}

      {error && (
        <div className="error-box">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <span className="error-message">{error}</span>
        </div>
      )}
      
      <div className="action-buttons">
        {!isGenerating ? (
          <Space orientation="vertical" className="w-full" size="middle">
            <Button 
              type="primary" 
              size="large" 
              block
              icon={<Play size={16} />}
              onClick={handleGenerate}
              className="btn-generate-cinematic"
            >
              GENERATE CINEMATIC
            </Button>
            
            <div className="draft-mode-toggle">
              <span className="draft-mode-label">DRAFT MODE (FASTER)</span>
              <Switch 
                size="small" 
                checked={isDraftMode} 
                onChange={setIsDraftMode} 
              />
            </div>
          </Space>
        ) : (
          <Button 
            danger 
            size="large" 
            block
            icon={<Square size={16} />}
            onClick={handleCancel}
            className="btn-stop-generation"
          >
            STOP GENERATION
          </Button>
        )}
      </div>

      {generatedVideoPath && (
        <div className="render-output-container">
          <div className="render-output-label">RENDER OUTPUT</div>
          <video src={generatedVideoPath} controls autoPlay className="render-output-video" />
        </div>
      )}

      {showSequenceEditor && (
        <div className="modal-overlay">
          <div className="modal-content">
            <SequenceEditor
              onBack={() => setShowSequenceEditor(false)}
            />
          </div>
        </div>
      )}

      {renderCompactShotControls()}
    </div>
  );
};
