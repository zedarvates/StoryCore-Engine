/**
 * Directorial Annotator Component
 * 
 * Interactive directorial review layer for Phase 7: Collaborative Review.
 * Draws on-frame annotations and directorial notes over cinematic previews.
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  PenTool, 
  Type, 
  Trash2, 
  MessageSquare, 
  Send, 
  XCircle,
  Eye,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface Annotation {
  id: string;
  type: 'draw' | 'text';
  points?: { x: number; y: number }[];
  text?: string;
  color: string;
  frame: number;
}

interface DirectorialAnnotatorProps {
  currentFrame: number;
  width: number;
  height: number;
  onAnnotationSave?: (annotation: Annotation) => void;
  onClose?: () => void;
  id?: string;
}

export const DirectorialAnnotator: React.FC<DirectorialAnnotatorProps> = ({
  currentFrame,
  width,
  height,
  onAnnotationSave,
  onClose,
  id
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'draw' | 'text'>('draw');
  const color = '#ffcf33'; // Default: Amber highlight - removal of unused setter
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [noteText, setNoteText] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [notePosition, setNotePosition] = useState({ x: 0, y: 0 });

  const startDrawing = (e: React.MouseEvent) => {
    if (tool !== 'draw') return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    setIsDrawing(true);
    setCurrentPath([{ x: e.clientX - rect.left, y: e.clientY - rect.top }]);
  };

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing || tool !== 'draw') return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const newPath = [...currentPath, { x: e.clientX - rect.left, y: e.clientY - rect.top }];
    setCurrentPath(newPath);

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && newPath.length > 1) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(newPath[newPath.length - 2].x, newPath[newPath.length - 2].y);
      ctx.lineTo(newPath[newPath.length - 1].x, newPath[newPath.length - 1].y);
      ctx.stroke();
    }
  };

  const endDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    const newAnnotation: Annotation = {
      id: `ann-${Date.now()}`,
      type: 'draw',
      points: currentPath,
      color,
      frame: currentFrame
    };
    
    setAnnotations([...annotations, newAnnotation]);
    setCurrentPath([]);
    onAnnotationSave?.(newAnnotation);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (tool !== 'text') return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    setNotePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setIsAddingNote(true);
  };

  const saveNote = () => {
    if (!noteText) return;
    
    const newAnnotation: Annotation = {
      id: `ann-${Date.now()}`,
      type: 'text',
      text: noteText,
      color,
      frame: currentFrame
    };
    
    setAnnotations([...annotations, newAnnotation]);
    setNoteText('');
    setIsAddingNote(false);
    onAnnotationSave?.(newAnnotation);
  };

  const clearCanvas = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    ctx?.clearRect(0, 0, width, height);
    setAnnotations([]);
  }, [width, height]);

  // Redraw annotations for current frame
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    annotations.filter(a => a.frame === currentFrame).forEach(ann => {
      if (ann.type === 'draw' && ann.points && ann.points.length > 1) {
        ctx.strokeStyle = ann.color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(ann.points[0].x, ann.points[0].y);
        ann.points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();
      }
    });
  }, [annotations, currentFrame, width, height]);

  return (
    <div id={id} className="directorial-annotator relative w-full h-full pointer-events-none group">
      {/* Interactive Overlay Layer */}
      <canvas 
        ref={canvasRef}
        width={width}
        height={height}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={endDrawing}
        onClick={handleCanvasClick}
        className={`absolute top-0 left-0 w-full h-full pointer-events-auto cursor-crosshair z-10 transition-opacity ${
          tool === 'draw' ? 'bg-amber-500/5' : ''
        }`}
      />

      {/* Toolbar - Floating High-End UI */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 p-2 bg-slate-900 shadow-2xl rounded-2xl border border-slate-700/50 pointer-events-auto z-20 opacity-0 group-hover:opacity-100 transition-opacity">
         <button 
           onClick={() => setTool('draw')}
           title="Outil de dessin libre"
           className={`p-3 rounded-xl transition-all ${tool === 'draw' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
         >
           <PenTool className="w-4 h-4" />
         </button>
         <button 
           onClick={() => setTool('text')}
           title="Outil texte / note"
           className={`p-3 rounded-xl transition-all ${tool === 'text' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
         >
           <Type className="w-4 h-4" />
         </button>
         <div className="w-full h-px bg-slate-800" />
         <button 
           onClick={clearCanvas}
           title="Effacer toutes les annotations"
           className="p-3 rounded-xl text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-all"
         >
           <Trash2 className="w-4 h-4" />
         </button>
      </div>

      {/* Frame Status Overlay */}
      <div className="absolute top-4 right-4 p-2 px-3 bg-slate-900 border border-slate-800 rounded-xl pointer-events-auto z-20 flex items-center gap-4 shadow-2xl">
         <div className="flex items-center gap-2 pointer-events-none">
           <Zap className="w-3 h-3 text-amber-400 animate-pulse" />
           <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Review Mode Frame {currentFrame}</span>
         </div>
         {onClose && (
           <button 
             onClick={onClose}
             className="w-6 h-6 rounded-lg bg-slate-800 text-slate-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-slate-700"
             title="Fermer le mode révision"
           >
             <XCircle className="w-4 h-4" />
           </button>
         )}
      </div>

      {/* Note Input Popup */}
      {isAddingNote && (
        <div 
          ref={(el) => {
            if (el) {
              el.style.left = `${notePosition.x}px`;
              el.style.top = `${notePosition.y}px`;
            }
          }}
          className="absolute p-4 bg-slate-900 shadow-3xl rounded-2xl border border-slate-700 pointer-events-auto z-30 animate-in zoom-in slide-in-from-top-1/4"
        >
           <h4 className="text-[10px] uppercase font-black tracking-widest text-indigo-400 mb-3 block flex items-center gap-2">
             <MessageSquare className="w-3 h-3" /> Directorial Feedback
           </h4>
           <textarea 
             autoFocus
             value={noteText}
             onChange={(e) => setNoteText(e.target.value)}
             className="w-64 h-24 bg-slate-800 border-none rounded-xl text-sm p-4 text-white placeholder-slate-500 focus:ring-1 focus:ring-indigo-500"
             placeholder="Saisissez vos instructions de réalisation..."
           />
           <div className="flex justify-end gap-2 mt-4">
              <button 
                onClick={() => setIsAddingNote(false)}
                className="px-4 py-2 text-xs font-black text-slate-500 hover:text-white"
              >
                Annuler
              </button>
              <Button 
                onClick={saveNote}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-[10px] tracking-widest rounded-xl"
              >
                <Send className="w-3 h-3 mr-2" /> ENREGISTRER NOTE
              </Button>
           </div>
        </div>
      )}

      {/* Annotations List (Left Sidebar Style) */}
      <div className="absolute bottom-4 left-4 p-4 bg-slate-900 border border-slate-800 rounded-2xl pointer-events-auto max-w-sm z-20 opacity-90 backdrop-blur-md">
         <div className="flex items-center gap-2 mb-3">
             <Eye className="w-3 h-3 text-emerald-400" />
             <span className="text-[10px] font-black uppercase tracking-widest">Active Review Notes</span>
         </div>
         <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
            {annotations.filter(a => a.frame === currentFrame).map((ann) => (
              <div key={ann.id} className="p-2 px-3 bg-slate-800 rounded-lg flex items-start justify-between border-l-2 border-indigo-500">
                 <p className="text-[11px] text-slate-300 italic">{ann.type === 'draw' ? 'Annotation graphique' : ann.text}</p>
                  <button 
                    title="Supprimer cette note"
                    onClick={() => setAnnotations(prev => prev.filter(a => a.id !== ann.id))}
                    className="text-slate-600 hover:text-red-400 transition-colors ml-4"
                  >
                    <XCircle className="w-3 h-3" />
                  </button>
              </div>
            ))}
            {annotations.filter(a => a.frame === currentFrame).length === 0 && (
              <p className="text-[10px] text-slate-600 italic">Aucune note pour ce frame.</p>
            )}
         </div>
      </div>
    </div>
  );
};
