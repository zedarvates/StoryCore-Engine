/**
 * GhostTrackerTips Component
 * 
 * Displays random tips for the Ghost Tracker wizard user.
 * Tips cycle randomly when displayed to provide helpful guidance.
 */

import React, { useState, useEffect } from 'react';
import { Lightbulb, RefreshCw, ChevronRight, X } from 'lucide-react';
import './GhostTrackerTips.css';

interface GhostTrackerTipsProps {
  onTipClick?: (tip: GhostTrackerTip) => void;
  maxTips?: number;
  autoRotate?: boolean;
  autoRotateInterval?: number;
}

export interface GhostTrackerTip {
  id: string;
  title: string;
  content: string;
  category: 'continuity' | 'analysis' | 'optimization' | 'workflow' | 'quality';
  icon?: string;
}

/**
 * Ghost Tracker Tips Data
 * Random tips to help users get the most out of the Ghost Tracker wizard
 */
export const GHOST_TRACKER_TIPS: GhostTrackerTip[] = [
  // Continuity Tips
  {
    id: 'cont-1',
    title: 'Character Consistency',
    content: 'Ensure characters wear the same clothing and have consistent appearances across shots for better tracking results.',
    category: 'continuity',
    icon: '👤'
  },
  {
    id: 'cont-2',
    title: 'Prop Tracking',
    content: 'Props that appear in multiple shots should maintain consistent position and orientation for continuity.',
    category: 'continuity',
    icon: '🎬'
  },
  {
    id: 'cont-3',
    title: 'Lighting Consistency',
    content: 'Maintain consistent lighting direction and intensity across shots to avoid continuity errors.',
    category: 'continuity',
    icon: '💡'
  },
  {
    id: 'cont-4',
    title: 'Background Awareness',
    content: 'Watch for background elements that might change between shots, like furniture or decorations.',
    category: 'continuity',
    icon: '🏠'
  },
  
  // Analysis Tips
  {
    id: 'ana-1',
    title: 'Multi-Shot Analysis',
    content: 'Analyze at least 5-10 shots for accurate continuity detection and pattern recognition.',
    category: 'analysis',
    icon: '🔍'
  },
  {
    id: 'ana-2',
    title: 'Detailed Descriptions',
    content: 'Provide detailed shot descriptions to help the Ghost Tracker identify elements more accurately.',
    category: 'analysis',
    icon: '📝'
  },
  {
    id: 'ana-3',
    title: 'Anomaly Detection Mode',
    content: 'Use Anomaly Detection mode to find unusual visual elements or unexpected changes in your sequence.',
    category: 'analysis',
    icon: '⚡'
  },
  {
    id: 'ana-4',
    title: 'Motion Patterns',
    content: 'The Motion Analysis mode helps track character movement and camera work across shots.',
    category: 'analysis',
    icon: '🏃'
  },
  
  // Optimization Tips
  {
    id: 'opt-1',
    title: 'Quality Assurance First',
    content: 'Run Quality Assurance mode first to get a comprehensive overview of your project health.',
    category: 'optimization',
    icon: '✅'
  },
  {
    id: 'opt-2',
    title: 'Prioritize Issues',
    content: 'Focus on critical and major issues first - these have the biggest impact on your final output.',
    category: 'optimization',
    icon: '🎯'
  },
  {
    id: 'opt-3',
    title: 'Fix Before Export',
    content: 'Resolve all critical continuity issues before exporting your final video for best results.',
    category: 'optimization',
    icon: '📤'
  },
  {
    id: 'opt-4',
    title: 'Confidence Scores',
    content: 'Lower confidence scores indicate areas that need your personal review and verification.',
    category: 'optimization',
    icon: '📊'
  },
  
  // Workflow Tips
  {
    id: 'wf-1',
    title: 'Run After Major Changes',
    content: 'Use Ghost Tracker after any major changes to track new issues or improvements.',
    category: 'workflow',
    icon: '🔄'
  },
  {
    id: 'wf-2',
    title: 'Iterative Process',
    content: 'Ghost Tracker works best as part of an iterative workflow - analyze, fix, then re-analyze.',
    category: 'workflow',
    icon: '🔁'
  },
  {
    id: 'wf-3',
    title: 'Combine with Other Wizards',
    content: 'Use Ghost Tracker together with Shot Planning for comprehensive project quality.',
    category: 'workflow',
    icon: '🤝'
  },
  {
    id: 'wf-4',
    title: 'Regular Checkpoints',
    content: 'Run Ghost Tracker at key milestones to catch issues early when they\'re easier to fix.',
    category: 'workflow',
    icon: '📍'
  },
  
  // Quality Tips
  {
    id: 'qual-1',
    title: 'Coverage Target',
    content: 'Aim for 70%+ element coverage to ensure comprehensive tracking across your project.',
    category: 'quality',
    icon: '📈'
  },
  {
    id: 'qual-2',
    title: 'Detailed Shot Info',
    content: 'The more detail you provide in shot descriptions, the more accurate the tracking results.',
    category: 'quality',
    icon: '✨'
  },
  {
    id: 'qual-3',
    title: 'Review Recommendations',
    content: 'Always review the wizard\'s recommendations - they\'re based on best practices.',
    category: 'quality',
    icon: '💎'
  },
  {
    id: 'qual-4',
    title: 'Score Interpretation',
    content: 'A score above 8/10 indicates excellent project quality with few issues to address.',
    category: 'quality',
    icon: '🏆'
  }
];

/**
 * Get a random tip from the collection
 */
export function getRandomTip(): GhostTrackerTip {
  const randomIndex = Math.floor(Math.random() * GHOST_TRACKER_TIPS.length);
  return GHOST_TRACKER_TIPS[randomIndex];
}

/**
 * Get multiple random tips (without duplicates)
 */
export function getRandomTips(count: number, excludeIds: string[] = []): GhostTrackerTip[] {
  const available = GHOST_TRACKER_TIPS.filter(tip => !excludeIds.includes(tip.id));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Get tips by category
 */
export function getTipsByCategory(category: GhostTrackerTip['category']): GhostTrackerTip[] {
  return GHOST_TRACKER_TIPS.filter(tip => tip.category === category);
}

export function GhostTrackerTips({
  onTipClick,
  maxTips = 3,
  autoRotate = true,
  autoRotateInterval = 8000
}: GhostTrackerTipsProps) {
  const [displayedTips, setDisplayedTips] = useState<GhostTrackerTip[]>([]);
  const [isRotating, setIsRotating] = useState(false);
  const [showAllTips, setShowAllTips] = useState(false);

  // Initialize with random tips
  useEffect(() => {
    setDisplayedTips(getRandomTips(maxTips));
  }, [maxTips]);

  // Auto-rotate tips if enabled
  useEffect(() => {
    if (!autoRotate || showAllTips) return;

    const interval = setInterval(() => {
      setIsRotating(true);
      setDisplayedTips(prev => {
        // Replace one random tip with a new one
        const keepCount = Math.max(1, maxTips - 1);
        const keptTips = prev.slice(0, keepCount);
        const existingIds = [...keptTips.map(t => t.id), ...prev.slice(keepCount).map(t => t.id)];
        const newTip = getRandomTip();
        
        // Make sure new tip is not duplicate
        if (existingIds.includes(newTip.id)) {
          const available = GHOST_TRACKER_TIPS.filter(t => !existingIds.includes(t.id));
          if (available.length > 0) {
            const shuffled = [...available].sort(() => Math.random() - 0.5);
            return [...keptTips, shuffled[0]];
          }
        }
        
        return [...keptTips, newTip];
      });
      
      setTimeout(() => setIsRotating(false), 500);
    }, autoRotateInterval);

    return () => clearInterval(interval);
  }, [autoRotate, autoRotateInterval, maxTips, showAllTips]);

  const handleRefresh = () => {
    setIsRotating(true);
    setDisplayedTips(getRandomTips(maxTips));
    setTimeout(() => setIsRotating(false), 500);
  };

  const handleTipClick = (tip: GhostTrackerTip) => {
    if (onTipClick) {
      onTipClick(tip);
    }
  };

  const handleShowAll = () => {
    setDisplayedTips(GHOST_TRACKER_TIPS);
    setShowAllTips(true);
  };

  return (
    <div className="ghost-tracker-tips">
      <div className="tips-header">
        <div className="tips-title-row">
          <Lightbulb className="tips-icon" />
          <h4 className="tips-title">Ghost Tracker Tips</h4>
        </div>
        <div className="tips-actions">
          <button
            className={`tips-action-btn ${isRotating ? 'rotating' : ''}`}
            onClick={handleRefresh}
            title="Get new tips"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="tips-content">
        {displayedTips.map((tip, index) => (
          <div
            key={tip.id}
            className={`tip-card ${isRotating ? 'fading' : ''}`}
            onClick={() => handleTipClick(tip)}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="tip-header">
              {tip.icon && <span className="tip-icon">{tip.icon}</span>}
              <span className={`tip-category tip-category-${tip.category}`}>
                {tip.category}
              </span>
            </div>
            <h5 className="tip-title">{tip.title}</h5>
            <p className="tip-content">{tip.content}</p>
          </div>
        ))}
      </div>

      <div className="tips-footer">
        {!showAllTips && displayedTips.length < GHOST_TRACKER_TIPS.length && (
          <button className="show-all-btn" onClick={handleShowAll}>
            Show all tips <ChevronRight size={14} />
          </button>
        )}
        <span className="tips-count">
          {displayedTips.length} / {GHOST_TRACKER_TIPS.length} tips
        </span>
      </div>
    </div>
  );
}

/**
 * Compact version of tips for small spaces
 */
export function GhostTrackerTipsCompact({
  onTipClick
}: {
  onTipClick?: (tip: GhostTrackerTip) => void;
}) {
  const [currentTip, setCurrentTip] = useState<GhostTrackerTip>(() => getRandomTip());

  const handleNextTip = () => {
    setCurrentTip(getRandomTip());
  };

  return (
    <div className="ghost-tracker-tips-compact" onClick={handleNextTip}>
      <Lightbulb size={14} className="compact-icon" />
      <div className="compact-content">
        <span className={`compact-category tip-category-${currentTip.category}`}>
          {currentTip.category}
        </span>
        <span className="compact-text">{currentTip.title}</span>
      </div>
      <span className="compact-indicator">→</span>
    </div>
  );
}

export default GhostTrackerTips;

