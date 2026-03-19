/* cspell:ignore confucian qwen gemini */
/**
 * LLM Settings Panel Component
 * 
 * Configuration UI for reasoning mode, Confucian principles,
 * and available models. Saves to localStorage.
 */

import React, { useState, useEffect } from 'react';

export interface LLMSettings {
  reasoningMode: {
    enabled: boolean;
    showThinkingByDefault: boolean;
    confucianPrinciples: ('ren' | 'li' | 'yi' | 'zhi')[];
  };
  availableModels: {
    vision: string[];
    storytelling: string[];
    quick: string[];
    default: string;
  };
}

export interface LLMSettingsPanelProps {
  settings: LLMSettings;
  onSettingsChange: (settings: LLMSettings) => void;
  className?: string;
}

const DEFAULT_SETTINGS: LLMSettings = {
  reasoningMode: {
    enabled: true,
    showThinkingByDefault: false,
    confucianPrinciples: ['ren', 'li', 'yi', 'zhi'],
  },
  availableModels: {
    vision: ['qwen3-vl:8b', 'anthropic/claude-3.5-sonnet'],
    storytelling: ['llama3.1:8b', 'meta-llama/llama-3.1-70b-instruct', 'openai/gpt-4o'],
    quick: ['gemma3:4b', 'meta-llama/llama-3.1-8b-instruct'],
    default: 'llama3.1:8b',
  },
};

export const LLMSettingsPanel: React.FC<LLMSettingsPanelProps> = ({
  settings: initialSettings,
  onSettingsChange,
  className = '',
}) => {
  const [settings, setSettings] = useState<LLMSettings>(initialSettings);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings]);

  const handleReasoningModeToggle = () => {
    const newSettings = {
      ...settings,
      reasoningMode: {
        ...settings.reasoningMode,
        enabled: !settings.reasoningMode.enabled,
      },
    };
    setSettings(newSettings);
    setHasChanges(true);
  };

  const handleShowThinkingToggle = () => {
    const newSettings = {
      ...settings,
      reasoningMode: {
        ...settings.reasoningMode,
        showThinkingByDefault: !settings.reasoningMode.showThinkingByDefault,
      },
    };
    setSettings(newSettings);
    setHasChanges(true);
  };

  const handlePrincipleToggle = (principle: 'ren' | 'li' | 'yi' | 'zhi') => {
    const principles = settings.reasoningMode.confucianPrinciples;
    const newPrinciples = principles.includes(principle)
      ? principles.filter(p => p !== principle)
      : [...principles, principle];

    const newSettings = {
      ...settings,
      reasoningMode: {
        ...settings.reasoningMode,
        confucianPrinciples: newPrinciples,
      },
    };
    setSettings(newSettings);
    setHasChanges(true);
  };

  const handleSave = () => {
    onSettingsChange(settings);
    setHasChanges(false);
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    setHasChanges(true);
  };

  const principleInfo = {
    ren: {
      label: '仁 (Ren - Benevolence)',
      description: 'Prioritize user\'s creative flourishing',
    },
    li: {
      label: '礼 (Li - Respect)',
      description: 'Honor cultural context and preferences',
    },
    yi: {
      label: '义 (Yi - Transparency)',
      description: 'Explain reasoning clearly',
    },
    zhi: {
      label: '智 (Zhi - Wisdom)',
      description: 'Learn from feedback and improve',
    },
  };

  return (
    <div className={`llm-settings-panel ${className}`}>
      <div className="settings-header">
        <h3 className="settings-title">LLM Settings</h3>
        <p className="settings-subtitle">
          Configure reasoning mode and Confucian principles
        </p>
      </div>

      {/* Reasoning Mode Section */}
      <section className="settings-section">
        <h4 className="section-title">Reasoning Mode</h4>
        
        <div className="setting-item">
          <label className="setting-label">
            <input
              type="checkbox"
              checked={settings.reasoningMode.enabled}
              onChange={handleReasoningModeToggle}
              className="setting-checkbox"
            />
            <span className="label-text">Enable Reasoning Mode</span>
          </label>
          <p className="setting-description">
            Show detailed thinking process with summary
          </p>
        </div>

        <div className="setting-item">
          <label className="setting-label">
            <input
              type="checkbox"
              checked={settings.reasoningMode.showThinkingByDefault}
              onChange={handleShowThinkingToggle}
              disabled={!settings.reasoningMode.enabled}
              className="setting-checkbox"
            />
            <span className="label-text">Show Thinking by Default</span>
          </label>
          <p className="setting-description">
            Automatically expand the thinking block
          </p>
        </div>
      </section>

      {/* Confucian Principles Section */}
      <section className="settings-section">
        <h4 className="section-title">Confucian Principles</h4>
        <p className="section-description">
          Select which principles to emphasize in responses
        </p>

        <div className="principles-grid">
          {(Object.keys(principleInfo) as Array<keyof typeof principleInfo>).map((key) => {
            const principle = principleInfo[key];
            const isSelected = settings.reasoningMode.confucianPrinciples.includes(key);

            return (
              <label
                key={key}
                className={`principle-card ${isSelected ? 'selected' : ''}`}
              >
                <div className="principle-header">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handlePrincipleToggle(key)}
                    className="principle-checkbox"
                    title={`Toggle ${principle.label}`}
                  />
                  <span className="principle-label">{principle.label}</span>
                </div>
                <p className="principle-description">{principle.description}</p>
              </label>
            );
          })}
        </div>
      </section>

      {/* Available Models Section */}
      <section className="settings-section">
        <h4 className="section-title">Production Models</h4>
        <p className="section-description">
          Select priority models for each production lane.
        </p>

        <div className="models-info space-y-4">
          <div className="model-lane">
            <span className="lane-label">Master Narrator (Storytelling)</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {['meta-llama/llama-3.1-70b-instruct', 'anthropic/claude-3.5-sonnet', 'openai/gpt-4o', 'llama3.1:8b'].map(m => (
                <button 
                  key={m}
                  onClick={() => setSettings({...settings, availableModels: {...settings.availableModels, default: m}})}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-all ${settings.availableModels.default === m ? 'bg-purple-600 text-white border-purple-400' : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'}`}
                >
                  {m.split('/').pop()}
                </button>
              ))}
            </div>
          </div>
          
          <div className="model-lane">
            <span className="lane-label">Visual Synthesis (Vision)</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {['qwen3-vl:8b', 'anthropic/claude-3.5-sonnet', 'google/gemini-pro-1.5'].map(m => (
                <button 
                  key={m}
                  onClick={() => {}}
                  className="px-3 py-1.5 text-xs rounded-full border bg-white/5 border-white/10 text-white/40 cursor-not-allowed"
                >
                  {m.split('/').pop()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Action Buttons */}
      <div className="settings-actions">
        <button
          onClick={handleReset}
          className="action-button secondary"
        >
          Reset to Defaults
        </button>
        <button
          onClick={handleSave}
          disabled={!hasChanges}
          className="action-button primary"
        >
          {hasChanges ? 'Save Changes' : 'Saved'}
        </button>
      </div>
    </div>
  );
};

// CSS-in-JS styles
const styles = `
.llm-settings-panel {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
  background: var(--bg-primary, white);
  border-radius: 8px;
  border: 1px solid var(--border-color, #e0e0e0);
  max-width: 800px;
}

.settings-header {
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--border-color, #e0e0e0);
}

.settings-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary, #333);
}

.settings-subtitle {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-secondary, #666);
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.section-description {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-secondary, #666);
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.setting-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.9375rem;
}

.setting-checkbox {
  width: 1.125rem;
  height: 1.125rem;
  cursor: pointer;
}

.label-text {
  font-weight: 500;
  color: var(--text-primary, #333);
}

.setting-description {
  margin: 0 0 0 1.625rem;
  font-size: 0.8125rem;
  color: var(--text-tertiary, #999);
}

.principles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.principle-card {
  padding: 1rem;
  background: var(--card-bg, #f8f9fa);
  border: 2px solid var(--border-color, #e0e0e0);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.principle-card:hover {
  border-color: var(--primary-color, #4a90e2);
  background: var(--card-hover-bg, #f0f4f8);
}

.principle-card.selected {
  border-color: var(--primary-color, #4a90e2);
  background: var(--primary-light, #e3f2fd);
}

.principle-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.principle-checkbox {
  width: 1.125rem;
  height: 1.125rem;
  cursor: pointer;
}

.principle-label {
  font-weight: 600;
  font-size: 0.9375rem;
  color: var(--text-primary, #333);
}

.principle-description {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-secondary, #666);
  line-height: 1.5;
}

.models-info {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--info-bg, #f8f9fa);
  border-radius: 6px;
}

.model-category {
  display: flex;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.category-label {
  font-weight: 600;
  color: var(--text-primary, #333);
  min-width: 100px;
}

.category-models {
  color: var(--text-secondary, #666);
}

.settings-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color, #e0e0e0);
}

.action-button {
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 6px;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-button.primary {
  background: var(--primary-color, #4a90e2);
  color: white;
}

.action-button.primary:hover:not(:disabled) {
  background: var(--primary-hover, #357abd);
}

.action-button.primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-button.secondary {
  background: var(--secondary-bg, #f0f0f0);
  color: var(--text-primary, #333);
}

.action-button.secondary:hover {
  background: var(--secondary-hover, #e0e0e0);
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .llm-settings-panel {
    background: var(--bg-primary-dark, #1e1e1e);
    border-color: var(--border-color-dark, #333);
  }

  .settings-title,
  .section-title,
  .label-text,
  .principle-label,
  .category-label {
    color: var(--text-primary-dark, #e0e0e0);
  }

  .principle-card {
    background: var(--card-bg-dark, #2a2a2a);
    border-color: var(--border-color-dark, #444);
  }

  .principle-card:hover {
    background: var(--card-hover-bg-dark, #333);
  }

  .principle-card.selected {
    background: var(--primary-dark, #1a3a5a);
  }

  .models-info {
    background: var(--info-bg-dark, #2a2a2a);
  }
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleId = 'llm-settings-panel-styles';
  if (!document.getElementById(styleId)) {
    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
  }
}
