/**
 * ShotWizardModal - Modal pour créer/modifier des plans (shots)
 * Enhanced with camera types, visual styles, and AI description generation
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2, Video, Camera, Info } from 'lucide-react';
import type { Shot } from '@/types';
import { ollamaClient } from '@/services/llm/OllamaClient';
import { useAppStore } from '@/stores/useAppStore';
import { ShotPreview3D } from '../editor/3d/ShotPreview3D';
import { videoEditorAPI } from '@/services/videoEditorAPI';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ProductionShot } from '@/types/shot';
import { ComfyUIService } from '@/services/comfyuiService';
import { useToast } from '@/hooks/use-toast';
import { cineProductionAPI } from '@/services/cineProductionAPI';
import { Switch } from '@/components/ui/switch';

const CAMERA_TYPES = [
  'Wide Shot', 'Medium Shot', 'Close-Up', 'Extreme Close-Up',
  'Over the Shoulder', 'POV', 'Aerial / Drone', 'Tracking Shot',
  'Dolly Zoom', 'Dutch Angle', 'Low Angle', 'High Angle',
] as const;

const VISUAL_STYLES = [
  { id: 'cinematic', label: '🎬 Cinematic', desc: 'Film-grade look' },
  { id: 'realistic', label: '📷 Realistic', desc: 'Photorealistic rendering' },
  { id: 'anime-80s', label: '📺 Anime 80s', desc: 'Retro-futurism aesthetic' },
  { id: 'anime-90s', label: '📻 Anime 90s', desc: 'Classic aesthetic look' },
  { id: 'anime-2000s', label: '💿 Anime 2000s', desc: 'Modern digital style' },
  { id: 'ghibli', label: '🌳 Ghibli Style', desc: 'Whimsical & hand-painted' },
  { id: 'noir', label: '🖤 Film Noir', desc: 'High contrast B&W' },
  { id: 'watercolor', label: '🎨 Watercolor', desc: 'Painted aesthetic' },
  { id: 'cyberpunk', label: '🌃 Cyberpunk', desc: 'Neon & high-tech' },
] as const;

const TRANSITION_TYPES = [
  'Cut', 'Fade In', 'Fade Out', 'Cross Dissolve', 'Wipe',
  'Zoom Transition', 'Whip Pan', 'Match Cut', 'Jump Cut',
] as const;

interface ShotWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (shot: Shot) => void;
  initialShot?: Partial<Shot>;
  sequenceId?: string;
  mode: 'create' | 'edit';
}

export function ShotWizardModal({
  isOpen,
  onClose,
  onComplete,
  initialShot,
  sequenceId,
  mode,
}: ShotWizardModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    duration: number;
    position: number;
    cameraType: string;
    visualStyle: string;
    transition: string;
    characters: string;
    referenceImage: string;
  }>({
    title: initialShot?.title || '',
    description: (initialShot as any)?.description || '',
    duration: (initialShot as any)?.duration || 5,
    position: initialShot?.position || 1,
    cameraType: (initialShot as any)?.metadata?.camera_type || 'Medium Shot',
    visualStyle: (initialShot as any)?.metadata?.visual_style || 'cinematic',
    transition: (initialShot as any)?.metadata?.transition || 'Cut',
    characters: (initialShot as any)?.metadata?.characters || '',
    referenceImage: (initialShot as any)?.referenceImage || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generationTaskId, setGenerationTaskId] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState<'processing' | 'completed' | 'failed' | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

  const [imagePrompt, setImagePrompt] = useState(initialShot?.description || '');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [useHighFidelity, setUseHighFidelity] = useState(true);
  const [autoAddToTimeline, setAutoAddToTimeline] = useState(true);
  const [isAddingToTimeline, setIsAddingToTimeline] = useState(false);

  const ollamaStatus = useAppStore((state) => state.ollamaStatus);
  const project = useAppStore((state) => state.project);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Le titre du plan est requis';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'La description est requise';
    }

    if (formData.duration < 1) {
      newErrors.duration = 'La durée doit être d\'au moins 1 seconde';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGenerateDescription = async () => {
    if (ollamaStatus !== 'connected' || !formData.title.trim()) return;
    setIsGeneratingDesc(true);
    try {
      const models = await ollamaClient.listModels();
      const model = models[0]?.name;
      if (model) {
        const prompt = `Tu es un directeur de photographie expert. Génère une description cinématique courte (2-3 phrases) pour ce plan :
Titre: "${formData.title}"
Type de caméra: ${formData.cameraType}
Style visuel: ${formData.visualStyle}
${formData.characters ? `Personnages: ${formData.characters}` : ''}
Réponds uniquement avec la description, sans préambule.`;
        const response = await ollamaClient.generate(model, prompt);
        setFormData(prev => ({ ...prev, description: response.trim() }));
      }
    } catch (err) {
      console.error('[ShotWizard] AI description failed:', err);
    } finally {
      setIsGeneratingDesc(false);
    }
  };

  const handleCameraCaptured = (config: { referenceImage?: string }) => {
    if (config.referenceImage) {
      setFormData(prev => ({ ...prev, referenceImage: config.referenceImage || '' }));
    }
  };

  const handleGenerateVideo = async () => {
    if (!formData.referenceImage) return;

    setIsGeneratingVideo(true);
    setGenerationStatus('processing');
    setGenerationProgress(0.1);

    try {
      const projectId = project?.id || 'default_project';
      const shotId = initialShot?.id || `shot_${Date.now()}`;

      if (useHighFidelity) {
        // Use the new High-Fidelity CineProductionAPI
        const { jobId } = await cineProductionAPI.startProduction({
          projectId,
          chainType: 'generate_scene',
          sceneDescription: formData.description,
          imagePrompt: imagePrompt,
          genre: (project as any)?.projectSetup?.genre?.[0], // Get main genre if exists
          style: formData.visualStyle,
          overrides: {
            reference_image: formData.referenceImage,
            shot_id: shotId
          }
        });
        setGenerationTaskId(jobId);
      } else {
        // Fallback to legacy direct generation
        const params = {
          width: 1024,
          height: 576,
          steps: 20,
          cfgScale: 7.5,
          sampler: 'euler',
          scheduler: 'normal'
        };

        const result = await videoEditorAPI.generateVideoFromReference(
          projectId,
          shotId,
          formData.referenceImage,
          params
        );
        setGenerationTaskId(result.taskId);
      }
    } catch (err) {
      console.error('[ShotWizard] Video generation failed:', err);
      setGenerationStatus('failed');
      toast({
        title: "Erreur de génération",
        description: err instanceof Error ? err.message : "Une erreur est survenue",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return;
    setIsGeneratingImage(true);
    try {
      const url = await ComfyUIService.getInstance().generateImage({
        prompt: imagePrompt,
        width: 1024,
        height: 576,
        steps: 20,
        cfgScale: 7.0,
        model: 'default',
        sampler: 'euler',
        scheduler: 'normal'
      });

      if (url) {
        setFormData(prev => ({ ...prev, referenceImage: url }));
      }
    } catch (err) {
      console.error('[ShotWizard] Image generation failed:', err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleAddToTimeline = async (videoPath: string) => {
    if (!project?.id) return;
    setIsAddingToTimeline(true);
    try {
      await videoEditorAPI.autoAssemble(project.id, [
        {
          id: initialShot?.id || `shot_${Date.now()}`,
          duration: formData.duration,
          file_path: videoPath,
          title: formData.title
        }
      ]);
      toast({
        title: "Montage synchronisé",
        description: "Le plan a été ajouté à la timeline automatiquement.",
      });
    } catch (err) {
      console.error('[ShotWizard] Auto-add to timeline failed:', err);
      toast({
        title: "Échec du montage",
        description: "Impossible d'insérer le plan dans la timeline.",
        variant: "destructive"
      });
    } finally {
      setIsAddingToTimeline(false);
    }
  };

  const handleProlongVideo = async () => {
    if (!generatedVideoUrl) return;

    setIsGeneratingVideo(true);
    setGenerationStatus('processing'); // Changed from 'pending' to match type
    setGenerationProgress(0);

    try {
      const projectId = project?.id || 'default_project';
      const shotId = initialShot?.id || `shot_${Date.now()}`; // Use known ID or generate temp one

      const params = {
        width: 1024,
        height: 576,
        steps: 20,
        cfgScale: 7.5,
        sampler: 'euler',
        scheduler: 'normal',
        // Add specific extension params if needed, e.g. motion_bucket_id
      };

      const result = await videoEditorAPI.extendVideo(
        projectId,
        shotId,
        generatedVideoUrl,
        params
      );

      setGenerationTaskId(result.taskId);
      setGenerationStatus('processing');
      setGenerationProgress(0.1);

      toast({
        title: "Extension lancée",
        description: "La vidéo est en cours de prolongation...",
      });
    } catch (err) {
      console.error('[ShotWizard] Video extension failed:', err);
      setGenerationStatus('failed');
      toast({
        title: "Erreur",
        description: "Échec de l'extension de la vidéo.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  useEffect(() => {
    let interval: number | undefined;

    if (generationTaskId && generationStatus === 'processing') {
      interval = window.setInterval(async () => {
        try {
          const projectId = project?.id || 'default_project';
          let status;

          if (useHighFidelity) {
            status = await cineProductionAPI.getJob(generationTaskId);
            setGenerationProgress(status.progress / 100);

            if (status.status === 'completed') {
              setGenerationStatus('completed');
              const videoResult = status.results.find(r =>
                r.step === 'video' ||
                r.step === 'speaking_video' ||
                r.step === 'music_pro'
              );

              if (videoResult && (videoResult.output.video_path || videoResult.output.filename)) {
                const path = videoResult.output.video_path || videoResult.output.filename;
                setGeneratedVideoUrl(path);

                // Auto-add logic
                if (autoAddToTimeline) {
                  handleAddToTimeline(path);
                }
              }
              window.clearInterval(interval);
            } else if (status.status === 'failed') {
              setGenerationStatus('failed');
              window.clearInterval(interval);
            }
          } else {
            status = await videoEditorAPI.getVideoGenerationStatus(projectId, generationTaskId);
            if (status.status === 'completed') {
              setGenerationStatus('completed');
              setGenerationProgress(1.0);
              if (status.resultPath) {
                setGeneratedVideoUrl(status.resultPath);
              }
              window.clearInterval(interval);
            } else if (status.status === 'failed') {
              setGenerationStatus('failed');
              window.clearInterval(interval);
            } else {
              setGenerationProgress(prev => Math.min(0.9, prev + 0.05));
            }
          }
        } catch (err) {
          console.error('[ShotWizard] Error polling status:', err);
        }
      }, 3000);
    }

    return () => window.clearInterval(interval);
  }, [generationTaskId, generationStatus, project?.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const shot: Shot = {
      id: initialShot?.id || `shot_${Date.now()}`,
      title: formData.title,
      description: formData.description,
      duration: formData.duration,
      position: formData.position,
      audioTracks: initialShot?.audioTracks || [],
      effects: initialShot?.effects || [],
      textLayers: initialShot?.textLayers || [],
      animations: initialShot?.animations || [],
      metadata: {
        ...initialShot?.metadata,
        sequence_id: sequenceId,
        camera_type: formData.cameraType,
        visual_style: formData.visualStyle,
        transition: formData.transition,
        characters: formData.characters,
        updatedAt: new Date().toISOString(),
      },
      referenceImage: formData.referenceImage,
    };

    onComplete(shot);
    onClose();
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? '🎥 Créer un plan' : '✏️ Modifier le plan'}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="base" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="base">📝 Détails de base</TabsTrigger>
            <TabsTrigger value="ai-3d">🤖 AI & 3D Setup</TabsTrigger>
          </TabsList>

          <TabsContent value="base" className="space-y-5 mt-4">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Titre */}
              <div className="space-y-2">
                <Label htmlFor="shotTitle">Titre du plan *</Label>
                <Input
                  id="shotTitle"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Ex: Plan 1 - Vue d'ensemble"
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && (
                  <p className="text-sm text-red-500">{errors.title}</p>
                )}
              </div>

              {/* Camera Type + Visual Style (2-col) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cameraType">Type de caméra</Label>
                  <select
                    id="cameraType"
                    value={formData.cameraType}
                    onChange={(e) => handleChange('cameraType', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {CAMERA_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="visualStyle">Style visuel</Label>
                  <select
                    id="visualStyle"
                    value={formData.visualStyle}
                    onChange={(e) => handleChange('visualStyle', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {VISUAL_STYLES.map(style => (
                      <option key={style.id} value={style.id}>{style.label} — {style.desc}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description + AI generate button */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="shotDescription">Description *</Label>
                  {ollamaStatus === 'connected' && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleGenerateDescription}
                      disabled={isGeneratingDesc || !formData.title.trim()}
                      className="text-xs gap-1"
                    >
                      {isGeneratingDesc ? (
                        <><Loader2 className="w-3 h-3 animate-spin" /> Génération...</>
                      ) : (
                        <><Sparkles className="w-3 h-3" /> Générer avec l'IA</>
                      )}
                    </Button>
                  )}
                </div>
                <Textarea
                  id="shotDescription"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Décrivez le plan cinématique..."
                  rows={4}
                  className={errors.description ? 'border-red-500' : ''}
                />
                {errors.description && (
                  <p className="text-sm text-red-500">{errors.description}</p>
                )}
              </div>

              {/* Transition + Duration (2-col) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="transition">Transition</Label>
                  <select
                    id="transition"
                    value={formData.transition}
                    onChange={(e) => handleChange('transition', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {TRANSITION_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shotDuration">Durée (secondes) *</Label>
                  <Input
                    id="shotDuration"
                    type="number"
                    min="1"
                    max="300"
                    value={formData.duration}
                    onChange={(e) => handleChange('duration', parseInt(e.target.value) || 5)}
                    className={errors.duration ? 'border-red-500' : ''}
                  />
                  {errors.duration && (
                    <p className="text-sm text-red-500">{errors.duration}</p>
                  )}
                </div>
              </div>

              {/* Characters */}
              <div className="space-y-2">
                <Label htmlFor="characters">Personnages dans le plan</Label>
                <Input
                  id="characters"
                  value={formData.characters}
                  onChange={(e) => handleChange('characters', e.target.value)}
                  placeholder="Ex: Alice, Bob (séparés par des virgules)"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onClose}>
                  Annuler
                </Button>
                <Button type="submit">
                  {mode === 'create' ? '🎬 Créer' : '✅ Mettre à jour'}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="ai-3d" className="space-y-5 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Camera className="w-5 h-5 text-blue-500" />
                  <h3 className="text-lg font-semibold">Cadrage 3D</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Utilisez le moteur 3D pour cadrer votre scène. L'image capturée servira de référence à l'IA.
                </p>

                <Card className="overflow-hidden border-2 border-dashed border-muted relative aspect-video bg-black flex items-center justify-center">
                  {(() => {
                    const productionShot: ProductionShot = {
                      id: initialShot?.id || 'temp',
                      sequencePlanId: sequenceId || 'temp',
                      sceneId: 'temp',
                      number: formData.position,
                      type: (formData.cameraType.toLowerCase().replace(' ', '-') as any) || 'medium',
                      category: 'action',
                      composition: {
                        characterIds: formData.characters ? formData.characters.split(',').map((c: string) => c.trim()) : [],
                        characterPositions: [],
                        environmentId: 'default',
                        props: [],
                        lightingMood: 'natural',
                        timeOfDay: 'day'
                      },
                      camera: {
                        framing: 'medium',
                        angle: 'eye-level',
                        movement: { type: 'static' }
                      },
                      timing: {
                        duration: formData.duration * 24,
                        inPoint: 0,
                        outPoint: formData.duration * 24,
                        transition: 'cut',
                        transitionDuration: 0
                      },
                      generation: {
                        aiProvider: 'comfyui',
                        model: 'sdxl',
                        prompt: formData.description,
                        negativePrompt: '',
                        comfyuiPreset: 'standard',
                        parameters: { width: 1024, height: 576, steps: 20, cfgScale: 7.5, sampler: 'euler', scheduler: 'normal' },
                        styleReferences: []
                      },
                      dialogues: [],
                    };
                    return (
                      <ShotPreview3D
                        shot={productionShot}
                        width={400}
                        height={225}
                        onCameraCaptured={handleCameraCaptured}
                      />
                    );
                  })()}
                </Card>

                {formData.referenceImage && (
                  <div className="space-y-2">
                    <Label>Référence capturée</Label>
                    <div className="relative group overflow-hidden rounded-md border">
                      <img
                        src={formData.referenceImage}
                        alt="Reference"
                        className="w-full h-32 object-cover"
                      />
                      <Badge className="absolute top-2 right-2 bg-green-500">Prêt</Badge>
                    </div>
                  </div>
                )}
              </div>

              {/* Image Generation Section */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                  <h3 className="text-lg font-semibold">Génération d&apos;Image (Prompt)</h3>
                </div>
                <div className="space-y-2">
                  <Label>Prompt Image</Label>
                  <Textarea
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    placeholder="Décrivez l'image à générer..."
                    rows={3}
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleGenerateImage}
                  disabled={isGeneratingImage || !imagePrompt.trim()}
                  className="w-full"
                >
                  {isGeneratingImage ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Camera className="w-4 h-4 mr-2" />}
                  Générer la première image
                </Button>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <Video className="w-5 h-5 text-purple-500" />
                  <h3 className="text-lg font-semibold">Génération Vidéo AI</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Générez une séquence vidéo basée sur votre description et l'image de référence 3D via ComfyUI.
                </p>

                <div className="bg-muted/30 p-4 rounded-lg space-y-3 border">
                  <div className="flex items-center justify-between p-2 bg-background/50 rounded-md border border-purple-500/20 mb-2">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-purple-600 uppercase flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Pro Cinema Mode
                      </span>
                      <span className="text-[10px] text-muted-foreground">High-Fidelity: Visual Director + Sonic Architect</span>
                    </div>
                    <Switch
                      checked={useHighFidelity}
                      onCheckedChange={setUseHighFidelity}
                      className="data-[state=checked]:bg-purple-600"
                    />
                  </div>

                  <div className="flex items-center justify-between p-2 bg-background/50 rounded-md border border-blue-500/20 mb-2">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-blue-600 uppercase flex items-center gap-1">
                        <Video className="w-3 h-3" /> Auto-Add to Timeline
                      </span>
                      <span className="text-[10px] text-muted-foreground">Insertion automatique après génération</span>
                    </div>
                    <Switch
                      checked={autoAddToTimeline}
                      onCheckedChange={setAutoAddToTimeline}
                      className="data-[state=checked]:bg-blue-600"
                    />
                  </div>

                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Info className="w-4 h-4 mt-0.5" />
                    <span>{useHighFidelity ? "Génération complète : Storyboard -> Vidéo -> Audio synchronisé." : " Opération directe via ComfyUI (vidéo uniquement)."}</span>
                  </div>

                  <div className="flex gap-2 w-full">
                    <Button
                      type="button"
                      className="flex-1 gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg"
                      disabled={!formData.referenceImage || isGeneratingVideo}
                      onClick={handleGenerateVideo}
                    >
                      {isGeneratingVideo ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Génération...</>
                      ) : (
                        <><Video className="w-4 h-4" /> Générer Vidéo</>
                      )}
                    </Button>

                    {generatedVideoUrl && (
                      <Button
                        type="button"
                        variant="secondary"
                        className="flex-1 gap-2 border-purple-500/50"
                        onClick={handleProlongVideo}
                        title="Prolonger la vidéo existante"
                      >
                        <Video className="w-4 h-4" /> Prolonger
                      </Button>
                    )}
                  </div>

                  {generationTaskId && (
                    <div className={`p-3 border rounded-md text-xs font-medium text-center space-y-2 ${generationStatus === 'completed' ? 'bg-green-500/10 border-green-500/20 text-green-600' :
                      generationStatus === 'failed' ? 'bg-red-500/10 border-red-500/20 text-red-600' :
                        'bg-blue-500/10 border-blue-500/20 text-blue-600'
                      }`}>
                      <div className="flex justify-between items-center mb-1">
                        <span>{generationStatus === 'completed' ? 'Génération terminée !' :
                          generationStatus === 'failed' ? 'Échec de la génération' :
                            'Génération en cours...'}</span>
                        <span className="font-bold">{Math.round(generationProgress * 100)}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${generationStatus === 'completed' ? 'bg-green-500' :
                            generationStatus === 'failed' ? 'bg-red-500' :
                              'bg-blue-500'
                            }`}
                          style={{ width: `${generationProgress * 100}%` }}
                        ></div>
                      </div>
                      {generationStatus === 'completed' && generatedVideoUrl && (
                        <div className="pt-2">
                          <p className="text-[10px] text-muted-foreground break-all">Asset: {generatedVideoUrl}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2 mt-4">
                  <Label className="text-xs uppercase text-muted-foreground font-bold">Paramètres de rendu AI</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 border rounded text-center bg-background">
                      <div className="text-[10px] text-muted-foreground uppercase">Format</div>
                      <div className="text-xs font-semibold">1024x576</div>
                    </div>
                    <div className="p-2 border rounded text-center bg-background">
                      <div className="text-[10px] text-muted-foreground uppercase">Précision</div>
                      <div className="text-xs font-semibold">20 Steps</div>
                    </div>
                    <div className="p-2 border rounded text-center bg-background">
                      <div className="text-[10px] text-muted-foreground uppercase">AI Model</div>
                      <div className="text-xs font-semibold">SDXL-Vid</div>
                    </div>
                    <div className="p-2 border rounded text-center bg-background">
                      <div className="text-[10px] text-muted-foreground uppercase">Style</div>
                      <div className="text-xs font-semibold">Cinematic</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t mt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Fermer
              </Button>
              <Button type="button" onClick={handleSubmit} className="bg-primary text-primary-foreground">
                {mode === 'create' ? '🎬 Créer & Sauvegarder' : '✅ Mettre à jour'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default ShotWizardModal;
