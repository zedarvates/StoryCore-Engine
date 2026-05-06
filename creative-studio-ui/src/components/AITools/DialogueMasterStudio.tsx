/**
 * Dialogue Master Studio Component
 * 
 * High-precision voice cloning and lip-sync orchestration for Phase 9: Audio Worldization.
 * Allows directors to assign neural voices to characters and calibrate phonetic sync.
 */
import { LegacyAny } from '@/types/legacy';


import React, { useState } from 'react';
import { 
  Mic, 
  User, 
  Play, 
  MessageSquare,
  Settings,
  ShieldCheck,
  Zap,
  Globe,
  Loader2,
  Ear
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface DialogueMasterStudioProps {
  characters?: LegacyAny[];
  selectedCharacterId?: string;
  onApply?: (config: LegacyAny) => void;
}

export const DialogueMasterStudio: React.FC<DialogueMasterStudioProps> = ({ 
  characters = [
    { id: 'char_1', name: 'Alara', role: 'Protagonist' },
    { id: 'char_2', name: 'Kael', role: 'Rival' }
  ],
  selectedCharacterId, 
  onApply 
}) => {
  const [activeCharId, setActiveCharId] = useState(selectedCharacterId || characters[0]?.id);
  const [text, setText] = useState("Je sens que quelque chose approche... Je dois me préparer.");
  const [isCloning, setIsCloning] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const voiceQuality = 92; // Constant value for UI
  const [cloningComplete, setCloningComplete] = useState(false);

  const handleClone = () => {
    setIsCloning(true);
    setProgress(0);
    
    // Simulate Neural Voice Cloning
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setIsCloning(false);
          setCloningComplete(true);
          return 100;
        }
        return p + 2;
      });
    }, 50);
  };

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      onApply?.({ text, charId: activeCharId });
    }, 2000);
  };

  const activeChar = characters.find(c => c.id === activeCharId) || characters[0];

  return (
    <div className="dialogue-master-studio p-8 bg-slate-950 border border-slate-800 rounded-[2.5rem] space-y-8 shadow-3xl text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
           <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 ring-4 ring-amber-500/5">
              <Mic className="w-6 h-6 text-amber-400" />
           </div>
           <div>
              <h3 className="text-xl font-bold tracking-tight">Dialogue Master Studio</h3>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] leading-none mt-1">Multi-Language Voice Cloning & Lip-Sync</p>
           </div>
        </div>
        <div className="flex items-center gap-3">
           <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full border-l-4 border-l-amber-500">
              <Globe className="w-3 h-3 text-amber-400" />
              <span className="text-[9px] font-black uppercase text-amber-400 font-bold">FR-Neural-Standard</span>
           </div>
           <Settings className="w-4 h-4 text-slate-700 cursor-pointer hover:text-white" />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Character Selection */}
        <div className="col-span-4 space-y-6">
           <div className="space-y-4">
              <div className="flex items-center gap-2 px-2">
                 <User className="w-3 h-3 text-amber-400" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Character</span>
              </div>
              <div className="flex flex-col gap-3">
                 {characters.map(char => (
                   <div 
                     key={char.id}
                     onClick={() => setActiveCharId(char.id)}
                     className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                       activeCharId === char.id ? 'bg-amber-500/10 border-amber-500/40 text-white' : 'bg-slate-900/40 border-slate-800 text-slate-500 hover:border-slate-700'
                     }`}
                   >
                      <div className="flex items-center gap-3">
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activeCharId === char.id ? 'bg-amber-500 text-black font-black' : 'bg-slate-800'}`}>
                            {char.name[0]}
                         </div>
                         <div className="flex flex-col">
                            <span className="text-xs font-bold">{char.name}</span>
                            <span className="text-[9px] uppercase tracking-tighter text-slate-600">{char.role}</span>
                         </div>
                      </div>
                      {activeCharId === char.id && <ShieldCheck className="w-4 h-4 text-amber-400" />}
                   </div>
                 ))}
              </div>
           </div>

           {/* Voice Profile */}
           <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-[2rem] space-y-4">
              <div className="flex justify-between items-center">
                 <div className="flex items-center gap-2">
                    <Ear className="w-3 h-3 text-amber-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Voice Quality</span>
                 </div>
                 <span className="text-amber-400 text-xs font-bold italic">{voiceQuality}%</span>
              </div>
              <Progress value={voiceQuality} className="h-1 bg-slate-800" />
              <p className="text-[9px] text-slate-600 leading-relaxed uppercase font-bold tracking-tighter">
                 Analyse phonétique du personnage complétée. Profil vocal verrouillé sur la base de données.
              </p>
           </div>
        </div>

        {/* Scripting & Cloning Area */}
        <div className="col-span-8 space-y-6">
           <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-[2.5rem] space-y-6">
              <div className="flex items-center gap-3 mb-2">
                 <MessageSquare className="w-4 h-4 text-amber-400" />
                 <h4 className="text-xs font-black uppercase tracking-widest">Dialogue Forge</h4>
              </div>
              <textarea 
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full h-32 p-6 bg-slate-950 border border-slate-800 rounded-[1.5rem] text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-all resize-none italic"
                placeholder="Entrez le texte à synthétiser..."
              />
              
              <div className="flex gap-4">
                 <Button 
                   onClick={handleClone}
                   disabled={isCloning}
                   className="flex-1 bg-slate-800 hover:bg-slate-700 text-amber-400 font-black uppercase tracking-widest text-[10px] h-14 rounded-xl border border-slate-700"
                 >
                    {isCloning ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                       <div className="flex items-center gap-2">
                          <Zap className="w-3 h-3" /> INITIALISER LE CLONAGE VOCAL
                       </div>
                    )}
                 </Button>
                 
                 <Button className="w-14 bg-slate-900 border border-slate-800 rounded-xl">
                    <Play className="w-4 h-4 text-amber-500" />
                 </Button>
              </div>

              {isCloning && (
                 <div className="space-y-2">
                    <div className="flex justify-between text-[8px] font-black uppercase text-amber-500">
                       <span>Neural Voice Encoding...</span>
                       <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1 bg-slate-800" />
                 </div>
              )}
           </div>

           <div className="p-8 bg-amber-500/5 border border-amber-500/10 rounded-[2.5rem] space-y-6 relative overflow-hidden">
              {cloningComplete && (
                 <div className="absolute top-4 right-8 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-black uppercase text-emerald-400">Neural Master Ready</span>
                 </div>
              )}
              
              <div className="flex flex-col gap-2">
                 <h5 className="text-[10px] font-black text-amber-400 tracking-widest uppercase">Lip-Sync Calibration</h5>
                 <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Synchronisation phonétique auto-ajustée au plan {activeChar.name}</p>
              </div>

              <div className="flex items-center gap-4">
                 <div className="flex-1 h-12 bg-slate-950 rounded-xl border border-slate-800 flex items-center px-4 overflow-hidden gap-1">
                    {[1,2,3,4,3,2,1,2,3,4,5,6,5,4,3,2].map((h, i) => (
                       <div key={i} className="flex-1 bg-amber-500/40 rounded-full" style={{ height: `${h * 15}%` }} />
                    ))}
                 </div>
                 <Button 
                    onClick={handleSync}
                    disabled={!cloningComplete || isSyncing}
                    className="h-12 px-8 bg-amber-600 hover:bg-amber-500 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-amber-600/20 active:scale-95 transition-all"
                 >
                    {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : "APPLIQUER LIP-SYNC"}
                 </Button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
