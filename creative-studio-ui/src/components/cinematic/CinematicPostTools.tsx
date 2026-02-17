import React, { useState, useMemo } from 'react';
import {
    Mic,
    Video,
    Scissors,
    Languages,
    Sparkles,
    Play,
    Settings2,
    Share2,
    Trash2,
    Volume2,
    Download,
    Image as ImageIcon,
    RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAppStore } from '@/stores/useAppStore';
import { lipSyncService } from '@/services/lipSyncService';
import { postProductionService } from '@/services/postProductionService';
import './CinematicPostTools.css';

/**
 * Cinematic Post-Generation Tools
 * Advanced tools for polishing generated videos.
 * Features: Lip Sync, Frame Extraction, Audio Remix.
 */
export function CinematicPostTools() {
    const { project, shots, selectedShotId } = useAppStore();
    const [activeTool, setActiveTool] = useState<'lipsync' | 'frames' | 'audio'>('lipsync');
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);

    const [extractedFrames, setExtractedFrames] = useState<string[]>([]);
    const [resultVideo, setResultVideo] = useState<string | null>(null);
    const [audioRemixPrompt, setAudioRemixPrompt] = useState("");

    // Current selected shot video URL
    const currentShot = useMemo(() =>
        shots.find(s => s.id === selectedShotId),
        [shots, selectedShotId]
    );

    const sourceVideoUrl = currentShot?.result_url || null;

    const handleLipSync = async () => {
        if (!sourceVideoUrl) return;
        setIsProcessing(true);
        setProgress(0);
        setResultVideo(null);

        try {
            // In a real usage, we would have picked character and audio
            // For now, we use placeholders or previous logic
            const { job_id } = await lipSyncService.startLipSync({
                character_image: "character_placeholder.jpg",
                dialogue_audio: "dialogue_placeholder.mp3",
                preset: "high-quality"
            });

            const result = await lipSyncService.monitorJob(job_id, (p) => {
                setProgress(p);
            });

            if (result.output_path) {
                const filename = result.output_path.split('\\').pop() || result.output_path.split('/').pop();
                setResultVideo(`/output/lip_sync/${filename}`);
            }
        } catch (error) {
            console.error('Lip Sync failed:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleExtractFrames = async () => {
        if (!sourceVideoUrl) return;
        setIsProcessing(true);
        setProgress(0);

        try {
            const filename = sourceVideoUrl.split('/').pop() || '';
            const result = await postProductionService.extractFrames(filename, 1.0); // 1 frame per sec
            setExtractedFrames(result.frames);
        } catch (error) {
            console.error('Frame extraction failed:', error);
        } finally {
            setIsProcessing(false);
            setProgress(100);
        }
    };

    const handleAudioRemix = async () => {
        if (!project || !currentShot) return;
        setIsProcessing(true);
        setProgress(0);

        try {
            const { job_id } = await postProductionService.startAudioRemix({
                projectId: project.id,
                sceneId: currentShot.id,
                audioPrompt: audioRemixPrompt || "Ambiance cinématographique riche, sound design renforcé.",
                style: (project.metadata?.style as string) || 'Cinematic'
            });

            const result = await postProductionService.monitorJob(job_id, (p) => {
                setProgress(p);
            });

            // After audio remix, we look for the muxed video result
            const muxedVideo = result.results.find(r => r.step === 'muxed_video');
            if (muxedVideo && muxedVideo.output && muxedVideo.output.filename) {
                setResultVideo(`/output/${muxedVideo.output.filename}`);
            }

            console.log('Audio Remix completed:', result);
        } catch (error) {
            console.error('Audio Remix failed:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="cinematic-post-tools">
            <div className="post-tools-header">
                <div className="title-area">
                    <Settings2 className="w-5 h-5 text-primary" />
                    <h3>Outils Post-Production</h3>
                </div>
                <div className="tool-selector">
                    <Button
                        variant={activeTool === 'lipsync' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTool('lipsync')}
                    >
                        <Mic className="w-4 h-4 mr-2" /> Lip Sync
                    </Button>
                    <Button
                        variant={activeTool === 'frames' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTool('frames')}
                    >
                        <Scissors className="w-4 h-4 mr-2" /> Frames
                    </Button>
                    <Button
                        variant={activeTool === 'audio' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTool('audio')}
                    >
                        <Volume2 className="w-4 h-4 mr-2" /> Audio
                    </Button>
                </div>
            </div>

            <div className="tool-content">
                {!sourceVideoUrl && (
                    <div className="empty-state p-8 text-center text-muted-foreground">
                        <Video className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p>Sélectionnez un plan généré dans la timeline pour utiliser ces outils.</p>
                    </div>
                )}

                {sourceVideoUrl && activeTool === 'lipsync' && (
                    <div className="tool-inner lipsync-tool">
                        <div className="video-preview-ref">
                            <video src={resultVideo || sourceVideoUrl} controls className="w-full h-full object-cover" />
                            <Badge className="absolute top-2 right-2">{resultVideo ? "Version Review" : "Original"}</Badge>
                        </div>

                        <div className="lipsync-settings">
                            <div className="setting-group">
                                <label>Source Audio</label>
                                <div className="audio-upload-zone">
                                    <Mic className="w-5 h-5 text-muted-foreground mr-2" />
                                    <span className="text-sm">Glissez un fichier .mp3 ou .wav</span>
                                </div>
                            </div>

                            <div className="setting-group">
                                <label>Précision</label>
                                <div className="flex gap-2">
                                    <Badge variant="secondary" className="cursor-pointer">Standard</Badge>
                                    <Badge variant="outline" className="cursor-pointer">Haute (HD)</Badge>
                                </div>
                            </div>

                            <Button
                                className="w-full mt-4"
                                onClick={handleLipSync}
                                disabled={isProcessing}
                            >
                                {isProcessing ? (
                                    <>Sincronisation en cours... {progress}%</>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4 mr-2" /> Appliquer Lip Sync
                                    </>
                                )}
                            </Button>
                            {isProcessing && <Progress value={progress} className="mt-2 h-1" />}
                        </div>
                    </div>
                )}

                {sourceVideoUrl && activeTool === 'frames' && (
                    <div className="tool-inner frames-tool">
                        {extractedFrames.length > 0 ? (
                            <div className="frames-display-area">
                                <div className="frames-grid">
                                    {extractedFrames.map((frame, i) => (
                                        <div key={i} className="frame-item group">
                                            <img src={frame} alt={`Frame ${i}`} className="frame-img" />
                                            <div className="frame-overlay opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button size="icon" variant="secondary" className="w-8 h-8" onClick={() => window.open(frame, '_blank')}>
                                                    <Download className="w-4 h-4" />
                                                </Button>
                                            </div>
                                            <span className="frame-timestamp">{i}s</span>
                                        </div>
                                    ))}
                                </div>
                                <Button variant="outline" size="sm" className="w-full mt-4" onClick={() => setExtractedFrames([])}>
                                    <RefreshCw className="w-3 h-3 mr-2" /> Réinitialiser
                                </Button>
                            </div>
                        ) : (
                            <div className="frames-empty text-center p-8">
                                <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                <p className="text-sm mb-4">Extrayez des images haute définition pour vos posters ou storyboards.</p>
                                <Button
                                    onClick={handleExtractFrames}
                                    disabled={isProcessing}
                                    className="w-full"
                                >
                                    {isProcessing ? "Extraction..." : "Extraire images clés (1/s)"}
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {sourceVideoUrl && activeTool === 'audio' && (
                    <div className="tool-inner audio-tool p-4">
                        <div className="audio-hero text-center mb-6">
                            <Volume2 className="w-12 h-12 mx-auto mb-2 text-primary" />
                            <h4>Régénération du Sound Design</h4>
                            <p className="text-xs text-muted-foreground">Recréez entièrement l'ambiance sonore du plan en conservant l'image.</p>
                        </div>

                        <div className="audio-settings-grid">
                            <div className="setting-card">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground">Prompt SFX Additionnel</label>
                                <textarea
                                    className="w-full bg-muted border border-border p-2 rounded text-xs mt-1 h-20"
                                    placeholder="Ex: Ajouter plus d'écho, tons plus graves, bruits de vent..."
                                    value={audioRemixPrompt}
                                    onChange={(e) => setAudioRemixPrompt(e.target.value)}
                                />
                            </div>

                            <Button
                                className="w-full mt-4"
                                onClick={handleAudioRemix}
                                disabled={isProcessing}
                            >
                                {isProcessing ? (
                                    <>Génération Audio... {progress}%</>
                                ) : (
                                    <>
                                        <RefreshCw className="w-4 h-4 mr-2" /> Régénérer l'Audio
                                    </>
                                )}
                            </Button>
                            {isProcessing && <Progress value={progress} className="mt-2 h-1" />}
                        </div>
                    </div>
                )}
            </div>

            <div className="post-tools-footer">
                <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => {
                    setResultVideo(null);
                    setExtractedFrames([]);
                }}>
                    <Trash2 className="w-4 h-4 mr-2" /> Effacer
                </Button>
                <Button size="sm" disabled={!resultVideo}>
                    <Share2 className="w-4 h-4 mr-2" /> Enregistrer Version
                </Button>
            </div>
        </div>
    );
}
