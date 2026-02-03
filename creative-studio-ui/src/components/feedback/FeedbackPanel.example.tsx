/**
 * FeedbackPanel Usage Example
 * 
 * This file demonstrates how to integrate the FeedbackPanel component
 * into your application.
 */

import React, { useState } from 'react';
import { FeedbackPanel } from './FeedbackPanel';
import { Button } from '@/components/ui/button';

/**
 * Example 1: Basic Usage
 * 
 * Simple integration with a button to open the feedback panel
 */
export function BasicFeedbackExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <Button onClick={() => setIsOpen(true)}>
        Report Issue
      </Button>

      <FeedbackPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </div>
  );
}

/**
 * Example 2: With Error Context
 * 
 * Pre-populate the feedback panel with error information
 * when an error occurs in your application
 */
export function ErrorContextExample() {
  const [isOpen, setIsOpen] = useState(false);
  const [errorContext, setErrorContext] = useState<{
    errorMessage?: string;
    stackTrace?: string;
    activeModule?: string;
  } | undefined>();

  const simulateError = () => {
    try {
      // Simulate an error
      throw new Error('Something went wrong in the grid generator');
    } catch (error) {
      // Capture error context
      setErrorContext({
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        stackTrace: error instanceof Error ? error.stack : undefined,
        activeModule: 'grid-generator',
      });
      
      // Open feedback panel
      setIsOpen(true);
    }
  };

  return (
    <div>
      <Button onClick={simulateError}>
        Simulate Error
      </Button>

      <FeedbackPanel
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          setErrorContext(undefined);
        }}
        initialContext={errorContext}
      />
    </div>
  );
}

/**
 * Example 3: Keyboard Shortcut Integration
 * 
 * Open feedback panel with Ctrl+Shift+F (or Cmd+Shift+F on Mac)
 */
export function KeyboardShortcutExample() {
  const [isOpen, setIsOpen] = useState(false);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl+Shift+F (Windows/Linux) or Cmd+Shift+F (Mac)
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'F') {
        event.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div>
      <p>Press Ctrl+Shift+F (or Cmd+Shift+F on Mac) to open feedback panel</p>

      <FeedbackPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </div>
  );
}

/**
 * Example 4: Menu Integration
 * 
 * Add feedback option to your application menu
 */
export function MenuIntegrationExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <nav>
        <ul>
          <li>
            <button onClick={() => setIsOpen(true)}>
              Help & Support
            </button>
          </li>
        </ul>
      </nav>

      <FeedbackPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </div>
  );
}

/**
 * Example 5: Global Error Handler
 * 
 * Automatically open feedback panel for uncaught errors
 */
export function GlobalErrorHandlerExample() {
  const [isOpen, setIsOpen] = useState(false);
  const [errorContext, setErrorContext] = useState<{
    errorMessage?: string;
    stackTrace?: string;
    activeModule?: string;
  } | undefined>();

  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      // Capture error context
      setErrorContext({
        errorMessage: event.message,
        stackTrace: event.error?.stack,
        activeModule: 'unknown',
      });
      
      // Open feedback panel
      setIsOpen(true);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  return (
    <div>
      <p>Global error handler is active</p>

      <FeedbackPanel
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          setErrorContext(undefined);
        }}
        initialContext={errorContext}
      />
    </div>
  );
}
