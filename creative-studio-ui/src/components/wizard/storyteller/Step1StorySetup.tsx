import React, { useState, useEffect } from 'react';
import { useWizard } from '@/contexts/WizardContext';
import { WizardFormLayout, FormField } from '../WizardFormLayout';
import { ValidationErrorSummary } from '../ValidationErrorSummary';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MethodologySelector, FullSettings } from './MethodologySelector';
import { WritingStyle, type MethodologyState } from '@/types/storyMethodology';
import type { StorySetupData } from '@/types/story';
import { loadStylePreferences, saveStylePreferences } from '@/services/globalTemplatesService';

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
// Extended Form Data with Methodology
// ============================================================================

interface ExtendedStorySetupData extends StorySetupData {
  methodology?: string;
  methodologyOptions?: Record<string, unknown>;
  methodologySettings?: FullSettings;
}

// ============================================================================
// Step 1: Story Setup
// ============================================================================

export function Step1StorySetup() {
  const { formData, updateFormData, validationErrors } = useWizard<ExtendedStorySetupData>();

  // Track if preferences have been applied to avoid infinite loops
  const preferencesAppliedRef = React.useRef(false);

  // Load saved style preferences on mount
  useEffect(() => {
    // Only apply preferences once per component lifecycle
    if (preferencesAppliedRef.current) return;

    const savedPreferences = loadStylePreferences();
    if (savedPreferences) {
      // Only apply saved preferences if form data is empty (first load)
      const hasExistingGenre = (formData.genre?.length ?? 0) > 0;
      const hasExistingTone = (formData.tone?.length ?? 0) > 0;
      const hasExistingLength = formData.length && formData.length !== 'medium' && formData.length !== undefined;

      const updates: Partial<ExtendedStorySetupData> = {};

      if (!hasExistingGenre && savedPreferences.lastUsedGenre.length > 0) {
        updates.genre = savedPreferences.lastUsedGenre;
      }
      if (!hasExistingTone && savedPreferences.lastUsedTone.length > 0) {
        updates.tone = savedPreferences.lastUsedTone;
      }
      if (!hasExistingLength && savedPreferences.lastUsedLength) {
        updates.length = savedPreferences.lastUsedLength as any;
      }

      // Only update if there are changes to make
      if (Object.keys(updates).length > 0) {
        console.log('[Step1StorySetup] Applying saved preferences:', updates);
        updateFormData(updates);
      }

      preferencesAppliedRef.current = true;
    }
  }, [updateFormData]); // Include updateFormData in dependencies

  // Local state for methodology selection (synced with formData)
  const [selectedMethodology, setSelectedMethodology] = useState(formData.methodology || 'sequential');
  const [methodologyOptions, setMethodologyOptions] = useState<Record<string, unknown>>(
    formData.methodologyOptions || {}
  );
  const [methodologySettings, setMethodologySettings] = useState<FullSettings>(
    formData.methodologySettings || {
      writingStyle: WritingStyle.DESCRIPTIVE,
      toneConsistencyCheck: true,
      characterVoiceConsistency: true,
      revisionHistory: true,
    }
  );
  const [showMethodology, setShowMethodology] = useState(false);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormData({ title: e.target.value });
  };

  const handleGenreToggle = (genre: string) => {
    const currentGenres = formData.genre || [];
    const newGenres = currentGenres.includes(genre)
      ? currentGenres.filter((g) => g !== genre)
      : [...currentGenres, genre];
    updateFormData({ genre: newGenres });
    // Save to preferences
    saveStylePreferences({ lastUsedGenre: newGenres });
  };

  const handleToneToggle = (tone: string) => {
    const currentTones = formData.tone || [];
    const newTones = currentTones.includes(tone)
      ? currentTones.filter((t) => t !== tone)
      : [...currentTones, tone];
    updateFormData({ tone: newTones });
    // Save to preferences
    saveStylePreferences({ lastUsedTone: newTones });
  };

  const handleLengthChange = (value: string) => {
    updateFormData({ length: value as 'short' | 'medium' | 'long' });
    // Save to preferences
    saveStylePreferences({ lastUsedLength: value });
  };

  const handleMethodologyChange = (methodology: string) => {
    setSelectedMethodology(methodology);
    updateFormData({ methodology });
  };

  const handleMethodologyOptionsChange = (options: Record<string, unknown>) => {
    setMethodologyOptions(options);
    updateFormData({ methodologyOptions: options });
  };

  const handleMethodologySettingsChange = (settings: FullSettings) => {
    setMethodologySettings(settings);
    updateFormData({ methodologySettings: settings });
  };

  const handleWritingStyleChange = (style: WritingStyle) => {
    const newSettings = { ...methodologySettings, writingStyle: style };
    setMethodologySettings(newSettings);
    updateFormData({ methodologySettings: newSettings });
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

      {/* Methodology Selection Toggle */}
      <div className="border-t pt-6 mt-6">
        <button
          type="button"
          onClick={() => setShowMethodology(!showMethodology)}
          className="w-full flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
        >
          <div className="text-left">
            <h3 className="font-semibold">Story Creation Methodology</h3>
            <p className="text-sm text-muted-foreground">
              Choose how you want to create your story
            </p>
          </div>
          <Label className="text-sm text-muted-foreground">
            {showMethodology ? 'Hide options' : 'Show options'}
          </Label>
        </button>

        {/* Methodology Selector */}
        {showMethodology && (
          <div className="mt-4">
            <MethodologySelector
              selectedMethodology={selectedMethodology}
              onMethodologyChange={handleMethodologyChange}
              options={methodologyOptions}
              onOptionsChange={handleMethodologyOptionsChange}
              writingStyle={methodologySettings.writingStyle}
              onWritingStyleChange={handleWritingStyleChange}
              settings={methodologySettings}
              onSettingsChange={handleMethodologySettingsChange}
            />
          </div>
        )}
      </div>

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
