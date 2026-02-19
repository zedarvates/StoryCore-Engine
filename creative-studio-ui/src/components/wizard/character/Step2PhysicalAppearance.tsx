import React, { useState } from 'react';
import { useWizard } from '@/contexts/WizardContext';
import { WizardFormLayout, FormField } from '../WizardFormLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, X, Zap, Scissors, Eye, User, Palette, Microscope, Activity } from 'lucide-react';
import { useLLMGeneration } from '@/hooks/useLLMGeneration';
import { LLMErrorDisplay, LLMLoadingState } from '../LLMErrorDisplay';
import { ServiceWarning, useServiceStatus } from '@/components/ui/service-warning';
import { useAppStore } from '@/stores/useAppStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  HAIR_COLORS,
  EYE_COLORS,
  SKIN_TONES,
  BODY_BUILDS,
  HEIGHT_CATEGORIES,
  POSTURE_OPTIONS,
} from '@/constants/characterOptions';
import { cn } from '@/lib/utils';
import type { Character } from '@/types/character';
import type { World } from '@/types/world';
import type { StoryContext } from './CharacterWizard';

// ============================================================================
// Step 2: Morphological Profile (Physical Appearance)
// ============================================================================

interface Step2PhysicalAppearanceProps {
  worldContext?: World;
  storyContext?: StoryContext;
}

export function Step2PhysicalAppearance({ worldContext }: Step2PhysicalAppearanceProps) {
  const { formData, updateFormData } = useWizard<Character>();
  const [newFeature, setNewFeature] = useState('');
  const [newColor, setNewColor] = useState('');
  const setShowLLMSettings = useAppStore((state) => state.setShowLLMSettings);

  // Use ref to always have access to latest formData and updateFormData in callbacks
  const formDataRef = React.useRef(formData);
  const updateFormDataRef = React.useRef(updateFormData);
  formDataRef.current = formData;
  updateFormDataRef.current = updateFormData;

  // Check if LLM service is configured
  const { llmConfigured, llmChecking } = useServiceStatus();

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
        const currentVisualIdentity = formDataRef.current.visual_identity || {};
        updateFormDataRef.current({
          visual_identity: {
            ...currentVisualIdentity,
            ...appearance,
          } as Character['visual_identity'],
        });
      }
    },
  });

  const handleGenerateAppearance = async () => {
    clearError();

    const uniqueEntropy = {
      timestamp: Date.now(),
      randomId: Math.random().toString(36).substring(2, 10),
      sessionSeed: Math.floor(Math.random() * 1000000),
    };

    const context = {
      characterName: formData.name || 'the character',
      archetype: formData.role?.archetype || 'character',
      ageRange: formData.visual_identity?.age_range || 'adult',
      gender: formData.visual_identity?.gender || 'unspecified',
      worldGenre: worldContext?.genre?.join(', ') || 'fantasy',
      worldTone: worldContext?.tone?.join(', ') || 'dramatic',
      entropy: uniqueEntropy,
    };

    const systemPrompt = 'You are a character design expert. Create detailed, coherent physical appearances that match the character\'s role and world setting.';

    const prompt = `Generate a detailed physical appearance for a character:
- Identity: ${context.characterName}
- Archetype: ${context.archetype}
- Maturity: ${context.ageRange}
- Matrix: ${context.gender}
- Genre: ${context.worldGenre}
- Tone: ${context.worldTone}
- Entropy: ${uniqueEntropy.sessionSeed}

Format as JSON with keys: hair_color, hair_style, hair_length, eye_color, eye_shape, skin_tone, facial_structure, height, build, posture, clothing_style, distinctive_features (array), color_palette (array)`;

    await generate({
      prompt,
      systemPrompt,
      temperature: 0.8,
      maxTokens: 800,
    });
  };

  const parseLLMAppearance = (response: string): Partial<Character['visual_identity']> | null => {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const result: Partial<Character['visual_identity']> = {};
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
        return result;
      }
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
    }
    return null;
  };

  const updateVisualIdentity = (updates: Partial<Character['visual_identity']>) => {
    updateFormData({
      visual_identity: {
        ...(formData.visual_identity || {}),
        ...updates,
      } as Character['visual_identity']
    });
  };

  const handleAddFeature = () => {
    if (newFeature.trim()) {
      const features = formData.visual_identity?.distinctive_features || [];
      updateVisualIdentity({ distinctive_features: [...features, newFeature.trim()] });
      setNewFeature('');
    }
  };

  const handleRemoveFeature = (index: number) => {
    const features = formData.visual_identity?.distinctive_features || [];
    updateVisualIdentity({ distinctive_features: features.filter((_, i) => i !== index) });
  };

  const handleAddColor = () => {
    if (newColor.trim()) {
      const colors = formData.visual_identity?.color_palette || [];
      updateVisualIdentity({ color_palette: [...colors, newColor.trim()] });
      setNewColor('');
    }
  };

  const handleRemoveColor = (index: number) => {
    const colors = formData.visual_identity?.color_palette || [];
    updateVisualIdentity({ color_palette: colors.filter((_, i) => i !== index) });
  };

  return (
    <WizardFormLayout
      title="Morphological Profile"
      description="Synthesize the visual parameters and structural aesthetics of the entity"
    >
      {/* AI Assistance Section */}
      <div className="space-y-4 mb-8 p-4 rounded-lg border border-primary/20 bg-primary/5 backdrop-blur-sm shadow-[inset_0_0_10px_rgba(var(--primary-rgb),0.05)]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-primary neon-text uppercase tracking-widest text-[10px] font-mono mb-1">// Morph Synthesizer</h3>
            <p className="text-[10px] text-primary/60 uppercase tracking-wider">
              Synthesize a coherent visual profile from core identity datasets
            </p>
          </div>
          <Button
            onClick={handleGenerateAppearance}
            disabled={isLoading || llmChecking || !formData.role?.archetype || !llmConfigured}
            className="gap-2 btn-neon bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
            size="sm"
          >
            <Microscope className="h-3.5 w-3.5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Synthesize Profile</span>
          </Button>
        </div>

        {!llmChecking && !llmConfigured && (
          <ServiceWarning
            service="llm"
            variant="inline"
            onConfigure={() => setShowLLMSettings(true)}
            className="bg-red-500/10 border-red-500/20 text-red-400"
          />
        )}

        {isLoading && (
          <LLMLoadingState message="Mapping morphological data..." showProgress />
        )}

        {llmError && (
          <LLMErrorDisplay
            error={llmError}
            onRetry={handleGenerateAppearance}
            onDismiss={clearError}
          />
        )}
      </div>

      <div className="space-y-10">
        {/* Follicular and Ocular Assets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Follicular Matrix */}
          <div className="space-y-6 p-4 border border-primary/10 bg-primary/20 relative group">
            <div className="absolute -top-3 left-3 bg-[#050b10] px-2 py-0.5 border border-primary/20">
              <span className="text-[9px] font-black text-primary uppercase tracking-widest font-mono">Follicular Assets</span>
            </div>

            <div className="grid grid-cols-1 gap-4 mt-2">
              <FormField label="Follicular Chroma" name="hair_color">
                <Select
                  value={HAIR_COLORS.includes(formData.visual_identity?.hair_color as any) ? formData.visual_identity?.hair_color : (formData.visual_identity?.hair_color ? 'Other' : '')}
                  onValueChange={(val) => updateVisualIdentity({ hair_color: val === 'Other' ? '' : val })}
                >
                  <SelectTrigger className="bg-primary/5 border-primary/20">
                    <SelectValue placeholder="Select chroma" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#050b10] border-primary/30">
                    {HAIR_COLORS.map(color => (
                      <SelectItem key={color} value={color} className="focus:bg-primary/20 focus:text-primary uppercase text-[10px] font-mono">{color}</SelectItem>
                    ))}
                    <SelectItem value="Other" className="focus:bg-primary/20 focus:text-primary uppercase text-[10px] font-mono border-t border-primary/10 mt-1 pt-1 font-bold">Custom Signature</SelectItem>
                  </SelectContent>
                </Select>
                {(!HAIR_COLORS.includes(formData.visual_identity?.hair_color as any) && formData.visual_identity?.hair_color || formData.visual_identity?.hair_color === '') && (
                  <Input
                    value={formData.visual_identity?.hair_color || ''}
                    onChange={(e) => updateVisualIdentity({ hair_color: e.target.value })}
                    placeholder="MANUAL_OVERRIDE_CHROMA..."
                    className="mt-2 text-[10px]"
                  />
                )}
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Fiber Configuration" name="hair_style">
                  <Input
                    value={formData.visual_identity?.hair_style || ''}
                    onChange={(e) => updateVisualIdentity({ hair_style: e.target.value })}
                    placeholder="Configuration..."
                    className="bg-primary/5 border-primary/20"
                  />
                </FormField>
                <FormField label="Linear Extension" name="hair_length">
                  <Input
                    value={formData.visual_identity?.hair_length || ''}
                    onChange={(e) => updateVisualIdentity({ hair_length: e.target.value })}
                    placeholder="Extension..."
                    className="bg-primary/5 border-primary/20"
                  />
                </FormField>
              </div>
            </div>
          </div>

          {/* Ocular Matrix */}
          <div className="space-y-6 p-4 border border-primary/10 bg-primary/20 relative group">
            <div className="absolute -top-3 left-3 bg-[#050b10] px-2 py-0.5 border border-primary/20">
              <span className="text-[9px] font-black text-primary uppercase tracking-widest font-mono">Ocular Matrix</span>
            </div>

            <div className="grid grid-cols-1 gap-4 mt-2">
              <FormField label="Ocular Hue" name="eye_color">
                <Select
                  value={EYE_COLORS.includes(formData.visual_identity?.eye_color as any) ? formData.visual_identity?.eye_color : (formData.visual_identity?.eye_color ? 'Other' : '')}
                  onValueChange={(val) => updateVisualIdentity({ eye_color: val === 'Other' ? '' : val })}
                >
                  <SelectTrigger className="bg-primary/5 border-primary/20">
                    <SelectValue placeholder="Select hue" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#050b10] border-primary/30">
                    {EYE_COLORS.map(color => (
                      <SelectItem key={color} value={color} className="focus:bg-primary/20 focus:text-primary uppercase text-[10px] font-mono">{color}</SelectItem>
                    ))}
                    <SelectItem value="Other" className="focus:bg-primary/20 focus:text-primary uppercase text-[10px] font-mono border-t border-primary/10 mt-1 pt-1 font-bold">Custom Hue</SelectItem>
                  </SelectContent>
                </Select>
                {(!EYE_COLORS.includes(formData.visual_identity?.eye_color as any) && formData.visual_identity?.eye_color || formData.visual_identity?.eye_color === '') && (
                  <Input
                    value={formData.visual_identity?.eye_color || ''}
                    onChange={(e) => updateVisualIdentity({ eye_color: e.target.value })}
                    placeholder="MANUAL_OVERRIDE_HUE..."
                    className="mt-2 text-[10px]"
                  />
                )}
              </FormField>

              <FormField label="Orbital Geometry" name="eye_shape">
                <Input
                  value={formData.visual_identity?.eye_shape || ''}
                  onChange={(e) => updateVisualIdentity({ eye_shape: e.target.value })}
                  placeholder="Geometric Profile..."
                  className="bg-primary/5 border-primary/20"
                />
              </FormField>
            </div>
          </div>
        </div>

        {/* Structural Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField label="Vertical Amplitude" name="height">
            <Select
              value={HEIGHT_CATEGORIES.includes(formData.visual_identity?.height as any) ? formData.visual_identity?.height : (formData.visual_identity?.height ? 'Other' : '')}
              onValueChange={(val) => updateVisualIdentity({ height: val === 'Other' ? '' : val })}
            >
              <SelectTrigger className="bg-primary/5 border-primary/20">
                <SelectValue placeholder="Select scale" />
              </SelectTrigger>
              <SelectContent className="bg-[#050b10] border-primary/30">
                {HEIGHT_CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat} className="focus:bg-primary/20 focus:text-primary uppercase text-[10px] font-mono">{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Structural Mass" name="build">
            <Select
              value={BODY_BUILDS.includes(formData.visual_identity?.build as any) ? formData.visual_identity?.build : (formData.visual_identity?.build ? 'Other' : '')}
              onValueChange={(val) => updateVisualIdentity({ build: val === 'Other' ? '' : val })}
            >
              <SelectTrigger className="bg-primary/5 border-primary/20">
                <SelectValue placeholder="Select build" />
              </SelectTrigger>
              <SelectContent className="bg-[#050b10] border-primary/30">
                {BODY_BUILDS.map(build => (
                  <SelectItem key={build} value={build} className="focus:bg-primary/20 focus:text-primary uppercase text-[10px] font-mono">{build}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Kinetic Alignment" name="posture">
            <Select
              value={POSTURE_OPTIONS.includes(formData.visual_identity?.posture as any) ? formData.visual_identity?.posture : (formData.visual_identity?.posture ? 'Other' : '')}
              onValueChange={(val) => updateVisualIdentity({ posture: val === 'Other' ? '' : val })}
            >
              <SelectTrigger className="bg-primary/5 border-primary/20">
                <SelectValue placeholder="Select posture" />
              </SelectTrigger>
              <SelectContent className="bg-[#050b10] border-primary/30">
                {POSTURE_OPTIONS.map(opt => (
                  <SelectItem key={opt} value={opt} className="focus:bg-primary/20 focus:text-primary uppercase text-[10px] font-mono">{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>

        {/* Dermal and Cranial */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FormField label="Dermal Surface Hue" name="skin_tone">
            <Select
              value={SKIN_TONES.includes(formData.visual_identity?.skin_tone as any) ? formData.visual_identity?.skin_tone : (formData.visual_identity?.skin_tone ? 'Other' : '')}
              onValueChange={(val) => updateVisualIdentity({ skin_tone: val === 'Other' ? '' : val })}
            >
              <SelectTrigger className="bg-primary/5 border-primary/20">
                <SelectValue placeholder="Select hue" />
              </SelectTrigger>
              <SelectContent className="bg-[#050b10] border-primary/30">
                {SKIN_TONES.map(tone => (
                  <SelectItem key={tone} value={tone} className="focus:bg-primary/20 focus:text-primary uppercase text-[10px] font-mono">{tone}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Cranial Topology" name="facial_structure">
            <Input
              value={formData.visual_identity?.facial_structure || ''}
              onChange={(e) => updateVisualIdentity({ facial_structure: e.target.value })}
              placeholder="Facial Geometric Profile..."
              className="bg-primary/5 border-primary/20"
            />
          </FormField>
        </div>

        {/* Aesthetic Protocol */}
        <FormField label="Aesthetic Protocol (Clothing)" name="clothing_style">
          <div className="relative group">
            <Zap className="absolute left-3 top-3 h-5 w-5 text-primary/40 group-focus-within:text-primary transition-colors" />
            <Textarea
              value={formData.visual_identity?.clothing_style || ''}
              onChange={(e) => updateVisualIdentity({ clothing_style: e.target.value })}
              placeholder="Describe the aesthetic layer and functional attire..."
              rows={3}
              className="pl-10 bg-primary/5 border-primary/20"
            />
          </div>
        </FormField>

        {/* Anomalous Signatures */}
        <div className="space-y-4 p-4 border border-primary/20 bg-primary/5">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Anomalous Signatures</span>
          </div>

          <div className="flex gap-2">
            <Input
              value={newFeature}
              onChange={(e) => setNewFeature(e.target.value)}
              placeholder="Record anomalous feature..."
              onKeyPress={(e) => e.key === 'Enter' && handleAddFeature()}
              className="bg-primary/5 border-primary/20"
            />
            <Button onClick={handleAddFeature} className="btn-neon bg-primary/20 text-primary border-primary/20 px-4">
              <span className="text-[10px] font-black uppercase tracking-widest">Inject</span>
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {formData.visual_identity?.distinctive_features?.map((feature, index) => (
              <Badge key={index} variant="outline" className="bg-primary/10 border-primary/30 text-primary px-2 py-1 rounded-none group hover:border-red-500/50 transition-colors">
                <span className="text-[9px] font-mono uppercase tracking-wider">{feature}</span>
                <button
                  onClick={() => handleRemoveFeature(index)}
                  className="ml-2 text-primary/40 hover:text-red-500 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Spectral Signature */}
        <div className="space-y-4 p-4 border border-primary/20 bg-primary/5">
          <div className="flex items-center gap-2 mb-2">
            <Palette className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Spectral Signature (Colors)</span>
          </div>

          <div className="flex gap-2">
            <Input
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              placeholder="Record chroma signature..."
              onKeyPress={(e) => e.key === 'Enter' && handleAddColor()}
              className="bg-primary/5 border-primary/20"
            />
            <Button onClick={handleAddColor} className="btn-neon bg-primary/20 text-primary border-primary/20 px-4">
              <span className="text-[10px] font-black uppercase tracking-widest">Inject</span>
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {formData.visual_identity?.color_palette?.map((color, index) => (
              <Badge key={index} variant="outline" className="bg-primary/10 border-primary/30 text-primary px-2 py-1 rounded-none group hover:border-red-500/50 transition-colors">
                <span className="text-[9px] font-mono uppercase tracking-wider">{color}</span>
                <button
                  onClick={() => handleRemoveColor(index)}
                  className="ml-2 text-primary/40 hover:text-red-500 transition-colors"
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
