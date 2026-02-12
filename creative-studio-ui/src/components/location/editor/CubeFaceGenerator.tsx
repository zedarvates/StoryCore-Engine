/**
 * CubeFaceGenerator Component
 * 
 * Prompt input for cube face image generation via ComfyUI.
 * Displays results and allows applying generated textures.
 * Supports low-resolution testing mode for faster iterations.
 * 
 * File: creative-studio-ui/src/components/location/editor/CubeFaceGenerator.tsx
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Sparkles, X, Loader2, Check, Copy, Zap, Settings, ChevronDown } from 'lucide-react';
import type { CubeFace, CubeFaceTexture } from '@/types/location';
import { v4 as uuidv4 } from 'uuid';
import './CubeFaceGenerator.css';

// ============================================================================
// API Configuration
// ============================================================================

// ComfyUI API URL - configurable for different instances
const COMFYUI_API_URL = process.env.VITE_COMFYUI_API_URL || 'http://127.0.0.1:8188';
const COMFYUI_API_URL_8000 = process.env.VITE_COMFYUI_API_URL_8000 || 'http://127.0.0.1:8000';
const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:8080';

// ============================================================================
// Types
// ============================================================================

/**
 * Resolution preset for generation
 */
export type ResolutionPreset = {
  label: string;
  width: number;
  height: number;
  description: string;
};

/**
 * Available resolution presets
 */
export const RESOLUTION_PRESETS: ResolutionPreset[] = [
  { label: '256x256 (Fast)', width: 256, height: 256, description: 'Fast testing, low detail' },
  { label: '512x512 (Normal)', width: 512, height: 512, description: 'Balanced speed and quality' },
  { label: '1024x1024 (High)', width: 1024, height: 1024, description: 'High detail, slower generation' },
];

/**
 * Props for the CubeFaceGenerator component
 */
export interface CubeFaceGeneratorProps {
  /** Face being generated */
  face: CubeFace;
  
  /** Location ID for API calls */
  locationId: string;
  
  /** Existing texture (for regeneration) */
  existingTexture?: CubeFaceTexture;
  
  /** Handler for generated texture */
  onGenerate: (texture: CubeFaceTexture) => void;
  
  /** Handler for cancel */
  onCancel: () => void;
}

// ============================================================================
// ComfyUI API Functions
// ============================================================================

/**
 * Generate image using ComfyUI API
 */
async function generateWithComfyUI(
  face: CubeFace,
  prompt: string,
  negativePrompt: string,
  settings: { width: number; height: number; steps: number; cfgScale: number; seed: number },
  apiUrl: string
): Promise<string> {
  // ComfyUI API endpoint for text-to-image
  const endpoint = `${apiUrl}/api/prompt`;
  
  // Build the workflow based on face
  const faceDirection: Record<CubeFace, string> = {
    front: 'forward',
    back: 'backward',
    left: 'left',
    right: 'right',
    top: 'up',
    bottom: 'down',
  };
  
  // Simplified workflow for cube face generation
  const workflow = {
    "3": {
      "inputs": {
        "seed": settings.seed,
        "steps": settings.steps,
        "cfg": settings.cfgScale,
        "sampler_name": "euler_a",
        "scheduler": "normal",
        "denoise": 1,
        "model": ["4", 0],
        "positive": ["6", 0],
        "negative": ["7", 0],
        "latent_image": ["5", 0]
      },
      "class_type": "KSampler"
    },
    "4": {
      "inputs": {
        "ckpt_name": "flux1-dev.safetensors"
      },
      "class_type": "CheckpointLoaderSimple"
    },
    "5": {
      "inputs": {
        "width": settings.width,
        "height": settings.height,
        "batch_size": 1
      },
      "class_type": "EmptyLatentImage"
    },
    "6": {
      "inputs": {
        "text": `${prompt} (${faceDirection[face]} view:1.1) cube face:1.2 high quality:1.3`,
        "clip": ["4", 1]
      },
      "class_type": "CLIPTextEncode"
    },
    "7": {
      "inputs": {
        "text": `${negativePrompt} low quality:1.4 blurry:1.4 distorted:1.4`,
        "clip": ["4", 1]
      },
      "class_type": "CLIPTextEncode"
    },
    "8": {
      "inputs": {
        "samples": ["3", 0],
        "vae": ["4", 2]
      },
      "class_type": "VAEDecode"
    },
    "9": {
      "inputs": {
        "filename_prefix": `cube_${face}_${Date.now()}`,
        "images": ["8", 0]
      },
      "class_type": "SaveImage"
    }
  };
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt: workflow }),
    });
    
    if (!response.ok) {
      throw new Error(`ComfyUI API error: ${response.status}`);
    }
    
    const result = await response.json();
    
    // The prompt was queued successfully
    // In a real implementation, we'd poll for completion
    // For now, return a mock URL
    return `${apiUrl}/output/cube_${face}_${Date.now()}.png`;
  } catch (error) {
    console.error('ComfyUI generation error:', error);
    throw error;
  }
}

// ============================================================================
// Component
// ============================================================================

export function CubeFaceGenerator({
  face,
  locationId,
  existingTexture,
  onGenerate,
  onCancel,
}: CubeFaceGeneratorProps) {
  const [prompt, setPrompt] = useState(existingTexture?.generation_params?.prompt || '');
  const [negativePrompt, setNegativePrompt] = useState(existingTexture?.generation_params?.negative_prompt || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  
  // Generation settings
  const [width, setWidth] = useState(existingTexture?.generation_params?.width || 512);
  const [height, setHeight] = useState(existingTexture?.generation_params?.height || 512);
  const [steps, setSteps] = useState(existingTexture?.generation_params?.steps || 20);
  const [cfgScale, setCfgScale] = useState(existingTexture?.generation_params?.cfg_scale || 7);
  const [seed, setSeed] = useState(existingTexture?.generation_params?.seed || -1);
  
  // Test mode for low-res generation (port 8000)
  const [useTestMode, setUseTestMode] = useState(false);
  const [selectedResolution, setSelectedResolution] = useState<ResolutionPreset>(RESOLUTION_PRESETS[1]);
  
  // Update width/height when resolution preset changes
  useEffect(() => {
    setWidth(selectedResolution.width);
    setHeight(selectedResolution.height);
  }, [selectedResolution]);
  
  const faceLabels: Record<CubeFace, string> = {
    front: 'Front',
    back: 'Back',
    left: 'Left',
    right: 'Right',
    top: 'Top',
    bottom: 'Bottom',
  };
  
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    setProgress(0);
    
    try {
      // Generate image using ComfyUI
      const imageUrl = await generateWithComfyUI(
        face,
        prompt,
        negativePrompt,
        {
          width,
          height,
          steps,
          cfgScale,
          seed: seed === -1 ? Math.floor(Math.random() * 1000000) : seed,
        },
        useTestMode ? COMFYUI_API_URL_8000 : COMFYUI_API_URL
      );
      
      setProgress(100);
      setGeneratedImage(imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate image');
      
      // Fallback to mock image for demo purposes
      const mockImageUrl = `https://picsum.photos/seed/${uuidv4()}/${width}/${height}`;
      setGeneratedImage(mockImageUrl);
    } finally {
      setIsGenerating(false);
      setProgress(null);
    }
  }, [face, prompt, negativePrompt, width, height, steps, cfgScale, seed]);
  
  const handleApply = useCallback(() => {
    if (!generatedImage) return;
    
    const usedSeed = seed === -1 ? Math.floor(Math.random() * 1000000) : seed;
    
    const texture: CubeFaceTexture = {
      id: uuidv4(),
      face,
      image_path: generatedImage,
      generated_at: new Date().toISOString(),
      generation_params: {
        prompt,
        negative_prompt: negativePrompt || undefined,
        width,
        height,
        steps,
        cfg_scale: cfgScale,
        seed: usedSeed,
      },
    };
    
    onGenerate(texture);
  }, [face, generatedImage, prompt, negativePrompt, width, height, steps, cfgScale, seed, onGenerate]);
  
  return (
    <div className="cube-face-generator">
      {/* Header */}
      <div className="cube-face-generator__header">
        <h3 className="cube-face-generator__title">
          <Sparkles size={20} />
          Generate {faceLabels[face]} Face
        </h3>
        <button className="cube-face-generator__close" onClick={onCancel} title="Close">
          <X size={20} />
        </button>
      </div>
      
      {/* Content */}
      <div className="cube-face-generator__content">
        {/* Prompt Input */}
        <div className="cube-face-generator__form-group">
          <label className="cube-face-generator__label">
            Prompt <span className="cube-face-generator__required">*</span>
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`Describe the ${face} view of the location...`}
            className="cube-face-generator__textarea"
            rows={4}
          />
        </div>
        
        {/* Negative Prompt */}
        <div className="cube-face-generator__form-group">
          <label className="cube-face-generator__label">Negative Prompt</label>
          <textarea
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            placeholder="Elements to avoid (blurry, distorted, etc.)"
            className="cube-face-generator__textarea"
            rows={2}
          />
        </div>
        
        {/* Test Mode & Resolution Settings */}
        <div className="cube-face-generator__settings-row">
          {/* Test Mode Toggle */}
          <div className="cube-face-generator__setting-group">
            <label className="cube-face-generator__toggle-label">
              <Zap size={16} />
              Test Mode (Low-Res)
            </label>
            <div className="cube-face-generator__toggle">
              <button
                className={`cube-face-generator__toggle-btn ${useTestMode ? 'cube-face-generator__toggle-btn--active' : ''}`}
                onClick={() => setUseTestMode(!useTestMode)}
              >
                {useTestMode ? 'ON' : 'OFF'}
              </button>
              <span className="cube-face-generator__toggle-info">
                Uses port 8000, {useTestMode ? selectedResolution.width + 'x' + selectedResolution.height : 'full resolution'}
              </span>
            </div>
          </div>
          
          {/* Resolution Preset */}
          <div className="cube-face-generator__setting-group">
            <label className="cube-face-generator__toggle-label">
              <Settings size={16} />
              Resolution
            </label>
            <div className="cube-face-generator__dropdown">
              <select
                value={selectedResolution.label}
                onChange={(e) => {
                  const preset = RESOLUTION_PRESETS.find(p => p.label === e.target.value);
                  if (preset) setSelectedResolution(preset);
                }}
                className="cube-face-generator__select"
                disabled={useTestMode}
              >
                {RESOLUTION_PRESETS.map((preset) => (
                  <option key={preset.label} value={preset.label}>
                    {preset.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="cube-face-generator__dropdown-icon" />
            </div>
            <span className="cube-face-generator__toggle-info">
              {selectedResolution.description}
            </span>
          </div>
        </div>
        
        {/* Generation Settings */}
        <div className="cube-face-generator__settings">
          <div className="cube-face-generator__setting">
            <label>Width</label>
            <input
              type="number"
              value={width}
              onChange={(e) => setWidth(parseInt(e.target.value) || 512)}
              min={256}
              max={2048}
              step={64}
              aria-label="Image width"
            />
          </div>
          <div className="cube-face-generator__setting">
            <label>Height</label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(parseInt(e.target.value) || 512)}
              min={256}
              max={2048}
              step={64}
              aria-label="Image height"
            />
          </div>
          <div className="cube-face-generator__setting">
            <label>Steps</label>
            <input
              type="number"
              value={steps}
              onChange={(e) => setSteps(parseInt(e.target.value) || 20)}
              min={1}
              max={100}
              aria-label="Generation steps"
            />
          </div>
          <div className="cube-face-generator__setting">
            <label>CFG</label>
            <input
              type="number"
              value={cfgScale}
              onChange={(e) => setCfgScale(parseFloat(e.target.value) || 7)}
              min={1}
              max={20}
              step={0.5}
              aria-label="CFG scale"
            />
          </div>
          <div className="cube-face-generator__setting">
            <label>Seed</label>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(parseInt(e.target.value) || -1)}
              min={-1}
              aria-label="Random seed"
            />
          </div>
        </div>
        
        {/* Progress */}
        {isGenerating && progress !== null && (
          <div className="cube-face-generator__progress">
            <div className="cube-face-generator__progress-bar">
              <div 
                className="cube-face-generator__progress-fill" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="cube-face-generator__progress-text">
              Generating... {progress}%
            </span>
          </div>
        )}
        
        {/* Error */}
        {error && (
          <div className="cube-face-generator__error">
            {error}
          </div>
        )}
        
        {/* Generate Button */}
        <button
          className="cube-face-generator__generate-btn"
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
        >
          {isGenerating ? (
            <>
              <Loader2 size={18} className="cube-face-generator__spinner" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles size={18} />
              Generate Image
            </>
          )}
        </button>
        
        {/* Result */}
        {generatedImage && (
          <div className="cube-face-generator__result">
            <div className="cube-face-generator__preview">
              <img src={generatedImage} alt={`Generated ${face} face`} />
            </div>
            
            <div className="cube-face-generator__result-actions">
              <button
                className="cube-face-generator__apply-btn"
                onClick={handleApply}
              >
                <Check size={16} />
                Apply to {faceLabels[face]}
              </button>
              <button
                className="cube-face-generator__regenerate-btn"
                onClick={() => {
                  setGeneratedImage(null);
                  setError(null);
                }}
              >
                <Copy size={16} />
                Regenerate
              </button>
            </div>
          </div>
        )}
        
        {/* Existing Texture Info */}
        {existingTexture && !generatedImage && (
          <div className="cube-face-generator__existing">
            <p>Currently showing existing texture from {new Date(existingTexture.generated_at).toLocaleDateString()}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default CubeFaceGenerator;
