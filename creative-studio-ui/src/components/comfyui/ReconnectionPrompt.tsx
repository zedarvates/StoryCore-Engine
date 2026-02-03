/**
 * ReconnectionPrompt Component
 * 
 * Displays a notification when ComfyUI becomes available during mock mode,
 * prompting the user to switch to real generation.
 * 
 * Validates: Requirement 11.5
 */

import React, { useEffect, useState } from 'react';
import './ReconnectionPrompt.css';

export interface ReconnectionPromptProps {
  /** Whether the prompt should be shown */
  show: boolean;
  
  /** Backend URL that became available */
  backendUrl?: string;
  
  /** Backend version information */
  backendVersion?: string;
  
  /** Callback when user clicks "Switch Now" */
  onSwitchNow: () => void;
  
  /** Callback when user clicks "Stay in Mock Mode" */
  onStayInMockMode: () => void;
  
  /** Callback when prompt is dismissed */
  onDismiss?: () => void;
  
  /** Auto-dismiss after specified milliseconds (0 = no auto-dismiss) */
  autoDismissMs?: number;
}

export const ReconnectionPrompt: React.FC<ReconnectionPromptProps> = ({
  show,
  backendUrl = 'http://localhost:8000',
  backendVersion,
  onSwitchNow,
  onStayInMockMode,
  onDismiss,
  autoDismissMs = 0,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  
  /**
   * Handle show/hide with animation
   */
  useEffect(() => {
    if (show) {
      // Show with animation
      setIsVisible(true);
      setIsExiting(false);
    } else {
      // Hide with animation
      if (isVisible) {
        setIsExiting(true);
        setTimeout(() => {
          setIsVisible(false);
          setIsExiting(false);
        }, 300);
      }
    }
  }, [show, isVisible]);
  
  /**
   * Handle auto-dismiss
   */
  useEffect(() => {
    if (show && autoDismissMs > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, autoDismissMs);
      
      return () => clearTimeout(timer);
    }
  }, [show, autoDismissMs]);
  
  /**
   * Handle "Switch Now" button
   */
  const handleSwitchNow = () => {
    setIsExiting(true);
    setTimeout(() => {
      onSwitchNow();
      setIsVisible(false);
      setIsExiting(false);
    }, 200);
  };
  
  /**
   * Handle "Stay in Mock Mode" button
   */
  const handleStayInMockMode = () => {
    setIsExiting(true);
    setTimeout(() => {
      onStayInMockMode();
      setIsVisible(false);
      setIsExiting(false);
    }, 200);
  };
  
  /**
   * Handle dismiss (close button)
   */
  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss?.();
      setIsVisible(false);
      setIsExiting(false);
    }, 200);
  };
  
  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };
  
  if (!isVisible) {
    return null;
  }
  
  return (
    <div 
      className={`reconnection-prompt-overlay ${isExiting ? 'exiting' : ''}`}
      role="dialog"
      aria-labelledby="reconnection-prompt-title"
      aria-describedby="reconnection-prompt-description"
      aria-modal="true"
    >
      <div className={`reconnection-prompt ${isExiting ? 'exiting' : ''}`}>
        {/* Header */}
        <div className="reconnection-prompt-header">
          <div className="reconnection-prompt-icon">
            <span className="reconnection-prompt-icon-symbol">✓</span>
          </div>
          <h3 id="reconnection-prompt-title" className="reconnection-prompt-title">
            ComfyUI Backend Available
          </h3>
          {onDismiss && (
            <button
              className="reconnection-prompt-close"
              onClick={handleDismiss}
              onKeyDown={(e) => handleKeyDown(e, handleDismiss)}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          )}
        </div>
        
        {/* Content */}
        <div className="reconnection-prompt-content">
          <p id="reconnection-prompt-description" className="reconnection-prompt-message">
            ComfyUI Desktop is now available and ready for real AI generation.
          </p>
          
          <div className="reconnection-prompt-details">
            <div className="reconnection-prompt-detail-item">
              <span className="reconnection-prompt-detail-label">Backend:</span>
              <span className="reconnection-prompt-detail-value">{backendUrl}</span>
            </div>
            {backendVersion && (
              <div className="reconnection-prompt-detail-item">
                <span className="reconnection-prompt-detail-label">Version:</span>
                <span className="reconnection-prompt-detail-value">{backendVersion}</span>
              </div>
            )}
          </div>
          
          <p className="reconnection-prompt-question">
            Would you like to switch to real generation now?
          </p>
        </div>
        
        {/* Actions */}
        <div className="reconnection-prompt-actions">
          <button
            className="reconnection-prompt-button primary"
            onClick={handleSwitchNow}
            onKeyDown={(e) => handleKeyDown(e, handleSwitchNow)}
            autoFocus
          >
            Switch Now
          </button>
          <button
            className="reconnection-prompt-button secondary"
            onClick={handleStayInMockMode}
            onKeyDown={(e) => handleKeyDown(e, handleStayInMockMode)}
          >
            Stay in Mock Mode
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReconnectionPrompt;
