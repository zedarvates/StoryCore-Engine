/**
 * VideoExtensionDialog Component
 * 
 * Dialog for extending video clips with various methods:
 * - Freeze frame (extend with last frame)
 * - Loop video
 * - AI-generated extension
 * 
 * Requirements: Timeline editing enhancement
 */

import React, { useState, useCallback, useMemo } from 'react';
import type { Shot } from '../../types';
import type { VideoExtensionOptions } from '../../hooks/useTimelineInteractions';

// ============================================================================
// Types
// ============================================================================

interface VideoExtensionDialogProps {
  isOpen: boolean;
  shotId: string;
  shot?: Shot;
  currentDuration: number;
  fps?: number;
  onApply: (options: VideoExtensionOptions) => void;
  onClose: () => void;
}

interface ExtensionPreview {
  newDuration: number;
  additionalFrames: number;
  additionalSeconds: string;
}

// ============================================================================
// Constants
// ============================================================================

const EXTENSION_MODES = [
  {
    id: 'freeze-frame',
    name: 'Image fixe',
    description: 'Prolonge avec la dernière image de la vidéo',
    icon: '🖼️',
  },
  {
    id: 'loop',
    name: 'Boucle',
    description: 'Répète la vidéo en boucle',
    icon: '🔄',
  },
  {
    id: 'extend-ai',
    name: 'Extension IA',
    description: 'Génère une suite avec l\'intelligence artificielle',
    icon: '✨',
  },
] as const;

const TRANSITION_TYPES = [
  { id: 'cut', name: 'Coupe directe' },
  { id: 'fade', name: 'Fondu' },
  { id: 'dissolve', name: 'Fondu enchaîné' },
];

// ============================================================================
// Component
// ============================================================================

export const VideoExtensionDialog: React.FC<VideoExtensionDialogProps> = ({
  isOpen,
  _shotId,
  shot,
  currentDuration,
  fps = 24,
  onApply,
  onClose,
}) => {
  const [mode, setMode] = useState<VideoExtensionOptions['mode']>('freeze-frame');
  const [duration, setDuration] = useState(48); // Default: 2 seconds
  const [applyTransition, setApplyTransition] = useState(false);
  const [transitionType, setTransitionType] = useState<VideoExtensionOptions['transitionType']>('fade');

  // Calculate preview
  const preview: ExtensionPreview = useMemo(() => ({
    newDuration: currentDuration + duration,
    additionalFrames: duration,
    additionalSeconds: (duration / fps).toFixed(1),
  }), [currentDuration, duration, fps]);

  // Handle apply
  const handleApply = useCallback(() => {
    onApply({
      mode,
      duration,
      applyTransition,
      transitionType: applyTransition ? transitionType : undefined,
    });
    onClose();
  }, [mode, duration, applyTransition, transitionType, onApply, onClose]);

  // Handle duration presets
  const handleDurationPreset = useCallback((seconds: number) => {
    setDuration(seconds * fps);
  }, [fps]);

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div 
        className="dialog video-extension-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-header">
          <h2>Extension Vidéo</h2>
          <button className="dialog-close" onClick={onClose}>×</button>
        </div>

        <div className="dialog-content">
          {/* Shot Info */}
          <div className="shot-info">
            <span className="shot-name">{shot?.name || 'Plan sans nom'}</span>
            <span className="shot-duration">
              Durée actuelle: {(currentDuration / fps).toFixed(1)}s ({currentDuration} frames)
            </span>
          </div>

          {/* Extension Mode */}
          <div className="form-group">
            <label>Mode d'extension</label>
            <div className="extension-modes">
              {EXTENSION_MODES.map((m) => (
                <button
                  key={m.id}
                  className={`mode-button ${mode === m.id ? 'active' : ''}`}
                  onClick={() => setMode(m.id as VideoExtensionOptions['mode'])}
                >
                  <span className="mode-icon">{m.icon}</span>
                  <span className="mode-name">{m.name}</span>
                  <span className="mode-description">{m.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="form-group">
            <label>Durée d'extension</label>
            <div className="duration-input">
              <input
                type="range"
                min={fps}
                max={fps * 30}
                step={fps}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
              <div className="duration-value">
                <input
                  type="number"
                  min={1}
                  max={300}
                  value={(duration / fps).toFixed(1)}
                  onChange={(e) => setDuration(Math.round(Number(e.target.value) * fps))}
                />
                <span>secondes</span>
              </div>
            </div>
            <div className="duration-presets">
              {[1, 2, 3, 5, 10].map((s) => (
                <button
                  key={s}
                  className={`preset-button ${Math.round(duration / fps) === s ? 'active' : ''}`}
                  onClick={() => handleDurationPreset(s)}
                >
                  {s}s
                </button>
              ))}
            </div>
          </div>

          {/* Transition Options */}
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={applyTransition}
                onChange={(e) => setApplyTransition(e.target.checked)}
              />
              <span>Ajouter une transition</span>
            </label>
            {applyTransition && (
              <div className="transition-options">
                {TRANSITION_TYPES.map((t) => (
                  <button
                    key={t.id}
                    className={`transition-button ${transitionType === t.id ? 'active' : ''}`}
                    onClick={() => setTransitionType(t.id as VideoExtensionOptions['transitionType'])}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="preview-panel">
            <h3>Aperçu</h3>
            <div className="preview-details">
              <div className="preview-item">
                <span className="label">Durée ajoutée:</span>
                <span className="value">{preview.additionalSeconds}s ({preview.additionalFrames} frames)</span>
              </div>
              <div className="preview-item">
                <span className="label">Nouvelle durée:</span>
                <span className="value">{(preview.newDuration / fps).toFixed(1)}s ({preview.newDuration} frames)</span>
              </div>
              <div className="preview-item">
                <span className="label">Mode:</span>
                <span className="value">{EXTENSION_MODES.find(m => m.id === mode)?.name}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="dialog-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-primary" onClick={handleApply}>
            Appliquer l'extension
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoExtensionDialog;