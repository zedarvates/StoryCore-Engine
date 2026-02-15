import React, { useId } from 'react';
import { Sparkles } from 'lucide-react';
import type { VisualIdentity } from '@/types/character';
import type { World } from '@/types/world';
import { useLLMGeneration } from '@/hooks/useLLMGeneration';
import { LLMErrorDisplay, LLMLoadingState } from '@/components/wizard/LLMErrorDisplay';
import { ServiceWarning, useServiceStatus } from '@/components/ui/service-warning';
import { Button } from '@/components/ui/button';
import {
  HAIR_COLORS,
  EYE_COLORS,
  SKIN_TONES,
  BODY_BUILDS,
  HEIGHT_CATEGORIES,
  POSTURE_OPTIONS,
} from '@/constants/characterOptions';
import './EditorSection.css';

interface AppearanceSectionProps {
  readonly data: Partial<VisualIdentity>;
  readonly errors: Record<string, string[]>;
  readonly onChange: (field: string, value: unknown) => void;
  readonly characterName: string;
  readonly archetype: string;
  readonly ageRange: string;
  readonly gender: string;
  readonly worldContext?: World;
}

export function AppearanceSection({
  data,
  errors,
  onChange,
  characterName,
  archetype,
  ageRange,
  gender,
  worldContext,
}: AppearanceSectionProps) {
  const { llmConfigured, llmChecking } = useServiceStatus();
  const fieldId = useId();

  // LLM generation for appearance suggestions
  const {
    generate,
    isLoading,
    error: llmError,
    clearError,
  } = useLLMGeneration({
    onSuccess: (response) => {
      const appearance = parseLLMAppearance(response.content);
      if (appearance) {
        Object.entries(appearance).forEach(([field, value]) => {
          onChange(field, value);
        });
      }
    },
  });

  const handleGenerateAppearance = async () => {
    clearError();

    const systemPrompt = 'You are a character design expert. Create detailed, coherent physical appearances that match the character\'s role and world setting.';

    const prompt = `Generate a detailed physical appearance for a character:
- Name: ${characterName}
- Archetype: ${archetype}
- Age Range: ${ageRange}
- Gender: ${gender}
- World Genre: ${worldContext?.genre?.join(', ') || 'fantasy'}

Format as JSON with keys: hair_color, hair_style, hair_length, eye_color, eye_shape, skin_tone, facial_structure, height, build, posture, clothing_style, distinctive_features (array), color_palette (array)`;

    await generate({
      prompt,
      systemPrompt,
      temperature: 0.8,
      maxTokens: 800,
    });
  };

  const parseLLMAppearance = (response: string): Partial<VisualIdentity> | null => {
    try {
      // Remove markdown code blocks (```json ... ``` or ``` ... ```)
      let cleanedResponse = response.replaceAll(/```(?:json)?\s*([\s\S]*?)```/g, '$1');
      
      // Remove single-line comments (// ...)
      cleanedResponse = cleanedResponse.replaceAll(/\/\/.*$/gm, '');
      
      // Remove multi-line comments (/* ... */)
      cleanedResponse = cleanedResponse.replaceAll(/\/\*[\s\S]*?\*\//g, '');
      
      // Extract JSON object from response
      const jsonRegex = /\{[\s\S]*\}/;
      const match = jsonRegex.exec(cleanedResponse);
      if (match) {
        return JSON.parse(match[0]);
      }
    } catch (e) {
      console.error('Failed to parse LLM appearance:', e);
    }
    return null;
  };

  const handleSelectChange = (field: string, value: string) => {
    onChange(field, value === 'Other' ? '' : value);
  };

  const isCustomValue = (field: keyof VisualIdentity, options: readonly string[]) => {
    const value = data[field];
    if (!value) return false;
    if (Array.isArray(value)) return false;
    return !options.includes(value);
  };

  return (
    <div className="editor-section">
      <div className="flex items-center justify-between mb-4">
        <h3 className="editor-section__title mb-0">Appearance</h3>
        <Button
          onClick={handleGenerateAppearance}
          disabled={isLoading || llmChecking || !llmConfigured || !archetype}
          size="sm"
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          {isLoading ? 'Generating...' : 'Generate Appearance'}
        </Button>
      </div>

      {!llmConfigured && !llmChecking && (
        <ServiceWarning service="llm" variant="inline" className="mb-4" />
      )}

      {llmError && (
        <LLMErrorDisplay error={llmError} onRetry={handleGenerateAppearance} onDismiss={clearError} className="mb-4" />
      )}

      {isLoading && <LLMLoadingState message="Designing appearance..." className="mb-4" />}

      <div className="editor-section__grid">
        {/* Hair */}
        <div className="editor-section__field">
          <label className="editor-section__label" htmlFor={`${fieldId}-hair-color`}>Hair Color</label>
          <select
            id={`${fieldId}-hair-color`}
            className="editor-section__select"
            value={isCustomValue('hair_color', HAIR_COLORS) ? 'Other' : data.hair_color || ''}
            onChange={(e) => handleSelectChange('hair_color', e.target.value)}
          >
            <option value="">Select color</option>
            {HAIR_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
            <option value="Other">Other...</option>
          </select>
          {isCustomValue('hair_color', HAIR_COLORS) && (
            <input
              type="text"
              id={`${fieldId}-hair-color-custom`}
              className="editor-section__input mt-2"
              value={data.hair_color || ''}
              onChange={(e) => onChange('hair_color', e.target.value)}
              placeholder="Custom hair color"
            />
          )}
        </div>

        <div className="editor-section__field">
          <label className="editor-section__label" htmlFor={`${fieldId}-hair-style`}>Hair Style</label>
          <input
            id={`${fieldId}-hair-style`}
            className="editor-section__input"
            value={data.hair_style || ''}
            onChange={(e) => onChange('hair_style', e.target.value)}
            placeholder="e.g., Messy, Bun"
          />
        </div>

        <div className="editor-section__field">
          <label className="editor-section__label" htmlFor={`${fieldId}-hair-length`}>Hair Length</label>
          <input
            id={`${fieldId}-hair-length`}
            className="editor-section__input"
            value={data.hair_length || ''}
            onChange={(e) => onChange('hair_length', e.target.value)}
            placeholder="e.g., Short, Long"
          />
        </div>

        {/* Eyes */}
        <div className="editor-section__field">
          <label className="editor-section__label" htmlFor={`${fieldId}-eye-color`}>Eye Color</label>
          <select
            id={`${fieldId}-eye-color`}
            className="editor-section__select"
            value={isCustomValue('eye_color', EYE_COLORS) ? 'Other' : data.eye_color || ''}
            onChange={(e) => handleSelectChange('eye_color', e.target.value)}
          >
            <option value="">Select color</option>
            {EYE_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
            <option value="Other">Other...</option>
          </select>
          {isCustomValue('eye_color', EYE_COLORS) && (
            <input
              type="text"
              id={`${fieldId}-eye-color-custom`}
              className="editor-section__input mt-2"
              value={data.eye_color || ''}
              onChange={(e) => onChange('eye_color', e.target.value)}
              placeholder="Custom eye color"
            />
          )}
        </div>

        <div className="editor-section__field">
          <label className="editor-section__label" htmlFor={`${fieldId}-eye-shape`}>Eye Shape</label>
          <input
            id={`${fieldId}-eye-shape`}
            className="editor-section__input"
            value={data.eye_shape || ''}
            onChange={(e) => onChange('eye_shape', e.target.value)}
            placeholder="e.g., Almond, Round"
          />
        </div>

        <div className="editor-section__field">
          <label className="editor-section__label" htmlFor={`${fieldId}-skin-tone`}>Skin Tone</label>
          <select
            id={`${fieldId}-skin-tone`}
            className="editor-section__select"
            value={isCustomValue('skin_tone', SKIN_TONES) ? 'Other' : data.skin_tone || ''}
            onChange={(e) => handleSelectChange('skin_tone', e.target.value)}
          >
            <option value="">Select tone</option>
            {SKIN_TONES.map(t => <option key={t} value={t}>{t}</option>)}
            <option value="Other">Other...</option>
          </select>
          {isCustomValue('skin_tone', SKIN_TONES) && (
            <input
              type="text"
              id={`${fieldId}-skin-tone-custom`}
              className="editor-section__input mt-2"
              value={data.skin_tone || ''}
              onChange={(e) => onChange('skin_tone', e.target.value)}
              placeholder="Custom skin tone"
            />
          )}
        </div>

        <div className="editor-section__field">
          <label className="editor-section__label" htmlFor={`${fieldId}-height`}>Height</label>
          <select
            id={`${fieldId}-height`}
            className="editor-section__select"
            value={isCustomValue('height', HEIGHT_CATEGORIES) ? 'Other' : data.height || ''}
            onChange={(e) => handleSelectChange('height', e.target.value)}
          >
            <option value="">Select height</option>
            {HEIGHT_CATEGORIES.map(h => <option key={h} value={h}>{h}</option>)}
            <option value="Other">Other...</option>
          </select>
          {isCustomValue('height', HEIGHT_CATEGORIES) && (
            <input
              type="text"
              id={`${fieldId}-height-custom`}
              className="editor-section__input mt-2"
              value={data.height || ''}
              onChange={(e) => onChange('height', e.target.value)}
              placeholder="Custom height"
            />
          )}
        </div>

        <div className="editor-section__field">
          <label className="editor-section__label" htmlFor={`${fieldId}-build`}>Build</label>
          <select
            id={`${fieldId}-build`}
            className="editor-section__select"
            value={isCustomValue('build', BODY_BUILDS) ? 'Other' : data.build || ''}
            onChange={(e) => handleSelectChange('build', e.target.value)}
          >
            <option value="">Select build</option>
            {BODY_BUILDS.map(b => <option key={b} value={b}>{b}</option>)}
            <option value="Other">Other...</option>
          </select>
          {isCustomValue('build', BODY_BUILDS) && (
            <input
              type="text"
              id={`${fieldId}-build-custom`}
              className="editor-section__input mt-2"
              value={data.build || ''}
              onChange={(e) => onChange('build', e.target.value)}
              placeholder="Custom build"
            />
          )}
        </div>

        <div className="editor-section__field">
          <label className="editor-section__label" htmlFor={`${fieldId}-posture`}>Posture</label>
          <select
            id={`${fieldId}-posture`}
            className="editor-section__select"
            value={isCustomValue('posture', POSTURE_OPTIONS) ? 'Other' : data.posture || ''}
            onChange={(e) => handleSelectChange('posture', e.target.value)}
          >
            <option value="">Select posture</option>
            {POSTURE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
            <option value="Other">Other...</option>
          </select>
          {isCustomValue('posture', POSTURE_OPTIONS) && (
            <input
              type="text"
              id={`${fieldId}-posture-custom`}
              className="editor-section__input mt-2"
              value={data.posture || ''}
              onChange={(e) => onChange('posture', e.target.value)}
              placeholder="Custom posture"
            />
          )}
        </div>
      </div>

      <div className="editor-section__field">
        <label className="editor-section__label" htmlFor={`${fieldId}-facial-structure`}>Facial Structure</label>
        <input
          id={`${fieldId}-facial-structure`}
          className="editor-section__input"
          value={data.facial_structure || ''}
          onChange={(e) => onChange('facial_structure', e.target.value)}
          placeholder="e.g., Angular, Sharp"
        />
      </div>

      <div className="editor-section__field">
        <label className="editor-section__label" htmlFor={`${fieldId}-clothing-style`}>Clothing Style</label>
        <textarea
          id={`${fieldId}-clothing-style`}
          className="editor-section__textarea"
          value={data.clothing_style || ''}
          onChange={(e) => onChange('clothing_style', e.target.value)}
          placeholder="Describe their fashion sense"
          rows={2}
        />
      </div>

      <div className="editor-section__field">
        <label className="editor-section__label" htmlFor={`${fieldId}-distinctive-features`}>Distinctive Features</label>
        <input
          id={`${fieldId}-distinctive-features`}
          className="editor-section__input"
          value={Array.isArray(data.distinctive_features) ? data.distinctive_features.join(', ') : ''}
          onChange={(e) => {
            const arr = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
            onChange('distinctive_features', arr);
          }}
          placeholder="Comma-separated: scar, tattoo"
        />
      </div>

      <div className="editor-section__field">
        <label className="editor-section__label" htmlFor={`${fieldId}-color-palette`}>Color Palette</label>
        <input
          id={`${fieldId}-color-palette`}
          className="editor-section__input"
          value={Array.isArray(data.color_palette) ? data.color_palette.join(', ') : ''}
          onChange={(e) => {
            const arr = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
            onChange('color_palette', arr);
          }}
          placeholder="Comma-separated: blue, red"
        />
      </div>
    </div>
  );
}
