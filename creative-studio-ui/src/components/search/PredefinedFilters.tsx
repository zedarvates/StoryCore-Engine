import React from 'react';
import { Star, Clock, Archive, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Shot } from '../../types';
import type { PredefinedFilter } from '../../types/gridEditorAdvanced';

export interface PredefinedFiltersProps {
  shots: Shot[];
  onApplyFilter: (filterType: PredefinedFilter, results: Shot[]) => void;
}

export const PredefinedFilters: React.FC<PredefinedFiltersProps> = ({
  shots,
  onApplyFilter
}) => {
  const filters: Array<{
    type: PredefinedFilter;
    label: string;
    icon: React.ReactNode;
    description: string;
    color: string;
  }> = [
    {
      type: 'favorites',
      label: 'Favorites',
      icon: <Star size={18} />,
      description: 'Shots marked as favorites',
      color: '#ffc107'
    },
    {
      type: 'recent',
      label: 'Recent',
      icon: <Clock size={18} />,
      description: 'Recently created or modified',
      color: '#007bff'
    },
    {
      type: 'unused',
      label: 'Unused',
      icon: <Archive size={18} />,
      description: 'Shots not yet used',
      color: '#6c757d'
    },
    {
      type: 'errors',
      label: 'With Errors',
      icon: <AlertCircle size={18} />,
      description: 'Shots with errors or issues',
      color: '#dc3545'
    }
  ];

  const getFilteredShots = (filterType: PredefinedFilter): Shot[] => {
    switch (filterType) {
      case 'favorites':
        return shots.filter(shot => shot.metadata?.favorite === true);
      
      case 'recent':
        const sortedByTime = [...shots].sort((a, b) => {
          const timeA = (a.metadata?.updatedAt as number) || (a.metadata?.createdAt as number) || 0;
          const timeB = (b.metadata?.updatedAt as number) || (b.metadata?.createdAt as number) || 0;
          return timeB - timeA;
        });
        return sortedByTime.slice(0, 10);
      
      case 'unused':
        return shots.filter(shot => shot.metadata?.used === false);
      
      case 'errors':
        return shots.filter(shot => 
          shot.metadata?.hasErrors === true || 
          shot.metadata?.status === 'error'
        );
      
      default:
        return shots;
    }
  };

  const getCount = (filterType: PredefinedFilter): number => {
    return getFilteredShots(filterType).length;
  };

  const handleFilterClick = (filterType: PredefinedFilter) => {
    const results = getFilteredShots(filterType);
    onApplyFilter(filterType, results);
  };

  return (
    <div className="predefined-filters">
      <h4>Quick Filters</h4>
      
      <div className="filters-grid">
        {filters.map((filter, index) => {
          const count = getCount(filter.type);
          
          return (
            <motion.button
              key={filter.type}
              className="filter-button"
              onClick={() => handleFilterClick(filter.type)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ '--filter-color': filter.color } as React.CSSProperties}
            >
              <div className="filter-icon" style={{ color: filter.color }}>
                {filter.icon}
              </div>
              
              <div className="filter-content">
                <div className="filter-header">
                  <span className="filter-label">{filter.label}</span>
                  <span className="filter-count">{count}</span>
                </div>
                <p className="filter-description">{filter.description}</p>
              </div>
            </motion.button>
          );
        })}
      </div>

      <style jsx>{`
        .predefined-filters {
          background: white;
          border: 1px solid var(--border-color, #e0e0e0);
          border-radius: 8px;
          padding: 1rem;
        }

        .predefined-filters h4 {
          margin: 0 0 1rem 0;
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary, #333);
        }

        .filters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 0.75rem;
        }

        .filter-button {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem;
          background: white;
          border: 1px solid var(--border-color, #e0e0e0);
          border-radius: 8px;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s;
        }

        .filter-button:hover {
          background: var(--bg-hover, #f8f9fa);
          border-color: var(--filter-color);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .filter-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: var(--bg-secondary, #f5f5f5);
          border-radius: 8px;
          flex-shrink: 0;
        }

        .filter-button:hover .filter-icon {
          background: color-mix(in srgb, var(--filter-color) 10%, white);
        }

        .filter-content {
          flex: 1;
          min-width: 0;
        }

        .filter-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.25rem;
        }

        .filter-label {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary, #333);
        }

        .filter-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 24px;
          height: 24px;
          padding: 0 0.5rem;
          background: var(--bg-secondary, #f5f5f5);
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary, #666);
        }

        .filter-button:hover .filter-count {
          background: var(--filter-color);
          color: white;
        }

        .filter-description {
          margin: 0;
          font-size: 12px;
          color: var(--text-secondary, #666);
          line-height: 1.4;
        }

        @media (max-width: 768px) {
          .filters-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};
