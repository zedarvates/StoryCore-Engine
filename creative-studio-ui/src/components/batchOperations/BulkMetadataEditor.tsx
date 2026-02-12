/**
 * BulkMetadataEditor - Éditeur de métadonnées groupées
 * 
 * Permet l'édition de métadonnées pour plusieurs plans simultanément:
 * - Interface d'édition groupée
 * - Prévisualisation des changements
 * - Application à tous les plans sélectionnés
 * 
 * Exigence: 8.3 - Édition groupée de métadonnées
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Shot } from '../../types';
import { X, Eye, Check, AlertCircle } from 'lucide-react';

/**
 * Props du composant
 */
export interface BulkMetadataEditorProps {
  selectedShots: Shot[];
  onApply: (updates: Partial<Shot>) => void;
  onCancel: () => void;
}

/**
 * Champs de métadonnées éditables
 */
interface MetadataField {
  key: keyof Shot | string;
  label: string;
  type: 'text' | 'number' | 'select' | 'tags';
  options?: string[];
  placeholder?: string;
}

/**
 * Changements de métadonnées
 */
interface MetadataChanges {
  [key: string]: unknown;
}

/**
 * Éditeur de métadonnées groupées
 * Exigence: 8.3 - Édition groupée avec prévisualisation
 */
export const BulkMetadataEditor: React.FC<BulkMetadataEditorProps> = ({
  selectedShots,
  onApply,
  onCancel
}) => {
  const [changes, setChanges] = useState<MetadataChanges>({});
  const [showPreview, setShowPreview] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  
  /**
   * Champs de métadonnées disponibles
   */
  const fields: MetadataField[] = useMemo(() => [
    {
      key: 'title',
      label: 'Titre',
      type: 'text',
      placeholder: 'Nouveau titre...'
    },
    {
      key: 'description',
      label: 'Description',
      type: 'text',
      placeholder: 'Nouvelle description...'
    },
    {
      key: 'duration',
      label: 'Durée (secondes)',
      type: 'number',
      placeholder: '0'
    },
    {
      key: 'metadata.category',
      label: 'Catégorie',
      type: 'select',
      options: ['Action', 'Dialogue', 'Transition', 'Establishing', 'Close-up']
    },
    {
      key: 'metadata.tags',
      label: 'Tags',
      type: 'tags',
      placeholder: 'Ajouter des tags...'
    }
  ], []);
  
  /**
   * Valeurs communes entre les plans sélectionnés
   */
  const commonValues = useMemo(() => {
    const values: Record<string, unknown> = {};
    
    for (const field of fields) {
      const fieldValues = selectedShots.map(shot => {
        if (field.key.includes('.')) {
          const [parent, child] = field.key.split('.');
          return (shot as any)[parent]?.[child];
        }
        return (shot as any)[field.key];
      });
      
      // Vérifier si toutes les valeurs sont identiques
      const firstValue = fieldValues[0];
      const allSame = fieldValues.every(v => 
        JSON.stringify(v) === JSON.stringify(firstValue)
      );
      
      if (allSame) {
        values[field.key] = firstValue;
      } else {
        values[field.key] = null; // Valeurs mixtes
      }
    }
    
    return values;
  }, [selectedShots, fields]);
  
  /**
   * Met à jour un champ
   */
  const handleFieldChange = useCallback((key: string, value: unknown) => {
    setChanges(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);
  
  /**
   * Applique les changements
   */
  const handleApply = useCallback(() => {
    const updates: Partial<Shot> = {};
    
    for (const [key, value] of Object.entries(changes)) {
      if (key.includes('.')) {
        const [parent, child] = key.split('.');
        if (!updates[parent as keyof Shot]) {
          (updates as any)[parent] = {};
        }
        (updates as any)[parent][child] = value;
      } else {
        (updates as any)[key] = value;
      }
    }
    
    onApply(updates);
  }, [changes, onApply]);
  
  /**
   * Prévisualise les changements sur un plan
   */
  const previewShot = useMemo(() => {
    if (!showPreview || selectedShots.length === 0) {
      return null;
    }
    
    const shot = selectedShots[previewIndex];
    const preview = { ...shot };
    
    for (const [key, value] of Object.entries(changes)) {
      if (key.includes('.')) {
        const [parent, child] = key.split('.');
        if (!preview[parent as keyof Shot]) {
          (preview as any)[parent] = {};
        }
        (preview as any)[parent][child] = value;
      } else {
        (preview as any)[key] = value;
      }
    }
    
    return preview;
  }, [showPreview, selectedShots, previewIndex, changes]);
  
  /**
   * Nombre de changements
   */
  const changeCount = Object.keys(changes).length;
  
  /**
   * Rend un champ d'édition
   */
  const renderField = (field: MetadataField) => {
    const currentValue = changes[field.key] ?? commonValues[field.key];
    const hasChange = field.key in changes;
    const isMixed = commonValues[field.key] === null && !hasChange;
    
    return (
      <div key={field.key} className={`metadata-field ${hasChange ? 'has-change' : ''}`}>
        <label className="field-label">
          {field.label}
          {isMixed && <span className="mixed-indicator">(Valeurs mixtes)</span>}
        </label>
        
        {field.type === 'text' && (
          <input
            type="text"
            className="field-input"
            value={currentValue || ''}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            placeholder={field.placeholder}
          />
        )}
        
        {field.type === 'number' && (
          <input
            type="number"
            className="field-input"
            value={currentValue || ''}
            onChange={(e) => handleFieldChange(field.key, parseFloat(e.target.value))}
            placeholder={field.placeholder}
          />
        )}
        
        {field.type === 'select' && (
          <select
            className="field-select"
            value={currentValue || ''}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
          >
            <option value="">-- Sélectionner --</option>
            {field.options?.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )}
        
        {field.type === 'tags' && (
          <input
            type="text"
            className="field-input"
            value={Array.isArray(currentValue) ? currentValue.join(', ') : ''}
            onChange={(e) => {
              const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
              handleFieldChange(field.key, tags);
            }}
            placeholder={field.placeholder}
          />
        )}
        
        {hasChange && (
          <button
            className="reset-field-button"
            onClick={() => {
              setChanges(prev => {
                const next = { ...prev };
                delete next[field.key];
                return next;
              });
            }}
            title="Réinitialiser"
          >
            <X size={14} />
          </button>
        )}
      </div>
    );
  };
  
  return (
    <motion.div
      className="bulk-metadata-editor-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="bulk-metadata-editor"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="editor-header">
          <div className="header-info">
            <h2>Édition groupée</h2>
            <span className="selection-info">
              {selectedShots.length} plan{selectedShots.length > 1 ? 's' : ''} sélectionné{selectedShots.length > 1 ? 's' : ''}
            </span>
          </div>
          <button
            className="close-button"
            onClick={onCancel}
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Contenu */}
        <div className="editor-content">
          {/* Champs d'édition */}
          <div className="fields-section">
            <h3>Métadonnées</h3>
            <div className="fields-list">
              {fields.map(renderField)}
            </div>
          </div>
          
          {/* Prévisualisation */}
          {showPreview && previewShot && (
            <div className="preview-section">
              <div className="preview-header">
                <h3>Prévisualisation</h3>
                <div className="preview-navigation">
                  <button
                    onClick={() => setPreviewIndex(Math.max(0, previewIndex - 1))}
                    disabled={previewIndex === 0}
                  >
                    ←
                  </button>
                  <span>
                    {previewIndex + 1} / {selectedShots.length}
                  </span>
                  <button
                    onClick={() => setPreviewIndex(Math.min(selectedShots.length - 1, previewIndex + 1))}
                    disabled={previewIndex === selectedShots.length - 1}
                  >
                    →
                  </button>
                </div>
              </div>
              
              <div className="preview-content">
                <div className="preview-item">
                  <strong>Titre:</strong>
                  <span>{previewShot.title}</span>
                </div>
                <div className="preview-item">
                  <strong>Description:</strong>
                  <span>{previewShot.description}</span>
                </div>
                <div className="preview-item">
                  <strong>Durée:</strong>
                  <span>{previewShot.duration}s</span>
                </div>
                {previewShot.metadata?.category && (
                  <div className="preview-item">
                    <strong>Catégorie:</strong>
                    <span>{previewShot.metadata.category}</span>
                  </div>
                )}
                {previewShot.metadata?.tags && (
                  <div className="preview-item">
                    <strong>Tags:</strong>
                    <span>{previewShot.metadata.tags.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Pied de page */}
        <div className="editor-footer">
          <div className="footer-info">
            {changeCount > 0 ? (
              <span className="change-count">
                <AlertCircle size={16} />
                {changeCount} changement{changeCount > 1 ? 's' : ''}
              </span>
            ) : (
              <span className="no-changes">Aucun changement</span>
            )}
          </div>
          
          <div className="footer-actions">
            <button
              className="preview-button"
              onClick={() => setShowPreview(!showPreview)}
              disabled={changeCount === 0}
            >
              <Eye size={16} />
              {showPreview ? 'Masquer' : 'Prévisualiser'}
            </button>
            
            <button
              className="cancel-button"
              onClick={onCancel}
            >
              Annuler
            </button>
            
            <button
              className="apply-button"
              onClick={handleApply}
              disabled={changeCount === 0}
            >
              <Check size={16} />
              Appliquer
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};



