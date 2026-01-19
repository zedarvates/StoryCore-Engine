/**
 * Style Transfer Form Component
 * 
 * Shot selection dropdown
 * Style reference image upload
 * Form submission handler
 * 
 * Requirements: 8.1
 */

import React, { useState, useCallback, useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { FormField, FormSection } from '../WizardFormLayout';
import './StyleTransferForm.css';

export interface StyleTransferInput {
  shotId: string;
  styleReferenceImage: File | null;
}

export interface Shot {
  id: string;
  title: string;
  frame_path?: string;
}

export interface StyleTransferFormProps {
  initialData?: Partial<StyleTransferInput>;
  shots: Shot[];
  onSubmit: (data: StyleTransferInput) => void;
  onChange?: (data: Partial<StyleTransferInput>) => void;
}

interface FormErrors {
  shotId?: string;
  styleReferenceImage?: string;
}

export function StyleTransferForm({
  initialData,
  shots,
  onSubmit,
  onChange,
}: StyleTransferFormProps) {
  const [formData, setFormData] = useState<StyleTransferInput>({
    shotId: initialData?.shotId || '',
    styleReferenceImage: initialData?.styleReferenceImage || null,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.shotId) {
      newErrors.shotId = 'Please select a shot';
    }

    if (!formData.styleReferenceImage) {
      newErrors.styleReferenceImage = 'Style reference image is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleFieldChange = useCallback((field: keyof StyleTransferInput, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      onChange?.(updated);
      return updated;
    });

    // Clear error for this field
    setErrors(prev => ({ ...prev, [field]: undefined }));
  }, [onChange]);

  const handleFileSelect = useCallback((file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, styleReferenceImage: 'Please select an image file' }));
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, styleReferenceImage: 'Image must be less than 10MB' }));
      return;
    }

    handleFieldChange('styleReferenceImage', file);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, [handleFieldChange]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleRemoveImage = useCallback(() => {
    handleFieldChange('styleReferenceImage', null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFieldChange, previewUrl]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  }, [formData, validateForm, onSubmit]);

  const selectedShot = shots.find(shot => shot.id === formData.shotId);

  return (
    <form className="style-transfer-form" onSubmit={handleSubmit}>
      <FormSection title="Select Shot">
        <FormField
          name="shotId"
          label="Target Shot"
          required
          error={errors.shotId}
          helpText="Choose the shot you want to apply style transfer to"
        >
          {shots.length === 0 ? (
            <div className="no-shots-message">
              No shots available. Create shots first using other wizards or manually.
            </div>
          ) : (
            <select
              value={formData.shotId}
              onChange={(e) => handleFieldChange('shotId', e.target.value)}
              className={errors.shotId ? 'error' : ''}
            >
              <option value="">Select a shot...</option>
              {shots.map(shot => (
                <option key={shot.id} value={shot.id}>
                  {shot.title}
                </option>
              ))}
            </select>
          )}
        </FormField>

        {selectedShot && selectedShot.frame_path && (
          <div className="shot-preview">
            <div className="preview-label">Current Shot:</div>
            <img
              src={selectedShot.frame_path}
              alt={selectedShot.title}
              className="shot-preview-image"
            />
          </div>
        )}
      </FormSection>

      <FormSection title="Style Reference">
        <FormField
          name="styleReferenceImage"
          label="Style Reference Image"
          required
          error={errors.styleReferenceImage}
          helpText="Upload an image that represents the visual style you want to apply"
        >
          {!formData.styleReferenceImage ? (
            <div
              className="file-upload-area"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="upload-icon" size={48} />
              <div className="upload-text">
                <p className="upload-primary">Click to upload or drag and drop</p>
                <p className="upload-secondary">PNG, JPG up to 10MB</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="file-input-hidden"
              />
            </div>
          ) : (
            <div className="uploaded-image-preview">
              <div className="preview-header">
                <span className="preview-filename">{formData.styleReferenceImage.name}</span>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="remove-image-button"
                  aria-label="Remove image"
                >
                  <X size={18} />
                </button>
              </div>
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Style reference"
                  className="style-preview-image"
                />
              )}
            </div>
          )}
        </FormField>
      </FormSection>
    </form>
  );
}
