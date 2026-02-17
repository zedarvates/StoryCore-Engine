import React, { useState } from 'react';
import { Image, Loader2, AlertCircle } from 'lucide-react';
import { ComfyUIService } from '@/services/comfyuiService';
import { useAppStore } from '@/stores/useAppStore';
import type { Character } from '@/types/character';
import './CharacterImageGenerator.css';

interface CharacterImageGeneratorProps {
  character: Partial<Character>;
  onImageGenerated?: (imageUrl: string) => void;
}

/**
 * CharacterImageGenerator Component
 * 
 * Generates a 512x512 character portrait image using ComfyUI
 * based on the character's visual identity and description.
 */
export function CharacterImageGenerator({
  character,
  onImageGenerated,
}: CharacterImageGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const comfyuiService = ComfyUIService.getInstance();
  const project = useAppStore((state) => state.project);

  // Get visual style from project
  const visualStyle = (project as any)?.visualStyle || (project as any)?.visual_style || 'realistic';

  /**
   * Build a detailed prompt from character data
   */
  const buildCharacterPrompt = (): string => {
    const parts: string[] = [];

    // Add visual style first
    const styleMap: Record<string, string> = {
      'photorealistic': 'photorealistic',
      'cinematic': 'cinematic',
      'anime': 'anime style',
      'cartoon': 'cartoon style',
      'sketch': 'sketch art',
      'oil-painting': 'oil painting',
      'watercolor': 'watercolor painting',
      'digital-art': 'digital art',
      'comic-book': 'comic book style',
      'noir': 'film noir style',
      'vintage': 'vintage style',
      'modern': 'modern style',
      'minimalist': 'minimalist style',
      'realistic': 'realistic'
    };

    const stylePrefix = styleMap[visualStyle] || visualStyle;
    parts.push(stylePrefix);

    // Basic description
    if (character.name) {
      parts.push(`Portrait of ${character.name}`);
    } else {
      parts.push('Character portrait');
    }

    // Visual identity details
    const visual = character.visual_identity;
    if (visual) {
      // Face and hair
      if (visual.hair_color && visual.hair_style) {
        parts.push(`${visual.hair_color} ${visual.hair_style} hair`);
      } else if (visual.hair_color) {
        parts.push(`${visual.hair_color} hair`);
      }

      if (visual.eye_color) {
        parts.push(`${visual.eye_color} eyes`);
      }

      if (visual.facial_structure) {
        parts.push(`${visual.facial_structure} face`);
      }

      // Skin and build
      if (visual.skin_tone) {
        parts.push(`${visual.skin_tone} skin`);
      }

      if (visual.build) {
        parts.push(`${visual.build} build`);
      }

      // Clothing
      if (visual.clothing_style) {
        parts.push(`wearing ${visual.clothing_style} clothing`);
      }

      // Distinctive features
      if (visual.distinctive_features && visual.distinctive_features.length > 0) {
        parts.push(visual.distinctive_features.join(', '));
      }
    }

    // Add quality tags from user requirements
    parts.push(
      'Cinematic view',
      'photorealist',
      'high skin details',
      '8K',
      'highly detailed',
      'professional portrait',
      'centered composition',
      'sharp focus',
      'depth of field'
    );

    return parts.join(', ');
  };

  /**
   * Build negative prompt to avoid unwanted elements
   */
  const buildNegativePrompt = (): string => {
    return [
      'blurry',
      'low quality',
      'distorted',
      'deformed',
      'ugly',
      'bad anatomy',
      'watermark',
      'text',
      'signature',
      'multiple people',
      'full body',
      'background clutter',
    ].join(', ');
  };

  /**
   * Handle image generation
   */
  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const prompt = buildCharacterPrompt();
      const negativePrompt = buildNegativePrompt();

      console.log('Generating character image with prompt:', prompt);

      // Flux Turbo parameters (Z-Image Turbo workflow)
      const imageUrl = await comfyuiService.generateImage({
        prompt,
        negativePrompt,
        width: 784,
        height: 1024,
        steps: 4,
        cfgScale: 1.0,
        seed: Math.floor(Math.random() * 1000000),
        model: 'z_image_turbo_bf16.safetensors', // Not used in Flux Turbo workflow
        sampler: 'res_multistep',
        scheduler: 'simple',
      });

      setGeneratedImage(imageUrl);

      if (onImageGenerated) {
        onImageGenerated(imageUrl);
      }
    } catch (err) {
      console.error('Failed to generate character image:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="character-image-generator">
      <div className="character-image-generator__header">
        <h4 className="character-image-generator__title">
          <Image size={18} />
          Character Portrait
        </h4>
        <p className="character-image-generator__description">
          Generate a 512x512 portrait image based on character appearance
        </p>
      </div>

      {/* Preview area */}
      <div className="character-image-generator__preview">
        {generatedImage ? (
          <img
            src={generatedImage}
            alt={`Portrait of ${character.name || 'character'}`}
            className="character-image-generator__image"
          />
        ) : (
          <div className="character-image-generator__placeholder">
            <Image size={48} />
            <p>No image generated yet</p>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="character-image-generator__error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Generate button */}
      <button
        className="character-image-generator__button"
        onClick={handleGenerate}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <>
            <Loader2 size={18} className="character-image-generator__spinner" />
            Generating...
          </>
        ) : (
          <>
            <Image size={18} />
            Generate Portrait
          </>
        )}
      </button>

      {/* Info text */}
      <p className="character-image-generator__info">
        The image will be generated using ComfyUI based on the character's appearance details.
        Make sure ComfyUI is running and configured.
      </p>
    </div>
  );
}
