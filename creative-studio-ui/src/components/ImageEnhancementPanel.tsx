
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { GlassCard } from './ui/GlassCard';
import { CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { highImpactApi, HighImpactResult } from '@/services/highImpactApiService';
import type { ApiResponse } from '@/services/backendApiService';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Sparkles, Wand2, Music, Shirt, Palette, Camera, UserCheck, _ArrowLeft, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { I18nContext } from '@/utils/i18nContext';
import { useContext } from 'react';

const ImageEnhancementPanel: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<HighImpactResult | null>(null);
    const [progress, setProgress] = useState(0);
    const context = useContext(I18nContext);
    const t = context?.t || ((key: string) => key);

    // States for various features
    const [skinIntensity, setSkinIntensity] = useState(0.5);
    const [sfxPrompt, setSfxPrompt] = useState("");
    const [outfitPrompt, setOutfitPrompt] = useState("");
    const [infoText, setInfoText] = useState("");

    const [personFile, setPersonFile] = useState<File | null>(null);
    const [garmentFile, setGarmentFile] = useState<File | null>(null);
    const [refFile, setRefFile] = useState<File | null>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (f: File | null) => void) => {
        if (e.target.files && e.target.files[0]) {
            setter(e.target.files[0]);
        }
    };

    const runTask = async (taskName: string, call: () => Promise<ApiResponse<HighImpactResult>>) => {
        setLoading(true);
        setProgress(20);
        setResult(null);
        try {
            const timer = setInterval(() => setProgress(p => p < 90 ? p + 5 : p), 500);
            const res = await call();
            clearInterval(timer);
            setProgress(100);
            
            if (res.success && res.data) {
                setResult(res.data);
                toast({ title: `${taskName} Completed`, description: "Process finished successfully." });
            } else {
                toast({ title: "Error", description: res.error || "Execution failed", variant: "destructive" });
            }
        } catch (e: unknown) {
            const error = e as Error;
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-8 min-h-screen bg-gradient-to-br from-slate-900 to-black text-white">
            <header className="space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-8 h-8 text-blue-400" />
                        <h1 className="text-4xl font-extrabold tracking-tight">AI Enhancement Suite</h1>
                        <Badge variant="outline" className="border-blue-500 text-blue-400 ml-2">Experimental V3</Badge>
                    </div>
                    <Button 
                        variant="destructive" 
                        onClick={() => {
                            window.dispatchEvent(new CustomEvent('storycore:navigate-to-dashboard'));
                            navigate('/');
                        }} 
                        className="gap-2 rounded-full px-6 transition-all hover:scale-105 active:scale-95"
                    >
                        <X className="w-4 h-4" />
                        {t('common.close') || 'Close'}
                    </Button>
                </div>
                <p className="text-slate-400">High-Fidelity AI Tools for Cinematic Storytelling</p>
            </header>

            <Tabs defaultValue="skin" className="w-full">
                <TabsList className="grid grid-cols-5 h-14 bg-slate-800/50 backdrop-blur-md rounded-xl p-1 border border-white/10">
                    <TabsTrigger value="skin" className="gap-2"><Wand2 className="w-4 h-4" /> Enhancement</TabsTrigger>
                    <TabsTrigger value="tryon" className="gap-2"><Shirt className="w-4 h-4" /> Virtual Try-On</TabsTrigger>
                    <TabsTrigger value="audio" className="gap-2"><Music className="w-4 h-4" /> SFX Studio</TabsTrigger>
                    <TabsTrigger value="identity" className="gap-2"><UserCheck className="w-4 h-4" /> Identity</TabsTrigger>
                    <TabsTrigger value="assets" className="gap-2"><Palette className="w-4 h-4" /> Creative</TabsTrigger>
                </TabsList>

                <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Controls Column */}
                    <div className="space-y-6">
                        <TabsContent value="skin">
                            <GlassCard>
                                <CardHeader>
                                    <CardTitle>Skin Enhancer</CardTitle>
                                    <CardDescription>Professional skin smoothing and blemish removal via FaceDetailer.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Source Image</Label>
                                        <Input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, setPersonFile)} className="bg-slate-900/50" />
                                    </div>
                                    <div className="space-y-4 pt-2">
                                        <div className="flex justify-between">
                                            <Label>Smoothing Intensity</Label>
                                            <span className="text-sm text-blue-400">{Math.round(skinIntensity * 100)}%</span>
                                        </div>
                                        <Slider defaultValue={[0.5]} max={1} step={0.01} value={[skinIntensity]} onValueChange={(v) => setSkinIntensity(v[0])} />
                                    </div>
                                    <Button onClick={() => personFile && runTask("Skin Enhancement", () => highImpactApi.enhanceSkin({ file: personFile, smoothing_intensity: skinIntensity }))} className="w-full bg-blue-600 hover:bg-blue-500" disabled={!personFile || loading}>
                                        {loading ? <Loader2 className="animate-spin" /> : "Enhance Cinematic Skin"}
                                    </Button>
                                </CardContent>
                            </GlassCard>
                        </TabsContent>

                        <TabsContent value="tryon">
                            <GlassCard>
                                <CardHeader>
                                    <CardTitle>Virtual Try-On (LADI-VTON)</CardTitle>
                                    <CardDescription>Swap clothes between a person and a garment image.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <Label>Person Image</Label>
                                    <Input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, setPersonFile)} className="bg-slate-900/50" />
                                    <Label>Garment Image</Label>
                                    <Input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, setGarmentFile)} className="bg-slate-900/50" />
                                    <Button onClick={() => personFile && garmentFile && runTask("Clothes Swap", () => highImpactApi.swapClothes({ person_image: personFile, garment_image: garmentFile }))} className="w-full bg-indigo-600 hover:bg-indigo-500" disabled={!personFile || !garmentFile || loading}>
                                         Execute LADI-VTON
                                    </Button>
                                    <hr className="border-white/10 my-4" />
                                    <CardTitle className="text-md">Outfit Change (OOTDiffusion)</CardTitle>
                                    <Input value={outfitPrompt} onChange={(e) => setOutfitPrompt(e.target.value)} placeholder="E.g. 'Red leather jacket'" className="bg-slate-900/50" />
                                    <Button onClick={() => personFile && runTask("Outfit Change", () => highImpactApi.changeOutfit({ image: personFile, outfit_prompt: outfitPrompt }))} variant="outline" className="w-full border-indigo-500/50 hover:bg-indigo-500/10" disabled={!personFile || !outfitPrompt || loading}>
                                        Swap via Description
                                    </Button>
                                </CardContent>
                            </GlassCard>
                        </TabsContent>

                        <TabsContent value="audio">
                            <GlassCard>
                                <CardHeader>
                                    <CardTitle>Cinematic SFX Generator</CardTitle>
                                    <CardDescription>Generate authentic sound effects from descriptions using AudioLDM-2.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <Label>Sound Description</Label>
                                    <Input value={sfxPrompt} onChange={(e) => setSfxPrompt(e.target.value)} placeholder="E.g. 'Cybernetic footsteps on heavy metal flooring'" className="bg-slate-900/50" />
                                    <Button onClick={() => sfxPrompt && runTask("SFX Generation", () => highImpactApi.generateSFX({ prompt: sfxPrompt }))} className="w-full bg-sky-600 hover:bg-sky-500" disabled={!sfxPrompt || loading}>
                                        <Music className="w-4 h-4 mr-2" /> Generate Audio Asset
                                    </Button>
                                </CardContent>
                            </GlassCard>
                        </TabsContent>

                        <TabsContent value="identity">
                            <GlassCard>
                                <CardHeader>
                                    <CardTitle>Identity Detection (ArcFace)</CardTitle>
                                    <CardDescription>Register a face to preserve visual consistency across the project.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <Label>Actor Portrait</Label>
                                    <Input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, setRefFile)} className="bg-slate-900/50" />
                                    <Button onClick={() => refFile && runTask("Actor Recognition", () => highImpactApi.recognizeFace({ image: refFile }))} className="w-full bg-emerald-600 hover:bg-emerald-500" disabled={!refFile || loading}>
                                        <UserCheck className="w-4 h-4 mr-2" /> Register Identity Key
                                    </Button>
                                </CardContent>
                            </GlassCard>
                        </TabsContent>

                        <TabsContent value="assets">
                            <GlassCard>
                                <CardHeader>
                                    <CardTitle>Creative Studio Assets</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <CardTitle className="text-md">Style Snap (IP-Adapter)</CardTitle>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <Label className="text-xs">Source</Label>
                                            <Input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, setPersonFile)} className="bg-slate-900/50" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Style Reference</Label>
                                            <Input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, setRefFile)} className="bg-slate-900/50" />
                                        </div>
                                    </div>
                                    <Button onClick={() => personFile && refFile && runTask("Style Transfer", () => highImpactApi.transferStyle({ source_image: personFile, reference_image: refFile }))} className="w-full bg-purple-600" disabled={!personFile || !refFile || loading}>
                                        Snap Style
                                    </Button>
                                    
                                    <hr className="border-white/10 my-4" />
                                    
                                    <CardTitle className="text-md">Infographic Engine</CardTitle>
                                    <textarea value={infoText} onChange={(e) => setInfoText(e.target.value)} placeholder="Enter bullet points or data for visual representation..." className="w-full h-24 bg-slate-900/50 rounded-md p-2 text-sm border border-white/10" />
                                    <Button onClick={() => infoText && runTask("Infographic Generation", () => highImpactApi.generateInfographics({ text_data: infoText }))} variant="outline" className="w-full text-purple-400 border-purple-400/50" disabled={!infoText || loading}>
                                        Compose Visual Data
                                    </Button>
                                </CardContent>
                            </GlassCard>
                        </TabsContent>
                    </div>

                    {/* Output Column */}
                    <div className="relative sticky top-6">
                        <AnimatePresence mode="wait">
                            {loading && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center space-y-4">
                                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                                    <div className="w-64 space-y-2">
                                        <Progress value={progress} className="h-2" />
                                        <p className="text-center text-sm text-blue-300">Synchronizing with ComfyUI GPU...</p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="border border-white/10 rounded-2xl bg-slate-900/40 min-h-[500px] flex flex-col items-center justify-center p-6 text-center">
                            {result?.image_base64 ? (
                                <div className="space-y-4 w-full">
                                    <div className="rounded-lg overflow-hidden border border-white/20 shadow-2xl shadow-blue-500/10">
                                        <img src={`data:image/jpeg;base64,${result.image_base64}`} alt="AI Output" className="max-w-full h-auto" />
                                    </div>
                                    <div className="flex justify-between items-center bg-slate-800/80 p-3 rounded-lg">
                                        <span className="text-xs text-slate-400">Quality Index: {result.quality_score?.toFixed(2) || "N/A"}</span>
                                        <span className="text-xs text-slate-400">Time: {result.processing_time?.toFixed(2)}s</span>
                                        <Button variant="ghost" size="sm" className="text-blue-400" onClick={() => {
                                            const link = document.createElement('a');
                                            link.href = `data:image/jpeg;base64,${result.image_base64}`;
                                            link.download = 'ai_enhanced_output.jpg';
                                            link.click();
                                        }}>Download</Button>
                                    </div>
                                </div>
                            ) : result?.audio_path ? (
                                <div className="space-y-6">
                                    <div className="w-24 h-24 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto">
                                        <Music className="w-12 h-12 text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold">Audio Asset Generated</h3>
                                        <p className="text-sm text-slate-400">File: {result.audio_path}</p>
                                    </div>
                                    {/* Mock Audio Player */}
                                    <div className="w-full h-1 bg-blue-500/30 rounded-full cursor-pointer relative">
                                        <div className="absolute h-full w-1/3 bg-blue-400 rounded-full"></div>
                                    </div>
                                    <Button variant="outline" className="border-blue-400 text-blue-400">Save to Project Audio</Button>
                                </div>
                            ) : (
                                <div className="space-y-4 opacity-40">
                                    <Camera className="w-20 h-20 mx-auto" />
                                    <div>
                                        <p className="text-xl font-medium">Output Preview</p>
                                        <p className="text-sm">Run any tool to see results here</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="mt-4 flex gap-4">
                            <div className="flex-1 p-4 bg-slate-900/60 rounded-xl border border-white/5">
                                <span className="text-xs block text-slate-500 uppercase tracking-widest mb-1">GPU Compute</span>
                                <span className="text-lg font-mono text-emerald-400">A100 CLUSTER</span>
                            </div>
                            <div className="flex-1 p-4 bg-slate-900/60 rounded-xl border border-white/5">
                                <span className="text-xs block text-slate-500 uppercase tracking-widest mb-1">Architecture</span>
                                <span className="text-lg font-mono text-blue-400">COMFYUI-V2</span>
                            </div>
                        </div>
                    </div>
                </div>
            </Tabs>
        </div>
    );
};

export default ImageEnhancementPanel;
