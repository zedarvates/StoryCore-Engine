import React, { useState, useCallback } from 'react';
import { aiPreviewService, AIPreviewOptions, RegenerationProgress } from '../../services/aiPreviewService';
import './aiPreviewPanel.css';

interface AIPreviewPanelProps {
  selectedShotId: string | null;
  currentFrame: number;
  onRegenerationComplete?: () => void;
}

export const AIPreviewPanel: React.FC<AIPreviewPanelProps> = ({
  selectedShotId,
  currentFrame,
  onRegenerationComplete
}) => {
  const [previewOptions, setPreviewOptions] = useState<AIPreviewOptions>({
    resolution: 'low',
    quality: 'draft',
    speed: 'fast'
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [regenerationProgress, setRegenerationProgress] = useState<RegenerationProgress | null>(null);
  const [startFrame, setStartFrame] = useState<number>(0);
  const [endFrame, setEndFrame] = useState<number>(100);

  const handleGeneratePreview = useCallback(async () => {
    if (!selectedShotId) return;

    setIsGenerating(true);
    try {
      const result = await aiPreviewService.generatePreview(
        selectedShotId,
        currentFrame,
        previewOptions
      );
      setPreviewUrl(result.frameUrl);
    } catch (error) {
      console.error('Preview generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [selectedShotId, currentFrame, previewOptions]);

  const handleRegenerateSegment = useCallback(async () => {
    setIsGenerating(true);
    setRegenerationProgress(null);

    try {
      await aiPreviewService.regenerateSegment(
        {
          startFrame,
          endFrame,
          shotIds: selectedShotId ? [selectedShotId] : [],
          preserveStyle: true
        },
        (progress) => {
          setRegenerationProgress(progress);
        }
      );

      if (onRegenerationComplete) {
        onRegenerationComplete();
      }
    } catch (error) {
      console.error('Segment regeneration failed:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [startFrame, endFrame, selectedShotId, onRegenerationComplete]);

  const handleClearCache = useCallback(() => {
    if (selectedShotId) {
      aiPreviewService.clearShotCache(selectedShotId);
    } else {
      aiPreviewService.clearAllCache();
    }
    setPreviewUrl(null);
  }, [selectedShotId]);

  return (
    <div className="ai-preview-panel">
      <div className="ai-preview-header">
        <h3>AI Preview & Generation</h3>
        <button
          className="clear-cache-btn"
          onClick={handleClearCache}
          title="Clear preview cache"
        >
          Clear Cache
        </button>
      </div>

      <div className="ai-preview-options">
        <div className="option-group">
          <label>Resolution:</label>
          <select
            value={previewOptions.resolution}
            onChange={(e) => setPreviewOptions({
              ...previewOptions,
              resolution: e.target.value as 'low' | 'medium' | 'high'
            })}
          >
            <option value="low">Low (Fast)</option>
            <option value="medium">Medium</option>
            <option value="high">High (Slow)</option>
          </select>
        </div>

        <div className="option-group">
          <label>Quality:</label>
          <select
            value={previewOptions.quality}
            onChange={(e) => setPreviewOptions({
              ...previewOptions,
              quality: e.target.value as 'draft' | 'preview' | 'final'
            })}
          >
            <option value="draft">Draft</option>
            <option value="preview">Preview</option>
            <option value="final">Final</option>
          </select>
        </div>

        <div className="option-group">
          <label>Speed:</label>
          <select
            value={previewOptions.speed}
            onChange={(e) => setPreviewOptions({
              ...previewOptions,
              speed: e.target.value as 'fast' | 'balanced' | 'quality'
            })}
          >
            <option value="fast">Fast</option>
            <option value="balanced">Balanced</option>
            <option value="quality">Quality</option>
          </select>
        </div>
      </div>

      <button
        className="generate-preview-btn"
        onClick={handleGeneratePreview}
        disabled={!selectedShotId || isGenerating}
      >
        {isGenerating ? 'Generating...' : 'Generate AI Preview'}
      </button>

      {previewUrl && (
        <div className="preview-result">
          <img src={previewUrl} alt="AI Preview" />
        </div>
      )}

      <div className="regeneration-section">
        <h4>Selective Regeneration</h4>
        
        <div className="frame-range">
          <div className="range-input">
            <label>Start Frame:</label>
            <input
              type="number"
              value={startFrame}
              onChange={(e) => setStartFrame(parseInt(e.target.value))}
              min={0}
            />
          </div>
          <div className="range-input">
            <label>End Frame:</label>
            <input
              type="number"
              value={endFrame}
              onChange={(e) => setEndFrame(parseInt(e.target.value))}
              min={startFrame}
            />
          </div>
        </div>

        <button
          className="regenerate-btn"
          onClick={handleRegenerateSegment}
          disabled={isGenerating}
        >
          {isGenerating ? 'Regenerating...' : 'Regenerate Segment'}
        </button>

        {regenerationProgress && (
          <div className="regeneration-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${regenerationProgress.percentage}%` }}
              />
            </div>
            <div className="progress-info">
              <span>Frame {regenerationProgress.currentFrame} / {regenerationProgress.totalFrames}</span>
              <span>{regenerationProgress.percentage.toFixed(1)}%</span>
            </div>
            {regenerationProgress.status === 'processing' && (
              <div className="time-remaining">
                Est. {Math.ceil(regenerationProgress.estimatedTimeRemaining / 1000)}s remaining
              </div>
            )}
            {regenerationProgress.status === 'error' && (
              <div className="error-message">{regenerationProgress.error}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
