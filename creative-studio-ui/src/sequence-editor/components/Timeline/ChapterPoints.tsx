/**
 * ChapterPoints Component
 * 
 * Renders chapter points for quick navigation with thumbnails support.
 * Includes chapter navigation menu for easy access.
 * 
 * Requirements: 3.9
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ChapterPoint, positionToTimecode } from './markerTypes';

interface ChapterPointsProps {
  chapters: ChapterPoint[];
  zoomLevel: number;
  height: number;
  currentPosition: number;
  onChapterClick?: (chapter: ChapterPoint) => void;
  onChapterHover?: (chapter: ChapterPoint | null) => void;
}

export const ChapterPoints: React.FC<ChapterPointsProps> = ({
  chapters,
  zoomLevel,
  height,
  currentPosition,
  onChapterClick,
  onChapterHover,
}) => {
  const [hoveredChapter, setHoveredChapter] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle chapter click
  const handleChapterClick = useCallback((chapter: ChapterPoint) => {
    if (onChapterClick) {
      onChapterClick(chapter);
    }
    setMenuOpen(false);
  }, [onChapterClick]);

  // Handle chapter hover
  const handleChapterEnter = useCallback((chapter: ChapterPoint) => {
    setHoveredChapter(chapter.id);
    if (onChapterHover) {
      onChapterHover(chapter);
    }
  }, [onChapterHover]);

  const handleChapterLeave = useCallback(() => {
    setHoveredChapter(null);
    if (onChapterHover) {
      onChapterHover(null);
    }
  }, [onChapterHover]);

  // Sort chapters by position
  const sortedChapters = [...chapters].sort((a, b) => a.position - b.position);

  // Calculate chapter progress
  const getChapterProgress = (chapter: ChapterPoint): number => {
    const nextChapter = sortedChapters[sortedChapters.findIndex(c => c.id === chapter.id) + 1];
    if (!nextChapter) return 100;
    const duration = nextChapter.position - chapter.position;
    const elapsed = currentPosition - chapter.position;
    return Math.min(100, Math.max(0, (elapsed / duration) * 100));
  };

  return (
    <div 
      className="timeline-chapters"
      style={{ height, position: 'relative' }}
      role="list"
      aria-label="Chapter points"
    >
      {/* Chapter markers on timeline */}
      {sortedChapters.map((chapter) => {
        const left = chapter.position * zoomLevel;
        const isHovered = hoveredChapter === chapter.id;
        const isActive = currentPosition >= chapter.position;
        const progress = getChapterProgress(chapter);

        return (
          <div
            key={chapter.id}
            className={`chapter-marker ${isActive ? 'active' : ''} ${isHovered ? 'hovered' : ''}`}
            style={{ left }}
            onClick={() => handleChapterClick(chapter)}
            onMouseEnter={() => handleChapterEnter(chapter)}
            onMouseLeave={handleChapterLeave}
            role="listitem"
            aria-label={`Chapter: ${chapter.title}`}
            tabIndex={0}
          >
            {/* Chapter marker head */}
            <div className="chapter-marker-head" title={chapter.title}>
              <div className="chapter-marker-icon">🎬</div>
              {isHovered && (
                <div className="chapter-marker-tooltip">
                  <div className="chapter-tooltip-title">{chapter.title}</div>
                  <div className="chapter-tooltip-timecode">{positionToTimecode(chapter.position)}</div>
                  {chapter.description && (
                    <div className="chapter-tooltip-description">{chapter.description}</div>
                  )}
                </div>
              )}
            </div>

            {/* Progress indicator */}
            <div 
              className="chapter-progress-bar"
              style={{ width: `${progress}%` }}
            />
          </div>
        );
      })}

        {/* Chapter navigation menu button */}
      <div className="chapter-menu-container" ref={menuRef}>
        <button
          className={`chapter-menu-btn ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Chapter navigation"
          aria-expanded={menuOpen ? 'true' : 'false'}
        >
          📑
          <span className="chapter-count">{chapters.length}</span>
        </button>

        {/* Chapter dropdown menu */}
        {menuOpen && (
          <div className="chapter-dropdown" role="presentation">
            <div className="chapter-dropdown-header">
              <span>Chapters</span>
              <span className="chapter-count">{chapters.length}</span>
            </div>
            
            {sortedChapters.length === 0 ? (
              <div className="chapter-dropdown-empty">
                No chapters yet. Add markers to create chapters.
              </div>
            ) : (
            <div className="chapter-list">
                {sortedChapters.map((chapter, index) => {
                  const isActive = currentPosition >= chapter.position;
                  return (
                    <div
                      key={chapter.id}
                      className={`chapter-list-item ${isActive ? 'active' : ''}`}
                      onClick={() => handleChapterClick(chapter)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleChapterClick(chapter);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`Chapter ${index + 1}: ${chapter.title}`}
                    >
                      <span className="chapter-list-number">{index + 1}</span>
                      
                      {chapter.thumbnail && (
                        <img 
                          src={chapter.thumbnail} 
                          alt="" 
                          className="chapter-thumbnail"
                        />
                      )}
                      
                      <div className="chapter-list-info">
                        <span className="chapter-list-title">{chapter.title}</span>
                        <span className="chapter-list-timecode">
                          {positionToTimecode(chapter.position)}
                        </span>
                      </div>
                      
                      {isActive && (
                        <span className="chapter-list-indicator">✓</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Export for use in other components
export default ChapterPoints;

