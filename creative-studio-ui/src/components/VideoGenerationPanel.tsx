import React, { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from '@/utils/toast';
import { Play, Square, Film, Cpu, Zap, Star, Crown, AlertCircle, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { SequenceEditor } from '@/components/SequenceEditor';
import type { SequencePlan } from '@/types';
import { Button, Input, InputNumber, Select, Space } from 'antd';
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
  onGenerateVideo,
  onCancel: _onCancel,
}) => {
  // ==============================================================================
  // STATE VARIABLES
  // ==============================================================================

  const [engine, setEngine] = useState<VideoEngine>('ltx2');
  const [quality, setQuality] = useState<QualityMode>('standard');
  const [inputImage, setInputImage] = useState('');
  const [prompt, setPrompt] = useState('');
  const [frameCount] = useState(121);
  const [frameRate] = useState(25);
  const [width] = useState(1280);
  const [height] = useState(720);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isBackendConnected, setIsBackendConnected] = useState(true);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [generatedVideoPath, setGeneratedVideoPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const jobIdRef = useRef<string | null>(null);

  // Sequence editor state
  const [showSequenceEditor, setShowSequenceEditor] = useState(false);
  const [editingSequence, setEditingSequence] = useState<SequencePlan | null>(null);
  const [currentShotIndex, setCurrentShotIndex] = useState(0);
   const [projectPath] = useState<string>('/tmp/project'); 

  // ==============================================================================
  // BACKEND CONNECTIVITY CHECK
  // ==============================================================================

  const checkBackendConnection = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/health', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000),
      });
      
      if (response.ok) {
        setIsBackendConnected(true);
        return true;
      } else {
        setIsBackendConnected(false);
        return false;
      }
    } catch (_err) {
      setIsBackendConnected(false);
      return false;
    }
  }, []);

  useEffect(() => {
    checkBackendConnection();
  }, [checkBackendConnection]);

  useEffect(() => { 
    return () => { 
      if (pollingRef.current) {
        clearInterval(pollingRef.current); 
        pollingRef.current = null;
      }
    };
  }, []);

  // Handle sequence editor save
  const handleSequenceSave = (sequence: SequencePlan) => {
    setEditingSequence(sequence);
    setShowSequenceEditor(false);
    toast.success('Séquence mise à jour', 'Le plan de production a été synchronisé.');
  };

  const handleOpenSequenceEditor = () => {
    setShowSequenceEditor(true);
  };

  // ==============================================================================
  // HANDLE GENERATION AND CANCELLATION
  // ==============================================================================

  const handleGenerate = useCallback(async () => {
    if (!inputImage || !prompt) { 
      setError('Veuillez fournir une image source et une description.'); 
      return; 
    }

    const connected = await checkBackendConnection();
    if (!connected) {
      setError('Impossible de se connecter au backend.');
      toast.error('Erreur', 'Le backend n\'est pas joignable');
      return;
    }

    setIsGenerating(true); 
    setError(null);
    setProgress({ stage: 'latent', stageProgress: 0, overallProgress: 0, message: 'Démarrage de la génération...' });

    try {
      const genParams: VideoGenerationParams = { inputImagePath: inputImage, prompt, frameCount, frameRate, width, height, engine: engine === 'ltx2' ? 'ltx_video' : 'wan21', quality };
      
      if (onGenerateVideo) {
        await onGenerateVideo(genParams);
      } else {
        const qualitySteps: Record<string, number> = { draft: 10, standard: 20, cinematic: 30, ultra: 40 };
        const steps = qualitySteps[quality] || 20;
        const duration = frameCount / frameRate;
        const aspectRatio = width > height ? '16:9' : width === height ? '1:1' : '9:16';
        
        const payload = {
          prompt: genParams.prompt,
          negative_prompt: "blurry, low quality, distorted",
          aspect_ratio: aspectRatio,
          duration: Math.min(duration, 20),
          audio_enabled: true,
          steps: steps,
          image_reference: genParams.inputImagePath
        };
        
        const response = await fetch('/api/ltx/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) throw new Error('API Error');
        
        const result = await response.json();
        
        if (result.output_path) {
          setGeneratedVideoPath(result.output_path);
          setProgress({ stage: 'complete', stageProgress: 100, overallProgress: 100, message: 'Succès !' });
        } else if (result.job_id) {
          const jobId = result.job_id;
          jobIdRef.current = jobId;
          
          pollingRef.current = setInterval(async () => {
            try {
              const statusRes = await fetch(`/api/ltx/status/${jobId}`);
              if (!statusRes.ok) return;
              const statusData = await statusRes.json();
              if (statusData.status === 'completed') {
                clearInterval(pollingRef.current!);
                setGeneratedVideoPath(statusData.output_path);
                setIsGenerating(false);
              } else if (statusData.status === 'error') {
                clearInterval(pollingRef.current!);
                setError('Erreur serveur');
                setIsGenerating(false);
              } else {
                setProgress({ stage: 'latent', stageProgress: statusData.progress || 50, overallProgress: statusData.progress || 50, message: 'Génération en cours...' });
              }
            } catch (pollErr) { console.error(pollErr); }
          }, 2000);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
      setIsGenerating(false);
    }
  }, [inputImage, prompt, frameCount, frameRate, width, height, engine, quality, onGenerateVideo, checkBackendConnection]);
  
  const handleCancel = useCallback(async () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setIsGenerating(false);
    setProgress(null);
  }, []);

  // ==============================================================================
  // COMPACT SHOT EDITOR
  // ==============================================================================
  
  const renderCompactShotControls = () => {
    if (!editingSequence?.shots || editingSequence.shots.length === 0) return null;
    
    const activeShot = editingSequence.shots[currentShotIndex] || editingSequence.shots[0];
    
    return (
      <div className="shot-manager-floating">
        <Space direction="vertical" className="w-full" size="middle">
          <div className="shot-manager-title">SHOT MANAGER</div>
          <div className="shot-manager-nav">
            <Button 
              size="small" 
              icon={<ChevronLeft className="h-3 w-3" />} 
              disabled={currentShotIndex === 0}
              onClick={() => setCurrentShotIndex(prev => Math.max(0, prev - 1))}
              className="shot-manager-nav-btn"
            />
            <InputNumber
              className="shot-manager-nav-input"
              min={1}
              max={editingSequence.shots.length}
              value={currentShotIndex + 1}
              onChange={(val) => {
                 if (val) setCurrentShotIndex(val - 1);
              }}
            />
            <Button 
              size="small" 
              icon={<ChevronRight className="h-3 w-3" />} 
              disabled={currentShotIndex === editingSequence.shots.length - 1}
              onClick={() => setCurrentShotIndex(prev => Math.min(editingSequence.shots.length - 1, prev + 1))}
              className="shot-manager-nav-btn"
            />
          </div>

          <div className="shot-manager-prompt-box">
            <div className="shot-manager-prompt-label">CURRENT PROMPT</div>
            <div className="shot-manager-prompt-text">
              "{activeShot.description || 'No description'}"
            </div>
          </div>

          <div className="shot-manager-actions">
            <Button size="small" type="primary" className="shot-manager-btn-add" icon={<Plus size={14} />} onClick={() => {
              const updated = [...editingSequence.shots];
              const base = updated[currentShotIndex] || updated[0];
              const newShot = JSON.parse(JSON.stringify(base)); // Deep copy
              newShot.id = `shot-${Date.now()}`;
              newShot.number = updated.length + 1;
              updated.splice(currentShotIndex + 1, 0, newShot);
              // Re-number
              const renumbered = updated.map((s, i) => ({ ...s, number: i + 1 }));
              setEditingSequence({ ...editingSequence, shots: renumbered });
              setCurrentShotIndex(currentShotIndex + 1);
              toast.success('Shot ajouté', 'Le nouveau plan a été inséré dans la séquence.');
            }}>Add</Button>
            <Button size="small" danger ghost className="shot-manager-btn-remove" icon={<Trash2 size={14} />} onClick={() => {
               if (editingSequence.shots.length > 1) {
                 const updated = editingSequence.shots.filter((_, i) => i !== currentShotIndex);
                 const renumbered = updated.map((s, i) => ({ ...s, number: i + 1 }));
                 setEditingSequence({ ...editingSequence, shots: renumbered });
                 setCurrentShotIndex(Math.max(0, currentShotIndex - 1));
                 toast.info('Shot supprimé', 'Le plan a été retiré de la séquence.');
               }
            }}>Remove</Button>
          </div>
        </Space>
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
            <div 
              className="progress-fill" 
              style={{ '--progress-width': `${progress.stageProgress}%` } as React.CSSProperties} 
            />
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
              projectPath={projectPath}
              currentSequence={editingSequence || undefined}
              onClose={() => setShowSequenceEditor(false)}
              onSave={handleSequenceSave}
            />
          </div>
        </div>
      )}

      {renderCompactShotControls()}
    </div>
  );
};
