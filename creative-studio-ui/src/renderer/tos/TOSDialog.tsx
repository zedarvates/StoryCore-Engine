/**
 * TOS Dialog React Component
 * 
 * Displays the Terms of Service dialog with acceptance and exit options.
 * Implements semantic HTML structure with proper accessibility attributes.
 * 
 * Requirements: 1.2, 2.1, 3.1, 3.2, 4.1, 4.2
 */

import React from 'react';
import './TOSDialog.css';

/**
 * License content structure containing MIT License and usage disclaimer
 * Requirements: 6.1, 6.2
 */
interface LicenseContent {
  mitLicense: string;
  usageDisclaimer: string;
}

/**
 * Complete license text displayed in the TOS dialog
 * Requirements: 6.1, 6.2
 */
const LICENSE_TEXT: LicenseContent = {
  mitLicense: `MIT License

Copyright (c) 2024 StoryCore-Engine

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`,
  usageDisclaimer: `USAGE DISCLAIMER

This application was developed as a hackathon demonstration project. While
functional, it may contain limitations, experimental features, or areas
requiring further development for production use.

By accepting these terms, you acknowledge:
- This is demonstration software showcasing AI-powered video generation
- Features may be incomplete or require additional configuration
- The software is provided for evaluation and testing purposes
- No warranty or guarantee of fitness for any particular purpose is provided`
};

/**
 * Props interface for TOSDialog component
 */
export interface TOSDialogProps {
  // No props needed - self-contained component
}

/**
 * State interface for TOSDialog component
 * Requirements: 2.1
 */
export interface TOSDialogState {
  /** Tracks whether the user has checked the acceptance checkbox */
  isAccepted: boolean;
  /** Tracks IPC communication errors */
  ipcError: string | null;
}

/**
 * TOS Dialog Component
 * 
 * Renders the Terms of Service dialog with message text and action buttons.
 * Handles user interactions and communicates with main process via IPC.
 * 
 * Features:
 * - Semantic HTML structure with proper ARIA attributes
 * - Checkbox-based acceptance mechanism
 * - IPC communication with main process
 * - Keyboard navigation support (Enter/Escape/Tab)
 * 
 * Requirements: 2.1, 6.1, 6.2
 */
export const TOSDialog: React.FC<TOSDialogProps> = () => {
  // Component state for managing acceptance checkbox
  const [state, setState] = React.useState<TOSDialogState>({
    isAccepted: false,
    ipcError: null,
  });

  // Refs for interactive elements to manage focus
  const checkboxRef = React.useRef<HTMLInputElement>(null);
  const exitButtonRef = React.useRef<HTMLButtonElement>(null);
  const acceptButtonRef = React.useRef<HTMLButtonElement>(null);

  /**
   * Handle checkbox change
   * 
   * Updates the isAccepted state when the user toggles the checkbox.
   * 
   * Requirements: 2.1, 2.2
   */
  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setState({
      ...state,
      isAccepted: event.target.checked,
    });
  };

  /**
   * Handle acceptance button click
   * 
   * Sends acceptance message to main process via IPC only if checkbox is checked.
   * Includes error handling for missing IPC API.
   * 
   * Requirements: 2.3, 2.4, 2.5, 5.3
   */
  const handleAccept = (): void => {
    // Only proceed if checkbox is checked
    if (!state.isAccepted) {
      console.warn('Accept button clicked but checkbox is not checked');
      return;
    }
    
    // Verify IPC API is available
    if (!window.tosAPI) {
      const errorMsg = 'Communication error. Please restart the application.';
      console.error('window.tosAPI is not available. IPC communication failed.');
      setState({
        ...state,
        ipcError: errorMsg,
      });
      return;
    }
    
    try {
      // Send acceptance to main process via IPC
      console.log('Sending TOS acceptance to main process');
      window.tosAPI.sendAcceptance();
    } catch (error) {
      const errorMsg = 'Communication error. Please restart the application.';
      console.error('Failed to send acceptance via IPC:', error);
      setState({
        ...state,
        ipcError: errorMsg,
      });
    }
  };

  /**
   * Handle exit button click
   * 
   * Sends exit message to main process via IPC at all times.
   * Includes error handling for missing IPC API.
   * 
   * Requirements: 5.2, 5.3, 5.4
   */
  const handleExit = (): void => {
    // Verify IPC API is available
    if (!window.tosAPI) {
      const errorMsg = 'Communication error. Please restart the application.';
      console.error('window.tosAPI is not available. IPC communication failed.');
      setState({
        ...state,
        ipcError: errorMsg,
      });
      return;
    }
    
    try {
      // Send exit to main process via IPC
      console.log('Sending TOS rejection to main process');
      window.tosAPI.sendExit();
    } catch (error) {
      const errorMsg = 'Communication error. Please restart the application.';
      console.error('Failed to send exit via IPC:', error);
      setState({
        ...state,
        ipcError: errorMsg,
      });
    }
  };

  /**
   * Handle keyboard events for accessibility
   * 
   * Supports:
   * - Space: Toggle checkbox when focused on checkbox
   * - Enter: Trigger acceptance (only if checkbox is checked)
   * - Escape: Trigger exit
   * - Tab: Cycle focus between interactive elements (checkbox, buttons)
   * - Shift+Tab: Reverse cycle focus between interactive elements
   * 
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
   */
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    const activeElement = document.activeElement;
    
    switch (event.key) {
      case ' ':
      case 'Spacebar': // For older browsers
        // Space key toggles checkbox when it's focused
        if (activeElement === checkboxRef.current) {
          event.preventDefault();
          setState({
            ...state,
            isAccepted: !state.isAccepted,
          });
        }
        break;
      
      case 'Enter':
        // Enter key triggers acceptance only if checkbox is checked
        // Prevent default to avoid triggering button clicks twice
        if (activeElement === acceptButtonRef.current && state.isAccepted) {
          event.preventDefault();
          handleAccept();
        } else if (activeElement === exitButtonRef.current) {
          event.preventDefault();
          handleExit();
        } else if (activeElement === checkboxRef.current) {
          // Enter on checkbox toggles it
          event.preventDefault();
          setState({
            ...state,
            isAccepted: !state.isAccepted,
          });
        }
        break;
      
      case 'Escape':
        // Escape key triggers exit
        event.preventDefault();
        handleExit();
        break;
      
      case 'Tab':
        // Tab key cycles focus between interactive elements
        event.preventDefault();
        
        if (event.shiftKey) {
          // Shift+Tab: Reverse cycle (Accept -> Exit -> Checkbox -> Accept)
          if (activeElement === acceptButtonRef.current) {
            exitButtonRef.current?.focus();
          } else if (activeElement === exitButtonRef.current) {
            checkboxRef.current?.focus();
          } else {
            acceptButtonRef.current?.focus();
          }
        } else {
          // Tab: Forward cycle (Checkbox -> Exit -> Accept -> Checkbox)
          if (activeElement === checkboxRef.current) {
            exitButtonRef.current?.focus();
          } else if (activeElement === exitButtonRef.current) {
            acceptButtonRef.current?.focus();
          } else {
            checkboxRef.current?.focus();
          }
        }
        break;
    }
  };

  /**
   * Render the TOS dialog with semantic HTML structure
   * 
   * Structure:
   * - Container div with role="dialog" and aria-modal="true"
   * - Content card with title, message, and action buttons
   * - Proper ARIA labels for accessibility
   * - Auto-focus on OK button for keyboard navigation
   * - Keyboard event handler for Enter/Escape/Tab navigation
   * 
   * Requirements: 1.2, 2.1, 3.1, 3.3, 4.1, 4.3, 7.2
   */
  return (
    <div 
      className="tos-dialog-container" 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="tos-title"
      onKeyDown={handleKeyDown}
    >
      <div className="tos-dialog-content">
        {/* Dialog title with semantic heading */}
        <h1 id="tos-title" className="tos-dialog-title">
          Terms of Service
        </h1>
        
        {/* Scrollable content area with license text */}
        <div className="tos-scrollable-content" role="document">
          <pre className="tos-license-text">
            {LICENSE_TEXT.mitLicense}
            {'\n\n'}
            {LICENSE_TEXT.usageDisclaimer}
          </pre>
        </div>
        
        {/* Acceptance checkbox section */}
        <div className="tos-acceptance-section">
          {/* Display IPC error message if present */}
          {state.ipcError && (
            <div className="tos-error-message" role="alert" aria-live="assertive">
              {state.ipcError}
            </div>
          )}
          
          <label className="tos-checkbox-label">
            <input
              ref={checkboxRef}
              type="checkbox"
              className="tos-checkbox"
              checked={state.isAccepted}
              onChange={handleCheckboxChange}
              aria-label="Accept terms of service"
            />
            <span className="tos-checkbox-text">
              I have read and accept the Terms of Service
            </span>
          </label>
        </div>
        
        {/* Action buttons container */}
        <div className="tos-dialog-actions">
          <button 
            ref={exitButtonRef}
            className="tos-button tos-button-exit"
            onClick={handleExit}
            disabled={!!state.ipcError}
            aria-label="Exit application"
          >
            Exit
          </button>
          <button 
            ref={acceptButtonRef}
            className="tos-button tos-button-accept"
            onClick={handleAccept}
            disabled={!state.isAccepted || !!state.ipcError}
            aria-label="Accept terms and continue"
            autoFocus
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default TOSDialog;
