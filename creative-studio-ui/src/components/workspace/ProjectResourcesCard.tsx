import React, { useState, useEffect } from 'react';
import { Folder, FileJson, Info, RefreshCw, Layers, Sparkles } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { cn } from '@/lib/utils';
import { GlassCard } from '@/components/ui/GlassCard';

/**
 * ProjectResourcesCard
 * 
 * Shows a summary of files in /metadata and /prompts folders.
 * Resolves "dossier prompts metadata non exploiter"
 */
export function ProjectResourcesCard() {
  const project = useAppStore((state) => state.project);
  const [metadataFiles, setMetadataFiles] = useState<string[]>([]);
  const [promptFiles, setPromptFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadFiles = React.useCallback(async () => {
    if (!window.electronAPI?.fs || !project?.path) return;
    
    setIsLoading(true);
    try {
      const metadataDir = `${project.path}/metadata`;
      const promptsDir = `${project.path}/prompts`;

      const mExists = await window.electronAPI.fs.exists(metadataDir);
      if (mExists) {
        const files = await window.electronAPI.fs.readdir(metadataDir);
        setMetadataFiles(files.filter(f => f.endsWith('.json')));
      }

      const pExists = await window.electronAPI.fs.exists(promptsDir);
      if (pExists) {
        const files = await window.electronAPI.fs.readdir(promptsDir);
        setPromptFiles(files.filter(f => f.endsWith('.json')));
      }
    } catch (error) {
      console.error('[ProjectResourcesCard] Failed to read directories:', error);
    } finally {
      setIsLoading(false);
    }
  }, [project?.path]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  if (!project) return null;

  return (
    <GlassCard intensity="low" className="p-4 space-y-4 border-white/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Folder className="w-4 h-4 text-amber-400/60" />
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white/60">Project Resources</h3>
        </div>
        <button 
          onClick={loadFiles} 
          disabled={isLoading}
          className="p-1 hover:bg-white/5 rounded-full transition-colors"
          title="Refresh resources"
        >
          <RefreshCw className={cn("w-3 h-3 text-white/20", isLoading && "animate-spin")} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Metadata Folder */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
            <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Metadata Artifacts ({metadataFiles.length})</span>
          </div>
          
          {metadataFiles.length === 0 ? (
            <div className="px-3 py-6 rounded-lg border border-dashed border-white/5 bg-white/[0.02] flex flex-col items-center justify-center gap-2">
              <Layers className="w-5 h-5 text-white/10" />
              <span className="text-[9px] text-white/20 italic">No metadata discovered in sector</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {metadataFiles.map(f => (
                <div 
                  key={f} 
                  className="group relative flex flex-col items-center justify-center p-3 bg-gradient-to-br from-white/[0.05] to-transparent rounded-lg border border-white/10 hover:border-indigo-500/50 hover:bg-white/[0.08] transition-all duration-300 cursor-pointer overflow-hidden"
                >
                  <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <FileJson className="w-6 h-6 text-indigo-400/40 group-hover:text-indigo-400 group-hover:scale-110 transition-all duration-300 mb-2" />
                  <span className="text-[9px] font-medium text-white/60 group-hover:text-white text-center truncate w-full px-1">
                    {f.replace('.json', '')}
                  </span>
                  <div className="mt-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse" />
                    <span className="text-[7px] uppercase font-bold text-indigo-400/80">Active</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Prompts Folder */}
        <div className="space-y-3 pt-4 border-t border-white/5">
          <div className="flex items-center gap-2 px-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Neural Prompts ({promptFiles.length})</span>
          </div>
          
          {promptFiles.length === 0 ? (
            <div className="px-3 py-6 rounded-lg border border-dashed border-white/5 bg-white/[0.02] flex flex-col items-center justify-center gap-2">
              <Info className="w-5 h-5 text-white/10" />
              <span className="text-[9px] text-white/20 italic">No prompt buffers initialized</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {promptFiles.map(f => (
                <div 
                  key={f} 
                  className="group relative flex flex-col items-center justify-center p-3 bg-gradient-to-br from-white/[0.05] to-transparent rounded-lg border border-white/10 hover:border-emerald-500/50 hover:bg-white/[0.08] transition-all duration-300 cursor-pointer overflow-hidden"
                >
                  <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Sparkles className="w-6 h-6 text-emerald-400/40 group-hover:text-emerald-400 group-hover:scale-110 transition-all duration-300 mb-2" />
                  <span className="text-[9px] font-medium text-white/60 group-hover:text-white text-center truncate w-full px-1">
                    {f.replace('.json', '')}
                  </span>
                  <div className="mt-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[7px] uppercase font-bold text-emerald-400/80">Ready</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
