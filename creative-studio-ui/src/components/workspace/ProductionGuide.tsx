import React, { useState } from 'react';
import {
    Clapperboard,
    Mic2,
    Image as ImageIcon,
    Film,
    Edit3,
    ChevronDown,
    ChevronUp,
    User,
    Layers,
    Sparkles,
    Zap,
    Info,
    Package,
    Brain
} from 'lucide-react';
import { useSequencePlanStore } from '@/stores/sequencePlanStore';
import { useAppStore } from '@/stores/useAppStore';
import { useStore } from '@/store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useProductionStore, type ManifestedAsset } from '@/stores/productionStore';
import { useMemoryStore } from '@/stores/memoryStore';
import { projectMemory } from '@/services/ProjectMemoryService';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import './ProductionGuide.css';

/**
 * ProductionGuide Component
 * 
 * A comprehensive recap of the project's production shots, 
 * helping users visualize segments, dialogues, and prompts before generation.
 */
interface ProductionGuideProps {
    onEditCharacter?: (characterId: string) => void;
}

export function ProductionGuide({ onEditCharacter }: ProductionGuideProps) {
    const currentPlan = useSequencePlanStore((state) => state.currentPlanData);
    const characters = useStore((state) => state.characters);
    const project = useAppStore((state) => state.project);
    const worlds = useStore((state) => state.worlds);
    const updateShot = useAppStore((state) => state.updateShot);
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
    const [isSyncing, setIsSyncing] = useState(false);
    const [previewAsset, setPreviewAsset] = useState<ManifestedAsset | null>(null);
    const manifestedAssets = useProductionStore((state) => state.manifestedAssets);

    // Get all objects from all worlds for lookup
    const allObjects = worlds.flatMap(w => w.keyObjects || []);

    const toggleRow = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleSync = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsSyncing(true);
        // Dispatch custom event to trigger sync in ProjectDashboardNew
        window.dispatchEvent(new CustomEvent('storycore:sync-production-guide'));

        // Mock finishing sync UI-wise after 2s
        setTimeout(() => setIsSyncing(false), 2000);
    };

    const handlePromptChange = (shotId: string, newPrompt: string) => {
        const shot = (currentPlan?.shots as any[]).find(s => s.id === shotId);
        if (shot) {
            updateShot(shotId, {
                generation: {
                    ...(shot.generation || {}),
                    prompt: newPrompt
                }
            } as any);
        }
    };

    const handleCompositionChange = (shotId: string, updates: any) => {
        const shot = (currentPlan?.shots as any[]).find(s => s.id === shotId);
        if (shot) {
            updateShot(shotId, {
                composition: {
                    ...(shot.composition || {}),
                    ...updates
                }
            } as any);
        }
    };

    const handleMotionPromptChange = (shotId: string, newPrompt: string) => {
        const shot = (currentPlan?.shots as any[]).find(s => s.id === shotId);
        if (shot) {
            updateShot(shotId, {
                camera: {
                    ...(shot.camera || {}),
                    movement: {
                        ...(shot.camera?.movement || {}),
                        prompt: newPrompt
                    }
                }
            } as any);
        }
    };

    const handleDirectingChange = (shotId: string, updates: any) => {
        const shot = (currentPlan?.shots as any[]).find(s => s.id === shotId);
        if (shot) {
            updateShot(shotId, {
                metadata: {
                    ...(shot.metadata || {}),
                    ...updates
                }
            } as any);
        }
    };

    const handleNoteChange = (shotId: string, note: string) => {
        updateShot(shotId, { notes: note } as any);

        // Analyze for memory (Write Gate) - Only for significant notes
        if (note.length > 20) {
            projectMemory.analyzeForMemory(note, `Production Note (Shot ${shotId})`);
        }
    };

    const truncate = (text: string, length: number) => {
        if (!text) return '';
        return text.length > length ? text.substring(0, length) + '...' : text;
    };

    if (!currentPlan || !currentPlan.shots || currentPlan.shots.length === 0) {
        return (
            <div className="production-guide-empty">
                <Clapperboard className="w-12 h-12 opacity-20 mb-4 mx-auto" aria-hidden="true" />
                <h4 className="text-gray-400 font-bold mb-2 uppercase tracking-widest text-xs">// Production Linkage Offline</h4>
                <p className="text-sm text-gray-500 max-w-xs mx-auto">
                    No sequence plan active. Please initialize a plan in the "Shot Planning" section or via the "Plan sequences" section.
                </p>
            </div>
        );
    }

    return (
        <div className="production-guide-container">
            {/* Header Infographic Style */}
            <div className="production-guide-header-info">
                <div className="info-stats-group">
                    <div className="info-stat">
                        <Layers className="w-4 h-4 text-primary" />
                        <div>
                            <span className="stat-label">Project Brain</span>
                            <span className="stat-value">{(project?.metadata?.name as string) || 'Active Story'}</span>
                        </div>
                    </div>
                    <div className="info-stat">
                        <Film className="w-4 h-4 text-purple-400" />
                        <div>
                            <span className="stat-label">Active Plan</span>
                            <span className="stat-value">{currentPlan.name}</span>
                        </div>
                    </div>
                    <div className="info-stat">
                        <Zap className="w-4 h-4 text-yellow-400" />
                        <div>
                            <span className="stat-label">Shots count</span>
                            <span className="stat-value">{currentPlan.shots.length} Fragments</span>
                        </div>
                    </div>

                    <div className="info-stat border-primary/20 bg-primary/10">
                        <Brain className="w-4 h-4 text-primary" />
                        <div className="flex-1 min-w-0">
                            <span className="stat-label">Living Protocol</span>
                            <span className="stat-value text-[9px] leading-tight opacity-70 line-clamp-1">
                                {useMemoryStore.getState().workingContext}
                            </span>
                        </div>
                    </div>
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    className="btn-sync-scenario"
                    onClick={handleSync}
                    disabled={isSyncing}
                >
                    <Sparkles className={`w-3.5 h-3.5 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span className="text-[10px] uppercase font-black tracking-widest">
                        {isSyncing ? 'Refining...' : 'Sync with Scenario'}
                    </span>
                </Button>
            </div>

            <div className="production-guide">
                {/* Real Table-ish Header */}
                <div className="production-guide__table-header">
                    <div className="col-id"># Fragment</div>
                    <div className="col-script">Narrative / Script</div>
                    <div className="col-visual">Concept / Composition</div>
                    <div className="col-motion">Motion Dynamics</div>
                    <div className="col-assets">Production Assets</div>
                </div>

                <div className="production-guide__rows">
                    {currentPlan.shots.map((s, index) => {
                        const shot = s as any;
                        const isExpanded = !!expandedRows[shot.id];

                        return (
                            <div key={shot.id} className="production-guide__row-wrapper">
                                <div
                                    className={`production-guide__row ${isExpanded ? 'is-expanded' : ''}`}
                                    onClick={(e) => toggleRow(shot.id, e)}
                                    role="button"
                                    aria-expanded={isExpanded}
                                >
                                    {/* Number & Timing */}
                                    <div className="col-id">
                                        <div className="shot-num-circle">
                                            <span className="shot-number">{(shot.number || index + 1).toString().padStart(2, '0')}</span>
                                        </div>
                                        <span className="shot-duration">
                                            {shot.timing?.duration || 0}s
                                            <span className="timestamp">[{shot.timing?.inPoint || 0} - {shot.timing?.outPoint || 0}]</span>
                                        </span>
                                    </div>

                                    {/* Script / Dialogue */}
                                    <div className="col-script">
                                        {shot.dialogues && shot.dialogues.length > 0 ? (
                                            <div className="dialogue-group">
                                                {shot.dialogues.map((d, i) => (
                                                    <div key={d.id || i} className="dialogue-item">
                                                        <Mic2 size={10} className="text-secondary opacity-60" />
                                                        <span className="char-name">
                                                            {characters.find(c => c.character_id === d.characterId)?.name || 'Narrator'}
                                                        </span>
                                                        <p className="dialogue-text">"{truncate(d.text, 80)}"</p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="narrative-desc">
                                                <Info size={12} className="opacity-40" />
                                                <p>{truncate(shot.notes || shot.description || 'Action sequence - No dialogue.', 100)}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Image Prompt & Vis Description */}
                                    <div className="col-visual">
                                        <div className="prompt-meta">
                                            <ImageIcon size={12} className="text-primary/60" />
                                            <textarea
                                                className="visual-prompt-inline-edit"
                                                value={shot.generation?.prompt || ''}
                                                onChange={(e) => handlePromptChange(shot.id, e.target.value)}
                                                placeholder="Describe visual composition..."
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                        <div className="shorthand-tags">
                                            <Badge variant="outline" className="tag-micro">{shot.camera?.framing || 'Medium'}</Badge>
                                            <Badge variant="outline" className="tag-micro">{shot.camera?.angle || 'Eye-level'}</Badge>
                                            {shot.metadata?.lens && (
                                                <Badge variant="secondary" className="tag-micro bg-blue-500/10 text-blue-400 border-blue-500/30">
                                                    {shot.metadata.lens}
                                                </Badge>
                                            )}
                                            {shot.metadata?.emotion && shot.metadata.emotion !== 'neutral' && (
                                                <Badge variant="secondary" className="tag-micro bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
                                                    {shot.metadata.emotion} ({shot.metadata.emotionIntensity}%)
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {/* Video Prompt & Motion */}
                                    <div className="col-motion">
                                        <div className="motion-meta">
                                            <Film size={12} className="text-purple-400/60" />
                                            <textarea
                                                className="motion-prompt-inline-edit"
                                                value={shot.camera?.movement?.prompt || ''}
                                                onChange={(e) => handleMotionPromptChange(shot.id, e.target.value)}
                                                placeholder="Animation/Physics prompt (e.g. Dolly In, Orbit)..."
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                        <div className="motion-status">
                                            <span className="motion-type">{shot.camera?.movement?.type?.toUpperCase() || 'STATIC'}</span>
                                            {shot.camera?.movement?.speed && <span className="speed-dot" data-speed={shot.camera.movement.speed} />}
                                        </div>
                                    </div>

                                    {/* Actors & Assets */}
                                    <div className="col-assets">
                                        <div className="assets-summary-grid">
                                            <div className="actors-strip">
                                                {shot.composition?.characterIds?.length ? (
                                                    shot.composition.characterIds.map(cid => {
                                                        const char = characters.find(c => c.character_id === cid);
                                                        const asset = manifestedAssets.find(a => a.characterId === cid);
                                                        return (
                                                            <div
                                                                key={cid}
                                                                className={cn("actor-ref", asset && "has-sheet")}
                                                                title={char?.name || 'Unknown Character'}
                                                                onClick={() => asset && setPreviewAsset(asset)}
                                                            >
                                                                {char?.visual_identity?.generated_portrait ? (
                                                                    <img src={char.visual_identity.generated_portrait} alt={char.name} />
                                                                ) : (
                                                                    <User size={10} />
                                                                )}
                                                            </div>
                                                        )
                                                    })
                                                ) : null}
                                            </div>
                                            <div className="props-strip">
                                                {shot.composition?.props?.length ? (
                                                    shot.composition.props.map((pid: string) => {
                                                        const asset = manifestedAssets.find(a => a.objectId === pid);
                                                        return (
                                                            <div
                                                                key={pid}
                                                                className={cn("prop-ref", asset && "has-sheet")}
                                                                title={asset ? "View Manifested Reference" : "Object Asset"}
                                                                onClick={() => asset && setPreviewAsset(asset)}
                                                            >
                                                                <Package size={10} className={asset ? "text-yellow-400" : "text-yellow-400/40"} />
                                                            </div>
                                                        );
                                                    })
                                                ) : null}
                                            </div>
                                        </div>
                                        <div className="assets-action-row">
                                            <button
                                                className="btn-edit-outfit"
                                                title="Edit Outfit / Props"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (onEditCharacter && shot.composition?.characterIds?.[0]) {
                                                        onEditCharacter(shot.composition.characterIds[0]);
                                                    }
                                                }}
                                            >
                                                <Edit3 size={10} />
                                                <span>Composition</span>
                                            </button>
                                            <button
                                                className={`btn-gen-sheet ${manifestedAssets.some(a => a.characterId === shot.composition?.characterIds?.[0]) ? 'has-sheet' : ''}`}
                                                title={manifestedAssets.some(a => a.characterId === shot.composition?.characterIds?.[0]) ? 'Reference Sheet Manifested' : 'Generate Reference Sheet'}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Trigger event for Neural Production Assistant or direct COM-API
                                                    window.dispatchEvent(new CustomEvent('storycore:gen-char-sheet', {
                                                        detail: { characterId: shot.composition?.characterIds?.[0] }
                                                    }));
                                                }}
                                            >
                                                <Layers size={10} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Grid Details */}
                                {isExpanded && (
                                    <div className="row-expansion-panel">
                                        <div className="expansion-grid">
                                            <div className="expansion-col">
                                                <h5 className="sub-title">// Lighting & Environment</h5>
                                                <div className="editable-comp-fields">
                                                    <div className="field-row">
                                                        <span className="label">Mood:</span>
                                                        <Input
                                                            className="comp-input-mini"
                                                            value={shot.composition?.lightingMood || ''}
                                                            onChange={(e) => handleCompositionChange(shot.id, { lightingMood: e.target.value })}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
                                                    <div className="field-row">
                                                        <span className="label">Time:</span>
                                                        <Input
                                                            className="comp-input-mini"
                                                            value={shot.composition?.timeOfDay || ''}
                                                            onChange={(e) => handleCompositionChange(shot.id, { timeOfDay: e.target.value })}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
                                                </div>
                                                <p className="text-[10px] text-gray-500 mt-2">
                                                    <strong>Environment:</strong> {
                                                        worlds.flatMap(w => w.locations).find(l => l.id === shot.composition?.environmentId)?.name ||
                                                        shot.composition?.environmentId ||
                                                        'Default Scene'
                                                    }
                                                </p>
                                            </div>
                                            <div className="expansion-col">
                                                <h5 className="sub-title">// Technical Rig & Directing</h5>
                                                <div className="editable-comp-fields">
                                                    <div className="field-row">
                                                        <span className="label text-blue-400">Lens:</span>
                                                        <Input
                                                            className="comp-input-mini"
                                                            value={shot.metadata?.lens || ''}
                                                            onChange={(e) => handleDirectingChange(shot.id, { lens: e.target.value })}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
                                                    <div className="field-row">
                                                        <span className="label text-blue-400">Sensor:</span>
                                                        <Input
                                                            className="comp-input-mini"
                                                            value={shot.metadata?.sensor || ''}
                                                            onChange={(e) => handleDirectingChange(shot.id, { sensor: e.target.value })}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
                                                    <div className="field-row">
                                                        <span className="label text-yellow-400">Emotion:</span>
                                                        <Input
                                                            className="comp-input-mini"
                                                            value={shot.metadata?.emotion || ''}
                                                            onChange={(e) => handleDirectingChange(shot.id, { emotion: e.target.value })}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="expansion-col full-width">
                                                <h5 className="sub-title">// Production Notes (Shot Recap)</h5>
                                                <Textarea
                                                    className="production-notes-edit"
                                                    value={shot.notes || ''}
                                                    onChange={(e) => handleNoteChange(shot.id, e.target.value)}
                                                    placeholder="Add special instructions for this fragment..."
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            {/* Asset Preview Modal */}
            <Dialog open={!!previewAsset} onOpenChange={(open) => !open && setPreviewAsset(null)}>
                <DialogContent className="max-w-xl bg-[#0a0a0b] border-primary/20 text-white font-mono">
                    <DialogHeader>
                        <DialogTitle className="text-primary uppercase tracking-[0.3em] font-black text-xs flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            Neural Manifestation Preview
                        </DialogTitle>
                    </DialogHeader>
                    {previewAsset && (
                        <div className="space-y-4 mt-4">
                            <div className="aspect-square bg-black rounded-sm overflow-hidden border border-white/10">
                                <img src={previewAsset.url} alt={previewAsset.characterName} className="w-full h-full object-cover" />
                            </div>
                            <div className="p-4 bg-white/5 border border-white/5 rounded-sm">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-xs font-black uppercase text-white">{previewAsset.characterName}</h3>
                                    <Badge className="text-[8px] bg-primary text-black uppercase">{previewAsset.type.split('_')[0]}</Badge>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[9px] text-white/40 uppercase font-black">Synthesized Prompt:</p>
                                    <p className="text-[10px] text-white/60 leading-relaxed italic pr-4">
                                        {previewAsset.metadata?.prompt || 'Original manifest prompt unavailable'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
