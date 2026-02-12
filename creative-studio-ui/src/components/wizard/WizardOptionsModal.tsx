/**
 * Wizard Options Modal
 *
 * Modal for configuring wizard options before launch
 */

import React, { useState, useEffect } from 'react';
import type { WizardDefinition } from '../../types/configuration';
import { WizardService } from '../../services/wizard/WizardService';
import './WizardOptionsModal.css';

interface WizardOptionsModalProps {
  isOpen: boolean;
  wizard: WizardDefinition | null;
  onLaunch: (options: Record<string, unknown>) => void;
  onCancel: () => void;
}

export function WizardOptionsModal({
  isOpen,
  wizard,
  onLaunch,
  onCancel
}: WizardOptionsModalProps) {
  const [options, setOptions] = useState<Record<string, unknown>>({});
  const [wizardOptions, setWizardOptions] = useState<Record<string, unknown>>({});

  // Load wizard options when wizard changes
  useEffect(() => {
    if (wizard) {
      const wizardService = new WizardService();
      const opts = wizardService.getWizardOptions(wizard.id);
      setWizardOptions(opts);

      // Set default values
      const defaults: Record<string, unknown> = {};
      if (opts.defaultStyle) defaults.style = opts.defaultStyle;
      if (opts.defaultQuality) defaults.quality = opts.defaultQuality;
      if (opts.defaultTone) defaults.tone = opts.defaultTone;
      if (opts.defaultPurpose) defaults.purpose = opts.defaultPurpose;

      setOptions(defaults);
    }
  }, [wizard]);

  const handleOptionChange = (key: string, value: unknown) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  const handleLaunch = () => {
    onLaunch(options);
  };

  if (!isOpen || !wizard) return null;

  return (
    <div className="wizard-options-modal-overlay">
      <div className="wizard-options-modal">
        <div className="modal-header">
          <h3>Configure {wizard.name}</h3>
          <button className="close-button" onClick={onCancel}>×</button>
        </div>

        <div className="modal-body">
          <div className="wizard-info">
            <div className="wizard-icon-large">{wizard.icon}</div>
            <div className="wizard-details">
              <h4>{wizard.name}</h4>
              <p>{wizard.description}</p>
            </div>
          </div>

          {/* Style Options */}
          {wizardOptions.styles && (
            <div className="option-group">
              <label className="option-label">Style</label>
              <select
                value={options.style || ''}
                onChange={(e) => handleOptionChange('style', e.target.value)}
                className="option-select"
              >
                <option value="">Select style...</option>
                {wizardOptions.styles.map((style: string) => (
                  <option key={style} value={style}>
                    {style.charAt(0).toUpperCase() + style.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quality Options */}
          {wizardOptions.qualities && (
            <div className="option-group">
              <label className="option-label">Quality</label>
              <select
                value={options.quality || ''}
                onChange={(e) => handleOptionChange('quality', e.target.value)}
                className="option-select"
              >
                <option value="">Select quality...</option>
                {wizardOptions.qualities.map((quality: string) => (
                  <option key={quality} value={quality}>
                    {quality.charAt(0).toUpperCase() + quality.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tone Options */}
          {wizardOptions.tones && (
            <div className="option-group">
              <label className="option-label">Tone</label>
              <select
                value={options.tone || ''}
                onChange={(e) => handleOptionChange('tone', e.target.value)}
                className="option-select"
              >
                <option value="">Select tone...</option>
                {wizardOptions.tones.map((tone: string) => (
                  <option key={tone} value={tone}>
                    {tone.charAt(0).toUpperCase() + tone.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Purpose Options */}
          {wizardOptions.purposes && (
            <div className="option-group">
              <label className="option-label">Purpose</label>
              <select
                value={options.purpose || ''}
                onChange={(e) => handleOptionChange('purpose', e.target.value)}
                className="option-select"
              >
                <option value="">Select purpose...</option>
                {wizardOptions.purposes.map((purpose: string) => (
                  <option key={purpose} value={purpose.replace('_', ' ')}>
                    {purpose.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Dialogue-specific options */}
          {wizard.id === 'dialogue-wizard' && (
            <>
              <div className="option-group">
                <label className="option-checkbox">
                  <input
                    type="checkbox"
                    checked={options.quick || false}
                    onChange={(e) => handleOptionChange('quick', e.target.checked)}
                  />
                  Quick mode (provide characters and topic)
                </label>
              </div>

              {options.quick && (
                <>
                  <div className="option-group">
                    <label className="option-label">Characters (comma-separated)</label>
                    <input
                      type="text"
                      value={options.characters?.join(', ') || ''}
                      onChange={(e) => handleOptionChange('characters', e.target.value.split(',').map((s: string) => s.trim()))}
                      placeholder="Alice, Bob, Charlie"
                      className="option-input"
                    />
                  </div>

                  <div className="option-group">
                    <label className="option-label">Topic</label>
                    <input
                      type="text"
                      value={options.topic || ''}
                      onChange={(e) => handleOptionChange('topic', e.target.value)}
                      placeholder="family conflict, work discussion, etc."
                      className="option-input"
                    />
                  </div>
                </>
              )}
            </>
          )}

          {/* Shot Reference specific options */}
          {wizard.id === 'shot-reference-wizard' && (
            <>
              <div className="option-group">
                <label className="option-checkbox">
                  <input
                    type="checkbox"
                    checked={options.preview || false}
                    onChange={(e) => handleOptionChange('preview', e.target.checked)}
                  />
                  Preview prompts only (don't generate images)
                </label>
              </div>

              <div className="option-group">
                <label className="option-label">Specific Shots (optional, comma-separated)</label>
                <input
                  type="text"
                  value={options.shots?.join(', ') || ''}
                  onChange={(e) => handleOptionChange('shots', e.target.value ? e.target.value.split(',').map((s: string) => s.trim()) : undefined)}
                  placeholder="shot_001, shot_003, shot_005"
                  className="option-input"
                />
                <small className="option-help">Leave empty to generate for all shots</small>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="cancel-button" onClick={onCancel}>
            Cancel
          </button>
          <button className="launch-button" onClick={handleLaunch}>
            Launch {wizard.name}
          </button>
        </div>
      </div>
    </div>
  );
}


