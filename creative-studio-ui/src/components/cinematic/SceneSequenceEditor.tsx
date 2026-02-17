import React, { useState, useMemo, useCallback } from 'react';
import {
    Clock,
    Plus,
    Trash2,
    GripVertical,
    Zap,
    Sparkles,
    Wand2,
    ChevronRight,
    MonitorPlay,
    Volume2,
    Music
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/stores/useAppStore';
import { wanVideoService } from '@/services/wanVideoService';
import { enhancePrompt } from '@/services/cinematicPromptService';
import './SceneSequenceEditor.css';

interface ShotSegment {
    id: string;
    title: string;
    prompt: string;
    duration: number; // in seconds
    startTime: number;
    motionIntensity: number; // 1-10
    cameraMovement?: 'forward' | 'backward' | 'pan_left' | 'pan_right' | 'zoom_in' | 'zoom_out' | 'fixed';
    sfxPrompt?: string;
}

/**
 * Scene Sequence Editor (Multi-shot Timeline)
 * Allows grouping multiple shots into a single 15-second cinematic generation.
 * Inspired by Kling 3.0 Custom Multi-shot.
 */
export function SceneSequenceEditor() {
    const { project } = useAppStore();
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [currentStep, setCurrentStep] = useState<string>('');
    const [segments, setSegments] = useState<ShotSegment[]>([
        {
            id: '1',
            title: 'Plan d\'ouverture',
            prompt: 'Un plan large d\'une ville cyberpunk sous la pluie, néons reflétés dans les flaques.',
            duration: 3,
            startTime: 0,
            motionIntensity: 5,
            cameraMovement: 'zoom_in',
            sfxPrompt: 'Bruit de pluie lointaine, bourdonnement de néons'
        },
        {
            id: '2',
            title: 'Action Principal',
            prompt: 'Gros plan sur le héros marchant dans la ruelle, air déterminé.',
            duration: 5,
            startTime: 3,
            motionIntensity: 7,
            cameraMovement: 'pan_right',
            sfxPrompt: 'Bruit de pas sur métal, claquement de bottes'
        },
        {
            id: '3',
            title: 'Transition/Fin',
            prompt: 'Le héros s\'arrête et regarde vers la caméra, zoom lent sur ses yeux.',
            duration: 2,
            startTime: 8,
            motionIntensity: 5,
            cameraMovement: 'fixed',
            sfxPrompt: 'Respiration lourde, vent siffle'
        }
    ]);

    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

    const totalDuration = useMemo(() => segments.reduce((acc, s) => acc + s.duration, 0), [segments]);
    const MAX_DURATION = 15;

    const handleAddSegment = () => {
        if (totalDuration >= MAX_DURATION) return;

        const newId = crypto.randomUUID();
        const duration = Math.min(3, MAX_DURATION - totalDuration);

        setSegments([...segments, {
            id: newId,
            title: `Nouveau Plan ${segments.length + 1}`,
            prompt: '',
            duration: duration,
            startTime: totalDuration,
            motionIntensity: 5,
            cameraMovement: 'fixed',
            sfxPrompt: ''
        }]);
    };

    const handleRemoveSegment = (id: string) => {
        const newSegments = segments.filter(s => s.id !== id);
        // Recalculate start times
        let currentTime = 0;
        const updated = newSegments.map(s => {
            const segment = { ...s, startTime: currentTime };
            currentTime += s.duration;
            return segment;
        });
        setSegments(updated);
    };

    const handleUpdateDuration = (id: string, newDuration: number) => {
        const segmentIndex = segments.findIndex(s => s.id === id);
        if (segmentIndex === -1) return;

        const otherSegmentsDuration = totalDuration - segments[segmentIndex].duration;
        const clampedDuration = Math.max(1, Math.min(newDuration, MAX_DURATION - otherSegmentsDuration));

        const newSegments = [...segments];
        newSegments[segmentIndex].duration = clampedDuration;

        // Recalculate all start times
        let currentTime = 0;
        const updated = newSegments.map(s => {
            const segment = { ...s, startTime: currentTime };
            currentTime += s.duration;
            return segment;
        });
        setSegments(updated);
    };

    const handleEnhancePrompt = (index: number) => {
        const newSegments = [...segments];
        newSegments[index].prompt = enhancePrompt(newSegments[index].prompt);
        setSegments(newSegments);
    };

    const handleGenerateSequence = async () => {
        if (!project) return;

        setIsGenerating(true);
        setGenerationProgress(0);

        try {
            // Join all segment prompts for the global description
            const fullDescription = segments.map(s =>
                `[${s.startTime}s - ${s.startTime + s.duration}s]: ${s.cameraMovement ? `Camera ${s.cameraMovement}, ` : ''}${s.prompt} (Motion: ${s.motionIntensity}) ${s.sfxPrompt ? `[SFX: ${s.sfxPrompt}]` : ''}`
            ).join('\n');

            const result = await wanVideoService.generateSequence({
                projectId: project.id,
                sceneId: `seq_${Date.now()}`,
                sceneDescription: fullDescription,
                videoPrompt: fullDescription, // Wan will follow the time-coded prompts
                style: (project.metadata?.style as string) || 'Cinematic'
            }, (progress, step) => {
                setGenerationProgress(progress);
                if (step) setCurrentStep(step);
            });

            if (result.results && result.results.length > 0) {
                // Prioritize muxed_video > video > speaking_video
                const videoRes = result.results.find(r => r.step === 'muxed_video') ||
                    result.results.find(r => r.step === 'video' || r.step === 'speaking_video');

                if (videoRes && videoRes.output && videoRes.output.filename) {
                    setGeneratedVideoUrl(`/output/${videoRes.output.filename}`);
                }
            }
        } catch (error) {
            console.error('Generation failed:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="scene-sequence-editor">
            <div className="scene-header">
                <div className="scene-info">
                    <MonitorPlay className="w-5 h-5 text-primary" />
                    <h3>Séquence Multi-shot (15s)</h3>
                </div>
                <div className="scene-stats">
                    <Badge variant={totalDuration > 15 ? "destructive" : "outline"} className="duration-badge">
                        <Clock className="w-3 h-3 mr-1" />
                        {totalDuration.toFixed(1)}s / {MAX_DURATION}s
                    </Badge>
                    <Button
                        size="sm"
                        variant="default"
                        className="generate-scene-btn"
                        onClick={handleGenerateSequence}
                        disabled={isGenerating || totalDuration > MAX_DURATION}
                    >
                        {isGenerating ? (
                            <span className="flex items-center">
                                <span className="animate-spin mr-2">⏳</span> {generationProgress}%
                            </span>
                        ) : (
                            <>
                                <Wand2 className="w-4 h-4 mr-1" />
                                Générer Séquence
                            </>
                        )}
                    </Button>
                </div>
            </div>

            <div className="timeline-visual-container">
                <div className="timeline-labels">
                    <span>0s</span>
                    <span>5s</span>
                    <span>10s</span>
                    <span>15s</span>
                </div>
                <div className="timeline-track-main">
                    {segments.map((segment, index) => (
                        <div
                            key={segment.id}
                            className="timeline-segment-block"
                            style={{
                                width: `${(segment.duration / MAX_DURATION) * 100}%`,
                                left: `${(segment.startTime / MAX_DURATION) * 100}%`
                            }}
                            title={`${segment.title} (${segment.duration}s)`}
                        >
                            <div className="segment-indicator">
                                <span className="segment-number">{index + 1}</span>
                            </div>
                        </div>
                    ))}
                    {/* Progress bar simulation or empty space */}
                    <div className="timeline-empty-space" style={{ width: `${((MAX_DURATION - totalDuration) / MAX_DURATION) * 100}%`, left: `${(totalDuration / MAX_DURATION) * 100}%` }} />
                </div>
            </div>

            <div className="segments-list">
                {segments.map((segment, index) => (
                    <div key={segment.id} className="segment-item-card">
                        <div className="segment-drag-handle">
                            <GripVertical className="w-4 h-4 text-muted-foreground" />
                        </div>

                        <div className="segment-content">
                            <div className="segment-header-row">
                                <div className="segment-title-area">
                                    <span className="segment-index">#{index + 1}</span>
                                    <input
                                        className="segment-title-input"
                                        value={segment.title}
                                        onChange={(e) => {
                                            const newSegments = [...segments];
                                            newSegments[index].title = e.target.value;
                                            setSegments(newSegments);
                                        }}
                                    />
                                </div>
                                <div className="segment-actions-area">
                                    <div className="duration-control">
                                        <Slider
                                            value={[segment.duration]}
                                            max={10}
                                            min={1}
                                            step={0.5}
                                            onValueChange={(val) => handleUpdateDuration(segment.id, val[0])}
                                            className="duration-slider"
                                        />
                                        <span className="duration-text">{segment.duration}s</span>
                                    </div>
                                    <div className="motion-control">
                                        <span className="text-[10px] text-muted-foreground mr-2">Mouvement</span>
                                        <Slider
                                            value={[segment.motionIntensity]}
                                            max={10}
                                            min={1}
                                            step={1}
                                            onValueChange={(val) => {
                                                const newSegments = [...segments];
                                                newSegments[index].motionIntensity = val[0];
                                                setSegments(newSegments);
                                            }}
                                            className="motion-slider"
                                        />
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveSegment(segment.id)}>
                                        <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                </div>
                            </div>

                            <div className="camera-motion-quick-actions">
                                <div className="quick-action-btns">
                                    {(['zoom_in', 'zoom_out', 'pan_left', 'pan_right', 'fixed'] as any[]).map(move => (
                                        <Button
                                            key={move}
                                            variant={segment.cameraMovement === move ? 'secondary' : 'ghost'}
                                            size="sm"
                                            className="px-2 h-7 text-[10px]"
                                            onClick={() => {
                                                const newSegments = [...segments];
                                                newSegments[index].cameraMovement = move;
                                                setSegments(newSegments);
                                            }}
                                        >
                                            {move.replace('_', ' ').toUpperCase()}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <div className="segment-prompt-area">
                                <textarea
                                    className="segment-prompt-input"
                                    placeholder="Décrivez ce qui se passe dans ce segment..."
                                    value={segment.prompt}
                                    onChange={(e) => {
                                        const newSegments = [...segments];
                                        newSegments[index].prompt = e.target.value;
                                        setSegments(newSegments);
                                    }}
                                />
                            </div>

                            <div className="segment-sfx-area">
                                <div className="sfx-input-wrapper">
                                    <Volume2 className="w-3 h-3 text-primary mr-2" />
                                    <input
                                        type="text"
                                        className="sfx-prompt-input"
                                        placeholder="SFX: Bruitages (ex: explosion, galop, métal...)"
                                        value={segment.sfxPrompt || ''}
                                        onChange={(e) => {
                                            const newSegments = [...segments];
                                            newSegments[index].sfxPrompt = e.target.value;
                                            setSegments(newSegments);
                                        }}
                                    />
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-[10px] h-6 ml-auto"
                                        onClick={() => handleEnhancePrompt(index)}
                                    >
                                        <Sparkles className="w-3 h-3 mr-1" /> Enrichir
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {totalDuration < MAX_DURATION && (
                    <Button
                        variant="outline"
                        className="add-segment-btn w-full border-dashed"
                        onClick={handleAddSegment}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter un segment
                    </Button>
                )}
            </div>

            <div className="transition-pacing-area">
                <div className="section-title">
                    <Zap className="w-4 h-4 mr-2 text-yellow-500" />
                    Transitions & Rythme
                </div>
                <div className="pacing-options">
                    <Badge variant="secondary" className="cursor-pointer hover:bg-primary hover:text-primary-foreground">Cinématique</Badge>
                    <Badge variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground">Action Rapide</Badge>
                    <Badge variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground">Contemplatif</Badge>
                </div>
            </div>

            {generatedVideoUrl && (
                <div className="sequence-preview-result">
                    <div className="section-title">
                        <MonitorPlay className="w-4 h-4 mr-2 text-primary" />
                        Aperçu de la Séquence Générée
                    </div>
                    <div className="preview-video-wrapper">
                        <video src={generatedVideoUrl} controls className="preview-video" />
                        <div className="preview-actions">
                            <Button
                                variant="secondary"
                                size="sm"
                                className="download-result-btn"
                                onClick={() => window.open(generatedVideoUrl, '_blank')}
                            >
                                <Plus className="w-4 h-4 mr-1 rotate-45" /> Ouvrir en Plein Écran
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
