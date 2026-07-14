/**
 * CinematicAssembler Component
 * 
 * Final orchestrator for Phase 4-8: Cinematic Polish, Lip-Sync, and Production Mastering.
 */
import { LegacyAny } from '@/types/legacy';


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
  SquareDashed,
  Type,
  Activity,
  User, 
  ShieldCheck, 
  Music, 
  Mic2,
  Sliders, 
  Scissors, 
  Sparkles
} from 'lucide-react';
import { MagicMaskTool } from '../AITools/MagicMaskTool';
import { SubtitleEditor } from '../AITools/SubtitleEditor';
import { AtmosphericGradingStudio } from '../AITools/AtmosphericGradingStudio';
import { MotionVFXPresets } from '../AITools/MotionVFXPresets';
import { AIFoleyStudio } from '../AITools/AIFoleyStudio';
import { DialogueMasterStudio } from '../AITools/DialogueMasterStudio';
import { SonicMasterStudio } from '../audio/SonicMasterStudio';
import { NeuralOrchestrationMaster } from '../NeuralOrchestrationMaster';
import { SmartMasterRender } from '../export/SmartMasterRender';
import { StudioPackager } from '../StudioPackager';
import { automationService, AudioRhythmData } from '@/services/automationService';
import { sequencePlanService, SequencePlanData } from '@/services/sequencePlanService';
import { useAppStore } from '@/stores/useAppStore';
import { useThemeStore } from '@/stores/themeStore';
import { DirectorialAnnotator, type Annotation } from '../DirectorialAnnotator/DirectorialAnnotator';
import { collaborativeReviewService, type CollaborationSession } from '@/services/CollaborativeReviewService';
import '@/styles/cinematic-assembler.css';
// import './CinematicAssembler.css';

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
  const [activeTab, setActiveTab] = useState<'blueprint' | 'mastering'>('blueprint');
  const [reviewMode, setReviewMode] = useState(false);
  const [currentFrame, _setCurrentFrame] = useState(1);
  const [rhythmData, setRhythmData] = useState<AudioRhythmData | null>(null);
  const [syncingRhythm, setSyncingRhythm] = useState(false);
  const [rhythmApplied, setRhythmApplied] = useState(false);
  const [smoothing, setSmoothing] = useState(false);
  const [smoothed, setSmoothed] = useState(false);
  const [activeTool, setActiveTool] = useState<'animation' | 'mask' | 'subtitles' | 'grading' | 'foley' | 'dialogue' | 'sonic' | null>(null);
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
  const [collaborationSession, setCollaborationSession] = useState<CollaborationSession | null>(null);
  const [isHosting, setIsHosting] = useState(false);

  const theme = useThemeStore((state: { theme: string }) => state.theme);
  const identities = useAppStore((state) => state.characters || []);
  const project = useAppStore((state) => state.project);
  const visualStyle = project?.moodboard?.visualStyle?.artStyle || 'Cinematic';

  const handleEnhanceSequence = async () => {
    setProcessing(true);
    setCurrentStep(0);
    
    // Step-by-step enhancement simulation
    const newResults = plan.shots.map(shot => ({
      id: shot.id,
      original: shot.description || "",
      enhanced: '',
      status: 'pending' as const
    }));
    setResults(newResults);

    for (let i = 0; i < plan.shots.length; i++) {
      setCurrentStep(i);
      // Simulate API call to LLM for prompt enhancement
      const description = plan.shots[i].description || "";
      const enhanced = await sequencePlanService.enhanceShotPrompt(description, visualStyle as string);
      
      setResults(prev => prev.map((res, idx) => 
        idx === i ? { ...res, enhanced, status: 'done' as const } : res
      ));
    }
    
    setProcessing(false);
  };

  const handleGPUPreview = async () => {
     // Trigger GPU previews for all enhanced shots
     console.log("Generating GPU Previews...");
  };

  const handleAnalyzeRhythm = async () => {
    setSyncingRhythm(true);
    try {
      const data = await automationService.analyzeAudioRhythm("temp_audio.mp3", plan.id || "SC-AUDIO-MASTER");
      setRhythmData(data);
    } finally {
      setSyncingRhythm(false);
    }
  };

  const applyRhythmLock = () => {
    setRhythmApplied(true);
  };

  const handleInvisibleEditing = async () => {
    setSmoothing(true);
    try {
      // Simulate J/L Cut generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      setSmoothed(true);
    } finally {
      setSmoothing(false);
    }
  };

  const handleFinalAssemble = async () => {
    setAssembling(true);
    // Final assembly logic with HighBandwidthFrameAssembler
    setTimeout(() => {
      setAssembling(false);
      setDone(true);
      onComplete?.();
    }, 3000);
  };

  const handleStartCollaboration = async () => {
    setIsHosting(true);
    await collaborativeReviewService.createSession(plan.id || "STORYCORE-1");
    setCollaborationSession(collaborativeReviewService.getSession());
    setIsHosting(false);
  };

  return (
    <div className={`cinematic-assembler-studio w-full h-full flex flex-col bg-slate-950 text-white ${theme}`}>
      {/* Header / Tabs */}
      <div className="cinematic-header p-6 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/20">
            <Clapperboard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="cinematic-header-title text-lg font-bold">Cinematic Assembly Studio</h2>
            <p className="cinematic-header-subtitle text-[10px] uppercase tracking-widest font-bold">Phase 1-8: Directorial Orchestration</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 mr-4">
             <button 
               onClick={() => setActiveTab('blueprint')}
               title="Vue Blueprint"
               className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'blueprint' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
             >
               Blueprint
             </button>
             <button 
               onClick={() => setActiveTab('mastering')}
               title="Vue Mastering"
               className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'mastering' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
             >
               Mastering
             </button>
          </div>
          {theme === 'plasma-plex-neon' && (
            <span className="text-[9px] px-2 py-1 rounded-full bg-violet-500/20 text-violet-300 font-bold uppercase tracking-wider">
              Plasma Neon
            </span>
          )}
          <Zap className="w-5 h-5 text-amber-400 animate-pulse" />
        </div>
      </div>

      <div className="flex-1 p-6 space-y-8 overflow-y-auto">
        {activeTab === 'blueprint' ? (
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
                      {identities.map((char: LegacyAny) => (
                        <button 
                          key={char.id}
                          title={`Sélectionner l'identité de ${char.name}`}
                          onClick={() => setSelectedIdentityId(selectedIdentityId === char.id ? null : char.id)}
                          className={`cinematic-identity-card p-3 rounded-xl text-left transition-all flex items-center gap-3 ${
                            selectedIdentityId === char.id ? 'selected' : ''
                          }`}
                        >
                          <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden flex-shrink-0 ring-2 ring-transparent transition-all">
                            {char.visual_attributes?.source_image_path ? (
                              <img src={char.visual_attributes.source_image_path} alt={char.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] font-bold cinematic-text-muted">?</div>
                            )}
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-xs font-bold cinematic-title truncate">{char.name}</p>
                            <p className="text-[9px] cinematic-text-muted truncate">{char.description}</p>
                          </div>
                          {selectedIdentityId === char.id && <ShieldCheck className="w-4 h-4 cinematic-text-highlight ml-auto" />}
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

                {results.length > 0 && (
                  <button 
                    onClick={handleGPUPreview}
                    className="cinematic-btn-accent px-8 py-4 text-sm uppercase tracking-tighter flex items-center gap-3 mx-auto mt-4"
                  >
                    GÉNÉRER PREVIEW GPU <Zap className="w-4 h-4" />
                  </button>
                )}

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
                      title="Générer l'empreinte rythmique audio"
                      disabled={syncingRhythm}
                      className="cinematic-btn-secondary w-full py-3 text-xs font-bold flex items-center justify-center gap-2"
                    >
                      {syncingRhythm ? <Activity className="w-4 h-4 animate-pulse" /> : <Sliders className="w-4 h-4" />}
                      GÉNÉRER L'EMPREINTE RYTHMIQUE
                    </button>
                  ) : (
                    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                      <div className="flex gap-1 h-8 items-end">
                        {rhythmData.markers.slice(0, 48).map((m: { time: number; type: string }, i: number) => (
                          <div 
                            key={i} 
                            className={`cinematic-rhythm-bar flex-1 rounded-t ${m.type === 'major' ? 'major h-full' : 'minor h-1/2'}`}
                            title={`${m.time}s - ${m.type}`}
                          />
                        ))}
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] cinematic-text-muted italic">
                          {rhythmData.markers.filter((m: { type: string }) => m.type === 'major').length} points de transition majeurs identifiés.
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
                 <div className="grid grid-cols-7 gap-4 mt-4">
                  <button 
                    onClick={() => setActiveTool(activeTool === 'animation' ? null : 'animation')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                      activeTool === 'animation' ? 'bg-violet-900/20 border-violet-500 text-violet-300' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <Zap className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-center">Motion VFX</span>
                  </button>
                  <button 
                    onClick={() => setActiveTool(activeTool === 'mask' ? null : 'mask')}
                     className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                      activeTool === 'mask' ? 'bg-indigo-900/20 border-indigo-500 text-indigo-300' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <SquareDashed className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-center">Magic Mask</span>
                  </button>
                  <button 
                    onClick={() => setActiveTool(activeTool === 'subtitles' ? null : 'subtitles')}
                     className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                      activeTool === 'subtitles' ? 'bg-pink-900/20 border-pink-500 text-pink-300' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <Type className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-center">Auto Subtitles</span>
                  </button>
                   <button 
                    onClick={() => setActiveTool(activeTool === 'grading' ? null : 'grading')}
                     className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                      activeTool === 'grading' ? 'bg-amber-900/20 border-amber-500 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <Sun className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-center">Atmos Grading</span>
                  </button>
                  <button 
                    onClick={() => setActiveTool(activeTool === 'foley' ? null : 'foley')}
                     className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                      activeTool === 'foley' ? 'bg-emerald-900/20 border-emerald-500 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <Mic2 className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-center">AI Foley</span>
                  </button>
                  <button 
                    onClick={() => setActiveTool(activeTool === 'dialogue' ? null : 'dialogue')}
                     className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                      activeTool === 'dialogue' ? 'bg-amber-900/20 border-amber-500 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <User className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-center">Dialogue Master</span>
                  </button>
                  <button 
                    onClick={() => setActiveTool(activeTool === 'sonic' ? null : 'sonic')}
                     className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                      activeTool === 'sonic' ? 'bg-violet-900/20 border-violet-500 text-violet-300' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <Layers className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-center">Sonic Master</span>
                  </button>
                </div>

                 {/* Active Tool View */}
                {activeTool && (
                  <div className="cinematic-card p-6 border-violet-500/30 animate-in fade-in zoom-in-95 duration-300 w-full max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xs font-black uppercase tracking-widest cinematic-title">
                        {activeTool === 'animation' ? 'Animation Presets Editor' : activeTool === 'mask' ? 'AI Subject Isolation (SAM)' : activeTool === 'subtitles' ? 'Cinematic Subtitle Forge' : activeTool === 'grading' ? 'Atmospheric Grading Studio' : activeTool === 'foley' ? 'AI Foley Studio' : activeTool === 'dialogue' ? 'Dialogue Master Studio' : 'Sonic Master Studio'}
                      </h4>
                      <button onClick={() => setActiveTool(null)} className="text-[10px] font-bold text-slate-500 hover:text-white uppercase transition-colors">Close</button>
                    </div>
                    
                    {activeTool === 'animation' && (
                      <MotionVFXPresets 
                        onApply={(config) => console.log("Motion VFX applied:", config)} 
                      />
                    )}
                    {activeTool === 'mask' && (
                      <MagicMaskTool 
                        inputPath={results.find(r => r.id === selectedShotId)?.enhanced || results[0]?.enhanced || "default_input.png"} 
                        onMaskGenerated={(res) => console.log("Mask generated:", res)} 
                      />
                    )}
                    {activeTool === 'subtitles' && (
                      <SubtitleEditor 
                        videoPath={selectedShotId || "default_video.mp4"} 
                        onSubtitlesApplied={(path) => console.log("Subtitles applied:", path)} 
                      />
                    )}
                    {activeTool === 'grading' && (
                      <AtmosphericGradingStudio 
                        previewImage={results.find(r => r.id === selectedShotId)?.enhanced || results[0]?.enhanced}
                        onApply={(config) => console.log("Grading applied:", config)} 
                      />
                    )}
                    {activeTool === 'foley' && (
                      <AIFoleyStudio 
                        sceneDescription={results.find(r => r.id === selectedShotId)?.original || "Aucune description de scène."}
                        onApply={(config) => console.log("Foley applied:", config)} 
                      />
                    )}
                    {activeTool === 'dialogue' && (
                      <DialogueMasterStudio 
                        characters={identities.map((c: LegacyAny) => ({ id: c.character_id, name: c.name, role: c.role?.archetype || 'Character' }))}
                        selectedCharacterId={selectedIdentityId || undefined}
                        onApply={(config) => console.log("Dialogue applied:", config)} 
                      />
                    )}
                    {activeTool === 'sonic' && (
                      <SonicMasterStudio />
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
            <div className="space-y-6 w-full max-w-xl mx-auto">
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
        ) : (
          <div className="mastering-view space-y-12 animate-in fade-in slide-in-from-right-4 duration-500 max-w-6xl mx-auto">
             {/* Neural Orchestration Master Centerpiece */}
             <NeuralOrchestrationMaster />

             {/* Review Layer */}
             <div className="preview-container relative aspect-video bg-black rounded-3xl overflow-hidden border border-slate-800 shadow-2xl mx-auto max-w-5xl">
                <div className="absolute inset-0 flex items-center justify-center">
                   {results.length > 0 ? (
                     <img src={results[0].enhanced} className="w-full h-full object-contain opacity-40" alt="Master Preview" />
                   ) : (
                     <div className="text-slate-700 font-black uppercase tracking-widest text-xl italic">MASTER PREVIEW BLANK</div>
                   )}
                </div>

                {reviewMode && (
                  <DirectorialAnnotator 
                    currentFrame={currentFrame}
                    width={1024}
                    height={576}
                    onAnnotationSave={(a: Annotation) => console.log("Annotation added:", a)}
                    onClose={() => setReviewMode(false)}
                  />
                )}

                <div className="absolute top-6 left-6 flex gap-3 z-30">
                   {collaborationSession ? (
                     <div className="flex items-center gap-3 px-4 py-2 bg-indigo-500/20 backdrop-blur-xl border border-indigo-500/40 rounded-xl animate-in fade-in slide-in-from-left-4">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Collaboration Direct LIVE: {collaborationSession.sessionId}</span>
                        <div className="text-[9px] font-black uppercase tracking-widest text-indigo-300 border-l border-indigo-500/30 pl-3">1 PARTICIPANT</div>
                     </div>
                   ) : (
                     <button 
                       onClick={handleStartCollaboration}
                       disabled={isHosting}
                       className="px-4 py-2 bg-slate-900 border border-slate-700 text-slate-400 rounded-xl text-[10px] uppercase font-black tracking-widest hover:text-white transition-colors"
                     >
                        {isHosting ? 'G GÉNÉRATION SESSION...' : 'ACTIVER LA COLLABORATION LIVE'}
                     </button>
                   )}
                </div>

                <div className="absolute bottom-6 right-6 flex gap-3 z-30">
                   <button 
                     onClick={() => setReviewMode(!reviewMode)}
                     className={`rounded-xl font-black uppercase text-[10px] tracking-widest px-6 h-12 shadow-2xl border transition-all ${
                       reviewMode ? 'bg-amber-600 border-amber-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                     }`}
                   >
                     {reviewMode ? 'DÉSACTIVER RÉVISION' : 'ACTIVER MODE RÉVISION'}
                   </button>
                </div>
             </div>

             {/* Smart Master Rendering Engine (Phase 10) */}
             <div className="max-w-6xl mx-auto w-full">
                <SmartMasterRender />
             </div>

             {/* Final Studio Packaging (Phase 10) */}
             <div className="max-w-6xl mx-auto w-full pb-32">
                <StudioPackager />
             </div>
          </div>
        )}
      </div>

      {/* Footer / Status Bar */}
      <div className="cinematic-status-bar p-4 flex items-center gap-6 border-t border-slate-800 bg-slate-900/50">
        <div className="cinematic-status-item flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          <ImageIcon className="w-3 h-3 text-indigo-400" /> <span>FLUX.1-DEV MASTER</span>
        </div>
        <div className="cinematic-status-item flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          <Layers className="w-3 h-3 text-emerald-400" /> <span>RES: 1920x1080 (4K UPSCALING ON)</span>
        </div>
        <div className="cinematic-status-item flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          <Camera className="w-3 h-3 text-amber-400" /> <span>LENS: ANAMORPHIC MASTER</span>
        </div>
        <div className="cinematic-status-item highlight flex items-center gap-2 ml-auto text-[10px] font-black uppercase tracking-widest text-amber-400">
          <Sun className="w-3 h-3" /> <span>DYNAMIC ATMOS ON</span>
        </div>
      </div>
    </div>
  );
};