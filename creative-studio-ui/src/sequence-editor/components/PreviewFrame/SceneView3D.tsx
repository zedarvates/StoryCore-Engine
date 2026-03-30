/**
 * 3D Scene View Component
 * 
 * WebGL-based 3D scene viewport for multi-puppet manipulation and orchestration.
 * Fully synchronized with Redux Timeline Ledger and Cinematic Composition metadata.
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector, useSelectedShot } from '../../store';
import { addKeyframe, removeKeyframe } from '../../store/slices/timelineSlice';
import { PuppetAnimationControls } from './PuppetAnimationControls';
import { FiberSceneView } from './FiberSceneView';
import { exportSceneToVideo, downloadExportedFile, generateExportFilename } from '../../services/sceneExportService';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { Users, Move3d, Download, Loader2 } from 'lucide-react';
import type { TimelineKeyframe } from '../../types';
import type { AudioTrack } from '@/types';
import './sceneView3D.css';
import './puppetAnimationControls.css';

// ============================================================================
// Interfaces
// ============================================================================

interface Camera {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  fov: number;
}

interface Joint {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  parent: string | null;
}

interface Puppet {
  id: string;
  name: string;
  path: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  joints: Joint[];
  pose: string;
}

interface Environment {
  type: 'studio' | 'outdoor' | 'indoor' | 'abstract';
  lighting: 'bright' | 'dim' | 'dramatic' | 'natural';
  props: Array<{
    id: string;
    type: string;
    position: { x: number; y: number; z: number };
  }>;
}

interface PuppetKeyframe {
  frame: number;
  pose: string;
  joints: Record<string, { x: number; y: number; z: number }>;
}

interface SceneView3DProps {
  width: number;
  height: number;
  currentFrame: number;
  onPuppetUpdate?: (puppetData: unknown) => void;
  activeDialogue?: AudioTrack | null;
}

// ============================================================================
// Component
// ============================================================================

export const SceneView3D: React.FC<SceneView3DProps> = ({
  width,
  height,
  currentFrame,
  activeDialogue,
}) => {
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const { selectedShot } = useSelectedShot();

  // 1. Core State
  const [activePuppetId, setActivePuppetId] = useState<string>('puppet-1');
  const [showAnimationControls, setShowAnimationControls] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const [camera, setCamera] = useState<Camera>({
    position: { x: 0, y: 1.5, z: 5 },
    rotation: { x: 0, y: 0, z: 0 },
    fov: 60,
  });
  
  const [environment, setEnvironment] = useState<Environment>({
    type: 'studio',
    lighting: 'bright',
    props: [],
  });
  
  const [posePresets] = useState([
    'idle', 'walking', 'running', 'sitting', 'waving', 'pointing', 'thinking', 'celebrating',
  ]);

  // Dynamic Puppet Initialization
  // Dynamic Puppet Initialization
  const [puppets, setPuppets] = useState<Puppet[]>([]);

  useEffect(() => {
    const composition = selectedShot?.composition;
    if (composition && composition.characterIds.length > 0) {
      const newPuppets: Puppet[] = composition.characterIds.map((charId: string, index: number) => ({
        id: charId,
        name: `Character ${index + 1}`,
        path: selectedShot?.rigPath || "C:\\storycore-engine\\assets\\characters\\ActionProtagonistGeneric\\ActionProtagonistGeneric.glb",
        position: { x: (index - (composition.characterIds.length - 1) / 2) * 2, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        pose: 'idle',
        joints: [],
      }));
      setPuppets(newPuppets);
      if (newPuppets.length > 0 && !newPuppets.find(p => p.id === activePuppetId)) {
        setActivePuppetId(newPuppets[0].id);
      }
    } else if (puppets.length === 0) {
      setPuppets([{
        id: 'puppet-1',
        name: 'Protagonist',
        path: "C:\\storycore-engine\\assets\\characters\\ActionProtagonistGeneric\\ActionProtagonistGeneric.glb",
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        pose: 'idle',
        joints: [],
      }]);
    }
  }, [selectedShot?.id]); // Use individual fields to avoid excessive re-runs

  // 2. Redux Integration
  const shotId = selectedShot?.id || 'default-shot';
  
  const puppetLayerId = useMemo(() => {
    return selectedShot?.layers?.find(l => l.type === 'keyframes')?.id || 'puppet-metadata-layer';
  }, [selectedShot]);

  const timelineKeyframes = useAppSelector(state => {
    const shot = state.timeline.shots.find(s => s.id === shotId);
    if (!shot) return [];
    const layer = shot.layers.find(l => l.id === puppetLayerId);
    if (!layer || !layer.animations) return [];
    return layer.animations[`puppet.${activePuppetId}.pose`] || layer.animations['puppet.pose'] || [];
  });

  const keyframes: PuppetKeyframe[] = useMemo(() => {
    const indexToPose = (index: number) => posePresets[Math.floor(index)] || 'idle';
    return timelineKeyframes.map(tk => ({
      frame: tk.time,
      pose: indexToPose(tk.value),
      joints: {}
    })).sort((a, b) => a.frame - b.frame);
  }, [timelineKeyframes, posePresets]);

  // 3. Functional Handlers
  const handlePoseChange = useCallback((pose: string) => {
    setPuppets((prev) =>
      prev.map((puppet) => puppet.id === activePuppetId ? { ...puppet, pose } : puppet)
    );
  }, [activePuppetId]);

  // Mouse interaction
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    setPuppets((prev) =>
      prev.map((puppet) =>
        puppet.id === activePuppetId
          ? {
            ...puppet,
            position: {
              ...puppet.position,
              x: puppet.position.x + deltaX * 0.02,
              y: puppet.position.y - deltaY * 0.02,
            },
          }
          : puppet
      )
    );
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging, activePuppetId, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Camera reset
  const handleCameraReset = useCallback(() => {
    setCamera({ position: { x: 0, y: 1.5, z: 5 }, rotation: { x: 0, y: 0, z: 0 }, fov: 60 });
  }, []);

  const handleCameraMove = useCallback((direction: string) => {
    setCamera((prev) => {
      const speed = 0.5;
      const newPos = { ...prev.position };
      if (direction === 'forward') newPos.z -= speed;
      if (direction === 'backward') newPos.z += speed;
      if (direction === 'left') newPos.x -= speed;
      if (direction === 'right') newPos.x += speed;
      if (direction === 'up') newPos.y -= speed;
      if (direction === 'down') newPos.y -= speed;
      return { ...prev, position: newPos };
    });
  }, []);

  // Redux-aware Keyframe handlers
  const handleKeyframeAdd = useCallback((keyframe: PuppetKeyframe) => {
    const poseIndex = posePresets.indexOf(keyframe.pose);
    const reduxKeyframe: TimelineKeyframe = {
      id: uuidv4(),
      time: keyframe.frame,
      value: poseIndex !== -1 ? poseIndex : 0,
      easing: 'linear'
    };
    dispatch(addKeyframe({ shotId, layerId: puppetLayerId, property: `puppet.${activePuppetId}.pose`, keyframe: reduxKeyframe }));
    toast({ title: 'Keyframe Added', description: `Recorded ${keyframe.pose} for active puppet at frame ${keyframe.frame}` });
  }, [dispatch, shotId, puppetLayerId, toast, posePresets, activePuppetId]);

  const handleKeyframeRemove = useCallback((frame: number) => {
    const target = timelineKeyframes.find(tk => tk.time === frame);
    if (target) {
      dispatch(removeKeyframe({ shotId, layerId: puppetLayerId, property: `puppet.${activePuppetId}.pose`, id: target.id }));
    }
  }, [dispatch, shotId, puppetLayerId, timelineKeyframes, activePuppetId]);

  // Dialogue Speaker Auto-Select
  useEffect(() => {
    if (activeDialogue?.metadata?.speaker) {
      const speakerId = activeDialogue.metadata.speaker as string;
      const found = puppets.find(p => p.id === speakerId || p.name === speakerId);
      if (found) setActivePuppetId(found.id);
    }
  }, [activeDialogue, puppets]);

  // Export Logic
  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);
    
    const blob = await exportSceneToVideo(
      puppets as any[],
      environment,
      keyframes,
      {
        format: 'mp4',
        resolution: { width: 1920, height: 1080 },
        fps: 24,
        quality: 'final',
        startFrame: 0,
        endFrame: 100 // Test duration
      },
      (p) => setExportProgress(p.percentage)
    );

    if (blob) {
      const filename = generateExportFilename('mp4', activePuppetId);
      downloadExportedFile(blob, filename);
      toast({ title: 'Export Complete', description: `Cinematic shot saved as ${filename}` });
    }
    setIsExporting(false);
  };

  // Voice & Event listeners
  useEffect(() => {
    const handleApplyPoseEvent = (e: Event) => {
      const { pose, characterId } = (e as CustomEvent).detail || {};
      if (pose) {
        if (characterId) setActivePuppetId(characterId);
        handlePoseChange(pose);
        toast({ title: 'Neural Motor Action', description: `Applying ${pose} pose` });
      }
    };

    const handleMovePuppetEvent = (e: Event) => {
      const { characterId, position } = (e as CustomEvent).detail || {};
      if (position) {
         setPuppets(prev => prev.map(p => p.id === (characterId || activePuppetId) ? { ...p, position } : p));
         toast({ title: 'Spatial Update', description: `Character repositioned via Neural Choreographer` });
      }
    };

    const handleLightingEvent = (e: Event) => {
      const lighting = (e as CustomEvent).detail?.lighting;
      if (lighting) {
        setEnvironment(prev => ({ ...prev, lighting }));
        toast({ title: 'Environment Shift', description: `Lighting set to ${lighting}` });
      }
    };

    const handleEnvironmentEvent = (e: Event) => {
      const type = (e as CustomEvent).detail?.type;
      if (type) {
        setEnvironment(prev => ({ ...prev, type }));
        toast({ title: 'Atmospheric Shift', description: `Environment changed to ${type}` });
      }
    };

    window.addEventListener('storycore:apply-puppet-pose', handleApplyPoseEvent);
    window.addEventListener('storycore:move-puppet', handleMovePuppetEvent);
    window.addEventListener('storycore:change-lighting', handleLightingEvent);
    window.addEventListener('storycore:change-environment', handleEnvironmentEvent);
    
    return () => {
      window.removeEventListener('storycore:apply-puppet-pose', handleApplyPoseEvent);
      window.removeEventListener('storycore:move-puppet', handleMovePuppetEvent);
      window.removeEventListener('storycore:change-lighting', handleLightingEvent);
      window.removeEventListener('storycore:change-environment', handleEnvironmentEvent);
    };
  }, [handlePoseChange, toast, activePuppetId]);

  // 4. Rendering logic
  return (
    <div className="scene-view-3d">
      <div 
        className="scene-canvas-wrapper"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <FiberSceneView
          puppets={puppets.map(p => ({
            id: p.id,
            path: p.path,
            position: p.position,
            rotation: p.rotation,
            pose: p.pose
          }))}
          skyboxPath="C:\\storycore-engine\\assets\\skyboxes\\skybox1.png"
          width={width}
          height={height}
          lighting={environment.lighting}
          cameraProps={camera}
          activeDialogue={activeDialogue}
        />
      </div>

      <div className="scene-view-overlay">
        <div className="overlay-left-stack">
           <button className="animation-toggle" onClick={() => setShowAnimationControls(!showAnimationControls)}>
             {showAnimationControls ? 'Hide Controls' : 'Show Controls'}
           </button>
           
           <div className="character-switcher glassmorphic-dark">
             <header className="flex items-center gap-1.5 mb-1 opacity-60">
                <Users className="w-2.5 h-2.5" />
                <span className="text-[8px] font-black uppercase tracking-tighter">Cast Staging</span>
             </header>
             <div className="flex gap-1">
               {puppets.map(p => (
                 <button 
                   key={p.id} 
                   className={`char-tab ${activePuppetId === p.id ? 'active' : ''}`}
                   onClick={() => setActivePuppetId(p.id)}
                 >
                   {p.name.split(' ')[1] || p.name[0]}
                 </button>
               ))}
             </div>
           </div>
        </div>

        <div className="choreography-status glassmorphic-dark">
           {isExporting ? <Loader2 className="w-3 h-3 text-primary animate-spin" /> : <Move3d className="w-3 h-3 text-primary animate-pulse" />}
           <div className="flex flex-col">
              <span className="text-[7px] uppercase opacity-40">{isExporting ? `Exporting ${Math.round(exportProgress)}%` : 'Directing'}</span>
              <span className="text-[9px] font-bold text-primary">{puppets.find(p => p.id === activePuppetId)?.name}</span>
           </div>
        </div>
      </div>

      {showAnimationControls && (
        <PuppetAnimationControls
          currentFrame={currentFrame}
          puppetId={activePuppetId}
          onKeyframeAdd={handleKeyframeAdd}
          onKeyframeRemove={handleKeyframeRemove}
          keyframes={keyframes}
        />
      )}

      <div className="scene-interface-grid">
          <div className="control-card">
            <label id="env-select-label">Environment</label>
            <select 
              value={environment.type} 
              title="Select Scene Environment"
              aria-labelledby="env-select-label"
              onChange={(e) => setEnvironment(prev => ({ ...prev, type: e.target.value as 'studio' | 'outdoor' | 'indoor' | 'abstract' }))}
            >
              <option value="studio">Studio</option>
              <option value="outdoor">Outdoor</option>
              <option value="indoor">Indoor</option>
              <option value="abstract">Abstract</option>
            </select>
          </div>
          
          <div className="control-card">
            <label id="light-select-label">Lighting</label>
            <select 
              value={environment.lighting} 
              title="Select Lighting Mood"
              aria-labelledby="light-select-label"
              onChange={(e) => setEnvironment(prev => ({ ...prev, lighting: e.target.value as 'bright' | 'dim' | 'dramatic' | 'natural' }))}
            >
              <option value="bright">Bright</option>
              <option value="dim">Dim</option>
              <option value="dramatic">Dramatic</option>
              <option value="natural">Natural</option>
            </select>
          </div>

          <div className="control-card">
             <label>Director</label>
             <button 
               className="export-btn shadow-primary/20" 
               onClick={handleExport}
               disabled={isExporting}
               title="Export Cinematic Render"
             >
               {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
               <span>Render Shot</span>
             </button>
          </div>

         <div className="control-card">
           <label>Camera</label>
           <div className="flex gap-1">
             <button onClick={() => handleCameraMove('forward')} title="Dolly In">In</button>
             <button onClick={() => handleCameraMove('backward')} title="Dolly Out">Out</button>
             <button onClick={handleCameraReset} title="Reset Camera">Reset</button>
           </div>
         </div>
      </div>
    </div>
  );
};

export default SceneView3D;
