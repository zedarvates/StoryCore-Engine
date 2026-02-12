/**
 * Character Wizard Form Component
 * 
 * Form fields for name, description, personality, visual attributes
 * Field validation with error messages
 * Form submission handler
 * 
 * Requirements: 3.1
 */

import React, { useState, useCallback } from 'react';
import { FormField, FormSection, FormGrid } from '../WizardFormLayout';
import './CharacterWizardForm.css';

export interface CharacterWizardInput {
  name: string;
  description: string;
  personality: string[];
  visualAttributes: {
    age: string;
    gender: string;
    appearance: string;
    clothing: string;
  };
}

export interface CharacterWizardFormProps {
  initialData?: Partial<CharacterWizardInput>;
  onSubmit: (data: CharacterWizardInput) => void;
  onCancel: () => void;
  onChange?: (data: Partial<CharacterWizardInput>) => void;
}

interface FormErrors {
  name?: string;
  description?: string;
  personality?: string;
  age?: string;
  gender?: string;
  appearance?: string;
  clothing?: string;
}

export function CharacterWizardForm({
  initialData,
  onSubmit,
  onCancel,
  onChange,
}: CharacterWizardFormProps) {
  const [formData, setFormData] = useState<CharacterWizardInput>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    personality: initialData?.personality || [],
    visualAttributes: {
      age: initialData?.visualAttributes?.age || '',
      gender: initialData?.visualAttributes?.gender || '',
      appearance: initialData?.visualAttributes?.appearance || '',
      clothing: initialData?.visualAttributes?.clothing || '',
    },
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [personalityInput, setPersonalityInput] = useState('');

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Character name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Character description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    if (formData.personality.length === 0) {
      newErrors.personality = 'At least one personality trait is required';
    }

    if (!formData.visualAttributes.age.trim()) {
      newErrors.age = 'Age is required';
    }

    if (!formData.visualAttributes.gender.trim()) {
      newErrors.gender = 'Gender is required';
    }

    if (!formData.visualAttributes.appearance.trim()) {
      newErrors.appearance = 'Appearance description is required';
    } else if (formData.visualAttributes.appearance.length < 10) {
      newErrors.appearance = 'Appearance must be at least 10 characters';
    }

    if (!formData.visualAttributes.clothing.trim()) {
      newErrors.clothing = 'Clothing description is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleFieldChange = useCallback((field: string, value: unknown) => {
    setFormData(prev => {
      const updated = { ...prev };
      
      if (field.startsWith('visualAttributes.')) {
        const attrField = field.split('.')[1];
        updated.visualAttributes = {
          ...prev.visualAttributes,
          [attrField]: value,
        };
      } else {
        (updated as any)[field] = value;
      }
      
      onChange?.(updated);
      return updated;
    });

    // Clear error for this field
    setErrors(prev => ({ ...prev, [field.split('.').pop()!]: undefined }));
  }, [onChange]);

  const handleAddPersonality = useCallback(() => {
    if (personalityInput.trim() && !formData.personality.includes(personalityInput.trim())) {
      handleFieldChange('personality', [...formData.personality, personalityInput.trim()]);
      setPersonalityInput('');
    }
  }, [personalityInput, formData.personality, handleFieldChange]);

  const handleRemovePersonality = useCallback((trait: string) => {
    handleFieldChange('personality', formData.personality.filter(t => t !== trait));
  }, [formData.personality, handleFieldChange]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  }, [formData, validateForm, onSubmit]);

  return (
    <form className="character-wizard-form" onSubmit={handleSubmit}>
      <FormSection title="Basic Information">
        <FormField
          name="name"
          label="Character Name"
          required
          error={errors.name}
        >
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            placeholder="Enter character name"
            className={errors.name ? 'error' : ''}
          />
        </FormField>

        <FormField
          name="description"
          label="Description"
          required
          error={errors.description}
          helpText="Provide a brief overview of the character"
        >
          <textarea
            value={formData.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder="Describe the character's role, background, and key traits"
            rows={4}
            className={errors.description ? 'error' : ''}
          />
        </FormField>
      </FormSection>

      <FormSection title="Personality Traits">
        <FormField
          name="personality"
          label="Personality"
          required
          error={errors.personality}
          helpText="Add personality traits that define this character"
        >
          <div className="personality-input-group">
            <input
              type="text"
              value={personalityInput}
              onChange={(e) => setPersonalityInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddPersonality())}
              placeholder="e.g., brave, curious, witty"
              className={errors.personality ? 'error' : ''}
            />
            <button
              type="button"
              onClick={handleAddPersonality}
              className="add-trait-button"
            >
              Add
            </button>
          </div>
          
          {formData.personality.length > 0 && (
            <div className="personality-tags">
              {formData.personality.map(trait => (
                <span key={trait} className="personality-tag">
                  {trait}
                  <button
                    type="button"
                    onClick={() => handleRemovePersonality(trait)}
                    className="remove-tag"
                    aria-label={`Remove ${trait}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </FormField>
      </FormSection>

      <FormSection title="Visual Attributes">
        <FormGrid columns={2}>
          <FormField
            name="age"
            label="Age"
            required
            error={errors.age}
          >
            <input
              type="text"
              value={formData.visualAttributes.age}
              onChange={(e) => handleFieldChange('visualAttributes.age', e.target.value)}
              placeholder="e.g., 25, mid-30s, elderly"
              className={errors.age ? 'error' : ''}
            />
          </FormField>

          <FormField
            name="gender"
            label="Gender"
            required
            error={errors.gender}
          >
            <input
              type="text"
              value={formData.visualAttributes.gender}
              onChange={(e) => handleFieldChange('visualAttributes.gender', e.target.value)}
              placeholder="e.g., male, female, non-binary"
              className={errors.gender ? 'error' : ''}
            />
          </FormField>
        </FormGrid>

        <FormField
          name="appearance"
          label="Appearance"
          required
          error={errors.appearance}
          helpText="Describe physical features, build, hair, eyes, etc."
        >
          <textarea
            value={formData.visualAttributes.appearance}
            onChange={(e) => handleFieldChange('visualAttributes.appearance', e.target.value)}
            placeholder="Describe the character's physical appearance in detail"
            rows={3}
            className={errors.appearance ? 'error' : ''}
          />
        </FormField>

        <FormField
          name="clothing"
          label="Clothing"
          required
          error={errors.clothing}
          helpText="Describe typical attire and style"
        >
          <textarea
            value={formData.visualAttributes.clothing}
            onChange={(e) => handleFieldChange('visualAttributes.clothing', e.target.value)}
            placeholder="Describe the character's typical clothing and style"
            rows={3}
            className={errors.clothing ? 'error' : ''}
          />
        </FormField>
      </FormSection>
    </form>
  );
}

