import React from 'react';

interface Location {
  id: string;
  name: string;
  type: string;
  description: string;
  coordinates: { x: number; y: number };
}

interface WorldMap2DProps {
  locations: Location[];
  onElementSelect: (element: any) => void;
}

export const WorldMap2D: React.FC<WorldMap2DProps> = ({ locations, onElementSelect }) => {
  return (
    <div className="world-map-2d">
      <h3>World Map (2D)</h3>
      <div className="map-canvas">
        {locations.length === 0 ? (
          <p>No locations defined yet</p>
        ) : (
          <ul>
            {locations.map((location) => (
              <li
                key={location.id}
                onClick={() => onElementSelect(location)}
                className="map-location"
              >
                <strong>{location.name}</strong> - {location.type}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};