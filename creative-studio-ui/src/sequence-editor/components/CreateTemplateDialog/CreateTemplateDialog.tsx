/**
 * Create Template Dialog Component
 * 
 * Dialog for creating custom templates from selected shots.
 * Requirements: 10.6
 */

import React, { useState, useCallback } from 'react';
import { useTemplates } from '../../hooks/useTemplates';
import { useAppSelector } from '../../store';
import './createTemplateDialog.css';

// ============================================================================
// Types
// ============================================================================

interface CreateTemplateDialogProps {
  onClose: () => void;
  onSuccess?: (templateId: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export const CreateTemplateDialog: React.FC<CreateTemplateDialogProps> = ({
  onClose,
  onSuccess,
}) => {
  const { createTemplate } = useTemplates();
  const { shots, selectedElements } = useAppSelector((state) => state.timeline);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate selected shot count
  const selectedShots = shots.filter((shot) =>
    selectedElements.includes(shot.id)
  );
  const selectedShotCount = selectedShots.length;

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      // Validation
      if (!name.trim()) {
        setError('Template name is required');
        return;
      }

      if (!description.trim()) {
        setError('Description is required');
        return;
      }

      if (!genre.trim()) {
        setError('Genre is required');
        return;
      }

      if (selectedShotCount === 0) {
        setError('Please select shots in the timeline to create a template');
        return;
      }

      setIsSubmitting(true);

      try {
        // Parse tags
        const tagArray = tags
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0);

        // Create template
        const template = createTemplate(
          name.trim(),
          description.trim(),
          genre.trim(),
          tagArray
        );

        // Success callback
        if (onSuccess) {
          onSuccess(template.id);
        }

        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create template');
      } finally {
        setIsSubmitting(false);
      }
    },
    [name, description, genre, tags, selectedShotCount, createTemplate, onSuccess, onClose]
  );

  return (
    <div className="create-template-overlay" onClick={onClose}>
      <div className="create-template-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="create-template-header">
          <h2>Create Custom Template</h2>
          <button
            className="create-template-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="create-template-form">
          {/* Selected Shots Info */}
          <div className="selected-shots-info">
            <span className="info-icon">📊</span>
            <div className="info-content">
              <span className="info-label">Selected shots:</span>
              <span className="info-value">
                {selectedShotCount} {selectedShotCount === 1 ? 'shot' : 'shots'}
              </span>
            </div>
          </div>

          {selectedShotCount === 0 && (
            <div className="warning-box">
              <span className="warning-icon">⚠️</span>
              <span>Please select shots in the timeline before creating a template</span>
            </div>
          )}

          {/* Name Input */}
          <div className="form-group">
            <label htmlFor="template-name">
              Template Name <span className="required">*</span>
            </label>
            <input
              id="template-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Action Sequence"
              maxLength={100}
              required
            />
          </div>

          {/* Description Input */}
          <div className="form-group">
            <label htmlFor="template-description">
              Description <span className="required">*</span>
            </label>
            <textarea
              id="template-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this template is for..."
              rows={4}
              maxLength={500}
              required
            />
            <span className="char-count">
              {description.length}/500
            </span>
          </div>

          {/* Genre Input */}
          <div className="form-group">
            <label htmlFor="template-genre">
              Genre <span className="required">*</span>
            </label>
            <input
              id="template-genre"
              type="text"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              placeholder="e.g., action, drama, comedy"
              maxLength={50}
              required
            />
          </div>

          {/* Tags Input */}
          <div className="form-group">
            <label htmlFor="template-tags">
              Tags <span className="optional">(optional)</span>
            </label>
            <input
              id="template-tags"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Comma-separated tags, e.g., fast-paced, dynamic"
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
          <div className="create-template-actions">
            <button
              type="button"
              className="create-template-cancel"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="create-template-submit"
              disabled={isSubmitting || selectedShotCount === 0}
            >
              {isSubmitting ? 'Creating...' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTemplateDialog;
