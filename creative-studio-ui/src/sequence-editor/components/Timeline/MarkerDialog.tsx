import React, { useState, useEffect } from 'react';
import type { TimelineMarker, MarkerType } from './markerTypes';
import { MARKER_COLORS } from './markerTypes';
import './timelineDialogs.css'; // Using existing dialog styles where possible

interface MarkerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (markerData: Partial<TimelineMarker>) => void;
  onDelete?: () => void;
  marker?: TimelineMarker | null;
  defaultPosition?: number;
}

const MARKER_TYPES: { value: MarkerType; label: string; icon: string }[] = [
  { value: 'info', label: 'Information', icon: '💬' },
  { value: 'warning', label: 'Warning', icon: '⚠️' },
  { value: 'error', label: 'Error', icon: '❌' },
  { value: 'important', label: 'Important', icon: '⭐' },
  { value: 'bookmark', label: 'Bookmark', icon: '🔖' },
  { value: 'custom', label: 'Custom', icon: '📌' },
];

export const MarkerDialog: React.FC<MarkerDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  marker,
  defaultPosition = 0,
}) => {
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<MarkerType>('info');
  const [color, setColor] = useState(MARKER_COLORS.info);
  const [isCustomColor, setIsCustomColor] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Initialize form when opened
  useEffect(() => {
    if (isOpen) {
      if (marker) {
        setLabel(marker.label || '');
        setDescription(marker.description || '');
        setType(marker.type || 'info');
        setColor(marker.color || MARKER_COLORS[marker.type || 'info']);
        
        // Detect if color is custom
        const isStandardColor = Object.values(MARKER_COLORS).includes(marker.color);
        setIsCustomColor(marker.color ? !isStandardColor : false);
      } else {
        setLabel('');
        setDescription('');
        setType('info');
        setColor(MARKER_COLORS.info);
        setIsCustomColor(false);
      }
      setShowConfirmDelete(false);
    }
  }, [isOpen, marker]);

  // Handle type change and update color if not using custom color
  const handleTypeChange = (newType: MarkerType) => {
    setType(newType);
    if (!isCustomColor) {
      setColor(MARKER_COLORS[newType]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      label,
      description,
      type,
      color,
      position: marker ? marker.position : defaultPosition,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="timeline-dialog-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="marker-dialog-title">
      <div className="timeline-dialog marker-dialog" onClick={(e) => e.stopPropagation()}>
        
        <div className="dialog-header">
          <h2 id="marker-dialog-title">{marker ? 'Edit Marker' : 'Create Marker'}</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close dialog">×</button>
        </div>

        <form onSubmit={handleSubmit} className="dialog-content">
          <div className="form-group">
            <label htmlFor="marker-label">Label</label>
            <input
              id="marker-label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Fix lighting here"
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="marker-description">Description (Optional)</label>
            <textarea
              id="marker-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details about this marker..."
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Marker Type</label>
            <div className="marker-type-selector">
              {MARKER_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={`type-btn ${type === t.value ? 'selected' : ''}`}
                  onClick={() => handleTypeChange(t.value)}
                  title={t.label}
                >
                  <span className="type-icon">{t.icon}</span>
                  <span className="type-label">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="marker-color">Color</label>
            <div className="color-picker-container">
              <input
                id="marker-color"
                type="color"
                value={color}
                onChange={(e) => {
                  setColor(e.target.value);
                  setIsCustomColor(true);
                }}
              />
              <span className="color-hex">{color}</span>
              {isCustomColor && (
                <button 
                  type="button" 
                  className="reset-color-btn"
                  onClick={() => {
                    setIsCustomColor(false);
                    setColor(MARKER_COLORS[type]);
                  }}
                >
                  Reset to default
                </button>
              )}
            </div>
          </div>

          <div className="dialog-footer">
            {marker && onDelete && (
              <div className="delete-container">
                {showConfirmDelete ? (
                  <div className="delete-confirm">
                    <span>Are you sure?</span>
                    <button type="button" className="btn btn-danger" onClick={() => { onDelete(); onClose(); }}>Yes, Delete</button>
                    <button type="button" className="btn btn-ghost" onClick={() => setShowConfirmDelete(false)}>Cancel</button>
                  </div>
                ) : (
                  <button type="button" className="btn btn-danger-outline" onClick={() => setShowConfirmDelete(true)}>
                    Delete Marker
                  </button>
                )}
              </div>
            )}
            
            <div className="primary-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={!label.trim()}>
                {marker ? 'Save Changes' : 'Create Marker'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MarkerDialog;
