/**
 * Motion VFX Presets Component
 * 
 * Narrative-driven physics and particle orchestration for Phase 8: Visual Mastery.
 * Allows directors to inject complex VFX layers (Rain, Dust, Sparks) with story-locked intensity.
 */

import React, { useState } from 'react';
import { 
  Zap, 
  Wind, 
  Flame, 
  Snowflake, 
  Droplets, 
  Settings, 
  Activity,
  CheckCircle2,
  Play,
  Cpu,
  Layers,
  Monitor
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export interface MotionConfig {
  preset: string;
  intensity: number;
  physics_locked: boolean;
  resolution: '2K' | '4K';
}

interface MotionVFXPresetsProps {
  onApply?: (config: MotionConfig) => void;
  id?: string;
}

export const MotionVFXPresets: React.FC<MotionVFXPresetsProps> = ({ onApply, id }) => {
  const [preset, setPreset] = useState('cinematic_dust');
  const [intensity, setIntensity] = useState(40);
  const [scale, setScale] = useState(100);
  const [life, setLife] = useState(60);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);

  const presets = [
    { id: 'cinematic_dust', name: 'Ambient Dust', icon: <Wind className="w-5 h-5"/>, color: 'text-amber-400', desc: 'Volumetric floating micro-particles' },
    { id: 'heavy_rain', name: 'Cinematic Rain', icon: <Droplets className="w-5 h-5"/>, color: 'text-blue-400', desc: 'Narrative-synchronized rainfall' },
    { id: 'ember_sparks', name: 'Dynamic Embers', icon: <Flame className="w-5 h-5"/>, color: 'text-orange-500', desc: 'Realistic physics embers & sparks' },
    { id: 'narrative_fog', name: 'Deep Mist', icon: <Activity className="w-5 h-5"/>, color: 'text-slate-400', desc: 'Story-locked depth mist layers' },
    { id: 'snow_fall', name: 'Neural Snow', icon: <Snowflake className="w-5 h-5"/>, color: 'text-indigo-200', desc: 'High-fidelity volumetric snowfall' }
  ];

  const handleApply = () => {
    setIsRendering(true);
    setRenderProgress(0);
    
    // Simulated rendering progress
    const interval = setInterval(() => {
      setRenderProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 5;
      });
    }, 100);

    const config: MotionConfig = { 
      preset, 
      intensity, 
      physics_locked: true, 
      resolution: '4K' 
    };
    
    setTimeout(() => {
      onApply?.(config);
      setIsRendering(false);
    }, 2500);
  };

  return (
    <div id={id} className="motion-vfx-studio p-10 bg-slate-950 border border-slate-800 rounded-[3rem] space-y-10 shadow-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-5">
           <div className="p-4 bg-violet-600/10 rounded-2xl border border-violet-500/20 ring-4 ring-violet-500/5">
              <Zap className="w-7 h-7 text-violet-400 shadow-glow" />
           </div>
           <div>
              <h3 className="text-2xl font-bold tracking-tight">VFX Motion Studio</h3>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.3em] leading-none mt-1">PhysX™ Driven Narrative Synthesis</p>
           </div>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl border-l-[6px] border-l-violet-600">
              <Cpu className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-[9px] font-black uppercase text-slate-300 tracking-[0.1em]">GPU-Accelerated Simulation</span>
           </div>
           <Settings className="w-5 h-5 text-slate-600 hover:text-white transition-colors cursor-pointer" />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-10">
        {/* Presets Selection Sidebar */}
        <div className="col-span-5 space-y-6">
           <div className="flex items-center gap-3">
              <Layers className="w-4 h-4 text-violet-400" />
              <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Library Presets</h4>
           </div>
           
           <div className="space-y-3 max-h-[420px] overflow-y-auto pr-3 custom-scrollbar">
              {presets.map((p) => (
                 <button 
                   key={p.id}
                   onClick={() => setPreset(p.id)}
                   className={`w-full p-5 rounded-[1.5rem] border flex items-start gap-4 transition-all vfx-card ${
                     preset === p.id 
                       ? 'active bg-violet-600/10 border-violet-500/40 text-white' 
                       : 'bg-slate-900/40 border-slate-800/40 text-slate-500 hover:bg-slate-900/60 hover:border-slate-700'
                   }`}
                 >
                    <div className={`p-2.5 rounded-xl ${preset === p.id ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                       {p.icon}
                    </div>
                    <div className="flex flex-col text-left">
                       <span className="text-xs font-black uppercase tracking-widest leading-none mb-1">{p.name}</span>
                       <span className="text-[9px] text-slate-500 font-bold uppercase">{p.desc}</span>
                    </div>
                    {preset === p.id && (
                      <div className="ml-auto flex flex-col items-end gap-1">
                         <CheckCircle2 className="w-4 h-4 text-violet-400" />
                         <span className="vfx-badge">N-SYNC</span>
                      </div>
                    )}
                 </button>
              ))}
           </div>
        </div>

        {/* Physics & Particle Controls */}
        <div className="col-span-7 flex flex-col justify-between">
           <div className="p-10 bg-slate-900/40 rounded-[2.5rem] border border-slate-800/60 space-y-12 h-full">
              <div className="grid grid-cols-1 gap-10">
                 {/* Intensity Slider */}
                 <div className="space-y-4">
                    <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest">
                       <div className="flex items-center gap-2">
                          <Droplets className="w-4 h-4 text-violet-400" />
                          <span className="text-slate-400">Atmospheric Density</span>
                       </div>
                       <span className="text-violet-400 text-lg bg-violet-600/10 px-3 py-0.5 rounded italic font-bold">{intensity}%</span>
                    </div>
                    <input 
                      type="range" 
                      className="w-full appearance-none bg-slate-800 h-2 rounded-full cursor-pointer accent-violet-600 custom-slider-vfx" 
                      value={intensity}
                      title="Atmospheric Density"
                      aria-label="Atmospheric Density"
                      onChange={(e) => setIntensity(parseInt(e.target.value))}
                    />
                 </div>

                 {/* Particle Scale Slider */}
                 <div className="space-y-4">
                    <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest">
                       <div className="flex items-center gap-2">
                          <Monitor className="w-4 h-4 text-emerald-400" />
                          <span className="text-slate-400">Neural Particle Scale</span>
                       </div>
                       <span className="text-emerald-400 text-lg bg-emerald-500/10 px-3 py-0.5 rounded italic font-bold">x{scale / 100}</span>
                    </div>
                    <input 
                      type="range" 
                      min="10"
                      max="300"
                      className="w-full appearance-none bg-slate-800 h-2 rounded-full cursor-pointer accent-emerald-500 custom-slider-vfx" 
                      value={scale}
                      title="Neural Particle Scale"
                      aria-label="Neural Particle Scale"
                      onChange={(e) => setScale(parseInt(e.target.value))}
                    />
                 </div>

                 {/* Particle Life Slider */}
                 <div className="space-y-4">
                    <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest">
                       <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-amber-400" />
                          <span className="text-slate-400">Simulation Velocity</span>
                       </div>
                       <span className="text-amber-400 text-lg bg-amber-500/10 px-3 py-0.5 rounded italic font-bold">{life / 10} m/s</span>
                    </div>
                    <input 
                      type="range" 
                      min="10"
                      max="200"
                      className="w-full appearance-none bg-slate-800 h-2 rounded-full cursor-pointer accent-amber-500 custom-slider-vfx" 
                      value={life}
                      title="Simulation Velocity"
                      aria-label="Simulation Velocity"
                      onChange={(e) => setLife(parseInt(e.target.value))}
                    />
                 </div>
              </div>

              {/* Simulation Status Info */}
              <div className="relative p-6 bg-slate-950/60 rounded-[1.5rem] border border-slate-800 group overflow-hidden">
                 <div className="glimmer-overlay" />
                 <div className="flex items-start gap-5">
                    <div className={`p-4 rounded-full border-2 ${isRendering ? 'border-violet-500 animate-pulse' : 'border-slate-800'}`}>
                       <Cpu className={`w-5 h-5 ${isRendering ? 'text-violet-400' : 'text-slate-600'}`} />
                    </div>
                    <div className="space-y-2 flex-1">
                       <h5 className="text-[10px] uppercase font-black tracking-widest text-slate-300">Physics Solver State</h5>
                       <p className="text-[10px] text-slate-500 leading-relaxed italic">
                         Simulation de type {preset.replace('_', ' ')} injectée. Calcul des collisions narratives en cours. Résolution cible : <span className="text-violet-400 font-bold">4K VOLUMETRIC</span>.
                       </p>
                       {isRendering && (
                         <div className="w-full mt-4 space-y-1">
                           <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-violet-400">
                             <span>Compiling Shaders...</span>
                             <span>{renderProgress}%</span>
                           </div>
                           <Progress value={renderProgress} className="h-1 bg-slate-800" />
                         </div>
                       )}
                    </div>
                 </div>
              </div>
           </div>

           <Button 
             onClick={handleApply}
             disabled={isRendering}
             className="w-full bg-violet-600 hover:bg-violet-700 text-white font-black uppercase tracking-[0.2em] h-16 mt-8 rounded-3xl shadow-2xl shadow-violet-600/30 active:scale-95 transition-all text-xs border border-violet-400/20"
           >
              {isRendering ? (
                <div className="flex items-center gap-3">
                   <Activity className="w-5 h-5 animate-spin" /> RENDERING SIMULATION...
                </div>
              ) : (
                <div className="flex items-center gap-3">
                   GÉNÉRER SIMULATION VFX <Play className="w-4 h-4 ml-2 fill-current" />
                </div>
              )}
           </Button>
        </div>
      </div>
    </div>
  );
};
