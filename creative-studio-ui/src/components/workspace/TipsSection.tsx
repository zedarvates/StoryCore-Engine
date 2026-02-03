/**
 * Tips Section Component
 * 
 * Displays tips and tricks for new users
 * Extracted from ProjectDashboardNew.tsx for better modularity
 */

import React, { memo } from 'react';
import { Globe, Users, BookOpen, Film, Sparkles } from 'lucide-react';

interface TipsSectionProps {
  className?: string;
}

/**
 * TipsSection - Memoized to prevent unnecessary re-renders
 */
export const TipsSection = memo(function TipsSection({ className }: TipsSectionProps) {
  return (
    <div className={`tips-section ${className || ''}`}>
      <div className="tips-header">
        <Sparkles className="w-5 h-5" />
        <h3>Tips & Tricks</h3>
      </div>
      <div className="tips-content">
        <p className="tips-intro">
          For a better experience after creating a new project, follow this recommended procedure: 1/project Setup - 2/ World Building - 3/ Character Creation - 4/ Story Generation - 5/ Shot Planning.
        </p>
        
      </div>
    </div>
  );
});

