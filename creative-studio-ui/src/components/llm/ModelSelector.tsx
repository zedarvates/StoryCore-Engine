/**
 * Model Selector Component
 * 
 * Dropdown for selecting LLM models with metadata display,
 * category filtering, and availability indicators.
 */

import React from 'react';
import type { ModelMetadata } from '@/services/llm';

export interface ModelSelectorProps {
  currentModel: string;
  availableModels: ModelMetadata[];
  onModelChange: (model: string) => void;
  taskType?: 'vision' | 'storytelling' | 'quick' | 'general';
  className?: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  currentModel,
  availableModels,
  onModelChange,
  taskType,
  className = '',
}) => {
  // Filter models by task type if specified
  const filteredModels = taskType
    ? availableModels.filter(m => m.category === taskType)
    : availableModels;

  // Sort models: available first, then by category
  const sortedModels = [...filteredModels].sort((a, b) => {
    if (a.available !== b.available) {
      return a.available ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <div className={`model-selector ${className}`}>
      <label htmlFor="model-select" className="model-selector-label">
        Select Model:
      </label>
      
      <select
        id="model-select"
        value={currentModel}
        onChange={(e) => onModelChange(e.target.value)}
        className="model-selector-dropdown"
      >
        {sortedModels.map((model) => (
          <option
            key={model.name}
            value={model.name}
            disabled={!model.available}
          >
            {model.name}
            {!model.available && ' (Not Installed)'}
            {taskType && model.category === taskType && ' ⭐'}
          </option>
        ))}
      </select>

      {taskType && (
        <div className="model-selector-recommendation">
          <span className="recommendation-icon">💡</span>
          <span className="recommendation-text">
            Recommended for: {taskType}
          </span>
        </div>
      )}

      {/* Model metadata display */}
      {currentModel && (
        <ModelMetadataDisplay
          model={sortedModels.find(m => m.name === currentModel)}
        />
      )}
    </div>
  );
};

interface ModelMetadataDisplayProps {
  model?: ModelMetadata;
}

const ModelMetadataDisplay: React.FC<ModelMetadataDisplayProps> = ({ model }) => {
  if (!model) return null;

  return (
    <div className="model-metadata">
      <div className="metadata-row">
        <span className="metadata-label">Size:</span>
        <span className="metadata-value">{model.size}</span>
      </div>
      
      <div className="metadata-row">
        <span className="metadata-label">Category:</span>
        <span className="metadata-value metadata-category">
          {model.category}
        </span>
      </div>

      {model.capabilities.length > 0 && (
        <div className="metadata-row">
          <span className="metadata-label">Capabilities:</span>
          <div className="metadata-capabilities">
            {model.capabilities.map(cap => (
              <span key={cap} className="capability-badge">
                {cap}
              </span>
            ))}
          </div>
        </div>
      )}

      {model.recommendedFor.length > 0 && (
        <div className="metadata-row">
          <span className="metadata-label">Best for:</span>
          <div className="metadata-recommendations">
            {model.recommendedFor.slice(0, 3).map(rec => (
              <span key={rec} className="recommendation-badge">
                {rec}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// CSS-in-JS styles (can be moved to separate CSS file)
const styles = `
.model-selector {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--bg-secondary, #f5f5f5);
  border-radius: 8px;
}

.model-selector-label {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--text-primary, #333);
}

.model-selector-dropdown {
  padding: 0.5rem;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 4px;
  font-size: 0.875rem;
  background: white;
  cursor: pointer;
}

.model-selector-dropdown:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.model-selector-recommendation {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: var(--info-bg, #e3f2fd);
  border-radius: 4px;
  font-size: 0.75rem;
  color: var(--info-text, #1976d2);
}

.recommendation-icon {
  font-size: 1rem;
}

.model-metadata {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  background: white;
  border-radius: 4px;
  border: 1px solid var(--border-color, #ddd);
}

.metadata-row {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.75rem;
}

.metadata-label {
  font-weight: 600;
  color: var(--text-secondary, #666);
  min-width: 80px;
}

.metadata-value {
  color: var(--text-primary, #333);
}

.metadata-category {
  text-transform: capitalize;
  padding: 0.125rem 0.5rem;
  background: var(--category-bg, #e0e0e0);
  border-radius: 12px;
}

.metadata-capabilities,
.metadata-recommendations {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.capability-badge,
.recommendation-badge {
  padding: 0.125rem 0.5rem;
  background: var(--badge-bg, #f0f0f0);
  border-radius: 12px;
  font-size: 0.625rem;
  color: var(--text-secondary, #666);
}

.capability-badge {
  background: var(--success-bg, #e8f5e9);
  color: var(--success-text, #2e7d32);
}
`;

// Inject styles (in a real app, use a CSS file)
if (typeof document !== 'undefined') {
  const styleId = 'model-selector-styles';
  if (!document.getElementById(styleId)) {
    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
  }
}
