/**
 * Object Wizard - Step 2: Properties
 * 
 * Collects physical properties of the object:
 * - Weight, Size, Material
 * - Color, Durability
 * - Magical properties
 * - Value and Origin
 */

import React from 'react';
import { useWizard } from '@/contexts/WizardContext';
import type { StoryObject, ObjectCondition } from '@/types/object';
import { OBJECT_CONDITION_LABELS } from '@/types/object';
import './ObjectWizardSteps.css';

export function Step2Properties() {
  const { data, updateData } = useWizard<StoryObject>();

  const handlePropertyChange = (field: string, value: unknown) => {
    updateData({
      properties: {
        ...data.properties,
        [field]: value,
      },
    });
  };

  const handleChange = (field: keyof StoryObject, value: unknown) => {
    updateData({ [field]: value });
  };

  return (
    <div className="object-wizard-step">
      <div className="step-header">
        <h3>Physical Properties</h3>
        <p>Define the physical characteristics of your object</p>
      </div>

      <div className="form-section">
        {/* Weight */}
        <div className="form-group">
          <label htmlFor="object-weight">Weight</label>
          <input
            id="object-weight"
            type="text"
            value={data.properties?.weight || ''}
            onChange={(e) => handlePropertyChange('weight', e.target.value)}
            placeholder="e.g., 2 kg, light, heavy"
          />
        </div>

        {/* Size */}
        <div className="form-group">
          <label htmlFor="object-size">Size</label>
          <input
            id="object-size"
            type="text"
            value={data.properties?.size || ''}
            onChange={(e) => handlePropertyChange('size', e.target.value)}
            placeholder="e.g., small, medium, large"
          />
        </div>

        {/* Material */}
        <div className="form-group">
          <label htmlFor="object-material">Material</label>
          <input
            id="object-material"
            type="text"
            value={data.properties?.material || ''}
            onChange={(e) => handlePropertyChange('material', e.target.value)}
            placeholder="e.g., wood, metal, crystal, leather"
          />
        </div>

        {/* Color */}
        <div className="form-group">
          <label htmlFor="object-color">Primary Color</label>
          <input
            id="object-color"
            type="text"
            value={data.properties?.color || ''}
            onChange={(e) => handlePropertyChange('color', e.target.value)}
            placeholder="e.g., silver, gold, black"
          />
        </div>

        {/* Durability/Condition */}
        <div className="form-group">
          <label htmlFor="object-durability">Condition</label>
          <select
            id="object-durability"
            value={data.properties?.durability || 'good'}
            onChange={(e) => handlePropertyChange('durability', e.target.value as ObjectCondition)}
          >
            {Object.entries(OBJECT_CONDITION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Magical */}
        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={data.properties?.magical || false}
              onChange={(e) => handlePropertyChange('magical', e.target.checked)}
            />
            <span>This object is magical or has special powers</span>
          </label>
        </div>

        {/* Value */}
        <div className="form-group">
          <label htmlFor="object-value">Value</label>
          <input
            id="object-value"
            type="text"
            value={data.properties?.value || ''}
            onChange={(e) => handlePropertyChange('value', e.target.value)}
            placeholder="e.g., priceless, 1000 gold, sentimental"
          />
        </div>

        {/* Origin */}
        <div className="form-group">
          <label htmlFor="object-origin">Origin</label>
          <textarea
            id="object-origin"
            value={data.properties?.origin || ''}
            onChange={(e) => handlePropertyChange('origin', e.target.value)}
            placeholder="Where did this object come from?"
            rows={3}
          />
        </div>

        {/* History */}
        <div className="form-group">
          <label htmlFor="object-history">History</label>
          <textarea
            id="object-history"
            value={data.history || ''}
            onChange={(e) => handleChange('history', e.target.value)}
            placeholder="What is the backstory of this object?"
            rows={4}
          />
        </div>

        {/* Current Owner */}
        <div className="form-group">
          <label htmlFor="object-owner">Current Owner</label>
          <input
            id="object-owner"
            type="text"
            value={data.currentOwner || ''}
            onChange={(e) => handleChange('currentOwner', e.target.value)}
            placeholder="Character name or ID"
          />
        </div>

        {/* Location */}
        <div className="form-group">
          <label htmlFor="object-location">Current Location</label>
          <input
            id="object-location"
            type="text"
            value={data.location || ''}
            onChange={(e) => handleChange('location', e.target.value)}
            placeholder="Where is this object now?"
          />
        </div>
      </div>
    </div>
  );
}

