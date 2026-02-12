/**
 * PromptStyleTransfer
 * Component for configuring prompt-based style transfer
 */

import React, { useCallback, useState, useEffect } from 'react';
import { PromptStyleTransferProps, StylePresetName, STYLE_PRESETS } from '../../types/styleTransfer';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Slider } from '../../components/ui/slider';
import { Textarea } from '../../components/ui/textarea';
import { Upload, Image as ImageIcon, Type, Settings2, X, Sparkles, Palette } from 'lucide-react';
import { cn } from '../../lib/utils';

export const PromptStyleTransfer: React.FC<PromptStyleTransferProps> = ({
  config,
  onConfigChange,
  sourceFile,
  onSourceFileChange,
  selectedPreset,
  onPresetChange,
  customPrompt,
  onCustomPromptChange
}) => {
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'preset' | 'custom'>(
    selectedPreset ? 'preset' : 'custom'
  );

  // Update config when preset changes
  useEffect(() => {
    if (selectedPreset && STYLE_PRESETS[selectedPreset]) {
      const preset = STYLE_PRESETS[selectedPreset];
      onConfigChange({
        ...config,
        prompt: preset.prompt
      });
    }
  }, [selectedPreset]);

  // Update config when custom prompt changes
  useEffect(() => {
    if (activeTab === 'custom' && customPrompt) {
      onConfigChange({
        ...config,
        prompt: customPrompt
      });
    }
  }, [customPrompt, activeTab]);

  const handleSourceFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSourceFileChange(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSourcePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [onSourceFileChange]);

  const clearSourceFile = useCallback(() => {
    onSourceFileChange(undefined as any);
    setSourcePreview(null);
  }, [onSourceFileChange]);

  const updateConfig = useCallback((updates: Partial<typeof config>) => {
    onConfigChange({ ...config, ...updates });
  }, [config, onConfigChange]);

  const handlePresetSelect = useCallback((preset: StylePresetName) => {
    onPresetChange(preset);
    setActiveTab('preset');
  }, [onPresetChange]);

  const handleCustomTabClick = useCallback(() => {
    setActiveTab('custom');
    onPresetChange(undefined as any);
  }, [onPresetChange]);

  const categories = Array.from(new Set(Object.values(STYLE_PRESETS).map(p => p.category)));

  return (
    <div className="space-y-6">
      {/* Source Image Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            Source Image
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sourcePreview ? (
            <div className="relative">
              <img 
                src={sourcePreview} 
                alt="Source" 
                className="w-full h-48 object-cover rounded-lg"
              />
              <button
                onClick={clearSourceFile}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                aria-label="Remove source image"
                title="Remove source image"
              >
                <X className="w-4 h-4" />
              </button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {sourceFile?.name}
              </p>
            </div>
          ) : (
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleSourceFileSelect}
                className="hidden"
                id="prompt-source-upload"
              />
              <label 
                htmlFor="prompt-source-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="w-8 h-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Click to upload source image
                </span>
                <span className="text-xs text-muted-foreground/60">
                  Supports: PNG, JPG, WEBP
                </span>
              </label>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Style Selection Tabs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Style Selection
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant={activeTab === 'preset' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('preset')}
              >
                Presets
              </Button>
              <Button
                variant={activeTab === 'custom' ? 'default' : 'outline'}
                size="sm"
                onClick={handleCustomTabClick}
              >
                Custom
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {activeTab === 'preset' ? (
            <div className="space-y-4">
              {categories.map(category => (
                <div key={category}>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">{category}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(STYLE_PRESETS)
                      .filter(([_, preset]) => preset.category === category)
                      .map(([key, preset]) => (
                        <button
                          key={key}
                          onClick={() => handlePresetSelect(key as StylePresetName)}
                          className={cn(
                            'p-3 rounded-lg border text-left transition-all',
                            selectedPreset === key
                              ? 'border-primary bg-primary/5 ring-1 ring-primary'
                              : 'border-muted hover:border-primary/50 hover:bg-muted/50'
                          )}
                        >
                          <div className="font-medium text-sm">{preset.name}</div>
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {preset.description}
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              ))}
              
              {selectedPreset && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="font-medium">Selected: {STYLE_PRESETS[selectedPreset].name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {STYLE_PRESETS[selectedPreset].prompt}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="custom-prompt">Custom Style Prompt</Label>
                <Textarea
                  id="custom-prompt"
                  value={customPrompt || ''}
                  onChange={(e) => onCustomPromptChange(e.target.value)}
                  placeholder="Describe the style you want to apply... (e.g., 'oil painting style with thick brushstrokes and vibrant colors')"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Describe the artistic style, lighting, colors, and mood you want
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="negative-prompt">Negative Prompt (Optional)</Label>
                <Textarea
                  id="negative-prompt"
                  value={config.negativePrompt}
                  onChange={(e) => updateConfig({ negativePrompt: e.target.value })}
                  placeholder="Elements to avoid in the output..."
                  rows={2}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            Generation Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Output Prefix */}
          <div className="space-y-2">
            <Label htmlFor="prompt-output-prefix">Output Filename Prefix</Label>
            <Input
              id="prompt-output-prefix"
              value={config.outputPrefix}
              onChange={(e) => updateConfig({ outputPrefix: e.target.value })}
              placeholder="prompt_style"
            />
          </div>

          {/* Steps Slider */}
          <div className="space-y-4">
            <div className="flex justify-between">
              <Label>Inference Steps</Label>
              <span className="text-sm text-muted-foreground">{config.steps}</span>
            </div>
            <Slider
              value={[config.steps]}
              onValueChange={([value]) => updateConfig({ steps: value })}
              min={1}
              max={50}
              step={1}
            />
            <p className="text-xs text-muted-foreground">
              More steps = higher quality but slower. Recommended: 10-20
            </p>
          </div>

          {/* CFG Scale Slider */}
          <div className="space-y-4">
            <div className="flex justify-between">
              <Label>CFG Scale</Label>
              <span className="text-sm text-muted-foreground">{config.cfgScale.toFixed(1)}</span>
            </div>
            <Slider
              value={[config.cfgScale]}
              onValueChange={([value]) => updateConfig({ cfgScale: value })}
              min={0.5}
              max={3.0}
              step={0.1}
            />
            <p className="text-xs text-muted-foreground">
              Higher = stronger prompt adherence. Recommended: 1.0-1.5
            </p>
          </div>

          {/* Dimensions */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="width">Width</Label>
              <Input
                id="width"
                type="number"
                value={config.width}
                onChange={(e) => updateConfig({ width: parseInt(e.target.value) || 1024 })}
                min={512}
                max={2048}
                step={64}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">Height</Label>
              <Input
                id="height"
                type="number"
                value={config.height}
                onChange={(e) => updateConfig({ height: parseInt(e.target.value) || 1024 })}
                min={512}
                max={2048}
                step={64}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Output dimensions. Must be multiples of 64. Default: 1024x1024
          </p>

          {/* Seed Input */}
          <div className="space-y-2">
            <Label htmlFor="prompt-seed">Random Seed</Label>
            <Input
              id="prompt-seed"
              type="number"
              value={config.seed}
              onChange={(e) => updateConfig({ seed: parseInt(e.target.value) || -1 })}
              placeholder="-1 for random"
            />
            <p className="text-xs text-muted-foreground">
              -1 for random, or set for reproducible results
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tips Card */}
      <Card className="bg-purple-50 border-purple-200">
        <CardContent className="p-4">
          <h4 className="font-medium text-purple-900 mb-2">Prompt Writing Tips</h4>
          <ul className="text-sm text-purple-800 space-y-1">
            <li>• Be specific about art style (oil painting, watercolor, anime, etc.)</li>
            <li>• Describe lighting (dramatic, soft, cinematic, natural)</li>
            <li>• Mention color palette (vibrant, muted, warm, cool)</li>
            <li>• Include texture details (smooth, rough, brushstrokes)</li>
            <li>• Add mood/atmosphere (dreamy, mysterious, energetic)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default PromptStyleTransfer;
