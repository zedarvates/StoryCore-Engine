/**
 * Neural Orchestration Master Component
 * 
 * The command center for Phase 10: Final Orchestration.
 * Visualizes and controls the real-time link between StoryCore and Neural Backend Services.
 */

import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Server, 
  Activity, 
  ShieldCheck, 
  AlertCircle, 
  RefreshCw, 
  Play, 
  Pause,
  ExternalLink,
  Cpu,
  Database,
  Cloud
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import './NeuralOrchestrationMaster.css';

interface NeuralService {
  id: string;
  name: string;
  status: 'online' | 'busy' | 'offline';
  latency: number;
  utilization: number;
  type: 'image' | 'audio' | 'video' | 'llm';
}

export const NeuralOrchestrationMaster: React.FC = () => {
  const [services, setServices] = useState<NeuralService[]>([
    { id: 'srv_1', name: 'COMFY_NODE_01', status: 'online', latency: 12, utilization: 45, type: 'image' },
    { id: 'srv_2', name: 'ELEVEN_LABS_LINK', status: 'online', latency: 145, utilization: 12, type: 'audio' },
    { id: 'srv_3', name: 'STORYCORE_NLP', status: 'busy', latency: 5, utilization: 88, type: 'llm' },
    { id: 'srv_4', name: 'VFX_RENDER_GRID', status: 'online', latency: 25, utilization: 30, type: 'video' },
  ]);

  const [isGlobalActive, setIsGlobalActive] = useState(true);
  const [queueCount, setQueueCount] = useState(3);

  // Simulated live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setServices(prev => prev.map(s => ({
        ...s,
        latency: Math.max(2, s.latency + (Math.random() * 10 - 5)),
        utilization: Math.max(0, Math.min(100, s.utilization + (Math.random() * 20 - 10)))
      })));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="neural-orchestration-master p-10 bg-slate-950 border border-slate-800 rounded-[3rem] space-y-10 shadow-3xl text-white overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-right from-violet-600 via-indigo-500 to-emerald-500 animate-pulse" />
      
      {/* Header Panel */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-5">
           <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 ring-8 ring-indigo-500/5">
              <Zap className="w-8 h-8 text-indigo-400 fill-indigo-400/20" />
           </div>
           <div>
              <h3 className="text-2xl font-black tracking-tighter uppercase italic">Neural Orchestration Master</h3>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-[0.4em] leading-none mt-2">Unified Pipeline Command & Control • Phase 10</p>
           </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="flex flex-col items-end pr-6 border-r border-slate-800">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Global Pipeline Status</span>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">Master Link Stable</span>
              </div>
           </div>
           <Button 
             variant={isGlobalActive ? "destructive" : "default"}
             onClick={() => setIsGlobalActive(!isGlobalActive)}
             className="h-12 px-8 rounded-xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
           >
              {isGlobalActive ? (
                <div className="flex items-center gap-2"><Pause className="w-4 h-4 fill-current" /> Pause Pipeline</div>
              ) : (
                <div className="flex items-center gap-2"><Play className="w-4 h-4 fill-current" /> Resume Pipeline</div>
              )}
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-10">
        {/* Left: Service Grid */}
        <div className="col-span-8 space-y-6">
           <div className="flex items-center gap-3 mb-2">
              <Server className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs font-black uppercase tracking-widest">Active Neural Infrastructure</h4>
           </div>
           <div className="grid grid-cols-2 gap-6">
              {services.map(service => (
                <div key={service.id} className="p-6 bg-slate-900/40 border border-slate-800/60 rounded-[2rem] hover:border-indigo-500/40 transition-all group overflow-hidden relative">
                   <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
                      <Cpu className="w-24 h-24 text-white" />
                   </div>
                   
                   <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-3">
                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                           service.status === 'online' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                           service.status === 'busy' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                           'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                         }`}>
                            {service.type === 'image' ? <Database className="w-5 h-5" /> : 
                             service.type === 'audio' ? <Activity className="w-5 h-5" /> :
                             service.type === 'video' ? <Cloud className="w-5 h-5" /> : <Cpu className="w-5 h-5" />}
                         </div>
                         <div>
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">{service.name}</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                               <div className={`w-1.5 h-1.5 rounded-full ${service.status === 'online' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                               <span className="text-[8px] font-bold text-slate-500 uppercase">{service.status} • {service.latency.toFixed(0)}ms</span>
                            </div>
                         </div>
                      </div>
                      <ExternalLink className="w-3 h-3 text-slate-700 hover:text-white cursor-pointer" />
                   </div>

                   <div className="space-y-3">
                      <div className="flex justify-between text-[9px] font-black uppercase text-slate-500">
                         <span>Load Profile</span>
                         <span className="text-white italic">{service.utilization.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden">
                         <div 
                           className={`h-full transition-all duration-1000 ${
                             service.utilization > 80 ? 'bg-rose-500' : 
                             service.utilization > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                           }`} 
                           style={{ width: `${service.utilization}%` }} 
                         />
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </div>

        {/* Right: Pipeline Stats */}
        <div className="col-span-4 space-y-6">
           <div className="p-8 bg-indigo-600/5 border border-indigo-500/10 rounded-[2.5rem] space-y-8 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 blur-[80px] rounded-full" />
              
              <div className="flex flex-col gap-2">
                 <h5 className="text-[10px] font-black text-indigo-400 tracking-widest uppercase mb-1">Queue Synchronizer</h5>
                 <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-white">{queueCount}</span>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Batches Pending</span>
                 </div>
              </div>

              <div className="space-y-6">
                 {[
                   { label: 'Resource Coherence', val: 94, color: 'bg-emerald-500' },
                   { label: 'Neural Fidelity', val: 88, color: 'bg-indigo-500' },
                   { label: 'Temporal Alignment', val: 76, color: 'bg-amber-500' }
                 ].map(stat => (
                   <div key={stat.label} className="space-y-2">
                      <div className="flex justify-between text-[9px] font-black uppercase text-slate-400 tracking-tighter">
                         <span>{stat.label}</span>
                         <span className="text-white">{stat.val}%</span>
                      </div>
                      <Progress value={stat.val} className={`h-1 bg-slate-900 ${stat.color}`} />
                   </div>
                 ))}
              </div>

              <Button 
                onClick={() => setQueueCount(0)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-indigo-400 font-black uppercase tracking-widest text-[9px] h-12 rounded-xl border border-slate-800"
              >
                 <RefreshCw className="w-3 h-3 mr-2" /> Flash Process Assets
              </Button>
           </div>

           <div className="p-8 bg-emerald-500/5 border border-emerald-500/10 rounded-[2.5rem] space-y-4">
              <div className="flex items-center gap-3">
                 <ShieldCheck className="w-5 h-5 text-emerald-400" />
                 <h5 className="text-[11px] font-black text-white uppercase tracking-widest leading-none">Security Masking Active</h5>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed font-bold uppercase tracking-tight">
                 Le monitoring neural garantit qu'aucune donnée privée n'est transmise aux serveurs externes durant l'orchestration.
              </p>
           </div>
        </div>
      </div>
      
      {/* Bottom Tooter: Activity Log */}
      <div className="flex items-center justify-between p-6 bg-slate-900/60 border border-slate-800 rounded-[2rem]">
         <div className="flex items-center gap-10">
            <div className="flex items-center gap-3">
               <AlertCircle className="w-4 h-4 text-amber-400" />
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">[14:42:01] Warning: VO_GEN latent bottleneck detected.</span>
            </div>
            <div className="flex items-center gap-3">
               <ShieldCheck className="w-4 h-4 text-emerald-400" />
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">[14:41:55] Success: 4K Shot Mastering complete.</span>
            </div>
         </div>
         <Button variant="ghost" className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] hover:bg-indigo-500/10">
            View Expanded Log <ExternalLink className="w-3 h-3 ml-2" />
         </Button>
      </div>
    </div>
  );
};
