import React, { useState } from 'react';
import { useWizard } from '@/contexts/WizardContext';
import { WizardFormLayout } from '../WizardFormLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, X } from 'lucide-react';
import { useLLMGeneration } from '@/hooks/useLLMGeneration';
import { LLMErrorDisplay, LLMLoadingState } from '../LLMErrorDisplay';
import { useServiceStatus } from '@/components/ui/service-warning';
import type { Character } from '@/types/character';
import type { World } from '@/types/world';

// ============================================================================
// Step 2: Physical Appearance
// ============================================================================

interface Step2PhysicalAppearanceProps {
  worldContext?: World;
}

export function Step2PhysicalAppearance({ worldContext }: Step2PhysicalAppearanceProps) {
  const { formData, updateFormData } =
    useWizard<Character>();
  const [newFeature, setNewFeature] = useState('');
  const [newColor, setNewColor] = useState('');

  // Check if LLM service is configured
  const { llmConfigured } = useServiceStatus();

  // LLM generation for appearance suggestions
  const {
    generate,
    isLoading,
    error: llmError,
    clearError,
  } = useLLMGeneration({
    onSuccess: (response) => {
      // Parse LLM response and update form data
      const appearance = parseLLMAppearance(response.content);
      if (appearance) {
        updateFormData({
          visual_identity: {
            ...(formData.visual_identity || {}),
            ...appearance,
          } as Character['visual_identity'],
        });
      }
    },
  });

  const handleGenerateAppearance = async () => {
    clearError();

    const context = {
      characterName: formData.name || 'the character',
      archetype: formData.role?.archetype || 'character',
      ageRange: formData.visual_identity?.age_range || 'adult',
      worldGenre: worldContext?.genre?.join(', ') || 'fantasy',
      worldTone: worldContext?.tone?.join(', ') || 'dramatic',
    };

    const systemPrompt = 'You are a character design expert. Create detailed, coherent physical appearances that match the character\'s role and world setting. Ensure all features work together harmoniously.';

    const prompt = `Generate a detailed physical appearance for a character with the following context:
- Name: ${context.characterName}
- Archetype: ${context.archetype}
- Age Range: ${context.ageRange}
- World Genre: ${context.worldGenre}
- World Tone: ${context.worldTone}

Please provide:
1. Hair (color, style, length)
2. Eyes (color, shape)
3. Skin tone
4. Facial structure
5. Height and build
6. Posture
7. Clothing style
8. 3-5 distinctive features
9. Color palette (3-5 colors that represent this character)

Ensure the appearance is:
- Consistent with the archetype and age range
- Appropriate for the genre and tone
- Visually distinctive and memorable
- Internally coherent (all features work together)

Format as JSON with keys: hair_color, hair_style, hair_length, eye_color, eye_shape, skin_tone, facial_structure, height, build, posture, clothing_style, distinctive_features (array), color_palette (array)

Example:
{
  "hair_color": "Silver-white",
  "hair_style": "Long and flowing",
  "hair_length": "Waist-length",
  "eye_color": "Piercing blue",
  "eye_shape": "Almond-shaped",
  "skin_tone": "Pale porcelain",
  "facial_structure": "Sharp, angular features",
  "height": "Tall (6'2\")",
  "build": "Lean and athletic",
  "posture": "Regal and commanding",
  "clothing_style": "Elegant robes with silver embroidery, practical leather boots",
  "distinctive_features": ["Scar across left eyebrow", "Silver ring on right hand", "Always wears a pendant"],
  "color_palette": ["Silver", "Deep blue", "White", "Black"]
}`;

    await generate({
      prompt,
      systemPrompt,
      temperature: 0.8,
      maxTokens: 800,
    });
  };

  const parseLLMAppearance = (response: string): Partial<Character['visual_identity']> | null => {
    try {
      console.log('Parsing LLM appearance response:', response);
      
      // Try JSON parsing first
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          const result: Partial<Character['visual_identity']> = {};
          
          // Map all possible fields with aliases
          if (parsed.hair_color || parsed.hairColor) result.hair_color = parsed.hair_color || parsed.hairColor;
          if (parsed.hair_style || parsed.hairStyle) result.hair_style = parsed.hair_style || parsed.hairStyle;
          if (parsed.hair_length || parsed.hairLength) result.hair_length = parsed.hair_length || parsed.hairLength;
          if (parsed.eye_color || parsed.eyeColor) result.eye_color = parsed.eye_color || parsed.eyeColor;
          if (parsed.eye_shape || parsed.eyeShape) result.eye_shape = parsed.eye_shape || parsed.eyeShape;
          if (parsed.skin_tone || parsed.skinTone) result.skin_tone = parsed.skin_tone || parsed.skinTone;
          if (parsed.facial_structure || parsed.facialStructure) result.facial_structure = parsed.facial_structure || parsed.facialStructure;
          if (parsed.height) result.height = parsed.height;
          if (parsed.build) result.build = parsed.build;
          if (parsed.posture) result.posture = parsed.posture;
          if (parsed.clothing_style || parsed.clothingStyle) result.clothing_style = parsed.clothing_style || parsed.clothingStyle;
          if (Array.isArray(parsed.distinctive_features) || Array.isArray(parsed.distinctiveFeatures)) {
            result.distinctive_features = parsed.distinctive_features || parsed.distinctiveFeatures;
          }
          if (Array.isArray(parsed.color_palette) || Array.isArray(parsed.colorPalette)) {
            result.color_palette = parsed.color_palette || parsed.colorPalette;
          }
          
          // Check if we got any data
          if (Object.keys(result).length > 0) {
            console.log('Successfully parsed appearance from JSON:', result);
            return result;
          }
        } catch (jsonError) {
          console.warn('JSON parsing failed, trying text parsing');
        }
      }
      
      // Fallback: Parse as structured text
      console.log('Attempting text-based parsing');
      const result: Partial<Character['visual_identity']> = {};
      const lines = response.split('\n');
      
      const distinctiveFeatures: string[] = [];
      const colorPalette: string[] = [];
      let inFeaturesSection = false;
      let inColorsSection = false;
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        // Detect sections
        if (/distinctive\s*features?:/i.test(trimmed)) {
          inFeaturesSection = true;
          inColorsSection = false;
          continue;
        }
        if (/color\s*palette:/i.test(trimmed)) {
          inColorsSection = true;
          inFeaturesSection = false;
          continue;
        }
        
        // Parse list items in sections
        if (inFeaturesSection) {
          const cleaned = trimmed.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '');
          if (cleaned.length > 3 && !cleaned.endsWith(':')) {
            distinctiveFeatures.push(cleaned);
          }
          continue;
        }
        if (inColorsSection) {
          const cleaned = trimmed.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '');
          if (cleaned.length > 2 && !cleaned.endsWith(':')) {
            colorPalette.push(cleaned);
          }
          continue;
        }
        
        // Parse key-value pairs
        const kvMatch = trimmed.match(/^(hair\s*color|hair\s*style|hair\s*length|eye\s*color|eye\s*shape|skin\s*tone|facial\s*structure|height|build|posture|clothing\s*style):\s*(.+)/i);
        if (kvMatch) {
          const key = kvMatch[1].toLowerCase().replace(/\s+/g, '_');
          const value = kvMatch[2].trim();
          
          if (key.includes('hair_color')) result.hair_color = value;
          else if (key.includes('hair_style')) result.hair_style = value;
          else if (key.includes('hair_length')) result.hair_length = value;
          else if (key.includes('eye_color')) result.eye_color = value;
          else if (key.includes('eye_shape')) result.eye_shape = value;
          else if (key.includes('skin_tone')) result.skin_tone = value;
          else if (key.includes('facial_structure')) result.facial_structure = value;
          else if (key === 'height') result.height = value;
          else if (key === 'build') result.build = value;
          else if (key === 'posture') result.posture = value;
          else if (key.includes('clothing_style')) result.clothing_style = value;
        }
      }
      
      if (distinctiveFeatures.length > 0) result.distinctive_features = distinctiveFeatures;
      if (colorPalette.length > 0) result.color_palette = colorPalette;
      
      // Check if we got any data
      if (Object.keys(result).length > 0) {
        console.log('Successfully parsed appearance from text:', result);
        return result;
      }
      
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
      console.error('Response was:', response);
    }
    
    console.warn('Could not parse any appearance data from response');
    return null;
  };

  const handleAddFeature = () => {
    if (newFeature.trim()) {
      const features = formData.visual_identity?.distinctive_features || [];
      updateFormData({
        visual_identity: {
          ...(formData.visual_identity || {}),
          distinctive_features: [...features, newFeature.trim()],
        } as Character['visual_identity'],
      });
      setNewFeature('');
    }
  };

  const handleRemoveFeature = (index: number) => {
    const features = formData.visual_identity?.distinctive_features || [];
    updateFormData({
      visual_identity: {
        ...(formData.visual_identity || {}),
        distinctive_features: features.filter((_, i) => i !== index),
      } as Character['visual_identity'],
    });
  };

  const handleAddColor = () => {
    if (newColor.trim()) {
      const colors = formData.visual_identity?.color_palette || [];
      updateFormData({
        visual_identity: {
          ...(formData.visual_identity || {}),
          color_palette: [...colors, newColor.trim()],
        } as Character['visual_identity'],
      });
      setNewColor('');
    }
  };

  const handleRemoveColor = (index: number) => {
    const colors = formData.visual_identity?.color_palette || [];
    updateFormData({
      visual_identity: {
        ...(formData.visual_identity || {}),
        color_palette: colors.filter((_, i) => i !== index),
      } as Character['visual_identity'],
    });
  };

  const handleInputChange = (field: keyof Character['visual_identity']) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    updateFormData({
      visual_identity: {
        ...(formData.visual_identity || {}),
        [field]: e.target.value,
      } as Character['visual_identity'],
    });
  };

  return (
    <WizardFormLayout
      title="Physical Appearance"
      description="Define how your character looks"
    >
      <div className="space-y-6">
        {/* LLM Generation Button */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">AI-Assisted Generation</h3>
              <p className="text-xs text-gray-500 mt-1">
                Generate a coherent appearance based on your character's role
              </p>
            </div>
            <Button
              onClick={handleGenerateAppearance}
              disabled={isLoading || !formData.role?.archetype || !llmConfigured}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {isLoading ? 'Generating...' : 'Generate Appearance'}
            </Button>
          </div>

          {/* Loading State */}
          {isLoading && (
            <LLMLoadingState message="Generating physical appearance..." showProgress />
          )}

          {/* Error Display */}
          {llmError && (
            <LLMErrorDisplay
              error={llmError}
              onRetry={handleGenerateAppearance}
              onDismiss={clearError}
            />
          )}
        </div>

        {/* Hair */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="hair-color">Hair Color</Label>
            <Input
              id="hair-color"
              value={formData.visual_identity?.hair_color || ''}
              onChange={handleInputChange('hair_color')}
              placeholder="e.g., Auburn"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hair-style">Hair Style</Label>
            <Input
              id="hair-style"
              value={formData.visual_identity?.hair_style || ''}
              onChange={handleInputChange('hair_style')}
              placeholder="e.g., Wavy"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hair-length">Hair Length</Label>
            <Input
              id="hair-length"
              value={formData.visual_identity?.hair_length || ''}
              onChange={handleInputChange('hair_length')}
              placeholder="e.g., Shoulder-length"
            />
          </div>
        </div>

        {/* Eyes */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="eye-color">Eye Color</Label>
            <Input
              id="eye-color"
              value={formData.visual_identity?.eye_color || ''}
              onChange={handleInputChange('eye_color')}
              placeholder="e.g., Hazel"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eye-shape">Eye Shape</Label>
            <Input
              id="eye-shape"
              value={formData.visual_identity?.eye_shape || ''}
              onChange={handleInputChange('eye_shape')}
              placeholder="e.g., Almond-shaped"
            />
          </div>
        </div>

        {/* Skin and Face */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="skin-tone">Skin Tone</Label>
            <Input
              id="skin-tone"
              value={formData.visual_identity?.skin_tone || ''}
              onChange={handleInputChange('skin_tone')}
              placeholder="e.g., Olive"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="facial-structure">Facial Structure</Label>
            <Input
              id="facial-structure"
              value={formData.visual_identity?.facial_structure || ''}
              onChange={handleInputChange('facial_structure')}
              placeholder="e.g., Angular"
            />
          </div>
        </div>

        {/* Build and Posture */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="height">Height</Label>
            <Input
              id="height"
              value={formData.visual_identity?.height || ''}
              onChange={handleInputChange('height')}
              placeholder="e.g., Tall"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="build">Build</Label>
            <Input
              id="build"
              value={formData.visual_identity?.build || ''}
              onChange={handleInputChange('build')}
              placeholder="e.g., Athletic"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="posture">Posture</Label>
            <Input
              id="posture"
              value={formData.visual_identity?.posture || ''}
              onChange={handleInputChange('posture')}
              placeholder="e.g., Confident"
            />
          </div>
        </div>

        {/* Clothing Style */}
        <div className="space-y-2">
          <Label htmlFor="clothing-style">Clothing Style</Label>
          <Textarea
            id="clothing-style"
            value={formData.visual_identity?.clothing_style || ''}
            onChange={handleInputChange('clothing_style')}
            placeholder="Describe their typical clothing and fashion sense"
            rows={2}
          />
        </div>

        {/* Distinctive Features */}
        <div className="space-y-2">
          <Label>Distinctive Features</Label>
          <div className="flex gap-2">
            <Input
              value={newFeature}
              onChange={(e) => setNewFeature(e.target.value)}
              placeholder="Add a distinctive feature"
              onKeyPress={(e) => e.key === 'Enter' && handleAddFeature()}
            />
            <Button onClick={handleAddFeature} variant="secondary" size="sm">
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.visual_identity?.distinctive_features?.map((feature, index) => (
              <Badge key={index} variant="secondary" className="gap-1">
                {feature}
                <button
                  onClick={() => handleRemoveFeature(index)}
                  className="ml-1 hover:text-destructive"
                  aria-label={`Remove ${feature}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Color Palette */}
        <div className="space-y-2">
          <Label>Color Palette</Label>
          <p className="text-sm text-muted-foreground">
            Colors associated with this character (clothing, accessories, etc.)
          </p>
          <div className="flex gap-2">
            <Input
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              placeholder="Add a color"
              onKeyPress={(e) => e.key === 'Enter' && handleAddColor()}
            />
            <Button onClick={handleAddColor} variant="secondary" size="sm">
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.visual_identity?.color_palette?.map((color, index) => (
              <Badge key={index} variant="secondary" className="gap-1">
                {color}
                <button
                  onClick={() => handleRemoveColor(index)}
                  className="ml-1 hover:text-destructive"
                  aria-label={`Remove ${color}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </WizardFormLayout>
  );
}
