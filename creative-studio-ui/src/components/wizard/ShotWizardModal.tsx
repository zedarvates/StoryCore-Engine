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

const CAMERA_TYPES = [
  'Wide Shot', 'Medium Shot', 'Close-Up', 'Extreme Close-Up',
  'Over the Shoulder', 'POV', 'Aerial / Drone', 'Tracking Shot',
  'Dolly Zoom', 'Dutch Angle', 'Low Angle', 'High Angle',
] as const;

const VISUAL_STYLES = [
  { id: 'cinematic', label: '🎬 Cinematic', desc: 'Film-grade look' },
  { id: 'anime', label: '🎨 Anime', desc: 'Japanese animation style' },
  { id: 'realistic', label: '📷 Realistic', desc: 'Photorealistic rendering' },
  { id: 'abstract', label: '🌀 Abstract', desc: 'Artistic & experimental' },
  { id: 'noir', label: '🖤 Film Noir', desc: 'High contrast B&W' },
  { id: 'watercolor', label: '🎨 Watercolor', desc: 'Painted aesthetic' },
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
  const [formData, setFormData] = useState({
    title: initialShot?.title || '',
    description: initialShot?.description || '',
    duration: initialShot?.duration || 5,
    position: initialShot?.position || 1,
    cameraType: initialShot?.metadata?.camera_type || 'Medium Shot',
    visualStyle: initialShot?.metadata?.visual_style || 'cinematic',
    transition: initialShot?.metadata?.transition || 'Cut',
    characters: initialShot?.metadata?.characters || '',
    referenceImage: initialShot?.referenceImage || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generationTaskId, setGenerationTaskId] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState<'processing' | 'completed' | 'failed' | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

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
    try {
      const projectId = project?.id || 'default_project';
      const shotId = initialShot?.id || `shot_${Date.now()}`;

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
      setGenerationStatus('processing');
      setGenerationProgress(0.1);
    } catch (err) {
      console.error('[ShotWizard] Video generation failed:', err);
      setGenerationStatus('failed');
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
          const status = await videoEditorAPI.getVideoGenerationStatus(projectId, generationTaskId);

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

              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Video className="w-5 h-5 text-purple-500" />
                  <h3 className="text-lg font-semibold">Génération Vidéo AI</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Générez une séquence vidéo basée sur votre description et l'image de référence 3D via ComfyUI.
                </p>

                <div className="bg-muted/30 p-4 rounded-lg space-y-3 border">
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Info className="w-4 h-4 mt-0.5" />
                    <span>Cette opération utilise ComfyUI. Assurez-vous que le serveur est démarré.</span>
                  </div>

                  <Button
                    type="button"
                    className="w-full gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg"
                    disabled={!formData.referenceImage || isGeneratingVideo}
                    onClick={handleGenerateVideo}
                  >
                    {isGeneratingVideo ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Génération en cours...</>
                    ) : (
                      <><Video className="w-4 h-4" /> Générer la Vidéo AI</>
                    )}
                  </Button>

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
