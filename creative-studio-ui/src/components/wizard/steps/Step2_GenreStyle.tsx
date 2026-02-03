/**
 * Step 2: Genre & Style Definition
 * Allows users to define the genre and visual style of their project
 */

import { useState, useEffect } from 'react';
import { Palette, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardFormLayout, FormField, FormSection, FormGrid } from '../WizardFormLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { Genre, VisualStyle, Mood, GenreStyleData, ColorPalette } from '@/types/wizard';

// ============================================================================
// Genre Options
// ============================================================================

const GENRE_OPTIONS: { value: Genre; label: string; description: string }[] = [
  { value: 'action', label: 'Action', description: 'High-energy sequences and stunts' },
  { value: 'drama', label: 'Drama', description: 'Character-driven emotional stories' },
  { value: 'comedy', label: 'Comedy', description: 'Humorous and lighthearted content' },
  { value: 'sci-fi', label: 'Sci-Fi', description: 'Science fiction and futuristic themes' },
  { value: 'fantasy', label: 'Fantasy', description: 'Magical and mythical worlds' },
  { value: 'horror', label: 'Horror', description: 'Suspenseful and frightening content' },
  { value: 'romance', label: 'Romance', description: 'Love stories and relationships' },
  { value: 'thriller', label: 'Thriller', description: 'Suspenseful and tense narratives' },
  { value: 'documentary', label: 'Documentary', description: 'Non-fiction and factual content' },
  { value: 'mystery', label: 'Mystery', description: 'Puzzles and investigative stories' },
  { value: 'adventure', label: 'Adventure', description: 'Exploration and discovery' },
  { value: 'historical', label: 'Historical', description: 'Period pieces and historical events' },
  { value: 'musical', label: 'Musical', description: 'Music-driven storytelling' },
  { value: 'western', label: 'Western', description: 'Frontier and cowboy themes' },
];

// ============================================================================
// Visual Style Options
// ============================================================================

const VISUAL_STYLE_OPTIONS: {
  value: VisualStyle;
  label: string;
  description: string;
  preview: string;
}[] = [
  {
    value: 'realistic',
    label: 'Realistic',
    description: 'Photorealistic and natural',
    preview: '🎬',
  },
  {
    value: 'stylized',
    label: 'Stylized',
    description: 'Artistic interpretation',
    preview: '🎨',
  },
  {
    value: 'anime',
    label: 'Anime',
    description: 'Japanese animation style',
    preview: '🎌',
  },
  {
    value: 'comic-book',
    label: 'Comic Book',
    description: 'Bold lines and colors',
    preview: '💥',
  },
  {
    value: 'noir',
    label: 'Noir',
    description: 'High contrast black and white',
    preview: '🌑',
  },
  {
    value: 'vintage',
    label: 'Vintage',
    description: 'Classic film aesthetic',
    preview: '📽️',
  },
  {
    value: 'futuristic',
    label: 'Futuristic',
    description: 'Modern and sleek',
    preview: '🚀',
  },
  {
    value: 'watercolor',
    label: 'Watercolor',
    description: 'Soft and flowing',
    preview: '🖌️',
  },
  {
    value: 'oil-painting',
    label: 'Oil Painting',
    description: 'Rich and textured',
    preview: '🖼️',
  },
  {
    value: 'minimalist',
    label: 'Minimalist',
    description: 'Simple and clean',
    preview: '⬜',
  },
  {
    value: 'surreal',
    label: 'Surreal',
    description: 'Dreamlike and abstract',
    preview: '🌀',
  },
];

// ============================================================================
// Mood Options
// ============================================================================

const MOOD_OPTIONS: { value: Mood; label: string; icon: string }[] = [
  { value: 'dark', label: 'Dark', icon: '🌑' },
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'serious', label: 'Serious', icon: '😐' },
  { value: 'playful', label: 'Playful', icon: '😄' },
  { value: 'tense', label: 'Tense', icon: '😰' },
  { value: 'calm', label: 'Calm', icon: '😌' },
  { value: 'energetic', label: 'Energetic', icon: '⚡' },
  { value: 'melancholic', label: 'Melancholic', icon: '😔' },
  { value: 'hopeful', label: 'Hopeful', icon: '🌟' },
  { value: 'mysterious', label: 'Mysterious', icon: '🔮' },
];

// ============================================================================
// Color Palette Presets
// ============================================================================

const COLOR_PALETTE_PRESETS: {
  name: string;
  palette: ColorPalette;
  description: string;
}[] = [
  {
    name: 'warm-sunset',
    palette: { primary: '#FF6B35', secondary: '#F7931E', accent: '#FDC830', preset: 'warm-sunset' },
    description: 'Warm oranges and yellows',
  },
  {
    name: 'cool-ocean',
    palette: { primary: '#0077BE', secondary: '#00A8E8', accent: '#00C9FF', preset: 'cool-ocean' },
    description: 'Cool blues and teals',
  },
  {
    name: 'monochrome',
    palette: { primary: '#000000', secondary: '#666666', accent: '#CCCCCC', preset: 'monochrome' },
    description: 'Black, white, and grays',
  },
  {
    name: 'forest-green',
    palette: { primary: '#2D5016', secondary: '#4A7C2C', accent: '#8BC34A', preset: 'forest-green' },
    description: 'Natural greens',
  },
  {
    name: 'royal-purple',
    palette: { primary: '#4A148C', secondary: '#7B1FA2', accent: '#BA68C8', preset: 'royal-purple' },
    description: 'Rich purples',
  },
  {
    name: 'fire-red',
    palette: { primary: '#B71C1C', secondary: '#D32F2F', accent: '#FF5252', preset: 'fire-red' },
    description: 'Bold reds',
  },
];

// ============================================================================
// Component Props
// ============================================================================

interface Step2_GenreStyleProps {
  data: GenreStyleData | null;
  onUpdate: (data: GenreStyleData) => void;
  errors?: Record<string, string>;
}

// ============================================================================
// Component
// ============================================================================

export function Step2_GenreStyle({ data, onUpdate, errors = {} }: Step2_GenreStyleProps) {
  // State
  const [selectedGenres, setSelectedGenres] = useState<Genre[]>(data?.genres || []);
  const [selectedVisualStyle, setSelectedVisualStyle] = useState<VisualStyle | null>(
    data?.visualStyle || null
  );
  const [selectedMoods, setSelectedMoods] = useState<Mood[]>(data?.mood || []);
  const [colorPalette, setColorPalette] = useState<ColorPalette>(
    data?.colorPalette || { primary: '#000000', secondary: '#666666', accent: '#CCCCCC' }
  );
  const [useCustomColors, setUseCustomColors] = useState<boolean>(
    !data?.colorPalette?.preset || false
  );

  // Update parent when data changes
  useEffect(() => {
    if (selectedGenres.length > 0 && selectedVisualStyle) {
      onUpdate({
        genres: selectedGenres,
        visualStyle: selectedVisualStyle,
        colorPalette,
        mood: selectedMoods,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGenres, selectedVisualStyle, colorPalette, selectedMoods]); // Don't include onUpdate

  // Handle genre toggle
  const handleGenreToggle = (genre: Genre) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  // Handle visual style selection
  const handleVisualStyleSelect = (style: VisualStyle) => {
    setSelectedVisualStyle(style);
  };

  // Handle mood toggle
  const handleMoodToggle = (mood: Mood) => {
    setSelectedMoods((prev) =>
      prev.includes(mood) ? prev.filter((m) => m !== mood) : [...prev, mood]
    );
  };

  // Handle preset palette selection
  const handlePresetSelect = (preset: ColorPalette) => {
    setColorPalette(preset);
    setUseCustomColors(false);
  };

  // Handle custom color change
  const handleCustomColorChange = (field: 'primary' | 'secondary' | 'accent', value: string) => {
    setColorPalette((prev) => ({
      ...prev,
      [field]: value,
      preset: undefined,
    }));
    setUseCustomColors(true);
  };

  return (
    <WizardFormLayout
      title="Genre & Style Definition"
      description="Define the genre and visual style of your project"
    >
      {/* Error Summary */}
      {(errors.genres || errors.visualStyle) && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 p-4"
          role="alert"
        >
          <p className="text-sm text-red-800 dark:text-red-200">
            {errors.genres || errors.visualStyle}
          </p>
        </div>
      )}

      {/* Genre Selection */}
      <FormSection
        title="Genre Selection"
        description="Select one or more genres that describe your project"
      >
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {GENRE_OPTIONS.map((genre) => (
            <Card
              key={genre.value}
              className={cn(
                'cursor-pointer transition-all hover:shadow-md',
                selectedGenres.includes(genre.value)
                  ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              )}
              onClick={() => handleGenreToggle(genre.value)}
              role="checkbox"
              aria-checked={selectedGenres.includes(genre.value)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleGenreToggle(genre.value);
                }
              }}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedGenres.includes(genre.value)}
                    onCheckedChange={() => handleGenreToggle(genre.value)}
                    aria-label={genre.label}
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">{genre.label}</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {genre.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {selectedGenres.length > 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Selected: {selectedGenres.map((g) => GENRE_OPTIONS.find((opt) => opt.value === g)?.label).join(', ')}
          </p>
        )}
      </FormSection>

      {/* Visual Style Selection */}
      <FormSection
        title="Visual Style"
        description="Choose the aesthetic approach for your project"
      >
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {VISUAL_STYLE_OPTIONS.map((style) => (
            <Card
              key={style.value}
              className={cn(
                'cursor-pointer transition-all hover:shadow-md',
                selectedVisualStyle === style.value
                  ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              )}
              onClick={() => handleVisualStyleSelect(style.value)}
              role="radio"
              aria-checked={selectedVisualStyle === style.value}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleVisualStyleSelect(style.value);
                }
              }}
            >
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-4xl mb-2">{style.preview}</div>
                  <h4 className="font-semibold text-sm mb-1">{style.label}</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {style.description}
                  </p>
                  {selectedVisualStyle === style.value && (
                    <div className="mt-2">
                      <div className="h-6 w-6 mx-auto rounded-full bg-blue-500 flex items-center justify-center">
                        <svg
                          className="h-4 w-4 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </FormSection>

      {/* Color Palette Selection */}
      <FormSection
        title="Color Palette"
        description="Choose a color palette or create a custom one"
      >
        {/* Preset Palettes */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Preset Palettes</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {COLOR_PALETTE_PRESETS.map((preset) => (
              <Card
                key={preset.name}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-md',
                  colorPalette.preset === preset.name
                    ? 'ring-2 ring-blue-500'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                )}
                onClick={() => handlePresetSelect(preset.palette)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handlePresetSelect(preset.palette);
                  }
                }}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-6 h-6 rounded"
                      style={{ backgroundColor: preset.palette.primary }}
                    />
                    <div
                      className="w-6 h-6 rounded"
                      style={{ backgroundColor: preset.palette.secondary }}
                    />
                    <div
                      className="w-6 h-6 rounded"
                      style={{ backgroundColor: preset.palette.accent }}
                    />
                  </div>
                  <h5 className="font-semibold text-sm capitalize">
                    {preset.name.replace('-', ' ')}
                  </h5>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {preset.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Custom Colors */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="useCustomColors"
              checked={useCustomColors}
              onCheckedChange={(checked) => setUseCustomColors(checked as boolean)}
            />
            <Label htmlFor="useCustomColors" className="text-sm font-semibold">
              Use Custom Colors
            </Label>
          </div>

          {useCustomColors && (
            <FormGrid columns={3}>
              <FormField label="Primary Color" name="primaryColor">
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={colorPalette.primary}
                    onChange={(e) => handleCustomColorChange('primary', e.target.value)}
                    className="w-16 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={colorPalette.primary}
                    onChange={(e) => handleCustomColorChange('primary', e.target.value)}
                    placeholder="#000000"
                    className="flex-1 font-mono text-sm"
                  />
                </div>
              </FormField>

              <FormField label="Secondary Color" name="secondaryColor">
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={colorPalette.secondary}
                    onChange={(e) => handleCustomColorChange('secondary', e.target.value)}
                    className="w-16 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={colorPalette.secondary}
                    onChange={(e) => handleCustomColorChange('secondary', e.target.value)}
                    placeholder="#666666"
                    className="flex-1 font-mono text-sm"
                  />
                </div>
              </FormField>

              <FormField label="Accent Color" name="accentColor">
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={colorPalette.accent}
                    onChange={(e) => handleCustomColorChange('accent', e.target.value)}
                    className="w-16 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={colorPalette.accent}
                    onChange={(e) => handleCustomColorChange('accent', e.target.value)}
                    placeholder="#CCCCCC"
                    className="flex-1 font-mono text-sm"
                  />
                </div>
              </FormField>
            </FormGrid>
          )}
        </div>

        {/* Color Preview */}
        <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-4 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <Palette className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <div className="flex-1">
              <h4 className="font-semibold text-sm mb-2">Current Palette</h4>
              <div className="flex gap-2">
                <div className="flex-1 text-center">
                  <div
                    className="w-full h-12 rounded mb-1"
                    style={{ backgroundColor: colorPalette.primary }}
                  />
                  <p className="text-xs text-gray-600 dark:text-gray-400">Primary</p>
                </div>
                <div className="flex-1 text-center">
                  <div
                    className="w-full h-12 rounded mb-1"
                    style={{ backgroundColor: colorPalette.secondary }}
                  />
                  <p className="text-xs text-gray-600 dark:text-gray-400">Secondary</p>
                </div>
                <div className="flex-1 text-center">
                  <div
                    className="w-full h-12 rounded mb-1"
                    style={{ backgroundColor: colorPalette.accent }}
                  />
                  <p className="text-xs text-gray-600 dark:text-gray-400">Accent</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </FormSection>

      {/* Mood/Tone Selection */}
      <FormSection
        title="Mood & Tone"
        description="Select the emotional atmosphere of your project"
      >
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {MOOD_OPTIONS.map((mood) => (
            <Card
              key={mood.value}
              className={cn(
                'cursor-pointer transition-all hover:shadow-md',
                selectedMoods.includes(mood.value)
                  ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              )}
              onClick={() => handleMoodToggle(mood.value)}
              role="checkbox"
              aria-checked={selectedMoods.includes(mood.value)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleMoodToggle(mood.value);
                }
              }}
            >
              <CardContent className="p-3">
                <div className="text-center">
                  <div className="text-3xl mb-1">{mood.icon}</div>
                  <h4 className="font-semibold text-sm">{mood.label}</h4>
                  {selectedMoods.includes(mood.value) && (
                    <div className="mt-2">
                      <div className="h-5 w-5 mx-auto rounded-full bg-blue-500 flex items-center justify-center">
                        <svg
                          className="h-3 w-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {selectedMoods.length > 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Selected: {selectedMoods.map((m) => MOOD_OPTIONS.find((opt) => opt.value === m)?.label).join(', ')}
          </p>
        )}
      </FormSection>

      {/* Summary */}
      {selectedGenres.length > 0 && selectedVisualStyle && (
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Style Configuration
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Your project will use a <strong>{selectedVisualStyle}</strong> visual style with{' '}
                <strong>{selectedGenres.length}</strong> genre{selectedGenres.length > 1 ? 's' : ''}
                {selectedMoods.length > 0 && (
                  <>
                    {' '}
                    and a <strong>{selectedMoods.join(', ')}</strong> mood
                  </>
                )}
                . This configuration will be used to generate the Master Coherence Sheet.
              </p>
            </div>
          </div>
        </div>
      )}
    </WizardFormLayout>
  );
}
