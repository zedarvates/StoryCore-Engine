/**
 * Create Preset Dialog Component
 * 
 * Dialog for creating custom narrative presets.
 * Requirements: 10.6
 */

import React, { useState, useCallback } from 'react';
import { useTemplates } from '../../hooks/useTemplates';
import './createPresetDialog.css';

// ============================================================================
// Types
// ============================================================================

interface CreatePresetDialogProps {
  onClose: () => void;
  onSuccess?: (presetId: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export const CreatePresetDialog: React.FC<CreatePresetDialogProps> = ({
  onClose,
  onSuccess,
}) => {
  const { createPreset } = useTemplates();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [mood, setMood] = useState('');
  const [cinematicStyle, setCinematicStyle] = useState('');
  const [colorPalette, setColorPalette] = useState('');
  const [denoising, setDenoising] = useState('0.75');
  const [steps, setSteps] = useState('20');
  const [guidance, setGuidance] = useState('7.5');
  const [tags, setTags] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      // Validation
      if (!name.trim()) {
        setError('Preset name is required');
        return;
      }

      if (!description.trim()) {
        setError('Description is required');
        return;
      }

      setIsSubmitting(true);

      try {
        // Parse color palette
        const colors = colorPalette
          .split(',')
          .map((color) => color.trim())
          .filter((color) => color.length > 0);

        // Parse tags
        const tagArray = tags
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0);

        // Create preset
        const preset = createPreset(
          name.trim(),
          description.trim(),
          {
            mood: mood.trim() || undefined,
            cinematicStyle: cinematicStyle.trim() || undefined,
            colorPalette: colors.length > 0 ? colors : undefined,
          },
          {
            denoising: denoising ? parseFloat(denoising) : undefined,
            steps: steps ? parseInt(steps, 10) : undefined,
            guidance: guidance ? parseFloat(guidance) : undefined,
          },
          tagArray
        );

        // Success callback
        if (onSuccess) {
          onSuccess(preset.id);
        }

        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create preset');
      } finally {
        setIsSubmitting(false);
      }
    },
    [name, description, mood, cinematicStyle, colorPalette, denoising, steps, guidance, tags, createPreset, onSuccess, onClose]
  );

  return (
    <div className="create-preset-overlay" onClick={onClose}>
      <div className="create-preset-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="create-preset-header">
          <h2>Create Narrative Preset</h2>
          <button
            className="create-preset-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="create-preset-form">
          {/* Name Input */}
          <div className="form-group">
            <label htmlFor="preset-name">
              Preset Name <span className="required">*</span>
            </label>
            <input
              id="preset-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Cinematic"
              maxLength={100}
              required
            />
          </div>

          {/* Description Input */}
          <div className="form-group">
            <label htmlFor="preset-description">
              Description <span className="required">*</span>
            </label>
            <textarea
              id="preset-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the style and mood of this preset..."
              rows={4}
              maxLength={500}
              required
            />
            <span className="char-count">
              {description.length}/500
            </span>
          </div>

          {/* Style Parameters Section */}
          <div className="form-section">
            <h3>Style Parameters</h3>
            
            <div className="form-group">
              <label htmlFor="preset-mood">
                Mood <span className="optional">(optional)</span>
              </label>
              <input
                id="preset-mood"
                type="text"
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                placeholder="e.g., dark and moody, bright and cheerful"
                maxLength={100}
              />
            </div>

            <div className="form-group">
              <label htmlFor="preset-cinematic-style">
                Cinematic Style <span className="optional">(optional)</span>
              </label>
              <input
                id="preset-cinematic-style"
                type="text"
                value={cinematicStyle}
                onChange={(e) => setCinematicStyle(e.target.value)}
                placeholder="e.g., hollywood, film noir, documentary"
                maxLength={100}
              />
            </div>

            <div className="form-group">
              <label htmlFor="preset-color-palette">
                Color Palette <span className="optional">(optional)</span>
              </label>
              <input
                id="preset-color-palette"
                type="text"
                value={colorPalette}
                onChange={(e) => setColorPalette(e.target.value)}
                placeholder="Hex colors, e.g., #FF0000, #00FF00, #0000FF"
                maxLength={200}
              />
              <span className="help-text">
                Separate colors with commas
              </span>
            </div>
          </div>

          {/* Shot Defaults Section */}
          <div className="form-section">
            <h3>Shot Defaults</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="preset-denoising">
                  Denoising <span className="optional">(optional)</span>
                </label>
                <input
                  id="preset-denoising"
                  type="number"
                  value={denoising}
                  onChange={(e) => setDenoising(e.target.value)}
                  placeholder="0.75"
                  min="0"
                  max="1"
                  step="0.05"
                />
              </div>

              <div className="form-group">
                <label htmlFor="preset-steps">
                  Steps <span className="optional">(optional)</span>
                </label>
                <input
                  id="preset-steps"
                  type="number"
                  value={steps}
                  onChange={(e) => setSteps(e.target.value)}
                  placeholder="20"
                  min="1"
                  max="100"
                />
              </div>

              <div className="form-group">
                <label htmlFor="preset-guidance">
                  Guidance <span className="optional">(optional)</span>
                </label>
                <input
                  id="preset-guidance"
                  type="number"
                  value={guidance}
                  onChange={(e) => setGuidance(e.target.value)}
                  placeholder="7.5"
                  min="0"
                  max="20"
                  step="0.5"
                />
              </div>
            </div>
          </div>

          {/* Tags Input */}
          <div className="form-group">
            <label htmlFor="preset-tags">
              Tags <span className="optional">(optional)</span>
            </label>
            <input
              id="preset-tags"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Comma-separated tags, e.g., cinematic, professional"
              maxLength={200}
            />
            <span className="help-text">
              Separate tags with commas
            </span>
          </div>

          {/* Error Message */}
          {error && (
            <div className="error-box">
              <span className="error-icon">❌</span>
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="create-preset-actions">
            <button
              type="button"
              className="create-preset-cancel"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="create-preset-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Preset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePresetDialog;
