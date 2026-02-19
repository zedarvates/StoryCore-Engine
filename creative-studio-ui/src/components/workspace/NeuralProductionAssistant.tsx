import React, { useState } from 'react';
import {
    Sparkles,
    Layers,
    Palette,
    Camera,
    UserPlus,
    Zap,
    Info,
    ChevronRight,
    Search,
    RefreshCw,
    Download,
    Trash2,
    Brain,
    Database,
    ShieldCheck,
    Bookmark,
    MessageSquareQuote,
    AlertCircle,
    ClipboardList,
    Eye,
    History,
    BrainCircuit,
    Activity,
    MapPin,
    Package,
    Settings
} from 'lucide-react';
import { generateImage, type GenerationParams, WORKFLOW_OPTIONS } from '@/services/imageGenerationService';
import { useStore } from '@/store';
import { useAppStore } from '@/stores/useAppStore';
import { useSequencePlanStore } from '@/stores/sequencePlanStore';
import { useProductionStore, type ManifestedAsset } from '@/stores/productionStore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { ollamaClient } from '@/services/llm/OllamaClient';
import { rlmService } from '@/services/RecursiveLLMService';
import { useMemoryStore } from '@/stores/memoryStore';
import { projectMemory } from '@/services/ProjectMemoryService';

interface Character {
    character_id: string;
    name: string;
    visual_identity?: {
        generated_portrait?: string;
        clothing_style?: string;
        hair_color?: string;
    };
}

/**
 * Neural Production Assistant
 * 
 * Inspired by Google Agentic revolution and "Methode Bartelemi".
 * Helps with character consistency, artistic style, and technical rig advice.
 */
export function NeuralProductionAssistant() {
    const characters = useStore((state) => state.characters);
    const setCharacters = useStore((state) => state.setCharacters);
    const updateCharacter = useStore((state) => state.updateCharacter);
    const worlds = useStore((state) => state.worlds);
    const selectedWorldId = useStore((state) => state.selectedWorldId);
    const currentWorld = worlds.find(w => w.id === selectedWorldId);
    const currentPlan = useSequencePlanStore((state) => state.currentPlanData);

    const {
        manifestedAssets,
        addManifestedAsset,
        adviceHistory,
        addAdvice
    } = useProductionStore();

    const [isGeneratingSheet, setIsGeneratingSheet] = useState<string | null>(null);
    const [isLedgerOpen, setIsLedgerOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [generationStep, setGenerationStep] = useState<string>('');
    const [selectedModel, setSelectedModel] = useState<string>('z_image_turbo');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [ledgerSearch, setLedgerSearch] = useState('');
    const [useRecursiveReasoning, setUseRecursiveReasoning] = useState(true);
    const [isMemoryOpen, setIsMemoryOpen] = useState(false);
    const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
    const [correctionText, setCorrectionText] = useState('');
    const [manualInsightText, setManualInsightText] = useState('');
    const [isTrajectoryOpen, setIsTrajectoryOpen] = useState(false);
    const [isDistilling, setIsDistilling] = useState(false);
    const [ledgerFilter, setLedgerFilter] = useState<'ALL' | 'CHARACTER_REFERENCE_SHEET' | 'LOCATION_REFERENCE_SHEET' | 'OBJECT_REFERENCE_SHEET'>('ALL');

    const { insights, workingContext, promoteInsight, removeInsight, addInsight } = useMemoryStore();
    const { lastTrajectory } = useProductionStore();
    const { toast } = useToast();

    const advice = adviceHistory[0]?.text || null;

    React.useEffect(() => {
        const handleGenEvent = (e: any) => {
            if (e.detail?.characterId) {
                handleManifestAsset(e.detail.characterId, 'CHARACTER');
            }
        };
        window.addEventListener('storycore:gen-char-sheet', handleGenEvent);
        return () => window.removeEventListener('storycore:gen-char-sheet', handleGenEvent);
    }, []);

    const handleGenerateAdvice = async () => {
        setIsThinking(true);
        try {
            const worldInfo = currentWorld ?
                `World: ${currentWorld.name}, Tone: ${currentWorld.tone.join(', ')}, Vibe: ${currentWorld.visualIntent?.vibe || 'N/A'}` :
                'No world selected';

            const planInfo = currentPlan ?
                `Current Plan: ${currentPlan.name} with ${currentPlan.shots.length} shots. 
                First shot prompt: ${(currentPlan.shots[0] as any)?.generation?.prompt || 'N/A'}` :
                'No sequence plan active';

            const workingContext = useMemoryStore.getState().workingContext;

            const prompt = `Provide 3 precise directorial tips for visual consistency based on the "Neural Reality Synthesis" protocol.
            Analyze the current production context:

            [STABLE PROJECT PROTOCOLS]
            ${workingContext}

            [WORLD BLUEPRINT]
            ${worldInfo}

            [PRODUCTION PLAN]
            ${planInfo}

            [LOCKED REFERENCE SHEETS]
            ${manifestedAssets.map(a => `- ${a.characterName} (${a.type})`).join('\n')}

            Focus on continuity specifically for the locked reference sheets compared to the production plan.
            Analyze possible lighting transitions, lens geometry continuity, and technical rig alignment.
            Format: Markdown bullet points with bold keywords.`;

            // Use the general generation method with a default model
            const availableModels = await ollamaClient.listModels();
            const modelToUse = availableModels.find(m => m.category === 'storytelling' || m.category === 'general')?.name || 'llama3';

            let responseText = '';
            if (useRecursiveReasoning) {
                setGenerationStep('Engaging RLM Recursive Chain...');
                const { response, trajectory } = await rlmService.executeTask(prompt, modelToUse);
                responseText = response;
                useProductionStore.getState().setLastTrajectory(trajectory);
            } else {
                responseText = await ollamaClient.generate(modelToUse, prompt, { temperature: 0.7 });
                useProductionStore.getState().setLastTrajectory([]); // Clear trajectory for standard calls
            }

            addAdvice(responseText, worldInfo);

            // Total Recall: Analyze for new insights
            projectMemory.analyzeForMemory(responseText, 'Directorial Advice');
        } catch (err) {
            console.error('Failed to get directorial advice:', err);
            toast({
                title: "NEURAL LINK ERROR",
                description: "Failed to communicate with LLM for directorial advice.",
                variant: "destructive"
            });
        } finally {
            setIsThinking(false);
        }
    };

    const handleManifestAsset = async (id: string, type: 'CHARACTER' | 'LOCATION' | 'OBJECT') => {
        let name = 'Unknown';
        let baseDescription = '';
        let targetType: ManifestedAsset['type'] = 'CHARACTER_REFERENCE_SHEET';

        if (type === 'CHARACTER') {
            const char = characters.find(c => c.character_id === id);
            if (!char) return;
            name = char.name;
            baseDescription = `character portrait of ${char.name}, ${char.visual_identity?.clothing_style || 'professional attire'}`;
            targetType = 'CHARACTER_REFERENCE_SHEET';
        } else if (type === 'LOCATION') {
            const loc = currentWorld?.locations?.find(l => l.id === id);
            if (!loc) return;
            name = loc.name;
            baseDescription = `environmental concept art of ${loc.name}, ${loc.description}`;
            targetType = 'LOCATION_REFERENCE_SHEET';
        } else if (type === 'OBJECT') {
            const obj = currentWorld?.keyObjects?.find(o => o.id === id);
            if (!obj) return;
            name = obj.name;
            baseDescription = `cinematic product shot of ${obj.name}, ${obj.description}`;
            targetType = 'OBJECT_REFERENCE_SHEET';
        }

        setIsGeneratingSheet(id);
        setGenerationStep('Synthesizing Neural Prompt...');

        try {
            // Step 1: Prompt Synthesis
            const worldStyle = currentWorld?.visualIntent?.style || 'cinematic';
            const worldVibe = currentWorld?.visualIntent?.vibe || 'neutral';
            const worldColors = currentWorld?.visualIntent?.colors?.join(', ') || 'natural lighting';
            const worldRules = currentWorld?.rules?.map(r => r.rule).join('. ') || '';
            const techLvl = currentWorld?.technology || 'Contemporary';

            const workingContext = useMemoryStore.getState().workingContext;

            const prompt = `${baseDescription}. 
                [PROJECT PROTOCOLS]: ${workingContext}
                Environment context: ${worldVibe}, ${techLvl} technology level. 
                Visual Signature: ${worldStyle} aesthetics. 
                Color palette guidelines: ${worldColors}.
                World Principles: ${worldRules}.
                Specs: 8k resolution, high-end photographic render, cinematic depth of field, sharp textures, professional color grading.`;

            setGenerationStep('Engaging GPU Cluster...');

            const resultUrl = await generateImage({
                prompt,
                width: 1024,
                height: 1024,
                steps: 25,
                cfgScale: 7.5,
                sampler: 'euler',
                scheduler: 'normal',
                workflowType: selectedModel as any
            }, (progress, message) => {
                setGenerationStep(`${Math.round(progress * 100)}%: ${message}`);
            });

            // Step 2: Completion
            const newAsset: ManifestedAsset = {
                id: crypto.randomUUID(),
                characterId: type === 'CHARACTER' ? id : undefined,
                locationId: type === 'LOCATION' ? id : undefined,
                objectId: type === 'OBJECT' ? id : undefined,
                characterName: name,
                generatedAt: new Date().toISOString(),
                type: targetType,
                url: resultUrl,
                metadata: {
                    prompt,
                    model: selectedModel,
                    manifestation_node: 'StoryCore-Neural-Hub'
                }
            };

            addManifestedAsset(newAsset);
            setIsGeneratingSheet(null);
            setGenerationStep('');

            toast({
                title: "MANIFESTATION COMPLETE",
                description: `${name} reference has been added to the Production Ledger.`,
            });
        } catch (error: any) {
            console.error('Manifestation failed:', error);
            setIsGeneratingSheet(null);
            setGenerationStep('');
            toast({
                variant: "destructive",
                title: "MANIFESTATION FAILED",
                description: error.message || "Failed to engage neural synthesis engine.",
            });
        }
    };

    const handleCorrection = async () => {
        if (!correctionText.trim()) return;

        setIsThinking(true);
        setGenerationStep('Propagating Correction...');

        try {
            await projectMemory.analyzeForMemory(
                `USER CORRECTION: ${correctionText}\nCONTEXT: This corrects the previous advice: "${advice?.slice(0, 100)}..."`,
                'User Correction'
            );

            // Auto-refresh context to apply correction
            await projectMemory.refreshWorkingContext();

            toast({
                title: "CORRECTION PROPAGATED",
                description: "The neural brain has been updated with your feedback.",
            });

            setCorrectionText('');
            setIsCorrectionOpen(false);
        } catch (e) {
            console.error('Correction failed:', e);
        } finally {
            setIsThinking(false);
            setGenerationStep('');
        }
    };

    const handleDistill = async () => {
        setIsDistilling(true);
        try {
            await projectMemory.refreshWorkingContext();
            toast({ title: "BRAIN SYNCHRONIZED", description: "Active protocols rebuilt from permanent memory." });
        } finally {
            setIsDistilling(false);
        }
    };

    const handleAddManualInsight = () => {
        if (!manualInsightText.trim()) return;
        addInsight({
            text: manualInsightText,
            category: 'USER_PREFERENCE',
            confidence: 1.0,
            isPermanent: true,
            source: 'Manual Entry'
        });
        setManualInsightText('');
        toast({ title: "INSIGHT CAPTURED", description: "New project protocol added permanently." });
    };

    return (
        <Card className="neural-assistant-panel bg-black/40 border-primary/20 backdrop-blur-xl overflow-hidden">
            <div className="p-4 border-b border-primary/10 flex items-center justify-between bg-primary/5">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] font-mono text-primary/80">
                        Neural Production Assistant
                    </h3>
                </div>
                <Badge variant="outline" className="text-[8px] border-primary/20 text-primary opacity-60">
                    Agentic Mode v3.1
                </Badge>
            </div>

            <div className="p-4 space-y-6">
                {/* Directorial Advice Section */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-primary/60">
                            <Camera className="w-3.5 h-3.5" />
                            <span className="text-[9px] font-bold uppercase tracking-widest">Directorial Advice</span>
                        </div>
                        <div className="flex gap-1 items-center">
                            <button
                                onClick={() => setUseRecursiveReasoning(!useRecursiveReasoning)}
                                className={cn(
                                    "h-6 px-1.5 rounded-sm border transition-all flex items-center gap-1.5",
                                    useRecursiveReasoning ? "bg-primary/20 border-primary text-primary" : "bg-white/5 border-white/10 text-white/40"
                                )}
                                title={useRecursiveReasoning ? "Recursive Reasoning Enabled (RLM Mode)" : "Standard Mode"}
                            >
                                <BrainCircuit size={10} className={useRecursiveReasoning ? "animate-pulse" : ""} />
                                <span className="text-[8px] font-black uppercase">{useRecursiveReasoning ? "Recursive" : "Standard"}</span>
                            </button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsHistoryOpen(true)}
                                className="h-6 w-6 p-0 text-primary/40 hover:text-primary hover:bg-primary/10"
                                title="Advice History"
                            >
                                <History className="w-3 h-3" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleGenerateAdvice}
                                disabled={isThinking}
                                className="h-6 text-[8px] uppercase font-black hover:bg-primary/10"
                            >
                                {isThinking ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                                Refresh
                            </Button>
                        </div>
                    </div>

                    {advice ? (
                        <div className="relative group p-3 bg-primary/5 border border-primary/10 rounded-sm font-mono text-[11px] text-primary/80 leading-relaxed italic animate-in fade-in slide-in-from-top-2">
                            {advice.split('\n').map((line, i) => (
                                <p key={i} className="mb-1">{line}</p>
                            ))}
                            <div className="absolute -bottom-2 -right-2 flex gap-1 group-hover:opacity-100 opacity-0 transition-all">
                                {lastTrajectory.length > 0 && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setIsTrajectoryOpen(true)}
                                        className="h-6 px-2 bg-[#0a0a0b] border border-primary/20 text-[8px] uppercase font-black hover:bg-primary-dark"
                                    >
                                        <Layers size={10} className="mr-1" />
                                        Trace
                                    </Button>
                                )}
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setIsCorrectionOpen(true)}
                                    className="h-6 px-2 bg-[#0a0a0b] border border-primary/20 text-[8px] uppercase font-black hover:bg-primary hover:text-black"
                                >
                                    <MessageSquareQuote size={10} className="mr-1" />
                                    Correct AI
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div
                            className="p-4 border border-dashed border-primary/20 rounded-sm text-center cursor-pointer hover:bg-primary/5 transition-colors group"
                            onClick={handleGenerateAdvice}
                        >
                            <Info className="w-5 h-5 mx-auto mb-2 text-primary/20 group-hover:text-primary/40" />
                            <p className="text-[9px] text-primary/40 uppercase font-black tracking-widest">
                                Click to analyze production consistency
                            </p>
                        </div>
                    )}
                </div>

                {/* Production Health Indicators */}
                {currentPlan && (
                    <div className="p-3 bg-white/5 border border-white/5 rounded-sm space-y-3">
                        <div className="flex items-center gap-2 text-primary/40">
                            <Activity className="w-3 h-3" />
                            <span className="text-[8px] font-bold uppercase tracking-widest">Production Integrity</span>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-[9px] uppercase">
                                <span className="text-white/40">Reference Coverage</span>
                                <span className="text-primary font-black">
                                    {(() => {
                                        const planChars = new Set(currentPlan.shots.flatMap((s: any) => s.composition?.characterIds || []));
                                        if (planChars.size === 0) return '0%';
                                        const manifested = planChars.size > 0 ? Array.from(planChars).filter(cid => manifestedAssets.some(a => a.characterId === cid)).length : 0;
                                        return `${Math.round((manifested / planChars.size) * 100)}%`;
                                    })()}
                                </span>
                            </div>
                            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-1000"
                                    style={{
                                        width: (() => {
                                            const planChars = new Set(currentPlan.shots.flatMap((s: any) => s.composition?.characterIds || []));
                                            if (planChars.size === 0) return '0%';
                                            const manifested = Array.from(planChars).filter(cid => manifestedAssets.some(a => a.characterId === cid)).length;
                                            return `${(manifested / planChars.size) * 100}%`;
                                        })()
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Manufacturing Section: Character Reference Sheets */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-primary/60 border-b border-white/5 pb-1">
                        <UserPlus className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-bold uppercase tracking-widest">Neural Personas</span>
                    </div>

                    <div className="grid grid-cols-1 gap-1">
                        {characters.slice(0, 3).map((char) => (
                            <div
                                key={char.character_id}
                                className="flex items-center justify-between p-1.5 bg-white/5 border border-white/5 hover:border-primary/20 transition-all rounded-sm group overflow-hidden"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-6 h-6 rounded-sm bg-primary/10 border border-primary/20 overflow-hidden relative flex-shrink-0">
                                        {char.visual_identity?.generated_portrait ? (
                                            <img src={char.visual_identity.generated_portrait} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center opacity-40">
                                                <Layers className="w-3 h-3 text-primary" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-white/90 truncate">{char.name}</p>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={!!isGeneratingSheet}
                                    onClick={() => handleManifestAsset(char.character_id, 'CHARACTER')}
                                    className={cn(
                                        "h-6 text-[8px] font-black uppercase border-primary/20 hover:bg-primary text-primary hover:text-black gap-1 flex-shrink-0",
                                        manifestedAssets.some(a => a.characterId === char.character_id) && "bg-primary/20 text-white"
                                    )}
                                >
                                    {isGeneratingSheet === char.character_id ? (
                                        <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                                    ) : manifestedAssets.some(a => a.characterId === char.character_id) ? (
                                        <Layers className="w-2.5 h-2.5" />
                                    ) : (
                                        <Zap className="w-2.5 h-2.5" />
                                    )}
                                    {isGeneratingSheet === char.character_id ? generationStep : manifestedAssets.some(a => a.characterId === char.character_id) ? 'Refined' : 'Gen'}
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Manufacturing Section: Location Reference Sheets */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-primary/60 border-b border-white/5 pb-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-bold uppercase tracking-widest">Neural Environments</span>
                    </div>

                    <div className="grid grid-cols-1 gap-1">
                        {currentWorld?.locations?.slice(0, 3).map((loc) => (
                            <div
                                key={loc.id}
                                className="flex items-center justify-between p-1.5 bg-white/5 border border-white/5 hover:border-primary/20 transition-all rounded-sm group overflow-hidden"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-6 h-6 rounded-sm bg-primary/10 border border-primary/20 overflow-hidden relative flex-shrink-0 flex items-center justify-center">
                                        <MapPin className="w-3 h-3 text-primary/40" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-white/90 truncate">{loc.name}</p>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={!!isGeneratingSheet}
                                    onClick={() => handleManifestAsset(loc.id, 'LOCATION')}
                                    className={cn(
                                        "h-6 text-[8px] font-black uppercase border-primary/20 hover:bg-primary text-primary hover:text-black gap-1 flex-shrink-0",
                                        manifestedAssets.some(a => a.locationId === loc.id) && "bg-primary/20 text-white"
                                    )}
                                >
                                    {isGeneratingSheet === loc.id ? (
                                        <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                                    ) : manifestedAssets.some(a => a.locationId === loc.id) ? (
                                        <Layers className="w-2.5 h-2.5" />
                                    ) : (
                                        <Zap className="w-2.5 h-2.5" />
                                    )}
                                    {isGeneratingSheet === loc.id ? generationStep : manifestedAssets.some(a => a.locationId === loc.id) ? 'Refined' : 'Gen'}
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Manufacturing Section: Object Reference Sheets */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-primary/60 border-b border-white/5 pb-1">
                        <Package className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-bold uppercase tracking-widest">Neural Artifacts</span>
                    </div>

                    <div className="grid grid-cols-1 gap-1">
                        {currentWorld?.keyObjects?.slice(0, 3).map((obj) => (
                            <div
                                key={obj.id}
                                className="flex items-center justify-between p-1.5 bg-white/5 border border-white/5 hover:border-primary/20 transition-all rounded-sm group overflow-hidden"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-6 h-6 rounded-sm bg-primary/10 border border-primary/20 overflow-hidden relative flex-shrink-0 flex items-center justify-center">
                                        <Package className="w-3 h-3 text-primary/40" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-white/90 truncate">{obj.name}</p>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={!!isGeneratingSheet}
                                    onClick={() => handleManifestAsset(obj.id, 'OBJECT')}
                                    className={cn(
                                        "h-6 text-[8px] font-black uppercase border-primary/20 hover:bg-primary text-primary hover:text-black gap-1 flex-shrink-0",
                                        manifestedAssets.some(a => a.objectId === obj.id) && "bg-primary/20 text-white"
                                    )}
                                >
                                    {isGeneratingSheet === obj.id ? (
                                        <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                                    ) : manifestedAssets.some(a => a.objectId === obj.id) ? (
                                        <Layers className="w-2.5 h-2.5" />
                                    ) : (
                                        <Zap className="w-2.5 h-2.5" />
                                    )}
                                    {isGeneratingSheet === obj.id ? generationStep : manifestedAssets.some(a => a.objectId === obj.id) ? 'Refined' : 'Gen'}
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Aesthetic Registry */}
                <div className="pt-4 border-t border-primary/10">
                    <div className="flex items-center gap-2 mb-3 text-primary/60">
                        <Palette className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-bold uppercase tracking-widest">Ontological Vibe</span>
                    </div>

                    <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                            {currentWorld?.visualIntent?.vibe?.split(',').map((tag, i) => (
                                <Badge key={i} variant="secondary" className="bg-primary/10 text-primary/60 text-[9px] border-primary/10">
                                    {tag.trim().toUpperCase()}
                                </Badge>
                            )) || (
                                    <span className="text-[9px] text-white/20 italic">No vibe registry active. Sync World.</span>
                                )}
                        </div>

                        <div className="flex gap-1 mt-2">
                            {currentWorld?.visualIntent?.colors?.map((color, i) => (
                                <div
                                    key={i}
                                    className="w-12 h-2 rounded-full border border-white/10"
                                    style={{ backgroundColor: color }}
                                    title={color}
                                />
                            )) || null}
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-3 bg-primary/5 flex items-center justify-center gap-4">
                <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                    <DialogTrigger asChild>
                        <button className="text-[9px] font-black text-primary/40 uppercase tracking-widest hover:text-primary transition-colors flex items-center justify-center gap-1">
                            <Settings className="w-3 h-3" />
                            Settings
                        </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md bg-[#0a0a0b] border-primary/20 text-white font-mono">
                        <DialogHeader>
                            <DialogTitle className="text-primary uppercase tracking-[0.3em] font-black text-xs flex items-center gap-2">
                                <Settings className="w-4 h-4" />
                                Model Orchestration
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-6 mt-4">
                            <div className="space-y-2">
                                <p className="text-[10px] uppercase font-bold text-white/60">Selected Neural Workflow</p>
                                <div className="grid grid-cols-1 gap-2">
                                    {WORKFLOW_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.id}
                                            onClick={() => setSelectedModel(opt.id)}
                                            className={cn(
                                                "flex items-center justify-between p-3 border rounded-sm transition-all text-left",
                                                selectedModel === opt.id
                                                    ? "bg-primary/20 border-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]"
                                                    : "bg-white/5 border-white/10 hover:border-white/20"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-lg">{opt.icon}</span>
                                                <div>
                                                    <p className="text-[11px] font-black text-white uppercase">{opt.name}</p>
                                                    <p className="text-[9px] text-white/40">{opt.description}</p>
                                                </div>
                                            </div>
                                            {selectedModel === opt.id && <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="mt-6 border-t border-white/5 pt-4">
                            <Button
                                onClick={() => setIsSettingsOpen(false)}
                                className="bg-primary text-black font-black uppercase text-[10px] w-full"
                            >
                                Apply Configuration
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={isMemoryOpen} onOpenChange={setIsMemoryOpen}>
                    <DialogTrigger asChild>
                        <button className="text-[9px] font-black text-primary/40 uppercase tracking-widest hover:text-primary transition-colors flex items-center justify-center gap-1">
                            <Brain className="w-3 h-3" />
                            Memory
                        </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl bg-[#0a0a0b] border-primary/20 text-white font-mono">
                        <DialogHeader>
                            <DialogTitle className="text-primary uppercase tracking-[0.3em] font-black text-xs flex items-center gap-2">
                                <Database className="w-4 h-4" />
                                Project Memory: Neural Brain
                            </DialogTitle>
                        </DialogHeader>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                            {/* Working Context (The Counter) */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] uppercase font-black text-white/60 flex items-center gap-2">
                                        <ShieldCheck className="w-3 h-3 text-primary" />
                                        Active Protocol
                                    </h4>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-5 text-[8px] uppercase font-bold hover:bg-primary/10"
                                        onClick={handleDistill}
                                        disabled={isDistilling}
                                    >
                                        <RefreshCw size={10} className={cn("mr-1", isDistilling && "animate-spin")} />
                                        {isDistilling ? 'Distilling...' : 'Distill'}
                                    </Button>
                                </div>
                                <div className="p-4 bg-primary/5 border border-primary/20 rounded-sm text-[11px] leading-relaxed text-primary/80 min-h-[150px] whitespace-pre-wrap relative overflow-hidden">
                                    <div className="absolute inset-x-0 h-px bg-primary/20 top-0 animate-scan" />
                                    {workingContext}
                                </div>
                            </div>

                            {/* Manual Entry */}
                            <div className="space-y-2">
                                <h4 className="text-[10px] uppercase font-black text-white/40">Inject Manual Protocol</h4>
                                <div className="flex gap-2">
                                    <Input
                                        value={manualInsightText}
                                        onChange={(e) => setManualInsightText(e.target.value)}
                                        placeholder="e.g. 'Use anamorphic lens flares'..."
                                        className="h-8 text-[10px] bg-white/5 border-white/10"
                                    />
                                    <Button
                                        size="sm"
                                        className="h-8 px-3 bg-primary text-black font-black uppercase text-[9px]"
                                        onClick={handleAddManualInsight}
                                    >
                                        Inject
                                    </Button>
                                </div>
                            </div>

                            {/* Captured Insights (The Daily Log / Registers) */}
                            <div className="space-y-3">
                                <h4 className="text-[10px] uppercase font-black text-white/60 flex items-center gap-2">
                                    <Bookmark className="w-3 h-3 text-primary" />
                                    Captured Insights
                                </h4>
                                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                                    {insights.length === 0 ? (
                                        <div className="py-10 text-center border border-dashed border-white/5 rounded-sm">
                                            <p className="text-[9px] text-white/20 uppercase">No project insights captured yet.</p>
                                        </div>
                                    ) : (
                                        insights.map((insight) => (
                                            <div
                                                key={insight.id}
                                                className={cn(
                                                    "p-3 rounded-sm border transition-all group",
                                                    insight.isPermanent ? "bg-primary/10 border-primary/30" : "bg-white/5 border-white/10"
                                                )}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-[8px] font-black text-primary uppercase tracking-tighter">
                                                        {insight.category.replace('_', ' ')}
                                                    </span>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {!insight.isPermanent && (
                                                            <button
                                                                onClick={() => promoteInsight(insight.id)}
                                                                className="p-1 hover:text-primary transition-colors"
                                                                title="Promote to Permanent Memory"
                                                            >
                                                                <Zap size={10} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => removeInsight(insight.id)}
                                                            className="p-1 hover:text-red-500 transition-colors"
                                                            title="Purge Identity"
                                                        >
                                                            <Trash2 size={10} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="text-[10px] text-white/80 leading-snug">{insight.text}</p>
                                                <div className="mt-2 flex items-center justify-between text-[7px] uppercase text-white/20">
                                                    <span>Source: {insight.source}</span>
                                                    <span>Conf: {Math.round(insight.confidence * 100)}%</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="mt-6 border-t border-primary/10 pt-4">
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-[10px] font-black uppercase border-primary/20 hover:bg-primary hover:text-black"
                                onClick={() => setIsMemoryOpen(false)}
                            >
                                Close Brain
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={isLedgerOpen} onOpenChange={setIsLedgerOpen}>
                    <DialogTrigger asChild>
                        <button className="text-[9px] font-black text-primary/60 uppercase tracking-widest hover:text-primary transition-colors flex items-center justify-center gap-1">
                            <Eye className="w-3 h-3" />
                            Ledger
                        </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl bg-[#0a0a0b] border-primary/20 text-white font-mono">
                        <DialogHeader>
                            <DialogTitle className="text-primary uppercase tracking-[0.3em] font-black text-xs flex items-center gap-2">
                                <ClipboardList className="w-4 h-4" />
                                Production Ledger: Manifested Assets
                            </DialogTitle>
                        </DialogHeader>

                        <div className="flex flex-col gap-4 mt-6">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex gap-2">
                                    {(['ALL', 'CHARACTER_REFERENCE_SHEET', 'LOCATION_REFERENCE_SHEET', 'OBJECT_REFERENCE_SHEET'] as const).map(f => (
                                        <Badge
                                            key={f}
                                            onClick={() => setLedgerFilter(f)}
                                            className={cn(
                                                "cursor-pointer text-[9px] px-2 py-0.5 uppercase tracking-tighter transition-all",
                                                ledgerFilter === f ? "bg-primary text-black" : "bg-white/5 text-white/40 hover:text-white"
                                            )}
                                        >
                                            {f === 'ALL' ? 'Total Archive' : f.split('_')[0]}
                                        </Badge>
                                    ))}
                                </div>
                                <div className="relative flex-1 max-w-xs">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20" />
                                    <input
                                        type="text"
                                        placeholder="Search manifest records..."
                                        value={ledgerSearch}
                                        onChange={(e) => setLedgerSearch(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-sm py-1 pl-7 pr-2 text-[10px] text-white focus:outline-none focus:border-primary/40"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 max-h-[60vh] overflow-auto p-1 custom-scrollbar">
                                {manifestedAssets
                                    .filter(a => ledgerFilter === 'ALL' || a.type === ledgerFilter)
                                    .filter(a => a.characterName?.toLowerCase().includes(ledgerSearch.toLowerCase()))
                                    .length === 0 ? (
                                    <div className="col-span-3 py-20 text-center border border-dashed border-primary/10 rounded-sm">
                                        <Layers className="w-12 h-12 mx-auto mb-4 text-primary/10" />
                                        <p className="text-[10px] text-primary/40 uppercase tracking-widest">No matching neural records found</p>
                                    </div>
                                ) : (
                                    manifestedAssets
                                        .filter(a => ledgerFilter === 'ALL' || a.type === ledgerFilter)
                                        .filter(a => a.characterName?.toLowerCase().includes(ledgerSearch.toLowerCase()))
                                        .map(asset => (
                                            <div key={asset.id} className="group relative bg-[#0d0d0e] border border-white/10 hover:border-primary/40 rounded-sm overflow-hidden transition-all shadow-xl">
                                                <div className="aspect-[4/5] bg-black overflow-hidden relative">
                                                    <img src={asset.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />

                                                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                                                        <Badge className="text-[7px] py-0 bg-primary/20 text-primary border-primary/40">
                                                            SYNCHRONIZED
                                                        </Badge>
                                                    </div>

                                                    <button
                                                        onClick={() => {
                                                            useProductionStore.getState().removeManifestedAsset(asset.id);
                                                            toast({ title: "RECORD PURGED", description: "The neural artifact has been scrubbed from the ledger." });
                                                        }}
                                                        className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-500/80 text-white rounded-sm opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                                <div className="p-3">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <p className="text-[10px] font-black text-white uppercase truncate">{asset.characterName}</p>
                                                        <Badge className="text-[7px] py-0 bg-white/5 text-primary/60 border-primary/20">
                                                            {asset.type.split('_')[0]}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center justify-between mt-3">
                                                        <span className="text-[8px] text-white/30 tracking-tighter uppercase font-mono">
                                                            {new Date(asset.generatedAt).toLocaleDateString()}
                                                        </span>
                                                        <div className="flex gap-1">
                                                            <Button size="icon" variant="ghost" className="h-6 w-6 text-primary/40 hover:text-primary hover:bg-primary/10">
                                                                <Download className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                )}
                            </div>
                        </div>

                        <DialogFooter className="mt-6 border-t border-primary/10 pt-4">
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-[10px] font-black uppercase border-primary/20 hover:bg-primary hover:text-black"
                                onClick={() => setIsLedgerOpen(false)}
                            >
                                Close Manifest
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Advice History Dialog */}
                <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
                    <DialogTrigger asChild>
                        <button className="text-[9px] font-black text-white/40 uppercase tracking-widest hover:text-primary transition-colors flex items-center justify-center gap-1">
                            <History size={11} />
                            Logs
                        </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl bg-[#0a0a0b] border-primary/20 text-white font-mono">
                        <DialogHeader>
                            <DialogTitle className="text-primary uppercase tracking-[0.3em] font-black text-xs flex items-center gap-2">
                                <History className="w-4 h-4" />
                                Directorial Advice History
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4 mt-6 max-h-[60vh] overflow-auto p-2">
                            {adviceHistory.length === 0 ? (
                                <div className="py-20 text-center border border-dashed border-primary/10 rounded-sm">
                                    <Camera className="w-12 h-12 mx-auto mb-4 text-primary/10" />
                                    <p className="text-[10px] text-primary/40 uppercase tracking-widest">No advice generated in this session</p>
                                </div>
                            ) : (
                                adviceHistory.map(item => (
                                    <div key={item.id} className="p-4 bg-white/5 border border-white/10 rounded-sm">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[8px] text-primary/40 uppercase tracking-widest">{new Date(item.timestamp).toLocaleString()}</span>
                                            <Badge variant="outline" className="text-[8px] border-primary/20 text-primary/60">Log #{item.id.slice(0, 8)}</Badge>
                                        </div>
                                        <p className="text-[11px] text-white/80 leading-relaxed italic border-l-2 border-primary/20 pl-4 py-1">
                                            {item.text}
                                        </p>
                                        <div className="mt-3 text-[8px] text-white/20 uppercase">
                                            Context: {item.context}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <DialogFooter className="mt-6 border-t border-primary/10 pt-4">
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-[10px] font-black uppercase border-primary/20 hover:bg-primary hover:text-black"
                                onClick={() => setIsHistoryOpen(false)}
                            >
                                Close History
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Correction Dialog */}
                <Dialog open={isCorrectionOpen} onOpenChange={setIsCorrectionOpen}>
                    <DialogContent className="max-w-md bg-[#0a0a0b] border-primary/20 text-white font-mono">
                        <DialogHeader>
                            <DialogTitle className="text-primary uppercase tracking-[0.3em] font-black text-xs flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                Memory Correction
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4 mt-4">
                            <p className="text-[10px] text-white/40 uppercase leading-snug">
                                Feedback will be processed by the Write Gate to update permanent project protocols.
                            </p>
                            <textarea
                                value={correctionText}
                                onChange={(e) => setCorrectionText(e.target.value)}
                                placeholder="e.g., 'Actually, the lighting should be more blue/cold' or 'This character never smiles'..."
                                className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-[11px] text-white min-h-[120px] focus:outline-none focus:border-primary/40 resize-none"
                            />
                        </div>

                        <DialogFooter className="mt-6 border-t border-white/5 pt-4">
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-[10px] font-black uppercase border-primary/20 hover:bg-primary hover:text-black"
                                onClick={() => setIsCorrectionOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleCorrection}
                                disabled={!correctionText.trim() || isThinking}
                                className="bg-primary text-black font-black uppercase text-[10px]"
                            >
                                {isThinking ? <RefreshCw className="w-3 h-3 animate-spin mr-2" /> : <Zap className="w-3 h-3 mr-2" />}
                                Commit to Memory
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Trajectory Trace Dialog */}
                <Dialog open={isTrajectoryOpen} onOpenChange={setIsTrajectoryOpen}>
                    <DialogContent className="max-w-3xl bg-[#0a0a0b] border-primary/20 text-white font-mono">
                        <DialogHeader>
                            <DialogTitle className="text-primary uppercase tracking-[0.3em] font-black text-xs flex items-center gap-2">
                                <Layers className="w-4 h-4" />
                                Reasoning Trajectory Trace
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4 mt-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                            {lastTrajectory.map((step: any, i: number) => (
                                <div key={i} className="relative pl-6 border-l border-primary/10 pb-4 last:pb-0">
                                    <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-primary/40 border border-primary/20" />

                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge variant="outline" className="text-[7px] border-primary/20 text-primary/60">
                                            DEPTH {step.depth}
                                        </Badge>
                                        <span className="text-[9px] text-white/20 uppercase tracking-widest">
                                            {new Date(step.timestamp).toLocaleTimeString()}
                                        </span>
                                    </div>

                                    <div className="p-3 bg-white/5 border border-white/5 rounded-sm space-y-3">
                                        <div>
                                            <p className="text-[8px] uppercase font-black text-white/40 mb-1">Original Goal</p>
                                            <p className="text-[10px] text-white/60 line-clamp-2">{step.task}</p>
                                        </div>

                                        {step.thought && (
                                            <div>
                                                <p className="text-[8px] uppercase font-black text-primary/40 mb-1">Reasoning Thought</p>
                                                <p className="text-[10px] text-primary/80 italic leading-relaxed">{step.thought}</p>
                                            </div>
                                        )}

                                        {step.action && (
                                            <div className="flex items-center gap-2 py-1 px-2 bg-primary/10 border border-primary/30 rounded-sm">
                                                <Zap className="w-3 h-3 text-primary" />
                                                <p className="text-[9px] font-black text-primary uppercase">{step.action}</p>
                                            </div>
                                        )}

                                        {step.result && (
                                            <div>
                                                <p className="text-[8px] uppercase font-black text-white/40 mb-1">Synth Output</p>
                                                <p className="text-[10px] text-white/90 leading-relaxed">{step.result}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <DialogFooter className="mt-6 border-t border-primary/10 pt-4">
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-[10px] font-black uppercase border-primary/20 hover:bg-primary hover:text-black"
                                onClick={() => setIsTrajectoryOpen(false)}
                            >
                                Close Trace
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </Card>
    );
}
