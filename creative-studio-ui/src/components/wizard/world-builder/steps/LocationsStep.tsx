import React, { useState, useEffect, useCallback } from 'react';
import { useWorldBuilderSelectors, useWorldBuilderActions } from '../../../../stores/worldBuilderStore';
import { StepValidator } from '../StepValidator';
import { saveLocationToProject, createLocationFromWizardData } from '../../../../utils/locationStorage';
import { useStore } from '@/store';
import type { RootState } from '@/store';
import { useLocationStore } from '@/stores/locationStore';

export const LocationsStep: React.FC = () => {
  const { worldData } = useWorldBuilderSelectors();
  const { updateStep, markStepComplete } = useWorldBuilderActions();
  
  // Get project path from store
  const project = useStore((state) => state.project);
  const projectPath = project?.path || '';
  
  // Get location store actions for refreshing
  const { fetchProjectLocations } = useLocationStore();

  const [locations, setLocations] = useState(worldData?.locations || []);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (worldData?.locations) {
      setLocations(worldData.locations);
    }
  }, [worldData?.locations]);

  // Save a single location to the project
  const saveLocation = useCallback(async (location: typeof locations[0]) => {
    if (!projectPath) {
      console.warn('[LocationsStep] No project path available, skipping save');
      return;
    }

    // Extract project ID from path
    const projectId = projectPath?.split(/[/\\]/).pop() || 'unknown';

    try {
      // Create a full Location object from wizard data
      const locationData = createLocationFromWizardData(
        location.id,
        {
          name: location.name,
          type: location.type,
          description: location.description,
          coordinates: location.coordinates,
        },
        { projectId }
      );

      const result = await saveLocationToProject(projectId, location.id, locationData);
      
      if (!result.success) {
        console.error('[LocationsStep] Failed to save location:', result.error);
        setSaveError(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('[LocationsStep] Error saving location:', error);
      setSaveError(error instanceof Error ? error.message : 'Unknown error');
    }
  }, [projectPath]);

  const addLocation = () => {
    const newLocation = {
      id: crypto.randomUUID(),
      name: '',
      type: 'city' as const,
      description: '',
      coordinates: { x: 0, y: 0 },
    };
    setLocations([...locations, newLocation]);
  };

  const updateLocation = async (id: string, field: string, value: any) => {
    const newLocations = locations.map(loc =>
      loc.id === id ? { ...loc, [field]: value } : loc
    );
    setLocations(newLocations);
    updateStep('locations', newLocations);

    // Save the updated location to the project
    const updatedLocation = newLocations.find(loc => loc.id === id);
    if (updatedLocation?.name) {
      await saveLocation(updatedLocation);
    }
  };

  const removeLocation = (id: string) => {
    const newLocations = locations.filter(loc => loc.id !== id);
    setLocations(newLocations);
    updateStep('locations', newLocations);
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      // Save all locations to the project
      if (projectPath && locations.length > 0) {
        const projectId = projectPath.split(/[/\\]/).pop() || 'unknown';
        
        for (const location of locations) {
          if (location.name) {
            const locationData = createLocationFromWizardData(
              location.id,
              {
                name: location.name,
                type: location.type,
                description: location.description,
                coordinates: location.coordinates,
              },
              { projectId }
            );
            await saveLocationToProject(projectId, location.id, locationData);
          }
        }
        
        // Refresh the location store to include newly created locations
        await fetchProjectLocations(projectId);
      }

      if (locations.length > 0) {
        markStepComplete('locations');
      }
    } catch (error) {
      console.error('[LocationsStep] Error saving locations:', error);
      setSaveError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="step-container locations-step">
      <h2>Locations</h2>
      <p>Define key locations in your world.</p>

      {saveError && (
        <div className="error-message mb-4 p-3 bg-red-50 text-red-600 rounded-lg">
          Error saving locations: {saveError}
        </div>
      )}

      <div className="locations-list">
        {locations.map((location) => (
          <div key={location.id} className="location-item">
            <input
              type="text"
              placeholder="Location name"
              value={location.name}
              onChange={(e) => updateLocation(location.id, 'name', e.target.value)}
            />
            <select
              value={location.type}
              onChange={(e) => updateLocation(location.id, 'type', e.target.value)}
              title="Location type"
            >
              <option value="city">City</option>
              <option value="wilderness">Wilderness</option>
              <option value="dungeon">Dungeon</option>
              <option value="other">Other</option>
            </select>
            <textarea
              placeholder="Description"
              value={location.description}
              onChange={(e) => updateLocation(location.id, 'description', e.target.value)}
              rows={2}
            />
            <button onClick={() => removeLocation(location.id)}>Remove</button>
          </div>
        ))}
      </div>

      <button onClick={addLocation} className="btn-secondary">
        Add Location
      </button>

      <button 
        onClick={handleSubmit} 
        className="btn-primary"
        disabled={isSaving}
      >
        {isSaving ? 'Saving...' : 'Save Locations'}
      </button>

      <StepValidator step="locations" />
    </div>
  );
};
