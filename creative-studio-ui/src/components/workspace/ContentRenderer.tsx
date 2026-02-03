import React from 'react';
import ReactMarkdown from 'react-markdown';

/**
 * ContentRenderer Props Interface
 */
export interface ContentRendererProps {
  content: string;
  className?: string;
}

/**
 * Detects whether content contains markdown syntax
 * @param content - The content string to analyze
 * @returns 'markdown' if markdown syntax is detected, 'plaintext' otherwise
 */
export function detectContentFormat(content: string): 'markdown' | 'plaintext' {
  if (!content || content.trim().length === 0) {
    return 'plaintext';
  }

  // Check for markdown headers
  if (/^#{1,6}\s+.+$/m.test(content)) {
    return 'markdown';
  }

  // Check for markdown emphasis (bold/italic)
  if (/(\*\*|__).+?\1|(\*|_).+?\2/.test(content)) {
    return 'markdown';
  }

  // Check for markdown lists
  if (/^[\s]*[-*+]\s+.+$/m.test(content) || /^[\s]*\d+\.\s+.+$/m.test(content)) {
    return 'markdown';
  }

  // Check for markdown links
  if (/\[.+?\]\(.+?\)/.test(content)) {
    return 'markdown';
  }

  return 'plaintext';
}

/**
 * ContentRenderer Component
 * Renders story content with automatic format detection (markdown vs plain text)
 * Handles missing, null, and empty content gracefully
 */
export const ContentRenderer: React.FC<ContentRendererProps> = ({ content, className = '' }) => {
  // Handle undefined, null, or empty content
  if (content === undefined || content === null) {
    return (
      <div className={`story-content-placeholder ${className}`}>
        <p>No story content available</p>
      </div>
    );
  }

  if (content.trim().length === 0) {
    return (
      <div className={`story-content-empty ${className}`}>
        <p>Story content is empty. Click Edit to add your narrative.</p>
      </div>
    );
  }

  const format = detectContentFormat(content);

  if (format === 'markdown') {
    return (
      <div className={`story-content-markdown ${className}`}>
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    );
  }

  // Plain text rendering with preserved whitespace
  return (
    <div className={`story-content-plaintext ${className}`}>
      <pre>{content}</pre>
    </div>
  );
};

export default ContentRenderer;
