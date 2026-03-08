/**
 * Video Generation Dialog Component
 *
 * Dialog for generating videos using Wan 2.1 or LTX2 i2v workflows.
 * Provides engine selection (Wan 2.1 / LTX2), quality mode (Fast/Pro/Ultra),
 * parameter controls, and integrates with the CineProductionService.
 *
 * Requirements: 3.1, 3.2, 10.2, 10.4 + LTX2 R&D Integration
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Slider } from '../ui/slider';
import {
  Loader2,
  Video,
  AlertCircle,
  Image as ImageIcon,
  Zap,
  Star,
  Crown,
  Cpu,
  Film,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { LtxUseCasesPanel } from './LtxUseCasesPanel';
import { generationOrchestrator } from '../../services/GenerationOrchestrator';
import { useGenerationStore } from '../../stores/generationStore';
import type { VideoGenerationParams, GeneratedAsset } from '../../types/generation';
import { ErrorDisplay } from './ErrorDisplay';
import { PresetManager } from './PresetManager';
import type { VideoPreset } from '../../services/PresetManagementService';
import {
  categorizeError,
  preserveStateOnError,
  suggestParameterAdjustments,
  type CategorizedError,
  type PreservedState,
} from '../../utils/errorHandling';

// ==============================================================================
// TYPES
// ==============================================================================

type VideoEngine = 'wan21' | 'ltx2';
type QualityMode = 'draft' | 'standard' | 'cinematic' | 'ultra';

export interface VideoGenerationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sourceImage?: GeneratedAsset;
}

// ==============================================================================
// CONSTANTS
// ==============================================================================

const DEFAULT_PARAMS: Omit<VideoGenerationParams, 'inputImagePath'> = {
  prompt: '',
  frameCount: 121,
  frameRate: 25,
  width: 1280,
  height: 720,
  motionStrength: 0.8,
};

const COMMON_DIMENSIONS = [
  { label: '720p (1280×720)', width: 1280, height: 720 },
  { label: '1080p (1920×1080)', width: 1920, height: 1080 },
  { label: 'Portrait (768×1280)', width: 768, height: 1280 },
  { label: 'Square (1024×1024)', width: 1024, height: 1024 },
];

const FRAME_COUNT_PRESETS = [
  { label: '2s', frames: 49 },
  { label: '3s', frames: 73 },
  { label: '5s', frames: 121 },
  { label: '8s', frames: 193 },
  { label: '10s', frames: 241 },
  { label: '20s', frames: 481 },
];

const ENGINES: {
  id: VideoEngine;
  label: string;
  description: string;
  badge?: string;
  icon: React.ReactNode;
  chainType: string;
}[] = [
  {
    id: 'wan21',
    label: 'Wan 2.1',
    description: 'Modèle vidéo haute-fidélité. Idéal pour les scènes complexes et la cohérence des personnages.',
    icon: <Film className="h-5 w-5" />,
    chainType: 'generate_scene',
  },
  {
    id: 'ltx2',
    label: 'LTX2',
    description: 'Open-source, ultra-rapide, sans watermark. Parfait pour les itérations et la liberté créative totale.',
    badge: 'OPEN-SOURCE',
    icon: <Cpu className="h-5 w-5" />,
    chainType: 'ltx_video',
  },
];

const QUALITY_MODES: {
  id: QualityMode;
  label: string;
  description: string;
  steps: number;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    id: 'draft',
    label: 'Fast',
    description: 'Brouillons & itérations rapides',
    steps: 10,
    icon: <Zap className="h-4 w-4" />,
    color: '#3b82f6',
  },
  {
    id: 'standard',
    label: 'Pro',
    description: 'Réseaux sociaux & usage interne',
    steps: 20,
    icon: <Star className="h-4 w-4" />,
    color: '#8b5cf6',
  },
  {
    id: 'cinematic',
    label: 'Cinematic',
    description: 'Narratif & contenu premium',
    steps: 30,
    icon: <Film className="h-4 w-4" />,
    color: '#f59e0b',
  },
  {
    id: 'ultra',
    label: 'Ultra',
    description: 'Rendu final, clients & publicité',
    steps: 40,
    icon: <Crown className="h-4 w-4" />,
    color: '#ef4444',
  },
];

const ENGINE_PROMPTS: Record<VideoEngine, string[]> = {
  wan21: [
    'A person in a yellow hoodie typing on a laptop. Afternoon sunlight through a window. Camera slowly zooms in.',
    'Sweeping aerial shot of a futuristic city at night. Neon lights reflecting on wet streets. Camera dollies forward.',
    'Close-up of hands crafting jewelry. Warm studio lighting. Shallow depth of field, slight rack focus.',
  ],
  ltx2: [
    'A person in a yellow hoodie sitting at a wooden desk with a laptop and coffee mug. Afternoon sunlight coming through a window on the left. Soft keyboard typing sounds. Camera starts static, then slowly zooms in.',
    'Marketing product reveal: A smartphone rises from mist on a glass surface. Camera tracks 180° around the product. Cinematic lighting.',
    'Social media hook: Before/after split screen. Left side shows cluttered workspace, right side transforms into a clean modern setup.',
  ],
};

// ==============================================================================
// COMPONENT
// ==============================================================================

export const VideoGenerationDialog: React.FC<VideoGenerationDialogProps> = ({
  isOpen,
  onClose,
  sourceImage,
}) => {
  const { currentPipeline, completeStage, failStage, updateStageProgress } = useGenerationStore();

  // State
  const [params, setParams] = useState<Omit<VideoGenerationParams, 'inputImagePath'>>(DEFAULT_PARAMS);
  const [isGenerating, setIsGenerating] = useState(false);
  const [categorizedError, setCategorizedError] = useState<CategorizedError | null>(null);
  const [, setPreservedState] = useState<PreservedState | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [selectedEngine, setSelectedEngine] = useState<VideoEngine>('ltx2');
  const [selectedQuality, setSelectedQuality] = useState<QualityMode>('standard');
  const [showExamplePrompts, setShowExamplePrompts] = useState(false);
  const [showUseCases, setShowUseCases] = useState(false);

  const imageAsset = sourceImage || currentPipeline?.stages.image.result;

  // Pre-fill on open
  useEffect(() => {
    if (isOpen) {
      const promptStage = currentPipeline?.stages.prompt;
      const promptText = promptStage?.result?.text || '';
      const defaultMotionPrompt = promptText
        ? `${promptText}, smooth camera movement, cinematic motion`
        : '';

      setParams((prev) => ({
        ...prev,
        prompt: defaultMotionPrompt,
      }));

      if (imageAsset?.metadata.dimensions) {
        setParams((prev) => ({
          ...prev,
          width: imageAsset.metadata.dimensions!.width,
          height: imageAsset.metadata.dimensions!.height,
        }));
      }

      setCategorizedError(null);
      setValidationErrors({});
    }
  }, [isOpen, currentPipeline, imageAsset]);

  const updateParam = <K extends keyof Omit<VideoGenerationParams, 'inputImagePath'>>(
    key: K,
    value: Omit<VideoGenerationParams, 'inputImagePath'>[K]
  ) => {
    setParams((prev) => ({ ...prev, [key]: value }));
    if (validationErrors[key]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const applyDimensions = (width: number, height: number) =>
    setParams((prev) => ({ ...prev, width, height }));

  const applyFrameCount = (frames: number) =>
    setParams((prev) => ({ ...prev, frameCount: frames }));

  const handleLoadPreset = (preset: VideoPreset) =>
    setParams((prev) => ({ ...prev, ...preset.params }));

  const validateParams = (): boolean => {
    const errors: Record<string, string> = {};
    if (!imageAsset) errors.sourceImage = 'Source image is required. Generate an image first.';
    if (!params.prompt.trim()) errors.prompt = 'Motion description is required';
    if (params.width < 256 || params.width > 1920) errors.width = 'Width must be between 256 and 1920';
    if (params.height < 256 || params.height > 1920) errors.height = 'Height must be between 256 and 1920';
    if (params.width % 8 !== 0) errors.width = 'Width must be divisible by 8';
    if (params.height % 8 !== 0) errors.height = 'Height must be divisible by 8';
    if (params.frameCount < 25 || params.frameCount > 481) errors.frameCount = 'Frame count must be between 25 and 481';
    if (params.frameRate < 1 || params.frameRate > 60) errors.frameRate = 'Frame rate must be between 1 and 60';
    if (params.motionStrength < 0 || params.motionStrength > 1) errors.motionStrength = 'Motion strength must be between 0 and 1';
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const calculateDuration = (): string => (params.frameCount / params.frameRate).toFixed(1);

  const handleGenerate = async () => {
    if (!validateParams()) {
      setCategorizedError(categorizeError(new Error('Please fix the validation errors before generating')));
      return;
    }
    if (!imageAsset) {
      setCategorizedError(categorizeError(new Error('Source image is required.')));
      return;
    }

    setIsGenerating(true);
    setCategorizedError(null);

    try {
      const fullParams: VideoGenerationParams & { engine?: string; quality?: string } = {
        ...params,
        inputImagePath: imageAsset.url,
        engine: selectedEngine === 'ltx2' ? 'ltx_video' : 'wan21',
        quality: selectedQuality,
      };

      const result = await generationOrchestrator.generateVideo(
        fullParams,
        (progress) => updateStageProgress('video', progress),
        (error) => {
          const categorized = categorizeError(error);
          setCategorizedError(categorized);
          failStage('video', error.message);
          setPreservedState(preserveStateOnError(categorized, { params }, [imageAsset], null));
        }
      );

      completeStage('video', result);
      onClose();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to generate video');
      const categorized = categorizeError(error);
      setCategorizedError(categorized);
      setPreservedState(preserveStateOnError(categorized, { params }, [imageAsset], null));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    if (!isGenerating) onClose();
  };

  const currentQuality = QUALITY_MODES.find((q) => q.id === selectedQuality)!;
  const examplePrompts = ENGINE_PROMPTS[selectedEngine];

  // ==============================================================================
  // RENDER
  // ==============================================================================

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-3xl max-h-[92vh] overflow-y-auto"
        style={{
          background: 'linear-gradient(135deg, rgba(10,10,20,0.97) 0%, rgba(20,10,35,0.97) 100%)',
          border: '1px solid rgba(139,92,246,0.25)',
          boxShadow: '0 0 80px rgba(139,92,246,0.12), 0 25px 60px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Header */}
        <DialogHeader>
          <DialogTitle
            className="flex items-center gap-2 text-lg font-bold"
            style={{ color: '#e2d9f3' }}
          >
            <Video className="h-5 w-5" style={{ color: '#a78bfa' }} />
            Génération Vidéo Cinématique
          </DialogTitle>
          <DialogDescription style={{ color: '#8b7faa' }}>
            Choisis ton moteur et ton mode de qualité pour générer ta vidéo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* ─── PRESET MANAGER ─── */}
          <PresetManager
            type="video"
            currentParams={params}
            onLoadPreset={(preset) => handleLoadPreset(preset as VideoPreset)}
          />

          {/* ─── LTX2 USE CASES R&D MODULE ─── */}
          <div style={{ padding: '4px 0' }}>
            <button
              onClick={() => setShowUseCases(!showUseCases)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                background: showUseCases ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.03)',
                border: showUseCases ? '1px solid rgba(139,92,246,0.3)' : '1px solid rgba(139,92,246,0.1)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles className="h-4 w-4" style={{ color: '#a78bfa' }} />
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#e2d9f3' }}>
                  Cas d'usage réels (Templates R&D)
                </span>
                <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: 4, background: '#a78bfa33', color: '#c4b5fd' }}>NOUVEAU</span>
              </div>
              {showUseCases ? <ChevronUp className="h-4 w-4" style={{ color: '#8b7faa' }} /> : <ChevronDown className="h-4 w-4" style={{ color: '#8b7faa' }} />}
            </button>
            
            {showUseCases && (
              <div style={{ marginTop: 12, animation: 'fadeIn 0.2s ease' }}>
                <LtxUseCasesPanel 
                  onLaunch={(config) => {
                    updateParam('prompt', config.prompt);
                    setSelectedEngine(config.engine === 'ltx_video' ? 'ltx2' : 'wan21');
                    setSelectedQuality(config.quality);
                    setShowUseCases(false);
                    // Flash notification that preset was applied
                  }} 
                />
              </div>
            )}
          </div>

          {/* ─── ENGINE SELECTOR ─── */}
          <div className="space-y-3">
            <Label style={{ color: '#c4b5fd', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
              🎬 Moteur de génération
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {ENGINES.map((engine) => {
                const isSelected = selectedEngine === engine.id;
                return (
                  <button
                    key={engine.id}
                    onClick={() => setSelectedEngine(engine.id)}
                    disabled={isGenerating}
                    style={{
                      position: 'relative',
                      padding: '14px 16px',
                      borderRadius: '12px',
                      border: isSelected ? '2px solid #8b5cf6' : '1px solid rgba(139,92,246,0.2)',
                      background: isSelected
                        ? 'linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(109,40,217,0.15) 100%)'
                        : 'rgba(255,255,255,0.03)',
                      cursor: isGenerating ? 'not-allowed' : 'pointer',
                      transition: 'all 0.25s ease',
                      textAlign: 'left',
                      boxShadow: isSelected ? '0 0 20px rgba(139,92,246,0.25), inset 0 1px 0 rgba(255,255,255,0.05)' : 'none',
                    }}
                  >
                    {/* Badge */}
                    {engine.badge && (
                      <span style={{
                        position: 'absolute',
                        top: 8,
                        right: 10,
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        color: '#34d399',
                        background: 'rgba(52,211,153,0.12)',
                        border: '1px solid rgba(52,211,153,0.3)',
                        padding: '2px 6px',
                        borderRadius: 4,
                      }}>
                        {engine.badge}
                      </span>
                    )}
                    {/* Selected indicator */}
                    {isSelected && (
                      <span style={{
                        position: 'absolute',
                        top: 8,
                        right: engine.badge ? 82 : 10,
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: '#8b5cf6',
                        boxShadow: '0 0 8px #8b5cf6',
                        display: engine.badge ? 'none' : 'block',
                      }} />
                    )}
                    <div className="flex items-center gap-2 mb-1" style={{ color: isSelected ? '#c4b5fd' : '#8b7faa' }}>
                      {engine.icon}
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: isSelected ? '#e2d9f3' : '#a594c5' }}>
                        {engine.label}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.72rem', color: '#7c6f9e', lineHeight: 1.4, marginTop: 2 }}>
                      {engine.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ─── QUALITY MODE ─── */}
          <div className="space-y-3">
            <Label style={{ color: '#c4b5fd', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
              ⚙️ Mode de qualité
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {QUALITY_MODES.map((mode) => {
                const isSelected = selectedQuality === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => setSelectedQuality(mode.id)}
                    disabled={isGenerating}
                    style={{
                      padding: '12px 8px',
                      borderRadius: '10px',
                      border: isSelected ? `2px solid ${mode.color}` : '1px solid rgba(139,92,246,0.15)',
                      background: isSelected
                        ? `linear-gradient(135deg, ${mode.color}22 0%, ${mode.color}11 100%)`
                        : 'rgba(255,255,255,0.02)',
                      cursor: isGenerating ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      textAlign: 'center',
                      boxShadow: isSelected ? `0 0 16px ${mode.color}30` : 'none',
                    }}
                  >
                    <div className="flex justify-center mb-1" style={{ color: isSelected ? mode.color : '#6b5f8a' }}>
                      {mode.icon}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.78rem', color: isSelected ? '#e2d9f3' : '#8b7faa' }}>
                      {mode.label}
                    </div>
                    <div style={{ fontSize: '0.62rem', color: '#5c5075', marginTop: 2, lineHeight: 1.3 }}>
                      {mode.description}
                    </div>
                    <div style={{ fontSize: '0.6rem', color: mode.color, marginTop: 4, fontWeight: 600 }}>
                      {mode.steps} steps
                    </div>
                  </button>
                );
              })}
            </div>
            {/* Quality info banner */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 8,
              background: `${currentQuality.color}11`,
              border: `1px solid ${currentQuality.color}30`,
              fontSize: '0.72rem',
              color: '#a594c5',
            }}>
              <span style={{ color: currentQuality.color }}>{React.cloneElement(currentQuality.icon as React.ReactElement<{ className?: string }>, { className: 'h-3.5 w-3.5' })}</span>
              <span>
                <strong style={{ color: currentQuality.color }}>{currentQuality.label}</strong> {' — '}
                {currentQuality.id === 'draft' && 'Idéal pour tester rapidement tes idées. Lance en Fast, finalise en Ultra.'}
                {currentQuality.id === 'standard' && 'Bon équilibre qualité/vitesse. Parfait pour les réseaux sociaux & le contenu interne.'}
                {currentQuality.id === 'cinematic' && 'Haute qualité narrative. Convient pour les présentations et les vidéos de marque.'}
                {currentQuality.id === 'ultra' && 'Rendu final maximal. Pour les clients, publicités et publications professionnelles.'}
              </span>
            </div>
          </div>

          {/* ─── SOURCE IMAGE ─── */}
          {imageAsset ? (
            <div className="space-y-2">
              <Label style={{ color: '#c4b5fd', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                🖼️ Image source
              </Label>
              <div className="relative rounded-xl overflow-hidden" style={{ border: '1px solid rgba(139,92,246,0.2)' }}>
                <img
                  src={imageAsset.url}
                  alt="Source for video generation"
                  className="w-full h-auto max-h-52 object-contain"
                  style={{ background: 'rgba(0,0,0,0.3)' }}
                />
                <div
                  className="absolute top-2 right-2 flex items-center gap-1 text-xs px-2 py-1 rounded-md"
                  style={{ background: 'rgba(10,10,20,0.8)', color: '#a594c5', border: '1px solid rgba(139,92,246,0.2)' }}
                >
                  <ImageIcon className="h-3 w-3" />
                  {imageAsset.metadata.dimensions?.width} × {imageAsset.metadata.dimensions?.height}
                </div>
              </div>
            </div>
          ) : (
            <div
              className="rounded-xl p-4 flex items-start gap-3 text-sm"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
            >
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>Aucune image source disponible. Génère d'abord une image.</div>
            </div>
          )}

          {/* ─── PROMPT ─── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="prompt" style={{ color: '#c4b5fd', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                ✍️ Description du mouvement <span style={{ color: '#ef4444' }}>*</span>
              </Label>
              <button
                onClick={() => setShowExamplePrompts(!showExamplePrompts)}
                style={{ fontSize: '0.7rem', color: '#7c6f9e', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                {showExamplePrompts ? 'Masquer exemples' : '💡 Voir exemples'}
              </button>
            </div>
            {showExamplePrompts && (
              <div className="space-y-2 rounded-xl p-3" style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)' }}>
                <p style={{ fontSize: '0.7rem', color: '#7c6f9e', marginBottom: 6 }}>
                  Exemples de prompts cinématiques pour {selectedEngine === 'ltx2' ? 'LTX2' : 'Wan 2.1'} :
                </p>
                {examplePrompts.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => { updateParam('prompt', ex); setShowExamplePrompts(false); }}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderRadius: 8,
                      background: 'rgba(139,92,246,0.08)',
                      border: '1px solid rgba(139,92,246,0.15)',
                      color: '#a594c5',
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                      lineHeight: 1.5,
                    }}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            )}
            <Textarea
              id="prompt"
              value={params.prompt}
              onChange={(e) => updateParam('prompt', e.target.value)}
              placeholder={selectedEngine === 'ltx2'
                ? 'Ex: Une personne en hoodie jaune assise à un bureau. Lumière du soleil de l\'après-midi. La caméra commence statique puis zoome lentement...'
                : 'Décris le mouvement et les actions de la scène...'}
              className="min-h-[100px]"
              disabled={isGenerating}
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.2)', color: '#e2d9f3' }}
            />
            <p style={{ fontSize: '0.7rem', color: '#5c5075' }}>
              {selectedEngine === 'ltx2'
                ? '💡 LTX2 répond mieux aux prompts cinématiques détaillés (lumière, sons, angles de caméra).'
                : '📽️ Wan 2.1 excelle sur les mouvements de personnages et la cohérence temporelle.'}
            </p>
            {validationErrors.prompt && (
              <p className="flex items-center gap-1 text-sm" style={{ color: '#f87171' }}>
                <AlertCircle className="h-3 w-3" /> {validationErrors.prompt}
              </p>
            )}
          </div>

          {/* ─── FRAME COUNT ─── */}
          <div className="space-y-3">
            <Label style={{ color: '#c4b5fd', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
              🎞️ Durée
            </Label>
            <div className="grid grid-cols-6 gap-2">
              {FRAME_COUNT_PRESETS.map((preset) => {
                const isActive = params.frameCount === preset.frames;
                return (
                  <button
                    key={preset.label}
                    onClick={() => applyFrameCount(preset.frames)}
                    disabled={isGenerating}
                    style={{
                      padding: '8px 4px',
                      borderRadius: 8,
                      border: isActive ? '1px solid #8b5cf6' : '1px solid rgba(139,92,246,0.15)',
                      background: isActive ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.02)',
                      color: isActive ? '#c4b5fd' : '#6b5f8a',
                      fontWeight: isActive ? 700 : 400,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      textAlign: 'center',
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Slider
                  id="frameCount"
                  value={[params.frameCount]}
                  onValueChange={([v]) => updateParam('frameCount', v)}
                  min={25}
                  max={481}
                  step={8}
                  disabled={isGenerating}
                />
              </div>
              <div className="w-20">
                <Input
                  type="number"
                  value={params.frameCount}
                  onChange={(e) => updateParam('frameCount', parseInt(e.target.value) || 121)}
                  min={25}
                  max={481}
                  step={8}
                  disabled={isGenerating}
                  className="text-center"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.2)', color: '#e2d9f3' }}
                />
              </div>
            </div>
            <p style={{ fontSize: '0.7rem', color: '#5c5075' }}>
              Durée estimée : <strong style={{ color: '#a78bfa' }}>{calculateDuration()}s</strong> à {params.frameRate} fps
            </p>
          </div>

          {/* ─── FRAME RATE ─── */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="frameRate" style={{ color: '#c4b5fd', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                📸 Frame Rate
              </Label>
              <span style={{ fontSize: '0.75rem', color: '#7c6f9e' }}>{params.frameRate} fps</span>
            </div>
            <Slider
              id="frameRate"
              value={[params.frameRate]}
              onValueChange={([v]) => updateParam('frameRate', v)}
              min={1}
              max={60}
              step={1}
              disabled={isGenerating}
            />
          </div>

          {/* ─── DIMENSIONS ─── */}
          <div className="space-y-3">
            <Label style={{ color: '#c4b5fd', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
              📐 Dimensions
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {COMMON_DIMENSIONS.map((preset) => {
                const isActive = params.width === preset.width && params.height === preset.height;
                return (
                  <button
                    key={preset.label}
                    onClick={() => applyDimensions(preset.width, preset.height)}
                    disabled={isGenerating}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: isActive ? '1px solid #8b5cf6' : '1px solid rgba(139,92,246,0.15)',
                      background: isActive ? 'rgba(139,92,246,0.18)' : 'rgba(255,255,255,0.02)',
                      color: isActive ? '#c4b5fd' : '#7c6f9e',
                      fontWeight: isActive ? 700 : 400,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="width" style={{ color: '#8b7faa', fontSize: '0.72rem' }}>Largeur</Label>
                <Input
                  id="width"
                  type="number"
                  value={params.width}
                  onChange={(e) => updateParam('width', parseInt(e.target.value) || 1280)}
                  min={256}
                  max={1920}
                  step={8}
                  disabled={isGenerating}
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.2)', color: '#e2d9f3' }}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="height" style={{ color: '#8b7faa', fontSize: '0.72rem' }}>Hauteur</Label>
                <Input
                  id="height"
                  type="number"
                  value={params.height}
                  onChange={(e) => updateParam('height', parseInt(e.target.value) || 720)}
                  min={256}
                  max={1920}
                  step={8}
                  disabled={isGenerating}
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.2)', color: '#e2d9f3' }}
                />
              </div>
            </div>
          </div>

          {/* ─── MOTION STRENGTH ─── */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="motionStrength" style={{ color: '#c4b5fd', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                💫 Intensité du mouvement
              </Label>
              <span style={{ fontSize: '0.75rem', color: '#7c6f9e' }}>{params.motionStrength.toFixed(2)}</span>
            </div>
            <Slider
              id="motionStrength"
              value={[params.motionStrength]}
              onValueChange={([v]) => updateParam('motionStrength', v)}
              min={0}
              max={1}
              step={0.05}
              disabled={isGenerating}
            />
            <p style={{ fontSize: '0.7rem', color: '#5c5075' }}>0 = subtil · 1 = intense & dramatique</p>
          </div>

          {/* ─── ERRORS ─── */}
          {categorizedError && (
            <ErrorDisplay
              error={categorizedError}
              onRetry={categorizedError.canRetry ? handleGenerate : undefined}
              onAdjustParameters={() => {
                const suggestions = suggestParameterAdjustments(categorizedError, params);
                if (suggestions) setParams((prev) => ({ ...prev, ...suggestions }));
                setCategorizedError(null);
              }}
              onDismiss={() => setCategorizedError(null)}
              className="mt-4"
            />
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isGenerating}
            style={{ background: 'transparent', border: '1px solid rgba(139,92,246,0.3)', color: '#8b7faa' }}
          >
            Annuler
          </Button>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !imageAsset || !params.prompt.trim()}
            style={{
              background: isGenerating
                ? 'rgba(139,92,246,0.3)'
                : `linear-gradient(135deg, ${currentQuality.color} 0%, #7c3aed 100%)`,
              border: 'none',
              color: '#fff',
              fontWeight: 700,
              padding: '10px 24px',
              boxShadow: isGenerating ? 'none' : `0 0 20px ${currentQuality.color}40`,
              transition: 'all 0.2s',
            }}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Génération en cours…
              </>
            ) : (
              <>
                {currentQuality.icon}
                <span className="ml-2">
                  Générer · {selectedEngine === 'ltx2' ? 'LTX2' : 'Wan 2.1'} · {currentQuality.label}
                </span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
