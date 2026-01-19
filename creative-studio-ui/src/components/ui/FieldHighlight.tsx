/**
 * Field Highlight Component
 * 
 * Wrapper component and utility for highlighting form fields with errors
 */

import React from 'react';

export interface FieldHighlightProps {
  hasError?: boolean;
  children: React.ReactNode;
  className?: string;
  baseStyle?: React.CSSProperties;
}

export function FieldHighlight({ 
  hasError = false, 
  children, 
  className = '',
  baseStyle = {}
}: FieldHighlightProps) {
  const style: React.CSSProperties = hasError ? {
    ...baseStyle,
    borderColor: '#dc3545',
    boxShadow: '0 0 0 0.2rem rgba(220, 53, 69, 0.25)'
  } : baseStyle;

  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}

/**
 * Utility function to get field styles with error state
 */
export function getFieldStyle(hasError: boolean, baseStyle: React.CSSProperties = {}): React.CSSProperties {
  const defaultBaseStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px',
    border: '1px solid #ccc',
    borderRadius: '4px'
  };

  const errorStyle: React.CSSProperties = {
    borderColor: '#dc3545'
  };

  return hasError
    ? { ...defaultBaseStyle, ...baseStyle, ...errorStyle }
    : { ...defaultBaseStyle, ...baseStyle };
}

/**
 * Enhanced Input component with error highlighting
 */
export interface EnhancedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
  baseStyle?: React.CSSProperties;
}

export function EnhancedInput({
  hasError = false,
  baseStyle = {},
  ...inputProps
}: EnhancedInputProps) {
  const style = getFieldStyle(hasError, baseStyle);
  return <input {...inputProps} style={style} />;
}
