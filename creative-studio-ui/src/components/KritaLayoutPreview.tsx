import { LegacyAny } from '@/types/legacy';
import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';

interface KritaLayer {
  name: string;
  image: string; // base64
  opacity: number;
  visible: boolean;
}

interface KritaLayoutPreviewProps {
  templatePath: string;
  narrativeContext?: string;
  className?: string;
  width?: number;
  height?: number;
}

export const KritaLayoutPreview: React.FC<KritaLayoutPreviewProps> = ({
  templatePath,
  narrativeContext,
  className = '',
  width = 320,
  height = 180,
}) => {
  const [layers, setLayers] = useState<KritaLayer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!templatePath) return;

    const fetchLayers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // templatePath might be relative to the project root, 
        // need to ensure it's absolute for the backend or correctly handled
        const fullPath = `C:/storycore-engine/${templatePath.replace(/\\/g, '/')}`;
        
        const response = await axios.get('http://localhost:8080/api/cine/krita/composition', {
          params: {
            path: fullPath,
            narrative_context: narrativeContext
          }
        });

        if (response.data?.composition) {
          setLayers(response.data.composition);
        }
      } catch (err: LegacyAny) {
        console.error('Failed to load Krita layers:', err);
        setError('Precept (KRA) not found or unreadable');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLayers();
  }, [templatePath, narrativeContext]);

  if (isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center bg-slate-900/5 rounded-lg border-2 border-dashed border-slate-200 ${className}`} style={{ width, height }}>
        <Loader2 className="h-6 w-6 text-blue-500 animate-spin mb-2" />
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Extracting Precept Layers...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center bg-red-50 rounded-lg border border-red-100 ${className}`} style={{ width, height }}>
        <AlertCircle className="h-5 w-5 text-red-500 mb-1" />
        <span className="text-[9px] font-bold text-red-400 uppercase text-center px-4 leading-tight">{error}</span>
        <span className="text-[8px] text-red-300 mt-1">{templatePath.split('/').pop()}</span>
      </div>
    );
  }

  return (
    <div 
      className={`relative bg-slate-200 rounded-lg overflow-hidden border border-slate-300 shadow-inner group ${className}`} 
      style={{ width, height }}
    >
      {/* Background Placeholder */}
      <div className="absolute inset-0 flex items-center justify-center opacity-10">
        <span className="text-[40px] font-black text-slate-800 rotate-12">KRA</span>
      </div>

      {/* Layer Stack */}
      {layers.map((layer, index) => (
        <img
          key={`${layer.name}-${index}`}
          src={layer.image}
          alt={layer.name}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity duration-500"
          style={{ 
            opacity: layer.visible ? layer.opacity / 255 : 0,
            zIndex: index 
          }}
        />
      ))}

      {/* Metadata Overlay */}
      <div className="absolute bottom-1 left-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[7px] text-white font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
        Artistic Precept Stack • {layers.length} Layers
      </div>
    </div>
  );
};

export default KritaLayoutPreview;
