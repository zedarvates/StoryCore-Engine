/**
 * Dialogue Writer Form Component
 * 
 * Form fields for scene context, character selection, tone
 * Character multi-select
 * Form submission handler
 * 
 * Requirements: 6.1
 */

import React, { useState, useCallback, useEffect } from 'react';
import { FormField, FormSection, FormGrid } from '../WizardFormLayout';
import './DialogueWriterForm.css';

export interface DialogueInput {
  sceneContext: string;
  characters: string[];
  tone: string;
}

export interface CharacterReference {
  id: string;
  name: string;
}

export interface DialogueWriterFormProps {
  initialData?: Partial<DialogueInput>;
  characters: CharacterReference[];
  onSubmit: (data: DialogueInput) => void;
  onCancel: () => void;
  onChange?: (data: Partial<DialogueInput>) => void;
  onValidationChange?: (isValid: boolean) => void;
}

interface FormErrors {
  sceneContext?: string;
  characters?: string;
  tone?: string;
}

const TONE_OPTIONS = [
  'Casual',
  'Formal',
  'Humorous',
  'Serious',
  'Tense',
  'Emotional',
  'Playful',
  'Professional',
  'Intimate',
  'Confrontational',
];

export function DialogueWriterForm({
  initialData,
  characters,
  onSubmit,
  onCancel,
  onChange,
  onValidationChange,
}: DialogueWriterFormProps) {
  const [formData, setFormData] = useState<DialogueInput>({
    sceneContext: initialData?.sceneContext || '',
    characters: initialData?.characters || [],
    tone: initialData?.tone || '',
  });

  const [errors, setErrors] = useState<FormErrors>({});

  // Validate form whenever data changes
  useEffect(() => {
    // Skip validation on initial mount
    if (formData.sceneContext || formData.characters.length > 0 || formData.tone) {
      validateForm();
    }
  }, [formData, validateForm]);

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.sceneContext.trim()) {
      newErrors.sceneContext = 'Scene context is required';
    } else if (formData.sceneContext.length < 20) {
      newErrors.sceneContext = 'Context must be at least 20 characters';
    }

    if (formData.characters.length === 0) {
      newErrors.characters = 'At least one character must be selected';
    } else if (formData.characters.length > 6) {
      newErrors.characters = 'Maximum 6 characters can be selected';
    }

    if (!formData.tone.trim()) {
      newErrors.tone = 'Tone is required';
    }

    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    onValidationChange?.(isValid);
    return isValid;
  }, [formData, onValidationChange]);

  const handleFieldChange = useCallback((field: keyof DialogueInput, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      onChange?.(updated);
      return updated;
    });

    // Clear error for this field
    setErrors(prev => ({ ...prev, [field]: undefined }));
  }, [onChange]);

  const handleCharacterToggle = useCallback((characterId: string) => {
    const newCharacters = formData.characters.includes(characterId)
      ? formData.characters.filter(id => id !== characterId)
      : [...formData.characters, characterId];
    
    handleFieldChange('characters', newCharacters);
  }, [formData.characters, handleFieldChange]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  }, [formData, validateForm, onSubmit]);

  return (
    <form className="dialogue-writer-form" onSubmit={handleSubmit}>
      <FormSection title="Scene Context">
        <FormField
          name="sceneContext"
          label="Scene Context"
          required
          error={errors.sceneContext}
          helpText="Describe what's happening in the scene and what the dialogue should convey"
        >
          <textarea
            value={formData.sceneContext}
            onChange={(e) => handleFieldChange('sceneContext', e.target.value)}
            placeholder="Describe the scene situation, character motivations, and what needs to be communicated through dialogue"
            rows={6}
            className={errors.sceneContext ? 'error' : ''}
          />
        </FormField>
      </FormSection>

      <FormSection title="Characters & Tone">
        <FormField
          name="characters"
          label="Characters"
          required
          error={errors.characters}
          helpText={characters.length === 0 
            ? "⚠️ You need to create at least one character first" 
            : "Select characters who will speak in this scene (max 6)"}
        >
          {characters.length === 0 ? (
            <div className="no-characters-message" style={{
              padding: '1.5rem',
              backgroundColor: '#fef3c7',
              border: '2px solid #f59e0b',
              borderRadius: '0.5rem',
              textAlign: 'center',
              color: '#92400e',
              fontWeight: '500'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
              <div style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>No characters available</div>
              <div style={{ fontSize: '0.875rem' }}>
                Please create at least one character using the Character Wizard before writing dialogue.
              </div>
            </div>
          ) : (
            <div className="character-selection">
              {characters.map(character => (
                <label key={character.id} className="character-checkbox">
                  <input
                    type="checkbox"
                    checked={formData.characters.includes(character.id)}
                    onChange={() => handleCharacterToggle(character.id)}
                    disabled={
                      !formData.characters.includes(character.id) &&
                      formData.characters.length >= 6
                    }
                  />
                  <span className="character-name">{character.name}</span>
                  {formData.characters.includes(character.id) && (
                    <span className="character-order">
                      #{formData.characters.indexOf(character.id) + 1}
                    </span>
                  )}
                </label>
              ))}
            </div>
          )}
          {formData.characters.length > 0 && (
            <div className="selection-count">
              {formData.characters.length} of 6 characters selected
            </div>
          )}
        </FormField>

        <FormField
          label="Dialogue Tone"
          required
          error={errors.tone}
        >
          <select
            value={formData.tone}
            onChange={(e) => handleFieldChange('tone', e.target.value)}
            className={errors.tone ? 'error' : ''}
          >
            <option value="">Select tone...</option>
            {TONE_OPTIONS.map(tone => (
              <option key={tone} value={tone}>
                {tone}
              </option>
            ))}
          </select>
        </FormField>
      </FormSection>
    </form>
  );
}
