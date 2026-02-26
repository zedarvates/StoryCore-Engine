import React, { useRef, useEffect, useState, useCallback } from 'react';

interface ColorWheelProps {
  label: string;
  value: [number, number, number]; // [r, g, b]
  onChange: (value: [number, number, number]) => void;
  onReset: () => void;
}

const ColorWheel: React.FC<ColorWheelProps> = ({ label, value, onChange, onReset }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Internal state for dragging
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });

  // Use derived position when not dragging, and internal state when dragging
  const pos = isDragging ? dragPos : { 
    x: value[0] - value[2], 
    y: value[1] - (value[0] + value[2]) / 2 
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const radius = rect.width / 2;

    let x = (e.clientX - rect.left - centerX) / radius;
    let y = (e.clientY - rect.top - centerY) / radius;

    // Constrain to circle
    const dist = Math.sqrt(x * x + y * y);
    if (dist > 1) {
      x /= dist;
      y /= dist;
    }

    setDragPos({ x, y });
    
    // Simple mapping to RGB adjustments
    const r = Math.max(0, 1 + x - y/2);
    const g = Math.max(0, 1 + y);
    const b = Math.max(0, 1 - x - y/2);
    
    onChange([r, g, b]);
  }, [onChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const mouseEvent = e.nativeEvent as MouseEvent;
    
    // Set initial drag pos from current value
    const initialX = value[0] - value[2];
    const initialY = value[1] - (value[0] + value[2]) / 2;
    setDragPos({ x: initialX, y: initialY });
    
    handleMouseMove(mouseEvent);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div className="flex flex-col items-center select-none">
      <div className="mb-2 flex justify-between w-full px-2">
         <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</span>
         <button 
           onClick={onReset}
           className="text-[10px] text-gray-600 hover:text-blue-500 transition-colors"
         >
           RESET
         </button>
      </div>

      <div 
        ref={containerRef}
        className="w-40 h-40 rounded-full border border-gray-800 relative shadow-inner bg-gradient-to-tr from-gray-900 to-black overflow-hidden cursor-crosshair"
        onMouseDown={handleMouseDown}
      >
        {/* Color Spectrum Background */}
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
            background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
            filter: 'blur(20px)'
        }}></div>
        
        {/* Crosshair lines */}
        <div className="absolute top-1/2 left-0 w-full h-px bg-gray-800/50"></div>
        <div className="absolute top-0 left-1/2 w-px h-full bg-gray-800/50"></div>

        {/* Pivot Point */}
        <div 
          className="absolute w-3 h-3 bg-white rounded-full border-2 border-black shadow-lg z-10"
          style={{
            left: `calc(50% + ${pos.x * 50}%)`,
            top: `calc(50% + ${pos.y * 50}%)`,
            transform: 'translate(-50%, -50%)',
            transition: isDragging ? 'none' : 'all 0.1s ease-out'
          }}
        ></div>

        {/* Value feedback circle */}
        <div className="absolute inset-2 rounded-full border border-white/5 pointer-events-none"></div>
      </div>

      <div className="mt-3 flex gap-4 w-full justify-center">
         <div className="flex flex-col items-center">
            <div className="text-[9px] text-gray-600 mb-1 uppercase tracking-tighter">RED-BLUE</div>
            <div className="text-[10px] font-mono text-gray-400">{pos.x.toFixed(2)}</div>
         </div>
         <div className="flex flex-col items-center">
            <div className="text-[9px] text-gray-600 mb-1 uppercase tracking-tighter">GREEN</div>
            <div className="text-[10px] font-mono text-gray-400">{pos.y.toFixed(2)}</div>
         </div>
      </div>
    </div>
  );
};

export default ColorWheel;
