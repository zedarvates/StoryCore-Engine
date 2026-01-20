import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FrameComparisonView } from './FrameComparisonView';
import './ShotFrameViewer.css';

export interface ShotMetadata {
  id: string;
  name: string;
  description?: string;
  duration: number;
  startTime: number;
  endTime: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  frameRate: number;
  resolution: { width: number; height: number };
  position: number;
  track: number;
  inPoint: number; // Point d'entrée en frames
  outPoint: number; // Point de sortie en frames
  tags: string[];
  category?: string;
  status: 'draft' | 'ready' | 'processing' | 'error';
  locked: boolean;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface ShotFrameViewerProps {
  shot: ShotMetadata;
  onUpdate?: (shot: ShotMetadata) => void;
  onClose?: () => void;
}

export type TimecodeFormat = 'frames' | 'seconds' | 'smpte';

interface ValidationError {
  field: string;
  message: string;
}

export const ShotFrameViewer: React.FC<ShotFrameViewerProps> = ({
  shot: initialShot,
  onUpdate,
  onClose
}) => {
  const [shot, setShot] = useState<ShotMetadata>(initialShot);
  const [currentFrame, setCurrentFrame] = useState(shot.inPoint);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100); // 100% = normal, up to 400%
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonFrame, setComparisonFrame] = useState(shot.inPoint);
  const [timecodeFormat, setTimecodeFormat] = useState<TimecodeFormat>('smpte');
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Calculate current time from frame number
  const frameToTime = useCallback((frame: number): number => {
    return frame / shot.frameRate;
  }, [shot.frameRate]);

  // Calculate frame number from time
  const timeToFrame = useCallback((time: number): number => {
    return Math.round(time * shot.frameRate);
  }, [shot.frameRate]);

  // Navigate to specific frame
  const seekToFrame = useCallback((frameNumber: number) => {
    const clampedFrame = Math.max(shot.inPoint, Math.min(shot.outPoint, frameNumber));
    setCurrentFrame(clampedFrame);
    
    if (videoRef.current) {
      videoRef.current.currentTime = frameToTime(clampedFrame);
    }
  }, [shot.inPoint, shot.outPoint, frameToTime]);

  // Real-time validation
  const validateField = useCallback((field: string, value: any): string | null => {
    switch (field) {
      case 'name':
        if (!value || value.trim().length === 0) {
          return 'Le nom est requis';
        }
        if (value.length > 100) {
          return 'Le nom ne peut pas dépasser 100 caractères';
        }
        break;

      case 'duration':
        if (value <= 0) {
          return 'La durée doit être positive';
        }
        if (value > 3600) {
          return 'La durée ne peut pas dépasser 1 heure';
        }
        break;

      case 'frameRate':
        if (value <= 0 || value > 120) {
          return 'Le framerate doit être entre 1 et 120 fps';
        }
        break;

      case 'inPoint':
        if (value < 0) {
          return 'Le point d\'entrée ne peut pas être négatif';
        }
        if (value >= shot.outPoint) {
          return 'Le point d\'entrée doit être avant le point de sortie';
        }
        break;

      case 'outPoint':
        if (value <= shot.inPoint) {
          return 'Le point de sortie doit être après le point d\'entrée';
        }
        const maxFrames = timeToFrame(shot.duration);
        if (value > maxFrames) {
          return `Le point de sortie ne peut pas dépasser ${maxFrames} frames`;
        }
        break;

      case 'resolution.width':
      case 'resolution.height':
        if (value <= 0 || value > 7680) {
          return 'La résolution doit être entre 1 et 7680 pixels';
        }
        break;
    }

    return null;
  }, [shot.outPoint, shot.inPoint, shot.duration, timeToFrame]);

  // Update field with validation
  const updateField = useCallback((field: string, value: any) => {
    const error = validateField(field, value);

    // Update validation errors
    setValidationErrors(prev => {
      const filtered = prev.filter(e => e.field !== field);
      if (error) {
        return [...filtered, { field, message: error }];
      }
      return filtered;
    });

    // Update shot data
    setShot(prev => {
      const updated = { ...prev };
      const keys = field.split('.');
      let current: any = updated;

      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;

      // Auto-calculate duration when in/out points change
      if (field === 'inPoint' || field === 'outPoint') {
        updated.duration = (updated.outPoint - updated.inPoint) / updated.frameRate;
      }

      updated.updatedAt = Date.now();
      updated.version += 1;

      return updated;
    });

    setIsDirty(true);
  }, [validateField]);



  // Save changes
  const handleSave = useCallback(() => {
    if (validationErrors.length === 0) {
      onUpdate?.(shot);
      setIsDirty(false);
    }
  }, [shot, validationErrors, onUpdate]);

  // Format timecode
  const formatTimecode = useCallback((frame: number, format?: TimecodeFormat): string => {
    const currentFormat = format || timecodeFormat;
    
    switch (currentFormat) {
      case 'frames':
        return `${frame} frames`;
      
      case 'seconds': {
        const totalSeconds = frame / shot.frameRate;
        return `${totalSeconds.toFixed(3)}s`;
      }
      
      case 'smpte':
      default: {
        const totalSeconds = frame / shot.frameRate;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);
        const frames = frame % shot.frameRate;
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${Math.floor(frames).toString().padStart(2, '0')}`;
      }
    }
  }, [shot.frameRate, timecodeFormat]);

  // Get validation error for field
  const getFieldError = useCallback((field: string): string | null => {
    const error = validationErrors.find(e => e.field === field);
    return error ? error.message : null;
  }, [validationErrors]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(400, prev + 25));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(100, prev - 25));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoomLevel(100);
  }, []);

  // Mouse wheel zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          handleZoomIn();
        } else {
          handleZoomOut();
        }
      }
    };

    const container = previewContainerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [handleZoomIn, handleZoomOut]);

  return (
    <div className="shot-frame-viewer">
      <div className="shot-frame-viewer__header">
        <h2>Shot Frame Viewer</h2>
        <div className="shot-frame-viewer__header-actions">
          {/* Timecode Format Selector */}
          <div className="shot-frame-viewer__timecode-format">
            <label htmlFor="timecode-format">Format:</label>
            <select
              id="timecode-format"
              value={timecodeFormat}
              onChange={(e) => setTimecodeFormat(e.target.value as TimecodeFormat)}
              className="shot-frame-viewer__format-select"
            >
              <option value="smpte">SMPTE (HH:MM:SS:FF)</option>
              <option value="seconds">Secondes</option>
              <option value="frames">Frames</option>
            </select>
          </div>
          
          {isDirty && (
            <motion.span
              className="shot-frame-viewer__dirty-indicator"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              • Non sauvegardé
            </motion.span>
          )}
          <button
            className="shot-frame-viewer__save-btn"
            onClick={handleSave}
            disabled={validationErrors.length > 0 || !isDirty}
          >
            Sauvegarder
          </button>
          {onClose && (
            <button
              className="shot-frame-viewer__close-btn"
              onClick={onClose}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="shot-frame-viewer__content">
        {/* Video Preview */}
        <div className="shot-frame-viewer__preview" ref={previewContainerRef}>
          <div
            className="shot-frame-viewer__preview-content"
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'center center'
            }}
          >
            {shot.videoUrl ? (
              <video
                ref={videoRef}
                src={shot.videoUrl}
                className="shot-frame-viewer__video"
                onTimeUpdate={(e) => {
                  const frame = timeToFrame(e.currentTarget.currentTime);
                  setCurrentFrame(frame);
                }}
              />
            ) : (
              <div className="shot-frame-viewer__no-video">
                <span>Aucune vidéo disponible</span>
              </div>
            )}
          </div>
          
          <div className="shot-frame-viewer__timecode">
            {formatTimecode(currentFrame)}
          </div>

          {/* Zoom Controls */}
          <div className="shot-frame-viewer__zoom-controls">
            <button
              onClick={handleZoomOut}
              disabled={zoomLevel <= 100}
              title="Zoom arrière (Ctrl + Molette)"
            >
              −
            </button>
            <span className="shot-frame-viewer__zoom-level">
              {zoomLevel}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={zoomLevel >= 400}
              title="Zoom avant (Ctrl + Molette)"
            >
              +
            </button>
            <button
              onClick={handleZoomReset}
              disabled={zoomLevel === 100}
              title="Réinitialiser le zoom"
              className="shot-frame-viewer__zoom-reset"
            >
              ⟲
            </button>
          </div>

          {zoomLevel > 100 && (
            <div className="shot-frame-viewer__zoom-hint">
              Aperçu haute qualité activé ({zoomLevel}%)
            </div>
          )}
        </div>

        {/* Frame Navigation */}
        <div className="shot-frame-viewer__navigation">
          <button
            onClick={() => seekToFrame(shot.inPoint)}
            title="Aller au début (Home)"
          >
            ⏮
          </button>
          <button
            onClick={() => seekToFrame(currentFrame - 1)}
            title="Frame précédente (←)"
          >
            ⏪
          </button>
          <span className="shot-frame-viewer__frame-counter">
            Frame {currentFrame} / {shot.outPoint}
          </span>
          <button
            onClick={() => seekToFrame(currentFrame + 1)}
            title="Frame suivante (→)"
          >
            ⏩
          </button>
          <button
            onClick={() => seekToFrame(shot.outPoint)}
            title="Aller à la fin (End)"
          >
            ⏭
          </button>
          <button
            onClick={() => {
              setComparisonFrame(currentFrame);
              setShowComparison(true);
            }}
            title="Comparer avec un autre frame"
            className="shot-frame-viewer__compare-btn"
          >
            ⬌ Comparer
          </button>
        </div>

        {/* Timeline with In/Out Point Markers */}
        <div className="shot-frame-viewer__timeline">
          <div className="shot-frame-viewer__timeline-header">
            <span>Timeline</span>
            <div className="shot-frame-viewer__timeline-shortcuts">
              <span title="Définir le point d'entrée">I: In Point</span>
              <span title="Définir le point de sortie">O: Out Point</span>
            </div>
          </div>
          <div className="shot-frame-viewer__timeline-track">
            {/* In Point Marker */}
            <div
              className="shot-frame-viewer__timeline-marker shot-frame-viewer__timeline-marker--in"
              style={{
                left: `${(shot.inPoint / shot.outPoint) * 100}%`
              }}
              title={`In Point: ${formatTimecode(shot.inPoint)}`}
            >
              <div className="shot-frame-viewer__timeline-marker-label">I</div>
              <div className="shot-frame-viewer__timeline-marker-line" />
            </div>

            {/* Current Frame Indicator */}
            <div
              className="shot-frame-viewer__timeline-indicator"
              style={{
                left: `${(currentFrame / shot.outPoint) * 100}%`
              }}
            >
              <div className="shot-frame-viewer__timeline-indicator-head" />
              <div className="shot-frame-viewer__timeline-indicator-line" />
            </div>

            {/* Out Point Marker */}
            <div
              className="shot-frame-viewer__timeline-marker shot-frame-viewer__timeline-marker--out"
              style={{
                left: `${(shot.outPoint / shot.outPoint) * 100}%`
              }}
              title={`Out Point: ${formatTimecode(shot.outPoint)}`}
            >
              <div className="shot-frame-viewer__timeline-marker-label">O</div>
              <div className="shot-frame-viewer__timeline-marker-line" />
            </div>

            {/* Active Region */}
            <div
              className="shot-frame-viewer__timeline-active-region"
              style={{
                left: `${(shot.inPoint / shot.outPoint) * 100}%`,
                width: `${((shot.outPoint - shot.inPoint) / shot.outPoint) * 100}%`
              }}
            />

            {/* Clickable Track */}
            <div
              className="shot-frame-viewer__timeline-clickable"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percentage = x / rect.width;
                const frame = Math.round(percentage * shot.outPoint);
                seekToFrame(frame);
              }}
            />
          </div>
          <div className="shot-frame-viewer__timeline-info">
            <span>In: {formatTimecode(shot.inPoint)}</span>
            <span>Duration: {shot.duration.toFixed(2)}s ({shot.outPoint - shot.inPoint} frames)</span>
            <span>Out: {formatTimecode(shot.outPoint)}</span>
          </div>
        </div>

        {/* Metadata Editor */}
        <div className="shot-frame-viewer__metadata">
          <h3>Métadonnées</h3>
          
          <div className="shot-frame-viewer__form">
            {/* Name */}
            <div className="shot-frame-viewer__field">
              <label htmlFor="shot-name">Nom *</label>
              <input
                id="shot-name"
                type="text"
                value={shot.name}
                onChange={(e) => updateField('name', e.target.value)}
                className={getFieldError('name') ? 'error' : ''}
              />
              <AnimatePresence>
                {getFieldError('name') && (
                  <motion.span
                    className="shot-frame-viewer__error"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                  >
                    {getFieldError('name')}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* Description */}
            <div className="shot-frame-viewer__field">
              <label htmlFor="shot-description">Description</label>
              <textarea
                id="shot-description"
                value={shot.description || ''}
                onChange={(e) => updateField('description', e.target.value)}
                rows={3}
              />
            </div>

            {/* Duration (read-only, calculated from in/out points) */}
            <div className="shot-frame-viewer__field">
              <label>Durée</label>
              <input
                type="text"
                value={`${shot.duration.toFixed(2)}s`}
                readOnly
                className="shot-frame-viewer__readonly"
              />
            </div>

            {/* Frame Rate */}
            <div className="shot-frame-viewer__field">
              <label htmlFor="shot-framerate">Frame Rate (fps) *</label>
              <input
                id="shot-framerate"
                type="number"
                value={shot.frameRate}
                onChange={(e) => updateField('frameRate', parseFloat(e.target.value))}
                min="1"
                max="120"
                step="0.01"
                className={getFieldError('frameRate') ? 'error' : ''}
              />
              <AnimatePresence>
                {getFieldError('frameRate') && (
                  <motion.span
                    className="shot-frame-viewer__error"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                  >
                    {getFieldError('frameRate')}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* In Point */}
            <div className="shot-frame-viewer__field">
              <label htmlFor="shot-inpoint">Point d'entrée (frames) *</label>
              <input
                id="shot-inpoint"
                type="number"
                value={shot.inPoint}
                onChange={(e) => updateField('inPoint', parseInt(e.target.value))}
                min="0"
                className={getFieldError('inPoint') ? 'error' : ''}
              />
              <AnimatePresence>
                {getFieldError('inPoint') && (
                  <motion.span
                    className="shot-frame-viewer__error"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                  >
                    {getFieldError('inPoint')}
                  </motion.span>
                )}
              </AnimatePresence>
              <span className="shot-frame-viewer__field-hint">
                Raccourci: Appuyez sur 'I' pour définir au frame actuel
              </span>
            </div>

            {/* Out Point */}
            <div className="shot-frame-viewer__field">
              <label htmlFor="shot-outpoint">Point de sortie (frames) *</label>
              <input
                id="shot-outpoint"
                type="number"
                value={shot.outPoint}
                onChange={(e) => updateField('outPoint', parseInt(e.target.value))}
                min="1"
                className={getFieldError('outPoint') ? 'error' : ''}
              />
              <AnimatePresence>
                {getFieldError('outPoint') && (
                  <motion.span
                    className="shot-frame-viewer__error"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                  >
                    {getFieldError('outPoint')}
                  </motion.span>
                )}
              </AnimatePresence>
              <span className="shot-frame-viewer__field-hint">
                Raccourci: Appuyez sur 'O' pour définir au frame actuel
              </span>
            </div>

            {/* Resolution */}
            <div className="shot-frame-viewer__field-group">
              <label>Résolution</label>
              <div className="shot-frame-viewer__field-row">
                <input
                  type="number"
                  value={shot.resolution.width}
                  onChange={(e) => updateField('resolution.width', parseInt(e.target.value))}
                  min="1"
                  max="7680"
                  className={getFieldError('resolution.width') ? 'error' : ''}
                />
                <span>×</span>
                <input
                  type="number"
                  value={shot.resolution.height}
                  onChange={(e) => updateField('resolution.height', parseInt(e.target.value))}
                  min="1"
                  max="7680"
                  className={getFieldError('resolution.height') ? 'error' : ''}
                />
              </div>
              <AnimatePresence>
                {(getFieldError('resolution.width') || getFieldError('resolution.height')) && (
                  <motion.span
                    className="shot-frame-viewer__error"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                  >
                    {getFieldError('resolution.width') || getFieldError('resolution.height')}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* Position & Track */}
            <div className="shot-frame-viewer__field-group">
              <div className="shot-frame-viewer__field-row">
                <div className="shot-frame-viewer__field">
                  <label htmlFor="shot-position">Position</label>
                  <input
                    id="shot-position"
                    type="number"
                    value={shot.position}
                    onChange={(e) => updateField('position', parseInt(e.target.value))}
                    min="0"
                  />
                </div>
                <div className="shot-frame-viewer__field">
                  <label htmlFor="shot-track">Piste</label>
                  <input
                    id="shot-track"
                    type="number"
                    value={shot.track}
                    onChange={(e) => updateField('track', parseInt(e.target.value))}
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* Category */}
            <div className="shot-frame-viewer__field">
              <label htmlFor="shot-category">Catégorie</label>
              <select
                id="shot-category"
                value={shot.category || ''}
                onChange={(e) => updateField('category', e.target.value || undefined)}
              >
                <option value="">Aucune</option>
                <option value="action">Action</option>
                <option value="dialogue">Dialogue</option>
                <option value="establishing">Establishing</option>
                <option value="closeup">Close-up</option>
                <option value="transition">Transition</option>
              </select>
            </div>

            {/* Status */}
            <div className="shot-frame-viewer__field">
              <label htmlFor="shot-status">Statut</label>
              <select
                id="shot-status"
                value={shot.status}
                onChange={(e) => updateField('status', e.target.value as ShotMetadata['status'])}
              >
                <option value="draft">Brouillon</option>
                <option value="ready">Prêt</option>
                <option value="processing">En traitement</option>
                <option value="error">Erreur</option>
              </select>
            </div>

            {/* Tags */}
            <div className="shot-frame-viewer__field">
              <label htmlFor="shot-tags">Tags (séparés par des virgules)</label>
              <input
                id="shot-tags"
                type="text"
                value={shot.tags.join(', ')}
                onChange={(e) => updateField('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
              />
            </div>

            {/* Locked */}
            <div className="shot-frame-viewer__field">
              <label>
                <input
                  type="checkbox"
                  checked={shot.locked}
                  onChange={(e) => updateField('locked', e.target.checked)}
                />
                <span>Verrouillé</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Summary */}
      <AnimatePresence>
        {validationErrors.length > 0 && (
          <motion.div
            className="shot-frame-viewer__validation-summary"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <h4>⚠ Erreurs de validation</h4>
            <ul>
              {validationErrors.map((error, index) => (
                <li key={index}>
                  <strong>{error.field}:</strong> {error.message}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Frame Comparison Modal */}
      <AnimatePresence>
        {showComparison && shot.videoUrl && (
          <motion.div
            className="shot-frame-viewer__comparison-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="shot-frame-viewer__comparison-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <FrameComparisonView
                videoUrl={shot.videoUrl}
                frameRate={shot.frameRate}
                frame1={currentFrame}
                frame2={comparisonFrame}
                onClose={() => setShowComparison(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ShotFrameViewer;
