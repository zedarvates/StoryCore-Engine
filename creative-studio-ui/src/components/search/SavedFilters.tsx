import React, { useState, useCallback } from 'react';
import { Save, Trash2, Edit2, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SearchFilter, SearchCriteria } from '../../types/gridEditorAdvanced';

export interface SavedFiltersProps {
  filters: SearchFilter[];
  onApplyFilter: (filter: SearchFilter) => void;
  onSaveFilter: (filter: SearchFilter) => void;
  onDeleteFilter: (id: string) => void;
  onUpdateFilter: (filter: SearchFilter) => void;
  currentCriteria?: SearchCriteria[];
}

export const SavedFilters: React.FC<SavedFiltersProps> = ({
  filters,
  onApplyFilter,
  onSaveFilter,
  onDeleteFilter,
  onUpdateFilter,
  currentCriteria
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [savingNew, setSavingNew] = useState(false);
  const [newFilterName, setNewFilterName] = useState('');

  const handleStartEdit = useCallback((filter: SearchFilter) => {
    setEditingId(filter.id);
    setEditingName(filter.name);
  }, []);

  const handleSaveEdit = useCallback((filter: SearchFilter) => {
    if (editingName.trim()) {
      onUpdateFilter({
        ...filter,
        name: editingName.trim()
      });
      setEditingId(null);
      setEditingName('');
    }
  }, [editingName, onUpdateFilter]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditingName('');
  }, []);

  const handleStartSaveNew = useCallback(() => {
    setSavingNew(true);
    setNewFilterName('');
  }, []);

  const handleSaveNew = useCallback(() => {
    if (newFilterName.trim() && currentCriteria && currentCriteria.length > 0) {
      const newFilter: SearchFilter = {
        id: `filter-${Date.now()}`,
        name: newFilterName.trim(),
        criteria: currentCriteria,
        createdAt: Date.now()
      };
      onSaveFilter(newFilter);
      setSavingNew(false);
      setNewFilterName('');
    }
  }, [newFilterName, currentCriteria, onSaveFilter]);

  const handleCancelSaveNew = useCallback(() => {
    setSavingNew(false);
    setNewFilterName('');
  }, []);

  return (
    <div className="saved-filters">
      <div className="saved-filters-header">
        <h4>Saved Filters</h4>
        {currentCriteria && currentCriteria.length > 0 && !savingNew && (
          <button
            className="save-new-button"
            onClick={handleStartSaveNew}
            title="Save current search as filter"
          >
            <Save size={16} />
            Save Current
          </button>
        )}
      </div>

      <AnimatePresence>
        {savingNew && (
          <motion.div
            className="save-new-form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <input
              type="text"
              className="filter-name-input"
              placeholder="Enter filter name..."
              value={newFilterName}
              onChange={(e) => setNewFilterName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveNew();
                if (e.key === 'Escape') handleCancelSaveNew();
              }}
              autoFocus
            />
            <div className="form-actions">
              <button
                className="action-button save"
                onClick={handleSaveNew}
                disabled={!newFilterName.trim()}
              >
                <Check size={16} />
              </button>
              <button
                className="action-button cancel"
                onClick={handleCancelSaveNew}
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="filters-list">
        {filters.length === 0 ? (
          <div className="empty-state">
            <p>No saved filters yet</p>
            <p className="empty-hint">
              Create a search and save it for quick access
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {filters.map(filter => (
              <motion.div
                key={filter.id}
                className="filter-item"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                layout
              >
                {editingId === filter.id ? (
                  <div className="filter-edit-form">
                    <input
                      type="text"
                      className="filter-name-input"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(filter);
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                      autoFocus
                    />
                    <div className="form-actions">
                      <button
                        className="action-button save"
                        onClick={() => handleSaveEdit(filter)}
                        disabled={!editingName.trim()}
                      >
                        <Check size={14} />
                      </button>
                      <button
                        className="action-button cancel"
                        onClick={handleCancelEdit}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      className="filter-name"
                      onClick={() => onApplyFilter(filter)}
                      title={`Apply filter: ${filter.name}`}
                    >
                      {filter.name}
                      <span className="filter-criteria-count">
                        ({filter.criteria.length} {filter.criteria.length === 1 ? 'criterion' : 'criteria'})
                      </span>
                    </button>
                    <div className="filter-actions">
                      <button
                        className="icon-button"
                        onClick={() => handleStartEdit(filter)}
                        title="Edit filter name"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        className="icon-button delete"
                        onClick={() => onDeleteFilter(filter.id)}
                        title="Delete filter"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <style jsx>{`
        .saved-filters {
          background: white;
          border: 1px solid var(--border-color, #e0e0e0);
          border-radius: 8px;
          padding: 1rem;
        }

        .saved-filters-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .saved-filters-header h4 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary, #333);
        }

        .save-new-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: var(--primary-color, #007bff);
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .save-new-button:hover {
          background: var(--primary-hover, #0056b3);
        }

        .save-new-form {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
          padding: 0.75rem;
          background: var(--bg-secondary, #f5f5f5);
          border-radius: 6px;
        }

        .filter-name-input {
          flex: 1;
          padding: 0.5rem;
          border: 1px solid var(--border-color, #e0e0e0);
          border-radius: 4px;
          font-size: 14px;
          color: var(--text-primary, #333);
        }

        .filter-name-input:focus {
          outline: none;
          border-color: var(--primary-color, #007bff);
          box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
        }

        .form-actions {
          display: flex;
          gap: 0.25rem;
        }

        .action-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: white;
          border: 1px solid var(--border-color, #e0e0e0);
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-button.save {
          color: var(--success-color, #28a745);
        }

        .action-button.save:hover:not(:disabled) {
          background: var(--success-bg, #d4edda);
          border-color: var(--success-color, #28a745);
        }

        .action-button.cancel {
          color: var(--text-secondary, #666);
        }

        .action-button.cancel:hover {
          background: var(--bg-hover, #f0f0f0);
        }

        .action-button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .filters-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .empty-state {
          padding: 2rem 1rem;
          text-align: center;
          color: var(--text-secondary, #666);
        }

        .empty-state p {
          margin: 0;
        }

        .empty-hint {
          font-size: 13px;
          margin-top: 0.5rem;
          color: var(--text-tertiary, #999);
        }

        .filter-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem;
          background: var(--bg-secondary, #f5f5f5);
          border: 1px solid var(--border-color, #e0e0e0);
          border-radius: 6px;
          transition: all 0.2s;
        }

        .filter-item:hover {
          background: var(--bg-hover, #f0f0f0);
          border-color: var(--border-hover, #ccc);
        }

        .filter-edit-form {
          display: flex;
          gap: 0.5rem;
          width: 100%;
        }

        .filter-name {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0;
          background: transparent;
          border: none;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary, #333);
          text-align: left;
          cursor: pointer;
          transition: color 0.2s;
        }

        .filter-name:hover {
          color: var(--primary-color, #007bff);
        }

        .filter-criteria-count {
          font-size: 12px;
          font-weight: normal;
          color: var(--text-secondary, #666);
        }

        .filter-actions {
          display: flex;
          gap: 0.25rem;
        }

        .icon-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          background: transparent;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          color: var(--text-secondary, #666);
          transition: all 0.2s;
        }

        .icon-button:hover {
          background: white;
          color: var(--text-primary, #333);
        }

        .icon-button.delete:hover {
          background: var(--danger-bg, #fee);
          color: var(--danger-color, #dc3545);
        }
      `}</style>
    </div>
  );
};
