/**
 * Inline Error Message Component
 * 
 * Displays validation errors inline with form fields
 */

import React from 'react';

export interface InlineErrorMessageProps {
  message: string;
  style?: React.CSSProperties;
  className?: string;
}

export function InlineErrorMessage({ message, style = {}, className = '' }: InlineErrorMessageProps) {
  if (!message) return null;

  const defaultStyle: React.CSSProperties = {
    color: '#dc3545',
    fontSize: '12px',
    marginTop: '4px',
    marginBottom: '4px',
    ...style
  };

  return (
    <div style={defaultStyle} className={className} role="alert">
      {message}
    </div>
  );
}
