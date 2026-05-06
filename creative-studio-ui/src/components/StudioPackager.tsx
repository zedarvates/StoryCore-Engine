/**
 * Studio Packager Component
 * 
 * The final celebratory step for Phase 10: Final Orchestration & Delivery.
 * Consolidates the entire project into a secure distribution bundle.
 */

import React, { useState } from 'react';
import { 
  Archive, 
  FileCheck, 
  ShieldCheck, 
  Share2, 
  CloudUpload, 
  Lock,
  Trophy,
  History,
  FileText,
  Zap,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import './StudioPackager.css';

export const StudioPackager: React.FC = () => {
  const [packaging, setPackaging] = useState(false);
  const [complete, setComplete] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('scb');

  const startPackaging = async () => {
    setPackaging(true);
    setComplete(false);
    
    // Finalization Steps simulation
    await new Promise(r => setTimeout(r, 2000));
    // Step 1: Metadata hashing...
    await new Promise(r => setTimeout(r, 1500));
    // Step 2: Content consolidation...
    await new Promise(r => setTimeout(r, 2500));
    // Step 3: Distribution Seal...
    
    setPackaging(false);
    setComplete(true);
  };

  return (
    <div className="studio-packager p-12 bg-slate-950 border border-slate-800 rounded-[3.5rem] space-y-12 shadow-3xl text-white overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-right from-amber-500 via-emerald-500 to-indigo-500" />
      
      {/* Celebration Header */}
      <div className="flex flex-col items-center text-center space-y-4">
         <div className="p-5 bg-amber-500/10 rounded-full border border-amber-500/20 ring-[12px] ring-amber-500/5 animate-pulse">
            <Trophy className="w-10 h-10 text-amber-500" />
         </div>
         <div className="space-y-1">
            <h3 className="text-3xl font-black tracking-tighter uppercase italic italic-grad">Project Finalization & Seal</h3>
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.5em]">Studio Packaging • Phase 10 Final Step</p>
         </div>
      </div>

      <div className="grid grid-cols-12 gap-12">
        {/* Left: Bundle Config */}
        <div className="col-span-12 lg:col-span-7 space-y-8">
           <div className="grid grid-cols-2 gap-6">
              {[
                { id: 'scb', name: 'StoryCore Bundle (.scb)', desc: 'Full editable project archive', icon: <Archive className="w-5 h-5 text-indigo-400" /> },
                { id: 'ott', name: 'OTT Master (.zip)', desc: 'Optimized for streaming services', icon: <CloudUpload className="w-5 h-5 text-emerald-400" /> },
                { id: 'arc', name: 'Master Archive (.tar)', desc: 'Long-term storage format', icon: <History className="w-5 h-5 text-amber-400" /> },
                { id: 'doc', name: 'Script & Production Log', desc: 'PDF / JSON generation data', icon: <FileText className="w-5 h-5 text-sky-400" /> }
              ].map(f => (
                <div 
                  key={f.id}
                  onClick={() => setSelectedFormat(f.id)}
                  className={`p-6 rounded-3xl border transition-all cursor-pointer group hover:scale-[1.02] ${
                    selectedFormat === f.id ? 'bg-slate-900 border-amber-500/40 shadow-xl shadow-amber-500/5' : 'bg-slate-900/40 border-slate-800'
                  }`}
                >
                   <div className="flex justify-between items-start mb-4">
                      {f.icon}
                      <div className={`w-4 h-4 rounded-full border-2 ${selectedFormat === f.id ? 'bg-amber-500 border-amber-400' : 'border-slate-700'}`} />
                   </div>
                   <h5 className="text-[11px] font-black uppercase text-white mb-1">{f.name}</h5>
                   <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight leading-relaxed">{f.desc}</p>
                </div>
              ))}
           </div>

           <div className="p-8 bg-emerald-500/5 border border-emerald-500/10 rounded-[2.5rem] flex items-center justify-between">
              <div className="flex items-center gap-5">
                 <ShieldCheck className="w-8 h-8 text-emerald-400" />
                 <div>
                    <h6 className="text-xs font-black uppercase tracking-widest text-white">Neural Distribution Seal</h6>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Vérification de l'intégrité neurale et signature cryptographique.</p>
                 </div>
              </div>
              <Lock className="w-5 h-5 text-slate-700" />
           </div>
        </div>

        {/* Right: Summary & Action */}
        <div className="col-span-12 lg:col-span-5 flex flex-col justify-between">
           <div className="p-8 bg-slate-900/60 border border-slate-800 rounded-[2.5rem] space-y-6">
              <h5 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">Project Stats Summary</h5>
              
              <div className="space-y-4">
                 {[
                   { label: 'Total Cinematic Sequence', val: '04:12:05' },
                   { label: 'AI Generated Assets', val: '142 Files' },
                   { label: 'Directorial Annotations', val: '28 Resolved' },
                   { label: 'Neural Compute Logs', val: '1.2 GB' }
                 ].map(s => (
                   <div key={s.label} className="flex justify-between items-center pb-3 border-b border-white/5 last:border-0 last:pb-0">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{s.label}</span>
                      <span className="text-[11px] font-black text-white italic">{s.val}</span>
                   </div>
                 ))}
              </div>

              <div className="pt-6">
                 {packaging ? (
                    <div className="space-y-4">
                       <Progress value={45} className="h-1 bg-slate-950" />
                       <div className="flex items-center justify-center gap-3 text-amber-400 animate-pulse">
                          <Zap className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-[0.3em]">Sealing Studio Bundle...</span>
                       </div>
                    </div>
                 ) : complete ? (
                    <div className="flex flex-col items-center gap-4 animate-in zoom-in-95 duration-500">
                       <div className="flex items-center gap-3 text-emerald-400">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="text-xs font-black uppercase tracking-[0.3em]">PACKAGE READY!</span>
                       </div>
                       <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest rounded-2xl h-16 shadow-xl shadow-emerald-600/20 active:scale-95 transition-all">
                          DOWNLOAD PRODUCTION BUNDLE <ChevronRight className="w-4 h-4 ml-2" />
                       </Button>
                    </div>
                 ) : (
                    <Button 
                      onClick={startPackaging}
                      className="w-full bg-amber-600 hover:bg-amber-500 text-white font-black uppercase tracking-widest rounded-2xl h-20 text-sm shadow-xl shadow-amber-500/20 active:scale-95 transition-all border-b-4 border-amber-800"
                    >
                       GÉNÉRER LE BUNDLE FINAL
                    </Button>
                 )}
              </div>
           </div>

           <div className="mt-8 flex items-center justify-center gap-8">
              <Button variant="link" className="text-[10px] uppercase font-black text-slate-500 hover:text-white transition-colors">
                 <FileCheck className="w-3 h-3 mr-2" /> Final Review Doc
              </Button>
              <Button variant="link" className="text-[10px] uppercase font-black text-slate-500 hover:text-white transition-colors">
                 <Share2 className="w-3 h-3 mr-2" /> Quick Export Link
              </Button>
           </div>
        </div>
      </div>

      <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-amber-500/5 blur-[120px] rounded-full" />
    </div>
  );
};
