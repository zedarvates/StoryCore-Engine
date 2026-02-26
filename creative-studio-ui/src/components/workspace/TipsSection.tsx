/**
 * Tips Section Component
 * 
 * Displays tips and tricks for new users
 * Extracted from ProjectDashboardNew.tsx for better modularity
 */

import React, { memo } from 'react';
import { Sparkles, Globe, Users, BookOpen, Film } from 'lucide-react';

interface TipsSectionProps {
  className?: string;
}

/**
 * TipsSection - Memoized to prevent unnecessary re-renders
 */
export const TipsSection = memo(function TipsSection({ className }: TipsSectionProps) {
  return (
    <div className={`tips-section compact-tips ${className || ''}`}>
      <div className="tips-header flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-amber-500" />
        <h3 className="text-lg font-black tracking-tight">Tips & Tricks</h3>
      </div>
      <div className="tips-content">
        <p className="tips-intro text-sm italic opacity-80 mb-4 px-2">
          4 Steps to Manifest Your Vision:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-2">
           <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              <Globe className="w-5 h-5 text-indigo-400 mb-2" />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">World</span>
           </div>
           <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              <Users className="w-5 h-5 text-purple-400 mb-2" />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Actors</span>
           </div>
           <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              <BookOpen className="w-5 h-5 text-amber-400 mb-2" />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Lore</span>
           </div>
           <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              <Film className="w-5 h-5 text-emerald-400 mb-2" />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Studio</span>
           </div>
        </div>
      </div>
    </div>
  );
});

export default TipsSection;