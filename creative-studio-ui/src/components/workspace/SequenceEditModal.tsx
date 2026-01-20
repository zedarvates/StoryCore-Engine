/**
 * Sequence Edit Modal Component
 * 
 * Modal for editing sequence properties:
 * - Order number
 * - Duration
 * - Number of shots
 * - Resume/description
 */

import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import './SequenceEditModal.css';

interface SequenceEditModalProps {
  sequence: {
    id: string;
    name: string;
    order: number;
    duration: number;
    shots: number;
    resume: string;
  };
  onSave: (updatedSequence: {
    id: string;
    order: number;
    duration: number;
    shots: number;
    resume: string;
  }) => void;
  onClose: () => void;
}

export function SequenceEditModal({
  sequence,
  onSave,
  onClose,
}: SequenceEditModalProps) {
  const [order, setOrder] = useState(sequence.order);
  const [duration, setDuration] = useState(sequence.duration);
  const [shots, setShots] = useState(sequence.shots);
  const [resume, setResume] = useState(sequence.resume);

  // Handle save
  const handleSave = () => {
    onSave({
      id: sequence.id,
      order,
      duration,
      shots,
      resume,
    });
    onClose();
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && e.ctrlKey) {
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [order, duration, shots, resume]);

  return (
    <div className="sequence-edit-modal-overlay" onClick={onClose}>
      <div className="sequence-edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Éditer Séquence: {sequence.name}</h2>
          <button className="btn-close" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="order">Numéro d'ordre</label>
            <input
              id="order"
              type="number"
              min="1"
              value={order}
              onChange={(e) => setOrder(parseInt(e.target.value) || 1)}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="duration">Durée (secondes)</label>
            <input
              id="duration"
              type="number"
              min="0"
              step="0.1"
              value={duration}
              onChange={(e) => setDuration(parseFloat(e.target.value) || 0)}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="shots">Nombre de plans</label>
            <input
              id="shots"
              type="number"
              min="1"
              value={shots}
              onChange={(e) => setShots(parseInt(e.target.value) || 1)}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="resume">Résumé</label>
            <textarea
              id="resume"
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              className="form-textarea"
              rows={4}
              maxLength={500}
            />
            <span className="char-count">{resume.length}/500 caractères</span>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            Annuler
          </button>
          <button className="btn-save" onClick={handleSave}>
            <Save className="w-4 h-4" />
            <span>Enregistrer</span>
          </button>
        </div>

        <div className="modal-hint">
          <p>Astuce: Appuyez sur Ctrl+Enter pour enregistrer, Échap pour annuler</p>
        </div>
      </div>
    </div>
  );
}
