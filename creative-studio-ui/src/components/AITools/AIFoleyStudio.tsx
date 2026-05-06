/**
 * AI Foley Studio Component
 * 
 * Automated SFX generation and worldization for Phase 9: Audio Worldization.
 * Analyzes scene metadata to inject layered, cinematic soundscapes.
 */
import { LegacyAny } from '@/types/legacy';


import React, { useState } from 'react';
import { 
  Volume2, 
  Waves, 
  Mic2, 
  Zap, 
  Play, 
  Pause, 
  RefreshCw,
  Wind,
  Footprints,
  Activity,
  CheckCircle2,
  Lock,
  Search,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface FoleyPreset {
  id: string;
  name: string;
  category: 'ambient' | 'foley' | 'impact' | 'narrative';
  icon: React.ReactNode;
  tags: string[];
}

interface AIFoleyStudioProps {
  sceneDescription?: string;
  onApply?: (audioConfig: LegacyAny) => void;
}

export const AIFoleyStudio: React.FC<AIFoleyStudioProps> = ({ 
  sceneDescription = "Une forêt dense sous la pluie, un personnage court.",
  onApply 
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [suggestedPresets, setSuggestedPresets] = useState<FoleyPreset[]>([]);
  const [selectedPresets, setSelectedPresets] = useState<string[]>([]);
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  const presets: FoleyPreset[] = [
    { id: 'rain_forest', name: 'Dense Rain Forest', category: 'ambient', icon: <Waves className="w-4 h-4"/>, tags: ['Rain', 'Leaves', 'Thunder'] },
    { id: 'footsteps_mud', name: 'Heavy Mud Runs', category: 'foley', icon: <Footprints className="w-4 h-4"/>, tags: ['Mud', 'Running', 'Impact'] },
    { id: 'heartbeat_low', name: 'Narrative Tension', category: 'narrative', icon: <Activity className="w-4 h-4"/>, tags: ['Tension', 'Cinematic'] },
    { id: 'branch_snap', name: 'Forest Cracks', category: 'impact', icon: <Zap className="w-4 h-4"/>, tags: ['Wood', 'Snap', 'Sharp'] },
    { id: 'wind_howl', name: 'Mountain Wind', category: 'ambient', icon: <Wind className="w-4 h-4"/>, tags: ['Cold', 'Wind'] }
  ];

  const runAnalysis = () => {
    setIsAnalyzing(true);
    setProgress(0);
    
    // Simulating scene analysis
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setSuggestedPresets(presets.slice(0, 3)); // Suggesting first 3 based on text
          setIsAnalyzing(false);
          return 100;
        }
        return p + 10;
      });
    }, 150);
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setProgress(0);
    
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setIsGenerating(false);
          onApply?.({ presets: selectedPresets });
          return 100;
        }
        return p + 4;
      });
    }, 100);
  };

  const togglePreset = (id: string) => {
    setSelectedPresets(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  return (
    <div className="ai-foley-studio p-8 bg-slate-950 border border-slate-800 rounded-[2.5rem] space-y-8 shadow-3xl text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
           <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 ring-4 ring-emerald-500/5">
              <Mic2 className="w-6 h-6 text-emerald-400" />
           </div>
           <div>
              <h3 className="text-xl font-bold tracking-tight">AI Foley Studio</h3>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] leading-none mt-1">Narrative Soundscape Orchestrator</p>
           </div>
        </div>
        <div className="flex items-center gap-3">
           <div className="flex items-center gap-2 px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full border-l-4 border-l-indigo-500">
              <Volume2 className="w-3 h-3 text-indigo-500" />
              <span className="text-[9px] font-black uppercase text-indigo-400 font-bold">Neural Audio Link</span>
           </div>
           <Lock className="w-4 h-4 text-slate-700" />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Scene Analysis Area */}
        <div className="col-span-4 space-y-6">
           <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-[2rem] space-y-4">
              <div className="flex items-center gap-2 mb-2">
                 <Search className="w-3 h-3 text-emerald-400" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Context Analysis</span>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 italic text-xs text-slate-400 leading-relaxed">
                 "{sceneDescription}"
              </div>
              <Button 
                onClick={runAnalysis}
                disabled={isAnalyzing}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-black uppercase tracking-widest text-[10px] h-12 rounded-xl"
              >
                {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : "ANALYSER LE CONTEXTE SCÉNIQUE"}
              </Button>
           </div>

           {/* Audio Spatialization Preview */}
           <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-[2rem] space-y-4">
              <div className="flex items-center gap-2 mb-2">
                 <Volume2 className="w-3 h-3 text-emerald-400" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Worldization (Reverb)</span>
              </div>
              <div className="flex flex-col gap-4">
                 {['Forest Open', 'Small Room', 'Large Hall'].map((room) => (
                   <div key={room} className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer hover:border-emerald-500/50 transition-all">
                      <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">{room}</span>
                      <div className="w-2 h-2 rounded-full bg-slate-800" />
                   </div>
                 ))}
              </div>
           </div>
        </div>

        {/* Suggested Foley Tracks */}
        <div className="col-span-8 space-y-6">
           <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                 <Layers className="w-4 h-4 text-emerald-400" />
                 <h4 className="text-xs font-black uppercase tracking-widest">Suggested Sound Layers</h4>
              </div>
              <span className="text-[10px] text-slate-600 font-black uppercase">{selectedPresets.length} LAYERS ACTIVE</span>
           </div>

           <div className="grid grid-cols-2 gap-4">
              {presets.map((p) => {
                const isSuggested = suggestedPresets.some(s => s.id === p.id);
                const isSelected = selectedPresets.includes(p.id);
                const isPreviewing = previewingId === p.id;

                return (
                  <div 
                    key={p.id}
                    onClick={() => togglePreset(p.id)}
                    className={`p-5 rounded-[1.8rem] border-2 transition-all cursor-pointer group relative overflow-hidden ${
                      isSelected ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                     {isSuggested && !isSelected && (
                        <div className="absolute top-0 right-0 p-2 bg-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase tracking-widest rounded-bl-xl border-l border-b border-emerald-500/20">
                           Recommended
                        </div>
                     )}
                     
                     <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-2xl ${isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-950 text-slate-500'} transition-all`}>
                           {p.icon}
                        </div>
                        <div className="flex-1 flex flex-col pt-1">
                           <span className="text-sm font-bold tracking-tight mb-1">{p.name}</span>
                           <div className="flex flex-wrap gap-1">
                              {p.tags.map(t => (
                                <span key={t} className="text-[8px] px-1.5 py-0.5 bg-slate-950 text-slate-600 rounded-md font-black uppercase">{t}</span>
                              ))}
                           </div>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setPreviewingId(isPreviewing ? null : p.id); }}
                          className={`p-3 rounded-full transition-all ${isPreviewing ? 'bg-white text-black' : 'bg-slate-950 text-emerald-500 hover:scale-110'}`}
                        >
                           {isPreviewing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                     </div>

                     {isSelected && (
                        <div className="mt-4 pt-4 border-t border-emerald-500/10 flex items-center justify-between">
                           <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Physics Locked</span>
                           <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        </div>
                     )}
                  </div>
                );
              })}
           </div>

           <div className="p-8 bg-emerald-500/5 border border-emerald-500/10 rounded-[2rem] flex flex-col gap-6">
              <div className="flex items-center justify-between">
                 <div className="flex flex-col">
                    <span className="text-[10px] font-black text-emerald-400 tracking-widest uppercase">Master Foley Orchestration</span>
                    <span className="text-xs text-slate-500 mt-1">Fusionner les couches sonores dans le mixage final</span>
                 </div>
                 {isGenerating && <Activity className="w-5 h-5 text-emerald-500 animate-pulse" />}
              </div>
              
              {isGenerating && (
                 <div className="space-y-2">
                    <div className="flex justify-between text-[8px] font-black uppercase text-emerald-500">
                       <span>Worldizing Samples...</span>
                       <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1 bg-slate-800" />
                 </div>
              )}

              <Button 
                onClick={handleGenerate}
                disabled={selectedPresets.length === 0 || isGenerating}
                className="w-full h-16 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-emerald-600/20 active:scale-95 transition-all text-xs border border-emerald-400/20"
              >
                {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : "GÉNÉRER PAYSAGE SONORE NARRATIF"}
              </Button>
           </div>
        </div>
      </div>
    </div>
  );
};
