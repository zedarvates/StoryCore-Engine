/**
 * Sonic Master Studio Component
 * 
 * The ultimate audio orchestration timeline for Phase 9: Audio Worldization.
 * Merges Foley, Dialogue, and Ambience into a spatialized cinematic mix.
 */

import React, { useState } from 'react';
import { 
  Volume2, 
  Layers, 
  Map as MapIcon, 
  Activity, 
  Maximize2, 
  Play,
  Pause,
  SkipBack,
  Settings,
  Waves,
  Wind
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import './SonicMasterStudio.css';

interface AudioClip {
  id: string;
  startTime: number;
  duration: number;
  content: string;
}

interface AudioTrack {
  id: string;
  name: string;
  type: 'dialogue' | 'foley' | 'ambience' | 'music';
  volume: number;
  color: string;
  clips: AudioClip[];
}

export const SonicMasterStudio: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const currentTime = 12.5; // Shared state in parent in real app
  
  const [tracks] = useState<AudioTrack[]>([
    { 
      id: 't1', name: 'DIALOGUE_MAIN', type: 'dialogue', volume: 85, color: '#f59e0b',
      clips: [{ id: 'c1', startTime: 2, duration: 8, content: 'Alara: "Je sens que..." ' }]
    },
    { 
      id: 't2', name: 'FOLEY_ENVIRONMENT', type: 'foley', volume: 65, color: '#10b981',
      clips: [
        { id: 'c2', startTime: 0, duration: 15, content: 'Rain / Wet Steps' },
        { id: 'c5', startTime: 18, duration: 5, content: 'Door Creek' }
      ]
    },
    { 
      id: 't3', name: 'AMBIENCE_WORLD', type: 'ambience', volume: 40, color: '#6366f1',
      clips: [{ id: 'c3', startTime: 0, duration: 45, content: 'Distant Storm / Wind' }]
    },
    { 
      id: 't4', name: 'NARRATIVE_SCORE', type: 'music', volume: 55, color: '#ec4899',
      clips: [{ id: 'c4', startTime: 5, duration: 30, content: 'Melodic Tension - Pad' }]
    },
  ]);

  const [activeSpatialTrack, setActiveSpatialTrack] = useState<string | null>('t1');

  return (
    <div className="sonic-master-studio p-8 bg-slate-950 border border-slate-800 rounded-[2.5rem] space-y-8 shadow-3xl text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
           <div className="p-3 bg-violet-500/10 rounded-2xl border border-violet-500/20 ring-4 ring-violet-500/5">
              <Layers className="w-6 h-6 text-violet-400" />
           </div>
           <div>
              <h3 className="text-xl font-bold tracking-tight">Sonic Master Studio</h3>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] leading-none mt-1">Directorial Audio Mastering & Spatial Mapping</p>
           </div>
        </div>
        
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-8 px-6 py-3 bg-slate-900/60 border border-slate-800 rounded-2xl">
              <div className="flex flex-col items-center gap-1">
                 <span className="text-[8px] font-black text-slate-500 uppercase">Input Peak</span>
                 <div className="w-24 h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="w-3/4 h-full bg-emerald-500" />
                 </div>
              </div>
              <div className="flex flex-col items-center gap-1">
                 <span className="text-[8px] font-black text-slate-500 uppercase">Worldization</span>
                 <div className="w-24 h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="w-1/2 h-full bg-violet-500" />
                 </div>
              </div>
           </div>
           
           <div className="flex gap-2">
              <Button size="icon" variant="outline" className="rounded-xl border-slate-800 bg-slate-900/50 hover:bg-slate-800 transition-colors">
                 <Settings className="w-4 h-4 text-slate-400" />
              </Button>
              <Button size="icon" variant="outline" className="rounded-xl border-slate-800 bg-slate-900/50 hover:bg-slate-800 transition-colors">
                 <Maximize2 className="w-4 h-4 text-slate-400" />
              </Button>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8 h-[500px]">
        {/* Left: Track Controls */}
        <div className="col-span-3 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
           {tracks.map(track => (
             <div 
               key={track.id}
               onClick={() => setActiveSpatialTrack(track.id)}
               className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
                 activeSpatialTrack === track.id ? 'bg-slate-900 border-violet-500/40' : 'bg-slate-900/40 border-slate-800/60 hover:border-slate-700'
               }`}
             >
                <div className="flex justify-between items-center mb-3">
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: track.color }} />
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">{track.name}</span>
                   </div>
                   <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Volume2 className="w-3 h-3 text-slate-600" />
                   </div>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500">
                   <div className="flex-1">
                      <Slider 
                        defaultValue={[track.volume]} 
                        max={100} 
                        step={1} 
                        className="sonic-slider"
                      />
                   </div>
                   <span className="w-8">{track.volume}%</span>
                </div>
                <div className="flex gap-2 mt-3 text-[8px] font-black uppercase tracking-tighter text-slate-600">
                   <button className="flex-1 py-1 bg-slate-950 border border-slate-800 rounded-lg hover:text-slate-300 transition-colors">Mute</button>
                   <button className="flex-1 py-1 bg-slate-950 border border-slate-800 rounded-lg hover:text-slate-300 transition-colors">Solo</button>
                </div>
             </div>
           ))}
        </div>

        {/* Center: Timeline Display */}
        <div className="col-span-9 flex flex-col gap-4 relative bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-6 overflow-hidden">
           {/* Time Rulers */}
           <div className="flex items-center justify-between mb-2">
              <div className="flex gap-4">
                 {[0, 10, 20, 30, 40, 50, 60].map(s => (
                   <span key={s} className="text-[8px] font-black text-slate-600 uppercase w-12 text-center">{s}s</span>
                 ))}
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-violet-500/10 border border-violet-500/20 rounded-full">
                 <span className="text-[10px] font-bold text-violet-400">OFFSET: +2.4ms</span>
              </div>
           </div>

           {/* Track Lanes */}
           <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar relative">
              {tracks.map(track => (
                <div key={track.id} className="h-16 relative bg-slate-950/50 rounded-xl border border-slate-800/40 overflow-hidden">
                   {track.clips.map(clip => (
                     <div 
                        key={clip.id}
                        className="absolute h-full flex flex-col justify-center px-4 border-l-2 audio-clip-card"
                        style={{ 
                           left: `${clip.startTime * 10}px`, 
                           width: `${clip.duration * 10}px`,
                           backgroundColor: `${track.color}15`,
                           borderColor: track.color
                        } as React.CSSProperties}
                     >
                        <span className="text-[8px] font-bold text-white truncate mb-1 uppercase tracking-tighter opacity-80">{clip.content}</span>
                        <div className="h-4 flex items-center gap-[1px]">
                           {[...Array(20)].map((_, i) => (
                             <div 
                               key={i} 
                               className="flex-1 bg-white/20 rounded-full bar-anim" 
                               style={{ height: `${Math.random() * 80 + 20}%` } as React.CSSProperties} 
                             />
                           ))}
                        </div>
                     </div>
                   ))}
                </div>
              ))}
              
              {/* Playhead */}
              <div 
                className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-10 shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                style={{ left: `${currentTime * 10}px` }}
              >
                 <div className="absolute top-0 -translate-x-1/2 w-4 h-4 bg-red-500 rounded-b-full flex items-center justify-center">
                    <div className="w-1 h-1 bg-white rounded-full opacity-50" />
                 </div>
              </div>
           </div>

           {/* Playback Controls */}
           <div className="flex items-center justify-between mt-4 p-4 bg-slate-950/80 backdrop-blur-xl border border-slate-800 rounded-2xl">
              <div className="flex items-center gap-1">
                 <Button size="icon" variant="ghost" className="text-slate-500 hover:text-white">
                    <SkipBack className="w-4 h-4" />
                 </Button>
                 <Button 
                    size="icon" 
                    className="bg-violet-600 hover:bg-violet-500 text-white rounded-full w-10 h-10 shadow-lg shadow-violet-600/20"
                    onClick={() => setIsPlaying(!isPlaying)}
                 >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                 </Button>
              </div>

              <div className="flex gap-8 px-10">
                 <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black text-violet-400 font-mono tracking-widest uppercase">TC [MM:SS:FF]</span>
                    <span className="text-2xl font-black text-white font-mono tracking-tighter">00:00:12:12</span>
                 </div>
                 <div className="flex flex-col items-center opacity-40">
                    <span className="text-[10px] font-black text-slate-500 font-mono tracking-widest uppercase">REM [MM:SS:FF]</span>
                    <span className="text-2xl font-black text-slate-500 font-mono tracking-tighter">00:02:45:00</span>
                 </div>
              </div>

              <div className="flex items-center gap-4">
                 <div className="flex flex-col text-right">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Master L/R</span>
                    <div className="flex gap-1 h-3 mt-1">
                       <div className="w-16 bg-slate-800 rounded-full overflow-hidden">
                          <div className="w-4/5 h-full bg-emerald-400" />
                       </div>
                       <div className="w-16 bg-slate-800 rounded-full overflow-hidden">
                          <div className="w-3/4 h-full bg-emerald-400" />
                       </div>
                    </div>
                 </div>
                 <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[10px] tracking-widest rounded-xl px-6">
                    BOUNCING MIX
                 </Button>
              </div>
           </div>
        </div>
      </div>

      {/* Spatial Mapping Strip (P9 Special) */}
      <div className="grid grid-cols-12 gap-8 h-40">
         <div className="col-span-3 flex flex-col justify-center p-6 bg-violet-500/5 border border-violet-500/10 rounded-3xl">
            <div className="flex items-center gap-3 mb-2 font-black uppercase tracking-widest text-[10px]">
               <MapIcon className="w-4 h-4 text-violet-400" />
               <h4>Spatial Radar</h4>
            </div>
            <p className="text-[9px] text-slate-500 uppercase font-bold tracking-tight">Placement phonique auto-mappé sur le plan de caméra actif.</p>
         </div>
         <div className="col-span-9 flex items-center gap-12 p-6 bg-slate-900/40 border border-slate-800 rounded-3xl relative overflow-hidden">
            <div className="w-32 h-32 border-2 border-slate-800 rounded-full relative flex items-center justify-center shadow-radar">
               <div className="absolute inset-0 flex items-center justify-center opacity-10">
                  <div className="w-full h-[1px] bg-white" />
                  <div className="h-full w-[1px] bg-white absolute" />
               </div>
               <div className="w-3 h-3 bg-violet-500 rounded-full shadow-[0_0_15px_rgba(139,92,246,0.6)] animate-pulse radar-point" />
               <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[7px] font-black text-slate-600 uppercase">Screen Top</div>
            </div>
            
            <div className="flex-1 grid grid-cols-3 gap-6">
               {[
                 { label: 'Reverb Room Size', value: 42, icon: <Waves className="w-4 h-4 text-sky-400" /> },
                 { label: 'Doppler Intensity', value: 15, icon: <Activity className="w-4 h-4 text-pink-400" /> },
                 { label: 'Worldization Dry/Wet', value: 30, icon: <Wind className="w-4 h-4 text-indigo-400" /> }
               ].map(m => (
                 <div key={m.label} className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/40">
                    <div className="flex justify-between items-start mb-3">
                       <span className="text-[9px] font-black text-slate-500 uppercase leading-none">{m.label}</span>
                       {m.icon}
                    </div>
                    <div className="flex items-center gap-3 font-black text-white text-[10px] font-mono">
                       <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-violet-500/50" style={{ width: `${m.value}%` } as React.CSSProperties} />
                       </div>
                       <span>{m.value}</span>
                    </div>
                 </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
};
