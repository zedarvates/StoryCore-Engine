import React, { useState, useEffect } from 'react';
import { useWorldBuilderSelectors, useWorldBuilderActions } from '../../../../stores/worldBuilderStore';
import { StepValidator } from '../StepValidator';

export const LocationsStep: React.FC = () => {
  const { worldData } = useWorldBuilderSelectors();
  const { updateStep, markStepComplete } = useWorldBuilderActions();

  const [locations, setLocations] = useState(worldData?.locations || []);

  useEffect(() => {
    if (worldData?.locations) {
      setLocations(worldData.locations);
    }
  }, [worldData?.locations]);

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

  const updateLocation = (id: string, field: string, value: any) => {
    const newLocations = locations.map(loc =>
      loc.id === id ? { ...loc, [field]: value } : loc
    );
    setLocations(newLocations);
    updateStep('locations', newLocations);
  };

  const removeLocation = (id: string) => {
    const newLocations = locations.filter(loc => loc.id !== id);
    setLocations(newLocations);
    updateStep('locations', newLocations);
  };

  const handleSubmit = () => {
    if (locations.length > 0) {
      markStepComplete('locations');
    }
  };

  return (
    <div className="step-container locations-step">
      <h2>Locations</h2>
      <p>Define key locations in your world.</p>

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

      <button onClick={handleSubmit} className="btn-primary">
        Save Locations
      </button>

      <StepValidator step="locations" />
    </div>
  );
};