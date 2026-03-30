/**
 * Asset Generation Dialog Component
 * 
 * Dialog for generating new AI assets with prompt input and parameters.
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7
 */

import React, { useState, useCallback } from 'react';
import type { AssetType } from '../../types';
import { generateImage } from '../../../services/imageGenerationService';
import { useProductionStore, type ManifestedAsset } from '../../../stores/productionStore';
import './assetLibrary.css';

interface AssetGenerationDialogProps {
  onClose: () => void;
  defaultCategory?: string;
}

// Asset type options
const ASSET_TYPE_OPTIONS: { value: AssetType; label: string; icon: string }[] = [
  { value: 'character', label: 'Character', icon: '👤' },
  { value: 'environment', label: 'Environment', icon: '🏔️' },
  { value: 'prop', label: 'Prop', icon: '📦' },
  { value: 'visual-style', label: 'Visual Style', icon: '🎨' },
  { value: 'template', label: 'Template', icon: '📋' },
  { value: 'camera-preset', label: 'Camera Preset', icon: '📷' },
  { value: 'lighting-rig', label: 'Lighting Rig', icon: '💡' },
];

export const AssetGenerationDialog: React.FC<AssetGenerationDialogProps> = ({
  onClose,
  defaultCategory = 'characters',
}) => {
  const [assetType, setAssetType] = useState<AssetType>(() => {
    if (defaultCategory === 'environments') return 'environment';
    if (defaultCategory === 'props') return 'prop';
    if (defaultCategory === 'visual-styles') return 'visual-style';
    if (defaultCategory === 'templates') return 'template';
    if (defaultCategory === 'camera-presets') return 'camera-preset';
    if (defaultCategory === 'lighting-rigs') return 'lighting-rig';
    return 'character';
  });
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Generation parameters
  const [seed, setSeed] = useState<number>(Math.floor(Math.random() * 1000000));
  const [guidance, setGuidance] = useState(7.5);
  const [steps, setSteps] = useState(30);

  // Handle prompt input
  const handlePromptChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
  }, []);

  // Handle generation
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt for the asset');
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setError(null);

    try {
      setIsGenerating(true);
      setError(null);
      
      const resultUrl = await generateImage({
        prompt: `cinematic ${assetType} concept: ${prompt}`,
        width: 1024,
        height: 1024,
        steps: steps,
        cfgScale: guidance,
        sampler: 'euler',
        scheduler: 'normal',
        workflowType: 'z_image_turbo'
      }, (prog, msg) => {
        setProgress(Math.round(prog * 100));
      });

      const newAsset: ManifestedAsset = {
        id: crypto.randomUUID(),
        characterName: assetType === 'character' ? prompt.split(' ')[0] : undefined,
        generatedAt: new Date().toISOString(),
        type: assetType === 'character' ? 'CHARACTER_REFERENCE_SHEET' : 
              assetType === 'environment' ? 'LOCATION_REFERENCE_SHEET' : 'OBJECT_REFERENCE_SHEET',
        url: resultUrl,
        metadata: { prompt, seed, steps, guidance }
      };

      useProductionStore.getState().addManifestedAsset(newAsset);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Neural engine failure');
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, assetType, steps, guidance, seed, onClose]);

  // Handle close
  const handleClose = useCallback(() => {
    if (!isGenerating) {
      onClose();
    }
  }, [isGenerating, onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }, [handleClose]);

  // Get selected asset type info
  const selectedAssetType = ASSET_TYPE_OPTIONS.find((opt) => opt.value === assetType);

  return (
    <div className="dialog-backdrop" onClick={handleBackdropClick}>
      <div className="dialog asset-generation-dialog">
        {/* Header */}
        <div className="dialog-header">
          <h2>✨ Generate New Asset</h2>
          <button
            className="dialog-close-btn"
            onClick={handleClose}
            disabled={isGenerating}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="dialog-content">
          {/* Asset Type Selection */}
          <div className="form-group">
            <label>Asset Type</label>
            <div className="asset-type-grid">
              {ASSET_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={`asset-type-btn ${assetType === option.value ? 'selected' : ''}`}
                  onClick={() => setAssetType(option.value)}
                  disabled={isGenerating}
                >
                  <span className="type-icon">{option.icon}</span>
                  <span className="type-label">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Input */}
          <div className="form-group">
            <label htmlFor="asset-prompt">
              Describe your asset
              <span className="required">*</span>
            </label>
            <textarea
              id="asset-prompt"
              value={prompt}
              onChange={handlePromptChange}
              placeholder={`Describe the ${selectedAssetType?.label.toLowerCase()} you want to generate...`}
              rows={4}
              disabled={isGenerating}
              className={error ? 'error' : ''}
            />
            {error && <span className="error-message">{error}</span>}
          </div>

          {/* Generation Parameters */}
          <div className="form-group parameters-group">
            <label>Generation Parameters</label>
            
            <div className="parameter-row">
              <div className="parameter">
                <label htmlFor="seed-input">
                  Seed
                  <span className="value">{seed}</span>
                </label>
                <input
                  id="seed-input"
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(Number(e.target.value))}
                  disabled={isGenerating}
                  min={0}
                  max={999999}
                />
                <button
                  className="random-seed-btn"
                  onClick={() => setSeed(Math.floor(Math.random() * 1000000))}
                  disabled={isGenerating}
                  title="Random seed"
                >
                  🎲
                </button>
              </div>
              
              <div className="parameter">
                <label htmlFor="guidance-input">
                  Guidance
                  <span className="value">{guidance}</span>
                </label>
                <input
                  id="guidance-input"
                  type="range"
                  value={guidance}
                  onChange={(e) => setGuidance(Number(e.target.value))}
                  disabled={isGenerating}
                  min={1}
                  max={20}
                  step={0.5}
                />
              </div>
              
              <div className="parameter">
                <label htmlFor="steps-input">
                  Steps
                  <span className="value">{steps}</span>
                </label>
                <input
                  id="steps-input"
                  type="range"
                  value={steps}
                  onChange={(e) => setSteps(Number(e.target.value))}
                  disabled={isGenerating}
                  min={10}
                  max={100}
                  step={5}
                />
              </div>
            </div>
          </div>

          {/* Progress */}
          {isGenerating && (
            <div className="generation-progress">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="progress-text">
                {progress < 30 && 'Analyzing prompt...'}
                {progress >= 30 && progress < 60 && 'Generating asset...'}
                {progress >= 60 && progress < 90 && 'Refining details...'}
                {progress >= 90 && 'Finalizing...'}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="dialog-footer">
          <button
            className="btn btn-secondary"
            onClick={handleClose}
            disabled={isGenerating}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary generate-btn"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <span className="spinner" />
                Generating...
              </>
            ) : (
              <>
                ✨ Generate
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssetGenerationDialog;

