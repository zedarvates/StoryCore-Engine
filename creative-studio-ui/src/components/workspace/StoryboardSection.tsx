import React from 'react';
import { StoryboardCanvas } from '../StoryboardCanvas';
import { Layout, Share2, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const StoryboardSection: React.FC = () => {
    return (
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/40 backdrop-blur-3xl shadow-2xl relative group h-[700px] flex flex-col">
            <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full pointer-events-none -z-10" />
            
            <div className="p-5 border-b border-white/5 bg-white/[0.03] flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/20">
                        <Layout className="w-4 h-4 text-primary" />
                     </div>
                     <div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 block mb-0.5 font-mono leading-none">Sequence Architecture</span>
                        <span className="text-xs font-bold text-white tracking-tight leading-none">Global Sequential Flow</span>
                     </div>
                </div>
                
                <div className="flex gap-2">
                    <div className="px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase tracking-widest border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
                        MANIFEST READY
                    </div>
                    <Button variant="ghost" size="sm" className="w-8 h-8 p-0 rounded-xl hover:bg-white/10 text-white/40 hover:text-white" title="Expand View">
                        <Maximize2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="w-8 h-8 p-0 rounded-xl hover:bg-white/10 text-white/40 hover:text-white" title="Export Storyboard">
                        <Share2 className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>
            
            <div className="flex-1 overflow-auto custom-scrollbar relative">
                {/* Integration of old-school grid but in a premium frame */}
                <div className="storyboard-canvas-wrapper absolute inset-0">
                    <StoryboardCanvas className="bg-transparent" />
                </div>
                
                {/* Subtle overlay gradients for depth */}
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
            </div>
            
            <style>{`
                .storyboard-canvas-wrapper .bg-gray-50 {
                    background: transparent !important;
                }
                .storyboard-canvas-wrapper .grid {
                    padding: 2rem !important;
                    gap: 1.5rem !important;
                }
                .storyboard-canvas-wrapper h3 {
                    color: rgba(255, 255, 255, 0.4) !important;
                }
                .storyboard-canvas-wrapper p {
                    color: rgba(255, 255, 255, 0.2) !important;
                }
                .storyboard-canvas-wrapper .bg-white {
                    background: rgba(255, 255, 255, 0.03) !important;
                    border: 1px solid rgba(255, 255, 255, 0.05) !important;
                    backdrop-filter: blur(8px) !important;
                }
                .storyboard-canvas-wrapper .text-gray-900 {
                    color: rgba(255, 255, 255, 0.9) !important;
                }
                .storyboard-canvas-wrapper .text-gray-600, 
                .storyboard-canvas-wrapper .text-gray-500 {
                    color: rgba(255, 255, 255, 0.4) !important;
                }
            `}</style>
        </div>
    );
};
