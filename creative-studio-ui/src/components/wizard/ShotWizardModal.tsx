/**
 * ShotWizardModal - Modal pour créer/modifier des plans (shots)
 * Enhanced with camera types, visual styles, and AI description generation
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2, Video, Camera, Info, X, ChevronRight, ArrowLeft } from 'lucide-react';
import type { DashboardShot } from '@/types';
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
import { ImageGenerationModal } from '@/components/modals/ImageGenerationModal';
import { cn } from '@/lib/utils';
import { Monitor, CheckCircle2, Zap } from 'lucide-react';
import './WizardModal.css';

const CAMERA_TYPES = [
  'Wide Shot', 'Medium Shot', 'Close-Up', 'Extreme Close-Up',
  'Over the Shoulder', 'POV', 'Aerial / Drone', 'Tracking Shot',
  'Dolly Zoom', 'Dutch Angle', 'Low Angle', 'High Angle',
] as const;

const Lenses = [
  { id: '24mm', label: '24mm Wide', desc: 'Deep focus, architectural' },
  { id: '35mm', label: '35mm Street', desc: 'Natural perspective' },
  { id: '50mm', label: '50mm Prime', desc: 'Human eye equivalent' },
  { id: '85mm', label: '85mm Portrait', desc: 'Compression, bokeh' },
  { id: 'anamorphic', label: 'Anamorphic', desc: 'Ultra-wide cinematic' },
] as const;

const SENSORS = [
  { id: '35mm', label: 'Full Frame (35mm)', desc: 'Standard' },
  { id: 'imax', label: 'IMAX 70mm', desc: 'Ultra-high fidelity' },
  { id: 'vhs', label: 'VHS / CRT', desc: 'Retro signal' },
  { id: 'digital-cinema', label: 'Arri/RED style', desc: 'Modern film' },
] as const;

const EMOTIONS = [
  { id: 'neutral', label: 'Neutral', icon: '😐' },
  { id: 'joy', label: 'Joy', icon: '😊' },
  { id: 'melancholy', label: 'Melancholy', icon: '😔' },
  { id: 'fear', label: 'Fear', icon: '😨' },
  { id: 'anger', label: 'Anger', icon: '😠' },
  { id: 'awe', label: 'Awe / Wonder', icon: '😲' },
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
  onComplete: (shot: DashboardShot) => void;
  initialShot?: Partial<DashboardShot>;
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
    lens: string;
    sensor: string;
    emotion: string;
    emotionIntensity: number;
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
    lens: (initialShot as any)?.metadata?.lens || '50mm',
    sensor: (initialShot as any)?.metadata?.sensor || '35mm',
    emotion: (initialShot as any)?.metadata?.emotion || 'neutral',
    emotionIntensity: (initialShot as any)?.metadata?.emotionIntensity || 50,
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
  
  // Image Generation Modal state
  const [isImageGenModalOpen, setIsImageGenModalOpen] = useState(false);

  const ollamaStatus = useAppStore((state) => state.ollamaStatus);
  const project = useAppStore((state) => state.project);

  // Handle Escape key
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      // Initialize form with initialShot when opening
      if (initialShot) {
        setFormData({
            title: initialShot?.title || '',
            description: (initialShot as any)?.description || '',
            duration: (initialShot as any)?.duration || 5,
            position: initialShot?.position || 1,
            cameraType: (initialShot as any)?.metadata?.camera_type || 'Medium Shot',
            visualStyle: (initialShot as any)?.metadata?.visual_style || 'cinematic',
            transition: (initialShot as any)?.metadata?.transition || 'Cut',
            characters: (initialShot as any)?.metadata?.characters || '',
            referenceImage: (initialShot as any)?.referenceImage || '',
            lens: (initialShot as any)?.metadata?.lens || '50mm',
            sensor: (initialShot as any)?.metadata?.sensor || '35mm',
            emotion: (initialShot as any)?.metadata?.emotion || 'neutral',
            emotionIntensity: (initialShot as any)?.metadata?.emotionIntensity || 50,
        });
        setImagePrompt((initialShot as any)?.description || '');
      }
    } else {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeyDown, initialShot]);

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
        const lensLabel = Lenses.find(l => l.id === formData.lens)?.label;
        const sensorLabel = SENSORS.find(s => s.id === formData.sensor)?.label;
        const emotionLabel = EMOTIONS.find(e => e.id === formData.emotion)?.label;

        const prompt = `Tu es un directeur de photographie expert. Génère une description cinématique courte (2-3 phrases) pour ce plan :
Titre: "${formData.title}"
Type de caméra: ${formData.cameraType}
Objectif (Lens): ${lensLabel}
Capteur (Sensor/Look): ${sensorLabel}
Emotion suggérée: ${emotionLabel} (Intensité: ${formData.emotionIntensity}%)
Style visuel: ${formData.visualStyle}
${formData.characters ? `Personnages: ${formData.characters}` : ''}
Réponds uniquement avec la description, sans préambule. Utilise un langage technique de réalisateur.`;
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
        const { jobId } = await cineProductionAPI.startProduction({
          projectId,
          chainType: 'generate_scene',
          sceneDescription: formData.description,
          imagePrompt: imagePrompt,
          genre: (project as any)?.projectSetup?.genre?.[0],
          style: formData.visualStyle,
          overrides: {
            reference_image: formData.referenceImage,
            shot_id: shotId,
            lens: formData.lens,
            emotion: formData.emotion,
            intensity: formData.emotionIntensity
          }
        });
        setGenerationTaskId(jobId);
      } else {
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
    setGenerationStatus('processing');
    setGenerationProgress(0);

    try {
      const projectId = project?.id || 'default_project';
      const shotId = initialShot?.id || `shot_${Date.now()}`;

      const params = {
        width: 1024,
        height: 576,
        steps: 20,
        cfgScale: 7.5,
        sampler: 'euler',
        scheduler: 'normal',
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

    if (generationTaskId && (generationStatus === 'processing')) {
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
  }, [generationTaskId, generationStatus, project?.id, useHighFidelity, autoAddToTimeline]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const shot: DashboardShot = {
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
        lens: formData.lens,
        sensor: formData.sensor,
        emotion: formData.emotion,
        emotionIntensity: formData.emotionIntensity,
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

  const handleImageGenerated = (result: { imageUrl: string; params: unknown }) => {
    setFormData(prev => ({ ...prev, referenceImage: result.imageUrl }));
    setIsImageGenModalOpen(false);
    toast({
      title: "Image générée",
      description: "L'image a été définie comme référence pour ce plan.",
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <ImageGenerationModal
        isOpen={isImageGenModalOpen}
        onClose={() => setIsImageGenModalOpen(false)}
        onGenerate={handleImageGenerated}
        initialPrompt={imagePrompt || formData.description}
        title="Générer une image de référence"
      />
      <div className="wizard-modal-overlay" onClick={onClose}>
        <div className="wizard-modal-container max-w-5xl" onClick={(e) => e.stopPropagation()}>
          <div className="wizard-modal-header">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                  <Camera size={20} />
               </div>
               <div className="flex flex-col">
                <h2 className="wizard-modal-title">
                  {mode === 'create' ? 'AI Shot Creator' : 'Edit Cinematic Shot'}
                </h2>
                <span className="text-[10px] text-blue-400/70 uppercase tracking-widest font-black">Frame Optimizer v4.2</span>
               </div>
            </div>
            <button
              className="wizard-modal-close"
              onClick={onClose}
              aria-label="Fermer"
            >
              <X size={20} />
            </button>
          </div>

          <div className="wizard-modal-content">
            <Tabs defaultValue="base" className="w-full flex flex-col h-full">
              <div className="px-8 pt-6 bg-black/40 border-b border-white/5">
                <TabsList className="grid w-full grid-cols-3 bg-black/20 p-1 border border-white/5 rounded-xl mb-6">
                  <TabsTrigger value="base" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white uppercase font-black tracking-widest text-[10px]">📝 Script & Basics</TabsTrigger>
                  <TabsTrigger value="rig" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white uppercase font-black tracking-widest text-[10px]">🎬 Director Rig</TabsTrigger>
                  <TabsTrigger value="ai-3d" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white uppercase font-black tracking-widest text-[10px]">🤖 AI & 3D Tools</TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto p-8 scrollbar-cyber">
                <TabsContent value="base" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="shotTitle" className="text-[10px] uppercase font-black tracking-widest text-slate-500">Shot Title *</Label>
                        <Input
                          id="shotTitle"
                          value={formData.title}
                          onChange={(e) => handleChange('title', e.target.value)}
                          placeholder="Ex: Entering Neon Bar"
                          className={cn("bg-black/40 border-white/10 h-12 focus:ring-blue-500", errors.title && "border-red-500")}
                        />
                        {errors.title && <p className="text-[10px] text-red-500 font-bold uppercase">{errors.title}</p>}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="cameraType" className="text-[10px] uppercase font-black tracking-widest text-slate-500">Camera Framing</Label>
                          <select
                            id="cameraType"
                            value={formData.cameraType}
                            onChange={(e) => handleChange('cameraType', e.target.value)}
                            className="flex h-12 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 outline-none"
                          >
                            {CAMERA_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="visualStyle" className="text-[10px] uppercase font-black tracking-widest text-slate-500">Visual Aesthetic</Label>
                          <select
                            id="visualStyle"
                            value={formData.visualStyle}
                            onChange={(e) => handleChange('visualStyle', e.target.value)}
                            className="flex h-12 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 outline-none"
                          >
                            {VISUAL_STYLES.map(style => <option key={style.id} value={style.id}>{style.label}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="shotDescription" className="text-[10px] uppercase font-black tracking-widest text-slate-500">Cinematic Description *</Label>
                          {ollamaStatus === 'connected' && (
                            <button
                              type="button"
                              onClick={handleGenerateDescription}
                              disabled={isGeneratingDesc || !formData.title.trim()}
                              className="text-[10px] uppercase font-black flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
                            >
                              {isGeneratingDesc ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} AI Enhance
                            </button>
                          )}
                        </div>
                        <Textarea
                          id="shotDescription"
                          value={formData.description}
                          onChange={(e) => handleChange('description', e.target.value)}
                          placeholder="Describe the cinematic action..."
                          rows={6}
                          className={cn("bg-black/40 border-white/10 focus:ring-blue-500 resize-none", errors.description && "border-red-500")}
                        />
                        {errors.description && <p className="text-[10px] text-red-500 font-bold uppercase">{errors.description}</p>}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="transition" className="text-[10px] uppercase font-black tracking-widest text-slate-500">Transition</Label>
                          <select
                            id="transition"
                            value={formData.transition}
                            onChange={(e) => handleChange('transition', e.target.value)}
                            className="flex h-12 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-200 outline-none"
                          >
                            {TRANSITION_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="shotDuration" className="text-[10px] uppercase font-black tracking-widest text-slate-500">Duration (sec) *</Label>
                          <Input
                            id="shotDuration"
                            type="number"
                            min="1"
                            max="300"
                            value={formData.duration}
                            onChange={(e) => handleChange('duration', parseInt(e.target.value) || 5)}
                            className={cn("bg-black/40 border-white/10 h-12", errors.duration && "border-red-500")}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="characters" className="text-[10px] uppercase font-black tracking-widest text-slate-500">Active Characters</Label>
                        <Input
                          id="characters"
                          value={formData.characters}
                          onChange={(e) => handleChange('characters', e.target.value)}
                          placeholder="Ex: Luca, Cyber-Grifter"
                          className="bg-black/40 border-white/10 h-12"
                        />
                      </div>

                      <div className="p-6 bg-blue-500/5 border border-blue-500/20 rounded-2xl">
                         <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-400 mb-4">
                           <Info size={14} /> Production Summary
                         </h4>
                         <ul className="space-y-3">
                           <li className="flex justify-between border-b border-white/5 pb-2">
                             <span className="text-[10px] uppercase font-bold text-slate-500">Total Frames</span>
                             <span className="text-[10px] font-mono text-white">{formData.duration * 24}f</span>
                           </li>
                           <li className="flex justify-between border-b border-white/5 pb-2">
                             <span className="text-[10px] uppercase font-bold text-slate-500">Aspect Ratio</span>
                             <span className="text-[10px] font-mono text-white">16:9</span>
                           </li>
                           <li className="flex justify-between pb-2">
                             <span className="text-[10px] uppercase font-bold text-slate-500">Complexity</span>
                             <span className="text-[10px] font-mono text-blue-400">OPTIMIZED</span>
                           </li>
                         </ul>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="rig" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                          <Camera size={18} />
                        </div>
                        <h3 className="text-xl font-black uppercase tracking-tight text-white">Optical Geometry</h3>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {Lenses.map(lens => (
                          <button
                            key={lens.id}
                            type="button"
                            onClick={() => handleChange('lens', lens.id)}
                            className={cn(
                              "text-left p-4 rounded-xl border transition-all group",
                              formData.lens === lens.id ? "bg-blue-500/10 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]" : "bg-black/40 border-white/5 hover:border-blue-500/30"
                            )}
                          >
                            <div className="flex justify-between items-center mb-1">
                               <span className={cn("text-xs font-black uppercase tracking-widest", formData.lens === lens.id ? "text-blue-400" : "text-slate-200")}>{lens.label}</span>
                               {formData.lens === lens.id && <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />}
                            </div>
                            <p className="text-[10px] text-slate-500">{lens.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-400">
                          <Sparkles size={18} />
                        </div>
                        <h3 className="text-xl font-black uppercase tracking-tight text-white">Directing Emotion</h3>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        {EMOTIONS.map(emo => (
                          <button
                            key={emo.id}
                            type="button"
                            onClick={() => handleChange('emotion', emo.id)}
                            className={cn(
                              "flex flex-col items-center justify-center p-4 rounded-xl border transition-all",
                              formData.emotion === emo.id ? "bg-yellow-500/10 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]" : "bg-black/40 border-white/5 hover:border-yellow-500/30"
                            )}
                          >
                            <span className="text-2xl mb-2">{emo.icon}</span>
                            <span className={cn("text-[9px] font-black uppercase tracking-tighter", formData.emotion === emo.id ? "text-yellow-400" : "text-slate-400")}>{emo.label}</span>
                          </button>
                        ))}
                      </div>

                      <div className="pt-6 mt-6 border-t border-white/5 space-y-4">
                        <div className="flex justify-between items-center mb-2">
                           <span className="text-[10px] uppercase font-black tracking-widest text-slate-500">Intensity Magnitude</span>
                           <span className="text-sm font-mono text-yellow-400">{formData.emotionIntensity}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={formData.emotionIntensity}
                          onChange={(e) => handleChange('emotionIntensity', parseInt(e.target.value))}
                          className="w-full h-1.5 bg-black/60 rounded-full appearance-none cursor-pointer accent-yellow-500 border border-white/5"
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="ai-3d" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-2">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-6">
                        <div className="flex items-center gap-3">
                           <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                             <Monitor size={18} />
                           </div>
                           <h3 className="text-xl font-black uppercase tracking-tight text-white">Spatial Framing</h3>
                        </div>

                        <div className="aspect-video bg-black rounded-2xl border border-white/5 relative overflow-hidden group">
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
                                  characterPositions: [], environmentId: 'default', props: [], lightingMood: 'natural', timeOfDay: 'day'
                                },
                                camera: { framing: 'medium', angle: 'eye-level', movement: { type: 'static' } },
                                timing: { duration: formData.duration * 24, inPoint: 0, outPoint: formData.duration * 24, transition: 'cut', transitionDuration: 0 },
                                generation: { aiProvider: 'comfyui', model: 'sdxl', prompt: formData.description, negativePrompt: '', comfyuiPreset: 'standard', parameters: { width: 1024, height: 576, steps: 20, cfgScale: 7.5, sampler: 'euler', scheduler: 'normal' }, styleReferences: [] },
                                dialogues: [],
                                status: 'pending' as any,
                              };
                              return <ShotPreview3D shot={productionShot} width={450} height={253} onCameraCaptured={handleCameraCaptured} />;
                           })()}
                           <div className="absolute top-4 left-4 z-10">
                              <Badge className="bg-indigo-600/80 backdrop-blur-md border-indigo-400/30 text-[9px] uppercase font-black">Live 3D Renderer</Badge>
                           </div>
                        </div>

                        {formData.referenceImage && (
                          <div className="space-y-2 animate-in fade-in duration-500">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Captured Keyframe</Label>
                            <div className="relative rounded-xl overflow-hidden border border-emerald-500/30 aspect-video">
                               <img src={formData.referenceImage} alt="Ref" className="w-full h-full object-cover" />
                               <div className="absolute inset-x-0 bottom-0 bg-emerald-500/20 backdrop-blur-md p-2 flex justify-between items-center">
                                  <span className="text-[9px] font-black uppercase text-emerald-400 tracking-tighter">Ready for AI Synthesis</span>
                                  <CheckCircle2 size={12} className="text-emerald-400" />
                               </div>
                            </div>
                          </div>
                        )}
                     </div>

                     <div className="space-y-6">
                        <div className="flex items-center gap-3">
                           <div className="p-2 bg-pink-500/20 rounded-lg text-pink-400">
                             <Zap size={18} />
                           </div>
                           <h3 className="text-xl font-black uppercase tracking-tight text-white">Visual Synthesis</h3>
                        </div>

                        <div className="p-6 bg-pink-500/5 border border-white/5 rounded-2xl space-y-4">
                           <div className="flex items-center justify-between">
                              <div className="flex flex-col">
                                 <span className="text-xs font-black uppercase text-pink-500 tracking-tight">Cine Engine High-Fi</span>
                                 <span className="text-[9px] text-slate-500">Multi-stage video + sound gen</span>
                              </div>
                              <Switch checked={useHighFidelity} onCheckedChange={setUseHighFidelity} className="data-[state=checked]:bg-pink-600" />
                           </div>
                           <div className="flex items-center justify-between">
                              <div className="flex flex-col">
                                 <span className="text-xs font-black uppercase text-blue-500 tracking-tight">Auto-Assemble</span>
                                 <span className="text-[9px] text-slate-500">Directly sync to timeline</span>
                              </div>
                              <Switch checked={autoAddToTimeline} onCheckedChange={setAutoAddToTimeline} className="data-[state=checked]:bg-blue-600" />
                           </div>
                           
                           <div className="space-y-2 pt-4 border-t border-white/5">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Synthesis Prompt</Label>
                              <Textarea 
                                value={imagePrompt} 
                                onChange={(e) => setImagePrompt(e.target.value)} 
                                rows={2} 
                                className="bg-black/60 border-white/5 text-xs" 
                                placeholder="Refine your synthesis prompt..."
                              />
                           </div>

                           <div className="flex gap-3">
                              <Button className="flex-1 bg-pink-600/20 border border-pink-500/30 text-pink-400 font-black uppercase tracking-widest text-[9px] h-10" onClick={handleGenerateImage} disabled={isGeneratingImage}>
                                 {isGeneratingImage ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Camera className="w-3 h-3 mr-2" />} Quick Keyframe
                              </Button>
                              <Button className="flex-1 bg-pink-600 hover:bg-pink-500 text-white font-black uppercase tracking-widest text-[9px] h-10 shadow-[0_0_15px_rgba(236,72,153,0.3)]" onClick={handleGenerateVideo} disabled={!formData.referenceImage || isGeneratingVideo}>
                                 {isGeneratingVideo ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Video className="w-3 h-3 mr-2" />} Render Sequence
                              </Button>
                           </div>

                           {generationTaskId && (
                             <div className="pt-4 animate-in slide-in-from-top-2">
                                <div className="flex justify-between items-center mb-1">
                                   <span className="text-[9px] uppercase font-black text-pink-400 tracking-widest">Synthesis Progress</span>
                                   <span className="text-[10px] font-mono text-white">{Math.round(generationProgress * 100)}%</span>
                                </div>
                                <div className="w-full bg-black/60 h-1.5 rounded-full overflow-hidden border border-white/5">
                                   <div className="h-full bg-pink-600 shadow-[0_0_10px_rgba(236,72,153,0.5)] transition-all duration-300" style={{ width: `${generationProgress * 100}%` }} />
                                </div>
                             </div>
                           )}
                        </div>
                     </div>
                   </div>
                </TabsContent>
              </div>

              <div className="p-8 border-t border-white/10 flex justify-between items-center bg-black/60">
                 <Button variant="outline" onClick={onClose} className="border-white/10 text-slate-400 hover:text-white hover:bg-white/5 px-8 font-black uppercase tracking-widest text-xs h-12">
                   Discard Changes
                 </Button>
                 <div className="flex gap-4">
                    {generatedVideoUrl && (
                      <Button variant="secondary" className="bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-black uppercase tracking-widest text-xs h-12 px-8" onClick={handleProlongVideo}>
                        <Video size={16} className="mr-2" /> Prolong Video
                      </Button>
                    )}
                    <Button onClick={() => handleSubmit()} className="bg-blue-600 hover:bg-blue-500 text-white px-10 font-black uppercase tracking-widest text-xs h-12 shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                       <ChevronRight size={18} className="mr-2" /> {mode === 'create' ? 'Assemble Shot' : 'Commit Refinement'}
                    </Button>
                 </div>
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </>
  );
}

export default ShotWizardModal;
