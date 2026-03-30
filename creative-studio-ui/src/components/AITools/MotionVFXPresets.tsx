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
  Cpu
} from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  const [isRendering, setIsRendering] = useState(false);

  const presets = [
    { id: 'cinematic_dust', name: 'Ambient Dust', icon: <Wind className="w-4 h-4"/>, color: 'text-amber-400' },
    { id: 'heavy_rain', name: 'Cinematic Rain', icon: <Droplets className="w-4 h-4"/>, color: 'text-blue-400' },
    { id: 'ember_sparks', name: 'Dynamic Embers', icon: <Flame className="w-4 h-4"/>, color: 'text-orange-500' },
    { id: 'narrative_fog', name: 'Deep Mist', icon: <Activity className="w-4 h-4"/>, color: 'text-slate-400' },
    { id: 'snow_fall', name: 'Neural Snow', icon: <Snowflake className="w-4 h-4"/>, color: 'text-indigo-200' }
  ];

  const handleApply = () => {
    setIsRendering(true);
    const config: MotionConfig = { preset, intensity, physics_locked: true, resolution: '4K' };
    
    setTimeout(() => {
      onApply?.(config);
      setIsRendering(false);
    }, 2000);
  };

  return (
    <div id={id} className="motion-vfx-studio p-8 bg-slate-900 border border-slate-800 rounded-3xl space-y-8 shadow-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-violet-500/20 rounded-xl">
            <Zap className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Neural Motion VFX Engine</h3>
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest leading-none mt-1">Physics-Based Particle Synthesis</p>
          </div>
        </div>
        <div className="flex bg-slate-800/50 p-1 rounded-xl border border-slate-700/50">
           <div className="flex items-center gap-2 px-3 py-1 text-[9px] font-black uppercase text-violet-400">
              <Cpu className="w-3 h-3" /> PHYSX-RT CORE ENABLED
           </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-12">
        {/* Presets Grid */}
        <div className="space-y-6">
           <div className="flex items-center gap-2 mb-2">
              <Settings className="w-4 h-4 text-violet-400" />
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 font-bold">Atmospheric Presets</h4>
           </div>
           
           <div className="grid grid-cols-1 gap-3">
              {presets.map((p) => (
                 <button 
                   key={p.id}
                   onClick={() => setPreset(p.id)}
                   className={`p-4 rounded-2xl border flex items-center justify-between transition-all group ${
                     preset === p.id ? 'bg-violet-600 border-violet-500 text-white shadow-lg' : 'bg-slate-800/50 border-slate-700/50 text-slate-500 hover:border-slate-600'
                   }`}
                 >
                    <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest">
                       <span className={preset === p.id ? 'text-white' : p.color}>{p.icon}</span>
                       {p.name}
                    </div>
                    {preset === p.id && <CheckCircle2 className="w-4 h-4" />}
                 </button>
              ))}
           </div>
        </div>

        {/* Control & Preview */}
        <div className="space-y-10">
           <div className="space-y-6">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                 <span className="text-slate-500">Particle Intensity / Density</span>
                 <span className="text-violet-400">{intensity}%</span>
              </div>
              <input 
                type="range" 
                className="w-full appearance-none bg-slate-800 h-1.5 rounded-full accent-violet-500 cursor-pointer" 
                value={intensity}
                title="Particle Intensity / Density"
                aria-label="Particle Intensity / Density"
                onChange={(e) => setIntensity(parseInt(e.target.value))}
              />
           </div>

           <div className="p-5 bg-violet-500/5 border border-violet-500/20 rounded-2xl">
              <div className="flex items-center gap-3 mb-3">
                 <Activity className="w-4 h-4 text-violet-400" />
                 <span className="text-[10px] font-black uppercase tracking-widest">Narrative Sync</span>
              </div>
              <p className="text-[10px] text-violet-300 italic leading-relaxed font-bold">
                 * Le moteur synchronise automatiquement la vélocité des particules avec la courbe de tension narrative de la timeline.
              </p>
           </div>

           <Button 
             onClick={handleApply}
             disabled={isRendering}
             className="w-full bg-violet-600 hover:bg-violet-500 text-white font-black uppercase tracking-widest h-14 rounded-2xl shadow-xl shadow-violet-500/20 active:scale-95 transition-all text-xs"
           >
              {isRendering ? <Activity className="w-5 h-5 animate-spin" /> : (
                <div className="flex items-center gap-3">
                   GÉNÉRER SIMULATION VFX <Play className="w-4 h-4" />
                </div>
              )}
           </Button>
        </div>
      </div>
    </div>
  );
};
