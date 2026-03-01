import React, { useEffect, useState } from 'react';
import { 
  User, 
  Lock, 
  Unlock, 
  RefreshCw, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Camera, 
  Search
} from 'lucide-react';
import { useIdentityLockStore } from '@/stores/identityLockStore';
import { AnimatedSprite } from '@/types/sprite';

interface IdentityCastingPanelProps {
  selectedSprite: AnimatedSprite | null;
  projectId: string;
}

export const IdentityCastingPanel: React.FC<IdentityCastingPanelProps> = ({ 
  selectedSprite, 
  projectId 
}) => {
  const { 
    identities, 
    loading, 
    fetchIdentities, 
    createIdentity, 
    deleteIdentity, 
    extractAndLock, 
    unlockIdentity 
  } = useIdentityLockStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    fetchIdentities(projectId);
  }, [projectId, fetchIdentities]);

  const handleCreate = async () => {
    if (!newName) return;
    try {
      await createIdentity(newName, newDesc, projectId);
      setNewName('');
      setNewDesc('');
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create identity', error);
    }
  };

  const handleAssignSprite = async (identityId: string) => {
    if (!selectedSprite || !selectedSprite.source.url) return;
    
    // In a real app, the image path might need conversion from URL to local path
    const imagePath = selectedSprite.source.url;
    
    try {
      await extractAndLock(identityId, imagePath);
    } catch (error) {
      console.error('Failed to extract and lock identity', error);
    }
  };

  const filteredIdentities = identities.filter(i => 
    i.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#0f172a] text-slate-200">
      {/* Search & Actions */}
      <div className="p-3 border-b border-slate-700 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Rechercher une identité..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-md py-1.5 pl-8 pr-3 text-xs focus:ring-1 focus:ring-violet-500 outline-none"
          />
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="p-2 bg-violet-600 hover:bg-violet-500 rounded-md transition-colors"
          title="Nouvel acteur"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Identity List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {loading && identities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 opacity-50">
            <RefreshCw className="w-6 h-6 animate-spin mb-2" />
            <span className="text-xs">Chargement...</span>
          </div>
        ) : filteredIdentities.length === 0 ? (
          <div className="text-center py-10 opacity-30">
            <User className="w-10 h-10 mx-auto mb-2" />
            <p className="text-xs">Aucune identité trouvée</p>
          </div>
        ) : (
          filteredIdentities.map(identity => (
            <div 
              key={identity.id}
              className={`p-3 rounded-lg border transition-all ${
                identity.is_locked 
                  ? 'bg-slate-800/50 border-emerald-500/30' 
                  : 'bg-slate-800 border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                    {identity.is_locked ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <User className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">{identity.name}</h4>
                    <p className="text-[10px] text-slate-500 truncate w-32">
                      {identity.description || 'Pas de description'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => deleteIdentity(identity.id)}
                    className="p-1 hover:text-red-400 opacity-50 hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Status & Quick Actions */}
              <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {identity.is_locked ? (
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Verrouillé
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-400 flex items-center gap-1">
                      <Unlock className="w-3 h-3" /> Libre
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  {!identity.is_locked && selectedSprite && (
                    <button
                      onClick={() => handleAssignSprite(identity.id)}
                      className="px-2 py-1 bg-violet-600 hover:bg-violet-500 rounded text-[10px] flex items-center gap-1 transition-colors"
                      title="Utiliser ce sprite comme référence"
                    >
                      <Camera className="w-3 h-3" /> Verrouiller ID
                    </button>
                  )}
                  {identity.is_locked && (
                    <button
                      onClick={() => unlockIdentity(identity.id)}
                      className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-[10px] flex items-center gap-1 transition-colors"
                    >
                      <Unlock className="w-3 h-3" /> Libérer
                    </button>
                  )}
                </div>
              </div>

              {/* Attributes Preview if locked */}
              {identity.is_locked && (
                <div className="mt-2 grid grid-cols-2 gap-1">
                  {Object.entries(identity.visual_attributes)
                    .filter(([k, v]) => v && typeof v === 'string' && !['extraction_confidence', 'source_image_path'].includes(k))
                    .slice(0, 4)
                    .map(([k, v]) => (
                      <div key={k} className="bg-slate-900/50 px-1.5 py-0.5 rounded text-[9px] text-slate-400 flex justify-between">
                        <span className="opacity-50 uppercase">{k.replace('_', ' ')}</span>
                        <span className="text-violet-300 truncate w-16 text-right font-medium">{v as string}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Creation Modal / Form Overlay */}
      {showCreateForm && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-10 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-xs p-4 shadow-2xl">
            <h3 className="text-sm font-semibold mb-4">Nouvelle Identité</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Nom de l'Acteur</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Marcus, L'Eclaireur..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-md py-2 px-3 text-xs focus:ring-1 focus:ring-violet-500 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Description</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Style, rôle, notes..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-md py-2 px-3 text-xs h-20 focus:ring-1 focus:ring-violet-500 outline-none resize-none"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setShowCreateForm(false)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-md text-xs font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName}
                className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-xs font-medium transition-colors"
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
