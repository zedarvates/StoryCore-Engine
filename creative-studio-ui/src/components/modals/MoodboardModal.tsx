import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Palette, 
  Sparkles, 
  Image as ImageIcon, 
  Video as VideoIcon,
  FileAudio,
  Box,
  FileText,
  Type, 
  Plus, 
  Trash2, 
  RefreshCw,
  Info
} from 'lucide-react';
import { Modal } from './Modal';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/useAppStore';
import { moodboardService } from '@/services/moodboardService';
import type { MoodboardData, MoodboardSuggestion, MoodboardReference } from '@/types/moodboard';
import { useToast } from '@/hooks/use-toast';
import { getImageDisplayUrl } from '@/services/imageStorageService';

interface MoodboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MoodboardModal: React.FC<MoodboardModalProps> = ({ isOpen, onClose }) => {
  const { 
    project,
    setProject 
  } = useAppStore();
  
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<MoodboardSuggestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'current' | 'suggestions'>('current');
  const [displayUrls, setDisplayUrls] = useState<Record<string, string>>({});

  const moodboard = project?.moodboard;

  // Initialize moodboard if it doesn't exist
  useEffect(() => {
    if (isOpen && project && !project.moodboard) {
      const emptyMoodboard = moodboardService.createEmptyMoodboard(project.id);
      setProject({
        ...project,
        moodboard: emptyMoodboard
      });
    }
  }, [isOpen, project, setProject]);

  const handleGenerateSuggestions = async () => {
    if (!project) return;
    
    setIsGenerating(true);
    try {
      // Cast project to any to avoid Asset vs AssetMetadata incompatibility for now
      // MoodboardService only uses a subset of fields
      const newSuggestions = await moodboardService.generateSuggestions(project as unknown as any);
      setSuggestions(newSuggestions);
      setActiveTab('suggestions');
      toast({
        title: "Propositions générées",
        description: `${newSuggestions.length} nouveaux styles ont été imaginés pour votre projet.`,
      });
    } catch (_error) {
      toast({
        title: "Erreur de génération",
        description: "Impossible de générer des suggestions pour le moment.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const applySuggestion = (suggestion: MoodboardSuggestion) => {
    if (!project || !project.moodboard) return;

    const updatedMoodboard: MoodboardData = {
      ...project.moodboard,
      vision: {
        ...project.moodboard.vision,
        ...suggestion.suggestedVision,
      },
      visualStyle: {
        ...project.moodboard.visualStyle,
        ...suggestion.suggestedStyle,
      },
      updatedAt: Date.now(),
    };

    setProject({
      ...project,
      moodboard: updatedMoodboard,
    });

    toast({
      title: "Style appliqué",
      description: `Le style "${suggestion.title}" a été intégré à votre moodboard.`,
    });
    setActiveTab('current');
  };

  const handleDeleteReference = (refId: string) => {
    if (!project || !project.moodboard) return;

    const updatedMoodboard: MoodboardData = {
      ...project.moodboard,
      references: project.moodboard.references.filter(r => r.id !== refId),
      updatedAt: Date.now(),
    };

    setProject({
      ...project,
      moodboard: updatedMoodboard,
    });

    toast({
      title: "Référence supprimée",
      description: "L'élément a été retiré de votre moodboard.",
    });
  };


  const renderReference = (ref: MoodboardReference) => {
    const url = displayUrls[ref.id] || ref.url;
    
    if (ref.type === 'video') {
       return (
         <div className="w-full h-full relative bg-black">
           <video src={url} className="w-full h-full object-cover" muted />
           <div className="absolute top-2 right-2 p-1 bg-black/50 rounded-md">
             <VideoIcon className="w-3 h-3 text-white" />
           </div>
         </div>
       );
    }

    if (ref.type === 'audio') {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-indigo-500/10 gap-2">
          <FileAudio className="w-8 h-8 text-indigo-400" />
          <span className="text-[8px] font-black uppercase tracking-widest text-indigo-400/60 truncate px-2 w-full text-center">
             {ref.note || 'Audio Reference'}
          </span>
        </div>
      );
    }

    if (ref.type === '3d') {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-amber-500/10 gap-2">
          <Box className="w-8 h-8 text-amber-400" />
          <span className="text-[8px] font-black uppercase tracking-widest text-amber-400/60 truncate px-2 w-full text-center">
             {ref.note || '3D Object'}
          </span>
        </div>
      );
    }

    if (ref.type === 'document') {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-500/10 gap-2">
          <FileText className="w-8 h-8 text-slate-400" />
          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400/60 truncate px-2 w-full text-center">
             {ref.note || 'Document'}
          </span>
        </div>
      );
    }

    if (ref.type === 'texture' || ref.type === 'pattern') {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-cyan-500/10 gap-2">
          <Palette className="w-8 h-8 text-cyan-400" />
          <span className="text-[8px] font-black uppercase tracking-widest text-cyan-400/60 truncate px-2 w-full text-center">
             {ref.note || (ref.type === 'texture' ? 'Texture' : 'Pattern')}
          </span>
        </div>
      );
    }

    return (
      <img 
        src={url} 
        className="w-full h-full object-cover" 
        alt={ref.note || "Reference"}
        onError={(e) => {
          (e.target as HTMLImageElement).src = 'https://placehold.co/400x400?text=Error';
        }}
      />
    );
  };

  useEffect(() => {
    if (!moodboard?.references || !project?.path) return;
    
    const projectPath = project.path;
    moodboard.references.forEach(async (ref) => {
      if (ref.url && !displayUrls[ref.id]) {
        try {
          const displayUrl = await getImageDisplayUrl(ref.url, projectPath);
          if (displayUrl) {
            setDisplayUrls(prev => ({ ...prev, [ref.id]: displayUrl }));
          }
        } catch (err) {
          console.error('[MoodboardModal] Error getting display URL:', err);
        }
      }
    });
  }, [moodboard?.references, project?.path, displayUrls]);

  if (!project) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Atelier Créatif & Moodboard"
      size="xl"
    >
      <div className="flex flex-col h-[70vh]">
        {/* Navigation Tabs */}
        <div className="flex space-x-4 mb-6 border-b border-gray-100 dark:border-gray-800 pb-2">
          <button
            onClick={() => setActiveTab('current')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'current' 
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Ma Vision
          </button>
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`px-4 py-2 rounded-lg transition-all flex items-center space-x-2 ${
              activeTab === 'suggestions' 
                ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-medium' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Propositions IA</span>
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {activeTab === 'current' ? (
              <motion.div
                key="current"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full p-1 scrollbar-thin overflow-y-auto"
              >
                {/* Visual Style Panel */}
                <div className="space-y-6 md:col-span-2">
                  <section className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                        <Palette className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h3 className="text-lg font-semibold">Style Visuel</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-500">Direction Artistique</label>
                        <div className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                          {moodboard?.visualStyle.artStyle || 'Non défini'}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-500">Palette</label>
                        <div className="flex space-x-2">
                          {moodboard?.visualStyle.colorPalette.map((color, i) => (
                            <div 
                              key={i} 
                              className="w-8 h-8 rounded-full border border-black/10 ring-2 ring-white dark:ring-gray-800 shadow-sm"
                              style={{ backgroundColor: color } as React.CSSProperties}
                              title={color}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 space-y-2">
                      <label className="text-sm font-medium text-gray-500">Description de la Vision</label>
                      <p className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 italic text-gray-600 dark:text-gray-400">
                        {moodboard?.vision.description || "Aucune description pour le moment. Utilisez l'IA pour en générer une !"}
                      </p>
                    </div>
                  </section>

                  {/* Reference Grid */}
                  <section className="space-y-4">
                    {/* Hidden file input for adding references */}
                    <input 
                      type="file" 
                      id="moodboard-file-input"
                      className="hidden" 
                      aria-label="Upload moodboard reference"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !project || !project.moodboard) return;
                        
                        try {
                          // In a real Electron app, we would copy the file to the project assets
                          // For now, we simulate by creating a blob URL and a reference
                          const extension = file.name.split('.').pop()?.toLowerCase() || '';
                          let type: MoodboardReference['type'] = 'image';
                          
                          if (['mp4', 'webm', 'mov'].includes(extension)) type = 'video';
                          else if (['mp3', 'wav', 'ogg'].includes(extension)) type = 'audio';
                          else if (['obj', 'fbx', 'glb', 'gltf'].includes(extension)) type = '3d';
                          else if (['pdf', 'doc', 'docx', 'txt'].includes(extension)) type = 'document';
                          
                          const newRef: MoodboardReference = {
                            id: `ref-${Date.now()}`,
                            url: URL.createObjectURL(file), // Mock URL
                            type,
                            note: file.name,
                            source: 'upload'
                          };
                          
                          const updatedMoodboard: MoodboardData = {
                            ...project.moodboard,
                            references: [...project.moodboard.references, newRef],
                            updatedAt: Date.now()
                          };
                          
                          setProject({
                            ...project,
                            moodboard: updatedMoodboard
                          });
                          
                          toast({
                            title: "Fichier ajouté",
                            description: `Votre référence "${file.name}" a été ajoutée.`
                          });
                        } catch (_err) {
                           toast({
                            title: "Erreur d'ajout",
                            description: "Impossible d'ajouter ce fichier.",
                            variant: "destructive"
                          });
                        }
                      }}
                    />

                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold flex items-center space-x-2">
                        <ImageIcon className="w-5 h-5" />
                        <span>Références Visuelles</span>
                      </h3>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="rounded-full" 
                        title="Ajouter une référence"
                        onClick={() => document.getElementById('moodboard-file-input')?.click()}
                        aria-label="Ajouter une référence"
                      >
                        <Plus className="w-4 h-4 mr-2" /> Ajouter
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {moodboard?.references.length === 0 ? (
                        <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl opacity-50">
                          <ImageIcon className="w-8 h-8 mb-2" />
                          <p className="text-sm">Glissez des images ici</p>
                        </div>
                      ) : (
                        moodboard?.references.map(ref => (
                          <div key={ref.id} className="group relative aspect-square rounded-xl overflow-hidden shadow-sm border border-white/5 bg-white/[0.02]">
                            {renderReference(ref)}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button 
                                className="p-2 bg-red-500 text-white rounded-full hover:scale-110 transition-transform" 
                                title="Supprimer la référence"
                                onClick={() => handleDeleteReference(ref.id)}
                                aria-label="Supprimer la référence"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                  <section className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-2xl border border-purple-100 dark:border-purple-800/30">
                    <h4 className="text-purple-700 dark:text-purple-300 font-semibold mb-3 flex items-center space-x-2">
                      <Sparkles className="w-4 h-4" />
                      <span>Boost IA</span>
                    </h4>
                    <p className="text-sm text-purple-600/80 dark:text-purple-400/80 mb-4">
                      StoryCore peut analyser votre projet pour proposer une direction artistique sur-mesure.
                    </p>
                    <Button 
                      onClick={handleGenerateSuggestions}
                      disabled={isGenerating}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-lg ring-4 ring-purple-600/10"
                    >
                      {isGenerating ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      Imaginer mon Style
                    </Button>
                  </section>

                  <section className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
                    <h4 className="font-semibold mb-3 flex items-center space-x-2">
                      <Type className="w-4 h-4" />
                      <span>Typographies</span>
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Titres</p>
                        <p className="text-xl font-bold" style={{ fontFamily: moodboard?.visualStyle.typography.headers } as React.CSSProperties}>
                          {moodboard?.visualStyle.typography.headers || 'Outfit'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Corps de texte</p>
                        <p className="text-base" style={{ fontFamily: moodboard?.visualStyle.typography.body } as React.CSSProperties}>
                          {moodboard?.visualStyle.typography.body || 'Inter'}
                        </p>
                      </div>
                    </div>
                  </section>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="suggestions"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full flex flex-col"
              >
                {suggestions.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-4">
                    <div className="w-24 h-24 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                      <Sparkles className="w-10 h-10 text-purple-600 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold mb-2">Prêt pour l'inspiration ?</h3>
                      <p className="text-gray-500 max-w-sm mx-auto">
                        Notre IA analyse vos personnages et votre monde pour concocter des directions artistiques uniques.
                      </p>
                    </div>
                    <Button 
                      size="lg" 
                      onClick={handleGenerateSuggestions}
                      disabled={isGenerating}
                      className="bg-purple-600 text-white px-8 rounded-full"
                    >
                      {isGenerating ? 'Analyse en cours...' : 'Lancer l\'imaginaire'}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col space-y-6 overflow-y-auto scrollbar-thin pr-2">
                    {suggestions.map((suggestion) => (
                      <div 
                        key={suggestion.id}
                        className="group flex flex-col md:flex-row bg-white dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden hover:shadow-2xl hover:border-purple-300 dark:hover:border-purple-800/50 transition-all duration-300"
                      >
                        <div className="md:w-1/3 bg-gray-100 dark:bg-gray-800 flex items-center justify-center p-8 bg-gradient-to-br from-purple-500/10 to-blue-500/10">
                          <div className="relative">
                            <div className="grid grid-cols-3 gap-2">
                              {suggestion.suggestedStyle.colorPalette?.map((color, i) => (
                                <div 
                                  key={i} 
                                  className="w-12 h-12 rounded-2xl shadow-lg ring-4 ring-white dark:ring-gray-900" 
                                  style={{ backgroundColor: color } as React.CSSProperties}
                                  title={color}
                                />
                              ))}
                            </div>
                            <div className="mt-4 p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-2xl text-center border border-white dark:border-gray-800 shadow-xl">
                              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Style</p>
                              <p className="font-semibold text-purple-600 dark:text-purple-400">
                                {suggestion.suggestedStyle.artStyle}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex-1 p-8 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{suggestion.title}</h3>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="rounded-full flex items-center space-x-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 border-none"
                                title="Pourquoi ce style ?"
                              >
                                <Info className="w-3 h-3" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Pourquoi ?</span>
                              </Button>
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3 leading-relaxed">
                              {suggestion.description}
                            </p>
                            <div className="flex items-start space-x-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                              <div className="p-1 bg-white dark:bg-gray-800 rounded-full">
                                <Sparkles className="w-3 h-3 text-purple-500" />
                              </div>
                              <p className="text-xs text-gray-500 italic">
                                "{suggestion.reasoning}"
                              </p>
                            </div>
                          </div>

                          <div className="mt-8 flex justify-end space-x-3">
                            <Button 
                              onClick={() => applySuggestion(suggestion)}
                              className="bg-gray-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-full px-8 py-6 h-auto"
                            >
                              Adopter ce Style
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
           </AnimatePresence>
        </div>
      </div>
    </Modal>
  );
};
