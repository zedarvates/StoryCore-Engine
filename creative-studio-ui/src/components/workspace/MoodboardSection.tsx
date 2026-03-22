import React from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { Palette, Share2, Wand2, FileAudio, Box, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getImageDisplayUrl } from '@/services/imageStorageService';
import { useState, useEffect } from 'react';

export const MoodboardSection: React.FC = () => {
    const project = useAppStore(state => state.project);
    const moodboard = project?.moodboard;

    const [displayUrls, setDisplayUrls] = useState<Record<string, string>>({});

    useEffect(() => {
        if (moodboard?.references && project?.path) {
            moodboard.references.forEach(async (ref) => {
                if (ref.url && !displayUrls[ref.id]) {
                    const displayUrl = await getImageDisplayUrl(ref.url, project.path);
                    if (displayUrl) {
                        setDisplayUrls(prev => ({ ...prev, [ref.id]: displayUrl }));
                    }
                }
            });
        }
    }, [moodboard?.references, project?.path, displayUrls]);

    if (!moodboard) {
        return (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-white/5 rounded-2xl border border-white/10">
                <Palette className="w-12 h-12 text-white/20 mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">Configure Your Vision</h3>
                <p className="text-sm text-white/40 max-w-sm mb-6">
                    A moodboard helps maintain visual consistency across your project. Define your style, colors, and references here.
                </p>
                <Button 
                    variant="outline" 
                    className="border-primary/20 hover:bg-primary/10 text-primary font-black uppercase tracking-widest text-[10px]"
                    onClick={() => useAppStore.getState().setShowMoodboardModal(true)}
                >
                    <Wand2 className="w-4 h-4 mr-2" />
                    Open Moodboard Designer
                </Button>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-8">
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-black text-white tracking-tighter">
                            {moodboard.vision?.tone || 'Visual Manifest'}
                        </h3>
                        <div className="flex gap-2">
                              {moodboard.visualStyle?.artStyle && (
                                <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
                                    {moodboard.visualStyle.artStyle}
                                </div>
                             )}
                        </div>
                    </div>
                    <p className="text-sm text-white/60 leading-relaxed italic border-l-2 border-primary/30 pl-4 py-1">
                        {moodboard.vision?.description || 'The soul of this project is waiting to be defined. Use the moodboard to sync your visual concepts.'}
                    </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {moodboard.references && moodboard.references.length > 0 ? moodboard.references.map((ref, idx) => {
                        const url = displayUrls[ref.id] || ref.url;
                        return (
                          <div key={ref.id || idx} className="aspect-square rounded-2xl overflow-hidden border border-white/5 group relative shadow-2xl bg-white/[0.02]">
                              {ref.type === 'video' ? (
                                  <video src={url} className="w-full h-full object-cover" muted />
                              ) : ref.type === 'audio' ? (
                                  <div className="w-full h-full flex items-center justify-center">
                                      <FileAudio className="w-8 h-8 text-indigo-400/40" />
                                  </div>
                              ) : ref.type === '3d' ? (
                                  <div className="w-full h-full flex items-center justify-center">
                                      <Box className="w-8 h-8 text-amber-400/40" />
                                  </div>
                              ) : ref.type === 'document' ? (
                                  <div className="w-full h-full flex items-center justify-center">
                                      <FileText className="w-8 h-8 text-slate-400/40" />
                                  </div>
                              ) : (
                                  <img 
                                      src={url} 
                                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                      alt={ref.note || ""} 
                                  />
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                                  <div className="flex flex-col">
                                      <p className="text-[9px] font-bold text-white/90 leading-tight line-clamp-2 uppercase tracking-tighter">
                                          {ref.note || 'Reference Frame'}
                                      </p>
                                      {ref.type !== 'image' && (
                                          <span className="text-[7px] text-white/40 uppercase font-black tracking-widest mt-1">
                                              {ref.type}
                                          </span>
                                      )}
                                  </div>
                              </div>
                          </div>
                      );
                    }) : (
                         Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="aspect-square rounded-2xl bg-white/[0.02] border border-dashed border-white/10 flex items-center justify-center">
                                <Palette className="w-6 h-6 text-white/5" />
                            </div>
                         ))
                    )}
                </div>
            </div>

            <div className="space-y-6">
                <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 backdrop-blur-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[40px] rounded-full pointer-events-none" />
                    
                    <div className="relative z-10 space-y-6">
                        <div>
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-4">Color Palette</h4>
                            <div className="flex flex-wrap gap-3">
                                {moodboard.visualStyle?.colorPalette && moodboard.visualStyle.colorPalette.length > 0 ? moodboard.visualStyle.colorPalette.map((color, idx) => (
                                    <div 
                                        key={idx} 
                                        className="w-10 h-10 rounded-2xl border border-white/20 shadow-xl hover:scale-110 transition-transform cursor-help" 
                                        style={{ backgroundColor: color } as React.CSSProperties}
                                        title={color}
                                    />
                                )) : (
                                    <div className="text-[10px] text-white/20 italic uppercase tracking-widest py-2">No palette defined</div>
                                )}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/5">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-3">Project Alignment</h4>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] text-white/40 uppercase font-bold">Visual Coherence</span>
                                    <span className="text-[10px] text-emerald-400 font-mono">92%</span>
                                </div>
                                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary/40 w-[92%]" />
                                </div>
                            </div>
                        </div>

                        <Button 
                            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black uppercase tracking-widest text-[9px] h-10"
                            onClick={() => useAppStore.getState().setShowMoodboardModal(true)}
                        >
                            <Share2 className="w-3.5 h-3.5 mr-2" />
                            Collaborate / Edit
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
