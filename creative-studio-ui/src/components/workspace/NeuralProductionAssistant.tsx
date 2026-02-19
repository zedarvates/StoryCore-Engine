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
    Eye
} from 'lucide-react';
import { useStore } from '@/store';
import { useAppStore } from '@/stores/useAppStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
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

    const [isGeneratingSheet, setIsGeneratingSheet] = useState<string | null>(null);
    const [advice, setAdvice] = useState<string | null>(null);
    const [isThinking, setIsThinking] = useState(false);

    React.useEffect(() => {
        const handleGenEvent = (e: any) => {
            if (e.detail?.characterId) {
                handleGenerateCharacterSheet(e.detail.characterId);
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

            const prompt = `You are a High-Fidelity Cinematic Production Agent. 
            Analyze the current project context:
            ${worldInfo}
            Characters: ${characters.map(c => c.name).join(', ')}

            Provide 3 precise directorial tips for visual consistency based on the "Neural Reality Synthesis" protocol.
            Focus on lighting, lens choice (24mm vs 85mm), and color grading.
            Format: Short bullet points.`;

            // Use the general generation method with a default model
            const availableModels = await ollamaClient.listModels();
            const modelToUse = availableModels.find(m => m.category === 'storytelling' || m.category === 'general')?.name || 'llama3';

            const response = await ollamaClient.generate(modelToUse, prompt, { temperature: 0.7 });
            setAdvice(response);
        } catch (err) {
            console.error('Failed to get directorial advice:', err);
            setAdvice('Neural link interrupted. Please check LLM status.');
        } finally {
            setIsThinking(false);
        }
    };

    const handleGenerateCharacterSheet = (charId: string) => {
        setIsGeneratingSheet(charId);
        // Mock generation delay
        setTimeout(() => {
            setIsGeneratingSheet(null);
            // In a real scenario, this would trigger ComfyUI/StableDiffusion
            console.log(`Character sheet generated for ${charId}`);
        }, 3000);
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

                    {advice ? (
                        <div className="p-3 bg-primary/5 border border-primary/10 rounded-sm font-mono text-[11px] text-primary/80 leading-relaxed italic animate-in fade-in slide-in-from-top-2">
                            {advice.split('\n').map((line, i) => (
                                <p key={i} className="mb-1">{line}</p>
                            ))}
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

                {/* Manufacturing Section: Character Reference Sheets */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-primary/60">
                        <UserPlus className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-bold uppercase tracking-widest">Neural Manufacturing</span>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                        {characters.slice(0, 4).map((char) => (
                            <div
                                key={char.character_id}
                                className="flex items-center justify-between p-2 bg-white/5 border border-white/5 hover:border-primary/20 transition-all rounded-sm group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-sm bg-primary/10 border border-primary/20 overflow-hidden relative">
                                        {char.visual_identity?.generated_portrait ? (
                                            <img src={char.visual_identity.generated_portrait} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center opacity-40">
                                                <Layers className="w-4 h-4" />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold text-white/90">{char.name}</p>
                                        <p className="text-[9px] text-white/40 uppercase tracking-wider">
                                            {char.visual_identity?.clothing_style || 'Concept Pending'}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={!!isGeneratingSheet}
                                    onClick={() => handleGenerateCharacterSheet(char.character_id)}
                                    className="h-7 text-[9px] font-black uppercase border-primary/20 hover:bg-primary text-primary hover:text-black gap-1"
                                >
                                    {isGeneratingSheet === char.character_id ? (
                                        <RefreshCw className="w-3 h-3 animate-spin" />
                                    ) : (
                                        <Layers className="w-3 h-3" />
                                    )}
                                    {isGeneratingSheet === char.character_id ? 'Manifesting...' : 'Gen Sheet'}
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

            <div className="p-3 bg-primary/5 text-center">
                <button className="text-[9px] font-black text-primary/60 uppercase tracking-widest hover:text-primary transition-colors flex items-center justify-center gap-1 mx-auto">
                    <Eye className="w-3 h-3" />
                    Open Production Ledger
                    <ChevronRight className="w-2.5 h-2.5" />
                </button>
            </div>
        </Card>
    );
}
