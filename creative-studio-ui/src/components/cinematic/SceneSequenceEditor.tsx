import React, { useState, useMemo } from 'react';
import { Reorder, AnimatePresence, useDragControls } from 'framer-motion';
import {
    Plus,
    Trash2,
    GripVertical,
    Zap,
    Sparkles,
    MonitorPlay,
    Volume2,
    Maximize2,
    Minimize2,
    Settings2,
    Layout,
    Clock,
    AlertTriangle, 
    Info, 
    CheckCircle2,
    Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/stores/useAppStore';
import { useMemoryStore } from '@/stores/memoryStore';
import { wanVideoService } from '@/services/wanVideoService';
import { CinematicAdviceService } from '@/services/cinematic/CinematicAdviceService';
import { promptGenerationService } from '@/services/PromptGenerationService';
import './SceneSequenceEditor.css';

interface ShotSegment {
    id: string;
    title: string;
    prompt: string;
    duration: number; // in seconds
    startTime: number;
    motionIntensity: number; // 1-10
    cameraMovement?: 'zoom_in' | 'zoom_out' | 'pan_left' | 'pan_right' | 'fixed' | 'forward' | 'backward';
    sfxPrompt?: string;
}

interface SegmentItemProps {
    segment: ShotSegment;
    index: number;
    focusedSegmentId: string | null;
    setFocusedSegmentId: (id: string | null) => void;
    viewMode: 'timeline' | 'grid';
    handleUpdateDuration: (id: string, duration: number) => void;
    handleRemoveSegment: (id: string) => void;
    updateSegment: (id: string, updates: Partial<ShotSegment>) => void;
    handleEnhancePrompt: (index: number) => void;
    isThinking: boolean;
}

const SegmentItem: React.FC<SegmentItemProps> = ({
    segment,
    index,
    focusedSegmentId,
    setFocusedSegmentId,
    viewMode,
    handleUpdateDuration,
    handleRemoveSegment,
    updateSegment,
    handleEnhancePrompt,
    isThinking
}) => {
    const controls = useDragControls();
    const isFocused = focusedSegmentId === segment.id;

    return (
        <Reorder.Item
            value={segment}
            dragListener={false}
            dragControls={controls}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`segment-item-card ${isFocused ? 'focused' : ''} ${focusedSegmentId && !isFocused ? 'dimmed' : ''}`}
            onClick={() => viewMode === 'grid' && setFocusedSegmentId(segment.id)}
        >
            <div 
                className="segment-drag-handle" 
                onPointerDown={(e) => controls.start(e)}
            >
                <GripVertical className="w-4 h-4 text-muted-foreground opacity-30" />
            </div>

            <div className="segment-content">
                <div className="segment-header-row">
                    <div className="segment-title-area">
                        <span className="segment-index">#{index + 1}</span>
                        <input
                            className="segment-title-input"
                            value={segment.title}
                            onChange={(e) => updateSegment(segment.id, { title: e.target.value })}
                            onClick={(e) => e.stopPropagation()}
                            aria-label="Titre du plan"
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
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                                e.stopPropagation();
                                setFocusedSegmentId(isFocused ? null : segment.id);
                            }}
                        >
                            {isFocused ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveSegment(segment.id);
                        }}>
                            <Trash2 className="w-4 h-4 text-destructive/60 hover:text-destructive" />
                        </Button>
                    </div>
                </div>

                {!focusedSegmentId && (
                    <div className="compact-prompt-preview">
                        {segment.prompt || <span className="italic text-muted-foreground opacity-50">Aucune description...</span>}
                    </div>
                )}

                {isFocused && (
                    <div className="focused-editor-panel animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="parameter-grid">
                            <div className="parameter-item">
                                <label><Settings2 className="w-3 h-3 inline mr-1" /> Intensité de mouvement</label>
                                <Slider
                                    value={[segment.motionIntensity]}
                                    max={10}
                                    min={1}
                                    step={1}
                                    onValueChange={(val) => updateSegment(segment.id, { motionIntensity: val[0] })}
                                />
                            </div>
                            <div className="parameter-item">
                                <label><MonitorPlay className="w-3 h-3 inline mr-1" /> Mouvement Caméra</label>
                                <div className="camera-btns grid grid-cols-3 gap-1">
                                    {(['zoom_in', 'zoom_out', 'pan_left', 'pan_right', 'fixed'] as const).map(move => (
                                        <Button
                                            key={move}
                                            variant={segment.cameraMovement === move ? 'secondary' : 'outline'}
                                            size="sm"
                                            className="px-1 h-7 text-[9px]"
                                            onClick={() => updateSegment(segment.id, { cameraMovement: move })}
                                        >
                                            {move.replace('_', ' ').toUpperCase()}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="segment-prompt-area">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-primary">Description Cinématique</label>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-[10px] h-6"
                                    onClick={() => handleEnhancePrompt(index)}
                                    disabled={isThinking}
                                >
                                    {isThinking ? (
                                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    ) : (
                                        <Sparkles className="w-3 h-3 mr-1" />
                                    )}
                                    {isThinking ? 'IA Réfléchit...' : 'Enrichir par IA'}
                                </Button>
                            </div>
                            <textarea
                                className="segment-prompt-input"
                                placeholder="Décrivez l'action complexe du plan..."
                                value={segment.prompt}
                                onChange={(e) => updateSegment(segment.id, { prompt: e.target.value })}
                                aria-label="Description du plan"
                            />
                        </div>

                        <div className="segment-sfx-area">
                            <div className="sfx-input-wrapper">
                                <Volume2 className="w-3 h-3 text-primary mr-2" />
                                <input
                                    type="text"
                                    className="sfx-prompt-input"
                                    placeholder="Ambiances sonores & SFX..."
                                    value={segment.sfxPrompt || ''}
                                    onChange={(e) => updateSegment(segment.id, { sfxPrompt: e.target.value })}
                                    aria-label="Prompts SFX"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Reorder.Item>
    );
};

export function SceneSequenceEditor() {
    const { project, characters } = useAppStore();
    const { workingContext } = useMemoryStore();
    const [isGenerating, setIsGenerating] = useState(false);
    const [focusedSegmentId, setFocusedSegmentId] = useState<string | null>(null);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [viewMode, setViewMode] = useState<'timeline' | 'grid'>('timeline');
    const [aiThinkingId, setAiThinkingId] = useState<string | null>(null);
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

    const updateSegment = (id: string, updates: Partial<ShotSegment>) => {
        setSegments(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    };

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
        if (focusedSegmentId === id) setFocusedSegmentId(null);
        handleReorder(newSegments);
    };

    const handleUpdateDuration = (id: string, newDuration: number) => {
        const segmentIndex = segments.findIndex(s => s.id === id);
        if (segmentIndex === -1) return;

        const otherSegmentsDuration = totalDuration - segments[segmentIndex].duration;
        const clampedDuration = Math.max(1, Math.min(newDuration, MAX_DURATION - otherSegmentsDuration));

        const newSegments = [...segments];
        newSegments[segmentIndex].duration = clampedDuration;
        handleReorder(newSegments);
    };

    const handleReorder = (newOrder: ShotSegment[]) => {
        let currentTime = 0;
        const updated = newOrder.map(s => {
            const segment = { ...s, startTime: currentTime };
            currentTime += s.duration;
            return segment;
        });
        setSegments(updated);
    };

    const handleEnhancePrompt = async (index: number) => {
        const segment = segments[index];
        setAiThinkingId(segment.id);
        
        try {
            const contextDescription = `Project: ${project?.name || 'Untitled'}. 
                Style: ${project?.metadata?.style || 'Standard'}. 
                Global Protocol: ${workingContext}. 
                Sequence Duration: ${totalDuration}s.
                Previous shot: ${index > 0 ? segments[index-1].prompt : 'None'}.`;
            
            console.log('[Directorial AI] Requesting AI Enhancement for segment:', segment.id);
            const enhanced = await promptGenerationService.generateAIEnhancedPrompt(segment.prompt, contextDescription);
            
            updateSegment(segment.id, { prompt: enhanced });
        } catch (error) {
            console.error('AI Enhancement failed:', error);
        } finally {
            setAiThinkingId(null);
        }
    };

    const handleGenerateSequence = async () => {
        if (!project) return;
        setIsGenerating(true);
        setGenerationProgress(0);

        try {
            const fullDescription = segments.map(s =>
                `[${s.startTime}s - ${s.startTime + s.duration}s]: ${s.cameraMovement ? `Camera ${s.cameraMovement}, ` : ''}${s.prompt} (Motion: ${s.motionIntensity}) ${s.sfxPrompt ? `[SFX: ${s.sfxPrompt}]` : ''}`
            ).join('\n');

            const result = await wanVideoService.generateSequence({
                projectId: project.id,
                sceneId: `seq_${Date.now()}`,
                sceneDescription: fullDescription,
                videoPrompt: fullDescription,
                style: (project.metadata?.style as string) || 'Cinematic'
            }, (progress) => {
                setGenerationProgress(progress);
            });

            if (result.results && result.results.length > 0) {
                const videoRes = result.results.find(r => r.step === 'muxed_video') ||
                    result.results.find(r => r.step === 'video' || r.step === 'speaking_video');

                if (videoRes && videoRes.output && (videoRes.output as { filename?: string }).filename) {
                    setGeneratedVideoUrl(`/output/${(videoRes.output as { filename: string }).filename}`);
                }
            }
        } catch (error) {
            console.error('Generation failed:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const focusedSegment = useMemo(() =>
        segments.find(s => s.id === focusedSegmentId),
        [segments, focusedSegmentId]
    );

    const intelligentAdvice = useMemo(() => {
        if (!focusedSegment) return [];
        return CinematicAdviceService.getAdvice(
            focusedSegment,
            segments,
            project,
            characters,
            workingContext
        );
    }, [focusedSegment, segments, project, characters, workingContext]);

    const sequenceAdvice = useMemo(() => {
        return CinematicAdviceService.getSequenceAdvice(segments, MAX_DURATION);
    }, [segments]);

    return (
        <div className="scene-sequence-editor">
            <div className="scene-header">
                <div className="scene-info">
                    <Layout className="w-5 h-5 text-primary" />
                    <div className="header-text-group">
                        <h3>Séquence Cinématique Hyper-Edit</h3>
                        <p className="text-[10px] text-muted-foreground">Édition multi-plans intelligente</p>
                    </div>
                </div>
                <div className="scene-toolbar">
                    <div className="view-toggle">
                        <Button
                            size="sm"
                            variant={viewMode === 'timeline' ? 'secondary' : 'ghost'}
                            onClick={() => setViewMode('timeline')}
                            className="h-8 w-8 p-0"
                        >
                            <MonitorPlay className="w-4 h-4" />
                        </Button>
                        <Button
                            size="sm"
                            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                            onClick={() => setViewMode('grid')}
                            className="h-8 w-8 p-0"
                        >
                            <Layout className="w-4 h-4" />
                        </Button>
                    </div>
                    <div className="divider"></div>
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
                                    <Zap className="w-4 h-4 mr-1 fill-current" />
                                    Générer
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            <div className={`editor-main-layout ${focusedSegmentId ? 'has-focus' : ''}`}>
                <div className="timeline-section">
                    <div className="timeline-visual-container">
                        <div className="timeline-labels">
                            <span className="label-marker">0s</span>
                            <span className="label-marker">5s</span>
                            <span className="label-marker">10s</span>
                            <span className="label-marker">15s</span>
                        </div>
                        <div className="timeline-track-main">
                            <div className="timeline-playhead"></div>
                            
                            {sequenceAdvice.map((adv, i) => adv.level === 'warning' && (
                                <div key={adv.id} className="timeline-warning-bar animate-pulse" style={{ top: i * 2 }} />
                            ))}

                            {segments.map((segment, index) => (
                                <div
                                    key={segment.id}
                                    className={`timeline-segment-block ${focusedSegmentId === segment.id ? 'active' : ''}`}
                                    style={{
                                        width: `${(segment.duration / MAX_DURATION) * 100}%`,
                                        left: `${(segment.startTime / MAX_DURATION) * 100}%`
                                    }}
                                    onClick={() => setFocusedSegmentId(segment.id === focusedSegmentId ? null : segment.id)}
                                >
                                    <div className="segment-indicator">
                                        <span className="segment-number">{index + 1}</span>
                                    </div>
                                    <div className="segment-label-overlay">{segment.title}</div>
                                    <div className="segment-status-dots">
                                        {segment.prompt && <div className="dot prompt"></div>}
                                        {segment.sfxPrompt && <div className="dot sfx"></div>}
                                    </div>
                                </div>
                            ))}
                            <div className="timeline-empty-space" style={{ width: `${((MAX_DURATION - totalDuration) / MAX_DURATION) * 100}%`, left: `${(totalDuration / MAX_DURATION) * 100}%` }} />
                        </div>
                    </div>

                    <Reorder.Group 
                        axis="y" 
                        values={segments} 
                        onReorder={handleReorder}
                        className={`segments-container ${viewMode}`}
                    >
                        <AnimatePresence mode="popLayout">
                            {segments.map((segment, index) => (
                                <SegmentItem
                                    key={segment.id}
                                    segment={segment}
                                    index={index}
                                    focusedSegmentId={focusedSegmentId}
                                    setFocusedSegmentId={setFocusedSegmentId}
                                    viewMode={viewMode}
                                    handleUpdateDuration={handleUpdateDuration}
                                    handleRemoveSegment={handleRemoveSegment}
                                    updateSegment={updateSegment}
                                    handleEnhancePrompt={handleEnhancePrompt}
                                    isThinking={aiThinkingId === segment.id}
                                />
                            ))}
                        </AnimatePresence>

                        {totalDuration < MAX_DURATION && (
                            <Button
                                variant="outline"
                                className="add-segment-btn w-full border-dashed"
                                onClick={handleAddSegment}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Nouveau Plan
                            </Button>
                        )}
                    </Reorder.Group>
                </div>

                {focusedSegment && (
                    <div className="inspector-sidebar animate-in slide-in-from-right duration-500">
                        <div className="sidebar-header">
                            <Settings2 className="w-4 h-4 text-primary" />
                            <h4>Inspecteur de Plan</h4>
                        </div>
                        <div className="sidebar-content">
                            <div className="inspector-card">
                                <div className="card-label">Timing</div>
                                <div className="card-value">{focusedSegment.startTime.toFixed(1)}s - {(focusedSegment.startTime + focusedSegment.duration).toFixed(1)}s</div>
                            </div>
                            <div className="inspector-card">
                                <div className="card-label">Modèle suggéré</div>
                                <div className="card-value">Wan-Video v1.0</div>
                            </div>
                            <div className="inspector-card">
                                <div className="card-label">Conseils IA</div>
                                <div className="advice-list mt-2 space-y-2">
                                    {intelligentAdvice.length > 0 ? intelligentAdvice.map(adv => (
                                        <div key={adv.id} className={`advice-item level-${adv.level} flex gap-2 p-2 rounded bg-muted/50 border-l-2 ${adv.level === 'warning' ? 'border-yellow-500' : adv.level === 'success' ? 'border-green-500' : 'border-blue-500'}`}>
                                            {adv.level === 'warning' && <AlertTriangle className="w-3 h-3 text-yellow-500 shrink-0 mt-0.5" />}
                                            {adv.level === 'info' && <Info className="w-3 h-3 text-blue-500 shrink-0 mt-0.5" />}
                                            {adv.level === 'success' && <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0 mt-0.5" />}
                                            <div className="flex-1">
                                                <p className="text-[10px] leading-tight">{adv.text}</p>
                                                {adv.actionLabel && (
                                                    <button 
                                                        className="text-[9px] text-primary font-bold mt-1 hover:underline text-left block"
                                                        onClick={() => adv.actionLabel === 'Enrichir par IA' && handleEnhancePrompt(segments.findIndex(s => s.id === focusedSegment.id))}
                                                    >
                                                        {adv.actionLabel} →
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )) : (
                                        <p className="text-[10px] text-muted-foreground italic">Aucune anomalie détectée. Beau travail !</p>
                                    )}
                                </div>
                            </div>

                            <Button
                                className="w-full mt-auto"
                                variant="outline"
                                onClick={() => setFocusedSegmentId(null)}
                            >
                                Fermer l'Inspecteur
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <div className="footer-controls">
                <div className="transition-pacing-area">
                    <div className="section-title">
                        <Zap className="w-4 h-4 mr-2 text-yellow-500 fill-current" />
                        Style de Montage
                    </div>
                    <div className="pacing-options">
                        <Badge variant="secondary" className="cursor-pointer">Cinématique</Badge>
                        <Badge variant="outline" className="opacity-50">Action Dynamique</Badge>
                        <Badge variant="outline" className="opacity-50">Documentaire</Badge>
                    </div>
                </div>

                {generatedVideoUrl && (
                    <div className="sequence-preview-result">
                        <div className="section-title">
                            <MonitorPlay className="w-4 h-4 mr-2 text-primary" />
                            Aperçu Final
                        </div>
                        <div className="preview-video-wrapper">
                            <video src={generatedVideoUrl} controls className="preview-video" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default SceneSequenceEditor;
