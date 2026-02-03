/**
 * Shot Configuration Panel Component
 * 
 * Displays and edits configuration for the selected shot including:
 * - Reference images grid
 * - Prompt editor
 * - Generation parameters
 * - Apply/Revert buttons
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { updateShot } from '../../store/slices/timelineSlice';
import { ShotConfigDropTarget } from './ShotConfigDropTarget';
import { StyleControls } from './StyleControls';
import type { ReferenceImage, Shot } from '../../types';
import './shotConfigPanel.css';

// ============================================================================
// Types
// ============================================================================

interface ShotModifications {
  prompt?: string;
  referenceImages?: ReferenceImage[];
  seed?: number;
  denoising?: number;
  steps?: number;
  guidance?: number;
}

// ============================================================================
// Component
// ============================================================================

export const ShotConfigPanel: React.FC = () => {
  const dispatch = useAppDispatch();
  
  // Redux state
  const { shots, selectedElements } = useAppSelector((state) => state.timeline);
  
  // Get selected shot
  const selectedShot = shots.find((shot: Shot) => selectedElements.includes(shot.id));
  
  // Local state
  const [modifications, setModifications] = useState<ShotModifications>({});
  const [hasModifications, setHasModifications] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Initialize modifications when shot changes
  useEffect(() => {
    if (selectedShot) {
      setModifications({
        prompt: selectedShot.prompt,
        referenceImages: selectedShot.referenceImages || [],
        seed: selectedShot.parameters.seed,
        denoising: selectedShot.parameters.denoising,
        steps: selectedShot.parameters.steps,
        guidance: selectedShot.parameters.guidance,
      });
      setHasModifications(false);
    }
  }, [selectedShot?.id]);
  
  // Handle prompt change
  const handlePromptChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newPrompt = e.target.value;
    setModifications((prev) => ({ ...prev, prompt: newPrompt }));
    setHasModifications(true);
  }, []);
  
  // Handle parameter change
  const handleParameterChange = useCallback((
    param: 'seed' | 'denoising' | 'steps' | 'guidance',
    value: number
  ) => {
    setModifications((prev) => ({ ...prev, [param]: value }));
    setHasModifications(true);
  }, []);
  
  // Handle file upload
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const newImages: ReferenceImage[] = [];
    
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        newImages.push({
          id: `uploaded-${Date.now()}-${Math.random()}`,
          url,
          weight: 1.0,
          source: 'upload',
        });
        
        if (newImages.length === files.length) {
          setModifications((prev) => ({
            ...prev,
            referenceImages: [...(prev.referenceImages || []), ...newImages],
          }));
          setHasModifications(true);
        }
      };
      reader.readAsDataURL(file);
    });
  }, []);
  
  // Handle remove reference image
  const handleRemoveImage = useCallback((imageId: string) => {
    setModifications((prev) => ({
      ...prev,
      referenceImages: (prev.referenceImages || []).filter((img) => img.id !== imageId),
    }));
    setHasModifications(true);
  }, []);
  
  // Handle apply changes
  const handleApply = useCallback(() => {
    if (!selectedShot) return;
    
    dispatch(updateShot({
      id: selectedShot.id,
      updates: {
        prompt: modifications.prompt,
        referenceImages: modifications.referenceImages,
        parameters: {
          ...selectedShot.parameters,
          seed: modifications.seed ?? selectedShot.parameters.seed,
          denoising: modifications.denoising ?? selectedShot.parameters.denoising,
          steps: modifications.steps ?? selectedShot.parameters.steps,
          guidance: modifications.guidance ?? selectedShot.parameters.guidance,
        },
      },
    }));
    
    setHasModifications(false);
  }, [selectedShot, modifications, dispatch]);
  
  // Handle revert changes
  const handleRevert = useCallback(() => {
    if (!selectedShot) return;
    
    setModifications({
      prompt: selectedShot.prompt,
      referenceImages: selectedShot.referenceImages || [],
      seed: selectedShot.parameters.seed,
      denoising: selectedShot.parameters.denoising,
      steps: selectedShot.parameters.steps,
      guidance: selectedShot.parameters.guidance,
    });
    
    setHasModifications(false);
  }, [selectedShot]);
  
  // Handle drag over for file drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  
  // Handle drop for file upload
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files.length === 0) return;
    
    // Simulate file input change
    const input = fileInputRef.current;
    if (input) {
      const dataTransfer = new DataTransfer();
      Array.from(files).forEach((file) => dataTransfer.items.add(file));
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, []);
  
  if (!selectedShot) {
    return (
      <ShotConfigDropTarget shot={null}>
        <div className="shot-config-panel empty">
          <div className="empty-state">
            <div className="empty-icon">🎬</div>
            <h3>No Shot Selected</h3>
            <p>Select a shot from the timeline to edit its configuration</p>
          </div>
        </div>
      </ShotConfigDropTarget>
    );
  }
  
  const referenceImages = modifications.referenceImages || [];
  const promptLength = modifications.prompt?.length || 0;
  
  return (
    <ShotConfigDropTarget shot={selectedShot}>
      <div className="shot-config-panel">
        {/* Header */}
        <div className="shot-config-header">
          <h3 className="shot-name">{selectedShot.name}</h3>
          {hasModifications && (
            <span className="modified-indicator" title="Unsaved changes">●</span>
          )}
        </div>
        
        {/* Reference Images Grid */}
        <div className="config-section">
          <h4 className="section-title">Reference Images</h4>
          
          <div
            className="reference-images-grid"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {referenceImages.map((image) => (
              <div key={image.id} className="reference-image-item">
                <img src={image.url} alt={`Reference ${image.id}`} className="reference-image" />
                <button
                  className="remove-image-btn"
                  onClick={() => handleRemoveImage(image.id)}
                  title="Remove image"
                >
                  ×
                </button>
                <div className="image-type-badge">{image.source}</div>
              </div>
            ))}
            
            {/* Upload Button */}
            <div
              className="upload-image-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="upload-icon">+</div>
              <div className="upload-text">Add Image</div>
            </div>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
          
          <p className="section-hint">
            Drag and drop images here or click to upload
          </p>
        </div>
        
        {/* Prompt Editor */}
        <div className="config-section">
          <div className="section-header">
            <h4 className="section-title">Prompt</h4>
            <span className="char-count">{promptLength} characters</span>
          </div>
          
          <textarea
            className="prompt-editor"
            value={modifications.prompt || ''}
            onChange={handlePromptChange}
            placeholder="Describe the shot in detail..."
            rows={6}
          />
        </div>
        
        {/* Visual Style Controls */}
        <StyleControls shot={selectedShot} />
        
        {/* Generation Parameters */}
        <div className="config-section">
          <h4 className="section-title">Generation Parameters</h4>
          
          <div className="parameters-grid">
            {/* Seed */}
            <div className="parameter-control">
              <label htmlFor="seed-input">
                Seed
                <span className="param-hint" title="Random seed for reproducibility">ⓘ</span>
              </label>
              <input
                id="seed-input"
                type="number"
                value={modifications.seed || 0}
                onChange={(e) => handleParameterChange('seed', parseInt(e.target.value))}
                min={0}
                max={999999}
              />
            </div>
            
            {/* Denoising */}
            <div className="parameter-control">
              <label htmlFor="denoising-input">
                Denoising
                <span className="param-hint" title="Strength of denoising (0.0-1.0)">ⓘ</span>
              </label>
              <input
                id="denoising-input"
                type="number"
                value={modifications.denoising || 0.75}
                onChange={(e) => handleParameterChange('denoising', parseFloat(e.target.value))}
                min={0}
                max={1}
                step={0.05}
              />
            </div>
            
            {/* Steps */}
            <div className="parameter-control">
              <label htmlFor="steps-input">
                Steps
                <span className="param-hint" title="Number of diffusion steps (10-100)">ⓘ</span>
              </label>
              <input
                id="steps-input"
                type="number"
                value={modifications.steps || 30}
                onChange={(e) => handleParameterChange('steps', parseInt(e.target.value))}
                min={10}
                max={100}
              />
            </div>
            
            {/* Guidance */}
            <div className="parameter-control">
              <label htmlFor="guidance-input">
                Guidance
                <span className="param-hint" title="Classifier-free guidance scale (1-20)">ⓘ</span>
              </label>
              <input
                id="guidance-input"
                type="number"
                value={modifications.guidance || 7.5}
                onChange={(e) => handleParameterChange('guidance', parseFloat(e.target.value))}
                min={1}
                max={20}
                step={0.5}
              />
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="config-actions">
          <button
            className="revert-btn"
            onClick={handleRevert}
            disabled={!hasModifications}
          >
            Revert
          </button>
          <button
            className="apply-btn"
            onClick={handleApply}
            disabled={!hasModifications}
          >
            Apply Changes
          </button>
        </div>
      </div>
    </ShotConfigDropTarget>
  );
};

export default ShotConfigPanel;
