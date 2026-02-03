/**
 * Empty Projects State Component
 * 
 * Displays when no projects exist in the project directory.
 * Provides a call-to-action to create a new project.
 * 
 * Implements Requirements 5.1, 5.2
 */

import React from 'react';

export interface EmptyProjectsStateProps {
  onCreateProject: () => void;
}

export function EmptyProjectsState({ onCreateProject }: EmptyProjectsStateProps) {
  return (
    <div className="empty-projects-state" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '4rem 2rem',
      textAlign: 'center',
      minHeight: '400px',
    }}>
      {/* Illustration */}
      <div style={{
        fontSize: '4rem',
        marginBottom: '1.5rem',
        opacity: 0.5,
      }}>
        📁
      </div>

      {/* Message */}
      <h2 style={{
        fontSize: '1.5rem',
        fontWeight: 600,
        marginBottom: '0.5rem',
        color: 'var(--text-primary, #1a1a1a)',
      }}>
        No Projects Found
      </h2>

      <p style={{
        fontSize: '1rem',
        color: 'var(--text-secondary, #666)',
        marginBottom: '2rem',
        maxWidth: '400px',
      }}>
        You haven't created any projects yet. Get started by creating your first StoryCore project.
      </p>

      {/* Call-to-Action Button */}
      <button
        onClick={onCreateProject}
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
        Create New Project
      </button>
    </div>
  );
}
