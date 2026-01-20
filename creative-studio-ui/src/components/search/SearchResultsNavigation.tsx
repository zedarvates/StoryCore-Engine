import React, { useState, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Shot } from '../../types';

export interface SearchResultsNavigationProps {
  results: Shot[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  onHighlight: (shotId: string) => void;
}

export const SearchResultsNavigation: React.FC<SearchResultsNavigationProps> = ({
  results,
  currentIndex,
  onNavigate,
  onHighlight
}) => {
  const [index, setIndex] = useState(currentIndex);

  useEffect(() => {
    setIndex(currentIndex);
  }, [currentIndex]);

  useEffect(() => {
    if (results.length > 0 && index >= 0 && index < results.length) {
      onHighlight(results[index].id);
    }
  }, [index, results, onHighlight]);

  const handleFirst = useCallback(() => {
    if (results.length > 0) {
      setIndex(0);
      onNavigate(0);
    }
  }, [results, onNavigate]);

  const handlePrevious = useCallback(() => {
    if (index > 0) {
      const newIndex = index - 1;
      setIndex(newIndex);
      onNavigate(newIndex);
    }
  }, [index, onNavigate]);

  const handleNext = useCallback(() => {
    if (index < results.length - 1) {
      const newIndex = index + 1;
      setIndex(newIndex);
      onNavigate(newIndex);
    }
  }, [index, results, onNavigate]);

  const handleLast = useCallback(() => {
    if (results.length > 0) {
      const newIndex = results.length - 1;
      setIndex(newIndex);
      onNavigate(newIndex);
    }
  }, [results, onNavigate]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === 'ArrowRight' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'Home') {
        e.preventDefault();
        handleFirst();
      } else if (e.key === 'End') {
        e.preventDefault();
        handleLast();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrevious, handleNext, handleFirst, handleLast]);

  if (results.length === 0) {
    return null;
  }

  const currentShot = results[index];

  return (
    <motion.div
      className="search-results-navigation"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      <div className="navigation-info">
        <span className="current-result">
          Result {index + 1} of {results.length}
        </span>
        {currentShot && (
          <span className="current-shot-title">
            {currentShot.title}
          </span>
        )}
      </div>

      <div className="navigation-controls">
        <button
          className="nav-button"
          onClick={handleFirst}
          disabled={index === 0}
          aria-label="First result"
          title="First result (Home)"
        >
          <ChevronsLeft size={18} />
        </button>

        <button
          className="nav-button"
          onClick={handlePrevious}
          disabled={index === 0}
          aria-label="Previous result"
          title="Previous result (←)"
        >
          <ChevronLeft size={18} />
        </button>

        <button
          className="nav-button"
          onClick={handleNext}
          disabled={index === results.length - 1}
          aria-label="Next result"
          title="Next result (→)"
        >
          <ChevronRight size={18} />
        </button>

        <button
          className="nav-button"
          onClick={handleLast}
          disabled={index === results.length - 1}
          aria-label="Last result"
          title="Last result (End)"
        >
          <ChevronsRight size={18} />
        </button>
      </div>

      <style jsx>{`
        .search-results-navigation {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          background: white;
          border: 1px solid var(--border-color, #e0e0e0);
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .navigation-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .current-result {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary, #333);
        }

        .current-shot-title {
          font-size: 12px;
          color: var(--text-secondary, #666);
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .navigation-controls {
          display: flex;
          gap: 0.25rem;
        }

        .nav-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: transparent;
          border: 1px solid var(--border-color, #e0e0e0);
          border-radius: 6px;
          cursor: pointer;
          color: var(--text-primary, #333);
          transition: all 0.2s;
        }

        .nav-button:hover:not(:disabled) {
          background: var(--bg-hover, #f0f0f0);
          border-color: var(--primary-color, #007bff);
          color: var(--primary-color, #007bff);
        }

        .nav-button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .nav-button:active:not(:disabled) {
          transform: scale(0.95);
        }

        @media (max-width: 768px) {
          .search-results-navigation {
            flex-direction: column;
            gap: 0.75rem;
          }

          .navigation-info {
            width: 100%;
            text-align: center;
          }

          .current-shot-title {
            max-width: 100%;
          }
        }
      `}</style>
    </motion.div>
  );
};
