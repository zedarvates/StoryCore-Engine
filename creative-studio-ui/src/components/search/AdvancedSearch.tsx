import React, { useState, useCallback } from 'react';
import { Plus, X, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Shot } from '../../types';
import type { SearchCriteria, SearchOperator } from '../../types/gridEditorAdvanced';
import { SearchService } from '../../services/search/SearchService';

export interface AdvancedSearchProps {
  shots: Shot[];
  onSearchResults: (results: Shot[]) => void;
  onClose?: () => void;
}

export const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  shots,
  onSearchResults,
  onClose
}) => {
  const [criteria, setCriteria] = useState<SearchCriteria[]>([
    { field: 'title', value: '', operator: 'AND' }
  ]);
  const [searchService] = useState(() => new SearchService(shots));

  const handleAddCriterion = useCallback(() => {
    setCriteria(prev => [
      ...prev,
      { field: 'title', value: '', operator: 'AND' }
    ]);
  }, []);

  const handleRemoveCriterion = useCallback((index: number) => {
    setCriteria(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleCriterionChange = useCallback((
    index: number,
    updates: Partial<SearchCriteria>
  ) => {
    setCriteria(prev => prev.map((c, i) => 
      i === index ? { ...c, ...updates } : c
    ));
  }, []);

  const handleSearch = useCallback(() => {
    searchService.updateShots(shots);
    const results = searchService.advancedSearch(criteria);
    onSearchResults(results);
  }, [shots, criteria, searchService, onSearchResults]);

  const handleClear = useCallback(() => {
    setCriteria([{ field: 'title', value: '', operator: 'AND' }]);
    onSearchResults(shots);
  }, [shots, onSearchResults]);

  return (
    <motion.div
      className="advanced-search"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="advanced-search-header">
        <h3>Advanced Search</h3>
        {onClose && (
          <button
            className="close-button"
            onClick={onClose}
            aria-label="Close advanced search"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <div className="criteria-list">
        <AnimatePresence>
          {criteria.map((criterion, index) => (
            <motion.div
              key={index}
              className="criterion-row"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              {index > 0 && (
                <select
                  className="operator-select"
                  value={criterion.operator}
                  onChange={(e) => handleCriterionChange(index, {
                    operator: e.target.value as SearchOperator
                  })}
                >
                  <option value="AND">AND</option>
                  <option value="OR">OR</option>
                  <option value="NOT">NOT</option>
                </select>
              )}

              <select
                className="field-select"
                value={criterion.field}
                onChange={(e) => handleCriterionChange(index, {
                  field: e.target.value as SearchCriteria['field']
                })}
              >
                <option value="title">Title</option>
                <option value="description">Description</option>
                <option value="tags">Tags</option>
                <option value="duration">Duration</option>
                <option value="type">Type</option>
                <option value="status">Status</option>
              </select>

              <input
                type="text"
                className="value-input"
                placeholder={getPlaceholder(criterion.field)}
                value={criterion.value}
                onChange={(e) => handleCriterionChange(index, {
                  value: e.target.value
                })}
              />

              {criteria.length > 1 && (
                <button
                  className="remove-button"
                  onClick={() => handleRemoveCriterion(index)}
                  aria-label="Remove criterion"
                >
                  <X size={16} />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="advanced-search-actions">
        <button
          className="add-criterion-button"
          onClick={handleAddCriterion}
        >
          <Plus size={16} />
          Add Criterion
        </button>

        <div className="action-buttons">
          <button
            className="clear-button"
            onClick={handleClear}
          >
            Clear
          </button>
          <button
            className="search-button"
            onClick={handleSearch}
          >
            <Search size={16} />
            Search
          </button>
        </div>
      </div>

      <div className="search-help">
        <p><strong>Tips:</strong></p>
        <ul>
          <li><strong>AND:</strong> Both conditions must be true</li>
          <li><strong>OR:</strong> At least one condition must be true</li>
          <li><strong>NOT:</strong> Condition must be false</li>
          <li><strong>Duration:</strong> Use &gt;5, &lt;10, or 5-10 for ranges</li>
        </ul>
      </div>

      <style jsx>{`
        .advanced-search {
          background: white;
          border: 1px solid var(--border-color, #e0e0e0);
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .advanced-search-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .advanced-search-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary, #333);
        }

        .close-button {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.5rem;
          background: transparent;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          color: var(--text-secondary, #666);
          transition: all 0.2s;
        }

        .close-button:hover {
          background: var(--bg-hover, #f0f0f0);
          color: var(--text-primary, #333);
        }

        .criteria-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .criterion-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .operator-select {
          padding: 0.5rem;
          border: 1px solid var(--border-color, #e0e0e0);
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          color: var(--primary-color, #007bff);
          background: white;
          cursor: pointer;
          min-width: 80px;
        }

        .field-select {
          padding: 0.5rem;
          border: 1px solid var(--border-color, #e0e0e0);
          border-radius: 6px;
          font-size: 14px;
          color: var(--text-primary, #333);
          background: white;
          cursor: pointer;
          min-width: 120px;
        }

        .value-input {
          flex: 1;
          padding: 0.5rem;
          border: 1px solid var(--border-color, #e0e0e0);
          border-radius: 6px;
          font-size: 14px;
          color: var(--text-primary, #333);
        }

        .value-input:focus {
          outline: none;
          border-color: var(--primary-color, #007bff);
          box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
        }

        .remove-button {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.5rem;
          background: transparent;
          border: 1px solid var(--border-color, #e0e0e0);
          border-radius: 6px;
          cursor: pointer;
          color: var(--text-secondary, #666);
          transition: all 0.2s;
        }

        .remove-button:hover {
          background: var(--danger-bg, #fee);
          border-color: var(--danger-color, #dc3545);
          color: var(--danger-color, #dc3545);
        }

        .advanced-search-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 1rem;
          border-top: 1px solid var(--border-color, #e0e0e0);
        }

        .add-criterion-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: transparent;
          border: 1px dashed var(--border-color, #e0e0e0);
          border-radius: 6px;
          font-size: 14px;
          color: var(--text-secondary, #666);
          cursor: pointer;
          transition: all 0.2s;
        }

        .add-criterion-button:hover {
          background: var(--bg-hover, #f0f0f0);
          border-color: var(--primary-color, #007bff);
          color: var(--primary-color, #007bff);
        }

        .action-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .clear-button {
          padding: 0.5rem 1rem;
          background: transparent;
          border: 1px solid var(--border-color, #e0e0e0);
          border-radius: 6px;
          font-size: 14px;
          color: var(--text-secondary, #666);
          cursor: pointer;
          transition: all 0.2s;
        }

        .clear-button:hover {
          background: var(--bg-hover, #f0f0f0);
          border-color: var(--border-hover, #ccc);
        }

        .search-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: var(--primary-color, #007bff);
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .search-button:hover {
          background: var(--primary-hover, #0056b3);
        }

        .search-help {
          margin-top: 1.5rem;
          padding: 1rem;
          background: var(--bg-info, #e7f3ff);
          border-radius: 6px;
          font-size: 13px;
          color: var(--text-secondary, #666);
        }

        .search-help p {
          margin: 0 0 0.5rem 0;
          font-weight: 600;
        }

        .search-help ul {
          margin: 0;
          padding-left: 1.5rem;
        }

        .search-help li {
          margin-bottom: 0.25rem;
        }
      `}</style>
    </motion.div>
  );
};

function getPlaceholder(field: SearchCriteria['field']): string {
  switch (field) {
    case 'title':
      return 'Enter title...';
    case 'description':
      return 'Enter description...';
    case 'tags':
      return 'Enter tag...';
    case 'duration':
      return 'e.g., >5, <10, or 5-10';
    case 'type':
      return 'Enter type...';
    case 'status':
      return 'Enter status...';
    default:
      return 'Enter value...';
  }
}
