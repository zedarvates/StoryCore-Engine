/**
 * Object Wizard - Step 1: Basic Info
 * 
 * Collects basic information about the object:
 * - Name
 * - Type
 * - Rarity
 * - Description
 * - Appearance
 */

import React from 'react';
import { useWizard } from '@/contexts/WizardContext';
import type { StoryObject, ObjectType, ObjectRarity } from '@/types/object';
import { OBJECT_TYPE_LABELS, OBJECT_RARITY_LABELS } from '@/types/object';
import './ObjectWizardSteps.css';

export function Step1BasicInfo() {
  const { data, updateData, errors } = useWizard<StoryObject>();

  const handleChange = (field: keyof StoryObject, value: unknown) => {
    updateData({ [field]: value });
  };

  return (
    <div className="object-wizard-step">
      <div className="step-header">
        <h3>Basic Information</h3>
        <p>Define the core identity of your object</p>
      </div>

      <div className="form-section">
        {/* Object Name */}
        <div className="form-group">
          <label htmlFor="object-name">
            Object Name <span className="required">*</span>
          </label>
          <input
            id="object-name"
            type="text"
            value={data.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="e.g., The Sword of Truth, Ancient Amulet"
            className={errors.name ? 'error' : ''}
          />
          {errors.name && <span className="error-message">{errors.name[0]}</span>}
        </div>

        {/* Object Type */}
        <div className="form-group">
          <label htmlFor="object-type">
            Object Type <span className="required">*</span>
          </label>
          <select
            id="object-type"
            value={data.type || 'prop'}
            onChange={(e) => handleChange('type', e.target.value as ObjectType)}
            className={errors.type ? 'error' : ''}
          >
            {Object.entries(OBJECT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {errors.type && <span className="error-message">{errors.type[0]}</span>}
        </div>

        {/* Rarity */}
        <div className="form-group">
          <label htmlFor="object-rarity">Rarity</label>
          <select
            id="object-rarity"
            value={data.rarity || 'common'}
            onChange={(e) => handleChange('rarity', e.target.value as ObjectRarity)}
          >
            {Object.entries(OBJECT_RARITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div className="form-group">
          <label htmlFor="object-description">
            Description <span className="required">*</span>
          </label>
          <textarea
            id="object-description"
            value={data.description || ''}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="What is this object? What does it do?"
            rows={4}
            className={errors.description ? 'error' : ''}
          />
          {errors.description && <span className="error-message">{errors.description[0]}</span>}
        </div>

        {/* Appearance */}
        <div className="form-group">
          <label htmlFor="object-appearance">Physical Appearance</label>
          <textarea
            id="object-appearance"
            value={data.appearance || ''}
            onChange={(e) => handleChange('appearance', e.target.value)}
            placeholder="Describe what the object looks like..."
            rows={3}
          />
        </div>

        {/* Significance */}
        <div className="form-group">
          <label htmlFor="object-significance">Story Significance</label>
          <textarea
            id="object-significance"
            value={data.significance || ''}
            onChange={(e) => handleChange('significance', e.target.value)}
            placeholder="Why is this object important to the story?"
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}

