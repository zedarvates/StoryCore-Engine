import React, { useState, useEffect } from 'react';
import {
    Clapperboard, Image as ImageIcon, Film,
    Sparkles, Zap, Package, 
    Play, Map, Layers, Brain, RefreshCw, Table
} from 'lucide-react';
import { useSequencePlanStore } from '@/stores/sequencePlanStore';
import { useAppStore } from '@/stores/useAppStore';
import { useStore } from '@/store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { type ManifestedAsset, useProductionStore } from '@/stores/productionStore';
import { useMemoryStore } from '@/stores/memoryStore';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import './ProductionGuide.css';

/**
 * Shot type for ProductionGuide with runtime properties
 */
interface ProductionGuideShot {
    id: string;
    number?: number;
    notes?: string;
    description?: string;
    timing?: {
        duration: number;
        inPoint: number;
        outPoint: number;
    };
    camera?: {
        framing?: string;
        angle?: string;
        movement?: {
            type?: string;
            speed?: string;
            prompt?: string;
        };
    };
    composition?: {
        characterIds?: string[];
        props?: string[];
        environmentId?: string;
        lightingMood?: string;
        timeOfDay?: string;
    };
    generation?: {
        prompt?: string;
    };
    metadata?: {
        lens?: string;
        sensor?: string;
        emotion?: string;
        emotionIntensity?: number;
        [key: string]: unknown;
    };
    dialogues?: Array<{
        id?: string;
        characterId: string;
        text: string;
    }>;
    locationId?: string;
    image?: string;
    generated_image_url?: string;
}

/** Specific location type for the production inventory */
interface ProductionInventoryLocation {
    id: string;
    name: string;
    location_id?: string; // Added for keying
    metadata?: {
        description?: string;
    };
    skybox?: {
        image_url?: string;
    };
    textures?: {
        top?: string;
    };
}

/** Specific object type for the production inventory */
interface ProductionInventoryObject {
    id: string;
    name: string;
    category?: string;
}

interface ProductionGuideProps {
    onEditCharacter?: (characterId: string) => void;
}

export function ProductionGuide({ onEditCharacter: _onEditCharacter }: ProductionGuideProps) {
    const currentPlan = useSequencePlanStore((state) => state.currentPlanData);
    const updateShotInPlan = useSequencePlanStore((state) => state.updateShotInPlan);
    const selectPlan = useSequencePlanStore((state) => state.selectPlan);
    const storePlans = useSequencePlanStore((state) => state.plans);
    const characters = useStore((state) => state.characters);
    const project = useAppStore((state) => state.project);
    const worlds = useStore((state) => state.worlds);
    const storeSequencePlans = useStore((state) => state.sequencePlans);
    const storeShots = useAppStore((state) => state.shots);
    const [previewAsset, setPreviewAsset] = useState<ManifestedAsset | null>(null);

    // Auto-select first available plan if none is active
    useEffect(() => {
        if (currentPlan) return; 

        if (storePlans.length > 0) {
            selectPlan(storePlans[0].id).catch(() => {});
            return;
        }

        useSequencePlanStore.getState().loadPlans().then(() => {
            const updated = useSequencePlanStore.getState().plans;
            if (updated.length > 0) {
                useSequencePlanStore.getState().selectPlan(updated[0].id).catch(() => {});
            }
        }).catch(() => {});
    }, [currentPlan, storePlans, selectPlan]);

    // Build a synthetic "effective plan"
    const effectivePlan = currentPlan ?? (() => {
        if (storeSequencePlans && storeSequencePlans.length > 0) {
            const firstPlan = storeSequencePlans[0] as unknown as {
                id: string;
                name: string;
                description?: string;
                shots?: import('@/types').Shot[];
            };
            if (firstPlan.shots && firstPlan.shots.length > 0) {
                return {
                    id: firstPlan.id,
                    name: firstPlan.name,
                    description: firstPlan.description || '',
                    shots: firstPlan.shots,
                    totalDuration: firstPlan.shots.reduce((s: number, sh: import('@/types').Shot) => s + (sh.duration || 0), 0),
                    frameRate: 30,
                    resolution: { width: 1920, height: 1080 },
                    createdAt: Date.now(),
                    modifiedAt: Date.now(),
                };
            }
        }
        if (storeShots && storeShots.length > 0) {
            return {
                id: 'synthetic',
                name: project?.project_name || 'Current Project',
                description: 'Auto-assembled from project shots',
                shots: storeShots as import('@/types').Shot[],
                totalDuration: storeShots.reduce((s, sh) => s + (sh.duration || 0), 0),
                frameRate: 30,
                resolution: { width: 1920, height: 1080 },
                createdAt: Date.now(),
                modifiedAt: Date.now(),
            };
        }
        return null;
    })();

    // Listen for LLM-driven shot updates
    useEffect(() => {
        const handleLLMShotUpdate = (event: CustomEvent<{
            shotId: string;
            updates: Record<string, unknown>;
        }>) => {
            const { shotId, updates } = event.detail;
            if (shotId && updates) {
                updateShotInPlan(shotId, updates as Partial<import('@/types').Shot>);
            }
        };

        window.addEventListener('storycore:llm-update-shot', handleLLMShotUpdate as EventListener);
        return () => window.removeEventListener('storycore:llm-update-shot', handleLLMShotUpdate as EventListener);
    }, [updateShotInPlan]);

    const handleSync = (e: React.MouseEvent) => {
        e.stopPropagation();
        // setIsSyncing(true); // This variable is not defined in the provided code snippet
        window.dispatchEvent(new CustomEvent('storycore:sync-production-guide'));
        // setTimeout(() => setIsSyncing(false), 2000); // This variable is not defined in the provided code snippet
    };

    const handlePromptChange = (shotId: string, newPrompt: string) => {
        const shot = currentPlan?.shots.find(s => s.id === shotId);
        if (shot) {
            updateShotInPlan(shotId, {
                generation: {
                    ...(shot.generation || {}),
                    prompt: newPrompt
                }
            } as Partial<import('@/types').Shot>);
        }
    };

    const truncate = (text: string, length: number) => {
        if (!text) return '';
        return text.length > length ? text.substring(0, length) + '...' : text;
    };

    const hasInventory = characters.length > 0 || worlds.flatMap(w => w.locations || []).length > 0;
    const hasShots = !!effectivePlan && !!effectivePlan.shots && effectivePlan.shots.length > 0;

    if (!hasShots && !hasInventory) {
        return (
            <div className="production-guide-empty">
                <div className="empty-content-wrapper">
                    <div className="icon-pulse">
                        <Clapperboard className="w-16 h-16 opacity-30 text-primary mx-auto" aria-hidden="true" />
                    </div>
                    <h4 className="text-primary font-black mb-2 uppercase tracking-[0.4em] text-sm mt-4">// Production Linkage Offline</h4>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto mb-6 leading-relaxed opacity-60">
                        No sequence plan or character inventory detected for <span className="text-white">{(project?.project_name as string) || 'this project'}</span>. 
                        Initialize your storyboard or add characters to begin cinematic synchronization.
                    </p>
                    <div className="flex flex-col gap-2 max-w-[200px] mx-auto">
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="bg-primary text-black hover:bg-primary/80 font-black uppercase text-[10px] tracking-widest"
                        onClick={handleSync}
                      >
                        <Zap className="w-3 h-3 mr-2" />
                        Generate from Story
                      </Button>
                      <span className="text-[10px] text-gray-700 uppercase font-black">or</span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-[10px] uppercase font-black tracking-widest border-primary/20"
                        onClick={() => window.dispatchEvent(new CustomEvent('launch-wizard', { detail: { type: 'sequence-plan' }}))}
                      >
                        Manual Planning
                      </Button>
                    </div>
                </div>
            </div>
        );
    }

    const shots = hasShots ? (effectivePlan!.shots as unknown as ProductionGuideShot[]) : [];

    return (
        <div className="production-guide-container space-y-8">
            {/* Master Manifest "Excel" Dashboard Tile - Top Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2 p-6 bg-gradient-to-br from-white/[0.05] to-sky-500/[0.05] border border-sky-500/20 rounded-3xl backdrop-blur-3xl relative overflow-hidden group shadow-2xl">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-sky-500/10 blur-[60px] rounded-full -mr-10 -mt-10 group-hover:bg-sky-500/20 transition-colors pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start md:items-center">
                        <div className="w-20 h-20 rounded-2xl bg-sky-500/10 flex items-center justify-center border border-sky-500/30 shadow-inner group-hover:scale-110 transition-transform">
                            <Table className="w-10 h-10 text-sky-400" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Master Production Manifest</h3>
                                <Badge variant="outline" className="text-[8px] bg-sky-400/10 text-sky-400 border-sky-400/30 font-black">STABLE SYNC</Badge>
                            </div>
                            <p className="text-sm text-white/40 leading-relaxed mb-4 max-w-lg font-mono">
                                Centralized technical database for <span className="text-white italic">{(project?.project_name as string) || 'Active Episode'}</span>.
                                Cross-referencing narrative fragments with manifestation protocol.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="outline" className="bg-white/5 border-white/10 text-[9px] uppercase font-bold text-white/60">
                                    {shots.length} Fragments
                                </Badge>
                                <Badge variant="outline" className="bg-white/5 border-white/10 text-[9px] uppercase font-bold text-white/60">
                                    {characters.length} Actors
                                </Badge>
                                <Badge variant="outline" className="bg-white/5 border-white/10 text-[9px] uppercase font-bold text-white/60">
                                    {worlds.flatMap(w => w.locations || []).length} Sets
                                </Badge>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-white/[0.03] border border-white/10 rounded-3xl flex flex-col justify-between group hover:border-primary/30 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                        <div className="text-primary/60 p-2 bg-primary/10 rounded-xl">
                            <Zap size={20} />
                        </div>
                        <div className="text-right">
                             <div className="text-[8px] font-black text-white/20 uppercase tracking-widest">Protocol V2</div>
                             <div className="text-[10px] font-mono text-primary">ESTABLISHED</div>
                        </div>
                    </div>
                    <div className="space-y-3">
                         <Button 
                            className="w-full bg-primary text-black font-black uppercase tracking-widest text-[9px] h-10 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                            onClick={() => window.dispatchEvent(new CustomEvent('storycore:sync-production-guide'))}
                         >
                            <RefreshCw size={14} className="mr-2" /> Full Data Sync
                         </Button>
                         <Button 
                            variant="outline"
                            className="w-full bg-white/5 border-white/10 text-white font-black uppercase tracking-widest text-[9px] h-10 rounded-xl hover:bg-white/10"
                            onClick={() => window.dispatchEvent(new CustomEvent('storycore:generate-missing-assets'))}
                         >
                            <Sparkles size={14} className="mr-2" /> Generate Assets
                         </Button>
                    </div>
                </div>
            </div>

            <div className="production-guide-header-info border border-white/5 bg-white/5 p-4 rounded-xl">
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
                            <span className="stat-value">{effectivePlan?.name || 'No Active Plan'}</span>
                        </div>
                    </div>
                    <div className="info-stat">
                        <Zap className="w-4 h-4 text-yellow-400" />
                        <div>
                            <span className="stat-label">Shots count</span>
                            <span className="stat-value">{shots.length} Fragments</span>
                        </div>
                    </div>

                    <div className="info-stat border-primary/20 bg-primary/10">
                        <Brain className="w-4 h-4 text-primary" />
                        <div className="flex-1 min-w-0">
                            <span className="stat-label">Living Protocol</span>
                            <span className="stat-value text-[9px] leading-tight opacity-70 line-clamp-1">
                                {String(useMemoryStore.getState().workingContext || '')}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="btn-sync-scenario bg-primary/5 border-primary/20 hover:bg-primary/10"
                        onClick={() => window.dispatchEvent(new CustomEvent('storycore:sync-production-guide'))}
                        title="Sync with Script & Stories"
                    >
                        <RefreshCw size={14} className="mr-1.5" /> Synchroniser Scenario
                    </Button>
                    
                    <Button 
                        variant="default" 
                        size="sm" 
                        className="btn-master-gen bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                        onClick={() => window.dispatchEvent(new CustomEvent('storycore:generate-missing-assets'))}
                    >
                        <Zap size={14} className="mr-1.5" /> Générer Tout (Master)
                    </Button>
                </div>
            </div>

            <div className="production-guide__inventory">
                <div className="section-title uppercase tracking-[0.2em] text-[10px] font-black text-primary/50 mb-3 px-1 flex items-center gap-2">
                    <Package size={12} /> 
                </div>
                
                <div className="inventory-grids">
                    <div className="inventory-grid-table">
                        <div className="grid-table-header">Characters / Personnages</div>
                        <div className="grid-table-content">
                            <table className="excel-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Role</th>
                                        <th>Visual Focus</th>
                                        <th>Assets</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {characters.length > 0 ? characters.map((char, idx) => (
                                        <tr key={char.character_id || `char-${idx}`}>
                                            <td className="font-bold text-white">{char.name}</td>
                                            <td className="text-primary/70">{char.role?.archetype || 'Actor'}</td>
                                            <td className="text-[9px] opacity-70 italic truncate max-w-[150px]">
                                                {char.visual_identity?.clothing_style || 'N/A'}
                                            </td>
                                            <td>
                                                {char.visual_identity?.generated_portrait && (
                                                    <img src={char.visual_identity.generated_portrait} className="w-5 h-5 rounded-sm inline-block shadow-sm" alt="" />
                                                )}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={4} className="text-center opacity-30 italic py-4">No actors manifested</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="inventory-grid-table">
                        <div className="grid-table-header">Lieux / Locations</div>
                        <div className="grid-table-content">
                            <table className="excel-table">
                                <thead>
                                        <tr>
                                            <th>Location name</th>
                                            <th>Description</th>
                                            <th>QI / Status</th>
                                        </tr>
                                </thead>
                                <tbody>
                                    {worlds.flatMap(w => w.locations || []).length > 0 ? worlds.flatMap(w => w.locations || []).map((loc, idx) => {
                                        const pLoc = loc as unknown as ProductionInventoryLocation;
                                        return (
                                            <tr key={pLoc.id || pLoc.location_id || `loc-${idx}`}>
                                                <td className="font-bold text-white flex items-center gap-2">
                                                    {pLoc.name}
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="h-5 w-5 p-0 hover:bg-primary/20 text-primary/40 hover:text-primary"
                                                        onClick={() => {
                                                            window.dispatchEvent(new CustomEvent('storycore:gen-char-sheet', { 
                                                                detail: { locationId: pLoc.id, type: 'LOCATION' } 
                                                            }));
                                                        }}
                                                        title="Generate Reference"
                                                    >
                                                        <Sparkles className="w-3 h-3" />
                                                    </Button>
                                                </td>
                                                <td className="text-purple-400/70">{pLoc.metadata?.description || 'N/A'}</td>
                                                <td>
                                                    <div className="flex gap-1 items-center">
                                                        {useProductionStore.getState().manifestedAssets.some(a => a.locationId === pLoc.id) ? (
                                                            <Badge variant="outline" className="text-[8px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">READY</Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-[8px] opacity-40">PENDING</Badge>
                                                        )}
                                                        {pLoc.skybox?.image_url && <div className="w-2 h-2 bg-blue-500 rounded-full" title="Skybox active"></div>}
                                                        {pLoc.textures?.top && <div className="w-2 h-2 bg-green-500 rounded-sm" title="Mapping active"></div>}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr><td colSpan={3} className="text-center opacity-30 italic py-4">No locations mapped</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="inventory-grid-table">
                        <div className="grid-table-header">Objetcs / Props</div>
                        <div className="grid-table-content">
                            <table className="excel-table">
                                <thead>
                                        <tr>
                                            <th>Asset name</th>
                                            <th>Category</th>
                                            <th>Usage</th>
                                            <th>QI / Status</th>
                                        </tr>
                                </thead>
                                <tbody>
                                    {(useStore.getState() as unknown as { objects: ProductionInventoryObject[] }).objects?.length > 0 ? (useStore.getState() as unknown as { objects: ProductionInventoryObject[] }).objects.map((obj: ProductionInventoryObject, idx: number) => (
                                        <tr key={obj.id || `obj-${idx}`}>
                                            <td className="font-bold text-white flex items-center gap-2">
                                                {obj.name}
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="h-5 w-5 p-0 hover:bg-primary/20 text-primary/40 hover:text-primary"
                                                    onClick={() => {
                                                        window.dispatchEvent(new CustomEvent('storycore:gen-char-sheet', { 
                                                            detail: { objectId: obj.id, type: 'OBJECT' } 
                                                        }));
                                                    }}
                                                    title="Generate Reference"
                                                >
                                                    <Sparkles className="w-3 h-3" />
                                                </Button>
                                            </td>
                                            <td className="text-yellow-400/70">{obj.category || 'Prop'}</td>
                                            <td className="text-[9px] opacity-70">
                                                {shots.filter((sh: ProductionGuideShot) => sh.composition?.props?.includes(obj.id)).length} counts
                                            </td>
                                            <td>
                                                <div className="flex gap-1 items-center">
                                                    {useProductionStore.getState().manifestedAssets.some(a => a.objectId === obj.id) ? (
                                                        <Badge variant="outline" className="text-[8px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">READY</Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-[8px] opacity-40">PENDING</Badge>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={4} className="text-center opacity-30 italic py-4">No props registered</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <div className="production-guide-master mt-6">
                <div className="table-container shadow-2xl border border-white/5 rounded-xl overflow-hidden bg-black/40 backdrop-blur-xl">
                    <table className="production-master-table">
                        <thead>
                            <tr>
                                <th className="w-12">#</th>
                                <th className="w-40">Narrative / Dialogue</th>
                                <th className="w-32">Actors / Cast</th>
                                <th className="w-32">Location / Scene</th>
                                <th>Visual AI Prompt / Context</th>
                                <th className="w-24">Composition</th>
                                <th className="w-24">Preview</th>
                            </tr>
                        </thead>
                        <tbody>
                            {shots.length > 0 ? shots.map((shot: ProductionGuideShot, index) => {
                                const location = worlds.flatMap(w => (w.locations || []) as unknown as ProductionInventoryLocation[]).find(l => l.id === shot.locationId || l.id === shot.composition?.environmentId);
                                const shotProps = (((useStore.getState() as unknown as { objects: ProductionInventoryObject[] }).objects || []) as ProductionInventoryObject[]);
                                const activeProps = shotProps.filter((o) => shot.composition?.props?.includes(o.id));
                                
                                return (
                                    <tr key={shot.id} className="master-row group">
                                        <td className="text-center border-r border-white/5 bg-white/[0.02]">
                                            <div className="flex flex-col items-center py-2">
                                                <span className="font-black text-primary text-sm">{(shot.number || index + 1).toString().padStart(2, '0')}</span>
                                                <span className="text-[8px] opacity-40 font-mono mt-1">{shot.timing?.duration || 0}s</span>
                                            </div>
                                        </td>

                                        <td className="vertical-top py-3 px-4 min-w-[200px]">
                                            {shot.dialogues && shot.dialogues.length > 0 ? (
                                                <div className="dialogue-cell space-y-2">
                                                    {shot.dialogues.map((d, i: number) => (
                                                        <div key={d.id || i} className="text-[10px] leading-tight flex items-start gap-1.5">
                                                            <span className="text-secondary font-bold whitespace-nowrap uppercase tracking-tighter text-[8px]">
                                                                {characters.find(c => c.character_id === d.characterId)?.name || 'Narr'}:
                                                            </span>
                                                            <span className="opacity-80 italic font-serif">"{truncate(d.text, 60)}"</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="action-cell opacity-50 italic text-[10px] font-light leading-snug">
                                                    {truncate(shot.notes || shot.description || 'Action sequence...', 100)}
                                                </div>
                                            )}
                                        </td>

                                        <td className="px-4">
                                            <div className="flex flex-wrap gap-1 items-center justify-center">
                                                {shot.composition?.characterIds?.map((cid: string) => {
                                                    const char = characters.find(c => c.character_id === cid);
                                                    return (
                                                        <div key={cid} className="actor-pill shadow-lg" title={char?.name}>
                                                            {char?.visual_identity?.generated_portrait ? (
                                                                <img src={char.visual_identity.generated_portrait} className="w-8 h-8 rounded border border-white/10" alt="" />
                                                            ) : (
                                                                <div className="w-8 h-8 rounded bg-white/5 border border-white/5 flex items-center justify-center text-[8px] font-bold text-white/40">
                                                                    {char?.name?.charAt(0) || '?'}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                                {(!shot.composition?.characterIds || shot.composition.characterIds.length === 0) && (
                                                    <span className="text-[8px] opacity-10 uppercase tracking-widest">Environment</span>
                                                )}
                                            </div>
                                        </td>

                                        <td className="px-4 border-l border-white/5">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="location-tag flex items-center gap-1.5 text-[10px] font-bold text-purple-400 truncate max-w-[120px]">
                                                    <Map size={11} className="opacity-60" /> {location?.name || 'Default Set'}
                                                </div>
                                                <div className="props-list flex flex-wrap gap-1">
                                                    {activeProps.map((p) => (
                                                        <div key={p.id} className="px-1 py-0.5 rounded-sm bg-yellow-500/10 border border-yellow-500/20 text-[7px] text-yellow-500/80 font-black uppercase tracking-tighter" title={p.name}>
                                                            {p.name}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </td>

                                        <td className="prompt-cell px-4">
                                            <div className="prompt-editor-wrapper">
                                                <textarea 
                                                    className="master-prompt-textarea text-[10px] bg-transparent border-none resize-none w-full text-primary/80 focus:ring-0 leading-tight h-12"
                                                    value={shot.generation?.prompt || ''}
                                                    onChange={(e) => handlePromptChange(shot.id, e.target.value)}
                                                    placeholder="Specify visual details..."
                                                />
                                            </div>
                                        </td>

                                        <td className="px-4 border-l border-white/5">
                                            <div className="flex flex-col gap-1 items-center">
                                                <Badge variant="outline" className="text-[8px] py-0 px-1 border-white/10 bg-white/5 opacity-80 uppercase font-black tracking-tighter">
                                                    {shot.camera?.framing || 'MS'}
                                                </Badge>
                                                <Badge variant="outline" className="text-[8px] py-0 px-1 border-white/10 bg-white/5 opacity-80 uppercase font-black tracking-tighter">
                                                    {shot.camera?.angle || 'Eye'}
                                                </Badge>
                                            </div>
                                        </td>

                                        <td className="px-4 border-l border-white/5">
                                            <div className="relative group/preview w-20 h-12 overflow-hidden rounded border border-white/10 bg-black shadow-inner m-auto">
                                                {shot.image || shot.generated_image_url ? (
                                                    <img src={shot.image || shot.generated_image_url} className="w-full h-full object-cover transition-transform group-hover/preview:scale-110" alt="" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center opacity-10">
                                                        <ImageIcon size={20} />
                                                    </div>
                                                )}
                                                
                                                {shot.generation?.prompt && (
                                                    <div className="absolute top-1 right-1">
                                                        <Badge className="text-[6px] p-0.5 bg-primary/20 text-primary border-primary/40 backdrop-blur-md">NEURAL</Badge>
                                                    </div>
                                                )}

                                                <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                                    <Play size={12} className="text-white fill-white" />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={7} className="text-center py-24 opacity-20 italic font-thin tracking-widest uppercase text-xs">
                                        Storyboard synchronization required
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
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
                                        {String(previewAsset.metadata?.prompt || 'Original manifest prompt unavailable')}
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

export default ProductionGuide;
