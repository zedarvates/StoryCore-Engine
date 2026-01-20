/**
 * Scene Generator Form Component
 * 
 * Form fields for concept, mood, duration, characters, location
 * Character selection dropdown
 * Form submission handler
 * 
 * Requirements: 4.1
 */

import React, { useState, useCallback, useEffect } from 'react';
import { FormField, FormSection, FormGrid } from '../WizardFormLayout';
import './SceneGeneratorForm.css';

export interface SceneGeneratorInput {
  concept: string;
  mood: string;
  duration: number;
  characters: string[];
  location: string;
}

export interface CharacterReference {
  id: string;
  name: string;
}

export interface SceneGeneratorFormProps {
  initialData?: Partial<SceneGeneratorInput>;
  characters: CharacterReference[];
  onSubmit: (data: SceneGeneratorInput) => void;
  onCancel: () => void;
  onChange?: (data: Partial<SceneGeneratorInput>) => void;
  onValidationChange?: (isValid: boolean) => void;
}

interface FormErrors {
  concept?: string;
  mood?: string;
  duration?: string;
  characters?: string;
  location?: string;
}

const MOOD_OPTIONS = [
  'Dramatic',
  'Comedic',
  'Suspenseful',
  'Romantic',
  'Action-packed',
  'Melancholic',
  'Uplifting',
  'Mysterious',
  'Tense',
  'Peaceful',
];

export function SceneGeneratorForm({
  initialData,
  characters,
  onSubmit,
  onCancel,
  onChange,
  onValidationChange,
}: SceneGeneratorFormProps) {
  const [formData, setFormData] = useState<SceneGeneratorInput>({
    concept: initialData?.concept || '',
    mood: initialData?.mood || '',
    duration: initialData?.duration || 30,
    characters: initialData?.characters || [],
    location: initialData?.location || '',
  });

  const [errors, setErrors] = useState<FormErrors>({});

  // Validate form whenever data changes
  useEffect(() => {
    // Skip validation on initial mount
    if (formData.concept || formData.mood || formData.characters.length > 0 || formData.location) {
      validateForm();
    }
  }, [formData]);

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.concept.trim()) {
      newErrors.concept = 'Scene concept is required';
    } else if (formData.concept.length < 10) {
      newErrors.concept = 'Concept must be at least 10 characters';
    }

    if (!formData.mood.trim()) {
      newErrors.mood = 'Mood is required';
    }

    if (formData.duration <= 0) {
      newErrors.duration = 'Duration must be greater than 0';
    } else if (formData.duration > 300) {
      newErrors.duration = 'Duration cannot exceed 300 seconds';
    }

    // Characters are optional - scenes can exist without characters (documentaries, voiceover, etc.)

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    onValidationChange?.(isValid);
    return isValid;
  }, [formData, onValidationChange]);

  const handleFieldChange = useCallback((field: keyof SceneGeneratorInput, value: any) => {
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
    <form className="scene-generator-form" onSubmit={handleSubmit}>
      <FormSection title="Scene Overview">
        <FormField
          name="concept"
          label="Scene Concept"
          required
          error={errors.concept}
          helpText="Describe what happens in this scene"
        >
          <textarea
            value={formData.concept}
            onChange={(e) => handleFieldChange('concept', e.target.value)}
            placeholder="Describe the main action, conflict, or event in this scene"
            rows={4}
            className={errors.concept ? 'error' : ''}
          />
        </FormField>

        <FormGrid columns={2}>
          <FormField
            name="mood"
            label="Mood"
            required
            error={errors.mood}
          >
            <select
              value={formData.mood}
              onChange={(e) => handleFieldChange('mood', e.target.value)}
              className={errors.mood ? 'error' : ''}
            >
              <option value="">Select mood...</option>
              {MOOD_OPTIONS.map(mood => (
                <option key={mood} value={mood}>
                  {mood}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            name="duration"
            label="Duration (seconds)"
            required
            error={errors.duration}
          >
            <input
              type="number"
              value={formData.duration}
              onChange={(e) => handleFieldChange('duration', parseInt(e.target.value) || 0)}
              min="1"
              max="300"
              className={errors.duration ? 'error' : ''}
            />
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Scene Details">
        <FormField
          name="location"
          label="Location"
          required
          error={errors.location}
          helpText="Where does this scene take place?"
        >
          <input
            type="text"
            value={formData.location}
            onChange={(e) => handleFieldChange('location', e.target.value)}
            placeholder="e.g., City street, Forest clearing, Living room"
            className={errors.location ? 'error' : ''}
          />
        </FormField>

        <FormField
          name="characters"
          label="Characters (Optional)"
          error={errors.characters}
          helpText={characters.length === 0 
            ? "No characters available. You can create scenes without characters (e.g., documentaries, voiceover)" 
            : "Select characters that appear in this scene (optional - leave empty for voiceover/documentary scenes)"}
        >
          {characters.length === 0 ? (
            <div className="no-characters-message" style={{
              padding: '1rem',
              backgroundColor: '#f3f4f6',
              border: '2px dashed #9ca3af',
              borderRadius: '0.5rem',
              textAlign: 'center',
              color: '#6b7280',
              fontWeight: '500'
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>ℹ️</div>
              <div style={{ fontSize: '0.875rem' }}>
                No characters available. You can still create scenes without characters (documentaries, voiceover, etc.)
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
                  />
                  <span className="character-name">{character.name}</span>
                </label>
              ))}
            </div>
          )}
        </FormField>
      </FormSection>
    </form>
  );
}
