/**
 * Tips Section Component
 * 
 * Displays tips and tricks for new users
 * Extracted from ProjectDashboardNew.tsx for better modularity
 */

import React, { memo } from 'react';

interface TipsSectionProps {
  className?: string;
}

/**
 * TipsSection - Memoized to prevent unnecessary re-renders
 */
export const TipsSection = memo(function TipsSection({ className }: TipsSectionProps) {
  return (
    <div className={`tips-section ${className || ''}`}>
      <h3>Tips & Tricks</h3>
      <p>
        For a better experience after creating a new project, follow this recommended procedure:
      </p>
      <ol>
        <li><strong>Project Setup</strong></li>
        <li><strong>World Building</strong><br />Create the universe and context for your story</li>
        <li><strong>Character Creation</strong><br />Define your main and secondary characters</li>
        <li><strong>Story Generator + Global Resume</strong><br />Generate your story and create the global resume below</li>
        <li><strong>Shot Planning</strong><br />Plan your sequences and shots for production</li>
        <li><strong>Dialogues generations</strong></li>
        <li><strong>Prompt generations</strong></li>
      </ol>
    </div>
  );
});