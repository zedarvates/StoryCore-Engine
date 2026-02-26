import React, { useState, useEffect, useCallback } from 'react';
import styles from './ColorGradingPage.module.css';
import { 
  Maximize2, 
  Settings, 
  Undo2, 
  Redo2, 
  Play, 
  SkipBack, 
  SkipForward,
  Layers,
  Activity,
  Grid3X3,
  MousePointer2,
  Brush,
  Scissors,
  Save,
  Eye,
  EyeOff,
  Trash2
} from 'lucide-react';
import { useColorCorrectionStore } from '../../stores/colorCorrectionStore';
import ColorWheels from '../../components/ColorGrading/ColorWheels';
import QualifierControls from '../../components/ColorGrading/QualifierControls';
import CurvesEditor from '../../components/ColorGrading/CurvesEditor';
import PowerWindowsControls from '../../components/ColorGrading/PowerWindowsControls';
import ColorGradingGallery from '../../components/ColorGrading/ColorGradingGallery';
import { VoiceButton } from '../../components/ui/VoiceButton';
import { BASE_ADJUSTMENTS } from '../../constants/color-grading';

interface ScopesProps {
  mockData?: number[];
}

const SCOPE_FALLBACK_DATA = Array.from({ length: 50 }, (_, i) => Math.sin(i * 0.2) * 20 + 50);

const Scopes: React.FC<ScopesProps> = ({ mockData }) => {
  const data = mockData || SCOPE_FALLBACK_DATA;
  
  // Mock RGB data offset from base data
  const rData = data.map(v => Math.min(100, v * 1.1));
  const gData = data.map(v => v);
  const bData = data.map(v => Math.max(0, v * 0.9));

  return (
    <div className="h-full flex flex-col gap-2">
      <div className="flex-1 bg-black/80 border border-gray-800 rounded p-2 flex flex-col">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[9px] text-gray-500 uppercase font-bold tracking-tight">RGB Parade</span>
          <div className="flex gap-1">
             <div className="w-1.5 h-1.5 bg-red-500/50 rounded-full"></div>
             <div className="w-1.5 h-1.5 bg-green-500/50 rounded-full"></div>
             <div className="w-1.5 h-1.5 bg-blue-500/50 rounded-full"></div>
          </div>
        </div>
        <div className="flex-1 flex gap-px bg-gray-950 relative overflow-hidden border border-gray-900 rounded-sm">
          {/* R Channel */}
          <div className="flex-1 flex items-end opacity-60">
            {rData.slice(0, 16).map((val, i) => (
              <div key={`r-${i}`} className="flex-1 bg-red-500" style={{ height: `${val}%`, boxShadow: '0 0 2px rgba(239, 68, 68, 0.5)' }}></div>
            ))}
          </div>
          {/* G Channel */}
          <div className="flex-1 flex items-end opacity-60">
            {gData.slice(0, 16).map((val, i) => (
              <div key={`g-${i}`} className="flex-1 bg-green-500" style={{ height: `${val}%`, boxShadow: '0 0 2px rgba(34, 197, 94, 0.5)' }}></div>
            ))}
          </div>
          {/* B Channel */}
          <div className="flex-1 flex items-end opacity-60">
            {bData.slice(0, 16).map((val, i) => (
              <div key={`b-${i}`} className="flex-1 bg-blue-500" style={{ height: `${val}%`, boxShadow: '0 0 2px rgba(59, 130, 246, 0.5)' }}></div>
            ))}
          </div>
          
          {/* Grid Lines */}
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between">
             <div className="h-px w-full bg-white/5 border-t border-dashed border-white/10"></div>
             <div className="h-px w-full bg-white/5 border-t border-dashed border-white/10"></div>
             <div className="h-px w-full bg-white/5 border-t border-dashed border-white/10"></div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 bg-black/80 border border-gray-800 rounded p-2 flex flex-col">
        <span className="text-[9px] text-gray-500 mb-1 uppercase font-bold tracking-tight">Vectorscope</span>
        <div className="flex-1 flex items-center justify-center bg-gray-950 rounded-sm border border-gray-900 relative overflow-hidden">
          <div className="w-28 h-28 rounded-full border border-gray-800/50 relative">
            {/* Target Boxes */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2 h-2 border border-red-500/40" title="Red"></div>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-2 h-2 border border-cyan-500/40" title="Cyan"></div>
            <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 border border-blue-500/40" title="Blue"></div>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 border border-yellow-500/40" title="Yellow"></div>
            
            {/* Guides */}
            <div className="absolute inset-0 border border-gray-800/30 rounded-full scale-75"></div>
            <div className="absolute inset-0 border border-gray-800/20 rounded-full scale-50"></div>
            <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-800/40"></div>
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-800/40"></div>
            
            {/* Center Dot */}
            <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-white/80 rounded-full -translate-x-1/2 -translate-y-1/2 blur-[1px]"></div>
          </div>
          
          {/* Mock Trace */}
          <div className="absolute w-12 h-12 bg-white/10 rounded-full blur-xl animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};

const DEFAULT_ADJUSTMENTS = BASE_ADJUSTMENTS;

const ColorGradingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'wheels' | 'curves' | 'qualifier' | 'windows'>('wheels');
  const { 
    layers, 
    selectedLayerId, 
    selectLayer, 
    addLayer, 
    isPickingColor, 
    setIsPickingColor,
    compareMode,
    setCompareMode,
    beforeAfterView,
    setBeforeAfterView,
    setPresets,
    sampledColor,
    setSampledColor,
    updateLayer,
    removeLayer
  } = useColorCorrectionStore();

  useEffect(() => {
    // Initialize presets
    import('../../constants/color-grading').then(m => {
       setPresets(m.DEFAULT_PRESETS);
    });
  }, [setPresets]);

  useEffect(() => {
    // Add default layer if none exists
    if (layers.length === 0) {
      addLayer({
        id: 'node-1',
        name: 'Correction 1',
        isEnabled: true,
        blendMode: 'normal',
        opacity: 100,
        order: 0,
        adjustments: DEFAULT_ADJUSTMENTS
      });
      selectLayer('node-1');
    }
  }, [addLayer, layers.length, selectLayer]);

  const getFilterStyle = useCallback(() => {
    if (beforeAfterView) return {};

    // Combine filters from all enabled layers in order
    const allFilters = layers
      .filter(l => l.isEnabled)
      .map(l => {
        const adj = l.adjustments;
        return [
          `brightness(${100 + (adj.exposure * 50) + (adj.gain[0] + adj.gain[1] + adj.gain[2]) * 10}%)`,
          `contrast(${adj.contrast * 100}%)`,
          `saturate(${adj.saturation * 100}%)`,
          `hue-rotate(${adj.temperature * 0.5}deg)`,
          `sepia(${adj.temperature > 0 ? adj.temperature / 100 : 0})`,
        ].join(' ');
      })
      .join(' ');

    return { filter: allFilters };
  }, [layers, beforeAfterView]);

  return (
    <div className={styles.colorGradingPage}>
      {/* Header */}
      <header className={styles.header}>
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-blue-500">StoryCore <span className="text-white font-normal">Color</span></h1>
          <div className="h-6 w-px bg-gray-700 mx-2"></div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>Project: Sci-Fi Short</span>
            <span>/</span>
            <span className="text-gray-200">Scene 01_Shot 04</span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-px bg-gray-800 rounded p-0.5">
            <button 
              className={`p-1.5 rounded transition-colors ${compareMode ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
              onClick={() => setCompareMode(!compareMode)}
              title="Compare Mode"
            >
              <Grid3X3 size={16} />
            </button>
            <button 
              className={`p-1.5 rounded transition-colors ${beforeAfterView ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
              onClick={() => setBeforeAfterView(!beforeAfterView)}
              title="Before/After"
            >
              <Maximize2 size={16} />
            </button>
          </div>
          <div className="flex items-center gap-px bg-gray-800 rounded p-0.5">
            <button className="p-1.5 hover:bg-gray-700 rounded text-gray-400" title="Undo"><Undo2 size={16} /></button>
            <button className="p-1.5 hover:bg-gray-700 rounded text-gray-400" title="Redo"><Redo2 size={16} /></button>
          </div>
          <button className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium flex items-center gap-2">
            <Save size={16} /> Export Grade
          </button>
          <button className="p-2 text-gray-400 hover:text-white"><Settings size={20} /></button>
          <div className="h-6 w-px bg-gray-700 mx-2"></div>
          <VoiceButton size="sm" />
        </div>
      </header>

      {/* Left Sidebar - Media Pool / Gallery */}
      <aside className={styles.leftSidebar}>
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Gallery</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <ColorGradingGallery />
        </div>
      </aside>

      {/* Main Viewer */}
      <main className={styles.mainViewer}>
        <div className="w-full h-full flex flex-col">
          <div 
            className={`flex-1 relative group bg-black flex items-center justify-center ${isPickingColor ? 'cursor-crosshair' : ''}`}
            onClick={() => {
              if (isPickingColor) {
                // Mock color sampling - in a real app would use canvas pixel data
                const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
                const randomColor = colors[Math.floor(Math.random() * colors.length)];
                setSampledColor(randomColor);
                setIsPickingColor(false);
              }
            }}
          >
             <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
               {/* Mock Cinematic Image for Feedback */}
               <img 
                 src="https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1200&auto=format&fit=crop" 
                 alt="Cinema Preview" 
                 className="w-full h-full object-cover transition-all duration-300"
                 style={getFilterStyle()}
               />
               
               <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                 <div className="text-white/50 text-6xl font-thin tracking-widest uppercase opacity-20 select-none">Preview</div>
               </div>

               {isPickingColor && (
                 <div className="absolute inset-0 bg-blue-500/10 backdrop-blur-[1px] flex items-center justify-center">
                    <div className="bg-black/80 px-4 py-2 rounded-full border border-blue-500/50 text-blue-400 text-sm animate-pulse">
                       Click to sample color
                    </div>
                 </div>
               )}
             </div>
             
             {sampledColor && (
               <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-full border border-white/10 text-[10px] text-white">
                  <span>Sampled:</span>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: sampledColor }}></div>
                  <button onClick={(e) => { e.stopPropagation(); setSampledColor(null); }} className="hover:text-red-400">✕</button>
               </div>
             )}
             
             {/* Overlay Controls */}
             <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="text-gray-300 hover:text-white"><SkipBack size={20} /></button>
                <button className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform"><Play size={24} fill="black" /></button>
                <button className="text-gray-300 hover:text-white"><SkipForward size={20} /></button>
             </div>
             
             <div className="absolute top-4 right-4 flex flex-col gap-2">
                <button className="p-2 bg-black/40 hover:bg-black/80 rounded text-white border border-white/10"><Maximize2 size={18} /></button>
                <button className="p-2 bg-black/40 hover:bg-black/80 rounded text-white border border-white/10"><Grid3X3 size={18} /></button>
             </div>
          </div>
          
          <div className={styles.thumbnailGallery}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={`flex-shrink-0 w-32 rounded border ${i === 3 ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-800'} overflow-hidden relative`}>
                <div className="absolute top-1 left-1 bg-black/60 px-1.5 rounded text-[10px]">{i + 1}</div>
                {i === 3 && <div className="absolute inset-0 bg-blue-500/10"></div>}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Right Sidebar - Node Graph / Scopes */}
      <aside className={styles.rightSidebar}>
        <div className="flex border-b border-gray-800">
          <button className="flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 border-blue-500 text-white flex items-center justify-center gap-2">
            <Layers size={14} /> Nodes
          </button>
          <button className="flex-1 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-gray-300 flex items-center justify-center gap-2">
            <Activity size={14} /> Scopes
          </button>
        </div>
        
        <div className={styles.scopesContainer}>
             <Scopes />
        </div>

        <div className="p-4 border-t border-gray-800">
          <span className="text-[10px] text-gray-500 font-bold uppercase mb-4 block">Correction Stack</span>
          <div className="space-y-2">
            {layers.map((layer, index) => (
              <div 
                key={layer.id} 
                className={`${styles.nodeItem} ${selectedLayerId === layer.id ? 'border-blue-500 bg-gray-800/80 shadow-[0_0_12px_rgba(59,130,246,0.2)]' : 'border-gray-800 opacity-80'} group relative`}
                onClick={() => selectLayer(layer.id)}
              >
                <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center text-[10px] font-bold transition-colors ${selectedLayerId === layer.id ? 'bg-blue-600' : 'bg-gray-800'}`}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0 ml-3">
                  <div className={`text-xs font-medium truncate ${selectedLayerId === layer.id ? 'text-white' : 'text-gray-400'}`}>{layer.name}</div>
                  <div className="text-[9px] text-gray-500 uppercase tracking-tighter">Serial Node</div>
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    className={`p-1 rounded hover:bg-gray-700 ${layer.isEnabled ? 'text-blue-400' : 'text-gray-600'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      updateLayer(layer.id, { isEnabled: !layer.isEnabled });
                    }}
                    title={layer.isEnabled ? 'Disable Layer' : 'Enable Layer'}
                  >
                    {layer.isEnabled ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button 
                    className="p-1 rounded hover:bg-red-900/40 text-gray-600 hover:text-red-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (layers.length > 1) removeLayer(layer.id);
                    }}
                    title="Remove Layer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {!layer.isEnabled && (
                  <div className="absolute inset-0 bg-black/40 backdrop-grayscale pointer-events-none rounded"></div>
                )}
              </div>
            ))}
          </div>
          <button 
            className="w-full mt-4 py-2 border border-dashed border-gray-700 rounded text-xs text-gray-500 hover:border-gray-500 hover:text-gray-300 transition-colors"
            onClick={() => addLayer({
                id: `node-${Date.now()}`,
                name: `Node ${layers.length + 1}`,
                isEnabled: true,
                blendMode: 'normal',
                opacity: 100,
                order: layers.length,
                adjustments: DEFAULT_ADJUSTMENTS
            })}
          >
            + Add Serial Node
          </button>
        </div>
      </aside>

      {/* Bottom Panel - Controls */}
      <footer className={styles.bottomPanel}>
        <div className={styles.panelTabs}>
          <div 
            className={`${styles.tab} ${activeTab === 'wheels' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('wheels')}
          >
            Color Wheels
          </div>
          <div 
            className={`${styles.tab} ${activeTab === 'curves' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('curves')}
          >
            Curves
          </div>
          <div 
            className={`${styles.tab} ${activeTab === 'qualifier' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('qualifier')}
          >
            Qualifier
          </div>
          <div 
            className={`${styles.tab} ${activeTab === 'windows' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('windows')}
          >
            Windows
          </div>
          
          <div className="flex-1"></div>
          
          <div className="flex items-center px-4 gap-2 border-l border-gray-800">
             <button className="p-1.5 text-gray-500 hover:text-blue-500"><MousePointer2 size={16} /></button>
             <button className="p-1.5 text-gray-500 hover:text-blue-500"><Brush size={16} /></button>
             <button className="p-1.5 text-gray-500 hover:text-blue-500"><Scissors size={16} /></button>
          </div>
        </div>
        
        <div className={styles.controlsContent}>
          {activeTab === 'wheels' && <ColorWheels />}
          {activeTab === 'curves' && <CurvesEditor />}
          {activeTab === 'qualifier' && <QualifierControls />}
          {activeTab === 'windows' && <PowerWindowsControls />}
        </div>
      </footer>
    </div>
  );
};

export default ColorGradingPage;
