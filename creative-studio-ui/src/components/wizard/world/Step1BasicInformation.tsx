import React from 'react';
import { useWizard } from '@/contexts/WizardContext';
import type { World } from '@/types/world';
import { GENRE_OPTIONS, TONE_OPTIONS } from '@/types/world';
import { WizardFormLayout, FormField } from '../WizardFormLayout';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

// ============================================================================
// Step 1: Basic Information
// ============================================================================

export function Step1BasicInformation() {
  const { formData, updateFormData, validationErrors } = useWizard<World>();

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormData({ name: e.target.value });
  };

  const handleTimePeriodChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormData({ timePeriod: e.target.value });
  };

  const handleGenreToggle = (genre: string) => {
    const currentGenres = formData.genre || [];
    const newGenres = currentGenres.includes(genre)
      ? currentGenres.filter((g) => g !== genre)
      : [...currentGenres, genre];
    updateFormData({ genre: newGenres });
  };

  const handleToneToggle = (tone: string) => {
    const currentTones = formData.tone || [];
    const newTones = currentTones.includes(tone)
      ? currentTones.filter((t) => t !== tone)
      : [...currentTones, tone];
    updateFormData({ tone: newTones });
  };

  return (
    <WizardFormLayout
      title="Basic Information"
      description="Define the fundamental characteristics of your story world"
    >
      {/* World Name */}
      <FormField
        label="World Name"
        name="name"
        required
        error={validationErrors.name?.[0]}
        helpText="Give your world a memorable name"
      >
        <Input
          id="name"
          value={formData.name || ''}
          onChange={handleNameChange}
          placeholder="e.g., Eldoria, Neo-Tokyo, The Wasteland"
          aria-required="true"
          aria-invalid={!!validationErrors.name}
          aria-describedby={validationErrors.name ? 'name-error' : 'name-help'}
        />
      </FormField>

      {/* Time Period */}
      <FormField
        label="Time Period"
        name="timePeriod"
        required
        error={validationErrors.timePeriod?.[0]}
        helpText="When does your story take place?"
      >
        <Input
          id="timePeriod"
          value={formData.timePeriod || ''}
          onChange={handleTimePeriodChange}
          placeholder="e.g., Medieval Era, Year 2157, Present Day"
          aria-required="true"
          aria-invalid={!!validationErrors.timePeriod}
          aria-describedby={validationErrors.timePeriod ? 'timePeriod-error' : 'timePeriod-help'}
        />
      </FormField>

      {/* Genre Selection */}
      <FormField
        label="Genre"
        name="genre"
        required
        error={validationErrors.genre?.[0]}
        helpText="Select one or more genres that describe your world (at least one required)"
      >
        <div
          className="grid grid-cols-2 md:grid-cols-3 gap-3"
          role="group"
          aria-labelledby="genre-label"
          aria-required="true"
        >
          {GENRE_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={`genre-${option.value}`}
                checked={formData.genre?.includes(option.value) || false}
                onCheckedChange={() => handleGenreToggle(option.value)}
                aria-label={option.label}
              />
              <Label
                htmlFor={`genre-${option.value}`}
                className="text-sm font-normal cursor-pointer"
              >
                {option.label}
              </Label>
            </div>
          ))}
        </div>
      </FormField>

      {/* Tone Selection */}
      <FormField
        label="Tone"
        name="tone"
        required
        error={validationErrors.tone?.[0]}
        helpText="Select one or more tones that define the atmosphere (at least one required)"
      >
        <div
          className="grid grid-cols-2 md:grid-cols-3 gap-3"
          role="group"
          aria-labelledby="tone-label"
          aria-required="true"
        >
          {TONE_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={`tone-${option.value}`}
                checked={formData.tone?.includes(option.value) || false}
                onCheckedChange={() => handleToneToggle(option.value)}
                aria-label={option.label}
              />
              <Label
                htmlFor={`tone-${option.value}`}
                className="text-sm font-normal cursor-pointer"
              >
                {option.label}
              </Label>
            </div>
          ))}
        </div>
      </FormField>
    </WizardFormLayout>
  );
}
