/**
 * Atmospheric Grading Studio Component
 * 
 * Cinematic color & volumetric lighting orchestration for Phase 8: Visual Mastery.
 * Allows directors to master the look and atmosphere of each sequence with surgical precision.
 */
import { LegacyAny } from '@/types/legacy';


import React, { useState } from 'react';
import { 
  Sun, 
  Cloud, 
  Zap, 
  Palette, 
  Settings, 
  Wind, 
  CheckCircle2, 
  Waves,
  Eye,
  Camera,
  Activity,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import './AtmosphericGradingStudio.css';

export interface GradingConfig {
  lut: string;
  volumetricDensity: number;
  bloom: number;
  vignette: number;
  grain: number;
  temperature: number;
  tint: number;
  atmosEffect: 'none' | 'rain' | 'snow' | 'haze' | 'dust';
}

interface AtmosphericGradingStudioProps {
  onApply?: (config: GradingConfig) => void;
  id?: string;
  previewImage?: string;
}

export const AtmosphericGradingStudio: React.FC<AtmosphericGradingStudioProps> = ({ 
  onApply, 
  id,
  previewImage
}) => {
  const [lut, setLut] = useState('modern_teal');
  const [density, setDensity] = useState(30);
  const [bloom, setBloom] = useState(45);
  const [vignette, setVignette] = useState(25);
  const [grain, setGrain] = useState(15);
  const [temp, setTemp] = useState(0); // -100 to 100
  const [tint, setTint] = useState(0); // -100 to 100
  const [atmosEffect, setAtmosEffect] = useState<GradingConfig['atmosEffect']>('none');
  const [isApplying, setIsApplying] = useState(false);

  const applyGrading = () => {
    setIsApplying(true);
    const config: GradingConfig = { 
      lut, 
      volumetricDensity: density, 
      bloom, 
      vignette, 
      grain,
      temperature: temp,
      tint,
      atmosEffect
    };
    
    setTimeout(() => {
      onApply?.(config);
      setIsApplying(false);
    }, 1200);
  };

  const luts = [
    { id: 'modern_teal', name: 'Modern Teal', color: 'linear-gradient(to right, #00D4FF, #005577)' },
    { id: 'classic_noir', name: 'Classic Noir', color: 'linear-gradient(to right, #333, #000)' },
    { id: 'vintage_70s', name: 'Vintage 70s', color: 'linear-gradient(to right, #FFAA00, #995500)' },
    { id: 'high_contrast', name: 'Punchy HDR', color: 'linear-gradient(to right, #ffffff, #666666)' },
    { id: 'dreamy_pastel', name: 'Dreamy Pastel', color: 'linear-gradient(to right, #FF99EE, #990099)' }
  ];

  const effects = [
    { id: 'none', name: 'Pure', icon: <Sun className="w-3 h-3" /> },
    { id: 'rain', name: 'Cine-Rain', icon: <Waves className="w-3 h-3" /> },
    { id: 'snow', name: 'Sub-Zero', icon: <Cloud className="w-3 h-3" /> },
    { id: 'haze', name: 'London Fog', icon: <Wind className="w-3 h-3" /> },
    { id: 'dust', name: 'Desert Storm', icon: <Activity className="w-3 h-3" /> }
  ];

  return (
    <div id={id} className="atmospheric-grading-studio p-8 bg-slate-950 border border-slate-800 rounded-[2.5rem] space-y-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 ring-4 ring-indigo-500/5">
            <Sun className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight">Atmospheric Mastery</h3>
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] leading-none mt-1">Cinematic Lighting & Volume Orchestration</p>
          </div>
        </div>
        <div className="flex gap-2">
            <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-900/50 border border-slate-800 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-black uppercase text-slate-400">LATENCY: 12ms</span>
            </div>
           <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full border-l-4 border-l-amber-500">
              <Zap className="w-3 h-3 text-amber-400" />
              <span className="text-[9px] font-black uppercase text-amber-400">GPU-VOLUMETRIC READY</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Left Column: Grade & Effects */}
        <div className="col-span-5 space-y-8">
           {/* Color Wheels / Balance Simulation */}
           <div className="p-6 bg-slate-900/40 border border-slate-800/60 rounded-3xl space-y-6">
              <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-indigo-400" />
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-300">White Balance</h4>
                 </div>
                 <button onClick={() => {setTemp(0); setTint(0);}} className="text-[9px] font-bold text-slate-600 hover:text-slate-400 uppercase tracking-widest">Reset</button>
              </div>
              
              <div className="space-y-6">
                {[
                    { label: 'Temperature', value: temp, set: setTemp, leftColor: '#3b82f6', rightColor: '#f59e0b', min: -100, max: 100 },
                    { label: 'Tint', value: tint, set: setTint, leftColor: '#22c55e', rightColor: '#ec4899', min: -100, max: 100 }
                ].map((wb) => (
                    <div key={wb.label} className="space-y-3">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                            <span className="text-slate-500">{wb.label}</span>
                            <span className={wb.value > 0 ? 'text-amber-400' : wb.value < 0 ? 'text-indigo-400' : 'text-slate-500'}>{wb.value > 0 ? `+${wb.value}` : wb.value}</span>
                        </div>
                        <div className="relative h-1.5 flex items-center">
                            <div 
                                className="wb-gradient-track" 
                                style={{ 
                                    background: `linear-gradient(to right, ${wb.leftColor}, transparent, ${wb.rightColor})` as string
                                }} 
                            />
                            <input 
                                type="range" 
                                min={wb.min}
                                max={wb.max}
                                className="w-full appearance-none bg-transparent z-10 cursor-pointer custom-slider" 
                                value={wb.value}
                                title={wb.label}
                                aria-label={wb.label}
                                onChange={(e) => wb.set(parseInt(e.target.value))}
                            />
                        </div>
                    </div>
                ))}
              </div>
           </div>

           {/* Atmospheric Overlays */}
           <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                 <Wind className="w-4 h-4 text-amber-400" />
                 <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-300">Environment Systems</h4>
              </div>
              <div className="grid grid-cols-5 gap-2">
                 {effects.map((fx) => (
                    <button 
                       key={fx.id}
                       onClick={() => setAtmosEffect(fx.id as GradingConfig['atmosEffect'])}
                       className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${
                          atmosEffect === fx.id ? 'bg-amber-600 border-amber-400 text-white shadow-lg shadow-amber-600/20' : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:border-slate-700'
                       }`}
                    >
                       {fx.icon}
                       <span className="text-[8px] font-black uppercase tracking-tighter">{fx.name}</span>
                    </button>
                 ))}
              </div>
           </div>

           {/* LUT Selection */}
           <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                 <Settings className="w-4 h-4 text-indigo-400" />
                 <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-300">Color Science (LUT)</h4>
              </div>
              <div className="grid grid-cols-1 gap-2">
                 {luts.map((l) => (
                    <button 
                      key={l.id}
                      onClick={() => setLut(l.id)}
                      className={`group p-4 py-3 rounded-2xl border flex items-center justify-between transition-all ${
                        lut === l.id ? 'bg-indigo-600 border-indigo-400 text-white shadow-xl shadow-indigo-600/20' : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                       <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest">
                          <div 
                            className="lut-swatch" 
                            style={{ background: l.color }} 
                          />
                          {l.name}
                       </div>
                       {lut === l.id ? <CheckCircle2 className="w-4 h-4" /> : <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />}
                    </button>
                 ))}
              </div>
           </div>
        </div>

        {/* Right Column: Volume Controls & Preview */}
        <div className="col-span-7 space-y-8">
           {/* Preview Frame */}
           <div className="relative aspect-video rounded-[2rem] overflow-hidden border border-slate-800 shadow-2xl bg-black group">
              {previewImage ? (
                <img src={previewImage} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Atmosphere Preview" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-slate-800">
                    <Camera className="w-12 h-12" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">No Preview Feed</span>
                </div>
              )}
              
              {/* Overlay simulation */}
              <div className="preview-overlay" style={{
                  background: lut === 'classic_noir' ? 'rgba(0,0,0,0.2)' : 'transparent',
                  backdropFilter: `blur(${density / 10}px)`,
                  WebkitBackdropFilter: `blur(${density / 10}px)`,
                  mixBlendMode: 'overlay' as LegacyAny
              }} />

              <div className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
                 <Activity className="w-3 h-3 text-indigo-400" />
                 <span className="text-[9px] font-bold text-white uppercase tracking-widest italic">REAL-TIME GRADING ACTIVE</span>
              </div>
              
              <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between p-4 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl">
                 <div className="flex gap-4">
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Resolution</span>
                        <span className="text-[10px] font-bold text-white">4096 x 2160 (RAW)</span>
                    </div>
                    <div className="flex flex-col border-l border-white/10 pl-4">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Pipeline</span>
                        <span className="text-[10px] font-bold text-amber-400 uppercase">GPU-Master</span>
                    </div>
                 </div>
                 <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-indigo-400" />
                 </div>
              </div>
           </div>

           {/* SLIDERS */}
           <div className="grid grid-cols-2 gap-x-12 gap-y-8 p-8 bg-slate-900/40 rounded-[2rem] border border-slate-800/60">
              {[
                { label: 'Volumetric Fog Density', key: 'density', value: density, set: setDensity, icon: <Cloud className="w-3 h-3 text-indigo-400"/>, color: 'accent-indigo-500' },
                { label: 'Bloom / Glow Intensity', key: 'bloom', value: bloom, set: setBloom, icon: <Zap className="w-3 h-3 text-amber-400"/>, color: 'accent-amber-500' },
                { label: 'Cinematic Vignetting', key: 'vignette', value: vignette, set: setVignette, icon: <Waves className="w-3 h-3 text-emerald-400"/>, color: 'accent-emerald-500' },
                { label: 'Neural Film Grain', key: 'grain', value: grain, set: setGrain, icon: <Settings className="w-3 h-3 text-pink-400"/>, color: 'accent-pink-500' }
              ].map((ctrl) => (
                <div key={ctrl.key} className="space-y-4">
                   <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                      <div className="flex items-center gap-2">
                         <span>{ctrl.icon}</span>
                         <span className="text-slate-400">{ctrl.label}</span>
                      </div>
                      <span className="text-white bg-slate-800 px-2 py-0.5 rounded italic font-bold">{ctrl.value}%</span>
                   </div>
                   <input 
                     type="range" 
                     className={`w-full appearance-none bg-slate-800 h-1.5 rounded-full cursor-pointer ${ctrl.color}`} 
                     value={ctrl.value}
                     title={ctrl.label}
                     aria-label={ctrl.label}
                     onChange={(e) => ctrl.set(parseInt(e.target.value))}
                   />
                </div>
              ))}
           </div>

           <div className="flex gap-4">
              <Button 
                onClick={applyGrading}
                disabled={isApplying}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest h-16 rounded-2xl shadow-xl shadow-indigo-600/20 active:scale-95 transition-all text-[11px] border border-indigo-400/20"
              >
                 {isApplying ? <Activity className="w-6 h-6 animate-spin" /> : (
                   <div className="flex items-center gap-3">
                      MASTERING DU LOOK CINÉMATIQUE <Zap className="w-4 h-4 text-amber-400" />
                   </div>
                 )}
              </Button>
              <button 
                title="Exporter les métatdonnées de grading"
                className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center text-slate-500 hover:text-white hover:border-slate-700 transition-all"
              >
                 <Settings className="w-6 h-6" />
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

// Internal icon proxy removed in favor of lucide-react ChevronRight
