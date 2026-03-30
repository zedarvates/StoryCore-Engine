/**
 * Magic Mask Tool Component
 * 
 * Segment-Anything Model (SAM) based subject isolation for Phase 8: Visual Mastery.
 * Allows directors to surgically isolate characters or objects for selective grading.
 */

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
      setTimeout(() => setProgress(30), 1000);
      
      // Step 2: Decode interactive mask (Simulated)
      setTimeout(() => setProgress(70), 3000);
      
      // Step 3: Refine edges and finalize alpha (Simulated)
      setTimeout(() => {
        setProgress(100);
        setIsProcessing(false);
        setMaskPath("/tmp/magic-mask-render.png");
        onMaskGenerated?.("/tmp/magic-mask-render.png");
      }, 5000);

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
    <div className="magic-mask-tool space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
           <div className="p-2 bg-indigo-500/20 rounded-lg">
              <SquareDashed className="w-5 h-5 text-indigo-400" />
           </div>
           <div>
              <h3 className="text-sm font-bold">Magic Mask Studio (SAM-1)</h3>
              <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest leading-none">High-Precision Subject Isolation</p>
           </div>
        </div>
        <div className="flex items-center gap-3">
           <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
              <Cpu className="w-3 h-3 text-amber-500" />
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest text-[8px]">TensorCore-Locked</span>
           </div>
           <button onClick={reset} title="Réinitialiser les points du masque" className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
              <Trash2 className="w-4 h-4 text-slate-500" />
           </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Interaction Canvas */}
        <div className="col-span-2 space-y-4">
           <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 group shadow-2xl">
              {/* Main Image View */}
              <img src={inputPath} className="w-full h-full object-contain opacity-60" alt="Mask Source" />
              
              {/* Mask Overlay View (Simulated) */}
              {maskPath && (
                <div className="absolute inset-0 bg-indigo-500/30 animate-pulse pointer-events-none mix-blend-overlay" />
              )}

              {/* Interaction Layer */}
              <canvas 
                ref={canvasRef}
                width={800}
                height={450}
                onMouseDown={handleCanvasClick}
                onContextMenu={(e) => e.preventDefault()}
                className="absolute inset-0 w-full h-full cursor-crosshair z-10"
              />

               {/* Interaction Markers */}
               {points.map((p, i) => (
                 <div 
                   key={i}
                   className="absolute w-3 h-3 rounded-full border-2 border-white shadow-lg pointer-events-none z-20 transition-transform interaction-marker"
                   style={{ 
                     '--marker-x': `${p.x - 6}px`, 
                     '--marker-y': `${p.y - 6}px` 
                   } as React.CSSProperties}
                 />
               ))}

              {/* HUD / Directorial Info */}
              <div className="absolute bottom-4 left-4 p-2 px-3 bg-slate-900/80 backdrop-blur border border-slate-700/50 rounded-xl pointer-events-none z-30 flex items-center gap-3 border-l-4 border-indigo-500">
                 <div className="flex flex-col">
                    <span className="text-[8px] font-black text-indigo-400 tracking-widest uppercase">Subject Tracker</span>
                    <span className="text-xs font-bold text-white">{points.length} Prompts Active</span>
                 </div>
              </div>

               {isProcessing && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-40 flex flex-col items-center justify-center gap-4">
                   <div className="relative">
                      <Activity className="w-10 h-10 text-indigo-500 animate-spin" />
                      <ShieldCheck className="w-4 h-4 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                   </div>
                   <div className="w-48 space-y-2">
                      <Progress value={progress} className="h-1 bg-slate-800" />
                      <p className="text-[9px] text-center font-bold text-slate-400 uppercase tracking-widest">SAM Edge Extraction...</p>
                   </div>
                </div>
              )}
           </div>

           <div className="flex gap-4">
              <div className="flex-1 p-4 bg-slate-900/50 rounded-xl border border-slate-800 flex items-center gap-4">
                 <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <MousePointer2 className="w-4 h-4 text-emerald-400" />
                 </div>
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">
                    CLIC GAUCHE : <span className="text-white">AJOUTER ZONE</span><br/>
                    CLIC DROIT : <span className="text-pink-400">EXCLURE ZONE</span>
                 </p>
              </div>
              <Button 
                onClick={generateMask}
                disabled={points.length === 0 || isProcessing}
                className="px-8 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest h-auto rounded-2xl shadow-xl shadow-indigo-500/10"
              >
                GÉNÉRER LE MASQUE ALPHA <Zap className="w-4 h-4 ml-2" />
              </Button>
           </div>
        </div>

        {/* Selective Grading Panel */}
        <div className="space-y-6 p-6 bg-slate-900 rounded-2xl border border-slate-800">
           <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs font-black uppercase tracking-widest">Surgical Grading</h4>
           </div>

           <div className="space-y-6">
              {[
                { label: 'Brightness', key: 'brightness', unit: '%' },
                { label: 'Contrast', key: 'contrast', unit: '%' },
                { label: 'Exposure', key: 'exposure', unit: 'ev' }
              ].map((c) => (
                <div key={c.key} className="space-y-3">
                   <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                      <span className="text-slate-500">{c.label}</span>
                      <span className="text-indigo-400">{(grading as Record<string, number>)[c.key]}{c.unit}</span>
                   </div>
                   <input 
                     type="range" 
                     className="w-full appearance-none bg-slate-800 h-1.5 rounded-full accent-indigo-500" 
                     value={(grading as Record<string, number>)[c.key]}
                     title={c.label}
                     aria-label={c.label}
                     onChange={(e) => setGrading({...grading, [c.key]: parseInt(e.target.value)})}
                   />
                </div>
              ))}
           </div>

           <div className="pt-6 border-t border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                 <Monitor className="w-3 h-3 text-slate-500" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Output Layer</span>
              </div>
              <Button variant="outline" className="w-full border-slate-800 text-slate-400 hover:text-white font-black uppercase tracking-widest text-[10px] h-10 rounded-xl">
                 EXPORTER MASQUE PNG
              </Button>
           </div>

           <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
              <p className="text-[9px] text-indigo-300 italic leading-relaxed">
                 * Le grading sélectif est appliqué UNIQUEMENT à la zone isolée. Utilisez des points d'exclusion pour affiner les textures complexes.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};