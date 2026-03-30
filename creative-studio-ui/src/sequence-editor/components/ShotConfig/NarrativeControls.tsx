import React, { useCallback, useMemo } from 'react';
import { Sparkles, MessageSquare, AlertCircle, Play, Settings, Zap, Loader2 } from 'lucide-react';
import { useProjectStore } from '@/stores/useProjectStore';
import { useShallow } from 'zustand/react/shallow';
import { cn } from '@/lib/utils';
import { NarrativeLayerMapper } from '../../../services/NarrativeLayerMapper';
import { aiPreviewService } from '../../services/aiPreviewService';
import { promptOptimizer } from '../../../services/ai/PromptOptimizationService';
import type { Shot } from '@/types';
import './narrativeControls.css';

interface NarrativeControlsProps {
  shot: Shot;
}

export const NarrativeControls: React.FC<NarrativeControlsProps> = ({ shot }) => {
  const { updateShot } = useProjectStore(useShallow(state => ({
    updateShot: state.updateShot
  })));

  const [isBoosting, setIsBoosting] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [generationProgress, setGenerationProgress] = React.useState<number>(0);
  const [showSettings, setShowSettings] = React.useState(false);
  const progressBarRef = React.useRef<HTMLDivElement>(null);

  // Sync progress bar
  React.useEffect(() => {
    if (progressBarRef.current) {
      progressBarRef.current.style.setProperty('--progress-pct', `${generationProgress}%`);
    }
  }, [generationProgress]);
  
  const [genOptions, setGenOptions] = React.useState({
    resolution: 'medium' as 'low' | 'medium' | 'high',
    quality: 'preview' as 'draft' | 'preview' | 'final',
    speed: 'balanced' as 'fast' | 'balanced' | 'quality'
  });

  const handlePromptChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateShot(shot.id, { prompt: e.target.value });
  }, [updateShot, shot.id]);

  const handleBoostPrompt = useCallback(async () => {
    if (!shot.prompt || shot.prompt.trim().length < 3) return;
    
    setIsBoosting(true);
    try {
      const boostedPrompt = await promptOptimizer.balancePrompt(shot.prompt);
      updateShot(shot.id, { prompt: boostedPrompt });
    } catch (error) {
      console.error('[Narrative] Prompt boosting failed:', error);
    } finally {
      setIsBoosting(false);
    }
  }, [updateShot, shot.id, shot.prompt]);

  const detectedKeywords = useMemo(() => 
    NarrativeLayerMapper.getNarrativeKeywords(shot.prompt || ''), 
    [shot.prompt]
  );

  const handleGenerateShot = useCallback(async () => {
    console.log(`[Narrative] Triggering generation for shot: ${shot.id}`);
    setIsGenerating(true);
    setGenerationProgress(0);
    
    try {
      // Clear previous cache for this shot
      aiPreviewService.clearShotCache(shot.id);
      
      // Use the AIPreviewService with user-selected options
      await aiPreviewService.regenerateShots([shot.id], true, (id, progress) => {
        setGenerationProgress(progress);
      });
      
      alert(`Generation complete for shot: ${shot.id}`);
    } catch (error) {
      console.error(`[Narrative] Generation failed:`, error);
      alert(`Generation failed for shot: ${shot.id}`);
    } finally {
      setIsGenerating(false);
      setGenerationProgress(100);
    }
  }, [shot.id]);

  return (
    <div className="narrative-controls">
      <header className="section-header">
        <MessageSquare className="w-4 h-4 mr-2" />
        <span>Narrative & Prompts</span>
      </header>

      {/* Primary Prompt */}
      <div className="control-group">
        <div className="flex items-center justify-between mb-2">
          <label className="control-label m-0">Visual Prompt</label>
          <button 
            className={`prompt-boost-btn ${isBoosting ? 'loading' : ''}`}
            onClick={handleBoostPrompt}
            disabled={isBoosting || !(shot.prompt || '').trim()}
            title="AI Boost: Transform into pro prompt"
          >
            {isBoosting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            <span>{isBoosting ? 'Boosting...' : 'Boost'}</span>
          </button>
        </div>
        <textarea
          className="narrative-textarea primary-prompt"
          value={shot.prompt || ''}
          onChange={handlePromptChange}
          placeholder="Describe the visual content of this shot..."
        />
        <div className="textarea-footer">
          <span className="char-count">{(shot.prompt || '').length} characters</span>
        </div>
      </div>

      {/* Narrative Analysis */}
      {detectedKeywords.length > 0 && (
        <div className="narrative-analysis">
          <div className="analysis-header">
            <Sparkles className="w-3 h-3 text-primary" />
            <span>Detected Keywords</span>
          </div>
          <div className="keyword-tags">
            {detectedKeywords.map(kw => (
              <span key={kw} className="keyword-tag">{kw}</span>
            ))}
          </div>
        </div>
      )}

      {/* Negative Prompt */}
      <div className="control-group mt-4">
        <label className="control-label flex items-center justify-between">
          Negative Prompt
          <AlertCircle className="w-3 h-3 opacity-30" />
        </label>
        <textarea
          className="narrative-textarea negative-prompt"
          value={shot.negativePrompt || ''}
          onChange={(e) => updateShot(shot.id, { negativePrompt: e.target.value })}
          placeholder="What to exclude from the generation..."
        />
      </div>

      {/* Animation Prompt */}
      <div className="control-group mt-4">
        <label className="control-label">Animation / Motion Prompt</label>
        <textarea
          className="narrative-textarea animation-prompt"
          value={shot.animationPrompt || ''}
          onChange={(e) => updateShot(shot.id, { animationPrompt: e.target.value })}
          placeholder="Describe how the camera or subjects should move..."
        />
      </div>

      {/* Advanced Settings Toggle */}
      <div className="advanced-settings-toggle mt-4">
        <button 
          className="settings-toggle-btn"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings className={cn("settings-icon", showSettings && "is-rotated")} />
          <span>Generation Settings</span>
          <Zap className={cn("quality-icon", genOptions.quality === 'final' && "is-high-quality")} />
        </button>

        {showSettings && (
          <div className="generation-settings-grid">
            <div className="setting-item">
              <label>Resolution</label>
              <select 
                title="Choose target resolution"
                value={genOptions.resolution}
                onChange={(e) => setGenOptions({...genOptions, resolution: e.target.value as 'low' | 'medium' | 'high'})}
              >
                <option value="low">720p (Draft)</option>
                <option value="medium">1080p (Preview)</option>
                <option value="high">4K (Production)</option>
              </select>
            </div>
            <div className="setting-item">
              <label>Quality</label>
              <select 
                title="Choose generation quality"
                value={genOptions.quality}
                onChange={(e) => setGenOptions({...genOptions, quality: e.target.value as 'draft' | 'preview' | 'final'})}
              >
                <option value="draft">Ultra Fast</option>
                <option value="preview">Balanced</option>
                <option value="final">Cinematic</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Generation Action */}
      <div className="generation-actions mt-6">
        {isGenerating && (
          <div className="generation-progress-mini mb-3">
            <div className="progress-bar-bg">
              <div 
                className="progress-bar-fill" 
                ref={progressBarRef}
              />
            </div>
            <div className="flex justify-between mt-1 px-1">
              <span className="text-[9px] opacity-60">Architecting shot...</span>
              <span className="text-[9px] font-bold">{Math.round(generationProgress)}%</span>
            </div>
          </div>
        )}

        <button 
          className={`generate-shot-btn ${isGenerating ? 'generating' : ''}`}
          onClick={handleGenerateShot}
          disabled={isGenerating || !(shot.prompt || '').trim()}
        >
          {isGenerating ? (
            <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5 mr-2 fill-current" />
          )}
          {isGenerating ? 'Rendering Shot...' : 'Generate This Shot'}
        </button>
        <p className="action-hint text-[9px] opacity-40 mt-2 text-center">
          Generation uses current project style & preset settings
        </p>
      </div>
    </div>
  );
};

export default NarrativeControls;
