/**
 * Secret Mode Context
 * 
 * Provides global state management for the Secret Services Menu feature.
 * Handles keyboard event detection for Ctrl+Shift+Alt combination and
 * tracks whether the user is viewing an experimental feature.
 * 
 * Requirements: 1.1, 1.2, 1.4, 5.1, 5.2
 */

import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { experimentalFeatures } from '@/config/experimentalFeatures';

/**
 * Context value interface
 */
export interface SecretModeContextValue {
  /** True when Ctrl+Shift+Alt are all pressed */
  isSecretMode: boolean;
  
  /** True when current view matches an experimental feature */
  isOnExperimentalPage: boolean;
  
  /** Current experimental page identifier (if on experimental page) */
  currentExperimentalFeature?: string;
  
  /** Function to manually set experimental page state */
  setCurrentExperimentalFeature: (featureId: string | undefined) => void;
}

/**
 * Secret Mode Context
 */
const SecretModeContext = createContext<SecretModeContextValue | undefined>(undefined);

/**
 * Props for SecretModeProvider
 */
interface SecretModeProviderProps {
  children: React.ReactNode;
}

/**
 * Secret Mode Provider Component
 * 
 * Wraps the application to provide secret mode state and keyboard event handling.
 * Listens for Ctrl+Shift+Alt combination at the window level and manages
 * secret mode activation/deactivation.
 * 
 * Requirements: 1.1, 1.2, 1.4, 5.1, 5.2
 */
export const SecretModeProvider: React.FC<SecretModeProviderProps> = ({ children }) => {
  // State for secret mode activation (keys held)
  const [isSecretMode, setIsSecretMode] = useState(false);
  
  // State for tracking current experimental feature
  const [currentExperimentalFeature, setCurrentExperimentalFeature] = useState<string | undefined>(undefined);
  
  // Track which keys are currently pressed to avoid race conditions
  const keysPressed = useRef<Set<string>>(new Set());
  
  /**
   * Keydown event handler
   * Detects when Ctrl+Shift+Alt are all pressed simultaneously
   * 
   * Requirement 1.1: Detect Ctrl+Shift+Alt combination
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Add key to tracking set
      keysPressed.current.add(e.key);
      
      // Check if all three modifier keys are pressed
      // Use ctrlKey (or metaKey on Mac) + shiftKey + altKey
      const hasCtrl = e.ctrlKey || e.metaKey;
      const hasShift = e.shiftKey;
      const hasAlt = e.altKey;
      
      // Activate secret mode when all three keys are pressed
      if (hasCtrl && hasShift && hasAlt) {
        setIsSecretMode(true);
      }
    };
    
    /**
     * Keyup event handler
     * Deactivates secret mode when any key in the combination is released
     * 
     * Requirement 1.2: Deactivate when any key released
     */
    const handleKeyUp = (e: KeyboardEvent) => {
      // Remove key from tracking set
      keysPressed.current.delete(e.key);
      
      // Deactivate if any of the required modifier keys are no longer pressed
      if (!e.ctrlKey || !e.shiftKey || !e.altKey) {
        setIsSecretMode(false);
      }
    };
    
    /**
     * Window blur event handler
     * Resets state when user switches tabs/windows to prevent stuck keys
     * 
     * Requirement 5.4: Clean up on window blur
     */
    const handleBlur = () => {
      // Clear all tracked keys
      keysPressed.current.clear();
      // Deactivate secret mode
      setIsSecretMode(false);
    };
    
    // Add event listeners at window level for global detection
    // Requirement 1.4, 5.1: Listen on all application pages
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    
    // Cleanup function to remove event listeners
    // Requirement 5.4: Prevent memory leaks
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);
  
  /**
   * Check if current view is an experimental feature
   * Since this app doesn't use React Router, we track this manually
   * via the setCurrentExperimentalFeature function
   * 
   * Requirement 3.4: Detect experimental page
   */
  const isOnExperimentalPage = useMemo(() => {
    if (!currentExperimentalFeature) return false;
    
    // Check if the current feature ID exists in the registry and is enabled
    return experimentalFeatures.some(
      feature => feature.enabled && feature.id === currentExperimentalFeature
    );
  }, [currentExperimentalFeature]);
  
  // Context value
  const value: SecretModeContextValue = {
    isSecretMode,
    isOnExperimentalPage,
    currentExperimentalFeature,
    setCurrentExperimentalFeature,
  };
  
  return (
    <SecretModeContext.Provider value={value}>
      {children}
    </SecretModeContext.Provider>
  );
};

/**
 * Custom hook to access Secret Mode context
 * 
 * @throws Error if used outside of SecretModeProvider
 * @returns SecretModeContextValue
 * 
 * Requirements: 1.1, 1.2, 3.1, 3.2
 */
export const useSecretMode = (): SecretModeContextValue => {
  const context = useContext(SecretModeContext);
  
  if (!context) {
    throw new Error('useSecretMode must be used within SecretModeProvider');
  }
  
  return context;
};
