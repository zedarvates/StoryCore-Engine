/**
 * BatchOperationsExample - Exemple d'utilisation des opérations par lots
 * 
 * Démontre l'utilisation de:
 * - BatchOperationsManager
 * - BatchOperationsToolbar
 * - BulkMetadataEditor
 * - useBatchOperationEstimate
 */

import React, { useState, useMemo } from 'react';
import { BatchOperationsToolbar, BulkMetadataEditor } from '../components/batchOperations';
import { BatchOperationsManager } from '../services/batchOperations';
import { useBatchOperationEstimate } from '../hooks/useBatchOperationEstimate';
import type { Shot, BatchOperationResult } from '../types';

/**
 * Exemple de composant utilisant les opérations par lots
 */
export const BatchOperationsExample: React.FC = () => {
  // État
  const [shots, setShots] = useState<Shot[]>(generateMockShots(10));
  const [selectedShotIds, setSelectedShotIds] = useState<string[]>([]);
  const [showMetadataEditor, setShowMetadataEditor] = useState(false);
  
  // Gestionnaire d'opérations
  const manager = useMemo(() => new BatchOperationsManager(), []);
  
  // Plans sélectionnés
  const selectedShots = useMemo(
    () => shots.filter(shot => selectedShotIds.includes(shot.id)),
    [shots, selectedShotIds]
  );
  
  // Estimation de temps pour duplication
  const duplicateEstimate = useBatchOperationEstimate('duplicate', selectedShots, {
    manager
  });
  
  /**
   * Gère la sélection d'un plan
   */
  const handleSelectShot = (shotId: string, isCtrlPressed: boolean) => {
    if (isCtrlPressed) {
      // Sélection multiple
      setSelectedShotIds(prev =>
        prev.includes(shotId)
          ? prev.filter(id => id !== shotId)
          : [...prev, shotId]
      );
    } else {
      // Sélection simple
      setSelectedShotIds([shotId]);
    }
  };
  
  /**
   * Gère la complétion d'une opération
   */
  const handleOperationComplete = (result: BatchOperationResult) => {
    console.log('Opération terminée:', result);
    
    // Mettre à jour les plans avec les résultats
    setShots(prev => {
      const updated = [...prev];
      
      // Appliquer les plans réussis
      for (const successShot of result.success) {
        const index = updated.findIndex(s => s.id === successShot.id);
        if (index !== -1) {
          updated[index] = successShot;
        } else {
          // Nouveau plan (duplication)
          updated.push(successShot);
        }
      }
      
      return updated;
    });
    
    // Afficher un message
    if (result.failed.length === 0) {
      alert(`✓ ${result.success.length} plans traités avec succès en ${result.totalTime}ms`);
    } else {
      alert(
        `⚠ ${result.success.length} succès, ${result.failed.length} échecs\n\n` +
        result.failed.map(f => `- ${f.shot.title}: ${f.error.message}`).join('\n')
      );
    }
  };
  
  /**
   * Applique les changements de métadonnées
   */
  const handleApplyMetadata = (updates: Partial<Shot>) => {
    setShots(prev =>
      prev.map(shot =>
        selectedShotIds.includes(shot.id)
          ? { ...shot, ...updates }
          : shot
      )
    );
    
    setShowMetadataEditor(false);
    alert(`✓ Métadonnées mises à jour pour ${selectedShotIds.length} plans`);
  };
  
  return (
    <div className="batch-operations-example">
      <div className="example-header">
        <h1>Exemple d'opérations par lots</h1>
        <p>
          Sélectionnez plusieurs plans (Ctrl+clic) pour activer les opérations par lots
        </p>
      </div>
      
      {/* Informations sur la sélection */}
      {selectedShots.length > 0 && (
        <div className="selection-info">
          <p>
            <strong>{selectedShots.length}</strong> plan{selectedShots.length > 1 ? 's' : ''} sélectionné{selectedShots.length > 1 ? 's' : ''}
          </p>
          <p>
            Temps estimé pour duplication: <strong>{duplicateEstimate.formattedTime}</strong>
            {' '}(confiance: {duplicateEstimate.confidence})
          </p>
          <button onClick={() => setShowMetadataEditor(true)}>
            Éditer les métadonnées
          </button>
        </div>
      )}
      
      {/* Barre d'outils d'opérations par lots */}
      {selectedShots.length > 1 && (
        <BatchOperationsToolbar
          selectedShots={selectedShots}
          onOperationComplete={handleOperationComplete}
          onClose={() => setSelectedShotIds([])}
        />
      )}
      
      {/* Éditeur de métadonnées groupées */}
      {showMetadataEditor && (
        <BulkMetadataEditor
          selectedShots={selectedShots}
          onApply={handleApplyMetadata}
          onCancel={() => setShowMetadataEditor(false)}
        />
      )}
      
      {/* Liste des plans */}
      <div className="shots-grid">
        {shots.map(shot => (
          <div
            key={shot.id}
            className={`shot-card ${selectedShotIds.includes(shot.id) ? 'selected' : ''}`}
            onClick={(e) => handleSelectShot(shot.id, e.ctrlKey || e.metaKey)}
          >
            <div className="shot-thumbnail">
              {shot.image ? (
                <img src={shot.image} alt={shot.title} />
              ) : (
                <div className="shot-placeholder">
                  {shot.title.charAt(0)}
                </div>
              )}
            </div>
            <div className="shot-info">
              <h3>{shot.title}</h3>
              <p>{shot.description}</p>
              <div className="shot-meta">
                <span>{shot.duration}s</span>
                {shot.metadata?.category && (
                  <span className="category">{shot.metadata.category}</span>
                )}
                {shot.metadata?.tags && shot.metadata.tags.length > 0 && (
                  <span className="tags">
                    {shot.metadata.tags.join(', ')}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Statistiques */}
      <div className="example-stats">
        <h2>Statistiques du gestionnaire</h2>
        <div className="stats-grid">
          <div className="stat-item">
            <strong>Opérations en cours:</strong>
            <span>{manager.getAllOperations().filter(op => op.status === 'running').length}</span>
          </div>
          <div className="stat-item">
            <strong>Opérations terminées:</strong>
            <span>{manager.getAllOperations().filter(op => op.status === 'completed').length}</span>
          </div>
          <div className="stat-item">
            <strong>Workers disponibles:</strong>
            <span>{manager['workerPool'].getAvailableWorkers()}</span>
          </div>
          <div className="stat-item">
            <strong>Workers occupés:</strong>
            <span>{manager['workerPool'].getBusyWorkers()}</span>
          </div>
        </div>
      </div>
      
      <style>{`
        .batch-operations-example {
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
        }
        
        .example-header {
          margin-bottom: 32px;
        }
        
        .example-header h1 {
          margin: 0 0 8px 0;
          font-size: 28px;
          font-weight: 600;
        }
        
        .example-header p {
          margin: 0;
          color: var(--color-text-secondary);
        }
        
        .selection-info {
          padding: 16px;
          background: var(--color-primary-light);
          border: 1px solid var(--color-primary);
          border-radius: 12px;
          margin-bottom: 24px;
        }
        
        .selection-info p {
          margin: 0 0 8px 0;
        }
        
        .selection-info button {
          padding: 8px 16px;
          border: none;
          background: var(--color-primary);
          color: white;
          font-weight: 500;
          border-radius: 6px;
          cursor: pointer;
        }
        
        .shots-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
          margin-bottom: 32px;
        }
        
        .shot-card {
          border: 2px solid var(--color-border);
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .shot-card:hover {
          border-color: var(--color-primary);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        
        .shot-card.selected {
          border-color: var(--color-primary);
          background: var(--color-primary-light);
        }
        
        .shot-thumbnail {
          width: 100%;
          height: 160px;
          background: var(--color-background);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .shot-thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .shot-placeholder {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: var(--color-primary);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          font-weight: 600;
        }
        
        .shot-info {
          padding: 16px;
        }
        
        .shot-info h3 {
          margin: 0 0 8px 0;
          font-size: 16px;
          font-weight: 600;
        }
        
        .shot-info p {
          margin: 0 0 12px 0;
          font-size: 14px;
          color: var(--color-text-secondary);
        }
        
        .shot-meta {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          font-size: 12px;
        }
        
        .shot-meta span {
          padding: 4px 8px;
          background: var(--color-background);
          border-radius: 4px;
        }
        
        .shot-meta .category {
          background: var(--color-primary-light);
          color: var(--color-primary);
        }
        
        .shot-meta .tags {
          background: var(--color-success-light);
          color: var(--color-success);
        }
        
        .example-stats {
          padding: 24px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 12px;
        }
        
        .example-stats h2 {
          margin: 0 0 16px 0;
          font-size: 18px;
          font-weight: 600;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }
        
        .stat-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .stat-item strong {
          font-size: 12px;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .stat-item span {
          font-size: 24px;
          font-weight: 600;
          color: var(--color-primary);
        }
      `}</style>
    </div>
  );
};

/**
 * Génère des plans de test
 */
function generateMockShots(count: number): Shot[] {
  const categories = ['Action', 'Dialogue', 'Transition', 'Establishing', 'Close-up'];
  const tags = ['important', 'review', 'final', 'draft', 'approved'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `shot-${i + 1}`,
    title: `Plan ${i + 1}`,
    description: `Description du plan ${i + 1}`,
    duration: Math.floor(Math.random() * 20) + 5,
    position: i,
    audioTracks: [],
    effects: [],
    textLayers: [],
    animations: [],
    metadata: {
      category: categories[Math.floor(Math.random() * categories.length)],
      tags: Array.from(
        { length: Math.floor(Math.random() * 3) },
        () => tags[Math.floor(Math.random() * tags.length)]
      )
    }
  }));
}
