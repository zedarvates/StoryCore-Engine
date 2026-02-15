import React from 'react';

interface FieldHighlightProps {
  hasError: boolean;
  baseStyle?: React.CSSProperties;
}

export const getFieldStyle = (hasError: boolean, baseStyle: React.CSSProperties = {}): React.CSSProperties => {
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
};

interface EnhancedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
  baseStyle?: React.CSSProperties;
}

export const EnhancedInput: React.FC<EnhancedInputProps> = ({
  hasError = false,
  baseStyle = {},
  ...inputProps
}) => {
  const style = getFieldStyle(hasError, baseStyle);
  return <input {...inputProps} style={style} />;
};