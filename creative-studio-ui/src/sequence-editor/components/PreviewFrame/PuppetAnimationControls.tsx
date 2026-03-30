import React, { useState, useCallback } from 'react';
import { 
  Plus, Trash2, Box, ChevronDown, ChevronUp, 
  Smile, Activity, Layers, Play, Settings2, 
  Move, Target, BrainCircuit, Zap, Sparkles
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import './puppetAnimationControls.css';

interface PuppetKeyframe {
  frame: number;
  pose: string;
  joints: Record<string, { x: number; y: number; z: number }>;
}

interface PuppetAnimationControlsProps {
  currentFrame: number;
  puppetId: string;
  onKeyframeAdd: (keyframe: PuppetKeyframe) => void;
  onKeyframeRemove: (frame: number) => void;
  keyframes: PuppetKeyframe[];
}

const POSE_PRESETS = {
  idle: { description: 'Neutral focus', icon: <Target className="w-3.5 h-3.5" /> },
  walking: { description: 'Locomotion cycle', icon: <Activity className="w-3.5 h-3.5" /> },
  running: { description: 'Active sprint', icon: <Zap className="w-3.5 h-3.5" /> },
  sitting: { description: 'Relaxed posture', icon: <Box className="w-3.5 h-3.5" /> },
  waving: { description: 'Gesture saluto', icon: <Smile className="w-3.5 h-3.5" /> },
  celebrating: { description: 'Success pose', icon: <Sparkles className="w-3.5 h-3.5" /> },
};

const ANIMATION_TEMPLATES = [
  { id: 'walk-cycle', name: 'Walk Cycle', icon: <Activity className="w-4 h-4 text-emerald-400" /> },
  { id: 'wave-hello', name: 'Wave Hello', icon: <Smile className="w-4 h-4 text-sky-400" /> },
  { id: 'smart-thinking', name: 'Smart Logic', icon: <BrainCircuit className="w-4 h-4 text-indigo-400" /> },
];

export const PuppetAnimationControls: React.FC<PuppetAnimationControlsProps> = ({
  currentFrame,
  puppetId,
  onKeyframeAdd,
  onKeyframeRemove,
  keyframes,
}) => {
  const [selectedPose, setSelectedPose] = useState<string>('idle');
  const [showTemplates, setShowTemplates] = useState(false);
  const [expressionIntensity, setExpressionIntensity] = useState(50);
  const [selectedExpression, setSelectedExpression] = useState<string>('neutral');
  
  const currentKeyframe = keyframes.find((kf) => kf.frame === currentFrame);
  
  const handleAddKeyframe = useCallback(() => {
    onKeyframeAdd({ frame: currentFrame, pose: selectedPose, joints: {} });
  }, [currentFrame, selectedPose, onKeyframeAdd]);

  return (
    <div className="puppet-controls-container glassmorphic-dark border-primary/20">
      <header className="controls-header">
        <div className="flex items-center gap-2">
          <Move className="w-4 h-4 text-primary" />
          <h3 className="text-[10px] font-black uppercase tracking-widest text-primary/80">Puppet Intel</h3>
        </div>
        <span className="text-[9px] font-mono opacity-40">ID: {puppetId.slice(0, 8)}</span>
      </header>
      
      <div className="controls-scroll-area">
        {/* Playback Focus */}
        <section className="control-card highlight">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[9px] font-bold uppercase text-white/40">Active Frame</span>
            <Badge className="bg-primary/20 text-primary border-primary/30 font-mono">{currentFrame}</Badge>
          </div>
          
          <button 
            className={`keyframe-main-btn ${currentKeyframe ? 'active' : ''}`}
            onClick={currentKeyframe ? () => onKeyframeRemove(currentFrame) : handleAddKeyframe}
          >
            {currentKeyframe ? <Trash2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>{currentKeyframe ? 'Drop Keyframe' : 'Capture Pose'}</span>
          </button>
        </section>

        {/* Pose Selection */}
        <section className="control-card">
          <label className="card-label">Biometric Pose</label>
          <div className="pose-grid">
            {Object.entries(POSE_PRESETS).map(([id, data]) => (
              <button 
                key={id}
                className={`pose-btn ${selectedPose === id ? 'selected' : ''}`}
                onClick={() => setSelectedPose(id)}
                title={(data as any).description}
              >
                <span className="icon-wrapper">{(data as any).icon}</span>
                <span className="label-text">{id}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Templates */}
        <section className="control-card">
          <div className="flex justify-between items-center">
            <label className="card-label">Neural Motifs</label>
            <button className="text-primary/60 hover:text-primary" onClick={() => setShowTemplates(!showTemplates)}>
               {showTemplates ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
          
          {showTemplates && (
            <div className="template-stack mt-2">
               {ANIMATION_TEMPLATES.map(t => (
                 <button key={t.id} className="template-pill group">
                   {t.icon}
                   <span>{t.name}</span>
                   <Play className="ml-auto w-2.5 h-2.5 opacity-0 group-hover:opacity-100" />
                 </button>
               ))}
            </div>
          )}
        </section>

        {/* Expressions */}
        <section className="control-card">
           <div className="flex items-center gap-2 mb-3">
             <Smile className="w-3 h-3 text-indigo-400" />
             <label className="card-label mb-0">Expression Engine</label>
           </div>
           
           <div className="flex gap-2 mb-3">
             {['neutral', 'happy', 'sad', 'angry'].map(exp => (
               <button 
                 key={exp}
                 className={`expression-chip ${selectedExpression === exp ? 'active' : ''}`}
                 onClick={() => setSelectedExpression(exp)}
               >
                 {exp[0].toUpperCase()}
               </button>
             ))}
           </div>

           <div className="intensity-slider-group">
              <div className="flex justify-between text-[8px] uppercase font-bold opacity-40 mb-1">
                <span>Weight</span>
                <span>{expressionIntensity}%</span>
              </div>
              <input 
                type="range" 
                className="intensity-slider"
                value={expressionIntensity}
                title="Adjust expression intensity"
                aria-label="Expression Engine Weight"
                onChange={(e) => setExpressionIntensity(parseInt(e.target.value))}
              />
           </div>
        </section>

        {/* Timeline Summary */}
        <section className="control-card last">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-3 h-3 text-amber-400" />
            <label className="card-label mb-0">Session Ledger ({keyframes.length})</label>
          </div>
          <div className="keyframes-summary-list">
             {keyframes.slice(-5).map(kf => (
               <div key={kf.frame} className="summary-item">
                 <span className="frame font-mono">F{kf.frame}</span>
                 <span className="pose">{kf.pose}</span>
                 {kf.frame === currentFrame && <div className="active-dot" />}
               </div>
             ))}
          </div>
        </section>
      </div>
      
      <footer className="controls-footer">
        <button className="settings-btn" title="Puppet Engine Settings"><Settings2 className="w-3.5 h-3.5" /></button>
        <div className="ml-auto flex items-center gap-1.5 opacity-40">
           <BrainCircuit className="w-3 h-3" />
           <span className="text-[8px] font-black uppercase">Auto-Sync Active</span>
        </div>
      </footer>
    </div>
  );
};

export default PuppetAnimationControls;
