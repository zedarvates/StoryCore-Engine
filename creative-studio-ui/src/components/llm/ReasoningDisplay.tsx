/**
 * Reasoning Display Component
 * 
 * Displays LLM responses with thinking/summary blocks,
 * collapsible thinking section, and format warnings.
 */

import React, { useState } from 'react';
import type { ReasoningResponse } from '@/services/llm';

export interface ReasoningDisplayProps {
  response: ReasoningResponse;
  showThinking?: boolean;
  onToggleThinking?: () => void;
  className?: string;
}

export const ReasoningDisplay: React.FC<ReasoningDisplayProps> = ({
  response,
  showThinking: showThinkingProp,
  onToggleThinking,
  className = '',
}) => {
  const [internalShowThinking, setInternalShowThinking] = useState(false);
  
  // Use controlled or uncontrolled state
  const showThinking = showThinkingProp !== undefined 
    ? showThinkingProp 
    : internalShowThinking;
  
  const handleToggle = () => {
    if (onToggleThinking) {
      onToggleThinking();
    } else {
      setInternalShowThinking(!internalShowThinking);
    }
  };

  return (
    <div className={`reasoning-display ${className}`}>
      {/* Model Badge */}
      <div className="model-badge-container">
        <div className="model-badge">
          <span className="model-icon">🤖</span>
          <span className="model-name">{response.modelUsed || 'Unknown Model'}</span>
          {!response.formatValid && (
            <span 
              className="format-warning" 
              title="Response format was not perfect. Fallback parsing was used."
            >
              ⚠️
            </span>
          )}
        </div>
        <span className="response-timestamp">
          {new Date(response.timestamp).toLocaleTimeString()}
        </span>
      </div>

      {/* Thinking Toggle */}
      {response.thinking && (
        <button 
          onClick={handleToggle}
          className="thinking-toggle"
          aria-expanded={showThinking ? "true" : "false"}
          aria-controls="thinking-content"
        >
          <span className="toggle-icon">
            {showThinking ? '🧠 Hide Reasoning' : '🧠 Show Reasoning'}
          </span>
          <span className="toggle-arrow">
            {showThinking ? '▼' : '▶'}
          </span>
        </button>
      )}

      {/* Thinking Block (collapsible) */}
      {showThinking && response.thinking && (
        <div 
          id="thinking-content"
          className="thinking-block"
          role="region"
          aria-label="Reasoning process"
        >
          <div className="block-header">
            <h4 className="block-title">💭 Reasoning Process</h4>
            <span className="block-subtitle">
              Step-by-step thinking
            </span>
          </div>
          <div className="thinking-content">
            <pre className="thinking-text">{response.thinking}</pre>
          </div>
        </div>
      )}

      {/* Summary Block (always visible) */}
      <div 
        className="summary-block"
        role="region"
        aria-label="Summary"
      >
        <div className="block-header">
          <h4 className="block-title">✨ Summary</h4>
          <span className="block-subtitle">
            Key takeaways
          </span>
        </div>
        <div className="summary-content">
          <div className="summary-text">{response.summary}</div>
        </div>
      </div>

      {/* Format Warning Details */}
      {!response.formatValid && (
        <div className="format-warning-details">
          <span className="warning-icon">ℹ️</span>
          <span className="warning-text">
            The response format was not perfect. The content has been parsed using fallback methods.
          </span>
        </div>
      )}
    </div>
  );
};

// CSS-in-JS styles
const styles = `
.reasoning-display {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-primary, white);
  border-radius: 8px;
  border: 1px solid var(--border-color, #e0e0e0);
}

.model-badge-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.model-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  background: var(--badge-bg, #f5f5f5);
  border-radius: 16px;
  font-size: 0.875rem;
}

.model-icon {
  font-size: 1.125rem;
}

.model-name {
  font-weight: 600;
  color: var(--text-primary, #333);
}

.format-warning {
  font-size: 1rem;
  cursor: help;
}

.response-timestamp {
  font-size: 0.75rem;
  color: var(--text-tertiary, #999);
}

.thinking-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 0.75rem 1rem;
  background: var(--thinking-bg, #f8f9fa);
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.thinking-toggle:hover {
  background: var(--thinking-hover-bg, #e9ecef);
  border-color: var(--border-hover, #ccc);
}

.thinking-toggle:focus {
  outline: 2px solid var(--focus-color, #4a90e2);
  outline-offset: 2px;
}

.toggle-icon {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.toggle-arrow {
  font-size: 0.75rem;
  color: var(--text-secondary, #666);
}

.thinking-block,
.summary-block {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 6px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.thinking-block {
  background: var(--thinking-block-bg, #f8f9fa);
  border: 1px solid var(--thinking-border, #dee2e6);
}

.summary-block {
  background: var(--summary-block-bg, #e8f5e9);
  border: 1px solid var(--summary-border, #c8e6c9);
}

.block-header {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.block-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary, #333);
}

.block-subtitle {
  font-size: 0.75rem;
  color: var(--text-secondary, #666);
  font-weight: 400;
}

.thinking-content,
.summary-content {
  padding: 0.75rem;
  background: white;
  border-radius: 4px;
}

.thinking-text {
  margin: 0;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--text-primary, #333);
  white-space: pre-wrap;
  word-wrap: break-word;
}

.summary-text {
  font-size: 0.9375rem;
  line-height: 1.7;
  color: var(--text-primary, #333);
  white-space: pre-wrap;
  word-wrap: break-word;
}

.format-warning-details {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--warning-bg, #fff3cd);
  border: 1px solid var(--warning-border, #ffc107);
  border-radius: 4px;
  font-size: 0.8125rem;
  color: var(--warning-text, #856404);
}

.warning-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.warning-text {
  line-height: 1.5;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .reasoning-display {
    background: var(--bg-primary-dark, #1e1e1e);
    border-color: var(--border-color-dark, #333);
  }

  .model-badge {
    background: var(--badge-bg-dark, #2a2a2a);
  }

  .model-name {
    color: var(--text-primary-dark, #e0e0e0);
  }

  .thinking-toggle {
    background: var(--thinking-bg-dark, #2a2a2a);
    border-color: var(--border-color-dark, #333);
    color: var(--text-primary-dark, #e0e0e0);
  }

  .thinking-toggle:hover {
    background: var(--thinking-hover-bg-dark, #333);
  }

  .thinking-block {
    background: var(--thinking-block-bg-dark, #2a2a2a);
    border-color: var(--thinking-border-dark, #444);
  }

  .summary-block {
    background: var(--summary-block-bg-dark, #1a3a1a);
    border-color: var(--summary-border-dark, #2d5a2d);
  }

  .thinking-content,
  .summary-content {
    background: var(--content-bg-dark, #1e1e1e);
  }

  .thinking-text,
  .summary-text,
  .block-title {
    color: var(--text-primary-dark, #e0e0e0);
  }
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleId = 'reasoning-display-styles';
  if (!document.getElementById(styleId)) {
    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
  }
}
