/**
 * World Building Form Component
 * 
 * Form fields for world name, setting, time period, locations
 * Dynamic location list management
 * Form submission handler
 * 
 * Requirements: 7.1
 */

import React, { useState, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { FormField, FormSection } from '../WizardFormLayout';
import './WorldBuildingForm.css';

export interface Location {
  name: string;
  description: string;
}

export interface WorldBuildingInput {
  worldName: string;
  setting: string;
  timePeriod: string;
  locations: Location[];
}

export interface WorldBuildingFormProps {
  initialData?: Partial<WorldBuildingInput>;
  onSubmit: (data: WorldBuildingInput) => void;
  onChange?: (data: Partial<WorldBuildingInput>) => void;
}

interface FormErrors {
  worldName?: string;
  setting?: string;
  timePeriod?: string;
  locations?: string;
}

export function WorldBuildingForm({
  initialData,
  onSubmit,
  onChange,
}: WorldBuildingFormProps) {
  const [formData, setFormData] = useState<WorldBuildingInput>({
    worldName: initialData?.worldName || '',
    setting: initialData?.setting || '',
    timePeriod: initialData?.timePeriod || '',
    locations: initialData?.locations || [],
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [newLocation, setNewLocation] = useState<Location>({ name: '', description: '' });

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.worldName.trim()) {
      newErrors.worldName = 'World name is required';
    } else if (formData.worldName.length < 2) {
      newErrors.worldName = 'World name must be at least 2 characters';
    }

    if (!formData.setting.trim()) {
      newErrors.setting = 'Setting is required';
    } else if (formData.setting.length < 10) {
      newErrors.setting = 'Setting must be at least 10 characters';
    }

    if (!formData.timePeriod.trim()) {
      newErrors.timePeriod = 'Time period is required';
    }

    if (formData.locations.length === 0) {
      newErrors.locations = 'At least one location is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleFieldChange = useCallback((field: keyof WorldBuildingInput, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      onChange?.(updated);
      return updated;
    });

    // Clear error for this field
    setErrors(prev => ({ ...prev, [field]: undefined }));
  }, [onChange]);

  const handleAddLocation = useCallback(() => {
    if (newLocation.name.trim() && newLocation.description.trim()) {
      handleFieldChange('locations', [...formData.locations, newLocation]);
      setNewLocation({ name: '', description: '' });
    }
  }, [newLocation, formData.locations, handleFieldChange]);

  const handleRemoveLocation = useCallback((index: number) => {
    handleFieldChange('locations', formData.locations.filter((_, i) => i !== index));
  }, [formData.locations, handleFieldChange]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  }, [formData, validateForm, onSubmit]);

  return (
    <form className="world-building-form" onSubmit={handleSubmit}>
      <FormSection title="World Overview">
        <FormField
          name="worldName"
          label="World Name"
          required
          error={errors.worldName}
        >
          <input
            type="text"
            value={formData.worldName}
            onChange={(e) => handleFieldChange('worldName', e.target.value)}
            placeholder="Enter the name of your world"
            className={errors.worldName ? 'error' : ''}
          />
        </FormField>

        <FormField
          name="setting"
          label="Setting"
          required
          error={errors.setting}
          helpText="Describe the overall environment and atmosphere"
        >
          <textarea
            value={formData.setting}
            onChange={(e) => handleFieldChange('setting', e.target.value)}
            placeholder="Describe the world's setting, environment, and general characteristics"
            rows={4}
            className={errors.setting ? 'error' : ''}
          />
        </FormField>

        <FormField
          name="timePeriod"
          label="Time Period"
          required
          error={errors.timePeriod}
        >
          <input
            type="text"
            value={formData.timePeriod}
            onChange={(e) => handleFieldChange('timePeriod', e.target.value)}
            placeholder="e.g., Medieval, Future 2150, Victorian Era"
            className={errors.timePeriod ? 'error' : ''}
          />
        </FormField>
      </FormSection>

      <FormSection title="Key Locations">
        <FormField
          name="locations"
          label="Locations"
          required
          error={errors.locations}
          helpText="Add important locations in your world"
        >
          {/* Add New Location */}
          <div className="location-input-group">
            <div className="location-inputs">
              <input
                type="text"
                value={newLocation.name}
                onChange={(e) => setNewLocation(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Location name"
                className="location-name-input"
              />
              <input
                type="text"
                value={newLocation.description}
                onChange={(e) => setNewLocation(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description"
                className="location-description-input"
              />
            </div>
            <button
              type="button"
              onClick={handleAddLocation}
              className="add-location-button"
              disabled={!newLocation.name.trim() || !newLocation.description.trim()}
            >
              <Plus size={18} />
              Add
            </button>
          </div>

          {/* Location List */}
          {formData.locations.length > 0 && (
            <div className="locations-list">
              {formData.locations.map((location, index) => (
                <div key={index} className="location-item">
                  <div className="location-info">
                    <div className="location-name">{location.name}</div>
                    <div className="location-description">{location.description}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveLocation(index)}
                    className="remove-location-button"
                    aria-label={`Remove ${location.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {formData.locations.length === 0 && (
            <div className="no-locations-message">
              No locations added yet. Add at least one location to continue.
            </div>
          )}
        </FormField>
      </FormSection>
    </form>
  );
}
