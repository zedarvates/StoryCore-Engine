/**
 * BatchOperationsToolbar - Barre d'outils pour opérations par lots
 * 
 * Affiche une barre d'outils contextuelle lors de sélection multiple avec:
 * - Boutons d'opérations (Duplicate, Delete, Export, Transform, Tag)
 * - Barre de progression pendant le traitement
 * - Rapport d'erreurs en cas d'échec partiel
 * 
 * Exigences: 8.1, 8.5, 8.6
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ProductionShot, BatchOperationType, BatchOperationResult } from '../../types';
import { BatchOperationsManager, type BatchOperationOptions } from '../../services/batchOperations';
import {
  Copy,
  Trash2,
  Download,
  Wand2,
  Tag,
  X,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';

/**
 * Convertit un ProductionShot en Shot pour les opérations batch
 * Note: Utilise le type Shot de index.ts (pas celui de shot.ts)
 */
const productionShotToShot = (productionShot: ProductionShot): import('../../types').Shot => ({
  id: productionShot.id,
  title: `Shot ${productionShot.number}`,
  description: productionShot.notes || '',
  duration: productionShot.timing.duration / 24, // Convert frames to seconds (assuming 24fps)
  image: productionShot.thumbnailUrl,
  audioTracks: [],
  effects: [],
  textLayers: [],
  animations: [],
  position: productionShot.number,
  metadata: {
    sequencePlanId: productionShot.sequencePlanId,
    sceneId: productionShot.sceneId,
    status: productionShot.status,
    tags: productionShot.tags,
    type: productionShot.type,
    timing: productionShot.timing
  }
});

/**
 * Props du composant
 */
export interface BatchOperationsToolbarProps {
  selectedShots: ProductionShot[];
  onOperationComplete?: (result: BatchOperationResult) => void;
  onClose?: () => void;
  estimatedTime?: number;
}

/**
 * État de l'opération en cours
 */
interface OperationState {
  type: BatchOperationType;
  progress: number;
  isRunning: boolean;
  result?: BatchOperationResult;
  error?: Error;
}

/**
 * Barre d'outils pour opérations par lots
 * Exigence: 8.1 - Affichage lors de sélection multiple
 * Exigence: 8.5 - Support des opérations
 * Exigence: 8.6 - Rapport d'erreurs
 */
export const BatchOperationsToolbar: React.FC<BatchOperationsToolbarProps> = ({
  selectedShots,
  onOperationComplete,
  onClose,
  estimatedTime
}) => {
  const [operationState, setOperationState] = useState<OperationState | null>(null);
  const [showErrorReport, setShowErrorReport] = useState(false);
  
  // Créer le gestionnaire d'opérations (use useState to avoid constructor issues)
  const [manager] = useState(() => new BatchOperationsManager());
  
  /**
   * Exécute une opération
   * Exigence: 8.5 - Support des opérations
   */
  const handleOperation = useCallback(async (
    type: BatchOperationType,
    options: BatchOperationOptions = {}
  ) => {
    setOperationState({
      type,
      progress: 0,
      isRunning: true
    });
    
    try {
      const convertedShots = selectedShots.map(productionShotToShot);
      const result = await manager.execute(type, convertedShots, options);
      
      setOperationState({
        type,
        progress: 100,
        isRunning: false,
        result
      });
      
      // Notifier le parent
      onOperationComplete?.(result);
      
      // Afficher le rapport d'erreurs si nécessaire
      if (result.failed.length > 0) {
        setShowErrorReport(true);
      } else {
        // Fermer automatiquement après succès complet
        setTimeout(() => {
          setOperationState(null);
        }, 2000);
      }
      
    } catch (error) {
      setOperationState({
        type,
        progress: 0,
        isRunning: false,
        error: error as Error
      });
    }
  }, [manager, selectedShots, onOperationComplete]);
  
  /**
   * Annule l'opération en cours
   */
  const handleCancel = useCallback(() => {
    if (operationState?.isRunning) {
      // Annuler via le gestionnaire
      // Note: nécessite l'ID de l'opération, à implémenter
      setOperationState(null);
    }
  }, [operationState]);
  
  /**
   * Ferme la barre d'outils
   */
  const handleClose = useCallback(() => {
    setOperationState(null);
    setShowErrorReport(false);
    onClose?.();
  }, [onClose]);
  
  /**
   * Formate le temps estimé
   */
  const formatEstimatedTime = (ms: number): string => {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${Math.ceil(ms / 1000)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.ceil((ms % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    }
  };
  
  /**
   * Obtient l'estimation de temps pour une opération
   */
  const getEstimatedTime = (type: BatchOperationType): string => {
    if (estimatedTime) {
      return formatEstimatedTime(estimatedTime);
    }
    const estimated = manager.estimateTime(type, selectedShots.length);
    return formatEstimatedTime(estimated);
  };
  
  return (
    <AnimatePresence>
      <motion.div
        className="batch-operations-toolbar"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -20, opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="toolbar-content">
          {/* En-tête */}
          <div className="toolbar-header">
            <span className="selection-count">
              {selectedShots.length} plan{selectedShots.length > 1 ? 's' : ''} sélectionné{selectedShots.length > 1 ? 's' : ''}
            </span>
            <button
              className="close-button"
              onClick={handleClose}
              aria-label="Fermer"
            >
              <X size={16} />
            </button>
          </div>
          
          {/* Boutons d'opérations */}
          {!operationState && (
            <div className="toolbar-actions">
              <button
                className="action-button"
                onClick={() => handleOperation('duplicate')}
                title={`Dupliquer (≈${getEstimatedTime('duplicate')})`}
              >
                <Copy size={18} />
                <span>Dupliquer</span>
              </button>
              
              <button
                className="action-button danger"
                onClick={() => {
                  if (selectedShots.length > 5) {
                    if (confirm(`Êtes-vous sûr de vouloir supprimer ${selectedShots.length} plans ?`)) {
                      handleOperation('delete');
                    }
                  } else {
                    handleOperation('delete');
                  }
                }}
                title={`Supprimer (≈${getEstimatedTime('delete')})`}
              >
                <Trash2 size={18} />
                <span>Supprimer</span>
              </button>
              
              <button
                className="action-button"
                onClick={() => handleOperation('export')}
                title={`Exporter (≈${getEstimatedTime('export')})`}
              >
                <Download size={18} />
                <span>Exporter</span>
              </button>
              
              <button
                className="action-button"
                onClick={() => handleOperation('transform')}
                title={`Transformer (≈${getEstimatedTime('transform')})`}
              >
                <Wand2 size={18} />
                <span>Transformer</span>
              </button>
              
              <button
                className="action-button"
                onClick={() => handleOperation('tag')}
                title={`Ajouter des tags (≈${getEstimatedTime('tag')})`}
              >
                <Tag size={18} />
                <span>Tags</span>
              </button>
            </div>
          )}
          
          {/* Progression */}
          {operationState?.isRunning && (
            <div className="toolbar-progress">
              <div className="progress-header">
                <span className="progress-label">
                  {operationState.type === 'duplicate' && 'Duplication en cours...'}
                  {operationState.type === 'delete' && 'Suppression en cours...'}
                  {operationState.type === 'export' && 'Export en cours...'}
                  {operationState.type === 'transform' && 'Transformation en cours...'}
                  {operationState.type === 'tag' && 'Ajout de tags en cours...'}
                </span>
                <button
                  className="cancel-button"
                  onClick={handleCancel}
                  aria-label="Annuler"
                >
                  <X size={14} />
                </button>
              </div>
              
              <div className="progress-bar-container">
                <div
                  className="progress-bar"
                  style={{ width: `${operationState.progress}%` }}
                />
              </div>
              
              <div className="progress-info">
                <span>{Math.round(operationState.progress)}%</span>
                <Loader2 size={14} className="spinner" />
              </div>
            </div>
          )}
          
          {/* Résultat */}
          {operationState && !operationState.isRunning && operationState.result && (
            <div className="toolbar-result">
              {operationState.result.failed.length === 0 ? (
                <div className="result-success">
                  <CheckCircle size={18} className="success-icon" />
                  <span>
                    {operationState.result.success.length} plan{operationState.result.success.length > 1 ? 's' : ''} traité{operationState.result.success.length > 1 ? 's' : ''} avec succès
                  </span>
                  <span className="result-time">
                    ({formatEstimatedTime(operationState.result.totalTime)})
                  </span>
                </div>
              ) : (
                <div className="result-partial">
                  <AlertCircle size={18} className="warning-icon" />
                  <span>
                    {operationState.result.success.length} succès, {operationState.result.failed.length} échec{operationState.result.failed.length > 1 ? 's' : ''}
                  </span>
                  <button
                    className="view-errors-button"
                    onClick={() => setShowErrorReport(true)}
                  >
                    Voir les erreurs
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* Erreur */}
          {operationState && !operationState.isRunning && operationState.error && (
            <div className="toolbar-error">
              <AlertCircle size={18} className="error-icon" />
              <span>Erreur: {operationState.error.message}</span>
            </div>
          )}
        </div>
        
        {/* Rapport d'erreurs */}
        <AnimatePresence>
          {showErrorReport && operationState?.result && (
            <motion.div
              className="error-report-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowErrorReport(false)}
            >
              <motion.div
                className="error-report"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="error-report-header">
                  <h3>Rapport d'erreurs</h3>
                  <button
                    className="close-button"
                    onClick={() => setShowErrorReport(false)}
                    aria-label="Fermer"
                  >
                    <X size={18} />
                  </button>
                </div>
                
                <div className="error-report-content">
                  <p className="error-summary">
                    {operationState.result.failed.length} plan{operationState.result.failed.length > 1 ? 's' : ''} n'ont pas pu être traité{operationState.result.failed.length > 1 ? 's' : ''}:
                  </p>
                  
                  <ul className="error-list">
                    {operationState.result.failed.map((failure, index) => (
                      <li key={index} className="error-item">
                        <strong>{`Shot ${failure.shot.number}`}</strong>
                        <span className="error-message">{failure.error.message}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="error-report-footer">
                  <button
                    className="retry-button"
                    onClick={() => {
                      setShowErrorReport(false);
                      // Réessayer avec les plans échoués
                      handleOperation(operationState.type, {});
                    }}
                  >
                    Réessayer les échecs
                  </button>
                  <button
                    className="close-button-secondary"
                    onClick={() => setShowErrorReport(false)}
                  >
                    Fermer
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};
