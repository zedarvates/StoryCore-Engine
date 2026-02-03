/**
 * Asset Generation Dialog Component
 * 
 * Dialog for generating new AI assets with prompt input and parameters.
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7
 */

import React, { useState, useCallback } from 'react';
import { useAppDispatch } from '../../store';
import { addAsset } from '../../store/slices/assetsSlice';
import type { AssetType, Asset } from '../../types';
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
  const dispatch = useAppDispatch();
  
  const [assetType, setAssetType] = useState<AssetType>(
    defaultCategory.replace('-', '') as AssetType
  );
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
      // Simulate asset generation (in real implementation, this would call the AI API)
      for (let i = 0; i <= 100; i += 10) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        setProgress(i);
      }

      // Create new asset
      const newAsset: Asset = {
        id: `asset-${Date.now()}`,
        name: prompt.substring(0, 30) + (prompt.length > 30 ? '...' : ''),
        type: assetType,
        category: defaultCategory,
        thumbnailUrl: `data:image/svg+xml,${encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150">
            <rect fill="#4A90E2" width="150" height="150"/>
            <text fill="white" font-family="sans-serif" font-size="12" x="50%" y="50%" text-anchor="middle" dy=".3em">Generated</text>
          </svg>
        `)}`,
        metadata: {
          description: prompt,
          author: 'User',
        },
        tags: assetType === 'character' ? ['character', 'ai-generated'] :
              assetType === 'environment' ? ['environment', 'ai-generated'] :
              ['asset', 'ai-generated'],
        source: 'ai-generated',
        createdAt: new Date(),
      };

      // Add asset to store
      dispatch(addAsset({ categoryId: defaultCategory, asset: newAsset }));

      // Close dialog after success
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setError('Failed to generate asset. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, assetType, defaultCategory, dispatch, onClose]);

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
                <label>
                  Seed
                  <span className="value">{seed}</span>
                </label>
                <input
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
                <label>
                  Guidance
                  <span className="value">{guidance}</span>
                </label>
                <input
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
                <label>
                  Steps
                  <span className="value">{steps}</span>
                </label>
                <input
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
            disabled={isGenerating || !prompt.trim()}
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

