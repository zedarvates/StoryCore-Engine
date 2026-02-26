import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useColorCorrectionStore } from '../../stores/colorCorrectionStore';
import { CurvePoint } from '../../types/color-correction';

const CurvesEditor: React.FC = () => {
  const { layers, selectedLayerId, updateLayer } = useColorCorrectionStore();
  const activeLayer = layers.find(l => l.id === selectedLayerId);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeCurve, setActiveCurve] = useState<number>(0); // 0: RGB, 1: R, 2: G, 3: B
  const [isDragging, setIsDragging] = useState<number | null>(null);

  const curves = useMemo(() => activeLayer?.adjustments.curves.rgb || [[], [], [], []], [activeLayer]);
  const displayPoints = useMemo(() => {
    const currentPoints = curves[activeCurve] || [];
    return currentPoints.length > 0 ? currentPoints : [{ x: 0, y: 0 }, { x: 1, y: 1 }];
  }, [curves, activeCurve]);

  const drawCurve = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(i * width / 4, 0);
      ctx.lineTo(i * width / 4, height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * height / 4);
      ctx.lineTo(width, i * height / 4);
      ctx.stroke();
    }

    // Curve
    const colors = ['#fff', '#f87171', '#4ade80', '#60a5fa'];
    ctx.strokeStyle = colors[activeCurve];
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const sorted = [...displayPoints].sort((a, b) => a.x - b.x);
    ctx.moveTo(sorted[0].x * width, (1 - sorted[0].y) * height);
    for (let i = 1; i < sorted.length; i++) {
        ctx.lineTo(sorted[i].x * width, (1 - sorted[i].y) * height);
    }
    ctx.stroke();

    // Points
    displayPoints.forEach((p, i) => {
      ctx.fillStyle = isDragging === i ? '#3b82f6' : '#fff';
      ctx.beginPath();
      ctx.arc(p.x * width, (1 - p.y) * height, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [displayPoints, activeCurve, isDragging]);

  useEffect(() => {
    drawCurve();
  }, [drawCurve]);

  if (!activeLayer) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width;
    const y = 1 - (e.clientY - rect.top) / rect.height;

    const threshold = 0.05;
    const index = displayPoints.findIndex(p => Math.abs(p.x - x) < threshold && Math.abs(p.y - y) < threshold);
    
    if (index !== -1) {
      setIsDragging(index);
    } else {
        const newPoints = [...displayPoints, { x, y }].sort((a, b) => a.x - b.x);
        const newCurves = [...curves];
        newCurves[activeCurve] = newPoints;
        updateLayer(activeLayer.id, {
            adjustments: {
                ...activeLayer.adjustments,
                curves: {
                    ...activeLayer.adjustments.curves,
                    rgb: newCurves as CurvePoint[][]
                }
            }
        });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging === null || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));

    const newPoints = [...displayPoints];
    newPoints[isDragging] = { x, y };
    
    const newCurves = [...curves];
    newCurves[activeCurve] = newPoints;
    
    updateLayer(activeLayer.id, {
        adjustments: {
            ...activeLayer.adjustments,
            curves: {
                ...activeLayer.adjustments.curves,
                rgb: newCurves as CurvePoint[][]
            }
        }
    });
  };

  const handleMouseUp = () => {
    setIsDragging(null);
  };

  return (
    <div className="h-full flex gap-6 px-4 py-2">
      <div className="flex flex-col gap-2 w-32">
        {['RGB', 'Red', 'Green', 'Blue'].map((label, i) => (
          <button
            key={label}
            className={`px-3 py-1.5 rounded text-xs font-medium text-left transition-colors ${activeCurve === i ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            onClick={() => setActiveCurve(i)}
          >
            {label}
          </button>
        ))}
        <div className="mt-auto">
            <button 
              className="w-full py-1.5 bg-gray-800 hover:bg-red-900/40 text-gray-400 hover:text-red-400 text-[10px] rounded transition-colors uppercase font-bold"
              onClick={() => {
                const newCurves = [...curves];
                newCurves[activeCurve] = [];
                updateLayer(activeLayer.id, {
                    adjustments: {
                        ...activeLayer.adjustments,
                        curves: {
                            ...activeLayer.adjustments.curves,
                            rgb: newCurves as CurvePoint[][]
                        }
                    }
                });
              }}
            >
              Reset Curve
            </button>
        </div>
      </div>

      <div className="flex-1 bg-black rounded border border-gray-800 relative overflow-hidden flex items-center justify-center p-4">
        <div className="absolute inset-0 opacity-10 flex items-end">
            {Array.from({ length: 100 }).map((_, i) => (
                <div key={i} className="flex-1 bg-white" style={{ height: `${Math.sin(i * 0.1) * 30 + 50}%` }}></div>
            ))}
        </div>

        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className="w-full h-full cursor-crosshair relative z-10"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
        
        <div className="absolute top-2 right-2 text-[10px] text-gray-600 font-mono">
           CUSTOM CURVES
        </div>
      </div>
      
      <div className="w-48 flex flex-col gap-4">
         <div className="p-3 bg-gray-900/50 rounded border border-gray-800">
            <span className="text-[10px] font-bold text-gray-500 uppercase block mb-2">Instructions</span>
            <ul className="text-[10px] text-gray-400 space-y-1 ml-4 list-disc">
               <li>Click on line to add points</li>
               <li>Drag points to adjust curve</li>
            </ul>
         </div>
      </div>
    </div>
  );
};

export default CurvesEditor;
