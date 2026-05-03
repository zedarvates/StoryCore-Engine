/**
 * Lip Sync Wizard Component
 */
import { LegacyAny } from '@/types/legacy';


import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  Upload, 
  Mic, 
  Video, 
  ChevronRight, 
  RotateCcw,
  Download,
  Plus
} from 'lucide-react';
import { useLipSyncStore } from '@/stores/lipSyncStore';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import './WizardModal.css';

export interface LipSyncWizardProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  context?: {
    characterImage?: string;
    audioFile?: string;
    shotId?: string;
  };
  updateShot?: (shotId: string, updates: LegacyAny) => void;
}

export function LipSyncWizard({ 
  isOpen, 
  onClose, 
  projectId = 'default', 
  context,
  updateShot 
}: LipSyncWizardProps) {
  const [step, setStep] = useState<'assets' | 'configure' | 'generate' | 'complete'>('assets');
  
  const { 
    progress, 
    generateLipSync, 
    currentJob,
    characterFaceImage,
    audioFile,
    setCharacterFaceImage,
    setAudioFile,
    reset 
  } = useLipSyncStore();

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  // Handle Escape key
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    },
    [handleClose]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      
      // Initialize from context if provided
      if (context?.characterImage) setCharacterFaceImage(context.characterImage);
      if (context?.audioFile) setAudioFile(context.audioFile);
    } else {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeyDown, context, setAudioFile, setCharacterFaceImage]);

  const handleGenerateClick = async () => {
    setStep('generate');
    try {
      await generateLipSync(projectId);
      setStep('complete');
    } catch (_error) {
      toast({ title: "Generation failed", description: "Error during lip sync generation.", variant: "destructive" });
      setStep('configure');
    }
  };

  const handleAddToTimeline = () => {
    if (currentJob?.output_video && context?.shotId && updateShot) {
      updateShot(context.shotId, { video: currentJob.output_video });
      toast({ title: "Success", description: "Video added to shot." });
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="wizard-modal-overlay" onClick={handleClose}>
      <div className="wizard-modal-container max-w-4xl" onClick={(e) => e.stopPropagation()}>
        <div className="wizard-modal-header">
           <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-500/20 rounded-lg text-pink-400">
              <Video size={20} className="animate-pulse" />
            </div>
            <div className="flex flex-col">
              <h2 className="wizard-modal-title">AI Lip Sync Wizard</h2>
              <span className="text-[10px] text-pink-400/70 uppercase tracking-widest font-black">Sync Engine v2.0</span>
            </div>
          </div>
          <button
            className="wizard-modal-close"
            onClick={handleClose}
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="wizard-modal-content p-8">
          <div className="flex justify-between items-center mb-8 bg-black/40 p-4 rounded-xl border border-white/5">
             {['Assets', 'Configure', 'Generate', 'Complete'].map((s, i) => (
               <div key={s} className="flex items-center gap-2">
                 <div className={cn(
                   "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black",
                   step === s.toLowerCase() ? "bg-pink-500 text-white shadow-[0_0_10px_rgba(236,72,153,0.5)]" : "bg-white/10 text-slate-500"
                 )}>
                   {i + 1}
                 </div>
                 <span className={cn(
                   "text-[10px] uppercase font-black tracking-widest",
                   step === s.toLowerCase() ? "text-pink-500" : "text-slate-500"
                 )}>{s}</span>
                 {i < 3 && <div className="w-8 h-px bg-white/10 mx-2" />}
               </div>
             ))}
          </div>

          {step === 'assets' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-2xl font-black uppercase tracking-tight text-white mb-6">Import Media</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-pink-400">Character Model</span>
                  <div className="aspect-square bg-black/40 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-pink-500/50 hover:bg-pink-500/5 transition-all overflow-hidden relative">
                    {characterFaceImage ? (
                      <img src={characterFaceImage} className="w-full h-full object-cover" alt="Avatar" />
                    ) : (
                      <>
                        <Upload className="text-slate-600 mb-2" size={32} />
                        <span className="text-xs text-slate-500">Drop frame here</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">Audio Track</span>
                  <div className="aspect-square bg-black/40 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition-all overflow-hidden relative">
                    {audioFile ? (
                      <div className="flex flex-col items-center">
                        <Mic className="text-blue-500 mb-2" size={32} />
                        <span className="text-xs text-blue-400 font-mono">Audio Loaded</span>
                      </div>
                    ) : (
                      <>
                        <Mic className="text-slate-600 mb-2" size={32} />
                        <span className="text-xs text-slate-500">Drop audio here</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-12 flex justify-end">
                <Button 
                  disabled={!characterFaceImage || !audioFile}
                  onClick={() => setStep('configure')}
                  className="bg-pink-600 hover:bg-pink-500 px-10 h-12 font-black uppercase tracking-widest text-xs"
                >
                  Configure Sync <ChevronRight className="ml-2" size={16} />
                </Button>
              </div>
            </div>
          )}

          {step === 'configure' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-2xl font-black uppercase tracking-tight text-white mb-6">Configure Generation</h3>
              <div className="bg-black/40 p-6 rounded-2xl border border-white/5 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Sync Accuracy</h4>
                    <p className="text-xs text-slate-500">Highest precision neural mapping</p>
                  </div>
                  <div className="text-pink-500 font-black">ULTRA</div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Face Enhancer</h4>
                    <p className="text-xs text-slate-500">Post-process refinement</p>
                  </div>
                  <div className="text-emerald-500 font-black">ENABLED</div>
                </div>
              </div>

              <div className="mt-12 flex justify-between">
                <Button 
                  variant="outline"
                  onClick={() => setStep('assets')}
                  className="border-white/10 text-slate-400 px-10 h-12 font-black uppercase tracking-widest text-xs"
                >
                  Back
                </Button>
                <Button 
                  onClick={handleGenerateClick}
                  className="bg-pink-600 hover:bg-pink-500 px-10 h-12 font-black uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(236,72,153,0.3)]"
                >
                  Generate Sync <Video className="ml-2" size={16} />
                </Button>
              </div>
            </div>
          )}

          {step === 'generate' && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
               <div className="w-24 h-24 bg-pink-500/10 rounded-full flex items-center justify-center mb-8 relative">
                 <Video className="text-pink-500 animate-pulse" size={40} />
                 <div className="absolute inset-0 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
               </div>
               <h3 className="text-2xl font-black uppercase tracking-widest text-white mb-2">Generating Lip Sync</h3>
               <p className="text-slate-400 mb-8 max-w-sm">Synthesizing visual frames with audio waveform dynamics. Please wait...</p>
               
               <div className="w-full max-w-md mb-2">
                 <Progress value={progress} size="md" variant="default" className="bg-pink-500/20" />
               </div>
               <span className="text-[10px] font-black text-pink-500 tracking-[0.3em]">{progress}% COMPLETE</span>
            </div>
          )}

          {step === 'complete' && currentJob?.output_video && (
            <div className="animate-in zoom-in-95 duration-500">
               <div className="aspect-video bg-black rounded-2xl border border-white/10 mb-8 overflow-hidden flex items-center justify-center relative group">
                  <video src={currentJob.output_video} className="w-full h-full" controls />
               </div>
               
               <div className="flex justify-between items-center gap-4">
                 <Button variant="outline" onClick={() => setStep('assets')} className="border-white/10 text-slate-400 font-black uppercase tracking-widest text-[10px]">
                   <RotateCcw className="mr-2" size={14} /> New Generation
                 </Button>
                 
                 <div className="flex gap-4">
                   <Button variant="secondary" className="bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-black uppercase tracking-widest text-[10px]">
                     <Download className="mr-2" size={14} /> Export Video
                   </Button>
                   <Button onClick={handleAddToTimeline} className="bg-emerald-600 hover:bg-emerald-500 px-8 font-black uppercase tracking-widest text-[10px]">
                     <Plus className="mr-2" size={14} /> Add to Timeline
                   </Button>
                 </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
