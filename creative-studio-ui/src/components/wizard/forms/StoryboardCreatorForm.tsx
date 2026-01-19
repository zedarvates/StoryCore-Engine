/**
 * Storyboard Creator Form Component
 * 
 * Form fields for script text, visual style, pacing
 * Mode selection (replace/append)
 * Form submission handler
 * 
 * Requirements: 5.1, 12.3
 */

import React, { useState, useCallback } from 'react';
import { FormField, FormSection, FormGrid } from '../WizardFormLayout';
import './StoryboardCreatorForm.css';

export interface StoryboardInput {
  scriptText: string;
  visualStyle: string;
  pacing: 'slow' | 'medium' | 'fast';
  mode: 'replace' | 'append';
}

export interface StoryboardCreatorFormProps {
  initialData?: Partial<StoryboardInput>;
  onSubmit: (data: StoryboardInput) => void;
  onCancel: () => void;
  onChange?: (data: Partial<StoryboardInput>) => void;
}

interface FormErrors {
  scriptText?: string;
  visualStyle?: string;
  pacing?: string;
  mode?: string;
}

const VISUAL_STYLE_OPTIONS = [
  'Cinematic',
  'Documentary',
  'Animated',
  'Comic Book',
  'Film Noir',
  'Minimalist',
  'Vibrant',
  'Realistic',
  'Stylized',
  'Vintage',
];

export function StoryboardCreatorForm({
  initialData,
  onSubmit,
  onCancel,
  onChange,
}: StoryboardCreatorFormProps) {
  const [formData, setFormData] = useState<StoryboardInput>({
    scriptText: initialData?.scriptText || '',
    visualStyle: initialData?.visualStyle || '',
    pacing: initialData?.pacing || 'medium',
    mode: initialData?.mode || 'append',
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.scriptText.trim()) {
      newErrors.scriptText = 'Script text is required';
    } else if (formData.scriptText.length < 20) {
      newErrors.scriptText = 'Script must be at least 20 characters';
    }

    if (!formData.visualStyle.trim()) {
      newErrors.visualStyle = 'Visual style is required';
    }

    if (!formData.pacing) {
      newErrors.pacing = 'Pacing is required';
    }

    if (!formData.mode) {
      newErrors.mode = 'Mode is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleFieldChange = useCallback((field: keyof StoryboardInput, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      onChange?.(updated);
      return updated;
    });

    // Clear error for this field
    setErrors(prev => ({ ...prev, [field]: undefined }));
  }, [onChange]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  }, [formData, validateForm, onSubmit]);

  return (
    <form className="storyboard-creator-form" onSubmit={handleSubmit}>
      <FormSection title="Script">
        <FormField
          name="scriptText"
          label="Script Text"
          required
          error={errors.scriptText}
          helpText="Enter the script or narrative you want to visualize"
        >
          <textarea
            value={formData.scriptText}
            onChange={(e) => handleFieldChange('scriptText', e.target.value)}
            placeholder="Enter your script here. The AI will break it down into individual shots."
            rows={8}
            className={errors.scriptText ? 'error' : ''}
          />
        </FormField>
      </FormSection>

      <FormSection title="Visual Settings">
        <FormGrid columns={2}>
          <FormField
            name="visualStyle"
            label="Visual Style"
            required
            error={errors.visualStyle}
          >
            <select
              value={formData.visualStyle}
              onChange={(e) => handleFieldChange('visualStyle', e.target.value)}
              className={errors.visualStyle ? 'error' : ''}
            >
              <option value="">Select style...</option>
              {VISUAL_STYLE_OPTIONS.map(style => (
                <option key={style} value={style}>
                  {style}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            name="pacing"
            label="Pacing"
            required
            error={errors.pacing}
          >
            <select
              value={formData.pacing}
              onChange={(e) => handleFieldChange('pacing', e.target.value as 'slow' | 'medium' | 'fast')}
              className={errors.pacing ? 'error' : ''}
            >
              <option value="slow">Slow (Contemplative)</option>
              <option value="medium">Medium (Balanced)</option>
              <option value="fast">Fast (Dynamic)</option>
            </select>
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Storyboard Mode">
        <FormField
          name="mode"
          label="Mode"
          required
          error={errors.mode}
          helpText="Choose how to handle existing shots"
        >
          <div className="mode-selection">
            <label className={`mode-option ${formData.mode === 'replace' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="mode"
                value="replace"
                checked={formData.mode === 'replace'}
                onChange={(e) => handleFieldChange('mode', e.target.value as 'replace' | 'append')}
              />
              <div className="mode-content">
                <div className="mode-title">Replace</div>
                <div className="mode-description">
                  Remove all existing shots and create a new storyboard
                </div>
              </div>
            </label>

            <label className={`mode-option ${formData.mode === 'append' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="mode"
                value="append"
                checked={formData.mode === 'append'}
                onChange={(e) => handleFieldChange('mode', e.target.value as 'replace' | 'append')}
              />
              <div className="mode-content">
                <div className="mode-title">Append</div>
                <div className="mode-description">
                  Add new shots to the end of the existing storyboard
                </div>
              </div>
            </label>
          </div>
        </FormField>
      </FormSection>
    </form>
  );
}
