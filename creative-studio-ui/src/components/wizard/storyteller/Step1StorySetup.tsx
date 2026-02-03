import React from 'react';
import { useWizard } from '@/contexts/WizardContext';
import { WizardFormLayout, FormField } from '../WizardFormLayout';
import { ValidationErrorSummary } from '../ValidationErrorSummary';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { StorySetupData } from '@/types/story';

// ============================================================================
// Constants
// ============================================================================

const GENRE_OPTIONS = [
  { value: 'fantasy', label: 'Fantasy' },
  { value: 'sci-fi', label: 'Science Fiction' },
  { value: 'mystery', label: 'Mystery' },
  { value: 'romance', label: 'Romance' },
  { value: 'horror', label: 'Horror' },
  { value: 'thriller', label: 'Thriller' },
  { value: 'adventure', label: 'Adventure' },
  { value: 'drama', label: 'Drama' },
  { value: 'comedy', label: 'Comedy' },
  { value: 'historical', label: 'Historical' },
  { value: 'western', label: 'Western' },
  { value: 'dystopian', label: 'Dystopian' },
];

const TONE_OPTIONS = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'serious', label: 'Serious' },
  { value: 'humorous', label: 'Humorous' },
  { value: 'epic', label: 'Epic' },
  { value: 'intimate', label: 'Intimate' },
  { value: 'mysterious', label: 'Mysterious' },
  { value: 'hopeful', label: 'Hopeful' },
  { value: 'melancholic', label: 'Melancholic' },
  { value: 'suspenseful', label: 'Suspenseful' },
  { value: 'whimsical', label: 'Whimsical' },
  { value: 'gritty', label: 'Gritty' },
];

const LENGTH_OPTIONS = [
  { value: 'scene', label: 'Scene', description: '500–1500 words' },
  { value: 'chapter', label: 'Chapter', description: '1500–5000 words' },
  { value: 'short_story', label: 'Short Story', description: '5 000–20 000 words' },
  { value: 'novella', label: 'Novella', description: '20 000–50 000 words' },
  { value: 'novel', label: 'Novel', description: '60 000–120 000 words' },
  { value: 'epic_novel', label: 'Epic Novel', description: '150 000–250 000 words' },
  { value: 'mega_epic', label: 'Mega Epic (Wheel of Time scale)', description: '250 000–400 000 words' }
];

// ============================================================================
// Step 1: Story Setup
// ============================================================================

export function Step1StorySetup() {
  const { formData, updateFormData, validationErrors } = useWizard<StorySetupData>();

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormData({ title: e.target.value });
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

  const handleLengthChange = (value: string) => {
    updateFormData({ length: value as 'short' | 'medium' | 'long' });
  };

  return (
    <WizardFormLayout
      title="Story Setup"
      description="Define the basic parameters for your story"
    >
      {/* Validation Error Summary */}
      <ValidationErrorSummary errors={validationErrors} className="mb-6" />

      {/* Story Title (Optional) */}
      <FormField
        label="Story Title"
        name="title"
        helpText="Give your story a title (optional - you can add this later)"
      >
        <Input
          id="title"
          value={formData.title || ''}
          onChange={handleTitleChange}
          placeholder="e.g., The Crystal Prophecy, Shadows of Tomorrow"
          aria-describedby="title-help"
        />
      </FormField>

      {/* Genre Selection */}
      <FormField
        label={
          <>
            Genre <span className="text-red-600">*</span>
          </>
        }
        name="genre"
        required
        error={validationErrors.genre?.[0]}
        helpText="Select one or more genres for your story (at least one required)"
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
        label={
          <>
            Tone <span className="text-red-600">*</span>
          </>
        }
        name="tone"
        required
        error={validationErrors.tone?.[0]}
        helpText="Select one or more tones that define the story's atmosphere (at least one required)"
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

      {/* Story Length */}
      <FormField
        label={
          <>
            Story Length <span className="text-red-600">*</span>
          </>
        }
        name="length"
        required
        error={validationErrors.length?.[0]}
        helpText="Choose the desired length for your story"
      >
        <RadioGroup
          value={formData.length || 'medium'}
          onValueChange={handleLengthChange}
          aria-required="true"
          aria-invalid={!!validationErrors.length}
          aria-describedby={validationErrors.length ? 'length-error' : 'length-help'}
        >
          {LENGTH_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem
                value={option.value}
                id={`length-${option.value}`}
                aria-label={`${option.label} - ${option.description}`}
              />
              <Label
                htmlFor={`length-${option.value}`}
                className="text-sm font-normal cursor-pointer flex flex-col"
              >
                <span className="font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.description}</span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </FormField>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-md">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          💡 <strong>Tip:</strong> The genre and tone you select will influence how the AI generates your story. 
          You can combine multiple genres and tones to create unique narratives.
        </p>
      </div>
    </WizardFormLayout>
  );
}
