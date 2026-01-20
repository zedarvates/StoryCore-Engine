/**
 * DialoguePhraseEditor - Editor for individual dialogue phrase properties
 * 
 * Provides interface for editing dialogue phrase text, timestamps, shot linking,
 * and voice parameters with delete confirmation.
 * 
 * Requirements: 4.2, 4.3, 4.4
 */

import React, { useState, useCallback } from 'react';
import type { DialoguePhrase, Shot } from '../types/projectDashboard';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

// ============================================================================
// Component Props
// ============================================================================

export interface DialoguePhraseEditorProps {
  phrase: DialoguePhrase;
  shots: Shot[];
  onUpdate: (updates: Partial<DialoguePhrase>) => void;
  onDelete: () => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export const DialoguePhraseEditor: React.FC<DialoguePhraseEditorProps> = ({
  phrase,
  shots,
  onUpdate,
  onDelete,
  className = '',
}) => {
  // ============================================================================
  // State
  // ============================================================================

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [localText, setLocalText] = useState(phrase.text);
  const [localStartTime, setLocalStartTime] = useState(phrase.startTime.toString());
  const [localEndTime, setLocalEndTime] = useState(phrase.endTime.toString());

  // ============================================================================
  // Computed Values
  // ============================================================================

  const linkedShot = shots.find(shot => shot.id === phrase.shotId);
  const duration = phrase.endTime - phrase.startTime;

  // Validation
  const isValidStartTime = !isNaN(parseFloat(localStartTime)) && parseFloat(localStartTime) >= 0;
  const isValidEndTime = !isNaN(parseFloat(localEndTime)) && parseFloat(localEndTime) > parseFloat(localStartTime);
  const isValidText = localText.trim().length > 0;

  // ============================================================================
  // Event Handlers
  // ============================================================================

  /**
   * Handle text change
   */
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    setLocalText(newText);
    
    if (newText.trim().length > 0) {
      onUpdate({ text: newText });
    }
  }, [onUpdate]);

  /**
   * Handle start time change
   */
  const handleStartTimeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalStartTime(value);
    
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue < phrase.endTime) {
      onUpdate({ startTime: numValue });
    }
  }, [phrase.endTime, onUpdate]);

  /**
   * Handle end time change
   */
  const handleEndTimeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalEndTime(value);
    
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > phrase.startTime) {
      onUpdate({ endTime: numValue });
    }
  }, [phrase.startTime, onUpdate]);

  /**
   * Handle shot linking change
   */
  const handleShotLinkChange = useCallback((shotId: string) => {
    onUpdate({ shotId });
  }, [onUpdate]);

  /**
   * Handle delete button click
   */
  const handleDeleteClick = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  /**
   * Handle delete confirmation
   */
  const handleDeleteConfirm = useCallback(() => {
    setShowDeleteConfirm(false);
    onDelete();
  }, [onDelete]);

  /**
   * Handle delete cancellation
   */
  const handleDeleteCancel = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className={`dialogue-phrase-editor ${className}`} style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>Edit Dialogue Phrase</h3>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDeleteClick}
          aria-label="Delete phrase"
        >
          Delete
        </Button>
      </div>

      {/* Phrase Text */}
      <div style={styles.field}>
        <Label htmlFor="phrase-text">Phrase Text</Label>
        <Input
          id="phrase-text"
          type="text"
          value={localText}
          onChange={handleTextChange}
          placeholder="Enter dialogue text..."
          aria-invalid={!isValidText}
          aria-describedby={!isValidText ? 'text-error' : undefined}
        />
        {!isValidText && (
          <span id="text-error" style={styles.error}>
            Phrase text cannot be empty
          </span>
        )}
      </div>

      {/* Timestamp Controls */}
      <div style={styles.row}>
        {/* Start Time */}
        <div style={styles.field}>
          <Label htmlFor="start-time">Start Time (seconds)</Label>
          <Input
            id="start-time"
            type="number"
            min="0"
            step="0.1"
            value={localStartTime}
            onChange={handleStartTimeChange}
            aria-invalid={!isValidStartTime}
            aria-describedby={!isValidStartTime ? 'start-time-error' : undefined}
          />
          {!isValidStartTime && (
            <span id="start-time-error" style={styles.error}>
              Start time must be a positive number
            </span>
          )}
        </div>

        {/* End Time */}
        <div style={styles.field}>
          <Label htmlFor="end-time">End Time (seconds)</Label>
          <Input
            id="end-time"
            type="number"
            min={parseFloat(localStartTime) + 0.1}
            step="0.1"
            value={localEndTime}
            onChange={handleEndTimeChange}
            aria-invalid={!isValidEndTime}
            aria-describedby={!isValidEndTime ? 'end-time-error' : undefined}
          />
          {!isValidEndTime && (
            <span id="end-time-error" style={styles.error}>
              End time must be greater than start time
            </span>
          )}
        </div>
      </div>

      {/* Duration Display */}
      <div style={styles.info}>
        <span style={styles.infoLabel}>Duration:</span>
        <span style={styles.infoValue}>{duration.toFixed(2)}s</span>
      </div>

      {/* Shot Linking */}
      <div style={styles.field}>
        <Label htmlFor="shot-link">Linked Shot</Label>
        <Select
          value={phrase.shotId}
          onValueChange={handleShotLinkChange}
        >
          <SelectTrigger id="shot-link">
            <SelectValue placeholder="Select a shot..." />
          </SelectTrigger>
          <SelectContent>
            {shots.length === 0 ? (
              <SelectItem value="no-shots" disabled>
                No shots available
              </SelectItem>
            ) : (
              shots.map(shot => (
                <SelectItem key={shot.id} value={shot.id}>
                  Shot {shot.id.slice(-8)} ({shot.startTime}s - {shot.startTime + shot.duration}s)
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {linkedShot && (
          <div style={styles.shotInfo}>
            <span style={styles.infoLabel}>Shot Range:</span>
            <span style={styles.infoValue}>
              {linkedShot.startTime}s - {linkedShot.startTime + linkedShot.duration}s
            </span>
          </div>
        )}
      </div>

      {/* Character and Emotion Metadata */}
      <div style={styles.row}>
        {/* Character */}
        <div style={styles.field}>
          <Label htmlFor="character">Character (optional)</Label>
          <Input
            id="character"
            type="text"
            value={phrase.metadata.character || ''}
            onChange={(e) => onUpdate({
              metadata: { ...phrase.metadata, character: e.target.value }
            })}
            placeholder="Character name..."
          />
        </div>

        {/* Emotion */}
        <div style={styles.field}>
          <Label htmlFor="emotion">Emotion (optional)</Label>
          <Input
            id="emotion"
            type="text"
            value={phrase.metadata.emotion || ''}
            onChange={(e) => onUpdate({
              metadata: { ...phrase.metadata, emotion: e.target.value }
            })}
            placeholder="Emotion..."
          />
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Dialogue Phrase</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this dialogue phrase? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div style={styles.confirmContent}>
            <p style={styles.confirmText}>
              <strong>Phrase:</strong> {phrase.text}
            </p>
            <p style={styles.confirmText}>
              <strong>Time:</strong> {phrase.startTime}s - {phrase.endTime}s
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleDeleteCancel}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '20px',
    backgroundColor: '#1a1a1a',
    borderRadius: '8px',
    border: '1px solid #333',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '12px',
    borderBottom: '1px solid #333',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#fff',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1,
  },
  row: {
    display: 'flex',
    gap: '16px',
  },
  error: {
    fontSize: '12px',
    color: '#ff4444',
    marginTop: '4px',
  },
  info: {
    display: 'flex',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#2a2a2a',
    borderRadius: '4px',
  },
  infoLabel: {
    fontSize: '14px',
    color: '#999',
    fontWeight: 500,
  },
  infoValue: {
    fontSize: '14px',
    color: '#fff',
    fontWeight: 600,
  },
  shotInfo: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
    padding: '8px 12px',
    backgroundColor: '#2a2a2a',
    borderRadius: '4px',
  },
  confirmContent: {
    padding: '16px 0',
  },
  confirmText: {
    margin: '8px 0',
    fontSize: '14px',
    color: '#ccc',
  },
};

export default DialoguePhraseEditor;
