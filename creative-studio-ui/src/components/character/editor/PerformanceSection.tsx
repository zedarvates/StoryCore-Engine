import React, { useState } from 'react';
import { 
  Mic, 
  Video, 
  Zap, 
  Activity, 
  CheckCircle2, 
  RefreshCw,
  Info
} from 'lucide-react';
import { LipSyncModel, PhonicAlignment } from '@/types/lipSync';
import { lipSyncService } from '@/services/lipSyncService';
import { phonicAlignmentService } from '@/services/PhonicAlignmentService';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface PerformanceSectionProps {
  characterId: string;
  characterName: string;
  characterImage?: string;
  id?: string;
}

export const PerformanceSection: React.FC<PerformanceSectionProps> = ({
  characterId,
  characterName,
  characterImage,
  id
}) => {
  const [selectedModel, setSelectedModel] = useState<LipSyncModel>(LipSyncModel.LIVE_PORTRAIT);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [alignments, setAlignments] = useState<PhonicAlignment[]>([]);
  const [isAligning, setIsAligning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioUrl(URL.createObjectURL(file));
      // Trigger auto-alignment
      performAlignment(URL.createObjectURL(file));
    }
  };

  const performAlignment = async (url: string) => {
    setIsAligning(true);
    try {
      const res = await phonicAlignmentService.alignAudio(url);
      setAlignments(res);
    } catch (err) {
      console.error("Alignment failed", err);
    } finally {
      setIsAligning(false);
    }
  };

  const handleGeneratePerformance = async () => {
    if (!audioUrl || !characterImage) return;
    
    setIsGenerating(true);
    setProgress(10);
    
    try {
      const job = await lipSyncService.generateLipSync({
        projectId: 'current_project',
        characterFaceImage: characterImage,
        audioFile: audioUrl,
        model: selectedModel,
        enhancer: true
      });

      // Monitor progress
      await lipSyncService.waitForCompletion(job.job_id, (status) => {
        setProgress(status.progress);
      });

      console.log(`[Performance] Life-like lip-sync completed for character ${characterId}!`);
    } catch (err) {
      console.error("Performance generation failed", err);
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  return (
    <div id={id} className="performance-section space-y-6 p-4">
      <div className="section-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 rounded-lg">
            <Activity className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Performance Studio (Phase 5)</h3>
            <p className="text-xs text-slate-400 uppercase tracking-widest font-black">High-Precision Lip-Sync Orchestration</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
          <Zap className="w-3 h-3 text-amber-400 animate-pulse" />
          <span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest">LivePortrait Active</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Model & Audio selection */}
        <div className="space-y-6">
          <div className="config-card p-6 bg-slate-900/50 border border-slate-800 rounded-2xl space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Animation Provider</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(LipSyncModel).map(model => (
                  <button
                    key={model}
                    onClick={() => setSelectedModel(model)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                      selectedModel === model 
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' 
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {model.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Dialogue Track (WAV/MP3)</label>
              <div className="relative">
                <input 
                  type="file" 
                  id="dialogue-upload" 
                  className="hidden" 
                  accept="audio/*"
                  onChange={handleAudioUpload}
                />
                <label 
                  htmlFor="dialogue-upload"
                  className="flex items-center justify-center gap-3 p-8 border-2 border-dashed border-slate-700 rounded-2xl cursor-pointer hover:border-indigo-500 transition-all bg-slate-800/30"
                >
                  <Mic className="w-6 h-6 text-slate-500" />
                  <div className="text-left">
                    <p className="text-sm font-bold">{audioUrl ? "Dialogue Track Loaded" : "Upload Dialogue"}</p>
                    <p className="text-[10px] text-slate-500 italic">Supports high-fidelity phonic alignment</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="info-card p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex gap-3">
             <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />
             <p className="text-[11px] text-blue-300 leading-relaxed">
               L'utilisation de **LivePortrait** (Phase 5) permet une dÃ©formation faciale 4K non-linÃ©aire basÃ©e sur l'empreinte phonique de l'acteur.
             </p>
          </div>
        </div>

        {/* Phonic Mapping & Visuals */}
        <div className="space-y-6">
          <div className="alignment-preview p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
             <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-tighter text-slate-400">Phonic Alignment Map</h4>
                {isAligning && <RefreshCw className="w-3 h-3 text-indigo-400 animate-spin" />}
             </div>

             <div className="viseme-flow space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {alignments.length > 0 ? (
                  alignments.map((a, i) => (
                    <div key={i} className="viseme-item flex items-center justify-between p-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] font-black w-10 text-slate-500">{a.start.toFixed(2)}s</span>
                        <div className={`px-2 py-0.5 rounded uppercase text-[9px] font-black ${
                          a.viseme.includes('open') ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {a.viseme}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                         <div className="w-12 h-1 bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${a.confidence * 100}%` }} />
                         </div>
                         <span className="text-[8px] font-bold text-slate-500">{(a.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-xs italic text-slate-500 font-bold">
                    Chargez un fichier audio pour gÃ©nÃ©rer <br/>la cartographie des visÃ¨mes.
                  </div>
                )}
             </div>

             <div className="pt-4 border-t border-slate-800">
                <Button 
                  onClick={handleGeneratePerformance}
                  disabled={isGenerating || !audioUrl}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest h-12 rounded-xl"
                >
                  {isGenerating ? (
                    <div className="flex flex-col items-center gap-1 w-full">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-3 h-3 animate-spin" /> GÉNÉRATION 4K PERFORMANCE...
                      </div>
                      <Progress value={progress} className="h-1 w-full mt-1" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4" /> CUISINER LA PERFORMANCE PERSONNAGE
                    </div>
                  )}
                </Button>
             </div>
          </div>

          <div className="character-status p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                 <span className="text-xs font-bold text-emerald-300">ACTEUR PRÊT POUR SYNCHRO</span>
              </div>
              <span className="text-[10px] font-black text-emerald-500 tracking-widest">{characterName.toUpperCase()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
