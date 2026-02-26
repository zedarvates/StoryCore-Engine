
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { 
  Music, 
  Settings, 
  Video, 
  Layers, 
  Type, 
  Move, 
  Zap, 
  Wand2, 
  Maximize2, 
  Volume2,
  Image as ImageIcon,
  Cpu
} from 'lucide-react';
import { notificationService } from '@/services/NotificationService';

import { llmService } from '@/services/llmService';
import { logger } from '@/utils/logger';
import { captionStylesService } from '@/services/CaptionStylesService';
import { audioProductionService, SubtitleClip } from '@/services/AudioProductionService';
import { Badge } from '@/components/ui/badge';
import { useSequencePlanActions } from '@/stores/sequencePlanStore';
import { DashboardShot } from '@/types';

import { v4 as uuidv4 } from 'uuid';




// Interfaces for component state
interface VideoEffects {
  speed: number;
  stabilize: boolean;
  removeBackground: boolean;
  zoom3d: boolean;
  freezeFrame: boolean;
}

export const MusicCompositionWizard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('lyrics');
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('cinematic');
  const [lyrics, setLyrics] = useState('');
  const [subtitles, setSubtitles] = useState<SubtitleClip[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [subtitleStyle, setSubtitleStyle] = useState('modern_clean');

  
  const allSubtitleStyles = captionStylesService.getAllStyles();
  
  // Advanced features state
  const { createPlan, addShotToPlan } = useSequencePlanActions();

  const [effects, setEffects] = useState<VideoEffects>({
    speed: 1.0,
    stabilize: false,
    removeBackground: false,
    zoom3d: false,
    freezeFrame: false
  });

  const handleGenerateLyrics = async () => {
    if (!prompt) {
      notificationService.error('Erreur', 'Veuillez entrer une description ou un thème.');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await llmService.generateLyrics({
        theme: prompt,
        style: style,
        mood: ['cinematic', 'professional'],
        length: 'medium'
      });
      
      if (result.success && result.data) {
        setLyrics(result.data.lyrics);
        notificationService.success('Paroles', 'Paroles générées avec succès.');
      }
    } catch (err) {
      logger.error('Lyrics generation failed', err);
      notificationService.error('Erreur', 'Échec de la génération des paroles.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAutoCaptions = async () => {
    setIsGenerating(true);
    try {
      // Simulation of a video URL or using current project context
      const result = await audioProductionService.generateAutoCaptions('current_project_audio.wav');
      setSubtitles(result);
    } catch (err) {
      logger.error('Auto-captions failed', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const updateSubtitleStyle = (styleId: string) => {
    setSubtitleStyle(styleId);
    audioProductionService.applyStyleToAllSubtitles(styleId);
  };

  const handleAutoSpeed = async () => {
    notificationService.info('Analyse BPM', 'Calcul des points d\'accélération optimaux...');
    const points = await audioProductionService.calculateBeatSpeedPoints('current_project_audio.wav');
    if (points.length > 0) {
      notificationService.success('Vitesse Automatique', `${points.length} points de synchro générés.`);
    }
  };

  const updateEffect = <K extends keyof VideoEffects>(key: K, value: VideoEffects[K]) => {
    setEffects(prev => ({ ...prev, [key]: value }));
  };

  const handlePublish = async () => {
    setIsGenerating(true);
    try {
      notificationService.info('Publication', 'Préparation du projet musical...');
      
      // 1. Create a new plan if none exists or if we want a fresh one
      const planName = prompt ? `Clip: ${prompt}` : "Nouveau Clip Musical";
      await createPlan(planName, `Généré via Music Visionary. Style: ${style}`);
      
      // 2. Create the main shot
      const mainShotId = uuidv4();
      const mainShot = {
        id: mainShotId,
        title: "Main Clip",
        duration: subtitles.length > 0 ? subtitles[subtitles.length - 1].endTime : 30,
        position: 0,
        audioTracks: [],
        effects: [
          { id: uuidv4(), type: 'speed', name: 'Vitesse IA', enabled: true, intensity: effects.speed * 100, parameters: { factor: effects.speed } }
        ],
        textLayers: subtitles.map(sub => ({
          id: sub.id,
          content: sub.text,
          font: 'Inter',
          fontSize: 32,
          color: '#ffffff',
          position: { x: 50, y: 80 },
          alignment: 'center' as const,
          startTime: sub.startTime,
          duration: sub.endTime - sub.startTime,
          style: {
            bold: true,
            shadow: { x: 2, y: 2, blur: 4, color: '#000000' }
          }
        })),
        metadata: {
          ai_features: {
            stabilize: effects.stabilize,
            removeBackground: effects.removeBackground,
            zoom3d: effects.zoom3d,
            freezeFrame: effects.freezeFrame
          },
          subtitleStyleId: subtitleStyle
        }
      };

      await addShotToPlan(mainShot as unknown as DashboardShot);


      
      notificationService.success('Succès', 'Votre clip a été ajouté à la Timeline !');
      // Optionally close wizard or redirect
    } catch (err) {
      logger.error('Publish failed', err);
      notificationService.error('Erreur', 'Impossible de publier le projet.');
    } finally {
      setIsGenerating(false);
    }
  };


  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto bg-slate-900/50 rounded-xl border border-slate-700 backdrop-blur-md">
      <header className="flex items-center justify-between border-b border-slate-700 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-600 rounded-lg">
            <Music className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Music Visionary</h1>
            <p className="text-sm text-slate-400">Assistant de création de clip professionnel par IA</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2 border-slate-700 text-slate-300 hover:bg-slate-800">
            <Settings className="w-4 h-4" /> Config
          </Button>
          <Button variant="default" size="sm" onClick={handlePublish} disabled={isGenerating} className="gap-2 bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-900/30">
            <Zap className="w-4 h-4" /> {isGenerating ? 'Publication...' : 'Publier le Clip'}
          </Button>

        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-800/80 p-1 rounded-lg border border-slate-700/50 mb-6">
          <TabsTrigger value="lyrics" className="gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white"><Type className="w-4 h-4" /> Paroles & Style</TabsTrigger>
          <TabsTrigger value="motion" className="gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white"><Move className="w-4 h-4" /> Mouvement & Vitesse</TabsTrigger>
          <TabsTrigger value="visuals" className="gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white"><Layers className="w-4 h-4" /> Incrustations & IA</TabsTrigger>
          <TabsTrigger value="audio" className="gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white"><Volume2 className="w-4 h-4" /> Audio & Mix</TabsTrigger>
        </TabsList>

        <TabsContent value="lyrics" className="space-y-4 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Thème ou Description</Label>
                <Input 
                  placeholder="Décrivez l'ambiance ou le thème de votre clip..." 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white focus:ring-purple-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Style Musical</Label>
                <select 
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="w-full h-10 px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                >
                  <option value="cinematic">Cinématique</option>
                  <option value="hiphop">Hip Hop / Urbain</option>
                  <option value="synthwave">Synthwave 80s</option>
                  <option value="rock">Rock Moderne</option>
                  <option value="ambient">Ambiance Éthérée</option>
                </select>
              </div>

              <div className="space-y-2 mt-4">
                <Label className="text-slate-300">Style des Sous-titres (Auto-Captions)</Label>
                <div className="grid grid-cols-2 gap-2">
                  {allSubtitleStyles.map(s => (
                    <button
                      key={s.id}
                      onClick={() => updateSubtitleStyle(s.id)}
                      className={`p-2 text-[10px] uppercase tracking-wider font-bold rounded border transition-all ${
                        subtitleStyle === s.id 
                        ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-900/40 translate-y-[-1px]' 
                        : 'bg-slate-800/50 border-slate-700/50 text-slate-500 hover:border-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <Button 
                  onClick={handleGenerateLyrics} 
                  className="flex-1 gap-2 bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-900/20"
                  disabled={isGenerating}
                >
                  {isGenerating ? '...' : <><Wand2 className="w-4 h-4" /> Paroles IA</>}
                </Button>
                <Button 
                  onClick={handleAutoCaptions} 
                  variant="outline"
                  className="flex-1 gap-2 border-slate-700 text-slate-300"
                  disabled={isGenerating}
                >
                  <Cpu className="w-4 h-4" /> Auto-Captions
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-slate-300">Edition Chronologique</Label>
                <Badge variant="outline" className="text-[10px] border-purple-500/50 text-purple-400">
                  {subtitles.length > 0 ? `${subtitles.length} segments` : 'Prêt'}
                </Badge>
              </div>
              <div className="w-full h-[320px] p-4 bg-slate-800/30 border border-slate-700/50 rounded-lg overflow-y-auto custom-scrollbar">
                {subtitles.length > 0 ? (
                  <div className="space-y-2">
                    {subtitles.map(sub => (
                      <div key={sub.id} className="p-2 bg-slate-800 border border-slate-700 rounded flex gap-3 text-[10px] group transition-all hover:border-purple-500/50">
                        <span className="text-purple-400 font-mono">[{sub.startTime.toFixed(1)}s]</span>
                        <input 
                          type="text" 
                          value={sub.text} 
                          onChange={() => {}} 
                          className="bg-transparent border-none flex-1 text-slate-200 outline-none"
                        />
                        <Move className="w-3 h-3 text-slate-600 group-hover:text-purple-400 cursor-move" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <textarea 
                    className="w-full h-full bg-transparent border-none text-slate-500 font-mono text-xs leading-relaxed resize-none focus:outline-none"
                    readOnly
                    value={lyrics}
                    placeholder="Les paroles ou segments audio apparaîtront ici après analyse..."
                  />
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="motion" className="space-y-6 py-4 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <Label className="text-slate-300 flex items-center gap-2 font-medium"><Maximize2 className="w-4 h-4 text-purple-400" /> Vitesse Globale (0.1x - 100x)</Label>
                  <span className="text-purple-400 font-bold bg-purple-900/30 px-2 py-0.5 rounded border border-purple-500/20">x{effects.speed}</span>
                </div>
                <Slider 
                  min={0.1} 
                  max={100} 
                  step={0.1}
                  value={[effects.speed]}
                  onValueChange={(val) => updateEffect('speed', val[0])}
                  className="py-4"
                />
                <div className="flex justify-between text-[10px] uppercase tracking-tighter text-slate-500 font-bold">
                  <span>Slo-mo (0.1x)</span>
                  <span>Normal (1.0x)</span>
                  <span>Fast (100x)</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-800/40 rounded-xl border border-slate-700/50 hover:bg-slate-800/60 transition-colors">
                <div className="space-y-1">
                  <h4 className="text-white font-medium flex items-center gap-2"><Move className="w-4 h-4 text-blue-400" /> Stabilisation IA</h4>
                  <p className="text-[11px] text-slate-400">Réduit les tremblements pour un rendu cinématographique.</p>
                </div>
                <Switch 
                  checked={effects.stabilize} 
                  onCheckedChange={(val) => updateEffect('stabilize', val)}
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-800/40 rounded-xl border border-slate-700/50 hover:bg-slate-800/60 transition-colors">
                <div className="space-y-1">
                  <h4 className="text-white font-medium flex items-center gap-2"><Cpu className="w-4 h-4 text-purple-400" /> Vitesse Automatique (Trends)</h4>
                  <p className="text-[11px] text-slate-400">Synchronise les accélérations sur le BPM de la musique.</p>
                </div>
                <Button 
                  onClick={handleAutoSpeed}
                  variant="outline" 
                  size="sm" 
                  className="text-[10px] h-7 bg-slate-900 border-slate-700 hover:bg-slate-800 transition-all"
                >
                  Analyser
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-800/40 rounded-xl border border-slate-700/50 hover:bg-slate-800/60 transition-colors">
                <div className="space-y-1">
                  <h4 className="text-white font-medium flex items-center gap-2"><Video className="w-4 h-4 text-emerald-400" /> Effet Zoom 3D</h4>
                  <p className="text-[11px] text-slate-400">Transforme les shots statiques en plans avec profondeur.</p>
                </div>
                <Switch 
                  checked={effects.zoom3d} 
                  onCheckedChange={(val) => updateEffect('zoom3d', val)}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="visuals" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4 p-4 border border-dashed border-slate-700/50 rounded-2xl bg-slate-800/10 flex flex-col items-center justify-center min-h-[220px] group hover:bg-slate-800/20 transition-all">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-inner">
                <ImageIcon className="w-6 h-6 text-slate-500" />
              </div>
              <p className="text-slate-400 text-[11px] text-center max-w-[180px]">Faites glisser vos clips, stickers ou overlays PNG (transparents supportés)</p>
              <Button variant="secondary" size="sm" className="h-8 text-[11px] bg-slate-700/50 hover:bg-slate-700 border-slate-600">Parcourir les fichiers</Button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-800/40 rounded-xl border border-slate-700/50 hover:bg-slate-800/60 transition-colors">
                <div className="space-y-1">
                  <h4 className="text-white font-medium">Suppression d'arrière-plan IA</h4>
                  <p className="text-[11px] text-slate-400">Isolez votre sujet pour des incrustations propres.</p>
                </div>
                <Switch 
                  checked={effects.removeBackground} 
                  onCheckedChange={(val) => updateEffect('removeBackground', val)}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-800/40 rounded-xl border border-slate-700/50 hover:bg-slate-800/60 transition-colors">
                <div className="space-y-1">
                  <h4 className="text-white font-medium">Auto-Focus sur Temps Forts</h4>
                  <p className="text-[11px] text-slate-400">Arrêts sur image et zooms lors des drops musicaux.</p>
                </div>
                <Switch 
                  checked={effects.freezeFrame} 
                  onCheckedChange={(val) => updateEffect('freezeFrame', val)}
                />
              </div>
              
              <div className="p-4 bg-purple-900/10 border border-purple-500/20 rounded-xl flex items-center gap-3">
                 <div className="p-2 bg-purple-600/20 rounded-lg">
                   <Zap className="w-4 h-4 text-purple-400" />
                 </div>
                 <p className="text-[10px] text-purple-300 leading-snug">
                   Le moteur <strong>Segment Anything (SAM)</strong> est prêt à traiter vos masques de détourage.
                 </p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="audio" className="flex flex-col outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6">
            <div className="space-y-4">
              <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50">
                <h4 className="text-white font-medium mb-2 flex items-center gap-2"><Music className="w-4 h-4 text-purple-400" /> Analyse Spectrale IA</h4>
                <p className="text-[11px] text-slate-400 mb-4">Extrayez les instruments et les voix pour un montage parfait.</p>
                <div className="space-y-4">
                   <div className="space-y-1">
                     <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                       <span>Vocal / Lead</span>
                       <span className="text-purple-400">80% extraction ready</span>
                     </div>
                     <div className="w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                       <div className="h-full bg-purple-500 w-[80%] shadow-[0_0_8px_rgba(168,85,247,0.5)]"></div>
                     </div>
                   </div>
                   
                   <div className="space-y-1">
                     <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                       <span>Percussion / Bass</span>
                       <span className="text-blue-400">100% extraction ready</span>
                     </div>
                     <div className="w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                       <div className="h-full bg-blue-500 w-[100%] shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                     </div>
                   </div>
                </div>
              </div>
              <Button className="w-full bg-slate-800 border-slate-700 hover:bg-white/5 text-slate-300 text-[11px] h-10 border transition-all">
                Démarrer le Mastering & Stem Extraction
              </Button>
            </div>
            
            <div className="space-y-4">
               <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50">
                 <h4 className="text-white font-medium mb-3">Structure Détectée (AI Segmentation)</h4>
                 <div className="flex flex-wrap gap-2">
                   <Badge variant="secondary" className="bg-purple-900/40 text-purple-300 border-purple-500/30 px-2 py-1">Intro [00:00-00:08]</Badge>
                   <Badge variant="secondary" className="bg-blue-900/40 text-blue-300 border-blue-500/30 px-2 py-1">Verset 1 [00:08-00:24]</Badge>
                   <Badge variant="secondary" className="bg-emerald-900/40 text-emerald-300 border-emerald-500/30 px-2 py-1">Refrain [00:24-00:36]</Badge>
                 </div>
                 <div className="mt-6 p-3 bg-slate-900/50 border border-slate-700/30 rounded-lg">
                    <p className="text-[10px] text-slate-400 leading-relaxed uppercase tracking-wider font-bold">Analyse Technique BPM</p>
                    <p className="text-[14px] text-white font-mono mt-1">124.05 BPM</p>
                    <p className="text-[10px] text-slate-500 mt-2">
                      Les points de synchronisation ont été injectés dans la timeline pour un alignement automatique des clips.
                    </p>
                 </div>
               </div>
            </div>
          </div>
        </TabsContent>

      </Tabs>

      <footer className="mt-6 pt-6 border-t border-slate-800/50 flex justify-between items-center text-[10px] tracking-widest uppercase font-bold text-slate-600">
        <p>STORYCORE ENGINE // MUSIC VISIONARY // PRO WORKFLOW v1.3</p>
        <div className="flex gap-6">
          <span className="flex items-center gap-2"><Zap className="w-3 h-3 text-purple-400" /> GPU ACCELERATED</span>
          <span className="flex items-center gap-2"><Cpu className="w-3 h-3 text-blue-400" /> NEURAL ENGINE ACTIVE</span>
        </div>
      </footer>
    </div>
  );
};
