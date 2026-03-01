import React, { useState } from 'react';
import { 
  Clapperboard, 
  CheckCircle2, 
  Loader2, 
  ChevronRight, 
  Zap,
  Image as ImageIcon,
  Layers,
  Camera,
  Sun,
  Clock,
  SquareDashed,
  Type
} from 'lucide-react';
import { AnimationPresetsPanel } from '../AITools/AnimationPresetsPanel';
import { MagicMaskTool } from '../AITools/MagicMaskTool';
import { SubtitleEditor } from '../AITools/SubtitleEditor';
import { aiPerformanceService, JobStatus } from '@/services/aiPerformanceService';
import { automationService, AudioRhythmData, JLCutShot } from '@/services/automationService';
import { sequencePlanService, SequencePlanData } from '@/services/sequencePlanService';
import { useAppStore } from '@/stores/useAppStore';
import { useIdentityLockStore } from '@/stores/identityLockStore';
import { useThemeStore } from '@/stores/themeStore';
import { User, ShieldCheck, Music, Activity, Sliders, Scissors, Sparkles } from 'lucide-react';
import '@/styles/cinematic-assembler.css';

interface CinematicAssemblerProps {
  plan: SequencePlanData;
  onComplete?: () => void;
}

export const CinematicAssembler: React.FC<CinematicAssemblerProps> = ({ plan, onComplete }) => {
  const [processing, setProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [results, setResults] = useState<Array<{ id: string; original: string; enhanced: string; status: 'pending' | 'done' }>>([]);
  const [assembling, setAssembling] = useState(false);
  const [done, setDone] = useState(false);
  const [selectedIdentityId, setSelectedIdentityId] = useState<string | null>(null);
  const [rhythmData, setRhythmData] = useState<AudioRhythmData | null>(null);
  const [syncingRhythm, setSyncingRhythm] = useState(false);
  const [rhythmApplied, setRhythmApplied] = useState(false);
  const [smoothing, setSmoothing] = useState(false);
  const [smoothed, setSmoothed] = useState(false);
  const [activeTool, setActiveTool] = useState<'animation' | 'mask' | 'subtitles' | null>(null);
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
  const [currentJob, setCurrentJob] = useState<JobStatus | null>(null);

  // Get project context and identities
  const project = useAppStore(state => state.project);
  const identities = useIdentityLockStore(state => state.identities);
  const applyIdentity = useIdentityLockStore(state => state.applyIdentity);
  
  // Get current theme for theme-aware styling
  const theme = useThemeStore(state => state.theme);
  
  const visualStyle = project?.projectSetup?.visualStyle || 'Cinematic Realism';

  const handleEnhanceSequence = async () => {
    setProcessing(true);
    setCurrentStep(0);
    
    const initialResults = plan.shots.map(s => ({
      id: s.id,
      original: s.description || s.prompt || '',
      enhanced: '',
      status: 'pending' as const
    }));
    setResults(initialResults);

    // Track performance
    let jobId = '';
    try {
      const job = await aiPerformanceService.createJob("Enhancing cinematic sequence...");
      jobId = job.job_id;
      const status = await aiPerformanceService.getJobStatus(jobId);
      setCurrentJob(status);
    } catch (e) {
      console.warn("Performance tracking failed:", e);
    }

    try {
      for (let i = 0; i < plan.shots.length; i++) {
        setCurrentStep(i);
        const shot = plan.shots[i];
        
        // Update job progress
        if (jobId) {
          const progress = Math.round((i / plan.shots.length) * 100);
          await aiPerformanceService.updateJobProgress(jobId, progress, `Enhancing shot ${i + 1}/${plan.shots.length}`);
          const status = await aiPerformanceService.getJobStatus(jobId);
          setCurrentJob(status);
        }
        let enhanced = await automationService.enhanceCinematicVisualPrompt({
          narrative_description: shot.description || shot.prompt || '',
          visual_style: visualStyle,
          shot_type: (shot.metadata?.cameraAngle as string) || 'Wide Shot',
          camera_movement: (shot.metadata?.camera_movement as string) || 'Cinematic Pan',
          lighting_mood: (shot.metadata?.lighting as string) || 'Dusk High Contrast',
          characters: selectedIdentityId ? [identities.find(i => i.id === selectedIdentityId)?.name || 'Default Character'] : []
        });

        // If an identity is selected, apply the visual lock
        if (selectedIdentityId) {
          try {
            const identityPrompt = await applyIdentity(selectedIdentityId, enhanced);
            enhanced = identityPrompt;
          } catch (e) {
            console.warn("Failed to apply identity lock:", e);
          }
        }

        setResults(prev => prev.map((r, idx) => 
          idx === i ? { ...r, enhanced, status: 'done' } : r
        ));
      }
    } catch (err) {
      console.error("Enhancement failed:", err);
    } finally {
      if (jobId) {
        await aiPerformanceService.updateJobProgress(jobId, 100, "Enhancement completed");
        const status = await aiPerformanceService.getJobStatus(jobId);
        setCurrentJob(status);
        setTimeout(() => setCurrentJob(null), 3000);
      }
      setProcessing(false);
    }
  };

  const handleFinalAssemble = async () => {
    setAssembling(true);
    try {
      // 1. Update the plan with enhanced prompts
      const updatedShots = plan.shots.map((shot, idx) => ({
        ...shot,
        prompt: results[idx]?.enhanced || shot.prompt,
        generation: {
          ...shot.generation,
          prompt: results[idx]?.enhanced || shot.prompt || '',
          aiProvider: 'comfyui',
          model: 'flux-cinematic-v1'
        }
      }));

      await sequencePlanService.updateSequencePlan(plan.id, { 
        shots: updatedShots,
        metadata: { 
          ...plan.metadata,
          status: 'completed' 
        }
      });

      // 2. Trigger generation mock
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setDone(true);
      if (onComplete) onComplete();
    } catch (err) {
      console.error("Assembly failed:", err);
    } finally {
      setAssembling(false);
    }
  };

  const handleAnalyzeRhythm = async () => {
    setSyncingRhythm(true);
    try {
      const data = await automationService.analyzeAudioRhythm(project?.id || 'default', 'main_audio');
      setRhythmData(data);
    } catch (err) {
      console.error("Rhythm analysis failed:", err);
    } finally {
      setSyncingRhythm(false);
    }
  };

  const applyRhythmLock = async () => {
    if (!rhythmData) return;
    
    // Find major markers
    const majors = rhythmData.markers.filter(m => m.type === 'major');
    if (majors.length < 3) return;

    // Align shots to major markers
    const updatedShots = plan.shots.map((shot, idx) => {
      const startTime = majors[idx]?.time || (idx * 10);
      const nextTime = majors[idx + 1]?.time || startTime + 10;
      return {
        ...shot,
        duration: nextTime - startTime,
        position: idx
      };
    });

    try {
      await sequencePlanService.updateSequencePlan(plan.id, { shots: updatedShots });
      setRhythmApplied(true);
      // Update local plan if possible or just show toast
    } catch (e) {
      console.error("Sync failed:", e);
    }
  };

  const handleInvisibleEditing = async () => {
    setSmoothing(true);
    try {
      const jlShots: JLCutShot[] = plan.shots.map(s => ({
        id: s.id,
        duration: s.duration || 5.0
      }));

      const res = await automationService.applyInvisibleEditing(jlShots, 1.25, 'smart');
      
      const updatedShots = plan.shots.map((s, idx) => {
        const jl = res.shots[idx];
        return {
          ...s,
          metadata: {
            ...(s.metadata || {}),
            audio_offset: jl.audio_offset,
            audio_duration: jl.audio_duration
          }
        };
      });

      await sequencePlanService.updateSequencePlan(plan.id, { shots: updatedShots });
      setSmoothed(true);
    } catch (err) {
      console.error("Invisible editing failed:", err);
    } finally {
      setSmoothing(false);
    }
  };

  if (done) {
    return (
      <div className="cinematic-completion flex flex-col items-center justify-center p-12 text-center space-y-6 rounded-3xl">
        <div className="cinematic-completion-icon w-20 h-20 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold cinematic-title">Cinematic Assembly Ready</h2>
          <p className="cinematic-subtitle mt-2">The 3-act sequence has been technically enhanced and queued for generation.</p>
        </div>
        <button 
          onClick={() => setDone(false)}
          className="cinematic-btn-success px-8 py-3 font-bold rounded-xl transition-all"
        >
          VIEW IN TIMELINE
        </button>
      </div>
    );
  }

  return (
    <div className={`cinematic-assembler flex flex-col h-full overflow-hidden rounded-3xl`}>
      {/* Header */}
      <div className="cinematic-header p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="cinematic-header-icon p-2 rounded-lg">
            <Clapperboard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="cinematic-header-title text-lg font-bold">Cinematic Assembly Studio</h2>
            <p className="cinematic-header-subtitle text-[10px] uppercase tracking-widest font-bold">Phase 1: Visual Blueprinting</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {currentJob && (
            <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/20 rounded-full border border-indigo-500/30">
              <Clock className="w-3 h-3 text-indigo-400" />
              <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">{currentJob.status}: {currentJob.progress}%</span>
            </div>
          )}
          {theme === 'plasma-plex-neon' && (
            <span className="text-[9px] px-2 py-1 rounded-full bg-violet-500/20 text-violet-300 font-bold uppercase tracking-wider">
              Plasma Neon
            </span>
          )}
          <Zap className="w-5 h-5 text-amber-400 animate-pulse" />
        </div>
      </div>

      <div className="flex-1 p-6 space-y-8 overflow-y-auto">
        <div className="flex flex-col items-center gap-6 py-12">
          {!processing && results.length === 0 && (
            <div className="w-full max-w-xl space-y-8">
              <div className="text-center space-y-4">
                <h3 className="cinematic-title text-xl">Prêt pour l'assemblage visuel ?</h3>
                <p className="cinematic-subtitle text-sm leading-relaxed">
                  Le système va transformer vos descriptions narratives en prompts techniques haute-fidélité en utilisant le style <span className="cinematic-text-highlight">"{visualStyle}"</span> du projet.
                </p>
              </div>

              {/* Identity Casting Integration (P0) */}
              <div className="cinematic-card cinematic-identity-card p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 cinematic-text-highlight" />
                  <h4 className="text-xs font-bold uppercase tracking-wider cinematic-title">Identity Casting (P0 Consistency)</h4>
                </div>
                
                {identities.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {identities.map(idty => (
                      <button 
                        key={idty.id}
                        onClick={() => setSelectedIdentityId(selectedIdentityId === idty.id ? null : idty.id)}
                        className={`cinematic-identity-card p-3 rounded-xl text-left transition-all flex items-center gap-3 ${
                          selectedIdentityId === idty.id ? 'selected' : ''
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden flex-shrink-0 ring-2 ring-transparent transition-all">
                          {idty.visual_attributes.source_image_path ? (
                            <img src={idty.visual_attributes.source_image_path} alt={idty.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] font-bold cinematic-text-muted">?</div>
                          )}
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold cinematic-title truncate">{idty.name}</p>
                          <p className="text-[9px] cinematic-text-muted truncate">{idty.description}</p>
                        </div>
                        {selectedIdentityId === idty.id && <ShieldCheck className="w-4 h-4 cinematic-text-highlight ml-auto" />}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 cinematic-text-muted text-xs italic">
                    Aucun personnage identifié dans le Casting Module. 
                    <br/>La génération utilisera des descriptions génériques.
                  </div>
                )}
              </div>
              
              <button 
                onClick={handleEnhanceSequence}
                className="cinematic-btn-primary px-8 py-4 text-sm uppercase tracking-tighter flex items-center gap-3 mx-auto"
              >
                LANCER LE RAFFINEMENT CINÉMATIQUE <ChevronRight className="w-4 h-4" />
              </button>

              {/* Audio-Blueprint-First (P1) */}
              <div className="cinematic-card cinematic-audio-section p-6 mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-pink-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider cinematic-title">Audio-Blueprint-First (Rhythm Lock)</h4>
                  </div>
                  {rhythmData && (
                    <span className="text-[10px] px-2 py-0.5 bg-pink-500/20 text-pink-300 rounded-full font-bold">
                      {rhythmData.bpm} BPM DETECTED
                    </span>
                  )}
                </div>

                {!rhythmData ? (
                  <button 
                    onClick={handleAnalyzeRhythm}
                    disabled={syncingRhythm}
                    className="cinematic-btn-secondary w-full py-3 text-xs font-bold flex items-center justify-center gap-2"
                  >
                    {syncingRhythm ? <Activity className="w-4 h-4 animate-pulse" /> : <Sliders className="w-4 h-4" />}
                    GÉNÉRER L'EMPREINTE RYTHMIQUE
                  </button>
                ) : (
                  <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex gap-1 h-8 items-end">
                      {rhythmData.markers.slice(0, 48).map((m, i) => (
                        <div 
                          key={i} 
                          className={`cinematic-rhythm-bar flex-1 rounded-t ${m.type === 'major' ? 'major h-full' : 'minor h-1/2'}`}
                          title={`${m.time}s - ${m.type}`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] cinematic-text-muted italic">
                        {rhythmData.markers.filter(m => m.type === 'major').length} points de transition majeurs identifiés.
                      </p>
                      <button 
                        onClick={applyRhythmLock}
                        disabled={rhythmApplied}
                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                          rhythmApplied 
                            ? 'cinematic-btn-success cursor-default'
                            : 'cinematic-btn-accent active:scale-95'
                        }`}
                      >
                        {rhythmApplied ? 'RYTHME VERROUILLÉ' : 'VERROUILLER LE MONTAGE AU RYTHME'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Phase 8 Tools Integration */}
               <div className="grid grid-cols-3 gap-4 mt-4">
                <button 
                  onClick={() => setActiveTool(activeTool === 'animation' ? null : 'animation')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                    activeTool === 'animation' ? 'bg-violet-900/20 border-violet-500 text-violet-300' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Zap className="w-5 h-5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Motion VFX</span>
                </button>
                <button 
                  onClick={() => setActiveTool(activeTool === 'mask' ? null : 'mask')}
                   className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                    activeTool === 'mask' ? 'bg-indigo-900/20 border-indigo-500 text-indigo-300' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <SquareDashed className="w-5 h-5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Magic Mask</span>
                </button>
                <button 
                  onClick={() => setActiveTool(activeTool === 'subtitles' ? null : 'subtitles')}
                   className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                    activeTool === 'subtitles' ? 'bg-pink-900/20 border-pink-500 text-pink-300' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Type className="w-5 h-5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Auto Subtitles</span>
                </button>
              </div>

               {/* Active Tool View */}
              {activeTool && (
                <div className="cinematic-card p-6 border-violet-500/30 animate-in fade-in zoom-in-95 duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-black uppercase tracking-widest cinematic-title">
                      {activeTool === 'animation' ? 'Animation Presets Editor' : activeTool === 'mask' ? 'AI Subject Isolation (SAM)' : 'Cinematic Subtitle Forge'}
                    </h4>
                    <button onClick={() => setActiveTool(null)} className="text-[10px] font-bold text-slate-500 hover:text-white uppercase transition-colors">Close</button>
                  </div>
                  
                  {activeTool === 'animation' && (
                    <AnimationPresetsPanel 
                      inputPath={selectedShotId || "default_input.png"} 
                      onApply={(config) => console.log("Animation applied:", config)} 
                    />
                  )}
                  {activeTool === 'mask' && (
                    <MagicMaskTool 
                      inputPath={selectedShotId || "default_input.png"} 
                      onMaskGenerated={(res) => console.log("Mask generated:", res)} 
                    />
                  )}
                  {activeTool === 'subtitles' && (
                    <SubtitleEditor 
                      videoPath={selectedShotId || "default_video.mp4"} 
                      onSubtitlesApplied={(path) => console.log("Subtitles applied:", path)} 
                    />
                  )}
                </div>
              )}
              <div className={`cinematic-card cinematic-editing-section mt-4 p-6 ${smoothed ? 'completed' : ''}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${smoothed ? 'bg-emerald-500/20' : 'bg-indigo-500/20'}`}>
                      <Scissors className={`w-4 h-4 ${smoothed ? 'text-emerald-400' : 'text-indigo-400'}`} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest cinematic-title">Invisible Editing (J/L Cuts)</h4>
                      <p className="text-[10px] cinematic-text-muted">Fluidifier les transitions audio-visuelles</p>
                    </div>
                  </div>
                  {smoothed && (
                    <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                  )}
                </div>

                <button 
                  onClick={handleInvisibleEditing}
                  disabled={smoothing || smoothed}
                  className={`w-full py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    smoothed
                      ? 'cinematic-btn-success cursor-default'
                      : 'cinematic-btn-accent active:scale-95'
                  }`}
                >
                  {smoothing ? (
                    <Activity className="w-4 h-4 animate-spin" />
                  ) : smoothed ? (
                    'TRANSITIONS FLUIDIFIÉES x SMART-CUT'
                  ) : (
                    'APPLIQUER L\'OVERLAY AUTO-J/L'
                  )}
                </button>
              </div>
            </div>
          )}

        {/* Enhancement Progress */}
        {(processing || (results.length > 0 && !done)) && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              {results.map((res, idx) => (
                <div 
                  key={res.id} 
                  onClick={() => setSelectedShotId(res.id)}
                  className={`cinematic-step-indicator p-4 rounded-xl cursor-pointer transition-all ${
                    selectedShotId === res.id ? 'ring-2 ring-violet-500 bg-violet-900/10' : ''
                  } ${
                    idx === currentStep && processing ? 'active' : 
                    res.status === 'done' ? 'completed' : 'opacity-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="cinematic-step-number text-[10px] font-black w-5 h-5 flex items-center justify-center rounded">{idx + 1}</span>
                      <h4 className="text-xs font-bold uppercase cinematic-title">Acte {idx + 1}</h4>
                    </div>
                    {idx === currentStep && processing ? (
                      <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" />
                    ) : res.status === 'done' ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    ) : null}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase font-bold cinematic-text-muted">Narratif Original</p>
                      <p className="text-[11px] cinematic-text-muted line-clamp-2 italic">"{res.original}"</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase font-bold cinematic-text-highlight">Prompt Cinématique</p>
                      <p className="text-[11px] cinematic-title line-clamp-2">
                        {res.enhanced || "En attente de traitement..."}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {results.every(r => r.status === 'done') && !assembling && (
              <div className="cinematic-card p-6 bg-gradient-to-r from-indigo-600/30 to-violet-600/30 border-indigo-500/40 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
                <div>
                  <h4 className="font-bold cinematic-title">Assemblage Final Terminée</h4>
                  <p className="text-[11px] cinematic-subtitle">Prêt à envoyer les {plan.shots.length} plans vers le pipeline de génération ComfyUI.</p>
                </div>
                <button 
                  onClick={handleFinalAssemble}
                  className="cinematic-btn-primary px-6 py-3 text-xs uppercase active:scale-95"
                >
                  DÉMARRER LA PRODUCTION VISUELLE
                </button>
              </div>
            )}

            {assembling && (
              <div className="cinematic-loader p-12 flex flex-col items-center justify-center gap-4">
                <div className="relative">
                  <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                  <Clapperboard className="w-5 h-5 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="text-sm font-bold cinematic-title">Synchronisation des métadonnées et lancement ComfyUI...</p>
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Footer / Status Bar */}
      <div className="cinematic-status-bar p-4 flex items-center gap-6">
        <div className="cinematic-status-item flex items-center gap-2">
          <ImageIcon className="w-3 h-3" /> <span>FLUX.1-DEV</span>
        </div>
        <div className="cinematic-status-item flex items-center gap-2">
          <Layers className="w-3 h-3" /> <span>RESOLUTION: 1920x1080</span>
        </div>
        <div className="cinematic-status-item flex items-center gap-2">
          <Camera className="w-3 h-3" /> <span>LENS: ANAMORPHIC</span>
        </div>
        <div className="cinematic-status-item highlight flex items-center gap-2 ml-auto">
          <Sun className="w-3 h-3" /> <span>DYNAMIC LIGHTING ON</span>
        </div>
      </div>
    </div>
  );
};