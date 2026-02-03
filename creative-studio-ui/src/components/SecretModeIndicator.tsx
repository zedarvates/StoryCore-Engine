/**
 * Secret Mode Indicator Component
 * 
 * Visual feedback component that displays the current secret mode status.
 * Shows "Secret Mode Active" when Ctrl+Shift+Alt keys are held, and
 * "Experimental Feature" when viewing an experimental page.
 * 
 * Requirements: 3.1, 3.2, 3.4
 */

import React from 'react';
import { useSecretMode } from '@/contexts/SecretModeContext';
import '@/styles/secret-mode-indicator.css';

/**
 * SecretModeIndicator Component
 * 
 * Provides persistent visual feedback about secret mode and experimental page status.
 * 
 * Behavior:
 * - Returns null when neither secret mode is active nor on experimental page
 * - Shows "Secret Mode Active" when Ctrl+Shift+Alt keys are held
 * - Shows "Experimental Feature" when viewing an experimental page
 * - Includes warning icon when on experimental page
 * 
 * Requirements:
 * - 3.1: Display indicator when activation combination is held
 * - 3.2: Hide indicator when activation combination is released (unless on experimental page)
 * - 3.4: Remain visible on experimental pages even after keys released
 */
export const SecretModeIndicator: React.FC = () => {
  const { isSecretMode, isOnExperimentalPage } = useSecretMode();
  
  // Hide indicator when neither condition is true
  // Requirement 3.2: Disappear when keys released (unless on experimental page)
  if (!isSecretMode && !isOnExperimentalPage) {
    return null;
  }
  
  // Determine which state to display
  const isKeysHeld = isSecretMode;
  const isExperimentalView = isOnExperimentalPage && !isSecretMode;
  
  return (
    <div 
      className={`secret-mode-indicator ${isOnExperimentalPage ? 'experimental-page' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={isKeysHeld ? 'Secret mode is active' : 'Viewing experimental feature'}
    >
      {/* Icon - changes based on state */}
      <span className="indicator-icon" aria-hidden="true">
        {isKeysHeld ? '🔓' : '🧪'}
      </span>
      
      {/* Text - shows current state */}
      <span className="indicator-text">
        {isKeysHeld ? 'Secret Mode Active' : 'Experimental Feature'}
      </span>
      
      {/* Warning icon - only shown on experimental pages */}
      {isOnExperimentalPage && (
        <span className="indicator-warning" aria-label="Work in progress">
          ⚠️ Work in Progress
        </span>
      )}
    </div>
  );
};
