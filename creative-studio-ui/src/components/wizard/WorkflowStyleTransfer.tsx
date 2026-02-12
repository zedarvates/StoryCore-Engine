/**
 * WorkflowStyleTransfer
 * Component for configuring workflow-based style transfer
 */

import React, { useCallback, useState } from 'react';
import { WorkflowStyleTransferProps } from '../../types/styleTransfer';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Slider } from '../../components/ui/slider';
import { Upload, Image as ImageIcon, Palette, Settings2, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export const WorkflowStyleTransfer: React.FC<WorkflowStyleTransferProps> = ({
  config,
  onConfigChange,
  sourceFile,
  styleFile,
  onSourceFileChange,
  onStyleFileChange
}) => {
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [stylePreview, setStylePreview] = useState<string | null>(null);

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

  const handleStyleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onStyleFileChange(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setStylePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [onStyleFileChange]);

  const clearSourceFile = useCallback(() => {
    onSourceFileChange(undefined as any);
    setSourcePreview(null);
  }, [onSourceFileChange]);

  const clearStyleFile = useCallback(() => {
    onStyleFileChange(undefined as any);
    setStylePreview(null);
  }, [onStyleFileChange]);

  const updateConfig = useCallback((updates: Partial<typeof config>) => {
    onConfigChange({ ...config, ...updates });
  }, [config, onConfigChange]);

  return (
    <div className="space-y-6">
      {/* Image Upload Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Source Image */}
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
                  id="source-image-upload"
                />
                <label 
                  htmlFor="source-image-upload"
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

        {/* Style Reference Image */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Style Reference
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stylePreview ? (
              <div className="relative">
                <img 
                  src={stylePreview} 
                  alt="Style" 
                  className="w-full h-48 object-cover rounded-lg"
                />
                <button
                  onClick={clearStyleFile}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  aria-label="Remove style reference image"
                  title="Remove style reference image"
                >
                  <X className="w-4 h-4" />
                </button>

                <p className="text-xs text-muted-foreground mt-2 text-center">
                  {styleFile?.name}
                </p>
              </div>
            ) : (
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleStyleFileSelect}
                  className="hidden"
                  id="style-image-upload"
                />
                <label 
                  htmlFor="style-image-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Palette className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Click to upload style reference
                  </span>
                  <span className="text-xs text-muted-foreground/60">
                    The style from this image will be applied
                  </span>
                </label>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Configuration Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            Workflow Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Output Prefix */}
          <div className="space-y-2">
            <Label htmlFor="output-prefix">Output Filename Prefix</Label>
            <Input
              id="output-prefix"
              value={config.outputPrefix}
              onChange={(e) => updateConfig({ outputPrefix: e.target.value })}
              placeholder="style_transfer"
            />
            <p className="text-xs text-muted-foreground">
              Prefix for the generated output files
            </p>
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
              More steps = higher quality but slower generation. Recommended: 10-20
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
              Classifier-free guidance scale. Higher = stronger style adherence. Recommended: 1.0-1.5
            </p>
          </div>

          {/* Seed Input */}
          <div className="space-y-2">
            <Label htmlFor="seed">Random Seed</Label>
            <Input
              id="seed"
              type="number"
              value={config.seed}
              onChange={(e) => updateConfig({ seed: parseInt(e.target.value) || -1 })}
              placeholder="-1 for random"
            />
            <p className="text-xs text-muted-foreground">
              Set to -1 for random seed, or specify for reproducible results
            </p>
          </div>

          {/* Model Selection (Read-only for now) */}
          <div className="space-y-2">
            <Label>Model Configuration</Label>
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">UNET Model:</span>
                <span className="font-medium">{config.modelName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">CLIP Model:</span>
                <span className="font-medium">{config.clipName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">VAE Model:</span>
                <span className="font-medium">{config.vaeName}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Models are configured automatically. Advanced users can modify these in settings.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tips Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h4 className="font-medium text-blue-900 mb-2">Tips for Best Results</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Use high-quality source images for better detail preservation</li>
            <li>• Style reference should clearly show the desired artistic style</li>
            <li>• Start with 10 steps and increase if needed</li>
            <li>• CFG scale of 1.0 works well for most cases</li>
            <li>• Both images should have similar aspect ratios for best results</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkflowStyleTransfer;
