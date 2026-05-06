/**
 * Magic Mask Tool Component
 * 
 * Segment-Anything Model (SAM) based subject isolation for Phase 8: Visual Mastery.
 * Allows directors to surgically isolate characters or objects for selective grading.
 */
import { LegacyAny } from '@/types/legacy';


import React, { useState, useRef } from 'react';
import { 
  SquareDashed, 
  MousePointer2, 
  Trash2, 
  Zap, 
  Layers, 
  ShieldCheck,
  Activity,
  Cpu,
  Monitor
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface Point {
  x: number;
  y: number;
  type: 'positive' | 'negative';
}

interface MagicMaskToolProps {
  inputPath: string;
  onMaskGenerated?: (maskPath: string) => void;
}

export const MagicMaskTool: React.FC<MagicMaskToolProps> = ({ 
  inputPath, 
  onMaskGenerated 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [maskPath, setMaskPath] = useState<string | null>(null);
  const [refinement, setRefinement] = useState({ feather: 5, expand: 0, smoothing: 10 });
  const [grading, setGrading] = useState({ brightness: 100, contrast: 100, exposure: 0 });

  const handleCanvasClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Left click = Positive point (add), Right click = Negative point (remove)
    const type = e.button === 0 ? 'positive' : 'negative';
    const newPoint: Point = { x, y, type };
    setPoints([...points, newPoint]);
  };

  const generateMask = async () => {
    if (points.length === 0) return;
    
    setIsProcessing(true);
    setProgress(5);

    try {
      // Step 1: Encode image with SAM embedding (Simulated)
      setTimeout(() => setProgress(30), 800);
      
      // Step 2: Decode interactive mask (Simulated)
      setTimeout(() => setProgress(70), 2200);
      
      // Step 3: Refine edges and finalize alpha (Simulated)
      setTimeout(() => {
        setProgress(100);
        setIsProcessing(false);
        setMaskPath("/tmp/magic-mask-render.png");
        onMaskGenerated?.("/tmp/magic-mask-render.png");
      }, 3500);

    } catch (err) {
      console.error("Mask generation failed", err);
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setPoints([]);
    setMaskPath(null);
    setProgress(0);
  };

  return (
    <div className="magic-mask-studio p-8 bg-slate-950 border border-slate-800 rounded-[2.5rem] space-y-8 shadow-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
           <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 ring-4 ring-indigo-500/5">
              <SquareDashed className="w-6 h-6 text-indigo-400" />
           </div>
           <div>
              <h3 className="text-xl font-bold tracking-tight">Magic Mask Studio</h3>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] leading-none mt-1">SAM-1 Neural Edge Processor</p>
           </div>
        </div>
        <div className="flex items-center gap-3">
           <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full border-l-4 border-l-amber-500">
              <Cpu className="w-3 h-3 text-amber-500" />
              <span className="text-[9px] font-black uppercase text-amber-400">TensorCore Locked</span>
           </div>
           <button onClick={reset} title="Réinitialiser" className="p-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl transition-all">
              <Trash2 className="w-4 h-4 text-slate-400" />
           </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Interaction Canvas */}
        <div className="col-span-8 space-y-6">
           <div className="relative aspect-video bg-black rounded-[2rem] overflow-hidden border border-slate-800 group shadow-2xl">
              {/* Main Image */}
              <img src={inputPath} className="w-full h-full object-contain opacity-50 transition-opacity duration-700 group-hover:opacity-70" alt="Mask Source" />
              
              {/* Scanline Animation during processing */}
              {isProcessing && <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/10 to-transparent h-20 w-full animate-scan pointer-events-none" />}

              {/* Mask Overlay */}
              {maskPath && (
                <div className="absolute inset-0 bg-indigo-500/30 animate-pulse-soft pointer-events-none mix-blend-overlay" />
              )}

              {/* Interaction Markers */}
              <div className="absolute inset-0 pointer-events-none z-20">
                {points.map((p, i) => (
                  <div 
                    key={i}
                    className={`absolute w-4 h-4 rounded-full border-2 border-white shadow-[0_0_15px_rgba(255,255,255,0.5)] transform -translate-x-1/2 -translate-y-1/2 transition-all animate-in zoom-in-50 duration-300 ${
                      p.type === 'positive' ? 'bg-emerald-500 ring-4 ring-emerald-500/20' : 'bg-pink-500 ring-4 ring-pink-500/20'
                    }`}
                    style={{ left: p.x, top: p.y }}
                  />
                ))}
              </div>

              {/* Interaction Layer */}
              <canvas 
                ref={canvasRef}
                width={800}
                height={450}
                onMouseDown={handleCanvasClick}
                onContextMenu={(e) => e.preventDefault()}
                className="absolute inset-0 w-full h-full cursor-crosshair z-10"
              />

              {/* HUD */}
              <div className="absolute bottom-6 left-6 p-3 px-4 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl pointer-events-none z-30 flex items-center gap-4 border-l-4 border-indigo-500">
                 <div className="flex flex-col">
                    <span className="text-[8px] font-black text-indigo-400 tracking-[0.2em] uppercase">Neural Buffer</span>
                    <span className="text-xs font-bold text-white tracking-widest">{points.length} PROMPTS LOADED</span>
                 </div>
                 <div className="h-6 w-px bg-white/10" />
                 <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-500 tracking-[0.2em] uppercase">Status</span>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase">READY</span>
                 </div>
              </div>

               {isProcessing && (
                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-40 flex flex-col items-center justify-center gap-6">
                   <div className="relative">
                      <Activity className="w-16 h-16 text-indigo-500 animate-spin" />
                      <ShieldCheck className="w-6 h-6 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                   </div>
                   <div className="w-72 space-y-4">
                      <div className="flex justify-between text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                         <span>Inference Progress</span>
                         <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-1.5 bg-slate-800 accent-indigo-500" />
                      <p className="text-[9px] text-center font-bold text-slate-400 uppercase tracking-[0.3em] animate-pulse">Extracting Semantic Edges...</p>
                   </div>
                </div>
              )}
           </div>

           <div className="flex gap-4">
              <div className="flex-1 p-5 bg-slate-900/40 rounded-[2rem] border border-slate-800/60 flex items-center gap-5">
                 <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                    <MousePointer2 className="w-5 h-5 text-emerald-400" />
                 </div>
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-loose">
                    CLIC GAUCHE : <span className="text-emerald-400">INCLURE</span>  /  
                    CLIC DROIT : <span className="text-pink-400 ml-2">EXCLURE</span><br/>
                    <span className="text-[8px] text-slate-600">Tracez des points sur le sujet pour l'isoler chirurgicalement.</span>
                 </p>
              </div>
              <Button 
                onClick={generateMask}
                disabled={points.length === 0 || isProcessing}
                className="px-10 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest h-auto rounded-3xl shadow-xl shadow-indigo-600/20 border border-indigo-400/20 transition-all active:scale-95"
              >
                MASQUAGE NEURAL <Zap className="w-4 h-4 ml-3 text-amber-400" />
              </Button>
           </div>
        </div>

        {/* Refinement & Grading Sidebar */}
        <div className="col-span-4 space-y-8">
           {/* Refinement Controls */}
           <div className="p-8 bg-slate-900/40 rounded-[2.5rem] border border-slate-800/60 space-y-8">
              <div className="flex items-center gap-2">
                 <Layers className="w-4 h-4 text-indigo-400" />
                 <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-300">Mask Refinement</h4>
              </div>

              <div className="space-y-8">
                 {[
                   { label: 'Edge Feathering', key: 'feather', value: refinement.feather, icon: <Activity className="w-3 h-3"/>, color: 'accent-indigo-500' },
                   { label: 'Expand / Contract', key: 'expand', value: refinement.expand, icon: <Monitor className="w-3 h-3"/>, color: 'accent-amber-500' },
                   { label: 'Neural Smoothing', key: 'smoothing', value: refinement.smoothing, icon: <Cpu className="w-3 h-3"/>, color: 'accent-emerald-500' }
                 ].map((ctrl) => (
                   <div key={ctrl.key} className="space-y-4">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                         <div className="flex items-center gap-2">
                            <span className="text-slate-500">{ctrl.icon}</span>
                            <span className="text-slate-400">{ctrl.label}</span>
                         </div>
                         <span className="text-white bg-slate-800 px-2 py-0.5 rounded italic font-bold">{ctrl.value}px</span>
                      </div>
                      <input 
                        type="range" 
                        min="-20"
                        max="50"
                        className={`w-full appearance-none bg-slate-800 h-1.5 rounded-full cursor-pointer custom-slider ${ctrl.color}`} 
                        value={ctrl.value}
                        title={ctrl.label}
                        aria-label={ctrl.label}
                        onChange={(e) => setRefinement({...refinement, [ctrl.key]: parseInt(e.target.value)})}
                      />
                   </div>
                 ))}
              </div>
           </div>

           {/* Selective Grading */}
           <div className="p-8 bg-slate-900/40 rounded-[2.5rem] border border-slate-800/60 space-y-8">
              <div className="flex items-center gap-2">
                 <Zap className="w-4 h-4 text-amber-400" />
                 <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-300">Selective Grading</h4>
              </div>

              <div className="space-y-8">
                 {[
                   { label: 'Brightness', key: 'brightness', unit: '%' },
                   { label: 'Contrast', key: 'contrast', unit: '%' },
                   { label: 'Exposure', key: 'exposure', unit: 'ev' }
                 ].map((c) => (
                   <div key={c.key} className="space-y-4">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                         <span className="text-slate-500">{c.label}</span>
                         <span className="text-indigo-400">{(grading as LegacyAny)[c.key]}{c.unit}</span>
                      </div>
                      <input 
                        type="range" 
                        className="w-full appearance-none bg-slate-800 h-1.5 rounded-full accent-indigo-500 cursor-pointer custom-slider" 
                        value={(grading as LegacyAny)[c.key]}
                        title={c.label}
                        aria-label={c.label}
                        onChange={(e) => setGrading({...grading, [c.key]: parseInt(e.target.value)})}
                      />
                   </div>
                 ))}
              </div>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="h-14 border-slate-800 bg-slate-900 text-slate-400 hover:text-white font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all">
                 APERÇU ALPHA
              </Button>
              <Button variant="outline" className="h-14 border-slate-800 bg-slate-900 text-slate-400 hover:text-white font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all">
                 EXPORTER PNG
              </Button>
           </div>
        </div>
      </div>
    </div>
  );
};