import React, { useState } from 'react';
import {
    User,
    Camera,
    Sparkles,
    Download,
    RefreshCw,
    LayoutGrid,
    Maximize2,
    Trash2,
    CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cineProductionAPI } from '@/services/cineProductionAPI';
import { useAppStore } from '@/stores/useAppStore';
import './CharacterBoardGenerator.css';

interface BoardSlot {
    id: string;
    type: 'face' | 'profile' | 'action' | 'detail';
    label: string;
    image: string | null;
    isGenerating: boolean;
}

/**
 * Character Board Generator
 * Generates a consistency reference sheet for a character.
 * 4 standard views for IP-Adapter and Character Coherence.
 */
export function CharacterBoardGenerator({ characterName = "Héro Anonyme" }) {
    const { project } = useAppStore();
    const [slots, setSlots] = useState<BoardSlot[]>([
        { id: '1', type: 'face', label: 'Portrait Face', image: null, isGenerating: false },
        { id: '2', type: 'profile', label: 'Profil / 3/4', image: null, isGenerating: false },
        { id: '3', type: 'action', label: 'Pose d\'Action', image: null, isGenerating: false },
        { id: '4', type: 'detail', label: 'Détail (Costume/Texture)', image: null, isGenerating: false },
    ]);

    const [isGeneratingAll, setIsGeneratingAll] = useState(false);

    const handleGenerateSlot = async (id: string) => {
        if (!project) return;

        const slot = slots.find(s => s.id === id);
        if (!slot) return;

        setSlots(slots.map(s => s.id === id ? { ...s, isGenerating: true } : s));

        try {
            const prompt = `Character portrait of ${characterName}, ${slot.label}, high quality, cinematic lighting, consistency reference`;

            const { jobId } = await cineProductionAPI.startProduction({
                projectId: project.id,
                chainType: 'storyboard_only',
                sceneDescription: prompt,
                imagePrompt: prompt
            });

            const result = await cineProductionAPI.monitorJob(jobId);

            if (result.results && result.results.length > 0) {
                const imgRes = result.results.find(r => r.step === 'storyboard');
                if (imgRes && imgRes.output && imgRes.output.filename) {
                    setSlots(prev => prev.map(s => s.id === id ? {
                        ...s,
                        isGenerating: false,
                        image: `/output/${imgRes.output.filename}`
                    } : s));
                }
            }
        } catch (error) {
            console.error('Board generation failed:', error);
            setSlots(prev => prev.map(s => s.id === id ? { ...s, isGenerating: false } : s));
        }
    };

    const handleGenerateAll = () => {
        setIsGeneratingAll(true);
        slots.forEach(s => handleGenerateSlot(s.id));
        setTimeout(() => setIsGeneratingAll(false), 2500);
    };

    return (
        <div className="character-board-generator">
            <div className="board-header">
                <div className="board-title">
                    <LayoutGrid className="w-5 h-5 text-primary" />
                    <h3>Planche de Cohérence: {characterName}</h3>
                </div>
                <div className="board-actions">
                    <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" /> Export
                    </Button>
                    <Button size="sm" onClick={handleGenerateAll} disabled={isGeneratingAll}>
                        {isGeneratingAll ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                        Générer Planche
                    </Button>
                </div>
            </div>

            <div className="board-grid">
                {slots.map((slot) => (
                    <div key={slot.id} className="board-slot-card">
                        <div className="slot-image-container">
                            {slot.image ? (
                                <>
                                    <img src={slot.image} alt={slot.label} className="slot-image" />
                                    <div className="slot-overlay">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20">
                                            <Maximize2 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-white hover:bg-white/20"
                                            onClick={() => handleGenerateSlot(slot.id)}
                                        >
                                            <RefreshCw className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <div className="slot-placeholder">
                                    {slot.isGenerating ? (
                                        <div className="generating-state">
                                            <RefreshCw className="w-8 h-8 animate-spin text-primary opacity-50" />
                                            <span>Génération...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <Camera className="w-10 h-10 text-muted-foreground opacity-20" />
                                            <Button variant="secondary" size="sm" onClick={() => handleGenerateSlot(slot.id)}>
                                                Générer {slot.type}
                                            </Button>
                                        </>
                                    )}
                                </div>
                            )}
                            {slot.image && (
                                <div className="ready-badge">
                                    <CheckCircle2 className="w-3 h-3 mr-1" /> Prêt
                                </div>
                            )}
                        </div>
                        <div className="slot-info">
                            <span className="slot-label">{slot.label}</span>
                            <Badge variant="outline" className="text-[10px] py-0">{slot.type.toUpperCase()}</Badge>
                        </div>
                    </div>
                ))}
            </div>

            <div className="board-footer">
                <div className="coherence-info">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <p>Ces images servent de références pour maintenir la cohérence visuelle à travers tous les plans de la séquence.</p>
                </div>
            </div>
        </div>
    );
}
