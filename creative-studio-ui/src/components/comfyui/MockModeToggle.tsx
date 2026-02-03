/**
 * MockModeToggle Component
 * 
 * Provides a toggle switch to manually enable/disable mock mode.
 * Persists user preference and handles mode transitions gracefully.
 * 
 * Validates: Requirement 11.7
 */

import React, { useState, useEffect, useCallback } from 'react';
import './MockModeToggle.css';

export interface MockModeToggleProps {
  /** Current mock mode state */
  enabled: boolean;
  
  /** Callback when toggle state changes */
  onChange: (enabled: boolean) => void;
  
  /** Whether the backend is available */
  backendAvailable?: boolean;
  
  /** Whether the toggle is disabled */
  disabled?: boolean;
  
  /** Optional label text */
  label?: string;
  
  /** Show description text */
  showDescription?: boolean;
}

/**
 * Get stored mock mode preference from localStorage
 */
function getStoredPreference(): boolean {
  try {
    const stored = localStorage.getItem('comfyui_mock_mode_preference');
    return stored === 'true';
  } catch (error) {
    console.warn('Failed to read mock mode preference from localStorage:', error);
    return false;
  }
}

/**
 * Store mock mode preference to localStorage
 */
function storePreference(enabled: boolean): void {
  try {
    localStorage.setItem('comfyui_mock_mode_preference', enabled.toString());
  } catch (error) {
    console.warn('Failed to store mock mode preference to localStorage:', error);
  }
}

export const MockModeToggle: React.FC<MockModeToggleProps> = ({
  enabled,
  onChange,
  backendAvailable = false,
  disabled = false,
  label = 'Mock Mode',
  showDescription = true,
}) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  /**
   * Load stored preference on mount
   */
  useEffect(() => {
    const storedPreference = getStoredPreference();
    if (storedPreference !== enabled) {
      onChange(storedPreference);
    }
  }, []); // Only run on mount
  
  /**
   * Handle toggle change
   */
  const handleToggle = useCallback(() => {
    if (disabled || isTransitioning) {
      return;
    }
    
    setIsTransitioning(true);
    
    const newState = !enabled;
    
    // Store preference
    storePreference(newState);
    
    // Call onChange callback
    onChange(newState);
    
    // Reset transition state after animation
    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  }, [enabled, disabled, isTransitioning, onChange]);
  
  /**
   * Handle keyboard interaction
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  }, [handleToggle]);
  
  /**
   * Get description text based on state
   */
  const getDescription = (): string => {
    if (enabled) {
      return 'Using placeholder images instead of real AI generation';
    } else if (backendAvailable) {
      return 'Using real ComfyUI backend for generation';
    } else {
      return 'Backend unavailable - will use placeholders when enabled';
    }
  };
  
  /**
   * Get status indicator color
   */
  const getStatusColor = (): string => {
    if (enabled) {
      return '#f59e0b'; // Amber for mock mode
    } else if (backendAvailable) {
      return '#10b981'; // Green for real mode with backend
    } else {
      return '#6b7280'; // Gray for real mode without backend
    }
  };
  
  const isDisabled = disabled || isTransitioning;
  const statusColor = getStatusColor();
  const description = getDescription();
  
  return (
    <div className="mock-mode-toggle-container">
      <div 
        className={`mock-mode-toggle ${isDisabled ? 'disabled' : ''} ${isTransitioning ? 'transitioning' : ''}`}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        role="switch"
        aria-checked={enabled}
        aria-label={`${label}: ${enabled ? 'enabled' : 'disabled'}`}
        aria-disabled={isDisabled}
        tabIndex={isDisabled ? -1 : 0}
      >
        <div className="mock-mode-toggle-content">
          <div className="mock-mode-toggle-label-section">
            <span className="mock-mode-toggle-label">{label}</span>
            {showDescription && (
              <span className="mock-mode-toggle-description">
                {description}
              </span>
            )}
          </div>
          
          <div className="mock-mode-toggle-switch-section">
            <div 
              className={`mock-mode-toggle-switch ${enabled ? 'enabled' : 'disabled'}`}
              style={{ 
                backgroundColor: enabled ? statusColor : '#e5e7eb',
              }}
            >
              <div 
                className="mock-mode-toggle-slider"
                style={{
                  transform: enabled ? 'translateX(20px)' : 'translateX(0)',
                }}
              />
            </div>
            
            <span 
              className="mock-mode-toggle-status"
              style={{ color: statusColor }}
            >
              {enabled ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>
      </div>
      
      {!backendAvailable && !enabled && (
        <div className="mock-mode-toggle-warning">
          ⚠ Backend unavailable - mock mode will activate automatically if generation is attempted
        </div>
      )}
    </div>
  );
};

export default MockModeToggle;
