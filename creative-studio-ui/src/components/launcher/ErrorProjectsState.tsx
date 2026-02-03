/**
 * Error Projects State Component
 * 
 * Displays when project loading fails with actionable error messages.
 * Provides retry functionality for transient errors.
 * 
 * Implements Requirements 8.1, 8.4
 */

import React from 'react';

export interface ErrorProjectsStateProps {
  error: string;
  onRetry: () => void;
}

/**
 * Determines the error type and provides actionable guidance
 */
function getErrorGuidance(error: string): {
  title: string;
  message: string;
  actionable: string;
} {
  const errorLower = error.toLowerCase();

  // File system access errors
  if (errorLower.includes('enoent') || errorLower.includes('does not exist')) {
    return {
      title: 'Project Directory Not Found',
      message: 'The default projects directory could not be found.',
      actionable: 'Create the directory or check your file system permissions.',
    };
  }

  if (errorLower.includes('eacces') || errorLower.includes('permission')) {
    return {
      title: 'Permission Denied',
      message: 'Unable to access the projects directory due to insufficient permissions.',
      actionable: 'Check your file system permissions and try again.',
    };
  }

  // IPC unavailability
  if (errorLower.includes('ipc') || errorLower.includes('electron')) {
    return {
      title: 'Electron API Unavailable',
      message: 'Running in browser mode without Electron support.',
      actionable: 'Run the application in Electron to access file system features.',
    };
  }

  // localStorage errors
  if (errorLower.includes('localstorage') || errorLower.includes('quota')) {
    return {
      title: 'Storage Error',
      message: 'Unable to access browser storage.',
      actionable: 'Clear your browser cache or check storage permissions.',
    };
  }

  // Generic error
  return {
    title: 'Failed to Load Projects',
    message: error,
    actionable: 'Try refreshing the page or check your system configuration.',
  };
}

export function ErrorProjectsState({ error, onRetry }: ErrorProjectsStateProps) {
  const guidance = getErrorGuidance(error);

  return (
    <div className="error-projects-state" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '4rem 2rem',
      textAlign: 'center',
      minHeight: '400px',
    }}>
      {/* Error Icon */}
      <div style={{
        fontSize: '4rem',
        marginBottom: '1.5rem',
        opacity: 0.5,
      }}>
        ⚠️
      </div>

      {/* Error Title */}
      <h2 style={{
        fontSize: '1.5rem',
        fontWeight: 600,
        marginBottom: '0.5rem',
        color: 'var(--error-color, #dc3545)',
      }}>
        {guidance.title}
      </h2>

      {/* Error Message */}
      <p style={{
        fontSize: '1rem',
        color: 'var(--text-secondary, #666)',
        marginBottom: '1rem',
        maxWidth: '500px',
      }}>
        {guidance.message}
      </p>

      {/* Actionable Guidance */}
      <p style={{
        fontSize: '0.875rem',
        color: 'var(--text-tertiary, #999)',
        marginBottom: '2rem',
        maxWidth: '500px',
        fontStyle: 'italic',
      }}>
        {guidance.actionable}
      </p>

      {/* Retry Button */}
      <button
        onClick={onRetry}
        style={{
          padding: '0.75rem 2rem',
          fontSize: '1rem',
          fontWeight: 500,
          color: '#fff',
          backgroundColor: 'var(--primary-color, #007bff)',
          border: 'none',
          borderRadius: '0.5rem',
          cursor: 'pointer',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--primary-color-hover, #0056b3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--primary-color, #007bff)';
        }}
      >
        Retry
      </button>
    </div>
  );
}
