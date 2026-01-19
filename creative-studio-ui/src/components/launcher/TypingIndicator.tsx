/**
 * Typing Indicator Component
 * 
 * Displays an animated typing indicator for streaming responses.
 * Used to show that the AI assistant is actively generating a response.
 */

import React, { memo } from 'react';

export interface TypingIndicatorProps {
  className?: string;
}

/**
 * Typing Indicator Component
 * 
 * Shows three animated dots to indicate typing/streaming activity.
 * The dots pulse in sequence to create a wave effect.
 */
export const TypingIndicator = memo(function TypingIndicator({ className = '' }: TypingIndicatorProps) {
  return (
    <span 
      className={`flex items-center gap-1 ${className}`}
      role="status"
      aria-live="polite"
      aria-label="AI is typing"
    >
      <span 
        className="w-1.5 h-1.5 bg-current rounded-full animate-pulse"
        style={{ animationDelay: '0ms' }}
        aria-hidden="true"
      />
      <span 
        className="w-1.5 h-1.5 bg-current rounded-full animate-pulse"
        style={{ animationDelay: '150ms' }}
        aria-hidden="true"
      />
      <span 
        className="w-1.5 h-1.5 bg-current rounded-full animate-pulse"
        style={{ animationDelay: '300ms' }}
        aria-hidden="true"
      />
      <span className="sr-only">AI is typing</span>
    </span>
  );
});
