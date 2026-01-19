/**
 * Scene Generator Form Component
 * 
 * Form fields for concept, mood, duration, characters, location
 * Character selection dropdown
 * Form submission handler
 * 
 * Requirements: 4.1
 */

import React, { useState, useCallback } from 'react';
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
}: SceneGeneratorFormProps) {
  const [formData, setFormData] = useState<SceneGeneratorInput>({
    concept: initialData?.concept || '',
    mood: initialData?.mood || '',
    duration: initialData?.duration || 30,
    characters: initialData?.characters || [],
    location: initialData?.location || '',
  });

  const [errors, setErrors] = useState<FormErrors>({});

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

    if (formData.characters.length === 0) {
      newErrors.characters = 'At least one character must be selected';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

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
          label="Characters"
          required
          error={errors.characters}
          helpText="Select characters that appear in this scene"
        >
          {characters.length === 0 ? (
            <div className="no-characters-message">
              No characters available. Create characters first using the Character Wizard.
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
