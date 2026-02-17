/**
 * ImageGenerationModal Component
 * 
 * A modal dialog for selecting workflow, model, and generation parameters
 * before generating images with ComfyUI.
 * 
 * Features:
 * - Workflow selection with descriptions
 * - Checkpoint/model selection
 * - Resolution presets with GPU memory validation
 * - Advanced parameters (steps, CFG, sampler, scheduler)
 * - Model download integration
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { 
  Sparkles, 
  Loader2, 
  AlertCircle, 
  Download, 
  Settings2, 
  Image, 
  CheckCircle2,
  Info,
  RefreshCw,
  Zap,
  Cpu,
  HardDrive
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  WORKFLOW_OPTIONS,
  RESOLUTION_PRESETS,
  SAMPLER_OPTIONS,
  SCHEDULER_OPTIONS,
  DEFAULT_GENERATION_PARAMS,
  getAvailableCheckpoints,
  getGPUInfo,
  validateResolution,
  getDefaultParamsForWorkflow,
  type WorkflowOption,
  type GPUInfo,
  type GenerationParams
} from '@/services/imageGenerationService';

// Extend WorkflowType to include FireRed
type ExtendedWorkflowType = 'flux2' | 'z_image_turbo' | 'z_image_turbo_coherence' | 'sdxl' | 'firered_image_edit' | 'custom';

export interface ImageGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (result: { imageUrl: string; params: GenerationParams }) => void;
  initialPrompt?: string;
  initialImageUrl?: string; // For editing/inpainting workflows
  title?: string;
}

export function ImageGenerationModal({
  isOpen,
  onClose,
  onGenerate,
  initialPrompt = '',
  initialImageUrl,
  title = 'Generate Image'
}: ImageGenerationModalProps) {
  const { toast } = useToast();
  
  // State
  const [activeTab, setActiveTab] = useState('workflow');
  const [selectedWorkflow, setSelectedWorkflow] = useState<ExtendedWorkflowType>('z_image_turbo');
  const [checkpoints, setCheckpoints] = useState<string[]>([]);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<string>('');
  const [isLoadingCheckpoints, setIsLoadingCheckpoints] = useState(false);
  const [gpuInfo, setGpuInfo] = useState<GPUInfo | null>(null);
  const [isLoadingGpu, setIsLoadingGpu] = useState(false);
  
  // Generation parameters
  const [prompt, setPrompt] = useState(initialPrompt);
  const [negativePrompt, setNegativePrompt] = useState(DEFAULT_GENERATION_PARAMS.negativePrompt || '');
  const [width, setWidth] = useState(DEFAULT_GENERATION_PARAMS.width || 1024);
  const [height, setHeight] = useState(DEFAULT_GENERATION_PARAMS.height || 1024);
  const [steps, setSteps] = useState(DEFAULT_GENERATION_PARAMS.steps || 20);
  const [cfgScale, setCfgScale] = useState(DEFAULT_GENERATION_PARAMS.cfgScale || 7.0);
  const [sampler, setSampler] = useState(DEFAULT_GENERATION_PARAMS.sampler || 'euler');
  const [scheduler, setScheduler] = useState(DEFAULT_GENERATION_PARAMS.scheduler || 'normal');
  const [seed, setSeed] = useState<number | undefined>(undefined);
  const [useRandomSeed, setUseRandomSeed] = useState(true);
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  
  // Model download - open HuggingFace in new tab
  const handleOpenModelDownload = () => {
    window.open('https://huggingface.co/cocorang/FireRed-Image-Edit-1.0-FP8_And_BF16', '_blank');
  };
  
  // Validation
  const [resolutionWarning, setResolutionWarning] = useState<string | null>(null);

  // Load checkpoints and GPU info when modal opens
  useEffect(() => {
    if (isOpen) {
      loadCheckpoints();
      loadGpuInfo();
    }
  }, [isOpen]);

  // Update default parameters when workflow changes
  useEffect(() => {
    const defaults = getDefaultParamsForWorkflow(selectedWorkflow as any);
    if (defaults.width) setWidth(defaults.width);
    if (defaults.height) setHeight(defaults.height);
  }, [selectedWorkflow]);

  // Validate resolution when width/height/workflow changes
  useEffect(() => {
    const validation = validateResolution(width, height, selectedWorkflow as any, gpuInfo);
    if (validation.warning) {
      setResolutionWarning(validation.warning);
    } else if (validation.error) {
      setResolutionWarning(validation.error);
    } else {
      setResolutionWarning(null);
    }
  }, [width, height, selectedWorkflow, gpuInfo]);

  const loadCheckpoints = async () => {
    setIsLoadingCheckpoints(true);
    try {
      const models = await getAvailableCheckpoints();
      setCheckpoints(models);
      if (models.length > 0) {
        setSelectedCheckpoint(models[0]);
      }
    } catch (error) {
      console.error('Failed to load checkpoints:', error);
    } finally {
      setIsLoadingCheckpoints(false);
    }
  };

  const loadGpuInfo = async () => {
    setIsLoadingGpu(true);
    try {
      const info = await getGPUInfo();
      setGpuInfo(info);
    } catch (error) {
      console.error('Failed to load GPU info:', error);
    } finally {
      setIsLoadingGpu(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: 'Prompt Required',
        description: 'Please enter a prompt for image generation',
        variant: 'destructive'
      });
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setGeneratedImageUrl(null);

    try {
      const params: GenerationParams = {
        prompt: prompt.trim(),
        negativePrompt: negativePrompt.trim() || undefined,
        width,
        height,
        steps,
        cfgScale,
        seed: useRandomSeed ? undefined : seed,
        sampler,
        scheduler,
        workflowType: selectedWorkflow as any,
        checkpoint: selectedCheckpoint || undefined
      };

      // Call the generation service
      const { generateImage } = await import('@/services/imageGenerationService');
      
      const imageUrl = await generateImage(params, (progress, message) => {
        setGenerationProgress(progress);
      });

      setGeneratedImageUrl(imageUrl);
      
      toast({
        title: 'Image Generated',
        description: 'Your image has been generated successfully',
        variant: 'default'
      });

      // Return result to parent
      onGenerate({ imageUrl, params });
      
    } catch (error) {
      console.error('Image generation failed:', error);
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate image',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleResolutionPreset = (w: number, h: number) => {
    setWidth(w);
    setHeight(h);
  };

  const handleClose = () => {
    if (!isGenerating) {
      setGeneratedImageUrl(null);
      setGenerationProgress(0);
      onClose();
    }
  };

  const getWorkflowIcon = (workflow: WorkflowOption) => {
    return workflow.icon || '🎨';
  };

  // Filter out custom from workflow options for selection
  const selectableWorkflows = WORKFLOW_OPTIONS.filter(w => w.id !== 'custom');

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              {title}
            </DialogTitle>
            <DialogDescription>
              Select workflow, model, and parameters for image generation
            </DialogDescription>
          </DialogHeader>

          {/* GPU Info Banner */}
          {gpuInfo && (
            <div className="flex items-center gap-4 px-4 py-2 bg-muted/50 rounded-md text-xs">
              <div className="flex items-center gap-1">
                <Cpu className="w-3 h-3" />
                <span>{gpuInfo.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <HardDrive className="w-3 h-3" />
                <span>{(gpuInfo.vramFree / 1024).toFixed(1)}GB free</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="ml-auto h-6 px-2"
                onClick={loadGpuInfo}
                disabled={isLoadingGpu}
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingGpu ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="workflow" className="gap-1">
                <Zap className="w-4 h-4" /> Workflow
              </TabsTrigger>
              <TabsTrigger value="model" className="gap-1">
                <Image className="w-4 h-4" /> Model
              </TabsTrigger>
              <TabsTrigger value="advanced" className="gap-1">
                <Settings2 className="w-4 h-4" /> Advanced
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 mt-4">
              {/* Workflow Selection Tab */}
              <TabsContent value="workflow" className="space-y-4 m-0 p-1">
                <div className="grid grid-cols-2 gap-3">
                  {selectableWorkflows.map((workflow) => (
                    <Card 
                      key={workflow.id}
                      className={`cursor-pointer transition-all ${
                        selectedWorkflow === workflow.id 
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                          : 'hover:border-muted-foreground/50'
                      }`}
                      onClick={() => setSelectedWorkflow(workflow.id as ExtendedWorkflowType)}
                    >
                      <CardHeader className="p-3 pb-1">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <span className="text-lg">{getWorkflowIcon(workflow)}</span>
                            {workflow.name}
                          </CardTitle>
                          {selectedWorkflow === workflow.id && (
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <CardDescription className="text-xs">
                          {workflow.description}
                        </CardDescription>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {workflow.bestFor.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-[10px] px-1 py-0">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <div className="mt-2 text-[10px] text-muted-foreground">
                          Recommended: {workflow.recommendedResolution.width}x{workflow.recommendedResolution.height}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Resolution Section */}
                <div className="space-y-3 mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Resolution</Label>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-xs"
                      onClick={() => {
                        const workflow = WORKFLOW_OPTIONS.find(w => w.id === selectedWorkflow);
                        if (workflow) {
                          setWidth(workflow.recommendedResolution.width);
                          setHeight(workflow.recommendedResolution.height);
                        }
                      }}
                    >
                      Use Recommended
                    </Button>
                  </div>
                  
                  {/* Resolution Presets */}
                  <div className="flex flex-wrap gap-2">
                    {RESOLUTION_PRESETS.slice(0, 6).map((preset) => (
                      <Button
                        key={preset.label}
                        variant={width === preset.width && height === preset.height ? 'default' : 'outline'}
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => handleResolutionPreset(preset.width, preset.height)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>

                  {/* Custom Resolution */}
                  <div className="flex items-center gap-4">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Width</Label>
                      <Input
                        type="number"
                        value={width}
                        onChange={(e) => setWidth(parseInt(e.target.value) || 512)}
                        min={256}
                        max={2048}
                        step={8}
                        className="h-8"
                      />
                    </div>
                    <span className="pt-5 text-muted-foreground">×</span>
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Height</Label>
                      <Input
                        type="number"
                        value={height}
                        onChange={(e) => setHeight(parseInt(e.target.value) || 512)}
                        min={256}
                        max={2048}
                        step={8}
                        className="h-8"
                      />
                    </div>
                  </div>

                  {/* Resolution Warning */}
                  {resolutionWarning && (
                    <div className={`flex items-center gap-2 p-2 rounded-md text-xs ${
                      resolutionWarning.includes('error') || resolutionWarning.includes('Maximum') 
                        ? 'bg-red-50 text-red-600' 
                        : 'bg-yellow-50 text-yellow-600'
                    }`}>
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      {resolutionWarning}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Model Selection Tab */}
              <TabsContent value="model" className="space-y-4 m-0 p-1">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Checkpoint Model</Label>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="gap-1"
                      onClick={handleOpenModelDownload}
                    >
                      <Download className="w-3 h-3" /> Download Model
                    </Button>
                  </div>
                  
                  <Select value={selectedCheckpoint} onValueChange={setSelectedCheckpoint}>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingCheckpoints ? "Loading models..." : "Select checkpoint"} />
                    </SelectTrigger>
                    <SelectContent>
                      {checkpoints.length > 0 ? (
                        checkpoints.map((checkpoint) => (
                          <SelectItem key={checkpoint} value={checkpoint}>
                            {checkpoint}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="default">default (sd_xl_base_1.0.safetensors)</SelectItem>
                      )}
                    </SelectContent>
                  </Select>

                  {checkpoints.length === 0 && !isLoadingCheckpoints && (
                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md text-xs text-muted-foreground">
                      <Info className="w-3 h-3" />
                      <span>No checkpoints found. Make sure ComfyUI is running and models are installed.</span>
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="gap-1"
                    onClick={loadCheckpoints}
                    disabled={isLoadingCheckpoints}
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingCheckpoints ? 'animate-spin' : ''}`} />
                    Refresh Models
                  </Button>
                </div>

                {/* Model Info */}
                <div className="space-y-2 pt-4 border-t">
                  <Label className="text-sm font-semibold">About Checkpoints</Label>
                  <p className="text-xs text-muted-foreground">
                    Checkpoint models contain the neural network weights for image generation.
                    Different models produce different styles and quality levels.
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-muted/50 rounded">
                      <div className="font-semibold">FLUX.2</div>
                      <div className="text-muted-foreground">Best text rendering</div>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <div className="font-semibold">SDXL</div>
                      <div className="text-muted-foreground">Most versatile</div>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <div className="font-semibold">FireRed</div>
                      <div className="text-muted-foreground">Image editing</div>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <div className="font-semibold">Z-Turbo</div>
                      <div className="text-muted-foreground">Fast preview</div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Advanced Parameters Tab */}
              <TabsContent value="advanced" className="space-y-4 m-0 p-1">
                {/* Prompt */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Prompt *</Label>
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe the image you want to generate..."
                    rows={4}
                    className="resize-none"
                  />
                </div>

                {/* Negative Prompt */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Negative Prompt</Label>
                  <Textarea
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="What to avoid in the image..."
                    rows={2}
                    className="resize-none"
                  />
                </div>

                {/* Generation Parameters Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Steps */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Steps</Label>
                      <span className="text-xs text-muted-foreground">{steps}</span>
                    </div>
                    <Slider
                      value={[steps]}
                      onValueChange={([v]) => setSteps(v)}
                      min={1}
                      max={50}
                      step={1}
                    />
                  </div>

                  {/* CFG Scale */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">CFG Scale</Label>
                      <span className="text-xs text-muted-foreground">{cfgScale}</span>
                    </div>
                    <Slider
                      value={[cfgScale]}
                      onValueChange={([v]) => setCfgScale(v)}
                      min={1}
                      max={20}
                      step={0.5}
                    />
                  </div>

                  {/* Sampler */}
                  <div className="space-y-2">
                    <Label className="text-xs">Sampler</Label>
                    <Select value={sampler} onValueChange={setSampler}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SAMPLER_OPTIONS.slice(0, 15).map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Scheduler */}
                  <div className="space-y-2">
                    <Label className="text-xs">Scheduler</Label>
                    <Select value={scheduler} onValueChange={setScheduler}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SCHEDULER_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Seed */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Seed</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Random</span>
                      <Switch
                        checked={!useRandomSeed}
                        onCheckedChange={(checked) => setUseRandomSeed(!checked)}
                      />
                    </div>
                  </div>
                  {!useRandomSeed && (
                    <Input
                      type="number"
                      value={seed || 0}
                      onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
                      className="h-8"
                      placeholder="Enter seed value..."
                    />
                  )}
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>

          {/* Generated Image Preview */}
          {generatedImageUrl && (
            <div className="p-3 bg-muted/30 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-sm font-semibold">Generated Image</span>
              </div>
              <div className="relative aspect-video bg-black rounded-md overflow-hidden">
                <img 
                  src={generatedImageUrl} 
                  alt="Generated" 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {isGenerating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Generating...
                </span>
                <span>{Math.round(generationProgress)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${generationProgress}%` }}
                />
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button 
              variant="outline" 
              onClick={handleClose}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Image
                </>
              )}
            </Button>

          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ImageGenerationModal;

