/**
 * GoToTimeDialog Component
 * 
 * Dialog for jumping to a specific timecode in the timeline.
 * Supports MM:SS:FF format input with validation.
 * 
 * Requirements: 4.6
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';

interface GoToTimeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToTime: (frame: number) => void;
  maxFrame: number;
  fps?: number;
}

export const GoToTimeDialog: React.FC<GoToTimeDialogProps> = ({
  isOpen,
  onClose,
  onGoToTime,
  maxFrame,
  fps = 24,
}) => {
  const [timecode, setTimecode] = useState('00:00:00');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);
  
  // Parse timecode string to frames
  const parseTimecode = useCallback((tc: string): number | null => {
    // Match MM:SS:FF or M:SS:FF format
    const match = tc.match(/^(\d+):(\d{1,2}):(\d{1,2})$/);
    if (!match) return null;
    
    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    const frames = parseInt(match[3], 10);
    
    // Validate ranges
    if (seconds >= 60 || frames >= fps) return null;
    
    return (minutes * 60 + seconds) * fps + frames;
  }, [fps]);
  
  // Format frames to timecode string
  const formatTimecode = useCallback((frame: number): string => {
    const totalSeconds = Math.floor(frame / fps);
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60);
    const frameNum = frame % fps;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(frameNum).padStart(2, '0')}`;
  }, [fps]);
  
  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTimecode(value);
    
    // Validate format
    if (value && !/^\d*:?\d{0,2}:?\d{0,2}$/.test(value)) {
      setError('Invalid format. Use MM:SS:FF');
      return;
    }
    
    // Check if valid timecode
    const frame = parseTimecode(value);
    if (value && frame === null) {
      if (value.match(/\d+:\d{2}:\d{2}/)) {
        setError('Invalid timecode. Check seconds (0-59) and frames (0-23)');
      } else {
        setError('Invalid format. Use MM:SS:FF');
      }
      return;
    }
    
    // Check if within range
    if (frame !== null && frame > maxFrame) {
      setError(`Timecode exceeds timeline duration (${formatTimecode(maxFrame)})`);
      return;
    }
    
    setError('');
  }, [parseTimecode, maxFrame, formatTimecode]);
  
  // Handle form submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (error) return;
    
    const frame = parseTimecode(timecode);
    if (frame !== null) {
      onGoToTime(frame);
      onClose();
    }
  }, [error, timecode, parseTimecode, onGoToTime, onClose]);
  
  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      handleSubmit(e);
    }
  }, [handleSubmit, onClose]);
  
  // Quick jump buttons
  const handleQuickJump = useCallback((target: 'start' | 'end' | 'middle') => {
    let frame: number;
    switch (target) {
      case 'start':
        frame = 0;
        break;
      case 'end':
        frame = maxFrame;
        break;
      case 'middle':
        frame = Math.floor(maxFrame / 2);
        break;
    }
    setTimecode(formatTimecode(frame));
    onGoToTime(frame);
    onClose();
  }, [maxFrame, formatTimecode, onGoToTime, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <div className="goto-time-dialog-overlay" onClick={onClose}>
      <div 
        className="goto-time-dialog" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="goto-time-title"
      >
        <div className="goto-time-header">
          <h3 id="goto-time-title">Go to Time</h3>
          <button 
            className="close-btn" 
            onClick={onClose}
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="goto-time-form">
          <div className="goto-time-input-group">
            <label htmlFor="timecode-input">
              Enter timecode (MM:SS:FF)
            </label>
            <input
              ref={inputRef}
              id="timecode-input"
              type="text"
              value={timecode}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="00:00:00"
              className={`timecode-input ${error ? 'error' : ''}`}
              aria-describedby="timecode-hint"
              aria-invalid={!!error}
              autoComplete="off"
            />
            <span id="timecode-hint" className="input-hint">
              Frame rate: {fps} fps
            </span>
            {error && (
              <span className="error-message" role="alert">
                {error}
              </span>
            )}
          </div>
          
          <div className="quick-jump-buttons">
            <span className="quick-jump-label">Quick jump:</span>
            <button
              type="button"
              className="quick-jump-btn"
              onClick={() => handleQuickJump('start')}
            >
              Start
            </button>
            <button
              type="button"
              className="quick-jump-btn"
              onClick={() => handleQuickJump('middle')}
            >
              Middle
            </button>
            <button
              type="button"
              className="quick-jump-btn"
              onClick={() => handleQuickJump('end')}
            >
              End
            </button>
          </div>
          
          <div className="dialog-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!!error || !timecode}
            >
              Go
            </button>
          </div>
        </form>
        
        <div className="keyboard-shortcuts-hint">
          <span>Press</span>
          <kbd>Enter</kbd>
          <span>to confirm,</span>
          <kbd>Esc</kbd>
          <span>to cancel</span>
        </div>
      </div>
    </div>
  );
};

export default GoToTimeDialog;

