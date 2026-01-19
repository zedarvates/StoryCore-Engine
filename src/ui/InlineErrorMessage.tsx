import React from 'react';

interface InlineErrorMessageProps {
  message: string;
  style?: React.CSSProperties;
}

export const InlineErrorMessage: React.FC<InlineErrorMessageProps> = ({
  message,
  style = {}
}) => {
  const defaultStyle: React.CSSProperties = {
    color: '#dc3545',
    fontSize: '12px',
    marginTop: '4px',
    marginBottom: '4px'
  };

  return (
    <div style={{ ...defaultStyle, ...style }}>
      {message}
    </div>
  );
};