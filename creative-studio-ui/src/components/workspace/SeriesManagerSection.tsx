import React, { useEffect, useState } from 'react';
import { Plus, Play, Clock, CheckCircle2, MoreVertical, Layout, Sparkles } from 'lucide-react';
import { useEpisodeStore } from '@/stores/episodeStore';
import { useAppStore } from '@/stores/useAppStore';
import { Episode } from '@/types';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/components/NotificationSystem';

export interface SeriesManagerSectionProps {
  hideHeader?: boolean;
}

export function SeriesManagerSection({ hideHeader = false }: SeriesManagerSectionProps) {
  const project = useAppStore((state) => state.project);
  const { episodes, activeEpisodeId, fetchEpisodes, addEpisode, setActiveEpisode } = useEpisodeStore();
  const { showSuccess } = useNotifications();
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (project?.id) {
       fetchEpisodes(project.id);
    }
  }, [project?.id, fetchEpisodes]);

  const handleCreateEpisode = async () => {
    if (!project?.id) return;
    setIsCreating(true);
    
    // Auto-increment episode number
    const nextNumber = episodes.length > 0 
      ? Math.max(...episodes.map(e => e.number)) + 1 
      : 1;
      
    await addEpisode({
      project_id: project.id,
      title: `Episode ${nextNumber}`,
      number: nextNumber,
      status: 'draft',
      synopsis: 'New episode summary...'
    } as Episode);
    
    setIsCreating(false);
    showSuccess(`Episode ${nextNumber} initialized.`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'storyboard': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'production': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'final': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (!project) return null;

  return (
    <div className="series-manager-section space-y-8">
      {!hideHeader && (
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 bg-white/[0.02] border border-white/5 rounded-3xl backdrop-blur-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full -mr-20 -mt-20 group-hover:bg-indigo-500/10 transition-colors pointer-events-none" />
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex flex-col items-center justify-center border border-indigo-500/30 shadow-inner">
                <span className="text-[10px] font-black text-indigo-400/60 uppercase leading-none mb-1">LVL</span>
                <span className="text-xl font-black text-indigo-400 leading-none">{Math.floor(episodes.length / 3) + 1}</span>
            </div>
            <div>
                <h3 className="text-lg font-black uppercase tracking-widest text-white leading-none mb-2">Project Saga: Manifestation Quest</h3>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-48 bg-white/5 rounded-full overflow-hidden border border-white/10 p-[1px]">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000" 
                        style={{ width: `${(episodes.length % 3) * 33.3 || 10}%` }}
                      />
                  </div>
                  <span className="text-[9px] text-indigo-400 font-black uppercase tracking-[0.2em]">Exp: {episodes.length % 3}/3</span>
                </div>
            </div>
          </div>
          
          <button 
            onClick={handleCreateEpisode}
            disabled={isCreating}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-indigo-500/30 border border-indigo-400/50 hover:scale-105 active:scale-95"
            title="Create a new chapter in your saga"
          >
            <Plus size={16} />
            <span>Initialize Chapter</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence mode="popLayout">
          {episodes.map((ep) => (
            <motion.div
              key={ep.id}
              layout
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="h-full"
            >
              <GlassCard 
                intensity="low" 
                className={cn(
                  "group relative h-full border-white/5 hover:border-indigo-500/50 transition-all cursor-pointer overflow-hidden p-0",
                  activeEpisodeId === ep.id && "ring-2 ring-indigo-500/50 bg-indigo-500/5 shadow-[0_0_30px_rgba(99,102,241,0.1)]"
                )}
                onClick={() => setActiveEpisode(ep.id || null)}
              >
                <div className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                       <span className="text-3xl font-black text-white/5 group-hover:text-indigo-500/20 transition-colors italic tracking-tighter">
                          {String(ep.number).padStart(2, '0')}
                       </span>
                       <div>
                          <h4 className="font-black text-white text-xs uppercase tracking-widest group-hover:text-indigo-400 transition-colors">{ep.title}</h4>
                          <Badge className={cn("text-[8px] uppercase font-black py-0.5 mt-1 border", getStatusColor(ep.status))}>
                             {ep.status}
                          </Badge>
                       </div>
                    </div>
                    <div className="flex items-center gap-1">
                       <button className="p-1.5 rounded-lg hover:bg-white/5 text-white/20 hover:text-white transition-colors" title="Episode Options">
                          <MoreVertical size={14} />
                       </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-white/50 line-clamp-2 italic mb-6 leading-relaxed">
                    {ep.synopsis || "Unfold this chapter's destiny by defining its narrative scope."}
                  </p>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[8px] font-black text-white/30 uppercase tracking-widest letters-spacing-1.5">Mastery Level</span>
                        <span className="text-[9px] font-bold text-indigo-400">{ep.status === 'final' ? '100 %' : ep.status === 'production' ? '65 %' : ep.status === 'storyboard' ? '30 %' : '15 %'}</span>
                      </div>
                      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-1000",
                            ep.status === 'final' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 
                            ep.status === 'production' ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 
                            'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.3)]'
                          )}
                          style={{ width: ep.status === 'final' ? '100%' : ep.status === 'production' ? '65%' : ep.status === 'storyboard' ? '30%' : '15%' }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                       <div className="flex items-center gap-2 text-[9px] text-white/30 font-bold uppercase tracking-tighter">
                          <Clock size={10} />
                          <span>Updated {ep.updated_at ? new Date(ep.updated_at).toLocaleDateString() : 'New'}</span>
                       </div>
                       
                       <div className="flex items-center gap-1">
                          <button className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-all border border-indigo-500/20" title="Storyboard Manifest">
                             <Layout size={12} />
                          </button>
                          <button className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all border border-emerald-500/20" title="Final Manifestation">
                             <Play size={12} className="fill-emerald-400/20" />
                          </button>
                       </div>
                    </div>
                  </div>
                </div>

                {activeEpisodeId === ep.id && (
                  <div className="absolute top-0 right-0 w-8 h-8 bg-indigo-500 flex items-center justify-center rounded-bl-2xl shadow-lg animate-in fade-in zoom-in duration-300">
                     <CheckCircle2 size={16} className="text-white" />
                  </div>
                )}
              </GlassCard>
            </motion.div>
          ))}
        </AnimatePresence>

        {episodes.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center bg-white/[0.02] rounded-3xl border border-dashed border-white/10 group hover:border-indigo-500/30 transition-colors">
             <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Sparkles className="text-white/20 group-hover:text-indigo-400 transition-colors" />
             </div>
             <p className="text-xs font-bold text-white/30 uppercase tracking-[0.2em]">Start your serialized saga</p>
             <button 
                onClick={handleCreateEpisode}
                className="mt-4 text-xs font-black text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest"
             >
                + Initialize Pilot Episode
             </button>
          </div>
        )}
      </div>
    </div>
  );
}
