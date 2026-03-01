import React, { useState, useEffect } from 'react';
import { 
  UserSquare2, 
  Plus, 
  ShieldCheck, 
  ShieldAlert, 
  Image as ImageIcon,
  Sparkles,
  Camera,
  RefreshCw,
  ChevronRight,
  Info,
  Maximize2,
  MoreVertical,
  SlidersHorizontal,
  Wand2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { identityService, IdentityProfile } from '@/services/identityService';
import { automationService, CharacterGridBundleData } from '@/services/automationService';

export const CastStudio: React.FC<{ projectId: string; onSelect?: (identity: IdentityProfile) => void }> = ({ projectId, onSelect }) => {
  const [identities, setIdentities] = useState<IdentityProfile[]>([]);
  const [selectedIdentity, setSelectedIdentity] = useState<IdentityProfile | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newCharName, setNewCharName] = useState('');
  const [newCharDesc, setNewCharDesc] = useState('');
  const [characterGrids, setCharacterGrids] = useState<CharacterGridBundleData[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [activeTab, setActiveTab] = useState<'attributes' | 'grids' | 'refinement'>('attributes');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await identityService.listIdentities(projectId);
        setIdentities(data.identities);
        if (data.identities.length > 0 && !selectedIdentity) {
          const first = data.identities[0];
          setSelectedIdentity(first);
          const grids = await automationService.getCharacterAllGrids(first.id);
          setCharacterGrids(grids.bundles);
        }
      } catch (err) {
        console.error("Failed to load initial cast data:", err);
      }
    };
    fetchData();
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadGrids = async (id: string) => {
    try {
      const data = await automationService.getCharacterAllGrids(id);
      setCharacterGrids(data.bundles);
    } catch (err) {
      console.error("Failed to load grids:", err);
    }
  };

  const handleCreateCharacter = async () => {
    if (!newCharName) return;
    try {
      const identity = await identityService.createIdentity({
        name: newCharName,
        description: newCharDesc,
        project_id: projectId
      });
      setIdentities([...identities, identity]);
      setSelectedIdentity(identity);
      setIsCreating(false);
      setNewCharName('');
      setNewCharDesc('');
    } catch (err) {
      console.error("Failed to create character:", err);
    }
  };

  const handleIdentitySelect = (identity: IdentityProfile) => {
    setSelectedIdentity(identity);
    loadGrids(identity.id);
  };

  const handleExtract = async () => {
    if (!selectedIdentity) return;
    setExtracting(true);
    try {
      const imagePath = selectedIdentity.visual_attributes.source_image_path || "assets/defaults/character_reference.jpg";
      const updated = await identityService.extractAndLock(selectedIdentity.id, imagePath);
      setSelectedIdentity(updated);
      setIdentities(identities.map(i => i.id === updated.id ? updated : i));
    } catch (err) {
      console.error("Extraction failed:", err);
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className="flex h-[700px] bg-[#020617] text-slate-200 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl font-sans">
      {/* Sidebar: Cast List */}
      <div className="w-80 border-r border-slate-800 flex flex-col bg-slate-900/20">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <UserSquare2 className="w-5 h-5 text-emerald-400" /> Cast Studio
          </h2>
          <button 
            onClick={() => setIsCreating(true)}
            className="p-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {identities.map(identity => (
            <button
              key={identity.id}
              onClick={() => handleIdentitySelect(identity)}
              className={`w-full text-left p-4 rounded-2xl transition-all group relative overflow-hidden ${
                selectedIdentity?.id === identity.id 
                  ? 'bg-emerald-600/10 border border-emerald-600/30' 
                  : 'hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              {selectedIdentity?.id === identity.id && (
                <div className="absolute left-0 top-0 w-1 h-full bg-emerald-500" />
              )}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden">
                  {identity.visual_attributes.source_image_path ? (
                    <img src={identity.visual_attributes.source_image_path} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <UserSquare2 className="w-5 h-5 text-slate-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold truncate ${selectedIdentity?.id === identity.id ? 'text-emerald-400' : 'text-slate-200'}`}>
                    {identity.name}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate uppercase tracking-widest font-bold">
                    {identity.is_locked ? 'IDENTITY LOCKED' : 'DRAFT'}
                  </p>
                </div>
                {identity.is_locked && (
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                )}
              </div>
            </button>
          ))}
          
          {isCreating && (
             <div className="p-4 bg-slate-900 border border-emerald-500/50 rounded-2xl">
               <input 
                 autoFocus
                 type="text" 
                 placeholder="Nom du personnage..."
                 value={newCharName}
                 onChange={(e) => setNewCharName(e.target.value)}
                 className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-sm mb-2 outline-none focus:ring-1 focus:ring-emerald-500"
               />
               <textarea 
                 placeholder="Archetype/Description..."
                 value={newCharDesc}
                 onChange={(e) => setNewCharDesc(e.target.value)}
                 className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-[11px] h-16 outline-none focus:ring-1 focus:ring-emerald-500 mb-2 resize-none"
               />
               <div className="flex gap-2">
                 <button 
                   onClick={handleCreateCharacter}
                   className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg"
                 >
                   CRÉER
                 </button>
                 <button 
                   onClick={() => setIsCreating(false)}
                   className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold text-xs rounded-lg"
                 >
                   X
                 </button>
               </div>
             </div>
          )}
        </div>
      </div>

      {/* Main Panel: Identity Configuration */}
      <div className="flex-1 flex flex-col bg-[#020617] relative">
        {!selectedIdentity ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-6 opacity-30">
             <div className="w-24 h-24 rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center">
                <ShieldAlert className="w-12 h-12 text-slate-600" />
             </div>
             <div>
                <h3 className="text-xl font-bold text-white uppercase italic">Choisissez un interprète</h3>
                <p className="text-sm">Le Cast Studio permet de verrouiller l'apparence visuelle d'un acteur IA à travers tout votre projet.</p>
             </div>
          </div>
        ) : (
          <>
            {/* Char Header */}
            <div className="p-8 border-b border-slate-800 flex justify-between items-end bg-gradient-to-br from-emerald-900/10 to-transparent">
              <div>
                <div className="flex items-center gap-3 mb-1">
                   <h2 className="text-3xl font-black text-white">{selectedIdentity.name}</h2>
                   {selectedIdentity.is_locked ? (
                     <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black rounded uppercase tracking-tighter">Identity Locked</span>
                   ) : (
                     <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black rounded uppercase tracking-tighter">Draft Profile</span>
                   )}
                </div>
                <p className="text-sm text-slate-400 max-w-lg">{selectedIdentity.description}</p>
              </div>
              <div className="flex gap-3">
                 <button 
                   onClick={() => onSelect?.(selectedIdentity)}
                   className="flex items-center gap-2 px-6 py-2 bg-white text-[#020617] font-bold rounded-full hover:bg-emerald-50 transition-all hover:scale-105"
                 >
                    DÉPLOYER AU STORYBOARD <ChevronRight className="w-4 h-4" />
                 </button>
              </div>
            </div>

            {/* Config Tabs Nav */}
            <div className="px-8 pt-4 flex gap-8 border-b border-slate-800">
               <button 
                 onClick={() => setActiveTab('attributes')}
                 className={`pb-4 text-xs font-bold uppercase tracking-widest transition-all relative ${activeTab === 'attributes' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
               >
                 Attributs Visuels
                 {activeTab === 'attributes' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500" />}
               </button>
               <button 
                 onClick={() => setActiveTab('grids')}
                 className={`pb-4 text-xs font-bold uppercase tracking-widest transition-all relative ${activeTab === 'grids' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
               >
                 Character Grids
                 {activeTab === 'grids' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500" />}
               </button>
               <button 
                 onClick={() => setActiveTab('refinement')}
                 className={`pb-4 text-xs font-bold uppercase tracking-widest transition-all relative ${activeTab === 'refinement' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
               >
                 Refinement <span className="text-[10px] opacity-50 italic font-black text-white">(AI)</span>
                 {activeTab === 'refinement' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500" />}
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              {activeTab === 'attributes' && (
                <div className="grid grid-cols-2 gap-12">
                   {/* Left Col: Core Attributes */}
                   <div className="space-y-8">
                      <div>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <ImageIcon className="w-4 h-4" /> Image de Référence
                        </h3>
                        {selectedIdentity.visual_attributes.source_image_path ? (
                          <div className="relative group">
                            <img 
                              src={selectedIdentity.visual_attributes.source_image_path} 
                              alt="Ref" 
                              className="w-full h-64 object-cover rounded-2xl border border-slate-800"
                            />
                            {!selectedIdentity.is_locked && (
                              <button 
                                onClick={handleExtract}
                                disabled={extracting}
                                className="absolute bottom-4 right-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-xl flex items-center gap-2 group-hover:scale-105 transition-all"
                              >
                                {extracting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                EXTRAIRE & VERROUILLER
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="w-full h-64 bg-slate-900 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-4 text-slate-500">
                             <ImageIcon className="w-12 h-12 opacity-20" />
                             <p className="text-xs font-medium">Glissez un portrait ici pour figer l'identité</p>
                             <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg border border-slate-700 transition-colors">
                                BROWSE FILES
                             </button>
                          </div>
                        )}
                      </div>

                      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
                        <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4">Identity Prompt (Base)</h3>
                        <p className="text-sm text-slate-300 italic leading-relaxed">
                          "{selectedIdentity.base_prompt || "Le profil est encore en cours d'édition. Verrouillez les attributs pour générer le prompt d'identité."}"
                        </p>
                      </div>
                   </div>

                   {/* Right Col: Parameters */}
                   <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                         {Object.entries(selectedIdentity.visual_attributes).map(([key, value]) => {
                           if (['source_image_path', 'extraction_confidence', 'accessories', 'distinctive_features', 'scars_marks'].includes(key)) return null;
                           return (
                             <div key={key} className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl group hover:border-emerald-500/30 transition-all">
                               <label className="block text-[10px] text-slate-500 uppercase font-black mb-1 group-hover:text-emerald-400 transition-colors">{key.replace('_', ' ')}</label>
                               <p className="text-sm text-white font-medium capitalize">{value as string || "—"}</p>
                             </div>
                           );
                         })}
                      </div>

                      <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl">
                         <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Caractéristiques Spéciales</h3>
                         <div className="flex flex-wrap gap-2">
                            {selectedIdentity.visual_attributes.distinctive_features.map((f, i) => (
                              <span key={i} className="px-2 py-1 bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 text-[11px] rounded transition-all hover:bg-emerald-500/10">
                                {f}
                              </span>
                            ))}
                            <button className="px-2 py-1 bg-slate-800 text-slate-500 text-[11px] rounded border border-slate-700 hover:text-white transition-colors">
                              + ADD TAG
                            </button>
                         </div>
                      </div>

                      <div className="flex gap-4">
                         <div className="flex-1 p-4 bg-blue-900/20 border border-blue-900/30 rounded-2xl flex items-center justify-between">
                            <div>
                               <p className="text-[10px] font-black text-blue-400 uppercase mb-1">Confiance</p>
                               <p className="text-xl font-black text-white">{Math.round(selectedIdentity.visual_attributes.extraction_confidence * 100)}%</p>
                            </div>
                            <Info className="w-5 h-5 text-blue-500 opacity-50" />
                         </div>
                         <div className="flex-1 p-4 bg-violet-900/20 border border-violet-900/30 rounded-2xl flex items-center justify-between">
                            <div>
                               <p className="text-[10px] font-black text-violet-400 uppercase mb-1">Stabilité</p>
                               <p className="text-xl font-black text-white">HAUTE</p>
                            </div>
                            <ShieldCheck className="w-5 h-5 text-violet-500 opacity-50" />
                         </div>
                      </div>
                   </div>
                </div>
              )}

              {activeTab === 'grids' && (
                <div className="space-y-8 pb-12">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                       <SlidersHorizontal className="w-4 h-4" /> Variantes de Grille (Consistency Check)
                    </h3>
                    <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all">
                       <Sparkles className="w-4 h-4" /> RE-GÉNÉRER GRILLE 3X3
                    </button>
                  </div>

                  {characterGrids.length === 0 ? (
                    <div className="p-20 bg-slate-900/40 border border-slate-800 border-dashed rounded-3xl flex flex-col items-center justify-center gap-4 text-slate-500 text-center">
                       <Camera className="w-12 h-12 opacity-10" />
                       <div>
                          <p className="font-bold text-slate-400 uppercase tracking-widest italic">Aucune grille générée</p>
                          <p className="text-xs px-12 max-w-sm mt-1">Générez une grille d'expressions pour valider la stabilité du visage avant la production.</p>
                       </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-8">
                      {characterGrids.map(grid => (
                        <div key={grid.bundle_id} className="group relative bg-[#020617] border border-slate-800 rounded-2xl overflow-hidden hover:border-emerald-500/50 transition-all">
                           <img src={grid.grid_image_path} alt="Grid" className="w-full h-auto" />
                           <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button className="p-2 bg-[#020617]/80 backdrop-blur rounded-lg border border-slate-700 hover:text-emerald-400 transition-colors">
                                 <Maximize2 className="w-4 h-4" />
                              </button>
                               <button className="p-2 bg-[#020617]/80 backdrop-blur rounded-lg border border-slate-700 hover:text-emerald-400 transition-colors">
                                 <MoreVertical className="w-4 h-4" />
                              </button>
                           </div>
                           <div className="p-4 bg-slate-900/60 backdrop-blur-sm border-t border-slate-800 flex justify-between items-center">
                              <div>
                                 <p className="text-xs font-bold text-white uppercase">{grid.grid_size} Matrix</p>
                                 <p className="text-[10px] text-slate-500">{new Date(grid.metadata.created_at as string).toLocaleDateString()}</p>
                              </div>
                              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter">Verified Consistency</span>
                           </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'refinement' && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-20 space-y-6">
                   <div className="w-20 h-20 bg-violet-600/20 rounded-2xl flex items-center justify-center border border-violet-500/30">
                      <Wand2 className="w-10 h-10 text-violet-400 animate-pulse" />
                   </div>
                   <div className="max-w-md">
                      <h3 className="text-xl font-bold text-white mb-2 uppercase italic tracking-wider">AI Character Refiner</h3>
                      <p className="text-sm text-slate-400 leading-relaxed mb-6">
                        Discutez avec l'Assistant Artistique pour modifier des détails précis de l'identité sans perdre le visage (ex: "ajoute des lunettes", "fais-le paraître plus vieux").
                      </p>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Instructions de raffinement..." 
                          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-violet-500 outline-none"
                        />
                        <button className="p-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-all shadow-lg shadow-violet-500/20">
                           <RefreshCw className="w-5 h-5" />
                        </button>
                      </div>
                   </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
